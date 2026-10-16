'use strict';
/* v7.92 : dessins de la page Mode compagnon (outils/gen-compagnon.cjs), dans la charte du site : traits d'encre, papier,
   corail, ambre, nuit. Aucun mot n'est écrit dans les dessins (rien à traduire) ; tous sont décoratifs (aria-hidden), le
   texte de la page dit la même chose. Les animations sont décrites dans compagnon.css et coupées en « réduire les
   animations ». */
const svg = (vb, body, cls) => '<svg class="' + (cls || '') + '" viewBox="' + vb + '" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">' + body + '</svg>';
const INK = '#1A1A1E', PAPER = '#FDFBF7', PAPER2 = '#F4F0E7', CORAL = '#E8452C', AMBER = '#F5A524', NIGHT = '#2B1B4D', RULE = '#DFD9CC';

/* ---------- écrans du téléphone (180 × 380) ---------- */
const top = (title) => '<rect x="0" y="0" width="180" height="380" fill="' + PAPER + '"/><rect x="12" y="16" width="156" height="26" rx="13" fill="' + PAPER2 + '" stroke="' + INK + '" stroke-width="2"/>'
  + '<circle cx="28" cy="29" r="5" fill="none" stroke="' + INK + '" stroke-width="2"/><path d="M32 33l4 4" stroke="' + INK + '" stroke-width="2" stroke-linecap="round"/>' + (title ? '<rect x="44" y="25" width="' + title + '" height="8" rx="4" fill="' + RULE + '"/>' : '');
