/* v8.04 (lot I) : bloc « En lien » commun (outils/en-lien.cjs) sur les fiches du monde, des animaux, des activités, des
   missions et des radios ; air avant la sous-navigation des pages de section ; cartes des hubs Demeures, Planques et
   Entreprises alignées (style.css, bloc « v8.04 (lot I) »).
   NODE_PATH=<dépendances>/node_modules node --test outils/tests/en-lien-v804.test.cjs */
'use strict';
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const { JSDOM } = require('jsdom');
const root = process.env.SITE_ROOT || path.resolve(__dirname, '../..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const EL = require(path.join(root, 'outils/en-lien.cjs'));
const DIRS = ['lieux', 'personnages', 'entreprises', 'demeures', 'planques', 'gangs', 'animaux', 'activites', 'missions', 'radios'];
const PAGES = DIRS.flatMap(d => fs.readdirSync(path.join(root, d)).filter(f => f.endsWith('.html')).map(f => d + '/' + f));

test('rangées équilibrées : jamais une carte seule sur sa rangée, 5 au plus sur ordinateur, 3 au plus sur tablette', () => {
  for (let n = 3; n <= 40; n++) {
    for (const [max, min] of [[5, 3], [3, 2]]) {
      const r = EL.rows(n, max), sizes = [];
      for (let i = 0; i < r.length; i += r[i]) { sizes.push(r[i]); assert.ok(r.slice(i, i + r[i]).every(k => k === r[i]), n + ' : rangée incomplète'); }
      assert.equal(r.length, n);
      assert.ok(Math.max(...sizes) <= max && Math.min(...sizes) >= Math.min(min, n), n + ' cartes, ' + max + ' au plus : ' + sizes.join(' + '));
      assert.ok(Math.max(...sizes) - Math.min(...sizes) <= 1, n + ' : rangées inégales ' + sizes.join(' + '));
    }
  }
});

test('« En lien » : une grille de cartes cliquables avec vignette, type et nom, sans l’ancien balisage', () => {
  let blocks = 0;
  for (const f of PAGES) {
    const d = new JSDOM(read(f)).window.document;
    for (const b of d.querySelectorAll('.lore-related')) {
      blocks++;
      assert.ok(b.classList.contains('lk-rel'), f + ' : bloc écrit par outils/en-lien.cjs');
      assert.equal(b.querySelectorAll('.lore-minicard, .lore-chips, .lore-mapcard, .lore-rel-group').length, 0, f + ' : ancien balisage');
      const cards = [...b.querySelectorAll('.lk-rel-grid > a.lk-rel-card')];
      assert.ok(cards.length >= 1, f);
      assert.equal(new Set(cards.map(a => a.getAttribute('href'))).size, cards.length, f + ' : carte en double');
      for (const a of cards) {
        const fig = a.querySelector('.lk-rel-fig'), img = fig && fig.querySelector('img');
        assert.ok(fig && !fig.classList.contains('lk-rel-fig--vide'), f + ' : vignette de ' + a.getAttribute('href'));
        if (img) { assert.equal(img.getAttribute('alt'), '', f + ' : vignette décorative (le nom est écrit)'); assert.equal(img.getAttribute('loading'), 'lazy', f); assert.ok(/^\/img\/(officiel|schemas|monde|carte|gtadb|animaux)\/|^\/img\//.test(img.getAttribute('src')), f + ' : image du site ' + img.getAttribute('src')); }
        assert.ok(a.querySelector('.lk-rel-k').textContent.trim() && a.querySelector('.lk-rel-n').textContent.trim(), f + ' : type et nom');
        assert.ok(a.classList.contains('lk-reveal'), f + ' : une seule apparition, celle du moteur commun');
      }
      const wide = b.classList.contains('lk-rel--wide');
      assert.equal(wide, cards.length <= 2, f + ' : une ou deux cartes en largeur, une grille au-delà');
      if (!wide) for (const [p, max] of [['l', 5], ['m', 3]]) {
        const ks = cards.map(a => +([...a.classList].find(c => new RegExp('^lk-rel-' + p + '\\d$').test(c)) || '').slice(-1));
        assert.deepEqual(ks, EL.rows(cards.length, max), f + ' : rangées ' + p);
      }
      /* les vignettes d’un même bloc ne répètent pas la même capture quand l’élément en a une autre ou un schéma */
      const srcs = cards.map(a => { const i = a.querySelector('.lk-rel-fig img'); return i && i.getAttribute('src'); }).filter(Boolean);
      assert.equal(new Set(srcs).size, srcs.length, f + ' : même image deux fois dans « En lien »');
    }
  }
  assert.ok(blocks >= 40, 'blocs « En lien » trouvés : ' + blocks);
});

test('fiches de gangs : véhicules et armes en cartes, avec visuel officiel ou schéma du site', () => {
  const d = new JSDOM(read('gangs/final-chapter-mc.html')).window.document;
  const rel = [...d.querySelectorAll('.lk-rel-card')].map(a => a.dataset.rel);
  for (const k of ['regions', 'vehicles', 'weapons']) assert.ok(rel.includes(k), k);
  for (const a of d.querySelectorAll('.lk-rel-card[data-rel="vehicles"], .lk-rel-card[data-rel="weapons"]')) assert.ok(a.querySelector('.lk-rel-fig--photo img, .lk-rel-fig--schema img, .lk-rel-fig--schema svg'), a.getAttribute('href'));
});

test('feuille commune : air avant la sous-navigation, « En lien » pleine largeur, cartes des hubs alignées', () => {
  const css = read('outils/sources/style.css'), i = css.indexOf('v8.04 (lot I)');
  assert.ok(i > 0); const v = css.slice(i);
  assert.match(v, /\.ed-zone--monde\{margin-top:clamp\(/);
  assert.match(v, /\.lore-body>\.lk-rel\{grid-column:1\/-1;\}/);
  for (const s of ['.mo-doors>.mo-home', '.mo-desk>.mo-cam', '.mo-street>.mo-shop']) assert.match(v, new RegExp(s.replace(/[.>-]/g, '\\$&') + '[^{]*\\{[^}]*grid-template-rows:subgrid'), s);
  assert.doesNotMatch(v.replace(/\/\*[\s\S]*?\*\//g, ''), /\.lk-rel-card:hover\{[^}]*transform/, 'la carte ne se déplace pas au survol');
});
