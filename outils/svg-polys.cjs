/* ============================================================
   LEONIDAKIT — svg-polys.cjs (v7.81) : lit les schémas SVG du site (vehicules-schemas, vehicules-angles, armes-schemas,
   armes-angles) et en tire des polygones aplatis : silhouettes d'encre, vitrages, roues, feux. L'Atelier 3D en fait des
   volumes (outils/gen-atelier.cjs → atelier/<famille>/<id>.json). Commandes de chemin lues : M L H V Q C T S Z (absolues et
   relatives) ; les courbes sont échantillonnées. Un chemin à plusieurs sous-chemins donne plusieurs polygones.
   ============================================================ */
'use strict';
const INK = '#1A1A1E', HL = '#FDFBF7';
const r1 = n => Math.round(n * 10) / 10;

/* ---------- chemin SVG → polygones ---------- */
function flattenPath(d, steps = 6, open = false) {
  const toks = d.match(/[a-zA-Z]|-?(?:\d*\.\d+|\d+\.?)(?:e-?\d+)?/g) || [];
  const polys = []; let poly = null, cmd = '', i = 0, x = 0, y = 0, sx = 0, sy = 0, px = null, py = null;
  const num = () => parseFloat(toks[i++]);
  const push = (nx, ny) => { if (!poly) { poly = []; polys.push(poly); } poly.push([nx, ny]); x = nx; y = ny; };
  const quad = (cx, cy, nx, ny) => { const x0 = x, y0 = y; for (let k = 1; k <= steps; k++) { const t = k / steps, a = (1 - t) * (1 - t), b = 2 * (1 - t) * t, c = t * t; push(a * x0 + b * cx + c * nx, a * y0 + b * cy + c * ny); } px = cx; py = cy; };
  const cubic = (c1x, c1y, c2x, c2y, nx, ny) => { const x0 = x, y0 = y; for (let k = 1; k <= steps; k++) { const t = k / steps, a = (1 - t) ** 3, b = 3 * (1 - t) * (1 - t) * t, c = 3 * (1 - t) * t * t, e = t ** 3; push(a * x0 + b * c1x + c * c2x + e * nx, a * y0 + b * c1y + c * c2y + e * ny); } px = c2x; py = c2y; };
  while (i < toks.length) {
    const t = toks[i];
    if (/[a-zA-Z]/.test(t)) { cmd = t; i++; if (cmd === 'Z' || cmd === 'z') { if (poly && poly.length) { x = sx; y = sy; } poly = null; continue; } }
    else if (!cmd) { i++; continue; }
    const rel = cmd === cmd.toLowerCase(), C = cmd.toUpperCase();
    if (C === 'M') { let nx = num(), ny = num(); if (rel) { nx += x; ny += y; } poly = null; push(nx, ny); sx = nx; sy = ny; cmd = rel ? 'l' : 'L'; px = py = null; }
    else if (C === 'L') { let nx = num(), ny = num(); if (rel) { nx += x; ny += y; } push(nx, ny); px = py = null; }
    else if (C === 'H') { let nx = num(); if (rel) nx += x; push(nx, y); px = py = null; }
    else if (C === 'V') { let ny = num(); if (rel) ny += y; push(x, ny); px = py = null; }
    else if (C === 'Q') { let cx = num(), cy = num(), nx = num(), ny = num(); if (rel) { cx += x; cy += y; nx += x; ny += y; } quad(cx, cy, nx, ny); }
    else if (C === 'T') { let nx = num(), ny = num(); if (rel) { nx += x; ny += y; } const cx = px === null ? x : 2 * x - px, cy = py === null ? y : 2 * y - py; quad(cx, cy, nx, ny); }
    else if (C === 'C') { let a = num(), b = num(), c = num(), d2 = num(), nx = num(), ny = num(); if (rel) { a += x; b += y; c += x; d2 += y; nx += x; ny += y; } cubic(a, b, c, d2, nx, ny); }
    else if (C === 'S') { let c = num(), d2 = num(), nx = num(), ny = num(); if (rel) { c += x; d2 += y; nx += x; ny += y; } const a = px === null ? x : 2 * x - px, b = py === null ? y : 2 * y - py; cubic(a, b, c, d2, nx, ny); }
    else if (C === 'A') { i += 5; let nx = num(), ny = num(); if (rel) { nx += x; ny += y; } push(nx, ny); px = py = null; } /* arc : corde (rare, jamais sur une silhouette) */
    else { i++; }
  }
  return polys.filter(p => p.length >= (open ? 2 : 3)).map(p => p.map(([a, b]) => [r1(a), r1(b)]));
}
/* même lecture, sans fermer les sous-chemins (traits) */
function flattenOpen(d, steps = 6) { return flattenPath(d, steps, true); }
const area = p => { let s = 0; for (let i = 0; i < p.length; i++) { const [x1, y1] = p[i], [x2, y2] = p[(i + 1) % p.length]; s += x1 * y2 - x2 * y1; } return Math.abs(s) / 2; };
const bbox = p => { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const [x, y] of p) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0 }; };

