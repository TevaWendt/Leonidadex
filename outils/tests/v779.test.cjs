'use strict';
/* v7.79 (demande de Téva du 09/10/2026) : Consommables, « En un regard » : les cartes arrivent une à une à l'écran ; la
   dernière rangée incomplète est centrée (plus de trou) ; les gilets pare-balles deviennent le rayon protection
   d'Ammu-Nation (un gilet dessiné, sa jauge d'armure, les cinq paliers de GTA V en liste, le gilet de GTA VI à confirmer),
   avec « Fiche complète » et « Comparer » conservés. Pages générées, sans réseau. */
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const { JSDOM } = require('jsdom');
const root = path.resolve(__dirname, '../..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const doc = f => new JSDOM(read(f)).window.document;
const C = require(path.join(root, 'outils/catalogues.cjs'));
const LANGS = ['', 'en/', 'es/', 'it/', 'de/'];
/* la synchronisation pose des espaces insécables (fines ou non) avant « ; : % » : les textes se comparent sans tenir compte du type d'espace */
const sp = t => String(t).replace(/[\s\u202f\u00a0]+/g, ' ').trim();

test('grille « Récupérer de la vie » : nombre de cartes visibles écrit (data-cg-n), grille en flex centrée, colonnes selon la largeur ; les gilets ne sont plus des cartes de grille', () => {
  const d = doc('nourriture.html'), g = d.querySelector('#besoin-recuperer .cg-grid');
  const items = C.load().families.consommables.items.filter(it => it.suivi !== false);
  const recup = items.filter(it => it.categorie !== 'protection');
  assert.equal(g.getAttribute('data-cg-n'), String(recup.length));
  assert.equal(g.querySelectorAll(':scope > .cg-card').length, recup.length);
  assert.equal(d.querySelector('#besoin-proteger .cg-grid'), null, 'plus de grille pour la protection');
  const css = read('acquisitions.css');
  assert.match(css, /\.cg-grid,\.ed-zone--acq \.cg-grid\{--cols:4;--gap:16px;display:flex;flex-wrap:wrap;justify-content:center;/);
  assert.match(css, /\.cg-grid>\.cg-card\{flex:0 0 calc\(\(100% - \(var\(--cols\) - 1\) \* var\(--gap\)\) \/ var\(--cols\)\)/);
  /* un reste de 1 ou 2 cartes sur quatre colonnes passe à trois colonnes (5, 6, 9, 10… cartes) */
  for (const n of [5, 6, 9, 10, 13, 14, 21, 22]) assert.ok(css.includes('.cg-grid[data-cg-n="' + n + '"]'), n + ' cartes → trois colonnes');
  assert.match(css, /@media\(max-width:1199px\)\{\.cg-grid,\.cg-grid\[data-cg-n\]\{--cols:3;\}\}/);
  assert.match(css, /@media\(max-width:859px\)\{\.cg-grid,\.cg-grid\[data-cg-n\]\{--cols:2;\}\}/);
  assert.match(css, /@media\(max-width:599px\)\{\.cg-grid,\.cg-grid\[data-cg-n\]\{--cols:1;\}\}/);
  /* le script recompte après un filtre */
  const js = read('consommables.js');
  assert.match(js, /g\.setAttribute\('data-cg-n', String\(n\)\)/);
  assert.match(js, /ev\.target\.name === 'cg-f'/);
});

test('entrée des cartes : état de départ sous html.js seulement, classe is-in posée à l’arrivée, cascade, mouvement réduit respecté', () => {
  const css = read('acquisitions.css'), js = read('consommables.js');
  assert.match(css, /\.js \.cg-grid>\.cg-card:not\(\.is-in\):not\(\.cg-still\)\{opacity:0;transform:translateY\(22px\);\}/);
  assert.match(css, /\.cg-grid>\.cg-card\.is-in\{animation:cg-up/);
  assert.match(css, /@keyframes cg-curtain/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)\{\.js \.cg-grid>\.cg-card:not\(\.is-in\)\{opacity:1;transform:none;\}/);
  assert.match(js, /new IntersectionObserver/);
  assert.match(js, /prefers-reduced-motion: reduce/);
  assert.match(js, /el\.classList\.add\('cg-still'\)/, 'une carte déjà dépassée est posée sans animation');
  assert.doesNotMatch(js, /fetch\(|XMLHttpRequest|localStorage|document\.cookie/);
});

test('rayon protection : cinq paliers triés par armure (données de la liste), gilet de GTA VI au-dessus avec son lien, jauge, Fiche complète et Comparer partout', () => {
  const d = doc('nourriture.html'), rk = d.querySelector('#besoin-proteger [data-rk]');
  assert.ok(rk, 'rayon');
  const items = C.load().families.consommables.items.filter(it => it.categorie === 'protection' && it.suivi !== false);
  const tiers = items.filter(it => it.effet && it.effet.unite === 'armure' && typeof it.effet.valeur === 'number').sort((a, b) => a.effet.valeur - b.effet.valeur);
  const rows = [...rk.querySelectorAll('.rk-tiers > .rk-tier')];
  assert.equal(rows.length, tiers.length);
  rows.forEach((r, i) => {
    const it = tiers[i];
    assert.equal(r.getAttribute('data-rk-level'), String(it.effet.valeur), it.id + ' : niveau');
    assert.equal(r.querySelector('.cg-card').getAttribute('data-cg-id'), it.id);
    assert.equal(sp(r.querySelector('.rk-nom').textContent), sp(it.nom));
    assert.equal(sp(r.querySelector('.rk-sub').textContent), sp(it.description));
    assert.equal(r.querySelector('.rk-pick').getAttribute('aria-pressed'), 'false');
    assert.equal(r.querySelector('.rk-pick').getAttribute('type'), 'button');
    /* espaces : la page écrit une espace fine insécable avant le % ; on compare sans tenir compte du type d'espace */
    assert.equal(r.querySelector('.rk-bar').getAttribute('aria-label').replace(/[\s\u202f\u00a0]+/g, ' '), (it.effet.texte + ' dans ' + it.effet.jeu).replace(/[\s\u202f\u00a0]+/g, ' '), it.id + ' : jauge nommée');
    assert.equal(r.querySelector('.rk-val b').textContent, it.effet.valeur + '%');
    assert.equal(r.querySelectorAll('.rk-bar i').length, 5);
    const price = r.querySelector('.rk-price b').textContent.replace(/[\s  ]/g, '');
    assert.equal(price, it.prix_repere_serie.valeur + '$', it.id + ' : prix repère');
    assert.ok(sp(r.querySelector('.rk-price span').textContent).includes(sp(it.prix_repere_serie.note)), it.id + ' : note du prix');
    assert.ok(r.querySelector('a.cg-link[href="#consommables-' + it.id + '"]'), it.id + ' : Fiche complète');
    assert.ok(r.querySelector('input[data-cg-cmp="' + it.id + '"]'), it.id + ' : Comparer');
    /* les faits lus par la comparaison restent (Où, À quoi ça sert, Prix, Protection) */
    assert.deepEqual([...r.querySelectorAll('.cg-facts dt')].map(x => x.textContent), ['Où', 'À quoi ça sert', 'Prix', 'Protection']);
  });
  const gta6 = items.filter(it => !tiers.includes(it));
  assert.equal(gta6.length, 1);
  const top = rk.querySelector('.rk-gta6');
  assert.equal(top.getAttribute('data-cg-id'), gta6[0].id);
  assert.equal(sp(top.querySelector('.rk-gta6-t').textContent), sp(gta6[0].nom));
  assert.equal(sp(top.querySelector('.rk-gta6-p').textContent), sp(gta6[0].description));
  assert.ok(top.querySelector('a.rk-link[href="' + gta6[0].lien.href + '"]'), 'lien vers l’Armurerie');
  assert.ok(top.querySelector('.cg-st'), 'statut à confirmer');
  assert.ok(top.compareDocumentPosition(rk.querySelector('.rk-tiers')) & 4, 'GTA VI au-dessus des paliers');
  /* la jauge : au maximum sans script (--lvl = armure du dernier palier), gilet dessiné en SVG inline */
  assert.match(rk.getAttribute('style'), new RegExp('--lvl:' + tiers[tiers.length - 1].effet.valeur + '$'));
  assert.equal(rk.querySelector('[data-rk-val]').textContent, String(tiers[tiers.length - 1].effet.valeur));
  assert.equal(sp(rk.querySelector('[data-rk-name]').textContent), sp(tiers[tiers.length - 1].nom));
  assert.ok(rk.querySelector('svg.rk-vest clipPath#rk-clip rect.rk-clip-r'), 'jauge du gilet');
  assert.equal(rk.querySelectorAll('[data-cg-cmp]').length, items.length, 'une case Comparer par gilet');
  /* script : pointer ou choisir un palier, démonstration à l’arrivée, clavier */
  const js = read('consommables.js');
  assert.match(js, /rack\.style\.setProperty\('--lvl', lvl\)/);
  assert.match(js, /b\.addEventListener\('focus'/);
  assert.match(js, /pointerType === 'mouse'/);
});

test('la liste Consommables (box-consommables) et les autres sections de la page ne changent pas', () => {
  const d = doc('nourriture.html');
  assert.equal(d.querySelectorAll('#box-consommables tbody tr').length, C.load().families.consommables.items.length);
  assert.ok(d.querySelector('#en-un-regard .cg-filter') && d.querySelector('#en-un-regard [data-cg-compare]'));
  assert.ok(d.querySelector('#besoin-recuperer .ed-h3') && d.querySelector('#besoin-proteger .ed-h3'));
});

test('langues : le rayon protection est traduit (titre, jauge, paliers), noms et sommes selon la langue', () => {
  const T = { 'en/': ['Protection aisle', 'Armor', 'Super heavy armor', '$2,500'], 'es/': ['Sección protección', 'Blindaje', 'Chaleco superpesado', '2500'], 'it/': ['Reparto protezione', 'Armatura', 'Giubbotto superpesante', '2500'], 'de/': ['Abteilung Schutz', 'Panzerung', 'Superschwere Schutzweste', '2.500'] };
  for (const l of LANGS.slice(1)) {
    const d = doc(l + 'nourriture.html'), rk = d.querySelector('#besoin-proteger [data-rk]');
    assert.ok(rk, l);
    assert.equal(rk.querySelector('.rk-shelf-t').textContent, T[l][0], l);
    assert.equal(rk.querySelector('.rk-gauge-k').textContent, T[l][1], l);
    assert.ok(rk.querySelector('[data-rk-name]').textContent.length > 3 && rk.querySelector('[data-rk-name]').textContent !== 'Gilet super lourd', l + ' : nom traduit');
    assert.ok(rk.querySelector('.rk-tier:last-child .rk-price b').textContent.replace(/ /g, ' ').includes(T[l][3]), l + ' : somme');
    assert.equal(rk.querySelectorAll('.rk-tier').length, 5, l);
    assert.doesNotMatch(d.querySelector('#besoin-proteger').textContent, /Rayon protection|repère GTA V ·|Suivi dans l’Armurerie/, l + ' : rien en français');
  }
});
