#!/usr/bin/env node
'use strict';
/* v7.48 (lot 1) : valide outils/modele-donnees.json et écrit modele-donnees.js (window.LK_MODELE, module.exports).
   Une seule source pour les statuts d’une valeur, les genres de critères, les mécaniques non confirmées, la structure
   documentaire des catégories et les carnets de progression. Refuse : identifiant en double, genre, statut, mécanique
   ou état vide inconnu, outil inconnu, carnet sans famille connue, URL de carnet hors de /carnets/.
   Usage : node outils/gen-modele.cjs [--check] (--check : compare sans écrire, code 1 si différent). */
const fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname, '..');
const SRC = path.join(__dirname, 'modele-donnees.json'), OUT = path.join(root, 'modele-donnees.js');
const TOOLS = ['goal', 'purchase', 'session', 'budget', 'order', 'roi', 'activities', 'compare', 'plan'];
const FAMILIES = ['vehicules', 'armes', 'equipements', 'munitions', 'lieux', 'consommables', 'coiffures', 'tatouages', 'tenues', 'perso-vehicules', 'perso-armes', 'collectibles', 'acquisitions', 'calculs'];
const CATEGORIES_EXTRA = ['place', 'collectible', 'calcul'];

function load() { return JSON.parse(fs.readFileSync(SRC, 'utf8')); }
function validate(m) {
  const errors = [];
  const ids = (list, what) => { const seen = new Set(); for (const x of list || []) { if (!x || typeof x.id !== 'string' || !/^[a-z][a-zA-Z0-9-]*$/.test(x.id)) errors.push(what + ' : identifiant invalide ' + JSON.stringify(x && x.id)); else if (seen.has(x.id)) errors.push(what + ' : identifiant en double ' + x.id); seen.add(x && x.id); } return seen; };
  if (typeof m.version !== 'string' || !/^\d{4}-\d{2}-\d{2}\.\d+$/.test(m.version)) errors.push('version : format AAAA-MM-JJ.n attendu');
  const statuts = ids(m.statuts, 'statuts'), genres = ids(m.genres, 'genres'), mecas = ids(m.mecaniques, 'mécaniques');
  ids(m.etatsAdmission, 'états d’admission'); ids(m.facteurs, 'facteurs'); const cats = ids(m.categories, 'catégories'); ids(m.carnets, 'carnets');
  for (const s of m.statuts) { if (typeof s.calcul !== 'boolean') errors.push('statut ' + s.id + ' : calcul doit être vrai ou faux'); if (!['site', 'toi', 'simulation', 'exemple'].includes(s.origine)) errors.push('statut ' + s.id + ' : origine inconnue'); }
  for (const need of ['official', 'personal', 'simulated', 'example', 'series', 'blank', 'unknown', 'unconfirmed', 'na']) if (!statuts.has(need)) errors.push('statut manquant : ' + need);
  for (const g of ['condition', 'grandeur', 'comparaison', 'preference', 'hypothese']) if (!genres.has(g)) errors.push('genre manquant : ' + g);
  for (const me of m.mecaniques) { if (!statuts.has(me.statut)) errors.push('mécanique ' + me.id + ' : statut inconnu'); if (!me.texte || me.texte.length < 20) errors.push('mécanique ' + me.id + ' : texte trop court'); }
  for (const f of m.facteurs) {
    if (!genres.has(f.genre)) errors.push('facteur ' + f.id + ' : genre inconnu ' + f.genre);
    if (!Array.isArray(f.outils) || !f.outils.length || f.outils.some(t => !TOOLS.includes(t))) errors.push('facteur ' + f.id + ' : outil inconnu');
    if (f.mecanique && !mecas.has(f.mecanique)) errors.push('facteur ' + f.id + ' : mécanique inconnue');
    for (const k of ['label', 'sens', 'intervention']) if (typeof f[k] !== 'string' || f[k].length < 5) errors.push('facteur ' + f.id + ' : ' + k + ' manquant');
  }
  for (const t of TOOLS) if (!m.facteurs.some(f => f.outils.includes(t))) errors.push('aucun facteur pour l’outil ' + t);
  const vides = m.vides || {};
  for (const c of m.categories) {
    const rub = ids(c.rubriques, 'rubriques de ' + c.id), champs = ids(c.champs, 'champs de ' + c.id);
    if (!champs.size) errors.push('catégorie ' + c.id + ' sans champ');
    for (const ch of c.champs) {
      if (!rub.has(ch.rubrique)) errors.push(c.id + '.' + ch.id + ' : rubrique inconnue');
      if (!genres.has(ch.genre)) errors.push(c.id + '.' + ch.id + ' : genre inconnu');
      if (ch.mecanique && !mecas.has(ch.mecanique)) errors.push(c.id + '.' + ch.id + ' : mécanique inconnue');
      if (!ch.mecanique && !(ch.vide in vides)) errors.push(c.id + '.' + ch.id + ' : état vide inconnu ' + ch.vide);
    }
  }
  for (const k of m.carnets) {
    if (!/^\/carnets\/[a-z0-9-]+\.html$/.test(k.url)) errors.push('carnet ' + k.id + ' : URL hors de /carnets/');
    if (!Array.isArray(k.familles) || !k.familles.length || k.familles.some(f => !FAMILIES.includes(f))) errors.push('carnet ' + k.id + ' : famille inconnue');
    if (!cats.has(k.categorie) && !CATEGORIES_EXTRA.includes(k.categorie)) errors.push('carnet ' + k.id + ' : catégorie inconnue');
    if (!['possession', 'stock', 'decouverte', 'collection', 'document'].includes(k.nature)) errors.push('carnet ' + k.id + ' : nature inconnue');
  }
  const covered = new Set(m.carnets.flatMap(k => k.familles));
  for (const f of FAMILIES) if (!covered.has(f)) errors.push('famille sans carnet : ' + f);
  if (covered.size !== m.carnets.reduce((n, k) => n + k.familles.length, 0)) errors.push('une famille appartient à deux carnets');
  return errors;
}
function render(m) {
  const data = JSON.stringify(m);
  return '/* LEONIDAKIT — modèle commun des données, des critères et des carnets. Généré par outils/gen-modele.cjs depuis\n   outils/modele-donnees.json : ne pas modifier à la main. Aucune donnée de GTA VI ici, seulement la façon de les ranger. */\n' +
    '(function (root, data) { \'use strict\'; var frozen = JSON.parse(data); if (typeof module === \'object\' && module.exports) module.exports = frozen; else root.LK_MODELE = frozen; }(typeof globalThis !== \'undefined\' ? globalThis : this, ' + JSON.stringify(data) + '));\n';
}
function main() {
  const m = load(), errors = validate(m);
  if (errors.length) { console.error('modele-donnees.json refusé :\n- ' + errors.join('\n- ')); process.exit(1); }
  const out = render(m);
  if (process.argv.includes('--check')) { const cur = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : ''; if (cur !== out) { console.error('modele-donnees.js n’est pas à jour : lance node outils/gen-modele.cjs'); process.exit(1); } console.log('modele-donnees.js à jour'); return; }
  fs.writeFileSync(OUT, out);
  console.log('modele-donnees.js : ' + m.statuts.length + ' statuts, ' + m.facteurs.length + ' facteurs, ' + m.mecaniques.length + ' mécaniques, ' + m.categories.length + ' catégories, ' + m.carnets.length + ' carnets');
}
if (require.main === module) main();
module.exports = { load, validate, render, TOOLS, FAMILIES };
