"""FastAPI surface for Luminix — pose, nutrition, gym, reports, and export."""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from typing import Any, Dict, Optional

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, Field
from fastapi.staticfiles import StaticFiles

ROOT = Path(__file__).resolve().parents[1]
PROJECT_ROOT = ROOT.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

load_dotenv(PROJECT_ROOT / ".env")

from analysis_module.email_service import send_report_email  # noqa: E402
from analysis_module.pdf_export import export_combined_pdf  # noqa: E402
from analysis_module.report_generator import build_combined_report  # noqa: E402
from database.db import init_db, log_event, recent_events  # noqa: E402
from api.auth_routes import get_optional_user, router as auth_router  # noqa: E402
from gym_module.exercises import GYM_PLANS, generate_daily_workout, get_gym_plan  # noqa: E402
from nutrition_module.bmi_bmr import compute_nutrition_metrics, metrics_to_dict  # noqa: E402
from nutrition_module.meal_planner import build_weekly_plan  # noqa: E402
from nutrition_module.schemas import UserHealthProfile  # noqa: E402
from pose_module.video_analyzer import analyze_video_file, report_to_dict  # noqa: E402
from pose_module.yoga_poses import get_yoga_poses  # noqa: E402
from video_module.script_generator import build_explainer_script  # noqa: E402
from video_module.video_creator import render_health_video  # noqa: E402
from cooking_module.recipes import suggest_recipes  # noqa: E402

OUTPUT = PROJECT_ROOT / "output"
OUTPUT.mkdir(parents=True, exist_ok=True)
STATIC_DIR = PROJECT_ROOT / "frontend"
ASSETS_DIR = PROJECT_ROOT / "assets"
STATIC_DIR.mkdir(parents=True, exist_ok=True)
ASSETS_DIR.mkdir(parents=True, exist_ok=True)
init_db(ROOT / "data" / "health_intel.sqlite")


def _sample_report() -> Dict[str, Any]:
    """Demo report for PDF/email when no user session exists."""
    return {
        "executive_summary": "Your Luminix wellness snapshot. Continue yoga and gym sessions for best results.",
        "nutrition_analysis": {
            "anthropometrics": {
                "bmi": 22.5,
                "bmr_kcal": 1650,
                "tdee_kcal": 2275,
                "body_fat_pct": 18.0,
            }
        },
        "meal_plan": {
            "days": [
                {
                    "day": "Monday",
                    "meals": {
                        "breakfast": {"name": "Oatmeal with berries"},
                        "lunch": {"name": "Grilled chicken salad"},
                        "dinner": {"name": "Salmon with vegetables"},
                    },
                }
            ]
        },
        "pose_analysis": {"mean_pose_score": 0.88, "posture_label": "good", "injury_risk_proxy": "low"},
        "gym_plan": generate_daily_workout("full"),
    }


class NutritionOnlyRequest(UserHealthProfile):
    use_gemini: bool = Field(default=True)


class CombinedReportRequest(BaseModel):
    profile: UserHealthProfile
    pose: Optional[Dict[str, Any]] = None
    use_gemini: bool = True


class GeneratePlanRequest(BaseModel):
    profile: UserHealthProfile
    use_gemini: bool = False


class VideoRenderRequest(BaseModel):
    report: Dict[str, Any]
    human_text: str
    prefer_gemini_script: bool = True
    pose_preview_path: Optional[str] = None


class EmailRequest(BaseModel):
    email: str
    report: Optional[Dict[str, Any]] = None


class PoseAnalysisRequest(BaseModel):
    landmarks: Optional[list] = None
    video_path: Optional[str] = None


app = FastAPI(title="Luminix", description="Advanced Health Intelligence Platform", version="2.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")
app.mount("/assets", StaticFiles(directory=str(ASSETS_DIR)), name="assets")
app.include_router(auth_router)


@app.get("/")
def index_page() -> FileResponse:
    path = STATIC_DIR / "index.html"
    if not path.is_file():
        raise HTTPException(status_code=404, detail="frontend/index.html missing")
    return FileResponse(path, media_type="text/html")


@app.get("/auth")
def auth_page() -> FileResponse:
    path = STATIC_DIR / "auth.html"
    if not path.is_file():
        raise HTTPException(status_code=404, detail="frontend/auth.html missing")
    return FileResponse(path, media_type="text/html")


@app.get("/manifest.json")
def manifest() -> FileResponse:
    path = STATIC_DIR / "manifest.json"
    if not path.is_file():
        raise HTTPException(status_code=404, detail="manifest.json missing")
    return FileResponse(path, media_type="application/json")


