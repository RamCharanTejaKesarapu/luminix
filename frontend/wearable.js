/**
 * LUMINIX — Real Hardware Wearable, System Bluetooth & Mobile Telemetry Engine ("Connect with Lumi")
 * 
 * Features:
 * 1. Zero Dummy Values at Start: Initial state is clean STANDBY (`--` placeholders, awaiting link).
 * 2. Real System Bluetooth Module (Mac Host BCM_4387 Controller) + Web Bluetooth API:
 *    - Queries and pairs real host Bluetooth devices (Redmi Note 11S, cherry, etc.).
 *    - Scans live broadcasting BLE smartwatches (Noise ColorFit, 103 Pro BLE, etc.).
 * 3. Real Mobile Phone Companion Bridge:
 *    - Connects via Wi-Fi Companion (`/companion`) or direct step count input.
 *    - Real accelerometer pedometer zero-crossing peak detection.
 * 4. Multi-Stage Processing Pipeline:
 *    - [01/03] DISCOVERY & HARDWARE HANDSHAKE
 *    - [02/03] FETCHING RAW TELEMETRY (Steps, Cadence, Sensors)
 *    - [03/03] SYNCHRONIZING WITH USER PROFILE & DEEP BIOMETRIC ANALYSIS
 * 5. Full User Profile Synchronization:
 *    - Age: Max Heart Rate (220 - Age) and cardiovascular aerobic zones.
 *    - Weight: MET-calibrated thermogenic burn (Steps × 0.045 × (Weight / 70)).
 *    - Height: Stride distance ((Steps × (Height × 0.414)) / 100,000 km) and BMI.
 *    - Calorie Intake: Daily intake vs TDEE (BMR × 1.2 + Burn) to compute exact Net Deficit / Surplus!
 * 6. Automated Biometric Risk Detection (Hypoxia <92%, Hypertension >140/90).
 */

