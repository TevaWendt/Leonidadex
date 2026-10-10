/* ============================================================
   LEONIDAKIT — atelier-3d.js (v7.81) : l'Atelier 3D (atelier-3d.html ; balisage : outils/gen-atelier.cjs ; styles :
   atelier-3d.css ; données : atelier/<famille>/<id>.json, écrites par le même générateur à partir des schémas du site).
   Module ES : importe three.js depuis vendor/ (même origine, CSP script-src 'self'). Script partagé par les langues :
   aucun mot n'est écrit ici, tout vient du balisage (libellés, messages data-hint, options).
   - La maquette d'un véhicule : chaque silhouette d'encre du profil est extrudée en volume, puis affinée en largeur par le
     contour de la vue de dessus (lofting) ; vitres latérales (voile du profil, un peu plus larges), pare-brise et lunette
     (vitrages de la vue de dessus, posés sur la caisse), roues (disques du profil), feux (vue de face et d'arrière),
     plaque, options (aileron, jupes, prise d'air, barres de toit, pare-chocs, échappements, arceau, bandes, néons).
   - La maquette d'une arme : silhouettes extrudées, accessoires posés sur les bords (chargeur, viseur, canon, poignée, lampe).
   - Rien gardé sur l'appareil sauf « Mes configurations » (localStorage lk_atelier) ; aucune requête hors des données du
     site ; le lien copié porte seulement les options.
   ============================================================ */
import * as THREE from './vendor/three.module.min.js';

