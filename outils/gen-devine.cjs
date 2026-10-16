#!/usr/bin/env node
'use strict';
/* v7.90 (lot 6) : jeu « Devine le lieu » — devine-le-lieu.html (une capture officielle de GTA VI, six régions : le joueur
   devine où elle a été prise), depuis outils/devine/devine.json ; script devine.js, feuille devine.css.
   Règle « rien d’inventé » : seules entrent les captures dont la région est établie par Rockstar. Ses séries de captures
   officielles (outils/medias-officiels.json, page des captures de GTA VI) portent le nom de la région : identifiant
   (vice-city-01…), fichier d’origine (Vice_City_01…) et page source doivent tous dire la même région, sinon la génération
   s’arrête. Une image d’une de ces séries absente de la liste arrête aussi la génération (rien n’est écarté en silence).
   On devine une région, jamais un point précis : les repères de la carte sont ceux des six régions de la carte interactive
   (carte.js, outils/carte-vignette.cjs), le fond est celui du site (img/leonida-carte.svg, communautaire, dit comme tel).
   Le tirage du jour vit dans devine.js (fonctions pures LKDevine) : chargé ici dans Node, il est vérifié sur trois ans
   (cinq images différentes par jour, deux au plus d’une même région, aucune image deux jours de suite).
   Sorties : devine-le-lieu.html, outils/devine-index.json (recherche du site, lu par sync-site.cjs). Le bloc de la page
   Lieux (promo) et le lien des fiches de régions (lienFiche) sont posés par outils/lore-gen.js.
   v7.92 : devine.js est chargé juste après le jeu (async) : la partie du jour s’affiche sans attendre la lecture du reste
   de la page (cartes postales, règles, images, questions), plus longue depuis l’album. fetchpriority="high" : un script
   async part en priorité basse, derrière les feuilles et les images ; c’est lui qui pose l’image de la partie (le plus
   grand élément de l’écran), il passe donc devant.
   Usage : node outils/gen-devine.cjs   (appelé par outils/regenerer.cjs, après gen-actus.cjs) */
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const ROOT = path.resolve(__dirname, '..');
const S = require('./sections.cjs');
const LKX = require('./lk-sections.cjs');
const carte = require('./carte-vignette.cjs');
const { REGIONS } = require('./monde-cartes.cjs');
/* v7.92 : briques communes des pages enrichies (vitrine.css, vitrine.js) et dessins des règles */
const VT = require('./vitrine.cjs');
const VTX = JSON.parse(fs.readFileSync(path.join(__dirname, 'vitrine.json'), 'utf8'));
const IL = require('./devine-illus.cjs');
const esc = S.esc;
const SITE = 'https://www.leonidakit.com', PAGE = 'devine-le-lieu.html', DATA_FILE = 'outils/devine/devine.json';
const SCREENS = 'https://www.rockstargames.com/VI/media/screenshots';

function load(root = ROOT) {
  const read = f => fs.readFileSync(path.join(root, f), 'utf8');
  const D = JSON.parse(read(DATA_FILE)), MED = JSON.parse(read('outils/medias-officiels.json')), ED = JSON.parse(read('outils/editorial.json'));
  const ctx = {}; vm.runInNewContext(read('devine.js'), ctx);
  return { D, MED, ED, G: ctx.LKDevine, read, root };
}
/* régions du jeu, dans l’ordre des séries (du nord au sud, comme la carte dépliée de la page Lieux) */
function regionsOf(L) {
  return L.D.series.map(s => {
    const x = L.ED.regions.find(r => r.id === s.region), p = x ? carte.point(x.mapId || x.id) : null;
    return { ...s, id: s.region, name: x ? x.name : null, short: x ? x.name.replace(/ National Park$/, '') : null, tagline: x ? x.tagline : '', facts: x ? x.facts || [] : [], mapId: x ? (x.mapId || x.id) : null, c: (REGIONS[s.region] || {}).c, x: p ? p.x : null, y: p ? p.y : null, images: L.D.images.filter(i => i.region === s.region) };
  });
}
const pool = L => L.D.images.map(i => ({ id: i.id, r: i.region })).sort((a, b) => (a.id < b.id ? -1 : 1));

