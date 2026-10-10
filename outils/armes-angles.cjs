/* ============================================================
   LEONIDAKIT — armes-angles.cjs (v7.80) : deux autres angles du schéma de chaque arme, dans le style des
   silhouettes de profil d'armes-schemas.cjs : « dessus » (l'arme posée à plat, canon à droite) et « face »
   (bouche du canon vers soi, l'arme tenue droite). Silhouette d'encre, quelques traits de lumière, repères
   à l'encre pour les pièces fines. Schémas indicatifs : le type d'arme identifié, pas un modèle exact.
   viewBox 0 0 240 120. angles(id) → {dessus, face} (contenu SVG, sans la balise <svg>) ou null.
   ============================================================ */
'use strict';
const INK = '#1A1A1E', HL = '#FDFBF7';
const r = n => Number(Number(n).toFixed(1));
const P = (d, o = 1) => `<path d="${d}" fill="${INK}"${o < 1 ? ` fill-opacity="${o}"` : ''}/>`;
const H = (d, w = 1.4, o = .5) => `<path d="${d}" fill="none" stroke="${HL}" stroke-opacity="${o}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const K = (d, w = 2, o = 1) => `<path d="${d}" fill="none" stroke="${INK}"${o < 1 ? ` stroke-opacity="${o}"` : ''} stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const G = (d, o = .22) => `<path d="${d}" fill="${HL}" fill-opacity="${o}"/>`;
const D = (x, y, w, h, rx = 2) => `<rect x="${r(x)}" y="${r(y)}" width="${r(w)}" height="${r(h)}" rx="${rx}" fill="${INK}"/>`;
const L = (x, y, w, h, o = .5, rx = 1) => `<rect x="${r(x)}" y="${r(y)}" width="${r(w)}" height="${r(h)}" rx="${rx}" fill="${HL}" fill-opacity="${o}"/>`;
const C = (cx, cy, rr, f = INK, o = 1) => `<circle cx="${r(cx)}" cy="${r(cy)}" r="${r(rr)}" fill="${f}"${o < 1 ? ` fill-opacity="${o}"` : ''}/>`;
const HC = (cx, cy, rr, w = 1.4, o = .5) => `<circle cx="${r(cx)}" cy="${r(cy)}" r="${r(rr)}" fill="none" stroke="${HL}" stroke-opacity="${o}" stroke-width="${w}"/>`;
const KC = (cx, cy, rr, w = 2) => `<circle cx="${r(cx)}" cy="${r(cy)}" r="${r(rr)}" fill="none" stroke="${INK}" stroke-width="${w}"/>`;
const CY = 60, CX = 120;

/* ---------- vue de dessus : pièces en rubans centrés sur l'axe ---------- */
const bar = (x0, x1, w, rx = 2) => D(x0, CY - w / 2, x1 - x0, w, rx);                 /* pièce droite */
const taper = (x0, x1, w0, w1) => P(`M${x0} ${r(CY - w0 / 2)}L${x1} ${r(CY - w1 / 2)}L${x1} ${r(CY + w1 / 2)}L${x0} ${r(CY + w0 / 2)}Z`); /* pièce qui s'évase */
const sightR = x => D(x, CY - 5, 4, 10, 1) + G(`M${x + 1.2} ${CY - 1.5}h1.6v3h-1.6z`, .6);   /* hausse : cran */
const sightF = x => D(x, CY - 3, 3, 6, 1) + L(x + 0.8, CY - 1, 1.4, 2, .7, .5);           /* guidon */
const port = (x0, x1) => G(`M${x0} ${CY - 4.5}h${x1 - x0}v4h${-(x1 - x0)}z`, .28);      /* fenêtre d'éjection, côté droit */
const rail = (x0, x1, n) => { let s = ''; const st = (x1 - x0) / n; for (let i = 0; i < n; i++) s += H(`M${r(x0 + st * i + 1)} ${CY - 3}v6`, 1.2, .4); return s; };
const scopeT = (x0, x1) => D(x0, CY - 6, x1 - x0, 12, 6) + D(x0 + 4, CY - 7.5, 8, 15, 2) + D(x1 - 12, CY - 7.5, 8, 15, 2) + H(`M${x0 + 16} ${CY - 2}h${x1 - x0 - 32}`, 1.2, .35); /* lunette, bagues */
const axis = (x0, x1, o = .35) => H(`M${x0} ${CY}h${x1 - x0}`, 1.2, o);
const muzzle = x => L(x - 2, CY - 1.5, 2, 3, .55, .5);

