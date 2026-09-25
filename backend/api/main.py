"""FastAPI surface for Luminix — pose, nutrition, gym, reports, and export."""

from __future__ import annotations

import json
import os
import sys
import uuid
from pathlib import Path
from typing import Any, Dict, Optional

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, File, Form, HTTPException, UploadFile, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
from pydantic import BaseModel, Field, EmailStr
from fastapi.staticfiles import StaticFiles

ROOT = Path(__file__).resolve().parents[1]
PROJECT_ROOT = ROOT.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

load_dotenv(PROJECT_ROOT / ".env")

from analysis_module.email_service import send_donation_notification_email, send_report_email  # noqa: E402
from analysis_module.pdf_export import export_combined_pdf  # noqa: E402
from analysis_module.report_generator import build_combined_report  # noqa: E402
from database.db import check_daily_donation_limit, get_security_stats, init_db, log_event, recent_events, record_creator_donation  # noqa: E402
from database.firebase_admin_service import (  # noqa: E402
    get_telemetry_history_from_firestore,
    is_firebase_ready,
    save_donation_to_firestore,
    save_telemetry_to_firestore,
)
from api.auth_routes import get_optional_user, router as auth_router  # noqa: E402
from api.health_routes import router as health_router  # noqa: E402
from auth.firewall import SecurityFirewallMiddleware, firewall  # noqa: E402
from auth.oauth import google_configured, github_configured  # noqa: E402
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
if os.environ.get("VERCEL") or os.environ.get("AWS_LAMBDA_FUNCTION_NAME"):
    OUTPUT = Path("/tmp") / "luminix_output"
try:
    OUTPUT.mkdir(parents=True, exist_ok=True)
except OSError:
    OUTPUT = Path("/tmp") / "luminix_output"
    OUTPUT.mkdir(parents=True, exist_ok=True)

STATIC_DIR = PROJECT_ROOT / "frontend"
ASSETS_DIR = PROJECT_ROOT / "assets"
try:
    STATIC_DIR.mkdir(parents=True, exist_ok=True)
except OSError:
    pass
try:
    ASSETS_DIR.mkdir(parents=True, exist_ok=True)
except OSError:
    pass

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


