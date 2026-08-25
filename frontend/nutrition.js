/* ═══════════════════════════════════════════════════════════════════
   LUMINIX — Nutrition, BMI & Food Tracking Engine
   BLACK × YELLOW × CYAN × METABOLIC INTELLIGENCE
   ═══════════════════════════════════════════════════════════════════ */

// ── Shared State & Persistence ───────────────────────────────────
const NUTRITION_STORAGE_KEY = 'luminix_nutrition_profile';
const FOOD_LOG_STORAGE_KEY = 'luminix_food_logs';
const BMI_HISTORY_KEY = 'luminix_bmi_history';

// Default user health profile
let healthProfile = {
    age: 25,
    gender: 'male',
    height_cm: 175,
    weight_kg: 72,
    activity_level: 'moderate',
    fitness_goal: 'maintenance',
    diet_preference: 'omnivore',
    target_calories: 2200,
    target_protein: 140,
    target_carbs: 240,
    target_fat: 70,
    units: 'metric' // 'metric' | 'imperial'
};

// Common Verified Food Database
const VERIFIED_FOODS = [
    { id: 'chicken_breast', name: 'Chicken Breast (Grilled)', category: 'Protein', baseQty: 100, unit: 'g', kcal: 165, p: 31.0, c: 0.0, f: 3.6 },
    { id: 'salmon', name: 'Atlantic Salmon (Cooked)', category: 'Protein', baseQty: 100, unit: 'g', kcal: 208, p: 20.4, c: 0.0, f: 13.4 },
    { id: 'whole_egg', name: 'Whole Egg (Large)', category: 'Protein', baseQty: 1, unit: 'egg', kcal: 72, p: 6.3, c: 0.4, f: 4.8 },
    { id: 'egg_whites', name: 'Egg Whites (Liquid)', category: 'Protein', baseQty: 100, unit: 'g', kcal: 52, p: 10.9, c: 0.7, f: 0.2 },
    { id: 'whey_protein', name: 'Whey Protein Isolate', category: 'Supplements', baseQty: 1, unit: 'scoop (30g)', kcal: 120, p: 25.0, c: 2.0, f: 1.0 },
    { id: 'greek_yogurt', name: 'Greek Yogurt 0% Fat', category: 'Dairy', baseQty: 100, unit: 'g', kcal: 59, p: 10.3, c: 3.6, f: 0.4 },
    { id: 'paneer', name: 'Paneer (Cottage Cheese)', category: 'Dairy', baseQty: 100, unit: 'g', kcal: 265, p: 18.3, c: 6.0, f: 19.5 },
    { id: 'tofu_firm', name: 'Firm Tofu', category: 'Vegan', baseQty: 100, unit: 'g', kcal: 83, p: 10.0, c: 2.1, f: 5.3 },
    { id: 'white_rice', name: 'Jasmine / White Rice (Cooked)', category: 'Carbs', baseQty: 100, unit: 'g', kcal: 130, p: 2.7, c: 28.2, f: 0.3 },
    { id: 'brown_rice', name: 'Brown Rice (Cooked)', category: 'Carbs', baseQty: 100, unit: 'g', kcal: 112, p: 2.6, c: 23.5, f: 0.9 },
    { id: 'rolled_oats', name: 'Rolled Oats (Dry)', category: 'Carbs', baseQty: 50, unit: 'g', kcal: 195, p: 8.5, c: 33.0, f: 3.5 },
    { id: 'sweet_potato', name: 'Sweet Potato (Baked)', category: 'Carbs', baseQty: 150, unit: 'g', kcal: 135, p: 3.0, c: 31.5, f: 0.2 },
    { id: 'quinoa', name: 'Quinoa (Cooked)', category: 'Carbs', baseQty: 100, unit: 'g', kcal: 120, p: 4.4, c: 21.3, f: 1.9 },
    { id: 'dal_lentils', name: 'Yellow Dal / Lentils (Cooked)', category: 'Carbs', baseQty: 150, unit: 'g', kcal: 174, p: 13.5, c: 30.0, f: 0.6 },
    { id: 'wheat_roti', name: 'Whole Wheat Roti / Chapati', category: 'Carbs', baseQty: 1, unit: 'roti (40g)', kcal: 104, p: 3.2, c: 20.0, f: 1.2 },
    { id: 'whole_bread', name: 'Whole Wheat Bread', category: 'Carbs', baseQty: 1, unit: 'slice', kcal: 69, p: 3.6, c: 12.0, f: 0.9 },
    { id: 'avocado', name: 'Fresh Avocado', category: 'Fats', baseQty: 50, unit: 'g', kcal: 80, p: 1.0, c: 4.3, f: 7.4 },
    { id: 'peanut_butter', name: 'Natural Peanut Butter', category: 'Fats', baseQty: 1, unit: 'tbsp (16g)', kcal: 94, p: 4.0, c: 3.1, f: 8.0 },
    { id: 'almonds', name: 'Raw Almonds', category: 'Fats', baseQty: 28, unit: 'g (1 oz)', kcal: 164, p: 6.0, c: 6.1, f: 14.2 },
    { id: 'olive_oil', name: 'Extra Virgin Olive Oil', category: 'Fats', baseQty: 1, unit: 'tbsp (14g)', kcal: 119, p: 0.0, c: 0.0, f: 13.5 },
    { id: 'banana', name: 'Banana (Medium)', category: 'Fruits', baseQty: 1, unit: 'medium (118g)', kcal: 105, p: 1.3, c: 27.0, f: 0.4 },
    { id: 'apple', name: 'Fresh Apple (Medium)', category: 'Fruits', baseQty: 1, unit: 'medium (182g)', kcal: 95, p: 0.5, c: 25.0, f: 0.3 },
    { id: 'blueberries', name: 'Fresh Blueberries', category: 'Fruits', baseQty: 100, unit: 'g', kcal: 57, p: 0.7, c: 14.5, f: 0.3 },
    { id: 'broccoli', name: 'Steamed Broccoli', category: 'Veggies', baseQty: 100, unit: 'g', kcal: 35, p: 2.4, c: 7.2, f: 0.4 },
    { id: 'spinach', name: 'Fresh / Sautéed Spinach', category: 'Veggies', baseQty: 100, unit: 'g', kcal: 23, p: 2.9, c: 3.6, f: 0.4 },
    { id: 'cottage_cheese', name: 'Low-Fat Cottage Cheese', category: 'Dairy', baseQty: 100, unit: 'g', kcal: 72, p: 12.4, c: 2.7, f: 1.0 },
    { id: 'tuna', name: 'Canned Tuna in Water', category: 'Protein', baseQty: 100, unit: 'g', kcal: 116, p: 25.5, c: 0.0, f: 1.0 },
    { id: 'lean_beef', name: 'Lean Beef Steak (Cooked)', category: 'Protein', baseQty: 100, unit: 'g', kcal: 215, p: 26.1, c: 0.0, f: 11.8 },
    { id: 'mixed_nuts', name: 'Mixed Roasted Nuts', category: 'Fats', baseQty: 30, unit: 'g', kcal: 180, p: 5.0, c: 6.0, f: 16.0 },
    { id: 'chia_seeds', name: 'Chia Seeds', category: 'Superfoods', baseQty: 15, unit: 'g (1 tbsp)', kcal: 73, p: 2.5, c: 6.3, f: 4.6 }
];

// Load persisted state
function loadNutritionState() {
    try {
        const saved = localStorage.getItem(NUTRITION_STORAGE_KEY);
        if (saved) {
            healthProfile = { ...healthProfile, ...JSON.parse(saved) };
        }
    } catch (_) {}
}

function saveNutritionState() {
    try {
        localStorage.setItem(NUTRITION_STORAGE_KEY, JSON.stringify(healthProfile));
    } catch (_) {}
}

function getTodayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

let activeTrackerDate = getTodayKey();

function getFoodLogs(dateStr = activeTrackerDate) {
    try {
        const all = JSON.parse(localStorage.getItem(FOOD_LOG_STORAGE_KEY) || '{}');
        if (!all[dateStr]) {
            all[dateStr] = {
                breakfast: [],
                lunch: [],
                dinner: [],
                snacks: [],
                water_ml: 0
            };
        }
        return all[dateStr];
    } catch (_) {
        return { breakfast: [], lunch: [], dinner: [], snacks: [], water_ml: 0 };
    }
}

function saveFoodLogs(dateStr, data) {
    try {
        const all = JSON.parse(localStorage.getItem(FOOD_LOG_STORAGE_KEY) || '{}');
        all[dateStr] = data;
        localStorage.setItem(FOOD_LOG_STORAGE_KEY, JSON.stringify(all));
    } catch (_) {}
}

