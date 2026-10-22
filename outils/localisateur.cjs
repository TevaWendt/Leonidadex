'use strict';
/* v7.50 (lot 3) : sélecteur illustré « Où le trouver » pour les armes et les véhicules.
   Remplace les petits carrés portant seulement un nom : chaque objet a sa vignette (photo officielle ou schéma), son
   nom, sa catégorie ; le choix met en évidence, sur la carte de Leonida, les lieux liés à sa catégorie, et un résumé dit
   ce qui est sélectionné et ce qui est montré. Aucun emplacement n’est inventé : tant que Rockstar n’a rien publié,
   l’emplacement de l’objet reste « Emplacement à venir » et les repères sont des lieux repérés sur notre carte, dits
   comme tels (jamais un point de vente confirmé pour cet objet). Coordonnées : celles de la carte interactive.
   Deux formes : hub (liste filtrable + carte + résumé, animée par localisateur.js) et fiche (un seul objet, sans script). */
const carte = require('./carte-vignette.cjs'), REF = require('./carte-reference.cjs');
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const fold = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const EMPTY = 'Emplacement à venir';

/* Carte : v7.55 (lot 2, VIS-02) le fond est la référence commune img/leonida-carte.svg (outils/carte-reference.cjs,
   dérivée du dessin de carte.html), posée entière sous les repères (img chargée à l'approche de l'écran, SVG des repères
   par-dessus, même boîte 5200 × 6000) : même fond, même orientation, mêmes proportions et mêmes coordonnées que la carte
   interactive ; Leonida est montrée en entier (vue par défaut), le cadrage serré (frame) reste disponible avec {full:false}. Les lieux proches (plusieurs concessions dans le même quartier) ne se
   recouvrent pas : chaque numéro est posé à côté de son point, dans la première direction libre, relié par un trait
   fin. Placement calculé ici, déterministe. */
function frame(pts) {
  const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
  let x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const span = Math.max(x1 - x0, y1 - y0, 1400), pad = Math.max(520, span * 0.16), size = span + 2 * pad;
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  let vx = Math.round(cx - size / 2), vy = Math.round(cy - size / 2), vw = Math.round(Math.min(size, carte.W)), vh = Math.round(Math.min(size, carte.H));
  vx = Math.max(0, Math.min(carte.W - vw, vx)); vy = Math.max(0, Math.min(carte.H - vh, vy));
  return { vx, vy, vw, vh };
}
function mapSvg(places, opts = {}) {
  const pts = places.map((p, i) => Object.assign({}, carte.point(p.id), { id: p.id, n: i + 1 }));
  const f = opts.full === false ? frame(pts) : { vx: 0, vy: 0, vw: carte.W, vh: carte.H };
  const dot = Math.round(f.vw * 0.014), lab = Math.round(f.vw * 0.034), gap = lab * 2.25;
  const taken = pts.map(p => ({ x: p.x, y: p.y, r: dot * 1.6 }));
  const DIRS = [[1, -1], [1, 1], [-1, -1], [-1, 1], [0, -1.35], [1.35, 0], [0, 1.35], [-1.35, 0]];
  const labels = pts.map(p => {
    for (let ring = 1; ring <= 4; ring++) for (const [dx, dy] of DIRS) {
      const x = p.x + dx * gap * ring * 0.72, y = p.y + dy * gap * ring * 0.72;
      if (x - lab < f.vx || x + lab > f.vx + f.vw || y - lab < f.vy || y + lab > f.vy + f.vh) continue;
      if (taken.every(t => Math.hypot(t.x - x, t.y - y) > t.r + lab * 1.08)) { taken.push({ x, y, r: lab }); return { x: Math.round(x), y: Math.round(y) }; }
    }
    return { x: p.x, y: p.y - gap };
  });
  /* v7.86 : opts.dots — repères sans numéro (forme courte des fiches, sans liste de lieux à laquelle renvoyer un numéro) */
  const pins = pts.map((p, i) => { const l = labels[i];
    if (opts.dots) return '<g class="lk-loc-pin" data-place="' + esc(p.id) + '" data-name="' + esc(places[i].name) + '"><circle class="lk-loc-halo" cx="' + p.x + '" cy="' + p.y + '" r="' + dot * 2.4 + '"/><circle class="lk-loc-dot" cx="' + p.x + '" cy="' + p.y + '" r="' + dot + '"/></g>';
    return '<g class="lk-loc-pin" data-place="' + esc(p.id) + '" data-name="' + esc(places[i].name) + '"><line class="lk-loc-lead" x1="' + p.x + '" y1="' + p.y + '" x2="' + l.x + '" y2="' + l.y + '" stroke-width="' + Math.max(8, Math.round(dot * 0.35)) + '"/><circle class="lk-loc-halo" cx="' + p.x + '" cy="' + p.y + '" r="' + dot * 2.4 + '"/><circle class="lk-loc-dot" cx="' + p.x + '" cy="' + p.y + '" r="' + dot + '"/>'
      + '<circle class="lk-loc-lab" cx="' + l.x + '" cy="' + l.y + '" r="' + lab + '" stroke-width="' + Math.round(lab * 0.14) + '"/><text class="lk-loc-pin-n" x="' + l.x + '" y="' + l.y + '" dy="' + Math.round(lab * 0.42) + '" text-anchor="middle" font-size="' + Math.round(lab * 1.15) + '">' + p.n + '</text></g>'; }).join('');
  return '<div class="lk-loc-stage">' + REF.image(opts.prefix) + '<svg class="lk-loc-svg" viewBox="' + f.vx + ' ' + f.vy + ' ' + f.vw + ' ' + f.vh + '" role="img" aria-label="' + esc(opts.label || 'Carte de Leonida et lieux repérés') + '" focusable="false">' + (opts.sea ? sea() : '') + pins + '</svg></div>';
}
/* v8.04 (lot H) : dans les fiches, la carte prend la hauteur de sa colonne voisine ; l’image et les repères gardent leurs
   proportions (contain d’un côté, viewBox de l’autre) et le reste du cadre est de la mer : le même dégradé et les mêmes vagues
   que la référence (lus dans img/leonida-carte.svg, mêmes unités), tracés hors de la boîte 5200 × 6000, sous les repères.
   Aucune couture visible entre l’image et le cadre, quelle que soit sa forme. */