/* ---------- vue de face : pièces vues en bout ---------- */
const hole = (cx, cy, rr) => C(cx, cy, rr, HL, .85) + C(cx, cy, rr * .45, INK);          /* bouche du canon */
const gripF = (w, y0, y1) => P(`M${r(CX - w / 2)} ${y0}L${r(CX + w / 2)} ${y0}L${r(CX + w / 2 - 2)} ${y1}Q${CX} ${y1 + 4} ${r(CX - w / 2 + 2)} ${y1}Z`) + H(`M${r(CX - w / 2 + 4)} ${y0 + 8}v${y1 - y0 - 16}M${r(CX + w / 2 - 4)} ${y0 + 8}v${y1 - y0 - 16}`, 1, .25);
const magF = (w, y0, y1) => P(`M${r(CX - w / 2)} ${y0}h${w}v${y1 - y0 - 3}q0 3 -3 3h${-(w - 6)}q-3 0 -3 -3z`) + H(`M${r(CX - w / 2 + 3)} ${y0 + 6}h${w - 6}`, 1, .25);
const stockF = (w, y0, y1) => D(CX - w / 2, y0, w, y1 - y0, 4) + H(`M${r(CX - w / 2 + 4)} ${y0 + 4}h${w - 8}`, 1, .2);
const guardF = y => K(`M${CX - 7} ${y}q0 9 7 9q7 0 7 -9`, 2.2);
const sightsF = (y, w = 16) => D(CX - w / 2, y, w, 5, 1) + G(`M${CX - 1.4} ${y + 1}h2.8v4h-2.8z`, .6) + D(CX - 1.4, y - 5, 2.8, 5, .8);

const T = {}, F = {};

/* ------------------------------ PISTOLETS ------------------------------ */
const pistolT = (x0, x1, g0, g1, o = {}) => bar(g0, g1, 16, 3) + bar(x0, x1, 12, 2) + (o.open ? G(`M${o.open[0]} ${CY - 3}h${o.open[1] - o.open[0]}v6h${-(o.open[1] - o.open[0])}z`, .3) : port(o.port ? o.port[0] : x0 + 54, o.port ? o.port[1] : x0 + 74)) + sightR(x0 + 4) + sightF(x1 - 7) + (o.hammer ? D(x0 - 7, CY - 2.5, 8, 5, 1) : '') + axis(x0 + 12, x1 - 12, .25) + muzzle(x1);
const pistolF = (o = {}) => gripF(18, 66, 100) + guardF(66) + D(CX - 12, 38, 24, 30, o.square ? 3 : 7) + (o.open ? '' : '') + hole(CX, 50, 5) + C(CX, 60, 2, HL, .45) + sightsF(33, 18) + H(`M${CX - 8} 44h16`, 1, .2);
T['girardi-es9'] = pistolT(46, 184, 52, 78, { open: [92, 150] }); F['girardi-es9'] = pistolF({});
T['klose-k17'] = pistolT(52, 176, 56, 80, {}); F['klose-k17'] = pistolF({ square: true });
T['nipper-38'] = pistolT(78, 170, 82, 104, { hammer: true, port: [112, 128] }); F['nipper-38'] = pistolF({});
T['pistolet-custom'] = pistolT(50, 176, 56, 80, { hammer: true }); F['pistolet-custom'] = pistolF({});
T['pistolet-auto'] = pistolT(52, 176, 56, 80, {}) + D(40, CY - 5, 12, 10, 2) + H(`M44 ${CY - 2}h5M44 ${CY + 2}h5`, 1, .4); F['pistolet-auto'] = pistolF({ square: true }) + magF(12, 100, 112);
const revolverT = (x0, x1, c0, c1, g0, g1) => bar(g0, g1, 14, 3) + bar(x0, c0 + 4, 10, 2) + D(c0, CY - 8, c1 - c0, 16, 6) + H(`M${c0 + 4} ${CY - 5}h${c1 - c0 - 8}M${c0 + 4} ${CY + 5}h${c1 - c0 - 8}`, 1, .3) + bar(c1 - 4, x1, 8, 2) + H(`M${c1 + 4} ${CY}h${x1 - c1 - 10}`, 2, .3) + sightR(x0 + 4) + sightF(x1 - 6) + D(x0 - 7, CY - 2.5, 8, 5, 1) + muzzle(x1);
const revolverF = () => gripF(16, 70, 100) + guardF(70) + D(CX - 18, 46, 36, 26, 8) + H(`M${CX - 12} 59h24`, 1, .2) + D(CX - 9, 38, 18, 14, 4) + hole(CX, 46, 4.5) + sightsF(33, 14);
T['hawk-little-morgan'] = revolverT(44, 200, 92, 132, 58, 98); F['hawk-little-morgan'] = revolverF();
T['mustang-357'] = revolverT(48, 202, 94, 134, 60, 98); F['mustang-357'] = revolverF();

