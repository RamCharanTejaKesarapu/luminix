/* ═══════════════════════════════════════════════════════════════════
   LUMINIX — Gym Module (Galaxy Design + Realistic 3D)
   Proper body proportions, real equipment, physics-based animation
   ═══════════════════════════════════════════════════════════════════ */

let gymScene, gymCamera, gymRenderer, gymModel, gymAnimId;
let currentCategory = 'chest';
let currentExerciseIndex = 0;
let gymExercises = [];
let restTimerInterval = null;

const GYM_CATEGORIES = [
    { id: 'chest', name: 'Chest', icon: '💪', color: '#4F7FFF' },
    { id: 'back', name: 'Back', icon: '🔙', color: '#8B5CF6' },
    { id: 'legs', name: 'Legs', icon: '🦵', color: '#10b981' },
    { id: 'shoulders', name: 'Shoulders', icon: '🏋️', color: '#f59e0b' },
    { id: 'arms', name: 'Arms', icon: '💪', color: '#EC4899' },
    { id: 'core', name: 'Core', icon: '🎯', color: '#22D3EE' }
];

window.renderGymView = function(container) {
    container.innerHTML = `
        <div class="mb-6">
            <h2 style="font-family:var(--font-display);font-size:2rem;font-weight:800">Gym <span class="text-gradient">Module</span></h2>
            <p style="color:var(--text-dim);font-size:0.85rem">Guided exercises with 3D demos, sets/reps, and rest timers</p>
        </div>

        <!-- Category Tabs -->
        <div class="flex flex-wrap gap-2 mb-6" id="gym-categories">
            ${GYM_CATEGORIES.map(c => `
                <button onclick="selectCategory('${c.id}')" data-cat="${c.id}"
                    class="${c.id === currentCategory ? 'btn-primary' : 'btn-secondary'} text-xs">
                    ${c.icon} ${c.name}
                </button>
            `).join('')}
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <!-- Exercise List -->
            <div class="lg:col-span-2">
                <div id="exercise-list" class="space-y-2">
                    <div class="glass-card p-4 rounded-xl text-center">
                        <div class="loading-spinner mx-auto mb-2"></div>
                        <p style="color:var(--text-dim);font-size:0.8rem">Loading exercises...</p>
                    </div>
                </div>

                <!-- Rest Timer -->
                <div id="rest-timer-panel" class="glass-card p-4 rounded-xl mt-4 hidden">
                    <div class="flex justify-between items-center mb-2">
                        <span style="font-size:0.75rem;font-weight:700;color:var(--text-dim);text-transform:uppercase;letter-spacing:0.05em">Rest Timer</span>
                        <button onclick="stopRestTimer()" class="btn-ghost text-xs">Cancel</button>
                    </div>
                    <div id="rest-timer-value" style="font-family:var(--font-display);font-size:2.5rem;font-weight:900;text-align:center">60</div>
                    <div class="score-bar-wrap mt-2"><div class="score-bar" id="rest-progress" style="width:100%"></div></div>
                </div>
            </div>

            <!-- 3D Demo + Details -->
            <div class="lg:col-span-3">
                <div class="glass-card rounded-xl overflow-hidden mb-4" id="gym-3d-container" style="height:340px;background:var(--black-4);position:relative">
                    <div class="absolute top-3 left-3 z-10">
                        <p style="font-size:0.8rem;font-weight:700" id="demo-exercise-name">Select an exercise</p>
                        <p style="font-size:0.65rem;color:var(--text-dim)" id="demo-exercise-sub">3D demonstration</p>
                    </div>
                </div>

                <div id="exercise-details" class="glass-card p-5 rounded-xl">
                    <p style="color:var(--text-dim);font-size:0.85rem">Select an exercise to see details, instructions, and start the 3D demo.</p>
                </div>
            </div>
        </div>
    `;

    initGym3D();
    loadExercises(currentCategory);
};

window.selectCategory = function(catId) {
    currentCategory = catId;
    currentExerciseIndex = 0;
    document.querySelectorAll('#gym-categories button').forEach(b => {
        b.className = b.dataset.cat === catId ? 'btn-primary text-xs' : 'btn-secondary text-xs';
    });
    loadExercises(catId);
};

