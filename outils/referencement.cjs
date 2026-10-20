#!/usr/bin/env node
'use strict';
/* v8.01 : relevé de référencement de toutes les pages françaises servies (sans navigateur, quelques secondes).
   Pour chaque page proposée aux moteurs (ni redirection, ni noindex) : titre, h1, description, canonique, hreflang,
   image de partage, données structurées ; pour chaque page par élément (outils/couverture-pages.cjs --json), le nom de
   l’élément doit être dans le titre et dans le h1 (c’est lui que tapent les joueurs), et de préférence dans la description.
     node outils/referencement.cjs            résumé, puis les défauts (code 1 s’il y en a un bloquant)
     node outils/referencement.cjs --tout     liste aussi les avertissements (descriptions sans le nom, titres longs)
   Bloquant : titre en double, titre ou h1 sans le nom de l’élément, page sans canonique, hreflang, og:title ou données
   structurées, description qui finit par une espace. Avertissement : titre de plus de 65 signes, description de plus de
   160 ou de moins de 60 signes, description sans le nom. */
const fs = require('node:fs'), path = require('node:path'), { execFileSync } = require('node:child_process');
const ROOT = path.resolve(__dirname, '..');
const TOUT = process.argv.includes('--tout');
const SKIP = /^(outils|\.git|en|es|it|de|pt|api|img|fonts|photos|vendor|presse|leo|node_modules)$/;
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => { const p = path.join(d, e.name); if (e.isDirectory()) return SKIP.test(e.name) ? [] : walk(p); return e.name.endsWith('.html') && !/^google/.test(e.name) ? [p] : []; });
const texte = s => s.replace(/<br\s*\/?>/g, ' ').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&#39;|&apos;/g, '’').replace(/&quot;/g, '"').replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim();
const get = (s, re) => { const m = re.exec(s); return m ? texte(m[1]) : ''; };
/* comparaison sans accents ni ponctuation : « Dre’Quan Priest » et « Dre'Quan Priest » sont le même nom */
const norm = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\bgta vi\b/g, 'gta 6').replace(/[^a-z0-9$]+/g, ' ').trim();
/* le cœur d’un nom : sans l’article de tête (« Le Trailer 1 », « An Extended Look »), sans la parenthèse finale (« (nom réel) »),
   et jusqu’au premier tiret ou deux-points (« Coffret collector The Goodtime State – Vice City Collection ») */
const coeurDe = h1 => norm(h1.replace(/\s*\([^)]*\)\s*$/, '').split(/\s+[–—:]\s+/)[0].replace(/^(?:le|la|les|l’|l'|un|une|des|the|an|a)\s+/i, '').replace(/[.:]$/, ''));
const pages = walk(ROOT).map(p => path.relative(ROOT, p));
const lus = new Map();
for (const p of pages) {
  const s = fs.readFileSync(path.join(ROOT, p), 'utf8');
  if (/http-equiv="refresh"/.test(s)) continue;
  lus.set(p, { noindex: /name="robots"[^>]*noindex/.test(s), t: get(s, /<title>([\s\S]*?)<\/title>/), h1: get(s, /<h1[^>]*>([\s\S]*?)<\/h1>/), d: get(s, /name="description" content="([^"]*)"/), dBrut: (s.match(/name="description" content="([^"]*)"/) || ['', ''])[1], canon: /<link rel="canonical"/.test(s), hreflang: /hreflang="x-default"/.test(s), og: /property="og:title"/.test(s), ogImg: /property="og:image"/.test(s), ld: /application\/ld\+json/.test(s) });
}
const idx = [...lus].filter(([, x]) => !x.noindex);
const bloquants = [], avis = [];
/* titres en double parmi les pages indexables */
const parTitre = new Map(); for (const [p, x] of idx) (parTitre.get(x.t) || parTitre.set(x.t, []).get(x.t)).push(p);
for (const [t, l] of parTitre) if (l.length > 1) bloquants.push('titre en double « ' + t + ' » : ' + l.join(', '));
for (const [p, x] of idx) {
  if (!x.canon) bloquants.push(p + ' : sans canonique'); if (!x.hreflang) bloquants.push(p + ' : sans hreflang'); if (!x.og) bloquants.push(p + ' : sans og:title'); if (!x.ogImg) bloquants.push(p + ' : sans og:image'); if (!x.ld) bloquants.push(p + ' : sans données structurées');
  if (!x.h1) bloquants.push(p + ' : sans h1'); if (!x.d) bloquants.push(p + ' : sans description');
  if (/\s$/.test(x.dBrut)) bloquants.push(p + ' : description finissant par une espace');
  if (x.t.length > 65) avis.push(p + ' : titre de ' + x.t.length + ' signes « ' + x.t + ' »');
  if (x.d.length > 160) avis.push(p + ' : description de ' + x.d.length + ' signes'); else if (x.d && x.d.length < 60) avis.push(p + ' : description de ' + x.d.length + ' signes seulement');
}
/* le nom de l’élément (inventaire) dans le titre, le h1 et la description de sa page */
let elements = 0, sansNomDesc = 0;
try {
  const inv = JSON.parse(execFileSync(process.execPath, [path.join(__dirname, 'couverture-pages.cjs'), '--json'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] }));
  for (const f of inv.familles) for (const it of f.items) {
    if (!it.page || !lus.has(it.page) || lus.get(it.page).noindex) continue;
    const x = lus.get(it.page); elements++;
    /* le nom tel que la page l’écrit (son h1) : l’inventaire préfixe parfois la marque ou garde un identifiant */
    const coeur = coeurDe(x.h1);
    if (!coeur) continue;
    if (!norm(x.t).includes(coeur)) bloquants.push(it.page + ' : le nom « ' + x.h1 + ' » n’est pas dans le titre « ' + x.t + ' »');
    if (!norm(x.d).includes(coeur)) { sansNomDesc++; avis.push(it.page + ' : le nom « ' + x.h1 + ' » n’est pas dans la description'); }
  }
} catch (e) { avis.push('inventaire des éléments non lu (' + (e.message || e) + ')'); }
console.log('Référencement : ' + lus.size + ' pages françaises, ' + idx.length + ' proposées aux moteurs, ' + (lus.size - idx.length) + ' en noindex ; ' + elements + ' pages d’éléments contrôlées (nom dans le titre et le h1), ' + sansNomDesc + ' description(s) sans le nom ; ' + bloquants.length + ' défaut(s) bloquant(s), ' + avis.length + ' avertissement(s).');
for (const b of bloquants) console.log('  ✗ ' + b);
if (TOUT) for (const a of avis) console.log('  · ' + a);
process.exitCode = bloquants.length ? 1 : 0;
