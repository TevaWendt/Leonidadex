# Moteur des calculateurs Leonidakit

`calculateurs-engine.js` expose les mêmes fonctions pures sous `window.LKCalcEngine` dans le navigateur et `module.exports` dans Node. Aucune dépendance, aucun accès au DOM, aucun stockage, aucune donnée GTA VI intégrée. Les données et hypothèses restent dans l’adaptateur de données et l’interface.

## Contrat commun

- Argent en dollars du jeu, durée des activités en **minutes**, rendements en **dollars par heure**, `share` en **pourcentage de 0 à 100**.
- Entrées numériques JavaScript finies. `null`, chaîne vide, chaîne numérique et valeur absente requise sont invalides. Le contrôleur doit convertir explicitement la saisie sans transformer un champ vide en zéro.
- Chaque montant/taux entré est compris entre 0 et 1 000 000 000 000. Chaque durée en minutes est au maximum 1 000 000. Les heures du ROI sont limitées à 1 000 000 / 60. Le temps quotidien est compris entre 0 exclu et 1 440 minutes.
- Chaque fonction retourne `{valid, reason, ...résultats}`. En cas d’erreur, `valid:false`, une explication lisible en français et des résultats `null` (ou tableaux vides). Le contrôleur affiche l’explication et ne réutilise pas les anciennes valeurs.
- Une grandeur indéfinie (division par zéro, temps vers un objectif inaccessible faute de revenus) vaut `null`, jamais `NaN`, `Infinity` ou `undefined`.
- Les résultats numériques dépassant `Number.MAX_SAFE_INTEGER` sont refusés, même s’ils seraient encore finis. Les répétitions sont des entiers sûrs. Une correction limitée aux erreurs de représentation proches d’un entier évite une répétition artificielle pour des valeurs telles que 0,3 / 0,1.
- Aucun arrondi monétaire n’est imposé par le moteur. L’affichage décide du nombre de décimales. Les entrées ne sont jamais modifiées.

## Activité

```js
LKCalcEngine.activity({
  reward: 25000, cost: 2500, duration: 12, prep: 3,
  cooldown: 5, share: 100, investment: 0, players: 1
});
```

`reward` et `duration` sont obligatoires ; durée strictement positive. `cost`, `prep`, `cooldown`, `investment` valent zéro lorsqu’omis. `share` vaut 100 et `players` vaut 1 lorsqu’omis. Les joueurs doivent être un entier de 1 à 100.

- `net = reward × share / 100 − cost`
- `activeMinutes = duration + prep`
- `cycleMinutes = activeMinutes + cooldown`
- `hourly = net × 60 / cycleMinutes`
- `paybackRuns = ceil(investment / net)` : répétitions entières pour amortir la mise, zéro sans investissement, `null` si la mise est positive mais le net nul ou négatif. Cette formule centralisée corrige les erreurs binaires proches d’un entier (0,07 / 0,01 donne bien 7 répétitions).

La part s’applique au **revenu brut** ; les coûts sont les coûts personnels du joueur. `players` est informatif : la part renseignée ne doit pas être divisée une seconde fois par le nombre de joueurs. Un net négatif est valide pour décrire une activité déficitaire ; il ne permet pas un objectif de croissance.

Le rendement horaire inclut le cooldown : c’est le rendement répétitif de cette activité seule, et non celui d’une stratégie qui occuperait l’attente avec une autre activité. L’investissement est un coût initial distinct des coûts par répétition.

## Objectif et sessions quotidiennes

```js
LKCalcEngine.goal({ capital: 200000, target: 1000000,
  dailyMinutes: 60, activity: monActivite });
```

Un objectif représente du **capital liquide disponible**, après l’investissement initial. Les biens achetés ne sont pas ajoutés au capital final et aucune valeur de revente n’est supposée.

Si l’objectif est déjà atteint : zéro répétition, zéro minute, zéro jour et aucun investissement payé. Sinon le capital doit couvrir l’investissement initial et le bénéfice net doit être strictement positif.

- `missing = target − capital + investment`
- `runs = ceil(missing / net)`
- `runsPerSession = floor((dailyMinutes + cooldown) / cycleMinutes)`
- `sessions = days = ceil(runs / runsPerSession)`
- `totalMinutes = runs × activeMinutes + (runs − sessions) × cooldown`
- `continuousMinutes = runs × activeMinutes + max(0, runs − 1) × cooldown`
- `finalCapital = capital − investment + runs × net`

