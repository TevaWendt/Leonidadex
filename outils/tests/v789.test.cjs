'use strict';
/* v7.89 (lot 5) : appli installable, mode compagnon et transfert des données.
   Manifestes (un par langue publiée, liés depuis chaque page), icônes aux bonnes dimensions, service worker et ses règles
   (rejoué dans un bac à sable : pas de /api/, pas de /_vercel/, pas d'autre origine, pas de non-GET ; pages : réseau d'abord,
   copie, page hors connexion de la langue ; fichiers versionnés en cache d'abord ; plafonds ; purge des anciennes versions ;
   préparation « sans réseau » avec Léo), page hors connexion, page Mode compagnon (cinq langues, menu, pied de page,
   recherche, plan du site), aller-retour export → lien → aperçu → import identique, refus des liens abîmés, d'une autre
   origine, d'une version plus récente ou trop gros, QR code présent et lisible, Léo et Mentions. */
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('fs'), path = require('path'), vm = require('vm');
const { JSDOM } = require('jsdom');
const root = process.env.SITE_ROOT || path.resolve(__dirname, '../..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const CFG = JSON.parse(read('outils/langues.json'));
const PUB = CFG.langues.filter(l => l.etat === 'publiee');
const LANGS = PUB.filter(l => l.code !== 'fr');
const A = require(path.join(root, 'outils/appli.cjs'));
const T = require(path.join(root, 'transfert.js'));
const P = require(path.join(root, 'progression-core.js'));
const ORIGIN = 'https://www.leonidakit.com';
const png = f => { const b = fs.readFileSync(path.join(root, f)); assert.equal(b.toString('latin1', 1, 4), 'PNG', f); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };
const N = s => String(s).replace(/[  ]/g, ' ');
/* contenu d'une rubrique de cases (lk_own_…, lk_map_found) : les cases vraies (true ou 1), comme les lit progression-core.js */
const cases = (k, v) => /^lk_own_|^lk_map_found$/.test(k) && v ? JSON.stringify(Object.keys(JSON.parse(v)).filter(id => [true, 1].includes(JSON.parse(v)[id])).sort()) : v;

/* ---------- 1. manifestes et icônes ---------- */
test('manifestes : un par langue publiée, valides, couleurs du site, icônes et raccourcis traduits', () => {
  const theme = /<meta name="theme-color" content="([^"]+)"/.exec(read('index.html'))[1];
  for (const l of PUB) {
    const base = l.dossier ? '/' + l.dossier + '/' : '/', f = (l.dossier ? l.dossier + '/' : '') + 'manifest.webmanifest';
    const m = JSON.parse(read(f));
    assert.equal(m.name, 'Leonidakit'); assert.equal(m.short_name, 'Leonidakit');
    assert.equal(m.start_url, base, f); assert.equal(m.scope, base, f); assert.equal(m.id, base, f);
    assert.equal(m.display, 'standalone'); assert.equal(m.background_color, '#FDFBF7'); assert.equal(m.theme_color, theme);
    assert.equal(m.lang, l.locale, f); assert.ok(m.description && m.description.length > 40, f);
    const any = m.icons.filter(i => i.purpose === 'any'), mask = m.icons.filter(i => i.purpose === 'maskable');
    assert.deepEqual(any.map(i => i.sizes).sort(), ['192x192', '512x512']); assert.deepEqual(mask.map(i => i.sizes), ['512x512']);
    for (const i of m.icons) assert.equal(png(i.src.slice(1)).join('x'), i.sizes, i.src);
    assert.equal(m.shortcuts.length, 4, f);
    for (const s of m.shortcuts) {
      assert.ok(s.url.startsWith(base) && fs.existsSync(path.join(root, s.url.slice(1))), s.url);
      assert.ok(s.name && s.name.length >= 3, f);
      for (const i of s.icons) assert.equal(png(i.src.slice(1)).join('x'), i.sizes, i.src);
    }
    if (l.code !== 'fr') { assert.notEqual(m.description, A.TEXTES.description, f + ' : description traduite'); assert.notEqual(m.shortcuts[3].name, 'Mode compagnon', f + ' : raccourci traduit'); }
  }
  assert.deepEqual(png('img/app/apple-touch-icon-180.png'), [180, 180]);
  assert.match(read('img/app/icone.svg'), /#1A1A1E[\s\S]*#F5A524/, 'icône dessinée d’après le favicon : encre et soleil ambre');
});

test('chaque page porte le manifeste de sa langue et l’icône d’écran d’accueil', () => {
  const SKIP = new Set(['outils', 'api', 'node_modules', 'img', 'photos', 'fonts', 'leo', 'data', 'vendor', '.git', 'atelier']);
  const walk = d => fs.readdirSync(path.join(root, d), { withFileTypes: true }).flatMap(e => e.isDirectory() ? (SKIP.has(e.name) ? [] : walk(d ? d + '/' + e.name : e.name)) : e.name.endsWith('.html') && !e.name.startsWith('google') ? [d ? d + '/' + e.name : e.name] : []);
  const pages = walk('');
  assert.ok(pages.length > 2000, pages.length + ' pages');
  for (const p of pages) {
    const s = read(p), m = /^([a-z]{2})\//.exec(p), dossier = m && LANGS.some(l => l.dossier === m[1]) ? m[1] : '';
    assert.ok(s.includes('<link rel="manifest" href="/' + (dossier ? dossier + '/' : '') + 'manifest.webmanifest">'), p);
    assert.ok(s.includes('<link rel="apple-touch-icon" href="/img/app/apple-touch-icon-180.png">'), p);
    assert.equal((s.match(/rel="manifest"/g) || []).length, 1, p);
  }
});

