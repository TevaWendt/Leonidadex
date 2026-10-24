'use strict';
/* v8.06 : corrections des deux audits du 23 octobre 2026 (audit forensique de la v8.05 : NAV-01, UX-01, UX-02, VIS-02, VIS-03, VIS-04,
   SEO-04 à SEO-08, RED-01, RED-02, A11Y-01, SEC-01, SEC-02, UX-05 ; audit du code et du site publié : CALC-001 à CALC-004, ARCH-01,
   ARCH-02, ARCH-R01 à R03, SEO-001 à SEO-003, CONTENT-001, I18N-01, UI-001). Chaque test rejoue la reproduction de l’audit avec un
   attendu calculé à part (jamais par la fonction testée). Fichiers lus sur disque, pages générées, sans réseau. */
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname, '../..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const exists = f => fs.existsSync(path.join(root, f));
const LANGS = ['en', 'es', 'it', 'de', 'pt'];

/* ---------- calculateur ---------- */
test('CALC-001 : Mon objectif avec des dépenses par partie converge (oracle 100 + n × (100 − dépenses)) et refuse un gain net nul ou négatif', () => {
  const E = require(path.join(root, 'calculateurs-engine.js')), B = require(path.join(root, 'calculateurs-scenario.js'));
  const H = require('./check-ultime-helper.cjs');
  const { D, catalogue, sourceActivities, presets } = H.siteData();
  const initial = B.initial(H.dataVersion(D, catalogue, sourceActivities), presets);
  const scenario = up => { const s = H.baseState(B, initial, catalogue); s.model = 'cycles';
    s.activities = [{ id: 'act-a', name: 'A', reward: 100, cost: 0, duration: 60, prep: 0, cooldown: 0, share: 100, investment: 0, players: 1 }]; s.session.enabled = ['act-a'];
    s.goal = { ...s.goal, capital: 100, target: 1000, reserve: 0, hourly: null, dailyMinutes: 60, players: 1, selected: 'act-a', meaning: 'available', plannedSpend: null, upkeepPerSession: up }; return s; };
  /* une partie de 60 min par jour, 100 $ par partie : n parties telles que 100 + n × (100 − up) ≥ 1 000 */
  for (const [up, n] of [[0, 9], [50, 18], [90, 90], [99, 900]]) {
    const r = B.goal(scenario(up), []);
    assert.equal(r.valid, true, up + ' $ : ' + r.reason);
    assert.equal(r.sessions, n, up + ' $ : parties'); assert.equal(r.runs, n, up + ' $ : missions');
    assert.equal(r.finalCapital, 100 + n * (100 - up), up + ' $ : argent de la fin'); /* = 1 000 */
    assert.equal(r.totalMinutes, n * 60);
    if (up) assert.equal(r.upkeepTotal, up * n);
  }
  for (const up of [100, 101, 250]) { const r = B.goal(scenario(up), []); assert.equal(r.valid, false, up + ' $ : inatteignable'); assert.match(r.reason, /mangent tout ce que tu gagnes/); }
  /* objectif déjà atteint : rien ne change */
  const s0 = scenario(99); s0.goal.capital = 5000; const r0 = B.goal(s0, []); assert.equal(r0.valid, true); assert.equal(r0.sessions, 0);
  /* réserve et dépense prévue : 100 + n × 1 ≥ 1 000 + 20 (achat avant le but) ; réserve 10 jamais dépensée (compte dans le départ) */
  const s1 = scenario(99); s1.goal.capital = 110; s1.goal.reserve = 10; s1.goal.plannedSpend = 20; const r1 = B.goal(s1, []);
  assert.equal(r1.valid, true); assert.equal(r1.sessions, 920); assert.equal(r1.finalCapital, 110 + 920 * 1 - 20);
  /* deux missions par partie (120 min par jour) : chaque partie gagne 2 × 100 − 150 = 50 : 18 parties */
  const s2 = scenario(150); s2.goal.dailyMinutes = 120; const r2 = B.goal(s2, []); assert.equal(r2.valid, true); assert.equal(r2.sessions, 18); assert.equal(r2.runs, 36); assert.equal(r2.finalCapital, 1000);
  assert.ok(E.goal({ capital: 100, target: 1000, dailyMinutes: 60, reserve: 0, activity: s2.activities[0] }).valid);
});

