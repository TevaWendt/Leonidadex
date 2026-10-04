'use strict';
/* Briques communes des sections Gangs et factions, Missions, Activités annexes, Radios et musique (lk-sections.css et
   lk-sections.js) : fiche plein écran (details + dialog de la page), puces avec vignette, cartes de liens, mini-carte de
   Leonida (même dessin que le localisateur des armes et des véhicules, outils/localisateur.cjs), galerie « En images »
   (même composant que les fiches du monde, animée par common.js) et bloc « Sur la carte de Leonida ».
   Aucun emplacement n’est inventé : les repères sont des lieux de notre carte, dits comme tels. */
const LOC = require('./localisateur.cjs'), carte = require('./carte-vignette.cjs');
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const ICO = {
  pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/></svg>',
  map: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14"/></svg>',
  page: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h6"/></svg>',
  gang: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l7 3v5c0 5-3.4 8.5-7 10-3.6-1.5-7-5-7-10V6z"/></svg>',
  play: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg>'
};
const imgOf = (MED, id) => { const m = MED && MED[id]; if (!m) return null; return { a: m.variants[0], b: m.variants[1] || m.variants[0], alt: m.alt || '' }; };
function img(MED, id, alt, o = {}) {
  const m = imgOf(MED, id); if (!m) return '';
  const ss = u => u.replace(/,/g, '%2C');
  return '<img src="' + m.a.src + '" srcset="' + ss(m.a.src) + ' ' + m.a.w + 'w, ' + ss(m.b.src) + ' ' + m.b.w + 'w" sizes="' + (o.sizes || '(max-width:600px) 100vw, 360px') + '" width="' + (o.big ? m.b.w : m.a.w) + '" height="' + (o.big ? m.b.h : m.a.h) + '" alt="' + esc(alt) + '" loading="' + (o.eager ? 'eager' : 'lazy') + '" decoding="async">';
}
const thumb = (MED, id) => { const m = imgOf(MED, id); return m ? '<img src="' + m.a.src + '" width="' + m.a.w + '" height="' + m.a.h + '" alt="" loading="lazy" decoding="async">' : ''; };