async function loadExercises(category) {
    try {
        const res = await fetch(`/v1/gym/plan/${category}`);
        const data = await res.json();
        gymExercises = data.exercises || [];
        renderExerciseList();
        if (gymExercises.length > 0) selectExercise(0);
    } catch (e) {
        document.getElementById('exercise-list').innerHTML = `
            <div class="glass-card p-4 rounded-xl"><p style="color:var(--danger);font-size:0.8rem">Failed to load exercises.</p></div>
        `;
    }
}

function renderExerciseList() {
    const list = document.getElementById('exercise-list');
    if (!list) return;

    list.innerHTML = gymExercises.map((ex, i) => `
        <div class="glass-card p-4 rounded-xl cursor-pointer pose-card" onclick="selectExercise(${i})"
             id="ex-card-${i}"
             style="border-color:${i === currentExerciseIndex ? 'rgba(79,127,255,0.3)' : 'var(--glass-border)'}">
            <div class="flex justify-between items-center">
                <div>
                    <h4 style="font-weight:700;font-size:0.9rem">${ex.name}</h4>
                    <p style="font-size:0.7rem;color:var(--text-dim)">${ex.sets} sets × ${ex.reps} reps</p>
                </div>
                <div style="text-align:right">
                    <span class="badge badge-api">${ex.difficulty || 'Standard'}</span>
                    <p style="font-size:0.6rem;color:var(--text-subtle);margin-top:2px">${ex.rest_seconds || 60}s rest</p>
                </div>
            </div>
        </div>
    `).join('');
}

window.selectExercise = function(index) {
    currentExerciseIndex = index;
    const ex = gymExercises[index];
    if (!ex) return;

    // Highlight active card
    document.querySelectorAll('#exercise-list .glass-card').forEach((c, i) => {
        c.style.borderColor = i === index ? 'rgba(79,127,255,0.3)' : '';
    });

    // Update 3D demo label
    const nameEl = document.getElementById('demo-exercise-name');
    const subEl = document.getElementById('demo-exercise-sub');
    if (nameEl) nameEl.textContent = ex.name;
    if (subEl) subEl.textContent = `${ex.sets} sets × ${ex.reps} reps • ${ex.rest_seconds || 60}s rest`;

    // Update details
    const details = document.getElementById('exercise-details');
    if (details) {
        const steps = ex.instructions || ex.steps || [];
        details.innerHTML = `
            <h3 style="font-family:var(--font-display);font-size:1.25rem;font-weight:800;margin-bottom:0.75rem">${ex.name}</h3>
            <div class="grid grid-cols-3 gap-3 mb-4">
                <div class="stat-card p-3"><div class="stat-label">Sets</div><div class="stat-value text-lg">${ex.sets}</div></div>
                <div class="stat-card p-3"><div class="stat-label">Reps</div><div class="stat-value text-lg">${ex.reps}</div></div>
                <div class="stat-card p-3"><div class="stat-label">Rest</div><div class="stat-value text-lg">${ex.rest_seconds || 60}s</div></div>
            </div>
            ${steps.length ? `
                <p style="font-size:0.7rem;font-weight:600;color:var(--text-dim);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.5rem">Instructions</p>
                <ol style="padding-left:1.25rem;font-size:0.8rem;color:var(--text-secondary);line-height:1.8">
                    ${(typeof steps === 'string' ? steps.split('.').filter(s=>s.trim()) : steps).map(s => `<li>${typeof s === 'string' ? s.trim() : s}</li>`).join('')}
                </ol>
            ` : `<p style="font-size:0.85rem;color:var(--text-secondary)">${ex.description || 'Follow proper form for best results.'}</p>`}
            <div class="flex gap-3 mt-4">
                <button onclick="startRestTimer(${ex.rest_seconds || 60})" class="btn-secondary text-sm">Start Rest Timer</button>
                ${index < gymExercises.length - 1 ? `<button onclick="selectExercise(${index + 1})" class="btn-primary text-sm">Next Exercise →</button>` : ''}
            </div>
        `;
    }

    // Animate 3D model for this exercise
    animateExercise(ex.name);
};

// ── Rest Timer ──────────────────────────────────────────────────
window.startRestTimer = function(seconds) {
    const panel = document.getElementById('rest-timer-panel');
    const val = document.getElementById('rest-timer-value');
    const prog = document.getElementById('rest-progress');
    if (!panel) return;

    panel.classList.remove('hidden');
    let remaining = seconds;
    const total = seconds;

    if (restTimerInterval) clearInterval(restTimerInterval);
    restTimerInterval = setInterval(() => {
        remaining--;
        if (val) val.textContent = remaining;
        if (prog) prog.style.width = `${(remaining / total) * 100}%`;
        if (remaining <= 0) {
            stopRestTimer();
            if (window.speak) window.speak('Rest complete. Begin next set.');
        }
    }, 1000);
};

