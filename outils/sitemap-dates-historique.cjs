#!/usr/bin/env node
'use strict';
/* v7.86 (référencement) : dates « lastmod » réelles du plan du site, reconstituées depuis l’historique git.
   Avant la v7.86, outils/sitemap-dates.json datait chaque adresse par une empreinte de tout le HTML : la moindre retouche du
   gabarit redatait toutes les pages, si bien que le plan du site ne portait que deux dates pour 2 115 adresses (Google ignore
   alors ces dates). L’empreinte porte désormais sur le contenu (outils/langues.cjs, contentPrint) ; ce script, lancé une fois,
   donne à chaque adresse la date du commit depuis lequel son contenu n’a plus changé, en remontant l’historique du dépôt.
   Usage (depuis la racine, dépôt git propre ou non : seuls les objets des commits sont lus) :
     node outils/sitemap-dates-historique.cjs [révision]   (révision par défaut : HEAD) */
const fs = require('node:fs'), path = require('node:path'), { execFileSync, spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const L = require('./langues.cjs');
const rev = process.argv[2] || 'HEAD';
const git = (...a) => execFileSync('git', a, { cwd: root, encoding: 'utf8', maxBuffer: 1 << 28 });
const datesFile = path.join(root, 'outils/sitemap-dates.json');
const urls = Object.keys(JSON.parse(fs.readFileSync(datesFile, 'utf8')));
const base = 'https://www.leonidakit.com/';
const fileOf = u => { const r = u.slice(base.length).split('#')[0]; return r === '' ? 'index.html' : r.endsWith('/') ? r + 'index.html' : r; };
const wanted = new Set(urls.map(fileOf));
/* commits du plus ancien au plus récent, avec leur date (AAAA-MM-JJ, heure du commit) */
const commits = git('log', '--reverse', '--format=%H %cs', rev).trim().split('\n').map(l => { const [sha, date] = l.split(' '); return { sha, date }; });
const trees = commits.map(c => {
  const map = new Map();
  for (const line of git('ls-tree', '-r', c.sha).split('\n')) { const m = line.match(/^\d+ blob ([0-9a-f]+)\t(.+)$/); if (m && wanted.has(m[2])) map.set(m[2], m[1]); }
  return map;
});
/* empreinte de chaque version distincte d’une page (lecture groupée des objets git) */
const blobs = [...new Set(trees.flatMap(t => [...t.values()]))];
const prints = new Map();
for (let i = 0; i < blobs.length; i += 400) {
  const part = blobs.slice(i, i + 400);
  const out = spawnSync('git', ['cat-file', '--batch'], { cwd: root, input: part.join('\n') + '\n', maxBuffer: 1 << 30 }).stdout;
  let pos = 0;
  for (const id of part) {
    const nl = out.indexOf(10, pos), head = out.slice(pos, nl).toString('utf8').split(' '), size = Number(head[2]);
    if (head[0] !== id || !Number.isFinite(size)) throw new Error('lecture git inattendue pour ' + id);
    prints.set(id, L.printHash(out.slice(nl + 1, nl + 1 + size).toString('utf8')));
    pos = nl + 1 + size + 1;
  }
}
/* date : le plus ancien commit d’une suite ininterrompue (jusqu’à la révision) où le contenu est celui de la révision */
const last = trees.length - 1, next = {};
let absent = 0;
for (const u of urls.sort()) {
  const f = fileOf(u), head = trees[last].get(f);
  if (!head) { absent++; continue; }
  const h = prints.get(head);
  let k = last;
  while (k > 0) { const b = trees[k - 1].get(f); if (!b || prints.get(b) !== h) break; k--; }
  next[u] = [h, commits[k].date];
}
fs.writeFileSync(datesFile, JSON.stringify(next, null, 0).replace(/\],"/g, '],\n"') + '\n');
const byDate = {}; for (const [, d] of Object.values(next)) byDate[d] = (byDate[d] || 0) + 1;
console.log('sitemap-dates : ' + Object.keys(next).length + ' adresses datées depuis ' + commits.length + ' commits (' + blobs.length + ' versions lues) ; ' + absent + ' absente(s) de ' + rev + ' ; dates : ' + JSON.stringify(byDate));
