/* Section « Missions et leurs solutions » (section missions) : modèle de données, générateur (0 mission, puis une mission
   fictive de test jamais publiée), schéma des valeurs publiées, pont avec le calculateur, page modèle hors index, menu,
   recherche, plan du site, Léo, langues, case « mission terminée ».
   NODE_PATH=<dépendances>/node_modules node --test outils/tests/section-missions.test.cjs */
'use strict';
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), os = require('node:os'), vm = require('node:vm');
const { JSDOM } = require('jsdom');
const root = process.env.SITE_ROOT || path.resolve(__dirname, '../..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const G = require(path.join(root, 'outils/gen-missions.cjs'));
const DP = require(path.join(root, 'outils/donnees-publiees.cjs'));
const doc = f => new JSDOM(read(f)).window.document;
const ld = d => [...d.querySelectorAll('script[type="application/ld+json"]')].map(s => JSON.parse(s.textContent));
const H = JSON.parse(read('outils/missions/hub.json')), M = JSON.parse(read('outils/missions/missions.json'));
/* mission FICTIVE, construite ici pour les tests seulement : jamais écrite dans les données du site */
const FICTIVE = () => ({
  id: 'test-fictive', nom: 'Mission fictive de test', statutNom: 'officiel', type: 'braquage', chapitre: { numero: 1, titre: 'Chapitre de test', statut: 'officiel', sources: ['rs-vi'] }, ordre: 1,
  resume: 'Mission inventée pour vérifier le gabarit et le pont du calculateur, jamais publiée.', personnages: ['jason', 'lucia'], lieux: ['vice-city'], carte: [{ id: 'g-L192', nom: 'Venture Apts North' }], gangs: ['equipe-raul'],
  deblocage: { texte: 'Condition de test.', statut: 'officiel', sources: ['rs-vi'] }, objectifs: [{ texte: 'Objectif de test.' }, { texte: 'Objectif facultatif de test.', facultatif: true }],
  medailles: [{ texte: 'Médaille de test.', statut: 'vu', sources: ['rs-videos'] }],
  recompenses: { argent: { value: 25000, status: 'official', source: 'https://www.rockstargames.com/VI', verifiedAt: '2026-10-04', unit: '$' }, vehicules: ['karin-sultan'], armes: ['girardi-es9'], proprietes: [], deblocages: ['Déblocage de test'], statut: 'officiel', sources: ['rs-vi'] },
  duree: { value: 20, status: 'verified', source: 'Relevé de test', verifiedAt: '2026-10-04', unit: 'min' }, joueurs: 1, manquable: { value: false, statut: 'officiel', sources: ['rs-vi'] },
  solution: [{ titre: 'Étape 1', texte: 'Première étape de test.' }, { titre: 'Étape 2', texte: 'Seconde étape de test.' }], astuces: ['Astuce de test.'], media: ['jason-and-lucia-02'], sources: ['rs-vi', 'rs-videos'], statut: 'officiel', aliases: ['mission test']
});

test('modèle de données : aucune mission sans nom officiel, schéma documenté, types, valeurs au schéma des valeurs publiées', () => {
  assert.equal(M.missions.length, 0, 'aucune mission n’a de nom officiel au 4 octobre 2026');
  for (const k of ['id', 'nom', 'type', 'chapitre', 'personnages', 'lieux', 'deblocage', 'objectifs', 'recompenses', 'duree', 'medailles', 'manquable', 'solution', 'astuces', 'sources', 'statut']) assert.ok(M._schema[k], 'schéma : ' + k);
  assert.deepEqual(M.types.map(t => t.id), ['histoire', 'secondaire', 'braquage', 'rencontre', 'edition']);
  const ctx = G.context(root);
  assert.doesNotThrow(() => G.check(ctx));
  assert.deepEqual(G.checkMission(FICTIVE(), ctx), [], 'la mission fictive de test est valide');
  const bad = (f, re) => { const m = FICTIVE(); f(m); const e = G.checkMission(m, ctx); assert.ok(e.some(x => re.test(x)), e.join(' | ')); };
  bad(m => { m.type = 'course'; }, /type inconnu/);
  bad(m => { m.personnages = ['inconnu']; }, /personnage inconnu/);
  bad(m => { m.recompenses.argent.source = null; }, /exige source/);
  bad(m => { m.duree.status = 'vu'; }, /status attendu/);
  bad(m => { m.duree.unit = 'h'; }, /unité/);
  bad(m => { m.recompenses.vehicules = ['voiture-inventee']; }, /véhicule inconnu/);
  bad(m => { m.resume = 'x'.repeat(161); }, /160 signes/);
  assert.deepEqual(G.checkValue({ value: null, status: 'unknown', unit: '$' }, 'v', '$'), []);
  assert.ok(G.checkValue({ value: null, status: 'official', unit: '$' }, 'v', '$').length);
});

test('générateur, 0 mission : le hub dit qu’aucune mission n’est publiée, aucune fiche, seule la page modèle', () => {
  assert.deepEqual(fs.readdirSync(path.join(root, 'missions')).filter(f => f.endsWith('.html')), ['modele.html']);
  const d = doc('missions.html');
  assert.ok(d.querySelector('#liste .missions-vide'));
  assert.equal(d.querySelectorAll('#liste .lore-card').length, 0);
  assert.equal(d.querySelectorAll('#liste .missions-type').length, M.types.length); /* une carte cliquable par type (fiche plein écran) */
  for (const i of d.querySelectorAll('#liste .missions-type-n')) assert.equal(i.textContent, '0');
  assert.ok(!/href="missions\/modele\.html"/.test(read('missions.html')), 'la page modèle n’est reliée d’aucune page');
});

test('générateur, une mission fictive de test : fiche complète, liens vers personnages, lieux, carte, gangs, véhicules, armes, encart du calculateur', () => {
  const ctx = G.context(root), html = G.fichePage(ctx, FICTIVE()), d = new JSDOM(html).window.document;
  assert.equal(d.querySelectorAll('h1').length, 1); assert.equal(d.querySelector('h1').textContent, 'Mission fictive de test');
  assert.ok(!d.querySelector('meta[name="robots"]'), 'une vraie fiche est indexable');
  assert.equal(d.querySelector('link[rel="canonical"]').href, 'https://www.leonidakit.com/missions/test-fictive.html');
  const bref = d.querySelector('.missions-bref').textContent; assert.match(bref, /25\s000 \$ · Officiel/); assert.match(bref, /20 min · Mesuré et vérifié/); assert.match(bref, /Chapitre de test/); assert.match(bref, /Non/);
  for (const href of ['../personnages/jason.html', '../lieux/vice-city.html', '../carte.html#lieu=g-L192', '../gangs/equipe-raul.html', '../vehicules/karin-sultan.html', '../armes/girardi-es9.html']) assert.ok(d.querySelector('a[href="' + href + '"]'), href);
  assert.equal(d.querySelectorAll('.missions-etapes li').length, 2);
  assert.equal(d.querySelectorAll('.missions-obj li').length, 2); assert.equal(d.querySelectorAll('.missions-obj--fac').length, 1);
  const a = d.querySelector('.lk-entry-card a.lk-entry-button'), u = new URL(a.getAttribute('href'), 'https://www.leonidakit.com/missions/test-fictive.html');
  assert.equal(u.pathname, '/calculateurs.html'); assert.equal(u.searchParams.get('tool'), 'activities'); assert.equal(u.searchParams.get('from'), 'missions'); assert.equal(u.hash, '#atelier');
  assert.ok(d.querySelector('link[href="../calculator-entry.css"]'));
  const box = d.querySelector('[data-missions-fait="test-fictive"]'); assert.ok(box && box.hidden && !box.hasAttribute('data-missions-demo'));
  assert.equal(d.querySelectorAll('.missions-fiche-src .ed-srcs li').length, 2);
  /* outil selon le type, ou celui de la fiche */
  for (const [type, tool] of [['histoire', 'session'], ['secondaire', 'activities'], ['edition', 'goal']]) assert.equal(G.toolOf(M, { ...FICTIVE(), type, calc: undefined }), tool);
  assert.equal(G.toolOf(M, { ...FICTIVE(), calc: { tool: 'order' } }), 'order');
  /* recherche et Léo : la mission documentée y entre */
  const idx = G.indexEntries(H, { ...M, missions: [FICTIVE()] }); assert.ok(idx.some(e => e.u === '/missions/test-fictive.html' && e.k === 'Braquage'));
});

test('pont avec le calculateur : une mission au gain et à la durée publiés devient une activité de « Mes activités » ; rien n’est écrit sinon', () => {
  const acts = G.activitesDe([FICTIVE(), { ...FICTIVE(), id: 'sans-duree', duree: { value: null, status: 'unknown', unit: 'min' } }]);
  assert.equal(acts.length, 1);
  const a = acts[0]; assert.equal(a.id, 'mission-test-fictive'); assert.equal(a.reward.value, 25000); assert.equal(a.duration.value, 20); assert.equal(a.status, 'verified', 'statut le plus faible des deux valeurs');
  assert.deepEqual(DP.verifierActivite(a, 0), [], 'activité bien formée pour donnees-publiees.cjs');
  const ctx = { window: { LK_ACTIVITIES: acts } }; vm.createContext(ctx); vm.runInContext(read('calculateurs-data.js'), ctx);
  const n = ctx.window.LKCalcData.activities(); assert.equal(n.length, 1); assert.equal(n[0].reward, 25000); assert.equal(n[0].duration, 20); assert.equal(n[0].fieldMeta.reward.status, 'official');
  /* écriture sur une copie : ajout, idempotence, retrait ; le site lui-même n’a aucune activité de mission */
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lk-missions-'));
  try {
    const f = path.join(tmp, 'calculateurs-activites.js'); fs.copyFileSync(path.join(root, 'calculateurs-activites.js'), f); const orig = fs.readFileSync(f, 'utf8');
    assert.deepEqual(G.pont(tmp, []), { ecrit: false, activites: 0 }); assert.equal(fs.readFileSync(f, 'utf8'), orig, 'fichier intact sans mission publiée');
    assert.equal(G.pont(tmp, [FICTIVE()]).ecrit, true);
    const c2 = { window: {} }; vm.runInNewContext(fs.readFileSync(f, 'utf8'), c2); assert.equal(c2.window.LK_ACTIVITIES[0].id, 'mission-test-fictive');
    assert.equal(G.pont(tmp, [FICTIVE()]).ecrit, false, 'idempotent');
    assert.equal(G.pont(tmp, []).ecrit, true); assert.equal(fs.readFileSync(f, 'utf8'), orig, 'retour à l’état d’origine');
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
  assert.doesNotMatch(read('calculateurs-activites.js'), /mission-/);
});

test('missions.html : histoire, séquences, Édition Ultimate, guide, zone éditoriale, encart du calculateur, données structurées', () => {
  const d = doc('missions.html');
  assert.equal(d.querySelectorAll('h1').length, 1);
  const desc = d.querySelector('meta[name="description"]').content; assert.ok(desc.length <= 160);
  for (const id of ['histoire', 'sequences', 'edition', 'liste']) assert.ok(d.getElementById(id), id);
  assert.equal(d.querySelectorAll('#sequences .missions-seq').length, H.sequences.items.length);
  assert.equal(d.querySelectorAll('#histoire .missions-meca-item').length, 4);
  assert.equal(d.querySelectorAll('#edition .missions-ult-card').length, 2);
  for (const li of d.querySelectorAll('#sequences .missions-seq')) assert.ok(li.querySelector('details.lkx-det .lkx-sheet-src') && li.querySelector('img'), 'séquence illustrée, ouvrable en grand');
  for (const a of d.querySelectorAll('#sequences a.lkx-chip')) { const h = a.getAttribute('href'); assert.ok(fs.existsSync(path.join(root, h.split('#')[0])), h); }
  for (const a of d.querySelectorAll('.missions-src a')) assert.ok(d.getElementById(a.getAttribute('href').slice(1)), a.getAttribute('href'));
  assert.deepEqual([...d.querySelectorAll('.ed-zone--monde section.ed')].map(s => s.id), ['rockstar', 'communaute', 'a-confirmer', 'pour-toi', 'faq', 'sources']);
  for (const a of d.querySelectorAll('.ed-nav a')) assert.ok(d.getElementById(a.getAttribute('href').slice(1)), a.getAttribute('href'));
  assert.ok([...d.querySelectorAll('#pour-toi .ed-act')].some(a => /^carte\.html#pins=[\w,-]+&t=/.test(a.getAttribute('href'))));
  assert.ok([...d.querySelectorAll('#pour-toi .ed-act')].some(a => a.getAttribute('href') === 'calculateurs.html?tool=activities&from=missions#atelier'));
  const types = ld(d).map(x => x['@type']); for (const t of ['BreadcrumbList', 'CollectionPage', 'FAQPage']) assert.ok(types.includes(t), t);
  const hub = d.querySelectorAll('.lk-entry-hub'); assert.equal(hub.length, 1);
  const u = new URL(hub[0].querySelector('a').getAttribute('href'), 'https://www.leonidakit.com/missions.html'); assert.equal(u.searchParams.get('tool'), 'activities'); assert.equal(u.searchParams.get('from'), 'missions');
  assert.equal(d.querySelectorAll('nav.lk-chips').length, 1);
  /* la phrase d’absence de la FAQ est la phrase calculée, aucun marqueur ne reste */
  assert.ok(!read('missions.html').includes('{donnees:'));
  const ph = DP.phrases(DP.etat(root)), norm = s => s.replace(/[  ]/g, ' ').replace(/\s+/g, ' ');
  assert.ok(norm(d.getElementById('faq').textContent).includes(norm(ph.activites)));
  const ids = [...d.querySelectorAll('[id]')].map(x => x.id); assert.deepEqual(ids.filter((x, i) => ids.indexOf(x) !== i), []);
});

test('page modèle : noindex, bandeau de démonstration, hors plan du site, hors recherche, hors Léo, rien d’enregistré', () => {
  const d = doc('missions/modele.html');
  assert.match(d.querySelector('meta[name="robots"]').content, /noindex/);
  assert.ok(d.querySelector('.missions-demo')); assert.ok(d.querySelector('[data-missions-demo]'));
  assert.equal(d.querySelectorAll('link[rel="alternate"][hreflang]').length, 0);
  assert.ok(!read('sitemap.xml').includes('missions/modele.html')); assert.ok(!read('sitemap-fiches.xml').includes('missions/modele.html'));
  const ctx = { window: {} }; vm.runInNewContext(read('search-index.js'), ctx); assert.ok(!ctx.window.LK_INDEX.some(e => /modele/.test(e.u) && /missions/.test(e.u)));
  assert.ok(!read('leo/passages.json').includes('/missions/modele.html')); assert.ok(!read('leo-index.json').includes('/missions/modele.html'));
  assert.equal(d.querySelectorAll('.missions-etapes li').length, 3);
  for (const t of d.querySelectorAll('.missions-bref dd')) assert.doesNotMatch(t.textContent, /\d{3} \$/, 'aucun montant dans la démonstration');
});

test('menu, pied de page, recherche et plan du site : « Missions » en tête du groupe « Jouer »', () => {
  const shell = require(path.join(root, 'outils/site-shell.cjs'));
  assert.deepEqual(shell.play[0], ['missions.html', 'Missions']);
  assert.ok(shell.sectionPages.has('missions.html'));
  assert.match(shell.nav('index.html', ''), /<strong>Jouer<\/strong><a href="missions\.html">Missions<\/a>/);
  const foot = shell.footer('', ''); assert.ok(foot.indexOf('<h2>Explorer</h2>') < foot.indexOf('<h2>Jouer</h2>'));
  assert.match(read('missions.html'), /<a href="missions\.html" class="here" aria-current="page">Missions<\/a>/);
  const ctx = { window: {} }; vm.runInNewContext(read('search-index.js'), ctx); assert.ok(ctx.window.LK_INDEX.some(e => e.u === '/missions.html'));
  assert.ok(read('sitemap.xml').includes('<loc>https://www.leonidakit.com/missions.html</loc>'));
  assert.match(read('style.css'), /sections? [a-z, ]*\bmissions\b[a-z, ]* : cinq groupes dans « Explorer »/); /* un seul bloc, marqué « section missions » ou « sections …, missions, … » une fois les sections réunies */
});

test('Léo : morceau de questions de la section, sujets existants reliés au hub, réponses honnêtes (nombre, déblocage, gains, braquages, durée)', () => {
  const idx = JSON.parse(read('leo-index.json'));
  assert.ok(idx.shards.missions && idx.shards.missions.knowledge);
  const sh = JSON.parse(read('leo/missions.json')); assert.equal(sh.revision, idx.revision);
  assert.ok(sh.knowledge.length >= 3 && sh.knowledge.every(t => /^missions-/.test(t.id)));
  for (const id of ['braquage', 'mission-solo', 'histoire']) assert.ok(idx.knowledge.find(t => t.id === id).links.some(l => l.url.startsWith('/missions.html')), id);
  const core = require(path.join(root, 'outils/tests/leo-complet.cjs')).fullCore(root);
  for (const [q, want] of [['combien de missions dans gta 6 ?', 'missions-faq-1'], ['comment debloquer une mission ?', 'missions-faq-2'], ['quelles missions rapportent le plus ?', 'missions-faq-3'], ['qu est ce qu on sait des braquages ?', 'braquage'], ['combien d heures dure gta 6', 'mission-solo']]) {
    const a = core.answer(q); assert.equal(a.kind, 'answer', q); assert.equal(a.topic, want, q + ' → ' + a.topic); assert.ok((a.links || []).length, q);
  }
  assert.ok(!core.answer('quelles missions rapportent le plus ?').text.includes('{donnees:'));
});

test('cinq langues : pages générées (page modèle comprise, sans hreflang), morceau de Léo dans chaque langue', () => {
  const L = require(path.join(root, 'outils/langues.cjs')).config(root);
  for (const l of L.langues.filter(x => x.etat === 'publiee' && x.code !== 'fr')) {
    for (const f of ['missions.html', 'missions/modele.html']) { const p = l.dossier + '/' + f; assert.ok(fs.existsSync(path.join(root, p)), p); assert.equal(doc(p).documentElement.lang.slice(0, 2), l.code); }
    assert.match(doc(l.dossier + '/missions/modele.html').querySelector('meta[name="robots"]').content, /noindex/);
    assert.ok(JSON.parse(read(l.dossier + '/leo/missions.json')).knowledge.length >= 3, l.code);
  }
});

test('missions.js : case « mission terminée » gardée sur l’appareil (lk-missions-terminees-v1), rien sur la page de démonstration, cachée sans stockage', async () => {
  const { load } = require('./runtime-helper.cjs');
  /* page de démonstration : la case marche, rien n’est enregistré */
  let r = await load(root, 'missions/modele.html');
  try { const box = r.d.querySelector('[data-missions-fait]'), input = box.querySelector('input'); assert.deepEqual(r.errors, []); assert.equal(box.hidden, false);
    input.click(); assert.ok(box.classList.contains('is-done')); assert.equal(r.w.localStorage.getItem('lk-missions-terminees-v1'), null); } finally { r.close(); }
  /* comme une vraie fiche : la case enregistre et retire */
  r = await load(root, 'missions/modele.html', { before: w => w.document.querySelector('[data-missions-demo]').removeAttribute('data-missions-demo') });
  try { const input = r.d.querySelector('[data-missions-fait] input');
    input.click(); assert.deepEqual(JSON.parse(r.w.localStorage.getItem('lk-missions-terminees-v1')), ['modele']);
    input.click(); assert.equal(r.w.localStorage.getItem('lk-missions-terminees-v1'), null); } finally { r.close(); }
  /* stockage indisponible : la case reste cachée */
  r = await load(root, 'missions/modele.html', { before: w => { w.document.querySelector('[data-missions-demo]').removeAttribute('data-missions-demo'); Object.defineProperty(w, 'localStorage', { get() { throw new Error('bloqué'); } }); } });
  try { assert.equal(r.d.querySelector('[data-missions-fait]').hidden, true); } finally { r.close(); }
  assert.doesNotMatch(read('missions.js'), /document\.cookie|fetch\(|XMLHttpRequest/);
});
