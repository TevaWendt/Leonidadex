/* Section « Trophées et succès » (section trophees) : modèle de données (liste non publiée, jamais une liste « attendue »),
   générateur (0 trophée, puis une liste fictive de test jamais publiée), page modèle hors index, menu, recherche, plan du
   site, Léo, langues, suivi (case « Obtenu » gardée après rechargement, bilan, anneau, filtres : trophees.js).
   NODE_PATH=<dépendances>/node_modules node --test outils/tests/section-trophees.test.cjs */
'use strict';
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const { JSDOM } = require('jsdom');
const root = process.env.SITE_ROOT || path.resolve(__dirname, '../..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const G = require(path.join(root, 'outils/gen-trophees.cjs'));
const doc = f => new JSDOM(read(f)).window.document;
const ld = d => [...d.querySelectorAll('script[type="application/ld+json"]')].map(s => JSON.parse(s.textContent));
const H = JSON.parse(read('outils/trophees/hub.json')), T = JSON.parse(read('outils/trophees/trophees.json'));
const KEY = 'lk-trophees-obtenus-v1';
/* trophée FICTIF, construit ici pour les tests seulement : jamais écrit dans les données du site */
const FICTIF = (o = {}) => ({ id: 'test-fictif', nom: { en: 'Test Trophy', fr: 'Trophée de test' }, grade: 'or', points: 50, condition: { en: 'A test condition.', fr: 'Une condition de test.' }, categorie: 'collection',
  methode: [{ titre: 'Étape 1', texte: 'Première étape de test.' }, { titre: 'Étape 2', texte: 'Seconde étape de test.' }], manquable: { value: true, texte: 'Exemple de test.', statut: 'officiel', sources: ['xbox-store'] }, cache: false,
  liens: [{ href: 'collectibles.html', label: 'Les collectibles' }, { href: 'carte.html#lieu=g-L192', label: 'Un lieu' }], statut: 'officiel', sources: ['xbox-store'], ...o });

test('modèle de données : liste vide au 4 octobre 2026, schéma documenté, une liste « attendue » est refusée', () => {
  assert.equal(T.trophees.length, 0, 'ni PlayStation, ni Xbox, ni Rockstar n’ont publié la liste');
  for (const k of ['id', 'nom', 'grade', 'points', 'condition', 'categorie', 'methode', 'manquable', 'cache', 'liens', 'statut', 'sources']) assert.ok(T._schema[k], 'schéma : ' + k);
  const ctx = G.context(root);
  assert.doesNotThrow(() => G.check(ctx));
  assert.deepEqual(G.checkTrophee(FICTIF(), ctx), [], 'le trophée fictif de test est valide');
  const bad = (o, re) => { const e = G.checkTrophee(FICTIF(o), ctx); assert.ok(e.some(x => re.test(x)), e.join(' | ')); };
  bad({ statut: 'conf' }, /liste publiée/);
  bad({ statut: 'vu' }, /liste publiée/);
  bad({ sources: [] }, /source manquante/);
  bad({ grade: 'diamant' }, /grade inconnu/);
  bad({ points: 12.5 }, /nombre entier/);
  bad({ nom: { fr: 'Sans nom anglais' } }, /nom anglais/);
  bad({ liens: [{ href: 'page-absente.html', label: 'x' }] }, /page absente/);
  bad({ categorie: 'en-ligne' }, /catégorie inconnue/);
});

test('générateur, 0 trophée : le hub dit que la liste n’est pas publiée, aucune fiche, seule la page modèle, aucun suivi affiché', () => {
  assert.deepEqual(fs.readdirSync(path.join(root, 'trophees')).filter(f => f.endsWith('.html')), ['modele.html']);
  const d = doc('trophees.html');
  assert.ok(d.querySelector('#liste .trophees-att .trophees-att-vide'), 'v7.70 : le suivi en attente est un bilan dessiné');
  assert.equal(d.querySelectorAll('#liste .trophees-att-grades li').length, 4);
  assert.equal(d.querySelectorAll('[data-trophees-obtenu]').length, 0);
  assert.ok(!d.querySelector('[data-trophees-bilan]'));
  for (const f of fs.readdirSync(root).filter(f => f.endsWith('.html'))) assert.ok(!/trophees\/modele\.html/.test(read(f)), 'la page modèle n’est reliée d’aucune page : ' + f);
});

test('générateur, une liste fictive de test : cartes, filtres, bilan, fiche de méthode avec liens vers les pages du site', () => {
  const ctx = G.context(root), list = [FICTIF(), FICTIF({ id: 'test-bronze', grade: 'bronze', points: 15, manquable: { value: false }, methode: [], categorie: 'histoire', nom: { en: 'English Only' } })];
  const hub = new JSDOM(G.hubPage({ ...ctx, T: { ...T, trophees: list } })).window.document;
  assert.equal(hub.querySelectorAll('[data-trophees-liste] [data-trophees-id]').length, 2);
  assert.ok(hub.querySelector('[data-trophees-bilan][hidden]'), 'bilan caché tant que trophees.js ne l’a pas rempli');
  assert.deepEqual([...hub.querySelectorAll('[data-trophees-groupe]')].map(g => g.getAttribute('data-trophees-groupe')), ['grade', 'manquable', 'categorie', 'etat']);
  const c = hub.querySelector('#trophee-test-fictif');
  assert.equal(c.getAttribute('data-grade'), 'or'); assert.equal(c.getAttribute('data-manquable'), 'oui'); assert.equal(c.getAttribute('data-categorie'), 'collection');
  assert.equal(c.querySelector('h3').textContent, 'Trophée de test'); assert.equal(c.querySelector('.trophees-nom-l').getAttribute('translate'), 'no');
  assert.equal(c.querySelector('[data-trophees-obtenu]').getAttribute('aria-describedby'), 'trophee-test-fictif-t');
  assert.equal(c.querySelector('.trophees-methode').getAttribute('href'), 'trophees/test-fictif.html');
  assert.equal(hub.querySelector('#trophee-test-bronze h3').getAttribute('translate'), 'no', 'sans nom français, le nom anglais officiel reste tel quel');
  assert.ok(!hub.querySelector('#trophee-test-bronze .trophees-methode'), 'pas de fiche sans méthode');
  const types = ld(hub).find(x => x['@type'] === 'CollectionPage'); assert.equal(types.mainEntity.numberOfItems, 2);
  const f = new JSDOM(G.fichePage(ctx, FICTIF())).window.document;
  assert.equal(f.querySelectorAll('h1').length, 1); assert.equal(f.querySelector('h1').textContent, 'Trophée de test');
  assert.equal(f.querySelectorAll('.trophees-etapes li').length, 2);
  for (const href of ['../collectibles.html', '../carte.html#lieu=g-L192']) assert.ok(f.querySelector('a[href="' + href + '"]'), href);
  assert.equal(f.querySelector('link[rel="canonical"]').href, 'https://www.leonidakit.com/trophees/test-fictif.html');
  assert.ok(f.querySelector('[data-trophees-obtenu]'));
  assert.ok(G.indexEntries(H, { ...T, trophees: list }).some(e => e.u === '/trophees/test-fictif.html'));
});

test('trophees.html : ce qu’on sait, grades dessinés, GTA V pour comparer, suivi à venir, zone éditoriale, données structurées', () => {
  const d = doc('trophees.html');
  assert.equal(d.querySelectorAll('h1').length, 1);
  assert.ok(d.querySelector('meta[name="description"]').content.length <= 160);
  for (const id of ['etat', 'grades', 'gtav', 'liste']) assert.ok(d.getElementById(id), id);
  assert.equal(d.querySelectorAll('#grades summary .trophees-badge').length, 5); /* v7.73 : chaque grade est une carte cliquable, son badge est aussi dans sa fiche */
  for (const b of d.querySelectorAll('.trophees-badge')) assert.equal(b.getAttribute('aria-hidden'), 'true');
  assert.equal(d.querySelectorAll('#gtav .trophees-chiffre').length, 4);
  for (const v of d.querySelectorAll('#gtav .trophees-chiffre .trophees-v')) assert.equal(v.textContent, 'GTA V');
  for (const a of d.querySelectorAll('.trophees-src a')) assert.ok(d.getElementById(a.getAttribute('href').slice(1)), a.getAttribute('href'));
  assert.deepEqual([...d.querySelectorAll('.ed-zone--monde section.ed')].map(s => s.id), ['rockstar', 'communaute', 'a-confirmer', 'pour-toi', 'faq', 'sources']);
  for (const a of d.querySelectorAll('.ed-nav a')) assert.ok(d.getElementById(a.getAttribute('href').slice(1)), a.getAttribute('href'));
  const types = ld(d).map(x => x['@type']); for (const t of ['BreadcrumbList', 'CollectionPage', 'FAQPage']) assert.ok(types.includes(t), t);
  assert.equal(d.querySelectorAll('nav.lk-chips').length, 1);
  assert.ok(d.querySelector('link[href^="trophees.css"]')); assert.ok(d.querySelector('script[src^="trophees.js"]'));
  const ids = [...d.querySelectorAll('[id]')].map(x => x.id); assert.deepEqual(ids.filter((x, i) => ids.indexOf(x) !== i), []);
  const main = d.querySelector('main'); main.querySelectorAll('nav.lk-chips').forEach(n => n.remove());
  for (const a of main.querySelectorAll('a[href]')) assert.doesNotMatch(a.getAttribute('href'), /^(?:\.\.\/)?(?:codes-de-triche|online|missions|activites|radios|animaux)(?:\.html|\/)/, a.getAttribute('href'));
});

test('page modèle : noindex, bandeau, trophées fictifs filtrables, rien d’enregistré, hors plan du site, recherche et Léo', () => {
  const d = doc('trophees/modele.html');
  assert.match(d.querySelector('meta[name="robots"]').content, /noindex/);
  assert.ok(d.querySelector('.trophees-demo[role="note"]')); assert.ok(d.querySelector('[data-trophees-demo]'));
  assert.equal(d.querySelectorAll('[data-trophees-obtenu]').length, 8);
  assert.equal(d.querySelectorAll('.trophees-etapes li').length, 3);
  assert.equal(d.querySelectorAll('link[rel="alternate"][hreflang]').length, 0);
  assert.ok(!read('sitemap.xml').includes('trophees/modele.html')); assert.ok(!read('sitemap-fiches.xml').includes('trophees/modele.html'));
  const ctx = { window: {} }; vm.runInNewContext(read('search-index.js'), ctx); assert.ok(!ctx.window.LK_INDEX.some(e => /trophees\/modele/.test(e.u)));
  assert.ok(!read('leo/passages.json').includes('/trophees/modele.html')); assert.ok(!read('leo-index.json').includes('/trophees/modele.html'));
});

test('menu, pied de page, recherche et plan du site : « Trophées et succès » après « Codes de triche »', () => {
  const shell = require(path.join(root, 'outils/site-shell.cjs'));
  const i = shell.play.findIndex(x => x[0] === 'trophees.html');
  assert.deepEqual(shell.play[i], ['trophees.html', 'Trophées et succès']);
  const c = shell.play.findIndex(x => x[0] === 'codes-de-triche.html'); if (c >= 0) assert.equal(i, c + 1, 'juste après Codes de triche');
  assert.ok(shell.sectionPages.has('trophees.html'));
  assert.match(shell.nav('index.html', ''), /<strong>Jouer<\/strong>(?:<a [^>]*>[^<]*<\/a>)*<a href="trophees\.html">Trophées et succès<\/a>/);
  assert.ok(shell.footer('', '').includes('href="trophees.html"'));
  assert.match(read('trophees.html'), /<a href="trophees\.html" class="here" aria-current="page">Trophées et succès<\/a>/);
  const ctx = { window: {} }; vm.runInNewContext(read('search-index.js'), ctx);
  assert.ok(ctx.window.LK_INDEX.some(e => e.u === '/trophees.html'), 'la page');
  assert.ok(ctx.window.LK_INDEX.some(e => e.u === '/trophees.html#liste' && /\bplatine\b/.test(e.s) && /\bachievements\b/.test(e.s)), 'les mots du joueur');
  assert.ok(read('sitemap.xml').includes('<loc>https://www.leonidakit.com/trophees.html</loc>'));
  assert.match(read('style.css'), /sections? [a-z, ]*\btrophees\b[a-z, ]* : cinq groupes dans « Explorer »/); /* un seul bloc, marqué « section trophees » ou « sections …, trophees, … » une fois les sections réunies */
});

test('Léo : morceau de questions de la section, réponses honnêtes et sourcées (nombre, platine, manquables)', () => {
  const idx = JSON.parse(read('leo-index.json'));
  assert.ok(idx.shards.trophees && idx.shards.trophees.knowledge);
  const sh = JSON.parse(read('leo/trophees.json')); assert.equal(sh.revision, idx.revision);
  assert.ok(sh.knowledge.length >= 4 && sh.knowledge.every(t => /^trophees-/.test(t.id)));
  const core = require(path.join(root, 'outils/tests/leo-complet.cjs')).fullCore(root);
  for (const [q, want] of [['combien de trophées dans GTA 6 ?', 'trophees-faq-1'], ['comment avoir le platine ?', 'trophees-faq-2'], ['y a-t-il des trophées manquables ?', 'trophees-faq-3']]) {
    const a = core.answer(q); assert.equal(a.kind, 'answer', q); assert.equal(a.topic, want, q + ' → ' + a.topic); assert.ok((a.links || []).length, q);
  }
  assert.match(core.answer('combien de trophées dans GTA 6 ?').text, /pas publié/);
});

test('cinq langues : pages générées (page modèle comprise, sans hreflang), morceau de Léo dans chaque langue', () => {
  const L = require(path.join(root, 'outils/langues.cjs')).config(root);
  for (const l of L.langues.filter(x => x.etat === 'publiee' && x.code !== 'fr')) {
    for (const f of ['trophees.html', 'trophees/modele.html']) { const p = l.dossier + '/' + f; assert.ok(fs.existsSync(path.join(root, p)), p); assert.equal(doc(p).documentElement.lang.slice(0, 2), l.code); }
    assert.match(doc(l.dossier + '/trophees/modele.html').querySelector('meta[name="robots"]').content, /noindex/);
    assert.ok(JSON.parse(read(l.dossier + '/leo/trophees.json')).knowledge.length >= 4, l.code);
  }
});

test('trophees.js : case « Obtenu » gardée après rechargement (lk-trophees-obtenus-v1), bilan et anneau, filtres, rien sur la page de démonstration, cachée sans stockage', async () => {
  const { load } = require('./runtime-helper.cjs');
  const real = w => w.document.querySelector('[data-trophees-demo]').removeAttribute('data-trophees-demo');
  /* page de démonstration : tout marche, rien n’est enregistré */
  let r = await load(root, 'trophees/modele.html');
  try {
    assert.deepEqual(r.errors, []);
    const box = r.d.querySelector('#trophee-exemple-or [data-trophees-obtenu]'); assert.equal(box.closest('[data-trophees-case]').hidden, false);
    box.click(); assert.ok(r.d.querySelector('#trophee-exemple-or').classList.contains('is-obtenu'));
    assert.equal(r.d.querySelector('[data-trophees-n]').textContent, '1'); assert.equal(r.d.querySelector('[data-trophees-total]').textContent, '8');
    assert.equal(r.d.querySelector('[data-trophees-anneau]').style.getPropertyValue('--p'), '0.1250');
    assert.match(r.d.querySelector('[data-trophees-annonce]').textContent, /^1 \/ 8 · /, 'le bilan est relu aux lecteurs d’écran');
    assert.equal(r.w.localStorage.getItem(KEY), null);
  } finally { r.close(); }
  /* comme une vraie liste : la case est enregistrée, puis retrouvée cochée après rechargement */
  let saved;
  r = await load(root, 'trophees/modele.html', { before: real });
  try {
    r.d.querySelector('#trophee-exemple-or [data-trophees-obtenu]').click();
    r.d.querySelector('#trophee-exemple-cache [data-trophees-obtenu]').click();
    saved = r.w.localStorage.getItem(KEY); assert.deepEqual(JSON.parse(saved), ['exemple-or', 'exemple-cache']);
  } finally { r.close(); }
  r = await load(root, 'trophees/modele.html', { before: real, storage: { [KEY]: saved } });
  try {
    assert.equal(r.d.querySelector('#trophee-exemple-or [data-trophees-obtenu]').checked, true, 'gardée après rechargement');
    assert.equal(r.d.querySelector('#trophee-exemple-cache [data-trophees-obtenu]').checked, true);
    assert.equal(r.d.querySelector('#trophee-exemple-defi [data-trophees-obtenu]').checked, false);
    assert.equal(r.d.querySelector('[data-trophees-n]').textContent, '2');
    /* filtres : grade, puis « Obtenus » */
    const grade = r.d.querySelector('[data-trophees-groupe="grade"]'); grade.querySelector('[data-trophees-valeur="bronze"]').click();
    assert.equal([...r.d.querySelectorAll('[data-trophees-liste] [data-trophees-id]')].filter(c => !c.hidden).length, 4);
    grade.querySelector('[data-trophees-valeur="tous"]').click();
    r.d.querySelector('[data-trophees-groupe="etat"] [data-trophees-valeur="obtenus"]').click();
    assert.equal(r.d.querySelector('[data-trophees-visibles]').textContent, '2');
    /* décocher retire de la liste gardée */
    r.d.querySelector('#trophee-exemple-or [data-trophees-obtenu]').click();
    assert.deepEqual(JSON.parse(r.w.localStorage.getItem(KEY)), ['exemple-cache']);
  } finally { r.close(); }
  /* stockage indisponible : les cases restent cachées */
  r = await load(root, 'trophees/modele.html', { before: w => { real(w); Object.defineProperty(w, 'localStorage', { get() { throw new Error('bloqué'); } }); } });
  try { assert.equal(r.d.querySelector('[data-trophees-case]').hidden, true); } finally { r.close(); }
  assert.doesNotMatch(read('trophees.js'), /document\.cookie|fetch\(|XMLHttpRequest/);
  assert.match(read('trophees.css'), /prefers-reduced-motion:reduce/);
});
