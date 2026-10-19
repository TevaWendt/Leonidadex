# Matrice de qualité du lot C (v7.97, « une page par élément »)

Une ligne par point du document d’exigences de Téva (18 octobre 2026) qui concerne cette livraison : les 3 224 pages par élément
dans les cinq langues, traduites par `outils/langues-elements.cjs` appelé par `outils/langues.cjs`, leur indexation (noindex pour
les pages pauvres, consigne de 23 h 58), leurs hreflang, les sitemaps, la recherche du site et Léo qui ouvrent chaque page, les marques, types de
munitions, éditions et grands moments connus de Léo, IndexNow. Ce qui
vaut pour les lots A et B (MATRICE-v7.95.md, MATRICE-v7.96.md) vaut ici : même gabarit, même feuille, même moteur d’animation,
mêmes contrôles. État : fait, ou sans objet (avec la raison). Le contrôle complet et l’audit (écrans, latence, téléphone) se font une fois, à la fin des livraisons (consigne de Téva) : les
lignes qui en dépendent le disent.

| Point | Pages | Constat et correction | Preuve | État |
|---|---|---|---|---|
| 1.1 à 1.5 Mouvement, lisibilité, clic, tactile | toutes | Une page traduite est la page française traduite : même gabarit, mêmes classes `reveal` et `rise`, même moteur d’animation, rien d’ajouté. | contrôle des écrans | fait |
| 2 Charte en jetons, section finie, visuels crédités, statut | toutes | Rien ne change dans le gabarit ; les crédits, statuts et notes sont traduits par la mémoire (v797.json) ; les citations exactes restent dans leur langue. | lecture, `langues.test.cjs` | fait |
| 3 Grilles, hauteurs, cibles, seize largeurs | échantillon | Même gabarit que les pages françaises ; contrôle des écrans dans les langues (allemand, le plus long) à l’audit final. | écrans (audit final) | à l’audit final |
| 4 Ne charger que l’utile, latence | toutes | Mêmes feuilles et scripts que la page française (scripts traduits par langue, empreinte propre). | latence (audit final) | à l’audit final |
| 4 Ne jamais réécrire sans utilité | toutes | Deux moteurs : les pages existantes gardent exactement leurs traductions (vérifié par une génération à blanc) ; les pages françaises des lieux gardent leur empreinte de contenu (pas de nouveau lastmod) ; index partagé des pages. | génération à blanc, `--verifier`, archive « modifs » | fait |
| 5 Texte unique, titre ≤ 65, description ≤ 155, un h1 | toutes | Titres et descriptions traduits depuis les titres français uniques (règles par libellé), « GTA 6 » gardé ; titres anglais vérifiés ; un h1 par page. | `v797.test.cjs`, `langues.test.cjs` | fait |
| 5 canonical, hreflang, og, twitter | toutes | canonical et og:url de la langue ; hreflang fr, en, es, it, de, pt et x-default (anglais) sur chaque page indexable, aucun sur une page noindex ; og:locale ; image de partage de la langue. | `pages-elements.test.cjs`, `langues.test.cjs` | fait |
| 5 Données structurées | toutes | Même JSON-LD, noms et descriptions traduits, adresses de la langue. | `langues.test.cjs` (JSON valide) | fait |
| 5 Plans du site | pages indexables | Chaque version dans `sitemap.xml` et `sitemap-fiches.xml` avec `xhtml:link` et `lastmod` ; NURLS adresses (limite 50 000). | `verifier.js` | fait |
| 5 Maillage | toutes | Barre de langue de chaque page française vers sa version ; recherche et Léo vers les pages ; les liens internes des pages traduites mènent aux versions traduites. | `langues.test.cjs` (chaque lien mène à un fichier) | fait |
| 5 Page trop pauvre en noindex | toutes | Consigne de Téva (23 h 58) : une page sans assez d’informations réelles est en noindex,follow dans toutes les langues, sans hreflang ; les pages en noindex seront livrées à part pour être complétées. comparateur.html indexable, logements.html et les pages modèles aux exemples fictifs en noindex. | `pages-elements.test.cjs`, `v797.test.cjs` | fait |
| 5 IndexNow | sitemaps | En place depuis la v7.86 ; envois à la suite au-delà de 10 000 adresses (test). | `v797.test.cjs` | fait |
| 6 Six langues, Léo | toutes | Les 3 224 pages dans les cinq langues ; extraction à {} ×5 ; Léo connaît marques et grands moments dans les six langues ; évaluation 99 %. | extraction, `leo-eval.cjs` | fait |
| 7 Mots simples, aucun signe d’écriture automatique | toutes | Mémoire relue ; test sur un échantillon par famille et par langue traduite (hors citations exactes). | `v797.test.cjs` | fait |
| 7 Aucune donnée inventée | toutes | Une traduction ne dit rien de plus que la page française ; les noms officiels restent tels quels. | lecture | fait |
| 8 Doublons | toutes | Une page française, une version par langue ; canonical de la langue, x-default anglais. | tests | fait |
| 9 Ce qui ne change jamais | toutes | Aucun cookie, clés `lk…` seulement, CSP inchangée, contenu existant inchangé. | audit des cookies, diff | fait |
| 10 Contrôles et livraison | lot | Chaîne, extraction et tests des pages à chaque livraison ; contrôle complet et audit une fois, à la fin (consigne de Téva) ; archive « modifs », rien n’est poussé. | `verifier-tout.sh` (final) | en cours |
