/* ═══════════════════════════════════════════════════════════════════
   LUMINIX — Premium Galaxy App Controller
   BLACK × WHITE × 3D × GALAXY × AI × PREMIUM × MINIMAL × FUTURISTIC
   All existing functionality preserved. Visual layer upgraded.
   ═══════════════════════════════════════════════════════════════════ */

const API_BASE = '';
let currentView = 'dashboard';
let poseEngine = null;
let cameraInstance = null;
let riskTimer = null;
let riskStart = 0;
let avatarScene, avatarCamera, avatarRenderer, avatarBody;
let heroScene, heroCamera, heroRenderer, heroOrb;
let heroAnimId, avatarAnimId;

// ── Galaxy Star Background ──────────────────────────────────────
(function initGalaxy() {
    const canvas = document.getElementById('galaxy-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let stars = [];
    const STAR_COUNT = window.innerWidth < 768 ? 60 : 120;

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    function createStars() {
        stars = [];
        for (let i = 0; i < STAR_COUNT; i++) {
            stars.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                r: Math.random() * 1.2 + 0.2,
                a: Math.random() * 0.6 + 0.1,
                speed: Math.random() * 0.15 + 0.02,
                phase: Math.random() * Math.PI * 2
            });
        }
    }

    let time = 0;
    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        time += 0.008;
        for (const s of stars) {
            const twinkle = 0.5 + 0.5 * Math.sin(time * 2 + s.phase);
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255,255,255,${s.a * twinkle})`;
            ctx.fill();
            s.y -= s.speed;
            if (s.y < -2) { s.y = canvas.height + 2; s.x = Math.random() * canvas.width; }
        }
        requestAnimationFrame(draw);
    }

    resize();
    createStars();
    draw();
    window.addEventListener('resize', () => { resize(); createStars(); });
})();

// ── Custom Cursor ───────────────────────────────────────────────
(function initCursor() {
    if (window.matchMedia('(pointer: coarse)').matches) return;
    const dot = document.getElementById('cursor-dot');
    const ring = document.getElementById('cursor-ring');
    if (!dot || !ring) return;
    let mx = 0, my = 0, rx = 0, ry = 0;

    document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });

    function animate() {
        rx += (mx - rx) * 0.15;
        ry += (my - ry) * 0.15;
        dot.style.transform = `translate(${mx - 4}px, ${my - 4}px)`;
        ring.style.transform = `translate(${rx - 18}px, ${ry - 18}px)`;
        requestAnimationFrame(animate);
    }
    animate();

    document.addEventListener('mouseover', e => {
        const t = e.target.closest('button, a, .nav-item, .qa-card, .pose-card, .luna-prompt, .auth-oauth-btn, [onclick]');
        if (t) document.body.classList.add('cursor-hover');
        else document.body.classList.remove('cursor-hover');
    });
})();

// ── Navigation ──────────────────────────────────────────────────
window.nav = function(view) {
    if (!window.requireAuth || !window.requireAuth()) {
        window.renderAuthView?.();
        return;
    }
    // Cleanup previous view
    if (currentView === 'live-pose') stopPoseEngine();
    if (currentView === 'gym' && window.stopGym) window.stopGym();
    if (currentView === 'yoga' && window.stopYoga) window.stopYoga();
    if (currentView === 'dashboard') stopHero3D();

    currentView = view;
    const main = document.getElementById('main-content');
    main.innerHTML = '';
    main.className = 'view-enter';

    // Update nav active state
    document.querySelectorAll('.nav-item').forEach(n => {
        n.classList.toggle('nav-active', n.dataset.view === view);
    });
    document.querySelectorAll('.mobile-bottom-nav button').forEach(b => {
        b.classList.toggle('mob-active', b.dataset.mob === view);
    });

    const container = document.createElement('div');
    main.appendChild(container);

    switch (view) {
        case 'dashboard': renderDashboard(container); break;
        case 'live-pose': renderLivePose(container); break;
        case 'yoga': window.renderYogaView?.(container); break;
        case 'gym': window.renderGymView?.(container); break;
        case 'luna': renderLuna(container); break;
        case 'export': renderExport(container); break;
        default: renderDashboard(container);
    }
};

// ── App Init ────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    if (window.luminixAuth?.handleTokenFromUrl()) {
        await window.luminixAuth.fetchMe();
    }
    window.updateUserProfileUI?.();

    if (window.luminixAuth?.isAuthenticated()) {
        document.getElementById('app-shell')?.classList.remove('auth-locked');
        nav('dashboard');
    } else {
        window.renderAuthView?.();
    }

    // Voice wake word
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        try {
            const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
            const wake = new SR();
            wake.continuous = true; wake.interimResults = false;
            wake.onresult = e => {
                const t = e.results[e.results.length - 1][0].transcript.toLowerCase();
                if (t.includes('start luna') || t.includes('hey luna')) { nav('luna'); startLunaVoice(); }
            };
            wake.start();
        } catch (_) {}
    }
});

// ── TTS ─────────────────────────────────────────────────────────
window.speak = function(text) {
    if (!('speechSynthesis' in window)) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.05; u.pitch = 1.1;
    speechSynthesis.speak(u);
};

// ══════════════════════════════════════════════════════════════════
//  DASHBOARD VIEW — Cinematic hero + 3D orb + stats
// ══════════════════════════════════════════════════════════════════
async function renderDashboard(container) {
    // Fetch stats
    let yogaCount = '—', gymCount = '—';
    try {
        const [y, g] = await Promise.all([
            fetch(API_BASE + '/v1/yoga/poses').then(r => r.json()).catch(() => null),
            fetch(API_BASE + '/v1/gym/categories').then(r => r.json()).catch(() => null)
        ]);
        if (y?.poses) yogaCount = y.poses.length;
        if (g?.categories) gymCount = g.categories.length;
    } catch (_) {}

    container.innerHTML = `
        <!-- Hero Section -->
        <div class="hero-section">
            <div class="hero-content">
                <div class="hero-eyebrow">Health Intelligence Platform</div>
                <h1 class="hero-title">Welcome to <span class="text-gradient">Luminix</span></h1>
                <p class="hero-desc">Track your posture live, follow guided yoga & gym routines, and get AI coaching from Luna — all in one place.</p>
                <div class="flex flex-wrap gap-3">
                    <button onclick="nav('live-pose')" class="btn-primary">Start Tracking</button>
                    <button onclick="nav('yoga')" class="btn-secondary">Yoga Library</button>
                    <button onclick="nav('gym')" class="btn-galaxy">Gym Module</button>
                </div>
            </div>
            <div class="hero-3d" id="hero-3d-container"></div>
        </div>

        <!-- Quick Actions -->
        <div class="qa-grid">
            <div class="qa-card tilt-card" onclick="nav('live-pose')">
                <div class="qa-icon-wrap" style="background:rgba(79,127,255,0.08)">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4F7FFF" stroke-width="1.5"><circle cx="12" cy="4" r="2"/><path d="M12 6v4m-4 2l4-2 4 2m-8 0v4l4 4 4-4v-4"/></svg>
                </div>
                <h4>Live Pose</h4>
                <p>Real-time tracking with risk alerts</p>
            </div>
            <div class="qa-card tilt-card" onclick="nav('yoga')">
                <div class="qa-icon-wrap" style="background:rgba(16,185,129,0.08)">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="1.5"><circle cx="12" cy="4" r="2"/><path d="M4 20l4-8 4 4 4-4 4 8"/></svg>
                </div>
                <h4>Yoga Library</h4>
                <p>${yogaCount} poses with difficulty levels</p>
            </div>
            <div class="qa-card tilt-card" onclick="nav('gym')">
                <div class="qa-icon-wrap" style="background:rgba(139,92,246,0.08)">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" stroke-width="1.5"><path d="M6.5 6.5h11M2 12h3m14 0h3M5 8v8m14-8v8m-12-6v4m10-4v4"/></svg>
                </div>
                <h4>Gym Module</h4>
                <p>${gymCount} categories with 3D demos</p>
            </div>
            <div class="qa-card tilt-card" onclick="nav('luna')">
                <div class="qa-icon-wrap" style="background:rgba(236,72,153,0.08)">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#EC4899" stroke-width="1.5"><circle cx="12" cy="12" r="3"/><path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2"/></svg>
                </div>
                <h4>Luna AI</h4>
                <p>AI health & fitness assistant</p>
            </div>
        </div>

        <!-- Stats Grid -->
        <div class="stat-grid">
            <div class="stat-card">
                <div class="stat-label">Yoga Poses <span class="badge badge-api">API</span></div>
                <div class="stat-value">${yogaCount}</div>
                <div class="stat-sub">From /v1/yoga/poses</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Gym Categories <span class="badge badge-api">API</span></div>
                <div class="stat-value">${gymCount}</div>
                <div class="stat-sub">Chest · Back · Legs · More</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Posture Score <span class="badge badge-live">LIVE</span></div>
                <div class="stat-value" id="dash-score">—</div>
                <div class="stat-sub">Start live tracking</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">BMI <span class="badge badge-calc">CALC</span></div>
                <div class="stat-value" id="dash-bmi">—</div>
                <div class="stat-sub">Use BMI calculator</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Risk Level <span class="badge badge-live">LIVE</span></div>
                <div class="stat-value" style="color:var(--success)" id="dash-risk">Safe</div>
                <div class="stat-sub">Updates during Live Pose</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Activity <span class="badge badge-demo">DEMO</span></div>
                <div class="stat-value">Moderate</div>
                <div class="stat-sub">Sample activity level</div>
            </div>
        </div>

        <!-- Feature Cards -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="glass-card feature-card p-6 rounded-xl">
                <h3 style="font-family:var(--font-display);font-size:1.25rem;font-weight:800;margin-bottom:0.5rem">Live Pose Tracking</h3>
                <p style="color:var(--text-secondary);font-size:0.85rem;margin-bottom:1rem">Webcam skeleton overlay, real-time scoring, 12-second risk alerts, and a 3D mirror avatar.</p>
                <button onclick="nav('live-pose')" class="btn-secondary text-sm">Open Live Pose →</button>
            </div>
            <div class="glass-card feature-card p-6 rounded-xl">
                <h3 style="font-family:var(--font-display);font-size:1.25rem;font-weight:800;margin-bottom:0.5rem">BMI Calculator</h3>
                <p style="color:var(--text-secondary);font-size:0.85rem;margin-bottom:1rem">Calculate BMI, BMR, TDEE, and macro targets. Get personalized nutrition plans.</p>
                <button onclick="openBMICalc()" class="btn-secondary text-sm">Calculate BMI →</button>
            </div>
        </div>
    `;

    initHero3D();
    initTiltCards();
    fetchDemoBMI();
}

// ── 3D Hero Orb ─────────────────────────────────────────────────
function initHero3D() {
    const container = document.getElementById('hero-3d-container');
    if (!container || typeof THREE === 'undefined') return;

    heroScene = new THREE.Scene();
    heroCamera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    heroCamera.position.set(0, 0, 5);

    heroRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    heroRenderer.setSize(280, 280);
    heroRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    heroRenderer.setClearColor(0x000000, 0);
    container.appendChild(heroRenderer.domElement);

    // Galaxy-powered orb — glass material
    const orbGeo = new THREE.IcosahedronGeometry(1.2, 3);
    const orbMat = new THREE.MeshPhysicalMaterial({
        color: 0x4F7FFF,
        metalness: 0.1,
        roughness: 0.15,
        transmission: 0.6,
        thickness: 1.5,
        transparent: true,
        opacity: 0.7,
        wireframe: false
    });
    heroOrb = new THREE.Mesh(orbGeo, orbMat);
    heroScene.add(heroOrb);

    // Wireframe shell
    const wireMat = new THREE.MeshBasicMaterial({ color: 0x4F7FFF, wireframe: true, transparent: true, opacity: 0.08 });
    const wireOrb = new THREE.Mesh(new THREE.IcosahedronGeometry(1.6, 2), wireMat);
    heroScene.add(wireOrb);

    // Orbital ring
    const ringGeo = new THREE.TorusGeometry(1.8, 0.008, 8, 64);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x8B5CF6, transparent: true, opacity: 0.25 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 3;
    heroScene.add(ring);

    // Particles around orb
    const particleCount = 60;
    const pGeo = new THREE.BufferGeometry();
    const pPositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(Math.random() * 2 - 1);
        const r = 1.8 + Math.random() * 1.2;
        pPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        pPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        pPositions[i * 3 + 2] = r * Math.cos(phi);
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
    const pMat = new THREE.PointsMaterial({ color: 0x22D3EE, size: 0.03, transparent: true, opacity: 0.6 });
    heroScene.add(new THREE.Points(pGeo, pMat));

    // Lighting
    heroScene.add(new THREE.AmbientLight(0x404080, 0.4));
    const keyLight = new THREE.DirectionalLight(0xffffff, 0.6);
    keyLight.position.set(3, 4, 5);
    heroScene.add(keyLight);
    const rimLight = new THREE.PointLight(0x8B5CF6, 0.4, 10);
    rimLight.position.set(-3, 2, -3);
    heroScene.add(rimLight);
    const accentLight = new THREE.PointLight(0x22D3EE, 0.3, 8);
    accentLight.position.set(2, -2, 3);
    heroScene.add(accentLight);

    // Cursor interaction
    let mouseX = 0, mouseY = 0;
    document.addEventListener('mousemove', e => {
        mouseX = (e.clientX / window.innerWidth - 0.5) * 0.3;
        mouseY = (e.clientY / window.innerHeight - 0.5) * 0.3;
    });

    let t = 0;
    function animate() {
        heroAnimId = requestAnimationFrame(animate);
        t += 0.008;
        // Slow floating + cursor reaction
        heroOrb.rotation.y = t * 0.3 + mouseX * 0.5;
        heroOrb.rotation.x = Math.sin(t * 0.5) * 0.15 + mouseY * 0.5;
        heroOrb.position.y = Math.sin(t) * 0.08;
        wireOrb.rotation.y = -t * 0.15;
        wireOrb.rotation.z = t * 0.1;
        ring.rotation.z = t * 0.2;
        heroRenderer.render(heroScene, heroCamera);
    }
    animate();
}

function stopHero3D() {
    if (heroAnimId) cancelAnimationFrame(heroAnimId);
}

// ── Tilt Cards ──────────────────────────────────────────────────
function initTiltCards() {
    document.querySelectorAll('.tilt-card').forEach(card => {
        card.addEventListener('mousemove', e => {
            const rect = card.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width - 0.5;
            const y = (e.clientY - rect.top) / rect.height - 0.5;
            card.style.transform = `perspective(600px) rotateY(${x * 6}deg) rotateX(${-y * 6}deg) translateY(-4px)`;
        });
        card.addEventListener('mouseleave', () => {
            card.style.transform = '';
        });
    });
}

// ── BMI Calculator ──────────────────────────────────────────────
async function fetchDemoBMI() {
    try {
        const res = await fetch(API_BASE + '/v1/nutrition/metrics', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ age: 25, gender: 'male', height_cm: 175, weight_kg: 72, activity_level: 'moderate', fitness_goal: 'maintenance', diet_preference: 'non_vegetarian', allergies: [] })
        });
        const d = await res.json();
        const el = document.getElementById('dash-bmi');
        if (el) el.textContent = d.bmi?.toFixed(1) || '—';
    } catch (_) {}
}

window.openBMICalc = function() {
    const main = document.getElementById('main-content');
    const existing = document.getElementById('bmi-modal');
    if (existing) { existing.remove(); return; }

    const modal = document.createElement('div');
    modal.id = 'bmi-modal';
    modal.style.cssText = 'position:fixed;inset:0;z-index:200;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.7);backdrop-filter:blur(8px)';
    modal.innerHTML = `
        <div class="glass-card p-8 rounded-2xl" style="max-width:420px;width:90%;border:1px solid rgba(255,255,255,0.08)">
            <div class="flex justify-between items-center mb-6">
                <h3 style="font-family:var(--font-display);font-size:1.5rem;font-weight:800">BMI Calculator</h3>
                <button onclick="document.getElementById('bmi-modal').remove()" class="btn-ghost text-xl">✕</button>
            </div>
            <div class="grid grid-cols-2 gap-4 mb-4">
                <div>
                    <label class="block text-xs font-semibold mb-1" style="color:var(--text-dim)">AGE</label>
                    <input type="number" id="bmi-age" value="25" class="auth-input">
                </div>
                <div>
                    <label class="block text-xs font-semibold mb-1" style="color:var(--text-dim)">GENDER</label>
                    <select id="bmi-gender" class="auth-input"><option value="male">Male</option><option value="female">Female</option></select>
                </div>
            </div>
            <label class="block text-xs font-semibold mb-1" style="color:var(--text-dim)">HEIGHT (cm)</label>
            <input type="number" id="bmi-height" value="175" class="auth-input mb-3">
            <label class="block text-xs font-semibold mb-1" style="color:var(--text-dim)">WEIGHT (kg)</label>
            <input type="number" id="bmi-weight" value="72" class="auth-input mb-3">
            <label class="block text-xs font-semibold mb-1" style="color:var(--text-dim)">ACTIVITY</label>
            <select id="bmi-activity" class="auth-input mb-4">
                <option value="sedentary">Sedentary</option>
                <option value="light">Light</option>
                <option value="moderate" selected>Moderate</option>
                <option value="active">Active</option>
                <option value="very_active">Very Active</option>
            </select>
            <button onclick="calcBMI()" class="btn-primary w-full">Calculate</button>
            <div id="bmi-result" class="mt-4"></div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
};

