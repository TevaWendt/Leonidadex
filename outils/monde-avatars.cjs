#!/usr/bin/env node
'use strict';
/* v7.78 : pastilles des personnages (img/monde/<id>.webp, 128 × 128) utilisées par les cartes des hubs du monde
   (outils/monde-cartes.cjs) : un recadrage carré du visage dans une capture officielle déjà sur le site (variante 1280 px de
   img/officiel/), même crédit que la capture d'origine. Les centres (x, y) et la taille (s, part de la largeur de l'image)
   sont relevés à l'œil sur chaque capture. À relancer seulement si une capture change :
     NODE_PATH=<dossier contenant sharp> node outils/monde-avatars.cjs */
const fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname, '..');
const AVATARS = {
  jason: { media: 'jason-duval-01', x: 0.660, y: 0.160, s: 0.15 },
  lucia: { media: 'lucia-caminos-01', x: 0.640, y: 0.330, s: 0.20 },
  cal: { media: 'cal-hampton-01', x: 0.662, y: 0.170, s: 0.15 },
  boobie: { media: 'boobie-ike-01', x: 0.455, y: 0.235, s: 0.23 },
  drequan: { media: 'dre-quan-priest-01', x: 0.538, y: 0.150, s: 0.15 },
  dimez: { media: 'real-dimez-01', x: 0.452, y: 0.195, s: 0.15 },
  raul: { media: 'raul-bautista-01', x: 0.600, y: 0.300, s: 0.24 },
  brian: { media: 'brian-heder-01', x: 0.500, y: 0.270, s: 0.20 }
};
const SIZE = 128, DIR = 'img/monde';
module.exports = { AVATARS, SIZE, DIR, src: id => '/' + DIR + '/' + id + '.webp' };
if (require.main === module) {
  let sharp;
  try { sharp = require('sharp'); } catch { console.error('module « sharp » introuvable (NODE_PATH vers un dossier node_modules qui le contient)'); process.exit(1); }
  const MED = JSON.parse(fs.readFileSync(path.join(root, 'outils/medias-officiels.json'), 'utf8'));
  fs.mkdirSync(path.join(root, DIR), { recursive: true });
  (async () => {
    let bytes = 0;
    for (const [id, a] of Object.entries(AVATARS)) {
      const m = MED[a.media]; if (!m) throw new Error('capture inconnue : ' + a.media);
      const v = m.variants.find(x => x.w === 1280) || m.variants[m.variants.length - 1];
      const file = path.join(root, v.src.replace(/^\//, ''));
      const side = Math.round(v.w * a.s);
      let left = Math.round(v.w * a.x - side / 2), top = Math.round(v.h * a.y - side / 2);
      left = Math.max(0, Math.min(v.w - side, left)); top = Math.max(0, Math.min(v.h - side, top));
      const out = path.join(root, DIR, id + '.webp');
      await sharp(file).extract({ left, top, width: side, height: side }).resize(SIZE, SIZE, { kernel: 'lanczos3' }).sharpen({ sigma: 0.6 }).webp({ quality: 82, effort: 6 }).toFile(out);
      bytes += fs.statSync(out).size;
    }
    console.log(Object.keys(AVATARS).length + ' pastilles, ' + (bytes / 1024).toFixed(1) + ' Ko');
  })();
}
