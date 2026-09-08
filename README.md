<div align="center">

# ⛩️ L U M I N I X
### Autonomous Client-Side Biomechanical Intelligence & Health Sanctuary

[![Python](https://img.shields.io/badge/Python-3.10%2B-blue.svg?logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100%2B-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![MediaPipe](https://img.shields.io/badge/Vision-MediaPipe%20WASM-FF6F00.svg?logo=google&logoColor=white)](https://developers.google.com/mediapipe)
[![Three.js](https://img.shields.io/badge/3D%20Graphics-Three.js%20WebGL-black.svg?logo=three.js&logoColor=white)](https://threejs.org)
[![Google Gemini](https://img.shields.io/badge/AI%20Intelligence-Google%20Gemini-8E75C2.svg?logo=google-gemini&logoColor=white)](https://deepmind.google/technologies/gemini/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Security: Hardened](https://img.shields.io/badge/Security-Argon2id%20%7C%20WAF-red.svg)](docs/SECURITY_AUTH_AUDIT.md)

<p align="center">
  <b>A zero-latency, private, client-side biomechanics telemetry platform merging ancient Kyoto temple aesthetics with mathematical kinematics and multi-model AI.</b>
</p>

[Explore Features](#-key-innovations--engineering-breakthroughs) •
[Architecture](#-system-architecture) •
[Quick Start](#-quick-start) •
[API Documentation](#-rest-api-reference) •
[Security & Privacy](#-security--dpdp-compliance) •
[Contributing](#-contributing)

</div>

---

## ⚡ The Vision Behind Luminix

Modern fitness platforms are plagued with predatory paywalls, bloated subscription tiers, and invasive third-party cloud video uploads. 

**Luminix was engineered from the ground up to challenge this paradigm:**
- **100% Client-Side Vision:** Your camera stream never leaves your device. All 33-landmark pose trigonometry and kinematic state transitions are calculated directly in the browser using WebAssembly.
- **Cinematic Aesthetic Direction:** Drawing inspiration from serene Kyoto temple architecture (*Kage*) juxtaposed against raw, relentless physical discipline (*Heavenly Restriction*), Luminix delivers an immersive, distraction-free environment.
- **Multi-Model Intelligence:** Conversational metabolic grounding powered by Google Gemini, paired with instant local fallbacks.
- **Clinical Precision:** Real-time detection of knee valgus, lumbar hyperextension, forward head posture, and joint angle inflection across gym lifts and 17 yoga asanas.

---

## 🌟 Key Innovations & Engineering Breakthroughs

### 1. 👁️ Zero-Lag 60 FPS Client-Side Pose Kinematics
- **33-Point Landmark Math:** Leverages Google MediaPipe WebAssembly for high-throughput landmark extraction directly in the browser canvas.
- **Trigonometric Vector Analysis:** Dot-product joint angle calculation (`calculateAngle`) evaluating hip, knee, ankle, shoulder, and elbow articulations at 60 frames per second.
- **Orthopedic Fault Detectors:**
  - **Knee Valgus (Inward Collapse):** Real-time lateral displacement tracking during squats and deadlifts.
  - **Lumbar Hyperextension:** Real-time torso-to-femur angle monitoring preventing spine injury.
  - **Forward Head Tilt:** Cervical spine angle deviation alert for desk and posture hygiene.
- **Rep Counter & Form Scoring:** Hysteresis-guarded state machine preventing false rep counts.

### 2. ⛩️ Procedural Three.js 3D WebGL World
- **Atmospheric Environment:** Procedural 3D Japanese temple geometry, torii gates, animated lantern point lights with organic flicker, and dynamic scroll choreography.
- **Post-Processing Pipeline:** Custom CRT scanlines, vignette shaders, and Ken Burns kinetic drift.
- **Fluid Typography:** Responsive editorial hierarchy using Space Grotesk, Cormorant Garamond, and Fragment Mono.

### 3. 🧘 17-Asana Yoga Engine & Adaptive Gym Suite
- **Biomechanical Yoga Hold Timer:** Measures joint alignment fidelity and holds state continuously.
- **Targeted Gym Modules:** Squat, deadlift, bench press, overhead press, and pushup tracking with rep inflection detection.
- **Automated Rest Timers:** Vibration and audio chimes signaling rest intervals and set completion.

### 4. 🔮 Conversational AI Companion ("Luna")
- **Biometric Grounding:** Luna's guidance is grounded directly in your session kinematic telemetry, rep velocities, and metabolic metrics.
- **Dietary Macro Partitioning:** Mifflin-St Jeor and Harris-Benedict formulas calibrated to individual body composition.
- **Streaming Markdown Engine:** Real-time conversational AI streaming responses with graceful offline fallback.

### 5. 🛡️ Enterprise Security, Firewall & DPDP Compliance
- **Password Hardening:** Argon2id hashing with automatic fallback to bcrypt and timing-attack mitigation.
- **Dual-Channel Transport:** HttpOnly, SameSite=Lax cookies coupled with Bearer JWT tokens for robust cross-client support.
- **Application Firewall (WAF):** Token-bucket rate limiting per IP/user preventing brute-force and DDoS vectors.
- **Session Revocation:** Incremental `token_version` tracking that invalidates all outstanding JWT sessions upon password reset.
- **Digital Personal Data Protection (DPDP) Act:** Complete one-click account deletion and biometric telemetry erasure.

---

## 🏛️ System Architecture

```
                                  LUMINIX ARCHITECTURE
                                  
  ┌─────────────────────────────────────────────────────────────────────────────┐
  │                           CLIENT BROWSER (SPA)                              │
  │                                                                             │
  │  ┌────────────────────────┐  ┌────────────────────────┐  ┌───────────────┐  │
  │  │   MediaPipe Pose WASM  │  │    Three.js 3D Engine  │  │   UI & Audio  │  │
  │  │   60 FPS Kinematics    │  │    Kyoto Procedural    │  │   Dual Theme  │  │
  │  └───────────┬────────────┘  └────────────────────────┘  └───────┬───────┘  │
  │              │ Vector Angles & Reps                              │          │
  │              ▼                                                   ▼          │
  │  ┌───────────────────────────────────────────────────────────────────────┐  │
  │  │         Biomechanical State Engine (Squats, Lifts, 17 Yoga Poses)     │  │
  │  └───────────────────────────────────┬───────────────────────────────────┘  │
  └──────────────────────────────────────┼──────────────────────────────────────┘
                                         │ JSON Telemetry / REST APIs
                                         ▼
  ┌─────────────────────────────────────────────────────────────────────────────┐
  │                           FASTAPI BACKEND CORE                              │
  │                                                                             │
  │  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────────────────┐  │
  │  │  Firewall & WAF  │  │  JWT & Argon2id  │  │  Gemini AI "Luna" Engine │  │
  │  │  Rate Limiting   │  │  Session Manager │  │  Metabolic Grounding      │  │
  │  └────────┬─────────┘  └────────┬─────────┘  └─────────────┬─────────────┘  │
  │           │                     │                          │                │
  │           ▼                     ▼                          ▼                │
  │  ┌───────────────────────────────────────────────────────────────────────┐  │
  │  │              SQLAlchemy ORM (Users, Sessions, Workouts)               │  │
  │  └──────────────────┬─────────────────────────────────┬──────────────────┘  │
  └─────────────────────┼─────────────────────────────────┼─────────────────────┘
                        │ Local Disk                      │ Cloud Mirror (Optional)
                        ▼                                 ▼
           ┌────────────────────────┐        ┌────────────────────────┐
           │   SQLite Database      │        │ Cloud Firestore & Auth │
           │   Local Privacy Vault  │        │ Encrypted Persistence  │
           └────────────────────────┘        └────────────────────────┘
```

---

## 📂 Repository Layout

```
luminix/
├── assets/                    # Static brand assets, icons, audio sound effects
├── backend/
│   ├── analysis_module/       # Gemini AI integration, email dispatch, PDF engine
│   ├── api/                   # FastAPI main app, authentication routes, endpoints
│   ├── auth/                  # Argon2id/bcrypt passwords, JWT manager, WAF firewall
│   └── database/              # SQLAlchemy models, SQLite persistence, Firebase Admin
├── docs/                      # Technical specifications, security audit, architecture guides
├── frontend/                  # Modern client application
│   ├── assets/                # Audio chimes, high-res posters, cinematic textures
│   ├── app.js                 # Primary UI controllers, creator modal, command palette
│   ├── auth.html & auth.js    # Security gate, Google SSO, password recovery
│   ├── gym.js                 # 60 FPS rep counter, lift state machine, audio cues
│   ├── yoga.js                # 17 Asanas hold tracking, alignment metrics
│   ├── kage_scene.js          # Three.js 3D Kyoto world, procedural lighting
│   ├── companion.html         # Wearable companion & device telemetry bridge
│   ├── index.html             # Single-page application entrypoint
│   └── styles.css             # Comprehensive design tokens, CRT scanlines, layouts
├── tests/                     # Pytest automated test suite (Auth, Security, BMI)
├── .env.example               # Template for environment configuration
├── .gitignore                 # Watertight secret & artifact exclusion rules
├── LICENSE                    # MIT Open Source License
├── requirements.txt           # Python backend dependencies
└── README.md                  # Project documentation
```

---

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/LUNO895/luminix.git
cd luminix
```

### 2. Create and Activate Virtual Environment
```bash
# macOS / Linux
python3 -m venv .venv
source .venv/bin/activate

# Windows
python -m venv .venv
.venv\Scripts\activate
```

### 3. Install Dependencies
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### 4. Configure Environment Variables
```bash
cp .env.example .env
```
*(Optional: Add your `GEMINI_API_KEY` for live AI chat. If left blank, Luminix runs gracefully in offline simulation mode.)*

### 5. Launch the Server
```bash
uvicorn backend.api.main:app --host 127.0.0.1 --port 8000 --reload
```
Open **[http://127.0.0.1:8000](http://127.0.0.1:8000)** in Google Chrome, Edge, or Safari.

> **Note on Camera Access:** Modern web browsers require either `http://localhost`, `http://127.0.0.1`, or a secure `https://` origin to enable webcam permissions for MediaPipe.

---

## 📡 REST API Reference

| Method | Endpoint | Purpose | Security |
|:---|:---|:---|:---|
| **GET** | `/health` | System health, firewall status & service telemetry | Public |
| **POST** | `/v1/auth/register` | Register user profile with Argon2id hashing | Rate Limited |
| **POST** | `/v1/auth/login` | Authenticate and issue JWT Bearer + HttpOnly cookie | Rate Limited |
| **GET** | `/v1/auth/me` | Fetch active user profile and biometric parameters | JWT / Cookie |
| **POST** | `/v1/auth/forgot-password` | Request password reset token | Rate Limited |
| **POST** | `/v1/auth/reset-password` | Reset password & invalidate prior sessions | Public |
| **POST** | `/v1/auth/oauth-sync` | Synchronize Google SSO profiles into local database | Protected |
| **DELETE**| `/v1/auth/delete-account` | Permanent account & personal data erasure (DPDP) | JWT / Cookie |
| **POST** | `/v1/pose-analysis` | Biomechanical kinematic posture heuristics | Public |
| **GET** | `/v1/gym/plan/{category}` | Retrieve categorized gym routines | Public |
| **GET** | `/v1/yoga/poses` | Retrieve the 17-asana yoga library with alignment targets | Public |
| **POST** | `/v1/report/export-pdf` | Generate clinical PDF biomechanics summary | JWT / Cookie |
| **POST** | `/v1/creator/donation` | Record donation pledge and dispatch creator alert | Strict Rate Limit |

Interactive Swagger UI documentation is available at **[http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)**.

---

## ⚙️ Environment Variables

| Variable | Type | Default | Description |
|:---|:---|:---|:---|
| `JWT_SECRET_KEY` | String | *Auto-generated* | Secret key for signing HS256 tokens |
| `JWT_EXPIRE_HOURS`| Integer | `72` | Session token validity duration in hours |
| `GEMINI_API_KEY` | String | *Empty* | Google AI Studio key for multi-model Luna assistant |
| `GEMINI_MODEL` | String | `gemini-2.0-flash`| Target Gemini model variant |
| `GOOGLE_CLIENT_ID`| String | *Empty* | Google OAuth 2.0 Web Client ID |
| `GOOGLE_CLIENT_SECRET`| String | *Empty* | Google OAuth 2.0 Client Secret |
| `SMTP_HOST` | String | *Empty* | SMTP server hostname for email dispatches |
| `SMTP_PORT` | Integer | `587` | SMTP server port (TLS) |
| `SENDGRID_API_KEY`| String | *Empty* | SendGrid API key (used in preference to SMTP if set)|
| `FIREBASE_PROJECT_ID`| String | `luminix-a0363` | Cloud Firestore sync target project |

---

## 🧪 Testing & Verification

Luminix includes a comprehensive unit and regression test suite covering authentication, password security, session revocation, and mathematical BMI metrics:

```bash
# Run all tests
pytest tests/ -v

# Run authentication hardening tests specifically
pytest tests/test_auth_security_hardening.py -v
```

All 20 tests pass out of the box with zero external infrastructure required.

---

## 🔒 Security & DPDP Compliance

- **No Remote Video Streaming:** Camera frames are strictly processed on client-side memory via MediaPipe WebAssembly. Zero video bytes are transmitted to any cloud server.
- **Cryptographic Password Storage:** Passwords hashed using Argon2id (`m=65536, t=3, p=4`), with resilient legacy bcrypt upgrades.
- **CSRF & Injection Resistance:** HttpOnly SameSite=Lax cookie headers combined with Pydantic validation on all input vectors.
- **Right to Erasure:** In accordance with global data protection standards (GDPR, India DPDP Act 2023), users can purge their entire biometric and session history in one click via the account settings.

---

## 👤 Architect & Maintainer

**Ram Charan Teja** ([@LUNO895](https://github.com/LUNO895))  
*Sole Creator, Full-Stack AI Architect & Computer Vision Practitioner*  
📍 Hyderabad, India  
✉️ Contact: [ramcharantejak396@gmail.com](mailto:ramcharantejak396@gmail.com)

---

## 📜 License & Medical Disclaimer

- **License:** Distributed under the permissive [MIT License](LICENSE).
- **Medical Disclaimer:** Luminix is an open-source educational and physical fitness technology demonstrator. Pose tracking scores, alignment angles, and workout feedback are algorithmic heuristics and do not constitute certified medical diagnosis or clinical physical therapy advice. Consult a healthcare professional before initiating high-intensity physical training.