// ── Math & Metric Calculations ────────────────────────────────────
function computeClientMetrics(p = healthProfile) {
    const h_m = p.height_cm / 100.0;
    const bmi = p.weight_kg / (h_m * h_m);
    
    let category = 'Normal';
    let catClass = 'badge-cyan';
    let catColor = '#00E5FF';
    let catDesc = 'You are in a healthy weight range. Maintain balanced nutrition and progressive overload.';
    
    if (bmi < 18.5) {
        category = 'Underweight';
        catClass = 'badge-yellow';
        catColor = '#5FFFFF';
        catDesc = 'Focus on nutrient-dense caloric surplus, healthy fats, and strength training to build lean mass.';
    } else if (bmi < 25) {
        category = 'Normal Weight';
        catClass = 'badge-cyan';
        catColor = '#00E5FF';
        catDesc = 'Optimal metabolic baseline. Focus on athletic performance, agility, and body recomposition.';
    } else if (bmi < 30) {
        category = 'Overweight';
        catClass = 'badge-yellow';
        catColor = '#FFC400';
        catDesc = 'Target a modest caloric deficit (300-500 kcal), prioritize high protein intake and daily activity.';
    } else {
        category = 'Obese';
        catClass = 'badge-danger';
        catColor = '#FF6A00';
        catDesc = 'Structured caloric deficit, low-impact cardio, strength training, and whole foods are recommended.';
    }

    // BMR Mifflin-St Jeor
    const s = p.gender === 'male' ? 5 : (p.gender === 'female' ? -161 : -78);
    const bmr_msj = 10 * p.weight_kg + 6.25 * p.height_cm - 5 * p.age + s;

    // BMR Harris-Benedict revised
    let bmr_hb = 0;
    if (p.gender === 'male') {
        bmr_hb = 88.362 + 13.397 * p.weight_kg + 4.799 * p.height_cm - 5.677 * p.age;
    } else if (p.gender === 'female') {
        bmr_hb = 447.593 + 9.247 * p.weight_kg + 3.098 * p.height_cm - 4.330 * p.age;
    } else {
        bmr_hb = (88.362 + 13.397 * p.weight_kg + 4.799 * p.height_cm - 5.677 * p.age + 447.593 + 9.247 * p.weight_kg + 3.098 * p.height_cm - 4.330 * p.age) / 2;
    }

    // Activity multipliers
    const actMap = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9 };
    const factor = actMap[p.activity_level] || 1.55;
    const tdee = bmr_msj * factor;

    // Goal adjustments
    let target_kcal = tdee;
    if (p.fitness_goal === 'fat_loss') target_kcal = tdee * 0.82;
    else if (p.fitness_goal === 'muscle_gain') target_kcal = tdee * 1.12;

    // Target Macros
    let protein_multiplier = 1.6;
    let fat_ratio = 0.30;
    if (p.fitness_goal === 'muscle_gain') {
        protein_multiplier = 1.9;
        fat_ratio = 0.28;
    } else if (p.fitness_goal === 'fat_loss') {
        protein_multiplier = 1.8;
        fat_ratio = 0.30;
    }

    const protein_g = Math.round(protein_multiplier * p.weight_kg);
    const protein_kcal = protein_g * 4;
    const fat_kcal = target_kcal * fat_ratio;
    const fat_g = Math.round(fat_kcal / 9);
    const carb_kcal = Math.max(0, target_kcal - protein_kcal - fat_kcal);
    const carbs_g = Math.round(carb_kcal / 4);

    const minHealthyKg = +(18.5 * h_m * h_m).toFixed(1);
    const maxHealthyKg = +(24.9 * h_m * h_m).toFixed(1);

    // Heuristic deficiency alerts
    const defs = [];
    if (p.diet_preference === 'vegan' || p.diet_preference === 'vegetarian') {
        defs.push('Monitor B12, Iron, Zinc, and Omega-3 intake with plant-forward patterns.');
    }
    if (carbs_g < 80) {
        defs.push('Very low carbohydrate intake detected — ensure adequate electrolytes, hydration, and training fuel.');
    }
    if (p.fitness_goal === 'muscle_gain' && protein_g < 1.6 * p.weight_kg) {
        defs.push('Protein intake may be sub-optimal for aggressive hypertrophy — target 20-35g per meal spaced evenly.');
    }
    if (defs.length === 0) {
        defs.push('Nutrient distribution is well balanced. Maintain hydration and whole-food micronutrient diversity.');
    }

    return {
        bmi: +bmi.toFixed(1),
        category,
        catClass,
        catColor,
        catDesc,
        bmr_msj: Math.round(bmr_msj),
        bmr_hb: Math.round(bmr_hb),
        tdee: Math.round(tdee),
        target_kcal: Math.round(target_kcal),
        macros: {
            protein_g,
            protein_pct: Math.round((protein_kcal / target_kcal) * 100),
            carbs_g,
            carbs_pct: Math.round((carb_kcal / target_kcal) * 100),
            fat_g,
            fat_pct: Math.round((fat_kcal / target_kcal) * 100)
        },
        healthy_range_kg: [minHealthyKg, maxHealthyKg],
        deficiencies: defs
    };
}

