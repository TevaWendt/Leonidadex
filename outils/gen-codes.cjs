#!/usr/bin/env node
'use strict';
/* Section « Codes de triche » (section codes) : génère codes-de-triche.html, une fiche codes-de-triche/<categorie>.html par
   catégorie qui a au moins un code de GTA VI publié (outils/codes/codes.json ; aucune au 4 octobre 2026), la page de
   démonstration du gabarit codes-de-triche/modele.html (noindex, hors menu, plan du site, recherche et Léo) et
   outils/codes-index.json (recherche du site, lu par sync-site.cjs). Même gabarit que les hubs du monde (outils/lore-gen.js),
   zone éditoriale des hubs (outils/sections.cjs), sources datées en bas.
   Les cartes de codes (codes.css, codes.js) montrent chaque séquence en texte et en pictogrammes de touches dessinés pour le
   site (formes génériques, aucun logo de console) : la séquence s’affiche touche après touche, la carte s’allume, le numéro
   de téléphone se copie. Les codes de GTA V sont montrés « pour comparer », jamais comme des codes de GTA VI.
   Pas d’encart du calculateur (aucun usage réel) ; la zone « Pour toi » renvoie à l’outil « Mon objectif ».
   leo() rend à outils/gen-leo.cjs les questions de la section (morceau leo/codes.json).
   Usage : node outils/gen-codes.cjs   (appelé par outils/regenerer.cjs, juste après lore-gen.js) */
const fs = require('node:fs'), path = require('node:path');
const ROOT = path.resolve(__dirname, '..');
const S = require('./sections.cjs');
const esc = S.esc;
const SITE = 'https://www.leonidakit.com', HUB = 'codes-de-triche', ID = 'codes';
const FILES = { hub: 'outils/codes/hub.json', codes: 'outils/codes/codes.json', modele: 'outils/codes/modele.json' };
const ST = ['officiel', 'vu', 'comm', 'conf'];
const CATS = ['armes', 'vehicules', 'joueur', 'monde'];

/* ---------- touches : formes génériques dessinées pour le site (aucun logo de console) ---------- */
const PAD = { haut: 'Haut', bas: 'Bas', gauche: 'Gauche', droite: 'Droite' };
const KEYS = {
  ps: { croix: ['forme', 'Croix'], rond: ['forme', 'Rond'], carre: ['forme', 'Carré'], triangle: ['forme', 'Triangle'], l1: ['epaule', 'L1'], r1: ['epaule', 'R1'], l2: ['gachette', 'L2'], r2: ['gachette', 'R2'], l3: ['stick', 'L3'], r3: ['stick', 'R3'] },
  xbox: { a: ['lettre', 'A'], b: ['lettre', 'B'], x: ['lettre', 'X'], y: ['lettre', 'Y'], lb: ['epaule', 'LB'], rb: ['epaule', 'RB'], lt: ['gachette', 'LT'], rt: ['gachette', 'RT'], ls: ['stick', 'LS'], rs: ['stick', 'RS'] }
};
const svg = d => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + d + '</svg>';
const DPAD = '<path d="M9.5 3.5h5v6h6v5h-6v6h-5v-6h-6v-5h6z" stroke-width="1.6"/>';
const GLYPH = {
  croix: svg('<path d="M7.5 7.5l9 9M16.5 7.5l-9 9"/>'), rond: svg('<circle cx="12" cy="12" r="5.5"/>'), carre: svg('<rect x="7" y="7" width="10" height="10" rx="1"/>'), triangle: svg('<path d="M12 6.5l6 10.5H6z"/>'),
  haut: svg(DPAD + '<path class="codes-pad-on" d="M9.5 3.5h5v6h-5z"/>'), bas: svg(DPAD + '<path class="codes-pad-on" d="M9.5 14.5h5v6h-5z"/>'),
  gauche: svg(DPAD + '<path class="codes-pad-on" d="M3.5 9.5h6v5h-6z"/>'), droite: svg(DPAD + '<path class="codes-pad-on" d="M14.5 9.5h6v5h-6z"/>')
};
const PHONE = svg('<rect x="7" y="2.5" width="10" height="19" rx="2"/><path d="M10.5 18.5h3"/>');
const keyOk = (plat, k) => !!(PAD[k] || KEYS[plat][k]);
function keyHtml(plat, k, i) {
  if (PAD[k]) return '<li class="codes-key" data-codes-touche style="--i:' + i + '"><span class="codes-cap codes-cap--croix" aria-hidden="true">' + GLYPH[k] + '</span><span class="codes-key-t">' + esc(PAD[k]) + '</span></li>';
  const [f, t] = KEYS[plat][k];
  if (f === 'forme') return '<li class="codes-key" data-codes-touche style="--i:' + i + '"><span class="codes-cap codes-cap--forme" aria-hidden="true">' + GLYPH[k] + '</span><span class="codes-key-t">' + esc(t) + '</span></li>';
  return '<li class="codes-key" data-codes-touche style="--i:' + i + '"><span class="codes-cap codes-cap--' + f + '" translate="no">' + esc(t) + '</span></li>';
}

