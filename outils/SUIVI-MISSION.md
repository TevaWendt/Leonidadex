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
| 2 | v7.49 | Huit calculs et business plan complet | **fait** |
| 3 | v7.50 | Catalogues, visuels, sélecteurs de carte, page Achats | **fait** |
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

## Lot 2 (v7.49) — fait le 29/09/2026

**Besoin traité** : que chaque calcul utilise vraiment les critères du modèle (conditions, coûts d’usage, prérequis,
horizon, besoin, simulations signalées) et le dise ; que le business plan suive toute la chaîne (missions de déblocage,
achats et leur temps, coût par partie, financement, temps total) ; que les liens ne remplacent plus un calcul en silence.
**Pages concernées** : `calculateurs.html` (9 panneaux, FAQ, lexique). **Critères de réussite** : les cas chiffrés de la
demande passent dans l’outil qui les porte, les nouveaux critères changent le résultat quand ils sont décisifs et
s’expliquent quand ils ne le sont pas, aucun facteur « oublié » dans « Ce qui compte », les trois modes donnent les mêmes
chiffres, les anciennes sauvegardes et tous les parcours navigateur restent verts.

Fichiers modifiés :
- `calculateurs-engine.js` : `order` avec coût d’usage par heure ; `missionPlan` réécrit (achats avant la 1re partie,
  temps d’acquisition, prérequis entre achats et missions, missions « une seule fois » et « déjà faite », sens du but
  disponible / en tout / gagné, grand livre avec point bas et conservation des flux, parcours continu sans durée de
  partie, courbe en marches) ; messages d’impossibilité avec les noms (plans de secours compris).
- `calculateurs-scenario.js` : couche d’analyse par outil (`analysis`) branchée sur `calculateurs-modele.js` ;
  explication « Ce qui compte dans ce calcul » en six parties pour les 9 outils ; comparaison « le moins cher sur la
  durée » (égalité, écart faible, indécidable), exclusion pour besoin incompatible ; ordre proposé (séquences exhaustives
  jusqu’à 7, dépendances, objectifs) ; budget partiel « au plus » et flux ; activités classées avec scénario d’échec ;
  munitions simulées ; échéance de Mon objectif ; sens du but ; stratégies du plan comparées au temps de jeu en continu.
- `calculateurs-workspace.js`, `calculateurs.js`, `calculateurs-visuals.js`, `calculateurs-plan.js` : bloc
  « Ce qui compte » (premier niveau court, détail repliable), champs d’usage, de capacités, de besoin, d’horizon, de
  revente, hypothèses globales (Expert), rendus refaits d’Ordre / Budget / Comparaison ; business plan : sens du but,
  durée de partie facultative (parcours en temps de jeu), cartes de mission (une seule fois, déjà faite, après une autre
  mission), cartes d’achat (temps pour l’obtenir, coût par partie, prérequis, indispensable), chaîne des étapes, point bas,
  « Parcours à compléter » (prix inconnu jamais gratuit), variantes gardées (5, reprise sans perte), courbe en marches,
  points réels jamais reliés ; liens (anomalies 1 à 7) et copie avant lien.
- `calculateurs-workspace.css` : styles des nouveaux blocs (fond sombre de la réponse et fond clair du plan, téléphone,
  mouvement réduit). `calculateurs.html` : FAQ et lexique complétés (le JSON-LD suit).
- `outils/editorial-hubs.json` : le lien « Combien de temps pour t’installer ? » de Lieux vise les demeures.
- Tests ajoutés : `calculateurs-v749` (24), `calculateurs-plan-ui-v749` (10), `calculateurs-liens-v749` (8) ; adaptés :
  `astra`, `ergonomie-v35` (courbe en marches, point « variantes »), `integration`, `plan-v34`, `scenario-v6-v748`,
  `calculateurs-v2-browser` (export v6).

Anomalies 1 à 7 corrigées : retour au Tuto depuis « choisir » ; `type` sans fiche limite le catalogue (un lieu n’est
jamais un achat) ; `ids` remplit « Quel achat choisir ? » ; `minutes` ne remplit que l’outil demandé (0 refusé) ; `price`,
`reserve`, `players`, `mode=guided` lus ; un lien qui change un calcul existant garde une copie dans « Mes calculs » et
propose d’y revenir (idem `#plan=`, y compris collé en cours de visite) ; `id` va dans l’outil demandé.

Choix retenus :
- « Avoir » garde son sens d’avant par défaut (disponible en plus de la réserve) : aucune sauvegarde ne change de résultat.
- Sans durée de partie, le plan n’invente aucun calendrier : temps de jeu seulement, et une échéance en jours est refusée
  avec la raison.
