'use strict';
/* v7.95 (lot A, « une page par élément ») : les pages écrites par outils/gen-pages-elements.cjs (lieux de la carte, quartiers,
   villes et comtés, consommables). Bloquant : couverture à 100 % des familles du lot, pages à jour, titre et description
   uniques et bornés, une seule balise h1, canonical, balise robots selon le seuil d’indexation, hreflang de chaque langue sur
   une page indexable et aucun sur une page noindex (v7.97, lot C), fil d’Ariane en JSON-LD valide, poids borné, aucun signe d’écriture automatique dans
   le texte visible, et les liens qui relient la carte, le carnet, la liste des consommables et les hubs à ces pages. */
const test = require('node:test'), assert = require('node:assert'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), { execFileSync, spawnSync } = require('node:child_process');
const ROOT = path.resolve(__dirname, '../..'), read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const INDEX = JSON.parse(read('outils/pages-elements-index.json'));
const PAGES = Object.keys(INDEX.pages);
/* v7.97 (lot C) : les langues publiées et les pages que chacune traduit (une famille peut être traduite dans une langue avant les autres) */
const LCFG = require(path.join(ROOT, 'outils/langues.cjs')).config(ROOT), LANGS = LCFG.langues.filter(l => l.etat === 'publiee' && l.code !== 'fr');
const INV = JSON.parse(execFileSync(process.execPath, [path.join(ROOT, 'outils/couverture-pages.cjs'), '--json'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }));
const fam = id => INV.familles.find(f => f.id === id);
const texte = html => html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/g, ' ');

