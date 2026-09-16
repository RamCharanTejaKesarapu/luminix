/* ═══════════════════════════════════════════════════════════════════
   LUMINIX — Yoga Library & Live AI Camera Pose Tracker
   Full camera integration, node detection, hold timer & rep counting
   ═══════════════════════════════════════════════════════════════════ */

let isRunningYogaInference = false;
let yogaAnimFrameId = null;
let yogaCameraStream = null;
let isYogaProcessingInference = false;
let yogaTargetLandmarks = null;
let yogaInterpolatedLandmarks = null;
let yogaFacingMode = 'user';
let allYogaPoses = [];
let currentYogaPose = null;
let yogaCameraInstance = null;
let yogaPoseEngine = null;
let yogaHoldSeconds = 0;
let yogaTargetHold = 10;
let yogaRepsCount = 0;
let yogaHoldActive = false;
let yogaHoldInterval = null;
let yogaMode = 'library'; // 'library' | 'practice'

// ── Built-in Pose Definitions & Biomechanical Angle Criteria ─────────
const YOGA_CRITERIA = {
    'Warrior II': {
        targetHold: 10,
        checks: [
            { name: 'Front Knee Flexion', joint: 'knee', target: '80° - 100°', fn: (l, p) => Math.min(l.leftKnee, l.rightKnee) >= 75 && Math.min(l.leftKnee, l.rightKnee) <= 110 },
            { name: 'Arms Horizontal', joint: 'arm', target: '160° - 180°', fn: (l, p) => l.leftElbow >= 145 && l.rightElbow >= 145 },
            { name: 'Upright Spine', joint: 'spine', target: '< 20° Incline', fn: (l, p) => l.spineAngle <= 22 }
        ],
        cue: 'Bend front knee to 90°, extend arms horizontally parallel to floor.'
    },
    'Warrior I': {
        targetHold: 10,
        checks: [
            { name: 'Front Knee Bend', joint: 'knee', target: '80° - 105°', fn: (l, p) => Math.min(l.leftKnee, l.rightKnee) >= 75 && Math.min(l.leftKnee, l.rightKnee) <= 110 },
            { name: 'Arms Overhead', joint: 'arm', target: '> 140°', fn: (l, p) => l.leftElbow >= 135 && l.rightElbow >= 135 },
            { name: 'Torso Alignment', joint: 'spine', target: '< 25° Incline', fn: (l, p) => l.spineAngle <= 25 }
        ],
        cue: 'Step back, sink hips down, raise both arms high overhead.'
    },
    'Downward Facing Dog': {
        targetHold: 12,
        checks: [
            { name: 'Hip Flexion (Inverted V)', joint: 'hip', target: '65° - 105°', fn: (l, p) => (l.leftHip >= 60 && l.leftHip <= 110) || (l.rightHip >= 60 && l.rightHip <= 110) },
            { name: 'Leg Extension', joint: 'knee', target: '> 145°', fn: (l, p) => l.leftKnee >= 140 && l.rightKnee >= 140 },
            { name: 'Arms Straight', joint: 'arm', target: '> 145°', fn: (l, p) => l.leftElbow >= 140 && l.rightElbow >= 140 }
        ],
        cue: 'Press palms into floor, push hips up and back into an inverted V shape.'
    },
    'Tree Pose': {
        targetHold: 15,
        checks: [
            { name: 'Standing Leg Straight', joint: 'knee', target: '165° - 180°', fn: (l, p) => Math.max(l.leftKnee, l.rightKnee) >= 155 },
            { name: 'Lifted Knee Bent', joint: 'knee', target: '< 110°', fn: (l, p) => Math.min(l.leftKnee, l.rightKnee) <= 120 },
            { name: 'Spine Upright', joint: 'spine', target: '< 15° Incline', fn: (l, p) => l.spineAngle <= 18 }
        ],
        cue: 'Root standing leg firmly, rest opposite foot on inner thigh or calf.'
    },
    'Cobra Pose': {
        targetHold: 10,
        checks: [
            { name: 'Spine Extension', joint: 'spine', target: 'Back Arch', fn: (l, p) => l.spineAngle >= 15 },
            { name: 'Hips Grounded', joint: 'hip', target: 'Extended', fn: (l, p) => l.leftHip >= 130 || l.rightHip >= 130 }
        ],
        cue: 'Lie on stomach, press palms down, lift chest while keeping hips grounded.'
    },
    'Plank Pose': {
        targetHold: 15,
        checks: [
            { name: 'Body Line', joint: 'spine', target: 'Straight 170°+', fn: (l, p) => l.leftHip >= 150 && l.rightHip >= 150 },
            { name: 'Arms Extended', joint: 'arm', target: '> 150°', fn: (l, p) => l.leftElbow >= 145 && l.rightElbow >= 145 }
        ],
        cue: 'Maintain a rigid straight line from shoulders to heels. Core tight.'
    },
    'Chair Pose': {
        targetHold: 10,
        checks: [
            { name: 'Knees Squat Depth', joint: 'knee', target: '70° - 110°', fn: (l, p) => l.leftKnee >= 65 && l.leftKnee <= 120 && l.rightKnee >= 65 && l.rightKnee <= 120 },
            { name: 'Hips Lowered', joint: 'hip', target: '75° - 115°', fn: (l, p) => l.leftHip <= 120 && l.rightHip <= 120 },
            { name: 'Arms Raised', joint: 'arm', target: '> 130°', fn: (l, p) => l.leftElbow >= 120 && l.rightElbow >= 120 }
        ],
        cue: 'Sit back as if into a chair, raise arms overhead, keep chest open.'
    },
    'Triangle Pose': {
        targetHold: 10,
        checks: [
            { name: 'Legs Straight', joint: 'knee', target: '> 150°', fn: (l, p) => l.leftKnee >= 145 && l.rightKnee >= 145 },
            { name: 'Lateral Torso Fold', joint: 'spine', target: '30° - 60° Fold', fn: (l, p) => l.spineAngle >= 25 }
        ],
        cue: 'Wide stance, fold sideways over front leg, reach bottom hand to shin and top arm to sky.'
    },
    'Bridge Pose': {
        targetHold: 10,
        checks: [
            { name: 'Hips Elevated', joint: 'hip', target: '> 140°', fn: (l, p) => l.leftHip >= 135 || l.rightHip >= 135 },
            { name: 'Knees Bent', joint: 'knee', target: '70° - 110°', fn: (l, p) => l.leftKnee >= 65 && l.leftKnee <= 115 }
        ],
        cue: 'Lie on back, bend knees, press feet into floor and lift hips high toward sky.'
    },
    'Boat Pose': {
        targetHold: 10,
        checks: [
            { name: 'Hip Flexion (V-Sit)', joint: 'hip', target: '60° - 100°', fn: (l, p) => l.leftHip >= 55 && l.leftHip <= 110 },
            { name: 'Legs Elevated', joint: 'knee', target: '45° - 160°', fn: (l, p) => l.leftKnee >= 45 }
        ],
        cue: 'Balance on sit bones, lift legs, extend arms forward parallel to ground.'
    }
};

