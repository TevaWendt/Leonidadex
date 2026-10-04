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
  return { H: JSON.parse(read(FILES.hub)), P: JSON.parse(read(FILES.pages)), D: JSON.parse(read(FILES.donnees)), STATUTS: JSON.parse(read('outils/editorial-hubs.json')).statuts, read };
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
    if (p.kind === 'annonces') for (const x of p.items) if (!/^\d{4}-\d\d(?:-\d\d)?$/.test(x.date) || !x.dateTexte || !x.qui || !x.titre) err.push('annonce mal formée : ' + (x.titre || '?'));
  }
  for (const href of E.sommaire.map(x => x.href).filter(h => /^online\//.test(h))) if (!ids.has(href.slice(7, -5))) err.push('sommaire : page absente ' + href);
  for (const kind of Object.keys(KINDS)) for (const x of D[kind]) { if (reserved(ctx).has(x.id)) err.push(kind + ' ' + x.id + ' : identifiant déjà pris par une page'); err.push(...checkItem(kind, x, ctx)); }
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
</main>
${LKX.dialog()}
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
function rubrique(H, R, vide, champs, icon) {
  const C = H.champs, f = C.items.filter(x => champs.includes(x.t)), ico = S.icon(icon) || LKX.ICO.page;
  const summary = '<span class="lkx-card lkx-card--ico"><span class="lkx-card-media" aria-hidden="true">' + ico + '</span><span class="lkx-card-body"><b>' + esc(R.titre) + '</b><span>' + esc(C.titre) + '</span><span class="lkx-card-go">' + esc(C.apercuGo) + '</span></span></span>';
  const body = '<p class="lkx-sheet-vide">' + esc(R.vide) + '</p><h4>' + esc(C.titre) + '</h4>' + LKX.skel(f, C.sortie);
  return '<div class="lkx-rubrique">' + vide + '<div class="lkx-cards lkx-cards--solo lkx-net lk-arrive" data-lkx-in>' + LKX.sheet({ id: 'apercu-' + String(R.titre).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''), cls: 'online-apercu', summary, icon: ico, kicker: esc(C.apercuK) + ' · <span>' + esc(R.kicker) + '</span>', title: R.titre, body }) + '</div></div>';
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
    + (D.activites.length ? rows(D, 'activites', '') : rubrique(H, A, '<p class="online-vide">' + esc(A.vide) + '</p>', ['Activités'], 'zone')) + repere(A.repere) + '</section>';
  const achats = '<section class="shell online-sec" id="achats" aria-labelledby="achats-t">' + head(AC.kicker, AC.titre, 'achats')
    + (D.achats.length || D.entreprises.length ? rows(D, 'achats', '') + rows(D, 'entreprises', '') : rubrique(H, AC, '<p class="online-vide">' + esc(AC.vide) + ' <a href="achats.html">Les achats de l’histoire</a></p>', ['Achats', 'Entreprises'], 'achats'))
    + repere(AC.repere) + '<p class="online-repere">' + esc(AC.monetisation.texte) + ' ' + st(AC.monetisation.statut, AC.monetisation.sources) + '</p></section>';
  const actuel = P.pages.find(p => p.id === 'gta-online-actuel'), maj = actuel ? actuel.blocs.find(b => b.id === 'mises-a-jour') : null;
  const misesAJour = '<section class="shell online-sec" id="mises-a-jour" aria-labelledby="mises-a-jour-t">' + head(M.kicker, M.titre, 'mises-a-jour')
    + (D.misesAJour.length ? rows(D, 'misesAJour', '') : rubrique(H, M, '<p class="online-vide">' + esc(M.vide) + '</p>', ['Mises à jour'], 'horloge'))
    + (maj ? '<h3 class="online-sous-t">' + esc(M.titreActuel) + '</h3><ul class="online-items lkx-net lk-arrive" data-lkx-in>' + maj.items.filter(x => x.titre).map(x => '<li><span class="online-v">GTA V</span><h3 translate="no">' + esc(x.titre) + '</h3><p>' + esc(x.texte) + '</p><p>' + st(x.statut, x.sources) + '</p></li>').join('') + '</ul><p class="online-plus"><a href="online/gta-online-actuel.html#mises-a-jour">Le GTA Online actuel en détail</a></p>' : '')
    + '<h3 class="online-sous-t">' + esc(H.champs.titre) + '</h3><dl class="online-champs">' + H.champs.items.map(x => '<div><dt>' + esc(x.t) + '</dt><dd>' + esc(x.d) + '</dd></div>').join('') + '</dl></section>';
  const body = `<section class="page-head shell lk-glow"><div class="lk-head-grid"><div>
  <p class="fiche-cat">${esc(X.label)} · GTA VI</p>
  <h1>${esc(X.title)}</h1>
  <p class="lede">${esc(X.lede)}</p>
  <p class="d-intro-note">${esc(X.note)} <a href="tuto.html#sources">Comprendre les statuts</a>.</p>
</div>${SIGNAL}</div></section>
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

/* ---------- pages de l’espace (online/<id>.html) ---------- */
function subPage(ctx, pg) {
  const { H, SUBC } = ctx, p = '../';
  const items = pg.kind === 'annonces' ? pg.items : pg.blocs.flatMap(b => b.items);
  const ids = [...new Set(items.flatMap(x => x.sources))];
  const content = pg.kind === 'annonces'
    ? '<ol class="online-annonces lkx-wave lk-arrive" data-lkx-in>' + pg.items.map(x => '<li class="online-annonce"><time datetime="' + esc(x.date) + '">' + esc(x.dateTexte) + '</time><div><p class="online-annonce-qui">' + esc(x.qui) + '</p><h3>' + esc(x.titre) + '</h3><p>' + esc(x.texte) + '</p><p>' + st(x.statut, x.sources) + '</p></div></li>').join('') + '</ol>'
    : pg.blocs.map(b => '<section class="online-bloc" id="' + esc(b.id) + '" aria-labelledby="' + esc(b.id) + '-t"><h2 class="sec-h reveal" id="' + esc(b.id) + '-t">' + esc(b.titre) + '</h2><ul class="online-items lkx-net lk-arrive" data-lkx-in>' + b.items.map(x => '<li>' + (x.titre ? '<span class="online-v">GTA V</span><h3 translate="no">' + esc(x.titre) + '</h3>' : '') + '<p>' + esc(x.texte) + '</p><p>' + st(x.statut, x.sources) + '</p></li>').join('') + '</ul></section>').join('');
  const body = `<section class="page-head shell">
  <nav class="crumbs online-crumbs" aria-label="Fil d’Ariane"><a href="../${HUB}.html">${esc(H.espace.nom)}</a> / <span>${esc(pg.label)}</span></nav>
  <div class="lore-copy lore-enter">
    <p class="fiche-cat">${esc(H.espace.nom)} · GTA VI</p>
    <h1>${esc(pg.titre)}</h1>
    <p class="lede">${esc(pg.lede)}</p>
  </div>
</section>
<section class="shell online-sec online-page-${esc(pg.id)}" aria-label="${esc(pg.label)}">
  ${content}
  <p class="online-plus"><a href="../${HUB}.html">L’espace GTA Online</a> · <a href="../${HUB}.html#faq">Les questions fréquentes</a></p>
</section>
<section class="shell online-fiche-src" aria-labelledby="sources-t"><h2 class="sec-h" id="sources-t">Sources</h2>${sourceList(H, ids)}<p class="online-plus">Les statuts sont expliqués dans le <a href="../tuto.html#sources">Tuto</a>.</p></section>`;
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
