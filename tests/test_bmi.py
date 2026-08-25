from nutrition_module.schemas import (
    ActivityLevel,
    DietPreference,
    FitnessGoal,
    Gender,
    UserHealthProfile,
)
from nutrition_module.bmi_bmr import compute_bmi, compute_nutrition_metrics


def test_bmi():
    assert abs(compute_bmi(70, 175) - 22.86) < 0.1


def test_pipeline_smoke():
    p = UserHealthProfile(
        age=29,
        gender=Gender.male,
        height_cm=178,
        weight_kg=80,
        activity_level=ActivityLevel.active,
        fitness_goal=FitnessGoal.muscle_gain,
        diet_preference=DietPreference.non_vegetarian,
        allergies=[],
    )
    m = compute_nutrition_metrics(p)
    assert m.target_calories > 0
    assert m.macros["protein_g"] > 0


def test_meal_planner():
    from nutrition_module.meal_planner import build_weekly_plan
    p = UserHealthProfile(
        age=25,
        gender=Gender.male,
        height_cm=175,
        weight_kg=72,
        activity_level=ActivityLevel.moderate,
        fitness_goal=FitnessGoal.maintenance,
        diet_preference=DietPreference.vegetarian,
        allergies=[],
    )
    m = compute_nutrition_metrics(p)
    plan = build_weekly_plan(p, m)
    d = plan.to_dict()
    assert len(d["days"]) == 7
    assert d["diet_preference"] == "vegetarian"


def test_recipes():
    from cooking_module.recipes import suggest_recipes
    res = suggest_recipes("rice, egg, tomato, onion")
    assert len(res["recipes"]) > 0
    assert res["best"] is not None

