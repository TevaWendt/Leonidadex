# Calculateur : lot 5 — validation contradictoire et livraison consolidée

Ce document accompagne le lot 5 du cahier « Même interface, intelligence renforcée ». Il n'est chargé par aucune page. Les captures, journaux de recette, sondes et corpus de mesure restent hors du dépôt.

## Repères

- **Base** : GitHub `main`, commit `9fc0813c`. Lots faits, chacun en commit local sur la branche `calc` : lot 1 `7570c739`, lot 2 `1710f7f9`, lot 3 `e7e44b63`, lot 4 `d2ad9f3c`. Lot 5 : livré ici.
- **Périmètre** (cahier § 15, lot 5) : reprendre chaque entrée du registre ; vérifier les fonctions, les interactions, les résultats, les sauvegardes, l'accessibilité, les performances et la compatibilité de déploiement ; corriger les anomalies ; publier le bilan exact de couverture ; livrer le projet consolidé.
- **Méthode** :
  1. deux relectures contradictoires indépendantes, chacune avec ses propres sondes et des attendus écrits à la main : la première sur les lots 3 et 4 (corrigée au lot 4), la seconde sur les lots 4 et 5 (corrigée ici) ;
  2. un audit automatique (11 tests A1 à A11, `outils/tests/calculateurs-lot5-audit.test.cjs`) et 6 tests des corrections (T5-01 à T5-06, `outils/tests/calculateurs-lot5.test.cjs`) ;
  3. deux corpus de phrases neufs pour la barre de saisie, écrits à l'aveugle par d'autres rédacteurs, mesurés une fois avant toute correction (§ 3) ;
  4. les contrôles en vrai navigateur déjà présents dans le dépôt, passés sur la base et sur la version finale ;
  5. la recette complète (§ 11).
- **Hors périmètre** : aucune page hors calculateur modifiée à la main ; aucun texte fixe, contrôle, style ni agencement modifié ; aucune donnée du jeu.

## 1. Fichiers touchés au lot 5

- `calculateurs-hub.js` (barre « Que veux-tu calculer ? ») : lecture plus prudente — une valeur n'est écrite que sur un indice net (§ 2) ; notes quand une phrase reste ambiguë ou qu'un chiffre est calculé.
- `calculateurs-engine.js` : `investmentActivities`, règle unique du « remboursé après » (§ 2).
- `calculateurs-plan.js` : prévu d'une partie en parcours avec un gain par heure (`journalCash`).
- `calculateurs-workspace.js` : identifiants en double (A7) ; éditeur du point réel du plan.
- `calculateurs-visuals.js` : « 1 mission faite » (au lieu de « 1 missions faites »).
- `calculateurs-notebooks.js` : rien n'est jamais écrasé (`persist`).
- Copies `en/`, `es/`, `it/`, `de/` de ces scripts et des pages, régénérées ; `outils/langues/{en,es,it,de}/calculateur-lot5.json` : nouvelles phrases de la barre et « mission faite ».
- Tests : `calculateurs-lot5.test.cjs` (nouveau, T5-01 à T5-06) ; `calculateurs-lot5-audit.test.cjs` (nouveau, A1 à A11) ; T4-11 ajouté ; T3-24 réécrit pour la règle actuelle du remboursement (§ 2).
- Rapports : ce rapport ; registre (lignes du lot 4 précisées, § 8 complété) ; phrases inexactes des rapports des lots 3 et 4 corrigées et signalées en italique.

## 2. Ce que la validation a trouvé et corrigé

### Première relecture (lots 3 et 4) et audit

| Trouvé par | Défaut | Correction | Preuve |
|---|---|---|---|
| Première relecture | 21 défauts : 8 dans la barre, 2 dans le plan, 1 dans les carnets, 8 dans les outils du lot 3, 2 dans les tests et les rapports | corrigés au lot 4 | `CALCULATEUR-LOT4.md` § 8 ; T3-12, T3-19, T3-22, T4-04, T4-07 à T4-10 |
| A7 (accessibilité) | 4 identifiants en double, déjà dans la base : la liste « mode de revenu » d'un achat dessinée dans Comparer et dans Quoi acheter d'abord ? avec le même `id` (et « Il va » dans Comparer et Mes achats) | chaque copie de la liste a son propre `id`, dans des zones déjà classées dynamiques ; les cases de Mes achats gardent les leurs. L'inventaire des contrôles (`CALCULATEUR-INVENTAIRE.md`) ne change que par ces 6 identifiants : mêmes libellés, mêmes cases, mêmes types | A7 ; CALC-01 ; cadre identique |
| A9 (registre) | la règle R3 citait un test « revenu avant l'achat » qui n'existe pas sous ce nom | cite la vraie phrase du test du lot 1 | A9 |
| A10 (langues) | un mot isolé déjà présent ailleurs pouvait rester non traduit (« Remboursement ») | traduit ; A10 vérifie chaque étiquette | A10 |
| Audit du cahier (§ 11) | une ambiguïté (« solo ou à 4 ») ou un manque sans ton argent (« il me manque 800 000 $ ») n'était pas dit | une note dit quoi écrire | T4-11 |