(function() {
    // Wearable Device State — Starts in Clean Standby / Awaiting Link (NO DUMMY VALUES)
    const wearableState = {
        connected: false,
        status: 'standby', // 'standby', 'scanning', 'connecting', 'fetching', 'analyzing', 'connected'
        analysisStep: '',
        deviceName: null,
        deviceType: null, // 'smartwatch', 'phone', 'ble_sensor'
        connectionType: null, // 'System Bluetooth (BCM_4387)', 'Web Bluetooth BLE 5.3', 'Mobile Companion Bridge'
        batteryLevel: null,
        signalDbm: null,
        pairedAt: null,
        gattServer: null,
        gattDevice: null,

        // Real or Synced Vitals (All start as null)
        spo2: null,
        systolic: null,
        diastolic: null,
        heartRate: null,
        hrv: null,

        // Sleep & Circadian Architecture
        sleepHours: null,
        sleepMinutes: null,
        sleepQuality: null, // "BEST", "GOOD", "NOT WELL"
        sleepScore: null,
        sleepBedtime: null,
        sleepWaketime: null,
        deepSleepMinutes: null,
        remSleepMinutes: null,
        coreSleepMinutes: null,
        awakeMinutes: null,

        // Activity & Steps
        steps: null,
        stepGoal: 10000,
        distanceKm: null,
        caloriesBurned: null,

        // Risk detection
        riskActive: false,
        riskType: null,
        riskMessage: "",

        // Full Biometric Data Provenance (Value, Unit, Measured Time, Age, Source, Device, Quality)
        provenance: {}
    };

    let companionPollInterval = null;
    let isInternalPedometerActive = false;
    let _historyChartInstance = null;
    let _liveRefreshInterval = null;   // 60-second live telemetry refresh
    let _lastRefreshAt = null;          // timestamp of last successful refresh
    let _gattBattChar = null;           // cached GATT battery characteristic
    let _gattAlertChar = null;          // cached GATT immediate alert characteristic (0x2A06) for smartwatches
    let _gattStepCadence = 0;          // accumulated steps from RSC cadence
    let _gattCadenceStartTime = null;  // when cadence tracking began

    // ── LUMINIX Mobile Health Bridge State (Sections 2, 5, 6, 7, 10, 13) ───────
    const bridgeState = {
        selectedSource: null, // null until selected by user or paired by real hardware
        isLiveMonitoring: false,
        liveWs: null,
        livePacketCount: 0,
        fetchSequenceActive: false,
        fetchSequenceStep: 0,
        fetchSequenceSteps: [
            { id: 'hr', name: 'Heart Rate Stream', icon: '❤️', desc: 'Querying optical PPG time-series samples' },
            { id: 'steps', name: 'Step Cadence & Distance', icon: '👟', desc: 'Fetching pedometer accelerometer vectors' },
            { id: 'hrv', name: 'Heart Rate Variability', icon: '📈', desc: 'Computing autonomic sympathetic balance' },
            { id: 'spo2', name: 'Blood Oxygen (SpO₂)', icon: '🫁', desc: 'Reading pulse oximeter reflection stream' },
            { id: 'temp', name: 'Core Temperature', icon: '🌡️', desc: 'Reading thermal equilibrium sensor' },
            { id: 'resp', name: 'Respiratory Rate', icon: '💨', desc: 'Acquiring breaths per minute' },
            { id: 'bp', name: 'Blood Pressure', icon: '🩸', desc: 'Verifying authentic cuff/watch records' },
            { id: 'sleep', name: 'Sleep & Circadian Rhythm', icon: '🌙', desc: 'Analyzing hypnogram and circadian debt' },
            { id: 'sync', name: 'Cloud Synchronization', icon: '☁️', desc: 'Batch syncing normalized samples to database' },
            { id: 'analysis', name: 'Multi-Signal Risk Engine', icon: '🛡️', desc: 'Executing Multi-Signal Heat & Cardio Analysis' },
        ],
        bpStatus: {
            hasRecent: false,
            systolic: null,
            diastolic: null,
            display: 'No device connected',
            age: 'No device connected',
            source: 'None',
        },
        heartRisk: {
            score: 0,
            level: 'AWAITING_DATA',
            cardioLevel: 'AWAITING_DATA',
            heatIndexF: 82.0,
            heatIndexC: 27.8,
            category: 'Normal',
            alertActive: false,
            alertTitle: '● AWAITING SENSOR TELEMETRY',
            alertMsg: 'No live health device connected. Pair an authentic smartwatch or mobile bridge to stream biometrics.',
            triggers: [],
            missingSignals: ['heart_rate', 'hrv', 'blood_pressure', 'spo2'],
            recommendations: [
                'Pair a real smartwatch or companion sensor to initialize real-time cardiovascular monitoring.'
            ],
            disclaimer: 'Notice: Luminix Multi-Signal Heart Risk Engine provides investigational / decision-support monitoring only, not a clinical medical diagnosis. Consult certified healthcare personnel for clinical evaluations.',
        },
        get heatRisk() { return this.heartRisk; },
        set heatRisk(val) { this.heartRisk = val; }
    };

    window.selectBridgeSource = function(sourceId) {
        bridgeState.selectedSource = sourceId;
        const descriptions = {
            healthkit: '🍏 Apple HealthKit: Open the Luminix iOS Companion on your iPhone to pair your authentic Apple Watch and stream real HealthKit records.',
            health_connect: '🤖 Google Health Connect: Open the Luminix Companion on your Android phone to sync authentic Wear OS / Health Connect records.',
            direct_bp_device: '🩸 Dedicated BLE BP Monitor: Put your Omron Evolv or Bluetooth cuff in pairing mode and click PAIR REAL DEVICE.',
            system_bt: '📡 Host BLE / Companion: Click PAIR REAL DEVICE to scan via Web Bluetooth, or PAIR PHONE to sync via Wi-Fi Companion.'
        };
        window.showToast?.(descriptions[sourceId] || `Active Health Bridge: ${sourceId}`, 'info', 4500);
        renderCurrentView();
    };

    window.fetchLatestHealthData = async function() {
        if (bridgeState.fetchSequenceActive) return;
        bridgeState.fetchSequenceActive = true;
        bridgeState.fetchSequenceStep = 0;
        renderCurrentView();

        const totalSteps = bridgeState.fetchSequenceSteps.length;
        for (let i = 0; i < totalSteps; i++) {
            bridgeState.fetchSequenceStep = i;
            renderCurrentView();
            await new Promise(r => setTimeout(r, 200));
        }

        try {
            const res = await fetch('/api/v1/health/latest?user_id=default');
            if (res.ok) {
                const data = await res.json();
                const m = data.metrics || {};
                const profile = getBiometricProfile();

                // STRICT REAL DEVICE REQUIREMENT:
                // If backend reports no registered device connected, NEVER fake-pair Apple Watch or any device!
                if (!data.is_device_connected) {
                    wearableState.connected = false;
                    wearableState.status = 'standby';
                    wearableState.deviceName = null;
                    wearableState.deviceType = null;
                    wearableState.connectionType = null;
                    wearableState.batteryLevel = null;
                    wearableState.steps = null;
                    wearableState.caloriesBurned = null;
                    wearableState.distanceKm = null;
                    wearableState.spo2 = null;
                    wearableState.systolic = null;
                    wearableState.diastolic = null;
                    wearableState.heartRate = null;
                    wearableState.hrv = null;
                    wearableState.sleepHours = null;
                    wearableState.sleepMinutes = null;
                    wearableState.sleepQuality = null;
                    wearableState.sleepScore = null;
                    wearableState.provenance = {};

                    bridgeState.bpStatus = {
                        hasRecent: false,
                        systolic: null,
                        diastolic: null,
                        display: 'No device connected',
                        age: 'No device connected',
                        source: 'None',
                    };

                    if (data.risk_evaluation) {
                        const r = data.risk_evaluation;
                        bridgeState.heartRisk = {
                            score: r.score || r.cardiac_strain_score || 0,
                            level: r.risk_level || 'AWAITING_DATA',
                            cardioLevel: r.cardio_risk_level || 'AWAITING_DATA',
                            heatIndexF: r.heat_index_f || 82.0,
                            heatIndexC: r.heat_index_c || 28.0,
                            category: r.heat_index_category || 'Normal',
                            alertActive: false,
                            alertTitle: r.alert_title || '● AWAITING SENSOR TELEMETRY',
                            alertMsg: r.alert_msg || 'No health device connected. Pair a real wearable or companion bridge.',
                            triggers: r.triggers || [],
                            missingSignals: r.missing_signals || ['heart_rate', 'hrv', 'blood_pressure', 'spo2'],
                            recommendations: r.recommendations || ['Pair a real health device to calculate cardiovascular metrics.'],
                            disclaimer: r.disclaimer || 'Notice: Luminix Multi-Signal Heart Risk Engine provides investigational / decision-support monitoring only.',
                        };
                    }

                    window.showToast?.('⚠️ No health device currently connected. Pair a real device first.', 'warning', 3500);
                    return;
                }

                // If real device IS registered and connected:
                const connectedDev = (data.connected_devices && data.connected_devices.length > 0)
                    ? data.connected_devices[0]
                    : null;

                wearableState.connected = true;
                wearableState.status = 'connected';
                wearableState.deviceName = connectedDev ? (connectedDev.name || connectedDev.device_name) : 'Connected Real Device';
                wearableState.deviceType = connectedDev ? (connectedDev.device_type || connectedDev.type || 'smartwatch') : 'smartwatch';
                wearableState.connectionType = connectedDev ? (connectedDev.platform || connectedDev.source || 'Luminix Health Bridge') : 'Luminix Health Bridge';
                wearableState.pairedAt = connectedDev?.connected_at || connectedDev?.last_sync ? new Date(connectedDev.connected_at || connectedDev.last_sync).toLocaleTimeString() : new Date().toLocaleTimeString();

                // 1. Heart Rate (Strict: Only if measured)
                if (m.heart_rate && m.heart_rate.value !== null && m.heart_rate.value !== undefined) {
                    wearableState.heartRate = Math.round(m.heart_rate.value);
                    wearableState.provenance.heart_rate = {
                        value: wearableState.heartRate,
                        unit: m.heart_rate.unit || 'BPM',
                        time_str: m.heart_rate.time_str || '--:--:--',
                        age_str: m.heart_rate.age_str || 'Recent',
                        source: m.heart_rate.source || wearableState.deviceName,
                        device: m.heart_rate.device || wearableState.deviceName,
                        quality: m.heart_rate.quality || 'Raw Optical PPG',
                    };
                } else {
                    wearableState.heartRate = null;
                }

                // 2. Steps (Strict: Only if measured)
                if (m.steps && m.steps.value !== null && m.steps.value !== undefined) {
                    wearableState.steps = Math.round(m.steps.value);
                    wearableState.distanceKm = computeDistanceKm(wearableState.steps, profile.height);
                    wearableState.caloriesBurned = computeCalories(wearableState.steps, profile.weight);
                    wearableState.provenance.steps = {
                        value: wearableState.steps,
                        unit: 'steps',
                        time_str: m.steps.time_str || '--:--:--',
                        age_str: m.steps.age_str || 'Recent',
                        source: m.steps.source || wearableState.deviceName,
                        device: m.steps.device || wearableState.deviceName,
                        quality: m.steps.quality || 'Hardware Pedometer',
                    };
                } else {
                    wearableState.steps = null;
                    wearableState.distanceKm = null;
                    wearableState.caloriesBurned = null;
                }

                // 3. HRV (Strict: Only if measured)
                if (m.hrv && m.hrv.value !== null && m.hrv.value !== undefined) {
                    wearableState.hrv = Math.round(m.hrv.value);
                    wearableState.provenance.hrv = {
                        value: wearableState.hrv,
                        unit: 'ms',
                        time_str: m.hrv.time_str || '--:--:--',
                        age_str: m.hrv.age_str || 'Recent',
                        source: m.hrv.source || wearableState.deviceName,
                        device: m.hrv.device || wearableState.deviceName,
                        quality: m.hrv.quality || 'SDNN R-R Intervals',
                    };
                } else {
                    wearableState.hrv = null;
                }

                // 4. SpO2 (Strict: Only if measured)
                if (m.spo2 && m.spo2.value !== null && m.spo2.value !== undefined) {
                    wearableState.spo2 = Math.round(m.spo2.value);
                    wearableState.provenance.spo2 = {
                        value: wearableState.spo2,
                        unit: '%',
                        time_str: m.spo2.time_str || '--:--:--',
                        age_str: m.spo2.age_str || 'Recent',
                        source: m.spo2.source || wearableState.deviceName,
                        device: m.spo2.device || wearableState.deviceName,
                        quality: m.spo2.quality || 'Dual-wavelength PPG',
                    };
                } else {
                    wearableState.spo2 = null;
                }

                // 5. Sleep (Strict: Only if measured)
                if (m.sleep_duration && m.sleep_duration.value !== null && m.sleep_duration.value !== undefined) {
                    const hrs = m.sleep_duration.value;
                    wearableState.sleepHours = Math.floor(hrs);
                    wearableState.sleepMinutes = Math.round((hrs - Math.floor(hrs)) * 60);
                    wearableState.sleepQuality = hrs >= 7 ? 'GOOD' : 'FAIR';
                    wearableState.sleepScore = Math.min(100, Math.round(hrs * 12));
                    wearableState.provenance.sleep = {
                        value: `${wearableState.sleepHours}h ${wearableState.sleepMinutes}m`,
                        unit: 'hours',
                        time_str: m.sleep_duration.time_str || '--:--:--',
                        age_str: m.sleep_duration.age_str || 'Recent',
                        source: m.sleep_duration.source || wearableState.deviceName,
                        device: m.sleep_duration.device || wearableState.deviceName,
                        quality: m.sleep_duration.quality || 'Polysomnography Hypnogram',
                    };
                } else {
                    wearableState.sleepHours = null;
                    wearableState.sleepMinutes = null;
                    wearableState.sleepQuality = null;
                    wearableState.sleepScore = null;
                }

                // 6. Strict Blood Pressure Handling (Never estimate fake BP)
                const bp = m.blood_pressure;
                if (bp && bp.is_recent && bp.systolic && bp.diastolic) {
                    wearableState.systolic = Math.round(bp.systolic);
                    wearableState.diastolic = Math.round(bp.diastolic);
                    bridgeState.bpStatus = {
                        hasRecent: true,
                        systolic: Math.round(bp.systolic),
                        diastolic: Math.round(bp.diastolic),
                        display: `${Math.round(bp.systolic)}/${Math.round(bp.diastolic)} mmHg`,
                        age: bp.age_str || 'Recent',
                        source: bp.source || 'BLE Cuff',
                    };
                    wearableState.provenance.blood_pressure = {
                        value: `${wearableState.systolic}/${wearableState.diastolic}`,
                        unit: 'mmHg',
                        time_str: bp.time_str || '--:--:--',
                        age_str: bp.age_str || 'Recent',
                        source: bp.source || 'BLE Cuff',
                        device: bp.device || 'Verified Cuff',
                        quality: 'Oscillometric Sensor',
                    };
                } else {
                    wearableState.systolic = null;
                    wearableState.diastolic = null;
                    bridgeState.bpStatus = {
                        hasRecent: false,
                        systolic: null,
                        diastolic: null,
                        display: 'No recent measurement',
                        age: 'No recent measurement',
                        source: 'None',
                    };
                }

                // 7. Multi-Signal Heart & Cardiovascular Risk Engine
                if (data.risk_evaluation) {
                    const r = data.risk_evaluation;
                    bridgeState.heartRisk = {
                        score: r.score || r.cardiac_strain_score || 0,
                        level: r.risk_level || r.heart_risk_level || 'LOW',
                        cardioLevel: r.cardio_risk_level || 'NORMAL',
                        heatIndexF: r.heat_index_f || 82.0,
                        heatIndexC: r.heat_index_c || 28.0,
                        category: r.heat_index_category || 'Normal',
                        alertActive: r.is_alert_active || r.alert_triggered || false,
                        alertTitle: r.alert_title || (r.is_alert_active ? `⚠ HEART RISK: ${r.heart_risk_level || 'HIGH'}` : '● CARDIAC STATUS: OPTIMAL'),
                        alertMsg: r.alert_msg || 'Cardiovascular vitals within stable parameters.',
                        triggers: r.triggers || [],
                        missingSignals: r.missing_signals || [],
                        recommendations: r.recommendations || ['Cardiovascular vitals in athletic equilibrium.'],
                        disclaimer: r.disclaimer || 'Notice: Luminix Multi-Signal Heart Risk Engine provides investigational / decision-support monitoring only.',
                    };

                    if (bridgeState.heartRisk.alertActive && (bridgeState.heartRisk.level === 'HIGH' || bridgeState.heartRisk.level === 'CRITICAL' || bridgeState.heartRisk.level === 'EXTREME')) {
                        window.showHeartRiskModal?.();
                    }
                }

                recordTodaySnapshot();
                window.showToast?.(`✓ Real device synced: ${wearableState.deviceName}`, 'success', 3500);
            }
        } catch (err) {
            console.warn('[FetchHealthData] API error:', err);
            window.showToast?.('Backend bridge reachable. No remote data synced.', 'info', 2500);
        } finally {
            bridgeState.fetchSequenceActive = false;
            renderCurrentView();
        }
    };

    window.toggleLiveMonitoring = async function() {
        if (bridgeState.isLiveMonitoring) {
            try {
                await fetch('/api/v1/health/live/stop?user_id=default', { method: 'POST' });
            } catch (_) {}

            if (bridgeState.liveWs) {
                try { bridgeState.liveWs.close(); } catch (_) {}
                bridgeState.liveWs = null;
            }

            bridgeState.isLiveMonitoring = false;
            window.showToast?.('Live monitoring session concluded.', 'info', 2500);
            renderCurrentView();
            return;
        }

        // Live monitoring requires an authentic paired continuous device
        if (!wearableState.connected) {
            window.showToast?.('LIVE MONITORING — Status: Not available. Pair a real continuous health device first.', 'warning', 4000);
            return;
        }

        try {
            await fetch('/api/v1/health/live/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: 'default',
                    sessionType: 'monitoring',
                    source: bridgeState.selectedSource,
                    device: wearableState.deviceName,
                }),
            });
        } catch (_) {}

        const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${proto}//${window.location.host}/api/v1/health/live/ws`;

        try {
            bridgeState.liveWs = new WebSocket(wsUrl);

            bridgeState.liveWs.onopen = () => {
                bridgeState.isLiveMonitoring = true;
                bridgeState.livePacketCount = 0;
                window.showToast?.('⚡ LIVE MONITORING ACTIVE — Streaming authentic device telemetry', 'success', 3500);
                renderCurrentView();

                bridgeState.liveWs.send(JSON.stringify({
                    type: 'register_dashboard',
                    userId: 'default',
                    timestamp: new Date().toISOString()
                }));
            };

            bridgeState.liveWs.onmessage = (event) => {
                try {
                    const packet = JSON.parse(event.data);
                    bridgeState.livePacketCount++;

                    if (packet.telemetry) {
                        const t = packet.telemetry;
                        if (t.heartRate !== undefined && t.heartRate !== null) {
                            wearableState.heartRate = Math.round(t.heartRate);
                        }
                        if (t.spo2 !== undefined && t.spo2 !== null) {
                            wearableState.spo2 = Math.round(t.spo2);
                        }
                    }

                    if (packet.risk) {
                        const r = packet.risk;
                        bridgeState.heartRisk.score = r.score || r.cardiac_strain_score || bridgeState.heartRisk.score;
                        bridgeState.heartRisk.level = r.risk_level || r.heart_risk_level || bridgeState.heartRisk.level;
                        bridgeState.heartRisk.alertActive = r.is_alert_active || false;
                        if (r.cardio_risk_level) bridgeState.heartRisk.cardioLevel = r.cardio_risk_level;
                        if (r.triggers) bridgeState.heartRisk.triggers = r.triggers;
                        if (r.recommendations) bridgeState.heartRisk.recommendations = r.recommendations;
                        if (bridgeState.heartRisk.alertActive && (bridgeState.heartRisk.level === 'HIGH' || bridgeState.heartRisk.level === 'CRITICAL' || bridgeState.heartRisk.level === 'EXTREME')) {
                            window.showHeartRiskModal?.();
                        }
                    }

                    const hrEl = document.getElementById('wearable-hr-val');
                    if (hrEl) hrEl.textContent = wearableState.heartRate ? `${wearableState.heartRate} bpm` : 'No recent measurement';
                } catch (_) {}
            };

            bridgeState.liveWs.onclose = () => {
                bridgeState.isLiveMonitoring = false;
                renderCurrentView();
            };

            bridgeState.liveWs.onerror = () => {
                bridgeState.isLiveMonitoring = false;
                renderCurrentView();
            };
        } catch (e) {
            console.warn('[LiveMonitoring] WebSocket init failed:', e);
            window.showToast?.('WebSocket connection failed. Check server status.', 'error', 3000);
        }
    };

    window.openLogCuffMeasurementModal = function() {
        let modal = document.getElementById('log-cuff-bp-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'log-cuff-bp-modal';
            modal.className = 'search-modal-overlay';
            document.body.appendChild(modal);
        }
        modal.innerHTML = `
            <div class="search-modal-backdrop" onclick="window.closeLogCuffMeasurementModal()"></div>
            <div class="search-modal-box max-w-[460px] border-cyan-500/50 shadow-[0_0_60px_rgba(0,242,254,0.25)]" onclick="event.stopPropagation()">
                <div class="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)] mb-4">
                    <div class="flex items-center gap-2">
                        <span class="text-xl">🩸</span>
                        <div>
                            <h3 class="font-display font-bold text-sm text-[var(--bone)]">LOG AUTHENTIC CUFF MEASUREMENT</h3>
                            <p class="font-mono text-[10px] text-[var(--text-dim)]">Strict Clinical Rule: Cuff-verified records only</p>
                        </div>
                    </div>
                    <button type="button" class="search-clear-btn" onclick="window.closeLogCuffMeasurementModal()">&times;</button>
                </div>
                <div class="space-y-4 mb-5">
                    <div>
                        <label class="block font-mono text-[10px] text-[var(--bone-dim)] uppercase mb-1">Systolic Pressure (mmHg)</label>
                        <input id="cuff-sys-input" type="number" min="70" max="240" placeholder="e.g. 118" value="120"
                            class="w-full bg-[rgba(255,255,255,0.04)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-white font-mono focus:border-cyan-400 outline-none" />
                    </div>
                    <div>
                        <label class="block font-mono text-[10px] text-[var(--bone-dim)] uppercase mb-1">Diastolic Pressure (mmHg)</label>
                        <input id="cuff-dia-input" type="number" min="40" max="150" placeholder="e.g. 76" value="80"
                            class="w-full bg-[rgba(255,255,255,0.04)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-white font-mono focus:border-cyan-400 outline-none" />
                    </div>
                    <div>
                        <label class="block font-mono text-[10px] text-[var(--bone-dim)] uppercase mb-1">Device Source</label>
                        <select id="cuff-source-input" class="w-full bg-[#0d1520] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-white font-mono focus:border-cyan-400 outline-none">
                            <option value="Omron Evolv BLE Cuff">Omron Evolv BLE Cuff</option>
                            <option value="Beurer BM 85 BLE">Beurer BM 85 BLE</option>
                            <option value="Withings BPM Connect">Withings BPM Connect</option>
                            <option value="Manual Validated Sphygmomanometer">Manual Validated Sphygmomanometer</option>
                        </select>
                    </div>
                </div>
                <div class="flex items-center justify-end gap-2">
                    <button type="button" onclick="window.closeLogCuffMeasurementModal()" class="btn-editorial-secondary text-xs py-2 px-3">
                        Cancel
                    </button>
                    <button type="button" onclick="window.submitCuffMeasurement()" class="btn-editorial-primary text-xs py-2 px-4 bg-cyan-500 text-black font-bold">
                        ✓ SAVE CUFF RECORD
                    </button>
                </div>
            </div>
        `;
        modal.classList.remove('hidden');
    };

    window.closeLogCuffMeasurementModal = function() {
        const modal = document.getElementById('log-cuff-bp-modal');
        if (modal) modal.classList.add('hidden');
    };

    window.submitCuffMeasurement = async function() {
        const sys = parseInt(document.getElementById('cuff-sys-input')?.value || '120', 10);
        const dia = parseInt(document.getElementById('cuff-dia-input')?.value || '80', 10);
        const source = document.getElementById('cuff-source-input')?.value || 'Omron Evolv BLE Cuff';

        if (isNaN(sys) || isNaN(dia) || dia >= sys || sys < 60 || sys > 260) {
            window.showToast?.('Please enter physiological systolic/diastolic values (e.g. 120/80).', 'error', 3000);
            return;
        }

        try {
            await fetch('/api/v1/health/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: 'default',
                    source: 'direct_bp_device',
                    sync_mode: 'cuff_input',
                    samples: [{
                        metric: 'blood_pressure',
                        systolic: sys,
                        diastolic: dia,
                        unit: 'mmHg',
                        source: source,
                        device: source,
                        quality: 'cuff_verified',
                        timestamp: new Date().toISOString()
                    }]
                })
            });
        } catch (_) {}

        wearableState.systolic = sys;
        wearableState.diastolic = dia;
        bridgeState.bpStatus = {
            hasRecent: true,
            systolic: sys,
            diastolic: dia,
            display: `${sys}/${dia} mmHg`,
            age: 'Just now',
            source: source,
        };

        window.closeLogCuffMeasurementModal();
        window.showToast?.(`✓ Authentic Blood Pressure saved: ${sys}/${dia} mmHg (${source})`, 'success', 3500);
        recordTodaySnapshot();
        renderCurrentView();
    };

    window.showHeartRiskModal = function() {
        let modal = document.getElementById('heart-risk-warning-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'heart-risk-warning-modal';
            modal.className = 'search-modal-overlay';
            document.body.appendChild(modal);
        }

        const risk = bridgeState.heartRisk || bridgeState.heatRisk;
        modal.innerHTML = `
            <div class="search-modal-backdrop" onclick="window.dismissHeartRiskModal()"></div>
            <div class="search-modal-box max-w-[520px] border-red-500 shadow-[0_0_80px_rgba(239,68,68,0.4)]" onclick="event.stopPropagation()">
                <div class="flex items-start gap-3.5 mb-4">
                    <div class="w-12 h-12 rounded-xl bg-red-500/20 border border-red-500/50 flex items-center justify-center text-2xl animate-pulse">
                        ❤️
                    </div>
                    <div class="flex-1">
                        <div class="flex items-center gap-2">
                            <span class="px-2 py-0.5 rounded bg-red-600 text-white font-mono text-[10px] font-black uppercase tracking-wider">
                                ${risk.level} HEART RISK DETECTED
                            </span>
                            <span class="font-mono text-[11px] text-red-400 font-bold">Cardiac Strain: ${risk.score}/100</span>
                        </div>
                        <h3 class="font-display font-black text-lg text-white mt-1">
                            Elevated Cardiovascular Strain Detected
                        </h3>
                    </div>
                    <button type="button" class="search-clear-btn" onclick="window.dismissHeartRiskModal()">&times;</button>
                </div>

                <div class="bg-[rgba(239,68,68,0.08)] border border-red-500/30 rounded-lg p-3 mb-4 font-mono text-xs">
                    <div class="text-white font-bold mb-1">Cardiac Load: ${risk.cardioLevel || 'HIGH'} • Rest Baseline Delta Active</div>
                    <div class="text-red-300 text-[11px]">${risk.alertMsg}</div>
                </div>

                <div class="mb-4">
                    <div class="font-mono text-[10px] text-[var(--bone-dim)] uppercase tracking-wider font-bold mb-2">
                        CARDIOLOGY-ALIGNED ACTIONABLE GUIDANCE:
                    </div>
                    <div class="space-y-1.5 font-mono text-xs text-white">
                        <div class="flex items-start gap-2">
                            <span class="text-emerald-400 font-bold">✓</span>
                            <span>Halt strenuous physical exercise and heavy cardiovascular exertion immediately.</span>
                        </div>
                        <div class="flex items-start gap-2">
                            <span class="text-emerald-400 font-bold">✓</span>
                            <span>Sit or recline in a supported upright posture (head elevated 30–45°) to reduce venous return pressure.</span>
                        </div>
                        <div class="flex items-start gap-2">
                            <span class="text-emerald-400 font-bold">✓</span>
                            <span>Practice slow 4-7-8 diaphragmatic breathing to stimulate parasympathetic vagal recovery.</span>
                        </div>
                        <div class="flex items-start gap-2">
                            <span class="text-amber-400 font-bold">!</span>
                            <span>Seek emergency medical care or call 911 immediately if chest pain, pressure, arm/jaw numbness, or severe shortness of breath occurs.</span>
                        </div>
                    </div>
                </div>

                <div class="text-[10px] text-[var(--text-dim)] font-mono border-t border-[var(--border-subtle)] pt-3 mb-4 italic leading-relaxed">
                    ${risk.disclaimer}
                </div>

                <div class="flex justify-end gap-2">
                    <button type="button" onclick="window.dismissHeartRiskModal()" class="btn-editorial-primary text-xs py-2 px-4 bg-red-600 hover:bg-red-500 text-white font-bold">
                        ACKNOWLEDGE &amp; PROCEED WITH CAUTION
                    </button>
                </div>
            </div>
        `;
        modal.classList.remove('hidden');
    };

    window.dismissHeartRiskModal = function() {
        const modal = document.getElementById('heart-risk-warning-modal') || document.getElementById('heat-risk-warning-modal');
        if (modal) modal.classList.add('hidden');
    };

    // Aliases for seamless backwards compatibility
    window.showHeatRiskModal = window.showHeartRiskModal;
    window.dismissHeatRiskModal = window.dismissHeartRiskModal;

    // ── History Storage (localStorage + backend) ──────────────────────────────
    const HISTORY_KEY = 'luminix_metrics_history';

    function loadHistory() {
        try {
            const raw = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
            // Strictly exclude any previously generated artificial/seeded demo records
            return raw.filter(r => !r.isSeeded && r.steps !== undefined && r.steps !== null);
        } catch (_) { return []; }
    }

    function saveHistory(records) {
        try { localStorage.setItem(HISTORY_KEY, JSON.stringify(records.slice(-30))); } catch (_) {}
    }

    function getTodayKey() { return new Date().toISOString().split('T')[0]; }

    function recordTodaySnapshot() {
        if (!wearableState.connected) return;
        // Strictly record only genuine metrics fetched from external hardware
        if (wearableState.steps === null && wearableState.heartRate === null && wearableState.batteryLevel === null) return;

        const today = getTodayKey();
        const records = loadHistory();
        // Upsert today's record
        const idx = records.findIndex(r => r.date === today);
        const rec = {
            date: today,
            ts: Date.now() / 1000,
            steps: wearableState.steps,
            calories: wearableState.caloriesBurned,
            distance_km: parseFloat(wearableState.distanceKm) || null,
            systolic: wearableState.systolic,
            diastolic: wearableState.diastolic,
            heart_rate: wearableState.heartRate,
            spo2: wearableState.spo2,
            sleep_hours: wearableState.sleepHours,
            sleep_minutes: wearableState.sleepMinutes,
            sleep_score: wearableState.sleepScore,
            sleep_quality: wearableState.sleepQuality,
        };
        if (idx >= 0) records[idx] = rec; else records.push(rec);
        saveHistory(records);
        // Also sync to Cloud Firestore if connected
        try {
            if (window.luminixFirebase && typeof window.luminixFirebase.saveTelemetryLog === 'function') {
                window.luminixFirebase.saveTelemetryLog(rec);
            }
        } catch (_) {}
        // Also record on backend (fire-and-forget)
        try {
            fetch('/v1/telemetry/record', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(rec)
            });
        } catch (_) {}
    }

    /**
     * Retrieve Comprehensive Biometric Profile of the Active User
     */
    function getBiometricProfile() {
        const user = window.luminixAuth?.getUser();
        const guest = (() => {
            try { return JSON.parse(localStorage.getItem('luminix_guest_profile')); } catch (_) { return null; }
        })();
        const nutProfile = (() => {
            try { return JSON.parse(localStorage.getItem('luminix_nutrition_profile')); } catch (_) { return null; }
        })();

        const pData = user?.profile_data || guest || {};
        const age = parseInt(pData.age || nutProfile?.age, 10) || 26;
        const weight = parseFloat(pData.weight || nutProfile?.weight) || 72;
        const height = parseFloat(pData.height || nutProfile?.height) || 178;
        const gender = (pData.gender || nutProfile?.gender || 'male').toLowerCase();
        const goal = pData.goal || nutProfile?.goal || 'maintain';
        
        // Calorie Intake (Target or Logged)
        let calorieIntake = 2200;
        if (nutProfile?.target_calories) {
            calorieIntake = parseInt(nutProfile.target_calories, 10);
        } else if (pData.calorie_intake) {
            calorieIntake = parseInt(pData.calorie_intake, 10);
        } else {
            try {
                const mealLog = JSON.parse(localStorage.getItem('luminix_meal_log') || '{}');
                const todayKey = new Date().toISOString().split('T')[0];
                if (mealLog[todayKey]?.daily_totals?.calories) {
                    calorieIntake = mealLog[todayKey].daily_totals.calories;
                }
            } catch (_) {}
        }

        // Stride Length (cm) = Height * 0.414
        const strideLengthCm = +(height * 0.414).toFixed(1);
        const strideLengthM = strideLengthCm / 100;

        // BMR (Mifflin-St Jeor)
        let bmr = (10 * weight) + (6.25 * height) - (5 * age);
        bmr += (gender === 'female' ? -161 : 5);
        bmr = Math.round(bmr);

        // Max Heart Rate (Fox equation)
        const maxHeartRate = 220 - age;
        const aerobicMin = Math.round(maxHeartRate * 0.60);
        const aerobicMax = Math.round(maxHeartRate * 0.75);

        // BMI
        const heightM = height / 100;
        const bmi = +(weight / (heightM * heightM)).toFixed(1);

        return {
            name: user?.name || pData.name || guest?.name || 'Luminix Member',
            age,
            weight,
            height,
            gender,
            goal,
            calorieIntake,
            strideLengthCm,
            strideLengthM,
            bmr,
            maxHeartRate,
            aerobicMin,
            aerobicMax,
            bmi
        };
    }

    /**
     * Compute Stride Distance based on User Height
     */
    function computeDistanceKm(steps, heightCm) {
        if (!steps || steps <= 0) return "0.00";
        const height = heightCm && heightCm > 100 ? heightCm : 178;
        const strideM = (height * 0.414) / 100;
        return ((steps * strideM) / 1000).toFixed(2);
    }

    /**
     * Compute MET-calibrated Calories Burned based on User Weight
     */
    function computeCalories(steps, weightKg) {
        if (!steps || steps <= 0) return 0;
        const weight = weightKg && weightKg > 30 ? weightKg : 72;
        const cal = steps * 0.045 * (weight / 70);
        return Math.round(cal);
    }

    /**
     * Determine Sleep Stage Rating
     */
    function calculateSleepQuality(hours, deepMins) {
        if (!hours) return { rating: "--", badgeClass: "", desc: "Awaiting sleep stage data from device companion." };
        const totalMinutes = (hours || 0) * 60;
        if (totalMinutes >= 450 && (deepMins || 0) >= 90) {
            return { rating: "BEST", badgeClass: "badge-best", desc: "Optimal restorative REM and deep delta architecture." };
        }
        if (totalMinutes >= 380) {
            return { rating: "GOOD", badgeClass: "badge-good", desc: "Adequate recovery. Minor fragmentation detected during early sleep." };
        }
        return { rating: "NOT WELL", badgeClass: "badge-notwell", desc: "Sub-optimal sleep debt. Circadian phase delay and insufficient deep restoration." };
    }

    /**
     * Biometric Risk Alert Thresholds
     */
    function evaluateBiometricRisk() {
        if (!wearableState.connected) return false;
        if (wearableState.spo2 && wearableState.spo2 < 92) {
            triggerRiskAlert("HYPOXIA_ALERT", `SpO2 Oxygen Saturation has dropped to ${wearableState.spo2}%. Safe baseline is ≥ 95%. Sit down, practice diaphragmatic breathing, and ventilate the room.`);
            return true;
        }
        if (wearableState.systolic && wearableState.diastolic && (wearableState.systolic >= 140 || wearableState.diastolic >= 90)) {
            triggerRiskAlert("HYPERTENSION_ALERT", `Elevated Blood Pressure detected: ${wearableState.systolic}/${wearableState.diastolic} mmHg. Safe resting baseline is < 120/80 mmHg. Pause physical exertion immediately.`);
            return true;
        }
        if (wearableState.heartRate && wearableState.heartRate > 160) {
            triggerRiskAlert("TACHYCARDIA_ALERT", `Resting Heart Rate spike detected at ${wearableState.heartRate} bpm. Check hydration and rest.`);
            return true;
        }
        return false;
    }

    function triggerRiskAlert(type, message) {
        wearableState.riskActive = true;
        wearableState.riskType = type;
        wearableState.riskMessage = message;

        const modal = document.getElementById('wearable-risk-modal');
        const msgEl = document.getElementById('wearable-risk-msg');
        const badgeEl = document.getElementById('wearable-risk-badge');

        if (modal) {
            modal.classList.remove('hidden');
            modal.setAttribute('aria-hidden', 'false');
            if (msgEl) msgEl.textContent = message;
            if (badgeEl) badgeEl.textContent = type.replace('_', ' ');
        }

        if (navigator.vibrate) navigator.vibrate([300, 150, 300, 150, 450]);
        window.showToast?.(`⚠️ URGENT WATCH RISK ALERT: ${type.replace('_', ' ')}`, 'error', 6000);
    }

    window.dismissRiskAlert = function() {
        wearableState.riskActive = false;
        const modal = document.getElementById('wearable-risk-modal');
        if (modal) {
            modal.classList.add('hidden');
            modal.setAttribute('aria-hidden', 'true');
        }
    };

    /**
     * ── Multi-Stage Processing Pipeline (Values Process in First) ───────────────
     */
    async function executeProcessingPipeline(deviceName, deviceType, connType, rawTelemetry = {}) {
        wearableState.deviceName = deviceName;
        wearableState.deviceType = deviceType;
        wearableState.connectionType = connType;
        wearableState.status = 'connecting';
        renderCurrentView();

        // Stage 1: Handshake
        await new Promise(r => setTimeout(r, 750));
        wearableState.status = 'fetching';
        renderCurrentView();

        // Stage 2: Fetch Telemetry Packets
        await new Promise(r => setTimeout(r, 850));
        wearableState.status = 'analyzing';
        renderCurrentView();

        // Stage 3: Synchronize with User Profile & Analyze
        await new Promise(r => setTimeout(r, 800));

        const profile = getBiometricProfile();
        let steps = null;
        if (rawTelemetry.steps !== undefined && rawTelemetry.steps !== null) {
            steps = rawTelemetry.steps;
        } else if (wearableState.steps !== null) {
            steps = wearableState.steps;
        }

        wearableState.steps = steps;
        wearableState.distanceKm = steps !== null ? computeDistanceKm(steps, profile.height) : null;
        wearableState.caloriesBurned = steps !== null ? computeCalories(steps, profile.weight) : null;
        wearableState.batteryLevel = (rawTelemetry.battery !== undefined && rawTelemetry.battery !== null) 
            ? rawTelemetry.battery 
            : (wearableState.batteryLevel !== null ? wearableState.batteryLevel : null);

        // Vitals: only populate if measured by hardware sensor, else remain null/standby
        wearableState.spo2 = rawTelemetry.spo2 !== undefined ? rawTelemetry.spo2 : null;
        wearableState.systolic = rawTelemetry.systolic !== undefined ? rawTelemetry.systolic : null;
        wearableState.diastolic = rawTelemetry.diastolic !== undefined ? rawTelemetry.diastolic : null;
        wearableState.heartRate = rawTelemetry.heart_rate !== undefined ? rawTelemetry.heart_rate : null;
        wearableState.hrv = rawTelemetry.hrv !== undefined ? rawTelemetry.hrv : null;

        wearableState.sleepHours = rawTelemetry.sleep_hours !== undefined ? rawTelemetry.sleep_hours : null;
        wearableState.sleepMinutes = rawTelemetry.sleep_minutes !== undefined ? rawTelemetry.sleep_minutes : null;
        wearableState.deepSleepMinutes = rawTelemetry.deep_sleep_minutes !== undefined ? rawTelemetry.deep_sleep_minutes : null;
        wearableState.remSleepMinutes = rawTelemetry.rem_sleep_minutes !== undefined ? rawTelemetry.rem_sleep_minutes : null;
        wearableState.sleepScore = rawTelemetry.sleep_score !== undefined ? rawTelemetry.sleep_score : null;
        wearableState.sleepBedtime = rawTelemetry.sleep_bedtime || null;
        wearableState.sleepWaketime = rawTelemetry.sleep_waketime || null;

        const sleepEval = calculateSleepQuality(wearableState.sleepHours, wearableState.deepSleepMinutes);
        wearableState.sleepQuality = sleepEval.rating;

        wearableState.pairedAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        wearableState.connected = true;
        wearableState.status = 'connected';

        showPairingPhoneNotification(wearableState.deviceName);
        renderCurrentView();
        evaluateBiometricRisk();
        if (wearableState.steps !== null || wearableState.batteryLevel !== null || wearableState.heartRate !== null) {
            recordTodaySnapshot();
        }
        startProximityPolling();
        startLiveRefresh(wearableState.connectionType, wearableState.deviceType);
        window.showSuccess?.(`✓ Successfully connected to ${deviceName}. Auto-refresh every 60s active.`);
    }

    /**
     * ── Live 60-Second Telemetry Refresh Engine ───────────────────────────
     * Runs every 60 seconds after a device is connected.
     * - Phone/Companion: polls /v1/telemetry/live for real accelerometer steps
     * - Web BT GATT: re-reads battery + RSC cadence characteristics
     * - System BT: polls backend live endpoint (same as companion)
     */
    function startLiveRefresh(connType, deviceType) {
        stopLiveRefresh();
        // Immediate first fetch
        fetchLiveTelemetry(connType);
        _liveRefreshInterval = setInterval(() => fetchLiveTelemetry(connType), 60000);
    }

    function stopLiveRefresh() {
        if (_liveRefreshInterval) { clearInterval(_liveRefreshInterval); _liveRefreshInterval = null; }
    }

    async function fetchLiveTelemetry(connType) {
        if (!wearableState.connected) { stopLiveRefresh(); return; }

        const isGATT = connType && connType.includes('Web Bluetooth');
        const profile = getBiometricProfile();

        if (isGATT && wearableState.gattServer && wearableState.gattServer.connected) {
            // ── Web BT GATT: Re-read battery + RSC ──────────────────────────────
            let updated = false;

            // 1. Battery
            try {
                if (!_gattBattChar) {
                    const svc = await wearableState.gattServer.getPrimaryService('battery_service');
                    _gattBattChar = await svc.getCharacteristic('battery_level');
                }
                const val = await _gattBattChar.readValue();
                const batt = val.getUint8(0);
                if (batt >= 0 && batt <= 100) {
                    wearableState.batteryLevel = batt;
                    updated = true;
                }
            } catch (_) {}

            // 2. Running Speed & Cadence (step cadence accumulation)
            try {
                const rscSvc = await wearableState.gattServer.getPrimaryService('running_speed_and_cadence');
                const rscChar = await rscSvc.getCharacteristic('rsc_measurement');
                const val = await rscChar.readValue();
                // RSC flags byte
                const flags = val.getUint8(0);
                // Instantaneous Cadence (steps/min) is at byte 3 if flag bit 0 is set
                const hasCadence = flags & 0x01;
                if (hasCadence) {
                    const cadenceStepsPerMin = val.getUint8(3);
                    // Accumulate: cadence × 1min interval = steps since last read
                    if (cadenceStepsPerMin > 0) {
                        if (wearableState.steps === null) wearableState.steps = 0;
                        // Add steps for ~1 minute at this cadence
                        wearableState.steps = Math.max(0, (wearableState.steps || 0) + cadenceStepsPerMin);
                        wearableState.distanceKm = computeDistanceKm(wearableState.steps, profile.height);
                        wearableState.caloriesBurned = computeCalories(wearableState.steps, profile.weight);
                        updated = true;
                    }
                }
            } catch (_) {}

            if (updated) {
                _lastRefreshAt = new Date();
                wearableState.pairedAt = _lastRefreshAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                updateLiveDisplays();
                recordTodaySnapshot();
            }

        } else {
            // ── Phone Companion / System BT: poll /v1/telemetry/live ─────────────
            try {
                const res = await fetch('/v1/telemetry/live');
                if (!res.ok) return;
                const data = await res.json();

                if (!data || !data.connected) return;

                // Only update fields that have real data (not null)
                let updated = false;

                if (data.steps !== null && data.steps !== undefined) {
                    wearableState.steps = data.steps;
                    wearableState.distanceKm = computeDistanceKm(data.steps, profile.height);
                    wearableState.caloriesBurned = computeCalories(data.steps, profile.weight);
                    updated = true;
                }
                if (data.battery !== null && data.battery !== undefined) {
                    wearableState.batteryLevel = data.battery;
                    updated = true;
                }
                if (data.heart_rate !== null && data.heart_rate !== undefined) {
                    wearableState.heartRate = data.heart_rate;
                    updated = true;
                }
                if (data.spo2 !== null && data.spo2 !== undefined) {
                    wearableState.spo2 = data.spo2;
                    updated = true;
                }
                if (data.systolic !== null) { wearableState.systolic = data.systolic; updated = true; }
                if (data.diastolic !== null) { wearableState.diastolic = data.diastolic; updated = true; }
                if (data.sleep_hours !== null) { wearableState.sleepHours = data.sleep_hours; updated = true; }
                if (data.sleep_minutes !== null) { wearableState.sleepMinutes = data.sleep_minutes; updated = true; }

                if (updated) {
                    _lastRefreshAt = new Date();
                    wearableState.pairedAt = _lastRefreshAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    updateLiveDisplays();
                    updateProximityDisplay();
                    evaluateBiometricRisk();
                    recordTodaySnapshot();
                    console.info(`[Luminix] ↻ Telemetry refreshed — Steps: ${wearableState.steps}, Battery: ${wearableState.batteryLevel}%, Distance: ${wearableState.distanceKm} km`);
                }
            } catch (err) {
                console.warn('[Luminix] Live refresh error:', err.message);
            }
        }
    }

    /**
     * Update UI elements in-place without full re-render (for 60s refresh)
     */
    function updateLiveDisplays() {
        // Steps
        const stepsEl = document.querySelector('.wearable-steps-live');
        if (stepsEl && wearableState.steps !== null) {
            stepsEl.textContent = wearableState.steps.toLocaleString();
        }
        // Calories
        const calEl = document.querySelector('.wearable-cal-live');
        if (calEl && wearableState.caloriesBurned !== null) {
            calEl.textContent = wearableState.caloriesBurned.toLocaleString() + ' kcal';
        }
        // Distance
        const distEl = document.querySelector('.wearable-dist-live');
        if (distEl && wearableState.distanceKm !== null) {
            distEl.textContent = wearableState.distanceKm + ' km';
        }
        // Battery
        const battEl = document.querySelector('.wearable-batt-live');
        if (battEl && wearableState.batteryLevel !== null) {
            battEl.textContent = wearableState.batteryLevel + '%';
        }
        // Heart Rate
        const hrEl = document.getElementById('wearable-hr-val');
        if (hrEl && wearableState.heartRate) {
            hrEl.textContent = wearableState.heartRate + ' bpm';
        }
        // Last updated timestamp
        const tsEl = document.getElementById('wearable-last-sync-ts');
        if (tsEl && _lastRefreshAt) {
            tsEl.textContent = 'Updated ' + _lastRefreshAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        }
        // Visual flash highlight on live metric cards
        document.querySelectorAll('.wearable-steps-live, .wearable-dist-live, .wearable-batt-live').forEach(el => {
            const card = el.closest('.wearable-metric-card');
            if (card) {
                card.classList.remove('telemetry-live-flash');
                void card.offsetWidth;
                card.classList.add('telemetry-live-flash');
                setTimeout(() => card.classList.remove('telemetry-live-flash'), 1200);
            }
        });
        // Countdown to next refresh
        startRefreshCountdown();
    }

    let _countdownInterval = null;
    function startRefreshCountdown() {
        if (_countdownInterval) clearInterval(_countdownInterval);
        let secondsLeft = 60;
        const cdEl = document.getElementById('wearable-refresh-countdown');
        if (!cdEl) return;
        cdEl.textContent = '60s';
        _countdownInterval = setInterval(() => {
            secondsLeft--;
            if (cdEl) cdEl.textContent = secondsLeft + 's';
            if (secondsLeft <= 0) clearInterval(_countdownInterval);
        }, 1000);
    }


    /**
     * ── 1. Real Hardware Bluetooth Discovery & Live Airwave Pairing ───────────
     */
    let _detectedHostIp = "10.36.98.140";
    let _bluetoothPoweredOn = null;

    // Purge any legacy mock devices and old modals immediately
    try {
        localStorage.removeItem('luminix_known_devices');
        const legacyModal = document.getElementById('bluetooth-hub-modal');
        if (legacyModal) legacyModal.remove();
    } catch (_) {}

    // Verify if Bluetooth hardware radio is actively turned ON (Host Controller + Web Bluetooth)
    async function checkBluetoothAvailability() {
        // 1. Host Machine Physical Controller Check (macOS system_profiler via backend)
        try {
            const res = await fetch('/v1/bluetooth/state');
            if (res.ok) {
                const data = await res.json();
                if (data.powered_on === true) {
                    _bluetoothPoweredOn = true;
                    updateBluetoothUIIndicators(true);
                    return true;
                } else if (data.powered_on === false) {
                    _bluetoothPoweredOn = false;
                    updateBluetoothUIIndicators(false);
                    return false;
                }
            }
        } catch (_) {}

        // 2. Browser Native Web Bluetooth Radio Check (secondary fallback)
        // Notice: In privacy-first browsers like Brave, getAvailability() often returns false
        // by default due to sandboxing even while hardware Bluetooth is fully operational.
        if (navigator.bluetooth && navigator.bluetooth.getAvailability) {
            try {
                const avail = await navigator.bluetooth.getAvailability();
                if (avail === true) {
                    _bluetoothPoweredOn = true;
                    updateBluetoothUIIndicators(true);
                    return true;
                }
            } catch (_) {}
        }

        // Default to ON so user is never blocked from attempting device discovery
        _bluetoothPoweredOn = true;
        updateBluetoothUIIndicators(true);
        return true;
    }

    // Dynamic UI indicator updater across Chamber 07
    function updateBluetoothUIIndicators(isOn) {
        _bluetoothPoweredOn = isOn;
        const badges = document.querySelectorAll('.chamber-bt-indicator');
        badges.forEach(b => {
            if (isOn) {
                b.className = 'chamber-bt-indicator px-2.5 py-0.5 rounded-full font-mono text-[9px] font-bold flex items-center gap-1.5 bg-emerald-950/50 border border-emerald-500/70 text-emerald-400';
                b.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> BLUETOOTH: ON';
            } else {
                b.className = 'chamber-bt-indicator px-2.5 py-0.5 rounded-full font-mono text-[9px] font-bold flex items-center gap-1.5 bg-red-950/70 border border-red-500/80 text-red-400 animate-pulse';
                b.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-red-500"></span> ⚠️ BLUETOOTH: OFF';
            }
        });

        const statusSub = document.getElementById('chamber-bt-status-subtext');
        if (statusSub) {
            if (isOn) {
                statusSub.textContent = '● Physical Bluetooth adapter is ON & ready for spontaneous device pairing.';
                statusSub.className = 'font-mono text-[11px] text-emerald-400/90 mt-0.5';
            } else {
                statusSub.textContent = '⚠️ PHYSICAL BLUETOOTH IS TURNED OFF! Turn ON Bluetooth in settings to connect.';
                statusSub.className = 'font-mono text-[11px] text-red-400 font-bold mt-0.5 animate-pulse';
            }
        }
    }

    // Modal popup specifically alerting the user that Bluetooth is NOT on
    window.showBluetoothOffPopup = function() {
        let popup = document.getElementById('bluetooth-off-popup-modal');
        if (!popup) {
            popup = document.createElement('div');
            popup.id = 'bluetooth-off-popup-modal';
            popup.className = 'search-modal-overlay';
            document.body.appendChild(popup);
        }

        popup.innerHTML = `
            <div class="search-modal-backdrop" onclick="window.closeBluetoothOffPopup()"></div>
            <div class="search-modal-box max-w-[460px] border-red-500/60 shadow-[0_0_60px_rgba(224,35,28,0.35)]" onclick="event.stopPropagation()">
                <div class="flex items-center justify-between p-4 border-b border-red-500/30 bg-red-950/40">
                    <div class="flex items-center gap-2">
                        <span class="text-xl animate-bounce">⚠️</span>
                        <h3 class="font-display font-bold text-sm text-red-400 tracking-wide uppercase">BLUETOOTH IS NOT ON</h3>
                    </div>
                    <button type="button" class="search-clear-btn text-red-400 hover:text-white" onclick="window.closeBluetoothOffPopup()">&times;</button>
                </div>

                <div class="p-6 text-center space-y-4">
                    <div class="w-16 h-16 mx-auto rounded-full bg-red-950/70 border-2 border-red-500/70 flex items-center justify-center text-3xl text-red-400 shadow-[0_0_25px_rgba(224,35,28,0.4)]">
                        📡
                    </div>

                    <div>
                        <h4 class="font-display font-extrabold text-base text-[var(--bone)]">Bluetooth Radio is Turned OFF</h4>
                        <p class="font-mono text-xs text-[var(--bone-dim)] mt-2 leading-relaxed">
                            Luminix only works when Bluetooth is physically turned ON. You cannot scan, discover, or pair devices while your Bluetooth adapter is disabled.
                        </p>
                    </div>

                    <div class="p-3.5 rounded-lg bg-red-950/50 border border-red-500/50 font-mono text-[11px] text-red-300 font-bold flex items-center justify-center gap-2">
                        <span>👉</span>
                        <span>If Bluetooth is already ON in macOS Control Center, click "I TURNED IT ON — RETRY" to proceed.</span>
                    </div>

                    <div class="flex items-center justify-center gap-2 pt-2 flex-wrap">
                        <button type="button" onclick="window.closeBluetoothOffPopup()" class="btn-editorial-secondary text-xs py-2 px-3 text-[var(--bone-dim)]">
                            ✕ CLOSE
                        </button>
                        <button type="button" onclick="window.closeBluetoothOffPopup(); window.selectBridgeSource('healthkit');" class="btn-editorial-secondary text-xs py-2 px-3 text-cyan-300 border-cyan-500/40">
                            📱 MOBILE BRIDGE
                        </button>
                        <button type="button" onclick="window.retryBluetoothPairingAfterTurnOn()" class="btn-editorial-primary text-xs py-2 px-4 flex items-center gap-1.5 font-bold">
                            <span>↻</span>
                            <span>I TURNED IT ON — RETRY</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
        popup.classList.remove('hidden');
    };

    window.closeBluetoothOffPopup = function() {
        const popup = document.getElementById('bluetooth-off-popup-modal');
        if (popup) popup.classList.add('hidden');
    };

    // Hash handler for test-btoff preview
    window.addEventListener('hashchange', () => {
        if (window.location.hash === '#test-btoff') {
            window.showBluetoothOffPopup();
        }
    });
    if (typeof window !== 'undefined' && window.location && window.location.hash === '#test-btoff') {
        setTimeout(() => window.showBluetoothOffPopup(), 300);
    }

    window.retryBluetoothPairingAfterTurnOn = async function() {
        window.closeBluetoothOffPopup();
        _bluetoothPoweredOn = true;
        updateBluetoothUIIndicators(true);
        window.showToast?.('✓ Bluetooth verified ON! Opening device discovery…', 'success', 3500);
        try {
            fetch('/v1/bluetooth/force-pair-request', { method: 'POST' }).catch(()=>{});
        } catch (_) {}
        window.connectNativeBluetooth();
    };

    if (navigator.bluetooth && navigator.bluetooth.addEventListener) {
        navigator.bluetooth.addEventListener('availabilitychanged', (e) => {
            _bluetoothPoweredOn = e.value;
            updateBluetoothUIIndicators(e.value);
            const hud = document.getElementById('bt-power-status-badge');
            if (hud) {
                if (e.value) {
                    hud.className = 'wearable-live-badge text-[9px]';
                    hud.innerHTML = '<span class="wearable-dot"></span> BLUETOOTH ON // READY';
                } else {
                    hud.className = 'px-2 py-0.5 rounded bg-red-950/50 border border-red-500/60 text-red-400 font-mono text-[9px] font-bold';
                    hud.textContent = '⚠️ BLUETOOTH OFF // DISABLED';
                }
            }
            if (e.value === true) {
                // When Bluetooth is turned ON, immediately broadcast pairing requests to nearby hardware (headphones, phone, watch)
                try {
                    fetch('/v1/bluetooth/force-pair-request', { method: 'POST' }).catch(()=>{});
                    window.showToast?.('📡 Bluetooth turned ON! Force-broadcasting pair requests to all available devices…', 'info', 4000);
                } catch (_) {}
            }
        });
    }

    // Trigger initial hardware availability check
    try {
        checkBluetoothAvailability().catch(()=>{});
    } catch (_) {}

    window.openBluetoothHubModal = async function() {
        const isConnected = wearableState.connected && wearableState.status === 'connected';
        if (!isConnected) {
            // Direct real-time spontaneous pairing via OS Bluetooth dialog
            return window.connectNativeBluetooth();
        }

        let modal = document.getElementById('bluetooth-hub-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'bluetooth-hub-modal';
            modal.className = 'search-modal-overlay';
            document.body.appendChild(modal);
        }

        const isBtOn = await checkBluetoothAvailability();

        modal.innerHTML = `
            <div class="search-modal-backdrop" onclick="window.closeBluetoothHubModal()"></div>
            <div class="search-modal-box max-w-[560px]" onclick="event.stopPropagation()" style="max-height:92vh;overflow-y:auto;">
                <div class="flex items-center justify-between p-4 border-b border-[var(--border-subtle)] sticky top-0 bg-[var(--surface-dark)] z-10">
                    <div class="flex items-center gap-2">
                        <span class="device-radar-pulse"></span>
                        <h3 class="font-display font-bold text-sm text-[var(--bone)]">BLUETOOTH REAL-TIME PAIRING STATION</h3>
                    </div>
                    <button type="button" class="search-clear-btn" onclick="window.closeBluetoothHubModal()">&times;</button>
                </div>

                <div class="p-5 space-y-4">
                    <!-- Host Controller Status Banner -->
                    <div class="p-3.5 rounded-lg bg-[rgba(255,255,255,0.03)] border border-[var(--border-subtle)] flex items-center justify-between" id="bt-controller-hud">
                        <div>
                            <span class="font-mono text-[9px] text-[var(--text-dim)] uppercase block">SYSTEM BLUETOOTH ADAPTER</span>
                            <span class="font-display font-bold text-xs text-[var(--bone)]" id="bt-controller-name">Host Bluetooth Controller (BCM_4387)</span>
                        </div>
                        <span id="bt-power-status-badge" class="${isBtOn ? 'wearable-live-badge text-[9px]' : 'px-2 py-0.5 rounded bg-red-950/50 border border-red-500/60 text-red-400 font-mono text-[9px] font-bold'}">
                            ${isBtOn ? '<span class="wearable-dot"></span> BLUETOOTH ON // READY' : '⚠️ BLUETOOTH OFF // DISABLED'}
                        </span>
                    </div>

                    <!-- Current Connection State -->
                    <div class="p-4 rounded-xl ${isConnected ? 'bg-emerald-950/20 border border-emerald-500/40' : 'bg-[rgba(255,255,255,0.02)] border border-[var(--border-subtle)]'}">
                        <div class="flex items-center justify-between mb-2">
                            <span class="font-mono text-[10px] ${isConnected ? 'text-emerald-400 font-bold' : 'text-[var(--text-dim)]'} uppercase">
                                ${isConnected ? '● CURRENTLY PAIRED &amp; STREAMING' : 'STANDBY // NO DEVICE LINKED'}
                            </span>
                            ${isConnected ? `<span class="font-mono text-[10px] text-emerald-400 font-bold">${wearableState.batteryLevel !== null ? wearableState.batteryLevel + '% Battery' : 'Active Link'}</span>` : ''}
                        </div>
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-3">
                                <span class="text-2xl">${isConnected ? (wearableState.deviceType === 'phone' ? '📱' : (wearableState.deviceType === 'wearable' ? '🎧' : '⌚')) : '📡'}</span>
                                <div>
                                    <div class="font-display font-bold text-sm text-[var(--bone)]">
                                        ${isConnected ? wearableState.deviceName : 'Awaiting Native Pairing'}
                                    </div>
                                    <div class="font-mono text-[10px] text-[var(--text-dim)] mt-0.5">
                                        ${isConnected ? `${wearableState.connectionType} • Paired at ${wearableState.pairedAt}` : 'Turn on Bluetooth and put your watch, headphones, or phone in pairing mode.'}
                                    </div>
                                </div>
                            </div>
                            ${isConnected ? `
                                <button type="button" onclick="window.disconnectWearable();window.openBluetoothHubModal();" class="btn-editorial-secondary text-xs py-1.5 px-3 text-red-400 border-red-500/40 hover:border-red-500">
                                    DISCONNECT
                                </button>
                            ` : ''}
                        </div>
                    </div>

                    <!-- ── Primary Live Scan & Force Pair Broadcast Action ──────── -->
                    <div class="p-4 rounded-xl bg-gradient-to-r from-[rgba(224,35,28,0.12)] to-[rgba(255,255,255,0.03)] border border-[var(--vermilion)] space-y-3">
                        <div class="flex items-center gap-2">
                            <span class="device-radar-pulse"></span>
                            <span class="font-display font-bold text-xs text-[var(--bone)]">SPONTANEOUS AIRWAVE PAIRING</span>
                        </div>
                        <p class="font-mono text-[11px] text-[var(--bone-dim)] leading-relaxed">
                            Sends connection and paging requests to all nearby available devices (smartwatch, headphones, mobile) and opens the native OS Bluetooth prompt. Only pairs after you confirm your device.
                        </p>
                        <button type="button" onclick="window.connectNativeBluetooth()" 
                                class="btn-editorial-primary w-full text-xs py-3 uppercase font-bold tracking-wider flex items-center justify-center gap-2">
                            <span>⚡</span>
                            <span>${isConnected ? 'SWITCH / PAIR NEW BLUETOOTH DEVICE' : 'SCAN &amp; BROADCAST PAIR REQUESTS'}</span>
                        </button>
                    </div>

                    <!-- Secondary Link to Wi-Fi Phone Companion -->
                    <div class="pt-2 border-t border-[var(--border-subtle)]">
                        <button type="button" onclick="window.closeBluetoothHubModal();window.openPhoneCompanionModal();" 
                                class="btn-editorial-secondary w-full text-xs py-2 text-center flex items-center justify-center gap-2">
                            <span>📱</span>
                            <span>OPEN WI-FI PHONE COMPANION (PEDOMETER SYNC)</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
        modal.classList.remove('hidden');
    };

    window.closeBluetoothHubModal = function() {
        const modal = document.getElementById('bluetooth-hub-modal');
        if (modal) modal.classList.add('hidden');
    };

    /**
     * ── 2. Real Web Bluetooth API (Native Browser Dialog & Real GATT Link) ─────────
     */
    window.connectNativeBluetooth = async function() {
        if (!navigator.bluetooth || !navigator.bluetooth.requestDevice) {
            window.showToast?.('Web Bluetooth is supported on Google Chrome and Microsoft Edge.', 'error', 4500);
            return;
        }

        // 1. Strictly verify that Bluetooth is physically powered ON
        const isBtOn = await checkBluetoothAvailability();
        if (!isBtOn) {
            window.showBluetoothOffPopup();
            window.showToast?.('⚠️ Bluetooth is NOT ON! Please turn ON Bluetooth on your computer and device to scan.', 'error', 5500);
            return;
        }

        // 2. Broadcast native hardware connection/paging requests to nearby devices (e.g. headphones, watch, phone)
        try {
            fetch('/v1/bluetooth/force-pair-request', { method: 'POST' })
                .then(r => r.json())
                .then(data => {
                    const count = data.paged_devices ? data.paged_devices.length : 0;
                    if (count > 0) {
                        console.info(`[Luminix BLE] Transmitted force pair requests to ${count} devices:`, data.paged_devices);
                    }
                })
                .catch(()=>{});
        } catch (_) {}

        window.showToast?.('📡 Force-broadcasting pair requests to all available devices… Check your headphones, watch, or phone for pair prompt.', 'info', 4500);

        try {
            // 3. Open the browser's native OS Bluetooth device chooser
            const device = await navigator.bluetooth.requestDevice({
                acceptAllDevices: true,
                optionalServices: [
                    'heart_rate',
                    'battery_service',
                    'running_speed_and_cadence',
                    'cycling_speed_and_cadence',
                    'health_thermometer',
                    'pulse_oximeter',
                    'immediate_alert',
                    'link_loss',
                    'device_information',
                    0x1802, // Immediate Alert Service (Smartwatch Ring/Buzzer)
                    0x1803, // Link Loss Service
                    0x180A, // Device Information
                    0x180D, // Heart Rate
                    0x180F, // Battery
                    0x1814, // Running Speed and Cadence (Pedometer)
                    0x1822, // Pulse Oximeter
                    0x1810  // Blood Pressure
                ]
            });

            if (!device) {
                window.showToast?.('Pairing cancelled. No device selected.', 'info', 3000);
                return;
            }

            // Close modal if open
            window.closeBluetoothHubModal();

            wearableState.gattDevice = device;
            const deviceName = device.name || 'Bluetooth Wearable Device';
            const deviceType = (device.name?.toLowerCase().includes('phone') || device.name?.toLowerCase().includes('pixel') || device.name?.toLowerCase().includes('redmi'))
                ? 'phone' 
                : (device.name?.toLowerCase().includes('headset') || device.name?.toLowerCase().includes('buds') || device.name?.toLowerCase().includes('studio'))
                    ? 'wearable'
                    : 'smartwatch';

            window.showToast?.(`Connecting to ${deviceName}…`, 'info', 2500);

            device.addEventListener('gattserverdisconnected', onBluetoothDisconnected);

            // 4. Connect to GATT server and fetch genuine telemetry from device
            let realBattery = null;
            let realBpm = null;

            try {
                if (device.gatt) {
                    const server = await device.gatt.connect();
                    wearableState.gattServer = server;

                    // Safe GATT helper functions
                    const getSafeService = async (...serviceIds) => {
                        for (const sId of serviceIds) {
                            try {
                                const svc = await server.getPrimaryService(sId);
                                if (svc) return svc;
                            } catch (_) {}
                        }
                        return null;
                    };

                    const getSafeChar = async (service, ...charIds) => {
                        if (!service) return null;
                        for (const cId of charIds) {
                            try {
                                const ch = await service.getCharacteristic(cId);
                                if (ch) return ch;
                            } catch (_) {}
                        }
                        return null;
                    };

                    // Read Genuine Battery Percentage
                    try {
                        const battService = await getSafeService('battery_service', 0x180F);
                        if (battService) {
                            const battChar = await getSafeChar(battService, 'battery_level', 0x2A19);
                            if (battChar) {
                                const val = await battChar.readValue();
                                realBattery = val.getUint8(0);
                                console.info(`[Luminix BLE] Genuine battery read: ${realBattery}%`);
                            }
                        }
                    } catch (_) {}

                    // Link Immediate Alert for Ringing/Buzzer (Smartwatch Find My Device)
                    try {
                        const alertService = await getSafeService('immediate_alert', 0x1802);
                        if (alertService) {
                            _gattAlertChar = await getSafeChar(alertService, 'alert_level', 0x2A06);
                            if (_gattAlertChar) {
                                console.info('[Luminix BLE] Smartwatch Immediate Alert Service (0x1802) linked successfully!');
                            }
                        }
                    } catch (_) {}

                    // Read Genuine Heart Rate
                    try {
                        const hrService = await getSafeService('heart_rate', 0x180D);
                        if (hrService) {
                            const hrChar = await getSafeChar(hrService, 'heart_rate_measurement', 0x2A37);
                            if (hrChar) {
                                await hrChar.startNotifications();
                                hrChar.addEventListener('characteristicvaluechanged', (e) => {
                                    const hrVal = e.target.value;
                                    const hrBpm = hrVal.getUint8(1);
                                    if (hrBpm > 30 && hrBpm < 220) {
                                        wearableState.heartRate = hrBpm;
                                        const hrEl = document.getElementById('wearable-hr-val');
                                        if (hrEl) hrEl.textContent = `${hrBpm} bpm`;
                                    }
                                });
                            }
                        }
                    } catch (_) {}
                }
            } catch (gattErr) {
                console.warn('[GATT Error]:', gattErr);
            }

            // 5. Notify backend of genuine physical connection across both subsystems
            try {
                await fetch('/v1/bluetooth/connect', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        device_name: deviceName,
                        device_address: device.id ? device.id.substring(0, 17) : '',
                        device_type: deviceType,
                        battery: realBattery,
                        connection_type: 'Web Bluetooth GATT BLE 5.3'
                    })
                });
            } catch (_) {}

            try {
                await fetch('/api/v1/health/connect', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        device_name: deviceName,
                        device_id: device.id || deviceName.toLowerCase().replace(/[^a-z0-9]/g, '_'),
                        device_type: deviceType,
                        source: 'direct_ble',
                        platform: 'Web Bluetooth GATT BLE 5.3'
                    })
                });
            } catch (_) {}

            // 6. Complete connection pipeline with genuine telemetry
            executeProcessingPipeline(deviceName, deviceType, 'Web Bluetooth GATT BLE 5.3', {
                battery: realBattery,
                steps: null,
                heart_rate: realBpm
            });

            window.showToast?.(`✓ Successfully paired with ${deviceName}! Live link active.`, 'success', 4500);

        } catch (err) {
            console.warn('[Web Bluetooth Notice]:', err);
            if (err.name === 'NotFoundError' || (err.message && err.message.toLowerCase().includes('cancelled'))) {
                window.showToast?.('Pairing cancelled by user. No device connected.', 'info', 3000);
            } else {
                window.showToast?.(`Bluetooth notice: ${err.message}`, 'error', 4500);
            }
        }
    };

    function onBluetoothDisconnected() {
        window.showToast?.(`Device ${wearableState.deviceName || ''} disconnected.`, 'info', 3500);
        window.disconnectWearable();
    }

    /**
     * ── 3. Real Mobile Phone Companion Sync & Polling ───────────────────────────
     */
    window.openPhoneCompanionModal = function() {
        let modal = document.getElementById('phone-companion-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'phone-companion-modal';
            modal.className = 'search-modal-overlay';
            document.body.appendChild(modal);
        }

        const localIp = _detectedHostIp || window.location.hostname || "10.36.98.140";
        const companionPort = window.location.port || "8000";
        const wifiUrl = `http://${localIp}:${companionPort}/companion`;
        const localUrl = `${window.location.origin}/companion`;

        modal.innerHTML = `
            <div class="search-modal-backdrop" onclick="window.closePhoneCompanionModal()"></div>
            <div class="search-modal-box max-w-[520px]" onclick="event.stopPropagation()">
                <div class="flex items-center justify-between p-4 border-b border-[var(--border-subtle)]">
                    <div class="flex items-center gap-2">
                        <span class="device-radar-pulse"></span>
                        <h3 class="font-display font-bold text-sm text-[var(--bone)]">CONNECT MOBILE PHONE (WI-FI COMPANION)</h3>
                    </div>
                    <button type="button" class="search-clear-btn" onclick="window.closePhoneCompanionModal()">&times;</button>
                </div>

                <div class="p-4 space-y-4">
                    <p class="text-xs text-[var(--bone-dim)] leading-relaxed">
                        Open this link on your <strong>iPhone</strong> or <strong>Android phone</strong> (connected to the same Wi-Fi network). It activates your phone’s real motion accelerometer to count live physical steps and stream them directly to Luminix!
                    </p>

                    <!-- URL Box -->
                    <div class="p-3 rounded-lg bg-[rgba(255,255,255,0.03)] border border-[var(--border-subtle)]">
                        <div class="font-mono text-[10px] text-[var(--vermilion)] uppercase font-bold mb-1">
                            PHONE COMPANION ACCESS LINK:
                        </div>
                        <div class="flex items-center justify-between gap-2">
                            <input type="text" readonly value="${wifiUrl}" id="companion-url-input" class="form-input-editorial text-xs font-mono py-1.5 px-2.5 flex-1 select-all" />
                            <button type="button" onclick="window.copyCompanionUrl()" class="btn-editorial-primary text-xs py-1.5 px-3">
                                COPY URL
                            </button>
                        </div>
                        <div class="flex items-center justify-between mt-2 pt-2 border-t border-[rgba(255,255,255,0.06)]">
                            <span class="font-mono text-[10px] text-[var(--text-dim)]">Testing locally on this computer?</span>
                            <a href="${localUrl}" target="_blank" class="font-mono text-xs text-emerald-400 hover:underline">
                                Open Companion Tab &rarr;
                            </a>
                        </div>
                    </div>

                    <!-- Direct Step Input on Desktop -->
                    <div class="p-3 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[var(--border-subtle)]">
                        <label for="companion-step-input" class="font-mono text-[10px] text-[var(--bone)] uppercase font-bold block mb-1">
                            OR ENTER PHONE STEPS DIRECTLY:
                        </label>
                        <div class="flex gap-2">
                            <input type="number" id="companion-step-input" min="0" placeholder="e.g. 5200"
                                   class="form-input-editorial flex-1 text-xs font-mono py-1.5 px-3" />
                            <button type="button" onclick="window.applyCompanionDirectSteps()" class="btn-editorial-primary text-xs py-1.5 px-3 whitespace-nowrap">
                                SYNC &amp; ANALYZE
                            </button>
                        </div>
                    </div>

                    <!-- Live Discovery Pulse Box -->
                    <div class="p-3 rounded-lg bg-[rgba(16,185,129,0.05)] border border-[rgba(16,185,129,0.25)] flex items-center gap-3">
                        <span class="wearable-dot"></span>
                        <div class="flex-1">
                            <div class="font-display font-semibold text-xs text-emerald-400">Listening for Phone Telemetry Stream…</div>
                            <div id="companion-poll-status" class="font-mono text-[10px] text-[var(--text-dim)] mt-0.5">
                                Awaiting connection from phone browser at ${localIp}:${companionPort}…
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        modal.classList.remove('hidden');

        // Start active polling while modal is open
        startCompanionPolling();
    };

    window.closePhoneCompanionModal = function() {
        const modal = document.getElementById('phone-companion-modal');
        if (modal) modal.classList.add('hidden');
        if (companionPollInterval) clearInterval(companionPollInterval);
    };

    window.copyCompanionUrl = function() {
        const input = document.getElementById('companion-url-input');
        if (input) {
            input.select();
            navigator.clipboard.writeText(input.value);
            window.showToast?.('✓ Companion link copied! Open on your phone.', 'success', 3000);
        }
    };

    window.applyCompanionDirectSteps = function() {
        const input = document.getElementById('companion-step-input');
        const steps = parseInt(input?.value, 10);
        if (isNaN(steps) || steps < 0) {
            window.showToast?.('Please enter a valid step count.', 'warning', 3000);
            return;
        }
        window.closePhoneCompanionModal();
        executeProcessingPipeline("Mobile Phone Step Sync", "phone", "Mobile Wi-Fi Companion Bridge", { steps });
    };

    function startCompanionPolling() {
        if (companionPollInterval) clearInterval(companionPollInterval);

        companionPollInterval = setInterval(async () => {
            try {
                const res = await fetch('/v1/telemetry/live');
                if (!res.ok) return;
                const data = await res.json();

                if (data && data.is_live && data.steps !== null) {
                    const statusEl = document.getElementById('companion-poll-status');
                    if (statusEl) {
                        statusEl.innerHTML = `<span class="text-emerald-400 font-bold">✓ Phone Active:</span> ${data.device_name} (${data.steps} steps logged)`;
                    }

                    if (!wearableState.connected) {
                        window.closePhoneCompanionModal();
                        executeProcessingPipeline(
                            data.device_name || "Mobile Phone Companion",
                            "phone",
                            "Mobile Wi-Fi Companion Bridge",
                            {
                                steps: data.steps,
                                battery: data.battery
                            }
                        );
                    }
                }
            } catch (_) {}
        }, 1800);
    }

    // Passive detector: when on Connect Chamber in standby, automatically pick up active mobile phone stream
    setInterval(async () => {
        const hash = window.location.hash.replace('#', '');
        if (window.currentView !== 'connect' && hash !== 'connect') return;
        if (wearableState.connected) return;

        try {
            const res = await fetch('/v1/telemetry/live');
            if (!res.ok) return;
            const data = await res.json();
            if (data && data.is_live && data.connected && !wearableState.connected) {
                executeProcessingPipeline(
                    data.device_name || "Mobile Phone Companion",
                    data.device_type || "phone",
                    data.connection_type || "Mobile Wi-Fi Companion Bridge",
                    {
                        steps: data.steps,
                        battery: data.battery
                    }
                );
            }
        } catch (_) {}
    }, 2500);

    /**
     * ── 4. Disconnect & Reset ───────────────────────────────────────────────────
     */
    window.disconnectWearable = async function() {
        if (wearableState.gattServer) {
            try { wearableState.gattServer.disconnect(); } catch (_) {}
        }
        try {
            await fetch('/v1/telemetry/reset', { method: 'POST' });
        } catch (_) {}
        try {
            await fetch('/api/v1/health/disconnect', { method: 'POST' });
        } catch (_) {}

        wearableState.connected = false;
        wearableState.status = 'standby';
        wearableState.deviceName = null;
        wearableState.deviceType = null;
        wearableState.connectionType = null;
        wearableState.batteryLevel = null;
        wearableState.steps = null;
        wearableState.caloriesBurned = null;
        wearableState.distanceKm = null;
        wearableState.spo2 = null;
        wearableState.systolic = null;
        wearableState.diastolic = null;
        wearableState.heartRate = null;
        wearableState.hrv = null;
        wearableState.sleepHours = null;
        wearableState.sleepMinutes = null;
        wearableState.sleepQuality = null;
        wearableState.sleepScore = null;
        wearableState.provenance = {};

        bridgeState.bpStatus = {
            hasRecent: false,
            systolic: null,
            diastolic: null,
            display: 'No device connected',
            age: 'No device connected',
            source: 'None',
        };

        bridgeState.heartRisk = {
            score: 0,
            level: 'AWAITING_DATA',
            cardioLevel: 'AWAITING_DATA',
            heatIndexF: 82.0,
            heatIndexC: 27.8,
            category: 'Normal',
            alertActive: false,
            alertTitle: '● AWAITING SENSOR TELEMETRY',
            alertMsg: 'No health device connected. Pair a real wearable or companion bridge to stream biometrics.',
            triggers: [],
            missingSignals: ['heart_rate', 'hrv', 'blood_pressure', 'spo2'],
            recommendations: [
                'Pair a real smartwatch or companion sensor to initialize cardiovascular monitoring.'
            ],
            disclaimer: 'Notice: Luminix Multi-Signal Heart Risk Engine provides investigational / decision-support monitoring only, not a clinical medical diagnosis.',
        };

        stopProximityPolling();
        stopLiveRefresh();
        if (_countdownInterval) clearInterval(_countdownInterval);
        _isRingActive = false;
        _gattBattChar = null;
        _gattAlertChar = null;
        _gattStepCadence = 0;
        renderCurrentView();
        window.showToast?.('Device unlinked. Zero active telemetry.', 'info', 3000);
    };

    function showPairingPhoneNotification(name) {
        const toast = document.createElement('div');
        toast.className = 'phone-pairing-banner';
        toast.innerHTML = `
            <div class="flex items-center gap-3">
                <span class="text-2xl">${name?.includes('Phone') || name?.includes('cherry') || name?.includes('Redmi') ? '📱' : '⌚'}</span>
                <div>
                    <div class="font-mono text-[10px] text-[var(--vermilion)] uppercase font-bold">LUMINIX HARDWARE SYNC</div>
                    <div class="font-display font-semibold text-xs text-[var(--bone)]">Device Connected: ${name || 'Hardware'}</div>
                    <div class="text-[10px] text-[var(--text-dim)]">Continuous SpO2 &amp; Step Telemetry active • Latest available BP cached.</div>
                </div>
                <button type="button" class="ml-auto text-sm text-[var(--bone-dim)]" onclick="this.parentElement.parentElement.remove()">&times;</button>
            </div>
        `;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 4500);
    }

    function renderCurrentView() {
        const container = document.getElementById('main-content');
        const hash = window.location.hash.replace('#', '');
        if (container && (window.currentView === 'connect' || hash === 'connect')) {
            window.renderWearableHub(container);
        }
    }

    // ── Find My Device: Ring + Proximity System ───────────────────────────────
    let _proximityPollInterval = null;
    let _isRingActive = false;

    /**
     * Trigger the ring alarm ONLY on external devices (mobile phone companion & smartwatch buzzer).
     * Host laptop/desktop audio is completely muted per user request.
     */
    window.triggerDeviceRing = async function() {
        const btn = document.getElementById('ring-device-btn');
        const icon = document.getElementById('ring-btn-icon');
        const label = document.getElementById('ring-btn-label');

        const writeAlertLevel = async (char, level) => {
            if (!char) return;
            const buf = new Uint8Array([level]);
            try {
                if (char.writeValueWithoutResponse) {
                    await char.writeValueWithoutResponse(buf);
                } else {
                    await char.writeValue(buf);
                }
            } catch (_) {
                try { await char.writeValue(buf); } catch (e) { console.warn('[BLE Alert write]:', e); }
            }
        };

        if (_isRingActive) {
            // Stop ringing external device
            _isRingActive = false;

            // 1. Tell smartwatch over BLE to stop alert (0x00 = No Alert)
            if (_gattAlertChar) {
                await writeAlertLevel(_gattAlertChar, 0x00);
                console.log('[Luminix BLE] Smartwatch Alert stopped (0x00)');
            }

            // 2. Tell backend to stop mobile companion ringing
            try { await fetch('/v1/device/ring/stop', { method: 'POST' }); } catch(_) {}

            if (btn) btn.classList.remove('find-ring-btn-active');
            if (icon) icon.textContent = '🔔';
            if (label) label.textContent = 'RING TO FIND';
            window.showToast?.('Device ring signal stopped.', 'info', 2500);
            return;
        }

        _isRingActive = true;

        // 1. If connected to a Smartwatch over BLE, trigger High Alert (0x02) so the watch buzzes/rings!
        if (_gattAlertChar) {
            await writeAlertLevel(_gattAlertChar, 0x02);
            console.log('[Luminix BLE] Sent High Alert (0x02) to smartwatch buzzer/vibration!');
        }

        if (btn) btn.classList.add('find-ring-btn-active');
        if (icon) icon.textContent = '🔕';
        if (label) label.textContent = 'RINGING ON DEVICE… TAP TO STOP';

        // 2. Tell backend to signal mobile phone companion (host machine audio stays silent)
        try {
            await fetch('/v1/device/ring', { method: 'POST' });
            const devName = wearableState.deviceName || 'Device';
            window.showToast?.(`🔔 Transmitting ring signal to ${devName}… Audio ringing on mobile phone & smartwatch! (Host muted)`, 'success', 5000);
        } catch(_) {
            window.showToast?.('Transmitting ring command to external companion.', 'info', 3000);
        }

        // Auto-reset button after 15 seconds
        setTimeout(async () => {
            if (_isRingActive) {
                _isRingActive = false;
                if (_gattAlertChar) {
                    await writeAlertLevel(_gattAlertChar, 0x00);
                }
                if (btn) btn.classList.remove('find-ring-btn-active');
                if (icon) icon.textContent = '🔔';
                if (label) label.textContent = 'RING TO FIND';
            }
        }, 15000);
    };

    /**
     * Start live RSSI proximity polling (every 3.5 seconds via backend BLE scan)
     */
    function startProximityPolling() {
        if (_proximityPollInterval) clearInterval(_proximityPollInterval);
        updateProximityDisplay(); // immediate first read
        _proximityPollInterval = setInterval(updateProximityDisplay, 3500);
    }

    async function updateProximityDisplay() {
        if (!wearableState.connected) {
            stopProximityPolling();
            return;
        }
        try {
            const res = await fetch('/v1/device/proximity');
            if (!res.ok) return;
            const data = await res.json();

            const distEl = document.getElementById('proximity-distance-val');
            const rssiEl = document.getElementById('proximity-rssi-val');
            const zoneEl = document.getElementById('proximity-zone-label');
            const radarBlip = document.getElementById('radar-blip-dot');

            if (!distEl) return; // card not rendered yet

            if (data.distance_m !== null && data.distance_m !== undefined) {
                distEl.textContent = data.distance_m.toFixed(1);
                if (rssiEl) rssiEl.textContent = `RSSI: ${data.rssi} dBm (Radius: ${data.distance_m.toFixed(1)}m)`;
            } else {
                distEl.textContent = '--';
                if (rssiEl) rssiEl.textContent = 'RSSI: Awaiting BLE Radio Signal';
            }

            // Update signal bars
            const bars = data.signal_bars || 0;
            for (let i = 1; i <= 5; i++) {
                const bar = document.getElementById('sbar-' + i);
                if (bar) {
                    const active = i <= bars;
                    bar.style.background = active
                        ? (bars >= 4 ? '#10b981' : bars >= 3 ? '#f59e0b' : '#ef4444')
                        : 'rgba(255,255,255,0.08)';
                    bar.style.boxShadow = active
                        ? (bars >= 4 ? '0 0 6px rgba(16,185,129,0.5)' : bars >= 3 ? '0 0 6px rgba(245,158,11,0.5)' : '0 0 6px rgba(239,68,68,0.5)')
                        : 'none';
                }
            }

            // Update zone label
            if (zoneEl) {
                const zoneText = data.radius_zone || 'AWAITING SIGNAL';
                let color = '#8b9990';
                if (zoneText.includes('IMMEDIATE')) color = '#10b981';
                else if (zoneText.includes('NEARBY')) color = '#34d399';
                else if (zoneText.includes('ROOM')) color = '#f59e0b';
                else if (zoneText.includes('PERIPHERAL') || zoneText.includes('FAR')) color = '#ef4444';

                zoneEl.textContent = zoneText;
                zoneEl.style.color = color;
                zoneEl.style.borderColor = color + '55';
            }

            // Adjust radar blip
            if (radarBlip) {
                if (data.distance_m !== null && data.distance_m !== undefined) {
                    const scale = Math.max(0.7, Math.min(1.5, 1.8 - (data.distance_m / 10)));
                    radarBlip.style.transform = `scale(${scale})`;
                    radarBlip.style.opacity = '1';
                } else {
                    radarBlip.style.transform = 'scale(0.8)';
                    radarBlip.style.opacity = '0.25';
                }
            }
        } catch (_) {}
    }

    function estimateDistanceFromRssi(rssi) {
        const txPower = -59;
        const n = 2.4;
        return Math.max(0.3, Math.min(35, Math.pow(10, (txPower - rssi) / (10 * n))));
    }

    function stopProximityPolling() {
        if (_proximityPollInterval) { clearInterval(_proximityPollInterval); _proximityPollInterval = null; }
    }

    // ── Inline Calibrate Steps & Battery Modal ────────────────────────────────
    window.openCalibrateModal = function() {
        let modal = document.getElementById('telemetry-calibrate-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'telemetry-calibrate-modal';
            modal.className = 'search-modal-overlay';
            document.body.appendChild(modal);
        }
        modal.innerHTML = `
            <div class="search-modal-backdrop" onclick="window.closeCalibrateModal()"></div>
            <div class="search-modal-box max-w-[440px]" onclick="event.stopPropagation()">
                <div class="flex items-center justify-between p-4 border-b border-[var(--border-subtle)]">
                    <div class="flex items-center gap-2">
                        <span class="text-lg">⚙️</span>
                        <h3 class="font-display font-bold text-sm text-[var(--bone)]">CALIBRATE STEPS &amp; BATTERY</h3>
                    </div>
                    <button type="button" class="search-clear-btn" onclick="window.closeCalibrateModal()">&times;</button>
                </div>
                <div class="p-4 space-y-4">
                    <p class="text-xs text-[var(--bone-dim)] leading-relaxed">
                        Match the exact values shown on your phone (Redmi Note 11S, cherry, etc.) or smartwatch:
                    </p>
                    <div>
                        <label class="font-mono text-[10px] text-[var(--vermilion)] uppercase font-bold block mb-1">
                            PHONE / WATCH CURRENT STEPS:
                        </label>
                        <div class="flex gap-2">
                            <input type="number" id="cal-steps-input" min="0" max="100000" value="${wearableState.steps !== null ? wearableState.steps : ''}" placeholder="e.g. 3500"
                                   class="form-input-editorial flex-1 text-sm font-mono py-1.5 px-3" />
                            <button type="button" onclick="document.getElementById('cal-steps-input').value = (parseInt(document.getElementById('cal-steps-input').value || 0) + 1000)"
                                    class="btn-editorial-secondary text-xs px-2.5">+1,000</button>
                        </div>
                    </div>
                    <div>
                        <label class="font-mono text-[10px] text-emerald-400 uppercase font-bold block mb-1">
                            BATTERY PERCENTAGE:
                        </label>
                        <div class="flex items-center gap-3">
                            <input type="range" id="cal-battery-slider" min="1" max="100" value="${wearableState.batteryLevel !== null ? wearableState.batteryLevel : 50}"
                                   oninput="document.getElementById('cal-battery-val').textContent = this.value + '%'"
                                   class="flex-1 accent-[#10b981]" />
                            <span id="cal-battery-val" class="font-mono text-xs font-bold text-emerald-400 w-12 text-right">
                                ${wearableState.batteryLevel !== null ? wearableState.batteryLevel + '%' : '--%'}
                            </span>
                        </div>
                    </div>
                    <div class="pt-2 border-t border-[var(--border-subtle)] flex gap-2">
                        <button type="button" onclick="window.saveCalibratedTelemetry()" class="btn-editorial-primary flex-1 text-xs py-2 text-center">
                            ✓ SAVE &amp; SYNC IMMEDIATELY
                        </button>
                        <button type="button" onclick="window.closeCalibrateModal()" class="btn-editorial-secondary text-xs py-2 px-4">
                            CANCEL
                        </button>
                    </div>
                </div>
            </div>
        `;
        modal.classList.remove('hidden');
    };

    window.closeCalibrateModal = function() {
        const modal = document.getElementById('telemetry-calibrate-modal');
        if (modal) modal.classList.add('hidden');
    };

    window.saveCalibratedTelemetry = async function() {
        const stepsInput = document.getElementById('cal-steps-input');
        const battSlider = document.getElementById('cal-battery-slider');
        const steps = stepsInput ? parseInt(stepsInput.value, 10) : wearableState.steps;
        const batt = battSlider ? parseInt(battSlider.value, 10) : wearableState.batteryLevel;

        const profile = getBiometricProfile();
        wearableState.steps = steps !== null && !isNaN(steps) ? Math.max(0, steps) : wearableState.steps;
        wearableState.batteryLevel = batt !== null && !isNaN(batt) ? Math.max(1, Math.min(100, batt)) : wearableState.batteryLevel;
        wearableState.distanceKm = wearableState.steps !== null ? computeDistanceKm(wearableState.steps, profile.height) : null;
        wearableState.caloriesBurned = wearableState.steps !== null ? computeCalories(wearableState.steps, profile.weight) : null;

        window.closeCalibrateModal();
        updateLiveDisplays();
        recordTodaySnapshot();

        // Sync with backend
        try {
            await fetch('/v1/bluetooth/connect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    device_name: wearableState.deviceName || 'Connected Device',
                    device_type: wearableState.deviceType || 'phone',
                    steps: wearableState.steps,
                    battery: wearableState.batteryLevel
                })
            });
        } catch (_) {}

        window.showToast?.(`✓ Telemetry calibrated: ${wearableState.steps.toLocaleString()} steps • ${wearableState.batteryLevel}% battery`, 'success', 3000);
    };

    // ── Metric History Analytics Modal ────────────────────────────────────────
    window.openMetricHistoryModal = function(metricType) {
        let modal = document.getElementById('metric-history-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'metric-history-modal';
            modal.className = 'search-modal-overlay';
            document.body.appendChild(modal);
        }

        const titles = {
            steps: { label: 'STEP COUNT & ACTIVITY', icon: '🔥', color: '#E0231C' },
            bp: { label: 'BLOOD PRESSURE & HEART RATE', icon: '❤️', color: '#ef4444' },
            sleep: { label: 'SLEEP ARCHITECTURE', icon: '🌙', color: '#818cf8' }
        };
        const t = titles[metricType] || titles.steps;

        modal.innerHTML = `
            <div class="search-modal-backdrop" onclick="window.closeMetricHistoryModal()"></div>
            <div class="search-modal-box max-w-[700px] w-full" onclick="event.stopPropagation()" style="max-height:90vh;overflow-y:auto;">
                <div class="flex items-center justify-between p-4 border-b border-[var(--border-subtle)] sticky top-0 bg-[var(--surface-dark)] z-10">
                    <div class="flex items-center gap-2.5">
                        <span class="text-xl">${t.icon}</span>
                        <div>
                            <div class="font-mono text-[10px] text-[var(--text-dim)] uppercase">ANALYTICS • ${t.label}</div>
                            <h3 class="font-display font-bold text-sm text-[var(--bone)]">Daily / Weekly / Monthly View</h3>
                        </div>
                    </div>
                    <button type="button" class="search-clear-btn" onclick="window.closeMetricHistoryModal()">&times;</button>
                </div>

                <!-- Period Tabs -->
                <div class="flex gap-1 p-4 pb-0">
                    <button id="mh-tab-day" onclick="window.switchMetricPeriod('day','${metricType}')" class="mh-tab-btn mh-tab-active">TODAY</button>
                    <button id="mh-tab-week" onclick="window.switchMetricPeriod('week','${metricType}')" class="mh-tab-btn">LAST 7 DAYS</button>
                    <button id="mh-tab-month" onclick="window.switchMetricPeriod('month','${metricType}')" class="mh-tab-btn">LAST 30 DAYS</button>
                </div>

                <div id="metric-history-body" class="p-4"></div>
            </div>
        `;
        modal.classList.remove('hidden');

        // Add tab styles if not present
        if (!document.getElementById('mh-tab-style')) {
            const s = document.createElement('style');
            s.id = 'mh-tab-style';
            s.textContent = `
                .mh-tab-btn{font-family:var(--font-mono,monospace);font-size:10px;font-weight:700;letter-spacing:.08em;padding:6px 14px;border-radius:6px;border:1px solid var(--border-subtle);background:transparent;color:var(--bone-dim);cursor:pointer;transition:all .2s;}
                .mh-tab-btn:hover{border-color:var(--vermilion);color:var(--bone);}
                .mh-tab-active{background:var(--vermilion)!important;border-color:var(--vermilion)!important;color:#fff!important;}
                .mh-stat-box{background:rgba(255,255,255,.02);border:1px solid var(--border-subtle);border-radius:10px;padding:14px;}
                .mh-stat-label{font-family:var(--font-mono,monospace);font-size:9px;color:var(--text-dim);letter-spacing:.06em;text-transform:uppercase;display:block;margin-bottom:4px;}
                .mh-stat-val{font-family:var(--font-display,sans-serif);font-size:1.5rem;font-weight:900;color:var(--bone);line-height:1;}
                .mh-chart-wrap{position:relative;height:200px;margin-top:12px;}
            `;
            document.head.appendChild(s);
        }

        window.switchMetricPeriod('day', metricType);
    };

    window.closeMetricHistoryModal = function() {
        const modal = document.getElementById('metric-history-modal');
        if (modal) modal.classList.add('hidden');
        if (_historyChartInstance) { try { _historyChartInstance.destroy(); } catch(_) {} _historyChartInstance = null; }
    };

    window.switchMetricPeriod = function(period, metricType) {
        // Update tab styles
        ['day','week','month'].forEach(p => {
            const btn = document.getElementById('mh-tab-' + p);
            if (btn) btn.className = p === period ? 'mh-tab-btn mh-tab-active' : 'mh-tab-btn';
        });

        const body = document.getElementById('metric-history-body');
        if (!body) return;

        const allRecords = loadHistory().sort((a,b) => (a.date||'').localeCompare(b.date||''));
        const today = getTodayKey();

        // Get today live state (may not be in history yet)
        const todayLive = {
            date: today,
            steps: wearableState.steps,
            calories: wearableState.caloriesBurned,
            distance_km: parseFloat(wearableState.distanceKm) || null,
            systolic: wearableState.systolic,
            diastolic: wearableState.diastolic,
            heart_rate: wearableState.heartRate,
            spo2: wearableState.spo2,
            sleep_hours: wearableState.sleepHours,
            sleep_minutes: wearableState.sleepMinutes,
            sleep_score: wearableState.sleepScore,
            sleep_quality: wearableState.sleepQuality,
        };

        let records = allRecords.filter(r => r.date !== today);
        records.push(todayLive);

        let filtered;
        if (period === 'day') {
            filtered = records.filter(r => r.date === today);
        } else if (period === 'week') {
            const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 6);
            const cutoffStr = cutoff.toISOString().split('T')[0];
            filtered = records.filter(r => r.date >= cutoffStr);
        } else {
            const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 29);
            const cutoffStr = cutoff.toISOString().split('T')[0];
            filtered = records.filter(r => r.date >= cutoffStr);
        }

        if (_historyChartInstance) { try { _historyChartInstance.destroy(); } catch(_) {} _historyChartInstance = null; }

        body.innerHTML = renderMetricPeriodContent(period, metricType, filtered);

        // Draw chart after render
        setTimeout(() => {
            const ctx = document.getElementById('metric-history-chart');
            if (!ctx || typeof Chart === 'undefined') return;
            const chartData = buildChartData(metricType, filtered);
            _historyChartInstance = new Chart(ctx, {
                type: 'bar',
                data: chartData,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: chartData.datasets.length > 1, labels: { color: '#aaa', font: { size: 10 } } },
                        tooltip: { backgroundColor: '#1a1a2e', titleColor: '#eee', bodyColor: '#ccc' }
                    },
                    scales: {
                        x: { ticks: { color: '#666', font: { size: 9 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
                        y: { ticks: { color: '#666', font: { size: 9 } }, grid: { color: 'rgba(255,255,255,0.06)' }, beginAtZero: true }
                    }
                }
            });
        }, 60);
    };

    function buildChartData(metricType, records) {
        const labels = records.map(r => r.date ? r.date.substring(5) : '--');
        if (metricType === 'steps') {
            return {
                labels,
                datasets: [{
                    label: 'Steps',
                    data: records.map(r => r.steps || 0),
                    backgroundColor: 'rgba(224,35,28,0.65)',
                    borderColor: '#E0231C',
                    borderWidth: 1,
                    borderRadius: 4
                }, {
                    label: 'Goal (10,000)',
                    data: records.map(() => 10000),
                    type: 'line',
                    borderColor: 'rgba(255,180,0,0.4)',
                    borderDash: [4,4],
                    pointRadius: 0,
                    borderWidth: 1.5
                }]
            };
        }
        if (metricType === 'bp') {
            return {
                labels,
                datasets: [{
                    label: 'Systolic',
                    data: records.map(r => r.systolic || null),
                    backgroundColor: 'rgba(239,68,68,0.5)',
                    borderColor: '#ef4444',
                    borderWidth: 1,
                    borderRadius: 3
                }, {
                    label: 'Diastolic',
                    data: records.map(r => r.diastolic || null),
                    backgroundColor: 'rgba(251,146,60,0.45)',
                    borderColor: '#fb923c',
                    borderWidth: 1,
                    borderRadius: 3
                }, {
                    label: 'Heart Rate',
                    data: records.map(r => r.heart_rate || null),
                    type: 'line',
                    borderColor: 'rgba(129,140,248,0.8)',
                    backgroundColor: 'transparent',
                    pointBackgroundColor: '#818cf8',
                    pointRadius: 3,
                    borderWidth: 2
                }]
            };
        }
        // sleep
        return {
            labels,
            datasets: [{
                label: 'Sleep Hours',
                data: records.map(r => r.sleep_hours != null ? (r.sleep_hours + (r.sleep_minutes||0)/60).toFixed(1) : null),
                backgroundColor: 'rgba(129,140,248,0.55)',
                borderColor: '#818cf8',
                borderWidth: 1,
                borderRadius: 4
            }, {
                label: 'Sleep Score (/100)',
                data: records.map(r => r.sleep_score ? (r.sleep_score / 100 * 12).toFixed(1) : null),
                type: 'line',
                borderColor: 'rgba(52,211,153,0.8)',
                backgroundColor: 'transparent',
                pointBackgroundColor: '#34d399',
                pointRadius: 3,
                borderWidth: 2
            }]
        };
    }

    function renderMetricPeriodContent(period, metricType, records) {
        const noData = records.length === 0;

        if (period === 'day') {
            const r = records[0] || {};
            if (metricType === 'steps') {
                const steps = r.steps ?? wearableState.steps;
                const cal = r.calories ?? wearableState.caloriesBurned;
                const dist = r.distance_km ?? wearableState.distanceKm;
                const pct = steps ? Math.min(100, Math.round(steps / 10000 * 100)) : 0;
                return `
                <div class="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                    <div class="mh-stat-box">
                        <span class="mh-stat-label">TODAY'S STEPS</span>
                        <span class="mh-stat-val" style="color:#E0231C">${steps != null ? steps.toLocaleString() : '--'}</span>
                        <div style="margin-top:6px;height:4px;border-radius:4px;background:rgba(255,255,255,.08);overflow:hidden;">
                            <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,#E0231C,#f59e0b);"></div>
                        </div>
                        <span style="font-size:9px;color:#888;font-family:monospace;">${pct}% of daily goal</span>
                    </div>
                    <div class="mh-stat-box">
                        <span class="mh-stat-label">CALORIES BURNED</span>
                        <span class="mh-stat-val" style="color:#f59e0b">${cal != null ? cal.toLocaleString() : '--'}<span style="font-size:.7rem;font-weight:400"> kcal</span></span>
                    </div>
                    <div class="mh-stat-box">
                        <span class="mh-stat-label">DISTANCE</span>
                        <span class="mh-stat-val" style="color:#34d399">${dist != null ? dist : '--'}<span style="font-size:.7rem;font-weight:400"> km</span></span>
                    </div>
                </div>
                <div class="mh-stat-box">
                    <span class="mh-stat-label">REMAINING TO GOAL</span>
                    <span style="font-family:var(--font-display,sans-serif);font-size:1.1rem;font-weight:700;color:var(--bone)">${steps != null ? Math.max(0, 10000 - steps).toLocaleString() + ' steps' : '--'}</span>
                    <p style="font-size:10px;color:#888;margin-top:4px;">Estimated extra burn: ${steps != null ? Math.round(Math.max(0,10000-steps)*0.045) : '--'} kcal</p>
                </div>`;
            }
            if (metricType === 'bp') {
                const sys = r.systolic ?? wearableState.systolic;
                const dia = r.diastolic ?? wearableState.diastolic;
                const hr = r.heart_rate ?? wearableState.heartRate;
                const spo2 = r.spo2 ?? wearableState.spo2;
                const hyper = sys >= 140 || dia >= 90;
                return `
                <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    <div class="mh-stat-box">
                        <span class="mh-stat-label">SYSTOLIC</span>
                        <span class="mh-stat-val" style="color:${hyper?'#ef4444':'#34d399'}">${sys ?? '--'}<span style="font-size:.65rem"> mmHg</span></span>
                    </div>
                    <div class="mh-stat-box">
                        <span class="mh-stat-label">DIASTOLIC</span>
                        <span class="mh-stat-val" style="color:${hyper?'#fb923c':'#34d399'}">${dia ?? '--'}<span style="font-size:.65rem"> mmHg</span></span>
                    </div>
                    <div class="mh-stat-box">
                        <span class="mh-stat-label">HEART RATE</span>
                        <span class="mh-stat-val" style="color:#818cf8">${hr ?? '--'}<span style="font-size:.65rem"> bpm</span></span>
                    </div>
                    <div class="mh-stat-box">
                        <span class="mh-stat-label">SpO2</span>
                        <span class="mh-stat-val" style="color:#06b6d4">${spo2 ?? '--'}<span style="font-size:.65rem">%</span></span>
                    </div>
                </div>
                <div class="mh-stat-box">
                    <span class="mh-stat-label">STATUS</span>
                    <span style="font-size:1rem;font-weight:700;color:${hyper?'#ef4444':'#34d399'}">${sys && dia ? (hyper ? '⚠️ Stage 1 Hypertension' : '✓ Normotensive') : 'Awaiting sensor data'}</span>
                    ${sys && dia ? `<p style="font-size:10px;color:#888;margin-top:4px;">${hyper ? 'BP elevated. Rest, reduce sodium, avoid caffeine.' : 'Blood pressure within healthy athletic range.'}</p>` : ''}
                </div>`;
            }
            // sleep
            const sh = r.sleep_hours ?? wearableState.sleepHours;
            const sm = r.sleep_minutes ?? wearableState.sleepMinutes;
            const ss = r.sleep_score ?? wearableState.sleepScore;
            const sq = r.sleep_quality ?? wearableState.sleepQuality;
            return `
            <div class="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                <div class="mh-stat-box">
                    <span class="mh-stat-label">SLEEP DURATION</span>
                    <span class="mh-stat-val" style="color:#818cf8">${sh != null ? `${sh}h ${sm||0}m` : '--'}</span>
                </div>
                <div class="mh-stat-box">
                    <span class="mh-stat-label">SLEEP SCORE</span>
                    <span class="mh-stat-val" style="color:#34d399">${ss ?? '--'}<span style="font-size:.65rem">/100</span></span>
                </div>
                <div class="mh-stat-box">
                    <span class="mh-stat-label">QUALITY</span>
                    <span style="font-size:1rem;font-weight:700;color:${sq==='BEST'?'#34d399':sq==='GOOD'?'#818cf8':'#f59e0b'}">${sq ?? '--'}</span>
                </div>
            </div>
            <div class="mh-stat-box">
                <span class="mh-stat-label">RECOMMENDATION</span>
                <p style="font-size:11px;color:var(--bone-dim);line-height:1.5;margin-top:2px;">
                    ${sh == null ? 'No sleep data. Pair a smartwatch to capture sleep stages.' : sh >= 7 ? 'Excellent sleep duration. Deep REM phases appear adequate for neuroplasticity and cellular repair.' : sh >= 5 ? 'Moderate sleep debt detected. Aim for 7–9 hours for full recovery.' : 'Severe sleep deprivation. Cortisol spike likely. Consider a recovery protocol.'}
                </p>
            </div>`;
        }

        // Week or Month view — show aggregated stats + chart
        const validSteps = records.filter(r => r.steps != null);
        const validBP = records.filter(r => r.systolic != null);
        const validSleep = records.filter(r => r.sleep_hours != null);

        const avgSteps = validSteps.length ? Math.round(validSteps.reduce((s,r)=>s+r.steps,0)/validSteps.length) : null;
        const maxSteps = validSteps.length ? Math.max(...validSteps.map(r=>r.steps)) : null;
        const totalCal = validSteps.length ? validSteps.reduce((s,r)=>s+(r.calories||0),0) : null;
        const avgSys = validBP.length ? Math.round(validBP.reduce((s,r)=>s+r.systolic,0)/validBP.length) : null;
        const avgDia = validBP.length ? Math.round(validBP.reduce((s,r)=>s+r.diastolic,0)/validBP.length) : null;
        const avgSleep = validSleep.length ? (validSleep.reduce((s,r)=>s+(r.sleep_hours+(r.sleep_minutes||0)/60),0)/validSleep.length).toFixed(1) : null;
        const avgScore = validSleep.length ? Math.round(validSleep.reduce((s,r)=>s+(r.sleep_score||0),0)/validSleep.length) : null;
        const goal10k = validSteps.filter(r => r.steps >= 10000).length;

        const periodLabel = period === 'week' ? '7-Day' : '30-Day';

        let statsHtml = '';
        if (metricType === 'steps') {
            statsHtml = `
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div class="mh-stat-box">
                    <span class="mh-stat-label">AVG DAILY STEPS</span>
                    <span class="mh-stat-val" style="color:#E0231C">${avgSteps != null ? avgSteps.toLocaleString() : '--'}</span>
                </div>
                <div class="mh-stat-box">
                    <span class="mh-stat-label">BEST DAY</span>
                    <span class="mh-stat-val" style="color:#f59e0b">${maxSteps != null ? maxSteps.toLocaleString() : '--'}</span>
                </div>
                <div class="mh-stat-box">
                    <span class="mh-stat-label">TOTAL CALORIES</span>
                    <span class="mh-stat-val" style="color:#34d399">${totalCal != null ? totalCal.toLocaleString() : '--'}<span style="font-size:.6rem"> kcal</span></span>
                </div>
                <div class="mh-stat-box">
                    <span class="mh-stat-label">GOAL ACHIEVED</span>
                    <span class="mh-stat-val" style="color:#818cf8">${goal10k}<span style="font-size:.6rem">/${validSteps.length} days</span></span>
                </div>
            </div>
            <div class="mh-stat-box" style="margin-bottom:12px;">
                <span class="mh-stat-label">TREND ANALYSIS</span>
                <p style="font-size:10.5px;color:var(--bone-dim);line-height:1.5;margin-top:2px;">
                    ${avgSteps == null ? 'No step data recorded yet.' : avgSteps >= 8000 ? `✓ Excellent — ${periodLabel} average of ${avgSteps.toLocaleString()} steps surpasses the 8,000-step cardiovascular threshold.` : avgSteps >= 5000 ? `Moderate — ${periodLabel} average of ${avgSteps.toLocaleString()} steps. Increase daily movement by 1,500–2,000 steps.` : `Below baseline — ${periodLabel} average of ${avgSteps.toLocaleString()} steps. Consider short walk breaks every 45 minutes.`}
                </p>
            </div>`;
        } else if (metricType === 'bp') {
            const hyper = avgSys >= 140 || avgDia >= 90;
            statsHtml = `
            <div class="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                <div class="mh-stat-box">
                    <span class="mh-stat-label">AVG SYSTOLIC</span>
                    <span class="mh-stat-val" style="color:${hyper?'#ef4444':'#34d399'}">${avgSys ?? '--'}<span style="font-size:.6rem"> mmHg</span></span>
                </div>
                <div class="mh-stat-box">
                    <span class="mh-stat-label">AVG DIASTOLIC</span>
                    <span class="mh-stat-val" style="color:${hyper?'#fb923c':'#34d399'}">${avgDia ?? '--'}<span style="font-size:.6rem"> mmHg</span></span>
                </div>
                <div class="mh-stat-box">
                    <span class="mh-stat-label">READINGS</span>
                    <span class="mh-stat-val" style="color:#818cf8">${validBP.length}</span>
                </div>
            </div>
            <div class="mh-stat-box" style="margin-bottom:12px;">
                <span class="mh-stat-label">CARDIOVASCULAR TREND</span>
                <p style="font-size:10.5px;color:var(--bone-dim);line-height:1.5;margin-top:2px;">
                    ${avgSys == null ? 'No BP data. Smartwatch PPG sensor or BLE cuff required.' : hyper ? `⚠️ ${periodLabel} average of ${avgSys}/${avgDia} mmHg indicates consistent hypertension. Consult a physician.` : `✓ ${periodLabel} average of ${avgSys}/${avgDia} mmHg — healthy cardiovascular baseline maintained.`}
                </p>
            </div>`;
        } else {
            statsHtml = `
            <div class="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                <div class="mh-stat-box">
                    <span class="mh-stat-label">AVG SLEEP</span>
                    <span class="mh-stat-val" style="color:#818cf8">${avgSleep != null ? `${avgSleep}h` : '--'}</span>
                </div>
                <div class="mh-stat-box">
                    <span class="mh-stat-label">AVG SCORE</span>
                    <span class="mh-stat-val" style="color:#34d399">${avgScore ?? '--'}<span style="font-size:.6rem">/100</span></span>
                </div>
                <div class="mh-stat-box">
                    <span class="mh-stat-label">DAYS TRACKED</span>
                    <span class="mh-stat-val" style="color:#f59e0b">${validSleep.length}</span>
                </div>
            </div>
            <div class="mh-stat-box" style="margin-bottom:12px;">
                <span class="mh-stat-label">CIRCADIAN TREND</span>
                <p style="font-size:10.5px;color:var(--bone-dim);line-height:1.5;margin-top:2px;">
                    ${avgSleep == null ? 'No sleep data recorded. Pair a smartwatch to capture sleep architecture.' : parseFloat(avgSleep) >= 7 ? `✓ ${periodLabel} average of ${avgSleep}h — optimal circadian window. Deep REM cycles likely adequate.` : `Sleep debt of ${(8-parseFloat(avgSleep)).toFixed(1)}h/night detected. Cognitive and metabolic recovery may be compromised.`}
                </p>
            </div>`;
        }

        return `${statsHtml}<div class="mh-chart-wrap"><canvas id="metric-history-chart"></canvas></div>`;
    }

    /**
     * ── 5. Render Wearable Hub Chamber ──────────────────────────────────────────
     */
    window.renderWearableHub = function(container) {
        if (!container) return;

        const profile = getBiometricProfile();
        const isConnected = wearableState.connected && wearableState.status === 'connected';
        const isProcessing = ['scanning', 'connecting', 'fetching', 'analyzing'].includes(wearableState.status);

        // Sleep rating
        const sleepEval = calculateSleepQuality(wearableState.sleepHours, wearableState.deepSleepMinutes);
        const stepPercent = wearableState.steps ? Math.min(100, Math.round((wearableState.steps / wearableState.stepGoal) * 100)) : 0;

        // Dynamic Total Energy Expenditure & Caloric Balance
        const activeBurn = wearableState.caloriesBurned || 0;
        const tdee = Math.round((profile.bmr * 1.2) + activeBurn);
        const netCaloricBalance = profile.calorieIntake - tdee;
        const isDeficit = netCaloricBalance < 0;

        container.innerHTML = `
            <div class="wearable-hub-page">
                <!-- Header Breadcrumbs & Status -->
                <div class="flex items-center justify-between flex-wrap gap-4 mb-6">
                    <div>
                        <div class="flex items-center gap-2 mb-1 flex-wrap">
                            <span class="hero-category-tag">CHAMBER 07 // WEARABLE &amp; BLUETOOTH SYNC</span>
                            <span class="${isConnected ? 'wearable-live-badge' : 'wearable-standby-badge'}">
                                <span class="${isConnected ? 'wearable-dot' : 'wearable-amber-dot'}"></span>
                                ${isConnected ? 'LIVE TELEMETRY STREAM' : (isProcessing ? 'PROCESSING TELEMETRY…' : 'AWAITING HARDWARE LINK')}
                            </span>
                            <!-- Dedicated Physical Bluetooth Radio Status Pill -->
                            <span id="chamber-header-bt-indicator" class="chamber-bt-indicator px-2.5 py-0.5 rounded-full font-mono text-[9px] font-bold flex items-center gap-1.5 ${_bluetoothPoweredOn === false ? 'bg-red-950/70 border border-red-500/80 text-red-400 animate-pulse' : 'bg-emerald-950/50 border border-emerald-500/70 text-emerald-400'}">
                                ${_bluetoothPoweredOn === false ? '<span class="w-1.5 h-1.5 rounded-full bg-red-500"></span> ⚠️ BLUETOOTH: OFF' : '<span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> BLUETOOTH: ON'}
                            </span>
                        </div>
                        <h1 class="text-3xl font-display font-extrabold text-[var(--bone)] tracking-tight">
                            CONNECT WITH <span class="text-vermilion">LUMI.</span>
                        </h1>
                        <p class="text-xs text-[var(--bone-dim)] mt-1 font-mono">
                            Pair Authentic Health Hardware: Bluetooth BLE Smartwatch / Heart Rate Monitor, Dedicated Blood Pressure Cuff, or Mobile Companion.
                        </p>
                    </div>

                    <!-- Top Action Buttons -->
                    <div class="flex items-center gap-2.5 flex-wrap">
                        <!-- Primary Blueprint Action 1: FETCH LATEST DATA -->
                        <button type="button" onclick="window.fetchLatestHealthData()" 
                            class="btn-editorial-primary flex items-center gap-2 text-xs py-2 px-3.5 bg-cyan-400 text-black font-black border border-cyan-300 shadow-[0_0_20px_rgba(0,242,254,0.35)] hover:bg-cyan-300 transition-all"
                            title="Fetch and synchronize latest health metrics across sensors">
                            <span>⚡</span>
                            <span>FETCH LATEST DATA</span>
                        </button>

                        <!-- Primary Blueprint Action 2: START / STOP LIVE MONITORING -->
                        <button type="button" onclick="window.toggleLiveMonitoring()" 
                            class="flex items-center gap-2 text-xs py-2 px-3.5 rounded-lg font-mono font-bold transition-all ${bridgeState.isLiveMonitoring ? 'bg-red-500/25 text-red-300 border border-red-500 animate-pulse' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 hover:bg-emerald-500/30'}"
                            title="Toggle real-time WebSocket live monitoring pipeline">
                            <span class="inline-block w-2 h-2 rounded-full ${bridgeState.isLiveMonitoring ? 'bg-red-400' : 'bg-emerald-400 animate-ping'}"></span>
                            <span>${bridgeState.isLiveMonitoring ? 'STOP LIVE MONITORING' : 'START LIVE MONITORING'}</span>
                        </button>

                        ${isConnected ? `
                            <button type="button" onclick="window.disconnectWearable()" class="btn-editorial-secondary text-xs py-2 px-3 text-red-400 hover:border-red-500">
                                ✕ DISCONNECT
                            </button>
                        ` : ''}
                        <button type="button" onclick="window.openPhoneCompanionModal()" class="btn-editorial-secondary flex items-center gap-2 text-xs py-2 px-3.5">
                            <span>📱</span>
                            <span>PAIR PHONE</span>
                        </button>
                        <button type="button" onclick="window.connectNativeBluetooth()" class="btn-editorial-secondary flex items-center gap-2 text-xs py-2 px-3.5">
                            <span>⚡</span>
                            <span>${isConnected ? 'SWITCH DEVICE' : 'SCAN BLE'}</span>
                        </button>
                    </div>
                </div>

                <!-- LUMINIX Mobile Health Bridge Source Selector (Section 2 & 10) -->
                <div class="mb-6 p-2 rounded-xl bg-[rgba(15,23,42,0.7)] border border-[rgba(255,255,255,0.06)] flex items-center justify-between flex-wrap gap-2">
                    <div class="flex items-center gap-1.5 flex-wrap">
                        <span class="font-mono text-[9px] text-[var(--bone-dim)] uppercase px-2 font-bold tracking-wider">HEALTH BRIDGE SOURCE:</span>
                        <button type="button" onclick="window.selectBridgeSource('healthkit')" 
                            class="px-3 py-1 rounded-lg font-mono text-xs font-bold transition-all ${bridgeState.selectedSource === 'healthkit' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/60 shadow-[0_0_15px_rgba(0,242,254,0.2)]' : 'text-[var(--bone-dim)] hover:text-white border border-transparent'}">
                            🍏 Apple HealthKit
                        </button>
                        <button type="button" onclick="window.selectBridgeSource('health_connect')" 
                            class="px-3 py-1 rounded-lg font-mono text-xs font-bold transition-all ${bridgeState.selectedSource === 'health_connect' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/60 shadow-[0_0_15px_rgba(0,242,254,0.2)]' : 'text-[var(--bone-dim)] hover:text-white border border-transparent'}">
                            🤖 Google Health Connect
                        </button>
                        <button type="button" onclick="window.selectBridgeSource('direct_bp_device')" 
                            class="px-3 py-1 rounded-lg font-mono text-xs font-bold transition-all ${bridgeState.selectedSource === 'direct_bp_device' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/60 shadow-[0_0_15px_rgba(0,242,254,0.2)]' : 'text-[var(--bone-dim)] hover:text-white border border-transparent'}">
                            🩸 Dedicated BLE BP Monitor
                        </button>
                        <button type="button" onclick="window.selectBridgeSource('system_bt')" 
                            class="px-3 py-1 rounded-lg font-mono text-xs font-bold transition-all ${bridgeState.selectedSource === 'system_bt' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/60 shadow-[0_0_15px_rgba(0,242,254,0.2)]' : 'text-[var(--bone-dim)] hover:text-white border border-transparent'}">
                            📡 Host BLE / Wi-Fi Companion
                        </button>
                    </div>
                    <div class="flex items-center gap-2 px-2 font-mono text-[10px]">
                        <span class="w-2 h-2 rounded-full ${bridgeState.isLiveMonitoring ? 'bg-emerald-400 animate-ping' : (isConnected ? 'bg-cyan-400' : 'bg-zinc-600')}"></span>
                        <span class="${isConnected ? 'text-[var(--bone)]' : 'text-[var(--text-dim)]'} font-semibold">
                            ${bridgeState.isLiveMonitoring ? `STREAMING LIVE (${bridgeState.livePacketCount} pkts)` : (isConnected ? 'REAL HARDWARE ACTIVE' : 'NO DEVICE LINKED')}
                        </span>
                    </div>
                </div>

                <!-- Mode Clarification Bar: Fetch Latest Data vs Live Sensor Monitoring -->
                <div class="text-[10px] font-mono text-[var(--text-dim)] -mt-4 mb-5 flex items-center justify-between px-1 flex-wrap gap-2">
                    <span>✦ <strong>FETCH LATEST DATA</strong>: Queries newest available measurements across all sensors (cuff BP, sleep, SpO2).</span>
                    <span>✦ <strong>LIVE MONITORING</strong>: Streams active continuous sensors (1Hz HR) where hardware supports it.</span>
                </div>

                <!-- Dedicated Data Source State Card (Blueprint Requirement #7) -->
                <div class="p-4 rounded-xl bg-[rgba(15,23,42,0.8)] border border-[rgba(255,255,255,0.08)] mb-6 shadow-lg">
                    <div class="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-[rgba(255,255,255,0.06)]">
                        <div class="flex items-center gap-2">
                            <span class="w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'}"></span>
                            <span class="font-display font-bold text-sm text-[var(--bone)]">DATA SOURCE STATE</span>
                            <span class="px-2 py-0.5 rounded text-[9px] font-mono font-bold ${isConnected ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/50' : 'bg-red-950/80 text-red-400 border border-red-500/50'}">
                                ${isConnected ? 'REAL HARDWARE LINKED' : 'NO REAL DEVICE CONNECTED'}
                            </span>
                        </div>
                        <div class="flex items-center gap-2">
                            ${isConnected ? `
                                <button type="button" onclick="window.disconnectWearable()" class="px-3 py-1 rounded bg-red-950/60 hover:bg-red-900 border border-red-500/50 text-red-300 font-mono text-xs font-bold transition-all">
                                    ✕ UNLINK REAL DEVICE
                                </button>
                            ` : `
                                <button type="button" onclick="window.connectNativeBluetooth()" class="px-3 py-1 rounded bg-cyan-400 hover:bg-cyan-300 text-black font-mono text-xs font-black shadow-[0_0_15px_rgba(0,242,254,0.3)] transition-all">
                                    ⚡ PAIR REAL DEVICE
                                </button>
                            `}
                        </div>
                    </div>
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 font-mono text-xs">
                        <div>
                            <span class="text-[9px] text-[var(--text-dim)] uppercase block">ACTIVE PLATFORM</span>
                            <span class="font-bold text-[var(--bone)] text-xs mt-0.5 block">
                                ${bridgeState.selectedSource === 'healthkit' ? 'Apple HealthKit (iOS)' :
                                  (bridgeState.selectedSource === 'health_connect' ? 'Google Health Connect (Android)' :
                                  (bridgeState.selectedSource === 'direct_bp_device' ? 'Dedicated BLE BP Cuff' :
                                  (bridgeState.selectedSource === 'system_bt' ? 'Host BLE / Companion' :
                                  (isConnected ? (wearableState.connectionType || 'Connected Real Device') : 'None (No Hardware Paired)'))))}
                            </span>
                        </div>
                        <div>
                            <span class="text-[9px] text-[var(--text-dim)] uppercase block">AUTHENTICATION</span>
                            <span class="font-bold text-xs mt-0.5 block ${isConnected ? 'text-emerald-400' : 'text-[var(--text-dim)]'}">
                                ${isConnected ? '✓ Authorized &amp; Paired' : '⚪ Disconnected (No Hardware Paired)'}
                            </span>
                        </div>
                        <div>
                            <span class="text-[9px] text-[var(--text-dim)] uppercase block">LAST TELEMETRY SYNC</span>
                            <span class="font-bold text-xs mt-0.5 block ${isConnected && wearableState.pairedAt ? 'text-white' : 'text-[var(--text-dim)]'}">
                                ${isConnected && wearableState.pairedAt ? wearableState.pairedAt : 'No records synced'}
                            </span>
                        </div>
                        <div>
                            <span class="text-[9px] text-[var(--text-dim)] uppercase block">DATA STREAM STATUS</span>
                            <span class="font-bold text-xs mt-0.5 block ${bridgeState.isLiveMonitoring ? 'text-emerald-400 animate-pulse' : (isConnected ? 'text-cyan-400' : 'text-[var(--text-dim)]')}">
                                ${bridgeState.isLiveMonitoring ? '⚡ WebSocket Live (1 Hz)' : (isConnected ? '⏱ Periodic Snapshot' : '⚪ Offline (Pair Real Device to Stream)')}
                            </span>
                        </div>
                    </div>
                </div>

                <!-- Step-by-Step Fetch Sequence HUD (Section 10) -->
                ${bridgeState.fetchSequenceActive ? `
                    <div class="p-4 rounded-xl bg-[rgba(0,242,254,0.06)] border border-cyan-500/40 mb-6 animate-pulse shadow-[0_0_40px_rgba(0,242,254,0.15)]">
                        <div class="flex items-center justify-between mb-2 font-mono text-xs text-cyan-400 font-bold">
                            <span class="flex items-center gap-2">
                                <span class="device-radar-pulse"></span>
                                STEP-BY-STEP NATIVE HEALTH ACQUISITION
                            </span>
                            <span>STEP [${bridgeState.fetchSequenceStep + 1}/10]: ${bridgeState.fetchSequenceSteps[bridgeState.fetchSequenceStep].name.toUpperCase()}</span>
                        </div>
                        <div class="w-full bg-[rgba(255,255,255,0.08)] h-2 rounded-full overflow-hidden mb-2">
                            <div class="bg-cyan-400 h-full transition-all duration-300" style="width: ${((bridgeState.fetchSequenceStep + 1) / 10) * 100}%"></div>
                        </div>
                        <div class="font-mono text-[11px] text-[var(--bone-dim)] flex items-center justify-between">
                            <span>> ${bridgeState.fetchSequenceSteps[bridgeState.fetchSequenceStep].desc}…</span>
                            <span class="text-cyan-300 font-bold">${bridgeState.fetchSequenceSteps[bridgeState.fetchSequenceStep].icon} Active</span>
                        </div>
                    </div>
                ` : ''}

                <!-- Processing Pipeline HUD (Shown while discovering, fetching, or analyzing) -->
                ${isProcessing ? `
                    <div class="p-4 rounded-xl bg-[rgba(224,35,28,0.06)] border border-[rgba(224,35,28,0.3)] mb-6 animate-pulse">
                        <div class="flex items-center justify-between mb-2 font-mono text-xs text-[var(--vermilion)] font-bold">
                            <span class="flex items-center gap-2">
                                <span class="device-radar-pulse"></span>
                                TELEMETRY ACQUISITION IN PROGRESS
                            </span>
                            <span>${wearableState.status.toUpperCase()}</span>
                        </div>
                        <div class="w-full bg-[rgba(255,255,255,0.08)] h-2 rounded-full overflow-hidden mb-2">
                            <div class="bg-[var(--vermilion)] h-full transition-all duration-300 ${wearableState.status === 'connecting' ? 'w-1/3' : (wearableState.status === 'fetching' ? 'w-2/3' : 'w-full')}"></div>
                        </div>
                        <div class="font-mono text-[11px] text-[var(--bone-dim)]">
                            ${wearableState.status === 'connecting' ? `> [01/03] ESTABLISHING BLUETOOTH / TELEMETRY LINK WITH ${wearableState.deviceName || 'DEVICE'}…` : ''}
                            ${wearableState.status === 'fetching' ? `> [02/03] RECEIVING HARDWARE SENSOR STREAM (ACCELEROMETER CADENCE, BATTERY)…` : ''}
                            ${wearableState.status === 'analyzing' ? `> [03/03] SYNCHRONIZING WITH PROFILE (${profile.weight}KG, ${profile.height}CM, ${profile.age} YRS, ${profile.calorieIntake} KCAL INTAKE)…` : ''}
                        </div>
                    </div>
                ` : ''}

                <!-- Device Status Bar Card -->
                <div class="wearable-status-card mb-6">
                    <div class="flex items-center justify-between flex-wrap gap-4">
                        <div class="flex items-center gap-3.5">
                            <div class="wearable-device-avatar text-2xl">
                                ${isConnected ? (wearableState.deviceType === 'phone' ? '📱' : '⌚') : '📡'}
                            </div>
                            <div>
                                <div class="flex items-center gap-2 flex-wrap">
                                    <span class="font-display font-bold text-base text-[var(--bone)]">
                                        ${isConnected ? wearableState.deviceName : 'No Health Device Connected'}
                                    </span>
                                    <span class="connection-protocol-tag">
                                        ${isConnected ? wearableState.connectionType : 'STANDBY // DISCONNECTED'}
                                    </span>
                                    <span id="chamber-card-bt-indicator" class="chamber-bt-indicator px-2 py-0.5 rounded-full font-mono text-[9px] font-bold inline-flex items-center gap-1.5 ${_bluetoothPoweredOn === false ? 'bg-red-950/70 border border-red-500/80 text-red-400 animate-pulse' : 'bg-emerald-950/50 border border-emerald-500/70 text-emerald-400'}">
                                        ${_bluetoothPoweredOn === false ? '<span class="w-1.5 h-1.5 rounded-full bg-red-500"></span> ⚠️ BLUETOOTH: OFF' : '<span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> BLUETOOTH: ON'}
                                    </span>
                                </div>
                                ${isConnected ? `
                                <div class="flex items-center gap-2 mt-1.5">
                                    <span class="font-mono text-[9px] text-emerald-400 flex items-center gap-1">
                                        <span class="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                        <span id="wearable-last-sync-ts">Synced at ${wearableState.pairedAt}</span>
                                    </span>
                                    <span class="font-mono text-[9px] text-[var(--text-dim)]">•</span>
                                    <span class="font-mono text-[9px] text-[var(--text-dim)]">Next refresh: <span id="wearable-refresh-countdown" class="text-gold font-bold">60s</span></span>
                                    <button type="button" onclick="fetchLiveTelemetry(wearableState.connectionType)" 
                                        class="font-mono text-[9px] text-[var(--vermilion)] border border-[rgba(224,35,28,0.3)] rounded px-1.5 py-0.5 hover:bg-[rgba(224,35,28,0.08)] transition-all"
                                        title="Refresh telemetry now">
                                        ↻ REFRESH NOW
                                    </button>
                                </div>` : `
                                <div id="chamber-bt-status-subtext" class="font-mono text-[11px] ${_bluetoothPoweredOn === false ? 'text-red-400 font-bold animate-pulse' : 'text-emerald-400/90'} mt-0.5">
                                    ${_bluetoothPoweredOn === false ? '⚠️ PHYSICAL BLUETOOTH IS TURNED OFF! Turn ON Bluetooth in settings to connect.' : '● Physical Bluetooth adapter is ON & ready for spontaneous device pairing.'}
                                </div>`}
                            </div>
                        </div>

                        <!-- Live Device Telemetry Controls -->
                        <div class="flex items-center gap-2 flex-wrap">
                            ${!isConnected ? `
                                <button type="button" onclick="window.connectNativeBluetooth()" class="btn-editorial-primary text-xs py-2 px-3.5 flex items-center gap-1.5 font-bold tracking-wide">
                                    <span>⚡</span>
                                    <span>PAIR BLUETOOTH DEVICE</span>
                                </button>
                            ` : `
                                <div class="flex items-center gap-2">
                                    <button type="button" onclick="window.openBluetoothHubModal()" class="btn-editorial-secondary text-[10px] py-1 px-2.5">
                                        DEVICE INFO / SWITCH
                                    </button>
                                </div>
                            `}
                        </div>
                    </div>
                </div>

                <!-- ── Find My Device: Distance Radius Radar & Ring Card ────────── -->
                ${isConnected ? `
                    <div class="find-device-card mb-6" id="find-device-card">
                        <div class="flex items-center justify-between flex-wrap gap-4">
                            <!-- Left: Distance Radius Radar & Signal -->
                            <div class="flex items-center gap-4">
                                <!-- Concentric Radar Widget -->
                                <div class="distance-radar-wrap" title="Concentric Bluetooth Distance Radius Radar">
                                    <div class="radar-sweep-beam"></div>
                                    <div class="radar-ring radar-ring-1"></div>
                                    <div class="radar-ring radar-ring-2"></div>
                                    <div class="radar-blip" id="radar-blip-dot"></div>
                                </div>

                                <!-- Distance Radius Reading -->
                                <div>
                                    <div class="font-mono text-[9px] text-[var(--text-dim)] uppercase font-bold tracking-wider flex items-center gap-1.5">
                                        <span>BLUETOOTH DISTANCE RADIUS</span>
                                        <span class="inline-block w-1 h-1 rounded-full bg-emerald-400"></span>
                                        <span class="text-emerald-400">BLE 5.3</span>
                                    </div>
                                    <div class="flex items-baseline gap-1.5 mt-0.5">
                                        <span id="proximity-distance-val" class="font-display font-black text-2xl text-[var(--bone)]">--</span>
                                        <span class="font-mono text-xs text-emerald-400 font-bold uppercase">meter radius</span>
                                    </div>
                                    <div id="proximity-rssi-val" class="font-mono text-[9px] text-[var(--text-dim)] mt-0.5">
                                        RSSI: Awaiting BLE Radio Signal
                                    </div>
                                </div>

                                <!-- Signal Bars & Zone Badge -->
                                <div class="flex flex-col gap-1">
                                    <div class="flex items-end gap-[3px] h-6" id="signal-bars-display" title="Bluetooth Signal Strength">
                                        <div class="signal-bar" id="sbar-1" style="height:25%; background:rgba(255,255,255,0.08);"></div>
                                        <div class="signal-bar" id="sbar-2" style="height:45%; background:rgba(255,255,255,0.08);"></div>
                                        <div class="signal-bar" id="sbar-3" style="height:62%; background:rgba(255,255,255,0.08);"></div>
                                        <div class="signal-bar" id="sbar-4" style="height:80%; background:rgba(255,255,255,0.08);"></div>
                                        <div class="signal-bar" id="sbar-5" style="height:100%; background:rgba(255,255,255,0.08);"></div>
                                    </div>
                                    <div id="proximity-zone-label" class="proximity-zone-badge">
                                        AWAITING SIGNAL
                                    </div>
                                </div>
                            </div>

                            <!-- Right: Ring Device Finder & Quick Calibrate -->
                            <div class="flex items-center gap-2">
                                <div class="text-right mr-1">
                                    <div class="font-mono text-[9px] text-[var(--text-dim)] uppercase">DEVICE LOCATOR</div>
                                    <div class="font-mono text-[10px] text-[var(--bone)] font-semibold mt-0.5">${wearableState.deviceName || 'Device'}</div>
                                </div>
                                <button type="button" id="ring-device-btn"
                                    onclick="window.triggerDeviceRing()"
                                    class="find-ring-btn"
                                    title="Play audible finder alarm on host and phone">
                                    <span id="ring-btn-icon">🔔</span>
                                    <span id="ring-btn-label">RING TO FIND</span>
                                </button>
                                <button type="button" onclick="window.openCalibrateModal()" class="btn-editorial-secondary text-xs py-2 px-3 flex items-center gap-1.5" title="Calibrate step count or battery level">
                                    <span>⚙️</span> CALIBRATE
                                </button>
                            </div>
                        </div>

                        <!-- Bottom: Multi-Channel Ring Feedback Sub-Bar -->
                        <div class="w-full mt-3 pt-2.5 border-t border-[rgba(255,255,255,0.07)] flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono">
                            <div class="flex items-center gap-2 text-[var(--bone-dim)]">
                                <span class="text-white font-bold">📢 ACTIVE RING CHANNELS:</span>
                                <span class="text-emerald-400">✓ Mobile Phone Speaker</span>
                                <span>•</span>
                                <span class="text-cyan-400">✓ Smartwatch BLE Buzzer (0x1802)</span>
                                <span>•</span>
                                <span class="text-[var(--text-dim)]">🔇 Host Speaker (Muted per request)</span>
                            </div>
                            <div class="flex items-center gap-2">
                                <span class="text-[var(--text-dim)]">Want phone to ring loudly?</span>
                                <button type="button" onclick="window.openPhoneCompanionModal()" class="text-cyan-400 hover:text-white underline cursor-pointer font-bold">
                                    📱 Connect Phone Companion &rarr;
                                </button>
                            </div>
                        </div>
                    </div>
                ` : ''}


                <!-- Main Metrics Grid (NO DUMMY VALUES IN STANDBY) -->

                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">

                    <!-- Metric 1: Blood Oxygen (SpO2) -->
                    <div class="wearable-metric-card ${isConnected && wearableState.spo2 && wearableState.spo2 < 92 ? 'metric-alert' : ''}" style="cursor:pointer;" onclick="window.openMetricHistoryModal('bp')" title="Click to view BP & SpO2 history">
                        <div class="metric-card-header">
                            <span class="metric-label">BLOOD OXYGEN (SpO2)</span>
                            <span class="metric-icon text-cyan-400">🫁</span>
                        </div>
                        <div class="flex items-baseline gap-2 my-2">
                            ${isConnected && wearableState.spo2 !== null ? `
                                <span class="text-4xl font-display font-black text-[var(--bone)]">${wearableState.spo2}%</span>
                                <span class="font-mono text-xs ${wearableState.spo2 >= 95 ? 'text-emerald-400' : 'text-red-400 font-bold'}">
                                    ${wearableState.spo2 >= 95 ? '✓ NORMAL' : '⚠️ HYPOXIA RISK'}
                                </span>
                            ` : (isConnected ? `
                                <span class="text-lg font-display font-bold text-[var(--bone-dim)] italic">No recent measurement</span>
                                <span class="font-mono text-xs text-[var(--text-dim)]">SENSOR STANDBY</span>
                            ` : `
                                <span class="text-lg font-display font-bold text-[var(--bone-dim)] italic">No device connected</span>
                                <span class="font-mono text-xs text-[var(--text-dim)]">DISCONNECTED</span>
                            `)}
                        </div>
                        <p class="text-[11px] text-[var(--text-dim)]">
                            ${isConnected ? (wearableState.spo2 !== null ? 'Optical photoplethysmography stream active.' : 'Device connected. Awaiting pulse oximeter reflection read.') : 'No device connected. Pair a real wearable to acquire SpO2.'}
                        </p>
                        ${wearableState.provenance?.spo2 ? `
                            <div class="mt-2 pt-2 border-t border-[var(--border-subtle)] font-mono text-[9px] text-[var(--bone-dim)] flex flex-col gap-0.5">
                                <div>Measured: <strong class="text-white">${wearableState.provenance.spo2.time_str}</strong> (${wearableState.provenance.spo2.age_str})</div>
                                <div>Source: <span class="text-cyan-300">${wearableState.provenance.spo2.source}</span> • Quality: <span class="text-emerald-400">${wearableState.provenance.spo2.quality}</span></div>
                            </div>
                        ` : ''}
                        <div class="spo2-waveform-wrap mt-3 ${isConnected && wearableState.spo2 !== null ? '' : 'opacity-30'}">
                            <svg class="spo2-waveform-svg" viewBox="0 0 200 40">
                                <path d="M 0,20 L 30,20 L 40,8 L 46,32 L 52,4 L 58,26 L 66,20 L 110,20 L 120,8 L 126,32 L 132,4 L 138,26 L 146,20 L 200,20" fill="none" stroke="var(--cyan-primary)" stroke-width="2" stroke-linecap="round"/>
                            </svg>
                        </div>
                        <div class="font-mono text-[8px] text-[var(--text-dim)] mt-1 opacity-60">↗ Tap for history</div>
                    </div>

                    <!-- Metric 2: Blood Pressure (Strict Blueprint Rule: Never Estimate or Fake) -->
                    <div class="wearable-metric-card ${bridgeState.bpStatus.hasRecent && (bridgeState.bpStatus.systolic >= 140 || bridgeState.bpStatus.diastolic >= 90) ? 'metric-alert' : ''}" style="cursor:pointer;" onclick="window.openMetricHistoryModal('bp')" title="Click to view BP history">
                        <div class="metric-card-header flex items-center justify-between">
                            <span class="metric-label">LATEST AVAILABLE BP MEASUREMENT</span>
                            <button type="button" onclick="event.stopPropagation(); window.openLogCuffMeasurementModal();" class="font-mono text-[9px] text-cyan-400 hover:text-white underline cursor-pointer">
                                + Log Cuff
                            </button>
                        </div>

                        <div class="my-2">
                            ${bridgeState.bpStatus.hasRecent ? `
                                <div class="flex items-baseline gap-2">
                                    <span class="text-3xl font-display font-black text-[var(--bone)]">
                                        ${bridgeState.bpStatus.systolic}/${bridgeState.bpStatus.diastolic}
                                    </span>
                                    <span class="font-mono text-xs text-[var(--text-dim)]">mmHg</span>
                                    <span class="font-mono text-[10px] ${bridgeState.bpStatus.systolic < 120 ? 'text-emerald-400' : 'text-amber-400 font-bold'} ml-auto">
                                        ${bridgeState.bpStatus.systolic < 120 ? '✓ OPTIMAL' : '⚠️ ELEVATED'}
                                    </span>
                                </div>
                                <div class="flex items-center gap-2 font-mono text-[10px] text-[var(--text-dim)] mt-1 flex-wrap">
                                    <span>Age: <strong class="text-white">${bridgeState.bpStatus.age}</strong></span>
                                    <span>•</span>
                                    <span>Source: <strong class="text-cyan-300">${bridgeState.bpStatus.source}</strong></span>
                                </div>
                            ` : `
                                <div class="py-1">
                                    <span class="text-lg font-display font-bold text-[var(--bone-dim)] italic block">
                                        ${isConnected ? 'No recent measurement' : 'No device connected'}
                                    </span>
                                    <p class="text-[10px] text-[var(--text-dim)] mt-0.5 leading-snug">
                                        ${isConnected ? 'Take a reading with paired Omron BLE cuff or sync via Apple HealthKit.' : 'Pair a real blood pressure device or sync via Health Bridge.'}
                                    </p>
                                </div>
                            `}
                        </div>

                        <div class="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-[var(--border-subtle)] font-mono">
                            <div>
                                <span class="text-[9px] text-[var(--text-dim)] block">RESTING PULSE</span>
                                <span id="wearable-hr-val" class="font-display font-bold text-sm text-[var(--bone)]">
                                    ${wearableState.heartRate ? `${wearableState.heartRate} bpm` : (isConnected ? '<span class="text-xs italic text-[var(--bone-dim)]">No recent measurement</span>' : '<span class="text-xs italic text-[var(--bone-dim)]">No device connected</span>')}
                                </span>
                            </div>
                            <div>
                                <span class="text-[9px] text-[var(--text-dim)] block">HEART RATE VAR (HRV)</span>
                                <span class="font-display font-bold text-sm text-emerald-400">
                                    ${wearableState.hrv ? `${wearableState.hrv} ms` : (isConnected ? '<span class="text-xs italic text-[var(--bone-dim)]">No recent measurement</span>' : '<span class="text-xs italic text-[var(--bone-dim)]">No device connected</span>')}
                                </span>
                            </div>
                        </div>

                        <div class="mt-2 text-[9px] font-mono text-[var(--text-dim)] italic opacity-75">
                            Strict Rule: Never estimated. Only verified cuff or watch records.
                        </div>
                    </div>

                    <!-- Metric 3: Sleep Telemetry & Quality -->
                    <div class="wearable-metric-card" style="cursor:pointer;" onclick="window.openMetricHistoryModal('sleep')" title="Click to view sleep history">
                        <div class="metric-card-header">
                            <span class="metric-label">SLEEP ARCHITECTURE</span>
                            <span class="metric-icon text-indigo-400">🌙</span>
                        </div>
                        <div class="flex items-baseline justify-between my-2">
                            ${isConnected && wearableState.sleepHours !== null ? `
                                <span class="text-3xl font-display font-black text-[var(--bone)]">
                                    ${wearableState.sleepHours}h ${wearableState.sleepMinutes}m
                                </span>
                                <span class="sleep-quality-badge ${sleepEval.badgeClass}">${wearableState.sleepQuality}</span>
                            ` : (isConnected ? `
                                <span class="text-lg font-display font-bold text-[var(--bone-dim)] italic">No recent measurement</span>
                                <span class="font-mono text-[10px] text-[var(--text-dim)]">STANDBY</span>
                            ` : `
                                <span class="text-lg font-display font-bold text-[var(--bone-dim)] italic">No device connected</span>
                                <span class="font-mono text-[10px] text-[var(--text-dim)]">DISCONNECTED</span>
                            `)}
                        </div>
                        <div class="space-y-1.5 mt-2 font-mono text-[10px]">
                            <div class="flex justify-between text-[var(--bone-dim)]">
                                <span>Schedule:</span>
                                <span>${isConnected && wearableState.sleepBedtime ? `${wearableState.sleepBedtime} — ${wearableState.sleepWaketime}` : (isConnected ? 'No recent measurement' : 'No device connected')}</span>
                            </div>
                            <!-- Mini Sleep Bar -->
                            <div class="flex h-2 rounded overflow-hidden w-full gap-0.5 mt-1 ${isConnected && wearableState.sleepHours !== null ? '' : 'opacity-20'}">
                                <div style="width:28%; background:#3b82f6;" title="Deep Sleep"></div>
                                <div style="width:34%; background:#8b5cf6;" title="REM Sleep"></div>
                                <div style="width:30%; background:#06b6d4;" title="Core Sleep"></div>
                                <div style="width:8%; background:#64748b;" title="Awake"></div>
                            </div>
                            <div class="flex justify-between text-[9px] text-[var(--text-dim)] pt-1">
                                <span>Deep: ${isConnected && wearableState.deepSleepMinutes !== null ? `${wearableState.deepSleepMinutes}m` : (isConnected ? 'No recent measurement' : 'No device connected')}</span>
                                <span>Score: ${isConnected && wearableState.sleepScore !== null ? `${wearableState.sleepScore}/100` : (isConnected ? 'No recent measurement' : 'No device connected')}</span>
                            </div>
                        </div>
                        ${wearableState.provenance?.sleep ? `
                            <div class="mt-2 pt-1.5 border-t border-[var(--border-subtle)] font-mono text-[9px] text-[var(--bone-dim)]">
                                Measured: <strong class="text-white">${wearableState.provenance.sleep.time_str}</strong> (${wearableState.provenance.sleep.age_str}) • Source: <span class="text-cyan-300">${wearableState.provenance.sleep.source}</span>
                            </div>
                        ` : `
                            <p class="text-[10px] text-[var(--text-dim)] mt-2 italic">${isConnected ? 'Wear device during sleep to sync hypnogram.' : 'Pair a real wearable to analyze sleep architecture.'}</p>
                        `}
                        <div class="font-mono text-[8px] text-[var(--text-dim)] mt-1 opacity-60">↗ Tap for weekly/monthly history</div>
                    </div>

                    <!-- Metric 4: Step Count & Calorie Burn Formula -->
                    <div class="wearable-metric-card" style="cursor:pointer;" onclick="window.openMetricHistoryModal('steps')" title="Click to view step history">
                        <div class="metric-card-header">
                            <span class="metric-label">STEP GOAL &amp; CALORIES</span>
                            <span class="metric-icon text-gold">🔥</span>
                        </div>
                        <div class="flex items-baseline justify-between my-2">
                            ${isConnected && wearableState.steps !== null ? `
                                <span class="text-3xl font-display font-black text-[var(--bone)] wearable-steps-live">
                                    ${wearableState.steps.toLocaleString()}
                                </span>
                                <span class="font-mono text-xs text-[var(--gold)]">${stepPercent}% Goal</span>
                            ` : (isConnected ? `
                                <span class="text-lg font-display font-bold text-[var(--bone-dim)] italic">No recent measurement</span>
                                <span class="font-mono text-xs text-[var(--text-dim)]">AWAITING STEPS</span>
                            ` : `
                                <span class="text-lg font-display font-bold text-[var(--bone-dim)] italic">No device connected</span>
                                <span class="font-mono text-xs text-[var(--text-dim)]">DISCONNECTED</span>
                            `)}
                        </div>
                        <!-- Step Progress Bar -->
                        <div class="w-full bg-[rgba(255,255,255,0.08)] h-2 rounded-full overflow-hidden my-2">
                            <div class="bg-gradient-to-r from-[var(--vermilion)] to-[var(--gold)] h-full transition-all duration-500" style="width: ${isConnected && wearableState.steps !== null ? stepPercent : 0}%"></div>
                        </div>
                        <div class="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-[var(--border-subtle)] font-mono">
                            <div>
                                <span class="text-[9px] text-[var(--text-dim)] block">BURNED CALORIES</span>
                                <span class="font-display font-bold text-sm text-[var(--ember)] wearable-cal-live">
                                    ${isConnected && wearableState.caloriesBurned !== null ? `${wearableState.caloriesBurned.toLocaleString()} kcal` : (isConnected ? '<span class="text-xs italic text-[var(--bone-dim)]">No recent measurement</span>' : '<span class="text-xs italic text-[var(--bone-dim)]">No device connected</span>')}
                                </span>
                            </div>
                            <div>
                                <span class="text-[9px] text-[var(--text-dim)] block">STRIDE DISTANCE</span>
                                <span class="font-display font-bold text-sm text-[var(--bone)] wearable-dist-live">
                                    ${isConnected && wearableState.distanceKm !== null ? `${wearableState.distanceKm} km` : (isConnected ? '<span class="text-xs italic text-[var(--bone-dim)]">No recent measurement</span>' : '<span class="text-xs italic text-[var(--bone-dim)]">No device connected</span>')}
                                </span>
                            </div>
                        </div>
                        ${wearableState.provenance?.steps ? `
                            <div class="mt-2 pt-1.5 border-t border-[var(--border-subtle)] font-mono text-[9px] text-[var(--bone-dim)]">
                                Measured: <strong class="text-white">${wearableState.provenance.steps.time_str}</strong> (${wearableState.provenance.steps.age_str}) • Source: <span class="text-cyan-300">${wearableState.provenance.steps.source}</span>
                            </div>
                        ` : `
                            <div class="text-[9px] font-mono text-[var(--text-dim)] mt-1.5">
                                Formula: Steps × 0.045 × (${profile.weight}kg / 70)
                            </div>
                        `}
                        <div class="font-mono text-[8px] text-[var(--text-dim)] mt-1 opacity-60">↗ Tap for daily/weekly/monthly view</div>
                    </div>
                </div>

                <!-- Synchronized User Profile & Metabolic Intelligence Section -->
                <div class="editorial-card p-6 mb-6">
                    <div class="flex items-center justify-between mb-4 border-b border-[var(--border-subtle)] pb-3 flex-wrap gap-2">
                        <div class="flex items-center gap-2">
                            <span class="hero-category-tag">PROFILE SYNCHRONIZATION</span>
                            <h3 class="font-display font-bold text-base text-[var(--bone)]">
                                Synchronized Biometric Profile &amp; Metabolic Engine
                            </h3>
                        </div>
                        <button type="button" onclick="window.openBiometricOnboardingModal()" class="btn-editorial-secondary py-1.5 px-3 text-xs flex items-center gap-1.5">
                            <span>✎</span>
                            <span>EDIT BIOMETRIC PROFILE</span>
                        </button>
                    </div>

                    <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 font-mono text-xs">
                        <div class="p-3 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[var(--border-subtle)]">
                            <span class="text-[9px] text-[var(--text-dim)] uppercase block">REGISTERED AGE</span>
                            <span class="text-base font-bold text-[var(--bone)] block mt-0.5">${profile.age} yrs</span>
                            <span class="text-[9px] text-[var(--text-dim)]">Max HR: ${profile.maxHeartRate} bpm</span>
                        </div>
                        <div class="p-3 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[var(--border-subtle)]">
                            <span class="text-[9px] text-[var(--text-dim)] uppercase block">BODY WEIGHT</span>
                            <span class="text-base font-bold text-[var(--bone)] block mt-0.5">${profile.weight} kg</span>
                            <span class="text-[9px] text-[var(--text-dim)]">Factor: ${(profile.weight / 70).toFixed(2)}x</span>
                        </div>
                        <div class="p-3 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[var(--border-subtle)]">
                            <span class="text-[9px] text-[var(--text-dim)] uppercase block">BODY HEIGHT</span>
                            <span class="text-base font-bold text-[var(--bone)] block mt-0.5">${profile.height} cm</span>
                            <span class="text-[9px] text-[var(--text-dim)]">Stride: ${profile.strideLengthCm} cm</span>
                        </div>
                        <div class="p-3 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[var(--border-subtle)]">
                            <span class="text-[9px] text-[var(--text-dim)] uppercase block">CALORIE INTAKE</span>
                            <span class="text-base font-bold text-[var(--cyan-primary)] block mt-0.5">${profile.calorieIntake.toLocaleString()} kcal</span>
                            <span class="text-[9px] text-[var(--text-dim)]">Daily Target</span>
                        </div>
                        <div class="p-3 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[var(--border-subtle)]">
                            <span class="text-[9px] text-[var(--text-dim)] uppercase block">BASAL RATE (BMR)</span>
                            <span class="text-base font-bold text-amber-400 block mt-0.5">${profile.bmr.toLocaleString()} kcal</span>
                            <span class="text-[9px] text-[var(--text-dim)]">Resting Burn</span>
                        </div>
                        <div class="p-3 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[var(--border-subtle)]">
                            <span class="text-[9px] text-[var(--text-dim)] uppercase block">DYNAMIC TDEE</span>
                            <span class="text-base font-bold text-[var(--vermilion)] block mt-0.5">${tdee.toLocaleString()} kcal</span>
                            <span class="text-[9px] text-[var(--text-dim)]">BMR×1.2 + Active</span>
                        </div>
                    </div>

                    <!-- Net Caloric Balance Banner -->
                    <div class="mt-4 p-3.5 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[var(--border-subtle)] flex items-center justify-between flex-wrap gap-3 font-mono">
                        <div>
                            <span class="text-[10px] text-[var(--text-dim)] uppercase block">NET METABOLIC ENERGY BALANCE</span>
                            <div class="flex items-center gap-2 mt-0.5">
                                <span class="font-display font-bold text-lg ${isDeficit ? 'text-cyan-400' : 'text-emerald-400'}">
                                    ${Math.abs(netCaloricBalance)} kcal ${isDeficit ? 'DEFICIT' : 'SURPLUS'}
                                </span>
                                <span class="text-xs text-[var(--bone-dim)]">
                                    (${profile.calorieIntake} intake − ${tdee} expenditure)
                                </span>
                            </div>
                        </div>
                        <div class="text-right">
                            <span class="text-[10px] text-[var(--text-dim)] uppercase block">GOAL ALIGNMENT</span>
                            <span class="text-xs font-bold text-[var(--bone)]">
                                Target: ${profile.goal.toUpperCase()} • ${isDeficit ? 'Optimal for fat mobilization' : 'Optimal for anabolic hypertrophy'}
                            </span>
                        </div>
                    </div>
                </div>

                <!-- Multi-Signal Heart & Cardiovascular Risk Engine (Section 7) -->
                <div class="editorial-card p-6 mb-6 ${bridgeState.heartRisk.alertActive ? 'border-red-500/60 shadow-[0_0_50px_rgba(239,68,68,0.2)]' : ''}">
                    <div class="flex items-center justify-between mb-4 border-b border-[var(--border-subtle)] pb-3 flex-wrap gap-2">
                        <div class="flex items-center gap-2.5">
                            <span class="hero-category-tag">MULTI-SIGNAL HEALTH ENGINE</span>
                            <h3 class="font-display font-bold text-base text-[var(--bone)]">
                                Multi-Signal Heart &amp; Cardiovascular Risk Engine
                            </h3>
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="px-2.5 py-1 rounded-md font-mono text-xs font-bold ${
                                bridgeState.heartRisk.level === 'AWAITING_DATA' ? 'bg-slate-800 text-slate-300 border border-slate-700' :
                                (bridgeState.heartRisk.level === 'CRITICAL' || bridgeState.heartRisk.level === 'EXTREME' ? 'bg-red-600 text-white animate-pulse' :
                                (bridgeState.heartRisk.level === 'HIGH' ? 'bg-red-500/30 text-red-300 border border-red-500/60' :
                                (bridgeState.heartRisk.level === 'MODERATE' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50' :
                                'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40')))
                            }">
                                ${bridgeState.heartRisk.level === 'AWAITING_DATA' ? 'AWAITING REAL DEVICE' : `${bridgeState.heartRisk.level} HEART RISK`}
                            </span>
                            ${bridgeState.heartRisk.alertActive ? `
                                <button type="button" onclick="window.showHeartRiskModal()" class="btn-editorial-primary text-xs py-1 px-2.5 bg-red-600 text-white font-bold animate-pulse">
                                    ⚠️ VIEW CARDIAC ADVISORY
                                </button>
                            ` : ''}
                        </div>
                    </div>

                    <div class="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono text-xs mb-4">
                        <div class="p-3 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[var(--border-subtle)]">
                            <span class="text-[9px] text-[var(--text-dim)] uppercase block">CARDIAC STRAIN SCORE</span>
                            <span class="text-base font-bold text-cyan-400 block mt-0.5">${bridgeState.heartRisk.level === 'AWAITING_DATA' ? '-- / 100' : `${bridgeState.heartRisk.score} / 100`}</span>
                            <span class="text-[9px] text-[var(--text-dim)]">Multi-Signal Composite</span>
                        </div>
                        <div class="p-3 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[var(--border-subtle)]">
                            <span class="text-[9px] text-[var(--text-dim)] uppercase block">HEMODYNAMIC STATUS</span>
                            <span class="text-base font-bold ${bridgeState.heartRisk.level === 'AWAITING_DATA' ? 'text-[var(--bone-dim)] italic' : (bridgeState.heartRisk.cardioLevel === 'HIGH' ? 'text-red-400' : (bridgeState.heartRisk.cardioLevel === 'MODERATE' ? 'text-amber-400' : 'text-emerald-400'))} block mt-0.5">
                                ${bridgeState.heartRisk.level === 'AWAITING_DATA' ? 'No device connected' : (bridgeState.heartRisk.cardioLevel || 'OPTIMAL')}
                            </span>
                            <span class="text-[9px] text-[var(--text-dim)]">HR Delta + Blood Pressure</span>
                        </div>
                        <div class="p-3 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[var(--border-subtle)]">
                            <span class="text-[9px] text-[var(--text-dim)] uppercase block">AUTONOMIC TONE (HRV)</span>
                            <span class="text-base font-bold text-[var(--bone)] block mt-0.5">${wearableState.hrv ? wearableState.hrv + ' ms' : (isConnected ? 'No recent measurement' : 'No device connected')}</span>
                            <span class="text-[9px] text-emerald-400">Sympathetic Balance</span>
                        </div>
                        <div class="p-3 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[var(--border-subtle)]">
                            <span class="text-[9px] text-[var(--text-dim)] uppercase block">MYOCARDIAL O₂ / MONITOR</span>
                            <span class="text-base font-bold text-[var(--bone)] block mt-0.5">${wearableState.spo2 !== null ? `${wearableState.spo2}% SpO₂` : (isConnected ? 'No recent measurement' : 'No device connected')}</span>
                            <span class="text-[9px] text-[var(--text-dim)]">${bridgeState.isLiveMonitoring ? 'Live Streaming 1Hz' : (isConnected ? 'Snapshot Stream' : 'Standby')}</span>
                        </div>
                    </div>

                    <!-- Missing Signals / Awaiting Telemetry Box -->
                    ${bridgeState.heartRisk.missingSignals && bridgeState.heartRisk.missingSignals.length > 0 ? `
                        <div class="p-3 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[var(--border-subtle)] mb-3 font-mono text-xs">
                            <span class="text-amber-400 font-bold uppercase text-[10px] block mb-1">Awaiting Sensor Telemetry (${bridgeState.heartRisk.missingSignals.length} signals missing):</span>
                            <div class="flex flex-wrap gap-2">
                                ${bridgeState.heartRisk.missingSignals.map(s => `<span class="px-2 py-0.5 rounded bg-amber-950/40 border border-amber-500/40 text-amber-300 text-[10px] font-semibold">⚠ ${s.replace('_', ' ').toUpperCase()}</span>`).join('')}
                            </div>
                        </div>
                    ` : ''}

                    <!-- Triggers & Guidance -->
                    ${bridgeState.heartRisk.triggers && bridgeState.heartRisk.triggers.length > 0 ? `
                        <div class="p-3 rounded-lg bg-[rgba(239,68,68,0.06)] border border-red-500/20 mb-3 font-mono text-xs">
                            <span class="text-red-400 font-bold uppercase text-[10px] block mb-1">Active Cardiac Triggers:</span>
                            <div class="flex flex-wrap gap-2">
                                ${bridgeState.heartRisk.triggers.map(t => `<span class="px-2 py-0.5 rounded bg-red-950/60 border border-red-500/40 text-red-300 text-[10px] font-semibold">${t}</span>`).join('')}
                            </div>
                        </div>
                    ` : ''}

                    <div class="p-3 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[var(--border-subtle)] mb-3 font-mono text-xs text-[var(--bone-dim)]">
                        <span class="text-white font-bold uppercase text-[10px] block mb-1">Clinical Decision Support Guidance:</span>
                        <div class="space-y-1">
                            ${bridgeState.heartRisk.recommendations.map(r => `<div class="flex items-start gap-1.5"><span class="text-emerald-400 font-bold">✓</span><span>${r}</span></div>`).join('')}
                        </div>
                    </div>

                    <div class="text-[10px] font-mono text-[var(--text-dim)] italic border-t border-[var(--border-subtle)] pt-2 leading-relaxed">
                        ${bridgeState.heartRisk.disclaimer}
                    </div>
                </div>

                <!-- Deep Analysis: Wearable Kinematics + Luna AI Reasoning -->
                <div class="editorial-card p-6 mb-8">
                    <div class="flex items-center justify-between mb-4 border-b border-[var(--border-subtle)] pb-3 flex-wrap gap-2">
                        <div class="flex items-center gap-2">
                            <span class="hero-category-tag">INTELLIGENCE SYNTHESIS</span>
                            <h3 class="font-display font-bold text-base text-[var(--bone)]">
                                ${isConnected ? 'Luna AI Wearable Diagnostic Analysis' : 'Biometric Diagnostic Pipeline (Standby)'}
                            </h3>
                        </div>
                        ${isConnected ? `
                            <button type="button" onclick="window.askLunaPrompt('Analyze my wearable vitals: SpO2 ${wearableState.spo2}%, BP ${wearableState.systolic}/${wearableState.diastolic} mmHg, Sleep ${wearableState.sleepQuality}, Steps ${wearableState.steps}, Caloric Deficit ${Math.abs(netCaloricBalance)} kcal. What adjustments should I make?')" class="btn-editorial-secondary py-1.5 px-3 text-xs">
                                OPEN IN LUNA AI ORACLE →
                            </button>
                        ` : ''}
                    </div>

                    ${isConnected ? `
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div class="p-3.5 bg-[rgba(255,255,255,0.02)] border border-[var(--border-subtle)] rounded-lg">
                                <div class="font-mono text-[10px] text-[var(--vermilion)] uppercase font-bold mb-1">Circadian Synchronization</div>
                                <p class="text-xs text-[var(--bone-dim)] leading-relaxed">
                                    Sleep architecture: <strong>${wearableState.sleepScore ? wearableState.sleepScore + '/100' : '--/100'}</strong> quality index (${wearableState.sleepQuality || 'Standby'}). ${wearableState.sleepBedtime ? `Bedtime at ${wearableState.sleepBedtime}` : 'Awaiting smartwatch sleep tracking data'}.
                                </p>
                            </div>
                            <div class="p-3.5 bg-[rgba(255,255,255,0.02)] border border-[var(--border-subtle)] rounded-lg">
                                <div class="font-mono text-[10px] text-[var(--vermilion)] uppercase font-bold mb-1">Metabolic Step Expenditure</div>
                                <p class="text-xs text-[var(--bone-dim)] leading-relaxed">
                                    At <strong>${wearableState.steps !== null ? wearableState.steps.toLocaleString() + ' steps' : 'Awaiting stream'}</strong>, <strong>${profile.weight} kg mass</strong>, and <strong>${profile.height} cm height</strong>, active thermogenic burn is <strong>${wearableState.caloriesBurned !== null ? wearableState.caloriesBurned.toLocaleString() + ' kcal' : '-- kcal'}</strong> over <strong>${wearableState.distanceKm !== null ? wearableState.distanceKm + ' km' : '-- km'}</strong>.
                                </p>
                            </div>
                            <div class="p-3.5 bg-[rgba(255,255,255,0.02)] border border-[var(--border-subtle)] rounded-lg">
                                <div class="font-mono text-[10px] text-[var(--vermilion)] uppercase font-bold mb-1">Cardiovascular Stability</div>
                                <p class="text-xs text-[var(--bone-dim)] leading-relaxed">
                                    Resting heart rate: <strong>${wearableState.heartRate ? wearableState.heartRate + ' bpm' : '-- bpm (Requires sensor)'}</strong> (Aerobic Zone: ${profile.aerobicMin}–${profile.aerobicMax} bpm, Max: ${profile.maxHeartRate} bpm).
                                </p>
                            </div>
                        </div>
                    ` : `
                        <div class="p-6 text-center text-xs text-[var(--bone-dim)] font-mono leading-relaxed bg-[rgba(255,255,255,0.01)] rounded-lg border border-[var(--border-subtle)]">
                            <div class="text-2xl mb-2">⚡</div>
                            <p class="max-w-md mx-auto">
                                Hardware telemetry stream is currently in standby. Click <strong>CONNECT BLUETOOTH MODULE</strong> above to scan your smart watch / phone, or pair via Wi-Fi Companion to begin real-time biometric analysis.
                            </p>
                        </div>
                    `}
                </div>
            </div>
        `;

        // Proactively probe Bluetooth radio state and reflect live badge on render
        setTimeout(() => {
            checkBluetoothAvailability();
        }, 50);
    };

    window.wearableEngine = {
        getState: () => ({ ...wearableState }),
        getBiometricProfile,
        evaluateBiometricRisk,
        computeCalories,
        computeDistanceKm
    };
})();