window.calcBMI = async function() {
    const res = await fetch(API_BASE + '/v1/nutrition/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            age: +document.getElementById('bmi-age').value,
            gender: document.getElementById('bmi-gender').value,
            height_cm: +document.getElementById('bmi-height').value,
            weight_kg: +document.getElementById('bmi-weight').value,
            activity_level: document.getElementById('bmi-activity').value,
            fitness_goal: 'maintenance', diet_preference: 'non_vegetarian', allergies: []
        })
    });
    const d = await res.json();
    document.getElementById('bmi-result').innerHTML = `
        <div class="grid grid-cols-2 gap-3 mt-3">
            <div class="stat-card p-3"><div class="stat-label">BMI</div><div class="stat-value text-xl">${d.bmi?.toFixed(1)}</div><div class="stat-sub">${d.bmi_category?.replace(/_/g,' ')}</div></div>
            <div class="stat-card p-3"><div class="stat-label">BMR</div><div class="stat-value text-xl">${Math.round(d.bmr_kcal)}</div><div class="stat-sub">kcal/day</div></div>
            <div class="stat-card p-3"><div class="stat-label">TDEE</div><div class="stat-value text-xl">${Math.round(d.tdee_kcal)}</div><div class="stat-sub">kcal/day</div></div>
            <div class="stat-card p-3"><div class="stat-label">Protein</div><div class="stat-value text-xl">${Math.round(d.macros?.protein_g || 0)}g</div><div class="stat-sub">daily target</div></div>
        </div>
    `;
    const dashBmi = document.getElementById('dash-bmi');
    if (dashBmi) dashBmi.textContent = d.bmi?.toFixed(1);
};

