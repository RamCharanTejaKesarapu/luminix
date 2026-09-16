/* ═══════════════════════════════════════════════════════════════════
   LUMINIX — Gym Module & AI Camera Exercise Rep Counter
   Real-time camera node tracking, automated rep counting, target sets & rest timers
   ═══════════════════════════════════════════════════════════════════ */

let currentCategory = 'chest';
let currentExerciseIndex = 0;
let gymExercises = [];
let restTimerInterval = null;

// Camera & Rep Tracking State
let isRunningGymInference = false;
let gymAnimFrameId = null;
let gymCameraStream = null;
let isGymProcessingInference = false;
let gymTargetLandmarks = null;
let gymInterpolatedLandmarks = null;
let gymFacingMode = 'user';
let gymCameraInstance = null;
let gymPoseEngine = null;
let gymCurrentReps = 0;
let gymTargetReps = 10;
let gymCurrentSet = 1;
let gymTargetSets = 3;
let gymRepState = 'waiting_start'; // 'waiting_start' | 'primed' | 'moving' | 'inflection' | 'returning'
let gymRepStartTime = 0;
let gymInflectionTime = 0;
let gymLastRepTime = 0;
let gymSmoothedAngle = null;
let gymPeakAngle = null;
let gymStartAngle = null;
let gymPrimedSince = 0;
let gymRepQuality = 'Good Form';
let gymViewMode = 'camera'; // 'camera' | 'guide'

const GYM_CATEGORIES = [
    { id: 'chest', name: 'Chest', icon: '💪' },
    { id: 'back', name: 'Back', icon: '🔙' },
    { id: 'legs', name: 'Legs', icon: '🦵' },
    { id: 'shoulders', name: 'Shoulders', icon: '🏋️' },
    { id: 'arms', name: 'Arms', icon: '🦾' },
    { id: 'core', name: 'Core', icon: '🎯' }
];

window.renderGymView = function(container) {
    stopGymCamera();
    container.innerHTML = `
        <div class="module-header flex flex-wrap justify-between items-end gap-4">
            <div>
                <div class="hero-category-tag"><span class="w-2 h-2 rounded-full bg-[var(--vermilion)] inline-block shadow-[0_0_8px_var(--vermilion)] mr-1.5"></span> MODULE 02 // PERFORMANCE & STRENGTH</div>
                <h1 class="module-title-large">GYM <span class="text-vermilion font-display font-extrabold">REP TRACKER.</span></h1>
                <p class="text-secondary text-sm mt-1">Camera-driven real-time rep counting, joint velocity tracking, target sets, and automated rest intervals.</p>
            </div>
        </div>

        <!-- Category Tabs -->
        <div class="flex flex-wrap gap-2 mb-6" id="gym-categories">
            ${GYM_CATEGORIES.map(c => `
                <button onclick="selectCategory('${c.id}')" data-cat="${c.id}"
                    class="nav-btn ${c.id === currentCategory ? 'nav-active' : ''} text-xs font-mono">
                    ${c.icon} ${c.name.toUpperCase()}
                </button>
            `).join('')}
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <!-- Exercise Selection List (4 cols) -->
            <div class="lg:col-span-4 flex flex-col gap-4">
                <div class="module-card p-5">
                    <p class="font-mono text-xs text-secondary font-bold uppercase tracking-wider mb-3">EXERCISE LIBRARY</p>
                    <div id="exercise-list" class="space-y-2.5 max-h-[560px] overflow-y-auto pr-1">
                        <div class="p-6 rounded-xl text-center">
                            <div class="loading-spinner mx-auto mb-2"></div>
                            <p class="text-secondary text-xs">Loading exercises...</p>
                        </div>
                    </div>
                </div>

                <!-- Rest Timer Panel -->
                <div id="rest-timer-panel" class="module-card p-5 hidden border border-amber-300 bg-amber-50/40">
                    <div class="flex justify-between items-center mb-2">
                        <span class="font-mono text-xs font-bold text-amber-700 uppercase tracking-wider">⏱ REST INTERVAL</span>
                        <button onclick="stopRestTimer()" class="btn-ghost-editorial text-xs py-0.5 px-2">Skip Rest</button>
                    </div>
                    <div id="rest-timer-value" class="font-display text-4xl font-extrabold text-center text-primary my-1">60s</div>
                    <div class="w-full bg-amber-200/50 h-2 rounded-full overflow-hidden mt-2">
                        <div class="bg-amber-500 h-full transition-all duration-300" id="rest-progress" style="width:100%"></div>
                    </div>
                </div>
            </div>

            <!-- Main Interactive Workout Workspace (8 cols) -->
            <div class="lg:col-span-8 flex flex-col gap-4" id="gym-workspace-area">
                <!-- Populated dynamically by selectExercise -->
            </div>
        </div>
    `;

    loadExercises(currentCategory);
};

window.selectCategory = function(catId) {
    currentCategory = catId;
    currentExerciseIndex = 0;
    document.querySelectorAll('#gym-categories button').forEach(b => {
        b.classList.toggle('nav-active', b.dataset.cat === catId);
    });
    loadExercises(catId);
};

async function loadExercises(category) {
    try {
        const res = await fetch(`/v1/gym/plan/${category}`);
        const data = await res.json();
        gymExercises = data.exercises || [];
        if (gymExercises.length === 0) {
            gymExercises = getFallbackGymExercises(category);
        }
        renderExerciseList();
        if (gymExercises.length > 0) selectExercise(0);
    } catch (e) {
        gymExercises = getFallbackGymExercises(category);
        renderExerciseList();
        if (gymExercises.length > 0) selectExercise(0);
    }
}