function load(root = ROOT) {
  const read = f => fs.readFileSync(path.join(root, f), 'utf8');
  return { H: JSON.parse(read(FILES.hub)), C: JSON.parse(read(FILES.codes)), MO: JSON.parse(read(FILES.modele)), MED: JSON.parse(read('outils/medias-officiels.json')), STATUTS: JSON.parse(read('outils/editorial-hubs.json')).statuts, read };
}

/* ---------- contrôles : une donnée mal formée arrête la génération ---------- */
function checkSeq(L, plat, seq, err) {
  if (seq === null || seq === undefined) return;
  if (!Array.isArray(seq) || !seq.length) { err.push(L + ' : séquence ' + plat + ' vide ou mal formée'); return; }
  for (const k of seq) if (!keyOk(plat, k)) err.push(L + ' : touche inconnue « ' + k + ' » (' + plat + ')');
}
/* un code de GTA VI : publié par Rockstar (officiel, source) ou vérifié en jeu (vu, date) ; jamais supposé */
function checkCode(c, ctx, opts = {}) {
  const { H } = ctx, err = [], L = (opts.label || 'code') + ' ' + (c && c.id || '?');
  if (!c || !/^[a-z0-9][a-z0-9-]*$/.test(c.id || '')) return [L + ' : identifiant invalide'];
  if (!c.effet || !c.texte) err.push(L + ' : effet ou texte manquant');
  if (!CATS.includes(c.categorie)) err.push(L + ' : catégorie inconnue « ' + c.categorie + ' »');
  if (!ST.includes(c.statut)) err.push(L + ' : statut inconnu');
  checkSeq(L, 'ps', c.ps5, err); checkSeq(L, 'xbox', c.xbox, err);
  if (c.telephone !== null && c.telephone !== undefined && !/^[0-9][0-9-]{4,}$/.test(c.telephone)) err.push(L + ' : numéro de téléphone mal formé');
  if (!c.ps5 && !c.xbox && !c.telephone) err.push(L + ' : ni séquence ni numéro');
  for (const id of [...(c.sources || []), ...((c.limites || {}).sources || [])]) if (!H.sources[id]) err.push(L + ' : source inconnue ' + id);
  if (c.limites && (!c.limites.texte || (c.limites.statut && !ST.includes(c.limites.statut)))) err.push(L + ' : limites mal formées');
  if (!opts.fictif) {
    if (c.statut === 'officiel' && !(c.sources || []).some(id => H.sources[id] && H.sources[id].statut === 'officiel')) err.push(L + ' : un code « officiel » cite une source officielle');
    else if (c.statut === 'vu' && !/^\d{4}-\d\d-\d\d$/.test(c.verifieEnJeu || '')) err.push(L + ' : un code « vu » donne sa date de vérification en jeu (verifieEnJeu)');
    else if (!['officiel', 'vu'].includes(c.statut)) err.push(L + ' : un code de GTA VI est publié par Rockstar (officiel) ou vérifié en jeu (vu), jamais supposé');
  }
  return err;
}
function check(ctx) {
  const { H, C, MO, MED } = ctx, err = [];
  for (const [id, s] of Object.entries(H.sources)) {
    if (!/^https:\/\//.test(s.url)) err.push('source ' + id + ' : adresse https attendue');
    if (!s.title || !s.claim) err.push('source ' + id + ' : titre ou résumé manquant');
    if (!/^2026-\d\d-\d\d$/.test(s.consultedAt || '')) err.push('source ' + id + ' : date de consultation manquante');
    if (!ST.includes(s.statut)) err.push('source ' + id + ' : statut inconnu');
    if (s.publishedAt && !/^\d{4}-\d\d-\d\d$/.test(s.publishedAt)) err.push('source ' + id + ' : date de publication mal formée');
  }
  if (JSON.stringify(C.categories.map(c => c.id)) !== JSON.stringify(CATS)) err.push('catégories attendues : ' + CATS.join(', '));
  const ids = new Set();
  for (const c of C.codes) { if (ids.has(c.id)) err.push('code en double : ' + c.id); ids.add(c.id); if (CATS.includes(c.id) || c.id === 'modele') err.push('« ' + c.id + ' » est réservé (fiche de catégorie ou page de démonstration)'); err.push(...checkCode(c, ctx)); }
  for (const c of C.gtav) {
    const L = 'code de GTA V ' + c.id;
    if (!/^gtav-[a-z0-9-]+$/.test(c.id)) err.push(L + ' : identifiant « gtav-… » attendu');
    if (!c.effet || !c.texte || !CATS.includes(c.categorie) || !ST.includes(c.statut) || !(c.sources || []).length) err.push(L + ' : effet, texte, catégorie, statut ou sources');
    checkSeq(L, 'ps', c.ps, err); checkSeq(L, 'xbox', c.xbox, err);
    if (c.pc && !/^[A-Z0-9]+$/.test(c.pc)) err.push(L + ' : mot du PC en majuscules attendu');
    for (const id of c.sources || []) if (!H.sources[id]) err.push(L + ' : source inconnue ' + id);
  }
  for (const c of MO.codes) err.push(...checkCode(c, ctx, { fictif: true, label: 'code fictif' }));
  if (!MO.codes.every(c => !c.telephone || /^0-000-/.test(c.telephone))) err.push('page modèle : un numéro fictif commence par 0-000');
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
  const E = H.etat, SE = H.serie;
  const cited = [...E.carte.sources, ...E.faits.flatMap(x => x.sources), ...SE.facons.flatMap(x => x.sources), ...SE.regles.sources, ...SE.avant.items.flatMap(x => x.sources), ...C.gtav.flatMap(c => c.sources), ...C.gtavLimites.sources, ...C.codes.flatMap(c => c.sources || [])];
  for (const s of new Set(cited)) if (!Z.sources.includes(s)) err.push('source citée mais absente de la liste de la page : ' + s);
  for (const x of [E.carte, ...E.faits, ...SE.facons, SE.regles, ...SE.avant.items, C.gtavLimites]) if (!ST.includes(x.statut) || !(x.sources || []).length) err.push('bloc sans statut ou sans source : ' + (x.titre || x.texte || '').slice(0, 40));
  if (H.hub.desc.length > 160) err.push('description du hub trop longue (' + H.hub.desc.length + ' signes)');
  if (err.length) throw new Error('Section codes, données à corriger (outils/codes/) :\n- ' + err.join('\n- '));
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
<link rel="stylesheet" href="${p}codes.css">
<meta property="og:image" content="${SITE}${ogImg || '/img/social-card.png'}">
<meta name="twitter:card" content="summary_large_image">
<meta property="og:url" content="${SITE}${canonical}">
</head>
<body>

<a class="skip" href="#main">Aller au contenu</a>
<div class="sunset" aria-hidden="true"></div>

${C.header.replace(/ class="here"/g, '')}

<main id="main" class="lore-page codes-page">
${body}
${EXPLORE(p ? '../' : '')}
<section class="lk-outro" aria-label="Et après"><div class="shell lk-outro-in"><p class="lk-outro-k">Et après ?</p><h2>La suite s’écrit le 19 novembre 2026.</h2><p>Chaque fiche se complète avec le jeu : ce qu’on y trouve, ce qu’on y fait, ce que ça rapporte. Rien d’inventé d’ici là.</p><div class="lk-outro-links"><a href="${p ? '../' : ''}carte.html">Ouvrir la carte</a><a href="${p ? '../' : ''}progression.html">Ma progression</a></div></div></section>
</main>

${C.footer}

${C.scripts}
<script src="${p}codes.js"></script>
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
const srcLinks = (ids, pre = '') => ids.length ? '<span class="codes-src">' + ids.map((id, i) => '<a href="' + pre + '#src-' + esc(id) + '" aria-label="Source ' + (i + 1) + '">' + (i + 1) + '</a>').join('') + '</span>' : '';
const st = (statut, ids, pre) => '<span class="codes-st">' + S.pip(statut, true) + srcLinks(ids || [], pre) + '</span>';
const catOf = (C, id) => C.categories.find(c => c.id === id) || { id, label: id };

/* une séquence : liste de touches (texte lisible, pictogrammes décoratifs) */
function seqHtml(uid, plat, keys, label) {
  return '<div class="codes-seq" data-codes-seq="' + plat + '"><p class="codes-seq-t" id="' + uid + '-' + plat + '">' + esc(label) + '</p><ol class="codes-keys" aria-labelledby="' + uid + '-' + plat + '">' + keys.map((k, i) => keyHtml(plat, k, i)).join('') + '</ol></div>';
}
function pcHtml(uid, word) {
  return '<div class="codes-seq" data-codes-seq="pc"><p class="codes-seq-t" id="' + uid + '-pc">PC, dans la console</p><p class="codes-pc" translate="no"><span class="sr-only">' + esc(word) + '</span><span aria-hidden="true">' + [...word].map((ch, i) => '<span data-codes-touche style="--i:' + i + '">' + esc(ch) + '</span>').join('') + '</span></p></div>';
}
function telHtml(num) {
  return '<p class="codes-tel" data-codes-tel><span class="codes-tel-ico" aria-hidden="true">' + PHONE + '</span><span class="codes-tel-l">Téléphone du jeu</span> <span class="codes-tel-n" data-codes-numero translate="no">' + esc(num) + '</span>'
    + '<button type="button" class="codes-copier" data-codes-copier hidden>Copier le numéro</button><span class="codes-copie" data-codes-copie aria-hidden="true">Copié</span></p>';
}
/* une carte de code ; kind : 'gtav' (pour comparer), 'gta6' ou 'fictif' (page de démonstration) */
function card(ctx, c, kind, pre = '') {
  const { C } = ctx, uid = 'code-' + c.id, cat = catOf(C, c.categorie);
  const badge = kind === 'gtav' ? '<span class="codes-v">GTA V, pour comparer</span>' : kind === 'fictif' ? '<span class="codes-v codes-v--fictif">Code fictif</span>' : '';
  const ps = kind === 'gtav' ? c.ps : c.ps5, xb = c.xbox;
  const psLabel = kind === 'gtav' ? 'Manette PlayStation' : 'Manette PlayStation 5', xbLabel = kind === 'gtav' ? 'Manette Xbox' : 'Manette Xbox Series';
  const lim = kind === 'gtav' ? C.gtavLimites : c.limites;
  return '<article class="codes-carte rise" id="' + uid + '" data-codes-carte aria-labelledby="' + uid + '-t">'
    + '<div class="codes-carte-h">' + badge + '<span class="codes-cat">' + esc(cat.label) + '</span><h3 id="' + uid + '-t">' + esc(c.effet) + '</h3></div>'
    + '<p class="codes-effet">' + esc(c.texte) + '</p>'
    + (ps ? seqHtml(uid, 'ps', ps, psLabel) : '') + (xb ? seqHtml(uid, 'xbox', xb, xbLabel) : '') + (c.pc ? pcHtml(uid, c.pc) : '')
    + (c.telephone ? telHtml(c.telephone) : '')
    + (lim ? '<p class="codes-limites"><b>Limites :</b> ' + esc(lim.texte) + (lim.statut && (lim.sources || []).length ? ' ' + st(lim.statut, lim.sources, pre) : '') + '</p>' : '')
    + '<div class="codes-carte-pied">' + (kind === 'fictif' ? '<span class="codes-st">' + S.pip('conf', true) + '</span>' : st(c.statut, c.sources, pre)) + '<button type="button" class="codes-rejouer" data-codes-rejouer hidden>Rejouer la séquence</button></div>'
    + '<span class="codes-actif" aria-hidden="true">Activé</span></article>';
}
/* choix de la console : seulement si chaque carte a ses deux séquences */
const consoles = list => list.length && list.every(c => c.ps5 && c.xbox) ? '<div class="codes-consoles" role="group" aria-label="Ma console" data-codes-consoles hidden><span class="codes-consoles-l" aria-hidden="true">Ma console</span><button type="button" aria-pressed="true" data-codes-console="ps">PlayStation</button><button type="button" aria-pressed="false" data-codes-console="xbox">Xbox</button></div>' : '';
const live = '<p class="sr-only" aria-live="polite" data-codes-annonce></p>';

/* ---------- hub ---------- */
function hubPage(ctx) {
  const { H, C, MED, STATUTS, ROOTC } = ctx, X = H.hub, E = H.etat, SE = H.serie, LI = H.liste;
  const pile = require('./lot-c-visuals.cjs').stack(X.pile.map(p => { const m = imgOf(MED, p.media); return { src: m.a.src, big: m.b.src, alt: p.alt, caption: p.caption }; }), { label: 'Trois visuels officiels de cette section' });
  const fait = x => '<article class="codes-fait rise"><span class="codes-fait-ico">' + S.icon(x.icon) + '</span><h3>' + esc(x.titre) + '</h3><p>' + esc(x.texte) + '</p><p>' + st(x.statut, x.sources) + '</p></article>';
  const etat = '<section class="shell codes-etat" id="etat" aria-labelledby="etat-t"><div class="reveal"><p class="codes-kicker">' + esc(E.kicker) + '</p><h2 class="sec-h" id="etat-t">' + esc(E.titre) + '</h2></div>'
    + '<div class="codes-statut rise"><span class="codes-statut-ico" aria-hidden="true">' + S.icon('sablier') + '</span><div><p class="codes-statut-date">' + esc(E.carte.date) + '</p><h3>' + esc(E.carte.titre) + '</h3><p>' + esc(E.carte.texte) + '</p><p>' + st(E.carte.statut, E.carte.sources) + '</p></div></div>'
    + '<div class="codes-faits">' + E.faits.map(fait).join('') + '</div></section>';
  const serie = '<section class="shell codes-gtav" id="gtav" aria-labelledby="gtav-t"><div class="reveal"><p class="codes-kicker">' + esc(SE.kicker) + '</p><h2 class="sec-h" id="gtav-t">' + esc(SE.titre) + '</h2><p class="codes-lede">' + esc(SE.lede) + '</p></div>'
    + '<div class="codes-faits">' + SE.facons.map(fait).join('') + '</div>'
    + '<div class="codes-regles reveal"><h3>' + esc(SE.regles.titre) + '</h3><ul>' + SE.regles.items.map(t => '<li>' + esc(t) + '</li>').join('') + '</ul><p>' + st(SE.regles.statut, SE.regles.sources) + '</p></div>'
    + '<div class="reveal"><h3 class="codes-sous-t">' + esc(SE.cartesTitre) + '</h3><p class="codes-lede">' + esc(SE.cartesLede) + '</p></div>'
    + consoles(C.gtav) + live + '<div class="codes-cartes">' + C.gtav.map(c => card(ctx, c, 'gtav')).join('') + '</div>'
    + '<div class="codes-avant reveal"><h3>' + esc(SE.avant.titre) + '</h3><ul>' + SE.avant.items.map(x => '<li><p>' + esc(x.texte) + '</p><p>' + st(x.statut, x.sources) + '</p></li>').join('') + '</ul></div></section>';
  const byCat = Object.fromEntries(CATS.map(id => [id, C.codes.filter(c => c.categorie === id)]));
  const groupes = CATS.filter(id => byCat[id].length).map(id => '<h3 class="codes-sous-t"><a href="' + HUB + '/' + id + '.html">' + esc(catOf(C, id).label) + '</a></h3><div class="codes-cartes">' + byCat[id].map(c => card(ctx, c, 'gta6')).join('') + '</div>').join('');
  const liste = '<section class="shell codes-liste" id="liste" aria-labelledby="liste-t"><div class="reveal"><p class="codes-kicker">' + esc(LI.kicker) + '</p><h2 class="sec-h" id="liste-t">' + esc(LI.titre) + '</h2></div>'
    + (C.codes.length ? consoles(C.codes) + groupes : '<p class="codes-vide">' + esc(LI.vide) + '</p>')
    + '<h3 class="codes-sous-t">' + esc(LI.categoriesTitre) + '</h3><ul class="codes-cats">' + C.categories.map(c => '<li>' + (byCat[c.id].length ? '<a href="' + HUB + '/' + c.id + '.html"><b>' + esc(c.label) + '</b></a>' : '<b>' + esc(c.label) + '</b>') + '<span>' + esc(c.texte) + '</span><i>' + byCat[c.id].length + '</i></li>').join('') + '</ul>'
    + '<h3 class="codes-sous-t">' + esc(LI.champsTitre) + '</h3><dl class="codes-champs">' + LI.champs.map(x => '<div><dt>' + esc(x.t) + '</dt><dd>' + esc(x.d) + '</dd></div>').join('') + '</dl>'
    + '<p class="codes-note">' + esc(LI.note) + '</p></section>';
  const body = `<section class="page-head shell lk-glow"><div class="lk-head-grid"><div>
  <p class="fiche-cat">${esc(X.label)} · GTA VI</p>
  <h1>${esc(X.title)}</h1>
  <p class="lede">${esc(X.lede)}</p>
  <p class="d-intro-note">${esc(X.note)} <a href="tuto.html#sources">Comprendre les statuts</a>.</p>
</div>${pile}</div></section>
${etat}
${serie}
${liste}
${zone(H, STATUTS)}`;
  const list = C.codes.length ? C.codes.map(c => ({ name: c.effet, url: SITE + '/' + HUB + '/' + c.categorie + '.html#code-' + c.id })) : C.gtav.map(c => ({ name: 'GTA V : ' + c.effet, url: SITE + '/' + HUB + '.html#code-' + c.id }));
  const collection = '<script type="application/ld+json">' + JSON.stringify({ '@context': 'https://schema.org', '@type': 'CollectionPage', name: X.title, description: metaDesc(X.desc), url: SITE + '/' + HUB + '.html', inLanguage: 'fr', isPartOf: { '@type': 'WebSite', name: 'Leonidakit', url: SITE + '/' }, mainEntity: { '@type': 'ItemList', name: C.codes.length ? LI.titre : SE.cartesTitre, numberOfItems: list.length, itemListElement: list.map((x, i) => ({ '@type': 'ListItem', position: i + 1, name: x.name, url: x.url })) } }) + '</script>';
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
    legend + '<h3 class="ed-h3">Pages consultées</h3>' + sourceList(H, Z.sources) + '<div class="ed-callout"><p><strong>Ce qu’on ne fait pas.</strong> Aucune donnée issue des fuites de 2022 ou de 2026, aucun code supposé, aucune liste « GTA 6 » des sites de fans. Les statuts sont expliqués dans le <a href="tuto.html#sources">Tuto</a>.</p></div>'));
  out.push('</div>');
  return out.join('\n');
}

