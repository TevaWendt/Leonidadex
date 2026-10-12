'use strict';
/* v7.86 : à jour, indexable, protégé (demande de Téva du 12/10/2026, avec les conseils de référencement qu'il a fait relire).
   - fiches véhicules et armes allégées des textes répétés, « Ce qui arrive avec le jeu », lien vers verification.html ;
   - noindex, follow (et hors du plan du site) pour les fiches sans contenu propre, jusqu'à ce que le jeu les remplisse ;
   - verification.html : ce que Rockstar a confirmé, ce qui ne l'est pas encore, la méthode ;
   - plan du site daté par le contenu (et non plus par tout le HTML) ;
   - IndexNow (api/indexnow.js, tâche planifiée) ;
   - Léo : budget global par jour (api/ia.js) et affichage côté page (lk-ia.js) ;
   - mesure d'audience sans cookie (common.js, Mentions) ;
   - accueil : compte à rebours sans chiffre figé, jalons du 12 et du 19 novembre.
   NODE_PATH=<dépendances>/node_modules SITE_ROOT=$PWD node --test outils/tests/v786.test.cjs */
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const { JSDOM } = require('jsdom');
const root = process.env.SITE_ROOT || path.resolve(__dirname, '../..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const exists = f => fs.existsSync(path.join(root, f));
const doc = f => new JSDOM(read(f)).window.document;
const data = (() => { const c = { window: {} }; vm.createContext(c); for (const f of ['vehicules-data.js', 'armes-data.js']) vm.runInContext(read(f), c); return c.window; })();
const MED = JSON.parse(read('outils/medias-officiels.json')), AM = JSON.parse(read('outils/armes-medias.json'));
const DP = require(path.join(root, 'outils/donnees-publiees.cjs'));
const LANGS = ['en', 'es', 'it', 'de'];
const noindex = d => /noindex/.test((d.querySelector('meta[name="robots"]') || {}).content || '');
const sitemap = read('sitemap.xml'), sitemapF = read('sitemap-fiches.xml');
const inSitemap = u => sitemap.includes('<loc>https://www.leonidakit.com/' + u + '</loc>');

test('fiches véhicules : indexables seulement avec un contenu propre ; les autres en noindex, follow et hors du plan du site', () => {
  let idx = 0;
  for (const v of data.LK_VEHICULES) {
    const d = doc('vehicules/' + v.id + '.html');
    const own = (v.medias || []).some(id => MED[id]) || v.st === 'officiel' || !!v.edition || !!DP.prixDe(v);
    assert.equal(noindex(d), !own, v.id);
    assert.equal(inSitemap('vehicules/' + v.id + '.html'), own, v.id + ' : plan du site');
    for (const l of LANGS) assert.equal(sitemap.includes('<loc>https://www.leonidakit.com/' + l + '/vehicules/' + v.id + '.html</loc>'), own, l + '/' + v.id);
    if (own) idx++;
    if (!own) assert.equal(d.querySelector('meta[name="robots"]').content, 'noindex, follow', v.id);
  }
  assert.ok(idx >= 50 && idx < 100, 'fiches véhicules indexables : ' + idx);
});

test('fiches armes : même règle (visuels officiels, nom publié, édition Ultimate ou prix publié)', () => {
  for (const a of data.LK_ARMES) {
    const d = doc('armes/' + a.id + '.html');
    const own = (AM[a.id] || []).some(id => MED[id]) || a.st === 'officiel' || !!a.ue || !!DP.prixDe(a);
    assert.equal(noindex(d), !own, a.id);
    assert.equal(sitemapF.includes('<loc>https://www.leonidakit.com/armes/' + a.id + '.html</loc>'), own, a.id + ' : sitemap-fiches');
  }
});

test('fiches allégées : plus de « Fiche documentaire » répétée, plus d’encadré « Une erreur ? », plus de paragraphe de catégorie', () => {
  const pick = [...data.LK_VEHICULES.slice(0, 40).map(v => 'vehicules/' + v.id + '.html'), ...data.LK_ARMES.map(a => 'armes/' + a.id + '.html')];
  for (const f of pick) {
    const d = doc(f), t = d.querySelector('main').textContent;
    assert.equal([...d.querySelectorAll('h2')].filter(h => h.textContent === 'Fiche documentaire').length, 0, f);
    assert.equal(d.querySelectorAll('.note-box, .fiche-clair, #categorie').length, 0, f);
    for (const rep of ['mécanique non confirmée', 'Une jauge vue dans une bande-annonce', 'Dans un GTA,', 'postes de personnalisation s’appliquent']) assert.ok(!t.includes(rep), f + ' : ' + rep);
    const meth = d.querySelector('.fiche-meth');
    assert.ok(meth, f + ' : liens de fin de fiche');
    const sig = meth.querySelector('a[href^="../contact.html#motif="]');
    assert.equal(sig.textContent, 'Signaler une erreur sur cette fiche');
    const h = new URLSearchParams(sig.getAttribute('href').split('#')[1]);
    assert.equal(h.get('motif'), 'Erreur dans une fiche'); assert.equal(h.get('page'), '/' + f);
    assert.ok(meth.querySelector('a[href="../verification.html"]'), f + ' : méthode');
  }
  /* le formulaire de contact sait lire ce préremplissage (motif et page dans l’ancre) */
  assert.match(read('contact.js'), /location\.hash\.slice\(1\)/);
  /* les blocs « Autres … » varient d’une fiche à l’autre */
  const rel = id => [...doc('vehicules/' + id + '.html').querySelectorAll('.rel-card')].map(a => a.getAttribute('href')).join();
  const sport = data.LK_VEHICULES.filter(v => v.cat === 'sport');
  assert.notEqual(rel(sport[0].id), rel(sport[1].id));
  /* une case « sans objet » est une réponse, pas une attente : affichée avec sa raison (écrite une fois par fiche), jamais
     dans « Encore à relever » ni comptée comme un manque */
  const bat = doc('armes/batte.html'), batT = bat.querySelector('main').textContent.replace(/[\u00a0\u202f]/g, ' '), attente = d => [...d.querySelectorAll('.doc-wait li')].map(x => x.textContent);
  assert.equal(batT.split('Arme de mêlée : ni munitions, ni chargeur.').length - 1, 1, 'raison écrite une seule fois');
  for (const l of ['Cadence', 'Rechargement', 'Chargeur', 'Munitions compatibles', 'Coût des munitions']) assert.ok(!attente(bat).includes(l), 'batte : ' + l);
  assert.ok(![...bat.querySelectorAll('.fv-wait li')].some(x => x.textContent === 'Munitions'), 'batte : la rubrique Munitions est répondue');
  const bmx = doc('vehicules/bmx.html');
  assert.ok([...bmx.querySelectorAll('.doc-row.is-na dt')].some(x => x.textContent === 'Carburant'), 'bmx : carburant sans objet');
  assert.ok(!attente(bmx).includes('Carburant'), 'bmx : carburant');
});

test('verification.html : confirmé, pas encore annoncé, ce que les fiches attendent, méthode ; dans le plan du site et le pied de page, en cinq langues', () => {
  const d = doc('verification.html'), E = JSON.parse(read('outils/informations-editorial.json')).verification;
  assert.equal(d.querySelector('link[rel="canonical"]').href, 'https://www.leonidakit.com/verification.html');
  assert.equal(d.querySelectorAll('h1').length, 1);
  assert.deepEqual([...d.querySelectorAll('.ed-zone section.ed')].map(s => s.id), ['confirme', 'pas-encore', 'a-venir', 'modeles', 'jamais', 'signaler']);
  const items = d.querySelectorAll('#confirme .vf-item'); assert.equal(items.length, E.confirme.items.length);
  for (const it of items) { const src = [...it.querySelectorAll('a[target="_blank"]')].map(a => a.href); assert.ok(src.length === 1 && /^https:\/\/(?:www|support)\.rockstargames\.com\//.test(src[0]), src.join()); }
  const n = { 'veh-officiel': data.LK_VEHICULES.filter(v => v.st === 'officiel').length, 'arm-officiel': data.LK_ARMES.filter(a => a.st === 'officiel').length };
  const figs = [...d.querySelectorAll('#confirme .fig-n')].map(b => Number(b.textContent));
  assert.equal(figs[0], n['veh-officiel']); assert.equal(figs[2], n['arm-officiel']);
  assert.ok(d.querySelector('#a-venir .vf-rubs--couts') && d.querySelectorAll('#a-venir .vf-rubs--couts .vf-rub').length >= 5, 'coûts d’usage, poste par poste');
  assert.ok(inSitemap('verification.html'));
  for (const f of ['index.html', 'vehicules.html', 'armes/carabine.html']) assert.ok(doc(f).querySelector('footer a[href$="verification.html"]'), f + ' : pied de page');
  for (const l of LANGS) { assert.ok(exists(l + '/verification.html'), l); assert.equal(doc(l + '/verification.html').documentElement.lang.slice(0, 2), l); }
  assert.ok(!/Fiche documentaire/.test(read('verification.html')));
});

test('plan du site : dates tirées du contenu, plusieurs dates réelles, jamais dans le futur', () => {
  const L = require(path.join(root, 'outils/langues.cjs'));
  const a = '<html><head><title>T</title><script src="a.js?v=1"></script></head><body><nav>menu</nav><main><h1>Fiche</h1><p>Texte</p><script>x()</script><nav>autres</nav></main></body></html>';
  const b = a.replace('a.js?v=1', 'a.js?v=2').replace('<nav>menu</nav>', '<nav>menu modifié</nav>').replace('x()', 'y()').replace('<nav>autres</nav>', '<nav>suivant</nav>');
  assert.equal(L.printHash(a), L.printHash(b), 'gabarit, scripts et navigation ne changent pas la date');
  assert.notEqual(L.printHash(a), L.printHash(a.replace('Texte', 'Autre texte')), 'le contenu, si');
  const dates = [...sitemap.matchAll(/<lastmod>(\d{4}-\d\d-\d\d)<\/lastmod>/g)].map(m => m[1]);
  const today = new Date().toISOString().slice(0, 10);
  assert.ok(new Set(dates).size >= 4, 'dates distinctes : ' + new Set(dates).size);
  assert.ok(dates.every(x => x <= today && x >= '2026-10-01'));
  const D = JSON.parse(read('outils/sitemap-dates.json'));
  for (const u of [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1])) assert.ok(D[u], 'date tenue : ' + u);
});

test('IndexNow : clé publique à la racine, tâche planifiée chaque jour, envoi des seules pages modifiées', async () => {
  const H = require(path.join(root, 'api/indexnow.js')), K = H._test.KEY;
  assert.match(K, /^[0-9a-f]{32}$/); assert.equal(read(K + '.txt'), K);
  const v = JSON.parse(read('vercel.json'));
  assert.deepEqual(v.crons, [{ path: '/api/indexnow', schedule: '0 6 * * *' }]);
  const xml = '<urlset><url><loc>https://www.leonidakit.com/a.html</loc><lastmod>2026-10-10</lastmod></url><url><loc>https://www.leonidakit.com/b.html</loc><lastmod>2026-10-12</lastmod></url><url><loc>https://ailleurs.example/c.html</loc><lastmod>2026-10-12</lastmod></url></urlset>';
  assert.deepEqual(H._test.parseSitemap(xml).map(x => x.loc), ['https://www.leonidakit.com/a.html', 'https://www.leonidakit.com/b.html']);
  const db = new Map();
  const kv = async (url, o) => ({ ok: true, json: async () => JSON.parse(o.body).map(([c, k, val, ...rest]) => { if (c === 'GET') return { result: db.get(k) ?? null }; if (c === 'SET') { if (rest.includes('NX') && db.has(k)) return { result: null }; db.set(k, val); return { result: 'OK' }; } return { result: null }; }) });
  let sent = null;
  const fetch = async (url, o = {}) => { if (url.startsWith('https://kv.example')) return kv(url, o); if (url === 'https://www.leonidakit.com/sitemap.xml') return { ok: true, status: 200, text: async () => xml }; if (url === 'https://api.indexnow.org/indexnow') { sent = JSON.parse(o.body); return { status: 200, ok: true }; } throw Error('appel inattendu ' + url); };
  const run = (h, headers) => new Promise(resolve => { const res = { statusCode: 0, setHeader() {}, end(s) { resolve({ status: this.statusCode, body: JSON.parse(s) }); } }; h({ method: 'GET', headers }, res); });
  const env = { CRON_SECRET: 's3cret', KV_REST_API_URL: 'https://kv.example', KV_REST_API_TOKEN: 't' };
  const h = H.createHandler({ env, fetch, now: () => Date.parse('2026-10-12T06:00:00Z') });
  assert.equal((await run(h, { 'user-agent': 'vercel-cron/1.0' })).status, 401, 'sans le secret : refus');
  const r = await run(h, { authorization: 'Bearer s3cret', 'user-agent': 'vercel-cron/1.0' });
  assert.equal(r.status, 200); assert.equal(r.body.envoyees, 2, 'premier envoi : toutes les pages du plan du site');
  assert.equal(sent.host, 'www.leonidakit.com'); assert.equal(sent.key, K); assert.equal(sent.keyLocation, 'https://www.leonidakit.com/' + K + '.txt');
  assert.equal(db.get('lk:indexnow:depuis'), '2026-10-12');
  assert.equal((await run(h, { authorization: 'Bearer s3cret' })).status, 429, 'deux envois en moins de 20 heures : refus');
  db.delete('lk:indexnow:verrou'); sent = null;
  const r2 = await run(h, { authorization: 'Bearer s3cret' });
  assert.equal(r2.body.envoyees, 1, 'ensuite : seulement les pages datées du dernier envoi ou après'); assert.deepEqual(sent.urlList, ['https://www.leonidakit.com/b.html']);
  /* sans secret configuré, seul l’agent de la tâche planifiée de Vercel passe */
  const h2 = H.createHandler({ env: {}, fetch, now: () => Date.now() });
  assert.equal((await run(h2, { 'user-agent': 'curl/8' })).status, 401);
});

test('Léo : budget global par jour (appels et dollars), sans consommer les questions du visiteur, remis à zéro à minuit à Paris', async () => {
  const IA = require(path.join(root, 'api/ia.js')), T = IA._test;
  assert.equal(T.coutMicro('claude-sonnet-5-5', { input_tokens: 2000, output_tokens: 400, cache_read_input_tokens: 5000 }), 8500, '2 $ / 10 $ / 0,10 $ par million de jetons');
  assert.equal(T.coutMicro('claude-haiku-5-5', { input_tokens: 1e6 }), 100000);
  assert.equal(T.coutMicro('modele-inconnu', { input_tokens: 1e6 }), 10e6, 'modèle inconnu : prix le plus haut');
  assert.equal(T.dayKey(Date.parse('2026-10-24T23:30:00Z')), '2026-10-25');
  assert.equal(new Date(T.nextMidnight(Date.parse('2026-10-25T12:00:00Z'))).toISOString(), '2026-10-25T23:00:00.000Z', 'passage à l’heure d’hiver');
  assert.equal(new Date(T.nextMidnight(Date.parse('2026-11-19T10:00:00Z'))).toISOString(), '2026-11-19T23:00:00.000Z');
  assert.deepEqual(T.daySettings({}), { calls: T.DAY_CALLS_DEFAULT, micro: T.DAY_USD_DEFAULT * 1e6 });
  T.reset();
  let calls = 0;
  const fetch = async (url, o) => { calls++; return { ok: true, status: 200, json: async () => ({ content: [{ type: 'text', text: JSON.stringify({ reponse: 'R.', liens: [], trouve: true }) }], usage: { input_tokens: 1000, output_tokens: 100 } }) }; };
  const call = (h, body) => new Promise(resolve => { const res = { statusCode: 0, setHeader() {}, end(s) { resolve({ status: this.statusCode, body: JSON.parse(s) }); } }; h({ method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://www.leonidakit.com', 'x-forwarded-for': '5.6.7.8' }, body, socket: {} }, res); });
  const h = IA.createHandler({ env: { ANTHROPIC_API_KEY: 'k', LK_IA_PLAFOND_JOUR: '2' }, fetch });
  const dev = 'appareil-budget-0123456789';
  assert.equal((await call(h, { mode: 'leo', question: 'Une', appareil: dev })).status, 200);
  assert.equal((await call(h, { mode: 'leo', question: 'Deux', appareil: dev })).status, 200);
  const over = await call(h, { mode: 'leo', question: 'Trois', appareil: dev });
  assert.equal(over.status, 402); assert.equal(over.body.code, 'plafond'); assert.equal(over.body.restant, 13, 'la question refusée n’est pas comptée au visiteur');
  assert.ok(over.body.plafond > Date.now()); assert.equal(calls, 2, 'aucun appel à l’IA au-delà du budget');
  const etat = await call(h, { mode: 'etat', appareil: dev }); assert.equal(etat.status, 200); assert.ok(etat.body.plafond > Date.now(), 'l’état le dit');
  /* budget en dollars : 1 000 jetons en entrée et 100 en sortie = 3 000 micro-dollars ; budget de 0,005 $ → deux appels */
  T.reset(); calls = 0;
  const h2 = IA.createHandler({ env: { ANTHROPIC_API_KEY: 'k', LK_IA_BUDGET_JOUR: '0.005' }, fetch });
  for (let i = 0; i < 2; i++) assert.equal((await call(h2, { mode: 'leo', question: 'Q' + i, appareil: dev })).status, 200);
  assert.equal((await call(h2, { mode: 'leo', question: 'Q3', appareil: dev })).body.code, 'plafond'); assert.equal(calls, 2);
  T.reset();
  /* côté page : message dédié, mode local jusqu’à minuit, minuteur sur la bonne échéance */
  const ui = read('lk-ia.js');
  assert.match(ui, /plafond: 'L’IA du site a atteint sa limite du jour : mode local, elle revient dans \{timer\}\.'/);
  assert.match(ui, /j\.code === 'plafond'/); assert.match(ui, /state\.plafond && state\.plafond > Date\.now\(\)/);
});

test('mesure d’audience sans cookie : chargée par common.js sur le site publié seulement, refusable, décrite dans les Mentions', () => {
  const c = read('common.js');
  assert.match(c, /if\(h!=='www\.leonidakit\.com'&&h!=='leonidakit\.com'\)return;/);
  assert.match(c, /navigator\.globalPrivacyControl===true\|\|navigator\.doNotTrack==='1'/);
  assert.match(c, /localStorage\.getItem\(KEY\)==='1'/); assert.match(c, /const KEY='lk_mesure_off'/);
  assert.match(c, /u\.search='';u\.hash='';/, 'adresse sans paramètres ni ancre');
  assert.equal((c.match(/\/_vercel\/insights/g) || []).length, 1);
  const d = doc('mentions-legales.html'), row = d.getElementById('mesure-audience');
  assert.ok(row, 'ligne « Chaque page lue (mesure d’audience) »');
  assert.ok(row.querySelector('button[data-lk-mesure="off"]') && row.querySelector('button[data-lk-mesure="on"]'));
  assert.match(row.textContent, /Aucun cookie/);
  assert.match(d.getElementById('mises-a-jour').textContent, /v7\.86/);
  const csp = JSON.parse(read('vercel.json')).headers.find(h => h.source === '/(.*)').headers.find(x => /content-security-policy/i.test(x.key)).value;
  assert.match(csp, /script-src 'self';/); assert.match(csp, /connect-src 'self';/);
});

test('accueil : compte à rebours sans chiffre figé, jalons officiels du 12 et du 19 novembre', () => {
  const d = doc('index.html');
  for (const id of ['rd', 'rh', 'rm', 'rs']) assert.equal(d.getElementById(id).textContent.trim(), '–', id);
  const j = [...d.querySelectorAll('#jalons [data-jalon]')];
  assert.deepEqual(j.map(s => s.dataset.jalon), ['avant', 'pre', 'sorti']);
  assert.deepEqual(j.map(s => s.hidden), [false, true, true]);
  const app = read('app.js');
  assert.match(app, /const preload = new Date\("2026-11-12T00:00:00"\)/); assert.match(app, /const target = new Date\("2026-11-19T00:00:00"\)/);
  for (const l of LANGS) { const t = doc(l + '/index.html'); assert.equal(t.querySelectorAll('#jalons [data-jalon]').length, 3, l); assert.ok(!/Préchargement/.test(t.getElementById('jalons').textContent), l + ' : jalons traduits'); }
});

test('radios : la page dit les six stations officielles, plus « aucune station annoncée »', () => {
  for (const f of ['radios.html', ...LANGS.map(l => l + '/radios.html')]) {
    const d = doc(f);
    assert.equal(d.querySelectorAll('#stations .radios-station').length, 6, f);
    assert.ok(!/aucune station annoncée/i.test(d.querySelector('meta[name="description"]').content), f);
  }
  const k = JSON.parse(read('outils/leo-knowledge.json')).topics.find(t => t.id === 'radio');
  assert.match(k.text, /six stations le 8 octobre 2026/);
});
