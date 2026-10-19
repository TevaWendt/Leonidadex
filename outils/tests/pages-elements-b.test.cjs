'use strict';
/* v7.96 (lot B, « une page par élément ») : les pages écrites par outils/gen-pages-elements-b.cjs (coiffures, tatouages, tenues,
   personnalisations, valeurs d’options, marques, munitions, éditions, achats sans fiche, visuels officiels, grands moments) et les
   liens qui y mènent depuis les listes et les hubs. Les contrôles communs à toutes les pages (titre, description, h1, canonical,
   robots, JSON-LD, poids, texte) sont dans pages-elements.test.cjs, qui parcourt tout l’index. v7.97 (lot C) : l’index
   outils/elements-index.json (recherche et Léo pour les marques, les types de munitions, les éditions et les grands moments). */
const test = require('node:test'), assert = require('node:assert'), fs = require('node:fs'), path = require('node:path'), { execFileSync } = require('node:child_process');
const ROOT = path.resolve(__dirname, '../..'), read = f => fs.readFileSync(path.join(ROOT, f), 'utf8'), exists = f => fs.existsSync(path.join(ROOT, f));
const INDEX = JSON.parse(read('outils/pages-elements-index.json'));
const INV = JSON.parse(execFileSync(process.execPath, [path.join(ROOT, 'outils/couverture-pages.cjs'), '--json'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }));
const fam = id => INV.familles.find(f => f.id === id);
const LOT_B = ['coiffures', 'tatouages', 'tenues', 'perso-vehicules', 'perso-armes', 'options-perso-vehicules', 'options-perso-armes', 'marques', 'munitions', 'editions', 'achats', 'visuels', 'moments'];

