'use strict';
/* v7.81 (demande de Téva du 09/10/2026) : la section « Atelier 3D » (atelier-3d.html) : tous les véhicules et toutes les
   armes, personnalisables en direct (three.js en vendor/, données atelier/<famille>/<id>.json tirées des schémas), chaque
   option reliée à un poste du catalogue des Personnalisations ; menu, fiches et Personnalisations y mènent. Pages générées,
   sans réseau. */
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const { JSDOM } = require('jsdom');
const root = path.resolve(__dirname, '../..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const doc = f => new JSDOM(read(f)).window.document;
const LANGS = ['', 'en/', 'es/', 'it/', 'de/'];
const sp = t => String(t).replace(/[\s  ]+/g, ' ').trim();
const ctx = { window: {} }; vm.runInNewContext(read('vehicules-data.js') + '\n' + read('armes-data.js'), ctx);
const V = ctx.window.LK_VEHICULES, A = ctx.window.LK_ARMES;
const PV = JSON.parse(read('outils/catalogues/perso-vehicules.json')), PA = JSON.parse(read('outils/catalogues/perso-armes.json'));

test('données : un fichier par véhicule et par arme, silhouettes, roues, contour de dessus, feux ; rien d’autre dans atelier/', () => {
  const SP = require(path.join(root, 'outils/svg-polys.cjs'));
  assert.deepEqual(SP.flattenPath('M0 0h10v5h-10z')[0], [[0, 0], [10, 0], [10, 5], [0, 5]]);
  assert.equal(SP.flattenPath('M0 0q5 10 10 0z')[0].length, 7, 'une courbe est échantillonnée');
  assert.equal(SP.flattenPath('M0 0L4 0M10 10L14 10L14 14z').length, 1, 'un trait de deux points n’est pas un polygone');
  const files = fs.readdirSync(path.join(root, 'atelier/vehicules'));
  assert.equal(files.length, V.length); assert.equal(fs.readdirSync(path.join(root, 'atelier/armes')).length, A.length);
  let wheels = 0, tops = 0, lights = 0;
  for (const v of V) {
    const d = JSON.parse(read('atelier/vehicules/' + v.id + '.json'));
    assert.equal(d.id, v.id); assert.equal(d.cat, v.cat); assert.ok(d.parts.length >= 1, v.id + ' : silhouettes'); assert.ok(d.top && d.top.outline && d.top.outline.length >= 4, v.id + ' : contour de dessus');
    for (const p of d.parts) for (const pt of p) { assert.equal(pt.length, 2); assert.ok(Number.isFinite(pt[0]) && Number.isFinite(pt[1]), v.id); }
    if (d.wheels.length) wheels++; if (d.top.plates && d.top.plates.length) tops++; if (d.front && d.front.lights.length) lights++;
    assert.ok(typeof d.two === 'boolean');
  }
  assert.ok(wheels >= 240, 'roues lues sur les engins à roues (' + wheels + ')'); assert.ok(lights >= 200, 'feux de face (' + lights + ')');
  for (const a of A) { const d = JSON.parse(read('atelier/armes/' + a.id + '.json')); assert.equal(d.id, a.id); assert.ok(d.parts.length >= 1, a.id); assert.ok(Array.isArray(d.muzzle) && d.muzzle.length === 2, a.id + ' : bouche'); }
  assert.ok(JSON.parse(read('atelier/vehicules/bmx.json')).parts.length >= 10, 'le cadre du vélo (traits) devient des rubans');
  assert.ok(JSON.parse(read('atelier/vehicules/buckingham-maverick.json')).top.plates.length >= 1, 'pales du rotor');
});

test('page : liste complète des modèles, familles, filtres, scène, barre, menus, postes reliés au catalogue avec leurs repères', () => {
  const d = doc('atelier-3d.html');
  assert.equal(d.querySelectorAll('[data-at-list="v"] .at-item').length, V.length);
  assert.equal(d.querySelectorAll('[data-at-list="a"] .at-item').length, A.length);
  for (const v of V) { const b = d.querySelector('.at-item[data-at-pick="v"][data-at-id="' + v.id + '"]'); assert.ok(b, v.id); assert.equal(b.getAttribute('data-at-cat'), v.cat); }
  assert.ok(d.querySelector('[data-at-search]') && d.querySelector('[data-at-catsel="v"]') && d.querySelector('[data-at-catsel="a"]'));
  assert.ok(d.querySelector('canvas[data-at-canvas]') && d.querySelector('[data-at-nojs] a[href="vehicules.html"]'));
  assert.deepEqual([...d.querySelectorAll('[data-at-angle]')].map(b => b.dataset.atAngle), ['tq', 'profil', 'face', 'arriere', 'dessus']);
  for (const k of ['save', 'share', 'png', 'reset']) { const b = d.querySelector('[data-at-' + k + ']'); assert.ok(b, k); assert.ok(b.dataset.hint, k + ' : message'); }
  assert.ok(d.querySelector('[data-at-share]').dataset.hintAlt);
  /* menus : ateliers et options des deux familles, chaque option avec sa compatibilité */
  assert.equal(d.querySelectorAll('[data-at-menu="v"] .at-cat').length, 9); assert.equal(d.querySelectorAll('[data-at-menu="a"] .at-cat').length, 6);
  const opts = [...d.querySelectorAll('.at-opt')]; assert.ok(opts.length >= 18);
  for (const o of opts) assert.ok(o.dataset.atCompat && o.querySelector('legend'), o.id);
  /* chaque lien de poste ouvre la ligne du catalogue, existe, porte son repère */
  const items = new Map([...PV.items.map(it => ['perso-vehicules-' + it.id, it]), ...PA.items.map(it => ['perso-armes-' + it.id, it])]);
  const perso = read('personnalisations.html');
  const links = [...d.querySelectorAll('.at-poste')]; assert.ok(links.length >= 60);
  for (const a of links) {
    const id = a.getAttribute('href').split('#')[1]; const it = items.get(id); assert.ok(it, id);
    assert.ok(perso.includes('id="' + id + '"'), id + ' : ligne dans Personnalisations');
    const p = it.prix_repere_serie && typeof it.prix_repere_serie.valeur === 'number' ? String(it.prix_repere_serie.valeur) : '';
    assert.equal(a.dataset.atPrix, p, id + ' : repère');
    assert.equal(sp(a.querySelector('.at-poste-n').textContent), sp(it.nom));
    assert.match(sp(a.querySelector('.at-poste-p').textContent), p ? /repère de la série : [\d ]+ \$/ : /repère à venir/);
  }
  /* trois.js servi depuis le site, module ES, aucun mot dans le script */
  assert.ok(fs.existsSync(path.join(root, 'vendor/three.module.min.js')) && fs.existsSync(path.join(root, 'vendor/LICENSE-three.txt')));
  assert.match(read('atelier-3d.html'), /<script type="module" src="atelier-3d\.js(\?v=[a-f0-9]+)?"><\/script>/);
  const js = read('atelier-3d.js');
  assert.match(js, /^import \* as THREE from '\.\/vendor\/three\.module\.min\.js';/m);
  assert.match(js, /new URL\('atelier\/', import\.meta\.url\)/, 'données lues depuis la racine du site, même depuis une page traduite');
  assert.doesNotMatch(js, /textContent = '[A-Za-zÀ-ÿ]{3,}/, 'aucun mot écrit par le script');
  assert.doesNotMatch(js, /document\.cookie|XMLHttpRequest/);
  assert.match(js, /localStorage\.getItem\(KEY\)/); assert.match(js, /const KEY = 'lk_atelier'/);
  assert.match(js, /prefers-reduced-motion: reduce/);
  const cfg = JSON.parse(read('outils/langues.json'));
  assert.ok(cfg.scriptsPartages.includes('atelier-3d.js') && cfg.scriptsPartages.includes('vendor/three.module.min.js'), 'scripts partagés, jamais traduits');
  assert.ok(!fs.existsSync(path.join(root, 'en/atelier-3d.js')) && !fs.existsSync(path.join(root, 'en/vendor')));
});

test('liens : menu « S’équiper » et pied de page, fiches (Personnaliser ce véhicule / cette arme), carte du modèle choisi dans Personnalisations', () => {
  for (const f of ['index.html', 'personnalisations.html', 'vehicules/pegassi-zentorno.html', 'armes/carabine.html']) {
    const d = doc(f), pre = f.includes('/') ? '../' : '';
    assert.ok(d.querySelector('nav#nav .nav-more-panel a[href="' + pre + 'atelier-3d.html"]'), f + ' : menu');
    assert.ok(d.querySelector('footer a[href="' + pre + 'atelier-3d.html"]'), f + ' : pied de page');
  }
  const v = doc('vehicules/pegassi-zentorno.html'), a = v.querySelector('#personnaliser .pf-atelier-link');
  assert.ok(a); assert.equal(a.getAttribute('href'), '../atelier-3d.html?v=pegassi-zentorno'); assert.equal(sp(a.textContent), 'Essayer ce véhicule dans l’Atelier 3D');
  const w = doc('armes/carabine.html'), b = w.querySelector('#personnaliser .pf-atelier-link');
  assert.ok(b); assert.equal(b.getAttribute('href'), '../atelier-3d.html?a=carabine'); assert.equal(sp(b.textContent), 'Essayer cette arme dans l’Atelier 3D');
  const p = doc('personnalisations.html');
  assert.equal(p.querySelectorAll('[data-cat-pick-atelier]').length, 2);
  assert.match(read('catalogue.js'), /pickAtelier\.setAttribute\('href', 'atelier-3d\.html\?' \+ \(fam === 'perso-armes' \? 'a=' : 'v='\)/);
  /* la page de l'Atelier est dans le plan du site */
  assert.ok(read('sitemap.xml').includes('https://www.leonidakit.com/atelier-3d.html'));
});

test('style : trois colonnes puis deux puis une, scène sans débordement sur téléphone, boutons de 28 px et plus, mouvement réduit', () => {
  const css = read('atelier-3d.css');
  assert.match(css, /\.at\{display:grid;grid-template-columns:272px minmax\(0,1fr\) 340px;/);
  assert.match(css, /@media \(max-width:1240px\)\{\.at\{grid-template-columns:240px minmax\(0,1fr\);/);
  assert.match(css, /@media \(max-width:900px\)\{\s*\.at\{grid-template-columns:1fr;grid-template-areas:"stage" "menu" "chosen" "pick";/);
  assert.match(css, /@media \(max-width:600px\)\{\s*\.at-view\{aspect-ratio:1\/1;min-height:0;/);
  assert.match(css, /\.at-tab, \.at-cat\{|\.at-cat\{[^}]*padding:10px 10px/);
  assert.match(css, /\.at-act\{[^}]*min-height:36px/);
  assert.match(css, /@media \(prefers-reduced-motion:reduce\)/);
});

test('langues : page traduite, listes et options sans français, menus et pied de page avec l’Atelier, script partagé', () => {
  const T = { 'en/': ['3D Workshop', 'Vehicles', 'Primary paint', 'Save this configuration', 'Sedans'], 'es/': ['Taller 3D', 'Vehículos', 'Pintura principal', 'Guardar esta configuración', 'Berlinas'], 'it/': ['Officina 3D', 'Veicoli', 'Vernice principale', 'Salva questa configurazione', 'Berline'], 'de/': ['3D-Werkstatt', 'Fahrzeuge', 'Hauptlackierung', 'Diese Konfiguration speichern', 'Limousinen'] };
  for (const l of LANGS.slice(1)) {
    const d = doc(l + 'atelier-3d.html');
    assert.equal(sp(d.querySelector('h1').textContent), T[l][0], l);
    assert.ok(sp(d.querySelector('[data-at-fam-b="v"]').textContent).startsWith(T[l][1]), l);
    assert.equal(sp(d.querySelector('#at-v-paint legend').textContent), T[l][2], l);
    assert.equal(sp(d.querySelector('[data-at-save]').textContent), T[l][3], l);
    assert.equal(sp(d.querySelector('.at-item[data-at-id="albany-emperor"] .at-item-c').textContent), T[l][4], l + ' : catégorie dans la liste');
    assert.equal(d.querySelectorAll('[data-at-list="v"] .at-item').length, V.length, l);
    assert.doesNotMatch(d.querySelector('[data-at-menu="v"]').textContent, /repère à venir|Peinture principale|Jantes et pneus/, l + ' : rien en français dans le menu');
    assert.doesNotMatch(d.querySelector('[data-at-menu="a"]').textContent, /Chargeur étendu|repère de la série/, l + ' : rien en français dans le menu des armes');
    assert.ok(d.querySelector('nav#nav .nav-more-panel a[href="atelier-3d.html"]'), l + ' : menu');
    assert.match(read(l + 'atelier-3d.html'), /<script type="module" src="\.\.\/atelier-3d\.js(\?v=[a-f0-9]+)?"><\/script>/, l + ' : script partagé depuis la racine');
    const f = doc(l + 'vehicules/pegassi-zentorno.html'); assert.equal(f.querySelector('#personnaliser .pf-atelier-link').getAttribute('href'), '../atelier-3d.html?v=pegassi-zentorno', l);
  }
});
