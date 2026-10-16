'use strict';
/* v7.92 : dessins de la page « Devine le lieu » (outils/gen-devine.cjs), dans la charte du site : traits d'encre, papier,
   corail, ambre, nuit, et les teintes des six régions (outils/monde-cartes.cjs). Aucun mot n'est écrit dans les dessins
   (rien à traduire) ; tous sont décoratifs (aria-hidden) : le texte de la page dit la même chose. Leur entrée (cartes qui
   s'ouvrent en éventail, bouton choisi, trait vers la bonne région, jours qui se cochent) est décrite dans devine.css et
   jouée une fois, à l'arrivée du bloc à l'écran ; « réduire les animations » : tout est posé. */
const { REGIONS } = require('./monde-cartes.cjs');
const svg = (vb, body, cls) => '<svg class="dv-ill' + (cls ? ' ' + cls : '') + '" viewBox="' + vb + '" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">' + body + '</svg>';
const INK = '#1A1A1E', PAPER = '#FDFBF7', PAPER2 = '#F4F0E7', CORAL = '#E8452C', AMBER = '#F5A524', NIGHT = '#2B1B4D', RULE = '#DFD9CC';
const SEA = '#5FA8D3', LAND = '#95CB84', LAND2 = '#5E9A66', SKY = '#9FD4E3';
const C = id => (REGIONS[id] || {}).c || AMBER;
/* ordre des régions sur les boutons du jeu (du nord au sud) */
const ORDER = ['mount-kalaga', 'ambrosia', 'port-gellhorn', 'vice-city', 'grassrivers', 'leonida-keys'];

/* dos de carte du paquet : nuit, cercle ambre au centre (le « ? » du jeu, dessiné) */
const back = (x, y, w, h) => '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="5" fill="' + NIGHT + '" stroke="' + INK + '" stroke-width="2.5"/>'
  + '<circle cx="' + (x + w / 2) + '" cy="' + (y + h / 2) + '" r="8" fill="none" stroke="' + AMBER + '" stroke-width="3"/><circle cx="' + (x + w / 2) + '" cy="' + (y + h / 2) + '" r="2.4" fill="' + AMBER + '"/>';
/* carte du dessus : un paysage de Leonida (ciel, soleil, mer, palmier) */
const front = (x, y, w, h) => '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="5" fill="' + PAPER + '" stroke="' + INK + '" stroke-width="2.5"/>'
  + '<rect x="' + (x + 5) + '" y="' + (y + 5) + '" width="' + (w - 10) + '" height="' + (h - 10) + '" rx="2" fill="' + SKY + '"/>'
  + '<circle cx="' + (x + w - 18) + '" cy="' + (y + 16) + '" r="6" fill="' + AMBER + '" stroke="' + INK + '" stroke-width="1.6"/>'
  + '<path d="M' + (x + 5) + ' ' + (y + h - 17) + ' Q' + (x + w * 0.35) + ' ' + (y + h - 24) + ' ' + (x + w * 0.6) + ' ' + (y + h - 18) + ' T' + (x + w - 5) + ' ' + (y + h - 19) + ' V' + (y + h - 5) + ' H' + (x + 5) + 'Z" fill="' + SEA + '"/>'
  + '<path d="M' + (x + 5) + ' ' + (y + h - 9) + ' Q' + (x + w * 0.4) + ' ' + (y + h - 14) + ' ' + (x + w - 5) + ' ' + (y + h - 10) + ' V' + (y + h - 5) + ' H' + (x + 5) + 'Z" fill="#E9D9A6"/>'
  + '<path d="M' + (x + 16) + ' ' + (y + h - 8) + ' q2 -12 -1 -20" fill="none" stroke="' + INK + '" stroke-width="2" stroke-linecap="round"/>'
  + '<path d="M' + (x + 15) + ' ' + (y + h - 28) + ' q-8 -2 -11 4 M' + (x + 15) + ' ' + (y + h - 28) + ' q7 -4 11 2 M' + (x + 15) + ' ' + (y + h - 28) + ' q-2 -7 -8 -8 M' + (x + 15) + ' ' + (y + h - 28) + ' q5 -7 10 -5" fill="none" stroke="' + LAND2 + '" stroke-width="2.4" stroke-linecap="round"/>';

/* 1. cinq images par jour : le paquet de cinq cartes s'ouvre en éventail ; l'horloge marque minuit */
const JOUR = svg('0 0 200 110',
  '<g transform="translate(86 104)">'
  + [-22, -11, 0, 11].map((a, i) => '<g class="dv-ill-fan" style="--a:' + a + 'deg;--k:' + i + '" transform="rotate(' + a + ')">' + back(-27, -84, 54, 70) + '</g>').join('')
  + '<g class="dv-ill-fan" style="--a:22deg;--k:4" transform="rotate(22)">' + front(-27, -84, 54, 70) + '</g></g>'
  + '<g class="dv-ill-clock"><circle cx="163" cy="32" r="20" fill="' + PAPER + '" stroke="' + INK + '" stroke-width="2.6"/>'
  + [0, 90, 180, 270].map(a => '<path d="M163 15v4" stroke="' + INK + '" stroke-width="2.4" stroke-linecap="round" transform="rotate(' + a + ' 163 32)"/>').join('')
  + '<path class="dv-ill-hand" d="M163 32V18" stroke="' + CORAL + '" stroke-width="3" stroke-linecap="round"/><path d="M163 32v-9" stroke="' + INK + '" stroke-width="3.4" stroke-linecap="round"/><circle cx="163" cy="32" r="2.6" fill="' + INK + '"/></g>'
  + '<path d="M148 66c3-8 13-10 18-4 4-7 15-5 15 3" fill="none" stroke="' + RULE + '" stroke-width="2.4" stroke-linecap="round"/>');

