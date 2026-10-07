#!/usr/bin/env node
'use strict';
/* LEONIDAKIT — carnets de progression (v7.51, lot 4).
   Écrit une page dédiée par carnet (carnets/<id>.html : garage, arsenal, garde-robe, consommables, personnalisations,
   propriétés, lieux, collectibles, calculs), le fichier des noms des lieux (carnets/lieux-data.js) et le bloc
   « Mes carnets » de progression.html. Les textes viennent d’outils/carnets-editorial.json, les éléments
   d’outils/carnets-source.cjs (mêmes identifiants que progression-data.js), les carnets d’outils/modele-donnees.json.
   Ce qui est publié : la présentation du carnet (titre, explication, catégories, questions), jamais une liste
   personnelle. Ce que tu as coché est lu dans ton navigateur par carnets.js. Lancé par regenerer.cjs après le premier
   passage de sync-site.cjs (qui écrit progression-data.js), avant le second (menu, pied de page, empreintes, sitemap). */
const fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname, '..');
const S = require('./carnets-source.cjs'), V = require('./lot-c-visuals.cjs'), T = require('./typographie.cjs');
const SEC = require('./sections.cjs'), ARMES = require('./armes-schemas.cjs');
const ED = JSON.parse(fs.readFileSync(path.join(__dirname, 'carnets-editorial.json'), 'utf8'));
const M = S.modele();
const SITE = 'https://www.leonidakit.com';
const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const t = s => T.texte(String(s));
const nf = n => new Intl.NumberFormat('fr-FR').format(n).replace(/[\s  ]/g, ' ');
const plural = (n, one, many) => n + ' ' + (n > 1 ? many : one);
/* JSON dans une balise script : aucune séquence ne peut fermer la balise. */
const jsonScript = o => JSON.stringify(o).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');

/* Visuels d’en-tête : trois visuels officiels déjà livrés (img/officiel), légende et texte alternatif écrits ici. */
const STACK = {
  garage: [['classic-car-collection-02', 'Coupé turquoise', 'Coupé turquoise de la collection de voitures, visuel officiel Rockstar Games'], ['55-vapid-stanier-01', 'Vapid Stanier', 'Vapid Stanier jaune sous les néons, visuel officiel Rockstar Games'], ['95-grotti-cheetah-01', 'Grotti Cheetah', 'Grotti Cheetah blanche devant un hôtel Art déco, visuel officiel Rockstar Games']],
  arsenal: [['hawk-little-morgan-revolvers-02', 'Revolvers Hawk & Little', 'Revolvers Hawk & Little sur une table, visuel officiel Rockstar Games'], ['personalized-weapon-variants', 'Armes personnalisées', 'Deux pistolets aux finitions personnalisées, visuel officiel Rockstar Games'], ['trailer-2-lucia-grenade-launcher', 'Lance-grenades', 'Lucia tire au lance-grenades depuis une voiture, visuel officiel Rockstar Games']],
  'garde-robe': V.STACKS.style,
  consommables: V.STACKS.nourriture,
  personnalisations: V.STACKS.customizations,
  proprietes: V.STACKS.logements,
  lieux: V.STACKS.carte,
  collectibles: V.STACKS.collectibles,
  calculs: [['jason-and-lucia-02', 'Jason et Lucia', 'Jason et Lucia prêts pour un braquage, visuel officiel Rockstar Games'], ['boobie-ike-02', 'Jack of Hearts', 'Boobie Ike devant le club Jack of Hearts, visuel officiel Rockstar Games'], ['vice-city-01', 'Vice City', 'Lettres géantes de Vice City au coucher du soleil, visuel officiel Rockstar Games']]
};
function stackOf(id, prefix) {
  const list = STACK[id].map(([name, caption, alt]) => { const a = V.file(name, 480), b = V.file(name, 1280); if (!a) throw new Error('Visuel absent pour le carnet ' + id + ' : ' + name); return { src: a, big: b, alt, caption }; });
  return { html: V.stack(list, { prefix, label: 'Trois visuels officiels pour « ' + titleOf(id) + ' »' }), og: SITE + (list[0].big || list[0].src), first: list[0] };
}
const carnetById = id => M.carnets.find(k => k.id === id);
const titleOf = id => carnetById(id).titre;

