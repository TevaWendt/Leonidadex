#!/usr/bin/env node
'use strict';
/* Section « Trophées et succès » (section trophees) : génère trophees.html, une fiche trophees/<id>.html par trophée qui a
   une méthode (outils/trophees/trophees.json ; liste non publiée au 4 octobre 2026), la page de démonstration du gabarit
   trophees/modele.html (noindex, hors menu, plan du site, recherche et Léo) et outils/trophees-index.json (recherche du site,
   lu par sync-site.cjs). Même gabarit que les hubs du monde (outils/lore-gen.js), zone éditoriale des hubs
   (outils/sections.cjs), sources datées en bas.
   Suivi (trophees.css, trophees.js) : une case « Obtenu » par trophée, gardée sur l’appareil (clé lk-trophees-obtenus-v1),
   le pourcentage et un anneau de progression, des filtres (grade, manquable, catégorie, suivi) ; badges de grade dessinés
   pour le site (coupes génériques, aucun logo de console).
   leo() rend à outils/gen-leo.cjs les questions de la section (morceau leo/trophees.json).
   Usage : node outils/gen-trophees.cjs   (appelé par outils/regenerer.cjs, juste après lore-gen.js) */
const fs = require('node:fs'), path = require('node:path');
const ROOT = path.resolve(__dirname, '..');
const S = require('./sections.cjs');
const LKX = require('./lk-sections.cjs');
const esc = S.esc;
const SITE = 'https://www.leonidakit.com', HUB = 'trophees', ID = 'trophees';
const FILES = { hub: 'outils/trophees/hub.json', trophees: 'outils/trophees/trophees.json', modele: 'outils/trophees/modele.json' };
const ST = ['officiel', 'vu', 'comm', 'conf'];
const GRADES = ['platine', 'or', 'argent', 'bronze'];
const GRADE_LABEL = { platine: 'Platine', or: 'Or', argent: 'Argent', bronze: 'Bronze' };
/* fiche : le grade en toutes lettres (« Argent » seul se traduirait « Money », « Dinero », « Geld » dans les autres langues) */
const GRADE_NOM = { platine: 'Trophée de platine', or: 'Trophée d’or', argent: 'Trophée d’argent', bronze: 'Trophée de bronze' };

/* ---------- badges : coupes génériques dessinées pour le site (aucun logo de console) ---------- */
const svg = (d, sw = 1.8) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + sw + '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + d + '</svg>';
const CUP = '<path d="M7 4h10v4.5a5 5 0 0 1-10 0z"/><path d="M7 6H4.5v1.2A3 3 0 0 0 7.5 10M17 6h2.5v1.2a3 3 0 0 1-3 2.8"/><path d="M12 13.5V17M8.5 20h7M9.5 17h5"/>';
const BADGE = {
  platine: svg(CUP + '<path d="M12 5.6l.8 1.6 1.7.3-1.2 1.2.3 1.7-1.6-.8-1.6.8.3-1.7-1.2-1.2 1.7-.3z" fill="currentColor" stroke="none"/>'),
  or: svg(CUP + '<path d="M8.2 7.2h7.6" stroke-width="2.4"/>'), argent: svg(CUP), bronze: svg(CUP),
  xbox: svg('<circle cx="12" cy="9.5" r="5"/><path d="M9.2 14l-1.7 6.5 4.5-2.4 4.5 2.4-1.7-6.5"/>')
};
const SCEAU = svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>', 3);
const badgeHtml = grade => '<div class="trophees-badge trophees-badge--' + grade + '" aria-hidden="true">' + BADGE[grade] + '<span class="trophees-sceau">' + SCEAU + '</span></div>';

function load(root = ROOT) {
  const read = f => fs.readFileSync(path.join(root, f), 'utf8');
  return { H: JSON.parse(read(FILES.hub)), T: JSON.parse(read(FILES.trophees)), MO: JSON.parse(read(FILES.modele)), MED: JSON.parse(read('outils/medias-officiels.json')), STATUTS: JSON.parse(read('outils/editorial-hubs.json')).statuts, read };
}

