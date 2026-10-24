'use strict';
/* v8.07 : carte mobile (demande du 24/10/2026 : « une carte mobile et une carte pour PC, plus de détails sur PC »).
   Au doigt, le fond vectoriel est remplacé pendant le geste par une image légère du même fond (img/carte/fond-mobile-<langue>.webp,
   outils/carte-mobile.cjs) ; marqueurs écrits à la demande ; liste « Tous les lieux » dépliée à la demande ; à la souris, rien ne change.
   Fichiers lus sur disque, pages dans jsdom, sans réseau. */
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const root = process.env.SITE_ROOT || path.resolve(__dirname, '../..');
const { load } = require('./runtime-helper.cjs');
const CM = require(path.join(root, 'outils/carte-mobile.cjs'));
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const J = JSON.parse(read('outils/carte-mobile.json'));

/* largeur et hauteur lues dans l'en-tête WebP (VP8, VP8L ou VP8X), calcul indépendant du script qui l'a écrit */
function webpSize(b) {
  assert.equal(b.toString('ascii', 0, 4), 'RIFF'); assert.equal(b.toString('ascii', 8, 12), 'WEBP');
  const kind = b.toString('ascii', 12, 16);
  if (kind === 'VP8 ') return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff };
  if (kind === 'VP8L') { const v = b.readUInt32LE(21); return { w: (v & 0x3fff) + 1, h: ((v >> 14) & 0x3fff) + 1 }; }
  if (kind === 'VP8X') return { w: b.readUIntLE(24, 3) + 1, h: b.readUIntLE(27, 3) + 1 };
  throw new Error('WebP inconnu : ' + kind);
}

test('fond mobile : une image par langue publiée, à jour du fond de sa page carte.html', () => {
  const now = CM.etat(root);
  assert.deepEqual(J.langues.map(l => l.code).sort(), now.map(l => l.code).sort(), 'une image par langue publiée');
  assert.equal(now.length, 6);
  for (const l of now) {
    const e = J.langues.find(x => x.code === l.code);
    assert.equal(e.fond, l.fond, l.code + ' : le fond de ' + l.page + ' a changé, relancer node outils/carte-mobile.cjs puis sync-site');
    const buf = fs.readFileSync(path.join(root, e.fichier));
    assert.equal(e.fichier, 'img/carte/fond-mobile-' + l.code + '.webp');
    assert.equal(sha(buf).slice(0, 16), e.image, l.code + ' : image');
    assert.equal(buf.length, e.octets);
    assert.ok(buf.length < 400 * 1024, l.code + ' : image légère (' + buf.length + ' octets)');
    assert.deepEqual(webpSize(buf), { w: J.largeur, h: J.hauteur }, l.code + ' : dimensions');
    /* 0,4 pixel par unité : même rapport largeur / hauteur que la carte (5 200 × 6 000) */
    assert.equal(J.largeur * 6000, J.hauteur * 5200);
  }
  assert.equal(CM.versionDe(J.langues), J.version);
});

test('fond léger : sans grille, ombre de côte ni vagues, tout le reste identique', () => {
  const svg = CM.fondDe(read('carte.html')), leger = CM.fondLeger(svg);
  for (const k of ['lyr-grid', 'url(#shore)', 'fill="url(#waves)"']) { assert.ok(svg.includes(k), k + ' présent dans le fond complet'); assert.ok(!leger.includes(k), k + ' retiré'); }
  const paths = s => (s.match(/<path\b/g) || []).length, texts = s => (s.match(/<text\b/g) || []).length;
  assert.ok(paths(svg) > 1500);
  /* seuls les tracés de la grille disparaissent ; tous les textes de la légende et des comtés restent */
  const grille = (svg.match(/<g class="lyr-grid"[^>]*>[\s\S]*?<\/g>/g) || []).join('');
  assert.equal(paths(leger), paths(svg) - paths(grille));
  assert.equal(texts(leger), texts(svg) - texts(grille));
  for (const k of ['lyr-road', 'lyr-county', 'lyr-label', 'lyr-key']) assert.ok(leger.includes(k), k + ' gardé');
});

test('fonds au doigt hors de la liste d’images chargée par toutes les pages (assets-manifest.js)', () => {
  const vm = require('node:vm'), ctx = { window: {} }; vm.runInNewContext(read('assets-manifest.js'), ctx);
  assert.ok(ctx.window.LK_ASSETS.length > 100);
  assert.ok(!ctx.window.LK_ASSETS.some(u => u.startsWith('/img/carte/')));
});

test('chaque carte.html (six langues) porte la version du fond mobile, empreinte de l’image', () => {
  for (const l of CM.langues(root)) {
    const html = read(path.join(l.dossier, 'carte.html'));
    assert.match(html, new RegExp('<div class="map-stage" id="map-stage" data-fond-v="' + J.version + '">'), (l.dossier || 'fr') + '/carte.html');
  }
});