### Seconde relecture (lots 4 et 5)

Le relecteur a passé 108 phrases neuves (pièges) et ses sondes du moteur, du plan et des carnets sur trois versions (base, lot 4, lot 5). Constat principal : la barre du lot 4 lisait mieux les phrases déjà citées, mais se trompait plus souvent que la base sur leurs proches variantes (31 phrases sans erreur sur 61 en français, contre 43 pour la base). La barre a donc été reprise avec une règle de prudence : **ne rien écrire plutôt qu'écrire une valeur fausse.**

| N° | Défaut trouvé | Correction | Preuve |
|---|---|---|---|
| 1 | « 1 million en une heure par jour » et « à l'heure actuelle » lus comme un gain par heure | « en une heure » suivi de « par jour » est une durée ; « à l'heure actuelle », « à l'heure où » ne sont pas « par heure » | T5-01 |
| 2 | Argent lu là où il n'y en a pas : « une voiture de 200 000 $ », « 3 propriétés qui valent… », « un garage qui rapporte… », « investi », « avec 50 000 $ d'améliorations », « je suis à 100 000 $ de mon objectif », « 25 000 RP » | après « j'ai », seuls des durées, des joueurs ou d'autres choses comptées en liste peuvent précéder le montant ; « avec X » n'est ton argent qu'en fin de proposition ; « à X de mon objectif » est ce qui manque ; un grand nombre sans unité suivi d'un nom n'est pas de l'argent | T5-01 |
| 3 | « rien » donnait 0 $ à tort : « je n'ai rien gagné », « nothing to buy », « nada que comprar », « niente da comprare », « nichts zu kaufen », « ohne Geld auszugeben » | la négation ne compte qu'en fin de proposition, dans les cinq langues | T5-01 |
| 4 | « Oui … remboursé après 4 h » pour un temps d'usage de 3 h (le « pour de bon » du lot 4 dépassait la réponse) | règle unique, ci-dessous | T5-02, T5-03, T3-24 |
| 5 | Un achat jamais remboursé montré « Remboursé après 25 min » (repli sur le premier passage), en nouvelle activité comme en amélioration | « Pas atteint avec ces chiffres » quand l'achat ne reste pas devant | T5-02, T5-03 |
| 6 | Plan en parcours avec un gain par heure : « Prévu +0 $ » pour 45 min jouées | le gain arrive en continu : prorata entre deux événements du journal | T5-04 |
| 7 | Page française : empreintes `?v=` du lot 5 pas régénérées | régénération complète | A6 |
| 8 | « $200k », « $1.5M » perdaient leur rôle (« I have $200k ») | le « $ » qui précède fait partie du montant | T5-01 |
| 9 | « 1 million de plus que ça » plus lu comme relatif | seul « en plus de ma voiture » est écarté ; « de plus que mon frère » compare à un autre joueur : écarté | T5-01 |
| 10 | Avec la note « écris aussi ton argent », un autre montant était pris comme but | un but relatif sans ton argent n'écrit plus rien d'autre | T5-01, T4-11 |
| 11 | « une heure trente », « deux heures et demi », « 1 heure 30 » mal lus | lus (90, 150, 90 min) | T5-01 |
| 12 | « Je n'aime pas jouer en solo » → 1 joueur ; « On est à 20 000 $ de… » → 20 joueurs | négation cherchée dans toute la proposition ; « on est à N » suivi de chiffres n'est pas un nombre de joueurs | T5-01 |
| 13 | « sans rien acheter », « à tout prix » ouvraient Mes achats | ces expressions ne parlent pas d'un achat | T5-01 |
| 14 | Amélioration : le « pour de bon » comptait les frais de missions pas finies (137,5 min au lieu de 62,5) | missions finies seulement, comme la réponse | T5-02 |
| 15 | Éditeur du point réel : bilan « Pile comme prévu » après une correction ; rythme réel faux | la correction passe au point suivant ; un prévu devenu inconnu est « — » | T5-05 |
| 16 | Un passage à l'équilibre au bout de la fenêtre simulée pris pour « pour de bon » | au moins deux cycles entiers vérifiés après l'instant retenu | T3-24 |
| 17 | « trois mille cinq cents dollars » → 3 000 | 3 500 ; un composé qu'on ne sait pas finir n'est pas lu | T5-01 |
| 18 | Carnets : une copie « -illisibles » abîmée était écrasée ; un carnet entier illisible très lourd bloquait tout enregistrement | copie datée avant toute réécriture ; appareil plein : texte illisible gardé dans la clé principale, et l'enregistrement réussit | T5-06 |
| — | Déjà dans la base : « à 20 heures », « de 20 h à 22 h », « a las 9 h » lus comme des durées ; « doubler mes 500 000 $ » → but 500 000 ; « j'ai mis 2 h pour… » → 120 min par jour | heures de la journée et plages horaires ; « doubler » : but = 2 × ton argent, dit ; durée passée écartée | T5-01 |
| — | Rapports : six affirmations inexactes (lot 4 § 2, § 4, § 8, § 9 ; registre § 7 et § 8 ; lot 3 § 11) | corrigées, en italique, avec renvoi à ce rapport | A1, A9 |

