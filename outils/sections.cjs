'use strict';
/* v7.40 (lot 3) : système de sections éditoriales des hubs (Véhicules, Armurerie, Achats ; réutilisable partout).
   Une section = un numéro et un kicker en mono, un titre Archivo 800, une ligne d'accent, une icône SVG dessinée dans
   la charte (trait encre, une couleur d'accent), un fond parmi trois (papier / papier-2 / nuit) et une composition
   propre à son contenu : grands chiffres avec micro-barres, mur de marques, cartes d'équipement avec suivi, bandeau
   de munitions, cartes numérotées avec capture officielle, cartes-lieux avec vignette de la carte.
   Le balisage sort d'ici, les styles sont dans style.css (bloc « v7.40 : sections éditoriales »), le comportement
   (filtre du mur de marques, sous-navigation collante) dans common.js. Aucun texte n'est écrit ici : les générateurs
   passent leurs données. */
const fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname, '..');
const carte = require('./carte-vignette.cjs');
const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = n => String(n).padStart(2, '0');

/* ---------- icônes (24 × 24, trait courant ; la classe « ac » reçoit la couleur d'accent) ---------- */
const ICONS = {
  chiffres: '<path d="M4 20h16"/><rect x="5" y="11" width="3" height="7"/><rect x="10.5" y="6" width="3" height="12"/><rect class="ac" x="16" y="9" width="3" height="9"/>',
  marques: '<path d="M3 12V5a2 2 0 0 1 2-2h7l9 9-9 9-9-9z"/><circle class="ac" cx="7.5" cy="7.5" r="1.6"/>',
  conduite: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/><path d="M3.2 11h5.8M15 11h5.8M12 15v5.8"/><circle class="ac" cx="12" cy="12" r="1.4"/>',
  nommes: '<circle cx="12" cy="9" r="5.5"/><path d="M8.5 13.5 7 21l5-2.5 5 2.5-1.5-7.5"/><path class="ac" d="M12 6.4l.9 1.9 2.1.3-1.5 1.5.4 2.1-1.9-1-1.9 1 .4-2.1-1.5-1.5 2.1-.3z"/>',
  carte: '<path d="M12 21s-6.5-5.7-6.5-11a6.5 6.5 0 0 1 13 0c0 5.3-6.5 11-6.5 11z"/><circle class="ac" cx="12" cy="10" r="2.4"/>',
  inventaire: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect class="ac" x="13.5" y="13.5" width="7" height="7" rx="1.5"/>',
  equipements: '<path d="M7 9V7a5 5 0 0 1 10 0v2"/><rect x="4.5" y="9" width="15" height="12" rx="3"/><path d="M9 15h6"/><path class="ac" d="M9.5 12.5h5v2h-5z"/>',
  munitions: '<path d="M6 21v-8.5a2 2 0 0 1 4 0V21z"/><path d="M14 21v-8.5a2 2 0 0 1 4 0V21z"/><path d="M8 10.5V6M16 10.5V6"/><path class="ac" d="M6 17h4v4H6zM14 17h4v4h-4z"/>',
  combat: '<circle cx="12" cy="12" r="7"/><path d="M12 2.5v4M12 17.5v4M2.5 12h4M17.5 12h4"/><circle class="ac" cx="12" cy="12" r="2"/>',
  lire: '<path d="M3 5.5A8 8 0 0 1 12 7a8 8 0 0 1 9-1.5v13A8 8 0 0 0 12 20a8 8 0 0 0-9-1.5z"/><path d="M12 7v13"/><circle class="ac" cx="7" cy="10.5" r="1.2"/>',
  faq: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-5 4v-4H6.5A2.5 2.5 0 0 1 4 13.5z"/><path d="M10 8.2a2 2 0 1 1 3 1.7c-.8.5-1 .9-1 1.6"/><circle class="ac" cx="12" cy="13.6" r="1"/>',
  achats: '<path d="M5 8h14l-1 12H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/><circle class="ac" cx="9" cy="11.5" r="1.1"/><circle class="ac" cx="15" cy="11.5" r="1.1"/>',
  argent: '<rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><path class="ac" d="M5 9h2v2H5zM17 13h2v2h-2z"/>',
  statuts: '<path d="M12 3l7 3v5.5c0 4.5-3 7.8-7 9.5-4-1.7-7-5-7-9.5V6z"/><path d="M9 12l2 2 4-4"/><circle class="ac" cx="12" cy="6.8" r="1"/>',
  calcul: '<rect x="5" y="3" width="14" height="18" rx="2"/><rect x="8" y="6" width="8" height="3" rx=".6"/><path d="M8.5 13h1M12 13h1M15.5 13h1M8.5 17h1M12 17h1"/><rect class="ac" x="15" y="16" width="2" height="2" rx=".5"/>',
  horloge: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/><circle class="ac" cx="12" cy="12" r="1.2"/>',
  ouvert: '<path d="M4 20V8l8-5 8 5v12"/><path d="M4 20h16"/><path d="M9 20v-6h6v6"/><circle class="ac" cx="12" cy="9.5" r="1.3"/>',
  boussole: '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/><circle class="ac" cx="12" cy="12" r="1.2"/>',
  /* équipements et gadgets de l'Armurerie */
  'sac-a-dos': '<path d="M7 9V7a5 5 0 0 1 10 0v2"/><rect x="4.5" y="9" width="15" height="12" rx="3"/><path d="M9 15h6"/><path class="ac" d="M9.5 12.5h5v2h-5z"/>',
  'gilet-pare-balles': '<path d="M7 4l2.5 1.5L12 8l2.5-2.5L17 4l3 3-2 3v10H6V10L4 7z"/><path class="ac" d="M10 12h4v6h-4z"/>',
  'kit-de-soin': '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5h6v2"/><path class="ac" d="M11 11h2v2h2v2h-2v2h-2v-2H9v-2h2z"/>',
  antidouleurs: '<circle cx="9" cy="12" r="4.5"/><path d="M9 7.5v9"/><circle class="ac" cx="16.5" cy="14.5" r="2.6"/>',
  jumelles: '<circle cx="7" cy="15" r="3.5"/><circle cx="17" cy="15" r="3.5"/><path d="M8.5 6h7l1.5 6M7 6l-1.5 6"/><path d="M10.5 15h3"/><circle class="ac" cx="7" cy="15" r="1.2"/><circle class="ac" cx="17" cy="15" r="1.2"/>',
  'lampe-torche': '<path d="M4 8h9l3 3v4l-3 3H4z"/><path d="M13 8v10M20 12h1.5M19 8.5l1-1M19 15.5l1 1"/><path class="ac" d="M5 10h3v6H5z"/>',
  crochet: '<rect x="5" y="10" width="10" height="9" rx="2"/><path d="M7 10V7.5a3 3 0 0 1 6 0"/><path d="M14 21l6-6-2-2-6 6"/><circle class="ac" cx="10" cy="14.5" r="1.2"/>',
  reglette: '<path d="M10 3h4v14a2 2 0 0 1-4 0z"/><path d="M14 9h3l-3 2"/><path class="ac" d="M11 4h2v4h-2z"/>',
  'contournement-d-antidemarrage': '<rect x="7" y="7" width="10" height="10" rx="1.5"/><path d="M10 7V4M14 7V4M10 20v-3M14 20v-3M7 10H4M7 14H4M20 10h-3M20 14h-3"/><rect class="ac" x="10" y="10" width="4" height="4" rx=".6"/>',
  'outil-de-decoupe': '<circle cx="9" cy="12" r="5.5"/><path d="M14.5 12h5.5v3h-5"/><path d="M9 6.5v11M3.5 12h11"/><circle class="ac" cx="9" cy="12" r="1.4"/>',
  brouilleur: '<path d="M12 19V9"/><circle cx="12" cy="7.5" r="1.8"/><path d="M8 4.5a6 6 0 0 0 0 6M16 4.5a6 6 0 0 1 0 6M5.5 2.5a9 9 0 0 0 0 10M18.5 2.5a9 9 0 0 1 0 10"/><path class="ac" d="M9.5 19h5v2h-5z"/>',
  'composeur-automatique': '<rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M9.5 8h1M12 8h1M14.5 8h1M9.5 11h1M12 11h1M14.5 11h1M9.5 14h1M12 14h1M14.5 14h1"/><rect class="ac" x="10" y="17" width="4" height="1.6" rx=".8"/>',
  'cle-usb': '<rect x="4" y="9" width="11" height="6" rx="1"/><path d="M15 10h5v4h-5"/><path class="ac" d="M16.5 11h1.2v.9h-1.2zM16.5 12.3h1.2v.9h-1.2z"/>',
  'serre-cables': '<rect x="3" y="11" width="6" height="5" rx="1"/><path d="M9 13.5h9a3 3 0 0 0 0-6H8"/><path d="M13 16.5l2-3 2 3"/><path class="ac" d="M4.5 12.5h3v2h-3z"/>',
  'sac-de-butin': '<rect x="3" y="9" width="18" height="10" rx="3"/><path d="M8 9V7.5a4 4 0 0 1 8 0V9"/><path d="M3 14h18"/><path class="ac" d="M10 11.5h4v5h-4z"/>',
  'pistolet-a-impulsion': '<path d="M4 9h9l4 2v3l-4 2H4z"/><path d="M6 16v4h3l1-4"/><path class="ac" d="M19 7.5l-2.6 4h2l-2 4 4.4-5.2h-2z"/>',
  /* cartes « Combat » sans capture officielle */
  passants: '<circle cx="8" cy="7" r="2.5"/><circle cx="16" cy="8" r="2"/><path d="M3.5 20v-4a4.5 4.5 0 0 1 9 0v4M13 20v-3.5a3 3 0 0 1 6 0V20"/><circle class="ac" cx="8" cy="7" r="1"/>',
  main: '<path d="M8 12V6a1.5 1.5 0 0 1 3 0v5M11 11V4.5a1.5 1.5 0 0 1 3 0V11M14 11V6a1.5 1.5 0 0 1 3 0v7"/><path d="M8 12l-2-2a1.6 1.6 0 0 0-2.3 2.2L8 17a6 6 0 0 0 9.5 1L20 13"/><circle class="ac" cx="12.5" cy="15.5" r="1.2"/>',
  eau: '<path d="M3 15c2-2 4-2 6 0s4 2 6 0 4-2 6 0M3 19c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/><path d="M6 10l9-6"/><path class="ac" d="M14 3.5l4-1-1 4z"/>',
  'drive-by': '<path d="M3 15l2-5h11l3 5v3H3z"/><circle cx="7" cy="18" r="1.8"/><circle cx="16" cy="18" r="1.8"/><path d="M13 10l2-4h4"/><path class="ac" d="M15.5 4.5h4v2h-4z"/>',
  personnalisation: '<path d="M20.5 7a4.5 4.5 0 0 1-6 4.2L7 18.7a2 2 0 0 1-2.8-2.8l7.5-7.5A4.5 4.5 0 0 1 17 2.5l-2.5 2.5 2 2 2.5-2.5c.3.8.5 1.6.5 2.5z"/><circle class="ac" cx="6" cy="18" r="1"/>'
};
function icon(name, cls) {
  if (!ICONS[name]) throw Error('Icône inconnue : ' + name);
  return '<svg class="ed-ico' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + ICONS[name] + '</svg>';
}