/* ---------- contrôles : une donnée douteuse arrête la génération ---------- */
function check(L, opts = {}) {
  const { D, MED, G, root } = L, err = [];
  const R = regionsOf(L);
  if (D.source.url !== SCREENS || !/^\d{4}-\d\d-\d\d$/.test(D.source.consultedAt || '') || D.source.statut !== 'officiel') err.push('source des images : la page officielle des captures, datée, statut officiel');
  if (!/^\d{4}-\d\d-\d\d$/.test(D.debut || '') || !Number.isInteger(D.parPartie) || D.parPartie < 3 || !Number.isInteger(D.parRegionMax) || D.parRegionMax < 1) err.push('debut, parPartie ou parRegionMax mal formés');
  if (D.cle !== 'lk_devine_v1' || G.KEY !== D.cle) err.push('clé de stockage : lk_devine_v1 dans les données et dans devine.js');
  const seen = new Set();
  for (const r of R) {
    if (!r.name || !r.c || r.x === null) err.push('région inconnue (outils/editorial.json, monde-cartes, carte) : ' + r.region);
    if (seen.has(r.region)) err.push('région en double : ' + r.region); seen.add(r.region);
    if (!/^[a-z0-9-]+-$/.test(r.prefixe) || !/^[A-Za-z_]+_$/.test(r.fichier)) err.push('série mal formée : ' + r.region);
    if (!r.images.length) err.push('région sans image : ' + r.region);
  }
  const names = R.flatMap(r => [r.name, r.short]).filter(Boolean).concat(['Leonida Keys', 'Keys', 'Vice', 'Gellhorn', 'Kalaga', 'Grassrivers', 'Ambrosia']);
  const ids = new Set();
  for (const im of D.images) {
    const where = 'image ' + im.id, s = R.find(r => r.region === im.region), m = MED[im.id];
    if (ids.has(im.id)) err.push(where + ' : en double'); ids.add(im.id);
    if (!s) { err.push(where + ' : région inconnue ' + im.region); continue; }
    if (!m) { err.push(where + ' : absente de outils/medias-officiels.json'); continue; }
    /* la région est établie par Rockstar : identifiant de la série, fichier d’origine et page source concordent */
    if (!im.id.startsWith(s.prefixe) || !/^\d{2}$/.test(im.id.slice(s.prefixe.length))) err.push(where + ' : identifiant hors de la série ' + s.prefixe);
    const file = (String(m.original || '').match(/\/media\/([^/?.]+)\./) || [])[1] || '';
    if (!file.startsWith(s.fichier) || file.slice(s.fichier.length) !== im.id.slice(s.prefixe.length)) err.push(where + ' : fichier d’origine « ' + file + ' » hors de la série ' + s.fichier);
    if (m.source !== SCREENS || im.source !== D.source.id) err.push(where + ' : source autre que la page des captures officielles');
    if (!/Rockstar Games/.test(m.credit || '')) err.push(where + ' : crédit Rockstar Games absent');
    for (const w of [480, 800, 1280]) if (!fs.existsSync(path.join(root, 'img/officiel', im.id + '-' + w + '.webp'))) err.push(where + ' : fichier ' + w + ' px absent');
    if (!im.alt || !/, capture officielle de GTA VI$/.test(im.alt) || im.alt.length > 200) err.push(where + ' : texte alternatif absent, trop long ou sans crédit');
    for (const n of names) if (new RegExp('\\b' + n + '\\b', 'i').test(im.alt)) err.push(where + ' : le texte alternatif donne la réponse (« ' + n + ' »)');
    if (!im.legende || im.legende.length > 60) err.push(where + ' : légende absente ou trop longue');
  }
  /* aucune image d’une série régionale ne reste dehors sans qu’on le sache */
  for (const r of R) for (const id of Object.keys(MED)) if (id.startsWith(r.prefixe) && /^\d{2}$/.test(id.slice(r.prefixe.length)) && !ids.has(id)) err.push('image ' + id + ' de la série ' + r.prefixe + ' absente du jeu : ajoute-la (alt, légende) ou écarte-la ici avec la raison');
  /* textes */
  const P = D.page;
  if (P.desc.length > 155) err.push('description trop longue (' + P.desc.length + ' signes)');
  if (!/GTA VI/.test(P.seoTitle)) err.push('titre de référencement sans « GTA VI » (le <title> l’écrit « GTA 6 », outils/langues.cjs, titleSeo)');
  const keys = Object.keys(D.msg);
  for (const k of ['dv-jour', 'dv-libre', 'dv-image', 'dv-points', 'dv-juste', 'dv-rate', 'dv-verdict-juste', 'dv-verdict-rate', 'dv-suivante', 'dv-voir', 'dv-fiche', 'dv-annonce', 'dv-annonce-libre', 'dv-fin', 'dv-deja', 'dv-jours-one', 'dv-jours-other', 'dv-sur', 'dv-partage-titre', 'dv-copie', 'dv-copie-ko', 'dv-partage-ok', 'dv-prochaine', 'dv-prochaine-min', 'dv-nouvelle', 'dv-libre-annonce', 'dv-sr-bonne', 'dv-sr-ta', 'dv-res-ta', 'dv-res-0', 'dv-res-1', 'dv-res-2', 'dv-res-3', 'dv-res-4', 'dv-res-5', 'dv-serie', 'dv-album', 'dv-album-reg', 'dv-album-new', 'dv-reussite', 'dv-cycle', 'dv-sem-score', 'dv-sem-vide']) if (!keys.includes(k)) err.push('message absent : ' + k);
  /* v7.92 : fiches des régions (ce que montrent les captures : deux faits de outils/editorial.json) */
  for (const r of R) { const f = (D.regions.faits || {})[r.region]; if (!Array.isArray(f) || !f.length || f.some(i => !Number.isInteger(i) || !r.facts[i])) err.push('regions.faits : deux faits de outils/editorial.json pour ' + r.region); }
  if (Math.floor(D.images.length / D.parPartie) < 2) err.push('cycle des images trop court');
  /* tirages : trois ans à partir du jour n° 1 */
  if (!err.length) {
    const PL = pool(L), byId = Object.fromEntries(PL.map(x => [x.id, x.r]));
    const start = G.dayIndex(D.debut), days = opts.days || 3 * 366;
    let prev = null;
    for (let d = -10; d < days; d++) {
      const iso = G.isoOfIndex(start + d), list = G.draw(PL, iso, { per: D.parPartie, ref: D.debut });
      if (list.length !== D.parPartie || new Set(list).size !== list.length) { err.push('tirage du ' + iso + ' : ' + list.length + ' images, doublon ou manque'); break; }
      const per = {}; for (const id of list) per[byId[id]] = (per[byId[id]] || 0) + 1;
      if (Math.max(...Object.values(per)) > D.parRegionMax) { err.push('tirage du ' + iso + ' : plus de ' + D.parRegionMax + ' images d’une même région'); break; }
      if (prev && list.some(id => prev.includes(id))) { err.push('tirage du ' + iso + ' : une image de la veille revient'); break; }
      prev = list;
    }
  }
  if (err.length) throw new Error('Données du jeu « Devine le lieu » (' + DATA_FILE + ') :\n- ' + err.join('\n- '));
  return R;
}

