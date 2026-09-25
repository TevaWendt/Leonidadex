# ETAT_AUDIT — audit de finition LeonidaKit

Mis à jour le 25 septembre 2026 · livraison **v7.32 = lots A + B + C** de la refonte en trois lots (A menu/sections/Léo · B calculateur et business plan · C charte, marges, animations, images). La refonte est complète ; l’audit v7.29 ci-dessous reste valable.

## Refonte en trois lots (25/09/2026)

| Lot | État | Contenu |
|---|---|---|
| A | **Livré (v7.30)** | Menu Explorer refait (S’équiper : Consommables, Vêtements et style, Personnalisations ; Armes → Armurerie ; doublons retirés), pages Consommables et Vêtements et style en volets, renvois pour les pages absorbées, Léo avec une base de connaissances GTA VI de 79 sujets. Détail : outils/CHANGEMENTS-v7.30.txt |
| B | **Livré (v7.31)** | Calculateur en deux sections : (1) « Mes calculs », huit onglets dont le nouveau « Quel achat choisir ? » (2 à 6 achats, critère rapport qualité-prix / moins cher / plus vite / plus rentable / plus utile), Simple = phrase + 3 chiffres, Expert = tableaux, graphiques, réglages ; (2) « Mon business plan » à la place de « Mon plan » : fiche en quatre questions → réponse simple, plan étape par étape, puis « Afficher plus de détails » (chiffres après chaque étape, calendrier avec dates, « Et si… ? »). Tuto : 15 chapitres, 26 captures. Léo et la barre de question ouvrent les deux outils. Détail : outils/CHANGEMENTS-v7.31.txt |
| C | **Livré (v7.32)** | Charte Leonidakit en jetons (style.css) lue par toutes les feuilles, acquisitions.css réécrit (plus de mauve du patch), contenu élargi à 1 400 px avec gouttière fluide et rails dans la gouttière, échelle de titres et mesure des textes, apparitions au défilement et survols sur toutes les pages (common.js), piles d’images officielles superposées en tête de 18 pages (outils/lot-c-visuals.cjs), 26 captures Tuto refaites. 585 combinaisons page × largeur propres. Détail : outils/CHANGEMENTS-v7.32.txt |


## Identité exacte du ZIP de départ

- Archive : `Leonidadex-main (4)(1).zip` — SHA-256 `21b735f7969ed421edb1ac0d45fb9da724082c23c46a39a3bb679000bf321286`, 4 410 fichiers, non tronquée, racine `Leonidadex-main/`.
- Contenu : site en **v7.28** (lots A à E présents : calculateur v2, Tuto, hub Achats, sections achetables, progression v2, Léo). Aucun commit ni hash git dans l'archive.
- Patch intermédiaire : `LeonidaKit_Patch_Finition_01.zip` (ChatGPT, 431 fichiers dont 8 nouveaux), fondé sur ce même ZIP (même SHA-256). Il est **intégré en totalité** dans la v7.29, puis corrigé.
- Base pour appliquer la v7.29 : le ZIP v7.28 ci-dessus, **pas** la v7.21 en ligne sur GitHub. La production (leonidakit.com) n'a pas pu être comparée depuis cet environnement.

## Lots terminés, lot suivant, fichiers modifiés

| Lot | État | Résumé |
|---|---|---|
| 0 Base, inventaire, gardes | **Terminé** | Tests de départ : 298/298 (v7.28), 328/328 après patch. `regenerer.cjs` reproduit le patch à l'octet près. `verifier.js` : 0 erreur. |
| 1 Cohérence visuelle | **Terminé** (voir limites) | 4 défauts P2 corrigés (débordement 900–1180 px, en-tête sans marge, onglet coupé, burger affiché sur grand écran des pages info) + menu/pied de page sans doublon. 741 combinaisons page × largeur sans débordement ni erreur console. |
| 2 Calculateur | **Terminé** | Logique du patch conservée (outils indépendants, `worth`, comparaison de deux achats) ; libellés réécrits en mots simples ; « Partir de zéro » visible ; boutons de Mes achats replacés ; Tuto et 24 captures refaits. |
| 3 Sémantique et Léo | Vérifié, non modifié en profondeur | Les trois phrases-tests du prompt donnent la bonne action (région → destination, « trouve » → fiche, « acheter la maison de Jason » → Mes achats). Textes de Léo simplifiés. Reste : audit systématique des anciennes FAQ et de la date affichée. |
| 4 Recherche et sections | Vérifié | Index régénéré : pages, catégories, éléments des sections (collections de style, garages, personnalisations), aucun doublon de libellé ; « Vêtements » renommé « Vêtements à l'unité ». Reste : hiérarchie des résultats page/catégorie/fiche et scénarios clavier manuels. |
| 5 À propos, Contact, pied de page, mentions | Vérifié | Pages du patch conservées (honnêtes : aucun contact opérationnel promis) ; CSS corrigé ; pied de page harmonisé sur 406 pages. Reste : données propriétaire (voir plus bas). |
| 6 Mobile, accessibilité, perf, SEO | Partiel | Mobile 360/390 vérifié sur calculateur, menu, pied de page ; six pages « à confirmer » en `noindex` et hors sitemap ; aucun script tiers ajouté. Reste : contrôle clavier complet, lecteur d'écran, Lighthouse. |
| 7 Régression et livraison | En cours | Tests, régénération, balayage et archive « modifs » faits pour la v7.29. |