/* ---------- fiche d’une catégorie (et page de démonstration) ---------- */
function categoriePage(ctx, cat, codes, opts = {}) {
  const { H, SUBC } = ctx, p = '../', kind = opts.banner ? 'fictif' : 'gta6';
  const ids = [...new Set(codes.flatMap(c => [...(c.sources || []), ...((c.limites || {}).sources || [])]))];
  const banner = opts.banner ? '<div class="shell"><p class="codes-demo" role="note">' + esc(opts.banner) + '</p></div>\n' : '';
  const lede = opts.lede || ('Les codes de triche de GTA VI de la catégorie « ' + cat.label + ' » : effet, séquence PlayStation 5 et Xbox Series, numéro de téléphone, limites et source.');
  const srcs = ids.length ? '<section class="shell codes-fiche-src" aria-labelledby="sources-t"><h2 class="sec-h" id="sources-t">Sources</h2>' + sourceList(H, ids) + '<p class="codes-retour">Toutes les sources de la section, avec les statuts, sont <a href="../' + HUB + '.html#sources">en bas de la page Codes de triche</a>.</p></section>' : '';
  const title = opts.titre || ('Codes de triche de la catégorie ' + cat.label);
  const body = `${banner}<section class="page-head shell">
  <nav class="crumbs" aria-label="Fil d’Ariane"><a href="../index.html">Accueil</a> / <a href="../${HUB}.html">${esc(H.hub.label)}</a> / <span>${esc(cat.label)}</span></nav>
  <div class="lore-copy lore-enter">
    <p class="fiche-cat">${esc(H.hub.label)} · GTA VI</p>
    <h1>${esc(title)}</h1>
    <p class="lede">${esc(lede)}</p>
  </div>
</section>
<section class="shell codes-liste" aria-labelledby="codes-t">
  <h2 class="sec-h reveal" id="codes-t">Les codes de cette catégorie</h2>
  ${consoles(codes)}${live}<div class="codes-cartes">${codes.map(c => card(ctx, c, kind, '')).join('')}</div>
  <p class="codes-retour"><a href="../${HUB}.html#liste">Toutes les catégories</a> · <a href="../${HUB}.html#gtav">Comment marchaient les codes dans GTA V</a></p>
</section>
${srcs}`;
  return page(SUBC, { p, title: (opts.titre || 'Codes de triche : ' + cat.label) + ' — GTA VI | Leonidakit', desc: lede, canonical: '/' + HUB + '/' + cat.id + '.html', body, crumbs: [['Accueil', '/'], [H.hub.label, '/' + HUB + '.html'], [cat.label, '/' + HUB + '/' + cat.id + '.html']], noindex: !!opts.noindex });
}

