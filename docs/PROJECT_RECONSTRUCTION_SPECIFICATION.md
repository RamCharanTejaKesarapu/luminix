# 🏛️ Luminix — Master System Specification & Reconstruction Blueprint

> **Complete architectural inventory and reconstruction manual for the Luminix AI Health Intelligence & Biomechanics Platform.**  
> *Use this document as an authoritative blueprint to reconstruct the entire application from scratch.*

---

## 📑 Table of Contents
1. [Executive Summary & System Architecture](#1-executive-summary--system-architecture)
2. [Complete Technology Stack & Dependencies](#2-complete-technology-stack--dependencies)
3. [Full Project File Tree & Directory Layout](#3-full-project-file-tree--directory-layout)
4. [Environment Configuration (`.env`)](#4-environment-configuration-env)
5. [Database Architecture & Data Models](#5-database-architecture--data-models)
6. [Backend Modules & Functional Capabilities](#6-backend-modules--functional-capabilities)
   - 6.1 [Security Firewall & WAF Engine (`backend/auth/firewall.py`)](#61-security-firewall--waf-engine)
   - 6.2 [Authentication & OAuth 2.0 Engine (`backend/auth/` & `backend/api/auth_routes.py`)](#62-authentication--oauth-20-engine)
   - 6.3 [Database Persistence & Migration (`backend/database/db.py`)](#63-database-persistence--migration)
   - 6.4 [Nutrition & Metabolic Intelligence Engine (`backend/nutrition_module/`)](#64-nutrition--metabolic-intelligence-engine)
   - 6.5 [Gym Performance & Workout Generator (`backend/gym_module/`)](#65-gym-performance--workout-generator)
   - 6.6 [Pose Analysis & Computer Vision Engine (`backend/pose_module/`)](#66-pose-analysis--computer-vision-engine)
   - 6.7 [Yoga Knowledge Base & Biomechanical Alignment (`backend/pose_module/yoga_poses.py`)](#67-yoga-knowledge-base--biomechanical-alignment)
   - 6.8 [Cooking & Smart Pantry Recipe Engine (`backend/cooking_module/`)](#68-cooking--smart-pantry-recipe-engine)
   - 6.9 [Multimodal AI, Reporting, PDF & Email Services (`backend/analysis_module/`)](#69-multimodal-ai-reporting-pdf--email-services)
   - 6.10 [Cross-Discipline Suggestion Engine (`backend/suggestion_engine/`)](#610-cross-discipline-suggestion-engine)
   - 6.11 [Automated Video Briefing Studio (`backend/video_module/`)](#611-automated-video-briefing-studio)
   - 6.12 [FastAPI Server Entry Point & REST API Registry (`backend/api/main.py`)](#612-fastapi-server-entry-point--rest-api-registry)
7. [Frontend Architecture & Subsystems](#7-frontend-architecture--subsystems)
   - 7.1 [Design System & Typography Matrix (`styles.css`, `index.html`)](#71-design-system--typography-matrix)
   - 7.2 [Authentication Gate & Profile Modal (`auth.html`, `auth.js`)](#72-authentication-gate--profile-modal)
   - 7.3 [Editorial Dashboard ("The System") (`app.js`)](#73-editorial-dashboard-the-system)
   - 7.4 [Live Vision & Pose Tracking Studio (`app.js`)](#74-live-vision--pose-tracking-studio)
   - 7.5 [Gym Camera Rep Counter & Workout Station (`gym.js`)](#75-gym-camera-rep-counter--workout-station)
   - 7.6 [Yoga Guidance Studio with Hold Timer (`yoga.js`)](#76-yoga-guidance-studio-with-hold-timer)
   - 7.7 [Metabolic Intelligence & BMI Calculator (`nutrition.js`)](#77-metabolic-intelligence--bmi-calculator)
   - 7.8 [Daily Food Tracker, Water Log & AI Scanner (`nutrition.js`)](#78-daily-food-tracker-water-log--ai-scanner)
   - 7.9 [Luna AI Health Assistant Chatbot (`app.js`)](#79-luna-ai-health-assistant-chatbot)
   - 7.10 [Clinical Report Export & Video Briefing Hub (`app.js`)](#710-clinical-report-export--video-briefing-hub)
8. [Complete REST API Reference](#8-complete-rest-api-reference)
9. [Step-by-Step Reconstruction & Deployment Manual](#9-step-by-step-reconstruction--deployment-manual)

---

## 1. Executive Summary & System Architecture

Luminix is an intelligent, full-stack health intelligence and biomechanics platform. It combines real-time browser computer vision (MediaPipe Pose), clinical metabolic calculations, adaptive workout planning, yoga alignment checking, multimodal Google Gemini AI, and an active Web Application Firewall (WAF).

```
┌────────────────────────────────────────────────────────────────────────┐
│                        LUMINIX FRONTEND SPA                            │
│  Vanilla HTML5 / ES6 JavaScript / CSS3 (Swiss Editorial Design)        │
│  Tailwind CSS (utility classes) + Space Grotesk / Inter / Instrument   │
│  MediaPipe Pose CDN (60 FPS) + Three.js + Web Audio / Speech           │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / REST / JSON + Bearer JWT
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    LUMINIX SECURITY FIREWALL (WAF)                     │
│  Starlette Middleware: SQLi, XSS, Path Traversal & Command Injection  │
│  Sliding-Window IP Rate Limiter (15 auth/min, 150 api/min)             │
│  OWASP Security Headers (X-Frame-Options, X-Content-Type, CSP)         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        FASTAPI BACKEND ENGINE                          │
│                                                                        │
│  ├── /auth/           JWT Auth, Passwords (Bcrypt), OAuth 2.0 Flows    │
│  ├── /database/       SQLAlchemy 2.0 ORM + SQLite Auto-Migration       │
│  ├── /nutrition/      Mifflin-St Jeor / Harris-Benedict + 7-Day Plans  │
│  ├── /gym/            Categorized Splits, Exercises & Daily Generator  │
│  ├── /pose/           MediaPipe BlazePose, Angle Math & Random Forest  │
│  ├── /cooking/        Pantry Ingredients Normalization & Recipe Match  │
│  ├── /analysis/       Google Gemini AI + fpdf2 PDF + SMTP/SendGrid     │
│  ├── /video/          Matplotlib Charts + gTTS + MoviePy MP4 Video     │
│  └── /suggestion/     Cross-Discipline Health Coaching Engine          │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
           ┌────────────────────────┴────────────────────────┐
           ▼                                                 ▼
┌──────────────────────┐                         ┌───────────────────────┐
│ LOCAL PERSISTENCE    │                         │ EXTERNAL INTEGRATIONS │
│ SQLite Database      │                         │ • Google Gemini AI    │
│ Generated PDF/Videos │                         │ • Google OAuth 2.0    │
│ Client LocalStorage  │                         │ • GitHub OAuth 2.0    │
└──────────────────────┘                         │ • SendGrid / SMTP     │
                                                 └───────────────────────┘
```

---

## 2. Complete Technology Stack & Dependencies

### Backend Dependencies (`requirements.txt`)
```txt
fastapi>=0.110
uvicorn[standard]>=0.27
python-multipart>=0.0.9
pydantic>=2.6
python-dotenv>=1.0
numpy>=1.26
opencv-python-headless>=4.9
mediapipe>=0.10.14
google-generativeai>=0.8.0
sqlalchemy>=2.0
streamlit>=1.33
matplotlib>=3.8
moviepy>=2.0
gtts>=2.5
pillow>=10.0
scikit-learn>=1.4
fpdf2>=2.7
bcrypt>=4.1
python-jose[cryptography]>=3.3
httpx>=0.27
email-validator>=2.1
```

### Frontend Dependencies (Loaded via CDN)
- **Tailwind CSS Play CDN**: Utility grid and typography styling
- **Google Fonts**: `Space Grotesk` (headings), `Inter` (body), `Instrument Serif` & `Cormorant Garamond` (editorial italic serif), `Fragment Mono` (technical telemetry)
- **MediaPipe Pose CDN (`@mediapipe/pose`)**: BlazePose 33-point real-time pose tracking
- **MediaPipe Camera Utils (`@mediapipe/camera_utils`)**: Camera stream frame grabber
- **MediaPipe Drawing Utils (`@mediapipe/drawing_utils`)**: Canvas joint and bone visualizer
- **Three.js (`three.min.js`)**: 3D spatial anchor canvas rendering

---

## 3. Full Project File Tree & Directory Layout

```
luminix/
├── .env                              # Active environment variables (git-ignored)
├── .env.example                      # Template of all environment variables
├── requirements.txt                  # Python dependencies
├── Procfile                          # Deployment web start command
├── README.md                         # Quickstart documentation
├── pytest.ini                        # Pytest config
│
├── backend/
│   ├── Procfile                      # Backend deployment procfile
│   ├── pytest.ini                    # Pytest settings
│   ├── api/
│   │   ├── __init__.py
│   │   ├── auth_routes.py            # Login, register, OAuth, profile, firewall APIs
│   │   └── main.py                   # FastAPI server entrypoint, middleware, route registry
│   ├── auth/
│   │   ├── __init__.py
│   │   ├── firewall.py               # SecurityFirewall WAF & rate-limiting middleware
│   │   ├── jwt_utils.py              # JWT creation and decoding (HS256)
│   │   ├── oauth.py                  # Google & GitHub OAuth 2.0 flow & dev mock fallbacks
│   │   └── passwords.py              # Bcrypt password hashing & verification
│   ├── database/
│   │   ├── __init__.py
│   │   └── db.py                     # SQLite schema, SQLAlchemy models, auto-migration
│   ├── nutrition_module/
│   │   ├── __init__.py
│   │   ├── bmi_bmr.py                # BMI, Mifflin-St Jeor, Harris-Benedict, TDEE, macros
│   │   ├── meal_planner.py           # 7-day meal plan generator by diet
│   │   └── schemas.py                # UserHealthProfile Pydantic schema and enums
│   ├── gym_module/
│   │   ├── __init__.py
│   │   └── exercises.py              # Categorized gym workouts & daily routine generator
│   ├── pose_module/
│   │   ├── __init__.py
│   │   ├── angle_calculation.py      # Joint angles, spine vertical deviation, lateral tilt
│   │   ├── pose_detection.py         # MediaPipe BlazePose processor
│   │   ├── posture_classifier.py     # Synthetic RandomForest posture quality classifier
│   │   ├── video_analyzer.py         # Video batch processor, risk scorer & frame previewer
│   │   ├── webcam_demo.py            # Standalone OpenCV webcam demo utility
│   │   └── yoga_poses.py             # 17 yoga poses library with target angles & cues
│   ├── cooking_module/
│   │   ├── __init__.py
│   │   └── recipes.py                # Pantry ingredient normalization & recipe suggester
│   ├── analysis_module/
│   │   ├── __init__.py
│   │   ├── gemini_integration.py     # Multi-model Gemini client (chat, nutrition, chef, script)
│   │   ├── report_generator.py       # Unified health report builder (JSON + human text)
│   │   ├── pdf_export.py             # fpdf2 PDF report builder
│   │   └── email_service.py          # SendGrid & SMTP email sender with PDF attachment
│   ├── suggestion_engine/
│   │   ├── __init__.py
│   │   └── engine.py                 # Cross-discipline suggestions (biomechanics + diet)
│   ├── video_module/
│   │   ├── __init__.py
│   │   ├── script_generator.py       # Spoken narration script builder
│   │   └── video_creator.py          # MoviePy + Matplotlib + gTTS automated MP4 video creator
│   └── data/
│       └── health_intel.sqlite       # SQLite persistent database file
│
├── frontend/
│   ├── index.html                    # Main Single Page Application shell
│   ├── auth.html                     # Standalone authentication fallback view
│   ├── styles.css                    # Swiss Editorial & Cinematic Design System (1900+ lines)
│   ├── app.js                        # Primary SPA controller, dashboard, live pose, Luna, export
│   ├── auth.js                       # Auth state manager, profile modal, JWT sync
│   ├── gym.js                        # Gym workout view, exercise library, camera rep counter
│   ├── yoga.js                       # Yoga library, pose criteria, camera hold timer
│   ├── nutrition.js                  # BMI calculator, daily food tracker, weekly planner, recipes
│   ├── manifest.json                 # Web App Manifest for mobile PWA installation
│   ├── vercel.json                   # Static frontend deployment and proxy rewrite configuration
│   ├── images/                       # Desktop and mobile reveal images
│   └── assets/                       # Brand artwork and icons
│
├── docs/
│   ├── OAUTH_FIREWALL_GUIDE.md       # OAuth & Firewall operational manual
│   └── PHASE-01-UI-UX.md             # UI/UX design architecture notes
│
├── sample_data/
│   └── user_profile.json             # Sample test user profile payload
│
├── tests/
│   ├── conftest.py
│   └── test_bmi.py                   # Pytest test suite for nutrition and recipes
│
└── output/                           # Auto-created directory for generated PDFs and MP4 videos
```

---

## 4. Environment Configuration (`.env`)

```ini
# ── Core Platform Configuration ──
JWT_SECRET_KEY=change-me-to-a-long-random-string-at-least-64-chars
JWT_EXPIRE_HOURS=72
FRONTEND_URL=http://127.0.0.1:8000
OAUTH_REDIRECT_BASE=http://127.0.0.1:8000

# ── Google Gemini AI (Optional — Enables Luna Chat, AI Food Scanner & Chef) ──
# Key available from https://aistudio.google.com/apikey
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.6-flash

# ── Google OAuth 2.0 (Optional — Enables Real Google Sign-In) ──
# Callback URL: http://127.0.0.1:8000/v1/auth/google/callback
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# ── GitHub OAuth 2.0 (Optional — Enables Real GitHub Sign-In) ──
# Callback URL: http://127.0.0.1:8000/v1/auth/github/callback
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# ── Transactional Email: SMTP (Optional — Falls back to mock mode) ──
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=Luminix Health <noreply@luminix.com>
SMTP_USE_TLS=true

# ── Transactional Email: SendGrid (Optional — Preferred over SMTP) ──
SENDGRID_API_KEY=
SENDGRID_FROM=
```

---

## 5. Database Architecture & Data Models

Database engine: **SQLite** via **SQLAlchemy 2.0** located at `backend/data/health_intel.sqlite`. Includes automated schema migration that injects missing columns on startup.

### 1. `users` Table
Persists authenticated accounts across email registration and OAuth providers.
- `id` (INTEGER, Primary Key, Auto-increment)
- `created_at` (DATETIME, UTC timestamp)
- `last_login` (DATETIME, UTC timestamp of latest activity)
- `email` (VARCHAR(255), Unique, Indexed, Case-insensitive)
- `name` (VARCHAR(255), Full name or username)
- `password_hash` (VARCHAR(255), Nullable for OAuth users, Bcrypt hash)
- `provider` (VARCHAR(32), `'email'`, `'google'`, or `'github'`)
- `provider_id` (VARCHAR(255), Indexed external OAuth user ID)
- `avatar_url` (VARCHAR(512), Picture URL or DiceBear avatar)
- `bio` (VARCHAR(512), Member bio / notes)
- `profile_data` (JSON, Biometric preferences, goals, and OAuth metadata)

### 2. `progress_events` Table
Chronological log of wellness and workout sessions.
- `id` (INTEGER, Primary Key, Auto-increment)
- `created_at` (DATETIME, UTC timestamp)
- `user_label` (VARCHAR(128), User identifier)
- `bmi` (FLOAT, Calculated BMI metric)
- `pose_score` (FLOAT, Posture/movement quality score 0-100)
- `payload` (JSON, Detailed session telemetry, video path, or corrections)

### 3. `security_logs` Table
Audit trail for the Security Firewall and Rate Limiter.
- `id` (INTEGER, Primary Key, Auto-increment)
- `created_at` (DATETIME, UTC timestamp, Indexed)
- `client_ip` (VARCHAR(64), Indexed IP address)
- `event_type` (VARCHAR(64), e.g. `'rate_limit'`, `'sqli_blocked'`, `'xss_blocked'`, `'path_traversal'`, `'bad_user_agent'`, `'auth_failure'`, `'auth_success'`)
- `path` (VARCHAR(255), Target request URL path)
- `method` (VARCHAR(16), HTTP method: GET, POST, PUT, DELETE)
- `status_code` (INTEGER, HTTP response status: 200, 401, 403, 429)
- `details` (TEXT, Matched signature details or rate-limit violation summary)

---

## 6. Backend Modules & Functional Capabilities

### 6.1 Security Firewall & WAF Engine
- **Location**: `backend/auth/firewall.py`
- **Architecture**: Starlette `BaseHTTPMiddleware` executing on every HTTP request.
- **Threat Signatures**:
  - **SQL Injection**: Checks query and path for `UNION SELECT`, `information_schema`, `1=1` tautologies, `DROP/TRUNCATE TABLE`, `SLEEP()`, `BENCHMARK()`, and SQL comment dashes (`--`, `/* */`).
  - **Cross-Site Scripting (XSS)**: Flags `<script>`, `javascript:`, DOM event handlers (`onload=`, `onerror=`), `<iframe>`, and SVG injection.
  - **Directory Traversal**: Flags `../`, `..\`, `/etc/passwd`, `/etc/shadow`, `/proc/self/environ`.
  - **Command Injection**: Flags shell pipes (`|`, `;`, `&&`) combined with utilities (`curl`, `wget`, `nc`, `bash`, `rm`).
  - **Malicious Scanners**: Blocks known automated attack tools by User-Agent (`sqlmap`, `nikto`, `acunetix`, `dirbuster`, `gobuster`, `masscan`, `nmap`).
- **Sliding-Window Rate Limiter**:
  - Auth routes (`/v1/auth/login`, `/v1/auth/register`): **15 requests / minute**.
  - General API routes (`/v1/*`): **150 requests / minute**.
  - Violations return `HTTP 429` with `Retry-After` header.
- **OWASP Security Headers**:
  - Injects `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `X-XSS-Protection: 1; mode=block`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(self)`.

### 6.2 Authentication & OAuth 2.0 Engine
- **Location**: `backend/auth/` & `backend/api/auth_routes.py`
- **JWT Authorization**: Signs and decodes bearer tokens using HS256 algorithm with configurable expiration.
- **Email & Password Flow**: User registration and login with Bcrypt password hashing.
- **Google OAuth 2.0**:
  - Generates authorization URL with scopes `openid email profile` and CSRF state token.
  - Exposes `/v1/auth/google/callback` to exchange code for Google token and user info.
  - Syncs user into database using `upsert_oauth_user()` and redirects to frontend with JWT.
- **GitHub OAuth 2.0**:
  - Generates authorization URL with scopes `read:user user:email` and CSRF state token.
  - Exposes `/v1/auth/github/callback` to exchange code for GitHub token and user info.
  - Fallback check against `/user/emails` to capture verified private emails.
- **Developer Mock Login**: If credentials are unset in `.env`, `/v1/auth/google` and `/v1/auth/github` return instant mock user profiles for testing.
- **User Profile Endpoints**: `GET /v1/auth/me` and `PUT /v1/auth/profile` allow updating user biometrics, avatar, and bio.

### 6.3 Database Persistence & Migration
- **Location**: `backend/database/db.py`
- Initializes SQLAlchemy engine and session factory with connection pooling.
- Creates tables if absent and executes SQLite `PRAGMA table_info` migrations to add new columns (`last_login`, `bio`, `profile_data`) dynamically without table rebuilds.
- Exposes helper CRUD functions: `create_user`, `get_user_by_email`, `get_user_by_id`, `upsert_oauth_user`, `update_user_profile`, `log_event`, `recent_events`, `log_security_event`, `get_recent_security_logs`, `get_security_stats`.

### 6.4 Nutrition & Metabolic Intelligence Engine
- **Location**: `backend/nutrition_module/`
- **Schemas (`schemas.py`)**: `UserHealthProfile` with enums for `Gender`, `ActivityLevel`, `FitnessGoal`, and `DietPreference`.
- **Calculations (`bmi_bmr.py`)**:
  - Body Mass Index (BMI) and health classification (Underweight, Normal, Overweight, Obese).
  - Resting metabolic rate via dual formulas: **Mifflin–St Jeor** and **Harris–Benedict (Revised)**.
  - Total Daily Energy Expenditure (TDEE) using physical activity factors (1.2 to 1.9).
  - Target Calorie Calculation: 18% deficit for `fat_loss`, 12% surplus for `muscle_gain`, 100% for `maintenance`.
  - Macronutrient Distribution: Gram and calorie targets for Protein (1.6g-1.9g per kg), Fats (28%-30% of energy), and Carbohydrates (remainder).
  - Micronutrient Deficiency Watchlist: Flags potential gaps based on diet (e.g. B12, Iron, Zinc for vegans/vegetarians; fiber for keto).
  - Healthy Weight Range: Calculates weight boundaries corresponding to BMI 18.5 – 24.9.
- **Weekly Meal Planner (`meal_planner.py`)**:
  - 7-day meal plan generator with distinct recipes for Vegan, Vegetarian, Keto, and Omnivore diets.
  - Generates daily Breakfast, Lunch, Dinner, and Snacks scaled to match the user's daily calorie targets.

### 6.5 Gym Performance & Workout Generator
- **Location**: `backend/gym_module/exercises.py`
- **Exercise Library (`GYM_PLANS`)**:
  - **Chest**: Bench Press, Incline Dumbbell Press, Chest Flyes, Push-ups.
  - **Back**: Pull-ups, Barbell Rows, Lat Pulldown, Face Pulls.
  - **Legs**: Barbell Squats, Romanian Deadlift, Leg Press, Walking Lunges.
  - **Shoulders**: Overhead Press, Lateral Raises, Front Raises, Rear Delt Flyes.
  - **Arms**: Barbell Curls, Tricep Pushdown, Hammer Curls, Skull Crushers.
- **Workout Plan Generators**:
  - `get_gym_plan(category)`: Returns full exercise roster for a specific muscle group.
  - `generate_daily_workout(focus)`: Builds a daily routine (focusing on a single group or a compound Chest + Back + Legs "full" split).

### 6.6 Pose Analysis & Computer Vision Engine
- **Location**: `backend/pose_module/`
- **Pose Detection (`pose_detection.py`)**:
  - Wraps MediaPipe BlazePose to extract 33 normalized landmarks and 3D world landmarks from BGR camera/video frames.
- **Angle Geometry (`angle_calculation.py`)**:
  - `angle_degrees()`: 3-point joint angle vertex calculation (elbows, knees).
  - `vertical_deviation_degrees()`: Calculates deviation of the trunk segment (mid-hip to mid-shoulder) from vertical gravity.
  - `lateral_tilt_degrees()`: Measures shoulder and hip tilt roll vs horizontal plane.
- **Posture ML Classifier (`posture_classifier.py`)**:
  - Scikit-Learn Random Forest classifier trained on 7 geometric angle features.
  - Classifies posture quality into `"good"`, `"fair"`, or `"poor"`.
- **Video File Analyzer (`video_analyzer.py`)**:
  - Ingests MP4/MOV video files, samples frames with configurable stride, calculates frame form scores (0-100), and computes `mean_pose_score`, `injury_risk_score`, and `imbalance_score`.
  - Identifies the worst-scoring frame and saves an annotated preview JPEG with issue overlays into `output/pose_previews/`.
- **Browser Landmark Risk Check (`POST /v1/pose-analysis`)**:
  - Analyzes landmarks streamed from the browser and flags spinal flexion when shoulders drop below hips.

### 6.7 Yoga Knowledge Base & Biomechanical Alignment
- **Location**: `backend/pose_module/yoga_poses.py`
- **17 Curated Yoga Asanas**:
  - Downward Facing Dog, Warrior I, Warrior II, Tree Pose, Cobra Pose, Plank Pose, Triangle Pose, Child's Pose, Bridge Pose, Chair Pose, Pigeon Pose, Boat Pose, Camel Pose, Half Moon Pose, Seated Forward Fold, Revolved Triangle, Corpse Pose.
- **Metadata**: Difficulty classification (Beginner, Intermediate, Advanced), anatomical benefits, execution instructions, and key biomechanical angle targets.

### 6.8 Cooking & Smart Pantry Recipe Engine
- **Location**: `backend/cooking_module/recipes.py`
- **Ingredient Normalizer**: Cleans, trims, and normalizes plural ingredient names.
- **Rule-First Recipe Matching**: Evaluates user ingredients against required "must-have" items and "optional" flavor enhancers.
- **Built-in Recipes**: Tomato Egg Rice Bowl, Quick Veg Fried Rice, Onion Tomato Omelette Wrap, Tomato Onion Salad Bowl.
- **Gemini AI Chef Integration**: Enhances results with an AI-generated chef recipe with prep time, cook time, macros, and step-by-step cooking instructions.

### 6.9 Multimodal AI, Reporting, PDF & Email Services
- **Location**: `backend/analysis_module/`
- **Gemini AI Client (`gemini_integration.py`)**:
  - Manages Google Gemini API calls with fallback model chaining (`gemini-3.6-flash` → `3.7-flash` → `3.5-flash` → `flash-latest`).
  - `luna_chat_gemini()`: Conversational assistant for biomechanics, diet, and recovery.
  - `analyze_food_nutrition_gemini()`: Parses natural language food queries into macros, calories, micronutrients, and a health score.
  - `generate_ai_recipe_gemini()`: Builds custom recipes from pantry ingredients.
  - `combined_health_insights_blob()`: Generates executive health narrative for combined reports.
- **Report Generator (`report_generator.py`)**:
  - Combines User Profile, Nutrition Anthropometrics, 7-Day Meal Plan, Pose Telemetry, Health Risk Indicators, and Gemini Insights into `CombinedHealthReport` (both JSON and human-readable text).
- **PDF Export Service (`pdf_export.py`)**:
  - Uses `fpdf2` to construct branded, multi-page vector PDF reports with body metrics, 7-day meal schedules, workouts, and pose findings.
- **Email Service (`email_service.py`)**:
  - Delivers PDF reports via **SendGrid API** (JSON payload with base64 PDF) or **SMTP** (RFC 5322 MIME with STARTTLS).
  - Includes a console mock logger when neither is configured.

### 6.10 Cross-Discipline Suggestion Engine
- **Location**: `backend/suggestion_engine/engine.py`
- Rules engine synthesizing biomechanical imbalances with nutritional goals.
- Injects form correction cues, load reduction advisories, peri-workout carb timing, calorie deficit protein protection, hydration benchmarks, and sleep recovery targets.

### 6.11 Automated Video Briefing Studio
- **Location**: `backend/video_module/`
- **Script Generator (`script_generator.py`)**: Synthesizes report data into a spoken script for text-to-speech without markdown artifacts.
- **Video Creator (`video_creator.py`)**:
  - Uses Google Text-to-Speech (`gTTS`) to synthesize narration audio.
  - Generates Matplotlib chart stills: Target Macro Split Bar Chart and Horizontal BMI Marker Gauge.
  - Uses MoviePy to composite title cards, charts, optional pose preview stills, and audio voiceover into an H.264/AAC MP4 video saved to `output/luminix_explainer.mp4`.

### 6.12 FastAPI Server Entry Point & REST API Registry
- **Location**: `backend/api/main.py`
- Configures FastAPI app, CORS middleware, SecurityFirewallMiddleware, and static file mounting (`/static`, `/assets`, `/images`).
- Registers all auth, nutrition, gym, yoga, pose, cooking, export, and video routes.

---

## 7. Frontend Architecture & Subsystems

### 7.1 Design System & Typography Matrix
- **Files**: `frontend/styles.css`, `frontend/index.html`
- **Design Aesthetic**: International / Swiss Editorial Engineering.
- **Palette**:
  - Canvas Alabaster: `#F4F2EB` (Warm editorial paper background)
  - Surface Tints: `#EDEBE4`, `#FAF8F2`, `#FFFFFF`
  - Ink Typography: `#111111` (Deep black with high contrast)
  - Secondary Text: `#555555`, `#777777`
  - Electric Blue Accent: `#2F4DFF` (Primary actions, brand identity)
  - Semantic Colors: Amber Yellow `#FFC400`, Cyan `#00B8D9`, Emerald `#10B981`, Red `#EF4444`
- **Typography Matrix**:
  - Display / Headings: `Space Grotesk`
  - Editorial Accents: `Instrument Serif` & `Cormorant Garamond` (Italic serif)
  - Body Copy: `Inter`
  - Technical Data & Telemetry: `Fragment Mono`
- **Layout Grid**: 12-column responsive layout grid with engineering gridlines, subtle custom cursor follower, floating top navigation, and mobile bottom dock.

### 7.2 Authentication Gate & Profile Modal
- **Files**: `frontend/auth.html`, `frontend/auth.js`
- **Auth Guard**: Unauthenticated visitors are restricted to the login gate; platform modules unlock upon sign-in.
- **Authentication Features**:
  - Tabbed interface for Email Sign In and User Registration.
  - One-click Google OAuth 2.0 and GitHub OAuth 2.0 buttons with live status badges.
  - Parses incoming JWT tokens from redirect callbacks (`/?token=...`).
  - Active Firewall shield indicator badge.
- **User Profile Modal**:
  - Accessible via the profile button in the top navigation bar.
  - Displays user avatar, name, email, auth provider tag, member join date, and last active time.
  - Live Security Firewall card displaying total requests inspected, threats blocked, and rate-limited incidents.

### 7.3 Editorial Dashboard ("The System")
- **File**: `frontend/app.js` (`renderDashboard`)
- **Hero Section**: High-impact editorial typographic banner with animated rotating circular SVG badge and platform metadata.
- **System Index**: 12-column interactive catalog of all platform modules with direct jump links and status indicators.
- **Architectural Flow Visualization**: Interactive node graph mapping user telemetry from Video Capture → Pose Extraction → Anthropometrics → Gemini AI → Clinical Output.
- **Live Biometric Telemetry Preview**: Real-time snapshot cards displaying active BMI, target daily calories, pose accuracy index, and workout split.

### 7.4 Live Vision & Pose Tracking Studio
- **File**: `frontend/app.js` (`renderLivePose`)
- Accesses user webcam via `navigator.mediaDevices.getUserMedia` with front/rear camera toggle and mirror flip controls.
- Runs MediaPipe Pose in the browser at up to 60 FPS.
- Dual canvas renderer displaying camera stream and overlaid colored skeleton vectors.
- **Biomechanical HUD**:
  - Form Alignment Score percentage (0-100%).
  - Posture label (`Optimal Alignment`, `Spine Deviating`, `Shoulder Imbalance`).
  - Toggleable joint angle degree overlays on elbows, knees, spine, and shoulders.
  - Live FPS counter, session timer, and alert counter.
- Visual and audio warning overlay triggered when spinal flexion or dangerous posture is held.

### 7.5 Gym Camera Rep Counter & Workout Station
- **File**: `frontend/gym.js`
- Muscle category selector for Chest, Back, Legs, Shoulders, Arms, and Core.
- **AI Camera Tracking Mode**:
  - Automated 5-phase rep state machine: `waiting_start` → `primed` → `moving` → `inflection (peak contraction)` → `returning`.
  - Increments completed reps only upon achieving full range of motion.
  - Form quality feedback indicator (`Good Form`, `Uneven Speed`, `Incomplete Extension`).
- **Visual Guide Mode**: Detailed exercise instructions, target muscle groups, tempo recommendations, and set/rep targets.
- **Set & Rest Timer**: Tracks current set against target sets, and triggers an automated rest interval timer (e.g. 60 seconds) with progress bar and audible chime upon completing a set.

### 7.6 Yoga Guidance Studio with Hold Timer
- **File**: `frontend/yoga.js`
- 17-pose catalog filterable by difficulty (All, Beginner, Intermediate, Advanced) displaying anatomical benefits and key angles.
- **AI Pose Matching Engine**:
  - Compares camera landmarks against defined biomechanical joint angle criteria (e.g. front knee flexion 80°-100°, arms horizontal 160°-180°, spine incline < 20° for Warrior II).
  - Displays real-time green/red checklist for each anatomical requirement.
- **Hold Duration Timer**:
  - Counts hold seconds (e.g. 10s–15s hold required) only while the user satisfies all pose criteria.
  - Automatically resets if alignment is lost before target duration is reached.
  - Increments pose reps upon successful completion.

### 7.7 Metabolic Intelligence & BMI Calculator
- **File**: `frontend/nutrition.js` (`renderBMIView`)
- Anthropometric input form: Age, Gender, Height, Weight, Activity Level, Fitness Goal, Diet Preference, and Units (Metric: kg/cm vs Imperial: lbs/in).
- **Metabolic Readout**:
  - Calculated BMI with visual gauge pointer and classification badges (`Underweight`, `Normal`, `Overweight`, `Obese`).
  - Dual BMR values (Mifflin-St Jeor and Harris-Benedict).
  - Total Daily Energy Expenditure (TDEE).
  - Target Caloric Intake adjusted for goal.
- **Macronutrient Breakdown**: Visual progress bars and exact gram/kcal targets for Protein, Carbohydrates, and Fats.
- **Micronutrient Watchlist & Healthy Weight Boundaries**: Tailored dietary warnings and healthy weight range in kg.
- **BMI History Tracking Table**: Records calculation timestamps, body weight, BMI score, and category to local storage.

### 7.8 Daily Food Tracker, Water Log & AI Scanner
- **File**: `frontend/nutrition.js` (`renderFoodTrackerView`)
- Date picker with calendar navigation and persistent daily food logs in local storage.
- Macro progress bars showing daily consumed calories, protein, carbs, and fats against calculated targets.
- Hydration tracker with glass incrementer (+250ml) tracking daily water intake.
- Categorized meal sections for Breakfast, Lunch, Dinner, and Snacks.
- **Verified Food Database**: 30+ verified food items with instant gram scaling and automatic macro additions.
- **Gemini AI Natural Language Food Scanner**: Text input accepts meal descriptions (e.g. "two chicken tacos with guacamole and a diet coke"), queries the backend to extract calories, macros, micronutrients, and a health score, and logs it directly.
- **Weekly Meal Planner Tab**: View full 7-day meal schedules tailored to the user's diet and caloric target.
- **Recipe Finder & AI Chef Tab**: Search rule-based recipes or generate an instant AI Chef recipe with step-by-step cooking instructions.

### 7.9 Luna AI Health Assistant Chatbot
- **File**: `frontend/app.js` (`renderLuna`)
- Chat stream with user/assistant speech bubbles, timestamps, and typing indicator.
- Markdown parser supporting bold headings, numbered lists, bullet points, and code blocks.
- Quick-click prompt suggestions (e.g. "Calculate my protein targets", "Fix my squat form", "Best yoga poses for back pain").
- Connected to `/v1/luna/chat` utilizing Gemini 3.6 Flash with fallback to built-in rule heuristics.

### 7.10 Clinical Report Export & Video Briefing Hub
- **File**: `frontend/app.js` (`renderExport`)
- **Download PDF Report**: Triggers `/v1/export/pdf` to immediately generate and download a multi-page vector PDF with user biometrics, 7-day meal plan, and workout splits.
- **Email Report Directly**: Input email address to send the PDF report as an attachment via SendGrid or SMTP.
- **Generate AI Video Briefing**: Triggers `/v1/video/generate` to assemble the text-to-speech script, Matplotlib charts, and video clips into an MP4 file available via `/download/video`.

---

## 8. Complete REST API Reference

| Method | Endpoint | Description | Request Payload | Response |
|---|---|---|---|---|
| **GET** | `/` | Serves main frontend SPA | None | HTML file (`index.html`) |
| **GET** | `/auth` | Serves auth gate view | None | HTML file (`auth.html`) |
| **GET** | `/health` | Health check & system status | None | `{ status, firewall_active, gemini_configured, ... }` |
| **GET** | `/manifest.json` | Web application manifest | None | JSON manifest |
| **POST** | `/v1/auth/register` | Register new account | `{ email, password, name }` | `{ access_token, token_type, user }` |
| **POST** | `/v1/auth/login` | Sign in account | `{ email, password }` | `{ access_token, token_type, user }` |
| **GET** | `/v1/auth/me` | Fetch active user profile | Header: `Bearer <token>` | `{ user }` |
| **PUT** | `/v1/auth/profile` | Update user profile | `{ name, bio, avatar_url, profile_data }` | `{ status, user }` |
| **POST** | `/v1/auth/logout` | Sign out user | None | `{ status, message }` |
| **GET** | `/v1/auth/google/login` | Google OAuth redirect | None | HTTP 307 Redirect |
| **GET** | `/v1/auth/google/callback` | Google OAuth callback | Query: `code`, `state` | HTTP 307 Redirect to `/?token=...` |
| **POST** | `/v1/auth/google` | Dev mock Google login | None | `{ access_token, token_type, user }` |
| **GET** | `/v1/auth/github/login` | GitHub OAuth redirect | None | HTTP 307 Redirect |
| **GET** | `/v1/auth/github/callback` | GitHub OAuth callback | Query: `code`, `state` | HTTP 307 Redirect to `/?token=...` |
| **POST** | `/v1/auth/github` | Dev mock GitHub login | None | `{ access_token, token_type, user }` |
| **GET** | `/v1/auth/firewall/status`| Get WAF & rate-limit stats | None | `{ firewall_active, total_threats_blocked, ... }` |
| **GET** | `/v1/auth/firewall/logs` | Inspect recent security logs| Query: `limit` (default 50)| `[ { id, client_ip, event_type, ... } ]` |
| **POST** | `/v1/nutrition/metrics` | Calculate BMI & macros | `UserHealthProfile` JSON | `{ bmi, bmr_mifflin, tdee, macros, ... }` |
| **POST** | `/v1/nutrition/metrics-and-plan`| Calculate metrics + 7-day plan| `UserHealthProfile` JSON | `{ anthropometrics, meal_plan }` |
| **POST** | `/v1/nutrition/weekly-plan`| Build full 7-day meal plan | `UserHealthProfile` JSON | `{ anthropometrics, weekly_plan }` |
| **POST** | `/v1/nutrition/ai-food-analysis`| Gemini natural food parser | `{ food_query }` | `{ success, analysis, source }` |
| **POST** | `/v1/generate-plan` | Combined daily plan generator | `{ profile, use_gemini }` | `{ anthropometrics, meal_plan, gym_plan, report }` |
| **POST** | `/v1/cook/suggest` | Pantry recipe suggester + AI | `{ ingredients, diet_preference, limit }` | `{ available, best, recipes, ai_recipe }` |
| **POST** | `/v1/pose/analyze-video` | Video batch pose analysis | Multipart: `file`, `stride`, `max_frames` | `VideoPoseReport` JSON |
| **POST** | `/v1/pose-analysis` | Browser landmark risk check | `{ landmarks, video_path }` | `{ risky, score, feedback, injury_risk_proxy }` |
| **GET** | `/v1/gym/categories` | List gym muscle categories | None | `{ categories: ['Chest', 'Back', ...] }` |
| **GET** | `/v1/gym/plan/{category}` | Fetch exercises for category| None | `{ category, exercises }` |
| **GET** | `/v1/gym-plan` | Daily gym plan generator | Query: `focus` (default "full") | `{ category, exercises, type }` |
| **GET** | `/v1/yoga/poses` | Yoga pose library | None | `{ poses: [ { name, difficulty, ... } ] }` |
| **POST** | `/v1/luna/chat` | Luna AI assistant chat | `{ message, user_context }` | `{ reply, source, model }` |
| **POST** | `/v1/report/combined` | Build unified report | `{ profile, pose, use_gemini }` | `{ report_json, report_human, gemini }` |
| **POST** | `/v1/report/combined-with-upload` | Video upload + report | Multipart: `file`, `profile_json`, `use_gemini` | `{ report_json, report_human, gemini, pose }` |
| **POST** | `/v1/report/export-pdf` | Download clinical PDF report| `{ ...reportData }` | PDF File (`luminix_report.pdf`) |
| **GET** | `/v1/report/export-pdf` | Download sample PDF report | None | PDF File (`luminix_report.pdf`) |
| **POST** | `/v1/export/pdf` | Frontend direct PDF export | None | PDF File (`luminix_health_report.pdf`) |
| **POST** | `/v1/report/send-email` | Email report to address | `{ email, report }` | `{ status, message }` |
| **POST** | `/v1/email-report` | Frontend direct email dispatch| `{ email, profile }` | `{ sent, message }` |
| **POST** | `/v1/video/generate` | Generate animated MP4 video| `{ report, human_text, prefer_gemini_script }` | `{ video_path, script }` |
| **GET** | `/download/video` | Download generated MP4 video| None | Video File (`luminix_explainer.mp4`) |
| **POST** | `/v1/progress/log` | Record progress log entry | `{ user_label, bmi, pose_score, payload }` | `{ status, message }` |
| **GET** | `/v1/progress/recent` | Fetch historical progress | Query: `limit` (default 20)| `{ items: [ ... ] }` |

---

## 9. Step-by-Step Reconstruction & Deployment Manual

Follow these exact steps to rebuild and run the project from scratch in a fresh environment:

### Step 1: Initialize Project Directory Structure
```bash
mkdir -p luminix/{backend/{api,auth,database,nutrition_module,gym_module,pose_module,cooking_module,analysis_module,suggestion_engine,video_module,data},frontend/{assets,images},docs,sample_data,tests,output}
cd luminix
```

### Step 2: Set Up Python Virtual Environment & Install Dependencies
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

### Step 3: Configure Environment Variables
Copy the template and fill in your keys:
```bash
cp .env.example .env
```
Ensure `JWT_SECRET_KEY` is set to a secure string. Set `GEMINI_API_KEY` to enable AI capabilities.

### Step 4: Start the Application Server
Run the Uvicorn ASGI server from the `backend/` directory:
```bash
cd backend
uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
```

### Step 5: Verification & Testing
1. **Access the Web Interface**: Navigate to `http://127.0.0.1:8000/`. The backend serves the frontend automatically.
2. **Verify System Health**: Query `http://127.0.0.1:8000/health` to confirm the firewall, database, and integrations are active.
3. **Interactive API Documentation**: Explore and test endpoints via Swagger UI at `http://127.0.0.1:8000/docs`.
4. **Run Unit Tests**:
   ```bash
   pytest -q
   ```

---

*This document serves as the master blueprint for the Luminix platform.*
