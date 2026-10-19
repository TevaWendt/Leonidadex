# Matrice de qualité de la v7.98 (les quatre pages Ce qui est confirmé, Préchargement, GTA VI sur PC, GTA VI et GTA V)

Une ligne par point du document d’exigences de Téva qui concerne cette livraison : l’agencement des quatre pages
(`verification.html`, `prechargement.html`, `gta-6-pc.html`, `gta-6-vs-gta-5.html`) dans les six langues, les liens vers les
visuels. Le texte ne change pas. État : fait, ou à l’audit final (le contrôle complet et l’audit,
écrans, latence, téléphone, se font une fois, à la fin des livraisons : consigne de Téva).

| Point | Pages | Constat et correction | Preuve | État |
|---|---|---|---|---|
| 1.1 Un seul moteur de mouvement, cascade 35 à 60 ms | les quatre | Rien d’ajouté : mêmes classes `reveal` et `rise`, cascade de `vitrine.css` ; le défilement de côté au téléphone est un défilement natif (scroll-snap), sans script. | lecture, écrans | fait |
| 1.2 Pas de flou, de 3D ni d’échelle sur le texte ; cartes immobiles au survol | les quatre | Le survol de l’image d’un point confirmé change seulement la saturation de l’image ; aucune carte ne bouge. | lecture | fait |
| 1.3 prefers-reduced-motion | les quatre | Aucune animation nouvelle ; le défilement de côté reste un geste de l’utilisateur. | lecture | fait |
| 2 Charte en jetons | les quatre | Couleurs, bords et ombres des jetons (`--ink`, `--amber`, `--coral`, `--ed-card`) ; cartes numérotées dans le style des cartes du site. | lecture | fait |
| 3 Grilles alignées, rien qui se chevauche | les quatre | Tableau de bord en grille régulière, état au bout de chaque tuile ; pastilles des statuts dimensionnées ; listes à cocher alignées, sans vide en bas ; sources en deux colonnes. | écrans 390 et 1 280 px | fait |
| 3 Rien sous 11 px, cibles de 24 px | les quatre | Plus petit texte nouveau : 11,2 px (indication de la source au téléphone) ; tuiles de 44 px de haut au moins (66 px au téléphone), la tuile entière est le lien. | lecture | fait |
| 3 Téléphone | les quatre | Suites de cartes défilant de côté (84 % de la largeur, la suivante dépasse), deux petites cartes par ligne pour le tableau de bord, tableau et sources compacts. | écrans 390 px ; audit final | fait, revu à l’audit final |
| 4 Ne charger que l’utile, latence | les quatre | Quelques règles dans la feuille déjà chargée par ces pages ; aucune image, aucun script en plus. | latence (audit final) | à l’audit final |
| 4 Ne jamais réécrire sans utilité | site | Seules changent les pages dont un lien change et la feuille de ces pages. Le réglage du pied de page au téléphone (feuille commune à toutes les pages, donc 22 000 fichiers réécrits) attend l’audit final, qui touchera cette feuille de toute façon. | archive « modifs » | fait |
| 5 Maillage, liens morts | site | L’image d’un point confirmé mène à la page du visuel ; les liens « visuel officiel » et les piles de visuels mènent à la page du visuel au lieu de la ligne de crédits en bas de `medias.html`. | `verifier.js` | fait |
| 6 Six langues | les quatre | Mêmes feuilles dans toutes les langues ; extraction à 0 ×5 (aucun texte nouveau). | extraction | fait |
| 7 Aucune donnée inventée, contenu de base | les quatre | Texte inchangé ; Actualités déjà à jour (aucun média officiel nouveau depuis le 15 octobre). | diff | fait |
| 9 Ce qui ne change jamais | site | Aucun cookie, CSP inchangée. | diff | fait |
| 10 Contrôles et livraison | lot | Chaîne, extraction, vérification des pages et de Léo ; archive « modifs », rien n’est poussé. | journal de la chaîne | fait |