function getFallbackGymExercises(cat) {
    const fallbackPlans = {
        chest: [
            { name: "Bench Press", sets: 3, reps: 10, rest_seconds: 60, instructions: "Lie on bench with feet flat. Grip bar slightly wider than shoulder width. Lower bar with control to mid-chest, drive up explosively locking out elbows." },
            { name: "Push-ups", sets: 3, reps: 12, rest_seconds: 45, instructions: "Keep core rigid in straight line. Lower chest until 1 inch off floor, push up through palms." },
            { name: "Incline Dumbbell Press", sets: 3, reps: 10, rest_seconds: 60, instructions: "Bench at 30-45° incline. Press dumbbells upward together, squeezing upper chest." },
            { name: "Chest Flyes", sets: 3, reps: 12, rest_seconds: 45, instructions: "Slight elbow bend, open arms wide, squeeze chest together at peak." }
        ],
        legs: [
            { name: "Barbell Squats", sets: 4, reps: 10, rest_seconds: 90, instructions: "Feet shoulder-width apart. Squat down until thighs reach parallel or below, drive up through heels." },
            { name: "Romanian Deadlift", sets: 3, reps: 10, rest_seconds: 60, instructions: "Hinge deeply at hips with soft knees, lower bar along shins feeling deep hamstring stretch, thrust hips forward." },
            { name: "Walking Lunges", sets: 3, reps: 12, rest_seconds: 60, instructions: "Step forward, drop back knee close to floor, alternate legs keeping torso tall." }
        ],
        arms: [
            { name: "Bicep Curls", sets: 3, reps: 12, rest_seconds: 45, instructions: "Pin elbows at ribcage. Curl weight upward squeezing biceps at peak contraction, control eccentric descent." },
            { name: "Hammer Curls", sets: 3, reps: 10, rest_seconds: 45, instructions: "Neutral palms-facing grip. Curl upward targeting brachialis and forearms." },
            { name: "Tricep Pushdown", sets: 3, reps: 12, rest_seconds: 45, instructions: "Keep upper arms stationary, extend forearms down locking triceps." }
        ],
        shoulders: [
            { name: "Overhead Press", sets: 3, reps: 10, rest_seconds: 60, instructions: "Press bar or dumbbells directly overhead from shoulder height. Lock out overhead with tight core." },
            { name: "Lateral Raises", sets: 3, reps: 15, rest_seconds: 45, instructions: "Raise dumbbells laterally to shoulder height with slight elbow lead, control lowering." }
        ],
        back: [
            { name: "Barbell Rows", sets: 3, reps: 10, rest_seconds: 60, instructions: "Hinge at hips with flat back. Pull bar into lower abdomen squeezing scapulae together." },
            { name: "Pull-ups", sets: 3, reps: 8, rest_seconds: 60, instructions: "Overhand grip. Pull chin over bar, control the lowering phase." }
        ],
        core: [
            { name: "Plank Hold", sets: 3, reps: 30, rest_seconds: 45, instructions: "Hold rigid straight line on elbows and toes. Brace abdominal wall tightly." }
        ]
    };
    return fallbackPlans[cat] || fallbackPlans.chest;
}

function renderExerciseList() {
    const list = document.getElementById('exercise-list');
    if (!list) return;

    list.innerHTML = gymExercises.map((ex, i) => {
        const isSelected = i === currentExerciseIndex;
        const targetRepsNum = typeof ex.reps === 'string' ? parseInt(ex.reps.split('-')[0], 10) || 10 : ex.reps || 10;
        return `
        <div class="p-3.5 rounded-xl cursor-pointer transition-all border ${isSelected ? 'border-[var(--vermilion)] bg-[rgba(224,35,28,0.12)] shadow-md' : 'border-[var(--border-subtle)] bg-[rgba(14,19,26,0.85)] hover:border-[rgba(223,231,224,0.3)]'}"
             onclick="selectExercise(${i})" id="gym-ex-${i}">
            <div class="flex justify-between items-center">
                <div>
                    <h4 class="font-display font-bold text-sm text-[var(--bone)]">${ex.name}</h4>
                    <p class="font-mono text-xs text-[var(--bone-dim)] mt-0.5">${ex.sets || 3} sets × ${targetRepsNum} reps</p>
                </div>
                <div class="text-right">
                    <span class="font-mono text-[10px] px-2 py-0.5 rounded-full border ${isSelected ? 'bg-[rgba(224,35,28,0.2)] text-[var(--vermilion)] border-[rgba(224,35,28,0.4)]' : 'bg-[rgba(223,231,224,0.06)] text-[var(--bone-dim)] border-[var(--border-subtle)]'} font-semibold">
                        ${ex.rest_seconds || 60}s rest
                    </span>
                </div>
            </div>
        </div>
        `;
    }).join('');
}

window.selectExercise = function(index) {
    currentExerciseIndex = index;
    const ex = gymExercises[index];
    if (!ex) return;

    // Parse target reps and sets
    gymTargetReps = typeof ex.reps === 'string' ? (parseInt(ex.reps.split('-')[0], 10) || 10) : (ex.reps || 10);
    gymTargetSets = ex.sets || 3;
    gymCurrentReps = 0;
    gymCurrentSet = 1;
    gymRepState = 'start';

    // Highlight active card
    renderExerciseList();
    renderGymWorkspace(ex);
};

function renderGymWorkspace(ex) {
    const area = document.getElementById('gym-workspace-area');
    if (!area) return;

    area.innerHTML = `
        <!-- Workspace Header & Mode Switcher -->
        <div class="module-card p-5 flex flex-wrap justify-between items-center gap-4">
            <div>
                <h3 class="font-display text-xl font-bold text-primary flex items-center gap-2">
                    <span>${ex.name}</span>
                    <span class="font-mono text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200 font-semibold">${currentCategory.toUpperCase()} TARGET</span>
                </h3>
                <p class="text-xs text-secondary mt-1">${ex.instructions ? ex.instructions.slice(0, 100) + '...' : 'Follow proper form for maximum muscle recruitment.'}</p>
            </div>
            <div class="flex items-center gap-2">
                <button onclick="setGymWorkspaceMode('camera')" id="mode-cam-btn" class="${gymViewMode === 'camera' ? 'btn-editorial-primary' : 'btn-secondary-editorial'} text-xs py-1.5 px-3 flex items-center gap-1.5">
                    <span>📷</span> CAMERA REPS
                </button>
                <button onclick="setGymWorkspaceMode('guide')" id="mode-guide-btn" class="${gymViewMode === 'guide' ? 'btn-editorial-primary' : 'btn-secondary-editorial'} text-xs py-1.5 px-3 flex items-center gap-1.5">
                    <span>📋</span> GUIDE
                </button>
            </div>
        </div>

        <div id="gym-mode-container">
            ${gymViewMode === 'camera' ? renderCameraWorkoutUI(ex) : renderGuideUI(ex)}
        </div>
    `;

    if (gymViewMode === 'camera') {
        initGymCamera();
    }
}