**Convention de calendrier :** une session par jour, durée maximale choisie par l’utilisateur, activités avec préparation indivisibles. Une activité ne peut pas déborder sur le lendemain. L’attente entre deux répétitions d’une même session compte dans le temps de jeu. Il n’y a aucune attente après la dernière activité d’une session. Le cooldown s’écoule pendant la pause quotidienne. Ce dernier raccourci n’est autorisé que lorsque `cooldown ≤ 1440 − dailyMinutes`, dès que plusieurs sessions sont nécessaires ; sinon le résultat indique explicitement la limite du calendrier. Les temps de chargement et interruptions ne sont pas modélisés : les inclure dans la préparation si besoin.

Ainsi `totalMinutes` désigne les minutes effectivement nécessaires pendant les sessions ; `continuousMinutes` désigne un enchaînement ininterrompu. Les jours ne proviennent pas simplement d’une division du temps continu par le temps quotidien.

Exemple pédagogique : 25 000 $ bruts, 2 500 $ de frais, 12 minutes de mission, 3 de préparation, 5 de cooldown. De 200 000 $ à 1 000 000 $, à raison de 60 minutes/jour : **36 activités, 12 sessions, 660 minutes en session**, capital final 1 010 000 $. En continu : 715 minutes. Aucun de ces chiffres n’est une donnée officielle de GTA VI.

## Rotation d’activités

```js
LKCalcEngine.goalMixed({ capital, target, dailyMinutes,
  activities: [activiteA, activiteB] });
```

Simulation déterministe **A → B → A → B…**, de 1 à 20 activités ; elle ne prétend pas trouver l’optimum. Le cooldown est propre à chaque activité : B peut occuper le délai de relance de A. Les investissements des activités choisies sont additionnés et payés une seule fois au départ. Chaque activité doit produire un net positif et tenir dans une session. Les mêmes conventions de pause quotidienne s’appliquent.

Sorties principales identiques à `goal`, plus `breakdown:[{name,runs,net}]`. Le `hourly` de la rotation est le profit d’exploitation total divisé par son temps effectif en session. `continuousMinutes` simule séparément les mêmes répétitions sans coupure quotidienne. Limite explicite à **100 000 répétitions**, sans résultat partiel présenté comme final. L’investissement reste celui de toutes les activités sélectionnées, même si l’objectif est atteint avant d’exécuter la première rotation complète.

## Temps disponible → capital

```js
LKCalcEngine.inverse({ minutes: 60, activity: monActivite, capital: 200000 });
```

Une seule session continue, avec des répétitions complètes :

- zéro activité si `minutes < activeMinutes` ;
- sinon `runs = floor((minutes + cooldown) / cycleMinutes)` ;
- `totalMinutes = runs × activeMinutes + (runs − 1) × cooldown` ;
- `profit = runs × net − investment` si au moins une répétition, sinon zéro ;
- `finalCapital = capital + profit`.

L’investissement doit être accessible. Si aucune répétition ne tient, il n’est pas dépensé. Le modèle refuse les répétitions déficitaires qui rendraient le capital final négatif. Les coûts par mission sont déduits du revenu en fin de répétition : il ne s’agit pas d’une simulation de trésorerie au sein d’une mission.

## ROI

```js
LKCalcEngine.roi({ purchase, upgrades, fees, revenueHourly, costHourly, hours });
```

`purchase`, `revenueHourly` et `hours` sont requis ; améliorations, frais et coûts horaires valent zéro lorsqu’omis.

- `investment = purchase + upgrades + fees`
- `netHourly = revenueHourly − costHourly`
- `grossProfit = revenueHourly × hours` : **revenus bruts**, nom conservé pour l’API ;
- `operatingProfit = netHourly × hours` : bénéfice d’exploitation ;
- `netProfit = operatingProfit − investment`
- `roiPercent = netProfit / investment × 100` ; `null` sans investissement ;
- `paybackHours = investment / netHourly` si net strictement positif ; `null` sinon. Zéro si investissement nul.

Le ROI est calculé **sur la durée choisie**, après remboursement du prix initial. Exemple : 500 000 $ investis, 75 000 $ nets/h → amortissement en 6 h 40. Le moteur suppose des revenus réguliers ; les missions indivisibles se calculent avec `goal`.

## Achat, budget et ordre

`purchase({capital,price,hourly,target})` renvoie :

- `remaining = capital − price`, négatif si achat inaccessible ;
- `shortfall = max(0, price − capital)` ;
- `capitalPercent = price / capital × 100`, `null` si capital nul ;
- `recoveryHours = price / hourly`, `null` si prix positif et taux nul ;
- `goalDelayHours` : différence des temps vers l’objectif liquide avant/après l’achat, à revenu identique. Zéro si l’objectif reste atteint, `null` si l’un des temps est inaccessible.