/* ---------- recherche du site (outils/codes-index.json, lu par sync-site.cjs) ---------- */
/* « cheat » et ses variantes dans chaque langue du site : le texte cherché français est gardé dans toutes les langues */
const CHEAT = 'codes de triche code de triche triche tricher astuces cheat cheats cheat code cheat codes cheatcode cheatcodes trucos trucco trucchi codici trampas schummeln schummelcodes mogeln';
function indexEntries(H, C) {
  const n = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  /* la page elle-même entre aussi dans la recherche par son titre (sync-site.cjs, une entrée par adresse) : cette entrée-ci
     pointe vers « Ce qu’on sait » pour garder les mots du joueur (« cheat »…) dans toutes les langues */
  return [{ l: H.etat.titre, k: H.hub.label, u: '/' + HUB + '.html#etat', s: n(H.etat.titre + ' ' + H.hub.title + ' ' + H.hub.label + ' ' + CHEAT + ' telephone manette playstation xbox pc console trophees succes gta v gta vi gta 6 ' + C.gtav.map(c => c.pc || '').join(' ')), w: 1 },
    ...CATS.filter(id => C.codes.some(c => c.categorie === id)).map(id => { const cat = catOf(C, id), list = C.codes.filter(c => c.categorie === id);
      return { l: 'Codes de triche : ' + cat.label, k: H.hub.label, u: '/' + HUB + '/' + id + '.html', s: n(cat.label + ' ' + CHEAT + ' ' + list.map(c => c.effet + ' ' + (c.aliases || []).join(' ')).join(' ')), w: 1 }; })];
}