**Règle du « remboursé après »** (nouvelle activité et amélioration ; même comptabilité que la réponse : l'argent des missions finies, frais compris, moins ce que tu aurais gagné sans l'achat, moins le prix) :
- l'achat est **devant** à la fin du temps d'usage → début de la dernière période où il reste devant jusqu'à cette fin ; ce n'est jamais plus tard que le temps d'usage ;
- **à égalité ou derrière** → l'instant où il passe devant **pour de bon** (scénario I : 4 h 15), seulement si c'est vérifié sur au moins deux cycles entiers et que la différence ne baisse pas sur la seconde moitié de la période regardée ; la période double tant que la différence monte ; sinon « Pas atteint avec ces chiffres ».

Vérification indépendante (simulation écrite à part, hors du dépôt, fenêtre 40 fois plus longue) sur 3 000 cas tirés au hasard (une à trois activités, attentes, préparation une fois, frais, améliorations) : 2 793 cas identiques, 10 cas où le moteur dit prudemment « pas atteint » alors que l'achat passe devant pour de bon très loin après le temps d'usage, 0 cas faux. Le cas « amélioration » de la relecture (estimé « vers 570 min ») vaut exactement 532,5 min, recalculé en fractions exactes.

### Corpus neufs écrits à l'aveugle

Deux agents indépendants ont écrit, sans voir le code de la barre ni les tests, 160 puis 200 phrases avec leurs attendus. Chaque corpus a été mesuré une fois, tel quel (§ 3), puis ses échecs ont servi à corriger des familles entières de phrases (jamais une phrase seule). Sur le second corpus, les 6 phrases qui écrivaient une valeur fausse sont maintenant dans T5-01 :
- « de 22 h à minuit » lu 1 320 min ;
- « 2M de plus d'ici 10 jours » : le relatif perdu ;
- « je dois 300k à la banque » pris pour ton argent ;
- « 250k an hour, sorry, 300k » : la correction perdue ;
- « un millón y medio » lu 1 million ;
- « kostet 400.000, nee, 420.000 » : la correction perdue.

## 3. Bilan exact de couverture

### Registre (`CALCULATEUR-REGISTRE.md`), repris ligne par ligne

| Partie | Lignes | Statut |
|---|---|---|
| § 1 Objectifs et unités | 11 | définitions |
| § 2 Chaîne Mon objectif / Mes achats (lot 1) | 18 | 14 à prouver (11 utilisés, 3 utilisés ou inconnus signalés) ; 3 exclus, 1 hors lot |
| § 3 Business plan et outils connectés (lot 2) | 26 | 24 à prouver ; 1 exclu, 1 hors lot |
| § 4 Règles du vérificateur | 10 | 10 à prouver (R1 à R10) |
| § 6 Outils du lot 3 | 17 | 16 à prouver ; 1 hors lot |
| § 7 Lot 4 | 14 | 14 à prouver (10 utilisés, 3 utilisés ou inconnus signalés, 1 refusé avec une phrase) |
| § 8 Lot 5 | 6 | 6 à prouver (5 utilisés, 1 utilisé ou inconnu signalé) |
| **Total** | **102** | **84 lignes à prouver : toutes citent une preuve, et chaque preuve citée existe (A9)** ; 7 lignes exclues ou hors lot, avec leur raison ; 11 définitions |

