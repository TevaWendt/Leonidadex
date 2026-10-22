'use strict';
/* v8.04 (lot K, Téva : « améliore l'esthétique globale de cette page ») : la page Collectibles suit la charte d'un bout à
   l'autre. Un seul filet ambre, aucun dégradé multicolore ni ton hors charte, aucune carte qu'on lit qui bouge ou se
   recouvre au survol, aucune animation sans fin, aucune flèche écrite, aucun « 0 » ni tiret
   pour ce qui est inconnu ; l'entrée de la page et les réponses aux actions passent par le moteur commun ou par des
   animations courtes coupées en mouvement réduit. */
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '../..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

test('style.css ne garde plus de règle propre aux sections #sorties et #carnet (liserés multicolores, survols qui recouvrent)', () => {
  const css = read('outils/sources/style.css');
  assert.doesNotMatch(css, /#sorties\s+\.col-|#carnet\s+\.col-/);
  assert.doesNotMatch(css, /#2BB3B1/i);
});

test('feuille de la page : jetons de la charte, pas de dégradé multicolore, pas d’animation sans fin, mouvement réduit respecté', () => {
  const css = read('outils/sources/collectibles-brand.css');
  assert.doesNotMatch(css, /infinite/);
  assert.doesNotMatch(css, /#1F7A70|#2BB3B1/i, 'aucun ton hors charte');
  for (const g of css.match(/linear-gradient\([^;]*?\)(?=[;}])/g) || []) {
    const colors = g.match(/var\(--[a-z0-9-]+|#[0-9a-f]{3,8}\b/gi) || [];
    assert.ok(colors.every(c => /--(night|night-2|night-deep|amber|rule)\b|#(241740|2B1B4D|5A2358)/i.test(c)), 'dégradé hors famille : ' + g);
  }
  /* les états cachés du mouvement n'existent qu'en « mouvement normal » et sous .js */
  const hidden = [...css.matchAll(/:not\(\.in\)[^{]*\{[^}]*(clip-path|opacity:0)/g)];
  assert.ok(hidden.length >= 3);
  const blocks = css.split('@media(prefers-reduced-motion:no-preference){');
  assert.ok(blocks.length >= 4, 'moments de mouvement regroupés sous « mouvement normal »');
  assert.match(css, /\.col-dash:not\(\[data-vide\]\) \.col-dash-t--vide,\.col-dash\[data-vide\] \.col-dash-t:not\(\.col-dash-t--vide\):not\(\.col-dash-t--q\)\{display:none;\}/);
});

test('collectibles.html : familles sans compteur « 0 » ni bascule qui suit la souris, aucune flèche écrite', () => {
  const html = read('collectibles.html');
  const cats = html.slice(html.indexOf('id="categories"'), html.indexOf('id="catalogue"'));
  assert.doesNotMatch(cats, /lkx-tilt|lkx-card-n/);
  const main = html.slice(html.indexOf('<main'), html.indexOf('<!-- COLLECTIBLES-METHODE:START -->'));
  assert.doesNotMatch(main.replace(/<script[\s\S]*?<\/script>/g, ''), /↗|◇/);
  assert.doesNotMatch(main, /data-tip=/, 'l’explication de chaque panneau est écrite, pas cachée sous un survol');
  assert.match(main, /<p class="col-panel-what">/);
  assert.doesNotMatch(main, /<b id="col-percent">—<\/b>/);
});

test('scripts : réponse à « cocher » (tampon), cascade au filtrage par LKMotion, aucune flèche écrite ni « / » de séparation', () => {
  const js = read('outils/sources/collectibles.js'), tools = read('outils/sources/collectibles-tools.js');
  assert.match(js, /col-card-stamp/);
  assert.match(js, /window\.LKMotion\.enter\(/);
  assert.match(js, /prefers-reduced-motion: reduce/);
  assert.doesNotMatch(js + tools, /↗/);
  assert.doesNotMatch(js, /'\/ ' \+ trackable/);
});
