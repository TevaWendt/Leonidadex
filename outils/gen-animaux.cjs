#!/usr/bin/env node
'use strict';
/* Section « Animaux » (section animaux). La page animaux.html et les fiches animaux/<id>.html sont construites par la
   mécanique des hubs du monde : outils/lore-gen.js (grille, fiches, « En lien » des régions) et outils/hubs-monde.cjs
   (zone éditoriale), à partir de outils/editorial-animaux.json. Ce script, appelé par outils/regenerer.cjs juste après
   lore-gen.js :
   - contrôle les données (statuts, sources connues et datées, visuels, recadrages, régions, véhicules) ;
   - ajoute à chaque fiche ce que le gabarit commun n’a pas : la feuille animaux.css, les gros plans (recadrages de captures
     officielles, img/animaux/, crédit et source) et le bloc « Statut et sources » (entre deux marqueurs, refait à chaque
     passage) ;
   - rend à outils/gen-leo.cjs les fiches (morceau « monde ») et les questions de la section (morceau leo/animaux.json).
   v7.69 (Téva, 06/10/2026 : « la section animaux n’est pas très belle, ça manque d’animation ») : la page animaux.html
   reçoit, à la place de la grille commune, « La faune en chiffres » (nombres annoncés par Rockstar, qui défilent à
   l’apparition), une mosaïque des fiches avec un filtre par famille (boutons radio, sans script ; transition de vue quand
   le navigateur la connaît) et « Où les croiser » (les régions reliées aux fiches) ; chaque fiche reçoit une carte
   d’identité (famille, statut, régions, visuels, sources, tampon du statut) et un gros plan en grand, avec la capture
   d’origine à ouvrir dans la visionneuse. Mêmes données, rien d’inventé.
   Usage : node outils/gen-animaux.cjs */
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const ROOT = path.resolve(__dirname, '..');
const S = require('./sections.cjs');
const esc = S.esc;
const HUB = 'animaux', DATA_FILE = 'outils/editorial-animaux.json';
const ST = ['officiel', 'vu', 'comm', 'conf'];
const START = '<!-- section animaux:start -->', END = '<!-- section animaux:end -->';
const L = require('./lk-sections.cjs');
const HUB_START = '<!-- section animaux:hub:start -->', HUB_END = '<!-- section animaux:hub:end -->';
const ID_START = '<!-- section animaux:id:start -->', ID_END = '<!-- section animaux:id:end -->';
/* v7.69 : familles du filtre de animaux.html et pictogrammes (animaux.css donne à chacune sa couleur, .an-fam-<id>) */
const FAMILIES = [
  { id: 'reptiles', label: 'Reptiles', kinds: ['Reptile'], icon: '<path d="M3.5 8.5c2.2-2.6 4.8-2.6 7 0 2.2-2.6 4.8-2.6 7 0 1.1-1.3 2.1-1.8 3-1.8"/><path d="M3.5 14c2.2-2.6 4.8-2.6 7 0 2.2-2.6 4.8-2.6 7 0 1.1-1.3 2.1-1.8 3-1.8"/><path d="M7 19.5c1.8-2.1 3.7-2.1 5.5 0 1.8-2.1 3.7-2.1 5.5 0"/>' },
  { id: 'mammiferes', label: 'Mammifères', kinds: ['Mammifère', 'Mammifères'], icon: '<circle cx="6.6" cy="9.6" r="1.9"/><circle cx="10.4" cy="5.9" r="1.9"/><circle cx="15.1" cy="6.2" r="1.9"/><circle cx="18.4" cy="10.2" r="1.9"/><path d="M8.2 17.4c0-3.1 2.1-5.6 4.6-5.6s4.9 2.4 4.5 5c-.3 2.1-2.2 2.7-4.2 2.2-2.3-.6-4.9 1.5-4.9-1.6z"/>' },
  { id: 'oiseaux', label: 'Oiseaux', kinds: ['Oiseaux'], icon: '<path d="M2.5 12.5c2.6-3.6 6.2-3.9 9.5-.4 3.3-3.5 6.9-3.2 9.5.4"/><path d="M8 17.5c1.3-1.6 2.7-1.7 4-.2 1.3-1.5 2.7-1.4 4 .2"/>' },
  { id: 'marins', label: 'Faune marine', kinds: ['Animaux marins'], icon: '<path d="M2.5 12c3.1-4.6 9.4-5.6 14.4 0-5 5.6-11.3 4.6-14.4 0z"/><path d="M16.9 12l4.6-3.4v6.8z"/><circle cx="7.6" cy="11" r=".9" fill="currentColor" stroke="none"/>' },
  { id: 'domestiques', label: 'Animaux domestiques', kinds: ['Animal domestique'], icon: '<path d="M9 15l6-6"/><circle cx="6.4" cy="15.2" r="2.1"/><circle cx="8.8" cy="17.6" r="2.1"/><circle cx="15.2" cy="6.4" r="2.1"/><circle cx="17.6" cy="8.8" r="2.1"/>' }
];
const famOf = kind => FAMILIES.find(f => f.kinds.includes(kind));
const famIcon = f => '<svg class="an-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + f.icon + '</svg>';
const STATUT_PHRASE = { officiel: 'Nommé ou décrit par Rockstar : voir les sources ci-dessous.', vu: 'Vu sur des images ou des vidéos officielles, sans nom d’espèce donné par Rockstar.', comm: 'Identification des joueurs, non confirmée par Rockstar.', conf: 'À confirmer.' };