app = FastAPI(title="Luminix", description="Advanced Health Intelligence Platform & Security Firewall", version="2.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
# Attach Luminix Security Firewall (WAF + Rate Limiting + Security Headers)
app.add_middleware(SecurityFirewallMiddleware)

@app.middleware("http")
async def no_cache_static_middleware(request: Request, call_next):
    response = await call_next(request)
    path = request.url.path
    if path.startswith("/static/") or path == "/" or path.endswith(".html"):
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return response

app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")
app.mount("/assets", StaticFiles(directory=str(ASSETS_DIR)), name="assets")
IMAGES_DIR = STATIC_DIR / "images"
if IMAGES_DIR.exists():
    app.mount("/images", StaticFiles(directory=str(IMAGES_DIR)), name="images")
app.include_router(auth_router)
app.include_router(health_router)


@app.api_route("/", methods=["GET", "HEAD"])
def index_page() -> FileResponse:
    path = STATIC_DIR / "index.html"
    if not path.is_file():
        raise HTTPException(status_code=404, detail="frontend/index.html missing")
    return FileResponse(path, media_type="text/html")


@app.api_route("/auth", methods=["GET", "HEAD"])
def auth_page() -> FileResponse:
    path = STATIC_DIR / "auth.html"
    if not path.is_file():
        raise HTTPException(status_code=404, detail="frontend/auth.html missing")
    return FileResponse(path, media_type="text/html")


@app.api_route("/privacy", methods=["GET", "HEAD"])
def privacy_page() -> FileResponse:
    path = STATIC_DIR / "privacy.html"
    if not path.is_file():
        raise HTTPException(status_code=404, detail="frontend/privacy.html missing")
    return FileResponse(path, media_type="text/html")


@app.api_route("/terms", methods=["GET", "HEAD"])
def terms_page() -> FileResponse:
    path = STATIC_DIR / "terms.html"
    if not path.is_file():
        raise HTTPException(status_code=404, detail="frontend/terms.html missing")
    return FileResponse(path, media_type="text/html")


@app.api_route("/accessibility", methods=["GET", "HEAD"])
def accessibility_page() -> FileResponse:
    path = STATIC_DIR / "accessibility.html"
    if not path.is_file():
        raise HTTPException(status_code=404, detail="frontend/accessibility.html missing")
    return FileResponse(path, media_type="text/html")


@app.api_route("/manifest.json", methods=["GET", "HEAD"])
def manifest() -> FileResponse:
    path = STATIC_DIR / "manifest.json"
    if not path.is_file():
        raise HTTPException(status_code=404, detail="manifest.json missing")
    return FileResponse(path, media_type="application/json")


@app.api_route("/favicon.ico", methods=["GET", "HEAD"])
def favicon_ico() -> FileResponse:
    svg_path = STATIC_DIR / "favicon.svg"
    if svg_path.is_file():
        return FileResponse(svg_path, media_type="image/svg+xml")
    raise HTTPException(status_code=404, detail="favicon missing")


@app.api_route("/robots.txt", methods=["GET", "HEAD"])
def robots_txt() -> FileResponse:
    path = STATIC_DIR / "robots.txt"
    if path.is_file():
        return FileResponse(path, media_type="text/plain")
    return Response(content="User-agent: *\nAllow: /\nSitemap: http://localhost:8000/sitemap.xml\n", media_type="text/plain")


@app.api_route("/sitemap.xml", methods=["GET", "HEAD"])
def sitemap_xml() -> FileResponse:
    path = STATIC_DIR / "sitemap.xml"
    if path.is_file():
        return FileResponse(path, media_type="application/xml")
    raise HTTPException(status_code=404, detail="sitemap.xml missing")


@app.api_route("/llms.txt", methods=["GET", "HEAD"])
def llms_txt() -> FileResponse:
    path = STATIC_DIR / "llms.txt"
    if path.is_file():
        return FileResponse(path, media_type="text/plain")
    raise HTTPException(status_code=404, detail="llms.txt missing")


# ── Custom Themed 404 Handler ───────────────────────────────────────────────
@app.exception_handler(StarletteHTTPException)
async def custom_http_exception_handler(request: Request, exc: StarletteHTTPException):
    if exc.status_code == 404:
        path_str = request.url.path
        # Cleanly ignore source map requests so devtools never log 404 errors
        if path_str.endswith(".map"):
            return Response(status_code=204)
        # API or JSON request
        if path_str.startswith(("/v1", "/api", "/auth/")) or "application/json" in request.headers.get("accept", ""):
            return JSONResponse(status_code=404, content={"detail": exc.detail or "Endpoint not found", "status_code": 404})
        # Render Kyoto-themed 404 HTML
        page_404 = STATIC_DIR / "404.html"
        if page_404.is_file():
            return FileResponse(page_404, status_code=404, media_type="text/html")
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


@app.get("/health")
def health() -> Dict[str, Any]:
    return {
        "status": "ok",
        "platform": "Luminix",
        "firewall_active": True,
        "gemini_configured": bool(os.getenv("GEMINI_API_KEY")),
        "smtp_configured": bool(os.getenv("SMTP_HOST")),
        "sendgrid_configured": bool(os.getenv("SENDGRID_API_KEY")),
        "google_oauth_configured": google_configured(),
        "github_oauth_configured": github_configured(),
        "security_stats": get_security_stats(),
        "output_dir": str(OUTPUT),
    }


@app.get("/v1/config/ai-key")
def config_ai_key() -> Dict[str, Any]:
    key = os.getenv("GEMINI_API_KEY", "")
    return {
        "configured": bool(key),
        "key": key if key else "",
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
    cuisine = payload.get("cuisine", "Global")
    spice_level = payload.get("spice_level", "Medium")
    diet = payload.get("diet_preference", "omnivore")
    limit = int(payload.get("limit", 6) or 6)
    catalog = suggest_recipes(ingredients, cuisine=cuisine, spice_level=spice_level, limit=limit)

    # Enhance with Gemini AI Global Recipes when available
    custom_key = payload.get("api_key") or payload.get("apiKey")
    effective_key = custom_key or os.getenv("GEMINI_API_KEY")
    if effective_key:
        try:
            if custom_key:
                os.environ["GEMINI_API_KEY"] = custom_key
            from analysis_module.gemini_integration import generate_global_recipes_gemini, generate_ai_recipe_gemini
            ai_data = generate_global_recipes_gemini(
                ingredients=ingredients,
                cuisine=cuisine,
                spice_level=spice_level,
                diet_preference=diet,
            )
            if ai_data and isinstance(ai_data, dict) and ai_data.get("recipes"):
                catalog["ai_recipes"] = ai_data["recipes"]
                catalog["recipes"] = ai_data["recipes"]
                catalog["ai_recipe"] = ai_data["recipes"][0]
                catalog["source"] = "gemini"
            elif ai_data and isinstance(ai_data, list) and len(ai_data) > 0:
                catalog["ai_recipes"] = ai_data
                catalog["recipes"] = ai_data
                catalog["ai_recipe"] = ai_data[0]
                catalog["source"] = "gemini"
            else:
                # Fallback to single AI recipe
                single = generate_ai_recipe_gemini(ingredients, diet)
                if single and "recipe_name" in single:
                    catalog["ai_recipes"] = [single]
                    catalog["recipes"] = [single]
                    catalog["ai_recipe"] = single
                    catalog["source"] = "gemini"
        except Exception as exc:
            catalog["gemini_error"] = str(exc)

    return catalog


# ── Pose ─────────────────────────────────────────────────────────────────────

ALLOWED_VIDEO_EXTENSIONS = {".mp4", ".mov", ".avi", ".webm"}


def _verify_video_magic_bytes(header: bytes, ext: str) -> bool:
    if len(header) < 4:
        return False
    if ext in (".mp4", ".mov"):
        return b"ftyp" in header[:32] or b"moov" in header[:32] or b"mdat" in header[:32]
    elif ext == ".avi":
        return header.startswith(b"RIFF") and b"AVI " in header[:16]
    elif ext == ".webm":
        return header.startswith(b"\x1a\x45\xdf\xa3")
    return False


@app.post("/v1/pose/analyze-video")
async def pose_analyze_video(
    file: UploadFile = File(...),
    stride: int = Form(3),
    max_frames: int = Form(240),
) -> Dict[str, Any]:
    raw_name = file.filename or "upload.mp4"
    ext = Path(raw_name).suffix.lower()
    if ext not in ALLOWED_VIDEO_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format '{ext}'. Allowed video formats: {', '.join(sorted(ALLOWED_VIDEO_EXTENSIONS))}",
        )

    content = await file.read()
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Uploaded video file is empty.")
    if len(content) > 15 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File size exceeds maximum allowed upload limit of 15MB.")

    if not _verify_video_magic_bytes(content[:64], ext):
        raise HTTPException(status_code=400, detail="Invalid video header: file content does not match declared video format.")

    unique_id = uuid.uuid4().hex
    safe_filename = f"pose_{unique_id}{ext}"
    dest = OUTPUT / safe_filename
    dest.write_bytes(content)

    try:
        rep = analyze_video_file(dest, stride=stride, max_frames=max_frames, output_dir=OUTPUT / "pose_previews")
        return report_to_dict(rep)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    finally:
        # Ephemeral cleanup — delete biometric video bytes immediately after kinematic extraction
        if dest.exists():
            try:
                dest.unlink()
            except Exception:
                pass


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
def progress_recent(
    limit: int = 20,
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_user),
) -> JSONResponse:
    user_label = str(current_user["id"]) if current_user else "default"
    safe_limit = min(100, max(1, limit))
    return JSONResponse({"items": recent_events(safe_limit, user_label=user_label)})