// ══════════════════════════════════════════════════════════════════
//  VIEW 1: BMI & METABOLIC HEALTH CALCULATOR
// ══════════════════════════════════════════════════════════════════
window.renderBMIView = function(container) {
    loadNutritionState();
    const metrics = computeClientMetrics();

    // Height/Weight unit display helpers
    const isImperial = healthProfile.units === 'imperial';
    const dispWeight = isImperial ? Math.round(healthProfile.weight_kg * 2.20462) : healthProfile.weight_kg;
    const totalInches = Math.round(healthProfile.height_cm / 2.54);
    const dispFeet = Math.floor(totalInches / 12);
    const dispInches = totalInches % 12;

    container.innerHTML = `
        <!-- Hero Header -->
        <div class="mb-6 relative overflow-hidden p-8 rounded-xl glass-card" style="background: linear-gradient(90deg, var(--black-1) 30%, transparent), url('/assets/media_1787652701395.jpg') center/cover; background-blend-mode: multiply; background-position: center 25%;">
            <div class="relative z-10">
                <div class="text-cyan mb-2" style="font-size: 0.65rem; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase;">MODULE // METABOLIC INTELLIGENCE</div>
                <h2 style="font-family:var(--font-display);font-size:3rem;font-weight:800;text-transform:uppercase;line-height:1;margin-bottom:0.5rem">BMI & <span class="text-yellow" style="font-size:0.5em; letter-spacing:0.1em;">CALCULATOR</span></h2>
                <p style="color:var(--text-secondary);font-size:0.85rem; max-width: 500px;">Compute Body Mass Index, BMR (Mifflin & Harris-Benedict), TDEE, and optimal macro distribution with precision.</p>
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
            <!-- Left: Interactive Form Controls (5 cols) -->
            <div class="lg:col-span-5 glass-card p-6 rounded-xl space-y-5">
                <div class="flex items-center justify-between border-b border-white/10 pb-4">
                    <h3 style="font-family:var(--font-display);font-weight:700;font-size:1.15rem;color:var(--white)">METRIC CONTROLS</h3>
                    <div class="flex items-center bg-black/40 p-1 rounded-lg border border-white/10">
                        <button onclick="setUnits('metric')" class="px-3 py-1 text-xs rounded font-bold transition-all ${!isImperial ? 'bg-cyan text-black' : 'text-secondary'}">Metric (kg/cm)</button>
                        <button onclick="setUnits('imperial')" class="px-3 py-1 text-xs rounded font-bold transition-all ${isImperial ? 'bg-cyan text-black' : 'text-secondary'}">Imperial (lbs/ft)</button>
                    </div>
                </div>

                <!-- Age & Gender -->
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="text-xs text-dim block mb-1 font-semibold uppercase">Age (Years)</label>
                        <input type="number" id="inp-age" min="10" max="100" value="${healthProfile.age}" class="auth-input w-full" oninput="onBMIParamChange()">
                    </div>
                    <div>
                        <label class="text-xs text-dim block mb-1 font-semibold uppercase">Biological Sex</label>
                        <select id="inp-gender" class="auth-input w-full" onchange="onBMIParamChange()">
                            <option value="male" ${healthProfile.gender === 'male' ? 'selected' : ''}>Male</option>
                            <option value="female" ${healthProfile.gender === 'female' ? 'selected' : ''}>Female</option>
                            <option value="other" ${healthProfile.gender === 'other' ? 'selected' : ''}>Other</option>
                        </select>
                    </div>
                </div>

                <!-- Height -->
                ${!isImperial ? `
                    <div>
                        <div class="flex justify-between text-xs mb-1">
                            <span class="text-dim font-semibold uppercase">Height (cm)</span>
                            <span class="text-cyan font-bold" id="val-height-cm">${healthProfile.height_cm} cm</span>
                        </div>
                        <input type="range" id="range-height-cm" min="120" max="230" value="${healthProfile.height_cm}" class="w-full accent-cyan" oninput="syncHeightMetric(this.value)">
                        <input type="number" id="inp-height-cm" min="120" max="230" value="${healthProfile.height_cm}" class="auth-input w-full mt-2" oninput="syncHeightMetric(this.value)">
                    </div>
                ` : `
                    <div>
                        <span class="text-dim font-semibold uppercase text-xs block mb-1">Height (Feet & Inches)</span>
                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label class="text-xs text-dim">Feet</label>
                                <input type="number" id="inp-height-ft" min="3" max="8" value="${dispFeet}" class="auth-input w-full" oninput="syncHeightImperial()">
                            </div>
                            <div>
                                <label class="text-xs text-dim">Inches</label>
                                <input type="number" id="inp-height-in" min="0" max="11" value="${dispInches}" class="auth-input w-full" oninput="syncHeightImperial()">
                            </div>
                        </div>
                    </div>
                `}

                <!-- Weight -->
                ${!isImperial ? `
                    <div>
                        <div class="flex justify-between text-xs mb-1">
                            <span class="text-dim font-semibold uppercase">Weight (kg)</span>
                            <span class="text-yellow font-bold" id="val-weight-kg">${healthProfile.weight_kg} kg</span>
                        </div>
                        <input type="range" id="range-weight-kg" min="30" max="200" step="0.5" value="${healthProfile.weight_kg}" class="w-full accent-yellow" oninput="syncWeightMetric(this.value)">
                        <input type="number" id="inp-weight-kg" min="30" max="200" step="0.1" value="${healthProfile.weight_kg}" class="auth-input w-full mt-2" oninput="syncWeightMetric(this.value)">
                    </div>
                ` : `
                    <div>
                        <div class="flex justify-between text-xs mb-1">
                            <span class="text-dim font-semibold uppercase">Weight (lbs)</span>
                            <span class="text-yellow font-bold" id="val-weight-lbs">${dispWeight} lbs</span>
                        </div>
                        <input type="range" id="range-weight-lbs" min="65" max="450" step="1" value="${dispWeight}" class="w-full accent-yellow" oninput="syncWeightImperial(this.value)">
                        <input type="number" id="inp-weight-lbs" min="65" max="450" step="1" value="${dispWeight}" class="auth-input w-full mt-2" oninput="syncWeightImperial(this.value)">
                    </div>
                `}

                <!-- Activity Level -->
                <div>
                    <label class="text-xs text-dim block mb-1 font-semibold uppercase">Daily Activity Factor</label>
                    <select id="inp-activity" class="auth-input w-full" onchange="onBMIParamChange()">
                        <option value="sedentary" ${healthProfile.activity_level === 'sedentary' ? 'selected' : ''}>Sedentary (Little or no exercise, desk job)</option>
                        <option value="light" ${healthProfile.activity_level === 'light' ? 'selected' : ''}>Lightly Active (Exercise 1-3 days/week)</option>
                        <option value="moderate" ${healthProfile.activity_level === 'moderate' ? 'selected' : ''}>Moderately Active (Exercise 3-5 days/week)</option>
                        <option value="active" ${healthProfile.activity_level === 'active' ? 'selected' : ''}>Very Active (Hard training 6-7 days/week)</option>
                        <option value="very_active" ${healthProfile.activity_level === 'very_active' ? 'selected' : ''}>Athletic / Heavy Physical Job</option>
                    </select>
                </div>

                <!-- Fitness Goal -->
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="text-xs text-dim block mb-1 font-semibold uppercase">Target Goal</label>
                        <select id="inp-goal" class="auth-input w-full" onchange="onBMIParamChange()">
                            <option value="fat_loss" ${healthProfile.fitness_goal === 'fat_loss' ? 'selected' : ''}>Fat Loss (-18% Deficit)</option>
                            <option value="maintenance" ${healthProfile.fitness_goal === 'maintenance' ? 'selected' : ''}>Maintenance (Recomp)</option>
                            <option value="muscle_gain" ${healthProfile.fitness_goal === 'muscle_gain' ? 'selected' : ''}>Muscle Gain (+12% Surplus)</option>
                        </select>
                    </div>
                    <div>
                        <label class="text-xs text-dim block mb-1 font-semibold uppercase">Diet Type</label>
                        <select id="inp-diet" class="auth-input w-full" onchange="onBMIParamChange()">
                            <option value="omnivore" ${healthProfile.diet_preference === 'omnivore' ? 'selected' : ''}>Omnivore / Standard</option>
                            <option value="vegetarian" ${healthProfile.diet_preference === 'vegetarian' ? 'selected' : ''}>Vegetarian</option>
                            <option value="vegan" ${healthProfile.diet_preference === 'vegan' ? 'selected' : ''}>Vegan (Plant-Based)</option>
                            <option value="keto" ${healthProfile.diet_preference === 'keto' ? 'selected' : ''}>Keto / Low-Carb</option>
                        </select>
                    </div>
                </div>

                <!-- Action Buttons -->
                <div class="pt-2 flex gap-3">
                    <button onclick="saveBMILog()" class="btn-primary flex-1 py-3 text-xs tracking-wider uppercase">
                        Save to Health Profile
                    </button>
                    <button onclick="applyTargetsToTracker()" class="btn-secondary py-3 text-xs tracking-wider uppercase text-yellow">
                        Sync To Food Tracker →
                    </button>
                </div>
            </div>

            <!-- Right: Results, Gauge & Metabolic Breakdown (7 cols) -->
            <div class="lg:col-span-7 space-y-6">
                <!-- BMI Gauge & Primary Score Card -->
                <div class="glass-card p-6 rounded-xl relative overflow-hidden" id="bmi-score-card">
                    <div class="flex flex-wrap items-center justify-between gap-4 mb-4">
                        <div>
                            <span class="text-xs text-dim font-bold tracking-widest uppercase">BODY MASS INDEX</span>
                            <div class="flex items-baseline gap-3 mt-1">
                                <span class="text-5xl font-black text-white" id="disp-bmi-val">${metrics.bmi}</span>
                                <span class="badge ${metrics.catClass} text-sm font-bold uppercase tracking-wider px-3 py-1" id="disp-bmi-badge">${metrics.category}</span>
                            </div>
                        </div>
                        <div class="text-right">
                            <span class="text-xs text-dim block">Healthy Weight Target:</span>
                            <span class="text-sm font-bold text-cyan" id="disp-healthy-range">
                                ${!isImperial ? `${metrics.healthy_range_kg[0]} – ${metrics.healthy_range_kg[1]} kg` : `${Math.round(metrics.healthy_range_kg[0] * 2.20462)} – ${Math.round(metrics.healthy_range_kg[1] * 2.20462)} lbs`}
                            </span>
                        </div>
                    </div>

                    <!-- BMI Gauge Bar Visual -->
                    <div class="mt-4 mb-2">
                        <div class="bmi-gauge-bar relative w-full h-4 rounded-full overflow-hidden flex" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);">
                            <div class="h-full" style="width: 25%; background: linear-gradient(90deg, #5FFFFF, #00E5FF);" title="Underweight (< 18.5)"></div>
                            <div class="h-full" style="width: 25%; background: linear-gradient(90deg, #00E5FF, #10B981);" title="Normal (18.5 - 24.9)"></div>
                            <div class="h-full" style="width: 25%; background: linear-gradient(90deg, #10B981, #FFC400);" title="Overweight (25 - 29.9)"></div>
                            <div class="h-full" style="width: 25%; background: linear-gradient(90deg, #FFC400, #FF6A00);" title="Obese (30+)"></div>
                        </div>
                        
                        <!-- Animated Pointer Needle -->
                        <div class="relative w-full h-6">
                            <div id="bmi-gauge-needle" class="absolute top-0 transform -translate-x-1/2 flex flex-col items-center transition-all duration-300" style="left: ${getBMIPointerPercent(metrics.bmi)}%;">
                                <div class="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[8px] border-b-white"></div>
                                <span class="text-[10px] font-black text-white bg-black/80 px-1 rounded border border-white/20" id="gauge-pin-val">${metrics.bmi}</span>
                            </div>
                        </div>

                        <div class="flex justify-between text-[10px] text-dim font-bold uppercase mt-1 px-1">
                            <span>&lt; 18.5 Under</span>
                            <span>18.5 - 24.9 Normal</span>
                            <span>25 - 29.9 Over</span>
                            <span>30+ Obese</span>
                        </div>
                    </div>

                    <p class="text-xs text-secondary leading-relaxed mt-3 border-t border-white/5 pt-3" id="disp-bmi-desc">
                        ${metrics.catDesc}
                    </p>
                </div>

                <!-- Metabolic Rates & Energy Grid (BMR, TDEE, Target Calories) -->
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div class="glass-card p-4 rounded-xl text-center">
                        <span class="text-[10px] text-dim uppercase tracking-wider font-bold block">BMR (Mifflin)</span>
                        <div class="text-xl font-extrabold text-white mt-1" id="disp-bmr-msj">${metrics.bmr_msj}</div>
                        <span class="text-[10px] text-cyan">kcal/day basal</span>
                    </div>

                    <div class="glass-card p-4 rounded-xl text-center">
                        <span class="text-[10px] text-dim uppercase tracking-wider font-bold block">BMR (Harris-B)</span>
                        <div class="text-xl font-extrabold text-white mt-1" id="disp-bmr-hb">${metrics.bmr_hb}</div>
                        <span class="text-[10px] text-secondary">kcal/day basal</span>
                    </div>

                    <div class="glass-card p-4 rounded-xl text-center">
                        <span class="text-[10px] text-dim uppercase tracking-wider font-bold block">TDEE Burn</span>
                        <div class="text-xl font-extrabold text-yellow mt-1" id="disp-tdee">${metrics.tdee}</div>
                        <span class="text-[10px] text-yellow">daily energy</span>
                    </div>

                    <div class="glass-card p-4 rounded-xl text-center border border-cyan/30" style="box-shadow: 0 0 15px rgba(0,229,255,0.08);">
                        <span class="text-[10px] text-cyan uppercase tracking-wider font-bold block">Target Calories</span>
                        <div class="text-xl font-black text-cyan mt-1" id="disp-target-kcal">${metrics.target_kcal}</div>
                        <span class="text-[10px] text-dim">goal adjusted</span>
                    </div>
                </div>

                <!-- Macro Targets Breakdown -->
                <div class="glass-card p-6 rounded-xl">
                    <div class="flex items-center justify-between mb-4">
                        <h4 style="font-family:var(--font-display);font-size:1.05rem;font-weight:700;color:var(--white)">DAILY TARGET MACRO DISTRIBUTION</h4>
                        <span class="badge badge-yellow text-xs font-bold">${healthProfile.fitness_goal.replace('_', ' ').toUpperCase()}</span>
                    </div>

                    <!-- Macro Split Segmented Bar -->
                    <div class="w-full h-3 rounded-full overflow-hidden flex mb-4" style="background: rgba(255,255,255,0.05);">
                        <div id="bar-macro-protein" class="h-full transition-all duration-300" style="width: ${metrics.macros.protein_pct}%; background: #00E5FF;" title="Protein"></div>
                        <div id="bar-macro-carbs" class="h-full transition-all duration-300" style="width: ${metrics.macros.carbs_pct}%; background: #FFC400;" title="Carbohydrates"></div>
                        <div id="bar-macro-fat" class="h-full transition-all duration-300" style="width: ${metrics.macros.fat_pct}%; background: #FF6A00;" title="Fats"></div>
                    </div>

                    <!-- Macro Stat Cards -->
                    <div class="grid grid-cols-3 gap-3">
                        <div class="bg-black/30 p-3 rounded-lg border border-cyan/20">
                            <div class="flex items-center gap-1.5 mb-1">
                                <span class="w-2 h-2 rounded-full bg-cyan inline-block"></span>
                                <span class="text-xs text-dim font-bold uppercase">Protein</span>
                            </div>
                            <div class="text-lg font-black text-white" id="disp-macro-protein">${metrics.macros.protein_g}g</div>
                            <div class="text-[11px] text-cyan" id="disp-macro-protein-sub">${metrics.macros.protein_g * 4} kcal (${metrics.macros.protein_pct}%)</div>
                        </div>

                        <div class="bg-black/30 p-3 rounded-lg border border-yellow/20">
                            <div class="flex items-center gap-1.5 mb-1">
                                <span class="w-2 h-2 rounded-full bg-yellow inline-block"></span>
                                <span class="text-xs text-dim font-bold uppercase">Carbs</span>
                            </div>
                            <div class="text-lg font-black text-white" id="disp-macro-carbs">${metrics.macros.carbs_g}g</div>
                            <div class="text-[11px] text-yellow" id="disp-macro-carbs-sub">${metrics.macros.carbs_g * 4} kcal (${metrics.macros.carbs_pct}%)</div>
                        </div>

                        <div class="bg-black/30 p-3 rounded-lg border border-[#FF6A00]/20">
                            <div class="flex items-center gap-1.5 mb-1">
                                <span class="w-2 h-2 rounded-full bg-[#FF6A00] inline-block"></span>
                                <span class="text-xs text-dim font-bold uppercase">Fats</span>
                            </div>
                            <div class="text-lg font-black text-white" id="disp-macro-fat">${metrics.macros.fat_g}g</div>
                            <div class="text-[11px] text-[#FF6A00]" id="disp-macro-fat-sub">${metrics.macros.fat_g * 9} kcal (${metrics.macros.fat_pct}%)</div>
                        </div>
                    </div>
                </div>

                <!-- AI Nutritional Deficiency Watchlist -->
                <div class="glass-card p-5 rounded-xl border border-white/5">
                    <div class="flex items-center gap-2 mb-2">
                        <span class="text-yellow text-sm">✦</span>
                        <h4 class="text-xs font-bold text-dim uppercase tracking-wider">AI Nutritional Deficiency & Watchlist</h4>
                    </div>
                    <ul class="space-y-1.5 text-xs text-secondary" id="disp-deficiencies">
                        ${metrics.deficiencies.map(d => `<li class="flex items-start gap-2"><span class="text-cyan">•</span> <span>${d}</span></li>`).join('')}
                    </ul>
                </div>
            </div>
        </div>

        <!-- Saved History Section -->
        <div class="glass-card p-6 rounded-xl">
            <div class="flex items-center justify-between mb-4">
                <div>
                    <h3 style="font-family:var(--font-display);font-size:1.15rem;font-weight:700;color:var(--white)">RECENT MEASUREMENT LOGS</h3>
                    <p class="text-xs text-dim">Historical record of your BMI, body weight, and metabolic milestones.</p>
                </div>
                <button onclick="clearBMIHistory()" class="btn-ghost text-xs text-dim hover:text-danger">Clear History</button>
            </div>
            <div id="bmi-history-table" class="overflow-x-auto">
                <!-- Rendered dynamically -->
            </div>
        </div>
    `;

    renderBMIHistoryTable();
};