/* ---------- section ---------- */
const TONES = { paper: 'ed--paper', paper2: 'ed--paper2', night: 'ed--night' };
/* opts : id, num, kicker, title, icon, lede (HTML déjà échappé/typographié), tone (paper|paper2|night), accent (amber|coral),
   cls (classes en plus), fam (marqueur de famille pour la sous-navigation). body : HTML de la composition. */
function section(opts, body) {
  if (!opts.id || !opts.title) throw Error('Section sans id ou sans titre');
  const tone = TONES[opts.tone || 'paper']; if (!tone) throw Error('Fond inconnu : ' + opts.tone);
  const accent = opts.accent === 'coral' ? ' ed--coral' : ' ed--amber';
  const cls = 'ed ' + tone + accent + (opts.cls ? ' ' + opts.cls : '') + (opts.reveal === false ? '' : ' reveal');
  return '<section class="' + cls + '" id="' + esc(opts.id) + '" aria-labelledby="' + esc(opts.id) + '-t"' + (opts.fam ? ' data-fam="' + esc(opts.fam) + '"' : '') + '>'
    + '<div class="shell ed-in"><div class="ed-head">'
    + '<div class="ed-mark">' + (opts.num ? '<span class="ed-num" aria-hidden="true">' + pad(opts.num) + '</span>' : '') + (opts.icon ? icon(opts.icon) : '') + '</div>'
    + '<div class="ed-titles">' + (opts.kicker ? '<p class="ed-kicker">' + esc(opts.kicker) + '</p>' : '')
    + '<h2 class="ed-title" id="' + esc(opts.id) + '-t">' + esc(opts.title) + '</h2>'
    + (opts.lede ? '<p class="ed-lede">' + opts.lede + '</p>' : '') + '</div></div>'
    + '<div class="ed-body">' + body + '</div></div></section>';
}

