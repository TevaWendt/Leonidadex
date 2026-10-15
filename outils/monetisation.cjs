'use strict';
/* v7.88 : kit de revenus en sommeil (outils/monetisation.json). Tant que l’affiliation n’est pas active, chaque fonction
   rend la version d’aujourd’hui (rien sur editions.html, « aucun lien d’affiliation » dans les Mentions) : activer ne
   demande que de remplir le fichier et de régénérer. Un lien affilié reste un simple lien (rel="sponsored nofollow
   noopener", nouvel onglet), marqué « Lien affilié » sur la page : ni script d’un autre site, ni cookie posé par le site. */
const fs = require('node:fs'), path = require('node:path');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function config(root = path.resolve(__dirname, '..')) {
  try { return JSON.parse(fs.readFileSync(path.join(root, 'outils/monetisation.json'), 'utf8')); } catch { return {}; }
}
/* liens utilisables : affiliation active, boutique nommée, adresse https */
function liens(cfg = config()) {
  const a = cfg.affiliation || {};
  if (a.actif !== true) return [];
  return (a.liens || []).filter(l => l && String(l.boutique || '').trim() && /^https:\/\/[^\s"<>]+$/.test(String(l.url || '').trim()));
}
const affiliationActive = (cfg = config()) => liens(cfg).length > 0;
/* bloc de editions.html (vide tant que l’affiliation n’est pas active) ; « Où l’acheter » reste juste après la sortie ; le
   lien s’ouvre dans un nouvel onglet et le dit (data-newtab, title, comme les autres liens du site) ; le nom de la boutique
   n’est pas traduit (translate="no") */
const LEDE_ACHETER = 'Des liens vers des boutiques. Ce sont des liens affiliés : si tu achètes par l’un d’eux, le site touche une petite commission, sans que le prix change. Ils ne décident de rien sur le site : ni de l’ordre des éditions, ni de ce qui est écrit.';
const listeLiens = L => '<ul class="lk-aff-list" role="list">' + L.map(l => '<li><a class="lk-aff-a" href="' + esc(l.url.trim()) + '" target="_blank" rel="sponsored nofollow noopener" data-newtab title="S’ouvre dans un nouvel onglet"><span class="lk-aff-shop" translate="no">' + esc(l.boutique.trim()) + '</span>'
      + (l.edition || l.plateformes ? '<span class="lk-aff-meta">' + [l.edition, l.plateformes].filter(Boolean).map(esc).join(', ') + '</span>' : '')
      + '<span class="lk-aff-tag">Lien affilié</span></a></li>').join('') + '</ul>';
function blocEditions(cfg = config()) {
  const L = liens(cfg); if (!L.length) return '';
  return '<section class="shell ac-sec reveal lk-aff" id="acheter" aria-labelledby="acheter-t"><h2 class="sec-h" id="acheter-t">Où l’acheter</h2>'
    + '<p class="ac-lede">' + LEDE_ACHETER + '</p>' + listeLiens(L) + '</section>';
}
/* assemblage v7.91 : la page Éditions est bâtie par zone() de gen-actus.cjs (sections numérotées de la v7.87.1) ; même
   contenu que blocEditions(), sous la forme d’un élément de zone (null tant que l’affiliation n’est pas active) */
function zoneEditions(cfg = config()) {
  const L = liens(cfg); if (!L.length) return null;
  return { id: 'acheter', k: 'Liens affiliés', t: 'Où l’acheter', icon: 'achats', nav: 'Où l’acheter', fam: 'equipements', cls: 'lk-aff', lede: LEDE_ACHETER, body: listeLiens(L) };
}
/* phrase des Mentions (section Éditeur) */
function mentionsEditeur(cfg = config()) {
  return affiliationActive(cfg)
    ? 'Le site ne diffuse aucune publicité et ne vend rien. Certains liens vers des boutiques, sur la page Éditions, sont des liens affiliés, signalés comme tels : le site touche une commission si tu achètes par eux, sans que le prix change. Ces liens ne passent par aucun script d’un autre site et le site ne dépose aucun cookie ; la boutique, elle, applique ses propres règles une fois que tu es chez elle.'
    : 'Le site ne diffuse aucune publicité, ne contient aucun lien d’affiliation et ne vend rien.';
}
/* v7.88 : les deux autres phrases des Mentions qui disent « sans activité commerciale » (« En bref » et l’encadré « En
   clair » de la section Éditeur) : vraies tant que rien ne rapporte, réécrites à l’activation. */
function mentionsProjet(cfg = config()) {
  return affiliationActive(cfg)
    ? 'Le site est édité par un particulier et hébergé par Vercel. Il ne vend rien ; les liens affiliés de la page Éditions, signalés comme tels, lui rapportent une petite commission.'
    : 'Le site est édité par un particulier, sans activité commerciale, et hébergé par Vercel.';
}
function mentionsClair(cfg = config()) {
  return affiliationActive(cfg)
    ? 'Leonidakit est publié par un particulier ; son identité est connue de l’hébergeur. Les liens affiliés de la page Éditions lui rapportent une petite commission.'
    : 'Leonidakit est publié par un particulier, sans but commercial ; son identité est connue de l’hébergeur.';
}
module.exports = { config, liens, affiliationActive, blocEditions, zoneEditions, mentionsEditeur, mentionsProjet, mentionsClair };
