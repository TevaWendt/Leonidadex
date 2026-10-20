#!/usr/bin/env node
'use strict';
/* v7.87 : section « Actualités et vidéos » — actus.html (frise datée de tout ce que Rockstar a publié sur GTA VI, flux
   actus.xml), videos.html et videos/<id>.html (les vidéos officielles, moment par moment ; quatre depuis le 15 octobre 2026) et editions.html (les deux
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
const VT = require('./vitrine.cjs'); /* v7.92 : briques des pages enrichies (vitrine.css, vitrine.js) */
const VTX = JSON.parse(fs.readFileSync(path.join(ROOT, 'outils/vitrine.json'), 'utf8'));
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
  /* v8.01 : media = le visuel officiel que ce moment a apporté à la fiche (chrono), quand il est noté */
  for (const [key, f] of Object.entries(ctx.MD.fiches)) for (const x of f.chrono || []) if (evs.includes(x.ev)) { const fi = ficheOf(ctx, key); if (fi) out.push({ fiche: fi, statut: x.statut, texte: x.texte, media: x.media || null }); }
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
  /* pages écrites par ce générateur : pas encore sur le disque à la première génération (v7.92.1 : prix.html) */
  const OWN = /^(?:actus\.html|videos\.html|editions\.html|prix\.html|videos\/[a-z0-9-]+\.html)(?:#|$)/;
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
  /* v7.92.1 : chaque annonce a un type connu (filtre de la frise), chaque visuel existe ; la page Prix et collector */
  for (const e of A.evenements) { if (!A.actus.types[e.type]) err.push('type d’annonce inconnu : ' + e.id); if (e.media && (!MED[e.media] || !e.alt)) err.push('visuel ou texte alternatif d’annonce : ' + e.id); }
  if (A.editions.collector && !MED[A.editions.collector.media]) err.push('visuel inconnu : ' + A.editions.collector.media);
  if (A.editions.prix) src(A.editions.prix.src, 'éditions (prix)');
  if (A.editions.bonus[1] && A.editions.bonus[1].src) src(A.editions.bonus[1].src, 'éditions (GTA+)');
  const PX = A.prix;
  if (PX) {
    const meds = [PX.hero.media, PX.hero.ferme, ...PX.jeu.editions.map(x => x.media), ...PX.collector.objets.map(o => o.media), PX.manettes.media, PX.boutique.media];
    for (const id of meds) if (!MED[id]) err.push('prix : visuel inconnu ' + id);
    for (const o of PX.collector.objets) if (!o.alt || !o.t || !o.d) err.push('prix : objet du coffret incomplet ' + o.media);
    if (PX.collector.objets.length !== 11) err.push('le coffret compte onze objets d’après Rockstar, pas ' + PX.collector.objets.length);
    for (const id of PX.sources) src(id, 'prix');
    for (const p of [...PX.jeu.editions.map(x => x.st), PX.collector.st, PX.manettes.st, PX.boutique.st]) for (const s of p || []) { if (!ST.includes(s.statut)) err.push('prix : statut inconnu'); src(s.src, 'prix (statut)'); }
    if (PX.desc.length > 160) err.push('description trop longue : prix');
    for (const l of PX.liens || []) if (!exists(l.href)) err.push('prix : lien absent ' + l.href);
  }
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
<link rel="stylesheet" href="${p}vitrine.css">
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
<script src="${p}vitrine.js"></script>
</body>
</html>
`;
}

/* ---------- v7.87.1 (passe de qualité) : le gabarit des autres pages de section ----------
   Chaque bloc de la page est une section éditoriale du moteur commun (outils/sections.cjs : numéro, kicker, titre, icône,
   fond papier / papier 2 / nuit alternés, accent ambre ou corail) ; les pages longues ont la sous-navigation collante
   (common.js). Les blocs qui entrent au défilement portent data-lk-reveal et la classe ac-in : c’est le moteur commun
   (common.js, LKMotion, un seul observateur) qui pose « is-in », avec sa cascade de 60 ms plafonnée à 300 ms ; actus.css
   décrit le mouvement (--c-rise et opacité, durées et courbes des jetons de motion-tokens.css). Déjà à l’écran à
   l’ouverture, en « réduire les animations » ou sans script : tout est visible tout de suite. */
const UI = {
  nav: 'Sections de la page', faqK: 'Questions', faqT: 'Questions fréquentes', srcT: 'Sources et statuts',
  srcK: n => n > 1 ? n + ' sources ouvertes' : 'Une source ouverte',
  frise: { k: 'Date par date', nav: 'La frise' }, aVenir: { nav: 'À venir' },
  moments: { k: 'Image par image', nav: 'Moments' }, musique: { k: 'La bande-son', nav: 'Musique' },
  fiches: { k: 'Relié aux fiches', nav: 'Fiches' }, premiere: 'Première apparition', autres: { k: 'À voir aussi', nav: 'Autres vidéos' },
  videos: { k: 'Publiées par Rockstar' },
  editions: { k: 'Standard ou Ultimate', nav: 'Éditions' }, ultimate: { k: 'Le contenu en plus', nav: 'Ultimate' },
  bonus: { k: 'Précommande', nav: 'Bonus' }, pratique: { k: 'En pratique', t: 'Boîte, préchargement et régions', nav: 'En pratique' }
};
/* « GTA 6 » ne se coupe pas en fin de ligne (titres, questions) : espace insécable dans la page française ; la mémoire de
   traduction normalise les espaces, la clé reste la même */
const nb = s => String(s).replace(/\bGTA (6|VI)\b/g, 'GTA $1');
const IN = ' ac-in" data-lk-reveal';
/* sections de la page, dans l’ordre : fonds alternés (papier, papier 2 ; « nuit » quand une section le demande), accent
   alterné ; sous-navigation collante dès quatre sections ; « count » : nombre posé en pastille à côté du titre */
function zone(list) {
  const items = list.filter(Boolean); let prev = 'paper2';
  const html = items.map((x, i) => {
    const tone = x.tone || (prev === 'paper' ? 'paper2' : 'paper'); prev = tone;
    const sec = S.section({ id: x.id, num: i + 1, kicker: x.k, title: nb(x.t), icon: x.icon, tone, accent: x.accent || (i % 2 ? 'coral' : 'amber'), lede: x.lede ? esc(x.lede) : '', cls: 'ac-sec' + (x.cls ? ' ' + x.cls : '') }, x.body);
    return x.count ? sec.replace('</h2>', ' <span class="ac-n">' + x.count + '</span></h2>') : sec;
  }).join('\n');
  const nav = items.length >= 4 ? S.nav(items.map(x => ({ href: '#' + x.id, label: x.nav, fam: x.fam })), UI.nav) + '\n' : '';
  return '<div class="ed-zone ed-zone--actus">\n' + nav + html + '\n</div>';
}

/* ---------- briques ---------- */
const imgOf = (MED, id) => { const m = MED[id]; if (!m) return null; return { a: m.variants[0], b: m.variants[1] || m.variants[0] }; };
const pile = (MED, list, label) => require('./lot-c-visuals.cjs').stack(list.map(x => { const m = imgOf(MED, x.media); return { src: m.a.src, big: m.b.src, alt: x.alt, caption: x.caption }; }), { label });
function sourceList(ctx, ids, anchorPrefix = 'src-') {
  return '<ol class="ed-srcs">' + ids.map(id => { const s = ctx.SRC[id];
    return '<li id="' + anchorPrefix + esc(id) + '">' + S.pip(s.statut, true)
      + '<a class="ed-src-link" href="' + esc(s.url) + '" target="_blank" rel="noopener nofollow"' + (s.lang === 'en' ? ' translate="no"' : '') + '>' + esc(s.title) + '</a>'
      + '<span class="ed-src-meta">' + (s.publisher ? esc(s.publisher) + ', ' : '') + (s.publishedAt ? 'publié le ' + esc(frDate(s.publishedAt)) + ', ' : '') + 'consulté le ' + esc(frDate(s.consultedAt)) + '</span>'
      + (s.claim ? '<p>' + esc(s.claim) + '</p>' : '') + '</li>'; }).join('') + '</ol>';
}
const srcRefs = ids => '<span class="ac-refs">' + ids.map((id, i) => '<a href="#src-' + esc(id) + '" aria-label="Source ' + (i + 1) + '">' + (i + 1) + '</a>').join('') + '</span>';
const uniq = l => [...new Set(l)];
/* v7.87.1 : chaque question entre au défilement (moteur commun), « GTA 6 » insécable */
const faqBlock = list => '<div class="faq">' + list.map(x => '<details class="ac-in" data-lk-reveal><summary>' + esc(nb(x.q)) + '</summary><div class="ans">' + esc(x.a) + (x.href ? ' <a href="' + esc(x.href) + '">' + esc(x.label) + '</a>' : '') /* v7.93 : lien vers la page qui détaille */ + '</div></details>').join('') + '</div>';
/* v7.87.1 : sections communes de fin de page (questions, sources et statuts) */
const faqSec = (list, aside) => ({ id: 'faq', k: UI.faqK, t: UI.faqT, icon: 'faq', nav: UI.faqK, fam: 'faq', body: aside ? VT.faqGrid(faqBlock(list), aside) : faqBlock(list) });
const srcSec = (ctx, ids, lede, after = '') => ({ id: 'sources', k: UI.srcK(ids.length), t: UI.srcT, icon: 'statuts', nav: 'Sources', fam: 'sources', lede, body: sourceList(ctx, ids) + after });
const faqLD = list => '<script type="application/ld+json">' + JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: list.map(x => ({ '@type': 'Question', name: x.q, acceptedAnswer: { '@type': 'Answer', text: x.a } })) }) + '</script>';
/* révélations d’une annonce ou d’une vidéo, regroupées par famille de fiches */
/* v7.87.1 : sous le titre h3 d’une annonce (Actualités), le nom de famille est un titre h4 ; directement sous une section
   (pages des vidéos), c’est une étiquette de groupe (p) : la page n’a plus de saut de titre (h2 → h4), et le texte que Léo
   lit dans la page ne change pas (outils/gen-leo.cjs ne découpe ses passages qu’aux titres h1 à h3). Chaque groupe des
   pages des vidéos entre au défilement (moteur commun). */
/* v7.87.1 : les noms des fiches, des modèles vus et des vidéos passent par la mémoire de traduction (un nom propre y est « = ») :
   « translate="no" » laissait « Les forces de l’ordre de Leonida », « Fusil à pompe » ou « Dakota décapotable » en français
   sur les pages traduites ; restent tels quels les titres des morceaux, leurs artistes et les noms officiels anglais.
   Le nom et le statut (ou le type et le nom d’un modèle vu, le titre d’une vidéo) sont séparés par un élément de bloc
   (div affiché en ligne) : chacun est alors un segment à part pour outils/langues.cjs, traduit par sa propre entrée,
   au lieu d’une phrase « nom + statut » à traduire pour chaque combinaison */
function revealList(rev, prefix, inCard = true) {
  const order = Object.keys(FOLDER), h = inCard ? 'h4' : 'p';
  const fams = order.filter(f => rev.some(r => r.fiche.fam === f));
  return '<div class="ac-rev">' + fams.map(f => '<div class="ac-rev-g' + (inCard ? '"' : IN) + '><' + h + ' class="ac-rev-h">' + esc({ regions: 'Lieux', characters: 'Personnages', businesses: 'Entreprises', residences: 'Demeures', hideouts: 'Planques', factions: 'Gangs et factions' }[f]) + '</' + h + '><ul class="ac-rev-l">'
    + rev.filter(r => r.fiche.fam === f).map(r => '<li class="ac-rev-i"><a class="ac-rev-a" href="' + prefix + esc(r.fiche.href) + '">' + esc(r.fiche.name) + '</a><div class="ac-rev-st">' + S.pip(r.statut, true) + '</div><p>' + esc(r.texte) + '</p></li>').join('') + '</ul></div>').join('') + '</div>';
}

/* ---------- Actualités ---------- */
function actusPage(ctx) {
  const { A, MED, ROOTC } = ctx, X = A.actus;
  /* v7.87.1 : les billets entrent au défilement ; leur talon daté se « tamponne » (actus.css) */
  const upcoming = '<ol class="ac-next-l">' + A.aVenir.map(x => { const d = new Date(x.iso + 'T12:00:00Z');
      return '<li class="ac-ticket' + IN + ' data-iso="' + esc(x.iso) + '"><p class="ac-ticket-d"><time datetime="' + esc(x.iso) + '"><b>' + d.getUTCDate() + '</b><span>' + esc(new Intl.DateTimeFormat('fr-FR', { month: 'long', timeZone: 'UTC' }).format(d)) + ' ' + d.getUTCFullYear() + '</span></time></p>'
        + '<div class="ac-ticket-b"><h3>' + nb(esc(x.titre)) + '</h3><p>' + esc(x.texte) + '</p>' + VT.cd(x.iso) + (x.lien ? '<a class="ac-ticket-a" href="' + esc(x.lien.href) + '">' + esc(x.lien.label) + '</a>' : '') + '</div></li>'; }).join('') + '</ol>';
  /* v7.87.1 : moment de la page — à l’entrée de chaque annonce (moteur commun), son point s’allume, la date glisse, la carte
     monte, puis un tronçon ambre de la frise se trace jusqu’à l’annonce suivante (actus.css) */
  /* v7.92 : chaque annonce a son visuel officiel (affiche de la vidéo, visuel du dossier, sinon celui choisi dans actus.json,
     avec son texte alternatif), son type (filtre de la frise, vitrine.js) ; un repère d’année ouvre chaque année */
  let year = null;
  const events = A.evenements.map(e => {
    const evs = e.evs || (e.ev ? [e.ev] : []), rev = revelations(ctx, evs);
    const dossierMedia = evs.map(ev => ctx.MD.evenements[ev] && ctx.MD.evenements[ev].media).find(Boolean);
    const vid = e.video ? A.videos.liste.find(v => v.id === e.video) : null;
    const media = vid ? vid.affiche : dossierMedia || e.media, alt = vid || dossierMedia ? '' : e.alt || '';
    const links = [...(vid ? [{ href: 'videos/' + vid.id + '.html', label: 'La page de la vidéo' }] : []), ...(e.liens || []), ...(fs.existsSync(path.join(ROOT, 'moments', e.id + '.html')) ? [{ href: 'moments/' + e.id + '.html', label: 'La page de l’annonce' }] : []) /* v7.96 : une page par annonce */];
    const y = e.iso.slice(0, 4), mark = y !== year ? '<li class="ac-yr" data-vt-sep aria-hidden="true"><span>' + y + '</span></li>' : ''; year = y;
    return mark + '<li class="ac-ev ac-ev--' + esc(e.type) + '" id="ev-' + esc(e.id) + '" data-iso="' + esc(e.iso) + '" data-lk-reveal data-vt-item data-vt-t="' + esc(e.type) + '">'
      + '<div class="ac-ev-when"><time datetime="' + esc(e.iso) + '">' + esc(e.dateTexte || frLong(e.iso)) + '</time><span class="ac-ev-type">' + esc(X.types[e.type]) + '</span></div>'
      + '<article class="ac-ev-card">' + (media ? '<figure class="ac-ev-fig">' + VT.img(media, alt, { sizes: '(max-width:700px) 100vw, 280px', prefix: '/' }) + '</figure>' : '')
      + '<div class="ac-ev-body"><p class="ac-ev-st">' + S.pip(e.statut, true) + '</p><h3 class="ac-ev-t">' + esc(e.titre) + '</h3><p class="ac-ev-text">' + esc(e.texte) + ' ' + srcRefs(e.sources) + '</p>'
      + (links.length ? '<p class="ac-ev-links">' + links.map(l => '<a href="' + esc(l.href) + '">' + esc(l.label) + '</a>').join('') + '</p>' : '')
      + (rev.length ? '<details class="ac-ev-more"><summary>' + esc(X.montre) + ' <span class="ac-n">' + rev.length + '</span></summary>' + revealList(rev, '') + '</details>' : '')
      + '</div></article></li>';
  }).join('');
  const allSrc = uniq([...A.evenements.flatMap(e => e.sources), ...A.aVenir.map(x => x.source)]);
  /* chiffres de l’en-tête : calculés sur les données (annonces, vidéos, sources, jours de la première vidéo à la sortie) */
  const first = A.videos.liste.map(v => v.iso).sort()[0], sortie = A.aVenir.find(x => /sortie/i.test(x.titre)) || A.aVenir[1];
  const jours = Math.round((Date.parse(sortie.iso) - Date.parse(first)) / 864e5);
  const figs = VT.figs([{ n: A.evenements.length, label: X.chiffres.annonces }, { n: A.videos.liste.length, label: X.chiffres.videos }, { n: allSrc.length, label: X.chiffres.sources }, { n: jours.toLocaleString('fr-FR'), label: X.chiffres.jours, accent: true }], { cls: 'ac-figs' });
  const types = Object.keys(X.types);
  const bar = VT.filters('ac-frise', types.map(t => ({ f: t, label: X.types[t], n: A.evenements.filter(e => e.type === t).length })), { label: X.tout, n: A.evenements.length }, X.filtresLabel);
  /* v7.92.1 : « À la une » : la dernière annonce en grand (son visuel, sa date, son texte et ses liens), avant ce qui est
     daté et la frise ; elle reste aussi en tête de la frise */
  const une = (() => {
    const e = A.evenements[0], vid = e.video ? A.videos.liste.find(v => v.id === e.video) : null;
    const media = vid ? vid.affiche : e.media, alt = vid ? 'Affiche officielle : ' + vid.nom : e.alt;
    const links = [...(vid ? [{ href: 'videos/' + vid.id + '.html', label: X.une.voir, main: true }] : []), ...(e.liens || [])];
    return '<article class="vt-feature ac-une lk-reveal">' + (media ? '<figure class="vt-feature-fig">' + VT.img(media, alt, { big: true, sizes: '(max-width:819px) 92vw, 54vw'/* v8.01 : suit la largeur réelle de la colonne (1 004 px à 1 920 px) */ }) + '</figure>' : '')
      + '<div class="vt-feature-b"><p class="vt-feature-k"><span class="ac-une-type">' + esc(X.types[e.type]) + '</span> <time datetime="' + esc(e.iso) + '">' + esc(frLong(e.iso)) + '</time></p>'
      + '<p class="ac-une-st">' + S.pip(e.statut, true) + '</p><h3 class="vt-feature-t">' + esc(e.titre) + '</h3><p class="vt-feature-d">' + esc(e.texte) + ' ' + srcRefs(e.sources) + '</p>'
      + (links.length ? '<p class="ac-une-act">' + links.map(l => '<a class="lkx-btn' + (l.main ? '' : ' lkx-btn--ghost') + '" href="' + esc(l.href) + '">' + esc(l.label) + '</a>').join('') + '</p>' : '') + '</div></article>';
  })();
  const body = `<section class="page-head shell lk-glow"><div class="lk-head-grid"><div>
  <p class="fiche-cat">${esc(X.label)}, GTA VI</p>
  <h1>${esc(nb(X.title))}</h1>
  <p class="lede">${esc(X.lede)}</p>
  <p class="d-intro-note">${esc(X.note)} <a href="tuto.html#sources">Comprendre les statuts</a>.</p>
  <p class="ac-rss"><a class="lkx-btn lkx-btn--ghost" href="actus.xml" type="application/rss+xml">${esc(X.flux)}</a><span>${esc(X.fluxNote)}</span></p>
</div>${pile(MED, X.pile, 'Trois affiches officielles des vidéos de GTA VI')}</div>
${figs}</section>
${zone([
    { id: 'une', k: X.une.k, t: X.une.t, icon: 'film', nav: X.une.k, fam: 'rockstar', body: une },
    { id: 'a-venir', k: X.aVenirKicker, t: X.aVenirTitre, icon: 'horloge', nav: UI.aVenir.nav, fam: 'equipements', body: upcoming },
    { id: 'frise', k: UI.frise.k, t: X.frise, icon: 'liste', nav: UI.frise.nav, fam: 'munitions', lede: X.friseLede, body: bar + '<ol class="ac-evs" id="ac-frise" role="list">' + events + '</ol>' },
    faqSec(X.faq, leoAside(X.leo, 'carte-postale-vice-city', 'Carte postale « Vice City » de Leonida : la baie, les tours et des bateaux, illustration officielle de GTA VI')),
    srcSec(ctx, allSrc, 'Chaque annonce renvoie ici par son numéro ; les révélations fiche par fiche ont leurs sources sur chaque fiche.')
  ])}`;
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
/* v7.92 : la version 800 px de l’affiche (à côté de la 480 et de la 1 280 dans img/officiel) ; au téléphone, l’affiche
   s’arrête à 800 px (un écran à densité 3 prenait la 1 280 : deux à trois fois plus lourde, sans différence visible) */
const midOf = src => { const c = /-1280\.webp$/.test(src) ? src.replace(/-1280\.webp$/, '-800.webp') : null; return c && fs.existsSync(path.join(ROOT, c.replace(/^\//, ''))) ? c : null; };
function screen(ctx, v, P, pre = '../', lazy = false) {
  const m = imgOf(ctx.MED, v.affiche), mid = midOf(m.b.src), sizes = '(max-width:900px) 100vw, (max-width:1500px) 62vw, 1004px';/* v8.01 : suit la largeur réelle de l’écran de projection (1 004 px à 1 920 px ; l’image de 800 px y était agrandie) */
  const im = '<img class="ac-screen-img" src="' + m.b.src + '" srcset="' + m.a.src + ' ' + m.a.w + 'w, ' + (mid ? mid + ' 800w, ' : '') + m.b.src + ' ' + m.b.w + 'w" sizes="' + sizes + '" width="' + m.b.w + '" height="' + m.b.h + '" alt="' + esc('Affiche officielle : ' + v.nom) + '" decoding="async"' + (lazy ? ' loading="lazy"' : ' fetchpriority="high"') + '>';
  return '<div class="ac-screen" data-ac-screen data-src="' + esc(ytSrc(v.youtube)) + '" data-title="' + esc(v.nom) + '">'
    + (mid ? '<picture class="vt-pic"><source media="(max-width:599px)" srcset="' + m.a.src + ' ' + m.a.w + 'w, ' + mid + ' 800w" sizes="' + sizes + '">' + im + '</picture>' : im)
    + '<a class="ac-play" data-ac-play href="' + esc(ytWatch(v.youtube)) + '" target="_blank" rel="noopener nofollow"><span class="ac-play-ico" aria-hidden="true">' + LKX.ICO.play + '</span><span>' + esc(P.lecteur) + '</span></a>'
    + '</div><p class="ac-screen-n">' + esc(P.lecteurNote) + ' <a href="' + pre + 'mentions-legales.html#cookies">' + esc(P.lecteurLien) + '</a></p>';
}
function videoPage(ctx, v) {
  const { A, MED, SUBC } = ctx, P = A.videos, d = videoData(ctx, v), pre = '../';
  const others = P.liste.filter(x => x.id !== v.id);
  /* les trois faits du bandeau entrent avec le bandeau (cascade de l’en-tête, common.js) */
  const faits = '<ul class="ac-faits">' + v.faits.map(f => '<li class="ac-fait">' + S.pip(f.statut, true) + '<p>' + esc(f.texte) + ' ' + srcRefs(f.sources) + '</p></li>').join('') + '</ul>';
  /* photogrammes sans minutage (Extended Look : captures publiées sans leur moment) : la phrase d'introduction ne parle pas de minutage */
  const timed = d.moments.some(m => m.t !== null);
  /* v7.87.1 : planche de photogrammes (trois colonnes sur grand écran, deux sur tablette, une sur téléphone ; la dernière
     rangée centrée) ; le minutage est posé sur l’image comme un repère de chapitre (actus.css : il reste le premier élément
     de la carte, comme avant : le texte de la page, que Léo lit, ne change pas), le bouton « Revoir » calé en bas de la
     carte. Moment de la page : à l’entrée de chaque carte (moteur commun), l’image se dévoile, le minutage glisse sur l’image. */
  const moments = d.moments.length ? '<ol class="ac-moments">'
    + d.moments.map(m => '<li class="ac-moment' + (m.t === null ? ' ac-moment--sans-temps' : '') + IN + '>' + '<span class="ac-moment-t">' + (m.t !== null ? '<time>' + mmss(m.t) + '</time>' : '') + '</span>'
      + '<figure class="ac-moment-fig">' + VT.img(m.id, m.alt, { sizes: '(max-width:640px) 100vw, (max-width:1000px) 50vw, 400px', prefix: '/' }) + '</figure>'
      + '<div class="ac-moment-b">' + (m.items.length ? '<div class="ac-moment-items">' + m.items.map(it => '<a href="' + pre + esc(it.href) + '"><small>' + esc(it.kind) + '</small> <div class="ac-mi-l">' + esc(it.label) + '</div></a>').join('') + '</div>' : '')
      + m.alts.map(a => '<p class="ac-moment-alt">' + esc(a) + '</p>').join('')
      + (m.t !== null ? '<a class="ac-replay" data-ac-at="' + Math.floor(m.t) + '" href="' + esc(ytWatch(v.youtube, m.t)) + '" target="_blank" rel="noopener nofollow"><span aria-hidden="true">' + LKX.ICO.play + '</span>' + esc(P.revoir) + ' <span class="ac-at">' + mmss(m.t) + '</span></a>' : '')
      + '</div></li>').join('') + '</ol>' : '';
  /* v7.92.1 : une vidéo à un seul morceau (Trailer 1, bande-annonce de lancement) le montre en grand : la pochette (l’affiche
     de la vidéo) et son vinyle, qui sort de la pochette à l’entrée puis tourne quelques tours (actus.css) */
  const one = d.songs.length === 1;
  const replay = t => t !== null ? '<a class="ac-replay ac-replay--s" data-ac-at="' + t + '" href="' + esc(ytWatch(v.youtube, t)) + '" target="_blank" rel="noopener nofollow"><span aria-hidden="true">' + LKX.ICO.play + '</span><span class="ac-at">' + mmss(t) + '</span><span class="sr-only"> ' + esc(P.revoir) + '</span></a>' : '';
  const songs = d.songs.length ? '<ol class="ac-songs' + (one ? ' ac-songs--one' : '') + '">'
    + d.songs.map(s => { const t = secs(s.moment);
      if (one) return '<li class="ac-song ac-song--feature' + IN + '><span class="ac-song-art" aria-hidden="true"><span class="ac-song-disc"></span><span class="ac-song-sleeve">' + VT.img(v.affiche, '', { sizes: '(max-width:699px) 62vw, 300px', prefix: '/' }) + '</span></span>'
        + '<span class="ac-song-main"><span class="ac-song-k">' + S.pip(s.statut) + '<small>' + esc(s.moment) + '</small></span><cite translate="no">' + esc(s.titre) + '</cite> <span class="ac-song-a" translate="no">' + esc(s.artiste) + '</span>' + replay(t) + '</span></li>';
      return '<li class="ac-song' + IN + '>' + S.pip(s.statut) + '<span class="ac-song-b"><cite translate="no">' + esc(s.titre) + '</cite> <span class="ac-song-a" translate="no">' + esc(s.artiste) + '</span><small>' + esc(s.moment) + '</small></span>'
      + replay(t) + '</li>'; }).join('')
    + '</ol><p class="ac-more"><a href="' + pre + 'radios.html#poste">Le poste de Leonida, morceau par morceau</a></p>' : '';
  /* v7.87.1 : « du tac au tac » : au-delà de seize modèles, les douze premiers sont montrés (ceux que Rockstar a nommés, puis
     ceux qui ont un visuel officiel, puis par ordre alphabétique) et le reste se déplie (« Voir les 92 autres ») */
  const chips = (list, folder, label) => {
    const rank = x => (x.st === 'officiel' ? 0 : 2) + ((x.medias || []).length ? 0 : 1);
    const sorted = list.length > 16 ? [...list].sort((a, b) => rank(a) - rank(b) || label(a).localeCompare(label(b), 'fr')) : list;
    const chip = x => LKX.chip({ href: pre + folder + '/' + x.id + '.html', label: label(x), kind: 'page' });
    const head = list.length > 16 ? sorted.slice(0, 12) : sorted, rest = list.length > 16 ? sorted.slice(12).sort((a, b) => label(a).localeCompare(label(b), 'fr')) : [];
    return '<div class="ac-chips' + IN + '>' + head.map(chip).join('') + '</div>'
      + (rest.length ? '<details class="ac-chips-more"><summary>' + esc('Voir les ' + rest.length + ' autres') + '</summary><div class="ac-chips">' + rest.map(chip).join('') + '</div></details>' : '');
  };
  const vName = x => (x.marque && x.marque !== 'Marque inconnue' ? x.marque + ' ' : '') + x.nom;
  const srcIds = uniq([...v.faits.flatMap(f => f.sources), ...d.songs.flatMap(s => s.sources || [])]);
  const body = `<section class="page-head shell ac-vhead">
  <nav class="crumbs" aria-label="Fil d’Ariane"><a href="../index.html">Accueil</a> <span class="crumbs-sep" aria-hidden="true"></span> <a href="../videos.html">${esc(P.label)}</a> <span class="crumbs-sep" aria-hidden="true"></span> <span>${esc(v.nom)}</span></nav>
  <div class="ac-vgrid">
    <div class="ac-vcopy">
      <p class="fiche-cat">Vidéo officielle, <time datetime="${esc(v.iso)}">${esc(frLong(v.iso))}</time></p>
      <h1>${esc(nb(v.titre))}</h1>
      <p class="lede">${esc(v.lede)}</p>
      ${faits}
    </div>
    <div class="ac-vplayer" id="lecteur">${screen(ctx, v, P)}</div>
  </div>
</section>
${zone([
    d.moments.length && { id: 'moments', k: UI.moments.k, t: P.moments, icon: 'film', nav: UI.moments.nav, fam: 'equipements', lede: timed ? P.momentsLede : P.momentsLedeSansTemps, body: moments },
    d.songs.length && { id: 'musique', k: UI.musique.k, t: P.musique, icon: 'note', tone: 'night', nav: UI.musique.nav, fam: 'combat', body: songs },
    d.rev.length && { id: 'fiches', k: UI.fiches.k, t: P.montre, icon: 'carte', nav: UI.fiches.nav, fam: 'carte', body: revealList(d.rev, pre, false) },
    d.vehicles.length && { id: 'vehicules', k: UI.premiere, t: P.vehicules, icon: 'conduite', nav: 'Véhicules', fam: 'rockstar', count: d.vehicles.length, lede: P.vuNote, body: chips(d.vehicles, 'vehicules', vName) },
    d.weapons.length && { id: 'armes', k: UI.premiere, t: P.armes, icon: 'combat', nav: 'Armes', fam: 'munitions', count: d.weapons.length, body: chips(d.weapons, 'armes', x => x.nom) },
    { id: 'autres', k: UI.autres.k, t: P.autres, icon: 'boussole', nav: UI.autres.nav, fam: 'serie', body: '<div class="ac-vcards ac-vcards--mini">' + others.map(o => vcard(ctx, o, pre)).join('') + '</div>' },
    /* v7.92.1 : à côté des questions de la vidéo, l’encart de Léo (comme sur le sommaire des vidéos) : la colonne de droite
       n’est plus vide */
    faqSec(v.faq, leoAside(P.leoVideo, 'carte-postale-vice-city', 'Carte postale « Vice City » de Leonida : la baie, les tours et des bateaux, illustration officielle de GTA VI', pre)),
    srcSec(ctx, srcIds, '', '<p class="ac-more">Les identifications des véhicules et des armes ont leurs sources sur chaque fiche. <a href="../actus.html#frise">Toutes les annonces, date par date</a>.</p>')
  ])}`;
  const m = imgOf(MED, v.affiche);
  const ld = '<script type="application/ld+json">' + JSON.stringify({ '@context': 'https://schema.org', '@type': 'VideoObject', name: v.titre, description: metaDesc(v.desc), uploadDate: v.iso, thumbnailUrl: [SITE + m.b.src], embedUrl: 'https://www.youtube-nocookie.com/embed/' + v.youtube, contentUrl: 'https://www.youtube.com/watch?v=' + v.youtube, publisher: { '@type': 'Organization', name: 'Rockstar Games' }, isPartOf: { '@type': 'VideoGame', name: 'Grand Theft Auto VI' } }) + '</script>' + faqLD(v.faq);
  return page(SUBC, { p: pre, title: v.seo + ' | Leonidakit', desc: v.desc, canonical: '/videos/' + v.id + '.html', ogImg: m.b.src, body, crumbs: [['Accueil', '/'], [P.label, '/videos.html'], [v.nom, '/videos/' + v.id + '.html']], ld, cls: 'actus-page--video' });
}
function vcard(ctx, v, pre) {
  const d = videoData(ctx, v);
  /* « moments minutés » ne compte que les photogrammes qui ont leur minutage ; les autres sont des « images relevées » */
  const nt = d.moments.filter(m => m.t !== null).length, nu = d.moments.length - nt, pl = n => n > 1 ? 's' : '';
  const stats = [nt ? nt + ' moment' + pl(nt) + ' minuté' + pl(nt) : null, !nt && nu ? nu + ' image' + pl(nu) + ' relevée' + pl(nu) : null, d.songs.length ? d.songs.length + ' morceau' + (d.songs.length > 1 ? 'x' : '') : null, d.vehicles.length ? d.vehicles.length + ' véhicule' + (d.vehicles.length > 1 ? 's' : '') : null].filter(Boolean);
  return '<a class="ac-vcard' + IN + ' href="' + pre + 'videos/' + esc(v.id) + '.html"><span class="ac-vcard-fig">' + VT.img(v.affiche, '', { sizes: '(max-width:700px) 100vw, 380px', prefix: '/' }) + '<span class="ac-vcard-play" aria-hidden="true">' + LKX.ICO.play + '</span></span>'
    + '<div class="ac-vcard-b"><span class="ac-vcard-d"><time datetime="' + esc(v.iso) + '">' + esc(frLong(v.iso)) + '</time></span><div class="ac-vcard-t">' + esc(v.nom) + '</div><span class="ac-vcard-s">' + stats.map(s => '<span>' + esc(s) + '</span>').join('') + '</span></div></a>';
}
function videosHub(ctx) {
  const { A, MED, ROOTC } = ctx, P = A.videos;
  const list = [...P.liste].sort((a, b) => b.iso.localeCompare(a.iso));
  const data = Object.fromEntries(list.map(v => [v.id, videoData(ctx, v)]));
  const plural = (n, one, many) => n + ' ' + (n > 1 ? many : one);
  const statsOf = (v, d) => { const nt = d.moments.filter(m => m.t !== null).length, nu = d.moments.length - nt;
    return [nt ? plural(nt, 'moment minuté', 'moments minutés') : null, !nt && nu ? plural(nu, 'image relevée', 'images relevées') : null, d.songs.length ? plural(d.songs.length, 'morceau', 'morceaux') : null, d.vehicles.length ? plural(d.vehicles.length, 'véhicule', 'véhicules') : null].filter(Boolean); };
  /* v7.92 : moment de la page — la salle de projection : l’affiche de la dernière vidéo en grand (le lecteur de YouTube ne se
     charge qu’au clic, actus.js), sa fiche à côté, et la liste des vidéos ; choisir une vidéo change l’écran sans
     recharger la page (actus.js) ; sans script, la liste mène aux pages des vidéos */
  const feat = list[0];
  /* v7.92.1 : la fiche de la vidéo à l’affiche se tient à côté de l’écran, à sa hauteur : date, titre, résumé, les faits
     publiés (avec leur statut) et le bouton, calé en bas ; la liste des vidéos passe sous l’écran, en une rangée */
  const info = v => { const d = data[v.id];
    return '<div class="ac-th-info" data-ac-info="' + esc(v.id) + '"' + (v === feat ? '' : ' hidden') + '><p class="ac-th-k"><span>' + esc(P.aLaffiche) + '</span> <time datetime="' + esc(v.iso) + '">' + esc(frLong(v.iso)) + '</time></p>'
      + '<h3 class="ac-th-t">' + esc(v.nom) + '</h3><p class="ac-th-d">' + esc(v.lede) + '</p><ul class="ac-th-s">' + statsOf(v, d).map(s => '<li>' + esc(s) + '</li>').join('') + '</ul>'
      + '<ul class="ac-th-f">' + v.faits.map(f => '<li>' + S.pip(f.statut, true) + '<p>' + esc(f.texte) + '</p></li>').join('') + '</ul>'
      + '<a class="lkx-btn" href="videos/' + esc(v.id) + '.html">' + esc(P.ouvrir) + '</a></div>'; };
  /* la liste entre par le moteur commun (cascade de vitrine.css), comme les autres blocs de la page */
  const pl = '<ol class="ac-pl vt-in" data-lk-reveal aria-label="' + esc(P.choisir) + '">' + list.map((v, i) => { const m = imgOf(MED, v.affiche);
    return '<li style="--i:' + i + '"><a class="ac-pl-a" href="videos/' + esc(v.id) + '.html" data-ac-pick="' + esc(v.id) + '" data-src="' + esc(ytSrc(v.youtube)) + '" data-title="' + esc(v.nom) + '" data-poster="' + esc(m.b.src) + '" data-poster-s="' + esc(m.a.src) + '"' + (midOf(m.b.src) ? ' data-poster-m="' + esc(midOf(m.b.src)) + '"' : '') + '' + (v === feat ? ' aria-current="true"' : '') + '>'
      /* vignette de 132 px (pleine colonne de 600 à 959 px) : srcset écrit ici, sinon outils/sync-site.cjs en pose un « 100vw »
         qui ferait prendre la 1 280 px au téléphone */
      + '<span class="ac-pl-fig"><img src="' + m.a.src + '" srcset="' + m.a.src + ' ' + m.a.w + 'w' + (midOf(m.b.src) ? ', ' + midOf(m.b.src) + ' 800w' : '') + '" sizes="(max-width:599px) 132px, (max-width:959px) 30vw, 132px" width="' + m.a.w + '" height="' + m.a.h + '" alt="" loading="lazy" decoding="async"><span class="ac-pl-play" aria-hidden="true">' + LKX.ICO.play + '</span></span>'
      + '<span class="ac-pl-b"><time datetime="' + esc(v.iso) + '">' + esc(frLong(v.iso)) + '</time><span class="ac-pl-t">' + esc(v.nom) + '</span></span></a></li>'; }).join('') + '</ol>';
  const salle = '<div class="ac-theater"><div class="ac-th-main"><div class="ac-vplayer">' + screen(ctx, feat, P, '', true) + '</div></div><div class="ac-th-side">' + list.map(info).join('') + '</div><div class="ac-th-list">' + pl + '</div></div>';
  /* les vidéos comparées : une barre par vidéo et par mesure (la plus grande valeur remplit la ligne). v7.92.1 : seules les
     vidéos relevées image par image (au moins un moment) ; une phrase dit laquelle ne l’est pas, au lieu d’une rangée de zéros */
  const M = P.metriques;
  const metrics = [['moments', d => d.moments.length], ['morceaux', d => d.songs.length], ['vehicules', d => d.vehicles.length], ['armes', d => d.weapons.length], ['fiches', d => d.rev.length]];
  const chrono = [...list].sort((a, b) => a.iso.localeCompare(b.iso));
  const relevees = chrono.filter(v => data[v.id].moments.length);
  /* v7.94 : un seul tableau de bord, une rangée par mesure (plus de cinq cartes dont une seule sur sa rangée) */
  const bars = '<div class="ac-bars vt-in" data-lk-reveal><ul class="ac-bars-key" aria-hidden="true">' + relevees.map((v, k) => '<li class="ac-k' + k + '">' + esc(v.nom) + '</li>').join('') + '</ul>'
    + metrics.map(([key, f], i) => { const vals = relevees.map(v => f(data[v.id])), max = Math.max(...vals, 1);
      return '<div class="ac-bar-g" style="--i:' + i + '"><h3 class="ac-bar-h">' + esc(M[key]) + '</h3><ul class="ac-bar-l">' + relevees.map((v, k) => '<li class="ac-bar ac-k' + k + '" style="--p:' + Math.max(2, Math.round(100 * vals[k] / max)) + '%"><span class="ac-bar-n">' + esc(v.nom) + '</span><b>' + vals[k] + '</b><span class="ac-bar-t" aria-hidden="true"><i></i></span></li>').join('') + '</ul></div>'; }).join('') + '</div>'
    + (relevees.length < chrono.length && P.chiffresNote ? '<p class="ac-bars-note">' + esc(P.chiffresNote) + '</p>' : '');
  /* les moments à revoir : les photogrammes des vidéos, dans l’ordre des vidéos puis du minutage */
  const shots = chrono.flatMap(v => data[v.id].moments.map(m => ({ media: m.id, alt: m.alts[0] || m.alt || '', href: 'videos/' + v.id + '.html#moments', title: v.nom + (m.t !== null ? ', ' + mmss(m.t) : ''), sub: m.items.slice(0, 2).map(it => it.label).join(', '), time: m.t !== null ? mmss(m.t) : null })));
  const revoir = VT.strip(shots, { region: P.bandeLabel, prev: P.precedent, next: P.suivant });
  /* toute la musique, vidéo par vidéo. v7.92.1 : les vidéos à peu de morceaux en une rangée de cartes (affiche, nom, nombre
     de morceaux, liste), la plus longue liste en dessous, sur toute la largeur et en deux colonnes : plus de colonne courte
     à côté d’une colonne de quatorze lignes */
  const avecSons = chrono.filter(v => data[v.id].songs.length);
  const longue = avecSons.reduce((a, b) => (data[b.id].songs.length > data[a.id].songs.length ? b : a), avecSons[0]);
  const groupe = (v, cls) => '<section class="ac-as-g ' + cls + IN + ' aria-label="' + esc(v.nom) + '"><a class="ac-as-fig" href="videos/' + esc(v.id) + '.html#musique" tabindex="-1" aria-hidden="true">' + VT.img(v.affiche, '', { sizes: cls === 'ac-as-g--long' ? '(max-width:899px) 92vw, 420px' : '(max-width:899px) 92vw, 440px' }) + '</a>'
    + '<div class="ac-as-in"><h3 class="ac-as-h"><a href="videos/' + esc(v.id) + '.html#musique">' + esc(v.nom) + '</a> <span class="ac-n">' + data[v.id].songs.length + '</span></h3><ol class="ac-as-l">'
    + data[v.id].songs.map(s => '<li>' + S.pip(s.statut) + '<span class="ac-as-b"><cite translate="no">' + esc(s.titre) + '</cite> <span class="ac-as-a" translate="no">' + esc(s.artiste) + '</span></span><small>' + esc(s.moment) + '</small></li>').join('') + '</ol></div></section>';
  const bande = '<div class="ac-allsongs ac-allsongs--' + (avecSons.length - 1) + '">' + avecSons.filter(v => v !== longue).map(v => groupe(v, 'ac-as-g--card')).join('') + '</div>'
    + groupe(longue, 'ac-as-g--long')
    + '<p class="ac-more"><a href="radios.html#poste">Le poste de Leonida, morceau par morceau</a></p>';
  /* v7.92.1 : deux questions de la page (combien de vidéos, un « Trailer 3 »), puis la première question de chaque vidéo */
  const faqs = [...(P.faq || []), ...list.flatMap(v => v.faq.slice(0, 1).filter(x => !(P.faq || []).some(y => y.q === x.q)))];
  const body = `<section class="page-head shell lk-glow"><div class="lk-head-grid"><div>
  <p class="fiche-cat">${esc(P.label)}, GTA VI</p>
  <h1>${esc(nb(P.title))}</h1>
  <p class="lede">${esc(P.lede)}</p>
  <p class="d-intro-note">${esc(P.note)} <a href="mentions-legales.html#cookies">${esc(P.lecteurLien)}</a>.</p>
</div>${pile(MED, A.actus.pile, 'Les affiches officielles des vidéos')}</div></section>
${zone([
    { id: 'salle', k: P.salleK, t: P.salleT, icon: 'film', tone: 'night', nav: 'Salle', fam: 'combat', lede: P.salleLede, body: salle },
    { id: 'chiffres', k: P.chiffresK, t: P.chiffresT, icon: 'chiffres', nav: 'Chiffres', fam: 'munitions', lede: P.chiffresLede, body: bars + '<p class="ac-more"><a href="actus.html#frise">Toutes les annonces, date par date</a></p>' },
    { id: 'revoir', k: P.revoirK, t: P.revoirT, icon: 'film', nav: 'Moments', fam: 'carte', lede: P.revoirLede, body: revoir },
    { id: 'musique', k: P.bandeK, t: P.bandeT, icon: 'note', tone: 'night', nav: 'Musique', fam: 'combat', lede: P.bandeLede, body: bande },
    faqSec(faqs, leoAside(P.leo, 'affiche-trailer-1', 'Affiche officielle : Trailer 1'))
  ])}`;
  const ld = '<script type="application/ld+json">' + JSON.stringify({ '@context': 'https://schema.org', '@type': 'CollectionPage', name: P.title, description: metaDesc(P.desc), url: SITE + '/videos.html', inLanguage: 'fr', isPartOf: { '@type': 'WebSite', name: 'Leonidakit', url: SITE + '/' }, mainEntity: { '@type': 'ItemList', numberOfItems: list.length, itemListElement: list.map((v, i) => ({ '@type': 'ListItem', position: i + 1, name: v.titre, url: SITE + '/videos/' + v.id + '.html' })) } }) + '</script>' + faqLD(faqs);
  const og = imgOf(MED, A.actus.pile[0].media);
  return page(ROOTC, { p: '', title: P.seoTitle + ' | Leonidakit', desc: P.desc, canonical: '/videos.html', ogImg: og.b.src, body, crumbs: [['Accueil', '/'], [P.label, '/videos.html']], ld, cls: 'actus-page--videos' });
}

/* ---------- Éditions ---------- */
/* v7.92 : briques communes aux trois pages de la section (vitrine.cjs) */
/* les dates à venir en pastilles, sous le titre : jour, mois, ce qui arrive, et le compte à rebours (vitrine.js) */
function datesRow(A, label) {
  return '<ol class="ac-dates vt-in" data-lk-reveal aria-label="' + esc(label) + '">' + A.aVenir.map((x, i) => { const d = new Date(x.iso + 'T12:00:00Z');
    return '<li class="ac-date" style="--i:' + i + '"><time datetime="' + esc(x.iso) + '"><b>' + d.getUTCDate() + '</b><span>' + esc(new Intl.DateTimeFormat('fr-FR', { month: 'long', timeZone: 'UTC' }).format(d)) + '</span></time><span class="ac-date-t">' + nb(esc(x.titre)) + '</span>' + VT.cd(x.iso) + '</li>'; }).join('') + '</ol>';
}
/* encart « Une autre question ? » à côté des questions fréquentes : Léo répond, ou le formulaire de contact */
const leoAside = (asks, media, alt, prefix = '') => VT.aside({ title: VTX.aside.titre, text: VTX.aside.texte, asks, mail: { href: prefix + 'contact.html', label: VTX.aside.ecrire }, media, alt }, { prefix });
/* silhouette « teaser » d’une tenue (contenu sans visuel officiel) */
const TEASER_TENUE = '<svg viewBox="0 0 120 120" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round" aria-hidden="true"><path d="M44 18c4 7 9 10 16 10s12-3 16-10l22 10 12 26-17 8-6-11v61H33V51l-6 11-17-8 12-26z"/><path d="M60 28v12M49 60h22" stroke-linecap="round"/><circle cx="60" cy="48" r="2.5" fill="currentColor"/></svg>';
const STAR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z"/></svg>';
function editionsPage(ctx) {
  const { A, MED, ROOTC } = ctx, E = A.editions, src = 'rs-support-editions', T = E.prix;
  /* v7.92.1 : le prix affiché par le PlayStation Store en France sur chaque édition, en étiquette (vitrine.css, .vt-tag) */
  const tag = (prix, label, cls) => '<span class="vt-tag' + (cls ? ' ' + cls : '') + '"><span class="vt-tag-l">' + esc(label) + '</span><b class="vt-price">' + esc(prix) + '</b></span>';
  /* deux grandes cartes (jaquette officielle, visuel de l’Ultimate) puis le comparatif ligne à ligne, d’après l’assistance */
  const edCard = (x, i, ult) => '<article class="ac-edcard' + (ult ? ' ac-edcard--ult' : '') + '" style="--i:' + i + '">'
    + '<figure class="ac-edcard-fig">' + VT.img(x.media, x.alt, { big: true, sizes: '(max-width:899px) 92vw, 660px' }) + (ult ? '<span class="ac-edcard-ribbon vt-stamp">' + esc(x.ruban) + '</span>' : '') + tag(ult ? T.ultimate : T.standard, T.label, 'ac-edcard-tag') + '</figure>'
    + '<div class="ac-edcard-b"><h3>' + esc(x.titre) + '</h3><p>' + esc(x.texte) + '</p><ul class="ac-checks">' + x.points.map(t => '<li>' + esc(t) + '</li>').join('') + '</ul>'
    + '<p class="ac-edcard-src">' + S.pip('officiel', true) + '<span>' + esc(T.label) + '</span> ' + srcRefs([T.src]) + '</p>' + (fs.existsSync(path.join(ROOT, 'editions', (ult ? 'ultimate' : 'standard') + '.html')) ? '<p class="ac-ev-links"><a href="editions/' + (ult ? 'ultimate' : 'standard') + '.html">La page de cette édition</a></p>' : '') /* v7.96 : une page par édition */ + '</div></article>';
  const C = E.comparatif;
  const editions = '<div class="ac-duo vt-in" data-lk-reveal>' + edCard(E.standard, 0, false) + edCard(E.ultimate, 1, true) + '</div>'
    + '<h3 class="ac-h3">' + esc(C.titre) + '</h3><div class="ac-compare' + IN + '>' + VT.compare({ caption: C.caption, first: C.first, cols: C.cols, rows: C.rows, hi: 2 }, { yes: E.oui, no: E.non }) + '</div>'
    + '<p class="ac-amelio">' + esc(E.amelioration) + ' ' + srcRefs([src]) + '</p>' + (fs.existsSync(path.join(ROOT, 'editions/amelioration.html')) ? '<p class="ac-ev-links"><a href="editions/amelioration.html">La page de l’amélioration</a>' + (fs.existsSync(path.join(ROOT, 'editions/collector.html')) ? '<a href="editions/collector.html">La page du coffret collector</a>' : '') + '</p>' : '') /* v7.96 : pages de l’amélioration et du coffret */;
  /* v7.92.1 : « Quelle édition choisir ? » : deux questions (boutons radio), la réponse de l’assistance de Rockstar à côté
     (vitrine.js, [data-vt-pick]) ; sans script, les quatre cas se lisent l’un après l’autre */
  const CH = E.choix, rq = (name, q) => '<fieldset class="ed-pick-f"><legend>' + esc(q.q) + '</legend><div class="ed-pick-o">'
    + '<label><input type="radio" name="' + name + '" value="oui"><span>' + esc(q.oui) + '</span></label><label><input type="radio" name="' + name + '" value="non" checked><span>' + esc(q.non) + '</span></label></div></fieldset>';
  const choix = '<div class="ed-pick" data-vt-pick-scope><form class="ed-pick-q" data-vt-pick hidden aria-label="' + esc(CH.label) + '">' + rq('contenus', CH.q1) + rq('boite', CH.q2) + '<p class="ed-pick-n">' + esc(CH.prixNote) + ' ' + srcRefs([T.src, src]) + '</p></form>'
    + '<div class="ed-pick-a" aria-live="polite">' + Object.entries(CH.reponses).map(([k, r]) => '<article class="ed-pick-r" data-vt-answer="' + esc(k) + '">' + (r.prix ? tag(r.prix, T.label, 'ed-pick-tag') : '') + '<h3>' + esc(r.t) + '</h3><p>' + esc(r.d) + '</p></article>').join('') + '</div></div>';
  /* moment de la page : les seize contenus arrivent comme des cartes qu’on distribue (vitrine.css), numérotés dans l’ordre de
     l’assistance de Rockstar, classés par famille (filtre, vitrine.js) ; une carte sans visuel officiel montre une silhouette */
  const cats = Object.keys(E.categories);
  const items = E.contenus.map((c, i) => ({ href: c.href || null, media: c.media || null, alt: c.alt || '', teaser: c.media ? null : TEASER_TENUE, teaserLabel: c.media ? null : E.teaser,
    n: String(i + 1).padStart(2, '0'), tag: E.categories[c.cat], title: c.fr, text: c.nom, textNo: true, go: c.href ? E.voirFiche : null, item: c.cat }));
  const ultimate = VT.filters('ue-list', cats.map(k => ({ f: k, label: E.categories[k], n: E.contenus.filter(c => c.cat === k).length })), { label: E.tout, n: E.contenus.length }, E.filtresLabel)
    + VT.cards(items, { id: 'ue-list', fx: 'deal', sizes: '(max-width:719px) 92vw, 320px' });
  /* bonus : le Pack Vintage Vice City (visuel, contenu, fiche, et ses trois images) et le mois de GTA+ (v7.92.1 : ses
     conditions, d’après l’assistance de Rockstar) ; puis le coffret collector, en bandeau vers la page des prix */
  const B0 = E.bonus[0], B1 = E.bonus[1], CO = E.collector;
  /* la fin des bonus en talon de ticket : le jour en grand, le mois, puis le compte à rebours (comme les dates du bandeau) */
  const FIN = A.aVenir.find(x => x.iso === '2026-11-20'), dFin = new Date('2026-11-20T12:00:00Z');
  const bonusEnd = '<div class="ac-bcard-end"><time datetime="2026-11-20"><b>' + dFin.getUTCDate() + '</b><span>' + esc(new Intl.DateTimeFormat('fr-FR', { month: 'long', timeZone: 'UTC' }).format(dFin)) + '</span></time><span class="ac-bcard-end-t">' + esc(FIN ? FIN.titre : E.bonusFin) + '</span>' + VT.cd('2026-11-20') + '</div>';
  const bonus = '<div class="ac-bonus2 vt-in" data-lk-reveal>'
    + '<article class="ac-bcard" style="--i:0"><figure class="ac-bcard-fig">' + VT.img(B0.media, B0.alt, { big: true, sizes: '(max-width:899px) 92vw, 760px' }) + '</figure><div class="ac-bcard-b"><h3>' + esc(B0.titre) + '</h3><p>' + esc(B0.texte) + '</p><p class="ac-bonus-pour">' + esc(B0.pour) + '</p>' + (B0.href ? '<a class="lkx-btn lkx-btn--ghost" href="' + esc(B0.href) + '">' + esc(E.voirFiche) + '</a>' : '') + '</div></article>'
    + '<article class="ac-bcard ac-bcard--plain" style="--i:1"><span class="ac-bcard-ico" aria-hidden="true">' + STAR + '</span><h3>' + esc(B1.titre) + '</h3><p>' + esc(B1.texte) + '</p><p class="ac-bonus-pour">' + esc(B1.pour) + '</p>'
    + (B1.points ? '<ul class="ac-bcard-l">' + B1.points.map(t => '<li>' + esc(t) + '</li>').join('') + '</ul>' + (B1.src ? '<p class="ac-bcard-src">' + S.pip('officiel', true) + ' ' + srcRefs([B1.src]) + '</p>' : '') : '')
    + bonusEnd + '</article>'
    + '</div>'
    + '<h3 class="ac-h3">' + esc(E.galerieLabel) + '</h3>' + VT.strip(B0.galerie.map(g => ({ media: g.media, alt: g.alt, title: g.titre })), { region: E.galerieLabel, prev: E.precedent, next: E.suivant })
    + (CO ? '<a class="vt-cta ac-cta-co lk-reveal" href="' + esc(CO.href) + '">' + VT.img(CO.media, '', { big: true, sizes: '(max-width:1400px) 96vw, 1360px' }) + '<span class="vt-cta-b"><span class="vt-cta-k">' + esc(CO.k) + '</span><span class="vt-cta-t" translate="no">' + esc(CO.t) + '</span><span class="vt-cta-d">' + esc(CO.d) + '</span></span><span class="vt-cta-go">' + esc(CO.go) + '</span></a>' : '');
  /* boîte, préchargement, régions : trois colonnes du moteur commun (ed-col), chacune avec son ancre */
  const col = (id, icon, titre, l, lien) => '<div class="ed-col ac-col' + IN + ' id="' + id + '"><h3><span class="ed-col-ico">' + S.icon(icon) + '</span>' + esc(titre) + '</h3><ul>' + l.map(t => '<li>' + esc(t) + '</li>').join('') + '</ul>' + (lien ? '<a class="ed-col-link" href="' + esc(lien.href) + '">' + esc(lien.label) + ' <span aria-hidden="true">↗</span></a>' : '') /* v7.93 : lien vers la page du préchargement */ + '</div>';
  /* v7.92.1 : le visuel du bandeau : les deux éditions posées l’une sur l’autre, chacune avec son prix en étiquette (elles
     arrivent comme deux cartes qu’on pose, l’étiquette se balance ; à la souris, la carte survolée s’incline) */
  const PA = E.paire, pairCard = (x, label, prix, cls) => '<div class="ed-pair-c ' + cls + '"><div class="ed-pair-in vt-tilt" data-vt-tilt="6">' + VT.img(x.media, x.alt, { eager: cls === 'ed-pair-c--s' ? true : 'normal', sizes: '(max-width:900px) 64vw, 300px' }) + '<span class="ed-pair-n">' + esc(label) + '</span></div>' + tag(prix, T.label, 'ed-pair-tag') + '</div>';
  const pair = '<div class="ed-pair" role="group" aria-label="' + esc(PA.label) + '">' + pairCard(E.standard, PA.standard, T.standard, 'ed-pair-c--s') + pairCard(E.ultimate, PA.ultimate, T.ultimate, 'ed-pair-c--u') + '</div>';
  const body = `<section class="page-head shell lk-glow"><div class="lk-head-grid"><div>
  <p class="fiche-cat">${esc(E.label)}, GTA VI</p>
  <h1>${esc(nb(E.title))}</h1>
  <p class="lede">${esc(E.lede)}</p>
  <p class="d-intro-note">${esc(E.note)} ${srcRefs([src, T.src])}</p>
  ${datesRow(A, E.datesLabel)}
</div>${pair}</div></section>
${zone([
    { id: 'editions', k: UI.editions.k, t: 'Deux éditions', icon: 'achats', nav: UI.editions.nav, fam: 'equipements', body: editions },
    { id: 'choisir', k: CH.k, t: CH.titre, icon: 'boussole', nav: CH.nav, fam: 'rockstar', lede: CH.lede, body: choix },
    { id: 'ultimate', k: UI.ultimate.k, t: E.contenusTitre, icon: 'inventaire', nav: UI.ultimate.nav, fam: 'munitions', lede: E.contenusLede, body: ultimate },
    { id: 'bonus', k: UI.bonus.k, t: E.bonusTitre, icon: 'etiquette', nav: UI.bonus.nav, fam: 'carte', body: bonus },
    { id: 'en-pratique', k: UI.pratique.k, t: UI.pratique.t, icon: 'boussole', tone: 'night', nav: UI.pratique.nav, fam: 'combat', body: '<div class="ed-cols ac-cols">' + col('boite', 'kit', E.boiteTitre, E.boite) + col('prechargement', 'sablier', E.prechargementTitre, E.prechargement, E.prechargementLien) + col('regions', 'carte', E.regionsTitre, E.regions) + '</div>' },
    require('./monetisation.cjs').zoneEditions() /* v7.88 : liens affiliés, rien tant que outils/monetisation.json ne les active pas */,
    faqSec(E.faq, leoAside(E.leo, 'cover-art-sea-sparrow', 'Hélicoptère bleu à flotteurs sur une illustration de la jaquette officielle GTA VI')),
    srcSec(ctx, uniq([src, T.src, B1.src, 't2-prix'].filter(Boolean)) /* v7.93 : les prix officiels (Take-Two) */, '', '<p class="ac-more"><a href="verification.html">Ce qui est confirmé sur GTA 6, et comment on le vérifie</a></p><p class="ac-more"><a href="prix.html">Les prix et le coffret collector</a></p>')
  ])}`;
  const og = imgOf(MED, E.pile[0].media);
  const ld = '<script type="application/ld+json">' + JSON.stringify({ '@context': 'https://schema.org', '@type': 'WebPage', name: E.title, description: metaDesc(E.desc), url: SITE + '/editions.html', inLanguage: 'fr', dateModified: ctx.SRC[T.src].consultedAt > ctx.SRC[src].consultedAt ? ctx.SRC[T.src].consultedAt : ctx.SRC[src].consultedAt, about: { '@type': 'VideoGame', name: 'Grand Theft Auto VI' }, isPartOf: { '@type': 'WebSite', name: 'Leonidakit', url: SITE + '/' } }) + '</script>' + faqLD(E.faq);
  return page(ROOTC, { p: '', title: E.seoTitle + ' | Leonidakit', desc: E.desc, canonical: '/editions.html', ogImg: og.b.src, body, crumbs: [['Accueil', '/'], [E.label, '/editions.html']], ld, cls: 'actus-page--editions' });
}

/* ---------- v7.92.1 : Prix et collector (prix.html) ----------
   Le prix du jeu (PlayStation Store en France), le coffret collector « The Goodtime State – Vice City Collection » (ses onze
   objets en photos officielles, ses conditions d’après la boutique Rockstar), les manettes en édition limitée et la
   collection de la boutique, puis un total à cocher. Chaque prix porte son statut : « Officiel » quand une boutique officielle
   l’affiche, « Vu dans un média » quand seule la presse le donne (le coffret et la collection en euros). Moment de la page :
   le coffret s’ouvre (le bandeau, au chargement ; la section, au défilement), ses étiquettes de prix se balancent. */
function prixPage(ctx) {
  const { A, MED, ROOTC } = ctx, X = A.prix, H = X.hero;
  const stLine = list => '<p class="px-st">' + list.map(x => '<span class="px-st-i">' + S.pip(x.statut, true) + '<span>' + esc(x.t) + '</span> ' + srcRefs([x.src]) + '</span>').join('') + '</p>';
  const tag = (prix, label, cls) => '<span class="vt-tag' + (cls ? ' ' + cls : '') + '"><span class="vt-tag-l">' + esc(label) + '</span><b class="vt-price">' + esc(prix) + '</b></span>';
  const dl = list => '<dl class="px-dl">' + list.map(d => '<div class="px-dl-r lk-reveal"><dt>' + esc(d.k) + '</dt><dd>' + esc(d.v) + '</dd></div>').join('') + '</dl>';
  /* bandeau : le coffret fermé qui s’ouvre, ses deux prix (officiel en dollars, presse en euros) et la pastille « jeu non inclus » */
  /* le coffret ouvert (l’état final, celui qu’on voit sans animation) vient d’abord et se charge en priorité ; le coffret fermé,
     montré pendant la première seconde, se charge tout de suite lui aussi et se pose par-dessus (actus.css) */
  const box = (cls, eager) => '<span class="px-box ' + cls + '"><span class="px-box-o">' + VT.img(H.media, H.alt, { eager, sizes: '(max-width:900px) 72vw, 440px' }) + '</span><span class="px-box-f">' + VT.img(H.ferme, H.altFerme, { eager: eager && 'normal', sizes: '(max-width:900px) 72vw, 440px' }) + '</span></span>';
  const visual = '<div class="px-hero" role="group" aria-label="' + esc(H.label) + '"><div class="px-hero-in vt-tilt" data-vt-tilt="5">' + box('px-box--hero', true) + '</div>'
    + tag(H.tag1.prix, H.tag1.l, 'px-tag px-tag--1') + tag(H.tag2.prix, H.tag2.l, 'px-tag px-tag--2') + '<span class="px-sticker">' + esc(H.sticker) + '</span></div>';
  const figs = VT.figs(X.chiffres.map((c, i) => ({ n: c.n, label: c.label, accent: i === 2 })), { cls: 'px-figs' });
  /* le jeu : deux éditions, leur prix en étiquette, ce qu’elles donnent ; puis la boîte et l’amélioration */
  const J = X.jeu;
  const jeu = '<div class="px-eds vt-in vt-in--deal" data-lk-reveal>' + J.editions.map((x, i) => '<article class="px-ed" style="--i:' + i + '"><figure class="px-ed-fig">' + VT.img(x.media, x.alt, { big: true, sizes: '(max-width:819px) 92vw, 640px' }) + tag(x.prix, x.nom, 'px-ed-tag') + '</figure>'
    + '<div class="px-ed-b"><h3>' + esc(x.nom) + '</h3><ul class="ac-checks">' + x.points.map(t => '<li>' + esc(t) + '</li>').join('') + '</ul>' + stLine(x.st) + '</div></article>').join('') + '</div>'
    + '<ul class="px-autres">' + J.autres.map(x => '<li class="lk-reveal"><h3>' + esc(x.t) + '</h3><p>' + esc(x.d) + '</p></li>').join('') + '</ul>'
    + '<p class="ac-more"><a href="' + esc(J.lien.href) + '">' + esc(J.lien.label) + '</a></p>';
  /* le coffret : le texte et ses deux prix à gauche, la boîte qui s’ouvre au défilement à droite ; la bande des objets qui
     glisse avec la page ; les onze objets (chaque photo s’ouvre en grand, visionneuse du site) ; les conditions */
  const C = X.collector;
  const coffret = '<div class="vt-split px-co"><div class="px-co-t"><p class="px-co-nom" translate="no">' + esc(C.nom) + '</p>' + C.intro.map(t => '<p>' + esc(t) + '</p>').join('') + stLine(C.st)
    + '<p class="px-co-go"><a class="lkx-btn" href="https://store.rockstargames.com/merchandise/gtavi-goodtime-state-vice-city-collection" target="_blank" rel="noopener nofollow">' + esc(C.boutique) + '</a></p></div>'
    + '<div class="px-co-v" aria-hidden="true">' + box('px-box--scroll', false).replace(/ alt="[^"]*"/g, ' alt=""') + '</div></div>'
    + '<div class="vt-marquee px-defile" aria-hidden="true"><ul class="vt-marquee-l">' + [...C.defile, ...C.defile].map(t => '<li>' + esc(t) + '</li>').join('') + '</ul></div>'
    + '<h3 class="ac-h3">' + esc(C.objetsT) + '</h3><p class="px-lede">' + esc(C.objetsLede) + '</p>'
    + '<ul class="px-gal vt-in vt-in--deal" data-lk-reveal>' + C.objets.map((o, i) => '<li style="--i:' + i + '"><a class="px-obj" href="' + esc(VT.bigSrc(o.media)) + '"><span class="px-obj-fig">' + VT.img(o.media, o.alt, { sizes: '(max-width:599px) 46vw, (max-width:1099px) 30vw, 300px' }) + '<span class="vt-zoom" aria-hidden="true">' + VT.SVG.zoom + '</span></span><span class="px-obj-b"><span class="px-obj-t">' + esc(o.t) + '</span><span class="px-obj-d">' + esc(o.d) + '</span></span></a></li>').join('') + '</ul>'
    + '<h3 class="ac-h3">' + esc(C.detailsT) + ' ' + srcRefs(C.detailsSrc) + '</h3>' + dl(C.details);
  /* les manettes : la photo et son prix, les conditions de PlayStation */
  const M = X.manettes;
  const manettes = '<div class="vt-split px-split"><figure class="px-fig lk-reveal">' + VT.img(M.media, M.alt, { big: true, sizes: '(max-width:899px) 92vw, 640px' }) + tag(M.prix, M.prixL, 'px-fig-tag') + '</figure><div class="px-split-t">' + dl(M.details) + stLine(M.st) + '</div></div>';
  /* la collection : la photo, et un ticket de caisse des prix relevés en euros */
  const B = X.boutique;
  const ticket = '<div class="px-ticket lk-reveal"><div class="px-ticket-in"><p class="px-ticket-h">' + esc(B.ticketT) + '</p><ul class="px-ticket-l">' + B.lignes.map(l => '<li><span>' + esc(l.t) + '</span><b>' + esc(l.p) + '</b></li>').join('') + '</ul><p class="px-ticket-n">' + esc(B.ticketN) + '</p></div></div>';
  const boutique = '<div class="vt-split px-split px-split--rev"><figure class="px-fig lk-reveal">' + VT.img(B.media, B.alt, { big: true, sizes: '(max-width:899px) 92vw, 640px' }) + '</figure><div class="px-split-t">' + ticket + B.texte.map(t => '<p>' + esc(t) + '</p>').join('') + stLine(B.st) + '</div></div>';
  /* le total : le jeu (une édition ou aucune), et ce qu’on ajoute ; vitrine.js additionne (montants en centimes, affichés
     au format de la langue de la page). Sans script : quelques totaux, écrits. */
  const TO = X.total, jeuL = TO.lignes.filter(l => l.jeu), plusL = TO.lignes.filter(l => !l.jeu);
  const total = '<div class="px-total"><form class="px-sum" data-vt-sum hidden aria-label="' + esc(TO.label) + '">'
    + '<fieldset><legend>' + esc(TO.jeuT) + '</legend>' + jeuL.map(l => '<label class="px-opt"><input type="radio" name="jeu" value="' + l.c + '" data-vt-cents="' + l.c + '"' + (l.defaut ? ' checked' : '') + '><span class="px-opt-t">' + esc(l.t) + '</span><b>' + esc(l.p) + '</b></label>').join('')
    + '<label class="px-opt"><input type="radio" name="jeu" value="0" data-vt-cents="0"><span class="px-opt-t">' + esc(TO.aucun) + '</span><b></b></label></fieldset>'
    + '<fieldset><legend>' + esc(TO.plusT) + '</legend>' + plusL.map(l => '<label class="px-opt"><input type="checkbox" name="' + esc(l.id) + '" data-vt-cents="' + l.c + '"><span class="px-opt-t">' + esc(l.t) + (l.vu ? ' ' + S.pip('vu', true) : '') + '</span><b>' + esc(l.p) + '</b></label>').join('') + '</fieldset>'
    + '<div class="px-sum-r"><p class="px-sum-k">' + esc(TO.totalL) + '</p><output class="px-sum-v" data-vt-total aria-live="polite">' + esc(jeuL.find(l => l.defaut).p) + '</output><p class="px-sum-n">' + esc(TO.note) + '</p></div></form>'
    + '<div class="px-sum-static"><p class="px-sum-k">' + esc(TO.exemplesT) + '</p><ul>' + TO.exemples.map(e => '<li><span>' + esc(e.t) + '</span><b>' + esc(e.p) + '</b></li>').join('') + '</ul><p class="px-sum-n">' + esc(TO.note) + '</p></div></div>';
  const body = `<section class="page-head shell lk-glow"><div class="lk-head-grid"><div>
  <p class="fiche-cat">${esc(X.label)}, GTA VI</p>
  <h1>${esc(nb(X.title))}</h1>
  <p class="lede">${esc(X.lede)}</p>
  <p class="d-intro-note">${esc(X.note)} <a href="tuto.html#sources">Comprendre les statuts</a>.</p>
</div>${visual}</div>
${figs}</section>
${zone([
    { id: 'jeu', k: J.k, t: J.t, icon: 'achats', nav: J.k, fam: 'equipements', lede: J.lede, body: jeu },
    { id: 'collector', k: C.k, t: C.t, icon: 'kit', nav: 'Coffret collector', fam: 'rockstar', lede: C.lede, body: coffret },
    { id: 'manettes', k: M.k, t: M.t, icon: 'conduite', tone: 'night', nav: 'Manettes', fam: 'combat', lede: M.lede, body: manettes },
    { id: 'boutique', k: B.k, t: B.t, icon: 'tenue', nav: 'Boutique', fam: 'carte', lede: B.lede, body: boutique },
    { id: 'total', k: TO.k, t: TO.t, icon: 'calcul', nav: 'Total', fam: 'munitions', lede: TO.lede, body: total },
    faqSec(X.faq, leoAside(X.leo, 'coffret-the-goodtime-state', A.evenements.find(e => e.media === 'coffret-the-goodtime-state').alt)),
    srcSec(ctx, X.sources, '', X.liens.map(l => '<p class="ac-more"><a href="' + esc(l.href) + '">' + esc(l.label) + '</a></p>').join(''))
  ])}`;
  const og = imgOf(MED, 'coffret-the-goodtime-state');
  const ld = '<script type="application/ld+json">' + JSON.stringify({ '@context': 'https://schema.org', '@type': 'WebPage', name: X.title, description: metaDesc(X.desc), url: SITE + '/prix.html', inLanguage: 'fr', dateModified: ctx.SRC['ps-store-fr'].consultedAt, about: { '@type': 'VideoGame', name: 'Grand Theft Auto VI' }, isPartOf: { '@type': 'WebSite', name: 'Leonidakit', url: SITE + '/' } }) + '</script>' + faqLD(X.faq);
  return page(ROOTC, { p: '', title: X.seoTitle + ' | Leonidakit', desc: X.desc, canonical: '/prix.html', ogImg: og.b.src, body, crumbs: [['Accueil', '/'], [X.label, '/prix.html']], ld, cls: 'actus-page--prix' });
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
  return '<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>' + x(title) + '</title><link>' + x(url) + '</link><atom:link href="' + x(url.replace(/\.html$/, '.xml')) + '" rel="self" type="application/rss+xml"/><description>' + x(desc) + '</description><language>' + x(lang) + '</language>' + items.join('') + '</channel></rss>\n';
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
    { l: A.videos.title, k: A.videos.label, u: '/videos.html', s: n(A.videos.title + ' videos trailers bandes-annonces trailer 1 trailer 2 extended look bande-annonce de lancement launch trailer trailer 3 gta 6'), w: 1 },
    ...A.videos.liste.map(v => ({ l: v.titre, k: A.videos.label, u: '/videos/' + v.id + '.html', s: n(v.titre + ' ' + v.nom + ' ' + v.lede + ' trailer video bande-annonce'), w: 1 })),
    { l: A.editions.title, k: A.editions.label, u: '/editions.html', s: n(A.editions.title + ' edition standard ultimate precommande bonus vintage vice city gta+ boite disque prechargement ' + A.editions.contenus.map(c => c.fr + ' ' + c.nom).join(' ')), w: 1 },
    /* v7.92.1 : la page des prix et du coffret collector */
    { l: A.prix.title, k: A.prix.label, u: '/prix.html', s: n(A.prix.title + ' ' + A.prix.seoTitle + ' prix gta 6 combien coute gta 6 tarif 79,99 99,99 euros coffret collector collector edition collector the goodtime state vice city collection macca the gator figurine lunettes oakley casquette new era manette dualsense edition limitee boutique rockstar store t-shirt casquette zippo ' + A.prix.collector.objets.map(o => o.t).join(' ')), w: 1 }
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
  fs.writeFileSync(path.join(root, 'prix.html'), prixPage(ctx)); /* v7.92.1 */
  fs.writeFileSync(path.join(root, 'outils/actus-index.json'), JSON.stringify(indexEntries(ctx)));
  injectHome(ctx, root);
  const vd = L.A.videos.liste.map(v => { const d = videoData(ctx, v); return v.id + ' (' + d.moments.length + ' moments, ' + d.songs.length + (d.songs.length > 1 ? ' morceaux, ' : ' morceau, ') + d.vehicles.length + ' véhicules, ' + d.weapons.length + ' armes, ' + d.rev.length + ' révélations)'; });
  console.log('actus : ' + L.A.evenements.length + ' annonces, ' + L.A.aVenir.length + ' dates à venir ; vidéos : ' + vd.join(' ; ') + ' ; éditions : ' + L.A.editions.contenus.length + ' contenus de l’Ultimate');
}

module.exports = { generate, load, check, rss, videoData, revelations, homeLine, DATA_FILE };
if (require.main === module) generate();