(function () {
  'use strict';
  const root = document.querySelector('[data-at]'); if (!root) return;
  const $ = (s, el = root) => el.querySelector(s), $$ = (s, el = root) => Array.from(el.querySelectorAll(s));
  const view = $('[data-at-view]'), canvas = $('[data-at-canvas]'), loading = $('[data-at-loading]'), msg = $('[data-at-msg]');
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const DATA = new URL('atelier/', import.meta.url);
  const KV = 1.38; /* la vue de face est dessinée à 1,38 × la hauteur du profil (vehicules-angles.cjs) */

  /* ---------- état ---------- */
  const DEF = {
    v: { paint: 'E8452C', finish: 'gloss', paint2: '1A1A1E', stripes: 0, stripeColor: 'F4F1EA', rim: '8A8C92', rimSize: 0, tyres: 'std', aileron: 0, jupes: 0, capot: 0, toit: 0, bullbar: 0, exhaust: 0, arceau: 0, tint: 35, neon: 0, neonColor: 'F06AA8', susp: 0, lights: 'halo', lightColor: '38C7D4', plate: 'LEONIDA', plateStyle: 'blue', turbo: 0, moteur: 0, freins: 0, transmission: 0, blindage: 0 },
    a: { finish: 'black', finishColor: 'E8452C', camo: 'none', engrave: 0, mag: 'std', sight: 'none', barrel: 'std', grip: 0, lamp: 0, laser: 0, ammo: 'std' }
  };
  const NUM = new Set(['stripes', 'rimSize', 'aileron', 'jupes', 'capot', 'toit', 'bullbar', 'exhaust', 'arceau', 'tint', 'neon', 'susp', 'turbo', 'moteur', 'freins', 'transmission', 'blindage', 'engrave', 'grip', 'lamp', 'laser']);
  const st = { fam: 'v', id: root.dataset.atFirst, cat: '', data: null, s: Object.assign({}, DEF.v) };
  const cache = new Map();

  /* ---------- rendu ---------- */
  let renderer, scene, camera, group = null, floorShadow, keyLight, neonLight, camLight, dirty = true, spinning = !reduced, lastInput = 0, raf = 0;
  const orbit = { az: 0.62, el: 0.36, dist: 420, tx: 0, ty: 16, tz: 0, goal: null };
  function initGL() {
    try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' }); }
    catch (e) { view.classList.add('is-nowebgl'); return false; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 700 ? 1.5 : 2));
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(30, 4 / 3, 1, 4000);
    scene.add(new THREE.HemisphereLight(0xfff1dc, 0x2a1b45, 0.75));
    keyLight = new THREE.DirectionalLight(0xffffff, 2.2); keyLight.position.set(160, 260, 140); keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024); keyLight.shadow.camera.left = -180; keyLight.shadow.camera.right = 180; keyLight.shadow.camera.top = 180; keyLight.shadow.camera.bottom = -180; keyLight.shadow.camera.near = 10; keyLight.shadow.camera.far = 900; keyLight.shadow.bias = -0.0008;
    scene.add(keyLight);
    const fill = new THREE.DirectionalLight(0x9fb7ff, 0.7); fill.position.set(-220, 120, -80); scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffb070, 0.9); rim.position.set(-60, 90, -260); scene.add(rim);
    const spot = new THREE.PointLight(0xff8a5c, 220, 900, 1.6); spot.position.set(-140, 120, 220); scene.add(spot);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(520, 64), new THREE.MeshStandardMaterial({ color: 0x1c1526, roughness: 0.92, metalness: 0.05 })); floor.rotation.x = -Math.PI / 2; floor.position.y = -0.3; floor.receiveShadow = true; scene.add(floor);
    floorShadow = new THREE.Mesh(new THREE.PlaneGeometry(1000, 1000), new THREE.ShadowMaterial({ opacity: 0.42 })); floorShadow.rotation.x = -Math.PI / 2; floorShadow.position.y = 0; floorShadow.receiveShadow = true; scene.add(floorShadow);
    const grid = new THREE.GridHelper(600, 30, 0x5a3f8a, 0x3b2a5e); grid.position.y = 0.05; grid.material.opacity = 0.5; grid.material.transparent = true; scene.add(grid);
    neonLight = new THREE.PointLight(0xff00aa, 0, 220, 1.4); neonLight.position.set(0, 4, 0); scene.add(neonLight);
    camLight = new THREE.DirectionalLight(0xfff4e6, 0.35); scene.add(camLight); /* lampe de poche depuis la caméra : les armes sombres restent lisibles */
    scene.fog = new THREE.Fog(0x241740, 700, 1500);
    /* environnement réfléchi par les peintures et les métaux : une pièce sombre aux panneaux lumineux (générée ici, aucune image) */
    try {
      const env = new THREE.Scene(); env.background = new THREE.Color(0x4a3f66);
      const panel = (w, h, x, y, z, rx, ry, c, i) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: c })); m.position.set(x, y, z); m.rotation.set(rx, ry, 0); m.material.color.multiplyScalar(i); env.add(m); };
      panel(400, 120, 0, 260, 0, Math.PI / 2, 0, 0xffffff, 6); /* plafonnier */
      panel(300, 160, -320, 120, 0, 0, Math.PI / 2, 0xffe2c4, 3.2); panel(300, 160, 320, 120, 0, 0, -Math.PI / 2, 0xcfe0ff, 2.8);
      panel(500, 140, 0, 110, -340, 0, 0, 0xff8a5c, 2); panel(500, 140, 0, 110, 340, 0, Math.PI, 0x9b7bff, 1.6);
      const floorEnv = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), new THREE.MeshBasicMaterial({ color: 0x1c1526 })); floorEnv.rotation.x = -Math.PI / 2; env.add(floorEnv);
      const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(env, 0.04).texture; pm.dispose();
    } catch (e) { /* sans environnement : les lumières suffisent */ }
    resize();
    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(view); else window.addEventListener('resize', resize);
    return true;
  }
  function resize() {
    if (!renderer) return;
    const w = view.clientWidth || 640, h = view.clientHeight || 480;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); dirty = true; tick();
  }
  function placeCamera() {
    const o = orbit, ce = Math.cos(o.el), x = o.dist * ce * Math.sin(o.az), y = o.dist * Math.sin(o.el), z = o.dist * ce * Math.cos(o.az);
    camera.position.set(o.tx + x, Math.max(2, o.ty + y), o.tz + z); camera.lookAt(o.tx, o.ty, o.tz);
    if (camLight) { camLight.position.copy(camera.position); camLight.position.y += 60; camLight.intensity = group && group.userData.bounds && group.userData.bounds.weapon ? 1.1 : 0.35; }
  }
  function tick() {
    if (!renderer) return;
    if (raf) return; raf = window.requestAnimationFrame(frame);
  }
  let lastFrame = 0;
  function frame(now) {
    raf = 0;
    const o = orbit, dt = Math.min(0.1, Math.max(0.001, (now - (lastFrame || now)) / 1000)); lastFrame = now;
    if (o.goal) { /* glissement vers un angle choisi (selon le temps écoulé, pas le nombre d'images) */
      const g = o.goal, k = 1 - Math.exp(-dt / 0.11); o.az += (g.az - o.az) * k; o.el += (g.el - o.el) * k; o.dist += (g.dist - o.dist) * k;
      if (Math.abs(g.az - o.az) < 0.004 && Math.abs(g.el - o.el) < 0.004 && Math.abs(g.dist - o.dist) < 1) { o.az = g.az; o.el = g.el; o.dist = g.dist; o.goal = null; }
      dirty = true;
    }
    if (spinning && !o.goal && now - lastInput > 2500) { o.az += 0.22 * dt; dirty = true; }
    if (dirty) { placeCamera(); renderer.render(scene, camera); dirty = false; }
    if (spinning || o.goal) tick();
  }
  /* souris, doigt, molette */
  (function controls() {
    let drag = null, pinch = null;
    const touches = new Map();
    canvas.addEventListener('pointerdown', e => { canvas.setPointerCapture(e.pointerId); touches.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (touches.size === 1) drag = { x: e.clientX, y: e.clientY, az: orbit.az, el: orbit.el }; else if (touches.size === 2) { const [a, b] = [...touches.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), dist: orbit.dist }; drag = null; } lastInput = performance.now(); orbit.goal = null; });
    canvas.addEventListener('pointermove', e => {
      if (!touches.has(e.pointerId)) return; touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && touches.size === 2) { const [a, b] = [...touches.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); orbit.dist = clamp(pinch.dist * (pinch.d / Math.max(10, d)), 120, 1400); dirty = true; tick(); return; }
      if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      orbit.az = drag.az - dx * 0.008; orbit.el = clamp(drag.el + dy * 0.006, 0.02, 1.45); lastInput = performance.now(); dirty = true; tick();
    });
    const up = e => { touches.delete(e.pointerId); if (touches.size < 2) pinch = null; if (!touches.size) drag = null; lastInput = performance.now(); if (spinning) tick(); };
    canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('wheel', e => { e.preventDefault(); orbit.dist = clamp(orbit.dist * (1 + Math.sign(e.deltaY) * 0.08), 120, 1400); orbit.goal = null; lastInput = performance.now(); dirty = true; tick(); }, { passive: false });
    canvas.tabIndex = 0;
    canvas.addEventListener('keydown', e => { const k = e.key; if (k === 'ArrowLeft') orbit.az -= 0.12; else if (k === 'ArrowRight') orbit.az += 0.12; else if (k === 'ArrowUp') orbit.el = clamp(orbit.el + 0.08, 0.02, 1.45); else if (k === 'ArrowDown') orbit.el = clamp(orbit.el - 0.08, 0.02, 1.45); else if (k === '+' || k === '=') orbit.dist = clamp(orbit.dist * 0.9, 120, 1400); else if (k === '-') orbit.dist = clamp(orbit.dist * 1.1, 120, 1400); else return; e.preventDefault(); orbit.goal = null; lastInput = performance.now(); dirty = true; tick(); });
  })();
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  /* ---------- géométrie ---------- */
  const hexToColor = h => new THREE.Color('#' + String(h || '888888').replace('#', ''));
  const resample = (poly, step = 7) => { const out = []; for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length]; out.push(a); const d = Math.hypot(b[0] - a[0], b[1] - a[1]); const n = Math.floor(d / step); for (let k = 1; k <= n; k++) { const t = k / (n + 1); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); } } return out; };
  const shapeOf = (poly, fy) => { const s = new THREE.Shape(); poly.forEach(([x, y], i) => { const px = x - 120, py = fy(y); if (i) s.lineTo(px, py); else s.moveTo(px, py); }); s.closePath(); return s; };
  /* intersections d'une verticale x avec un polygone : [min y, max y] ou null */
  function slice(poly, x) {
    let lo = Infinity, hi = -Infinity;
    for (let i = 0; i < poly.length; i++) { const [x1, y1] = poly[i], [x2, y2] = poly[(i + 1) % poly.length]; if ((x1 <= x && x2 >= x) || (x2 <= x && x1 >= x)) { if (x1 === x2) { lo = Math.min(lo, y1, y2); hi = Math.max(hi, y1, y2); } else { const t = (x - x1) / (x2 - x1), y = y1 + (y2 - y1) * t; lo = Math.min(lo, y); hi = Math.max(hi, y); } } }
    return lo === Infinity ? null : [lo, hi];
  }
  /* largeur et profil de dessus d'un véhicule : hw(z) = demi-largeur à la coordonnée de longueur z */
  function lofter(top, parts) {
    const outline = top && top.outline;
    let HW = 0, cx = 60;
    if (outline) { let lo = Infinity, hi = -Infinity; for (const [, y] of outline) { lo = Math.min(lo, y); hi = Math.max(hi, y); } HW = (hi - lo) / 2; cx = (lo + hi) / 2; }
    if (!HW) HW = 30;
    let xa = Infinity, xb = -Infinity; if (outline) for (const [x] of outline) { xa = Math.min(xa, x); xb = Math.max(xb, x); }
    const hw = x => { if (!outline) return HW; const s = slice(outline, Math.min(xb - 0.2, Math.max(xa + 0.2, x))); if (!s) return 1.2; return Math.max(1.2, (s[1] - s[0]) / 2); };
    /* bord haut de la caisse (profil) à la coordonnée x */
    const topY = x => { let best = null; for (const p of parts) { const s = slice(p, x); if (s && (best === null || s[0] < best)) best = s[0]; } return best === null ? null : 100 - best; };
    const botY = x => { let best = null; for (const p of parts) { const s = slice(p, x); if (s && (best === null || s[1] > best)) best = s[1]; } return best === null ? null : 100 - best; };
    return { HW, hw, topY, botY, cx };
  }
  /* extrusion « loftée » : la silhouette (x le long de l'engin, y la hauteur) extrudée sur 2·HW puis resserrée par hw(x) */
  function loftMesh(poly, L, mat, widen = 0, fy = y => 100 - y) {
    const D = 2 * L.HW; const geo = new THREE.ExtrudeGeometry(shapeOf(resample(poly), fy), { depth: D, bevelEnabled: false, steps: 1 });
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i); const t = (z - D / 2) / (D / 2); pos.setXYZ(i, t * (L.hw(x + 120) + widen), y, x); }
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; return m;
  }
  /* extrusion simple, centrée sur X (épaisseur w) */
  function slabMesh(poly, w, mat, fy = y => 100 - y, x0 = 0) {
    const geo = new THREE.ExtrudeGeometry(shapeOf(poly, fy), { depth: w, bevelEnabled: false, steps: 1 });
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i); pos.setXYZ(i, x0 + z - w / 2, y, x); }
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; return m;
  }
  /* plaque posée sur la caisse (vitrage de la vue de dessus) */
  function drapeMesh(poly, L, mat, lift = 0.6) {
    const s = new THREE.Shape(); poly.forEach(([x, y], i) => { if (i) s.lineTo(x - 120, y - L.cx); else s.moveTo(x - 120, y - L.cx); }); s.closePath();
    const geo = new THREE.ShapeGeometry(s); const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) { const u = pos.getX(i), v = pos.getY(i); const ty = L.topY(u + 120); pos.setXYZ(i, v, (ty === null ? 20 : ty) + lift, u); }
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, mat); m.castShadow = false; return m;
  }
  const box = (w, h, d, mat, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; return m; };
  const cyl = (r, len, mat, x, y, z, axis = 'x', seg = 24) => { const g = new THREE.CylinderGeometry(r, r, len, seg); const m = new THREE.Mesh(g, mat); if (axis === 'x') m.rotation.z = Math.PI / 2; else if (axis === 'z') m.rotation.x = Math.PI / 2; m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; return m; };

  /* ---------- matières ---------- */
  const M = {};
  function paintMat(hex, finish) {
    const c = hexToColor(hex);
    const base = { color: c, flatShading: false, roughness: 0.35, metalness: 0.25, clearcoat: 1, clearcoatRoughness: 0.12 };
    if (finish === 'matte') Object.assign(base, { roughness: 0.92, metalness: 0.05, clearcoat: 0 });
    else if (finish === 'metal') Object.assign(base, { roughness: 0.32, metalness: 0.85, clearcoat: 0.6 });
    else if (finish === 'chrome') Object.assign(base, { color: c.clone().lerp(new THREE.Color(0xffffff), 0.75), roughness: 0.06, metalness: 1, clearcoat: 1, envMapIntensity: 1.6 });
    else if (finish === 'nacre') Object.assign(base, { roughness: 0.25, metalness: 0.3, clearcoat: 1, sheen: 1, sheenColor: new THREE.Color(0xffffff), sheenRoughness: 0.4, iridescence: 0.35, iridescenceIOR: 1.4 });
    else if (finish === 'cameleon') Object.assign(base, { roughness: 0.2, metalness: 0.75, clearcoat: 1, iridescence: 1, iridescenceIOR: 1.8, iridescenceThicknessRange: [120, 480] });
    return new THREE.MeshPhysicalMaterial(base);
  }
  const glassMat = tint => new THREE.MeshPhysicalMaterial({ color: new THREE.Color(0x9fc4e8).lerp(new THREE.Color(0x05060a), tint / 100), roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.45 + 0.55 * tint / 100, clearcoat: 1, side: THREE.DoubleSide });
  const dark = new THREE.MeshStandardMaterial({ color: 0x17161b, roughness: 0.85, metalness: 0.1 });
  const tyreMat = new THREE.MeshStandardMaterial({ color: 0x141418, roughness: 0.95, metalness: 0 });
  const steel = new THREE.MeshStandardMaterial({ color: 0x9a9ca3, roughness: 0.35, metalness: 0.9 });
  const lampMat = (hex, on) => new THREE.MeshStandardMaterial({ color: on ? hexToColor(hex) : 0xdedad0, emissive: on ? hexToColor(hex) : 0x000000, emissiveIntensity: on ? 1.6 : 0, roughness: 0.3, metalness: 0.2 });
  const tailMat = on => new THREE.MeshStandardMaterial({ color: 0xff3b2a, emissive: 0xff2a1a, emissiveIntensity: on ? 1.2 : 0.15, roughness: 0.4 });
  function plateTexture(text, style) {
    const c = document.createElement('canvas'); c.width = 256; c.height = 96; const g = c.getContext('2d');
    const bg = { blue: ['#dfe9ff', '#1d3f8f'], white: ['#f6f3ea', '#1a1a1e'], yellow: ['#f6cf3a', '#1a1a1e'], black: ['#1a1a1e', '#f6f3ea'] }[style] || ['#dfe9ff', '#1d3f8f'];
    g.fillStyle = bg[0]; g.fillRect(0, 0, 256, 96); g.strokeStyle = bg[1]; g.lineWidth = 6; g.strokeRect(5, 5, 246, 86);
    g.fillStyle = bg[1]; g.font = '900 54px Archivo, system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText((text || 'LEONIDA').slice(0, 8).toUpperCase(), 128, 54);
    g.font = '800 13px Archivo, system-ui, sans-serif'; g.fillText('LEONIDA', 128, 16);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  function camoTexture(kind) {
    const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
    const P = { woodland: ['#4a5a35', '#2f3a22', '#6b7246', '#1e2416'], desert: ['#c9b07a', '#a98c5a', '#e0cf9c', '#8a7147'], tropical: ['#1f7a5a', '#f06aa8', '#2fb3a0', '#f5c542'], urban: ['#8c8f96', '#4a4d55', '#c3c6cc', '#2b2d33'] }[kind] || ['#555', '#333', '#777', '#222'];
    g.fillStyle = P[0]; g.fillRect(0, 0, 256, 256);
    let seed = 7; const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    for (let i = 0; i < 70; i++) { g.fillStyle = P[1 + (i % 3)]; g.beginPath(); const x = rnd() * 256, y = rnd() * 256, r = 10 + rnd() * 26; if (kind === 'tropical' && i % 3 === 0) { /* palmes */ for (let k = 0; k < 7; k++) { const a = rnd() * Math.PI * 2; g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a) * r, y + Math.sin(a) * r, x + Math.cos(a + .5) * r * 1.3, y + Math.sin(a + .5) * r * 1.3); } g.lineWidth = 4; g.strokeStyle = P[1 + (i % 3)]; g.stroke(); } else { g.ellipse(x, y, r, r * (0.5 + rnd()), rnd() * 3, 0, Math.PI * 2); g.fill(); } }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1 / 60, 1 / 60); t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  const FIN = { black: ['41424b', 0.55, 0.42], army: ['4b5a3c', 0.3, 0.6], orange: ['e8702a', 0.3, 0.45], lspd: ['2f5fe0', 0.3, 0.45], pink: ['f06aa8', 0.3, 0.45], gold: ['d4a62a', 0.95, 0.22], platinum: ['d8dbe0', 1, 0.18], chrome: ['f0f0f0', 1, 0.07] };
  function gunMat(s) {
    const f = FIN[s.finish] || null, hex = f ? f[0] : s.finishColor, opts = { color: hexToColor(hex), roughness: f ? f[2] : 0.45, metalness: f ? f[1] : 0.35 };
    if (s.camo !== 'none') { opts.map = camoTexture(s.camo); opts.color = new THREE.Color(0xffffff); opts.metalness = 0.15; opts.roughness = 0.7; }
    return new THREE.MeshStandardMaterial(opts);
  }

  /* ---------- maquette d'un véhicule ---------- */
  function buildVehicle(d, s) {
    const g = new THREE.Group(), L = lofter(d.top, d.parts), parts = d.parts || [];
    const paint = paintMat(s.paint, s.finish), paint2 = paintMat(s.paint2, s.finish === 'chrome' ? 'chrome' : 'gloss');
    const wheelsIn = d.wheels || [], two = !!d.two;
    const rOrig = wheelsIn.length ? wheelsIn[0][2] : 0, rNew = rOrig ? Math.max(5, rOrig + [-2, 0, 2, 5][s.rimSize + 1]) : 0;
    const liftBody = (rOrig ? rNew - rOrig : 0) + [-3.5, -1.8, 0, 4][s.susp + 2] + (d.extra && d.extra.includes('lift') ? 0 : 0);
    const body = new THREE.Group(); body.position.y = liftBody; g.add(body);
    /* bornes de la caisse (le long de l'engin) */
    let z0 = Infinity, z1 = -Infinity, yTop = 0, yBot = 100;
    for (const p of parts) for (const [x, y] of p) { z0 = Math.min(z0, x - 120); z1 = Math.max(z1, x - 120); yTop = Math.max(yTop, 100 - y); yBot = Math.min(yBot, 100 - y); }
    if (!parts.length) { z0 = -100; z1 = 100; yTop = 40; }
    const bb = p => { let a = Infinity, b = Infinity, c = -Infinity, e = -Infinity; for (const [x, y] of p) { a = Math.min(a, x); b = Math.min(b, y); c = Math.max(c, x); e = Math.max(e, y); } return { x0: a, y0: b, x1: c, y1: e, w: c - a, h: e - b }; };
    /* silhouettes : la plus grande est la caisse (peinture principale), les petites pièces hautes sont des rétroviseurs */
    let main = null, mainA = 0; parts.forEach(p => { const b = bb(p); if (b.w * b.h > mainA) { mainA = b.w * b.h; main = p; } });
    for (const p of parts) {
      const b = bb(p), isMain = p === main;
      if (!isMain && b.w < 13 && b.h < 9 && b.y0 < 72 && !two) { /* rétroviseur : une paire sur les flancs */
        const z = (b.x0 + b.x1) / 2 - 120, hw = L.hw((b.x0 + b.x1) / 2);
        for (const sgn of [-1, 1]) { const m = slabMesh(p, 3.2, paint2, y => 100 - y, sgn * (hw + 1.4)); body.add(m); }
        continue;
      }
      if (two) body.add(slabMesh(p, isMain ? 8 : Math.max(2.5, Math.min(6, b.h * 0.5)), isMain ? paint : paint2));
      else body.add(loftMesh(p, L, isMain ? paint : paint2, 0));
    }
    /* vitres latérales (voile du profil) ; pare-brise et lunette (vue de dessus) */
    const glass = glassMat(s.tint);
    for (const p of d.glass || []) body.add(two ? slabMesh(p, 9, glass) : loftMesh(p, L, glass, 0.6));
    if (!two) for (const p of (d.top && d.top.glass) || []) body.add(drapeMesh(p, L, glass));
    /* avions, hélicoptères : ailes, stabilisateurs, pales (vue de dessus) posés à mi-hauteur de la caisse */
    if (d.kind === 'plane' || d.kind === 'heli') for (const p of (d.top && d.top.plates) || []) {
      const sh = new THREE.Shape(); p.forEach(([x, y], i) => { if (i) sh.lineTo(x - 120, y - L.cx); else sh.moveTo(x - 120, y - L.cx); }); sh.closePath();
      const geo = new THREE.ExtrudeGeometry(sh, { depth: 2.4, bevelEnabled: false }); const pos = geo.attributes.position;
      let mx = 0; for (const [x] of p) mx += x; mx = mx / p.length;
      const ty = L.topY(mx), by = L.botY(mx), yy = ty === null || by === null ? yTop * 0.55 : (d.kind === 'heli' ? ty + 2 : (ty + by) / 2);
      for (let i = 0; i < pos.count; i++) { const u = pos.getX(i), v = pos.getY(i), w = pos.getZ(i); pos.setXYZ(i, v, yy + w, u); }
      geo.computeVertexNormals(); const m = new THREE.Mesh(geo, paint2); m.castShadow = true; m.receiveShadow = true; body.add(m);
    }
    /* roues */
    const tw = two ? (d.kind === 'bike' ? 2.6 : 5.5) : (s.tyres === 'tt' ? 11 : s.tyres === 'slick' ? 7 : 9);
    const rimMat = new THREE.MeshStandardMaterial({ color: hexToColor(s.rim), roughness: 0.3, metalness: 0.9 });
    for (const [cx, cy, r] of wheelsIn) {
      const z = cx - 120, rr = Math.max(4, r + (rNew - rOrig)), y = rr;
      const xs = two ? [0] : [-(L.hw(cx) - tw / 2 + 1.2), L.hw(cx) - tw / 2 + 1.2];
      for (const x of xs) {
        const t = cyl(rr, tw, tyreMat, x, y, z, 'x', 28); g.add(t);
        const rim = cyl(rr * 0.62, tw + 0.6, rimMat, x, y, z, 'x', 20); g.add(rim);
        const hub = cyl(rr * 0.2, tw + 1.2, dark, x, y, z, 'x', 12); g.add(hub);
      }
    }
    /* feux (vue de face et d'arrière) */
    const lightsOn = s.lights !== 'off', lc = s.lights === 'xenon' ? 'dff4ff' : s.lights === 'color' ? s.lightColor : 'ffe9b8';
    const placeLights = (face, zf, mat, dir) => {
      if (!face || !face.w) return; const half = face.w / 2, cxF = (face.x0 + face.x1) / 2;
      for (const [x, y, w, h] of face.lights || []) {
        const lx = ((x + w / 2) - cxF) / half, ly = (100 - (y + h / 2)) / KV;
        const hw = L.hw(zf + 120 - dir * 4);
        body.add(box(Math.max(2, w / half * hw), Math.max(1.5, h / KV), 2.4, mat, lx * (hw - 1), ly, zf + dir * 0.8));
      }
    };
    if (!two) { placeLights(d.front, z1, lampMat(lc, lightsOn), 1); placeLights(d.rear, z0, tailMat(lightsOn), -1); }
    if (lightsOn && !two) { const hl = new THREE.SpotLight(hexToColor(lc), 60, 320, 0.55, 0.6, 1.2); hl.position.set(0, 14, z1); hl.target.position.set(0, 0, z1 + 160); body.add(hl); body.add(hl.target); }
    /* plaque arrière */
    if (!two && d.kind !== 'boat' && d.kind !== 'plane' && d.kind !== 'heli' && d.kind !== 'rail') {
      const pm = new THREE.MeshStandardMaterial({ map: plateTexture(s.plate, s.plateStyle), roughness: 0.5 });
      body.add(box(16, 6, 0.8, pm, 0, Math.max(6, (yBot + 9)), z0 - 0.3));
    }
    /* options de carrosserie */
    const hwMid = L.hw(120), zc = (z0 + z1) / 2, yc = L.topY(120) || yTop;
    if (s.aileron && !two) { const zr = z0 + 8, yr = (L.topY(zr + 120) || yTop) + 7, w = 2 * L.hw(zr + 120) * 0.92; body.add(box(w, 1.6, 9, paint2, 0, yr, zr)); body.add(box(2, 7, 4, paint2, -w / 2 + 4, yr - 3.5, zr)); body.add(box(2, 7, 4, paint2, w / 2 - 4, yr - 3.5, zr)); }
    if (s.jupes && !two) { for (const sgn of [-1, 1]) body.add(box(1.4, 3, (z1 - z0) * 0.62, paint2, sgn * (hwMid + 0.2), yBot + 1.5, zc)); }
    if (s.capot && !two) { const zh = z1 - 30, yh = (L.topY(zh + 120) || yTop) + 1.2; body.add(box(14, 2.6, 12, paint2, 0, yh, zh)); }
    if (s.toit && !two) { const w = 2 * L.hw(zc + 120) * 0.82; for (const dz of [-12, 12]) body.add(box(w, 1.8, 2, dark, 0, yc + 2.2, zc + dz)); for (const sgn of [-1, 1]) body.add(box(2, 1.6, 30, dark, sgn * w / 2, yc + 1.4, zc)); }
    if (s.bullbar && !two) { const zf = z1 + 3, yf = yBot + 4, ht = ((L.topY(z1 + 118) || yTop) - yBot) * 0.5, w = 2 * L.hw(z1 + 114) * 0.7; body.add(box(w, 2.2, 2.2, steel, 0, yf + ht, zf)); body.add(box(2.2, ht + 2, 2.2, steel, -w / 2 + 1, yf + ht / 2, zf)); body.add(box(2.2, ht + 2, 2.2, steel, w / 2 - 1, yf + ht / 2, zf)); body.add(box(w * 0.5, 2.2, 2.2, steel, 0, yf + ht * 0.45, zf)); }
    if (s.exhaust && !two) { for (const sgn of [-1, 1]) body.add(cyl(1.8, 8, steel, sgn * hwMid * 0.55, yBot + 2.5, z0 - 1, 'z', 14)); }
    if (s.arceau && !two) { const w = 2 * L.hw(zc + 120) * 0.86; for (const dz of [-22, 22]) { body.add(box(w, 1.6, 1.6, steel, 0, yc + 2.6, zc + dz)); for (const sgn of [-1, 1]) body.add(box(1.6, 3.2, 1.6, steel, sgn * w / 2, yc + 1.4, zc + dz)); } for (const sgn of [-1, 1]) body.add(box(1.6, 1.6, 44, steel, sgn * w / 2, yc + 2.6, zc)); }
    if (s.stripes && !two) { const smat = new THREE.MeshStandardMaterial({ color: hexToColor(s.stripeColor), roughness: 0.5, metalness: 0.1 }); for (const sgn of [-1, 1]) body.add(stripMesh(L, z0 + 4, z1 - 4, sgn * hwMid * 0.2, hwMid * 0.16, smat)); }
    /* néons */
    if (s.neon && !two) { const nc = hexToColor(s.neonColor); const pl = new THREE.Mesh(new THREE.PlaneGeometry(2 * hwMid * 0.96, (z1 - z0) * 0.88), new THREE.MeshBasicMaterial({ color: nc, transparent: true, opacity: 0.7 })); pl.rotation.x = -Math.PI / 2; pl.position.set(0, 0.35, zc); g.add(pl); const glow = new THREE.Mesh(new THREE.PlaneGeometry(2 * hwMid * 1.5, (z1 - z0) * 1.15), new THREE.MeshBasicMaterial({ color: nc, transparent: true, opacity: 0.22 })); glow.rotation.x = -Math.PI / 2; glow.position.set(0, 0.25, zc); g.add(glow); neonLight.color.copy(nc); neonLight.intensity = 180; neonLight.position.set(0, 3, zc); } else neonLight.intensity = 0;
    g.userData.bounds = { z0, z1, yTop: yTop + liftBody, hw: L.HW };
    return g;
  }
  /* bande longitudinale posée sur la caisse */
  function stripMesh(L, zA, zB, x, w, mat) {
    const n = Math.max(2, Math.round((zB - zA) / 5)), pos = [], idx = [];
    for (let i = 0; i <= n; i++) { const z = zA + (zB - zA) * i / n, y = (L.topY(z + 120) || 0) + 0.55, hw = L.hw(z + 120); const xx = Math.min(Math.abs(x), hw - w) * Math.sign(x); pos.push(xx - w / 2, y, z, xx + w / 2, y, z); if (i < n) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
    return new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: mat.color, roughness: 0.5, side: THREE.DoubleSide }));
  }

  /* ---------- maquette d'une arme ---------- */
  function buildWeapon(d, s) {
    const g = new THREE.Group(), parts = d.parts || [], mat = gunMat(s), fy = y => 60 - y, round = d.cat === 'melee' || d.cat === 'projectile';
    const bb = p => { let a = Infinity, b = Infinity, c = -Infinity, e = -Infinity; for (const [x, y] of p) { a = Math.min(a, x); b = Math.min(b, y); c = Math.max(c, x); e = Math.max(e, y); } return { x0: a, y0: b, x1: c, y1: e, w: c - a, h: e - b }; };
    let main = null, mainA = 0, low = null, lowY = -1;
    for (const p of parts) { const b = bb(p); if (b.w * b.h > mainA) { mainA = b.w * b.h; main = p; } if (b.y1 > lowY && b.w < 60) { lowY = b.y1; low = p; } }
    const gripMat = s.engrave ? new THREE.MeshStandardMaterial({ color: 0x8a5a2b, roughness: 0.6, map: camoTexture('tropical'), metalness: 0.05 }) : mat;
    for (const p of parts) { const b = bb(p); const th = round ? Math.max(4, Math.min(16, b.h * 0.95)) : Math.max(3, Math.min(8, b.h * 0.8)); const isGrip = s.engrave && b.h > 25 && b.w < 40 && b.y1 > 90; g.add(slabMesh(p, th, isGrip ? gripMat : mat, fy)); }
    const mb = main ? bb(main) : { x0: 40, x1: 200, y0: 50, y1: 70, w: 160, h: 20 }, [mx, my] = d.muzzle || [mb.x1, (mb.y0 + mb.y1) / 2];
    const topY = 60 - mb.y0, cx = (mb.x0 + mb.x1) / 2 - 120, mzx = mx - 120, mzy = 60 - my, lb = low ? bb(low) : null;
    const acc = new THREE.MeshStandardMaterial({ color: 0x24242a, roughness: 0.55, metalness: 0.35 });
    /* pièces posées : la longueur de l'arme suit l'axe Z, l'épaisseur l'axe X */
    const wbox = (len, h, th, y, lx, m = acc) => box(th, h, len, m, 0, y, lx);
    const wcyl = (r, len, y, lx, m = acc, seg = 20) => cyl(r, len, m, 0, y, lx, 'z', seg);
    /* chargeur */
    if (lb && s.mag !== 'std') { const lx = (lb.x0 + lb.x1) / 2 - 120, ly = 60 - lb.y1; if (s.mag === 'ext') g.add(wbox(Math.max(8, lb.w * 0.9), 14, 5, ly - 7, lx)); else if (s.mag === 'drum') g.add(cyl(11, 7, acc, 0, ly - 4, lx, 'x', 28)); else g.add(wbox(24, 16, 10, ly - 6, lx)); }
    /* viseur ou lunette */
    if (s.sight !== 'none') { const y = topY + 2; if (s.sight === 'holo') g.add(wbox(11, 6, 6, y + 3, cx)); else { const long = s.sight !== 'scope', r = long ? 4.2 : 3.4, len = long ? 44 : 34; g.add(wcyl(r, len, y + r + 3, cx)); g.add(wbox(4, 5, 5, y + 2.5, cx - 12)); g.add(wbox(4, 5, 5, y + 2.5, cx + 12)); if (s.sight === 'night' || s.sight === 'thermal') g.add(wcyl(r + 1.6, 8, y + r + 3, cx + len / 2 + 2)); g.add(wcyl(r * 0.8, 1, y + r + 3, cx + len / 2 + (s.sight === 'night' || s.sight === 'thermal' ? 6.6 : 0.6), new THREE.MeshStandardMaterial({ color: s.sight === 'thermal' ? 0xff7a3a : s.sight === 'night' ? 0x58ff8a : 0x9fd8ff, emissive: 0x224466, roughness: 0.1, metalness: 0.4 }))); } }
    /* canon */
    if (s.barrel === 'silencer') g.add(wcyl(4.4, 28, mzy, mzx + 14));
    else if (s.barrel === 'comp') g.add(wbox(9, 7, 7, mzy, mzx + 4.5));
    else if (s.barrel === 'brake') { g.add(wcyl(3.8, 10, mzy, mzx + 5, acc, 12)); for (const k of [-2.5, 0, 2.5]) g.add(wbox(1.2, 9, 1.2, mzy, mzx + 5 + k, dark)); }
    else if (s.barrel === 'heavy') g.add(wcyl(3.6, 40, mzy, mzx - 20));
    /* poignée, lampe, laser */
    if (s.grip) g.add(wbox(5, 12, 5, (60 - mb.y1) - 6, cx + 38));
    if (s.lamp) g.add(wcyl(2.6, 9, mzy - 6, mzx - 24, acc, 12));
    if (s.laser) { g.add(wbox(5, 4, 4, mzy - 6, mzx - 30)); const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, mzy - 6, mzx - 27), new THREE.Vector3(0, mzy - 6, mzx + 190)]); g.add(new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xff2a3a, transparent: true, opacity: 0.85 }))); g.add(cyl(0.5, 0.5, new THREE.MeshBasicMaterial({ color: 0xff3a4a }), 0, mzy - 6, mzx - 27, 'z', 8)); }
    let lowest = Infinity, highest = -Infinity; for (const p of parts) for (const [, y] of p) { lowest = Math.min(lowest, 60 - y); highest = Math.max(highest, 60 - y); }
    if (lowest === Infinity) { lowest = -20; highest = 20; }
    g.position.y = 10 - lowest;
    g.userData.bounds = { z0: mb.x0 - 120, z1: mb.x1 - 120, yTop: highest - lowest + 10, hw: 10, weapon: true };
    return g;
  }

  /* ---------- la scène : charger, bâtir, cadrer ---------- */
  async function loadModel(fam, id) {
    const key = fam + '/' + id; if (cache.has(key)) return cache.get(key);
    const r = await fetch(new URL((fam === 'v' ? 'vehicules/' : 'armes/') + encodeURIComponent(id) + '.json', DATA)); if (!r.ok) throw new Error('data'); const d = await r.json(); cache.set(key, d); return d;
  }
  let building = 0;
  function rebuild(recenter) {
    if (!renderer || !st.data) return;
    window.cancelAnimationFrame(building);
    building = window.requestAnimationFrame(() => {
      if (group) { scene.remove(group); group.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material && o.material.map) o.material.map.dispose(); if (o.material) o.material.dispose(); }); }
      try { group = st.fam === 'v' ? buildVehicle(st.data, st.s) : buildWeapon(st.data, st.s); } catch (e) { group = new THREE.Group(); }
      scene.add(group);
      const b = group.userData.bounds || { z0: -100, z1: 100, yTop: 40, hw: 40 };
      orbit.tx = 0; orbit.tz = (b.z0 + b.z1) / 2; orbit.ty = b.weapon ? b.yTop * 0.5 + 4 : Math.max(10, b.yTop * 0.45);
      if (recenter) { const size = Math.max(b.z1 - b.z0, 2 * b.hw, b.yTop); orbit.dist = size * (b.weapon ? 1.9 : 1.75) + 60; }
      dirty = true; tick();
    });
  }
  const ANGLES = { tq: [0.62, 0.36], profil: [Math.PI / 2, 0.14], face: [0, 0.16], arriere: [Math.PI, 0.16], dessus: [0.001, 1.42] };
  function goAngle(name) {
    const a = ANGLES[name] || ANGLES.tq; const b = group && group.userData.bounds;
    const size = b ? Math.max(b.z1 - b.z0, 2 * b.hw, b.yTop) : 200;
    const az = ((orbit.az % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI); let target = a[0]; while (target - az > Math.PI) target -= 2 * Math.PI; while (az - target > Math.PI) target += 2 * Math.PI;
    orbit.az = az; const goal = { az: target, el: a[1], dist: size * (b && b.weapon ? 1.9 : 1.75) + 60 };
    if (reduced) { Object.assign(orbit, goal); dirty = true; } else orbit.goal = goal;
    lastInput = performance.now() + 4000; tick();
    $$('[data-at-angle]').forEach(x => { const on = x.dataset.atAngle === name; x.classList.toggle('is-on', on); x.setAttribute('aria-pressed', String(on)); });
  }

  /* ---------- interface : catalogue des modèles ---------- */
  const lists = { v: $('[data-at-list="v"]'), a: $('[data-at-list="a"]') }, items = $$('.at-item'), search = $('[data-at-search]'), catSels = { v: $('[data-at-catsel="v"]'), a: $('[data-at-catsel="a"]') };
  function filterList() {
    const q = (search.value || '').trim().toLowerCase(), cat = catSels[st.fam].value; let n = 0;
    for (const it of items) { if (it.dataset.atPick !== st.fam) continue; const ok = (!q || it.dataset.atQ.includes(q)) && (!cat || it.dataset.atCat === cat); it.parentNode.hidden = !ok; if (ok) n++; }
    $('[data-at-empty]').hidden = n > 0;
  }
  function setFam(f) {
    st.fam = f;
    $$('[data-at-fam-b]').forEach(b => { const on = b.dataset.atFamB === f; b.classList.toggle('is-on', on); b.setAttribute('aria-selected', String(on)); });
    lists.v.hidden = f !== 'v'; lists.a.hidden = f !== 'a'; catSels.v.hidden = f !== 'v'; catSels.a.hidden = f !== 'a';
    $$('[data-at-menu]').forEach(m => { m.hidden = m.dataset.atMenu !== f; });
    filterList();
  }
  async function pick(fam, id, keepState) {
    if (fam !== st.fam) setFam(fam);
    st.id = id; const it = items.find(x => x.dataset.atPick === fam && x.dataset.atId === id); if (!it) return;
    items.forEach(x => x.classList.toggle('is-on', x === it));
    /* fait défiler la liste seulement (pas la page : scrollIntoView remonterait aussi la fenêtre à l'ouverture) */
    const box = it.closest('.at-lists'); if (box) { const r = it.getBoundingClientRect(), br = box.getBoundingClientRect(); if (r.top < br.top) box.scrollTop += r.top - br.top; else if (r.bottom > br.bottom) box.scrollTop += r.bottom - br.bottom; }
    st.cat = it.dataset.atCat;
    if (!keepState) st.s = Object.assign({}, DEF[fam]);
    $('[data-at-name]').textContent = it.querySelector('.at-item-n').textContent; $('[data-at-model-cat]').textContent = it.querySelector('.at-item-c').textContent;
    $('[data-at-fiche]').href = (fam === 'v' ? 'vehicules/' : 'armes/') + encodeURIComponent(id) + '.html';
    $('[data-at-perso]').href = 'personnalisations.html#perso-' + (fam === 'v' ? 'vehicules' : 'armes') + '=' + encodeURIComponent(id); /* l'ancre choisit ce modèle dans la liste (catalogue.js) */
    applyCompat(); reflect(); summary();
    if (!renderer) return;
    loading.hidden = false;
    try { st.data = await loadModel(fam, id); } catch (e) { st.data = null; loading.hidden = true; return; }
    loading.hidden = true; rebuild(true);
    if (!spinning) goAngle('tq');
  }
  /* ---------- interface : options ---------- */
  function applyCompat() {
    const fam = st.fam, cat = st.cat, menu = $('[data-at-menu="' + fam + '"]');
    $$('[data-at-compat]', menu).forEach(el => { const c = el.dataset.atCompat.split(' ').filter(Boolean); el.hidden = c.length ? !c.includes(cat) : false; });
    $$('[data-at-group]', menu).forEach(gr => { const any = $$('.at-opt', gr).some(o => !o.hidden); const btn = $('[data-at-cat="' + gr.dataset.atGroup + '"]', menu); if (btn) btn.classList.toggle('is-off', !any); });
    /* ouvrir le premier atelier disponible si l'actuel est vide */
    const on = $('.at-cat.is-on', menu); if (on && on.classList.contains('is-off')) { const first = $$('.at-cat', menu).find(b => !b.classList.contains('is-off')); if (first) showGroup(fam, first.dataset.atCat); }
  }
  function showGroup(fam, id) {
    const menu = $('[data-at-menu="' + fam + '"]');
    $$('.at-cat', menu).forEach(b => { const on = b.dataset.atCat === id; b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', String(on)); });
    $$('[data-at-group]', menu).forEach(gr => { gr.hidden = gr.dataset.atGroup !== id; gr.classList.toggle('is-on', gr.dataset.atGroup === id); });
  }
  const val = inp => inp.type === 'checkbox' ? (inp.checked ? 1 : 0) : inp.type === 'color' ? inp.value.replace('#', '').toUpperCase() : inp.type === 'range' ? +inp.value : inp.type === 'text' ? inp.value.toUpperCase().replace(/[^A-Z0-9 ]/g, '').slice(0, 8) : (NUM.has(inp.dataset.atK) ? +inp.value : inp.value);
  function reflect() {
    const menu = $('[data-at-menu="' + st.fam + '"]');
    for (const inp of $$('[data-at-k]', menu)) {
      const k = inp.dataset.atK, v = st.s[k]; if (v === undefined) continue;
      if (inp.type === 'checkbox') inp.checked = !!v;
      else if (inp.type === 'radio') inp.checked = String(inp.value).toUpperCase() === String(v).toUpperCase();
      else if (inp.type === 'color') { if (/^[0-9A-F]{6}$/i.test(String(v))) inp.value = '#' + v; }
      else if (inp.type === 'range' || inp.type === 'text') inp.value = v;
    }
    const out = $('[data-at-out="tint"]', menu); if (out) out.textContent = st.s.tint + ' %';
    /* une couleur libre choisie : aucune pastille cochée */
    for (const grp of ['paint', 'paint2', 'stripeColor', 'rim', 'neonColor', 'lightColor']) { const v = st.s[grp]; if (v === undefined) continue; const radios = $$('input[type="radio"][data-at-k="' + grp + '"]', menu); if (!radios.some(r => r.checked)) { const c = $('input[type="color"][data-at-k="' + grp + '"]', menu); if (c) c.value = '#' + v; } }
  }
  $$('[data-at-menu]').forEach(menu => menu.addEventListener('input', e => {
    const inp = e.target; if (!inp.dataset || !inp.dataset.atK) return;
    if (inp.type === 'radio' && !inp.checked) return;
    st.s[inp.dataset.atK] = val(inp);
    if (inp.type === 'color') { $$('input[type="radio"][data-at-k="' + inp.dataset.atK + '"]', menu).forEach(r => { r.checked = false; }); }
    const out = $('[data-at-out="' + inp.dataset.atK + '"]', menu); if (out) out.textContent = st.s[inp.dataset.atK] + ' %';
    summary(); rebuild(false);
  }));
  $$('.at-cat[data-at-cat]').forEach(b => b.addEventListener('click', () => { if (!b.classList.contains('is-off')) showGroup(b.closest('[data-at-menu]').dataset.atMenu, b.dataset.atCat); }));

  /* ---------- postes actifs, total, options choisies ---------- */
  function activePostes() {
    const s = st.s, cat = st.cat, out = [];
    if (st.fam === 'v') {
      out.push('peinture-principale'); if (s.finish === 'nacre') out.push('nacre'); if (s.finish === 'cameleon') out.push('cameleon');
      if (s.paint2 !== DEF.v.paint2) out.push('peinture-secondaire'); if (s.stripes) out.push('livrees-serie');
      if (s.rim !== DEF.v.rim) out.push('couleur-jantes'); if (s.rimSize) out.push(s.rimSize === 2 ? 'jantes-donk' : 'jantes-familles');
      if (s.tyres === 'tt') out.push('pneus-tout-terrain'); if (s.tyres === 'slick') out.push('pneus-faible-adherence');
      for (const [k, p] of [['aileron', 'aileron'], ['jupes', 'jupes'], ['capot', 'capot'], ['toit', 'toit'], ['bullbar', 'pare-chocs-tout-terrain'], ['exhaust', 'echappement'], ['arceau', 'arceau'], ['turbo', 'turbo'], ['moteur', 'moteur-ems'], ['freins', 'freins'], ['transmission', 'transmission'], ['blindage', 'blindage']]) if (s[k]) out.push(p);
      if (s.tint >= 100) out.push('vitres-noir-pur'); else if (s.tint !== DEF.v.tint) out.push('vitres-teintees');
      if (s.neon) out.push('neons-couleur', 'neons-disposition');
      if (s.susp < 0) out.push('suspension-niveaux'); if (s.susp > 0) out.push('suspension-rehaussee');
      if (s.lights === 'xenon') out.push('phares-xenon'); if (s.lights === 'color') out.push('phares-couleur');
      if (s.plate !== DEF.v.plate || s.plateStyle !== DEF.v.plateStyle) out.push('plaques');
    } else {
      if (s.finish === 'gold') out.push(cat === 'assaut' ? 'finition-doree' : 'teintes'); else if (s.finish === 'chrome' || s.finish === 'platinum') out.push('teintes-mk2'); else if (s.finish !== 'black') out.push('teintes');
      if (s.camo === 'tropical') out.push('motif-vintage-vice-city'); else if (s.camo !== 'none') out.push('camouflages-mk2');
      if (s.engrave) out.push('crosses-gravees');
      if (s.mag === 'ext') out.push('chargeur-etendu'); if (s.mag === 'drum') out.push('chargeur-tambour'); if (s.mag === 'box') out.push('chargeur-caisson');
      if (s.sight === 'holo') out.push('viseur-holographique'); if (s.sight === 'scope') out.push(cat === 'pistolet' ? 'lunette-montee-pistolet' : 'lunette'); if (s.sight === 'scope2') out.push('lunettes-mk2'); if (s.sight === 'night') out.push('lunette-nocturne'); if (s.sight === 'thermal') out.push('lunette-thermique');
      if (s.barrel === 'silencer') out.push('silencieux'); if (s.barrel === 'comp') out.push('compensateur'); if (s.barrel === 'brake') out.push('freins-de-bouche'); if (s.barrel === 'heavy') out.push('canon-lourd');
      if (s.grip) out.push('poignee'); if (s.lamp) out.push('lampe-tactique'); if (s.laser) out.push('laser');
      const AM = { tracer: 'munitions-tracantes', incend: 'munitions-incendiaires', ap: 'munitions-perforantes', hp: 'munitions-creuses', fmj: 'munitions-blindees', explo: 'munitions-explosives' }; if (AM[s.ammo]) out.push(AM[s.ammo]);
    }
    return [...new Set(out)];
  }
  const fmtMoney = n => { const lang = (document.documentElement.lang || 'fr').slice(0, 2), s = n.toLocaleString(lang === 'en' ? 'en-US' : lang === 'de' ? 'de-DE' : lang === 'es' ? 'es-ES' : lang === 'it' ? 'it-IT' : 'fr-FR'); return lang === 'en' ? '$' + s : s + ' $'; };
  function summary() {
    const menu = $('[data-at-menu="' + st.fam + '"]'), act = activePostes(), pre = 'perso-' + (st.fam === 'v' ? 'vehicules' : 'armes') + '-';
    $$('[data-at-menu] .at-poste.is-on').forEach(a => { if (!menu.contains(a)) a.classList.remove('is-on'); });
    let total = 0, unknown = 0; const seen = new Set();
    $$('.at-poste', menu).forEach(a => { const id = (a.getAttribute('href').split('#')[1] || '').replace(pre, ''); const on = act.includes(id); a.classList.toggle('is-on', on); if (on && !seen.has(id)) { seen.add(id); const p = a.dataset.atPrix; if (p !== '') total += +p; else unknown++; } });
    $('[data-at-total]').textContent = fmtMoney(total); $('[data-at-total-note]').hidden = unknown === 0;
    /* options choisies : les libellés cochés hors valeur par défaut */
    const chosen = $('[data-at-chosen]'); chosen.textContent = '';
    for (const inp of $$('[data-at-k]', menu)) {
      const k = inp.dataset.atK, v = st.s[k], d = DEF[st.fam][k]; if (v === undefined || String(v).toUpperCase() === String(d).toUpperCase()) continue;
      if (inp.type === 'checkbox' && v) { const li = document.createElement('li'); li.textContent = inp.closest('label').querySelector('span').textContent; chosen.appendChild(li); }
      else if (inp.type === 'radio' && inp.checked && !inp.closest('.at-sw')) { const li = document.createElement('li'); const grp = inp.closest('.at-rad'), lg = (grp && grp.dataset.label) || inp.closest('fieldset').querySelector('legend').textContent; li.innerHTML = '<span></span>'; li.firstChild.textContent = lg + ' : '; li.appendChild(document.createTextNode(inp.nextElementSibling.textContent)); chosen.appendChild(li); }
      else if (inp.type === 'radio' && inp.checked && inp.closest('.at-sw')) { const li = document.createElement('li'); const grp = inp.closest('.at-sw'), lg = (grp && grp.dataset.label) || inp.closest('fieldset').querySelector('legend').textContent; li.innerHTML = '<span></span><i class="at-chosen-sw"></i>'; li.firstChild.textContent = lg + ' : '; li.lastChild.style.cssText = 'display:inline-block;width:12px;height:12px;border-radius:50%;border:1px solid #1A1A1E;background:#' + v; li.insertBefore(document.createTextNode((inp.getAttribute('aria-label') || '') + ' '), li.lastChild); chosen.appendChild(li); }
      else if (inp.type === 'range' || (inp.type === 'text' && v)) { const li = document.createElement('li'); li.textContent = inp.closest('fieldset').querySelector('legend').textContent + ' : ' + (inp.type === 'range' ? v + ' %' : v); chosen.appendChild(li); }
    }
  }

  /* ---------- lien, enregistrement, image, remise à zéro ---------- */
  const KEY = 'lk_atelier';
  function params() {
    const p = new URLSearchParams(); p.set(st.fam, st.id);
    for (const [k, v] of Object.entries(st.s)) if (String(v).toUpperCase() !== String(DEF[st.fam][k]).toUpperCase()) p.set(k, String(v));
    return p.toString();
  }
  function fromParams(q) {
    const p = new URLSearchParams(q); const fam = p.has('a') ? 'a' : p.has('v') ? 'v' : null; if (!fam) return null;
    const s = Object.assign({}, DEF[fam]);
    for (const k of Object.keys(DEF[fam])) if (p.has(k)) { const raw = p.get(k); s[k] = NUM.has(k) ? +raw || 0 : (k === 'plate' ? raw.toUpperCase().replace(/[^A-Z0-9 ]/g, '').slice(0, 8) : raw.replace(/[^A-Za-z0-9]/g, '').slice(0, 12)); }
    if (typeof s.tint === 'number') s.tint = clamp(s.tint, 0, 100); if (typeof s.rimSize === 'number') s.rimSize = clamp(Math.round(s.rimSize), -1, 2); if (typeof s.susp === 'number') s.susp = clamp(Math.round(s.susp), -2, 1);
    return { fam, id: p.get(fam), s };
  }
  const say = (el, ok) => { msg.textContent = el && el.dataset.hint ? el.dataset.hint : ''; msg.classList.toggle('is-ok', !!ok); window.clearTimeout(say.t); say.t = window.setTimeout(() => { msg.textContent = ''; msg.classList.remove('is-ok'); }, 3500); };
  $('[data-at-share]').addEventListener('click', async e => {
    const url = location.origin + location.pathname + '?' + params();
    try { await navigator.clipboard.writeText(url); say(e.currentTarget, true); } catch (err) { window.prompt(e.currentTarget.dataset.hintAlt || '', url); }
    history.replaceState(null, '', '?' + params());
  });
  const saved = () => { try { const v = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; } };
  const store = list => { try { localStorage.setItem(KEY, JSON.stringify(list.slice(0, 40))); } catch (e) { /* stockage indisponible : la liste reste à l'écran */ } };
  function renderSaved() {
    const ul = document.querySelector('[data-at-saved-list]'), tpl = document.querySelector('[data-at-saved-row]'); if (!ul || !tpl) return; ul.textContent = '';
    saved().forEach((c, k) => {
      const li = tpl.content.firstElementChild.cloneNode(true);
      const it = items.find(x => x.dataset.atPick === c.f && x.dataset.atId === c.id); if (!it) return;
      li.querySelector('[data-r-nom]').textContent = it.querySelector('.at-item-n').textContent;
      li.querySelector('[data-r-meta]').textContent = it.querySelector('.at-item-c').textContent + ' · ' + new Date(c.d).toLocaleDateString(document.documentElement.lang || 'fr');
      li.querySelector('[data-r-sw]').style.setProperty('--sw', '#' + (c.f === 'v' ? c.s.paint : (FIN[c.s.finish] ? FIN[c.s.finish][0] : c.s.finishColor)));
      li.querySelector('[data-r-load]').addEventListener('click', () => { st.s = Object.assign({}, DEF[c.f], c.s); pick(c.f, c.id, true); root.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' }); });
      li.querySelector('[data-r-del]').addEventListener('click', () => { const l = saved(); l.splice(k, 1); store(l); renderSaved(); });
      ul.appendChild(li);
    });
  }
  $('[data-at-save]').addEventListener('click', e => { const l = saved(); l.unshift({ f: st.fam, id: st.id, s: Object.assign({}, st.s), d: new Date().toISOString() }); store(l); renderSaved(); say(e.currentTarget, true); });
  $('[data-at-png]').addEventListener('click', e => {
    if (!renderer) return; placeCamera(); renderer.render(scene, camera);
    const a = document.createElement('a'); a.href = renderer.domElement.toDataURL('image/png'); a.download = 'leonidakit-atelier-' + st.id + '.png'; document.body.appendChild(a); a.click(); a.remove(); say(e.currentTarget, true);
  });
  $('[data-at-reset]').addEventListener('click', e => { st.s = Object.assign({}, DEF[st.fam]); reflect(); summary(); rebuild(false); say(e.currentTarget, true); });
  $('[data-at-spin]').addEventListener('click', e => { spinning = !spinning; e.currentTarget.setAttribute('aria-pressed', String(spinning)); lastInput = 0; tick(); });
  $('[data-at-full]').addEventListener('click', () => { if (document.fullscreenElement) document.exitFullscreen(); else if (view.requestFullscreen) view.requestFullscreen(); });
  document.addEventListener('fullscreenchange', resize);
  $$('[data-at-angle]').forEach(b => b.addEventListener('click', () => goAngle(b.dataset.atAngle)));
  $$('[data-at-fam-b]').forEach(b => b.addEventListener('click', () => { setFam(b.dataset.atFamB); const first = items.find(x => x.dataset.atPick === st.fam && x.classList.contains('is-on')) || items.find(x => x.dataset.atPick === st.fam); if (first) pick(st.fam, first.dataset.atId); }));
  items.forEach(it => it.addEventListener('click', () => pick(it.dataset.atPick, it.dataset.atId)));
  search.addEventListener('input', filterList); Object.values(catSels).forEach(s => s.addEventListener('change', filterList));

  /* ---------- départ ---------- */
  const ok = initGL();
  const want = fromParams(location.search);
  setFam('v'); renderSaved();
  if (want && items.some(x => x.dataset.atPick === want.fam && x.dataset.atId === want.id)) { st.s = want.s; pick(want.fam, want.id, true); }
  else pick('v', root.dataset.atFirst);
  if (ok && spinning) tick();
})();
