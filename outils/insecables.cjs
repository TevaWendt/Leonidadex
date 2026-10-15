'use strict';
/* lot 1 bis (corrections de l’audit, points 8 et 11) : espaces insécables dans les montants et les dates, dans chaque langue.
   - Montants : « 80 000 $ » → « 80 000 $ » insécable avant le signe (« 1,5 M $ », « 10 Mio. $ », « 79,99 € » de même) ;
     « $ 200.000 » (portugais) : insécable après le signe. Sur téléphone, « $. » ne passe plus seul à la ligne.
   - Dates : l'année reste attachée à ce qui la précède (« novembre 2026 », « 19, 2026 », « November 2026 », « de 2026 ») et le
     jour à son mois quand l'année ne suit pas (« 19 novembre », « November 19 », « 19. November », « 19 de ») : une année ne
     finit plus seule sur la dernière ligne d'un titre, et une date complète garde une coupure possible (« 19 / novembre 2026 »,
     « November / 19, 2026 », « 19 de / noviembre de 2026 ») : sur un téléphone de 320 px, le grand titre de fin de page ne
     déborde pas (« 19 novembre 2026. » d'un seul bloc dépassait de 39 px).
   Appliqué au texte seulement : outils/langues.cjs (segments de texte des pages traduites) et outils/sync-site.cjs (texte des
   pages françaises, hors balises, scripts, styles et commentaires). Le contenu ne change pas : l'empreinte de contenu du plan
   du site (contentPrint) ramène déjà les espaces insécables à des espaces. */
const NB = ' ';
const MONTHS = {
  fr: 'janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre',
  en: 'January|February|March|April|May|June|July|August|September|October|November|December',
  es: 'enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre',
  it: 'gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre',
  de: 'Januar|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember',
  pt: 'janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro'
};
const RE = {};
for (const [code, m] of Object.entries(MONTHS)) {
  const M = '(' + m + ')';
  /* l'année d'abord (« novembre 2026 ») ; puis le jour et le mois, seulement si l'année ne suit pas (sinon toute la date ferait un
     seul bloc, trop large pour un grand titre sur un téléphone de 320 px) */
  const noYear = '(?![\\u00a0 ,]*[\\u00a0 ]\\d{4})';
  if (code === 'en') RE[code] = [[new RegExp('\\b' + M + ' (\\d{1,2}), (\\d{4})\\b', 'g'), '$1 $2,' + NB + '$3'], [new RegExp('\\b' + M + ' (\\d{4})\\b', 'g'), '$1' + NB + '$2'], [new RegExp('\\b' + M + ' (\\d{1,2})\\b' + noYear, 'g'), '$1' + NB + '$2'], [new RegExp('\\b(\\d{1,2}) ' + M + '\\b' + noYear, 'g'), '$1' + NB + '$2']];
  else if (code === 'de') RE[code] = [[new RegExp('\\b' + M + ' (\\d{4})\\b', 'g'), '$1' + NB + '$2'], [new RegExp('\\b(\\d{1,2}\\.) ' + M + '(?![\\wäöüß])' + noYear, 'g'), '$1' + NB + '$2']];
  else if (code === 'es' || code === 'pt') RE[code] = [[new RegExp('\\b(\\d{1,2}º?) de ' + M + '(?![\\wçãõáéíóúâêô])', 'gi'), '$1' + NB + 'de $2'], [new RegExp('\\b' + M + ' de (\\d{4})\\b', 'gi'), '$1 de' + NB + '$2']];
  else RE[code] = [[new RegExp('\\b' + M + ' (\\d{4})\\b', 'gi'), '$1' + NB + '$2'], [new RegExp('\\b(1er|\\d{1,2}) ' + M + '(?![\\wàâäéèêëîïôöùûüç])' + noYear, 'gi'), '$1' + NB + '$2']];
}
/* Les espaces insécables déjà posés autour d'un mois (texte passé une première fois, pages françaises resynchronisées) redeviennent
   des espaces avant la pose : le résultat ne dépend pas de l'état d'entrée (une règle changée s'applique aussi au texte déjà traité). */