test('CALC-003 : une rotation d’une seule activité a la même admissibilité (minCash) que le calcul seul', () => {
  const E = require(path.join(root, 'calculateurs-engine.js'));
  let n = 0;
  for (const inv of [0, 100, 500, 900]) for (const mc of [null, 100, 500, 1000, 1500]) for (const res of [0, 50]) for (const cost of [0, 50]) for (const cap of [1000, 1500]) {
    const a = { reward: 1000, cost, duration: 10, investment: inv, minCash: mc, players: 1, share: 100 };
    const g = E.goal({ capital: cap, target: cap + 1500, dailyMinutes: 60, reserve: res, activity: a }), m = E.goalMixed({ capital: cap, target: cap + 1500, dailyMinutes: 60, reserve: res, activities: [a] });
    assert.equal(g.valid, m.valid, JSON.stringify({ inv, mc, res, cost, cap }) + ' : ' + (g.reason || '') + ' | ' + (m.reason || ''));
    if (g.valid) assert.equal(g.runs, m.runs); n += 1;
  }
  assert.equal(n, 160);
  /* le cas de l’audit : achat de départ 900, 500 $ à avoir en poche, 1 000 $ au départ : l’argent est détenu avant de payer l’achat */
  const a = { reward: 1000, cost: 0, duration: 10, investment: 900, minCash: 500, players: 1, share: 100 };
  assert.equal(E.goalMixed({ capital: 1000, target: 2000, dailyMinutes: 60, reserve: 0, activities: [a] }).valid, true);
});

