'use strict';
/* v7.80 (demande de Téva du 09/10/2026) : sur les fiches véhicules et armes, le schéma se voit sous plusieurs angles :
   un clic sur l'image passe à l'angle suivant avec un effet rétro (écran cathodique qui change de chaîne). Véhicules :
   profil, face, arrière, dessus ; armes : profil, dessus, face. Fiche sans visuel officiel : l'écran remplace
   l'emplacement vide ; fiche avec visuels officiels : le schéma est la dernière vue de la galerie. Pages générées,
   sans réseau. */
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const { JSDOM } = require('jsdom');
const root = path.resolve(__dirname, '../..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const doc = f => new JSDOM(read(f)).window.document;
const LANGS = ['', 'en/', 'es/', 'it/', 'de/'];
/* la synchronisation pose une espace insécable avant « : » : les textes se comparent sans tenir compte du type d'espace */
const sp = t => String(t).replace(/[\s\u202f\u00a0]+/g, ' ').trim();
const ctx = { window: {} }; vm.runInNewContext(read('vehicules-data.js') + '\n' + read('armes-data.js'), ctx);
const V = ctx.window.LK_VEHICULES, A = ctx.window.LK_ARMES;
const VA = require(path.join(root, 'outils/vehicules-angles.cjs')), AA = require(path.join(root, 'outils/armes-angles.cjs')), S = require(path.join(root, 'outils/vehicules-schemas.cjs'));

test('générateurs : chaque véhicule a ses trois autres angles, chaque arme ses deux autres, sans NaN ; le profil est inchangé par describe()', () => {
  const seen = new Set();
  for (const v of V) {
    const a = VA.angles(v);
    assert.ok(a && a.face && a.arriere && a.dessus, v.id);
    for (const k of ['face', 'arriere', 'dessus']) { assert.doesNotMatch(a[k], /NaN|undefined/, v.id + ' ' + k); assert.match(a[k], /<path|<rect|<circle/, v.id + ' ' + k); }
    seen.add(a.face + a.dessus);
    const d = S.describe(v); assert.ok(d === null || (d.kind && d.o), v.id + ' : describe');
    assert.ok(S.schema(v, 90), v.id + ' : profil');
  }
  assert.ok(seen.size > V.length * .8, 'les angles varient d’un engin à l’autre (' + seen.size + ')');
  for (const a of A) { const g = AA.angles(a.id); assert.ok(g && g.dessus && g.face, a.id); assert.doesNotMatch(g.dessus + g.face, /NaN|undefined/, a.id); }
});

test('fiches véhicules sans visuel officiel : écran « sous tous les angles » (4 angles, profil posé, onglets, étiquette, compteur, rappel) à la place de l’emplacement vide', () => {
  const sans = V.filter(v => !(Array.isArray(v.medias) && v.medias.length));
  assert.ok(sans.length > 200);
  for (const v of sans.filter((_, i) => i % 9 === 0)) {
    const d = doc('vehicules/' + v.id + '.html'), gal = d.querySelector('.fhero-art--gal .gal');
    assert.ok(gal.classList.contains('gal--ang'), v.id);
    assert.equal(gal.getAttribute('data-vide'), '1');
    const ang = gal.querySelector(':scope > [data-ang]'); assert.ok(ang, v.id + ' : bloc');
    assert.equal(ang.getAttribute('data-ang-n'), '4');
    const imgs = [...ang.querySelectorAll('.ang-screen > svg.ang-img')];
    assert.deepEqual(imgs.map(s => s.getAttribute('data-ang-id')), ['profil', 'face', 'arriere', 'dessus'], v.id);
    assert.deepEqual(imgs.map(s => s.classList.contains('is-on')), [true, false, false, false], v.id + ' : seul le profil est posé');
    for (const s of imgs) { assert.equal(s.getAttribute('viewBox'), '0 0 240 120'); assert.equal(s.getAttribute('aria-hidden'), 'true'); assert.ok(s.classList.contains('veh-art--schema')); assert.equal(s.getAttribute('style'), null, 'plus de hauteur fixe'); }
    assert.ok(imgs[0].innerHTML.includes('<g transform='), v.id + ' : le profil garde sa variation propre');
    const view = ang.querySelector('button.ang-view[data-ang-next]'); assert.ok(view); assert.equal(view.getAttribute('type'), 'button'); assert.equal(view.getAttribute('aria-label'), 'Angle suivant');
    assert.equal(ang.querySelector('[data-ang-label]').textContent, 'Profil'); assert.equal(ang.querySelector('[data-ang-count]').textContent, '1/4');
    assert.equal(sp(ang.querySelector('.ang-hint').textContent), 'Cliquer : angle suivant');
    const tabs = [...ang.querySelectorAll('.ang-tabs [data-ang-go]')];
    assert.deepEqual(tabs.map(t => t.textContent), ['Profil', 'Face', 'Arrière', 'Dessus']);
    assert.deepEqual(tabs.map(t => t.getAttribute('aria-pressed')), ['true', 'false', 'false', 'false']);
    assert.equal(ang.querySelector('.ang-tabs').getAttribute('aria-label'), 'Angles du schéma');
    assert.equal(ang.querySelector('.ang-scan').getAttribute('aria-hidden'), 'true');
    assert.match(d.getElementById(ang.getAttribute('aria-describedby')).textContent, /Schéma indicatif du modèle/);
    assert.equal(gal.querySelector('.gal-vide'), null, v.id + ' : plus d’emplacement vide');
  }
});

test('fiches véhicules avec visuels officiels : les photos d’abord, le bloc des angles caché dans la galerie (dernière vue avec le script)', () => {
  const avec = V.filter(v => Array.isArray(v.medias) && v.medias.length);
  assert.ok(avec.length > 30);
  for (const v of avec.filter((_, i) => i % 5 === 0)) {
    const d = doc('vehicules/' + v.id + '.html'), gal = d.querySelector('.fhero-art--gal .gal');
    assert.ok(!gal.classList.contains('gal--ang'), v.id);
    assert.ok(gal.querySelector(':scope > .gal-track > .gal-item > img[src]'), v.id + ' : première photo dans la page');
    const slide = gal.querySelector(':scope > .ang-slide[hidden] > [data-ang]'); assert.ok(slide, v.id + ' : bloc des angles caché');
    assert.equal(slide.getAttribute('data-ang-dot'), 'Schéma');
    assert.equal(slide.querySelectorAll('svg.ang-img').length, 4);
  }
  const js = read('fiches.js');
  assert.match(js, /const angSlide = gal\.querySelector\('\.ang-slide'\)/);
  assert.match(js, /it\.className = 'gal-item gal-item--ang'/);
  assert.match(js, /dataset\.angDot/);
});

test('fiches armes : écran à trois angles (profil, dessus, face) à la place de l’emplacement vide', () => {
  for (const a of A) {
    const d = doc('armes/' + a.id + '.html'), gal = d.querySelector('.fhero-art--gal .gal');
    assert.ok(gal.classList.contains('gal--ang'), a.id);
    const ang = gal.querySelector(':scope > [data-ang]'); assert.ok(ang, a.id);
    assert.equal(ang.getAttribute('data-ang-n'), '3');
    assert.deepEqual([...ang.querySelectorAll('svg.ang-img')].map(s => s.getAttribute('data-ang-id')), ['profil', 'dessus', 'face'], a.id);
    assert.deepEqual([...ang.querySelectorAll('[data-ang-go]')].map(t => t.textContent), ['Profil', 'Dessus', 'Face']);
    assert.equal(ang.querySelector('[data-ang-count]').textContent, '1/3');
    assert.match(d.getElementById(ang.getAttribute('aria-describedby')).textContent, /Schéma indicatif du type d’arme/);
  }
});

test('style et script : effet rétro (sortie en bandes, balayage, entrée en ligne avec décalage rouge-bleu), mouvement réduit, sans script, clavier, aucune requête', () => {
  const css = read('fiches.css'), js = read('fiches.js');
  assert.match(css, /\.gal--ang\{aspect-ratio:16\/10;\}/);
  assert.match(css, /\.ang-img\.is-on\{display:block;\}/);
  assert.match(css, /\.js \.ang-img\.is-out\{animation:ang-out/);
  assert.match(css, /\.js \.ang-img\.is-in\{animation:ang-in/);
  assert.match(css, /\.js \.ang\.is-switch \.ang-scan\{animation:ang-scan/);
  assert.match(css, /@keyframes ang-out\{[^}]*clip-path:inset/);
  assert.match(css, /@keyframes ang-in\{0%\{opacity:0;transform:scaleY\(\.04\) scaleX\(1\.35\);filter:drop-shadow/);
  assert.match(css, /html:not\(\.js\) \.ang-tabs,html:not\(\.js\) \.ang-hint\{display:none;\}/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)\{\.js \.ang-img\.is-out\{animation:none;display:none;\}/);
  assert.match(css, /\.ang-tab\{[^}]*min-height:28px/);
  /* sous 900 px : la galerie prend toute la colonne (calée sur le texte), plus la vignette de 230 px */
  assert.match(css, /@media \(max-width:900px\)\{\.fhero-art--gal\{max-width:none;\}\}/);
  assert.match(js, /function initAng\(ang\)/);
  assert.match(js, /prefers-reduced-motion: reduce/);
  assert.match(js, /k === 'ArrowRight' \|\| k === 'ArrowDown'/);
  assert.match(js, /k === 'Home'/);
  assert.match(js, /Math\.abs\(dx\) > 40/);
  assert.match(js, /gal\.classList\.contains\('gal--ang'\)/);
  const ang = js.slice(js.indexOf('function initAng'), js.indexOf("document.querySelectorAll('.gal')"));
  assert.doesNotMatch(ang, /fetch\(|XMLHttpRequest|localStorage|document\.cookie|textContent = '[A-Za-zÀ-ÿ]/, 'aucun mot, aucune requête dans le script');
});

test('langues : étiquette, onglets, rappel, bouton et point « Schéma » traduits', () => {
  const T = { 'en/': ['Side', 'Front', 'Rear', 'Top', 'Click: next angle', 'Next angle', 'Schematic'], 'es/': ['Perfil', 'Frontal', 'Trasera', 'Superior', 'Clic: ángulo siguiente', 'Ángulo siguiente', 'Esquema'], 'it/': ['Profilo', 'Fronte', 'Retro', 'Dall’alto', 'Clic: angolo successivo', 'Angolo successivo', 'Schema'], 'de/': ['Seite', 'Front', 'Heck', 'Oben', 'Klicken: nächster Winkel', 'Nächster Winkel', 'Schema'] };
  const v = V.find(x => !(x.medias && x.medias.length)), w = V.find(x => x.medias && x.medias.length);
  for (const l of LANGS.slice(1)) {
    const d = doc(l + 'vehicules/' + v.id + '.html'), ang = d.querySelector('.gal--ang [data-ang]');
    assert.ok(ang, l);
    assert.deepEqual([...ang.querySelectorAll('[data-ang-go]')].map(t => t.textContent), T[l].slice(0, 4), l);
    assert.equal(ang.querySelector('[data-ang-label]').textContent, T[l][0], l);
    assert.equal(ang.querySelector('.ang-hint').textContent.replace(/ /g, ' ').replace(/\s*:\s*/, ': '), T[l][4], l);
    assert.equal(ang.querySelector('[data-ang-next]').getAttribute('aria-label'), T[l][5], l);
    const d2 = doc(l + 'vehicules/' + w.id + '.html');
    assert.equal(d2.querySelector('.ang-slide [data-ang]').getAttribute('data-ang-dot'), T[l][6], l + ' : point de la galerie');
    const d3 = doc(l + 'armes/' + A[0].id + '.html');
    assert.deepEqual([...d3.querySelectorAll('.gal--ang [data-ang-go]')].map(t => t.textContent), [T[l][0], T[l][3], T[l][1]], l + ' : arme');
    assert.doesNotMatch(d.querySelector('.gal--ang').textContent, /Cliquer|Angle suivant|Arrière/, l + ' : rien en français');
  }
});
