'use strict';
/* v7.60 (langues), v7.61 (espagnol) : repère du français dans un texte qui devrait être dans une autre langue. Utilisé par
   langues.test.cjs (pages générées, sans navigateur) et langues-browser.cjs (pages rendues, chaque outil du calculateur dans
   chaque mode). Deux signaux : un mot outil français (« de », « pour », « ton »…) ou un mot accentué qui n'est pas un nom
   propre connu. Les noms propres et les mots d'origine française sont listés dans ALLOW.
   frenchHits(texte, langue) : « en » par défaut ; « es » retire les mots que l'espagnol partage avec le français (« de »,
   « la », « que », « en », « un », « sur »…) et ne compte que les accents propres au français (è ê ç à â î ô û ù ë œ…),
   l'espagnol écrivant lui aussi « é ». */
const FR_WORDS = new Set(('le la les des du de et est une un pour avec dans tu ton ta tes je ça qui que pas aux au mais sans ce cette ces nous vous '
  + 'sur par son sa ses mon ma mes leur être avoir fait faire tout tous toute toutes peux peut encore déjà aussi quand comme très ici voir '
  + 'prix achat achats argent gagner gagne jeu partie parties jour jours heure heures oui non rien aucun aucune temps joueur joueurs '
  + 'véhicule véhicules arme armes mission missions activité activités objectif budget calcul calculs plan fiche fiches '
  + 'ou où il elle ils elles on se ne y en à afficher retirer modifier enregistrer fermer ouvrir choisir choisis écris écrire '
  + 'combien quel quelle quoi chaque après avant puis soit dont entre vers chez depuis pendant moins mieux bien environ trop tard semaine sem mille milliard milliards').split(' '));
/* mots aussi anglais (URL /en/, « a », « on », « son », « ton », « par ») : ne comptent pas. */
for (const w of ['a', 'en', 'on', 'son', 'ton', 'ma', 'par']) FR_WORDS.delete(w); FR_WORDS.delete('plan'); FR_WORDS.delete('budget'); FR_WORDS.delete('mission'); FR_WORDS.delete('missions'); FR_WORDS.delete('parties');
/* mots aussi espagnols (« de », « la », « que », « en », « un », « se », « y », « entre », « bien », « sur » = sud, « mes » = mois,
   « tu » = ton, « son » = sont, « le », « les », « des » (de dar), « une » (de unir), « par » = paire) : ne comptent pas en espagnol */
const ES_SHARED = new Set(['de', 'la', 'le', 'les', 'des', 'une', 'que', 'en', 'un', 'se', 'y', 'entre', 'bien', 'sur', 'mes', 'tu', 'son', 'par', 'plan', 'a', 'ma', 'on', 'ton', 'ce', 'ne', 'sin', 'con', 'mil', 'es', 'final', 'total', 'base', 'error', 'non', 'sem']);
const FR_WORDS_ES = new Set([...FR_WORDS, 'mission', 'missions', 'budget', 'parties', 'sont', 'était', 'faut', 'votre', 'notre', 'lieu', 'lieux', 'voiture', 'voitures', 'bateau', 'bateaux', 'trouver', 'acheter',
  'nouveau', 'nouvelle', 'dernier', 'plusieurs', 'beaucoup', 'toujours', 'jamais', 'chose', 'choses', 'propriété', 'propriétés', 'entreprise', 'quartier'].filter(w => !ES_SHARED.has(w)));
/* espagnol : un mot porte au plus un accent écrit ; deux (« équipé », « préférée ») ou une finale -ité, -ée, -ément trahissent le français */
const ES_SHAPE = /[áéíóú].*[áéíóú]|(?:ité|ée|ées|ément|ités)$/;
const ALLOW = new Set(['léo', 'pokémon', 'café', 'résumé', 'décor', 'naïve', 'fiancé', 'fiancée', 'rosé', 'touché', 'déjà-vu', 'protégé',
  'lürssen', 'crème', 'brûlée', 'piñata', 'señor', 'jalapeño', 'josé', 'andré', 'cliché', 'entrée', 'expo', 'vu',
  'française', 'français', 'françois', 'québec', 'élysée', 'mêlée', 'übermacht', 'mulét']);
/* noms propres français cités tels quels (adresses, nom officiel d'une loi ou d'une autorité) et citations anglaises
   gardées dans leur langue (propos de Rob Nelson) */
const PROPER = ['You’ll obtain outfits by completing missions or purchasing them from stores', 'Le Mans', 'De Hoop', 'De Havilland', 'Sedan de Ville', 'La Perle', 'La Mesa', 'Ctrl+Y', 'UH-1Y', 'Safari Y6', 'Commission Nationale de l’Informatique et des Libertés', 'Commission nationale de l’informatique et des libertés', 'loi Informatique et Libertés', 'rue de Salneuve', 'place de Fontenoy'];
function words(text) { return String(text || '').toLowerCase().replace(/[  ]/g, ' ').split(/[^a-zà-öø-ÿœæ’'-]+/).map(w => w.replace(/^[’'-]+|[’'-]+$/g, '')).filter(Boolean); }
/* Renvoie la liste des mots qui trahissent du français (vide = rien trouvé). */
function frenchHits(text, lang = 'en') {
  const hits = [], es = lang === 'es', list = es ? FR_WORDS_ES : FR_WORDS, accents = es ? /[àâçèêëîïôûùœ]/ : /[àâçéèêëîïôûùüœ]/;
  let t = String(text || ''); for (const p of PROPER) t = t.split(p).join(' ');
  t = t.replace(/(^|[^A-Za-zÀ-ÿ])[A-ZÀ-Ý]{2,3}(?![A-Za-zÀ-ÿ’'])/g, '$1 ');   // sigles et monogrammes (« DU » pour Dundreary, « LE », « RS »)
  for (const w of words(t)) {
    if (ALLOW.has(w) || ALLOW.has(w.replace(/’s$/, ''))) continue;   // nom propre, aussi au possessif anglais (Léo’s)
    const base = w.replace(/^(?:l|d|j|t|s|n|qu|c)’/, '');
    if (base !== w && base.length > 1) { hits.push(w); continue; }   // l’objectif, d’abord, j’ai…
    if (list.has(w)) { hits.push(w); continue; }
    if (accents.test(w) || es && ES_SHAPE.test(w)) hits.push(w);
  }
  return hits;
}
module.exports = { frenchHits, FR_WORDS, FR_WORDS_ES, ALLOW, PROPER };
