#!/usr/bin/env node
'use strict';
/* v7.89 (lot 5) : icônes PNG de l'appli, rendues par Chromium à partir des dessins du site (img/app/icone.svg,
   img/app/raccourcis.svg) — jamais une image prise ailleurs.
   - icone-192.png, icone-512.png : l'icône telle quelle (coins arrondis, fond transparent autour) ;
   - icone-maskable-512.png, apple-touch-icon-180.png : la même en plein cadre (sans coins arrondis : Android et iOS posent
     leur propre forme ; le soleil tient dans la zone sûre, un cercle de 40 % du côté autour du centre) ;
   - raccourci-<nom>-96.png : les pictogrammes des raccourcis du manifeste, en ambre sur le carré encre.
   Pas appelé par outils/regenerer.cjs : les PNG sont livrés ; à relancer seulement si un dessin change.
   Usage : NODE_PATH=…:/opt/npm-tools/node_modules LK_CHROMIUM=/opt/pw-browsers/chromium node outils/gen-icones-appli.cjs */
const fs = require('node:fs'), path = require('node:path');
const ROOT = path.resolve(__dirname, '..'), DIR = path.join(ROOT, 'img/app');
const { chromium } = require('playwright');
const exe = () => { const base = process.env.LK_CHROMIUM || '/opt/pw-browsers/chromium'; for (const c of [base, path.join(base, 'chrome-linux/chrome')]) if (fs.existsSync(c) && fs.statSync(c).isFile()) return c; const d = fs.existsSync('/opt/pw-browsers') ? fs.readdirSync('/opt/pw-browsers').filter(x => /^chromium-\d+$/.test(x)).sort().pop() : null; return d ? path.join('/opt/pw-browsers', d, 'chrome-linux/chrome') : undefined; };

const icone = fs.readFileSync(path.join(DIR, 'icone.svg'), 'utf8').replace(/<!--[\s\S]*?-->/g, '');
const pleinCadre = icone.replace(/<rect width="64" height="64" rx="12"/, '<rect width="64" height="64"');
const raccourcis = fs.readFileSync(path.join(DIR, 'raccourcis.svg'), 'utf8');
const glyphe = id => { const m = new RegExp('<g id="' + id + '"(?: transform="[^"]*")?([^>]*)>([\\s\\S]*?)</g>').exec(raccourcis); if (!m) throw new Error('pictogramme absent : ' + id); return '<g' + m[1] + '>' + m[2] + '</g>'; };
const carre = id => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="#1A1A1E"/><g transform="translate(13 13) scale(1.5833)">' + glyphe(id) + '</g></svg>';
const sortie = [
  ['icone-192.png', 192, icone], ['icone-512.png', 512, icone],
  ['icone-maskable-512.png', 512, pleinCadre], ['apple-touch-icon-180.png', 180, pleinCadre],
  ...['carte', 'calculateur', 'progression', 'compagnon'].map(id => ['raccourci-' + id + '-96.png', 96, carre(id)])
];
(async () => {
  const browser = await chromium.launch({ executablePath: exe() });
  const ctx = await browser.newContext({ deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  for (const [nom, taille, svg] of sortie) {
    await page.setViewportSize({ width: taille, height: taille });
    const doc = svg.replace(/<svg ([^>]*?)(?: width="\d+" height="\d+")?>/, '<svg $1 width="' + taille + '" height="' + taille + '">');
    await page.setContent('<!doctype html><html><head><style>html,body{margin:0;padding:0;background:transparent}svg{display:block}</style></head><body>' + doc + '</body></html>');
    await page.screenshot({ path: path.join(DIR, nom), omitBackground: true, clip: { x: 0, y: 0, width: taille, height: taille } });
    const b = fs.readFileSync(path.join(DIR, nom));
    console.log(nom.padEnd(30), b.readUInt32BE(16) + ' × ' + b.readUInt32BE(20), b.length + ' octets');
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