function getBMIPointerPercent(bmi) {
    const min = 12, max = 40;
    const clamped = Math.max(min, Math.min(bmi, max));
    return ((clamped - min) / (max - min)) * 100;
}

// Interactive handlers for BMI module
window.setUnits = function(unit) {
    healthProfile.units = unit;
    saveNutritionState();
    const c = document.getElementById('main-content');
    if (c) window.renderBMIView(c.firstElementChild || c);
};

window.syncHeightMetric = function(val) {
    healthProfile.height_cm = +val;
    const el1 = document.getElementById('val-height-cm');
    const el2 = document.getElementById('inp-height-cm');
    const el3 = document.getElementById('range-height-cm');
    if (el1) el1.textContent = `${val} cm`;
    if (el2 && el2.value != val) el2.value = val;
    if (el3 && el3.value != val) el3.value = val;
    onBMIParamChange();
};

window.syncWeightMetric = function(val) {
    healthProfile.weight_kg = +val;
    const el1 = document.getElementById('val-weight-kg');
    const el2 = document.getElementById('inp-weight-kg');
    const el3 = document.getElementById('range-weight-kg');
    if (el1) el1.textContent = `${val} kg`;
    if (el2 && el2.value != val) el2.value = val;
    if (el3 && el3.value != val) el3.value = val;
    onBMIParamChange();
};

window.syncHeightImperial = function() {
    const ft = +document.getElementById('inp-height-ft')?.value || 5;
    const inch = +document.getElementById('inp-height-in')?.value || 9;
    healthProfile.height_cm = Math.round((ft * 12 + inch) * 2.54);
    onBMIParamChange();
};

window.syncWeightImperial = function(val) {
    const lbs = +val;
    healthProfile.weight_kg = +(lbs / 2.20462).toFixed(1);
    const el1 = document.getElementById('val-weight-lbs');
    const el2 = document.getElementById('inp-weight-lbs');
    const el3 = document.getElementById('range-weight-lbs');
    if (el1) el1.textContent = `${lbs} lbs`;
    if (el2 && el2.value != lbs) el2.value = lbs;
    if (el3 && el3.value != lbs) el3.value = lbs;
    onBMIParamChange();
};

window.onBMIParamChange = function() {
    const ageEl = document.getElementById('inp-age');
    const genEl = document.getElementById('inp-gender');
    const actEl = document.getElementById('inp-activity');
    const goalEl = document.getElementById('inp-goal');
    const dietEl = document.getElementById('inp-diet');

    if (ageEl) healthProfile.age = +ageEl.value || 25;
    if (genEl) healthProfile.gender = genEl.value;
    if (actEl) healthProfile.activity_level = actEl.value;
    if (goalEl) healthProfile.fitness_goal = goalEl.value;
    if (dietEl) healthProfile.diet_preference = dietEl.value;

    saveNutritionState();

    const m = computeClientMetrics();

    // Update real-time DOM elements
    const dispBmi = document.getElementById('disp-bmi-val');
    const dispBadge = document.getElementById('disp-bmi-badge');
    const dispRange = document.getElementById('disp-healthy-range');
    const dispDesc = document.getElementById('disp-bmi-desc');
    const needle = document.getElementById('bmi-gauge-needle');
    const pinVal = document.getElementById('gauge-pin-val');

    if (dispBmi) dispBmi.textContent = m.bmi;
    if (dispBadge) {
        dispBadge.textContent = m.category;
        dispBadge.className = `badge ${m.catClass} text-sm font-bold uppercase tracking-wider px-3 py-1`;
    }
    if (dispRange) {
        dispRange.textContent = healthProfile.units === 'imperial'
            ? `${Math.round(m.healthy_range_kg[0] * 2.20462)} – ${Math.round(m.healthy_range_kg[1] * 2.20462)} lbs`
            : `${m.healthy_range_kg[0]} – ${m.healthy_range_kg[1]} kg`;
    }
    if (dispDesc) dispDesc.textContent = m.catDesc;
    if (needle) needle.style.left = `${getBMIPointerPercent(m.bmi)}%`;
    if (pinVal) pinVal.textContent = m.bmi;

    const bmrMsj = document.getElementById('disp-bmr-msj');
    const bmrHb = document.getElementById('disp-bmr-hb');
    const tdee = document.getElementById('disp-tdee');
    const targetKcal = document.getElementById('disp-target-kcal');

    if (bmrMsj) bmrMsj.textContent = m.bmr_msj;
    if (bmrHb) bmrHb.textContent = m.bmr_hb;
    if (tdee) tdee.textContent = m.tdee;
    if (targetKcal) targetKcal.textContent = m.target_kcal;

    // Macros
    const pBar = document.getElementById('bar-macro-protein');
    const cBar = document.getElementById('bar-macro-carbs');
    const fBar = document.getElementById('bar-macro-fat');
    if (pBar) pBar.style.width = `${m.macros.protein_pct}%`;
    if (cBar) cBar.style.width = `${m.macros.carbs_pct}%`;
    if (fBar) fBar.style.width = `${m.macros.fat_pct}%`;

    const pVal = document.getElementById('disp-macro-protein');
    const pSub = document.getElementById('disp-macro-protein-sub');
    const cVal = document.getElementById('disp-macro-carbs');
    const cSub = document.getElementById('disp-macro-carbs-sub');
    const fVal = document.getElementById('disp-macro-fat');
    const fSub = document.getElementById('disp-macro-fat-sub');

    if (pVal) pVal.textContent = `${m.macros.protein_g}g`;
    if (pSub) pSub.textContent = `${m.macros.protein_g * 4} kcal (${m.macros.protein_pct}%)`;
    if (cVal) cVal.textContent = `${m.macros.carbs_g}g`;
    if (cSub) cSub.textContent = `${m.macros.carbs_g * 4} kcal (${m.macros.carbs_pct}%)`;
    if (fVal) fVal.textContent = `${m.macros.fat_g}g`;
    if (fSub) fSub.textContent = `${m.macros.fat_g * 9} kcal (${m.macros.fat_pct}%)`;

    const defsList = document.getElementById('disp-deficiencies');
    if (defsList) {
        defsList.innerHTML = m.deficiencies.map(d => `<li class="flex items-start gap-2"><span class="text-cyan">•</span> <span>${d}</span></li>`).join('');
    }
};

window.saveBMILog = async function() {
    const m = computeClientMetrics();
    const entry = {
        id: Date.now(),
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        bmi: m.bmi,
        category: m.category,
        weight_kg: healthProfile.weight_kg,
        height_cm: healthProfile.height_cm,
        target_kcal: m.target_kcal
    };

    try {
        const history = JSON.parse(localStorage.getItem(BMI_HISTORY_KEY) || '[]');
        history.unshift(entry);
        localStorage.setItem(BMI_HISTORY_KEY, JSON.stringify(history.slice(0, 30)));
    } catch (_) {}

    // Also sync to backend SQLite database log
    try {
        await fetch('/v1/progress/log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_label: 'user',
                bmi: m.bmi,
                payload: {
                    weight_kg: healthProfile.weight_kg,
                    height_cm: healthProfile.height_cm,
                    target_calories: m.target_kcal,
                    category: m.category
                }
            })
        });
    } catch (_) {}

    renderBMIHistoryTable();
    showToast('Measurement logged to health profile.');
};

window.applyTargetsToTracker = function() {
    const m = computeClientMetrics();
    healthProfile.target_calories = m.target_kcal;
    healthProfile.target_protein = m.macros.protein_g;
    healthProfile.target_carbs = m.macros.carbs_g;
    healthProfile.target_fat = m.macros.fat_g;
    saveNutritionState();
    showToast(`Synced targets: ${m.target_kcal} kcal (${m.macros.protein_g}P / ${m.macros.carbs_g}C / ${m.macros.fat_g}F)`);
    if (window.nav) window.nav('food-tracker');
};

