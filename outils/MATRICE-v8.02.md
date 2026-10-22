# Matrice de qualité de la v8.02 (calculateur, lot 1 : ponts de données et conditions de lancement)

Demande : prompt « Corriger le calculateur avant la sortie », lot 1. Base : v8.01 (commit 21b210d4). Une ligne par exigence
du prompt et par point du document d’exigences touché, avec le constat, la correction, la preuve. État : fait.

| Point | Constat (v8.01) | Correction (v8.02) | Preuve | État |
|---|---|---|---|---|
| Lot 1.1 Pont activities() | calculateurs-data.js ne relisait ni requiresMissions, ni once, units, done, l’ordre | relus, avec chapitre, type, déblocage, argent minimum, rang et leurs métadonnées ; rien n’est posé sans donnée publiée | calculateurs-v802.test.cjs (adaptateur) | fait |
| Lot 1.1 Pont des missions | activitesDe ne transmettait que gain, durée, joueurs | coût, préparation, attente, part, investissement, prérequis entre missions, ordre, chapitre, déblocage, une seule fois ; contrôles de forme et des boucles | calculateurs-v802.test.cjs (pont, refus) | fait |
| Lot 1.1 Pont des activités | gen-activites.cjs décrivait sans écrire | écrit ses activités dans calculateurs-activites.js sans toucher aux missions | calculateurs-v802.test.cjs (pont dans un dossier temporaire) | fait |
| Lot 1.2 Argent minimum à détenir | absent du moteur | missionPlan, sessions, parcours, affordableStart, lockedReason, goal, inverse, goalMixed, sessionPlan ; l’argent n’est pas dépensé, la réserve compte ; vérificateur : règle R11 | valeurs calculées à la main (2 parties, 115 000 $ à la fin ; parcours de 90 min) | fait |
| Lot 1.2 Rang ou niveau minimum | absent du moteur | rang demandé, case « Mon rang » seulement si une mission le demande, vérificateur : règle R12 | tests rang absent, trop bas, atteint, R12 | fait |
| Lot 1.2 Blocage expliqué en mots simples | — | « Il te faut encore 12 000 $ avant de pouvoir lancer « X » : elle demande d’avoir 50 000 $ en poche (cet argent n’est pas dépensé), tu en as 38 000 $. », dans le bloc d’explication existant | test des messages exacts | fait |
| Règle : uniquement des ajouts | — | aucune fonction, option, mode, page ni texte retiré ou remplacé | relecture du diff | fait |
| Règle : le visuel ne bouge pas | — | aucune règle CSS touchée ; aucun élément nouveau à l’écran sans donnée publiée | captures au pixel près avant/après : 54 vues sur 54 identiques (téléphone 390 px et ordinateur 1 366 px, 9 outils, 3 modes) ; cadre DOM : 180 vues identiques (6 langues), styles identiques | fait |
| Règle : résultats identiques, sauvegardes lisibles | — | aucune clé nouvelle dans un résultat sans donnée ; empreinte des données inchangée | reference-v801.cjs : 206 résultats (exemples A, B, C, deux modèles, plan, alternatives, vérification) à 0 écart | fait |
| Règle : aucune donnée inventée | — | inconnu = null, statut unknown ; LK_CALC_REGLES tout à null au 20 octobre 2026 | donnees-publiees.cjs (etat) | fait |
| Règle : six langues | — | 40 textes nouveaux traduits par langue (v802-calculateur.json) | langues.cjs --verifier : 0 manque, 0 repère cassé, 0 conflit dans les cinq langues | fait |
| Adapter ce qui est lié (Tuto) | le Tuto ne disait rien des conditions de lancement | une phrase au chapitre du business plan, six langues | tuto.html régénéré | fait |
| Procédure du jour J | — | QUAND-ROCKSTAR-PUBLIE.md § 2 et 2 bis, CALCULATEURS-DONNEES.md, CALCULATEURS-MOTEUR.md | lecture | fait |
| 0 Liens, pages, référencement | — | régénération complète | verifier.js : 0 erreur, 3 987 557 références dans 26 641 pages ; referencement.cjs : 0 défaut bloquant ; couverture : 0 page manquante | fait |
| Léo | — | index régénéré (la version suit le moteur) | gen-leo --check ; leo-eval : 512/512, hors sujet refusés 39/39 | fait |
| Tests | deux tests anciens affirmaient que le pont des activités n’écrit jamais | leur dernière assertion lit le tableau window.LK_ACTIVITIES (vide sans donnée) au lieu de tout le texte du fichier | 94 fichiers outils/tests/*.test.cjs, 1 242 tests réussis, 0 échec | fait |
