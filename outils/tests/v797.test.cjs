'use strict';
/* v7.97 (lot C, « une page par élément », première livraison : l’anglais des lieux en premier, Téva, 18 octobre) : les familles
   des lots A et B traduites dans les langues qui ne les excluent plus (outils/langues.json, « exclure » global ou propre à
   la langue) : hreflang, barre de langue vers la page traduite, aucun texte sans traduction ; la recherche du site et Léo
   ouvrent la page de l’élément dans la langue du visiteur ; les familles du lot B connues de Léo ; IndexNow au-delà de
   10 000 adresses. */
const test = require('node:test'), assert = require('node:assert'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const ROOT = path.resolve(__dirname, '../..'), read = f => fs.readFileSync(path.join(ROOT, f), 'utf8'), exists = f => fs.existsSync(path.join(ROOT, f));
const L = require(path.join(ROOT, 'outils/langues.cjs')), CFG = L.config(ROOT), LANGS = CFG.langues.filter(l => l.etat === 'publiee' && l.code !== 'fr');
const INDEX = JSON.parse(read('outils/pages-elements-index.json')), PAGES = Object.keys(INDEX.pages);
const LOTS = ['lieux-carte', 'quartiers', 'consommables', 'coiffures', 'tatouages', 'tenues', 'perso-vehicules', 'perso-armes', 'options-vehicules', 'options-armes', 'marques', 'munitions', 'editions', 'achats', 'visuels', 'moments'];
/* langues qui traduisent un dossier : celles dont la liste des pages contient son sommaire */
const traduit = d => LANGS.filter(l => l.pages.includes(d + '/index.html') || l.pages.some(p => p.startsWith(d + '/')));
const texte = html => html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/g, ' ');

test('lot C : l’anglais des lieux et des quartiers d’abord ; chaque dossier traduit dans une langue l’est en entier, chaque page a son fichier', () => {
  for (const d of ['lieux-carte', 'quartiers']) assert.ok(traduit(d).some(l => l.code === 'en'), d + '/ en anglais');
  for (const d of LOTS) for (const LG of traduit(d)) { const ps = PAGES.filter(p => p.startsWith(d + '/')); assert.ok(ps.length, d); for (const p of ps) assert.ok(LG.pages.includes(p) && exists(LG.dossier + '/' + p), LG.code + '/' + p); }
  for (const d of LOTS) for (const LG of LANGS.filter(l => !traduit(d).includes(l))) assert.ok(!exists(LG.dossier + '/' + d), LG.dossier + '/' + d + ' : dossier d’une famille non traduite dans cette langue');
});

test('lot C : pages traduites des lots : langue, titre avec « GTA 6 », description bornée, un h1, canonical dans la langue, hreflang selon robots, barre de langue, aucun signe d’écriture automatique', () => {
  /* un échantillon par famille et par langue (le contrôle complet des pages traduites est dans langues.test.cjs) */
  for (const d of LOTS) for (const LG of traduit(d)) {
    const ps = PAGES.filter(p => p.startsWith(d + '/')), sample = [ps[0], ps[Math.floor(ps.length / 2)], ps[ps.length - 1]].filter((p, i, a) => p && a.indexOf(p) === i);
    for (const p of sample) {
      const html = read(LG.dossier + '/' + p), fr = read(p), t = (html.match(/<title>([^<]*)<\/title>/) || [, ''])[1], desc = (html.match(/<meta name="description" content="([^"]*)"/) || [, ''])[1];
      assert.match(html, new RegExp('^<!DOCTYPE html>\\s*<html lang="' + LG.code + '"', 'i'), LG.code + '/' + p + ' : lang');
      assert.ok(/GTA[   ]6/.test(t) && t.replace(/ \| Leonidakit$/, '').length <= 70, LG.code + '/' + p + ' : titre « ' + t + ' »');
      assert.ok(desc.length > 30 && desc.length <= 170, LG.code + '/' + p + ' : description de ' + desc.length + ' signes');
      assert.equal((html.match(/<h1\b/g) || []).length, 1, LG.code + '/' + p + ' : un seul h1');
      assert.ok(html.includes('<link rel="canonical" href="https://www.leonidakit.com/' + LG.dossier + '/' + p.replace(/(^|\/)index\.html$/, '$1') + '">'), LG.code + '/' + p + ' : canonical');
      const noindex = /<meta name="robots" content="[^"]*noindex/.test(fr); assert.equal(/<meta name="robots" content="[^"]*noindex/.test(html), noindex, LG.code + '/' + p + ' : robots comme la page française');
      assert.equal(/<link rel="alternate" hreflang="x-default"/.test(html), !noindex, LG.code + '/' + p + ' : hreflang selon robots');
      const rel = '../'.repeat(p.split('/').length) + p.replace(/(^|\/)index\.html$/, '$1'); assert.ok(html.includes('class="lk-langbar"') && html.includes('<a href="' + rel + '" hreflang="fr" lang="fr" data-lk-lang="fr"'), LG.code + '/' + p + ' : barre de langue vers la page française');
      const tx = texte(html).replace(/«[^»]*»|“[^”]*”|„[^“]*“/g, ' '); assert.ok(!/[—·→↑↓]| \/ /.test(tx), LG.code + '/' + p + ' : signe d’écriture automatique');
    }
  }
});

