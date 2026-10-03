'use strict';
/* v7.60 (langues), v7.61 (espagnol) : repère du français dans un texte qui devrait être dans une autre langue. Utilisé par
   langues.test.cjs (pages générées, sans navigateur) et langues-browser.cjs (pages rendues, chaque outil du calculateur dans
   chaque mode). Deux signaux : un mot outil français (« de », « pour », « ton »…) ou un mot accentué qui n'est pas un nom
   propre connu. Les noms propres et les mots d'origine française sont listés dans ALLOW.
   frenchHits(texte, langue) : « en » par défaut ; « es » retire les mots que l'espagnol partage avec le français (« de »,
   « la », « que », « en », « un », « sur »…) et ne compte que les accents propres au français (è ê ç à â î ô û ù ë œ…),
   l'espagnol écrivant lui aussi « é ». « it » (v7.63) : mots partagés retirés, élisions italiennes admises, accent seulement
   sur la dernière voyelle.
   v7.62 (allemand, autre branche, fusionnée en v7.64) : « de » tient compte des mots et des lettres qui existent aussi en
   allemand (« du », « des », « je », « Partie », trémas et ß) ; englishHits repère un texte anglais resté sur une page
   allemande ; foreignHits(texte, langue) réunit les contrôles d'une langue (allemand : français et anglais ; autres :
   français), chaque mot préfixé de la langue trouvée (« fr:pour », « en:the »). */
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
/* v7.63 (italien) : mots que l'italien partage avec le français (« le », « la », « il », « un », « tu », « qui » = ici, « ce », « sa »,
   « non », « se », « ne », « quel », « quelle », « mille », « est » = est) : ne comptent pas en italien. */
const IT_SHARED = new Set(['le', 'la', 'il', 'un', 'tu', 'qui', 'ce', 'sa', 'non', 'se', 'ne', 'quel', 'quelle', 'mille', 'est', 'plan', 'budget', 'a', 'ma', 'on', 'son', 'ton', 'par', 'en', 'fiche', 'fiches', 'y']);
const FR_WORDS_IT = new Set([...FR_WORDS, 'mission', 'missions', 'parties', 'sont', 'était', 'faut', 'votre', 'notre', 'lieu', 'lieux', 'voiture', 'voitures', 'bateau', 'bateaux', 'trouver', 'acheter',
  'nouveau', 'nouvelle', 'dernier', 'plusieurs', 'beaucoup', 'toujours', 'jamais', 'chose', 'choses', 'entreprise', 'quartier'].filter(w => !IT_SHARED.has(w)));
/* italien : l'accent n'est écrit que sur la dernière voyelle (« città », « perché », « più ») ; un accent ailleurs
   (« véhicule », « très »), un accent propre au français (â ç ê ë î ï ô û œ) ou une finale « é » qui n'est pas italienne
   (« acheté », « activité » ; l'italien n'a que « perché », « né », « sé », « ventitré »…) trahissent le français. */
const IT_SHAPE = w => /[âçêëîïôûœ]/.test(w) || /[àèéìòù](?=[a-zà-ÿ])/.test(w) || /é$/.test(w) && !/^(?:né|sé|fé|mercé|viceré|scimpanzé)$|ché$|tré$/.test(w);
/* espagnol : un mot porte au plus un accent écrit ; deux (« équipé », « préférée ») ou une finale -ité, -ée, -ément trahissent le français */
const ES_SHAPE = /[áéíóú].*[áéíóú]|(?:ité|ée|ées|ément|ités)$/;
const ALLOW = new Set(['léo', 'pokémon', 'café', 'résumé', 'décor', 'naïve', 'fiancé', 'fiancée', 'rosé', 'touché', 'déjà-vu', 'protégé',
  'lürssen', 'crème', 'brûlée', 'piñata', 'señor', 'jalapeño', 'josé', 'andré', 'cliché', 'entrée', 'expo', 'vu',
  'française', 'français', 'françois', 'québec', 'élysée', 'mêlée', 'übermacht', 'mulét', 'légifrance',
  /* v7.63 : mots français entrés tels quels en italien (« una coupé », « vetri fumé », « art déco ») */
  'coupé', 'fumé', 'déco', 'berlina-coupé',
  /* noms propres du jeu et du monde réel cités sur tout le site */
  'lârss', 'elbö', 'pérez', 'trésor', 'škorpion', 'pißwasser', 'huracán', 'hellión']);
/* noms propres français cités tels quels (adresses, nom officiel d'une loi ou d'une autorité) et citations anglaises
   gardées dans leur langue (propos de Rob Nelson) */