A9 lit le registre comme un tableau : il refuse une ligne utilisée sans preuve, un test cité absent (T2 à T5, T2P, A), une règle de causalité citée absente. A1 et A2 font de même pour les tests et les fonctions cités dans les rapports (moteur, scénario, modèle, page, plan, graphiques et barre). La causalité (`outils/calculateur-causalite.cjs`) prouve l'effet de 139 critères sur 139.

### Tests propres à la mission

| Fichier | Tests | Ce qu'ils prouvent |
|---|---|---|
| `calculateurs-decision-lot1.test.cjs` (T1) | 25 | scénarios A, C à H, L, M du cahier ; vérificateur ; optimum du moment d'achat |
| `calculateurs-moteur-lot2.test.cjs` (T2) | 71 | business plan, journal, vérificateur R1 à R10, calendrier |
| `calculateurs-lot2-pages.test.cjs` (T2P) | 20 | les mêmes règles dans la page |
| `calculateurs-lot3.test.cjs` (T3) | 24 | scénarios B, B bis, D, E, G, I ; optimums contre énumération ; seuils ; remboursement (T3-24, 400 cas) |
| `calculateurs-lot4.test.cjs` (T4) | 12 | barre de saisie (5 langues), plan après une partie, carnets, trois modes |
| `calculateurs-lot5.test.cjs` (T5) | 6 | corrections de la seconde relecture et des corpus à l'aveugle |
| `calculateurs-lot5-audit.test.cjs` (A) | 11 | audit ci-dessus |
| Suite complète | 940, tous réussis | dont tous les tests d'avant la mission. 8 de leurs attentes, dans 6 fichiers, ont changé : chacune est une correction écrite dans le test et dans le rapport du lot |

### Barre de saisie : taux de lecture (cahier § 11)

« Sans erreur » = aucune valeur fausse écrite et le bon outil ouvert ; ne rien écrire n'est pas une erreur (une inconnue reste une inconnue). Les deux corpus à l'aveugle ont été écrits par d'autres rédacteurs que les règles, sans voir le code.

| Corpus | Phrases | Base `9fc0813c` | Lot 5, premier passage | Lot 5, après corrections |
|---|---|---|---|---|
| Pièges de la seconde relecture (fr, en, es, it, de, « $ ») | 108 | 84 | 65 (avant corrections) | 107 |
| Aveugle n° 1 | 160 | 83 (26 valeurs fausses) | 118 (11 valeurs fausses) | 160 |
| **Aveugle n° 2 — mesure à retenir** | **200** | **105 (52,5 %) ; 17 valeurs fausses** | **158 (79 %) ; 6 valeurs fausses** | 199 |

La mesure à retenir est le **premier passage du corpus n° 2** : 79 % des phrases sans erreur, contre 52,5 % pour la base, et près de trois fois moins de valeurs fausses (6 contre 17). Les colonnes « après corrections » ne sont plus des mesures neutres : ces phrases ont servi à corriger. Les 36 autres échecs du premier passage ouvraient un autre outil que celui attendu, sans écrire de valeur fausse. La phrase restante (« g 1M5 a depenser jfai koi », écriture SMS) ouvre Mon objectif au lieu de Mon budget.

### Scénarios minimaux du cahier

| Scénario | Résultat attendu (cahier) | Test | Statut |
|---|---|---|---|
| A | 8 h ; 16 parties de 30 min, sans conversion en jours | T1 « A », A11 | vérifié |
| B, B bis | A de 40 min infaisable en 30 min ; deux B (60 000) battent une A | T3-07 | vérifié |
| C | il reste 300 000, il manque 700 000 ; le bien n'est pas de l'argent | T1 « C » | vérifié |
| D | 4 h ; −60 000 sur 2 h ; +60 000 sur 6 h | T1 « D », T3-01 | vérifié |
| E | aucun délai fini, jamais « 0 h » | T1 « E », T3-05, T3-11 | vérifié |
| F | impossible sans financement | T1 vérificateur (F) | vérifié |
| G | pas de rentabilité établie ; gain minimal sur l'horizon | T1 « G », T3-04 | vérifié |
| H | mêmes chiffres dans les modes, le mini-calculateur, la barre | T4-06, A11 | vérifié (Léo : moteur commun, non modifié) |
| I | 80 000 de part et d'autre à 4 h ; préparation comptée une fois ; devant pour de bon à 4 h 15 | T3-12, T3-22, T3-24, T5-02 | vérifié |
| J | 80 000 dépensables, 100 000 à financer, manque 20 000 | T1 vérificateur (J) | vérifié |
| K | intervalle sans probabilité | — | **pas fait** : aucune case min / max n'existe, et le cahier interdit d'en ajouter |
| L | départs 0, 25, 50 ; 60 000 ; fin à 60 comptée | T1 « L » | vérifié |
| M | 55 000 à la fin, équipement payé une fois | T1 « M » | vérifié |
| N | espérance 33 000, pas un gain garanti | — | **pas fait** : aucune case de probabilité ni de perte ; le réglage existant « tentatives ratées » (Expert) compte les frais d'un échec, sans probabilité |

