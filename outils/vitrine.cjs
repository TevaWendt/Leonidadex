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
  return '<ol class="vt-steps vt-in' + (o.cls ? ' ' + o.cls : '') + '" data-lk-reveal>' + list.map((s, i) => '<li class="vt-step" style="--i:' + i + '">' + (s.ill ? '<span class="vt-step-ill" aria-hidden="true">' + s.ill + '</span>' : '') + '<div class="vt-step-b"><h3>' + esc(s.title) + '</h3><p>' + esc(s.text) + '</p></div></li>').join('') + '</ol>';
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

/* ---------- 9. v7.94 : frise à stations ---------- */
/* list : [{iso, date, title, text, foot, main}] ; title, text et foot sont déjà en HTML (échappés par l’appelant). Le trait
   entre les stations se trace à l’entrée (vitrine.css) ; une colonne sous 760 px. */
function rail(list, o = {}) {
  return '<ol class="vt-rail vt-in' + (o.cls ? ' ' + o.cls : '') + '" data-lk-reveal>' + list.map((s, i) => '<li class="vt-rail-s' + (s.main ? ' vt-rail-s--main' : '') + '" style="--i:' + i + '"><span class="vt-rail-dot" aria-hidden="true"></span><time datetime="' + esc(s.iso) + '">' + esc(s.date) + '</time><h3>' + s.title + '</h3><p>' + s.text + '</p>' + (s.foot ? '<p class="vt-rail-f">' + s.foot + '</p>' : '') + '</li>').join('') + '</ol>';
}

/* ---------- 10. v7.94 : coupure de presse ---------- */
/* q : {text (cité tel quel), lang, who (HTML), when, foot (HTML : renvoi vers la source)} */
function clip(q, o = {}) {
  return '<figure class="vt-clip lk-reveal' + (o.cls ? ' ' + o.cls : '') + '"><blockquote lang="' + esc(q.lang || 'en') + '"><p>' + esc(q.text) + '</p></blockquote><figcaption lang="fr">' + (q.who ? '<b>' + q.who + '</b>' : '') + (q.when ? '<span class="vt-clip-when">' + esc(q.when) + '</span>' : '') + (q.foot ? '<span class="vt-clip-src">' + q.foot + '</span>' : '') + '</figcaption></figure>';
}

/* ---------- 11. v7.94 : deux surfaces comparées ---------- */
/* a, b : {label, n (surface relative), sub} ; le côté de chaque carré suit la racine de la surface. caption : HTML. */
function areas(a, b, caption) {
  const side = x => Math.sqrt(x), sum = side(a.n) + side(b.n);/* les deux carrés et l’écart (5 %) tiennent dans la largeur */
  const sq = x => '<div class="vt-area" style="--w:' + (95 * side(x.n) / sum).toFixed(1) + '%"><span class="vt-area-n" aria-hidden="true">' + esc(x.n === 1 ? '1' : '× ' + x.n) + '</span><b translate="no">' + esc(x.label) + '</b>' + (x.sub ? '<span>' + esc(x.sub) + '</span>' : '') + '</div>';
  return '<figure class="vt-areas lk-reveal"><div class="vt-areas-in">' + sq(a) + sq(b) + '</div>' + (caption ? '<figcaption>' + caption + '</figcaption>' : '') + '</figure>';
}

/* ---------- 12. v7.94 : frise datée (un départ et une arrivée par ligne, sur un même axe de temps) ---------- */
/* o : {from, to : AAAA-MM-JJ ; ticks : [{iso, label}] ; aLabel, bLabel ; rows : [{label, a:{iso, label}, b:{iso, label} | null, gap, foot (HTML)}]}
   Une ligne sans arrivée (b : null) se prolonge en pointillé jusqu’au bord : l’arrivée n’est pas annoncée. */
