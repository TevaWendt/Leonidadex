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
module.exports = { nav, footer, top, world, shopping, info };
