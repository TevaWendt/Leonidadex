#!/usr/bin/env node
'use strict';

// Projection des sources existantes. Aucun prix ni performance ne sont inférés.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = name => JSON.parse(fs.readFileSync(path.join(__dirname, name), 'utf8'));
const editorial = read('editorial.json');
const media = read('medias-officiels.json');
const weaponMedia = read('armes-medias.json');
const exists = url => typeof url === 'string' && /^\/[a-z0-9][a-z0-9/_.-]*$/i.test(url) && !url.includes('..') && fs.existsSync(path.join(root, url.slice(1)));
const imageFor = ids => {
  for (const id of ids || []) {
    const variants = media[id]?.variants || [];
    const image = variants.find(v => v.w === 480 && exists(v.src)) || variants.find(v => exists(v.src));
    if (image) return image.src;
  }
  return null;
};
const entries = [];
for (const [collection, type, folder, category] of [
  ['regions', 'place', 'lieux', 'Région'],
  ['businesses', 'business', 'entreprises', 'Commerce et entreprise'],
  ['residences', 'property', 'demeures', 'Demeure'],
  ['hideouts', 'hideout', 'planques', 'Planque']
]) {
  for (const entry of editorial[collection] || []) {
    if (!/^[a-z0-9][a-z0-9-]*$/.test(entry.id)) throw new Error(`Identifiant invalide dans ${collection}`);
    const url = `/${folder}/${entry.id}.html`;
    if (!exists(url)) throw new Error(`Fiche manquante : ${url}`);
    const item = {
      id: entry.id, type, name: entry.name, category, url,
      image: imageFor(entry.media),
      // Le lien indique la provenance éditoriale, pas une nouvelle vérification.
      status: entry.status || entry.st || 'source-listed',
      source: entry.source || null,
      verifiedAt: entry.verifiedAt || null,
      provenance: `outils/editorial.json#${collection}/${entry.id}`
    };
    // Propager les données économiques futures uniquement quand la source les porte.
    for (const key of ['price', 'prix', 'economy', 'fieldMeta', 'priceMeta', 'aliases', 'purchasable', 'activityIds']) {
      if (Object.prototype.hasOwnProperty.call(entry, key)) item[key] = entry[key];
    }
    entries.push(item);
  }
}
const weaponArt = require('./armes-schemas.cjs');
const weaponImages = Object.fromEntries(Object.entries(weaponMedia).map(([id, ids]) => [id, imageFor(ids)]).filter(([, image]) => image));
const payload = {
  schemaVersion: 1,
  provenance: ['outils/editorial.json', 'outils/medias-officiels.json', 'outils/armes-medias.json'],
  entries,
  weaponImages,
  // Réutilise les dessins du hub et des fiches armes, sans liste de médias manuelle.
  weaponSchemas: Object.fromEntries(weaponArt.ids.map(id => [id, weaponArt.schema(id, 120)]))
};
const output = '/* Généré par node outils/gen-calculateurs-catalogue.cjs. Ne pas éditer directement.\n' +
  '   Véhicules et armes sont lus dans leurs sources runtime, sans copie de catalogue. */\n' +
  'window.LK_CALCULATEURS_CATALOGUE = ' + JSON.stringify(payload, null, 2) + ';\n';
fs.writeFileSync(path.join(root, 'calculateurs-catalogue.js'), output);
console.log(`Catalogue calculateur : ${entries.length} fiches éditoriales, ${Object.keys(weaponImages).length} médias d’armes.`);
