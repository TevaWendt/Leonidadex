/* ============================================================
   LEONIDAKIT — vehicules-angles.cjs (v7.80) : trois autres angles du schéma de chaque véhicule
   (face, arrière, dessus), dans le style des silhouettes de profil de vehicules-schemas.cjs : silhouette d'encre,
   vitrage en voile clair, quelques traits de lumière. Les proportions viennent des mêmes paramètres que le profil
   (époque, marque, type de carrosserie, taille des roues, hauteur de toit, accessoires), si bien que les quatre
   angles d'un même engin se répondent. Schémas indicatifs : le type d'engin identifié, pas un modèle exact.
   viewBox 0 0 240 120 ; face et arrière posées au sol (y = 100) et agrandies (un engin vu de face est étroit :
   il remplit la hauteur du cadre plutôt que sa largeur) ; dessus centré, avant à droite.
   Tout trait de structure (fourche, arceau, patins, cadre de vélo) est posé à l'encre : les traits clairs ne
   servent qu'en lumière sur une surface sombre.
   angles(v) → {face, arriere, dessus} (contenu SVG, sans la balise <svg>) ou null.
   ============================================================ */
'use strict';
const S = require('./vehicules-schemas.cjs');
const INK = '#1A1A1E', HL = '#FDFBF7';
const r = n => Number(Number(n).toFixed(1));
const P = (d, o = 1) => `<path d="${d}" fill="${INK}"${o < 1 ? ` fill-opacity="${o}"` : ''}/>`;
const H = (d, w = 1.5, o = .55) => `<path d="${d}" fill="none" stroke="${HL}" stroke-opacity="${o}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const K = (d, w = 2.4, o = 1) => `<path d="${d}" fill="none" stroke="${INK}"${o < 1 ? ` stroke-opacity="${o}"` : ''} stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`; /* trait à l'encre */
const G = (d, o = .22) => `<path d="${d}" fill="${HL}" fill-opacity="${o}"/>`;
const L = (x, y, w, h, o = .9, rx = 1) => `<rect x="${r(x)}" y="${r(y)}" width="${r(w)}" height="${r(h)}" rx="${rx}" fill="${HL}" fill-opacity="${o}"/>`; /* feu */
const D = (x, y, w, h, rx = 2) => `<rect x="${r(x)}" y="${r(y)}" width="${r(w)}" height="${r(h)}" rx="${rx}" fill="${INK}"/>`;
const HC = (cx, cy, rr, w = 1.5, o = .55) => `<circle cx="${r(cx)}" cy="${r(cy)}" r="${r(rr)}" fill="none" stroke="${HL}" stroke-opacity="${o}" stroke-width="${w}"/>`;
const KC = (cx, cy, rr, w = 2) => `<circle cx="${r(cx)}" cy="${r(cy)}" r="${r(rr)}" fill="none" stroke="${INK}" stroke-width="${w}"/>`;
const C = (cx, cy, rr, f = INK, o = 1) => `<circle cx="${r(cx)}" cy="${r(cy)}" r="${r(rr)}" fill="${f}"${o < 1 ? ` fill-opacity="${o}"` : ''}/>`;
const GROUND = H('M8 100h224', 1.2, .25);
const CX = 120, YG = 100;

/* pneu vu de face : la partie basse dépasse sous la caisse */
const tyreF = (cx, wr, w = 14) => D(cx - w / 2, YG - 2 * wr, w, 2 * wr, 3) + H(`M${r(cx - w / 2 + 2)} ${YG - 3}h${w - 4}`, 1.2, .3);
/* roue vue de dessus (pneu qui dépasse à peine de la caisse) */
const tyreT = (x, y, len, w = 7) => D(x - len / 2, y - w / 2, len, w, 2) + H(`M${r(x - len / 2 + 2)} ${r(y)}h${len - 4}`, 1, .3);
/* boîte aux angles arrondis en haut (caisse vue de face ou d'arrière) */
const boxUp = (hl, hr, yTop, yBot, q = 6) => P(`M${r(hl)} ${r(yBot)}L${r(hl)} ${r(yTop + q)}Q${r(hl)} ${r(yTop)} ${r(hl + q)} ${r(yTop)}L${r(hr - q)} ${r(yTop)}Q${r(hr)} ${r(yTop)} ${r(hr)} ${r(yTop + q)}L${r(hr)} ${r(yBot)}Z`);

/* ---------- voitures (et pick-up, qui partagent le vocabulaire) ---------- */
const KV = 1.38; /* la face est dessinée plus grande que le profil : hauteur × 1,38 */
const Y = y => r(YG - (YG - y) * KV);
function carFront(o, rear) {
  const { style = 'notch', era = 'modern', brand = 'generic', extra = [], wr = 13 } = o;
  const seed = o.seed || '', j = (k, a) => S.jit(seed, k, a);
  const lift = extra.includes('lift') ? 10 : 0;
  let W = ({ suv: 110, van: 112, wagon: 104, hatch: 98, fast: 110, cabrio: 104, notch: 104 })[style] || 104;
  W += era === 'classic50' ? 6 : era === 'land70' ? 8 : era === 'wedge' ? 4 : era === 'luxury' ? 4 : 0;
  W = r(W + j('W', 3));
  const yRoof = r(Y(o.yRoof) - lift), yBelt = r(Y(o.yBelt) - lift), yHood = r(Y(o.yHood) - lift + (style === 'suv' || style === 'van' ? -2 : 0)), yb = r(91 - lift);
  const wrF = wr * 1.25;
  const gw = r(W * (style === 'van' ? .9 : style === 'suv' || style === 'wagon' ? .86 : .84)), rw = r(W * (style === 'van' ? .84 : style === 'suv' || style === 'wagon' ? .8 : style === 'fast' ? .62 : .7));
  const q = era === 'classic50' ? 14 : era === 'land70' ? 5 : era === 'boxy80' ? 3 : 8;
  let s = '';
  /* roues (derrière la caisse) */
  s += tyreF(CX - W / 2 + 9, wrF, o.knob ? 18 : 14) + tyreF(CX + W / 2 - 9, wrF, o.knob ? 18 : 14);
  if (lift) s += K(`M${r(CX - W / 2 + 14)} ${YG - 7}h${W - 28}`, 3); /* châssis visible */
  /* caisse */
  const hl = r(CX - W / 2), hr = r(CX + W / 2);
  s += boxUp(hl, hr, yHood, yb, q);
  /* cabine : trapèze aux angles arrondis */
  const gl = r(CX - gw / 2), gr = r(CX + gw / 2), rl = r(CX - rw / 2), rr = r(CX + rw / 2), rq = style === 'suv' || style === 'van' || era === 'boxy80' ? 3 : 9;
  if (style !== 'cabrio' || rear) s += P(`M${gl} ${yBelt + 1}L${rl} ${yRoof + rq}Q${rl} ${yRoof} ${rl + rq} ${yRoof}L${rr - rq} ${yRoof}Q${rr} ${yRoof} ${rr} ${yRoof + rq}L${gr} ${yBelt + 1}Z`);
  else s += P(`M${gl + 6} ${yBelt + 1}L${rl + 4} ${yRoof + 12}Q${rl + 4} ${yRoof + 9} ${rl + 8} ${yRoof + 9}L${rr - 8} ${yRoof + 9}Q${rr - 4} ${yRoof + 9} ${rr - 4} ${yRoof + 12}L${gr - 6} ${yBelt + 1}Z`);
  /* vitre (pare-brise ou lunette) */
  const gi = 4, yt = yRoof + rq + 1, ybt = yBelt - 1;
  if (style === 'cabrio' && !rear) s += G(`M${gl + 10} ${ybt}L${rl + 8} ${yRoof + 13}L${rr - 8} ${yRoof + 13}L${gr - 10} ${ybt}Z`, .26);
  else s += G(`M${gl + gi} ${ybt}L${rl + gi} ${yt}L${rr - gi} ${yt}L${gr - gi} ${ybt}Z`, rear ? .18 : .24);
  if (!rear && (era === 'modern' || era === 'luxury')) s += H(`M${rl + gi + 2} ${yt + 1}L${gl + gi + 3} ${ybt - 1}`, 1, .3); /* reflet du montant */
  if (rear && (style === 'wagon' || style === 'suv' || style === 'van' || style === 'hatch')) s += H(`M${CX + 6} ${yt + 3}L${CX + 18} ${ybt - 6}`, 1.4, .45); /* essuie-glace arrière */
  /* rétroviseurs */
  s += D(gl - 10, yBelt - 5, 9, 6, 2) + D(gr + 1, yBelt - 5, 9, 6, 2);
  if (!rear) s += H(`M${gl - 8} ${yBelt - 2}h5M${gr + 3} ${yBelt - 2}h5`, 1, .35);
  /* feux */
  const ly = r(yHood + 9);
  if (!rear) {
    if (era === 'classic50' || era === 'land70') s += HC(hl + 13, ly + 3, 6, 1.8, .85) + HC(hr - 13, ly + 3, 6, 1.8, .85) + C(hl + 13, ly + 3, 2.2, HL, .5) + C(hr - 13, ly + 3, 2.2, HL, .5);
    else if (era === 'boxy80') s += L(hl + 5, ly, 18, 7, .85) + L(hr - 23, ly, 18, 7, .85);
    else if (era === 'modern90') s += L(hl + 5, ly, 20, 6, .85, 2) + L(hr - 25, ly, 20, 6, .85, 2);
    else if (era === 'wedge') s += L(hl + 7, ly - 1, 20, 3.5, .8) + L(hr - 27, ly - 1, 20, 3.5, .8);
    else s += G(`M${hl + 4} ${ly + 1}L${hl + 26} ${ly - 3}L${hl + 26} ${ly + 2}L${hl + 7} ${ly + 6}Z`, .88) + G(`M${hr - 4} ${ly + 1}L${hr - 26} ${ly - 3}L${hr - 26} ${ly + 2}L${hr - 7} ${ly + 6}Z`, .88);
    if (era === 'modern' || era === 'luxury') s += H(`M${hl + 7} ${ly + 8}h11M${hr - 18} ${ly + 8}h11`, 1, .5); /* feux de jour */
    s += grilleFront(brand, era, style, CX, yHood, yb, W);
  } else {
    const ty = r(yBelt + 7);
    if (extra.includes('fins')) s += P(`M${hl - 2} ${yBelt - 9}L${hl + 10} ${yBelt + 2}L${hl + 2} ${yBelt + 2}Z`) + P(`M${hr + 2} ${yBelt - 9}L${hr - 10} ${yBelt + 2}L${hr - 2} ${yBelt + 2}Z`) + L(hl + 2, yBelt - 2, 3, 9, .8) + L(hr - 5, yBelt - 2, 3, 9, .8);
    else if (era === 'classic50') s += HC(hl + 11, ty + 3, 4, 1.6, .8) + HC(hr - 11, ty + 3, 4, 1.6, .8);
    else if (era === 'land70') s += L(hl + 5, ty, 30, 6, .8) + L(hr - 35, ty, 30, 6, .8) + H(`M${hl + 9} ${ty + 3}h22M${hr - 31} ${ty + 3}h22`, 1, .35);
    else if (era === 'boxy80') s += L(hl + 5, ty, 20, 8, .8) + L(hr - 25, ty, 20, 8, .8) + H(`M${hl + 5} ${ty + 4}h20M${hr - 25} ${ty + 4}h20`, 1, .35);
    else if (era === 'wedge') s += HC(hl + 12, ty + 3, 4, 1.6, .85) + HC(hl + 22, ty + 3, 4, 1.6, .85) + HC(hr - 12, ty + 3, 4, 1.6, .85) + HC(hr - 22, ty + 3, 4, 1.6, .85);
    else if (era === 'modern' || era === 'luxury') s += L(hl + 5, ty, 24, 4.5, .85, 2) + L(hr - 29, ty, 24, 4.5, .85, 2) + H(`M${hl + 29} ${ty + 2}L${hr - 29} ${ty + 2}`, 1.2, .5);
    else s += L(hl + 5, ty, 20, 6, .85, 2) + L(hr - 25, ty, 20, 6, .85, 2);
    /* plaque, badge, échappements */
    s += L(CX - 9, yb - 11, 18, 6, .45) + C(CX, yBelt + 10, 1.8, HL, .55);
    const ex = o.exhaust || 1;
    if (ex === 2) s += HC(CX - 20, yb - 3, 2.8, 1.4, .6) + HC(CX + 20, yb - 3, 2.8, 1.4, .6);
    else s += HC(hr - 18, yb - 3, 2.8, 1.4, .6);
    if (extra.includes('diffuser')) s += H(`M${CX - 12} ${yb - 6}v5M${CX - 4} ${yb - 6}v5M${CX + 4} ${yb - 6}v5M${CX + 12} ${yb - 6}v5`, 1.4, .45);
    if (extra.includes('spoiler')) s += P(`M${gl - 2} ${yBelt - 4}h${gw + 4}v4h${-(gw + 4)}z`);
    if (extra.includes('wing')) s += P(`M${gl - 6} ${yBelt - 15}h${gw + 12}v4h${-(gw + 12)}z`) + P(`M${gl + 6} ${yBelt - 11}h4v11h-4z`) + P(`M${gr - 10} ${yBelt - 11}h4v11h-4z`);
  }
  /* pare-chocs */
  if (era === 'classic50' || era === 'land70' || era === 'boxy80') s += H(`M${hl + 5} ${yb - 5}L${hr - 5} ${yb - 5}`, 2.8, .5);
  else if (!rear) s += D(CX - W * .28, yb - 11, W * .56, 7, 2) + H(`M${r(CX - W * .26)} ${yb - 7.5}h${r(W * .52)}`, 1, .3); /* prise d'air basse */
  if (!rear && (era === 'modern' || era === 'luxury' || era === 'modern90')) s += HC(hl + 14, yb - 9, 2.6, 1.2, .55) + HC(hr - 14, yb - 9, 2.6, 1.2, .55); /* antibrouillards */
  if (!rear) s += L(CX - 8, yb - 9, 16, 5, .4);
  /* toit : barres, rampe, taxi, antenne, toit ouvrant */
  for (const e of extra) {
    if (e === 'lightbar') s += D(rl + 6, yRoof - 7, rw - 12, 6, 2) + L(rl + 9, yRoof - 5.5, 10, 3, .85) + L(rr - 19, yRoof - 5.5, 10, 3, .85);
    if (e === 'rack') s += D(rl + 8, yRoof - 6, 4, 6, 1) + D(rr - 12, yRoof - 6, 4, 6, 1) + D(rl + 6, yRoof - 8, rw - 12, 3, 1);
    if (e === 'taxi') s += D(CX - 12, yRoof - 8, 24, 7, 2) + H(`M${CX - 7} ${yRoof - 4.5}h14`, 1.6, .7);
    if (e === 'scoop' && !rear) s += P(`M${CX - 12} ${yHood}l3 -5h18l3 5z`);
    if (e === 'bullbar' && !rear) s += K(`M${CX - 30} ${yb - 2}v${-(yb - yHood - 8)}M${CX + 30} ${yb - 2}v${-(yb - yHood - 8)}M${CX - 30} ${yHood + 10}h60`, 3);
    if (e === 'hoodstripe' && !rear) s += H(`M${CX - 7} ${yHood + 1}v${yb - yHood - 14}M${CX + 7} ${yHood + 1}v${yb - yHood - 14}`, 3, .55);
    if (e === 'chrome') s += H(`M${hl + 4} ${yb - 5}L${hr - 4} ${yb - 5}`, 3, .6);
    if (e === 'softtop' && !rear) s += H(`M${rl + 8} ${yRoof + 9}h${rw - 16}`, 2.4, .35);
  }
  if (o.fin) s += P(`M${CX - 4} ${yRoof}l2 -4h4l2 4z`);
  if (o.antenna && !o.fin && style !== 'cabrio') s += K(`M${r(CX + rw * .3)} ${yRoof}l1 -8`, 1.4);
  return s + GROUND;
}
function grilleFront(brand, era, style, cx, yHood, yb, W) {
  const top = yHood + 8, bot = yb - 14, mid = r((top + bot) / 2), h = bot - top;
  let s = '';
  switch (brand) {
    case 'audi': s += H(`M${cx - 26} ${top}L${cx - 30} ${mid}L${cx - 24} ${bot}L${cx + 24} ${bot}L${cx + 30} ${mid}L${cx + 26} ${top}Z`, 1.6, .55) + H(`M${cx - 22} ${top + 5}h44M${cx - 24} ${top + 10}h48`, 1, .35) + HC(cx, mid, 3, 1.2, .6); break;
    case 'bmw': s += H(`M${cx - 24} ${top + 2}q-6 ${h / 2} 0 ${h - 4}h20q2 -${h / 2} 0 -${h - 4}zM${cx + 4} ${top + 2}q-2 ${h / 2} 0 ${h - 4}h20q6 -${h / 2} 0 -${h - 4}z`, 1.6, .55) + H(`M${cx - 20} ${mid}h14M${cx + 6} ${mid}h14`, 1, .35); break;
    case 'mercedes': s += H(`M${cx - 34} ${mid}h68`, 3, .45) + HC(cx, mid, 6, 1.4, .8) + H(`M${cx} ${mid - 6}v12M${cx - 5} ${mid + 3}L${cx} ${mid}L${cx + 5} ${mid + 3}`, 1.2, .8); break;
    case 'lexus': s += H(`M${cx - 30} ${top}L${cx - 12} ${mid}L${cx - 30} ${bot}L${cx + 30} ${bot}L${cx + 12} ${mid}L${cx + 30} ${top}Z`, 1.6, .5) + H(`M${cx - 20} ${mid}h40`, 1, .3); break;
    case 'honda': s += H(`M${cx - 30} ${top + 3}h60`, 3.2, .55) + H(`M${cx - 6} ${top + 1}h12v5h-12z`, 1.2, .6); break;
    case 'toyota': s += H(`M${cx - 32} ${mid}L${cx - 36} ${bot}L${cx + 36} ${bot}L${cx + 32} ${mid}Z`, 1.6, .5) + H(`M${cx - 12} ${top + 3}h24`, 2, .55); break;
    case 'chevrolet': s += H(`M${cx - 32} ${top + 3}h64M${cx - 32} ${bot - 3}h64`, 2.2, .45) + H(`M${cx - 10} ${mid}h20`, 3, .7); break;
    case 'ford': s += H(`M${cx - 28} ${top + 2}L${cx - 32} ${mid}L${cx - 28} ${bot - 2}L${cx + 28} ${bot - 2}L${cx + 32} ${mid}L${cx + 28} ${top + 2}Z`, 1.6, .5) + HC(cx, mid, 4, 1.4, .7); break;
    case 'dodge': s += H(`M${cx - 30} ${top + 2}h60v${h - 4}h-60zM${cx} ${top + 2}v${h - 4}M${cx - 30} ${mid}h60`, 1.6, .5); break;
    case 'cadillac': s += H(`M${cx - 26} ${top}h52v${h}h-52z`, 1.4, .5) + H(`M${cx - 18} ${top}v${h}M${cx - 9} ${top}v${h}M${cx} ${top}v${h}M${cx + 9} ${top}v${h}M${cx + 18} ${top}v${h}`, 1, .35); break;
    case 'lincoln': s += H(`M${cx - 30} ${top + 2}h26v${h - 4}h-26zM${cx + 4} ${top + 2}h26v${h - 4}h-26z`, 1.4, .5) + H(`M${cx - 26} ${mid}h18M${cx + 8} ${mid}h18`, 1, .35); break;
    case 'buick': s += H(`M${cx - 30} ${top + 2}h60v${h - 4}h-60z`, 1.4, .45) + H(`M${cx - 22} ${top + 2}v${h - 4}M${cx - 11} ${top + 2}v${h - 4}M${cx} ${top + 2}v${h - 4}M${cx + 11} ${top + 2}v${h - 4}M${cx + 22} ${top + 2}v${h - 4}`, 1, .3); break;
    case 'pontiac': s += H(`M${cx - 30} ${top + 2}h26v${h - 4}h-26zM${cx + 4} ${top + 2}h26v${h - 4}h-26z`, 1.6, .5); break;
    case 'porsche': s += H(`M${cx - 36} ${bot - 4}h22M${cx + 14} ${bot - 4}h22`, 3, .45); break;
    case 'ferrari': s += H(`M${cx - 34} ${mid + 2}q34 ${h * .6} 68 0`, 2, .5) + H(`M${cx - 20} ${bot - 2}h40`, 1, .35); break;
    case 'lamborghini': s += H(`M${cx - 34} ${bot - 2}L${cx - 26} ${top + 4}h16L${cx - 6} ${bot - 2}zM${cx + 34} ${bot - 2}L${cx + 26} ${top + 4}h-16L${cx + 6} ${bot - 2}z`, 1.4, .5); break;
    case 'jaguar': s += H(`M${cx - 30} ${mid}q0 -${h / 2} 30 -${h / 2}q30 0 30 ${h / 2}q0 ${h / 2} -30 ${h / 2}q-30 0 -30 -${h / 2}z`, 1.6, .5) + H(`M${cx - 18} ${mid}h36`, 1, .3); break;
    case 'rolls': case 'bentley': s += H(`M${cx - 20} ${top - 2}h40v${h + 2}h-40z`, 2, .6) + H(`M${cx - 14} ${top}v${h}M${cx - 7} ${top}v${h}M${cx} ${top}v${h}M${cx + 7} ${top}v${h}M${cx + 14} ${top}v${h}`, 1, .4); break;
    case 'tesla': s += H(`M${cx - 20} ${bot - 4}h40`, 1.6, .35); break;
    default: s += H(`M${cx - 30} ${top + 4}h60M${cx - 30} ${top + 9}h60`, 1.6, .45) + (era === 'classic50' ? H(`M${cx - 36} ${mid}h72`, 2.4, .5) : '');
  }
  if (style === 'van' || style === 'suv') s += H(`M${cx - 36} ${yb - 13}h72`, 1.2, .3);
  return s;
}
function carTop(o) {
  const { style = 'notch', era = 'modern', extra = [], wr = 13, x0, x1, roofA, roofB, hoodStart } = o;
  const seed = o.seed || '', j = (k, a) => S.jit(seed, k, a);
  let W = ({ suv: 84, van: 86, wagon: 80, hatch: 74, fast: 88, cabrio: 80, notch: 78 })[style] || 78;
  W = r(W + (era === 'land70' ? 6 : era === 'wedge' ? 6 : 0) + j('Wt', 3));
  const cy = 60, t = r(cy - W / 2), b = r(cy + W / 2), q = era === 'classic50' ? 16 : era === 'boxy80' ? 5 : 10, tf = style === 'fast' ? 10 : 4;
  let s = '';
  /* roues (sous la caisse, elles dépassent à peine) */
  for (const x of [o.wa, o.wb]) s += tyreT(x, t - 1, wr * 1.6, 7) + tyreT(x, b + 1, wr * 1.6, 7);
  /* caisse : avant à droite, légèrement plus étroit */
  s += P(`M${x0 + q} ${t}L${x1 - q - 6} ${t + tf / 2}Q${x1} ${t + tf / 2} ${x1} ${t + tf / 2 + q}L${x1} ${b - tf / 2 - q}Q${x1} ${b - tf / 2} ${x1 - q - 6} ${b - tf / 2}L${x0 + q} ${b}Q${x0} ${b} ${x0} ${b - q}L${x0} ${t + q}Q${x0} ${t} ${x0 + q} ${t}Z`);
  /* vitrage : pare-brise, toit, lunette, vitres latérales */
  const gw = r(W * .74), gt = r(cy - gw / 2), gb = r(cy + gw / 2), ws = r(W * .82), wt = r(cy - ws / 2), wb = r(cy + ws / 2);
  const rearEnd = style === 'wagon' || style === 'suv' || style === 'van' ? x0 + 8 : style === 'hatch' ? roofB - 10 : roofB - 16;
  if (style === 'cabrio') s += G(`M${hoodStart + 2} ${wt}L${roofA} ${gt + 2}L${roofA} ${gb - 2}L${hoodStart + 2} ${wb}Z`, .26) + H(`M${roofA - 2} ${gt + 2}h${-(roofA - roofB - 4)}M${roofA - 2} ${gb - 2}h${-(roofA - roofB - 4)}`, 1.2, .35) + G(`M${roofB} ${gt + 4}h${roofA - roofB - 6}v${gw - 8}h${-(roofA - roofB - 6)}z`, .08);
  else {
    s += G(`M${hoodStart + 2} ${wt}L${roofA} ${gt}L${roofA} ${gb}L${hoodStart + 2} ${wb}Z`, .26); /* pare-brise */
    s += G(`M${roofB} ${gt}L${rearEnd} ${wt + 2}L${rearEnd} ${wb - 2}L${roofB} ${gb}Z`, .2); /* lunette */
    s += G(`M${roofA} ${gt}h${-(roofA - roofB)}v3h${roofA - roofB}zM${roofA} ${gb}h${-(roofA - roofB)}v-3h${roofA - roofB}z`, .16); /* vitres latérales */
    s += H(`M${roofA} ${gt + 3}h${-(roofA - roofB)}M${roofA} ${gb - 3}h${-(roofA - roofB)}`, 1, .25);
    if (o.sunroof) s += G(`M${roofA - 10} ${gt + 8}h-22v${gw - 16}h22z`, .22);
    if (era === 'land70' || o.vinyl) s += H(`M${roofA - 4} ${cy}h${-(roofA - roofB - 8)}`, 1.2, .3);
  }
  /* lignes de capot et de coffre */
  s += H(`M${hoodStart + 8} ${r(cy - W * .18)}L${x1 - 12} ${r(cy - W * .16)}M${hoodStart + 8} ${r(cy + W * .18)}L${x1 - 12} ${r(cy + W * .16)}`, 1.2, .4);
  if (!(style === 'wagon' || style === 'suv' || style === 'van' || style === 'hatch')) s += H(`M${rearEnd - 2} ${r(cy - W * .3)}L${x0 + 8} ${r(cy - W * .3)}M${rearEnd - 2} ${r(cy + W * .3)}L${x0 + 8} ${r(cy + W * .3)}`, 1, .3);
  /* rétroviseurs */
  s += D(hoodStart - 2, t - 7, 9, 6, 2) + D(hoodStart - 2, b + 1, 9, 6, 2);
  /* feux avant et arrière */
  const lw = era === 'classic50' ? 6 : 18;
  if (era === 'classic50' || era === 'land70') s += C(x1 - 8, t + 10, 3, HL, .85) + C(x1 - 8, b - 10, 3, HL, .85);
  else s += G(`M${x1 - 3} ${t + 6}L${x1 - lw} ${t + 3}L${x1 - lw + 2} ${t + 8}L${x1 - 5} ${t + 10}Z`, .85) + G(`M${x1 - 3} ${b - 6}L${x1 - lw} ${b - 3}L${x1 - lw + 2} ${b - 8}L${x1 - 5} ${b - 10}Z`, .85);
  s += L(x0 + 2, t + 5, era === 'land70' ? 26 : 14, 4, .8, 2) + L(x0 + 2, b - 9, era === 'land70' ? 26 : 14, 4, .8, 2);
  /* accessoires */
  for (const e of extra) {
    if (e === 'spoiler') s += D(x0 + 4, t + 6, 5, W - 12, 1);
    if (e === 'wing') s += D(x0 - 2, t + 2, 6, W - 4, 1) + D(x0 + 4, cy - W * .3, 6, 3, 1) + D(x0 + 4, cy + W * .3 - 3, 6, 3, 1);
    if (e === 'lightbar') s += D(roofA - (roofA - roofB) / 2 - 4, gt + 6, 7, gw - 12, 2) + L(roofA - (roofA - roofB) / 2 - 3, gt + 8, 5, 8, .85) + L(roofA - (roofA - roofB) / 2 - 3, gb - 16, 5, 8, .85);
    if (e === 'rack') s += H(`M${roofA - 4} ${gt + 7}h${-(roofA - roofB - 8)}M${roofA - 4} ${gb - 7}h${-(roofA - roofB - 8)}`, 2.6, .45);
    if (e === 'taxi') s += D(roofA - (roofA - roofB) / 2 - 10, cy - 4, 20, 8, 2);
    if (e === 'scoop') s += P(`M${hoodStart + 14} ${cy - 7}h16l3 7l-3 7h-16z`);
    if (e === 'hoodstripe') s += H(`M${hoodStart + 8} ${cy - 5}L${x1 - 10} ${cy - 5}M${hoodStart + 8} ${cy + 5}L${x1 - 10} ${cy + 5}`, 3, .5);
    if (e === 'fins') s += P(`M${x0 + 2} ${t - 2}h20v4h-20zM${x0 + 2} ${b - 2}h20v4h-20z`);
    if (e === 'bullbar') s += D(x1 + 1, t + 8, 4, W - 16, 1);
    if (e === 'twotone') s += G(`M${roofA} ${gt + 3}h${-(roofA - roofB)}v${gw - 6}h${roofA - roofB}z`, .08);
  }
  if (o.fin) s += P(`M${roofB + 10} ${cy - 2}h8l2 2l-2 2h-8z`);
  if (o.antenna && !o.fin) s += K(`M${roofB + 10} ${cy}h-8`, 1.4);
  const ex = o.exhaust || 1; for (let i = 0; i < ex; i++) s += H(`M${x0 - 3} ${r(cy + (ex === 1 ? W * .3 : (i ? 1 : -1) * W * .28))}h4`, 2.4, .5);
  return s;
}

/* ---------- pick-up ---------- */
function pickupViews(o) {
  const co = Object.assign({}, o, { style: 'suv', roofA: o.cabA, roofB: o.cabB, exhaust: 1, era: o.era || 'modern90' });
  const face = carFront(co, false);
  /* arrière : hayon plat, feux verticaux, cabine au-dessus de la benne */
  const lift = (o.extra || []).includes('lift') ? 10 : 0, W = r(112 + S.jit(o.seed || '', 'W', 3)), hl = r(CX - W / 2), hr = r(CX + W / 2), yb = 91 - lift, yBelt = r(Y(o.yBelt) - lift), yRoof = r(Y(o.yRoof) - lift), wrF = (o.wr || 13) * 1.25;
  let a = tyreF(hl + 10, wrF, o.knob ? 18 : 14) + tyreF(hr - 10, wrF, o.knob ? 18 : 14);
  if (lift) a += K(`M${hl + 14} ${YG - 7}h${W - 28}`, 3);
  a += P(`M${hl} ${yb}L${hl} ${yBelt - 6}L${hr} ${yBelt - 6}L${hr} ${yb}Z`); /* benne et hayon */
  const rw = r(W * .66), rl = r(CX - rw / 2), rr = r(CX + rw / 2);
  a += P(`M${rl} ${yBelt - 5}L${rl} ${yRoof + 3}Q${rl} ${yRoof} ${rl + 3} ${yRoof}L${rr - 3} ${yRoof}Q${rr} ${yRoof} ${rr} ${yRoof + 3}L${rr} ${yBelt - 5}Z`);
  a += G(`M${rl + 4} ${yBelt - 8}L${rl + 4} ${yRoof + 4}L${rr - 4} ${yRoof + 4}L${rr - 4} ${yBelt - 8}Z`, .2);
  a += H(`M${hl + 8} ${yBelt + 2}h${W - 16}M${hl + 8} ${yBelt + 12}h${W - 16}`, 1.2, .3) + L(hl + 4, yBelt - 3, 5, 20, .85, 1) + L(hr - 9, yBelt - 3, 5, 20, .85, 1);
  a += L(CX - 9, yb - 11, 18, 6, .45) + H(`M${hl + 4} ${yb - 5}L${hr - 4} ${yb - 5}`, 2.8, .5) + HC(hr - 18, yb - 3, 2.8, 1.4, .6);
  a += D(rl - 10, yBelt - 12, 9, 6, 2) + D(rr + 1, yBelt - 12, 9, 6, 2);
  if ((o.extra || []).includes('lightbar')) a += D(rl + 6, yRoof - 7, rw - 12, 6, 2) + L(rl + 9, yRoof - 5.5, 10, 3, .85) + L(rr - 19, yRoof - 5.5, 10, 3, .85);
  a += GROUND;
  /* dessus : cabine et benne ouverte */
  const Wt = r(84 + S.jit(o.seed || '', 'Wt', 3)), cy = 60, t = cy - Wt / 2, b = cy + Wt / 2, x0 = o.x0, x1 = o.x1;
  let d = '';
  for (const x of [o.wa, o.wb]) d += tyreT(x, t - 1, o.wr * 1.6, 8) + tyreT(x, b + 1, o.wr * 1.6, 8);
  d += P(`M${x0 + 4} ${t}L${x1 - 8} ${t + 2}Q${x1} ${t + 2} ${x1} ${t + 10}L${x1} ${b - 10}Q${x1} ${b - 2} ${x1 - 8} ${b - 2}L${x0 + 4} ${b}Q${x0} ${b} ${x0} ${b - 4}L${x0} ${t + 4}Q${x0} ${t} ${x0 + 4} ${t}Z`);
  const gw = r(Wt * .76), gt = cy - gw / 2, gb = cy + gw / 2;
  d += G(`M${o.hoodStart + 2} ${t + 4}L${o.cabA} ${gt}L${o.cabA} ${gb}L${o.hoodStart + 2} ${b - 4}Z`, .26) + G(`M${o.cabB + 2} ${gt}L${o.cabB - 6} ${gt + 2}L${o.cabB - 6} ${gb - 2}L${o.cabB + 2} ${gb}Z`, .2);
  d += G(`M${x0 + 6} ${t + 8}h${o.cabB - x0 - 16}v${Wt - 16}h${-(o.cabB - x0 - 16)}z`, .1) + H(`M${x0 + 6} ${t + 8}h${o.cabB - x0 - 16}v${Wt - 16}h${-(o.cabB - x0 - 16)}z`, 1.4, .45) + H(`M${x0 + 6} ${cy}h${o.cabB - x0 - 16}`, 1, .25);
  d += D(o.hoodStart - 2, t - 7, 9, 6, 2) + D(o.hoodStart - 2, b + 1, 9, 6, 2);
  d += G(`M${x1 - 3} ${t + 6}L${x1 - 18} ${t + 3}L${x1 - 16} ${t + 8}L${x1 - 5} ${t + 10}Z`, .85) + G(`M${x1 - 3} ${b - 6}L${x1 - 18} ${b - 3}L${x1 - 16} ${b - 8}L${x1 - 5} ${b - 10}Z`, .85) + L(x0 + 1, t + 4, 5, 10, .8, 1) + L(x0 + 1, b - 14, 5, 10, .8, 1);
  if ((o.extra || []).includes('bullbar')) d += D(x1 + 1, t + 8, 4, Wt - 16, 1);
  if ((o.extra || []).includes('lightbar')) d += D(o.cabA - 16, gt + 6, 7, gw - 12, 2);
  return { face, arriere: a, dessus: d };
}

/* ---------- camions, bus, divers (cabines hautes) ---------- */
function cabFront(W, yRoof, yBelt, wr, opts = {}) {
  const hl = r(CX - W / 2), hr = r(CX + W / 2), yb = 92;
  let s = tyreF(hl + 13, wr, 17) + tyreF(hr - 13, wr, 17);
  if (opts.behind) s += boxUp(hl - 2, hr + 2, opts.behind, yRoof + 10, 3); /* caisse plus haute derrière la cabine (ambulance, camion à capot) */
  s += boxUp(hl, hr, yRoof, yb, 7);
  s += G(`M${hl + 6} ${yRoof + 7}L${hr - 6} ${yRoof + 7}L${hr - 6} ${yBelt}L${hl + 6} ${yBelt}Z`, opts.glass || .24); /* pare-brise */
  if (opts.split) s += H(`M${CX} ${yRoof + 7}V${yBelt}`, 1.2, .35);
  s += H(`M${hl + 8} ${yRoof + 10}L${hl + 20} ${yBelt - 4}`, 1, .25);
  s += D(hl - 11, yBelt - 16, 9, 18, 2) + D(hr + 2, yBelt - 16, 9, 18, 2) + K(`M${hl - 2} ${yBelt - 8}h2M${hr} ${yBelt - 8}h2`, 2); /* rétroviseurs sur bras */
  s += H(`M${hl + 10} ${yBelt + 6}h${W - 20}`, 1.4, .35);
  if (opts.grille !== 'none') s += H(`M${r(CX - W * .3)} ${yBelt + 16}h${r(W * .6)}M${r(CX - W * .3)} ${yBelt + 22}h${r(W * .6)}M${r(CX - W * .3)} ${yBelt + 28}h${r(W * .6)}`, 1.8, .4);
  s += L(hl + 7, yb - 16, 16, 7, .85) + L(hr - 23, yb - 16, 16, 7, .85) + H(`M${hl + 4} ${yb - 5}L${hr - 4} ${yb - 5}`, 3.2, .5) + L(CX - 8, yb - 9, 16, 5, .4);
  if (opts.markers) s += C(CX - 14, yRoof - 2.5, 1.8, INK) + C(CX, yRoof - 2.5, 1.8, INK) + C(CX + 14, yRoof - 2.5, 1.8, INK);
  if (opts.lightbar) s += D(CX - W * .3, yRoof - 8, W * .6, 7, 2) + L(CX - W * .3 + 3, yRoof - 6.5, 10, 4, .85) + L(CX + W * .3 - 13, yRoof - 6.5, 10, 4, .85);
  if (opts.sign) s += L(CX - W * .3, yRoof + 9, W * .6, 7, .5);
  return s;
}
function boxRear(W, yTop, opts = {}) {
  const hl = r(CX - W / 2), hr = r(CX + W / 2), yb = 92, wr = opts.wr || 12;
  let s = tyreF(hl + 13, wr, 17) + tyreF(hr - 13, wr, 17);
  if (opts.axles === 3) s += tyreF(hl + 31, wr, 17) + tyreF(hr - 31, wr, 17);
  s += boxUp(hl, hr, yTop, yb, 4);
  if (opts.doors !== false) s += H(`M${CX} ${yTop + 4}V${yb - 12}`, 1.4, .4) + H(`M${CX - 8} ${yTop + 24}v12M${CX + 8} ${yTop + 24}v12`, 2, .35);
  if (opts.window) s += G(`M${hl + 8} ${yTop + 6}h${W - 16}v${opts.window}h${-(W - 16)}z`, .2);
  s += L(hl + 4, yb - 22, 5, 14, .85, 1) + L(hr - 9, yb - 22, 5, 14, .85, 1) + L(CX - 9, yb - 10, 18, 6, .45) + H(`M${hl + 4} ${yb - 5}L${hr - 4} ${yb - 5}`, 3.2, .5);
  if (opts.step) s += H(`M${hl + 10} ${yb - 1}h${W - 20}`, 2, .4);
  return s;
}
function boxTop(x0, x1, W, opts = {}) {
  const cy = 60, t = cy - W / 2, b = cy + W / 2, cab = opts.cab || 46;
  let s = '';
  for (const x of opts.wheels || [x0 + 30, x1 - 30]) s += tyreT(x, t - 1, 20, 8) + tyreT(x, b + 1, 20, 8);
  s += P(`M${x0 + 3} ${t}L${x1 - 3} ${t}Q${x1} ${t} ${x1} ${t + 3}L${x1} ${b - 3}Q${x1} ${b} ${x1 - 3} ${b}L${x0 + 3} ${b}Q${x0} ${b} ${x0} ${b - 3}L${x0} ${t + 3}Q${x0} ${t} ${x0 + 3} ${t}Z`);
  s += G(`M${x1 - cab + 8} ${t + 4}L${x1 - cab + 2} ${t + 6}L${x1 - cab + 2} ${b - 6}L${x1 - cab + 8} ${b - 4}Z`, .24); /* pare-brise */
  s += H(`M${x1 - cab - 2} ${t + 1}V${b - 1}`, 1.6, .45); /* séparation cabine / caisse */
  s += D(x1 - cab + 4, t - 8, 8, 7, 2) + D(x1 - cab + 4, b + 1, 8, 7, 2); /* rétroviseurs */
  if (opts.body === 'open') s += G(`M${x0 + 6} ${t + 6}h${x1 - cab - x0 - 14}v${W - 12}h${-(x1 - cab - x0 - 14)}z`, .1) + H(`M${x0 + 6} ${t + 6}h${x1 - cab - x0 - 14}v${W - 12}h${-(x1 - cab - x0 - 14)}z`, 1.4, .45);
  else if (opts.body === 'drum') s += H(`M${x0 + 14} ${cy}h${x1 - cab - x0 - 24}`, 10, .22) + H(`M${x0 + 14} ${cy - 6}h${x1 - cab - x0 - 24}M${x0 + 14} ${cy + 6}h${x1 - cab - x0 - 24}`, 1.2, .4);
  else if (opts.body === 'boom') s += H(`M${x0 + 8} ${cy}h${x1 - cab - x0 - 30}`, 4, .4) + H(`M${x0 + 8} ${cy - 8}v16`, 2, .4);
  else s += H(`M${x0 + 10} ${t + 8}h${x1 - cab - x0 - 20}M${x0 + 10} ${b - 8}h${x1 - cab - x0 - 20}`, 1, .25);
  if (opts.lightbar) s += D(x1 - cab + 14, t + 8, 7, W - 16, 2);
  if (opts.hatches) s += H(`M${x0 + 30} ${cy - 10}h14v20h-14zM${x1 - 70} ${cy - 10}h14v20h-14z`, 1.2, .4);
  s += G(`M${x1 - 3} ${t + 6}L${x1 - 14} ${t + 4}L${x1 - 14} ${t + 9}L${x1 - 5} ${t + 10}Z`, .85) + G(`M${x1 - 3} ${b - 6}L${x1 - 14} ${b - 4}L${x1 - 14} ${b - 9}L${x1 - 5} ${b - 10}Z`, .85) + L(x0 + 1, t + 4, 5, 10, .8, 1) + L(x0 + 1, b - 14, 5, 10, .8, 1);
  return s;
}
function truckViews(o) {
  const k = o.kind, wr = (o.wr || 12) * 1.15, W = 104, cab = o.hood ? 64 : 44;
  const amb = k === 'ambulance';
  const face = cabFront(W, amb ? 30 : 14, amb ? 58 : 50, wr, { markers: true, lightbar: amb, split: k === 'semi', behind: amb ? 14 : (k === 'box' || k === 'garbage' || k === 'semi' || k === 'mixer') ? 8 : o.hood ? 26 : 0 }) + GROUND;
  const hl = r(CX - W / 2), hr = r(CX + W / 2);
  const arr = (k === 'flat' ? tyreF(hl + 13, wr, 17) + tyreF(hr - 13, wr, 17) + P(`M${hl} 92L${hl} 72L${hr} 72L${hr} 92Z`) + H(`M${hl + 6} 78h${W - 12}`, 1.6, .4) + boxUp(CX - 24, CX + 24, 20, 72, 4) + G(`M${CX - 20} 24h40v16h-40z`, .2) + L(hl + 4, 80, 5, 8, .85, 1) + L(hr - 9, 80, 5, 8, .85, 1)
    : k === 'tow' ? boxRear(W, 46, { wr, doors: false }) + P(`M${CX - 6} 46L${CX - 6} 14L${CX + 6} 14L${CX + 6} 46Z`) + K(`M${CX} 14v-6`, 2)
    : k === 'dump' ? boxRear(W, 30, { wr, axles: 3, doors: false }) + H(`M${hl + 8} 42h${W - 16}`, 2, .45)
    : k === 'mixer' ? boxRear(W, 34, { wr, axles: 3, doors: false }) + HC(CX, 50, 24, 2, .4) + HC(CX, 50, 9, 1.4, .5)
    : k === 'garbage' ? boxRear(W, 24, { wr, axles: 3, doors: false }) + H(`M${hl + 10} 52h${W - 20}`, 2.4, .45) + H(`M${CX - 20} 68h40`, 3, .4)
    : k === 'semi' ? boxRear(W + 6, 10, { wr, axles: 3 })
    : boxRear(W, amb ? 14 : 18, { wr, window: amb ? 14 : 0, step: true })) + GROUND;
  const dessus = boxTop(16, 226, 84, { cab, body: k === 'flat' || k === 'dump' || k === 'garbage' ? 'open' : k === 'mixer' ? 'drum' : k === 'tow' ? 'boom' : 'box', lightbar: amb, wheels: o.axles === 3 ? [50, 72, 196] : [52, 196] });
  return { face, arriere: arr, dessus };
}
function busViews(o) {
  const k = o.kind, wr = (o.wr || 11) * 1.15, W = 108, yRoof = k === 'rv' ? 16 : 10;
  const face = cabFront(W, yRoof, k === 'city' ? 58 : 50, wr, { glass: .26, grille: 'none', sign: k !== 'rv', markers: k === 'coach' }) + GROUND;
  const arr = boxRear(W, yRoof, { wr, window: k === 'rv' ? 18 : 24, doors: k === 'rv' }) + (k === 'city' ? H(`M${CX - 30} 58h60M${CX - 30} 64h60M${CX - 30} 70h60`, 1.4, .4) : '') + GROUND;
  const dessus = boxTop(14, 226, 86, { cab: 30, hatches: true, body: 'box' }) + (k === 'coach' || k === 'rv' ? D(100, 44, 30, 32, 3) : '');
  return { face, arriere: arr, dessus };
}

/* ---------- motos, quads, vélos ---------- */
function motoViews(o) {
  const k = o.kind, wr = o.wr || 13;
  const wide = k === 'quad' || k === 'utv' || k === 'swamp';
  let f = '', a = '', d = '';
  if (wide) {
    const W = k === 'swamp' ? 122 : k === 'utv' ? 112 : 104, wrF = wr * (k === 'swamp' ? 1.15 : 1.25), tw = k === 'swamp' ? 26 : 22, hl = r(CX - W / 2), hr = r(CX + W / 2);
    const tyres = tyreF(hl + 12, wrF, tw) + tyreF(hr - 12, wrF, tw);
    const cage = `M${CX - 30} 66V30Q${CX - 30} 24 ${CX - 24} 24H${CX + 24}Q${CX + 30} 24 ${CX + 30} 30V66`;
    /* face */
    f += tyres + P(`M${hl + 8} 86L${hl + 14} 62L${hr - 14} 62L${hr - 8} 86Z`);
    if (k === 'quad') f += D(hl + 16, 56, W - 32, 5, 2) + D(CX - 2, 40, 4, 18, 1) + D(CX - 30, 36, 60, 4.5, 2) + D(CX - 34, 35, 7, 6.5, 2) + D(CX + 27, 35, 7, 6.5, 2) + HC(CX - 17, 72, 4, 1.8, .8) + HC(CX + 17, 72, 4, 1.8, .8) + G(`M${CX - 12} 64h24v6h-24z`, .2);
    else f += K(cage, 3.4) + K(`M${CX - 30} 40H${CX + 30}`, 2.6) + G(`M${CX - 26} 28h52v12h-52z`, .22) + G(`M${CX - 22} 46h44v16h-44z`, .1) + L(CX - 24, 68, 10, 4, .85) + L(CX + 14, 68, 10, 4, .85) + K(`M${hl + 12} 62V54M${hr - 12} 62V54M${hl + 12} 54H${hr - 12}`, 3);
    f += H(`M${hl + 22} 80h${W - 44}`, 2, .4);
    if (k === 'swamp') f += KC(CX, 36, 22, 2.4) + K(`M${CX - 22} 36h44M${CX} 14v44`, 1.4);
    /* arrière */
    a += tyres + P(`M${hl + 8} 86L${hl + 14} 64L${hr - 14} 64L${hr - 8} 86Z`);
    if (k === 'quad') a += D(hl + 16, 58, W - 32, 5, 2) + D(CX - 30, 36, 60, 4.5, 2) + D(CX - 2, 40, 4, 18, 1) + L(CX - 24, 70, 9, 4.5, .85) + L(CX + 15, 70, 9, 4.5, .85) + HC(CX + 26, 82, 2.6, 1.4, .6);
    else a += K(cage, 3.4) + K(`M${CX - 30} 40H${CX + 30}`, 2.6) + G(`M${CX - 26} 44h52v18h-52z`, .12) + L(CX - 24, 70, 9, 4.5, .85) + L(CX + 15, 70, 9, 4.5, .85);
    if (k === 'swamp') a += KC(CX, 36, 26, 3) + K(`M${CX - 26} 36h52M${CX} 10v52M${CX - 18} 18l36 36M${CX + 18} 18l-36 36`, 2) + C(CX, 36, 4, INK);
    /* dessus */
    const Wt = k === 'swamp' ? 92 : k === 'utv' ? 78 : 70, t = 60 - Wt / 2, b = 60 + Wt / 2;
    for (const x of [58, 184]) d += tyreT(x, t + 4, 28, 12) + tyreT(x, b - 4, 28, 12);
    d += P(`M44 ${t + 12}L196 ${t + 14}Q206 ${t + 14} 206 ${t + 22}L206 ${b - 22}Q206 ${b - 14} 196 ${b - 14}L44 ${b - 12}Z`);
    if (k === 'quad') d += D(100, 52, 60, 16, 6) + D(150, 60 - 30, 4, 60, 2) + G(`M170 ${t + 18}h20v${Wt - 36}h-20z`, .2);
    else d += K(`M108 ${t + 16}h60v${Wt - 32}h-60z`, 3) + G(`M112 ${t + 20}h52v${Wt - 40}h-52z`, .14) + G(`M${k === 'swamp' ? 70 : 170} ${t + 18}h18v${Wt - 36}h-18z`, .2);
    if (k === 'swamp') d += KC(62, 60, 20, 2.4) + K(`M42 60h40`, 1.4);
    return { face: f + GROUND, arriere: a + GROUND, dessus: d };
  }
  /* deux roues : roue, fourche, phare, guidon, rétroviseurs, moteur */
  const wrF = wr * 1.3, axle = YG - wrF, top = YG - 2 * wrF, hb = ({ sport: 50, naked: 60, cruiser: 68, chopper: 60, dirt: 62, scooter: 56, mobility: 50 })[k] || 58;
  const bar = k === 'chopper' ? 24 : k === 'sport' ? 40 : k === 'cruiser' ? 34 : k === 'dirt' ? 32 : 36;
  f += P(`M${CX - 16} 58q16 -8 32 0v16h-32z`); /* réservoir */
  if (k !== 'scooter' && k !== 'mobility') f += D(CX - 17, 72, 34, 18, 3) + H(`M${CX - 12} 78h24M${CX - 12} 84h24`, 1.2, .3) + HC(CX - 20, 93, 3, 1.4, .6) + HC(CX + 20, 93, 3, 1.4, .6); /* moteur, échappements */
  f += tyreF(CX, wrF, k === 'dirt' ? 10 : 12) + P(`M${CX - 10} ${top - 1}q10 -8 20 0v8h-20z`);
  f += D(CX - 8, bar + 8, 4, axle - bar - 8, 1.5) + D(CX + 4, bar + 8, 4, axle - bar - 8, 1.5); /* fourche */
  if (k === 'sport') f += P(`M${CX - 28} 48Q${CX} 34 ${CX + 28} 48L${CX + 24} 74L${CX - 24} 74Z`) + G(`M${CX - 16} 42Q${CX} 34 ${CX + 16} 42L${CX + 14} 50L${CX - 14} 50Z`, .26) + G(`M${CX - 22} 54L${CX - 10} 56L${CX - 12} 62L${CX - 22} 60Z`, .85) + G(`M${CX + 22} 54L${CX + 10} 56L${CX + 12} 62L${CX + 22} 60Z`, .85);
  else if (k === 'scooter') f += P(`M${CX - 20} 46Q${CX} 40 ${CX + 20} 46L${CX + 18} 88L${CX - 18} 88Z`) + G(`M${CX - 13} 34h26v10h-26z`, .22) + C(CX, 56, 5, HL, .85) + H(`M${CX - 10} 70h20`, 1.2, .3);
  else if (k === 'mobility') f += P(`M${CX - 18} 58h36v26h-36z`) + K(`M${CX - 12} 40h24v14h-24z`, 2.2) + C(CX, 62, 3, HL, .8);
  else if (k === 'dirt') f += D(CX - 12, 42, 24, 18, 3) + G(`M${CX - 9} 45h18v11h-18z`, .3);
  else f += C(CX, 54, 9, INK) + HC(CX, 54, 9, 1.4, .5) + C(CX, 54, 4, HL, .8);
  f += D(CX - hb / 2, bar, hb, 4.5, 2) + D(CX - hb / 2 - 3, bar - 1, 8, 6.5, 2) + D(CX + hb / 2 - 5, bar - 1, 8, 6.5, 2);
  if (k === 'chopper') f += D(CX - 22, bar + 4, 4, 22, 1) + D(CX + 18, bar + 4, 4, 22, 1);
  if (k !== 'dirt') f += D(CX - hb / 2 - 2, bar - 8, 2, 8, 1) + D(CX + hb / 2, bar - 8, 2, 8, 1) + C(CX - hb / 2 - 1, bar - 12, 4, INK) + C(CX + hb / 2 + 1, bar - 12, 4, INK) + HC(CX - hb / 2 - 1, bar - 12, 4, 1, .45) + HC(CX + hb / 2 + 1, bar - 12, 4, 1, .45); /* rétroviseurs */
  /* arrière : roue, selle, feu, plaque, échappements */
  a += tyreF(CX, wrF, k === 'dirt' ? 10 : 14) + P(`M${CX - 11} ${top - 1}q11 -8 22 0v10h-22z`);
  a += D(CX - 6, 50, 3, axle - 50, 1) + D(CX + 3, 50, 3, axle - 50, 1);
  if (k === 'scooter') a += P(`M${CX - 19} 48L${CX + 19} 48L${CX + 17} 84L${CX - 17} 84Z`) + L(CX - 8, 56, 16, 6, .85, 2) + L(CX - 9, 68, 18, 10, .35, 1);
  else a += P(`M${CX - 18} 44q18 -8 36 0v12q-18 4 -36 0z`) + L(CX - 7, 58, 14, 5, .85, 2) + L(CX - 9, 66, 18, 10, .35, 1) + (k === 'dirt' ? D(CX - 12, 72, 24, 6, 2) : '');
  const ex = k === 'sport' || k === 'chopper' || k === 'cruiser' ? 2 : 1;
  if (k !== 'mobility') { if (ex === 2) a += C(CX - 19, 90, 4.5, INK) + HC(CX - 19, 90, 4.5, 1.4, .6) + C(CX + 19, 90, 4.5, INK) + HC(CX + 19, 90, 4.5, 1.4, .6); else a += C(CX + 17, 90, 4.5, INK) + HC(CX + 17, 90, 4.5, 1.4, .6); }
  a += D(CX - hb / 2, bar + 2, hb, 3.5, 1.5) + C(CX - hb / 2 - 1, bar - 10, 4, INK) + C(CX + hb / 2 + 1, bar - 10, 4, INK);
  if (k === 'chopper') a += D(CX - 22, bar + 6, 4, 20, 1) + D(CX + 18, bar + 6, 4, 20, 1);
  if (k === 'mobility') { a = P(`M${CX - 18} 58h36v26h-36z`) + D(CX - 12, 40, 24, 14, 3) + tyreF(CX - 14, 7, 8) + tyreF(CX + 14, 7, 8) + L(CX - 10, 62, 6, 4, .85) + L(CX + 4, 62, 6, 4, .85); }
  /* dessus (avant à droite) */
  const len = k === 'scooter' ? 160 : k === 'mobility' ? 120 : 190, x0 = r(120 - len / 2), x1 = r(120 + len / 2), cy = 60, bw = k === 'chopper' ? 16 : 20;
  d += D(x0, cy - 6, 34, 12, 5) + D(x1 - 32, cy - 5, 32, 10, 5) + H(`M${x0 + 3} ${cy}h28M${x1 - 29} ${cy}h26`, 1, .3); /* roues */
  if (k === 'mobility') d = D(x0, cy - 24, 20, 8, 3) + D(x0, cy + 16, 20, 8, 3) + D(x1 - 22, cy - 4, 22, 8, 3) + P(`M${x0 + 10} ${cy - 20}h70v40h-70z`) + G(`M${x0 + 16} ${cy - 14}h30v28h-30z`, .12) + D(x1 - 50, cy - 18, 4, 36, 2);
  else {
    d += P(`M${x0 + 28} ${cy - bw / 2 + 3}Q${CX - 16} ${cy - bw / 2 - 8} ${CX + 10} ${cy - bw / 2 - 4}Q${CX + 34} ${cy - bw / 2 + 2} ${x1 - 38} ${cy - 5}L${x1 - 38} ${cy + 5}Q${CX + 34} ${cy + bw / 2 - 2} ${CX + 10} ${cy + bw / 2 + 4}Q${CX - 16} ${cy + bw / 2 + 8} ${x0 + 28} ${cy + bw / 2 - 3}Z`); /* selle et réservoir */
    d += G(`M${CX - 6} ${cy - bw / 2 - 3}q16 -2 30 2`, .25) + H(`M${x0 + 36} ${cy}h${CX - x0 - 46}`, 1, .25);
    if (k === 'sport' || k === 'scooter') d += P(`M${x1 - 66} ${cy - 17}L${x1 - 38} ${cy - 15}L${x1 - 38} ${cy + 15}L${x1 - 66} ${cy + 17}Z`) + G(`M${x1 - 60} ${cy - 10}h14v20h-14z`, .22);
    d += D(x1 - 46, cy - hb / 2, 4.5, hb, 2) + D(x1 - 48, cy - hb / 2 - 3, 8, 8, 2) + D(x1 - 48, cy + hb / 2 - 5, 8, 8, 2); /* guidon et poignées */
    if (k !== 'dirt') d += C(x1 - 54, cy - hb / 2 - 6, 4, INK) + C(x1 - 54, cy + hb / 2 + 6, 4, INK) + K(`M${x1 - 50} ${cy - hb / 2 - 4}l-4 -2M${x1 - 50} ${cy + hb / 2 + 4}l-4 2`, 1.6);
    d += L(x1 - 36, cy - 4, 6, 8, .8, 3); /* phare */
    d += D(CX - 6, cy - bw / 2 - 10, 10, 4, 1) + D(CX - 6, cy + bw / 2 + 6, 10, 4, 1); /* repose-pieds */
    if (ex === 2) d += D(x0 + 22, cy + bw / 2 + 4, 56, 5, 2.5) + D(x0 + 22, cy - bw / 2 - 9, 56, 5, 2.5); else d += D(x0 + 22, cy + bw / 2 + 4, 56, 5, 2.5);
  }
  return { face: f + GROUND, arriere: a + GROUND, dessus: d };
}
function bikeViews(o) {
  const k = o.kind, wr = (k === 'bmx' ? 12 : 14) * 1.3, drop = k === 'race', kick = k === 'kick', axle = YG - wr, top = YG - 2 * wr;
  let f = '', a = '', d = '';
  if (kick) {
    f += tyreF(CX, 9, 7) + D(CX - 2, 28, 4, axle - 28, 1.5) + D(CX - 22, 26, 44, 4, 2) + D(CX - 26, 25, 7, 6, 2) + D(CX + 19, 25, 7, 6, 2) + P(`M${CX - 10} 88h20v6h-20z`);
    a += tyreF(CX, 9, 7) + D(CX - 2, 30, 4, axle - 30, 1.5) + D(CX - 22, 26, 44, 4, 2) + P(`M${CX - 11} 86h22v8h-22z`) + L(CX - 3, 88, 6, 3, .8) + P(`M${CX - 7} 80h14v6h-14z`);
    d += D(40, 56, 16, 8, 4) + D(184, 56, 16, 8, 4) + P(`M56 53h108v14h-108z`) + D(198, 38, 4.5, 44, 2) + H(`M60 60h100`, 1, .25) + L(192, 57, 5, 6, .8, 2);
    return { face: f + GROUND, arriere: a + GROUND, dessus: d };
  }
  /* face : selle derrière, cadre, fourche, potence, guidon, pédalier */
  f += P(`M${CX - 10} 34q10 -5 20 0v5h-20z`) + D(CX - 2, 34, 4, 14, 1) + D(CX - 7, 76, 14, 10, 3) + D(CX - 16, 78, 7, 3.5, 1) + D(CX + 9, 84, 7, 3.5, 1);
  f += tyreF(CX, wr, 6) + P(`M${CX - 5} ${top - 1}q5 -4 10 0v6h-10z`) + D(CX - 5, 44, 2.6, axle - 44, 1.3) + D(CX + 2.4, 44, 2.6, axle - 44, 1.3) + D(CX - 2.5, 36, 5, 12, 1.5);
  f += drop ? K(`M${CX - 20} 32h40M${CX - 20} 32q0 10 6 12M${CX + 20} 32q0 10 -6 12`, 3) : D(CX - 23, 30, 46, 4, 2) + D(CX - 26, 29, 7, 6, 2) + D(CX + 19, 29, 7, 6, 2);
  if (k === 'ebike') f += D(CX - 4.5, 50, 9, 24, 2) + C(CX, 46, 3, HL, .8);
  if (k === 'mtb') f += D(CX - 7, top - 5, 14, 4, 1.5);
  if (k === 'cruiser') f += D(CX - 8, 46, 16, 10, 4);
  /* arrière : roue, haubans, selle, porte-bagages, catadioptre */
  a += tyreF(CX, wr, 6) + P(`M${CX - 6} ${top - 1}q6 -4 12 0v8h-12z`) + D(CX - 5, 44, 2.6, axle - 44, 1.3) + D(CX + 2.4, 44, 2.6, axle - 44, 1.3) + D(CX - 2.5, 36, 5, 12, 1.5);
  a += P(`M${CX - 11} 32q11 -5 22 0v6h-22z`) + L(CX - 2, 46, 4, 4, .85, 1) + D(CX - 6, 76, 12, 10, 3) + D(CX - 16, 78, 7, 3.5, 1) + D(CX + 9, 84, 7, 3.5, 1);
  a += drop ? K(`M${CX - 20} 30h40`, 3) : D(CX - 23, 28, 46, 3.5, 2);
  if (k === 'cruiser') a += D(CX - 12, 44, 24, 4, 2) + D(CX - 10, 48, 2, 8, 1) + D(CX + 8, 48, 2, 8, 1);
  if (k === 'ebike') a += D(CX - 12, 50, 24, 4, 2) + L(CX - 4, 56, 8, 3, .8);
  /* dessus (avant à droite) : roues, cadre, selle, guidon, pédales */
  d += D(34, 57, 30, 6, 3) + D(176, 57, 30, 6, 3) + D(62, 58.5, 118, 3, 1.5) + P(`M92 54h20v12h-20z`) + D(118, 42, 10, 4, 1) + D(118, 74, 10, 4, 1) + D(122, 46, 3, 28, 1);
  d += drop ? K(`M186 38v44M186 38h8M186 82h8`, 3) : D(184, 37, 4.5, 46, 2) + D(183, 36, 7, 7, 2) + D(183, 77, 7, 7, 2);
  if (k === 'ebike') d += D(80, 57, 30, 6, 3);
  if (k === 'cruiser') d += D(44, 52, 20, 16, 3);
  return { face: f + GROUND, arriere: a + GROUND, dessus: d };
}

/* ---------- bateaux ---------- */
function boatViews(o) {
  const k = o.kind, seed = o.seed || '', j = (kk, a) => S.jit(seed, kk, a);
  const yw = 88; /* ligne d'eau */
  const WATER = H('M8 88h224', 1.4, .3) + K('M20 95q8 -4 16 0t16 0t16 0t16 0t16 0t16 0t16 0t16 0t16 0t16 0t16 0t16 0', 1.2, .18);
  let f = '', a = '', d = '';
  const big = k === 'yacht' || k === 'ship' || k === 'ferry' || k === 'cat';
  const W = r((k === 'kayak' ? 26 : k === 'jetski' ? 48 : k === 'airboat' ? 86 : k === 'sail' ? 66 : k === 'rib' ? 76 : k === 'cat' ? 128 : big ? 118 : 88) + j('W', 4));
  const hl = r(CX - W / 2), hr = r(CX + W / 2), deck = k === 'kayak' ? 82 : k === 'jetski' ? 68 : k === 'airboat' ? 72 : big ? 50 : 58, keel = k === 'airboat' ? 92 : k === 'jetski' ? 96 : k === 'kayak' ? 94 : 100;
  const hull = (dk, kl, w) => P(`M${r(CX - w / 2)} ${dk}L${r(CX + w / 2)} ${dk}L${r(CX + w / 2 - 6)} ${yw}L${CX} ${kl}L${r(CX - w / 2 + 6)} ${yw}Z`);
  /* face (proue) : coque en V, pont, pare-brise ou superstructure */
  if (k === 'cat') f += hull(deck, 98, W) + G(`M${CX - 18} ${deck + 4}h36v${yw - deck - 6}h-36z`, .35); /* deux coques */
  else f += hull(deck, keel, W);
  if (k === 'rib') f += P(`M${hl - 4} ${deck - 6}q${W / 2 + 4} -10 ${W + 8} 0v12h${-(W + 8)}z`) + H(`M${hl + 4} ${deck}h${W - 8}`, 1.6, .4);
  if (big) {
    f += P(`M${r(CX - W * .36)} ${deck}L${r(CX - W * .32)} ${deck - 24}L${r(CX + W * .32)} ${deck - 24}L${r(CX + W * .36)} ${deck}Z`) + G(`M${r(CX - W * .28)} ${deck - 21}h${r(W * .56)}v9h${-r(W * .56)}z`, .24);
    if (k === 'ship' || k === 'ferry') f += P(`M${r(CX - W * .24)} ${deck - 24}L${r(CX - W * .22)} ${deck - 40}L${r(CX + W * .22)} ${deck - 40}L${r(CX + W * .24)} ${deck - 24}Z`) + G(`M${r(CX - W * .17)} ${deck - 37}h${r(W * .34)}v7h${-r(W * .34)}z`, .22) + D(CX - 5, deck - 52, 10, 12, 2);
    else f += D(CX - 2, deck - 40, 4, 16, 1) + K(`M${CX - 14} ${deck - 30}h28`, 2.6);
    f += H(`M${hl + 6} ${deck - 3}h${W - 12}`, 1.4, .4) + H(`M${hl + 10} ${deck + 10}h${W - 20}`, 1, .25);
  }
  else if (k === 'sail') f += D(CX - 2, 10, 4, deck - 10, 1) + P(`M${CX + 3} 14L${CX + 32} ${deck - 6}L${CX + 3} ${deck - 6}Z`, .85) + P(`M${CX - 3} 22L${CX - 24} ${deck - 6}L${CX - 3} ${deck - 6}Z`, .7);
  else if (k === 'kayak') f += P(`M${CX - 8} ${deck - 7}q8 -5 16 0v7h-16z`) + K(`M${CX - 46} ${deck - 34}L${CX + 46} ${deck - 20}`, 3) + P(`M${CX - 54} ${deck - 40}l12 4l-4 10l-12 -4z`) + P(`M${CX + 54} ${deck - 14}l-12 -4l4 -10l12 4z`);
  else if (k === 'jetski') f += P(`M${CX - 15} ${deck}L${CX - 11} ${deck - 16}L${CX + 11} ${deck - 16}L${CX + 15} ${deck}Z`) + D(CX - 18, deck - 21, 36, 4.5, 2) + D(CX - 22, deck - 22, 7, 6.5, 2) + D(CX + 15, deck - 22, 7, 6.5, 2) + G(`M${CX - 8} ${deck - 12}h16v6h-16z`, .22);
  else if (k === 'airboat') f += K(`M${CX - 18} ${deck}V${deck - 24}h36V${deck}`, 3) + P(`M${CX - 12} ${deck - 27}h24v7h-24z`) + KC(CX, deck - 46, 18, 2.4) + K(`M${CX - 18} ${deck - 46}h36M${CX} ${deck - 64}v36`, 1.4);
  else { f += P(`M${r(CX - W * .3)} ${deck}L${r(CX - W * .26)} ${deck - 16}L${r(CX + W * .26)} ${deck - 16}L${r(CX + W * .3)} ${deck}Z`) + G(`M${r(CX - W * .22)} ${deck - 14}h${r(W * .44)}v10h${-r(W * .44)}z`, .26); if (k === 'cabin' || k === 'taxi') f += P(`M${r(CX - W * .22)} ${deck - 16}L${r(CX - W * .2)} ${deck - 30}L${r(CX + W * .2)} ${deck - 30}L${r(CX + W * .22)} ${deck - 16}Z`) + G(`M${r(CX - W * .16)} ${deck - 27}h${r(W * .32)}v7h${-r(W * .32)}z`, .22); if (k === 'console' || k === 'speed') f += D(CX - 4, deck - 24, 8, 8, 2) + K(`M${CX - 12} ${deck - 22}h24`, 2); f += H(`M${hl + 8} ${deck + 6}h${W - 16}`, 1.2, .3); }
  if (k !== 'kayak') f += H(`M${hl + 6} ${yw}L${CX} ${keel}L${hr - 6} ${yw}`, 1.2, .4);
  /* arrière (poupe) : tableau arrière, moteurs, plateforme */
  a += P(`M${hl} ${deck}L${hr} ${deck}L${hr - 3} ${yw}L${CX} ${keel - 4}L${hl + 3} ${yw}Z`) + H(`M${hl + 6} ${deck + 6}h${W - 12}`, 1.2, .3);
  if (k === 'rib') a += P(`M${hl - 4} ${deck - 6}q${W / 2 + 4} -10 ${W + 8} 0v12h${-(W + 8)}z`);
  if (big) a += P(`M${r(CX - W * .32)} ${deck}L${r(CX - W * .3)} ${deck - 24}L${r(CX + W * .3)} ${deck - 24}L${r(CX + W * .32)} ${deck}Z`) + G(`M${r(CX - W * .24)} ${deck - 20}h${r(W * .48)}v8h${-r(W * .48)}z`, .18) + (k === 'ship' || k === 'ferry' ? P(`M${r(CX - W * .22)} ${deck - 24}L${r(CX - W * .2)} ${deck - 40}L${r(CX + W * .2)} ${deck - 40}L${r(CX + W * .22)} ${deck - 24}Z`) + D(CX - 5, deck - 52, 10, 12, 2) : K(`M${CX - 14} ${deck - 30}h28`, 2.6) + D(CX - 2, deck - 40, 4, 16, 1)) + H(`M${hl + 10} ${yw - 4}h${W - 20}`, 2, .4) + L(CX - 12, deck + 10, 24, 5, .4) + (k === 'ferry' ? G(`M${hl + 14} ${deck + 2}h${W - 28}v${yw - deck - 10}h${-(W - 28)}z`, .14) : '');
  else if (k === 'sail') a += D(CX - 2, 10, 4, deck - 10, 1) + K(`M${CX - 26} ${deck - 12}h52`, 3) + P(`M${CX - 7} ${deck}h14v8h-14z`) + L(CX - 10, deck + 12, 20, 4, .35);
  else if (k === 'kayak') a += P(`M${CX - 8} ${deck - 7}q8 -5 16 0v7h-16z`);
  else if (k === 'jetski') a += P(`M${CX - 15} ${deck}L${CX - 11} ${deck - 16}L${CX + 11} ${deck - 16}L${CX + 15} ${deck}Z`) + HC(CX, yw - 4, 4.5, 1.6, .6) + L(CX - 10, deck + 8, 20, 4, .35);
  else if (k === 'airboat') a += KC(CX, 48, 32, 3) + K(`M${CX - 32} 48h64M${CX} 16v64M${CX - 23} 25l46 46M${CX + 23} 25l-46 46`, 1.6) + C(CX, 48, 5, INK) + P(`M${CX - 14} 56h28v${deck - 56}h-28z`) + K(`M${CX - 18} ${deck}V${deck - 24}h36V${deck}`, 3);
  else { const n = k === 'console' || k === 'speed' ? 2 : 1; for (let i = 0; i < n; i++) { const mx = CX + (n === 1 ? 0 : (i ? 15 : -15)); a += P(`M${mx - 7} ${deck - 12}h14v28h-14z`) + P(`M${mx - 3.5} ${deck + 16}h7v14h-7z`) + H(`M${mx - 4} ${deck - 8}h8`, 1.2, .5); } a += H(`M${hl + 8} ${yw - 4}h${W - 16}`, 1.6, .4); if (k === 'cabin' || k === 'taxi') a += P(`M${r(CX - W * .22)} ${deck - 12}L${r(CX - W * .2)} ${deck - 30}L${r(CX + W * .2)} ${deck - 30}L${r(CX + W * .22)} ${deck - 12}Z`) + G(`M${r(CX - W * .16)} ${deck - 27}h${r(W * .32)}v7h${-r(W * .32)}z`, .18); }
  /* dessus : plan de pont, proue à droite */
  const Lb = r((k === 'kayak' ? 184 : k === 'jetski' ? 112 : k === 'airboat' ? 150 : big ? 214 : 192) + j('L', 6)), Wt = r((k === 'kayak' ? 22 : k === 'jetski' ? 38 : k === 'cat' ? 84 : big ? 74 : k === 'airboat' ? 68 : 58) + j('Wt', 3)), x0 = r(CX - Lb / 2), x1 = r(CX + Lb / 2), cy = 60, t = cy - Wt / 2, b = cy + Wt / 2;
  d += P(k === 'kayak' ? `M${x0} ${cy}Q${CX - 40} ${t} ${CX} ${t}Q${CX + 40} ${t} ${x1} ${cy}Q${CX + 40} ${b} ${CX} ${b}Q${CX - 40} ${b} ${x0} ${cy}Z` : `M${x0} ${t + 4}L${r(x1 - Lb * .32)} ${t}Q${x1} ${r(t + Wt * .1)} ${x1} ${cy}Q${x1} ${r(b - Wt * .1)} ${r(x1 - Lb * .32)} ${b}L${x0} ${b - 4}Z`);
  if (k === 'cat') d += G(`M${x0 + 10} ${cy - 5}h${r(Lb * .6)}v10h${-r(Lb * .6)}z`, .12);
  if (k === 'rib') d += H(`M${x0 + 4} ${t + 5}L${r(x1 - Lb * .32)} ${t + 5}M${x0 + 4} ${b - 5}L${r(x1 - Lb * .32)} ${b - 5}`, 5, .22);
  if (big) d += G(`M${r(x0 + Lb * .18)} ${t + 8}L${r(x1 - Lb * .42)} ${t + 8}L${r(x1 - Lb * .38)} ${cy}L${r(x1 - Lb * .42)} ${b - 8}L${r(x0 + Lb * .18)} ${b - 8}Z`, .12) + H(`M${r(x0 + Lb * .18)} ${t + 8}L${r(x1 - Lb * .42)} ${t + 8}L${r(x1 - Lb * .38)} ${cy}L${r(x1 - Lb * .42)} ${b - 8}L${r(x0 + Lb * .18)} ${b - 8}Z`, 1.2, .4) + G(`M${r(x1 - Lb * .5)} ${t + 12}h${r(Lb * .06)}v${Wt - 24}h${-r(Lb * .06)}z`, .22) + (k === 'ship' || k === 'ferry' ? H(`M${r(x0 + Lb * .3)} ${cy}h${r(Lb * .2)}`, 6, .2) : HC(x0 + Lb * .3, cy, 6, 1.2, .4));
  else if (k === 'sail') d += H(`M${x0 + 6} ${cy}L${x1 - 6} ${cy}`, 1.2, .35) + C(CX + 10, cy, 3, HL, .7) + H(`M${CX + 10} ${cy}L${x0 + 14} ${cy + 6}`, 2.2, .5);
  else if (k === 'kayak') d += G(`M${CX - 22} ${cy - 6}q22 -3 44 0q-22 3 -44 0z`, .25) + H(`M${x0 + 10} ${cy}h${Lb - 20}`, 1, .2);
  else if (k === 'jetski') d += G(`M${x1 - 44} ${cy - 10}h14v20h-14z`, .22) + P(`M${x0 + 10} ${cy - 8}h40v16h-40z`) + H(`M${x1 - 30} ${cy - 12}h4v24h-4`, 2, .5);
  else if (k === 'airboat') d += HC(x0 + 22, cy, 16, 2, .45) + P(`M${x0 + 36} ${cy - 10}h14v20h-14z`) + H(`M${x0 + 56} ${cy - 12}h${r(Lb * .5)}v24h${-r(Lb * .5)}z`, 1.2, .4);
  else { d += G(`M${r(x1 - Lb * .46)} ${t + 6}L${r(x1 - Lb * .42)} ${t + 6}L${r(x1 - Lb * .38)} ${cy}L${r(x1 - Lb * .42)} ${b - 6}L${r(x1 - Lb * .46)} ${b - 6}Z`, .26) + G(`M${x0 + 10} ${t + 8}h${r(Lb * .38)}v${Wt - 16}h${-r(Lb * .38)}z`, .1) + H(`M${x0 + 10} ${t + 8}h${r(Lb * .38)}v${Wt - 16}h${-r(Lb * .38)}z`, 1.2, .35); const n = k === 'console' || k === 'speed' ? 2 : 1; for (let i = 0; i < n; i++) d += D(x0 - 8, cy + (n === 1 ? -5 : (i ? 3 : -13)), 12, 10, 2); if (k === 'cabin') d += D(x1 - Lb * .36, t + 4, Lb * .16, Wt - 8, 4) + H(`M${r(x1 - Lb * .34)} ${cy}h${r(Lb * .1)}`, 1, .25); }
  return { face: f + WATER, arriere: a + WATER, dessus: d };
}

/* ---------- avions, hélicoptères ---------- */
function planeViews(o) {
  const k = o.kind;
  let f = '', a = '', d = '';
  if (k === 'blimp') {
    f += C(CX, 48, 38, INK) + HC(CX, 48, 38, 1.4, .3) + P(`M${CX - 16} 86h32v10h-32z`) + G(`M${CX - 12} 88h24v5h-24z`, .22) + H(`M${CX - 38} 48h76M${CX} 10v76`, 1, .2);
    a += C(CX, 48, 38, INK) + P(`M${CX - 2.5} 6h5v84h-5z`) + P(`M${CX - 42} 46h84v4.5h-84z`) + P(`M${CX - 16} 86h32v10h-32z`);
    d += P(`M20 60Q40 20 120 20Q200 20 224 60Q200 100 120 100Q40 100 20 60Z`) + H(`M30 60h180`, 1, .2) + P(`M20 56h20v8h-20z`) + P(`M100 60h40v8h-40z`, .8);
    return { face: f + GROUND, arriere: a + GROUND, dessus: d };
  }
  const jet = k === 'airliner' || k === 'bizjet', big = k === 'airliner';
  const fr = big ? 22 : k === 'bizjet' ? 14 : 12, fy = big ? 58 : 62, span = big ? 150 : k === 'biplane' ? 104 : k === 'twin' ? 124 : 114, high = k === 'cessna' || k === 'seaplane' || k === 'twin', wy = r(high ? fy - fr + 2 : fy + fr * .6);
  /* face : aile, fuselage, verrière, dérive, moteurs ou hélice, train */
  f += P(`M${CX - span / 2} ${wy - 2.5}L${CX + span / 2} ${wy - 2.5}L${CX + span / 2 - 2} ${wy + 3.5}L${CX - span / 2 + 2} ${wy + 3.5}Z`);
  if (k === 'biplane') f += P(`M${CX - span / 2 + 4} ${wy - 28}h${span - 8}v4.5h${-(span - 8)}z`) + K(`M${CX - 34} ${wy - 24}V${wy - 2}M${CX + 34} ${wy - 24}V${wy - 2}M${CX - 34} ${wy - 24}L${CX - 18} ${wy - 2}M${CX + 34} ${wy - 24}L${CX + 18} ${wy - 2}`, 2);
  f += C(CX, fy, fr, INK) + HC(CX, fy, fr, 1.2, .35) + G(`M${r(CX - fr * .7)} ${r(fy - fr * .6)}q${r(fr * .7)} -5 ${r(fr * 1.4)} 0v5h${-r(fr * 1.4)}z`, .26);
  f += P(`M${CX - 2.5} ${fy - fr}L${CX} ${fy - fr - (big ? 34 : 26)}L${CX + 2.5} ${fy - fr}Z`) + P(`M${CX - 3.5} ${fy - fr - (big ? 34 : 26)}h7v3.5h-7z`); /* dérive */
  if (jet) { if (big) f += D(CX - 50, wy + 3, 20, 14, 7) + D(CX + 30, wy + 3, 20, 14, 7) + HC(CX - 40, wy + 10, 5, 1.4, .5) + HC(CX + 40, wy + 10, 5, 1.4, .5); else f += D(CX - fr - 14, fy - 9, 12, 14, 6) + D(CX + fr + 2, fy - 9, 12, 14, 6) + HC(CX - fr - 8, fy - 2, 4, 1.2, .5) + HC(CX + fr + 8, fy - 2, 4, 1.2, .5); }
  else if (k === 'twin') f += KC(CX - 38, wy, 15, 1.8) + KC(CX + 38, wy, 15, 1.8) + C(CX - 38, wy, 4, INK) + C(CX + 38, wy, 4, INK) + K(`M${CX - 38} ${wy - 15}v30M${CX + 38} ${wy - 15}v30`, 1.4, .6);
  else f += KC(CX, fy, fr + 16, 1.8) + K(`M${CX} ${fy - fr - 16}V${fy + fr + 16}M${CX - fr - 14} ${fy - 8}L${CX + fr + 14} ${fy + 8}`, 2.4) + C(CX, fy, 4, HL, .6);
  if (k === 'seaplane') f += P(`M${CX - 30} 90h18v6h-18zM${CX + 12} 90h18v6h-18z`) + K(`M${CX - 21} 90V${fy + fr}M${CX + 21} 90V${fy + fr}`, 2.4);
  else f += K(`M${CX - 18} 96V${fy + fr - 2}M${CX + 18} 96V${fy + fr - 2}M${CX} 96V${fy + fr}`, 2.6) + C(CX - 18, 96, 3.5, INK) + C(CX + 18, 96, 3.5, INK) + C(CX, 96, 3, INK);
  /* arrière : empennage */
  a += P(`M${CX - span / 2} ${wy - 2.5}L${CX + span / 2} ${wy - 2.5}L${CX + span / 2 - 2} ${wy + 3.5}L${CX - span / 2 + 2} ${wy + 3.5}Z`) + C(CX, fy, fr, INK) + HC(CX, fy, fr, 1.2, .35);
  const ts = big ? 54 : 40, ty = big ? fy - fr - 26 : fy - 2;
  a += P(`M${CX - 2.5} ${fy - fr}L${CX} ${fy - fr - (big ? 34 : 26)}L${CX + 2.5} ${fy - fr}Z`) + P(`M${CX - ts / 2} ${ty}h${ts}v3.5h${-ts}z`) + H(`M${CX} ${fy - fr - 8}V${ty + 1}`, 1, .3);
  if (jet) { if (big) a += HC(CX - 40, wy + 10, 7, 1.6, .5) + HC(CX + 40, wy + 10, 7, 1.6, .5); else a += HC(CX - fr - 8, fy - 2, 5, 1.6, .5) + HC(CX + fr + 8, fy - 2, 5, 1.6, .5); }
  if (k === 'twin') a += KC(CX - 38, wy, 6, 1.6) + KC(CX + 38, wy, 6, 1.6);
  if (k === 'seaplane') a += P(`M${CX - 30} 90h18v6h-18zM${CX + 12} 90h18v6h-18z`); else a += C(CX - 18, 96, 3.5, INK) + C(CX + 18, 96, 3.5, INK) + K(`M${CX - 18} 96V${fy + fr - 2}M${CX + 18} 96V${fy + fr - 2}`, 2.6);
  /* dessus : fuselage, ailes (en flèche pour les jets), empennage */
  const Lf = big ? 220 : 190, x0 = CX - Lf / 2, x1 = CX + Lf / 2, cy = 60, fw = r(fr * 1.3), wx = big ? CX - 10 : CX, sp2 = big ? 108 : k === 'biplane' ? 90 : k === 'twin' ? 104 : 96;
  if (jet) d += P(`M${wx + 20} ${cy - fw / 2}L${wx - 26} ${cy - sp2 / 2}L${wx - 44} ${cy - sp2 / 2}L${wx - 14} ${cy + 1}L${wx - 44} ${cy + sp2 / 2}L${wx - 26} ${cy + sp2 / 2}L${wx + 20} ${cy + fw / 2}Z`);
  else d += P(`M${wx + 18} ${cy - fw / 2}L${wx + 14} ${cy - sp2 / 2}L${wx - 16} ${cy - sp2 / 2}L${wx - 18} ${cy + fw / 2}L${wx - 16} ${cy + sp2 / 2}L${wx + 14} ${cy + sp2 / 2}L${wx + 18} ${cy + fw / 2}Z`);
  if (k === 'biplane') d += H(`M${wx - 10} ${cy - sp2 / 2 + 4}h20M${wx - 10} ${cy + sp2 / 2 - 4}h20`, 1.6, .45);
  d += P(`M${x0 + 10} ${cy - fw / 2}L${x1 - 14} ${cy - fw / 2}Q${x1} ${cy - fw / 2} ${x1} ${cy}Q${x1} ${cy + fw / 2} ${x1 - 14} ${cy + fw / 2}L${x0 + 10} ${cy + fw / 2}L${x0} ${cy + 2}L${x0} ${cy - 2}Z`);
  d += P(`M${x0 + 12} ${cy - 2}L${x0 - 2} ${cy - ts / 2 + 6}L${x0 + 4} ${cy - ts / 2 + 6}L${x0 + 20} ${cy - 2}zM${x0 + 12} ${cy + 2}L${x0 - 2} ${cy + ts / 2 - 6}L${x0 + 4} ${cy + ts / 2 - 6}L${x0 + 20} ${cy + 2}z`); /* stabilisateurs */
  d += G(`M${x1 - 28} ${r(cy - fw * .32)}h12v${r(fw * .64)}h-12z`, .28); /* cockpit */
  if (big) d += D(wx - 24, cy - 44, 18, 8, 3) + D(wx - 24, cy + 36, 18, 8, 3) + H(`M${x0 + 30} ${cy - fw / 2 + 2}h${Lf - 60}M${x0 + 30} ${cy + fw / 2 - 2}h${Lf - 60}`, 1, .2);
  else if (k === 'bizjet') d += D(x0 + 26, cy - fw / 2 - 8, 16, 6, 3) + D(x0 + 26, cy + fw / 2 + 2, 16, 6, 3);
  else if (k === 'twin') d += D(wx - 4, cy - 34, 22, 7, 3) + D(wx - 4, cy + 27, 22, 7, 3);
  else d += K(`M${x1 - 2} ${cy - 12}v24`, 2.4);
  if (k === 'seaplane') d += D(x0 + 40, cy - 30, 100, 6, 3) + D(x0 + 40, cy + 24, 100, 6, 3);
  return { face: f + GROUND, arriere: a + GROUND, dessus: d };
}
function heliViews(o) {
  const k = o.kind, bw = ({ heavy: 64, medium: 54, attack: 46, light: 42, frame: 36 })[k] || 48, bh = ({ heavy: 44, medium: 40, attack: 38, light: 36, frame: 30 })[k] || 38, by = 60;
  const bt = by - bh / 2, bb = by + bh / 2, ry = bt - 16;
  let f = '', a = '', d = '';
  const wheels = k === 'heavy' || k === 'medium';
  const gear = wheels ? K(`M${CX - 22} 94V${bb - 2}M${CX + 22} 94V${bb - 2}`, 2.6) + C(CX - 22, 95, 4.5, INK) + C(CX + 22, 95, 4.5, INK) + HC(CX - 22, 95, 1.6, 1, .5) + HC(CX + 22, 95, 1.6, 1, .5)
    : K(`M${CX - 18} 96h12M${CX + 6} 96h12M${CX - 12} 96V${bb - 2}M${CX + 12} 96V${bb - 2}`, 3);
  const rotor = D(CX - 2.5, ry, 5, bt - ry + 2, 1) + D(CX - 104, ry - 2, 208, 3.5, 1.5) + D(CX - 7, ry - 4, 14, 6, 2);
  /* face : bulle, verrière, mât et rotor, train, armement */
  f += P(`M${CX - bw / 2} ${bb}L${CX - bw / 2} ${by}Q${CX - bw / 2} ${bt} ${CX} ${bt}Q${CX + bw / 2} ${bt} ${CX + bw / 2} ${by}L${CX + bw / 2} ${bb}Z`);
  f += G(`M${CX - bw / 2 + 6} ${by + 2}Q${CX - bw / 2 + 6} ${bt + 5} ${CX} ${bt + 5}Q${CX + bw / 2 - 6} ${bt + 5} ${CX + bw / 2 - 6} ${by + 2}Z`, k === 'frame' ? .32 : .26) + H(`M${CX} ${bt + 6}V${by}`, 1, .25);
  f += rotor + gear;
  if (k === 'attack') f += D(CX - bw / 2 - 26, by + 4, 30, 4.5, 2) + D(CX + bw / 2 - 4, by + 4, 30, 4.5, 2) + D(CX - bw / 2 - 20, by + 8, 12, 9, 3) + D(CX + bw / 2 + 8, by + 8, 12, 9, 3) + K(`M${CX - 8} ${bb}v6M${CX + 8} ${bb}v6`, 2);
  if (k === 'light' || k === 'frame') f += C(CX, bb - 8, 3.5, HL, .8);
  if (k === 'heavy') f += D(CX - bw / 2 - 10, by - 6, 10, 16, 3) + D(CX + bw / 2, by - 6, 10, 16, 3);
  f += L(CX - 12, bb - 6, 24, 3, .35, 1);
  /* arrière : cabine, poutre, dérive et rotor de queue */
  a += P(`M${CX - bw / 2 + 2} ${bb}L${CX - bw / 2 + 2} ${by}Q${CX - bw / 2 + 2} ${bt + 2} ${CX} ${bt + 2}Q${CX + bw / 2 - 2} ${bt + 2} ${CX + bw / 2 - 2} ${by}L${CX + bw / 2 - 2} ${bb}Z`) + H(`M${CX - bw / 2 + 10} ${by - 2}h${bw - 16}`, 1, .25);
  a += P(`M${CX - 4} ${bt + 4}L${CX - 2} 12L${CX + 6} 10L${CX + 6} ${bt + 4}Z`) + KC(CX + 10, 26, 11, 1.8) + K(`M${CX + 10} 15v22M${CX - 1} 26h22`, 1.8) + C(CX + 10, 26, 2.5, INK);
  a += rotor + gear + L(CX - 9, bb - 8, 18, 4, .45, 1) + C(CX, bt + 10, 2, HL, .7);
  if (k === 'attack') a += D(CX - bw / 2 - 26, by + 4, 30, 4.5, 2) + D(CX + bw / 2 - 4, by + 4, 30, 4.5, 2);
  if (k === 'heavy') a += D(CX - bw / 2 - 10, by - 6, 10, 16, 3) + D(CX + bw / 2, by - 6, 10, 16, 3);
  /* dessus : pales, cabine (avant à droite), poutre et rotor de queue */
  const cy = 60, Lb = k === 'heavy' ? 70 : 56, tw = r(bw * .9);
  d += P(`M${CX - 92} ${cy - 1.5}L${CX + 92} ${cy + 1.5}L${CX + 92} ${cy + 4.5}L${CX - 92} ${cy + 1.5}Z`) + P(`M${CX - 1.5} ${cy - 92}L${CX + 1.5} ${cy + 92}L${CX + 4.5} ${cy + 92}L${CX + 1.5} ${cy - 92}Z`);
  d += P(`M${CX + 30} ${cy - tw / 2}Q${CX + 30 + Lb * .5} ${cy - tw / 2 - 4} ${CX + 30 + Lb} ${cy}Q${CX + 30 + Lb * .5} ${cy + tw / 2 + 4} ${CX + 30} ${cy + tw / 2}L${CX - 10} ${cy + tw / 2 - 6}L${CX - 10} ${cy - tw / 2 + 6}Z`);
  d += P(`M${CX - 10} ${cy - 5}L${CX - 86} ${cy - 2}L${CX - 86} ${cy + 2}L${CX - 10} ${cy + 5}Z`) + KC(CX - 86, cy - 10, 7, 1.6) + K(`M${CX - 86} ${cy - 17}v14`, 1.6);
  d += G(`M${CX + 46} ${r(cy - tw * .3)}Q${CX + 30 + Lb - 4} ${r(cy - tw * .24)} ${CX + 30 + Lb - 4} ${cy}Q${CX + 30 + Lb - 4} ${r(cy + tw * .24)} ${CX + 46} ${r(cy + tw * .3)}Z`, .26) + C(CX + 10, cy, 6, INK) + HC(CX + 10, cy, 6, 1.2, .5);
  if (!wheels) d += K(`M${CX - 20} ${cy - tw / 2 - 7}h60M${CX - 20} ${cy + tw / 2 + 7}h60`, 2.8);
  if (k === 'attack') d += D(CX + 8, cy - tw / 2 - 20, 6, 18, 2) + D(CX + 8, cy + tw / 2 + 2, 6, 18, 2);
  return { face: f + GROUND, arriere: a + GROUND, dessus: d };
}
function railViews(o) {
  const k = o.kind, W = k === 'monorail' ? 100 : 116, yRoof = k === 'train' ? 12 : 16;
  const hl = r(CX - W / 2), hr = r(CX + W / 2);
  let f = boxUp(hl, hr, yRoof, 92, 10) + G(`M${hl + 10} ${yRoof + 8}h${W - 20}v${k === 'train' ? 20 : 28}h${-(W - 20)}z`, .24);
  f += C(hl + 18, 72, 3.6, HL, .85) + C(hr - 18, 72, 3.6, HL, .85) + C(CX, yRoof + 16, 2.8, HL, .8) + H(`M${hl + 8} 58h${W - 16}`, 1.6, .35);
  f += (k === 'monorail' ? P(`M${CX - 14} 92h28v8h-28z`) + K(`M${CX - 30} 100h60`, 3) : H(`M${hl + 6} 96h${W - 12}`, 2, .4) + D(CX - 9, 84, 18, 10, 2));
  if (k === 'train') f += H(`M${hl + 6} 86L${CX} 68L${hr - 6} 86`, 2, .4);
  let a = boxUp(hl, hr, yRoof, 92, 10) + G(`M${hl + 12} ${yRoof + 10}h${W - 24}v22h${-(W - 24)}z`, .18) + C(hl + 18, 72, 3.2, HL, .8) + C(hr - 18, 72, 3.2, HL, .8) + H(`M${CX} ${yRoof + 32}V84`, 1.4, .3) + (k === 'monorail' ? P(`M${CX - 14} 92h28v8h-28z`) : H(`M${hl + 6} 96h${W - 12}`, 2, .4));
  const cy = 60, t = cy - 34, b = cy + 34;
  let d = P(`M14 ${t + 4}Q14 ${t} 18 ${t}L222 ${t}Q230 ${t} 230 ${cy}Q230 ${b} 222 ${b}L18 ${b}Q14 ${b} 14 ${b - 4}Z`) + H(`M24 ${cy}h180`, 1, .2) + G(`M212 ${t + 8}h8v${68 - 16}h-8z`, .22);
  if (k === 'train') d += D(40, cy - 16, 60, 32, 3) + H(`M46 ${cy - 10}h48M46 ${cy}h48M46 ${cy + 10}h48`, 1, .3); else d += H(`M30 ${t + 8}h${160}M30 ${b - 8}h${160}`, 1, .25) + D(60, cy - 10, 20, 20, 3) + D(140, cy - 10, 20, 20, 3);
  return { face: f + GROUND, arriere: a + GROUND, dessus: d };
}
function miscViews(kind) {
  if (kind === 'forklift') {
    const f = tyreF(CX - 30, 11, 14) + tyreF(CX + 30, 11, 14) + P(`M${CX - 34} 92L${CX - 34} 58L${CX + 34} 58L${CX + 34} 92Z`) + D(CX - 32, 14, 5, 44, 1) + D(CX + 27, 14, 5, 44, 1) + D(CX - 32, 14, 64, 4, 1) + D(CX - 22, 28, 3, 30, 1) + D(CX + 19, 28, 3, 30, 1) + P(`M${CX - 44} 92h26v6h-26zM${CX + 18} 92h26v6h-26z`) + P(`M${CX - 14} 58L${CX - 10} 36L${CX + 10} 36L${CX + 14} 58Z`) + K(`M${CX - 18} 36h36`, 3) + GROUND;
    const a = tyreF(CX - 30, 11, 14) + tyreF(CX + 30, 11, 14) + P(`M${CX - 34} 92L${CX - 34} 54L${CX + 34} 54L${CX + 34} 92Z`) + K(`M${CX - 28} 54V18h56V54`, 4) + P(`M${CX - 14} 54L${CX - 10} 36L${CX + 10} 36L${CX + 14} 54Z`) + D(CX - 20, 60, 40, 16, 3) + L(CX - 30, 80, 6, 5, .8) + L(CX + 24, 80, 6, 5, .8) + GROUND;
    const d = tyreT(70, 36, 18, 8) + tyreT(70, 84, 18, 8) + tyreT(150, 36, 18, 8) + tyreT(150, 84, 18, 8) + P(`M56 40h100v40h-100z`) + K(`M160 30V90M166 30V90`, 3) + P(`M166 46h50v6h-50zM166 68h50v6h-50z`) + D(80, 52, 24, 16, 3) + H(`M60 44h92`, 1, .25);
    return { face: f, arriere: a, dessus: d };
  }
  if (kind === 'excavator') {
    const f = P(`M${CX - 50} 90h100v8h-100z`) + H(`M${CX - 44} 94h88`, 2, .3) + P(`M${CX - 36} 90L${CX - 30} 52L${CX + 30} 52L${CX + 36} 90Z`) + G(`M${CX - 22} 56h44v18h-44z`, .24) + P(`M${CX - 9} 52L${CX - 7} 14L${CX + 7} 14L${CX + 9} 52Z`) + P(`M${CX - 16} 14h32v9h-32z`) + GROUND;
    const a = P(`M${CX - 50} 90h100v8h-100z`) + P(`M${CX - 40} 90L${CX - 36} 48L${CX + 36} 48L${CX + 40} 90Z`) + H(`M${CX - 30} 58h60M${CX - 30} 70h60`, 1.6, .4) + D(CX - 44, 52, 88, 8, 2) + GROUND;
    const d = P(`M40 32h60v56h-60z`) + H(`M44 36h52M44 84h52`, 1, .3) + P(`M60 40h70v40h-70z`) + G(`M110 46h16v28h-16z`, .22) + P(`M130 56h70v8h-70zM200 50h20v20h-20z`);
    return { face: f, arriere: a, dessus: d };
  }
  if (kind === 'airtug') {
    const f = tyreF(CX - 40, 10, 14) + tyreF(CX + 40, 10, 14) + P(`M${CX - 50} 92L${CX - 50} 62L${CX + 50} 62L${CX + 50} 92Z`) + P(`M${CX - 18} 62L${CX - 18} 36L${CX + 18} 36L${CX + 18} 62Z`) + G(`M${CX - 14} 40h28v14h-28z`, .24) + L(CX - 44, 76, 12, 6, .85) + L(CX + 32, 76, 12, 6, .85) + K(`M${CX - 46} 96h92`, 3) + GROUND;
    const a = tyreF(CX - 40, 10, 14) + tyreF(CX + 40, 10, 14) + P(`M${CX - 50} 92L${CX - 50} 62L${CX + 50} 62L${CX + 50} 92Z`) + P(`M${CX - 18} 62L${CX - 18} 36L${CX + 18} 36L${CX + 18} 62Z`) + G(`M${CX - 14} 40h28v12h-28z`, .18) + L(CX - 44, 76, 8, 5, .85) + L(CX + 36, 76, 8, 5, .85) + D(CX - 10, 78, 20, 8, 2) + GROUND;
    const d = tyreT(60, 34, 18, 8) + tyreT(60, 86, 18, 8) + tyreT(180, 34, 18, 8) + tyreT(180, 86, 18, 8) + P(`M40 40h160v40h-160z`) + G(`M150 46h26v28h-26z`, .22) + D(44, 56, 10, 8, 2);
    return { face: f, arriere: a, dessus: d };
  }
  /* engin indéterminé : bloc avec cabine */
  const f = tyreF(CX - 36, 11, 14) + tyreF(CX + 36, 11, 14) + P(`M${CX - 42} 92L${CX - 42} 56L${CX + 42} 56L${CX + 42} 92Z`) + P(`M${CX - 20} 56L${CX - 20} 32L${CX + 20} 32L${CX + 20} 56Z`) + G(`M${CX - 16} 36h32v14h-32z`, .24) + GROUND;
  const d = tyreT(60, 36, 18, 8) + tyreT(60, 84, 18, 8) + tyreT(180, 36, 18, 8) + tyreT(180, 84, 18, 8) + P(`M44 42h152v36h-152z`) + G(`M160 48h24v24h-24z`, .22);
  return { face: f, arriere: f, dessus: d };
}

/* ---------- assemblage ---------- */
function angles(v) {
  const d = S.describe(v);
  const o = Object.assign({}, (d && d.o) || {}, { seed: v.id });
  let out;
  try {
    if (!d) out = miscViews('misc');
    else if (d.kind === 'car') out = { face: carFront(o, false), arriere: carFront(o, true), dessus: carTop(o) };
    else if (d.kind === 'pickup') out = pickupViews(o);
    else if (d.kind === 'truck') out = truckViews(o);
    else if (d.kind === 'bus') out = busViews(o);
    else if (d.kind === 'moto') out = motoViews(o);
    else if (d.kind === 'bike') out = bikeViews(o);
    else if (d.kind === 'boat') out = boatViews(o);
    else if (d.kind === 'plane') out = planeViews(o);
    else if (d.kind === 'heli') out = heliViews(o);
    else if (d.kind === 'rail') out = railViews(o);
    else out = miscViews(d.kind);
  } catch (e) { return null; }
  return out;
}
const VUES = [['profil', 'Profil'], ['face', 'Face'], ['arriere', 'Arrière'], ['dessus', 'Dessus']];
const wrap = body => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 120">' + body + '</svg>';
module.exports = { angles, wrap, VUES };