/* Vocabulaire des boutons d’envie par famille (genre du mot). */
function wishLabel(fam) {
  if (fam === 'lieux') return 'À visiter';
  if (fam === 'consommables') return 'Je veux l’essayer';
  return S.FAM[fam].fem ? 'Je la veux' : 'Je le veux';
}
/* Catégories d’une famille, dans l’ordre de première apparition, avec leur nombre. */
function catsOf(list) {
  const map = new Map();
  for (const it of list) { const k = it.f + ':' + it.g; if (!map.has(k)) map.set(k, { f: it.f, g: it.g, c: it.c, n: 0 }); map.get(k).n += 1; }
  return [...map.values()];
}

/* Données d’un carnet (JSON dans la page) et éléments comptés. */
function dataOf(k) {
  const E = ED.carnets[k.id]; if (!E) throw new Error('Textes absents pour le carnet ' + k.id);
  const fams = k.familles, meta = {}, icons = {}, art = {};
  let items = [];
  for (const f of fams) {
    const F = S.FAM[f]; if (!F) throw new Error('Famille inconnue : ' + f);
    meta[f] = { label: t(F.label), one: t(F.one), many: t(F.many), done: t(F.done), doneP: t(F.doneP), stock: !!F.stock, wish: t(wishLabel(f)), calc: F.calc || null, catalogue: F.catalogue };
    if (f !== 'lieux' && f !== 'calculs') items = items.concat(S.items(f));
  }
  const styles = k.id === 'garde-robe' ? S.styles() : [];
  for (const it of items.concat(styles)) {
    if (it.t && it.t.ico) { if (!SEC.ICONS[it.t.ico]) throw new Error('Pictogramme inconnu : ' + it.t.ico); icons[it.t.ico] = SEC.ICONS[it.t.ico]; }
    if (it.t && it.t.svg === 'armes') { const s = ARMES.schema(it.id, 80); if (s) art[it.id] = s.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, ''); else it.t = { ico: 'viseur' }; }
  }
  if (Object.keys(art).length === 0) for (const it of items) if (it.t && it.t.svg) it.t = { ico: 'viseur' };
  if (items.some(it => it.t && it.t.ico === 'viseur')) icons.viseur = SEC.ICONS.viseur;
  const lieux = k.id === 'lieux' ? S.lieux() : null;
  const counted = k.id === 'lieux' ? lieux.items : items;
  const clean = it => { const o = { f: it.f, id: it.id, n: t(it.n), c: t(it.c || ''), g: it.g || '', u: it.u || '', x: it.x || 'ligne' }; if (it.t) o.t = it.t; if (it.k) o.k = it.k; if (it.sr) o.sr = 1; return o; };
  const data = {
    v: 1, id: k.id, titre: t(k.titre), nature: k.nature, fams, meta, prefix: '../',
    vues: Object.fromEntries(Object.entries(E.vues).map(([a, b]) => [a, t(b)])),
    compteurs: Object.fromEntries(Object.entries(E.compteurs).map(([a, b]) => [a, t(b)])),
    vide: Object.fromEntries(Object.entries(E.vide).map(([a, b]) => [a, b.map(t)])),
    cta: { label: t(E.cta), href: S.FAM[fams[0]].catalogue },
    items: k.id === 'lieux' || k.nature === 'document' ? [] : items.map(clean),
    styles: styles.map(clean),
    icons, art,
    ext: k.id === 'lieux' ? 'lieux' : null
  };
  return { data, counted, lieux };
}

