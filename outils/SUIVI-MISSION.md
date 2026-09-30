# Suivi de la mission « calculateur, catalogues, Achats, carnets » (v7.48 → v7.54)

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
| 4 | v7.51 | Carnets de progression et raccordements | **fait** |
| 5 | v7.52 | Harmonisation, validation complète, livraison | **fait** |
| — | v7.53 | Revue de conformité au cahier des charges (après le lot 5) | **fait** |
| — | v7.54 | Deux audits (respect du cahier des charges ; intégration dans le dépôt du propriétaire), restauration du mode Expert de la v7.47, corrections | **fait** |

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

## Lot 4 (v7.51) — fait le 29/09/2026

**Besoin traité** : une vraie page par catégorie suivie, au lieu d’une carte de la page Progression ; « Voir mon garage »
mène au garage, « Voir mon arsenal » à l’arsenal, et ainsi de suite ; une seule progression, comptée pareil par les fiches,
les carnets, le tableau de bord, la carte et le calculateur. **Pages concernées** : 9 nouvelles pages `carnets/<id>.html`,
`progression.html`, les pages qui portent un bouton ou un lien « Voir mon… » (Véhicules, Armurerie, Vêtements et style,
Consommables, Personnalisations, Carte, Collectibles, Achats, fiches véhicules et armes), le calculateur, le Tuto, l’accueil,
Léo, la recherche. **Critères de réussite** : adresses stables ; vocabulaire juste (possédé, obtenu, goûté, porté, posé,
repéré, trouvé ; un lieu repéré n’est jamais « possédé ») ; envies distinctes des possessions ; vue « restants » au libellé
sans ambiguïté ; stocks sans quantité inventée et sans double comptage ; recherche, filtres, tri, nombre de résultats ;
retour arrière, rechargement et deux onglets sans écrasement ; aucune liste personnelle publiée ; page publique référencée.

Fichiers ajoutés :
- `outils/gen-carnets.cjs` (lancé par `regenerer.cjs` avant `sync-site.cjs`) : écrit les 9 pages, `carnets/lieux-data.js`
  (2 547 lieux en lignes compactes) et le bloc « Mes carnets » de `progression.html` (entre deux marqueurs).
- `outils/carnets-source.cjs` : éléments de chaque famille (nom, catégorie, lien vers la fiche ou la ligne du catalogue,
  vignette), identifiants calculés avec les règles de `sync-site.cjs` (un test vérifie qu’ils sont identiques à
  `progression-data.js`) ; `carnetOf` / `carnetHref` pour les liens « Voir mon… » des générateurs.
- `outils/carnets-editorial.json` : textes des 9 carnets (titre et description de référencement, introduction, vues,
  compteurs, états vides, « Comment marche ce carnet », questions fréquentes) ; aucun chiffre écrit à la main.
- `carnets.js` (page d’un carnet), `carnets.css` (carnets et tableau de bord).
- Tests : `outils/tests/carnets-v751.test.cjs` (15) ; `outils/tests/carnets-browser.cjs` (contrôles navigateur comptés).

Fichiers modifiés : `progression.html` / `progression.js` (tableau de bord : neuf cartes, une ligne par famille, envies,
stocks à renseigner, saisies à part, calculs ; les 14 cartes à listes dépliables et la section des acquisitions,
doublons des carnets, sont retirées), `progression-core.js` (brouillon de contact jamais exporté ni importé ; plus de
groupe pour les catégories alias), `carnets-core.js` (identifiants des lieux avec majuscules), `fiches.js` / `fiches.css`
(« Je le veux » et « Voir mon garage / arsenal » sur les fiches), gabarits des fiches (`carnets-core.js` chargé),
`outils/catalogues.cjs` (lien « Voir ma garde-robe »… sur la barre de chaque liste), `outils/hubs-editoriaux.cjs`,
`outils/templates/vehicules.html`, `armes.html`, `carte.html`, `collectibles.html`, `outils/gen-achats.cjs`,
`outils/catalogues/editorial.json`, `outils/editorial-hubs.json`, `outils/achats-editorial.json`,
`outils/informations-editorial.json`, `outils/lore-gen.js` (accueil, encart des planques), `outils/gen-tuto.cjs`,
`outils/leo-knowledge.json` (liens vers les carnets, 4 sujets ajoutés), `outils/site-shell.cjs` (menu : Progression active
sur les carnets ; puce « Mes carnets »), `outils/sync-site.cjs` (dossier `carnets/`, recherche interne, compteurs),
`calculateurs.js` / `calculateurs-plan.js` / `calculateurs-workspace.js` / `calculateurs.html` (« Classer mes envies »,
fiche d’un calcul par `?voir=`, achat déclaré fait rangé dans le carnet), `leo-core.js`.