/* ---------- gabarit (en-tête, pied et scripts copiés d’a-propos.html, comme les autres sections) ---------- */
function chromeOf(s) {
  const pick = re => { const m = s.match(re); if (!m) throw new Error('gabarit introuvable : ' + re); return m[0]; };
  return { fav: pick(/<link rel="icon"[^>]*>/), header: pick(/<header>[\s\S]*?<\/header>/), footer: pick(/<footer>[\s\S]*?<\/footer>/),
    scripts: (s.match(/<script(?: type="lk\/lazy")? src="[^"]*"><\/script>/g) || []).filter(x => !/fiches\.js|vehicules-data\.js|armes-data\.js|lk-showcase\.js|carnets-core\.js/.test(x)).join('\n') };
}
const metaDesc = t => { t = String(t || '').replace(/\s+/g, ' ').trim(); return t.length <= 160 ? t : t.slice(0, 157).replace(/\s+\S*$/, '') + '…'; };
const bc = items => '<script type="application/ld+json">' + JSON.stringify({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it[0], item: SITE + it[1] })) }) + '</script>';
const v = (m, w) => m.variants.find(x => x.w === w) || null;

/* ---------- briques de la page ---------- */
const ICON_PIN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/></svg>';
function board(L, R) {
  const { D } = L, P = D.page;
  const opt = r => '<button type="button" class="dv-opt" data-dv-opt="' + esc(r.id) + '" style="--c:' + r.c + '"><span class="dv-opt-dot" aria-hidden="true"></span><span class="dv-opt-t" translate="no">' + esc(r.name) + '</span><span class="dv-opt-mark" aria-hidden="true"></span><span class="dv-opt-sr sr-only"></span></button>';
  const pct = (n, of) => (Math.round(n / of * 10000) / 100) + '%';
  /* repères : l’étiquette part à droite du point ; à gauche pour Grassrivers et sous le point pour Port Gellhorn, trop près
     du bord ouest et à la hauteur d’Ambrosia (aucune étiquette ne sort de la carte ni ne cache un autre repère, dès 320 px) */
  const SIDE = { grassrivers: ' dv-pin--g', 'port-gellhorn': ' dv-pin--b' };
  const pin = r => '<button type="button" class="dv-pin' + (SIDE[r.id] || '') + '" data-dv-pin="' + esc(r.id) + '" data-x="' + r.x + '" data-y="' + r.y + '" tabindex="-1" style="left:' + pct(r.x, carte.W) + ';top:' + pct(r.y, carte.H) + ';--c:' + r.c + '"><span class="dv-pin-dot"></span><span class="dv-pin-t" translate="no">' + esc(r.short) + '</span></button>';
  return '<div class="dv-board" data-dv-board hidden>'
    + '<div class="dv-bar"><p class="dv-mode" data-dv-mode></p><ol class="dv-dots" data-dv-dots aria-hidden="true">' + '<li></li>'.repeat(D.parPartie) + '</ol><p class="dv-count" data-dv-count></p><p class="dv-streak" data-dv-streak hidden></p><p class="dv-points" data-dv-points></p>'
    + '<button type="button" class="dv-back-btn" data-dv-back hidden>' + esc(D.resultat.retour) + '</button></div>'
    + '<div class="dv-grid"><div class="dv-play">'
    + '<div class="dv-deck" data-dv-deck data-left="' + (D.parPartie - 1) + '"><span class="dv-back dv-back--2" aria-hidden="true"></span><span class="dv-back dv-back--1" aria-hidden="true"></span><div class="dv-card" data-dv-card><p class="dv-verdict" data-dv-verdict hidden></p></div></div>'
    + '<p class="dv-q" id="dv-q">' + esc(P.question) + '</p>'
    + '<div class="dv-opts" role="group" aria-labelledby="dv-q">' + R.map(opt).join('') + '</div>'
    + '<div class="dv-answer" data-dv-answer hidden><p class="dv-answer-t" data-dv-answer-t></p>'
    + '<p class="dv-answer-img"><span class="dv-answer-leg" data-dv-leg></span> <span class="dv-answer-tit" data-dv-tit translate="no"></span> <a class="dv-answer-src" href="' + esc(D.source.url) + '" target="_blank" rel="noopener nofollow">' + esc(D.sources.credit) + '</a></p>'
    /* v7.92 : la devise de la bonne région (sa fiche, plus bas) et l’entrée de l’image dans l’album */
    + '<p class="dv-answer-tag" data-dv-answer-tag hidden></p><p class="dv-answer-new" data-dv-answer-new hidden></p>'
    + '<div class="dv-answer-act"><a class="dv-fiche-link" data-dv-fiche-link href="lieux.html">' + esc(D.regions.fiche) + '</a><button type="button" class="lkx-btn" data-dv-next></button></div></div>'
    + '</div>'
    + '<div class="dv-map" aria-hidden="true"><p class="dv-map-k">' + esc(P.carte) + '</p><div class="dv-map-box"><img class="dv-map-img" src="img/leonida-carte.svg" width="' + carte.W + '" height="' + carte.H + '" alt="" loading="lazy" decoding="async">'
    + '<svg class="dv-line" data-dv-line viewBox="0 0 ' + carte.W + ' ' + carte.H + '" preserveAspectRatio="none" focusable="false"><line x1="0" y1="0" x2="0" y2="0" pathLength="1"/></svg>'
    + R.map(pin).join('') + '</div><p class="dv-map-cap">' + esc(P.carteNote) + '</p></div>'
    + '</div></div>';
}
function resultPanel(L, R) {
  const { D } = L, X = D.resultat, per = D.parPartie;
  const tile = (k, attr, note, cls) => '<div class="dv-stat' + (cls ? ' ' + cls : '') + '"><dt>' + esc(k) + '</dt><dd class="dv-stat-n" ' + attr + '></dd>' + (note ? '<dd class="dv-stat-d">' + esc(note) + '</dd>' : '') + '</div>';
  const dist = []; for (let k = per; k >= 0; k--) dist.push('<li data-dv-dist="' + k + '"><span class="dv-dist-k"></span><span class="dv-dist-bar" aria-hidden="true"><i></i></span><b class="dv-dist-v"></b></li>');
  const rs = R.map(r => '<li data-dv-rs="' + esc(r.id) + '" style="--c:' + r.c + '"><span class="dv-rs-n"><span class="dv-reg-dot" aria-hidden="true"></span><span translate="no">' + esc(r.name) + '</span></span><span class="dv-rs-bar" aria-hidden="true"><i></i></span><b class="dv-rs-v"></b><span class="dv-rs-c"></span></li>');
  return '<div class="dv-result" data-dv-result hidden tabindex="-1" aria-labelledby="dv-res-t">'
    + '<div class="dv-res-top"><div class="dv-res-head"><p class="dv-res-k" data-dv-res-k></p><h3 class="dv-res-t" id="dv-res-t"><span class="sr-only">' + esc(X.titre) + ' : </span><span data-dv-res-score></span></h3>'
    + '<ol class="dv-res-dots" data-dv-res-dots aria-hidden="true">' + '<li></li>'.repeat(per) + '</ol><p class="dv-res-msg" data-dv-res-msg></p></div>'
    + '<dl class="dv-stats">' + tile(X.serie, 'data-dv-serie', X.serieNote, 'dv-stat--hot') + tile(X.serieMax, 'data-dv-serie-max') + tile(X.parties, 'data-dv-parties') + tile(X.reussite, 'data-dv-reussite') + tile(X.meilleur, 'data-dv-best') + tile(X.album, 'data-dv-album-n') + '</dl></div>'
    + '<ol class="dv-res-list" data-dv-res-list></ol>'
    + '<div class="dv-res-more">'
    + '<section class="dv-res-box dv-res-box--week" aria-labelledby="dv-week-t"><h4 id="dv-week-t">' + esc(X.semaine) + '</h4><ol class="dv-week" data-dv-week></ol></section>'
    + '<section class="dv-res-box dv-res-box--dist" aria-labelledby="dv-dist-t"><h4 id="dv-dist-t">' + esc(X.repartition) + '</h4><ol class="dv-dist">' + dist.join('') + '</ol><p class="dv-res-note">' + esc(X.repartitionNote) + '</p></section>'
    + '<section class="dv-res-box dv-res-box--rs" aria-labelledby="dv-rs-t"><h4 id="dv-rs-t">' + esc(X.regionsT) + '</h4><ul class="dv-rs">' + rs.join('') + '</ul><p class="dv-res-note">' + esc(X.regionsNote) + '</p></section>'
    + '</div>'
    + '<div class="dv-share"><pre class="dv-share-txt" data-dv-share-txt></pre><div class="dv-share-act"><button type="button" class="lkx-btn" data-dv-share>' + esc(X.partage) + '</button><button type="button" class="lkx-btn lkx-btn--ghost dv-noarrow" data-dv-copy>' + esc(X.copier) + '</button></div><p class="dv-share-n">' + esc(X.partageNote) + '</p></div>'
    + '<div class="dv-res-foot"><p class="dv-countdown" data-dv-countdown></p><a class="dv-res-album" href="#regions">' + esc(X.voirAlbum) + '</a><button type="button" class="lkx-btn lkx-btn--night" data-dv-new hidden>' + esc(X.jouer) + '</button><button type="button" class="lkx-btn lkx-btn--ghost" data-dv-free>' + esc(X.libre) + '</button></div>'
    + '</div>';
}
/* textes et images pour devine.js : des gabarits inertes (rien n’est chargé, rien n’est affiché), traduits avec la page */
function templates(L) {
  const { D, MED } = L;
  const msg = '<template id="dv-msg">' + Object.entries(D.msg).map(([k, t]) => '<p data-k="' + esc(k) + '">' + esc(t) + '</p>').join('') + '</template>';
  const item = im => { const m = MED[im.id], a = v(m, 480) || m.variants[0], c = v(m, 1280) || m.variants[m.variants.length - 1], mid = '/img/officiel/' + im.id + '-800.webp';
    return '<div data-dv-img="' + esc(im.id) + '" data-dv-r="' + esc(im.region) + '"><img src="' + c.src + '" srcset="' + a.src + ' 480w, ' + mid + ' 800w, ' + c.src + ' 1280w" sizes="(max-width:900px) 100vw, 820px" width="' + c.w + '" height="' + c.h + '" alt="' + esc(im.alt) + '"><p class="dv-leg">' + esc(im.legende) + '</p><p class="dv-tit" translate="no">' + esc(m.titre) + '</p></div>'; };
  const list = D.images.slice().sort((x, y) => (x.id < y.id ? -1 : 1));
  return msg + '<template id="dv-pool">' + list.map(item).join('') + '</template>';
}
/* v7.92 : les six régions en cartes postales — la carte autour de la région (silhouette du site, repères des six
   régions), sa devise, ce que montrent ses captures (deux faits de outils/editorial.json) et l’album du joueur : une case
   par image de la région, le dos d’une carte tant qu’elle n’a pas été jouée dans une partie du jour (devine.js). */
