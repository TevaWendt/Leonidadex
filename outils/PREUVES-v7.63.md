# Preuves — v7.63 (langues : tout le site en italien, Léo en italien), 3 octobre 2026

Dépendances hors dépôt, comme en v7.61 et v7.62 : jsdom, postcss, parse5, acorn et playwright (`NODE_PATH`). Aucun `package.json`.

## 1. Tests automatisés

| Contrôle | Résultat |
|---|---|
| Suite Node (`node --test --test-concurrency=1 outils/tests/*.test.cjs`) | **695 / 695** (`langues.test.cjs` : 32 / 32 — les 403 pages italiennes, espagnoles et anglaises, calculateur italien dans jsdom, bandeau italien) |
| `node outils/langues.cjs it --verifier` | 0 texte sans traduction, 0 balise cassée, 0 conflit (403 pages, 53 scripts) |
| `node outils/langues.cjs es --verifier` / `en --verifier` | 0 texte sans traduction, 0 balise cassée, 0 conflit |
| `node outils/verifier.js` | 0 erreur (175 978 références, 1 624 pages) |
| `node outils/tests/leo-eval.cjs --langue it` | **512 / 512** (hors sujet refusés 39 / 39, aucune réponse sans source) |
| `node outils/tests/leo-eval.cjs --langue es` / français | 511 / 512 / 512 / 512 (inchangés) |

## 2. Navigateur (Chromium, Playwright)

| Parcours | Résultat |
|---|---|
| `langues-pages-browser.cjs` | **les 403 pages italiennes, les 403 espagnoles et les 403 anglaises** à 1 280 px : 0 erreur JavaScript, 0 requête en échec, langue et barre de langue justes (« Cambia lingua »), **aucun mot français visible** ; à 390 px : aucun débordement propre à la traduction (21 / 21 contrôles) |
| `langues-browser.cjs` | **1 749 / 1 749** : barre de langue de 360 à 1 440 px sur 13 pages de chaque langue, menu à quatre langues, clavier, bandeaux (dont l’italien sur une page française), Léo présent en espagnol et en italien, absent en anglais ; calculateur italien, espagnol et anglais : 9 outils × 3 modes × état rempli / vide, aucun mot français, montants de la langue (« 1.250 $ »), nombre « 1.500 » lu 1 500, neuf questions italiennes du hub menées au bon outil |
| Exploration italienne (hors dépôt) | 38 pages (fiches, Veicoli, Armeria, mappa, quaderni, Progressi, Stile, Consumabili, Personalizzazione, Collezionabili…), 465 boutons, onglets, cases et listes cliqués, recherches tapées : aucun mot français, aucune erreur |
| Léo italien dans Chromium (hors dépôt) | accueil, fiche véhicule, personnage, mappa, calcolatore, Stile, à 1 280 et 390 px, 7 questions italiennes : réponses en italien, aucun mot français, aucune erreur, liens vers /it/, aucun débordement |
| `calculateurs-browser.cjs` (français) | 278 / 278 |
| `calculateurs-parcours-browser.cjs` | 161 / 161 |
| `calculateurs-lot-b-browser.cjs` | 140 / 140 |
| `calculateurs-v2-browser.cjs` | 142 / 142 |
| `carnets-browser.cjs` | 94 / 94 |
| `tuto-essayer-browser.cjs` | 22 / 22 |
| `contact-browser.cjs` | tenu |
| `leo-browser.cjs` | tenu |

## 3. Relecture de l’italien

- 9 relecteurs indépendants, avec le glossaire et l’accès au français de chaque texte : 5 sur 38 pages (10 769 textes :
  hubs, mappa, catalogues, fiches, carnets, Tuto, À propos, Contact, Mentions), 3 sur le calculateur (chaque outil, chaque
  mode), 1 sur 389 réponses de Léo. **207 défauts** signalés : surtout un même objet nommé de deux façons (titre de la fiche et
  libellé « Scheda completa » / « Ce l’ho »), des termes à aligner sur le glossaire (« segnaposto », « configuratore di
  equipaggiamento », « individuato »), quelques calques du français, des titres d’outils à mettre entre guillemets après
  « in ». Tous traités : corrigés dans la mémoire, ou dans le code quand la cause était là (Léo : phrases collées, nombres
  sans point des milliers, modèle réel resté en français ; « 27 armes » de la liste des armes ; « arsenal »). 5 remarques
  demandaient « 2547 » : écartées, la règle est devenue « 2.547 » (point des milliers dès 1 000, comme les navigateurs).