function renderBMIHistoryTable() {
    const container = document.getElementById('bmi-history-table');
    if (!container) return;

    let history = [];
    try {
        history = JSON.parse(localStorage.getItem(BMI_HISTORY_KEY) || '[]');
    } catch (_) {}

    if (!history.length) {
        container.innerHTML = `
            <div class="text-center py-6 text-dim text-xs">
                No past records saved yet. Click "Save to Health Profile" above to track progress over time.
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <table class="w-full text-left text-xs">
            <thead>
                <tr class="border-b border-white/10 text-dim">
                    <th class="py-2">Date & Time</th>
                    <th class="py-2">Weight</th>
                    <th class="py-2">BMI</th>
                    <th class="py-2">Category</th>
                    <th class="py-2">Target Calories</th>
                    <th class="py-2 text-right">Action</th>
                </tr>
            </thead>
            <tbody>
                ${history.map(item => `
                    <tr class="border-b border-white/5 hover:bg-white/[0.02]">
                        <td class="py-3 text-white font-semibold">${item.date} <span class="text-dim text-[10px] font-normal">${item.time || ''}</span></td>
                        <td class="py-3 text-yellow">${item.weight_kg} kg</td>
                        <td class="py-3 font-bold text-white">${item.bmi}</td>
                        <td class="py-3"><span class="badge badge-cyan text-[10px]">${item.category}</span></td>
                        <td class="py-3 text-cyan">${item.target_kcal || '—'} kcal</td>
                        <td class="py-3 text-right">
                            <button onclick="deleteBMIHistoryItem(${item.id})" class="text-dim hover:text-danger text-xs">✕</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

window.deleteBMIHistoryItem = function(id) {
    try {
        let history = JSON.parse(localStorage.getItem(BMI_HISTORY_KEY) || '[]');
        history = history.filter(h => h.id !== id);
        localStorage.setItem(BMI_HISTORY_KEY, JSON.stringify(history));
        renderBMIHistoryTable();
    } catch (_) {}
};

window.clearBMIHistory = function() {
    localStorage.removeItem(BMI_HISTORY_KEY);
    renderBMIHistoryTable();
};

// ══════════════════════════════════════════════════════════════════
//  VIEW 2: FOOD TRACKER & MEAL PLANNER
// ══════════════════════════════════════════════════════════════════
let currentTrackerSubTab = 'daily-log'; // 'daily-log' | 'meal-planner' | 'recipes'
let addingToMealType = 'breakfast';
let generatedWeeklyPlan = null;

window.renderFoodTrackerView = function(container) {
    loadNutritionState();
    const logData = getFoodLogs(activeTrackerDate);
    const totals = computeDayTotals(logData);
    const targetKcal = healthProfile.target_calories || 2200;
    const targetP = healthProfile.target_protein || 140;
    const targetC = healthProfile.target_carbs || 240;
    const targetF = healthProfile.target_fat || 70;

    const remainingKcal = targetKcal - totals.kcal;
    const calPct = Math.min(100, Math.round((totals.kcal / targetKcal) * 100));
    const pPct = Math.min(100, Math.round((totals.p / targetP) * 100));
    const cPct = Math.min(100, Math.round((totals.c / targetC) * 100));
    const fPct = Math.min(100, Math.round((totals.f / targetF) * 100));

    container.innerHTML = `
        <!-- Hero Header -->
        <div class="mb-6 relative overflow-hidden p-8 rounded-xl glass-card" style="background: linear-gradient(90deg, var(--black-1) 30%, transparent), url('/assets/media_1787652701429.jpg') center/cover; background-blend-mode: multiply; background-position: center 30%;">
            <div class="relative z-10">
                <div class="text-cyan mb-2" style="font-size: 0.65rem; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase;">MODULE // NUTRITION & FUEL</div>
                <h2 style="font-family:var(--font-display);font-size:3rem;font-weight:800;text-transform:uppercase;line-height:1;margin-bottom:0.5rem">Food <span class="text-yellow" style="font-size:0.5em; letter-spacing:0.1em;">TRACKER</span></h2>
                <p style="color:var(--text-secondary);font-size:0.85rem; max-width: 500px;">Log daily meals, monitor macro targets, generate AI 7-day meal plans, and discover fridge recipes.</p>
            </div>
        </div>

        <!-- Navigation Tabs -->
        <div class="flex flex-wrap items-center justify-between gap-4 mb-6 border-b border-white/10 pb-4">
            <div class="flex gap-2">
                <button onclick="setTrackerSubTab('daily-log')" class="${currentTrackerSubTab === 'daily-log' ? 'btn-primary' : 'btn-secondary'} text-xs uppercase font-bold tracking-wider">
                    🍳 Daily Meal Log
                </button>
                <button onclick="setTrackerSubTab('meal-planner')" class="${currentTrackerSubTab === 'meal-planner' ? 'btn-primary' : 'btn-secondary'} text-xs uppercase font-bold tracking-wider">
                    📋 AI Weekly Planner
                </button>
                <button onclick="setTrackerSubTab('recipes')" class="${currentTrackerSubTab === 'recipes' ? 'btn-primary' : 'btn-secondary'} text-xs uppercase font-bold tracking-wider">
                    🥘 Fridge Recipe Finder
                </button>
            </div>

            <!-- Date Picker -->
            <div class="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-lg border border-white/10">
                <button onclick="changeTrackerDate(-1)" class="text-dim hover:text-white text-sm px-1">◀</button>
                <span class="text-xs font-bold text-white tracking-wide" id="disp-tracker-date">${formatTrackerDate(activeTrackerDate)}</span>
                <button onclick="changeTrackerDate(1)" class="text-dim hover:text-white text-sm px-1">▶</button>
                <button onclick="setTrackerDateToday()" class="btn-ghost text-[10px] text-cyan ml-2 px-1">Today</button>
            </div>
        </div>

        <!-- Sub-View Content Container -->
        <div id="tracker-subview-content">
            ${renderTrackerSubView(currentTrackerSubTab, logData, totals, { targetKcal, targetP, targetC, targetF, remainingKcal, calPct, pPct, cPct, fPct })}
        </div>
    `;

    // Modal placeholders
    injectAddFoodModal();
};

function renderTrackerSubView(tab, logData, totals, t) {
    if (tab === 'meal-planner') return renderWeeklyPlannerTab(t.targetKcal);
    if (tab === 'recipes') return renderRecipeFinderTab();

    // Default: Daily Meal Log
    return `
        <!-- Calorie & Macro Budget Summary -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
            <!-- Calorie Card (5 cols) -->
            <div class="lg:col-span-5 glass-card p-6 rounded-xl relative overflow-hidden flex flex-col justify-between" style="box-shadow: 0 0 20px rgba(0,229,255,0.06);">
                <div class="flex justify-between items-start">
                    <div>
                        <span class="text-xs text-dim uppercase font-bold tracking-wider">DAILY CALORIE BUDGET</span>
                        <div class="text-4xl font-black text-white mt-1">${totals.kcal} <span class="text-sm font-normal text-dim">/ ${t.targetKcal} kcal</span></div>
                    </div>
                    <span class="badge ${t.remainingKcal >= 0 ? 'badge-cyan' : 'badge-danger'} text-xs font-bold">
                        ${t.remainingKcal >= 0 ? `${t.remainingKcal} kcal remaining` : `${Math.abs(t.remainingKcal)} kcal over`}
                    </span>
                </div>

                <!-- Progress Bar -->
                <div class="my-4">
                    <div class="w-full h-3 rounded-full overflow-hidden bg-white/5 border border-white/10">
                        <div class="h-full transition-all duration-500 ${t.calPct >= 100 ? 'bg-danger' : 'bg-cyan'}" style="width: ${t.calPct}%;"></div>
                    </div>
                    <div class="flex justify-between text-[11px] text-dim font-bold mt-1.5">
                        <span>Consumed: ${totals.kcal} kcal</span>
                        <span>${t.calPct}% Goal</span>
                    </div>
                </div>

                <!-- Quick Macro Mini Bar -->
                <div class="pt-3 border-t border-white/5 flex justify-between text-xs text-dim">
                    <span>Protein: <b class="text-cyan">${totals.p}g</b> / ${t.targetP}g</span>
                    <span>Carbs: <b class="text-yellow">${totals.c}g</b> / ${t.targetC}g</span>
                    <span>Fat: <b class="text-[#FF6A00]">${totals.f}g</b> / ${t.targetF}g</span>
                </div>
            </div>

            <!-- Macro Progress Rings / Bars (7 cols) -->
            <div class="lg:col-span-7 glass-card p-6 rounded-xl flex flex-col justify-between">
                <div class="flex items-center justify-between mb-3">
                    <span class="text-xs text-dim uppercase font-bold tracking-wider">MACRONUTRIENT TARGETS</span>
                    <button onclick="openTargetConfigModal()" class="btn-ghost text-xs text-cyan">Edit Targets ⚙</button>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <!-- Protein -->
                    <div class="bg-black/30 p-4 rounded-xl border border-cyan/20">
                        <div class="flex justify-between items-center mb-1">
                            <span class="text-xs font-bold text-cyan uppercase">Protein</span>
                            <span class="text-[11px] text-dim">${t.pPct}%</span>
                        </div>
                        <div class="text-2xl font-black text-white">${totals.p} <span class="text-xs text-dim font-normal">/ ${t.targetP}g</span></div>
                        <div class="w-full h-2 rounded-full bg-white/5 mt-2 overflow-hidden">
                            <div class="h-full bg-cyan transition-all duration-300" style="width: ${t.pPct}%;"></div>
                        </div>
                        <span class="text-[10px] text-dim mt-1.5 block">${Math.max(0, t.targetP - totals.p)}g left</span>
                    </div>

                    <!-- Carbs -->
                    <div class="bg-black/30 p-4 rounded-xl border border-yellow/20">
                        <div class="flex justify-between items-center mb-1">
                            <span class="text-xs font-bold text-yellow uppercase">Carbs</span>
                            <span class="text-[11px] text-dim">${t.cPct}%</span>
                        </div>
                        <div class="text-2xl font-black text-white">${totals.c} <span class="text-xs text-dim font-normal">/ ${t.targetC}g</span></div>
                        <div class="w-full h-2 rounded-full bg-white/5 mt-2 overflow-hidden">
                            <div class="h-full bg-yellow transition-all duration-300" style="width: ${t.cPct}%;"></div>
                        </div>
                        <span class="text-[10px] text-dim mt-1.5 block">${Math.max(0, t.targetC - totals.c)}g left</span>
                    </div>

                    <!-- Fats -->
                    <div class="bg-black/30 p-4 rounded-xl border border-[#FF6A00]/20">
                        <div class="flex justify-between items-center mb-1">
                            <span class="text-xs font-bold text-[#FF6A00] uppercase">Fats</span>
                            <span class="text-[11px] text-dim">${t.fPct}%</span>
                        </div>
                        <div class="text-2xl font-black text-white">${totals.f} <span class="text-xs text-dim font-normal">/ ${t.targetF}g</span></div>
                        <div class="w-full h-2 rounded-full bg-white/5 mt-2 overflow-hidden">
                            <div class="h-full bg-[#FF6A00] transition-all duration-300" style="width: ${t.fPct}%;"></div>
                        </div>
                        <span class="text-[10px] text-dim mt-1.5 block">${Math.max(0, t.targetF - totals.f)}g left</span>
                    </div>
                </div>

                <!-- Hydration Tracker -->
                <div class="mt-4 pt-3 border-t border-white/5 flex flex-wrap items-center justify-between gap-3">
                    <div class="flex items-center gap-2">
                        <span class="text-cyan text-base">💧</span>
                        <div>
                            <span class="text-xs font-bold text-white">Hydration:</span>
                            <span class="text-xs text-cyan font-bold" id="disp-water-val">${logData.water_ml || 0} ml</span>
                            <span class="text-[10px] text-dim">(${Math.round((logData.water_ml || 0) / 250)} / 8 glasses)</span>
                        </div>
                    </div>
                    <div class="flex items-center gap-1.5">
                        <button onclick="addWater(-250)" class="btn-secondary px-2.5 py-1 text-xs">-250ml</button>
                        <button onclick="addWater(250)" class="btn-primary px-3 py-1 text-xs text-black font-bold">+250ml 🥛</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- 4 Meal Categories Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            ${renderMealSection('breakfast', '🍳 Breakfast', logData.breakfast)}
            ${renderMealSection('lunch', '🥗 Lunch', logData.lunch)}
            ${renderMealSection('dinner', '🍲 Dinner', logData.dinner)}
            ${renderMealSection('snacks', '🍎 Snacks & Fuel', logData.snacks)}
        </div>
    `;
}

function renderMealSection(mealType, title, items = []) {
    const mealTotals = items.reduce((acc, item) => ({
        kcal: acc.kcal + (item.kcal || 0),
        p: acc.p + (item.p || 0),
        c: acc.c + (item.c || 0),
        f: acc.f + (item.f || 0)
    }), { kcal: 0, p: 0, c: 0, f: 0 });

    return `
        <div class="glass-card p-5 rounded-xl flex flex-col justify-between">
            <div>
                <!-- Header -->
                <div class="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
                    <div>
                        <h4 class="font-bold text-white text-base">${title}</h4>
                        <div class="text-xs text-dim mt-0.5">
                            <span class="text-cyan font-bold">${mealTotals.kcal} kcal</span> • 
                            <span>${mealTotals.p.toFixed(1)}g P</span> | 
                            <span>${mealTotals.c.toFixed(1)}g C</span> | 
                            <span>${mealTotals.f.toFixed(1)}g F</span>
                        </div>
                    </div>
                    <button onclick="openAddFoodModal('${mealType}')" class="btn-primary px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-black">
                        + Add Food
                    </button>
                </div>

                <!-- Food List -->
                <div class="space-y-2 mb-3">
                    ${items.length === 0 ? `
                        <div class="text-center py-4 text-dim text-xs border border-dashed border-white/10 rounded-lg">
                            No food logged for this meal yet. Click <b>+ Add Food</b> to record items.
                        </div>
                    ` : items.map((food, idx) => `
                        <div class="bg-black/30 p-2.5 rounded-lg border border-white/5 flex items-center justify-between hover:border-cyan/30 transition-all">
                            <div>
                                <div class="text-xs font-bold text-white">${food.name}</div>
                                <div class="text-[11px] text-dim">
                                    <span class="text-yellow">${food.portion}</span> • 
                                    <span class="text-cyan">${food.kcal} kcal</span> 
                                    (P: ${food.p}g | C: ${food.c}g | F: ${food.f}g)
                                </div>
                            </div>
                            <button onclick="removeFoodItem('${mealType}', ${idx})" class="text-dim hover:text-danger text-xs px-2 py-1 transition-colors" title="Remove">✕</button>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
}

function computeDayTotals(logData) {
    const all = [...(logData.breakfast || []), ...(logData.lunch || []), ...(logData.dinner || []), ...(logData.snacks || [])];
    return all.reduce((acc, it) => ({
        kcal: Math.round(acc.kcal + (it.kcal || 0)),
        p: +(acc.p + (it.p || 0)).toFixed(1),
        c: +(acc.c + (it.c || 0)).toFixed(1),
        f: +(acc.f + (it.f || 0)).toFixed(1)
    }), { kcal: 0, p: 0, c: 0, f: 0 });
}

function formatTrackerDate(dateStr) {
    if (dateStr === getTodayKey()) return 'Today';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

window.changeTrackerDate = function(offset) {
    const d = new Date(activeTrackerDate + 'T00:00:00');
    d.setDate(d.getDate() + offset);
    activeTrackerDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const c = document.getElementById('main-content');
    if (c) window.renderFoodTrackerView(c.firstElementChild || c);
};

window.setTrackerDateToday = function() {
    activeTrackerDate = getTodayKey();
    const c = document.getElementById('main-content');
    if (c) window.renderFoodTrackerView(c.firstElementChild || c);
};

window.setTrackerSubTab = function(tab) {
    currentTrackerSubTab = tab;
    const c = document.getElementById('main-content');
    if (c) window.renderFoodTrackerView(c.firstElementChild || c);
};

window.addWater = function(amount) {
    const logData = getFoodLogs(activeTrackerDate);
    logData.water_ml = Math.max(0, (logData.water_ml || 0) + amount);
    saveFoodLogs(activeTrackerDate, logData);
    const disp = document.getElementById('disp-water-val');
    if (disp) disp.textContent = `${logData.water_ml} ml`;
    const c = document.getElementById('main-content');
    if (c) window.renderFoodTrackerView(c.firstElementChild || c);
};

// ── ADD FOOD MODAL ────────────────────────────────────────────────
let selectedFoodBase = null;

function injectAddFoodModal() {
    let modal = document.getElementById('add-food-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'add-food-modal';
        modal.className = 'fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 hidden';
        document.body.appendChild(modal);
    }
}

window.openAddFoodModal = function(mealType) {
    addingToMealType = mealType;
    injectAddFoodModal();
    const modal = document.getElementById('add-food-modal');
    selectedFoodBase = VERIFIED_FOODS[0];

    modal.innerHTML = `
        <div class="glass-card p-6 rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden" style="border: 1px solid rgba(0,229,255,0.2); box-shadow: 0 0 40px rgba(0,0,0,0.9);">
            <!-- Header -->
            <div class="flex justify-between items-center pb-4 border-b border-white/10">
                <div>
                    <h3 style="font-family:var(--font-display);font-size:1.25rem;font-weight:800;color:var(--white)">
                        ADD FOOD TO <span class="text-cyan uppercase">${mealType}</span>
                    </h3>
                    <p class="text-xs text-dim">Search our verified nutrition database or enter a custom meal item.</p>
                </div>
                <button onclick="closeAddFoodModal()" class="btn-ghost text-lg">✕</button>
            </div>

            <!-- Tabs: Search Database vs Custom Entry -->
            <div class="flex gap-2 my-4">
                <button id="tab-btn-db" onclick="switchFoodModalTab('db')" class="btn-primary flex-1 text-xs py-2 uppercase font-bold text-black">
                    🔍 Search Database
                </button>
                <button id="tab-btn-custom" onclick="switchFoodModalTab('custom')" class="btn-secondary flex-1 text-xs py-2 uppercase font-bold">
                    ✏️ Custom Entry
                </button>
            </div>

            <!-- Panel 1: Database Search -->
            <div id="panel-food-db" class="flex-1 overflow-y-auto space-y-4 pr-1">
                <!-- Search bar -->
                <input type="text" id="food-search-inp" placeholder="Type to search (e.g. Chicken, Oats, Rice, Eggs, Protein...)" 
                    class="auth-input w-full text-xs py-2.5" oninput="filterFoodDatabase(this.value)">

                <!-- Food items list -->
                <div id="food-db-list" class="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    ${renderFoodDbList(VERIFIED_FOODS)}
                </div>

                <!-- Portion Customizer -->
                <div class="bg-black/40 p-4 rounded-xl border border-white/10 space-y-3">
                    <div class="flex justify-between items-center">
                        <span class="text-xs font-bold text-white" id="selected-food-name">${selectedFoodBase.name}</span>
                        <span class="badge badge-cyan text-xs" id="selected-food-cat">${selectedFoodBase.category}</span>
                    </div>

                    <div class="grid grid-cols-2 gap-3 items-center">
                        <div>
                            <label class="text-[11px] text-dim block mb-1 uppercase font-semibold">Portion Size</label>
                            <div class="flex items-center gap-2">
                                <input type="number" id="inp-food-qty" min="1" max="2000" value="${selectedFoodBase.baseQty}" class="auth-input w-24 text-center text-sm font-bold" oninput="updateFoodPortionCalc()">
                                <span class="text-xs text-dim" id="selected-food-unit">${selectedFoodBase.unit}</span>
                            </div>
                        </div>

                        <div class="bg-black/60 p-2.5 rounded-lg text-right border border-white/5">
                            <div class="text-lg font-black text-yellow" id="calc-food-kcal">${selectedFoodBase.kcal} kcal</div>
                            <div class="text-[11px] text-dim" id="calc-food-macros">P: ${selectedFoodBase.p}g | C: ${selectedFoodBase.c}g | F: ${selectedFoodBase.f}g</div>
                        </div>
                    </div>
                </div>

                <button onclick="commitAddFoodFromDb()" class="btn-primary w-full py-3 text-xs tracking-wider uppercase font-bold text-black">
                    Add To ${mealType.toUpperCase()}
                </button>
            </div>

            <!-- Panel 2: Custom Food Entry -->
            <div id="panel-food-custom" class="hidden space-y-4 pr-1">
                <div>
                    <label class="text-xs text-dim block mb-1 uppercase font-semibold">Item Name</label>
                    <input type="text" id="cust-food-name" placeholder="e.g. Grilled Salmon Bowl" class="auth-input w-full">
                </div>

                <div>
                    <label class="text-xs text-dim block mb-1 uppercase font-semibold">Portion Text</label>
                    <input type="text" id="cust-food-portion" placeholder="e.g. 1 bowl (250g)" class="auth-input w-full">
                </div>

                <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                        <label class="text-[11px] text-dim block mb-1 uppercase">Calories (kcal)</label>
                        <input type="number" id="cust-food-kcal" placeholder="350" class="auth-input w-full">
                    </div>
                    <div>
                        <label class="text-[11px] text-dim block mb-1 uppercase">Protein (g)</label>
                        <input type="number" id="cust-food-p" placeholder="25" class="auth-input w-full">
                    </div>
                    <div>
                        <label class="text-[11px] text-dim block mb-1 uppercase">Carbs (g)</label>
                        <input type="number" id="cust-food-c" placeholder="30" class="auth-input w-full">
                    </div>
                    <div>
                        <label class="text-[11px] text-dim block mb-1 uppercase">Fat (g)</label>
                        <input type="number" id="cust-food-f" placeholder="10" class="auth-input w-full">
                    </div>
                </div>

                <button onclick="commitAddCustomFood()" class="btn-primary w-full py-3 text-xs tracking-wider uppercase font-bold text-black mt-4">
                    Save Custom Food Item
                </button>
            </div>
        </div>
    `;

    modal.classList.remove('hidden');
};

window.closeAddFoodModal = function() {
    const modal = document.getElementById('add-food-modal');
    if (modal) modal.classList.add('hidden');
};

window.switchFoodModalTab = function(tab) {
    const pDb = document.getElementById('panel-food-db');
    const pCust = document.getElementById('panel-food-custom');
    const bDb = document.getElementById('tab-btn-db');
    const bCust = document.getElementById('tab-btn-custom');

    if (tab === 'db') {
        pDb?.classList.remove('hidden');
        pCust?.classList.add('hidden');
        bDb?.classList.replace('btn-secondary', 'btn-primary');
        bCust?.classList.replace('btn-primary', 'btn-secondary');
    } else {
        pDb?.classList.add('hidden');
        pCust?.classList.remove('hidden');
        bCust?.classList.replace('btn-secondary', 'btn-primary');
        bDb?.classList.replace('btn-primary', 'btn-secondary');
    }
};

function renderFoodDbList(foods) {
    if (!foods.length) return `<div class="text-xs text-dim py-4 text-center">No matching food found. Try Custom Entry.</div>`;
    return foods.map(f => `
        <div onclick="selectFoodDbItem('${f.id}')" class="p-2.5 rounded-lg bg-black/30 border border-white/5 hover:border-cyan/40 hover:bg-cyan/5 cursor-pointer flex justify-between items-center transition-all">
            <div>
                <span class="text-xs font-bold text-white">${f.name}</span>
                <span class="text-[10px] text-dim ml-2">(${f.baseQty} ${f.unit})</span>
            </div>
            <div class="text-right">
                <span class="text-xs font-bold text-yellow">${f.kcal} kcal</span>
                <span class="text-[10px] text-dim block">P:${f.p}g C:${f.c}g F:${f.f}g</span>
            </div>
        </div>
    `).join('');
}

window.filterFoodDatabase = function(query) {
    const q = query.toLowerCase().trim();
    const filtered = VERIFIED_FOODS.filter(f => f.name.toLowerCase().includes(q) || f.category.toLowerCase().includes(q));
    const container = document.getElementById('food-db-list');
    if (container) container.innerHTML = renderFoodDbList(filtered);
};

window.selectFoodDbItem = function(id) {
    const f = VERIFIED_FOODS.find(item => item.id === id);
    if (!f) return;
    selectedFoodBase = f;

    const nameEl = document.getElementById('selected-food-name');
    const catEl = document.getElementById('selected-food-cat');
    const unitEl = document.getElementById('selected-food-unit');
    const qtyInp = document.getElementById('inp-food-qty');

    if (nameEl) nameEl.textContent = f.name;
    if (catEl) catEl.textContent = f.category;
    if (unitEl) unitEl.textContent = f.unit;
    if (qtyInp) qtyInp.value = f.baseQty;

    updateFoodPortionCalc();
};

window.updateFoodPortionCalc = function() {
    if (!selectedFoodBase) return;
    const qty = +document.getElementById('inp-food-qty')?.value || selectedFoodBase.baseQty;
    const ratio = qty / selectedFoodBase.baseQty;

    const kcal = Math.round(selectedFoodBase.kcal * ratio);
    const p = +(selectedFoodBase.p * ratio).toFixed(1);
    const c = +(selectedFoodBase.c * ratio).toFixed(1);
    const f = +(selectedFoodBase.f * ratio).toFixed(1);

    const kcalEl = document.getElementById('calc-food-kcal');
    const macrosEl = document.getElementById('calc-food-macros');

    if (kcalEl) kcalEl.textContent = `${kcal} kcal`;
    if (macrosEl) macrosEl.textContent = `P: ${p}g | C: ${c}g | F: ${f}g`;
};

window.commitAddFoodFromDb = function() {
    if (!selectedFoodBase) return;
    const qty = +document.getElementById('inp-food-qty')?.value || selectedFoodBase.baseQty;
    const ratio = qty / selectedFoodBase.baseQty;

    const foodItem = {
        name: selectedFoodBase.name,
        portion: `${qty} ${selectedFoodBase.unit}`,
        kcal: Math.round(selectedFoodBase.kcal * ratio),
        p: +(selectedFoodBase.p * ratio).toFixed(1),
        c: +(selectedFoodBase.c * ratio).toFixed(1),
        f: +(selectedFoodBase.f * ratio).toFixed(1)
    };

    const logData = getFoodLogs(activeTrackerDate);
    if (!logData[addingToMealType]) logData[addingToMealType] = [];
    logData[addingToMealType].push(foodItem);
    saveFoodLogs(activeTrackerDate, logData);

    closeAddFoodModal();
    const c = document.getElementById('main-content');
    if (c) window.renderFoodTrackerView(c.firstElementChild || c);
    showToast(`Added ${foodItem.name} to ${addingToMealType}.`);
};

window.commitAddCustomFood = function() {
    const name = document.getElementById('cust-food-name')?.value?.trim();
    if (!name) {
        alert('Please enter a food name');
        return;
    }
    const portion = document.getElementById('cust-food-portion')?.value?.trim() || '1 serving';
    const kcal = +document.getElementById('cust-food-kcal')?.value || 0;
    const p = +document.getElementById('cust-food-p')?.value || 0;
    const c = +document.getElementById('cust-food-c')?.value || 0;
    const f = +document.getElementById('cust-food-f')?.value || 0;

    const foodItem = { name, portion, kcal, p, c, f };
    const logData = getFoodLogs(activeTrackerDate);
    if (!logData[addingToMealType]) logData[addingToMealType] = [];
    logData[addingToMealType].push(foodItem);
    saveFoodLogs(activeTrackerDate, logData);

    closeAddFoodModal();
    const cont = document.getElementById('main-content');
    if (cont) window.renderFoodTrackerView(cont.firstElementChild || cont);
    showToast(`Added custom food ${foodItem.name}.`);
};

window.removeFoodItem = function(mealType, index) {
    const logData = getFoodLogs(activeTrackerDate);
    if (logData[mealType] && logData[mealType][index] !== undefined) {
        logData[mealType].splice(index, 1);
        saveFoodLogs(activeTrackerDate, logData);
        const c = document.getElementById('main-content');
        if (c) window.renderFoodTrackerView(c.firstElementChild || c);
    }
};

window.openTargetConfigModal = function() {
    const newKcal = prompt('Enter Daily Target Calories (kcal):', healthProfile.target_calories || 2200);
    if (newKcal && !isNaN(newKcal)) {
        healthProfile.target_calories = +newKcal;
        saveNutritionState();
        const c = document.getElementById('main-content');
        if (c) window.renderFoodTrackerView(c.firstElementChild || c);
    }
};

// ── SUB-VIEW: 7-DAY AI WEEKLY PLANNER ─────────────────────────────
let selectedPlanDay = 1;

function renderWeeklyPlannerTab(targetKcal) {
    return `
        <div class="space-y-6">
            <div class="glass-card p-6 rounded-xl">
                <div class="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h3 style="font-family:var(--font-display);font-size:1.25rem;font-weight:700;color:var(--white)">AI 7-DAY NUTRITION SCHEDULE</h3>
                        <p class="text-xs text-dim">Generate an automated, goal-scaled weekly meal schedule with calculated macros.</p>
                    </div>

                    <div class="flex items-center gap-3">
                        <select id="planner-diet-select" class="auth-input text-xs py-2">
                            <option value="omnivore" ${healthProfile.diet_preference === 'omnivore' ? 'selected' : ''}>Omnivore</option>
                            <option value="vegetarian" ${healthProfile.diet_preference === 'vegetarian' ? 'selected' : ''}>Vegetarian</option>
                            <option value="vegan" ${healthProfile.diet_preference === 'vegan' ? 'selected' : ''}>Vegan</option>
                            <option value="keto" ${healthProfile.diet_preference === 'keto' ? 'selected' : ''}>Keto</option>
                        </select>
                        <button onclick="generateWeeklyPlanAPI()" class="btn-primary text-xs py-2 px-4 uppercase font-bold text-black">
                            ⚡ Generate Plan
                        </button>
                    </div>
                </div>
            </div>

            <div id="weekly-plan-display">
                ${generatedWeeklyPlan ? renderWeeklyPlanDays(generatedWeeklyPlan) : `
                    <div class="glass-card p-12 rounded-xl text-center">
                        <div class="text-4xl mb-3">📋</div>
                        <h4 class="text-white font-bold mb-1">No Plan Generated Yet</h4>
                        <p class="text-xs text-dim mb-4">Click "Generate Plan" above to create a tailored 7-day meal plan based on your caloric target.</p>
                        <button onclick="generateWeeklyPlanAPI()" class="btn-primary text-xs py-2.5 px-6 font-bold text-black uppercase">
                            Generate My 7-Day Plan
                        </button>
                    </div>
                `}
            </div>
        </div>
    `;
}

window.generateWeeklyPlanAPI = async function() {
    const diet = document.getElementById('planner-diet-select')?.value || healthProfile.diet_preference;
    healthProfile.diet_preference = diet;
    saveNutritionState();

    const display = document.getElementById('weekly-plan-display');
    if (display) {
        display.innerHTML = `
            <div class="glass-card p-12 rounded-xl text-center">
                <div class="loading-spinner mx-auto mb-3"></div>
                <p class="text-xs text-dim">Computing daily nutrient targets & generating 7-day schedule...</p>
            </div>
        `;
    }

    try {
        const res = await fetch('/v1/nutrition/weekly-plan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                age: healthProfile.age,
                gender: healthProfile.gender,
                height_cm: healthProfile.height_cm,
                weight_kg: healthProfile.weight_kg,
                activity_level: healthProfile.activity_level,
                fitness_goal: healthProfile.fitness_goal,
                diet_preference: diet
            })
        });
        const data = await res.json();
        generatedWeeklyPlan = data.meal_plan;
        selectedPlanDay = 1;
        if (display) display.innerHTML = renderWeeklyPlanDays(generatedWeeklyPlan);
        showToast('7-Day weekly meal plan generated!');
    } catch (e) {
        if (display) display.innerHTML = `<div class="glass-card p-6 text-center text-danger text-xs">Failed to connect to plan engine.</div>`;
    }
};