/* Fichier des lieux : noms, catégories et groupes, compacts (2 547 lieux). Chargé par la seule page « Mes lieux repérés ». */
function lieuxFile(L) {
  const cats = {}, groups = [], gi = new Map();
  for (const [key, c] of Object.entries(L.cats)) cats[key] = [c.nom, c.col];
  const rows = L.items.map(it => { let g = -1; if (it.p) { if (!gi.has(it.p)) { gi.set(it.p, groups.length); groups.push(it.p); } g = gi.get(it.p); } return [it.id, it.n, it.g, g, it.x === 'fiche' ? 1 : 0]; });
  return '/* LEONIDAKIT — lieux de la carte pour le carnet « Mes lieux repérés ». Généré par outils/gen-carnets.cjs depuis carte.js et\n   carte-gtadb.js (gtadb.org et ses contributeurs, CC BY 4.0 ; adapté pour Leonidakit) : ne pas modifier à la main.\n   Ligne : [identifiant, nom, catégorie, groupe (-1 sans groupe), 1 si le lieu a une fiche]. */\nwindow.LK_CARNET_LIEUX = ' + jsonScript({ v: 1, cats, groups, rows }) + ';\n';
}

function header(prefix) {
  return `<header>
  <div class="shell head-in">
    <a href="${prefix}index.html" class="brand">Leonida<span>kit</span></a>
    <nav id="nav" aria-label="Navigation principale"></nav>
    <div class="head-search searchwrap">
      <div class="hs-bar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true">
          <circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="21" y2="21"/>
        </svg>
        <input type="search" id="q" placeholder="Chercher" aria-label="Rechercher sur le site" autocomplete="off">
      </div>
      <div class="suggest" id="suggest" role="listbox" aria-label="Suggestions"></div>
    </div>
    <button class="burger" id="burger" aria-label="Ouvrir le menu" aria-expanded="false" aria-controls="nav">
      <span></span><span></span><span></span>
    </button>
  </div>
</header>`;
}
/* Le pied de page est reconstruit par sync-site.cjs (site-shell.cjs) : on reprend l’illustration de la page Progression. */
function footerArt() {
  const prog = fs.readFileSync(path.join(root, 'progression.html'), 'utf8');
  const m = prog.match(/<footer>[\s\S]*?<\/footer>/); if (!m) throw new Error('Pied de page introuvable dans progression.html');
  return m[0];
}
const ICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='12' fill='%231A1A1E'/%3E%3Ccircle cx='32' cy='28' r='16' fill='%23F5A524'/%3E%3Crect x='10' y='30' width='44' height='3' fill='%231A1A1E'/%3E%3Crect x='10' y='37' width='44' height='4' fill='%231A1A1E'/%3E%3Crect x='10' y='45' width='44' height='5' fill='%231A1A1E'/%3E%3C/svg%3E";

/* Nombres publics posés dans les textes : total, catégories, et chaque famille ({armes}, {tenues}…). */
/* Libellé d’un compteur au singulier (0 et 1) : seuls ces mots changent. */
const SING = /^(envies|calculs|plans|goûtés|repérés|posées|obtenus|trouvés|possédés|possédées)$/;
const one = s => String(s).split(' ').map(w => SING.test(w) ? w.slice(0, -1) : w).join(' ');
const lab = s => `<span data-one="${esc(one(s))}" data-many="${esc(s)}">${esc(s)}</span>`;
function fill(s, vars) { return String(s).replace(/\{([a-z-]+)\}/g, (m, k) => vars[k] !== undefined ? vars[k] : m); }