function load(root = ROOT) {
  const read = f => fs.readFileSync(path.join(root, f), 'utf8');
  const A = JSON.parse(read(DATA_FILE)), HB = JSON.parse(read('outils/editorial-hubs.json'));
  return { A, SRC: { ...HB.sources, ...A.sources }, OLD: HB.sources, MED: JSON.parse(read('outils/medias-officiels.json')), ED: JSON.parse(read('outils/editorial.json')), read };
}

/* ---------- contrôles : une donnée mal formée arrête la génération ---------- */
function check(ctx, root = ROOT) {
  const { A, SRC, OLD, MED, ED } = ctx, err = [], ids = new Set();
  for (const [id, s] of Object.entries(A.sources)) {
    if (OLD[id]) err.push('source ' + id + ' : déjà définie dans editorial-hubs.json, à ne pas redéfinir');
    if (!/^https:\/\//.test(s.url)) err.push('source ' + id + ' : adresse https attendue');
    if (!s.title || !s.claim) err.push('source ' + id + ' : titre ou résumé manquant');
    if (s.consultedAt !== '2026-10-04') err.push('source ' + id + ' : date de consultation attendue 2026-10-04');
    if (s.publishedAt !== null && !/^\d{4}-\d\d-\d\d$/.test(s.publishedAt || '')) err.push('source ' + id + ' : date de publication AAAA-MM-JJ ou null');
    if (!ST.includes(s.statut)) err.push('source ' + id + ' : statut inconnu');
    if (/leak|fuite/i.test(s.url + s.title)) err.push('source ' + id + ' : aucune fuite');
  }
  const c = { window: {} }; vm.runInNewContext(fs.readFileSync(path.join(root, 'vehicules-data.js'), 'utf8'), c);
  const veh = new Set(c.window.LK_VEHICULES.map(v => v.id)), regions = new Set(ED.regions.map(r => r.id));
  for (const x of A.fiches) {
    const L = 'fiche ' + (x.id || '?');
    if (!/^[a-z0-9][a-z0-9-]*$/.test(x.id || '')) { err.push(L + ' : identifiant invalide'); continue; }
    if (ids.has(x.id)) err.push(L + ' : en double'); ids.add(x.id);
    for (const k of ['name', 'kind', 'tagline', 'description', 'texte', 'contexte', 'pratique', 'imageAlt']) if (!x[k]) err.push(L + ' : champ manquant ' + k);
    if ((x.description || '').length > 160) err.push(L + ' : description de plus de 160 signes (' + x.description.length + ')');
    if (!['m', 'f', 'mp', 'fp'].includes(x.accord)) err.push(L + ' : accord m, f, mp ou fp');
    if (!ST.includes(x.statut)) err.push(L + ' : statut inconnu');
    if (!(x.sources || []).length) err.push(L + ' : aucune source');
    for (const s of x.sources || []) { if (!SRC[s]) err.push(L + ' : source inconnue ' + s); if (!A.hub.sources.includes(s)) err.push(L + ' : source absente de la liste de animaux.html : ' + s); }
    if (x.statut === 'officiel' && !(x.sources || []).some(s => SRC[s] && SRC[s].statut === 'officiel')) err.push(L + ' : statut officiel sans source officielle');
    if (!(x.media || []).length) err.push(L + ' : aucun visuel officiel');
    for (const id of x.media || []) if (!MED[id]) err.push(L + ' : visuel inconnu ' + id);
    for (const id of x.places || []) if (!regions.has(id)) err.push(L + ' : région inconnue ' + id);
    for (const id of x.vehicles || []) if (!veh.has(id)) err.push(L + ' : véhicule inconnu ' + id);
    /* « En lien » : une fiche d’animal ne se rattache qu’aux régions (le groupe « Animaux » n’apparaît que sur les fiches lieux) */
    for (const k of ['characters', 'businesses', 'residences', 'hideouts']) if ((x[k] || []).length) err.push(L + ' : seules les régions (places) sont reliées, pas ' + k);
    for (const z of x.zoom || []) {
      if (!/^\/img\/animaux\/[a-z0-9-]+\.webp$/.test(z.src || '') || !fs.existsSync(path.join(root, z.src.slice(1)))) err.push(L + ' : recadrage introuvable ' + z.src);
      if (!z.w || !z.h || !z.alt || !z.legende || !MED[z.media]) err.push(L + ' : recadrage sans dimensions, texte, légende ou capture d’origine');
    }
  }
  for (const x of A.fiches) if (!famOf(x.kind)) err.push('fiche ' + x.id + ' : famille inconnue pour « ' + x.kind + ' » (FAMILIES de outils/gen-animaux.cjs et animaux.css)');
  const H = A.hub;
  for (const id of H.sources) if (!SRC[id]) err.push('animaux.html : source inconnue ' + id);
  /* v7.69 : chiffres de la page, chacun repris d’une source de la page ; textes de la mosaïque et des régions */
  const C = H.chiffres || {};
  if (!C.titre || !C.texte || !C.site || !(C.items || []).length) err.push('animaux.html : bloc « chiffres » incomplet');
  if (!H.sources.includes(C.source) || !SRC[C.source]) err.push('animaux.html : source des chiffres absente de la liste : ' + C.source);
  for (const it of C.items || []) { if (!/^\d+\+?$/.test(it.n || '') || !it.t) err.push('animaux.html : chiffre mal formé ' + JSON.stringify(it)); else if (SRC[C.source] && !SRC[C.source].claim.includes(it.n.replace('+', ''))) err.push('animaux.html : ' + it.n + ' absent du résumé de la source ' + C.source); }
  for (const k of ['grille', 'regions']) if (!H[k] || !H[k].titre || !H[k].texte) err.push('animaux.html : bloc « ' + k + ' » incomplet');
  for (const id of Object.keys(A.sources)) if (!H.sources.includes(id)) err.push('source jamais listée sur animaux.html : ' + id);
  for (const f of H.faq) if (f.leo && !f.k) err.push('FAQ sans mots-clés : ' + f.q);
  if (A.section.desc.length > 160) err.push('description du hub trop longue');
  if (err.length) throw new Error('Section animaux, données à corriger (' + DATA_FILE + ') :\n- ' + err.join('\n- '));
}

/* ---------- ajouts aux fiches générées par lore-gen.js ---------- */
function sourceList(SRC, ids) {
  return S.sourceList(ids.map(id => ({ id, ...SRC[id] })));
}
function block(ctx, x) {
  const { SRC, MED } = ctx;
  /* v7.69 : le gros plan en grand, la capture d’origine en vignette à côté (les deux s’ouvrent dans la visionneuse du site) ;
     vignette de 92 px : srcset et sizes posés ici, pour que le navigateur ne charge que la petite variante (et que sync-site n’y touche plus) */
  const zoom = (x.zoom || []).length ? '<section class="shell animaux-zoom reveal" aria-labelledby="animaux-zoom-t"><h2 class="sec-h" id="animaux-zoom-t">Gros plan</h2><div class="animaux-zoom-grid">'
    + x.zoom.map(z => { const m = MED[z.media], big = m.variants[m.variants.length - 1], small = m.variants[0];
      return '<figure class="animaux-zoom-fig rise"><a class="animaux-zoom-crop" href="' + esc(z.src) + '" aria-label="Agrandir : ' + esc(z.alt) + '"><img src="' + esc(z.src) + '" width="' + z.w + '" height="' + z.h + '" alt="' + esc(z.alt) + '" loading="lazy" decoding="async"><span class="animaux-zoom-lens" aria-hidden="true"></span></a>'
        + '<figcaption><span class="animaux-zoom-k">Recadrage</span><b>' + esc(z.legende) + '</b><span>Recadrage de la capture officielle « ' + esc(m.titre) + ' » · ' + esc(m.credit) + ' · <a href="' + esc(m.source) + '" target="_blank" rel="noopener nofollow">Galerie officielle</a></span>'
        + '<a class="animaux-zoom-orig" href="' + esc(big.src) + '" aria-label="Agrandir la capture d’origine : ' + esc(m.titre) + '"><img src="' + esc(small.src) + '" srcset="' + esc(small.src) + ' ' + small.w + 'w" sizes="92px" width="' + small.w + '" height="' + small.h + '" alt="" loading="lazy" decoding="async"><span>Capture d’origine</span></a></figcaption></figure>'; }).join('')
    + '</div></section>' : '';
  const src = '<section class="shell animaux-fiche-src reveal" aria-labelledby="animaux-src-t"><h2 class="sec-h" id="animaux-src-t">Statut et sources</h2><p class="animaux-statut">' + S.pip(x.statut, true) + '<span>' + esc(STATUT_PHRASE[x.statut]) + '</span></p>' + sourceList(SRC, x.sources) + '</section>';
  return START + zoom + src + END;
}
/* v7.69 : carte d’identité de la fiche, juste sous l’en-tête (famille, statut, régions, visuels, sources ; tampon du statut) */
function idCard(ctx, x) {
  const { ED } = ctx, f = famOf(x.kind), regions = new Map(ED.regions.map(r => [r.id, r]));
  const places = (x.places || []).map(id => regions.get(id)).filter(Boolean);
  return ID_START + '<section class="shell an-id an-fam-' + f.id + ' reveal" aria-labelledby="an-id-t"><div class="an-id-card"><span class="an-id-badge" aria-hidden="true">' + famIcon(f) + '</span>'
    + '<div class="an-id-main"><h2 class="an-id-h" id="an-id-t">Carte d’identité</h2><dl class="an-id-list">'
    + '<div><dt>Famille</dt><dd>' + esc(x.kind) + '</dd></div>'
    + '<div><dt>Statut</dt><dd>' + S.pip(x.statut, true) + '</dd></div>'
    + (places.length ? '<div><dt>Régions</dt><dd>' + places.map(r => '<a href="../lieux/' + esc(r.id) + '.html">' + esc(r.name) + '</a>').join('<span aria-hidden="true"> · </span>') + '</dd></div>' : '')
    + '<div><dt>Visuels officiels</dt><dd>' + (x.media || []).length + '</dd></div>'
    + '<div><dt>Sources datées</dt><dd><a href="#animaux-src-t">' + (x.sources || []).length + '</a></dd></div>'
    + '</dl></div><span class="an-id-stamp an-id-stamp--' + esc(x.statut) + '" aria-hidden="true">' + esc(S.STATUS_LABEL[x.statut]) + '</span></div></section>' + ID_END;
}

/* v7.69 : page animaux.html — chiffres, mosaïque des fiches avec filtre par famille, régions */
function hubHtml(ctx) {
  const { A, MED, ED } = ctx, F = A.fiches, H = A.hub, C = H.chiffres, G = H.grille, R = H.regions;
  const regions = new Map(ED.regions.map(r => [r.id, r]));
  const chiffres = '<section class="an-chiffres reveal" aria-labelledby="an-chiffres-t"><div class="shell an-chiffres-in"><div class="an-chiffres-copy"><p class="an-k">' + esc(C.kicker) + '</p><h2 id="an-chiffres-t">' + esc(C.titre) + '</h2><p>' + esc(C.texte) + ' <a href="#src-' + esc(C.source) + '">Voir la source</a></p></div><ul class="an-chiffres-list">'
    + [...C.items, { n: String(F.length), t: C.site }].map((it, i) => '<li style="--i:' + i + '"><b data-lk-count>' + esc(it.n) + '</b><span>' + esc(it.t) + '</span></li>').join('') + '</ul></div></section>';
  const fams = FAMILIES.map(f => ({ f, n: F.filter(x => famOf(x.kind) === f).length })).filter(x => x.n);
  const filter = '<fieldset class="an-filter" data-lk-vt><legend class="sr-only">Filtrer les fiches par famille</legend>'
    + '<input type="radio" name="an-fam" id="an-fam-tout" value="tout" checked><label for="an-fam-tout">Toutes <span class="an-n">' + F.length + '</span></label>'
    + fams.map(({ f, n }) => '<input type="radio" name="an-fam" id="an-fam-' + f.id + '" value="' + f.id + '"><label class="an-fam-' + f.id + '" for="an-fam-' + f.id + '">' + famIcon(f) + esc(f.label) + ' <span class="an-n">' + n + '</span></label>').join('') + '</fieldset>';
  /* mosaïque : la première fiche en grand (2 × 2), quatre petites, puis des larges par deux (la dernière seule prend toute la ligne) */
  const rest = Math.max(0, F.length - 5);
  const size = i => i === 0 ? ' an-card--big' : i < 5 ? '' : (rest % 2 && i === F.length - 1 ? ' an-card--full' : ' an-card--wide');
  const card = (x, i) => { const f = famOf(x.kind), places = (x.places || []).map(id => regions.get(id)).filter(Boolean);
    return '<a class="an-card an-fam-' + f.id + size(i) + '" data-fam="' + f.id + '" href="animaux/' + esc(x.id) + '.html" style="view-transition-name:an-' + esc(x.id) + '">'
      + '<span class="an-card-media">' + L.img(MED, x.media[0], x.imageAlt, { sizes: i === 0 ? '(max-width:980px) 100vw, 640px' : '(max-width:560px) 100vw, (max-width:980px) 50vw, 340px', big: i === 0 }) + '</span>'
      + '<span class="an-card-top"><span class="an-fam">' + famIcon(f) + esc(x.kind) + '</span>' + S.pip(x.statut, true) + '</span>'
      + '<span class="an-card-body"><strong class="an-card-name">' + esc(x.name) + '</strong><span class="an-card-tag">' + esc(x.tagline) + '</span>'
      + (places.length ? '<span class="an-card-where">' + places.map(r => '<span>' + L.ICO.pin + esc(r.name) + '</span>').join('') + '</span>' : '')
      + '<span class="an-card-go">Voir la fiche</span></span></a>'; };
  const grid = '<section class="shell an-fiches" id="fiches" aria-labelledby="an-fiches-t"><div class="an-head"><p class="an-k">' + esc(G.kicker) + '</p><h2 class="sec-h" id="an-fiches-t">' + esc(G.titre) + '</h2><p class="an-sub">' + esc(G.texte) + '</p></div>'
    + filter + '<div class="an-grid">' + F.map(card).join('') + '</div></section>';
  const byRegion = ED.regions.map(r => ({ r, list: F.filter(x => (x.places || []).includes(r.id)) })).filter(x => x.list.length).sort((a, b) => b.list.length - a.list.length);
  const where = '<section class="shell an-regions reveal" aria-labelledby="an-regions-t"><div class="an-head"><p class="an-k">' + esc(R.kicker) + '</p><h2 class="sec-h" id="an-regions-t">' + esc(R.titre) + '</h2><p class="an-sub">' + esc(R.texte) + '</p></div><div class="an-regions-grid">'
    + byRegion.map(({ r, list }) => '<article class="an-region"><a class="an-region-media" href="lieux/' + esc(r.id) + '.html">' + L.img(MED, r.media[0], '', { sizes: '(max-width:560px) 100vw, (max-width:980px) 50vw, 320px' }) + '<span class="an-region-name">' + esc(r.name) + '</span></a>'
      + '<ul class="an-region-list">' + list.map(x => { const f = famOf(x.kind); return '<li><a class="an-fam-' + f.id + '" href="animaux/' + esc(x.id) + '.html">' + famIcon(f) + esc(x.name) + '</a></li>'; }).join('') + '</ul>'
      + '<a class="an-region-map" href="carte.html#lieu=' + esc(r.mapId || r.id) + '">' + L.ICO.map + 'Voir sur la carte</a></article>').join('') + '</div></section>';
  return HUB_START + chiffres + grid + where + HUB_END;
}
function enrichHub(ctx, root = ROOT) {
  const f = path.join(root, HUB + '.html');
  let html = fs.readFileSync(f, 'utf8');
  const i = html.indexOf(HUB_START), j = html.indexOf(HUB_END);
  if (i >= 0 && j > i) html = html.slice(0, i) + hubHtml(ctx) + html.slice(j + HUB_END.length);
  else {
    const at = html.indexOf('<section class="shell" id="fiches">');
    if (at < 0) throw new Error(HUB + '.html : grille des fiches introuvable (lancer outils/lore-gen.js d’abord)');
    const close = html.indexOf('</section>', at) + '</section>'.length;
    html = html.slice(0, at) + hubHtml(ctx) + html.slice(close);
  }
  if (!/href="animaux\.css(?:\?v=[a-f0-9]+)?"/.test(html)) html = html.replace(/(<link rel="stylesheet" href="acquisitions\.css(?:\?v=[a-f0-9]+)?">)/, '$1\n<link rel="stylesheet" href="animaux.css">');
  if (!/href="animaux\.css(?:\?v=[a-f0-9]+)?"/.test(html)) throw new Error(HUB + '.html : feuille animaux.css impossible à placer');
  fs.writeFileSync(f, html);
}

function enrich(ctx, root = ROOT) {
  let n = 0;
  for (const x of ctx.A.fiches) {
    const f = path.join(root, HUB, x.id + '.html');
    if (!fs.existsSync(f)) throw new Error('Fiche absente (lancer outils/lore-gen.js d’abord) : ' + HUB + '/' + x.id + '.html');
    let html = fs.readFileSync(f, 'utf8');
    const i = html.indexOf(START), j = html.indexOf(END);
    if (i >= 0 && j > i) html = html.slice(0, i) + html.slice(j + END.length);
    const a = html.indexOf(ID_START), b = html.indexOf(ID_END);
    if (a >= 0 && b > a) html = html.slice(0, a) + html.slice(b + ID_END.length);
    const head = html.indexOf('<section class="page-head shell">');
    if (head < 0) throw new Error(HUB + '/' + x.id + '.html : en-tête de fiche introuvable');
    const headEnd = html.indexOf('</section>', head) + '</section>'.length;
    html = html.slice(0, headEnd) + '\n' + idCard(ctx, x) + html.slice(headEnd);
    const at = html.indexOf('<section class="shell lore-body">');
    if (at < 0) throw new Error(HUB + '/' + x.id + '.html : corps de fiche introuvable');
    const close = html.indexOf('</section>', at) + '</section>'.length;
    html = html.slice(0, close) + '\n' + block(ctx, x) + html.slice(close);
    /* la feuille de la section, après celle des fiches (son lien porte déjà son empreinte ?v= quand lore-gen.js a synchronisé) */
    if (!/href="\.\.\/animaux\.css(?:\?v=[a-f0-9]+)?"/.test(html)) html = html.replace(/(<link rel="stylesheet" href="\.\.\/acquisitions\.css(?:\?v=[a-f0-9]+)?">)/, '$1\n<link rel="stylesheet" href="../animaux.css">');
    if (!/href="\.\.\/animaux\.css(?:\?v=[a-f0-9]+)?"/.test(html)) throw new Error(HUB + '/' + x.id + '.html : feuille animaux.css impossible à placer');
    fs.writeFileSync(f, html); n++;
  }
  return n;
}

/* ---------- Léo : fiches (morceau « monde ») et questions de la section (morceau leo/animaux.json) ---------- */
function leo(root = ROOT) {
  const { A, SRC, MED } = load(root);
  const image = ids => (ids || []).flatMap(id => (MED[id] && MED[id].variants) || []).map(v => v.src).find(src => fs.existsSync(path.join(root, src.slice(1)))) || null;
  const verifiedAt = '2026-10-04';
  const fiches = A.fiches.map(x => ({ key: 'animal:' + x.id, id: x.id, kind: 'animal', shard: 'monde', name: x.name, aliases: x.aliases || [], category: A.section.label + ' · ' + x.kind, url: '/' + HUB + '/' + x.id + '.html', image: image(x.media), calcId: null, price: null, proof: { officiel: 'Nommé ou décrit par Rockstar ; sources datées sur la fiche.', vu: 'Vu sur les images officielles, sans nom d’espèce donné par Rockstar.', comm: 'Identification des joueurs, non confirmée par Rockstar.', conf: 'À confirmer.' }[x.statut], source: x.source || (SRC[x.sources[0]] || {}).url || null, verifiedAt, description: x.description, tagline: x.tagline || null, related: { places: x.places || [] } }));
  const topics = A.hub.faq.filter(x => !x.leo).map((x, i) => ({ id: 'animaux-faq-' + (i + 1), q: x.q, f: [x.q, ...(x.f || [])], k: x.k, text: x.a, status: 'Réponse de la FAQ « ' + A.section.label + ' », sources en bas de la page', links: [{ label: 'La FAQ et ses sources', url: '/' + HUB + '.html#faq' }], verifiedAt, min: Number.isInteger(x.min) ? x.min : 2 }));
  return { fiches, topics, suggestions: { animaux: A.leo.suggestions }, inputs: [DATA_FILE] };
}

/* ---------- génération ---------- */
function generate(root = ROOT) {
  const ctx = load(root);
  check(ctx, root);
  const n = enrich(ctx, root);
  enrichHub(ctx, root);
  console.log('animaux : ' + n + ' fiche(s) complétée(s) (statut, sources, ' + ctx.A.fiches.reduce((k, x) => k + (x.zoom || []).length, 0) + ' gros plans), ' + ctx.A.hub.faq.length + ' questions, ' + ctx.A.hub.sources.length + ' sources');
}

module.exports = { generate, check, load, leo, enrich, enrichHub, block, idCard, hubHtml, FAMILIES, famOf, DATA_FILE, START, END, HUB_START, HUB_END, ID_START, ID_END };
if (require.main === module) generate();