test('lot C : la recherche du site et Léo ouvrent la page de l’élément (lieux, catalogues, achats), dans la langue du visiteur ; Léo connaît marques, munitions, éditions et moments', () => {
  const idx = { window: {} }; vm.runInNewContext(read('search-index.js'), idx); vm.runInNewContext(read('search-lieux.js'), idx);
  assert.ok(idx.window.LK_INDEX.some(e => e.l === 'Des milliers de tenues' && e.u === '/tenues/milliers-de-tenues.html'), 'tenue : sa page');
  const lieu = idx.window.LK_INDEX_LIEUX.find(e => e.l === 'Ambrosia Police Department'); assert.ok(lieu && lieu.u === '/lieux-carte/ambrosia-police-department.html', 'lieu : ' + JSON.stringify(lieu && lieu.u));
  const marque = idx.window.LK_INDEX.find(e => e.u === '/marques/albany.html'); assert.ok(marque && marque.k === 'Marque de véhicules', 'marque');
  assert.ok(idx.window.LK_INDEX.some(e => e.l === 'Style de Vice City' && e.u === '/achats/style-vice-city.html'), 'achat sans fiche : sa page');
  const monde = JSON.parse(read('leo/monde.json')).items; const vc = monde.find(i => i.key === 'style:style-vice-city'); assert.ok(vc && vc.url === '/achats/style-vice-city.html', 'Léo : l’achat ouvre sa page');
  for (const LG of LANGS) {
    const T = { window: {} }; vm.runInNewContext(read(LG.dossier + '/search-index.js'), T); vm.runInNewContext(read(LG.dossier + '/search-lieux.js'), T);
    const enLieu = traduit('lieux-carte').includes(LG); assert.ok(T.window.LK_INDEX_LIEUX.some(e => e.u === (enLieu ? '/' + LG.dossier : '') + '/lieux-carte/ambrosia-police-department.html'), LG.code + ' : le lieu ouvre sa page ' + (enLieu ? 'traduite' : 'française'));
    const enTenue = traduit('tenues').includes(LG); assert.ok(T.window.LK_INDEX.some(e => e.u === (enTenue ? '/' + LG.dossier : '') + '/tenues/milliers-de-tenues.html'), LG.code + ' : la tenue ouvre sa page');
  }
  const core = JSON.parse(read('leo-index.json')); for (const k of ['marque:albany']) assert.ok(core.names.some(n => n[0] === k), 'Léo connaît ' + k);
  assert.ok(core.names.some(n => /^moment:/.test(n[0])), 'Léo connaît les grands moments');
  const lieux = JSON.parse(read('leo/lieux.json')); const o = {}; lieux.packed.forEach((k, i) => o[k] = lieux.items[0][i]); assert.ok(o.id && o.name, 'lieux.json lisible');
});

test('IndexNow : au-delà de 10 000 adresses fraîches, plusieurs envois à la suite (rien n’est perdu)', async () => {
  const H = require(path.join(ROOT, 'api/indexnow.js'));
  const urls = []; for (let i = 0; i < 12345; i++) urls.push('<url><loc>https://www.leonidakit.com/p' + i + '.html</loc><lastmod>2026-10-20</lastmod></url>');
  const xml = '<urlset>' + urls.join('') + '</urlset>'; const posts = [];
  const fetch = async (url, o = {}) => { if (url === 'https://www.leonidakit.com/sitemap.xml') return { ok: true, status: 200, text: async () => xml }; if (url === 'https://api.indexnow.org/indexnow') { posts.push(JSON.parse(o.body).urlList.length); return { status: 202, ok: true }; } throw Error('appel inattendu ' + url); };
  const run = (h, headers) => new Promise(resolve => { const res = { statusCode: 0, setHeader() {}, end(s) { resolve({ status: this.statusCode, body: JSON.parse(s) }); } }; h({ method: 'GET', headers }, res); });
  const h = H.createHandler({ env: { CRON_SECRET: 's' }, fetch, now: () => Date.parse('2026-10-21T06:00:00Z') });
  const r = await run(h, { authorization: 'Bearer s' });
  assert.equal(r.status, 200); assert.deepEqual(posts, [10000, 2345]); assert.equal(r.body.envoyees, 12345); assert.equal(r.body.statut, 202);
});