function page(k, footer) {
  const E = ED.carnets[k.id], C = ED.commun, { data, counted } = dataOf(k), prefix = '../';
  const doc = k.nature === 'document';
  const total = counted.length, cats = catsOf(counted);
  const vars = { total: nf(total), cats: cats.length };
  for (const f of k.familles) vars[f] = plural(nf(counted.filter(x => x.f === f).length), S.FAM[f].one, S.FAM[f].many);
  const st = stackOf(k.id, prefix);
  const url = SITE + k.url;
  const crumbs = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Accueil', item: SITE + '/' },
    { '@type': 'ListItem', position: 2, name: 'Progression', item: SITE + '/progression.html' },
    { '@type': 'ListItem', position: 3, name: k.titre, item: url }] };
  const V2 = Object.keys(E.vues);
  const counters = doc
    ? `<p class="cn-counter"><b data-cn-n="calcs">0</b>${lab(E.compteurs.calcs)}</p><p class="cn-counter"><b data-cn-n="plans">0</b>${lab(E.compteurs.plans)}</p>`
    : `<p class="cn-counter cn-counter--main"><b data-cn-n="done">0</b><span>${esc(E.compteurs.done)} sur <span data-cn-n="total">${nf(total)}</span></span></p><p class="cn-counter cn-counter--serie" data-cn-serie hidden>dont <b>0</b> repères de la série (GTA V, GTA Online), pas encore vus dans GTA VI</p>`
      + (E.compteurs.wish ? `<p class="cn-counter"><b data-cn-n="wish">0</b>${lab(E.compteurs.wish)}</p>` : '')
      + `<p class="cn-counter"><b data-cn-n="rest">${nf(total)}</b>${lab(E.compteurs.rest)}</p>`;
  /* v7.69 : la part cochée en anneau (rempli par carnets.js, --p de 0 à 100) à côté des compteurs, au lieu d’une jauge en ligne */
  const meter = doc ? '' : `<div class="cn-ring" data-cn-ring aria-hidden="true" style="--p:0"><svg viewBox="0 0 120 120" focusable="false"><circle class="cn-ring-bg" cx="60" cy="60" r="52"/><circle class="cn-ring-fg" cx="60" cy="60" r="52" pathLength="100"/></svg><span class="cn-ring-pct" data-cn-pct>0 %</span></div>`;
  const tabs = V2.map((v, i) => `<button type="button" role="tab" id="cn-tab-${v}" aria-controls="cn-panel" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}" data-cn-view="${v}"><span class="cn-tab-l">${esc(E.vues[v])}</span> <span class="cn-tab-n" data-cn-tabn="${v}">0</span></button>`).join('');
  const famSelect = k.familles.length > 1 ? `<div class="cn-field"><label for="cn-fam">Famille</label><select id="cn-fam" data-cn-fam><option value="">Toutes</option>${k.familles.map(f => `<option value="${esc(f)}">${esc(S.FAM[f].label)}</option>`).join('')}</select></div>` : '';
  const stockSelect = k.familles.some(f => S.FAM[f].stock) ? `<div class="cn-field"><label for="cn-stock">Stock</label><select id="cn-stock" data-cn-stockf><option value="">Tous</option><option value="a-renseigner">Stock à renseigner</option><option value="en-stock">En stock</option><option value="epuise">Épuisé</option></select></div>` : '';
  const sortOpts = doc ? '<option value="recent">Modifiés récemment</option><option value="nom">Nom, de A à Z</option><option value="outil">Par outil</option>' : '<option value="nom">Nom, de A à Z</option><option value="nom-desc">Nom, de Z à A</option><option value="cat">Par catégorie</option><option value="recent">Ajout le plus récent (envies)</option>';
  const tools = `<div class="cn-tools" data-cn-tools hidden>
   <div class="cn-field cn-field--q"><label for="cn-q">Chercher dans ce carnet</label><input type="search" id="cn-q" data-cn-q maxlength="80" autocomplete="off" placeholder="${doc ? 'Nom du calcul, outil…' : 'Nom, catégorie…'}"></div>
   ${famSelect}<div class="cn-field"><label for="cn-cat">${doc ? 'Outil' : 'Catégorie'}</label><select id="cn-cat" data-cn-cat><option value="">${doc ? 'Tous' : 'Toutes'}</option></select></div>${stockSelect}
   <div class="cn-field"><label for="cn-sort">Trier</label><select id="cn-sort" data-cn-sort>${sortOpts}</select></div>
  </div>`;
  const catChips = doc ? '' : `<ul class="cn-cats" aria-label="Catégories recensées">${cats.map(c => `<li><span>${esc(c.c)}</span> <b>${nf(c.n)}</b></li>`).join('')}</ul>`;
  const about = E.apropos.map(([h, p], i) => `<div class="cn-about-card" style="--i:${i}"><span class="cn-about-n" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span><h3>${esc(h)}</h3><p>${esc(fill(p, vars))}</p></div>`).join('');
  const faq = E.faq.map(([q, a]) => `<details><summary>${esc(q)}</summary><div class="ans"><p>${esc(a)}</p></div></details>`).join('');
  /* v7.69 : chaque autre carnet avec le premier visuel de sa pile */
  const others = M.carnets.filter(o => o.id !== k.id).map(o => { const f = stackOf(o.id, prefix).first; return `<li><a href="${esc(o.url.replace('/carnets/', ''))}"><span class="cn-other-img"><img src="${esc(prefix + f.src.replace(/^\//, ''))}" width="480" height="270" alt="" loading="lazy" decoding="async"></span><span class="cn-other-txt"><span class="cn-other-t">${esc(o.titre)}</span><span class="cn-other-b">${esc(o.bouton)}</span></span></a></li>`; }).join('');
  const scripts = ['search-index.js', 'app.js', 'modele-donnees.js', 'carnets-core.js']
    .concat(k.id === 'proprietes' ? ['acquisitions-data.js', 'progression-core.js'] : [])
    .concat(k.id === 'collectibles' ? ['collectibles-data.js', 'collectibles-core.js'] : [])
    .map(f => `<script src="${prefix}${f}"></script>`)
    .concat(k.id === 'lieux' ? ['<script src="lieux-data.js"></script>'] : [])
    .concat([`<script src="${prefix}carnets.js"></script>`]).join('\n');
  const catalogueHref = prefix + S.FAM[k.familles[0]].catalogue;
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(E.seoTitle)}</title>
<meta name="description" content="${esc(E.seoDesc)}">
<meta property="og:type" content="website">
<meta property="og:locale" content="fr_FR">
<meta name="theme-color" content="#FDFBF7">
<meta name="color-scheme" content="light">
<link rel="canonical" href="${url}">
<link rel="icon" href="${ICON}">
<script type="application/ld+json">${JSON.stringify(crumbs)}</script>
<link rel="stylesheet" href="${prefix}style.css">
<link rel="stylesheet" href="${prefix}carnets.css">
<meta property="og:image" content="${st.og}">
</head>
<body class="cn-page" data-carnet="${esc(k.id)}">