@app.get("/health")
def health() -> Dict[str, Any]:
    return {
        "status": "ok",
        "platform": "Luminix",
        "gemini_configured": bool(os.getenv("GEMINI_API_KEY")),
        "smtp_configured": bool(os.getenv("SMTP_HOST")),
        "sendgrid_configured": bool(os.getenv("SENDGRID_API_KEY")),
        "google_oauth_configured": bool(os.getenv("GOOGLE_CLIENT_ID")),
        "github_oauth_configured": bool(os.getenv("GITHUB_CLIENT_ID")),
        "output_dir": str(OUTPUT),
    }


# ── Nutrition ──────────────────────────────────────────────────────────────

@app.post("/v1/nutrition/metrics-and-plan")
def nutrition_metrics_and_plan(req: NutritionOnlyRequest) -> Dict[str, Any]:
    profile = UserHealthProfile.model_validate(req.model_dump(exclude={"use_gemini"}))
    metrics = compute_nutrition_metrics(profile)
    plan = build_weekly_plan(profile, metrics)
    return {"anthropometrics": metrics_to_dict(metrics), "meal_plan": plan.to_dict()}


@app.post("/v1/nutrition/weekly-plan")
def nutrition_weekly_plan(req: NutritionOnlyRequest) -> Dict[str, Any]:
    profile = UserHealthProfile.model_validate(req.model_dump(exclude={"use_gemini"}))
    metrics = compute_nutrition_metrics(profile)
    plan = build_weekly_plan(profile, metrics)
    return {"anthropometrics": metrics_to_dict(metrics), "weekly_plan": plan.to_dict()}


@app.post("/v1/generate-plan")
def generate_plan(req: GeneratePlanRequest) -> Dict[str, Any]:
    """Combined nutrition + gym daily plan generator."""
    profile = req.profile
    metrics = compute_nutrition_metrics(profile)
    meal_plan = build_weekly_plan(profile, metrics)
    gym = generate_daily_workout("full")
    report = build_combined_report(profile, None, use_gemini=req.use_gemini)
    return {
        "anthropometrics": metrics_to_dict(metrics),
        "meal_plan": meal_plan.to_dict(),
        "gym_plan": gym,
        "report_human": report.human_readable,
        "report": report.to_dict(),
    }


# ── Cooking ────────────────────────────────────────────────────────────────

@app.post("/v1/cook/suggest")
def cook_suggest(payload: Dict[str, Any]) -> Dict[str, Any]:
    ingredients = payload.get("ingredients", "")
    limit = int(payload.get("limit", 5) or 5)
    return suggest_recipes(ingredients, limit=limit)


# ── Pose ─────────────────────────────────────────────────────────────────────

@app.post("/v1/pose/analyze-video")
async def pose_analyze_video(
    file: UploadFile = File(...),
    stride: int = Form(3),
    max_frames: int = Form(240),
) -> Dict[str, Any]:
    suffix = Path(file.filename or "upload.mp4").suffix or ".mp4"
    dest = OUTPUT / f"upload_pose{suffix}"
    dest.write_bytes(await file.read())
    try:
        rep = analyze_video_file(dest, stride=stride, max_frames=max_frames, output_dir=OUTPUT / "pose_previews")
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return report_to_dict(rep)


@app.post("/v1/pose-analysis")
def pose_analysis_heuristic(payload: PoseAnalysisRequest) -> Dict[str, Any]:
    """Lightweight pose risk analysis from landmark hints (browser-side MediaPipe)."""
    landmarks = payload.landmarks or []
    risky = False
    score = 0.85
    feedback = "Posture looks good. Keep spine aligned."

    if len(landmarks) >= 24:
        try:
            l_sh = landmarks[11]
            l_hip = landmarks[23]
            r_sh = landmarks[12]
            r_hip = landmarks[24]
            if l_sh.get("y", 0) > l_hip.get("y", 0) + 0.05 or r_sh.get("y", 0) > r_hip.get("y", 0) + 0.05:
                risky = True
                score = 0.35
                feedback = "Shoulders below hips — reduce forward bend to protect your spine."
        except (IndexError, TypeError, AttributeError):
            pass

    return {
        "risky": risky,
        "score": score,
        "feedback": feedback,
        "injury_risk_proxy": "high" if risky else "low",
    }


# ── Reports ──────────────────────────────────────────────────────────────────

@app.post("/v1/report/combined")
def combined_report(req: CombinedReportRequest) -> Dict[str, Any]:
    report = build_combined_report(req.profile, req.pose, use_gemini=req.use_gemini)
    log_event(
        user_label="api",
        bmi=report.nutrition_analysis.get("anthropometrics", {}).get("bmi"),
        pose_score=report.pose_analysis.get("mean_pose_score") if report.pose_analysis else None,
        payload={"has_gemini": bool(report.gemini)},
    )
    return {"report_json": report.to_dict(), "report_human": report.human_readable, "gemini": report.gemini}