function dated(o) {
  const t = iso => Date.parse(iso + 'T12:00:00Z'), T0 = t(o.from), T1 = t(o.to), pct = iso => (100 * (t(iso) - T0) / (T1 - T0)).toFixed(2);
  const ticks = '<div class="vt-dated-axis" aria-hidden="true">' + o.ticks.map(k => '<span style="--x:' + pct(k.iso) + '%">' + esc(k.label) + '</span>').join('') + '</div>';
  const rows = o.rows.map((r, i) => {
    const x0 = pct(r.a.iso), x1 = r.b ? pct(r.b.iso) : 100;
    return '<li class="vt-dated-r' + (r.b ? '' : ' vt-dated-r--open') + '" style="--i:' + i + ';--x0:' + x0 + '%;--x1:' + x1 + '%"><div class="vt-dated-h"><h3 translate="no">' + esc(r.label) + '</h3>' + (r.foot ? '<p class="vt-dated-f">' + r.foot + '</p>' : '') + '</div><div class="vt-dated-t"><i class="vt-dated-bar"><b>' + esc(r.b ? (r.gap || '') : (o.bLabel + ' : ' + (o.openLabel || '?'))) + '</b></i>'
      + '<span class="vt-dated-a"><b>' + esc(o.aLabel) + '</b> <time datetime="' + esc(r.a.iso) + '">' + esc(r.a.label) + '</time></span>'
      + (r.b ? '<span class="vt-dated-b"><b>' + esc(o.bLabel) + '</b> <time datetime="' + esc(r.b.iso) + '">' + esc(r.b.label) + '</time></span>' : '') + '</div></li>';
  }).join('');
  return '<div class="vt-dated vt-in" data-lk-reveal>' + ticks + '<ol class="vt-dated-l">' + rows + '</ol></div>';
}

/* ---------- 13. v7.94 : liste à cocher gardée sur l’appareil (vitrine.js : lk_<clé> dans localStorage) ---------- */
/* items : [{title, text}] (HTML) ; key : nom court ; labels : {done} (lu par les lecteurs d’écran quand tout est coché) */
function checklist(items, key, o = {}) {
  return '<ul class="vt-check vt-in" data-vt-check="' + esc(key) + '" data-lk-reveal>' + items.map((x, i) => '<li style="--i:' + i + '"><label class="vt-check-l"><input type="checkbox" value="' + i + '"><span class="vt-check-box" aria-hidden="true">' + SVG.yes + '</span><span class="vt-check-b"><b>' + x.title + '</b><span>' + x.text + '</span></span></label></li>').join('') + '</ul>'
    + (o.done ? '<p class="vt-check-done" data-vt-check-done hidden>' + o.done + '</p>' : '');
}

/* ---------- 14. v7.94 : temps de téléchargement (vitrine.js : [data-vt-dl]) ---------- */
/* L : {title, size, sizeHint, speed, speedHint, presets:[{n, label}], result, resultHint, empty} ; o : {size (Go) si annoncée} */
function dlCalc(L, o = {}) {
  const id = o.id || 'vt-dl';
  return '<form class="vt-dl lk-reveal" data-vt-dl' + (o.size ? ' data-vt-dl-size="' + esc(o.size) + '"' : '') + '><fieldset><legend>' + esc(L.title) + '</legend>'
    + '<div class="vt-dl-f"><label for="' + id + '-size">' + esc(L.size) + '</label><div class="vt-dl-in"><input id="' + id + '-size" type="number" inputmode="decimal" min="1" max="999" step="1" data-vt-dl-size-in' + (o.size ? ' value="' + esc(o.size) + '"' : ' placeholder="?"') + '><span>Go</span></div><small>' + esc(L.sizeHint) + '</small></div>'
    + '<div class="vt-dl-f"><label for="' + id + '-speed">' + esc(L.speed) + '</label><div class="vt-dl-in"><input id="' + id + '-speed" type="number" inputmode="decimal" min="1" max="10000" step="1" value="100" data-vt-dl-speed-in><span>Mbit/s</span></div>'
    + (L.presets ? '<div class="vt-dl-presets" role="group" aria-label="' + esc(L.speedHint) + '">' + L.presets.map(p => '<button type="button" data-vt-dl-preset="' + p.n + '">' + esc(p.label) + '</button>').join('') + '</div>' : '<small>' + esc(L.speedHint) + '</small>') + '</div>'
    + '<div class="vt-dl-out" aria-live="polite"><span class="vt-dl-k">' + esc(L.result) + '</span><output data-vt-dl-out>' + esc(L.empty) + '</output><small>' + esc(L.resultHint) + '</small></div></fieldset></form>';
}

