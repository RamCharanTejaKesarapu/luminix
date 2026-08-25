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

// ── Thunder Environment Engine ──────────────────────────────────
let thunderAnimId;
function initThunderEngine() {
    const canvas = document.getElementById('thunder-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    function resize() {
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = canvas.parentElement.clientHeight;
    }
    
    // Particles (Sparks & Fragments)
    const particles = [];
    for (let i = 0; i < 80; i++) {
        particles.push({
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            s: Math.random() * 3 + 1,
            c: Math.random() > 0.5 ? '#FFE94A' : '#00E5FF',
            vx: (Math.random() - 0.5) * 1,
            vy: (Math.random() - 0.5) * 1 - 0.5,
            life: Math.random()
        });
    }

    // Lightning branches
    let lightnings = [];
    function createLightning() {
        if (Math.random() > 0.05) return; // Rare controlled bursts
        const startX = Math.random() > 0.5 ? (Math.random() > 0.5 ? 0 : canvas.width) : Math.random() * canvas.width;
        const startY = startX === 0 || startX === canvas.width ? Math.random() * canvas.height : 0;
        
        lightnings.push({
            x: startX, y: startY,
            targetX: canvas.width / 2 + (Math.random() - 0.5) * 200,
            targetY: canvas.height / 2 + (Math.random() - 0.5) * 200,
            life: 1.0,
            color: Math.random() > 0.3 ? '#FFE94A' : '#00E5FF',
            segments: []
        });
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Update particles
        particles.forEach(p => {
            p.x += p.vx; p.y += p.vy;
            p.life -= 0.005;
            if (p.life <= 0 || p.y < 0) {
                p.y = canvas.height; p.x = Math.random() * canvas.width; p.life = 1;
            }
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.c;
            ctx.shadowBlur = 10;
            ctx.shadowColor = p.c;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.s, 0, Math.PI * 2);
            ctx.fill();
        });
        
        // Update Lightning
        createLightning();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'miter';
        
        for (let i = lightnings.length - 1; i >= 0; i--) {
            let l = lightnings[i];
            l.life -= 0.08;
            if (l.life <= 0) { lightnings.splice(i, 1); continue; }
            
            // Draw
            ctx.globalAlpha = l.life;
            ctx.strokeStyle = '#FFFCE0';
            ctx.lineWidth = 3;
            ctx.shadowBlur = 20;
            ctx.shadowColor = l.color;
            
            ctx.beginPath();
            ctx.moveTo(l.x, l.y);
            let cx = l.x, cy = l.y;
            // Fake jagged line to target
            for (let j = 0; j < 5; j++) {
                cx += (l.targetX - l.x) / 5 + (Math.random() - 0.5) * 100;
                cy += (l.targetY - l.y) / 5 + (Math.random() - 0.5) * 100;
                ctx.lineTo(cx, cy);
            }
            ctx.stroke();
        }
        
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
        thunderAnimId = requestAnimationFrame(draw);
    }
    
    resize();
    window.addEventListener('resize', resize);
    draw();
}
function stopThunderEngine() { if (thunderAnimId) cancelAnimationFrame(thunderAnimId); }

// ── Custom Cursor & Interaction ───────────────────────────────────────────────
(function initCursor() {
    if (window.matchMedia('(pointer: coarse)').matches) return;
    const dot = document.getElementById('cursor-dot');
    const ring = document.getElementById('cursor-ring');
    const label = document.getElementById('cursor-label');
    if (!dot || !ring) return;
    let mx = 0, my = 0, rx = 0, ry = 0;

    document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });

    function animate() {
        rx += (mx - rx) * 0.15;
        ry += (my - ry) * 0.15;
        dot.style.transform = `translate(${mx}px, ${my}px)`;
        ring.style.transform = `translate(${rx}px, ${ry}px)`;
        if(label) label.style.transform = `translate(${rx}px, ${ry}px)`;
        requestAnimationFrame(animate);
    }
    animate();

    document.addEventListener('mouseover', e => {
        const tHover = e.target.closest('button, a, .nav-item, .qa-card, .pose-card, .luna-prompt, .auth-oauth-btn, [onclick]');
        const tView = e.target.closest('.hero-character, .feature-image, .hero-section');
        
        document.body.classList.remove('cursor-hover', 'cursor-view');
        if (tView) document.body.classList.add('cursor-view');
        else if (tHover) document.body.classList.add('cursor-hover');
    });

    // Two-Layer Hero Interaction
    document.addEventListener('mousemove', e => {
        const heroSection = document.getElementById('hero-section');
        const actionLayer = document.getElementById('hero-action-layer');
        if (heroSection && actionLayer) {
            const rect = heroSection.getBoundingClientRect();
            if (mx >= rect.left && mx <= rect.right && my >= rect.top && my <= rect.bottom) {
                const relX = mx - rect.left;
                const relY = my - rect.top;
                
                // Show action layer with an organic/soft radial gradient mask
                actionLayer.style.opacity = '1';
                actionLayer.style.maskImage = `radial-gradient(circle 350px at ${relX}px ${relY}px, black 30%, transparent 80%)`;
                actionLayer.style.webkitMaskImage = `radial-gradient(circle 350px at ${relX}px ${relY}px, black 30%, transparent 80%)`;
            } else {
                actionLayer.style.opacity = '0';
            }
        }
    });
})();

