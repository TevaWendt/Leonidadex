# Calculateur, lot 1 : « Même interface, intelligence renforcée »

Ce rapport n'est chargé par aucune page. Les captures et journaux de recette restent hors du dépôt.

## Repères

- **Base** : GitHub `main`, commit `9fc0813c` (« Leonidakit-assemblage-7-sections-modifs (1) »).
- **Lots terminés** : aucun avant celui-ci. Lot 1 : livré ici.
- **Périmètre** : le calculateur seulement, soit `calculateurs.html`, ses scripts `calculateurs-*.js` et leurs copies traduites.
- **Hors périmètre** :
  - aucune autre page modifiée à la main. La régénération réécrit seulement les empreintes de cache `?v=` et le compteur automatique de tests de la page À propos (voir « Application ») ;
  - aucun texte fixe, composant, style ou agencement modifié.

## 1. Inventaire de l'existant

**Outils (9, tous conservés)**

| Outil | Rôle |
|---|---|
| Mon objectif | temps et argent pour atteindre un but |
| Mes achats | puis-je l'acheter, que me reste-t-il, effet sur le but |
| Mon temps de jeu | quoi faire dans ma partie |
| Mon budget | coût dans la durée |
| Quoi acheter d'abord ? | ordre d'achat |
| Ça vaut le coup ? | rentabilité ou achat plaisir |
| Mes activités | comparer des activités |
| Quel achat choisir ? | comparer des achats |
| Mon business plan | plan étape par étape |

Chaque outil existe en trois modes (Simple, Pas à pas, Expert) et cinq langues.

**Moteur et contrôleurs**
- `calculateurs-engine.js` : fonctions pures, partagées avec Léo et le mini-calculateur de l'accueil.
- `calculateurs-scenario.js` : état, objectifs, analyses.
- `calculateurs-modele.js` : statuts des valeurs, explications « Ce qui compte ».
- `calculateurs.js`, `calculateurs-workspace.js`, `calculateurs-plan.js` : affichage.

**Données**
- 32 facteurs dans `outils/modele-donnees.json`.
- Catalogue des fiches : **0 prix et 0 activité de GTA VI confirmés**. Toutes les valeurs viennent du joueur ou sont des exemples.

**Sauvegardes** : `lk-calculator-v1` (état, version 6, `modelVersion` 1), plus les carnets, l'historique récent, la référence et les replis.
- Le lot 1 n'ajoute **aucun champ** à l'état. Les anciennes sauvegardes s'ouvrent telles quelles.
- Leurs résultats peuvent changer dans les cas listés en § 4 (corrections).

## 2. Capacités ajoutées ou corrigées

1. **Une chaîne de décision complète, rejouable** : `B.goalPurchase` (« Mon objectif si j'achète / si je n'achète pas »). Elle suit 9 traitements identifiables :
   1. état : faits, préférences, contraintes, inconnues ;
   2. contrôles ;
   3. dépendances : un achat qui débloque une activité, le gain en plus, le coût d'usage ;
   4. stratégies : sans achat, acheter maintenant ou dès que possible, acheter juste avant le but ;
   5. simulation : journal d'argent daté ;
   6. vérification indépendante de chaque journal ;
   7. comparaison ;
   8. seuil qui inverserait la conclusion ;
   9. restitution dans Mes achats, sans changer l'interface.
2. **Un vérificateur de plan indépendant** : `E.cashJournalVerify`, règles R1 à R7 (voir `CALCULATEUR-REGISTRE.md` § 3). Un plan qui dépense de l'argent pas encore gagné, touche la réserve, paie deux fois un achat ou annonce un faux total est rejeté.
3. **Le moment d'achat optimal (modèle continu)** : `E.purchaseGoalTiming`.
   - Il compare « au plus tôt » et « juste avant le but ».
   - Le temps total varie en ligne droite avec l'instant d'achat, donc l'optimum est à une des deux bornes. Un test le vérifie sur une grille de 2 001 instants.
   - Il rend aussi le **seuil de gain en plus** au-delà duquel l'achat ne recule plus le but.
4. **Correction du scénario H.** Avant, « Mon objectif si je n'achète pas » de Mes achats ignorait plusieurs réglages pris en compte par Mon objectif :
   - le sens du but ;
   - les dépenses prévues ;
   - les dépenses par partie ;
   - le modèle « à la fin de chaque mission ».

   Mes achats affiche maintenant **exactement** le temps de Mon objectif.