/* ------------------------------ FUSILS À POMPE ------------------------------ */
T['fusil-double'] = taper(14, 96, 16, 13) + H(`M30 ${CY}h50`, 1.2, .25) + D(92, CY - 8, 30, 16, 3) + D(120, CY - 7, 40, 14, 3) + bar(96, 228, 7, 1) + D(96, CY - 7.5, 132, 7, 2) + D(96, CY + .5, 132, 7, 2) + H(`M110 ${CY - 4}h110M110 ${CY + 4}h110`, 1, .3) + sightF(222) + muzzle(228);
F['fusil-double'] = stockF(24, 58, 86) + D(CX - 11, 42, 22, 20, 4) + hole(CX - 4.5, 50, 4) + hole(CX + 4.5, 50, 4) + D(CX - 10, 62, 20, 22, 4) + guardF(84) + sightsF(37, 10);
T['fusil-pompe'] = taper(24, 78, 12, 13) + D(50, CY - 5, 30, 10, 2) + bar(78, 116, 13, 2) + D(116, CY - 8, 36, 16, 3) + H(`M122 ${CY - 5}v10M130 ${CY - 5}v10M138 ${CY - 5}v10M146 ${CY - 5}v10`, 1.2, .35) + bar(152, 228, 7, 1) + H(`M160 ${CY}h56`, 1, .25) + sightR(84) + sightF(222) + muzzle(228);
F['fusil-pompe'] = stockF(16, 56, 90) + D(CX - 11, 44, 22, 18, 4) + hole(CX, 50, 4.5) + C(CX, 60, 3, HL, .5) + D(CX - 13, 62, 26, 18, 5) + H(`M${CX - 8} 66v10M${CX} 66v10M${CX + 8} 66v10`, 1, .3) + guardF(80) + sightsF(39, 10);

/* ------------------------------ PISTOLETS-MITRAILLEURS ------------------------------ */
T['micro-smg'] = bar(60, 170, 16, 3) + D(60, CY - 9, 100, 4, 1.5) + D(60, CY + 5, 100, 4, 1.5) + H(`M64 ${CY - 7}h92M64 ${CY + 7}h92`, 1, .3) + bar(170, 196, 7, 1) + port(110, 128) + sightR(66) + sightF(162) + muzzle(196);
F['micro-smg'] = gripF(18, 72, 100) + guardF(72) + D(CX - 14, 42, 28, 30, 4) + hole(CX, 54, 4.5) + sightsF(37, 14) + D(CX - 16, 40, 32, 4, 1.5);
T['smg-compact'] = bar(70, 166, 12, 2) + D(74, CY + 7, 84, 3, 1.5) + bar(166, 186, 6, 1) + port(104, 120) + sightR(74) + sightF(178) + muzzle(186) + D(64, CY - 9, 8, 18, 2);
F['smg-compact'] = gripF(16, 68, 96) + magF(12, 96, 112) + guardF(68) + D(CX - 10, 44, 20, 24, 4) + hole(CX, 52, 4) + sightsF(39, 12) + K(`M${CX + 12} 50v22`, 2.4);
T['smg'] = taper(22, 56, 12, 14) + bar(56, 176, 14, 3) + bar(130, 186, 12, 2) + H(`M136 ${CY - 3}h40M136 ${CY + 3}h40`, 1, .3) + bar(176, 224, 7, 1) + D(118, CY - 5, 10, 10, 5) + G(`M121 ${CY - 2}h4v4h-4z`, .5) + sightF(216) + port(84, 100) + muzzle(224);
F['smg'] = stockF(14, 58, 80) + gripF(16, 70, 100) + magF(14, 100, 116) + guardF(70) + D(CX - 11, 44, 22, 26, 5) + hole(CX, 54, 4.5) + KC(CX, 40, 5, 2) + D(CX - 1.2, 36, 2.4, 8, .5);
T['pm-tactique'] = bar(60, 172, 14, 2) + D(56, CY - 7.5, 110, 4, 1.5) + rail(60, 166, 6) + bar(172, 212, 7, 1) + D(52, CY + 7, 40, 4, 1.5) + sightR(64) + sightF(204) + port(110, 126) + muzzle(212);
F['pm-tactique'] = gripF(16, 70, 100) + magF(12, 100, 114) + guardF(70) + D(CX - 11, 44, 22, 26, 3) + hole(CX, 54, 4.5) + sightsF(37, 14) + D(CX - 16, 46, 5, 26, 1.5);