<a class="skip" href="#main">Aller au contenu</a>
<div class="sunset" aria-hidden="true"></div>

${header(prefix)}

<main id="main">
<section class="page-head shell lk-glow cn-head">
  <nav class="crumbs" aria-label="Fil d’Ariane"><a href="${prefix}index.html">Accueil</a> / <a href="${prefix}progression.html">Progression</a> / <span>${esc(k.titre)}</span></nav>
  <div class="lk-head-grid"><div>
    <p class="fiche-cat">${esc(C.kicker)}</p>
    <h1>${esc(k.titre)}</h1>
    <p class="lede">${esc(E.lede)}</p>
    <div class="cn-score">${meter}<div class="cn-counters" data-cn-counters>${counters}</div></div>
    <p class="cn-head-links"><a class="cn-btn cn-btn--main" href="#carnet">${doc ? 'Voir mes enregistrements' : 'Voir mon carnet'}</a><a class="cn-btn" href="${esc(catalogueHref)}">${esc(E.cta)}</a><a class="cn-btn cn-btn--ghost" href="${prefix}progression.html#carnets">Toute ma progression</a></p>
  </div>${st.html}</div>
</section>

<section class="shell cn-app" id="carnet" aria-labelledby="cn-t" data-cn-app>
  <div class="cn-app-head"><h2 class="sec-h" id="cn-t">${esc(E.app)}</h2><p class="cn-local">${esc(C.local)} <a href="${prefix}progression.html#sauvegarde">Sauvegarder mon suivi</a></p></div>
  <noscript><p class="cn-noscript">${esc(C.noscript)} <a href="${esc(catalogueHref)}">${esc(E.cta)}</a>.</p></noscript>
  <p class="cn-loading" data-cn-loading>Lecture de ton carnet sur cet appareil…</p>
  <div class="cn-tabs" role="tablist" aria-label="Vues du carnet" data-cn-tabs hidden>${tabs}</div>
  ${tools}
  <div class="cn-panel" id="cn-panel" role="tabpanel" aria-labelledby="cn-tab-${V2[0]}" tabindex="-1" hidden>
    <div class="cn-bar"><p class="cn-count" data-cn-count aria-live="polite"></p><button type="button" class="cn-link" data-cn-reset hidden>Effacer la recherche et les filtres</button>${doc ? '' : '<a class="cn-link" data-cn-calc hidden href="#">Classer mes envies dans le calculateur</a>'}</div>
    <ul class="cn-grid" data-cn-list></ul>
    <div class="cn-empty" data-cn-empty hidden></div>
    <p class="cn-more-wrap"><button type="button" class="cn-more" data-cn-more hidden>Afficher la suite</button></p>
  </div>
  <section class="cn-orphans" data-cn-orphans hidden aria-labelledby="cn-orph-t"><h3 id="cn-orph-t">Saisies à part</h3><p>${esc(C.orphelins)}</p><ul class="cn-orphan-list" data-cn-orphan-list></ul></section>
  <div class="cn-status" id="cn-status" role="status" aria-live="polite"><span data-cn-status-t></span><button type="button" class="cn-undo" data-cn-undo hidden>Annuler</button></div>