- Avant la relecture : harmonisation automatique des termes traduits différemment seuls et dans une phrase (69 textes),
  alignement des statuts (Ufficiale / Avvistato / Presunto), « Voce enciclopedica », « l’Ultimate Edition ».
- Aucun mot français oublié n’a été relevé dans les pages ; le parcours navigateur le confirme sur les 403 pages.

## 4. Le français n’a pas changé

Comparaison des 418 pages françaises avec la v7.62, en retirant la barre de langue, les `hreflang` et les empreintes `?v=` :
413 identiques à l’octet ; 5 différentes, comme prévu : `mentions-legales.html` (historique v7.63), `a-propos.html` (nombre
de tests écrits : 622), `vehicules.html`, `outils/templates/vehicules.html` et `armes.html` (attribut `data-mots`, invisible).
Les scripts modifiés (pluriels écrits en entier, `Choisir un arme`) affichent le même français : suites `calculateurs-*`,
`carnets-browser`, `tuto-essayer-browser` ci-dessus.

## 5. Captures

Captures du Tuto italien prises dans le calculateur italien (`python3 outils/tuto-shots.py . it`, `img/tuto/it/`, 26 images,
`outils/tuto-captures-it.json`).

## 6. Fautes du français repérées en traduisant (non corrigées, à décider)

Traduites telles quelles (ou rendues correctes en italien sans changer le sens) ; s’ajoutent à `outils/PREUVES-v7.61.md` § 6.

- Comparateur : « Choisir un arme » (« une arme »).
- Armes : la batte, la queue de billard et le cocktail Molotov classés « Arme de poing » ; « parmi les mêlée » ; « Sa portée
  estimée est jet. » (grenade fumigène) ; PM à crosse repliable « arme longue » mais PM tropical « arme de poing ».
- Effets coupés : « Encaisse plus de dégâts, jusqu’à », « Capacité augmentée, jusqu’à », « Dégâts à distance conservés à »
  (la valeur manque, dans les fiches de personnalisation comme dans Léo) ; « jusqu’à100 % » sans espace.
- Fiches véhicules : « Voir Chevrolet Impala dixième en photo », « Honda Accord dixième » (« génération » manque) ; « à coque
  centrale » (sans doute « console centrale ») ; l’Itali GTO « reste à confirmer » alors qu’elle est vue dans le Trailer 1 ;
  le Stanier ’55 dit tantôt Ultimate Edition, tantôt bonus de précommande, et sa référence est tantôt « 1956 Ford Fairlane »,
  tantôt « Ford Fairlane de 1955 » ; le Transit dit « modèle américain » mais est décrit européen ; le Sea-Doo (canadien) et
  le Jet (Boeing 747) reçoivent la phrase des « constructeurs de Détroit », l’hélicoptère Swift celle des « berlines de luxe et
  des supercars », le Mammoth Dodo (De Havilland Canada) est dit européen ; LomBike « supposition » et « aperçu
  officiellement » ; quelques noms laissés en anglais (« Generica mostly-naked chopper », « Rigid-hulled inflatable boat »,
  « BMX bike ») ; « GMC TopKick » / « GMC Topkick » ; fichiers dont le nom ne correspond pas au véhicule affiché
  (`vapid-bobcat-xl` → Declasse Bobcat XL, `vapid-contender` → Karin Contender, `bravado-rebel` → Karin Rebel,
  `vapid-gauntlet-classic-custom` → Bravado…, `lampadati-feroci` → Karin Feroci).
- Personnages : « L’une des deux personnages » ; Real Dimez « est signé » (masculin) puis « les a propulsées » (féminin pluriel).
- Notes de travail visibles : « Relu pour le lot 6 », « Lot 6 : », le chemin « img/officiel » (pages de consommables et de
  planques).
- Contact : le texte d’aide cite « Préparer le texte » alors que le bouton dit « Préparer le texte sans envoyer ».
- Personnalisations : « treize familles » pour douze listées.
- Léo : « 2 500 lieux » dans une réponse, « 2 547 » ailleurs ; « six listes » pour cinq nommées ; « le motel du premier trailer
  est montré dans le Trailer 1 » ; une adresse de la carte (100 Fisher Island Dr) montre l’identifiant brut « g dalton island ».
- Dates : « 1 octobre » sans « 1er » dans trois textes.
