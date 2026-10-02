#!/usr/bin/env node
'use strict';
/* Hub « Tout ce qui s'achète » : les catégories recensées et les acquisitions à confirmer, avec pour chacune
   ce que le site recense déjà, ce que Rockstar a montré, et ce qui attend encore de vraies données.
   Aucun prix, aucun chiffre inventé : les comptes viennent des fichiers de données du site. */
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const visuals = require('./lot-c-visuals.cjs');
const S = require('./sections.cjs');
const root = path.resolve(__dirname, '..'), read = f => fs.readFileSync(path.join(root, f), 'utf8');
const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ctx = { window: {} }; vm.createContext(ctx);
for (const f of ['vehicules-data.js', 'armes-data.js', 'acquisitions-data.js']) vm.runInContext(read(f), ctx);
const ed = JSON.parse(read('outils/editorial.json')), acq = ctx.window.LK_ACQUISITIONS;
/* v7.40 (lot 3) : descriptions des cartes (acquisitions.json : champ description des catégories, bloc hub.cards pour les
   autres) et bloc éditorial (outils/achats-editorial.json). Rien n'est écrit ici : tout vient des fichiers de données. */
const acqSrc = JSON.parse(read('outils/acquisitions.json')), EDITO = JSON.parse(read('outils/achats-editorial.json'));
const catDesc = id => { const c = acqSrc.categories.find(x => x.id === id); if (!c || !c.description) throw Error('Description absente dans acquisitions.json : ' + id); return c.description; };
const hubDesc = key => { const c = acqSrc.hub && acqSrc.hub.cards[key]; if (!c || !c.description) throw Error('Description absente dans acquisitions.json (hub.cards) : ' + key); return c.description; };
const fill = (t, vars) => String(t).replace(/\{(\w+)\}/g, (m, k) => { if (!(k in vars)) throw Error('Variable inconnue : ' + k); return String(vars[k]); });
const vehicles = ctx.window.LK_VEHICULES || [], weapons = ctx.window.LK_ARMES || [];
const aircraft = vehicles.filter(v => ['avion', 'helicoptere'].includes(v.cat)).length;
const boats = vehicles.filter(v => v.cat === 'bateau').length;
const count = (list, id) => (acq.items || []).filter(x => x.category === id && x.trackable).length;
/* v7.50 (lot 3) : comptes justes (anomalie 16) : lignes des listes documentées (outils/catalogues/*.json). */
const CAT = require('./catalogues.cjs');
/* v7.59 (check ultime, CALC-13) : les phrases « prix pas encore connus » sont calculées depuis les données (outils/donnees-publiees.cjs). */
const DP = require('./donnees-publiees.cjs'), ETAT = DP.etat(path.resolve(__dirname, '..'));
const TYPE_OF = { 'vehicules.html': 'vehicle', 'armes.html': 'weapon', 'entreprises.html': 'business', 'demeures.html': 'property', 'planques.html': 'hideout' };
function prixConnus(type) { const n = ETAT.prix.parType[type]; return n ? n.connus : 0; }
/* {prix} des cartes du hub (outils/acquisitions.json → hub.cards) : l'absence reste écrite tant qu'aucun prix n'est publié pour ce type ;
   dès qu'une source du site porte un prix, la phrase compte et renvoie à la source (jamais un chiffre inventé). */