test('lot B : toutes les familles couvertes à 100 % (une page par élément, aucun manquant), un sommaire par famille', () => {
  for (const id of LOT_B) { const f = fam(id); assert.equal(f.bilan.manque, 0, id + ' : éléments sans page'); for (const it of f.items) assert.ok(it.page && exists(it.page), id + ' : ' + it.id + ' sans page'); }
  for (const d of ['coiffures', 'tatouages', 'tenues', 'perso-vehicules', 'perso-armes', 'options-vehicules', 'options-armes', 'marques', 'munitions', 'visuels', 'moments']) assert.ok(exists(d + '/index.html') && INDEX.pages[d + '/index.html'], d + '/index.html');
  assert.equal(INV.familles.filter(f => !f.modele).reduce((n, f) => n + f.bilan.manque, 0), 0, 'plus aucun élément sans page hors familles modèles');
});
test('lot B : les listes et les hubs mènent aux pages (catalogues, marques, munitions, éditions, achats, visuels, moments)', () => {
  for (const [f, hub] of [['coiffures', 'style.html'], ['tatouages', 'style.html'], ['tenues', 'style.html'], ['perso-vehicules', 'personnalisations.html'], ['perso-armes', 'personnalisations.html']]) { const h = read(hub); for (const it of fam(f).items) assert.ok(h.includes('class="cat-page" href="' + it.page + '"'), hub + ' : lien vers ' + it.page); }
  assert.ok(read('vehicules.html').includes('href="marques/index.html"'), 'vehicules.html : sommaire des marques');
  assert.ok(read('armes.html').includes('href="munitions/index.html"'), 'armes.html : sommaire des munitions');
  const ed = read('editions.html'); for (const it of fam('editions').items) if (it.id !== 'collector' || ed.includes('editions/collector.html')) assert.ok(ed.includes('href="' + it.page + '"'), 'editions.html : lien vers ' + it.page);
  const med = read('medias.html'); for (const it of fam('visuels').items) assert.ok(med.includes('class="media-page" href="' + it.page + '"'), 'medias.html : lien vers ' + it.page);
  const ac = read('actus.html'); for (const it of fam('moments').items.filter(x => !x.doublonDe && /^moments\//.test(x.cible) && x.note.includes('annonce'))) assert.ok(ac.includes('href="' + it.page + '"'), 'actus.html : lien vers ' + it.page);
  for (const it of fam('achats').items.filter(x => x.cible && x.page === x.cible)) { const html = read(it.page); const m = html.match(/<a class="fiche-meth-a" href="\.\.\/([a-z-]+\.html)#([a-z0-9-]+)">Sa carte/); assert.ok(m, it.page + ' : lien vers sa carte'); assert.ok(read(m[1]).includes('href="' + it.page + '"'), m[1] + ' : lien vers ' + it.page); }
  /* fiches : le constructeur mène à sa marque, le type de munitions à sa page */
  assert.ok(/href="\.\.\/marques\/albany\.html">Albany<\/a>/.test(read('vehicules/albany-emperor.html')), 'fiche véhicule : lien vers la marque');
  assert.ok(/href="\.\.\/munitions\/munitions-de-pistolet\.html">Munitions de pistolet<\/a>/.test(read('armes/girardi-es9.html')), 'fiche d’arme : lien vers le type de munitions');
  /* dossiers du monde : la chronologie mène aux pages des moments */
  assert.ok(read('lieux/vice-city.html').includes('class="lkd-ev-page" href="/moments/trailer-1.html"'), 'dossier Vice City : lien vers le moment');
});
test('lot B : chaque valeur d’option relie son poste et réciproquement ; chaque marque liste ses véhicules ; chaque visuel liste ses reprises', () => {
  for (const f of ['perso-vehicules', 'perso-armes']) {
    const opts = fam('options-' + f).items;
    for (const it of opts.slice(0, 60)) { const poste = fam(f).items.find(p => p.id === it.suffixe); assert.ok(poste && read(it.page).includes('href="../' + poste.page + '"'), it.page + ' : lien vers le poste'); assert.ok(read(poste.page).includes('href="../' + it.page + '"'), poste.page + ' : lien vers ' + it.page); }
  }
  const V = (() => { const c = { window: {} }; require('node:vm').runInNewContext(read('vehicules-data.js'), c); return c.window.LK_VEHICULES; })();
  for (const it of fam('marques').items) { const html = read(it.page), vs = V.filter(v => v.marque === it.nom); for (const v of vs) assert.ok(html.includes('href="../vehicules/' + v.id + '.html"'), it.page + ' : ' + v.id); assert.equal(/noindex/.test(html), vs.length === 0, it.page + ' : robots'); }
  let decrites = 0; for (const it of fam('visuels').items) { const html = read(it.page); if (/"@type":"ImageObject"/.test(html)) decrites++; assert.ok(html.includes('img/officiel/' + it.id + '-'), it.page + ' : image'); }
  assert.ok(decrites >= 190, decrites + ' pages de visuel avec ImageObject');
  for (const it of fam('moments').items.filter(x => !x.doublonDe)) { const html = read(it.page); assert.ok(/<time datetime="\d{4}-\d{2}/.test(html), it.page + ' : date'); }
});
test('lot C : la recherche du site et Léo connaissent les marques, les types de munitions, les éditions et les grands moments (outils/elements-index.json)', () => {
  const EI = JSON.parse(read('outils/elements-index.json'));
  assert.ok(EI.recherche.length >= 51 + 6 + 4 + 20 && EI.leo.length === EI.recherche.length - 6 - 4, EI.recherche.length + ' lignes'); /* types de munitions et éditions : recherche seulement */
  const kinds = new Set(EI.leo.map(r => r.kind)); for (const k of ['marque', 'moment']) assert.ok(kinds.has(k), 'Léo : ' + k);
  for (const r of EI.recherche) { assert.ok(/^\/(marques|munitions|editions|moments)\/[a-z0-9-]+\.html$/.test(r.u) && exists(r.u.slice(1)), r.l + ' : ' + r.u); assert.ok(r.l && r.k && r.s, r.l); }
  for (const r of EI.leo) { assert.ok(/^(marque|moment):[a-z0-9-]+$/.test(r.key) && exists(r.url.slice(1)) && r.proof && r.category, r.key); assert.ok(!/[—·→↑↓]/.test(r.proof + r.category), r.key + ' : signe d’écriture automatique'); }
  /* l’index de recherche publié et l’index de Léo les reprennent */
  const idx = read('search-index.js'); for (const r of EI.recherche) assert.ok(idx.includes(JSON.stringify(r.u)), 'search-index.js : ' + r.u);
  const leo = JSON.parse(read('leo/monde.json')); const keys = new Set(leo.items.map(i => i.key)); for (const r of EI.leo) assert.ok(keys.has(r.key), 'leo/monde.json : ' + r.key);
  /* les lieux de la carte et les lignes des catalogues ouvrent leur page */
  const lieux = read('search-lieux.js'), nPages = (lieux.match(/"u":"\/(?:lieux-carte|quartiers)\/[a-z0-9-]+\.html"/g) || []).length;
  assert.ok(nPages >= 2400 && !/"u":"\/carte\.html#lieu=g-L832"/.test(lieux), 'search-lieux.js : ' + nPages + ' résultats ouvrent la page du lieu');
  assert.ok(/"u":"\/tenues\/milliers-de-tenues\.html"/.test(idx), 'search-index.js : une ligne de catalogue ouvre sa page');
});
