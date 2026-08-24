from typing import Any, Dict, List

GYM_PLANS: Dict[str, List[Dict[str, Any]]] = {
    "Chest": [
        {"name": "Bench Press", "sets": 3, "reps": "8-12", "instructions": "Lie on bench, grip bar slightly wider than shoulders. Lower to chest, press up.", "rest": 60},
        {"name": "Incline Dumbbell Press", "sets": 3, "reps": "10-15", "instructions": "Set bench to 30-45° incline. Press dumbbells up and together.", "rest": 60},
        {"name": "Chest Flyes", "sets": 3, "reps": "12-15", "instructions": "Lie on bench, arms wide with slight elbow bend. Squeeze chest to bring dumbbells together.", "rest": 60},
        {"name": "Push-ups", "sets": 3, "reps": "To failure", "instructions": "Hands shoulder-width, body straight. Lower chest to floor, push back up.", "rest": 45},
    ],
    "Back": [
        {"name": "Pull-ups", "sets": 3, "reps": "To failure", "instructions": "Grip bar overhand, pull chin above bar. Control descent.", "rest": 60},
        {"name": "Barbell Rows", "sets": 3, "reps": "8-12", "instructions": "Hinge at hips, back flat. Pull bar to lower chest, squeeze shoulder blades.", "rest": 60},
        {"name": "Lat Pulldown", "sets": 3, "reps": "10-15", "instructions": "Pull bar to upper chest, lean back slightly. Full stretch at top.", "rest": 60},
        {"name": "Face Pulls", "sets": 3, "reps": "15-20", "instructions": "Pull rope to face, externally rotate shoulders at end.", "rest": 45},
    ],
    "Legs": [
        {"name": "Barbell Squats", "sets": 4, "reps": "8-10", "instructions": "Bar on upper back, feet shoulder-width. Squat until thighs parallel, drive up.", "rest": 90},
        {"name": "Romanian Deadlift", "sets": 3, "reps": "10-12", "instructions": "Hinge at hips, slight knee bend. Lower bar along legs, feel hamstring stretch.", "rest": 60},
        {"name": "Leg Press", "sets": 3, "reps": "10-15", "instructions": "Feet shoulder-width on platform. Lower until 90° knee bend, press without locking knees.", "rest": 60},
        {"name": "Walking Lunges", "sets": 3, "reps": "12 each leg", "instructions": "Step forward, lower back knee toward floor. Alternate legs.", "rest": 60},
    ],
    "Shoulders": [
        {"name": "Overhead Press", "sets": 3, "reps": "8-12", "instructions": "Press bar or dumbbells overhead from shoulder height. Core tight.", "rest": 60},
        {"name": "Lateral Raises", "sets": 3, "reps": "12-15", "instructions": "Raise dumbbells to shoulder height with slight elbow bend. Control descent.", "rest": 45},
        {"name": "Front Raises", "sets": 3, "reps": "12-15", "instructions": "Raise dumbbells to eye level in front. Alternate or together.", "rest": 45},
        {"name": "Rear Delt Flyes", "sets": 3, "reps": "15-20", "instructions": "Bend forward, raise dumbbells out to sides. Squeeze rear delts.", "rest": 45},
    ],
    "Arms": [
        {"name": "Barbell Curls", "sets": 3, "reps": "10-12", "instructions": "Curl bar with elbows pinned to sides. Full extension at bottom.", "rest": 45},
        {"name": "Tricep Pushdown", "sets": 3, "reps": "12-15", "instructions": "Push cable down, keep elbows at sides. Squeeze at bottom.", "rest": 45},
        {"name": "Hammer Curls", "sets": 3, "reps": "10-12", "instructions": "Neutral grip curl. Targets brachialis and forearms.", "rest": 45},
        {"name": "Skull Crushers", "sets": 3, "reps": "10-12", "instructions": "Lie on bench, lower EZ bar to forehead. Extend arms fully.", "rest": 60},
    ],
}


def get_gym_plan(category: str) -> Dict[str, Any]:
    cat = category.strip().capitalize()
    if cat not in GYM_PLANS:
        raise KeyError(cat)
    return {"category": cat, "exercises": GYM_PLANS[cat]}


def generate_daily_workout(focus: str = "full") -> Dict[str, Any]:
    if focus.lower() == "full":
        picks = ["Chest", "Back", "Legs"]
    else:
        picks = [focus.strip().capitalize()]
    exercises: List[Dict[str, Any]] = []
    for cat in picks:
        if cat in GYM_PLANS:
            exercises.extend(GYM_PLANS[cat][:2])
    return {"category": focus, "exercises": exercises, "type": "daily_plan"}
