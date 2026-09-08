# Contributing to Luminix

Thank you for your interest in contributing to **Luminix**! Luminix is an autonomous, client-side biomechanical health intelligence platform designed for clinical kinematic precision, privacy, and zero video cloud latency.

---

## Code of Conduct

Please read our [Code of Conduct](CODE_OF_CONDUCT.md) before participating. We are committed to providing a welcoming, inclusive, and harassment-free environment.

---

## Development Workflow

### 1. Prerequisites
- **Python 3.10+** (Python 3.11 or 3.12 recommended)
- **Node.js 18+** (optional, for frontend formatting/linting)
- Modern Web Browser with WebGL2 and WebAssembly support (Chrome, Firefox, Edge, Safari)

### 2. Fork & Clone
```bash
git clone https://github.com/<your-username>/luminix.git
cd luminix
```

### 3. Setup Virtual Environment
```bash
python3 -m venv .venv
source .venv/bin/activate    # On Windows: .venv\Scripts\activate
pip install --upgrade pip
pip install -r requirements.txt
```

### 4. Configure Environment
```bash
cp .env.example .env
# Edit .env with your local settings (Gemini API key is optional for AI chat)
```

### 5. Start the Development Server
```bash
uvicorn backend.api.main:app --host 127.0.0.1 --port 8000 --reload
```
Navigate to `http://127.0.0.1:8000` to interact with Luminix.

---

## Branching & Commit Guidelines

- Create feature branches from `main`:
  ```bash
  git checkout -b feature/biomechanics-wrist-angle
  ```
- Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:
  - `feat: add lumbar spine angle tracking`
  - `fix: resolve MediaPipe landmark jitter on low-light frames`
  - `docs: update deployment architecture in README`
  - `test: add unit test for password reset expiration`
  - `refactor: optimize Three.js render loop geometry`

---

## Running Tests

Before submitting a pull request, run all automated security and functional tests:

```bash
pytest tests/ -v
```

Ensure all tests pass and no regression warnings are introduced.

---

## Pull Request Process

1. Push your branch to your GitHub fork:
   ```bash
   git push origin feature/your-feature-name
   ```
2. Open a Pull Request against the `main` branch of `LUNO895/luminix`.
3. Provide a clear summary of changes, problem addressed, and test results.
4. Link any related issues (`Fixes #12`).

---

## Architecture & Code Style

- **Frontend**: Vanilla HTML5, modern CSS3 (custom properties, responsive layout), JavaScript (ES6+), Three.js (WebGL), MediaPipe Pose WebAssembly.
- **Backend**: Python 3.10+, FastAPI (asynchronous endpoints), SQLAlchemy, SQLite, Pydantic v2.
- **Privacy & Telemetry**: Video frames MUST NOT be sent to external servers. All joint coordinate and angle calculations are executed strictly client-side.