/* ---------- éléments d'un schéma ---------- */
const attr = (tag, name) => { const m = tag.match(new RegExp('\\s' + name + '="([^"]*)"')); return m ? m[1] : null; };
function elements(svg) {
  const out = [];
  for (const m of svg.matchAll(/<(path|rect|circle)\b[^>]*\/?>/g)) {
    const tag = m[0], kind = m[1], fill = attr(tag, 'fill'), stroke = attr(tag, 'stroke');
    const fo = attr(tag, 'fill-opacity'), so = attr(tag, 'stroke-opacity');
    const e = { kind, fill, stroke, fo: fo === null ? 1 : parseFloat(fo), so: so === null ? 1 : parseFloat(so) };
    if (kind === 'path') { e.d = attr(tag, 'd'); e.sw = +(attr(tag, 'stroke-width') || 1.5); }
    else if (kind === 'rect') { e.x = +attr(tag, 'x'); e.y = +attr(tag, 'y'); e.w = +attr(tag, 'width'); e.h = +attr(tag, 'height'); }
    else { e.cx = +attr(tag, 'cx'); e.cy = +attr(tag, 'cy'); e.r = +attr(tag, 'r'); e.sw = +(attr(tag, 'stroke-width') || 1); }
    out.push(e);
  }
  return out;
}
/* transformation de vary() : <g transform="translate(tx 0) scale(sx sy)" transform-origin="120 100"> */
function transformOf(svg) {
  const m = svg.match(/<g transform="translate\(([-\d.]+) 0\) scale\(([-\d.]+) ([-\d.]+)\)" transform-origin="120 100">/);
  return m ? { tx: +m[1], sx: +m[2], sy: +m[3] } : { tx: 0, sx: 1, sy: 1 };
}
const applyT = (T, [x, y]) => [r1((x - 120) * T.sx + 120 + T.tx), r1((y - 100) * T.sy + 100)];
const rectPoly = e => [[e.x, e.y], [e.x + e.w, e.y], [e.x + e.w, e.y + e.h], [e.x, e.y + e.h]];
const circlePoly = (cx, cy, r, n = 16) => Array.from({ length: n }, (_, k) => { const a = k / n * Math.PI * 2; return [r1(cx + Math.cos(a) * r), r1(cy + Math.sin(a) * r)]; });