/* 2. une région par image : les six boutons du jeu, chacun avec la teinte de sa région ; le bon est choisi */
const OPTIONS = (() => {
  let b = '';
  ORDER.forEach((id, i) => {
    const x = 12 + (i % 3) * 62, y = 18 + Math.floor(i / 3) * 40, on = id === 'vice-city';
    b += '<g class="dv-ill-opt' + (on ? ' dv-ill-on' : '') + '" style="--k:' + i + '">'
      + '<rect x="' + x + '" y="' + y + '" width="54" height="30" rx="6" fill="' + (on ? AMBER : PAPER) + '" stroke="' + INK + '" stroke-width="2.4"/>'
      + '<circle cx="' + (x + 12) + '" cy="' + (y + 15) + '" r="5.5" fill="' + C(id) + '" stroke="' + INK + '" stroke-width="2"/>'
      + '<rect x="' + (x + 22) + '" y="' + (y + 12) + '" width="' + (on ? 16 : 24) + '" height="6" rx="3" fill="' + (on ? INK : RULE) + '"/>'
      + (on ? '<path class="dv-ill-check" d="M' + (x + 41) + ' ' + (y + 15) + 'l3.5 3.5 6-7" fill="none" stroke="' + INK + '" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" pathLength="1"/>' : '')
      + '</g>';
  });
  /* le pointeur qui vient de choisir */
  b += '<path class="dv-ill-cursor" d="M50 82l0 20 5-5 4 9 4-2-4-8 7 0z" fill="' + PAPER + '" stroke="' + INK + '" stroke-width="2.2" stroke-linejoin="round"/>';
  return svg('0 0 200 110', b);
})();

/* 3. la réponse : la carte, la réponse donnée (corail) et la bonne région (ambre), reliées d'un trait */
const REPONSE = svg('0 0 200 110',
  '<rect x="8" y="6" width="184" height="98" rx="10" fill="' + SEA + '" stroke="' + INK + '" stroke-width="2.6"/>'
  + '<path d="M52 104c-6-14 4-22 2-34-2-13-14-18-10-32 4-12 22-16 34-12 12 4 16-6 30-6 16 0 22 12 34 14 14 2 22 14 20 28-2 12-14 14-14 26 0 8 4 12 6 16z" fill="' + LAND + '" stroke="' + LAND2 + '" stroke-width="3"/>'
  + '<path class="dv-ill-line" d="M74 40L136 74" fill="none" stroke="' + INK + '" stroke-width="3.2" stroke-linecap="round" pathLength="1"/>'
  + '<g class="dv-ill-ko"><circle cx="74" cy="40" r="8" fill="' + PAPER + '" stroke="' + CORAL + '" stroke-width="3"/><path d="M70.5 36.5l7 7M77.5 36.5l-7 7" stroke="' + CORAL + '" stroke-width="2.4" stroke-linecap="round"/></g>'
  + '<circle class="dv-ill-ring" cx="136" cy="74" r="15" fill="none" stroke="' + INK + '" stroke-width="2.4"/>'
  + '<g class="dv-ill-ok"><circle cx="136" cy="74" r="9" fill="' + AMBER + '" stroke="' + INK + '" stroke-width="2.6"/><path d="M131.5 74l3 3 5.5-6" fill="none" stroke="' + INK + '" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></g>'
  + '<g class="dv-ill-tag"><rect x="128" y="20" width="52" height="20" rx="10" fill="' + AMBER + '" stroke="' + INK + '" stroke-width="2.2"/><rect x="138" y="27" width="32" height="6" rx="3" fill="' + INK + '"/></g>');

/* 4. la série : les jours cochés l'un après l'autre, aujourd'hui en ambre, demain à jouer ; la flamme de la série */
const SERIE = (() => {
  let b = '<path class="dv-ill-flame" d="M100 8c8 10 16 14 16 26a16 16 0 0 1-32 0c0-7 4-11 7-15 0 6 3 9 6 9-2-7 0-14 3-20z" fill="' + CORAL + '" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>'
    + '<path d="M100 26c4 5 7 8 7 13a7 7 0 0 1-14 0c0-4 3-7 7-13z" fill="' + AMBER + '"/>';
  for (let i = 0; i < 7; i++) {
    const x = 13 + i * 25.5, y = 62, done = i < 5, now = i === 5;
    b += '<g class="dv-ill-day' + (now ? ' dv-ill-now' : '') + '" style="--k:' + i + '">'
      + '<rect x="' + x + '" y="' + y + '" width="21" height="21" rx="5" fill="' + (done ? INK : now ? AMBER : 'none') + '" stroke="' + INK + '" stroke-width="2.4"' + (!done && !now ? ' stroke-dasharray="4 3"' : '') + '/>'
      + (done ? '<path d="M' + (x + 5.5) + ' ' + (y + 11) + 'l3.5 3.5 6.5-7" fill="none" stroke="' + AMBER + '" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>' : '')
      + (now ? '<circle cx="' + (x + 10.5) + '" cy="' + (y + 10.5) + '" r="3.4" fill="' + INK + '"/>' : '')
      + '</g>';
  }
  b += '<path d="M13 96h178" stroke="' + RULE + '" stroke-width="2.4" stroke-linecap="round" stroke-dasharray="2 6"/>';
  return svg('0 0 200 110', b);
})();

const RULES = [JOUR, OPTIONS, REPONSE, SERIE];
module.exports = { RULES, ORDER, COLORS: { INK, PAPER, PAPER2, CORAL, AMBER, NIGHT, RULE, SEA, LAND, LAND2, SKY } };
