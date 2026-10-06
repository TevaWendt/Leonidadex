'use strict';
/* Calculateur, lot 1 : « même interface ». Le cadre visible (textes fixes, attributs lus, structure, ordre, classes, options
   des listes, empreintes des styles) des neuf outils, dans les trois modes et les cinq langues, est identique à l’instantané pris
   sur la base avant le lot 1 (outils/calculateur-cadre.json). Seul le contenu des zones de résultat dynamiques inventoriées
   (ZONES de outils/calculateur-cadre.cjs) peut changer. Environ 4 minutes. */
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const { collect } = require('../calculateur-cadre.cjs');
test('cadre du calculateur identique à l’instantané d’avant le lot 1 (150 vues, cinq langues, trois modes)', { timeout: 900000 }, async () => {
  const ref = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'calculateur-cadre.json'), 'utf8')), now = await collect();
  assert.deepEqual(now.errors, []);
  assert.deepEqual(Object.keys(now.pages).sort(), Object.keys(ref.pages).sort());
  for (const k of Object.keys(ref.pages)) assert.deepEqual(now.pages[k], ref.pages[k], k);
  assert.deepEqual(now.css, ref.css);
});
