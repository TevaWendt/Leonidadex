#!/usr/bin/env node
'use strict';
/* Section « Missions et leurs solutions » (section missions) : génère missions.html, une fiche missions/<id>.html par mission
   documentée (outils/missions/missions.json ; aucune tant que Rockstar n’a nommé aucune mission), la page de démonstration du
   gabarit missions/modele.html (noindex, hors menu, plan du site, recherche et Léo) et outils/missions-index.json (recherche du
   site, lu par sync-site.cjs). Même gabarit que les hubs du monde (outils/lore-gen.js), zone éditoriale des hubs
   (outils/sections.cjs), sources datées en bas.
   Pont avec le calculateur : une mission dont le gain (recompenses.argent) ET la durée (duree) sont publiés, au schéma des
   valeurs publiées (outils/donnees-publiees.cjs), devient une activité de calculateurs-activites.js (« mission-<id> ») ; tant
   qu’aucune mission n’a ces deux valeurs, le fichier n’est pas touché. Le moteur du calculateur ne change pas.
   leo() rend à outils/gen-leo.cjs les fiches (missions documentées) et les questions de la section (morceau leo/missions.json).
   Usage : node outils/gen-missions.cjs   (appelé par outils/regenerer.cjs, juste après lore-gen.js) */
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const ROOT = path.resolve(__dirname, '..');
const S = require('./sections.cjs');
const DP = require('./donnees-publiees.cjs');
const esc = S.esc;
const SITE = 'https://www.leonidakit.com', HUB = 'missions';
const FILES = { hub: 'outils/missions/hub.json', missions: 'outils/missions/missions.json', modele: 'outils/missions/modele.json' };
const TOOLS = ['activities', 'order', 'goal', 'session'];
const ST = ['officiel', 'vu', 'comm', 'conf'];

function load(root = ROOT) {
  const read = f => fs.readFileSync(path.join(root, f), 'utf8');
  return { H: JSON.parse(read(FILES.hub)), M: JSON.parse(read(FILES.missions)), MO: JSON.parse(read(FILES.modele)), MED: JSON.parse(read('outils/medias-officiels.json')), STATUTS: JSON.parse(read('outils/editorial-hubs.json')).statuts, ED: JSON.parse(read('outils/editorial.json')), read };
}

/* ---------- valeurs publiées (schéma de outils/donnees-publiees.cjs) ---------- */
const VAL_ST = ['official', 'officiel', 'verified', 'estimated', 'unverified', 'unknown'];
function checkValue(v, label, unit) {
  const err = [];
  if (v === null || v === undefined) return err;
  if (typeof v !== 'object') return [label + ' : objet { value, status, source, verifiedAt, unit } attendu'];
  if (!VAL_ST.includes(v.status)) err.push(label + ' : status attendu parmi ' + VAL_ST.join(', '));
  if (v.value !== null && (typeof v.value !== 'number' || !Number.isFinite(v.value) || v.value < 0)) err.push(label + ' : value doit être un nombre positif ou null');
  if (v.value === null && v.status !== 'unknown') err.push(label + ' : une valeur inconnue a le statut « unknown »');
  if (['official', 'officiel', 'verified'].includes(v.status) && (!v.source || !/^\d{4}-\d\d-\d\d$/.test(v.verifiedAt || ''))) err.push(label + ' : une valeur « ' + v.status + ' » exige source et verifiedAt (AAAA-MM-JJ)');
  if (unit && v.unit !== unit) err.push(label + ' : unité attendue « ' + unit + ' »');
  return err;
}
const known = v => v && typeof v.value === 'number' && v.status !== 'unknown';