function renderWeeklyPlanDays(plan) {
    if (!plan || !plan.days) return '';
    const curDay = plan.days.find(d => d.day === selectedPlanDay) || plan.days[0];

    return `
        <!-- Day Selector Tabs -->
        <div class="flex flex-wrap gap-2 mb-6">
            ${plan.days.map(d => `
                <button onclick="selectWeeklyPlanDay(${d.day})" class="${d.day === selectedPlanDay ? 'btn-primary' : 'btn-secondary'} text-xs font-bold px-4 py-2">
                    Day ${d.day}
                </button>
            `).join('')}
        </div>

        <!-- Selected Day Card -->
        <div class="glass-card p-6 rounded-xl space-y-6">
            <div class="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
                <div>
                    <h4 style="font-family:var(--font-display);font-size:1.25rem;font-weight:800;color:var(--white)">
                        DAY ${curDay.day} MEAL PLAN <span class="text-cyan text-xs font-normal ml-2">(${plan.diet_preference.toUpperCase()})</span>
                    </h4>
                    <div class="text-xs text-dim mt-1">
                        Total: <b class="text-cyan">${curDay.daily_totals.calories} kcal</b> • 
                        Protein: <b class="text-yellow">${curDay.daily_totals.protein_g}g</b> | 
                        Carbs: <b>${curDay.daily_totals.carbs_g}g</b> | 
                        Fat: <b>${curDay.daily_totals.fat_g}g</b>
                    </div>
                </div>

                <button onclick="logWholeDayToTracker(${curDay.day})" class="btn-primary text-xs py-2 px-4 font-bold text-black uppercase tracking-wider">
                    📥 Log This Day to Today's Tracker
                </button>
            </div>

            <!-- Meals List -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                ${curDay.meals.map(m => `
                    <div class="bg-black/40 p-4 rounded-xl border border-white/5 flex flex-col justify-between">
                        <div>
                            <div class="flex justify-between items-start mb-2">
                                <span class="badge badge-yellow text-[10px] font-bold uppercase">${m.type}</span>
                                <span class="text-xs font-bold text-cyan">${m.calories} kcal</span>
                            </div>
                            <h5 class="text-sm font-bold text-white mb-1">${m.name}</h5>
                        </div>
                        <div class="text-[11px] text-dim pt-2 border-t border-white/5 flex justify-between mt-3">
                            <span>Protein: <b class="text-white">${m.protein_g}g</b></span>
                            <span>Carbs: <b class="text-white">${m.carbs_g}g</b></span>
                            <span>Fat: <b class="text-white">${m.fat_g}g</b></span>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

window.selectWeeklyPlanDay = function(day) {
    selectedPlanDay = day;
    const display = document.getElementById('weekly-plan-display');
    if (display && generatedWeeklyPlan) {
        display.innerHTML = renderWeeklyPlanDays(generatedWeeklyPlan);
    }
};

window.logWholeDayToTracker = function(dayNum) {
    if (!generatedWeeklyPlan) return;
    const curDay = generatedWeeklyPlan.days.find(d => d.day === dayNum);
    if (!curDay) return;

    const logData = getFoodLogs(activeTrackerDate);
    curDay.meals.forEach(m => {
        const type = (m.type === 'breakfast' || m.type === 'lunch' || m.type === 'dinner') ? m.type : 'snacks';
        if (!logData[type]) logData[type] = [];
        logData[type].push({
            name: m.name,
            portion: '1 serving',
            kcal: m.calories,
            p: m.protein_g,
            c: m.carbs_g,
            f: m.fat_g
        });
    });

    saveFoodLogs(activeTrackerDate, logData);
    showToast(`Logged all meals from Day ${dayNum} to today!`);
    setTrackerSubTab('daily-log');
};

// ── SUB-VIEW: FRIDGE & PANTRY RECIPE FINDER ───────────────────────
const COMMON_PANTRY = ['Rice', 'Egg', 'Tomato', 'Onion', 'Garlic', 'Chicken', 'Carrot', 'Peas', 'Cheese', 'Cucumber', 'Lemon', 'Pepper', 'Soy', 'Oil'];
let selectedIngredients = new Set(['Rice', 'Egg', 'Tomato', 'Onion']);
let recipeResults = null;

function renderRecipeFinderTab() {
    return `
        <div class="space-y-6">
            <div class="glass-card p-6 rounded-xl">
                <h3 style="font-family:var(--font-display);font-size:1.25rem;font-weight:700;color:var(--white)">SMART FRIDGE RECIPE FINDER</h3>
                <p class="text-xs text-dim mb-4">Select or type the ingredients you have available. The cooking engine will suggest optimal recipes.</p>

                <!-- Ingredient Chips -->
                <div class="flex flex-wrap gap-2 mb-4" id="pantry-chips">
                    ${COMMON_PANTRY.map(ing => `
                        <button onclick="togglePantryChip('${ing}')" 
                            class="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${selectedIngredients.has(ing) ? 'bg-cyan/20 border-cyan text-cyan' : 'bg-black/30 border-white/10 text-secondary'}">
                            ${selectedIngredients.has(ing) ? '✓ ' : '+ '}${ing}
                        </button>
                    `).join('')}
                </div>

                <!-- Custom input & search button -->
                <div class="flex gap-3">
                    <input type="text" id="custom-ing-inp" placeholder="Add other ingredients (e.g. spinach, ginger, beef)..." class="auth-input flex-1 text-xs">
                    <button onclick="addCustomIngredient()" class="btn-secondary px-4 text-xs font-bold">+ Add</button>
                    <button onclick="fetchFridgeRecipes()" class="btn-primary px-6 text-xs font-bold text-black uppercase">
                        🔍 Find Recipes
                    </button>
                </div>
            </div>

            <!-- Recipe Results -->
            <div id="recipe-results-container">
                ${recipeResults ? renderRecipeList(recipeResults) : ''}
            </div>
        </div>
    `;
}

window.togglePantryChip = function(ing) {
    if (selectedIngredients.has(ing)) selectedIngredients.delete(ing);
    else selectedIngredients.add(ing);
    const cont = document.getElementById('tracker-subview-content');
    if (cont) cont.innerHTML = renderRecipeFinderTab();
};

window.addCustomIngredient = function() {
    const inp = document.getElementById('custom-ing-inp');
    const val = inp?.value?.trim();
    if (val) {
        selectedIngredients.add(val.charAt(0).toUpperCase() + val.slice(1));
        if (inp) inp.value = '';
        const cont = document.getElementById('tracker-subview-content');
        if (cont) cont.innerHTML = renderRecipeFinderTab();
    }
};

window.fetchFridgeRecipes = async function() {
    const list = Array.from(selectedIngredients).join(', ');
    const cont = document.getElementById('recipe-results-container');
    if (cont) {
        cont.innerHTML = `
            <div class="glass-card p-8 rounded-xl text-center">
                <div class="loading-spinner mx-auto mb-3"></div>
                <p class="text-xs text-dim">Analyzing pantry ingredients...</p>
            </div>
        `;
    }

    try {
        const res = await fetch('/v1/cook/suggest', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ingredients: list })
        });
        const data = await res.json();
        recipeResults = data;
        if (cont) cont.innerHTML = renderRecipeList(recipeResults);
    } catch (e) {
        if (cont) cont.innerHTML = `<div class="glass-card p-6 text-center text-danger text-xs">Failed to search recipes.</div>`;
    }
};

