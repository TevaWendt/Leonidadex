'use strict';
/* v7.72 (demande de Téva du 08/10/2026, lot 2) : chaque hub du monde a sa propre mise en scène (Lieux : cartes postales et
   entrée « iris » ; Personnages : tableau de casting épinglé et « chute » ; Demeures : plans d'architecte et « balayage » ;
   Planques : dossiers et « glissement » alterné ; Entreprises : enseignes au néon) ; Collectibles : six familles illustrées,
   cliquables, avec une fiche squelette plein écran ; Codes de triche : les quatre catégories alignées. Pages générées, sans réseau. */
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const { JSDOM } = require('jsdom');
const root = path.resolve(__dirname, '../..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const doc = f => new JSDOM(read(f)).window.document;
const exists = src => fs.existsSync(path.join(root, src.replace(/^\//, '').split(/[?#]/)[0]));

test('hubs du monde : une mise en scène par hub (classe d’entrée, disposition, cartes), toutes présentes dans lk-sections.css', () => {
  const FX = { lieux: ['lkx-iris', 'lore-grid--atlas', 'lore-card--postcard'], personnages: ['lkx-pin', 'lore-grid--casting', 'lore-card--casting'], demeures: ['lkx-scan', 'lore-grid--blueprint', 'lore-card--blueprint'], planques: ['lkx-slide', 'lore-grid--dossier', 'lore-card--dossier'], entreprises: ['lkx-neon', 'lore-grid--signs', 'lore-card--sign'], gangs: ['lkx-deal', null, null] };
  const css = read('lk-sections.css');
  const seen = new Set();
  for (const [hub, [fx, grid, card]] of Object.entries(FX)) {
    const d = doc(hub + '.html'), g = d.querySelector('#fiches .lore-grid');
    assert.ok(g.classList.contains(fx) && g.classList.contains('lk-arrive') && g.hasAttribute('data-lkx-in'), hub + ' : ' + fx);
    seen.add(fx);
    if (grid) assert.ok(g.classList.contains(grid), hub + ' : ' + grid);
    const cards = [...g.querySelectorAll('.lore-card')];
    assert.ok(cards.length >= 3);
    for (const c of cards) { assert.ok(c.classList.contains('lkx-tilt'), hub + ' : lkx-tilt'); if (card) assert.ok(c.classList.contains(card), hub + ' : ' + card); assert.ok(c.querySelector('.veh-body h3') && c.querySelector('.veh-go'), hub + ' : contenu de la carte inchangé'); }
    assert.match(css, new RegExp('\\.' + fx.replace('-', '\\-') + '\\.is-in>\\*\\{animation:'), fx + ' : animation d’entrée');
    if (grid) assert.ok(css.includes('.' + grid), grid + ' : style');
  }
  assert.equal(seen.size, 6, 'six entrées différentes');
  const dem = doc('demeures.html');
  assert.ok(dem.querySelectorAll('#fiches .lore-card .lkx-scan-media img').length >= 3, 'Demeures : image dans son cadre de balayage');
  const pla = doc('planques.html');
  assert.deepEqual([...pla.querySelectorAll('#fiches .lore-dossier-tab')].map(t => t.textContent), ['Dossier 01', 'Dossier 02', 'Dossier 03']);
  const lie = doc('lieux.html');
  assert.equal(lie.querySelectorAll('#fiches .lore-stamp').length, 6, 'Lieux : un timbre par carte postale');
  const ent = doc('entreprises.html');
  for (const c of ent.querySelectorAll('#fiches .lore-card')) assert.match(c.getAttribute('style') || '', /--hue:\d+/, 'Entreprises : teinte de l’enseigne');
  assert.match(css, /prefers-reduced-motion:reduce\)\{[\s\S]*\.lkx-pin\.is-in>\*,\.lkx-slide\.is-in>\*,\.lkx-neon\.is-in>\*/, 'mouvement réduit : rien ne bouge');
});

test('collectibles : six familles illustrées (visuel officiel existant), cliquables, fiche squelette plein écran avec « Pour GTA VI », repères de la série et champs de la future fiche', () => {
  const d = doc('collectibles.html');
  assert.ok(d.querySelector('main.lkx-page') && d.getElementById('lkx-sheet'), 'mécanique des fiches plein écran');
  assert.match(read('collectibles.html'), /<link rel="stylesheet" href="lk-sections\.css(?:\?v=[a-f0-9]+)?">/);
  assert.match(read('collectibles.html'), /<script src="lk-sections\.js(?:\?v=[a-f0-9]+)?"><\/script>/);
  const fams = [...d.querySelectorAll('#categories .col-fams > li > details.lkx-det')];
  assert.equal(fams.length, 6);
  const ids = fams.map(f => f.id);
  assert.deepEqual(ids, ['famille-objets-caches', 'famille-epaves', 'famille-cascades', 'famille-faune-peche', 'famille-points-de-vue', 'famille-recompenses']);
  for (const f of fams) {
    const img = f.querySelector('summary .lkx-card-media img'); assert.ok(img && exists(img.getAttribute('src')), f.id + ' : visuel');
    assert.ok(f.querySelector('summary .lkx-card-go'), f.id + ' : « Voir la fiche »');
    assert.ok(f.querySelector('summary .col-fam-st'), f.id + ' : statut');
    const src = f.querySelector('.lkx-sheet-src');
    assert.ok(src.querySelector('.lkx-sheet-fig img') && src.querySelector('.lkx-sheet-t'), f.id + ' : fiche');
    assert.deepEqual([...src.querySelectorAll('h4')].map(h => h.textContent), ['Pour GTA VI', 'Repère de la série', 'Ce que dira chaque fiche']);
    assert.ok(src.querySelectorAll('.col-fam-serie li').length >= 1 && src.querySelectorAll('.col-fam-fields li').length === 5);
    assert.ok(src.querySelector('.lkx-sheet-fig figcaption').textContent.includes('Rockstar Games'), f.id + ' : crédit');
    for (const a of src.querySelectorAll('.lkx-sheet-cta a')) { const h = a.getAttribute('href'); if (h.startsWith('#')) assert.ok(d.getElementById(h.slice(1)), h); else assert.ok(exists(h), h); }
  }
  assert.equal(d.querySelector('#famille-epaves .col-fam-st').textContent, 'Confirmé');
  assert.doesNotMatch(d.getElementById('famille-epaves').textContent, /emplacement précis|\d+ emplacements/, 'rien d’inventé pour GTA VI');
  assert.ok(!d.querySelector('#sorties .lk-steps'), 'v7.72 : plus de liste explicative en double dans « Sorties et exports »');
  assert.ok(!d.querySelector('.col-fam-slots'), 'plus de squelette gris');
});

test('codes de triche : les quatre catégories ont la même hauteur (la fiche dépliable prend toute la case)', () => {
  const css = read('lk-sections.css');
  assert.match(css, /\.codes-cats\.lkx-cards>li\{display:flex;flex-direction:column/);
  assert.match(css, /\.codes-cats\.lkx-cards>li>\.lkx-det\{flex:1;display:block;\}/, 'le <details> reste en bloc : en flex, Chromium met en page le contenu fermé de la fiche (texte invisible mesuré par l’audit)');
  assert.match(css, /\.codes-cats\.lkx-cards>li>\.lkx-det>summary\{display:flex;height:100%;\}/);
  assert.match(css, /\.codes-cats\.lkx-cards>li>\.lkx-det>summary>\.lkx-card\{flex:1;\}/);
  assert.equal(doc('codes-de-triche.html').querySelectorAll('.codes-cats > li > details.lkx-det').length, 4);
});

test('langues : les hubs et les familles sont traduits (timbre, dossier, fiches)', () => {
  for (const l of ['en/', 'es/', 'it/', 'de/']) {
    const lieux = doc(l + 'lieux.html'); assert.equal(lieux.querySelectorAll('#fiches .lore-stamp').length, 6, l + 'lieux : timbres');
    assert.doesNotMatch(lieux.querySelector('#fiches .lore-stamp').textContent, /^Région$/, l + ' : timbre traduit');
    const col = doc(l + 'collectibles.html'); assert.equal(col.querySelectorAll('#categories details.lkx-det').length, 6, l + 'collectibles');
    assert.doesNotMatch(col.querySelector('#famille-epaves .lkx-sheet-t').textContent, /Épaves et voitures abandonnées/, l + ' : titre traduit');
  }
});