window.renderYogaView = function(container) {
    yogaMode = 'library';
    try { stopYogaCamera(); } catch (_) {}

    container.innerHTML = `
        <div class="module-header flex flex-wrap justify-between items-end gap-4">
            <div>
                <div class="hero-category-tag"><span class="w-2 h-2 rounded-full bg-[var(--vermilion)] inline-block shadow-[0_0_8px_var(--vermilion)] mr-1.5"></span> MODULE 03 // GUIDANCE</div>
                <h1 class="module-title-large">YOGA <span class="text-vermilion font-display font-extrabold">LIBRARY.</span></h1>
                <p class="text-secondary text-sm mt-1">17 structured yoga poses with real-time AI node alignment, hold timer & rep counting.</p>
            </div>
            <div class="flex gap-2">
                <button onclick="startQuickYogaPractice()" class="btn-editorial-primary">⚡ START GUIDED SESSION</button>
            </div>
        </div>

        <div class="flex flex-wrap gap-2 mb-6" id="yoga-filters">
            <button class="nav-btn nav-active text-xs" onclick="filterYoga('all')" data-filter="all">ALL POSES</button>
            <button class="nav-btn text-xs" onclick="filterYoga('Beginner')" data-filter="Beginner">BEGINNER</button>
            <button class="nav-btn text-xs" onclick="filterYoga('Intermediate')" data-filter="Intermediate">INTERMEDIATE</button>
            <button class="nav-btn text-xs" onclick="filterYoga('Advanced')" data-filter="Advanced">ADVANCED</button>
        </div>

        <div id="yoga-content-area">
            <div id="yoga-grid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <div class="module-card p-12 text-center" style="grid-column:1/-1">
                    <div class="loading-spinner mx-auto mb-3"></div>
                    <p class="text-secondary text-sm">Loading yoga library...</p>
                </div>
            </div>
        </div>
    `;

    loadYogaPoses();
};

async function loadYogaPoses() {
    try {
        const res = await fetch('/v1/yoga/poses');
        const data = await res.json();
        allYogaPoses = data.poses || [];
        if (allYogaPoses.length === 0) {
            allYogaPoses = getFallbackYogaPoses();
        }
        renderYogaGrid(allYogaPoses);
    } catch (e) {
        allYogaPoses = getFallbackYogaPoses();
        renderYogaGrid(allYogaPoses);
    }
}