const PCW = 3400, PCH = 1700;
function pcMap(r, R) {
  const x0 = Math.max(0, Math.min(carte.W - PCW, Math.round(r.x - PCW / 2))), y0 = Math.max(0, Math.min(carte.H - PCH, Math.round(r.y - PCH / 2)));
  const others = R.filter(o => o.id !== r.id && o.x >= x0 - 200 && o.x <= x0 + PCW + 200 && o.y >= y0 - 200 && o.y <= y0 + PCH + 200)
    .map(o => '<circle class="dv-pc-o" cx="' + o.x + '" cy="' + o.y + '" r="62" style="fill:' + o.c + '"/>').join('');
  return '<svg class="dv-pc-svg" viewBox="' + x0 + ' ' + y0 + ' ' + PCW + ' ' + PCH + '" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false"><use href="#lk-leonida" width="' + carte.W + '" height="' + carte.H + '"/>'
    + others + '<circle class="dv-pc-halo" cx="' + r.x + '" cy="' + r.y + '" r="300"/><circle class="dv-pc-pin" cx="' + r.x + '" cy="' + r.y + '" r="105"/></svg>';
}
function regionsSection(L, R) {
  const X = L.D.regions, total = L.D.images.length;
  const slots = r => r.images.slice().sort((a, b) => (a.id < b.id ? -1 : 1)).map(im => '<li class="dv-slot" data-dv-slot="' + esc(im.id) + '"><span class="dv-slot-q" aria-hidden="true"></span></li>').join('');
  const card = (r, i) => '<li class="dv-pc" style="--c:' + r.c + ';--i:' + i + '" data-dv-reg="' + esc(r.id) + '">'
    + '<div class="dv-pc-map">' + pcMap(r, R) + '<span class="dv-pc-stamp vt-stamp" aria-hidden="true">' + r.images.length + '</span></div>'
    + '<div class="dv-pc-b"><h3 class="dv-pc-t"><span class="dv-reg-dot" aria-hidden="true"></span><a class="dv-reg-a" href="lieux/' + esc(r.id) + '.html" data-dv-fiche="' + esc(r.id) + '" translate="no">' + esc(r.name) + '</a></h3>'
    + '<p class="dv-pc-tag" data-dv-tag="' + esc(r.id) + '">' + esc(r.tagline) + '</p>'
    + '<p class="dv-pc-k">' + esc(X.voit) + '</p><ul class="dv-pc-facts">' + X.faits[r.id].map(k => '<li>' + esc(r.facts[k]) + '</li>').join('') + '</ul>'
    + '<div class="dv-pc-album"><p class="dv-pc-n"><span data-dv-pc-n>' + esc(X.images.replace('{n}', r.images.length)) + '</span><span class="dv-pc-ok" data-dv-pc-ok hidden></span></p>'
    + '<ol class="dv-album" role="list">' + slots(r) + '</ol></div>'
    + '<a class="dv-reg-map" href="carte.html#lieu=' + esc(r.mapId) + '">' + ICON_PIN + '<span>' + esc(X.carte) + '</span></a></div></li>';
  const bar = '<div class="dv-albumbar"><p class="dv-albumbar-t" data-dv-albumbar-t>' + esc(X.aDecouvrir.replace('{n}', total)) + '</p><span class="dv-albumbar-p" aria-hidden="true"><i data-dv-albumbar-i></i></span></div>';
  return S.section({ id: 'regions', num: 1, kicker: X.kicker, title: X.titre, icon: 'carte', tone: 'paper', lede: esc(X.lede) }, bar + '<ul class="dv-atlas vt-in vt-in--deal" data-lk-reveal role="list">' + R.map(card).join('') + '</ul>');
}
function rulesSection(L) {
  const X = L.D.regles;
  return S.section({ id: 'regles', num: 2, kicker: X.kicker, title: X.titre, icon: 'boussole', tone: 'paper2', accent: 'coral' }, VT.steps(X.etapes.map((e, i) => ({ title: e.titre, text: e.texte, ill: IL.RULES[i] })), { cls: 'dv-steps' }));
}
/* le cycle des images : autant de colonnes que de jours dans un cycle, une case par image ; devine.js marque les jours
   passés et celui d’aujourd’hui, sans jamais montrer quelle image ni quelle région vient */
