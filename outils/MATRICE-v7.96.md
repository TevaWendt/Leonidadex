# Matrice de qualité du lot B (v7.96, « une page par élément »)

Une ligne par point du document d’exigences de Téva (18 octobre 2026) qui concerne ce lot : les 651 pages écrites par
`outils/gen-pages-elements-b.cjs` (coiffures, tatouages, tenues, personnalisation des véhicules et des armes, valeurs d’options,
marques, types de munitions, éditions, achats sans fiche, visuels officiels, grands moments, et un sommaire par famille) et les
liens qui y mènent depuis les listes, les hubs, les fiches et les dossiers. Ce qui vaut pour le lot A (MATRICE-v7.95.md) vaut
ici : même gabarit, même feuille, même moteur, mêmes contrôles. État : fait, ou sans objet (avec la raison). Les captures ont été
regardées, pas livrées.

| Point | Pages | Constat et correction | Preuve | État |
|---|---|---|---|---|
| 1.1 Un seul moteur d’animation | toutes | Classes `reveal`, `rise` et `lk-reveal` du gabarit, aucun observateur ajouté ; cascade des repères de carte reprise du lot A sur les pages qui ont des lieux. | lecture, audit de clôture | fait |
| 1.2 Un moment propre à la page | catalogues avec lieux, moments, visuels | Aperçu de carte en cascade quand il y a des lieux ; sur un grand moment ou un visuel, le visuel officiel en tête, prioritaire, puis les cartes des fiches ; le reste reste calme. | captures | fait |
| 1.3 Lisible avant tout | toutes | Aucun flou, aucune rotation, aucun `scale` sur du texte ; cartes liées immobiles ; silhouettes des marques décoratives (`aria-hidden`), sans mouvement. | audit de clôture | fait |
| 1.3 Réduire les animations, sans script | toutes | Comme le lot A (`prefers-reduced-motion`, `html:not(.js)`). | audit de clôture | fait |
| 1.5 Au clic | catalogues, munitions | Bouton de suivi à largeur fixe (lot A), même clé que les listes ; aucun onglet, frise ou carrousel. | essai dans Chromium (lot A), lecture | fait |
| 1.5 Écran tactile | toutes | Rien ne dépend du survol ; les repères de carte sont doublés par la liste. | lecture | fait |
| 2 Charte en jetons | toutes | Teintes par famille ajoutées à `elements.css` avec les jetons de `style.css` ; pastille de teinte et bandeau de silhouettes en jetons. | lecture de `elements.css` | fait |
| 2 Section finie, rien d’inutile | toutes | Texte propre, tableau Identité, visuel ou aperçu, cartes liées, précédent et suivant ; une page sans assez d’informations reste en noindex (options, munitions, visuels sans description). | captures, inventaire | fait |
| 2 Visuels officiels seulement, crédités | catalogues, éditions, achats, visuels, moments | Toujours `img/officiel/` avec crédit, lien vers la page du visuel et vers les crédits ; silhouettes des véhicules du site. | `verifier.js` (images) | fait |
| 2 Statut toujours affiché | toutes | Puce dans l’en-tête et ligne Statut ; les repères de la série dits comme tels. | lecture | fait |
| 3 Grilles, hauteurs, cibles, mots | toutes | `.rel-grid` du gabarit pour les cartes, `.lc-list` en colonnes pour les listes ; cibles de 40 px ; « GTA 6 » insécable. | contrôle des écrans | fait |
| 3 Seize largeurs, captures regardées | échantillon du lot | Un catalogue, une option, une marque, un type de munitions, une édition, un achat, un visuel, un moment et un sommaire regardés à 390, 768 et 1 280 px ; échantillon des contrôles étendu. | captures de travail, `ecrans-browser.cjs` | fait |
| 4 Ne charger que l’utile, images, sources, mesure | toutes | Même chargement que le lot A (trois feuilles, scripts communs, `suivi.js` seulement où il sert) ; visuels en `srcset` 480 et 1 280 ; mesure de latence d’une page par famille face à la fiche véhicule (§ 7). | `latence-browser.cjs` | fait |
| 4 Ne jamais réécrire sans utilité | toutes | Index partagé : seules les pages dont le contenu change sont réécrites ; les hubs reçoivent un lien, rien d’autre. | `--verifier`, archive « modifs » | fait |
| 5 Texte unique, titre ≤ 65, description ≤ 155, un h1 | toutes | Construits depuis les données ; titres bornés (catégorie retirée puis coupe sur un mot) ; unicité testée sur les 3 224 pages. | `pages-elements.test.cjs` | fait |
| 5 canonical, og, twitter, image de partage | toutes | Complets ; image de partage = visuel officiel quand il existe ; hreflang au lot C. | tests, `gen-partage --verifier` | fait (hreflang au lot C) |
| 5 Données structurées | toutes | WebPage (about : l’élément, ImageObject sur les visuels) ; CollectionPage avec ItemList sur les onze sommaires ; aucun Product ni Offer. | `pages-elements.test.cjs` | fait |
| 5 Plans du site | pages indexables | Entrées dans `sitemap.xml` et `sitemap-fiches.xml` avec `lastmod` réel. | `verifier.js` | fait |
| 5 Maillage | toutes | Listes (« sa page »), cartes d’achats, mur des marques, types de munitions, crédits, frise, éditions, fiches (constructeur, munitions), dossiers du monde (moments), sommaires, précédent et suivant, cartes liées ; recherche et Léo au lot C. | `pages-elements-b.test.cjs` | fait (recherche et Léo au lot C) |
| 5 Page trop pauvre en noindex | toutes | Décision de Téva (18 octobre, 20 h 09) : plus aucune page par élément en noindex, tout est proposé aux moteurs (INDEXER_TOUT de `couverture-pages.cjs`) ; les seuils restent dans le rapport sans décider ; seules les pages modèles aux exemples fictifs, les redirections et la 404 restent en noindex. | inventaire, `pages-elements.test.cjs` | fait (sur décision) |
| 6 Six langues, Léo | toutes | Lot B en français ; textes nouveaux des hubs traduits (v796.json, motifs des crédits) ; pages et Léo au lot C. | extraction {} ×5 | fait (pages au lot C) |
| 7 Mots simples, aucun signe d’écriture automatique | toutes | Test sur tout l’index ; citations exactes gardées telles quelles ; accords et parenthèses relus (§ 4 des changements). | `pages-elements.test.cjs`, lecture | fait |
| 7 Aucune donnée inventée | toutes | Chaque phrase vient d’une donnée ; les constructeurs évoqués sont dits « observation de la communauté » ; les prix des options sont des repères de la série ; les descriptions absentes des visuels sont dites absentes. | lecture | fait |
| 8 Doublons | toutes | Un élément, une page ; les moments jumeaux d’une annonce renvoient vers elle ; les achats avec fiche restent sur leur fiche. | `couverture-pages.cjs` | fait |
| 9 Ce qui ne change jamais | toutes | Aucun cookie, clés `lk…` seulement, CSP inchangée, contenu existant inchangé (liens ajoutés seulement). | audit des cookies, diff | fait |
| 10 Contrôles et livraison | lot | Contrôle complet à la fin (§ 6 des changements), archive « modifs », rien n’est poussé. | `verifier-tout.sh` | fait |