5. **Correction du scénario C.** « Tu auras à la fin » de Mon objectif comptait la dépense prévue (et, en missions, les dépenses par partie) comme argent encore détenu. Elle est maintenant payée. La courbe la retire dès qu'elle se paie, sans toucher à la réserve.
6. **Inconnues jamais comptées comme zéro en silence.**
   - Si le gain en plus de l'achat est inconnu, la stratégie est calculée sans gain en plus.
   - L'inconnue est nommée dans « Ce qu'il manque » (« Gain en plus »).
   - Le seuil qui changerait la réponse est donné dans « Ce qui changerait la réponse ».
7. **« Ça vaut le coup ? » (achat plaisir)** : le retard sur l'objectif vient de la même chaîne. Le temps pour retrouver son argent et le temps d'attente utilisent le gain net, dépenses par partie comprises.

**Partage du moteur entre les composants.** Les outils lisent le même état : objectif, argent, réserve, gain, missions, achats.
- Lot 1 : Mon objectif, Mes achats et « Ça vaut le coup ? » passent par `B.goal` et `B.goalPurchase`. Les journaux d'argent passent par `E.cashJournalVerify`.
- Lots 2 à 4 : brancher sur ces deux briques le business plan, « Quoi acheter d'abord ? », « Quel achat choisir ? », Mon temps de jeu et le hub de questions. Le but est que le même cas donne le même chiffre partout.

## 3. Matrice de couverture du lot 1

| Exigence | Critère | Logique | Fichier | Test | Résultat | Statut |
|---|---|---|---|---|---|---|
| Objectif | sens, cible, dépenses prévues | `goalTarget` | S | T1 C, H ; C02 | 7 h ; 1 000 000 à la fin | fait |
| Contrainte de session | temps de partie, dépenses par partie, missions entières | gain net ; missions indivisibles | S, E | T1 A, H, cycles ; page | 16 parties ; 9 h 29 / 10 h 32 | fait |
| Dépense | prix total, coût d'usage | payé une fois, jamais avant d'avoir l'argent | E, S | T1 D, E, usage, réserve | 7,08 h ; +1,2 h ; 9,2 h ; 10,5 h | fait |
| Alternative sans achat | « sans achat » = Mon objectif | `save = goal()` | S, P | T1 H ; page (3 modes) | égalité exacte | fait |
| Stratégies et moment d'achat | au plus tôt / juste avant le but | optimum aux bornes | E | T1 « optimum garanti » | aucun des 2 001 instants ne fait mieux | fait |
| Dépendances | achat requis par l'activité | sans achat « pas possible » | S | T1 dépendance | 4 h ; « Il faut d'abord l'argent » | fait |
| Faisabilité | réserve, argent futur, prérequis, doublons, simultanéité | R1 à R7 | E | T1 M, F, J, R3, R4, B, R6, R7, L | 9 corruptions rejetées | fait |
| Inconnues | gain en plus, coût d'usage | signalées, jamais 0 en silence | S | T1 G, inversion | `extraKnown:false`, seuil 15 000 $/h | fait |
| Sensibilité | seuil du gain en plus | inversion exacte | E | T1 E, inversion | 15 000 : égal ; 15 001 : avance | fait |
| Changement sans effet | revente, envie, nom | exclus avec raison | S | T1 « sans effet » | temps inchangés | fait |
| Relecture contradictoire | dépense prévue couverte, prix 0, activité de récupération, gain nul, gain net nul, temps de partie absent | 6 défauts corrigés (§ 7) | S, P, W, E | T1 tests 19 à 24 ; 4 000 situations au hasard | 0 plan rejeté à tort | fait |
| Cohérence entre outils | Mon objectif ↔ Mes achats ↔ Ça vaut le coup ? | même chaîne | S, P, W | C02 (139 lignes) | voir § 6 | fait |
| Interface identique | cadre, textes fixes, styles | instantané avant/après | `outils/calculateur-cadre.cjs` | `calculateurs-cadre.test.cjs` | identique (150 vues, 5 langues, 3 modes) | fait |
| Traductions | nouvelles phrases dynamiques | mémoire de traduction | `outils/langues/*/calculateur-lot1.json` | `langues.test` | 0 phrase non traduite | fait |
| Données du jeu | prix, activités | — | — | — | aucune donnée confirmée | non disponible |

