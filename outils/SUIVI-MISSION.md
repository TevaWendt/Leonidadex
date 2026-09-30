# Suivi de la mission « calculateur, catalogues, Achats, carnets » (v7.48 → v7.52)

Document unique de suivi et de reprise. À relire avant toute reprise : il dit la base exacte, les lots faits, le lot
actif, les fichiers touchés, les choix, les vérifications, les blocages et le point de reprise. Les détails par outil
sont dans `outils/MATRICE-COUVERTURE.md` ; l’inventaire du site de départ dans `outils/INVENTAIRE-MISSION.md`.

## Base exacte

- Dépôt GitHub `TevaWendt/Leonidadex`, commit `a843930` « v7.46 lot 9 », plus l’archive `Leonidakit-v7.47-modifs.zip`
  (490 fichiers, 29/09/2026 01:33) = **v7.47** (4 523 fichiers suivis). Tests de départ : `node --test` 463 / 463.
- Chaque livraison est une archive « modifs » **cumulée par rapport à cette v7.47** (fichiers ajoutés ou modifiés,
  chemins depuis la racine ; suppressions listées à part s’il y en a).
- Environnement de travail : dépendances de développement hors dépôt (`jsdom`, `postcss`, `playwright`) ; Chromium
  `/opt/pw-browsers/chromium`. Aucune dépendance déployée, aucun `package.json`, `api/` inchangé.

## Objectif général et contraintes

Calculateur capable d’expliquer ce qui est possible, toute la préparation, les coûts et avantages, l’ordre d’action et ce
qui ferait changer la conclusion (8 calculs + business plan) ; catalogues Vêtements et style, Consommables, Armes,
Véhicules riches et beaux ; page Achats immersive ; un carnet dédié par catégorie suivie. Contraintes : aucune mécanique ni
donnée de GTA VI inventée (le jeu sort le 19/11/2026 ; aujourd’hui les 354 prix du catalogue sont inconnus), inconnu ≠ 0,
site statique (Vercel, sans build), mots simples pour le joueur, charte Leonidakit, règle de mouvement « lisible avant tout »
(v7.39), mouvement réduit respecté, stockage local seulement.

## Lots

| Lot | Version | Contenu | État |
|---|---|---|---|
| 1 | v7.48 | Contexte, inventaire, matrice, fondations communes (critères, statuts, coûts, prérequis, fiches, carnets, état v6) | **fait** |
| 2 | v7.49 | Huit calculs et business plan complet | à faire |
| 3 | v7.50 | Catalogues, visuels, sélecteurs de carte, page Achats | à faire |
| 4 | v7.51 | Carnets de progression et raccordements | à faire |
| 5 | v7.52 | Harmonisation, validation complète, livraison | à faire |

## Lot 1 (v7.48) — fait le 29/09/2026

**Besoin traité** : identifier la base réelle et poser des structures communes pour que les lots 2 à 4 n’aient ni
formules divergentes ni données recopiées. **Acquis précédents** : moteur pur (`calculateurs-engine.js`), état v5,
carnets du calculateur, progression v2, catalogues validés (lots 5 et 6), générateurs reproductibles.
**Pages concernées** : aucune page visible modifiée (sauf les empreintes `?v=` et « Le site en chiffres », posées par la
régénération). **Critères de réussite** : registre validé, fonctions communes testées sur les cas de la demande, état v6
qui ne change aucun résultat existant, rubriques de carnet exportées et importées.

Fichiers ajoutés :
- `outils/modele-donnees.json` (source) → `modele-donnees.js` (généré, `window.LK_MODELE`) par `outils/gen-modele.cjs`
  (validation : identifiants, genres, statuts, mécaniques, états vides, outils, carnets ; `--check`).
- `calculateurs-modele.js` (`window.LKCalcModel`, fonctions pures communes : valeurs avec statut, sommes partielles,
  comparaison de coûts incomplets, coût sur la durée, point de bascule, trésorerie, admission, prérequis récursifs, grand
  livre, seuils, séquences, Pareto, explication, fiche documentaire, adaptateurs véhicule / arme / consommable).
- `carnets-core.js` (`window.LKCarnets` : possessions lues dans les clés historiques, stock `lk_stock_v1`, souhaits
  `lk_wish_v1`, journal idempotent `lk_journal_v1`, résumé et entrées par carnet).
- `outils/MATRICE-COUVERTURE.md`, `outils/INVENTAIRE-MISSION.md`, ce document.
- Tests : `outils/tests/modele-v748.test.cjs` (20), `carnets-core-v748.test.cjs` (8), `scenario-v6-v748.test.cjs` (6).

Fichiers modifiés :
- `calculateurs-scenario.js` : état **v6** (analyse partagée, rôle / usage / capacités / revente / dépendances des achats,
  sens du but, durée et prérequis des achats d’avant, missions faites une fois, verrous, variantes, identifiant des relevés,
  `modelVersion`) ; migration v5 → v6 sans changer un résultat ; valeurs inattendues ramenées au défaut.
- `calculateurs.js` : une sauvegarde v6 est modifiable (garde « version future » à partir de la v7).
- `progression-core.js` : `lk_stock_v1`, `lk_wish_v1`, `lk_journal_v1` reconnus à l’import (déjà exportés).
- `outils/regenerer.cjs` : `gen-modele.cjs` en première étape.
- Tests adaptés à la v6 : `calculateurs-astra`, `calculateurs-lot-b`, `calculateurs-plan-v34`, `calculateurs-parcours-browser`.

Choix retenus :
- Les données de jeu restent là où elles sont (catalogues, véhicules, armes) ; la structure documentaire (rubriques,
  champs, états vides) est projetée à l’affichage par `fiche()` : aucune ligne « vide » n’est recopiée dans les JSON.