/* ---------- 15. v8.01 : mosaïque d’images (tuiles-liens vers une page du site) ---------- */
/* list : [{href, media, alt, kicker, title, text, go, big (tuile double sur grand écran), titleNo}] ; o : {cls, sizes, prefix, label}.
   Chaque tuile est un lien : le visuel officiel couvre la tuile, le titre est posé dessus ; au survol l’image s’avance dans son
   cadre et le texte se dévoile (vitrine.css, 30). La première tuile peut être double (big) : la mosaïque prend alors la forme
   d’une une de journal. Le nombre de tuiles (4, 5 ou 6) choisit la grille : aucune tuile orpheline en fin de grille, à aucune
   largeur (vt-mosaic--n4, --n5, --n6). Sans script, tout est visible. */
function mosaic(list, o = {}) {
  return '<ul class="vt-mosaic vt-mosaic--n' + list.length + ' vt-in vt-in--scan' + (o.cls ? ' ' + o.cls : '') + '" data-lk-reveal' + (o.label ? ' aria-label="' + esc(o.label) + '"' : '') + '>'
    + list.map((t, i) => { /* sizes : la grande tuile ; une petite tuile (une colonne sur deux sous 820 px, pleine rangée sous 480 px) ; la
         dernière des grilles de 4 et de 6 prend toute la rangée sous 820 px (vitrine.css, 30) : l’image choisie suit la largeur réelle */
      const wide = (list.length === 4 || list.length === 6) && i === list.length - 1;
      const sizes = o.sizes || (t.big ? '(max-width:819px) 92vw, (max-width:1099px) 64vw, 640px' : wide ? '(max-width:819px) 92vw, 320px' : '(max-width:479px) 92vw, (max-width:819px) 46vw, 320px');
      return '<li' + (t.big ? ' class="vt-mosaic--big"' : '') + ' style="--i:' + i + '">'
      + '<a class="vt-tile" href="' + esc(t.href) + '"' + (/^https?:/.test(t.href) ? ' target="_blank" rel="noopener nofollow"' : '') + '>'
      + '<span class="vt-media vt-tile-m">' + img(t.media, t.alt, { sizes, prefix: o.prefix }) + '</span>'
      + '<span class="vt-tile-b">' + (t.kicker ? '<span class="vt-tile-k">' + esc(t.kicker) + '</span>' : '') + '<span class="vt-tile-t"' + (t.titleNo ? ' translate="no"' : '') + '>' + esc(t.title) + '</span>' + (t.text ? '<span class="vt-tile-d">' + esc(t.text) + '</span>' : '') + (t.go ? '<span class="vt-go">' + esc(t.go) + '</span>' : '') + '</span>'
      + '</a></li>'; }).join('') + '</ul>';
}
/* ---------- 16. v8.01 : fond d’image d’une carte sombre (question ouverte, point à venir) ---------- */
/* Le visuel officiel est posé derrière le texte, assombri ; au survol il s’éclaire et s’avance (vitrine.css, 31). Le cadre est
   aria-hidden (le texte de la carte dit déjà de quoi il s’agit) mais l’image garde son texte alternatif, comme tout visuel
   officiel du site (règle des tests : jamais un alt vide sur img/officiel). */
const bg = (id, alt, o = {}) => id ? '<span class="vt-bg" aria-hidden="true">' + img(id, alt || '', { sizes: o.sizes || '(max-width:719px) 92vw, 360px', prefix: o.prefix }) + '</span>' : '';

module.exports = { esc, SVG, MED, imgSet, img, bigSrc, media, figs, card, cards, strip, band, aside, faqGrid, compare, steps, cd, copyBox, filters, rail, clip, areas, dated, checklist, dlCalc, mosaic, bg };
