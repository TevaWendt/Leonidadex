'use strict';
/* v8.04 (lot L) : dessins des règles des jeux du site (outils/gen-jeux.cjs : frise-des-annonces.html,
   devine-la-station.html, jeux.html), dans la charte du site et le style de ceux de Devine le lieu
   (outils/devine-illus.cjs) : traits d’encre, papier, corail, ambre, nuit. Aucun mot ni chiffre dans les dessins (rien à
   traduire) ; tous sont décoratifs (aria-hidden) : le texte de la règle dit la même chose. Immobiles. */
const svg = (body) => '<svg class="lkj-ill" viewBox="0 0 200 110" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">' + body + '</svg>';
const INK = '#1A1A1E', PAPER = '#FDFBF7', PAPER2 = '#F4F0E7', CORAL = '#E8452C', AMBER = '#F5A524', NIGHT = '#2B1B4D', NIGHT2 = '#5A2358', RULE = '#DFD9CC';
const r = (x, y, w, h, fill, o = {}) => '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + (o.rx === undefined ? 5 : o.rx) + '" fill="' + fill + '" stroke="' + (o.stroke || INK) + '" stroke-width="' + (o.sw || 2.5) + '"' + (o.dash ? ' stroke-dasharray="' + o.dash + '"' : '') + '/>';
const c = (x, y, rad, fill, sw = 2.5) => '<circle cx="' + x + '" cy="' + y + '" r="' + rad + '" fill="' + fill + '" stroke="' + INK + '" stroke-width="' + sw + '"/>';
const p = (d, o = {}) => '<path d="' + d + '" fill="' + (o.fill || 'none') + '" stroke="' + (o.stroke || INK) + '" stroke-width="' + (o.sw || 2.5) + '" stroke-linecap="round" stroke-linejoin="round"/>';
/* horloge (minuit) */
const clock = (x, y) => c(x, y, 17, PAPER) + p('M' + x + ' ' + (y - 10) + 'V' + y + 'l7 5') + c(x, y, 2.2, INK, 0);
/* petite carte d’annonce : bandeau, deux lignes de texte */
const note = (x, y, w, h, tone) => r(x, y, w, h, PAPER) + '<rect x="' + (x + 4) + '" y="' + (y + 4) + '" width="' + (w - 8) + '" height="' + Math.round(h * 0.38) + '" rx="2" fill="' + (tone || AMBER) + '"/>'
  + p('M' + (x + 6) + ' ' + (y + h * 0.62) + 'h' + (w - 14), { sw: 2 }) + p('M' + (x + 6) + ' ' + (y + h * 0.8) + 'h' + (w - 22), { sw: 2, stroke: '#5C5A63' });
/* tampon « juste » */
const check = (x, y, rad = 13) => c(x, y, rad, AMBER) + p('M' + (x - 6) + ' ' + y + 'l4 5 8-10', { sw: 3 });
const cross = (x, y, rad = 11) => c(x, y, rad, PAPER) + p('M' + (x - 4.5) + ' ' + (y - 4.5) + 'l9 9M' + (x + 4.5) + ' ' + (y - 4.5) + 'l-9 9', { sw: 3, stroke: CORAL });
/* pastille de statut */
const pill = (x, y, w, tone) => r(x, y, w, 14, PAPER, { rx: 7, sw: 2 }) + '<circle cx="' + (x + 8) + '" cy="' + (y + 7) + '" r="3.4" fill="' + tone + '"/>' + p('M' + (x + 15) + ' ' + (y + 7) + 'h' + (w - 21), { sw: 2 });
/* sept jours, cinq joués, puis la boucle de la partie libre */
const week = (x, y) => [0, 1, 2, 3, 4, 5, 6].map(i => c(x + i * 15, y, 5.5, i > 0 && i < 6 ? INK : PAPER, 2)).join('') + c(x + 6 * 15, y, 5.5, AMBER, 2);
const loop = (x, y) => p('M' + (x - 14) + ' ' + y + 'a14 14 0 1 1 6 11.5') + p('M' + (x - 16) + ' ' + (y + 6) + 'l2 6.5 6.5-2.5', { sw: 2.5 });
/* cadran de radio : écran nuit, graduations, aiguille, six touches aux teintes des stations */
const dial = (x, y, w, tones, k) => {
  const h = 34, out = [r(x, y, w, h, NIGHT)];
  for (let i = 0; i <= 12; i++) out.push(p('M' + (x + 8 + i * (w - 16) / 12) + ' ' + (y + 8) + 'v' + (i % 2 ? 6 : 10), { stroke: '#F7B645', sw: 1.6 }));
  const nx = x + 8 + (k + 0.5) * (w - 16) / tones.length;
  out.push(p('M' + nx + ' ' + (y + 5) + 'V' + (y + h - 5), { stroke: CORAL, sw: 3 }));
  tones.forEach((t, i) => { const bw = (w - 8) / tones.length; out.push(r(x + 4 + i * bw + 2, y + h + 8, bw - 4, 14, i === k ? t : PAPER, { rx: 4, sw: 2 }), '<circle cx="' + (x + 4 + i * bw + bw / 2) + '" cy="' + (y + h + 15) + '" r="2.6" fill="' + (i === k ? INK : t) + '"/>'); });
  return out.join('');
};
/* écran d’indice de la radio */
const lcd = (x, y, w, h) => r(x, y, w, h, NIGHT) + p('M' + (x + 7) + ' ' + (y + h * 0.36) + 'h' + (w * 0.42), { stroke: '#F7B645', sw: 2.4 }) + p('M' + (x + 7) + ' ' + (y + h * 0.66) + 'h' + (w - 16), { stroke: PAPER, sw: 3.4 });
const TONES = ['#E8452C', '#F5A524', '#8C6239', '#2E9C5A', '#5C5A63', '#7A3FA0'];

