// Motifs de tatouage v2 (style traditionnel « old school » et noir & gris) : contours noirs épais, ombrage noir dégradé,
// palette d'encres réduite. Dessins originaux (aucun motif du jeu). Rendus en PNG transparents 1024² pour ink.py.
const sharp = require('sharp');
const out = __dirname;
const K = '#151515', R = '#B8261E', R2 = '#7E1612', G = '#2F6B3B', G2 = '#1E4527', Y = '#E2AE3A', Y2 = '#A8741C', T = '#2C7F86', W = '#FFFFFF', S = '#9A9A9A';
const SW = 13; // trait
const st = (w = SW) => `stroke="${K}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
// ombrage : dégradé noir → transparent, appliqué dans la forme (clip)
let gid = 0;
function shade(shapeD, x1, y1, x2, y2, op = 0.85) {
  const id = 'g' + (++gid), cid = 'c' + gid;
  return `<defs><linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"><stop offset="0" stop-color="${K}" stop-opacity="${op}"/><stop offset="1" stop-color="${K}" stop-opacity="0"/></linearGradient>
  <clipPath id="${cid}"><path d="${shapeD}"/></clipPath></defs><rect x="0" y="0" width="1000" height="1000" fill="url(#${id})" clip-path="url(#${cid})"/>`;
}
function rshade(shapeD, cx, cy, r, op = 0.85, inner = 0.35) {
  const id = 'g' + (++gid), cid = 'c' + gid;
  return `<defs><radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${cx}" cy="${cy}" r="${r}"><stop offset="${inner}" stop-color="${K}" stop-opacity="0"/><stop offset="1" stop-color="${K}" stop-opacity="${op}"/></radialGradient>
  <clipPath id="${cid}"><path d="${shapeD}"/></clipPath></defs><rect x="0" y="0" width="1000" height="1000" fill="url(#${id})" clip-path="url(#${cid})"/>`;
}
const P = (d, fill, extra = '') => `<path d="${d}" fill="${fill}" ${extra}/>`;
const O = (d, w = SW) => `<path d="${d}" fill="none" ${st(w)}/>`;
const shaped = (d, fill, sh = '') => P(d, fill) + sh + O(d);

// ------------------------------------------------------------------ rose (réutilisée)
function rose(cx, cy, s = 1, col = R, col2 = R2) {
  const t = (x, y) => `${(cx + x * s).toFixed(1)} ${(cy + y * s).toFixed(1)}`;
  const outer = `M${t(-120, 10)} C${t(-130, -60)} ${t(-60, -110)} ${t(0, -100)} C${t(70, -112)} ${t(130, -60)} ${t(122, 10)} C${t(118, 80)} ${t(60, 118)} ${t(0, 112)} C${t(-62, 118)} ${t(-118, 78)} ${t(-120, 10)} Z`;
  const cup = `M${t(-70, -20)} C${t(-60, -70)} ${t(60, -72)} ${t(72, -18)} C${t(60, 30)} ${t(-58, 32)} ${t(-70, -20)} Z`;
  const p1 = `M${t(-120, 10)} C${t(-90, 60)} ${t(-30, 80)} ${t(0, 60)} C${t(30, 82)} ${t(95, 62)} ${t(122, 10)}`;
  const p2 = `M${t(-95, -55)} C${t(-60, -20)} ${t(-30, -30)} ${t(-10, -60)}`;
  const p3 = `M${t(95, -52)} C${t(60, -18)} ${t(28, -30)} ${t(10, -60)}`;
  const sp = `M${t(-38, -30)} C${t(-30, -55)} ${t(20, -60)} ${t(30, -36)} C${t(20, -20)} ${t(-10, -18)} ${t(-6, -36)}`;
  return P(outer, col) + rshade(outer, cx, cy - 10 * s, 130 * s, 0.9, 0.25) + P(cup, col) + shade(cup, cx, cy - 70 * s, cx, cy + 30 * s, 0.75) +
    O(outer) + O(cup) + O(p1, SW * 0.8) + O(p2, SW * 0.7) + O(p3, SW * 0.7) + O(sp, SW * 0.7);
}
function leaf(x, y, ang, s = 1, col = G) {
  const d = `M0 0 C40 -40 120 -40 170 0 C120 40 40 40 0 0 Z`;
  const v = `M10 0 C60 -4 110 -4 160 0 M60 -2 L80 -22 M100 -2 L118 -18 M60 2 L80 22 M100 2 L118 18`;
  return `<g transform="translate(${x} ${y}) rotate(${ang}) scale(${s})">${P(d, col)}${shade(d, 0, -40, 0, 40, 0.8)}${O(d)}${O(v, SW * 0.55)}</g>`;
}
function banner(x, y, w, h = 90, col = W) {
  // bannière vierge : ondulée, extrémités fendues, lignes d'ornement (aucun texte)
  const d = `M${x} ${y} C${x + w * 0.3} ${y - 30} ${x + w * 0.7} ${y + 30} ${x + w} ${y} L${x + w} ${y + h} C${x + w * 0.7} ${y + h + 30} ${x + w * 0.3} ${y + h - 30} ${x} ${y + h} Z`;
  const tl = `M${x + 10} ${y + 15} L${x - 90} ${y + 30} L${x - 50} ${y + h * 0.75} L${x - 95} ${y + h + 35} L${x + 10} ${y + h + 20} Z`;
  const tr = `M${x + w - 10} ${y + 15} L${x + w + 90} ${y + 30} L${x + w + 50} ${y + h * 0.75} L${x + w + 95} ${y + h + 35} L${x + w - 10} ${y + h + 20} Z`;
  const orn = `M${x + w * 0.12} ${y + h * 0.5} C${x + w * 0.3} ${y + h * 0.25} ${x + w * 0.45} ${y + h * 0.75} ${x + w * 0.5} ${y + h * 0.5} C${x + w * 0.55} ${y + h * 0.25} ${x + w * 0.7} ${y + h * 0.75} ${x + w * 0.88} ${y + h * 0.5}`;
  return P(tl, R) + shade(tl, x - 90, y, x + 10, y, 0.7) + O(tl) + P(tr, R) + shade(tr, x + w + 90, y, x + w - 10, y, 0.7) + O(tr) + P(d, col) + shade(d, x, y + h, x, y, 0.35) + O(d) + O(orn, SW * 0.6);
}

const motifs = {};
// ------------------------------------------------------------------ dague et rose
motifs.dagger = () => {
  const blade = 'M470 380 L530 380 L522 780 L500 900 L478 780 Z';
  const guard = 'M360 330 C380 300 420 318 440 340 L560 340 C580 318 620 300 640 330 C650 352 620 372 600 360 C590 352 575 365 560 372 L440 372 C425 365 410 352 400 360 C380 372 350 352 360 330 Z';
  const grip = 'M468 170 L532 170 L536 340 L464 340 Z';
  const pom = 'M500 80 C540 80 560 110 560 140 C560 170 535 185 500 185 C465 185 440 170 440 140 C440 110 460 80 500 80 Z';
  const drop1 = 'M480 935 C470 960 470 985 490 990 C510 985 510 960 500 935 C495 925 485 925 480 935 Z';
  const wraps = [190, 222, 254, 286, 318].map(y => `M466 ${y} L534 ${y + 14}`).join(' ');
  return leaf(500, 420, 200, 0.9) + leaf(520, 450, -15, 0.85) + rose(500, 470, 1.05) +
    shaped(blade, W, shade(blade, 470, 380, 500, 380, 0.75)) + O('M500 390 L500 860', SW * 0.6) +
    shaped(grip, '#6B4A2A', shade(grip, 464, 170, 536, 170, 0.6)) + O(wraps, SW * 0.6) +
    shaped(guard, Y, shade(guard, 360, 372, 360, 320, 0.7)) + shaped(pom, Y, rshade(pom, 485, 120, 70, 0.8)) + shaped(drop1, R);
};
// ------------------------------------------------------------------ crâne
motifs.skull = () => {
  const cran = 'M500 150 C650 150 760 260 760 420 C760 520 720 585 680 610 L680 690 C680 720 650 740 620 740 L380 740 C350 740 320 720 320 690 L320 610 C280 585 240 520 240 420 C240 260 350 150 500 150 Z';
  const eyeL = 'M350 430 C350 370 420 350 460 390 C485 420 470 490 420 500 C370 505 350 470 350 430 Z';
  const eyeR = 'M650 430 C650 370 580 350 540 390 C515 420 530 490 580 500 C630 505 650 470 650 430 Z';
  const nose = 'M500 520 C520 560 540 600 520 615 C510 620 505 605 500 600 C495 605 490 620 480 615 C460 600 480 560 500 520 Z';
  const jaw = 'M360 660 L640 660 L640 760 C640 800 600 830 560 830 L440 830 C400 830 360 800 360 760 Z';
  const teeth = [400, 440, 480, 520, 560, 600].map(x => `M${x} 660 L${x} 760`).join(' ') + ' M370 712 L630 712';
  const cracks = 'M500 160 L480 230 L505 270 L490 320 M700 300 L660 330 L670 370';
  return shaped(jaw, W, shade(jaw, 0, 830, 0, 660, 0.85)) + O(teeth, SW * 0.7) +
    shaped(cran, W, rshade(cran, 470, 330, 420, 0.95, 0.45) + shade(cran, 0, 740, 0, 560, 0.7)) +
    shaped(eyeL, K) + shaped(eyeR, K) + shaped(nose, K) + O(cracks, SW * 0.6) +
    O('M330 560 C360 600 400 610 430 600 M670 560 C640 600 600 610 570 600', SW * 0.7);
};
// ------------------------------------------------------------------ œil (dans un triangle rayonnant)
motifs.eye = () => {
  const tri = 'M500 160 L830 760 L170 760 Z';
  const lid = 'M260 560 C350 430 650 430 740 560 C650 690 350 690 260 560 Z';
  const iris = 'M500 470 A90 90 0 1 1 499.9 470 Z';
  const pup = 'M500 520 A40 40 0 1 1 499.9 520 Z';
  const rays = Array.from({ length: 14 }, (_, i) => { const a = -Math.PI / 2 + (i - 6.5) * 0.2; return `M${500 + Math.cos(a) * 470} ${520 + Math.sin(a) * 470} L${500 + Math.cos(a) * 560} ${520 + Math.sin(a) * 560}`; }).join(' ');
  const lashes = Array.from({ length: 9 }, (_, i) => { const x = 300 + i * 50; const y = 480 - Math.sin(i / 8 * Math.PI) * 50; return `M${x} ${y} L${x - 10 + i * 2.5} ${y - 45}`; }).join(' ');
  const irisLines = Array.from({ length: 16 }, (_, i) => { const a = i / 16 * Math.PI * 2; return `M${500 + Math.cos(a) * 45} ${560 + Math.sin(a) * 45} L${500 + Math.cos(a) * 85} ${560 + Math.sin(a) * 85}`; }).join(' ');
  const tear = 'M500 700 C485 730 485 760 500 765 C515 760 515 730 500 700 Z';
  return O(rays, SW * 0.8) + shaped(tri, Y, shade(tri, 0, 760, 0, 300, 0.8)) + shaped(lid, W, rshade(lid, 500, 560, 250, 0.7, 0.5)) +
    shaped(iris, T, rshade(iris, 500, 560, 95, 0.9, 0.2)) + O(irisLines, SW * 0.4) + shaped(pup, K) + `<circle cx="485" cy="545" r="12" fill="${W}"/>` +
    O(lashes, SW * 0.8) + shaped(tear, T);
};
// ------------------------------------------------------------------ fresque florale (deux roses, pivoine, feuilles)
motifs.flowers = () => {
  const peony = 'M640 300 C700 240 800 260 820 340 C860 380 850 460 790 480 C760 540 670 540 640 490 C580 480 560 400 600 360 C590 330 610 310 640 300 Z';
  const pin = 'M650 360 C690 330 760 340 770 390 C760 440 690 450 660 420 M700 345 C710 380 700 410 680 425 M740 350 C740 390 730 420 710 440';
  return leaf(260, 560, 160, 1.1, G) + leaf(380, 640, 100, 0.9, G) + leaf(620, 600, 30, 1.0, G) + leaf(700, 420, -40, 0.9, G) +
    shaped(peony, '#C86A8A', rshade(peony, 710, 390, 170, 0.85, 0.3)) + O(pin, SW * 0.7) +
    rose(380, 430, 1.05) + rose(560, 640, 0.85, '#D8822A', '#8A4510');
};
// ------------------------------------------------------------------ dragon (corps en S, écailles, crinière, flamme)
motifs.dragon = () => {
  const body = 'M180 760 C240 640 380 640 420 560 C460 480 380 400 420 320 C460 240 580 240 620 300 C660 360 600 420 640 480 C680 540 800 520 840 440 L870 470 C830 580 690 620 620 560 C560 510 610 430 580 370 C560 330 500 330 480 370 C450 430 520 500 480 590 C440 680 300 690 240 790 Z';
  const belly = 'M200 770 C260 670 390 660 440 575 M500 360 C520 330 560 330 575 365 M630 540 C690 590 800 560 845 460';
  const spikes = [[260, 690], [330, 655], [400, 600], [425, 520], [400, 440], [420, 360], [470, 300], [540, 275], [600, 300]].map(([x, y]) => `M${x} ${y} L${x - 25} ${y - 55} L${x + 25} ${y - 20}`).join(' ');
  const head = 'M840 440 C860 400 900 380 930 395 C960 410 965 440 945 455 L960 480 C930 500 890 495 870 470 Z';
  const horn = 'M880 395 C870 350 890 320 920 300 M905 392 C910 355 935 335 960 330';
  const whisk = 'M940 470 C980 500 990 540 960 570 M935 455 C985 450 1000 420 990 390';
  const flame = 'M960 480 C1000 500 990 560 950 560 C980 540 960 520 940 520 Z';
  const scales = [];
  for (let y = 230; y < 820; y += 26) for (let x = 160 + ((y / 26) % 2) * 15; x < 900; x += 30) scales.push(`M${x - 13} ${y} C${x - 7} ${y + 13} ${x + 7} ${y + 13} ${x + 13} ${y}`);
  const sc = `<defs><clipPath id="dc"><path d="${body}"/></clipPath></defs><g clip-path="url(#dc)"><path d="${scales.join(' ')}" fill="none" stroke="${K}" stroke-width="${SW * 0.35}" opacity="0.8"/></g>`;
  return O(spikes, SW * 0.6) + shaped(body, G, shade(body, 0, 300, 0, 800, 0.75) + sc) + O(belly, SW * 0.7) +
    shaped(head, G, rshade(head, 900, 430, 80, 0.8)) + `<circle cx="915" cy="425" r="11" fill="${Y}" stroke="${K}" stroke-width="6"/>` + O(horn, SW * 0.8) + O(whisk, SW * 0.6) + shaped(flame, R);
};
// ------------------------------------------------------------------ couronne
motifs.crown = () => {
  const band = 'M280 620 L720 620 L720 720 L280 720 Z';
  const body = 'M280 620 L250 380 L370 500 L420 300 L500 460 L580 300 L630 500 L750 380 L720 620 Z';
  const jewels = [[360, 670, R], [500, 670, T], [640, 670, R]].map(([x, y, c]) => `<ellipse cx="${x}" cy="${y}" rx="34" ry="26" fill="${c}" stroke="${K}" stroke-width="${SW * 0.8}"/>`).join('');
  const tips = [[250, 380], [420, 300], [580, 300], [750, 380]].map(([x, y]) => `<circle cx="${x}" cy="${y - 22}" r="24" fill="${W}" stroke="${K}" stroke-width="${SW * 0.8}"/>`).join('');
  const cush = 'M300 620 C340 560 660 560 700 620';
  return shaped(body, Y, shade(body, 0, 620, 0, 330, 0.8)) + O(cush, SW * 0.7) + tips + shaped(band, Y, shade(band, 0, 720, 0, 620, 0.6)) + jewels +
    O('M280 640 L720 640 M280 700 L720 700', SW * 0.5);
};
// ------------------------------------------------------------------ cœur et bannière (vierge)
motifs.heart = () => {
  const heart = 'M500 820 C380 720 220 620 220 440 C220 330 300 270 380 270 C440 270 480 310 500 350 C520 310 560 270 620 270 C700 270 780 330 780 440 C780 620 620 720 500 820 Z';
  return leaf(250, 360, 210, 0.8) + leaf(750, 360, -30, 0.8) + shaped(heart, R, rshade(heart, 450, 420, 380, 0.9, 0.35)) +
    `<path d="M330 370 C340 330 380 315 410 325" fill="none" stroke="${W}" stroke-width="16" stroke-linecap="round"/>` + banner(260, 520, 480, 100);
};
// ------------------------------------------------------------------ smiley qui coule
motifs.smiley = () => {
  const face = 'M500 200 C680 200 800 330 800 500 C800 600 760 680 700 730 L700 800 C700 830 670 830 670 800 L670 760 C640 780 610 790 580 795 L580 860 C580 895 545 895 545 860 L545 800 L500 802 C320 802 200 670 200 500 C200 330 320 200 500 200 Z';
  const mouth = 'M330 540 C380 680 620 680 670 540';
  return shaped(face, Y, rshade(face, 450, 430, 400, 0.85, 0.45)) + `<ellipse cx="410" cy="420" rx="38" ry="62" fill="${K}"/><ellipse cx="590" cy="420" rx="38" ry="62" fill="${K}"/>` +
    O(mouth, SW * 1.3) + O('M320 520 L345 560 M680 520 L655 560', SW);
};
// ------------------------------------------------------------------ quartier : skyline au couchant dans un médaillon (noir & gris)
motifs.hood = () => {
  const circ = 'M500 180 A320 320 0 1 1 499.9 180 Z';
  let sky = '';
  const bld = [[220, 640, 60, 120], [280, 560, 70, 200], [350, 600, 50, 160], [400, 470, 80, 290], [480, 540, 60, 220], [540, 430, 70, 330], [610, 580, 60, 180], [670, 520, 70, 240], [740, 610, 50, 150]];
  for (const [x, y, w, h] of bld) {
    sky += P(`M${x} ${y} L${x + w} ${y} L${x + w} ${y + h} L${x} ${y + h} Z`, K);
    for (let yy = y + 20; yy < y + h - 15; yy += 30) for (let xx = x + 10; xx < x + w - 10; xx += 20) sky += `<rect x="${xx}" y="${yy}" width="8" height="12" fill="${S}"/>`;
  }
  const palm = 'M300 760 C310 660 320 600 330 520 M330 520 C280 500 240 510 210 540 M330 520 C300 470 260 460 230 470 M330 520 C360 470 410 460 440 480 M330 520 C380 510 420 530 440 560 M330 520 C330 470 350 440 370 420';
  const sun = 'M500 560 A150 150 0 0 1 650 410';
  return `<defs><clipPath id="hc"><path d="${circ}"/></clipPath></defs><g clip-path="url(#hc)">` +
    shade(circ, 0, 180, 0, 760, 0.55) + `<circle cx="560" cy="560" r="170" fill="${S}" opacity="0.55"/>` +
    [0, 1, 2, 3].map(i => `<rect x="380" y="${590 + i * 28}" width="360" height="10" fill="${K}" opacity="0.5"/>`).join('') + sky + O(palm, SW * 1.1) +
    P('M150 760 L850 760 L850 900 L150 900 Z', K) + `</g>` + O(circ, SW * 1.2) + O('M500 150 A350 350 0 1 1 499.9 150', SW * 0.6);
};
// ------------------------------------------------------------------ Vice City : palmiers et coucher de soleil rayé (couleur)
motifs.palm = () => {
  const circ = 'M500 200 A300 300 0 1 1 499.9 200 Z';
  const stripes = [0, 1, 2, 3, 4].map(i => `<rect x="180" y="${500 + i * 38}" width="640" height="${14 + i * 3}" fill="${W}"/>`).join('');
  const trunk = (x, h, lean) => `M${x} 800 C${x + lean * 0.3} ${800 - h * 0.4} ${x + lean * 0.7} ${800 - h * 0.75} ${x + lean} ${800 - h}`;
  const fronds = (x, y) => [[-150, 20], [-110, -60], [-20, -100], [80, -70], [140, 10], [60, 60], [-70, 60]].map(([dx, dy]) => `M${x} ${y} C${x + dx * 0.4} ${y + dy * 0.6 - 40} ${x + dx * 0.8} ${y + dy * 0.8 - 20} ${x + dx} ${y + dy + 30}`).join(' ');
  const sun = 'M500 300 A200 200 0 0 1 700 500 L300 500 A200 200 0 0 1 500 300 Z';
  return `<defs><clipPath id="pc"><path d="${circ}"/></clipPath><linearGradient id="sg" x1="0" y1="300" x2="0" y2="760" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#F0A030"/><stop offset="0.5" stop-color="#E0505A"/><stop offset="1" stop-color="#8A2C7A"/></linearGradient></defs>` +
    `<g clip-path="url(#pc)"><rect x="150" y="150" width="700" height="700" fill="${T}"/>` + shade(circ, 0, 200, 0, 520, 0.5) +
    P('M300 500 A200 200 0 0 1 700 500 L700 760 L300 760 Z', 'url(#sg)') + stripes + P('M150 700 C300 670 700 730 850 690 L850 850 L150 850 Z', '#1F4F6B') + shade('M150 700 C300 670 700 730 850 690 L850 850 L150 850 Z', 0, 690, 0, 850, 0.7) + `</g>` +
    O(circ, SW * 1.2) + O(trunk(360, 420, 60), SW * 2.4) + O(trunk(610, 330, -40), SW * 2.2) +
    O(trunk(360, 420, 60), SW * 0.5).replace(K, '#6B4A2A') + O(fronds(420, 380), SW * 1.6) + O(fronds(570, 470), SW * 1.4);
};

(async () => {
  for (const [k, f] of Object.entries(motifs)) {
    gid = 0;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" width="1024" height="1024">${f()}</svg>`;
    await sharp(Buffer.from(svg)).png().toFile(`${out}/tat-${k}.png`);
  }
  console.log('ok', Object.keys(motifs).length);
})();
