/* Section « GTA Online » (section online) : un espace à part dans le même site. Navigation propre sur chaque page de
   l’espace (bandeau « GTA Online, pas l’histoire », sommaire, fil d’Ariane qui part de « GTA Online »), pages seulement
   quand le contenu est sourcé, modèle de données au schéma des valeurs publiées sans rien mêler à l’histoire, encart du
   calculateur, menu, recherche, plan du site, Léo, langues.
   NODE_PATH=<dépendances>/node_modules node --test outils/tests/section-online.test.cjs */
'use strict';
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const { JSDOM } = require('jsdom');
const root = process.env.SITE_ROOT || path.resolve(__dirname, '../..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const G = require(path.join(root, 'outils/gen-online.cjs'));
const doc = f => new JSDOM(read(f)).window.document;
const ld = d => [...d.querySelectorAll('script[type="application/ld+json"]')].map(s => JSON.parse(s.textContent));
const H = JSON.parse(read('outils/online/hub.json')), P = JSON.parse(read('outils/online/pages.json')), D = JSON.parse(read('outils/online/donnees.json'));
const spacePages = () => ['online.html', ...fs.readdirSync(path.join(root, 'online')).filter(f => f.endsWith('.html')).map(f => 'online/' + f)];

test('navigation propre à l’espace sur chaque page : bandeau, sommaire complet, page en cours, couleur d’accent', () => {
  const pages = spacePages(); assert.ok(pages.length >= 3);
  for (const f of pages) {
    const d = doc(f), pre = f.includes('/') ? '../' : '';
    const esp = d.querySelector('main > .online-espace'); assert.ok(esp, f + ' : espace en haut de la page');
    assert.equal(esp.querySelector('.online-bandeau-k').textContent, 'GTA Online, pas l’histoire', f);
    assert.equal(esp.querySelector('.online-bandeau a').getAttribute('href'), pre + 'achats.html', f + ' : les achats de l’histoire restent sur achats.html');
    const nav = esp.querySelector('nav.online-nav'); assert.ok(nav.getAttribute('aria-label'), f);
    assert.deepEqual([...nav.querySelectorAll('a')].map(a => a.getAttribute('href')), H.espace.sommaire.map(x => pre + x.href), f + ' : sommaire complet');
    const cur = nav.querySelectorAll('[aria-current="page"]'); assert.equal(cur.length, 1, f + ' : une seule page en cours');
    assert.equal(cur[0].getAttribute('href').replace(/^\.\.\//, ''), f, f + ' : la page en cours est celle qu’on lit');
    assert.ok(d.querySelector('link[href^="' + pre + 'online.css"]'), f + ' : online.css'); assert.ok(d.querySelector('script[src^="' + pre + 'online.js"]'), f);
    assert.equal(d.querySelectorAll('h1').length, 1, f);
  }
  assert.match(read('online.css'), /--online-accent:var\(--c-neon/); assert.match(read('online.css'), /prefers-reduced-motion:reduce/);
});

test('fil d’Ariane des pages de online/ : il part de « GTA Online » (page et données structurées)', () => {
  for (const f of spacePages().filter(f => f.includes('/'))) {
    const d = doc(f), c = d.querySelector('nav.crumbs a');
    assert.equal(c.textContent, 'GTA Online', f); assert.equal(c.getAttribute('href'), '../online.html', f);
    const b = ld(d).find(x => x['@type'] === 'BreadcrumbList'); assert.equal(b.itemListElement[0].name, 'GTA Online', f); assert.equal(b.itemListElement[0].item, 'https://www.leonidakit.com/online.html', f);
  }
});

test('pages de l’espace : seulement celles qui ont du contenu sourcé, chaque élément avec statut et source', () => {
  assert.deepEqual(fs.readdirSync(path.join(root, 'online')).filter(f => f.endsWith('.html')).sort(), P.pages.map(p => p.id + '.html').sort());
  for (const p of P.pages) {
    const d = doc('online/' + p.id + '.html'), items = d.querySelectorAll('.online-annonce, .online-items li');
    assert.ok(items.length >= 3, p.id + ' : page creuse');
    for (const li of items) { assert.ok(li.querySelector('.ed-status'), p.id + ' : statut'); assert.ok(li.querySelector('.online-src a'), p.id + ' : source'); }
    for (const a of d.querySelectorAll('.online-src a')) assert.ok(d.getElementById(a.getAttribute('href').slice(1)), p.id + ' ' + a.getAttribute('href'));
    assert.doesNotMatch((d.querySelector('meta[name="robots"]') || { content: '' }).content, /noindex/, p.id + ' : indexable');
  }
  assert.equal(doc('online/annonces.html').querySelectorAll('.online-annonce').length, P.pages.find(p => p.id === 'annonces').items.length);
  assert.ok(doc('online/gta-online-actuel.html').getElementById('gta-plus'));
});

test('modèle de données : vide au 4 octobre 2026, valeurs au schéma de donnees-publiees.cjs, rien de mêlé à l’histoire', () => {
  for (const k of ['activites', 'achats', 'entreprises', 'misesAJour']) { assert.deepEqual(D[k], [], k); assert.ok(D._schema[k], 'schéma : ' + k); }
  const ctx = G.context(root); assert.doesNotThrow(() => G.check(ctx));
  const ent = { id: 'entreprise-test', nom: 'Entreprise de test', resume: 'Une entreprise inventée pour le test.', prix: { value: 1000000, status: 'official', source: 'https://www.rockstargames.com/', verifiedAt: '2026-12-01', unit: '$' }, revenu: { value: null, status: 'unknown', unit: '$/h' }, texte: 'Texte de test.', statut: 'officiel', sources: ['rs-precommandes'] };
  assert.deepEqual(G.checkItem('entreprises', ent, ctx), []);
  assert.ok(G.checkItem('entreprises', { ...ent, prix: { ...ent.prix, source: null } }, ctx).some(e => /exige source/.test(e)));
  assert.ok(G.checkItem('entreprises', { ...ent, revenu: { value: 10, status: 'officiel', source: 'x', verifiedAt: '2026-12-01', unit: '$' } }, ctx).some(e => /unité/.test(e)));
  assert.ok(G.checkItem('misesAJour', { id: 'maj', nom: 'x', resume: 'x', statut: 'officiel', sources: ['rs-precommandes'] }, ctx).some(e => /date/.test(e)));
  const page = new JSDOM(G.itemPage(ctx, 'entreprises', ent)).window.document;
  assert.ok(page.querySelector('main > .online-espace nav.online-nav'), 'une fiche future porte aussi la navigation de l’espace');
  assert.match(page.querySelector('.online-champs').textContent, /1\s000\s000 \$ · Officiel/);
  /* jamais dans les données de l’histoire : catalogues, activités du calculateur, achats */
  assert.doesNotMatch(read('calculateurs-activites.js'), /online-|gta-online/i);
  for (const f of ['acquisitions-data.js', 'calculateurs-catalogue.js']) if (fs.existsSync(path.join(root, f))) assert.doesNotMatch(read(f), /"online-|outils\/online\//, f);
  assert.doesNotMatch(read('outils/gen-online.cjs'), /writeFileSync\([^)]*calculateurs|LK_ACTIVITIES/);
});

test('online.html : ce qu’on sait, ce qui change, activités, achats et entreprises, mises à jour, encart du calculateur, zone éditoriale', () => {
  const d = doc('online.html');
  assert.ok(d.querySelector('meta[name="description"]').content.length <= 160);
  for (const id of ['etat', 'ce-qui-change', 'activites', 'achats', 'mises-a-jour']) assert.ok(d.getElementById(id), id);
  for (const id of ['activites', 'achats', 'mises-a-jour']) assert.ok(d.querySelector('#' + id + ' .online-vide'), id + ' : rien de publié');
  assert.ok(d.querySelector('#achats .online-vide a[href="achats.html"]'), 'les achats de l’histoire restent sur achats.html');
  for (const v of d.querySelectorAll('.online-v')) assert.equal(v.textContent, 'GTA V', 'le GTA Online actuel est toujours présenté comme tel');
  const hub = d.querySelectorAll('.lk-entry-hub'); assert.equal(hub.length, 1, 'un encart du calculateur');
  const u = new URL(hub[0].querySelector('a').getAttribute('href'), 'https://www.leonidakit.com/online.html');
  assert.equal(u.pathname, '/calculateurs.html'); assert.equal(u.searchParams.get('tool'), 'roi'); assert.equal(u.searchParams.get('from'), 'online'); assert.equal(u.hash, '#atelier');
  assert.ok([...d.querySelectorAll('#pour-toi .ed-act')].some(a => a.getAttribute('href') === 'calculateurs.html?tool=budget&from=online#atelier'));
  assert.deepEqual([...d.querySelectorAll('.ed-zone--monde section.ed')].map(s => s.id), ['rockstar', 'communaute', 'a-confirmer', 'pour-toi', 'faq', 'sources']);
  for (const a of d.querySelectorAll('.ed-nav a')) assert.ok(d.getElementById(a.getAttribute('href').slice(1)), a.getAttribute('href'));
  for (const a of d.querySelectorAll('.online-src a')) assert.ok(d.getElementById(a.getAttribute('href').slice(1)), a.getAttribute('href'));
  const types = ld(d).map(x => x['@type']); for (const t of ['BreadcrumbList', 'CollectionPage', 'FAQPage']) assert.ok(types.includes(t), t);
  assert.ok(d.querySelector('.online-signal[aria-hidden="true"]'), 'figure décorative');
  const ids = [...d.querySelectorAll('[id]')].map(x => x.id); assert.deepEqual(ids.filter((x, i) => ids.indexOf(x) !== i), []);
  const main = d.querySelector('main'); main.querySelectorAll('nav.lk-chips').forEach(n => n.remove());
  for (const a of main.querySelectorAll('a[href]')) assert.doesNotMatch(a.getAttribute('href'), /^(?:\.\.\/)?(?:codes-de-triche|trophees|missions|activites|radios|animaux)(?:\.html|\/)/, a.getAttribute('href'));
});

test('menu, pied de page, recherche et plan du site : « GTA Online » est un groupe à part (bande sous les quatre groupes, colonne au pied de page)', () => {
  const shell = require(path.join(root, 'outils/site-shell.cjs'));
  assert.ok(!shell.play.some(x => x[0] === 'online.html'), 'plus dans « Jouer »');
  assert.deepEqual(shell.online[0], ['online.html', 'L’espace GTA Online']);
  assert.ok(shell.sectionPages.has('online.html') && !shell.sectionPages.has('online/annonces.html'));
  assert.match(shell.nav('index.html', ''), /<div class="nav-online"><strong>GTA Online<\/strong><a href="online\.html">L’espace GTA Online<\/a><a href="online\/annonces\.html">Les annonces<\/a><a href="online\/gta-online-actuel\.html">Le GTA Online actuel<\/a><\/div><\/div><\/details>/);
  assert.match(shell.footer('', ''), /<h2>GTA Online<\/h2><nav [^>]*><a href="online\.html">L’espace GTA Online<\/a>/);
  assert.ok(shell.ENTRY['online.html'] && shell.ENTRY['online.html'].tool === 'roi');
  assert.match(read('online.html'), /<a href="online\.html" class="here" aria-current="page">L’espace GTA Online<\/a>/);
  const ctx = { window: {} }; vm.runInNewContext(read('search-index.js'), ctx);
  for (const u of ['/online.html', '/online/annonces.html', '/online/gta-online-actuel.html']) assert.ok(ctx.window.LK_INDEX.some(e => e.u === u), u);
  assert.ok(ctx.window.LK_INDEX.some(e => e.u === '/online.html#etat' && /\bmultijoueur\b/.test(e.s)), 'les mots du joueur');
  for (const u of ['online.html', 'online/annonces.html', 'online/gta-online-actuel.html']) assert.ok(read(u.includes('/') ? 'sitemap-fiches.xml' : 'sitemap.xml').includes('<loc>https://www.leonidakit.com/' + u + '</loc>'), u);
  assert.match(read('style.css'), /sections? [a-z, ]*\bonline\b[a-z, ]* : cinq groupes dans « Explorer »/); /* un seul bloc, marqué « section online » ou « sections …, online, … » une fois les sections réunies */
});

test('Léo : morceau de questions de la section, sujets « online » et « gtaplus » reliés à l’espace, réponses sourcées et datées', () => {
  const idx = JSON.parse(read('leo-index.json'));
  assert.ok(idx.shards.online && idx.shards.online.knowledge);
  const sh = JSON.parse(read('leo/online.json')); assert.equal(sh.revision, idx.revision);
  assert.ok(sh.knowledge.length >= 3 && sh.knowledge.every(t => /^online-/.test(t.id)));
  assert.ok(idx.knowledge.find(t => t.id === 'online').links.some(l => l.url === '/online.html'));
  assert.ok(idx.knowledge.find(t => t.id === 'gtaplus').links.some(l => l.url.startsWith('/online/gta-online-actuel.html')));
  const core = require(path.join(root, 'outils/tests/leo-complet.cjs')).fullCore(root);
  for (const [q, want] of [['y aura-t-il un GTA Online pour GTA 6 ?', 'online'], ['GTA 6 online sortira quand ?', 'online'], ['mon personnage de GTA Online sera-t-il transféré ?', 'online-faq-1']]) {
    const a = core.answer(q); assert.equal(a.kind, 'answer', q); assert.equal(a.topic, want, q + ' → ' + a.topic); assert.ok((a.links || []).length, q);
  }
  assert.match(core.answer('GTA 6 online sortira quand ?').text, /4 octobre 2026/);
});

test('cinq langues : les pages de l’espace dans chaque langue, avec la navigation de l’espace, et le morceau de Léo', () => {
  const L = require(path.join(root, 'outils/langues.cjs')).config(root);
  for (const l of L.langues.filter(x => x.etat === 'publiee' && x.code !== 'fr')) {
    for (const f of spacePages()) {
      const p = l.dossier + '/' + f; assert.ok(fs.existsSync(path.join(root, p)), p);
      const d = doc(p); assert.equal(d.documentElement.lang.slice(0, 2), l.code);
      assert.equal(d.querySelectorAll('main > .online-espace nav.online-nav a').length, H.espace.sommaire.length, p);
      assert.equal(d.querySelectorAll('main > .online-espace nav.online-nav [aria-current="page"]').length, 1, p);
    }
    assert.ok(JSON.parse(read(l.dossier + '/leo/online.json')).knowledge.length >= 3, l.code);
  }
});

test('online.js : le sommaire suit la page, le réseau ne pulse qu’à l’écran ; sans erreur, sans stockage ni requête', async () => {
  const { load } = require('./runtime-helper.cjs');
  const r = await load(root, 'online.html');
  try { assert.deepEqual(r.errors, []); assert.equal(r.w.localStorage.length, 0); } finally { r.close(); }
  assert.doesNotMatch(read('online.js'), /document\.cookie|fetch\(|XMLHttpRequest|localStorage|sessionStorage/);
});
