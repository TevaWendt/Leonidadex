#!/usr/bin/env node
'use strict';
/* v7.87 : section « Actualités et vidéos » — actus.html (frise datée de tout ce que Rockstar a publié sur GTA VI, flux
   actus.xml), videos.html et videos/<id>.html (les trois vidéos officielles, moment par moment) et editions.html (les deux
   éditions, les seize contenus de l’Ultimate, les bonus, la version en boîte), depuis outils/actus/actus.json.
   Rien n’est réécrit ici : ce qu’une annonce ou une vidéo a montré vient des données déjà vérifiées du site :
   - outils/monde-dossiers.json : événements datés et révélations des fiches du monde (chrono), avec leur statut ;
   - outils/radios/radios.json : morceaux des vidéos et leurs minutages ;
   - vehicules-data.js, armes-data.js : où chaque modèle a été vu pour la première fois (champ src) ;
   - outils/medias-officiels.json : affiches et photogrammes minutés des vidéos ; outils/medias-identifications.json :
     photogrammes reliés à une arme.
   Les sources d’une page sont prises dans les registres du site (outils/editorial-hubs.json, outils/monde-dossiers.json,
   les sections) et dans actus.json ; un même identifiant ne peut pas désigner deux adresses.
   Le lecteur de YouTube (youtube-nocookie, déjà permis par la CSP) ne se charge qu’au clic (actus.js).
   rss(html, langue) rend le flux d’une page actus.html, française ou traduite : outils/sync-site.cjs l’appelle pour chaque
   langue après la traduction. Usage : node outils/gen-actus.cjs   (appelé par outils/regenerer.cjs après gen-radios.cjs) */
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const ROOT = path.resolve(__dirname, '..');
const S = require('./sections.cjs');
const LKX = require('./lk-sections.cjs');
const esc = S.esc;
const SITE = 'https://www.leonidakit.com';
const DATA_FILE = 'outils/actus/actus.json';
const ST = ['officiel', 'vu', 'comm', 'conf'];
/* dossier de chaque famille de fiches du monde (outils/editorial.json, outils/monde-dossiers.json) */
const FOLDER = { regions: 'lieux', characters: 'personnages', businesses: 'entreprises', residences: 'demeures', hideouts: 'planques', factions: 'gangs' };
const KIND = { regions: 'Lieu', characters: 'Personnage', businesses: 'Entreprise', residences: 'Demeure', hideouts: 'Planque', factions: 'Gang ou faction' };
const REGISTRES = ['outils/editorial-hubs.json', 'outils/monde-dossiers.json', 'outils/radios/radios.json', 'outils/activites/hub.json', 'outils/missions/hub.json', 'outils/online/hub.json', 'outils/codes/hub.json', 'outils/trophees/hub.json'];

function load(root = ROOT) {
  const read = f => fs.readFileSync(path.join(root, f), 'utf8');
  const A = JSON.parse(read(DATA_FILE)), MD = JSON.parse(read('outils/monde-dossiers.json')), ED = JSON.parse(read('outils/editorial.json'));
  const MED = JSON.parse(read('outils/medias-officiels.json')), MI = JSON.parse(read('outils/medias-identifications.json')).associations;
  const R = JSON.parse(read('outils/radios/radios.json'));
  const STATUTS = JSON.parse(read('outils/editorial-hubs.json')).statuts;
  const c = { window: {} };
  vm.runInNewContext(read('vehicules-data.js'), c); vm.runInNewContext(read('armes-data.js'), c);
  const V = c.window.LK_VEHICULES, W = c.window.LK_ARMES;
  /* registre des sources : un identifiant = une adresse, où qu’il soit déclaré */
  const SRC = {}, err = [];
  const add = (id, s, from) => { if (!s || !s.url) return; if (SRC[id] && SRC[id].url !== s.url) err.push('source ' + id + ' : deux adresses (' + SRC[id].from + ', ' + from + ')'); if (!SRC[id]) SRC[id] = { ...s, id, from }; };
  for (const f of REGISTRES) if (fs.existsSync(path.join(root, f))) for (const [id, s] of Object.entries(JSON.parse(read(f)).sources || {})) add(id, s, f);
  for (const [id, s] of Object.entries(A.sources)) add(id, s, DATA_FILE);
  if (err.length) throw new Error('Sources en conflit :\n- ' + err.join('\n- '));
  return { A, MD, ED, MED, MI, R, V, W, SRC, STATUTS, read };
}

/* fiche du monde : « regions/vice-city » → nom, page, famille */
function ficheOf(ctx, key) {
  const [fam, id] = key.split('/'), list = ctx.ED[fam] || [], x = list.find(y => y.id === id);
  if (!x || !FOLDER[fam]) return null;
  return { fam, id, name: x.name, href: FOLDER[fam] + '/' + id + '.html', kind: KIND[fam], media: (x.media || [])[0] || null };
}
/* révélations d’un ou plusieurs événements des dossiers : [{fiche, statut, texte}] dans l’ordre des familles */
function revelations(ctx, evs) {
  const out = [];
  for (const [key, f] of Object.entries(ctx.MD.fiches)) for (const x of f.chrono || []) if (evs.includes(x.ev)) { const fi = ficheOf(ctx, key); if (fi) out.push({ fiche: fi, statut: x.statut, texte: x.texte }); }
  return out;
}
const secs = t => { const m = String(t || '').match(/(\d+):(\d{2})/); return m ? +m[1] * 60 + +m[2] : null; };
const mmss = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
const frLong = iso => new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(iso + 'T12:00:00Z')).replace(/^1 /, '1er ');
const frDate = iso => iso ? iso.split('-').reverse().join('/') : null;
const metaDesc = t => { t = String(t || '').replace(/\s+/g, ' ').trim(); return t.length <= 160 ? t : t.slice(0, 157).replace(/\s+\S*$/, '') + '…'; };

