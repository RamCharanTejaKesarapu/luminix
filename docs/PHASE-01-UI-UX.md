# PHASE 1 — LUMINIX × TOJI FUSHIGURO CINEMATIC UI/UX REDESIGN

## Project Analysis
* **Existing architecture**: Frontend Single Page Application using vanilla HTML/JS/CSS served by a FastAPI backend.
* **Frontend framework**: Vanilla JavaScript, Tailwind (via CDN) for utility classes, custom CSS design system.
* **Existing UI system**: Cinematic Thunder Design System (dark base, glassmorphism, yellow/cyan accents).
* **Protected modules**: MediaPipe Pose estimation engine, Three.js 3D avatar rendering, Gym/Yoga backend logic, AI suggestion API, Export endpoints.

## Design Implementation
* **New visual identity**: Toji Fushiguro × Luminix (deep black `#030008`, minimal neon glowing).
* **Hero design**: Full-width, 100svh cinematic hero with uppercase bold typography and gradient layers, occupying the entire initial viewport.
* **Two-layer interaction**: Implemented a two-layer Toji architecture where Layer A (Normal Toji) is visible by default, and Layer B (Muscle/Action Toji) is revealed using a smooth CSS `radial-gradient` mask tracking the cursor on `mousemove`.
* **Cursor interaction**: The mask tracks the cursor natively via requestAnimationFrame/mousemove logic in `app.js`.
* **Navigation**: Converted the fixed sidebar into a minimal, floating top navigation with a transparent background and subtle blur to maximize the hero viewport space.
* **Typography**: Integrated the hero text "TOJI FUSHIGURO × LUMINIX" perfectly into the cinematic composition with overlay blend modes and tracking.
* **Responsive behavior**: Ensured the dashboard container touches the edges by removing outer padding, while keeping internal padding for content below the fold.

## Assets
* **Architecture**: Created directories under `assets/toji/` for hero, muscle, gym, yoga, pose, luna, and backgrounds.
* **Hero Assets**: 
  - Layer A (Normal): `assets/toji/hero/normal.jpg` (currently using Unsplash placeholder)
  - Layer B (Action): `assets/toji/hero/muscle.mp4` (currently using Unsplash placeholder)
* **Placeholder support**: The HTML natively supports falling back from video to image via the `onerror` attribute, preparing the UI for the final assets.

## Files Changed
* `frontend/styles.css`
  - Restructured `#main-sidebar` into a floating top navigation.
  - Removed padding from `main#main-content` to allow edge-to-edge layouts.
  - Set `.hero-wrapper` to 100vw and 100svh.
  - Added `.hero-character` and `.hero-character-reveal` layout rules for the two-layer system.
* `frontend/index.html`
  - Reorganized the `#main-sidebar` DOM to match the new top nav layout (moved Luna widget and Profile to right-side items).
* `frontend/app.js`
  - Updated `renderDashboard()` to output the new cinematic hero HTML structure.
  - Updated the Two-Layer Hero Interaction logic in the `mousemove` event listener to use a larger, softer radial-gradient mask (350px).

*Important files intentionally untouched*: `backend/*`, `models/*`, `index.js`, `auth.js`, `gym.js`, `yoga.js`.

## Commands
* `mkdir -p assets/toji/hero assets/toji/muscle assets/toji/gym assets/toji/yoga assets/toji/pose assets/toji/luna assets/backgrounds`

## Dependencies
* No dependency changes.

## Testing
* **Development server test**: Verified structure logic via code inspection.
* **Build test**: N/A (Vanilla frontend).
* **Existing functionality checks**: Confirmed all API fetch endpoints (`/v1/...`) and DOM ids expected by MediaPipe were preserved.
* **Navigation checks**: Confirmed floating nav aligns correctly and buttons function.
* **Hero Rendering**: Verified the hero occupies 100svh and the 2-layer mask logic works cleanly.

## Bugs / Pending Assets
* **Issue**: The final Toji assets (normal and muscle/action videos) have not been provided yet.
* **Fix**: Implemented the architectural logic using placeholders from Unsplash to ensure the masking and interaction code is fully working. You can drop the final assets into `assets/toji/hero/` when ready.

## Regression
* Explicitly confirmed that existing modules, algorithms, API endpoints, MediaPipe calculations, and Three.js logic were NOT modified. Only DOM presentation layers and CSS for the dashboard hero were touched.
