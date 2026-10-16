#!/usr/bin/env node
'use strict';
/* v7.92 : three.js réduit pour l'Atelier 3D.
   vendor/three.atelier.min.js ne garde que ce dont atelier-3d.js se sert : les noms THREE.Xxx relevés dans le script, et ce
   qu'ils emportent. Il est construit à partir de vendor/three.module.min.js (build officiel de three.js, inchangé, gardé
   comme source) par esbuild, qui ne fait qu'enlever le code inutilisé (tree shaking) : rien n'est réécrit dans three.js.
   Résultat : environ 535 Ko au lieu de 691 Ko (137 Ko compressés au lieu de 171), donc moins à télécharger et à compiler
   à l'ouverture de l'Atelier. Licence MIT de three.js reprise en tête du fichier (vendor/LICENSE-three.txt).
   Usage : node outils/three-atelier.cjs            reconstruit le fichier (esbuild : NODE_PATH=/opt/npm-tools/node_modules,
                                                    ou « npm i -D esbuild ») ; à relancer si atelier-3d.js utilise une
                                                    nouvelle classe de three.js
           node outils/three-atelier.cjs --check    vérifie, sans esbuild, que le fichier livré exporte chaque nom utilisé
                                                    par atelier-3d.js (appelé par les tests) */
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const ROOT = path.resolve(__dirname, '..');
const SRC = 'vendor/three.module.min.js', OUT = 'vendor/three.atelier.min.js', USER = 'atelier-3d.js';

/* noms de three.js utilisés par l'Atelier (THREE.Xxx), triés */
function usedNames(root = ROOT) {
  const js = fs.readFileSync(path.join(root, USER), 'utf8');
  return [...new Set((js.match(/\bTHREE\.([A-Za-z_$][\w$]*)/g) || []).map(x => x.slice(6)))].sort();
}
/* noms exportés par le fichier livré (la clause « export { … } » finale d'esbuild : « a as Nom, … ») */
function exportedNames(root = ROOT) {
  const s = fs.readFileSync(path.join(root, OUT), 'utf8');
  const m = s.match(/export\s*\{([^}]*)\}\s*;?\s*$/);
  if (!m) return [];
  return m[1].split(',').map(x => x.trim().split(/\s+as\s+/).pop()).filter(Boolean).sort();
}
function check(root = ROOT) {
  const err = [];
  if (!fs.existsSync(path.join(root, OUT))) return ['fichier absent : ' + OUT];
  const used = usedNames(root), have = new Set(exportedNames(root));
  for (const n of used) if (!have.has(n)) err.push(OUT + ' n’exporte pas THREE.' + n + ' (utilisé par ' + USER + ') : relance node outils/three-atelier.cjs');
  const head = fs.readFileSync(path.join(root, OUT), 'utf8').slice(0, 600);
  if (!/@license/.test(head) || !/Three\.js Authors/.test(head) || !/MIT/.test(head)) err.push(OUT + ' : licence de three.js absente de l’en-tête');
  if (!new RegExp("from '\\./" + OUT.replace(/\./g, '\\.').replace(/\//g, '\\/') + "(?:\\?v=[a-f0-9]+)?'").test(fs.readFileSync(path.join(root, USER), 'utf8'))) err.push(USER + ' n’importe pas ./' + OUT);
  return err;
}
function build(root = ROOT) {
  let esbuild;
  try { esbuild = require('esbuild'); } catch (e) { throw new Error('esbuild introuvable : NODE_PATH=/opt/npm-tools/node_modules node outils/three-atelier.cjs (ou npm i -D esbuild)'); }
  const src = fs.readFileSync(path.join(root, SRC), 'utf8');
  const rev = (src.match(/const \w+="(\d+)"/) || [])[1] || '?';
  const lic = (src.match(/^\/\*\*[\s\S]*?\*\//) || [''])[0];
  if (!/@license/.test(lic)) throw new Error(SRC + ' : licence introuvable en tête du fichier');
  const names = usedNames(root);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lk-three-'));
  try {
    fs.writeFileSync(path.join(tmp, 'entree.js'), 'export { ' + names.join(', ') + ' } from ' + JSON.stringify(path.join(root, SRC)) + ';\n');
    const banner = lic + '\n/* Sous-ensemble de three.js r' + rev + ' pour l’Atelier 3D de Leonidakit : ' + names.length + ' noms utilisés par atelier-3d.js, '
      + 'tirés du build officiel (vendor/three.module.min.js) sans autre changement, par outils/three-atelier.cjs (esbuild). */';
    esbuild.buildSync({ entryPoints: [path.join(tmp, 'entree.js')], bundle: true, format: 'esm', minify: true, treeShaking: true, legalComments: 'none', banner: { js: banner }, outfile: path.join(root, OUT), logLevel: 'warning' });
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
  const err = check(root);
  if (err.length) throw new Error(err.join('\n'));
  const a = fs.statSync(path.join(root, SRC)).size, b = fs.statSync(path.join(root, OUT)).size;
  console.log('three.js pour l’Atelier : ' + names.length + ' noms, ' + Math.round(b / 1024) + ' Ko au lieu de ' + Math.round(a / 1024) + ' Ko (' + Math.round((1 - b / a) * 100) + ' % de moins)');
}

module.exports = { usedNames, exportedNames, check, build, SRC, OUT };
if (require.main === module) {
  if (process.argv.includes('--check')) { const err = check(); if (err.length) { console.error(err.join('\n')); process.exit(1); } console.log('three.js pour l’Atelier : ' + usedNames().length + ' noms, tous exportés.'); }
  else build();
}
