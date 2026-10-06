# Calculateur : lot 3 — optimisation, comparaison et robustesse

Ce document accompagne le lot 3 du cahier « Même interface, intelligence renforcée ». Il n'est chargé par aucune page.

## Repères

- **Base** : GitHub `main`, commit `9fc0813c`. **Lot 1** : commit `7570c739`. **Lot 2** : commit `1710f7f9` (business plan, journal et vérificateur R1–R10, calendrier commun, `modelVersion` 2, 887 tests).
- **Lot 3** : livré ici, sur la branche `calc`, au-dessus du lot 2 ; recette au § 11, relecture après recette au § 12.
- **Périmètre** (cahier § 15, lot 3, avec § 8 « sensibilité » et § 9 « outils intelligents ») : recherches de stratégies, ordres d'achat, alternatives, critères multiples, horizons, coût d'opportunité, sensibilité ; simulations utiles selon les données disponibles ; optimums démontrés sur de petits cas ; heuristiques qualifiées honnêtement.
- **Hors périmètre** : aucune page hors calculateur modifiée à la main. La régénération réécrit les empreintes `?v=` et le compteur automatique « tests automatisés écrits » de la page À propos (5 langues), comme aux lots 1 et 2 (voir § 7) ; aucun texte fixe, contrôle, `id`/`class`, style ni agencement modifié ; aucune donnée du jeu (0 prix, 0 activité confirmés).
- **Points ouverts du lot 2 traités ici** : « Ça vaut le coup ? » (gain en plus inconnu G, coût d'opportunité I, verdict « attendre », seuil exact, scénario E), « Quel achat choisir ? » (noms en double, achat gratuit, seuil qui inverse le gagnant), « Quoi acheter d'abord ? » (branche sans achat, conditions qui inversent l'ordre, achat perdant payé trop tôt), Mon temps de jeu (optimum démontré, partie plus courte), Mes activités (combinaisons), business plan (achat qui en demande un autre payé avant la fin de son obtention, signalé ARI-4 au lot 2).
- **Reportés** (§ 9) : REG6-2, stratégie « attendre et accumuler » complète dans le business plan, intervalle K, perte en cas d'échec N, hub et Léo, recalcul après relevé, carnets (lot 4).

## 1. Fichiers touchés

`calculateurs-engine.js` (moteur), `calculateurs-scenario.js` (analyses et explications), `calculateurs-workspace.js` et `calculateurs-visuals.js` (lecture des valeurs du moteur, dans les zones de résultat existantes), `calculateurs-modele.js` (commentaire de version seulement), `outils/tests/calculateurs-lot3.test.cjs` (nouveau, 23 tests T3-01 à T3-23), `outils/tests/calculateurs-proprietes.test.cjs` (une attente, § 7), `outils/langues/{en,es,it,de}/calculateur-lot3.json` (nouveaux, 94 phrases ; 95 en allemand, où la recette a signalé « Remboursement ». En anglais, espagnol et italien, l'outil de langues ne l'a pas signalé : ce mot isolé, sans accent, figure déjà dans d'autres traductions. La relecture contradictoire l'a trouvé ; il est traduit au lot 4, voir § 12), `outils/CALCULATEUR-INVENTAIRE.md` (régénéré, § 7), ce rapport et le registre. Les copies traduites et les empreintes viennent de `node outils/regenerer.cjs`.

## 2. Capacités ajoutées ou corrigées

1. **L3-1 — « Ça vaut le coup ? », modèle continu** (`E.investmentCompare`).
   - **G** : un gain en plus pas écrit n'est ni une erreur ni un zéro. Verdict `unknown-gain`, réponse conditionnelle et gain minimal pour être remboursé sur l'horizon (`thresholds.extraHourlyForHorizon`).
   - **Attendre l'argent** : l'achat se paie quand l'argent est là (attente = manque ÷ gain actuel), jamais au départ ; la différence garde le même horizon depuis maintenant. Sans gain actuel connu, le moment de l'achat est inconnu et rien n'est chiffré.
   - **Seuil exact** : différence nulle → verdict `even` (« À l'équilibre »), vérifié de part et d'autre.
   - **E** : gain en plus nul ou négatif → « jamais », `breakEvenHours` `null`, jamais « 0 h ».
   - **Prix seuil** (`maxPriceForHorizon`) : m·H si ce prix est payable tout de suite, sinon m·(b·H + A) ÷ (b + m) (attente comprise), `null` sans gain actuel.
2. **L3-2 — Ce qui ferait basculer la réponse, dans le bon sens** (`B.roiChanges`). Achat remboursé (ou pile à l'équilibre) : ce qui le ferait perdre ; sinon : ce qui le ferait gagner. Trois seuils chiffrés par le moteur : prix total, gain en plus par heure, temps d'usage. Rendu dans « Ce qui ferait changer la réponse » (bloc « Ce qui compte » et repli sans modèle) et dans la liste des seuils du volet « Avec ou sans cet achat ».
3. **L3-3 — « Ce qui décide la réponse » lit le moteur** (`explainRoi`). Avant : liste vide, donc « Rien n'est encore calculable : complète les chiffres » sous une réponse calculée. Maintenant : la différence avec / sans l'achat sur le même temps de jeu, puis le remboursement.
4. **L3-4 — Achat gratuit.** `E.roi` : prix 0 et gain net négatif → remboursement `null` (avant : 0, affiché « Remboursé après 0 min »). Réponses, chiffres, courbes : « ne coûte rien au départ », « Rien à rembourser », jamais « 0 min » ni « au moins 0 $ ».
5. **L3-5 — Nouvelle activité (scénario I).** La réponse suit ce qui reste à la fin du temps d'usage : « Oui » seulement si la différence est positive, « À l'équilibre » si elle est nulle, « Pas sur H : … te fait perdre X » si elle est négative (avant : « Oui » avec « il te laisse -20 000 $ de plus »). Le chiffre « Remboursé après » et la jauge comptent ce que tu aurais gagné de toute façon, comme la réponse (avant : 2 h et 233 % là où la réponse disait 4 h).
6. **L3-6 — « Quel achat choisir ? ».**
   - Noms uniques (`B.compareNames`) : deux « Mon achat libre » ne se confondent plus ; le bouton vers le plan vise le bon achat.
   - Un achat gratuit (ou déjà à toi) noté a le meilleur rapport envie / prix (avant : écarté du critère).
   - Prix qui inverse le gagnant (`B.compareChanges`) pour chaque critère chiffré.
7. **L3-7 — « Quoi acheter d'abord ? ».**
   - **Achat perdant payé avec le suivant** (`E.order`, option `deferLosses`) : un achat qui coûte plus à l'usage qu'il ne rapporte se paie en même temps que les achats suivants de l'ordre, jusqu'à ce que le groupe ne fasse plus baisser le gain par heure (ou tout à la fin). L'ordre donné reste tenu. Sans l'option (Léo, ancien appel) : comportement d'avant.
   - **Branche sans achat** : « Rien avant la fin, puis tout d'un coup », comparée dans le tableau des ordres et dite dans « Ce qui compte » (ce que l'ordre fait gagner).
   - **Condition qui inverse l'ordre** (« tout avoir au plus vite ») : prix du premier achat à partir duquel acheter le deuxième avant lui deviendrait plus rapide.
8. **L3-8 — Mon temps de jeu.** `E.sessionPlan` rend `exhaustive` ; « Recherche complète » est dite quand aucune suite n'a été écartée. Programme « Si tu n'as que … » (durée habituelle si elle est plus courte, sinon la moitié de la partie) parmi les autres programmes.
9. **L3-9 — Mes activités : une combinaison plutôt qu'un taux isolé.** Le meilleur enchaînement des activités possibles dans le même temps (moteur de Mon temps de jeu, sans limite de répétition) est dit s'il bat la meilleure activité seule, avec son statut (« Toutes les suites possibles ont été comparées » ou « Meilleure suite trouvée parmi celles essayées »).
10. **L3-10 — Business plan : achat qui en demande un autre** (ARI-4 du lot 2). Il attend que l'autre soit **obtenu** (fin de son obtention), pas seulement payé ; la dépense porte `needs`, contrôlé par le vérificateur (R3).

## 3. Matrice de couverture du lot 3

| Exigence | Critère | Logique | Fichier | Test | Résultat (à la main) | Statut |
|---|---|---|---|---|---|---|
| D | différence sur l'horizon, seuil | `investmentCompare` | E | T3-01 | −60 000 $ (2 h), 0 (4 h, `even`), +60 000 $ (6 h) ; 4,0001 h → `buy`, 3,9999 h → `not-yet` | fait |
| Attendre l'argent | achat payé quand l'argent est là | `wait`, `usable` | E, W, V | T3-02, T3-03, T3-18 | attente 2 h, 340 000 $ contre 300 000 $, +40 000 $ ; prix seuil 140 000 $ ; horizon trop court : 0 | fait |
| G | gain en plus inconnu | `unknown-gain` | E, S, W | T3-04, T3-17 | seuil 12 000 $/h sur 10 h ; aucune alerte | fait |
| E | gain nul ou négatif, gratuit perdant | `never`, `E.roi` | E | T3-05, T3-11 | `breakEvenHours` et `paybackHours` `null` | fait |
| Sensibilité (§ 8) | prix, gain, temps qui font basculer | `roiChanges` | S, W | T3-06, T3-10, T3-21 | 80 000 $ / 30 000 $/h / 6 h (pas remboursé) ; 200 000 $ / 12 000 $/h / 6 h (remboursé) | fait |
| I | préparation comptée une fois, coût d'opportunité | `investmentActivities` | E, W, V | T3-12, T3-22 | 14 missions = 140 000 $ ; 80 000 $ de part et d'autre à 4 h ; −20 000 $ (3 h) ; +40 000 $ (6 h) | fait |
| Achat gratuit | rien à rembourser | `E.roi`, rendus | E, W, V | T3-11, T3-21 | « Rien à rembourser » ; aucune « 0 min » | fait |
| Comparateur | noms, gratuit, gagnant qui change | `compareNames`, `choose`, `compareChanges` | E, S, W | T3-09, T3-13, T3-20 | 120 000 $ (prix, envie / prix), 180 000 $ (remboursement), 400 000 $ (délai) | fait |
| Ordre d'achat | achat perdant payé avec le suivant | `deferLosses` | E, S, W | T3-14, T3-23 | 10 h au lieu de 15 h ; 11 h 40 ; 11 h au lieu d'un blocage | fait |
| Ordre d'achat | branche sans achat, ordre qui s'inverse | `noBuy`, `orderFlip` | S | T3-15 | 25 h (10 h gagnées) ; 150 000 $ ; 112 500 $ | fait |
| B, B bis | optimum de la partie | `sessionPlan.exhaustive` | E, S | T3-07, T3-19 | 60 000 $ = énumération indépendante | fait |
| Partie plus courte | alternative | `sessionRender` | W | T3-19 | « Si tu n'as que … » | fait |
| Combinaisons | mélange d'activités | `activitiesAnalysis.mix` | S | T3-16 | 90 min : 155 000 $ = énumération ; 60 min : aucune | fait |
| Dépendance d'achats d'avant | obtention avant le paiement | `buyPurchases`, R3 | E | T3-08 | 4 parties, 420 000 $ ; parcours 228 min ; corruption → R3 | fait |
| K | intervalle sans distribution | — | — | — | aucune saisie min / max | limite (§ 9) |
| N | perte en cas d'échec | — | — | — | aucune saisie de perte ; réglage « tentatives ratées » existant | limite (§ 9) |

## 4. Optimums démontrés et heuristiques qualifiées

- **Mon temps de jeu** (`E.sessionPlan`). La recherche garde un état par clé (instant, dernière activité, série, nombre de chaque activité, disponibilités). L'argent, le temps actif et l'attente se déduisent de cette clé : deux états de même clé ont le même avenir, l'écarter ne perd rien. Sans faisceau plein ni limite de longueur (`exhaustive: true`), tous les états atteignables sont vus : le programme gardé est le meilleur du modèle (gain, puis temps). Sinon « Recherche bornée » est dit. Vérifié par énumération indépendante (T3-07 ; Mes activités, T3-16).
- **Quoi acheter d'abord ?** Jusqu'à 6 achats, tous les ordres sont comparés ; au-delà, recherche locale annoncée (v7.53, inchangé).
  - **Jamais plus lent qu'avant.** Dans un groupe, chaque préfixe sauf le groupe entier fait baisser le gain par heure. Payé achat par achat, le dernier achat du groupe arrive donc plus tard que payé d'un coup ; après le groupe, l'argent (la réserve) et le gain par heure sont les mêmes. Par récurrence, `deferLosses` n'est jamais plus lent que « dès que possible ».
  - **Jamais plus lent que « tout d'un coup ».** Chaque groupe sauf le dernier ne fait jamais baisser le gain par heure. L'argent gagné à chaque instant est donc au moins celui de « tout d'un coup », et le dernier groupe se paie au plus tard au même moment.
  - **Contrôle empirique.** Le meilleur ordre égale l'optimum de l'énumération indépendante (tous les ordres × tous les découpages en groupes consécutifs) sur 400 cas aléatoires de 2 à 4 achats (T3-14), et sur 2 668 cas en sonde hors dépôt. Ce n'est pas une preuve générale : l'écran dit seulement « Toutes les séquences possibles (N) ont été comparées ».
- **Ordre qui s'inverse.** Échanger les deux premiers achats ne change ni l'argent ni le gain par heure après eux, donc seule la durée de la paire compte. Le seuil est cherché par dichotomie sur le même moteur, au dollar près, puis vérifié au-dessus (X + 1, ×1,5, ×3, ×10). Rien n'est dit si le basculement n'est pas net. Formule de contrôle pour deux achats, sans argent ni réserve : A d'abord tant que pA·gB·(h + gA) < pB·gA·(h + gB).
- **Comparateur.** Seuils exacts par critère :
  - le moins cher : prix du rival ;
  - envie / prix : envie × 100 000 ÷ score du rival ;
  - remboursement : gain du gagnant × délai du rival ;
  - délai : prix du rival, car le gain par heure est le même.
  - Aucun seuil n'est dit pour l'envie (note de 1 à 5) ni pour un gagnant déjà à égalité.
- **Budget de calcul (§ 12)**, mesuré en Node sur l'état d'exemple :

| Calcul | Temps par calcul |
|---|---|
| « Ça vaut le coup ? » continu (analyse + comparaison) | 0,3 ms |
| Comparateur | 0,3 ms |
| Mon temps de jeu | 0,2 ms |
| Mes activités, combinaison comprise (60 à 1 440 min) | ≤ 3,4 ms |
| Quoi acheter d'abord ?, 6 achats (trois recherches de 720 ordres + seuil) | 25 ms |

  Aucun calcul ne bloque la saisie.

## 5. Scénarios avant / après (valeurs à la main)

| Scénario | Avant (lot 2) | Après (lot 3) |
|---|---|---|
| G : prix 120 000 $, gain en plus vide, 10 h | erreur « Aller à la case à corriger » | « Je ne peux pas encore dire… au moins 12 000 $ de plus par heure. » |
| Attendre : 100 000 $ (20 000 gardés), prix 120 000, 20 000 $/h + 20 000 $/h, 10 h | différence +80 000 $ comme si l'achat était payé au départ | achat après 2 h, +40 000 $ (340 000 contre 300 000) |
| D à 4 h | « Oui », +0 $ | « À l'équilibre » |
| Pas remboursé sur 4 h (120 000 $, +20 000 $/h) | « Au-dessus de 80 000 $… il ne serait plus remboursé » | « À 80 000 $ de prix total ou moins, il serait remboursé en 4 h. » |
| Gratuit, +10 000 $/h | « remboursé après 0 min », courbes « après 0 min » | « ne coûte rien au départ », « Rien à rembourser » |
| I à 3 h | « Oui : … il te laisse -20 000 $ de plus », jauge 233 % | « Pas sur 3 h : … te fait perdre 20 000 $ … remboursé qu'après 4 h », jauge 67 % |
| Comparateur : gratuit (envie 3) contre 100 000 $ (envie 4), critère envie / prix | « Payant » | « Gratuit » |
| Ordre : X et Z à 50 000 $, −5 000 $/h d'usage chacun, 10 000 $/h | 15 h | 10 h, « Payé en même temps que le suivant » |
| Ordre : K (10 000 $, −20 000 $/h) puis Y (100 000 $, +20 000 $/h) | « Étape 2 bloquée » | 11 h |
| Mes activités, 90 min (exemples A et B) | « B » seule, 110 000 $ | + « En enchaînant A ×2, B ×1 … 155 000 $, soit 45 000 $ de plus » |
| Plan : B demande A (obtention 60 min) | B payé pendant l'obtention de A | B payé à 60 min ; 4 parties, 420 000 $ |

## 6. Zones dynamiques dont le contenu change, phrases nouvelles

- **« Ça vaut le coup ? »** :
  - réponse, chiffres (« à écrire », « — », « Rien à rembourser »), prochaine étape (texte ; les boutons sont ceux d'avant) ;
  - volet « Avec ou sans cet achat » : cellule « 120 000 $ après 2 h », liste des seuils ;
  - courbes (point d'achat après l'attente, lectures) ;
  - « Ce qui compte » : « Ce qui décide la réponse », « Ce qui ferait changer la réponse », « Il manque » ;
  - origine du coût en plus (« usage de l'achat », « rien d'écrit »).
- **« Quel achat choisir ? »** : noms affichés (« … (2) »), cible du bouton existant vers le plan, « Ce qui ferait changer la réponse ».
- **« Quoi acheter d'abord ? »** :
  - étapes (« Payé en même temps que le suivant… ») ;
  - une ligne de plus dans le tableau existant « Comparer des ordres selon le délai » ;
  - « Ce qui compte » (« Sans achat en route », seuil d'inversion) ;
  - phrase de blocage d'un groupe (« pour « K » et « Y » »).
- **Mon temps de jeu** : « Ce qui compte » (« Recherche complète »), liste existante des autres programmes (« Si tu n'as que … »).
- **Mes activités** : « Ce qui compte » (« En les combinant »).
- **Phrases nouvelles** : dans `outils/langues/{en,es,it,de}/calculateur-lot3.json` (94 phrases, 95 en allemand). L'outil de langues ne signale aucun texte sans traduction ; une étiquette lui a échappé en anglais, espagnol et italien (« Remboursement », § 12).
  - Espaces insécables avant « : » et dans « … ».
  - Aucun mot interdit (CALC-12) dans `.calc-answer` ni (v747) dans les panneaux Expert.

## 7. Preuves que l'interface est conservée

- **Cadre** : `outils/calculateur-cadre.cjs` → attendu « Cadre identique » (recette ci-dessous). Aucun HTML ni CSS du calculateur modifié.
- **CALC-01** : l'inventaire est régénéré par `node outils/calculateur-inventaire.cjs`.
  - Un seul état change : « chiffre par heure (continuous) » (gain en plus vide). Il affichait l'erreur avec « Aller à la case à corriger » ; il affiche la réponse conditionnelle du scénario G.
  - Les composants affichés existent déjà ailleurs : « Ce qui compte dans ce calcul », « Modifier », volet « Avec ou sans cet achat, après 10 h de jeu », « Écrire ».
  - Aucun contrôle, étape ni zone ajouté à la page.
- **CALC-02** (`outils/calculateur-causalite.cjs`) : 139/139 conformes, 0 écart, aucune attente modifiée.
- **Test existant dont une attente change** (commentaire « correction, pas régression ») : `calculateurs-proprietes`. Pour un achat gratuit, le remboursement attendu est 0 seulement si le gain net n'est pas négatif, sinon `null` (scénario E).
- **Tests du calculateur relancés** (sous-ensemble calculateur, 31 fichiers) : 549/549.
- **Recette de clôture** : suite complète, régénération, traductions, CALC-01, CALC-02, cadre, captures. Résultats ajoutés à la fin de ce rapport (§ 11).

## 8. Relecture du lot (audit, corrigé avant la recette)

1. Seuils dits « au-dessus de X, il n'est plus remboursé » pour un achat déjà pas remboursé : sens corrigé (L3-2).
2. Achat gratuit : « remboursé après 0 min », « au moins 0 $ », « se croisent après 0 min » ; « À l'équilibre … exactement le temps où tu t'en sers » pour 0 min : corrigé (L3-4).
3. Nouvelle activité : « Oui » avec une différence négative ; jauge et « Remboursé après » sans le coût d'opportunité : corrigé (L3-5).
4. Gain en plus vide nommé deux fois dans « Ce qui ferait changer la réponse » (« Gain en plus par heure » et « À écrire ») : un seul.
   - Le doublon est reconnu par le verdict du moteur, pas par le texte du message : le texte est traduit dans les autres langues.
5. « Rien n'est encore calculable » sous une réponse calculée (préexistant) : corrigé (L3-3).
6. Noms du comparateur : « X », « X (2) », « X » donnait deux « X (2) » ; maintenant « X (3) ».
7. Phrase de blocage d'un groupe : le nom venait de la variable d'un autre achat ; maintenant tous les achats du groupe sont nommés.
8. Seuil d'inversion affiché « 150 001 $ » au lieu de 150 000 $ : arrondi au dollar, vérifié au dollar suivant.

## 9. Limites restantes et données non disponibles

- **REG6-2** (préexistant, lot 2 § 7) : parcours avec but en points et achats d'avant (181 min là où 171 suffisent). Un correctif d'une ligne déplace 15 parcours sur 2 403 : non appliqué sans nouvelle règle d'optimisation, documenté.
- **Business plan, « attendre et accumuler » complet** : la stratégie « Ce qui rapporte le plus vite d'abord » place déjà les achats sans gain à la fin de l'ordre. Les payer seulement au moment du but économiserait leur coût d'usage entre-temps. Cette règle (déjà dans Quoi acheter d'abord ?, L3-7) n'est pas portée dans `missionPlan`, faute d'une preuve aussi simple avec les missions et les obtentions.
- **Quoi acheter d'abord ?** :
  - pas d'horizon ni de fin de jeu à saisir : l'ordre vise le temps pour tout avoir, l'argent au plus bas ou le premier gain ;
  - l'optimalité du découpage en groupes est vérifiée sur cas aléatoires, pas prouvée en général (§ 4).
- **K (intervalle)** : aucune saisie min / max ; rien n'est inventé.
- **N (perte en cas d'échec)** : aucune saisie de perte ni de probabilité. Le réglage existant « tentatives ratées » (Expert) compte les frais d'une tentative ratée, sans récompense, et dit que c'est une supposition.
- **Mes activités** : la combinaison ne tient pas compte du réglage « tentatives ratées » (dit pour l'activité choisie seulement).
- **Données du jeu** : aucun prix, revenu ni activité de GTA VI confirmé.

## 10. Migration des sauvegardes

- Aucun champ nouveau dans les sauvegardes ; clés et schémas inchangés (`lk-calculator-v1` version 6, carnets `lk-calculator-notebooks-v3`, lien `#plan=`, export JSON).
- **Version du modèle : 2, inchangée.** Les lots 2 à 5 sont livrés ensemble, sans publication intermédiaire : aucune sauvegarde n'existe sous une version 2 « lot 2 seul ». Une sauvegarde de la base (version 1) reçoit une seule fois la notification « version 1 → 2 » (lot 2, C13), qui couvre aussi les corrections du lot 3.
- **Différences de résultat attendues — correction, pas régression** :
  1. « Ça vaut le coup ? » continu :
     - gain en plus vide : réponse conditionnelle au lieu d'une erreur ;
     - pas assez d'argent : différence calculée avec l'achat payé quand l'argent est là ;
     - différence nulle : « À l'équilibre » ;
     - achat gratuit : plus de « 0 min ».
  2. Nouvelle activité ou activité améliorée : verdict selon la différence à la fin ; « Remboursé après » et la jauge comptent le gain d'avant.
  3. Comparateur : un achat gratuit noté peut gagner « envie / prix » ; deux achats du même nom portent « (2) ».
  4. Quoi acheter d'abord ? : avec un achat qui coûte plus à l'usage qu'il ne rapporte, temps plus court et ordre parfois différent.
  5. Business plan : un achat d'avant qui en demande un autre en cours d'obtention est payé plus tard (après l'obtention).

## 11. Recette de clôture

Le 6 octobre 2026, sur la branche `calc` : régénération complète (`node outils/regenerer.cjs`), extraction des quatre langues, puis les contrôles ci-dessous. Moteur automatisé : Node 22 et jsdom, Chromium 141 piloté par Playwright pour les captures. Aucun appareil réel.

| Contrôle | Résultat |
|---|---|
| Suite `node --test outils/tests/*.test.cjs` | 910 réussis sur 910 (887 au lot 2, plus les 23 tests T3) |
| Outil de langues (`--extraire en / es / it / de`) | 0 texte signalé ; une absence non signalée, voir § 1 et § 12 |
| Causalité CALC-02 (`outils/calculateur-causalite.cjs`) | 139 conformes sur 139, 0 écart |
| Inventaire (`outils/calculateur-inventaire.cjs --check`) | à jour |
| Cadre (`outils/calculateur-cadre.cjs`) | identique : 150 vues, 22 275 lignes, styles identiques |
| 108 captures (fr et de ; 1 280 et 390 px ; 9 outils ; 3 modes), cadre seul | identiques à la base, 0 erreur JavaScript |
| 36 captures de référence du lot 1 (fr et de ; 1 280 et 390 px ; 3 outils ; 3 modes) | 0 erreur JavaScript ; 3 vues différentes, expliquées ci-dessous |
| Compteur « tests automatisés écrits » (À propos, 5 langues) | 805 → 828 |

**Les 3 captures différentes** (Mon objectif et « Ça vaut le coup ? » en Pas à pas, 390 px). La ligne « Question 1 sur 3 : … » est une zone vivante (`aria-live`), vidée avant la capture « neutre ». Le changement de hauteur des résultats déclenche un défilement, et le script du mode Pas à pas réécrit alors cette ligne avant la photo. Contre-épreuve : la même capture, avec les zones vidées une seconde fois juste avant la photo, donne 36 vues identiques entre la base et le lot 3. Le cadre n'a donc pas changé. Les recettes suivantes (lots 4 et 5) utilisent un outil de capture qui fige ce rafraîchissement pendant la capture « neutre », pour la base comme pour le lot : 36 vues identiques (`CALCULATEUR-LOT4.md` § 11).

## 12. Relecture contradictoire après la recette

Une relecture indépendante des lots 3 et 4, faite après cette recette, a trouvé huit défauts du lot 3. Ils sont corrigés au lot 4 et décrits dans `CALCULATEUR-LOT4.md` § 8.

- L1 : Mon temps de jeu dit « Recherche complète » à côté de la note fixe « Il en existe peut-être un encore meilleur ».
- L2 et L3 : Quoi acheter d'abord ? dit « aucun de ces achats ne fait gagner plus vite » ou « payé en même temps que le suivant » quand tout se paie tout de suite.
- L4 : « Ça vaut le coup ? » montre un achat payé après la fin du temps d'usage.
- L5 : une nouvelle activité payée à la fin de chaque mission peut être « Remboursée après 4 h » et « Pas remboursée sur 4 h 10 ».
- L6 : « Remboursement » non traduit en anglais, espagnol et italien.
- L7 : le résumé « 4 ordres côte à côte » compte la ligne « Rien avant la fin, puis tout d'un coup ».
- L8 : quand il manque de l'argent et que le gain actuel n'est pas écrit, le moment d'achat est inconnu et le graphique avec / sans l'achat n'est plus dessiné. La base le dessinait comme si l'achat était payé au départ. Ce retrait n'était pas dit ici.
