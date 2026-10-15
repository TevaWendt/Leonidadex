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
   Usage : node outils/gen-devine.cjs   (appelé par outils/regenerer.cjs, après gen-actus.cjs) */
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const ROOT = path.resolve(__dirname, '..');
const S = require('./sections.cjs');
const LKX = require('./lk-sections.cjs');
const carte = require('./carte-vignette.cjs');
const { REGIONS } = require('./monde-cartes.cjs');
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
    return { ...s, id: s.region, name: x ? x.name : null, short: x ? x.name.replace(/ National Park$/, '') : null, tagline: x ? x.tagline : '', mapId: x ? (x.mapId || x.id) : null, c: (REGIONS[s.region] || {}).c, x: p ? p.x : null, y: p ? p.y : null, images: L.D.images.filter(i => i.region === s.region) };
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
  for (const k of ['dv-jour', 'dv-libre', 'dv-image', 'dv-points', 'dv-juste', 'dv-rate', 'dv-verdict-juste', 'dv-verdict-rate', 'dv-suivante', 'dv-voir', 'dv-fiche', 'dv-annonce', 'dv-annonce-libre', 'dv-fin', 'dv-deja', 'dv-jours-one', 'dv-jours-other', 'dv-sur', 'dv-partage-titre', 'dv-copie', 'dv-copie-ko', 'dv-partage-ok', 'dv-prochaine', 'dv-prochaine-min', 'dv-nouvelle', 'dv-libre-annonce', 'dv-sr-bonne', 'dv-sr-ta', 'dv-res-ta', 'dv-res-0', 'dv-res-1', 'dv-res-2', 'dv-res-3', 'dv-res-4', 'dv-res-5']) if (!keys.includes(k)) err.push('message absent : ' + k);
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
    + '<div class="dv-bar"><p class="dv-mode" data-dv-mode></p><ol class="dv-dots" data-dv-dots aria-hidden="true">' + '<li></li>'.repeat(D.parPartie) + '</ol><p class="dv-count" data-dv-count></p><p class="dv-points" data-dv-points></p>'
    + '<button type="button" class="dv-back-btn" data-dv-back hidden>' + esc(D.resultat.retour) + '</button></div>'
    + '<div class="dv-grid"><div class="dv-play">'
    + '<div class="dv-deck" data-dv-deck data-left="' + (D.parPartie - 1) + '"><span class="dv-back dv-back--2" aria-hidden="true"></span><span class="dv-back dv-back--1" aria-hidden="true"></span><div class="dv-card" data-dv-card><p class="dv-verdict" data-dv-verdict hidden></p></div></div>'
    + '<p class="dv-q" id="dv-q">' + esc(P.question) + '</p>'
    + '<div class="dv-opts" role="group" aria-labelledby="dv-q">' + R.map(opt).join('') + '</div>'
    + '<div class="dv-answer" data-dv-answer hidden><p class="dv-answer-t" data-dv-answer-t></p>'
    + '<p class="dv-answer-img"><span class="dv-answer-leg" data-dv-leg></span> <span class="dv-answer-tit" data-dv-tit translate="no"></span> <a class="dv-answer-src" href="' + esc(D.source.url) + '" target="_blank" rel="noopener nofollow">' + esc(D.sources.credit) + '</a></p>'
    + '<div class="dv-answer-act"><a class="dv-fiche-link" data-dv-fiche-link href="lieux.html">' + esc(D.regions.fiche) + '</a><button type="button" class="lkx-btn" data-dv-next></button></div></div>'
    + '</div>'
    + '<div class="dv-map" aria-hidden="true"><p class="dv-map-k">' + esc(P.carte) + '</p><div class="dv-map-box"><img class="dv-map-img" src="img/leonida-carte.svg" width="' + carte.W + '" height="' + carte.H + '" alt="" loading="lazy" decoding="async">'
    + '<svg class="dv-line" data-dv-line viewBox="0 0 ' + carte.W + ' ' + carte.H + '" preserveAspectRatio="none" focusable="false"><line x1="0" y1="0" x2="0" y2="0" pathLength="1"/></svg>'
    + R.map(pin).join('') + '</div><p class="dv-map-cap">' + esc(P.carteNote) + '</p></div>'
    + '</div></div>';
}
function resultPanel(L) {
  const { D } = L, X = D.resultat;
  return '<div class="dv-result" data-dv-result hidden tabindex="-1" aria-labelledby="dv-res-t">'
    + '<div class="dv-res-head"><p class="dv-res-k" data-dv-res-k></p><h3 class="dv-res-t" id="dv-res-t"><span class="sr-only">' + esc(X.titre) + ' : </span><span data-dv-res-score></span></h3><p class="dv-res-msg" data-dv-res-msg></p></div>'
    + '<ol class="dv-res-list" data-dv-res-list></ol>'
    + '<dl class="dv-stats"><div class="dv-stat"><dt>' + esc(X.serie) + '</dt><dd class="dv-stat-n" data-dv-serie></dd><dd class="dv-stat-d">' + esc(X.serieNote) + '</dd></div><div class="dv-stat"><dt>' + esc(X.meilleur) + '</dt><dd class="dv-stat-n" data-dv-best></dd></div></dl>'
    + '<div class="dv-share"><pre class="dv-share-txt" data-dv-share-txt></pre><div class="dv-share-act"><button type="button" class="lkx-btn" data-dv-share>' + esc(X.partage) + '</button><button type="button" class="lkx-btn lkx-btn--ghost dv-noarrow" data-dv-copy>' + esc(X.copier) + '</button></div><p class="dv-share-n">' + esc(X.partageNote) + '</p></div>'
    + '<div class="dv-res-foot"><p class="dv-countdown" data-dv-countdown></p><button type="button" class="lkx-btn lkx-btn--night" data-dv-new hidden>' + esc(X.jouer) + '</button><button type="button" class="lkx-btn lkx-btn--ghost" data-dv-free>' + esc(X.libre) + '</button></div>'
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
function regionsSection(L, R) {
  const X = L.D.regions;
  const card = (r, i) => '<li class="dv-reg" style="--c:' + r.c + ';--i:' + i + '">' + carte.vignette(r.mapId)
    + '<div class="dv-reg-b"><h3 class="dv-reg-t"><span class="dv-reg-dot" aria-hidden="true"></span><a class="dv-reg-a" href="lieux/' + esc(r.id) + '.html" data-dv-fiche="' + esc(r.id) + '" translate="no">' + esc(r.name) + '</a></h3>'
    + '<p class="dv-reg-tag">' + esc(r.tagline) + '</p><p class="dv-reg-n">' + esc(X.images.replace('{n}', r.images.length)) + '</p>'
    + '<a class="dv-reg-map" href="carte.html#lieu=' + esc(r.mapId) + '">' + ICON_PIN + '<span>' + esc(X.carte) + '</span></a></div></li>';
  return S.section({ id: 'regions', num: 1, kicker: X.kicker, title: X.titre, icon: 'carte', tone: 'paper', lede: esc(X.lede) }, '<ul class="dv-regs" role="list">' + R.map(card).join('') + '</ul>');
}
function rulesSection(L) {
  const X = L.D.regles;
  return S.section({ id: 'regles', num: 2, kicker: X.kicker, title: X.titre, icon: 'boussole', tone: 'paper2', accent: 'coral' }, S.steps(X.etapes.map(e => ({ icon: e.icon, titre: e.titre, texte: e.texte }))));
}
function sourcesSection(L, R) {
  const { D } = L, X = D.sources, s = D.source;
  const figs = S.figures([{ n: D.images.length, label: X.total }, ...R.map(r => ({ n: r.images.length, label: r.name }))]).replace(/<span class="fig-l">([^<]*)<\/span>/g, (m, t, off) => t === X.total ? m : '<span class="fig-l" translate="no">' + t + '</span>');
  return S.section({ id: 'images', num: 3, kicker: X.kicker, title: X.titre, icon: 'film', tone: 'night', accent: 'coral', lede: esc(X.lede) },
    '<p class="dv-src-p">' + esc(X.p1) + '</p>' + figs + '<p class="dv-src-p">' + esc(X.p2) + '</p>'
    + S.sourceList([{ id: s.id, url: s.url, title: s.title, consultedAt: s.consultedAt, statut: s.statut, claim: s.claim }])
    + '<p class="dv-src-p"><a href="medias.html">' + esc(X.credits) + '</a></p>');
}
function faqSection(L) {
  const X = L.D.faq;
  return S.section({ id: 'faq', num: 4, kicker: X.kicker, title: X.titre, icon: 'faq', tone: 'paper' }, '<div class="faq rise">' + X.items.map(x => '<details><summary>' + esc(x.q) + '</summary><div class="ans">' + esc(x.a) + '</div></details>').join('') + '</div>');
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
${resultPanel(L)}
<p class="sr-only" data-dv-live aria-live="polite"></p>
${templates(L)}
</section>
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
<script src="devine.js"></script>
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