Légende : E = `calculateurs-engine.js`, S = `calculateurs-scenario.js`, P = `calculateurs.js`, W = `calculateurs-workspace.js`, T1 = `outils/tests/calculateurs-decision-lot1.test.cjs`, C02 = `outils/calculateur-causalite.cjs`.

Toutes les valeurs attendues de T1 sont calculées à la main dans les commentaires du test, jamais avec la fonction testée.

## 4. Scénarios avant / après (vraie page, mêmes saisies)

Saisies faites dans `calculateurs.html?tool=purchase`, base `9fc0813c` (avant) et lot 1 (après). Valeurs lues dans les zones existantes.

État de départ (exemple du site) :
- 200 000 $, objectif 1 000 000 $, 100 000 $/h, parties de 60 min ;
- achat de 100 000 $ qui ne rapporte rien en plus.

| Cas | Mon objectif | « Tu auras à la fin » | Mes achats : si je n’achète pas | Mes achats : si j’achète |
|---|---|---|---|---|
| Défaut (aucune saisie) | 8 h | 1 000 000 $ | 8 h | 9 h |
| Dépense prévue 100 000 | 9 h | ~~1 100 000 $~~ → **1 000 000 $** | ~~8 h~~ → **9 h** | ~~9 h~~ → **10 h** |
| Dépenses par partie 5 000 | 8 h 26 | 1 000 000 $ | ~~8 h~~ → **8 h 26** | ~~9 h~~ → **9 h 29** |
| Sens du but « ce que je possède » | 8 h | 1 000 000 $ | 8 h | 9 h |
| Sens du but « ce que je gagne en tout » | 10 h | 1 200 000 $ | ~~8 h~~ → **10 h** | ~~9 h~~ → **11 h** |
| Réserve 50 000 | 8 h 30 | 1 050 000 $ | 8 h 30 | 9 h 30 |
| Modèle « à la fin de chaque mission » | 11 h | 1 010 000 $ | ~~8 h~~ → **11 h** | ~~9 h~~ → **12 h 10** |
| Dépense prévue 100 000 + dépenses par partie 5 000 | 9 h 29 | ~~1 100 000 $~~ → **1 000 000 $** | ~~8 h~~ → **9 h 29** | ~~9 h~~ → **10 h 32** |
| Prix 350 000 (pas payable tout de suite) | 8 h | 1 000 000 $ | 8 h | ~~Il faut d’abord l’argent~~ → **11 h 30** |
| Prix 350 000 + dépenses par partie 5 000 | 8 h 26 | 1 000 000 $ | ~~8 h~~ → **8 h 26** | ~~Il faut d’abord l’argent~~ → **12 h 07** |

Vérification à la main des valeurs « après » :
- **Défaut** : (1 000 000 − 200 000) ÷ 100 000 = 8 h. Avec l’achat, payé juste avant le but : 900 000 ÷ 100 000 = 9 h. Inchangé.
- **Dépense prévue 100 000** :
  - 900 000 ÷ 100 000 = 9 h ;
  - à la fin : 1 100 000 − 100 000 payés = 1 000 000 $. Avant, la dépense était comptée comme argent détenu.
- **Dépenses par partie 5 000** :
  - gain net 100 000 − 5 000 × 60 ÷ 60 = 95 000 $/h ;
  - 800 000 ÷ 95 000 = 8,42 h, soit **8 h 26** (minute arrondie au-dessus) ;
  - avec l’achat : 900 000 ÷ 95 000 = 9,47 h, soit **9 h 29** ;
  - regagner le prix : 100 000 ÷ 95 000 = 1,05 h, soit **1 h 04**.
- **« Ce que je gagne en tout »** : 1 000 000 à gagner, soit 10 h ; 11 h avec l’achat.
- **Prix 350 000** :
  - payable après (350 000 − 200 000) ÷ 100 000 = 1,5 h ;
  - puis 1 000 000 restent à gagner : 1,5 + 10 = **11 h 30**, égal à l’achat juste avant le but ((1 000 000 + 350 000 − 200 000) ÷ 100 000) ;
  - avant : « Il faut d’abord l’argent », sans durée.