function renderRecipeList(data) {
    if (!data.recipes || !data.recipes.length) {
        return `
            <div class="glass-card p-8 text-center rounded-xl">
                <p class="text-xs text-dim">${data.note || 'No matching recipes found with these ingredients.'}</p>
            </div>
        `;
    }

    return `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            ${data.recipes.map((r, idx) => `
                <div class="glass-card p-6 rounded-xl flex flex-col justify-between">
                    <div>
                        <div class="flex justify-between items-start mb-3">
                            <span class="badge ${idx === 0 ? 'badge-cyan' : 'badge-yellow'} text-xs font-bold uppercase">
                                ${idx === 0 ? '★ Best Match' : 'Recipe Match'}
                            </span>
                        </div>
                        <h4 class="text-lg font-bold text-white mb-2">${r.name}</h4>
                        <div class="text-xs text-dim mb-4">
                            <b>Ingredients used:</b> <span class="text-cyan">${r.ingredients_used.join(', ')}</span>
                        </div>

                        <!-- Steps -->
                        <div class="bg-black/40 p-3 rounded-lg border border-white/5 text-xs text-secondary space-y-2 mb-4">
                            <b class="text-white block">Instructions:</b>
                            <ol class="list-decimal list-inside space-y-1">
                                ${r.steps.map(s => `<li>${s}</li>`).join('')}
                            </ol>
                        </div>
                    </div>

                    <button onclick="logRecipeDirectly('${r.name.replace(/'/g, "\\'")}')" class="btn-secondary w-full py-2 text-xs font-bold uppercase text-yellow">
                        + Log This Meal to Today
                    </button>
                </div>
            `).join('')}
        </div>
    `;
}

window.logRecipeDirectly = function(recipeName) {
    const logData = getFoodLogs(activeTrackerDate);
    if (!logData.dinner) logData.dinner = [];
    logData.dinner.push({
        name: recipeName,
        portion: '1 plate',
        kcal: 450,
        p: 22,
        c: 55,
        f: 14
    });
    saveFoodLogs(activeTrackerDate, logData);
    showToast(`Logged "${recipeName}" to dinner.`);
    setTrackerSubTab('daily-log');
};

// ── Toast Utility ────────────────────────────────────────────────
function showToast(msg) {
    let t = document.getElementById('nutrition-toast');
    if (!t) {
        t = document.createElement('div');
        t.id = 'nutrition-toast';
        t.className = 'fixed bottom-6 right-6 bg-black/90 text-white px-5 py-3 rounded-xl border border-cyan text-xs font-bold z-50 transition-all duration-300 transform translate-y-12 opacity-0 shadow-2xl flex items-center gap-2';
        document.body.appendChild(t);
    }
    t.innerHTML = `<span class="text-cyan">⚡</span> ${msg}`;
    t.classList.remove('translate-y-12', 'opacity-0');
    setTimeout(() => {
        t.classList.add('translate-y-12', 'opacity-0');
    }, 2800);
}