Anomalies 8 à 15 et 24 corrigées :
- 8 : l’aperçu « Mon temps de jeu » de Léo passe par le moteur (`LKCalcEngine.inverse`) ;
- 9 : la carte des calculs lit `lk-calculator-notebooks-v3` (calculs et plans comptés à part) ;
- 10 : compteurs par famille écrits d’après les données (29 consommables, familles à trait d’union comprises) ;
- 11 : plus de `section#acquisitions` ouverte : sections équilibrées ; l’ancre `#acquisitions` reste ;
- 12 : les catégories alias ne créent plus de groupe homonyme d’une famille ; plus de carte qui les affiche ;
- 13 : `lk_contact_draft_v1` n’est ni exporté ni importé (règle `PRIVATE`) ;
- 14 : les 3 anciennes fiches hors liste n’ont plus de case « Ajouter à mon garage » (message et lien vers la liste) ;
- 15 : les 3 fiches planques ont l’encart calculateur (`type=hideout`) comme les demeures ;
- 24 : les pages s’appellent « Mon garage », « Mon arsenal »… ; « carnet » n’apparaît qu’en titre de famille.

Choix retenus :
- Page publique = présentation (ce que suit le carnet, catégories et nombres recensés, questions) : indexable, dans
  `sitemap.xml`, fil d’Ariane en données structurées. Ce que le joueur a coché est lu dans son navigateur, jamais écrit
  dans la page, les métadonnées ou la sitemap.
- Trois vues par carnet : ce que tu as (libellé du carnet : « Dans mon garage », « Goûtés », « Repérés »…), « Mes envies »
  (« À essayer », « À visiter »), et « Pas encore dans mon garage » / « Pas encore goûtés »… ; les collectibles n’ont pas
  d’envie (favoris affichés), les calculs ont « Mes calculs » et « Mes plans » en lecture.
- Vue, recherche et filtres dans l’ancre de l’adresse (`#vue=envies&q=…`) : retour arrière et rechargement retrouvent la
  même page ; pages de 48 cartes (« Afficher la suite »).
- Une envie n’est jamais une possession ; « Je l’ai » sur une envie la range et la retire des envies ; « Annuler » après
  chaque geste. Les éléments cochés mais absents de la liste restent dans « Saisies à part », jamais comptés.
- Stock (consommables, munitions) : noté à part de la case « obtenu » ; ancienne case = « stock à renseigner » ;
  « J’en ai utilisé un / racheté un » passe par le journal des réalisations (un événement par geste) ; un stock à zéro ne
  décoche rien ; le plan du calculateur ne touche jamais au stock.
- Propriétés et contenus : les 4 contenus documentés suivables ; les bateaux (renvois vers des véhicules) comptent au
  garage, jamais deux fois ; logements, planques et demeures achetables : « en attente du jeu », rien d’inventé.
- Calculateur : « Classer mes envies » ouvre « Quoi acheter d’abord ? » avec les envies (12 au plus) ; dans le business
  plan, un achat déclaré fait (« Pendant cette partie, j’ai acheté ») range le véhicule ou l’arme de la fiche dans son
  carnet, une seule fois (identifiant de la partie dans le journal) ; une prévision ne coche jamais rien.

Vérifications (lot 4) : `node --test` 567 / 567 ; `node outils/verifier.js` 0 erreur (47 745 références, 415 pages) ;
`gen-leo.cjs --check` à jour ; carnets au navigateur 92 / 92 (vues, possession, annulation, envies, recherche et adresse,
retour arrière, deux onglets, fiche, stock et journal, arsenal, lieux et carte, propriétés, collectibles, garde-robe,
tableau de bord, calculs et `?voir=`, envies classées, plan → garage une seule fois, lecture seule, téléphone sans
débordement, mouvement réduit, cibles tactiles) ; parcours calculateur 161 / 161, lot B 140 / 140, v2 142 / 142,
calculateurs 278 / 278, Léo tenu (0 erreur), Contact ; audit navigateur `--rapide` (26 pages dont 3 carnets, 7 largeurs) :
0 débordement, 0 grille décentrée, 0 texte coupé, 0 contraste insuffisant, 0 erreur console (restent les 2 défauts
antérieurs hors lot : repères de 19 px de `carte.html`, image agrandie de l’accueil à 1 920 px → lot 5) ; captures bureau
et téléphone (`captures-v7.51/`).

## Lot 5 (v7.52) — fait le 29/09/2026

**Besoin traité** : que tout le site dise la même chose (vocabulaire, chiffres, visuels, mouvement, parcours entre sections),
corriger ce qui reste, prouver chaque point par une vérification réellement lancée, livrer. **Pages concernées** : toutes
celles de la mission (calculateur, Véhicules, Armurerie, Vêtements et style, Consommables, Personnalisations, Achats,
Progression, 9 carnets, carte, fiches véhicules et armes, accueil, Tuto) et les pages partagées (feuilles communes,
recherche, Léo). **Critères de réussite** : aucune anomalie ouverte dans l’inventaire ; un critère changé se répercute
partout ; même total partout ; aucune violation d’accessibilité automatique (WCAG A / AA) ; aucun débordement, texte coupé,
contraste insuffisant ou erreur de script sur les largeurs contrôlées ; captures relues.

Fichiers ajoutés : `outils/tests/validation-v752.test.cjs` (6 tests), `outils/tests/accessibilite-perf-browser.cjs`
(axe-core + mesures), `outils/tests/mots-coupes-browser.cjs` (mots coupés au milieu, 38 pages × 5 largeurs), `outils/CARNETS-CORRESPONDANCE.md`, `outils/PREUVES-v7.52.md`, `outils/CHANGEMENTS-v7.52.txt`,
`LISEZ-MOI-v7.52.txt`. Fichier supprimé : `calculateurs-tools.js`.

