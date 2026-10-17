'use strict';
/* v7.92 : briques communes des pages enrichies (Éditions, Vidéos officielles, Actualités, Ce qui est confirmé, Presse, Mode
   compagnon, Devine le lieu). Le balisage sort d’ici, les styles sont dans vitrine.css, le comportement dans vitrine.js.
   Aucun texte n’est écrit ici : les générateurs passent leurs données (déjà rédigées en français, traduites ensuite par la
   mémoire de traduction). Les images sont les visuels officiels de outils/medias-officiels.json (480, 800 et 1 280 px ;
   800 au plus au téléphone), chacune avec son texte alternatif. Les groupes qui entrent au défilement portent data-lk-reveal : c’est le moteur commun
   (common.js, LKMotion) qui pose « is-in » ; vitrine.css décrit la cascade (--i, 50 ms par élément, 300 ms au plus). */
const fs = require('node:fs'), path = require('node:path');
const ROOT = path.resolve(__dirname, '..');
const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let MEDC = null;
const MED = () => MEDC || (MEDC = JSON.parse(fs.readFileSync(path.join(ROOT, 'outils/medias-officiels.json'), 'utf8')));

const SVG = {
  zoom: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5 21 21M10.5 7.5v6M7.5 10.5h6"/></svg>',
  prev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
  next: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>',
  yes: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  no: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M7 7l10 10M17 7 7 17"/></svg>',
  copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/></svg>',
  play: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg>'
};

