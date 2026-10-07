/* Section « Animaux » (section animaux) : données (statuts, sources, visuels, recadrages), page principale construite par
   la mécanique des hubs du monde, fiches (statut, sources, gros plans), « En lien » des fiches lieux, menu, recherche,
   plan du site, Léo, langues.
   NODE_PATH=<dépendances>/node_modules node --test outils/tests/section-animaux.test.cjs */
'use strict';
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const { JSDOM } = require('jsdom');
const root = process.env.SITE_ROOT || path.resolve(__dirname, '../..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const G = require(path.join(root, 'outils/gen-animaux.cjs'));
const M = require(path.join(root, 'outils/hubs-monde.cjs'));
const doc = f => new JSDOM(read(f)).window.document;
const ld = d => [...d.querySelectorAll('script[type="application/ld+json"]')].map(s => JSON.parse(s.textContent));
const A = JSON.parse(read('outils/editorial-animaux.json'));
const FICHES = A.fiches.map(x => 'animaux/' + x.id + '.html');
const PAGES = ['animaux.html', ...FICHES];

test('données : fiches complètes et sourcées, statuts « officiel » ou « vu », sources nouvelles datées, recadrages présents', () => {
  const ctx = G.load(root);
  assert.doesNotThrow(() => G.check(ctx, root));
  assert.ok(A.fiches.length >= 5);
  for (const x of A.fiches) {
    assert.ok(['officiel', 'vu'].includes(x.statut), x.id + ' : une fiche par animal réellement montré ou nommé');
    assert.ok(x.sources.length >= 2, x.id);
    assert.deepEqual(Object.keys(x).filter(k => ['characters', 'businesses', 'residences', 'hideouts'].includes(k)), [], x.id + ' : reliée aux régions seulement');
  }
  for (const [id, s] of Object.entries(A.sources)) { assert.equal(s.consultedAt, '2026-10-04', id); assert.match(s.url, /^https:\/\//); assert.doesNotMatch(s.url + s.title, /leak|fuite/i); }
  /* une source déjà connue du site n’est pas redéfinie */
  const old = JSON.parse(read('outils/editorial-hubs.json')).sources; for (const id of Object.keys(A.sources)) assert.ok(!old[id], id);
  /* recadrages : webp légers, à côté de leur capture officielle d’origine */
  const zooms = A.fiches.flatMap(x => x.zoom || []); assert.ok(zooms.length >= 3);
  for (const z of zooms) { const f = path.join(root, z.src.slice(1)); assert.ok(fs.existsSync(f), z.src); assert.ok(fs.statSync(f).size < 60000, z.src + ' : léger'); assert.ok(ctx.MED[z.media], z.media); }
  /* le contrôle refuse une fiche mal formée */
  const bad = (f, re) => { const c = JSON.parse(JSON.stringify(ctx)); f(c.A.fiches[0]); assert.throws(() => G.check(c, root), re); };
  bad(x => { x.sources = ['inventee']; }, /source inconnue/);
  bad(x => { x.media = ['inconnu']; }, /visuel inconnu/);
  bad(x => { x.characters = ['jason']; }, /seules les régions/);
  bad(x => { x.statut = 'peut-etre'; }, /statut inconnu/);
  bad(x => { x.zoom = [{ src: '/img/animaux/absent.webp', w: 480, h: 270, media: 'grassrivers-04', alt: 'a', legende: 'b' }]; }, /recadrage introuvable/);
});

test('animaux.html : mécanique des hubs du monde (grille, zone éditoriale complète, encart du calculateur), données structurées', () => {
  assert.ok(M.HUBS.includes('animaux'));
  const d = doc('animaux.html');
  assert.equal(d.querySelectorAll('h1').length, 1); assert.equal(d.querySelector('h1').textContent, A.section.title);
  assert.ok(d.querySelector('meta[name="description"]').content.length <= 160);
  /* v7.69 : mosaïque de la section (outils/gen-animaux.cjs) : une carte par fiche, filtre par famille, chiffres sourcés, régions */
  assert.equal(d.querySelectorAll('#fiches .an-card').length, A.fiches.length);
  for (const x of A.fiches) assert.ok(d.querySelector('#fiches a.an-card[href="animaux/' + x.id + '.html"][data-fam="' + G.famOf(x.kind).id + '"]'), x.id);
  const fams = [...d.querySelectorAll('.an-filter input[name="an-fam"]')].map(i => i.value);
  assert.deepEqual(fams, ['tout', ...G.FAMILIES.filter(f => A.fiches.some(x => G.famOf(x.kind) === f)).map(f => f.id)]);
  const css = read('animaux.css'); for (const f of fams.slice(1)) assert.ok(css.includes('#an-fam-' + f + ':checked) .an-card:not([data-fam="' + f + '"])'), 'filtre CSS ' + f);
  assert.deepEqual([...d.querySelectorAll('.an-chiffres [data-lk-count]')].map(b => b.textContent), [...A.hub.chiffres.items.map(x => x.n), String(A.fiches.length)]);
  assert.ok(d.querySelector('.an-chiffres a[href="#src-' + A.hub.chiffres.source + '"]') && d.getElementById('src-' + A.hub.chiffres.source), 'chiffres : source de la page');
  for (const a of d.querySelectorAll('.an-regions a[href]')) { const h = a.getAttribute('href').split('#')[0]; assert.ok(fs.existsSync(path.join(root, h)), h); }
  assert.ok(d.querySelector('link[href^="animaux.css"]'), 'feuille de la section sur la page');
  assert.equal(read('animaux.html').split(G.HUB_START).length, 2, 'un seul bloc de la page');
  assert.deepEqual([...d.querySelectorAll('.ed-zone--monde section.ed')].map(s => s.id), ['rockstar', 'communaute', 'a-confirmer', 'pour-toi', 'faq', 'sources']);
  const w = M.words('animaux'); assert.ok(w >= 500 && w <= 800, w + ' mots');
  assert.equal(d.querySelectorAll('#sources .ed-srcs li').length, A.hub.sources.length);
  for (const a of d.querySelectorAll('.ed-nav a')) assert.ok(d.getElementById(a.getAttribute('href').slice(1)), a.getAttribute('href'));
  const types = ld(d).map(x => x['@type']); for (const t of ['BreadcrumbList', 'CollectionPage', 'FAQPage']) assert.ok(types.includes(t), t);
  const hub = d.querySelectorAll('.lk-entry-hub'); assert.equal(hub.length, 1, 'encart : la chasse rapporte selon Rockstar');
  const u = new URL(hub[0].querySelector('a').getAttribute('href'), 'https://www.leonidakit.com/animaux.html'); assert.equal(u.searchParams.get('tool'), 'activities'); assert.equal(u.searchParams.get('from'), 'animaux');
  assert.match(d.querySelector('.d-intro-note').textContent, /montrer un animal ne dit pas/);
  assert.equal(d.querySelectorAll('nav.lk-chips').length, 1);
});

test('fiches : gabarit des fiches du monde, statut et sources, gros plans crédités, aucun encart du calculateur', () => {
  assert.deepEqual(fs.readdirSync(path.join(root, 'animaux')).filter(f => f.endsWith('.html')).sort(), A.fiches.map(x => x.id + '.html').sort());
  for (const x of A.fiches) {
    const f = 'animaux/' + x.id + '.html', html = read(f), d = doc(f);
    assert.equal(d.querySelectorAll('h1').length, 1, f); assert.equal(d.querySelector('h1').textContent, x.name);
    assert.equal(d.querySelector('link[rel="canonical"]').href, 'https://www.leonidakit.com/' + f);
    assert.ok(d.querySelector('nav.crumbs a[href="../animaux.html"]'));
    assert.ok(d.querySelector('link[href^="../animaux.css"]'), f + ' : feuille de la section');
    assert.equal(html.split(G.START).length, 2, f + ' : un seul bloc de la section');
    assert.equal(html.split(G.ID_START).length, 2, f + ' : une seule carte d’identité');
    assert.ok(d.querySelector('.an-id .an-id-stamp') && d.querySelector('.an-id .pip--' + x.statut), f + ' : carte d’identité et tampon du statut');
    assert.equal(d.querySelectorAll('.animaux-fiche-src .ed-srcs li').length, x.sources.length, f);
    assert.ok(d.querySelector('.animaux-statut .pip--' + x.statut), f + ' : statut');
    assert.equal(d.querySelectorAll('.animaux-zoom figure').length, (x.zoom || []).length, f);
    for (const fig of d.querySelectorAll('.animaux-zoom figure')) { const img = fig.querySelector('img'); assert.ok(img.getAttribute('width') && img.getAttribute('alt')); assert.equal(img.getAttribute('loading'), 'lazy'); assert.match(fig.querySelector('figcaption').textContent, /Rockstar Games/); }
    assert.equal(d.querySelectorAll('.lk-entry-card').length, 0, f + ' : pas d’encart sur une fiche d’animal');
    for (const id of x.places) assert.ok(d.querySelector('a[href="../lieux/' + id + '.html"]'), f + ' → ' + id);
    for (const el of d.querySelectorAll('main a[href]')) { const h = el.getAttribute('href'); if (/^(https?:|#|mailto:)/.test(h)) continue; const p = h.startsWith('/') ? h.slice(1).split(/[?#]/)[0] : path.posix.normalize(path.posix.join('animaux', h.split(/[?#]/)[0])); assert.ok(fs.existsSync(path.join(root, p)), f + ' → ' + p); }
  }
  /* idempotent : relancer l’enrichissement ne duplique rien */
  const tmp = read(FICHES[0]); const ctx = G.load(root); const html = tmp.slice(0, tmp.indexOf(G.START)) + G.block(ctx, A.fiches[0]) + tmp.slice(tmp.indexOf(G.END) + G.END.length);
  const sp = t => t.replace(/[\u00a0\u202f]/g, ' '); /* la synchronisation pose les espaces insécables (« … ») après la génération */
  assert.equal(sp(html), sp(tmp));
});

test('« En lien » : le groupe « Animaux » s’ajoute aux fiches des régions, et seulement à elles', () => {
  const byRegion = {}; for (const x of A.fiches) for (const id of x.places) (byRegion[id] = byRegion[id] || []).push(x.id);
  for (const [region, ids] of Object.entries(byRegion)) {
    const d = doc('lieux/' + region + '.html'), group = [...d.querySelectorAll('.lore-rel-group')].find(g => g.querySelector('h3').textContent === 'Animaux');
    assert.ok(group, region); assert.deepEqual([...group.querySelectorAll('a')].map(a => a.getAttribute('href').replace('../animaux/', '').replace('.html', '')).sort(), ids.sort());
  }
  for (const f of ['personnages/jason.html', 'gangs/final-chapter-mc.html', 'entreprises/jack-of-hearts.html']) assert.ok(![...doc(f).querySelectorAll('.lore-rel-group h3')].some(h => h.textContent === 'Animaux'), f);
});

test('sécurité et droits : aucun script en ligne, rien de chargé depuis un autre site, aucune vidéo', () => {
  for (const f of PAGES) {
    const d = doc(f);
    for (const s of d.querySelectorAll('script')) if (!s.src && s.type !== 'application/ld+json' && s.type !== 'lk/lazy') assert.fail(f + ' : script en ligne');
    for (const el of d.querySelectorAll('[src], link[href]')) { const u = el.getAttribute('src') || el.getAttribute('href'); if (el.tagName === 'LINK' && !/stylesheet|preload|icon/.test(el.rel)) continue; assert.doesNotMatch(u, /^(https?:)?\/\//, f + ' : ressource externe ' + u); }
    assert.equal(d.querySelectorAll('iframe, audio, video, embed, object').length, 0, f);
    assert.doesNotMatch(d.querySelector('main').innerHTML, /href="(?:\.\.\/)?(?:missions|activites|radios)(?:\.html|\/)/, f + ' : lien vers une autre section nouvelle');
  }
  for (const f of ['index.html', 'gangs.html', 'lieux/grassrivers.html']) assert.doesNotMatch(read(f), /animaux\.css/, f);
});

test('menu, pied de page, recherche et plan du site : « Animaux » dans « Le monde », entre Entreprises et Collectibles', () => {
  const shell = require(path.join(root, 'outils/site-shell.cjs'));
  const i = shell.world.findIndex(x => x[0] === 'animaux.html');
  assert.equal(shell.world[i][1], 'Animaux'); assert.equal(shell.world[i - 1][0], 'entreprises.html'); assert.equal(shell.world[i + 1][0], 'collectibles.html');
  assert.match(shell.nav('index.html', ''), /<a href="entreprises\.html">Entreprises<\/a><a href="animaux\.html">Animaux<\/a><a href="collectibles\.html">Collectibles<\/a>/);
  assert.match(read('animaux.html'), /<a href="animaux\.html" class="here" aria-current="page">Animaux<\/a>/);
  const ctx = { window: {} }; vm.runInNewContext(read('search-index.js'), ctx);
  for (const u of ['/animaux.html', ...FICHES.map(f => '/' + f)]) assert.ok(ctx.window.LK_INDEX.some(e => e.u === u), u);
  assert.ok(read('sitemap.xml').includes('<loc>https://www.leonidakit.com/animaux.html</loc>'));
  for (const f of FICHES) assert.ok(read('sitemap-fiches.xml').includes('<loc>https://www.leonidakit.com/' + f + '</loc>'), f);
  /* v7.69 (Téva : « tu as enlevé la section collectible… ») : « Le monde de Leonida » de l’accueil présente aussi la faune
     et les collectibles (outils/lore-gen.js), une carte chacun */
  const monde = read('index.html').match(/<section class="lore-sec shell" id="monde">[\s\S]*?<\/section>/)[0];
  assert.equal((monde.match(/href="animaux\.html"/g) || []).length, 1, 'accueil : une carte « Animaux »');
});

test('Léo : fiches des animaux (alias français et anglais), questions de la section, sujet « animaux » relié au hub, réponses sourcées', () => {
  const idx = JSON.parse(read('leo-index.json'));
  assert.ok(idx.shards.animaux && idx.shards.animaux.knowledge);
  const sh = JSON.parse(read('leo/animaux.json')); assert.equal(sh.revision, idx.revision);
  assert.equal(sh.knowledge.length, A.hub.faq.filter(x => !x.leo).length); assert.ok(sh.knowledge.every(t => /^animaux-faq-\d$/.test(t.id)));
  assert.equal(idx.knowledge.find(t => t.id === 'animaux').links[0].url, '/animaux.html');
  const monde = read('leo/monde.json'); for (const f of FICHES) assert.ok(monde.includes('/' + f), f);
  const core = require(path.join(root, 'outils/tests/leo-complet.cjs')).fullCore(root);
  for (const [q, want] of [['ya des animaux dans gta 6', 'animaux'], ['y a t il des alligators dans gta 6', 'animaux-faq-1'], ['quels animaux peut on chasser', 'animaux-faq-2'], ['y a t il des requins dans gta 6', 'animaux-faq-3']]) {
    const a = core.answer(q); assert.equal(a.kind, 'answer', q); assert.equal(a.topic, want, q + ' → ' + a.topic); assert.ok((a.links || []).length, q);
  }
});

test('cinq langues : pages générées, morceau de Léo dans chaque langue', () => {
  const L = require(path.join(root, 'outils/langues.cjs')).config(root);
  for (const l of L.langues.filter(x => x.etat === 'publiee' && x.code !== 'fr')) {
    for (const f of PAGES) { const p = l.dossier + '/' + f; assert.ok(fs.existsSync(path.join(root, p)), p); assert.equal(doc(p).documentElement.lang.slice(0, 2), l.code); }
    assert.equal(JSON.parse(read(l.dossier + '/leo/animaux.json')).knowledge.length, A.hub.faq.filter(x => !x.leo).length, l.code);
  }
});
