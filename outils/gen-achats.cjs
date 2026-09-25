#!/usr/bin/env node
'use strict';
/* Hub « Tout ce qui s'achète » : les catégories recensées et les acquisitions à confirmer, avec pour chacune
   ce que le site recense déjà, ce que Rockstar a montré, et ce qui attend encore de vraies données.
   Aucun prix, aucun chiffre inventé : les comptes viennent des fichiers de données du site. */
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = path.resolve(__dirname, '..'), read = f => fs.readFileSync(path.join(root, f), 'utf8');
const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ctx = { window: {} }; vm.createContext(ctx);
for (const f of ['vehicules-data.js', 'armes-data.js', 'acquisitions-data.js']) vm.runInContext(read(f), ctx);
const ed = JSON.parse(read('outils/editorial.json')), acq = ctx.window.LK_ACQUISITIONS;
const vehicles = ctx.window.LK_VEHICULES || [], weapons = ctx.window.LK_ARMES || [];
const aircraft = vehicles.filter(v => ['avion', 'helicoptere'].includes(v.cat)).length;
const boats = vehicles.filter(v => v.cat === 'bateau').length;
const count = (list, id) => (acq.items || []).filter(x => x.category === id && x.trackable).length;
/* Trois statuts, toujours dits en clair. */
const S = {
  listed: ['Recensé sur le site', 'fiches déjà en ligne, prix pas encore connus'],
  shown: ['Montré par Rockstar', 'obtention décrite officiellement, prix séparé inconnu'],
  pending: ['À confirmer', 'aucune entrée vérifiée dans cette catégorie du site']
};
const cards = [
  { label: 'Véhicules', href: 'vehicules.html', status: 'listed', n: vehicles.length, unit: 'fiches', text: 'Voitures, motos, camions, aéronefs et bateaux recensés, avec un schéma ou une photo officielle par fiche.' + (aircraft ? ' ' + aircraft + ' aéronefs et ' + boats + ' embarcations inclus.' : '') },
  { label: 'Armurerie', href: 'armes.html', status: 'listed', n: weapons.length, unit: 'armes', text: 'Les armes identifiées, le constructeur d’équipement, les gadgets et les types de munitions, au même endroit. Aucun prix publié.' },
  { label: 'Consommables', href: 'nourriture.html', status: 'shown', n: 0, unit: '', text: 'Manger, boire, se soigner pour récupérer de la vie : ce que la série fait déjà, ce que l’Extended Look montre, et où on s’attend à en trouver.' },
  { label: 'Vêtements et style', href: 'style.html', status: 'shown', n: (acq.items || []).filter(x => x.category === 'style').length, unit: 'collections', text: 'Tenues, accessoires, tatouages et coiffures : les collections annoncées et les adresses de Sara’s Unisex Salon, Stock 305 et Electric Fang Tattoo.' },
  { label: 'Personnalisations', href: 'personnalisations.html', status: count(acq, 'customizations') ? 'shown' : 'pending', n: count(acq, 'customizations'), unit: 'documentées', text: 'Kits de véhicules et motifs d’armes décrits par Rockstar, et les ateliers Rideout Customs et One-Eyed Willie’s.' },
  { label: 'Entreprises', href: 'entreprises.html', status: 'listed', n: (ed.businesses || []).length, unit: 'fiches', text: 'Les commerces présentés par Rockstar. Leur achat dans le jeu n’est pas confirmé : le calculateur « Ça vaut le coup ? » sert à tester ton hypothèse.' },
  { label: 'Demeures', href: 'demeures.html', status: 'listed', n: (ed.residences || []).length, unit: 'fiches', text: 'Où vivent les personnages, d’après ce que Rockstar a montré.' },
  { label: 'Planques et garages', href: 'planques.html#garages', status: count(acq, 'garages') ? 'shown' : 'listed', n: (ed.hideouts || []).length + count(acq, 'garages'), unit: 'fiches', text: 'Les repaires vus dans les médias et les garages décrits avec les éditions (Paradise, Shore Court).' },
  { label: 'Logements et appartements', href: 'logements.html', status: 'pending', n: 0, unit: '', text: 'Les logements à acheter. Les demeures des personnages sont dans « Demeures », les garages dans « Planques ».' },
  { label: 'Bateaux', href: 'bateaux.html', status: count(acq, 'boats') ? 'shown' : 'pending', n: count(acq, 'boats'), unit: 'documentés', text: 'Les embarcations dont Rockstar décrit l’obtention (Édition Ultime), reliées aux fiches Véhicules.' },
  { label: 'Collectibles', href: 'collectibles.html', status: 'pending', n: null, unit: '', text: 'Le suivi est prêt ; aucun objet à collectionner n’est actuellement publié dans le catalogue. Cette section ne constitue pas une catégorie d’achat.' }
];
const base = read('a-propos.html'), header = base.match(/<header>[\s\S]*?<\/header>/)[0].replace(/ class="here"/g, ''), footer = base.match(/<footer>[\s\S]*?<\/footer>/)[0];
const fonts = base.match(/<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com">[\s\S]*?rel="stylesheet">/)[0], favicon = base.match(/<link rel="icon"[^>]*>/)[0];
const grid = cards.map(c => `<article class="d-card ak-card is-${c.status}" data-d-reveal>
 <div class="d-card-body"><p class="d-label">${esc(S[c.status][0])}</p><h3><a href="${c.href}">${esc(c.label)}</a></h3>
 <p class="ak-count">${c.n === null ? 'Suivi dans la progression' : c.n ? c.n + ' ' + esc(c.unit) : 'Rien de publié pour l’instant'}</p>
 <p>${esc(c.text)}</p><p class="d-status">${esc(S[c.status][1])}</p>
 <div class="d-actions"><a href="${c.href}">Ouvrir la section</a></div></div></article>`).join('\n');
const faq = [
  ['Pourquoi il n’y a aucun prix ?', 'Aucun prix séparé en jeu n’est vérifié dans le catalogue actuel. La sortie de GTA VI est annoncée le 19 novembre 2026. Dès qu’un prix sera connu et vérifié, il sera ajouté avec sa source. En attendant, le calculateur te laisse écrire le prix que tu imagines.'],
  ['Que veut dire « À confirmer » ?', 'Que le site ne dispose pas d’entrées vérifiées pour cette catégorie. Cela ne confirme ni sa présence ni un achat possible dans GTA VI. La section est prête et se remplira avec de vrais relevés faits dans le jeu, jamais avec des chiffres de GTA V.'],
  ['Où est-ce que je coche ce que j’ai acheté ?', 'Sur chaque section : un véhicule dans Véhicules, une arme dans Armes, un contenu documenté dans sa section. Tout se retrouve dans Progression, avec un pourcentage par catégorie. Les catégories vides ne comptent pas dans le total.'],
  ['Comment calculer si je peux acheter quelque chose ?', 'Ouvre le calculateur, outil « Mes achats » : choisis la fiche, écris le prix que tu imagines, et il te dit s’il te manque de l’argent et combien de temps de jeu il te faut.']
];
const page = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Tout ce qui s’achète dans GTA VI : véhicules, armes, vêtements, logements | Leonidakit</title><meta name="description" content="Les catégories recensées dans GTA VI : contenus documentés, acquisitions décrites et possibilités d’achat encore à confirmer."><meta name="theme-color" content="#FDFBF7"><link rel="canonical" href="https://leonidakit.com/achats.html">
<meta property="og:title" content="Tout ce qui s’achète dans GTA VI"><meta property="og:description" content="Véhicules, armes, vêtements, logements, munitions, consommables : ce qu’on sait, section par section."><meta property="og:type" content="website"><meta property="og:url" content="https://leonidakit.com/achats.html"><meta property="og:image" content="https://leonidakit.com/img/social-card.png">
${favicon}
${fonts}
<link rel="stylesheet" href="style.css">
<link rel="stylesheet" href="motion-tokens.css">
<link rel="stylesheet" href="acquisitions.css">
<style>.ak-intro{max-width:70ch}.ak-legend{display:flex;flex-wrap:wrap;gap:10px;margin:18px 0 0}.ak-legend span{display:inline-flex;align-items:center;gap:8px;min-height:36px;padding:6px 12px;border:2px solid var(--ink);border-radius:999px;background:#fff;font:800 .9rem 'Archivo',sans-serif;color:var(--ink)}.ak-legend i{width:12px;height:12px;border-radius:50%;border:2px solid var(--ink)}.ak-legend .l1 i{background:var(--amber)}.ak-legend .l2 i{background:var(--coral)}.ak-legend .l3 i{background:#fff}.ak-grid{grid-template-columns:repeat(3,minmax(0,1fr))}@media(max-width:900px){.ak-grid{grid-template-columns:minmax(0,1fr)}}.ak-card{border-top:6px solid var(--amber)}.ak-card.is-shown{border-top-color:var(--coral)}.ak-card.is-pending{border-top-color:var(--line)}.ak-card h3 a{color:var(--ink);text-decoration:none}.ak-count{font:800 1.05rem 'JetBrains Mono',monospace;color:var(--coral-text)}.ak-card.is-pending .ak-count{color:var(--ink-soft)}</style>
</head>
<body class="d-page"><a class="skip" href="#main">Aller au contenu</a><div class="sunset" aria-hidden="true"></div>${header}<main id="main" class="lore-page">
<section class="page-head shell"><p class="fiche-cat">GTA VI · tout ce qui s’achète</p><h1>Tout ce qui s’achète dans GTA VI</h1><p class="lede ak-intro">Voitures, armes, vêtements, logements, munitions, nourriture : explore les catégories recensées et les acquisitions documentées, section par section. Une fiche ou une catégorie ne prouve pas qu’un achat sera possible. Pour chaque catégorie, tu vois ce que le site recense déjà, ce que Rockstar a montré, et ce qui attend encore de vraies données.</p><p class="d-intro-note">Aucun prix séparé en jeu n’est vérifié dans le catalogue actuel. La sortie est annoncée le 19 novembre 2026. « À confirmer » signale une donnée absente ; ce n’est pas une promesse d’achat futur. <a href="tuto.html#sources">Comprendre les statuts</a>.</p>
<div class="ak-legend" aria-label="Légende des statuts"><span class="l1"><i aria-hidden="true"></i>Recensé sur le site</span><span class="l2"><i aria-hidden="true"></i>Montré par Rockstar</span><span class="l3"><i aria-hidden="true"></i>À confirmer</span></div></section>
<section class="shell d-section" id="categories" aria-labelledby="categories-title"><h2 id="categories-title">${cards.length} catégories, une section pour chacune</h2><div class="d-grid ak-grid">${grid}</div></section>
<section class="shell d-section" aria-labelledby="ak-suivi-title"><h2 id="ak-suivi-title">Et pour suivre mes achats ?</h2><p>Tout ce que tu coches sur le site (véhicules, armes, lieux, contenus documentés) se retrouve dans <a href="progression.html#acquisitions">Progression</a>, avec un pourcentage par catégorie. Pour savoir si tu peux te payer quelque chose, ouvre le <a href="calculateurs.html?tool=purchase#atelier">calculateur, outil « Mes achats »</a>.</p></section>
<section class="faq-sec" id="faq"><div class="shell"><div class="sec-head reveal"><h2>Questions fréquentes</h2><p>Des réponses courtes, avec des mots simples.</p></div><div class="faq rise">
${faq.map(([q, a]) => `      <details>\n        <summary>${esc(q)}</summary>\n        <div class="ans">${esc(a)}</div>\n      </details>`).join('\n')}
</div></div></section>
</main>${footer}
<script src="search-index.js"></script><script src="assets-manifest.js"></script><script src="common.js"></script><script src="app.js"></script><script src="learning-motion.js"></script>
</body></html>
`;
fs.writeFileSync(path.join(root, 'achats.html'), page);
console.log('Tout ce qui s’achète : ' + cards.length + ' catégories.');