- **Prix 350 000 avec dépenses par partie** :
  - 1 150 000 ÷ 95 000 = 12,11 h, soit **12 h 07** ;
  - attente 150 000 ÷ 95 000, soit **1 h 35** (« Joue encore… », gain affiché 95 000 $) ;
  - regagner le prix : 350 000 ÷ 95 000, soit **3 h 42**.
- **Modèle « à la fin de chaque mission »** : Mes achats reprend le temps de Mon objectif (11 h) au lieu du calcul « petit à petit » (8 h).

Aucune erreur JavaScript dans les 20 chargements.

**Scénarios supplémentaires (tests T1, valeurs écrites à la main)**
- **Achat qui rapporte 30 000 $/h de plus (prix 120 000)** : objectif en 920 000 ÷ 130 000 = 7,08 h au lieu de 8 h. L’achat ne recule plus le but à partir de 15 000 $/h de plus.
- **Coût d’usage plus fort que le gain en plus** : acheter juste avant le but (9,2 h) bat acheter maintenant (920 000 ÷ 90 000 = 10,22 h).
- **Activité qui demande l’achat** :
  - sans l’achat : « Pas possible » ;
  - avec l’achat payé au départ : 8 missions de 30 min, soit 4 h ;
  - avec 100 000 $ seulement : « Il faut d’abord l’argent ».

## 5. Zones dynamiques dont le contenu a évolué

Toutes ces zones existaient déjà. Seules leurs valeurs ou leurs phrases d'explication changent.

- `#purchase-results`, outil Mes achats :
  - les valeurs des deux `.calc-stat` « Mon objectif si je n'achète pas » et « Mon objectif si j'achète » ;
  - la valeur « Pas possible » (libellé existant) quand l'achat ou son absence rend le but impossible ;
  - le temps et le gain par heure de `.calc-next-action p` (gain net si des dépenses par partie existent) ;
  - la valeur du paragraphe « Temps de jeu pour regagner ce prix » ;
  - dans `.b-explain` (« Ce qui compte ») : le facteur « Avancement vers le but » devient utilisé, avec les phrases « Avec cet achat, ton objectif arrive après… », « Cet achat ne recule pas ton objectif… », « Moment de l'achat » ; une ligne dans « Ce qui changerait la réponse » (seuil) ; « Gain en plus » dans « Ce qu'il manque » quand il est inconnu (modèle « petit à petit ») ; « Temps de ta partie » dans « Ce qu'il manque » quand un coût d'usage existe sans temps de partie ; la phrase « Sans cet achat, ce que tu gagnes ne suffit pas… » quand le gain par heure est nul.
- `#goal-results`, outil Mon objectif :
  - la valeur « Tu auras à la fin » ;
  - les points et les montants de la légende de `figure.c-chart`, seulement s'il y a une dépense prévue.
- `#roi-results`, outil « Ça vaut le coup ? », chemin « achat plaisir » : les valeurs « recule de… », « Il te faudra… pour retrouver ton argent » et « joue encore… » (gain net).
- `#expert-purchase` et `#mode-summary-purchase` : reflètent le même « Ce qui compte ».

## 6. Preuves que l'interface est conservée

- **Instantané du cadre.** `outils/calculateur-cadre.cjs` produit `outils/calculateur-cadre.json`, généré sur la base `9fc0813c` avant toute modification.
  - Couverture : 9 outils × 3 modes × 5 langues, plus le cadre commun. Soit 150 vues et 22 275 lignes.
  - Chaque ligne relève : balise, id, classes, état masqué, texte propre, attributs lus (placeholder, aria-label, title, alt, for, type, role…), options des listes.
  - Il prend aussi l'empreinte des feuilles de style.
  - Le test `outils/tests/calculateurs-cadre.test.cjs` compare le site modifié à cet instantané : **identique**.
