'use strict';
/* v7.94 : les feuilles de style et les scripts écrits à la main vivent dans outils/sources/ (avec leurs commentaires, qui
   documentent chaque bloc). Ce module écrit à la racine la copie servie au visiteur, sans commentaire ni ligne vide : la même
   page charge un tiers de CSS en moins (style.css : 59 → 42 Kio compressés) avant son premier affichage. Appelé par
   outils/sync-site.cjs avant la pose des empreintes ?v=. Une modification se fait dans outils/sources/, jamais à la racine.
   CSS : les commentaires sont retirés hors des chaînes et des url() ; JavaScript : par les positions que donne acorn
   (jamais une expression régulière, qui casserait un « /* » dans une chaîne). */
const fs = require('node:fs'), path = require('node:path');
const ROOT = path.resolve(__dirname, '..'), SRC = path.join(__dirname, 'sources');
function stripCss(s) {
  let out = '', i = 0, q = null;
  while (i < s.length) {
    const c = s[i];
    if (q) { out += c; if (c === '\\') { out += s[i + 1] || ''; i += 2; continue; } if (c === q) q = null; i++; continue; }
    if (c === '"' || c === "'") { q = c; out += c; i++; continue; }
    if (c === '/' && s[i + 1] === '*') { const e = s.indexOf('*/', i + 2); if (e < 0) break; i = e + 2; continue; }
    out += c; i++;
  }
  return out.replace(/[ \t]+$/gm, '').replace(/\n{2,}/g, '\n').replace(/^\n+/, '');
}
function stripJs(s, acorn) {
  const ranges = [];
  const opts = { ecmaVersion: 'latest', allowHashBang: true, onComment: (block, text, start, end) => ranges.push([start, end]) };
  try { acorn.parse(s, { ...opts, sourceType: 'script' }); } catch (e) { ranges.length = 0; acorn.parse(s, { ...opts, sourceType: 'module' }); }
  let out = s;
  for (const [a, b] of ranges.sort((x, y) => y[0] - x[0])) out = out.slice(0, a) + out.slice(b);
  return out.replace(/[ \t]+$/gm, '').replace(/\n{2,}/g, '\n').replace(/^\n+/, '');
}
function run(opts = {}) {
  let acorn = null; try { acorn = require('acorn'); } catch (e) { acorn = null; }
  const files = fs.readdirSync(SRC).filter(f => /\.(css|js)$/.test(f)).sort(), done = [];
  for (const f of files) {
    const src = fs.readFileSync(path.join(SRC, f), 'utf8');
    let out;
    if (f.endsWith('.css')) out = '/* Généré depuis outils/sources/' + f + ' : modifie la source, pas ce fichier. */\n' + stripCss(src);
    else if (acorn) { try { out = '/* Généré depuis outils/sources/' + f + ' : modifie la source, pas ce fichier. */\n' + stripJs(src, acorn); } catch (e) { throw new Error('outils/sources/' + f + ' : ' + e.message); } }
    else throw new Error('outils/minifier.cjs a besoin d’acorn (NODE_PATH=<dossier>/node_modules) pour ' + f);
    const dest = path.join(ROOT, f);
    if (!fs.existsSync(dest) || fs.readFileSync(dest, 'utf8') !== out) { fs.writeFileSync(dest, out); done.push(f); }
  }
  if (!opts.quiet) console.log('Sources servies : ' + files.length + ' fichiers (CSS et scripts sans commentaire), ' + done.length + ' réécrit(s).');
  return done;
}
if (require.main === module) run();
module.exports = { run, stripCss, stripJs };