/* ------------------------------ FUSILS D'ASSAUT ------------------------------ */
T['carabine'] = bar(8, 34, 12, 2) + bar(34, 60, 7, 2) + bar(60, 156, 14, 3) + D(100, CY - 3, 36, 6, 2) + bar(156, 196, 11, 3) + H(`M160 ${CY - 3}h30M160 ${CY + 3}h30`, 1, .3) + bar(196, 230, 6, 1) + D(188, CY - 4, 6, 8, 1) + port(118, 134) + sightR(64) + sightF(226) + muzzle(230);
F['carabine'] = stockF(16, 60, 80) + gripF(16, 70, 100) + magF(14, 98, 116) + guardF(70) + D(CX - 11, 42, 22, 28, 4) + KC(CX, 54, 8, 2.4) + hole(CX, 54, 4) + D(CX - 1.4, 34, 2.8, 10, .5) + D(CX - 8, 36, 16, 4, 1.5);
T['fusil-assaut'] = taper(8, 42, 13, 14) + H(`M14 ${CY}h22`, 1.2, .25) + bar(42, 142, 14, 2) + bar(142, 186, 12, 3) + H(`M148 ${CY - 3}h32M148 ${CY + 3}h32`, 1, .3) + bar(186, 230, 6, 1) + D(150, CY - 4, 6, 8, 1) + port(100, 118) + sightR(110) + sightF(224) + muzzle(230);
F['fusil-assaut'] = stockF(18, 58, 80) + gripF(16, 70, 100) + P(`M${CX - 7} 98h14l-2 16h-10z`) + guardF(70) + D(CX - 11, 44, 22, 26, 3) + hole(CX, 56, 4) + C(CX, 46, 3, HL, .5) + D(CX - 1.4, 34, 2.8, 10, .5) + KC(CX, 40, 4, 1.6);

/* ------------------------------ PRÉCISION ------------------------------ */
T['fusil-precision'] = taper(6, 46, 15, 13) + bar(46, 146, 13, 3) + H(`M50 ${CY}h20`, 1.2, .25) + scopeT(72, 142) + bar(146, 230, 7, 1) + H(`M152 ${CY}h70`, 1, .25) + D(116, CY + 5, 10, 5, 2) + sightF(224) + muzzle(230);
F['fusil-precision'] = stockF(22, 60, 90) + gripF(14, 74, 100) + guardF(74) + D(CX - 9, 48, 18, 24, 4) + hole(CX, 60, 4) + KC(CX, 36, 9, 2.4) + G(`M${CX - 5} 31a5 5 0 0 1 10 0a5 5 0 0 1 -10 0z`, .3) + D(CX - 3, 44, 6, 6, 1);
T['fusil-semi-auto'] = taper(6, 50, 15, 14) + bar(50, 150, 14, 3) + H(`M14 ${CY}h30`, 1.2, .25) + scopeT(80, 144) + bar(150, 232, 7, 1) + D(216, CY - 4.5, 12, 9, 2) + H(`M156 ${CY}h56`, 1, .25) + muzzle(232);
F['fusil-semi-auto'] = stockF(22, 60, 92) + magF(14, 92, 112) + guardF(78) + D(CX - 9, 48, 18, 24, 4) + hole(CX, 60, 4.5) + KC(CX, 36, 9, 2.4) + G(`M${CX - 5} 31a5 5 0 0 1 10 0a5 5 0 0 1 -10 0z`, .3) + D(CX - 3, 44, 6, 6, 1);