function getFallbackYogaPoses() {
    return [
        { name: "Warrior II", sanskrit: "Virabhadrasana II", difficulty: "Beginner", benefits: "Builds stamina, strengthens quadriceps, opens hips and chest.", instructions: "Step feet wide apart, bend front knee to 90°, extend arms horizontally parallel to the mat." },
        { name: "Warrior I", sanskrit: "Virabhadrasana I", difficulty: "Beginner", benefits: "Strengthens legs and core, stretches hip flexors and chest.", instructions: "Step one foot back, bend front knee to 90 degrees, square hips forward, reach arms high." },
        { name: "Tree Pose", sanskrit: "Vrikshasana", difficulty: "Intermediate", benefits: "Enhances balance, neuro-muscular coordination, and leg stability.", instructions: "Root into standing foot, place opposite foot on inner thigh, bring hands to heart center." },
        { name: "Downward Facing Dog", sanskrit: "Adho Mukha Svanasana", difficulty: "Beginner", benefits: "Decompresses spine, stretches hamstrings and calves, builds shoulder stability.", instructions: "Start on hands and feet, press hips up and back into an inverted V, lengthen spine." },
        { name: "Chair Pose", sanskrit: "Utkatasana", difficulty: "Intermediate", benefits: "Fires glutes, quadriceps, and core. Elevates heart rate.", instructions: "Stand tall, sit hips back as if into a low chair, raise arms overhead." },
        { name: "Plank Pose", sanskrit: "Phalakasana", difficulty: "Beginner", benefits: "Strengthens whole core, wrists, arms, and postural stabilizers.", instructions: "Align shoulders over wrists, create a straight unbroken line from head to heels." },
        { name: "Triangle Pose", sanskrit: "Trikonasana", difficulty: "Intermediate", benefits: "Deep hamstring and groin stretch, opens chest and shoulders.", instructions: "Wide stance, reach forward over front leg, fold sideways touching shin or floor, top arm to sky." },
        { name: "Bridge Pose", sanskrit: "Setu Bandha Sarvangasana", difficulty: "Beginner", benefits: "Strengthens glutes, lower back, opens chest and hip flexors.", instructions: "Lie on back with knees bent, press into feet and elevate hips toward sky." },
        { name: "Boat Pose", sanskrit: "Navasana", difficulty: "Intermediate", benefits: "Intense core and hip flexor strengthening, enhances balance.", instructions: "Sit on mat, lean back slightly, lift legs to 45°, extend arms parallel to floor." },
        { name: "Cobra Pose", sanskrit: "Bhujangasana", difficulty: "Beginner", benefits: "Strengthens spinal muscles, opens lungs and chest.", instructions: "Lie on stomach, place hands under shoulders, press up gently curving spine." }
    ];
}

function renderYogaGrid(poses) {
    const grid = document.getElementById('yoga-grid');
    if (!grid) return;

    if (!poses.length) {
        grid.innerHTML = `<p class="text-secondary text-sm text-center py-8" style="grid-column:1/-1">No poses found.</p>`;
        return;
    }

    const diffBadges = {
        'Beginner': 'bg-[rgba(16,185,129,0.15)] text-emerald-400 border-[rgba(16,185,129,0.3)]',
        'Intermediate': 'bg-[rgba(224,35,28,0.15)] text-[var(--vermilion)] border-[rgba(224,35,28,0.35)]',
        'Advanced': 'bg-[rgba(245,158,11,0.15)] text-amber-400 border-[rgba(245,158,11,0.3)]'
    };

    const yogaVisuals = [
        '/assets/toji zenan.jpeg',
        '/assets/Toji Fushiguro.jpeg',
        '/assets/_.jpeg',
        '/assets/WHATD THEY TO DO HIM.jpeg',
        '/assets/Toji (1).jpeg',
        '/assets/media_1787652701397.jpg',
        '/assets/Toji Fushiguro Hitting Gym.jpeg',
        '/assets/Toji fushiguro (2).jpeg',
        '/assets/_ (1).jpeg',
        '/assets/media_1787652686705.jpg'
    ];

    grid.innerHTML = poses.map((p, i) => {
        const badgeClass = diffBadges[p.difficulty] || diffBadges['Beginner'];
        const criteria = YOGA_CRITERIA[p.name];
        const targetHold = criteria?.targetHold || 10;
        const imgUrl = yogaVisuals[i % yogaVisuals.length];

        return `
        <div class="module-card overflow-hidden flex flex-col justify-between hover:shadow-lg transition-all duration-300">
            <div class="h-44 relative overflow-hidden bg-[rgba(14,19,26,0.9)] border-b border-[var(--border-subtle)]">
                <img src="${imgUrl}" alt="Kinematic posture alignment visual for ${p.name} (${p.sanskrit || 'Yoga Asana'})" class="w-full h-full object-cover object-top hover:scale-105 transition-transform duration-500" />
                <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                <div class="absolute top-3 right-3">
                    <span class="font-mono text-[10px] px-2 py-0.5 rounded-full border font-semibold ${badgeClass}">
                        ${p.difficulty}
                    </span>
                </div>
                <div class="absolute bottom-3 left-4 right-4 text-white">
                    <h3 class="font-display text-lg font-bold leading-tight">${p.name}</h3>
                    ${p.sanskrit ? `<p class="font-mono text-xs text-gray-300 italic mt-0.5">${p.sanskrit}</p>` : ''}
                </div>
            </div>

            <div class="p-5 flex-1 flex flex-col justify-between">
                <div class="space-y-3">
                    <div>
                        <p class="font-mono text-[10px] uppercase tracking-wider text-secondary font-bold mb-1">Benefits</p>
                        <p class="text-xs text-primary leading-relaxed">${p.benefits}</p>
                    </div>

                    <div>
                        <p class="font-mono text-[10px] uppercase tracking-wider text-secondary font-bold mb-1">Technique Cue</p>
                        <p class="text-xs text-secondary leading-relaxed">${p.instructions}</p>
                    </div>
                </div>

                <div class="pt-4 mt-4 border-t border-gray-200 flex items-center justify-between gap-3">
                    <span class="font-mono text-xs text-blue-primary font-bold flex items-center gap-1">
                        <span>⏱</span> ${targetHold}s HOLD
                    </span>
                    <button onclick="startYogaPractice(${i})" class="btn-editorial-primary text-xs py-2 px-4 flex items-center gap-1.5">
                        <span>📷</span> PRACTICE POSE
                    </button>
                </div>
            </div>
        </div>
        `;
    }).join('');
}