/* ---------- contrôles : une donnée mal formée arrête la génération ---------- */
function check(ctx, root = ROOT) {
  const { A, MD, MED, SRC, R } = ctx, err = [];
  const src = (id, where) => { if (!SRC[id]) err.push('source inconnue dans ' + where + ' : ' + id); };
  /* pages écrites par ce générateur : pas encore sur le disque à la première génération */
  const OWN = /^(?:actus\.html|videos\.html|editions\.html|videos\/[a-z0-9-]+\.html)(?:#|$)/;
  const exists = href => OWN.test(href) || fs.existsSync(path.join(root, href.split('#')[0]));
  for (const [id, s] of Object.entries(A.sources)) {
    if (!/^https:\/\//.test(s.url) || !s.title || !s.claim || !ST.includes(s.statut) || !/^2026-\d\d-\d\d$/.test(s.consultedAt || '')) err.push('source mal formée : ' + id);
  }
  const ids = new Set();
  for (const e of A.evenements) {
    if (!/^[a-z0-9-]+$/.test(e.id) || ids.has(e.id)) err.push('événement mal nommé ou en double : ' + e.id); ids.add(e.id);
    if (!/^\d{4}-\d\d-\d\d$/.test(e.iso) || !e.titre || !e.texte || !ST.includes(e.statut)) err.push('événement mal formé : ' + e.id);
    if (!(e.sources || []).length) err.push('événement sans source : ' + e.id);
    (e.sources || []).forEach(id => src(id, e.id));
    for (const ev of e.evs || (e.ev ? [e.ev] : [])) if (!MD.evenements[ev]) err.push('événement de dossier inconnu dans ' + e.id + ' : ' + ev);
    for (const l of e.liens || []) if (!exists(l.href)) err.push('lien absent dans ' + e.id + ' : ' + l.href);
    if (e.video && !A.videos.liste.some(v => v.id === e.video)) err.push('vidéo inconnue dans ' + e.id + ' : ' + e.video);
  }
  const sorted = [...A.evenements].sort((a, b) => b.iso.localeCompare(a.iso));
  if (sorted.some((e, i) => e !== A.evenements[i])) err.push('événements : du plus récent au plus ancien');
  for (const x of A.aVenir) { if (!/^\d{4}-\d\d-\d\d$/.test(x.iso) || !x.titre || !x.texte) err.push('date à venir mal formée : ' + x.titre); src(x.source, 'à venir'); if (x.lien && !exists(x.lien.href)) err.push('lien absent : ' + x.lien.href); }
  for (const v of A.videos.liste) {
    if (!/^[a-z0-9-]+$/.test(v.id) || !/^[A-Za-z0-9_-]{11}$/.test(v.youtube) || !/^\d{4}-\d\d-\d\d$/.test(v.iso)) err.push('vidéo mal formée : ' + v.id);
    if (!MED[v.affiche]) err.push('affiche inconnue : ' + v.affiche);
    if (!MD.evenements[v.ev]) err.push('événement de dossier inconnu : ' + v.ev);
    if (!R.videos.some(x => x.id === v.radio)) err.push('vidéo absente de radios.json : ' + v.radio);
    if (v.desc.length > 160) err.push('description trop longue : ' + v.id);
    for (const f of v.faits) { if (!ST.includes(f.statut) || !(f.sources || []).length) err.push('fait mal formé dans ' + v.id); f.sources.forEach(id => src(id, v.id)); }
  }
  for (const c of A.editions.contenus) if (c.href && !exists(c.href)) err.push('contenu de l’Ultimate : page absente ' + c.href);
  for (const b of A.editions.bonus) if (b.href && !exists(b.href)) err.push('bonus : page absente ' + b.href);
  if (A.editions.contenus.length !== 16) err.push('l’assistance de Rockstar liste seize contenus, pas ' + A.editions.contenus.length);
  for (const p of [...A.actus.pile, ...A.editions.pile]) if (!MED[p.media]) err.push('visuel inconnu : ' + p.media);
  for (const d of [A.actus.desc, A.videos.desc, A.editions.desc]) if (d.length > 160) err.push('description trop longue : ' + d.slice(0, 40));
  if (err.length) throw new Error('Données de la section Actualités et vidéos :\n- ' + err.join('\n- '));
}

/* ---------- gabarit (en-tête, pied et scripts copiés d’a-propos.html et d’une fiche, comme les autres sections) ---------- */
function chromeOf(s) {
  const pick = re => { const m = s.match(re); if (!m) throw new Error('gabarit introuvable : ' + re); return m[0]; };
  return {
    fav: pick(/<link rel="icon"[^>]*>/),
    header: pick(/<header>[\s\S]*?<\/header>/),
    footer: pick(/<footer>[\s\S]*?<\/footer>/),
    scripts: (s.match(/<script(?: type="lk\/lazy")? src="[^"]*"><\/script>/g) || []).filter(x => !/fiches\.js|vehicules-data\.js|armes-data\.js|lk-showcase\.js|carnets-core\.js/.test(x)).join('\n')
  };
}
const bc = items => '<script type="application/ld+json">' + JSON.stringify({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it[0], item: SITE + it[1] })) }) + '</script>';
function page(C, { p, title, desc, canonical, ogImg, body, crumbs, ld = '', cls = '', head = '' }) {
  desc = metaDesc(desc);
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
${C.fav}${head ? '\n' + head : ''}
${bc(crumbs)}${ld ? '\n' + ld : ''}
<link rel="stylesheet" href="${p}style.css">
<link rel="stylesheet" href="${p}motion-tokens.css">
<link rel="stylesheet" href="${p}lk-sections.css">
<link rel="stylesheet" href="${p}actus.css">
<meta property="og:image" content="${SITE}${ogImg || '/img/social-card.png'}">
<meta name="twitter:card" content="summary_large_image">
<meta property="og:url" content="${SITE}${canonical}">
</head>
<body>

<a class="skip" href="#main">Aller au contenu</a>
<div class="sunset" aria-hidden="true"></div>

${C.header.replace(/ class="here"/g, '')}

<main id="main" class="lore-page actus-page${cls ? ' ' + cls : ''}">
${body}
</main>
${C.footer}

${C.scripts}
<script src="${p}actus.js"></script>
</body>
</html>
`;
}

/* ---------- briques ---------- */
const imgOf = (MED, id) => { const m = MED[id]; if (!m) return null; return { a: m.variants[0], b: m.variants[1] || m.variants[0] }; };
const pile = (MED, list, label) => require('./lot-c-visuals.cjs').stack(list.map(x => { const m = imgOf(MED, x.media); return { src: m.a.src, big: m.b.src, alt: x.alt, caption: x.caption }; }), { label });
function sourceList(ctx, ids, anchorPrefix = 'src-') {
  return '<ol class="ed-srcs">' + ids.map(id => { const s = ctx.SRC[id];
    return '<li id="' + anchorPrefix + esc(id) + '">' + S.pip(s.statut, true)
      + '<a class="ed-src-link" href="' + esc(s.url) + '" target="_blank" rel="noopener nofollow"' + (s.lang === 'en' ? ' translate="no"' : '') + '>' + esc(s.title) + '</a>'
      + '<span class="ed-src-meta">' + (s.publisher ? esc(s.publisher) + ' · ' : '') + (s.publishedAt ? 'publié le ' + esc(frDate(s.publishedAt)) + ' · ' : '') + 'consulté le ' + esc(frDate(s.consultedAt)) + '</span>'
      + (s.claim ? '<p>' + esc(s.claim) + '</p>' : '') + '</li>'; }).join('') + '</ol>';
}
const srcRefs = ids => '<span class="ac-refs">' + ids.map((id, i) => '<a href="#src-' + esc(id) + '" aria-label="Source ' + (i + 1) + '">' + (i + 1) + '</a>').join('') + '</span>';
const uniq = l => [...new Set(l)];
const faqBlock = list => '<div class="faq rise">' + list.map(x => '<details><summary>' + esc(x.q) + '</summary><div class="ans">' + esc(x.a) + '</div></details>').join('') + '</div>';
const faqLD = list => '<script type="application/ld+json">' + JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: list.map(x => ({ '@type': 'Question', name: x.q, acceptedAnswer: { '@type': 'Answer', text: x.a } })) }) + '</script>';
/* révélations d’une annonce ou d’une vidéo, regroupées par famille de fiches */
function revealList(rev, prefix) {
  const order = Object.keys(FOLDER);
  const fams = order.filter(f => rev.some(r => r.fiche.fam === f));
  return '<div class="ac-rev">' + fams.map(f => '<div class="ac-rev-g"><h4 class="ac-rev-h">' + esc({ regions: 'Lieux', characters: 'Personnages', businesses: 'Entreprises', residences: 'Demeures', hideouts: 'Planques', factions: 'Gangs et factions' }[f]) + '</h4><ul class="ac-rev-l">'
    + rev.filter(r => r.fiche.fam === f).map(r => '<li class="ac-rev-i"><a class="ac-rev-a" href="' + prefix + esc(r.fiche.href) + '" translate="no">' + esc(r.fiche.name) + '</a>' + S.pip(r.statut, true) + '<p>' + esc(r.texte) + '</p></li>').join('') + '</ul></div>').join('') + '</div>';
}

/* ---------- Actualités ---------- */
function actusPage(ctx) {
  const { A, MED, ROOTC } = ctx, X = A.actus;
  const upcoming = '<section class="ac-next" id="a-venir" aria-labelledby="a-venir-t"><div class="shell"><p class="ed-kicker">' + esc(X.aVenirKicker) + '</p><h2 class="sec-h" id="a-venir-t">' + esc(X.aVenirTitre) + '</h2>'
    + '<ol class="ac-next-l">' + A.aVenir.map(x => { const d = new Date(x.iso + 'T12:00:00Z');
      return '<li class="ac-ticket rise" data-iso="' + esc(x.iso) + '"><p class="ac-ticket-d"><time datetime="' + esc(x.iso) + '"><b>' + d.getUTCDate() + '</b><span>' + esc(new Intl.DateTimeFormat('fr-FR', { month: 'long', timeZone: 'UTC' }).format(d)) + ' ' + d.getUTCFullYear() + '</span></time></p>'
        + '<div class="ac-ticket-b"><h3>' + esc(x.titre) + '</h3><p>' + esc(x.texte) + '</p>' + (x.lien ? '<a class="ac-ticket-a" href="' + esc(x.lien.href) + '">' + esc(x.lien.label) + '</a>' : '') + '</div></li>'; }).join('') + '</ol></div></section>';
  const events = A.evenements.map((e, i) => {
    const evs = e.evs || (e.ev ? [e.ev] : []), rev = revelations(ctx, evs);
    const dossierMedia = evs.map(ev => ctx.MD.evenements[ev] && ctx.MD.evenements[ev].media).find(Boolean);
    const vid = e.video ? A.videos.liste.find(v => v.id === e.video) : null;
    const media = vid ? vid.affiche : dossierMedia;
    const links = [...(vid ? [{ href: 'videos/' + vid.id + '.html', label: 'La page de la vidéo' }] : []), ...(e.liens || [])];
    return '<li class="ac-ev rise" id="ev-' + esc(e.id) + '" data-iso="' + esc(e.iso) + '" style="--i:' + i + '">'
      + '<div class="ac-ev-when"><time datetime="' + esc(e.iso) + '">' + esc(e.dateTexte || frLong(e.iso)) + '</time></div>'
      + '<article class="ac-ev-card">' + (media ? '<figure class="ac-ev-fig">' + LKX.img(MED, media, '', { sizes: '(max-width:700px) 100vw, 280px' }) + '</figure>' : '')
      + '<div class="ac-ev-body"><p class="ac-ev-st">' + S.pip(e.statut, true) + '</p><h3 class="ac-ev-t">' + esc(e.titre) + '</h3><p class="ac-ev-text">' + esc(e.texte) + ' ' + srcRefs(e.sources) + '</p>'
      + (links.length ? '<p class="ac-ev-links">' + links.map(l => '<a href="' + esc(l.href) + '">' + esc(l.label) + '</a>').join('') + '</p>' : '')
      + (rev.length ? '<details class="ac-ev-more"><summary>' + esc(X.montre) + ' <span class="ac-n">' + rev.length + '</span></summary>' + revealList(rev, '') + '</details>' : '')
      + '</div></article></li>';
  }).join('');
  const allSrc = uniq([...A.evenements.flatMap(e => e.sources), ...A.aVenir.map(x => x.source)]);
  const body = `<section class="page-head shell lk-glow"><div class="lk-head-grid"><div>
  <p class="fiche-cat">${esc(X.label)} · GTA VI</p>
  <h1>${esc(X.title)}</h1>
  <p class="lede">${esc(X.lede)}</p>
  <p class="d-intro-note">${esc(X.note)} <a href="tuto.html#sources">Comprendre les statuts</a>.</p>
  <p class="ac-rss"><a class="lkx-btn lkx-btn--ghost" href="actus.xml" type="application/rss+xml">${esc(X.flux)}</a><span>${esc(X.fluxNote)}</span></p>
</div>${pile(MED, X.pile, 'Trois affiches officielles des vidéos de GTA VI')}</div></section>
${upcoming}
<section class="ac-frise" id="frise" aria-labelledby="frise-t"><div class="shell"><h2 class="sec-h" id="frise-t">${esc(X.frise)}</h2><p class="ac-lede">${esc(X.friseLede)}</p>
<ol class="ac-evs" role="list">${events}</ol></div></section>
<section class="shell ac-faq reveal" id="faq" aria-labelledby="faq-t"><h2 class="sec-h" id="faq-t">Questions fréquentes</h2>${faqBlock(X.faq)}</section>
<section class="shell ac-src reveal" id="sources" aria-labelledby="sources-t"><h2 class="sec-h" id="sources-t">Sources</h2><p class="ac-lede">Chaque annonce renvoie ici par son numéro ; les révélations fiche par fiche ont leurs sources sur chaque fiche.</p>${sourceList(ctx, allSrc)}</section>`;
  const ld = '<script type="application/ld+json">' + JSON.stringify({ '@context': 'https://schema.org', '@type': 'CollectionPage', name: X.title, description: metaDesc(X.desc), url: SITE + '/actus.html', inLanguage: 'fr', dateModified: A.evenements[0].iso > ctx.maj ? A.evenements[0].iso : ctx.maj, isPartOf: { '@type': 'WebSite', name: 'Leonidakit', url: SITE + '/' }, mainEntity: { '@type': 'ItemList', numberOfItems: A.evenements.length, itemListElement: A.evenements.map((e, i) => ({ '@type': 'ListItem', position: i + 1, name: e.titre, url: SITE + '/actus.html#ev-' + e.id })) } }) + '</script>' + faqLD(X.faq);
  const og = imgOf(MED, X.pile[0].media);
  return page(ROOTC, { p: '', title: X.seoTitle + ' | Leonidakit', desc: X.desc, canonical: '/actus.html', ogImg: og.b.src, body, crumbs: [['Accueil', '/'], [X.label, '/actus.html']], ld, cls: 'actus-page--frise', head: '<link rel="alternate" type="application/rss+xml" title="' + esc(X.seoTitle) + '" href="actus.xml">' /* adresse relative : chaque langue annonce son propre flux (en/actus.xml…) */ });
}

/* ---------- Vidéos ---------- */
/* ce que le site sait d’une vidéo : photogrammes minutés (véhicules, armes), morceaux, modèles vus pour la première fois */
function videoData(ctx, v) {
  const { MED, MI, R, V, W } = ctx;
  const frames = Object.values(MED).filter(m => /\/VI\/media\/videos$/.test(m.source) && m.id.startsWith(v.id === 'extended-look' ? 'extended-look-' : v.id + '-') && !m.id.startsWith('affiche'));
  const moments = frames.map(m => {
    const t = typeof m.timeSeconds === 'number' ? m.timeSeconds : m.frameAt ? secs(m.frameAt) : null;
    const veh = V.filter(x => (x.medias || []).includes(m.id)).map(x => ({ label: (x.marque && x.marque !== 'Marque inconnue' ? x.marque + ' ' : '') + x.nom, href: 'vehicules/' + x.id + '.html', kind: 'Véhicule' }));
    const arm = MI.filter(a => a.media === m.id && a.type === 'armes').map(a => { const w = W.find(y => y.id === a.fiche); return w ? { label: w.nom, href: 'armes/' + w.id + '.html', kind: 'Arme' } : null; }).filter(Boolean);
    /* texte alternatif : celui du registre, sinon celui de la fiche du véhicule (imageAlts), déjà écrit et traduit */
    const own = V.find(x => (x.medias || []).includes(m.id) && x.imageAlts && x.imageAlts[m.id]);
    return { id: m.id, t, alt: m.alt || (own ? own.imageAlts[m.id] : ''), items: [...veh, ...arm] };
  }).filter(x => x.items.length || x.alt).sort((a, b) => (a.t ?? 1e9) - (b.t ?? 1e9))
    /* deux photogrammes de la même seconde (deux identifications sur une même image : lance-grenades et fourgon blindé à
       1:58 dans le Trailer 2) font un seul moment : l'image du premier, les modèles et les descriptions des deux */
    .reduce((out, m) => { const prev = out[out.length - 1];
      if (prev && m.t !== null && prev.t !== null && Math.floor(prev.t) === Math.floor(m.t)) { for (const it of m.items) if (!prev.items.some(p => p.href === it.href)) prev.items.push(it); if (m.alt && !prev.alts.includes(m.alt)) prev.alts.push(m.alt); return out; }
      out.push({ ...m, items: [...m.items], alts: m.alt ? [m.alt] : [] }); return out; }, []);
  const rv = R.videos.find(x => x.id === v.radio);
  const songs = rv ? rv.morceaux : [];
  const vehicles = V.filter(x => x.src === v.src).sort((a, b) => (a.marque + a.nom).localeCompare(b.marque + b.nom, 'fr'));
  const weapons = W.filter(x => x.src === (v.srcArmes || v.src)).sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
  return { moments, songs, vehicles, weapons, rev: revelations(ctx, [v.ev]) };
}
/* sans script, les boutons du lecteur sont des liens vers la vidéo sur YouTube (au bon moment) */
const ytWatch = (id, t) => 'https://www.youtube.com/watch?v=' + id + (t ? '&t=' + Math.floor(t) + 's' : '');
const ytSrc = (id, t) => 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0&playsinline=1' + (t ? '&start=' + Math.floor(t) : '');
function screen(ctx, v, P) {
  const m = imgOf(ctx.MED, v.affiche);
  return '<div class="ac-screen" data-ac-screen data-src="' + esc(ytSrc(v.youtube)) + '" data-title="' + esc(v.nom) + '">'
    + '<img class="ac-screen-img" src="' + m.b.src + '" srcset="' + m.a.src + ' ' + m.a.w + 'w, ' + m.b.src + ' ' + m.b.w + 'w" sizes="(max-width:900px) 100vw, 760px" width="' + m.b.w + '" height="' + m.b.h + '" alt="' + esc('Affiche officielle : ' + v.nom) + '" decoding="async" fetchpriority="high">'
    + '<a class="ac-play" data-ac-play href="' + esc(ytWatch(v.youtube)) + '" target="_blank" rel="noopener nofollow"><span class="ac-play-ico" aria-hidden="true">' + LKX.ICO.play + '</span><span>' + esc(P.lecteur) + '</span></a>'
    + '</div><p class="ac-screen-n">' + esc(P.lecteurNote) + ' <a href="../mentions-legales.html#cookies">' + esc(P.lecteurLien) + '</a></p>';
}
function videoPage(ctx, v) {
  const { A, MED, SUBC } = ctx, P = A.videos, d = videoData(ctx, v), pre = '../';
  const others = P.liste.filter(x => x.id !== v.id);
  const faits = '<ul class="ac-faits">' + v.faits.map(f => '<li class="rise">' + S.pip(f.statut, true) + '<p>' + esc(f.texte) + ' ' + srcRefs(f.sources) + '</p></li>').join('') + '</ul>';
  /* photogrammes sans minutage (Extended Look : captures publiées sans leur moment) : la phrase d'introduction ne parle pas de minutage */
  const timed = d.moments.some(m => m.t !== null);
  const moments = d.moments.length ? '<section class="shell ac-sec reveal" id="moments" aria-labelledby="moments-t"><h2 class="sec-h" id="moments-t">' + esc(P.moments) + '</h2><p class="ac-lede">' + esc(timed ? P.momentsLede : P.momentsLedeSansTemps) + '</p><ol class="ac-moments">'
    + d.moments.map(m => '<li class="ac-moment' + (m.t === null ? ' ac-moment--sans-temps' : '') + '">' + '<span class="ac-moment-t">' + (m.t !== null ? '<time>' + mmss(m.t) + '</time>' : '') + '</span>'
      + '<figure class="ac-moment-fig">' + LKX.img(MED, m.id, m.alt, { sizes: '(max-width:700px) 100vw, 320px' }) + '</figure>'
      + '<div class="ac-moment-b">' + (m.items.length ? '<p class="ac-moment-items">' + m.items.map(it => '<a href="' + pre + esc(it.href) + '"><small>' + esc(it.kind) + '</small> <span translate="no">' + esc(it.label) + '</span></a>').join('') + '</p>' : '')
      + m.alts.map(a => '<p class="ac-moment-alt">' + esc(a) + '</p>').join('')
      + (m.t !== null ? '<a class="ac-replay" data-ac-at="' + Math.floor(m.t) + '" href="' + esc(ytWatch(v.youtube, m.t)) + '" target="_blank" rel="noopener nofollow"><span aria-hidden="true">' + LKX.ICO.play + '</span>' + esc(P.revoir) + ' <span class="ac-at">' + mmss(m.t) + '</span></a>' : '')
      + '</div></li>').join('') + '</ol></section>' : '';
  const songs = d.songs.length ? '<section class="shell ac-sec reveal" id="musique" aria-labelledby="musique-t"><h2 class="sec-h" id="musique-t">' + esc(P.musique) + '</h2><ol class="ac-songs">'
    + d.songs.map(s => { const t = secs(s.moment); return '<li class="ac-song">' + S.pip(s.statut) + '<span class="ac-song-b"><cite translate="no">' + esc(s.titre) + '</cite> <span class="ac-song-a" translate="no">' + esc(s.artiste) + '</span><small>' + esc(s.moment) + '</small></span>'
      + (t !== null ? '<a class="ac-replay ac-replay--s" data-ac-at="' + t + '" href="' + esc(ytWatch(v.youtube, t)) + '" target="_blank" rel="noopener nofollow"><span aria-hidden="true">' + LKX.ICO.play + '</span><span class="ac-at">' + mmss(t) + '</span><span class="sr-only"> ' + esc(P.revoir) + '</span></a>' : '') + '</li>'; }).join('')
    + '</ol><p class="ac-more"><a href="' + pre + 'radios.html#poste">Le poste de Leonida, morceau par morceau</a></p></section>' : '';
  const rev = d.rev.length ? '<section class="shell ac-sec reveal" id="fiches" aria-labelledby="fiches-t"><h2 class="sec-h" id="fiches-t">' + esc(P.montre) + '</h2>' + revealList(d.rev, pre) + '</section>' : '';
  const chips = (list, folder, label) => list.map(x => LKX.chip({ href: pre + folder + '/' + x.id + '.html', label: label(x), kind: 'page', labelNo: true })).join('');
  const veh = d.vehicles.length ? '<section class="shell ac-sec reveal" id="vehicules" aria-labelledby="vehicules-t"><h2 class="sec-h" id="vehicules-t">' + esc(P.vehicules) + ' <span class="ac-n">' + d.vehicles.length + '</span></h2><p class="ac-lede">' + esc(P.vuNote) + '</p><div class="ac-chips">' + chips(d.vehicles, 'vehicules', x => (x.marque && x.marque !== 'Marque inconnue' ? x.marque + ' ' : '') + x.nom) + '</div></section>' : '';
  const arm = d.weapons.length ? '<section class="shell ac-sec reveal" id="armes" aria-labelledby="armes-t"><h2 class="sec-h" id="armes-t">' + esc(P.armes) + ' <span class="ac-n">' + d.weapons.length + '</span></h2><div class="ac-chips">' + chips(d.weapons, 'armes', x => x.nom) + '</div></section>' : '';
  const srcIds = uniq([...v.faits.flatMap(f => f.sources), ...d.songs.flatMap(s => s.sources || [])]);
  const body = `<section class="page-head shell ac-vhead">
  <nav class="crumbs" aria-label="Fil d’Ariane"><a href="../index.html">Accueil</a> / <a href="../videos.html">${esc(P.label)}</a> / <span translate="no">${esc(v.nom)}</span></nav>
  <div class="ac-vgrid">
    <div class="ac-vcopy">
      <p class="fiche-cat">Vidéo officielle · <time datetime="${esc(v.iso)}">${esc(frLong(v.iso))}</time></p>
      <h1>${esc(v.titre)}</h1>
      <p class="lede">${esc(v.lede)}</p>
      ${faits}
    </div>
    <div class="ac-vplayer" id="lecteur">${screen(ctx, v, P)}</div>
  </div>
</section>
${moments}
${songs}
${rev}
${veh}
${arm}
<section class="shell ac-sec reveal" id="autres" aria-labelledby="autres-t"><h2 class="sec-h" id="autres-t">${esc(P.autres)}</h2><div class="ac-vcards ac-vcards--mini">${others.map(o => vcard(ctx, o, pre)).join('')}</div></section>
<section class="shell ac-faq reveal" id="faq" aria-labelledby="faq-t"><h2 class="sec-h" id="faq-t">Questions fréquentes</h2>${faqBlock(v.faq)}</section>
<section class="shell ac-src reveal" id="sources" aria-labelledby="sources-t"><h2 class="sec-h" id="sources-t">Sources</h2>${sourceList(ctx, srcIds)}<p class="ac-more">Les identifications des véhicules et des armes ont leurs sources sur chaque fiche. <a href="../actus.html#frise">Toutes les annonces, date par date</a>.</p></section>`;
  const m = imgOf(MED, v.affiche);
  const ld = '<script type="application/ld+json">' + JSON.stringify({ '@context': 'https://schema.org', '@type': 'VideoObject', name: v.titre, description: metaDesc(v.desc), uploadDate: v.iso, thumbnailUrl: [SITE + m.b.src], embedUrl: 'https://www.youtube-nocookie.com/embed/' + v.youtube, contentUrl: 'https://www.youtube.com/watch?v=' + v.youtube, publisher: { '@type': 'Organization', name: 'Rockstar Games' }, isPartOf: { '@type': 'VideoGame', name: 'Grand Theft Auto VI' } }) + '</script>' + faqLD(v.faq);
  return page(SUBC, { p: pre, title: v.seo + ' | Leonidakit', desc: v.desc, canonical: '/videos/' + v.id + '.html', ogImg: m.b.src, body, crumbs: [['Accueil', '/'], [P.label, '/videos.html'], [v.nom, '/videos/' + v.id + '.html']], ld, cls: 'actus-page--video' });
}
function vcard(ctx, v, pre) {
  const d = videoData(ctx, v), m = imgOf(ctx.MED, v.affiche);
  /* « moments minutés » ne compte que les photogrammes qui ont leur minutage ; les autres sont des « images relevées » */
  const nt = d.moments.filter(m => m.t !== null).length, nu = d.moments.length - nt, pl = n => n > 1 ? 's' : '';
  const stats = [nt ? nt + ' moment' + pl(nt) + ' minuté' + pl(nt) : null, !nt && nu ? nu + ' image' + pl(nu) + ' relevée' + pl(nu) : null, d.songs.length ? d.songs.length + ' morceau' + (d.songs.length > 1 ? 'x' : '') : null, d.vehicles.length ? d.vehicles.length + ' véhicule' + (d.vehicles.length > 1 ? 's' : '') : null].filter(Boolean);
  return '<a class="ac-vcard rise" href="' + pre + 'videos/' + esc(v.id) + '.html"><span class="ac-vcard-fig"><img src="' + m.a.src + '" srcset="' + m.a.src + ' ' + m.a.w + 'w, ' + m.b.src + ' ' + m.b.w + 'w" sizes="(max-width:700px) 100vw, 380px" width="' + m.a.w + '" height="' + m.a.h + '" alt="" loading="lazy" decoding="async"><span class="ac-vcard-play" aria-hidden="true">' + LKX.ICO.play + '</span></span>'
    + '<span class="ac-vcard-b"><span class="ac-vcard-d"><time datetime="' + esc(v.iso) + '">' + esc(frLong(v.iso)) + '</time></span><span class="ac-vcard-t" translate="no">' + esc(v.nom) + '</span><span class="ac-vcard-s">' + stats.map(s => '<span>' + esc(s) + '</span>').join('') + '</span></span></a>';
}
function videosHub(ctx) {
  const { A, MED, ROOTC } = ctx, P = A.videos;
  const list = [...P.liste].sort((a, b) => b.iso.localeCompare(a.iso));
  const body = `<section class="page-head shell lk-glow"><div class="lk-head-grid"><div>
  <p class="fiche-cat">${esc(P.label)} · GTA VI</p>
  <h1>${esc(P.title)}</h1>
  <p class="lede">${esc(P.lede)}</p>
  <p class="d-intro-note">${esc(P.note)} <a href="mentions-legales.html#cookies">${esc(P.lecteurLien)}</a>.</p>
</div>${pile(MED, A.actus.pile, 'Les affiches officielles des trois vidéos')}</div></section>
<section class="shell ac-sec" id="videos" aria-labelledby="videos-t"><h2 class="sec-h" id="videos-t">Les trois vidéos</h2><div class="ac-vcards">${list.map(v => vcard(ctx, v, '')).join('')}</div>
<p class="ac-more"><a href="actus.html#frise">Toutes les annonces, date par date</a></p></section>
<section class="shell ac-faq reveal" id="faq" aria-labelledby="faq-t"><h2 class="sec-h" id="faq-t">Questions fréquentes</h2>${faqBlock(list.flatMap(v => v.faq.slice(0, 1)))}</section>`;
  const ld = '<script type="application/ld+json">' + JSON.stringify({ '@context': 'https://schema.org', '@type': 'CollectionPage', name: P.title, description: metaDesc(P.desc), url: SITE + '/videos.html', inLanguage: 'fr', isPartOf: { '@type': 'WebSite', name: 'Leonidakit', url: SITE + '/' }, mainEntity: { '@type': 'ItemList', numberOfItems: list.length, itemListElement: list.map((v, i) => ({ '@type': 'ListItem', position: i + 1, name: v.titre, url: SITE + '/videos/' + v.id + '.html' })) } }) + '</script>' + faqLD(list.flatMap(v => v.faq.slice(0, 1)));
  const og = imgOf(MED, A.actus.pile[0].media);
  return page(ROOTC, { p: '', title: P.seoTitle + ' | Leonidakit', desc: P.desc, canonical: '/videos.html', ogImg: og.b.src, body, crumbs: [['Accueil', '/'], [P.label, '/videos.html']], ld, cls: 'actus-page--videos' });
}

/* ---------- Éditions ---------- */
function editionsPage(ctx) {
  const { A, MED, ROOTC } = ctx, E = A.editions, src = 'rs-support-editions';
  const ed = x => '<div class="ac-ed"><h3>' + esc(x.titre) + '</h3><p>' + esc(x.texte) + '</p></div>';
  const contenus = '<ul class="ac-ue" role="list">' + E.contenus.map(c => '<li class="ac-ue-i">' + (c.href ? '<a href="' + esc(c.href) + '">' : '<span class="ac-ue-x">') + '<span class="ac-ue-fr">' + esc(c.fr) + '</span><span class="ac-ue-en" translate="no">' + esc(c.nom) + '</span>' + (c.href ? '</a>' : '</span>') + '</li>').join('') + '</ul>';
  const bonus = '<div class="ac-bonus">' + E.bonus.map(b => '<div class="ac-bonus-i"><h3>' + esc(b.titre) + '</h3><p>' + esc(b.texte) + '</p><p class="ac-bonus-pour">' + esc(b.pour) + '</p>' + (b.href ? '<a href="' + esc(b.href) + '">Voir la fiche</a>' : '') + '</div>').join('') + '</div>';
  const list = l => '<ul class="ac-list">' + l.map(t => '<li>' + esc(t) + '</li>').join('') + '</ul>';
  const body = `<section class="page-head shell lk-glow"><div class="lk-head-grid"><div>
  <p class="fiche-cat">${esc(E.label)} · GTA VI</p>
  <h1>${esc(E.title)}</h1>
  <p class="lede">${esc(E.lede)}</p>
  <p class="d-intro-note">${esc(E.note)} ${srcRefs([src])}</p>
</div>${pile(MED, E.pile, 'Trois visuels officiels des éditions')}</div></section>
<section class="shell ac-sec reveal" id="editions" aria-labelledby="editions-t"><h2 class="sec-h" id="editions-t">Deux éditions</h2><div class="ac-eds">${ed(E.standard)}${ed(E.ultimate)}</div><p class="ac-lede">${esc(E.amelioration)}</p></section>
<section class="shell ac-sec reveal" id="ultimate" aria-labelledby="ultimate-t"><h2 class="sec-h" id="ultimate-t">${esc(E.contenusTitre)}</h2><p class="ac-lede">${esc(E.contenusLede)}</p>${contenus}</section>
<section class="shell ac-sec reveal" id="bonus" aria-labelledby="bonus-t"><h2 class="sec-h" id="bonus-t">${esc(E.bonusTitre)}</h2>${bonus}</section>
<section class="shell ac-sec reveal ac-cols" aria-label="Boîte, préchargement et régions">
  <div id="boite"><h2 class="sec-h">${esc(E.boiteTitre)}</h2>${list(E.boite)}</div>
  <div id="prechargement"><h2 class="sec-h">${esc(E.prechargementTitre)}</h2>${list(E.prechargement)}</div>
  <div id="regions"><h2 class="sec-h">${esc(E.regionsTitre)}</h2>${list(E.regions)}</div>
</section>
<section class="shell ac-faq reveal" id="faq" aria-labelledby="faq-t"><h2 class="sec-h" id="faq-t">Questions fréquentes</h2>${faqBlock(E.faq)}</section>
<section class="shell ac-src reveal" id="sources" aria-labelledby="sources-t"><h2 class="sec-h" id="sources-t">Sources</h2>${sourceList(ctx, [src])}<p class="ac-more"><a href="verification.html">Ce qui est confirmé sur GTA 6, et comment on le vérifie</a></p></section>`;
  const og = imgOf(MED, E.pile[0].media);
  const ld = '<script type="application/ld+json">' + JSON.stringify({ '@context': 'https://schema.org', '@type': 'WebPage', name: E.title, description: metaDesc(E.desc), url: SITE + '/editions.html', inLanguage: 'fr', dateModified: ctx.SRC[src].consultedAt, about: { '@type': 'VideoGame', name: 'Grand Theft Auto VI' }, isPartOf: { '@type': 'WebSite', name: 'Leonidakit', url: SITE + '/' } }) + '</script>' + faqLD(E.faq);
  return page(ROOTC, { p: '', title: E.seoTitle + ' | Leonidakit', desc: E.desc, canonical: '/editions.html', ogImg: og.b.src, body, crumbs: [['Accueil', '/'], [E.label, '/editions.html']], ld, cls: 'actus-page--editions' });
}

/* ---------- flux RSS (français ou traduit) : une entrée par annonce de la frise ---------- */
function rss(html, lang = 'fr') {
  const x = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const text = s => String(s).replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&#39;/g, '’').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
  const pick = re => { const m = html.match(re); return m ? m[1] : ''; };
  const title = text(pick(/<title>([\s\S]*?)<\/title>/)), desc = text(pick(/<meta name="description" content="([^"]*)"/)), url = pick(/<link rel="canonical" href="([^"]+)"/);
  const items = [...html.matchAll(/<li class="ac-ev[^"]*" id="ev-([a-z0-9-]+)" data-iso="(\d{4}-\d\d-\d\d)"[^>]*>([\s\S]*?)<\/article><\/li>/g)].map(m => {
    const t = text((m[3].match(/<h3 class="ac-ev-t">([\s\S]*?)<\/h3>/) || [])[1] || ''), d = text(((m[3].match(/<p class="ac-ev-text">([\s\S]*?)<span class="ac-refs">/) || [])[1]) || '');
    return '<item><title>' + x(t) + '</title><link>' + x(url + '#ev-' + m[1]) + '</link><guid isPermaLink="false">leonidakit-' + lang + '-' + m[1] + '</guid><pubDate>' + new Date(m[2] + 'T12:00:00Z').toUTCString() + '</pubDate><description>' + x(d) + '</description></item>';
  });
  if (!items.length) throw new Error('flux RSS : aucune annonce trouvée dans la page');
  return '<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>' + x(title.replace(/ \| Leonidakit$/, '') + ' — Leonidakit') + '</title><link>' + x(url) + '</link><atom:link href="' + x(url.replace(/\.html$/, '.xml')) + '" rel="self" type="application/rss+xml"/><description>' + x(desc) + '</description><language>' + x(lang) + '</language>' + items.join('') + '</channel></rss>\n';
}

/* ---------- accueil : la dernière annonce, sous le compte à rebours (index.html, entre les jalons et la fin du bandeau) ---------- */
function homeLine(ctx) {
  const e = ctx.A.evenements[0];
  return '<p class="clock-news" id="derniere-annonce"><span class="clock-news-k">' + esc(ctx.A.actus.derniere) + '</span> <a href="actus.html#ev-' + esc(e.id) + '"><time datetime="' + esc(e.iso) + '">' + esc(frLong(e.iso)) + '</time> : ' + esc(e.titre) + '</a> <a class="clock-news-all" href="actus.html#frise">' + esc(ctx.A.actus.toutes) + '</a></p>';
}
function injectHome(ctx, root) {
  const f = path.join(root, 'index.html'), s = fs.readFileSync(f, 'utf8'), line = homeLine(ctx);
  const re = /<p class="clock-news" id="derniere-annonce">[\s\S]*?<\/p>/;
  let out;
  if (re.test(s)) out = s.replace(re, line);
  else { const anchor = s.indexOf('<p class="clock-jalon" id="jalons">'); if (anchor < 0) throw new Error('accueil : ligne des jalons introuvable'); const end = s.indexOf('</p>', anchor) + 4; out = s.slice(0, end) + '\n    ' + line + s.slice(end); }
  if (out !== s) fs.writeFileSync(f, out);
}

/* ---------- recherche du site ---------- */
function indexEntries(ctx) {
  const n = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(), A = ctx.A;
  return [
    { l: A.actus.title, k: A.actus.label, u: '/actus.html', s: n(A.actus.title + ' actualites actus news annonces chronologie dates calendrier gta 6 gta vi ' + A.evenements.map(e => e.titre).join(' ')), w: 1 },
    { l: A.videos.title, k: A.videos.label, u: '/videos.html', s: n(A.videos.title + ' videos trailers bandes-annonces trailer 1 trailer 2 extended look gta 6'), w: 1 },
    ...A.videos.liste.map(v => ({ l: v.titre, k: A.videos.label, u: '/videos/' + v.id + '.html', s: n(v.titre + ' ' + v.nom + ' ' + v.lede + ' trailer video bande-annonce'), w: 1 })),
    { l: A.editions.title, k: A.editions.label, u: '/editions.html', s: n(A.editions.title + ' edition standard ultimate precommande bonus vintage vice city gta+ boite disque prechargement ' + A.editions.contenus.map(c => c.fr + ' ' + c.nom).join(' ')), w: 1 }
  ];
}

/* ---------- génération ---------- */
function generate(root = ROOT) {
  const L = load(root);
  const ctx = { ...L, ROOTC: chromeOf(L.read('a-propos.html')), SUBC: chromeOf(L.read('vehicules/karin-sultan.html')), maj: Object.values(L.A.sources).map(s => s.consultedAt).sort().pop() };
  check(ctx, root);
  const actus = actusPage(ctx);
  fs.writeFileSync(path.join(root, 'actus.html'), actus);
  fs.writeFileSync(path.join(root, 'actus.xml'), rss(actus, 'fr'));
  fs.writeFileSync(path.join(root, 'videos.html'), videosHub(ctx));
  fs.mkdirSync(path.join(root, 'videos'), { recursive: true });
  const keep = new Set(L.A.videos.liste.map(v => v.id + '.html'));
  for (const f of fs.readdirSync(path.join(root, 'videos'))) if (f.endsWith('.html') && !keep.has(f)) fs.unlinkSync(path.join(root, 'videos', f));
  for (const v of L.A.videos.liste) fs.writeFileSync(path.join(root, 'videos', v.id + '.html'), videoPage(ctx, v));
  fs.writeFileSync(path.join(root, 'editions.html'), editionsPage(ctx));
  fs.writeFileSync(path.join(root, 'outils/actus-index.json'), JSON.stringify(indexEntries(ctx)));
  injectHome(ctx, root);
  const vd = L.A.videos.liste.map(v => { const d = videoData(ctx, v); return v.id + ' (' + d.moments.length + ' moments, ' + d.songs.length + (d.songs.length > 1 ? ' morceaux, ' : ' morceau, ') + d.vehicles.length + ' véhicules, ' + d.weapons.length + ' armes, ' + d.rev.length + ' révélations)'; });
  console.log('actus : ' + L.A.evenements.length + ' annonces, ' + L.A.aVenir.length + ' dates à venir ; vidéos : ' + vd.join(' ; ') + ' ; éditions : ' + L.A.editions.contenus.length + ' contenus de l’Ultimate');
}

module.exports = { generate, load, check, rss, videoData, revelations, homeLine, DATA_FILE };
if (require.main === module) generate();
