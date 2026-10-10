'use strict';
/* v7.82 (demande de Téva du 09/10/2026 : « un dernier check de tout le site, un dernier audit, réduire la latence sur
   toutes les pages, l'adaptation à tout type d'écran, le respect de l'alignement des cartes et sections ») :
   - latence : police latin-ext plus jamais chargée pour « œ », longues listes mises en page à l'approche de l'écran
     (content-visibility), moteur du calculateur chargé au premier geste sur l'accueil, Atelier 3D qui n'attend plus
     three.js pour afficher la page, hero du calculateur en 480/800 px sur téléphone et tablette, cache des maquettes ;
   - écrans : barre de l'Atelier à 320 px, rangées des médias sous 390 px, vignettes des carnets sous 400 px, hero GTA Online
     et galeries des fiches alignés sur les autres sections ; filet des apparitions après chaque défilement.
   Fichiers lus sur disque, pages générées, sans réseau. */
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const { load } = require('./runtime-helper.cjs');
const root = path.resolve(__dirname, '../..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

test('LAT-01 : la police « latin-ext » ne couvre plus ı, Œ, œ (déjà dans le fichier latin) : un « cœur » ne charge plus 32 Ko', () => {
  const css = read('style.css');
  const faces = css.match(/@font-face\{[^}]*\}/g).filter(f => /archivo-latin/.test(f));
  assert.equal(faces.length, 2);
  const ext = faces.find(f => /latin-ext\.woff2/.test(f)), lat = faces.find(f => /archivo-latin\.woff2/.test(f));
  assert.match(lat, /U\+0152-0153/); assert.match(lat, /U\+0131/);
  assert.doesNotMatch(ext, /U\+0100-02BA/, 'la plage large englobait U+0152-0153');
  assert.match(ext, /U\+0100-0130,U\+0132-0151,U\+0154-02BA/);
  assert.doesNotMatch(ext, /U\+0304|U\+0308|U\+0329/, 'les diacritiques combinants restent au seul fichier latin');
  /* les pages à « œ » existent bien (sinon le gain n'a pas d'objet) */
  assert.ok(/œ/.test(read('index.html')));
});