/* ---------- contrôles : une donnée mal formée arrête la génération ---------- */
const pageOf = href => String(href || '').split(/[?#]/)[0];
function checkTrophee(t, ctx, opts = {}) {
  const { H, T, root } = ctx, err = [], L = (opts.label || 'trophée') + ' ' + (t && t.id || '?');
  if (!t || !/^[a-z0-9][a-z0-9-]*$/.test(t.id || '')) return [L + ' : identifiant invalide'];
  if (!t.nom || (!opts.fictif && !t.nom.en)) err.push(L + ' : nom anglais officiel (nom.en) manquant');
  if (t.nom && !t.nom.en && !t.nom.fr) err.push(L + ' : aucun nom');
  if (!GRADES.includes(t.grade)) err.push(L + ' : grade inconnu « ' + t.grade + ' »');
  if (t.points !== null && t.points !== undefined && (!Number.isInteger(t.points) || t.points < 0)) err.push(L + ' : points Xbox : nombre entier ou null');
  if (!t.condition || (!t.condition.en && !t.condition.fr)) err.push(L + ' : condition manquante');
  if (!T.categories.some(c => c.id === t.categorie)) err.push(L + ' : catégorie inconnue « ' + t.categorie + ' »');
  if (!ST.includes(t.statut)) err.push(L + ' : statut inconnu');
  if (!opts.fictif && !['officiel', 'comm'].includes(t.statut)) err.push(L + ' : un trophée vient d’une liste publiée (officiel) ou d’un site de trophées cité comme tel (comm)');
  if (!opts.fictif && !(t.sources || []).length) err.push(L + ' : source manquante');
  const m = t.manquable;
  if (m && (![true, false, null].includes(m.value) || (m.statut && !ST.includes(m.statut)))) err.push(L + ' : manquable mal formé');
  for (const id of [...(t.sources || []), ...((m || {}).sources || [])]) if (!H.sources[id]) err.push(L + ' : source inconnue ' + id);
  for (const s of t.methode || []) if (!s.titre || !s.texte) err.push(L + ' : étape de méthode mal formée');
  for (const l of t.liens || []) if (!l.label || !pageOf(l.href) || (root && !fs.existsSync(path.join(root, pageOf(l.href))))) err.push(L + ' : lien vers une page absente ' + l.href);
  return err;
}
function check(ctx) {
  const { H, T, MO, MED } = ctx, err = [];
  for (const [id, s] of Object.entries(H.sources)) {
    if (!/^https:\/\//.test(s.url)) err.push('source ' + id + ' : adresse https attendue');
    if (!s.title || !s.claim) err.push('source ' + id + ' : titre ou résumé manquant');
    if (!/^2026-\d\d-\d\d$/.test(s.consultedAt || '')) err.push('source ' + id + ' : date de consultation manquante');
    if (!ST.includes(s.statut)) err.push('source ' + id + ' : statut inconnu');
    if (s.publishedAt && !/^\d{4}-\d\d-\d\d$/.test(s.publishedAt)) err.push('source ' + id + ' : date de publication mal formée');
  }
  const ids = new Set();
  for (const t of T.trophees) { if (ids.has(t.id)) err.push('trophée en double : ' + t.id); ids.add(t.id); if (t.id === 'modele') err.push('« modele » est réservé à la page de démonstration'); err.push(...checkTrophee(t, ctx)); }
  for (const t of MO.trophees) err.push(...checkTrophee(t, ctx, { fictif: true, label: 'trophée fictif' }));
  if (!MO.trophees.some(t => t.id === MO.methode && (t.methode || []).length)) err.push('page modèle : le trophée de la méthode d’exemple n’a pas de méthode');
  for (const p of H.hub.pile) if (!MED[p.media] || !p.alt) err.push('visuel inconnu ou sans texte alternatif dans la pile : ' + p.media);
  const Z = H.zone;
  for (const k of ['nav', 'rockstar', 'communaute', 'confirmer', 'toi', 'faq', 'sources']) if (!Z[k]) err.push('zone : bloc manquant ' + k);
  Z.sources.forEach(id => { if (!H.sources[id]) err.push('zone : source inconnue ' + id); });
  for (const id of Object.keys(H.sources)) if (!Z.sources.includes(id)) err.push('source jamais listée en bas de page : ' + id);
  for (const p of Z.communaute.pairs) if (!Z.sources.includes(p.src)) err.push('paire sans source de la page : ' + p.fiction);
  for (const x of Z.rockstar.items) if (!ST.includes(x.statut)) err.push('frise : statut ' + x.titre);
  if (Z.faq.length < 4 || Z.faq.length > 6) err.push('la FAQ compte 4 à 6 questions');
  for (const f of Z.faq) if (!f.q || !f.a || f.a.length > 900 || !(f.k || []).length) err.push('FAQ mal formée : ' + f.q);
  for (const a of Z.toi.actions) if (!a.href) err.push('action sans lien : ' + a.t);
  const E = H.etat, G = H.gtav;
  const blocs = [E.carte, ...E.faits, H.grades, ...G.chiffres, ...G.items];
  for (const x of blocs) if (!ST.includes(x.statut) || !(x.sources || []).length) err.push('bloc sans statut ou sans source : ' + (x.titre || x.texte || x.l || '').slice(0, 40));
  for (const s of new Set([...blocs.flatMap(x => x.sources), ...T.trophees.flatMap(t => [...(t.sources || []), ...((t.manquable || {}).sources || [])])])) if (!Z.sources.includes(s)) err.push('source citée mais absente de la liste de la page : ' + s);
  if (H.hub.desc.length > 160) err.push('description du hub trop longue (' + H.hub.desc.length + ' signes)');
  if (err.length) throw new Error('Section trophees, données à corriger (outils/trophees/) :\n- ' + err.join('\n- '));
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
<link rel="stylesheet" href="${p}trophees.css">
<link rel="stylesheet" href="${p}lk-sections.css">
<meta property="og:image" content="${SITE}${ogImg || '/img/social-card.png'}">
<meta name="twitter:card" content="summary_large_image">
<meta property="og:url" content="${SITE}${canonical}">
</head>
<body>

<a class="skip" href="#main">Aller au contenu</a>
<div class="sunset" aria-hidden="true"></div>

${C.header.replace(/ class="here"/g, '')}

<main id="main" class="lore-page trophees-page lkx-page">
${body}
${EXPLORE(p ? '../' : '')}
<section class="lk-outro" aria-label="Et après"><div class="shell lk-outro-in"><p class="lk-outro-k">Et après ?</p><h2>La suite s’écrit le 19 novembre 2026.</h2><p>Chaque fiche se complète avec le jeu : ce qu’on y trouve, ce qu’on y fait, ce que ça rapporte. Rien d’inventé d’ici là.</p><div class="lk-outro-links"><a href="${p ? '../' : ''}carte.html">Ouvrir la carte</a><a href="${p ? '../' : ''}progression.html">Ma progression</a></div></div></section>
${LKX.dialog()}
</main>

${C.footer}

${C.scripts}
<script src="${p}trophees.js"></script>
<script src="${p}lk-sections.js"></script>
</body>
</html>
`;
}

/* ---------- briques ---------- */
const imgOf = (MED, id) => { const m = MED[id]; if (!m) return null; return { a: m.variants[0], b: m.variants[1] || m.variants[0] }; };
function sourceList(H, ids) {
  return '<ol class="ed-srcs">' + ids.map(id => { const s = H.sources[id];
    return '<li id="src-' + esc(id) + '">' + S.pip(s.statut, true)
      + '<a class="ed-src-link" href="' + esc(s.url) + '" target="_blank" rel="noopener nofollow"' + (s.lang === 'en' ? ' translate="no"' : '') + '>' + esc(s.title) + '</a>'
      + '<span class="ed-src-meta">' + (s.publisher ? '<span translate="no">' + esc(s.publisher.split(',')[0]) + '</span>' + (s.publisher.includes(',') ? esc(s.publisher.slice(s.publisher.indexOf(','))) : '') + ' · ' : '') + (s.publishedAt ? 'publié le ' + esc(frDate(s.publishedAt)) + ' · ' : '') + 'consulté le ' + esc(frDate(s.consultedAt)) + '</span>'
      + '<p>' + esc(s.claim) + '</p></li>'; }).join('') + '</ol>';
}
const srcLinks = (ids, pre = '') => ids.length ? '<span class="trophees-src">' + ids.map((id, i) => '<a href="' + pre + '#src-' + esc(id) + '" aria-label="Source ' + (i + 1) + '">' + (i + 1) + '</a>').join('') + '</span>' : '';
const st = (statut, ids, pre) => '<span class="trophees-st">' + S.pip(statut, true) + srcLinks(ids || [], pre) + '</span>';
const catLabel = (T, id) => (T.categories.find(c => c.id === id) || { label: id }).label;
const manq = t => t.manquable && t.manquable.value === true ? 'oui' : t.manquable && t.manquable.value === false ? 'non' : 'inconnu';
/* nom affiché : le nom français s’il est publié, sinon le nom anglais officiel, gardé tel quel dans toutes les langues */
const nomHtml = (t, tag, attrs) => t.nom.fr ? '<' + tag + attrs + '>' + esc(t.nom.fr) + '</' + tag + '>' + (t.nom.en && t.nom.en !== t.nom.fr ? '<p class="trophees-nom-l" translate="no">' + esc(t.nom.en) + '</p>' : '') : '<' + tag + attrs + ' translate="no">' + esc(t.nom.en) + '</' + tag + '>';
const nomTexte = t => t.nom.fr || t.nom.en;
const condHtml = t => t.condition.fr ? '<p class="trophees-cond">' + esc(t.condition.fr) + '</p>' : '<p class="trophees-cond" translate="no">' + esc(t.condition.en) + '</p>';
function meta(T, t) {
  return '<p class="trophees-meta"><span class="trophees-grade">' + esc(GRADE_LABEL[t.grade]) + '</span>'
    + (Number.isInteger(t.points) ? '<span class="trophees-pts"><b>' + t.points + '</b> <span>points Xbox</span></span>' : '')
    + (manq(t) === 'oui' ? '<span class="trophees-tag trophees-tag--manquable">Manquable</span>' : '')
    + (t.cache ? '<span class="trophees-tag">Caché</span>' : '')
    + '<span class="trophees-tag">' + esc(catLabel(T, t.categorie)) + '</span></p>';
}
const caseHtml = (t, demo) => '<label class="trophees-case" data-trophees-case hidden><input type="checkbox" data-trophees-obtenu aria-describedby="trophee-' + esc(t.id) + '-t"> <span>Obtenu</span></label>' + (demo ? '' : '');
const eclat = '<span class="trophees-eclat-r" aria-hidden="true">' + '<i></i>'.repeat(8) + '</span>';
function card(ctx, t, i, opts = {}) {
  const { T } = ctx, pre = opts.pre || '';
  return '<li class="trophees-carte" style="--i:' + i + '" id="trophee-' + esc(t.id) + '" data-trophees-id="' + esc(t.id) + '" data-grade="' + t.grade + '" data-manquable="' + manq(t) + '" data-categorie="' + esc(t.categorie) + '">'
    + badgeHtml(t.grade) + eclat
    + '<div class="trophees-carte-b">' + nomHtml(t, 'h3', ' id="trophee-' + esc(t.id) + '-t"') + condHtml(t) + meta(T, t)
    + (opts.fictif ? '<p class="trophees-st">' + S.pip('conf', true) + '</p>' : '<p>' + st(t.statut, t.sources, pre) + '</p>')
    + ((t.methode || []).length && !opts.fictif ? '<a class="trophees-methode" href="' + pre + HUB + '/' + esc(t.id) + '.html">La méthode pas à pas</a>' : '')
    + caseHtml(t) + '</div></li>';
}
/* bilan, filtres et liste (trophees.js) ; demo : rien n’est enregistré */
function suivi(ctx, list, opts = {}) {
  const { H, T } = ctx, F = H.liste.filtres, B = H.liste.bilan;
  const group = (name, label, values) => '<div class="trophees-filtre" role="group" aria-label="' + esc(label) + '" data-trophees-groupe="' + name + '"><span class="trophees-filtre-l" aria-hidden="true">' + esc(label) + '</span>'
    + values.map(([v, l], i) => '<button type="button" aria-pressed="' + (i === 0) + '" data-trophees-valeur="' + esc(v) + '">' + esc(l) + '</button>').join('') + '</div>';
  const grades = GRADES.filter(g => list.some(t => t.grade === g)), cats = T.categories.filter(c => list.some(t => t.categorie === c.id));
  const filtres = '<div class="trophees-filtres" data-trophees-filtres hidden>'
    + group('grade', F.grade, [['tous', F.tous], ...grades.map(g => [g, GRADE_LABEL[g]])])
    + (list.some(t => manq(t) === 'oui') ? group('manquable', F.manquable, [['tous', F.tous], ['oui', F.oui], ['non', F.non]]) : '')
    + (cats.length > 1 ? group('categorie', F.categorie, [['tous', F.tous], ...cats.map(c => [c.id, c.label])]) : '')
    + group('etat', F.etat, [['tous', F.tous], ['obtenus', F.obtenus], ['restants', F.restants]])
    + '<p class="trophees-visibles">' + esc(F.visibles) + ' <b data-trophees-visibles>' + list.length + '</b></p></div>';
  const bilan = '<div class="trophees-bilan" data-trophees-bilan hidden><div class="trophees-anneau" data-trophees-anneau aria-hidden="true"><span class="trophees-anneau-d"><i></i></span><span class="trophees-anneau-g"><i></i></span><span class="trophees-anneau-c"><b data-trophees-pct>0 %</b></span></div>'
    + '<div class="trophees-bilan-t"><p class="trophees-bilan-n"><b data-trophees-n>0</b><span aria-hidden="true">/</span><b data-trophees-total>' + list.length + '</b></p><p class="trophees-bilan-l" data-trophees-libelle>' + esc(B.libelle) + '</p><p class="trophees-bilan-note">' + esc(opts.demo ? opts.demoNote : B.note) + '</p></div></div>';
  return '<div' + (opts.demo ? ' data-trophees-demo' : '') + '>' + bilan + '<p class="sr-only" aria-live="polite" data-trophees-annonce></p>' + filtres
    + '<ul class="trophees-cartes" data-trophees-liste>' + list.map((t, i) => card(ctx, t, i, { fictif: opts.demo })).join('') + '</ul></div>';
}

/* ---------- hub ---------- */
/* aperçu d’une fiche trophée : une carte qui ouvre, en plein écran, le squelette de chaque fiche (rien d’inventé : la liste
   n’est pas publiée) */
function apercu(LI) {
  const X = LI.exemple || { items: [] };
  const row = t => '<li class="trophees-ex' + (t.manquable ? ' trophees-ex--manquable' : '') + '">' + badgeHtml(t.grade)
    + '<div class="trophees-ex-b"><p class="trophees-ex-n"><b translate="no">' + esc(t.nom) + '</b><span class="trophees-v">GTA V</span>' + (t.manquable ? '<span class="trophees-ex-tag">' + esc(X.manquable) + '</span>' : '') + '</p><p class="trophees-ex-t">' + esc(t.texte) + '</p><p class="trophees-ex-st">' + st(t.statut, t.sources) + '</p></div>'
    + '<span class="trophees-ex-case" aria-hidden="true"><i></i><span>' + esc(X.obtenu) + '</span></span></li>';
  const summary = '<span class="lkx-card lkx-card--trophee"><span class="lkx-card-media">' + badgeHtml('platine') + badgeHtml('or') + badgeHtml('bronze') + '</span><span class="lkx-card-body"><b>' + esc(LI.apercuT) + '</b><span>' + esc(X.titre || LI.champsTitre) + '</span><span class="lkx-card-go">' + esc(LI.apercuGo) + '</span></span></span>';
  const body = '<p>' + esc(X.lede || LI.vide) + '</p>'
    + (X.items.length ? '<h4>' + esc(X.titre) + '</h4><ol class="trophees-exs">' + X.items.map(row).join('') + '</ol>' : '')
    + '<p class="lkx-sheet-vide">' + esc(LI.vide) + '</p>'
    + '<h4>' + esc(LI.champsTitre) + '</h4>' + LKX.skel(LI.champs, LI.sortie) + '<p class="trophees-note">' + esc(LI.note) + '</p>'
    + '<div class="lkx-sheet-cta"><a class="lkx-btn" href="progression.html">Ma progression</a><a class="lkx-btn lkx-btn--ghost" href="collectibles.html">Les collectibles</a></div>';
  return '<div class="lkx-cards lkx-cards--solo lkx-unlock lk-arrive" data-lkx-in>' + LKX.sheet({ id: 'apercu-fiche', cls: 'trophees-apercu', summary, icon: '<div class="trophees-podium">' + badgeHtml('or') + badgeHtml('platine') + badgeHtml('argent') + badgeHtml('bronze') + '</div>', kicker: esc(LI.kicker) + ' · <span>' + esc(LI.apercuK) + '</span>', title: LI.apercuT, body }) + '</div>';
}
function hubPage(ctx) {
  const { H, T, MED, STATUTS, ROOTC } = ctx, X = H.hub, E = H.etat, G = H.gtav, GR = H.grades, LI = H.liste;
  const pile = require('./lot-c-visuals.cjs').stack(X.pile.map(p => { const m = imgOf(MED, p.media); return { src: m.a.src, big: m.b.src, alt: p.alt, caption: p.caption }; }), { label: 'Trois visuels officiels de cette section' });
  const fait = x => '<article class="trophees-fait"><span class="trophees-fait-ico">' + S.icon(x.icon) + '</span><h3>' + esc(x.titre) + '</h3><p>' + esc(x.texte) + '</p><p>' + st(x.statut, x.sources) + '</p></article>';
  const etat = '<section class="shell trophees-etat" id="etat" aria-labelledby="etat-t"><div class="reveal"><p class="trophees-kicker">' + esc(E.kicker) + '</p><h2 class="sec-h" id="etat-t">' + esc(E.titre) + '</h2></div>'
    + '<div class="trophees-statut rise"><span class="trophees-statut-ico" aria-hidden="true">' + S.icon('sablier') + '</span><div><p class="trophees-statut-date">' + esc(E.carte.date) + '</p><h3>' + esc(E.carte.titre) + '</h3><p>' + esc(E.carte.texte) + '</p><p>' + st(E.carte.statut, E.carte.sources) + '</p></div></div>'
    + '<div class="trophees-faits lkx-unlock lk-arrive" data-lkx-in>' + E.faits.map(fait).join('') + '</div></section>';
  const grades = '<section class="shell trophees-grades" id="grades" aria-labelledby="grades-t"><div class="reveal"><p class="trophees-kicker">' + esc(GR.kicker) + '</p><h2 class="sec-h" id="grades-t">' + esc(GR.titre) + '</h2><p class="trophees-lede">' + esc(GR.lede) + '</p></div>'
    + '<ul class="trophees-grades-l lkx-unlock lk-arrive" data-lkx-in>' + GR.items.map(x => '<li>' + badgeHtml(x.grade).replace('<span class="trophees-sceau">' + SCEAU + '</span>', '') + '<div><b>' + esc(x.label) + '</b><span>' + esc(x.texte) + '</span></div></li>').join('') + '</ul>'
    + '<p class="trophees-note">' + st(GR.statut, GR.sources) + '</p></section>';
  const gtav = '<section class="shell trophees-gtav" id="gtav" aria-labelledby="gtav-t"><div class="reveal"><p class="trophees-kicker">' + esc(G.kicker) + '</p><h2 class="sec-h" id="gtav-t">' + esc(G.titre) + '</h2><p class="trophees-lede">' + esc(G.lede) + '</p></div>'
    + '<div class="trophees-chiffres lkx-unlock lk-arrive" data-lkx-in>' + G.chiffres.map(x => '<div class="trophees-chiffre"><span class="trophees-v">GTA V</span><b>' + esc(x.n) + '</b><span>' + esc(x.l) + '</span><p>' + st(x.statut, x.sources) + '</p></div>').join('') + '</div>'
    + '<ul class="trophees-gtav-l lkx-wave lk-arrive" data-lkx-in>' + G.items.map(x => '<li><p>' + esc(x.texte) + '</p><p>' + st(x.statut, x.sources) + '</p></li>').join('') + '</ul></section>';
  const list = T.trophees;
  const liste = '<section class="shell trophees-liste-sec" id="liste" aria-labelledby="liste-t"><div class="reveal"><p class="trophees-kicker">' + esc(LI.kicker) + '</p><h2 class="sec-h" id="liste-t">' + esc(LI.titre) + '</h2></div>'
    + (list.length ? suivi(ctx, list) : '<p class="trophees-vide">' + esc(LI.vide) + '</p>')
    + apercu(LI) + '<h3 class="trophees-sous-t">' + esc(LI.champsTitre) + '</h3><dl class="trophees-champs">' + LI.champs.map(x => '<div><dt>' + esc(x.t) + '</dt><dd>' + esc(x.d) + '</dd></div>').join('') + '</dl>'
    + '<p class="trophees-note">' + esc(LI.note) + '</p></section>';
  const body = `<section class="page-head shell lk-glow"><div class="lk-head-grid"><div>
  <p class="fiche-cat">${esc(X.label)} · GTA VI</p>
  <h1>${esc(X.title)}</h1>
  <p class="lede">${esc(X.lede)}</p>
  <p class="d-intro-note">${esc(X.note)} <a href="tuto.html#sources">Comprendre les statuts</a>.</p>
</div>${pile}</div></section>
${etat}
${grades}
${gtav}
${liste}
${zone(H, STATUTS)}`;
  const ldList = list.length ? { mainEntity: { '@type': 'ItemList', name: LI.titre, numberOfItems: list.length, itemListElement: list.map((t, i) => ({ '@type': 'ListItem', position: i + 1, name: nomTexte(t), url: SITE + '/' + HUB + ((t.methode || []).length ? '/' + t.id + '.html' : '.html#trophee-' + t.id) })) } } : {};
  const collection = '<script type="application/ld+json">' + JSON.stringify({ '@context': 'https://schema.org', '@type': 'CollectionPage', name: X.title, description: metaDesc(X.desc), url: SITE + '/' + HUB + '.html', inLanguage: 'fr', isPartOf: { '@type': 'WebSite', name: 'Leonidakit', url: SITE + '/' }, ...ldList }) + '</script>';
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
  out.push(S.section({ id: 'pour-toi', num: 4, kicker: 'Outils du site', title: 'Ce que ça change pour toi', icon: 'boussole', tone: 'paper', lede: esc(Z.toi.lede) }, S.actions(Z.toi.actions) + para(Z.toi.p)));
  out.push(S.section({ id: 'faq', num: 5, kicker: 'Questions', title: 'Questions fréquentes', icon: 'faq', tone: 'paper2' }, '<p>Les questions qu’on tape dans un moteur de recherche, avec des réponses courtes et datées.</p><div class="faq rise">' + Z.faq.map(x => '<details><summary>' + esc(x.q) + '</summary><div class="ans">' + esc(x.a) + '</div></details>').join('') + '</div>'));
  const legend = '<div class="ed-levels">' + STATUTS.map(n => '<div class="ed-level"><h3>' + S.pip(n.statut) + esc(n.titre) + '</h3><p>' + esc(n.texte) + '</p></div>').join('') + '</div>';
  out.push(S.section({ id: 'sources', num: 6, kicker: Z.sources.length + ' sources ouvertes', title: 'Sources et statuts', icon: 'lire', tone: 'night', accent: 'coral', lede: esc(Z.sourcesLede) },
    legend + '<h3 class="ed-h3">Pages consultées</h3>' + sourceList(H, Z.sources) + '<div class="ed-callout"><p><strong>Ce qu’on ne fait pas.</strong> Aucune donnée issue des fuites de 2022 ou de 2026, aucune liste « attendue » des sites de fans, aucun nom de trophée inventé. Les statuts sont expliqués dans le <a href="tuto.html#sources">Tuto</a>.</p></div>'));
  out.push('</div>');
  return out.join('\n');
}

/* ---------- fiche d’un trophée (méthode pas à pas) ---------- */
function methodeHtml(t) {
  return '<div class="lore-texte reveal"><h2>La méthode pas à pas</h2><ol class="trophees-etapes">' + t.methode.map((s, i) => '<li class="rise"><span class="trophees-etape-n" aria-hidden="true">' + (i + 1) + '</span><div><h3>' + esc(s.titre) + '</h3><p>' + esc(s.texte) + '</p></div></li>').join('') + '</ol></div>';
}
function fichePage(ctx, t) {
  const { H, T, SUBC } = ctx, p = '../';
  const m = t.manquable || {};
  const rows = [
    ['Grade', esc(GRADE_NOM[t.grade])],
    ['Points Xbox', Number.isInteger(t.points) ? String(t.points) : 'Pas encore publiés'],
    ['Manquable', esc(m.value === true ? 'Oui' : m.value === false ? 'Non' : 'À confirmer') + (m.texte ? ' : ' + esc(m.texte) : '') + (m.statut ? ' ' + st(m.statut, m.sources, '') : '')],
    ['Caché', t.cache ? 'Oui' : 'Non'],
    ['Catégorie', esc(catLabel(T, t.categorie))]
  ];
  const ids = [...new Set([...(t.sources || []), ...(m.sources || [])])];
  const liens = (t.liens || []).length ? '<div class="lore-texte reveal"><h2>Pages utiles</h2><ul class="lore-chips">' + t.liens.map(l => '<li><a href="' + p + esc(l.href) + '">' + esc(l.label) + '</a></li>').join('') + '</ul></div>' : '';
  const body = `<section class="page-head shell">
  <nav class="crumbs" aria-label="Fil d’Ariane"><a href="../index.html">Accueil</a> / <a href="../${HUB}.html">${esc(H.hub.label)}</a> / <span${t.nom.fr ? '' : ' translate="no"'}>${esc(nomTexte(t))}</span></nav>
  <div class="lore-copy lore-enter">
    <p class="fiche-cat">${esc(H.hub.label)} · GTA VI</p>
    ${nomHtml(t, 'h1', '')}
  </div>
</section>
<section class="shell trophees-liste-sec" aria-label="${esc(nomTexte(t))}">
  <ul class="trophees-cartes trophees-fiche-carte" data-trophees-liste>${card(ctx, t, 0, { pre: p })}</ul>
</section>
<section class="shell lore-body">
  <div class="lore-texte reveal"><h2>Le trophée en bref</h2><dl class="trophees-bref">${rows.map(([k, v]) => '<div><dt>' + k + '</dt><dd>' + v + '</dd></div>').join('')}</dl></div>
  ${methodeHtml(t)}
  ${liens}
</section>
${ids.length ? '<section class="shell trophees-fiche-src" aria-labelledby="sources-t"><h2 class="sec-h" id="sources-t">Sources</h2>' + sourceList(H, ids) + '</section>' : ''}`;
  const desc = (t.condition.fr || t.condition.en) + ' La méthode pas à pas, et ta case « Obtenu ».';
  return page(SUBC, { p, title: nomTexte(t) + ' — trophée GTA VI | Leonidakit', desc, canonical: '/' + HUB + '/' + t.id + '.html', body, crumbs: [['Accueil', '/'], [H.hub.label, '/' + HUB + '.html'], [nomTexte(t), '/' + HUB + '/' + t.id + '.html']] });
}

/* ---------- page de démonstration : la liste, le suivi et une méthode, avec des trophées fictifs ---------- */
function modelePage(ctx) {
  const { H, MO, SUBC } = ctx, p = '../';
  const ex = MO.trophees.find(t => t.id === MO.methode);
  const body = `<div class="shell"><p class="trophees-demo" role="note">${esc(MO.bandeau)}</p></div>
<section class="page-head shell">
  <nav class="crumbs" aria-label="Fil d’Ariane"><a href="../index.html">Accueil</a> / <a href="../${HUB}.html">${esc(H.hub.label)}</a> / <span>${esc(MO.titre)}</span></nav>
  <div class="lore-copy lore-enter">
    <p class="fiche-cat">${esc(H.hub.label)} · GTA VI</p>
    <h1>${esc(MO.titre)}</h1>
    <p class="lede">${esc(MO.lede)}</p>
  </div>
</section>
<section class="shell trophees-liste-sec" aria-labelledby="liste-t">
  <h2 class="sec-h reveal" id="liste-t">${esc(H.liste.titre)}</h2>
  ${suivi(ctx, MO.trophees, { demo: true, demoNote: 'Démonstration : rien n’est enregistré.' })}
</section>
<section class="shell lore-body">
  <div class="lore-texte reveal"><h2>Exemple de fiche : « ${esc(nomTexte(ex))} »</h2><p>Les trophées qui demandent une méthode auront leur fiche, avec ces étapes, leurs liens et leurs sources.</p></div>
  ${methodeHtml(ex)}
</section>`;
  return page(SUBC, { p, title: MO.titre + ' | Leonidakit', desc: MO.lede, canonical: '/' + HUB + '/modele.html', body, crumbs: [['Accueil', '/'], [H.hub.label, '/' + HUB + '.html'], [MO.titre, '/' + HUB + '/modele.html']], noindex: true });
}

/* ---------- recherche du site (outils/trophees-index.json, lu par sync-site.cjs) ---------- */
const MOTS = 'trophees trophee succes achievements achievement trophies trophy platine platinum or argent bronze points gamerscore playstation ps5 xbox progression obtenu manquables trofeos logros trofei obiettivi trophaeen erfolge';
function indexEntries(H, T) {
  const n = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  /* la page elle-même entre aussi dans la recherche par son titre (sync-site.cjs, une entrée par adresse) : cette entrée-ci
     pointe vers le suivi et garde les mots du joueur dans toutes les langues */
  return [{ l: H.liste.titre, k: H.hub.label, u: '/' + HUB + '.html#liste', s: n(H.liste.titre + ' ' + H.hub.title + ' ' + H.hub.label + ' ' + MOTS + ' gta v gta vi gta 6'), w: 1 },
    ...T.trophees.filter(t => (t.methode || []).length).map(t => ({ l: nomTexte(t), k: H.hub.label, u: '/' + HUB + '/' + t.id + '.html', s: n([t.nom.fr, t.nom.en, t.nom.es, t.nom.it, t.nom.de, 'trophee succes', GRADE_LABEL[t.grade]].filter(Boolean).join(' ')), w: 1 }))];
}

/* ---------- Léo : questions de la section (morceau leo/trophees.json) ---------- */
function leo(root = ROOT) {
  const { H } = load(root);
  const label = H.hub.label, verifiedAt = Object.values(H.sources).map(s => s.consultedAt).sort().pop();
  const topics = H.zone.faq.filter(x => !x.leo).map((x, i) => ({ id: ID + '-faq-' + (i + 1), q: x.q, f: [x.q, ...(x.f || [])], k: x.k, text: x.a, status: 'Réponse de la FAQ « ' + label + ' », sources en bas de la page', links: [{ label: 'La FAQ et ses sources', url: '/' + HUB + '.html#faq' }], verifiedAt, min: Number.isInteger(x.min) ? x.min : 2 }));
  return { fiches: [], topics, suggestions: { [ID]: H.leo.suggestions }, inputs: Object.values(FILES) };
}

/* ---------- génération ---------- */
function context(root = ROOT) { const L = load(root); return { ...L, root, ROOTC: chromeOf(L.read('a-propos.html')), SUBC: chromeOf(L.read('vehicules/karin-sultan.html')) }; }
function generate(root = ROOT) {
  const ctx = context(root), { T, H } = ctx;
  check(ctx);
  fs.writeFileSync(path.join(root, HUB + '.html'), hubPage(ctx));
  fs.mkdirSync(path.join(root, HUB), { recursive: true });
  const fiches = T.trophees.filter(t => (t.methode || []).length);
  const keep = new Set([...fiches.map(t => t.id + '.html'), 'modele.html']);
  for (const f of fs.readdirSync(path.join(root, HUB))) if (f.endsWith('.html') && !keep.has(f)) fs.unlinkSync(path.join(root, HUB, f));
  for (const t of fiches) fs.writeFileSync(path.join(root, HUB, t.id + '.html'), fichePage(ctx, t));
  fs.writeFileSync(path.join(root, HUB, 'modele.html'), modelePage(ctx));
  fs.writeFileSync(path.join(root, 'outils/trophees-index.json'), JSON.stringify(indexEntries(H, T)));
  console.log('trophees : ' + T.trophees.length + ' trophée(s) publié(s), ' + fiches.length + ' fiche(s) de méthode, page modèle (noindex, ' + ctx.MO.trophees.length + ' trophées fictifs), ' + H.zone.faq.length + ' questions, ' + H.zone.sources.length + ' sources');
}

module.exports = { generate, context, leo, load, check, checkTrophee, hubPage, fichePage, modelePage, indexEntries, card, GRADES, FILES };
if (require.main === module) generate();