- **Captures Chromium**, hors du dépôt : fr et de, 1280 px et 390 px, Mon objectif, Mes achats et « Ça vaut le coup ? », 3 modes, soit 36 vues. Les zones de résultats sont vidées, l'horloge est figée et la page est capturée en entier. **36 / 36 images identiques au pixel près** entre avant et après, avec 0 erreur JavaScript.
- **CALC-01** (`outils/calculateur-inventaire.cjs --check`) : « Inventaire à jour » : aucun contrôle, aucune étape ni aucune zone annoncée n'a bougé.
- **CALC-02** : **139 / 139 lignes conformes** (`outils/CALCULATEUR-CAUSALITE.md`, régénéré).
  - Douze lignes attendaient « Mes achats ne change pas » pour des réglages de Mon objectif. Elles attendent maintenant « change », avec la justification écrite dans chaque ligne. C'est la correction H elle-même.
- **Suite complète** : `node --test outils/tests/*.test.cjs` donne **796 tests, 796 réussis, 0 échec**. C'est 770 avant le lot, plus 26 nouveaux : 25 dans T1, 1 pour le cadre. Les traductions (en, es, it, de) : 0 phrase sans traduction.

## 7. Relecture contradictoire

Un relecteur indépendant a cherché des défauts dans le code du lot 1. Il a rejoué 4 000 situations tirées au hasard et vérifié les valeurs à la main. Il a confirmé 6 défauts, tous corrigés, chacun bloqué par un test (T1, tests 19 à 24) :

1. **Dépense prévue déjà couverte au départ.** Le vérificateur rejetait à tort le plan avec achat ; Mes achats affichait « — ». Exemple : 1 000 000 $, but 800 000, dépense prévue 300 000. Résultat attendu et obtenu : 1 h sans achat, 2 h avec. Le but ne compte désormais comme atteint qu'une fois les dépenses prévues payées.
2. **Achat à 0 $ en modèle « missions »** : il était rejeté. Il donne maintenant le même temps que sans achat (2 h 20).
3. **« Ça vaut le coup ? »** ignorait l'activité choisie dans « Avec quoi je regagne cette somme ? ». Exemple A : 1 h au lieu de 1 h 29 (100 000 ÷ 67 500). C'est rétabli.
4. **Gain par heure nul** : les deux temps de Mes achats disparaissaient. Ils reviennent : « Pas possible » sans l'achat, 45 h avec un achat qui rapporte 20 000 $/h.
5. **Gain net nul** (dépenses par partie égales au gain) : Mes achats affichait « joue encore 100 h… (0 $ par heure) ». Aucun temps n'est plus inventé.
6. **Temps de partie pas écrit avec un coût d'usage** : le coût d'usage était compté comme 0 sans le dire. Il est maintenant signalé dans « Ce qu'il manque ».

Deux réglages sont faits en plus :
- en modèle « missions », le gain en plus n'est plus réclamé dans « Ce qu'il manque », puisqu'il n'entre pas encore dans ce calcul ;
- un seuil hors d'échelle n'est plus rendu, au lieu de faire échouer le calcul.

Après correction, les 4 000 situations ne donnent plus aucun plan rejeté à tort.

## 8. Limites restantes et données non disponibles

- **Données du jeu** : aucun prix, revenu ou activité de GTA VI n'est confirmé. Les résultats restent des simulations à partir des chiffres du joueur.
- **Modèle continu.** Le gain par heure est supposé constant. Le seuil et l'optimum valent dans ce modèle seulement.
- **Gain par heure pas écrit, but déjà atteint** : Mes achats n'affiche pas les deux temps, comme avant le lot. Le gain inconnu n'est pas compté comme 0.
- **« Ça vaut le coup ? » avec une activité choisie pour regagner l'argent.** La phrase « En gagnant toujours pareil (… par heure) » cite le gain de Mon objectif, alors que l'attente se compte avec l'activité. C'est un défaut d'avant le lot, laissé tel quel ici ; il est à traiter au lot 3.
- **Modèle « missions ».**
  - Un achat qui ne débloque pas l'activité choisie est placé juste avant le but : c'est le plus court, puisque le gain par mission ne change pas.
  - Un gain en plus par mission dû à un achat n'est pas encore modélisé (lot 2).