/* ---------- 2. service worker : tampon et règles ---------- */
test('service worker : version, langues et pages préparées à jour (outils/appli.cjs), rien vers une autre origine', () => {
  const r = A.calculer(root), sw = read('sw.js'), code = sw.replace(/\/\*[\s\S]*?\*\//g, '');
  assert.equal(r.texte, sw, 'sw.js tamponné par la dernière synchronisation');
  assert.match(r.version, /^[a-f0-9]{12}$/);
  assert.deepEqual(r.langues, LANGS.map(l => l.dossier));
  for (const l of PUB) for (const p of r.pack) assert.ok(fs.existsSync(path.join(root, (l.dossier ? l.dossier + '/' : '') + (p || 'index.html'))), l.code + ' ' + p);
  assert.ok(r.pack.includes('carte.html') && r.pack.includes('calculateurs.html') && r.pack.includes('progression.html') && r.pack.some(p => p.startsWith('carnets/')));
  assert.doesNotMatch(sw, /https?:\/\//, 'aucune adresse absolue');
  assert.doesNotMatch(code, /importScripts|localStorage|indexedDB|document\.cookie/);
  /* enregistré par common.js (et ses copies traduites), https ou localhost seulement, sans erreur visible */
  for (const f of ['common.js', ...LANGS.map(l => l.dossier + '/common.js')]) {
    const c = read(f);
    assert.match(c, /'serviceWorker' in navigator && \(location\.protocol === 'https:' \|\| \/\^\(\?:localhost/, f);
    assert.match(c, /register\('\/sw\.js', \{ scope: '\/' \}\)\.catch\(function \(\) \{/, f);
  }
  /* en-têtes : pas de cache HTTP pour le service worker et les manifestes ; CSP inchangée */
  const V = JSON.parse(read('vercel.json')).headers;
  const h = src => (V.find(x => x.source === src) || { headers: [] }).headers;
  assert.ok(h('/sw.js').some(x => x.key === 'Cache-Control' && x.value === 'no-cache'));
  assert.ok(h('/manifest.webmanifest').some(x => x.key === 'Cache-Control' && x.value === 'no-cache'));
  assert.ok(h('/:lang(en|es|it|de|pt)/manifest.webmanifest').some(x => x.key === 'Cache-Control' && x.value === 'no-cache'));
  assert.ok(V.findIndex(x => x.source === '/sw.js') > V.findIndex(x => x.source === '/((?!api/).*)\\.(js|css)'), 'règle du service worker après la règle générique des scripts');
  assert.equal(h('/(.*)').find(x => x.key === 'Content-Security-Policy').value, "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data: blob:; connect-src 'self'; frame-src https://www.youtube-nocookie.com https://open.spotify.com; object-src 'none'; base-uri 'self'; frame-ancestors 'self'; form-action 'self' https://affd58b3.sibforms.com");
});

/* bac à sable : le vrai sw.js, avec un faux réseau qui sert les fichiers du site, un faux Cache Storage et de faux clients */
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
function bac(opts = {}) {
  const urlOf = r => new URL(typeof r === 'string' ? r : r.url, ORIGIN).href;
  const sans = u => u.split('?')[0];
  class Cache { constructor() { this.m = new Map(); }
    async match(r, o = {}) { const u = urlOf(r); for (const [k, v] of this.m) if (k === u || (o.ignoreSearch && sans(k) === sans(u))) return v.clone(); }
    async put(r, res) { const u = urlOf(r), b = await res.arrayBuffer(); this.m.delete(u); this.m.set(u, new Response(b, { status: res.status, headers: res.headers })); }
    async keys() { return [...this.m.keys()].map(k => ({ url: k })); }
    async delete(r) { return this.m.delete(urlOf(r)); } }
  const store = new Map();
  const caches = { async open(n) { if (!store.has(n)) store.set(n, new Cache()); return store.get(n); }, async keys() { return [...store.keys()]; }, async delete(n) { return store.delete(n); },
    async match(r, o = {}) { for (const n of o.cacheName ? [o.cacheName] : [...store.keys()]) { const c = store.get(n); if (!c) continue; const x = await c.match(r, o); if (x) return x; } } };
  const net = { offline: false, calls: [], delay: 0 };
  const fetchFn = async (r, init = {}) => {
    const u = new URL(urlOf(r)); net.calls.push(u.pathname + u.search);
    if (net.delay) await new Promise(res => setTimeout(res, net.delay));
    if (net.offline) throw new TypeError('Failed to fetch');
    if (u.origin !== ORIGIN) throw new Error('autre origine demandée : ' + u.href);
    let p = decodeURIComponent(u.pathname); if (p.endsWith('/')) p += 'index.html';
    const f = path.join(root, p.slice(1));
    if (!fs.existsSync(f) || !fs.statSync(f).isFile()) return new Response('introuvable', { status: 404, headers: { 'content-type': 'text/plain' } });
    return new Response((init.method || r.method) === 'HEAD' ? null : fs.readFileSync(f), { status: 200, headers: { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' } });
  };
  const handlers = {}, fenetres = (opts.fenetres || ['/']).map(p => ({ url: ORIGIN + p }));
  /* LK_CALME : 0 : les écritures différées (« quand la page s'est calmée ») partent tout de suite pendant les tests */
  const self = { LK_CALME: 0, location: new URL(ORIGIN + '/sw.js'), navigator: { connection: { saveData: false } }, addEventListener: (t, f) => { handlers[t] = f; },
    clients: { matchAll: async () => fenetres, claim: async () => {} }, skipWaiting: async () => {}, registration: { navigationPreload: { enable: async () => {} } } };
  const ctx = { self, caches, fetch: fetchFn, URL, Response, Request, Headers, Blob, TextDecoder, TextEncoder, setTimeout, clearTimeout, console, Promise, URLPattern: opts.URLPattern };
  vm.runInNewContext(read('sw.js'), ctx);
  const evenement = (extra = {}) => { const w = []; return Object.assign({ waitUntil: p => w.push(p), attendre: () => Promise.all(w.map(p => Promise.resolve(p).catch(() => {}))) }, extra); };
  const requete = (p, o = {}) => ({ url: new URL(p, ORIGIN).href, method: o.method || 'GET', mode: o.mode || 'no-cors', destination: o.destination || '', headers: new Headers(o.headers || {}) });
  /* réponse du service worker ; res.ms = temps jusqu'à la réponse (avant la fin du travail en arrière-plan) */
  async function demander(p, o = {}) {
    let rep = null; const e = evenement({ request: requete(p, o), preloadResponse: Promise.resolve(undefined), respondWith: x => { rep = x; } });
    const t0 = Date.now(); handlers.fetch(e);
    const res = rep ? await rep : null, ms = Date.now() - t0; await e.attendre(); if (res) res.ms = ms; return res;
  }
  const naviguer = p => demander(p, { mode: 'navigate', destination: 'document' });
  async function cycle(type) { const e = evenement(); handlers[type](e); await e.attendre(); }
  return { store, caches, net, handlers, demander, naviguer, cycle, ctx, evenement };
}

test('service worker : jamais /api/, /_vercel/, autre origine, requête non GET ou partielle ; les autres requêtes ont leur stratégie', async () => {
  const b = bac();
  for (const [p, o] of [['/api/ia', {}], ['/api/contact', { method: 'POST' }], ['/_vercel/insights/script.js', {}], ['/sw.js', {}], ['https://www.youtube-nocookie.com/embed/x', {}], ['https://open.spotify.com/embed/x', {}], ['/carte.html', { method: 'POST' }], ['/img/officiel/vice-city-01-480.webp', { headers: { range: 'bytes=0-10' } }]]) {
    let appel = false; b.handlers.fetch({ request: { url: new URL(p, ORIGIN).href, method: o.method || 'GET', mode: 'no-cors', destination: '', headers: new Headers(o.headers || {}) }, respondWith: () => { appel = true; }, waitUntil: () => {} });
    assert.equal(appel, false, p);
  }
  b.net.calls.length = 0;
  const css = /href="(style\.css\?v=[a-f0-9]+)"/.exec(read('index.html'))[1];
  assert.equal((await b.demander('/' + css)).status, 200);
  const avant = b.net.calls.length;
  assert.equal((await b.demander('/' + css)).status, 200);
  assert.equal(b.net.calls.length, avant, 'fichier versionné : la seconde fois, le cache répond (aucune requête)');
  /* image : la copie tout de suite, mise à jour en arrière-plan */
  await b.demander('/img/app/icone-192.png', { destination: 'image' }); b.net.calls.length = 0;
  assert.equal((await b.demander('/img/app/icone-192.png', { destination: 'image' })).status, 200);
  assert.deepEqual(b.net.calls, ['/img/app/icone-192.png'], 'revalidation en arrière-plan');
  b.net.offline = true;
  assert.equal((await b.demander('/img/app/icone-192.png', { destination: 'image' })).status, 200, 'sans réseau, la copie');
});

test('service worker : routes fixes (Chrome, Edge) : feuilles de style, scripts versionnés et polices du site lus dans les caches', async () => {
  class Motif { constructor(init) { Object.assign(this, init); } }
  const b = bac({ URLPattern: Motif }); let regles = null;
  const e = b.evenement({ addRoutes: async r => { regles = r; } }); b.handlers.install(e); await e.attendre();
  assert.ok(Array.isArray(regles) && regles.length === 3, 'trois routes');
  assert.deepEqual(Array.from(regles, r => r.condition.requestDestination).sort(), ['font', 'script', 'style']);
  for (const r of regles) {
    assert.equal(r.source, 'cache'); assert.equal(r.condition.requestMethod, 'GET');
    assert.equal(r.condition.urlPattern.hostname, new URL(ORIGIN).hostname, 'même origine seulement');
    assert.ok(r.condition.urlPattern.search === 'v=*' || r.condition.urlPattern.pathname === '/fonts/*');
  }
  /* sans routes fixes (Safari, Firefox) : rien ne casse, le gestionnaire « fetch » fait la même chose */
  const b2 = bac(); const e2 = b2.evenement(); b2.handlers.install(e2); await e2.attendre();
  assert.ok((await b2.caches.keys()).some(n => /-coquille$/.test(n)));
});

test('service worker : installation (coquille de la langue), page vue sans réseau, page jamais vue → page hors connexion de la langue', async () => {
  for (const l of PUB) {
    const base = l.dossier ? '/' + l.dossier + '/' : '/', b = bac({ fenetres: [base] });
    await b.cycle('install'); await b.cycle('activate');
    const noms = await b.caches.keys(), coq = noms.find(n => /^lk-[a-f0-9]{12}-coquille$/.test(n));
    assert.ok(coq, l.code + ' : coquille');
    const cles = (await (await b.caches.open(coq)).keys()).map(k => new URL(k.url).pathname);
    assert.ok(cles.includes(base + 'hors-ligne.html'), l.code + ' : page hors connexion gardée');
    assert.ok(cles.includes('/style.css') && cles.includes('/fonts/archivo-latin.woff2'), l.code + ' : feuille de style et police');
    assert.ok(!cles.some(c => /search-(?:index|lieux)\.js$/.test(c)), l.code + ' : la coquille laisse de côté les scripts chargés à la demande');
    const vue = await b.naviguer(base + 'carte.html');
    assert.equal(vue.status, 200);
    /* la page vue a laissé ses fichiers immuables (recopiés du cache du navigateur) : un script versionné de carte.html */
    const src = /<script src="([^"]+\?v=[a-f0-9]+)"><\/script>/.exec(read((l.dossier ? l.dossier + '/' : '') + 'carte.html'))[1];
    const u = new URL(src, ORIGIN + base + 'carte.html');
    assert.ok(await b.caches.match(u.pathname + u.search), l.code + ' : fichier de la page vue gardé : ' + u.pathname + u.search);
    b.net.offline = true;
    const copie = await b.naviguer(base + 'carte.html?x=1#y');
    assert.equal(copie.status, 200); assert.match(await copie.text(), new RegExp('<html lang="' + l.code + '"'));
    const hors = await b.naviguer(base + 'vehicules.html');
    const html = await hors.text();
    assert.match(html, new RegExp('<html lang="' + l.code + '"'), l.code + ' : page hors connexion de la langue');
    assert.match(html, /data-hl-liste/);
  }
});

test('service worker : réseau d’abord avec délai court (copie si le réseau tarde), plafond des pages, reprise puis purge des anciennes versions', async () => {
  const b = bac(); await b.cycle('install'); await b.cycle('activate');
  await b.naviguer('/tuto.html');
  b.net.delay = 5000;
  const r = await b.naviguer('/tuto.html');
  assert.equal(r.status, 200); assert.ok(r.ms >= 2900 && r.ms < 4500, 'la copie répond au bout du délai court, avant le réseau (' + r.ms + ' ms)');
  b.net.delay = 0;
  const pages = fs.readdirSync(path.join(root, 'vehicules')).filter(f => f.endsWith('.html')).slice(0, 70);
  for (const p of pages) await b.naviguer('/vehicules/' + p);
  const nom = (await b.caches.keys()).find(n => /-pages$/.test(n));
  assert.ok((await (await b.caches.open(nom)).keys()).length <= 60, 'plafond de 60 pages');
  /* une version plus ancienne : copies encore utiles reprises, anciens caches supprimés ; l'ancienne préparation reste en service
     jusqu'à la nouvelle */
  const html = t => new Response(t, { headers: { 'content-type': 'text/html; charset=utf-8' } });
  const vieux = await b.caches.open('lk-0123456789ab-pack'); await vieux.put('/__lk/pack-fr.json', new Response('{}')); await vieux.put(ORIGIN + '/carte.html', html('<html lang="fr">ancienne</html>'));
  await (await b.caches.open('lk-0123456789ab-pages')).put(ORIGIN + '/page-vue.html', html('<html lang="fr">vue</html>'));
  await (await b.caches.open('lk-0123456789ab-fichiers')).put('/vieux.css?v=abcdef123456', new Response('a{}'));
  await b.caches.open('lk-0123456789ab-coquille');
  await b.cycle('activate');
  let noms = await b.caches.keys();
  for (const g of ['pages', 'fichiers', 'coquille']) assert.ok(!noms.includes('lk-0123456789ab-' + g), 'ancien cache supprimé : ' + g);
  assert.ok(noms.includes('lk-0123456789ab-pack'), 'ancienne préparation gardée jusqu’à la nouvelle');
  assert.ok(noms.includes('lk-reglages'), 'réglages gardés');
  const neuf = noms.find(n => /^lk-[a-f0-9]{12}-pages$/.test(n) && !n.startsWith('lk-0123456789ab'));
  assert.ok(await (await b.caches.open(neuf)).match(ORIGIN + '/page-vue.html'), 'page vue reprise');
  assert.ok(await b.caches.match('/vieux.css?v=abcdef123456'), 'fichier versionné repris');
  const regl = async () => (await (await b.caches.match('/__lk/reglages.json', { cacheName: 'lk-reglages' })).json()).refaire;
  assert.deepEqual(await regl(), ['fr']);
  /* la nouvelle préparation (ici, à la page suivante vue avec du réseau) puis la suppression de l'ancienne */
  await b.naviguer('/carte.html');
  noms = await b.caches.keys();
  assert.ok(!noms.includes('lk-0123456789ab-pack'), 'ancienne préparation supprimée après la nouvelle');
  assert.deepEqual(await regl(), []);
  const fiche = await (await b.caches.match('/__lk/pack-fr.json')).json();
  assert.ok(fiche.version !== '0123456789ab' && fiche.reprises > 0, 'nouvelle préparation, fichiers immuables repris sans réseau : ' + JSON.stringify(fiche));
});

test('service worker : « Préparer pour jouer sans réseau » garde les pages clés, leurs fichiers et Léo de la langue', async () => {
  for (const l of [PUB[0], LANGS.find(x => x.code === 'de') || LANGS[0]]) {
    const base = l.dossier ? '/' + l.dossier + '/' : '/', b = bac({ fenetres: [base] });
    await b.cycle('install'); await b.cycle('activate');
    const messages = [], port = { postMessage: m => messages.push(m) };
    const e = b.evenement({ data: { type: 'lk-preparer', langue: l.code }, ports: [port] });
    b.handlers.message(e); await e.attendre();
    const fin = messages.find(m => m.type === 'pr-fin');
    assert.ok(fin, l.code + ' : ' + JSON.stringify(messages.filter(m => m.type === 'pr-erreur')));
    assert.equal(fin.echecs, 0, l.code + ' : aucun fichier manquant');
    const pack = (await b.caches.keys()).find(n => /-pack$/.test(n)), cles = (await (await b.caches.open(pack)).keys()).map(k => new URL(k.url)).map(u => u.pathname + u.search);
    for (const p of A.pack(root)) assert.ok(cles.includes(base + p), l.code + ' : ' + p);
    assert.ok(cles.some(k => k.startsWith(base + 'leo-index.json?v=')), l.code + ' : index de Léo');
    assert.ok(cles.filter(k => k.startsWith(base + 'leo/') && k.includes('.json?v=')).length >= 10, l.code + ' : morceaux de Léo');
    assert.ok(cles.some(k => /leo-ui\.js\?v=/.test(k)) && cles.some(k => /leo-core\.js\?v=/.test(k)), l.code + ' : modules de Léo');
    assert.ok(cles.some(k => /\/fonts\/archivo-latin\.woff2/.test(k)), l.code + ' : police');
    assert.ok(cles.some(k => /carte-gtadb\.js\?v=/.test(k)) && cles.some(k => /calculateurs-engine\.js\?v=/.test(k)), l.code + ' : scripts de la carte et du calculateur');
    assert.ok(messages.filter(m => m.type === 'pr-progres').length >= 20, 'progression annoncée');
    /* sans réseau : une page préparée jamais vue s'ouvre */
    b.net.offline = true;
    assert.match(await (await b.naviguer(base + 'calculateurs.html')).text(), /id="atelier"/);
    const fiche = await (await b.caches.match('/__lk/pack-' + l.code + '.json')).json();
    assert.equal(fiche.langue, l.code); assert.ok(fiche.fichiers > 40 && fiche.octets > 1e6, JSON.stringify(fiche));
    /* « Mettre à jour la préparation » : les fichiers immuables déjà gardés ne sont pas retéléchargés, seules les pages le sont */
    b.net.offline = false; b.net.calls.length = 0; messages.length = 0;
    const e2 = b.evenement({ data: { type: 'lk-preparer', langue: l.code }, ports: [port] }); b.handlers.message(e2); await e2.attendre();
    const fin2 = messages.find(m => m.type === 'pr-fin');
    assert.ok(fin2 && fin2.echecs === 0 && fin2.reprises > 30, l.code + ' : ' + JSON.stringify(fin2));
    const autres = b.net.calls.filter(c => !A.pack(root).some(p => c === base + p));
    assert.ok(autres.every(c => !/\?v=/.test(c)), l.code + ' : fichiers versionnés retéléchargés : ' + autres.join(' '));
  }
});

/* ---------- 3. pages ---------- */
test('page hors connexion : cinq langues, noindex, adresses absolues, hors du plan du site et de la recherche', () => {
  for (const l of PUB) {
    const f = (l.dossier ? l.dossier + '/' : '') + 'hors-ligne.html', s = read(f), d = new JSDOM(s).window.document;
    assert.equal(d.documentElement.lang, l.code);
    assert.equal(d.querySelector('meta[name="robots"]').content, 'noindex, follow');
    /* adresse canonique de la page elle-même (exigée par le vérificateur et coverage.test, sauf sur 404.html), sans hreflang ni balises de partage */
    assert.equal((d.querySelector('link[rel="canonical"]') || {}).href, 'https://www.leonidakit.com/' + f, f);
    assert.ok(!d.querySelector('link[rel="alternate"][hreflang]') && !d.querySelector('meta[property="og:image"]'), f);
    assert.ok(d.querySelector('[data-hl-liste]') && d.querySelector('[data-hl-reessayer]'), f);
    assert.equal(d.querySelectorAll('h1').length, 1);
    for (const x of d.querySelectorAll('link[href], script[src]')) { const u = x.getAttribute('href') || x.getAttribute('src'); if (!/^(?:data:|https:|#)/.test(u)) assert.ok(u.startsWith('/'), f + ' : ' + u); }
    /* tous les liens, barre des langues comprise : la page s'affiche à n'importe quelle adresse */
    for (const a of d.querySelectorAll('a[href]')) assert.ok(/^\/|^#|^https:/.test(a.getAttribute('href')), f + ' : ' + a.getAttribute('href'));
    if (l.code !== 'fr') assert.notEqual(N(d.querySelector('h1').textContent), 'Pas de réseau pour l’instant', f + ' : traduite');
  }
  for (const sm of ['sitemap.xml', 'sitemap-fiches.xml']) assert.ok(!read(sm).includes('hors-ligne'), sm);
  assert.ok(!read('search-index.js').includes('hors-ligne'), 'pas dans la recherche');
});

test('page Mode compagnon : cinq langues, SEO, sections, tuiles, menu, pied de page, recherche et plan du site', () => {
  const descs = new Set();
  for (const l of PUB) {
    const f = (l.dossier ? l.dossier + '/' : '') + 'compagnon.html', s = read(f), d = new JSDOM(s).window.document;
    assert.equal(d.documentElement.lang, l.code);
    const title = d.querySelector('title').textContent;
    assert.match(title, /GTA 6/, f); assert.ok(title.length <= 70, f + ' : ' + title);
    const desc = d.querySelector('meta[name="description"]').content; assert.ok(desc.length <= 160 && desc.length > 80, f + ' : ' + desc.length); assert.ok(!descs.has(desc)); descs.add(desc);
    assert.equal(d.querySelectorAll('h1').length, 1);
    assert.equal(d.querySelector('link[rel="canonical"]').href, ORIGIN + '/' + (l.dossier ? l.dossier + '/' : '') + 'compagnon.html');
    assert.equal(d.querySelectorAll('link[rel="alternate"][hreflang]').length, PUB.length + 1, f + ' : hreflang');
    assert.ok(s.includes('"@type":"BreadcrumbList"') && s.includes('"@type":"FAQPage"') && s.includes('"@type":"WebPage"'), f + ' : données structurées');
    assert.equal(d.querySelectorAll('[data-cp-story] [data-cp-step]').length, 4); /* v7.92 : quatre étapes au lieu des quatre tuiles */
    for (const id of ['outils', 'sans-reseau', 'installer', 'changer-d-appareil', 'faq', 'reception']) assert.ok(d.getElementById(id), f + ' #' + id);
    assert.ok(d.querySelector('.lk-stack img[fetchpriority="high"]'), f + ' : pile d’images officielles');
    for (const img of d.querySelectorAll('.lk-stack img')) assert.match(img.alt, /Rockstar Games/);
    assert.ok(d.querySelector('[data-cp-preparer]') && d.querySelector('[data-cp-installer]') && d.querySelector('[data-cp-ecran][hidden]') && d.querySelector('[data-tr-creer]') && d.querySelector('[data-tr-exporter]'), f);
    assert.ok(d.querySelector('script[type="lk/lazy"][src*="qrcode-generator.js"]'), f + ' : encodeur QR à la demande');
    assert.ok(!d.querySelector('script[src*="qrcode-generator.js"]:not([type])'), f + ' : pas chargé avec la page');
    /* menu « Explorer › Le site » et pied de page « Outils et aide » */
    assert.ok([...d.querySelectorAll('.nav-more-panel a')].some(a => a.getAttribute('href') === 'compagnon.html'), f + ' : menu');
    assert.ok([...d.querySelectorAll('footer a')].some(a => a.getAttribute('href') === 'compagnon.html'), f + ' : pied de page');
  }
  /* toutes les pages : le lien du menu et du pied de page */
  for (const p of ['index.html', 'carte.html', 'vehicules/karin-sultan.html', 'de/armes.html', 'en/progression.html']) {
    const s = read(p); assert.equal((s.match(/href="(?:\.\.\/)?compagnon\.html"/g) || []).length, 2, p);
  }
  for (const l of PUB) assert.ok(read('sitemap.xml').includes('<loc>' + ORIGIN + '/' + (l.dossier ? l.dossier + '/' : '') + 'compagnon.html</loc>'), l.code + ' : plan du site');
  assert.ok(JSON.parse(read('outils/sitemap-dates.json'))[ORIGIN + '/compagnon.html'], 'date du plan du site');
  const idx = vm.runInNewContext(read('search-index.js') + ';window.LK_INDEX', { window: {} });
  assert.ok(idx.some(e => e.u === '/compagnon.html' && /hors connexion/.test(e.s) && /qr code/.test(e.s)), 'recherche');
  const en = vm.runInNewContext(read('en/search-index.js') + ';window.LK_INDEX', { window: {} });
  assert.ok(en.some(e => e.u === '/en/compagnon.html'), 'recherche en anglais');
});

test('page Progression : bloc « Passer sur un autre appareil » (même composant que la page compagnon)', () => {
  for (const l of PUB) {
    const f = (l.dossier ? l.dossier + '/' : '') + 'progression.html', d = new JSDOM(read(f)).window.document;
    const bloc = d.querySelector('#sauvegarde .cp-tr-progression [data-tr-envoi]');
    assert.ok(bloc, f); assert.ok(bloc.querySelector('[data-tr-creer]') && bloc.querySelector('[data-tr-qr]') && bloc.querySelector('[data-tr-lien]'));
    assert.ok(d.querySelector('script[src*="transfert.js"]') && d.querySelector('link[href*="compagnon.css"]'), f);
    /* transfert.js ne retarde pas la page : chargé après le chargement, quand le navigateur est libre (common.js) */
    const tr = d.querySelector('script[src*="transfert.js"]');
    assert.equal(tr.getAttribute('type'), 'lk/lazy', f); assert.ok(tr.hasAttribute('data-lk-idle'), f);
    assert.ok(bloc.querySelector('[data-cp-js][hidden] [data-tr-creer]'), f + ' : bouton caché sans script, montré par transfert.js');
    assert.ok(d.querySelector('#save-export') && d.querySelector('#save-import'), f + ' : export / import existants gardés');
  }
  /* le chargeur des scripts « data-lk-idle » (common.js) et l'affichage des commandes par transfert.js */
  assert.match(read('common.js'), /script\[type="lk\/lazy"\]\[data-lk-idle\]/);
  assert.match(read('transfert.js'), /\$\$\('\[data-cp-js\]', box\)\.forEach\(el => \{ el\.hidden = false; \}\)/);
});

/* ---------- 4. transfert ---------- */
function stockage(init = {}) { const m = new Map(Object.entries(init)); return { getItem: k => m.has(k) ? m.get(k) : null, setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), key: i => [...m.keys()][i] ?? null, get length() { return m.size; } }; }
const donnees = () => {
  const c = { window: {} }; for (const f of ['progression-data.js', 'acquisitions-data.js', 'collectibles-data.js']) vm.runInNewContext(read(f), c);
  return { ids: c.window.LK_PROGRESS_IDS, acquisitions: c.window.LK_ACQUISITIONS, collectibles: (c.window.LK_COLLECTIBLES || {}).items || [] };
};
const SUIVI = () => { const D = donnees(); const v = D.ids.vehicules.slice(0, 7), w = D.ids.armes.slice(0, 3), p = D.ids.lieux.slice(0, 12);
  return { lk_own_vehicules: JSON.stringify(Object.fromEntries(v.map(x => [x, true]))), lk_own_armes: JSON.stringify(Object.fromEntries(w.map(x => [x, true]))), lk_map_found: JSON.stringify(Object.fromEntries(p.map(x => [x, 1]))),
    'lk-calculator-notebooks-v3': JSON.stringify({ version: 3, entries: [{ tool: 'goal', id: 'a' }, { tool: 'roi', id: 'b' }, { tool: 'plan', id: 'c' }] }), 'lk-trophees-obtenus-v1': JSON.stringify(['t1', 't2']), lk_contact_brouillon: 'adresse@exemple.invalid', lk_markers_v2: JSON.stringify([{ n: 'Ma planque', x: 1, y: 2 }]) }; };

test('transfert : aller-retour export → lien → aperçu → import identique (fusionner et remplacer), données privées jamais transportées', async () => {
  const D = donnees(), src = stockage(SUIVI()), s1 = P.create({ storage: src, ...D });
  const out = s1.exportData();
  const { charge } = await T.encoder(out, ORIGIN);
  const lien = T.lienDe(ORIGIN + '/compagnon.html', charge);
  assert.match(lien, /^https:\/\/www\.leonidakit\.com\/compagnon\.html#transfert=1z[A-Za-z0-9_-]+$/);
  assert.ok(lien.length < 4000, lien.length + ' caractères');
  const { json } = await T.decoder(T.chargeDe(new URL(lien).hash), ORIGIN);
  assert.equal(json, JSON.stringify(out), 'suivi identique après le voyage');
  const dst = stockage(), s2 = P.create({ storage: dst, ...D }), plan = s2.prepareImport(json);
  assert.deepEqual(T.compter(plan.rubrics), { cases: 7 + 3 + 12 + 2, calculs: 2, plans: 1, rubriques: Object.keys(out.data).length });
  s2.applyImport(plan, 'merge');
  for (const [k, v] of Object.entries(out.data)) assert.equal(cases(k, dst.getItem(k)), cases(k, v), k);
  assert.equal(dst.getItem('lk_contact_brouillon'), null, 'le brouillon de Contact ne voyage jamais');
  assert.ok(!('lk_contact_brouillon' in out.data), 'ni dans le lien');
  const dst2 = stockage({ lk_own_vehicules: JSON.stringify({ autre: true }) }), s3 = P.create({ storage: dst2, ...D });
  s3.applyImport(s3.prepareImport(json), 'merge');
  assert.equal(Object.keys(JSON.parse(dst2.getItem('lk_own_vehicules'))).length, 8, 'fusionner garde les cases déjà là');
  s3.applyImport(s3.prepareImport(json), 'replace');
  assert.equal(dst2.getItem('lk_own_vehicules'), out.data.lk_own_vehicules, 'remplacer met le suivi reçu à la place');
  /* sans compression (navigateur ancien) : même suivi */
  const sauve = global.CompressionStream; global.CompressionStream = undefined;
  try { const r = await T.encoder(out, ORIGIN); assert.ok(r.charge.startsWith('1j')); assert.equal((await T.decoder(r.charge, ORIGIN)).json, JSON.stringify(out)); } finally { global.CompressionStream = sauve; }
});

test('transfert : refus propre d’un lien abîmé, d’une autre origine, d’une version plus récente ou trop gros', async () => {
  const { charge } = await T.encoder(JSON.stringify({ site: 'leonidakit', version: 2, data: { lk_own_vehicules: '{"a":true}' } }), ORIGIN);
  const refus = async (c, o = ORIGIN) => { try { await T.decoder(c, o); return 'accepté'; } catch (e) { return e.code; } };
  assert.equal(await refus(charge.slice(0, -6)), 'E_ABIME', 'tronqué');
  assert.equal(await refus(charge.slice(0, 20) + (charge[20] === 'A' ? 'B' : 'A') + charge.slice(21)), 'E_ABIME', 'un caractère changé');
  assert.equal(await refus(charge + '%%'), 'E_ABIME', 'caractères étrangers');
  assert.equal(await refus(''), 'E_ABIME'); assert.equal(await refus('1q' + charge.slice(2)), 'E_ABIME');
  assert.equal(await refus('2' + charge.slice(1)), 'E_VERSION');
  assert.equal(await refus(charge, 'https://autre-site.example'), 'E_ORIGINE');
  assert.equal(await refus('1j' + 'A'.repeat(T.LIMITE_LIEN)), 'E_TAILLE');
  /* bombe de décompression : 6 Mo de zéros font un lien court, refusé au-delà de la limite */
  const zeros = new Uint8Array(6 * 1048576), z = new Uint8Array(await new Response(new Blob([zeros]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer());
  assert.equal(await refus('1z' + T.b64url(z)), 'E_TAILLE');
  /* un lien valide qui n'est pas un suivi Leonidakit : refusé par l'import existant */
  const autre = await T.encoder(JSON.stringify({ site: 'autre', data: {} }), ORIGIN);
  const { json } = await T.decoder(autre.charge, ORIGIN);
  assert.throws(() => P.create({ storage: stockage(), ...donnees() }).prepareImport(json), /ne vient pas de Leonidakit/);
  assert.equal(T.chargeDe('#transfert=abc'), 'abc'); assert.equal(T.chargeDe('#transfert=a%20b'), ''); assert.equal(T.chargeDe('#autre'), null);
});

test('transfert : QR code présent et lisible (relu par jsQR quand il est installé), refusé au-delà de la version 30', async () => {
  const Q = vm.runInNewContext(read('vendor/qrcode-generator.js') + ';qrcode', {});
  assert.match(read('vendor/LICENSE-qrcode-generator.txt'), /MIT License[\s\S]*Kazuhiko Arase/);
  const D = donnees(), out = P.create({ storage: stockage(SUIVI()), ...D }).exportData(), { charge } = await T.encoder(out, ORIGIN);
  const lien = T.lienDe(ORIGIN + '/compagnon.html', charge), q = T.qrSvg(lien, Q);
  assert.ok(q && q.svg.startsWith('<svg') && q.modules <= 4 * T.QR_VERSION_MAX + 17, 'QR dessiné');
  assert.match(q.svg, /role="img" aria-label="QR code du lien de transfert"/);
  /* relecture : la matrice du QR, agrandie, passe dans un décodeur indépendant */
  let jsQR = null; try { jsQR = require('jsqr'); } catch (e) { jsQR = null; }
  const qr = Q(0, q.niveau); qr.addData(lien); qr.make();
  const n = qr.getModuleCount(), m = 4, k = 4, w = (n + 2 * m) * k, px = new Uint8ClampedArray(w * w * 4).fill(255);
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) for (let y = 0; y < k; y++) for (let x = 0; x < k; x++) { const i = (((r + m) * k + y) * w + (c + m) * k + x) * 4; px[i] = px[i + 1] = px[i + 2] = 0; }
  if (jsQR) assert.equal(jsQR(px, w, w).data, lien, 'QR relu à l’identique');
  else { assert.ok(qr.isDark(0, 0) && qr.isDark(6, 6) && !qr.isDark(7, 7), 'motifs de repérage'); console.log('# jsqr absent (npm i jsqr dans le dossier des dépendances) : relecture du QR remplacée par un contrôle des motifs'); }
  assert.equal(T.qrSvg('x'.repeat(2500), Q), null, 'trop gros pour un QR code lisible');
});

test('transfert : la page compagnon ouverte avec le lien montre l’aperçu, importe au choix, puis nettoie l’adresse ; lien abîmé refusé', async () => {
  const D = donnees(), out = P.create({ storage: stockage(SUIVI()), ...D }).exportData(), { charge } = await T.encoder(out, ORIGIN);
  async function ouvrir(hash) {
    const dom = new JSDOM(read('compagnon.html'), { url: ORIGIN + '/compagnon.html' + hash, runScripts: 'outside-only', pretendToBeVisual: true });
    const w = dom.window;
    Object.assign(w, { CompressionStream, DecompressionStream, Blob, Response, TextEncoder, TextDecoder });
    w.LK = { lazyScript: async () => {}, copy: async () => true, status: () => {} };
    for (const f of ['progression-data.js', 'acquisitions-data.js', 'collectibles-data.js', 'progression-core.js', 'transfert.js']) w.eval(read(f));
    const zone = w.document.querySelector('[data-tr-reception]');
    for (let i = 0; i < 100 && !/cases|abîmé/.test(N(zone.querySelector('[data-tr-apercu]').textContent)); i++) await new Promise(r => setTimeout(r, 20));
    return { w, zone };
  }
  const { w, zone } = await ouvrir('#transfert=' + charge);
  assert.equal(zone.hidden, false);
  const apercu = N(zone.querySelector('[data-tr-apercu]').textContent);
  assert.match(apercu, /24 cases cochées, 2 calculs, 1 plan, \d+ rubriques en tout/);
  assert.equal(zone.querySelector('[data-tr-choix]').hidden, false);
  assert.equal(w.localStorage.getItem('lk_own_vehicules'), null, 'rien d’écrit avant le choix');
  zone.querySelector('[data-tr-fusionner]').click();
  await new Promise(r => setTimeout(r, 50));
  for (const [k, v] of Object.entries(out.data)) assert.equal(cases(k, w.localStorage.getItem(k)), cases(k, v), k);
  assert.equal(w.location.hash, '', 'adresse nettoyée');
  assert.match(N(zone.querySelector('[data-tr-recu-msg]').textContent), /rubriques fusionnées/);
  const r2 = await ouvrir('#transfert=' + charge.slice(0, -9));
  assert.match(N(r2.zone.querySelector('[data-tr-apercu]').textContent), /abîmé ou incomplet/);
  assert.equal(r2.zone.dataset.trEtat, 'refus'); assert.equal(r2.zone.querySelector('[data-tr-choix]').hidden, true);
  assert.equal(r2.w.localStorage.length, 0, 'rien d’écrit'); assert.equal(r2.w.location.hash, '');
});

/* ---------- 5. Léo, Mentions, confidentialité ---------- */
test('Léo : installer le site, hors connexion, changer de téléphone, dans les cinq langues', async () => {
  const K = JSON.parse(read('outils/leo-knowledge.json')).topics;
  for (const id of ['installer-site', 'hors-connexion', 'changer-telephone']) { const t = K.find(x => x.id === id); assert.ok(t && t.links[0].url.startsWith('/compagnon.html#'), id); }
  const E = require('./leo-eval.cjs');
  for (const l of PUB) {
    const r = await E.run({ lang: l.code, questions: path.join(__dirname, 'leo-questions-v789-' + l.code + '.json') });
    assert.ok(r.correct / r.questions >= 0.88, l.code + ' : ' + r.correct + '/' + r.questions + ' (le détail des réponses manquées est écrit juste au-dessus)');
    assert.equal(r.withoutSource, 0, l.code + ' : réponses sans source');
  }
});

test('scripts traduits : les codes internes (états, messages du service worker, erreurs) restent identiques dans chaque langue', () => {
  const codes = f => (read(f).match(/'(?:s-[a-z]+|pr-[a-z]+|pf-[a-z]+|E_[A-Z]+|lk-preparer|sw-delai)'/g) || []).sort();
  for (const f of ['compagnon.js', 'transfert.js']) { const fr = codes(f); assert.ok(fr.length > 5, f); for (const l of LANGS) assert.deepEqual(codes(l.dossier + '/' + f), fr, l.dossier + '/' + f); }
  for (const l of LANGS) assert.match(read(l.dossier + '/common.js'), /document\.hidden\) return;/, l.dossier + '/common.js : écran allumé');
});

test('Mentions : copies du service worker, écran allumé et transfert décrits ; aucun cookie ; clés « lk »', () => {
  for (const l of PUB) {
    const f = (l.dossier ? l.dossier + '/' : '') + 'mentions-legales.html', d = new JSDOM(read(f)).window.document;
    assert.ok(d.getElementById('copies-hors-connexion') && d.getElementById('transfert'), f);
    if (l.code === 'fr') { const t = N(d.getElementById('copies-hors-connexion').textContent); assert.match(t, /service worker/); assert.match(t, /rien sur toi, rien d’envoyé/); assert.match(N(d.getElementById('transfert').textContent), /n’envoie jamais au serveur/); }
  }
  const all = ['compagnon.js', 'transfert.js', 'sw.js', 'common.js'].map(read).join('\n');
  assert.doesNotMatch(all, /document\.cookie|cookieStore/);
  for (const m of all.matchAll(/localStorage\.setItem\('([^']+)'/g)) assert.match(m[1], /^lk/);
});