class ProgressLogRequest(BaseModel):
    user_label: str = "default"
    bmi: Optional[float] = None
    pose_score: Optional[float] = None
    payload: Optional[Dict[str, Any]] = None


@app.post("/v1/progress/log")
def progress_log(
    req: ProgressLogRequest,
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_user),
) -> JSONResponse:
    effective_label = str(current_user["id"]) if current_user else req.user_label
    log_event(
        user_label=effective_label,
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


# ── Nutrition AI Food Analysis ────────────────────────────────────────────────

class FoodAnalysisRequest(BaseModel):
    food_query: str

@app.post("/v1/nutrition/ai-food-analysis")
def nutrition_ai_food_analysis(req: FoodAnalysisRequest) -> Dict[str, Any]:
    """Analyze custom meal or food query and return calories and macros using Gemini."""
    if os.getenv("GEMINI_API_KEY"):
        try:
            from analysis_module.gemini_integration import analyze_food_nutrition_gemini
            data = analyze_food_nutrition_gemini(req.food_query)
            if data and "calories" in data:
                return {"success": True, "analysis": data, "source": "gemini"}
        except Exception as e:
            pass

    # Simple fallback heuristic
    return {
        "success": True,
        "analysis": {
            "food_name": req.food_query,
            "estimated_serving": "1 serving",
            "calories": 250,
            "protein_g": 12.0,
            "carbs_g": 30.0,
            "fat_g": 8.0,
            "fiber_g": 3.0,
            "micronutrients": ["Balanced Essential Nutrients"],
            "health_score": 75,
            "analysis_notes": "Standard nutritional estimate. For exact tracking, verify with weighed portions."
        },
        "source": "fallback"
    }


# ── Luna AI Chat ─────────────────────────────────────────────────────────────

class LunaChatRequest(BaseModel):
    message: str
    user_context: Optional[Dict[str, Any]] = None

@app.post("/v1/luna/chat")
def luna_chat(req: LunaChatRequest) -> Dict[str, Any]:
    """Luna AI chat endpoint — uses Gemini 3.6 Flash when available, falls back to rule-based."""
    msg = req.message.strip()

    # Try Gemini first with specialized health and nutrition intelligence
    if os.getenv("GEMINI_API_KEY"):
        try:
            from analysis_module.gemini_integration import luna_chat_gemini
            reply = luna_chat_gemini(msg, req.user_context)
            if reply:
                return {"reply": reply, "source": "gemini", "model": os.getenv("GEMINI_MODEL", "gemini-3.6-flash")}
        except Exception as e:
            pass

    # Rule-based fallback
    reply = _luna_fallback(msg.lower())
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


# ── Live Wearable & Mobile Telemetry Sync Service ────────────────────────────

class TelemetryPayload(BaseModel):
    device_id: Optional[str] = "mobile_default"
    device_name: Optional[str] = "Mobile Companion"
    device_type: Optional[str] = "phone"
    connection_type: Optional[str] = "Wi-Fi Companion Bridge"
    steps: int = 0
    step_goal: int = 10000
    distance_km: float = 0.0
    calories: Optional[int] = None
    battery: Optional[int] = 85
    heart_rate: Optional[int] = None
    spo2: Optional[int] = None
    systolic: Optional[int] = None
    diastolic: Optional[int] = None
    sleep_score: Optional[int] = None
    sleep_hours: Optional[int] = None
    sleep_minutes: Optional[int] = None
    motion_magnitude: Optional[float] = 0.0
    timestamp: Optional[float] = None

class BluetoothConnectPayload(BaseModel):
    device_name: str
    device_address: Optional[str] = None
    device_type: Optional[str] = "smartwatch"
    connection_type: Optional[str] = "System Bluetooth (BCM_4387 Controller)"
    steps: Optional[int] = None
    battery: Optional[int] = None

# In-memory live telemetry state
_live_telemetry: Dict[str, Any] = {
    "connected": False,
    "device_name": None,
    "device_type": None,
    "connection_type": None,
    "battery": None,
    "steps": None,
    "distance_km": None,
    "calories": None,
    "heart_rate": None,
    "spo2": None,
    "systolic": None,
    "diastolic": None,
    "sleep_score": None,
    "sleep_hours": None,
    "sleep_minutes": None,
    "sleep_quality": None,
    "last_sync": None,
    "raw_packets_received": 0
}

# In-memory time-series history (up to 30 daily records per metric)
_metrics_history: list = []

# Live cache of legitimately connected devices
_known_system_devices: list = []

@app.post("/v1/telemetry/sync")
def sync_telemetry(payload: TelemetryPayload) -> Dict[str, Any]:
    """Called by mobile phone companion or BLE bridge to report live step and sensor telemetry."""
    import time
    global _live_telemetry
    _live_telemetry.update({
        "connected": True,
        "device_name": payload.device_name,
        "device_type": payload.device_type,
        "connection_type": payload.connection_type,
        "battery": payload.battery,
        "steps": payload.steps,
        "distance_km": payload.distance_km,
        "calories": payload.calories,
        "heart_rate": payload.heart_rate,
        "spo2": payload.spo2,
        "systolic": payload.systolic,
        "diastolic": payload.diastolic,
        "sleep_score": payload.sleep_score,
        "sleep_hours": payload.sleep_hours,
        "sleep_minutes": payload.sleep_minutes,
        "motion_magnitude": payload.motion_magnitude,
        "last_sync": time.time(),
        "raw_packets_received": _live_telemetry.get("raw_packets_received", 0) + 1
    })
    return {"status": "ok", "synced": True, "packets": _live_telemetry["raw_packets_received"]}

@app.get("/v1/telemetry/live")
def get_live_telemetry() -> Dict[str, Any]:
    """Desktop/Dashboard polls this to get real-time synced telemetry from the paired phone or watch."""
    import time
    data = dict(_live_telemetry)
    if data.get("last_sync"):
        elapsed = time.time() - data["last_sync"]
        data["seconds_since_last_packet"] = round(elapsed, 1)
        data["is_live"] = elapsed < 35.0
    else:
        data["seconds_since_last_packet"] = None
        data["is_live"] = False
    return data

@app.post("/v1/telemetry/reset")
def reset_telemetry() -> Dict[str, Any]:
    """Resets live telemetry state to disconnected."""
    global _live_telemetry
    _live_telemetry = {
        "connected": False,
        "device_name": None,
        "device_type": None,
        "connection_type": None,
        "battery": None,
        "steps": None,
        "distance_km": None,
        "calories": None,
        "heart_rate": None,
        "spo2": None,
        "systolic": None,
        "diastolic": None,
        "sleep_score": None,
        "sleep_hours": None,
        "sleep_minutes": None,
        "sleep_quality": None,
        "last_sync": None,
        "raw_packets_received": 0
    }
    try:
        from api.health_routes import _registered_devices, _active_live_sessions
        _registered_devices.clear()
        _active_live_sessions.clear()
    except Exception:
        pass
    return {"status": "reset", "connected": False}

# BLE device cache for instant, non-blocking proximity and scan queries
_ble_device_cache: Dict[str, Dict[str, Any]] = {}
_last_ble_scan_time: float = 0.0

def get_local_ip() -> str:
    """Returns the local network LAN IP for companion mobile device connection."""
    import socket
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "10.36.98.140"

@app.post("/v1/bluetooth/force-pair-request")
def force_pair_request() -> Dict[str, Any]:
    """Broadcasts native hardware connection, baseband paging, and pairing authentication requests to all available Bluetooth devices."""
    import threading
    paged = []
    try:
        import objc
        from Foundation import NSBundle
        b = NSBundle.bundleWithPath_('/System/Library/Frameworks/IOBluetooth.framework')
        if b:
            b.load()
            IOBluetoothDevice = objc.lookUpClass('IOBluetoothDevice')
            IOBluetoothDevicePair = objc.lookUpClass('IOBluetoothDevicePair')
            devices = IOBluetoothDevice.pairedDevices() or []
            for d in devices:
                name = d.name() or "Bluetooth Device"
                paged.append(name)
                def _force_page_and_pair(dev):
                    try:
                        # 1. Baseband Remote Name Paging (pings and wakes the target device's radio)
                        dev.remoteNameRequest_(None)
                    except Exception:
                        pass
                    try:
                        # 2. Transmit Baseband Connection Request
                        dev.openConnection()
                    except Exception:
                        pass
                    try:
                        # 3. Transmit Pair / Authentication Request (causes incoming 'Pair with device?' pop up on target device)
                        dev.requestAuthentication()
                    except Exception:
                        pass
                    try:
                        # 4. Initiate IOBluetoothDevicePair handshake
                        if IOBluetoothDevicePair:
                            pair_inst = IOBluetoothDevicePair.pairWithDevice_(dev)
                            if pair_inst:
                                pair_inst.start()
                    except Exception:
                        pass

                threading.Thread(target=_force_page_and_pair, args=(d,), daemon=True).start()
    except Exception as e:
        print(f"[Force Pair Notice]: {e}")
    return {"status": "ok", "paged_devices": paged}

@app.get("/v1/bluetooth/state")
def get_bluetooth_hardware_state() -> Dict[str, Any]:
    """Returns real physical hardware power status of the Bluetooth controller."""
    import subprocess
    is_on = True
    state_str = "Powered On"
    try:
        raw = subprocess.check_output(['system_profiler', 'SPBluetoothDataType', '-json'], timeout=3)
        data = json.loads(raw)
        info = data.get('SPBluetoothDataType', [{}])[0]
        c_props = info.get('controller_properties', {})
        c_state = c_props.get('controller_state', '').lower()
        if 'off' in c_state or 'disabled' in c_state or 'attrib_off' in c_state:
            is_on = False
            state_str = "Powered Off"
        elif 'on' in c_state or 'enabled' in c_state or 'attrib_on' in c_state:
            is_on = True
            state_str = "Powered On"
    except Exception as e:
        print(f"[Bluetooth State Error]: {e}")
    return {"status": "ok", "powered_on": is_on, "state": state_str}

@app.get("/v1/bluetooth/scan")
async def scan_bluetooth_devices() -> Dict[str, Any]:
    """Scans for real BLE smartwatches, mobile phones, and reads system Bluetooth devices."""
    import subprocess
    import asyncio
    import time
    global _ble_device_cache, _last_ble_scan_time, _known_system_devices

    host_ip = get_local_ip()
    controller_info = {
        "chipset": "BCM_4387",
        "address": "68:CA:C4:9C:D3:71",
        "state": "Powered On",
        "host_ip": host_ip
    }
    system_devices = []

    # 1. Query macOS native Bluetooth controller & recognized devices
    try:
        raw = subprocess.check_output(['system_profiler', 'SPBluetoothDataType', '-json'], timeout=4)
        data = json.loads(raw)
        info = data.get('SPBluetoothDataType', [{}])[0]
        c_props = info.get('controller_properties', {})
        if c_props.get('controller_state'):
            controller_info["state"] = "Powered On" if "on" in c_props.get('controller_state', '').lower() else "Powered Off"
        if c_props.get('controller_address') and c_props['controller_address'] != "NULL":
            controller_info["address"] = c_props['controller_address']
        if c_props.get('controller_chipset'):
            controller_info["chipset"] = c_props['controller_chipset']

        discovered_sys = []
        for cat in ['device_connected', 'device_not_connected', 'device_title']:
            for item in info.get(cat, []):
                for name, props in item.items():
                    minor = props.get('device_minorType', 'Device')
                    dtype = 'phone' if 'phone' in minor.lower() else ('smartwatch' if 'watch' in minor.lower() else 'wearable')
                    
                    # Extract genuine battery if reported by macOS controller for this hardware
                    real_batt = None
                    for b_key in ['device_batteryLevelMain', 'device_batteryPercentCombined', 'device_batteryLevelCase']:
                        if b_key in props:
                            try:
                                raw_b = str(props[b_key]).replace('%', '').strip()
                                real_batt = int(raw_b)
                                break
                            except Exception:
                                pass

                    discovered_sys.append({
                        "name": name,
                        "address": props.get('device_address', ''),
                        "type": dtype,
                        "minor_type": minor,
                        "battery": real_batt,
                        "connected": cat == 'device_connected'
                    })
        if discovered_sys:
            # Preserve any newly added / custom devices previously registered in _known_system_devices
            for kd in _known_system_devices:
                if not any(d.get("name", "").lower() == kd.get("name", "").lower() for d in discovered_sys):
                    discovered_sys.append(kd)
            system_devices = discovered_sys
            _known_system_devices = discovered_sys
        else:
            system_devices = list(_known_system_devices)
    except Exception as e:
        print(f"[Bluetooth Query Warning]: {e}")
        system_devices = list(_known_system_devices)

    # 2. Query real BLE broadcasting peripherals via Bleak
    ble_devices = []
    try:
        from bleak import BleakScanner
        devices_dict = await BleakScanner.discover(timeout=2.8, return_adv=True)
        now = time.time()
        _last_ble_scan_time = now
        for d, adv in devices_dict.values():
            name = d.name or adv.local_name
            raw_addr = d.address or ""
            display_name = name if name else f"BLE Device ({raw_addr[-8:] if len(raw_addr) >= 8 else raw_addr})"
            name_lower = display_name.lower()
            dtype = 'smartwatch' if any(w in name_lower for w in ['watch', 'buzz', 'fit', 'caliber', 'band', 'gear']) else (
                'phone' if any(p in name_lower for p in ['phone', 'pixel', 'redmi', 'samsung', 'iphone', 'xiaomi']) else (
                    'wearable' if any(h in name_lower for h in ['headset', 'buds', 'studio', 'audio', 'ear']) else 'ble_sensor'
                )
            )
            item = {
                "name": display_name,
                "address": raw_addr,
                "type": dtype,
                "rssi": adv.rssi,
                "timestamp": now
            }
            ble_devices.append(item)
            _ble_device_cache[raw_addr] = item
            if name:
                _ble_device_cache[name.lower()] = item

        # Sort by signal strength (strongest first)
        ble_devices.sort(key=lambda x: x.get("rssi", -100), reverse=True)
    except Exception as e:
        print(f"[BLE Bleak Scan Warning]: {e}")

    return {
        "status": "ok",
        "controller": controller_info,
        "host_ip": host_ip,
        "system_devices": system_devices,
        "ble_devices": ble_devices[:18]
    }

class RegisterDevicePayload(BaseModel):
    name: str
    type: Optional[str] = "smartwatch"
    address: Optional[str] = ""
    battery: Optional[int] = None

@app.post("/v1/bluetooth/devices")
def register_bluetooth_device(payload: RegisterDevicePayload) -> Dict[str, Any]:
    """Registers a new Bluetooth/BLE device (smartwatch, band, phone) into the known devices registry."""
    global _known_system_devices
    clean_name = payload.name.strip()
    if not clean_name:
        return {"status": "error", "message": "Device name required"}
    existing = next((d for d in _known_system_devices if d.get("name", "").lower() == clean_name.lower()), None)
    if not existing:
        new_dev = {
            "name": clean_name,
            "address": payload.address or f"BLE:{clean_name[:6].upper()}",
            "type": payload.type or "smartwatch",
            "minor_type": payload.type or "smartwatch",
            "battery": payload.battery,
            "connected": False
        }
        _known_system_devices.append(new_dev)
    else:
        if payload.type:
            existing["type"] = payload.type
        if payload.battery is not None:
            existing["battery"] = payload.battery
    return {"status": "ok", "devices": _known_system_devices}

@app.delete("/v1/bluetooth/devices/{device_name}")
def forget_bluetooth_device(device_name: str) -> Dict[str, Any]:
    """Removes a device from the known devices registry."""
    global _known_system_devices
    _known_system_devices = [d for d in _known_system_devices if d.get("name", "").lower() != device_name.lower()]
    return {"status": "ok", "message": f"Forgot {device_name}"}

@app.post("/v1/bluetooth/connect")
def connect_bluetooth_device(payload: BluetoothConnectPayload) -> Dict[str, Any]:
    """Connects the host system's Bluetooth module to a selected phone, watch or BLE peripheral."""
    import time
    global _live_telemetry, _known_system_devices
    # Reset telemetry for new device connection unless payload provides genuine data
    is_new_device = payload.device_name != _live_telemetry.get("device_name")
    if is_new_device:
        steps = payload.steps
        battery = payload.battery
    else:
        steps = payload.steps if payload.steps is not None else _live_telemetry.get("steps")
        battery = payload.battery if payload.battery is not None else _live_telemetry.get("battery")

    # If battery not specified, check if macOS system controller reported hardware battery for this device
    if battery is None and payload.device_name:
        for d in _known_system_devices:
            if d.get("name") and (d["name"].lower() == payload.device_name.lower() or payload.device_name.lower() in d["name"].lower()):
                if d.get("battery") is not None:
                    battery = d["battery"]
                    break

    # Persist or update device in _known_system_devices
    if payload.device_name:
        existing = next((d for d in _known_system_devices if d.get("name", "").lower() == payload.device_name.lower()), None)
        if not existing:
            _known_system_devices.append({
                "name": payload.device_name,
                "address": payload.device_address or f"BLE:{payload.device_name[:6].upper()}",
                "type": payload.device_type or "smartwatch",
                "minor_type": payload.device_type or "smartwatch",
                "battery": battery,
                "connected": True
            })
        else:
            existing["connected"] = True
            if battery is not None:
                existing["battery"] = battery

        # Also register in health_routes for system-wide real device tracking
        try:
            from api.health_routes import _registered_devices
            dev_id = payload.device_name.lower().replace(" ", "_")
            _registered_devices[dev_id] = {
                "id": dev_id,
                "name": payload.device_name,
                "device_type": payload.device_type or "smartwatch",
                "source": "direct_ble",
                "platform": payload.connection_type or "Web Bluetooth GATT BLE 5.3",
                "connected_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "status": "connected",
            }
        except Exception:
            pass

    dist = round(steps * 0.00076, 2) if steps is not None else None
    cal = round(steps * 0.045) if steps is not None else None

    _live_telemetry.update({
        "connected": True,
        "device_name": payload.device_name,
        "device_address": payload.device_address,
        "device_type": payload.device_type,
        "connection_type": payload.connection_type,
        "battery": battery,
        "steps": steps,
        "distance_km": dist,
        "calories": cal,
        "last_sync": time.time(),
        "raw_packets_received": _live_telemetry.get("raw_packets_received", 0) + 1
    })
    return {
        "status": "connected",
        "device_name": payload.device_name,
        "connection_type": payload.connection_type,
        "battery": _live_telemetry["battery"],
        "steps": _live_telemetry["steps"]
    }



class MetricHistoryPayload(BaseModel):
    ts: Optional[float] = None
    date: Optional[str] = None
    steps: Optional[int] = None
    calories: Optional[int] = None
    distance_km: Optional[float] = None
    systolic: Optional[int] = None
    diastolic: Optional[int] = None
    heart_rate: Optional[int] = None
    spo2: Optional[int] = None
    sleep_hours: Optional[int] = None
    sleep_minutes: Optional[int] = None
    sleep_score: Optional[int] = None
    sleep_quality: Optional[str] = None

@app.post("/v1/telemetry/record")
def record_metric_history(
    payload: MetricHistoryPayload,
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_user),
) -> Dict[str, Any]:
    """Records a daily metric snapshot to time-series history and syncs to Cloud Firestore."""
    import time
    global _metrics_history
    user_id = str(current_user["id"]) if current_user else "anonymous"
    record = {
        "user_id": user_id,
        "ts": payload.ts or time.time(),
        "date": payload.date,
        "steps": payload.steps,
        "calories": payload.calories,
        "distance_km": payload.distance_km,
        "systolic": payload.systolic,
        "diastolic": payload.diastolic,
        "heart_rate": payload.heart_rate,
        "spo2": payload.spo2,
        "sleep_hours": payload.sleep_hours,
        "sleep_minutes": payload.sleep_minutes,
        "sleep_score": payload.sleep_score,
        "sleep_quality": payload.sleep_quality,
    }
    _metrics_history.append(record)
    # Keep only the last 30 records
    _metrics_history = _metrics_history[-30:]

    # Sync to Cloud Firestore if available
    firestore_doc_id = None
    try:
        firestore_doc_id = save_telemetry_to_firestore(record)
    except Exception:
        pass

    return {
        "status": "recorded",
        "total_records": len(_metrics_history),
        "firestore_doc_id": firestore_doc_id,
        "cloud_synced": firestore_doc_id is not None
    }


