# Calculateur : registre des critères, règles et interactions (lots 1 à 5)

Ce document accompagne les lots 1 à 5 du cahier « Même interface, intelligence renforcée ». Il n'est chargé par aucune page.

Le registre visible (`outils/modele-donnees.json`, 32 facteurs) **n'est pas modifié**. Il alimente la page Tuto (texte fixe visible) et le bloc « Ce qui compte ». Le registre ci-dessous le complète sans le remplacer.

**Abréviations**
- E = `calculateurs-engine.js`, S = `calculateurs-scenario.js`, M = `calculateurs-modele.js`, P = `calculateurs.js` et `calculateurs-plan.js`, W = `calculateurs-workspace.js`, V = `calculateurs-visuals.js`.
- T1 = `outils/tests/calculateurs-decision-lot1.test.cjs` ; T2 = `outils/tests/calculateurs-moteur-lot2.test.cjs` ; T2P = `outils/tests/calculateurs-lot2-pages.test.cjs` ; T3 = `outils/tests/calculateurs-lot3.test.cjs` ; T4 = `outils/tests/calculateurs-lot4.test.cjs` ; T5 = `outils/tests/calculateurs-lot5.test.cjs` ; A = `outils/tests/calculateurs-lot5-audit.test.cjs` ; H = `calculateurs-hub.js` (barre « Que veux-tu calculer ? »).
- C02 = `outils/calculateur-causalite.cjs`.

**Statuts**
- **utilisé** : le critère entre dans le calcul.
- **exclu (raison)** : présent mais volontairement sans effet ; la raison est dite.
- **inconnu signalé** : une inconnue n'est jamais 0. Elle est nommée, et la conclusion est rendue conditionnelle, avec son seuil.
- **refusé (phrase)** : le calcul s'arrête avec une phrase qui nomme la cause ; rien n'est inventé.
- **hors lot** : le critère existe ailleurs dans le calculateur, mais la chaîne concernée ne le lit pas encore (lot indiqué).

## 1. Objectifs et unités

| Objectif | Unité | Définition exacte | Où |
|---|---|---|---|
| But (sens « ce que je peux dépenser », défaut) | $ disponibles | argent − réserve ≥ but + dépenses prévues ; dans le plan : **et tous les achats d'avant possédés** (lot 2) | S `goalTarget` ; E `reachedOf` |
| But (sens « ce que je possède ») | $ détenus | argent ≥ but ; cible = but − réserve + dépenses prévues ; plan : argent ≥ but et achats possédés | S `goalTarget` ; E `reachedOf` |
| But (sens « ce que je gagne en tout ») | $ gagnés | gains cumulés ≥ but ; cible = disponible + but + dépenses prévues ; plan : **gagné = récompenses − frais − dépenses par partie − coût d'usage + gains par heure** (lot 2, C3a ; les achats d'avant et de départ ne réduisent pas « gagné ») | S `goalTarget` ; E `st.earned` |
| But en points (plan « débloquer ») | points | points ≥ cible et, s'il y a un prix, argent disponible ≥ prix ; manque dit en points (`missingUnits`) | E `reachedOf`, S `unreachedNote` |
| Temps pour le but | heures de jeu (h min, minute arrondie au-dessus) | premier instant où la cible est atteinte | E `goalContinuous`, `goal`, `purchaseGoalTiming`, `missionPlan` |
| Jours (Mon objectif) | jours | temps ÷ minutes par jour, arrondi au-dessus | E `goalContinuous` |
| Jours (plan, Mon temps de jeu) | jours calendaires | **jour de la N-ième partie** quand on joue les `dpw` premiers jours de chaque semaine : ⌊(N−1)/dpw⌋×7 + ((N−1) mod dpw) + 1 (lot 2, C1, un seul calendrier) | E `calendarDays` |
| Argent à la fin | $ | argent quand le but est atteint, dépenses prévues **payées** (lot 1) ; plan : net des achats d'avant, des frais, des dépenses par partie et du coût d'usage | S `settle` ; E `missionResult.finalCash` |
| Manque (plan non atteint) | $ | `available` : max(0, but + réserve + U − argent) ; `held` : max(0, but + U − argent) ; `cumulative` : max(0, but − gagné, U + réserve − argent), U = prix des achats d'avant non payés (lot 2, C2.4) ; « il te manque » de la réponse compte aussi U (REG2-1) | E `missionResult.missing` ; P |
| Seuil du gain en plus | $/h | gain en plus minimal pour que l'achat ne recule pas le but | E `purchaseGoalTiming.extraThreshold` |
| Remboursement d'un achat / du but qui rapporte | h | prix ÷ gain en plus ; `null` quand l'un est 0 (jamais « 0 h ») (lot 2, C6) | E `paybackHours`, `goalPaybackHours` |