/* ---------- images ---------- */
function imgSet(id) {
  const m = MED()[id]; if (!m) throw new Error('Visuel officiel inconnu : ' + id);
  const a = m.variants.find(v => v.w === 480) || m.variants[0], b = m.variants.find(v => v.w === 1280) || a;
  for (const v of [a, b]) if (!fs.existsSync(path.join(ROOT, v.src.replace(/^\//, '')))) throw new Error('Fichier absent : ' + v.src);
  /* la version 800 px, à côté des deux autres dans img/officiel (le manifeste ne liste que 480 et 1 280) */
  const cs = b !== a && /-1280\.webp$/.test(b.src) ? b.src.replace(/-1280\.webp$/, '-800.webp') : null;
  const c = cs && fs.existsSync(path.join(ROOT, cs.replace(/^\//, ''))) ? { src: cs, w: 800 } : null;
  return { a, b, c, m };
}
const rel = (src, prefix) => (prefix || '') + src.replace(/^\//, '');
/* o : sizes, eager (premier écran ; 'normal' : chargée tout de suite, sans priorité haute), big (largeur et hauteur de la grande
   image), prefix ('' ou '../'), alt obligatoire.
   Trois tailles (480, 800, 1 280 px) ; au téléphone (599 px et moins), 800 px au plus : un écran à densité 3 prenait la
   1 280 pour une carte de 360 px (deux à trois fois plus lourde, sans différence visible). <picture> sans boîte
   (.vt-pic : display:contents) : la mise en page est celle de l’image seule. */
function img(id, alt, o = {}) {
  const { a, b, c } = imgSet(id);
  if (alt === undefined || alt === null) throw new Error('Texte alternatif manquant pour ' + id);
  const w = o.big ? b : a, sizes = esc(o.sizes || '(max-width:719px) 92vw, 420px');
  const set = l => l.map(v => rel(v.src, o.prefix) + ' ' + v.w + 'w').join(', ');
  /* une seule taille (visuel plus petit que 480 px) : srcset d’un seul fichier, sinon outils/sync-site.cjs en ajouterait un
     de 480 à 1 280 px qui ferait télécharger au téléphone une copie du même fichier */
  const tag = '<img src="' + rel(a.src, o.prefix) + '" srcset="' + set(b !== a ? (c ? [a, c, b] : [a, b]) : [a]) + '" sizes="' + sizes + '"'
    + ' width="' + w.w + '" height="' + w.h + '" alt="' + esc(alt) + '"' + (o.eager ? (o.eager === 'normal' ? '' : ' fetchpriority="high"') : ' loading="lazy"') + ' decoding="async">';
  return c ? '<picture class="vt-pic"><source media="(max-width:599px)" srcset="' + set([a, c]) + '" sizes="' + sizes + '">' + tag + '</picture>' : tag;
}
const bigSrc = (id, prefix) => rel(imgSet(id).b.src, prefix);
/* cadre d’image d’une carte : numéro (pastille), étiquette (coin bas droit) */
function media(id, alt, o = {}) {
  return '<span class="vt-media">' + img(id, alt, o) + (o.n ? '<span class="vt-media-n vt-stamp" aria-hidden="true">' + esc(o.n) + '</span>' : '') + (o.tag ? '<span class="vt-media-tag">' + esc(o.tag) + '</span>' : '') + '</span>';
}

/* ---------- 1. chiffres ---------- */
/* list : [{n, label, p (part de 0 à 100, facultative), accent, c (teinte de la barre), no (libellé à ne pas traduire : un
   nom propre)}] ; n écrit tel quel (le défilement de common.js ne joue que sur un nombre sans séparateur) */
function figs(list, o = {}) {
  return '<ul class="vt-figs vt-in' + (o.cls ? ' ' + o.cls : '') + '" data-lk-reveal>' + list.map((f, i) => '<li class="vt-fig' + (f.accent ? ' vt-fig--accent' : '') + '" style="--i:' + i + (typeof f.p === 'number' ? ';--p:' + Math.max(4, Math.min(100, Math.round(f.p))) + '%' : '') + (f.c ? ';--c:' + esc(f.c) : '') + '">'
    + '<b' + (/^\d+$/.test(String(f.n)) ? ' data-lk-count' : '') + '>' + esc(f.n) + '</b><span' + (f.no ? ' translate="no"' : '') + '>' + esc(f.label) + '</span>' + (typeof f.p === 'number' ? '<i aria-hidden="true"></i>' : '') + '</li>').join('') + '</ul>';
}

/* ---------- 2. cartes à image ---------- */
/* c : {href, media, alt, n, tag, kicker, title, text, meta:[…], go, attrs, titleNo} ; sans href : carte de lecture (immobile) */
function card(c, o = {}) {
  const tag = c.href ? 'a' : 'div';
  return '<' + tag + ' class="vt-card' + (c.cls ? ' ' + c.cls : '') + '"' + (c.href ? ' href="' + esc(c.href) + '"' : '') + (c.attrs || '') + '>'
    + (c.media ? media(c.media, c.alt === undefined ? '' : c.alt, { n: c.n, tag: c.tag, sizes: o.sizes, prefix: o.prefix })
      /* pas encore de visuel officiel : silhouette « teaser » dessinée dans le style du site, jamais une image prise ailleurs */
      : c.teaser ? '<span class="vt-media vt-media--teaser">' + c.teaser + (c.n ? '<span class="vt-media-n vt-stamp" aria-hidden="true">' + esc(c.n) + '</span>' : '') + (c.tag ? '<span class="vt-media-tag">' + esc(c.tag) + '</span>' : '') + (c.teaserLabel ? '<span class="vt-teaser-l">' + esc(c.teaserLabel) + '</span>' : '') + '</span>' : '')
    + '<div class="vt-card-b">' + (c.kicker ? '<p class="vt-card-k">' + esc(c.kicker) + '</p>' : '')
    + '<' + (o.h || 'h3') + ' class="vt-card-t"' + (c.titleNo ? ' translate="no"' : '') + '>' + esc(c.title) + '</' + (o.h || 'h3') + '>'
    + (c.text ? '<p class="vt-card-d"' + (c.textNo ? ' translate="no"' : '') + '>' + esc(c.text) + '</p>' : '')
    + (c.meta && c.meta.length ? '<ul class="vt-card-meta">' + c.meta.map(m => '<li>' + esc(m) + '</li>').join('') + '</ul>' : '')
    + (c.href && c.go ? '<span class="vt-go">' + esc(c.go) + '</span>' : '')
    + '</div></' + tag + '>';
}
/* o : cols (2 | 3 | auto), effet d’entrée (deal | scan | rise), id, sizes, prefix */
function cards(list, o = {}) {
  const fx = o.fx === 'scan' ? ' vt-in--scan' : o.fx === 'rise' ? '' : ' vt-in--deal';
  return '<ul class="vt-cards' + (o.cols ? ' vt-cards--' + o.cols : '') + ' vt-in' + fx + (o.cls ? ' ' + o.cls : '') + '"' + (o.id ? ' id="' + esc(o.id) + '"' : '') + ' data-lk-reveal>'
    + list.map((c, i) => '<li style="--i:' + i + '"' + (c.item ? ' data-vt-item data-vt-t="' + esc(c.item) + '"' : '') + '>' + card(c, o) + '</li>').join('') + '</ul>';
}

/* ---------- 3. bande de photogrammes ---------- */
/* list : [{media, alt, href (grande image si absent), title, sub, time}] ; labels : {region, prev, next} */
function strip(list, labels, o = {}) {
  return '<div class="vt-strip" data-vt-strip role="region" aria-label="' + esc(labels.region) + '">'
    + '<div class="vt-strip-nav" hidden><button type="button" class="vt-arrow" data-vt-prev aria-label="' + esc(labels.prev) + '">' + SVG.prev + '</button><button type="button" class="vt-arrow" data-vt-next aria-label="' + esc(labels.next) + '">' + SVG.next + '</button></div>'
    + '<ul class="vt-strip-l vt-in vt-in--scan" data-lk-reveal>' + list.map((s, i) => {
      const href = s.href || bigSrc(s.media, o.prefix), isImg = !s.href;
      return '<li style="--i:' + i + '"><a class="vt-shot" href="' + esc(href) + '"' + (s.external ? ' target="_blank" rel="noopener nofollow"' : '') + '>'
        + '<span class="vt-media">' + img(s.media, s.alt, { sizes: '(max-width:719px) 82vw, 420px', prefix: o.prefix }) + (s.time ? '<span class="vt-time">' + esc(s.time) + '</span>' : '') + (isImg ? '<span class="vt-zoom" aria-hidden="true">' + SVG.zoom + '</span>' : '') + '</span>'
        + (s.title || s.sub ? '<span class="vt-shot-b">' + (s.title ? '<span class="vt-shot-t">' + esc(s.title) + '</span>' : '') + (s.sub ? '<span class="vt-shot-s">' + esc(s.sub) + '</span>' : '') + '</span>' : '')
        + '</a></li>';
    }).join('') + '</ul></div>';
}

/* ---------- 4. bandeau d’image ---------- */
function band(b, o = {}) {
  return '<figure class="vt-band' + (o.cls ? ' ' + o.cls : '') + '">' + img(b.media, b.alt, { big: true, sizes: '(max-width:1400px) 96vw, 1360px', prefix: o.prefix })
    + '<figcaption class="vt-band-b">' + (b.kicker ? '<span class="vt-band-k">' + esc(b.kicker) + '</span>' : '') + (b.title ? '<span class="vt-band-t">' + esc(b.title) + '</span>' : '') + (b.text ? '<span class="vt-band-d">' + esc(b.text) + '</span>' : '') + '</figcaption>'
    + '<span class="vt-band-c">' + esc(b.credit || 'Visuel officiel Rockstar Games') + '</span></figure>';
}

/* ---------- 5. questions + encart Léo ---------- */
/* a : {title, text, asks:[questions], mail:{href,label}, more (HTML), media, alt} */
function aside(a, o = {}) {
  return '<aside class="vt-aside" aria-label="' + esc(a.title) + '">' + (a.media ? '<figure class="vt-aside-fig">' + img(a.media, a.alt || '', { sizes: '(max-width:899px) 92vw, 440px', prefix: o.prefix }) + '</figure>' : '')
    + '<h3>' + esc(a.title) + '</h3>' + (a.text ? '<p>' + esc(a.text) + '</p>' : '')
    + (a.asks && a.asks.length ? '<ul class="vt-asks">' + a.asks.map(q => '<li><button type="button" class="vt-ask" data-vt-leo>' + esc(q) + '</button></li>').join('') + '</ul>' : '')
    + (a.more || '') + (a.mail ? '<a class="vt-aside-mail" href="' + esc(a.mail.href) + '">' + esc(a.mail.label) + '</a>' : '') + '</aside>';
}
const faqGrid = (faqHtml, asideHtml) => '<div class="vt-faqgrid">' + faqHtml + asideHtml + '</div>';

/* ---------- 6. tableau comparatif ---------- */
/* t : {caption, cols:[intitulés des colonnes de valeurs], first (intitulé de la 1re colonne), rows:[{label, cells:[true|false|texte]}], hi (index de la colonne mise en avant)},
   labels : {yes, no} (lus par les lecteurs d’écran) */
function compare(t, labels) {
  const cell = (v, i) => '<td data-l="' + esc(t.cols[i]) + '"' + (t.hi === i ? ' class="vt-col-hi"' : '') + '>' + (v === true ? '<span class="vt-yes">' + SVG.yes + '<span class="sr-only">' + esc(labels.yes) + '</span></span>' : v === false ? '<span class="vt-no">' + SVG.no + '<span class="sr-only">' + esc(labels.no) + '</span></span>' : esc(v)) + '</td>';
  return '<table class="vt-compare"><caption class="sr-only">' + esc(t.caption) + '</caption><thead><tr><th scope="col">' + esc(t.first) + '</th>' + t.cols.map((c, i) => '<th scope="col"' + (t.hi === i ? ' class="vt-col-hi"' : '') + '>' + esc(c) + '</th>').join('') + '</tr></thead><tbody>'
    + t.rows.map(r => '<tr><th scope="row">' + esc(r.label) + '</th>' + r.cells.map(cell).join('') + '</tr>').join('') + '</tbody></table>';
}

/* ---------- 7. étapes illustrées ---------- */
/* list : [{title, text, ill (SVG décoratif)}] */
function steps(list, o = {}) {
  return '<ol class="vt-steps vt-in' + (o.cls ? ' ' + o.cls : '') + '" data-lk-reveal>' + list.map((s, i) => '<li class="vt-step" style="--i:' + i + '">' + (s.ill ? '<span class="vt-step-ill" aria-hidden="true">' + s.ill + '</span>' : '') + '<h3>' + esc(s.title) + '</h3><p>' + esc(s.text) + '</p></li>').join('') + '</ol>';
}

/* ---------- 8. compte à rebours, copie, filtres ---------- */
const cd = iso => '<span class="vt-cd" data-vt-cd="' + esc(iso) + '"></span>';
/* bloc copiable : text (affiché et copié), labels : {copy, ok} ; le bouton n’apparaît qu’avec le script */
function copyBox(textHtml, labels, o = {}) {
  return '<div class="vt-copybox' + (o.cls ? ' ' + o.cls : '') + '" data-vt-copy-box><p class="vt-copy-src" data-vt-copy-src>' + textHtml + '</p>'
    + '<button type="button" class="vt-copy" data-vt-copy hidden>' + SVG.copy + '<span class="vt-copy-l">' + esc(labels.copy) + '</span><span class="vt-copy-ok" aria-live="polite">' + esc(labels.ok) + '</span></button></div>';
}
/* barre de filtres : id de la zone filtrée, [{f, label, n}], libellé de « tout » ; cachée sans script */
function filters(scopeId, list, all, label) {
  return '<div class="vt-filters" data-vt-filters="' + esc(scopeId) + '" role="group" aria-label="' + esc(label) + '" hidden>'
    + '<button type="button" class="vt-filter" data-vt-f="" aria-pressed="true">' + esc(all.label) + ' <b>' + all.n + '</b></button>'
    + list.map(x => '<button type="button" class="vt-filter" data-vt-f="' + esc(x.f) + '" aria-pressed="false">' + esc(x.label) + ' <b>' + x.n + '</b></button>').join('') + '</div>';
}

module.exports = { esc, SVG, MED, imgSet, img, bigSrc, media, figs, card, cards, strip, band, aside, faqGrid, compare, steps, cd, copyBox, filters };
