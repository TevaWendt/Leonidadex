'use strict';
/* v8.04 (jour J, prompt 2) : ce que les tests écrits avant la sortie appelaient « aucun chiffre » devient « aucun chiffre
   inventé » : un chiffre n’est accepté que s’il est publié au format (statut, source, date ; outils/QUAND-ROCKSTAR-PUBLIE.md
   § 1). Sans données publiées, ces contrôles sont exactement ceux d’avant (aucune valeur ne passe par ces fonctions). */
const path = require('node:path'), root = path.resolve(__dirname, '../..');
const DP = require(path.join(root, 'outils/donnees-publiees.cjs'));
const STATUTS_LISTE = ['officiel', 'official', 'verified', 'vu', 'media', 'presse', 'estimated', 'comm', 'community'];
const LIBELLES = '(?:Officiel|Mesuré et vérifié|Mesuré|Estimation|Estimé|Vu dans un média|Communautaire|Non confirmé)';
const N = '\\d{1,3}(?:[ \\u00a0\\u202f]\\d{3})*';
/* prix_gta6 d’une ligne de liste : vide (« conf ») ou publié au format */
function prixGta6Ok(p) {
  if (!p) return true;
  if (p.valeur === null || p.valeur === undefined) return p.statut === 'conf';
  return typeof p.valeur === 'number' && p.valeur >= 0 && STATUTS_LISTE.includes(p.statut) && typeof p.source === 'string' && !!p.source.trim() && /^\d{4}-\d{2}-\d{2}/.test(p.verifiedAt || '') && DP.verifierExtras(p, 'prix_gta6', p.valeur).length === 0;
}
/* texte d’une case qui affiche un prix publié : « 45 $ (de 40 à 50 $), Vu dans un média… » */
const PRIX_AFFICHE = new RegExp('^' + N + ' \\$(?: \\(de ' + N + ' à ' + N + ' \\$\\))?,? ?' + LIBELLES);
const prixAffiche = t => PRIX_AFFICHE.test(String(t || '').replace(/\s+/g, ' ').trim());
/* prix lu par le calculateur pour une fiche : publié (avec sa source) ou inconnu */
const prixCalculOk = row => !row || row.price === null || (typeof row.price === 'number' && !!(row.fieldMeta && row.fieldMeta.price && row.fieldMeta.price.status && row.fieldMeta.price.status !== 'unverified'));
/* des données sont-elles publiées ? (prix, activités chiffrées) */
const publie = (r = root) => { const e = DP.etat(r); return e.prix.connus > 0 || e.activites.completes > 0 || Object.values(e.catalogues || {}).some(x => x.connus > 0); };
module.exports = { prixGta6Ok, prixAffiche, prixCalculOk, publie, STATUTS_LISTE };