`budget({capital,allocations:[...],reserve})` : dépenses = somme des postes ; `remaining` après dépenses ; `available` après dépenses **et réserve** ; `overBudget` indique si dépenses + réserve dépassent le capital. `shares` contient la part de chaque poste dans le capital initial, et non dans le total dépensé. Parts `null` si capital nul. Limite à 100 postes.

`order({capital,hourly,items:[{name,price,boostHourly}]})` : pour chaque achat, attendre seulement le temps nécessaire pour pouvoir le financer, déduire son prix, puis augmenter le revenu horaire. Les achats ont lieu immédiatement une fois accessibles. `steps` donne attente de l’étape, temps cumulé, capital et rendement après achat. `boostHourly` est un **bénéfice net supplémentaire**, sans autre coût automatique. Un achat inaccessible sans revenus retourne une erreur explicite. Limite à 100 achats ; aucun emprunt supposé.

`compareBuy({capital,target,hourly,price,boostHourly})` compare le temps pour atteindre le même objectif liquide après un achat immédiat et le temps sans achat. `affordable:false` rend `buyHours:null` : aucun financement implicite. Le résultat ne choisit pas à la place de l’utilisateur.

## Vérification

Depuis la racine du projet :

```sh
node --test outils/tests/calculateurs-engine.test.cjs
```

Tests de cas chiffrés connus, rendements, part individuelle, investissements, cycles, sessions indivisibles, cooldowns, amortissement, budgets, ordres d’achat, rotation, zéros, valeurs négatives, champs manquants, décimales, valeurs excessives, sorties finies et absence de mutation. Ces tests couvrent les hypothèses du simulateur ; ils ne valident aucune économie officielle GTA VI.

## v8.02 (lot 1) — conditions de lancement d’une mission

Deux conditions, comptées **seulement quand la donnée existe** (sans elles, chaque résultat est identique à la v8.01 : `node outils/tests/reference-v801.cjs`) :

- **`minCash`** (argent à avoir en poche pour lancer la mission, sans le dépenser ; différent des frais `cost` qui, eux, sont payés). Avant chaque lancement : `cash ≥ minCash` (l’argent gardé de côté compte, puisqu’il est détenu), en plus de la règle d’avant (`cash − réserve ≥ frais + achat de départ restant`). Lu par `missionPlan` (parties et parcours : `affordableStart`, seuils d’attente `startThreshold`), `goal`, `inverse`, `goalMixed` et `sessionPlan`. Bloqué, le plan le dit en mots simples : « Il te faut encore 20 000 $ avant de pouvoir lancer « B » : elle demande d’avoir 30 000 $ en poche (cet argent n’est pas dépensé), tu en as 10 000 $. »
- **`minRank`** (rang ou niveau demandé), comparé au rang du joueur `rank` (entrée du plan ; il ne change pas pendant le plan). Sans rang écrit, la mission est bloquée et le plan demande le rang (`lockedReason` : « le rang 5 (écris ton rang dans « Où en es-tu ? ») » ; rang trop bas : « (tu as écrit le rang 3) »). Une mission « une fois » au rang inatteignable rend impossible l’achat d’avant qui l’attend (refus immédiat, `impossibleReq`).
- **`order`** (place dans l’histoire) : parmi plusieurs missions « une fois » prêtes, la première de l’histoire passe d’abord (`byOrder`), puis l’ordre donné.
- **Journal et vérificateur** : l’occupation d’une mission porte `holds` (argent à avoir) et `minRank` quand elle les a ; `cashJournalVerify` ajoute **R11** (lancée avec moins que `holds` en poche, avant ses frais) et **R12** (rang du joueur `claim.rank` sous `minRank`) ; `missionVerify` passe `rules.rank`. Les étapes du programme (`route`) portent aussi `holds` et `minRank`.

## v8.03 (calculateur, lot 2) — réglages en plus, tous éteints par défaut

Sans ces réglages, chaque résultat, chaque explication, chaque hypothèse « Et si… » et chaque entrée du moteur est identique à la v8.01 (`node outils/tests/reference-v801.cjs` : 851 résultats, sections 1 à 6).

