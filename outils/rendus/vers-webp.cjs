'use strict';
/* v7.77 : convertit les silhouettes (PNG 960 × 600 écrits par silhouettes.py dans <dossier>/<famille>/<id>.png) en deux WebP par élément :
   img/illus/<famille>/<id>.webp (960 × 600) et <id>-p.webp (384 × 240). Seuls les éléments listés par
   outils/illustrations/index.cjs (IDS) sont convertis ; un fichier en trop dans img/illus/ est signalé par le contrôle de
   outils/gen-acquisitions.cjs. Usage : node outils/rendus/vers-webp.cjs /chemin/des/silhouettes [qualité=84] [qualité_petite=82] (qualité haute : les aplats
   et les liserés restent nets) */
const fs = require('node:fs'), path = require('node:path');
let sharp;
try { sharp = require('sharp'); } catch { console.error('module « sharp » introuvable : npm i sharp (ou NODE_PATH vers un dossier node_modules qui le contient)'); process.exit(1); }
const IL = require('../illustrations/index.cjs');
const root = path.resolve(__dirname, '../..');
const src = process.argv[2];
const Q = Number(process.argv[3] || 84), QP = Number(process.argv[4] || 82);
if (!src) { console.error('usage : node outils/rendus/vers-webp.cjs <dossier des silhouettes> [qualité] [qualité petite]'); process.exit(1); }
(async () => {
  let n = 0, bytes = 0;
  for (const [fam, ids] of Object.entries(IL.IDS)) {
    fs.mkdirSync(path.join(root, IL.DIR, fam), { recursive: true });
    for (const id of ids) {
      const png = path.join(src, fam, id + '.png');
      if (!fs.existsSync(png)) { console.error('manquant : ' + png); process.exitCode = 1; continue; }
      const big = path.join(root, IL.src(fam, id)), small = path.join(root, IL.srcSmall(fam, id));
      await sharp(png).resize(IL.W, IL.H, { fit: 'cover' }).webp({ quality: Q, effort: 6, smartSubsample: true }).toFile(big);
      await sharp(png).resize(IL.PW, IL.PH, { fit: 'cover', kernel: 'lanczos3' }).sharpen({ sigma: 0.5 }).webp({ quality: QP, effort: 6, smartSubsample: true }).toFile(small);
      bytes += fs.statSync(big).size + fs.statSync(small).size; n++;
    }
  }
  console.log(n + ' éléments, ' + (bytes / 1e6).toFixed(2) + ' Mo');
})();