test('lot A : lieux de la carte, quartiers et comtés, consommables couverts à 100 % (une page par élément, aucun manquant)', () => {
  for (const id of ['lieux-carte', 'quartiers-comtes', 'consommables']) { const f = fam(id); assert.equal(f.bilan.manque, 0, id + ' : éléments sans page'); for (const it of f.items) assert.ok(it.page && fs.existsSync(path.join(ROOT, it.page)), id + ' : ' + it.id + ' a sa page'); }
  assert.ok(fam('lieux-carte').bilan.n >= 3244, fam('lieux-carte').bilan.n + ' lieux'); /* v7.99 : 2 500, puis 3 244 avec l’import gtadb */ assert.equal(fam('consommables').bilan.n, 30);
  assert.ok(PAGES.length >= 3244 + 41 + 30 + 2, PAGES.length + ' pages dans l’index');
});
test('lot A : les pages sont à jour (gen-pages-elements --verifier ne trouve rien à réécrire)', () => {
  const r = spawnSync(process.execPath, [path.join(ROOT, 'outils/gen-pages-elements.cjs'), '--verifier'], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
});
test('lot A : titre et description uniques et bornés, un seul h1, canonical, robots selon le seuil, hreflang selon robots, JSON-LD valide, poids borné', () => {
  const titres = new Map(), descs = new Map(); const strict = new Map(); for (const f of INV.familles) for (const it of f.items) if (it.page) strict.set(it.page, !!it.indexable); /* v7.96 : seuil du prompt pour les lieux aussi (deux informations réelles) */
  for (const file of PAGES) {
    const dec = x => x.replace(/&quot;/g, '"').replace(/&#39;/g, '’').replace(/&amp;/g, '&');
    const html = read(file), t = dec(html.match(/<title>([^<]*)<\/title>/)[1]), d = dec(html.match(/<meta name="description" content="([^"]*)"/)[1]);
    assert.ok(t.replace(/ \| Leonidakit$/, '').length <= 65 && /GTA[ \u00a0\u202f]6/.test(t), file + ' : titre « ' + t + ' »');
    assert.ok(d.length > 40 && d.length <= 160, file + ' : description de ' + d.length + ' signes');
    assert.ok(!titres.has(t), file + ' : titre déjà pris par ' + titres.get(t)); titres.set(t, file);
    assert.ok(!descs.has(d), file + ' : description déjà prise par ' + descs.get(d)); descs.set(d, file);
    assert.equal((html.match(/<h1\b/g) || []).length, 1, file + ' : un seul h1');
    const canon = 'https://www.leonidakit.com/' + file.replace(/(^|\/)index\.html$/, '$1'); assert.ok(html.includes('<link rel="canonical" href="' + canon + '">'), file + ' : canonical');
    const robots = html.match(/<meta name="robots" content="([^"]*)"/)[1]; const idx = strict.has(file) ? strict.get(file) : true;
    assert.equal(/noindex/.test(robots), !idx, file + ' : robots « ' + robots + ' » pour une page ' + (idx ? 'indexable' : 'non indexable'));
    /* v7.97 (lot C) : une page indexable porte un hreflang par langue qui la traduit (outils/langues.json, « exclure » global ou propre à la langue) et x-default ; une page noindex ou sans traduction n’en porte aucun */
    const hl = [...html.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="/g)].map(m => m[1]).sort().join(',');
    const tr = LANGS.filter(l => l.pages.includes(file)).map(l => l.code); const attendu = idx && tr.length ? ['fr', ...tr, 'x-default'].sort().join(',') : '';
    assert.equal(hl, attendu, file + ' : hreflang « ' + hl + ' » (attendu « ' + attendu + ' »)');
    for (const c of tr) assert.ok(fs.existsSync(path.join(ROOT, LANGS.find(l => l.code === c).dossier, file)), file + ' : version ' + c);
    for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) JSON.parse(m[1]);
    assert.ok(/"@type":"BreadcrumbList"/.test(html), file + ' : BreadcrumbList');
    /* une page de groupe ou un sommaire est une CollectionPage avec sa liste ; une fiche est une WebPage sur son élément */
    assert.ok((/^quartiers\/|index\.html$/.test(file) ? /"@type":"CollectionPage"[^<]*"@type":"ItemList"/ : /"@type":"WebPage"[^<]*"about":\{"@type":"Thing"/).test(html), file + ' : données structurées de la page');
    /* gabarit allégé : une fiche de lieu ou de consommable tient sous 40 Ko ; une page de groupe liste jusqu’à 300 lieux (sous 120 Ko) */
    assert.ok(Buffer.byteLength(html) < (/^quartiers\/|index\.html$/.test(file) ? 120 : 40) * 1024, file + ' : ' + Buffer.byteLength(html) + ' octets');
    assert.ok(html.includes('class="lk-langbar"'), file + ' : barre de langue');
    /* les citations exactes (« … ») gardent leur ponctuation d’origine ; le reste du texte visible n’a aucun signe d’écriture automatique */
    const tx = texte(html), hors = tx.replace(/«[^»]*»/g, ' '); assert.ok(!/[—·→↑↓]| \/ /.test(hors), file + ' : signe d’écriture automatique dans le texte visible');
    /* phrases construites : pas d’article mal contracté, pas d’élision oubliée, pas de nom de comté redit, pas de double parenthèse */
    const faute = tx.match(/(?<!\p{L})(?:de|à) (?:le|les) (?!\p{L}*[’'])|(?<!\p{L})[Cc]e [aeiouyé]|comté Comté|\) \(|Tout la |(?<!\p{L})de de(?!\p{L})/u);
    assert.ok(!faute, file + ' : tournure fautive « ' + (faute && faute[0]) + ' »');
    /* un lieu qui porte des guillemets droits dans les données est un surnom : jamais affiché avec ses guillemets droits */
    assert.ok(!/"[A-Z][^"]{2,40}"/.test(tx), file + ' : nom entre guillemets droits');
  }
});
test('lot A : la carte, le carnet, la liste des consommables et les hubs mènent aux pages', () => {
  const ctx = { window: {} }; vm.runInNewContext(read('carte-gtadb.js'), ctx); const G = ctx.window.LK_GTADB;
  const lieux = fam('lieux-carte'), groupes = fam('quartiers-comtes');
  for (const it of lieux.items) { const p = G.lieux.find(x => x.id === it.id); if (!p) continue; assert.equal(p.pg, '/' + it.page, it.id + ' : pg de la carte'); }
  for (const it of groupes.items) { const p = G.groupes.find(x => x.id === it.id); if (!p) continue; assert.equal(p.pg, '/' + it.page, it.id + ' : pg du groupe'); }
  assert.ok(/p\.pg \?/.test(read('outils/sources/carte.js')) && /Ouvrir sa page/.test(read('carte.js')), 'carte.js : lien « Ouvrir sa page »');
  const L = { window: {} }; vm.runInNewContext(read('carnets/lieux-data.js'), L); let n = 0;
  for (const r of L.window.LK_CARNET_LIEUX.rows) if (r[5]) { n++; assert.ok(fs.existsSync(path.join(ROOT, r[5].slice(1))), r[0] + ' : ' + r[5]); }
  assert.ok(n >= 3244, n + ' lignes du carnet avec leur page');
  const nourriture = read('nourriture.html'); for (const it of fam('consommables').items) assert.ok(nourriture.includes('class="cat-page" href="' + it.page + '"'), 'nourriture.html : lien vers ' + it.page);
  for (const f of ['carte.html', 'lieux.html']) assert.ok(read(f).includes('href="lieux-carte/index.html"') && read(f).includes('href="quartiers/index.html"'), f + ' : liens vers les sommaires');
  assert.ok(/sa page/.test(read('outils/langues/en/v795.json')), 'traductions des textes nouveaux');
});
test('lot A : chaque page de lieu relie son groupe, la carte et ses voisins ; chaque page de groupe liste ses lieux', () => {
  const G = fam('quartiers-comtes'), L = fam('lieux-carte');
  let voisins = 0;
  for (const it of L.items.slice(0, 400)) { const html = read(it.page); assert.ok(html.includes('carte.html#lieu=' + encodeURIComponent(it.id)), it.id + ' : lien vers la carte'); if (/id="proches"/.test(html)) voisins++; assert.ok(html.includes('data-track="lieux" data-track-id="' + it.id + '"'), it.id + ' : suivi'); }
  assert.ok(voisins >= 390, voisins + ' pages sur 400 avec des voisins');
  for (const g of G.items.filter(x => x.cible && x.page === x.cible)) { const html = read(g.page); const membres = L.items.filter(l => l.page && read(l.page).includes('href="../' + g.page + '"')).length; if (membres) assert.ok(html.includes('id="lieux"'), g.id + ' : liste des lieux'); }
});