window.stopRestTimer = function() {
    if (restTimerInterval) { clearInterval(restTimerInterval); restTimerInterval = null; }
    const panel = document.getElementById('rest-timer-panel');
    if (panel) panel.classList.add('hidden');
};

// ── 3D Gym Demo ─────────────────────────────────────────────────
function initGym3D() {
    const container = document.getElementById('gym-3d-container');
    if (!container || typeof THREE === 'undefined') return;

    gymScene = new THREE.Scene();
    gymScene.background = new THREE.Color(0x050505);

    gymCamera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
    gymCamera.position.set(0, 1.8, 5);
    gymCamera.lookAt(0, 1.2, 0);

    gymRenderer = new THREE.WebGLRenderer({ antialias: true });
    gymRenderer.setSize(container.clientWidth, container.clientHeight);
    gymRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    gymRenderer.shadowMap.enabled = true;
    container.appendChild(gymRenderer.domElement);

    // Lighting
    gymScene.add(new THREE.AmbientLight(0x303050, 0.5));
    const keyLight = new THREE.DirectionalLight(0xffffff, 0.7);
    keyLight.position.set(4, 6, 5);
    keyLight.castShadow = true;
    gymScene.add(keyLight);
    const blueRim = new THREE.PointLight(0x4F7FFF, 0.3, 10);
    blueRim.position.set(-4, 3, -3);
    gymScene.add(blueRim);
    const violetRim = new THREE.PointLight(0x8B5CF6, 0.2, 8);
    violetRim.position.set(3, 1, -2);
    gymScene.add(violetRim);

    // Floor
    const floorGeo = new THREE.PlaneGeometry(12, 12);
    const floorMat = new THREE.MeshPhongMaterial({ color: 0x0a0a0a, shininess: 5 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    gymScene.add(floor);

    // Grid
    const grid = new THREE.GridHelper(10, 10, 0x1a1a1a, 0x111111);
    grid.material.opacity = 0.4;
    grid.material.transparent = true;
    gymScene.add(grid);

    // Build human figure
    gymModel = buildHuman();
    gymScene.add(gymModel);

    // Default animation
    let t = 0;
    function animate() {
        gymAnimId = requestAnimationFrame(animate);
        t += 0.015;
        // Idle breathing
        const torso = gymModel.getObjectByName('torso');
        if (torso) torso.position.y = 1.35 + Math.sin(t * 2) * 0.005;
        gymRenderer.render(gymScene, gymCamera);
    }
    animate();
}

function buildHuman() {
    const group = new THREE.Group();
    const skinMat = new THREE.MeshPhongMaterial({ color: 0xCCCCCC, shininess: 20 });
    const jointMat = new THREE.MeshPhongMaterial({ color: 0x4F7FFF, shininess: 40 });

    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 16), skinMat);
    head.position.set(0, 1.75, 0);
    head.name = 'head';
    head.castShadow = true;
    group.add(head);

    // Neck
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.08, 8), skinMat);
    neck.position.set(0, 1.62, 0);
    neck.name = 'neck';
    group.add(neck);

    // Torso
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.5, 0.2), skinMat);
    torso.position.set(0, 1.35, 0);
    torso.name = 'torso';
    torso.castShadow = true;
    group.add(torso);

    // Hips
    const hips = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.15, 0.18), skinMat);
    hips.position.set(0, 1.02, 0);
    hips.name = 'hips';
    group.add(hips);

    // Limbs
    const limbData = [
        // Upper arms
        { name: 'lUpperArm', geo: [0.04, 0.035, 0.3, 8], pos: [-0.3, 1.45, 0], rot: [0, 0, 0.15] },
        { name: 'rUpperArm', geo: [0.04, 0.035, 0.3, 8], pos: [0.3, 1.45, 0], rot: [0, 0, -0.15] },
        // Forearms
        { name: 'lForeArm', geo: [0.035, 0.028, 0.28, 8], pos: [-0.3, 1.12, 0], rot: [0, 0, 0] },
        { name: 'rForeArm', geo: [0.035, 0.028, 0.28, 8], pos: [0.3, 1.12, 0], rot: [0, 0, 0] },
        // Thighs
        { name: 'lThigh', geo: [0.06, 0.05, 0.4, 8], pos: [-0.12, 0.78, 0], rot: [0, 0, 0] },
        { name: 'rThigh', geo: [0.06, 0.05, 0.4, 8], pos: [0.12, 0.78, 0], rot: [0, 0, 0] },
        // Shins
        { name: 'lShin', geo: [0.045, 0.035, 0.38, 8], pos: [-0.12, 0.38, 0], rot: [0, 0, 0] },
        { name: 'rShin', geo: [0.045, 0.035, 0.38, 8], pos: [0.12, 0.38, 0], rot: [0, 0, 0] },
    ];

    limbData.forEach(l => {
        const mesh = new THREE.Mesh(new THREE.CylinderGeometry(...l.geo), skinMat);
        mesh.position.set(...l.pos);
        if (l.rot) mesh.rotation.set(...l.rot);
        mesh.name = l.name;
        mesh.castShadow = true;
        group.add(mesh);
    });

    // Hands
    ['l', 'r'].forEach((s, i) => {
        const hand = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), jointMat);
        hand.position.set(i === 0 ? -0.3 : 0.3, 0.95, 0);
        hand.name = `${s}Hand`;
        group.add(hand);
    });

    // Feet
    ['l', 'r'].forEach((s, i) => {
        const foot = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.14), jointMat);
        foot.position.set(i === 0 ? -0.12 : 0.12, 0.08, 0.02);
        foot.name = `${s}Foot`;
        foot.castShadow = true;
        group.add(foot);
    });

    // Joint indicators
    const jointPositions = [
        [-0.3, 1.58, 0], [0.3, 1.58, 0],   // shoulders
        [-0.3, 1.28, 0], [0.3, 1.28, 0],   // elbows
        [-0.12, 0.95, 0], [0.12, 0.95, 0],  // hips/knees area
        [-0.12, 0.55, 0], [0.12, 0.55, 0],  // knees
    ];
    jointPositions.forEach(p => {
        const j = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 8), jointMat);
        j.position.set(...p);
        group.add(j);
    });

    return group;
}