window.setGymWorkspaceMode = function(mode) {
    gymViewMode = mode;
    const ex = gymExercises[currentExerciseIndex];
    if (!ex) return;
    const modeCamBtn = document.getElementById('mode-cam-btn');
    const modeGuideBtn = document.getElementById('mode-guide-btn');
    if (modeCamBtn) modeCamBtn.className = (mode === 'camera' ? 'btn-editorial-primary' : 'btn-secondary-editorial') + ' text-xs py-1.5 px-3 flex items-center gap-1.5';
    if (modeGuideBtn) modeGuideBtn.className = (mode === 'guide' ? 'btn-editorial-primary' : 'btn-secondary-editorial') + ' text-xs py-1.5 px-3 flex items-center gap-1.5';

    const container = document.getElementById('gym-mode-container');
    if (!container) return;

    if (mode === 'camera') {
        container.innerHTML = renderCameraWorkoutUI(ex);
        initGymCamera();
    } else {
        stopGymCamera();
        container.innerHTML = renderGuideUI(ex);
    }
};

function renderCameraWorkoutUI(ex) {
    return `
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            <!-- Camera Viewport (7 Cols) -->
            <div class="lg:col-span-7 module-card p-0 rounded-2xl relative overflow-hidden flex flex-col justify-between min-w-0 w-full" style="min-height: 440px; height: 440px; background: #000000;">
                <video id="gym-video" class="camera-video-source" playsinline></video>
                <canvas id="gym-canvas" class="camera-canvas" style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover;"></canvas>

                <!-- Top Camera HUD -->
                <div class="absolute top-3 left-3 right-3 z-20 flex justify-between items-center pointer-events-none">
                    <span class="hud-pill-mono">
                        ${ex.name.toUpperCase()} // REP SENSOR
                    </span>
                    <div id="gym-rep-flash-badge" class="risk-badge risk-safe">● TRACKING</div>
                </div>

                <!-- Posture & Camera Angle Pop-up Alert Toast -->
                <div id="gym-posture-alert-toast" class="posture-alert-toast hidden">
                    <div class="posture-alert-header">
                        <div class="flex items-center gap-1.5">
                            <span class="posture-alert-icon">⚠️</span>
                            <div class="posture-alert-title">POSTURE & CAMERA ANGLE ALERT</div>
                        </div>
                        <button type="button" onclick="dismissPostureAlert(this)" class="posture-alert-close" title="Dismiss Alert">✕</button>
                    </div>
                    <div class="posture-alert-content">
                        <div class="posture-alert-msg">Adjust posture & camera angle</div>
                        <div class="posture-alert-tips"></div>
                    </div>
                </div>

                <!-- Camera Loading Indicator -->
                <div id="gym-camera-loading" class="camera-loading" style="display:none">
                    <div class="loading-spinner mb-3"></div>
                    <p class="text-white font-bold text-sm">Connecting Exercise Tracker...</p>
                    <p class="text-gray-400 font-mono text-xs mt-1">Calibrating joint angles</p>
                </div>

                <!-- Bottom Camera Bar -->
                <div class="absolute bottom-3 left-3 right-3 z-20 flex items-center justify-between pointer-events-auto bg-black/80 backdrop-blur-md p-3 rounded-xl border border-white/10 text-white">
                    <div class="flex items-center gap-2">
                        <span class="font-mono text-[10px] text-gray-400 font-bold uppercase">Joint Angle:</span>
                        <span id="gym-active-angle" class="font-mono text-sm font-bold text-blue-400">0°</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <button onclick="switchGymCameraFacing()" id="gym-flip-cam-btn" class="bg-white/10 hover:bg-white/20 text-white text-xs px-3 py-1.5 rounded-lg font-mono font-bold transition" title="Switch Front/Rear Camera">🔄 FLIP</button>
                        <button onclick="toggleGymCameraStream()" id="gym-camera-toggle-btn" class="bg-blue-600 hover:bg-blue-500 text-white text-xs px-4 py-1.5 rounded-lg font-mono font-bold transition">Stop Camera</button>
                    </div>
                </div>
            </div>

            <!-- Rep & Set Tracker HUD (5 Cols) -->
            <div class="lg:col-span-5 flex flex-col gap-4 min-w-0 w-full">
                <!-- Reps Counter Card -->
                <div class="module-card p-5 text-center relative overflow-hidden">
                    <div class="flex justify-around items-center">
                        <div>
                            <p class="font-mono text-[10px] text-secondary font-bold uppercase tracking-wider">Completed Reps</p>
                            <div class="flex items-baseline justify-center gap-1 mt-1">
                                <span class="font-display text-5xl font-black text-primary" id="gym-rep-display">${gymCurrentReps}</span>
                                <span class="font-mono text-sm text-secondary font-bold">/ <span id="gym-target-reps-lbl">${gymTargetReps}</span></span>
                            </div>
                            <div class="flex justify-center gap-2 mt-3">
                                <button onclick="adjustGymReps(-1)" class="btn-ghost-editorial text-xs px-2.5 py-0.5">-1</button>
                                <button onclick="adjustGymReps(1)" class="btn-ghost-editorial text-xs px-2.5 py-0.5">+1</button>
                            </div>
                        </div>

                        <div class="border-l border-[var(--border-subtle)] pl-5 text-left">
                            <p class="font-mono text-[10px] text-secondary font-bold uppercase tracking-wider">Current Set</p>
                            <div class="font-display text-2xl font-bold text-primary mt-1">
                                Set <span id="gym-set-display" class="text-blue-primary">${gymCurrentSet}</span> / ${gymTargetSets}
                            </div>
                            <button onclick="finishGymSet()" class="btn-editorial-primary text-xs px-3 py-1.5 mt-3 w-full">Complete Set</button>
                        </div>
                    </div>

                    <!-- Rep Form Indicator -->
                    <div class="mt-4 pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs">
                        <span class="text-secondary font-mono">Form Status:</span>
                        <span id="gym-form-status" class="font-mono font-bold text-blue-primary">Ready for Rep 1</span>
                    </div>
                </div>

                <!-- Target Configuration -->
                <div class="module-card p-5 flex flex-col justify-between">
                    <div>
                        <p class="font-mono text-xs text-secondary font-bold uppercase tracking-wider mb-3">WORKOUT SETUP</p>
                        <div class="grid grid-cols-2 gap-3 text-xs">
                            <div>
                                <label class="font-mono text-[10px] text-secondary block mb-1">Target Reps</label>
                                <select onchange="setGymTargetReps(this.value)" class="form-input-editorial text-xs py-1.5 px-2 w-full">
                                    <option value="8" ${gymTargetReps === 8 ? 'selected' : ''}>8 Reps</option>
                                    <option value="10" ${gymTargetReps === 10 ? 'selected' : ''}>10 Reps</option>
                                    <option value="12" ${gymTargetReps === 12 ? 'selected' : ''}>12 Reps</option>
                                    <option value="15" ${gymTargetReps === 15 ? 'selected' : ''}>15 Reps</option>
                                    <option value="20" ${gymTargetReps === 20 ? 'selected' : ''}>20 Reps</option>
                                </select>
                            </div>
                            <div>
                                <label class="font-mono text-[10px] text-secondary block mb-1">Target Sets</label>
                                <select onchange="setGymTargetSets(this.value)" class="form-input-editorial text-xs py-1.5 px-2 w-full">
                                    <option value="3" ${gymTargetSets === 3 ? 'selected' : ''}>3 Sets</option>
                                    <option value="4" ${gymTargetSets === 4 ? 'selected' : ''}>4 Sets</option>
                                    <option value="5" ${gymTargetSets === 5 ? 'selected' : ''}>5 Sets</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div class="mt-4 pt-3 border-t border-[var(--border-subtle)] flex gap-2">
                        <button onclick="startRestTimer(${ex.rest_seconds || 60})" class="btn-secondary-editorial text-xs flex-1">
                            ⏱ Rest (${ex.rest_seconds || 60}s)
                        </button>
                        ${currentExerciseIndex < gymExercises.length - 1 ? `
                            <button onclick="selectExercise(${currentExerciseIndex + 1})" class="btn-editorial-primary text-xs flex-1">
                                Next Exercise →
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        </div>
    `;
}

const CATEGORY_ASSETS = {
    chest: '/assets/Toji Fushiguro Hitting Gym.jpeg',
    back: '/assets/WHATD THEY TO DO HIM.jpeg',
    legs: '/assets/Toji fushiguro (2).jpeg',
    arms: '/assets/Toji (1).jpeg',
    shoulders: '/assets/Toji Fushiguro.jpeg',
    core: '/assets/_.jpeg'
};

function renderGuideUI(ex) {
    const steps = ex.instructions ? (typeof ex.instructions === 'string' ? ex.instructions.split('.').filter(s => s.trim()) : ex.instructions) : [];
    const catImage = CATEGORY_ASSETS[currentCategory] || '/assets/Toji Fushiguro Hitting Gym.jpeg';

    return `
        <div class="module-card p-6">
            <div class="h-48 rounded-xl overflow-hidden relative mb-6 border border-gray-200">
                <img src="${catImage}" alt="Biomechanics technique guide for ${ex.name}" class="w-full h-full object-cover object-center" />
                <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent"></div>
                <div class="absolute bottom-4 left-4 right-4 text-white">
                    <span class="font-mono text-[10px] px-2 py-0.5 rounded-full bg-blue-500 text-white font-bold mb-1 inline-block">${currentCategory.toUpperCase()} TARGET</span>
                    <h3 class="font-display text-2xl font-bold leading-tight">${ex.name}</h3>
                </div>
            </div>

            <h4 class="font-display text-base font-bold mb-3 text-primary">Exercise Technique & Biomechanics</h4>
            <div class="grid grid-cols-3 gap-3 mb-6">
                <div class="p-3 rounded-xl bg-[rgba(14,19,26,0.85)] border border-[var(--border-subtle)] text-center"><div class="font-mono text-[10px] text-[var(--bone-dim)] font-bold uppercase">TARGET SETS</div><div class="font-display text-xl font-bold text-[var(--bone)] mt-0.5">${ex.sets || 3}</div></div>
                <div class="p-3 rounded-xl bg-[rgba(14,19,26,0.85)] border border-[var(--border-subtle)] text-center"><div class="font-mono text-[10px] text-[var(--bone-dim)] font-bold uppercase">TARGET REPS</div><div class="font-display text-xl font-bold text-[var(--bone)] mt-0.5">${ex.reps || 10}</div></div>
                <div class="p-3 rounded-xl bg-[rgba(14,19,26,0.85)] border border-[var(--border-subtle)] text-center"><div class="font-mono text-[10px] text-[var(--bone-dim)] font-bold uppercase">REST INTERVAL</div><div class="font-display text-xl font-bold text-[var(--bone)] mt-0.5">${ex.rest_seconds || 60}s</div></div>
            </div>

            <p class="font-mono text-xs font-bold text-secondary uppercase tracking-wider mb-2">Step-by-Step Instructions</p>
            <ol class="space-y-2 text-xs text-primary list-decimal pl-4 leading-relaxed mb-6">
                ${steps.map(s => `<li>${s.trim()}</li>`).join('')}
            </ol>

            <button onclick="setGymWorkspaceMode('camera')" class="btn-editorial-primary text-sm px-6 py-2.5">
                📷 OPEN CAMERA & TRACK REPS NOW
            </button>
        </div>
    `;
}

window.adjustGymReps = function(delta) {
    gymCurrentReps = Math.max(0, gymCurrentReps + delta);
    const el = document.getElementById('gym-rep-display');
    if (el) el.textContent = gymCurrentReps;
};

window.setGymTargetReps = function(val) {
    gymTargetReps = parseInt(val, 10) || 10;
    const el = document.getElementById('gym-target-reps-lbl');
    if (el) el.textContent = gymTargetReps;
};

window.setGymTargetSets = function(val) {
    gymTargetSets = parseInt(val, 10) || 3;
};

window.finishGymSet = function() {
    const ex = gymExercises[currentExerciseIndex];
    const repsDone = gymCurrentReps || parseInt(document.getElementById('gym-rep-display')?.textContent, 10) || 0;

    // Synchronize completed set with Firebase Cloud Account
    if (window.luminixFirebase && typeof window.luminixFirebase.recordGymSet === 'function') {
        window.luminixFirebase.recordGymSet(ex?.name || 'Exercise', repsDone);
    }

    if (gymCurrentSet < gymTargetSets) {
        gymCurrentSet++;
        gymCurrentReps = 0;
        const setEl = document.getElementById('gym-set-display');
        const repEl = document.getElementById('gym-rep-display');
        if (setEl) setEl.textContent = gymCurrentSet;
        if (repEl) repEl.textContent = '0';

        // Auto trigger rest timer
        startRestTimer(ex?.rest_seconds || 60);
    } else {
        // Workout for this exercise completed
        if (window.luminixFirebase && typeof window.luminixFirebase.recordGymWorkoutComplete === 'function') {
            window.luminixFirebase.recordGymWorkoutComplete(ex?.name || 'Exercise', gymTargetSets, repsDone);
        }
        const badge = document.getElementById('gym-rep-flash-badge');
        if (badge) {
            badge.className = 'risk-badge risk-safe animate-bounce';
            badge.innerHTML = '🎉 ALL SETS COMPLETED!';
        }
        startRestTimer(ex?.rest_seconds || 60);
    }
};

window.switchGymCameraFacing = async function() {
    gymFacingMode = (gymFacingMode === 'user') ? 'environment' : 'user';
    const flipBtn = document.getElementById('gym-flip-cam-btn');
    if (flipBtn) flipBtn.textContent = gymFacingMode === 'user' ? '🔄 Front Cam' : '🔄 Rear Cam';
    if (gymPoseEngine && gymCameraStream) {
        await startGymVideoStream();
    }
};

async function startGymVideoStream() {
    const video = document.getElementById('gym-video');
    if (!video) return;

    if (gymCameraStream) {
        gymCameraStream.getTracks().forEach(t => t.stop());
        gymCameraStream = null;
    }

    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (window.innerWidth <= 768);

    const constraints = {
        video: {
            facingMode: gymFacingMode,
            width: isMobile ? { ideal: 480, max: 720 } : { ideal: 1280, max: 1280 },
            height: isMobile ? { ideal: 640, max: 1280 } : { ideal: 720, max: 720 },
            frameRate: isMobile ? { ideal: 30, max: 30 } : { ideal: 60, max: 60 }
        },
        audio: false
    };

    try {
        gymCameraStream = await navigator.mediaDevices.getUserMedia(constraints);
    } catch (_) {
        try {
            gymCameraStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: gymFacingMode, width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 30 } },
                audio: false
            });
        } catch (e2) {
            gymCameraStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: gymFacingMode },
                audio: false
            });
        }
    }

    video.srcObject = gymCameraStream;
    await video.play();
}

// ── Gym Camera & Rep Counting Engine ───────────────────────────────────
async function initGymCamera() {
    stopGymCamera();
    const loading = document.getElementById('gym-camera-loading');
    if (loading) loading.style.display = 'flex';

    try {
        const video = document.getElementById('gym-video');
        const canvas = document.getElementById('gym-canvas');
        if (!video || !canvas) return;
        const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });

        gymPoseEngine = new Pose({ locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${f}` });
        gymPoseEngine.setOptions({
            modelComplexity: 0,
            smoothLandmarks: true,
            minDetectionConfidence: 0.45,
            minTrackingConfidence: 0.45
        });

        gymPoseEngine.onResults(results => {
            if (loading && loading.style.display !== 'none') loading.style.display = 'none';
            if (results.poseLandmarks) {
                gymTargetLandmarks = results.poseLandmarks;
                processGymExerciseRep(results.poseLandmarks);
            } else {
                gymTargetLandmarks = null;
            }
            isGymProcessingInference = false;
        });

        await gymPoseEngine.initialize();
        await startGymVideoStream();

        // ── High-Performance Visual Rendering Loop ────────────────────────────
        isRunningGymInference = true;
        let lastGymRenderTimestamp = performance.now();
        const gymOffscreenCanvas = document.createElement('canvas');
        const gymOffscreenCtx = gymOffscreenCanvas.getContext('2d', { willReadFrequently: true });
        let lastGymInferenceTimestamp = 0;
        const isMobileDevice = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (window.innerWidth <= 768);
        const minGymInferenceDelta = isMobileDevice ? 38 : 30; // ~26 FPS mobile, ~33 FPS desktop

        function renderGymHighSpeedFrame(timestamp) {
            if (!gymPoseEngine) return;

            const dt = Math.max(0.001, Math.min(0.05, (timestamp - lastGymRenderTimestamp) / 1000));
            lastGymRenderTimestamp = timestamp;

            if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
                canvas.width = canvas.clientWidth;
                canvas.height = canvas.clientHeight;
            }

            const w = canvas.width;
            const h = canvas.height;

            const vp = window.luminixPose.computeCoverViewport(video.videoWidth, video.videoHeight, w, h);

            ctx.save();
            if (gymFacingMode === 'user') {
                ctx.translate(w, 0);
                ctx.scale(-1, 1);
            }

            if (video.readyState >= 2) {
                ctx.drawImage(video, vp.x, vp.y, vp.width, vp.height);
            }

            if (gymTargetLandmarks && gymTargetLandmarks.length > 0) {
                if (!gymInterpolatedLandmarks || gymInterpolatedLandmarks.length !== gymTargetLandmarks.length) {
                    gymInterpolatedLandmarks = gymTargetLandmarks.map(pt => ({ ...pt }));
                } else {
                    const lerpAlpha = 1.0 - Math.exp(-dt * 30.0);
                    for (let i = 0; i < gymTargetLandmarks.length; i++) {
                        const target = gymTargetLandmarks[i];
                        const current = gymInterpolatedLandmarks[i];
                        if (target && current) {
                            current.x += (target.x - current.x) * lerpAlpha;
                            current.y += (target.y - current.y) * lerpAlpha;
                            current.visibility = target.visibility;
                        }
                    }
                }

                window.luminixPose.drawLuminixSkeleton(ctx, gymInterpolatedLandmarks, w, h, {
                    showAngles: true,
                    showFaceTree: true,
                    theme: 'yellow',
                    viewport: vp,
                    aspect: vp.aspect,
                    mirrored: (gymFacingMode === 'user')
                });
            }
            ctx.restore();

            gymAnimFrameId = requestAnimationFrame(renderGymHighSpeedFrame);
        }

        // ── Hardware-Synced & Throttled Inference Loop ───────────────────
        async function runGymInferencePass() {
            if (!gymPoseEngine || !isRunningGymInference) return;
            const now = performance.now();
            if (now - lastGymInferenceTimestamp < minGymInferenceDelta) return;

            if (video && video.readyState >= 2 && !isGymProcessingInference && video.videoWidth > 0 && video.videoHeight > 0) {
                isGymProcessingInference = true;
                lastGymInferenceTimestamp = now;

                const dims = window.luminixPose.getInferenceDimensions(video.videoWidth, video.videoHeight);
                if (gymOffscreenCanvas.width !== dims.width || gymOffscreenCanvas.height !== dims.height) {
                    gymOffscreenCanvas.width = dims.width;
                    gymOffscreenCanvas.height = dims.height;
                }

                gymOffscreenCtx.drawImage(video, 0, 0, dims.width, dims.height);
                try {
                    await gymPoseEngine.send({ image: gymOffscreenCanvas });
                } catch (_) {
                    isGymProcessingInference = false;
                }
            }
        }

        function scheduleNextGymInference() {
            if (!isRunningGymInference) return;
            if ('requestVideoFrameCallback' in video) {
                video.requestVideoFrameCallback(async () => {
                    await runGymInferencePass();
                    scheduleNextGymInference();
                });
            } else {
                setTimeout(async () => {
                    await runGymInferencePass();
                    scheduleNextGymInference();
                }, 16);
            }
        }

        gymAnimFrameId = requestAnimationFrame(renderGymHighSpeedFrame);
        scheduleNextGymInference();

    } catch (e) {
        if (loading) loading.style.display = 'none';
        console.error('Gym camera error:', e);
    }
}