@app.post("/v1/report/combined-with-upload")
async def combined_with_upload(
    file: UploadFile = File(...),
    profile_json: str = Form(...),
    use_gemini: bool = Form(True),
) -> Dict[str, Any]:
    profile = UserHealthProfile.model_validate(json.loads(profile_json))
    suffix = Path(file.filename or "upload.mp4").suffix or ".mp4"
    dest = OUTPUT / f"upload_full{suffix}"
    dest.write_bytes(await file.read())
    try:
        pose_rep = analyze_video_file(dest, output_dir=OUTPUT / "pose_previews")
        pose_dict = report_to_dict(pose_rep)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=f"Pose analysis failed: {exc}") from exc

    report = build_combined_report(profile, pose_rep, use_gemini=use_gemini)
    log_event(
        user_label="api_upload",
        bmi=report.nutrition_analysis.get("anthropometrics", {}).get("bmi"),
        pose_score=pose_dict.get("mean_pose_score"),
        payload={"video": str(dest)},
    )
    return {
        "report_json": report.to_dict(),
        "report_human": report.human_readable,
        "gemini": report.gemini,
        "pose": pose_dict,
    }


@app.post("/v1/video/generate")
def generate_video(req: VideoRenderRequest) -> Dict[str, Any]:
    script = build_explainer_script(req.human_text, prefer_gemini=req.prefer_gemini_script)
    try:
        path = render_health_video(
            report_dict=req.report,
            human_text=req.human_text,
            script=script,
            out_dir=OUTPUT,
            pose_preview_path=req.pose_preview_path,
            filename="luminix_explainer.mp4",
        )
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    return {"video_path": str(path), "script": script}


@app.post("/v1/report/export-pdf")
def export_pdf_post(report: Optional[Dict[str, Any]] = None) -> FileResponse:
    return _export_pdf_file(report)


@app.get("/v1/report/export-pdf")
def export_pdf_get() -> FileResponse:
    return _export_pdf_file(None)


def _normalize_report(report: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """Ensure report has BMI, meal plan, and workout sections for PDF/email."""
    if not report:
        return _sample_report()

    data = dict(report)
    if "nutrition_analysis" not in data and "anthropometrics" in data:
        data["nutrition_analysis"] = {"anthropometrics": data["anthropometrics"]}
    if "meal_plan" not in data and "weekly_plan" in data:
        data["meal_plan"] = data["weekly_plan"]
    if "gym_plan" not in data and "workout" in data:
        data["gym_plan"] = data["workout"]
    if "executive_summary" not in data and data.get("report_human"):
        data["executive_summary"] = data["report_human"]
    if not data.get("nutrition_analysis") and not data.get("meal_plan"):
        sample = _sample_report()
        data.setdefault("nutrition_analysis", sample["nutrition_analysis"])
        data.setdefault("meal_plan", sample["meal_plan"])
    if not data.get("gym_plan"):
        data["gym_plan"] = generate_daily_workout("full")
    return data


def _export_pdf_file(report: Optional[Dict[str, Any]]) -> FileResponse:
    data = _normalize_report(report)
    out = OUTPUT / "latest_report.pdf"
    try:
        export_combined_pdf(data, out)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return FileResponse(out, filename="luminix_report.pdf", media_type="application/pdf")


@app.post("/v1/report/send-email")
def send_email_endpoint(
    req: EmailRequest,
    user: Optional[Dict[str, Any]] = Depends(get_optional_user),
) -> Dict[str, str]:
    data = _normalize_report(req.report)
    out = OUTPUT / "email_report.pdf"
    try:
        export_combined_pdf(data, out)
        recipient = req.email or (user.get("email") if user else "")
        if not recipient:
            raise HTTPException(status_code=400, detail="Email address required")
        ok, message = send_report_email(recipient, out, report_summary=data)
        if not ok:
            raise HTTPException(status_code=502, detail=message)
        return {"status": "success", "message": message}
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=f"Failed to send email: {exc}") from exc


# ── Gym ──────────────────────────────────────────────────────────────────────

@app.get("/v1/gym/categories")
def get_gym_categories() -> Dict[str, Any]:
    return {"categories": list(GYM_PLANS.keys())}


@app.get("/v1/gym/plan/{category}")
def gym_plan_by_category(category: str) -> Dict[str, Any]:
    try:
        return get_gym_plan(category)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Category not found") from exc