- **À traiter aux lots suivants** (relevés par l'audit, non corrigés ici pour rester dans le périmètre du lot 1) :
  - **Lot 2, moteur économique et temps.**
    - Le business plan peut déclarer le but atteint sans les achats d'avant, et ses deux modes divergent.
    - Son journal est tronqué à 600 événements.
    - Ses contrôles de cohérence se vérifient eux-mêmes ; il faut y brancher `cashJournalVerify`.
    - Les gains cumulés ne retirent pas les dépenses par partie.
    - Le gain par heure est compté pendant l'obtention d'un achat.
    - Deux conventions de calendrier coexistent.
  - **Lot 3, optimisation et robustesse.**
    - « Ça vaut le coup ? » compare, au verdict « attendre », comme si l'achat était payé tout de suite ; le cas du gain en plus inconnu rend une erreur au lieu du seuil.
    - « Quel achat choisir ? » retrouve le gagnant par son nom (deux noms identiques donnent le mauvais prix).
    - Pas de stratégie « attendre avant d'acheter » dans le plan.
    - L'ordre des missions dans une partie est approché, pas prouvé optimal.
  - **Lot 4, plan, demandes et recalcul.**
    - Le hub de questions prend le plus grand montant comme prix, et lit « 200.000 » comme 200.
    - Le recalcul après une partie jouée dérive dès le 2e relevé.
    - Une entrée de carnet illisible est effacée.
    - `goalIncomeHourly` est déclaré utilisé mais sans effet.
    - `modelVersion` n'est jamais lu.

## 9. Propositions sur la liste des calculs (à valider, rien n'a été ajouté ni retiré)

Le cahier interdit d'ajouter, retirer ou renommer un outil sans ton accord explicite. Ces idées ne sont donc **pas** appliquées.

1. **Rapprocher « Mes achats » et « Ça vaut le coup ? » (achat plaisir).** Les deux répondent à « puis-je me l'offrir et qu'est-ce que ça me coûte en temps ». Depuis le lot 1, ils partagent le calcul. Une fusion visible demanderait ton accord.
2. **Rapprocher « Mon temps de jeu » et « Mes activités ».** Les deux classent des activités pour un temps donné. Ils pourraient partager un seul classement (lot 3), sans changer leur présentation.
3. **À ajouter, si tu l'acceptes :**
   - un calcul « Après ma partie » : j'écris ce que j'ai gagné, tout se recale. Cela existe en partie dans le business plan ; ce serait un raccourci visible.
   - une fourchette « au pire / au mieux » quand un prix n'est pas confirmé.

   L'une et l'autre ajoutent des éléments visibles, il faut donc ton accord.

## 10. Application

1. Dézippe `Leonidakit-calculateur-lot1-modifs.zip` à la racine du dépôt, en remplaçant les fichiers.
2. Rien d'autre à lancer : les copies traduites, les pages et les empreintes `?v=` sont déjà régénérées dans le ZIP.
3. Pour revérifier :

   ```
   node --test outils/tests/calculateurs-decision-lot1.test.cjs
   node --test outils/tests/calculateurs-cadre.test.cjs
   ```

   Ces deux commandes ont besoin de jsdom, comme les autres tests de page.

**Pages qui changent sans changer à l'écran.** Le moteur est aussi chargé par l'accueil et le Tuto, et Léo inclut le moteur dans son empreinte. La régénération réécrit donc les empreintes de cache `?v=` dans les pages et scripts qui les citent (2 166 fichiers dont c'est le seul changement, vérifié fichier par fichier). Aucun texte ni style de ces pages ne change.

Une seule exception visible, produite automatiquement : sur la page À propos (5 langues), le compteur « tests automatisés écrits » passe de 688 à 714, parce que le lot ajoute 26 tests. La page Tuto ne change pas, à part les `?v=`. Les fichiers techniques `outils/sitemap-dates.json` et `outils/leo-index-manifest.json` suivent l'empreinte de cette page. Les dates du plan du site (`sitemap.xml`) ne changent pas.

## 11. État de reprise

- **Branche locale** : `calc`, sur `9fc0813c`, un commit « lot 1 ». Rien n'est poussé ni publié.
- **Pour repartir** :
  1. appliquer le ZIP sur `main` ;
  2. lancer `node outils/regenerer.cjs` puis la suite de tests ;
  3. le lot 2 commence par `cashJournalVerify` dans le business plan (`evaluate`, `missionSessions`, `reachedOf`).
- **Outils de preuve à relancer à chaque lot** :
  - `outils/calculateur-cadre.cjs` sans `--ecrire` : il doit rester « identique » ;
  - `outils/calculateur-causalite.cjs` ;
  - `outils/calculateur-inventaire.cjs --check`.