- **Moteur, deux entrées facultatives de `missionPlan`** (absentes = rien ne change) :
  - `passiveSim` : la part **simulée** du gain par heure `hourly` (revenu passif de « Mes hypothèses en plus », déjà comprise dans `hourly`). Elle sert seulement à l’affichage : chaque partie et chaque phase portent `simPart` (part du revenu passif) et `hourlyPart` devient `(hourly − passiveSim) × temps hors obtention ÷ 60` ; la règle R9 reste celle du gain par heure.
  - `offline` = `{ cap, passiveHourly, passiveCap }` : **revenu hors ligne** pendant la pause entre deux parties (seulement en parties). Pause avant la partie n ≥ 2 = (jours du calendrier `calendarDays` entre les deux parties) × 1 440 − durée d’une partie. Montant = gains par heure des achats **possédés** au début de la partie (une obtention en cours ne compte pas) × pause ÷ 60 + revenu passif simulé (`passiveHourly` × pause ÷ 60, au plus `passiveCap`), le tout au plus `cap`. Crédité au début de la partie n (journal : `offline: true`, `minutes`), compté dans « gagné » ; chaque partie porte `offline` et `offlineMinutes`, les phases `offline`, le résultat `offlineTotal` et `rules.offline`. Une pause plus longue (week-end) forme une phase à part.
- **Vérificateur** : `missionVerify` ajoute **R13** : un revenu hors ligne n’existe qu’en parties, daté du début d’une partie n ≥ 2, au plus un par partie et exactement un quand il est attendu, durée = pause du calendrier, montant = taux des achats possédés au début de la partie × pause + revenu passif simulé (plafonds compris) ; sans `rules.offline`, aucun revenu hors ligne n’est permis.
- **Scénario** (`calculateurs-scenario.js`) :
  - dépenses simulées par partie (`simCosts` : soins = vie perdue par partie ÷ vie rendue par un soin × prix d’un soin ; amendes, mort, arrestation = nombre par partie × montant) ajoutées aux dépenses par partie là où elles comptent déjà (`upkeepOf` : `hourlyNet`, Mon objectif, projection de Mon temps de jeu, Mon budget, « Mon objectif si j’achète ») ;
  - revenu passif simulé (`simPassive`) ajouté au gain net par heure (`hourlyNet` : Mon objectif « petit à petit », Quoi acheter d’abord ?, et le flux de Mon budget) ; en parties de d minutes, taux effectif = min(par heure, stock × 60 ÷ d) ; sans durée de partie, le stock ne s’applique pas (dit) ;
  - bonus (`simBonus`), partage à parts égales (`shareAuto` : 100 ÷ joueurs, jamais sur une part publiée officielle ou vérifiée) et argent d’un seul personnage (`moneySplit` : une activité dont `characters` ne contient pas ce personnage porte `otherCharacter` et est écartée avec la raison) appliqués dans `activities()` ;
  - « Je revends ce que je possède déjà » (`goal.resaleOwned`) : Mon objectif, sa projection et « Mon objectif si j’achète » partent de l’argent + la revente des achats possédés (`withResale`, une seule fois) ; en « ce que je vais gagner », la revente ne compte pas comme un gain ;
  - business plan (`planExtras`, appliqué à la sortie de `planInputBase`) : `useHypotheses` (dépenses simulées ajoutées à `upkeepPerSession`, revenu passif ajouté à `hourly` avec `passiveSim`, bonus et partage sur les missions, missions « Jouée par » l’autre personnage écartées dans `excludedByCharacter`), `includeFailure` (k tentatives ratées sur 10 de Mes hypothèses : mission qui se refait, récompense et points × (10 − k) ÷ 10 ; mission faite une seule fois, frais, durée et préparation × 10 ÷ (10 − k) ; k = 10 refusé par `planMissing`), `offline` (entrée `offline` du moteur), `resaleAfterGoal` (`planResale` : `resaleAfterGoal` = total, achats revendus, argent à la fin, coût net ; le temps pour le but ne change pas) ;
  - « Ce qui compte dans ce calcul » : `extrasExplain` (appelé par `explainTool`) ajoute les valeurs marquées simulation, ce que chaque réglage change et ce qui manque ; éteints, l’explication est rendue telle quelle. Les leviers « frais et dépenses » et « ce que tu gagnes » de « Et si autre chose change ? » bougent aussi les dépenses et le revenu passif simulés, là où ils comptent.
- Tests : `outils/tests/calculateurs-v803.test.cjs`.
- Traductions : `outils/langues/<en|es|it|de|pt>/v803-calculateur.json` (textes des scripts, paragraphes du Tuto, sept sujets de Léo, ligne « Jouée avec » des fiches) ; les noms courts des dépenses simulées (« frais de soins », « amendes à payer ») ne sont pas des mots seuls, pour ne jamais toucher les identifiants `soin` et `amendes` des scripts traduits. Questions de Léo : `outils/tests/leo-questions-v803-<code>.json` (rejouées par `leo-eval.cjs` après la régénération de Léo et des langues).