let SEA = null;
function sea() {
  if (SEA === null) {
    SEA = '';
    try {
      const svg = fs.readFileSync(path.join(root, REF.FILE), 'utf8');
      const g = svg.match(/<linearGradient id="water"[^>]*>([\s\S]*?)<\/linearGradient>/), w = svg.match(/<pattern id="waves"([^>]*)>([\s\S]*?)<\/pattern>/);
      if (g && w) SEA = '<defs><linearGradient id="lk-sea-g" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="' + carte.H + '">' + g[1] + '</linearGradient><pattern id="lk-sea-w"' + w[1] + '>' + w[2] + '</pattern></defs>'
        + ['lk-sea-g', 'lk-sea-w'].map(id => '<path class="lk-loc-sea" fill-rule="evenodd" fill="url(#' + id + ')" d="M-60000 -60000H' + (carte.W + 60000) + 'V' + (carte.H + 60000) + 'H-60000ZM0 0V' + carte.H + 'H' + carte.W + 'V0Z"/>').join('');
      SEA = SEA.replace(/>\s+</g, '><');
    } catch (e) { SEA = ''; }
  }
  return SEA;
}
/* Carte sans lieu lié : le même fond, sans repère. */
function emptyMap(prefix, opts = {}) {
  return '<div class="lk-loc-stage">' + REF.image(prefix) + '<svg class="lk-loc-svg lk-loc-svg--empty" viewBox="0 0 ' + carte.W + ' ' + carte.H + '" role="img" aria-label="Carte de Leonida, aucun lieu lié" focusable="false">' + (opts.sea ? sea() : '') + '</svg></div>';
}
/* v8.04 (lot H) : chaque lieu montré mène directement à lui : sa page (lieux-carte/…, lieux/…, d’après
   outils/pages-elements-index.json, écrit par gen-pages-elements.cjs) quand elle existe, sinon la carte interactive centrée
   sur lui (carte.html#lieu=…). */