Fichiers modifiés : `style.css` (`--font-mono`, cible des repères de carte) et les feuilles qui citaient la police
(`acquisitions.css`, `calculateurs-brand.css`, `calculator-entry.css` — scène d’accueil non étirée —, `carnets.css`,
`collectibles-brand.css`, `informations.css`, `leo.css`, `tuto.css`), `calculateurs.js` (`LKCalcOwned`, événements retirés),
`calculateurs-scenario.js` (`addAsset` : possession déclarée), `calculateurs-engine.js` (raison chiffrée quand la réserve
empêche de démarrer), `calculateurs-plan.js` (avertissement « Ce plan touche à tes … gardés de côté »),
`calculator-entry.js`, `outils/sync-site.cjs` et `outils/carnets-source.cjs` (noms de lieux en texte simple),
`outils/gen-carnets.cjs` (libellé des lignes du tableau de bord), `outils/gen-achats.cjs`, `outils/lore-gen.js` (scripts
inutiles retirés des fiches du monde), `outils/gen-acquisitions.cjs` (pastilles et légende « En un regard », lieux
homonymes), `outils/catalogues.cjs` et `outils/fiche-doc.cjs` (lieux homonymes), `acquisitions.css` (tableau des listes,
grille des adresses), `tuto.css`, six scripts passés à la typographie, `outils/CALCULATEUR-V2.md`, `outils/MATRICE-COUVERTURE.md`, `README.md` ; tests
adaptés (`calculateurs-integration`, `calculateurs-v747`, `carnets-browser`).

Anomalies 20 à 23 et 25 à 34 corrigées :
- 20 : `--font-mono` (chasse fixe du système) remplace la police jamais hébergée, dans toutes les feuilles et la page Achats ;
- 21 : `lk-showcase.js` n’est plus chargé que là où la page l’utilise (`data-showcase`) ; `carnets-core.js` sorti des fiches
  du monde ;
- 22 : `calculateurs-tools.js` supprimé (retiré des listes de scripts des tests) ; `CALCULATEUR-V2.md` à jour ;
- 23 : les événements du calculateur sans écouteur et leur fonction d’émission sont retirés ;
- 25 : entités HTML décodées à la génération (`carte-gtadb.js`, `search-lieux.js`, `carnets/lieux-data.js`) ; la source
  GTADB reste intacte ; test et capture (`carte-lieu-guillemets-1280.png`) ;
- 26 : le moteur donne la vraie raison ; l’interface du plan l’affiche en tête avec le point bas ;
- 27 : `LKCalcOwned` : possession déclarée = « déjà possédé » au calculateur, dit en une phrase, décochable ;
- 28 : repères de carte avec zone de 24 × 24 px ; scène d’accueil limitée à 1 280 px et fondue sur les côtés.
- 29 : pastille dessinée (même dessin que la légende), texte masqué « Statut : … » et bulle ; légende calculée d’après les
  statuts présents ;
- 30 : bouton de suivi sans coupure, case gardée en cellule de tableau, largeurs de colonnes revues (et entre 901 et
  1 100 px) ;
- 31 : grille « Les adresses » à deux colonnes sous 1 000 px, une sous 700 px ;
- 32 : tableau du Tuto sans coupure, lu en deux temps sur téléphone ;
- 33 : « Xero Gas Station (2 lieux) » dans les cartes et la fiche documentaire ; liens numérotés dans la liste ;
- 34 : `outils/typographie.cjs` passé sur les six scripts ; trois tests acceptent l’espace insécable.

Choix retenus :
- Pas de police à chasse fixe téléchargée : le rendu affiché aux joueurs depuis toujours (chasse fixe du système) devient la
  règle écrite ; aucun octet de plus.
- Le calculateur lit la possession par une seule fonction de page (`LKCalcOwned`) ; le moteur et le scénario restent sans
  accès au stockage (une prévision ne peut toujours rien cocher).
- Données tierces : la source brute est conservée telle quelle (traçabilité, licence) ; le nettoyage se fait à la
  génération et un test le protège.
- Vérifications de performance mesurées sur le serveur local sans compression (plafond haut) ; aucun budget inventé : les
  chiffres sont consignés tels quels dans les preuves.

Vérifications (lot 5) : voir `outils/PREUVES-v7.52.md` (chiffres complets). Résumé de la dernière passe complète : tests `node` 573 / 573 ; `verifier.js` 0 erreur (47 710 références, 415 pages) ; carnets 94 / 94, parcours 161 / 161, lot B 140 / 140, v2 142 / 142, calculateurs 278 / 278, Léo et Contact tenus ; audit 26 pages / 182 chargements sans défaut (0 cible < 24 px, 0 image étirée) ; axe-core 0 violation sur 44 chargements ; 0 mot coupé sur 190 chargements ; 45 captures relues.

## Revue de conformité (v7.53) — faite le 29/09/2026, après le lot 5

**Pourquoi** : les cinq lots ont été faits dans une même conversation ; le propriétaire a demandé de revérifier que tout
respecte le cahier des charges, et a fourni son dépôt (`Leonidadex-main`). **Base** : ce dépôt est identique, octet pour
octet, à la v7.47 ; « v7.47 + archive v7.52 − `calculateurs-tools.js` » redonne exactement la v7.52 (vérifié).

