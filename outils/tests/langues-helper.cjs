'use strict';
/* v7.60 (langues) : repère du français dans un texte qui devrait être en anglais. Utilisé par langues.test.cjs (pages
   générées, sans navigateur) et langues-browser.cjs (pages rendues, chaque outil du calculateur dans chaque mode).
   Deux signaux : un mot outil français (« de », « pour », « ton »…) ou un mot accentué qui n'est pas un nom propre connu.
   Les noms propres et les mots anglais d'origine française sont listés dans ALLOW. */
const FR_WORDS = new Set(('le la les des du de et est une un pour avec dans tu ton ta tes je ça qui que pas aux au mais sans ce cette ces nous vous '
  + 'sur par son sa ses mon ma mes leur être avoir fait faire tout tous toute toutes peux peut encore déjà aussi quand comme très ici voir '
  + 'prix achat achats argent gagner gagne jeu partie parties jour jours heure heures oui non rien aucun aucune temps joueur joueurs '
  + 'véhicule véhicules arme armes mission missions activité activités objectif budget calcul calculs plan fiche fiches '
  + 'ou où il elle ils elles on se ne y en à afficher retirer modifier enregistrer fermer ouvrir choisir choisis écris écrire '
  + 'combien quel quelle quoi chaque après avant puis soit dont entre vers chez depuis pendant moins mieux bien environ trop tard semaine sem mille milliard milliards').split(' '));
/* mots aussi anglais (URL /en/, « a », « on », « son », « ton », « par ») : ne comptent pas. */
for (const w of ['a', 'en', 'on', 'son', 'ton', 'ma', 'par']) FR_WORDS.delete(w); FR_WORDS.delete('plan'); FR_WORDS.delete('budget'); FR_WORDS.delete('mission'); FR_WORDS.delete('missions');
const ALLOW = new Set(['léo', 'pokémon', 'café', 'résumé', 'décor', 'naïve', 'fiancé', 'fiancée', 'rosé', 'touché', 'déjà-vu', 'protégé',
  'lürssen', 'crème', 'brûlée', 'piñata', 'señor', 'jalapeño', 'josé', 'andré', 'cliché', 'entrée', 'expo', 'vu',
  'française', 'français', 'françois', 'québec', 'élysée', 'mêlée',
  /* v7.61 : noms propres du jeu et du monde réel cités sur tout le site */
  'übermacht', 'mulét', 'lârss', 'elbö', 'pérez', 'trésor', 'škorpion', 'pißwasser', 'huracán', 'hellión']);
/* noms propres français cités tels quels (adresses, nom officiel d'une loi ou d'une autorité) */
const PROPER = ['Commission Nationale de l’Informatique et des Libertés', 'loi Informatique et Libertés', 'rue de Salneuve', 'place de Fontenoy',
  /* v7.61 : noms de modèles, de lieux et de marques qui contiennent un mot outil français */
  'Sedan de Ville', 'De Havilland', 'De Hoop', 'Stanier LE', 'La Perle', 'La Quinta', 'La Mesa', 'Herzog and de Meuron', 'Y Vice City', 'Safari Y6', 'UH-1Y', 'SE280LC', 'Ctrl+Y', 'mud parties', 'Le Mans'];
function words(text) { return String(text || '').toLowerCase().replace(/[\u00a0\u202f]/g, ' ').split(/[^a-zà-öø-ÿœæ’'-]+/).map(w => w.replace(/^[’'-]+|[’'-]+$/g, '')).filter(Boolean); }
/* Renvoie la liste des mots qui trahissent du français (vide = rien trouvé). */
function frenchHits(text) {
  const hits = [];
  let t = String(text || ''); for (const p of PROPER) t = t.split(p).join(' ');
  /* v7.61 : points cardinaux des adresses réelles (« 109 NE 2nd Ave ») et morceaux de noms isolés dans leur balise
     (« De » de De Hoop, « LE » de Stanier LE, monogrammes « DE », « LA ») */
  t = t.replace(/\b(?:NE|NW|SE|SW)\b/g, ' '); if (/^(?:De|LE\)?|DE|DU|LA|ÜB)$/.test(t.trim())) return [];
  for (const w of words(t)) {
    if (ALLOW.has(w) || ALLOW.has(w.replace(/’s$/, ''))) continue;   // nom propre, aussi au possessif anglais (Léo’s)
    const base = w.replace(/^(?:l|d|j|t|s|n|qu|c)’/, '');
    if (base !== w && base.length > 1) { hits.push(w); continue; }   // l’objectif, d’abord, j’ai…
    if (FR_WORDS.has(w)) { hits.push(w); continue; }
    if (/[àâçéèêëîïôûùüœ]/.test(w)) hits.push(w);
  }
  return hits;
}
module.exports = { frenchHits, FR_WORDS, ALLOW, PROPER };
