#!/usr/bin/env node
'use strict';
/* Section « Activités annexes » (section activites) : génère activites.html, une fiche activites/<id>.html par activité qui a
   assez de matière sourcée (outils/activites/activites.json) et outils/activites-index.json (recherche du site, lu par
   sync-site.cjs). Même gabarit que les hubs du monde (outils/lore-gen.js), zone éditoriale des hubs (outils/sections.cjs),
   sources datées en bas. Textes de la page principale : outils/activites/hub.json.
   Valeurs chiffrées (gain, durée) au schéma des valeurs publiées de outils/donnees-publiees.cjs ; aucune n’est publiée au
   4 octobre 2026. activitesCalculateur() rend les activités qui auraient un gain ET une durée publiés, au format de
   calculateurs-activites.js (« activite-<id> ») : ce fichier n’est pas modifié ici (voir « Pour l’assemblage »).
   leo() rend à outils/gen-leo.cjs les fiches (morceau « monde ») et les questions de la section (morceau leo/activites.json).
   Usage : node outils/gen-activites.cjs   (appelé par outils/regenerer.cjs, juste après lore-gen.js) */
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const ROOT = path.resolve(__dirname, '..');
const S = require('./sections.cjs');
const LKX = require('./lk-sections.cjs'), LOC = require('./localisateur.cjs'); /* fiches plein écran, mini-cartes, entrées animées (lk-sections.css, lk-sections.js) */
/* visuel des pages du site citées dans « Sur le site » et « Ailleurs sur le site » (cartes de liens) */
const PAGE_IMG = { 'gangs.html': 'ambrosia-01', 'planques.html': 'jason-s-safehouse-vehicles', 'entreprises.html': 'rideout-customs-mod-shop-01', 'armes.html': 'hawk-little-morgan-revolvers-01', 'vehicules.html': 'one-eyed-willie-s-mod-shop-01', 'personnalisations.html': 'ultimate-edition-rideout-customs-02', 'collectibles.html': 'classic-car-collection-04', 'lieux/mount-kalaga.html': 'mount-kalaga-national-park-01', 'bateaux.html': 'shitzu-squalo-01', 'lieux/grassrivers.html': 'grassrivers-03', 'planques/planque-jason.html': 'jason-s-safehouse-vehicles', 'lieux/leonida-keys.html': 'leonida-keys-01', 'nourriture.html': 'jason-duval-06', 'lieux/ambrosia.html': 'ambrosia-01', 'gangs/ptt-youngin-gang.html': 'ptt-youngin-illegal-goods-store', 'personnages/cal.html': 'cal-hampton-01', 'armes/queue-billard.html': 'cal-hampton-02', 'entreprises/jack-of-hearts.html': 'boobie-ike-02', 'style.html': 'stock-305-clothing-store-01' };
const slug = t => 'act-' + String(t).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[’']/g, '-').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const DP = require('./donnees-publiees.cjs');
const esc = S.esc;
const SITE = 'https://www.leonidakit.com', HUB = 'activites';
const FILES = { hub: 'outils/activites/hub.json', activites: 'outils/activites/activites.json' };
const TOOLS = ['activities', 'session', 'roi'];
const ST = ['officiel', 'vu', 'comm', 'conf'];
const FAMILLES = ['crime', 'nature', 'ville'];
const FOLDER = { characters: 'personnages', regions: 'lieux', factions: 'gangs', businesses: 'entreprises', hideouts: 'planques', residences: 'demeures' };
const REL_LABEL = { characters: 'Personnages', regions: 'Régions', factions: 'Gangs et factions', businesses: 'Entreprises', hideouts: 'Planques', residences: 'Demeures' };

function load(root = ROOT) {
  const read = f => fs.readFileSync(path.join(root, f), 'utf8');
  return { H: JSON.parse(read(FILES.hub)), A: JSON.parse(read(FILES.activites)), MED: JSON.parse(read('outils/medias-officiels.json')), STATUTS: JSON.parse(read('outils/editorial-hubs.json')).statuts, ED: JSON.parse(read('outils/editorial.json')), read };
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
let VW = null;
function vehiclesAndWeapons(root) {
  if (VW && VW.root === root) return VW;
  const c = { window: {} };
  for (const f of ['vehicules-data.js', 'armes-data.js']) vm.runInNewContext(fs.readFileSync(path.join(root, f), 'utf8'), c);
  VW = { root, v: new Set(c.window.LK_VEHICULES.map(x => x.id)), a: new Set(c.window.LK_ARMES.map(x => x.id)), vn: Object.fromEntries(c.window.LK_VEHICULES.map(x => [x.id, ((x.marque && x.marque !== 'Marque inconnue' ? x.marque + ' ' : '') + x.nom).trim()])), an: Object.fromEntries(c.window.LK_ARMES.map(x => [x.id, x.nom])) };
  return VW;
}
const PAGE_OK = (root, href) => { const f = href.split(/[?#]/)[0]; return !f || fs.existsSync(path.join(root, f)); };
function checkActivite(a, ctx) {
  const { H, ED, MED, root } = ctx, err = [], L = 'activité ' + (a && a.id || '?');
  const src = id => { if (!H.sources[id]) err.push(L + ' : source inconnue ' + id); };
  if (!a || !/^[a-z0-9][a-z0-9-]*$/.test(a.id || '')) return [L + ' : identifiant invalide'];
  for (const k of ['nom', 'tagline', 'resume', 'media', 'alt']) if (!a[k]) err.push(L + ' : champ manquant ' + k);
  if (a.resume && a.resume.length > 160) err.push(L + ' : résumé de plus de 160 signes (' + a.resume.length + ')');
  if (!FAMILLES.includes(a.famille)) err.push(L + ' : famille inconnue');
  if (!ST.includes(a.statut)) err.push(L + ' : statut inconnu');
  for (const id of [a.media, ...(a.galerie || []).map(g => g.media)]) if (!MED[id]) err.push(L + ' : visuel inconnu ' + id);
  for (const g of a.galerie || []) if (!g.alt || !g.legende) err.push(L + ' : visuel de galerie sans texte alternatif ou légende');
  if (!(a.montre || []).length) err.push(L + ' : rien de « montré » (une fiche exige au moins une source officielle)');
  if (!(a.montre || []).some(x => x.statut === 'officiel')) err.push(L + ' : aucune phrase officielle : l’activité reste une ligne de la page principale');
  for (const b of [...(a.montre || []), a.ou, ...(a.besoin || []), a.rapporte].filter(Boolean)) {
    if (!b.texte) err.push(L + ' : bloc sans texte');
    if (!ST.includes(b.statut)) err.push(L + ' : statut inconnu dans un bloc');
    if (!(b.sources || []).length) err.push(L + ' : bloc sans source : ' + (b.texte || '').slice(0, 40));
    (b.sources || []).forEach(src);
    for (const l of b.liens || []) if (!PAGE_OK(root, l.href)) err.push(L + ' : page inexistante ' + l.href);
  }
  for (const id of (a.ou && a.ou.regions) || []) if (!(ED.regions || []).some(x => x.id === id)) err.push(L + ' : région inconnue ' + id);
  for (const [g, ids] of Object.entries(a.rel || {})) { if (!FOLDER[g]) err.push(L + ' : groupe lié inconnu ' + g); for (const id of ids) if (!(ED[g] || []).some(x => x.id === id)) err.push(L + ' : fiche liée inconnue ' + g + '/' + id); }
  for (const l of a.liens || []) if (!PAGE_OK(root, l.href)) err.push(L + ' : page inexistante ' + l.href);
  (a.sources || []).forEach(src);
  const cited = new Set([...(a.montre || []), a.ou, ...(a.besoin || []), a.rapporte].filter(Boolean).flatMap(b => b.sources || []));
  for (const s of cited) if (!(a.sources || []).includes(s)) err.push(L + ' : source citée mais absente de la liste de la fiche : ' + s);
  err.push(...checkValue(a.rapporte && a.rapporte.gain, L + ' gain', '$'), ...checkValue(a.rapporte && a.rapporte.duree, L + ' durée', 'min'));
  if (!a.calc || !TOOLS.includes(a.calc.tool) || !a.calc.q || !a.calc.d || !a.calc.cta) err.push(L + ' : encart du calculateur incomplet');
  const w = vehiclesAndWeapons(root);
  for (const b of a.besoin || []) { for (const id of b.vehicules || []) if (!w.v.has(id)) err.push(L + ' : véhicule inconnu ' + id); for (const id of b.armes || []) if (!w.a.has(id)) err.push(L + ' : arme inconnue ' + id); }
  return err;
}
function check(ctx) {
  const { H, A, MED, root } = ctx, err = [];
  for (const [id, s] of Object.entries(H.sources)) {
    if (!/^https:\/\//.test(s.url)) err.push('source ' + id + ' : adresse https attendue');
    if (!s.title || !s.claim) err.push('source ' + id + ' : titre ou résumé manquant');
    if (!/^2026-\d\d-\d\d$/.test(s.consultedAt || '')) err.push('source ' + id + ' : date de consultation manquante');
    if (s.publishedAt !== null && !/^\d{4}-\d\d-\d\d$/.test(s.publishedAt || '')) err.push('source ' + id + ' : date de publication AAAA-MM-JJ ou null');
    if (!ST.includes(s.statut)) err.push('source ' + id + ' : statut inconnu');
  }
  const ids = new Set();
  for (const a of A.activites) { if (ids.has(a.id)) err.push('activité en double : ' + a.id); ids.add(a.id); err.push(...checkActivite(a, ctx)); }
  const fams = H.liste.familles;
  if (fams.map(f => f.id).join() !== FAMILLES.join()) err.push('familles attendues : ' + FAMILLES.join(', '));
  for (const f of fams) if (!S.ICONS[f.icon]) err.push('famille ' + f.id + ' : icône inconnue ' + f.icon);
  for (const f of fams) for (const x of f.items) {
    if (!x.nom || !x.texte || !ST.includes(x.statut) || !(x.sources || []).length) err.push('ligne mal formée : ' + x.nom);
    (x.sources || []).forEach(s => { if (!H.sources[s]) err.push('ligne ' + x.nom + ' : source inconnue ' + s); });
    if (x.fiche && !ids.has(x.fiche)) err.push('ligne ' + x.nom + ' : fiche inconnue ' + x.fiche);
    for (const l of x.liens || []) if (!PAGE_OK(root, l.href)) err.push('ligne ' + x.nom + ' : page inexistante ' + l.href);
    if (!x.fiche && !(x.liens || []).length && x.statut === 'conf') err.push('ligne ' + x.nom + ' : une activité à confirmer va dans « Ce qui reste à confirmer »');
  }
  for (const a of A.activites) if (!fams.some(f => f.items.some(x => x.fiche === a.id))) err.push('fiche absente de la liste de la page principale : ' + a.id);
  for (const r of H.rapporte.lignes) { if (!r.activite || !r.texte || !ST.includes(r.statut)) err.push('ligne « Ce que ça rapporte » mal formée : ' + r.activite); (r.sources || []).forEach(s => { if (!H.sources[s]) err.push('rapporte : source inconnue ' + s); }); if (r.fiche && !ids.has(r.fiche)) err.push('rapporte : fiche inconnue ' + r.fiche); }
  for (const p of H.hub.pile) if (!MED[p.media]) err.push('visuel inconnu dans la pile : ' + p.media);
  const Z = H.zone;
  for (const k of ['nav', 'rockstar', 'communaute', 'confirmer', 'toi', 'faq', 'sources']) if (!Z[k]) err.push('zone : bloc manquant ' + k);
  Z.sources.forEach(id => { if (!H.sources[id]) err.push('zone : source inconnue ' + id); });
  for (const id of Object.keys(H.sources)) if (!Z.sources.includes(id)) err.push('source jamais listée sur la page : ' + id);
  for (const p of Z.communaute.pairs) if (!Z.sources.includes(p.src)) err.push('paire sans source de la page : ' + p.fiction);
  for (const x of Z.rockstar.items) { if (!ST.includes(x.statut)) err.push('frise : statut ' + x.titre); if (x.media && (!MED[x.media] || !x.alt)) err.push('frise : visuel ' + x.titre); }
  if (Z.faq.length < 4 || Z.faq.length > 6) err.push('la FAQ compte 4 à 6 questions');
  for (const f of Z.faq) if (!f.q || !f.a || f.a.length > 900 || !(f.k || []).length) err.push('FAQ mal formée : ' + f.q);
  for (const a of Z.toi.actions) if (!a.href && !a.pins) err.push('action sans lien : ' + a.t);
  const cited = new Set([...fams.flatMap(f => f.items.flatMap(x => x.sources)), ...H.rapporte.lignes.flatMap(r => r.sources || []), ...(H.rapporte.sources || []), ...A.activites.flatMap(a => a.sources || [])]);
  for (const s of cited) if (!Z.sources.includes(s)) err.push('source citée mais absente de la liste de la page : ' + s);
  if (H.hub.desc.length > 160) err.push('description du hub trop longue (' + H.hub.desc.length + ' signes)');
  if (err.length) throw new Error('Section activites, données à corriger (outils/activites/) :\n- ' + err.join('\n- '));
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
function page(C, { p, title, desc, canonical, ogImg, body, crumbs, ld = '' }) {
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
${body.includes('lk-entry-card') ? `<link rel="stylesheet" href="${p}calculator-entry.css">\n` : ''}<link rel="stylesheet" href="${p}activites.css">
<link rel="stylesheet" href="${p}lk-sections.css">
<meta property="og:image" content="${SITE}${ogImg || '/img/social-card.png'}">
<meta name="twitter:card" content="summary_large_image">
<meta property="og:url" content="${SITE}${canonical}">
</head>
<body>

<a class="skip" href="#main">Aller au contenu</a>
<div class="sunset" aria-hidden="true"></div>

${C.header.replace(/ class="here"/g, '')}

<main id="main" class="lore-page activites-page lkx-page">
${body}
${LKX.dialog()}
${EXPLORE(p ? '../' : '')}
<section class="lk-outro" aria-label="Et après"><div class="shell lk-outro-in"><p class="lk-outro-k">Et après ?</p><h2>La suite s’écrit le 19 novembre 2026.</h2><p>Chaque fiche se complète avec le jeu : ce qu’on y trouve, ce qu’on y fait, ce que ça rapporte. Rien d’inventé d’ici là.</p><div class="lk-outro-links"><a href="${p ? '../' : ''}carte.html">Ouvrir la carte</a><a href="${p ? '../' : ''}progression.html">Ma progression</a></div></div></section>
</main>

${C.footer}

${C.scripts}
<script src="${p}activites.js"></script>
${body.includes('data-lk-loc=') ? `<script src="${p}localisateur.js"></script>\n` : ''}<script src="${p}lk-sections.js"></script>
</body>
</html>
`;
}

/* ---------- briques ---------- */
const imgOf = (MED, id) => { const m = MED[id]; if (!m) return null; return { a: m.variants[0], b: m.variants[1] || m.variants[0] }; };
function imgTag(MED, id, alt, big, pre = '') {
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
/* numéros de source : chaque fiche numérote ses sources dans l’ordre de sa liste (lien vers #src-<id> en bas de page) */
const srcLinks = (ids, order) => ids.length ? '<span class="activites-src">' + ids.map(id => { const n = order ? order.indexOf(id) + 1 : 0; return '<a href="#src-' + esc(id) + '" aria-label="Source ' + n + '">' + n + '</a>'; }).join('') + '</span>' : '';
const pinsHref = a => a.pins ? 'carte.html#pins=' + a.pins.join(',') + (a.pinsTitle ? '&t=' + encodeURIComponent(a.pinsTitle) : '') : a.href;
const nameOf = (ED, group, id) => ((ED[group] || []).find(x => x.id === id) || {}).name || id;
const chips = (ED, group, ids, pre) => (ids || []).map(id => '<a class="activites-chip" href="' + pre + FOLDER[group] + '/' + esc(id) + '.html">' + esc(nameOf(ED, group, id)) + '</a>').join('');
const carteChips = (list, pre) => (list || []).map(c => '<a class="activites-chip activites-chip--carte" href="' + pre + 'carte.html#lieu=' + esc(c.id) + '">' + esc(c.nom) + '</a>').join('');
const valText = (v, unknownText) => {
  if (!known(v)) return unknownText;
  const label = DP.STATUS_LABEL[({ officiel: 'official' })[v.status] || v.status] || 'Non confirmé';
  return (v.unit === 'min' ? DP.fmt(v.value) + ' min' : DP.fmt(v.value) + ' $') + ' · ' + label;
};
const famille = (H, id) => H.liste.familles.find(f => f.id === id) || { titre: id };

/* ---------- page principale ---------- */
function hubPage(ctx) {
  const { H, A, MED, STATUTS, ROOTC } = ctx, X = H.hub;
  const order = H.zone.sources;
  const pile = require('./lot-c-visuals.cjs').stack(X.pile.map(p => { const m = imgOf(MED, p.media); return { src: m.a.src, big: m.b.src, alt: p.alt, caption: p.caption }; }), { label: 'Trois visuels officiels de cette section' });
  const F = H.fiches;
  /* les fiches : mosaïque de grandes images, entrée « iris » (lk-sections.css) */
  const tile = (a, i) => '<a class="activites-tile activites-tile--' + esc(a.famille) + (i === 0 ? ' activites-tile--big' : '') + ' lkx-tilt" href="' + HUB + '/' + esc(a.id) + '.html"><span class="activites-tile-media">' + LKX.img(MED, a.media, a.alt, { big: i === 0, sizes: i === 0 ? '(max-width:980px) 94vw, (max-width:1099px) 63vw, 690px' : '(max-width:980px) 94vw, (max-width:1160px) 63vw, (max-width:1360px) 58vw, 690px' }) + '</span>'
    + '<span class="activites-tile-body"><span class="activites-tile-fam">' + esc(famille(H, a.famille).titre) + '</span><h3>' + esc(a.nom) + '</h3><span class="activites-tile-tag">' + esc(a.tagline) + '</span><span class="activites-tile-go">Voir la fiche</span></span></a>';
  const fiches = '<section class="shell activites-fiches" id="fiches" aria-labelledby="fiches-t"><div class="reveal"><p class="activites-kicker">' + esc(F.kicker) + '</p><h2 class="sec-h" id="fiches-t">' + esc(F.titre) + '</h2><p class="activites-lede">' + esc(F.lede) + '</p></div>'
    + '<div class="activites-bento lkx-iris lk-arrive" data-lkx-in>' + A.activites.map(tile).join('') + '</div></section>';
  const LI = H.liste;
  const total = LI.familles.reduce((n, f) => n + f.items.length, 0);
  /* filtre (activites.js) : boutons écrits dans la page, montrés seulement quand le script tourne ; sans script, tout est visible */
  const filtre = '<div class="activites-filtre" data-activites-filtre hidden><p class="activites-filtre-t" id="activites-filtre-t">Afficher</p><div class="activites-filtre-b" role="group" aria-labelledby="activites-filtre-t">'
    + [['all', 'Toutes'], ['officiel', 'Annoncées par Rockstar'], ['vu', 'Vues dans les médias'], ['fiche', 'Avec une fiche'], ['carte', 'Sur la carte']].map(([k, t], i) => '<button type="button" data-filtre="' + k + '" aria-pressed="' + (i ? 'false' : 'true') + '">' + esc(t) + '</button>').join('')
    + '</div><p class="activites-filtre-n" aria-live="polite">Activités affichées : <b data-activites-n translate="no">' + total + '</b></p></div>';
  const placesOf = x => (x.carte || []).map(c => LKX.place(c.id, c.nom ? { [c.id]: c.nom } : {}));
  const pageLink = l => { const h = l.href.split('#')[0]; return LKX.linkCard({ href: l.href, title: l.label, text: l.texte, img: PAGE_IMG[h] ? LKX.thumb(MED, PAGE_IMG[h]) : null }); };
  /* une ligne = une activité ; un clic l’ouvre en grand : image, texte, statut et sources, lieux sur la carte de Leonida, pages liées */
  const ligne = (x, f) => {
    const id = slug(x.nom), places = placesOf(x);
    const summary = '<span class="activites-row">' + (x.media ? '<span class="activites-row-img">' + LKX.thumb(MED, x.media) + '</span>' : '<span class="activites-row-img activites-row-img--ico" aria-hidden="true">' + S.icon(f.icon) + '</span>')
      + '<span class="activites-row-body"><h4>' + esc(x.nom) + '</h4><span class="activites-row-x">' + esc(x.texte) + '</span></span>'
      + '<span class="activites-row-tags">' + S.pip(x.statut, true) + (x.fiche ? '<span class="activites-tag activites-tag--fiche">Fiche</span>' : '') + (places.length ? '<span class="activites-tag activites-tag--carte">' + LKX.ICO.pin + '<b translate="no">' + places.length + '</b></span>' : '') + '</span><span class="activites-row-chev" aria-hidden="true"></span></span>';
    const body = '<p>' + esc(x.texte) + ' ' + srcLinks(x.sources, order) + '</p>'
      + (places.length ? '<h4>Sur la carte de Leonida</h4>' + LKX.miniMap(places, { label: 'Carte de Leonida : ' + x.nom, note: 'Lieux repérés sur notre carte : pas un emplacement confirmé pour l’activité.' }) : '<p class="activites-nomap">' + LKX.ICO.map + 'Aucun lieu n’est encore placé pour cette activité : rien n’est mis au hasard.</p>')
      + ((x.liens || []).length ? '<h4>Sur le site</h4><div class="lkx-links">' + x.liens.map(pageLink).join('') + '</div>' : '')
      + '<p class="lkx-sheet-cta">' + (x.fiche ? '<a class="lkx-btn" href="' + HUB + '/' + esc(x.fiche) + '.html">Voir la fiche complète</a>' : '') + '<a class="lkx-btn lkx-btn--ghost" href="calculateurs.html?tool=activities&amp;from=activites#atelier">Comparer mes activités</a></p>';
    return '<li class="activites-item activites-item--' + esc(f.id) + (x.fiche ? ' activites-item--fiche' : '') + '" data-statut="' + esc(x.statut) + '"' + (x.fiche ? ' data-fiche' : '') + (places.length ? ' data-carte' : '') + '>'
      + LKX.sheet({ id, cls: 'activites-det', summary, fig: x.media ? LKX.img(MED, x.media, x.alt, { big: true, sizes: '(max-width:760px) 100vw, 600px' }) : null, icon: S.icon(f.icon), caption: 'Visuel officiel Rockstar Games', kicker: esc(f.titre) + ' · ' + S.pip(x.statut, true), title: x.nom, body }) + '</li>';
  };
  const liste = '<section class="shell activites-liste" id="toutes" aria-labelledby="toutes-t"><div class="reveal"><p class="activites-kicker">' + esc(LI.kicker) + '</p><h2 class="sec-h" id="toutes-t">' + esc(LI.titre) + '</h2><p class="activites-lede">' + esc(LI.lede) + '</p></div>'
    + filtre
    + LI.familles.map(f => '<div class="activites-fam activites-fam--' + esc(f.id) + '" data-famille="' + esc(f.id) + '"><h3 class="activites-fam-t"><span class="activites-fam-ico">' + S.icon(f.icon) + '</span>' + esc(f.titre) + '<span class="activites-fam-n" translate="no">' + f.items.length + '</span></h3><ul class="activites-items lkx-wave lk-arrive" data-lkx-in>' + f.items.map(x => ligne(x, f)).join('') + '</ul></div>').join('')
    + '</section>';
  /* où pratiquer : le localisateur du site (même composant que les armes et les véhicules), une activité à la fois */
  const allPlaces = [], seenP = new Set();
  for (const f of LI.familles) for (const x of f.items) for (const p of placesOf(x)) if (!seenP.has(p.id)) { seenP.add(p.id); allPlaces.push({ ...p, group: f.titre }); }
  const locItems = LI.familles.flatMap(f => f.items.map(x => { const pl = placesOf(x);
    return { id: slug(x.nom), name: x.nom, cat: f.id, catLabel: f.titre, thumb: x.media ? LKX.thumb(MED, x.media) : S.icon(f.icon), url: x.fiche ? HUB + '/' + x.fiche + '.html' : HUB + '.html#' + slug(x.nom), places: pl.map(p => p.id), status: pl.length ? 'Lieux repérés sur notre carte' : 'Emplacement à venir', linkedText: 'Lieux de notre carte liés à cette activité :', noneText: 'Aucun lieu n’est encore placé pour cette activité : rien n’est mis au hasard.', mapTitle: x.nom, pronoun: 'la', search: x.texte }; }));
  const carteSec = '<section class="shell activites-carte" id="carte-activites" aria-labelledby="carte-activites-t"><div class="reveal"><p class="activites-kicker">' + esc(LI.carteK) + '</p><h2 class="sec-h" id="carte-activites-t">' + esc(LI.carteT) + '</h2><p class="activites-lede">' + esc(LI.carteL) + '</p></div>'
    + LOC.hub({ kind: 'activites', prefix: '', items: locItems, places: allPlaces, cats: LI.familles.map(f => [f.id, f.titre]), catsLabel: 'Familles d’activités', searchLabel: 'Chercher une activité', noun: 'activités', listLabel: 'Les activités', mapLabel: 'Carte de Leonida : lieux liés aux activités annexes', caption: 'Lieux repérés sur notre carte : pas un emplacement confirmé pour chaque activité.', initial: slug('Club de strip-tease') }) + '</section>';
  /* ce que ça rapporte : cartes façon calculateur ; chaque carte ouvre la fiche ou la ligne de l’activité */
  const R = H.rapporte, itemByNom = Object.fromEntries(LI.familles.flatMap(f => f.items.map(x => [x.nom, x])));
  const cash = r => { const ft = r.fiche && A.activites.find(a => a.id === r.fiche), it = r.cible && itemByNom[r.cible], media = ft ? ft.media : it ? it.media : null;
    const href = ft ? HUB + '/' + ft.id + '.html' : it ? '#' + slug(it.nom) : null;
    return '<article class="activites-cash-card lkx-tilt">' + (media ? '<span class="activites-cash-img">' + LKX.thumb(MED, media) + '</span>' : '')
      + '<p class="activites-cash-k"><span class="activites-cash-ico" aria-hidden="true">$</span>' + esc(R.kicker) + '</p>'
      + '<h3>' + (href ? '<a class="activites-cash-a" href="' + href + '">' + esc(r.activite) + '</a>' : esc(r.activite)) + '</h3>'
      + '<p class="activites-cash-screen"><span class="activites-cash-val" aria-hidden="true">— — — $</span><span class="activites-cash-lbl">' + esc(R.ecran) + '</span></p>'
      + '<p class="activites-cash-txt">' + esc(r.texte) + ' ' + srcLinks(r.sources || [], order) + '</p><p class="activites-cash-st">' + S.pip(r.statut, true) + (href ? '<span class="activites-cash-go">' + esc(ft ? 'Voir la fiche' : R.ouvrir) + '</span>' : '') + '</p></article>'; };
  const rapporte = '<section class="activites-rapporte lk-arrive" id="rapporte" aria-labelledby="rapporte-t"><div class="shell activites-rapporte-in"><div class="activites-rapporte-head"><p class="activites-kicker">' + esc(R.kicker) + '</p><h2 class="sec-h" id="rapporte-t">' + esc(R.titre) + '</h2><p class="activites-lede">' + esc(R.lede) + '</p><a class="lkx-btn" href="calculateurs.html?tool=activities&amp;from=activites#atelier">' + esc(R.calc) + '</a></div>'
    + '<div class="activites-cash lkx-deal" data-lkx-in>' + R.lignes.map(cash).join('') + '</div>'
    + R.p.map(t => '<p class="activites-note">' + esc(t) + ' ' + srcLinks(R.sources || [], order) + '</p>').join('') + '</div></section>';
  const body = `<section class="page-head shell lk-glow"><div class="lk-head-grid"><div>
  <p class="fiche-cat">${esc(X.label)} · GTA VI</p>
  <h1>${esc(X.title)}</h1>
  <p class="lede">${esc(X.lede)}</p>
  <p class="d-intro-note">${esc(X.note)} <a href="tuto.html#sources">Comprendre les statuts</a>.</p>
</div>${pile}</div></section>
${fiches}
${liste}
${carteSec}
${rapporte}
${zone(H, STATUTS)}`;
  const collection = '<script type="application/ld+json">' + JSON.stringify({ '@context': 'https://schema.org', '@type': 'CollectionPage', name: X.title, description: metaDesc(X.desc), url: SITE + '/' + HUB + '.html', inLanguage: 'fr', isPartOf: { '@type': 'WebSite', name: 'Leonidakit', url: SITE + '/' }, mainEntity: { '@type': 'ItemList', name: F.titre, numberOfItems: A.activites.length, itemListElement: A.activites.map((a, i) => ({ '@type': 'ListItem', position: i + 1, name: a.nom, url: SITE + '/' + HUB + '/' + a.id + '.html' })) } }) + '</script>';
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
    legend + '<h3 class="ed-h3">Pages consultées</h3>' + sourceList(H, Z.sources) + '<div class="ed-callout"><p><strong>Ce qu’on ne fait pas.</strong> Aucune donnée issue des fuites de 2022 ou de 2026, aucune activité ajoutée sans source, aucun montant deviné. Les statuts sont expliqués dans le <a href="tuto.html#sources">Tuto</a>.</p></div>'));
  out.push('</div>');
  return out.join('\n');
}

/* ---------- fiche d’une activité ---------- */
function calcBridge(a, p) {
  const c = a.calc, params = 'tool=' + c.tool + (c.type ? '&amp;type=' + esc(c.type) : '') + '&amp;from=activites';
  return '<section class="shell" aria-labelledby="lore-calculator-title"><div class="lk-entry-card"><div><p class="lk-entry-eyebrow">LE CALCULATEUR</p><h2 id="lore-calculator-title">' + esc(c.q) + '</h2><p>' + esc(c.d) + '</p></div><a class="lk-entry-button" href="' + p + 'calculateurs.html?' + params + '#atelier">' + esc(c.cta) + ' <span aria-hidden="true">↗</span></a></div></section>';
}
function fichePage(ctx, a) {
  const { H, MED, ED, SUBC, root } = ctx, p = '../', W = vehiclesAndWeapons(root || ROOT), order = a.sources;
  const st = b => S.pip(b.statut, true) + srcLinks(b.sources || [], order);
  const links = l => (l || []).map(x => '<a class="activites-chip" href="' + p + esc(x.href) + '">' + esc(x.label) + '</a>').join('');
  const vehs = ids => (ids || []).map(id => '<a class="activites-chip activites-chip--veh" href="' + p + 'vehicules/' + esc(id) + '.html">' + esc(W.vn[id] || id) + '</a>').join('');
  const arms = ids => (ids || []).map(id => '<a class="activites-chip activites-chip--veh" href="' + p + 'armes/' + esc(id) + '.html">' + esc(W.an[id] || id) + '</a>').join('');
  const R = a.rapporte, O = a.ou, fam = famille(H, a.famille);
  const regionChip = id => { const y = (ED.regions || []).find(z => z.id === id); return LKX.chip({ href: p + 'lieux/' + id + '.html', label: y ? y.name : id, img: y ? LKX.thumb(MED, (y.media || [])[0]) : null, kind: 'region', small: 'Région' }); };
  const placeChips = list => (list || []).map(c => LKX.chip({ href: p + 'carte.html#lieu=' + c.id, label: c.nom, kind: 'place', small: 'Sur la carte' })).join('');
  /* l’essentiel : le récit de la fiche en quelques phrases, tiré des faits sourcés ci-dessous */
  const essentiel = a.essentiel ? '<section class="shell activites-essentiel"><div class="activites-essentiel-in lkx-up" data-lkx-in><p class="activites-essentiel-k">L’essentiel</p><p class="activites-essentiel-t">' + esc(a.essentiel) + '</p></div></section>' : '';
  const montre = '<div class="lore-texte reveal"><h2>Ce que Rockstar a dit et montré</h2><ol class="activites-montre lkx-wave lk-arrive" data-lkx-in>' + a.montre.map(x => '<li class="activites-montre-i activites-montre-i--' + esc(x.statut) + '"><span class="activites-montre-dot" aria-hidden="true"></span><p>' + esc(x.texte) + '</p><p class="activites-st">' + st(x) + '</p></li>').join('') + '</ol></div>';
  const ouChips = (O.regions || []).map(regionChip).join('') + placeChips((O.carte || []).filter(c => !(O.regions || []).includes(c.id)));
  const ou = '<div class="lore-texte reveal"><h2>Où la pratiquer</h2><p>' + esc(O.texte) + '</p>' + (ouChips ? '<div class="lkx-chips activites-ou-chips">' + ouChips + '</div>' : '') + '<p class="activites-st">' + st(O) + '</p></div>';
  const besoin = '<div class="lore-texte reveal"><h2>Ce qu’il faut</h2><ul class="activites-besoin">' + a.besoin.map((b, i) => { const extra = vehs(b.vehicules) + arms(b.armes) + links(b.liens); return '<li><span class="activites-besoin-n" aria-hidden="true">' + (i + 1) + '</span><div><p>' + esc(b.texte) + '</p>' + (extra ? '<p class="activites-chips">' + extra + '</p>' : '') + '<p class="activites-st">' + st(b) + '</p></div></li>'; }).join('') + '</ul></div>';
  const chiffres = '<dl class="activites-chiffres"><div><dt>Gain</dt><dd><span class="activites-ecran" aria-hidden="true">— $</span><span>' + esc(valText(R.gain, 'Pas encore publié')) + '</span></dd></div><div><dt>Durée</dt><dd><span class="activites-ecran" aria-hidden="true">— min</span><span>' + esc(valText(R.duree, 'Pas encore publiée')) + '</span></dd></div></dl>';
  const rapporte = '<div class="lore-texte reveal activites-fiche-rapporte"><h2>Ce que ça rapporte</h2><p>' + esc(R.texte) + '</p>' + chiffres + '<p class="activites-st">' + st(R) + '</p></div>';
  const confirmer = (a.confirmer || []).length ? '<div class="lore-facts"><h2>Ce qui reste à confirmer</h2><ul>' + a.confirmer.map(x => '<li class="rise"><b>' + esc(x.q) + '</b> ' + esc(x.etat) + '</li>').join('') + '</ul></div>' : '';
  const ailleurs = (a.liens || []).length ? '<div class="lore-texte reveal"><h2>Ailleurs sur le site</h2><div class="lkx-links">' + a.liens.map(l => { const h = l.href.split('#')[0]; return LKX.linkCard({ href: p + l.href, title: l.label, text: l.texte, img: PAGE_IMG[h] ? LKX.thumb(MED, PAGE_IMG[h]) : null }); }).join('') + '</div></div>' : '';
  const rel = (group, ids) => { const l = (ids || []).map(id => (ED[group] || []).find(y => y.id === id)).filter(Boolean); if (!l.length) return '';
    return '<div class="lore-rel-group"><h3>' + REL_LABEL[group] + '</h3><div class="lore-mini">' + l.map(y => { const mm = (y.media || []).map(id => MED[id]).filter(Boolean)[0]; return '<a class="lore-minicard" href="../' + FOLDER[group] + '/' + y.id + '.html">' + (mm ? '<img src="' + mm.variants[0].src + '" width="' + mm.variants[0].w + '" height="' + mm.variants[0].h + '" alt="" loading="lazy" decoding="async">' : '<i class="lore-minivide"></i>') + '<span><b>' + esc(y.name) + '</b><i>' + REL_LABEL[group] + '</i></span></a>'; }).join('') + '</div></div>'; };
  const relBlocks = Object.keys(FOLDER).map(g => rel(g, (a.rel || {})[g])).join('');
  /* sur la carte : le localisateur du site, avec les lieux de la fiche ; en images : la galerie animée des fiches du monde */
  const places = (O.carte || []).map(c => LKX.place(c.id, { [c.id]: c.nom }));
  const locate = LKX.locate({ lede: 'Les lieux de notre carte liés à cette activité. Ce sont des repères pour t’y rendre, pas des emplacements confirmés par Rockstar pour l’activité.', item: { name: a.nom, catLabel: fam.titre, thumb: LKX.thumb(MED, a.media), status: 'Lieux repérés sur notre carte', linkedText: 'Lieux de notre carte liés à cette activité :', noneText: 'Aucun lieu n’est encore placé pour cette activité : rien n’est mis au hasard.', mapTitle: a.nom, pronoun: 'la', url: HUB + '/' + a.id + '.html' }, places, caption: 'Lieux repérés sur notre carte : pas un emplacement confirmé pour l’activité.', placesTitle: 'Lieux repérés' });
  const gal = LKX.gallery(MED, [{ media: a.media, alt: a.alt, legende: fam.titre }, ...(a.galerie || []).map(g => ({ media: g.media, alt: g.alt, legende: g.legende }))], { name: a.nom, kicker: fam.titre });
  const srcs = '<section class="shell activites-fiche-src reveal" aria-labelledby="sources-t"><h2 class="sec-h" id="sources-t">Sources</h2>' + sourceList(H, a.sources) + '</section>';
  const body = `<section class="page-head shell">
  <nav class="crumbs" aria-label="Fil d’Ariane"><a href="../index.html">Accueil</a> / <a href="../${HUB}.html">${esc(H.hub.label)}</a> / <span>${esc(a.nom)}</span></nav>
  <div class="lore-hero lore-enter">
    <div class="lore-copy">
      <p class="fiche-cat">${esc(fam.titre)} · GTA VI</p>
      <h1>${esc(a.nom)}</h1>
      <p class="lore-tag">${esc(a.tagline)}</p>
      <p class="lede">${esc(a.resume)}</p>
      <p class="activites-st activites-st--hero">${S.pip(a.statut, true)}</p>
    </div>
    <figure class="lore-fig">${imgTag(MED, a.media, a.alt, true)}</figure>
  </div>
</section>
${calcBridge(a, p)}
${essentiel}
<section class="shell lore-body activites-fiche">
  ${montre}${ou}${besoin}${rapporte}${confirmer}${ailleurs}
  ${relBlocks ? `<div class="lore-related"><h2>En lien</h2>${relBlocks}</div>` : ''}
</section>
${locate}
${gal}
${srcs}`;
  const og = imgOf(MED, a.media);
  return page(SUBC, { p, title: a.nom + ' — GTA VI | Leonidakit', desc: a.resume, canonical: '/' + HUB + '/' + a.id + '.html', ogImg: og.b.src, body, crumbs: [['Accueil', '/'], [H.hub.label, '/' + HUB + '.html'], [a.nom, '/' + HUB + '/' + a.id + '.html']] });
}

/* ---------- pont avec le calculateur (décrit, pas écrit : voir « Pour l’assemblage » du LISEZ-MOI) ---------- */
const ACT_ST = { officiel: 'official', official: 'official', verified: 'verified', estimated: 'estimated', unverified: 'unverified' };
const RANK = ['unknown', 'unverified', 'estimated', 'verified', 'official'];
/* Activités qui ont un gain ET une durée publiés, au format de calculateurs-activites.js (« activite-<id> ») : vide au 4 octobre 2026. */
function activitesCalculateur(list) {
  return list.filter(a => a.rapporte && known(a.rapporte.gain) && known(a.rapporte.duree) && a.rapporte.duree.value > 0).map(a => {
    const r = a.rapporte.gain, d = a.rapporte.duree, rs = ACT_ST[r.status] || 'unverified', ds = ACT_ST[d.status] || 'unverified';
    const meta = v => ({ status: ACT_ST[v.status] || 'unverified', source: v.source || null, verifiedAt: v.verifiedAt || null, unit: v.unit });
    return { id: 'activite-' + a.id, name: a.nom, reward: { value: r.value, ...meta(r) }, duration: { value: d.value, ...meta(d) }, players: null, source: r.source || d.source || null, status: RANK[Math.min(RANK.indexOf(rs), RANK.indexOf(ds))], verifiedAt: [r.verifiedAt, d.verifiedAt].filter(Boolean).sort()[0] || null, beginner: null };
  });
}

/* ---------- recherche du site (outils/activites-index.json, lu par sync-site.cjs) ---------- */
function indexEntries(H, A) {
  const n = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const lines = H.liste.familles.flatMap(f => f.items.map(x => x.nom)).join(' ');
  return [{ l: H.hub.title, k: H.hub.label, u: '/' + HUB + '.html', s: n(H.hub.title + ' ' + H.hub.label + ' activites annexes secondaires loisirs mini jeux que faire ' + lines), w: 1 },
    ...A.activites.map(a => ({ l: a.nom, k: H.hub.label, u: '/' + HUB + '/' + a.id + '.html', s: n(a.nom + ' ' + a.tagline + ' ' + (a.aliases || []).join(' ')), w: 1 }))];
}

/* ---------- Léo : fiches (morceau « monde ») et questions de la section (morceau leo/activites.json) ---------- */
function leo(root = ROOT) {
  const { H, A, MED } = load(root);
  const image = id => ((MED[id] && MED[id].variants) || []).map(v => v.src).find(src => fs.existsSync(path.join(root, src.slice(1)))) || null;
  const verifiedAt = Object.values(H.sources).map(s => s.consultedAt).sort().pop();
  /* « où… ? » : le premier repère de la fiche sur la carte, sinon sa première région */
  const placeOf = a => (a.ou.carte[0] && a.ou.carte[0].id) || a.ou.regions[0] || null;
  const fiches = A.activites.map(a => ({ key: 'activite:' + a.id, id: a.id, kind: 'activite', shard: 'monde', name: a.nom, aliases: a.aliases || [], category: H.hub.label + ' · ' + famille(H, a.famille).titre, url: '/' + HUB + '/' + a.id + '.html', mapId: placeOf(a), mapUrl: placeOf(a) ? '/carte.html#lieu=' + placeOf(a) : null, image: image(a.media), calcId: null, price: null, proof: 'Activité annoncée ou montrée par Rockstar ; sources datées sur la fiche.', source: null, verifiedAt, description: a.resume, tagline: a.tagline }));
  const label = H.hub.label;
  const topics = H.zone.faq.filter(x => !x.leo).map((x, i) => ({ id: 'activites-faq-' + (i + 1), q: x.q, f: [x.q, ...(x.f || [])], k: x.k, text: x.a, status: 'Réponse de la FAQ « ' + label + ' », sources en bas de la page', links: [{ label: 'La FAQ et ses sources', url: '/' + HUB + '.html#faq' }], verifiedAt, min: Number.isInteger(x.min) ? x.min : 2 }));
  return { fiches, topics, suggestions: { activites: H.leo.suggestions }, inputs: Object.values(FILES) };
}

/* ---------- génération ---------- */
function context(root = ROOT) { const L = load(root); return { ...L, root, ROOTC: chromeOf(L.read('a-propos.html')), SUBC: chromeOf(L.read('vehicules/karin-sultan.html')) }; }
function generate(root = ROOT) {
  const ctx = context(root), L = ctx;
  check(ctx);
  fs.writeFileSync(path.join(root, HUB + '.html'), hubPage(ctx));
  fs.mkdirSync(path.join(root, HUB), { recursive: true });
  const keep = new Set(L.A.activites.map(a => a.id + '.html'));
  for (const f of fs.readdirSync(path.join(root, HUB))) if (f.endsWith('.html') && !keep.has(f)) fs.unlinkSync(path.join(root, HUB, f));
  for (const a of L.A.activites) fs.writeFileSync(path.join(root, HUB, a.id + '.html'), fichePage(ctx, a));
  fs.writeFileSync(path.join(root, 'outils/activites-index.json'), JSON.stringify(indexEntries(L.H, L.A)));
  const lignes = L.H.liste.familles.reduce((n, f) => n + f.items.length, 0);
  console.log('activites : ' + L.A.activites.length + ' fiche(s), ' + lignes + ' activités listées, ' + L.H.zone.faq.length + ' questions, ' + L.H.zone.sources.length + ' sources ; calculateur : ' + activitesCalculateur(L.A.activites).length + ' activité(s) chiffrée(s) à relier');
}

module.exports = { generate, context, leo, load, check, checkActivite, checkValue, fichePage, hubPage, activitesCalculateur, indexEntries, FILES };
if (require.main === module) generate();