/* ---------- Léo : questions de la section (morceau leo/codes.json) ---------- */
function leo(root = ROOT) {
  const { H } = load(root);
  const label = H.hub.label, verifiedAt = Object.values(H.sources).map(s => s.consultedAt).sort().pop();
  /* leoQ : question de Léo quand celle de la FAQ est trop générale pour le noyau (« … dans GTA 6 ») */
  const topics = H.zone.faq.filter(x => !x.leo).map((x, i) => ({ id: ID + '-faq-' + (i + 1), q: x.leoQ || x.q, f: [x.leoQ || x.q, ...(x.f || [])], k: x.k, text: x.a, status: 'Réponse de la FAQ « ' + label + ' », sources en bas de la page', links: [{ label: 'La FAQ et ses sources', url: '/' + HUB + '.html#faq' }], verifiedAt, min: Number.isInteger(x.min) ? x.min : 2 }));
  return { fiches: [], topics, suggestions: { [ID]: H.leo.suggestions }, inputs: Object.values(FILES) };
}

/* ---------- génération ---------- */
function context(root = ROOT) { const L = load(root); return { ...L, root, ROOTC: chromeOf(L.read('a-propos.html')), SUBC: chromeOf(L.read('vehicules/karin-sultan.html')) }; }
function generate(root = ROOT) {
  const ctx = context(root), { C, MO, H } = ctx;
  check(ctx);
  fs.writeFileSync(path.join(root, HUB + '.html'), hubPage(ctx));
  fs.mkdirSync(path.join(root, HUB), { recursive: true });
  const cats = CATS.filter(id => C.codes.some(c => c.categorie === id));
  const keep = new Set([...cats.map(id => id + '.html'), 'modele.html']);
  for (const f of fs.readdirSync(path.join(root, HUB))) if (f.endsWith('.html') && !keep.has(f)) fs.unlinkSync(path.join(root, HUB, f));
  for (const id of cats) fs.writeFileSync(path.join(root, HUB, id + '.html'), categoriePage(ctx, catOf(C, id), C.codes.filter(c => c.categorie === id)));
  fs.writeFileSync(path.join(root, HUB, 'modele.html'), categoriePage(ctx, MO.categorie, MO.codes, { noindex: true, banner: MO.bandeau, lede: MO.categorie.lede, titre: MO.categorie.titre }));
  fs.writeFileSync(path.join(root, 'outils/codes-index.json'), JSON.stringify(indexEntries(H, C)));
  console.log('codes : ' + C.codes.length + ' code(s) de GTA VI, ' + cats.length + ' fiche(s) de catégorie, ' + C.gtav.length + ' codes de GTA V pour comparer, page modèle (noindex), ' + H.zone.faq.length + ' questions, ' + H.zone.sources.length + ' sources');
}

module.exports = { generate, context, leo, load, check, checkCode, hubPage, categoriePage, indexEntries, card, KEYS, PAD, CATS, FILES };
if (require.main === module) generate();
