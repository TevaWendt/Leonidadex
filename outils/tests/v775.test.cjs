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
const HUBS = { lieux: 'lkx-flap', personnages: 'lkx-flash', demeures: 'lkx-scan', planques: 'lkx-slide', entreprises: 'lkx-neon' };
const TITLE = 'S’ouvre dans un nouvel onglet';

test('hubs du monde : cartes « pro » (image cadrée, corps, bouton) et une entrée propre à chacun des cinq hubs ; Gangs inchangé', () => {
  for (const [hub, fx] of Object.entries(HUBS)) {
    const g = doc(hub + '.html').querySelector('#fiches .lore-grid');
    assert.ok(g.classList.contains('lore-grid--pro') && g.classList.contains('lore-grid--' + hub) && g.classList.contains(fx), hub);
    const cards = [...g.children];
    assert.ok(cards.length >= 3, hub + ' : cartes');
    for (const c of cards) {
      assert.ok(c.matches('a.lore-card.lore-card--pro.lore-card--' + hub), hub + ' : carte pro');
      assert.ok(!c.classList.contains('lkx-tilt'), hub + ' : pas d’inclinaison au survol');
      assert.ok(c.querySelector(':scope>.lore-card-media>img[alt]'), hub + ' : image dans son cadre');
      assert.ok(c.querySelector('h3') && c.querySelector('.veh-go'), hub + ' : titre et bouton');
    }
  }
  const gangs = doc('gangs.html').querySelector('#fiches .lore-grid');
  assert.ok(gangs.classList.contains('lkx-deal') && !gangs.classList.contains('lore-grid--pro'), 'Gangs garde sa mise en scène');
  assert.ok([...gangs.children].every(c => c.classList.contains('lkx-tilt')));
});

test('survol : la carte ne se déplace plus (pas de translation, pas de changement de taille), seuls l’ombre, la photo dans son cadre et la flèche réagissent', () => {
  const css = read('lk-sections.css');
  assert.ok(css.includes('.lore-grid--pro>.lore-card--pro:hover,.lore-grid--pro>.lore-card--pro:focus-visible{transform:none;}'), 'la translation commune des cartes est annulée');
  const rules = [...css.matchAll(/([^{}]*lore-card--pro:hover[^{}]*)\{([^}]*)\}/g)];
  assert.ok(rules.length >= 3);
  for (const [, sel, body] of rules) {
    if (/lore-card-media|veh-go/.test(sel)) continue;
    assert.doesNotMatch(body, /transform:(?!none)|margin|padding|top:|left:|width|height|border-width/, sel + ' : rien ne bouge');
  }
  assert.match(css, /@media \(prefers-reduced-motion:reduce\)\{[^@]*\.lkx-flap/, 'mouvement réduit : pas d’animation');
});

test('Lieux : tableau d’affichage à palettes (numéros 01 à 06, titres qui défilent lettre à lettre puis redeviennent du texte simple)', () => {
  const d = doc('lieux.html');
  assert.deepEqual([...d.querySelectorAll('#fiches .lore-card .lore-num')].map(n => n.textContent), ['01', '02', '03', '04', '05', '06']);
  assert.ok([...d.querySelectorAll('#fiches .lore-num')].every(n => n.getAttribute('aria-hidden') === 'true'), 'numéros décoratifs');
  const js = read('lk-sections.js'), css = read('lk-sections.css');
  assert.match(js, /function flap\(g\)/);
  assert.match(js, /sr\.className = 'sr-only'; sr\.textContent = text;/, 'le titre reste lisible par un lecteur d’écran pendant l’animation');
  assert.match(js, /h\.textContent = text;/, 'le titre redevient du texte simple');
  assert.match(css, /@keyframes lkx-flap/);
});

test('Personnages : portraits cadrés sur le visage (point focal par personnage), entrée « flash »', () => {
  const cards = [...doc('personnages.html').querySelectorAll('#fiches .lore-card--personnages')];
  assert.ok(cards.length >= 6);
  for (const c of cards) assert.match(c.getAttribute('style') || '', /--fx:\d{1,3}%/, c.getAttribute('href'));
  const css = read('lk-sections.css');
  assert.match(css, /object-position:var\(--fx,50%\)/);
  assert.match(css, /@keyframes lkx-flash/);
});

test('Planques : onglet de dossier numéroté (décoratif), traduit dans les quatre langues', () => {
  const tabs = [...doc('planques.html').querySelectorAll('#fiches .lore-tab')];
  assert.ok(tabs.length >= 3);
  tabs.forEach((t, i) => { assert.equal(t.textContent, 'Dossier ' + String(i + 1).padStart(2, '0')); assert.equal(t.getAttribute('aria-hidden'), 'true'); });
  const WORD = { en: 'File', es: 'Expediente', it: 'Fascicolo', de: 'Akte' };
  for (const [l, w] of Object.entries(WORD)) assert.equal(doc(l + '/planques.html').querySelector('#fiches .lore-tab').textContent, w + ' 01', l);
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