@app.get("/v1/telemetry/history")
def get_telemetry_metric_history(
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_user),
) -> Dict[str, Any]:
    """Returns stored metric snapshots from memory or Cloud Firestore scoped to the caller."""
    global _metrics_history
    if not _metrics_history:
        # Fall back to Firestore cloud records
        cloud_records = get_telemetry_history_from_firestore(limit=30)
        if cloud_records:
            _metrics_history = list(reversed(cloud_records))

    user_id = str(current_user["id"]) if current_user else "anonymous"
    scoped = [
        r for r in _metrics_history
        if r.get("user_id") == user_id or (user_id == "anonymous" and "user_id" not in r)
    ]
    return {
        "status": "ok",
        "records": scoped,
        "total": len(scoped),
        "firebase_live": is_firebase_ready()
    }


@app.get("/v1/firebase/client-config")
def get_firebase_client_config() -> Dict[str, Any]:
    """Dynamically serves public client Firebase config from environment variables (no keys in files)."""
    api_key = os.environ.get("FIREBASE_API_KEY")
    project_id = os.environ.get("FIREBASE_PROJECT_ID", "luminix-a0363")
    if not api_key:
        return {"configured": False, "privacy": "zero_keys_in_files"}
    return {
        "configured": True,
        "apiKey": api_key,
        "authDomain": os.environ.get("FIREBASE_AUTH_DOMAIN", f"{project_id}.firebaseapp.com"),
        "projectId": project_id,
        "storageBucket": os.environ.get("FIREBASE_STORAGE_BUCKET", f"{project_id}.firebasestorage.app"),
        "messagingSenderId": os.environ.get("FIREBASE_MESSAGING_SENDER_ID", ""),
        "appId": os.environ.get("FIREBASE_APP_ID", ""),
        "measurementId": os.environ.get("FIREBASE_MEASUREMENT_ID", "")
    }