### Les quatre conditions mesurables (cahier § 14)

1. **Chaque critère a un cas qui prouve son effet** : 139 sur 139 (causalité) ; chaque ligne utilisée du registre cite au moins un test qui existe (A9). Chaque recommandation est reliée aux facteurs qui l'ont décidée, dans « Ce qui décide la réponse ».
2. **Optimums retrouvés sur petites instances** : moment d'achat (2 001 instants, T1), suites de missions dans une partie (T3-07), ordres d'achat et groupes (400 cas, T3-14), combinaisons d'activités (T3-16), remboursement (3 000 cas, simulation à part). Les recherches heuristiques disent « meilleur trouvé » et leur portée ; aucune borne n'est annoncée.
3. **Inversions et changements sans effet** : pour chaque famille de recommandations, un seuil vérifié de part et d'autre et un changement sans effet (T1 ; T3-06, T3-10, T3-13, T3-15). Une inconnue qui peut inverser le choix donne une réponse conditionnelle (G, T3-04).
4. **Plans de référence et recalcul** : tous les plans retenus passent le vérificateur (R1 à R10) ; un plan rejeté n'est jamais affiché (T2-17 à T2-24). Après une partie notée, le recalcul égale un plan neuf dans le même état (T4-04, T4-09) ; le prévu d'une partie couvre le même temps que le réel, aussi en parcours (T5-04).

## 4. Audit de conformité au cahier

| Cahier | Exigence | Comment c'est tenu | Statut |
|---|---|---|---|
| Priorité absolue | même interface : aucun champ, bouton, section, infobulle ni graphique ajouté ; textes fixes intacts | cadre identique (150 vues : le panneau des 9 outils dans les 3 modes et les 5 langues, et le cadre commun de chaque langue et de chaque mode) ; inventaire des textes fixes à jour ; 108 et 36 captures identiques à la base ; seules les zones dynamiques inventoriées changent (§ 8) | tenu |
| Priorité absolue | aucun outil supprimé ni privé d'un usage | 9 outils, 3 modes, 5 langues ; T4-06 | tenu |
| Raisonnement opérationnel | état structuré, contradictions, stratégies, simulation, vérification séparée, comparaison, contre-épreuves, restitution, recalcul | registre et lots 1 à 5 ; vérificateur indépendant ; « Ce qui ferait changer la réponse » ; recalcul après une partie | tenu, dans les zones existantes |
| § 1 Contexte | base identifiée, pas de framework, pages hors calculateur intactes | base `9fc0813c` ; HTML / CSS / JS d'origine ; hors calculateur, seuls changent les `?v=` et le compteur de tests de la page À propos (§ 8) | tenu |
| § 1 Langues | FR, EN, ES, IT, DE gardées, réponses dans la langue du parcours | copies régénérées, 0 texte sans traduction ; A10 ; T4-03, T4-08, T5-01 | tenu |
| § 2 Registre | chaque critère : définition, unité, règle, interactions, manque, test, statut | registre, 102 lignes ; causalité 139 / 139 ; A9 | tenu |
| § 3 Situation du joueur | solde, réserve, but « disponible / détenu / gagné », temps de jeu, solo / groupe | lots 1 et 2 | tenu ; préférences de risque : pas de case, non inventées |
| § 4 Faits, hypothèses, inconnues | une inconnue n'est jamais zéro ; conclusion conditionnelle ; seuil | « inconnu signalé » ; G ; case vide refusée par le moteur ; la barre n'écrit rien plutôt qu'une valeur douteuse (§ 2) | tenu |
| § 5 Moteur unique | même moteur pour outils, mini-calculateur, plan, Léo | `calculateurs-engine.js` ; A11 | tenu |
| § 5 Journal | journal daté, solde réconcilié | journal du plan rejoué par `missionVerify` (R1 à R10) | tenu |
| § 6 Temps et étapes | jamais d'argent futur dépensé ; actions indivisibles ; parties discontinues | R2, R5, R8 ; B ; L ; remboursement compté sur les missions finies (§ 2) | tenu |
| § 7 Optimisation | stratégies complètes, branche sans achat, coût d'opportunité, « optimal » seulement si garanti | lot 3 ; A4 (jamais « optimal » à l'écran) | tenu ; « revendre » : pas confirmé dans GTA VI, exclu |
| § 8 Incertitude | seuils, sensibilité, pas de probabilité inventée | seuils de bascule (lot 3) ; ±20 % existant | tenu ; K et N : pas de case (§ 3) |
| § 9 Outils indépendants | chaque outil seul ; logique propre à chacun | lots 1 à 5, outil par outil | tenu |
| § 10 Business plan | étapes, solde après chaque étape, alternatives, recalcul après événements | lot 2, lot 4 ; prévu en parcours et éditeur du point réel (lot 5) | tenu |
| § 11 Langage naturel | règles, pas d'IA ; taux publié sur corpus neuf ; ambiguïté dite | 79 % sans erreur sur 200 phrases écrites à l'aveugle, contre 52,5 % pour la base (§ 3) ; notes : correction, contradiction, joueurs pas clairs, deux durées, chiffre calculé | tenu |
| § 12 Modes | même résultat dans les trois modes ; calculs rapides | T4-06 ; A8 ; latence mesurée (§ 5) | tenu |
| § 13 Sauvegardes | clés, schémas, migration non destructive, imports invalides, reprises | `modelVersion` 2 (lot 2) ; sauvegardes v1 à v5 migrées sans changer un résultat ; import invalide refusé sans écraser l'état ; carnets jamais effacés ni écrasés (T4-05, T4-10, T5-06) | tenu |
| § 14 Recette | tests indépendants, propriétés, preuves de présentation | § 3 et § 11 | tenu, avec les limites dites |
| § 15 Lots | cinq lots, chacun testé | commits locaux, un par lot | tenu |
| § 16 Livrables | résumé, matrice, limites, scénarios, preuves, ZIP, application, reprise, captures à part | rapports des lots 1 à 5 ; ZIP tout-en-un (§ 10) ; captures à part | tenu ; un seul ZIP, comme demandé |