const SCREENS = {
  /* la carte : terres, eau, routes, repères qui tombent, position qui pulse */
  carte: svg('0 0 180 380', '<rect width="180" height="380" fill="#9fd4e3"/>'
    + '<path d="M-5 70 C40 60 70 90 110 80 C150 70 170 90 190 84 V250 C150 262 120 240 90 256 C60 272 30 250 -5 262 Z" fill="#cfe5b5" stroke="' + INK + '" stroke-width="2"/>'
    + '<path d="M-5 290 C30 280 50 300 80 296 C110 292 120 310 150 306 C170 304 180 312 190 310 V390 H-5 Z" fill="#e3d6a8" stroke="' + INK + '" stroke-width="2"/>'
    + '<path d="M20 230 C50 190 70 170 100 150 S150 110 170 96" fill="none" stroke="' + PAPER + '" stroke-width="7" stroke-linecap="round"/><path d="M20 230 C50 190 70 170 100 150 S150 110 170 96" fill="none" stroke="' + INK + '" stroke-width="1.5" stroke-dasharray="4 5"/>'
    + '<path d="M40 120 C70 140 90 200 130 236" fill="none" stroke="' + PAPER + '" stroke-width="5" stroke-linecap="round"/>'
    + '<g class="cp-pin" style="--d:0"><path d="M58 112c-9 0-15 7-15 15 0 11 15 24 15 24s15-13 15-24c0-8-6-15-15-15z" fill="' + CORAL + '" stroke="' + INK + '" stroke-width="2"/><circle cx="58" cy="127" r="5" fill="' + PAPER + '"/></g>'
    + '<g class="cp-pin" style="--d:1"><path d="M128 158c-9 0-15 7-15 15 0 11 15 24 15 24s15-13 15-24c0-8-6-15-15-15z" fill="' + AMBER + '" stroke="' + INK + '" stroke-width="2"/><circle cx="128" cy="173" r="5" fill="' + PAPER + '"/></g>'
    + '<g class="cp-pin" style="--d:2"><path d="M96 196c-9 0-15 7-15 15 0 11 15 24 15 24s15-13 15-24c0-8-6-15-15-15z" fill="' + NIGHT + '" stroke="' + INK + '" stroke-width="2"/><circle cx="96" cy="211" r="5" fill="' + AMBER + '"/></g>'
    + '<circle class="cp-me-halo" cx="70" cy="188" r="14" fill="#3D8BFF" opacity=".25"/><circle cx="70" cy="188" r="7" fill="#3D8BFF" stroke="' + PAPER + '" stroke-width="3"/>'
    + '<rect x="12" y="16" width="156" height="26" rx="13" fill="' + PAPER + '" stroke="' + INK + '" stroke-width="2"/><circle cx="28" cy="29" r="5" fill="none" stroke="' + INK + '" stroke-width="2"/><path d="M32 33l4 4" stroke="' + INK + '" stroke-width="2" stroke-linecap="round"/><rect x="44" y="25" width="70" height="8" rx="4" fill="' + RULE + '"/>'
    + '<rect x="10" y="300" width="160" height="70" rx="14" fill="' + PAPER + '" stroke="' + INK + '" stroke-width="2"/><rect x="24" y="314" width="90" height="10" rx="5" fill="' + INK + '"/><rect x="24" y="332" width="120" height="7" rx="3.5" fill="' + RULE + '"/><rect x="24" y="346" width="60" height="14" rx="7" fill="' + AMBER + '" stroke="' + INK + '" stroke-width="1.5"/>', 'cp-scr-svg'),
  /* les carnets : une barre de progression, des cases qui se cochent */
  carnets: svg('0 0 180 380', top(80)
    + '<rect x="12" y="56" width="156" height="54" rx="12" fill="' + NIGHT + '" stroke="' + INK + '" stroke-width="2"/><rect x="24" y="68" width="70" height="8" rx="4" fill="' + AMBER + '"/><rect x="24" y="88" width="132" height="10" rx="5" fill="rgba(255,255,255,.18)"/><rect class="cp-fill" x="24" y="88" width="88" height="10" rx="5" fill="' + AMBER + '"/>'
    + [0, 1, 2, 3, 4, 5].map(i => { const y = 124 + i * 40, on = i < 4;
      return '<g class="cp-row" style="--d:' + i + '"><rect x="12" y="' + y + '" width="156" height="32" rx="9" fill="#fff" stroke="' + INK + '" stroke-width="1.6"/><rect x="22" y="' + (y + 8) + '" width="16" height="16" rx="4" fill="' + (on ? AMBER : PAPER) + '" stroke="' + INK + '" stroke-width="1.8"/>'
        + (on ? '<path class="cp-tick" d="M25.5 ' + (y + 16) + 'l3.5 3.5 6-7" fill="none" stroke="' + INK + '" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>' : '')
        + '<rect x="46" y="' + (y + 10) + '" width="' + (70 + (i * 23) % 40) + '" height="7" rx="3.5" fill="' + (on ? RULE : INK) + '" opacity="' + (on ? 1 : .75) + '"/><rect x="46" y="' + (y + 20) + '" width="44" height="5" rx="2.5" fill="' + RULE + '"/></g>'; }).join(''), 'cp-scr-svg'),
  /* le calculateur : une jauge qui se remplit, des barres, le bouton principal */
  calculateur: svg('0 0 180 380', top(90)
    + '<rect x="12" y="56" width="156" height="150" rx="14" fill="#fff" stroke="' + INK + '" stroke-width="2"/>'
    + '<circle cx="90" cy="128" r="48" fill="none" stroke="' + PAPER2 + '" stroke-width="14"/><circle class="cp-gauge" cx="90" cy="128" r="48" fill="none" stroke="' + CORAL + '" stroke-width="14" stroke-linecap="round" stroke-dasharray="301.6" stroke-dashoffset="81" transform="rotate(-90 90 128)"/>'
    + '<rect x="66" y="118" width="48" height="12" rx="6" fill="' + INK + '"/><rect x="74" y="136" width="32" height="7" rx="3.5" fill="' + RULE + '"/>'
    + [0, 1, 2].map(i => '<g class="cp-bar" style="--d:' + i + '"><rect x="12" y="' + (222 + i * 34) + '" width="156" height="26" rx="8" fill="#fff" stroke="' + INK + '" stroke-width="1.6"/><rect x="22" y="' + (231 + i * 34) + '" width="' + [96, 64, 120][i] + '" height="8" rx="4" fill="' + [AMBER, NIGHT, CORAL][i] + '"/></g>').join('')
    + '<rect x="12" y="330" width="156" height="34" rx="17" fill="' + AMBER + '" stroke="' + INK + '" stroke-width="2"/><rect x="58" y="343" width="64" height="8" rx="4" fill="' + INK + '"/>', 'cp-scr-svg'),
  /* Léo : la conversation, l'assistant qui écrit */
  leo: svg('0 0 180 380', '<rect width="180" height="380" fill="' + NIGHT + '"/><rect x="0" y="0" width="180" height="56" fill="rgba(255,255,255,.06)"/>'
    + '<circle cx="30" cy="28" r="14" fill="' + AMBER + '" stroke="' + INK + '" stroke-width="2"/><path d="M25 21v14h10" fill="none" stroke="' + INK + '" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><rect x="52" y="20" width="58" height="8" rx="4" fill="' + PAPER + '"/><rect x="52" y="33" width="38" height="6" rx="3" fill="rgba(255,255,255,.4)"/>'
    + '<g class="cp-bub" style="--d:0"><rect x="70" y="74" width="98" height="34" rx="14" fill="' + AMBER + '" stroke="' + INK + '" stroke-width="1.6"/><rect x="82" y="87" width="72" height="8" rx="4" fill="' + INK + '"/></g>'
    + '<g class="cp-bub" style="--d:1"><rect x="12" y="122" width="132" height="62" rx="14" fill="' + PAPER + '" stroke="' + INK + '" stroke-width="1.6"/><rect x="24" y="135" width="104" height="7" rx="3.5" fill="' + INK + '"/><rect x="24" y="149" width="86" height="7" rx="3.5" fill="' + RULE + '"/><rect x="24" y="163" width="56" height="10" rx="5" fill="' + CORAL + '"/></g>'
    + '<g class="cp-bub" style="--d:2"><rect x="84" y="198" width="84" height="34" rx="14" fill="' + AMBER + '" stroke="' + INK + '" stroke-width="1.6"/><rect x="96" y="211" width="56" height="8" rx="4" fill="' + INK + '"/></g>'
    + '<g class="cp-bub cp-typing" style="--d:3"><rect x="12" y="246" width="64" height="30" rx="14" fill="' + PAPER + '" stroke="' + INK + '" stroke-width="1.6"/><circle class="cp-dot" cx="30" cy="261" r="4" fill="' + INK + '"/><circle class="cp-dot" cx="44" cy="261" r="4" fill="' + INK + '"/><circle class="cp-dot" cx="58" cy="261" r="4" fill="' + INK + '"/></g>'
    + '<rect x="10" y="326" width="160" height="40" rx="20" fill="' + PAPER + '" stroke="' + INK + '" stroke-width="2"/><rect x="26" y="342" width="80" height="8" rx="4" fill="' + RULE + '"/><circle cx="148" cy="346" r="13" fill="' + CORAL + '" stroke="' + INK + '" stroke-width="2"/><path d="M143 346h10M149 341l4 5-4 5" fill="none" stroke="' + PAPER + '" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>', 'cp-scr-svg')
};

