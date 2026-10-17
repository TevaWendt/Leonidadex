# Matrice de la v7.92.1 — pages revues et page Prix et collector (16/10/2026)

Base : v7.92 (commit 52ecaec29, poussée par Téva le 16 octobre). Chaque ligne : l’exigence, ce qui a été fait, comment c’est vérifié.

## Ce que Téva demande

| # | Demande | Fait | Vérifié |
|---|---|---|---|
| 1 | Presse : animations, centrage, alignement des images et des textes | carte de presse suspendue qui se balance et s’incline vers la souris ; trois phrases à copier d’un coup ; kit, nuancier, formats, indépendance et lettre alignés (CHANGEMENTS § 3) | captures 1 440 et 390 px relues ; `v7921-browser` (bouton « Copier les trois phrases », aucun débordement) |
| 2 | Devine le lieu : idem | cartes postales des six régions alignées rangée par rangée (sous-grilles), en-tête, légende de la carte, cycle, « Continuer la visite » (§ 4) | captures ; `v7921-browser` (lignes des cartes postales alignées) ; `v790-browser` (jeu inchangé) |
| 3 | Actualités : « un peu vide au niveau du contenu » | 17 annonces au lieu de 11, chacune sourcée ; « À la une » ; filtre « Produits dérivés » ; questions revues (§ 5) | `v7921.test` (17 annonces, sources présentes) ; `v7921-browser` (filtre) |
| 4 | Vidéos officielles : mêmes problèmes, surtout l’alignement | bande-annonce de lancement et sa page ; salle de projection, musique et pages des vidéos réalignées ; vinyle d’un morceau seul (§ 6) | captures ; `v787`, `v7871`, `v7921` (quatre vidéos, aucun photogramme inventé) |
| 5 | Éditions : « vraiment fade » | bandeau à deux éditions et prix en étiquettes ; cartes alignées ligne par ligne (sous-grille) ; « Quelle édition choisir ? » ; mois de GTA+ ; bandeau du coffret (§ 7) | captures 1 440, 1 024, 820 et 390 px ; `v7921-browser` (petit choix, cartes alignées à 1 280 px) |
| 6 | Ce qui est confirmé : « pas suffisante » | relevé du jour sur sa planchette (le tampon a sa place sous la dernière ligne), 12 points confirmés, modèles réels en trois règles (§ 9) | `v7921.test` ; `v7921-browser` (tampon sur aucune ligne, 320 à 1 280 px, trois langues) ; captures des six langues |
| 7 | Le bundle Rockstar (figurine, lunettes, casquette… 400 €) avec le prix du jeu, en section | nouvelle page `prix.html` : prix du jeu, coffret et ses onze objets en photos officielles, manettes, collection de la boutique, total à cocher (§ 8) | `v7921.test` (page dans les six langues, prix, sources, données structurées) ; `v7921-browser` (total dans les six langues) |
| 8 | Animations, contenu, effets, motion design, branding, SEO, praticité sur chaque section | briques communes (§ 2), titres et descriptions de `prix.html` et de la page de la vidéo dans les six langues, images de partage, plan du site | tableau suivant |
| 9 | Images du web, dans la légalité | 18 visuels officiels de Rockstar et de PlayStation, chacun avec sa source, son crédit et sa date ; rien d’autre | `v7921.test` (crédit et source de chaque visuel) ; `medias.html` |

## Exigences de qualité

| Exigence | État | Preuve |
|---|---|---|
| Rien d’inventé ; chaque prix dit d’où il vient | tenue : « Officiel » quand une boutique officielle l’affiche, « Vu dans un média » quand seule la presse le donne ; GTA V et GTA Online restent des repères de la série | relecture ; `v7921.test` |
| Mouvement : moteur commun, mouvement réduit respecté | tenue : animations nouvelles dans `prefers-reduced-motion: no-preference`, délais par `--lk-delay` | `v7871.test` ; captures en mouvement réduit |
| Toutes les largeurs, aucun débordement, rien de coupé ni de trop petit | tenue : textes à 11 px au moins au téléphone, montants plafonnés à la largeur de leur carte, noms longs coupés | `v7921-browser` (8 pages × 4 langues × 3 largeurs) ; écrans du socle (73 pages × 16 largeurs, 70 pages allemandes × 5 largeurs : 0 débordement, 0 texte sous 10 px, mêmes signaux qu’en v7.92 ailleurs) ; montants vérifiés de 320 à 1 920 px dans les six langues |
| Aucun cookie, rien d’envoyé, clés `lk…` | tenu : le total à cocher ne garde rien | `v7921-browser` ; audit des cookies |
| Six langues au même niveau | tenue : 415 à 420 textes par langue, extraction à `{}`, aucune entrée inutilisée, aucun conflit ; « Totale » en italien ; noms anglais des objets pris sur la boutique Rockstar | `langues.cjs --extraire` ; `langues.test` 51/51 ; pages et navigateur des langues |
| Léo | tenue : nouveaux sujets et questions des encarts compris dans les six langues ; une question sur le jeu ne mène plus à la page Presse | `leo-eval` (jeux `leo-questions-v7921-<langue>.json` 10/10 × 6 ; 80 jeux rejoués, aucun recul face à la v7.92) ; `v788` ; `gen-leo --check` |
| CSP inchangée, aucune donnée envoyée | tenue | `vercel.json` inchangé |

## Contrôles de la version livrée

Voir la fin de `outils/CHANGEMENTS-v7.92.1.txt` (§ 13 et § 14) : suite Node 1 152/1 152, langues 51/51, verifier.js sans erreur (444 411 références), pages des langues 35/35, langues dans le navigateur 2 791/2 791, écrans et audit de clôture sans problème nouveau, aucun cookie, `v7921-browser` 196/196, synchronisation idempotente.
