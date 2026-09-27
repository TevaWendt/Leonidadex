'use strict';
/* v7.40 (lot 3) : vignette de la carte de Leonida pour les cartes-lieux des hubs.
   Le tracé des terres vient du fond dessiné de carte.html (calque « TERRES ») ; il est simplifié
   (Ramer-Douglas-Peucker, tolérance 30 unités sur 5200 × 6000, îlots de moins de 8 000 unités² ignorés)
   pour tenir dans un symbole SVG unique (~7 ko) réutilisé par chaque vignette avec <use>.
   Les coordonnées des lieux viennent de outils/data/carte-gtadb-source.json et de la liste POINTS de carte.js :
   ce sont exactement celles de la carte interactive. Sortie déterministe. */
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const W = 5200, H = 6000, EPS = 30, MIN_AREA = 8000;

function subpaths(d) {
  return (d.match(/M[^MZ]*Z?/g) || []).map(sp => (sp.match(/-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?/g) || []).map(p => p.split(',').map(Number)));
}
function rdp(pts, eps) {
  if (pts.length < 3) return pts;
  const [x1, y1] = pts[0], [x2, y2] = pts[pts.length - 1];
  const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1e-9;
  let dmax = 0, idx = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const [x, y] = pts[i]; const dist = Math.abs(dy * x - dx * y + x2 * y1 - y2 * x1) / L;
    if (dist > dmax) { dmax = dist; idx = i; }
  }
  if (dmax > eps) return rdp(pts.slice(0, idx + 1), eps).slice(0, -1).concat(rdp(pts.slice(idx), eps));
  return [pts[0], pts[pts.length - 1]];
}
function area(pts) { let a = 0; for (let i = 0; i < pts.length; i++) { const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % pts.length]; a += x1 * y2 - x2 * y1; } return Math.abs(a) / 2; }

let landCache = null;
function land() {
  if (landCache) return landCache;
  const html = read('carte.html');
  const m = html.match(/<!-- =+ TERRES[\s\S]*?-->\s*<g filter="url\(#shore\)">([\s\S]*?)<\/g>/);
  if (!m) throw Error('Calque « TERRES » introuvable dans carte.html');
  const d = m[1].match(/<path d="([^"]+)"/)[1];
  const out = [];
  for (const pts of subpaths(d)) {
    if (area(pts) < MIN_AREA) continue;
    const r = rdp(pts, EPS);
    if (r.length >= 3) out.push('M' + r.map(([x, y]) => Math.round(x) + ',' + Math.round(y)).join(' ') + 'Z');
  }
  landCache = out.join('');
  return landCache;
}

let pointsCache = null;
function points() {
  if (pointsCache) return pointsCache;
  const map = {};
  const src = JSON.parse(read('outils/data/carte-gtadb-source.json'));
  for (const p of [...src.groupes, ...src.lieux]) map[p.id] = { x: p.x, y: p.y, n: p.n, p: p.p || null };
  const m = read('carte.js').match(/const POINTS\s*=\s*(\[[\s\S]*?\n\s*\]);/);
  if (!m) throw Error('Liste POINTS introuvable dans carte.js');
  for (const p of vm.runInNewContext('(' + m[1] + ')')) if (!map[p.id]) map[p.id] = { x: p.x, y: p.y, n: p.n, p: p.p || null };
  pointsCache = map;
  return map;
}
function point(id) { const p = points()[id]; if (!p) throw Error('Lieu inconnu sur la carte : ' + id); return p; }

/* Symbole à poser une fois par page (avant la première vignette). */
function defs() {
  return '<svg class="lk-defs" width="0" height="0" aria-hidden="true" focusable="false"><symbol id="lk-leonida" viewBox="0 0 ' + W + ' ' + H + '"><path d="' + land() + '" fill-rule="evenodd"/></symbol></svg>';
}
/* Vignette : la silhouette de Leonida et un repère sur le lieu. */
function vignette(id) {
  const p = point(id);
  return '<svg class="ed-map" viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true" focusable="false"><use href="#lk-leonida"/>'
    + '<circle class="ed-map-halo" cx="' + p.x + '" cy="' + p.y + '" r="300"/><circle class="ed-map-pin" cx="' + p.x + '" cy="' + p.y + '" r="120"/></svg>';
}
module.exports = { land, points, point, defs, vignette, W, H };
if (require.main === module) console.log('Silhouette : ' + land().length + ' caractères, ' + Object.keys(points()).length + ' lieux.');
