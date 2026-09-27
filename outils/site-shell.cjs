'use strict';
// Source commune du menu et du pied de page, appliquée à toutes les pages par sync-site.cjs.
// Les catégories viennent d'outils/acquisitions.json ; aucune n'est déduite d'une image.
// Une catégorie « pending » (à confirmer, vide) n'est pas listée une à une : un seul lien
// mène au hub « Tout ce qui s'achète », qui les présente avec leur statut.
const fs = require('node:fs'), path = require('node:path');
const acquisition = JSON.parse(fs.readFileSync(path.join(__dirname, 'acquisitions.json'), 'utf8')).categories;
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const world = [['lieux.html', 'Lieux'], ['personnages.html', 'Personnages'], ['demeures.html', 'Demeures'], ['planques.html', 'Planques'], ['entreprises.html', 'Entreprises'], ['collectibles.html', 'Collectibles']];
// Menu « S’équiper » : seules les catégories marquées menu:true dans acquisitions.json (pas de doublon avec Véhicules,
// Planques ou Armurerie, pas de catégorie vide). Le hub « Tout ce qui s’achète » reste dans la barre (Achats) et le pied de page.
const shopping = acquisition.filter(c => c.menu && !c.alias).sort((a, b) => (a.menuOrder || 99) - (b.menuOrder || 99)).map(c => [c.route.slice(1), c.label]);
const footShopping = [['achats.html', 'Tout ce qui s’achète'], ...shopping, ['armes.html#munitions', 'Munitions et équipement'], ['logements.html', 'Logements et appartements']];
const info = [['a-propos.html', 'À propos'], ['contact.html', 'Contact'], ['medias.html', 'Médias et crédits'], ['mentions-legales.html', 'Mentions et confidentialité']];
const top = [['calculateurs.html', 'Calculateur'], ['tuto.html', 'Tuto'], ['carte.html', 'Carte'], ['vehicules.html', 'Véhicules'], ['armes.html', 'Armurerie'], ['achats.html', 'Achats'], ['progression.html', 'Progression']];

function link([url, label], prefix = '', current = '') {
  const here = url.split('#')[0] === current;
  return '<a href="' + prefix + url + '"' + (here ? ' class="here" aria-current="page"' : '') + '>' + esc(label) + '</a>';
}
function currentOf(file) {
  if (file.includes('/')) return file.split('/')[0] + '.html';
  return ({ 'comparateur.html': 'vehicules.html', 'classement-vehicules.html': 'vehicules.html', 'vehicules-rares.html': 'vehicules.html' })[file] || file;
}
function nav(file, prefix) {
  const current = currentOf(file);
  const groups = [['Le monde', world], ['S’équiper', shopping], ['Le site', info]];
  return '<ul>' + top.map(x => '<li>' + link(x, prefix, current) + '</li>').join('')
    + '<li><details class="nav-more"><summary>Explorer</summary><div class="nav-more-panel">'
    + groups.map(([label, list]) => '<div><strong>' + esc(label) + '</strong>' + list.map(x => link(x, prefix, current)).join('') + '</div>').join('')
    + '</div></details></li></ul>';
}
function footer(existing, prefix) {
  const art = existing.match(/<svg class="foot-art"[\s\S]*?<\/svg>/)?.[0] || '';
  const groups = [
    ['Explorer', [['carte.html', 'Carte'], ['vehicules.html', 'Véhicules'], ['armes.html', 'Armurerie'], ...world]],
    ['S’équiper', footShopping],
    ['Outils et aide', [['calculateurs.html', 'Calculateur'], ['tuto.html', 'Tuto'], ['progression.html', 'Progression'], ...info]]
  ];
  return '<footer>' + art + '<div class="shell"><div class="foot-top"><div class="foot-brand">'
    + '<a class="brand" href="' + prefix + 'index.html">Leonida<span>kit</span></a>'
    + '<p>Une carte, des fiches, un calculateur. Prépare tes choix dans Leonida avec des sources claires et tes propres chiffres.</p>'
    + '<a class="foot-feature" href="' + prefix + 'calculateurs.html">Trouver mon calcul ↗</a></div><div class="foot-cols">'
    + groups.map(([label, list]) => '<div><h2>' + esc(label) + '</h2><nav aria-label="' + esc(label) + ' en pied de page">' + list.map(x => link(x, prefix)).join('') + '</nav></div>').join('')
    + '</div></div><p class="legal">Leonidakit est un projet indépendant réalisé par un joueur, sans affiliation, approbation ni sponsoring de Rockstar Games ou Take-Two Interactive. Grand Theft Auto est une marque de Take-Two Interactive. Les crédits de chaque média restent consultables.</p></div></footer>';
}
/* v7.40 (lot 3) : puces de navigation entre les sections documentées, identiques sur toutes les pages de section
   (hubs du monde, catégories d'acquisition, Véhicules, Armurerie, Collectibles, Progression, Achats). Une seule liste,
   un seul ordre, la page courante retirée de sa propre liste ; posées en bas de la page par sync-site.cjs. */
const chipList = [['achats.html', 'Tout ce qui s’achète'], ['vehicules.html', 'Véhicules'], ['armes.html', 'Armurerie'],
  ...acquisition.filter(c => !c.alias).map(c => [c.route.slice(1), c.label]),
  ['progression.html#acquisitions', 'Ma progression'], ['tuto.html#sources', 'Comprendre les statuts']];
const sectionPages = new Set([...world.map(x => x[0]), ...acquisition.map(c => c.route.slice(1).split('#')[0]), 'vehicules.html', 'armes.html', 'achats.html', 'progression.html']);
function chips(file) {
  if (!sectionPages.has(file)) return '';
  const alias = acquisition.find(c => c.alias && c.route.slice(1) === file);
  const currentFile = alias ? alias.alias.slice(1).split('#')[0] : file;
  const items = chipList.filter(([url]) => url.split('#')[0] !== currentFile && url.split('#')[0] !== file);
  return '<nav class="lk-chips shell" aria-label="Explorer les contenus documentés">' + items.map(([url, label]) => '<a href="' + url + '">' + esc(label) + '</a>').join('') + '</nav>';
}
/* Pose (ou remplace) les puces en bas de <main>, avant le bandeau de fin s'il existe. Idempotent. */
function placeChips(html, file) {
  html = html.replace(/<nav class="lk-chips shell"[^>]*>[\s\S]*?<\/nav>\n?/g, '');
  const block = chips(file);
  if (!block) return html;
  if (/<section class="lk-outro"/.test(html)) return html.replace(/<section class="lk-outro"/, block + '\n<section class="lk-outro"');
  return html.replace(/<\/main>/, block + '\n</main>');
}
module.exports = { nav, footer, top, world, shopping, info, chips, placeChips, chipList, sectionPages };