let PAGES = null;
function placePage(id) {
  if (PAGES === null) { try { PAGES = JSON.parse(fs.readFileSync(path.join(root, 'outils/pages-elements-index.json'), 'utf8')).elements || {}; } catch (e) { PAGES = {}; } }
  const pg = PAGES[id]; return pg && fs.existsSync(path.join(root, pg)) ? pg : null;
}
function placeHref(prefix, id) { const pg = placePage(id); return pg ? prefix + pg : prefix + 'carte.html#lieu=' + encodeURIComponent(id); }
const CHEV = '<svg class="lk-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>';
const PIN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/></svg>';
/* vignette d’un lieu (forme complète) : image officielle passée par le générateur (p.img : {variants:[{src,w,h}…]} ou
   {src,w,h}), décorative (le nom suit dans le lien) ; srcset quand plusieurs tailles existent */
function placeImg(img) {
  const vs = img && (img.variants || (img.src ? [img] : [])).filter(v => v && v.src); if (!vs || !vs.length) return '';
  const v = vs[0];
  return '<img src="' + esc(v.src) + '"' + (vs.length > 1 ? ' srcset="' + esc(vs.map(x => x.src + ' ' + x.w + 'w').join(', ')) + '" sizes="(max-width:600px) 92vw, 360px"' : '') + ' width="' + (v.w || 480) + '" height="' + (v.h || 270) + '" alt="" loading="lazy" decoding="async">';
}
function placeList(places, prefix, opts = {}) {
  const media = places.some(p => placeImg(p.img));
  return '<ol class="lk-loc-places' + (media ? ' lk-loc-places--media' : '') + '"' + (opts.data ? ' data-loc-places-list' : '') + '>' + places.map((p, i) => { const pg = placePage(p.id), im = media ? placeImg(p.img) : '';
    return '<li data-place="' + esc(p.id) + '"><a class="lk-loc-place" href="' + placeHref(prefix, p.id) + '">'
      + (media ? '<span class="lk-loc-place-fig' + (im ? '' : ' lk-loc-place-fig--none') + '">' + (im || PIN) + '</span>' : '')
      + '<span class="lk-loc-num" aria-hidden="true">' + (i + 1) + '</span><div class="lk-loc-place-t"><p class="lk-loc-place-n">' + esc(p.name) + '</p>' + (p.where || p.group ? '<p class="lk-loc-place-w">' + esc([p.group, p.where].filter(Boolean).join(', ')) + '</p>' : '') + '</div><span class="veh-go">' + (pg ? 'Voir la fiche' : 'Voir sur la carte') + '</span></a></li>'; }).join('') + '</ol>';
}
/* v8.04 (lot H) : légende des fiches (forme courte) : le numéro du repère, le nom du lieu et son quartier, un lien vers le lieu ;
   rien d’autre (pas de paragraphe répété d’une fiche à l’autre). Nom et quartier ont chacun leur bloc (p) : la mémoire de
   traduction les reprend un par un (noms de lieux déjà traduits), sans une phrase par ligne et par numéro. */
function legendList(places, prefix) {
  return '<ol class="lk-loc-legend-list">' + places.map((p, i) => '<li data-place="' + esc(p.id) + '"><a class="lk-loc-legend-a" href="' + placeHref(prefix, p.id) + '"><span class="lk-loc-num" aria-hidden="true">' + (i + 1) + '</span><div class="lk-loc-legend-t"><p class="lk-loc-legend-n">' + esc(p.name) + '</p>' + (p.where ? '<p class="lk-loc-legend-w">' + esc(p.where) + '</p>' : '') + '</div>' + CHEV + '</a></li>').join('') + '</ol>';
}
function pinsHref(prefix, ids, title) { return prefix + 'carte.html#pins=' + ids.map(encodeURIComponent).join(',') + '&amp;t=' + encodeURIComponent(title); }
/* Résumé de l’objet choisi (même texte que celui écrit par localisateur.js). */
function summary(item, placesById, prefix, opts = {}) {
  const linked = item.places.map(id => placesById[id]).filter(Boolean);
  return '<div class="lk-loc-sum-in"><span class="lk-loc-sum-thumb">' + item.thumb + '</span><div class="lk-loc-sum-t"><p class="lk-loc-kicker">' + esc(item.catLabel) + '</p><p class="lk-loc-name">' + esc(item.name) + '</p>'
    + '<p class="lk-loc-status"><b>Où ' + esc(item.pronoun || 'le') + ' trouver :</b> ' + esc(item.status || EMPTY) + '</p>'
    + (opts.noNote ? '' : '<p class="lk-loc-note">' + esc(linked.length ? item.linkedText + ' ' + linked.map(p => p.name).join(', ') + '.' : item.noneText) + '</p>')
    + '<p class="lk-loc-actions">' + (opts.self ? '' : '<a class="lk-loc-btn lk-loc-btn--main" href="' + esc(prefix + item.url) + '">Ouvrir la fiche</a>') + (linked.length ? '<a class="lk-loc-btn" href="' + pinsHref(prefix, linked.map(p => p.id), item.mapTitle) + '">Voir ces lieux sur la carte</a>' : '') + '</p></div></div>';
}
/* Forme « hub » : items = [{id, name, cat, catLabel, thumb (HTML), url, places:[ids], status, linkedText, noneText, mapTitle, pronoun}],
   places = [{id, name, where, group}] (tous les lieux repérés), cats = [[id, libellé]]. */
