'use strict';
/* v7.75 (demande de Téva du 08/10/2026, lot B) : cartes des hubs du monde plus professionnelles (Lieux, Personnages, Demeures,
   Planques, Entreprises), sans rien qui bouge au survol ; entrées nouvelles pour Lieux (tableau d'affichage à palettes) et
   Personnages (flash de projecteur) ; Collectibles plus soignée ; l'espace GTA Online et la Progression s'ouvrent dans un
   nouvel onglet depuis le menu, « Explorer », le pied de page et les puces. Pages générées, sans réseau. */
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const { JSDOM } = require('jsdom');
const root = path.resolve(__dirname, '../..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const doc = f => new JSDOM(read(f)).window.document;
const shell = require(path.join(root, 'outils/site-shell.cjs'));
const HUBS = { lieux: 1, personnages: 1, demeures: 1, planques: 1, entreprises: 1 };
const TITLE = 'S’ouvre dans un nouvel onglet';

/* v7.78 : les cartes « pro » des cinq hubs (et leurs entrées lkx-flap, lkx-flash, lkx-scan, lkx-slide, lkx-neon) sont remplacées
   par la mise en scène de outils/monde-cartes.cjs (monde.css, monde.js) : voir outils/tests/v778.test.cjs. Gangs garde sa donne. */
test('Gangs et factions : la « donne » et l’inclinaison restent ; les cinq hubs du monde n’ont plus la grille commune', () => {
  const gangs = doc('gangs.html').querySelector('#fiches .lore-grid');
  assert.ok(gangs.classList.contains('lkx-deal') && !gangs.classList.contains('lore-grid--pro'), 'Gangs garde sa mise en scène');
  assert.ok([...gangs.children].every(c => c.classList.contains('lkx-tilt')));
  for (const hub of Object.keys(HUBS)) assert.equal(doc(hub + '.html').querySelector('#fiches .lore-grid'), null, hub);
});

test('GTA Online et Progression : nouvel onglet depuis le reste du site, même onglet à l’intérieur de leur section', () => {
  assert.equal(shell.opensNewTab('online.html', 'index.html'), true);
  assert.equal(shell.opensNewTab('online/annonces.html', 'vehicules.html'), true);
  assert.equal(shell.opensNewTab('progression.html', 'online.html'), true);
  assert.equal(shell.opensNewTab('online/annonces.html', 'online.html'), false, 'dans la section GTA Online');
  assert.equal(shell.opensNewTab('progression.html', 'progression.html'), false);
  assert.equal(shell.opensNewTab('vehicules.html', 'index.html'), false, 'les autres sections ne changent pas');
  const marked = a => a.getAttribute('target') === '_blank' && a.getAttribute('rel') === 'noopener' && a.hasAttribute('data-newtab') && a.getAttribute('title') === TITLE;
  const links = (d, sel) => [...d.querySelectorAll(sel)].filter(a => /(^|\/)(online\.html|online\/|progression\.html)/.test(a.getAttribute('href') || ''));
  for (const f of ['index.html', 'vehicules.html', 'planques.html', 'calculateurs.html']) {
    const d = doc(f), all = links(d, 'header nav a, footer a, nav.lk-chips a');
    assert.ok(all.length >= 6, f + ' : liens trouvés');
    for (const a of all) {
      assert.ok(marked(a), f + ' : ' + a.getAttribute('href'));
      assert.ok(!a.hasAttribute('aria-label'), 'le texte visible reste le nom du lien');
    }
  }
  /* dans la section : même onglet */
  const on = doc('online/annonces.html');
  for (const a of links(on, 'header nav a, footer a')) assert.equal(a.hasAttribute('target'), /progression\.html/.test(a.getAttribute('href')), 'online/annonces.html : ' + a.getAttribute('href'));
  const carnet = doc('carnets/' + fs.readdirSync(path.join(root, 'carnets')).find(f => f.endsWith('.html')));
  for (const a of links(carnet, 'header nav a, footer a')) assert.equal(a.hasAttribute('target'), !/progression\.html/.test(a.getAttribute('href')), 'carnet : ' + a.getAttribute('href'));
  /* les liens du contenu des pages ne changent pas */
  for (const f of ['index.html', 'vehicules.html']) {
    const main = doc(f).querySelector('main');
    assert.ok(main && ![...main.querySelectorAll('a[data-newtab]')].some(a => !a.closest('nav.lk-chips')), f + ' : contenu de la page inchangé');
  }
  /* flèche dessinée par la feuille de style, info-bulle traduite */
  assert.match(read('style.css'), /a\[data-newtab\]\[href\]\{padding-right:1\.05em;background-image:url\("data:image\/svg\+xml,/);
  const TR = { en: 'Opens in a new tab', es: 'Se abre en una pestaña nueva', it: 'Si apre in una nuova scheda', de: 'Öffnet sich in einem neuen Tab' };
  for (const [l, t] of Object.entries(TR)) {
    const a = [...doc(l + '/index.html').querySelectorAll('header nav a[data-newtab]')];
    assert.ok(a.length >= 4 && a.every(x => x.getAttribute('title') === t && x.getAttribute('target') === '_blank'), l);
  }
});

test('Collectibles : titres de section numérotés, anneau de progression et rayons harmonisés (feuille de la page)', () => {
  const css = read('collectibles-brand.css');
  const block = css.slice(css.indexOf('v7.75'));
  assert.ok(block.length > 200, 'bloc v7.75');
  assert.match(block, /counter-reset:colsec/);
  assert.match(block, /content:counter\(colsec,decimal-leading-zero\)/);
  assert.ok(doc('collectibles.html').querySelectorAll('main section.shell.reveal>h2.sec-h').length >= 3, 'sections titrées');
});