</section>

<section class="shell cn-about" id="a-savoir" aria-labelledby="cn-about-t">
  <h2 class="sec-h" id="cn-about-t">Comment marche ce carnet</h2>
  <div class="cn-about-grid">${about}</div>
  ${catChips}
</section>

<section class="shell cn-faq" id="questions" aria-labelledby="cn-faq-t">
  <h2 class="sec-h" id="cn-faq-t">Questions fréquentes</h2>
  <div class="cn-faq-in"><div class="faq">${faq}</div></div>
</section>

<nav class="shell cn-others" aria-labelledby="cn-others-t">
  <h2 class="sec-h" id="cn-others-t">${esc(C.autres)}</h2>
  <ul class="cn-other-list">${others}</ul>
  <p class="cn-back"><a href="${prefix}progression.html#carnets">← Retour à ma progression</a></p>
</nav>
</main>

${footer}

<script type="application/json" id="lk-carnet-data">${jsonScript(data)}</script>
${scripts}
</body>
</html>
`;
}

/* ---------- bloc « Mes carnets » de progression.html ---------- */
const ANCHORS = { garage: ['garage'], arsenal: ['arsenal', 'equipements', 'munitions'], 'garde-robe': ['tenues', 'coiffures', 'tatouages'], consommables: ['consommables'], personnalisations: ['perso-vehicules', 'perso-armes'], proprietes: ['acquisitions'], lieux: ['lieux'], collectibles: ['collectibles'], calculs: ['calculs'] };
/* Identifiants historiques des anciennes cartes de la page : gardés sur la ligne de chaque famille. */
const LEGACY_ID = { vehicules: 'progress-vehicules', armes: 'progress-armes', lieux: 'progress-lieux', collectibles: 'progress-collectibles' };
const FAM_LINE = { vehicules: 'Véhicules possédés', armes: 'Armes possédées', equipements: 'Équipements obtenus', munitions: 'Types de munitions obtenus', tenues: 'Tenues et accessoires portés', coiffures: 'Coiffures essayées', tatouages: 'Tatouages faits', consommables: 'Consommables goûtés', 'perso-vehicules': 'Modifs de véhicule posées', 'perso-armes': 'Modifs d’arme posées', acquisitions: 'Contenus documentés obtenus', lieux: 'Lieux repérés', collectibles: 'Collectibles trouvés' };
function dashboard() {
  const cards = M.carnets.map(k => {
    const st = STACK[k.id][0], img480 = V.file(st[0], 480), img1280 = V.file(st[0], 1280);
    const href = k.url.replace(/^\//, '');
    if (k.nature === 'document') {
      return `<article class="cn-dcard" id="carnet-${k.id}" data-carnet="${k.id}">${ANCHORS[k.id].map(a => `<span class="lk-anchor" id="${a}"></span>`).join('')}