/* ---------- sous-navigation collante ---------- */
/* items : [{href, label, fam}] ; fam pose la couleur du marqueur (--ed-fam-<fam> dans style.css). */
function nav(items, label) {
  return '<nav class="ed-nav" aria-label="' + esc(label || 'Sections de la page') + '"><div class="shell ed-nav-in">'
    + items.map(x => '<a href="' + esc(x.href) + '"' + (x.fam ? ' data-fam="' + esc(x.fam) + '"' : '') + '><i class="ed-nav-dot" aria-hidden="true"></i>' + esc(x.label) + '</a>').join('')
    + '</div></nav>';
}

/* ---------- grands chiffres ---------- */
/* list : [{n, label}] ; la micro-barre montre la part de chaque chiffre par rapport au premier (le total). */
function figures(list) {
  const total = list[0] && list[0].n > 0 ? list[0].n : 1;
  return '<div class="ed-figs">' + list.map(f => {
    const p = Math.max(0, Math.min(100, Math.round(100 * f.n / total)));
    return '<div class="fig' + (f.n === 0 ? ' fig--zero' : '') + '"><b class="fig-n" data-count="' + f.n + '">' + f.n + '</b><span class="fig-l">' + esc(f.label) + '</span><span class="fig-bar" aria-hidden="true"><i style="width:' + p + '%"></i></span></div>';
  }).join('') + '</div>';
}