function prixPhrase(type) {
  const n = prixConnus(type), s = n > 1 ? 's' : '';
  if (type === 'vehicle') return n ? n + ' prix publié' + s + ' avec source ; aucun chiffre de performance avant la sortie.' : 'Aucun prix ni chiffre de performance avant la sortie.';
  if (type === 'weapon') return n ? n + ' prix publié' + s + ' avec source.' : 'Aucun prix publié.';
  if (type === 'business') return n ? n + ' entreprise' + s + ' avec un prix publié et une source ; pour les autres, l’achat par le joueur reste à confirmer.' : 'Leur achat par le joueur n’est pas confirmé : aucune entreprise n’est proposée avec un prix.';
  if (type === 'property') return n ? n + ' demeure' + s + ' avec un prix publié et une source ; les autres ne sont pas des logements à acheter.' : 'Ce ne sont pas des logements à acheter : aucun prix, aucune condition d’accès.';
  return n ? n + ' prix publié' + s + ' avec source.' : 'Aucun prix publié.';
}
function prixLigne(c) { const base = STATUS[c.status][1]; const t = TYPE_OF[c.href]; const n = t ? prixConnus(t) : 0; if (!n || c.status !== 'listed') return base; return 'fiches déjà en ligne, ' + n + ' prix publié' + (n > 1 ? 's' : '') + ' avec source, les autres pas encore connus'; }
const lines = fams => fams.reduce((n, f) => n + CAT.counts(f).n, 0);
const nConso = lines(['consommables']), nStyle = lines(['coiffures', 'tatouages', 'tenues']), nPerso = lines(['perso-vehicules', 'perso-armes']);
/* Trois statuts, toujours dits en clair. */
const STATUS = {
  listed: ['Recensé sur le site', 'fiches déjà en ligne, prix pas encore connus'], /* v7.59 : complété par prixLigne() quand des prix sont publiés */
  shown: ['Montré par Rockstar', 'obtention décrite officiellement, prix séparé inconnu'],
  pending: ['À confirmer', 'aucune entrée vérifiée dans cette catégorie du site']
};
const cards = [
  { label: 'Véhicules', href: 'vehicules.html', status: 'listed', n: vehicles.length, unit: 'fiches', desc: fill(hubDesc('vehicules'), { n: vehicles.length, nOfficiel: vehicles.filter(v => v.st === 'officiel').length, prix: prixPhrase('vehicle') }), actions: [['vehicules.html', 'Cocher mon garage'], ['comparateur.html?type=vehicules', 'Comparer'], ['calculateurs.html?tool=purchase&from=achats#atelier', 'Simuler un achat']], text: 'Voitures, motos, camions, aéronefs et bateaux recensés, avec un schéma ou une photo officielle par fiche.' + (aircraft ? ' ' + aircraft + ' aéronefs et ' + boats + ' embarcations inclus.' : '') },
  { label: 'Armurerie', href: 'armes.html', status: 'listed', n: weapons.length, unit: 'armes', desc: fill(hubDesc('armes'), { n: weapons.length, nOfficiel: weapons.filter(a => a.st === 'officiel').length, prix: prixPhrase('weapon') }), actions: [['armes.html#catalogue', 'Cocher mon arsenal'], ['armes.html#equipement', 'Composer mon chargement']], text: 'Les armes identifiées, le constructeur d’équipement, les gadgets et les types de munitions, au même endroit. ' + (prixConnus('weapon') ? prixConnus('weapon') + ' prix publié' + (prixConnus('weapon') > 1 ? 's' : '') + '.' : 'Aucun prix publié.') },
  { label: 'Consommables', href: 'nourriture.html', status: 'shown', n: nConso, unit: 'lignes documentées', desc: catDesc('nourriture'), actions: [['nourriture.html', 'Lire les repères'], ['calculateurs.html?tool=budget&from=achats#atelier', 'Prévoir un budget']], text: 'Manger, boire, se soigner pour récupérer de la vie : ce que la série fait déjà, ce que l’Extended Look montre, et où on s’attend à en trouver.' },
  { label: 'Vêtements et style', href: 'style.html', status: 'shown', n: nStyle, unit: 'lignes documentées', desc: catDesc('style'), actions: [['style.html#collections', 'Voir les collections'], ['style.html', 'Voir les adresses']], text: 'Tenues, accessoires, tatouages et coiffures : les collections annoncées et les adresses de Sara’s Unisex Salon, Stock 305 et Electric Fang Tattoo.' },
  { label: 'Personnalisations', href: 'personnalisations.html', status: count(acq, 'customizations') ? 'shown' : 'pending', n: nPerso, unit: 'lignes documentées', desc: catDesc('customizations'), actions: [['personnalisations.html', 'Cocher ce qui est documenté'], ['entreprises.html', 'Voir les ateliers']], text: 'Kits de véhicules et motifs d’armes décrits par Rockstar, et les ateliers Rideout Customs et One-Eyed Willie’s.' },
  { label: 'Entreprises', href: 'entreprises.html', status: 'listed', n: (ed.businesses || []).length, unit: 'fiches', desc: fill(hubDesc('entreprises'), { prix: prixPhrase('business') }), actions: [['entreprises.html', 'Voir les fiches'], ['calculateurs.html?tool=roi&from=achats#atelier', 'Ça vaut le coup ?']], text: 'Les commerces présentés par Rockstar. Leur achat dans le jeu n’est pas confirmé : le calculateur « Ça vaut le coup ? » sert à tester ton hypothèse.' },
  { label: 'Demeures', href: 'demeures.html', status: 'listed', n: (ed.residences || []).length, unit: 'fiches', desc: fill(hubDesc('demeures'), { prix: prixPhrase('property') }), actions: [['demeures.html', 'Voir les fiches'], ['carte.html', 'Ouvrir la carte']], text: 'Où vivent les personnages, d’après ce que Rockstar a montré.' },
  { label: 'Planques et garages', href: 'planques.html#garages', status: count(acq, 'garages') ? 'shown' : 'listed', n: (ed.hideouts || []).length + count(acq, 'garages'), unit: 'fiches', desc: catDesc('garages'), actions: [['planques.html#garages', 'Cocher les garages'], ['planques.html', 'Voir les planques']], text: 'Les repaires vus dans les médias et les garages décrits avec les éditions (Paradise, Shore Court).' },
  { label: 'Logements et appartements', href: 'logements.html', status: 'pending', n: 0, unit: '', desc: catDesc('logements'), actions: [['demeures.html', 'Demeures'], ['planques.html#garages', 'Garages documentés']], text: 'Les logements à acheter. Les demeures des personnages sont dans « Demeures », les garages dans « Planques ».' },
  { label: 'Bateaux', href: 'bateaux.html', status: count(acq, 'boats') ? 'shown' : 'pending', n: count(acq, 'boats'), unit: 'documentés', desc: catDesc('boats'), actions: [['bateaux.html', 'Cocher les bateaux'], ['vehicules.html#bateau', 'Catalogue Véhicules']], text: 'Les embarcations dont Rockstar décrit l’obtention (Édition Ultimate), reliées aux fiches Véhicules.' },
  { label: 'Collectibles', href: 'collectibles.html', status: 'pending', n: null, unit: '', desc: hubDesc('collectibles'), actions: [['collectibles.html', 'Voir le catalogue'], ['carnets/collectibles.html', 'Voir mes collectibles']], text: 'Le suivi est prêt ; aucun objet à collectionner n’est actuellement publié dans le catalogue. Cette section ne constitue pas une catégorie d’achat.' }
];
/* v7.50 (lot 3) : un visuel officiel par catégorie (mêmes images que les bandeaux des sections). Une catégorie sans
   donnée confirmée garde une illustration dite comme telle : l’image ne prouve pas qu’un objet s’achète. */
