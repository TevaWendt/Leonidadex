'use strict';
/* v7.70 (demande de Téva du 07/10/2026) : animations d'entrée des hubs du monde (lieux, personnages, demeures, planques,
   entreprises) comme la section gangs ; fiches au format des gangs (galerie, localisateur, JSON-LD) ; Collectibles, Consommables,
   Vêtements et style, Personnalisations, Trophées (suivi en attente), Tuto, Mentions redessinés ; « Et si » du plan en mode
   expert ; tous les moyens de déplacement sur la carte ; effet de pile des Achats sans mémoire ; piles réduites de 15 % ;
   « Claude » retiré partout sauf dans les Mentions. Vérifications sur les pages générées (sans navigateur). */
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const { JSDOM } = require('jsdom');
const root = path.resolve(__dirname, '../..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const doc = f => new JSDOM(read(f)).window.document;
const LANGS = ['', 'en/', 'es/', 'it/', 'de/'];

test('hubs du monde : chaque grille de cartes a son entrée animée (v7.75 : tableau des départs pour Lieux, flash de casting pour Personnages), lk-arrive ; inclinaison au survol réservée aux gangs', () => {
  const FX = { gangs: 'lkx-deal', lieux: 'lkx-flap', personnages: 'lkx-flash', demeures: 'lkx-scan', planques: 'lkx-slide', entreprises: 'lkx-neon' };
  for (const hub of ['gangs', 'lieux', 'personnages', 'demeures', 'planques', 'entreprises']) {
    const d = doc(hub + '.html');
    const grid = d.querySelector('.lore-grid.' + FX[hub]);
    assert.ok(grid, hub + ' : grille ' + FX[hub]);
    assert.ok(grid.classList.contains('lk-arrive') && grid.hasAttribute('data-lkx-in'), hub + ' : entrée au défilement');
    const cards = grid.querySelectorAll('.lore-card');
    assert.ok(cards.length >= 3, hub + ' : au moins trois cartes');
    /* v7.75 (Téva : « au survol, rien ne doit se décaler ») : plus d'inclinaison sur les cinq hubs refaits ; les gangs la gardent */
    for (const c of cards) assert.equal(c.classList.contains('lkx-tilt'), hub === 'gangs', hub + ' : inclinaison au survol');
  }
  const css = read('lk-sections.css');
  assert.match(css, /\.lkx-deal\.is-in>\*\{animation:lkx-deal/);
});

test('fiches du monde : galerie légendée, localisateur avec « Où le/la trouver », JSON-LD WebPage + ImageGallery (crédit Rockstar)', () => {
  const G = JSON.parse(read('outils/galeries-monde.json'));
  const ids = Object.keys(G).filter(k => !k.startsWith('_'));
  assert.ok(ids.length >= 80, 'légendes des galeries');
  for (const id of ids) assert.ok(G[id].legende && G[id].legende.length > 3, id + ' : légende');
  const pages = { 'personnages/jason.html': 'Où le trouver', 'personnages/lucia.html': 'Où la trouver', 'lieux/vice-city.html': 'Où la trouver', 'entreprises/stock-305.html': 'Où la trouver', 'demeures/brian-keys.html': 'Où la trouver', 'planques/starlet-motel.html': 'Où la trouver' };
  for (const [f, lede] of Object.entries(pages)) {
    const d = doc(f), withGallery = !/^(demeures|planques)\//.test(f); /* une seule vue officielle pour les demeures et les planques */
    const slides = d.querySelectorAll('.lore-slide .lore-slide-txt');
    if (withGallery) assert.ok(slides.length >= 2, f + ' : galerie');
    for (const s of slides) { assert.ok(s.querySelector('.lst-k').textContent.trim().length > 2, f + ' : légende de la vue'); assert.match(s.querySelector('em').textContent, /^\d\d \/ \d\d$/, f + ' : compteur'); }
    assert.ok(d.querySelector('.lk-loc-status') && d.querySelector('.lk-loc-status').textContent.includes(lede), f + ' : ' + lede);
    const lds = [...d.querySelectorAll('script[type="application/ld+json"]')].map(s => JSON.parse(s.textContent));
    const page = lds.find(x => x['@type'] === 'WebPage');
    assert.ok(page && page.primaryImageOfPage, f + ' : WebPage avec image principale');
    if (!withGallery) continue;
    assert.ok(page.hasPart && page.hasPart['@type'] === 'ImageGallery', f + ' : ImageGallery');
    assert.ok(page.hasPart.image.length >= 2 && page.hasPart.image.every(i => i['@type'] === 'ImageObject' && /Rockstar Games/.test(i.creditText || i.copyrightNotice || '')), f + ' : images créditées');
  }
  for (const [f, lede] of [['personnages/lucia.html', 'Où la trouver'], ['personnages/dimez.html', 'Où la trouver'], ['personnages/brian.html', 'Où le trouver']]) assert.ok(read(f).includes(lede), f);
});

test('collectibles : tableau de bord, plan de fiche, anneau de progression, frise d’état ; sections dans l’ordre', () => {
  const d = doc('collectibles.html');
  for (const id of ['col-documented', 'col-confirmed', 'col-located']) assert.ok(d.getElementById(id), id);
  assert.ok(d.querySelector('.col-dash') && d.querySelector('.col-blueprint') && d.querySelector('.col-ghost'), 'tableau de bord et plan de fiche');
  assert.ok(d.querySelector('#col-empty.col-empty--v770'), 'état vide v7.70');
  const ring = d.querySelector('.col-ring-wrap svg.col-ring .col-ring-fg');
  assert.ok(ring && ring.getAttribute('pathLength') === '100', 'anneau avec pathLength 100');
  assert.ok(d.getElementById('col-percent'), 'pourcentage');
  const etat = d.querySelector('#etat ol.col-etat');
  assert.ok(etat && etat.querySelectorAll('li').length >= 3, 'frise d’état');
  const ids = [...d.querySelectorAll('main section[id]')].map(s => s.id);
  const order = ['wyman', 'categories', 'catalogue', 'carnet', 'sorties', 'etat', 'heritage', 'explorer'];
  let last = -1; for (const id of order) { const i = ids.indexOf(id); assert.ok(i > last, 'section ' + id + ' après la précédente (' + ids.join(',') + ')'); last = i; }
  assert.match(read('collectibles.js'), /\.col-ring-fg/);
});

test('consommables : cartes « en un regard » lisibles, lede sans chiffre inventé, listes en cartes (cat-id) sur les trois catalogues', () => {
  const d = doc('nourriture.html');
  const cards = d.querySelectorAll('.cg-card');
  assert.ok(cards.length >= 6, 'cartes consommables');
  for (const c of cards) { assert.ok(c.querySelector('.cg-head h4'), 'nom en tête'); assert.ok(c.querySelector('.cg-top'), 'bloc du haut'); }
  assert.ok(read('nourriture.html').includes('Rockstar n’a publié ni prix ni effet chiffré'), 'lede');
  for (const f of ['nourriture.html', 'style.html', 'personnalisations.html']) {
    const p = doc(f);
    const rows = p.querySelectorAll('.cat-table tbody tr');
    assert.ok(rows.length >= 5, f + ' : lignes');
    for (const r of rows) {
      const id = r.querySelector('td.cat-c-nom .cat-id');
      assert.ok(id && id.querySelector('.cat-id-t .cat-nom') && id.querySelector('.cat-tags'), f + ' : identité de la ligne');
    }
  }
  const css = read('acquisitions.css');
  assert.match(css, /\.cat-table td\.cat-c-nom\{display:contents;?\}/);
  assert.match(css, /grid-template-areas:"id id id id st own" "eff p6 pr ou ou ou"/);
});

test('vêtements et style : les trois cartes de collection ont leurs effets ; personnalisations : plateau des ateliers avec carte', () => {
  const s = doc('style.html');
  assert.ok(s.querySelectorAll('.d-grid--collections > *').length === 3, 'trois cartes de collection');
  assert.match(read('acquisitions.css'), /\.d-grid--collections/);
  const p = doc('personnalisations.html');
  const board = p.querySelector('.ed-at-board');
  assert.ok(board && board.querySelector('figure.ed-at-map svg') && board.querySelector('.ed-at-side'), 'plateau avec carte');
  const ateliers = p.querySelectorAll('li.ed-at[data-atelier]');
  assert.ok(ateliers.length >= 8, 'ateliers');
  for (const a of ateliers) assert.ok(a.querySelector('.ed-at-n') && a.querySelector('.ed-at-visual') && a.querySelector('.ed-at-body'), 'atelier complet');
  assert.match(read('catalogue.js'), /\.ed-at-board/);
  assert.match(read('acquisitions.css'), /\.lk-loc-pin\.is-hot/);
});

test('trophées : le suivi en attente est un bilan (anneau, grades, fantômes) tant que la liste est vide', () => {
  const d = doc('trophees.html');
  const att = d.querySelector('.trophees-att');
  assert.ok(att, 'bloc d’attente');
  assert.ok(att.querySelector('.trophees-att-grades') && att.querySelectorAll('.trophees-att-grades li').length === 4, 'quatre grades');
  assert.ok(att.querySelector('.trophees-att-skel ol.trophees-ghosts'), 'fantômes');
  assert.ok(att.textContent.includes('Gardé sur cet appareil seulement.'), 'confidentialité');
  assert.match(read('trophees.css'), /\.trophees-ghost/);
});

test('achats : l’effet de pile revient à chaque visite (le choix de la grille n’est plus gardé) ; piles réduites de 15 %', () => {
  const js = read('achats-pile.js');
  assert.match(js, /sessionStorage\.removeItem\('lk_achats_vue'\)/);
  assert.doesNotMatch(js, /sessionStorage\.setItem\('lk_achats_vue'/);
  const css = read('style.css');
  assert.match(css, /\.lk-head-grid \.lk-stack\{max-width:442px/);
  assert.match(css, /\.fhero-in \.lk-stack\{max-width:408px/);
});

test('tuto : en-tête avec repères et capture, sommaire numéroté avec progression, aucun nom de fournisseur', () => {
  const d = doc('tuto.html');
  assert.ok(d.querySelector('.t-hero-in .t-hero-txt .t-hero-acts') && d.querySelector('.t-hero-in figure.t-hero-fig img'), 'en-tête');
  const facts = d.querySelectorAll('ul.t-hero-facts li');
  assert.ok(facts.length === 4, 'quatre repères');
  assert.ok(d.querySelector('.t-aside-prog [data-t-prog]') && d.querySelector('[data-t-prog-txt]'), 'progression du sommaire');
  assert.match(d.querySelector('[data-t-prog-txt]').textContent, /Chapitre 1 sur \d+/);
  assert.match(read('tuto.js'), /data-t-prog/);
  assert.doesNotMatch(read('tuto.html'), /Claude/);
});

test('mentions : mise en page v7.70 (cartes, tableau en cartes, frise)', () => {
  const css = read('informations.css');
  assert.match(css, /\.ed-zone--legal/);
  assert.match(css, /\.ed-zone--legal .*table/);
  assert.ok(doc('mentions-legales.html').querySelector('.ed-zone--legal'), 'zone légale');
});

test('calculateur : « Et si » du plan en mode expert (gain horaire ou première mission)', () => {
  const sc = read('calculateurs-scenario.js'), plan = read('calculateurs-plan.js');
  assert.match(sc, /plan:\['totalMinutes','Temps de jeu jusqu’au but du plan','min',-1\]/);
  assert.match(sc, /\['plan','situation','hourly'\]/);
  assert.match(sc, /\['plan','missions',i,'reward'\]/);
  assert.match(plan, /fold\('plan-sensitivity'/);
  assert.match(plan, /sensitivity\('plan'/);
});

test('carte : le calcul de trajet donne un temps pour chaque moyen de déplacement, hélicoptère compris (référence GTA V, à part)', () => {
  const js = read('carte.js');
  assert.match(js, /id:'helico',\s*nom:'En hélicoptère'/);
  assert.match(js, /rl-list--all/);
  for (const id of ['pied', 'course', 'velo', 'moto', 'voiture', 'bateau', 'helico', 'avion']) assert.ok(new RegExp("id:'" + id + "'").test(js), 'mode ' + id);
  assert.match(read('style.css'), /\.rl-list--all/);
  const faq = read('carte.html');
  assert.ok(faq.includes('à pied, en courant, à vélo, moto, voiture, bateau, hélicoptère, avion'), 'FAQ');
});

test('« Claude » n’apparaît plus pour le visiteur, sauf dans les Mentions (cinq langues : pages, scripts, index de Léo)', () => {
  const visible = html => html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<!--[\s\S]*?-->/g, '').replace(/<[^>]+>/g, ' ');
  const stripJs = js => js.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"])\/\/[^\n]*/g, '$1');
  for (const l of LANGS) {
    for (const f of ['index.html', 'tuto.html', 'a-propos.html', 'calculateurs.html', 'contact.html', 'carte.html']) assert.doesNotMatch(visible(read(l + f)), /Claude/, l + f);
    for (const f of ['lk-ia.js', 'leo-ui.js', 'calculateurs-hub.js', 'calculateurs.js']) assert.doesNotMatch(stripJs(read(l + f)), /Claude/, l + f);
    const idx = JSON.parse(read(l + 'leo-index.json'));
    assert.doesNotMatch(JSON.stringify(idx), /Claude/, l + 'leo-index.json');
    assert.ok(read(l + 'mentions-legales.html').includes('Claude'), l + 'mentions-legales.html nomme le fournisseur');
    assert.doesNotMatch(visible(read(l + 'mentions-legales.html')), /IA Claude|Claude AI|Claude-KI/, l + 'mentions : plus de « IA Claude » comme nom d’un mode');
  }
  const ia = read('lk-ia.js');
  assert.match(ia, /data-lkia-mode="ia">IA</);
  assert.match(ia, /Réponse de l’IA\./);
  for (const [l, w] of [['en/', 'AI'], ['es/', 'IA'], ['it/', 'IA'], ['de/', 'KI']]) assert.ok(read(l + 'lk-ia.js').includes('data-lkia-mode="ia">' + w + '<'), l + 'lk-ia.js : bouton ' + w);
});