test('feuille de la carte : image au doigt pendant le geste, fond vectoriel retiré du rendu (display:none), décor allégé', () => {
  const css = read('carte-page.css').replace(/\s+/g, ' ');
  assert.match(css, /\.map-bg-lite ?\{[^}]*display:none/);
  assert.match(css, /\.map-stage\.lite-ready \.map-bg-lite ?\{ ?display:block;? ?\}/);
  /* display:none et non visibility:hidden : un SVG caché par visibility est encore parcouru à chaque image (22 images/s contre 41) */
  assert.match(css, /\.map-stage\.lite-ready\.is-moving \.map-bg ?\{ ?display:none;? ?\}/);
  assert.match(css, /\.map-stage\.is-touch \.map-bg g\[filter\] ?\{ ?filter:none;? ?\}/);
  assert.match(css, /\.map-stage\.is-touch \.map-bg ?> ?rect\[fill="url\(#waves\)"\] ?\{ ?display:none;? ?\}/);
  /* à la souris, aucune de ces règles ne s'applique : elles dépendent toutes de is-touch ou lite-ready, posées seulement au doigt */
  for (const m of css.match(/[^{}]*\.map-bg(?![-\w])[^{}]*\{/g) || []) if (/is-touch|lite-ready/.test(m) === false) assert.doesNotMatch(m, /display:none/);
});

/* ---------- jsdom ---------- */
const coarse = w => { w.matchMedia = q => ({ matches: /pointer:\s*coarse/.test(q), media: q, addEventListener() {}, removeEventListener() {} }); };
const ptr = (a, type, id, x, y, pointerType) => a.d.getElementById('map-stage').dispatchEvent(new a.w.PointerEvent(type, { pointerId: id, pointerType, clientX: x, clientY: y, bubbles: true, cancelable: true }));

test('souris (PC) : aucune image mobile, aucun changement de rendu pendant un glisser', async () => {
  const a = await load(root, 'carte.html');
  try {
    const stage = a.d.getElementById('map-stage');
    assert.equal(a.d.querySelector('.map-bg-lite'), null);
    assert.ok(!stage.classList.contains('is-touch'));
    assert.ok(!a.requests.some(u => /fond-mobile/.test(u)));
    const before = a.d.getElementById('map-world').style.transform;
    ptr(a, 'pointerdown', 1, 300, 300, 'mouse');
    for (let i = 1; i <= 10; i++) ptr(a, 'pointermove', 1, 300 + i * 10, 300 + i * 5, 'mouse');
    assert.ok(!stage.classList.contains('is-moving'));
    a.flush();
    assert.notEqual(a.d.getElementById('map-world').style.transform, before, 'la carte a bougé');
    ptr(a, 'pointerup', 1, 400, 350, 'mouse');
    assert.deepEqual(a.errors.filter(x => !x.includes('Not implemented: navigation')), []);
  } finally { a.close(); }
});

test('doigt (téléphone) : image de la langue de la page, échangée pendant le glisser et le pincer, fond net 220 ms après', async () => {
  for (const [file, code] of [['carte.html', 'fr'], ['en/carte.html', 'en']]) {
    let later = [];
    const a = await load(root, file, { before(w) { coarse(w); const st = w.setTimeout; w.setTimeout = (f, ms) => { if (ms === 220) { later.push(f); return later.length; } return st(f, ms); }; } });
    try {
      const stage = a.d.getElementById('map-stage'), img = a.d.querySelector('#map-world > img.map-bg-lite');
      assert.ok(stage.classList.contains('is-touch'), code);
      assert.ok(img, code + ' : image légère');
      assert.equal(img.getAttribute('src'), '/img/carte/fond-mobile-' + code + '.webp?v=' + J.version);
      assert.ok(fs.existsSync(path.join(root, 'img/carte/fond-mobile-' + code + '.webp')));
      assert.equal(img.getAttribute('aria-hidden'), 'true'); assert.equal(img.getAttribute('alt'), '');
      assert.equal(img.nextElementSibling, a.d.querySelector('#map-world > .map-bg'), 'sous le fond vectoriel');
      /* avant que l'image soit chargée : le geste ne change rien */
      ptr(a, 'pointerdown', 1, 300, 300, 'touch'); ptr(a, 'pointermove', 1, 330, 320, 'touch');
      assert.ok(!stage.classList.contains('is-moving'), code + ' : image pas encore là');
      ptr(a, 'pointerup', 1, 330, 320, 'touch');
      img.dispatchEvent(new a.w.Event('load'));
      assert.ok(stage.classList.contains('lite-ready'));
      /* glisser au doigt */
      ptr(a, 'pointerdown', 1, 300, 300, 'touch');
      for (let i = 1; i <= 5; i++) ptr(a, 'pointermove', 1, 300 + i * 10, 300, 'touch');
      assert.ok(stage.classList.contains('is-moving'), code + ' : image pendant le glisser');
      ptr(a, 'pointerup', 1, 350, 300, 'touch');
      assert.ok(stage.classList.contains('is-moving'), 'encore 220 ms');
      later.splice(0).forEach(f => f());
      assert.ok(!stage.classList.contains('is-moving'), code + ' : fond net après le geste');
      /* pincer : zoom avant à deux doigts */
      const s0 = a.w.LK_MAP.scale();
      ptr(a, 'pointerdown', 1, 400, 300, 'touch'); ptr(a, 'pointerdown', 2, 500, 300, 'touch');
      for (let i = 1; i <= 5; i++) { ptr(a, 'pointermove', 1, 400 - i * 10, 300, 'touch'); ptr(a, 'pointermove', 2, 500 + i * 10, 300, 'touch'); }
      assert.ok(stage.classList.contains('is-moving'), code + ' : image pendant le pincer');
      a.flush();
      assert.ok(a.w.LK_MAP.scale() > s0, code + ' : le pincer zoome');
      ptr(a, 'pointerup', 1, 350, 300, 'touch'); ptr(a, 'pointerup', 2, 550, 300, 'touch');
      later.splice(0).forEach(f => f());
      assert.ok(!stage.classList.contains('is-moving'));
      /* un calque du fond changé (grille affichée) : l'image ne correspondrait plus, le fond vectoriel reste */
      const grid = [...a.d.querySelectorAll('.map-layer')].find(i => !i.defaultChecked);
      assert.ok(grid, 'un calque décoché par défaut (grille)');
      grid.checked = true; grid.dispatchEvent(new a.w.Event('change', { bubbles: true }));
      ptr(a, 'pointerdown', 1, 300, 300, 'touch'); for (let i = 1; i <= 5; i++) ptr(a, 'pointermove', 1, 300 + i * 10, 300, 'touch');
      assert.ok(!stage.classList.contains('is-moving'), code + ' : calques personnalisés, pas d’image');
      ptr(a, 'pointerup', 1, 350, 300, 'touch');
      assert.deepEqual(a.errors.filter(x => !x.includes('Not implemented: navigation')), []);
    } finally { a.close(); }
  }
});

test('marqueurs écrits à la demande : un clic sur un marqueur ouvre sa fiche (un seul écouteur sur le calque ; filtres : regression.test.cjs)', async () => {
  const a = await load(root, 'carte.html');
  try {
    const mks = [...a.d.querySelectorAll('#map-markers .mk')];
    const total = Number(a.d.querySelector('.vstat .n').textContent);
    assert.ok(mks.length > 0, 'des marqueurs visibles');
    assert.ok(mks.length < total, 'pas tous les lieux écrits d’un coup (' + mks.length + ' sur ' + total + ')');
    const mk = mks.find(m => m.dataset.id) || mks[0];
    mk.click();
    assert.ok(a.d.getElementById('map-panel-in').textContent.trim().length > 0, 'fiche ouverte');
    assert.deepEqual(a.errors.filter(x => !x.includes('Not implemented: navigation')), []);
  } finally { a.close(); }
});

test('« Tous les lieux » : racines seules au départ, groupe écrit au premier dépliage, état annoncé (aria-expanded)', async () => {
  const a = await load(root, 'carte.html');
  try {
    const tree = a.d.getElementById('map-tree');
    const roots = tree.querySelectorAll(':scope > .tr-root > .tr-item');
    assert.ok(roots.length > 0);
    assert.equal(tree.querySelectorAll('.tr-item').length, roots.length, 'seules les racines au départ');
    assert.ok(tree.querySelectorAll('.tr-item').length < 2000, 'liste légère (' + tree.querySelectorAll('*').length + ' éléments)');
    const li = [...roots].find(x => x.classList.contains('has-kids'));
    const tog = li.querySelector(':scope > .tr-row > .tr-tog'), ul = li.querySelector(':scope > .tr-kids');
    assert.equal(tog.getAttribute('aria-expanded'), 'false'); assert.ok(ul.hidden); assert.equal(ul.children.length, 0);
    tog.click();
    assert.equal(tog.getAttribute('aria-expanded'), 'true'); assert.ok(!ul.hidden); assert.ok(ul.children.length > 0, 'enfants écrits');
    const n = ul.children.length;
    tog.click(); assert.ok(ul.hidden); assert.equal(tog.getAttribute('aria-expanded'), 'false');
    tog.click(); assert.equal(ul.children.length, n, 'écrits une seule fois');
    /* un enfant mène à son lieu */
    ul.querySelector('.tr-go').click();
    assert.ok(a.d.getElementById('map-panel-in').textContent.trim().length > 0, 'fiche du lieu ouverte');
    assert.deepEqual(a.errors.filter(x => !x.includes('Not implemented: navigation')), []);
  } finally { a.close(); }
});

test('carte.js : réglages au doigt seulement, le PC garde ses seuils de détail', () => {
  const js = read('outils/sources/carte.js');
  assert.match(js, /const TOUCH = !!\(window\.matchMedia && window\.matchMedia\('\(pointer: coarse\)'\)\.matches\);/);
  assert.match(js, /const ZOOM_NIVEAU = TOUCH \? \[0, 0\.42, 0\.9\] : \[0, 0\.42, 0\.6\];/);
  assert.match(js, /const CASE_PX = TOUCH \? 44 : 34;/);
  assert.match(js, /const LBL_Z2 = TOUCH \? 1\.6 : 1\.1;/);
  assert.match(js, /e\.pointerType !== 'touch'/);
});