/* ---------- lecture d'un schéma de profil (véhicule ou arme) ---------- */
function readProfile(svg, opts = {}) {
  const T = transformOf(svg), els = elements(svg);
  const parts = [], glass = [], wheels = [], lights = [];
  for (const e of els) {
    if (e.kind === 'circle') {
      const inkDisc = e.fill === INK, inkRing = e.fill === 'none' && e.stroke === INK;
      if ((inkDisc || inkRing) && e.r >= (opts.wheelMin || 8)) { const [cx, cy] = applyT(T, [e.cx, e.cy]); wheels.push([cx, cy, r1(e.r * T.sx)]); }
      else if (inkDisc && e.r >= 2.5) parts.push(circlePoly(...applyT(T, [e.cx, e.cy]), r1(e.r * T.sx), 12).map(p => p));
      continue;
    }
    const polys = e.kind === 'rect' ? [rectPoly(e)] : (e.d ? flattenPath(e.d) : []);
    /* trait à l'encre (cadre de vélo, fourche, arceau) : chaque segment devient un ruban de la largeur du trait */
    if (e.kind === 'path' && e.fill === 'none' && e.stroke === INK && e.so >= 0.8) {
      const sw = (e.sw || 2) * T.sx;
      for (const pl of (e.d ? flattenOpen(e.d) : [])) for (let k = 0; k + 1 < pl.length; k++) {
        const a = applyT(T, pl[k]), b = applyT(T, pl[k + 1]); const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy); if (len < 1) continue;
        const nx = -dy / len * sw / 2, ny = dx / len * sw / 2;
        parts.push([[r1(a[0] + nx), r1(a[1] + ny)], [r1(b[0] + nx), r1(b[1] + ny)], [r1(b[0] - nx), r1(b[1] - ny)], [r1(a[0] - nx), r1(a[1] - ny)]]);
      }
      continue;
    }
    for (const p0 of polys) {
      const p = p0.map(pt => applyT(T, pt));
      if (e.fill === INK && e.fo >= 0.8) { if (area(p) >= (opts.minArea || 6)) parts.push(p); }
      else if (e.fill === HL && e.fo >= 0.08 && e.fo <= 0.4) { if (area(p) >= 10) glass.push(p); }
      else if (e.fill === HL && e.fo >= 0.75 && area(p) >= 4) lights.push(bboxOf(p));
    }
  }
  /* les roues (disques pleins) sont retirées des silhouettes : un disque d'encre de rayon de roue n'est pas une pièce */
  return { parts, glass, wheels: dedupe(wheels), lights };
}
const bboxOf = p => { const b = bbox(p); return [r1(b.x0), r1(b.y0), r1(b.w), r1(b.h)]; };
const dedupe = ws => { const out = []; for (const w of ws) if (!out.some(o => Math.abs(o[0] - w[0]) < 3 && Math.abs(o[1] - w[1]) < 3)) out.push(w); return out; };

/* ---------- vue de dessus : contour (plus grande silhouette) et vitrages ---------- */
function readTop(body, T = { tx: 0, sx: 1, sy: 1 }) {
  const els = elements(body), tx = ([x, y]) => [r1((x - 120) * T.sx + 120 + T.tx), y];
  /* le contour de l'engin : la silhouette la plus longue et la plus grande (fuselage plutôt qu'aile, cabine plutôt que
     pale) ; les autres grandes silhouettes (ailes, stabilisateurs, pales) sont gardées à part */
  const inks = [], glass = [];
  for (const e of els) {
    if (e.kind === 'circle') continue;
    const polys = e.kind === 'rect' ? [rectPoly(e)] : (e.d ? flattenPath(e.d) : []);
    for (const p0 of polys) {
      const p = p0.map(tx);
      if (e.fill === INK && e.fo >= 0.8) { const b = bbox(p); if (b.h >= 3 && b.w >= 8) inks.push({ p, a: area(p), score: area(p) + 20 * b.w, thin: b.h < 8 }); }
      else if (e.fill === HL && e.fo >= 0.1 && e.fo <= 0.4 && area(p) >= 30) glass.push({ p, a: area(p) });
    }
  }
  inks.sort((a, b) => b.score - a.score); glass.sort((a, b) => b.a - a.a);
  const main = inks.find(x => !x.thin) || inks[0] || null, outline = main ? main.p : null;
  const plates = inks.filter(x => x !== main && x.a >= 150).map(x => x.p);
  return { outline, glass: glass.slice(0, 2).map(g => g.p), plates };
}
/* ---------- vue de face ou d'arrière : largeur de la caisse et feux ---------- */
function readFace(body) {
  const els = elements(body);
  let w = 0, x0 = 120, x1 = 120; const lights = [];
  for (const e of els) {
    if (e.kind === 'circle') { if (e.stroke === HL && e.so >= 0.75 && e.r >= 3.5) lights.push([r1(e.cx - e.r), r1(e.cy - e.r), r1(2 * e.r), r1(2 * e.r)]); continue; }
    const polys = e.kind === 'rect' ? [rectPoly(e)] : (e.d ? flattenPath(e.d) : []);
    for (const p of polys) {
      const b = bbox(p);
      if (e.fill === INK && e.fo >= 0.8 && b.w > w && b.h > 14) { w = b.w; x0 = b.x0; x1 = b.x1; }
      else if (e.fill === HL && e.fo >= 0.75 && area(p) >= 8 && b.w >= 3) lights.push(bboxOf(p));
    }
  }
  return { w: r1(w), x0: r1(x0), x1: r1(x1), lights };
}
module.exports = { flattenPath, flattenOpen, area, bbox, elements, transformOf, readProfile, readTop, readFace, circlePoly };
