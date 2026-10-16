'use strict';
/* v7.92 : pages enrichies (Éditions, Vidéos officielles, Actualités, Ce qui est confirmé, Presse, Mode compagnon, Devine le
   lieu) et Atelier 3D plus rapide.
   - briques communes (outils/vitrine.cjs, vitrine.css, vitrine.js) : chargées par chaque page enrichie, dans chaque langue ;
     vitrine.js n’écrit aucun mot ; chaque visuel officiel a son texte alternatif ; encarts Léo : questions posées par bouton ;
     au téléphone, les visuels s’arrêtent à 800 px (<picture> sans boîte, mêmes fichiers, mêmes tailles d’affichage) ;
   - Devine le lieu : statistiques et album (fonctions pures de devine.js), une case d’album par image du jeu rangée dans sa
     région, deux faits officiels par région, cycle des images, aucune image du jeu montrée ailleurs que dans le jeu ;
   - Mode compagnon : quatre écrans et quatre étapes, trois plateformes, schéma du transfert ;
   - Atelier 3D : three.js réduit (outils/three-atelier.cjs) exporte chaque nom utilisé, préchargé à la même adresse que
     l’import (empreinte comprise), dans chaque langue ; rendu à la demande, ombre fixe, pause hors de l’écran ;
   - Mentions : ce que garde Devine le lieu (statistiques, album). */
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('fs'), path = require('path'), vm = require('vm');
const { JSDOM } = require('jsdom');
const root = process.env.SITE_ROOT || path.resolve(__dirname, '../..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const doc = f => new JSDOM(read(f)).window.document;
const LANGS = [''].concat(JSON.parse(read('outils/langues.json')).langues.filter(l => l.etat === 'publiee' && l.code !== 'fr').map(l => l.dossier + '/'));
const ENRICHED = ['editions.html', 'videos.html', 'videos/trailer-1.html', 'videos/trailer-2.html', 'videos/extended-look.html', 'actus.html', 'verification.html', 'presse.html', 'compagnon.html', 'devine-le-lieu.html'];
const D = JSON.parse(read('outils/devine/devine.json'));
const ED = JSON.parse(read('outils/editorial.json'));
/* le script tourne dans ce contexte-ci (mêmes tableaux et objets que le test : comparaisons strictes possibles) */
const API = (() => { vm.runInThisContext(read('devine.js'), { filename: 'devine.js' }); return globalThis.LKDevine; })();
const POOL = D.images.map(i => ({ id: i.id, r: i.region })).sort((a, b) => (a.id < b.id ? -1 : 1));
const REGION = Object.fromEntries(POOL.map(x => [x.id, x.r]));

test('briques communes : chaque page enrichie charge vitrine.css et vitrine.js, dans chaque langue', () => {
  for (const dir of LANGS) for (const p of ENRICHED) {
    const f = dir + p; if (!fs.existsSync(path.join(root, f))) { assert.fail(f + ' absente'); }
    const h = read(f);
    assert.match(h, /<link rel="stylesheet" href="(?:\.\.\/)*vitrine\.css\?v=[0-9a-f]{12}">/, f + ' : vitrine.css');
    assert.match(h, /<script src="(?:\.\.\/)*vitrine\.js\?v=[0-9a-f]{12}"><\/script>/, f + ' : vitrine.js');
  }
});

test('briques communes : vitrine.js n’écrit aucun mot ; chaque visuel officiel a son texte alternatif', () => {
  const js = read('vitrine.js').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  const lit = [...js.matchAll(/'([^'\\]*(?:\\.[^'\\]*)*)'/g)].map(m => m[1]);
  for (const s of lit.filter(x => x !== 'use strict' && !/^\(|prefers-/.test(x))) assert.doesNotMatch(s, /[a-zàâçéèêëîïôûùüÿœ]{3,}\s+[a-zàâçéèêëîïôûùüÿœ]{2,}/i, 'texte dans vitrine.js : ' + s);
  for (const dir of LANGS) for (const p of ENRICHED) {
    const d = doc(dir + p);
    /* un texte alternatif, ou vide pour un visuel décoratif posé dans un lien, un bouton ou une carte qui dit déjà ce qu’il
       montre (affiche d’une vidéo à côté de son titre) */
    for (const img of d.querySelectorAll('main img[src*="img/officiel/"]')) { const alt = img.getAttribute('alt'), box = img.closest('a, button, article, li'); assert.ok(alt !== null && (alt.trim().length > 3 || img.closest('[aria-hidden="true"]') || (alt === '' && box && box.textContent.trim().length > 3)), dir + p + ' : alt de ' + img.getAttribute('src')); }
    /* encart Léo : les questions sont des boutons (posées à Léo par vitrine.js) */
    for (const b of d.querySelectorAll('.vt-aside [data-vt-leo]')) assert.ok(b.tagName === 'BUTTON' && b.textContent.trim().length > 5, dir + p + ' : question à Léo');
  }
});

test('briques communes : au téléphone, les visuels s’arrêtent à 800 px (<picture> sans boîte), dans chaque langue', () => {
  assert.match(read('vitrine.css'), /\.vt-pic\{display:contents;\}/, 'vitrine.css : .vt-pic sans boîte');
  const file = (f, u) => path.join(root, u.startsWith('/') ? u.slice(1) : path.join(path.dirname(f), u));
  let n = 0;
  for (const dir of LANGS) for (const p of ENRICHED) {
    const f = dir + p, d = doc(f);
    for (const pic of d.querySelectorAll('picture.vt-pic')) {
      n++;
      const s = pic.querySelectorAll('source'), img = pic.querySelector('img');
      assert.equal(s.length, 1, f + ' : une source'); assert.ok(img, f + ' : une image');
      assert.equal(s[0].getAttribute('media'), '(max-width:599px)', f + ' : source du téléphone');
      assert.equal(s[0].getAttribute('sizes'), img.getAttribute('sizes'), f + ' : mêmes tailles d’affichage');
      const phone = s[0].getAttribute('srcset').split(', '), all = img.getAttribute('srcset').split(', ');
      assert.deepEqual(phone.map(x => x.split(' ')[1]), ['480w', '800w'], f + ' : 480 et 800 px au téléphone');
      assert.deepEqual(all.map(x => x.split(' ')[1]), ['480w', '800w', '1280w'], f + ' : 480, 800 et 1 280 px ailleurs');
      assert.deepEqual(phone, all.slice(0, 2), f + ' : les mêmes fichiers');
      for (const x of all) assert.ok(fs.existsSync(file(f, x.split(' ')[0])), f + ' : ' + x + ' introuvable');
    }
  }
  assert.ok(n > 300, 'images des briques : ' + n);
});

test('Devine le lieu : statistiques et album (fonctions pures), sans casser l’état des versions précédentes', () => {
  const play = (st, iso, answers) => { const ids = API.draw(POOL, iso, { per: 5, ref: D.debut }); let s = st; for (const a of answers(ids)) s = API.answerDay(s, iso, 1, ids, a, REGION); return s; };
  const allRight = ids => ids.map(id => REGION[id]), twoWrong = ids => ids.map((id, i) => (i < 2 ? (REGION[id] === 'vice-city' ? 'ambrosia' : 'vice-city') : REGION[id]));
  let s = API.blank();
  /* une réponse : l’image rejoint l’album, rien d’autre ne bouge avant la fin de la partie */
  const ids1 = API.draw(POOL, '2026-10-12', { per: 5, ref: D.debut });
  const one = API.answerDay(s, '2026-10-12', 1, ids1, REGION[ids1[0]], REGION);
  assert.deepEqual(one.st.a, [ids1[0]]); assert.equal(one.st.p, 0); assert.deepEqual(one.st.h, []);
  s = play(s, '2026-10-12', twoWrong);
  assert.equal(s.st.p, 1); assert.deepEqual(s.st.d, [0, 0, 0, 1, 0, 0]); assert.deepEqual(s.st.h, [['2026-10-12', 3]]); assert.equal(s.st.a.length, 5); assert.equal(s.st.m, 1);
  const total = Object.values(s.st.g).reduce((a, g) => a + g[1], 0), ok = Object.values(s.st.g).reduce((a, g) => a + g[0], 0);
  assert.equal(total, 5); assert.equal(ok, 3);
  s = play(s, '2026-10-13', allRight);
  assert.equal(s.st.p, 2); assert.equal(s.st.d[5], 1); assert.equal(s.st.m, 2); assert.equal(s.st.a.length, 10);
  /* une partie finie ne compte qu’une fois */
  const again = API.answerDay(s, '2026-10-13', 2, s.jour.ids, 'vice-city', REGION);
  assert.deepEqual(again.st, s.st);
  /* résumé : sept derniers jours, réussite, série, meilleure série */
  const S = API.summary(s, '2026-10-14', 5);
  assert.deepEqual(S.week.map(w => w.d), ['2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11', '2026-10-12', '2026-10-13', '2026-10-14']);
  assert.deepEqual(S.week.map(w => w.s), [null, null, null, null, 3, 5, null]);
  assert.equal(S.parties, 2); assert.equal(S.serie, 2); assert.equal(S.serieMax, 2); assert.equal(S.reussite, 8 / 10); assert.equal(S.album.length, 10);
  /* l’état d’avant la v7.92 (sans « st ») reste valide ; un « st » abîmé repart de zéro sans toucher au reste */
  assert.ok(API.valid({ v: 1, jour: null, serie: { d: null, n: 0 }, best: null }));
  for (const bad of [null, 'x', [], { p: -1, m: 'a', d: [1, 2], g: { 'Vice City': [1, 2] }, h: [['hier', 9]], a: ['<b>'] }]) {
    const c = API.cleanSt(bad, 5);
    assert.deepEqual(c, API.blankSt(5));
  }
  const mixed = API.cleanSt({ p: 3, m: 2, d: [0, 0, 1, 1, 1, 0], g: { 'vice-city': [2, 3], ambrosia: [5, 1] }, h: [['2026-10-12', 4], ['x', 1]], a: ['vice-city-01', 'vice-city-01', 'NOPE!'] }, 5);
  assert.deepEqual(mixed, { p: 3, m: 2, d: [0, 0, 1, 1, 1, 0], g: { 'vice-city': [2, 3] }, h: [['2026-10-12', 4]], a: ['vice-city-01'] });
  /* cycle : huit jours pour 40 images, le jour 1 du jeu ouvre un cycle */
  assert.deepEqual(API.cycleDay(D.debut, D.debut, 40, 5), { k: 0, L: 8 });
  assert.deepEqual(API.cycleDay('2026-10-21', D.debut, 40, 5), { k: 1, L: 8 });
  assert.deepEqual(API.cycleDay('2026-10-11', D.debut, 40, 5), { k: 7, L: 8 });
});

test('Devine le lieu : six cartes postales, l’album (une case par image, rangée dans sa région), faits officiels, cycle', () => {
  const inGame = new Set(POOL.map(x => x.id));
  for (const dir of LANGS) {
    const f = dir + 'devine-le-lieu.html', d = doc(f);
    const cards = [...d.querySelectorAll('#regions [data-dv-reg]')];
    assert.deepEqual(cards.map(c => c.getAttribute('data-dv-reg')).sort(), D.series.map(s => s.region).sort(), f + ' : six régions');
    const slots = [...d.querySelectorAll('[data-dv-slot]')];
    assert.equal(slots.length, D.images.length, f + ' : une case par image');
    for (const sl of slots) { const reg = sl.closest('[data-dv-reg]').getAttribute('data-dv-reg'); assert.equal(REGION[sl.getAttribute('data-dv-slot')], reg, f + ' : ' + sl.getAttribute('data-dv-slot') + ' dans ' + reg); assert.ok(!sl.querySelector('img'), f + ' : sans script, aucune image du jeu dans l’album'); }
    assert.equal(d.querySelectorAll('#regions a[data-dv-fiche]').length, 6);
    for (const c of cards) assert.equal(c.querySelectorAll('.dv-pc-facts li').length, D.regions.faits[c.getAttribute('data-dv-reg')].length, f);
    /* cycle : autant de colonnes que de jours, autant de cases par colonne que d’images par partie */
    const cols = d.querySelectorAll('[data-dv-cycle] [data-dv-cday]');
    assert.equal(cols.length, Math.floor(D.images.length / D.parPartie), f + ' : jours du cycle');
    for (const c of cols) assert.equal(c.querySelectorAll('i').length, D.parPartie);
    /* statistiques : une ligne par score, une par région */
    assert.equal(d.querySelectorAll('[data-dv-dist]').length, D.parPartie + 1);
    assert.equal(d.querySelectorAll('[data-dv-rs]').length, 6);
    for (const a of ['data-dv-serie', 'data-dv-serie-max', 'data-dv-parties', 'data-dv-reussite', 'data-dv-best', 'data-dv-album-n', 'data-dv-week', 'data-dv-streak', 'data-dv-answer-tag', 'data-dv-answer-new']) assert.ok(d.querySelector('[' + a + ']'), f + ' : ' + a);
    /* aucune image du jeu hors du jeu (gabarit inerte) : l’encart et le reste de la page n’en montrent pas */
    for (const img of d.querySelectorAll('img')) { const m = (img.getAttribute('src') || '').match(/officiel\/([a-z0-9-]+)-\d+\.webp/); if (m) assert.ok(!inGame.has(m[1]), f + ' : image du jeu montrée hors du jeu : ' + m[1]); }
  }
  /* faits : ceux de outils/editorial.json, dans la page française */
  const fr = doc('devine-le-lieu.html');
  for (const [r, idx] of Object.entries(D.regions.faits)) {
    const facts = ED.regions.find(x => x.id === r).facts, li = [...fr.querySelectorAll('[data-dv-reg="' + r + '"] .dv-pc-facts li')].map(x => x.textContent.trim());
    assert.deepEqual(li, idx.map(i => facts[i].replace(/\s+/g, ' ').trim()).map(t => li.find(x => x.replace(/\s/g, '') === t.replace(/\s/g, '')) || t), r);
  }
});

test('Mode compagnon : quatre écrans et quatre étapes, trois plateformes, schéma du transfert, dans chaque langue', () => {
  for (const dir of LANGS) {
    const f = dir + 'compagnon.html', d = doc(f);
    assert.equal(d.querySelectorAll('[data-cp-story] [data-cp-scr]').length, 4, f);
    assert.equal(d.querySelectorAll('[data-cp-story] [data-cp-step]').length, 4, f);
    assert.equal(d.querySelectorAll('[data-cp-pf]').length, 3, f);
    assert.ok(d.querySelector('.cp-schema'), f + ' : schéma du transfert');
    for (const s of d.querySelectorAll('.cp-scr svg, .cp-schema svg')) assert.equal(s.getAttribute('aria-hidden'), 'true', f + ' : dessin décoratif');
  }
});

test('Atelier 3D : three.js réduit, préchargé à l’adresse exacte de l’import, rendu à la demande', () => {
  const T = require(path.join(root, 'outils/three-atelier.cjs'));
  assert.deepEqual(T.check(root), [], 'three.js pour l’Atelier');
  assert.ok(fs.statSync(path.join(root, T.OUT)).size < fs.statSync(path.join(root, T.SRC)).size * 0.85, 'plus léger que le build complet');
  assert.ok(JSON.parse(read('outils/langues.json')).scriptsPartages.includes(T.OUT), 'script partagé, jamais traduit');
  const js = read('atelier-3d.js');
  const imp = (js.match(/from '\.\/(vendor\/three\.atelier\.min\.js\?v=[0-9a-f]{12})'/) || [])[1];
  assert.ok(imp, 'import avec empreinte');
  for (const dir of LANGS) {
    const h = read(dir + 'atelier-3d.html');
    const pre = (h.match(/<link rel="modulepreload" href="((?:\.\.\/)*)(vendor\/three\.atelier\.min\.js\?v=[0-9a-f]{12})">/) || []);
    assert.equal(pre[2], imp, dir + 'atelier-3d.html : préchargement = import');
    assert.equal(pre[1], dir ? '../' : '', dir + 'atelier-3d.html : chemin');
  }
  assert.match(js, /shadowMap\.autoUpdate = false/);
  assert.match(js, /IntersectionObserver/);
  assert.match(js, /compileAsync/);
  assert.doesNotMatch(js, /preserveDrawingBuffer:\s*true/);
  assert.doesNotMatch(js, /three\.module\.min\.js/, 'plus d’import du build complet');
});

test('Mentions : Devine le lieu garde aussi les statistiques et l’album, sous la même clé', () => {
  const h = read('mentions-legales.html');
  assert.match(h, /Devine le lieu \(<code>lk_devine_v1<\/code>\)[^<]*statistiques[^<]*album/);
  for (const dir of LANGS.slice(1)) assert.match(read(dir + 'mentions-legales.html'), /lk_devine_v1/, dir);
});