**Méthode** : relecture ligne à ligne du cahier des charges par un vérificateur indépendant (qui n’avait pas fait le
travail) : 111 exigences, chacune rapprochée du code et des pages, pas des documents. Chaque écart a été revérifié ici avant
correction ; deux points ont été jugés conformes après examen (voir plus bas).

Écarts corrigés (anomalies 35 à 55) : voir le tableau des anomalies. Les principaux :
- Tuto : textes remis à jour avec la version finale (sens du but, frais obligatoires, déjà possédé, coût d’usage, besoin,
  ordres comparés et dépendances, budget « au plus », prévu / commencé / fait…) ; encart « Ce que le calcul prend en compte »
  par outil, dont la liste vient du registre du modèle ; les six parties de « Ce qui compte dans ce calcul » expliquées ;
  26 captures refaites sur la version finale, chacune avec l’exemple de son chapitre ; chaque « Essayer » et chaque exemple
  vérifiés au navigateur (`tuto-essayer-browser.cjs`) ; la légende « certains champs ont changé de place » retirée.
- Business plan : trois états distincts, « Prévu / Commencé / Déjà fait (ou déjà à moi) » pour les missions uniques et les
  achats d’avant, et un état du plan (PRÉVU, COMMENCÉ, RÉALISÉ) ; « commencé » ne crédite rien.
- Comparaison : un coût d’usage laissé vide face à une option qui en a un est « non renseigné » (comparaison ouverte), plus
  « sans objet ».
- Recherche d’ordre : exhaustive jusqu’à 6 achats, recherche locale au-delà (identique à l’exhaustif sur 200 cas tirés au
  sort) ; pire cas mesuré au navigateur, processeur ralenti ×4, 390 px : 125 ms par saisie (plan maximal), 60 ms (12 achats).
- Carte : aucun temps de trajet par défaut ; simulation à la demande, dite « vitesses de GTA V ».
- Recherche du site : une entrée par calcul et pour le business plan ; Léo : même règle de possession que le calculateur ;
  listes et envies → « Mon budget » (prix à venir, jamais 0) ; budget : cinq postes visibles ; zoom 400 % et fenêtres basses.

Jugés conformes après examen : les phrases de catégorie de `outils/redaction.cjs` (« dans la série… ») décrivent la série,
pas des performances de GTA VI ; l’absence de visuels 4K est une limite des sources disponibles (le plus grand visuel
officiel du dépôt fait 1 280 px), désormais écrite dans les preuves.

Vérifications (v7.53) : voir `outils/PREUVES-v7.53.md`. Résumé de la dernière passe complète : tests `node` 586 / 586 ; `verifier.js` 0 erreur (47 643 références, 415 pages) ; carnets 94 / 94, parcours 161 / 161, lot B 140 / 140, v2 142 / 142, calculateurs 278 / 278, Léo tenu à la relance isolée (1 requête d’image interrompue à la fermeture d’une page dans la passe complète, non reproduite), Contact tenu ; audit 26 pages / 182 chargements sans défaut (0 cible < 24 px, 0 image étirée) ; axe-core 0 violation sur 44 chargements ; 0 mot coupé sur 190 chargements ; zoom et fenêtres basses 56 / 56 ; Tuto 22 / 22 ; 53 captures relues.

## Audits et restauration du mode Expert (v7.54) — faits le 30/09/2026

**Pourquoi** : le propriétaire a ajouté les archives v7.48 à v7.53 à son dépôt et a demandé deux audits complets : (1) le
cahier des charges a-t-il été respecté ? (2) tout a-t-il bien été ajouté ? Il a aussi signalé que le mode Expert du
calculateur « n’est plus comme avant » : les consignes du cahier des charges ajoutaient des options, elles ne demandaient
pas d’en retirer ; les sous-parties disparues (« Et si… », etc.) devaient revenir **à côté** des ajouts.

**Audit 2 (intégration)** : son dépôt (`Leonidadex-main`, 30/09) est identique à la v7.53, fichier pour fichier, sauf
`calculateurs-tools.js` qui n’a pas été supprimé (aucune page ne le charge ; sans effet tant qu’il reste). Rien à reprendre.

**Audit 1 (cahier des charges)** : relecture par un vérificateur indépendant, 281 exigences rapprochées du code et des
pages en exécutant les calculs : 195 conformes, 71 partielles, 8 non conformes, 7 invérifiables (données de jeu absentes).
Quatre écarts bloquants (business plan), treize importants, une liste de mineurs. Rapport remis à part
(`AUDIT-Leonidakit-v7.53.md`, hors dépôt). Tout écart corrigé ici a été reproduit avant correction.

**Inventaire du mode Expert, v7.47 contre v7.53** (relevé au navigateur, huit outils, deux états chacun) — ce qui manquait
vraiment et revient en v7.54, sans retirer les ajouts des lots :
- « Quoi acheter d’abord ? » : le bloc **« Comparer des ordres selon le délai »** (ton ordre saisi, l’inverse, les prix
  croissants, le meilleur trouvé, côte à côte : temps de jeu, argent au plus bas, premier gain) avec ses deux boutons
  « Appliquer l’ordre inverse » et « Trier par prix croissant ». Il vit à côté du « Ce qui compte dans ce calcul » du lot 2.