const MED = JSON.parse(read('outils/medias-officiels.json'));
const VIS = {
  'Véhicules': ['95-grotti-cheetah-01', 'Grotti Cheetah blanche devant un hôtel Art déco'],
  'Armurerie': ['hawk-little-morgan-revolvers-01', 'Revolver à lunette tenu à la main'],
  'Consommables': ['leonida-keys-03', 'Terrasse du bar The Rusty Anchor, dans les Keys'],
  'Vêtements et style': ['stock-305-clothing-store-04', 'Vendeuse de Stock 305 derrière le comptoir'],
  'Personnalisations': ['rideout-customs-mod-shop-01', 'Berline à jantes dorées devant Rideout Customs'],
  'Entreprises': ['ptt-youngin-illegal-goods-store', 'Devant la boutique PTT Youngin$'],
  'Demeures': ['cal-hampton-01', 'Cal Hampton devant un décor de minigolf'],
  'Planques et garages': ['jason-s-safehouse-vehicles', 'Maison sur pilotis de Jason dans les Keys'],
  'Logements et appartements': ['port-gellhorn-01', 'Enseigne d’un motel de Port Gellhorn au crépuscule'],
  'Bateaux': ['shitzu-squalo-01', 'Hors-bord Squalo devant la skyline de Vice City'],
  'Collectibles': ['classic-car-collection-04', 'Voiture de course rouge numéro 36']
};
const slug = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
function visual(c) {
  const v = VIS[c.label]; if (!v) throw Error('Visuel absent pour la catégorie ' + c.label);
  const m = MED[v[0]]; if (!m) throw Error('Visuel officiel inconnu : ' + v[0]);
  const s = m.variants.find(x => x.w === 480), l = m.variants.find(x => x.w === 1280);
  for (const x of [s, l]) if (!x || !fs.existsSync(path.join(root, x.src.replace(/^\//, '')))) throw Error('Fichier absent : ' + v[0]);
  const note = c.status === 'pending' ? 'Illustration : rien de confirmé à acheter dans cette catégorie' : 'Visuel officiel Rockstar Games';
  return '<figure class="ak-media"><img src="' + s.src.replace(/^\//, '') + '" srcset="' + s.src.replace(/^\//, '') + ' 480w, ' + l.src.replace(/^\//, '') + ' 1280w" sizes="(max-width:760px) 100vw, 46vw" width="' + s.w + '" height="' + s.h + '" alt="' + esc(v[1]) + '" loading="lazy" decoding="async"><figcaption>' + esc(note) + '</figcaption></figure>';
}
const base = read('a-propos.html'), header = base.match(/<header>[\s\S]*?<\/header>/)[0].replace(/ class="here"/g, ''), footer = base.match(/<footer>[\s\S]*?<\/footer>/)[0];
const favicon = base.match(/<link rel="icon"[^>]*>/)[0];
/* v7.50 (lot 3) : succession verticale au défilement. Chaque carte monte depuis le bas et vient se poser sur la
   précédente (position collante, une seule direction) ; la précédente s’atténue un peu. Piloté par le défilement du
   navigateur (achats-pile.js ne fait que doser l’atténuation et la netteté de l’image) ; remonter revisite les cartes.
   Mouvement réduit, écran bas ou choix « Tout voir en grille » : grille statique, mêmes cartes, mêmes liens. */
const grid = cards.map((c, i) => `<li class="ak-slot" id="ak-${slug(c.label)}" style="--i:${i}"><article class="d-card ak-card is-${c.status}">${visual(c)}
 <div class="d-card-body"><p class="d-label"><span class="ak-num">${String(i + 1).padStart(2, '0')}</span> ${esc(STATUS[c.status][0])}</p><h3><a href="${c.href}">${esc(c.label)}</a></h3>
 <p class="ak-count">${c.n === null ? 'Suivi dans la progression' : c.n ? c.n + ' ' + esc(c.unit) : 'Rien de publié pour l’instant'}</p>
 <p class="ak-desc">${esc(c.desc)}</p><p class="ak-do"><span>Ici tu peux :</span> ${c.actions.map(([h, l]) => '<a href="' + esc(h) + '">' + esc(l) + '</a>').join('')}</p><p class="d-status">${esc(prixLigne(c))}</p>
 <div class="d-actions"><a href="${c.href}">Ouvrir la section</a></div></div></article></li>`).join('\n');
const jump = '<nav class="ak-jump" aria-label="Aller directement à une catégorie">' + cards.map(c => '<a href="#ak-' + slug(c.label) + '">' + esc(c.label) + '</a>').join('') + '</nav>';
const faq = EDITO.faq;
/* v7.40 : bloc éditorial sous la grille (sections du lot 3), visible sans JS. Les sources citées sont celles
   d'acquisitions.json (URL, titre, date de consultation). */
const vars = { nVehicules: vehicles.length, nArmes: weapons.length };
const srcList = ids => '<ul class="ed-sources">' + ids.map(id => { const x = acqSrc.sources[id]; if (!x) throw Error('Source inconnue : ' + id);
  const d = x.consultedAt.split('-').reverse().join('/'); return '<li><a href="' + esc(x.url) + '" rel="noopener" target="_blank">' + esc(x.title) + '</a>' + (x.publishedAt ? ' <span>(publié le ' + esc(x.publishedAt.split('-').reverse().join('/')) + ')</span>' : '') + ' <span>· consulté le ' + esc(d) + '</span> — ' + esc(x.claim) + '</li>'; }).join('') + '</ul>';
const levels = items => '<div class="ed-levels ed-levels--ak">' + items.map(x => '<div class="ed-level is-' + esc(x.statut) + '"><h3><i class="ak-pip" aria-hidden="true"></i>' + esc(x.titre) + '</h3><p>' + esc(x.texte) + '</p></div>').join('') + '</div>';
const edito = '<div class="ed-zone" id="comprendre">' + EDITO.sections.map((x, i) => {
  const paras = x.p.map(t => '<p>' + fill(t, vars) + '</p>').join('');
  let body;
  if (x.layout === 'levels') body = levels(x.items) + paras;
  else if (x.layout === 'split') body = '<div class="ed-split"><div class="ed-text">' + paras + '</div><aside class="ed-aside"><h3 class="ed-h3">Sources consultées</h3>' + srcList(x.sources) + '</aside></div>';
  else body = paras + (x.links ? '<div class="ed-links">' + x.links.map(([h, l]) => '<a href="' + esc(h) + '">' + esc(l) + '</a>').join('') + '</div>' : '');
  return S.section({ id: x.id, num: i + 1, kicker: x.kicker, title: x.titre, icon: x.icon, tone: x.tone }, body);
}).join('\n') + '</div>';
const page = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Tout ce qui s’achète dans GTA VI : véhicules, armes, vêtements | Leonidakit</title><meta name="description" content="Les catégories recensées dans GTA VI : contenus documentés, acquisitions décrites et possibilités d’achat encore à confirmer."><meta name="theme-color" content="#FDFBF7"><link rel="canonical" href="https://www.leonidakit.com/achats.html"><script type="application/ld+json">{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"Accueil","item":"https://www.leonidakit.com/"},{"@type":"ListItem","position":2,"name":"Tout ce qui s’achète","item":"https://www.leonidakit.com/achats.html"}]}</script>
<meta property="og:title" content="Tout ce qui s’achète dans GTA VI"><meta property="og:description" content="Véhicules, armes, vêtements, logements, munitions, consommables : ce qu’on sait, section par section."><meta property="og:type" content="website"><meta property="og:url" content="https://www.leonidakit.com/achats.html"><meta property="og:image" content="https://leonidakit.com/img/social-card.png">
${favicon}
<link rel="stylesheet" href="style.css">
<link rel="stylesheet" href="motion-tokens.css">
<link rel="stylesheet" href="acquisitions.css">
<style>.ak-intro{max-width:70ch}.ak-legend{display:flex;flex-wrap:wrap;gap:10px;margin:18px 0 0}.ak-legend span{display:inline-flex;align-items:center;gap:8px;min-height:36px;padding:6px 12px;border:2px solid var(--ink);border-radius:999px;background:#fff;font:800 .9rem 'Archivo',sans-serif;color:var(--ink)}.ak-legend i{width:12px;height:12px;border-radius:50%;border:2px solid var(--ink)}.ak-legend .l1 i{background:var(--amber)}.ak-legend .l2 i{background:var(--coral)}.ak-legend .l3 i{background:#fff}.ak-grid{display:flex;flex-wrap:wrap;justify-content:center;gap:22px}.ak-grid>*{flex:0 0 calc((100% - 44px)/3);min-width:0}@media(max-width:900px){.ak-grid>*{flex-basis:calc((100% - 22px)/2)}}@media(max-width:600px){.ak-grid{gap:16px}.ak-grid>*{flex-basis:100%}}.ak-card{border-top:6px solid var(--amber)}.ak-card.is-shown{border-top-color:var(--coral)}.ak-card.is-pending{border-top-color:var(--line)}.ak-card h3 a{color:var(--ink);text-decoration:none}.ak-count{font:800 1.05rem var(--font-mono,ui-monospace,monospace);color:var(--coral-text)}.ak-card.is-pending .ak-count{color:var(--ink-soft)}.ak-desc{font-size:.9rem;line-height:1.6;color:var(--ink-soft)}.ak-do{display:flex;flex-wrap:wrap;gap:6px 8px;align-items:center;font-size:.8rem}.ak-do span{font:700 .72rem var(--font-mono,ui-monospace,monospace);letter-spacing:.06em;text-transform:uppercase;color:var(--ink-soft);margin-right:2px}.ak-do a{display:inline-flex;align-items:center;min-height:30px;padding:4px 10px;border:1.5px solid var(--ink);border-radius:999px;background:var(--paper-2);color:var(--ink);font-weight:700;text-decoration:none}.ak-do a:hover,.ak-do a:focus-visible{background:var(--amber)}.ed-levels--ak .ak-pip{width:14px;height:14px;border-radius:50%;border:2px solid var(--ink);background:#fff;flex:none}.ed-level.is-listed .ak-pip{background:var(--amber)}.ed-level.is-shown .ak-pip{background:var(--coral)}.ed-levels--ak+p{margin-top:18px}</style>
</head>
<body class="d-page"><a class="skip" href="#main">Aller au contenu</a><div class="sunset" aria-hidden="true"></div>${header}<main id="main" class="lore-page">
<section class="page-head shell lk-glow"><div class="lk-head-grid"><div><p class="fiche-cat">GTA VI · tout ce qui s’achète</p><h1>Tout ce qui s’achète dans GTA VI</h1><p class="lede ak-intro">Voitures, armes, vêtements, logements, munitions, consommables : explore les catégories recensées et les acquisitions documentées, section par section. Une fiche ou une catégorie ne prouve pas qu’un achat sera possible. Pour chaque catégorie, tu vois ce que le site recense déjà, ce que Rockstar a montré, et ce qui attend encore de vraies données.</p><p class="d-intro-note">${ETAT.prix.connus ? ETAT.prix.connus + ' prix publié' + (ETAT.prix.connus > 1 ? 's' : '') + ' sur ' + ETAT.prix.total + ' fiches, chacun avec sa source ; les autres restent à vérifier.' : 'Aucun prix séparé en jeu n’est vérifié dans le catalogue actuel.'} La sortie est annoncée le 19 novembre 2026. « À confirmer » signale une donnée absente ; ce n’est pas une promesse d’achat futur. <a href="tuto.html#sources">Comprendre les statuts</a>.</p>
<div class="ak-legend" aria-label="Légende des statuts"><span class="l1"><i aria-hidden="true"></i>Recensé sur le site</span><span class="l2"><i aria-hidden="true"></i>Montré par Rockstar</span><span class="l3"><i aria-hidden="true"></i>À confirmer</span></div></div>${visuals.stack('achats',{label:'Trois visuels officiels d’achats montrés par Rockstar'})}</div></section>
<section class="shell d-section" id="categories" aria-labelledby="categories-title"><h2 id="categories-title">${cards.length} catégories, une section pour chacune</h2><p class="ak-lead">Descends : chaque catégorie arrive à son tour, avec ce que tu peux y faire. Pressé ? Va directement à celle qui t’intéresse.</p>${jump}<p class="ak-view"><button type="button" class="ak-view-btn" data-ak-view aria-pressed="false" hidden>Tout voir en grille</button></p><ol class="ak-stack" data-ak-stack>${grid}</ol></section>
${edito}
${S.section({ id: 'faq', kicker: 'Questions', title: 'Questions fréquentes', icon: 'faq', tone: 'paper' }, '<p>Des réponses courtes, avec des mots simples.</p><div class="faq rise">' + faq.map(([q, a]) => '<details><summary>' + esc(q) + '</summary><div class="ans">' + esc(a) + '</div></details>').join('') + '</div>')}
</main>${footer}
<script src="search-index.js"></script><script src="assets-manifest.js"></script><script src="common.js"></script><script src="app.js"></script><script src="learning-motion.js"></script><script src="achats-pile.js"></script>
</body></html>
`;
fs.writeFileSync(path.join(root, 'achats.html'), page);
console.log('Tout ce qui s’achète : ' + cards.length + ' catégories.');
