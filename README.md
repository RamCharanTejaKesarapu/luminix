# Luminix

AI-powered health intelligence platform with real-time pose tracking, gym workouts, yoga guidance, and Luna voice assistant.

## Architecture

```
/frontend   — SPA (HTML/JS/CSS, Tailwind, Three.js, MediaPipe)
/backend    — FastAPI server (nutrition, pose, gym, PDF, email)
/assets     — Brand assets (logo, icons)
/models     — ML model artifacts (MediaPipe loaded via CDN)
```

## Quick Start

### Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r ../requirements.txt
cp ../.env.example ../.env   # optional: Gemini + SMTP
uvicorn api.main:app --host 0.0.0.0 --port 8000
```

Open **http://127.0.0.1:8000/** — the backend serves the frontend automatically.

Camera features require HTTPS or `localhost`.

### Frontend-only (Vercel/Netlify)

Deploy the `frontend/` folder as a static site. Set your API proxy to the backend URL, or run the full stack via the backend (recommended).

## Key API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Liveness check |
| POST | `/v1/generate-plan` | Nutrition + gym daily plan |
| POST | `/v1/report/send-email` | Email PDF report |
| POST | `/v1/report/export-pdf` | Download PDF report |
| POST | `/v1/pose-analysis` | Real-time pose risk heuristics |
| GET | `/v1/gym/plan/{category}` | Category workout |
| GET | `/v1/gym-plan` | Daily workout generator |
| GET | `/v1/yoga/poses` | Yoga pose library (17 poses) |

Full interactive docs: **http://127.0.0.1:8000/docs**

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | No | Enables AI-generated insights |
| `SMTP_HOST` | No | SMTP server for email delivery |
| `SMTP_PORT` | No | Default `587` |
| `SMTP_USER` | No | SMTP username |
| `SMTP_PASSWORD` | No | SMTP password |
| `SMTP_FROM` | No | Sender address |
| `SMTP_USE_TLS` | No | Default `true` |

Without SMTP, email endpoints run in mock mode (PDF generated, logged to console).

## Deployment

- **Backend**: Railway, Render, or any Python host. Use `backend/Procfile`: `web: uvicorn api.main:app --host 0.0.0.0 --port $PORT`
- **Frontend**: Vercel (`frontend/vercel.json` included) — configure API rewrites to your backend.

## Tests

```bash
source .venv/bin/activate
pytest -q
```

## Notes

- Pose scores and injury risk are **heuristic demos**, not medical advice.
- Outputs land in `output/` and `backend/data/health_intel.sqlite`.