test('LAT-02 : les longues listes ne sont mises en page qu\'à l\'approche de l\'écran (content-visibility), avec une taille réservée', () => {
  const css = read('style.css'), acq = read('acquisitions.css'), at = read('atelier-3d.css');
  for (const [sheet, sel] of [[css, '.veh-card'], [css, '.lk-loc-list>li'], [css, '.media-row'], [acq, '.cat-row'], [at, '.at-list>li']]) {
    const re = new RegExp(sel.replace(/[.>]/g, m => '\\' + m) + '\\{content-visibility:auto;contain-intrinsic-size:auto \\d+px;\\}');
    assert.match(sheet, re, sel);
  }
  /* la carte 3D de la rangée des médias et des catalogues : réserve plus haute sur téléphone (une colonne) */
  assert.match(css, /@media \(max-width:700px\)\{\.media-row\{contain-intrinsic-size:auto \d+px;\}\}/);
  assert.match(acq, /@media \(max-width:700px\)\{\.cat-row\{contain-intrinsic-size:auto \d+px;\}\}/);
  /* les pages qui les portent existent : hub véhicules (cartes + liste de la carte), médias, catalogues, Atelier */
  assert.ok(/class="veh-card/.test(read('vehicules.html')) && /class="lk-loc-list"/.test(read('vehicules.html')));
  assert.ok(/class="media-row/.test(read('medias.html')));
  assert.ok(/class="cat-row/.test(read('style.html')) && /class="cat-row/.test(read('personnalisations.html')));
  assert.ok(/class="at-list"/.test(read('atelier-3d.html')));
});

test('LAT-03 : l\'accueil ne charge plus le moteur du calculateur (178 Ko) avec la page : déclaré en différé, chargé au premier geste', async () => {
  const html = read('index.html');
  assert.match(html, /<script type="lk\/lazy" src="calculateurs-engine\.js\?v=[a-f0-9]{12}"><\/script>/);
  assert.doesNotMatch(html, /<script src="calculateurs-engine\.js/);
  for (const l of ['en', 'es', 'it', 'de']) { const m = read(l + '/index.html').match(/<script type="lk\/lazy" src="((?:\.\.\/)?calculateurs-engine\.js)\?v=[a-f0-9]{12}"><\/script>/); assert.ok(m, l); assert.ok(fs.existsSync(path.join(root, l, m[1])), l + ' : ' + m[1]); }
  const js = read('calculator-entry.js');
  assert.match(js, /LK\.lazyScript\('calculateurs-engine\.js'\)/);
  assert.match(js, /addEventListener\('focusin'/);
  /* en jsdom : rien n'est chargé à l'ouverture ; une saisie déclenche la demande du moteur, une seule fois */
  const p = await load(root, 'index.html', { lazy: 'skip' });
  assert.equal(p.w.LKCalcEngine, undefined, 'pas de moteur au chargement');
  assert.equal(p.d.querySelector('script[src^="calculateurs-engine.js"]:not([type])'), null);
  const form = p.d.getElementById('lk-mini-form'); assert.ok(form);
  form.elements.namedItem('capital').value = '200000';
  form.dispatchEvent(new p.w.Event('input', { bubbles: true }));
  form.dispatchEvent(new p.w.Event('input', { bubbles: true }));
  const tags = p.d.querySelectorAll('script[src^="calculateurs-engine.js"]:not([type])');
  assert.equal(tags.length, 1, 'un seul script réel demandé');
  assert.match(tags[0].getAttribute('src'), /^calculateurs-engine\.js\?v=[a-f0-9]{12}$/);
  assert.deepEqual(p.errors, []); p.close();
});

test('LAT-04 : l\'Atelier 3D affiche la page avant de créer la scène WebGL (three.js n\'attend plus sur DOMContentLoaded)', () => {
  const js = read('atelier-3d.js');
  const start = js.slice(js.indexOf('/* ---------- départ ---------- */'));
  assert.match(start, /pick\(first\[0\], first\[1\], true\); \/\* sans scène encore/);
  assert.match(start, /const boot = \(\) => \{ if \(!initGL\(\)\) return; pick\(first\[0\], first\[1\], true\); if \(spinning\) tick\(\); \};/);
  assert.match(start, /requestAnimationFrame\(\(\) => setTimeout\(boot, 0\)\)/);
  assert.doesNotMatch(start, /const ok = initGL\(\);/);
  /* la liste défile seule, sans emporter la page (lien ?v=… : la page restait en haut du hero) */
  assert.match(js, /const box = it\.closest\('\.at-lists'\)/);
  assert.doesNotMatch(js, /it\.scrollIntoView\(/);
  /* la barre des angles à 320 px : une seule ligne en colonne, angles défilables */
  const css = read('atelier-3d.css');
  assert.match(css, /\.at-view-bottom\{flex-direction:column;align-items:stretch;flex-wrap:nowrap;\}/);
  assert.match(css, /\.at-angles\{overflow:auto;scrollbar-width:none;max-width:100%;\}/);
});

test('LAT-05 : hero du calculateur en 480/800 px sur téléphone et tablette ; cache d\'un jour pour les maquettes ; CSP inchangée', () => {
  const html = read('calculateurs.html');
  assert.match(html, /<picture><source media="\(max-width: 650px\)" srcset="img\/officiel\/vice-city-08-480\.webp"><source media="\(max-width: 1100px\)" srcset="img\/officiel\/vice-city-08-800\.webp"><img src="img\/officiel\/vice-city-08-1280\.webp"/);
  for (const w of ['480', '800', '1280']) assert.ok(fs.existsSync(path.join(root, 'img/officiel/vice-city-08-' + w + '.webp')), w);
  assert.match(read('calculateurs-brand.css'), /\.lk-calc-hero-scene picture\{display:contents\}/);
  const v = JSON.parse(read('vercel.json'));
  const at = v.headers.find(h => h.source === '/atelier/(.*)');
  assert.ok(at); assert.equal(at.headers[0].key, 'Cache-Control'); assert.match(at.headers[0].value, /^public, max-age=86400, stale-while-revalidate=\d+$/);
  const csp = v.headers.find(h => h.source === '/(.*)').headers.find(h => h.key === 'Content-Security-Policy').value;
  assert.equal(csp, "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data: blob:; connect-src 'self'; frame-src https://www.youtube-nocookie.com https://open.spotify.com; object-src 'none'; base-uri 'self'; frame-ancestors 'self'; form-action 'self' https://affd58b3.sibforms.com");
});

test('ECR-01 : écrans — rangées des médias bornées à la page, vignettes des carnets en une colonne sous 400 px, hero GTA Online et galeries des fiches alignés', () => {
  const css = read('style.css');
  assert.match(css, /\.media-list\{[^}]*grid-template-columns:minmax\(0,1fr\);/);
  assert.match(css, /\.media-row,\.media-row>\*\{min-width:0;\}/);
  assert.match(read('carnets.css'), /@media \(max-width:400px\)\{\.cn-other-list\{grid-template-columns:1fr;\}\.cn-other-txt\{overflow-wrap:anywhere;\}\}/);
  assert.match(read('online.css'), /\.online-hero-in\{position:relative;z-index:2;width:100%;/);
  assert.match(css, /\.lore-gallery\.shell\{max-width:max\(calc\(var\(--shell-max\) \+ 2\*var\(--gutter\)\),min\(1600px,96vw\)\);\}/);
  /* étiquettes les plus petites : au moins .62rem (≈ 10 px) */
  assert.match(css, /\.tr-st\{[^}]*font-size:\.62rem;/);
  assert.match(read('acquisitions.css'), /\.cg-media-l\{[^}]*font:800 \.62rem\/1\.2/);
  assert.doesNotMatch(css + read('acquisitions.css'), /font(?:-size)?:(?:800 )?\.5[0-9]rem/);
});

test('ECR-02 : les apparitions au défilement ont un filet après chaque arrêt du défilement (rien ne reste transparent dans l\'écran)', async () => {
  const js = read('common.js');
  assert.match(js, /function sweep\(\) \{/);
  assert.match(js, /setTimeout\(sweep, 2500\);/);
  assert.match(js, /window\.addEventListener\('scroll', function \(\) \{ if \(!pending\) return; deepest = Math\.max\(deepest, [^;]+\); clearTimeout\(sweepTimer\); sweepTimer = setTimeout\(sweep, 400\); \}, \{ passive: true \}\);/);
  assert.match(js, /r\.top \+ y < deepest/, 'tout ce qui a déjà défilé est couvert');
  /* même filet pour les cartes des hubs du monde (monde.js, observateur à part) */
  const mo = read('monde.js');
  assert.match(mo, /var watched = \[\];/);
  assert.match(mo, /window\.setTimeout\(sweep, 2500\);/);
  assert.match(mo, /window\.addEventListener\('scroll', function \(\) \{ if \(!watched\.length\) return; deepest = Math\.max\(deepest, [^;]+\); window\.clearTimeout\(timer\); timer = window\.setTimeout\(sweep, 400\); \}, \{ passive: true \}\);/);
  assert.match(mo, /el\.classList\.add\('mo-still', 'is-in'\)/);
  const p = await load(root, 'lieux.html');
  assert.ok(p.w.LKMotion && typeof p.w.LKMotion.observe === 'function');
  assert.deepEqual(p.errors, []); p.close();
});

test('TRAD-01 : les nouveaux textes de la v7.82 ont leur traduction dans les quatre langues', () => {
  for (const l of ['en', 'es', 'it', 'de']) {
    const m = JSON.parse(read('outils/langues/' + l + '/v782.json'));
    assert.ok(m['Un instant…'] && m['Un instant…'] !== 'Un instant…', l);
  }
});