- Le point **« Et si le chiffre bouge de 20 % ? »** reste affiché quand le panier ou la comparaison est vide : il dit quoi
  écrire (« pas encore calculable ») au lieu de disparaître.
- « Quel achat choisir ? » : la ligne **« Temps pour regagner le prix »** du tableau côte à côte.
- « Ce qui compte dans ce calcul » : les **chiffres clés au premier niveau avec leur bouton « Modifier »** (le détail replié
  les garde aussi).
- Comparateur (`comparateur.html`) : le lien **« Lequel puis-je acheter ? »** (Mes achats) revient à côté de « Quel achat
  choisir ? » ; la carte 05 de `calculateurs.html` redit que plusieurs ordres réalisables sont comparés.
- Les autres points relevés par le propriétaire (« Et si je gagne plus, ou moins ? » de Mon objectif, la case « Afficher
  plus de détails » du plan, le bouton « Voir les réglages avancés ») ont été retirés **avant** la mission (v7.46 → v7.47,
  chasse aux doublons) : ils ne font pas partie de cette restauration ; leur contenu existe ailleurs (« Et si le chiffre
  bouge de 20 % ? », points repliables, « Voir en mode Expert »). À remettre sur demande.

**Écarts bloquants corrigés (business plan)** :
1. Parcours sans durée de partie : à chaque étape le moteur compare « lancer maintenant » et « attendre la mission la plus
   rentable » (gain par minute, attente comprise), puis compare le parcours complet aux parcours qui laissent une mission de
   côté (toutes les combinaisons jusqu’à 4 missions, les meilleures ensuite) ; s’il en trouve un plus rapide, il le prend et
   le dit (« Parcours le plus rapide en laissant de côté… »). Le cas de l’audit passe de 1 h 11 à 25 min ; le tirage de
   l’audit rejoué (500 plans) : plus aucun n’est battu par un sous-ensemble (171 avant) ; le test du dépôt en rejoue 200.
2. Priorités « sécurité » et « le moins coûteux » : jamais un plan qui passe sous l’argent de côté. S’il n’en existe aucun,
   le plan est **bloqué et l’explique** (frais de la première mission, ce qu’il reste d’utilisable, et le plan qui existe en
   puisant dans la réserve, à choisir explicitement avec « Le plus vite possible »), avec deux boutons de sortie ; plus de
   phrases contradictoires (« jamais sous… » / « touche à tes… »).
3. Munitions simulées : ajoutées aux frais de chaque tentative du plan (comme dans Mes activités), dites dans « Ce qui compte »
   (chiffre marqué SIMULATION) et dans « Ce qui ferait changer la réponse » ; la note de portée des hypothèses le dit.
4. « Reprendre mes chiffres de Mes calculs » copie tout : groupe (joueurs), dépenses par partie, sens du but, coût d’usage
   par achat, gain d’un achat (personnel ou issu de « Ça vaut le coup ? »), dépendances entre achats, joueurs et dépendances
   des missions ; une option inconnue reste inconnue. Nouveau champ « Nous jouons à (joueurs) » : une mission qui demande
   plus de joueurs est écartée et c’est dit. (Le champ était perdu à l’enregistrement — trouvé au contrôle visuel des
   captures ; corrigé, test ajouté.)

**Écarts importants corrigés** : prix inconnu dans « Quel achat choisir ? » (option gardée, réponse « partielle » qui le
dit, jamais « chacune gagne sur un point » à tort) ; l’envie n’est plus notée par le site (facultative, « — pas notée » ;
sans note, la réponse par défaut devient « le moins cher », et c’est dit) ; chiffres d’exemple étiquetés EXEMPLE et bandeau
« CALCULÉ AVEC LES EXEMPLES » tant que rien n’a été changé ; Mon budget : un coût d’usage non confirmé n’est ni compté ni
tu (flux « incomplet ») ; tentatives ratées chiffrées dans Mon objectif (missions) et Mon temps de jeu, munitions dites dans
« Ce qui compte » de Mon temps de jeu, registre à jour ; plan : « Achat à confirmer » reste écrit dans la réponse, « Il te
restera, but acheté » distinct de « Tu auras à la fin » ; « Quoi acheter d’abord ? » : un prérequis retiré du panier bloque
l’achat qui en dépend avec un message ; plan : priorité « Le moins coûteux sur tout le parcours », liens vers la fiche de
chaque achat du parcours, hypothèses écrites dans l’export ; fiches : armes de mêlée et de jet « sans objet » (chargeur,
rechargement, munitions), BMX / vélos / kayak / train « sans objet » (carburant), phrase de la batte réécrite (plus de
« sans limite de place »), Armurerie cohérente (« nombre exact d’armes de poing à confirmer ») ; Collectibles renvoie au
carnet dédié ; carnets : repères de la série (GTA V, GTA Online) marqués « Repère de la série » et comptés à part ; liste
ouverte depuis un carnet : ligne visible sous les bandeaux, « Fiche complète » ouverte ; Léo : « combien de temps pour
1 000 000 $ » est un objectif, « entre la Cheetah et l’Emperor » garde les deux.

