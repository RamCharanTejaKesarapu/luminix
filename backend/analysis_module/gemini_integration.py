"""Google Gemini: combined insights, narrative, Luna AI chat, food analysis, and video script."""

from __future__ import annotations

import json
import os
from typing import Any, Dict, List, Optional

try:
    import google.generativeai as genai
except ImportError:  # pragma: no cover
    genai = None  # type: ignore

MODEL_FALLBACKS = [
    "gemini-3.6-flash",
    "gemini-3.7-flash",
    "gemini-3.5-flash",
    "gemini-flash-latest",
]


def _model_name() -> str:
    return os.getenv("GEMINI_MODEL", "gemini-3.6-flash")


def configure_gemini() -> None:
    if genai is None:
        raise RuntimeError("google-generativeai is not installed.")
    key = os.getenv("GEMINI_API_KEY")
    if not key:
        raise RuntimeError("GEMINI_API_KEY is not set.")
    genai.configure(api_key=key)


def get_generative_model(model_name: Optional[str] = None):
    configure_gemini()
    target = model_name or _model_name()
    try:
        return genai.GenerativeModel(target)
    except Exception:
        for fallback in MODEL_FALLBACKS:
            if fallback != target:
                try:
                    return genai.GenerativeModel(fallback)
                except Exception:
                    continue
        return genai.GenerativeModel("gemini-3.6-flash")


def generate_content_with_fallback(prompt: str, system_instruction: Optional[str] = None) -> str:
    configure_gemini()
    models_to_try = [_model_name()] + [m for m in MODEL_FALLBACKS if m != _model_name()]

    last_err = None
    for m_name in models_to_try:
        try:
            model = genai.GenerativeModel(m_name, system_instruction=system_instruction) if system_instruction else genai.GenerativeModel(m_name)
            resp = model.generate_content(prompt)
            if resp and resp.text:
                return resp.text.strip()
        except Exception as e:
            last_err = e
            continue

    if last_err:
        raise last_err
    return ""


def generate_json(system: str, user_payload: str) -> Dict[str, Any]:
    prompt = f"{system}\n\nDATA:\n{user_payload}\n\nRespond with valid JSON only."
    text = generate_content_with_fallback(prompt)
    if "```" in text:
        s, e = text.find("{"), text.rfind("}")
        if s != -1 and e != -1:
            text = text[s : e + 1]
    return json.loads(text)


def combined_health_insights_blob(profile_dict: Dict, pose_dict: Dict, nutrition_dict: Dict) -> Dict[str, Any]:
    system = (
        "You are a clinical-style fitness and nutrition informatics assistant for the Luminix platform. "
        "Informational only — not medical diagnosis. "
        "Return JSON keys: executive_summary (string), "
        "pose_highlights (array of strings), nutrition_highlights (array), "
        "risk_warnings (array of strings), personalized_suggestions (array), "
        "sleep_hydration_recovery (array of short strings)."
    )
    payload = json.dumps(
        {"user_profile": profile_dict, "pose_analysis": pose_dict, "nutrition_analysis": nutrition_dict},
        ensure_ascii=False,
    )
    return generate_json(system, payload)


def narrative_from_report(report_dict: Dict[str, Any]) -> str:
    prompt = (
        "Write a clear, supportive narrative (8–12 sentences) for the end user summarizing "
        "this combined health intelligence report. Avoid alarmism; note limitations.\n\n"
        f"REPORT JSON:\n{json.dumps(report_dict, ensure_ascii=False)}"
    )
    return generate_content_with_fallback(prompt)


def gemini_video_script(report_text: str) -> str:
    prompt = (
        "Create a spoken explainer script of ~90–130 seconds. "
        "Sections: intro, pose/movement findings, nutrition targets, risks to watch, "
        "actionable suggestions, closing encouragement. "
        "Plain sentences for TTS; no markdown bullets.\n\n"
        f"REPORT:\n{report_text}"
    )
    return generate_content_with_fallback(prompt)


def luna_chat_gemini(message: str, user_context: Optional[Dict[str, Any]] = None) -> str:
    """Luna AI conversational intelligence for fitness, nutrition, biomechanics, and general wellness."""
    system_instruction = (
        "You are Luna, the AI health, nutrition, and biomechanics intelligence agent for the Luminix platform. "
        "You possess deep expertise in macronutrient distribution, caloric targets, TDEE, fat loss, muscle hypertrophy, "
        "meal planning, micronutrients, hydration, dietary restrictions, yoga asanas, and gym exercise biomechanics. "
        "Provide warm, intelligent, scientifically backed, and actionable advice. "
        "Format your responses cleanly with markdown bullet points or bold key terms when breaking down food, macros, or steps. "
        "Keep responses engaging, concise (under 200 words unless deep meal analysis is requested), and encouraging. "
        "Do not provide medical diagnoses — recommend consulting healthcare professionals for clinical conditions."
    )

    context_str = ""
    if user_context:
        context_str = f"\n[User Context: {json.dumps(user_context, ensure_ascii=False)}]\n"

    prompt = f"{context_str}User Question: {message}\nLuna:"
    return generate_content_with_fallback(prompt, system_instruction=system_instruction)


def analyze_food_nutrition_gemini(food_query: str) -> Dict[str, Any]:
    """Analyze custom meal or food query and return calories and macros."""
    system = (
        "You are an expert nutritional biochemist for Luminix. Analyze the user's food/meal description. "
        "Return valid JSON with keys: "
        "food_name (string), estimated_serving (string), calories (integer kcal), "
        "protein_g (float), carbs_g (float), fat_g (float), fiber_g (float), "
        "micronutrients (array of strings, e.g. ['High Vitamin C', 'Rich in Omega-3']), "
        "health_score (integer 1-100), "
        "analysis_notes (string, 1-2 sentences on nutritional quality and satiety)."
    )
    return generate_json(system, food_query)


def generate_ai_recipe_gemini(ingredients: str, diet_preference: str = "omnivore") -> Dict[str, Any]:
    """Generate a chef-grade, macro-balanced recipe based on available ingredients."""
    system = (
        "You are a master culinary nutritionist for Luminix. Given a list of available ingredients and diet preference, "
        "create a delicious, macro-balanced recipe. "
        "Return valid JSON with keys: "
        "recipe_name (string), prep_time_mins (integer), cook_time_mins (integer), "
        "servings (integer), calories_per_serving (integer), protein_per_serving_g (float), "
        "carbs_per_serving_g (float), fat_per_serving_g (float), "
        "ingredients_needed (array of strings with measurements), "
        "cooking_steps (array of step-by-step strings), "
        "chef_tips (string)."
    )
    payload = json.dumps({"ingredients": ingredients, "diet_preference": diet_preference}, ensure_ascii=False)
    return generate_json(system, payload)


def safe_gemini_call(fn, fallback: Dict[str, Any]) -> Dict[str, Any]:
    try:
        if not os.getenv("GEMINI_API_KEY") or genai is None:
            return fallback
        return fn()
    except Exception as exc:  # noqa: BLE001
        fb = dict(fallback)
        fb["gemini_error"] = str(exc)
        return fb


def optional_insights(
    profile_dict: Dict,
    pose_dict: Dict,
    nutrition_dict: Dict,
) -> Optional[Dict[str, Any]]:
    if not os.getenv("GEMINI_API_KEY") or genai is None:
        return None
    return combined_health_insights_blob(profile_dict, pose_dict, nutrition_dict)

