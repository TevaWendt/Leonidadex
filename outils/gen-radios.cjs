#!/usr/bin/env node
'use strict';
/* Section « Radios et musique » (section radios) : génère radios.html, les fiches radios/<id>.html et outils/radios-index.json
   (entrées de la recherche du site, lues par sync-site.cjs) à partir de outils/radios/radios.json. Même gabarit que les hubs du
   monde (outils/lore-gen.js) : en-tête, pied de page et scripts copiés d’a-propos.html et d’une fiche véhicule, zone éditoriale
   des hubs (outils/sections.cjs), sources datées en bas. En plus : le « poste de Leonida » (radios.css, radios.js : cadran,
   écran qui défile, égaliseur, morceaux qui arrivent), chargé par les pages de la section seulement.
   leo() rend à outils/gen-leo.cjs les fiches et les questions de la section (morceau leo/radios.json).
   Usage : node outils/gen-radios.cjs   (appelé par outils/regenerer.cjs, juste après lore-gen.js) */
const fs = require('node:fs'), path = require('node:path');
const ROOT = path.resolve(__dirname, '..');
const S = require('./sections.cjs');
const LKX = require('./lk-sections.cjs'); /* écoute des morceaux, vedette de l’album, galerie (lk-sections.css, lk-sections.js) */
const esc = S.esc;
const SITE = 'https://www.leonidakit.com', HUB = 'radios';
const DATA_FILE = 'outils/radios/radios.json';

function load(root = ROOT) {
  const read = f => fs.readFileSync(path.join(root, f), 'utf8');
  const D = JSON.parse(read(DATA_FILE)), MED = JSON.parse(read('outils/medias-officiels.json'));
  const STATUTS = JSON.parse(read('outils/editorial-hubs.json')).statuts;
  return { D, MED, STATUTS, read };
}