/* ------------------------------ MITRAILLEUSE ------------------------------ */
T['mitrailleuse'] = bar(6, 36, 14, 2) + bar(36, 156, 16, 3) + D(100, CY - 3, 30, 6, 2) + bar(156, 230, 8, 1) + D(170, CY - 9, 28, 3, 1.5) + D(170, CY + 6, 28, 3, 1.5) + H(`M44 ${CY - 4}h50M44 ${CY + 4}h50`, 1, .3) + sightR(60) + sightF(224) + muzzle(230);
F['mitrailleuse'] = stockF(18, 60, 82) + gripF(16, 72, 100) + guardF(72) + D(CX - 13, 42, 26, 30, 4) + hole(CX, 54, 5) + K(`M${CX - 6} 72L${CX - 26} 100M${CX + 6} 72L${CX + 26} 100`, 2.6) + D(CX - 1.4, 34, 2.8, 8, .5) + D(CX - 20, 74, 10, 20, 2);

/* ------------------------------ MÊLÉE ------------------------------ */
T['batte'] = P(`M20 ${CY + 6}q0 -8 12 -8l190 -14q10 0 10 8q0 8 -10 8l-190 14q-12 0 -12 -8z`) + P(`M20 ${CY - 2}h14v16h-14z`) + H(`M40 ${CY + 6}h40`, 1.4) + H(`M150 ${CY - 2}h60`, 1.2);
F['batte'] = C(CX, 56, 17, INK) + HC(CX, 56, 17, 1.2, .3) + C(CX, 56, 12, HL, .14) + HC(CX, 56, 6, 1.2, .35) + C(CX, 56, 2, HL, .5);
T['couteau-cran'] = D(30, CY - 6, 90, 12, 3) + C(44, CY, 3, HL, .6) + H(`M56 ${CY}h54`, 1.4, .5) + P(`M120 ${CY - 2.2}h92q6 0 8 2.2q-2 2.2 -8 2.2h-92z`) + H(`M124 ${CY}h78`, 1, .4) + D(112, CY - 4, 8, 2.5, 1);
F['couteau-cran'] = D(CX - 7, 64, 14, 40, 4) + H(`M${CX - 3} 70v28`, 1, .2) + P(`M${CX - 2.2} 22L${CX + 2.2} 22L${CX + 2.2} 64L${CX - 2.2} 64Z`) + H(`M${CX} 26v34`, .8, .5) + D(CX - 9, 62, 18, 4, 1);
T['club-golf'] = bar(40, 196, 4.5, 2) + D(36, CY - 3.5, 12, 7, 3) + P(`M190 ${CY - 7}h40q6 0 6 7q0 7 -6 7h-40q-6 -3 -6 -7q0 -4 6 -7z`) + H(`M196 ${CY - 3}h34M196 ${CY + 3}h34`, 1, .3);
F['club-golf'] = D(CX - 2.5, 20, 5, 70, 2) + D(CX - 4, 18, 8, 12, 3) + P(`M${CX - 20} 88q0 -4 4 -4h32q4 0 4 4v10q0 4 -4 4h-32q-4 0 -4 -4z`) + H(`M${CX - 14} 91h28M${CX - 14} 95h28`, 1, .3);
T['marteau'] = bar(30, 160, 8, 3) + H(`M40 ${CY}h100`, 1.4, .5) + D(156, CY - 24, 22, 48, 3) + P(`M178 ${CY - 12}h20q6 0 6 6v12q0 6 -6 6h-20z`) + P(`M156 ${CY - 24}l-18 4v6l18 -2zM156 ${CY + 24}l-18 -4v-6l18 2z`) + H(`M162 ${CY - 18}v36`, 1.2, .35);
F['marteau'] = D(CX - 4, 56, 8, 48, 3) + H(`M${CX - 1} 62v36`, 1, .25) + D(CX - 12, 22, 24, 36, 4) + H(`M${CX - 7} 28v24`, 1.2, .3) + G(`M${CX - 8} 26h16v6h-16z`, .2);
T['queue-billard'] = P(`M14 ${CY + 3}h214q4 0 4 -2v-2q0 -2 -4 -2h-214q-6 0 -6 3q0 3 6 3z`) + P(`M14 ${CY - 3}h50v12h-50z`, .9) + P(`M226 ${CY - 3}h8v6h-8z`) + H(`M20 ${CY}h36`, 1.2) + H(`M80 ${CY}h130`, 1);
F['queue-billard'] = C(CX, 60, 9, INK) + HC(CX, 60, 9, 1.2, .3) + C(CX, 60, 5, HL, .2) + C(CX, 60, 2.2, HL, .55);