- Les coûts de carburant, d’entretien, de munitions… restent « à confirmer » ; ils comptent seulement comme ton chiffre ou
  comme simulation choisie en Expert, signalée partout.
- Un lien applique ses chiffres puis enregistre ; la copie d’avant n’est faite qu’une fois par état (pas de doublons).

Vérifications (lot 2) : `node --test` 539 / 539 ; `node outils/verifier.js` 0 erreur ; navigateur : parcours 161 / 161,
lot B 140 / 140, v2 142 / 142, calculateur 278 / 278, Léo « contrôle tenu » ; captures bureau et téléphone
(`captures-v7.49/`). Finition du lot 2 = cas chiffrés dans les outils + explication sans facteur oublié + parcours
navigateur verts + rendu relu sur captures (corrigés à la relecture : manque selon le sens du but, étiquettes de légende
trompeuses, identifiants dans les messages, séparateurs doublés, libellé du but non atteint).

## Lot 3 (v7.50) — fait le 29/09/2026

**Besoin traité** : catalogues beaux et complets sans rien inventer ; « où le trouver » compréhensible ; page Achats
immersive et juste. **Pages concernées** : `style.html`, `nourriture.html`, `personnalisations.html` (listes),
`armes.html`, `vehicules.html`, les 27 fiches armes et 302 fiches véhicules, `achats.html`, `comparateur.html`, les fiches
du monde (galerie épinglée). **Critères de réussite** : chaque élément réel a sa structure documentaire complète avec
ses états vides ; un prix inconnu n’est jamais gratuit ni zéro ; aucun emplacement inventé ; effets de défilement dans une
seule direction, réversibles, sans texte flouté, statiques en mouvement réduit ; audit navigateur sans nouveau défaut.

Fichiers ajoutés :
- `outils/fiche-doc.cjs` : fiche documentaire commune (modèle `outils/modele-donnees.json` via `LKCalcModel.fiche`),
  lecture honnête d’une ligne de catalogue (`knownOfRow` : officiel / estimé / repère de la série / sans objet).
- `outils/localisateur.cjs` + `localisateur.js` : sélecteur illustré « Où le trouver » (hub : recherche, catégories,
  vignettes, carte cadrée aux repères numérotés sans chevauchement, résumé synchronisé, choix gardé pour la visite ;
  fiche : même composant sans script). `img/leonida-silhouette.svg` : silhouette commune des fiches.
- `souhaits.js` (« Garder ce style » → `lk_wish_v1`, jamais une possession), `consommables.js` (comparer trois
  consommables, simulation personnelle signalée), `achats-pile.js` (voile et netteté de la pile, focus, grille).
- Test : `outils/tests/catalogues-v750.test.cjs` (10).

Fichiers modifiés (sources) : `outils/catalogues.cjs` (vignette, colonne GTA VI « Prix à venir » + « Achat à confirmer »
ou « Ne s’achète pas », fiche complète dépliable), `outils/gen-armes.cjs` et `outils/gen.js` (fiche documentaire à la place
de « Ce qui arrive avec le jeu », localisateur à la place des boutons-textes, synthèse légère sur les cartes),
`outils/hubs-editoriaux.cjs` (localisateur des hubs, cartes-lieux gardées en dessous), `outils/gen-acquisitions.cjs`
(carnet de style, consommables en un regard, scripts, index de recherche), `outils/gen-achats.cjs` (visuels, comptes
justes, accès rapide, pile), `outils/catalogues/editorial.json` (planches du carnet de style, sous-navigations),
`outils/acquisitions.json` (collections illustrées), `calculateurs-modele.js` (une valeur d’armure n’est jamais lue comme
de la vie), `comparateur.js` / `comparateur.html` (mêmes états vides, pont vers « Quel achat choisir ? »), `common.js`
(pas d’effet d’apparition dans les composants interactifs), `style.css`, `acquisitions.css`.

Anomalies 16 à 19 corrigées : Achats (visuel par catégorie, 30 lignes de consommables, 109 lignes de style, 98 de
personnalisations) ; sous-navigation de `style.html` avec « Collections » (et « Carnet de style ») ; images dans les lignes
des catalogues ; galerie épinglée : seule l’image de la vue suivante est floue, jamais son texte.

Choix retenus :
- Emplacement d’un objet : « Emplacement à venir » partout ; les repères de la carte sont des lieux liés au type
  (armureries ; concessions et ateliers, circuit pour les véhicules de course, marinas, aérodromes ; aucun pour les
  véhicules de service), dits comme tels.
