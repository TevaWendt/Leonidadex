#!/usr/bin/env node
'use strict';
/* Section « GTA Online » (section online) : génère online.html, les pages online/<id>.html qui ont dès aujourd’hui du contenu
   sourcé (outils/online/pages.json : annonces, GTA Online actuel), une page par activité, entreprise ou mise à jour du jeu en
   ligne de GTA VI qui a un texte (outils/online/donnees.json, vide au 4 octobre 2026) et outils/online-index.json (recherche
   du site, lu par sync-site.cjs).
   Un espace à part dans le même site : chaque page porte le bandeau « GTA Online, pas l’histoire » et le sommaire de
   l’espace ; le fil d’Ariane des pages de online/ part de « GTA Online » ; couleur d’accent propre (online.css, prise dans
   la palette du site). Les données du jeu en ligne ne se mélangent jamais avec celles de l’histoire : les valeurs chiffrées
   suivent le schéma de outils/donnees-publiees.cjs mais restent dans outils/online/ (ni catalogues, ni achats, ni
   calculateur). L’encart du calculateur de online.html (outil « Est-ce que ça vaut le coup ? ») est posé par sync-site.cjs
   (ligne ENTRY de outils/site-shell.cjs) ; le moteur du calculateur ne change pas.
   leo() rend à outils/gen-leo.cjs les questions de la section (morceau leo/online.json).
   Usage : node outils/gen-online.cjs   (appelé par outils/regenerer.cjs, juste après lore-gen.js) */
const fs = require('node:fs'), path = require('node:path');
const ROOT = path.resolve(__dirname, '..');
const S = require('./sections.cjs');
const LKX = require('./lk-sections.cjs');
const DP = require('./donnees-publiees.cjs');
const esc = S.esc;
const SITE = 'https://www.leonidakit.com', HUB = 'online', ID = 'online';
const FILES = { hub: 'outils/online/hub.json', pages: 'outils/online/pages.json', donnees: 'outils/online/donnees.json' };
const ST = ['officiel', 'vu', 'comm', 'conf'];