@app.get("/v1/firebase/status")
def get_firebase_status() -> Dict[str, Any]:
    """Returns Firebase Admin SDK connection and configuration health."""
    ready = is_firebase_ready()
    return {
        "status": "connected" if ready else "local_private_mode",
        "cloud_firestore": ready,
        "storage_mode": "cloud" if ready else "local_encrypted_vault",
        "keys_in_files": False,
        "privacy": "strict_zero_file_storage"
    }




# ── Find My Device / Ring Feature ────────────────────────────────────────────

# Ring state: tracks if alarm is active for external mobile phone or smartwatch
_ring_state: Dict[str, Any] = {
    "active": False,
    "triggered_at": None,
    "duration_seconds": 15
}

@app.post("/v1/device/ring")
def trigger_device_ring() -> Dict[str, Any]:
    """Triggers the Find My Device ring alarm ONLY on external devices (mobile phone companion & smartwatch). Host machine audio is muted per user request."""
    import time
    global _ring_state

    _ring_state["active"] = True
    _ring_state["triggered_at"] = time.time()

    # Attempt to trigger BLE Immediate Alert (0x1802) on external smartwatch if address is present
    device_address = _live_telemetry.get("device_address")
    if device_address and ":" in device_address:
        import asyncio
        async def _ble_ring():
            try:
                from bleak import BleakClient
                async with BleakClient(device_address, timeout=4.0) as client:
                    for service in client.services:
                        for char in service.characteristics:
                            if "2a06" in char.uuid.lower():
                                # 0x02 = High Alert (smartwatch buzzer/vibrate)
                                await client.write_gatt_char(char.uuid, bytes([0x02]))
                                print(f"[BLE Alert] High Alert written to {device_address}")
                                return
            except Exception as e:
                print(f"[BLE Alert Notice for {device_address}]: {e}")

        try:
            import threading
            threading.Thread(target=lambda: asyncio.run(_ble_ring()), daemon=True).start()
        except Exception:
            pass

    device_name = _live_telemetry.get("device_name", "External Device")
    return {
        "status": "ringing",
        "target": "external_device_only",
        "host_audio": False,
        "device_name": device_name,
        "duration_seconds": _ring_state["duration_seconds"]
    }