function cycleBox(L) {
  const { D } = L, X = D.sources, total = D.images.length, per = D.parPartie, jours = Math.floor(total / per);
  const fillN = t => t.replace(/\{total\}/g, total).replace(/\{jours\}/g, jours).replace(/\{per\}/g, per).replace(/\{max\}/g, D.parRegionMax);
  const cols = []; for (let d = 0; d < jours; d++) cols.push('<li data-dv-cday="' + d + '" style="--i:' + d + '"><span class="dv-cycle-c">' + '<i></i>'.repeat(per) + '</span><b>' + (d + 1) + '</b></li>');
  return '<div class="dv-cycle" data-dv-cycle><div class="dv-cycle-h"><h3 class="dv-cycle-t">' + esc(fillN(X.cycleT)) + '</h3><p class="dv-cycle-n" data-dv-cycle-n hidden></p></div>'
    + '<p class="dv-cycle-d">' + esc(fillN(X.cycleD)) + '</p><ol class="dv-cycle-g vt-in" data-lk-reveal aria-hidden="true">' + cols.join('') + '</ol></div>';
}
function sourcesSection(L, R) {
  const { D } = L, X = D.sources, s = D.source, most = Math.max(...R.map(r => r.images.length));
  const figs = VT.figs([{ n: D.images.length, label: X.total, accent: true }, ...R.map(r => ({ n: r.images.length, label: r.name, p: r.images.length / most * 100, c: r.c, no: true }))], { cls: 'dv-figs' });
  return S.section({ id: 'images', num: 3, kicker: X.kicker, title: X.titre, icon: 'film', tone: 'night', accent: 'coral', lede: esc(X.lede) },
    '<p class="dv-src-p">' + esc(X.p1) + '</p>' + figs + cycleBox(L) + '<p class="dv-src-p">' + esc(X.p2) + '</p>'
    + S.sourceList([{ id: s.id, url: s.url, title: s.title, consultedAt: s.consultedAt, statut: s.statut, claim: s.claim }])
    + '<p class="dv-src-p"><a href="medias.html">' + esc(X.credits) + '</a></p>');
}
function faqSection(L) {
  const { D } = L, X = D.faq, total = D.images.length, jours = Math.floor(total / D.parPartie);
  const fillN = t => t.replace(/\{total\}/g, total).replace(/\{jours\}/g, jours);
  const faq = '<div class="faq">' + X.items.map(x => '<details data-lk-reveal><summary>' + esc(fillN(x.q)) + '</summary><div class="ans">' + esc(fillN(x.a)) + '</div></details>').join('') + '</div>';
  const A = VTX.aside;
  return S.section({ id: 'faq', num: 4, kicker: X.kicker, title: X.titre, icon: 'faq', tone: 'paper' }, VT.faqGrid(faq,
    VT.aside({ title: A.titre, text: A.texte, asks: D.leo.suggestions.slice(0, 3), mail: { href: 'contact.html#ecrire', label: A.ecrire }, media: D.leo.media, alt: D.leo.alt })));
}
function explore(L) {
  const X = L.D.explorer;
  return '<section class="shell reveal dv-explore" aria-labelledby="dv-explore-t"><h2 class="sec-h" id="dv-explore-t">' + esc(X.titre) + '</h2><div class="lkx-links">'
    + X.liens.map(l => LKX.linkCard({ href: l.href, title: l.titre, text: l.texte, icon: LKX.ICO[l.icon] })).join('') + '</div></section>';
}

