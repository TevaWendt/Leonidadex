'use strict';
// Source commune du menu et du pied de page, appliquée à toutes les pages par sync-site.cjs.
// Les catégories viennent d'outils/acquisitions.json ; aucune n'est déduite d'une image.
// Une catégorie « pending » (à confirmer, vide) n'est pas listée une à une : un seul lien
// mène au hub « Tout ce qui s'achète », qui les présente avec leur statut.
const fs = require('node:fs'), path = require('node:path');
const acquisition = JSON.parse(fs.readFileSync(path.join(__dirname, 'acquisitions.json'), 'utf8')).categories;
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const world = [['lieux.html', 'Lieux'], ['personnages.html', 'Personnages'], ['gangs.html', 'Gangs et factions'] /* v7.65 */, ['demeures.html', 'Demeures'], ['planques.html', 'Planques'], ['entreprises.html', 'Entreprises'], ['animaux.html', 'Animaux'] /* section animaux */, ['collectibles.html', 'Collectibles']];
const play = [['missions.html', 'Missions'] /* section missions */, ['activites.html', 'Activités annexes'] /* section activites */, ['radios.html', 'Radios et musique'] /* section radios */, ['codes-de-triche.html', 'Codes de triche'] /* section codes */, ['trophees.html', 'Trophées et succès'] /* section trophees */];
/* section online : un espace à part, son propre groupe dans « Explorer » et sa colonne au pied de page */
const online = [['online.html', 'L’espace GTA Online'], ['online/annonces.html', 'Les annonces'], ['online/gta-online-actuel.html', 'Le GTA Online actuel']];
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
  /* v7.51 (lot 4) : les carnets de progression (carnets/<id>.html) sont des pages de la Progression. */
  if (file.startsWith('carnets/')) return 'progression.html';
  if (file.includes('/')) return file.split('/')[0] + '.html';
  return ({ 'comparateur.html': 'vehicules.html', 'classement-vehicules.html': 'vehicules.html', 'vehicules-rares.html': 'vehicules.html' })[file] || file;
}
function nav(file, prefix) {
  const current = currentOf(file);
  const groups = [['Le monde', world], ['Jouer', play] /* sections missions, activites, radios, codes, trophees */, ['S’équiper', shopping], ['Le site', info], ['GTA Online', online, 'nav-online'] /* section online */];
  return '<ul>' + top.map(x => '<li>' + link(x, prefix, current) + '</li>').join('')
    + '<li><details class="nav-more"><summary>Explorer</summary><div class="nav-more-panel">'
    + groups.map(([label, list, cls]) => '<div' + (cls ? ' class="' + cls + '"' : '') + '><strong>' + esc(label) + '</strong>' + list.map(x => link(x, prefix, current)).join('') + '</div>').join('')
    + '</div></details></li></ul>';
}
function footer(existing, prefix) {
  const art = existing.match(/<svg class="foot-art"[\s\S]*?<\/svg>/)?.[0] || '';
  const groups = [
    ['Explorer', [['carte.html', 'Carte'], ['vehicules.html', 'Véhicules'], ['armes.html', 'Armurerie'], ...world]],
    ['Jouer', play] /* sections missions, activites, radios, codes, trophees */,
    ['GTA Online', online] /* section online */,
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
  ['progression.html#carnets', 'Mes carnets'], ['tuto.html#sources', 'Comprendre les statuts']];
const sectionPages = new Set([...world.map(x => x[0]), ...play.map(x => x[0]) /* sections missions, activites, radios, codes, trophees */, ...online.map(x => x[0]).filter(f => !f.includes('/')) /* section online : le hub seul */, ...acquisition.map(c => c.route.slice(1).split('#')[0]), 'vehicules.html', 'armes.html', 'achats.html', 'progression.html']);
/* v7.69 : les puces suivent la famille de la page. Les pages du monde (lieux, personnages… animaux, collectibles) proposent
   les autres pages du monde et la carte ; les pages « Jouer » (missions, activités, radios, codes, trophées, GTA Online)
   les autres pages de jeu ; les pages d’achat et la Progression gardent la liste « S’équiper ». Une page de la faune ne
   propose donc plus les catégories d’achat. Même ordre dans chaque famille, page courante retirée. */
const chipSets = {
  monde: [...world, ['carte.html', 'La carte de Leonida'], ['progression.html#carnets', 'Mes carnets'], ['tuto.html#sources', 'Comprendre les statuts']],
  jouer: [...play, ['online.html', 'L’espace GTA Online'], ['progression.html#carnets', 'Mes carnets'], ['tuto.html#sources', 'Comprendre les statuts']],
  equiper: chipList
};
const chipSetOf = file => world.some(([u]) => u === file) ? 'monde' : (play.some(([u]) => u === file) || file === 'online.html') ? 'jouer' : 'equiper';
function chips(file) {
  if (!sectionPages.has(file)) return '';
  const alias = acquisition.find(c => c.alias && c.route.slice(1) === file);
  const currentFile = alias ? alias.alias.slice(1).split('#')[0] : file;
  const items = chipSets[chipSetOf(currentFile)].filter(([url]) => url.split('#')[0] !== currentFile && url.split('#')[0] !== file);
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
/* v7.41 (lot 4) : encart calculateur, un seul composant pour toutes les pages de section (hubs du monde, Véhicules,
   Armurerie, Collectibles, Carte, Achats, catégories d'acquisition). Même position partout : en bas de page, juste avant
   les puces « Explorer les contenus documentés ». Question contextuelle par page, bouton vers le bon outil du
   calculateur (calculateurs.html?tool=…&type=…&from=…#atelier). Posé par sync-site.cjs (placeEntry), idempotent.
   Mouvement : apparition générique lk-reveal (common.js) + ligne d'accent qui se dessine (calculator-entry.css). */
const ENTRY = {
  'lieux.html': { q: 'Combien de temps de jeu pour t’installer dans une région ?', d: 'Une maison, un commerce, un garage : écris le prix que tu imagines, le calculateur te dit le temps qu’il faut.', tool: 'purchase', type: 'place', cta: 'Faire le calcul' },
  'personnages.html': { q: 'Ton premier gros achat, mission par mission ?', d: 'Le business plan pose ses propres questions et te dit quoi faire en premier, avec un plan de secours.', tool: 'plan', cta: 'Ouvrir mon business plan' },
  'demeures.html': { q: 'Combien de temps pour t’offrir une maison comme celle de Jason ?', d: 'Aucun prix n’est publié : écris celui que tu imagines, ton argent et ce que tu gagnes par partie.', tool: 'purchase', type: 'property', cta: 'Faire le calcul' },
  'planques.html': { q: 'Combien de temps pour t’offrir une planque ou un garage ?', d: 'Écris un prix et ton rythme de jeu : tu obtiens le temps qu’il faut, et quand ce serait bon.', tool: 'purchase', type: 'hideout', cta: 'Faire le calcul' },
  'gangs.html': { q: 'Piller un repaire de gang, ça rapporte plus qu’une mission ?', d: 'Aucun butin n’est publié. Écris ce qu’un coup rapporterait, sa durée et ta part : le calculateur compare tes activités à l’heure de jeu.', tool: 'activities', cta: 'Comparer mes activités' } /* v7.65 */,
  'entreprises.html': { q: 'Une entreprise comme celle de Boobie, ça vaudrait le coup ?', d: 'Ce que ça coûte, ce que ça rapporte : le calculateur te dit quand ce serait remboursé, et si ça vaut mieux que de jouer sans.', tool: 'roi', type: 'business', cta: 'Est-ce que ça vaut le coup ?' },
  'vehicules.html': { q: 'Quel véhicule acheter en premier ?', d: 'Mets tes envies dans l’ordre : le calculateur classe tes achats selon ton budget et ton temps de jeu.', tool: 'order', type: 'vehicle', cta: 'Classer mes achats' },
  'armes.html': { q: 'Quel budget pour ton arsenal ?', d: 'Armes, munitions, équipement : écris ce que tu veux et ce que tu gagnes, tu vois ce qui rentre dans ton budget.', tool: 'budget', type: 'weapon', cta: 'Faire mon budget' },
  'collectibles.html': { q: 'Combien de temps pour finir ta collection ?', d: 'Écris ton temps de jeu par partie : le calculateur te dit en combien de sessions tu y arrives.', tool: 'session', cta: 'Compter mes parties' },
  'carte.html': { q: 'Combien de temps de jeu pour t’offrir ce que tu as repéré ?', d: 'Écris ce que tu as, ce que tu veux et ce que tu gagnes : réponse en une phrase, puis les étapes.', tool: 'goal', cta: 'Faire le calcul' },
  'achats.html': { q: 'Quoi acheter d’abord ?', d: 'Le calculateur classe tes achats et te dit combien de temps de jeu chacun demande.', tool: 'order', cta: 'Classer mes achats' },
  'bateaux.html': { q: 'Combien de temps pour t’offrir un bateau ?', d: 'Aucun prix n’est publié : écris celui que tu imagines, le calculateur fait le reste.', tool: 'purchase', type: 'vehicle', cta: 'Faire le calcul' },
  'style.html': { q: 'Quel budget pour tes tenues ?', d: 'Écris ce que tu veux acheter et ce que tu gagnes : tu vois ce qui rentre dans ton budget.', tool: 'budget', type: 'style', cta: 'Faire mon budget' },
  'personnalisations.html': { q: 'Personnaliser ton véhicule, ça vaut le coup ?', d: 'Écris ce que ça coûterait et ce que ça t’apporterait : le calculateur te répond en une phrase.', tool: 'roi', type: 'customization', cta: 'Est-ce que ça vaut le coup ?' },
  'nourriture.html': { q: 'Quel budget pour manger et récupérer ?', d: 'Écris ce que tu dépenses par partie : tu vois ce que ça pèse sur ton objectif.', tool: 'budget', type: 'consumable', cta: 'Faire mon budget' },
  'logements.html': { q: 'Combien de temps pour t’offrir un logement ?', d: 'Aucun prix n’est publié : écris celui que tu imagines, ton argent et ce que tu gagnes par partie.', tool: 'purchase', type: 'housing', cta: 'Faire le calcul' },
  'missions.html': { q: 'Une mission, ça rapporte combien à l’heure ?', d: 'Les gains des missions arrivent avec le jeu. Écris ce qu’une mission rapporterait, sa durée et ta part : le calculateur la compare à tes autres activités, à l’heure de jeu.', tool: 'activities', cta: 'Comparer mes activités' }, /* section missions */
  'activites.html': { q: 'Une activité annexe, ça rapporte plus qu’une mission ?', d: 'Les gains arrivent avec le jeu. Écris ce qu’un braquage, une course ou une revente rapporterait, sa durée et ta part : le calculateur compare tes activités à l’heure de jeu.', tool: 'activities', cta: 'Comparer mes activités' }, /* section activites */
  'animaux.html': { q: 'La chasse, ça rapporte plus qu’une mission ?', d: 'Rockstar dit que la chasse rapporte, sans montant. Écris ce qu’une sortie te rapporterait et sa durée : le calculateur la compare à tes autres activités, à l’heure de jeu.', tool: 'activities', cta: 'Comparer mes activités' } /* section animaux */,
  'online.html': { q: 'Une entreprise en ligne, ça vaut le coup ?', d: 'Aucun prix du jeu en ligne de GTA VI n’est publié. Écris ce qu’une entreprise coûterait et ce qu’elle rapporterait : le calculateur te dit en combien de temps elle se rembourse, sans rien mêler à tes chiffres de l’histoire.', tool: 'roi', cta: 'Est-ce que ça vaut le coup ?' } /* section online */
};
const ENTRY_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="5" y="3" width="14" height="18" rx="2"/><rect x="8" y="6" width="8" height="3" rx=".6"/><path d="M8.5 13h1M12 13h1M15.5 13h1M8.5 17h1M12 17h1"/><rect x="15" y="16" width="2" height="2" rx=".5" fill="currentColor" stroke="none"/></svg>';
function entryPages() { return Object.keys(ENTRY); }
/* v7.59 (check ultime, CALC-13) : « Aucun prix n’est publié » n'est plus figé : la phrase est recalculée depuis les données
   du site (outils/donnees-publiees.cjs) pour le type d'achat de la page ; une seule lecture par exécution. */
let _etat = null;
function prixConnus(type) { if (!_etat) _etat = require('./donnees-publiees.cjs').etat(path.resolve(__dirname, '..')); const t = type === 'housing' ? 'property' : type; const n = _etat.prix.parType[t]; return n ? n.connus : 0; }
function entryText(e) {
  if (!/^Aucun prix n’est publié/.test(e.d) || !e.type) return e.d;
  const n = prixConnus(e.type); if (!n) return e.d;
  return n + ' prix publié' + (n > 1 ? 's' : '') + ' sur le site, avec leur source : le calculateur les propose comme référence. Pour les autres, écris le prix que tu imagines, ton argent et ce que tu gagnes par partie.';
}
function entry(file) {
  const e = ENTRY[file]; if (!e) return '';
  const from = file.replace(/\.html$/, '');
  const params = new URLSearchParams({ tool: e.tool }); if (e.type) params.set('type', e.type); params.set('from', from);
  const href = 'calculateurs.html?' + params.toString().replace(/&/g, '&amp;') + '#atelier';
  return '<section class="shell lk-entry-hub" aria-labelledby="lk-entry-hub-t"><div class="lk-entry-card lk-entry-card--hub">'
    + '<span class="lk-entry-hub-ico" aria-hidden="true">' + ENTRY_ICON + '</span>'
    + '<div class="lk-entry-hub-body"><p class="lk-entry-eyebrow">Le calculateur</p><h2 id="lk-entry-hub-t">' + esc(e.q) + '</h2><p>' + esc(entryText(e)) + '</p></div>'
    + '<a class="lk-entry-button" href="' + href + '">' + esc(e.cta) + ' <span aria-hidden="true">↗</span></a></div></section>';
}
/* Pose (ou remplace) l'encart en bas de <main>, avant les puces, sinon avant le bandeau de fin, sinon avant </main> ;
   ajoute la feuille calculator-entry.css si la page ne la charge pas. Idempotent. */
function placeEntry(html, file, prefix = '') {
  html = html.replace(/<section class="shell lk-entry-hub"[^>]*>[\s\S]*?<\/section>\n?/g, '');
  const block = entry(file);
  if (!block) return html;
  if (!/href="(?:\.\.\/|\/)?calculator-entry\.css/.test(html)) html = html.replace(/(<link rel="stylesheet" href="(?:\.\.\/|\/)?style\.css[^>]*>)/, '$1\n<link rel="stylesheet" href="' + prefix + 'calculator-entry.css">');
  if (/<nav class="lk-chips shell"/.test(html)) return html.replace(/<nav class="lk-chips shell"/, block + '\n<nav class="lk-chips shell"');
  if (/<section class="lk-outro"/.test(html)) return html.replace(/<section class="lk-outro"/, block + '\n<section class="lk-outro"');
  return html.replace(/<\/main>/, block + '\n</main>');
}
module.exports = { chipSets, chipSetOf, nav, footer, top, world, play /* sections missions, activites, radios, codes, trophees */, online /* section online */, shopping, info, chips, placeChips, chipList, sectionPages, ENTRY, entry, placeEntry, entryPages };
