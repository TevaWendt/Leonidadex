#!/usr/bin/env node
'use strict';
/* LEONIDAKIT — gen-pages-elements.cjs (v7.95, lot A du prompt « Une page par élément », 17 octobre 2026)
   Une page par élément, construite depuis les données du site et l’inventaire de outils/couverture-pages.cjs (la seule
   liste : identifiants, adresses cibles, seuil d’indexation). Lot A : les lieux de la carte (lieux-carte/), les régions,
   villes, quartiers et comtés qui les regroupent (quartiers/), les consommables (consommables/) et le sommaire
   lieux-carte/index.html. Lot B (v7.96) : les autres familles, dans outils/gen-pages-elements-b.cjs, qui reçoit d’ici le
   gabarit et les aides (page, fin, prevNext, apercu, write…) et écrit dans le même index.

   Le gabarit allégé : la coquille des fiches (en-tête, menu, fil d’Ariane, typographie, animations lk-reveal de common.js,
   pied de page) mais rien de répété dans chaque page : feuilles partagées (style.css, fiches.css, elements.css), scripts
   partagés, aucun SVG de décor, aperçu de carte posé sur l’image commune img/leonida-carte.svg. 12 à 16 Ko par page.

   Règles : rien d’inventé (chaque phrase vient d’une donnée : nom, catégorie, quartier, comté, statut, équivalent réel,
   position, voisins, sources) ; statut dit sur chaque information ; une page sans assez d’informations est créée en
   noindex,follow (seuil de outils/couverture-pages.cjs) ; aucune adresse existante ne change ; une page n’est réécrite que si
   son contenu change (empreinte dans outils/pages-elements-index.json, qui sert aussi à sync-site.cjs, gen-carnets.cjs et
   catalogues.cjs pour relier la carte, le carnet et les listes à ces pages).

   node outils/gen-pages-elements.cjs            → écrit les pages qui changent, l’index, et dit combien
   node outils/gen-pages-elements.cjs --verifier  → ne réécrit rien, code 1 si une page diffère de ce qui serait écrit
   Ensuite : node outils/sync-site.cjs (menu, barre de langue, empreintes, plan du site). */
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const ROOT = path.resolve(__dirname, '..');
const INV = require('./couverture-pages.cjs');
const SHELL = require('./site-shell.cjs');
const { esc } = require('./sections.cjs');
const VERIFIER = process.argv.includes('--verifier');
const { GTADB, LANDMARKS, CARNET, GTA_BY_ID, LM_BY_ID, CAT, MED } = INV.donnees;
const SITE = 'https://www.leonidakit.com/';
const FAM = id => INV.FAMILLES.find(f => f.id === id);
const nb = n => new Intl.NumberFormat('fr-FR').format(n);
const sha = s => crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);
/* choix déterministe d’une tournure : la même page garde la même phrase d’une régénération à l’autre */
const pick = (id, variants, salt = 0) => variants[(parseInt(crypto.createHash('sha1').update(id + '#' + salt).digest('hex').slice(0, 8), 16)) % variants.length];
const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
const minuscule = s => s ? s.charAt(0).toLowerCase() + s.slice(1) : s; /* « GTA VI » reste en capitales */
/* v7.97 : quand la description dépasse, elle s’arrête sur une fin de phrase (une phrase entière se traduit ; une phrase
   coupée par « … » jamais) ; sans fin de phrase assez loin, coupe sur un mot comme avant */
/* v7.97 : sans fin de phrase assez loin, la phrase de repli de la page (une phrase entière, traduite par la mémoire) remplace
   la coupe au milieu d’un mot ; la coupe ne reste qu’en tout dernier recours */
const court = (s, max = 155, repli = null) => { if (s.length <= max) return s; const head = s.slice(0, max), i = Math.max(head.lastIndexOf('. '), head.lastIndexOf(' ; ')); if (i >= 40) return head.slice(0, i + 1).replace(/ ;$/, '.'); if (repli && repli.length <= max) return repli; return head.slice(0, max - 1).replace(/\s+\S*$/, '') + '…'; };

/* ---------- index des pages (empreintes, adresses) ---------- */
const INDEX_FILE = path.join(ROOT, 'outils/pages-elements-index.json');
const INDEX = fs.existsSync(INDEX_FILE) ? JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8')) : { _note: '', pages: {}, elements: {} };
const NEXT = { _note: 'Généré par outils/gen-pages-elements.cjs (v7.95). pages : empreinte du contenu généré de chaque page (une page n’est réécrite que si elle change) ; elements : identifiant → adresse de la page, lu par sync-site.cjs (carte), gen-carnets.cjs (carnet) et catalogues.cjs (listes).', pages: {}, elements: {} };
const STATS = { ecrites: 0, inchangees: 0, pages: 0 };
/* une page n’est tenue pour « inchangée » que si le fichier est entier (une écriture interrompue laisse un fichier vide ou tronqué) */
function intacte(abs) { try { const st = fs.statSync(abs); if (st.size < 200) return false; const fd = fs.openSync(abs, 'r'); const b = Buffer.alloc(40); fs.readSync(fd, b, 0, 40, st.size - 40); fs.closeSync(fd); return /<\/html>\s*$/.test(b.toString()); } catch { return false; } }
function write(file, html) {
  const h = sha(html), abs = path.join(ROOT, file); NEXT.pages[file] = h; STATS.pages++;
  if (intacte(abs) && INDEX.pages[file] === h) { STATS.inchangees++; return false; }
  if (VERIFIER) { STATS.ecrites++; return true; }
  fs.mkdirSync(path.dirname(abs), { recursive: true }); fs.writeFileSync(abs, html); STATS.ecrites++; return true;
}