/* ---------- installation, appareil par appareil (220 × 140) ---------- */
const phoneFrame = (inner) => '<rect x="62" y="6" width="96" height="128" rx="16" fill="' + PAPER + '" stroke="' + INK + '" stroke-width="3"/><rect x="96" y="12" width="28" height="5" rx="2.5" fill="' + INK + '"/>' + inner;
const INSTALL = {
  ios: svg('0 0 220 140', phoneFrame('<rect x="70" y="24" width="80" height="60" rx="6" fill="' + PAPER2 + '"/><rect x="78" y="34" width="50" height="7" rx="3.5" fill="' + RULE + '"/><rect x="78" y="48" width="64" height="7" rx="3.5" fill="' + RULE + '"/>'
    + '<rect x="70" y="100" width="80" height="24" rx="6" fill="#fff" stroke="' + INK + '" stroke-width="1.5"/><g class="cp-hint"><circle cx="110" cy="112" r="14" fill="' + AMBER + '" stroke="' + INK + '" stroke-width="2"/><path d="M110 118v-12M105.5 110.5 110 106l4.5 4.5M104 112v6h12v-6" fill="none" stroke="' + INK + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></g>')
    + '<g class="cp-hint-2"><rect x="164" y="54" width="48" height="48" rx="12" fill="' + NIGHT + '" stroke="' + INK + '" stroke-width="2.5"/><path d="M188 66v24M176 78h24" stroke="' + AMBER + '" stroke-width="4" stroke-linecap="round"/></g>', 'cp-inst-svg'),
  android: svg('0 0 220 140', phoneFrame('<rect x="70" y="24" width="80" height="16" rx="5" fill="#fff" stroke="' + INK + '" stroke-width="1.5"/><rect x="76" y="30" width="44" height="5" rx="2.5" fill="' + RULE + '"/>'
    + '<g class="cp-hint"><circle cx="142" cy="32" r="10" fill="' + AMBER + '" stroke="' + INK + '" stroke-width="2"/><circle cx="142" cy="27.5" r="1.6" fill="' + INK + '"/><circle cx="142" cy="32" r="1.6" fill="' + INK + '"/><circle cx="142" cy="36.5" r="1.6" fill="' + INK + '"/></g>'
    + '<g class="cp-hint-2"><rect x="92" y="44" width="62" height="56" rx="6" fill="#fff" stroke="' + INK + '" stroke-width="2"/><rect x="100" y="54" width="44" height="6" rx="3" fill="' + RULE + '"/><rect x="98" y="66" width="52" height="14" rx="4" fill="' + AMBER + '" stroke="' + INK + '" stroke-width="1.5"/><rect x="104" y="71" width="36" height="5" rx="2.5" fill="' + INK + '"/><rect x="100" y="86" width="40" height="6" rx="3" fill="' + RULE + '"/></g>'), 'cp-inst-svg'),
  pc: svg('0 0 220 140', '<rect x="14" y="10" width="192" height="112" rx="10" fill="' + PAPER + '" stroke="' + INK + '" stroke-width="3"/><rect x="14" y="10" width="192" height="26" rx="10" fill="' + PAPER2 + '" stroke="' + INK + '" stroke-width="3"/>'
    + '<circle cx="30" cy="23" r="3.5" fill="' + CORAL + '"/><circle cx="42" cy="23" r="3.5" fill="' + AMBER + '"/><circle cx="54" cy="23" r="3.5" fill="#7BC47F"/><rect x="66" y="16" width="118" height="14" rx="7" fill="#fff" stroke="' + INK + '" stroke-width="1.5"/><rect x="74" y="21" width="60" height="4" rx="2" fill="' + RULE + '"/>'
    + '<g class="cp-hint"><circle cx="172" cy="23" r="9" fill="' + AMBER + '" stroke="' + INK + '" stroke-width="2"/><path d="M172 18v8M168.5 22.5 172 26l3.5-3.5M167 28h10" fill="none" stroke="' + INK + '" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></g>'
    + '<rect x="30" y="52" width="80" height="10" rx="5" fill="' + INK + '"/><rect x="30" y="70" width="150" height="7" rx="3.5" fill="' + RULE + '"/><rect x="30" y="84" width="120" height="7" rx="3.5" fill="' + RULE + '"/><rect x="30" y="100" width="54" height="12" rx="6" fill="' + AMBER + '" stroke="' + INK + '" stroke-width="1.5"/>'
    + '<rect x="96" y="122" width="28" height="10" fill="' + INK + '"/><rect x="78" y="130" width="64" height="6" rx="3" fill="' + INK + '"/>', 'cp-inst-svg')
};

/* ---------- transfert : cet appareil → lien ou QR code → l'autre appareil, sans passer par le site (480 × 150) ---------- */
const qr = (x, y, s) => { const c = s / 7; let r = ''; const on = [[0, 0], [1, 0], [2, 0], [0, 1], [2, 1], [0, 2], [1, 2], [2, 2], [4, 0], [6, 0], [4, 2], [5, 1], [6, 2], [0, 4], [2, 4], [1, 5], [0, 6], [1, 6], [2, 6], [4, 4], [5, 5], [6, 4], [4, 6], [6, 6], [3, 3], [5, 3], [3, 5]];
  for (const [i, j] of on) r += '<rect x="' + (x + i * c) + '" y="' + (y + j * c) + '" width="' + c + '" height="' + c + '" fill="' + INK + '"/>'; return r; };
const smallPhone = (x, fill) => '<rect x="' + x + '" y="30" width="62" height="104" rx="12" fill="' + fill + '" stroke="' + INK + '" stroke-width="3"/><rect x="' + (x + 22) + '" y="36" width="18" height="4" rx="2" fill="' + INK + '"/>'
  + '<rect x="' + (x + 10) + '" y="52" width="42" height="8" rx="4" fill="' + AMBER + '"/><rect x="' + (x + 10) + '" y="66" width="34" height="6" rx="3" fill="' + RULE + '"/><rect x="' + (x + 10) + '" y="78" width="40" height="6" rx="3" fill="' + RULE + '"/>'
  + '<rect x="' + (x + 10) + '" y="92" width="10" height="10" rx="2.5" fill="' + AMBER + '" stroke="' + INK + '" stroke-width="1.5"/><rect x="' + (x + 24) + '" y="94" width="26" height="6" rx="3" fill="' + RULE + '"/><rect x="' + (x + 10) + '" y="108" width="10" height="10" rx="2.5" fill="' + AMBER + '" stroke="' + INK + '" stroke-width="1.5"/><rect x="' + (x + 24) + '" y="110" width="22" height="6" rx="3" fill="' + RULE + '"/>';
const TRANSFERT = svg('0 0 480 150', smallPhone(40, PAPER) + smallPhone(378, PAPER)
  + '<path class="cp-flow" d="M112 82 C150 82 170 82 196 82" fill="none" stroke="' + INK + '" stroke-width="3" stroke-dasharray="7 7" stroke-linecap="round"/><path d="M190 75l9 7-9 7" fill="none" stroke="' + INK + '" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>'
  + '<rect x="204" y="42" width="72" height="72" rx="10" fill="#fff" stroke="' + INK + '" stroke-width="3"/>' + qr(214, 52, 52)
  + '<path class="cp-flow" d="M284 82 C310 82 330 82 368 82" fill="none" stroke="' + INK + '" stroke-width="3" stroke-dasharray="7 7" stroke-linecap="round"/><path d="M362 75l9 7-9 7" fill="none" stroke="' + INK + '" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>'
  + '<g transform="translate(222 0)"><path d="M10 26a12 12 0 0 1 23-4 9 9 0 1 1 3 17H12a8 8 0 0 1-2-13z" fill="' + PAPER2 + '" stroke="' + INK + '" stroke-width="2.4"/><path d="M6 6l34 34" stroke="' + CORAL + '" stroke-width="4" stroke-linecap="round"/></g>', 'cp-tr-svg');

/* ---------- pictogrammes de « ce qui est préparé » (24 × 24) ---------- */
module.exports = { SCREENS, INSTALL, TRANSFERT };