/* ---------- mur de marques ---------- */
const MONO = ['amber', 'coral', 'night', 'ink'];
function initials(name) {
  const words = name.split(/[\s&-]+/).filter(Boolean);
  return (words.length > 1 ? words[0][0] + words[1][0] : name.slice(0, 2)).toUpperCase();
}
const fold = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
/* brands : [{name, evoque, n, href}] déjà triés. */
function brandWall(brands, opts = {}) {
  const letters = [...new Set(brands.map(b => fold(b.name)[0].toUpperCase()))].sort();
  const bar = '<div class="ed-brandbar" data-brandbar><label class="ed-brandsearch"><span class="sr-only">Chercher une marque</span>'
    + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="21" y2="21"/></svg>'
    + '<input type="search" placeholder="' + esc(opts.placeholder || 'Chercher une marque ou un constructeur évoqué') + '" autocomplete="off" data-brand-q></label>'
    + '<div class="ed-letters" role="group" aria-label="Filtrer par lettre"><button type="button" class="is-on" data-letter="">Toutes</button>'
    + letters.map(l => '<button type="button" data-letter="' + l + '">' + l + '</button>').join('') + '</div>'
    + '<p class="ed-brandcount" role="status" aria-live="polite" data-brand-count></p></div>';
  const tiles = brands.map((b, i) => {
    const tag = b.href ? 'a' : 'div';
    return '<' + tag + ' class="ed-brand"' + (b.href ? ' href="' + esc(b.href) + '"' : '') + ' data-letter="' + fold(b.name)[0].toUpperCase() + '" data-n="' + esc(fold(b.name + ' ' + (b.evoque || ''))) + '">'
      + '<span class="ed-brand-mono ed-brand-mono--' + MONO[i % MONO.length] + '" aria-hidden="true">' + esc(initials(b.name)) + '</span>'
      + '<span class="ed-brand-body"><b>' + esc(b.name) + '</b>' + (b.evoque ? '<span class="ed-brand-ev">' + esc(b.evoque) + '</span>' : '<span class="ed-brand-ev brand-ev--none">' + esc(opts.none || 'constructeur fictif, pas de rapprochement retenu') + '</span>')
      + (typeof b.n === 'number' ? '<span class="ed-brand-n">' + b.n + ' ' + (b.n > 1 ? 'véhicules' : 'véhicule') + (b.href ? ' <i aria-hidden="true">→</i>' : '') + '</span>' : '') + '</span></' + tag + '>';
  }).join('');
  return bar + '<div class="ed-brands" data-brands>' + tiles + '</div><p class="ed-brandempty" data-brand-empty hidden>Aucune marque ne correspond.</p>';
}

/* ---------- cartes d'équipement (suivi du lot 1) ---------- */
/* items : [{id, nom, usage, icon}] ; family : nom de famille data-track. */
function kits(items, family) {
  return '<div class="ed-kits">' + items.map(x => '<div class="ed-kit" data-track="' + esc(family) + '" data-track-id="' + esc(x.id) + '">'
    + '<span class="ed-kit-ico">' + icon(x.icon || x.id) + '</span><b>' + esc(x.nom) + '</b><span>' + esc(x.usage) + '</span></div>').join('') + '</div>';
}
/* ---------- bandeau de munitions ---------- */
/* items : [{id, nom, usage, dot}] ; dot : amber | coral | paper | amber2 | wine. */
function ammo(items, family) {
  return '<div class="ed-ammo">' + items.map(x => '<div class="ed-ammo-item" data-track="' + esc(family) + '" data-track-id="' + esc(x.id) + '" data-dot="' + esc(x.dot || 'amber') + '">'
    + '<i class="ed-dot" aria-hidden="true"></i><b>' + esc(x.nom) + '</b><span>' + esc(x.usage) + '</span></div>').join('') + '</div>';
}

