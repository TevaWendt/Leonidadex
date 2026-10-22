# Leonidakit : rapport d’audit des livraisons v8.02, v8.03 et v8.04

Écrit le 21 octobre 2026, pour une relecture complète par une autre intelligence artificielle. Il décrit tout ce qui a changé
depuis la v8.01 (branche main, commit 21b210d4) : ce que Téva a demandé, ce qui a été fait, dans quels fichiers, avec quelles
preuves, et comment rejouer chaque contrôle. Le tout est livré en archives « modifs » (voir plus bas).

Conventions : « $racine » est la racine du dépôt ; les chemins sont relatifs à elle. Les chiffres viennent des journaux de
contrôle de la livraison finale (section 12), pas d’estimations.

---

## 0. Mode d’emploi pour la relecture

### 0.1 Ce qui a été livré, et comment

| Version | Contenu |
|---|---|
| v8.02 | Calculateur, lot 1 : ponts de données, conditions de lancement des missions |
| v8.03 | Calculateur, lot 2 : sept réglages en plus, tous éteints par défaut |
| v8.04 | Refonte des six pages ; informations vérifiées au 20 octobre 2026 ; grille des statuts sur tout le site ; chiffres du site et géolocalisation ; Léo dans les six langues ; référencement ; formats du jour J et prompt 2 ajusté ; ajouts du 21 octobre (fiches, « En lien », hubs, Collectibles, jeux, Atelier 3D) ; ce rapport |

La v8.02 et la v8.03 ont d’abord été rendues en archives « modifs », mais elles n’ont jamais été poussées : le dépôt GitHub
était encore à la v8.01. Le 21 octobre, Téva a autorisé, pour cette fois seulement, un envoi direct sur main ; l’envoi a été refusé, la session
n’ayant pas d’accès GitHub lié. Les trois versions sont donc livrées ensemble en archives « modifs » : tous les fichiers
ajoutés ou modifiés depuis 21b210d4 (git diff --name-only 21b210d4), aucun fichier supprimé. Téva les décompresse à la
racine du dossier et pousse depuis GitHub Desktop ; Vercel met le site en ligne à partir de ce commit.

Presque toutes les pages changent : common.js porte la version des fichiers de Léo (« common.js?v=… »), qui suit le moteur du
calculateur et les données de Léo ; chaque page change donc d’une empreinte. C’est le fonctionnement normal du site (cache des
navigateurs et du service worker), pas une réécriture inutile.

### 0.2 Rejouer les contrôles

Depuis $racine, Node 22 :

| Contrôle | Commande | Résultat attendu |
|---|---|---|
| Régénération complète | `node outils/regenerer.cjs` (≈ 45 min ; voir 13.2 : sync-site demande maintenant ≈ 6 Go de tas, et un second passage) | aucun « ÉCHEC » |
| Liens, ancres, fichiers | `node outils/verifier.js` | 0 erreur |
| Référencement | `node outils/referencement.cjs --tout` | 0 défaut bloquant, 0 avertissement |
| Couverture des pages | `node outils/couverture-pages.cjs` | 0 page manquante |
| Traductions | `node outils/langues.cjs --verifier en` (puis es, it, de, pt) | 0 manque, 0 repère cassé, 0 conflit |
| Calculateur inchangé réglages éteints | `node outils/tests/reference-v801.cjs` | 851 résultats, 0 écart |
| Cadre du calculateur | `node --test outils/tests/calculateurs-cadre.test.cjs` | réussi (seules des lignes ajoutées en Expert) |
| Léo | `node outils/gen-leo.cjs --check` puis `node outils/tests/leo-eval.cjs` | 512/512, hors sujet refusés 39/39 |
| Tests | `node --test outils/tests/<fichier>.test.cjs`, un fichier à la fois (langues.test.cjs avec `--max-old-space-size=5600`) | 101 fichiers, 1 296 tests réussis, 0 échec |
| Écrans (16 largeurs) | `NODE_PATH=<playwright> LK_CHROMIUM=<chromium> node outils/tests/ecrans-browser.cjs <sortie>` (LK_ECRANS_LANGUE=de pour l’allemand) | 0 défaut |
| Mouvement, mouvement réduit, sans script | `LK_PAGES=prix.html,verification.html,… node outils/tests/v7871-browser.cjs <sortie>` | « Tout est bon. » |
| Langues dans le navigateur | `LK_LANGUE=de node outils/tests/audit-langues-browser.cjs <sortie>` | 0 mot français, 0 erreur |
| Latence | `node outils/tests/latence-browser.cjs <arbre v8.01> <arbre v8.04> <sortie.json> prix.html …` | voir 12.6 |
| Formats du jour J | `node outils/jour-j-controle.cjs` | sans donnée publiée : « Le site connaît 0 prix publié », aucune erreur de forme |

Deux contrôles de la section 12 ont été faits avec des scripts de travail qui ne sont pas dans le dépôt (accessibilité, signes
d’écriture automatique) : leurs règles exactes sont écrites en 12.4 et 12.5 pour qu’on puisse les refaire.

Aucune capture d’écran n’est livrée : Téva l’a demandé (« pas de captures, pas de preuves »). Les contrôles visuels se
rejouent avec les commandes ci-dessus.

### 0.3 Ce qu’il faut regarder en premier

1. La grille des statuts (section 7) : chaque ligne « Officiel » doit reposer sur un canal propre de Rockstar, Take-Two, Sony
   ou Microsoft ; tout propos rapporté par la presse est « Vu dans un média », avec le média et la date.
2. Aucune donnée GTA VI inventée, rien des fuites (2022, CyberLeek d’août 2026) ; une valeur inconnue reste null, jamais 0.
3. Le calculateur : réglages éteints, chaque résultat de la v8.01 est identique (section 4).
4. Les six pages refaites (section 6) : mouvement, mouvement réduit, cartes sans orpheline, aucun débordement.
5. Les nombres que le site dit sur lui-même (section 8).
6. Les traductions (0 manque dans les cinq langues) et Léo (six langues, réponses locales).

---

## 1. Les demandes de Téva, une par une

| Demande | Section | État |
|---|---|---|
| prix.html : bande des objets du collector (texte coupé) | 6.1 | fait |
| prix.html : « Ce qu’il y a dans la boîte », motion design à l’entrée, bascule liste ou fiche | 6.1 | fait |
| verification.html : tableau de bord (laid, sans survol ; un clic doit ouvrir la carte elle-même) | 6.2 | fait |
| verification.html : cartes « Confirmé » (bordures, trop classique ; animer ou trier par catégorie) | 6.2 | fait |
| verification.html : « Coûts d’usage » | 6.2 | fait |
| prechargement.html : frise (le trait orange coupe les points) | 6.3 | fait |
| prechargement.html : Comment précharger, Temps de téléchargement, Et la boîte ?, Taille et heure du 19 | 6.3 | fait |
| gta-6-pc.html : « Ce que Rockstar a annoncé » et citations de Take-Two (aspect Word) | 6.4 | fait |
| gta-6-pc.html : « Les précédents » en arcade | 6.4 | fait |
| videos.html : « Les vidéos en chiffres » | 6.1 | fait |
| gta-6-vs-gta-5.html : « Le tableau » (aspect Excel) | 6.5 | fait |
| gta-6-vs-gta-5.html : « La carte, mot pour mot » (carrés vides ; image ou superposition avec la carte du site) | 6.5 | fait |
| gta-6-vs-gta-5.html : « Ce qu’on a vu de nouveau » et « Pas encore comparable » (tactile, tout cliquable) | 6.5 | fait |
| Les six pages améliorées dans leur ensemble ; faible latence ; pratique ; traduit partout | 6, 12 | fait |
| Recherche de toutes les informations GTA VI jusqu’au 20 octobre 2026 ; officiel écrit comme Rockstar l’a dit, le reste « vu dans un média » (même procédé que la carte) ; compléter ce qui manque | 7 | fait |
| Léo dans les six langues, selon la langue choisie, qui répond localement à toutes les questions du site | 9 | fait |
| Calculateur (prompt 1 v2), lot 1 puis lot 2, une archive par lot, avant l’audit global | 3, 4 | fait (v8.02, v8.03) |
| Prompt 2 (jour J) adapté : formats complets dès maintenant, répétition à blanc, prompt 2 ajusté rendu | 5 | fait |
| Ne rien faire d’inutile ; adapter ce qui est lié (le Tuto suit le calculateur) | 3.4, 4.4, 5 | fait |
| Vérifier chaque chiffre que le site donne sur lui-même (3 200 lieux, nombre de pages de la presse…) | 8 | fait |
| Compléter la géolocalisation des bâtiments quand c’est possible | 8.3 | fait (dans la limite des données libres) |
| Audit global après modification, sans rien défaire : liens, fiches liées, liens morts, référencement de toutes les pages, téléphone, écriture et traductions, animations des sections citées | 12 | fait |
| Rapport détaillé pour une autre IA | ce document | fait |
| 21/10 : fiches d’armes et de véhicules : image et carte mal placées ; légende de la carte qui mène aux lieux ; apparition de l’image | 6.7 (lot H) | fait |
| 21/10 : voir la configuration directement sur la fiche | 6.7 (lot M) | fait |
| 21/10 : « une page par élément » : bloc « En lien » vide et sans visuel ; cartes des fiches du monde avec du vide | 6.7 (lots I et H) | fait |
| 21/10 : textes serrés sous les cartes à portes ; espace manquant avant la sous-navigation | 6.7 (lot I) | fait |
| 21/10 : collectibles.html, esthétique globale | 6.7 (lot K) | fait |
| 21/10 : devine-le-lieu.html : d’autres jeux du site avec une progression | 6.7 (lot L) | fait |
| 21/10 : personnalisations.html : la carte doit suivre la molette comme la colonne de contact.html | 6.7 (lot H) | fait |
| 21/10 : préciser que l’Atelier 3D est en construction | 6.7 (lot M) | fait |
| 21/10 : tout pousser sur GitHub une fois fini (cette fois seulement) | 0.1 | fait |