// ── Navigation ──────────────────────────────────────────────────
window.nav = function(view) {
    if (!window.requireAuth || !window.requireAuth()) {
        window.renderAuthView?.();
        return;
    }
    if (currentView === 'live-pose') stopPoseEngine();
    if (currentView === 'gym' && window.stopGym) window.stopGym();
    if (currentView === 'yoga' && window.stopYoga) window.stopYoga();
    stopThunderEngine();

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
        case 'bmi': window.renderBMIView?.(container); break;
        case 'food-tracker': window.renderFoodTrackerView?.(container); break;
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

    // Luna Assistant - text-focused, voice disabled
});

// ── Voice disabled (Silent no-op) ───────────────────────────────
window.speak = function(_) {};

// ══════════════════════════════════════════════════════════════════
//  DASHBOARD VIEW — Cinematic hero + Thunder Engine
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
        <!-- Cinematic Hero Section -->
        <div class="hero-wrapper" id="hero-section" style="cursor: none; position: relative;">
            
            <!-- Layer A: Base Character (Normal Toji) -->
            <div class="hero-character" id="hero-char-layer">
                <img src="/assets/toji/hero/normal.jpg" alt="Toji Fushiguro Base" />
            </div>

            <!-- Layer B: Interactive Action Video/Reveal (Muscle Toji) -->
            <!-- Placeholder structure supports video -> video or image -> video replacements -->
            <div class="hero-character-reveal" id="hero-action-layer">
                <video src="/assets/toji/hero/muscle.mp4" autoplay loop muted playsinline 
                    onerror="this.outerHTML='<img src=\\'https://images.unsplash.com/photo-1574680096145-d05b474e2155?auto=format&fit=crop&w=1920&q=80\\' alt=\\'Toji Action Placeholder\\' style=\\'width:100%;height:100%;object-fit:cover;\\' />'">
                </video>
            </div>

            <!-- Foreground Content Overlay -->
            <div class="hero-content" style="position: absolute; inset: 0; z-index: 10; display: flex; flex-direction: column; justify-content: center; align-items: flex-start; padding: 0 6%; pointer-events: none; max-width: 1400px; margin: 0 auto; width: 100%;">
                
                <h1 class="hero-title text-white" style="font-family: var(--font-display); font-size: clamp(3.5rem, 8vw, 8rem); font-weight: 800; line-height: 0.9; margin: 0; pointer-events: auto; mix-blend-mode: overlay;">
                    TOJI FUSHIGURO <br>
                    <span class="text-cyan" style="font-size: 0.35em; letter-spacing: 0.3em; display: block; margin-top: 1.5rem;">× LUMINIX</span>
                </h1>
                
                <div style="position: absolute; bottom: 8%; left: 6%; right: 6%; display: flex; justify-content: space-between; align-items: flex-end; pointer-events: auto;">
                    <div class="hero-eyebrow text-white" style="letter-spacing: 0.3em; font-size: 0.75rem; opacity: 0.7;">
                        DISCIPLINE / PRECISION / MOVEMENT
                    </div>
                    <button onclick="nav('live-pose')" class="btn-primary" style="background: transparent; color: white; border: 1px solid rgba(255,255,255,0.2); backdrop-filter: blur(8px); padding: 1rem 2.5rem; font-size: 0.8rem; letter-spacing: 0.2em; border-radius: 2px;">
                        ENTER →
                    </button>
                </div>
            </div>
        </div>

        <div class="view-container" style="padding: var(--space-4xl) var(--space-2xl);">
            <!-- Quick Actions -->
            <div class="qa-grid grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-12" style="position:relative; z-index:10; margin-top:-3rem;">
                <div class="qa-card glass-card p-4 rounded-xl cursor-pointer hover:border-yellow/50 transition-all" onclick="nav('live-pose')">
                    <div class="text-xs text-yellow mb-1 font-bold uppercase tracking-wider">Live Pose</div>
                    <p class="text-[11px] text-secondary">Real-time form tracking</p>
                </div>
                <div class="qa-card glass-card p-4 rounded-xl cursor-pointer hover:border-cyan/50 transition-all" onclick="nav('yoga')">
                    <div class="text-xs text-cyan mb-1 font-bold uppercase tracking-wider">Yoga</div>
                    <p class="text-[11px] text-secondary">${yogaCount} guided poses</p>
                </div>
                <div class="qa-card glass-card p-4 rounded-xl cursor-pointer hover:border-yellow/50 transition-all" onclick="nav('gym')">
                    <div class="text-xs text-yellow mb-1 font-bold uppercase tracking-wider">Gym</div>
                    <p class="text-[11px] text-secondary">${gymCount} categories & 3D</p>
                </div>
                <div class="qa-card glass-card p-4 rounded-xl cursor-pointer hover:border-cyan/50 transition-all" onclick="nav('bmi')">
                    <div class="text-xs text-cyan mb-1 font-bold uppercase tracking-wider">BMI & Health</div>
                    <p class="text-[11px] text-secondary">Metabolics & macros</p>
                </div>
                <div class="qa-card glass-card p-4 rounded-xl cursor-pointer hover:border-yellow/50 transition-all" onclick="nav('food-tracker')">
                    <div class="text-xs text-yellow mb-1 font-bold uppercase tracking-wider">Food Tracker</div>
                    <p class="text-[11px] text-secondary">Daily meals & recipes</p>
                </div>
                <div class="qa-card glass-card p-4 rounded-xl cursor-pointer hover:border-cyan/50 transition-all" onclick="nav('luna')">
                    <div class="text-xs text-cyan mb-1 font-bold uppercase tracking-wider">Luna AI</div>
                    <p class="text-[11px] text-secondary">Health assistant</p>
                </div>
            </div>

            <div class="energy-line yellow"></div>

            <!-- Cinematic Feature 1 -->
            <div class="feature-section grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                <div class="feature-text">
                    <h2 class="text-4xl mb-4 text-white">LIVE <span class="text-cyan">POSE TRACKING</span></h2>
                    <p class="text-secondary mb-6 leading-relaxed">Webcam skeleton overlay, real-time scoring, 12-second risk alerts, and a 3D mirror avatar guiding your movements with precision accuracy.</p>
                    <button onclick="nav('live-pose')" class="btn-secondary">Start Tracking</button>
                </div>
                <div class="glass-card rounded-2xl overflow-hidden aspect-video relative feature-image" style="box-shadow: 0 0 50px rgba(0,229,255,0.1)">
                    <div style="position:absolute;inset:0;background:url('https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=80') center/cover; opacity:0.6; mix-blend-mode:luminosity;"></div>
                    <div style="position:absolute;inset:0;background:linear-gradient(45deg, rgba(0,229,255,0.2), transparent);"></div>
                </div>
            </div>

            <div class="energy-line"></div>

            <!-- Stats Grid -->
            <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
                <div class="stat-card glass-card p-4 rounded-lg text-center cursor-pointer" onclick="nav('live-pose')">
                    <div class="text-xs text-dim mb-1">Posture Score <span class="badge badge-cyan">LIVE</span></div>
                    <div class="text-2xl font-bold text-white">—</div>
                </div>
                <div class="stat-card glass-card p-4 rounded-lg text-center cursor-pointer hover:border-yellow/40 transition-all" onclick="nav('bmi')">
                    <div class="text-xs text-dim mb-1">BMI <span class="badge badge-yellow">CALC</span></div>
                    <div class="text-2xl font-bold text-white" id="dash-bmi">23.5</div>
                    <button onclick="event.stopPropagation(); nav('bmi');" class="btn-ghost text-xs mt-2 text-cyan">Open Module →</button>
                </div>
                <div class="stat-card glass-card p-4 rounded-lg text-center cursor-pointer hover:border-cyan/40 transition-all" onclick="nav('food-tracker')">
                    <div class="text-xs text-dim mb-1">Food Tracker <span class="badge badge-cyan">MEALS</span></div>
                    <div class="text-2xl font-bold text-white" id="dash-calories">Daily Log</div>
                    <button onclick="event.stopPropagation(); nav('food-tracker');" class="btn-ghost text-xs mt-2 text-yellow">Track Food →</button>
                </div>
                <div class="stat-card glass-card p-4 rounded-lg text-center cursor-pointer" onclick="nav('gym')">
                    <div class="text-xs text-dim mb-1">Gym Categories <span class="badge badge-yellow">API</span></div>
                    <div class="text-2xl font-bold text-white">${gymCount}</div>
                </div>
            </div>
            
            <div class="text-center py-20">
                <h2 class="text-3xl mb-6 text-white">READY TO <span class="text-yellow">EXPERIENCE</span></h2>
                <button onclick="nav('live-pose')" class="btn-primary text-xl px-12 py-4">GET STARTED</button>
            </div>
        </div>
    `;

    initThunderEngine();
    initParallax();
    fetchDemoBMI();
}

// ── Mouse Parallax ──────────────────────────────────────────────
function initParallax() {
    const heroWrapper = document.getElementById('hero-section');
    const bgLayer = document.getElementById('hero-bg-layer');
    const canvasLayer = document.getElementById('thunder-canvas');
    const charLayer = document.getElementById('hero-char-layer');
    
    if (!heroWrapper) return;
    
    heroWrapper.addEventListener('mousemove', e => {
        const x = (e.clientX / window.innerWidth - 0.5);
        const y = (e.clientY / window.innerHeight - 0.5);
        
        // Layer 1: background: 2-4px
        if (bgLayer) bgLayer.style.transform = `translate(${x * 10}px, ${y * 10}px)`;
        // Layer 2: lightning: 5-8px
        if (canvasLayer) canvasLayer.style.transform = `translate(${x * 20}px, ${y * 20}px)`;
        // Layer 3: character: 8-12px
        if (charLayer) charLayer.style.transform = `translate(calc(-50% + ${x * 40}px), ${y * 40}px)`;
    });
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

// ── BMI & Nutrition Dashboard Integration ────────────────────────
async function fetchDemoBMI() {
    try {
        const savedProfile = localStorage.getItem('luminix_nutrition_profile');
        if (savedProfile) {
            const p = JSON.parse(savedProfile);
            const h = (p.height_cm || 175) / 100;
            const bmi = (p.weight_kg || 72) / (h * h);
            const el = document.getElementById('dash-bmi');
            if (el) el.textContent = bmi.toFixed(1);
        } else {
            const res = await fetch(API_BASE + '/v1/nutrition/metrics', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ age: 25, gender: 'male', height_cm: 175, weight_kg: 72, activity_level: 'moderate', fitness_goal: 'maintenance', diet_preference: 'non_vegetarian', allergies: [] })
            });
            const d = await res.json();
            const el = document.getElementById('dash-bmi');
            if (el) el.textContent = d.bmi?.toFixed(1) || '23.5';
        }

        // Also check today's food log totals
        const todayStr = new Date().toISOString().split('T')[0];
        const foodLogs = JSON.parse(localStorage.getItem('luminix_food_logs') || '{}');
        if (foodLogs[todayStr]) {
            const allItems = [...(foodLogs[todayStr].breakfast || []), ...(foodLogs[todayStr].lunch || []), ...(foodLogs[todayStr].dinner || []), ...(foodLogs[todayStr].snacks || [])];
            const totalKcal = allItems.reduce((acc, it) => acc + (it.kcal || 0), 0);
            const calEl = document.getElementById('dash-calories');
            if (calEl && totalKcal > 0) calEl.textContent = `${totalKcal} kcal`;
        }
    } catch (_) {}
}

window.openBMICalc = function() {
    nav('bmi');
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
        <div class="mb-6 relative overflow-hidden p-8 rounded-xl glass-card" style="background: linear-gradient(90deg, var(--black-1) 30%, transparent), url('/assets/media_1787652686705.jpg') center/cover; background-blend-mode: multiply; background-position: center 20%;">
            <div class="relative z-10">
                <div class="text-cyan mb-2" style="font-size: 0.65rem; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase;">MODULE // ANALYSIS</div>
                <h2 style="font-family:var(--font-display);font-size:3rem;font-weight:800;text-transform:uppercase;line-height:1;margin-bottom:0.5rem">Live <span class="text-yellow" style="font-size:0.5em; letter-spacing:0.1em;">POSE</span></h2>
                <p style="color:var(--text-secondary);font-size:0.85rem; max-width: 400px;">Real-time form tracking and risk detection. Precision over everything.</p>
            </div>
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
        grad.addColorStop(0, 'rgba(0,229,255,0.9)');
        grad.addColorStop(1, 'rgba(255,196,0,0.9)');
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
        ctx.fillStyle = 'rgba(0,229,255,0.25)';
        ctx.fill();
        // Inner node
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        ctx.strokeStyle = '#00E5FF';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    // Head
    const nose = landmarks[0];
    if (nose && nose.visibility > 0.3) {
        ctx.beginPath();
        ctx.arc(nose.x * w, nose.y * h, 12, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,229,255,0.3)';
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
    const rimLight = new THREE.PointLight(0x00E5FF, 0.3, 8);
    rimLight.position.set(-3, 2, -2);
    avatarScene.add(rimLight);

    // Grid
    const grid = new THREE.GridHelper(8, 8, 0x222222, 0x181818);
    grid.material.opacity = 0.3;
    grid.material.transparent = true;
    avatarScene.add(grid);

    // Avatar body
    avatarBody = new THREE.Group();
    const mat = new THREE.MeshPhongMaterial({ color: 0x00E5FF, shininess: 30 });
    const jointMat = new THREE.MeshPhongMaterial({ color: 0xFFC400, shininess: 50 });

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
        <div class="mb-6 relative overflow-hidden p-8 rounded-xl glass-card" style="background: linear-gradient(90deg, var(--black-1) 30%, transparent), url('/assets/media_1787652701377.jpg') center/cover; background-blend-mode: multiply; background-position: center 30%;">
            <div class="relative z-10">
                <div class="text-cyan mb-2" style="font-size: 0.65rem; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase;">MODULE // INTELLIGENCE</div>
                <h2 style="font-family:var(--font-display);font-size:3rem;font-weight:800;text-transform:uppercase;line-height:1;margin-bottom:0.5rem">Luna <span class="text-cyan" style="font-size:0.5em; letter-spacing:0.1em;">AI</span></h2>
                <p style="color:var(--text-secondary);font-size:0.85rem; max-width: 400px;">Analyze. Adapt. Improve. Say "Start Luna" or type below.</p>
            </div>
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
                    <button class="luna-prompt" onclick="lunaAsk('How much protein and calories do I need daily?')">Protein & Macros</button>
                    <button class="luna-prompt" onclick="lunaAsk('Suggest a healthy high-protein meal plan')">Meal Plan</button>
                    <button class="luna-prompt" onclick="lunaAsk('How to calculate and improve my BMI?')">BMI & Metabolism</button>
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
        <div class="mb-6 relative overflow-hidden p-8 rounded-xl glass-card" style="background: linear-gradient(90deg, var(--black-1) 30%, transparent), url('/assets/media_1787652701395.jpg') center/cover; background-blend-mode: multiply; background-position: center 10%;">
            <div class="relative z-10">
                <div class="text-yellow mb-2" style="font-size: 0.65rem; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase;">MODULE // DATA</div>
                <h2 style="font-family:var(--font-display);font-size:3rem;font-weight:800;text-transform:uppercase;line-height:1;margin-bottom:0.5rem">Export <span class="text-yellow" style="font-size:0.5em; letter-spacing:0.1em;">REPORT</span></h2>
                <p style="color:var(--text-secondary);font-size:0.85rem; max-width: 400px;">Extract your health intelligence data. Download or share securely.</p>
            </div>
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
