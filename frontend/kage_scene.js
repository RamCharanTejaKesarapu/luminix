/* ═══════════════════════════════════════════════════════════════════
   KAGE × LUMINIX — Atmospheric WebGL Temple Sanctuary
   Procedural Three.js World: Night Sky, Ridge, Shaded Slate, 
   Charred Timber Worship Hall, Vermilion Moon, Torii Gate,
   Stone Lanterns, Floating Embers, Cursor Wisps & Tumbling Leaves.
   ═══════════════════════════════════════════════════════════════════ */
(function() {
    'use strict';

    const clamp   = (v, a, b) => v < a ? a : (v > b ? b : v);
    const sat     = v => clamp(v, 0, 1);
    const lerp    = (a, b, t) => a + (b - a) * t;
    const smooth  = (e0, e1, x) => { const t = sat((x - e0) / (e1 - e0)); return t * t * (3 - 2 * t); };
    const TAU     = Math.PI * 2;
    const damp    = (cur, to, rate, dt) => lerp(cur, to, 1 - Math.exp(-rate * dt));

    function mulberry32(a) {
        return function () {
            a |= 0; a = a + 0x6D2B79F5 | 0;
            let t = Math.imul(a ^ a >>> 15, 1 | a);
            t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
    }

    function noise2D(seed) {
        const rnd = mulberry32(seed), p = new Uint8Array(256), perm = new Uint8Array(512);
        for (let i = 0; i < 256; i++) p[i] = i;
        for (let i = 255; i > 0; i--) { const j = (rnd() * (i + 1)) | 0, t = p[i]; p[i] = p[j]; p[j] = t; }
        for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
        const G = [[1, 1], [-1, 1], [1, -1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]];
        const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
        return function (x, y) {
            const xi = Math.floor(x), yi = Math.floor(y);
            const X = xi & 255, Y = yi & 255, xf = x - xi, yf = y - yi;
            const u = fade(xf), v = fade(yf);
            const g = (h, dx, dy) => { const q = G[h & 7]; return q[0] * dx + q[1] * dy; };
            const aa = perm[perm[X] + Y], ab = perm[perm[X] + Y + 1];
            const ba = perm[perm[X + 1] + Y], bb = perm[perm[X + 1] + Y + 1];
            return lerp(lerp(g(aa, xf, yf), g(ba, xf - 1, yf), u),
                        lerp(g(ab, xf, yf - 1), g(bb, xf - 1, yf - 1), u), v);
        };
    }

    function fbm(n, x, y, oct, lac, gain) {
        let a = .5, f = 1, s = 0, m = 0;
        for (let i = 0; i < (oct || 4); i++) { s += a * n(x * f, y * f); m += a; a *= (gain || .5); f *= (lac || 2); }
        return s / m;
    }

    function cvs(w, h) {
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        return c;
    }

    const hex = (r, g, b) => 'rgb(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ')';

    function fbmCanvas(W, H, seed, octaves, baseCells, contrast) {
        const out = cvs(W, H), o = out.getContext('2d');
        o.fillStyle = '#808080'; o.fillRect(0, 0, W, H);
        let cells = baseCells || 3, alpha = 1;
        for (let i = 0; i < (octaves || 5); i++) {
            const n = cvs(cells, cells), nx = n.getContext('2d');
            const im = nx.createImageData(cells, cells), d = im.data, r = mulberry32(seed + i * 977);
            for (let k = 0; k < cells * cells; k++) {
                const v = 128 + (r() - .5) * 255 * (contrast || 1);
                d[k * 4] = d[k * 4 + 1] = d[k * 4 + 2] = clamp(v, 0, 255); d[k * 4 + 3] = 255;
            }
            nx.putImageData(im, 0, 0);
            o.globalAlpha = alpha;
            o.globalCompositeOperation = i === 0 ? 'source-over' : 'overlay';
            o.imageSmoothingEnabled = true; o.imageSmoothingQuality = 'high';
            o.drawImage(n, 0, 0, W, H);
            cells *= 2; alpha *= .62;
        }
        o.globalAlpha = 1; o.globalCompositeOperation = 'source-over';
        return out;
    }

    function normalFromHeight(hc, strength) {
        const W = hc.width, H = hc.height;
        const b = cvs(W, H), bx = b.getContext('2d');
        bx.filter = 'blur(1.1px)'; bx.drawImage(hc, 0, 0); bx.filter = 'none';
        const src = bx.getImageData(0, 0, W, H).data;
        const out = cvs(W, H), ox = out.getContext('2d');
        const im = ox.createImageData(W, H), d = im.data;
        const at = (x, y) => src[(((y + H) % H) * W + ((x + W) % W)) * 4] / 255;
        const s = strength || 2.4;
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
            const gx = (at(x + 1, y) - at(x - 1, y)) * s;
            const gy = (at(x, y + 1) - at(x, y - 1)) * s;
            let nx = -gx, ny = gy, nz = 1;
            const il = 1 / Math.hypot(nx, ny, nz);
            const i = (y * W + x) * 4;
            d[i]     = (nx * il * .5 + .5) * 255;
            d[i + 1] = (ny * il * .5 + .5) * 255;
            d[i + 2] = (nz * il * .5 + .5) * 255;
            d[i + 3] = 255;
        }
        ox.putImageData(im, 0, 0);
        return out;
    }

    /* ── Procedural Textures ── */
    function texWall() {
        const W = 512, H = 512;
        const c = cvs(W, H), x = c.getContext('2d');
        x.fillStyle = '#0e1418'; x.fillRect(0, 0, W, H);
        x.globalCompositeOperation = 'overlay'; x.globalAlpha = .75;
        x.drawImage(fbmCanvas(W, H, 41, 5, 3, 1), 0, 0);
        x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
        for (let i = 1; i < 6; i++) {
            const y = (H / 6) * i;
            x.fillStyle = 'rgba(0,0,0,.45)'; x.fillRect(0, y - 1.5, W, 3);
            x.fillStyle = 'rgba(190,205,205,.05)'; x.fillRect(0, y + 2, W, 2);
        }
        const h = cvs(W, H), hx = h.getContext('2d');
        hx.fillStyle = '#808080'; hx.fillRect(0, 0, W, H);
        hx.globalAlpha = .5; hx.drawImage(fbmCanvas(W, H, 41, 4, 6, 1), 0, 0); hx.globalAlpha = 1;
        return { map: c, normal: normalFromHeight(h, 1.8) };
    }

    function texFloor() {
        const W = 512, H = 512;
        const c = cvs(W, H), x = c.getContext('2d');
        const rnd = mulberry32(23);
        x.fillStyle = '#080c0f'; x.fillRect(0, 0, W, H);
        const N = 4, S = W / N;
        for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
            const t = .82 + rnd() * .36;
            x.fillStyle = hex(10 * t, 15 * t, 18 * t);
            x.fillRect(i * S + 1.5, j * S + 1.5, S - 3, S - 3);
        }
        x.strokeStyle = 'rgba(0,0,0,.72)'; x.lineWidth = 3;
        for (let i = 0; i <= N; i++) {
            x.beginPath(); x.moveTo(i * S, 0); x.lineTo(i * S, H); x.stroke();
            x.beginPath(); x.moveTo(0, i * S); x.lineTo(W, i * S); x.stroke();
        }
        const h = cvs(W, H), hx = h.getContext('2d');
        hx.fillStyle = '#8c8c8c'; hx.fillRect(0, 0, W, H);
        hx.strokeStyle = '#222'; hx.lineWidth = 4;
        for (let i = 0; i <= N; i++) {
            hx.beginPath(); hx.moveTo(i * S, 0); hx.lineTo(i * S, H); hx.stroke();
            hx.beginPath(); hx.moveTo(0, i * S); hx.lineTo(W, i * S); hx.stroke();
        }
        return { map: c, normal: normalFromHeight(h, 1.4) };
    }

    function texWood(seed, opt) {
        const o = opt || {}, W = 256, H = 256;
        const c = cvs(W, H), x = c.getContext('2d');
        const base = o.base || [28, 22, 18];
        x.fillStyle = hex(base[0], base[1], base[2]); x.fillRect(0, 0, W, H);
        const rnd = mulberry32(seed || 3);
        for (let i = 0; i < 40; i++) {
            const y = rnd() * H;
            x.fillStyle = 'rgba(0,0,0,' + (0.15 + rnd() * 0.25) + ')';
            x.fillRect(0, y, W, 1 + rnd() * 3);
        }
        const h = cvs(W, H), hx = h.getContext('2d');
        hx.fillStyle = '#808080'; hx.fillRect(0, 0, W, H);
        return { map: c, normal: normalFromHeight(h, 1.5) };
    }

    function texShoji() {
        const W = 512, H = 384, c = cvs(W, H), x = c.getContext('2d');
        x.clearRect(0, 0, W, H);
        x.fillStyle = 'rgba(255, 235, 205, 0.08)'; x.fillRect(0, 0, W, H);
        x.strokeStyle = 'rgba(12, 10, 8, 0.92)';
        const cols = 8, rows = 6;
        x.lineWidth = 4;
        for (let i = 1; i < cols; i++) { x.beginPath(); x.moveTo(W / cols * i, 0); x.lineTo(W / cols * i, H); x.stroke(); }
        for (let j = 1; j < rows; j++) { x.beginPath(); x.moveTo(0, H / rows * j); x.lineTo(W, H / rows * j); x.stroke(); }
        x.lineWidth = 10; x.strokeRect(0, 0, W, H);
        return c;
    }

    function texSky() {
        const W = 512, H = 512, c = cvs(W, H), x = c.getContext('2d');
        const g = x.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, 'rgb(4, 7, 11)');
        g.addColorStop(0.35, 'rgb(8, 14, 20)');
        g.addColorStop(0.7, 'rgb(14, 22, 30)');
        g.addColorStop(1, 'rgb(12, 18, 24)');
        x.fillStyle = g; x.fillRect(0, 0, W, H);
        
        // Stars
        const rnd = mulberry32(881);
        for (let i = 0; i < 350; i++) {
            const sx = rnd() * W, sy = rnd() * H * 0.75, r = 0.5 + rnd() * rnd() * 1.5;
            x.fillStyle = 'rgba(214, 232, 240, ' + (0.15 + rnd() * 0.45) + ')';
            x.beginPath(); x.arc(sx, sy, r, 0, TAU); x.fill();
        }
        return c;
    }

    function texRidge() {
        const W = 1024, H = 256, c = cvs(W, H), x = c.getContext('2d');
        const n = noise2D(1207);
        x.beginPath(); x.moveTo(0, H);
        for (let i = 0; i <= W; i += 4) {
            const t = i / W;
            const ridge = 0.4 + 0.3 * (fbm(n, t * 2.5, 0.5, 3, 2.1, 0.5) * 0.5 + 0.5);
            x.lineTo(i, H - ridge * H * 0.85);
        }
        x.lineTo(W, H); x.closePath();
        x.fillStyle = '#040709'; x.fill();
        return c;
    }

    function texMoon() {
        const S = 256, c = cvs(S, S), x = c.getContext('2d');
        const R = S / 2 - 2;
        x.beginPath(); x.arc(S / 2, S / 2, R, 0, TAU); x.closePath();
        x.save(); x.clip();
        
        const g = x.createRadialGradient(S * .46, S * .44, S * .05, S / 2, S / 2, R);
        g.addColorStop(0, 'rgb(180,180,180)');
        g.addColorStop(.6, 'rgb(160,160,160)');
        g.addColorStop(1, 'rgb(195,195,195)');
        x.fillStyle = g; x.fillRect(0, 0, S, S);

        // Maria dark regions
        const rnd = mulberry32(91);
        for (let i = 0; i < 18; i++) {
            const cx2 = S * (.3 + rnd() * .4), cy = S * (.3 + rnd() * .4), rr = 20 + rnd() * 35;
            const bg = x.createRadialGradient(cx2, cy, 5, cx2, cy, rr);
            bg.addColorStop(0, 'rgba(40,40,40,0.45)');
            bg.addColorStop(1, 'rgba(40,40,40,0)');
            x.fillStyle = bg; x.beginPath(); x.arc(cx2, cy, rr, 0, TAU); x.fill();
        }
        x.restore();
        return c;
    }

    function texGlow(inner, mid) {
        const S = 128, c = cvs(S, S), x = c.getContext('2d');
        const g = x.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
        g.addColorStop(0, inner || 'rgba(255,255,255,1)');
        g.addColorStop(0.3, mid || 'rgba(255,255,255,0.35)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        x.fillStyle = g; x.fillRect(0, 0, S, S);
        return c;
    }

    function texLeaf() {
        const S = 64, c = cvs(S, S), x = c.getContext('2d');
        x.translate(S / 2, S * .9); x.scale(S / 2.2, -S / 2.2);
        x.beginPath();
        for (let i = 0; i < 5; i++) {
            const a = -0.9 + 1.8 * (i / 4) + Math.PI / 2;
            const len = i === 2 ? 0.95 : 0.75;
            x.lineTo(Math.cos(a) * len, Math.sin(a) * len);
        }
        x.closePath();
        x.fillStyle = '#fff'; x.fill();
        return c;
    }

    /* ── WebGL Engine State ── */
    let renderer, scene, camera;
    let clock = 0, lastT = performance.now();
    let isPaused = false, isDimmed = false;
    let canvasEl;

    const WORLD = {
        uT: { value: 0 },
        lanternLights: [],
        lanternGlows: [],
        leaves: null,
        wisps: null,
        embers: null,
        haze: []
    };

    const RIG = {
        camIndex: 0,
        scrollProgress: 0,
        tmx: 0,
        tmy: 0,
        mx: 0,
        my: 0
    };

    const CAM_WAYPOINTS = [
        { x: 0,    y: 3.2, z: 8.8,   pitch: -0.06, yaw: 0,     roll: 0 },  // 0: Hero
        { x: 0,    y: 4.5, z: 2.5,   pitch: 0.04,  yaw: 0,     roll: 0 },  // 1: Sanmon
        { x: -2.5, y: 5.8, z: -6.5,  pitch: 0.07,  yaw: 0.12,  roll: 0 },  // 2: Gardens
        { x: 2.0,  y: 7.2, z: -16.0, pitch: 0.10,  yaw: -0.10, roll: 0 },  // 3: Sacred Craft
        { x: 0,    y: 8.8, z: -24.0, pitch: 0.22,  yaw: 0.04,  roll: 0 },  // 4: Afterlight
        { x: 0,    y: 6.2, z: -12.0, pitch: 0.02,  yaw: 0,     roll: 0 }   // 5: Foot
    ];

    function tx(canvasElem, o) {
        o = o || {};
        const t = new THREE.CanvasTexture(canvasElem);
        t.wrapS = t.wrapT = o.wrap || THREE.ClampToEdgeWrapping;
        if (o.repeat) t.repeat.set(o.repeat[0], o.repeat[1]);
        t.anisotropy = Math.min(o.aniso || 4, renderer ? renderer.capabilities.getMaxAnisotropy() : 1);
        t.needsUpdate = true;
        return t;
    }

    const hdr = (r, g, b) => new THREE.Color().setRGB(r, g, b);

    /* ── World Construction ── */
    function buildWorld() {
        // Sky
        const sky = new THREE.Mesh(
            new THREE.PlaneGeometry(320, 180),
            new THREE.MeshBasicMaterial({ map: tx(texSky()), depthWrite: false, fog: false })
        );
        sky.position.set(0, 55, -100);
        scene.add(sky);

        // Mountain Ridge
        const ridgeMat = new THREE.MeshBasicMaterial({ map: tx(texRidge()), transparent: true, color: 0x05080c, depthWrite: false, fog: false });
        const ridge = new THREE.Mesh(new THREE.PlaneGeometry(240, 22), ridgeMat);
        ridge.position.set(0, 9, -75);
        scene.add(ridge);

        // Slate Ground & Podium
        const floorT = texFloor();
        const floorMat = new THREE.MeshStandardMaterial({
            map: tx(floorT.map, { wrap: THREE.RepeatWrapping, repeat: [6, 6] }),
            normalMap: tx(floorT.normal, { wrap: THREE.RepeatWrapping, repeat: [6, 6] }),
            roughness: 0.75, metalness: 0.05, color: 0x586268
        });
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.set(0, 0, -15);
        scene.add(floor);

        // Podium & Steps
        const PODIUM = 6.8, STEPS = 36, STAIR_Z0 = -10.0, STAIR_RUN = 0.52, STAIR_W = 8.2;
        const platMat = new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0.02, color: 0x485258 });
        const plat = new THREE.Mesh(new THREE.BoxGeometry(38, PODIUM, 22), platMat);
        plat.position.set(0, PODIUM / 2, -42);
        scene.add(plat);

        for (let i = 0; i < STEPS; i++) {
            const y = (i + 1) * (PODIUM / STEPS), z = STAIR_Z0 - (i + 0.5) * STAIR_RUN;
            const w = STAIR_W + (STEPS - i) * 0.04;
            const tread = new THREE.Mesh(new THREE.BoxGeometry(w, PODIUM / STEPS + 0.02, STAIR_RUN + 0.02), platMat);
            tread.position.set(0, y - (PODIUM / STEPS) / 2, z);
            scene.add(tread);
        }

        // Worship Hall (Sanmon)
        const TEMPLE_Z = -41, F = PODIUM;
        const timberMat = new THREE.MeshStandardMaterial({ color: 0x3d3532, roughness: 0.9, metalness: 0.02 });
        const postMat = new THREE.MeshStandardMaterial({ color: 0x5a4a44, roughness: 0.85, metalness: 0.04 });
        const tileMat = new THREE.MeshStandardMaterial({ color: 0x242a30, roughness: 0.7, metalness: 0.1 });
        const paperMat = new THREE.MeshBasicMaterial({ color: hdr(1.3, 0.55, 0.22), fog: true });
        const shojiTex = tx(texShoji());
        const gridMat = new THREE.MeshBasicMaterial({ map: shojiTex, transparent: true, depthWrite: false });

        // Ground Core & Glowing Lattice Bays
        const core = new THREE.Mesh(new THREE.BoxGeometry(13.2, 4.8, 8.0), timberMat);
        core.position.set(0, F + 2.4, TEMPLE_Z);
        scene.add(core);

        for (let i = 0; i < 5; i++) {
            const x = -5.4 + i * 2.7;
            const p = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 2.4), paperMat);
            p.position.set(x, F + 2.5, TEMPLE_Z + 4.08);
            scene.add(p);
            const g = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 2.4), gridMat);
            g.position.set(x, F + 2.5, TEMPLE_Z + 4.12);
            scene.add(g);
        }

        // Columns
        for (let i = 0; i < 6; i++) {
            const col = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 4.8, 12), postMat);
            col.position.set(-6.8 + i * 2.7, F + 2.4, TEMPLE_Z + 4.18);
            scene.add(col);
        }

        // Lower Roof
        const lowerRoof = new THREE.Mesh(new THREE.ConeGeometry(9.5, 2.8, 4), tileMat);
        lowerRoof.position.set(0, F + 5.8, TEMPLE_Z);
        lowerRoof.rotation.y = Math.PI / 4;
        scene.add(lowerRoof);

        // Upper Storey
        const up = new THREE.Mesh(new THREE.BoxGeometry(9.6, 3.2, 5.8), timberMat);
        up.position.set(0, F + 9.0, TEMPLE_Z);
        scene.add(up);

        // Main Roof
        const mainRoof = new THREE.Mesh(new THREE.ConeGeometry(11.2, 4.6, 4), tileMat);
        mainRoof.position.set(0, F + 12.2, TEMPLE_Z);
        mainRoof.rotation.y = Math.PI / 4;
        scene.add(mainRoof);

        // Hall Warm Glow Spill
        const spill = new THREE.Mesh(
            new THREE.PlaneGeometry(28, 14),
            new THREE.MeshBasicMaterial({
                map: tx(texGlow('rgba(255,145,60,0.85)', 'rgba(240,90,20,0.22)')),
                transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.32
            })
        );
        spill.position.set(0, F + 2.8, TEMPLE_Z + 5.4);
        scene.add(spill);

        // Vermilion Moon
        const MOON_X = 16.5, MOON_Y = 30.5, MOON_Z = -68, MOON_R = 8.2;
        const moon = new THREE.Mesh(
            new THREE.PlaneGeometry(MOON_R * 2, MOON_R * 2),
            new THREE.MeshBasicMaterial({
                map: tx(texMoon()),
                color: hdr(3.4, 0.62, 0.58),
                transparent: true, depthWrite: false, fog: false
            })
        );
        moon.position.set(MOON_X, MOON_Y, MOON_Z);
        scene.add(moon);

        const moonHalo = new THREE.Mesh(
            new THREE.PlaneGeometry(MOON_R * 5.8, MOON_R * 5.8),
            new THREE.MeshBasicMaterial({
                map: tx(texGlow('rgba(255,120,110,0.88)', 'rgba(206,48,45,0.24)')),
                transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.42
            })
        );
        moonHalo.position.set(MOON_X, MOON_Y, MOON_Z - 0.2);
        scene.add(moonHalo);

        // Torii Gate
        const lacMat = new THREE.MeshStandardMaterial({ color: 0x9e1b15, roughness: 0.85, metalness: 0.05 });
        const goldMat = new THREE.MeshStandardMaterial({ color: 0x7a5d2a, roughness: 0.45, metalness: 0.65 });
        const toriiGroup = new THREE.Group();
        const H_TORII = 7.5, SPAN = 3.3;

        [-1, 1].forEach(s => {
            const col = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, H_TORII, 16), lacMat);
            col.position.set(s * SPAN, H_TORII / 2, 0);
            toriiGroup.add(col);

            const baseCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.46, 0.45, 16), goldMat);
            baseCollar.position.set(s * SPAN, 0.22, 0);
            toriiGroup.add(baseCollar);
        });

        // Nuki & Kasagi Beams
        const nuki = new THREE.Mesh(new THREE.BoxGeometry(8.8, 0.48, 0.42), lacMat);
        nuki.position.set(0, H_TORII - 1.8, 0);
        toriiGroup.add(nuki);

        const kasagi = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.58, 0.52), lacMat);
        kasagi.position.set(0, H_TORII + 0.3, 0);
        toriiGroup.add(kasagi);

        toriiGroup.position.set(0, 0, -8.0);
        toriiGroup.scale.setScalar(0.75);
        scene.add(toriiGroup);

        // Stone Lanterns
        const lanternPositions = [
            [-4.2, -6.5], [4.2, -6.5],
            [-5.5, -14.0], [5.5, -14.0]
        ];

        const stoneMat = new THREE.MeshStandardMaterial({ color: 0x5a6366, roughness: 0.85, metalness: 0.02 });
        const lanternDark = new THREE.MeshStandardMaterial({ color: 0x221c19, roughness: 0.9 });
        const paneMat = new THREE.MeshBasicMaterial({ color: hdr(2.2, 0.32, 0.09), fog: false });
        const glowTex = tx(texGlow('rgba(255,120,60,0.92)', 'rgba(255,60,24,0.3)'));

        lanternPositions.forEach(lp => {
            const lg = new THREE.Group();
            const lBase = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.45, 0.25, 12), stoneMat);
            lBase.position.y = 0.12; lg.add(lBase);

            const lPost = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.95, 10), stoneMat);
            lPost.position.y = 0.72; lg.add(lPost);

            const lBox = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.46, 0.46), lanternDark);
            lBox.position.y = 1.45; lg.add(lBox);

            const lPane = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.32), paneMat);
            lPane.position.set(0, 1.45, 0.235); lg.add(lPane);

            const lRoof = new THREE.Mesh(new THREE.ConeGeometry(0.58, 0.32, 4), stoneMat);
            lRoof.position.y = 1.85; lRoof.rotation.y = Math.PI / 4; lg.add(lRoof);

            const glow = new THREE.Mesh(
                new THREE.PlaneGeometry(2.8, 2.8),
                new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, blending: THREE.AdditiveBlending, opacity: 0.55 })
            );
            glow.position.y = 1.45; lg.add(glow);

            const pl = new THREE.PointLight(0xff5a24, 1.8, 8, 2);
            pl.position.set(0, 1.45, 0); lg.add(pl);

            lg.position.set(lp[0], 0, lp[1]);
            scene.add(lg);
            WORLD.lanternLights.push(pl);
            WORLD.lanternGlows.push(glow);
        });

        // Floating Embers
        const EMBER_COUNT = 180;
        const emberPos = new Float32Array(EMBER_COUNT * 3);
        const emberSeed = new Float32Array(EMBER_COUNT);
        const rnd = mulberry32(66);

        for (let i = 0; i < EMBER_COUNT; i++) {
            emberPos[i * 3] = (rnd() - 0.5) * 26;
            emberPos[i * 3 + 1] = rnd() * 10;
            emberPos[i * 3 + 2] = -24 + rnd() * 32;
            emberSeed[i] = rnd();
        }

        const emberGeo = new THREE.BufferGeometry();
        emberGeo.setAttribute('position', new THREE.BufferAttribute(emberPos, 3));
        emberGeo.setAttribute('aSeed', new THREE.BufferAttribute(emberSeed, 1));

        const emberMat = new THREE.PointsMaterial({
            size: 0.18,
            color: 0xff6a28,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        const embers = new THREE.Points(emberGeo, emberMat);
        scene.add(embers);
        WORLD.embers = { mesh: embers, seeds: emberSeed, pos: emberPos };

        // Falling Maple Leaves (3D Quads)
        const LEAF_N = 80;
        const leafMat = new THREE.MeshBasicMaterial({
            map: tx(texLeaf()),
            transparent: true,
            side: THREE.DoubleSide,
            color: 0x8a1012,
            depthWrite: false
        });
        const leafInst = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.32, 0.32), leafMat, LEAF_N);
        const leavesList = [];

        for (let i = 0; i < LEAF_N; i++) {
            leavesList.push({
                x: (rnd() - 0.5) * 28,
                y: rnd() * 22,
                z: -26 + rnd() * 34,
                fallSpeed: 0.6 + rnd() * 0.8,
                rotX: rnd() * TAU,
                rotY: rnd() * TAU,
                spinSpeed: 0.4 + rnd() * 1.8,
                scale: 0.6 + rnd() * 0.7
            });
        }
        scene.add(leafInst);
        WORLD.leaves = { mesh: leafInst, list: leavesList };

        // Ambient Lighting
        const amb = new THREE.AmbientLight(0x0e141a, 1.2);
        scene.add(amb);

        const moonLight = new THREE.DirectionalLight(0x405565, 0.8);
        moonLight.position.set(15, 30, -30);
        scene.add(moonLight);
    }

    function updateAtmosphere(dt) {
        clock += dt;
        WORLD.uT.value = clock;

        // Flicker lantern flames
        const flicker = 0.85 + Math.sin(clock * 8.2) * 0.12 + Math.cos(clock * 13.5) * 0.08;
        WORLD.lanternLights.forEach(l => { l.intensity = 1.8 * flicker; });
        WORLD.lanternGlows.forEach(g => { g.material.opacity = 0.55 * flicker; });

        // Update Embers rising
        if (WORLD.embers) {
            const P = WORLD.embers.pos;
            const S = WORLD.embers.seeds;
            for (let i = 0; i < S.length; i++) {
                P[i * 3 + 1] += (0.6 + S[i] * 0.8) * dt;
                P[i * 3] += Math.sin(clock * 1.5 + S[i] * 12) * 0.015;
                if (P[i * 3 + 1] > 11) {
                    P[i * 3 + 1] = 0.1;
                }
            }
            WORLD.embers.mesh.geometry.attributes.position.needsUpdate = true;
        }

        // Update Falling Leaves
        if (WORLD.leaves) {
            const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), S = new THREE.Vector3();
            const L = WORLD.leaves.list;
            for (let i = 0; i < L.length; i++) {
                const l = L[i];
                l.y -= l.fallSpeed * dt;
                l.rotX += l.spinSpeed * dt;
                l.rotY += l.spinSpeed * 0.6 * dt;
                if (l.y < 0.2) {
                    l.y = 20;
                    l.x = (Math.random() - 0.5) * 28;
                    l.z = -26 + Math.random() * 34;
                }
                E.set(l.rotX, l.rotY, Math.sin(clock + i) * 0.4);
                Q.setFromEuler(E);
                S.setScalar(l.scale);
                M.compose(new THREE.Vector3(l.x + Math.sin(clock + i) * 0.4, l.y, l.z), Q, S);
                WORLD.leaves.mesh.setMatrixAt(i, M);
            }
            WORLD.leaves.mesh.instanceMatrix.needsUpdate = true;
        }
    }

    function updateCamera(dt) {
        if (!camera) return;

        // Damped mouse parallax
        RIG.mx = damp(RIG.mx, RIG.tmx, 8, dt);
        RIG.my = damp(RIG.my, RIG.tmy, 8, dt);

        // Scroll progress across the 5 waypoints
        const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
        const p = clamp(window.scrollY / maxScroll, 0, 1);
        RIG.scrollProgress = damp(RIG.scrollProgress || 0, p, 5, dt);

        if (!CAM_WAYPOINTS || CAM_WAYPOINTS.length === 0) return;
        const totalWP = Math.max(1, CAM_WAYPOINTS.length - 1);
        const safeProgress = clamp(Number.isFinite(RIG.scrollProgress) ? RIG.scrollProgress : 0, 0, 0.9999);
        const scaledProgress = safeProgress * totalWP;
        const idx = clamp(Math.floor(scaledProgress), 0, totalWP - 1);
        const frac = smooth(0, 1, scaledProgress - idx);

        const wpA = CAM_WAYPOINTS[idx] || CAM_WAYPOINTS[0];
        const wpB = CAM_WAYPOINTS[Math.min(idx + 1, totalWP)] || wpA;
        if (!wpA || !wpB) return;

        const targetX = lerp(wpA.x, wpB.x, frac) + (RIG.mx || 0) * 0.8;
        const targetY = lerp(wpA.y, wpB.y, frac) - (RIG.my || 0) * 0.4;
        const targetZ = lerp(wpA.z, wpB.z, frac);

        camera.position.x = damp(camera.position.x, targetX, 6, dt);
        camera.position.y = damp(camera.position.y, targetY, 6, dt);
        camera.position.z = damp(camera.position.z, targetZ, 6, dt);

        const targetPitch = lerp(wpA.pitch, wpB.pitch, frac) + RIG.my * 0.08;
        const targetYaw = lerp(wpA.yaw, wpB.yaw, frac) - RIG.mx * 0.08;
        const targetRoll = lerp(wpA.roll, wpB.roll, frac);

        camera.rotation.x = damp(camera.rotation.x, targetPitch, 6, dt);
        camera.rotation.y = damp(camera.rotation.y, targetYaw, 6, dt);
        camera.rotation.z = damp(camera.rotation.z, targetRoll, 6, dt);
    }

    function onResize() {
        if (!renderer || !camera || !canvasEl) return;
        const w = window.innerWidth, h = window.innerHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h, true);
    }

    function onMouseMove(e) {
        RIG.tmx = (e.clientX / window.innerWidth) * 2 - 1;
        RIG.tmy = (e.clientY / window.innerHeight) * 2 - 1;
    }

    function renderLoop(t) {
        requestAnimationFrame(renderLoop);
        const dt = Math.min((t - lastT) * 0.001, 0.1);
        lastT = t;

        if (isPaused) return;

        updateAtmosphere(dt);
        updateCamera(dt);

        if (renderer && scene && camera) {
            renderer.render(scene, camera);
        }
    }

    /* ── Public API ── */
    window.kageScene = {
        init: function() {
            canvasEl = document.getElementById('gl');
            if (!canvasEl || !window.THREE) {
                document.body.classList.add('no-webgl');
                return;
            }

            try {
                renderer = new THREE.WebGLRenderer({
                    canvas: canvasEl,
                    antialias: true,
                    alpha: false,
                    powerPreference: 'high-performance'
                });
                renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
                renderer.setSize(window.innerWidth, window.innerHeight, true);
                renderer.toneMapping = THREE.ACESFilmicToneMapping;
                renderer.toneMappingExposure = 1.05;
                renderer.setClearColor(0x05070a, 1);

                scene = new THREE.Scene();
                scene.fog = new THREE.FogExp2(0x050a0e, 0.0168);
                scene.background = new THREE.Color(0x05070a);

                camera = new THREE.PerspectiveCamera(36, window.innerWidth / window.innerHeight, 0.3, 250);
                camera.position.set(CAM_WAYPOINTS[0].x, CAM_WAYPOINTS[0].y, CAM_WAYPOINTS[0].z);
                scene.add(camera);

                buildWorld();

                window.addEventListener('resize', onResize);
                window.addEventListener('mousemove', onMouseMove, { passive: true });

                lastT = performance.now();
                requestAnimationFrame(renderLoop);
                console.log('[Kage] WebGL Temple World initialized successfully');
            } catch (err) {
                console.warn('[Kage] WebGL init failed, falling back to CSS theme:', err);
                document.body.classList.add('no-webgl');
            }
        },

        pause: function() {
            isPaused = true;
        },

        resume: function() {
            isPaused = false;
            lastT = performance.now();
        },

        dim: function() {
            isDimmed = true;
            if (canvasEl) canvasEl.classList.add('gl-dimmed');
        },

        undim: function() {
            isDimmed = false;
            if (canvasEl) canvasEl.classList.remove('gl-dimmed');
        }
    };

    // Auto-init once DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => window.kageScene.init());
    } else {
        setTimeout(() => window.kageScene.init(), 50);
    }
})();