window.filterYoga = function(level) {
    const btns = document.querySelectorAll('#yoga-filters button');
    btns.forEach(b => {
        b.classList.toggle('nav-active', b.dataset.filter === level);
    });

    if (level === 'all') renderYogaGrid(allYogaPoses);
    else renderYogaGrid(allYogaPoses.filter(p => p.difficulty === level));
};

window.startQuickYogaPractice = function() {
    if (allYogaPoses.length > 0) {
        startYogaPractice(0);
    }
};

// ══════════════════════════════════════════════════════════════════
//  LIVE YOGA PRACTICE & REPS / HOLD TRACKER
// ══════════════════════════════════════════════════════════════════
window.startYogaPractice = function(poseIndex) {
    yogaMode = 'practice';
    currentYogaPose = allYogaPoses[poseIndex] || allYogaPoses[0];
    const criteria = YOGA_CRITERIA[currentYogaPose.name] || {
        targetHold: 10,
        checks: [
            { name: 'Spine Alignment', target: 'Neutral', fn: (l) => l.spineAngle <= 20 },
            { name: 'Balance & Form', target: 'Stable', fn: (l) => l.symmetry >= 70 }
        ],
        cue: currentYogaPose.instructions
    };

    yogaTargetHold = criteria.targetHold || 10;
    yogaHoldSeconds = 0;
    yogaRepsCount = 0;
    yogaHoldActive = false;

    const area = document.getElementById('yoga-content-area');
    if (!area) return;

    area.innerHTML = `
        <div class="mb-6 flex flex-wrap justify-between items-center gap-4 border-b border-gray-200 pb-4">
            <div class="flex items-center gap-3">
                <button onclick="exitYogaPractice()" class="btn-ghost-editorial text-xs flex items-center gap-1">
                    ← BACK TO YOGA LIBRARY
                </button>
                <div class="h-4 w-px bg-gray-300"></div>
                <h2 class="font-display text-xl font-bold text-primary flex items-center gap-2">
                    <span>${currentYogaPose.name}</span>
                    <span class="font-mono text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200 font-semibold">${currentYogaPose.difficulty}</span>
                </h2>
            </div>
            <div class="flex items-center gap-3">
                <span class="font-mono text-xs text-secondary font-bold">TARGET HOLD:</span>
                <select id="yoga-hold-select" onchange="setYogaTargetHold(this.value)" class="form-input-editorial text-xs py-1.5 px-3" style="width:auto">
                    <option value="5" ${yogaTargetHold === 5 ? 'selected' : ''}>5 Seconds</option>
                    <option value="10" ${yogaTargetHold === 10 ? 'selected' : ''}>10 Seconds</option>
                    <option value="15" ${yogaTargetHold === 15 ? 'selected' : ''}>15 Seconds</option>
                    <option value="30" ${yogaTargetHold === 30 ? 'selected' : ''}>30 Seconds</option>
                </select>
                <button onclick="switchYogaPose(${poseIndex - 1})" class="btn-secondary-editorial text-xs px-3 py-1.5" ${poseIndex <= 0 ? 'disabled style="opacity:0.4"' : ''}>← Prev</button>
                <button onclick="switchYogaPose(${poseIndex + 1})" class="btn-secondary-editorial text-xs px-3 py-1.5" ${poseIndex >= allYogaPoses.length - 1 ? 'disabled style="opacity:0.4"' : ''}>Next →</button>
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <!-- Camera Viewport (7 Cols) -->
            <div class="lg:col-span-7 module-card p-0 rounded-2xl relative overflow-hidden flex flex-col justify-between min-w-0 w-full" style="min-height: 480px; height: 480px; background: #000000;">
                <video id="yoga-video" class="camera-video-source" playsinline></video>
                <canvas id="yoga-canvas" class="camera-canvas" style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover;"></canvas>

                <!-- Top Camera HUD -->
                <div class="absolute top-4 left-4 right-4 z-20 flex justify-between items-center pointer-events-none">
                    <span class="hud-pill-mono">
                        YOGA AI // 60 FPS STREAM
                    </span>
                    <div id="yoga-match-badge" class="risk-badge risk-safe">● CALIBRATING</div>
                </div>

                <!-- Posture & Camera Angle Pop-up Alert Toast -->
                <div id="yoga-posture-alert-toast" class="posture-alert-toast hidden">
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
                <div id="yoga-camera-loading" class="camera-loading" style="display:none">
                    <div class="loading-spinner mb-3"></div>
                    <p class="text-white font-bold text-sm">Connecting Camera for Asana Tracking...</p>
                    <p class="text-gray-400 font-mono text-xs mt-1">Calibrating pose nodes</p>
                </div>

                <!-- Bottom Camera Bar -->
                <div class="absolute bottom-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-auto bg-black/80 backdrop-blur-md p-3.5 rounded-xl border border-white/10 text-white">
                    <div class="flex-1 max-w-xs mr-4">
                        <div class="flex justify-between items-center text-[10px] text-gray-400 mb-1 font-mono uppercase">
                            <span>Asana Alignment Match</span>
                            <span id="yoga-form-score" class="text-blue-400 font-bold">0%</span>
                        </div>
                        <div class="w-full bg-white/20 h-2 rounded-full overflow-hidden">
                            <div class="bg-blue-500 h-full transition-all duration-300" id="yoga-score-bar" style="width:0%"></div>
                        </div>
                    </div>
                    <div class="flex items-center gap-2">
                        <button onclick="switchYogaCameraFacing()" id="yoga-flip-cam-btn" class="bg-white/10 hover:bg-white/20 text-white text-xs px-3 py-1.5 rounded-lg font-mono font-bold transition" title="Switch Camera">🔄 FLIP</button>
                        <button onclick="toggleYogaCameraStream()" id="yoga-camera-toggle-btn" class="bg-blue-600 hover:bg-blue-500 text-white text-xs px-4 py-2 rounded-lg font-mono font-bold transition">Stop Camera</button>
                    </div>
                </div>
            </div>

            <!-- Coaching & Reps / Hold Tracker HUD (5 Cols) -->
            <div class="lg:col-span-5 flex flex-col gap-6 min-w-0 w-full">
                <!-- Hold Ring & Reps Card -->
                <div class="module-card p-6 text-center relative overflow-hidden">
                    <div class="flex justify-around items-center mb-6">
                        <div>
                            <p class="font-mono text-[10px] text-secondary font-bold uppercase tracking-wider">Holds Completed</p>
                            <h3 class="text-4xl font-extrabold font-display text-primary mt-1" id="yoga-rep-count">0</h3>
                            <p class="font-mono text-xs text-secondary">Reps</p>
                        </div>
                        <!-- Circular Hold Gauge -->
                        <div class="relative flex items-center justify-center" style="width: 110px; height: 110px;">
                            <svg class="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                                <path class="text-gray-200" stroke-width="3.5" stroke="currentColor" fill="none"
                                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                <path id="yoga-hold-ring" class="text-blue-primary transition-all duration-300" stroke-width="3.5" stroke-dasharray="0, 100" stroke-linecap="round" stroke="currentColor" fill="none"
                                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                            </svg>
                            <div class="absolute flex flex-col items-center justify-center">
                                <span class="text-2xl font-black font-display text-primary" id="yoga-hold-seconds">0s</span>
                                <span class="font-mono text-[10px] text-secondary font-bold uppercase" id="yoga-hold-target-lbl">/ ${yogaTargetHold}s</span>
                            </div>
                        </div>
                    </div>

                    <!-- Live Coaching Cue -->
                    <div class="p-4 rounded-xl bg-[rgba(14,19,26,0.85)] border border-[var(--border-subtle)] text-left">
                        <div class="flex items-center gap-2 mb-1">
                            <span class="w-2 h-2 rounded-full bg-[var(--vermilion)] animate-pulse"></span>
                            <span class="font-mono text-[10px] font-bold text-[var(--vermilion)] uppercase tracking-wider">AI Asana Coach</span>
                        </div>
                        <p id="yoga-coach-feedback" class="text-xs text-[var(--bone)] leading-relaxed">${criteria.cue}</p>
                    </div>
                </div>

                <!-- Joint Alignment Checklist -->
                <div class="module-card p-6 flex-1 flex flex-col justify-between">
                    <div>
                        <p class="font-mono text-xs font-bold uppercase tracking-wider text-[var(--bone-dim)] mb-4">Pose Alignment Checkpoints</p>
                        <div class="space-y-3" id="yoga-checkpoints-list">
                            ${criteria.checks.map((chk, idx) => `
                                <div class="p-3 rounded-xl bg-[rgba(14,19,26,0.85)] border border-[var(--border-subtle)] flex items-center justify-between" id="yoga-chk-${idx}">
                                    <div class="flex items-center gap-3">
                                        <span class="w-5 h-5 rounded-full flex items-center justify-center text-xs bg-[rgba(255,255,255,0.08)] text-[var(--bone-dim)] font-mono" id="yoga-chk-icon-${idx}">○</span>
                                        <div>
                                            <div class="text-xs font-semibold text-[var(--bone)]">${chk.name}</div>
                                            <div class="font-mono text-[10px] text-[var(--bone-dim)]">Target: ${chk.target}</div>
                                        </div>
                                    </div>
                                    <span class="font-mono text-xs font-bold text-[var(--bone-dim)]" id="yoga-chk-val-${idx}">Waiting</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <div class="mt-6 pt-4 border-t border-[var(--border-subtle)] flex justify-between items-center">
                        <button onclick="resetYogaCounter()" class="btn-ghost-editorial text-xs">Reset Reps</button>
                        <button onclick="switchYogaPose(${poseIndex + 1})" class="btn-editorial-primary text-xs px-4">Next Asana →</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    initYogaCamera();
};