test('CALC-004 : les cartes « Avec quelle activité » passent par la couche scénario (B.goal), pas par le moteur seul', () => {
  const js = read('outils/sources/calculateurs.js');
  const fn = js.slice(js.indexOf('function calculation('), js.indexOf('function selectedGoal('));
  assert.match(fn, /B\.goal\(\{\.\.\.state,model:'cycles',goal:\{\.\.\.g,selected:a\.id\}\},sourceActivities\)/);
  assert.doesNotMatch(fn, /E\.goal\(/);
});

test('VIS-03 : libellés courts des deux listes du mode Simple, avec une ligne d’aide, dans les six langues', () => {
  for (const [file, lang] of [['calculateurs.js', 'fr'], ...LANGS.map(l => [l + '/calculateurs.js', l])]) {
    const js = read(file);
    for (const id of ['f-goal-meaning', 'f-model']) assert.ok(js.includes('aria-describedby="' + id + '-hint"') || js.includes("'-hint\"'"), file + ' : aide sous ' + id);
    if (lang === 'fr') { assert.ok(js.includes("option('available','En plus de ma réserve'")); assert.ok(js.includes("option('continuous','Par heure de jeu'")); assert.ok(!js.includes('De l’argent en plus de ce que je garde de côté')); }
    else assert.ok(!js.includes('En plus de ma réserve') && !js.includes('Par heure de jeu'), file + ' : libellés traduits');
  }
});

/* ---------- accueil : mini-calculateur ---------- */
test('UX-02 / CALC-002 : à l’ouverture, sans moteur, les trois exemples sont lus (aucun aria-invalid), six langues', async () => {
  const { load } = require('./runtime-helper.cjs');
  for (const page of ['index.html', ...LANGS.map(l => l + '/index.html')]) {
    const p = await load(root, page, { lazy: 'skip' });
    const form = p.d.getElementById('lk-mini-form'); assert.ok(form, page);
    for (const k of ['capital', 'target', 'hourly']) { const f = form.elements.namedItem(k); assert.ok(f.value.length >= 6, page + ' : exemple présent'); assert.notEqual(f.getAttribute('aria-invalid'), 'true', page + ' : ' + k + ' = ' + f.value); }
    const txt = p.d.getElementById('lk-mini-answer').textContent;
    assert.doesNotMatch(txt, /Remplis les trois cases|Fill in all three|Rellena|Compila|Füll|Preencha/, page + ' : ' + txt);
    assert.deepEqual(p.errors, []); p.close();
  }
  /* avec le moteur : la réponse de l’exemple (200 000 → 1 000 000 à 100 000 $/h = 8 h) */
  const p = await load(root, 'index.html', {}); p.flush();
  assert.match(p.d.getElementById('lk-mini-answer').textContent, /8 h/); p.close();
});

/* ---------- contact ---------- */
test('ARCH-01 / ARCH-02 : 500 emoji donnent un lien de messagerie valide ≤ 1 800 caractères, le brouillon est écrit, le motif est restauré par sa valeur', async () => {
  const { load } = require('./runtime-helper.cjs');
  for (const page of ['contact.html', ...LANGS.map(l => l + '/contact.html')]) {
    const p = await load(root, page, {}), d = p.d, w = p.w;
    const details = d.getElementById('contact-details'), topic = d.getElementById('contact-topic');
    topic.value = 'Suggestion de contenu'; topic.dispatchEvent(new w.Event('change', { bubbles: true }));
    details.value = '😀'.repeat(500); details.dispatchEvent(new w.Event('input', { bubbles: true })); details.dispatchEvent(new w.Event('change', { bubbles: true }));
    const href = d.getElementById('contact-mailto').getAttribute('href');
    assert.ok(href.startsWith('mailto:') && href.length <= 1800, page + ' : ' + href.length);
    assert.doesNotThrow(() => decodeURIComponent(href.split('&body=')[1]), page + ' : lien décodable');
    const draft = JSON.parse(w.localStorage.getItem('lk_contact_draft_v1')); assert.equal(draft.topic, 'Suggestion de contenu', page); assert.equal(draft.details.length, 1000);
    assert.deepEqual(p.errors, []); p.close();
    /* restauration : la valeur (française) de l’option, pas son libellé traduit */
    const q = await load(root, page, { storage: { lk_contact_draft_v1: JSON.stringify({ v: 1, at: Date.now(), topic: 'Suggestion de contenu', page: '', details: 'Un brouillon de test, dix caractères.', source: '', email: '' }) } });
    assert.equal(q.d.getElementById('contact-topic').value, 'Suggestion de contenu', page + ' : motif restauré'); q.close();
  }
});

/* ---------- liens de carte, panneau, maillage ---------- */
test('SEO-001 : plus aucun « &amp;amp; » dans les pages par élément (lots A et B, six langues)', () => {
  const dirs = ['consommables', 'quartiers', 'lieux-carte', 'coiffures', 'tatouages', 'tenues', 'perso-vehicules', 'perso-armes', 'options-vehicules', 'options-armes', 'marques', 'munitions'];
  let n = 0, bad = [];
  for (const pre of ['', ...LANGS.map(l => l + '/')]) for (const d of dirs) { if (!exists(pre + d)) continue; for (const f of fs.readdirSync(path.join(root, pre + d))) { if (!f.endsWith('.html')) continue; n += 1; if (read(pre + d + '/' + f).includes('&amp;amp;')) bad.push(pre + d + '/' + f); } }
  assert.ok(n > 20000, n + ' pages lues'); assert.deepEqual(bad.slice(0, 5), []);
  /* les deux liens de la fiche Sprunk ouvrent la même sélection */
  const h = read('consommables/sprunk.html'), links = [...h.matchAll(/href="(\.\.\/carte\.html#pins=[^"]+)"/g)].map(m => m[1]);
  assert.ok(links.length >= 2); assert.ok(links.every(l => l === links[0] && /&amp;t=Sprunk$/.test(l)), JSON.stringify(links));
});

test('UI-001 : le panneau multi-lieux de la carte est une liste (un lieu par ligne)', () => {
  assert.match(read('carte.js'), /<ul class="mp-places">/); assert.match(read('carte-page.css'), /\.mp-places \.mp-place\{display:flex;[^}]*min-height:40px/);
  for (const l of LANGS) assert.match(read(l + '/carte.js'), /<ul class="mp-places">/);
});

test('SEO-003 : les sept sommaires de familles sont reliés depuis Vêtements et style et Personnalisations, six langues', () => {
  for (const pre of ['', ...LANGS.map(l => l + '/')]) {
    const style = read(pre + 'style.html'), perso = read(pre + 'personnalisations.html');
    for (const f of ['coiffures', 'tatouages', 'tenues']) assert.ok(style.includes('href="' + f + '/index.html"'), pre + 'style.html → ' + f);
    for (const f of ['perso-vehicules', 'perso-armes', 'options-vehicules', 'options-armes']) assert.ok(perso.includes('href="' + f + '/index.html"'), pre + 'personnalisations.html → ' + f);
  }
});

/* ---------- mobile ---------- */
test('NAV-01 : le menu ouvert est borné et défile lui-même ; app.js mesure la hauteur disponible', () => {
  const css = read('style.css');
  assert.match(css, /body>header nav\.open\{max-height:var\(--lk-nav-max,calc\(100dvh - var\(--lk-head-h,62px\) - 24px\)\);overflow-y:auto;overscroll-behavior:contain/);
  assert.match(css, /\.nav-more-panel\{position:static;width:100%;box-shadow:none;max-height:none;overflow:visible\}/);
  assert.doesNotMatch(css, /max-height:60vh/);
  const js = read('app.js'); assert.match(js, /--lk-nav-max/); assert.match(js, /nav\.addEventListener\('toggle'/);
});

test('UX-01 : le bouton Léo reste dans le coin bas droit (un seul cran de 70 px permis, jamais à gauche)', () => {
  const js = read('leo-loader.js');
  assert.doesNotMatch(js, /originalBottom\+140|'left'\]|\['right','left'\]/);
  assert.match(js, /free\(originalBottom\)\?originalBottom:free\(originalBottom\+70\)\?originalBottom\+70:originalBottom/);
  assert.match(js, /button\.style\.left!=='auto'/);
  assert.match(read('style.css'), /\.legal\{padding-bottom:96px\}/);
});

test('UX-05 : sommaire du Tuto collant et replié au téléphone, chapitre courant dans le résumé', () => {
  for (const pre of ['', ...LANGS.map(l => l + '/')]) assert.match(read(pre + 'tuto.html'), /<summary><span class="t-aside-sum">[^<]+<\/span><span class="t-aside-now" data-t-prog-txt>[^<]+<\/span>/, pre + 'tuto.html');
  assert.match(read('tuto.css'), /@media\(max-width:900px\)\{\s*\.t-aside\{position:sticky;top:calc\(var\(--lk-head-h,62px\) \+ 6px\);z-index:29;\}/);
  assert.match(read('tuto.js'), /querySelectorAll\('\[data-t-prog-txt\]'\)/);
});

/* ---------- textes et référencement ---------- */
test('CONTENT-001 : Collectibles ne nie plus la collection de Wyman (six langues)', () => {
  for (const pre of ['', ...LANGS.map(l => l + '/')]) {
    const h = read(pre + 'collectibles.html');
    assert.ok(!/Aucune collection documentée|No collection documented|Ninguna colección documentada|Nessuna collezione documentata|Keine dokumentierte Sammlung|Nenhuma coleção documentada/.test(h), pre + 'collectibles.html');
    assert.ok(/Wyman/.test(h.match(/id="col-status-copy"[^>]*>([\s\S]*?)<\/p>/)[1]), pre + ' : état du catalogue cite Wyman');
    assert.ok(/Wyman/.test(h.match(/id="col-review-summary"[^>]*>([\s\S]*?)<\/p>/)[1]), pre + ' : résumé de revue cite Wyman');
  }
});

test('I18N-01 : les accueils IT, ES et PT disent aussi que l’alerte e-mail est en français', () => {
  assert.match(read('it/index.html'), /Una mail \(in francese\)/); assert.match(read('es/index.html'), /Un correo \(en francés\)/); assert.match(read('pt/index.html'), /Um e-mail \(em francês\)/);
});

test('RED-01 / RED-02 / SEO-04 : coquille portugaise, publicité, H1 en « GTA VI »', () => {
  assert.doesNotMatch(read('pt/tuto.html'), /relação relação/);
  assert.doesNotMatch(read('a-propos.html'), /emplacements publicitaires sont réservés/); assert.match(read('a-propos.html'), /Pas de publicité aujourd’hui/);
  for (const f of ['editions.html', 'actus.html', 'prix.html', 'videos.html']) assert.doesNotMatch(read(f).match(/<h1[^>]*>([\s\S]*?)<\/h1>/)[1], /GTA 6/, f);
});

test('SEO-05 / SEO-06 / SEO-08 : FAQ structurée sans texte de lien, langue courante en vrai lien, balise robots homogène', () => {
  const h = read('index.html'), ld = JSON.parse(h.match(/<script type="application\/ld\+json" data-lk="faq">([\s\S]*?)<\/script>/)[1]);
  for (const q of ld.mainEntity) { assert.doesNotMatch(q.acceptedAnswer.text, /GTA VI sur PC : ce qu’on sait$|ce qui change$/, q.name); assert.match(q.acceptedAnswer.text, /[.!?]$/, q.name); }
  assert.match(h, /<a href="[^"]*" aria-current="page" hreflang="fr" lang="fr" data-lk-lang="fr">Français<\/a>/);
  assert.doesNotMatch(h, /<a aria-current="true"/);
  for (const f of ['calculateurs.html', 'collectibles.html']) assert.match(read(f), /<meta name="robots" content="max-image-preview:large">/, f);
});

test('SEO-07 : adresses courtes redirigées vers les pages .html (vercel.json), sans cleanUrls', () => {
  const v = JSON.parse(read('vercel.json')); assert.equal(v.cleanUrls, undefined);
  const r = v.redirects.find(x => x.source.startsWith('/:page(')), rl = v.redirects.find(x => x.source.startsWith('/:lang(en|es|it|de|pt)/:page('));
  assert.ok(r && rl); assert.equal(r.destination, '/:page.html'); assert.equal(rl.destination, '/:lang/:page.html');
  for (const p of ['calculateurs', 'carte', 'tuto', 'vehicules', 'armes', 'progression', 'contact', 'a-propos', 'achats']) assert.ok(r.source.includes('|' + p + '|') || r.source.includes('(' + p + '|') || r.source.includes('|' + p + ')'), p);
  for (const p of ['index', '404', 'vetements', 'munitions']) assert.ok(!r.source.includes('|' + p + '|'), p + ' exclu');
});

test('VIS-02 / VIS-04 / A11Y-01 : virgule des radios, délai du champ de recherche, noms accessibles des sources, contrastes', () => {
  assert.match(read('radios.css'), /\.radios-panneau-meta\{display:block;/);
  assert.match(read('style.css'), /\.searchwrap\{margin-top:34px; max-width:660px; position:relative; opacity:0; animation:wordUp \.45s ease \.25s forwards;\}/);
  const style = read('style.html'), m = style.match(/<a href="#src-[^"]+" class="cat-src"[^>]*>source(?: \d+)?<\/a>/g) || [];
  assert.ok(m.length > 20); for (const a of m) { assert.doesNotMatch(a, /aria-label=/, a); assert.match(a, /title="Source[ \u00a0]: /, a); }
  for (const f of ['gta-6-pc.html', 'gta-6-vs-gta-5.html']) for (const a of read(f).match(/<a class="rc-ref"[^>]*>/g) || []) { assert.doesNotMatch(a, /aria-label=/, f + ' : ' + a); assert.match(a, /title="Source[ \u00a0]: /, f); }
  assert.match(read('classement.css'), /\.cl-future-tabs span\{[^}]*color:rgba\(26,26,30,\.7\)/); assert.match(read('compagnon.css'), /\.cp-story-n\{[^}]*color:#8A867D/);
  assert.match(read('armes.html'), /<nav class="vhero-jump rise" aria-label="Raccourcis de l’armurerie">/);
});

/* ---------- serveur ---------- */
const call = (handler, { method = 'POST', headers = {}, body = {} } = {}) => new Promise(resolve => { const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, end(s) { resolve({ status: this.statusCode, json: s ? JSON.parse(s) : null }); } };
  handler({ method, headers: { 'content-type': 'application/json', ...headers }, body, socket: { remoteAddress: '1.2.3.4' } }, res); });

test('SEC-01 / SEC-02 : l’en-tête Origin est exigé par /api/ia et /api/contact, plus de joker vercel.app, LK_ORIGINES admis, sel sans repli sur la clé', async () => {
  const IA = require(path.join(root, 'api/ia.js')), CT = require(path.join(root, 'api/contact.js'));
  IA._test.reset(); CT._test.reset();
  const okFetch = async () => ({ ok: true, status: 200, json: async () => ({ content: [{ type: 'text', text: '{}' }], usage: {} }) });
  const h = IA.createHandler({ env: { ANTHROPIC_API_KEY: 'k' }, fetch: okFetch });
  const etat = { mode: 'etat', appareil: 'abcdefghijklmnopqrst' };
  assert.equal((await call(h, { body: etat })).status, 403, 'sans Origin');
  assert.equal((await call(h, { body: etat, headers: { origin: 'https://leonidadex-git-main.vercel.app' } })).status, 403, 'vercel.app refusé');
  assert.equal((await call(h, { body: etat, headers: { origin: 'https://www.leonidakit.com' } })).status, 200);
  const h2 = IA.createHandler({ env: { ANTHROPIC_API_KEY: 'k', LK_ORIGINES: 'https://apercu.example, https://leonidadex-abc.vercel.app', VERCEL_ENV: 'production' }, fetch: okFetch });
  assert.equal((await call(h2, { body: etat, headers: { origin: 'https://leonidadex-abc.vercel.app' } })).status, 200, 'origine listée');
  assert.equal((await call(h2, { body: etat, headers: { origin: 'http://localhost:3000' } })).status, 403, 'localhost refusé en production');
  assert.equal((await call(h, { body: etat, headers: { origin: 'http://localhost:3000' } })).status, 200, 'localhost admis hors production');
  assert.equal(IA._test.settings({ ANTHROPIC_API_KEY: 'secret' }).salt, 'leonidakit'); assert.equal(IA._test.settings({ LK_IA_SEL: 'x' }).salt, 'x');
  const c = CT.createHandler({ env: { BREVO_API_KEY: 'k' }, fetch: async () => ({ status: 201 }) });
  const valid = { topic: 'Suggestion de contenu', details: 'Dix caractères au moins ici.', page: '', source: '', email: '', website: '', startedAt: Date.now() - 10000 };
  assert.equal((await call(c, { body: valid })).status, 403); assert.equal((await call(c, { body: valid, headers: { origin: 'https://x.vercel.app' } })).status, 403);
  assert.equal((await call(c, { body: valid, headers: { origin: 'https://www.leonidakit.com' } })).status, 200);
});

test('ARCH-R01 / ARCH-R02 : base des compteurs configurée mais en panne : 503 « compteur », aucun appel à Anthropic ; délai amont serveur < 15 s', async () => {
  const IA = require(path.join(root, 'api/ia.js')); IA._test.reset();
  let upstream = 0;
  const fetch = async url => { if (/kv\.example/.test(url)) throw new Error('kv down'); upstream += 1; return { ok: true, status: 200, json: async () => ({ content: [{ type: 'text', text: '{"reponse":"x","trouve":true}' }], usage: {} }) }; };
  const h = IA.createHandler({ env: { ANTHROPIC_API_KEY: 'k', KV_REST_API_URL: 'https://kv.example', KV_REST_API_TOKEN: 't' }, fetch });
  const r = await call(h, { body: { mode: 'leo', question: 'où est le sprunk ?', appareil: 'abcdefghijklmnopqrst' }, headers: { origin: 'https://www.leonidakit.com' } });
  assert.equal(r.status, 503); assert.equal(r.json.code, 'compteur'); assert.equal(upstream, 0);
  const src = read('api/ia.js'); assert.match(src, /const TIMEOUT_MS=13000,KV_TIMEOUT_MS=2500;/); assert.match(read('lk-ia.js'), /15000/);
});

test('ARCH-R03 : IndexNow refuse l’appel sans CRON_SECRET en production', async () => {
  const IN = require(path.join(root, 'api/indexnow.js'));
  const h = IN.createHandler({ env: { VERCEL_ENV: 'production' }, fetch: async () => ({ ok: true, status: 200, text: async () => '', json: async () => ({}) }) });
  assert.equal((await call(h, { method: 'GET', headers: { 'user-agent': 'vercel-cron/1.0' } })).status, 401);
  const h2 = IN.createHandler({ env: { VERCEL_ENV: 'production', CRON_SECRET: 's' }, fetch: async () => ({ ok: true, status: 200, text: async () => '', json: async () => ({}) }) });
  assert.notEqual((await call(h2, { method: 'GET', headers: { authorization: 'Bearer s' } })).status, 401);
});