**Mineurs corrigés** : « À compléter : Un chiffre » remplacé par un libellé qui dit quoi (Parcours à compléter, À écrire,
Blocage, À corriger) ; égalité « le moins cher sur la durée » départagée par le nom ; « Effet sur la vie » écarté d’un
véhicule dit « sans objet » ; `progression.html` fonctionne (en mémoire, avec un avis) quand le stockage est bloqué ;
« Coût sur ? parties » remplacé par une ligne qui dit quoi écrire ; matrice et correspondance des carnets retitrées, les
trois affirmations fausses de la matrice corrigées.

**Mineurs non corrigés (limites connues, écrites dans les preuves)** : solutions équivalentes « l’un ou l’autre » et rôle
d’achat (remplace, débloque, améliore) sans effet dans le plan ; pas de case « ce que l’étape débloque » ni de plafond de
production ; besoin « chargement » sans saisie ; objet obtenu par récompense non modélisé ; coûts par utilisation sans
case ; registre sans provenance par facteur ; « Effacer l’historique » sans confirmation ; « J’ai déjà » partagé entre
outils sans le dire ; silhouettes de véhicules sans le mot « schéma » ; une seule erreur d’adresse affichée à la fois ;
localisateur « VCMM Train » relié à 7 concessions (relation non confirmée, signalée).