const UNDO = {};
for (const [code, m] of Object.entries(MONTHS)) UNDO[code] = [
  [new RegExp('(\\d|1er|º|\\.)[\\u00a0\\u202f](?=(?:de )?(?:' + m + ')(?![\\wàâäéèêëîïôöùûüçãõáíóúß]))', 'gi'), '$1 '],
  [new RegExp('\\b(' + m + ')(,?)[\\u00a0\\u202f](?=\\d)', 'gi'), '$1$2 '],
  [new RegExp('\\b(' + m + ') de[\\u00a0\\u202f](?=\\d{4})', 'gi'), '$1 de '],
  [new RegExp('\\b(' + m + ') (\\d{1,2}),[\\u00a0\\u202f](?=\\d{4})', 'gi'), '$1 $2, ']
];
function insecables(text, code) {
  let s = String(text);
  if (!/\d/.test(s)) return s;
  for (const [re, to] of UNDO[code] || UNDO.fr) s = s.replace(re, to);
  /* montants : nombre (et unité) puis devise ; devise puis nombre (portugais, « US$ 10 ») */
  s = s.replace(/(\d)[  ](k|M|Md|Mio\.|Mrd\.|Tsd\.|mil|mi|bi)[  ](?=[$€])/g, '$1' + NB + '$2' + NB)
    .replace(/(\d(?:k|M)?)[  ](?=[$€])/g, '$1' + NB)
    .replace(/([$€])[  ](?=[-−]?\d)/g, '$1' + NB)
    /* v7.91 (portugais) : le signe devant, puis le nombre et son unité : « $ 10 mi », « $ 1,5 milhão », « $ 100 mil » ne se
       coupent pas avant l'unité (« $ 10 / mi » dans le Tuto à 1 440 px) */
    .replace(/([$€][ \u00a0\u202f]?[-−]?\d[\d.,]*)[ \u00a0\u202f](mil|mi|bi|milh(?:ão|ões)|bilh(?:ão|ões))(?![\p{L}\d])/gu, '$1' + NB + '$2');
  for (const [re, to] of RE[code] || RE.fr) s = s.replace(re, to);
  return s;
}
/* Texte d'une page HTML : seulement hors balises, scripts, styles, dessins svg et commentaires. */
function insecablesHtml(html, code) {
  /* les dessins (svg) restent tels quels : leur texte est un dessin (la carte de référence img/leonida-carte.svg en est tirée) */
  return String(html).split(/(<script\b[\s\S]*?<\/script>|<style\b[\s\S]*?<\/style>|<svg\b[\s\S]*?<\/svg>|<!--[\s\S]*?-->|<[^>]*>)/).map((part, i) => i % 2 ? part : insecables(part, code)).join('');
}
/* assemblage v7.91 (audit) : « GTA 6 » et « GTA VI » ne se coupent pas en fin de ligne dans les titres et les questions (h1, h2, h3,
   summary), dans toutes les langues : la règle de la passe de qualité (nb() de gen-actus, gen-radios, gen-informations) valait
   pour les pages de son périmètre et pour le français ; les traductions perdaient l'espace insécable quand la mémoire l'avait
   écrite avec une espace simple. Appliqué au texte des titres seulement (hors balises, scripts et dessins). */
function insecablesTitres(html) {
  return String(html).replace(/(<(h1|h2|h3|summary)\b[^>]*>)([\s\S]*?)(<\/\2>)/g, (m, a, tag, inner, b) =>
    a + inner.split(/(<script\b[\s\S]*?<\/script>|<svg\b[\s\S]*?<\/svg>|<[^>]*>)/).map((part, i) => i % 2 ? part : part.replace(/\bGTA (6|VI)\b/g, 'GTA' + NB + '$1')).join('') + b);
}
module.exports = { insecables, insecablesHtml, insecablesTitres, MONTHS };