/* ---------- contrôles : une donnée mal formée arrête la génération ---------- */
const ST = ['officiel', 'vu', 'comm', 'conf'];
function check(D, MED, root = ROOT) {
  const err = [];
  const src = id => { if (!D.sources[id]) err.push('source inconnue : ' + id); };
  for (const [id, s] of Object.entries(D.sources)) {
    if (!/^https:\/\//.test(s.url)) err.push('source ' + id + ' : adresse https attendue');
    if (!s.title || !s.claim) err.push('source ' + id + ' : titre ou résumé manquant');
    if (!/^2026-\d\d-\d\d$/.test(s.consultedAt || '')) err.push('source ' + id + ' : date de consultation manquante');
    if (!ST.includes(s.statut)) err.push('source ' + id + ' : statut inconnu');
    if (s.publishedAt && !/^\d{4}-\d\d-\d\d$/.test(s.publishedAt)) err.push('source ' + id + ' : date de publication mal formée');
  }
  for (const v of D.videos) {
    if (!/^[a-z0-9-]+$/.test(v.id) || !v.nom || !/^\d{4}-\d\d-\d\d$/.test(v.date) || !ST.includes(v.statut) || !/^https:\/\//.test(v.lien)) err.push('vidéo mal formée : ' + v.id);
    if (!v.morceaux.length) err.push('vidéo sans morceau : ' + v.id);
    for (const m of v.morceaux) {
      if (!m.titre || !m.artiste || !m.moment || !ST.includes(m.statut)) err.push('morceau mal formé dans ' + v.id + ' : ' + (m.titre || '?'));
      if (!(m.sources || []).length) err.push('morceau sans source : ' + m.titre);
      (m.sources || []).forEach(src);
      for (const l of m.liens || []) if (!/^https:\/\//.test(l.url) || !l.label) err.push('lien mal formé : ' + m.titre);
    }
  }
  for (const x of D.fiches) {
    if (!/^[a-z0-9-]+$/.test(x.id) || !x.name || !x.description || !x.kind) err.push('fiche mal formée : ' + x.id);
    (x.sources || []).forEach(src);
    for (const id of x.media || []) if (!MED[id]) err.push('visuel inconnu dans ' + x.id + ' : ' + id);
    for (const id of x.characters || []) if (!fs.existsSync(path.join(root, 'personnages', id + '.html'))) err.push('personnage absent : ' + id);
    for (const id of x.businesses || []) if (!fs.existsSync(path.join(root, 'entreprises', id + '.html'))) err.push('entreprise absente : ' + id);
  }
  for (const p of D.hub.pile) if (!MED[p.media]) err.push('visuel inconnu dans la pile : ' + p.media);
  const Z = D.zone;
  for (const k of ['nav', 'rockstar', 'communaute', 'confirmer', 'toi', 'faq', 'sources']) if (!Z[k]) err.push('zone : bloc manquant ' + k);
  Z.sources.forEach(src);
  for (const p of Z.communaute.pairs) if (!Z.sources.includes(p.src)) err.push('paire sans source de la page : ' + p.fiction);
  for (const x of Z.rockstar.items) { if (!ST.includes(x.statut)) err.push('frise : statut ' + x.titre); if (x.media && (!MED[x.media] || !x.alt)) err.push('frise : visuel ou texte alternatif ' + x.titre); }
  if (Z.faq.length < 4 || Z.faq.length > 6) err.push('la FAQ compte 4 à 6 questions');
  for (const f of Z.faq) if (!f.q || !f.a || f.a.length > 900 || !(f.k || []).length) err.push('FAQ mal formée : ' + f.q);
  for (const a of Z.toi.actions) if (!a.href) err.push('action sans lien : ' + a.t);
  for (const s of new Set([...D.videos.flatMap(v => v.morceaux.flatMap(m => m.sources)), ...D.fiches.flatMap(x => x.sources || [])])) if (!Z.sources.includes(s)) err.push('source citée mais absente de la liste de la page : ' + s);
  if (D.hub.desc.length > 160) err.push('description du hub trop longue (' + D.hub.desc.length + ' signes)');
  for (const x of D.fiches) if (x.description.length > 160) err.push('description de ' + x.id + ' trop longue (' + x.description.length + ' signes)');
  if (err.length) throw new Error('Section radios, données à corriger (' + DATA_FILE + ') :\n- ' + err.join('\n- '));
}

/* ---------- gabarit : le vrai HTML du site (comme outils/lore-gen.js) ---------- */
function chromeOf(s) {
  const pick = re => { const m = s.match(re); if (!m) throw new Error('gabarit introuvable : ' + re); return m[0]; };
  return {
    fav: pick(/<link rel="icon"[^>]*>/),
    header: pick(/<header>[\s\S]*?<\/header>/),
    footer: pick(/<footer>[\s\S]*?<\/footer>/),
    scripts: (s.match(/<script(?: type="lk\/lazy")? src="[^"]*"><\/script>/g) || []).filter(x => !/fiches\.js|vehicules-data\.js|armes-data\.js|lk-showcase\.js|carnets-core\.js/.test(x)).join('\n')
  };
}
const frDate = iso => iso ? iso.split('-').reverse().join('/') : null;
const metaDesc = t => { t = String(t || '').replace(/\s+/g, ' ').trim(); return t.length <= 160 ? t : t.slice(0, 157).replace(/\s+\S*$/, '') + '…'; };
const bc = items => '<script type="application/ld+json">' + JSON.stringify({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it[0], item: SITE + it[1] })) }) + '</script>';
const EXPLORE = pre => `<section class="shell reveal lk-explore">
  <h2 class="sec-h">Continuer la visite</h2>
  <div class="lk-links rise"><a class="lk-link" href="${pre}carte.html"><img src="/img/officiel/leonida-keys-01-480.webp" width="480" height="270" alt="" loading="lazy" decoding="async"><span><b>La carte</b><i>2 547 lieux repérés, à cocher</i></span></a><a class="lk-link" href="${pre}vehicules.html"><img src="/img/officiel/one-eyed-willie-s-mod-shop-01-480.webp" width="480" height="270" alt="" loading="lazy" decoding="async"><span><b>Les 302 véhicules</b><i>Fiches, photos officielles et schémas</i></span></a><a class="lk-link" href="${pre}collectibles.html"><img src="/img/officiel/classic-car-collection-04-480.webp" width="480" height="270" alt="" loading="lazy" decoding="async"><span><b>Collectibles</b><i>La collection de Wyman et le carnet</i></span></a></div>
</section>`;
function page(C, { p, title, desc, canonical, ogImg, body, crumbs, ld = '', cls = '', player = '' }) {
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
<link rel="stylesheet" href="${p}radios.css">
<link rel="stylesheet" href="${p}lk-sections.css">
<meta property="og:image" content="${SITE}${ogImg || '/img/social-card.png'}">
<meta name="twitter:card" content="summary_large_image">
<meta property="og:url" content="${SITE}${canonical}">
</head>
<body>

<a class="skip" href="#main">Aller au contenu</a>
<div class="sunset" aria-hidden="true"></div>

${C.header.replace(/ class="here"/g, '')}

<main id="main" class="lore-page radios-page lkx-page${cls ? ' ' + cls : ''}">
${body}
${EXPLORE(p ? '../' : '')}
<section class="lk-outro" aria-label="Et après"><div class="shell lk-outro-in"><p class="lk-outro-k">Et après ?</p><h2>La suite s’écrit le 19 novembre 2026.</h2><p>Chaque fiche se complète avec le jeu : ce qu’on y trouve, ce qu’on y fait, ce que ça rapporte. Rien d’inventé d’ici là.</p><div class="lk-outro-links"><a href="${p ? '../' : ''}carte.html">Ouvrir la carte</a><a href="${p ? '../' : ''}progression.html">Ma progression</a></div></div></section>
</main>
${player}
${C.footer}

${C.scripts}
<script src="${p}radios.js"></script>
<script src="${p}lk-sections.js"></script>
</body>
</html>
`;
}

/* ---------- briques ---------- */
const imgOf = (MED, id) => { const m = MED[id]; if (!m) return null; return { a: m.variants[0], b: m.variants[1] || m.variants[0], titre: m.titre }; };
function imgTag(MED, id, alt, big, prefix = '') {
  const m = imgOf(MED, id); if (!m) return '';
  return '<img src="' + m.a.src + '" srcset="' + m.a.src + ' ' + m.a.w + 'w, ' + m.b.src + ' ' + m.b.w + 'w" sizes="' + (big ? '(max-width:820px) 100vw, 560px' : '(max-width:600px) 100vw, 300px') + '" width="' + (big ? m.b.w : m.a.w) + '" height="' + (big ? m.b.h : m.a.h) + '" alt="' + esc(alt) + '" loading="' + (big ? 'eager' : 'lazy') + '" decoding="async">';
}
/* titre d’une source : un titre d’article anglais reste tel quel dans toutes les langues (translate="no") */
function sourceList(D, ids) {
  return '<ol class="ed-srcs">' + ids.map(id => { const s = D.sources[id];
    return '<li id="src-' + esc(id) + '">' + S.pip(s.statut, true)
      + '<a class="ed-src-link" href="' + esc(s.url) + '" target="_blank" rel="noopener nofollow"' + (s.lang === 'en' ? ' translate="no"' : '') + '>' + esc(s.title) + '</a>'
      + '<span class="ed-src-meta">' + (s.publisher ? esc(s.publisher) + ' · ' : '') + (s.publishedAt ? 'publié le ' + esc(frDate(s.publishedAt)) + ' · ' : '') + 'consulté le ' + esc(frDate(s.consultedAt)) + '</span>'
      + '<p>' + esc(s.claim) + '</p></li>'; }).join('') + '</ol>';
}
/* renvois vers la liste des sources de la page (numéros ; le titre complet est dans la liste) */
const srcLinks = (D, ids) => '<span class="radios-src">' + ids.map((id, i) => '<a href="#src-' + esc(id) + '" aria-label="Source ' + (i + 1) + '">' + (i + 1) + '</a>').join('') + '</span>';
const plural = (n, one, many) => n + ' ' + (n > 1 ? many : one);
/* infos d’un morceau ; un nom propre qui suit (producteur…) reste tel quel dans toutes les langues */
/* un nom propre (infosNom) reste tel quel dans toutes les langues ; sans lui, une seule balise (mêmes textes à traduire que la ligne du moment) */
/* « Écouter » : un menu (popover, au-dessus de tout : jamais coupé par une carte) avec, quand c’est possible, « Écouter ici »
   (lecteur officiel chargé seulement après le clic : vidéo YouTube de Rockstar au moment du morceau, ou lecteur Spotify d’un
   single), l’écoute officielle quand Rockstar ou l’artiste la donne, puis une recherche sur les plateformes. Le site
   n’héberge aucun extrait. */
const PLATFORMS = [['Spotify', q => 'https://open.spotify.com/search/' + encodeURIComponent(q)], ['Apple Music', q => 'https://music.apple.com/search?term=' + encodeURIComponent(q)], ['YouTube', q => 'https://www.youtube.com/results?search_query=' + encodeURIComponent(q)], ['Deezer', q => 'https://www.deezer.com/search/' + encodeURIComponent(q)]];
/* moment d’un morceau en secondes : « 0:06 à 0:45 », « Vers 0:27, à l’autoradio », « De 25:44 à la fin » ; sinon le début */
function secs(t) { const m = String(t || '').match(/(\d+):(\d{2})(?:\s*à\s*(\d+):(\d{2}))?/); if (!m) return { s: 0, e: 0 }; return { s: +m[1] * 60 + +m[2], e: m[3] ? +m[3] * 60 + +m[4] : 0 }; }
function playable(m, v) {
  const sp = (m.liens || []).map(l => (String(l.url).match(/open\.spotify\.com\/track\/([A-Za-z0-9]+)/) || [])[1]).find(Boolean);
  if (sp) return { kind: 'sp', src: 'https://open.spotify.com/embed/track/' + sp };
  if (v && v.youtube) { const t = secs(m.moment); return { kind: 'yt', src: 'https://www.youtube-nocookie.com/embed/' + v.youtube + '?start=' + t.s + (t.e > t.s ? '&end=' + t.e : '') + '&autoplay=1&rel=0&playsinline=1' }; }
  return null;
}
function listen(P, m, v, uid) {
  const q = m.artiste + ' ' + m.titre, official = (m.liens || []).filter(l => /spotify|apple|youtube|deezer|tidal|soundcloud/i.test(l.url)), pl = playable(m, v);
  return '<div class="lkx-listen"><button type="button" class="lkx-listen-b" popovertarget="' + esc(uid) + '"><span class="lkx-listen-ico" aria-hidden="true">' + LKX.ICO.play + '</span><span>' + esc(P.ecouter) + '</span><span class="sr-only" translate="no"> ' + esc(m.titre) + '</span></button><div class="lkx-listen-menu" id="' + esc(uid) + '" popover>'
    + (pl ? '<button type="button" class="lkx-listen-here" data-lkx-play="' + pl.kind + '" data-lkx-src="' + esc(pl.src) + '" data-lkx-title="' + esc(m.titre + ' · ' + m.artiste) + '"><span class="lkx-listen-ico" aria-hidden="true">' + LKX.ICO.play + '</span><span><b>' + esc(P.ici) + '</b><small>' + esc(pl.kind === 'sp' ? P.iciSp : P.iciYt) + '</small></span></button>' : '')
    + (official.length ? '<p class="lkx-listen-k">' + esc(P.ecouteOff) + '</p>' + official.map(l => '<a href="' + esc(l.url) + '" target="_blank" rel="noopener nofollow" translate="no">' + esc(l.label) + ' <span aria-hidden="true">↗</span></a>').join('') : '')
    + PLATFORMS.map(([n, u]) => '<a href="' + esc(u(q)) + '" target="_blank" rel="noopener nofollow" translate="no">' + esc(n) + ' <span aria-hidden="true">↗</span></a>').join('')
    + '<p class="lkx-listen-note">' + esc(P.ecouterNote) + '</p></div></div>';
}
/* lecteur de la page (un seul), rempli par lk-sections.js au clic sur « Écouter ici » */
const playerBox = (P, p) => '<div class="lkx-player" id="lkx-player" role="region" aria-label="' + esc(P.lecteur) + '" hidden><div class="lkx-player-top"><span class="lkx-player-eq" aria-hidden="true"><i></i><i></i><i></i><i></i></span><p><span class="lkx-player-k">' + esc(P.lecteurK) + '</span><b class="lkx-player-t" translate="no" data-lkx-player-t></b></p><button type="button" class="lkx-player-x" data-lkx-player-close aria-label="' + esc(P.lecteurFermer) + '"><span aria-hidden="true">×</span></button></div><div class="lkx-player-f" data-lkx-player-f></div><p class="lkx-player-n">' + esc(P.lecteurNote) + ' <a href="' + p + 'mentions-legales.html#cookies">' + esc(P.lecteurLien) + '</a></p></div>';
const infosHtml = m => !m.infos ? '' : m.infosNom ? '<span class="radios-infos"><span>' + esc(m.infos) + '</span> <span translate="no">' + esc(m.infosNom) + '</span></span>' : '<span class="radios-infos">' + esc(m.infos) + '</span>';

/* ---------- le poste de Leonida (hub) ---------- */
function poste(D) {
  const P = D.poste, V = D.videos;
  const facade = '<div class="radios-facade" aria-hidden="true">'
    + '<div class="radios-ecran"><span class="radios-ecran-k" data-radios-k>' + esc(V[0].court) + '</span><span class="radios-defile" aria-hidden="true" translate="no"><span class="radios-defile-t" data-radios-defile></span></span></div>'
    + '<div class="radios-cadran"><span class="radios-graduation">' + [88, 92, 96, 100, 104, 108].map(n => '<i>' + n + '</i>').join('') + '</span><span class="radios-aiguille" data-radios-aiguille></span></div>'
    + '<div class="radios-molette" data-radios-molette><span class="radios-molette-in"><span class="radios-molette-repere"></span></span></div>'
    + '<div class="radios-eq">' + Array.from({ length: 14 }, () => '<i></i>').join('') + '</div>'
    + '</div>';
  const presets = '<nav class="radios-presets" aria-label="' + esc(P.choisir) + '" data-radios-presets>' + V.map((v, i) => '<a class="radios-preset" href="#radios-' + v.id + '" data-radios-preset="' + i + '"><span class="radios-preset-n" aria-hidden="true">' + (i + 1) + '</span><span class="radios-preset-t">' + esc(v.court) + '</span></a>').join('') + '</nav>';
  const panel = (v, i) => {
    const tracks = v.morceaux.map((m, j) => '<li class="radios-morceau" style="--i:' + j + '"><span class="radios-morceau-n" aria-hidden="true">' + String(j + 1).padStart(2, '0') + '</span><span class="radios-mini-eq" aria-hidden="true"><i></i><i></i><i></i><i></i></span>'
      + '<div class="radios-morceau-body"><p class="radios-morceau-t"><cite translate="no">' + esc(m.titre) + '</cite></p><p class="radios-morceau-a" translate="no">' + esc(m.artiste) + '</p>'
      + '<p class="radios-morceau-meta">' + infosHtml(m) + '<span class="radios-moment">' + esc(m.moment) + '</span></p>'
      + '<p class="radios-morceau-st">' + S.pip(m.statut, true) + srcLinks(D, m.sources) + '</p>'
      + ((m.liens || []).filter(l => !/spotify|apple|youtube|deezer/i.test(l.url)).length ? '<p class="radios-morceau-liens">' + m.liens.filter(l => !/spotify|apple|youtube|deezer/i.test(l.url)).map(l => '<a href="' + esc(l.url) + '" target="_blank" rel="noopener nofollow">' + esc(l.label) + ' <span aria-hidden="true">↗</span></a>').join('') + '</p>' : '')
      + '</div>' + listen(P, m, v, 'ecouter-' + v.id + '-' + (j + 1)) + '</li>').join('');
    return '<section class="radios-panneau" id="radios-' + v.id + '" aria-labelledby="radios-' + v.id + '-t" data-radios-panneau="' + i + '">'
      + '<header class="radios-panneau-h"><h3 id="radios-' + v.id + '-t">' + (v.id === 'album' ? '<span translate="no">' + esc(v.nom) + '</span>' : esc(v.nom)) + '</h3>'
      + '<p class="radios-panneau-meta"><time datetime="' + v.date + '">' + esc(v.dateTexte) + '</time> · ' + esc(plural(v.morceaux.length, P.morceau, P.morceaux)) + ' · ' + S.pip(v.statut, true) + '</p>'
      + '<p class="radios-panneau-txt">' + esc(v.resume) + '</p>'
      + '<p class="radios-panneau-liens"><a href="' + esc(v.lien) + '" target="_blank" rel="noopener nofollow">' + esc(v.lienLabel || P.video) + ' <span aria-hidden="true">↗</span></a>' + (v.fiche ? '<a href="radios/' + esc(v.fiche) + '.html">' + esc('La fiche de l’album') + '</a>' : '') + '</p></header>'
      + '<ol class="radios-morceaux' + (v.morceaux.length > 6 ? ' radios-morceaux--long' : '') + '">' + tracks + '</ol></section>';
  };
  return '<section class="shell radios-poste-sec" id="poste" aria-labelledby="poste-t">'
    + '<div class="radios-poste-head reveal"><p class="ed-kicker">' + esc(P.kicker) + '</p><h2 class="sec-h" id="poste-t">' + esc(P.titre) + '</h2><p class="radios-lede">' + esc(P.lede) + '</p></div>'
    + '<div class="radios-poste" data-radios-poste>' + facade + presets
    + '<p class="sr-only" aria-live="polite" data-radios-annonce></p>'
    + '<div class="radios-panneaux">' + V.map(panel).join('') + '</div></div></section>';
}

/* ---------- zone éditoriale (même rendu que outils/hubs-monde.cjs) ---------- */
function zone(D, STATUTS) {
  const Z = D.zone, para = l => (l || []).map(p => '<p>' + esc(p) + '</p>').join('');
  const srcMap = Object.fromEntries(Z.sources.map(id => [id, D.sources[id]]));
  const out = ['<div class="ed-zone ed-zone--monde">'];
  out.push(S.nav(Z.nav, 'Sections de la page ' + D.hub.label));
  out.push(S.section({ id: 'rockstar', num: 1, kicker: 'Sources officielles', title: 'Ce que Rockstar a montré', icon: 'film', tone: 'paper', lede: esc(Z.rockstar.lede) }, S.timeline(Z.rockstar.items) + para(Z.rockstar.p)));
  out.push(S.section({ id: 'communaute', num: 2, kicker: 'Observations des joueurs', title: 'Ce que la communauté a identifié', icon: 'loupe', tone: 'paper2', accent: 'coral', lede: esc(Z.communaute.lede) }, S.pairs(Z.communaute.pairs, srcMap) + para(Z.communaute.p)));
  out.push(S.section({ id: 'a-confirmer', num: 3, kicker: 'Questions ouvertes', title: 'Ce qui reste à confirmer', icon: 'sablier', tone: 'night', lede: esc(Z.confirmer.lede) }, S.pending(Z.confirmer.items) + para(Z.confirmer.p)));
  out.push(S.section({ id: 'pour-toi', num: 4, kicker: 'Outils du site', title: 'Ce que ça change pour toi', icon: 'boussole', tone: 'paper', lede: esc(Z.toi.lede) }, S.actions(Z.toi.actions) + para(Z.toi.p)));
  out.push(S.section({ id: 'faq', num: 5, kicker: 'Questions', title: 'Questions fréquentes', icon: 'faq', tone: 'paper2' }, '<p>Les questions qu’on tape dans un moteur de recherche, avec des réponses courtes et datées.</p><div class="faq rise">' + Z.faq.map(x => '<details><summary>' + esc(x.q) + '</summary><div class="ans">' + esc(x.a) + '</div></details>').join('') + '</div>'));
  const legend = '<div class="ed-levels">' + STATUTS.map(n => '<div class="ed-level"><h3>' + S.pip(n.statut) + esc(n.titre) + '</h3><p>' + esc(n.texte) + '</p></div>').join('') + '</div>';
  out.push(S.section({ id: 'sources', num: 6, kicker: Z.sources.length + ' sources ouvertes', title: 'Sources et statuts', icon: 'lire', tone: 'night', accent: 'coral', lede: esc(Z.sourcesLede) },
    legend + '<h3 class="ed-h3">Pages consultées</h3>' + sourceList(D, Z.sources) + '<div class="ed-callout"><p><strong>Ce qu’on ne fait pas.</strong> Aucune donnée issue des fuites de 2022 ou de 2026, aucune parole de chanson, aucun extrait audio ou vidéo, aucune pochette. Les statuts sont expliqués dans le <a href="tuto.html#sources">Tuto</a>.</p></div>'));
  out.push('</div>');
  return out.join('\n');
}

/* ---------- pages ---------- */
function hubPage(ctx) {
  const { D, MED, STATUTS, ROOTC } = ctx, H = D.hub;
  const pile = require('./lot-c-visuals.cjs').stack(H.pile.map(p => { const m = imgOf(MED, p.media); return { src: m.a.src, big: m.b.src, alt: p.alt, caption: p.caption }; }), { label: 'Trois visuels officiels de cette section' });
  /* l’album : grande vedette (image, disque qui sort de sa pochette, chiffres de l’annonce) ; d’éventuelles autres fiches en grille */
  const A = D.album || {}, [al, ...others] = D.fiches;
  const vedette = al ? '<a class="radios-album lkx-tilt lkx-sweep" href="radios/' + esc(al.id) + '.html"><span class="radios-album-art"><span class="radios-album-img">' + LKX.img(MED, (al.media || [])[0], al.imageAlt, { big: true, sizes: '(max-width:900px) 100vw, 640px' }) + '</span><span class="radios-vinyl" aria-hidden="true"><span class="radios-vinyl-label"></span></span></span>'
    + '<span class="radios-album-body"><span class="radios-album-k">' + esc(al.kind) + '</span><h3 translate="no">' + esc(al.name) + '</h3>' + (al.tagline ? '<span class="radios-album-tag">' + esc(al.tagline) + '</span>' : '') + '<span class="radios-album-desc">' + esc(al.description) + '</span>'
    + '<span class="radios-album-stats">' + (A.stats || []).map(t => '<span>' + esc(t) + '</span>').join('') + '</span><span class="radios-album-cta">' + esc(A.cta || 'Voir la fiche') + '</span></span></a>' : '';
  const albumSec = '<section class="radios-album-sec" id="fiches" aria-labelledby="fiches-t"><div class="shell"><div class="radios-album-head reveal"><p class="ed-kicker">' + esc(A.kicker || '') + '</p><h2 class="sec-h" id="fiches-t">' + esc(D.fichesTitre) + '</h2><p class="radios-lede">' + esc(D.fichesLede) + '</p></div>'
    + '<div class="radios-album-wrap lkx-up lk-arrive" data-lkx-in>' + vedette + '</div>'
    + (A.ecouter ? '<p class="radios-album-more"><a class="lkx-btn lkx-btn--ghost" href="#radios-album">' + esc(A.ecouter) + '</a></p>' : '')
    + (others.length ? '<div class="lore-grid lore-grid--center lore-grid--n' + others.length + '">' + others.map(x => card(x)).join('') + '</div>' : '') + '</div></section>';
  function card(x) { return '<a class="lore-card rise" href="radios/' + x.id + '.html">' + (x.media && x.media[0] ? imgTag(MED, x.media[0], x.imageAlt, false) : '<div class="lore-vide">Visuel officiel à venir</div>')
    + '<div class="veh-body"><span class="veh-marque">' + esc(x.kind) + '</span><h3 translate="no">' + esc(x.name) + '</h3>' + (x.tagline ? '<p class="lore-cardtag">' + esc(x.tagline) + '</p>' : '') + '<p>' + esc(x.description) + '</p><span class="veh-go">Voir la fiche</span></div></a>'; }
  const body = `<section class="page-head shell lk-glow"><div class="lk-head-grid"><div>
  <p class="fiche-cat">${esc(H.label)} · GTA VI</p>
  <h1>${esc(H.title)}</h1>
  <p class="lede">${esc(H.lede)}</p>
  <p class="d-intro-note">${esc(H.note)} <a href="tuto.html#sources">Comprendre les statuts</a>.</p>
</div>${pile}</div></section>
${poste(D)}
${albumSec}
${zone(D, STATUTS)}`;
  const collection = '<script type="application/ld+json">' + JSON.stringify({ '@context': 'https://schema.org', '@type': 'CollectionPage', name: H.title, description: metaDesc(H.desc), url: SITE + '/' + HUB + '.html', inLanguage: 'fr', isPartOf: { '@type': 'WebSite', name: 'Leonidakit', url: SITE + '/' }, mainEntity: { '@type': 'ItemList', numberOfItems: D.fiches.length, itemListElement: D.fiches.map((x, i) => ({ '@type': 'ListItem', position: i + 1, name: x.name, url: SITE + '/' + HUB + '/' + x.id + '.html' })) } }) + '</script>';
  const og = imgOf(MED, H.pile[0].media);
  return page(ROOTC, { player: playerBox(D.poste, ''), p: '', title: H.title + ' | Leonidakit', desc: H.desc, canonical: '/' + HUB + '.html', ogImg: og.b.src, body, crumbs: [['Accueil', '/'], [H.label, '/' + HUB + '.html']], ld: collection });
}

function fichePage(ctx, x) {
  const { D, MED, SUBC, ED } = ctx, H = D.hub, p = '../';
  const byId = id => Object.values(ED).flat().find(y => y.id === id);
  const rel = (ids, folder, label, kindLabel) => { const l = (ids || []).map(byId).filter(Boolean); if (!l.length) return '';
    return '<div class="lore-rel-group"><h3>' + label + '</h3><div class="lore-mini">' + l.map(y => { const m = (y.media || []).map(id => MED[id]).filter(Boolean)[0];
      return '<a class="lore-minicard" href="../' + folder + '/' + y.id + '.html">' + (m ? '<img src="' + m.variants[0].src + '" width="' + m.variants[0].w + '" height="' + m.variants[0].h + '" alt="" loading="lazy" decoding="async">' : '<i class="lore-minivide"></i>') + '<span><b>' + esc(y.name) + '</b><i>' + esc(kindLabel) + '</i></span></a>'; }).join('') + '</div></div>'; };
  const album = D.videos.find(v => v.fiche === x.id);
  const singles = album ? '<div class="lore-texte reveal"><h2>Les titres déjà sortis</h2><ol class="radios-morceaux radios-morceaux--fiche">' + album.morceaux.map((m, j) => '<li class="radios-morceau" style="--i:' + j + '"><span class="radios-morceau-n" aria-hidden="true">' + String(j + 1).padStart(2, '0') + '</span><span class="radios-mini-eq" aria-hidden="true"><i></i><i></i><i></i><i></i></span><div class="radios-morceau-body"><p class="radios-morceau-t"><cite translate="no">' + esc(m.titre) + '</cite></p><p class="radios-morceau-a" translate="no">' + esc(m.artiste) + '</p>' + (m.infos ? '<p class="radios-morceau-meta">' + infosHtml(m) + '</p>' : '') + '</div>' + listen(D.poste, m, album, 'ecouter-' + album.id + '-' + (j + 1)) + '</li>').join('') + '</ol></div>' : '';
  const links = [];
  if (x.source) links.push('<a href="' + esc(x.source) + '" target="_blank" rel="noopener nofollow">Annonce officielle</a>');
  for (const l of x.liens || []) links.push('<a href="' + esc(l.url) + '" target="_blank" rel="noopener nofollow">' + esc(l.label) + '</a>');
  links.push('<a href="../radios.html#poste">Le poste de Leonida</a>');
  const m = (x.media || [])[0];
  const facts = (x.facts || []).length ? '<div class="lore-facts"><h2>À retenir</h2><ul>' + x.facts.map(f => '<li class="rise">' + esc(f) + '</li>').join('') + '</ul></div>' : '';
  const relBlocks = rel(x.characters, 'personnages', 'Personnages', 'Personnage') + rel(x.businesses, 'entreprises', 'Entreprises', 'Entreprise');
  const srcs = (x.sources || []).length ? '<section class="shell radios-fiche-src reveal" aria-labelledby="sources-t"><h2 class="sec-h" id="sources-t">Sources</h2>' + sourceList(D, x.sources) + '<p class="radios-note">Toutes les sources de la section, avec les statuts, sont <a href="../radios.html#sources">en bas de la page Radios et musique</a>.</p></section>' : '';
  const body = `<section class="page-head shell">
  <nav class="crumbs" aria-label="Fil d’Ariane"><a href="../index.html">Accueil</a> / <a href="../${HUB}.html">${esc(H.label)}</a> / <span translate="no">${esc(x.name)}</span></nav>
  <div class="lore-hero lore-enter">
    <div class="lore-copy">
      <p class="fiche-cat">${esc(x.kind)} · GTA VI</p>
      <h1 translate="no">${esc(x.name)}</h1>
      ${x.tagline ? `<p class="lore-tag">${esc(x.tagline)}</p>` : ''}
      <p class="lede">${esc(x.description)}</p>
      <div class="lore-links">${links.join('')}</div>
    </div>
    ${m ? `<figure class="lore-fig radios-fig">${imgTag(MED, m, x.imageAlt, true)}<span class="radios-vinyl radios-vinyl--fiche" aria-hidden="true"><span class="radios-vinyl-label"></span></span></figure>` : ''}
  </div>
</section>
<section class="shell lore-body">
  ${x.texte ? `<div class="lore-texte reveal"><h2>Présentation</h2><p class="rise">${esc(x.texte)}</p></div>` : ''}
  ${singles}
  ${x.contexte ? `<div class="lore-texte reveal"><h2>Ce que l’annonce dit, et ne dit pas</h2><p class="rise">${esc(x.contexte)}</p></div>` : ''}
  ${x.pratique ? `<div class="lore-texte reveal"><h2>Ce qu’on sait pour le jeu</h2><p class="rise">${esc(x.pratique)}</p></div>` : ''}
  ${facts}
  ${relBlocks ? `<div class="lore-related"><h2>En lien</h2>${relBlocks}</div>` : ''}
</section>
${LKX.gallery(MED, (x.galerie || []).map(g => ({ media: g.media, alt: g.alt, legende: g.legende })), { name: x.name, kicker: x.kind })}
${srcs}`;
  const og = m ? imgOf(MED, m) : null;
  return page(SUBC, { player: playerBox(D.poste, p), p, title: x.name + ' — GTA VI | Leonidakit', desc: x.description, canonical: '/' + HUB + '/' + x.id + '.html', ogImg: og ? og.b.src : null, body, crumbs: [['Accueil', '/'], [H.label, '/' + HUB + '.html'], [x.name, '/' + HUB + '/' + x.id + '.html']], cls: album ? 'radios-page--album' : '' });
}

/* ---------- recherche du site (outils/radios-index.json, lu par sync-site.cjs) ---------- */
function indexEntries(D) {
  const n = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const tracks = D.videos.flatMap(v => v.morceaux.map(m => m.titre + ' ' + m.artiste)).join(' ');
  return [{ l: D.hub.title, k: D.hub.label, u: '/' + HUB + '.html', s: n(D.hub.title + ' ' + D.hub.label + ' radio radios stations musique bande son chansons trailer extended look album leonida gta vi ' + tracks), w: 1 },
    ...D.fiches.map(x => ({ l: x.name, k: x.kind, u: '/' + HUB + '/' + x.id + '.html', s: n(x.name + ' ' + x.kind + ' ' + x.description + ' ' + (x.tagline || '') + ' ' + (x.aliases || []).join(' ')), w: 1 }))];
}

/* ---------- Léo : fiches (morceau « monde ») et questions de la section (morceau leo/radios.json) ---------- */
function leo(root = ROOT) {
  const { D, MED } = load(root);
  const image = ids => (ids || []).flatMap(id => (MED[id] && MED[id].variants) || []).map(v => v.src).find(src => fs.existsSync(path.join(root, src.slice(1)))) || null;
  const fiches = D.fiches.map(x => ({ key: 'album:' + x.id, id: x.id, kind: 'album', shard: 'monde', name: x.name, aliases: x.aliases || [], category: x.kind, url: '/' + HUB + '/' + x.id + '.html', image: image(x.media), calcId: null, price: null, proof: 'Album annoncé par Rockstar ; sources datées sur la fiche.', source: x.source || null, verifiedAt: D.sources[(x.sources || [])[0]] ? D.sources[x.sources[0]].consultedAt : null, description: x.description, tagline: x.tagline || null }));
  const label = D.hub.label, verifiedAt = Object.values(D.sources).map(s => s.consultedAt).sort().pop();
  const topics = D.zone.faq.filter(x => !x.leo).map((x, i) => ({ id: 'radios-faq-' + (i + 1), q: x.q, f: [x.q, ...(x.f || [])], k: x.k, text: x.a, status: 'Réponse de la FAQ « ' + label + ' », sources en bas de la page', links: [{ label: 'La FAQ et ses sources', url: '/' + HUB + '.html#faq' }], verifiedAt, min: Number.isInteger(x.min) ? x.min : 2 }));
  return { fiches, topics, suggestions: { radios: D.leo.suggestions }, inputs: [DATA_FILE] };
}

/* ---------- génération ---------- */
function generate(root = ROOT) {
  const { D, MED, STATUTS, read } = load(root);
  check(D, MED, root);
  const ED = JSON.parse(read('outils/editorial.json'));
  const ctx = { D, MED, STATUTS, ED, ROOTC: chromeOf(read('a-propos.html')), SUBC: chromeOf(read('vehicules/karin-sultan.html')) };
  fs.writeFileSync(path.join(root, HUB + '.html'), hubPage(ctx));
  fs.mkdirSync(path.join(root, HUB), { recursive: true });
  const keep = new Set(D.fiches.map(x => x.id + '.html'));
  for (const f of fs.readdirSync(path.join(root, HUB))) if (f.endsWith('.html') && !keep.has(f)) fs.unlinkSync(path.join(root, HUB, f));
  for (const x of D.fiches) fs.writeFileSync(path.join(root, HUB, x.id + '.html'), fichePage(ctx, x));
  fs.writeFileSync(path.join(root, 'outils/radios-index.json'), JSON.stringify(indexEntries(D)));
  const n = D.videos.reduce((a, v) => a + v.morceaux.length, 0);
  console.log('radios : ' + D.videos.length + ' sources de musique, ' + n + ' morceaux, ' + D.fiches.length + ' fiche(s), ' + D.zone.faq.length + ' questions, ' + D.zone.sources.length + ' sources');
}

module.exports = { generate, leo, load, check, DATA_FILE };
if (require.main === module) generate();