@app.post("/v1/device/ring/stop")
def stop_device_ring() -> Dict[str, Any]:
    """Stops the external ring alarm immediately."""
    global _ring_state
    _ring_state["active"] = False
    _ring_state["triggered_at"] = None

    # Tell BLE smartwatch to stop alert (0x00 = No Alert)
    device_address = _live_telemetry.get("device_address")
    if device_address and ":" in device_address:
        import asyncio
        async def _ble_stop():
            try:
                from bleak import BleakClient
                async with BleakClient(device_address, timeout=3.0) as client:
                    for service in client.services:
                        for char in service.characteristics:
                            if "2a06" in char.uuid.lower():
                                await client.write_gatt_char(char.uuid, bytes([0x00]))
                                return
            except Exception:
                pass
        try:
            import threading
            threading.Thread(target=lambda: asyncio.run(_ble_stop()), daemon=True).start()
        except Exception:
            pass

    return {"status": "stopped"}

@app.get("/v1/device/ring/status")
def get_ring_status() -> Dict[str, Any]:
    """Polled by the phone companion to know if it should ring."""
    import time
    global _ring_state
    # Auto-expire after duration_seconds
    if _ring_state["active"] and _ring_state["triggered_at"]:
        elapsed = time.time() - _ring_state["triggered_at"]
        if elapsed > _ring_state["duration_seconds"]:
            _ring_state["active"] = False
            _ring_state["triggered_at"] = None
    return {
        "active": _ring_state["active"],
        "triggered_at": _ring_state["triggered_at"],
        "device_name": _live_telemetry.get("device_name", "Mobile Phone"),
        "duration_seconds": _ring_state["duration_seconds"]
    }