// ══════════════════════════════════════════════════════════════════
//  LIVE POSE VIEW
// ══════════════════════════════════════════════════════════════════
function renderLivePose(container) {
    container.innerHTML = `
        <div class="mb-6">
            <h2 style="font-family:var(--font-display);font-size:2rem;font-weight:800">Live Pose <span class="text-gradient">Tracking</span></h2>
            <p style="color:var(--text-dim);font-size:0.85rem">Live tracking · Risk detection · 3D mirror avatar</p>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            <!-- Camera -->
            <div class="lg:col-span-2 glass-card camera-panel rounded-xl relative overflow-hidden">
                <video id="pose-video" class="camera-video-source" playsinline></video>
                <canvas id="pose-canvas" class="camera-canvas"></canvas>
                <div id="risk-badge" class="risk-badge risk-safe">● SAFE</div>
                <div id="risk-timer-display" class="risk-timer" style="display:none"></div>
                <div id="camera-loading" class="camera-loading" style="display:none">
                    <div class="loading-spinner mb-3"></div>
                    <p style="font-size:0.8rem;color:var(--text-dim)">Initializing pose engine...</p>
                </div>

                <!-- Controls -->
                <div class="absolute bottom-4 left-4 right-4 z-10 flex items-center justify-between">
                    <div>
                        <p style="font-size:0.65rem;color:var(--text-dim)">Posture Quality</p>
                        <div class="score-bar-wrap w-32"><div class="score-bar" id="score-bar" style="width:0%"></div></div>
                    </div>
                    <button id="camera-toggle" onclick="toggleCamera()" class="btn-primary text-sm">Start Camera</button>
                </div>
            </div>

            <!-- 3D Avatar -->
            <div class="glass-card avatar-panel rounded-xl relative overflow-hidden" id="avatar-container">
                <div class="absolute top-3 left-3 z-10">
                    <p style="font-size:0.8rem;font-weight:700">Mirror Trainer</p>
                    <p style="font-size:0.65rem;color:var(--text-dim)">3D avatar follows your pose</p>
                </div>
            </div>
        </div>

        <!-- Session Stats -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div class="session-stat"><div><div class="label">Score</div><div class="value" id="stat-score">—</div></div></div>
            <div class="session-stat"><div><div class="label">Status</div><div class="value" id="stat-status" style="color:var(--success)">Safe</div></div></div>
            <div class="session-stat"><div><div class="label">Alerts</div><div class="value" id="stat-alerts">0</div></div></div>
            <div class="session-stat"><div><div class="label">Feedback</div><div class="value" id="stat-feedback" style="font-size:0.7rem;font-weight:500">Start camera</div></div></div>
        </div>

        <!-- Quick Reference Poses -->
        <h3 style="font-family:var(--font-display);font-size:1.25rem;font-weight:800;margin-bottom:1rem">Quick Reference — Poses</h3>
        <div id="pose-ref-grid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <p style="color:var(--text-dim);font-size:0.85rem" class="animate-pulse">Loading poses...</p>
        </div>
    `;

    init3DAvatar();
    loadPoseRef();
}