- Carnet de style : planches éditoriales décrites en regardant les images (coupes, couleurs, matières), teintes relevées
  approximatives, distinctes des tenues ou bonus du jeu.
- Consommables : aucune jauge (aucune quantité ni référence de GTA VI) ; repère de la série écrit à part ; simulation du
  coût par point de vie seulement avec les deux chiffres du joueur.
- Page Achats : pile collante sur ordinateur et tablette (hauteur ≥ 600 px) ; sur téléphone, les cartes se suivent sans se
  superposer pour que rien ne soit coupé ; mouvement réduit et « Tout voir en grille » : grille statique.

Vérifications (lot 3) : `node --test` 549 / 549 ; `node outils/verifier.js` 0 erreur (46 513 références) ; audit
navigateur `--rapide` (23 pages, 7 largeurs) : 0 débordement, 0 texte coupé, 0 contraste insuffisant, 0 saut de titre,
0 flou, 0 erreur console (restent 3 défauts antérieurs hors lot : repères de 19 px de `carte.html`, image agrandie de
l’accueil à 1 920 px, un titre masqué de `collectibles.html` → lot 5) ; parcours calculateur 161 / 161, lot B 140 / 140,
Léo tenu ; captures bureau et téléphone (`captures-v7.50/`).

## Anomalies relevées à l’inventaire (lot où elles sont traitées)

| # | Anomalie | Lot |
|---|---|---|
| 1 | Chapitre Tuto `choisir` absent de la liste de `calculateurs.js` (pas de retour au Tuto depuis Quel achat choisir ?) | 2 (**corrigé v7.49**) |
| 2 | `type` sans `id` ignoré dans les liens vers le calculateur (25 liens) ; `tool=purchase&type=place` mène à Mes achats alors qu’un lieu ne s’achète pas | 2 (**corrigé v7.49**) |
| 3 | `ids` remplit la comparaison de Mes achats, pas « Quel achat choisir ? » | 2 (**corrigé v7.49**) |
| 4 | `minutes` écrase aussi « Je joue chaque jour » ; 0 accepté | 2 (**corrigé v7.49**) |
| 5 | Pas de prix, de réserve, de joueurs transmis par l’adresse ; pas de `mode=guided` | 2 (**corrigé v7.49**) |
| 6 | Paramètres et `#plan=` modifient ou remplacent le calcul sans copie ni confirmation (sauf Léo) | 2 (**corrigé v7.49**) |
| 7 | `id` avec un outil autre que purchase / roi force purchase | 2 (**corrigé v7.49**) |
| 8 | Léo « Mon temps de jeu » : formule propre au lieu du moteur | 4 |
| 9 | Progression : carte « Calculs enregistrés » lit l’ancienne clé (toujours « Aucun calcul ») | 4 |
| 10 | `sync-site.cjs` : compteur des consommables « 0 / 30 » au lieu de 29, familles perso ignorées (le JS corrige) | 4 |
| 11 | `progression.html` : `section#acquisitions` jamais fermée | 4 |
| 12 | Identifiants `tatouages` / `munitions` à la fois catégorie d’acquisition et famille (chiffres mélangés) | 4 |
| 13 | L’export du suivi emporte le brouillon de Contact (`lk_contact_draft_v1`, adresse e-mail) | 4 |
| 14 | 3 fiches véhicules hors liste portent « Ajouter à mon garage » sans être comptées | 4 |
| 15 | Fiches planques sans encart calculateur alors qu’elles sont dans le catalogue du calculateur | 4 |
| 16 | Page Achats : aucun visuel, « Consommables : Rien de publié » (30 lignes existent), « Vêtements et style : 3 collections » (109 lignes) | 3 (**corrigé v7.50**) |
| 17 | `style.html` : sous-navigation sans « Collections » | 3 (**corrigé v7.50**) |
| 18 | Images des lignes de catalogue : lien texte seulement | 3 (**corrigé v7.50**) |
| 19 | Galerie épinglée des fiches du monde : image suivante floutée alors qu’elle porte du texte (règle v7.39) | 3 (**corrigé v7.50**) |
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

Lots 1 à 3 livrés (v7.48, v7.49, v7.50). Prochaine action : lot 4 — pages dédiées sous `/carnets/` (garage, arsenal,
garde-robe, consommables avec stocks, personnalisations, propriétés, lieux, collectibles, calculs) sur `carnets-core.js`,
boutons « Voir mon… » vers ces pages, souhaits distincts (dont les styles gardés), tableau de bord Progression, SEO public
sans liste personnelle, anomalies 8 à 15 et 24 ; raccordements recherche, Léo, Tuto, accueil, navigation.