@app.get("/v1/gym-plan")
def gym_plan_daily(focus: str = "full") -> Dict[str, Any]:
    return generate_daily_workout(focus)


# ── Yoga ─────────────────────────────────────────────────────────────────────

@app.get("/v1/yoga/poses")
def get_yoga_poses_api() -> JSONResponse:
    return JSONResponse({"poses": get_yoga_poses()})


@app.get("/v1/progress/recent")
def progress_recent(limit: int = 20) -> JSONResponse:
    return JSONResponse({"items": recent_events(limit)})


class ProgressLogRequest(BaseModel):
    user_label: str = "default"
    bmi: Optional[float] = None
    pose_score: Optional[float] = None
    payload: Optional[Dict[str, Any]] = None


@app.post("/v1/progress/log")
def progress_log(req: ProgressLogRequest) -> JSONResponse:
    log_event(
        user_label=req.user_label,
        bmi=req.bmi,
        pose_score=req.pose_score,
        payload=req.payload or {},
    )
    return JSONResponse({"status": "ok", "message": "Progress logged successfully"})


@app.get("/download/video")
def download_video() -> FileResponse:
    for name in ("luminix_explainer.mp4", "health_explainer.mp4"):
        p = OUTPUT / name
        if p.exists():
            return FileResponse(p, filename=name, media_type="video/mp4")
    raise HTTPException(status_code=404, detail="Video not generated yet")


# ── Nutrition Metrics (simple endpoint for BMI calculator) ───────────────────

@app.post("/v1/nutrition/metrics")
def nutrition_metrics_simple(req: NutritionOnlyRequest) -> Dict[str, Any]:
    """Simple BMI/BMR/TDEE endpoint for the dashboard calculator."""
    profile = UserHealthProfile.model_validate(req.model_dump(exclude={"use_gemini"}))
    metrics = compute_nutrition_metrics(profile)
    return metrics_to_dict(metrics)


# ── Luna AI Chat ─────────────────────────────────────────────────────────────

class LunaChatRequest(BaseModel):
    message: str

@app.post("/v1/luna/chat")
def luna_chat(req: LunaChatRequest) -> Dict[str, Any]:
    """Luna AI chat endpoint — uses Gemini when available, falls back to rule-based."""
    msg = req.message.strip().lower()

    # Try Gemini first
    gemini_key = os.getenv("GEMINI_API_KEY")
    if gemini_key:
        try:
            from analysis_module.gemini_integration import configure_gemini
            import google.generativeai as genai

            configure_gemini()
            model = genai.GenerativeModel(os.getenv("GEMINI_MODEL", "gemini-2.0-flash"))
            prompt = (
                "You are Luna, the AI health and fitness assistant for Luminix platform. "
                "You provide helpful, concise health advice about fitness, nutrition, yoga, gym, "
                "and general wellness. Keep responses under 150 words. Be supportive and informative. "
                "Do not provide medical diagnoses — always recommend consulting a professional for medical concerns.\n\n"
                f"User: {req.message}\nLuna:"
            )
            resp = model.generate_content(prompt)
            reply = (resp.text or "").strip()
            if reply:
                return {"reply": reply, "source": "gemini"}
        except Exception:
            pass

    # Rule-based fallback
    reply = _luna_fallback(msg)
    return {"reply": reply, "source": "built-in"}


