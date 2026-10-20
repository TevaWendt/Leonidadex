#!/usr/bin/env node
'use strict';
/* Archives des pages en noindex (Téva, 18 octobre, 23 h 58 : « une fois que tout ça est finalisé, tu récupères chaque page
   noindex que tu mettras dans plusieurs dossiers zip si tout le contenu est trop gros, pour que plus tard, quand on aura les
   informations, […] remplis-les avec les informations Rockstar […] devenues officielles, puis enlève les balises noindex »).
   Usage : node outils/livraison/archive-noindex.cjs [dossier de sortie]
   - parcourt toutes les pages du site (six langues) et retient celles qui portent « noindex » parce qu’il leur manque des
     informations : pages par élément, fiches de véhicules et d’armes sans contenu propre, pages modèles aux exemples fictifs,
     pages sans rien de publié ; les redirections, la page introuvable et la page hors ligne sont des pages techniques, laissées
     de côté (et comptées) ;
   - écrit A-COMPLETER.md (une ligne par page française : ce qui lui manque, d’où viennent ses données, les langues) et
     a-completer.tsv (une ligne par fichier), puis les archives (parties de moins de 28 Mio), chaque partie avec les deux listes. */
const fs = require('node:fs'), path = require('node:path'), { execFileSync } = require('node:child_process');
const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.resolve(process.argv[2] || path.join(ROOT, '..', 'livraisons'));
const LANGS = ['en', 'es', 'it', 'de', 'pt'];
const INV = require('../couverture-pages.cjs');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const SAUF = new Set(['outils', 'node_modules', '.git', 'api', 'photos', 'img', 'leo']);
function pages(dir = '') {
  const out = [];
  for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const p = dir ? dir + '/' + e.name : e.name;
    if (e.isDirectory()) { if (!dir && SAUF.has(e.name)) continue; if (e.name.startsWith('.')) continue; out.push(...pages(p)); }
    else if (e.name.endsWith('.html')) out.push(p);
  }
  return out;
}
const NOINDEX = /<meta name="robots" content="noindex/;
const tech = (f, h) => /http-equiv="refresh"/.test(h) ? 'redirection' : /^(404|hors-ligne)\.html$/.test(f) ? 'page technique' : /^google[0-9a-f]+\.html$/.test(f) ? 'vérification Google' : null;
/* ce qui manque, par famille de l’inventaire */
const itemParPage = new Map();
for (const f of Object.values(INV.FAMILLES)) for (const it of f.items || []) { const p = it.cible || it.page; if (p) itemParPage.set(p, [f, it]); }
function manqueLieu(it) {
  const m = [];
  if (/^Bâtiment L\d+$/.test(it.nom)) m.push('nom en jeu (bâtiment repéré sans nom)');
  if (/existence douteuse/.test(it.note)) m.push('confirmation que le lieu existe dans le jeu (gtadb : existence douteuse, fictif ou annulé)');
  if (/position non confirmée/.test(it.note)) m.push('position confirmée');
  if (!it.visuel) m.push('capture officielle');
  if (/nom en jeu inconnu/.test(it.note) && !m.length) m.push('nom en jeu');
  return m;
}
function manque(fr, h) {
  /* fiches de véhicules et d’armes : en noindex tant qu’elles n’ont ni visuel officiel, ni nom publié par Rockstar, ni édition,
     ni prix publié (outils/gen.js et outils/gen-armes.cjs, fonction indexable) */
  if (/^vehicules\//.test(fr)) return { famille: 'Véhicules', manque: ['un visuel officiel, ou le nom publié par Rockstar, une édition ou un prix publié'], source: 'vehicules-data.js (outils/gen.js, fonction indexable)', note: '' };
  if (/^armes\//.test(fr)) return { famille: 'Armes', manque: ['un visuel officiel, ou le nom publié par Rockstar, une édition ou un prix publié'], source: 'armes-data.js (outils/gen-armes.cjs, fonction indexable)', note: '' };
  const hit = itemParPage.get(fr);
  if (hit) {
    const [f, it] = hit;
    switch (f.id) {
      case 'lieux-carte': return { famille: 'Lieux de la carte', manque: manqueLieu(it), source: 'outils/import-gtadb.cjs (base gtadb), outils/data/carte-gtadb-source.json', note: it.note };
      case 'quartiers-comtes': return { famille: 'Régions, villes, quartiers et comtés', manque: ['au moins un lieu rattaché'], source: 'outils/data/carte-gtadb-source.json', note: it.note };
      case 'marques': return { famille: 'Marques', manque: ['un véhicule de GTA VI de cette marque'], source: 'vehicules-data.js (outils/gen.js)', note: it.note };
      case 'munitions': return { famille: 'Types de munitions', manque: ['une donnée de GTA VI sur ce type (nom officiel, prix, capacité)'], source: 'outils/catalogues/ (armes), outils/gen-armes.cjs', note: it.note };
      case 'options-perso-vehicules': case 'options-perso-armes': return { famille: f.label || f.id, manque: ['la valeur dans GTA VI (le prix affiché est un repère de GTA V)', 'un visuel officiel'], source: 'outils/catalogues/ (personnalisation)', note: it.note };
      case 'visuels': return { famille: 'Visuels officiels', manque: ['une description de ce que montre le visuel'], source: 'outils/medias-officiels.json (alt)', note: it.note };
      default: return { famille: f.label || f.id, manque: ['des informations officielles'], source: f.source || '', note: it.note };
    }
  }
  if (/^vehicules\//.test(fr)) return { famille: 'Véhicules', manque: ['un visuel officiel, ou le nom publié par Rockstar, une édition ou un prix publié'], source: 'vehicules-data.js, outils/gen.js (indexable)', note: '' };
  if (/^armes\//.test(fr)) return { famille: 'Armes', manque: ['un visuel officiel, ou le nom publié par Rockstar, une édition ou un prix publié'], source: 'outils/gen-armes.cjs (indexable)', note: '' };
  if (/^(missions|trophees|codes-de-triche)\//.test(fr) || /exemples? fictifs?|modèle/i.test((h.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '')) return { famille: 'Pages modèles', manque: ['les données officielles (la page montre des exemples fictifs en attendant)'], source: 'outils/gen-modele.cjs', note: '' };
  return { famille: 'Autres pages', manque: ['les informations officielles (rien de publié par Rockstar)'], source: '', note: '' };
}
const toutes = pages();
const fr = new Map(), techniques = new Map();
for (const f of toutes) {
  const h = fs.readFileSync(path.join(ROOT, f), 'utf8');
  if (!NOINDEX.test(h)) continue;
  const lang = LANGS.includes(f.split('/')[0]) ? f.split('/')[0] : 'fr';
  const base = lang === 'fr' ? f : f.slice(3);
  const t = tech(base, h);
  if (t) { techniques.set(t, (techniques.get(t) || 0) + 1); continue; }
  if (!fr.has(base)) fr.set(base, { page: base, langues: [], fichiers: [], ...manque(base, lang === 'fr' ? h : (fs.existsSync(path.join(ROOT, base)) ? read(base) : h)) });
  const e = fr.get(base); e.langues.push(lang); e.fichiers.push(f);
}
/* langues dans l’ordre du site (fr, en, es, it, de, pt), fichiers dans le même ordre */
for (const e of fr.values()) { const ordre = ['fr', ...LANGS], z = e.langues.map((l, i) => [l, e.fichiers[i]]).sort((x, y) => ordre.indexOf(x[0]) - ordre.indexOf(y[0])); e.langues = z.map(x => x[0]); e.fichiers = z.map(x => x[1]);
}
const lignes = [...fr.values()].sort((a, b) => a.famille.localeCompare(b.famille, 'fr') || a.page.localeCompare(b.page, 'fr'));
const parFamille = lignes.reduce((m, l) => { (m[l.famille] = m[l.famille] || []).push(l); return m; }, {});
const fichiers = lignes.flatMap(l => l.fichiers);
const date = new Date().toISOString().slice(0, 10);
let md = '# Pages en noindex à compléter (' + date + ')\n\n'
  + lignes.length + ' pages (' + fichiers.length + ' fichiers avec leurs versions en anglais, espagnol, italien, allemand et portugais) sont en noindex,follow parce qu’il leur manque des informations officielles. Quand Rockstar les publie : compléter la donnée source indiquée, régénérer (`node outils/regenerer.cjs`), et la page passe d’elle-même en indexable (le seuil est dans le générateur) ; aucune page n’est à modifier à la main.\n\n'
  + 'Laissées de côté (pages techniques, noindex voulu pour toujours) : ' + ([...techniques].map(([k, n]) => n + ' ' + (n > 1 ? ({ 'page technique': 'pages techniques', 'redirection': 'redirections', 'vérification Google': 'vérifications Google' })[k] || k : k)).join(', ') || 'aucune') + ' : pages introuvables, pages hors ligne et redirections des six langues.\n\n'
  + '| Famille | Pages | Ce qui manque le plus souvent |\n|---|---|---|\n'
  + Object.entries(parFamille).map(([fam, l]) => { const c = {}; for (const x of l) for (const m of x.manque) c[m] = (c[m] || 0) + 1; const top = Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([m, n]) => m + ' (' + n + ')').join(' ; '); return '| ' + fam + ' | ' + l.length + ' | ' + top + ' |'; }).join('\n') + '\n';
for (const [fam, l] of Object.entries(parFamille)) {
  md += '\n## ' + fam + ' (' + l.length + ')\n\nDonnées : ' + (l[0].source || '—') + '\n\n| Page | Ce qui manque | Langues |\n|---|---|---|\n';
  md += l.map(x => '| ' + x.page + ' | ' + x.manque.join(' ; ') + ' | ' + x.langues.join(' ') + ' |').join('\n') + '\n';
}
const tsv = 'fichier\tpage française\tlangue\tfamille\tce qui manque\n' + lignes.flatMap(l => l.fichiers.map((f, i) => [f, l.page, l.langues[i], l.famille, l.manque.join(' ; ')].join('\t'))).join('\n') + '\n';
fs.mkdirSync(OUT, { recursive: true });
const tmp = fs.mkdtempSync(path.join(OUT, '.noindex-'));
fs.writeFileSync(path.join(tmp, 'A-COMPLETER.md'), md); fs.writeFileSync(path.join(tmp, 'a-completer.tsv'), tsv);
fs.writeFileSync(path.join(tmp, 'liste.txt'), fichiers.join('\n') + '\n');
console.log(lignes.length + ' pages en noindex (' + fichiers.length + ' fichiers) ; techniques laissées de côté : ' + JSON.stringify(Object.fromEntries(techniques)));
for (const [fam, l] of Object.entries(parFamille)) console.log('  ' + fam + ' : ' + l.length);
/* archives : parties de moins de 28 Mio, chacune avec les deux listes */
const LIMIT = 28 * 1024 * 1024, prefix = 'Leonidakit-noindex-a-completer-' + date;
const zipper = (nom, fl) => { const z = path.join(OUT, nom); if (fs.existsSync(z)) fs.unlinkSync(z); execFileSync('zip', ['-q', '-9', '-X', z, '-@'], { cwd: ROOT, input: fl.join('\n') }); execFileSync('zip', ['-q', '-j', z, path.join(tmp, 'A-COMPLETER.md'), path.join(tmp, 'a-completer.tsv')]); return fs.statSync(z).size; };
let n = 1, parts;
for (;;) {
  const taille = f => fs.statSync(path.join(ROOT, f)).size, total = fichiers.reduce((s, f) => s + taille(f), 0), but = total / n + 1;
  parts = []; let cur = [], acc = 0;
  for (const f of fichiers) { if (cur.length && acc + taille(f) > but && parts.length < n - 1) { parts.push(cur); cur = []; acc = 0; } cur.push(f); acc += taille(f); }
  if (cur.length) parts.push(cur);
  const tailles = parts.map((fl, i) => zipper('_essai-' + i + '.zip', fl));
  parts.forEach((_, i) => fs.unlinkSync(path.join(OUT, '_essai-' + i + '.zip')));
  if (tailles.every(t => t < LIMIT) || n >= 40) break;
  n++;
}
const noms = parts.map((fl, i) => { const nom = prefix + (parts.length === 1 ? '.zip' : '-' + (i + 1) + '-sur-' + parts.length + '.zip'); const t = zipper(nom, fl); console.log(nom + ' : ' + fl.length + ' fichiers, ' + (t / 1048576).toFixed(1) + ' Mio'); return nom; });
fs.copyFileSync(path.join(tmp, 'A-COMPLETER.md'), path.join(OUT, prefix + '-A-COMPLETER.md'));
fs.rmSync(tmp, { recursive: true, force: true });
console.log('Écrit dans ' + OUT + ' : ' + noms.length + ' archive(s) et ' + prefix + '-A-COMPLETER.md');