## 2. Critères de la chaîne « Mon objectif si j'achète / si je n'achète pas » (lot 1)

| Critère | Nature | Unité | Statut | Règle | Interactions | Fichier | Test |
|---|---|---|---|---|---|---|---|
| Argent actuel | fait | $ | utilisé | point de départ de l'argent | réserve, prix | S `goalPurchase` | T1 A, C, H |
| Argent gardé de côté | contrainte | $ | utilisé | jamais dépensé (vérifié par R2 à chaque dépense) | rend un achat payable plus tard | E `cashJournalVerify` | T1 « réserve » (10,5 h), J |
| Sens du but | préférence | — | utilisé | change la cible (§1) | dépenses prévues | S `goalTarget` | T1 H ; C02 `f-goal-meaning` |
| Dépenses prévues | contrainte | $ | utilisé | s'ajoutent à la cible, puis sont payées (argent à la fin, courbe) | « Tu auras à la fin » | S `settle`, `curveOf` | T1 C, H ; C02 `f-goal-plannedSpend` |
| Dépenses par partie | contrainte | $/partie | utilisé | gain net = gain − dépense × 60 ÷ minutes par partie | gain par heure, attente, regagner le prix | S `goalPurchase` (`hNet`), S `hourlyNet` (lot 2) | T1 H, page ; C02 `f-goal-upkeepPerSession` |
| Temps de partie | contrainte ou inconnu | min | utilisé / **inconnu signalé** | convertit les montants « par partie » en $/h ; en missions, une mission commencée se finit dans la partie ; pas écrit avec un coût d'usage → « Temps de ta partie » demandé | coût d'usage | S `goalPurchase` | T1 A, « usage » |
| Gain par heure | fait (du joueur) | $/h | utilisé | modèle « petit à petit » ; gain nul : sans achat « Pas possible », un achat qui rapporte reste calculé | gain en plus | E `purchaseGoalTiming` | T1 A, D, E, « gain par heure nul » |
| Missions (récompense, frais, durée, préparation, attente, part, achat de départ) | faits (du joueur) | $, min, % | utilisé | modèle « à la fin de chaque mission » : nombre entier de missions | dépendance d'achat | E `goal` via S `goal` | T1 cycles ; C02 `goal-activity-0-*` |
| Prix total (prix + options + frais) | fait | $ | utilisé | payé en une fois, jamais avec de l'argent pas encore gagné (R2) | réserve | S `purchase` | T1 toutes |
| Gain en plus de l'achat | fait ou inconnu | $/h | utilisé / **inconnu signalé** | inconnu → compté 0 pour la stratégie, nommé dans « Ce qu'il manque », seuil rendu | seuil, inversion | E, S | T1 G, inversion |
| Coût d'usage de l'achat | fait ou inconnu | $/partie | utilisé / **inconnu signalé** | retiré du gain après l'achat | moment d'achat | S `usageOf` | T1 « usage » |
| Achat requis par l'activité choisie | dépendance | — | utilisé | sans l'achat, but « pas possible » ; avec, payé au départ | gain par mission | S `goalPurchase` | T1 « dépendance » |
| Déjà possédé | fait | — | utilisé | aucune dépense ; les deux temps sont égaux | — | S `goalPurchase` | T1 limites |
| Moment de l'achat | décision | h | utilisé | au plus tôt, ou juste avant le but : le plus court est gardé (optimum de ce modèle) | gain en plus, coût d'usage | E `purchaseGoalTiming` | T1 « optimum garanti » |
| Prix de revente | fait | $ | exclu (ne change pas le temps pour le but) | — | — | T1 « changement sans effet » |
| Envie, utilité, nom | préférence | — | exclu (n'entre pas dans un temps ni un montant) | — | — | T1 « changement sans effet » |
| Échéance | contrainte | jours | hors lot 1 (déjà rendue par Mon objectif) | — | — | C02 `f-goal-deadlineDays` |
| Nombre de joueurs | contrainte | joueurs | exclu (les exemples se jouent à 1 ; aucune donnée de partage du jeu) | — | — | C02 `f-goal-players` |

## 3. Critères du business plan et des outils connectés (lot 2)

| Critère | Nature | Unité | Statut | Règle | Interactions | Fichier | Test |
|---|---|---|---|---|---|---|---|
| Achats d'avant exigés par le but | dépendance | — | utilisé | le but n'est atteint qu'une fois tous les achats d'avant possédés ; un achat retiré par une stratégie n'est plus exigé | `missing` compte U ; `unpaid` | E `reachedOf`, `missionResult` | T2-02, T2-03 ; T2P P1 |
| Obtention d'un achat (minutes) | contrainte | min | utilisé | l'achat n'est possédé qu'à la fin de l'obtention ; en parties, elle occupe le début de la partie suivante (`acquisitionMinutes`) ; **aucun gain par heure pendant** | gain par heure, R9 | E `buyPurchases`, `missionSessions`, `missionFlow` | T2-04, T2-07, T2-15, T2-37 ; ARI3-3 (obtention encore en cours après 400 parties : note qui nomme l'achat et le temps restant, `pendingAcquisitions`, jamais « réduis le but ») ; la partie rend ses morceaux d’obtention et la part du gain par heure hors obtention, lus par l’affichage (REV7-1, REV7-2) |
| Ordre des achats d'avant | décision (stratégie) | — | utilisé / **refusé (phrase)** | l'ordre donné est tenu : rien ne s'achète tant qu'un achat attend ; un achat qui attend un achat listé après lui, une mission retirée, une mission répétable (jamais « faite ») ou une mission « une fois » plus longue que la partie → « L'achat « X » attend d'abord … qui ne peut pas se faire. », tout de suite, dans les deux modes (ARI2-1) | stratégies (lot 3 : meilleur ordre) | E `neverSatisfied`, `stuckReason` | ARI2-1, ARI2-4 ; T2-34 |
| Cycles et références absentes | dépendance | — | **refusé (phrase)** | « Dépendance circulaire : A → B → A. » ; « Référence absente : « z » n'existe pas dans les données. » ; un nom connu (achat ou mission retirés) n'est pas absent, et un message ne montre jamais un identifiant (`knownNames`, `knownMissions`) | stratégies, plans de secours | E `missionChecks` ; S `planInput` | T2-05, ARI2-2, ARI2-4 ; T2P ARI2-2 |
| Achat d'avant qui rapporte | fait | $/h | utilisé | source de revenu (le plan se calcule sans mission ni gain par heure) ; manque chiffré « Il manque X $ pour « B » … » dans les deux modes | gain par heure, remboursement | E `missionPrep`, `stuckReason` | T2-12, T2-13 |
| Parcours : mission payable en route | décision | — | utilisé | au seul gain par heure, le temps n'avance que jusqu'au prochain achat possible, au but **ou à la première mission rentable débloquée qui devient payable** (frais + achat de départ restant + réserve), **ou à la mission « une fois » prête la moins chère qu'un achat d'avant impayé attend (de proche en proche) ou qui rapporte et finit avant le seuil suivant** (ARI5-1 ; filet : la moins chère quand rien d'autre ne borne le bloc) ; la boucle reprend alors avec des candidats (ARI3-1) ; avant : un seul bloc jusqu'au but (1 000 min au lieu de 110, parties 120 ; « qui ne peut pas se faire » là où 110 min suffisent) | gain par heure, missions | E `missionFlow` | ARI3-1, ARI5-1, ARI4-1 (but « gagné » déjà couvert : le bloc n’est plus borné par lui) |
| Parties : achat de départ non remboursé dans la partie | décision | $ | utilisé | si la partie n'avance pas autrement, la mission la plus rentable par minute, payable et qui tient, est jouée avec son achat de départ payé d'avance (une fois, entrée `asset` `inv:id`) ; sinon le programme de la partie est gardé tel quel (ARI5-4, préexistant) | achat de départ | E `missionSessions` | ARI5-4 |
| Plan : manque au départ (`needAtStart`) | résultat | $ | utilisé | formule de `missing` (C2.4) sur l'état initial, pour les trois sens du but ; lu par « il te manque » (PER5-1) ; prévision du relevé en parcours = argent du journal au dernier événement ≤ temps joué (ARI5-6) | sens du but, achats d'avant | E `missionResult`, `calculateurs-plan.js` | PER5-1, ARI5-6 |
| Gagné (sens « en tout » du plan) | définition | $ | utilisé | net des frais, des dépenses par partie et du coût d'usage ; les achats d'avant et de départ ne le réduisent pas | `earnedTarget` (R7) | E `st.earned` | T2-06 |
| Dépenses par partie (plan) | contrainte | $/partie | utilisé / **refusé (phrase)** | retirées à la fin de chaque partie ; jamais sous la réserve (P2) ; si elles mangent le gain d'une partie → P1 | réserve, gagné, R10 | E `missionSessions` | T2-08, T2-09 ; T2P P3 |
| Attente d'une mission > pause entre deux parties | contrainte | min | **écartée, refus si rien d'autre** | mission répétable jouée à une partie d'avant avec attente > k × 1 440 − S (k parties plus tard) : écartée de la partie ; phrase de Mon objectif seulement si la partie n'avance plus sans elle (ARI5-3) ; but atteint et obtention restante : partie sans mission ; parcours : attentes jouées | calendrier | E `missionSessions` | T2-10, ARI5-3 |
| But atteint pendant une attente (parcours) | temps | min | utilisé | on ne prend que le temps nécessaire, sans relancer la mission | gain par heure | E `missionFlow` | T2-11 |
| Points par heure | fait | points/h | utilisé | crédités sur tout le temps joué (missions et attentes), sauf pendant l'obtention d'un achat, dans les deux modes (ARI2-6) | points des missions | E `accrue`, `missionSessions` | ARI2-6 |
| Préparation « une seule fois » | fait | min | utilisé (API) | en parties : refaite à chaque partie (règle de `inverse`), espacement = durée + attente dès la 2e répétition (ARI2-5) ; en parcours : une seule fois | R5, R8 | E `missionSessions` (`single`), `missionFlow` | ARI2-5 |
| Ce que rapporte le but | fait | $/h | utilisé (après le but) | ne change pas le temps pour l'atteindre ; remboursement = prix ÷ gain (`null` si 0) | « Ce qui compte » | E `missionPrep`, `missionResult` ; S `explainPlan` | T2-14, T2-32, REG-2 |
| Calendrier (jours par semaine) | contrainte | j/sem | utilisé | `calendarDays` (§1), même règle dans le plan et Mon temps de jeu | — | E `calendarDays` | T2-01 ; C02 `f-session-daysPerWeek` |
| Journal et vérification | preuve | — | utilisé | journal complet daté en absolu (≤ 60 000 entrées), rejoué par `missionVerify` ; un plan rejeté n'est jamais proposé (P3) ; journal trop long → vérification ni réussie ni ratée, dit | R1–R10 | E `ledgerAdd`, `actAdd`, `checkAdd`, `missionVerify` ; S `evaluate` | T2-17 à T2-24, T2-34 |
| Plan non atteint en 400 parties / 20 000 étapes | portée | — | **refusé (phrase)** | « Après N parties, tu aurais X $ [et U sur T points] ; il manquerait Y $ [et Z points]. » : recherche interrompue, jamais preuve d'impossibilité | stratégies | S `unreachedNote`, `planStrategies`, `evaluate` | T2-25, ARI2-3 ; T2P P2 ; ARI3-3 (« il resterait T d'obtention pour « X » » quand rien ne manque en argent) |
| Argent de côté bloquant | contrainte | $ | utilisé | « bloqué par l'argent de côté » seulement s'il y en a et qu'un plan existe en y puisant ; sinon la vraie raison | priorité « le plus vite » | S `planStrategies` | T2-25 |
| Mon temps de jeu : cible et dépenses par partie | contrainte | $, $/partie | utilisé | même cible que Mon objectif (`goalTarget`) ; `upkeepPerSession` retiré de chaque partie ; programme rejoué par le vérificateur (R8) | avancement, parties restantes, jours | E `sessionProjection` ; S `projection`, `session` | T2-28, T2-33 ; T2P P4 ; C02 ×3 ; ARI3-2 (la partie suivante, de durée habituelle, part de l'argent après les dépenses de la partie faite) ; ARI4-3 (dépenses plus grandes que l'argent de fin de partie : partie suivante à 0, P7b) |
| Mon budget : dépenses par partie | contrainte | $/partie | utilisé | événement « Dépenses par partie (partie i) » après chaque partie | flux, point bas | S `budgetAnalysis` | T2-29 |
| Quoi acheter d'abord ? : gain net, cible, gain vide | contrainte / inconnu | $/h | utilisé / **inconnu signalé** | attente avec `hourlyNet` ; gain vide ≠ gain nul (P9c) ; sans temps de partie, brut gardé et dit (P9b) ; dépenses qui mangent le gain → cause dite | Mon objectif | S `orderInput`, `hourlyNet` ; E `order` | T2-30, ARI-2 ; T2P P5 |
| Mes activités : dépenses par partie | contrainte | $/partie | exclu (raison P10 : temps non compté en parties, mêmes pour chaque activité) | — | S `explainActivities` | T2-31 |
| Version du modèle | sauvegarde | — | utilisé | `modelVersion` 2 ; `modelUpgradedFrom` gardé ; notification et note Expert ; signature inchangée | carnets, référence | M, S `migrate`, P, W | T2-26 ; T2P P6, P7, P8 |
| Réponse du plan : « il te manque », « Ta prochaine partie » | restitution | $ | utilisé | manque = but + réserve + U − argent (selon le sens) ; la prochaine partie part de l'argent après les achats d'avant-partie, dits avant (« Achète d'abord ») ; seuls les achats d'après-partie viennent « puis » | journal | P | T2P REG2-1, PER2-1 ; plan-v34, plan-ui-v749 |
| Risque N, intervalle K | — | — | hors lot (aucune saisie dans le plan ; rien n'est inventé) | — | — | — |

## 4. Règles du vérificateur indépendant (`E.cashJournalVerify`, `E.missionVerify`)

Le vérificateur rejoue un journal daté (minutes de jeu) **sans rien lire du calcul qui l'a produit**. Depuis le lot 2, chaque plan du business plan retenu et chaque programme de Mon temps de jeu passent par lui ; un plan qui viole une règle est refusé avec la règle en mots (P3) et n'est jamais affiché comme une réponse. Tolérance commune : 1e-6 × max(1, |x|).

| Règle | Contrôle | En mots (P3) | Test (valeur attendue écrite à la main) |
|---|---|---|---|
| R1 | instants lisibles, jamais en arrière ; partie lisible (entier ≥ 1) quand `sessionMinutes` est donné ; en parties, les points de contrôle sont recensés : un seul par partie 0…N (N = parties annoncées), daté n × S, sinon « partie illisible » (ARI6-1) | un instant illisible | T1 « plan corrompu » ; T2-33 ; ARI6-1 (c), (d) |
| R2 | avant chaque dépense : argent ≥ réserve + dépense (aucun argent futur dépensé) | une dépense faite avant d'avoir l'argent | T1 M, F, J ; T2-18 (f) |
| R3 | un prérequis (`needs`) est possédé avant ce qui en dépend ; un `unlocks` porté par une occupation n'est effectif qu'à sa fin (`until`) | une étape faite avant ce qu'elle demande | T1 « revenu de l’achat encaissé avant de l’avoir payé » ; T2-18 (a) |
| R4 | un même achat (`unlocks`) payé une seule fois | un achat payé deux fois | T1 « payé deux fois » ; T2-18 (b) |
| R5 | deux activités (`act`) jamais en même temps | deux actions en même temps | T1 B ; T2-18 (c) ; ARI2-5 |
| R6 | argent final rejoué = argent final annoncé (`asset:true` exclu de « gagné », jamais de l'argent) | un total différent du journal | T1 « total faux » ; T2-18 (d) |
| R7 | instant d'atteinte rejoué = instant annoncé ; le but ne compte qu'une fois l'achat, les dépenses prévues et les achats d'avant (`after`) payés ; en parties, seulement aux points de contrôle (`check`, `checkpoints:true`) ; cible `earnedTarget` pour le sens « gagné » ; but en points : sautée (`skipped:'reach'`) | un but annoncé au mauvais moment | T1 « atteinte fausse », L ; T2-18 (e), T2-20 |
| R8 | chaque action tient dans sa partie : `(session−1)·S ≤ at` et `until ≤ session·S` (`claim.sessionMinutes`) ; chaque événement d'argent daté d'une partie (`session`) tombe dans cette partie (ARI3-4 ; sans numéro de partie, comme dans Mon temps de jeu, rien n'est contrôlé) | une action qui ne tient pas dans sa partie | T2-19 (a), (e), T2-33 |
| R9 | chaque gain par heure (`passive`) = (gain par heure + gains des achats possédés à cet instant) × temps joué (partie : S moins les obtentions ; parcours : `minutes` moins le recouvrement de `[at − minutes, at]` avec une obtention, ARI3-4, et les intervalles `[at − minutes, at]` ≥ 0 qui se suivent sans recouvrement, ARI5-2) ; en parties, chaque partie porte exactement un gain par heure daté n × S (ARI4-2) **dont le montant** = (gain par heure + achats obtenus avant la fin de la partie, hors ceux payés à n × S après elle) × (S − obtention) ÷ 60 (ARI6-2 : un achat d'après-partie avancé devant le gain ne gonfle plus la partie de son boost) | un gain par heure qui ne correspond pas au temps joué | T2-19 (b), (d), (f), T2-07, ARI4-2, ARI6-2 |
| R10 | à chaque partie annoncée (1…N, chacune devant porter son point de contrôle : une partie sans point de contrôle est R10, ARI6-1), exactement une dépense `upkeep` = dépenses par partie + coût d'usage des achats payés, sinon aucune | des dépenses par partie qui ne correspondent pas | T2-19 (c), ARI-1, ARI6-1 (a), (b), (e) |

Options additives de `E.cashJournalVerify` (sans elles : comportement du lot 1) : `owned` (possédés au départ), entrées `act` avec `unlocks` et `session`, entrées `check` (acceptées seulement avec `claim.checkpoints`), `asset:true` sur une dépense, `claim.earnedTarget`, `claim.sessionMinutes`. `E.missionVerify(result)` construit le journal, les possédés et la cible depuis `result.rules` et `result.journal`, et lit `finalCash`, `reached`, `totalMinutes`, `totalSessions` **comme affirmations seulement** ; `journalComplete:false` → `ok:null`, `skipped:'journal'`, jamais « réussie par défaut ».

## 5. Faux critères et limites connues

- **Aucune donnée de GTA VI** : 0 prix, 0 activité confirmée. Tous les montants des tests sont fictifs ; ils vérifient un modèle de simulation, pas une mécanique du jeu.
- « Optimal » veut dire optimal **dans le modèle** (gain par heure constant, aucune autre dépense que celles écrites, achat en une fois). Le plan « parties » prend à chaque partie les missions qui rapportent le plus dans le temps disponible et le dit (« il peut en exister un plus rapide ») ; le parcours compare le programme complet aux sous-ensembles de missions. Aucun optimum global n'est prétendu (lot 3).
- Un plan non atteint en 400 parties ou 20 000 étapes est une recherche interrompue, dite avec sa portée ; jamais une preuve d'impossibilité. Le seul cas où « manque 0 » accompagne « non atteint » : un achat d'avant dont la mission de déblocage est possible mais jamais payable dans l'horizon ; la note nomme alors l'achat (ARI2-1, filet).
- `goalIncomeHourly` (gain du but après achat) est lu par le moteur depuis le lot 2 (remboursement) ; il n'entre pas dans le temps pour atteindre le but, et « Ce qui compte » le dit.
- Points (XP) : le journal est en dollars ; le vérificateur ne rejoue pas les points (`skipped:'reach'`, dit en P5c).
- Attentes reportées d'un jour sur l'autre, hub et Léo, recalcul après relevé : voir `CALCULATEUR-LOT2.md` § 8 (lot 4). Risque N, intervalle K, « attendre et accumuler » dans le business plan, REG6-2 : voir `CALCULATEUR-LOT3.md` § 9.

## 6. Critères des outils renforcés au lot 3

| Critère | Nature | Unité | Statut | Règle | Interactions | Fichier | Test |
|---|---|---|---|---|---|---|---|
| Gain en plus (« Ça vaut le coup ? », continu) | fait ou inconnu | $/h | utilisé / **inconnu signalé** | vide → verdict `unknown-gain`, réponse conditionnelle, gain minimal pour l'horizon ; jamais une erreur ni un 0 | horizon, prix | E `investmentCompare` ; S `explainRoi` ; W | T3-04, T3-17 |
| Moment de l'achat (pas assez d'argent) | contrainte | h | utilisé / **inconnu signalé** | attente = manque ÷ gain actuel ; différence sur le même horizon depuis maintenant ; sans gain actuel : rien n'est chiffré | gain actuel, réserve | E `investmentCompare` ; V | T3-02, T3-03, T3-18 |
| Seuil exact | résultat | $ | utilisé | \|différence\| ≤ 0,005 $ → « À l'équilibre » | — | E, W | T3-01 |
| Prix, gain et temps qui font basculer | sensibilité | $, $/h, h | utilisé | `maxPriceForHorizon` = m·H si payable tout de suite, sinon m·(b·H + A) ÷ (b + m) ; `extraHourlyForHorizon` = prix ÷ temps d'usage + coût ; remboursement = prix ÷ gain net ; phrase dans le sens qui fait basculer | gain actuel, attente | E ; S `roiChanges` | T3-06, T3-10, T3-21 |
| Achat gratuit | fait | $ | utilisé | rien à rembourser ; gain net négatif → jamais remboursé (`null`), jamais « 0 h » | coût d'usage | E `roi`, `investmentCompare` ; W ; V | T3-11, T3-21 |
| Coût d'opportunité (nouvelle activité) | fait (du joueur) | $/h | utilisé | verdict selon la différence à la fin, préparation « une seule fois » comptée une fois ; remboursement et jauge marginaux ; remboursement compté sur l'argent des missions finies, frais compris (gains à la fin des missions, gain d'avant continu) : devant à la fin du temps d'usage → début de la dernière période devant, jamais plus tard que ce temps ; à égalité ou derrière → instant où l'achat reste devant pour de bon (au moins deux cycles, différence qui ne baisse pas), sinon « pas atteint » (seconde relecture, lot 5) | gain actuel | E `investmentActivities` ; W ; V | T3-12, T3-22, T3-24, T5-02, T5-03 |
| Nom d'un achat comparé | identité | — | utilisé | unique (« … (2) », jamais un nom déjà pris) | bouton vers le plan | S `compareNames` | T3-09, T3-20 |
| Envie / prix d'un achat gratuit | préférence | — | utilisé | meilleur rapport possible (avant : écarté) | — | E `choose` | T3-13 |
| Prix qui inverse le gagnant | sensibilité | $ | utilisé | prix du rival ; envie × 100 000 ÷ score du rival ; gain × délai du rival ; rien pour l'envie ni à égalité | critère choisi | S `compareChanges` | T3-13 |
| Achat qui coûte plus à l'usage qu'il ne rapporte | décision | — | utilisé | payé avec les achats suivants jusqu'à un groupe qui ne fait plus baisser le gain (`deferLosses`) ; ordre tenu ; jamais plus lent | réserve, gain | E `order` ; S | T3-14, T3-23 |
| Branche sans achat | stratégie | h | utilisé | « Rien avant la fin, puis tout d'un coup » : comparée, jamais plus rapide qu'un ordre | — | S `orderAnalysis` ; W | T3-15, T3-23 |
| Prix qui inverse l'ordre | sensibilité | $ | utilisé | dichotomie au dollar sur le même moteur, vérifiée au-dessus ; seulement « tout avoir au plus vite » | dépendances | S `orderFlip` | T3-15 |
| Optimum de la partie | preuve | — | utilisé (moteur) | `exhaustive` = aucune suite écartée ; pas écrit à l'écran, car la note existante dit « il en existe peut-être un encore meilleur » (relecture lot 4, L1) | — | E `sessionPlan` | T3-07, T3-19 |
| Partie plus courte | alternative | min | utilisé | durée habituelle si plus courte, sinon la moitié | — | W `sessionRender` | T3-19 |
| Combinaison d'activités | stratégie | $ | utilisé | meilleur enchaînement dans le même temps, dit s'il bat la meilleure seule, avec son statut | joueurs, achats requis | S `activitiesAnalysis` | T3-16 |
| Achat d'avant qui en demande un autre | dépendance | — | utilisé | attend la fin de l'obtention ; `needs` contrôlé (R3) | obtention | E `buyPurchases` | T3-08 |
| Intervalle (K), perte en cas d'échec (N) | — | — | hors lot (aucune saisie ; rien n'est inventé) | — | — | — | — |

## 7. Critères du lot 4 (barre de saisie, plan après une partie, carnets)

| Critère | Nature | Unité | Statut | Règle | Interactions | Fichier | Test |
|---|---|---|---|---|---|---|---|
| Rôle d'un montant dans une phrase | lecture | $ | utilisé | les mots juste avant décident : ce que tu as, ce que tu vises (« il me faut », « besoin de » compris), un prix, un gain par heure ; jamais de l'argent : « besoin de », « perdu », « dépensé », « une dette de », un montant négatif ; ni argent, ni but, ni prix : « de frais », « de dettes », « par mois », « par partie », « mis de côté » | correction, contradiction | H `interpret`, `mentions` | T4-01, T4-07 |
| Correction et exclusion | lecture | — | utilisé | correction (« non », « pardon », « en fait »…) seulement si rien d'autre ne sépare les deux montants, et dite ; « mais » n'en est pas une ; « et non X » écarte X | rôle | H `interpret` | T4-01, T4-07 |
| Contradiction | lecture | — | **refusé (phrase)** | deux montants pour le même rôle sans correction : le dernier gardé, et dit | — | H `route` | T4-01, T4-02 |
| Négation | lecture | $ | utilisé | « je n'ai rien », « je pars de zéro », « j'ai plus un rond » : 0 $ dit, seulement en fin de proposition, dans les cinq langues (lot 5) ; « rien à acheter », « je n'ai rien gagné », « nothing to buy », « ohne Geld auszugeben », « sans argent de côté » ne sont pas « rien » | argent | H `interpret` | T4-01, T4-07, T5-01 |
| But relatif | lecture | $ | utilisé / **inconnu signalé** | « il me manque X », « X de plus » (« de plus que ça » compris) : but = ton argent + X, dit ; sans ton argent dans la phrase : rien n'est rempli, pas même un autre montant (lot 5), et c'est dit ; « X de plus que mon frère » : écarté | argent | H `interpret` | T4-07, T4-11, T5-01 |
| Nombres en lettres, demi-heures, quarts d'heure | lecture | $, min | utilisé | composés français lus en entier (« quatre-vingt mille ») ; ailleurs, un composé n'est pas lu plutôt que lu faux ; heures en lettres avant les demies | — | H `wordsToDigits` | T4-01, T4-07 |
| Temps par jour | lecture | min | utilisé / **inconnu signalé** | « 1h30 », « 1 heure 30 », « une heure trente » = 90 min ; « de 20 h à 22 h » = 120 min ; une heure de la journée (« à 21h30 », « à 20 heures », « a las 9 h »), une durée « par semaine » et une durée passée (« j'ai mis 2 h ») ne sont pas lues ; deux durées différentes : la corrigée, sinon rien et c'est dit (lot 5) | outil ouvert | H `parseMinutesPerDay`, `readMinutes` | T4-01, T4-07, T5-01 |
| Joueurs | lecture | joueurs | utilisé | « seul », « 4 joueurs », « avec 2 amis », « on est 4 », « zu viert » ; négation cherchée dans toute la proposition (« je n'aime pas jouer en solo », lot 5) ; deux nombres différents ou un nombre corrigé : rien n'est rempli, et c'est dit | — | H `parsePlayers` | T4-01, T4-07, T5-01 |
| Langues de la page | lecture | — | utilisé | mêmes règles avec les mots de chaque langue | — | H | T4-03, T4-08 |
| Partie notée (plan) | événement | $, min | utilisé | le recalcul égale un plan neuf dans le même état : mission « une fois » faite, achat de départ payé, argent écrit | prévision | P `logSession` | T4-04 |
| Prévu d'une partie | résultat | $ | utilisé | même temps que le réel ; en parties, argent après les achats d'avant-partie + gain de la partie au prorata des minutes ; en parcours avec un gain par heure, gain au prorata entre deux événements du journal (lot 5 ; avant : « Prévu +0 $ ») ; écart nul : « Pile comme prévu » | achats d'avant | P `logSession`, `journalCash` | T4-04, T4-04b, T5-04 |
| Point réel corrigé ou retiré | événement | $, min | utilisé / **inconnu signalé** | la dernière partie corrigée devient ton état (argent, temps joué) ; la correction du gain et de la durée passe au point suivant, et un prévu qui dépendait du chiffre corrigé devient « — » (lot 5) ; un point retiré ne change que l'historique | courbe « Prévu », bilan, rythme réel | W | T4-09, T5-05 |
| Entrée de carnet illisible | sauvegarde | — | utilisé | jamais effacée ni écrasée : gardée à part (copie datée si une copie existe déjà) ; appareil plein : gardée dans le carnet, et l'enregistrement réussit, même pour un carnet entier illisible (lot 5) | — | carnets `persist` | T4-05, T4-10, T5-06 |
| Trois modes | restitution | — | utilisé | même réponse pour les 9 outils | — | page | T4-06 |

## 8. Critères du lot 5

| Critère | Nature | Unité | Statut | Règle | Interactions | Fichier | Test |
|---|---|---|---|---|---|---|---|
| Ambiguïté ou manque dans une phrase | lecture | — | utilisé / **inconnu signalé** | joueurs « solo ou à 4 », « il me manque X » sans ton argent : rien n'est rempli, et la réponse de la barre dit quoi écrire | joueurs, but relatif | H `route` | T4-11 |
| Identifiant de chaque case | accessibilité | — | utilisé | une liste dessinée dans deux outils a un identifiant par outil : chaque libellé vise sa propre case | — | W `select` | A7 |
| Montant qui n'est pas ton argent | lecture | $ | utilisé | « une voiture de 200 000 $ », « 3 propriétés qui valent… », « 25 000 RP », « mon pote se fait 500k », « j'ai gagné 300 000 hier », « je dois 300k » : ni ton argent, ni un but, ni un gain par heure ; un grand nombre sans unité n'est de l'argent que suivi d'une fin de phrase, d'une monnaie ou d'un petit mot de liaison | argent | H `interpret`, `mentions` | T5-01 |
| Argent en plusieurs endroits, frais à payer | lecture | $ | utilisé | somme quand chaque montant dit où il est (« sur mon compte », « en cash ») ; « le reste » après des frais à payer : argent − frais ; chaque calcul est dit | argent | H `interpret` | T5-01 |
| Argent ou but déduit | lecture | $ | utilisé | « il me manque X pour avoir Y », « je suis à X de mon objectif de Y » : argent = Y − X ; « doubler mes X » : but = 2 × X ; dit | but, argent | H `interpret` | T5-01 |
| Outil ouvert par la barre | lecture | — | utilisé | « X ou Y ? » entre deux biens → Quel achat choisir ? ; « par quoi commencer ? » → Quoi acheter d'abord ? ; « comment répartir ? » → Mon budget ; un temps disponible maintenant, sans montant → Mon temps de jeu ; « sans rien acheter », « à tout prix » ne parlent pas d'un achat | — | H `route` | T5-01 |