function hub(o) {
  const prefix = o.prefix || '', byId = Object.fromEntries(o.places.map(p => [p.id, p])), first = o.items.find(x => x.id === o.initial) || o.items[0];
  const list = o.items.map(it => '<li><button type="button" class="lk-loc-item" data-loc-id="' + esc(it.id) + '" data-loc-cat="' + esc(it.cat) + '" data-loc-q="' + esc(fold(it.name + ' ' + it.catLabel + ' ' + (it.search || ''))) + '" data-loc-places="' + esc(it.places.join(',')) + '" data-loc-url="' + esc(prefix + it.url) + '" data-loc-catlabel="' + esc(it.catLabel) + '" data-loc-status="' + esc(it.status || EMPTY) + '" data-loc-linked="' + esc(it.linkedText) + '" data-loc-none="' + esc(it.noneText) + '" data-loc-title="' + esc(it.mapTitle) + '" data-loc-where="' + esc(it.pronoun === 'la' ? 'Où la trouver :' : 'Où le trouver :') + '" aria-pressed="' + (it === first ? 'true' : 'false') + '"><span class="lk-loc-thumb">' + it.thumb + '</span><span class="lk-loc-txt"><b>' + esc(it.name) + '</b><small>' + esc(it.catLabel) + '</small></span></button></li>').join('');
  const chips = '<div class="lk-loc-cats" role="group" aria-label="' + esc(o.catsLabel || 'Catégories') + '"><button type="button" class="lk-loc-chip" data-loc-catf="" aria-pressed="true">Toutes</button>' + o.cats.map(([id, l]) => '<button type="button" class="lk-loc-chip" data-loc-catf="' + esc(id) + '" aria-pressed="false">' + esc(l) + '</button>').join('') + '</div>';
  return '<div class="lk-loc lk-loc--hub" data-lk-loc="' + esc(o.kind) + '" data-loc-prefix="' + esc(prefix) + '">'
    + '<div class="lk-loc-pick"><div class="lk-loc-tools"><label class="lk-loc-search"><span class="sr-only">' + esc(o.searchLabel) + '</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="21" y2="21"/></svg><input type="search" data-loc-q placeholder="' + esc(o.searchLabel) + '" autocomplete="off"></label>' + chips + '<p class="lk-loc-count" role="status" aria-live="polite" data-loc-count>' + o.items.length + ' ' + esc(o.noun) + '</p></div>'
    + '<ul class="lk-loc-list" data-loc-list aria-label="' + esc(o.listLabel) + '">' + list + '</ul><p class="lk-loc-empty" data-loc-empty hidden>Aucun résultat. <button type="button" class="lk-loc-reset" data-loc-reset>Tout afficher</button></p></div>'
    + '<div class="lk-loc-view"><figure class="lk-loc-map">' + mapSvg(o.places, { label: o.mapLabel, prefix }) + '<figcaption><span class="lk-loc-key lk-loc-key--on"></span> Lieu lié à la sélection <span class="lk-loc-key"></span> Autre lieu repéré. ' + esc(o.caption) + '</figcaption></figure>'
    + '<div class="lk-loc-sum" data-loc-sum aria-live="polite">' + summary(first, byId, prefix) + '</div></div></div>';
}
/* Forme « fiche » : un seul objet, sans script. */
function single(o) {
  const prefix = o.prefix || '', linked = o.item.places.map(id => o.places.find(p => p.id === id)).filter(Boolean);
  /* v7.86 (référencement) : forme courte des fiches véhicules et armes — la carte et ses repères, la légende et un lien vers
     ces lieux sur la carte interactive ; ni résumé ni liste des lieux, identiques sur toutes les fiches d’une catégorie (ils
     restent sur les pages de section, dans le sélecteur des hubs). L’emplacement de l’objet est dit dans « Ce qui arrive avec le jeu ». */
  /* v8.04 (lot H, Téva : « l’agencement est maladroit, les deux images ne sont pas centrées et font tache ») : la forme courte
     des fiches pose côte à côte la carte (repères numérotés) et sa légende : chaque lieu, son numéro, son nom, un lien vers
     lui ; puis la mise en garde (pas un point de vente confirmé) et le lien vers ces lieux sur la carte interactive. Pas de
     résumé : l’emplacement de l’objet est dit dans « Ce qui arrive avec le jeu ». La mise en garde quitte le dessous de la
     carte (aucune légende sous une image). Sans lieu lié : la carte vide et une phrase, avec un lien vers la carte. */
  if (o.compact) return '<div class="lk-loc lk-loc--single lk-loc--compact' + (linked.length ? '' : ' lk-loc--none') + '">'
    + '<figure class="lk-loc-map">' + (linked.length ? mapSvg(linked, { label: o.mapLabel, prefix, sea: true }) : emptyMap(prefix, { sea: true })) + '</figure>'
    + '<div class="lk-loc-legend"><h3 class="lk-loc-h">' + esc(o.placesTitle) + '</h3>'
    + (linked.length ? legendList(linked, prefix) + '<p class="lk-loc-legend-note">' + esc(o.caption) + '</p><p class="lk-loc-more"><a class="lk-loc-btn lk-loc-btn--main" href="' + pinsHref(prefix, linked.map(p => p.id), o.item.mapTitle) + '">Voir ces lieux sur la carte</a></p>'
      : '<p class="lk-loc-legend-note">Aucun lieu repéré pour cette catégorie : rien n’est placé au hasard.</p><p class="lk-loc-open"><a class="lk-loc-btn" href="' + prefix + 'carte.html">Ouvrir la carte de Leonida</a></p>')
    + '</div></div>';
  /* v8.04 (lot H) : forme complète (fiches du monde, activités) : la carte prend la hauteur de la colonne voisine (résumé et
     lieux), les lieux reçoivent leur vignette officielle quand elle existe et mènent à leur page ; le résumé ne répète plus
     la liste des lieux (la liste suit). La phrase sous la carte disait la même chose que l’introduction du bloc. */
  return '<div class="lk-loc lk-loc--single lk-loc--full">'
    + '<figure class="lk-loc-map">' + (linked.length ? mapSvg(linked, { label: o.mapLabel, prefix, sea: true }) : emptyMap(prefix, { sea: true })) + '</figure>'
    + '<div class="lk-loc-side"><div class="lk-loc-sum">' + summary(o.item, Object.fromEntries(o.places.map(p => [p.id, p])), prefix, { self: true, noNote: linked.length > 0 }) + '</div>'
    + (linked.length ? '<h3 class="lk-loc-h">' + esc(o.placesTitle) + '</h3>' + placeList(linked, prefix) : '') + '</div></div>';
}
/* ---------- Données : objets et lieux liés (mêmes règles pour le hub, les fiches et les carnets) ---------- */
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = path.resolve(__dirname, '..');
let dataCache = null;
function data() {
  if (dataCache) return dataCache;
  const c = { window: {} }; vm.createContext(c);
  for (const f of ['vehicules-data.js', 'armes-data.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), c);
  const H = JSON.parse(fs.readFileSync(path.join(root, 'outils/hubs-editoriaux.json'), 'utf8'));
  const places = kind => H[kind].carte.groups.flatMap(g => g.items.map(x => ({ id: x.id, name: x.name, where: x.where || null, group: g.title || null })));
  dataCache = { V: c.window.LK_VEHICULES, VC: c.window.LK_VEHICULES_CATS, A: c.window.LK_ARMES, AC: c.window.LK_ARMES_CATS, placesV: places('vehicules'), placesA: places('armes') };
  for (const p of [...dataCache.placesV, ...dataCache.placesA]) carte.point(p.id); // lieu absent de la carte : erreur de génération
  return dataCache;
}
/* Lieux liés à une catégorie de véhicule : concessions et ateliers pour ce qui roule, circuit pour les véhicules de
   course, marinas pour les bateaux, aérodromes pour ce qui vole ; aucun pour les véhicules de service. Ce sont des
   lieux de la carte liés au type de véhicule, pas des points de vente confirmés. */
const VEH_LINK = { road: ['g-L1610', 'g-L1594', 'g-L1599', 'g-L702', 'g-L2375', 'g-L1381', 'g-L348'], race: ['g-L590'], sea: ['g-L120', 'g-L328', 'g-L326'], air: ['autograph-flight', 'g-L1562'] };
function vehicleLinks(v) {
  if (v.cat === 'bateau') return VEH_LINK.sea.slice();
  if (v.cat === 'avion' || v.cat === 'helicoptere') return VEH_LINK.air.slice();
  if (v.cat === 'service') return [];
  return VEH_LINK.road.concat(['sport', 'supercar', 'muscle', 'moto'].includes(v.cat) ? VEH_LINK.race : []);
}
const EDITION = { 'Ultimate Edition': 'l’édition Ultimate', 'Pre-Order': 'la précommande' };
function vehicleItem(v, prefix) {
  /* v7.53 : une vignette doit montrer le véhicule. Une photo de scène (Jason et Lucia, une région, un salon de tatouage…)
     où il n’est qu’un détail laisse la place à son schéma : photo gardée seulement si son nom de fichier désigne le
     véhicule (un mot de son identifiant) ou un plan de véhicules des trailers. */
  const d = data(), catLabel = d.VC[v.cat] || v.cat, file = String(v.thumb || '').split('/').pop(),
    words = v.id.split('-').filter(w => w.length >= 4),
    photo = /\/officiel\//.test(v.thumb || '') && (words.some(w => file.includes(w)) || /vehicles?-\d/.test(file));
  const src = photo ? v.thumb : '/img/schemas/' + v.id + '.svg';
  const thumb = '<img src="' + esc(prefix + String(src).replace(/^\//, '')) + '" width="' + (photo ? 480 : 240) + '" height="' + (photo ? 270 : 120) + '" alt="" loading="lazy" decoding="async"' + (photo ? '' : ' class="is-schema"') + '>';
  return { id: v.id, name: v.nom, cat: v.cat, catLabel, thumb, url: 'vehicules/' + v.id + '.html', places: vehicleLinks(v), search: (v.marque || '') + ' ' + (v.search || ''), pronoun: 'le',
    status: v.edition && EDITION[v.edition] ? 'offert avec ' + EDITION[v.edition] + ' ; ' + EMPTY.toLowerCase() + ' dans le jeu' : EMPTY,
    linkedText: 'Lieux liés aux ' + catLabel.toLowerCase() + ' sur notre carte (pas un emplacement confirmé pour ce véhicule) :',
    noneText: v.cat === 'service' ? 'Véhicule de service : aucun lieu d’achat repéré, et rien ne dit qu’il s’achète.' : 'Aucun lieu repéré pour cette catégorie.',
    mapTitle: v.nom + ' : lieux liés' };
}
function weaponItem(a, prefix, schema) {
  const d = data(), catLabel = d.AC[a.cat] || a.cat;
  return { id: a.id, name: a.nom, cat: a.cat, catLabel, thumb: '<span class="lk-loc-schema">' + schema(a.id, 44) + '</span>', url: 'armes/' + a.id + '.html', places: d.placesA.map(p => p.id), search: (a.fr || '') + ' ' + (a.insp || ''), pronoun: 'la',
    status: a.ue ? EMPTY + ' (une version est offerte avec l’édition Ultimate)' : EMPTY,
    linkedText: 'Armureries repérées sur notre carte (pas un point de vente confirmé pour cette arme) :',
    noneText: 'Aucune armurerie repérée.', mapTitle: a.nom + ' : armureries repérées' };
}
/* v7.55 : le fond des fiches est la référence commune (outils/carte-reference.cjs) ; writeReference() l'écrit depuis
   carte.html avant de générer les pages. L'ancien sprite de silhouette (img/leonida-silhouette.svg) n'est plus lu. */
const REFERENCE = REF.FILE;
function writeReference() { return REF.write(); }
module.exports = { writeReference, REFERENCE, hub, single, mapSvg, emptyMap, summary, EMPTY, fold, data, vehicleItem, weaponItem, vehicleLinks, VEH_LINK, placeHref };
