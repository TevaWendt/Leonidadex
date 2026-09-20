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