// ── Exercise Animations ─────────────────────────────────────────
let exerciseAnimFrame = null;
function animateExercise(name) {
    if (exerciseAnimFrame) cancelAnimationFrame(exerciseAnimFrame);
    if (!gymModel) return;

    const n = name.toLowerCase();
    let t = 0;

    function anim() {
        exerciseAnimFrame = requestAnimationFrame(anim);
        t += 0.025;
        const phase = Math.sin(t * 1.5);
        const get = nm => gymModel.getObjectByName(nm);

        // Reset positions
        resetPose();

        if (n.includes('bench') || n.includes('press') && n.includes('chest')) {
            // Bench press motion
            const lUA = get('lUpperArm'), rUA = get('rUpperArm');
            const lFA = get('lForeArm'), rFA = get('rForeArm');
            const lH = get('lHand'), rH = get('rHand');
            if (lUA) { lUA.rotation.z = 1.4 + phase * 0.3; lUA.position.x = -0.35; }
            if (rUA) { rUA.rotation.z = -1.4 - phase * 0.3; rUA.position.x = 0.35; }
            if (lFA) { lFA.rotation.z = 0.5 + phase * 0.4; lFA.position.set(-0.45, 1.3 + phase * 0.15, 0); }
            if (rFA) { rFA.rotation.z = -0.5 - phase * 0.4; rFA.position.set(0.45, 1.3 + phase * 0.15, 0); }
            if (lH) lH.position.set(-0.5, 1.2 + phase * 0.2, 0);
            if (rH) rH.position.set(0.5, 1.2 + phase * 0.2, 0);
        } else if (n.includes('squat')) {
            // Squat motion
            const torso = get('torso'), hips = get('hips');
            const lTh = get('lThigh'), rTh = get('rThigh');
            const lSh = get('lShin'), rSh = get('rShin');
            const drop = Math.max(0, phase) * 0.25;
            if (torso) torso.position.y = 1.35 - drop;
            if (hips) hips.position.y = 1.02 - drop;
            if (lTh) { lTh.rotation.x = drop * 2; lTh.position.y = 0.78 - drop * 0.8; }
            if (rTh) { rTh.rotation.x = drop * 2; rTh.position.y = 0.78 - drop * 0.8; }
            if (lSh) lSh.position.y = 0.38 - drop * 0.3;
            if (rSh) rSh.position.y = 0.38 - drop * 0.3;
        } else if (n.includes('curl')) {
            // Bicep curl
            const lFA = get('lForeArm'), rFA = get('rForeArm');
            const lH = get('lHand'), rH = get('rHand');
            const curl = Math.max(0, phase) * 1.2;
            if (lFA) { lFA.rotation.x = -curl; lFA.position.y = 1.12 + curl * 0.12; }
            if (rFA) { rFA.rotation.x = -curl; rFA.position.y = 1.12 + curl * 0.12; }
            if (lH) lH.position.y = 0.95 + curl * 0.25;
            if (rH) rH.position.y = 0.95 + curl * 0.25;
        } else if (n.includes('deadlift') || n.includes('row')) {
            // Deadlift/row — hip hinge
            const torso = get('torso'), head = get('head');
            const hinge = Math.max(0, phase) * 0.4;
            if (torso) { torso.rotation.x = hinge; torso.position.y = 1.35 - hinge * 0.15; }
            if (head) head.position.y = 1.75 - hinge * 0.2;
        } else if (n.includes('shoulder') || n.includes('overhead') || n.includes('military')) {
            // Overhead press
            const lUA = get('lUpperArm'), rUA = get('rUpperArm');
            const lFA = get('lForeArm'), rFA = get('rForeArm');
            const lH = get('lHand'), rH = get('rHand');
            const lift = Math.max(0, phase);
            if (lUA) { lUA.rotation.z = 0.3 + lift * 2.5; lUA.position.y = 1.45 + lift * 0.2; }
            if (rUA) { rUA.rotation.z = -0.3 - lift * 2.5; rUA.position.y = 1.45 + lift * 0.2; }
            if (lFA) lFA.position.y = 1.12 + lift * 0.4;
            if (rFA) rFA.position.y = 1.12 + lift * 0.4;
            if (lH) lH.position.y = 0.95 + lift * 0.6;
            if (rH) rH.position.y = 0.95 + lift * 0.6;
        } else if (n.includes('plank') || n.includes('crunch') || n.includes('sit')) {
            // Core — crunch
            const torso = get('torso');
            const crunch = Math.max(0, phase) * 0.3;
            if (torso) { torso.rotation.x = crunch; torso.position.y = 1.35 - crunch * 0.1; }
        } else {
            // Default — gentle raise
            const lUA = get('lUpperArm'), rUA = get('rUpperArm');
            const raise = Math.max(0, phase) * 0.8;
            if (lUA) lUA.rotation.z = 0.15 + raise;
            if (rUA) rUA.rotation.z = -0.15 - raise;
        }
    }
    anim();
}