/* ---------- contrôles : une donnée mal formée arrête la génération ---------- */
function checkMission(m, ctx, label = 'mission') {
  const { H, M, ED, root } = ctx, err = [], L = label + ' ' + (m && m.id || '?');
  const src = id => { if (!H.sources[id]) err.push(L + ' : source inconnue ' + id); };
  if (!m || !/^[a-z0-9][a-z0-9-]*$/.test(m.id || '')) return [L + ' : identifiant invalide'];
  if (!m.nom) err.push(L + ' : nom manquant');
  if (!M.types.some(t => t.id === m.type)) err.push(L + ' : type inconnu « ' + m.type + ' »');
  if (!m.resume || m.resume.length > 160) err.push(L + ' : résumé manquant ou de plus de 160 signes');
  if (!ST.includes(m.statut)) err.push(L + ' : statut inconnu');
  if (m.statutNom && !ST.includes(m.statutNom)) err.push(L + ' : statut du nom inconnu');
  for (const id of m.personnages || []) if (!(ED.characters || []).some(x => x.id === id)) err.push(L + ' : personnage inconnu ' + id);
  for (const id of m.lieux || []) if (!(ED.regions || []).some(x => x.id === id)) err.push(L + ' : région inconnue ' + id);
  for (const id of m.gangs || []) if (!(ED.factions || []).some(x => x.id === id)) err.push(L + ' : gang inconnu ' + id);
  for (const id of m.media || []) if (!ctx.MED[id]) err.push(L + ' : visuel inconnu ' + id);
  for (const b of [m.chapitre, m.deblocage, m.manquable, m.recompenses, ...(m.medailles || [])].filter(Boolean)) { if (b.statut && !ST.includes(b.statut)) err.push(L + ' : statut inconnu dans un bloc'); (b.sources || []).forEach(src); }
  (m.sources || []).forEach(src);
  err.push(...checkValue(m.recompenses && m.recompenses.argent, L + ' récompense', '$'), ...checkValue(m.duree, L + ' durée', 'min'));
  if (m.calc && !TOOLS.includes(m.calc.tool)) err.push(L + ' : outil du calculateur inconnu');
  if (root) {
    const w = vehiclesAndWeapons(root);
    for (const id of (m.recompenses || {}).vehicules || []) if (!w.v.has(id)) err.push(L + ' : véhicule inconnu ' + id);
    for (const id of (m.recompenses || {}).armes || []) if (!w.a.has(id)) err.push(L + ' : arme inconnue ' + id);
  }
  return err;
}
let VW = null;
function vehiclesAndWeapons(root) {
  if (VW && VW.root === root) return VW;
  const c = { window: {} };
  for (const f of ['vehicules-data.js', 'armes-data.js']) vm.runInNewContext(fs.readFileSync(path.join(root, f), 'utf8'), c);
  VW = { root, v: new Set(c.window.LK_VEHICULES.map(x => x.id)), a: new Set(c.window.LK_ARMES.map(x => x.id)), vn: Object.fromEntries(c.window.LK_VEHICULES.map(x => [x.id, ((x.marque && x.marque !== 'Marque inconnue' ? x.marque + ' ' : '') + x.nom).trim()])), an: Object.fromEntries(c.window.LK_ARMES.map(x => [x.id, x.nom])) };
  return VW;
}
function check(ctx) {
  const { H, M, MO, MED } = ctx, err = [];
  for (const [id, s] of Object.entries(H.sources)) {
    if (!/^https:\/\//.test(s.url)) err.push('source ' + id + ' : adresse https attendue');
    if (!s.title || !s.claim) err.push('source ' + id + ' : titre ou résumé manquant');
    if (!/^2026-\d\d-\d\d$/.test(s.consultedAt || '')) err.push('source ' + id + ' : date de consultation manquante');
    if (!ST.includes(s.statut)) err.push('source ' + id + ' : statut inconnu');
  }
  const ids = new Set();
  for (const m of M.missions) { if (ids.has(m.id)) err.push('mission en double : ' + m.id); ids.add(m.id); if (m.id === 'modele') err.push('« modele » est réservé à la page de démonstration'); err.push(...checkMission(m, ctx)); }
  err.push(...checkMission(MO.mission, { ...ctx, H: { ...H, sources: H.sources } }, 'page modèle'));
  for (const x of H.sequences.items) { if (!ST.includes(x.statut) || !x.titre || !x.texte || !x.sources.length) err.push('séquence mal formée : ' + x.titre); x.sources.forEach(s => { if (!H.sources[s]) err.push('séquence ' + x.titre + ' : source inconnue ' + s); }); if (x.media && (!MED[x.media] || !x.alt)) err.push('séquence ' + x.titre + ' : visuel ou texte alternatif'); }
  for (const x of H.histoire.mecaniques) x.sources.forEach(s => { if (!H.sources[s]) err.push('mécanique : source inconnue ' + s); });
  for (const x of H.edition.items) x.sources.forEach(s => { if (!H.sources[s]) err.push('édition : source inconnue ' + s); });
  for (const p of H.hub.pile) if (!MED[p.media]) err.push('visuel inconnu dans la pile : ' + p.media);
  const Z = H.zone;
  for (const k of ['nav', 'rockstar', 'communaute', 'confirmer', 'toi', 'faq', 'sources']) if (!Z[k]) err.push('zone : bloc manquant ' + k);
  Z.sources.forEach(id => { if (!H.sources[id]) err.push('zone : source inconnue ' + id); });
  for (const p of Z.communaute.pairs) if (!Z.sources.includes(p.src)) err.push('paire sans source de la page : ' + p.fiction);
  for (const x of Z.rockstar.items) { if (!ST.includes(x.statut)) err.push('frise : statut ' + x.titre); if (x.media && (!MED[x.media] || !x.alt)) err.push('frise : visuel ' + x.titre); }
  if (Z.faq.length < 4 || Z.faq.length > 6) err.push('la FAQ compte 4 à 6 questions');
  for (const f of Z.faq) if (!f.q || !f.a || f.a.length > 900 || !(f.k || []).length) err.push('FAQ mal formée : ' + f.q);
  for (const a of Z.toi.actions) if (!a.href && !a.pins) err.push('action sans lien : ' + a.t);
  const cited = new Set([...H.sequences.items.flatMap(x => x.sources), ...H.histoire.sources, ...H.histoire.mecaniques.flatMap(x => x.sources), ...H.edition.items.flatMap(x => x.sources), ...M.missions.flatMap(m => m.sources || [])]);
  for (const s of cited) if (!Z.sources.includes(s)) err.push('source citée mais absente de la liste de la page : ' + s);
  if (H.hub.desc.length > 160) err.push('description du hub trop longue (' + H.hub.desc.length + ' signes)');
  if (err.length) throw new Error('Section missions, données à corriger (outils/missions/) :\n- ' + err.join('\n- '));
}

/* ---------- gabarit : le vrai HTML du site (comme outils/lore-gen.js) ---------- */
function chromeOf(s) {
  const pick = re => { const m = s.match(re); if (!m) throw new Error('gabarit introuvable : ' + re); return m[0]; };
  return { fav: pick(/<link rel="icon"[^>]*>/), header: pick(/<header>[\s\S]*?<\/header>/), footer: pick(/<footer>[\s\S]*?<\/footer>/),
    scripts: (s.match(/<script(?: type="lk\/lazy")? src="[^"]*"><\/script>/g) || []).filter(x => !/fiches\.js|vehicules-data\.js|armes-data\.js|lk-showcase\.js|carnets-core\.js/.test(x)).join('\n') };
}
const frDate = iso => iso ? iso.split('-').reverse().join('/') : null;
const metaDesc = t => { t = String(t || '').replace(/\s+/g, ' ').trim(); return t.length <= 160 ? t : t.slice(0, 157).replace(/\s+\S*$/, '') + '…'; };
const bc = items => '<script type="application/ld+json">' + JSON.stringify({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it[0], item: SITE + it[1] })) }) + '</script>';
const EXPLORE = pre => `<section class="shell reveal lk-explore">
  <h2 class="sec-h">Continuer la visite</h2>
  <div class="lk-links rise"><a class="lk-link" href="${pre}carte.html"><img src="/img/officiel/leonida-keys-01-480.webp" width="480" height="270" alt="" loading="lazy" decoding="async"><span><b>La carte</b><i>2 547 lieux repérés, à cocher</i></span></a><a class="lk-link" href="${pre}vehicules.html"><img src="/img/officiel/one-eyed-willie-s-mod-shop-01-480.webp" width="480" height="270" alt="" loading="lazy" decoding="async"><span><b>Les 302 véhicules</b><i>Fiches, photos officielles et schémas</i></span></a><a class="lk-link" href="${pre}collectibles.html"><img src="/img/officiel/classic-car-collection-04-480.webp" width="480" height="270" alt="" loading="lazy" decoding="async"><span><b>Collectibles</b><i>La collection de Wyman et le carnet</i></span></a></div>
</section>`;
function page(C, { p, title, desc, canonical, ogImg, body, crumbs, ld = '', noindex = false }) {
  desc = metaDesc(desc);
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">${noindex ? '\n<meta name="robots" content="noindex, follow">' : ''}
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:type" content="website">
<meta property="og:locale" content="fr_FR">
<meta name="theme-color" content="#FDFBF7">
<meta name="color-scheme" content="light">
<link rel="canonical" href="${SITE}${canonical}">
${C.fav}
${bc(crumbs)}${ld ? '\n' + ld : ''}
<link rel="stylesheet" href="${p}style.css">
<link rel="stylesheet" href="${p}motion-tokens.css">
<link rel="stylesheet" href="${p}acquisitions.css">
${body.includes('lk-entry-card') ? `<link rel="stylesheet" href="${p}calculator-entry.css">\n` : ''}<link rel="stylesheet" href="${p}missions.css">
<meta property="og:image" content="${SITE}${ogImg || '/img/social-card.png'}">
<meta name="twitter:card" content="summary_large_image">
<meta property="og:url" content="${SITE}${canonical}">
</head>
<body>

<a class="skip" href="#main">Aller au contenu</a>
<div class="sunset" aria-hidden="true"></div>

${C.header.replace(/ class="here"/g, '')}

<main id="main" class="lore-page missions-page">
${body}
${EXPLORE(p ? '../' : '')}
<section class="lk-outro" aria-label="Et après"><div class="shell lk-outro-in"><p class="lk-outro-k">Et après ?</p><h2>La suite s’écrit le 19 novembre 2026.</h2><p>Chaque fiche se complète avec le jeu : ce qu’on y trouve, ce qu’on y fait, ce que ça rapporte. Rien d’inventé d’ici là.</p><div class="lk-outro-links"><a href="${p ? '../' : ''}carte.html">Ouvrir la carte</a><a href="${p ? '../' : ''}progression.html">Ma progression</a></div></div></section>
</main>

${C.footer}

${C.scripts}
<script src="${p}missions.js"></script>
</body>
</html>
`;
}

/* ---------- briques ---------- */
const imgOf = (MED, id) => { const m = MED[id]; if (!m) return null; return { a: m.variants[0], b: m.variants[1] || m.variants[0] }; };
function imgTag(MED, id, alt, big) {
  const m = imgOf(MED, id); if (!m) return '';
  return '<img src="' + m.a.src + '" srcset="' + m.a.src + ' ' + m.a.w + 'w, ' + m.b.src + ' ' + m.b.w + 'w" sizes="' + (big ? '(max-width:820px) 100vw, 560px' : '(max-width:600px) 100vw, 360px') + '" width="' + (big ? m.b.w : m.a.w) + '" height="' + (big ? m.b.h : m.a.h) + '" alt="' + esc(alt) + '" loading="' + (big ? 'eager' : 'lazy') + '" decoding="async">';
}
function sourceList(H, ids) {
  return '<ol class="ed-srcs">' + ids.map(id => { const s = H.sources[id];
    return '<li id="src-' + esc(id) + '">' + S.pip(s.statut, true)
      + '<a class="ed-src-link" href="' + esc(s.url) + '" target="_blank" rel="noopener nofollow"' + (s.lang === 'en' ? ' translate="no"' : '') + '>' + esc(s.title) + '</a>'
      + '<span class="ed-src-meta">' + (s.publishedAt ? 'publié le ' + esc(frDate(s.publishedAt)) + ' · ' : '') + 'consulté le ' + esc(frDate(s.consultedAt)) + '</span>'
      + '<p>' + esc(s.claim) + '</p></li>'; }).join('') + '</ol>';
}
const srcLinks = (ids, pre = '') => ids.length ? '<span class="missions-src">' + ids.map((id, i) => '<a href="' + pre + '#src-' + esc(id) + '" aria-label="Source ' + (i + 1) + '">' + (i + 1) + '</a>').join('') + '</span>' : '';
const pinsHref = a => a.pins ? 'carte.html#pins=' + a.pins.join(',') + (a.pinsTitle ? '&t=' + encodeURIComponent(a.pinsTitle) : '') : a.href;
const nameOf = (ED, group, id) => ((ED[group] || []).find(x => x.id === id) || {}).name || id;
const FOLDER = { characters: 'personnages', regions: 'lieux', factions: 'gangs' };
const chips = (ED, group, ids, pre) => (ids || []).map(id => '<a class="missions-chip" href="' + pre + FOLDER[group] + '/' + esc(id) + '.html">' + esc(nameOf(ED, group, id)) + '</a>').join('');
const valText = (v, unknownText) => {
  if (!known(v)) return unknownText;
  const p = { value: v.value, unit: v.unit || '$', label: DP.STATUS_LABEL[({ officiel: 'official' })[v.status] || v.status] || 'Non confirmé' };
  return (p.unit === '$' ? DP.fmt(p.value) + ' $' : DP.fmt(p.value) + ' ' + p.unit) + ' · ' + p.label;
};

/* ---------- hub ---------- */
function hubPage(ctx) {
  const { H, M, MED, ED, STATUTS, ROOTC } = ctx, X = H.hub;
  const pile = require('./lot-c-visuals.cjs').stack(X.pile.map(p => { const m = imgOf(MED, p.media); return { src: m.a.src, big: m.b.src, alt: p.alt, caption: p.caption }; }), { label: 'Trois visuels officiels de cette section' });
  const HI = H.histoire;
  const histoire = '<section class="shell missions-histoire reveal" id="histoire" aria-labelledby="histoire-t"><p class="missions-kicker">' + esc(HI.kicker) + '</p><h2 class="sec-h" id="histoire-t">' + esc(HI.titre) + '</h2>'
    + '<div class="missions-recit">' + HI.p.map(t => '<p>' + esc(t) + '</p>').join('') + '<p class="missions-recit-src">' + S.pip('officiel', true) + srcLinks(HI.sources) + '</p></div>'
    + '<div class="missions-meca">' + HI.mecaniques.map(x => '<article class="missions-meca-item rise"><span class="missions-meca-ico">' + S.icon(x.icon) + '</span><h3>' + esc(x.titre) + '</h3><p>' + esc(x.texte) + '</p><p class="missions-st">' + S.pip(x.statut, true) + srcLinks(x.sources) + '</p></article>').join('') + '</div></section>';
  const seq = H.sequences;
  const seqCard = (x, i) => '<li class="missions-seq rise' + (x.media ? ' missions-seq--media' : '') + '" id="seq-' + esc(x.id) + '">'
    + (x.media ? '<figure class="missions-seq-fig">' + imgTag(MED, x.media, x.alt, false) + '</figure>' : '')
    + '<div class="missions-seq-body"><p class="missions-seq-when"><span class="missions-seq-n" aria-hidden="true">' + String(i + 1).padStart(2, '0') + '</span><b>' + esc(x.video) + '</b> · <span>' + esc(x.moment) + '</span></p>'
    + '<h3>' + esc(x.titre) + '</h3><p>' + esc(x.texte) + '</p>'
    + '<p class="missions-seq-links">' + chips(ED, 'characters', x.personnages, '') + chips(ED, 'regions', x.lieux, '') + (x.carte || []).map(c => '<a class="missions-chip missions-chip--carte" href="carte.html#lieu=' + esc(c.id) + '">' + esc(c.nom) + '</a>').join('') + '</p>'
    + '<p class="missions-st">' + S.pip(x.statut, true) + srcLinks(x.sources) + '</p></div></li>';
  const sequences = '<section class="shell missions-sequences" id="sequences" aria-labelledby="sequences-t"><div class="reveal"><p class="missions-kicker">' + esc(seq.kicker) + '</p><h2 class="sec-h" id="sequences-t">' + esc(seq.titre) + '</h2><p class="missions-lede">' + esc(seq.lede) + '</p></div>'
    + '<ol class="missions-seqs">' + seq.items.map(seqCard).join('') + '</ol></section>';
  const E = H.edition;
  const edition = '<section class="shell missions-edition reveal" id="edition" aria-labelledby="edition-t"><p class="missions-kicker">' + esc(E.kicker) + '</p><h2 class="sec-h" id="edition-t">' + esc(E.titre) + '</h2><p class="missions-lede">' + esc(E.lede) + '</p>'
    + '<div class="missions-ed">' + E.items.map(x => '<article class="missions-ed-item rise"><h3 translate="no">' + esc(x.titre) + '</h3><p>' + esc(x.texte) + '</p><p class="missions-st">' + S.pip(x.statut, true) + srcLinks(x.sources) + '</p><p class="missions-ed-links">' + x.liens.map(l => '<a href="' + esc(l.href) + '">' + esc(l.label) + '</a>').join('') + '</p></article>').join('') + '</div>'
    + '<p class="missions-note">' + esc(E.p) + '</p></section>';
  const LI = H.liste, list = M.missions;
  const byChap = {}; for (const m of list) { const k = m.chapitre && m.chapitre.titre || ''; (byChap[k] = byChap[k] || []).push(m); }
  const missionCard = m => '<a class="lore-card rise" href="missions/' + esc(m.id) + '.html">' + (m.media && m.media[0] ? imgTag(MED, m.media[0], m.nom, false) : '<div class="lore-vide">Visuel officiel à venir</div>') + '<div class="veh-body"><span class="veh-marque">' + esc((M.types.find(t => t.id === m.type) || {}).label || '') + '</span><h3>' + esc(m.nom) + '</h3><p>' + esc(m.resume) + '</p><span class="veh-go">Voir la fiche</span></div></a>';
  const liste = '<section class="shell missions-liste" id="liste" aria-labelledby="liste-t"><div class="reveal"><p class="missions-kicker">' + esc(LI.kicker) + '</p><h2 class="sec-h" id="liste-t">' + esc(LI.titre) + '</h2></div>'
    + (list.length ? Object.entries(byChap).map(([chap, ms]) => (chap ? '<h3 class="missions-chap">' + esc(chap) + '</h3>' : '') + '<div class="lore-grid lore-grid--center">' + ms.sort((a, b) => (a.ordre || 999) - (b.ordre || 999)).map(missionCard).join('') + '</div>').join('')
      : '<p class="missions-vide">' + esc(LI.vide) + '</p>')
    + '<h3 class="missions-types-t">' + esc(LI.typesTitre) + '</h3><ul class="missions-types">' + M.types.map(t => '<li><b>' + esc(t.label) + '</b><span>' + esc(t.texte) + '</span><i>' + list.filter(m => m.type === t.id).length + '</i></li>').join('') + '</ul>'
    + '<p class="missions-note">' + esc(LI.ordre) + '</p></section>';
  const body = `<section class="page-head shell lk-glow"><div class="lk-head-grid"><div>
  <p class="fiche-cat">${esc(X.label)} · GTA VI</p>
  <h1>${esc(X.title)}</h1>
  <p class="lede">${esc(X.lede)}</p>
  <p class="d-intro-note">${esc(X.note)} <a href="tuto.html#sources">Comprendre les statuts</a>.</p>
</div>${pile}</div></section>
${histoire}
${sequences}
${edition}
${liste}
${zone(H, STATUTS)}`;
  const collection = '<script type="application/ld+json">' + JSON.stringify({ '@context': 'https://schema.org', '@type': 'CollectionPage', name: X.title, description: metaDesc(X.desc), url: SITE + '/' + HUB + '.html', inLanguage: 'fr', isPartOf: { '@type': 'WebSite', name: 'Leonidakit', url: SITE + '/' }, mainEntity: { '@type': 'ItemList', name: H.sequences.titre, numberOfItems: H.sequences.items.length, itemListElement: H.sequences.items.map((x, i) => ({ '@type': 'ListItem', position: i + 1, name: x.titre, url: SITE + '/' + HUB + '.html#seq-' + x.id })) } }) + '</script>';
  const og = imgOf(MED, X.pile[0].media);
  return page(ROOTC, { p: '', title: X.title + ' | Leonidakit', desc: X.desc, canonical: '/' + HUB + '.html', ogImg: og.b.src, body, crumbs: [['Accueil', '/'], [X.label, '/' + HUB + '.html']], ld: collection });
}

/* zone éditoriale des hubs (même rendu que outils/hubs-monde.cjs) */
function zone(H, STATUTS) {
  const Z = H.zone, para = l => (l || []).map(p => '<p>' + esc(p) + '</p>').join('');
  const srcMap = Object.fromEntries(Z.sources.map(id => [id, H.sources[id]]));
  const out = ['<div class="ed-zone ed-zone--monde">'];
  out.push(S.nav(Z.nav, 'Sections de la page ' + H.hub.label));
  out.push(S.section({ id: 'rockstar', num: 1, kicker: 'Sources officielles', title: 'Ce que Rockstar a montré', icon: 'film', tone: 'paper', lede: esc(Z.rockstar.lede) }, S.timeline(Z.rockstar.items) + para(Z.rockstar.p)));
  out.push(S.section({ id: 'communaute', num: 2, kicker: 'Observations des joueurs', title: 'Ce que la communauté a identifié', icon: 'loupe', tone: 'paper2', accent: 'coral', lede: esc(Z.communaute.lede) }, S.pairs(Z.communaute.pairs, srcMap) + para(Z.communaute.p)));
  out.push(S.section({ id: 'a-confirmer', num: 3, kicker: 'Questions ouvertes', title: 'Ce qui reste à confirmer', icon: 'sablier', tone: 'night', lede: esc(Z.confirmer.lede) }, S.pending(Z.confirmer.items) + para(Z.confirmer.p)));
  out.push(S.section({ id: 'pour-toi', num: 4, kicker: 'Outils du site', title: 'Ce que ça change pour toi', icon: 'boussole', tone: 'paper', lede: esc(Z.toi.lede) }, S.actions(Z.toi.actions.map(a => ({ ...a, href: pinsHref(a) }))) + para(Z.toi.p)));
  out.push(S.section({ id: 'faq', num: 5, kicker: 'Questions', title: 'Questions fréquentes', icon: 'faq', tone: 'paper2' }, '<p>Les questions qu’on tape dans un moteur de recherche, avec des réponses courtes et datées.</p><div class="faq rise">' + Z.faq.map(x => '<details><summary>' + esc(x.q) + '</summary><div class="ans">' + esc(x.a) + '</div></details>').join('') + '</div>'));
  const legend = '<div class="ed-levels">' + STATUTS.map(n => '<div class="ed-level"><h3>' + S.pip(n.statut) + esc(n.titre) + '</h3><p>' + esc(n.texte) + '</p></div>').join('') + '</div>';
  out.push(S.section({ id: 'sources', num: 6, kicker: Z.sources.length + ' sources ouvertes', title: 'Sources et statuts', icon: 'lire', tone: 'night', accent: 'coral', lede: esc(Z.sourcesLede) },
    legend + '<h3 class="ed-h3">Pages consultées</h3>' + sourceList(H, Z.sources) + '<div class="ed-callout"><p><strong>Ce qu’on ne fait pas.</strong> Aucune donnée issue des fuites de 2022 ou de 2026, aucun nom de mission inventé, aucun montant deviné. Les statuts sont expliqués dans le <a href="tuto.html#sources">Tuto</a>.</p></div>'));
  out.push('</div>');
  return out.join('\n');
}

/* ---------- fiche d’une mission (et page de démonstration) ---------- */
function toolOf(M, m) { return (m.calc && m.calc.tool) || (M.types.find(t => t.id === m.type) || {}).calc || 'activities'; }
const CALC = {
  activities: { t: 'Ce que rapporterait cette mission, à l’heure ?', cta: 'Comparer mes activités' },
  order: { t: 'Quoi acheter d’abord après cette mission ?', cta: 'Classer mes achats' },
  goal: { t: 'Combien de temps de jeu pour ton prochain objectif ?', cta: 'Faire le calcul' },
  session: { t: 'Combien de parties pour avancer dans l’histoire ?', cta: 'Compter mes parties' }
};
function calcBridge(M, m, p) {
  const tool = toolOf(M, m), c = CALC[tool], money = known(m.recompenses && m.recompenses.argent), time = known(m.duree);
  const d = money && time ? 'Gain et durée publiés : le calculateur les propose avec leur source. Ajoute tes frais et ta part.' : 'Gain ou durée pas encore publiés. Écris ce que tu imagines : le calculateur compare la mission à tes autres activités, à l’heure de jeu.';
  return '<section class="shell" aria-labelledby="lore-calculator-title"><div class="lk-entry-card"><div><p class="lk-entry-eyebrow">LE CALCULATEUR</p><h2 id="lore-calculator-title">' + esc(c.t) + '</h2><p>' + esc(d) + '</p></div><a class="lk-entry-button" href="' + p + 'calculateurs.html?tool=' + tool + '&amp;from=missions#atelier">' + esc(c.cta) + ' <span aria-hidden="true">↗</span></a></div></section>';
}
function fichePage(ctx, m, opts = {}) {
  const { H, M, MED, ED, SUBC, root } = ctx, p = '../', W = vehiclesAndWeapons(root || ROOT);
  const type = M.types.find(t => t.id === m.type) || { label: m.type };
  const st = b => b && b.statut ? S.pip(b.statut, true) + srcLinks(b.sources || []) : '';
  const R = m.recompenses || {};
  const rows = [
    ['Type', esc(type.label), ''],
    ['Chapitre', esc(m.chapitre && m.chapitre.titre || 'Pas encore publié'), st(m.chapitre)],
    ['Personnages', chips(ED, 'characters', m.personnages, p) || 'Pas encore publiés', ''],
    ['Lieux', (chips(ED, 'regions', m.lieux, p) + (m.carte || []).map(c => '<a class="missions-chip missions-chip--carte" href="' + p + 'carte.html#lieu=' + esc(c.id) + '">' + esc(c.nom) + '</a>').join('')) || 'Pas encore publiés', ''],
    ['Déblocage', esc(m.deblocage && m.deblocage.texte || 'Pas encore publié'), st(m.deblocage)],
    ['Récompense', esc(valText(R.argent, 'Récompense publiée à la sortie')), R.argent && known(R.argent) && R.argent.source ? '<span class="missions-src-txt">' + esc(R.argent.source) + '</span>' : ''],
    ['Durée', esc(valText(m.duree, 'Durée publiée à la sortie')), ''],
    ['Manquable', esc(m.manquable && m.manquable.value === true ? 'Oui' : m.manquable && m.manquable.value === false ? 'Non' : 'À confirmer'), st(m.manquable)]
  ];
  const fact = '<dl class="missions-bref">' + rows.map(([k, v, s]) => '<div><dt>' + k + '</dt><dd>' + v + (s ? ' <span class="missions-st">' + s + '</span>' : '') + '</dd></div>').join('') + '</dl>';
  const objectifs = (m.objectifs || []).length ? '<div class="lore-texte reveal"><h2>Objectifs</h2><ol class="missions-obj">' + m.objectifs.map(o => '<li' + (o.facultatif ? ' class="missions-obj--fac"' : '') + '>' + esc(o.texte) + (o.facultatif ? ' <span class="missions-fac">Facultatif</span>' : '') + '</li>').join('') + '</ol></div>' : '';
  const medailles = (m.medailles || []).length ? '<div class="lore-texte reveal"><h2>Médailles et objectifs facultatifs</h2><ul class="missions-med">' + m.medailles.map(x => '<li>' + esc(x.texte) + ' <span class="missions-st">' + st(x) + '</span></li>').join('') + '</ul></div>' : '';
  const solution = (m.solution || []).length ? '<div class="lore-texte reveal missions-solution"><h2>Solution pas à pas</h2><ol class="missions-etapes">' + m.solution.map((s, i) => '<li class="rise"><span class="missions-etape-n" aria-hidden="true">' + (i + 1) + '</span><div><h3>' + esc(s.titre) + '</h3><p>' + esc(s.texte) + '</p></div></li>').join('') + '</ol></div>' : '';
  const astuces = (m.astuces || []).length ? '<div class="lore-facts"><h2>Astuces</h2><ul>' + m.astuces.map(a => '<li class="rise">' + esc(a) + '</li>').join('') + '</ul></div>' : '';
  const rec = [...(R.vehicules || []).map(id => '<li><a href="' + p + 'vehicules/' + esc(id) + '.html">' + esc(W.vn[id] || id) + '</a></li>'), ...(R.armes || []).map(id => '<li><a href="' + p + 'armes/' + esc(id) + '.html">' + esc(W.an[id] || id) + '</a></li>'), ...(R.proprietes || []).map(t => '<li>' + esc(t) + '</li>'), ...(R.deblocages || []).map(t => '<li>' + esc(t) + '</li>')];
  const recompenses = rec.length ? '<div class="lore-texte reveal"><h2>Ce que la mission débloque</h2><ul class="lore-chips">' + rec.join('') + '</ul>' + (R.statut ? '<p class="missions-st">' + st(R) + '</p>' : '') + '</div>' : '';
  const rel = (group, ids, label) => { const l = (ids || []).map(id => (ED[group] || []).find(y => y.id === id)).filter(Boolean); if (!l.length) return '';
    return '<div class="lore-rel-group"><h3>' + label + '</h3><div class="lore-mini">' + l.map(y => { const mm = (y.media || []).map(id => MED[id]).filter(Boolean)[0]; return '<a class="lore-minicard" href="../' + FOLDER[group] + '/' + y.id + '.html">' + (mm ? '<img src="' + mm.variants[0].src + '" width="' + mm.variants[0].w + '" height="' + mm.variants[0].h + '" alt="" loading="lazy" decoding="async">' : '<i class="lore-minivide"></i>') + '<span><b>' + esc(y.name) + '</b><i>' + esc(label) + '</i></span></a>'; }).join('') + '</div></div>'; };
  const relBlocks = rel('characters', m.personnages, 'Personnages') + rel('regions', m.lieux, 'Régions') + rel('factions', m.gangs, 'Gangs et factions');
  /* case « mission terminée » : gardée sur l’appareil (missions.js, clé lk-missions-terminees-v1) ; sur la page de démonstration, rien n’est enregistré */
  const done = '<div class="missions-fait" data-missions-fait="' + esc(m.id) + '"' + (opts.banner ? ' data-missions-demo' : '') + ' hidden><input type="checkbox" id="missions-fait-' + esc(m.id) + '"><label for="missions-fait-' + esc(m.id) + '">J’ai terminé cette mission</label><span class="missions-fait-note">' + (opts.banner ? 'Démonstration : rien n’est enregistré.' : 'Gardé sur cet appareil seulement.') + '</span></div>';
  const img = (m.media || [])[0];
  const srcs = (m.sources || []).length ? '<section class="shell missions-fiche-src" aria-labelledby="sources-t"><h2 class="sec-h" id="sources-t">Sources</h2>' + sourceList(H, m.sources) + '</section>' : '';
  const banner = opts.banner ? '<div class="shell"><p class="missions-demo" role="note">' + esc(opts.banner) + '</p></div>\n' : '';
  const body = `${banner}<section class="page-head shell">
  <nav class="crumbs" aria-label="Fil d’Ariane"><a href="../index.html">Accueil</a> / <a href="../${HUB}.html">${esc(H.hub.label)}</a> / <span>${esc(m.nom)}</span></nav>
  <div class="lore-hero lore-enter">
    <div class="lore-copy">
      <p class="fiche-cat">${esc(type.label)} · GTA VI</p>
      <h1>${esc(m.nom)}</h1>
      ${m.tagline ? `<p class="lore-tag">${esc(m.tagline)}</p>` : ''}
      <p class="lede">${esc(m.resume)}</p>
      ${done}
    </div>
    ${img ? `<figure class="lore-fig">${imgTag(MED, img, m.nom, true)}</figure>` : '<figure class="lore-fig"><div class="lore-vide missions-vide-fig">Visuel officiel à venir</div></figure>'}
  </div>
</section>
${calcBridge(M, m, p)}
<section class="shell lore-body missions-fiche">
  <div class="lore-texte reveal"><h2>La mission en bref</h2>${fact}</div>
  ${objectifs}${medailles}${recompenses}${solution}${astuces}
  ${relBlocks ? `<div class="lore-related"><h2>En lien</h2>${relBlocks}</div>` : ''}
</section>
${srcs}`;
  const og = img ? imgOf(MED, img) : null;
  return page(SUBC, { p, title: m.nom + ' — GTA VI | Leonidakit', desc: m.resume, canonical: '/' + HUB + '/' + m.id + '.html', ogImg: og ? og.b.src : null, body, crumbs: [['Accueil', '/'], [H.hub.label, '/' + HUB + '.html'], [m.nom, '/' + HUB + '/' + m.id + '.html']], noindex: !!opts.noindex });
}

/* ---------- pont avec le calculateur (calculateurs-activites.js) ---------- */
const ACT_ST = { officiel: 'official', official: 'official', verified: 'verified', estimated: 'estimated', unverified: 'unverified' };
const RANK = ['unknown', 'unverified', 'estimated', 'verified', 'official'];
function activitesDe(missions) {
  return missions.filter(m => known(m.recompenses && m.recompenses.argent) && known(m.duree) && m.duree.value > 0).map(m => {
    const r = m.recompenses.argent, d = m.duree, rs = ACT_ST[r.status] || 'unverified', ds = ACT_ST[d.status] || 'unverified';
    const status = RANK[Math.min(RANK.indexOf(rs), RANK.indexOf(ds))];
    const meta = v => ({ status: ACT_ST[v.status] || 'unverified', source: v.source || null, verifiedAt: v.verifiedAt || null, unit: v.unit });
    return { id: 'mission-' + m.id, name: m.nom, reward: { value: r.value, ...meta(r) }, duration: { value: d.value, ...meta(d) }, players: Number.isInteger(m.joueurs) && m.joueurs > 0 ? m.joueurs : null, source: r.source || d.source || null, status, verifiedAt: [r.verifiedAt, d.verifiedAt].filter(Boolean).sort()[0] || null, beginner: null };
  });
}
/* Écrit les activités « mission-* » dans calculateurs-activites.js ; garde les autres entrées ; ne touche pas au fichier s’il n’y a rien à changer. */
function pont(root, missions) {
  const f = path.join(root, 'calculateurs-activites.js'), src = fs.readFileSync(f, 'utf8');
  const m = src.match(/window\.LK_ACTIVITIES = (\[[\s\S]*?\]);\s*$/);
  if (!m) throw new Error('calculateurs-activites.js : tableau window.LK_ACTIVITIES introuvable');
  const current = JSON.parse(m[1]), keep = current.filter(a => !/^mission-/.test(a.id || '')), add = activitesDe(missions);
  const next = [...keep, ...add];
  if (JSON.stringify(next) === JSON.stringify(current)) return { ecrit: false, activites: add.length };
  fs.writeFileSync(f, src.slice(0, m.index) + 'window.LK_ACTIVITIES = ' + (next.length ? JSON.stringify(next, null, 1) : '[]') + ';\n');
  return { ecrit: true, activites: add.length };
}

/* ---------- recherche du site (outils/missions-index.json, lu par sync-site.cjs) ---------- */
function indexEntries(H, M) {
  const n = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  return [{ l: H.hub.title, k: H.hub.label, u: '/' + HUB + '.html', s: n(H.hub.title + ' ' + H.hub.label + ' missions solutions histoire chapitres braquages jason lucia raul brian boobie extended look trailer guide soluce leonida gta vi ' + H.sequences.items.map(x => x.titre).join(' ')), w: 1 },
    ...M.missions.map(m => ({ l: m.nom, k: (M.types.find(t => t.id === m.type) || {}).label || 'Mission', u: '/' + HUB + '/' + m.id + '.html', s: n(m.nom + ' mission ' + m.resume + ' ' + (m.aliases || []).join(' ')), w: 1 }))];
}

/* ---------- Léo : fiches (missions documentées, morceau « monde ») et questions de la section (morceau leo/missions.json) ---------- */
function leo(root = ROOT) {
  const { H, M, MED } = load(root);
  const image = ids => (ids || []).flatMap(id => (MED[id] && MED[id].variants) || []).map(v => v.src).find(src => fs.existsSync(path.join(root, src.slice(1)))) || null;
  const fiches = M.missions.map(m => ({ key: 'mission:' + m.id, id: m.id, kind: 'mission', shard: 'monde', name: m.nom, aliases: m.aliases || [], category: 'Mission · ' + ((M.types.find(t => t.id === m.type) || {}).label || ''), url: '/' + HUB + '/' + m.id + '.html', image: image(m.media), calcId: null, price: null, proof: 'Mission documentée ; sources datées sur la fiche.', source: null, verifiedAt: null, description: m.resume }));
  const label = H.hub.label, verifiedAt = Object.values(H.sources).map(s => s.consultedAt).sort().pop();
  const topics = H.zone.faq.filter(x => !x.leo).map((x, i) => ({ id: 'missions-faq-' + (i + 1), q: x.q, f: [x.q, ...(x.f || [])], k: x.k, text: x.a, status: 'Réponse de la FAQ « ' + label + ' », sources en bas de la page', links: [{ label: 'La FAQ et ses sources', url: '/' + HUB + '.html#faq' }], verifiedAt, min: Number.isInteger(x.min) ? x.min : 2 }));
  return { fiches, topics, suggestions: { missions: H.leo.suggestions }, inputs: Object.values(FILES) };
}

/* ---------- génération ---------- */
function context(root = ROOT) { const L = load(root); return { ...L, root, ROOTC: chromeOf(L.read('a-propos.html')), SUBC: chromeOf(L.read('vehicules/karin-sultan.html')) }; }
function generate(root = ROOT) {
  const ctx = context(root), L = ctx;
  check(ctx);
  fs.writeFileSync(path.join(root, HUB + '.html'), hubPage(ctx));
  fs.mkdirSync(path.join(root, HUB), { recursive: true });
  const keep = new Set([...L.M.missions.map(m => m.id + '.html'), 'modele.html']);
  for (const f of fs.readdirSync(path.join(root, HUB))) if (f.endsWith('.html') && !keep.has(f)) fs.unlinkSync(path.join(root, HUB, f));
  for (const m of L.M.missions) fs.writeFileSync(path.join(root, HUB, m.id + '.html'), fichePage(ctx, m));
  fs.writeFileSync(path.join(root, HUB, 'modele.html'), fichePage(ctx, L.MO.mission, { noindex: true, banner: L.MO.bandeau }));
  fs.writeFileSync(path.join(root, 'outils/missions-index.json'), JSON.stringify(indexEntries(L.H, L.M)));
  const b = pont(root, L.M.missions);
  console.log('missions : ' + L.M.missions.length + ' mission(s) documentée(s), ' + L.H.sequences.items.length + ' séquences montrées, page modèle (noindex), ' + L.H.zone.faq.length + ' questions, ' + L.H.zone.sources.length + ' sources ; calculateur : ' + b.activites + ' activité(s) de mission' + (b.ecrit ? ' (calculateurs-activites.js mis à jour)' : ''));
}

module.exports = { generate, context, leo, load, check, checkMission, checkValue, fichePage, hubPage, activitesDe, pont, indexEntries, toolOf, FILES };
if (require.main === module) generate();
