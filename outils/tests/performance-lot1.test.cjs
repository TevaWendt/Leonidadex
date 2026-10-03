/* v7.54 — lot 1 (performance) : contrôles qui protègent les mécanismes ajoutés.
   NODE_PATH=<deps>/node_modules SITE_ROOT=$PWD node --test outils/tests/performance-lot1.test.cjs */
'use strict';
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('fs'), path = require('path');
const { load } = require('./runtime-helper.cjs');
const root = process.env.SITE_ROOT || path.resolve(__dirname, '../..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const walk = d => fs.readdirSync(path.join(root, d), { withFileTypes: true }).flatMap(x => x.isDirectory() ? walk(path.join(d, x.name)) : [path.join(d, x.name)]);
const pages = ['', 'armes', 'vehicules', 'lieux', 'personnages', 'entreprises', 'demeures', 'planques', 'gangs', 'carnets'].flatMap(d => (d ? walk(d) : fs.readdirSync(root)).filter(f => f.endsWith('.html') && !path.basename(f).startsWith('google')));

test('PERF-04 : aucune page ne télécharge l’index de recherche au chargement ; il est déclaré en différé, versionné, avec les lieux', () => {
  let lazy = 0;
  for (const f of pages) {
    const html = read(f);
    assert.doesNotMatch(html, /<script src="(?:\.\.\/|\/)?search-(?:index|lieux)\.js/, f + ' : index chargé d’avance');
    const tags = [...html.matchAll(/<script type="lk\/lazy" src="((?:\.\.\/|\/)?)search-(index|lieux)\.js\?v=([a-f0-9]{12})"><\/script>/g)];
    if (!/class="[^"]*\bsearchwrap\b/.test(html)) continue;
    assert.equal(tags.filter(t => t[2] === 'index').length, 1, f + ' : une déclaration de l’index');
    assert.equal(tags.filter(t => t[2] === 'lieux').length, 1, f + ' : une déclaration des lieux');
    lazy++;
  }
  assert.ok(lazy > 30, 'pages avec recherche : ' + lazy);
});

test('PERF-04 : les données véhicules et armes ne sont chargées que par les pages qui les lisent', () => {
  const readers = { 'vehicules-data.js': ['calculateurs.html', 'classement-vehicules.html', 'comparateur.html'], 'armes-data.js': ['calculateurs.html', 'comparateur.html'] };
  for (const f of pages) {
    const html = read(f);
    for (const [data, allowed] of Object.entries(readers)) {
      if (!new RegExp('<script src="(?:\\.\\./|/)?' + data.replace('.', '\\.')).test(html)) continue;
      const legacy = /name="robots" content="noindex/.test(html) && f.startsWith('vehicules/'); /* trois anciennes fiches non régénérées, hors index */
      assert.ok(allowed.includes(f) || legacy, f + ' charge ' + data + ' sans le lire');
    }
  }
});

test('PERF-04 : LK.lazyScript charge un script différé une seule fois, avec sa version', async () => {
  const p = await load(root, 'index.html', { lazy: 'skip' });
  assert.equal(typeof p.w.LK.lazyScript, 'function');
  assert.equal(p.w.LK_INDEX, undefined);
  const first = p.w.LK.lazyScript('search-index.js'), second = p.w.LK.lazyScript('search-index.js');
  assert.equal(first, second, 'promesse partagée');
  const s = p.d.getElementById('lk-lazy-search-index-js');
  assert.ok(s); assert.match(s.getAttribute('src'), /^search-index\.js\?v=[a-f0-9]{12}$/);
  assert.equal(p.d.querySelectorAll('script[src^="search-index.js"]:not([type])').length, 1, 'un seul script réel');
  await assert.rejects(p.w.LK.lazyScript('inexistant.js'));
  assert.deepEqual(p.errors, []); p.close();
});

test('PERF-02 : le hub Véhicules ne charge plus vehicules-data.js ni un dessin en ligne par carte ; les marques sont écrites dans la page', () => {
  const html = read('vehicules.html');
  assert.doesNotMatch(html, /<script src="vehicules-data\.js/);
  const grid = html.slice(html.indexOf('id="vgrid"'), html.indexOf('id="vempty"'));
  assert.equal((grid.match(/<svg class="veh-art veh-art--schema"/g) || []).length, 0, 'aucun schéma en ligne dans la grille');
  const imgs = [...grid.matchAll(/<img class="veh-art veh-art--schema" src="(img\/schemas\/[a-z0-9-]+\.svg)"[^>]*>/g)];
  assert.ok(imgs.length >= 200, 'schémas en fichiers : ' + imgs.length);
  for (const m of imgs) assert.ok(fs.existsSync(path.join(root, m[1])), m[1]);
  assert.ok(fs.statSync(path.join(root, 'vehicules.html')).size < 900000, 'page allégée (' + fs.statSync(path.join(root, 'vehicules.html')).size + ' octets)');
  const strip = html.match(/id="vstrip" data-marques="([^"]+)"/);
  assert.ok(strip, 'marques écrites dans la page');
  assert.ok(strip[1].split('|').length >= 20 && strip[1].includes('Vapid'));
});

test('PERF-02/03 : le bandeau des marques, la recherche et le tri du hub fonctionnent sans réinsérer les cartes à la frappe', async () => {
  for (const file of ['vehicules.html', 'armes.html']) {
    const p = await load(root, file);
    const grid = p.d.getElementById('vgrid');
    const order = () => [...grid.querySelectorAll('.veh-card')].map(c => c.dataset.id).join(',');
    const before = order();
    const q = p.d.getElementById('vq'); q.value = 'a'; q.dispatchEvent(new p.w.Event('input', { bubbles: true }));
    assert.equal(order(), before, file + ' : une recherche ne déplace aucune carte');
    p.d.querySelectorAll('.chip-filter[data-filter]')[1].click();
    assert.equal(order(), before, file + ' : un filtre ne déplace aucune carte');
    const tri = p.d.getElementById('vtri'); tri.value = 'az'; tri.dispatchEvent(new p.w.Event('change', { bubbles: true }));
    const az = order(); assert.notEqual(az, before, file + ' : le tri réordonne');
    const names = [...grid.querySelectorAll('.veh-card:not([hidden]) h3')].map(h => h.textContent);
    assert.deepEqual(names, names.slice().sort(new Intl.Collator('fr').compare), file + ' : la limite suit l’ordre trié');
    assert.ok([...grid.children].slice(-3).every(n => n.classList.contains('veh-spacer')), file + ' : les espaceurs restent en fin de grille');
    if (file === 'vehicules.html') { const strip = p.d.getElementById('vstrip'); assert.ok(strip.querySelectorAll('.mq-half').length >= 2 && /Vapid/.test(strip.textContent)); }
    assert.deepEqual(p.errors.filter(x => !x.includes('Not implemented: navigation')), []); p.close();
  }
});

test('PERF-05 : LKMotion est partagé : ce qui est à l’écran est montré tout de suite, l’API sert aux listes des lots suivants', async () => {
  const p = await load(root, 'progression.html');
  const M = p.w.LKMotion;
  assert.ok(M && typeof M.observe === 'function' && typeof M.scan === 'function' && typeof M.enter === 'function' && typeof M.showAll === 'function');
  assert.equal(typeof p.w.LK_reveal.scan, 'function', 'ancien point d’entrée conservé');
  /* jsdom : tout rectangle est « à l'écran » (0..700) ; les .reveal / .rise écrits dans la page sont donc montrés sans attendre */
  for (const el of p.d.querySelectorAll('.reveal, .rise')) assert.ok(el.classList.contains('in'), el.className);
  for (const el of p.d.querySelectorAll('.lk-reveal:not(.lk-stack)')) assert.ok(el.classList.contains('is-in'), 'lk-reveal montré : ' + el.className);
  /* page déjà peinte à l'arrivée du script (toujours le cas dans jsdom : plus de 200 ms) : les piles restent visibles ; sinon elles glissent */
  assert.equal(typeof M.painted, 'boolean');
  for (const el of p.d.querySelectorAll('.lk-stack.lk-reveal')) assert.equal(el.classList.contains('lk-settled'), M.painted, 'piles d’images : montrées seulement si la page était déjà peinte');
  for (const el of p.d.querySelectorAll('.lk-hero-item')) assert.equal(el.classList.contains('lk-hero-still'), M.painted, 'en-tête déjà peint : aucune entrée rejouée');
  const added = p.d.createElement('section'); added.className = 'reveal'; p.d.body.appendChild(added);
  M.scan(added); assert.ok(added.classList.contains('in'), 'un bloc ajouté puis scanné est montré');
  M.observe(added, { replay: true }); assert.ok(added.classList.contains('in'), 'replay dans l’écran : montré de nouveau');
  assert.doesNotThrow(() => M.enter(p.d.querySelectorAll('.reveal')));
  assert.deepEqual(p.errors, []); p.close();
});

test('PERF-05 : les feuilles ne promeuvent en couche que pendant l’entrée, jamais les blocs encore hors écran', () => {
  const css = read('style.css');
  assert.doesNotMatch(css, /\.js \.lk-reveal:not\(\.lk-settled\)\{will-change/);
  assert.match(css, /\.js \.lk-reveal\.is-in:not\(\.lk-settled\)\{will-change:opacity,transform;\}/);
  assert.match(css, /\.veh-grid:has\(\.veh-card:hover\) \.veh-card:hover\{flex-basis/, 'accordéon des hubs conservé (décision du 28/09/2026)');
  assert.match(css, /html:not\(\.js\) \.reveal,html:not\(\.js\) \.rise\{opacity:1/, 'tout visible sans JavaScript');
});

test('PERF-03 : les listes dépliables filtrent sans réinsérer les lignes et sans attente à la frappe', async () => {
  const p = await load(root, 'nourriture.html');
  const box = p.d.querySelector('details.cat-box[data-catalogue]'), tbody = box.querySelector('tbody');
  const order = () => [...tbody.querySelectorAll('tr.cat-row')].map(r => r.id).join(',');
  const before = order();
  const q = box.querySelector('[data-cat-q]'); q.value = 'sprunk'; q.dispatchEvent(new p.w.Event('input', { bubbles: true }));
  const shown = [...tbody.querySelectorAll('tr.cat-row:not([hidden])')];
  assert.ok(shown.length >= 1 && shown.length < 30, 'filtre appliqué immédiatement : ' + shown.length);
  assert.equal(order(), before, 'un filtre ne déplace aucune ligne');
  const sort = box.querySelector('[data-cat-sort]'); if (sort) { sort.value = 'nom'; sort.dispatchEvent(new p.w.Event('change', { bubbles: true })); assert.notEqual(order(), before, 'le tri réordonne'); }
  assert.deepEqual(p.errors, []); p.close();
});

test('PERF-04 : Vercel garde en cache les scripts, feuilles et polices versionnés ; les pages restent revalidées', () => {
  const v = JSON.parse(read('vercel.json'));
  const rule = src => (v.headers.find(h => h.source === src) || {}).headers || [];
  assert.match(rule('/((?!api/).*)\\.(js|css)').find(h => h.key === 'Cache-Control').value, /max-age=604800/);
  assert.match(rule('/fonts/(.*)').find(h => h.key === 'Cache-Control').value, /immutable/);
  assert.ok(!v.headers.some(h => /\.html/.test(h.source)), 'aucune règle de cache long sur les pages');
  assert.ok(!fs.existsSync(path.join(root, 'calculateurs-tools.js')), 'module mort retiré');
});