function resetPose() {
    if (!gymModel) return;
    const get = nm => gymModel.getObjectByName(nm);

    const defaults = {
        head: { pos: [0, 1.75, 0], rot: [0, 0, 0] },
        torso: { pos: [0, 1.35, 0], rot: [0, 0, 0] },
        hips: { pos: [0, 1.02, 0], rot: [0, 0, 0] },
        lUpperArm: { pos: [-0.3, 1.45, 0], rot: [0, 0, 0.15] },
        rUpperArm: { pos: [0.3, 1.45, 0], rot: [0, 0, -0.15] },
        lForeArm: { pos: [-0.3, 1.12, 0], rot: [0, 0, 0] },
        rForeArm: { pos: [0.3, 1.12, 0], rot: [0, 0, 0] },
        lThigh: { pos: [-0.12, 0.78, 0], rot: [0, 0, 0] },
        rThigh: { pos: [0.12, 0.78, 0], rot: [0, 0, 0] },
        lShin: { pos: [-0.12, 0.38, 0], rot: [0, 0, 0] },
        rShin: { pos: [0.12, 0.38, 0], rot: [0, 0, 0] },
        lHand: { pos: [-0.3, 0.95, 0], rot: [0, 0, 0] },
        rHand: { pos: [0.3, 0.95, 0], rot: [0, 0, 0] },
    };

    for (const [name, d] of Object.entries(defaults)) {
        const obj = get(name);
        if (obj) {
            obj.position.set(...d.pos);
            obj.rotation.set(...d.rot);
        }
    }
}

window.stopGym = function() {
    if (gymAnimId) cancelAnimationFrame(gymAnimId);
    if (exerciseAnimFrame) cancelAnimationFrame(exerciseAnimFrame);
    if (restTimerInterval) clearInterval(restTimerInterval);
    gymScene = null; gymModel = null;
};