/* ---------- cartes numérotées (Combat) ---------- */
let mediasCache = null;
function medias() { if (!mediasCache) mediasCache = JSON.parse(fs.readFileSync(path.join(root, 'outils/medias-officiels.json'), 'utf8')); return mediasCache; }
/* figure d'un visuel officiel (480 px, srcset 1280) ; alt : texte fourni, sinon celui du catalogue. */
function mediaFigure(id, alt, opts = {}) {
  const m = medias()[id]; if (!m) throw Error('Visuel officiel inconnu : ' + id);
  const small = m.variants.find(v => v.w === 480) || m.variants[0], big = m.variants.find(v => v.w === 1280);
  const text = alt || m.alt; if (!text) throw Error('Texte alternatif manquant pour le visuel ' + id);
  for (const v of [small, big]) if (v && !fs.existsSync(path.join(root, v.src.replace(/^\//, '')))) throw Error('Fichier absent : ' + v.src);
  const prefix = opts.prefix || '';
  return '<figure class="ed-media"><img src="' + prefix + small.src.replace(/^\//, '') + '"' + (big ? ' srcset="' + prefix + small.src.replace(/^\//, '') + ' 480w, ' + prefix + big.src.replace(/^\//, '') + ' 1280w" sizes="' + esc(opts.sizes || '(max-width:700px) 100vw, 400px') + '"' : '')
    + ' width="' + small.w + '" height="' + small.h + '" alt="' + esc(text) + '" loading="lazy" decoding="async"><figcaption>' + esc(opts.caption || 'Visuel officiel Rockstar Games') + '</figcaption></figure>';
}
/* items : [{titre, texte, media, alt, icon}] */
function steps(items, opts = {}) {
  return '<div class="ed-steps">' + items.map((x, i) => '<article class="ed-step' + (x.media ? ' ed-step--media' : '') + '">'
    + '<span class="ed-step-n" aria-hidden="true">' + pad(i + 1) + '</span>'
    + (x.media ? mediaFigure(x.media, x.alt, { prefix: opts.prefix }) : '<span class="ed-step-ico">' + icon(x.icon) + '</span>')
    + '<h3>' + esc(x.titre) + '</h3><p>' + esc(x.texte) + '</p></article>').join('') + '</div>';
}

/* ---------- cartes-lieux ---------- */
/* groups : [{title, items:[{id, name, where}]}] ; un seul groupe sans titre = grille simple. */
function places(groups, opts = {}) {
  const prefix = opts.prefix || '';
  const card = p => '<a class="ed-place" href="' + prefix + 'carte.html#lieu=' + esc(p.id) + '">' + carte.vignette(p.id)
    + '<span class="ed-place-body"><b>' + esc(p.name) + '</b>' + (p.where ? '<span class="ed-place-where">' + esc(p.where) + '</span>' : '')
    + '<span class="veh-go">Voir sur la carte</span></span></a>';
  return groups.map(g => (g.title ? '<h3 class="ed-h3">' + esc(g.title) + '</h3>' : '') + '<div class="ed-places">' + g.items.map(card).join('') + '</div>').join('');
}

/* ---------- blocs de texte ---------- */
/* Colonnes de texte : cards : [{titre, liste:[…], p:[…], icon}] */
function columns(cards) {
  return '<div class="ed-cols' + (cards.length === 4 || cards.length === 5 ? ' ed-cols--' + cards.length : '') + '">' + cards.map(c => '<div class="ed-col">' + (c.icon ? '<span class="ed-col-ico">' + icon(c.icon) + '</span>' : '') + '<h3>' + esc(c.titre) + '</h3>'
    + (c.liste && c.liste.length ? '<ul>' + c.liste.map(l => '<li>' + esc(l) + '</li>').join('') + '</ul>' : '')
    + (c.p || []).map(p => '<p>' + esc(p) + '</p>').join('') + '</div>').join('') + '</div>';
}

module.exports = { esc, icon, ICONS, section, nav, figures, brandWall, kits, ammo, steps, mediaFigure, places, columns, defs: carte.defs, initials, fold };