function getJointAngleWithVisibility(landmarks, idxA, idxB, idxC, minVisibility = 0.5, aspect = 1.0) {
    const a = landmarks[idxA], b = landmarks[idxB], c = landmarks[idxC];
    if (!a || !b || !c) return null;
    if ((a.visibility !== undefined && a.visibility < minVisibility) ||
        (b.visibility !== undefined && b.visibility < minVisibility) ||
        (c.visibility !== undefined && c.visibility < minVisibility)) {
        return null;
    }
    return window.luminixPose.calculateAngle(a, b, c, aspect);
}

function processGymExerciseRep(landmarks) {
    const ex = gymExercises[currentExerciseIndex];
    if (!ex || !landmarks || landmarks.length < 25) return;

    const name = (ex.name || '').toLowerCase();
    const now = performance.now();

    const angleEl = document.getElementById('gym-active-angle');
    const formEl = document.getElementById('gym-form-status');
    const video = document.getElementById('gym-video');
    const aspect = (video && video.videoWidth && video.videoHeight) ? (video.videoWidth / video.videoHeight) : 1.0;

    // ── Check Posture & Camera Angle Alert ────────────────────────
    const postureMetrics = window.luminixPose.evaluatePostureRisk(landmarks, { aspect });
    window.luminixPose.renderPostureAlert('gym-posture-alert-toast', postureMetrics);

    // ── 1. Calculate Joint Angles with Visibility Filtering ──────
    let leftAngle = null;
    let rightAngle = null;
    let jointName = 'Joint';
    let startThreshold = 145;
    let inflectionThreshold = 65;
    let returnThreshold = 140;
    let isReversedMovement = false; // true for exercises like overhead press
    let minRomDelta = 45;
    let minDurationMs = 700;

    if (name.includes('squat') || name.includes('lunge') || name.includes('leg press')) {
        // Legs / Squats: Knee joint (23-25-27, 24-26-28)
        jointName = 'Knee Flexion';
        leftAngle = getJointAngleWithVisibility(landmarks, 23, 25, 27, 0.45, aspect);
        rightAngle = getJointAngleWithVisibility(landmarks, 24, 26, 28, 0.45, aspect);
        startThreshold = 150;      // Standing upright
        inflectionThreshold = 100;  // Deep squat depth
        returnThreshold = 145;     // Returned to standing
        minRomDelta = 45;
        minDurationMs = 850;
    } else if (name.includes('bicep') || name.includes('curl')) {
        // Arms / Bicep Curls: Elbow joint (11-13-15, 12-14-16)
        jointName = 'Elbow Flexion';
        leftAngle = getJointAngleWithVisibility(landmarks, 11, 13, 15, 0.45, aspect);
        rightAngle = getJointAngleWithVisibility(landmarks, 12, 14, 16, 0.45, aspect);
        startThreshold = 140;      // Arms extended downward
        inflectionThreshold = 65;  // Top peak squeeze
        returnThreshold = 135;     // Lowered back down
        minRomDelta = 65;
        minDurationMs = 750;
    } else if (name.includes('overhead') || (name.includes('press') && name.includes('shoulder'))) {
        // Shoulders / Overhead Press: Start is low (elbows bent), peak is high (elbows locked)
        jointName = 'Elbow Press';
        leftAngle = getJointAngleWithVisibility(landmarks, 11, 13, 15, 0.45, aspect);
        rightAngle = getJointAngleWithVisibility(landmarks, 12, 14, 16, 0.45, aspect);
        startThreshold = 95;       // Dumbbells at shoulder level
        inflectionThreshold = 150; // Pressed high overhead
        returnThreshold = 100;     // Lowered back to shoulders
        isReversedMovement = true;
        minRomDelta = 50;
        minDurationMs = 800;
    } else if (name.includes('push-up') || name.includes('bench') || name.includes('press') || name.includes('fly')) {
        // Chest / Push-ups / Bench: Elbow joint
        jointName = 'Elbow Angle';
        leftAngle = getJointAngleWithVisibility(landmarks, 11, 13, 15, 0.45, aspect);
        rightAngle = getJointAngleWithVisibility(landmarks, 12, 14, 16, 0.45, aspect);
        startThreshold = 145;      // Arms locked out
        inflectionThreshold = 90;  // Chest to floor/bar
        returnThreshold = 140;     // Pushed back to lockout
        minRomDelta = 50;
        minDurationMs = 800;
    } else if (name.includes('row') || name.includes('pull')) {
        // Back / Rows: Elbow joint
        jointName = 'Elbow Pull';
        leftAngle = getJointAngleWithVisibility(landmarks, 11, 13, 15, 0.45, aspect);
        rightAngle = getJointAngleWithVisibility(landmarks, 12, 14, 16, 0.45, aspect);
        startThreshold = 140;      // Arms extended forward
        inflectionThreshold = 80;  // Pulled into abdomen
        returnThreshold = 135;     // Extended
        minRomDelta = 50;
        minDurationMs = 750;
    } else {
        // General: Spine Angle
        jointName = 'Spine Alignment';
        const midShX = (landmarks[11].x + landmarks[12].x) / 2;
        const midShY = (landmarks[11].y + landmarks[12].y) / 2;
        const midHipX = (landmarks[23].x + landmarks[24].x) / 2;
        const midHipY = (landmarks[23].y + landmarks[24].y) / 2;
        leftAngle = Math.round(Math.abs(Math.atan2((midShX - midHipX) * aspect, midHipY - midShY) * (180 / Math.PI)));
        rightAngle = leftAngle;
        startThreshold = 20;
        inflectionThreshold = 20;
        returnThreshold = 20;
    }

    // Pick best visible angle
    let rawAngle = null;
    if (leftAngle !== null && rightAngle !== null) {
        rawAngle = isReversedMovement ? Math.max(leftAngle, rightAngle) : Math.min(leftAngle, rightAngle);
    } else if (leftAngle !== null) {
        rawAngle = leftAngle;
    } else if (rightAngle !== null) {
        rawAngle = rightAngle;
    }

    if (rawAngle === null || isNaN(rawAngle)) {
        if (angleEl) angleEl.textContent = '--° (Low Visibility)';
        if (formEl) { formEl.textContent = 'Step into full camera view'; formEl.className = 'font-mono text-secondary'; }
        return;
    }

    // ── 2. Exponential Moving Average Filter ──────────────────────
    if (gymSmoothedAngle === null) {
        gymSmoothedAngle = rawAngle;
    } else {
        gymSmoothedAngle = 0.35 * rawAngle + 0.65 * gymSmoothedAngle;
    }
    const currentAngle = Math.round(gymSmoothedAngle);
    if (angleEl) angleEl.textContent = `${currentAngle}° (${jointName})`;

    // ── 3. Biomechanical Rep State Machine ────────────────────────
    if (name.includes('plank')) {
        // Timed hold instead of reps
        if (currentAngle <= 25) {
            if (formEl) { formEl.textContent = '🔥 Perfect rigid plank posture! Holding...'; formEl.className = 'font-mono font-bold text-blue-primary'; }
        } else {
            if (formEl) { formEl.textContent = '⚠️ Keep spine straight and core tight.'; formEl.className = 'font-mono font-bold text-amber-600'; }
        }
        return;
    }

    if (!isReversedMovement) {
        // Standard exercises: Start High (e.g. 150°) -> Inflection Low (e.g. 60°) -> Return High (e.g. 150°)
        switch (gymRepState) {
            case 'waiting_start':
                if (currentAngle >= startThreshold) {
                    if (gymPrimedSince === 0) gymPrimedSince = now;
                    if (now - gymPrimedSince >= 250) {
                        gymRepState = 'primed';
                        gymStartAngle = currentAngle;
                        gymPeakAngle = currentAngle;
                        gymPrimedSince = 0;
                        if (formEl) { formEl.textContent = '🟢 Ready — Begin Rep'; formEl.className = 'font-mono font-bold text-emerald-600'; }
                    }
                } else {
                    gymPrimedSince = 0;
                    if (formEl) { formEl.textContent = `Extend limbs to start (reach > ${startThreshold}°)`; formEl.className = 'font-mono text-secondary'; }
                }
                break;

            case 'primed':
                if (currentAngle <= startThreshold - 15) {
                    gymRepState = 'moving';
                    gymRepStartTime = now;
                    gymPeakAngle = currentAngle;
                    if (formEl) { formEl.textContent = '🔵 Contracting... reach full depth'; formEl.className = 'font-mono font-bold text-blue-600'; }
                } else if (currentAngle < startThreshold - 5) {
                    gymStartAngle = currentAngle;
                }
                break;

            case 'moving':
                if (currentAngle < gymPeakAngle) gymPeakAngle = currentAngle;
                if (currentAngle <= inflectionThreshold) {
                    gymRepState = 'inflection';
                    gymInflectionTime = now;
                    if (formEl) { formEl.textContent = '🟡 Target Depth Reached! Now push back up'; formEl.className = 'font-mono font-bold text-amber-600'; }
                }
                break;

            case 'inflection':
                if (currentAngle < gymPeakAngle) gymPeakAngle = currentAngle;
                if (currentAngle >= inflectionThreshold + 15) {
                    gymRepState = 'returning';
                    if (formEl) { formEl.textContent = '🟣 Returning to starting position...'; formEl.className = 'font-mono font-bold text-blue-600'; }
                }
                break;

            case 'returning':
                if (currentAngle >= returnThreshold) {
                    const repDuration = now - gymRepStartTime;
                    const romDelta = Math.abs(gymStartAngle - gymPeakAngle);

                    if (repDuration >= minDurationMs && romDelta >= minRomDelta && (now - gymLastRepTime >= 700)) {
                        // VALID REP COUNTED!
                        gymLastRepTime = now;
                        gymRepState = 'waiting_start';
                        gymSmoothedAngle = null;
                        recordGymRep();
                        if (formEl) { formEl.textContent = `✅ Rep Complete! (ROM: ${romDelta}°, Time: ${(repDuration / 1000).toFixed(1)}s)`; formEl.className = 'font-mono font-bold text-emerald-600'; }
                    } else {
                        // Incomplete rep
                        gymRepState = 'waiting_start';
                        gymSmoothedAngle = null;
                        if (formEl) { formEl.textContent = `⚠️ Incomplete rep (ROM: ${romDelta}° vs ${minRomDelta}°). Try with full range.`; formEl.className = 'font-mono text-amber-600'; }
                    }
                }
                break;
        }
    } else {
        // Reversed exercises (e.g. Overhead Press): Start Low (e.g. 90°) -> Inflection High (e.g. 155°) -> Return Low (e.g. 95°)
        switch (gymRepState) {
            case 'waiting_start':
                if (currentAngle <= startThreshold) {
                    if (gymPrimedSince === 0) gymPrimedSince = now;
                    if (now - gymPrimedSince >= 250) {
                        gymRepState = 'primed';
                        gymStartAngle = currentAngle;
                        gymPeakAngle = currentAngle;
                        gymPrimedSince = 0;
                        if (formEl) { formEl.textContent = '🟢 Ready at shoulder level — Press up!'; formEl.className = 'font-mono font-bold text-emerald-600'; }
                    }
                } else {
                    gymPrimedSince = 0;
                    if (formEl) { formEl.textContent = `Lower weights to shoulders to start (< ${startThreshold}°)`; formEl.className = 'font-mono text-secondary'; }
                }
                break;

            case 'primed':
                if (currentAngle >= startThreshold + 15) {
                    gymRepState = 'moving';
                    gymRepStartTime = now;
                    gymPeakAngle = currentAngle;
                    if (formEl) { formEl.textContent = '🔵 Pressing upward...'; formEl.className = 'font-mono font-bold text-blue-600'; }
                }
                break;

            case 'moving':
                if (currentAngle > gymPeakAngle) gymPeakAngle = currentAngle;
                if (currentAngle >= inflectionThreshold) {
                    gymRepState = 'inflection';
                    gymInflectionTime = now;
                    if (formEl) { formEl.textContent = '🟡 Full overhead lockout! Lower with control'; formEl.className = 'font-mono font-bold text-amber-600'; }
                }
                break;

            case 'inflection':
                if (currentAngle > gymPeakAngle) gymPeakAngle = currentAngle;
                if (currentAngle <= inflectionThreshold - 15) {
                    gymRepState = 'returning';
                    if (formEl) { formEl.textContent = '🟣 Lowering to shoulder height...'; formEl.className = 'font-mono font-bold text-blue-600'; }
                }
                break;

            case 'returning':
                if (currentAngle <= returnThreshold) {
                    const repDuration = now - gymRepStartTime;
                    const romDelta = Math.abs(gymPeakAngle - gymStartAngle);

                    if (repDuration >= minDurationMs && romDelta >= minRomDelta && (now - gymLastRepTime >= 700)) {
                        gymLastRepTime = now;
                        gymRepState = 'waiting_start';
                        gymSmoothedAngle = null;
                        recordGymRep();
                        if (formEl) { formEl.textContent = `✅ Rep Complete! (ROM: ${romDelta}°, Time: ${(repDuration / 1000).toFixed(1)}s)`; formEl.className = 'font-mono font-bold text-emerald-600'; }
                    } else {
                        gymRepState = 'waiting_start';
                        gymSmoothedAngle = null;
                        if (formEl) { formEl.textContent = `⚠️ Incomplete overhead press ROM.`; formEl.className = 'font-mono text-amber-600'; }
                    }
                }
                break;
        }
    }
}