window.setYogaTargetHold = function(sec) {
    yogaTargetHold = parseInt(sec, 10) || 10;
    const lbl = document.getElementById('yoga-hold-target-lbl');
    if (lbl) lbl.textContent = `/ ${yogaTargetHold}s`;
};

window.resetYogaCounter = function() {
    yogaRepsCount = 0;
    yogaHoldSeconds = 0;
    const elReps = document.getElementById('yoga-rep-count');
    const elSec = document.getElementById('yoga-hold-seconds');
    const ring = document.getElementById('yoga-hold-ring');
    if (elReps) elReps.textContent = '0';
    if (elSec) elSec.textContent = '0s';
    if (ring) ring.setAttribute('stroke-dasharray', `0, 100`);
};

window.switchYogaPose = function(index) {
    if (index >= 0 && index < allYogaPoses.length) {
        stopYogaCamera();
        startYogaPractice(index);
    }
};

window.exitYogaPractice = function() {
    stopYogaCamera();
    const area = document.getElementById('yoga-content-area');
    if (area) {
        area.innerHTML = `
            <div id="yoga-grid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"></div>
        `;
        renderYogaGrid(allYogaPoses);
    }
};

// ── Yoga Pose Engine & Stream ─────────────────────────────────────────
window.switchYogaCameraFacing = async function() {
    yogaFacingMode = (yogaFacingMode === 'user') ? 'environment' : 'user';
    const flipBtn = document.getElementById('yoga-flip-cam-btn');
    if (flipBtn) flipBtn.textContent = yogaFacingMode === 'user' ? '🔄 FLIP' : '🔄 FLIP';
    if (yogaPoseEngine && yogaCameraStream) {
        await startYogaVideoStream();
    }
};