---

## 2. Règles permanentes de Téva, et comment les vérifier

| Règle | Comment c’est tenu | Où vérifier |
|---|---|---|
| Rien publié ni poussé sans demande | push autorisé une fois le 21 octobre, refusé faute d’accès GitHub ; livraison en archives « modifs » | historique git de main |
| Archives : fichiers modifiés seulement, parties < 30 Mio, sans recouvrement | outil de paquetage avec contrôle (chaque fichier une fois, contenu identique au dépôt, taille de chaque partie) | liste des parties = `git diff --name-only 21b210d4` |
| Secrets uniquement dans Vercel | aucune clé ni variable dans le dépôt ; api/ inchangé par ces livraisons | `git grep -i -E "api[_-]?key|secret"` sur les fichiers livrés |
| Aucune donnée GTA VI inventée, rien des fuites | inconnu = null, statut unknown ; aucune source de fuite ; pas de nouvel import gtadb (risque de fuite) | sections 5, 7, 8 |
| Jamais un chiffre de GTA V présenté comme de GTA VI | les repères de la série sont étiquetés « Repère de la série » ou « Dans GTA V et GTA Online » | section 7 |
| Aucun cookie | aucun ajout de stockage serveur ni de traceur ; seules préférences locales existantes | relecture des scripts touchés |
| Images officielles seulement, créditées ; aucune légende sous les images | visuels pris dans outils/medias-officiels.json (crédits sur medias.html) ; carte du site présentée comme reconstruction communautaire | 6.5 |
| Aucun signe d’écriture automatique (« · », « — », « → », « / » de séparation) dans le texte visible | contrôle de toutes les pages servies | 12.5 |
| Une matrice de qualité par lot | outils/MATRICE-v8.02.md, -v8.03.md, -v8.04.md | dépôt |
| Les cartes qu’on lit ne bougent pas et ne deviennent pas floues au survol | seuls les liens réagissent ; cartes de lecture immobiles | 6, 12.3 |
| Aucune carte orpheline ; bandeaux qui défilent jamais vides | grilles choisies selon le nombre ; deux copies de la boucle | 6, 12.2 |
| Un seul filet ambre, aucun dégradé multicolore | dégradé multicolore de l’échelle des statuts supprimé (verification.html) | 6.2, 13 |
| Léo local, gratuit, sans serveur | index statiques (leo/*.json), aucune requête externe | 9 |
| Tout ce qui est lié est adapté (Tuto ↔ calculateur, Léo, traductions) | Tuto et Léo mis à jour à chaque lot | 3.4, 4.4, 9 |

---

## 3. Calculateur, lot 1 (v8.02) : ponts de données et conditions de lancement

Demande : prompt « Corriger le calculateur avant la sortie » (v2), lot 1, « l’indispensable, invisible ». Règle : uniquement
des ajouts, aucun changement visible tant que Rockstar n’a publié aucune mission chiffrée.

### 3.1 Ce qui change pour le joueur
Rien de visible aujourd’hui. Quand des données seront publiées :
- une mission avec conditions (argent à avoir en poche sans le dépenser, rang, missions à faire avant, achat à posséder) n’est
  lancée par le business plan que lorsqu’elles sont remplies, avec la raison en mots simples : « Il te faut encore 12 000 $ avant
  de pouvoir lancer « X » : elle demande d’avoir 50 000 $ en poche (cet argent n’est pas dépensé), tu en as 38 000 $. » ;
- deux missions de l’histoire prêtes en même temps passent dans l’ordre de l’histoire ;
- une mission faite une seule fois va dans le business plan ; les huit calculs (qui répètent une activité) l’écartent et le disent ;
- « Reprendre une mission du site » copie aussi les missions et achats qu’elle demande ;
- la case « Mon rang (ou niveau) dans le jeu » n’apparaît que si une mission demande un rang.

### 3.2 Fichiers
calculateurs-data.js (activities() relit requiresMissions, requiresPurchaseIds, once, done, units, order, chapter, kind,
unlockText, minCash, minRank et leurs métadonnées ; rules() lit window.LK_CALC_REGLES ; income pour un revenu passif) ;
calculateurs-activites.js (window.LK_CALC_REGLES, tout à null au 20 octobre 2026) ; outils/gen-missions.cjs (activitesDe :
coût, préparation, attente, part, investissement, joueurs, prérequis, argent minimum, rang, une seule fois, ordre, chapitre,
type, déblocage ; contrôles de forme et des boucles) ; outils/gen-activites.cjs (écrit ses activités « activite-<id> » sans
toucher aux missions) ; outils/gen-calculateurs-catalogue.cjs ; outils/donnees-publiees.cjs ; outils/lore-gen.js ;
outils/sources/calculateurs-engine.js (minCash, minRank dans missionPlan, sessions, parcours, affordableStart, lockedReason,
goal, inverse, goalMixed, sessionPlan ; règles R11 et R12 du vérificateur indépendant) ; outils/sources/calculateurs-scenario.js ;
outils/sources/calculateurs-plan.js ; outils/tuto.json (une phrase) ; outils/langues/*/v802-calculateur.json (40 textes par langue) ;
QUAND-ROCKSTAR-PUBLIE.md, CALCULATEURS-DONNEES.md, CALCULATEURS-MOTEUR.md ; tests calculateurs-v802.test.cjs (15 tests),
reference-v801.cjs et sa fixture (206 résultats), section-activites et section-missions (une assertion alignée, voir 3.3).

### 3.3 Preuves (livraison v8.02)
verifier.js 0 erreur (3 987 557 références, 26 641 pages) ; referencement 0 défaut bloquant ; traductions 0 manque ;
reference-v801 206 résultats, 0 écart ; cadre du calculateur 180 vues identiques ; captures au pixel près v8.01 contre v8.02 :
54 vues sur 54 identiques (390 et 1 366 px, 9 outils, 3 modes) ; Léo 512/512 ; 94 fichiers de tests, 1 242 réussis, 0 échec.
Deux tests anciens affirmaient que le pont des activités « décrit, n’écrit jamais » en lisant tout le texte de
calculateurs-activites.js (son commentaire d’en-tête contient « activite- ») ; leur dernière assertion lit maintenant le tableau
window.LK_ACTIVITIES, toujours vide sans donnée publiée, puisque le prompt demande que le pont écrive.

### 3.4 Lié et adapté
Tuto, chapitre « Mon business plan » : une phrase sur les conditions de lancement, dans les six langues.

---

## 4. Calculateur, lot 2 (v8.03) : les réglages en plus

Points 3 à 9 du prompt, tous en mode Expert, tous éteints par défaut ; éteints, chaque résultat reste celui de la v8.01.

### 4.1 Ce qui change pour le joueur (Expert)
« Mes hypothèses en plus » (bloc replié sous « Mes hypothèses ») : soins (vie perdue par partie ÷ vie rendue par un soin × prix
d’un soin) ; amendes, argent perdu à la mort, à l’arrestation (nombre par partie × montant) ; revenu passif (par heure, stock
maximum ; en parties, au plus son stock par partie) ; bonus en % sur les récompenses (le gain par heure écrit par le joueur ne
change pas, c’est dit) ; partage à parts égales (100 ÷ joueurs ; une part publiée n’est jamais remplacée) ; argent de Jason et
de Lucia (commun par défaut, ou d’un seul personnage : une mission jouée seulement avec l’autre est écartée avec sa raison).
Mon objectif : « Je revends ce que je possède déjà ». Business plan : compter les hypothèses en plus, les tentatives ratées
(× (10 − k) ÷ 10 pour une mission qui se refait, × 10 ÷ (10 − k) pour une mission faite une fois, 10 sur 10 refusé), le revenu
hors ligne entre deux parties (règle R13 du vérificateur), la revente des achats d’avant après le but, « Jouée par » sur
chaque mission. Tout ce qui n’est pas publié est dit « simulation ».

### 4.2 Fichiers
outils/sources/calculateurs-{engine,scenario,workspace,plan}.js, calculateurs.js ; calculateurs-data.js (personnages d’une
mission, seulement s’ils sont publiés) ; outils/modele-donnees.json (mécaniques amendes, mort, arrestation non confirmées ;
soin : vieParPartie, prixUnitaire) ; outils/gen-missions.cjs, outils/missions/missions.json (_schema), outils/donnees-publiees.cjs ;
outils/leo-knowledge.json (7 sujets) ; outils/tuto.json (8 paragraphes) ; outils/langues/*/v803-calculateur.json ;
QUAND-ROCKSTAR-PUBLIE.md, CALCULATEURS-MOTEUR.md, CALCULATEURS-DONNEES.md, CALCULATEUR-INVENTAIRE.md ; tests
calculateurs-v803.test.cjs (17), cadre-ajouts.cjs, calculateurs-cadre.test.cjs (n’accepte que des lignes AJOUTÉES dans le mode
Expert), reference-v801.cjs et sa fixture étendue (851 résultats), leo-questions-v803-{fr,en,es,it,de,pt}.json.
dataVersion du calculateur inchangée (les sauvegardes des joueurs restent lisibles).

### 4.3 Preuves (livraison v8.03)
reference-v801 : 851 résultats, 0 écart ; modes Simple et Pas à pas identiques au pixel près (36 vues) ; Expert : seules des
lignes ajoutées (le panneau descend de 90 px à cause du nouveau bloc, d’où un fond décalé sur les captures budget, ordre,
rentabilité, comparaison : attendu) ; 13 postes de coûts sur verification.html sans carte seule ; verifier 0 erreur ; 95 fichiers
de tests, 1 259 réussis, 0 échec ; Léo 512/512.

### 4.4 Lié et adapté
Tuto (8 paragraphes) et Léo (7 sujets) expliquent chaque réglage dans les six langues, avec des exemples chiffrés présentés
comme des exemples.

---

## 5. Le jour J : prompt 2 adapté, formats complets, répétition à blanc

Demande : adapter le prompt 2 (celui que Téva collera le jour de la sortie), rendre les formats de données complets dès
maintenant, faire une répétition à blanc, et rendre le prompt ajusté.

### 5.1 Formats ajoutés (tous des ajouts : sans donnée publiée, aucune page et aucun résultat ne change)
- Statuts d’une valeur publiée : official, verified, estimated, manual, unverified, unknown, plus **media** (« Vu dans un
  média », deux sources au moins) et **community** (« Communautaire », une source au moins) ; fourchette min/max et note ;
  liste de sources. Refus à la génération : « media » à une seule source, fourchette qui n’encadre pas la valeur ou inversée,
  « community » sans source, « official » sans date, munition inconnue.
- Places : missions (outils/missions/missions.json : récompense, durée, coût, préparation, part, argent à avoir, rang, missions
  avant, ordre, chapitre, personnage joué, une seule fois, manquable), activités (outils/activites/activites.json → rapporte),
  entreprises, demeures, planques (outils/editorial.json), revenus passifs, prix des véhicules (outils/v-corrige.json), des armes
  (armes-data.js), des munitions (outils/acquisitions.json, nouveau), des listes (outils/catalogues/*.json → prix_gta6), règles
  d’argent (calculateurs-activites.js → window.LK_CALC_REGLES).
- Affichage : chaque fiche dit le prix, son statut, sa fourchette, ses sources et sa date ; Léo répond avec les mêmes éléments ;
  phrases comptées accordées (jamais « 0 prix publié »).
- Outil nouveau : outils/jour-j-controle.cjs (état des données publiées et business plan d’un début de partie, en une commande).
- Documents : outils/PROMPT-2-JOUR-J.txt (le prompt 2 ajusté : où écrire chaque chiffre, avec quel statut, quelle commande
  lancer), outils/QUAND-ROCKSTAR-PUBLIE.md et outils/CALCULATEURS-DONNEES.md mis à jour.
- Tests : outils/tests/jour-j-v804.test.cjs (et son aide jour-j-helper.cjs) ; tests anciens adaptés pour accepter une donnée
  publiée au bon format (« aucune donnée inventée » reste vérifié).

### 5.2 Répétition à blanc
Sur une copie jetable, jamais livrée, avec des valeurs FICTIVES marquées `fictif-repetition-jourj` : une mission d’histoire
complète, une mission à conditions (150 000 $ en poche, rang 3, mission avant), une mission secondaire, une activité chiffrée, un
revenu passif, deux véhicules, une arme, une munition, une demeure, une planque, une ligne dans chaque liste, les règles d’argent.
Régénération complète, puis contrôle de chaque fiche, du calculateur, de Léo et du business plan (premier million depuis 0 $ :
19 h 10 de jeu, mission à conditions lancée à 190 min avec 154 000 $ en poche, vérification indépendante juste ; message exact
quand l’argent manque). Preuve avant/après SANS donnée : deux copies régénérées en entier et comparées fichier par fichier :
une seule différence de page, le compteur de tests d’À propos. Une entrée de traduction générique (« 45 $ ») qui changeait des
repères de la série a été trouvée par cette preuve et retirée. Marque fictive dans le dépôt livré : 0 fichier. Compte rendu complet :
outils/audit-v8.04/repetition-jour-j-2026-10-21.md (les chemins « $S/… » y désignent le dossier de travail, hors dépôt).

---

## 6. Refonte des six pages

Plan commun : charte du site (« arcade rétro », thème clair, corail et ambre de Vice City ; Archivo ; bord 2 px encre, rayon
12 px, ombre dure) ; un dispositif par section tiré du sujet (écran de chargement, panneau de prix à volets, tableau des scores
d’arcade, écran VERSUS, étiquettes de prix, tampons « Confirmé », menu de console), un seul moment de motion design par section ;
un seul moteur de mouvement (common.js, LKMotion : `data-lk-reveal` → `is-in`, `--lk-delay`, `lk-settled` pour ce qui est déjà à
l’écran) ; seules transform, opacity, clip-path et filter bougent ; mouvement réduit, impression et sans script : tout visible
tout de suite, rien ne bouge ; une carte qu’on lit ne bouge pas au survol, un lien réagit ; focus clavier visible (contour ambre
3 px) ; aucune bibliothèque ajoutée, JavaScript court et délégué, rien au défilement hors du moteur commun.

### 6.1 prix.html et videos.html (générateur outils/gen-actus.cjs ; outils/sources/actus.css, actus.js ; outils/actus/actus.json)
- Bande des onze objets (texte coupé) : remplacée par un tapis de vignettes officielles qui défile (deux copies, la seconde
  aria-hidden ; bords en fondu ; arrêt au survol et au focus ; en mouvement réduit, rangée immobile qu’on fait défiler au doigt) ;
  chaque vignette mène à son objet ; jamais de vide.
- « Ce qu’il y a dans la boîte » : la galerie entre en cascade (« déballage » : montée, petit rebond, zoom de la photo, glissé du
  nom) ; bascule « Galerie / Liste » (aria-pressed) ; en liste, chaque objet s’ouvre en fiche (grande photo, statut) ; le tapis
  ouvre la bonne fiche ; un objet visé par un lien est entouré.
- Reste de la page : section « Le jeu » avec le Microsoft Store, les États-Unis (79,99 $ et 99,99 $, Take-Two, 24 juin 2026) et
  d’autres pays (Royaume-Uni 69,99 £ et 89,99 £, Australie 129,95 et 159,95 A$, Japon 9 800 et 12 280 yens, PlayStation Store de
  chaque pays) ; amélioration Ultimate 20 € sur le Microsoft Store, pas encore sur le PlayStation Store au 20/10/2026 ; FAQ
  livraison : « la livraison n’est pas offerte » ; coffret « expédié à partir du 19 novembre » partout ; figurine 15 cm, socle qui
  se dévisse et cache un compartiment ; « Taxes » remplacé par « Sécurité » (petites pièces, interdit aux moins de 3 ans) ;
  dimensions du sac retirées (introuvables dans les fiches officielles).
- « Les vidéos en chiffres » (barres plates) : tableau des scores d’arcade : 3 colonnes (une par vidéo relevée), 5 rangées,
  jauges de 12 cases qui s’allument, chiffre qui défile, « Record » en tampon ; chaque score mène à la partie de la page de la
  vidéo qui le détaille ; note sur la bande-annonce de lancement non relevée.
- Contenu des vidéos : Extended Look 26 min 48 (Netflix puis YouTube ; la durée ne vient pas d’une annonce de Rockstar) ; « Au
  programme » en « Vu dans un média » (Gfinity, Game Informer) ; Trailer 2 capturé en jeu sur PS5, moitié gameplay moitié
  cinématiques, plus de 475 millions de vues le premier jour (Rockstar sur X, 7 mai 2025) ; bande-annonce de lancement capturée
  entièrement en jeu sur PS5 (description YouTube), environ une minute et demie (Vu dans un média, GameSpot).
- Actualités (même générateur) : « 17 annonces officielles » → 20 annonces officielles et 9 dossiers de presse, calculés ; 12
  annonces ajoutées à la frise (2022 au 15/10/2026) et 2 dates à venir (résultats de Take-Two le 9 novembre, soirée Vice City du
  Miami HEAT le 18 novembre) ; classifications ESRB Mature 17+ (vérifié le 21/10), PEGI 18 en France, R18+ en Australie, CERO Z
  au Japon, d’après le PlayStation Store et le Microsoft Store.

### 6.2 verification.html (outils/gen-informations.cjs, outils/informations-editorial.json clé verification, informations.css, vitrine.js, vitrine.css)
- Tableau de bord : deux listes d’objectifs ; 13 coches qui se tamponnent (la dernière en pleine largeur si leur nombre est
  impair), barre « 13 sujets sur 21 suivis ici sont confirmés » ; 8 questions sur fond de nuit ; survol et focus : balayage
  ambre, icône inversée ; un clic ouvre la carte elle-même dans un `<dialog>` (Échap, « Fermer », clic sur le fond ; focus rendu
  au point cliqué ; précédent et suivant ; « Voir dans la page » descend jusqu’à la carte, qui pulse) ; sans script : lien vers
  #confirme-N et #pas-encore-N, signalé par :target ; identifiants existants gardés, nouveau point confirme-13 (l’âge conseillé).
- « Confirmé » : filtres par sujet (13, 6, 2, 2, 3) ; la date de sortie en grand ; aucune case vide à aucune largeur ; filtré :
  rangées centrées ; au téléphone, défilement de côté ; moment : la photo se développe puis le tampon « Confirmé » s’abat ; la
  carte ne bouge pas au survol, seul le tampon se redresse.
- « Pas encore annoncé » : chaque carte entière est un lien (dont « La durée de vie » vers gta-6-vs-gta-5.html#q-duree).
- « Coûts d’usage » : panneau de prix de station-service à volets, une ligne par poste (trois volets qui retombent sur « ? »,
  statut, lien « Compter ces coûts dans le calculateur ») ; numérotation 01 à 10 retirée ; vérifié avec 10 et 13 postes.
- Reste : numéros de la fiche dessinée reliés aux quatre notes ; échelle des statuts en segments (dégradé multicolore
  supprimé) ; mosaïque à quatre tuiles sous 480 px corrigée (troisième tuile à 4 px ; répare aussi gta-6-pc.html) ; 104 règles
  CSS mortes retirées (anciennes classes de la page).
- Contenu : carburant (faux : « on fait le plein dans les stations-service de l’Extended Look ») remplacé par « Rob Nelson l’a
  montré aux créateurs reçus au studio, d’après leurs reportages du 27 août 2026 » ; surface de la carte attribuée (Rob Nelson
  cité par TGG ; le studio cité par le New York Times), Vu dans un média ; durée de vie (New York Times, 27/08/2026), Vu dans un
  média ; Leonida : « inspiré de la Floride » retiré (« Rockstar en présente six régions ») ; boîte « est attendue » (expected) ;
  heure de déblocage : PlayStation Store français, 18/11/2026 à 23 h UTC, minuit à Paris ; nouveau point officiel « L’âge
  conseillé » : PEGI 18 (PlayStation Store, Microsoft Store), ESRB M 17+ (esrb.org) ; USK 18 non ajouté (presse seulement) ;
  date du relevé 17 → 20 octobre (tout recontrôlé).

### 6.3 prechargement.html (outils/gen-recherches.cjs, recherches.css, composants de vitrine.cjs / vitrine.css § 24 à 29 / vitrine.js)
- Frise 12, 19, 20 novembre : tronçons tracés d’un point au suivant, qui passent sous les points (alignés à 2 px près) ; étape
  passée cochée ; le jour présent signalé à l’heure du visiteur.
- « Comment précharger » : deux écrans de menu de console (PS5, Xbox), un dessin par étape, statut et source en bas d’écran.
- « Temps de téléchargement » : bouton « Essayer avec 99 Go » (taille de RDR2 sur PS4, exemple dit comme tel : la taille de
  GTA VI n’est pas annoncée), barre de progression, tableau des quatre débits courants (≈ 2 h 12 min pour 99 Go à 100 Mbit/s).
- « Et la boîte ? » : boîte 3D inclinable avec la jaquette officielle, carte de code, « Pas de disque ».
- « Ce qui n’est pas confirmé » (taille et heure du 19) : tableau de bord avec jauge « ? Go » et horloges du 19 et du 12 ; heure
  du 19 : PlayStation Store français (minuit à Paris, le 18 à 23 h UTC), Microsoft Store (aucune heure), Rockstar (aucune heure
  annoncée), « À confirmer » ; la citation Xbox « peu après minuit » retirée (invérifiable).
- « Avant le 12 » : liste à cocher avec jauge, sans carte seule.

### 6.4 gta-6-pc.html (même générateur)
- « Ce que Rockstar a annoncé » : écran de choix de plateforme : PS5 et Xbox Series X|S annoncées, PC verrouillé (cadenas) ;
  citations de Take-Two alignées (même hauteur, aucune inclinaison), date et source en puce.
- « Les précédents » : course d’arcade, une piste par jeu (19 mois, 12 mois, 14 ans), GTA VI sur la ligne de départ, « PC : pas
  annoncé » ; lisible sur téléphone (pistes empilées).
- Arnaques : tampons « Officiel » ou « Vu dans un média » ; « Ne donne jamais tes identifiants Rockstar » (Officiel, Rockstar
  Support) ; Malwarebytes en Vu dans un média.
- Contenu : FAQ jeu en nuage : Matthew Ball, directeur de la stratégie de Xbox, 7 octobre 2026 : pas de diffusion en nuage
  exclusive ni vers le PC (Vu dans un média, Dexerto ; recoupé) ; GTA V annoncé sur PC environ dix mois avant sa sortie (Game
  Informer, 9 juin 2014 ; l’ancien texte disait « quelques semaines », faux pour GTA V) ; « expérience solo » sourcée par le
  billet Newswire du 24 juin 2026 (et non celui du 18 juin).

### 6.5 gta-6-vs-gta-5.html (même générateur)
- « Le tableau » : écran VERSUS (case GTA VI, sujet avec lien vers la page du site, case GTA V ; au téléphone « Les deux »,
  « GTA VI », « GTA V »).
- « La carte, mot pour mot » : citations alignées ; carré GTA VI sur le fond de carte du site (reconstruction communautaire,
  dite comme telle), carré GTA V hachuré de surface moitié (rapport ×2 rapporté par la presse), curseur utilisable au clavier
  pour les superposer, légende « rapport de surfaces, pas une mesure ». Aucune image de la carte de GTA V n’existe dans le
  dépôt : aucune n’a été inventée.
- « Ce qu’on a vu de nouveau » et « Pas encore comparable » : douze cartes entièrement cliquables (chacune mène à sa page ou à
  la carte de verification.html qui en parle), chaque nouveauté avec sa source.
- Contenu : annonce de GTA V le 25 octobre 2011 (Game Developer ; l’ancien texte disait le 3 novembre) ; « La presse la compare
  à la Floride ; Rockstar ne la nomme pas » ; chiffres de surface de Rob Nelson via TGG, RDR2 au studio via le New York Times,
  « Vice City deux fois Los Santos » attribué à Rob Nelson (TGG) ; police et poids attribués à Rob Nelson (Famitsu) ; durée de
  jeu « d’après le New York Times » ; nombre de lieux et de véhicules recalculés à chaque génération (3 244 lieux repérés dont
  2 387 sur une capture officielle ; 302 véhicules).

### 6.6 Contrôles des six pages
Voir la section 12 (écrans à 16 largeurs, mouvement normal, réduit et sans script, accessibilité, latence, traductions).

### 6.7 Ajouts demandés le 21 octobre (lots H, M, I, K, L)
**Fiches d’armes et de véhicules, cartes du monde (lot H ; outils/localisateur.cjs, gen-armes.cjs, lore-gen.js bloc carte,
style.css bloc « v8.04 (lot H) », lk-sections.css, acquisitions.css)**
- Cause du vide : une règle v7.86 limitait la carte des fiches à 620 px, collée à gauche ; retirée. Carte et légende côte à
  côte, à parts égales, centrées ; empilées au téléphone.
- Légende : chaque lieu de la carte avec son numéro (le même que le repère), son nom, son quartier, et un lien vers sa page
  lieux-carte/… (sinon carte.html#lieu=…) ; survoler un lieu allume son repère (CSS :has, sans script).
- « Aperçus dans les supports officiels » (18 fiches d’armes qui en ont) : grille selon le nombre d’images ; la photo « se
  développe » à l’entrée (moteur commun) ; rien ne bouge en mouvement réduit, à l’impression ou sans script.
- Pages du monde (gangs, personnages, lieux, demeures, planques, entreprises, activités) : carte et colonne de même hauteur,
  lieux avec vignette officielle et lien vers leur page ; plus de vide.
- personnalisations.html : la carte colle sous l’en-tête et la sous-navigation pendant qu’on fait défiler la liste, avec la même
  règle que la colonne de contact.html (le rideau d’apparition du moteur commun annulait le sticky) ; rien de collant sous
  900 px de large.

**Voir la configuration sur la fiche ; Atelier 3D en construction (lot M ; perso-fiche.cjs, sources/perso-fiche.js, fiches.css,
gen-atelier.cjs, atelier-3d.css, site-shell.cjs, style.css 4 règles)**
- Bouton « Voir ma configuration » sur chaque fiche de véhicule et d’arme : un dessin du modèle avec les choix du joueur
  (famille de teinte, finition, vitres, néons, jantes…), construit avec les données de l’Atelier chargées au premier clic
  seulement ; récapitulatif de ce qui ne se voit pas sur le dessin ; « Ouvrir ma configuration dans l’Atelier 3D » transmet les
  choix et l’Atelier les applique. Rien n’est une donnée de GTA VI : ce sont des repères de dessin.
- « En construction » : étiquette sur le lien du menu (barre identique au pixel de 1 081 à 1 920 px), à côté des boutons Atelier
  des fiches et de personnalisations.html, bandeau « ce qui marche déjà, ce qui arrive » sur atelier-3d.html.

**« En lien », espacements, cartes des hubs (lot I ; outils/en-lien.cjs nouveau, lore-gen.js, gen-activites, gen-missions,
gen-radios, style.css bloc « v8.04 (lot I) »)**
- Un seul moteur pour le bloc « En lien » de toutes les fiches du monde, des animaux, des activités, des missions, de l’album
  et pour « Les autres stations » : cartes cliquables homogènes (vignette officielle, sinon schéma du site ou silhouette de la
  carte avec repère ; type, nom, chevron) dans une seule grille sans carte orpheline ; jamais la même capture deux fois.
- Air avant la sous-navigation collante : 56 px (36 px au téléphone) sur les 13 pages concernées (avant 0 à 44 px).
- Cartes de Demeures (les cartes à portes), Planques, Entreprises : titres, accroches, personnes, lieu et actions alignés d’une
  carte à l’autre, actions calées en bas ; animations inchangées.

**collectibles.html (lot K ; collectibles*.css|js, gen-collectibles.cjs, collectibles.html, 33 règles de style.css retirées)**
- Direction « album du collectionneur » : vignettes encadrées, statuts en tampons, emplacements à venir en pointillés, cases à
  cocher ; un seul filet ambre ; les liserés multicolores (dont ambre vers bleu-vert) et les cartes qui se soulevaient au survol
  retirés ; textes lisibles (plus de 10-11 px imposés) ; toutes les fonctions gardées (suivi, filtres, recherche, sauvegarde,
  export, import, aide).

**Jeux (lot L ; gen-jeux.cjs, jeux/jeux.json, jeux-illus.cjs, sources/jeux-core.js, frise.js, station.js, jeux.css)**
- Deux jeux nouveaux, faits seulement avec les données vérifiées du site : « La frise des annonces » (remettre dans l’ordre les
  29 annonces datées d’actus.json) et « Devine la station » (43 indices sur les 6 stations, officiels ou vus dans un média) ;
  chaque réponse dit son statut et sa source et mène à la page du site qui en parle.
- Progression commune aux trois jeux sur jeux.html (points, 8 niveaux, séries, 10 badges, défi du jour), gardée sur l’appareil
  (clé lk_jeux_v1, décrite dans les mentions ; aucun cookie, aucun serveur) ; Devine le lieu garde ses scores.
- Menu « Explorer » (groupe Jouer), recherche du site, Léo (4 sujets), images de partage des trois pages, six langues.

---

## 7. Informations GTA VI vérifiées au 20 octobre 2026

### 7.1 Méthode
Deux relevés le 20 octobre 2026, sans modifier le dépôt : (1) chaque affirmation des pages concernées, une par une (311 lignes :
231 exactes, 25 exactes au statut à corriger, 35 inexactes dont 12 mineures, 20 invérifiables) ; (2) tout ce qui a été publié
et que le site n’avait pas. Annexes : outils/audit-v8.04/verification-informations-2026-10-20.md et
outils/audit-v8.04/nouveautes-2026-10-20.md (avec toutes les adresses consultées). Limites : rockstargames.com (Newswire, /VI)
s’affiche par script (contenu vérifié par des pages officielles lisibles : Rockstar Support, Rockstar Store, Take-Two,
PlayStation Store, Microsoft Store, YouTube) ; nytimes.com bloqué (lu dans ses reprises : The Nightly, The Star) ; aucune fuite
n’a servi de preuve.

Les trois erreurs les plus sérieuses trouvées : le carburant présenté comme visible dans l’Extended Look (l’information venait
d’une démo privée et d’une fuite) ; la date d’annonce de GTA V (3 novembre au lieu du 25 octobre 2011) ; la durée de 26 minutes
de l’Extended Look attribuée à Rockstar (elle venait de la fiche Netflix). Toutes trois corrigées.

### 7.2 Grille des statuts (appliquée à tous les registres du site)
- **Officiel** : publié par Rockstar, Take-Two (communiqués, Business Wire, dépôts SEC), Sony ou Microsoft sur leurs propres
  canaux, écrit comme ils l’ont dit.
- **Vu dans un média** : ce que la presse rapporte, y compris ce qu’un membre de Rockstar ou de Take-Two dit à un média
  (entretien) ; toujours avec le média et la date. Même procédé que la carte.
- **Identification communautaire** : wikis et sites de fans.
- **Repère de la série** : un fait d’un autre GTA, jamais présenté comme de GTA VI.
Appliqué : refonte D (hubs, À propos, Léo : 30 sources officiel → vu, 12 → communautaire, 9 entrées de chronologie), refonte F
(activités, jeu en ligne, missions, codes, trophées, collectibles, catalogues : 43 sources de presse officiel → vu, 4 sites de
fans → communautaire, 76 lignes officiel → vu ; trois sources officielles ajoutées et vérifiées le 21/10 : billet Newswire du
24 juin 2026, fiche Microsoft Store de l’Ultimate), intégration (14 articles de presse du jeu en ligne notés « communautaire »
→ vu, avec leurs 12 lignes ; seul un blog de fans reste communautaire). Contrôle croisé : aucune ligne « Officiel » sans source
officielle, aucune ligne « vu » sans source vue ou officielle.

### 7.3 Corrections et ajouts par page (hors des six pages, détaillées en 6)
- actus.html et editions.html : 20 annonces officielles et 9 dossiers de presse comptés par le générateur (au lieu de « 17 annonces
  officielles » écrit à la main) ; 12 annonces ajoutées à la frise (de 2022 au 15 octobre 2026), 2 dates à venir (résultats de
  Take-Two le 9 novembre 2026, soirée Vice City du Miami HEAT le 18 novembre) ; Game Informer, Famitsu et les aperçus de presse
  en « Vu dans un média » ; attribution erronée à Michael Kane retirée ; billet des précommandes du 24 juin (au lieu du 18) ;
  boîte achetable sur la boutique Rockstar (Xsolla), règles des autres pays (assistance Rockstar).
- moments/ : nouvelles pages pour les annonces ajoutées (dont classifications, campagne de lancement, enquête Bloomberg,
  entretien IGN, magazine LOVE, report de 2025, résultats de Take-Two) ; la page sommaire dit la période réelle (« du 4 février
  2022 au 15 octobre 2026 », calculée sur la frise).
- personnages et dossiers : « fin août 2026 » au lieu d’une date inventée ; 80 heures « avec une partie du contenu facultatif »
  (Vu dans un média) ; Cal « pas annoncé comme jouable » ; Jason « dans une propriété de Brian » ; bande-annonce de lancement
  (Vu dans un média).
- lieux et régions : « près de vingt-sept minutes » (26 min 48 s) ; surface : deux fois GTA V (Rob Nelson), trois fois RDR2 (le
  studio, New York Times), Vu dans un média ; Grassrivers : Back Country Radio et Mud Dog Mike (officiel).
- radios : compositeur Justice depuis le 15 octobre (officiel) ; deux titres de l’album du 9 octobre ; éditions CD et vinyle
  (Atlantic Records) ; trois morceaux par station dans les aperçus (Vu dans un média, Game Informer) ; Dazed « fin août 2026 ».
- À propos : date des dernières sources calculée sur tous les registres ; « aucun prix » précisé en « aucun prix en jeu ».
- activités, jeu en ligne, missions, codes, trophées, collectibles, catalogues : grille des statuts appliquée (7.2) ; « confirme
  Rob Nelson » devient « a dit Rob Nelson à Famitsu » ; billet du 18 juin 2026 et billet du 24 juin distingués.
- modele-donnees.json (pages du calculateur et verification.html) : carburant et soin réécrits (voir 11).

### 7.4 Écarté volontairement
Fuites (2022, CyberLeek d’août 2026) et tout ce qui en vient (tailles du jeu, prix, « vidéos volées » sauf le message de Rockstar
lui-même) ; fiche PEGI publiée puis retirée (seulement la presse) ; rumeurs de la section 3 du relevé des nouveautés ; « PS5 Pro
Enhanced », « la plus large sélection de la série », citation d’Aaron Garbut, nuance d’IGN sur Snapmatic (invérifiables).

---

## 8. Ce que le site dit sur lui-même, et la géolocalisation (refonte E)

### 8.1 Nombres corrigés
| Où | Avant | Après | Comment c’est calculé |
|---|---|---|---|
| classement-vehicules, collectibles (2), comparateur, progression, vehicules-rares | « 2 547 lieux » | 3 291 | sync-site : 37 points de carte.js + 36 groupes + 3 218 lieux gtadb (même définition que la carte) |
| vehicules-rares | « Les 9 véhicules nommés par Rockstar » | « Les 9 véhicules des éditions » ; « Rockstar en a nommé 10 en tout » (Seashark compris) | statut officiel, calculé |
| tuto | « 30 questions gratuites toutes les 9 h » ; « 5 langues » | 15 toutes les 12 h ; 6 langues | lus dans api/ia.js et outils/langues.json |
| carte.html | 12 catégories | 9 (catégories avec au moins un point) ; « Dont 47 zones et 3 244 autres lieux ; chacun a sa page » | données de la carte |
| lieux-carte/index | « 2 823 bâtiments identifiés » ; 2 239 pages indexables | « 2 823 bâtiments » ; 2 240 | pages réelles |
| À propos, Presse (2) | 4 429 pages | 26 574 pages, toutes langues comprises | pages françaises × 6, recompté après la traduction |
| Fenêtre de la carte (36 groupes) | « Regroupe N bâtiments repérés » | « N lieux repérés » | données |
| marques/index | — | 51 marques ont leur page : 50 portées par au moins un des 219 véhicules, « Cheval » sans véhicule repéré | données |
| Carnets | — | « à cocher » quand la liste complète est plus longue (5 munitions sur 6, 23 tatouages sur 24, 57 modifs de véhicule sur 58, 39 modifs d’arme sur 40) | données |
| planques.html | Garage Paradise « non placé » | « seul un « Paradise Garage » repéré par la communauté est placé, à Watson Bay » | carte |
Après la régénération finale (relu sur les pages) : 3 291 lieux sur la carte, dont 47 zones et 3 244 autres lieux ; 302 fiches
de véhicules ; 27 fiches d’armes ; 196 visuels officiels ; 26 664 pages, toutes langues comprises (presse.html, a-propos.html).

### 8.2 Écarts expliqués et laissés
Tatouages et consommables : la ligne « collection » ne se coche pas (voulu) ; munitions : « Grenades » listé mais pas suivi dans
le carnet (probable oubli, signalé, non changé) ; « Cheval » sans véhicule (existence non vérifiable). Nombre de pages : Google
en indexe ≈ 30 000 d’après Téva ; le site sert 4 445 pages françaises, dont 2 848 proposées aux moteurs (le reste en noindex : fiches
minces, redirections), soit 26 664 pages dans les six langues ; la presse dit maintenant le nombre réel, toutes langues comprises.

### 8.3 Géolocalisation
3 244 pages lieux-carte/ : adresse et lien Google Maps 1 889 → 1 894 (dont 6 « rapprochement incertain ») ; lieu réel sans
coordonnées 0 → 2 (port de Vice City, paire GTA Wiki citée) ; « Non identifié » 1 329 → 1 348 ; « ? » affiché 26 → 0. Gagnent
leur géolocalisation : 4 points du site et le Grand lac intérieur (Lake Okeechobee). Aucune nouvelle version de gtadb téléchargée
(risque de fuite) : le reste ne peut pas être géolocalisé honnêtement.

---

## 9. Léo dans les six langues (refontes D et F)
- Réponses locales (index statiques leo/*.json, aucun serveur) dans la langue de la page ; nombres du site posés par gen-leo
  depuis les données (3 291 lieux, 302 véhicules, 27 armes, 50 marques, 12 catégories dont 9 avec des points).
- Statuts alignés sur la grille (sept « Officiel (entretien) » → « Vu dans un média (entretien) », « ammunation » → vu).
- Faits ajoutés : PEGI 18 et ESRB M (boutiques), USK 18 (presse), R18+, CERO Z ; pas de jeu en nuage vers le PC (Matthew Ball,
  Xbox) ; 30 images par seconde (VGC, propos rapportés).
- Compréhension : 156 + 110 expressions anglaises, allemandes, espagnoles, italiennes, portugaises ajoutées aux tables de
  réécriture et aux ponts ; FAQ « modes » et glossaire « amortissement » corrigés ; 31 formulations sur 16 sujets ; « plongée ».
- Jeux de questions (avant D → après F) : fr 638/639 → 657/657 ; en 729/762 → 779/780 ; es 614/614 → 632/632 ; it 612/612 →
  630/630 ; de 709/754 → 772/772 ; pt 609/614 → 632/632 ; aucune réponse dans une autre langue que celle de la page. Reste faux :
  « split my 200k budget » (anglais, faux avant aussi).
Après la régénération finale : outils/tests/leo-eval.cjs 512/512, hors sujet refusés 39/39, réponses sans source 0 ; Léo
connaît aussi les jeux (4 sujets), « Voir ma configuration » et l’Atelier en construction.

---

## 10. Référencement (chantier G)
28 avertissements de outils/referencement.cjs → 0 (0 défaut bloquant) : 23 descriptions trop courtes (coiffures, perso-armes,
perso-vehicules, tenues, visuels : la fonction court() coupait juste après le nom), 2 trop longues (carnets), 1 titre trop long
(vehicules-rares, 67 → 65 signes), 2 descriptions sans le nom (courses, album). Règle par famille : première proposition de 60 à
160 signes faite de phrases que la page affiche déjà (rien d’inventé) ; preuve : l’ancien générateur, relancé sur la même
copie, ne réécrit que les 23 pages visées. Les 28 pages dans les six langues : titres ≤ 65 signes, descriptions de 60 à 160
signes (17 descriptions traduites plus courtes pour les moteurs) ; seule exception, d’avant : le titre allemand de
vehicules-rares (68 signes ; le changer demande de refaire son image de partage). Image de partage française de vehicules-rares
rendue avec le nouveau titre.

---

## 11. Corrections faites pendant l’intégration
- verification.html, modèle des données : textes « Carburant » et « Soin » de outils/modele-donnees.json corrigés (le plein
  montré aux créateurs, 27 août 2026, sans prix ni consommation ; la nourriture agit sur les jauges d’après Rob Nelson à Famitsu,
  28 août 2026, sans chiffre), traduits dans les cinq langues.
- Sourcils des pages traduites (accueil, À propos, Tuto) : « LEONIDAKIT / … » → « LEONIDAKIT, … » comme en français (15 valeurs).
- vehicules-rares.html : « Glock 17 / SIG P320 » → « Glock 17 ou SIG P320 » (comme la fiche de l’arme), traduit.
- « GTA Wiki » (source d’un lieu réel de la carte) traduit tel quel dans les cinq langues.
- 4 conflits de traduction portugais entre deux chantiers alignés sur la forme du site (« consultado em », 213 occurrences).
- Résumé des courses : les deux corrections (nom en tête pour le référencement, « ce que cite Game Informer » pour la grille)
  réunies, traduites.
- actus.json : les dix corrections de statut provisoires (sourcesCorrigees) retirées, puisque les registres sont corrigés à la
  source ; reste la phrase du billet de l’Extended Look.
- Jeu en ligne : 14 articles de presse et 12 lignes notés « communautaire » → « Vu dans un média ».
- Fusions à trois voies de tous les chantiers, avec quatre conflits résolus à la main en gardant les deux intentions :
  résumé des courses (nom en tête et « ce que cite Game Informer »), textes de donnees-publiees.cjs (accords du jour J et « aucun
  prix en jeu »), gen-leo.cjs (prix du jour J et nombres du site de D), test section-activites (format du jour J et règle de F).
- Traductions écrites pendant l’audit : 11 textes (recherche des jeux, phrase des soins dans nourriture.html, étiquettes « Vu
  dans un média » du jeu en ligne, sous-navigation de la bande-annonce de lancement), puis 3 (dates de sources, liens de la
  carte de l’âge conseillé) ; 15 conflits de mémoire alignés ; noms du coffret en anglais remis à ceux de la boutique Rockstar
  (« Vice City swizzle spoon », « Leonida Keys crossbody bag », « Chunkee the Manatee shot glass ») ; « Frequentatore di Vice
  City » au lieu du mot français « Habitué » en italien.
- verification.html : la carte « L’âge conseillé » mène à moments/classifications.html, comme les autres cartes mènent à la page
  du site qui détaille le point.
- Titres anglais d’origine des sources gardés en anglais (translate="no") sur les pages de jeux, comme sur actus.html.
- Image de partage rendue pour jeux.html, frise-des-annonces.html et devine-la-station.html (six langues).
- actus.html : un ticket de la frise coupait son texte de 3 px à 1 180 px (overflow) ; corrigé. frise-des-annonces.html en
  allemand : un mot long débordait à 1 024 px ; corrigé.
- Tests anciens mis à jour sur le contenu vérifié, sans rien affaiblir (voir 12.8).

---

## 12. Audit final (après la dernière régénération)

Toutes les mesures ci-dessous portent sur l’arbre livré, régénéré en entier (outils/regenerer.cjs, puis le second passage
décrit en 13.2). Chaque défaut trouvé a été corrigé puis recontrôlé ; ce qui reste est dit tel quel.

### 12.1 Liens, ancres, fiches liées, couverture
- outils/verifier.js : aucune erreur, 4 070 190 références vérifiées dans 26 731 pages (HTML, srcset, CSS, galeries, données,
  sitemaps) : aucun lien mort interne, aucune ancre absente (dont prechargement.html#pas-confirme, #q-taille,
  gta-6-vs-gta-5.html#carte, #q-duree, prix.html#collector, #manettes, #boutique, editions.html#boite, verification.html#pas-encore-5
  et -7, qui ont été gardées).
- outils/couverture-pages.cjs : chaque élément des données a sa page, 0 manquante.
- Tests des pages par élément (pages-elements, pages-elements-b) : pages à jour et liens des listes vers les pages.

### 12.2 Référencement
outils/referencement.cjs --tout : 4 445 pages françaises, 2 848 proposées aux moteurs, 1 597 en noindex ; 2 798 pages d’éléments
avec leur nom dans le titre et le h1 ; 0 défaut bloquant, 0 avertissement, 0 description sans le nom (avant : 28 avertissements).
Pages nouvelles (jeux.html, frise-des-annonces.html, devine-la-station.html) : titre, description, canonique, hreflang, données
structurées, image de partage dans les six langues.

### 12.3 Écrans (téléphone à très grand écran)
outils/tests/ecrans-browser.cjs, 16 largeurs de 320 à 2 560 px : 102 pages en français (toutes les pages de la racine et un
échantillon de fiches), 28 pages en allemand et 28 en portugais (les six pages, les pages changées le 21 octobre, des fiches) :
0 débordement horizontal, 0 élément hors de l’écran. Signalements restants, voulus : grilles en mosaïque à largeurs mêlées
(grande carte en tête : activités, animaux, verification.html, calculateurs), carrousel de photos des fiches véhicules (cartes
hors du cadre par construction), marges de la galerie des fiches du monde, repères de la carte à 320 px qui sortent du cadre
déplaçable. Corrigés pendant l’audit : texte coupé de 3 px d’un ticket d’actus.html à 1 180 px ; mot allemand trop long dans
l’en-tête de frise-des-annonces.html à 1 024 px.
Recontrôle après les corrections (actus, frise-des-annonces, prechargement, videos, carte, animaux ; français à 6 largeurs,
allemand à 3) : 0 débordement, 0 texte coupé, 0 mot coupé (restent les grilles en mosaïque et les repères de la carte à 320 et
390 px, voulus).

### 12.4 Mouvement, mouvement réduit, sans script
outils/tests/v7871-browser.cjs sur les six pages, les pages de jeux, collectibles, personnalisations, entreprises, demeures,
animaux, une fiche d’arme, de véhicule, de gang, en français et en allemand, à 390, 768 et 1 280 px, en mouvement normal, réduit
et sans script (306 chargements) : 0 bloc caché, 0 premier écran caché, 0 bloc jamais entré, 0 erreur JavaScript, 0 petite
cible tactile, 0 rangée inégale. Textes de moins de 11 px trouvés sur des hubs (crédits « Visuel officiel », pastilles
« source », statuts, familles d’animaux) : remontés à 11 px.
Recontrôle (animaux, entreprises, demeures, personnalisations, collectibles, actus ; français et allemand) : 0 bloc caché, 0 bloc
jamais entré, 0 erreur ; les derniers petits textes de personnalisations.html (« Sur la carte », note des libellés) ont été
remontés à 11 px à leur tour : « Tout est bon ».
Mouvement réduit : aucune animation ni transition longue ne tourne (contrôle d’accessibilité ci-dessous).

### 12.5 Accessibilité
axe-core n’a pas pu être installé ici (registre npm refusé par le réseau de la session). Contrôle ciblé dans Chromium, en
mouvement réduit, à 390 et 1 280 px, sur 31 pages en français et 7 en allemand (62 + 14 vues ; 28 596 textes dont le contraste a
été calculé, 11 922 éléments focalisables essayés au clavier). Règles : nom accessible de chaque élément interactif ; image sans
alt ; role=img ou dialog sans nom ; identifiants en double ; références aria vers un id absent ; élément focalisable caché aux
lecteurs d’écran ; contraste WCAG AA (4,5:1, 3:1 pour le grand texte) sur fond uni ; un seul h1 ; focus visible (l’élément ou son
parent change d’aspect au focus clavier) ; aucune animation qui tourne en mouvement réduit. Résultat : 0 nom manquant, 0 image
sans alt, 0 identifiant en double, 0 focus invisible, 0 animation en mouvement réduit. Contrastes trouvés et corrigés : bouton
« Essayer avec 99 Go » (1,97:1), « Record » des vidéos (3,95:1), points de niveau des jeux (3,32:1), pastilles et compteurs de la
carte (3,95:1). Faux positifs expliqués : nom des régions sur photo assombrie (animaux.html, le contrôle ne voit pas l’image),
deux dialogues dont le titre n’existe qu’à l’ouverture (fermés, ils sont hors de l’arbre d’accessibilité). Restent, existants :
des titres h3 de cartes avant le premier h2 sur les hubs (ordre de titres, gravité modérée).
Recontrôle des pages corrigées (prechargement, videos, jeux, carte, collectibles, et prechargement, videos, jeux en allemand) :
0 défaut de contraste ; seules restent les deux références des dialogues de collectibles.html (faux positif expliqué ci-dessus).

### 12.6 Écriture
Contrôle de toutes les pages servies (26 730 pages, six langues ; texte visible, alt, title, aria-label, placeholder, meta) :
0 signe d’écriture automatique (« · », « — », « → », « / » entre deux mots, hors citations). Les tirets seuls dans une case
signifient « valeur inconnue » et ne sont pas des séparateurs.

### 12.7 Latence
outils/tests/latence-browser.cjs (téléphone 390 px, processeur ralenti ×4, réseau « 4G lente », médiane de 2 tours, v8.01 contre
v8.04, à froid puis à chaud) :

| Page | Premier affichage à froid | Plus grand élément à froid | Fin du chargement à froid | Octets à froid |
|---|---|---|---|---|
| prix.html | 728 → 708 ms | 728 → 708 ms | 1 311 → 1 266 ms | 339 → 395 ko |
| verification.html | 684 → 680 ms | 684 → 680 ms | 1 266 → 1 353 ms | 216 → 225 ko |
| prechargement.html | 676 → 680 ms | 676 → 680 ms | 1 314 → 1 287 ms | 382 → 393 ko |
| gta-6-pc.html | 688 → 688 ms | 688 → 688 ms | 1 282 → 1 276 ms | 272 → 285 ko |
| videos.html | 680 → 720 ms | 1 172 → 1 144 ms | 1 228 → 1 218 ms | 348 → 355 ko |
| gta-6-vs-gta-5.html | 732 → 956 ms | 732 → 1 216 ms | 1 218 → 1 347 ms | 339 → 350 ko |

À chaud (service worker actif) : premier affichage de 380 à 432 ms partout. Aucune bibliothèque ajoutée. Seule hausse notable :
le plus grand élément de gta-6-vs-gta-5.html à froid (1,2 s au lieu de 0,7 s), qui reste sous le seuil « bon » de 2,5 s ;
signalé en 13.

### 12.8 Traductions, Léo, tests
- outils/langues.cjs --verifier en, es, it, de, pt : 0 texte sans traduction, 0 repère cassé, 0 conflit.
- Navigateur : pages clés et pages changées dans chaque langue : aucun mot français visible, aucune erreur ; noms propres et
  citations anglaises gardés tels quels déclarés dans outils/tests/langues-helper.cjs (Porte de Bagnolet, Journal du Geek,
  El Chaval de la Bachata, citations de Matthew Ball et des éditions, clé lk_jeux_v1).
  Contrôle Chromium des pages clés dans les cinq langues, comparées au français (compteurs, barre de langue, mots visibles) :
  161 contrôles réussis, 0 échec ; pages changées en allemand : 0 mot étranger.
- Léo : outils/tests/leo-eval.cjs 512/512, hors sujet refusés 39/39 ; gen-leo --check : index à jour.
- outils/tests/reference-v801.cjs : 851 résultats de la v8.01 rejoués réglages éteints, 0 écart.
- Tests : 101 fichiers, 1 296 tests réussis, 0 échec (dernière exécution complète après la régénération finale : 100 fichiers
  sur 101 ; le seul échec, des titres de chansons anglais cités tels quels sur les pages de radios allemandes, a été déclaré
  comme citation, puis langues.test.cjs relancé : 51 sur 51). Tests anciens mis à jour sur le contenu vérifié, sans affaiblir ce qu’ils protègent : modele-v748 (le
  carburant n’est pas dans l’Extended Look), v786 et v7921 (nouvelle mise en page de verification.html, 13 points, relevé du
  20 octobre, fiches de la bande-annonce de lancement « Vu dans un média », seconde source ESRB), audit-langues-browser (9
  catégories de la carte, comme la page), calculateur-cadre.json (empreinte de la feuille commune style.css seulement : le cadre
  du calculateur est toujours contrôlé ligne par ligne contre l’instantané d’avant le lot 1).

---

## 13. Choix faits à la place de Téva, et points ouverts

### 13.1 Choix faits (Téva avait délégué ces décisions ; chacun est réversible)
- Fiches d’activités (refonte F) : une fiche exige au moins une phrase appuyée sur une source officielle (texte, image ou vidéo
  de Rockstar), quel que soit le statut de la phrase. Avec la règle stricte (une phrase au statut « officiel »), braquages, vol
  de voitures et salle de sport redevenaient de simples lignes ; elles restent des fiches.
- verification.html : « L’âge conseillé » est un point confirmé (PEGI 18 sur le PlayStation Store et le Microsoft Store, ESRB M
  sur esrb.org, organisme officiel de classification) ; l’USK 18 n’est pas ajouté (presse seulement).
- carte.html : le site compte les catégories qui ont au moins un point (9), pas les catégories prévues (12).
- Nombre de pages : dit « toutes langues comprises » (26 664), recompté à chaque synchronisation.
- Géolocalisation : aucune nouvelle version de gtadb téléchargée (risque de reprendre des données issues des fuites) ; un lieu
  sans source libre reste « Non identifié ».
- Jeux : deux jeux plutôt que trois, bien finis ; la progression reste sur l’appareil (aucun compte, aucun serveur).
- Titres de sources : un titre d’article anglais d’origine reste en anglais dans les six langues (translate="no"), comme
  actus.html le faisait déjà ; une source du dossier des personnages a reçu un titre descriptif traduit, comme ses voisines.

### 13.2 Points ouverts, à connaître
- Régénération : sync-site.cjs demande maintenant environ 6 Go de tas (outils/regenerer.cjs le donne à sync-site et lore-gen,
  4 Go aux autres étapes). Après un changement qui fait bouger des pages, il faut parfois un second passage : gen-leo --check
  s’arrête sur « Index Léo à régénérer » (relancer gen-leo, sync-site, gen-leo --check) et gen-pages-elements a besoin d’un
  second passage pour que les pages visuels/ et lieux-carte/ voient les pages qu’il vient d’écrire (gen-pages-elements
  --verifier le dit). C’est ce qui a été fait pour cette livraison.
- Crédits sous les visuels des fiches plein écran des familles (composant lkx-sheet) : gardés, car le test v772 les exige, alors
  que la règle de Téva dit « aucune légende sous les images ». À trancher.
- Composants partagés hors des pages refaites, qui ne suivent pas tout à fait « un seul filet ambre » : la bande solaire animée
  de l’en-tête (ambre et corail, identité du site), le dégradé de l’outro, la flèche « ↗ » du bouton du calculateur, l’éventail
  du menu Explorer. Non touchés : jamais signalés, présents sur tout le site.
- Ordre des titres sur les hubs (h3 des cartes avant le premier h2) : existant, gravité modérée.
- gta-6-vs-gta-5.html : plus grand élément affiché en 1,2 s à froid au lieu de 0,7 s (sous le seuil « bon »).
- Bandeau « Ce qui arrive » de l’Atelier 3D : promesses sur le site (pas sur le jeu), à valider par Téva.
- Carnet des munitions : « Grenades » est listé mais pas suivi (probable oubli, non changé) ; marque « Cheval » sans véhicule
  repéré.
- Dazed : date gardée « fin août 2026 » (la page porte le 6 septembre en métadonnée).
- Titre allemand de vehicules-rares.html : 68 signes (existant ; le changer demande de refaire son image de partage).
- online.html garde 128 px d’air avant sa sous-navigation (règle propre à online.css).
- Léo : « split my 200k budget » (anglais) reste mal compris, comme avant ; les questions de test des jeux n’existent qu’en français.
- Contrôle d’accessibilité fait sans axe-core (indisponible ici) : le rejouer avec outils/tests/audit-axe-v791.cjs là où axe-core
  s’installe est conseillé.

---

## 14. Fichiers sources modifiés ou ajoutés (v8.02 à v8.04)

La liste détaillée par chantier est dans outils/CHANGEMENTS-v8.02.txt, outils/CHANGEMENTS-v8.03.txt et
outils/CHANGEMENTS-v8.04.txt. Les autres fichiers du commit sont produits par les générateurs (pages des six langues, index de
Léo, scripts minifiés à la racine, sitemaps, images de partage). Pour les retrouver : `git show --stat` du commit, ou
`git diff --name-only 21b210d4 -- outils/` pour les sources seules.