function recordGymRep() {
    gymCurrentReps++;
    const repDisplay = document.getElementById('gym-rep-display');
    const badge = document.getElementById('gym-rep-flash-badge');

    if (repDisplay) repDisplay.textContent = gymCurrentReps;

    if (badge) {
        badge.className = 'risk-badge risk-safe animate-bounce';
        badge.innerHTML = `★ REP ${gymCurrentReps}`;
        setTimeout(() => {
            if (badge) {
                badge.className = 'risk-badge risk-safe';
                badge.innerHTML = '● TRACKING';
            }
        }, 1200);
    }

    // Check if target reps reached for set
    if (gymCurrentReps >= gymTargetReps) {
        setTimeout(() => {
            finishGymSet();
        }, 800);
    }
}

window.toggleGymCameraStream = function() {
    const btn = document.getElementById('gym-camera-toggle-btn');
    if (gymPoseEngine) {
        stopGymCamera();
        if (btn) btn.textContent = 'Start Camera';
    } else {
        initGymCamera();
        if (btn) btn.textContent = 'Stop Camera';
    }
};

function stopGymCamera() {
    isRunningGymInference = false;
    if (gymAnimFrameId) { cancelAnimationFrame(gymAnimFrameId); gymAnimFrameId = null; }
    if (gymPoseEngine) { gymPoseEngine.close(); gymPoseEngine = null; }
    if (gymCameraStream) { gymCameraStream.getTracks().forEach(t => t.stop()); gymCameraStream = null; }
    isGymProcessingInference = false;
    gymTargetLandmarks = null;
    gymInterpolatedLandmarks = null;

    const video = document.getElementById('gym-video');
    if (video) video.srcObject = null;
}

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
        if (val) val.textContent = `${remaining}s`;
        if (prog) prog.style.width = `${(remaining / total) * 100}%`;
        if (remaining <= 0) {
            stopRestTimer();
        }
    }, 1000);
};

window.stopRestTimer = function() {
    if (restTimerInterval) { clearInterval(restTimerInterval); restTimerInterval = null; }
    const panel = document.getElementById('rest-timer-panel');
    if (panel) panel.classList.add('hidden');
};

window.stopGym = function() {
    stopGymCamera();
    stopRestTimer();
};