def _luna_fallback(msg: str) -> str:
    """Rule-based Luna responses for common health questions."""
    if any(w in msg for w in ["bmi", "body mass"]):
        return "BMI (Body Mass Index) is calculated as weight(kg) / height(m)². A healthy BMI is 18.5-24.9. Use our BMI Calculator on the Dashboard for your personalized results with BMR, TDEE, and macro targets!"
    if any(w in msg for w in ["calor", "tdee", "bmr"]):
        return "Your TDEE (Total Daily Energy Expenditure) depends on your BMR and activity level. BMR is your base metabolic rate at rest. Use our BMI calculator to get your exact numbers — it uses both Mifflin-St Jeor and Harris-Benedict formulas for accuracy."
    if any(w in msg for w in ["yoga", "stretch", "flexibility"]):
        return "Yoga improves flexibility, balance, strength, and mental clarity. Our library has 16+ poses from Beginner to Advanced. Start with Downward Dog, Warrior I, and Child's Pose. Check the Yoga Library for detailed instructions!"
    if any(w in msg for w in ["chest", "bench", "pec"]):
        return "For chest development: Bench Press (3×8-12), Incline DB Press (3×10-15), Chest Flyes (3×12-15), and Push-ups (3×failure). Focus on controlled negatives and full range of motion. Check our Gym Module for full routines!"
    if any(w in msg for w in ["back", "pull", "lat"]):
        return "For a strong back: Pull-ups, Barbell Rows (3×8-12), Lat Pulldowns (3×10-15), and Face Pulls (3×15-20). Always squeeze your shoulder blades at peak contraction. Visit the Gym Module for demos!"
    if any(w in msg for w in ["leg", "squat", "glute"]):
        return "Leg day essentials: Barbell Squats (4×8-10), Romanian Deadlifts (3×10-12), Leg Press (3×10-15), Walking Lunges (3×12/leg). Never skip leg day — it boosts testosterone and overall strength!"
    if any(w in msg for w in ["protein", "macro", "diet", "meal", "food", "nutrition"]):
        return "For muscle gain: aim for 1.6-2.0g protein per kg bodyweight. Good sources: chicken, fish, eggs, greek yogurt, lentils. Use our Export feature to get a personalized 7-day meal plan with exact macro targets!"
    if any(w in msg for w in ["weight loss", "fat loss", "slim", "lose weight"]):
        return "Fat loss = caloric deficit + protein preservation. Eat 15-20% below TDEE, keep protein high (1.8g/kg), strength train 3-4x/week, and walk 8000+ steps daily. Consistency beats intensity!"
    if any(w in msg for w in ["muscle gain", "bulk", "gain weight"]):
        return "For muscle gain: eat 10-15% above TDEE, train 4-5x/week with progressive overload, sleep 7-9 hours, and eat 1.8-2.2g protein/kg. Focus on compound movements — squat, deadlift, bench, row, overhead press."
    if any(w in msg for w in ["posture", "back pain", "spine"]):
        return "Good posture: ears over shoulders, shoulders over hips. For back pain: strengthen core with planks, bird-dogs, and bridges. Use our Live Pose Detection to check your alignment in real-time with instant feedback!"
    if any(w in msg for w in ["sleep", "rest", "recovery"]):
        return "Recovery is when growth happens! Aim for 7-9 hours of quality sleep. Keep room cool (65-68°F), avoid screens 1hr before bed, and maintain consistent sleep/wake times. Schedule rest days between intense sessions."
    if any(w in msg for w in ["warm up", "cool down", "injury"]):
        return "Always warm up 5-10 minutes before exercise: light cardio + dynamic stretches. Cool down with static stretches for 5 minutes. This reduces injury risk by up to 50%. Our Live Pose tracker alerts you to risky positions!"
    if any(w in msg for w in ["hello", "hi", "hey"]):
        return "Hello! I'm Luna, your AI health assistant. I can help with fitness advice, nutrition planning, yoga poses, gym workouts, and more. Try asking about meal plans, exercises, or BMI calculation!"
    return "I can help with fitness, nutrition, yoga, gym workouts, posture analysis, and health planning. Try asking about specific exercises, diet plans, BMI calculation, or check out our Live Pose Detection for real-time tracking!"


# ── Email Report (frontend-expected endpoint) ────────────────────────────────

class EmailReportRequest(BaseModel):
    email: str
    profile: Optional[Dict[str, Any]] = None

@app.post("/v1/email-report")
def email_report_frontend(req: EmailReportRequest) -> Dict[str, Any]:
    """Email report endpoint that the frontend export page uses."""
    # Build report from profile
    report_data = _sample_report()

    if req.profile:
        try:
            profile = UserHealthProfile.model_validate(req.profile)
            metrics = compute_nutrition_metrics(profile)
            plan = build_weekly_plan(profile, metrics)
            report_data = {
                "nutrition_analysis": {"anthropometrics": metrics_to_dict(metrics)},
                "meal_plan": plan.to_dict(),
                "gym_plan": generate_daily_workout("full"),
                "executive_summary": f"Luminix Health Report for {req.email}",
            }
        except Exception:
            pass

    out = OUTPUT / "email_report.pdf"
    try:
        export_combined_pdf(report_data, out)
        ok, message = send_report_email(req.email, out, report_summary=report_data)
        return {"sent": ok, "message": message}
    except Exception as exc:
        return {"sent": False, "message": str(exc)}


# ── PDF Export (frontend-expected endpoint) ───────────────────────────────────

@app.post("/v1/export/pdf")
def export_pdf_frontend() -> FileResponse:
    """PDF export endpoint the frontend download button uses."""
    data = _sample_report()
    data["gym_plan"] = generate_daily_workout("full")
    out = OUTPUT / "luminix_health_report.pdf"
    try:
        export_combined_pdf(data, out)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    return FileResponse(out, filename="luminix_health_report.pdf", media_type="application/pdf")

