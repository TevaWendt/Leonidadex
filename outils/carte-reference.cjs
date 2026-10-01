'use strict';
/* v7.55 (lot 2, VIS-02) : référence cartographique commune.
   La source unique du fond de Leonida est le dessin inline de carte.html (<svg class="map-bg">, 5200 × 6000 : mer,
   terres, marais, zones urbaines, plages, routes, tracés supposés, limites de comtés, noms). Ce module en dérive un
   fichier image autonome, img/leonida-carte.svg, sans la grille ni la légende (calques d'outil de la carte interactive),
   que les localisateurs des hubs (armes.html #carte, vehicules.html #carte) et des fiches posent sous leurs repères,
   aux mêmes coordonnées que la carte interactive. La silhouette des vignettes (outils/carte-vignette.cjs) vient du même
   calque « TERRES ». Rien n'est dessiné ici : si carte.html change, régénérer (gen.js, gen-armes.cjs, gen-armurerie.cjs,
   sync-site.cjs appellent write()) et le fichier suit. Le fond reste ce qu'il est : une reconstruction communautaire
   provisoire d'après les supports officiels, pas une carte publiée par Rockstar. */
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const W = 5200, H = 6000, FILE = 'img/leonida-carte.svg';
const DROP = ['lyr-grid', 'lyr-key'];
const TITLE = 'Carte de Leonida (fond communautaire, non officiel)';
const DESC = 'Fond tracé d’après les supports officiels de GTA VI ; reconstruction provisoire, pas une carte publiée par Rockstar. Même dessin que la carte interactive du site.';

/* Le <svg class="map-bg"> de carte.html, tel quel. */
function source() {
  const html = fs.readFileSync(path.join(root, 'carte.html'), 'utf8');
  const m = html.match(/<svg class="map-bg"[\s\S]*?<\/svg>/);
  if (!m) throw Error('Fond <svg class="map-bg"> introuvable dans carte.html');
  return m[0];
}
/* Retire chaque groupe <g class="<name>"…>…</g>, groupes imbriqués compris (la légende en contient). */
function dropLayer(svg, name) {
  const open = new RegExp('<g class="' + name + '"[^>]*>', 'g'); let m, out = svg;
  while ((m = open.exec(out))) {
    let depth = 1, i = m.index + m[0].length; const tag = /<g\b[^>]*>|<\/g>/g; tag.lastIndex = i; let t;
    while (depth && (t = tag.exec(out))) { depth += t[0] === '</g>' ? -1 : 1; i = tag.lastIndex; }
    if (depth) throw Error('Calque ' + name + ' mal fermé dans carte.html');
    const start = out.lastIndexOf('\n', m.index); out = out.slice(0, start >= 0 ? start : m.index) + out.slice(i); open.lastIndex = 0;
  }
  return out;
}
/* Fichier autonome : xmlns, titre et description accessibles, calques d'outil retirés, indentation du gabarit effacée. */
function build() {
  let svg = source();
  for (const n of DROP) svg = dropLayer(svg, n);
  svg = svg.replace(/<!--[\s\S]*?-->/g, '').replace(/\n[ \t]+/g, '\n').replace(/\n{2,}/g, '\n');
  svg = svg.replace(/^<svg class="map-bg" viewBox="0 0 5200 6000" xmlns="http:\/\/www\.w3\.org\/2000\/svg" aria-label="[^"]*">/,
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" role="img" aria-labelledby="lk-carte-t lk-carte-d">\n<title id="lk-carte-t">' + TITLE + '</title>\n<desc id="lk-carte-d">' + DESC + '</desc>');
  if (!/^<svg xmlns=/.test(svg)) throw Error('En-tête du fond de carte inattendu dans carte.html');
  for (const n of DROP) if (svg.includes('class="' + n + '"')) throw Error('Calque ' + n + ' encore présent');
  return svg + '\n';
}
/* Écrit img/leonida-carte.svg si son contenu change ; renvoie le chemin. Une seule construction par processus. */
let built = null, hashed = null;
function write() {
  const file = path.join(root, FILE), body = built || (built = build());
  if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== body) { fs.writeFileSync(file, body); hashed = null; }
  return FILE;
}
function hash() { write(); return hashed || (hashed = crypto.createHash('sha256').update(fs.readFileSync(path.join(root, FILE))).digest('hex').slice(0, 12)); }
/* Adresse versionnée (préfixe « ../ » depuis une fiche). */
function href(prefix) { return (prefix || '') + FILE + '?v=' + hash(); }
/* Fond d'un localisateur : l'image entière (chargée à l'approche de l'écran, mise en cache), posée sous le SVG des
   repères dans la même boîte 5200 × 6000 (object-fit:contain d'un côté, viewBox de l'autre : même géométrie). */
function image(prefix) {
  return '<img class="lk-loc-base" src="' + href(prefix) + '" width="' + W + '" height="' + H + '" alt="" loading="lazy" decoding="async">';
}
module.exports = { W, H, FILE, DROP, TITLE, DESC, source, build, write, hash, href, image };
if (require.main === module) { const f = write(); console.log('Référence cartographique : ' + f + ' (' + Math.round(fs.statSync(path.join(root, f)).size / 1024) + ' Ko, v=' + hash() + ')'); }