const PROPER = ['You’ll obtain outfits by completing missions or purchasing them from stores', 'Le Mans', 'De Hoop', 'De Havilland', 'Sedan de Ville', 'La Perle', 'La Mesa', 'Ctrl+Y', 'UH-1Y', 'Safari Y6', 'Commission Nationale de l’Informatique et des Libertés', 'Commission nationale de l’informatique et des libertés', 'loi Informatique et Libertés', 'Informatique et Libertés', 'rue de Salneuve', 'place de Fontenoy',
  'Stanier LE', 'La Quinta', 'Herzog and de Meuron', 'Y Vice City', 'SE280LC', 'mud parties', 'Strg+Y', 'Eau de Cologne', 'eau de cologne'];
/* v7.62 (allemand) : mots outils français qui sont aussi des mots allemands (« du » = tu, « des » = génitif, « je » = chaque,
   « Partie » = partie de jeu) et lettres accentuées qui appartiennent à l'allemand (trémas) */
const SAME_AS_FR = { de: new Set(['du', 'des', 'je', 'partie', 'quelle', 'arme']) };
const ACCENTS_DE = /[àâçéèêëîïôûùœ]/;
/* mots allemands d'origine française qui gardent leur accent, seuls ou dans un mot composé (« Sportcoupé », « Art-déco-Hotel ») */
const ACCENT_OK_DE = /coupé|déco/;
function words(text) { return String(text || '').toLowerCase().replace(/[  ]/g, ' ').split(/[^a-zß-öø-ÿœæ’'-]+/).map(w => w.replace(/^[’'-]+|[’'-]+$/g, '')).filter(Boolean); }
/* Renvoie la liste des mots qui trahissent du français (vide = rien trouvé). */
function frenchHits(text, lang = 'en') {
  const hits = [], es = lang === 'es', it = lang === 'it', de = lang === 'de', list = es ? FR_WORDS_ES : it ? FR_WORDS_IT : FR_WORDS, accents = es ? /[àâçèêëîïôûùœ]/ : de ? ACCENTS_DE : /[àâçéèêëîïôûùüœ]/, same = SAME_AS_FR[lang];
  let t = String(text || ''); for (const p of PROPER) t = t.split(p).join(' ');
  t = t.replace(/(^|[^A-Za-zÀ-ÿ])[A-ZÀ-Ý]{2,3}(?![A-Za-zÀ-ÿ’'])/g, '$1 ');   // sigles et monogrammes (« DU » pour Dundreary, « LE », « RS »)
  if (/^(?:De|LA|ÜB)$/.test(t.trim())) return [];   // morceau de nom isolé dans sa balise (« De » de De Hoop)
  for (const w of words(t)) {
    if (ALLOW.has(w) || ALLOW.has(w.replace(/’s$/, ''))) continue;   // nom propre, aussi au possessif anglais (Léo’s)
    if (de && ALLOW.has(w.replace(/s$/, ''))) continue;   // génitif allemand (Léos)
    if (same && same.has(w)) continue;
    if (it) {   // italien : « l’auto », « dell’arma », « c’è » sont italiens ; « j’ », « qu’ » non ; on juge le mot après l’apostrophe
      if (/^(?:j|qu)’./.test(w)) { hits.push(w); continue; }
      const b = w.replace(/^[a-z]+’(?=.)/, '');
      if (list.has(b) || (b !== w && (b === 'objectif' || b === 'argent' || b === 'achat' || b === 'arme' || b === 'abord')) || IT_SHAPE(b)) hits.push(w);
      continue;
    }
    const base = w.replace(/^(?:l|d|j|t|s|n|qu|c)’/, '');
    if (base !== w && base.length > 1) { hits.push(w); continue; }   // l’objectif, d’abord, j’ai…
    if (list.has(w)) { hits.push(w); continue; }
    if ((accents.test(w) && !(de && ACCENT_OK_DE.test(w))) || es && ES_SHAPE.test(w)) hits.push(w);
  }
  return hits;
}
/* ---- v7.62 : anglais resté sur une page allemande ----
   Mots outils anglais qui n'existent pas en allemand. Les homographes allemands sont exclus (was, will, also, man, hat, see,
   in, so, war, not, all, die, bin, rot, her, mist, am, an, as, us, do, go, still, show, open, new, one, no, a, i…).
   Un texte est signalé à partir de EN_MIN mots outils anglais (un mot isolé : nom de marque, de modèle, de lieu). */
const EN_WORDS = new Set(('the and with your yours you this that from which what where when there their theirs they them these those here '
  + 'it it’s its isn’t aren’t wasn’t weren’t don’t doesn’t didn’t can’t won’t couldn’t shouldn’t wouldn’t let’s i’m i’ve i’ll you’re you’ll you’ve '
  + 'they’re we’re there’s that’s what’s should would could been being into about only other others than then yet get gets got how why who can '
  + 'of to for are is be by or our we my me he she his him if at on any some every each just very too much many such more have has had '
  + 'were does did after before while because until again both without within through between against during even never always often '
  + 'already something nothing everything anything whether though although however add remove save choose select read learn').split(' '));
const EN_MIN = 2;
/* Exceptions relevées sur les pages allemandes (v7.62), retirées du texte avant le décompte. Chaque entrée est un texte
   anglais voulu, gardé tel quel par la traduction (glossaire allemand, règle 9) :
   - titres anglais de sources (articles, vidéos) cités comme références ;
   - noms de lieux réels (Floride : bâtiments, commerces, adresses de la carte) ;
   - noms propres anglais du jeu (commerces, enseignes, label) ;
   - citations anglaises entre guillemets (textes officiels, paroles de Rob Nelson, slogans des régions). */
const EN_KEEP = {
  /* titres d'articles et de vidéos cités en source (« Quelle: Kotaku: … ») */
  titres: [
    'GTA 6 just revealed a massive number of new gameplay details',
    'GTA VI reveals pricing, editions, and emphasis on immersion',
    'everything revealed from the GTA 6 Extended Look',
    'every new location Rockstar showed in the Extended Look',
    '20+ things you may have missed in the GTA 6 extended look',
    'GTA 6 map and locations, confirmed, leaked and rumoured',
    'Fishing in GTA 6 will be as extensive as in RDR2, but there’s a catch',
    'a fan found the real-life location of Jason and Lucia’s apartment',
    '150 new GTA 6 details revealed in the Extended Look and previews',
    'Miami nightclub responds to GTA 6’s imitation with a parody trailer',
    'GTA 6 businesses and properties, what we expect',
    'GTA 6 Extended Look, everything we learned',
    'the whole map is three times larger than Red Dead Redemption 2',
    'GTA 6 extended look, the actors fans think they recognise',
    'the first GTA 6 actor has confirmed his involvement'
  ],
  /* noms de lieux réels (Floride, carte : « Reales Gegenstück », « (echter Name) ») et morceaux d'adresses réelles */
  lieux: [
    'King of Diamonds', 'Gulf of Mexico', 'Straits of Florida', 'Province of Monza and Brianza',
    '115 Venetian Way San Marino Is', 'Bank of America Financial Center', 'Brickell on the River', 'CACTI Park of the Palm Beaches',
    'Casablanca Waterfront Bar and Grill', 'Cedar Key Chamber of Commerce', 'Chalan on the Beach', 'City of Miami Building Department',
    'City of Miami Police Department', 'Continuum on South Beach', 'Courtyard by Marriott', 'Don Panoz Gallery of Legends', 'E11EVEN',
    'Fifth and Alton', 'Fisher Island Club Health Center and Spa', 'Flagler on the River', 'George’s Tires and Repair',
    'Grove at Grand Bay Condominium', 'Herzog and de Meuron Building', 'Historic Town Hall of Homestead', 'Holiday Inn Port of Miami-Downtown',
    'Icon at South Beach', 'Infinity at Brickell', 'Key Largo Chamber of Commerce', 'Latitude on the River',
    'Lila and Harold Menowitz Comprehensive', 'Marina Club at Blackwater Sound', 'Miami Friends of the Japanese Garden', 'NAP of the Americas',
    'Nine at Mary Brickell Village', 'Office in the Grove', 'Port of Miami Parking Garage G', 'Port of Miami Tunnel',
    'Port of Tampa Container Terminal', 'Quantum on the Bay', 'Regatta at Indian Creek', 'The Attic', 'The Bass', 'The Bath Club',
    'The Bentley Bay Condominiums', 'The Corkscrew', 'The Crimson', 'The Deck at Island Gardens', 'The Floridian', 'The Four Ambassadors',
    'The Gates Hotel South Beach', 'The Golden Dome', 'The Goodtime Hotel', 'The Grand', 'The Hampton Social', 'The Loggia',
    'The Palace Condominium', 'The Peggy Brown Building', 'The Pit Bar-B-Q', 'The Ritz-Carlton', 'The Sail on Brickell',
    'The Savoy Hotel & Beach Club', 'The Shrimp Boat', 'The Tides South Beach', 'The Tipsy Cow Bar & Grill', 'The Tipsy Octopus',
    'The Tree of Life', 'The Villa Casa Casuarina', 'The Waverly South Beach', 'The Wolfsonian', 'Towers of Quayside Tower',
    'Twice The Ice', 'Welcome To Naples Sign'
  ],
  /* noms propres anglais du jeu (commerces, enseignes, label, mascotte, golfe), gardés tels quels (glossaire, règle 9) */
  noms: [
    'Jack of Hearts', 'Only Raw Records', 'The Rusty Anchor', 'Macca the Gator', 'Gulf of Leonida', 'Cash For Scrap', 'The Amalfi',
    'The Atoll Bar & Grill', 'The Flamingrill', 'The Hub Gallery', 'The Sumerian', 'We Have Shoes', 'Welcome to Hamlet Sign',
    'Welcome to Port Gellhorn Sign', 'What’s Cooking'
  ],
  /* citations anglaises entre guillemets („…“) : Rockstar (textes officiels des éditions, slogans des régions), Rob Nelson
     (Famitsu, GamingBible), Jillian Carr (Dazed) */
  citations: [
    'Everything in excess', 'Gateway to paradise', 'Welcome to the wetlands', 'Wild, wild country',
    'a weapon locker to customize your loadout for any occasion',
    'wide selection of artistic and performance-based vehicle mods',
    'Ammu-Nation also sells special guns exclusive to particular stores',
    'apparel and accessories inspired by the Goodtime State’s hit TV show character, Macca the Gator',
    'at a tuning shop',
    'countless clothing stores and hair salons',
    'customized grips, various engravings, and different scopes',
    'detailed interiors, exquisite rims, and donk stylings',
    'effortlessly chic linen suit in vintage pastel, complemented by the cut and coif of the decade of decadence',
    'the cut and coif of the decade of decadence',
    'exclusive mods including a cab spoiler, rear aerials, and special livery',
    'exclusive outfits, tattoos, and more',
    'featuring classic Vercetti Estate-inspired styling, including palm-tree-etched grips, engraved detailing, and a scope',
    'Food affects Jason and Lucia’s weight, while exercising visibly builds and tones their muscles',
    'Food provides buffs that strengthen your meters',
    'his and hers',
    'If the car you’re trying to steal is a luxury vehicle, you’ll need the key cloner. There’s also a high probability that it will have an alarm and a sophisticated tracker.',
    'If you want to try lots of hairstyles, you’ll have to go to a salon',
    'is built around vanity',
    'There are also more weapon customization options than ever before',
    'more weapon customization options than ever before',
    'off-road modifications and hand-painted automotive artistry',
    'off-road modifications and hand-painted automotive liveries',
    'Once you’ve finished training, round things off with a protein shake and a protein bar',
    'round things off with a protein shake and a protein bar',
    'over 50 signature tattoos for both Jason and Lucia — all designed by the artist collective FAILE',
    'palm-tree-etched grips, engraved detailing, and high-performance scope',
    'palm-tree-etched grips, engraved detailing, high-performance scope, and personalized finishes',
    'Personalized sidearms with detailed engravings for Jason’s Girardi ES9 pistol and Lucia’s Klose K17 pistol',
    'personalized sidearms with detailed engravings',
    'red sequin mini dress and curls',
    'specializes in off-road modifications and hand-painted automotive artistry',
    'specializing in unique interiors, rims, and donk stylings',
    'Transform off-road vehicles with exclusive mods and even attain custom hand-painted masterpieces',
    'Transform vanilla vehicles into magnificent works of art with detailed interiors, exquisite rims, and donk stylings',
    'We have thousands of outfits',
    'We’ll also show you them having their morning coffee',
    'You can basically only change the color there, so if you want an elaborate paint job, you’ll need to take it to a tuning shop',
    'you can basically only change the color there',
    'You can cut your hair at a hideout as well, but the customization options there are limited',
    'You’ll obtain outfits by completing missions or purchasing them from stores'
  ]
};
/* comparées sans la casse (chaînes de recherche en minuscules : « hawk & little morgan his and hers »), les plus longues d'abord */
const EN_KEEP_LIST = [...new Set(Object.values(EN_KEEP).flat().map(x => x.toLowerCase().replace(/'/g, '’')))].sort((a, b) => b.length - a.length);
/* Renvoie les mots outils anglais d'un texte (vide = moins de EN_MIN mots, rien à signaler). */
function englishHits(text) {
  let t = String(text || '').toLowerCase().replace(/'/g, '’').replace(/[\u00a0\u202f]/g, ' ');
  for (const p of EN_KEEP_LIST) t = t.split(p).join(' ');
  const hits = words(t).filter(w => EN_WORDS.has(w));
  return hits.length >= EN_MIN ? hits : [];
}
/* Tout ce qui trahit une autre langue que celle de la page : « fr:… » (français), « en:… » (anglais, pages allemandes). */
const CHECKS = { en: ['fr'], de: ['fr', 'en'] };
function foreignHits(text, lang = 'en') {
  const out = [];
  for (const c of CHECKS[lang] || ['fr']) {
    if (c === 'fr') out.push(...frenchHits(text, lang).map(w => 'fr:' + w));
    if (c === 'en') out.push(...englishHits(text).map(w => 'en:' + w));
  }
  return out;
}
module.exports = { frenchHits, englishHits, foreignHits, FR_WORDS, FR_WORDS_ES, FR_WORDS_IT, ALLOW, PROPER, EN_WORDS, EN_KEEP, EN_MIN, CHECKS };