## 5. Contrôles en vrai navigateur

Chromium 141 piloté par Playwright (moteur automatisé, pas un appareil réel ; les largeurs mobiles sont émulées). Les scripts sont ceux du dépôt (`outils/tests/*-browser.cjs`), passés sur la base `9fc0813c` puis sur la version finale.

| Contrôle (`outils/tests/…-browser.cjs`) | Base `9fc0813c` | Version finale |
|---|---|---|
| `calculateurs-browser` | 278 réussis, 0 échec | 278 réussis, 0 échec |
| `calculateurs-check-ultime-browser` | 1 120 réussis, 0 échec | 1 120 réussis, 0 échec |
| `calculateurs-lot-b-browser` | 140 réussis, 0 échec | 140 réussis, 0 échec |
| `calculateurs-parcours-browser` | 161 réussis, 0 échec ; aucune requête en échec | 161 réussis, 0 échec ; aucune requête en échec |
| `calculateurs-v2-browser` | 142 réussis, 0 échec | 142 réussis, 0 échec |
| `carnets-browser` | 94 réussis, 0 échec | 94 réussis, 0 échec |
| `tuto-essayer-browser` | 22 réussis, 0 échec | 22 réussis, 0 échec |
| `zoom-hauteur-browser` (14 pages × 4 tailles) | 56 réussis, 0 échec | 56 réussis, 0 échec |
| `langues-pages-browser` (calculateur, 5 langues) | 28 réussis, 0 échec | 28 réussis, 0 échec |
| `leo-browser` | réussi | réussi |
| `accessibilite-perf-browser` (axe-core 4.14, WCAG A et AA, 44 chargements) | 44 défauts, tous de la règle « le nom accessible contient le texte visible » ; 0 erreur de script | les mêmes 44, aux mêmes endroits ; 0 erreur de script |
| `mots-coupes-browser` (46 pages × 5 largeurs) | 0 au premier passage, 4 au second | 5, puis 5 |

- **Mots coupés** : tous sur la page des gangs (hors du calculateur, inchangée sauf une empreinte `?v=`), à des endroits qui changent d'un passage à l'autre, sur la base comme sur la version finale. C'est la page mesurée pendant une animation, pas un effet des lots.
- **Accessibilité** : aucun défaut nouveau. Les 44 défauts déjà présents sont décrits au § 9.
- **Poids de la page du calculateur** : 1,81 Mo → 2,01 Mo, même nombre de requêtes (35) ; accueil : 1,03 Mo → 1,09 Mo. Les scripts du calculateur ont grandi au fil des cinq lots.

**Latence** (`calculateurs-check-ultime-browser.cjs --latence-seulement`, base puis version finale, l'une après l'autre sur la même machine) :