const FRISE = [
  /* cinq annonces par jour : l’horloge marque minuit, le paquet du jour s’ouvre */
  svg(clock(34, 56) + [0, 1, 2, 3, 4].map(i => '<g transform="rotate(' + (-12 + i * 6) + ' 128 104)">' + note(104, 26, 48, 60, i === 4 ? AMBER : RULE) + '</g>').join('')),
  /* une place pour chaque annonce : la frise, trois annonces posées, la place choisie en pointillés */
  svg(p('M12 74H188', { stroke: AMBER, sw: 4 }) + [26, 100, 162].map(x => c(x, 74, 5, INK, 0) + note(x - 18, 82, 36, 22, RULE)).join('')
    + r(119, 64, 26, 20, PAPER, { dash: '4 3', sw: 2 }) + note(108, 6, 48, 40, AMBER) + p('M132 50v8M127 53l5 5 5-5', { sw: 2.5 })),
  /* la réponse : l’annonce rangée, son statut et sa source */
  svg(note(30, 16, 96, 72, AMBER) + pill(40, 64, 60, AMBER) + check(140, 34) + p('M134 70h44M134 82h30', { sw: 2.2, stroke: '#5C5A63' })),
  /* la série, puis la partie libre */
  svg(week(30, 40) + loop(100, 80))
];
/* tones : les teintes des stations (outils/radios/radios.json), dans l’ordre des boutons du jeu */
const STATION = (tones = TONES) => [
  svg(clock(34, 56) + [0, 1, 2, 3, 4].map(i => '<g transform="rotate(' + (-12 + i * 6) + ' 128 104)">' + lcd(102, 30, 52, 40) + '</g>').join('')),
  svg(dial(14, 18, 172, tones, 2)),
  svg(dial(14, 18, 172, tones, Math.min(4, tones.length - 1)) + check(176, 18, 11)),
  svg(week(30, 40) + loop(100, 80))
];
const POINTS = [
  /* une bonne réponse : une pièce */
  svg(c(70, 55, 30, AMBER) + c(70, 55, 21, '#F7B645', 2) + p('M70 42l4 8.5 9 1-6.8 6 2 9-8.2-4.6-8.2 4.6 2-9-6.8-6 9-1z', { fill: PAPER, sw: 2 }) + check(132, 55, 18)),
  /* un sans-faute : cinq tampons justes */
  svg([0, 1, 2, 3, 4].map(i => check(36 + i * 32, 55, 12)).join('')),
  /* le défi du jour : une cible et le jour coché */
  svg(c(72, 56, 34, PAPER) + c(72, 56, 22, '#F7B645', 2) + c(72, 56, 10, CORAL, 2) + r(124, 30, 52, 52, PAPER) + '<rect x="128" y="34" width="44" height="12" rx="2" fill="' + CORAL + '"/>' + check(150, 64, 11)),
  /* la partie libre : la boucle, sans compteur */
  svg(loop(76, 60) + r(116, 30, 60, 46, PAPER, { dash: '5 4', sw: 2.2 }) + p('M128 53h36', { sw: 2.2, stroke: '#5C5A63' }) + cross(176, 30))
];
module.exports = { FRISE, STATION, POINTS };