- Un repère de la série (GTA V…) n’est jamais une valeur de GTA VI : `fiche()` affiche l’état vide et le repère à part.
- Terrain d’un véhicule déduit de sa catégorie du site (bateau → eau, avion / hélicoptère → air, sinon route) avec le
  statut « estimé » et la mention « déduit du type de véhicule, pas d’une fiche technique ».
- Carnets : pages dédiées sous `/carnets/` (garage, arsenal, garde-robe, consommables, personnalisations, propriétés,
  lieux, collectibles, calculs) ; aucune famille dans deux carnets (vérifié par le générateur).
- Quantités : nouvelle rubrique séparée ; l’ancienne case cochée se lit « stock à renseigner », jamais une quantité.

Vérifications (lot 1) : `node --test` 497 / 497 (463 + 34 nouveaux), `node outils/verifier.js` 0 erreur (44 322 références),
régénération complète reproductible (deux passages, aucune différence), `node outils/gen-modele.cjs --check`, preuve de
confidentialité tenue ; navigateur : `calculateurs-parcours-browser.cjs` 161 / 161 avec l’état v6.
Finition du lot 1 = registre validé + fonctions testées sur tous les cas chiffrés de la demande qui relèvent du modèle +
migration sans effet sur les résultats + aucune régression (Node et navigateur). Rien de visible à embellir dans ce lot.

## Anomalies relevées à l’inventaire (lot où elles sont traitées)

| # | Anomalie | Lot |
|---|---|---|
| 1 | Chapitre Tuto `choisir` absent de la liste de `calculateurs.js` (pas de retour au Tuto depuis Quel achat choisir ?) | 2 |
| 2 | `type` sans `id` ignoré dans les liens vers le calculateur (25 liens) ; `tool=purchase&type=place` mène à Mes achats alors qu’un lieu ne s’achète pas | 2 |
| 3 | `ids` remplit la comparaison de Mes achats, pas « Quel achat choisir ? » | 2 |
| 4 | `minutes` écrase aussi « Je joue chaque jour » ; 0 accepté | 2 |
| 5 | Pas de prix, de réserve, de joueurs transmis par l’adresse ; pas de `mode=guided` | 2 |
| 6 | Paramètres et `#plan=` modifient ou remplacent le calcul sans copie ni confirmation (sauf Léo) | 2 |
| 7 | `id` avec un outil autre que purchase / roi force purchase | 2 |
| 8 | Léo « Mon temps de jeu » : formule propre au lieu du moteur | 4 |
| 9 | Progression : carte « Calculs enregistrés » lit l’ancienne clé (toujours « Aucun calcul ») | 4 |
| 10 | `sync-site.cjs` : compteur des consommables « 0 / 30 » au lieu de 29, familles perso ignorées (le JS corrige) | 4 |
| 11 | `progression.html` : `section#acquisitions` jamais fermée | 4 |
| 12 | Identifiants `tatouages` / `munitions` à la fois catégorie d’acquisition et famille (chiffres mélangés) | 4 |
| 13 | L’export du suivi emporte le brouillon de Contact (`lk_contact_draft_v1`, adresse e-mail) | 4 |
| 14 | 3 fiches véhicules hors liste portent « Ajouter à mon garage » sans être comptées | 4 |
| 15 | Fiches planques sans encart calculateur alors qu’elles sont dans le catalogue du calculateur | 4 |
| 16 | Page Achats : aucun visuel, « Consommables : Rien de publié » (30 lignes existent), « Vêtements et style : 3 collections » (109 lignes) | 3 |
| 17 | `style.html` : sous-navigation sans « Collections » | 3 |
| 18 | Images des lignes de catalogue : lien texte seulement | 3 |
| 19 | Galerie épinglée des fiches du monde : image suivante floutée alors qu’elle porte du texte (règle v7.39) | 3 |
| 20 | « JetBrains Mono » citée 19 fois mais non hébergée (monospace du système) | 5 |
| 21 | `lk-showcase.js` chargé pour rien sur les hubs du monde et Médias | 5 |
| 22 | `calculateurs-tools.js` chargé par aucune page ; `outils/CALCULATEUR-V2.md` dépassé | 5 |
| 23 | Événements `lk:calculator` / `leonidakit:calculator` sans écouteur | 5 |
| 24 | Le mot « carnet » désigne déjà le carnet des Collectibles et les enregistrements du calculateur : les nouvelles pages s’appellent « Mon garage », « Mon arsenal »… ; le mot « carnet » n’est utilisé qu’en titre de famille | 4 |

## Blocages connus

- Aucune donnée officielle de prix, de performance, de coût d’usage, d’effet chiffré ou d’emplacement par objet n’est
  publiée pour GTA VI : les analyses fonctionnent avec les chiffres du joueur ou des hypothèses choisies, signalées.
- rockstargames.com et la plupart des sites ne sont pas joignables depuis l’atelier (seul le proxy des outils de recherche
  répond) : les médias ajoutés viennent de `img/officiel/` et de `photos/` (gtadb, CC BY 4.0) déjà dans le dépôt.

## Point de reprise

Lot 1 livré (v7.48). Prochaine action : lot 2 — brancher `modele-donnees.js` et `calculateurs-modele.js` dans
`calculateurs.html`, puis outil par outil selon la matrice (ordre : trésorerie et coûts d’usage communs → Mes achats →
Quel achat choisir ? → Ça vaut le coup ? → Mon budget → Quoi acheter d’abord ? → Mon objectif → Mes activités → Mon temps
de jeu → business plan), explication « Ce qui compte » générée, tests des situations de la demande.