| Mesure | Base | Version finale |
|---|---|---|
| Page du calculateur prête (DOMContentLoaded) | 1 577 ms | 1 849 ms |
| Changement d'outil (Ça vaut le coup ?) | 103 ms | 116 ms |
| Saisie → réponse (Mon objectif) | 144 ms | 146 ms |
| Business plan complet, mode Expert tout déplié | 329 ms | 332 ms |

## 6. Performances du moteur

Médiane de 15 calculs complets par outil, sur un état chargé (Node 22, sans navigateur). Le test A8 garde une limite large : 250 ms.

| Outil | Base `9fc0813c` (médiane / max) | Version finale (médiane / max) |
|---|---|---|
| Mon objectif | 0,11 / 0,49 ms | 0,13 / 0,43 ms |
| Mes achats | 0,07 / 0,59 ms | 0,13 / 0,55 ms |
| Mon temps de jeu | 0,52 / 1,06 ms | 0,58 / 1,2 ms |
| Mon budget | 0,07 / 0,15 ms | 0,07 / 0,18 ms |
| Quoi acheter d'abord ? (6 achats, tous les ordres) | 9,48 / 19,76 ms | 10,4 / 29,41 ms |
| Quoi acheter d'abord ? (8 achats, recherche locale) | 13,69 / 19,3 ms | 13,2 / 17,55 ms |
| Ça vaut le coup ? | 0,04 / 0,17 ms | 0,17 / 0,35 ms |
| Mes activités | 0,06 / 0,15 ms | 0,46 / 2,05 ms |
| Quel achat choisir ? | 0,19 / 1,55 ms | 0,18 / 0,38 ms |
| Mon business plan | 0,67 / 0,95 ms | 1,17 / 1,97 ms |

Tous les calculs restent très au-dessous de la limite de 250 ms. La lecture d'une phrase par la barre prend moins d'une milliseconde pour 250 caractères, la longueur maximale de la case (moins de 16 ms pour 3 000 caractères).

## 7. Compatibilité de déploiement (GitHub / Vercel)

- `vercel.json` inchangé ; politique de sécurité `script-src 'self'` respectée : aucun script en ligne, aucun gestionnaire `on…=`, ni `eval` ni `new Function` dans le calculateur (A6).
- `.vercelignore` exclut `outils/` : tests, rapports et outils de preuve ne sont jamais mis en ligne, et aucune page ne les charge (A6).
- Les 15 pages qui chargent le calculateur (accueil, Tuto, calculateur ; 5 langues) citent chaque script et chaque feuille de style local avec `?v=` égal à l'empreinte de son contenu (A6).
- Aucun chemin local ni fichier de travail dans les fichiers livrés (A3).

## 8. Preuves que l'interface est conservée (lots 1 à 5)

- **Cadre** (`outils/calculateur-cadre.cjs`) : identique à l'état figé avant le lot 1 — 150 vues, 22 275 lignes, styles identiques.
- **Inventaire des textes fixes** (`outils/calculateur-inventaire.cjs --check`) : à jour.
- **Captures** : 108 vues (fr et de ; 1 280 et 390 px ; 9 outils ; 3 modes), cadre seul, identiques à la base ; 36 vues de référence identiques à la base.
- **Hors calculateur** : seulement les empreintes `?v=` (et celles de Léo, qui inclut le moteur), et le compteur automatique « tests automatisés écrits » de la page À propos (5 langues), de 688 à 858. Les dates du plan du site sont remises.
- **Zones dynamiques dont le contenu a évolué** : réponses, chiffres, explications, étapes et tableaux de résultats existants, courbes existantes, réponse de la barre, bilan du plan. Liste détaillée par lot : lot 1 § 5, lot 2 § 5, lot 3 § 6, lot 4 § 6 ; au lot 5 : la réponse de la barre, le chiffre « Remboursé après », le bilan et le tableau « Réalisé contre prévu » du plan.

## 9. Limites restantes et données non disponibles