Fichiers modifiés par rapport au ZIP v7.28 : 462 (toutes les pages HTML changent parce que menu, pied de page et empreintes `?v=` sont régénérés). Liste et raisons dans `outils/RAPPORT-AUDIT-v7.29.md`.

## Problèmes encore ouverts (gravité)

- P2 — Contact : aucune adresse ni destination fonctionnelle n'est disponible. La page prépare un texte et le dit ; à activer dès qu'une boîte est confirmée (`outils/site-informations.json`, `contactVerified`).
- P2 — Mentions : identité de l'éditeur, responsable de publication, contact légal, téléphone de l'hébergeur et modalités Brevo restent « à compléter ». Données propriétaire.
- P3 — Onglet « Quoi acheter d'abord ? » sur deux lignes à partir de 1 101 px (choix retenu plutôt que réduire la police).
- P3 — Menu mobile : le panneau « Explorer » a un défilement interne (60 vh) quand toutes les catégories sont dépliées.
- P3 — Léo : formulations de quelques réponses anciennes (FAQ) non relues une par une.
- Non vérifié : écarts entre le ZIP et la production ; mesures Lighthouse ; lecteur d'écran réel ; test avec un nouveau visiteur (à faire par Téva).

## Tests réellement effectués

- `NODE_PATH=… SITE_ROOT=$PWD node --test outils/tests/*.test.cjs` : **328/328** (dont 30 tests `audit-finition.test.cjs` du patch ; 3 assertions adaptées aux nouveaux textes, aucune supprimée).
- `node outils/regenerer.cjs` puis `node outils/verifier.js` : 0 erreur, 37 945 références, 406 pages.
- Chromium (Playwright 1.63) : 39 pages × 19 largeurs (360 → 1 920, dont 600/601, 680/681, 820/821, 1 080/1 081) : 0 débordement horizontal, 0 erreur console ; captures de chaque panneau du calculateur en Simple et Expert à 1 280 et 360 ; menu Explorer, burger, Léo, À propos/Contact/Mentions.
- Léo : « achète la région Leonida Keys », « trouve Vice City », « je veux acheter la maison de Jason » → réponses et actions conformes.
- `outils/tuto-shots.py` : 24 captures régénérées sur le calculateur corrigé.

## Décisions prises

- Patch ChatGPT intégré tel quel pour la logique (moteur `worth`, indépendance des outils, menu Explorer, pages d'information), puis corrigé : ses libellés contredisaient la règle éditoriale du site (mots simples, pas de jargon).
- Six catégories vides regroupées derrière un seul lien « 6 catégories à confirmer » dans le menu et le pied de page (données : champ `pending` dans `acquisitions.json`), plutôt que listées une à une à côté des catégories documentées.
- En-tête ramené à la largeur commune (1 120 px) : le menu à 8 entrées n'a plus besoin de 1 280 px.
- Éventail « Continuer la visite » réduit (33 %, décalage 5 %) plutôt que masqué par `overflow`, pour garder l'effet de survol.

## Prochaines actions précises

1. Téva : appliquer la v7.29 sur une copie de la v7.28, ouvrir calculateurs.html, a-propos.html, contact.html à 360 et 1 366 px, puis mettre en ligne si conforme.
2. Lot 3 : relire les FAQ de Léo (`outils/leo-editorial.json`) et la date affichée dans ses réponses.
3. Lot 4 : scénarios clavier de la recherche (flèches, Entrée, Échap) et hiérarchie page > catégorie > fiche.
4. Lot 6 : Lighthouse mobile sur index, calculateurs, une fiche ; lecteur d'écran sur le calculateur.
5. Lot 5 : renseigner `outils/site-informations.json` dès que les données propriétaire existent, puis `node outils/regenerer.cjs`.