async function loadPoseRef() {
    try {
        const res = await fetch(API_BASE + '/v1/yoga/poses');
        const data = await res.json();
        const grid = document.getElementById('pose-ref-grid');
        if (!grid) return;
        grid.innerHTML = (data.poses || []).slice(0, 6).map(p => `
            <div class="glass-card p-4 rounded-xl pose-card">
                <div class="flex justify-between items-start mb-2">
                    <h4 style="font-weight:700;font-size:0.9rem">${p.name}</h4>
                    <span class="badge ${p.difficulty === 'Beginner' ? 'badge-calc' : p.difficulty === 'Advanced' ? 'badge-live' : 'badge-demo'}">${p.difficulty}</span>
                </div>
                <p style="font-size:0.75rem;color:var(--text-secondary);margin-bottom:0.5rem">${p.benefits}</p>
                <p style="font-size:0.7rem;color:var(--text-dim)">${p.instructions}</p>
            </div>
        `).join('');
    } catch (_) {}
}

// ── Camera & Pose Engine ────────────────────────────────────────
let alertCount = 0;
window.toggleCamera = async function() {
    const btn = document.getElementById('camera-toggle');
    if (poseEngine) { stopPoseEngine(); btn.textContent = 'Start Camera'; return; }
    btn.textContent = 'Stop Camera';
    const loading = document.getElementById('camera-loading');
    if (loading) loading.style.display = 'flex';

    try {
        const video = document.getElementById('pose-video');
        const canvas = document.getElementById('pose-canvas');
        const ctx = canvas.getContext('2d');

        poseEngine = new Pose({ locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${f}` });
        poseEngine.setOptions({ modelComplexity: 1, smoothLandmarks: true, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });

        poseEngine.onResults(results => {
            if (loading) loading.style.display = 'none';
            canvas.width = canvas.clientWidth;
            canvas.height = canvas.clientHeight;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.save();
            ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

            if (results.poseLandmarks) {
                drawBoldSkeleton(ctx, results.poseLandmarks, canvas.width, canvas.height);
                update3DAvatar(results.poseLandmarks);
                analyzeRisk(results.poseLandmarks);
            }
            ctx.restore();
        });

        await poseEngine.initialize();

        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 640, height: 480 } });
        video.srcObject = stream;
        await video.play();

        cameraInstance = new Camera(video, {
            onFrame: async () => { if (poseEngine) await poseEngine.send({ image: video }); },
            width: 640, height: 480
        });
        cameraInstance.start();
    } catch (e) {
        if (loading) loading.style.display = 'none';
        btn.textContent = 'Start Camera';
        console.error('Camera error:', e);
    }
};

function stopPoseEngine() {
    if (cameraInstance) { cameraInstance.stop(); cameraInstance = null; }
    if (poseEngine) { poseEngine.close(); poseEngine = null; }
    if (riskTimer) { clearTimeout(riskTimer); riskTimer = null; }
    const video = document.getElementById('pose-video');
    if (video?.srcObject) { video.srcObject.getTracks().forEach(t => t.stop()); video.srcObject = null; }
    document.getElementById('warning-overlay').style.display = 'none';
}

// ── Bold Skeleton Drawing ───────────────────────────────────────
function drawBoldSkeleton(ctx, landmarks, w, h) {
    const CONNECTIONS = [
        [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
        [11, 23], [12, 24], [23, 24], [23, 25], [24, 26],
        [25, 27], [26, 28], [27, 29], [28, 30], [29, 31], [30, 32],
        [15, 17], [15, 19], [16, 18], [16, 20]
    ];

    // Lines
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    for (const [a, b] of CONNECTIONS) {
        const la = landmarks[a], lb = landmarks[b];
        if (!la || !lb || la.visibility < 0.3 || lb.visibility < 0.3) continue;
        const grad = ctx.createLinearGradient(la.x * w, la.y * h, lb.x * w, lb.y * h);
        grad.addColorStop(0, 'rgba(79,127,255,0.9)');
        grad.addColorStop(1, 'rgba(139,92,246,0.9)');
        ctx.strokeStyle = grad;
        ctx.beginPath();
        ctx.moveTo(la.x * w, la.y * h);
        ctx.lineTo(lb.x * w, lb.y * h);
        ctx.stroke();
    }

    // Nodes
    for (let i = 11; i <= 32; i++) {
        const lm = landmarks[i];
        if (!lm || lm.visibility < 0.3) continue;
        const x = lm.x * w, y = lm.y * h;
        // Outer glow
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(79,127,255,0.25)';
        ctx.fill();
        // Inner node
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        ctx.strokeStyle = '#4F7FFF';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    // Head
    const nose = landmarks[0];
    if (nose && nose.visibility > 0.3) {
        ctx.beginPath();
        ctx.arc(nose.x * w, nose.y * h, 12, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(79,127,255,0.3)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.8)';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
}

// ── Risk Analysis ───────────────────────────────────────────────
function analyzeRisk(landmarks) {
    const badge = document.getElementById('risk-badge');
    const timerDisp = document.getElementById('risk-timer-display');
    const overlay = document.getElementById('warning-overlay');
    const scoreBar = document.getElementById('score-bar');

    let risky = false;
    let score = 0.85;
    let feedback = 'Good posture';

    if (landmarks.length >= 25) {
        const lSh = landmarks[11], lHip = landmarks[23];
        const rSh = landmarks[12], rHip = landmarks[24];
        if (lSh.y > lHip.y + 0.05 || rSh.y > rHip.y + 0.05) {
            risky = true; score = 0.3;
            feedback = '⚠️ Shoulders below hips — reduce forward bend';
        }
    }

    // Send to backend
    fetch(API_BASE + '/v1/pose-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ landmarks })
    }).then(r => r.json()).then(d => {
        if (d.risky) { risky = true; score = d.score; feedback = d.feedback; }
    }).catch(() => {});

    // Update UI
    if (scoreBar) scoreBar.style.width = `${score * 100}%`;
    const statScore = document.getElementById('stat-score');
    const statStatus = document.getElementById('stat-status');
    const statFeedback = document.getElementById('stat-feedback');
    if (statScore) statScore.textContent = (score * 100).toFixed(0);
    if (statFeedback) statFeedback.textContent = feedback;

    if (risky) {
        if (!riskStart) riskStart = Date.now();
        const elapsed = (Date.now() - riskStart) / 1000;

        if (badge) { badge.className = 'risk-badge risk-warning'; badge.innerHTML = '◉ WARNING'; }
        if (statStatus) { statStatus.textContent = 'Warning'; statStatus.style.color = 'var(--warning)'; }

        if (elapsed >= 12) {
            if (badge) { badge.className = 'risk-badge risk-danger'; badge.innerHTML = '⚠ RISK'; }
            if (timerDisp) { timerDisp.style.display = 'block'; timerDisp.textContent = `⚠ RISK ${elapsed.toFixed(0)}s — Correct posture NOW`; }
            if (overlay) overlay.style.display = 'block';
            if (statStatus) { statStatus.textContent = 'RISK'; statStatus.style.color = 'var(--danger)'; }
            alertCount++;
            const statAlerts = document.getElementById('stat-alerts');
            if (statAlerts) statAlerts.textContent = alertCount;
            if (window.speak && elapsed >= 12 && elapsed < 13) window.speak('Warning! Risky posture detected. Please correct your position.');
        } else if (elapsed >= 6) {
            if (timerDisp) { timerDisp.style.display = 'block'; timerDisp.textContent = `⏱ ${(12 - elapsed).toFixed(0)}s`; }
        }
    } else {
        riskStart = 0;
        if (badge) { badge.className = 'risk-badge risk-safe'; badge.innerHTML = '● SAFE'; }
        if (timerDisp) timerDisp.style.display = 'none';
        if (overlay) overlay.style.display = 'none';
        if (statStatus) { statStatus.textContent = 'Safe'; statStatus.style.color = 'var(--success)'; }
    }
}

// ── 3D Mirror Avatar ────────────────────────────────────────────
function init3DAvatar() {
    const container = document.getElementById('avatar-container');
    if (!container || typeof THREE === 'undefined') return;

    avatarScene = new THREE.Scene();
    avatarScene.background = new THREE.Color(0x050505);
    avatarCamera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
    avatarCamera.position.set(0, 1.5, 4);
    avatarCamera.lookAt(0, 1.2, 0);

    avatarRenderer = new THREE.WebGLRenderer({ antialias: true });
    avatarRenderer.setSize(container.clientWidth, container.clientHeight);
    avatarRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(avatarRenderer.domElement);

    avatarScene.add(new THREE.AmbientLight(0x303050, 0.6));
    const light = new THREE.DirectionalLight(0xffffff, 0.8);
    light.position.set(3, 5, 4);
    avatarScene.add(light);
    const rimLight = new THREE.PointLight(0x4F7FFF, 0.3, 8);
    rimLight.position.set(-3, 2, -2);
    avatarScene.add(rimLight);

    // Grid
    const grid = new THREE.GridHelper(8, 8, 0x222222, 0x181818);
    grid.material.opacity = 0.3;
    grid.material.transparent = true;
    avatarScene.add(grid);

    // Avatar body
    avatarBody = new THREE.Group();
    const mat = new THREE.MeshPhongMaterial({ color: 0x4F7FFF, shininess: 30 });
    const jointMat = new THREE.MeshPhongMaterial({ color: 0xffffff, shininess: 50 });

    const parts = [
        { name: 'head', geo: new THREE.SphereGeometry(0.12, 12, 12), mat: jointMat, pos: [0, 1.7, 0] },
        { name: 'torso', geo: new THREE.BoxGeometry(0.4, 0.45, 0.18), mat, pos: [0, 1.35, 0] },
        { name: 'hips', geo: new THREE.BoxGeometry(0.35, 0.2, 0.16), mat, pos: [0, 1.05, 0] },
    ];
    ['l', 'r'].forEach((side, i) => {
        const x = i === 0 ? -0.22 : 0.22;
        parts.push(
            { name: `${side}UpperArm`, geo: new THREE.CylinderGeometry(0.04, 0.035, 0.28, 8), mat, pos: [x * 1.3, 1.42, 0] },
            { name: `${side}ForeArm`, geo: new THREE.CylinderGeometry(0.035, 0.03, 0.26, 8), mat, pos: [x * 1.3, 1.1, 0] },
            { name: `${side}Thigh`, geo: new THREE.CylinderGeometry(0.055, 0.045, 0.38, 8), mat, pos: [x * 0.65, 0.8, 0] },
            { name: `${side}Shin`, geo: new THREE.CylinderGeometry(0.04, 0.035, 0.36, 8), mat, pos: [x * 0.65, 0.4, 0] },
            { name: `${side}Foot`, geo: new THREE.BoxGeometry(0.07, 0.04, 0.12), mat: jointMat, pos: [x * 0.65, 0.1, 0.02] }
        );
    });

    parts.forEach(p => {
        const mesh = new THREE.Mesh(p.geo, p.mat);
        mesh.position.set(...p.pos);
        mesh.name = p.name;
        mesh.castShadow = true;
        avatarBody.add(mesh);
    });
    avatarScene.add(avatarBody);

    function animateAvatar() {
        avatarAnimId = requestAnimationFrame(animateAvatar);
        avatarBody.position.y = Math.sin(Date.now() * 0.001) * 0.015;
        avatarRenderer.render(avatarScene, avatarCamera);
    }
    animateAvatar();
}

function update3DAvatar(landmarks) {
    if (!avatarBody) return;
    // Simple mirroring: move body parts based on landmark positions
    const get = name => avatarBody.getObjectByName(name);
    const head = get('head');
    if (head && landmarks[0]) {
        head.position.x = -(landmarks[0].x - 0.5) * 0.5;
        head.position.y = 1.7 - (landmarks[0].y - 0.3) * 0.3;
    }
}

// ══════════════════════════════════════════════════════════════════
//  LUNA AI VIEW
// ══════════════════════════════════════════════════════════════════
let lunaListening = false;
let lunaRecognition = null;

function renderLuna(container) {
    container.innerHTML = `
        <div class="mb-6">
            <h2 style="font-family:var(--font-display);font-size:2rem;font-weight:800">Luna AI <span class="text-gradient">Assistant</span></h2>
            <p style="color:var(--text-dim);font-size:0.85rem">Health & fitness coaching — not medical advice. Say "Start Luna" or type below.</p>
        </div>

        <div class="glass-card rounded-xl" style="display:flex;flex-direction:column;height:calc(100vh - 220px);min-height:400px">
            <div id="luna-chat" class="flex-1 overflow-y-auto p-4 space-y-3" style="scroll-behavior:smooth">
                <div class="luna-msg luna-msg-bot">
                    Hi! I'm Luna. I can help you navigate the app, explain features, and discuss fitness goals. Try a prompt below.
                </div>
            </div>

            <div class="p-4 border-t" style="border-color:rgba(255,255,255,0.04)">
                <div class="flex flex-wrap gap-2 mb-3">
                    <button class="luna-prompt" onclick="lunaAsk('What exercises help build chest?')">Chest workout</button>
                    <button class="luna-prompt" onclick="lunaAsk('How much protein do I need?')">Protein needs</button>
                    <button class="luna-prompt" onclick="lunaAsk('What yoga pose helps back pain?')">Yoga for back</button>
                    <button class="luna-prompt" onclick="lunaAsk('How to calculate BMI?')">BMI info</button>
                </div>
                <div class="flex gap-2">
                    <input type="text" id="luna-input" placeholder="Ask Luna..." class="auth-input flex-1" onkeydown="if(event.key==='Enter')lunaAsk()">
                    <button onclick="lunaAsk()" class="btn-primary text-sm px-6">Send</button>
                    <button onclick="toggleLunaVoice()" class="btn-secondary text-sm px-3" id="luna-voice-btn">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/></svg>
                    </button>
                </div>
                <p style="font-size:0.65rem;color:var(--text-subtle);margin-top:0.5rem">Voice: click mic in sidebar or say "Start Luna". Luna does not diagnose medical conditions.</p>
            </div>
        </div>
    `;
}

window.lunaAsk = async function(text) {
    const input = document.getElementById('luna-input');
    const msg = text || input?.value?.trim();
    if (!msg) return;
    if (input) input.value = '';

    const chat = document.getElementById('luna-chat');
    if (!chat) return;

    chat.innerHTML += `<div class="luna-msg luna-msg-user">${msg}</div>`;
    chat.innerHTML += `<div class="luna-msg luna-msg-bot" id="luna-typing" style="color:var(--text-dim)"><div class="loading-spinner" style="width:1rem;height:1rem;border-width:1.5px"></div></div>`;
    chat.scrollTop = chat.scrollHeight;

    try {
        const res = await fetch(API_BASE + '/v1/luna/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: msg })
        });
        const data = await res.json();
        const typing = document.getElementById('luna-typing');
        if (typing) {
            typing.id = '';
            typing.style.color = '';
            typing.innerHTML = data.reply || 'Sorry, I couldn\'t process that.';
        }
        if (window.speak) window.speak(data.reply);
    } catch (e) {
        const typing = document.getElementById('luna-typing');
        if (typing) { typing.id = ''; typing.innerHTML = 'Connection error. Please check the server.'; typing.style.color = 'var(--danger)'; }
    }
    chat.scrollTop = chat.scrollHeight;
};

window.toggleLunaVoice = function() {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) return;
    const widget = document.getElementById('luna-mic-widget');
    const orb = document.getElementById('luna-orb-sidebar');

    if (lunaListening) {
        lunaRecognition?.stop();
        lunaListening = false;
        widget?.classList.remove('luna-listening');
        return;
    }

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    lunaRecognition = new SR();
    lunaRecognition.continuous = false;
    lunaRecognition.interimResults = false;
    lunaListening = true;
    widget?.classList.add('luna-listening');

    lunaRecognition.onresult = e => {
        const text = e.results[0][0].transcript;
        lunaListening = false;
        widget?.classList.remove('luna-listening');
        if (currentView !== 'luna') nav('luna');
        setTimeout(() => lunaAsk(text), 300);
    };

    lunaRecognition.onerror = () => { lunaListening = false; widget?.classList.remove('luna-listening'); };
    lunaRecognition.onend = () => { lunaListening = false; widget?.classList.remove('luna-listening'); };
    lunaRecognition.start();
};

window.startLunaVoice = window.toggleLunaVoice;

// ══════════════════════════════════════════════════════════════════
//  EXPORT VIEW
// ══════════════════════════════════════════════════════════════════
function renderExport(container) {
    container.innerHTML = `
        <div class="mb-6">
            <h2 style="font-family:var(--font-display);font-size:2rem;font-weight:800">Export & <span class="text-gradient">Share</span></h2>
            <p style="color:var(--text-dim);font-size:0.85rem">Download health reports or send them via email</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Email Report -->
            <div class="glass-card p-6 rounded-xl">
                <h3 style="font-family:var(--font-display);font-size:1.25rem;font-weight:800;margin-bottom:1rem">Email Report</h3>
                <p style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:1rem">Send your BMI, nutrition plan, and workout data to your email.</p>
                <label class="block text-xs font-semibold mb-1" style="color:var(--text-dim)">EMAIL ADDRESS</label>
                <input type="email" id="export-email" placeholder="your@email.com" class="auth-input mb-4">
                <button onclick="sendEmailReport()" class="btn-primary w-full" id="email-send-btn">Send Report</button>
                <p id="email-status" style="font-size:0.8rem;margin-top:0.5rem;min-height:1.2rem;color:var(--text-dim)"></p>
            </div>

            <!-- PDF Download -->
            <div class="glass-card p-6 rounded-xl">
                <h3 style="font-family:var(--font-display);font-size:1.25rem;font-weight:800;margin-bottom:1rem">Download Report</h3>
                <p style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:1rem">Generate a comprehensive PDF with BMI metrics, meal plan, and gym routine.</p>
                <button onclick="downloadPDF()" class="btn-galaxy w-full" id="pdf-download-btn">Download PDF Report</button>
                <p id="pdf-status" style="font-size:0.8rem;margin-top:0.5rem;min-height:1.2rem;color:var(--text-dim)"></p>
            </div>
        </div>
    `;
}

window.sendEmailReport = async function() {
    const email = document.getElementById('export-email')?.value?.trim();
    const status = document.getElementById('email-status');
    const btn = document.getElementById('email-send-btn');
    if (!email) { if (status) status.textContent = 'Please enter an email.'; return; }
    if (btn) btn.disabled = true;
    if (status) { status.textContent = 'Sending...'; status.style.color = 'var(--text-dim)'; }

    try {
        const res = await fetch(API_BASE + '/v1/email-report', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const data = await res.json();
        if (status) {
            status.textContent = data.sent ? '✓ Report sent!' : data.message || 'Could not send.';
            status.style.color = data.sent ? 'var(--success)' : 'var(--warning)';
        }
    } catch (e) {
        if (status) { status.textContent = 'Server error.'; status.style.color = 'var(--danger)'; }
    }
    if (btn) btn.disabled = false;
};

window.downloadPDF = async function() {
    const status = document.getElementById('pdf-status');
    const btn = document.getElementById('pdf-download-btn');
    if (btn) btn.disabled = true;
    if (status) { status.textContent = 'Generating PDF...'; status.style.color = 'var(--text-dim)'; }

    try {
        const res = await fetch(API_BASE + '/v1/export/pdf', { method: 'POST' });
        if (!res.ok) throw new Error('Failed');
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'luminix_report.pdf';
        document.body.appendChild(a);
        a.click(); a.remove();
        URL.revokeObjectURL(url);
        if (status) { status.textContent = '✓ Download started!'; status.style.color = 'var(--success)'; }
    } catch (e) {
        if (status) { status.textContent = 'Failed to generate PDF.'; status.style.color = 'var(--danger)'; }
    }
    if (btn) btn.disabled = false;
};