Vérifications (v7.54) : voir `outils/PREUVES-v7.54.md`. Résumé de la dernière passe complète : tests `node` 599 / 599 ; `verifier.js` 0 erreur (47 651 références, 415 pages) ; carnets 94 / 94, parcours 161 / 161, lot B 140 / 140, v2 142 / 142, calculateurs 278 / 278, Léo tenu, Contact tenu ; audit 26 pages / 182 chargements sans défaut (0 cible < 24 px, 0 image étirée) ; axe-core 0 violation sur 44 chargements ; 0 mot coupé sur 190 chargements ; zoom et fenêtres basses 56 / 56 ; Tuto 22 / 22 ; 85 captures relues (36 contrôles du texte affiché, 0 en échec). Anomalies 56 à 70 dans le tableau.

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
| 8 | Léo « Mon temps de jeu » : formule propre au lieu du moteur | 4 (**corrigé v7.51**) |
| 9 | Progression : carte « Calculs enregistrés » lit l’ancienne clé (toujours « Aucun calcul ») | 4 (**corrigé v7.51**) |
| 10 | `sync-site.cjs` : compteur des consommables « 0 / 30 » au lieu de 29, familles perso ignorées (le JS corrige) | 4 (**corrigé v7.51**) |
| 11 | `progression.html` : `section#acquisitions` jamais fermée | 4 (**corrigé v7.51**) |
| 12 | Identifiants `tatouages` / `munitions` à la fois catégorie d’acquisition et famille (chiffres mélangés) | 4 (**corrigé v7.51**) |
| 13 | L’export du suivi emporte le brouillon de Contact (`lk_contact_draft_v1`, adresse e-mail) | 4 (**corrigé v7.51**) |
| 14 | 3 fiches véhicules hors liste portent « Ajouter à mon garage » sans être comptées | 4 (**corrigé v7.51**) |
| 15 | Fiches planques sans encart calculateur alors qu’elles sont dans le catalogue du calculateur | 4 (**corrigé v7.51**) |
| 16 | Page Achats : aucun visuel, « Consommables : Rien de publié » (30 lignes existent), « Vêtements et style : 3 collections » (109 lignes) | 3 (**corrigé v7.50**) |
| 17 | `style.html` : sous-navigation sans « Collections » | 3 (**corrigé v7.50**) |
| 18 | Images des lignes de catalogue : lien texte seulement | 3 (**corrigé v7.50**) |
| 19 | Galerie épinglée des fiches du monde : image suivante floutée alors qu’elle porte du texte (règle v7.39) | 3 (**corrigé v7.50**) |
| 20 | « JetBrains Mono » citée 19 fois mais non hébergée (monospace du système) | 5 (**corrigé v7.52**) |
| 21 | `lk-showcase.js` chargé pour rien sur les hubs du monde et Médias | 5 (**corrigé v7.52**) |
| 22 | `calculateurs-tools.js` chargé par aucune page ; `outils/CALCULATEUR-V2.md` dépassé | 5 (**corrigé v7.52**) |
| 23 | Événements `lk:calculator` / `leonidakit:calculator` sans écouteur | 5 (**corrigé v7.52**) |
| 24 | Le mot « carnet » désigne déjà le carnet des Collectibles et les enregistrements du calculateur : les nouvelles pages s’appellent « Mon garage », « Mon arsenal »… ; le mot « carnet » n’est utilisé qu’en titre de famille | 4 (**corrigé v7.51**) |
| 25 | (trouvée au lot 5, relecture des captures) Noms de lieux GTADB affichés en entités HTML (« &quot;Ambrosia Hills&quot; », « &amp; ») sur la carte, dans la recherche et dans « Mes lieux repérés » : 27 noms entre guillemets, 84 « & » | 5 (**corrigé v7.52**) |
| 26 | (trouvée au lot 5, test de validation) Plan qui ne tient qu’en touchant à la réserve : dit seulement dans le détail des stratégies, avec une raison fausse (« aucune mission ne rapporte plus que ses frais ») | 5 (**corrigé v7.52**) |
| 27 | (trouvée au lot 5) Un véhicule ou une arme déjà coché dans un carnet est recompté comme un achat à payer dans le calculateur | 5 (**corrigé v7.52**) |
| 28 | (audit v7.47, hors mission) Repères de la carte de 19 px (cible < 24 px) ; image d’accueil agrandie à 1 960 px sur écran de 1 920 px | 5 (**corrigé v7.52**) |
| 29 | (lot 5, captures) Consommables « En un regard » : pastilles de statut des cartes invisibles (sans taille), légende sans « À confirmer », statut non dit aux lecteurs d’écran | 5 (**corrigé v7.52**) |
| 30 | (lot 5, captures) Listes : « Obtenu » coupé en « Obten / u » ; case de suivi sortie du tableau (fond interrompu, cadre rouge des cartes) ; « Ne s’achète pas » et « Officiel » coupés entre 901 et 1 100 px | 5 (**corrigé v7.52**) |
| 31 | (lot 5, contrôle des mots coupés) « Les adresses » (Vêtements et style) en trois colonnes de 109 px sur téléphone | 5 (**corrigé v7.52**) |
| 32 | (lot 5, contrôle des mots coupés) Tuto, tableau des statuts : mots coupés au milieu de 320 à 1 024 px | 5 (**corrigé v7.52**) |
| 33 | (lot 5, captures) « Xero Gas Station · Xero Gas Station » : deux lieux du même nom écrits deux fois sans distinction | 5 (**corrigé v7.52**) |
| 34 | (lot 5, typographie) Six scripts sans espaces insécables avant « : ; ? ! » (modèle, collectibles, contact, Léo, suivi) | 5 (**corrigé v7.52**) |
| 35 | (revue) Tuto non mis à jour : textes d’avant la mission (« Comparer des ordres selon le délai », « Me fait gagner en plus »…), captures anciennes avec la légende « certains champs ont changé de place », « Essayer » non vérifiés | revue (**corrigé v7.53**) |
| 36 | (revue) Un coût d’usage vide face à une option qui en a un était « sans objet » : l’option sans chiffre pouvait gagner à tort sur la durée | revue (**corrigé v7.53**) |
| 37 | (revue) Business plan sans état « commencé » entre prévu et réalisé | revue (**corrigé v7.53**) |
| 38 | (revue) Panier vide : « Ordre proposé : : 0 min de jeu au total » et « Et si… de 0 min à 0 min » | revue (**corrigé v7.53**) |
| 39 | (revue, antérieur à la mission) Carte : temps de trajet affichés par défaut avec des vitesses de GTA V | revue (**corrigé v7.53**) |
| 40 | (revue) Recherche d’ordre exhaustive à 7 achats : environ 200 ms par saisie sur ordinateur, sans état ni interruption | revue (**corrigé v7.53** : bornée, mesurée) |
| 41 | (revue) Recherche du site : une seule entrée pour tout le calculateur | revue (**corrigé v7.53**) |
| 42 | (revue) Léo : l’aperçu d’achat ignorait la possession du garage et ne disait pas ce qu’il ne compte pas | revue (**corrigé v7.53**) |
| 43 | (revue) Listes (style, consommables) : rien n’était transmis au budget | revue (**corrigé v7.53**) |
| 44 | (trouvée pendant la revue) Budget réparti à la main : un seul poste visible, les quatre autres comptés sans être montrés | revue (**corrigé v7.53**) |
| 45 | (trouvée pendant la revue) Comparaison de Mes achats : catégories affichées en identifiants bruts (« melee », « muscle ») | revue (**corrigé v7.53**) |
| 46 | (revue) Courbes des options : le motif « réalisé » pouvait être donné à une option prévue | revue (**corrigé v7.53**) |
| 47 | (revue) Sélecteur « Où le trouver » : vignettes de scène où le véhicule n’est pas reconnaissable | revue (**corrigé v7.53**) |
| 48 | (trouvée pendant la revue) Zoom 400 % et fenêtres basses : en-tête collé couvrant jusqu’à 67 % de l’écran | revue (**corrigé v7.53**) |
| 49 | (revue) Bandeau d’exemples ambigu, libellé « Comparer les deux ordres », business plan absent des entrées de l’accueil | revue (**corrigé v7.53**) |
| 50 | (revue) Messages du calculateur annoncés deux fois aux lecteurs d’écran | revue (**corrigé v7.53**) |
| 51 | (revue) Capture de livraison avec une image différée restée vide ; en-tête posé au milieu de captures hautes | revue (**corrigé v7.53**) |
| 52 | (trouvée à la relecture des captures) Mode Simple : « Changé en mode Expert : argent de côté… » alors que ce champ est dans le formulaire Simple (sauf « Mon objectif », où il est replié) | revue (**corrigé v7.53**) |
| 53 | (trouvée à la relecture des captures, déjà dans la base v7.47) Véhicules : bandeau des marques sous l’en-tête resté une bande noire vide (il lisait l’index de recherche, que la page ne charge pas) | revue (**corrigé v7.53**) |
| 54 | (trouvée à la relecture des captures) « Quel achat choisir ? » : à égalité sur un critère (deux achats payables tout de suite pour « le plus vite »), le premier de la liste gagnait ; réordonner changeait le gagnant | revue (**corrigé v7.53**) |
| 55 | (revue) Captures de livraison : lignes de tableau et figures qui apparaissent au défilement restées vides dans les captures hautes | revue (**corrigé v7.53**) |
| 56 | (propriétaire) Mode Expert : « Comparer des ordres selon le délai » (ordre saisi, inverse, prix croissants) et ses deux boutons retirés au lot 2 | v7.54 (**restauré**, à côté de « Ce qui compte ») |
| 57 | (propriétaire) Mode Expert : « Et si le chiffre bouge de 20 % ? » disparaissait panier ou comparaison vide | v7.54 (**restauré** : dit quoi écrire) |
| 58 | (propriétaire) « Quel achat choisir ? » : ligne « Temps pour regagner le prix » retirée ; chiffres clés sans « Modifier » au premier niveau ; comparateur sans « Lequel puis-je acheter ? » | v7.54 (**restauré**) |
| 59 | (audit, bloquant) Plan sans durée de partie plus lent qu’en retirant une mission (171 cas sur 500), sans avertissement | v7.54 (**corrigé** : attente rentable, sous-ensembles comparés, dit) |
| 60 | (audit, bloquant) Priorité « sécurité » : plan recommandé puisant dans l’argent de côté, deux phrases contradictoires | v7.54 (**corrigé** : plan bloqué et expliqué, sorties proposées) |
| 61 | (audit, bloquant) Munitions simulées annoncées mais sans effet dans le plan | v7.54 (**corrigé**) |
| 62 | (audit, bloquant) « Reprendre mes chiffres » perdait joueurs, dépenses, coût d’usage, dépendances, gain, sens du but ; le plan imposait 1 joueur | v7.54 (**corrigé** : champ « Nous jouons à », import complet) |
| 63 | (audit) « Quel achat choisir ? » : prix inconnu retiré en silence ; envie notée 3/5 par le site ; exemples étiquetés « ton chiffre » | v7.54 (**corrigé**) |
| 64 | (audit) Mon budget : coût d’usage non confirmé compté 0 et flux dit complet ; tentatives ratées sans effet dans Mon objectif et Mon temps de jeu ; munitions absentes de « Ce qui compte » (temps de jeu) | v7.54 (**corrigé**) |
| 65 | (audit) Plan : « Achat à confirmer » effacé de la réponse ; « Tu auras à la fin » contre « il te restera » ; pas de priorité « le moins coûteux sur tout le parcours » ; parcours sans lien vers les fiches ; export sans hypothèses | v7.54 (**corrigé**) |
| 66 | (audit) « Quoi acheter d’abord ? » : prérequis retiré du panier, l’achat dépendant proposé seul sans message | v7.54 (**corrigé**) |
| 67 | (audit) Fiches : mêlée / jet « à confirmer » pour chargeur, rechargement, munitions ; carburant du BMX et du kayak ; batte « sans limite de place » ; Armurerie contradictoire | v7.54 (**corrigé**) |
| 68 | (audit) Collectibles : liens vers une ancre de la page au lieu du carnet ; carnets : repères de GTA V / Online comptés comme GTA VI sans mention ; ligne ouverte depuis un carnet cachée sous les bandeaux | v7.54 (**corrigé**) |
| 69 | (audit) Léo : montant d’objectif pris pour un prix ; deux achats nommés réduits à un seul | v7.54 (**corrigé**) |
| 70 | (audit, mineurs) « À compléter : Un chiffre » ; égalité sur la durée par l’ordre de la liste ; `progression.html` sans stockage ; « Coût sur ? parties » ; matrice fausse sur trois points et titres v7.52 | v7.54 (**corrigé**) ; autres mineurs listés comme limites |