/* boîte de dialogue de la page (une seule), remplie par lk-sections.js à l’ouverture d’une fiche */
const dialog = () => '<dialog class="lkx-sheet" id="lkx-sheet" aria-labelledby="lkx-sheet-title"><div class="lkx-sheet-in"><button type="button" class="lkx-sheet-x" data-lkx-close aria-label="Fermer la fiche"><span aria-hidden="true">×</span></button><div data-lkx-body></div></div></dialog>';
/* fiche plein écran : summary = ce qu’on voit dans la page (carte, ligne) ; le reste s’ouvre en grand (ou dans la page sans script) */
function sheet({ id, cls = '', summary, fig, icon, caption, kicker, title, titleNo, body, attrs = '' }) {
  const figure = fig ? '<figure class="lkx-sheet-fig">' + fig + (caption ? '<figcaption>' + esc(caption) + '</figcaption>' : '') + '</figure>'
    : '<figure class="lkx-sheet-fig lkx-sheet-fig--ico" aria-hidden="true">' + (icon || ICO.page) + '</figure>';
  return '<details class="lkx-det ' + cls + '"' + (id ? ' id="' + esc(id) + '"' : '') + attrs + '><summary>' + summary + '</summary>'
    + '<div class="lkx-sheet-src">' + figure + '<div class="lkx-sheet-main">' + (kicker ? '<p class="lkx-sheet-k">' + kicker + '</p>' : '')
    + '<h3 class="lkx-sheet-t"' + (titleNo ? ' translate="no"' : '') + '>' + esc(title) + '</h3>' + body + '</div></div></details>';
}
/* puce liée avec vignette (personnage, région, gang) ou pictogramme (lieu de la carte, page du site) */
function chip({ href, label, img: im, kind = 'page', small, labelNo }) {
  const ico = im || '<span class="lkx-chip-ico" aria-hidden="true">' + (ICO[{ place: 'pin', map: 'map', gang: 'gang' }[kind]] || ICO.page) + '</span>';
  return '<a class="lkx-chip lkx-chip--' + kind + '" href="' + esc(href) + '">' + ico + '<span><span' + (labelNo ? ' translate="no"' : '') + '>' + esc(label) + '</span>' + (small ? '<small>' + esc(small) + '</small>' : '') + '</span></a>';
}
/* carte de lien « Ailleurs sur le site » */
function linkCard({ href, title, text, img: im, icon }) {
  return '<a class="lkx-link" href="' + esc(href) + '">' + (im || '<span class="lkx-link-ico" aria-hidden="true">' + (icon || ICO.page) + '</span>') + '<span><b>' + esc(title) + '</b>' + (text ? '<span>' + esc(text) + '</span>' : '') + '</span></a>';
}
/* lieu de la carte : nom et quartier (« Port Gellhorn ») ; un nom tiré d’un lieu réel reste signalé comme tel */
function place(id, names = {}) {
  const p = carte.point(id), n = names[id] || String(p.n).replace(/&amp;/g, '&');
  let where = null; if (p.p) { try { where = names[p.p] || String(carte.point(p.p).n).replace(/&amp;/g, '&'); } catch (e) { where = null; } }
  return { id, name: n.replace(/\s*\((nom réel|nom supposé)\)$/, ''), where, supposed: /\(nom supposé\)$/.test(p.n) };
}
/* mini-carte de Leonida avec repères numérotés (fiche plein écran, fiche d’activité…) */
function miniMap(places, { prefix = '', label = 'Carte de Leonida : lieux repérés', note } = {}) {
  if (!places.length) return '';
  return '<div class="lkx-mini-map">' + LOC.mapSvg(places, { label, prefix }) + '<ol>' + places.map((p, i) => '<li><a href="' + prefix + 'carte.html#lieu=' + esc(p.id) + '"><span class="lk-loc-num" aria-hidden="true">' + (i + 1) + '</span><span>' + esc(p.name) + (p.where || p.supposed ? '<small>' + esc([p.where, p.supposed ? 'nom supposé' : null].filter(Boolean).join(' · ')) + '</small>' : '') + '</span></a></li>').join('') + '</ol></div>'
    + (note ? '<p class="lkx-mini-note">' + esc(note) + '</p>' : '');
}
/* bloc « Sur la carte de Leonida » d’une fiche : le localisateur du site (forme « fiche », sans script) */
function locate({ title = 'Sur la carte de Leonida', lede, item, places, prefix = '../', caption, placesTitle = 'Lieux repérés', mapLabel }) {
  if (!places.length) return '';
  return '<section class="shell lkx-locate reveal" aria-labelledby="lkx-locate-t"><h2 class="sec-h" id="lkx-locate-t">' + esc(title) + '</h2>' + (lede ? '<p class="lkx-locate-lede">' + esc(lede) + '</p>' : '')
    + LOC.single({ item: { places: places.map(p => p.id), ...item }, places, prefix, caption, placesTitle, mapLabel: mapLabel || 'Carte de Leonida : ' + item.name }) + '</section>';
}
/* galerie « En images » : même composant que les fiches du monde (outils/lore-gen.js), défilement animé par common.js */
function gallery(MED, list, { name, kicker }) {
  const g = list.filter(x => MED[x.media]); if (g.length < 2) return '';
  const n = g.length, pad = k => String(k).padStart(2, '0');
  return '<section class="shell lore-gallery reveal"><h2 class="sec-h">En images</h2><div class="lore-stack" style="--n:' + n + '"><div class="lore-stage" aria-label="Galerie de ' + n + ' images">'
    + g.map((x, i) => { const m = MED[x.media];
      return '<figure class="lore-slide lore-slide--' + ['z', 'tl', 'br', 'tr', 'bl'][i % 5] + (i === 0 ? ' is-active' : '') + '" data-i="' + i + '"><a href="' + (m.variants[1] || m.variants[0]).src + '" target="_blank" rel="noopener" aria-label="Agrandir : ' + esc(x.alt) + '">'
        + img(MED, x.media, x.alt, { big: true, sizes: '(max-width:820px) 100vw, 560px' }) + '</a><div class="lore-slide-txt" aria-hidden="true"><span class="lst-k">' + esc(x.legende || kicker) + '</span><strong>' + esc(name) + '</strong><em>' + pad(i + 1) + ' / ' + pad(n) + '</em></div></figure>'; }).join('')
    + '</div></div></section>';
}
/* squelette d’une fiche à venir (guide des codes, trophées, rubriques de GTA Online) : chaque rubrique, ce qu’elle dira, et
   une barre qui attend la sortie ; aucun contenu inventé */
function skel(fields, sortie) {
  return '<dl class="lkx-skel">' + fields.map(f => '<div><dt>' + esc(f.t) + '</dt>' + (f.d ? '<dd class="lkx-skel-d">' + esc(f.d) + '</dd>' : '') + '<dd class="lkx-skel-w"><span class="lkx-skel-bar" aria-hidden="true"></span><span>' + esc(sortie) + '</span></dd></div>').join('') + '</dl>';
}
module.exports = { esc, ICO, imgOf, img, thumb, dialog, sheet, chip, linkCard, place, miniMap, locate, gallery, skel };
