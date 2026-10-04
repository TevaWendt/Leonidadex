/* Section « Codes de triche » (section codes) : modèle de données (aucun code de GTA VI, jamais un code supposé), générateur
   (0 code, puis un code fictif de test jamais publié), codes de GTA V « pour comparer », page modèle hors index, menu,
   recherche (« cheat » dans chaque langue), plan du site, Léo, langues, cartes de codes (codes.js).
   NODE_PATH=<dépendances>/node_modules node --test outils/tests/section-codes.test.cjs */
'use strict';
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const { JSDOM } = require('jsdom');
const root = process.env.SITE_ROOT || path.resolve(__dirname, '../..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const G = require(path.join(root, 'outils/gen-codes.cjs'));
const doc = f => new JSDOM(read(f)).window.document;
const ld = d => [...d.querySelectorAll('script[type="application/ld+json"]')].map(s => JSON.parse(s.textContent));
const H = JSON.parse(read('outils/codes/hub.json')), C = JSON.parse(read('outils/codes/codes.json'));
/* code FICTIF, construit ici pour les tests seulement : jamais écrit dans les données du site */
const FICTIF = () => ({ id: 'test-fictif', effet: 'Code fictif de test', texte: 'Effet inventé pour vérifier le gabarit, jamais publié.', categorie: 'armes', ps5: ['triangle', 'r2', 'gauche', 'croix'], xbox: ['y', 'rt', 'gauche', 'a'], telephone: '1-999-000-000', limites: { texte: 'trophées et succès coupés (test).', trophees: true, sauvegarde: null, statut: 'officiel', sources: ['rs-support-codes-v'] }, statut: 'officiel', sources: ['rs-support-plateformes'], aliases: ['code test'] });

test('modèle de données : aucun code de GTA VI au 4 octobre 2026, schéma documenté, quatre catégories, un code supposé est refusé', () => {
  assert.equal(C.codes.length, 0, 'aucun code de GTA VI publié par Rockstar ni vérifié en jeu');
  for (const k of ['id', 'effet', 'categorie', 'ps5', 'xbox', 'telephone', 'limites', 'statut', 'sources']) assert.ok(C._schema[k], 'schéma : ' + k);
  assert.deepEqual(C.categories.map(c => c.id), ['armes', 'vehicules', 'joueur', 'monde']);
  const ctx = G.context(root);
  assert.doesNotThrow(() => G.check(ctx));
  assert.deepEqual(G.checkCode(FICTIF(), ctx), [], 'le code fictif de test est valide');
  const bad = (f, re) => { const c = FICTIF(); f(c); const e = G.checkCode(c, ctx); assert.ok(e.some(x => re.test(x)), e.join(' | ')); };
  bad(c => { c.statut = 'comm'; }, /jamais supposé/);
  bad(c => { c.statut = 'conf'; }, /jamais supposé/);
  bad(c => { c.statut = 'vu'; }, /vérification en jeu/);
  bad(c => { c.statut = 'officiel'; c.sources = ['redbull-gta6']; }, /source officielle/);
  bad(c => { c.categorie = 'argent'; }, /catégorie inconnue/);
  bad(c => { c.ps5 = ['croix', 'bouton-inconnu']; }, /touche inconnue/);
  bad(c => { c.xbox = ['triangle']; }, /touche inconnue/);
  bad(c => { c.ps5 = null; c.xbox = null; c.telephone = null; }, /ni séquence ni numéro/);
  assert.deepEqual(G.checkCode({ ...FICTIF(), statut: 'vu', verifieEnJeu: '2026-11-20' }, ctx), [], 'un code vérifié en jeu, avec sa date');
});

test('générateur, 0 code : le hub dit qu’aucun code n’est publié, aucune fiche de catégorie, seule la page modèle', () => {
  assert.deepEqual(fs.readdirSync(path.join(root, 'codes-de-triche')).filter(f => f.endsWith('.html')), ['modele.html']);
  const d = doc('codes-de-triche.html');
  assert.ok(d.querySelector('#liste .codes-vide'));
  assert.equal(d.querySelectorAll('#liste .codes-carte').length, 0);
  assert.equal(d.querySelectorAll('#liste .codes-cats > li').length, 4);
  for (const i of d.querySelectorAll('#liste .codes-cats li .lkx-card-n')) assert.equal(i.textContent, '0');
  for (const v of d.querySelectorAll('#liste .codes-v')) assert.equal(v.textContent, 'GTA V', 'un code de GTA V dans une fiche de catégorie est marqué comme tel');
  for (const f of fs.readdirSync(root).filter(f => f.endsWith('.html'))) assert.ok(!/codes-de-triche\/modele\.html/.test(read(f)), 'la page modèle n’est reliée d’aucune page : ' + f);
});

test('générateur, un code fictif de test : fiche de catégorie, séquences PS5 et Xbox en texte et en pictogrammes, numéro à copier, choix de la console', () => {
  const ctx = G.context(root), html = G.categoriePage(ctx, C.categories[0], [FICTIF()]), d = new JSDOM(html).window.document;
  assert.equal(d.querySelectorAll('h1').length, 1); assert.equal(d.querySelector('h1').textContent, 'Codes de triche de la catégorie Armes');
  assert.ok(!d.querySelector('meta[name="robots"]'), 'une vraie fiche est indexable');
  assert.equal(d.querySelector('link[rel="canonical"]').href, 'https://www.leonidakit.com/codes-de-triche/armes.html');
  const card = d.querySelector('#code-test-fictif');
  assert.ok(card.hasAttribute('data-codes-carte')); assert.ok(!card.querySelector('.codes-v'), 'un code de GTA VI n’a pas le badge « GTA V »');
  const ps = card.querySelector('[data-codes-seq="ps"]'), xb = card.querySelector('[data-codes-seq="xbox"]');
  assert.equal(ps.querySelectorAll('[data-codes-touche]').length, 4); assert.equal(xb.querySelectorAll('[data-codes-touche]').length, 4);
  /* chaque touche se lit en texte ; les formes dessinées sont décoratives */
  assert.deepEqual([...ps.querySelectorAll('.codes-key')].map(k => k.textContent.trim()), ['Triangle', 'R2', 'Gauche', 'Croix']);
  for (const s of ps.querySelectorAll('svg')) assert.ok(s.closest('[aria-hidden="true"]'));
  assert.equal(ps.querySelector('ol').getAttribute('aria-labelledby'), ps.querySelector('.codes-seq-t').id);
  assert.equal(card.querySelector('[data-codes-numero]').textContent, '1-999-000-000');
  assert.ok(card.querySelector('[data-codes-copier]').hidden, 'le bouton « copier » attend codes.js');
  assert.ok(d.querySelector('[data-codes-consoles]'), 'choix de la console quand chaque carte a ses deux séquences');
  assert.equal(d.querySelectorAll('.codes-fiche-src .ed-srcs li').length, 2);
  /* aucun pictogramme de console recopié : formes génériques seulement */
  assert.doesNotMatch(html, /playstation-logo|xbox-logo|<img[^>]+(?:ps|xbox)[-_]?button/i);
  const idx = G.indexEntries(H, { ...C, codes: [FICTIF()] }); assert.ok(idx.some(e => e.u === '/codes-de-triche/armes.html'));
});

test('codes-de-triche.html : ce qu’on sait, GTA V pour comparer, guide, zone éditoriale, pas d’encart du calculateur, données structurées', () => {
  const d = doc('codes-de-triche.html');
  assert.equal(d.querySelectorAll('h1').length, 1);
  assert.ok(d.querySelector('meta[name="description"]').content.length <= 160);
  for (const id of ['etat', 'gtav', 'liste']) assert.ok(d.getElementById(id), id);
  const cards = [...d.querySelectorAll('#gtav .codes-carte')];
  assert.equal(cards.length, C.gtav.length);
  for (const c of cards) assert.match(c.querySelector('.codes-v').textContent, /^GTA V, pour comparer$/, 'chaque code de GTA V est marqué comme tel');
  assert.equal(d.querySelectorAll('#code-gtav-invincibilite [data-codes-seq="ps"] [data-codes-touche]').length, 10);
  assert.equal(d.querySelector('#code-gtav-armes [data-codes-numero]').textContent, '1-999-866-587');
  assert.ok(d.querySelector('#code-gtav-armes [data-codes-seq="pc"]'));
  assert.ok(d.querySelector('[data-codes-annonce][aria-live="polite"]'));
  for (const a of d.querySelectorAll('.codes-src a')) assert.ok(d.getElementById(a.getAttribute('href').slice(1)), a.getAttribute('href'));
  assert.deepEqual([...d.querySelectorAll('.ed-zone--monde section.ed')].map(s => s.id), ['rockstar', 'communaute', 'a-confirmer', 'pour-toi', 'faq', 'sources']);
  for (const a of d.querySelectorAll('.ed-nav a')) assert.ok(d.getElementById(a.getAttribute('href').slice(1)), a.getAttribute('href'));
  const types = ld(d).map(x => x['@type']); for (const t of ['BreadcrumbList', 'CollectionPage', 'FAQPage']) assert.ok(types.includes(t), t);
  assert.equal(d.querySelectorAll('.lk-entry-hub').length, 0, 'pas d’encart du calculateur');
  assert.ok([...d.querySelectorAll('#pour-toi .ed-act')].some(a => a.getAttribute('href') === 'calculateurs.html?tool=goal&from=codes#atelier'));
  assert.equal(d.querySelectorAll('nav.lk-chips').length, 1);
  assert.ok(d.querySelector('link[href^="codes.css"]')); assert.ok(d.querySelector('script[src^="codes.js"]'));
  const ids = [...d.querySelectorAll('[id]')].map(x => x.id); assert.deepEqual(ids.filter((x, i) => ids.indexOf(x) !== i), []);
  /* aucun lien vers les autres sections nouvelles depuis le contenu de la page (le menu les relie déjà) */
  const main = d.querySelector('main'); main.querySelectorAll('nav.lk-chips').forEach(n => n.remove());
  for (const a of main.querySelectorAll('a[href]')) assert.doesNotMatch(a.getAttribute('href'), /^(?:\.\.\/)?(?:trophees|online|missions|activites|radios|animaux)(?:\.html|\/)/, a.getAttribute('href'));
});

test('page modèle : noindex, bandeau, codes marqués « fictif », numéros en 0-000, hors plan du site, recherche et Léo', () => {
  const d = doc('codes-de-triche/modele.html');
  assert.match(d.querySelector('meta[name="robots"]').content, /noindex/);
  assert.ok(d.querySelector('.codes-demo[role="note"]'));
  const cards = d.querySelectorAll('.codes-carte'); assert.equal(cards.length, 3);
  for (const c of cards) assert.equal(c.querySelector('.codes-v--fictif').textContent, 'Code fictif');
  for (const n of d.querySelectorAll('[data-codes-numero]')) assert.match(n.textContent, /^0-000-/);
  assert.ok(d.querySelector('[data-codes-consoles]'));
  assert.equal(d.querySelectorAll('link[rel="alternate"][hreflang]').length, 0);
  assert.ok(!read('sitemap.xml').includes('codes-de-triche/modele.html')); assert.ok(!read('sitemap-fiches.xml').includes('codes-de-triche/modele.html'));
  const ctx = { window: {} }; vm.runInNewContext(read('search-index.js'), ctx); assert.ok(!ctx.window.LK_INDEX.some(e => /codes-de-triche\/modele/.test(e.u)));
  assert.ok(!read('leo/passages.json').includes('/codes-de-triche/modele.html')); assert.ok(!read('leo-index.json').includes('/codes-de-triche/modele.html'));
});

test('menu, pied de page, recherche (« cheat » dans chaque langue) et plan du site : « Codes de triche » après « Radios et musique »', () => {
  const shell = require(path.join(root, 'outils/site-shell.cjs'));
  const i = shell.play.findIndex(x => x[0] === 'codes-de-triche.html');
  assert.deepEqual(shell.play[i], ['codes-de-triche.html', 'Codes de triche']);
  const r = shell.play.findIndex(x => x[0] === 'radios.html'); if (r >= 0) assert.equal(i, r + 1, 'juste après Radios et musique');
  assert.ok(shell.sectionPages.has('codes-de-triche.html'));
  assert.match(shell.nav('index.html', ''), /<strong>Jouer<\/strong>(?:<a [^>]*>[^<]*<\/a>)*<a href="codes-de-triche\.html">Codes de triche<\/a>/);
  const foot = shell.footer('', ''); assert.ok(foot.indexOf('<h2>Explorer</h2>') < foot.indexOf('<h2>Jouer</h2>') && foot.includes('href="codes-de-triche.html"'));
  assert.match(read('codes-de-triche.html'), /<a href="codes-de-triche\.html" class="here" aria-current="page">Codes de triche<\/a>/);
  const L = require(path.join(root, 'outils/langues.cjs')).config(root);
  const words = { fr: /\bcheat\b/, en: /\bcheats?\b/, es: /\btrucos\b/, it: /\btrucchi\b/, de: /\bcheatcodes\b/ };
  for (const l of [{ code: 'fr', dossier: '' }, ...L.langues.filter(x => x.etat === 'publiee' && x.code !== 'fr')]) {
    const ctx = { window: {} }; vm.runInNewContext(read((l.dossier ? l.dossier + '/' : '') + 'search-index.js'), ctx);
    const list = ctx.window.LK_INDEX.filter(x => x.u.startsWith((l.dossier ? '/' + l.dossier : '') + '/codes-de-triche.html'));
    assert.ok(list.length, 'recherche ' + l.code); assert.ok(list.some(e => words[l.code].test(e.s)), 'recherche ' + l.code + ' : « cheat » ou sa variante');
  }
  assert.ok(read('sitemap.xml').includes('<loc>https://www.leonidakit.com/codes-de-triche.html</loc>'));
  assert.match(read('style.css'), /sections? [a-z, ]*\bcodes\b[a-z, ]* : cinq groupes dans « Explorer »/); /* un seul bloc, marqué « section codes » ou « sections …, codes, … » une fois les sections réunies */
});

test('Léo : morceau de questions de la section, sujet « mods » relié au hub, réponses honnêtes (présence, argent infini, trophées)', () => {
  const idx = JSON.parse(read('leo-index.json'));
  assert.ok(idx.shards.codes && idx.shards.codes.knowledge);
  const sh = JSON.parse(read('leo/codes.json')); assert.equal(sh.revision, idx.revision);
  assert.ok(sh.knowledge.length >= 3 && sh.knowledge.every(t => /^codes-/.test(t.id)));
  assert.ok(idx.knowledge.find(t => t.id === 'mods').links.some(l => l.url === '/codes-de-triche.html'));
  const core = require(path.join(root, 'outils/tests/leo-complet.cjs')).fullCore(root);
  for (const [q, want] of [['y a-t-il des codes de triche dans GTA 6 ?', 'mods'], ['code argent infini gta 6', 'codes-faq-1'], ['les codes désactivent-ils les trophées ?', 'codes-faq-2']]) {
    const a = core.answer(q); assert.equal(a.kind, 'answer', q); assert.equal(a.topic, want, q + ' → ' + a.topic); assert.ok((a.links || []).length, q);
  }
  assert.match(core.answer('code argent infini gta 6').text, /GTA V/);
});

test('cinq langues : pages générées (page modèle comprise, sans hreflang), morceau de Léo dans chaque langue', () => {
  const L = require(path.join(root, 'outils/langues.cjs')).config(root);
  for (const l of L.langues.filter(x => x.etat === 'publiee' && x.code !== 'fr')) {
    for (const f of ['codes-de-triche.html', 'codes-de-triche/modele.html']) { const p = l.dossier + '/' + f; assert.ok(fs.existsSync(path.join(root, p)), p); assert.equal(doc(p).documentElement.lang.slice(0, 2), l.code); }
    assert.match(doc(l.dossier + '/codes-de-triche/modele.html').querySelector('meta[name="robots"]').content, /noindex/);
    assert.ok(JSON.parse(read(l.dossier + '/leo/codes.json')).knowledge.length >= 3, l.code);
  }
});

test('codes.js : choix de la console, séquence qui se tape, « copier » et « rejouer », sans erreur, sans stockage ni requête', async () => {
  const { load } = require('./runtime-helper.cjs');
  const r = await load(root, 'codes-de-triche/modele.html');
  try {
    assert.deepEqual(r.errors, []);
    const group = r.d.querySelector('[data-codes-consoles]'); assert.equal(group.hidden, false);
    const [ps, xb] = group.querySelectorAll('button');
    assert.equal(ps.getAttribute('aria-pressed'), 'true');
    const card = r.d.querySelector('.codes-carte');
    assert.equal(card.querySelector('[data-codes-seq="xbox"]').hidden, true); assert.equal(card.querySelector('[data-codes-seq="ps"]').hidden, false);
    xb.click();
    assert.equal(xb.getAttribute('aria-pressed'), 'true'); assert.equal(card.querySelector('[data-codes-seq="ps"]').hidden, true); assert.equal(card.querySelector('[data-codes-seq="xbox"]').hidden, false);
    for (const b of r.d.querySelectorAll('[data-codes-copier],[data-codes-rejouer]')) assert.equal(b.hidden, false);
    assert.equal(r.w.localStorage.length, 0);
  } finally { r.close(); }
  assert.doesNotMatch(read('codes.js'), /document\.cookie|fetch\(|XMLHttpRequest|localStorage|sessionStorage/);
  assert.match(read('codes.css'), /prefers-reduced-motion:reduce/);
});
