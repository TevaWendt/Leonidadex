#!/usr/bin/env node
'use strict';
/* v7.40 (lot 3) : zone éditoriale de armes.html (inventaire, chiffres, équipements, munitions, combat, lieux, méthode,
   suite de la visite, FAQ), rendue entre les marqueurs <!-- lk:armurerie-editorial --> … <!-- /lk:armurerie-editorial -->
   depuis outils/hubs-editoriaux.json et armes-data.js. Le reste de armes.html (bandeau, constructeur d'équipement,
   catalogue) reste écrit à la main ; ses compteurs sont synchronisés par sync-site.cjs. Idempotent. */
const fs = require('node:fs'), path = require('node:path');
const H = require('./hubs-editoriaux.cjs');
const root = path.resolve(__dirname, '..'), file = path.join(root, 'armes.html');
const { V, A } = H.loadData();
const counts = { ...H.counts(A), nVehicules: V.length, nLieux: H.nLieux() };
const before = fs.readFileSync(file, 'utf8');
const after = H.replaceZone(before, 'armurerie-editorial', H.armes(A, counts));
if (after !== before) fs.writeFileSync(file, after);
console.log('Armurerie : zone éditoriale (' + counts.N + ' armes, ' + counts.nOfficiel + ' nommées, ' + counts.nCat + ' classes).');