- **Aucune donnée de GTA VI** : aucun prix, revenu ni activité confirmé. Tous les montants des tests sont fictifs.
- **K (intervalle) et N (risque)** : pas de case min / max ni de probabilité ; rien n'est inventé.
- **Barre de saisie** : lecteur de règles, pas un modèle d'IA ; ses taux ne valent que pour les corpus mesurés. Elle n'écrit rien plutôt qu'une valeur douteuse, ce qui laisse des cases à remplir. Ne sont pas lus : l'écriture SMS (« g 1M5 jfai koi »), un pourcentage (« 50 % de plus »), une heure à calculer (« il est 21 h 30, je me couche à 23 h »), un montant sous-entendu (« mon pote 500k de l'heure, moi à peine 200k »), un composé en lettres hors du français. Une dette citée à côté de ton argent ne le diminue pas, sauf avec « le reste ». « Je suis niveau 12… » ouvre le business plan (le niveau sert au plan) : choix gardé.
- **Business plan** : « attendre et accumuler » complet et REG6-2 (lot 3 § 9) ; dans une partie, le « prévu » répartit le gain sur ses minutes ; après la correction d'un point, un prévu qui dépendait du chiffre corrigé est « — », pas recalculé (le plan d'alors n'est pas gardé).
- **Remboursement** : quand l'achat est derrière à la fin du temps d'usage et ne passe devant pour de bon que très loin après, le moteur peut dire « pas atteint » (10 cas sur 3 000 tirés au hasard) : prudent, jamais faux.
- **Revente** : non confirmée dans GTA VI, comptée seulement si le joueur écrit un prix de revente.
- **Appareil réel** : non testé ; seulement Chromium automatisé et l'émulation mobile.
- **Accessibilité, défauts déjà présents dans la base, non corrigés** (axe-core, règle WCAG 2.5.3 « le nom accessible contient le texte visible ») : le bouton « Mes calculs » (2 exemplaires) a pour nom « Mes calculs enregistrés : 0 calcul et 0 business plan » alors que son texte visible est « Mes calculs 0 » ; le sélecteur de langue de l'en-tête du site est hors du calculateur. Les corriger réécrirait un libellé existant, ce que le cahier interdit sans accord. Correction proposée : un nom qui commence par le texte visible (« Mes calculs 0 : 0 calcul et 0 business plan enregistrés »).
- **Léo** : non modifié ; il appelle le même moteur.

## 10. Livraison : ZIP tout-en-un, application, reprise

- **Un seul ZIP**, `Leonidakit-calculateur-lots-1-a-5-tout-en-un.zip` : les fichiers modifiés ou ajoutés par les lots 1 à 5 depuis `9fc0813c`, dans l'arborescence exacte du dépôt (2 268 fichiers ; aucun fichier supprimé). Les copies traduites, les pages et les empreintes `?v=` y sont déjà régénérées.
- **Captures et journaux** : dans un ZIP à part, hors du dépôt.
- **Application** :
  1. dézipper à la racine du dépôt (sur `main` à `9fc0813c`), en remplaçant les fichiers ;
  2. rien d'autre à lancer pour le site ;
  3. pour revérifier (Node 22, dépendances de test hors dépôt : jsdom, acorn) :

     ```
     node --test outils/tests/*.test.cjs
     node outils/calculateur-cadre.cjs
     node outils/calculateur-inventaire.cjs --check
     node outils/calculateur-causalite.cjs
     ```
- **État de reprise** : branche locale `calc`, cinq commits au-dessus de `9fc0813c`. Rien n'est poussé ni publié.

## 11. Recette de clôture

Le 6 octobre 2026, sur la branche `calc` : régénération complète, extraction des quatre langues, puis les contrôles ci-dessous. Moteur automatisé : Node 22 et jsdom ; Chromium 141 piloté par Playwright pour les captures et les contrôles en navigateur. Aucun appareil réel.

| Contrôle | Résultat |
|---|---|
| Régénération (`outils/regenerer.cjs`) | sans erreur ; outil de langues : 0 texte sans traduction (en, es, it, de) |
| Suite `node --test outils/tests/*.test.cjs` | 940 réussis sur 940 (922 au lot 4, plus T4-11, T5-01 à T5-06 et A1 à A11). Au premier passage : 939 sur 940, CALC-01 signalant l'inventaire des contrôles pas à jour (les 6 identifiants dédoublonnés, § 2) ; inventaire régénéré, puis suite complète repassée |
| Causalité CALC-02 | 139 conformes sur 139, 0 écart |
| Inventaire (`--check`) | à jour |
| Cadre | identique : 150 vues, 22 275 lignes, styles identiques |
| 108 captures, cadre seul | identiques à la base, 0 erreur JavaScript |
| 36 captures de référence | identiques à la base, 0 erreur JavaScript |
| Contrôles en navigateur | voir § 5 |
| Barre de saisie | bancs du lot 4 (88 phrases des corpus 1 à 3, 43 pièges, 30 phrases du corpus 4, 25 pièges des autres langues) : tous justes ; corpus écrits à l'aveugle : § 3 |
| Remboursement | vérification indépendante sur 3 000 cas : 0 faux (§ 2) |
| Compteur « tests automatisés écrits » (À propos, 5 langues) | 840 → 858 |
| Dates du plan du site | remises comme avant les lots |