/* ---------- coquille commune ---------- */
const ICON = (() => { const m = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').match(/<link rel="icon" href="[^"]*">/); return m ? m[0] : ''; })();
const SEP = '<span class="crumbs-sep" aria-hidden="true"></span>';
const CHEV = '<svg class="lk-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>';
/* titre : « GTA 6 » (ce que tapent les joueurs), « | Leonidakit » retiré au-delà de 65 signes */
function titre(t) { return (t + ' | Leonidakit').length <= 65 ? t + ' | Leonidakit' : t; }
function page(o) {
  const prefix = '../', file = o.file;
  const canonical = SITE + file.replace(/(^|\/)index\.html$/, '$1');
  const crumbsLd = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [['Accueil', SITE], ...o.crumbs].map(([name, item], i) => ({ '@type': 'ListItem', position: i + 1, name, item: /^https?:/.test(item) ? item : SITE + item })) };
  /* données structurées : WebPage (fiche d’un lieu ou d’un consommable, « about » l’élément) ou CollectionPage avec ItemList (page de groupe, sommaire :
     o.liste = [[nom, adresse relative à la racine], …], au plus 120 entrées écrites, le total dans numberOfItems) */
  const thing = o.liste
    ? { '@context': 'https://schema.org', '@type': 'CollectionPage', name: o.nom, description: o.description, url: canonical, mainEntity: { '@type': 'ItemList', numberOfItems: o.liste.length, itemListElement: o.liste.slice(0, 120).map(([name, url], i) => ({ '@type': 'ListItem', position: i + 1, name, url: SITE + url })) } }
    : { '@context': 'https://schema.org', '@type': 'WebPage', name: o.titre.replace(/\bGTA 6\b/g, 'GTA VI'), description: o.description, url: canonical, about: { '@type': 'Thing', name: o.nom }, ...(o.image ? { primaryImageOfPage: { '@type': 'ImageObject', contentUrl: o.image } } : {}) };
  const head = ['<!DOCTYPE html>', '<html lang="fr">', '<head>', '<meta charset="UTF-8">', '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
    '<title>' + esc(o.titre) + '</title>', '<meta name="description" content="' + esc(o.description) + '">',
    /* v7.96 (Téva, 18 octobre, 20 h 09) : toute page par élément est proposée aux moteurs (INDEXER_TOUT de couverture-pages.cjs) */
    '<meta name="robots" content="' + (o.indexable || INV.INDEXER_TOUT ? 'max-image-preview:large' : 'noindex, follow') + '">',
    '<meta property="og:title" content="' + esc(o.titre) + '">', '<meta property="og:description" content="' + esc(o.description) + '">',
    '<meta property="og:type" content="website"><meta property="og:site_name" content="Leonidakit">', '<meta property="og:locale" content="fr_FR">',
    '<meta property="og:image" content="' + esc(o.image || SITE + 'img/social-card.png') + '">', '<meta name="twitter:card" content="summary_large_image">',
    '<meta name="theme-color" content="#FDFBF7">', '<meta name="color-scheme" content="light">',
    '<link rel="canonical" href="' + canonical + '">', ICON, '<link rel="manifest" href="/manifest.webmanifest">', '<link rel="apple-touch-icon" href="/img/app/apple-touch-icon-180.png">',
    '<script type="application/ld+json">' + JSON.stringify(crumbsLd) + '</script>', '<script type="application/ld+json">' + JSON.stringify(thing) + '</script>',
    '<link rel="preload" href="/fonts/archivo-latin.woff2" as="font" type="font/woff2" crossorigin>',
    '<link rel="stylesheet" href="' + prefix + 'style.css">', '<link rel="stylesheet" href="' + prefix + 'fiches.css">', '<link rel="stylesheet" href="' + prefix + 'elements.css">',
    ...(o.css || []).map(c => '<link rel="stylesheet" href="' + prefix + c + '">'), o.body.includes('lk-entry-hub') ? '<link rel="stylesheet" href="' + prefix + 'calculator-entry.css">' : '',
    '<meta property="og:url" content="' + canonical + '">', '</head>'].filter(Boolean).join('\n');
  const crumbs = '<nav class="crumbs" aria-label="Fil d’Ariane"><a href="/">Accueil</a> ' + o.crumbs.map(([name, href]) => SEP + ' <a href="' + esc(href.startsWith('http') ? href : prefix + href) + '">' + esc(name) + '</a>').join(' ') + ' ' + SEP + ' <span aria-current="page">' + esc(o.nom) + '</span></nav>';
  const header = '<header>\n  <div class="shell head-in">\n    <a href="/" class="brand">Leonida<span>kit</span></a>\n    <nav id="nav" aria-label="Navigation principale">' + SHELL.nav(file, prefix) + '</nav>\n'
    + '    <div class="head-search searchwrap">\n      <div class="hs-bar">\n        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>\n        <input type="search" id="q" placeholder="Chercher" aria-label="Rechercher sur le site" autocomplete="off">\n      </div>\n      <div class="suggest" id="suggest" role="listbox" aria-label="Suggestions"></div>\n    </div>\n'
    + '    <button class="burger" id="burger" aria-label="Ouvrir le menu" aria-expanded="false" aria-controls="nav">\n      <span></span><span></span><span></span>\n    </button>\n  </div>\n</header>';
  const scripts = ['<script type="lk/lazy" src="' + prefix + 'search-index.js"></script><script type="lk/lazy" src="' + prefix + 'search-lieux.js"></script>', '<script src="' + prefix + 'assets-manifest.js"></script>', '<script src="' + prefix + 'common.js"></script>', '<script src="' + prefix + 'app.js"></script>', ...(o.scripts || []).map(s => '<script src="' + prefix + s + '"></script>')];
  return head + '\n<body' + (o.bodyAttrs || '') + '>\n<a class="skip" href="#main">Aller au contenu</a>\n<div class="sunset" aria-hidden="true"></div>\n\n' + header + '\n\n<main id="main">\n'
    + '<section class="fhero ' + (o.heroClass || 'fhero--lieu') + '">\n  <div class="fhero-bg" aria-hidden="true"></div>\n  <div class="shell">\n    ' + crumbs + '\n    <div class="fhero-in' + (o.art ? ' fhero-in--art' : '') + '">\n      <div class="fhero-txt">\n        <p class="fiche-cat">' + esc(o.kicker) + '</p>\n        <h1>' + esc(o.nom) + '</h1>\n        <p class="lede">' + o.lede + '</p>\n'
    + (o.tags && o.tags.length ? '        <div class="fiche-tags">' + o.tags.map(([t, live]) => '<span class="chip' + (live ? ' live' : '') + '">' + esc(t) + '</span>').join('') + '</div>\n' : '')
    + (o.liens ? '        <div class="fiche-liens">' + o.liens + '</div>\n' : '') + '      </div>\n' + (o.art ? '      <div class="fhero-art fhero-art--el">' + o.art + '</div>\n' : '') + '    </div>\n  </div>\n</section>\n'
    + o.body + '\n</main>\n' + SHELL.footer('', prefix, file) + '\n\n' + scripts.join('\n') + '\n</body>\n</html>\n';
}
/* bloc de fin commun : signaler, méthode, crédit ; puis l’encart calculateur (même composant que les pages de section) */
function fin(file, extra, entry) {
  return '<section class="shell">\n  <p class="fiche-meth"><a class="fiche-meth-a" href="../contact.html#motif=Erreur%20dans%20une%20fiche&amp;page=' + encodeURIComponent('/' + file) + '">Signaler une erreur sur cette page</a><a class="fiche-meth-a" href="../verification.html">Ce qui est confirmé et comment on le vérifie</a>' + (extra || '') + '</p>\n</section>\n'
    + (entry ? '<section class="shell lk-entry-hub" aria-labelledby="lk-entry-hub-t"><div class="lk-entry-card lk-entry-card--hub"><span class="lk-entry-hub-ico" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="5" y="3" width="14" height="18" rx="2"/><rect x="8" y="6" width="8" height="4"/><path d="M8 14h2M8 17h2M12 14h2M12 17h2M16 14h0M16 17h0"/></svg></span><div class="lk-entry-hub-body"><p class="lk-entry-eyebrow">Le calculateur</p><h2 id="lk-entry-hub-t">' + esc(entry.q) + '</h2><p>' + esc(entry.d) + '</p></div><a class="lk-entry-button" href="../calculateurs.html?' + entry.params + '#atelier">' + esc(entry.cta) + ' <span aria-hidden="true">↗</span></a></div></section>\n' : '');
}
/* navigation précédent et suivant dans une liste ordonnée */
function prevNext(list, i, hrefOf, nomOf) {
  if (list.length < 2) return '';
  const p = list[(i - 1 + list.length) % list.length], n = list[(i + 1) % list.length];
  return '<nav class="fiche-nav shell" aria-label="Navigation entre pages">\n  <a class="fnav prev" href="' + esc(hrefOf(p)) + '">\n    <span class="fnav-lbl">Précédent</span>\n    <span class="fnav-nom">' + esc(nomOf(p)) + '</span>\n  </a>\n  <a class="fnav next" href="' + esc(hrefOf(n)) + '">\n    <span class="fnav-lbl">Suivant</span>\n    <span class="fnav-nom">' + esc(nomOf(n)) + '</span>\n  </a>\n</nav>\n';
}

/* ---------- aperçu de carte : la carte commune recadrée autour d’un point, repères posés par-dessus ---------- */
const MAP_W = 5200, MAP_H = 6000, MAP_SCALE = 0.42; /* 1 unité de carte = 0,42 px : un quartier entier tient dans l’aperçu */
/* échelle : 0,42 au plus ; réduite pour que tous les repères tiennent dans l’aperçu le plus étroit (scène de 350 × 262 px à 390 px :
   110 px du centre au plus, repère compris ; sous 480 px la scène est carrée) ; la carte est un SVG, elle reste nette */
function echellePour(pins, cx, cy) { const spread = Math.max(1, ...pins.map(p => Math.hypot(p.x - cx, p.y - cy))); return Math.max(0.08, Math.min(MAP_SCALE, 110 / spread)); }
function apercu(x, y, pins, label, href, scale = MAP_SCALE) {
  const base = '<img class="lc-map-img" src="../img/leonida-carte.svg" width="' + Math.round(MAP_W * scale) + '" height="' + Math.round(MAP_H * scale) + '" alt="" loading="lazy" decoding="async" style="--mx:' + Math.round(x * scale) + 'px;--my:' + Math.round(y * scale) + 'px">';
  /* le moment de la page : les repères éclosent l’un après l’autre quand l’aperçu entre à l’écran (moteur commun lk-reveal, cascade --i) */
  /* deux repères qui se recouvriraient (cibles de 24 et 28 px) : le second n’est pas posé, son lieu reste dans la liste de la page */
  const poses = []; pins = pins.filter(p => { const px = (p.x - x) * scale, py = (p.y - y) * scale, r = p.ici ? 28 : 24; if (!poses.every(q => Math.hypot(q.px - px, q.py - py) >= Math.max(r, q.r))) return false; poses.push({ px, py, r }); return true; });
  const pts = pins.map((p, i) => '<a class="lc-pin' + (p.ici ? ' lc-pin--ici' : '') + '" href="' + esc(p.href) + '" style="--dx:' + Math.round((p.x - x) * scale) + 'px;--dy:' + Math.round((p.y - y) * scale) + 'px;--i:' + i + '" title="' + esc(p.n) + '"><span class="sr-only">' + esc(p.n) + '</span></a>').join('');
  return '<figure class="lc-map lk-reveal"><div class="lc-map-stage">' + base + pts + '</div><figcaption>' + esc(label) + ' <a href="' + esc(href) + '">Ouvrir la carte interactive</a>.</figcaption></figure>';
}

/* ======================================================================================================================
   1. LIEUX DE LA CARTE
   ====================================================================================================================== */
/* [étiquette, nom commun, pluriel] */
const CATL = { batiment: ['Bâtiment identifié', 'bâtiment', 'bâtiments identifiés'], transport: ['Transport', 'lieu de transport', 'lieux de transport'], nature: ['Nature et relief', 'espace naturel', 'espaces naturels'], lieu: ['Lieu notable', 'lieu notable', 'lieux notables'], planque: ['Planque', 'planque', 'planques'], region: ['Région', 'région', 'régions'], ville: ['Ville', 'ville', 'villes'], quartier: ['Quartier', 'quartier', 'quartiers'], comte: ['Comté', 'comté', 'comtés'] };
/* [article et nom, étiquette, préposition avant le nom propre] */
const GROUPE_KIND = { ville: ['la ville', 'Ville', 'de '], quartier: ['le quartier', 'Quartier', ''], comte: ['le comté', 'Comté', ''], region: ['la région', 'Région', ''], nature: ['la zone naturelle', 'Zone naturelle', 'de '], transport: ['la zone', 'Zone', 'de '], lieu: ['le secteur', 'Secteur', 'de '] };
/* « dans le comté de Kelly » (groupe du site « Comté de Kelly »), « dans Lummox County » (nom anglais gardé tel quel), « dans la ville de Vice City » */
const dans = (c, link) => { if (c === 'comte') return /(^|>)Comté de /.test(link) ? 'le ' + link.replace(/(^|>)Comté de /, '$1comté de ') : link; return GROUPE_KIND[c] ? GROUPE_KIND[c][0] + ' ' + GROUPE_KIND[c][2] + link : link; };
/* « du comté de Kelly », « de la ville de Vice City », « de Lummox County » */
const de = x => /^le /.test(x) ? 'du ' + x.slice(3) : /^la /.test(x) ? 'de la ' + x.slice(3) : 'de ' + x;
/* « ce bâtiment », « cet espace naturel » */
const ce = mot => (mot === 'planque' ? 'cette ' : /^[aeiouyhéèêâîô]/i.test(mot) ? 'cet ' : 'ce ') + mot;
/* un comté dans un titre ou une description : « , comté de Kelly » ; les autres groupes : « à Vice City » */
const comteLabel = nom => nom.replace(/^Comté de /, 'comté de ');
const enTitre = nom => /^Comté de /.test(nom) ? ', ' + comteLabel(nom) : ' à ' + nom;
const etiquette = c => GROUPE_KIND[c] ? GROUPE_KIND[c][1] : 'Groupe';
const ROW_BY_ID = new Map(CARNET.rows.map(r => [r[0], r]));
const LM_CAT = { residentiel: 'résidentiel', commerce: 'commerce', transport: 'transport', industriel: 'industriel', naturel: 'naturel', hotel: 'hôtel', loisir: 'loisir', evenementiel: 'événementiel', infrastructure: 'infrastructure', administration: 'administration', public: 'bâtiment public', monument: 'monument', restaurant: 'restaurant', chantier: 'chantier', bureau: 'bureaux', agriculture: 'agriculture', planque: 'planque', service: 'service', sante: 'santé', 'station-service': 'station-service', 'point-interet': 'point d’intérêt' };
const LM_ST = { non_confirme: 'position non confirmée', demoli: 'signalé démoli', reutilise: 'signalé réutilisé', existence_douteuse: 'existence douteuse', ferme: 'signalé fermé', annule: 'annulé', abandonne: 'signalé abandonné', fictif: 'fictif' };
const STATUT = { officiel: ['Nommé par Rockstar', 'nommé par Rockstar sur son site ou dans son matériel officiel'], vu: ['Aperçu dans un support officiel', 'visible ou nommé dans un trailer, une capture ou une image officielle, sans description publiée par Rockstar'], spec: ['Reconstruction communautaire', 'position ou existence déduite par la communauté, à prendre avec prudence'] };
/* même crédit que carte.html (la clé credit_a_afficher du fichier est sans accents) */
const CREDIT = 'Données : GTA VI Landmarks Data, gtadb.org et ses contributeurs, CC BY 4.0, modifiées pour Leonidakit. Licence : creativecommons.org/licenses/by/4.0';

const LIEUX = FAM('lieux-carte'), GROUPES = FAM('quartiers-comtes');
const pageOfGroup = new Map(GROUPES.items.map(it => [it.id, it.page || it.cible]));
const groupByName = new Map(GROUPES.items.map(it => [it.nom, it]));
const lieuById = new Map(LIEUX.items.map(it => [it.id, it]));
const pageOfLieu = it => it.page || it.cible;
/* « "Mount Waffles" » (guillemets de gtadb) est un surnom donné par la communauté : affiché « Mount Waffles », jamais comme un nom en jeu */
const SURNOM = /^"(.+)"$/;
const affiche = nom => nom.replace(SURNOM, '« $1 »');
/* données d’un lieu : point de la carte (coordonnées, statut, capture, équivalent réel) et repère gtadb (comté, catégories) */
function donneesLieu(it) {
  const g = GTA_BY_ID.get(it.id) || {}, lm = LM_BY_ID.get(it.id.replace(/^g-/, '')) || null;
  const base = it.nom.replace(/\s*\((?:nom réel|nom supposé)\)$/, '').replace(SURNOM, '$1');
  /* le rattachement peut être un groupe (quartiers/) ou un autre lieu qui en regroupe (Dalton Island, Port Vice City : page dans lieux-carte/) */
  const groupe = g.p ? GTA_BY_ID.get(g.p) : null, groupeItem = g.p ? (GROUPES.items.find(x => x.id === g.p) || lieuById.get(g.p) || null) : null;
  const parent = groupe && groupe.p ? GTA_BY_ID.get(groupe.p) : null;
  const comteNom = lm && lm.comte && lm.comte !== 'Leonida' ? lm.comte : (groupe && groupe.c === 'comte' ? groupe.n : parent && parent.c === 'comte' ? parent.n : null);
  /* « Comté de Kelly » (point du site) et « Kelly County » (repère gtadb) désignent le même comté */
  const memeNom = (a, b) => !!a && !!b && a.replace(/^Comté de /, '').replace(/ County$/, '').toLowerCase() === b.replace(/^Comté de /, '').replace(/ County$/, '').toLowerCase();
  const comteItem = comteNom ? (groupByName.get(comteNom) || GROUPES.items.find(x => memeNom(x.nom, comteNom)) || null) : null;
  const comteNomAff = comteItem ? comteItem.nom : comteNom;
  const cat = ROW_BY_ID.get(it.id)[2];
  /* le type relevé par la communauté n’est repris que s’il ajoute quelque chose à la catégorie du site (« Transport (transport) » serait redit) */
  const memeCat = c => CATL[cat] ? CATL[cat].slice(0, 2).some(l => l.toLowerCase() === c.toLowerCase()) : false;
  const cats = lm ? lm.categories.map(c => LM_CAT[c]).filter(c => c && !memeCat(c)) : [], sts = lm ? lm.statuts.map(s => LM_ST[s]).filter(Boolean) : [];
  const kind = /^Bâtiment L\d+$/.test(it.nom) ? 'numerote' : /\(nom réel\)$/.test(it.nom) ? 'reel' : /\(nom supposé\)$/.test(it.nom) ? 'suppose' : SURNOM.test(it.nom) ? 'surnom' : 'nomme';
  const sv = /^-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?$/.test(String(g.sv || '')) ? g.sv : null;
  const comteDistinct = !!(comteNom && !memeNom(comteNom, groupe && groupe.n) && !memeNom(comteNom, parent && parent.n));
  return { g, lm, base, nomAff: kind === 'surnom' ? '« ' + base + ' »' : base, groupe, groupeItem, parent, comteNom, comteNomAff, comteItem, comteDistinct, cats, sts, kind, sv, reel: (lm && lm.reel) || g.r || null, reelCourt: g.r || null, img: g.img || null, imgW: g.imgW, imgH: g.imgH, statut: STATUT[g.s] || STATUT.spec, x: g.x, y: g.y, cat };
}
/* les plus proches : distance sur la carte, direction vraie (le nord est en haut de la carte) */
const DIRS = ['à l’est', 'au sud-est', 'au sud', 'au sud-ouest', 'à l’ouest', 'au nord-ouest', 'au nord', 'au nord-est'];
function direction(dx, dy) { const a = Math.atan2(dy, dx); return DIRS[((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8]; }
const PTS = LIEUX.items.map(it => { const g = GTA_BY_ID.get(it.id); return g && typeof g.x === 'number' ? { it, x: g.x, y: g.y } : null; }).filter(Boolean);
function proches(d, n = 6) {
  if (typeof d.x !== 'number') return [];
  return PTS.filter(p => p.it.id !== d.itId).map(p => ({ p, dist: Math.hypot(p.x - d.x, p.y - d.y) })).sort((a, b) => a.dist - b.dist).slice(0, n)
    .map(({ p, dist }) => ({ it: p.it, x: p.x, y: p.y, dist, dir: direction(p.x - d.x, p.y - d.y), d: donneesLieu(p.it) }));
}
/* lien vers un lieu ou un groupe */
/* deux voisins du même nom (« Tank » × 2) : le numéro du repère les distingue */
const nomDistinct = (it, parmi) => { const twin = parmi && parmi.filter(v => (v.it || v).nom === it.nom).length > 1; if (!twin) return esc(affiche(it.nom)); const rep = 'repère ' + it.id.replace(/^g-/, ''); const m = it.nom.match(/^(.*?)\s*\((nom réel|nom supposé)\)$/); return m ? esc(m[1]) + ' (' + m[2] + ', ' + esc(rep) + ')' : esc(affiche(it.nom)) + ' (' + esc(rep) + ')'; };
const lienLieu = (it, parmi) => '<a href="../' + esc(pageOfLieu(it)) + '">' + nomDistinct(it, parmi) + '</a>';
/* voisin dans une phrase : le nom, puis une seule parenthèse (mention « nom réel », numéro du repère si un autre voisin porte le même nom, direction) */
function lienVoisin(v, parmi) {
  const m = v.it.nom.match(/^(.*?)\s*\((nom réel|nom supposé)\)$/), notes = [];
  if (m) notes.push(m[2]);
  if (parmi.filter(w => w.it.nom === v.it.nom).length > 1) notes.push('repère ' + v.it.id.replace(/^g-/, ''));
  notes.push(v.dir);
  return '<a href="../' + esc(pageOfLieu(v.it)) + '">' + esc(m ? m[1] : affiche(v.it.nom)) + '</a> (' + notes.join(', ') + ')';
}
const lienGroupe = (item, nomSinon) => item ? '<a href="../' + esc(item.page || item.cible) + '">' + esc(affiche(item.nom)) + '</a>' : esc(nomSinon || '');
/* phrase « à Vice Beach, dans le comté de … » */
/* « dans le quartier Ocean Beach, la ville de Vice City », ou « quelque part dans Leonida » */
function ou(d) { const l = lieuxDe(d); return l.length ? 'dans ' + l.join(', ') : 'quelque part dans Leonida'; }
/* « du quartier Ocean Beach », « de la région Ambrosia », « de Leonida » : le premier rattachement seulement */
function ouDe(d) { const l = lieuxDe(d); return l.length ? de(l[0]) : 'de Leonida'; }
function lieuxDe(d) {
  const parts = [];
  if (d.groupeItem) parts.push(dans(d.groupe.c, lienGroupe(d.groupeItem)));
  if (d.parent && d.parent.c !== 'comte') { const pi = GROUPES.items.find(x => x.id === d.parent.id); if (pi) parts.push(dans(d.parent.c, lienGroupe(pi))); }
  if (d.comteDistinct) parts.push(dans('comte', d.comteItem ? lienGroupe(d.comteItem) : esc(d.comteNomAff)));
  return parts;
}
function texteLieu(it, d, voisins, enfants = []) {
  const id = it.id, catL = CATL[d.cat] ? CATL[d.cat][1] : 'lieu', nomPage = d.base;
  const p = [];
  /* 1. ce que c’est et où */
  if (d.kind === 'nomme') p.push(pick(id, [cap(catL) + ' de la carte de GTA VI, ' + esc(nomPage) + ' se trouve ' + ou(d) + '.', esc(nomPage) + ' est un ' + catL + ' de Leonida, placé ' + ou(d) + ' sur la carte du site.', 'Sur la carte de GTA VI, ' + esc(nomPage) + ' est repéré comme ' + catL + ', ' + ou(d) + '.']));
  else if (d.kind === 'reel') p.push(pick(id, [cap(ce(catL)) + ' n’a pas encore de nom connu dans GTA VI : la communauté le désigne par son adresse réelle, ' + esc(nomPage) + '. Il est placé ' + ou(d) + '.', 'Le nom en jeu de ' + ce(catL) + ' n’est pas connu à ce jour ; la carte le note sous son nom réel, ' + esc(nomPage) + ', ' + ou(d) + '.', esc(nomPage) + ' est le nom réel donné par la communauté à ' + ce(catL) + ' ' + ouDe(d) + ', faute de nom en jeu confirmé.']));
  else if (d.kind === 'suppose') p.push(pick(id, ['Le nom « ' + esc(nomPage) + ' » est supposé par la communauté, pas confirmé par Rockstar. ' + cap(ce(catL)) + ' est placé ' + ou(d) + '.', cap(ce(catL)) + ' ' + ouDe(d) + ' n’a pas de nom confirmé : « ' + esc(nomPage) + ' » est une supposition de la communauté.']));
  else if (d.kind === 'surnom') p.push(pick(id, ['« ' + esc(nomPage) + ' » est un surnom donné par la communauté à ' + ce(catL) + ', pas un nom confirmé par Rockstar. Il est placé ' + ou(d) + '.', cap(ce(catL)) + ' ' + ouDe(d) + ' n’a pas de nom en jeu connu : la communauté le surnomme « ' + esc(nomPage) + ' ».']));
  else p.push(pick(id, ['Bâtiment sans nom connu, numéroté ' + esc(nomPage.replace('Bâtiment ', '')) + ' sur la carte du site, ' + ou(d) + '.', 'Ce bâtiment ' + ouDe(d) + ' n’a ni nom en jeu ni équivalent réel connu : le site le numérote ' + esc(nomPage.replace('Bâtiment ', '')) + ' pour qu’on puisse le retrouver.']));
  /* 2. statut */
  p.push(pick(id, ['Statut : ' + minuscule(d.statut[0]) + ' (' + d.statut[1] + ').', cap(d.statut[1]) + ' : c’est le statut « ' + d.statut[0] + ' » de la carte.'], 1));
  if (d.sts.length) p.push('La communauté note aussi : ' + d.sts.join(', ') + '.');
  if (enfants.length) p.push('Il regroupe ' + nb(enfants.length) + ' lieu' + (enfants.length > 1 ? 'x' : '') + ' repéré' + (enfants.length > 1 ? 's' : '') + ' sur la carte, listé' + (enfants.length > 1 ? 's' : '') + ' plus bas.');
  /* 3. catégories et équivalent réel */
  if (d.cats.length) p.push(pick(id, ['Type relevé par la communauté : ' + d.cats.join(', ') + '.', 'Il est classé ' + d.cats.join(' et ') + ' dans les données communautaires.'], 2));
  if (d.reel) p.push(pick(id, ['Lieu réel qui semble l’avoir inspiré (repérage de la communauté) : ' + esc(d.reel) + '.', 'La communauté y voit une version de ' + esc(d.reel) + ', un lieu réel qui semble l’avoir inspiré.'], 3));
  else if (d.kind !== 'numerote') p.push(pick(id, ['Aucun lieu réel n’a été rapproché de cet endroit pour l’instant.', 'Pas d’équivalent réel identifié à ce jour.'], 3));
  /* 4. visuel */
  if (d.img) p.push(pick(id, ['Une capture officielle le montre : elle est reprise ci-dessus, avec son crédit.', 'Il apparaît sur une capture officielle, visible sur cette page.'], 4));
  /* 5. voisins */
  if (voisins.length) { const v = voisins.slice(0, 3).map(v => lienVoisin(v, voisins)); p.push(pick(id, ['Les lieux les plus proches sur la carte : ' + v.join(', ') + '.', 'Tout près, la carte place ' + v.join(', ') + '.', 'Autour de lui : ' + v.join(', ') + '.'], 5)); }
  return p.join(' ');
}
function descriptionLieu(it, d, plus = '') {
  const where = [d.groupe && comteLabel(d.groupe.n), d.comteDistinct ? comteLabel(d.comteNomAff) : null].filter(Boolean).join(', ');
  const ou0 = (d.groupe ? enTitre(d.groupe.n) : '') + (d.comteDistinct ? ', ' + comteLabel(d.comteNomAff) : '');
  const catL = CATL[d.cat] ? CATL[d.cat][1] : 'lieu', nom = d.nomAff + plus;
  const v = [
    nom + ', ' + catL + ' de GTA VI' + ou0 + ' : statut, ' + (d.reel ? 'lieu réel qui l’inspire, ' : '') + 'lieux voisins et position sur la carte de Leonida.',
    nom + ' dans GTA VI (' + catL + (where ? ', ' + where : '') + ') : ce que la communauté a repéré, ' + (d.reel ? 'son équivalent réel, ' : '') + 'ses voisins et sa place sur la carte.',
    'Où est ' + nom + ' sur la carte de GTA VI' + (where ? ' (' + where + ')' : '') + ' : statut du repère, ' + (d.img ? 'capture officielle, ' : '') + 'lieux les plus proches, lien vers la carte interactive.'
  ];
  let s = pick(it.id, v, 6); if (s.length > 155) s = v[0];
  /* v7.97 : un nom long ne fait plus couper la description au milieu d’un mot (« …sur la carte de… », intraduisible) : la phrase
     raccourcit par étapes, chaque forme étant une phrase entière connue de la mémoire de traduction */
  if (s.length > 155) s = s.replace(/ de Leonida\.$/, '.');
  if (s.length > 155) s = s.replace('lieu réel qui l’inspire, ', '');
  if (s.length > 155) s = nom + ', ' + catL + ' de GTA VI : statut, lieux voisins et position sur la carte.';
  return court(s);
}
function titreLieu(it, d, plus = '') {
  const where = d.groupe ? enTitre(d.groupe.n) : d.comteNom ? enTitre(d.comteNomAff) : '';
  let t = 'GTA 6 : ' + d.nomAff + where + plus;
  if (t.length > 65) t = 'GTA 6 : ' + d.nomAff + plus;
  if (t.length > 65) t = t.slice(0, 64 - plus.length).replace(/\s+\S*$/, '') + plus;
  return titre(t);
}
/* deux lieux du même nom au même endroit (« Train Bridge » × 2 sans quartier) : le titre et la description reçoivent ce qui
   les distingue, l’équivalent réel quand il existe, sinon le numéro du repère sur la carte (donnée, jamais inventé) */
function distingue(items) {
  const infos = new Map(items.map(it => { const d = donneesLieu(it); d.itId = it.id; return [it.id, { d, plus: '', titre: titreLieu(it, d), desc: descriptionLieu(it, d) }]; }));
  for (let tour = 0; tour < 3; tour++) {
    const parTitre = new Map(), parDesc = new Map();
    for (const [id, x] of infos) { (parTitre.get(x.titre) || parTitre.set(x.titre, []).get(x.titre)).push(id); (parDesc.get(x.desc) || parDesc.set(x.desc, []).get(x.desc)).push(id); }
    const doublons = new Set([...parTitre.values(), ...parDesc.values()].filter(l => l.length > 1).flat());
    if (!doublons.size) break;
    for (const id of doublons) { const x = infos.get(id), it = items.find(i => i.id === id); x.plus = tour === 0 && x.d.reelCourt && x.d.reelCourt !== x.d.base ? ' (' + x.d.reelCourt + ')' : ' (repère ' + id.replace(/^g-/, '') + ')'; x.titre = titreLieu(it, x.d, x.plus); x.desc = descriptionLieu(it, x.d, x.plus); }
  }
  return infos;
}
function pageLieu(it, i, ordre, info) {
  const d = info.d;
  const voisins = proches(d, 6), file = pageOfLieu(it), catL = CATL[d.cat] || ['Lieu', 'lieu'];
  /* un lieu qui en regroupe d’autres (Dalton Island, Port Vice City, Prison de Hamlet…) les liste comme une page de groupe */
  const enfants = LIEUX.items.filter(l => { const x = GTA_BY_ID.get(l.id); return x && x.p === it.id; }).map(l => ({ it: l, d: donneesLieu(l) }));
  const crumbs = [['Carte', 'carte.html']];
  if (d.comteItem && d.comteDistinct) crumbs.push([d.comteItem.nom, d.comteItem.page || d.comteItem.cible]);
  if (d.parent && d.parent.c !== 'comte') { const pi = GROUPES.items.find(x => x.id === d.parent.id); if (pi) crumbs.push([pi.nom, pi.page || pi.cible]); }
  if (d.groupeItem) crumbs.push([affiche(d.groupeItem.nom), d.groupeItem.page || d.groupeItem.cible]);
  const carteHref = '../carte.html#lieu=' + encodeURIComponent(it.id);
  const pins = [{ x: d.x, y: d.y, n: affiche(it.nom), href: carteHref, ici: true }, ...voisins.map(v => ({ x: v.x, y: v.y, n: affiche(v.it.nom), href: '../' + pageOfLieu(v.it) }))];
  const carte = typeof d.x === 'number' ? apercu(d.x, d.y, pins, 'Aperçu de la carte de Leonida autour de ' + d.nomAff + ' : le repère rouge est ce lieu, les autres sont ses voisins', carteHref, echellePour(pins, d.x, d.y)) : '';
  const art = d.img ? '<figure class="lc-capture"><img src="../' + esc(d.img) + '"' + (d.imgW && d.imgH ? ' width="' + d.imgW + '" height="' + d.imgH + '"' : '') + ' alt="' + esc('Capture officielle de GTA VI : ' + d.base) + '" fetchpriority="high" decoding="async"><figcaption>Capture officielle © Rockstar Games, Take-Two Interactive ; repérée par gtadb.org et ses contributeurs (CC BY 4.0).</figcaption></figure>' : carte;
  const tags = [[d.statut[0], d.g.s !== 'spec'], ...(d.groupe ? [[d.groupe.n, false]] : []), ...(d.comteDistinct ? [[d.comteNomAff, false]] : []), ...(d.img ? [['Capture officielle', false]] : [])];
  /* suivi.js pose le bouton « Marquer comme repéré » dans ce porteur (même clé lk_map_found que la carte et le carnet) */
  const liens = '<span class="lc-track" data-track="lieux" data-track-id="' + esc(it.id) + '" data-track-name="' + esc(it.nom) + '"></span><a href="' + esc(carteHref) + '">Voir sur la carte</a>' + (d.groupeItem ? '<a href="../' + esc(d.groupeItem.page || d.groupeItem.cible) + '">' + ('Tout ' + dans(d.groupe.c, esc(d.groupe.n))).replace(/^Tout la /, 'Toute la ') + '</a>' : '');
  const lede = pick(it.id, [cap(catL[1]) + ' de Leonida repéré sur la carte de GTA VI, ' + ou(d) + '.', esc(d.nomAff) + ' sur la carte de GTA VI : ' + catL[1] + ', ' + minuscule(d.statut[0]) + ', ' + ou(d) + '.'], 7);
  const identite = [['Nom', d.kind === 'reel' ? esc(d.base) + ' <span class="unknown">(nom réel, nom en jeu inconnu)</span>' : d.kind === 'suppose' ? esc(d.base) + ' <span class="unknown">(nom supposé par la communauté)</span>' : d.kind === 'numerote' ? esc(it.nom) + ' <span class="unknown">(numéro du site, nom inconnu)</span>' : d.kind === 'surnom' ? esc(d.nomAff) + ' <span class="unknown">(surnom donné par la communauté, nom en jeu inconnu)</span>' : esc(it.nom)],
    ['Catégorie', '<a href="../carte.html#cat=' + esc(d.cat) + '">' + esc(catL[0]) + '</a>' + (d.cats.length ? ' <span class="unknown">(' + esc(d.cats.join(', ')) + ')</span>' : '')],
    d.groupeItem ? [etiquette(d.groupe.c), lienGroupe(d.groupeItem)] : null,
    d.parent && d.parent.c !== 'comte' && GROUPES.items.find(x => x.id === d.parent.id) ? [etiquette(d.parent.c), lienGroupe(GROUPES.items.find(x => x.id === d.parent.id))] : null,
    d.comteDistinct ? ['Comté', d.comteItem ? lienGroupe(d.comteItem) : esc(d.comteNomAff)] : null,
    ['Statut', esc(d.statut[0]) + (d.sts.length ? ' <span class="unknown">(' + esc(d.sts.join(', ')) + ')</span>' : '')],
    ['Lieu réel qui semble l’avoir inspiré', d.reel ? esc(d.reel) + ' <span class="unknown">(repérage de la communauté)</span>' + (d.sv ? ' <a href="https://www.google.com/maps/search/?api=1&amp;query=' + encodeURIComponent(d.sv) + '" target="_blank" rel="noopener noreferrer">Voir sur Google Maps ↗</a>' : '') : '<span class="unknown">Non identifié</span>'],
    typeof d.x === 'number' ? ['Position sur la carte', 'x ' + d.x + ', y ' + d.y + ' <a href="' + esc(carteHref) + '">(centrer la carte)</a>'] : null,
    ['Source', 'Captures et trailers officiels ; repérage ' + esc(d.g.src === 'SITE' ? 'du site' : 'de gtadb.org et ses contributeurs (CC BY 4.0)')]].filter(Boolean);
  const body = '<section class="shell reveal" id="essentiel">\n  <h2 class="sec-h">L’essentiel</h2>\n  <p class="fiche-txt rise">' + texteLieu(it, d, voisins, enfants) + '</p>\n</section>\n'
    + '<section class="shell fiche-body">\n  <div class="fiche-col reveal">\n    <h2 class="sec-h">Identité</h2>\n    <table class="spec rise">\n      <tbody>\n' + identite.map(([k, v]) => '        <tr><th scope="row">' + esc(k) + '</th><td>' + v + '</td></tr>').join('\n') + '\n      </tbody>\n    </table>\n  </div>\n'
    + '  <div class="fiche-col reveal">\n    <h2 class="sec-h">Sur la carte de Leonida</h2>\n    ' + (d.img ? carte : '<p class="fiche-txt">Aucune capture officielle n’est liée à ce lieu : l’aperçu de la carte ci-dessus tient lieu de visuel.</p>') + '\n    <p class="fiche-txt lc-credit">' + esc(CREDIT) + '</p>\n  </div>\n</section>\n'
    + (enfants.length ? '<section class="shell reveal" id="lieux">\n  <h2 class="sec-h">Les ' + nb(enfants.length) + ' lieux repérés ' + de(dans(d.g.c, esc(d.base))).replace(/^de la zone/, 'dans la zone').replace(/^du secteur/, 'dans le secteur') + ', par catégorie</h2>\n' + listesParCategorie(enfants) + '\n</section>\n' : '')
    + (voisins.length ? '<section class="shell reveal" id="proches">\n  <h2 class="rel-title">Lieux les plus proches sur la carte</h2>\n  <div class="rel-grid rise">' + voisins.map(v => '<a class="rel-card" href="../' + esc(pageOfLieu(v.it)) + '"><span class="rel-txt"><span class="rel-marque">' + esc((CATL[v.d.cat] || ['Lieu'])[0]) + ', ' + esc(v.dir) + '</span><span class="rel-nom">' + nomDistinct(v.it, voisins) + '</span></span></a>').join('') + '</div>\n</section>\n' : '')
    + fin(file, '<a class="fiche-meth-a" href="../medias.html">Provenance et crédits</a>', { q: 'Combien de temps de jeu pour t’installer par ici ?', d: 'Une maison, un commerce, un garage : écris le prix que tu imagines, ton argent et ce que tu gagnes par partie, le calculateur te dit le temps qu’il faut.', params: 'tool=purchase&amp;type=place&amp;from=lieux-carte', cta: 'Faire le calcul' })
    + prevNext(ordre, i, x => path.basename(pageOfLieu(x)), x => affiche(x.nom));
  return page({ file, nom: affiche(it.nom), titre: info.titre, description: info.desc, indexable: !!it.indexable /* v7.96 (Téva, 18 octobre, 19 h 26) : seuil du prompt (deux informations réelles), plus le choix prudent de la v7.95 (nom en jeu confirmé) */, image: d.img ? SITE + d.img : null, kicker: catL[0] + (d.groupe ? ', ' + d.groupe.n : ''), lede, tags, liens, art, body, crumbs, scripts: ['suivi.js'] });
}

/* ======================================================================================================================
   2. RÉGIONS, VILLES, QUARTIERS ET COMTÉS (pages de regroupement)
   ====================================================================================================================== */
/* les lieux d’un groupe, par catégorie (liste .lc-list) ; deux lieux du même nom sont distingués par leur numéro de repère */
function listesParCategorie(membres) {
  const parCat = new Map(); for (const m of membres) { const k = m.d.cat; if (!parCat.has(k)) parCat.set(k, []); parCat.get(k).push(m); }
  const ordreCat = ['lieu', 'transport', 'nature', 'batiment', 'planque'];
  return ordreCat.filter(c => parCat.has(c)).map(c => '  <h3 class="ed-h3">' + esc(parCat.get(c).length > 1 ? cap(CATL[c][2]) : CATL[c][0]) + ' (' + parCat.get(c).length + ')</h3>\n  <ul class="lc-list rise">' + parCat.get(c).sort((a, b) => a.it.nom.localeCompare(b.it.nom, 'fr')).map(m => '<li><a href="../' + esc(pageOfLieu(m.it)) + '">' + nomDistinct(m.it, parCat.get(c)) + '</a><small>' + esc(m.d.statut[0]) + (m.d.reelCourt && m.d.reelCourt !== m.d.base ? ', ' + esc(m.d.reelCourt) : '') + '</small></li>').join('') + '</ul>').join('\n');
}
function pageGroupe(it, i, ordre) {
  const g = GTA_BY_ID.get(it.id) || {}, file = it.cible, kind = CATL[g.c] || ['Groupe', 'groupe'];
  const membres = LIEUX.items.filter(l => { const x = GTA_BY_ID.get(l.id); return x && x.p === it.id; }).map(l => ({ it: l, d: donneesLieu(l) }));
  const sousGroupes = GROUPES.items.filter(x => { const y = GTA_BY_ID.get(x.id); return y && y.p === it.id; });
  const parent = g.p ? GROUPES.items.find(x => x.id === g.p) : null;
  const nbCap = membres.filter(m => m.d.img).length, nbNom = membres.filter(m => m.d.kind === 'nomme').length;
  const carteHref = '../carte.html#lieu=' + encodeURIComponent(it.id);
  const lede = membres.length ? cap(kind[1]) + ' de Leonida : ' + nb(membres.length) + ' lieu' + (membres.length > 1 ? 'x' : '') + ' repéré' + (membres.length > 1 ? 's' : '') + ' sur la carte de GTA VI, ' + (nbNom ? nbNom + ' avec un nom en jeu connu' : 'aucun nom en jeu confirmé pour l’instant') + (nbCap ? ', ' + nbCap + ' avec une capture officielle' : '') + '.' : cap(kind[1]) + ' de Leonida sur la carte de GTA VI ; aucun lieu n’y est encore rattaché dans les données du site.';
  /* la description de la carte finit par « Regroupe N bâtiments repérés. » : le compte vivant est dans l’en-tête, la phrase est retirée */
  const texte = [g.d ? esc(g.d.replace(/\s*Regroupe \d+ (?:bâtiments?|lieux?) repérés?\.\s*$/, '')) : '', parent ? (kind[1] === 'ville' || kind[1] === 'région' ? 'Cette ' + kind[1] : cap(ce(kind[1]))) + ' fait partie ' + de(dans(GTA_BY_ID.get(g.p).c, lienGroupe(parent))) + '.' : '', sousGroupes.length ? 'Il contient aussi ' + sousGroupes.map(s => lienGroupe(s)).join(', ') + '.' : '', membres.length ? 'Chaque lieu ci-dessous a sa page : nom, statut, lieu réel qui semble l’avoir inspiré, voisins et position.' : 'Quand la carte du site recevra des lieux rattachés, ils apparaîtront ici à la régénération suivante.'].filter(Boolean).join(' ');
  const pins = membres.filter(m => typeof m.d.x === 'number').slice(0, 60).map(m => ({ x: m.d.x, y: m.d.y, n: affiche(m.it.nom), href: '../' + pageOfLieu(m.it) }));
  const cx = typeof g.x === 'number' ? g.x : (pins.length ? pins.reduce((a, p) => a + p.x, 0) / pins.length : null), cy = typeof g.y === 'number' ? g.y : (pins.length ? pins.reduce((a, p) => a + p.y, 0) / pins.length : null);
  const carte = cx !== null ? apercu(cx, cy, [{ x: cx, y: cy, n: it.nom, href: carteHref, ici: true }, ...pins], 'Aperçu de la carte de Leonida autour de ' + it.nom + (pins.length ? ' et de ses lieux repérés' : ''), carteHref, echellePour(pins, cx, cy)) : '';
  const listes = listesParCategorie(membres);
  const body = '<section class="shell reveal" id="essentiel">\n  <h2 class="sec-h">L’essentiel</h2>\n  <p class="fiche-txt rise">' + texte + '</p>\n</section>\n'
    + (membres.length ? '<section class="shell reveal" id="lieux">\n  <h2 class="sec-h">Les lieux repérés, par catégorie</h2>\n' + listes + '\n</section>\n' : '')
    + (sousGroupes.length ? '<section class="shell reveal" id="sous-groupes">\n  <h2 class="rel-title">Ce qu’il contient</h2>\n  <div class="rel-grid rise">' + sousGroupes.map(s => '<a class="rel-card" href="../' + esc(s.page || s.cible) + '"><span class="rel-txt"><span class="rel-marque">' + esc((CATL[(GTA_BY_ID.get(s.id) || {}).c] || ['Groupe'])[0]) + '</span><span class="rel-nom">' + esc(s.nom) + '</span></span></a>').join('') + '</div>\n</section>\n' : '')
    + fin(file, '<a class="fiche-meth-a" href="index.html">Tous les quartiers, villes et comtés</a>', { q: 'Combien de temps de jeu pour t’installer dans ' + (GROUPE_KIND[g.c] ? GROUPE_KIND[g.c][0].replace(/^le /, 'ce ').replace(/^la /, 'cette ') : 'ce coin de Leonida') + ' ?', d: 'Une maison, un commerce, un garage : écris le prix que tu imagines, ton argent et ce que tu gagnes par partie, le calculateur te dit le temps qu’il faut.', params: 'tool=purchase&amp;type=place&amp;from=quartiers', cta: 'Faire le calcul' })
    + prevNext(ordre, i, x => path.basename(x.page || x.cible), x => x.nom);
  const crumbs = [['Carte', 'carte.html'], ['Quartiers, villes et comtés', 'quartiers/index.html'], ...(parent ? [[parent.nom, parent.page || parent.cible]] : [])];
  const where = parent ? ' (' + parent.nom + ')' : '';
  return page({ file, nom: it.nom, titre: titre('GTA 6 : ' + it.nom + ', ' + kind[1] + ' de Leonida'), description: (membres.length ? nb(membres.length) + ' lieu' + (membres.length > 1 ? 'x' : '') + ' repéré' + (membres.length > 1 ? 's' : '') + ' à ' + it.nom + where + ' sur la carte de GTA VI : chaque lieu a sa page, avec son statut, son équivalent réel et ses voisins.' : it.nom + where + ' sur la carte de GTA VI : ' + kind[1] + ' de Leonida, sans lieu rattaché pour l’instant dans les données du site.').slice(0, 155), indexable: !!it.indexable, kicker: kind[0] + (parent ? ', ' + parent.nom : ''), lede, tags: [[nb(membres.length) + ' lieu' + (membres.length > 1 ? 'x' : ''), membres.length > 0], ...(nbCap ? [[nbCap + ' capture' + (nbCap > 1 ? 's' : '') + ' officielle' + (nbCap > 1 ? 's' : ''), false]] : [])], liens: '<a href="' + esc(carteHref) + '">Voir sur la carte</a>', art: carte, body, crumbs, heroClass: 'fhero--quartier', liste: [...sousGroupes.map(s => [affiche(s.nom), s.page || s.cible]), ...membres.map(m => [affiche(m.it.nom), pageOfLieu(m.it)])] });
}
/* sommaire des groupes : quartiers/index.html */
function pageSommaireGroupes() {
  const file = 'quartiers/index.html';
  const kinds = [['comte', 'Comtés'], ['ville', 'Villes'], ['quartier', 'Quartiers'], ['region', 'Régions'], ['nature', 'Zones naturelles'], ['transport', 'Zones de transport'], ['lieu', 'Lieux']];
  const compte = new Map(); for (const l of LIEUX.items) { const x = GTA_BY_ID.get(l.id); if (x && x.p) compte.set(x.p, (compte.get(x.p) || 0) + 1); }
  const blocs = kinds.map(([c, label]) => { const items = GROUPES.items.filter(it => (GTA_BY_ID.get(it.id) || {}).c === c).sort((a, b) => (compte.get(b.id) || 0) - (compte.get(a.id) || 0) || a.nom.localeCompare(b.nom, 'fr')); return items.length ? '  <h2 class="sec-h">' + esc(label) + ' (' + items.length + ')</h2>\n  <div class="rel-grid rise">' + items.map(it => '<a class="rel-card" href="../' + esc(it.page || it.cible) + '"><span class="rel-txt"><span class="rel-marque">' + (compte.get(it.id) ? nb(compte.get(it.id)) + ' lieu' + (compte.get(it.id) > 1 ? 'x' : '') : 'aucun lieu rattaché') + '</span><span class="rel-nom">' + esc(it.nom) + '</span></span></a>').join('') + '</div>' : ''; }).filter(Boolean).join('\n');
  const total = LIEUX.items.length;
  const body = '<section class="shell reveal" id="essentiel">\n  <h2 class="sec-h">L’essentiel</h2>\n  <p class="fiche-txt rise">La carte de Leonida compte ' + nb(total) + ' lieux repérés, rattachés à ' + GROUPES.items.length + ' régions, villes, quartiers et comtés. Chaque groupe liste ses lieux par catégorie, chaque lieu a sa page. Les six régions officielles gardent leur dossier dans <a href="../lieux.html">Lieux</a>.</p>\n</section>\n<section class="shell reveal" id="groupes">\n' + blocs + '\n</section>\n' + fin(file, '<a class="fiche-meth-a" href="../lieux-carte/index.html">Tous les lieux de la carte</a>', null);
  return page({ file, nom: 'Quartiers, villes et comtés de Leonida', titre: titre('GTA 6 : quartiers, villes et comtés de Leonida'), description: 'Les ' + GROUPES.items.length + ' régions, villes, quartiers et comtés de la carte de GTA VI, avec le nombre de lieux repérés dans chacun et une page par lieu.', indexable: true, kicker: 'Carte de Leonida', lede: 'Tous les groupes de la carte, avec le nombre de lieux repérés dans chacun.', tags: [[GROUPES.items.length + ' groupes', true], [nb(total) + ' lieux', false]], liens: '<a href="../carte.html">Ouvrir la carte</a>', art: '', body, crumbs: [['Carte', 'carte.html']], heroClass: 'fhero--quartier', liste: GROUPES.items.map(it => [affiche(it.nom), it.page || it.cible]) });
}
/* sommaire des lieux : lieux-carte/index.html (une entrée par catégorie, puis par groupe ; la liste complète est sur chaque page de groupe) */
function pageSommaireLieux() {
  const file = 'lieux-carte/index.html';
  const parCat = new Map(); for (const l of LIEUX.items) { const c = CARNET.rows.find(r => r[0] === l.id)[2]; if (!parCat.has(c)) parCat.set(c, 0); parCat.set(c, parCat.get(c) + 1); }
  const nommes = LIEUX.items.filter(l => !/\((?:nom réel|nom supposé)\)$|^Bâtiment L\d+$|^".+"$/.test(l.nom)).length, captures = LIEUX.items.filter(l => (GTA_BY_ID.get(l.id) || {}).img).length, indexes = LIEUX.items.filter(l => l.indexable).length;
  const compte = new Map(); for (const l of LIEUX.items) { const x = GTA_BY_ID.get(l.id); if (x && x.p) compte.set(x.p, (compte.get(x.p) || 0) + 1); }
  const groupes = GROUPES.items.filter(it => compte.get(it.id)).sort((a, b) => compte.get(b.id) - compte.get(a.id));
  const notables = LIEUX.items.filter(l => CARNET.rows.find(r => r[0] === l.id)[2] === 'lieu').sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
  const body = '<section class="shell reveal" id="essentiel">\n  <h2 class="sec-h">L’essentiel</h2>\n  <p class="fiche-txt rise">' + nb(LIEUX.items.length) + ' lieux sont repérés sur la carte de Leonida : ' + [...parCat].map(([c, n]) => nb(n) + ' ' + (CATL[c] ? (n > 1 ? CATL[c][2] : CATL[c][1]) : c)).join(', ') + '. ' + nb(nommes) + ' ont un nom en jeu connu, ' + nb(captures) + ' une capture officielle. Chacun a sa page, reliée à son quartier, à sa ville ou à son comté et à ses voisins' + (indexes === LIEUX.items.length ? ', proposée aux moteurs de recherche.' : ' ; les ' + nb(indexes) + ' pages qui réunissent au moins deux informations réelles (quartier ou comté, position, équivalent réel, capture) sont proposées aux moteurs de recherche ; les autres (bâtiments numérotés, noms incertains) existent et attendent d’en savoir plus.') + '</p>\n</section>\n'
    + '<section class="shell reveal" id="groupes">\n  <h2 class="sec-h">Par quartier, ville ou comté</h2>\n  <div class="rel-grid rise">' + groupes.map(it => '<a class="rel-card" href="../' + esc(it.page || it.cible) + '"><span class="rel-txt"><span class="rel-marque">' + nb(compte.get(it.id)) + ' lieu' + (compte.get(it.id) > 1 ? 'x' : '') + '</span><span class="rel-nom">' + esc(it.nom) + '</span></span></a>').join('') + '</div>\n  <p class="fiche-txt"><a href="../quartiers/index.html">Tous les quartiers, villes et comtés</a>, y compris ceux sans lieu rattaché.</p>\n</section>\n'
    + '<section class="shell reveal" id="notables">\n  <h2 class="sec-h">Les lieux notables (' + notables.length + ')</h2>\n  <ul class="lc-list rise">' + notables.map(l => { const d = donneesLieu(l); return '<li><a href="../' + esc(pageOfLieu(l)) + '">' + nomDistinct(l, notables) + '</a><small>' + esc(d.groupe ? d.groupe.n : d.comteNom || 'Leonida') + '</small></li>'; }).join('') + '</ul>\n</section>\n'
    + fin(file, '<a class="fiche-meth-a" href="../carte.html">La carte interactive</a>', null);
  return page({ file, nom: 'Tous les lieux de la carte de Leonida', titre: titre('GTA 6 : tous les lieux de la carte de Leonida'), description: nb(LIEUX.items.length) + ' lieux repérés sur la carte de GTA VI, une page chacun : bâtiments, transports, nature et lieux notables, classés par quartier, ville et comté.', indexable: true, kicker: 'Carte de Leonida', lede: 'Une page par lieu repéré sur la carte : son statut, son équivalent réel, ses voisins, sa position.', tags: [[nb(LIEUX.items.length) + ' lieux', true], [nb(captures) + ' captures officielles', false]], liens: '<a href="../carte.html">Ouvrir la carte</a><a href="../carnets/lieux.html">Mes lieux repérés</a>', art: '', body, crumbs: [['Carte', 'carte.html']], liste: [...groupes.map(it => [affiche(it.nom), it.page || it.cible]), ...notables.map(l => [affiche(l.nom), pageOfLieu(l)])] });
}

/* ======================================================================================================================
   3. CONSOMMABLES
   ====================================================================================================================== */
const CONSO = FAM('consommables'), CONSO_DATA = CAT.consommables, CONSO_CATS = new Map(CONSO_DATA.categories.map(c => [c.id, c]));
const SOURCES = JSON.parse(fs.readFileSync(path.join(ROOT, 'outils/catalogues/sources.json'), 'utf8')).sources;
const PERSON = { jason: ['Jason', 'personnages/jason.html'], lucia: ['Lucia', 'personnages/lucia.html'], 'jason-lucia': ['Jason et Lucia', null] };
const ST_CONSO = { officiel: ['Nommé ou décrit par Rockstar pour GTA VI', true], vu: ['Vu dans un trailer ou une capture officielle', true], serie: ['Repère de la série : vu dans un autre jeu, pas encore dans GTA VI', false], conf: ['À confirmer', false] };
const UNITS = { graisse: ' % de graisse', sante: ' % de vie', armure: ' % d’armure', capacite: ' % de capacité', pourcent: ' %', duree: ' min' };
const money = n => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(n).replace(/[  ]/g, ' ') + ' $';
function repere(p) { if (!p) return null; if (p.min !== undefined) return p.jeu + ' : de ' + money(p.min) + ' à ' + money(p.max); if (p.valeur === null || p.valeur === undefined) return p.jeu + ' : prix non relevé'; if (p.valeur === 0) return p.jeu + ' : gratuit'; return p.jeu + ' : ' + money(p.valeur); }
/* « Rob Nelson : une beuverie… » (texte sourcé qui commence par qui le dit) devient « Effet (Rob Nelson) : une beuverie… », sans deux fois deux-points */
const effetPhrase = t => { const vis = t.match(/^Visuel : (.+)$/); if (vis) return 'Effet visuel : ' + esc(vis[1]); const m = t.match(/^(Rockstar|GTA (?:V|IV|Online)|[A-Z][a-zé]+ [A-Z][a-zé]+) : (.+)$/); const ar = t.match(/^Armure : (.+)$/); return ar ? 'Effet : armure à ' + esc(ar[1]) : !m ? 'Effet : ' + esc(/^(GTA|Rockstar)/.test(t) ? t : t.charAt(0).toLowerCase() + t.slice(1)) : /^GTA/.test(m[1]) ? 'Effet dans ' + esc(m[1]) + ' : ' + esc(m[2]) : 'Effet, d’après ' + esc(m[1]) + ' : ' + esc(m[2]); };
/* « Bar (Effluvia) » + note → une seule parenthèse */
const typeNote = (t, grise) => { const u = x => '<span class="unknown">' + esc(x) + '</span>'; if (!t.note) return esc(t.type); const m = t.type.match(/^(.*)\(([^()]*)\)$/); if (m) return esc(m[1]) + (grise ? u('(' + m[2] + ', ' + t.note + ')') : '(' + esc(m[2] + ', ' + t.note) + ')'); return esc(t.type) + ' ' + (grise ? u('(' + t.note + ')') : '(' + esc(t.note) + ')'); };
function pageConsommable(it, i, ordre) {
  const c = CONSO_DATA.items.find(x => x.id === it.id), cat = CONSO_CATS.get(c.categorie), file = it.cible, st = ST_CONSO[c.statut] || ST_CONSO.conf;
  const media = c.media ? MED[c.media] : null, v480 = media ? media.variants.find(x => x.w === 480) || media.variants[0] : null, v1280 = media ? media.variants.find(x => x.w === 1280) : null;
  const lieux = c.ou_le_trouver.filter(o => o.lieu && lieuById.has(o.lieu)).map(o => lieuById.get(o.lieu)), types = c.ou_le_trouver.filter(o => o.type);
  /* deux lieux du même nom (deux stations Xero) : le quartier ou le comté les distingue, comme dans la liste des consommables */
  const nomLieu = l => { const twin = lieux.filter(x => x.nom === l.nom).length > 1; const d = twin ? donneesLieu(l) : null; return esc(affiche(l.nom)) + (twin && (d.groupe || d.comteNom) ? ' (' + esc(d.groupe ? d.groupe.n : d.comteNom) + ')' : ''); };
  const lienLieuC = l => '<a href="../' + esc(pageOfLieu(l)) + '">' + nomLieu(l) + '</a>';
  const qui = c.personnage ? PERSON[c.personnage] : null;
  const srcs = c.sources.map(id => SOURCES[id]).filter(Boolean);
  const prixVI = c.prix_gta6 && typeof c.prix_gta6.valeur === 'number' ? money(c.prix_gta6.valeur) + (c.prix_gta6.statut === 'officiel' ? ' (prix publié)' : '') : (c.prix_gta6 && c.prix_gta6.statut === 'na' ? 'Ne s’achète pas' : 'À venir : aucun prix publié pour GTA VI');
  const texte = [esc(c.description), 'Statut : ' + (st[0].includes(' : ') ? minuscule(st[0]).replace(' : ', ' (') + ')' : minuscule(st[0])) + '.', c.effet && c.effet.texte ? effetPhrase(c.effet.texte) + (c.effet.valeur !== null && c.effet.valeur !== undefined && !c.effet.texte.includes(String(c.effet.valeur)) ? ' (' + esc(String(c.effet.valeur)) + (UNITS[c.effet.unite] || '') + (c.effet.jeu ? ', ' + esc(c.effet.jeu) : '') + ')' : c.effet.jeu && !c.effet.texte.includes(c.effet.jeu) ? ' (' + esc(c.effet.jeu) + ')' : '') + '.' : '',
    c.prix_repere_serie ? 'Repère de la série, ' + esc(repere(c.prix_repere_serie)) + (c.prix_repere_serie.note ? ' (' + esc(c.prix_repere_serie.note) + ')' : '') + ' ; ce n’est pas un prix de GTA VI.' : 'Aucun prix de la série n’est relevé pour cet objet.',
    lieux.length || types.length ? 'Où le trouver : ' + [...types.map(t => typeNote(t)), ...lieux.map(l => lienLieuC(l))].join(', ') + '.' : '',
    c.variantes && c.variantes.length ? 'Variantes : ' + esc(c.variantes.join(', ')) + '.' : '', qui ? 'Personnage lié : ' + (qui[1] ? '<a href="../' + qui[1] + '">' + esc(qui[0]) + '</a>' : esc(qui[0])) + '.' : '', c.notes ? esc(c.notes) : ''].filter(Boolean).join(' ');
  const identite = [['Catégorie', '<a href="../nourriture.html#liste-consommables">' + esc(cat.label) + '</a>'], ['Statut', esc(st[0])], ['Effet', c.effet && c.effet.texte ? esc(c.effet.texte) + (c.effet.valeur !== null && c.effet.valeur !== undefined && !c.effet.texte.includes(String(c.effet.valeur)) ? ' <b>' + esc(String(c.effet.valeur)) + esc(UNITS[c.effet.unite] || '') + '</b>' : '') + (c.effet.jeu && !c.effet.texte.includes(c.effet.jeu) ? ' <span class="unknown">(' + esc(c.effet.jeu) + ')</span>' : '') : '<span class="unknown">Non publié</span>'],
    ['Prix dans GTA VI', esc(prixVI)], ['Repère de la série', c.prix_repere_serie ? esc(repere(c.prix_repere_serie)) + (c.prix_repere_serie.note ? ' <span class="unknown">(' + esc(c.prix_repere_serie.note) + ')</span>' : '') : '<span class="unknown">Pas de repère</span>'],
    ['Où le trouver', lieux.length || types.length ? [...types.map(t => typeNote(t, true)), ...lieux.map(l => lienLieuC(l))].join(', ') : '<span class="unknown">Emplacement à venir</span>'],
    c.variantes && c.variantes.length ? ['Variantes', esc(c.variantes.join(', '))] : null, qui ? ['Pour qui', qui[1] ? '<a href="../' + qui[1] + '">' + esc(qui[0]) + '</a>' : esc(qui[0])] : null,
    ['Sources', srcs.length ? srcs.map(s => '<a href="' + esc(s.url) + '" target="_blank" rel="noopener noreferrer">' + esc(s.title) + '</a>' + (s.consultedAt ? ' <span class="unknown">(consulté le ' + esc(s.consultedAt.split('-').reverse().join('/')) + ')</span>' : '')).join('<br>') : '<span class="unknown">Aucune source relevée</span>']].filter(Boolean);
  const art = media ? '<figure class="lc-capture"><img src="' + esc(v480.src.replace(/^\//, '../')) + '"' + (v1280 ? ' srcset="' + esc(v480.src.replace(/^\//, '../')) + ' 480w, ' + esc(v1280.src.replace(/^\//, '../')) + ' 1280w" sizes="(max-width: 800px) 100vw, 440px"' : '') + ' width="' + v480.w + '" height="' + v480.h + '" alt="' + esc('Visuel officiel de GTA VI : ' + (media.titre || c.nom)) + '" fetchpriority="high" decoding="async"><figcaption>Visuel officiel ' + esc(media.credit || '© Rockstar Games, Take-Two Interactive') + '. <a href="../visuels/' + esc(INV.slug(c.media)) + '.html">' + esc(media.titre || c.media) + '</a>, <a href="../medias.html#media-' + esc(c.media) + '">crédits</a>.</figcaption></figure>' : '';
  const freres = ordre.filter(x => x.id !== it.id && CONSO_DATA.items.find(y => y.id === x.id).categorie === c.categorie).slice(0, 8);
  const lieuxCarte = lieux.filter(l => typeof (GTA_BY_ID.get(l.id) || {}).x === 'number');
  const carte = lieuxCarte.length ? (() => { const d0 = GTA_BY_ID.get(lieuxCarte[0].id); const cx = lieuxCarte.reduce((a, l) => a + GTA_BY_ID.get(l.id).x, 0) / lieuxCarte.length, cy = lieuxCarte.reduce((a, l) => a + GTA_BY_ID.get(l.id).y, 0) / lieuxCarte.length; const spread = Math.max(...lieuxCarte.map(l => Math.hypot(GTA_BY_ID.get(l.id).x - cx, GTA_BY_ID.get(l.id).y - cy))); const href = '../carte.html#pins=' + lieuxCarte.map(l => encodeURIComponent(l.id)).join(',') + '&amp;t=' + encodeURIComponent(c.nom); const pinsC = lieuxCarte.map(l => ({ x: GTA_BY_ID.get(l.id).x, y: GTA_BY_ID.get(l.id).y, n: affiche(l.nom), href: '../' + pageOfLieu(l), ici: true })); return (spread < 1400 ? apercu(cx, cy, pinsC, 'Aperçu de la carte de Leonida : lieux où ' + c.nom + ' a été vu', href, echellePour(pinsC, cx, cy)) : '') + '<p class="fiche-txt"><a href="' + href + '">Voir ces lieux sur la carte</a> : ' + lieuxCarte.map(l => lienLieuC(l)).join(', ') + '.</p>'; })() : '';
  const body = '<section class="shell reveal" id="essentiel">\n  <h2 class="sec-h">L’essentiel</h2>\n  <p class="fiche-txt rise">' + texte + '</p>\n</section>\n'
    + '<section class="shell fiche-body">\n  <div class="fiche-col reveal">\n    <h2 class="sec-h">Identité</h2>\n    <table class="spec rise">\n      <tbody>\n' + identite.map(([k, v]) => '        <tr><th scope="row">' + esc(k) + '</th><td>' + v + '</td></tr>').join('\n') + '\n      </tbody>\n    </table>\n  </div>\n'
    + '  <div class="fiche-col reveal">\n    <h2 class="sec-h">' + (lieuxCarte.length ? 'Sur la carte de Leonida' : 'Ce qui arrive avec le jeu') + '</h2>\n    ' + (carte || '<p class="fiche-txt">Prix dans GTA VI, effet chiffré et lieux de vente : ces cases se remplissent avec le jeu, à partir du 19 novembre 2026. D’ici là, aucune valeur n’est inventée ; les repères de la série restent à part.</p>') + '\n  </div>\n</section>\n'
    + (freres.length ? '<section class="shell reveal" id="autres">\n  <h2 class="rel-title">Autres ' + esc(cat.label.toLowerCase()) + '</h2>\n  <div class="rel-grid rise">' + freres.map(f => { const y = CONSO_DATA.items.find(z => z.id === f.id); return '<a class="rel-card" href="' + esc(path.basename(f.cible)) + '"><span class="rel-txt"><span class="rel-marque">' + esc((ST_CONSO[y.statut] || ST_CONSO.conf)[0].split(' :')[0].split(' pour ')[0]) + '</span><span class="rel-nom">' + esc(f.nom) + '</span></span></a>'; }).join('') + '</div>\n</section>\n' : '')
    + fin(file, '<a class="fiche-meth-a" href="../nourriture.html#consommables-' + esc(c.id) + '">Sa ligne dans la liste des consommables</a>', { q: 'Quel budget pour manger et récupérer ?', d: 'Écris ce que tu dépenses par partie : tu vois ce que ça pèse sur ton objectif.', params: 'tool=budget&amp;type=consumable&amp;from=consommables', cta: 'Faire mon budget' })
    + prevNext(ordre, i, x => path.basename(x.cible), x => x.nom);
  const liens = '<span class="lc-track" data-track="consommables" data-track-id="' + esc(c.id) + '" data-track-name="' + esc(c.nom) + '"></span><a href="../nourriture.html#consommables-' + esc(c.id) + '">Dans la liste des consommables</a>';
  /* v7.97 : la catégorie s’écrit comme dans la liste (« Boissons ») : un libellé connu de la mémoire de traduction, jamais une minuscule forcée */
  const lede = esc(c.nom) + ' dans GTA VI : ' + esc(cat.label) + ', ' + minuscule(st[0]).split(' :')[0] + '. ' + esc(c.description);
  return page({ file, nom: c.nom, titre: titre('GTA 6 : ' + c.nom + ', ' + cat.label), description: court(c.nom + ' dans GTA VI (' + cat.label + '). ' + c.description, 155, c.nom + ' dans GTA VI (' + cat.label + ') : effet, prix, où le trouver et statut.'), indexable: !!it.indexable, image: v1280 ? SITE + v1280.src.replace(/^\//, '') : null, kicker: 'Consommable, ' + cat.label, lede, tags: [[st[0].split(' :')[0], st[1]], [cat.label, false], ...(qui ? [[qui[0], false]] : [])], liens, art, body, crumbs: [['Tout ce qui s’achète', 'achats.html'], ['Consommables', 'nourriture.html#liste-consommables']], scripts: ['suivi.js'], heroClass: 'fhero--conso' });
}

/* ======================================================================================================================
   génération
   ====================================================================================================================== */
function tout() {
  /* lieux, dans l’ordre de la carte groupe par groupe (précédent et suivant restent dans le même quartier) */
  const ordreLieux = LIEUX.items.filter(it => !it.page || it.page === it.cible).slice().sort((a, b) => { const ga = (GTA_BY_ID.get(a.id) || {}).p || '', gb = (GTA_BY_ID.get(b.id) || {}).p || ''; return ga.localeCompare(gb) || a.nom.localeCompare(b.nom, 'fr'); });
  const parGroupe = new Map(); for (const it of ordreLieux) { const k = (GTA_BY_ID.get(it.id) || {}).p || ''; if (!parGroupe.has(k)) parGroupe.set(k, []); parGroupe.get(k).push(it); }
  const infos = distingue(ordreLieux);
  for (const [, list] of parGroupe) list.forEach((it, i) => { write(pageOfLieu(it), pageLieu(it, i, list, infos.get(it.id))); NEXT.elements[it.id] = pageOfLieu(it); });
  const ordreGroupes = GROUPES.items.filter(it => !it.page || it.page === it.cible);
  ordreGroupes.forEach((it, i) => { write(it.cible, pageGroupe(it, i, ordreGroupes)); NEXT.elements[it.id] = it.cible; });
  for (const it of GROUPES.items) if (it.page && it.page !== it.cible) NEXT.elements[it.id] = it.page;
  write('quartiers/index.html', pageSommaireGroupes());
  write('lieux-carte/index.html', pageSommaireLieux());
  const ordreConso = CONSO.items.slice();
  ordreConso.forEach((it, i) => { write(it.cible, pageConsommable(it, i, ordreConso)); NEXT.elements['consommables:' + it.id] = it.cible; });
  /* lot B (v7.96) : les autres familles, même gabarit, même index */
  LOT_B = require('./gen-pages-elements-b.cjs')({ fs, path, ROOT, INV, SHELL, esc, SITE, FAM, nb, pick, cap, minuscule, court, titre, page, fin, prevNext, apercu, echellePour, write, NEXT, CAT, MED, GTA_BY_ID, SOURCES, PERSON, ST_CONSO, UNITS, money, repere, effetPhrase, lieuById, pageOfLieu, donneesLieu, affiche, lienLieu, LIEUX, GROUPES, CONSO, slug: INV.slug, ce, de });
}
let LOT_B = null;
tout();
/* pages écrites autrefois par ce générateur et qui ne correspondent plus à aucun élément : signalées, jamais supprimées ici */
const orphelines = Object.keys(INDEX.pages || {}).filter(f => !NEXT.pages[f] && fs.existsSync(path.join(ROOT, f)));
if (!VERIFIER) fs.writeFileSync(INDEX_FILE, JSON.stringify(NEXT, null, 0).replace(/,"/g, ',\n"') + '\n');
console.log((VERIFIER ? 'Vérification' : 'Pages par élément') + ' : ' + nb(STATS.pages) + ' pages (' + nb(LIEUX.items.filter(it => !it.page || it.page === it.cible).length) + ' lieux, ' + nb(GROUPES.items.filter(it => !it.page || it.page === it.cible).length) + ' groupes, ' + nb(CONSO.items.length) + ' consommables, 2 sommaires' + (LOT_B ? ', lot B : ' + LOT_B.resume : '') + '), ' + nb(STATS.ecrites) + (VERIFIER ? ' différente(s), ' : ' écrite(s), ') + nb(STATS.inchangees) + ' inchangée(s).' + (orphelines.length ? ' Pages orphelines (plus aucun élément) : ' + orphelines.join(', ') : ''));
if (VERIFIER && STATS.ecrites) process.exit(1);