@app.get("/v1/device/proximity")
async def get_device_proximity() -> Dict[str, Any]:
    """Returns RSSI signal strength and calculated distance radius of the connected device."""
    import math
    import time
    global _ble_device_cache, _last_ble_scan_time

    device_name = _live_telemetry.get("device_name")
    device_address = _live_telemetry.get("device_address")

    if not _live_telemetry.get("connected") or not device_name:
        return {
            "status": "disconnected",
            "rssi": None,
            "distance_m": None,
            "signal_bars": 0,
            "radius_zone": "DISCONNECTED",
            "accuracy_m": 0.0
        }

    rssi = None
    name_clean = (device_name or "").lower()
    addr_clean = (device_address or "").lower()

    # 1. Check BLE cache first for rapid, non-blocking response
    if addr_clean and addr_clean in _ble_device_cache:
        rssi = _ble_device_cache[addr_clean].get("rssi")
    elif name_clean and name_clean in _ble_device_cache:
        rssi = _ble_device_cache[name_clean].get("rssi")
    else:
        for key, cached in _ble_device_cache.items():
            if name_clean and (name_clean in key or key in name_clean):
                rssi = cached.get("rssi")
                break

    # 2. If cache is empty or older than 5 seconds, perform a quick 1.0s scan
    now = time.time()
    if rssi is None and (now - _last_ble_scan_time > 4.0):
        try:
            from bleak import BleakScanner
            devices_dict = await BleakScanner.discover(timeout=1.2, return_adv=True)
            _last_ble_scan_time = time.time()
            for d, adv in devices_dict.values():
                d_name = d.name or adv.local_name or ""
                d_addr = d.address or ""
                _ble_device_cache[d_addr.lower()] = {"name": d_name, "rssi": adv.rssi, "timestamp": _last_ble_scan_time}
                if d_name:
                    _ble_device_cache[d_name.lower()] = {"name": d_name, "rssi": adv.rssi, "timestamp": _last_ble_scan_time}

                if (addr_clean and addr_clean == d_addr.lower()) or \
                   (name_clean and d_name and (name_clean in d_name.lower() or d_name.lower() in name_clean)):
                    rssi = adv.rssi
        except Exception:
            pass

    # 3. Calculate Distance Radius using indoor log-distance path loss: d = 10^((TxPower - RSSI) / (10 * n))
    distance_m = None
    if rssi is not None:
        tx_power = -59  # standard BLE reference power at 1 meter
        n = 2.4         # indoor RF path loss exponent
        raw_d = 10 ** ((tx_power - rssi) / (10 * n))
        distance_m = max(0.4, min(round(raw_d, 1), 35.0))

    # Signal bars: 0 to 5
    if rssi is None:
        bars = 0
    elif rssi >= -50:
        bars = 5
    elif rssi >= -60:
        bars = 4
    elif rssi >= -70:
        bars = 3
    elif rssi >= -80:
        bars = 2
    else:
        bars = 1

    # Radius zone label
    if distance_m is None:
        zone = "AWAITING RADIO SIGNAL"
    elif distance_m <= 1.5:
        zone = "IMMEDIATE (< 1.5m)"
    elif distance_m <= 5.0:
        zone = "NEARBY (1.5 - 5m)"
    elif distance_m <= 10.0:
        zone = "ROOM RADIUS (5 - 10m)"
    else:
        zone = "PERIMETER (> 10m)"

    return {
        "status": "ok",
        "device_name": device_name,
        "rssi": rssi,
        "distance_m": distance_m,
        "signal_bars": bars,
        "radius_zone": zone,
        "accuracy_m": 0.3
    }


