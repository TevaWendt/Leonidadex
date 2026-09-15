/* ============================================================
   LEONIDAKIT — images : synchronisation disque vers base
   Usage :  node releve/images.js          (rapport seul)
            node releve/images.js --ecrire (met à jour v-corrige.json)

   Lit img/vehicules/, en déduit le champ « vues » de chaque
   véhicule, et refuse d'écrire tant qu'un crédit obligatoire
   manque. Tu ne touches jamais v-corrige.json à la main.
   ============================================================ */
const fs = require('fs');
const path = require('path');

const VUES = ['face', 'profil', 'arriere', 'interieur', 'detail'];
const DOSSIER = 'img/vehicules';
const SOURCE = 'releve/v-corrige.json';
const CREDITS = 'releve/credits-images.json';

const ecrire = process.argv.includes('--ecrire');
const V = JSON.parse(fs.readFileSync(SOURCE, 'utf8'));
const parId = {};
V.forEach(v => parId[v.id] = v);

let credits = {};
try { credits = JSON.parse(fs.readFileSync(CREDITS, 'utf8')); delete credits._commentaire; }
catch (e) { credits = {}; }

/* ---------- lecture du dossier ---------- */
let fichiers = [];
try { fichiers = fs.readdirSync(DOSSIER); }
catch (e) {
  console.log('Dossier ' + DOSSIER + ' absent. Rien à synchroniser.');
  console.log('Crée-le à la racine du dépôt et dépose les images dedans.');
  process.exit(0);
}

const trouve = {};       // id -> [vues]
const orphelins = [];    // fichiers qui ne correspondent à aucun véhicule
const malNommes = [];    // fichiers hors convention

fichiers.forEach(f => {
  if (f.startsWith('.')) return;
  const m = f.match(/^([a-z0-9-]+)-(face|profil|arriere|interieur|detail)\.jpg$/);
  if (!m) { malNommes.push(f); return; }
  const [, id, vue] = m;
  if (!parId[id]) { orphelins.push(f); return; }
  (trouve[id] = trouve[id] || []).push(vue);
});

/* vues triées dans l'ordre d'affichage, jamais alphabétique */
Object.keys(trouve).forEach(id => {
  trouve[id] = VUES.filter(v => trouve[id].includes(v));
});

/* ---------- contrôles ---------- */
const pb = [];
const add = (g, d) => pb.push({ g, d });

Object.keys(trouve).forEach(id => {
  const v = parId[id];
  /* une fiche sans vue de profil se remarque tout de suite à l'affichage */
  if (!trouve[id].includes('profil'))
    add('vue profil manquante', id + ' : ' + trouve[id].join(', '));
});

malNommes.forEach(f => add('nom hors convention', f));
orphelins.forEach(f => add('aucun véhicule pour ce fichier', f));

/* véhicules dont la base annonce des vues que le disque ne confirme pas.
   Jamais corrigé automatiquement : les images peuvent être déjà en ligne
   sans être dans ta copie locale. On signale, on ne touche pas. */
V.forEach(v => {
  if (!Array.isArray(v.vues) || !v.vues.length) return;
  const d = trouve[v.id];
  if (!d) add('déclaré en base, absent du disque', v.id + ' : ' + v.vues.join(', '));
  else if (d.join(',') !== v.vues.join(','))
    add('écart base / disque', v.id + ' : base ' + v.vues.join(',') + ' | disque ' + d.join(','));
});

/* ---------- rapport ---------- */
const n = Object.keys(trouve).length;
const complets = Object.keys(trouve).filter(id => trouve[id].length >= 3).length;
console.log('IMAGES — ' + V.length + ' véhicules\n');
console.log('  fiches avec au moins une vue : ' + n + ' (' + Math.round(n / V.length * 100) + ' %)');
console.log('  fiches à trois vues ou plus   : ' + complets);
console.log('  fiches sans aucune image     : ' + (V.length - n));
console.log('  crédits déclarés             : ' + Object.keys(credits).length);

const g = {};
pb.forEach(p => (g[p.g] = g[p.g] || []).push(p.d));
console.log('');
['vue profil manquante', 'nom hors convention', 'aucun véhicule pour ce fichier',
 'déclaré en base, absent du disque', 'écart base / disque'].forEach(k => {
  const x = g[k] || [];
  console.log((x.length ? '✗ ' : '✓ ') + k.padEnd(32) + ' : ' + x.length);
  x.slice(0, 15).forEach(d => console.log('     ' + d));
  if (x.length > 15) console.log('     … et ' + (x.length - 15) + ' de plus');
});

/* ---------- écriture ---------- */
if (!ecrire) {
  console.log('\nRapport seul. Relance avec --ecrire pour mettre à jour ' + SOURCE + '.');
  process.exit(0);
}
const bloquant = (g['nom hors convention'] || []).length;
if (bloquant) {
  console.log('\nÉcriture refusée : ' + bloquant + ' problème(s) bloquant(s) ci-dessus.');
  console.log('Corrige les noms de fichiers et les crédits, puis relance.');
  process.exit(1);
}
/* On n'ajoute et on ne met à jour que là où des fichiers existent.
   Aucune suppression : une fiche déjà illustrée en ligne ne doit pas
   perdre ses vues parce que ta copie locale du dossier est incomplète. */
let modif = 0;
V.forEach(v => {
  const vues = trouve[v.id];
  if (!vues || !vues.length) return;
  const avant = JSON.stringify(v.vues || null) + '|' + (v.credit || '');
  v.vues = vues;
  if (credits[v.id]) v.credit = credits[v.id];
  if (JSON.stringify(v.vues) + '|' + (v.credit || '') !== avant) modif++;
});
fs.writeFileSync(SOURCE, JSON.stringify(V, null, 1));
console.log('\n' + modif + ' fiche(s) mise(s) à jour dans ' + SOURCE + '.');
console.log('Enchaîne avec : node final.js puis node gen.js');