function load(root = ROOT) {
  const read = f => fs.readFileSync(path.join(root, f), 'utf8');
  return { H: JSON.parse(read(FILES.hub)), P: JSON.parse(read(FILES.pages)), D: JSON.parse(read(FILES.donnees)), STATUTS: JSON.parse(read('outils/editorial-hubs.json')).statuts, MED: JSON.parse(read('outils/medias-officiels.json')), read };
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
const valText = (v, unknownText) => {
  if (!known(v)) return unknownText;
  const label = DP.STATUS_LABEL[({ officiel: 'official' })[v.status] || v.status] || 'Non confirmé';
  return (v.unit === '$' ? DP.fmt(v.value) + ' $' : DP.fmt(v.value) + ' ' + v.unit) + ' · ' + label;
};

/* ---------- contrôles : une donnée mal formée arrête la génération ---------- */
const KINDS = { activites: { unit: { gain: '$', duree: 'min' } }, achats: { unit: { prix: '$' } }, entreprises: { unit: { prix: '$', revenu: '$/h' } }, misesAJour: { unit: {} } };
function checkItem(kind, x, ctx) {
  const { H } = ctx, err = [], L = kind + ' ' + (x && x.id || '?');
  if (!x || !/^[a-z0-9][a-z0-9-]*$/.test(x.id || '')) return [L + ' : identifiant invalide'];
  if (!x.nom || !x.resume || x.resume.length > 160) err.push(L + ' : nom ou résumé (160 signes au plus)');
  if (!ST.includes(x.statut) || !(x.sources || []).length) err.push(L + ' : statut ou sources');
  for (const id of x.sources || []) if (!H.sources[id]) err.push(L + ' : source inconnue ' + id);
  for (const [k, unit] of Object.entries(KINDS[kind].unit)) err.push(...checkValue(x[k], L + ' ' + k, unit));
  if (kind === 'misesAJour' && !/^\d{4}-\d\d-\d\d$/.test(x.date || '')) err.push(L + ' : date AAAA-MM-JJ');
  return err;
}
const reserved = ctx => new Set(ctx.P.pages.map(p => p.id));
function check(ctx) {
  const { H, P, D } = ctx, err = [];
  for (const [id, s] of Object.entries(H.sources)) {
    if (!/^https:\/\//.test(s.url)) err.push('source ' + id + ' : adresse https attendue');
    if (!s.title || !s.claim) err.push('source ' + id + ' : titre ou résumé manquant');
    if (!/^2026-\d\d-\d\d$/.test(s.consultedAt || '')) err.push('source ' + id + ' : date de consultation manquante');
    if (!ST.includes(s.statut)) err.push('source ' + id + ' : statut inconnu');
    if (s.publishedAt && !/^\d{4}-\d\d-\d\d$/.test(s.publishedAt)) err.push('source ' + id + ' : date de publication mal formée');
  }
  const E = H.espace;
  if (!P.legende || !P.chapitre || !P.suite) err.push('pages : textes communs manquants (legende, chapitre, suite)');
  if (!E.bandeau || !E.bandeau.k || !E.sommaire.length) err.push('espace : bandeau ou sommaire manquant');
  for (const x of E.sommaire) if (!x.label || !/^online(?:\.html(?:#[a-z0-9-]+)?|\/[a-z0-9-]+\.html)$/.test(x.href)) err.push('sommaire : lien hors de l’espace ' + x.href);
  const used = new Set(), ids = new Set();
  for (const p of P.pages) {
    if (!/^[a-z0-9][a-z0-9-]*$/.test(p.id) || ids.has(p.id)) err.push('page ' + p.id + ' : identifiant invalide ou en double'); ids.add(p.id);
    if (!p.titre || !p.lede || !p.desc || p.desc.length > 160) err.push('page ' + p.id + ' : titre, chapeau ou description (160 signes au plus)');
    if (!E.sommaire.some(x => x.href === 'online/' + p.id + '.html')) err.push('page ' + p.id + ' : absente du sommaire de l’espace');
    const items = p.kind === 'annonces' ? p.items : p.blocs.flatMap(b => b.items);
    if (items.length < 3) err.push('page ' + p.id + ' : moins de trois éléments sourcés (page creuse)');
    for (const x of items) { if (!x.texte || !ST.includes(x.statut) || !(x.sources || []).length) err.push('page ' + p.id + ' : élément sans texte, statut ou source'); (x.sources || []).forEach(id => { used.add(id); if (!H.sources[id]) err.push('page ' + p.id + ' : source inconnue ' + id); }); }
    if (p.media && (!ctx.MED[p.media] || !p.alt)) err.push('page ' + p.id + ' : visuel inconnu ou sans texte alternatif');
    if (!p.sectionK || !p.sectionT || (p.kind !== 'annonces' && !p.navLabel)) err.push('page ' + p.id + ' : titre de la partie (sectionK, sectionT, navLabel)');
    if (p.kind === 'annonces') for (const x of p.items) if (!/^\d{4}-\d\d(?:-\d\d)?$/.test(x.date) || !x.dateTexte || !x.qui || !x.titre) err.push('annonce mal formée : ' + (x.titre || '?'));
  }
  for (const href of E.sommaire.map(x => x.href).filter(h => /^online\//.test(h))) if (!ids.has(href.slice(7, -5))) err.push('sommaire : page absente ' + href);
  for (const kind of Object.keys(KINDS)) for (const x of D[kind]) { if (reserved(ctx).has(x.id)) err.push(kind + ' ' + x.id + ' : identifiant déjà pris par une page'); err.push(...checkItem(kind, x, ctx)); }
  /* présentation (écrans défilés) : chaque écran qui affirme quelque chose porte un statut et des sources ; un visuel est un média officiel */
  for (const sc of (H.intro || {}).scenes || []) {
    if (!sc.id || !sc.t || !sc.p) err.push('présentation : écran sans titre ou texte');
    if (sc.statut !== undefined && (!ST.includes(sc.statut) || !(sc.sources || []).length)) err.push('présentation ' + sc.id + ' : statut ou sources');
    for (const id of sc.sources || []) if (!H.sources[id]) err.push('présentation ' + sc.id + ' : source inconnue ' + id);
    if (sc.media && (!ctx.MED[sc.media] || !sc.alt)) err.push('présentation ' + sc.id + ' : visuel inconnu ou sans texte alternatif');
  }
  for (const [id, r] of Object.entries(H.rubriques || {})) { if (r.media && (!ctx.MED[r.media] || !r.alt || !r.legende)) err.push('rubrique ' + id + ' : visuel inconnu ou sans légende'); for (const b of r.blocs || []) if (!P.pages.find(p => p.id === 'gta-online-actuel').blocs.some(x => x.id === b)) err.push('rubrique ' + id + ' : bloc inconnu ' + b); }
  const Z = H.zone;
  for (const k of ['nav', 'rockstar', 'communaute', 'confirmer', 'toi', 'faq', 'sources']) if (!Z[k]) err.push('zone : bloc manquant ' + k);
  Z.sources.forEach(id => { if (!H.sources[id]) err.push('zone : source inconnue ' + id); });
  for (const id of Object.keys(H.sources)) if (!Z.sources.includes(id)) err.push('source jamais listée en bas de page : ' + id);
  for (const p of Z.communaute.pairs) if (!Z.sources.includes(p.src)) err.push('paire sans source de la page : ' + p.fiction);
  for (const x of Z.rockstar.items) if (!ST.includes(x.statut)) err.push('frise : statut ' + x.titre);
  if (Z.faq.length < 4 || Z.faq.length > 6) err.push('la FAQ compte 4 à 6 questions');
  for (const f of Z.faq) if (!f.q || !f.a || f.a.length > 900 || !(f.k || []).length) err.push('FAQ mal formée : ' + f.q);
  for (const a of Z.toi.actions) if (!a.href) err.push('action sans lien : ' + a.t);
  const blocs = [H.etat.carte, ...H.etat.faits, ...H.change.cartes, H.activites.repere, H.achats.repere, H.achats.monetisation];
  for (const x of blocs) { if (!ST.includes(x.statut) || !(x.sources || []).length) err.push('bloc sans statut ou sans source : ' + (x.titre || x.texte || '').slice(0, 40)); x.sources.forEach(id => { if (!H.sources[id]) err.push('bloc : source inconnue ' + id); }); }
  if (H.hub.desc.length > 160) err.push('description du hub trop longue (' + H.hub.desc.length + ' signes)');
  if (err.length) throw new Error('Section online, données à corriger (outils/online/) :\n- ' + err.join('\n- '));
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
function page(C, { p, title, desc, canonical, body, crumbs, ld = '', espace }) {
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
${C.fav}
${bc(crumbs)}${ld ? '\n' + ld : ''}
<link rel="stylesheet" href="${p}style.css">
<link rel="stylesheet" href="${p}motion-tokens.css">
<link rel="stylesheet" href="${p}acquisitions.css">
<link rel="stylesheet" href="${p}online.css">
<link rel="stylesheet" href="${p}lk-sections.css">
<meta property="og:image" content="${SITE}/img/social-card.png">
<meta name="twitter:card" content="summary_large_image">
<meta property="og:url" content="${SITE}${canonical}">
</head>
<body>

<a class="skip" href="#main">Aller au contenu</a>
<div class="sunset" aria-hidden="true"></div>

${C.header.replace(/ class="here"/g, '')}

<main id="main" class="lore-page online-page lkx-page">
${espace}
${body}
${EXPLORE(p ? '../' : '')}
<section class="lk-outro" aria-label="Et après"><div class="shell lk-outro-in"><p class="lk-outro-k">Et après ?</p><h2>La suite s’écrit le 19 novembre 2026.</h2><p>Chaque fiche se complète avec le jeu : ce qu’on y trouve, ce qu’on y fait, ce que ça rapporte. Rien d’inventé d’ici là.</p><div class="lk-outro-links"><a href="${p ? '../' : ''}carte.html">Ouvrir la carte</a><a href="${p ? '../' : ''}progression.html">Ma progression</a></div></div></section>
${LKX.dialog()}
</main>

${C.footer}

${C.scripts}
<script src="${p}online.js"></script>
<script src="${p}lk-sections.js"></script>
</body>
</html>
`;
}

/* ---------- l’espace : bandeau « GTA Online, pas l’histoire » et sommaire, sur chaque page ---------- */
function espace(H, current, pre) {
  const E = H.espace;
  const link = x => '<a href="' + pre + esc(x.href) + '"' + (x.id === current ? ' aria-current="page"' : '') + (x.href.includes('#') ? ' data-online-ancre="' + esc(x.href.split('#')[1]) + '"' : '') + '>' + esc(x.label) + '</a>';
  return '<div class="online-espace" data-online-espace><div class="shell online-espace-in">'
    + '<p class="online-bandeau" role="note"><span class="online-bandeau-k">' + esc(E.bandeau.k) + '</span><span class="online-bandeau-t">' + esc(E.bandeau.texte) + '</span> <a href="' + pre + esc(E.bandeau.lien.href) + '">' + esc(E.bandeau.lien.label) + '</a></p>'
    + '<nav class="online-nav" aria-label="' + esc(E.sommaireLabel) + '">' + E.sommaire.map(link).join('') + '</nav></div></div>';
}
/* figure décorative de l’espace : un réseau de joueurs, dessiné pour le site */
const SIGNAL = (() => {
  const N = [[40, 52], [96, 28], [158, 64], [222, 34], [282, 70], [70, 132], [140, 150], [210, 124], [268, 160], [168, 102]];
  const E = [[0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [2, 9], [9, 7], [9, 6], [3, 9], [4, 8], [1, 9]];
  return '<div class="online-signal" aria-hidden="true"><svg viewBox="0 0 320 190" focusable="false">'
    + '<g class="online-liens">' + E.map(([a, b], i) => '<line x1="' + N[a][0] + '" y1="' + N[a][1] + '" x2="' + N[b][0] + '" y2="' + N[b][1] + '" style="--i:' + i + '"/>').join('') + '</g>'
    + '<g class="online-noeuds">' + N.map(([x, y], i) => '<circle class="online-noeud' + (i === 9 ? ' online-noeud--centre' : '') + '" cx="' + x + '" cy="' + y + '" r="' + (i === 9 ? 9 : 5) + '" style="--i:' + i + '"/>').join('') + '</g>'
    + '</svg><span class="online-signal-k">GTA Online</span></div>';
})();

/* ---------- briques ---------- */
function sourceList(H, ids) {
  return '<ol class="ed-srcs">' + ids.map(id => { const s = H.sources[id];
    return '<li id="src-' + esc(id) + '">' + S.pip(s.statut, true)
      + '<a class="ed-src-link" href="' + esc(s.url) + '" target="_blank" rel="noopener nofollow"' + (s.lang === 'en' ? ' translate="no"' : '') + '>' + esc(s.title) + '</a>'
      + '<span class="ed-src-meta">' + (s.publisher ? '<span translate="no">' + esc(s.publisher.split(',')[0]) + '</span>' + (s.publisher.includes(',') ? esc(s.publisher.slice(s.publisher.indexOf(','))) : '') + ' · ' : '') + (s.publishedAt ? 'publié le ' + esc(frDate(s.publishedAt)) + ' · ' : '') + 'consulté le ' + esc(frDate(s.consultedAt)) + '</span>'
      + '<p>' + esc(s.claim) + '</p></li>'; }).join('') + '</ol>';
}
const srcLinks = (ids, pre = '') => ids.length ? '<span class="online-src">' + ids.map((id, i) => '<a href="' + pre + '#src-' + esc(id) + '" aria-label="Source ' + (i + 1) + '">' + (i + 1) + '</a>').join('') + '</span>' : '';
const st = (statut, ids, pre) => '<span class="online-st">' + S.pip(statut, true) + srcLinks(ids || [], pre) + '</span>';
const head = (k, t, id, lede) => '<div class="reveal"><p class="online-kicker">' + esc(k) + '</p><h2 class="sec-h" id="' + id + '-t">' + esc(t) + '</h2>' + (lede ? '<p class="online-lede">' + esc(lede) + '</p>' : '') + '</div>';
/* listes du jeu en ligne de GTA VI (vides au 4 octobre 2026) */
function rows(D, kind, pre) {
  const list = kind === 'misesAJour' ? [...D[kind]].sort((a, b) => b.date.localeCompare(a.date)) : D[kind];
  if (!list.length) return '';
  const val = x => kind === 'activites' ? [valText(x.gain, 'Gain publié plus tard'), valText(x.duree, 'Durée publiée plus tard')] : kind === 'achats' ? [valText(x.prix, 'Prix publié plus tard')] : kind === 'entreprises' ? [valText(x.prix, 'Prix publié plus tard'), valText(x.revenu, 'Revenu publié plus tard')] : [frDate(x.date)];
  return '<ul class="online-items lkx-wave lk-arrive" data-lkx-in>' + list.map(x => '<li><h3>' + (x.texte ? '<a href="' + pre + HUB + '/' + esc(x.id) + '.html">' + esc(x.nom) + '</a>' : esc(x.nom)) + '</h3><p>' + esc(x.resume) + '</p><p class="online-vals">' + val(x).map(v => '<span>' + esc(v) + '</span>').join('') + '</p><p>' + st(x.statut, x.sources) + '</p></li>').join('') + '</ul>';
}

/* ---------- hub ---------- */
/* rubrique encore vide : le texte « rien de publié » reste dans la page ; à côté, une carte ouvre en plein écran le
   squelette de ses fiches (ce que chacune dira, en attente de la sortie) */
function rubrique(ctx, id, R, vide, champs, icon) {
  const { H, P, MED } = ctx, C = H.champs, f = C.items.filter(x => champs.includes(x.t)), ico = S.icon(icon) || LKX.ICO.page, V = (H.rubriques || {})[id] || {}, ok = !!(V.media && MED[V.media]);
  const actuel = P.pages.find(p => p.id === 'gta-online-actuel');
  const blocs = (V.blocs || []).map(b => actuel.blocs.find(x => x.id === b)).filter(Boolean);
  /* le bouton « Aperçu de la fiche » ouvre la fiche en plein écran (details + lk-sections.js) */
  const summary = '<span class="lkx-btn lkx-btn--night online-dossier-btn">' + esc(C.apercuGo) + '</span>';
  const body = (V.apercu ? '<p>' + esc(V.apercu) + '</p>' : '') + '<p class="lkx-sheet-vide">' + esc(R.vide) + '</p>'
    + (blocs.length ? '<h4><span class="online-v">GTA V</span> ' + esc(V.repereTitre || 'Dans le GTA Online actuel') + '</h4><ul class="online-sheet-l">' + blocs.flatMap(b => b.items).map(x => '<li>' + (x.titre ? '<b translate="no">' + esc(x.titre) + '</b> ' : '') + esc(x.texte) + ' ' + st(x.statut, x.sources) + '</li>').join('') + '</ul>' : '')
    + (R.repere ? '<p class="online-sheet-r"><span class="online-v">GTA V</span> ' + esc(R.repere.texte) + ' ' + st(R.repere.statut, R.repere.sources) + '</p>' : '')
    + '<h4>' + esc(C.titre) + '</h4>' + LKX.skel(f, C.sortie)
    + '<div class="lkx-sheet-cta"><a class="lkx-btn lkx-btn--night" href="online/gta-online-actuel.html">' + esc(H.espace.sommaire.find(x => x.id === 'gta-online-actuel').label) + '</a><a class="lkx-btn lkx-btn--ghost" href="online/annonces.html">' + esc(H.zone.toi.actions.find(a => a.href === 'online/annonces.html').t) + '</a></div>';
  const sheet = LKX.sheet({ id: 'apercu-' + id, cls: 'online-apercu', summary, fig: ok ? LKX.img(MED, V.media, V.alt, { big: true, sizes: '(max-width:760px) 100vw, 600px' }) : '', caption: ok ? V.legende : '', icon: ico, kicker: esc(C.apercuK) + ' · <span>' + esc(R.kicker) + '</span>', title: R.titre, body });
  /* le dossier de la rubrique : grand visuel officiel (dit « illustration »), texte propre, l’état d’aujourd’hui, la fiche */
  return '<div class="online-dossier lkx-net lk-arrive" data-lkx-in>'
    + '<figure class="online-dossier-fig">' + (ok ? LKX.img(MED, V.media, V.alt, { big: true, sizes: '(max-width:820px) 100vw, 640px' }) : '<span class="online-dossier-ico" aria-hidden="true">' + ico + '</span>') + (ok ? '<figcaption>' + esc(V.legende) + '</figcaption>' : '') + '</figure>'
    + '<div class="online-dossier-body">' + (V.apercu ? '<p class="online-dossier-p">' + esc(V.apercu) + '</p>' : '') + vide
    + '<div class="online-dossier-cta">' + sheet + '<a class="lkx-btn lkx-btn--ghost" href="online/gta-online-actuel.html">' + esc(H.espace.sommaire.find(x => x.id === 'gta-online-actuel').label) + '</a></div></div></div>';
}
/* présentation de l’espace : des écrans plein cadre qui se lisent en défilant (online.js pose --p, la progression de
   chaque écran, et --cp celle de l’ensemble ; sans script ou en mouvement réduit, tout est affiché, rien ne colle).
   Chaque écran qui affirme quelque chose porte son statut et ses sources ; le dernier conduit à l’information claire. */
/* réseau de joueurs plein cadre (décoratif) : nœuds sur une grille un peu déformée, chaque nœud relié à ses deux voisins
   les plus proches ; les traits se dessinent en défilant (pathLength, online.css) */
const SIGNAL_BIG = (() => {
  const N = []; let seed = 7; const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  for (let r = 0; r < 5; r++) for (let c = 0; c < 7; c++) N.push([Math.round(90 + c * 210 + (rnd() - .5) * 110), Math.round(90 + r * 180 + (rnd() - .5) * 90)]);
  const E = [], has = new Set();
  N.forEach((a, i) => { N.map((b, k) => [k, (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2]).filter(x => x[0] !== i).sort((x, y) => x[1] - y[1]).slice(0, 2).forEach(([k]) => { const key = i < k ? i + '-' + k : k + '-' + i; if (!has.has(key)) { has.add(key); E.push([i, k]); } }); });
  const centre = 17;
  return '<div class="online-signal online-signal--big" aria-hidden="true"><svg viewBox="0 0 1440 820" preserveAspectRatio="xMidYMid slice" focusable="false">'
    + '<g class="online-liens">' + E.map(([a, b], i) => '<line x1="' + N[a][0] + '" y1="' + N[a][1] + '" x2="' + N[b][0] + '" y2="' + N[b][1] + '" pathLength="1" style="--i:' + i + '"/>').join('') + '</g>'
    + '<g class="online-noeuds">' + N.map(([x, y], i) => '<circle class="online-noeud' + (i === centre ? ' online-noeud--centre' : '') + '" cx="' + x + '" cy="' + y + '" r="' + (i === centre ? 16 : 7) + '" style="--i:' + i + '"/>').join('') + '</g>'
    + '</svg><span class="online-signal-k">GTA Online</span></div>';
})();
function cine(ctx) {
  const { H, MED } = ctx, I = H.intro, X = H.hub, n = I.scenes.length, pad = k => String(k).padStart(2, '0');
  const bg = (id, alt, eager, cls) => MED[id] ? '<div class="online-scene-bg' + (cls ? ' ' + cls : '') + '" aria-hidden="true">' + LKX.img(MED, id, alt, { big: true, sizes: '100vw', eager }) + '</div>' : '';
  const scene = (sc, i) => {
    let art = '';
    if (sc.media && MED[sc.media] && !sc.fond) art = '<figure class="online-scene-fig">' + bg(sc.media, sc.alt, i === 0) + '<figcaption>' + esc(MED[sc.media].credit || 'Visuel officiel Rockstar Games') + '</figcaption></figure>';
    else if (sc.media && MED[sc.media] && sc.fond) art = bg(sc.media, sc.alt, false, 'online-scene-bg--fond');
    if (sc.signal) art += SIGNAL_BIG;
    if (sc.id === 'rien') art += '<div class="online-scene-art online-scene-art--vide" aria-hidden="true"><span class="online-vide-q">?</span><span class="online-vide-bar"></span><span class="online-vide-l">' + esc(I.vide) + '</span></div>';
    if (sc.id === '2027') art += '<div class="online-scene-art online-scene-art--date" aria-hidden="true" translate="no"><span class="online-flap"><span class="online-flap-s"><b>2026</b><b>2027</b></span></span><span class="online-flap-q">?</span></div>';
    if (sc.cta) art += '<div class="online-scene-art online-scene-art--pret" aria-hidden="true" translate="no"><span class="online-pret-plate"><span class="brand">Leonida<span>kit</span></span><span class="online-pret-bars"><i></i><i></i><i></i></span></span></div>';
    return '<section class="online-scene online-scene--' + esc(sc.id) + (sc.media && !sc.fond ? ' online-scene--img' : '') + '" id="ecran-' + esc(sc.id) + '" data-online-scene style="--i:' + (i + 1) + '" aria-labelledby="scene-' + esc(sc.id) + '-t"><div class="online-scene-in">' + art
      + '<div class="online-scene-txt"><p class="online-scene-k"><span class="online-scene-n" aria-hidden="true" translate="no">' + pad(i + 1) + ' / ' + pad(n) + '</span> <span>' + esc(sc.k) + '</span></p>'
      + '<h2 class="online-scene-t" id="scene-' + esc(sc.id) + '-t">' + esc(sc.t) + '</h2>'
      + '<p class="online-scene-p">' + esc(sc.p) + '</p>'
      + (sc.statut ? '<p class="online-scene-st">' + st(sc.statut, sc.sources) + '</p>' : '')
      + (sc.cta ? '<p class="online-scene-cta"><a class="lkx-btn" href="' + esc(sc.cta.href) + '">' + esc(sc.cta.label) + '</a></p>' : '') + '</div></div></section>';
  };
  const rail = '<nav class="online-rail" aria-label="' + esc(I.rail) + '" data-online-rail><ol>' + I.scenes.map((sc, i) => '<li><a href="#ecran-' + esc(sc.id) + '" data-online-go="' + (i + 1) + '" aria-label="' + esc(sc.t) + '"><span translate="no" aria-hidden="true">' + pad(i + 1) + '</span></a></li>').join('') + '</ol></nav>';
  return '<div class="online-cine lk-arrive" id="presentation" data-online-cine style="--n:' + (n + 1) + '"><div class="online-stage" data-online-stage>'
    + '<section class="page-head lk-glow online-scene online-scene--hero" data-online-scene style="--i:0" aria-labelledby="online-h1"><div class="online-scene-in online-scene-in--hero">' + bg(I.media, I.alt, true, 'online-scene-bg--hero')
    + '<div class="online-cine-bg" aria-hidden="true"><div class="online-cine-grid"></div><div class="online-cine-glow"></div><div class="online-cine-scan"></div></div>'
    + '<p class="online-ghost" aria-hidden="true" translate="no">GTA Online · GTA Online · GTA Online · GTA Online</p>'
    + '<div class="online-scene-txt online-scene-txt--hero"><p class="fiche-cat"><span class="online-marque"><span class="brand" translate="no">Leonida<span>kit</span></span> · <span>' + esc(I.marque) + '</span></span></p>'
    + '<h1 id="online-h1">' + esc(X.title) + '</h1>'
    + '<p class="lede">' + esc(X.lede) + '</p><p class="d-intro-note">' + esc(X.note) + ' <a href="tuto.html#sources">Comprendre les statuts</a>.</p>'
    + '<p class="online-defiler" aria-hidden="true">' + esc(I.defiler) + '<i></i></p><p class="online-passer"><a href="#etat">' + esc(I.passer) + '</a></p></div></div></section>'
    + I.scenes.map(scene).join('') + rail + '</div></div>';
}
function hubPage(ctx) {
  const { H, P, D, STATUTS, ROOTC } = ctx, X = H.hub, E = H.etat, CH = H.change;
  const fait = x => '<article class="online-fait"><span class="online-fait-ico">' + S.icon(x.icon) + '</span><h3>' + esc(x.titre) + '</h3><p>' + esc(x.texte) + '</p><p>' + st(x.statut, x.sources) + '</p></article>';
  const etat = '<section class="shell online-sec" id="etat" aria-labelledby="etat-t">' + head(E.kicker, E.titre, 'etat')
    + '<div class="online-statut rise"><span class="online-statut-ico" aria-hidden="true">' + S.icon('sablier') + '</span><div><p class="online-statut-date">' + esc(E.carte.date) + '</p><h3>' + esc(E.carte.titre) + '</h3><p>' + esc(E.carte.texte) + '</p><p>' + st(E.carte.statut, E.carte.sources) + '</p></div></div>'
    + '<div class="online-faits lkx-net lk-arrive" data-lkx-in>' + E.faits.map(fait).join('') + '</div></section>';
  const change = '<section class="shell online-sec" id="ce-qui-change" aria-labelledby="ce-qui-change-t">' + head(CH.kicker, CH.titre, 'ce-qui-change', CH.lede)
    + '<div class="online-cotes lkx-net lk-arrive" data-lkx-in>' + CH.cartes.map((x, i) => '<article class="online-cote online-cote--' + (i + 1) + '"><p class="online-cote-k">' + esc(x.k) + '</p><h3>' + esc(x.titre) + '</h3><p>' + esc(x.texte) + '</p><p>' + st(x.statut, x.sources) + '</p><p class="online-liens-l">' + x.liens.map(l => '<a href="' + esc(l.href) + '">' + esc(l.label) + '</a>').join('') + '</p></article>').join('') + '</div>'
    + '<p class="online-regle">' + esc(CH.regle) + '</p></section>';
  const A = H.activites, AC = H.achats, M = H.misesAJour;
  const repere = r => '<p class="online-repere"><span class="online-v">GTA V</span> ' + esc(r.texte) + ' ' + st(r.statut, r.sources) + '</p>';
  const activites = '<section class="shell online-sec" id="activites" aria-labelledby="activites-t">' + head(A.kicker, A.titre, 'activites')
    + (D.activites.length ? rows(D, 'activites', '') : rubrique(ctx, 'activites', A, '<p class="online-vide">' + esc(A.vide) + '</p>', ['Activités'], 'zone')) + repere(A.repere) + '</section>';
  const achats = '<section class="shell online-sec" id="achats" aria-labelledby="achats-t">' + head(AC.kicker, AC.titre, 'achats')
    + (D.achats.length || D.entreprises.length ? rows(D, 'achats', '') + rows(D, 'entreprises', '') : rubrique(ctx, 'achats', AC, '<p class="online-vide">' + esc(AC.vide) + ' <a href="achats.html">Les achats de l’histoire</a></p>', ['Achats', 'Entreprises'], 'achats'))
    + repere(AC.repere) + '<p class="online-repere">' + esc(AC.monetisation.texte) + ' ' + st(AC.monetisation.statut, AC.monetisation.sources) + '</p></section>';
  const actuel = P.pages.find(p => p.id === 'gta-online-actuel'), maj = actuel ? actuel.blocs.find(b => b.id === 'mises-a-jour') : null;
  const misesAJour = '<section class="shell online-sec" id="mises-a-jour" aria-labelledby="mises-a-jour-t">' + head(M.kicker, M.titre, 'mises-a-jour')
    + (D.misesAJour.length ? rows(D, 'misesAJour', '') : rubrique(ctx, 'mises-a-jour', M, '<p class="online-vide">' + esc(M.vide) + '</p>', ['Mises à jour'], 'horloge'))
    + (maj ? '<h3 class="online-sous-t">' + esc(M.titreActuel) + '</h3><ul class="online-items lkx-net lk-arrive" data-lkx-in>' + maj.items.filter(x => x.titre).map(x => '<li><span class="online-v">GTA V</span><h3 translate="no">' + esc(x.titre) + '</h3><p>' + esc(x.texte) + '</p><p>' + st(x.statut, x.sources) + '</p></li>').join('') + '</ul><p class="online-plus"><a href="online/gta-online-actuel.html#mises-a-jour">Le GTA Online actuel en détail</a></p>' : '')
    + '<h3 class="online-sous-t">' + esc(H.champs.titre) + '</h3><dl class="online-champs lkx-net lk-arrive" data-lkx-in>' + H.champs.items.map((x, i) => '<div><dt><span class="online-champs-n" aria-hidden="true" translate="no">' + String(i + 1).padStart(2, '0') + '</span>' + esc(x.t) + '</dt><dd>' + esc(x.d) + '</dd></div>').join('') + '</dl></section>';
  const body = `${cine(ctx)}
${etat}
${change}
${activites}
${achats}
${misesAJour}
${zone(H, STATUTS)}`;
  const collection = '<script type="application/ld+json">' + JSON.stringify({ '@context': 'https://schema.org', '@type': 'CollectionPage', name: X.title, description: metaDesc(X.desc), url: SITE + '/' + HUB + '.html', inLanguage: 'fr', isPartOf: { '@type': 'WebSite', name: 'Leonidakit', url: SITE + '/' }, hasPart: P.pages.map(p => ({ '@type': 'WebPage', name: p.titre, url: SITE + '/' + HUB + '/' + p.id + '.html' })) }) + '</script>';
  return page(ROOTC, { p: '', title: X.title + ' | Leonidakit', desc: X.desc, canonical: '/' + HUB + '.html', body, crumbs: [['Accueil', '/'], [X.label, '/' + HUB + '.html']], ld: collection, espace: espace(H, 'accueil', '') });
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
  out.push(S.section({ id: 'pour-toi', num: 4, kicker: 'Outils du site', title: 'Ce que ça change pour toi', icon: 'boussole', tone: 'paper', lede: esc(Z.toi.lede) }, S.actions(Z.toi.actions) + para(Z.toi.p)));
  out.push(S.section({ id: 'faq', num: 5, kicker: 'Questions', title: 'Questions fréquentes', icon: 'faq', tone: 'paper2' }, '<p>Les questions qu’on tape dans un moteur de recherche, avec des réponses courtes et datées.</p><div class="faq rise">' + Z.faq.map(x => '<details><summary>' + esc(x.q) + '</summary><div class="ans">' + esc(x.a) + '</div></details>').join('') + '</div>'));
  const legend = '<div class="ed-levels">' + STATUTS.map(n => '<div class="ed-level"><h3>' + S.pip(n.statut) + esc(n.titre) + '</h3><p>' + esc(n.texte) + '</p></div>').join('') + '</div>';
  out.push(S.section({ id: 'sources', num: 6, kicker: Z.sources.length + ' sources ouvertes', title: 'Sources et statuts', icon: 'lire', tone: 'night', accent: 'coral', lede: esc(Z.sourcesLede) },
    legend + '<h3 class="ed-h3">Pages consultées</h3>' + sourceList(H, Z.sources) + '<div class="ed-callout"><p><strong>Ce qu’on ne fait pas.</strong> Aucune donnée issue des fuites de 2022 ou de 2026, aucun chiffre du jeu en ligne mêlé à ceux de l’histoire, aucune date devinée. Les statuts sont expliqués dans le <a href="tuto.html#sources">Tuto</a>.</p></div>'));
  out.push('</div>');
  return out.join('\n');
}

/* ---------- pages de l’espace (online/<id>.html) ----------
   Même charte que la présentation du hub : un bandeau de nuit plein cadre avec un visuel officiel (dit « illustration »),
   titre géant, les chiffres de la page (comptés, jamais écrits à la main) ; puis l’information nette. Les annonces : une
   chronologie numérotée (date, qui parle, titre, texte, statut, sources). Le GTA Online actuel : des chapitres numérotés,
   titre collé à gauche en défilant, chaque repère en carte numérotée ; l’illustration d’une rubrique du hub accompagne le
   premier chapitre qu’elle couvre (hub.json « rubriques »). */
function subPage(ctx, pg) {
  const { H, P, MED, SUBC } = ctx, p = '../', pad = k => String(k).padStart(2, '0');
  const items = pg.kind === 'annonces' ? pg.items : pg.blocs.flatMap(b => b.items);
  const ids = [...new Set(items.flatMap(x => x.sources))];
  const ok = !!(pg.media && MED[pg.media]);
  const chiffre = (n, t) => '<li><b translate="no">' + n + '</b><span>' + esc(t) + '</span></li>';
  const chiffres = pg.kind === 'annonces'
    ? [chiffre(pg.items.length, 'annonces'), chiffre(pg.items.filter(x => x.statut === 'officiel').length, 'officielles'), chiffre(ids.length, 'sources')]
    : [chiffre(pg.blocs.length, 'chapitres'), chiffre(items.length, 'repères'), chiffre(ids.length, 'sources')];
  const hero = '<section class="page-head online-hero lk-arrive" aria-labelledby="online-h1">'
    + (ok ? '<figure class="online-hero-fig">' + LKX.img(MED, pg.media, pg.alt, { big: true, sizes: '100vw', eager: true }) + '<figcaption><span>' + esc(P.legende) + '</span><span translate="no">' + esc(MED[pg.media].credit || 'Rockstar Games') + '</span></figcaption></figure>' : '')
    + '<div class="online-cine-bg online-hero-fx" aria-hidden="true"><div class="online-cine-grid"></div><div class="online-cine-glow"></div><div class="online-cine-scan"></div></div>'
    + '<div class="shell online-hero-in"><nav class="crumbs online-crumbs" aria-label="Fil d’Ariane"><a href="../' + HUB + '.html">' + esc(H.espace.nom) + '</a> / <span>' + esc(pg.label) + '</span></nav>'
    + '<div class="lore-copy lore-enter"><p class="fiche-cat"><span class="online-marque"><span class="brand" translate="no">Leonida<span>kit</span></span> · <span>' + esc(H.intro.marque) + '</span></span></p>'
    + '<h1 id="online-h1">' + esc(pg.titre) + '</h1><p class="lede">' + esc(pg.lede) + '</p>'
    + '<ul class="online-hero-chiffres">' + chiffres.join('') + '</ul></div></div></section>';
  /* la suite : ce qu’on sait en clair, l’autre page de l’espace, la FAQ */
  const pret = H.intro.scenes.find(sc => sc.cta), autre = pg.kind === 'annonces' ? ['gta-online-actuel.html', H.espace.sommaire.find(x => x.id === 'gta-online-actuel').label] : ['annonces.html', H.zone.toi.actions.find(a => a.href === 'online/annonces.html').t];
  const suite = '<div class="online-suite reveal"><p class="online-kicker">' + esc(P.suite) + '</p><ul class="online-suite-l"><li><a class="lkx-btn lkx-btn--night" href="../' + HUB + '.html#etat">' + esc(pret.cta.label) + '</a></li><li><a class="lkx-btn lkx-btn--ghost" href="' + autre[0] + '">' + esc(autre[1]) + '</a></li><li><a class="lkx-btn lkx-btn--ghost" href="../' + HUB + '.html#faq">Les questions fréquentes</a></li></ul></div>';
  let content;
  if (pg.kind === 'annonces') {
    content = '<section class="shell online-sec online-page-annonces" aria-labelledby="chrono-t">' + head(pg.sectionK, pg.sectionT, 'chrono')
      + '<ol class="online-chrono lkx-wave lk-arrive" data-lkx-in>' + pg.items.map((x, i) => '<li class="online-annonce" id="annonce-' + (i + 1) + '"><div class="online-annonce-date"><span class="online-annonce-n" aria-hidden="true" translate="no">' + pad(i + 1) + '</span><time datetime="' + esc(x.date) + '">' + esc(x.dateTexte) + '</time></div>'
        + '<div class="online-annonce-body"><p class="online-annonce-qui">' + esc(x.qui) + '</p><h3>' + esc(x.titre) + '</h3><p class="online-annonce-p">' + esc(x.texte) + '</p><p>' + st(x.statut, x.sources) + '</p></div></li>').join('') + '</ol>' + suite + '</section>';
  } else {
    const n = pg.blocs.length, rub = Object.values(H.rubriques || {});
    const chap = (b, i) => {
      const R = rub.find(r => (r.blocs || [])[0] === b.id), fig = R && R.media && MED[R.media] ? '<figure class="online-chap-fig">' + LKX.img(MED, R.media, R.alt, { big: true, sizes: '(max-width:820px) 100vw, 440px' }) + '<figcaption>' + esc(R.legende) + '</figcaption></figure>' : '';
      return '<section class="online-chap" id="' + esc(b.id) + '" aria-labelledby="' + esc(b.id) + '-t"><div class="online-chap-head reveal"><p class="online-chap-k"><span class="online-chap-n" aria-hidden="true" translate="no">' + pad(i + 1) + ' / ' + pad(n) + '</span> <span>' + esc(P.chapitre) + '</span></p><h2 class="sec-h" id="' + esc(b.id) + '-t">' + esc(b.titre) + '</h2>' + fig + '</div>'
        + '<ol class="online-reps lkx-net lk-arrive" data-lkx-in>' + b.items.map((x, j) => '<li class="online-rep"><span class="online-rep-n" aria-hidden="true" translate="no">' + pad(j + 1) + '</span>' + (x.titre ? '<p class="online-rep-k"><span class="online-v">GTA V</span></p><h3 translate="no">' + esc(x.titre) + '</h3>' : '') + '<p class="online-rep-p">' + esc(x.texte) + '</p><p>' + st(x.statut, x.sources) + '</p></li>').join('') + '</ol></section>';
    };
    content = '<section class="shell online-sec online-page-gta-online-actuel" aria-labelledby="chapitres-t">' + head(pg.sectionK, pg.sectionT, 'chapitres')
      + '<nav class="online-chapitres reveal" aria-label="' + esc(pg.navLabel) + '"><ol>' + pg.blocs.map((b, i) => '<li><a href="#' + esc(b.id) + '"><span aria-hidden="true" translate="no">' + pad(i + 1) + '</span>' + esc(b.titre) + '</a></li>').join('') + '</ol></nav>'
      + pg.blocs.map(chap).join('') + suite + '</section>';
  }
  const body = hero + '\n' + content + '\n<section class="shell online-sec online-fiche-src" aria-labelledby="sources-t"><div class="reveal"><p class="online-kicker">' + ids.length + ' sources ouvertes</p><h2 class="sec-h" id="sources-t">Sources</h2></div>' + sourceList(H, ids) + '<p class="online-plus">Les statuts sont expliqués dans le <a href="../tuto.html#sources">Tuto</a>.</p></section>';
  const ld = pg.kind === 'annonces' ? '<script type="application/ld+json">' + JSON.stringify({ '@context': 'https://schema.org', '@type': 'ItemList', name: pg.titre, numberOfItems: pg.items.length, itemListElement: pg.items.map((x, i) => ({ '@type': 'ListItem', position: i + 1, name: x.dateTexte + ' : ' + x.titre })) }) + '</script>' : '';
  return page(SUBC, { p, title: pg.titre + ' — GTA Online | Leonidakit', desc: pg.desc, canonical: '/' + HUB + '/' + pg.id + '.html', body, crumbs: [[H.espace.nom, '/' + HUB + '.html'], [pg.label, '/' + HUB + '/' + pg.id + '.html']], ld, espace: espace(H, pg.sommaire, p) });
}
/* une activité, une entreprise ou une mise à jour du jeu en ligne de GTA VI qui a un texte (aucune au 4 octobre 2026) */
function itemPage(ctx, kind, x) {
  const { H, SUBC } = ctx, p = '../';
  const label = { activites: 'Activité', achats: 'Achat', entreprises: 'Entreprise', misesAJour: 'Mise à jour' }[kind];
  const facts = kind === 'activites' ? [['Joueurs', Number.isInteger(x.joueurs) ? String(x.joueurs) : 'Pas encore publié'], ['Gain', valText(x.gain, 'Pas encore publié')], ['Durée', valText(x.duree, 'Pas encore publiée')]]
    : kind === 'entreprises' ? [['Prix', valText(x.prix, 'Pas encore publié')], ['Revenu', valText(x.revenu, 'Pas encore publié')]] : kind === 'achats' ? [['Prix', valText(x.prix, 'Pas encore publié')]] : [['Date', frDate(x.date)]];
  const body = `<section class="page-head shell">
  <nav class="crumbs online-crumbs" aria-label="Fil d’Ariane"><a href="../${HUB}.html">${esc(H.espace.nom)}</a> / <span>${esc(x.nom)}</span></nav>
  <div class="lore-copy lore-enter"><p class="fiche-cat">${esc(H.espace.nom)} · ${esc(label)}</p><h1>${esc(x.nom)}</h1><p class="lede">${esc(x.resume)}</p></div>
</section>
<section class="shell lore-body">
  <div class="lore-texte reveal"><h2>En bref</h2><dl class="online-champs">${facts.map(([k, v]) => '<div><dt>' + esc(k) + '</dt><dd>' + esc(v) + '</dd></div>').join('')}</dl><p>${st(x.statut, x.sources)}</p></div>
  <div class="lore-texte reveal"><h2>Ce qu’on sait</h2><p>${esc(x.texte)}</p></div>
</section>
<section class="shell online-fiche-src" aria-labelledby="sources-t"><h2 class="sec-h" id="sources-t">Sources</h2>${sourceList(H, x.sources)}</section>`;
  return page(SUBC, { p, title: x.nom + ' — GTA Online | Leonidakit', desc: x.resume, canonical: '/' + HUB + '/' + x.id + '.html', body, crumbs: [[H.espace.nom, '/' + HUB + '.html'], [x.nom, '/' + HUB + '/' + x.id + '.html']], espace: espace(H, null, p) });
}

/* ---------- recherche du site (outils/online-index.json, lu par sync-site.cjs) ---------- */
const MOTS = 'gta online en ligne online multijoueur multi multiplayer jeu en ligne gta 6 online gta vi online gta+ gta plus shark cards take-two zelnick transfert personnage mises a jour en linea multijugador in linea multigiocatore mehrspieler';
function indexEntries(H, P, D) {
  const n = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const items = Object.keys(KINDS).flatMap(kind => D[kind].filter(x => x.texte).map(x => ({ l: x.nom, k: H.hub.label, u: '/' + HUB + '/' + x.id + '.html', s: n(x.nom + ' ' + x.resume + ' gta online'), w: 1 })));
  /* la page elle-même entre aussi dans la recherche par son titre (sync-site.cjs, une entrée par adresse) : cette entrée-ci
     pointe vers « Ce qu’on sait » et garde les mots du joueur dans toutes les langues */
  return [{ l: H.etat.titre, k: H.hub.label, u: '/' + HUB + '.html#etat', s: n(H.etat.titre + ' ' + H.hub.title + ' ' + H.hub.label + ' ' + MOTS), w: 1 },
    ...P.pages.map(p => ({ l: p.titre, k: H.hub.label, u: '/' + HUB + '/' + p.id + '.html', s: n(p.titre + ' ' + p.label + ' gta online ' + (p.kind === 'annonces' ? p.items.map(x => x.titre + ' ' + x.qui).join(' ') : p.blocs.map(b => b.titre + ' ' + b.items.map(x => x.titre || '').join(' ')).join(' '))), w: 1 })), ...items];
}

/* ---------- Léo : questions de la section (morceau leo/online.json) ---------- */
function leo(root = ROOT) {
  const { H } = load(root);
  const label = H.hub.label, verifiedAt = Object.values(H.sources).map(s => s.consultedAt).sort().pop();
  const topics = H.zone.faq.filter(x => !x.leo).map((x, i) => ({ id: ID + '-faq-' + (i + 1), q: x.q, f: [x.q, ...(x.f || [])], k: x.k, text: x.a, status: 'Réponse de la FAQ « ' + label + ' », sources en bas de la page', links: [{ label: 'La FAQ et ses sources', url: '/' + HUB + '.html#faq' }], verifiedAt, min: Number.isInteger(x.min) ? x.min : 2 }));
  return { fiches: [], topics, suggestions: { [ID]: H.leo.suggestions }, inputs: Object.values(FILES) };
}

/* ---------- génération ---------- */
function context(root = ROOT) { const L = load(root); return { ...L, root, ROOTC: chromeOf(L.read('a-propos.html')), SUBC: chromeOf(L.read('vehicules/karin-sultan.html')) }; }
function generate(root = ROOT) {
  const ctx = context(root), { H, P, D } = ctx;
  check(ctx);
  fs.writeFileSync(path.join(root, HUB + '.html'), hubPage(ctx));
  fs.mkdirSync(path.join(root, HUB), { recursive: true });
  const fiches = Object.keys(KINDS).flatMap(kind => D[kind].filter(x => x.texte).map(x => [kind, x]));
  const keep = new Set([...P.pages.map(p => p.id + '.html'), ...fiches.map(([, x]) => x.id + '.html')]);
  for (const f of fs.readdirSync(path.join(root, HUB))) if (f.endsWith('.html') && !keep.has(f)) fs.unlinkSync(path.join(root, HUB, f));
  for (const pg of P.pages) fs.writeFileSync(path.join(root, HUB, pg.id + '.html'), subPage(ctx, pg));
  for (const [kind, x] of fiches) fs.writeFileSync(path.join(root, HUB, x.id + '.html'), itemPage(ctx, kind, x));
  fs.writeFileSync(path.join(root, 'outils/online-index.json'), JSON.stringify(indexEntries(H, P, D)));
  console.log('online : ' + P.pages.length + ' pages sourcées, ' + fiches.length + ' fiche(s) du jeu en ligne de GTA VI, ' + H.zone.faq.length + ' questions, ' + H.zone.sources.length + ' sources');
}

module.exports = { generate, context, leo, load, check, checkValue, checkItem, hubPage, subPage, itemPage, espace, indexEntries, FILES };
if (require.main === module) generate();