/* ------------------------------ PROJECTILES ------------------------------ */
T['molotov'] = C(100, CY, 26, INK) + HC(100, CY, 26, 1.4, .3) + C(100, CY, 18, HL, .1) + C(100, CY, 10, INK) + HC(100, CY, 10, 1.2, .4) + P(`M126 ${CY - 4}h20l14 -10q6 -4 8 2q-2 8 -10 12h-32z`) + P(`M166 ${CY - 14}q10 -12 4 -20q10 8 6 20q-4 8 -10 8q-6 0 0 -8z`) + H(`M84 ${CY - 10}q4 -10 14 -12`, 1.4, .45);
F['molotov'] = P(`M${CX - 28} 90q0 -22 22 -28v-22h12v22q22 6 22 28v18q0 8 -8 8h-40q-8 0 -8 -8z`) + P(`M${CX - 8} 40h16l10 -10q6 -4 8 2q-2 8 -10 12h-24z`) + P(`M${CX + 22} 22q10 -12 4 -20q10 8 6 20q-4 8 -10 8q-6 0 0 -8z`) + H(`M${CX - 20} 86q4 -12 14 -16`, 1.4, .45) + H(`M${CX} 50v34`, 1.2, .3);
T['fumigene'] = C(104, CY, 30, INK) + HC(104, CY, 30, 1.4, .3) + C(104, CY, 22, HL, .1) + C(104, CY, 14, INK) + HC(104, CY, 14, 1.2, .4) + D(104, CY - 6, 48, 12, 4) + H(`M110 ${CY}h36`, 1.4, .4) + KC(158, CY - 10, 6, 2);
F['fumigene'] = P(`M${CX - 28} 36h56v68q0 6 -6 6h-44q-6 0 -6 -6z`) + P(`M${CX - 12} 24h24v12h-24z`) + D(CX + 14, 24, 10, 40, 4) + KC(CX - 14, 20, 6, 2) + H(`M${CX - 20} 50h40M${CX - 20} 62h40M${CX - 20} 74h40`, 1.2, .4);

/* ------------------------------ SPÉCIALES ------------------------------ */
T['harpon'] = bar(40, 170, 11, 3) + bar(170, 220, 5, 1) + P(`M220 ${CY - 5}l12 5l-12 5z`) + D(150, CY - 9, 24, 3, 1.5) + D(150, CY + 6, 24, 3, 1.5) + H(`M60 ${CY}h100`, 1.2, .35) + D(154, CY - 12, 4, 24, 1);
F['harpon'] = gripF(16, 70, 100) + guardF(70) + D(CX - 10, 46, 20, 24, 5) + KC(CX, 56, 6, 2) + C(CX, 56, 2, INK) + K(`M${CX - 14} 48v16M${CX + 14} 48v16`, 2.4) + D(CX - 16, 46, 32, 3, 1.5);
T['lance-grenades'] = bar(14, 42, 12, 2) + bar(42, 86, 14, 3) + D(86, CY - 21, 52, 42, 10) + H(`M92 ${CY - 14}h40M92 ${CY}h40M92 ${CY + 14}h40`, 1.4, .35) + HC(112, CY, 14, 1.4, .4) + bar(138, 208, 10, 3) + D(206, CY - 7, 10, 14, 3) + muzzle(216);
F['lance-grenades'] = stockF(16, 70, 86) + gripF(16, 74, 100) + KC(CX, 54, 24, 3) + C(CX, 54, 24, INK, .12) + hole(CX, 54, 6) + [0, 60, 120, 180, 240, 300].map(a => KC(CX + 15 * Math.cos(a * Math.PI / 180), 54 + 15 * Math.sin(a * Math.PI / 180), 4.5, 1.8)).join('') + D(CX - 18, 76, 36, 10, 3);

const VUES = [['profil', 'Profil'], ['dessus', 'Dessus'], ['face', 'Face']];
function angles(id) { if (!T[id] || !F[id]) return null; return { dessus: T[id], face: F[id] }; }
module.exports = { angles, VUES, ids: Object.keys(T) };