<a class="cn-dcard-cover" href="${href}" tabindex="-1" aria-hidden="true"><img src="${img480.slice(1)}" srcset="${img480.slice(1)} 480w, ${img1280.slice(1)} 1280w" sizes="(max-width:719px) 94vw, (max-width:1119px) 46vw, 456px" width="480" height="270" alt="" loading="lazy" decoding="async"></a>
<div class="cn-dcard-body"><h3><a href="${href}">${esc(k.titre)}</a></h3>
<ul class="cn-dcard-fams"><li id="progress-calc"><span>Calculs enregistrés</span> <strong class="suivi-n" id="progress-calc-n">Aucun calcul</strong></li><li data-cn-plans><span>Business plans</span> <strong class="suivi-n" data-cn-plans-n>Aucun plan</strong></li></ul>
<p class="cn-dcard-extra" data-cn-extra></p>
<a class="cn-dcard-btn" href="${href}">${esc(k.bouton)} <span aria-hidden="true">→</span></a></div></article>`;
    }
    const lines = k.familles.map(f => {
      const n = f === 'lieux' ? S.lieux().items.length : S.items(f).length;
      const id = LEGACY_ID[f] || 'suivi-' + f;
      return `<li id="${id}" data-family="${f}"><span>${esc(FAM_LINE[f])}</span> <strong class="suivi-n">${f === 'collectibles' && !n ? 'À documenter' : '0 / ' + n}</strong></li>`;
    }).join('');
    const total = k.familles.reduce((a, f) => a + (f === 'lieux' ? S.lieux().items.length : S.items(f).length), 0);
    return `<article class="cn-dcard" id="carnet-${k.id}" data-carnet="${k.id}">${ANCHORS[k.id].map(a => `<span class="lk-anchor" id="${a}"></span>`).join('')}
<a class="cn-dcard-cover" href="${href}" tabindex="-1" aria-hidden="true"><img src="${img480.slice(1)}" srcset="${img480.slice(1)} 480w, ${img1280.slice(1)} 1280w" sizes="(max-width:719px) 94vw, (max-width:1119px) 46vw, 456px" width="480" height="270" alt="" loading="lazy" decoding="async"></a>
<div class="cn-dcard-body"><h3><a href="${href}">${esc(k.titre)}</a></h3>
<p class="cn-dcard-n"><strong data-cn-done>0</strong> / <span data-cn-total>${nf(total)}</span> <span>${esc(ED.carnets[k.id].compteurs.done)}</span></p>
<span class="cn-dcard-bar" aria-hidden="true"><i data-cn-bar style="width:0%"></i></span>
<ul class="cn-dcard-fams">${lines}</ul>
<p class="cn-dcard-extra" data-cn-extra></p>
<a class="cn-dcard-btn" href="${href}">${esc(k.bouton)} <span aria-hidden="true">→</span></a></div></article>`;
  }).join('\n');
  return '<!-- carnets:debut (généré par outils/gen-carnets.cjs : ne pas modifier à la main) -->\n<div class="cn-dash" id="carnets-cartes">\n' + cards + '\n</div>\n<!-- carnets:fin -->';
}

function main() {
  const dir = path.join(root, 'carnets'); fs.mkdirSync(dir, { recursive: true });
  const footer = footerArt();
  const written = [];
  for (const k of M.carnets) {
    if (!/^\/carnets\/[a-z0-9-]+\.html$/.test(k.url)) throw new Error('URL de carnet invalide : ' + k.url);
    const file = path.join(root, k.url.slice(1));
    /* Typographie posée dès l’écriture : la page lue par gen-leo.cjs et par l’index de recherche est déjà celle que
       sync-site.cjs publiera (aucune oscillation d’un passage à l’autre). */
    fs.writeFileSync(file, T.html(page(k, footer))); written.push(k.url.slice(1));
  }
  fs.writeFileSync(path.join(dir, 'lieux-data.js'), lieuxFile(S.lieux()));
  const progFile = path.join(root, 'progression.html');
  let prog = fs.readFileSync(progFile, 'utf8');
  if (!/<!-- carnets:debut[\s\S]*?<!-- carnets:fin -->/.test(prog)) throw new Error('progression.html : marqueurs du bloc « Mes carnets » absents');
  prog = prog.replace(/<!-- carnets:debut[\s\S]*?<!-- carnets:fin -->/, T.html(dashboard()));
  fs.writeFileSync(progFile, prog);
  console.log('Carnets : ' + written.length + ' pages (' + written.join(', ') + '), ' + S.lieux().items.length + ' lieux, bloc « Mes carnets » de progression.html.');
}
if (require.main === module) main();
module.exports = { dataOf, page, dashboard, STACK, main };
