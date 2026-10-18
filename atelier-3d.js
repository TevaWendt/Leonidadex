/* Généré depuis outils/sources/atelier-3d.js : modifie la source, pas ce fichier. */
import * as THREE from './vendor/three.atelier.min.js?v=a5a426607b8d';
(function () {
  'use strict';
  const root = document.querySelector('[data-at]'); if (!root) return;
  const $ = (s, el = root) => el.querySelector(s), $$ = (s, el = root) => Array.from(el.querySelectorAll(s));
  const view = $('[data-at-view]'), canvas = $('[data-at-canvas]'), loading = $('[data-at-loading]'), msg = $('[data-at-msg]');
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const DATA = new URL('atelier/', import.meta.url);
  const KV = 1.38;
  const DEF = {
    v: { paint: 'E8452C', finish: 'gloss', pearl: '', paint2: '1A1A1E', stripes: 0, stripeColor: 'F4F1EA', camo: 'none', rim: '8A8C92', rimSize: 0, rimStyle: 'five', tyres: 'std', tyreWall: 'none', aileron: 0, jupes: 0, capot: 0, toit: 0, bullbar: 0, exhaust: 0, arceau: 0, tint: 35, neon: 0, neonColor: 'F06AA8', neonLayout: 'all', susp: 0, lights: 'halo', lightColor: '38C7D4', plate: 'LEONIDA', plateStyle: 'blue', trim: '1A1A1E', accent: 'F4F1EA', seats: 'std', wheel: 'std', turbo: 0, moteur: 0, freins: 0, transmission: 0, blindage: 0 },
    a: { finish: 'black', finishColor: 'E8452C', camo: 'none', engrave: 0, mag: 'std', sight: 'none', barrel: 'std', grip: 0, lamp: 0, laser: 0, ammo: 'std' }
  };
  const NUM = new Set(['stripes', 'rimSize', 'aileron', 'jupes', 'capot', 'toit', 'bullbar', 'exhaust', 'arceau', 'tint', 'neon', 'susp', 'turbo', 'moteur', 'freins', 'transmission', 'blindage', 'engrave', 'grip', 'lamp', 'laser']);
  const st = { fam: 'v', id: root.dataset.atFirst, cat: '', data: null, s: Object.assign({}, DEF.v) };
  const cache = new Map();
  let renderer, scene, camera, group = null, floorShadow, keyLight, neonLight, camLight, dirty = true, spinning = !reduced, lastInput = 0, raf = 0;
  let onScreen = true, spinDue = false, lastRender = 0;
  const SPIN_MS = (window.matchMedia && window.matchMedia('(pointer: coarse)').matches ? 1000 / 30 : 1000 / 60) - 2;
  const orbit = { az: 0.62, el: 0.36, dist: 420, tx: 0, ty: 16, tz: 0, goal: null };
  const look = { on: false, yaw: 0, pitch: -0.12, fov: 64 };
  function initGL() {
    try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' }); }
    catch (e) { view.classList.add('is-nowebgl'); return false; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 700 ? 1.5 : 2));
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.shadowMap.autoUpdate = false; renderer.shadowMap.needsUpdate = true;
    PARALLEL = !!(renderer.compileAsync && renderer.extensions && renderer.extensions.has && renderer.extensions.has('KHR_parallel_shader_compile'));
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
    camLight = new THREE.DirectionalLight(0xfff4e6, 0.35); scene.add(camLight);
    scene.fog = new THREE.Fog(0x241740, 700, 1500);
    try {
      const env = new THREE.Scene(); env.background = new THREE.Color(0x4a3f66);
      const panel = (w, h, x, y, z, rx, ry, c, i) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: c })); m.position.set(x, y, z); m.rotation.set(rx, ry, 0); m.material.color.multiplyScalar(i); env.add(m); };
      panel(400, 120, 0, 260, 0, Math.PI / 2, 0, 0xffffff, 6);
      panel(300, 160, -320, 120, 0, 0, Math.PI / 2, 0xffe2c4, 3.2); panel(300, 160, 320, 120, 0, 0, -Math.PI / 2, 0xcfe0ff, 2.8);
      panel(500, 140, 0, 110, -340, 0, 0, 0xff8a5c, 2); panel(500, 140, 0, 110, 340, 0, Math.PI, 0x9b7bff, 1.6);
      const floorEnv = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), new THREE.MeshBasicMaterial({ color: 0x1c1526 })); floorEnv.rotation.x = -Math.PI / 2; env.add(floorEnv);
      const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(env, 0.04).texture; pm.dispose();
    } catch (e) {  }
    resize();
    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(view); else window.addEventListener('resize', resize);
    if ('IntersectionObserver' in window) new IntersectionObserver(es => { const was = onScreen; onScreen = es.some(e => e.isIntersecting); if (onScreen && !was) { dirty = true; lastFrame = 0; tick(); } }, { rootMargin: '120px 0px' }).observe(view);
    return true;
  }
  function resize() {
    if (!renderer) return;
    const w = view.clientWidth || 640, h = view.clientHeight || 480;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); dirty = true; tick();
  }
  function placeCamera() {
    const eye = look.on && group && group.userData.eye;
    if (eye) {
      const fov = clamp(look.fov, 38, 90); if (camera.fov !== fov) { camera.fov = fov; camera.updateProjectionMatrix(); }
      const cp = Math.cos(look.pitch);
      camera.position.set(eye[0], eye[1], eye[2]);
      camera.lookAt(eye[0] + Math.sin(look.yaw) * cp * 100, eye[1] + Math.sin(look.pitch) * 100, eye[2] + Math.cos(look.yaw) * cp * 100);
      if (camLight) { camLight.position.set(eye[0], eye[1] + 40, eye[2] - 30); camLight.intensity = 0.8; }
      return;
    }
    if (camera.fov !== 30) { camera.fov = 30; camera.updateProjectionMatrix(); }
    const o = orbit, ce = Math.cos(o.el), x = o.dist * ce * Math.sin(o.az), y = o.dist * Math.sin(o.el), z = o.dist * ce * Math.cos(o.az);
    camera.position.set(o.tx + x, Math.max(2, o.ty + y), o.tz + z); camera.lookAt(o.tx, o.ty, o.tz);
    if (camLight) { camLight.position.copy(camera.position); camLight.position.y += 60; camLight.intensity = group && group.userData.bounds && group.userData.bounds.weapon ? 1.1 : 0.35; }
  }
  function tick() {
    if (!renderer || !onScreen) return;
    if (raf) return; raf = window.requestAnimationFrame(frame);
  }
  let lastFrame = 0;
  function draw(now) { placeCamera(); renderer.render(scene, camera); dirty = false; spinDue = false; lastRender = now; }
  function frame(now) {
    raf = 0;
    if (!onScreen) { lastFrame = 0; return; }
    const o = orbit, dt = Math.min(0.1, Math.max(0.001, (now - (lastFrame || now)) / 1000)); lastFrame = now;
    if (o.goal) {
      const g = o.goal, k = 1 - Math.exp(-dt / 0.11); o.az += (g.az - o.az) * k; o.el += (g.el - o.el) * k; o.dist += (g.dist - o.dist) * k;
      if (Math.abs(g.az - o.az) < 0.004 && Math.abs(g.el - o.el) < 0.004 && Math.abs(g.dist - o.dist) < 1) { o.az = g.az; o.el = g.el; o.dist = g.dist; o.goal = null; }
      dirty = true;
    }
    if (spinning && !o.goal && !look.on && now - lastInput > 2500) { o.az += 0.22 * dt; spinDue = true; }
    if (dirty || (spinDue && now - lastRender >= SPIN_MS)) draw(now);
    if ((spinning && !look.on) || o.goal || spinDue) tick();
  }
  (function controls() {
    let drag = null, pinch = null;
    const touches = new Map();
    canvas.addEventListener('pointerdown', e => { canvas.setPointerCapture(e.pointerId); touches.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (touches.size === 1) drag = { x: e.clientX, y: e.clientY, az: orbit.az, el: orbit.el, yaw: look.yaw, pitch: look.pitch }; else if (touches.size === 2) { const [a, b] = [...touches.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), dist: orbit.dist, fov: look.fov }; drag = null; } lastInput = performance.now(); orbit.goal = null; });
    canvas.addEventListener('pointermove', e => {
      if (!touches.has(e.pointerId)) return; touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && touches.size === 2) { const [a, b] = [...touches.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y), k = pinch.d / Math.max(10, d); if (look.on) look.fov = clamp(pinch.fov * k, 38, 90); else orbit.dist = clamp(pinch.dist * k, 120, 1400); dirty = true; tick(); return; }
      if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (look.on) { look.yaw = clamp(drag.yaw + dx * 0.005, -2.3, 2.3); look.pitch = clamp(drag.pitch + dy * 0.004, -0.85, 0.6); }
      else { orbit.az = drag.az - dx * 0.008; orbit.el = clamp(drag.el + dy * 0.006, 0.02, 1.45); }
      lastInput = performance.now(); dirty = true; tick();
    });
    const up = e => { touches.delete(e.pointerId); if (touches.size < 2) pinch = null; if (!touches.size) drag = null; lastInput = performance.now(); if (spinning) tick(); };
    canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('wheel', e => { e.preventDefault(); if (look.on) look.fov = clamp(look.fov * (1 + Math.sign(e.deltaY) * 0.06), 38, 90); else orbit.dist = clamp(orbit.dist * (1 + Math.sign(e.deltaY) * 0.08), 120, 1400); orbit.goal = null; lastInput = performance.now(); dirty = true; tick(); }, { passive: false });
    canvas.tabIndex = 0;
    canvas.addEventListener('keydown', e => {
      const k = e.key;
      if (look.on) { if (k === 'ArrowLeft') look.yaw = clamp(look.yaw + 0.1, -2.3, 2.3); else if (k === 'ArrowRight') look.yaw = clamp(look.yaw - 0.1, -2.3, 2.3); else if (k === 'ArrowUp') look.pitch = clamp(look.pitch + 0.06, -0.85, 0.6); else if (k === 'ArrowDown') look.pitch = clamp(look.pitch - 0.06, -0.85, 0.6); else if (k === '+' || k === '=') look.fov = clamp(look.fov * 0.92, 38, 90); else if (k === '-') look.fov = clamp(look.fov * 1.08, 38, 90); else return; }
      else if (k === 'ArrowLeft') orbit.az -= 0.12; else if (k === 'ArrowRight') orbit.az += 0.12; else if (k === 'ArrowUp') orbit.el = clamp(orbit.el + 0.08, 0.02, 1.45); else if (k === 'ArrowDown') orbit.el = clamp(orbit.el - 0.08, 0.02, 1.45); else if (k === '+' || k === '=') orbit.dist = clamp(orbit.dist * 0.9, 120, 1400); else if (k === '-') orbit.dist = clamp(orbit.dist * 1.1, 120, 1400); else return;
      e.preventDefault(); orbit.goal = null; lastInput = performance.now(); dirty = true; tick();
    });
  })();
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const hexToColor = h => new THREE.Color('#' + String(h || '888888').replace('#', ''));
  const resample = (poly, step = 7) => { const out = []; for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length]; out.push(a); const d = Math.hypot(b[0] - a[0], b[1] - a[1]); const n = Math.floor(d / step); for (let k = 1; k <= n; k++) { const t = k / (n + 1); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); } } return out; };
  const shapeOf = (poly, fy) => { const s = new THREE.Shape(); poly.forEach(([x, y], i) => { const px = x - 120, py = fy(y); if (i) s.lineTo(px, py); else s.moveTo(px, py); }); s.closePath(); return s; };
  function slice(poly, x) {
    let lo = Infinity, hi = -Infinity;
    for (let i = 0; i < poly.length; i++) { const [x1, y1] = poly[i], [x2, y2] = poly[(i + 1) % poly.length]; if ((x1 <= x && x2 >= x) || (x2 <= x && x1 >= x)) { if (x1 === x2) { lo = Math.min(lo, y1, y2); hi = Math.max(hi, y1, y2); } else { const t = (x - x1) / (x2 - x1), y = y1 + (y2 - y1) * t; lo = Math.min(lo, y); hi = Math.max(hi, y); } } }
    return lo === Infinity ? null : [lo, hi];
  }
  function lofter(top, parts) {
    const outline = top && top.outline;
    let HW = 0, cx = 60;
    if (outline) { let lo = Infinity, hi = -Infinity; for (const [, y] of outline) { lo = Math.min(lo, y); hi = Math.max(hi, y); } HW = (hi - lo) / 2; cx = (lo + hi) / 2; }
    if (!HW) HW = 30;
    let xa = Infinity, xb = -Infinity; if (outline) for (const [x] of outline) { xa = Math.min(xa, x); xb = Math.max(xb, x); }
    const hw = x => { if (!outline) return HW; const s = slice(outline, Math.min(xb - 0.2, Math.max(xa + 0.2, x))); if (!s) return 1.2; return Math.max(1.2, (s[1] - s[0]) / 2); };
    const topY = x => { let best = null; for (const p of parts) { const s = slice(p, x); if (s && (best === null || s[0] < best)) best = s[0]; } return best === null ? null : 100 - best; };
    const botY = x => { let best = null; for (const p of parts) { const s = slice(p, x); if (s && (best === null || s[1] > best)) best = s[1]; } return best === null ? null : 100 - best; };
    return { HW, hw, topY, botY, cx };
  }
  function flipWinding(geo) {
    if (geo.index) { const a = geo.index.array; for (let i = 0; i < a.length; i += 3) { const t = a[i + 1]; a[i + 1] = a[i + 2]; a[i + 2] = t; } geo.index.needsUpdate = true; return geo; }
    for (const name of ['position', 'uv']) { const at = geo.attributes[name]; if (!at) continue; const n = at.itemSize, a = at.array; for (let i = 0; i < at.count; i += 3) for (let c = 0; c < n; c++) { const p = (i + 1) * n + c, q = (i + 2) * n + c, t = a[p]; a[p] = a[q]; a[q] = t; } at.needsUpdate = true; }
    return geo;
  }
  function loftMesh(poly, L, mat, widen = 0, fy = y => 100 - y) {
    const D = 2 * L.HW; const geo = new THREE.ExtrudeGeometry(shapeOf(resample(poly), fy), { depth: D, bevelEnabled: false, steps: 1 });
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i); const t = (z - D / 2) / (D / 2); pos.setXYZ(i, t * (L.hw(x + 120) + widen), y, x); }
    flipWinding(geo); geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; return m;
  }
  function slabMesh(poly, w, mat, fy = y => 100 - y, x0 = 0) {
    const geo = new THREE.ExtrudeGeometry(shapeOf(poly, fy), { depth: w, bevelEnabled: false, steps: 1 });
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i); pos.setXYZ(i, x0 + z - w / 2, y, x); }
    flipWinding(geo); geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; return m;
  }
  function drapeMesh(poly, L, mat, lift = 0.6) {
    const s = new THREE.Shape(); poly.forEach(([x, y], i) => { if (i) s.lineTo(x - 120, y - L.cx); else s.moveTo(x - 120, y - L.cx); }); s.closePath();
    const geo = new THREE.ShapeGeometry(s); const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) { const u = pos.getX(i), v = pos.getY(i); const ty = L.topY(u + 120); pos.setXYZ(i, v, (ty === null ? 20 : ty) + lift, u); }
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, mat); m.castShadow = false; return m;
  }
  const box = (w, h, d, mat, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; return m; };
  const cyl = (r, len, mat, x, y, z, axis = 'x', seg = 24) => { const g = new THREE.CylinderGeometry(r, r, len, seg); const m = new THREE.Mesh(g, mat); if (axis === 'x') m.rotation.z = Math.PI / 2; else if (axis === 'z') m.rotation.x = Math.PI / 2; m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; return m; };
  const M = {};
  function paintMat(hex, finish, camo, pearl) {
    const c = hexToColor(hex);
    const base = { color: c, flatShading: false, roughness: 0.35, metalness: 0.25, clearcoat: 1, clearcoatRoughness: 0.12 };
    if (finish === 'matte') Object.assign(base, { roughness: 0.92, metalness: 0.05, clearcoat: 0 });
    else if (finish === 'metal') Object.assign(base, { roughness: 0.32, metalness: 0.85, clearcoat: 0.6 });
    else if (finish === 'chrome') Object.assign(base, { color: c.clone().lerp(new THREE.Color(0xffffff), 0.75), roughness: 0.06, metalness: 1, clearcoat: 1, envMapIntensity: 1.6 });
    else if (finish === 'nacre') Object.assign(base, { roughness: 0.25, metalness: 0.3, clearcoat: 1, sheen: 1, sheenColor: /^[0-9A-F]{6}$/i.test(pearl || '') ? hexToColor(pearl) : new THREE.Color(0xffffff), sheenRoughness: 0.4, iridescence: 0.35, iridescenceIOR: 1.4 });
    else if (finish === 'cameleon') Object.assign(base, { roughness: 0.2, metalness: 0.75, clearcoat: 1, iridescence: 1, iridescenceIOR: 1.8, iridescenceThicknessRange: [120, 480] });
    if (camo && CAMO_V[camo]) Object.assign(base, { map: camoTexture(CAMO_V[camo], 1 / 90), color: new THREE.Color(0xffffff), metalness: Math.min(base.metalness, 0.2), iridescence: 0, sheen: 0 });
    return new THREE.MeshPhysicalMaterial(base);
  }
  const CAMO_V = { foret: 'woodland', desert: 'desert', urbain: 'urban', numerique: 'digital', neige: 'snow', marine: 'naval' };
  const glassMat = tint => new THREE.MeshPhysicalMaterial({ color: new THREE.Color(0x9fc4e8).lerp(new THREE.Color(0x05060a), tint / 100), roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.45 + 0.55 * tint / 100, clearcoat: 1, side: THREE.DoubleSide });
  const dark = new THREE.MeshStandardMaterial({ color: 0x17161b, roughness: 0.85, metalness: 0.1 });
  const tyreMat = new THREE.MeshStandardMaterial({ color: 0x141418, roughness: 0.95, metalness: 0 });
  const steel = new THREE.MeshStandardMaterial({ color: 0x9a9ca3, roughness: 0.35, metalness: 0.9 });
  const lampMat = (hex, on) => new THREE.MeshStandardMaterial({ color: on ? hexToColor(hex) : 0xdedad0, emissive: on ? hexToColor(hex) : 0x000000, emissiveIntensity: on ? 1.6 : 0, roughness: 0.3, metalness: 0.2 });
  const tailMat = on => new THREE.MeshStandardMaterial({ color: 0xff3b2a, emissive: 0xff2a1a, emissiveIntensity: on ? 1.2 : 0.15, roughness: 0.4 });
  function plateTexture(text, style) {
    const c = document.createElement('canvas'); c.width = 256; c.height = 96; const g = c.getContext('2d');
    const bg = { blue: ['#dfe9ff', '#1d3f8f'], white: ['#f6f3ea', '#1a1a1e'], yellow: ['#f6cf3a', '#1a1a1e'], black: ['#1a1a1e', '#f6f3ea'], yellowblue: ['#1d3f8f', '#f6cf3a'], yellowblack: ['#1a1a1e', '#f6cf3a'] }[style] || ['#dfe9ff', '#1d3f8f'];
    g.fillStyle = bg[0]; g.fillRect(0, 0, 256, 96); g.strokeStyle = bg[1]; g.lineWidth = 6; g.strokeRect(5, 5, 246, 86);
    g.fillStyle = bg[1]; g.font = '900 54px Archivo, system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText((text || 'LEONIDA').slice(0, 8).toUpperCase(), 128, 54);
    g.font = '800 13px Archivo, system-ui, sans-serif'; g.fillText('LEONIDA', 128, 16);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  function camoTexture(kind, rep = 1 / 60) {
    const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
    const P = { woodland: ['#4a5a35', '#2f3a22', '#6b7246', '#1e2416'], desert: ['#c9b07a', '#a98c5a', '#e0cf9c', '#8a7147'], tropical: ['#1f7a5a', '#f06aa8', '#2fb3a0', '#f5c542'], urban: ['#8c8f96', '#4a4d55', '#c3c6cc', '#2b2d33'], digital: ['#5a6b4e', '#3b4636', '#8a9a6e', '#232a20'], snow: ['#e9ecef', '#b9c0c8', '#ffffff', '#8a929c'], naval: ['#2c3e57', '#1c2a3d', '#4d6580', '#11192a'], brush: ['#6b6f5a', '#3d4033', '#9a9878', '#24261e'], leopard: ['#d9a74a', '#2a1a0c', '#a8742c', '#e9c27a'], zebra: ['#f2f2ee', '#141414', '#141414', '#141414'], geometric: ['#3a4a5e', '#7a8c9e', '#1e2836', '#c3ccd6'] }[kind] || ['#555', '#333', '#777', '#222'];
    g.fillStyle = P[0]; g.fillRect(0, 0, 256, 256);
    let seed = 7; const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    if (kind === 'digital' || kind === 'naval') { for (let y = 0; y < 256; y += 16) for (let x = 0; x < 256; x += 16) { const r = rnd(); if (r < 0.62) { g.fillStyle = P[1 + Math.floor(r * 4.8) % 3]; g.fillRect(x, y, 16, 16); } } }
    else if (kind === 'brush') { g.lineCap = 'round'; for (let i = 0; i < 26; i++) { g.strokeStyle = P[1 + (i % 3)]; g.lineWidth = 9 + rnd() * 14; g.beginPath(); const x = rnd() * 256, y = rnd() * 256; g.moveTo(x, y); g.quadraticCurveTo(x + 40 - rnd() * 80, y + 40 - rnd() * 80, x + 60 - rnd() * 120, y + 60 - rnd() * 120); g.stroke(); } }
    else if (kind === 'leopard') { for (let i = 0; i < 46; i++) { const x = rnd() * 256, y = rnd() * 256, r = 7 + rnd() * 9; g.fillStyle = P[2]; g.beginPath(); g.ellipse(x, y, r, r * 0.8, rnd() * 3, 0, Math.PI * 2); g.fill(); g.strokeStyle = P[1]; g.lineWidth = 3.5; g.setLineDash([9, 5]); g.stroke(); g.setLineDash([]); } }
    else if (kind === 'zebra') { g.fillStyle = P[1]; for (let k = 0; k < 9; k++) { g.beginPath(); const y0 = k * 30 + rnd() * 8; g.moveTo(0, y0); for (let x = 0; x <= 256; x += 16) g.lineTo(x, y0 + Math.sin(x / 26 + k) * 9); for (let x = 256; x >= 0; x -= 16) g.lineTo(x, y0 + 10 + Math.sin(x / 22 + k * 1.7) * 6 + rnd() * 3); g.closePath(); g.fill(); } }
    else if (kind === 'geometric') { for (let i = 0; i < 60; i++) { g.fillStyle = P[1 + (i % 3)]; g.beginPath(); const x = rnd() * 256, y = rnd() * 256, r = 14 + rnd() * 26; g.moveTo(x, y - r); g.lineTo(x + r * 0.9, y + r * 0.6); g.lineTo(x - r * 0.9, y + r * 0.6); g.closePath(); g.fill(); } }
    else for (let i = 0; i < 70; i++) { g.fillStyle = P[1 + (i % 3)]; g.beginPath(); const x = rnd() * 256, y = rnd() * 256, r = 10 + rnd() * 26; if (kind === 'tropical' && i % 3 === 0) {  for (let k = 0; k < 7; k++) { const a = rnd() * Math.PI * 2; g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a) * r, y + Math.sin(a) * r, x + Math.cos(a + .5) * r * 1.3, y + Math.sin(a + .5) * r * 1.3); } g.lineWidth = 4; g.strokeStyle = P[1 + (i % 3)]; g.stroke(); } else { g.ellipse(x, y, r, r * (0.5 + rnd()), rnd() * 3, 0, Math.PI * 2); g.fill(); } }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  const FIN = { black: ['41424b', 0.55, 0.42], green: ['3f6b35', 0.3, 0.55], army: ['4b5a3c', 0.3, 0.6], orange: ['e8702a', 0.3, 0.45], lspd: ['2f5fe0', 0.3, 0.45], pink: ['f06aa8', 0.3, 0.45], gold: ['d4a62a', 0.95, 0.22], platinum: ['d8dbe0', 1, 0.18], chrome: ['f0f0f0', 1, 0.07] };
  function gunMat(s) {
    const f = FIN[s.finish] || null, hex = f ? f[0] : s.finishColor, opts = { color: hexToColor(hex), roughness: f ? f[2] : 0.45, metalness: f ? f[1] : 0.35 };
    if (s.camo !== 'none') { opts.map = camoTexture(s.camo); opts.color = new THREE.Color(0xffffff); opts.metalness = 0.15; opts.roughness = 0.7; }
    return new THREE.MeshStandardMaterial(opts);
  }
  function buildVehicle(d, s) {
    const g = new THREE.Group(), L = lofter(d.top, d.parts), parts = d.parts || [];
    const paint = paintMat(s.paint, s.finish, s.camo, s.pearl), paint2 = paintMat(s.paint2, s.finish === 'chrome' ? 'chrome' : 'gloss');
    const hideInside = [];
    const wheelsIn = d.wheels || [], two = !!d.two;
    const rOrig = wheelsIn.length ? wheelsIn[0][2] : 0, rNew = rOrig ? Math.max(5, rOrig + [-2, 0, 2, 5][s.rimSize + 1]) : 0;
    const liftBody = (rOrig ? rNew - rOrig : 0) + [-3.5, -1.8, 0, 4][s.susp + 2] + (d.extra && d.extra.includes('lift') ? 0 : 0);
    const body = new THREE.Group(); body.position.y = liftBody; g.add(body);
    let z0 = Infinity, z1 = -Infinity, yTop = 0, yBot = 100;
    for (const p of parts) for (const [x, y] of p) { z0 = Math.min(z0, x - 120); z1 = Math.max(z1, x - 120); yTop = Math.max(yTop, 100 - y); yBot = Math.min(yBot, 100 - y); }
    if (!parts.length) { z0 = -100; z1 = 100; yTop = 40; }
    const bb = p => { let a = Infinity, b = Infinity, c = -Infinity, e = -Infinity; for (const [x, y] of p) { a = Math.min(a, x); b = Math.min(b, y); c = Math.max(c, x); e = Math.max(e, y); } return { x0: a, y0: b, x1: c, y1: e, w: c - a, h: e - b }; };
    let main = null, mainA = 0; parts.forEach(p => { const b = bb(p); if (b.w * b.h > mainA) { mainA = b.w * b.h; main = p; } });
    for (const p of parts) {
      const b = bb(p), isMain = p === main;
      if (!isMain && b.w < 13 && b.h < 9 && b.y0 < 72 && !two) {
        const z = (b.x0 + b.x1) / 2 - 120, hw = L.hw((b.x0 + b.x1) / 2);
        for (const sgn of [-1, 1]) { const m = slabMesh(p, 3.2, paint2, y => 100 - y, sgn * (hw + 1.4)); body.add(m); }
        continue;
      }
      if (two) body.add(slabMesh(p, isMain ? 8 : Math.max(2.5, Math.min(6, b.h * 0.5)), isMain ? paint : paint2));
      else body.add(loftMesh(p, L, isMain ? paint : paint2, 0));
    }
    const glass = glassMat(s.tint);
    for (const p of d.glass || []) { const m = two ? slabMesh(p, 9, glass) : loftMesh(p, L, glass, 0.6); body.add(m); if (!two) hideInside.push(m); }
    if (!two) for (const p of (d.top && d.top.glass) || []) body.add(drapeMesh(p, L, glass));
    if (d.kind === 'plane' || d.kind === 'heli') for (const p of (d.top && d.top.plates) || []) {
      const sh = new THREE.Shape(); p.forEach(([x, y], i) => { if (i) sh.lineTo(x - 120, y - L.cx); else sh.moveTo(x - 120, y - L.cx); }); sh.closePath();
      const geo = new THREE.ExtrudeGeometry(sh, { depth: 2.4, bevelEnabled: false }); const pos = geo.attributes.position;
      let mx = 0; for (const [x] of p) mx += x; mx = mx / p.length;
      const ty = L.topY(mx), by = L.botY(mx), yy = ty === null || by === null ? yTop * 0.55 : (d.kind === 'heli' ? ty + 2 : (ty + by) / 2);
      for (let i = 0; i < pos.count; i++) { const u = pos.getX(i), v = pos.getY(i), w = pos.getZ(i); pos.setXYZ(i, v, yy + w, u); }
      flipWinding(geo); geo.computeVertexNormals(); const m = new THREE.Mesh(geo, paint2); m.castShadow = true; m.receiveShadow = true; body.add(m);
    }
    const tw = two ? (d.kind === 'bike' ? 2.6 : 5.5) : (s.tyres === 'tt' ? 11 : s.tyres === 'slick' ? 7 : 9);
    const rimMat = new THREE.MeshStandardMaterial({ color: hexToColor(s.rim), roughness: 0.3, metalness: 0.9 });
    const wallMat = s.tyreWall && s.tyreWall !== 'none' ? new THREE.MeshStandardMaterial({ color: { white: 0xf2efe6, whiteline: 0xf2efe6, redline: 0xd8352a, blueline: 0x2f6fe0 }[s.tyreWall] || 0xf2efe6, roughness: 0.6, side: THREE.DoubleSide }) : null;
    for (const [cx, cy, r] of wheelsIn) {
      const z = cx - 120, rr = Math.max(4, r + (rNew - rOrig)), y = rr;
      const xs = two ? [0] : [-(L.hw(cx) - tw / 2 + 1.2), L.hw(cx) - tw / 2 + 1.2];
      for (const x of xs) {
        const t = cyl(rr, tw, tyreMat, x, y, z, 'x', 28); g.add(t);
        const rim = rimGroup(s.rimStyle, rr, tw, rimMat); rim.position.set(x, y, z); g.add(rim);
        if (wallMat) for (const sgn of [-1, 1]) { const [a, b] = s.tyreWall === 'white' ? [0.68, 0.9] : [0.84, 0.89]; const ring = new THREE.Mesh(new THREE.RingGeometry(rr * a, rr * b, 36), wallMat); ring.rotation.y = Math.PI / 2; ring.position.set(x + sgn * (tw / 2 + 0.05), y, z); g.add(ring); }
      }
    }
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
    if (!two && d.kind !== 'boat' && d.kind !== 'plane' && d.kind !== 'heli' && d.kind !== 'rail') {
      const pm = new THREE.MeshStandardMaterial({ map: plateTexture(s.plate, s.plateStyle), roughness: 0.5 });
      body.add(box(16, 6, 0.8, pm, 0, Math.max(6, (yBot + 9)), z0 - 0.3));
    }
    const hwMid = L.hw(120), zc = (z0 + z1) / 2, yc = L.topY(120) || yTop;
    if (s.aileron && !two) { const zr = z0 + 8, yr = (L.topY(zr + 120) || yTop) + 7, w = 2 * L.hw(zr + 120) * 0.92; body.add(box(w, 1.6, 9, paint2, 0, yr, zr)); body.add(box(2, 7, 4, paint2, -w / 2 + 4, yr - 3.5, zr)); body.add(box(2, 7, 4, paint2, w / 2 - 4, yr - 3.5, zr)); }
    if (s.jupes && !two) { for (const sgn of [-1, 1]) body.add(box(1.4, 3, (z1 - z0) * 0.62, paint2, sgn * (hwMid + 0.2), yBot + 1.5, zc)); }
    if (s.capot && !two) { const zh = z1 - 30, yh = (L.topY(zh + 120) || yTop) + 1.2; body.add(box(14, 2.6, 12, paint2, 0, yh, zh)); }
    if (s.toit && !two) { const w = 2 * L.hw(zc + 120) * 0.82; for (const dz of [-12, 12]) body.add(box(w, 1.8, 2, dark, 0, yc + 2.2, zc + dz)); for (const sgn of [-1, 1]) body.add(box(2, 1.6, 30, dark, sgn * w / 2, yc + 1.4, zc)); }
    if (s.bullbar && !two) { const zf = z1 + 3, yf = yBot + 4, ht = ((L.topY(z1 + 118) || yTop) - yBot) * 0.5, w = 2 * L.hw(z1 + 114) * 0.7; body.add(box(w, 2.2, 2.2, steel, 0, yf + ht, zf)); body.add(box(2.2, ht + 2, 2.2, steel, -w / 2 + 1, yf + ht / 2, zf)); body.add(box(2.2, ht + 2, 2.2, steel, w / 2 - 1, yf + ht / 2, zf)); body.add(box(w * 0.5, 2.2, 2.2, steel, 0, yf + ht * 0.45, zf)); }
    if (s.exhaust && !two) { for (const sgn of [-1, 1]) body.add(cyl(1.8, 8, steel, sgn * hwMid * 0.55, yBot + 2.5, z0 - 1, 'z', 14)); }
    if (s.arceau && !two) { const w = 2 * L.hw(zc + 120) * 0.86; for (const dz of [-22, 22]) { body.add(box(w, 1.6, 1.6, steel, 0, yc + 2.6, zc + dz)); for (const sgn of [-1, 1]) body.add(box(1.6, 3.2, 1.6, steel, sgn * w / 2, yc + 1.4, zc + dz)); } for (const sgn of [-1, 1]) body.add(box(1.6, 1.6, 44, steel, sgn * w / 2, yc + 2.6, zc)); }
    if (s.stripes && !two) { const smat = new THREE.MeshStandardMaterial({ color: hexToColor(s.stripeColor), roughness: 0.5, metalness: 0.1 }); for (const sgn of [-1, 1]) body.add(stripMesh(L, z0 + 4, z1 - 4, sgn * hwMid * 0.2, hwMid * 0.16, smat)); }
    if (s.neon && !two) {
      const nc = hexToColor(s.neonColor), lay = s.neonLayout || 'all';
      const flat = (w, l, x, z, op, y) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, l), new THREE.MeshBasicMaterial({ color: nc, transparent: true, opacity: op, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); g.add(m); };
      if (lay === 'all') { flat(2 * hwMid * 0.96, (z1 - z0) * 0.88, 0, zc, 0.7, 0.35); flat(2 * hwMid * 1.5, (z1 - z0) * 1.15, 0, zc, 0.22, 0.25); neonLight.position.set(0, 3, zc); }
      else {
        const W = 2 * hwMid * 0.9, Lg = (z1 - z0) * 0.8, on = { front: lay.includes('f') || lay === 'front', back: lay.includes('b') || lay === 'back', sides: lay.includes('s') || lay === 'sides' };
        let px = 0, pz = 0, n = 0; const add = (x, z) => { px += x; pz += z; n++; };
        if (on.front) { flat(W, 3, 0, z1 - 10, 0.85, 0.36); flat(W * 1.3, 26, 0, z1 - 4, 0.2, 0.26); add(0, z1 - 10); }
        if (on.back) { flat(W, 3, 0, z0 + 10, 0.85, 0.36); flat(W * 1.3, 26, 0, z0 + 4, 0.2, 0.26); add(0, z0 + 10); }
        if (on.sides) for (const sgn of [-1, 1]) { flat(3, Lg, sgn * hwMid * 0.9, zc, 0.85, 0.36); flat(24, Lg * 1.08, sgn * hwMid * 1.05, zc, 0.2, 0.26); add(sgn * hwMid * 0.9, zc); }
        neonLight.position.set(n ? px / n : 0, 3, n ? pz / n : zc);
      }
      neonLight.color.copy(nc); neonLight.intensity = lay === 'all' ? 180 : 140;
    } else neonLight.intensity = 0;
    const inside = d.kind === 'car' || d.kind === 'pickup' || d.kind === 'truck' || d.kind === 'bus' ? buildCabin(d, s, L, { z0, z1, yTop, yBot }) : (two || d.kind === 'moto' || d.kind === 'bike') ? buildBars(d, s, L, { z0, z1, yTop }) : null;
    if (inside) {
      body.add(inside.group);
      g.userData.cabin = inside.cabin ? inside.group : null; if (inside.cabin) inside.group.visible = false;
      g.userData.eye = [inside.eye[0], inside.eye[1] + liftBody, inside.eye[2]]; g.userData.eyePitch = inside.pitch; g.userData.eyeFov = inside.fov; g.userData.two = !inside.cabin;
    }
    g.userData.hideInside = hideInside;
    g.userData.bounds = { z0, z1, yTop: yTop + liftBody, hw: L.HW };
    return g;
  }
  function stripMesh(L, zA, zB, x, w, mat) {
    const n = Math.max(2, Math.round((zB - zA) / 5)), pos = [], idx = [];
    for (let i = 0; i <= n; i++) { const z = zA + (zB - zA) * i / n, y = (L.topY(z + 120) || 0) + 0.55, hw = L.hw(z + 120); const xx = Math.min(Math.abs(x), hw - w) * Math.sign(x); pos.push(xx - w / 2, y, z, xx + w / 2, y, z); if (i < n) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
    return new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: mat.color, roughness: 0.5, side: THREE.DoubleSide }));
  }
  function rimGroup(style, rr, tw, mat) {
    const rg = new THREE.Group(), R = rr * 0.62, d = tw + 0.6;
    const along = (r, len, m, seg = 20) => { const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg), m); c.rotation.z = Math.PI / 2; c.castShadow = true; return c; };
    rg.add(along(rr * 0.2, tw + 1.2, dark, 12));
    if (style === 'disc' || !style) { rg.add(along(R, d, mat)); return rg; }
    if (style === 'steelie') { rg.add(along(R, d, mat)); for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3, h = along(R * 0.1, d + 0.3, dark, 10); h.position.set(0, Math.cos(a) * R * 0.55, Math.sin(a) * R * 0.55); rg.add(h); } return rg; }
    rg.add(along(R * 0.97, d * 0.5, dark, 20));
    for (const sgn of [-1, 1]) { const lip = new THREE.Mesh(new THREE.TorusGeometry(R, Math.max(0.35, rr * 0.045), 8, 30), mat); lip.rotation.y = Math.PI / 2; lip.position.x = sgn * d / 2; rg.add(lip); }
    const spokes = (n, w, off = 0, m = mat, len = R * 0.86) => { for (let k = 0; k < n; k++) { const a = off + k * 2 * Math.PI / n, sp = new THREE.Mesh(new THREE.BoxGeometry(d, len, w), m); sp.rotation.x = a; sp.position.set(0, Math.cos(a) * (len / 2 + R * 0.08), Math.sin(a) * (len / 2 + R * 0.08)); sp.castShadow = true; rg.add(sp); } };
    if (style === 'five') spokes(5, R * 0.3);
    else if (style === 'multi') spokes(10, R * 0.12);
    else if (style === 'mesh') { spokes(12, R * 0.07, 0.13); spokes(12, R * 0.07, -0.13); const ring = new THREE.Mesh(new THREE.TorusGeometry(R * 0.55, R * 0.05, 6, 24), mat); ring.rotation.y = Math.PI / 2; rg.add(ring); }
    else if (style === 'wire') spokes(28, R * 0.035, 0, steel, R * 0.9);
    else spokes(5, R * 0.3);
    return rg;
  }
  function buildCabin(d, s, L, k) {
    const cab = new THREE.Group(), len = k.z1 - k.z0;
    const pb = p => { let a = Infinity, b = Infinity, c = -Infinity, e = -Infinity; for (const [x, y] of p) { a = Math.min(a, x); b = Math.min(b, y); c = Math.max(c, x); e = Math.max(e, y); } return { x0: a - 120, x1: c - 120, yTop: 100 - b, yBot: 100 - e }; };
    const gl = (d.glass || []).map(p => ({ p, b: pb(p) })).filter(o => o.b.x1 - o.b.x0 > 6 && o.b.yTop - o.b.yBot > 3);
    let zA, zB, yBelt;
    if (gl.length) { zA = Math.min(...gl.map(o => o.b.x0)); zB = Math.max(...gl.map(o => o.b.x1)); const front = gl.reduce((m, o) => (o.b.x1 > m.b.x1 ? o : m)); yBelt = front.b.yBot; }
    else { zA = k.z0 + 0.3 * len; zB = k.z0 + 0.62 * len; yBelt = k.yBot + 0.6 * (k.yTop - k.yBot); }
    const roofAt = z => { const t = L.topY(z + 120); return t === null ? k.yTop : t; };
    const cabLen = Math.max(24, zB - zA), dD = clamp(cabLen * 0.22, 10, 18), eyeBack = clamp(Math.max(cabLen * 0.42, dD + 18), 22, 46), zEye = zB - eyeBack;
    const yRoofE = roofAt(zEye), yFloor = k.yBot + (yBelt - k.yBot) * 0.22, yEye = yBelt + Math.max(5, (yRoofE - yBelt) * 0.5);
    const hwAt = z => Math.max(6, L.hw(z + 120) - 1.6), hwE = hwAt(zEye), xd = hwE * 0.46;
    const trimC = hexToColor(s.trim), accC = hexToColor(s.accent);
    const trimMat = new THREE.MeshStandardMaterial({ color: trimC, roughness: 0.74, metalness: 0.05, side: THREE.DoubleSide });
    const dashMat = new THREE.MeshStandardMaterial({ color: trimC.clone().multiplyScalar(0.55), roughness: 0.82 });
    const seatMat = new THREE.MeshStandardMaterial({ color: trimC.clone().multiplyScalar(0.88), roughness: 0.9 });
    const linerMat = new THREE.MeshStandardMaterial({ color: trimC.clone().lerp(new THREE.Color(0x9a9aa2), 0.55), roughness: 0.95, side: THREE.DoubleSide });
    const accMat = new THREE.MeshStandardMaterial({ color: accC, emissive: accC, emissiveIntensity: 0.85, roughness: 0.4 });
    const stitch = new THREE.MeshStandardMaterial({ color: accC, roughness: 0.6 });
    const add = (m, shadow) => { m.castShadow = !!shadow; m.receiveShadow = false; cab.add(m); return m; };
    const bx = (w, h, dd, m, x, y, z) => add(new THREE.Mesh(new THREE.BoxGeometry(w, h, dd), m)).position.set(x, y, z);
    const zR = zA - 0.05 * cabLen, zF = zB + 0.1 * cabLen, outline = [[zR, yFloor], [zF, yFloor]];
    for (let z = zF; z >= zR; z -= 3) outline.push([z, roofAt(z) - 0.6]);
    outline.push([zR, roofAt(zR) - 0.6]);
    const shrink = (pts, f) => { let cx = 0, cy = 0; for (const [x, y] of pts) { cx += x; cy += y; } cx /= pts.length; cy /= pts.length; return pts.map(([x, y]) => [cx + (x - cx) * f, cy + (y - cy) * f]); };
    const holes = gl.map(o => shrink(o.p.map(([x, y]) => [x - 120, 100 - y]), 0.94).map(([z, y]) => [z, Math.min(y, roofAt(z) - 1.4)]));
    const wallShape = new THREE.Shape(outline.map(([z, y]) => new THREE.Vector2(z, y)));
    for (const h of holes) wallShape.holes.push(new THREE.Path(h.map(([z, y]) => new THREE.Vector2(z, y))));
    const glassThin = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(0x9fc4e8).lerp(new THREE.Color(0x05060a), s.tint / 100), roughness: 0.08, transparent: true, opacity: 0.18 + 0.6 * s.tint / 100, side: THREE.DoubleSide, depthWrite: false });
    for (const sgn of [-1, 1]) {
      const geo = new THREE.ShapeGeometry(wallShape), pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) { const z = pos.getX(i), y = pos.getY(i); pos.setXYZ(i, sgn * hwAt(z), y, z); }
      geo.computeVertexNormals(); add(new THREE.Mesh(geo, trimMat));
      for (const h of holes) { const g2 = new THREE.ShapeGeometry(new THREE.Shape(h.map(([z, y]) => new THREE.Vector2(z, y)))), p2 = g2.attributes.position; for (let i = 0; i < p2.count; i++) { const z = p2.getX(i), y = p2.getY(i); p2.setXYZ(i, sgn * (hwAt(z) + 0.5), y, z); } add(new THREE.Mesh(g2, glassThin)); }
      bx(2.2, 1.6, Math.min(30, cabLen * 0.5), dashMat, sgn * (hwAt(zEye) - 1.2), yBelt - 4, zEye + 4);
    }
    const tg = ((d.top && d.top.glass) || []).map(p => { let a = Infinity, c = -Infinity; for (const [x] of p) { a = Math.min(a, x); c = Math.max(c, x); } return [a - 120, c - 120]; }).sort((a, b) => b[1] - a[1]);
    let zWsTop = zB - 0.3 * cabLen, zRwTop = zA + 0.08 * cabLen;
    if (tg.length) { zWsTop = clamp(tg[0][0], zEye + 4, zB); if (tg.length > 1) zRwTop = clamp(tg[tg.length - 1][1], zA - 10, zEye - 10); }
    { const n = Math.max(2, Math.round((zWsTop - zRwTop) / 3)), P = [], I = [];
      for (let i = 0; i <= n; i++) { const z = zRwTop + (zWsTop - zRwTop) * i / n, y = roofAt(z) - 0.9, w = hwAt(z) - 0.2; P.push(-w, y, z, w, y, z); if (i < n) { const a = i * 2; I.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); geo.setIndex(I); geo.computeVertexNormals(); add(new THREE.Mesh(geo, linerMat)); }
    bx(2 * hwAt(zEye), 1, zF - zR, new THREE.MeshStandardMaterial({ color: 0x1b1b20, roughness: 1 }), 0, yFloor - 0.5, (zF + zR) / 2);
    const hD = Math.max(5, (yBelt - yFloor) * 0.55), wD = 2 * hwAt(zB - dD / 2);
    bx(wD, hD, dD, dashMat, 0, yBelt - hD / 2 - 1.4, zB - dD / 2 + 1.5);
    bx(wD, 1.2, dD * 0.7, trimMat, 0, yBelt - 1.1, zB - dD * 0.35 + 1.5);
    const zDash = zB - dD + 1.5, zWheel = Math.min(zEye + 20, zDash - 4), yWheel = yBelt - 5;
    bx(13, 4, 4.5, dashMat, xd, yBelt - 0.6, zDash + 1.2);
    for (const dx of [-2.9, 2.9]) {
      const face = add(new THREE.Mesh(new THREE.CircleGeometry(2.2, 28), new THREE.MeshStandardMaterial({ color: 0x0b0b10, roughness: 0.5 }))); face.rotation.y = Math.PI; face.position.set(xd + dx, yBelt - 0.7, zDash - 1.07);
      const ring = add(new THREE.Mesh(new THREE.RingGeometry(1.85, 2.2, 28), accMat)); ring.rotation.y = Math.PI; ring.position.set(xd + dx, yBelt - 0.7, zDash - 1.1);
      const nd = add(new THREE.Mesh(new THREE.BoxGeometry(0.25, 1.7, 0.2), accMat)); nd.position.set(xd + dx, yBelt - 0.7, zDash - 1.15); nd.rotation.z = dx < 0 ? 0.9 : -0.5;
    }
    { const scr = add(new THREE.Mesh(new THREE.BoxGeometry(7.5, 4.2, 0.6), new THREE.MeshStandardMaterial({ color: 0x0d1018, emissive: accC.clone().multiplyScalar(0.08), roughness: 0.3 }))); scr.position.set(0, yBelt - 3.4, zDash - 0.4); }
    const conLen = Math.max(8, zDash - (zEye - 8)); bx(8, Math.max(4, (yBelt - yFloor) * 0.42), conLen, dashMat, 0, yFloor + Math.max(4, (yBelt - yFloor) * 0.42) / 2, zDash - conLen / 2);
    { const zs = zEye + 6, ys = yFloor + Math.max(4, (yBelt - yFloor) * 0.42); const lev = add(new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 5, 10), new THREE.MeshStandardMaterial({ color: 0x9a9ca3, metalness: 0.9, roughness: 0.3 }))); lev.position.set(0, ys + 2.5, zs); const knob = add(new THREE.Mesh(new THREE.SphereGeometry(0.9, 16, 12), s.wheel === 'race' ? accMat : trimMat)); knob.position.set(0, ys + 5.2, zs); }
    { const wg = new THREE.Group(), rw = s.wheel === 'race' ? 6.2 : s.wheel === 'sport' ? 7.3 : 8, tube = s.wheel === 'race' ? 1.15 : 0.85;
      const rimM = new THREE.MeshStandardMaterial({ color: s.wheel === 'race' ? 0x1f1f24 : trimC.clone().multiplyScalar(0.7), roughness: s.wheel === 'race' ? 0.95 : 0.6 });
      wg.add(new THREE.Mesh(new THREE.TorusGeometry(rw, tube, 12, 40), rimM));
      const sp = s.wheel === 'std' ? [0, Math.PI, -Math.PI / 2 - 0.5, -Math.PI / 2 + 0.5] : [0, Math.PI, -Math.PI / 2];
      for (const a of sp) { const b = new THREE.Mesh(new THREE.BoxGeometry(rw, s.wheel === 'race' ? 1.1 : 1.5, 0.8), dashMat); b.position.set(Math.cos(a) * rw / 2, Math.sin(a) * rw / 2, 0); b.rotation.z = a; wg.add(b); }
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 1.6, 20), dashMat); hub.rotation.x = Math.PI / 2; wg.add(hub);
      if (s.wheel === 'sport') { const st2 = new THREE.Mesh(new THREE.TorusGeometry(rw, tube * 1.03, 6, 40, Math.PI * 0.5), stitch); st2.rotation.z = Math.PI * 0.25; wg.add(st2); }
      if (s.wheel === 'race') { const mk = new THREE.Mesh(new THREE.BoxGeometry(0.9, tube * 2.3, tube * 2.3), accMat); mk.position.set(0, rw, 0); wg.add(mk); }
      wg.rotation.x = 0.42; wg.position.set(xd, yWheel, zWheel); wg.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } }); cab.add(wg);
      const col = add(new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.4, Math.max(4, zDash - zWheel), 12), dashMat)); col.rotation.x = Math.PI / 2 + 0.42; col.position.set(xd, yWheel + 1.2, (zWheel + zDash) / 2); }
    const seatY = yFloor + (yBelt - yFloor) * 0.3, backH = Math.max(10, (yRoofE - yFloor) * 0.55);
    const seat = (x, z, w, kind) => {
      bx(w, 3, 13, seatMat, x, seatY, z);
      const back = add(new THREE.Mesh(new THREE.BoxGeometry(w, kind === 'bucket' ? backH * 1.12 : backH, 3), seatMat)); back.position.set(x, seatY + backH / 2 + 1, z - 7.5); back.rotation.x = -0.2;
      if (kind === 'bucket') { for (const sx of [-1, 1]) bx(1.6, backH * 0.75, 4, seatMat, x + sx * (w / 2 - 0.4), seatY + backH * 0.42, z - 7); bx(1.2, backH * 0.9, 3.15, stitch, x, seatY + backH / 2 + 1, z - 7.6); }
      else if (kind !== 'bench') bx(w * 0.55, 4, 2.5, seatMat, x, seatY + backH + 3, z - 8.6);
    };
    if (s.seats === 'bench') seat(0, zEye - 4, 2 * xd + 12, 'bench'); else { seat(xd, zEye - 4, 12, s.seats); seat(-xd, zEye - 4, 12, s.seats); }
    if (zEye - 34 > zA - 4 && cabLen > 64) seat(0, zEye - 34, 2 * hwAt(zEye - 34) - 6, 'bench');
    bx(8, 2.4, 1, dashMat, 0, roofAt(zWsTop) - 3.6, zWsTop - 1.5);
    const dome = new THREE.PointLight(0xfff1dc, 70, Math.max(80, cabLen * 1.6), 1.4); dome.position.set(0, yRoofE - 4, zEye + 6); cab.add(dome);
    return { group: cab, cabin: true, eye: [xd, yEye, zEye], pitch: -0.13, fov: 70 };
  }
  function buildBars(d, s, L, k) {
    const bars = new THREE.Group(), len = k.z1 - k.z0, wheels = d.wheels || [];
    const zfw = wheels.length ? Math.max(...wheels.map(w => w[0])) - 120 : k.z1 - 0.2 * len;
    const pb = p => { let a = Infinity, b = Infinity, c = -Infinity, e = -Infinity; for (const [x, y] of p) { a = Math.min(a, x); b = Math.min(b, y); c = Math.max(c, x); e = Math.max(e, y); } return { x0: a - 120, x1: c - 120, yBot: 100 - e }; };
    const ws = (d.glass || []).map(pb).filter(b => b.x1 > zfw - 0.5 * len).sort((a, b) => b.x1 - a.x1)[0];
    let zBar, yBar;
    if (ws) { zBar = ws.x0 - 2; yBar = ws.yBot + 0.5; }
    else { let best = null; for (let z = zfw - 0.42 * len; z <= zfw - 0.04 * len; z += 2) { const y = L.topY(z + 120); if (y !== null && (best === null || y > best[1])) best = [z, y]; } if (!best) best = [zfw - 0.25 * len, k.yTop * 0.8]; zBar = best[0] - 1; yBar = best[1] - 1.2; }
    const bike = d.kind === 'bike', hwBar = clamp(len * 0.17, 12, 26) * (bike ? 0.8 : 1);
    const accC = hexToColor(s.accent), accMat = new THREE.MeshStandardMaterial({ color: accC, emissive: accC, emissiveIntensity: 0.85, roughness: 0.4 });
    const put = (m, x, y, z) => { m.position.set(x, y, z); m.castShadow = true; bars.add(m); return m; };
    put(cyl(bike ? 0.55 : 0.75, 2 * hwBar, steel, 0, 0, 0, 'x', 12), 0, yBar, zBar);
    for (const sgn of [-1, 1]) put(cyl(bike ? 1.1 : 1.45, 7, dark, 0, 0, 0, 'x', 14), sgn * (hwBar - 3.5), yBar, zBar);
    if (!bike) {
      for (const sgn of [-1, 1]) { put(cyl(0.35, 8, steel, 0, 0, 0, 'y', 8), sgn * (hwBar - 6), yBar + 4, zBar + 1); const head = put(new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 0.8, 18), dark), sgn * (hwBar - 6), yBar + 8.4, zBar + 1); head.rotation.x = Math.PI / 2; head.scale.set(1.3, 1, 0.8); }
      put(new THREE.Mesh(new THREE.BoxGeometry(9, 5, 4), dark), 0, yBar + 2.2, zBar + 3);
      const face = put(new THREE.Mesh(new THREE.CircleGeometry(2, 24), new THREE.MeshStandardMaterial({ color: 0x0b0b10, roughness: 0.5 })), 0, yBar + 2.4, zBar + 0.95); face.rotation.y = Math.PI;
      const ring = put(new THREE.Mesh(new THREE.RingGeometry(1.65, 2, 24), accMat), 0, yBar + 2.4, zBar + 0.9); ring.rotation.y = Math.PI;
    }
    return { group: bars, cabin: false, eye: [0, yBar + clamp(len * 0.24, 14, 30), zBar - clamp(len * 0.3, 22, 40)], pitch: -0.42, fov: 72 };
  }
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
    const wbox = (len, h, th, y, lx, m = acc) => box(th, h, len, m, 0, y, lx);
    const wcyl = (r, len, y, lx, m = acc, seg = 20) => cyl(r, len, m, 0, y, lx, 'z', seg);
    if (lb && s.mag !== 'std') { const lx = (lb.x0 + lb.x1) / 2 - 120, ly = 60 - lb.y1; if (s.mag === 'ext') g.add(wbox(Math.max(8, lb.w * 0.9), 14, 5, ly - 7, lx)); else if (s.mag === 'drum') g.add(cyl(11, 7, acc, 0, ly - 4, lx, 'x', 28)); else g.add(wbox(24, 16, 10, ly - 6, lx)); }
    if (s.sight !== 'none') { const y = topY + 2; if (s.sight === 'holo') g.add(wbox(11, 6, 6, y + 3, cx)); else { const long = s.sight !== 'scope', r = long ? 4.2 : 3.4, len = long ? 44 : 34; g.add(wcyl(r, len, y + r + 3, cx)); g.add(wbox(4, 5, 5, y + 2.5, cx - 12)); g.add(wbox(4, 5, 5, y + 2.5, cx + 12)); if (s.sight === 'night' || s.sight === 'thermal') g.add(wcyl(r + 1.6, 8, y + r + 3, cx + len / 2 + 2)); g.add(wcyl(r * 0.8, 1, y + r + 3, cx + len / 2 + (s.sight === 'night' || s.sight === 'thermal' ? 6.6 : 0.6), new THREE.MeshStandardMaterial({ color: s.sight === 'thermal' ? 0xff7a3a : s.sight === 'night' ? 0x58ff8a : 0x9fd8ff, emissive: 0x224466, roughness: 0.1, metalness: 0.4 }))); } }
    if (s.barrel === 'silencer') g.add(wcyl(4.4, 28, mzy, mzx + 14));
    else if (s.barrel === 'comp') g.add(wbox(9, 7, 7, mzy, mzx + 4.5));
    else if (s.barrel === 'brake') { g.add(wcyl(3.8, 10, mzy, mzx + 5, acc, 12)); for (const k of [-2.5, 0, 2.5]) g.add(wbox(1.2, 9, 1.2, mzy, mzx + 5 + k, dark)); }
    else if (s.barrel === 'heavy') g.add(wcyl(3.6, 40, mzy, mzx - 20));
    if (s.grip) g.add(wbox(5, 12, 5, (60 - mb.y1) - 6, cx + 38));
    if (s.lamp) g.add(wcyl(2.6, 9, mzy - 6, mzx - 24, acc, 12));
    if (s.laser) { g.add(wbox(5, 4, 4, mzy - 6, mzx - 30)); const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, mzy - 6, mzx - 27), new THREE.Vector3(0, mzy - 6, mzx + 190)]); g.add(new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xff2a3a, transparent: true, opacity: 0.85 }))); g.add(cyl(0.5, 0.5, new THREE.MeshBasicMaterial({ color: 0xff3a4a }), 0, mzy - 6, mzx - 27, 'z', 8)); }
    let lowest = Infinity, highest = -Infinity; for (const p of parts) for (const [, y] of p) { lowest = Math.min(lowest, 60 - y); highest = Math.max(highest, 60 - y); }
    if (lowest === Infinity) { lowest = -20; highest = 20; }
    g.position.y = 10 - lowest;
    g.userData.bounds = { z0: mb.x0 - 120, z1: mb.x1 - 120, yTop: highest - lowest + 10, hw: 10, weapon: true };
    return g;
  }
  function loadModel(fam, id) {
    const key = fam + '/' + id; if (cache.has(key)) return cache.get(key);
    const pr = fetch(new URL((fam === 'v' ? 'vehicules/' : 'armes/') + encodeURIComponent(id) + '.json', DATA)).then(r => { if (!r.ok) throw new Error('data'); return r.json(); });
    cache.set(key, pr); pr.catch(() => cache.delete(key));
    return pr;
  }
  let building = 0, buildSeq = 0, PARALLEL = null;
  const disposeGroup = g => g.traverse(o => { if (o.geometry) o.geometry.dispose(); for (const m of [].concat(o.material || [])) { if (m.map) m.map.dispose(); m.dispose(); } });
  function rebuild(recenter) {
    if (!renderer || !st.data) return;
    window.cancelAnimationFrame(building);
    const seq = ++buildSeq;
    building = window.requestAnimationFrame(async () => {
      let g;
      try { g = st.fam === 'v' ? buildVehicle(st.data, st.s) : buildWeapon(st.data, st.s); } catch (e) { g = new THREE.Group(); }
      if (PARALLEL) {
        const old = group;
        let ready = null;
        try { if (old) scene.remove(old); scene.add(g); ready = renderer.compileAsync(scene, camera); } catch (e) { ready = null; }
        scene.remove(g); if (old) scene.add(old);
        if (ready) { try { await Promise.race([ready, new Promise(r => setTimeout(r, 1500))]); } catch (e) {  } }
      }
      if (seq !== buildSeq) { disposeGroup(g); return; }
      const old = group;
      if (old) scene.remove(old);
      group = g; scene.add(group); syncInside();
      const b = group.userData.bounds || { z0: -100, z1: 100, yTop: 40, hw: 40 };
      orbit.tx = 0; orbit.tz = (b.z0 + b.z1) / 2; orbit.ty = b.weapon ? b.yTop * 0.5 + 4 : Math.max(10, b.yTop * 0.45);
      if (recenter) { const size = Math.max(b.z1 - b.z0, 2 * b.hw, b.yTop); orbit.dist = size * (b.weapon ? 1.9 : 1.75) + 60; }
      draw(performance.now());
      if (old) disposeGroup(old);
      tick();
    });
  }
  const ANGLES = { tq: [0.62, 0.36], profil: [Math.PI / 2, 0.14], face: [0, 0.16], arriere: [Math.PI, 0.16], dessus: [0.001, 1.42] };
  const insideBtn = $('[data-at-inside]'), helpOut = $('[data-at-help-out]'), helpIn = $('[data-at-help-in]'), insideNote = $('[data-at-inside-note]');
  function syncInside() {
    const eye = !!(group && group.userData.eye), two = !!(group && group.userData.two);
    if (insideBtn) { insideBtn.hidden = !eye; const c = $('[data-at-in-car]', insideBtn), m = $('[data-at-in-moto]', insideBtn); if (c) c.hidden = two; if (m) m.hidden = !two; }
    const leave = look.on && !eye; if (leave) look.on = false;
    const on = look.on && eye;
    if (group) { if (group.userData.cabin) group.userData.cabin.visible = on; for (const o of group.userData.hideInside || []) o.visible = !on; }
    view.classList.toggle('is-inside', on);
    if (helpOut) helpOut.hidden = on; if (helpIn) helpIn.hidden = !on;
    if (insideNote) { insideNote.hidden = !on; const c = $('[data-at-note-car]', insideNote), m = $('[data-at-note-moto]', insideNote); if (c) c.hidden = two; if (m) m.hidden = !two; }
    if (leave) goAngle('tq');
    if (renderer) renderer.shadowMap.needsUpdate = true;
    dirty = true; tick();
  }
  function goAngle(name) {
    if (name === 'interieur') {
      if (!group || !group.userData.eye) return;
      look.on = true; look.yaw = 0; look.pitch = group.userData.eyePitch ?? -0.12; look.fov = group.userData.eyeFov || 64; orbit.goal = null;
      lastInput = performance.now(); syncInside();
      $$('[data-at-angle]').forEach(x => { const on = x.dataset.atAngle === name; x.classList.toggle('is-on', on); x.setAttribute('aria-pressed', String(on)); });
      return;
    }
    if (look.on) { look.on = false; syncInside(); }
    const a = ANGLES[name] || ANGLES.tq; const b = group && group.userData.bounds;
    const size = b ? Math.max(b.z1 - b.z0, 2 * b.hw, b.yTop) : 200;
    const az = ((orbit.az % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI); let target = a[0]; while (target - az > Math.PI) target -= 2 * Math.PI; while (az - target > Math.PI) target += 2 * Math.PI;
    orbit.az = az; const goal = { az: target, el: a[1], dist: size * (b && b.weapon ? 1.9 : 1.75) + 60 };
    if (reduced) { Object.assign(orbit, goal); dirty = true; } else orbit.goal = goal;
    lastInput = performance.now() + 4000; tick();
    $$('[data-at-angle]').forEach(x => { const on = x.dataset.atAngle === name; x.classList.toggle('is-on', on); x.setAttribute('aria-pressed', String(on)); });
  }
  const lists = { v: $('[data-at-list="v"]'), a: $('[data-at-list="a"]') }, items = $$('.at-item'), search = $('[data-at-search]'), catSels = { v: $('[data-at-catsel="v"]'), a: $('[data-at-catsel="a"]') };
  const fold = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss').toLowerCase();
  const hay = it => it._q || (it._q = fold([...it.children].map(c => c.textContent).join(' ')));
  {
    const lang = document.documentElement.lang || 'fr';
    if (!/^fr\b/i.test(lang)) {
      const coll = new Intl.Collator(lang), nameOf = li => (li.querySelector('.at-item-n') || li).textContent;
      for (const ul of Object.values(lists)) { if (!ul) continue; const lis = [...ul.children]; lis.sort((x, y) => coll.compare(nameOf(x), nameOf(y))); ul.append(...lis); }
    }
  }
  function filterList() {
    const q = fold((search.value || '').trim()), cat = catSels[st.fam].value; let n = 0;
    for (const it of items) { if (it.dataset.atPick !== st.fam) continue; const ok = (!q || hay(it).includes(q)) && (!cat || it.dataset.atCat === cat); it.parentNode.hidden = !ok; if (ok) n++; }
    $('[data-at-empty]').hidden = n > 0;
  }
  function setFam(f) {
    st.fam = f;
    $$('[data-at-fam-b]').forEach(b => { const on = b.dataset.atFamB === f; b.classList.toggle('is-on', on); b.setAttribute('aria-selected', String(on)); });
    lists.v.hidden = f !== 'v'; lists.a.hidden = f !== 'a'; catSels.v.hidden = f !== 'v'; catSels.a.hidden = f !== 'a';
    $$('[data-at-menu]').forEach(m => { m.hidden = m.dataset.atMenu !== f; });
    if (preRoot) { $$('[data-at-pre-fam]', preRoot).forEach(x => { x.hidden = x.dataset.atPreFam !== f; }); const on = $('[data-at-menu="' + f + '"] .at-cat.is-on'); if (on) preShow(f, on.dataset.atCat); }
    filterList();
  }
  async function pick(fam, id, keepState) {
    if (fam !== st.fam) setFam(fam);
    st.id = id; const it = items.find(x => x.dataset.atPick === fam && x.dataset.atId === id); if (!it) return;
    items.forEach(x => x.classList.toggle('is-on', x === it));
    const box = it.closest('.at-lists'); if (box) { const r = it.getBoundingClientRect(), br = box.getBoundingClientRect(); if (r.top < br.top) box.scrollTop += r.top - br.top; else if (r.bottom > br.bottom) box.scrollTop += r.bottom - br.bottom; }
    st.cat = it.dataset.atCat;
    if (!keepState) st.s = Object.assign({}, DEF[fam]);
    $('[data-at-name]').textContent = it.querySelector('.at-item-n').textContent; $('[data-at-model-cat]').textContent = it.querySelector('.at-item-c').textContent;
    $('[data-at-fiche]').href = (fam === 'v' ? 'vehicules/' : 'armes/') + encodeURIComponent(id) + '.html';
    $('[data-at-perso]').href = 'personnalisations.html#perso-' + (fam === 'v' ? 'vehicules' : 'armes') + '=' + encodeURIComponent(id);
    applyCompat(); reflect(); summary();
    if (!renderer) return;
    loading.hidden = false;
    try { st.data = await loadModel(fam, id); } catch (e) { st.data = null; loading.hidden = true; return; }
    loading.hidden = true; rebuild(true);
    if (!spinning) goAngle('tq');
  }
  function applyCompat() {
    const fam = st.fam, cat = st.cat, menu = $('[data-at-menu="' + fam + '"]');
    $$('[data-at-compat]', menu).forEach(el => { const c = el.dataset.atCompat.split(' ').filter(Boolean); el.hidden = c.length ? !c.includes(cat) : false; });
    $$('[data-at-group]', menu).forEach(gr => { const any = $$('.at-opt', gr).some(o => !o.hidden); const btn = $('[data-at-cat="' + gr.dataset.atGroup + '"]', menu); if (btn) btn.classList.toggle('is-off', !any); });
    const on = $('.at-cat.is-on', menu); if (on && on.classList.contains('is-off')) { const first = $$('.at-cat', menu).find(b => !b.classList.contains('is-off')); if (first) showGroup(fam, first.dataset.atCat); }
    $$('.at-pl[data-at-compat], .at-pl[data-at-ids]').forEach(el => { const c = (el.dataset.atCompat || '').split(' ').filter(Boolean), ids = (el.dataset.atIds || '').split(' ').filter(Boolean); el.hidden = !!((c.length && !c.includes(cat)) || (ids.length && !ids.includes(st.id))); });
  }
  function showGroup(fam, id) {
    const menu = $('[data-at-menu="' + fam + '"]');
    $$('.at-cat', menu).forEach(b => { const on = b.dataset.atCat === id; b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', String(on)); });
    $$('[data-at-group]', menu).forEach(gr => { gr.hidden = gr.dataset.atGroup !== id; gr.classList.toggle('is-on', gr.dataset.atGroup === id); });
    preShow(fam, id);
  }
  const COLOR_KEYS = ['paint', 'pearl', 'paint2', 'stripeColor', 'rim', 'neonColor', 'lightColor', 'trim', 'accent'];
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
    for (const grp of COLOR_KEYS) { const v = st.s[grp]; if (v === undefined || !/^[0-9A-F]{6}$/i.test(String(v))) continue; const radios = $$('input[type="radio"][data-at-k="' + grp + '"]', menu); if (!radios.some(r => r.checked)) { const c = $('input[type="color"][data-at-k="' + grp + '"]', menu); if (c) c.value = '#' + v; } }
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
  const preRoot = $('[data-at-pre]');
  const parseSet = t => { const o = {}; for (const kv of String(t || '').split(',')) { const i = kv.indexOf(':'); if (i > 0) { const k = kv.slice(0, i), v = kv.slice(i + 1); o[k] = NUM.has(k) ? +v : v; } } return o; };
  const PRE_IDX = [];
  if (preRoot) for (const card of $$('.at-pl', preRoot)) {
    const tpl = $('template[data-at-pl-tpl]', card), fam = card.closest('[data-at-pre-fam]').dataset.atPreFam, list = $('.at-pl-t', card).textContent;
    if (tpl) for (const b of tpl.content.querySelectorAll('[data-at-set]')) { const sw = b.querySelector('.at-pi-sw'), m = sw && /#([0-9A-F]{6})/i.exec(sw.getAttribute('style') || ''); PRE_IDX.push({ fam, list, set: parseSet(b.dataset.atSet), name: b.textContent.trim(), en: !!b.querySelector('[lang="en"]'), hex: m ? m[1] : '' }); }
  }
  const sameVal = (a, b) => String(a).toUpperCase() === String(b).toUpperCase();
  function preActive() {
    const out = [];
    for (const it of PRE_IDX) { if (it.fam !== st.fam) continue; const e = Object.entries(it.set); if (e.every(([k, v]) => sameVal(st.s[k], v)) && e.some(([k, v]) => !sameVal(v, DEF[st.fam][k]))) out.push(it); }
    return out;
  }
  function preMark() {
    if (!preRoot) return;
    for (const b of $$('.at-pl-body:not([hidden]) [data-at-set]', preRoot)) { const on = Object.entries(parseSet(b.dataset.atSet)).every(([k, v]) => sameVal(st.s[k], v)); b.setAttribute('aria-pressed', String(on)); b.classList.toggle('is-on', on); }
  }
  function preShow(fam, group) {
    if (!preRoot) return;
    const box = $('[data-at-pre-fam="' + fam + '"]', preRoot); if (!box) return;
    $$('[data-at-pre-tab]', box).forEach(t => { const on = t.dataset.atPreTab === group; t.classList.toggle('is-on', on); t.setAttribute('aria-pressed', String(on)); });
    $$('[data-at-pre-group]', box).forEach(gr => { gr.hidden = gr.dataset.atPreGroup !== group; });
  }
  function applySet(set) {
    const keys = Object.keys(set);
    if (keys.includes('paint') || (st.fam === 'a' && keys.includes('finish'))) st.s.camo = 'none';
    for (const [k, v] of Object.entries(set)) if (k in DEF[st.fam]) st.s[k] = NUM.has(k) ? +v : v;
    reflect(); summary(); rebuild(false);
  }
  if (preRoot) preRoot.addEventListener('click', e => {
    const tab = e.target.closest('[data-at-pre-tab]');
    if (tab) { const fam = tab.closest('[data-at-pre-fam]').dataset.atPreFam, g = tab.dataset.atPreTab, menu = $('[data-at-menu="' + fam + '"]'), btn = menu && $('.at-cat[data-at-cat="' + g + '"]', menu); if (btn && !btn.classList.contains('is-off')) showGroup(fam, g); else preShow(fam, g); return; }
    const head = e.target.closest('.at-pl-b');
    if (head) {
      const card = head.closest('.at-pl'), body = $('.at-pl-body', card), open = head.getAttribute('aria-expanded') !== 'true';
      if (open && !body.dataset.filled) { const tpl = $('template[data-at-pl-tpl]', body); if (tpl) body.appendChild(tpl.content.cloneNode(true)); body.dataset.filled = '1'; }
      body.hidden = !open; head.setAttribute('aria-expanded', String(open)); card.classList.toggle('is-open', open); if (open) preMark(); return;
    }
    const tryB = e.target.closest('[data-at-set]'); if (tryB) applySet(parseSet(tryB.dataset.atSet));
  });
  function activePostes() {
    const s = st.s, cat = st.cat, out = [];
    if (st.fam === 'v') {
      out.push('peinture-principale'); if (s.finish === 'nacre') out.push('nacre'); if (s.finish === 'cameleon') out.push('cameleon');
      if (s.paint2 !== DEF.v.paint2) out.push('peinture-secondaire'); if (s.stripes || (s.camo && s.camo !== 'none')) out.push('livrees-serie');
      if (s.rimStyle !== DEF.v.rimStyle) out.push('jantes-familles'); if (s.tyreWall && s.tyreWall !== 'none') out.push('pneus-flancs');
      if (st.cat !== 'moto' && (s.trim !== DEF.v.trim || s.accent !== DEF.v.accent || s.seats !== DEF.v.seats || s.wheel !== DEF.v.wheel)) out.push('interieur-rideout', 'interieur-bennys');
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
  const fmtMoney = n => { const lang = (document.documentElement.lang || 'fr').slice(0, 2), s = n.toLocaleString(lang === 'en' ? 'en-US' : lang === 'de' ? 'de-DE' : lang === 'es' ? 'es-ES' : lang === 'it' ? 'it-IT' : lang === 'pt' ? 'pt-BR' : 'fr-FR'); return lang === 'en' ? '$' + s : lang === 'pt' ? '$\u00a0' + s : s + ' $'; };
  function summary() {
    const menu = $('[data-at-menu="' + st.fam + '"]'), act = activePostes(), pre = 'perso-' + (st.fam === 'v' ? 'vehicules' : 'armes') + '-';
    $$('[data-at-menu] .at-poste.is-on').forEach(a => { if (!menu.contains(a)) a.classList.remove('is-on'); });
    let total = 0, unknown = 0; const seen = new Set();
    $$('.at-poste', menu).forEach(a => { const id = (a.getAttribute('href').split('#')[1] || '').replace(pre, ''); const on = act.includes(id); a.classList.toggle('is-on', on); if (on && !seen.has(id)) { seen.add(id); const p = a.dataset.atPrix; if (p !== '') total += +p; else unknown++; } });
    $('[data-at-total]').textContent = fmtMoney(total); $('[data-at-total-note]').hidden = unknown === 0;
    const chosen = $('[data-at-chosen]'); chosen.textContent = ''; const shown = new Set();
    for (const inp of $$('[data-at-k]', menu)) {
      const k = inp.dataset.atK, v = st.s[k], d = DEF[st.fam][k]; if (v === undefined || String(v).toUpperCase() === String(d).toUpperCase()) continue;
      if ((inp.type === 'checkbox' && v) || (inp.type === 'radio' && inp.checked && !inp.closest('.at-sw'))) shown.add(k);
      if (inp.type === 'checkbox' && v) { const li = document.createElement('li'); li.textContent = inp.closest('label').querySelector('span').textContent; chosen.appendChild(li); }
      else if (inp.type === 'radio' && inp.checked && !inp.closest('.at-sw')) { const li = document.createElement('li'); const grp = inp.closest('.at-rad'), lg = (grp && grp.dataset.label) || inp.closest('fieldset').querySelector('legend').textContent; li.innerHTML = '<span></span>'; li.firstChild.textContent = lg + ' : '; li.appendChild(document.createTextNode(inp.nextElementSibling.textContent)); chosen.appendChild(li); }
      else if (inp.type === 'radio' && inp.checked && inp.closest('.at-sw')) { const li = document.createElement('li'); const grp = inp.closest('.at-sw'), lg = (grp && grp.dataset.label) || inp.closest('fieldset').querySelector('legend').textContent; li.innerHTML = '<span></span><i class="at-chosen-sw"></i>'; li.firstChild.textContent = lg + ' : '; li.lastChild.style.cssText = 'display:inline-block;width:12px;height:12px;border-radius:50%;border:1px solid #1A1A1E;background:#' + v; li.insertBefore(document.createTextNode((inp.getAttribute('aria-label') || '') + ' '), li.lastChild); chosen.appendChild(li); }
      else if (inp.type === 'range' || (inp.type === 'text' && v)) { const li = document.createElement('li'); li.textContent = inp.closest('fieldset').querySelector('legend').textContent + ' : ' + (inp.type === 'range' ? v + ' %' : v); chosen.appendChild(li); }
    }
    const named = new Set();
    for (const it of preActive()) { if (named.has(it.list) || Object.keys(it.set).every(k => shown.has(k) || sameVal(st.s[k], DEF[st.fam][k]))) continue; named.add(it.list); for (const k of Object.keys(it.set)) named.add('k:' + k); const li = document.createElement('li'); li.innerHTML = '<span></span>'; li.firstChild.textContent = it.list + ' : '; const n = document.createElement('b'); n.textContent = it.name; if (it.en) { n.lang = 'en'; n.setAttribute('translate', 'no'); } li.appendChild(n); if (it.hex) { const i = document.createElement('i'); i.className = 'at-chosen-sw'; i.style.background = '#' + it.hex; li.appendChild(i); } chosen.appendChild(li); }
    for (const k of COLOR_KEYS) {
      const v = st.s[k], d = DEF[st.fam][k]; if (v === undefined || !v || String(v).toUpperCase() === String(d).toUpperCase() || named.has('k:' + k)) continue;
      if ($$('input[type="radio"][data-at-k="' + k + '"]', menu).some(r => r.checked)) continue;
      const grp = $('input[type="color"][data-at-k="' + k + '"]', menu); if (!grp) continue;
      const box = grp.closest('.at-sw'), lg = (box && box.dataset.label) || grp.closest('fieldset').querySelector('legend').textContent;
      const li = document.createElement('li'); li.innerHTML = '<span></span>'; li.firstChild.textContent = lg + ' : '; li.appendChild(document.createTextNode('#' + String(v).toUpperCase() + ' ')); const i = document.createElement('i'); i.className = 'at-chosen-sw'; i.style.background = '#' + v; li.appendChild(i); chosen.appendChild(li);
    }
    preMark();
  }
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
  const store = list => { try { localStorage.setItem(KEY, JSON.stringify(list.slice(0, 40))); } catch (e) {  } };
  function renderSaved() {
    const ul = document.querySelector('[data-at-saved-list]'), tpl = document.querySelector('[data-at-saved-row]'); if (!ul || !tpl) return; ul.textContent = '';
    saved().forEach((c, k) => {
      const li = tpl.content.firstElementChild.cloneNode(true);
      const it = items.find(x => x.dataset.atPick === c.f && x.dataset.atId === c.id); if (!it) return;
      li.querySelector('[data-r-nom]').textContent = it.querySelector('.at-item-n').textContent;
      li.querySelector('[data-r-meta]').textContent = it.querySelector('.at-item-c').textContent + ', ' + new Date(c.d).toLocaleDateString(document.documentElement.lang || 'fr');
      li.querySelector('[data-r-sw]').style.setProperty('--sw', '#' + (c.f === 'v' ? c.s.paint : (FIN[c.s.finish] ? FIN[c.s.finish][0] : c.s.finishColor)));
      li.querySelector('[data-r-load]').addEventListener('click', () => { st.s = Object.assign({}, DEF[c.f], c.s); pick(c.f, c.id, true); root.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' }); });
      li.querySelector('[data-r-del]').addEventListener('click', () => { const l = saved(); l.splice(k, 1); store(l); renderSaved(); });
      ul.appendChild(li);
    });
  }
  $('[data-at-save]').addEventListener('click', e => { const l = saved(); l.unshift({ f: st.fam, id: st.id, s: Object.assign({}, st.s), d: new Date().toISOString() }); store(l); renderSaved(); say(e.currentTarget, true); });
  $('[data-at-png]').addEventListener('click', e => {
    if (!renderer) return; renderer.shadowMap.needsUpdate = true; draw(performance.now());
    const a = document.createElement('a'); a.href = renderer.domElement.toDataURL('image/png'); a.download = 'leonidakit-atelier-' + st.id + '.png'; document.body.appendChild(a); a.click(); a.remove(); say(e.currentTarget, true);
  });
  $('[data-at-reset]').addEventListener('click', e => { st.s = Object.assign({}, DEF[st.fam]); reflect(); summary(); rebuild(false); say(e.currentTarget, true); });
  $('[data-at-spin]').addEventListener('click', e => { spinning = !spinning; e.currentTarget.setAttribute('aria-pressed', String(spinning)); lastInput = 0; tick(); });
  $('[data-at-full]').addEventListener('click', () => { if (document.fullscreenElement) document.exitFullscreen(); else if (view.requestFullscreen) view.requestFullscreen(); });
  document.addEventListener('fullscreenchange', resize);
  $$('[data-at-angle]').forEach(b => b.addEventListener('click', () => goAngle(b.dataset.atAngle)));
  $$('[data-at-go]').forEach(b => b.addEventListener('click', () => { goAngle(b.dataset.atGo); view.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'nearest' }); }));
  $$('[data-at-fam-b]').forEach(b => b.addEventListener('click', () => { setFam(b.dataset.atFamB); const first = items.find(x => x.dataset.atPick === st.fam && x.classList.contains('is-on')) || items.find(x => x.dataset.atPick === st.fam); if (first) pick(st.fam, first.dataset.atId); }));
  items.forEach(it => it.addEventListener('click', () => pick(it.dataset.atPick, it.dataset.atId)));
  const warm = e => { const it = e.target.closest && e.target.closest('.at-item'); if (it && renderer) loadModel(it.dataset.atPick, it.dataset.atId).catch(() => {}); };
  for (const ul of Object.values(lists)) if (ul) { ul.addEventListener('pointerover', warm, { passive: true }); ul.addEventListener('focusin', warm); }
  search.addEventListener('input', filterList); Object.values(catSels).forEach(s => s.addEventListener('change', filterList));
  const want = fromParams(location.search);
  setFam('v'); renderSaved();
  const first = want && items.some(x => x.dataset.atPick === want.fam && x.dataset.atId === want.id) ? [want.fam, want.id] : ['v', root.dataset.atFirst];
  if (first[0] === want?.fam && first[1] === want?.id) st.s = want.s;
  pick(first[0], first[1], true);
  loadModel(first[0], first[1]).catch(() => {});
  const boot = () => { if (!initGL()) return; pick(first[0], first[1], true); if (spinning) tick(); };
  const go = () => requestAnimationFrame(() => setTimeout(boot, 0));
  if (document.readyState === 'complete') go(); else window.addEventListener('load', go, { once: true });
})();