## Blocages connus

- Aucune donnée officielle de prix, de performance, de coût d’usage, d’effet chiffré ou d’emplacement par objet n’est
  publiée pour GTA VI : les analyses fonctionnent avec les chiffres du joueur ou des hypothèses choisies, signalées.
- rockstargames.com et la plupart des sites ne sont pas joignables depuis l’atelier (seul le proxy des outils de recherche
  répond) : les médias ajoutés viennent de `img/officiel/` et de `photos/` (gtadb, CC BY 4.0) déjà dans le dépôt.

## Point de reprise

Mission terminée, revérifiée (v7.53), puis auditée et corrigée (v7.54) : lots 1 à 5 (v7.48 à v7.52), revue de conformité
(v7.53), deux audits et restauration du mode Expert (v7.54). Archive cumulée depuis la v7.47 : `Leonidakit-v7.54-modifs.zip`,
avec une suppression à faire (`calculateurs-tools.js`, toujours présent dans le dépôt du propriétaire au 30/09). La mise en
ligne est une étape à part, faite par le propriétaire du site (voir `LISEZ-MOI-v7.54.txt`). Pour une reprise : repartir de
la v7.54, lire ce fichier, `outils/MATRICE-COUVERTURE.md` et `outils/PREUVES-v7.54.md` ; les données de jeu encore à venir
sont listées dans les preuves : dès qu’une source officielle les publie, les saisir dans les données sources puis
`node outils/regenerer.cjs`, `node outils/verifier.js`, les tests, et refaire les captures du Tuto
(`python3 outils/tuto-shots.py .`) si l’interface change. Sur demande du propriétaire : remettre les trois éléments retirés
avant la mission (« Et si je gagne plus, ou moins ? » de Mon objectif, « Afficher plus de détails » du plan, « Voir les
réglages avancés »).