function pageHtml(L, R) {
  const { D, MED } = L, P = D.page, C = chromeOf(L.read('a-propos.html'));
  const og = MED['carte-postale-vice-city'] ? (v(MED['carte-postale-vice-city'], 1280) || MED['carte-postale-vice-city'].variants[0]).src : '/img/social-card.png';
  const title = P.seoTitle + ' | Leonidakit', desc = metaDesc(P.desc), canonical = '/' + PAGE;
  const nav = S.nav(Object.entries(P.nav).map(([id, label]) => ({ href: '#' + id, label })), P.label);
  const ld = '<script type="application/ld+json">' + JSON.stringify({ '@context': 'https://schema.org', '@type': 'WebPage', name: P.title, description: desc, url: SITE + canonical, inLanguage: 'fr', dateModified: D.source.consultedAt, about: { '@type': 'VideoGame', name: 'Grand Theft Auto VI' }, isPartOf: { '@type': 'WebSite', name: 'Leonidakit', url: SITE + '/' } }) + '</script>';
  const body = `<section class="page-head shell lk-glow dv-head">
  <div class="dv-head-t"><p class="fiche-cat">${esc(P.kicker)}</p>
  <h1>${esc(P.title)}</h1></div>
  <div class="dv-head-d"><p class="lede">${esc(P.lede)}</p>
  <p class="d-intro-note">${esc(P.note)}</p></div>
</section>
<section class="shell dv-game" id="jeu" aria-labelledby="dv-t" data-dv data-dv-debut="${esc(D.debut)}" data-dv-per="${D.parPartie}">
<h2 class="sr-only" id="dv-t">${esc(P.label)}</h2>
<div class="dv-nojs" data-dv-nojs><p>${esc(P.sansScript)}</p></div>
${board(L, R)}
${resultPanel(L, R)}
<p class="sr-only" data-dv-live aria-live="polite"></p>
${templates(L)}
</section>
<script src="devine.js" async fetchpriority="high"></script>
<div class="ed-zone ed-zone--devine">
${nav}
${regionsSection(L, R)}
${rulesSection(L)}
${sourcesSection(L, R)}
${faqSection(L)}
</div>
${explore(L)}`;
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:type" content="website">
<meta property="og:locale" content="fr_FR">
<meta name="theme-color" content="#FDFBF7">
<meta name="color-scheme" content="light">
<link rel="canonical" href="${SITE}${canonical}">
${C.fav}
${bc([['Accueil', '/'], [P.label, canonical]])}
${ld}
<link rel="stylesheet" href="style.css">
<link rel="stylesheet" href="motion-tokens.css">
<link rel="stylesheet" href="lk-sections.css">
<link rel="stylesheet" href="vitrine.css">
<link rel="stylesheet" href="devine.css">
<meta property="og:image" content="${SITE}${og}">
<meta name="twitter:card" content="summary_large_image">
<meta property="og:url" content="${SITE}${canonical}">
</head>
<body>

<a class="skip" href="#main">Aller au contenu</a>
<div class="sunset" aria-hidden="true"></div>

${C.header.replace(/ class="here"/g, '').replace(/ aria-current="page"/g, '')}

<main id="main" class="lore-page dv-page">
${S.defs()}
${body}
</main>

${C.footer}

${C.scripts}
<script src="vitrine.js"></script>
</body>
</html>
`;
}

/* ---------- liens posés ailleurs (outils/lore-gen.js) ---------- */
/* page Lieux : l’encart du jeu, sous la carte des six régions (même composant que l’encart du calculateur) */
function promo(prefix = '', root = ROOT) {
  const X = JSON.parse(fs.readFileSync(path.join(root, DATA_FILE), 'utf8')).liens;
  return '<section class="shell dv-promo" aria-labelledby="dv-promo-t"><div class="lk-entry-card"><div><p class="lk-entry-eyebrow">' + esc(X.kicker) + '</p><h2 id="dv-promo-t">' + esc(X.titre) + '</h2><p>' + esc(X.texte) + '</p></div>'
    + '<a class="lk-entry-button" href="' + prefix + PAGE + '">' + esc(X.bouton) + ' <span aria-hidden="true">→</span></a></div></section>';
}
/* fiche d’une région : un lien parmi ceux de l’en-tête (Lire le dossier, Voir sur la carte…) */
function lienFiche(prefix = '../', root = ROOT) {
  const X = JSON.parse(fs.readFileSync(path.join(root, DATA_FILE), 'utf8')).liens;
  return '<a href="' + prefix + PAGE + '">' + esc(X.titre) + '</a>';
}

/* ---------- recherche du site : une entrée vers le jeu, avec les mots du joueur ---------- */
function indexEntries(L) {
  const n = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(), P = L.D.page;
  return [{ l: P.title + ' : le jeu du jour', k: 'Jouer', u: '/' + PAGE + '#jeu', s: n(P.title + ' ' + P.seoTitle + ' jeu jouer quiz devinette deviner deviner le lieu image du jour partie du jour serie regions region carte leonida geoguessr gta 6 gta vi ' + L.D.series.map(s => s.region.replace(/-/g, ' ')).join(' ')), w: 1 }];
}

function generate(root = ROOT) {
  const L = load(root), R = check(L);
  fs.writeFileSync(path.join(root, PAGE), pageHtml(L, R));
  fs.writeFileSync(path.join(root, 'outils/devine-index.json'), JSON.stringify(indexEntries(L)));
  console.log('devine : ' + L.D.images.length + ' images officielles (' + R.map(r => r.short + ' ' + r.images.length).join(', ') + '), ' + L.D.parPartie + ' par partie, tirages vérifiés sur trois ans à partir du ' + L.D.debut);
}

module.exports = { generate, load, check, regionsOf, pool, promo, lienFiche, indexEntries, pageHtml, DATA_FILE, PAGE };
if (require.main === module) generate();