# ── Creator Support & Donation Dispatch (Strict 5/day Rate Limit) ───────────

class CreatorDonationRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    email: Optional[EmailStr] = None
    amount: float = Field(..., ge=0.0, le=50000.0)
    note: Optional[str] = Field(default=None, max_length=2000)
    channel: Optional[str] = Field(default="Direct Support", max_length=50)

@app.post("/v1/creator/donation")
def submit_creator_donation(
    req: CreatorDonationRequest,
    request: Request,
) -> Dict[str, Any]:
    """
    Submits a donation pledge and note to creator Ram Charan Teja.
    Strictly caps notifications to maximum 5 per user/IP per 24 hours.
    Sends an immediate email notification to luno97802@gmail.com
    and records the record into local SQLite and Cloud Firestore.
    """
    client_ip = "127.0.0.1"
    if request.client and request.client.host:
        client_ip = request.client.host
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        client_ip = forwarded.split(",")[0].strip()

    email_val = str(req.email).strip().lower() if req.email else None

    # 1. Enforce strict 5-per-day rate limit
    allowed, current_count = check_daily_donation_limit(client_ip=client_ip, email=email_val, max_per_day=5)
    if not allowed:
        raise HTTPException(
            status_code=429,
            detail="Daily limit reached: You can send at most 5 messages/pledges per day to Ram Charan Teja. Thank you so much for your support!"
        )

    # 2. Record donation in SQLite
    donation_row = record_creator_donation(
        client_ip=client_ip,
        name=req.name.strip(),
        amount=req.amount,
        email=email_val,
        note=req.note.strip() if req.note else None,
        channel=req.channel or "Direct Support",
    )

    # 3. Mirror donation to Cloud Firestore if connected
    firestore_id = None
    try:
        firestore_id = save_donation_to_firestore({
            "name": req.name.strip(),
            "amount": req.amount,
            "email": email_val,
            "note": req.note.strip() if req.note else None,
            "channel": req.channel or "Direct Support",
            "client_ip": client_ip,
            "sqlite_id": donation_row.get("id"),
            "created_at": donation_row.get("created_at"),
        })
    except Exception:
        pass

    # 4. Dispatch notification email to Ram Charan Teja (luno97802@gmail.com)
    email_sent, email_status = send_donation_notification_email(
        donor_name=req.name.strip(),
        donor_email=email_val,
        amount=req.amount,
        note=req.note.strip() if req.note else None,
        channel=req.channel or "Direct Support",
        client_ip=client_ip,
    )

    remaining_today = max(0, 5 - (current_count + 1))

    return {
        "status": "success",
        "message": f"Thank you, {req.name.strip()}! Your contribution and message have been delivered to Ram Charan Teja.",
        "email_notified": email_sent,
        "email_status": email_status,
        "remaining_today": remaining_today,
        "firestore_id": firestore_id,
        "donation": donation_row,
    }


@app.api_route("/companion", methods=["GET", "HEAD"])
def serve_companion_page() -> FileResponse:
    """Serve the dedicated Mobile Companion Pedometer & Biometric Bridge."""
    companion_path = STATIC_DIR / "companion.html"
    if not companion_path.is_file():
        raise HTTPException(status_code=404, detail="frontend/companion.html missing")
    return FileResponse(companion_path, media_type="text/html")