async function startYogaVideoStream() {
    const video = document.getElementById('yoga-video');
    if (!video) return;

    if (yogaCameraStream) {
        yogaCameraStream.getTracks().forEach(t => t.stop());
        yogaCameraStream = null;
    }

    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (window.innerWidth <= 768);

    const constraints = {
        video: {
            facingMode: yogaFacingMode,
            width: isMobile ? { ideal: 480, max: 720 } : { ideal: 1280, max: 1280 },
            height: isMobile ? { ideal: 640, max: 1280 } : { ideal: 720, max: 720 },
            frameRate: isMobile ? { ideal: 30, max: 30 } : { ideal: 60, max: 60 }
        },
        audio: false
    };

    try {
        yogaCameraStream = await navigator.mediaDevices.getUserMedia(constraints);
    } catch (_) {
        try {
            yogaCameraStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: yogaFacingMode, width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 30 } },
                audio: false
            });
        } catch (e2) {
            yogaCameraStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: yogaFacingMode },
                audio: false
            });
        }
    }

    video.srcObject = yogaCameraStream;
    await video.play();
}

async function initYogaCamera() {
    stopYogaCamera();
    const loading = document.getElementById('yoga-camera-loading');
    if (loading) loading.style.display = 'flex';

    try {
        const video = document.getElementById('yoga-video');
        const canvas = document.getElementById('yoga-canvas');
        if (!video || !canvas) return;
        const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });

        yogaPoseEngine = new Pose({ locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${f}` });
        yogaPoseEngine.setOptions({
            modelComplexity: 0,
            smoothLandmarks: true,
            minDetectionConfidence: 0.45,
            minTrackingConfidence: 0.45
        });

        yogaPoseEngine.onResults(results => {
            if (loading && loading.style.display !== 'none') loading.style.display = 'none';
            if (results.poseLandmarks) {
                yogaTargetLandmarks = results.poseLandmarks;
                evaluateYogaPoseMatch(results.poseLandmarks);
            } else {
                yogaTargetLandmarks = null;
            }
            isYogaProcessingInference = false;
        });

        await yogaPoseEngine.initialize();
        await startYogaVideoStream();

        // ── High-Performance Visual Rendering Loop ────────────────────────────
        isRunningYogaInference = true;
        let lastYogaRenderTimestamp = performance.now();
        const yogaOffscreenCanvas = document.createElement('canvas');
        const yogaOffscreenCtx = yogaOffscreenCanvas.getContext('2d', { willReadFrequently: true });
        let lastYogaInferenceTimestamp = 0;
        const isMobileDevice = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (window.innerWidth <= 768);
        const minYogaInferenceDelta = isMobileDevice ? 38 : 30; // ~26 FPS mobile, ~33 FPS desktop

        function renderYogaHighSpeedFrame(timestamp) {
            if (!yogaPoseEngine) return;

            const dt = Math.max(0.001, Math.min(0.05, (timestamp - lastYogaRenderTimestamp) / 1000));
            lastYogaRenderTimestamp = timestamp;

            if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
                canvas.width = canvas.clientWidth;
                canvas.height = canvas.clientHeight;
            }

            const w = canvas.width;
            const h = canvas.height;

            const vp = window.luminixPose.computeCoverViewport(video.videoWidth, video.videoHeight, w, h);

            ctx.save();
            if (yogaFacingMode === 'user') {
                ctx.translate(w, 0);
                ctx.scale(-1, 1);
            }

            if (video.readyState >= 2) {
                ctx.drawImage(video, vp.x, vp.y, vp.width, vp.height);
            }

            if (yogaTargetLandmarks && yogaTargetLandmarks.length > 0) {
                if (!yogaInterpolatedLandmarks || yogaInterpolatedLandmarks.length !== yogaTargetLandmarks.length) {
                    yogaInterpolatedLandmarks = yogaTargetLandmarks.map(pt => ({ ...pt }));
                } else {
                    const lerpAlpha = 1.0 - Math.exp(-dt * 30.0);
                    for (let i = 0; i < yogaTargetLandmarks.length; i++) {
                        const target = yogaTargetLandmarks[i];
                        const current = yogaInterpolatedLandmarks[i];
                        if (target && current) {
                            current.x += (target.x - current.x) * lerpAlpha;
                            current.y += (target.y - current.y) * lerpAlpha;
                            current.visibility = target.visibility;
                        }
                    }
                }

                window.luminixPose.drawLuminixSkeleton(ctx, yogaInterpolatedLandmarks, w, h, {
                    showAngles: true,
                    showFaceTree: true,
                    theme: 'cyan',
                    viewport: vp,
                    aspect: vp.aspect,
                    mirrored: (yogaFacingMode === 'user')
                });
            }
            ctx.restore();

            yogaAnimFrameId = requestAnimationFrame(renderYogaHighSpeedFrame);
        }

        // ── Hardware-Synced & Throttled Inference Loop ───────────────────
        async function runYogaInferencePass() {
            if (!yogaPoseEngine || !isRunningYogaInference) return;
            const now = performance.now();
            if (now - lastYogaInferenceTimestamp < minYogaInferenceDelta) return;

            if (video && video.readyState >= 2 && !isYogaProcessingInference && video.videoWidth > 0 && video.videoHeight > 0) {
                isYogaProcessingInference = true;
                lastYogaInferenceTimestamp = now;

                const dims = window.luminixPose.getInferenceDimensions(video.videoWidth, video.videoHeight);
                if (yogaOffscreenCanvas.width !== dims.width || yogaOffscreenCanvas.height !== dims.height) {
                    yogaOffscreenCanvas.width = dims.width;
                    yogaOffscreenCanvas.height = dims.height;
                }

                yogaOffscreenCtx.drawImage(video, 0, 0, dims.width, dims.height);
                try {
                    await yogaPoseEngine.send({ image: yogaOffscreenCanvas });
                } catch (_) {
                    isYogaProcessingInference = false;
                }
            }
        }

        function scheduleNextYogaInference() {
            if (!isRunningYogaInference) return;
            if ('requestVideoFrameCallback' in video) {
                video.requestVideoFrameCallback(async () => {
                    await runYogaInferencePass();
                    scheduleNextYogaInference();
                });
            } else {
                setTimeout(async () => {
                    await runYogaInferencePass();
                    scheduleNextYogaInference();
                }, 16);
            }
        }

        yogaAnimFrameId = requestAnimationFrame(renderYogaHighSpeedFrame);
        scheduleNextYogaInference();

    } catch (e) {
        if (loading) loading.style.display = 'none';
        console.error('Yoga camera error:', e);
    }
}

function evaluateYogaPoseMatch(landmarks) {
    if (!currentYogaPose) return;
    const video = document.getElementById('yoga-video');
    const aspect = (video && video.videoWidth && video.videoHeight) ? (video.videoWidth / video.videoHeight) : 1.0;
    const metrics = window.luminixPose.evaluatePostureRisk(landmarks, { aspect });
    window.luminixPose.renderPostureAlert('yoga-posture-alert-toast', metrics);

    const criteria = YOGA_CRITERIA[currentYogaPose.name] || {
        checks: [
            { name: 'Spine Alignment', fn: (l) => l.spineAngle <= 20 },
            { name: 'Balance & Form', fn: (l) => l.symmetry >= 70 }
        ]
    };

    let passedChecks = 0;
    const totalChecks = criteria.checks.length;

    criteria.checks.forEach((chk, i) => {
        const passed = chk.fn(metrics.angles, currentYogaPose);
        const row = document.getElementById(`yoga-chk-${i}`);
        const icon = document.getElementById(`yoga-chk-icon-${i}`);
        const val = document.getElementById(`yoga-chk-val-${i}`);

        if (passed) {
            passedChecks++;
            if (row) row.style.borderColor = 'rgba(0, 229, 255, 0.4)';
            if (icon) { icon.textContent = '✓'; icon.className = 'w-4 h-4 rounded-full flex items-center justify-center text-[10px] bg-cyan-primary/20 text-cyan'; }
            if (val) { val.textContent = 'Aligned'; val.className = 'text-xs font-bold text-cyan'; }
        } else {
            if (row) row.style.borderColor = 'rgba(255, 255, 255, 0.05)';
            if (icon) { icon.textContent = '○'; icon.className = 'w-4 h-4 rounded-full flex items-center justify-center text-[10px] bg-white/10 text-dim'; }
            if (val) { val.textContent = 'Adjust'; val.className = 'text-xs font-bold text-yellow'; }
        }
    });

    const matchPct = Math.round((passedChecks / totalChecks) * 100);
    const scoreBar = document.getElementById('yoga-score-bar');
    const formScore = document.getElementById('yoga-form-score');
    const badge = document.getElementById('yoga-match-badge');
    const coach = document.getElementById('yoga-coach-feedback');

    if (scoreBar) scoreBar.style.width = `${matchPct}%`;
    if (formScore) formScore.textContent = `${matchPct}%`;

    // Hold Timer Triggering State Machine
    if (matchPct >= 70) {
        if (badge) {
            badge.className = 'risk-badge risk-safe';
            badge.innerHTML = '● PERFECT FORM — HOLDING';
        }

        if (!yogaHoldActive) {
            yogaHoldActive = true;
            if (yogaHoldInterval) clearInterval(yogaHoldInterval);
            yogaHoldInterval = setInterval(() => {
                yogaHoldSeconds++;
                const holdProgress = Math.min(100, Math.round((yogaHoldSeconds / yogaTargetHold) * 100));
                const ring = document.getElementById('yoga-hold-ring');
                const timeLbl = document.getElementById('yoga-hold-time');

                if (ring) ring.setAttribute('stroke-dasharray', `${holdProgress}, 100`);
                if (timeLbl) timeLbl.textContent = `${yogaHoldSeconds}s`;

                if (yogaHoldSeconds >= yogaTargetHold) {
                    // Completed 1 Hold Rep!
                    yogaRepsCount++;
                    const repLbl = document.getElementById('yoga-rep-count');
                    if (repLbl) repLbl.textContent = yogaRepsCount;

                    // Sync to Firebase Cloud Account
                    if (window.luminixFirebase && typeof window.luminixFirebase.recordYogaHold === 'function') {
                        window.luminixFirebase.recordYogaHold(allYogaPoses[currentYogaPoseIndex]?.name || 'Yoga Asana', yogaTargetHold);
                    }

                    yogaHoldSeconds = 0;
                    if (timeLbl) timeLbl.textContent = `0s`;
                    if (ring) ring.setAttribute('stroke-dasharray', `0, 100`);

                    if (coach) coach.textContent = `🎉 Great job! Completed ${yogaRepsCount} hold(s). Ready for the next rep.`;
                }
            }, 1000);
        }
    } else {
        // Form broken or incomplete
        yogaHoldActive = false;
        if (yogaHoldInterval) {
            clearInterval(yogaHoldInterval);
            yogaHoldInterval = null;
        }

        if (badge) {
            badge.className = 'risk-badge risk-warning';
            badge.innerHTML = '◉ ADJUST POSTURE';
        }
        if (coach) {
            coach.textContent = criteria.cue || 'Align your limbs and spine to match the asana.';
        }
    }
}

window.toggleYogaCameraStream = function() {
    const btn = document.getElementById('yoga-camera-toggle-btn');
    if (yogaPoseEngine) {
        stopYogaCamera();
        if (btn) btn.textContent = 'Start Camera';
    } else {
        initYogaCamera();
        if (btn) btn.textContent = 'Stop Camera';
    }
};

function stopYogaCamera() {
    isRunningYogaInference = false;
    if (yogaAnimFrameId) { cancelAnimationFrame(yogaAnimFrameId); yogaAnimFrameId = null; }
    if (yogaPoseEngine) { yogaPoseEngine.close(); yogaPoseEngine = null; }
    if (yogaCameraStream) { yogaCameraStream.getTracks().forEach(t => t.stop()); yogaCameraStream = null; }
    if (yogaHoldInterval) { clearInterval(yogaHoldInterval); yogaHoldInterval = null; }
    yogaHoldActive = false;
    isYogaProcessingInference = false;
    yogaTargetLandmarks = null;
    yogaInterpolatedLandmarks = null;

    const video = document.getElementById('yoga-video');
    if (video) video.srcObject = null;
}

window.stopYoga = function() {
    stopYogaCamera();
};
