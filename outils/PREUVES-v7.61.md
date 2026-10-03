# Preuves — v7.61 (langues : tout le site en espagnol, Léo en espagnol), 2 octobre 2026

Dépendances hors dépôt, comme en v7.60 : jsdom, postcss, parse5, acorn et playwright, dans un dossier `node_modules` à part
(`NODE_PATH`). Aucune n'est publiée ; aucun `package.json`.

## 1. Tests automatisés

| Contrôle | Résultat |
|---|---|
| Suite Node (`node --test --test-concurrency=1 outils/tests/*.test.cjs`) | **686 / 686** (dont `langues.test.cjs` : 23 tests, anglais et espagnol) |
| `node outils/langues.cjs es --verifier` | 0 texte sans traduction, 0 balise cassée, 0 conflit (403 pages, 53 scripts) |
| `node outils/langues.cjs en --verifier` | 0 texte sans traduction (6 pages, inchangées) |
| `node outils/verifier.js` | 0 erreur (91 371 références, 824 pages dont les 403 pages espagnoles) |
| `node outils/tests/leo-eval.cjs` | 512 / 512 (Léo français) |
| `node outils/tests/leo-eval.cjs --langue es` | **511 / 512**, 39 / 39 hors sujet refusés, 0 réponse sans source |

La suite se lance un fichier à la fois : en parallèle, la machine de test arrête `coverage.test.cjs` ou
`calculateurs-check-ultime.test.cjs` faute de mémoire (SIGKILL), sans rapport avec le code.

## 2. Navigateur (Chromium, Playwright)

| Parcours | Résultat |
|---|---|
| `langues-pages-browser.cjs` (nouveau) | **les 403 pages espagnoles** (et les 6 anglaises) à 1 280 px : 0 erreur JavaScript, 0 requête en échec, `lang="es"`, barre « Cambiar idioma », **aucun mot français visible** (texte, `aria-label`, `title`, `placeholder`, contenu CSS) ; à 390 px : aucun débordement propre à la traduction |
| `langues-browser.cjs` | **1 015 / 1 015** : barre de langue de 360 à 1 440 px (6 pages anglaises, 13 pages espagnoles dont une fiche, la carte, un carnet, Progreso), menu à trois langues, Échap, clavier, bandeaux anglais et espagnol, `lk_lang_v1` après un clic seulement, Léo absent en anglais et présent en espagnol ; calculateur anglais et espagnol : 9 outils × 3 modes × état rempli / vide, blocs dépliés, tiroir des calculs, aucun mot français, montants « 1.250 $ », « 1.500 » lu 1 500, 9 questions espagnoles au hub (chacune ouvre le bon outil) |
| Exploration (hors dépôt) | 45 pages espagnoles, chaque bouton, onglet, case et liste cliqué (406 clics), recherches tapées, fiches ajoutées au garage puis carnets ouverts : aucun français restant après corrections |
| Léo espagnol (hors dépôt) | 6 pages × 1 280 et 390 px, 7 questions espagnoles : réponses en espagnol, liens vers `/es/`, index `es/leo-index.json` chargé, aucun débordement |
| `calculateurs-browser.cjs` (français) | 278 / 278 |
| `calculateurs-parcours-browser.cjs` | 161 / 161 |
| `calculateurs-lot-b-browser.cjs` | 140 / 140 |
| `calculateurs-v2-browser.cjs` | 142 / 142 |
| `carnets-browser.cjs` | 94 / 94 |
| `tuto-essayer-browser.cjs` | 22 / 22 |
| `contact-browser.cjs` | tenu |
| `leo-browser.cjs` (français) | tenu (lancé seul : sous charge, le seuil de performance « processeur ralenti × 4 » n'est pas tenu) |

## 3. Relecture de l’espagnol

- 3 142 textes différents vus dans le calculateur espagnol et un échantillon de pages, relus par trois relecteurs
  indépendants avec le glossaire : 36 défauts signalés, **36 corrigés** (détail : `outils/CHANGEMENTS-v7.61.txt` § 5), puis
  parcours relancés.
- Termes traduits différemment selon l’endroit : contrôle automatique (même texte seul et dans une phrase), écarts gênants
  corrigés (noms d’armes, catégories, noms réels).
- Repère automatique du français adapté à l’espagnol (`langues-helper.cjs`) : mots que l’espagnol partage avec le français
  ignorés, accents propres au français, deux accents dans un mot, finales -ité / -ée.

## 4. Le français n’a pas changé (hors ce qui est voulu)

- Comparaison des 418 pages françaises avec l’archive (13), en retirant la barre de langue, les `hreflang` et les empreintes
  `?v=` : 414 identiques à l’octet ; 4 différentes, comme prévu : `mentions-legales.html` (historique v7.61), `a-propos.html`
  (compteur de tests), `armes.html` et `vehicules.html` (attribut technique `data-loc-where` du localisateur, même texte affiché).
- Scripts : seules des chaînes et des écritures équivalentes (pluriel `lkPluriel` qui garde la règle française en français,
  clé de partage séparée du mot affiché) ; seule différence visible : « Comparateur · véhicules » au lieu de « vehicules ».
- Parcours français du calculateur, des carnets, du Tuto, du contact et de Léo : tous verts (§ 2).

## 5. Captures

Dossier de contrôle (hors dépôt) : pages espagnoles à 390 et 1 280 px, menus ouverts, bandeau espagnol, calculateur espagnol,
Léo espagnol, captures du Tuto espagnol (`img/tuto/es/`, prises par `python3 outils/tuto-shots.py . es` après la relecture).

## 6. Fautes du français repérées en traduisant (non corrigées, à décider)

- « second trailer de mai 2026 » sur 16 fiches véhicules (`outils/redaction.cjs`) : le Trailer 2 date du 6 mai 2025.
- « Autres modèles japonaiss » (30 fiches), « classé parmi les service et urgence » (16 fiches), « l’édition Ultimate
  Edition » (9 fiches), « Harley Davidson » sans trait d’union (5 fiches).
- « La planque de Jason est relié », « Lucia Caminos est relié » (accord), « Il s’agit d’un objet du quotidien » sur la
  grenade fumigène et le fusil-harpon, « Voir les 1 autres vues officielles ».
- Planes De Havilland (canadiens) décrits comme européens ; phrase « constructeurs de Detroit » sur des bateaux et des avions.
- FAQ de l’Armurerie : « le fusil-harpon apparaît dans les séquences sous-marines », alors que la section Combat dit qu’aucun
  média officiel ne montre de tir sous l’eau.
