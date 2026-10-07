# Inventaire du calculateur (CALC-01) — généré par outils/calculateur-inventaire.cjs

Ne pas éditer à la main : `node outils/calculateur-inventaire.cjs` le réécrit depuis la page réelle (jsdom) ; le test `calculateurs-check-ultime.test.cjs` compare le fichier livré à ce que la page produit.

Lecture : **kind** = type de contrôle ; **field** = chemin dans le scénario v6 (ce que la case écrit) ; **data** = attributs data-* (ce que le bouton fait) ; (E) = visible en mode Expert seulement ; (opt) = dans un volet facultatif. Les contrôles du mode Pas à pas sont les mêmes cases que le mode Simple, montrées une par une (voir « Étapes »).

## 1. États partagés entre outils

- `goal.capital` : J’ai déjà — partagé par Mon objectif, Mes achats, Mon temps de jeu, Mon budget, Quoi acheter d’abord ?, Ça vaut le coup ?, Mes activités, Quel achat choisir ? (jamais par Mon business plan, qui a plan.situation.capital)
- `goal.reserve` : Argent gardé de côté — partagé par les huit calculs (le plan a plan.situation.reserve)
- `goal.hourly` : Je gagne à peu près ($/h) — partagé par Mon objectif (mode petit à petit), Mes achats, Quoi acheter d’abord ?, Quel achat choisir ?, Ça vaut le coup ? (temps pour regagner, situation « sans »), Mon budget (dans la durée)
- `goal.target` : Je veux avoir — Mon objectif, Mes achats (objectif si j’achète), Mon temps de jeu (avancement), Quoi acheter d’abord ? (reste à gagner)
- `goal.dailyMinutes` : Je joue chaque jour — Mon objectif (jours), Quel achat choisir ? (jours d’attente), Ça vaut le coup ? (parties), Mes achats et Mon budget (coût d’usage par heure)
- `goal.players` : Joueurs — Mon objectif (missions), Mon temps de jeu, Mes activités, Ça vaut le coup ? (activités)
- `assets` : Achats partagés sous clé stable — Mes achats (purchase.key), Ça vaut le coup ? (roi.key, roi.compareKey), Quoi acheter d’abord ? (order.keys), Mon budget (panier = order.keys), Quel achat choisir ? (compare.keys)
- `activities` : Mes trois activités personnelles — Mon objectif (missions), Mon temps de jeu, Mes activités, Ça vaut le coup ? (activités liées), Mon business plan (copie seulement, via « Reprendre mes chiffres » ou « Ajouter cette mission »)
- `analysis` : Hypothèses communes (mode Expert) — carburant, entretien, réparations, assurance (coût d’usage des véhicules), munitions (frais par tentative, aussi dans le plan), tentatives ratées ; besoin d’usage (Quel achat choisir ?) ; horizon en parties (Mes achats, Mon budget, Quel achat choisir ?)
- `views` : Mode par outil (quick / guided / advanced), gardé dans le brouillon
- `session.enabled` : Activités cochées — Mon temps de jeu seulement (et « Reprendre mes chiffres » du plan)

## 2. Entrées venues de l’adresse

- `tool` : goal|purchase|session|budget|order|roi|activities|compare|plan — ouvre l’outil (sinon l’ancre #panel-x / #tab-x / #x)
- `mode` : simple|guided|pas-a-pas|expert — mode de l’outil ouvert ; autre valeur : ignorée avec message
- `capital, target, hourly, reserve, price` : nombres 0…1e12 (prix : sur l’achat lié) ; illisible, négatif : ignoré avec message
- `players` : entier 1…100
- `minutes` : 1…1440 → session.minutes (tool=session), inverse.minutes (tool=activities), plan.situation.dailyMinutes (tool=plan), sinon goal.dailyMinutes
- `type` : vehicules|armes|demeures|entreprises|lieux|planques|vehicle|weapon|property|business|place|hideout|style|customization|consumable|ammo|housing — limite le catalogue ; lieu : message « ne s’achète pas » ; inconnu : ignoré avec message
- `id` : fiche du catalogue (id, type:id ou suffixe) → achat partagé dans l’outil demandé (purchase, roi, compare, order, budget, plan) ; fiche absente ou lieu : message, rien de choisi
- `ids` : a,b,… → 3 au plus en comparaison de fiches (purchase), 12 au plus dans order/budget, 6 au plus dans compare
- `achats` : Nom1|Nom2 (12 au plus, ≤ 80 caractères, sans < > { }) → achats libres à prix inconnu dans budget ou order
- `from` : home|fiche|comparateur|carnet|catalogue|tuto|leo — tuto : lien de retour vers le chapitre (chapter=…) ; leo : lien de retour (back=…) ; les autres n’ont aucun effet
- `chapter, focus` : Tuto : chapter ∈ 15 chapitres ; focus=carnets ouvre le tiroir
- `voir` : identifiant d’un calcul enregistré → fiche en lecture (dialog)
- `leo` : demande v1 {tool, values, items, back} → fenêtre de décision (nouveau / compléter / garder) ; répété ou trop long : refusé
- `#plan=` : état complet encodé (≤ 24 000 caractères) → calcul partagé, copie de l’ancien gardée
- `#atelier, #saved-calcs, #saved-plans` : ancre de l’atelier ; ouvre le tiroir des calculs ou des plans

## 3. Entrées venues de Léo (leo-link.js, demande v1)

- `values.capital, target, hourly, reserve, price, minutes, dailyMinutes, players` : mêmes bornes que l’adresse ; price refusé avec plus d’un achat ; fusion des seules valeurs explicites (mode « compléter ») ou nouveau calcul
- `items` : ≤ 8 fiches (achetables) → Mes achats, Ça vaut le coup ?, Quoi acheter d’abord ?, Quel achat choisir ? (6), Mon business plan (but + achats d’avant)
- `back` : page de retour vérifiée (/x.html ou /dossier/x.html)

## 4. Sauvegardes (clés)

- `lk-calculator-v1` : brouillon courant (scénario v6) — écrit seulement après une saisie (jamais au chargement)
- `lk-calculator-v1-backup-<horodatage>` : copie d’une sauvegarde v1…v4 avant la première écriture v6
- `lk-calculator-notebooks-v3` : carnets : ≤ 160 enregistrements (calculs et plans), actif par outil, référence par outil
- `lk-calculator-notebooks-v3-backup` : copie d’un carnet illisible avant réécriture
- `lk-calculator-saved-v1, lk-calculator-recent-v1, lk-calculator-reference-v2` : anciennes clés, lues une fois et rangées dans le carnet v3 ; jamais réécrites
- `lk-calc-folds-v1` : état ouvert/fermé des points repliables
- `sessionStorage lk-calculator-selection-<type>` : sélection du comparateur des fiches (fiches.js)
- `lk_* (carnets, progression, envies)` : lus en lecture seule : LKCalcOwned (déjà possédé), rangement d’un achat fait depuis le plan (carnets-core)

## 5. Barre commune de l’atelier (hors panneaux)

| où | kind | id | label | data | aria |
|---|---|---|---|---|---|
| atelier | button | calc-save | ☆ Enregistrer ce calcul |  |  |
| atelier | button | calc-saved-open | Mes calculs enregistrés : 0 calcul et 0 business plan | savedOpen | controls=calc-drawer haspopup=dialog |
| atelier | button | calc-share | Partager ↗ |  |  |
| onglets | button | tab-goal | Mon objectif | tab=goal | selected=true controls=panel-goal |
| onglets | button | tab-purchase | Mes achats | tab=purchase | selected=false controls=panel-purchase |
| onglets | button | tab-session | Mon temps de jeu | tab=session | selected=false controls=panel-session |
| onglets | button | tab-budget | Mon budget | tab=budget | selected=false controls=panel-budget |
| onglets | button | tab-order | Quoi acheter d’abord ? | tab=order | selected=false controls=panel-order |
| onglets | button | tab-roi | Ça vaut le coup ? | tab=roi | selected=false controls=panel-roi |
| onglets | button | tab-activities | Mes activités | tab=activities | selected=false controls=panel-activities |
| onglets | button | tab-compare | Quel achat choisir ? | tab=compare | selected=false controls=panel-compare |
| onglets | button | tab-plan | Mon business plan | tab=plan kicker=2 · MON BUSINESS PLAN | selected=false controls=panel-plan |
| modes | button |  | Simple | mode=quick | pressed=true |
| modes | button |  | Pas à pas | mode=guided | pressed=false |
| modes | button |  | Expert | mode=advanced | pressed=false |
| atelier | button |  | Partir de zéro | calcZero |  |
| atelier | button | calc-reset | Remettre les exemples |  |  |
| atelier | button |  | Voir mes calculs enregistrés | bSavedView=calcs |  |
| atelier | button |  | Voir mes business plans | bSavedView=plans |  |
| atelier | text | calc-name | Le nom de mon calcul |  |  |
| atelier | button | calc-save-bottom | ☆ Enregistrer ce calcul | bSaveCurrent |  |
| atelier | button |  | Mes calculs enregistrés : 0 calcul et 0 business plan | savedOpen | controls=calc-drawer haspopup=dialog |
| atelier | button | calc-print | Imprimer |  |  |
| atelier | button | calc-undo | Annuler la remise à zéro |  |  |
| tiroir Mes calculs | button |  | Fermer Mes calculs enregistrés | drawerClose |  |
| tiroir Mes calculs | button |  | ☆ Enregistrer ce calcul | bSave=goal |  |
| tiroir Mes calculs | button |  | Enregistrer une copie | bSaveCopy=goal |  |
| tiroir Mes calculs | button |  | Mes calculs 0 | drawerView=calcs | pressed=true |
| tiroir Mes calculs | button |  | Mes plans 0 | drawerView=plans | pressed=false |
| tiroir Mes calculs | button |  | Ouvrir mon business plan | drawerClose open=plan |  |
| tiroir Mes calculs | a |  |  |  |  |
| tiroir Mes calculs | button | calc-export | Télécharger mon calcul |  |  |
| tiroir Mes calculs | file | calc-import | Ouvrir un fichier de calcul |  |  |
| tiroir Mes calculs | button |  | Partir de zéro | calcZeroProxy |  |
| tiroir Mes calculs | button |  | Recharger les exemples | calcResetProxy |  |
| fiche (dialog) | button |  | Imprimer la fiche | bSheetPrint |  |
| fiche (dialog) | button |  | Ouvrir dans le calculateur | bSheetOpen |  |
| fiche (dialog) | button |  | Fermer la fiche | bSheetClose |  |
| atelier | a |  |  |  |  |
| atelier | a | calc-tuto-return |  |  |  |
| Que veux-tu calculer ? | search | calc-ask-input | Écris ta question avec tes chiffres |  |  |
| Que veux-tu calculer ? | button |  | Trouver le bon calcul ↗ |  |  |
| Que veux-tu calculer ? | button |  | IA | lkiaMode=ia | pressed=true |
| Que veux-tu calculer ? | button |  | Local | lkiaMode=local | pressed=false |
| Que veux-tu calculer ? | button |  | Plus de questions | lkiaShop |  |
| Que veux-tu calculer ? | button |  | Mon premier million ↗ | ask=Combien de temps pour atteindre 1 millio |  |
| Que veux-tu calculer ? | button |  | Est-ce que je peux l’acheter ? ↗ | ask=Puis-je me permettre d’acheter un véhicu |  |
| Que veux-tu calculer ? | button |  | J’ai 30 minutes ↗ | ask=J’ai 30 minutes pour ma session |  |
| Que veux-tu calculer ? | button |  | Ça vaut le coup ? ↗ | ask=En combien de temps un investissement de |  |
| Que veux-tu calculer ? | button |  | 100 k $ | goalPreset=100000 |  |
| Que veux-tu calculer ? | button |  | 500 k $ | goalPreset=500000 |  |
| Que veux-tu calculer ? | button |  | 1 M $ | goalPreset=1000000 |  |
| Que veux-tu calculer ? | button |  | 5 M $ | goalPreset=5000000 |  |
| Que veux-tu calculer ? | button |  | 10 M $ | goalPreset=10000000 |  |

## Mon objectif (`goal`)

**Étapes du pas à pas** : 1. Combien d’argent as-tu maintenant ? · 2. Combien veux-tu avoir ? · 3. Combien gagnes-tu en une heure de jeu ? · 4. Combien de temps joues-tu par jour ?  
**Pas à pas** : Question 1 sur 4 : Combien d’argent as-tu maintenant ?

**Sorties** : goal-results (réponse, chiffres, courbe, prochaine étape, jauge, échéance, « Ce qui compte », formule) ; goal-routes (trois activités comparées) ; expert-goal (Expert : Et si ±20 %, comparer, formule, tous les chiffres) ; mode-summary-goal ; calc-live (annonce)

**Zones repérées dans le panneau** : mode-summary-goal, goal-results, reference-results, goal-routes, expert-goal ; annonces : lk-help-out

**Liens sortants (Expert)** : aucun

| kind | id | field | label | data | aria | mode | réglage |
|---|---|---|---|---|---|---|---|
| button |  |  | Voir en mode Expert | bMode=advanced |  | Simple + Expert | petit à petit, à la fin de chaque mission |
| text | f-goal-capital | goal.capital | J’ai déjà ($) | field=goal.capital number min=0 max=1000000000000 | invalid=false | Simple + Expert | petit à petit, à la fin de chaque mission |
| text | f-goal-target | goal.target | Je veux avoir ($) | field=goal.target number min=0 max=1000000000000 |  | Simple + Expert | petit à petit, à la fin de chaque mission |
| button |  |  | 100 k $ | target=100000 | pressed=false | Simple + Expert | petit à petit, à la fin de chaque mission |
| button |  |  | 500 k $ | target=500000 | pressed=false | Simple + Expert | petit à petit, à la fin de chaque mission |
| button |  |  | 1 M $ | target=1000000 | pressed=true | Simple + Expert | petit à petit, à la fin de chaque mission |
| button |  |  | 5 M $ | target=5000000 | pressed=false | Simple + Expert | petit à petit, à la fin de chaque mission |
| button |  |  | 10 M $ | target=10000000 | pressed=false | Simple + Expert | petit à petit, à la fin de chaque mission |
| select | f-goal-meaning | goal.meaning | Mon objectif, c’est | field=goal.meaning |  | Simple + Expert | petit à petit, à la fin de chaque mission |
| range | lk-goal-range |  | Régler mon objectif avec la réglette |  |  | Simple + Expert | petit à petit, à la fin de chaque mission |
| select | f-model | model | Comment gagnes-tu ton argent ? | field=model |  | Simple + Expert | petit à petit, à la fin de chaque mission |
| text | f-goal-hourly | goal.hourly | Je gagne à peu près ($ par heure de jeu) | field=goal.hourly number min=0 max=1000000000000 |  | Simple + Expert | petit à petit, à la fin de chaque mission |
| text | lk-help-reward |  | Elle m’a rapporté ($) |  |  | Simple + Expert (opt) | petit à petit, à la fin de chaque mission |
| text | lk-help-minutes |  | Elle a duré (minutes) |  |  | Simple + Expert (opt) | petit à petit, à la fin de chaque mission |
| button | lk-help-apply |  | Utiliser ce chiffre |  |  | Simple + Expert (opt) | petit à petit, à la fin de chaque mission |
| select | f-goal-selected | goal.selected | Mon activité | field=goal.selected |  | Simple + Expert (masqué par un réglage) | petit à petit, à la fin de chaque mission |
| button |  |  | Changer les gains et les durées de mes activités ↗ | open=activities |  | Simple + Expert (masqué par un réglage) | petit à petit, à la fin de chaque mission |
| text | goal-activity-0-name | activities.0.name | Nom de mon activité | field=activities.0.name |  | Simple + Expert (opt) (masqué par un réglage) | petit à petit, à la fin de chaque mission |
| text | goal-activity-0-reward | activities.0.reward | Récompense ($) | field=activities.0.reward number min=0 max=1000000000000 |  | Simple + Expert (opt) (masqué par un réglage) | petit à petit, à la fin de chaque mission |
| text | goal-activity-0-duration | activities.0.duration | Durée (min) | field=activities.0.duration number min=0 max=1000000 |  | Simple + Expert (opt) (masqué par un réglage) | petit à petit, à la fin de chaque mission |
| text | goal-activity-0-cost | activities.0.cost | Frais par mission ($) | field=activities.0.cost number min=0 max=1000000000000 |  | Simple + Expert (opt) (masqué par un réglage) | petit à petit, à la fin de chaque mission |
| text | goal-activity-0-prep | activities.0.prep | Préparation (min) | field=activities.0.prep number min=0 max=1000000 |  | Simple + Expert (opt) (masqué par un réglage) | petit à petit, à la fin de chaque mission |
| text | goal-activity-0-cooldown | activities.0.cooldown | Attente avant de recommencer (min) | field=activities.0.cooldown number min=0 max=1000000 |  | Simple + Expert (opt) (masqué par un réglage) | petit à petit, à la fin de chaque mission |
| text | goal-activity-0-share | activities.0.share | Ma part (%) | field=activities.0.share number min=0 max=100 |  | Simple + Expert (opt) (masqué par un réglage) | petit à petit, à la fin de chaque mission |
| text | goal-activity-0-investment | activities.0.investment | À acheter une seule fois avant de commencer ($) | field=activities.0.investment number min=0 max=1000000000000 |  | Simple + Expert (opt) (masqué par un réglage) | petit à petit, à la fin de chaque mission |
| text | goal-activity-0-players | activities.0.players | Joueurs nécessaires | field=activities.0.players number integer min max=100 |  | Simple + Expert (opt) (masqué par un réglage) | petit à petit, à la fin de chaque mission |
| checkbox |  |  | Je l’ai déjà acheté | owned=0 |  | Simple + Expert (opt) (masqué par un réglage) | petit à petit, à la fin de chaque mission |
| checkbox |  |  | Je prépare une seule fois par partie | bPrepOnce=0 |  | Simple + Expert (opt) (masqué par un réglage) | petit à petit, à la fin de chaque mission |
| text | goal-activity-1-name | activities.1.name | Nom de mon activité | field=activities.1.name |  | Simple + Expert (opt) (masqué par un réglage) | petit à petit, à la fin de chaque mission |
| text | goal-activity-1-reward | activities.1.reward | Récompense ($) | field=activities.1.reward number min=0 max=1000000000000 |  | Simple + Expert (opt) (masqué par un réglage) | petit à petit, à la fin de chaque mission |
| text | goal-activity-1-duration | activities.1.duration | Durée (min) | field=activities.1.duration number min=0 max=1000000 |  | Simple + Expert (opt) (masqué par un réglage) | petit à petit, à la fin de chaque mission |
| text | goal-activity-1-cost | activities.1.cost | Frais par mission ($) | field=activities.1.cost number min=0 max=1000000000000 |  | Simple + Expert (opt) (masqué par un réglage) | petit à petit, à la fin de chaque mission |
| text | goal-activity-1-prep | activities.1.prep | Préparation (min) | field=activities.1.prep number min=0 max=1000000 |  | Simple + Expert (opt) (masqué par un réglage) | petit à petit, à la fin de chaque mission |
| text | goal-activity-1-cooldown | activities.1.cooldown | Attente avant de recommencer (min) | field=activities.1.cooldown number min=0 max=1000000 |  | Simple + Expert (opt) (masqué par un réglage) | petit à petit, à la fin de chaque mission |
| text | goal-activity-1-share | activities.1.share | Ma part (%) | field=activities.1.share number min=0 max=100 |  | Simple + Expert (opt) (masqué par un réglage) | petit à petit, à la fin de chaque mission |
| text | goal-activity-1-investment | activities.1.investment | À acheter une seule fois avant de commencer ($) | field=activities.1.investment number min=0 max=1000000000000 |  | Simple + Expert (opt) (masqué par un réglage) | petit à petit, à la fin de chaque mission |
| text | goal-activity-1-players | activities.1.players | Joueurs nécessaires | field=activities.1.players number integer min max=100 |  | Simple + Expert (opt) (masqué par un réglage) | petit à petit, à la fin de chaque mission |
| checkbox |  |  | Je l’ai déjà acheté | owned |  | Simple + Expert (opt) (masqué par un réglage) | petit à petit, à la fin de chaque mission |
| checkbox |  |  | Je prépare une seule fois par partie | bPrepOnce |  | Simple + Expert (opt) (masqué par un réglage) | petit à petit, à la fin de chaque mission |
| text | goal-activity-2-name | activities.2.name | Nom de mon activité | field=activities.2.name |  | Simple + Expert (opt) (masqué par un réglage) | petit à petit, à la fin de chaque mission |
| text | goal-activity-2-reward | activities.2.reward | Récompense ($) | field=activities.2.reward number min=0 max=1000000000000 |  | Simple + Expert (opt) (masqué par un réglage) | petit à petit, à la fin de chaque mission |
| text | goal-activity-2-duration | activities.2.duration | Durée (min) | field=activities.2.duration number min=0 max=1000000 |  | Simple + Expert (opt) (masqué par un réglage) | petit à petit, à la fin de chaque mission |
| text | goal-activity-2-cost | activities.2.cost | Frais par mission ($) | field=activities.2.cost number min=0 max=1000000000000 |  | Simple + Expert (opt) (masqué par un réglage) | petit à petit, à la fin de chaque mission |
| text | goal-activity-2-prep | activities.2.prep | Préparation (min) | field=activities.2.prep number min=0 max=1000000 |  | Simple + Expert (opt) (masqué par un réglage) | petit à petit, à la fin de chaque mission |
| text | goal-activity-2-cooldown | activities.2.cooldown | Attente avant de recommencer (min) | field=activities.2.cooldown number min=0 max=1000000 |  | Simple + Expert (opt) (masqué par un réglage) | petit à petit, à la fin de chaque mission |
| text | goal-activity-2-share | activities.2.share | Ma part (%) | field=activities.2.share number min=0 max=100 |  | Simple + Expert (opt) (masqué par un réglage) | petit à petit, à la fin de chaque mission |
| text | goal-activity-2-investment | activities.2.investment | À acheter une seule fois avant de commencer ($) | field=activities.2.investment number min=0 max=1000000000000 |  | Simple + Expert (opt) (masqué par un réglage) | petit à petit, à la fin de chaque mission |
| text | goal-activity-2-players | activities.2.players | Joueurs nécessaires | field=activities.2.players number integer min max=100 |  | Simple + Expert (opt) (masqué par un réglage) | petit à petit, à la fin de chaque mission |
| checkbox |  |  | Je l’ai déjà acheté | owned=2 |  | Simple + Expert (opt) (masqué par un réglage) | petit à petit, à la fin de chaque mission |
| checkbox |  |  | Je prépare une seule fois par partie | bPrepOnce=2 |  | Simple + Expert (opt) (masqué par un réglage) | petit à petit, à la fin de chaque mission |
| text | f-goal-dailyMinutes | goal.dailyMinutes | Je joue chaque jour (minutes) | field=goal.dailyMinutes number min max=1440 |  | Simple + Expert | petit à petit, à la fin de chaque mission |
| button |  |  | 30 min | daily=30 | pressed=false | Simple + Expert | petit à petit, à la fin de chaque mission |
| button |  |  | 1 h | daily=60 | pressed=true | Simple + Expert | petit à petit, à la fin de chaque mission |
| button |  |  | 2 h | daily=120 | pressed=false | Simple + Expert | petit à petit, à la fin de chaque mission |
| button |  |  | 3 h | daily=180 | pressed=false | Simple + Expert | petit à petit, à la fin de chaque mission |
| button |  |  | Voir ma réponse ↓ | showAnswer |  | Simple + Expert | petit à petit, à la fin de chaque mission |
| text | f-goal-reserve | goal.reserve | Argent que je garde de côté ($) | field=goal.reserve number min=0 max=1000000000000 | invalid=false | Simple + Expert (E) | petit à petit, à la fin de chaque mission |
| button |  |  | Rétablir cette valeur | bDefault=goal.reserve bDefaultValue=0 |  | Simple + Expert (E) | petit à petit, à la fin de chaque mission |
| text | f-goal-plannedSpend | goal.plannedSpend | Achats à payer avant mon objectif ($) | field=goal.plannedSpend number min=0 max=1000000000000 |  | Simple + Expert (E) | petit à petit, à la fin de chaque mission |
| button |  |  | Rétablir cette valeur | bDefault=goal.plannedSpend bDefaultValue=null |  | Simple + Expert (E) | petit à petit, à la fin de chaque mission |
| text | f-goal-upkeepPerSession | goal.upkeepPerSession | Je dépense à chaque partie ($) : consommables, munitions… | field=goal.upkeepPerSession number min=0 max=1000000000000 |  | Simple + Expert (E) | petit à petit, à la fin de chaque mission |
| button |  |  | Rétablir cette valeur | bDefault=goal.upkeepPerSession bDefaultValue=null |  | Simple + Expert (E) | petit à petit, à la fin de chaque mission |
| text | f-goal-deadlineDays | goal.deadlineDays | Je veux y arriver en (jours, si tu veux) | field=goal.deadlineDays number integer min max=36500 |  | Simple + Expert (E) | petit à petit, à la fin de chaque mission |
| button |  |  | Rétablir cette valeur | bDefault=goal.deadlineDays bDefaultValue=null |  | Simple + Expert (E) | petit à petit, à la fin de chaque mission |
| text | f-goal-players | goal.players | Nombre de joueurs dans mon équipe | field=goal.players number min max=100 | invalid=false | Simple + Expert (E) (masqué par un réglage) | petit à petit, à la fin de chaque mission |
| button |  |  | Rétablir cette valeur | bDefault=goal.players bDefaultValue |  | Simple + Expert (E) (masqué par un réglage) | petit à petit, à la fin de chaque mission |
| button |  |  | Ce qui compte dans ce calcul | foldHead=goal-assumptions | expanded=false controls=fold-goal-assumptions | Simple + Expert | petit à petit, à la fin de chaque mission |
| button |  |  | Modifier | bFocus=f-goal-capital |  | Simple + Expert | petit à petit, à la fin de chaque mission |
| button |  |  | Modifier | bFocus=f-goal-target |  | Simple + Expert | petit à petit, à la fin de chaque mission |
| button |  |  | Modifier | bFocus=f-goal-reserve |  | Simple + Expert | petit à petit, à la fin de chaque mission |
| button |  |  | Modifier | bFocus=f-goal-hourly |  | Simple + Expert | petit à petit |
| button |  |  | Modifier | bFocus=f-goal-dailyMinutes |  | Simple + Expert | petit à petit, à la fin de chaque mission |
| button |  |  | Comment est-ce calculé ? | foldHead=goal-d0 | expanded=false controls=fold-goal-d0 | Simple + Expert | petit à petit, à la fin de chaque mission |
| button |  |  | Choisir cette activité ↗ | scenario=scenario-a |  | Simple + Expert (E) | petit à petit, à la fin de chaque mission |
| button |  |  | Choisir cette activité ↗ | scenario=scenario-b |  | Simple + Expert (E) | petit à petit, à la fin de chaque mission |
| button |  |  | Choisir cette activité ↗ | scenario=scenario-c |  | Simple + Expert (E) | petit à petit, à la fin de chaque mission |
| button |  |  | Et si le chiffre bouge de 20 % ? | foldHead=goal-sensitivity | expanded=false controls=fold-goal-sensitivity | Expert (E) | petit à petit, à la fin de chaque mission |
| button |  |  | Et si je gagne plus, ou moins ? | foldHead=goal-earn | expanded=false controls=fold-goal-earn | Expert (E) | petit à petit, à la fin de chaque mission |
| button |  |  | Comparer avec un calcul gardé | foldHead=goal-reference | expanded=false controls=fold-goal-reference | Expert (E) | petit à petit, à la fin de chaque mission |
| button |  |  | Comment est-ce calculé ? | foldHead=goal-formula | expanded=false controls=fold-goal-formula | Expert (E) | petit à petit, à la fin de chaque mission |
| button |  |  | Tous les chiffres du calcul | foldHead=goal-raw | expanded=false controls=fold-goal-raw | Expert (E) | petit à petit, à la fin de chaque mission |
| button |  |  | Voir les réglages avancés (mode Expert) | bMode=advanced bAdvanced=goal |  | Simple + Expert | petit à petit, à la fin de chaque mission |
| button |  |  | C’est bon pour cette étape ✓ | bComplete=goal |  | Simple + Expert | petit à petit, à la fin de chaque mission |
| button |  |  | Aller à mon business plan | open=plan |  | Simple + Expert | petit à petit, à la fin de chaque mission |

## Mes achats (`purchase`)

**Étapes du pas à pas** : 1. Quel est ton achat ? · 2. Combien as-tu ?  
**Pas à pas** : Question 1 sur 2 : Quel est ton achat ?

**Sorties** : purchase-selection (fiche, prix de référence, statut, source) ; purchase-results ; catalogue-count, catalogue-filter-chips, catalogue-results, catalogue-more, vehicle-comparison (3 fiches) ; expert-purchase ; mode-summary-purchase ; calc-live

**Zones repérées dans le panneau** : mode-summary-purchase, purchase-results, catalogue-results, vehicle-comparison, expert-purchase ; annonces : catalogue-count

**Liens sortants (Expert)** : `/lieux/ambrosia.html`, `/armes/batte.html`, `/armes/carabine.html`, `/demeures/brian-keys.html`, `/demeures/cal-keys.html`, `/armes/club-golf.html`

| kind | id | field | label | data | aria | mode | réglage |
|---|---|---|---|---|---|---|---|
| button |  |  | Voir en mode Expert | bMode=advanced |  | Simple + Expert | achat libre, fiche du catalogue, revenu écrit |
| text | purchase-name | assets.0.name | Nom de mon achat | field=assets.0.name |  | Simple + Expert | achat libre |
| text | f-purchase-price | assets.0.price | Ça coûte, d’après ce que tu imagines ($) | field=assets.0.price number min=0 max=1000000000000 |  | Simple + Expert | achat libre |
| select | f-assets-0-role | assets.0.role | À quoi il te sert ? | field=assets.0.role |  | Simple + Expert | achat libre |
| text | f-purchase-capital | goal.capital | J’ai déjà ($) | field=goal.capital number min=0 max=1000000000000 | invalid=false | Simple + Expert | achat libre, fiche du catalogue, revenu écrit |
| text | f-purchase-reserve | goal.reserve | Argent que je garde de côté ($) | field=goal.reserve number min=0 max=1000000000000 | invalid=false | Simple + Expert | achat libre, fiche du catalogue, revenu écrit |
| text | f-purchase-usage | assets.0.usage.perSession | Il me coûte à chaque partie ($) | field=assets.0.usage.perSession number min=0 max=1000000000000 |  | Simple + Expert (opt) | achat libre |
| text | f-analysis-horizon | analysis.horizon.sessions | Je m’en sers pendant (parties) | field=analysis.horizon.sessions number integer min=0 max=10000 |  | Simple + Expert (opt) | achat libre, fiche du catalogue, revenu écrit |
| text | f-purchase-hourly | goal.hourly | Je gagne à peu près ($ par heure de jeu) | field=goal.hourly number min=0 max=1000000000000 |  | Simple + Expert (opt) | achat libre, fiche du catalogue, revenu écrit |
| text | f-purchase-target | goal.target | Après cet achat, je veux avoir ($) | field=goal.target number min=0 max=1000000000000 |  | Simple + Expert (opt) | achat libre, fiche du catalogue, revenu écrit |
| text | f-purchase-extras | assets.0.extras | Options que je prends ($) | field=assets.0.extras number min=0 max=1000000000000 |  | Simple + Expert (E) | achat libre |
| button |  |  | Rétablir cette valeur | bDefault=assets.0.extras bDefaultValue=0 |  | Simple + Expert (E) | achat libre |
| text | f-purchase-fees | assets.0.fees | Frais obligatoires au départ ($) | field=assets.0.fees number min=0 max=1000000000000 |  | Simple + Expert (E) | achat libre |
| button |  |  | Rétablir cette valeur | bDefault=assets.0.fees bDefaultValue=0 |  | Simple + Expert (E) | achat libre |
| text | f-purchase-resale | assets.0.resale | Je pourrais le revendre ($, mon hypothèse) | field=assets.0.resale number min=0 max=1000000000000 |  | Simple + Expert (E) | achat libre |
| button |  |  | Rétablir cette valeur | bDefault=assets.0.resale bDefaultValue=null |  | Simple + Expert (E) | achat libre |
| select | f-assets-0-incomeMode | assets.0.incomeMode | Est-ce que cet achat me fait gagner de l’argent ? | field=assets.0.incomeMode |  | Simple + Expert (E) | achat libre |
| text | f-purchase-boostHourly | assets.0.boostHourly | Il me fait gagner en plus ($ par heure) | field=assets.0.boostHourly number min=0 max=1000000000000 |  | Simple + Expert (E) (masqué par un réglage) | achat libre |
| button |  |  | Rétablir cette valeur | bDefault=assets.0.boostHourly bDefaultValue=0 |  | Simple + Expert (E) (masqué par un réglage) | achat libre |
| select | f-assets-0-capabilities-terrain | assets.0.capabilities.terrain | Il va (si tu le sais) | field=assets.0.capabilities.terrain |  | Simple + Expert (E) | achat libre |
| text | purchase-cap-seats | assets.0.capabilities.seats | Places, toi compris (si tu le sais) | field=assets.0.capabilities.seats number integer min=0 max=100 |  | Simple + Expert (E) | achat libre |
| button |  |  | Rétablir cette valeur | bDefault=assets.0.capabilities.seats bDefaultValue=null |  | Simple + Expert (E) | achat libre |
| button |  |  | Voir ma réponse ↓ | showAnswer |  | Simple + Expert | achat libre, fiche du catalogue, revenu écrit |
| button |  |  | Est-ce que ça vaut le coup ? | bRoiCurrent |  | Simple + Expert | achat libre, fiche du catalogue, revenu écrit |
| button |  |  | Ajouter à « Quoi acheter d’abord ? » | bOrderCurrent |  | Simple + Expert | achat libre, fiche du catalogue, revenu écrit |
| button |  |  | Comment est-ce calculé ? | foldHead=purchase-d0 | expanded=false controls=fold-purchase-d0 | Simple + Expert | achat libre |
| button |  |  | Ce qui compte dans ce calcul | foldHead=purchase-assumptions | expanded=false controls=fold-purchase-assumptions | Simple + Expert | achat libre, fiche du catalogue, revenu écrit |
| button |  |  | Modifier | bFocus=f-purchase-price |  | Simple + Expert | achat libre, fiche du catalogue, revenu écrit |
| button |  |  | Modifier | bFocus=f-purchase-extras |  | Simple + Expert | achat libre, fiche du catalogue, revenu écrit |
| button |  |  | Modifier | bFocus=f-purchase-fees |  | Simple + Expert | achat libre, fiche du catalogue, revenu écrit |
| button |  |  | Modifier | bFocus=f-purchase-capital |  | Simple + Expert | achat libre, fiche du catalogue, revenu écrit |
| button |  |  | Modifier | bFocus=f-purchase-reserve |  | Simple + Expert | achat libre, fiche du catalogue, revenu écrit |
| button |  |  | Modifier | bFocus=f-purchase-usage |  | Simple + Expert | achat libre, fiche du catalogue, revenu écrit |
| button |  |  | Modifier | bFocus=f-analysis-horizon |  | Simple + Expert | achat libre, fiche du catalogue, revenu écrit |
| search | catalogue-search |  | Rechercher un nom, une marque ou une catégorie |  |  | Simple + Expert | achat libre, fiche du catalogue, revenu écrit |
| select | catalogue-type |  | Catégorie |  |  | Simple + Expert | achat libre, fiche du catalogue, revenu écrit |
| select | catalogue-status |  | Prix connu ou pas |  |  | Simple + Expert | achat libre, fiche du catalogue, revenu écrit |
| text | catalogue-budget |  | Prix maximum connu ($) |  |  | Simple + Expert | achat libre, fiche du catalogue, revenu écrit |
| select | catalogue-sort |  | Trier |  |  | Simple + Expert | achat libre, fiche du catalogue, revenu écrit |
| checkbox | catalogue-favorites |  | Mes fiches favorites |  |  | Simple + Expert | achat libre, fiche du catalogue, revenu écrit |
| button |  |  | ☆ Mettre en favori | favorite=ambrosia | pressed=false | Simple + Expert | achat libre, fiche du catalogue, revenu écrit |
| checkbox |  |  | Comparer | compare=ambrosia |  | Simple + Expert | achat libre, fiche du catalogue, revenu écrit |
| button |  |  | Je veux celui-là | item=batte |  | Simple + Expert | achat libre, fiche du catalogue, revenu écrit |
| button |  |  | Ça vaut le coup ? | bRoi=batte |  | Simple + Expert | achat libre, fiche du catalogue, revenu écrit |
| button |  |  | ☆ Mettre en favori | favorite=batte | pressed=false | Simple + Expert | achat libre, fiche du catalogue, revenu écrit |
| checkbox |  |  | Comparer | compare=batte |  | Simple + Expert | achat libre, fiche du catalogue, revenu écrit |
| button |  |  | Je veux celui-là | item=carabine |  | Simple + Expert | achat libre, fiche du catalogue, revenu écrit |
| button |  |  | Ça vaut le coup ? | bRoi=carabine |  | Simple + Expert | achat libre, fiche du catalogue, revenu écrit |
| button |  |  | ☆ Mettre en favori | favorite=carabine | pressed=false | Simple + Expert | achat libre, fiche du catalogue, revenu écrit |
| checkbox |  |  | Comparer | compare=carabine |  | Simple + Expert | achat libre, fiche du catalogue, revenu écrit |
| button |  |  | Je veux celui-là | item=brian-keys |  | Simple + Expert | achat libre, fiche du catalogue, revenu écrit |
| button |  |  | Ça vaut le coup ? | bRoi=brian-keys |  | Simple + Expert | achat libre, fiche du catalogue, revenu écrit |
| button |  |  | ☆ Mettre en favori | favorite=brian-keys | pressed=false | Simple + Expert | achat libre, fiche du catalogue, revenu écrit |
| checkbox |  |  | Comparer | compare=brian-keys |  | Simple + Expert | achat libre, fiche du catalogue, revenu écrit |
| button |  |  | Je veux celui-là | item=cal-keys |  | Simple + Expert | achat libre, fiche du catalogue, revenu écrit |
| button |  |  | Ça vaut le coup ? | bRoi=cal-keys |  | Simple + Expert | achat libre, fiche du catalogue, revenu écrit |
| button |  |  | ☆ Mettre en favori | favorite=cal-keys | pressed=false | Simple + Expert | achat libre, fiche du catalogue, revenu écrit |
| checkbox |  |  | Comparer | compare=cal-keys |  | Simple + Expert | achat libre, fiche du catalogue, revenu écrit |
| button |  |  | Je veux celui-là | item=club-golf |  | Simple + Expert | achat libre, fiche du catalogue, revenu écrit |
| button |  |  | Ça vaut le coup ? | bRoi=club-golf |  | Simple + Expert | achat libre, fiche du catalogue, revenu écrit |
| button |  |  | ☆ Mettre en favori | favorite=club-golf | pressed=false | Simple + Expert | achat libre, fiche du catalogue, revenu écrit |
| checkbox |  |  | Comparer | compare=club-golf |  | Simple + Expert | achat libre, fiche du catalogue, revenu écrit |
| button | catalogue-more |  | Afficher plus |  |  | Simple + Expert | achat libre, fiche du catalogue, revenu écrit |
| button |  |  | Et si le chiffre bouge de 20 % ? | foldHead=purchase-sensitivity | expanded=false controls=fold-purchase-sensitivity | Expert (E) | achat libre, fiche du catalogue, revenu écrit |
| button |  |  | Comparer avec un calcul gardé | foldHead=purchase-reference | expanded=false controls=fold-purchase-reference | Expert (E) | achat libre, fiche du catalogue, revenu écrit |
| button |  |  | Comment est-ce calculé ? | foldHead=purchase-formula | expanded=false controls=fold-purchase-formula | Expert (E) | achat libre, fiche du catalogue, revenu écrit |
| button |  |  | Tous les chiffres du calcul | foldHead=purchase-raw | expanded=false controls=fold-purchase-raw | Expert (E) | achat libre, fiche du catalogue, revenu écrit |
| button |  |  | Voir les réglages avancés (mode Expert) | bMode=advanced bAdvanced=purchase |  | Simple + Expert | achat libre, fiche du catalogue, revenu écrit |
| button |  |  | C’est bon pour cette étape ✓ | bComplete=purchase |  | Simple + Expert | achat libre, fiche du catalogue, revenu écrit |
| button |  |  | Aller à mon business plan | open=plan |  | Simple + Expert | achat libre, fiche du catalogue, revenu écrit |
| button | purchase-manual |  | Achat libre |  |  | Simple + Expert | fiche du catalogue, revenu écrit |
| text | f-purchase-price | assets.1.price | Ça coûte, d’après ce que tu imagines ($) | field=assets.1.price number min=0 max=1000000000000 |  | Simple + Expert | fiche du catalogue, revenu écrit |
| select | f-assets-1-role | assets.1.role | À quoi il te sert ? | field=assets.1.role |  | Simple + Expert | fiche du catalogue, revenu écrit |
| text | f-purchase-usage | assets.1.usage.perSession | Il me coûte à chaque partie ($) | field=assets.1.usage.perSession number min=0 max=1000000000000 |  | Simple + Expert (opt) | fiche du catalogue, revenu écrit |
| text | f-purchase-extras | assets.1.extras | Options que je prends ($) | field=assets.1.extras number min=0 max=1000000000000 |  | Simple + Expert (E) | fiche du catalogue, revenu écrit |
| button |  |  | Rétablir cette valeur | bDefault=assets.1.extras bDefaultValue=0 |  | Simple + Expert (E) | fiche du catalogue, revenu écrit |
| text | f-purchase-fees | assets.1.fees | Frais obligatoires au départ ($) | field=assets.1.fees number min=0 max=1000000000000 |  | Simple + Expert (E) | fiche du catalogue, revenu écrit |
| button |  |  | Rétablir cette valeur | bDefault=assets.1.fees bDefaultValue=0 |  | Simple + Expert (E) | fiche du catalogue, revenu écrit |
| text | f-purchase-resale | assets.1.resale | Je pourrais le revendre ($, mon hypothèse) | field=assets.1.resale number min=0 max=1000000000000 |  | Simple + Expert (E) | fiche du catalogue, revenu écrit |
| button |  |  | Rétablir cette valeur | bDefault=assets.1.resale bDefaultValue=null |  | Simple + Expert (E) | fiche du catalogue, revenu écrit |
| select | f-assets-1-incomeMode | assets.1.incomeMode | Est-ce que cet achat me fait gagner de l’argent ? | field=assets.1.incomeMode |  | Simple + Expert (E) | fiche du catalogue, revenu écrit |
| text | f-purchase-boostHourly | assets.1.boostHourly | Il me fait gagner en plus ($ par heure) | field=assets.1.boostHourly number min=0 max=1000000000000 |  | Simple + Expert (E) | fiche du catalogue, revenu écrit |
| button |  |  | Rétablir cette valeur | bDefault=assets.1.boostHourly bDefaultValue=0 |  | Simple + Expert (E) | fiche du catalogue, revenu écrit |
| button |  |  | Aller à la case à corriger | bFocus=f-purchase-price |  | Simple + Expert | fiche du catalogue, revenu écrit |
| button |  |  | Écrire | bFocus=f-purchase-usage |  | Simple + Expert | fiche du catalogue, revenu écrit |
| button |  |  | Écrire | bFocus=f-purchase-price |  | Simple + Expert | fiche du catalogue, revenu écrit |

## Mon temps de jeu (`session`)

**Étapes du pas à pas** : 1. Combien de temps as-tu ? · 2. Quelles activités veux-tu bien faire ?  
**Pas à pas** : Question 1 sur 2 : Combien de temps as-tu ?

**Sorties** : session-capital-summary ; session-results (réponse, chiffres, avancement, jauge, autres programmes) ; session-timeline (programme dans l’ordre) ; expert-session ; mode-summary-session ; calc-live

**Zones repérées dans le panneau** : mode-summary-session, session-results, session-timeline, fold-session-timeline, expert-session

**Liens sortants (Expert)** : aucun

| kind | id | field | label | data | aria | mode | réglage |
|---|---|---|---|---|---|---|---|
| button |  |  | Voir en mode Expert | bMode=advanced |  | Simple + Expert |  |
| text | f-session-minutes | session.minutes | J’ai combien de temps ? (minutes) | field=session.minutes number min=0 max=1440 |  | Simple + Expert |  |
| button |  |  | 15 min | sessionMinutes=15 | pressed=false | Simple + Expert |  |
| button |  |  | 30 min | sessionMinutes=30 | pressed=false | Simple + Expert |  |
| button |  |  | 45 min | sessionMinutes=45 | pressed=false | Simple + Expert |  |
| button |  |  | 60 min | sessionMinutes=60 | pressed=true | Simple + Expert |  |
| button |  |  | 90 min | sessionMinutes=90 | pressed=false | Simple + Expert |  |
| radio |  |  | Seul |  |  | Simple + Expert |  |
| radio |  |  | À plusieurs |  |  | Simple + Expert |  |
| text | session-players | goal.players | Nous sommes (moi compris) | field=goal.players number integer min max=100 | invalid=false | Simple + Expert (masqué par un réglage) |  |
| checkbox |  |  | Exemple A : missions courtes | sessionActivity=scenario-a |  | Simple + Expert |  |
| checkbox |  |  | Exemple B : missions longues | sessionActivity=scenario-b |  | Simple + Expert |  |
| checkbox |  |  | Exemple C : avec un achat de départ | sessionActivity=scenario-c |  | Simple + Expert |  |
| button |  |  | Écrire ou changer mes activités ↗ | open=activities |  | Simple + Expert |  |
| text | f-session-maxRepeat | session.maxRepeat | Même activité à la suite, au maximum | field=session.maxRepeat number min max=256 integer |  | Simple + Expert (E) |  |
| button |  |  | Rétablir cette valeur | bDefault=session.maxRepeat bDefaultValue=100 |  | Simple + Expert (E) |  |
| text | f-session-daysPerWeek | session.daysPerWeek | Je joue combien de jours par semaine ? | field=session.daysPerWeek number integer min max=7 |  | Simple + Expert (E) |  |
| button |  |  | Rétablir cette valeur | bDefault=session.daysPerWeek bDefaultValue=7 |  | Simple + Expert (E) |  |
| text | f-session-usualMinutes | session.usualMinutes | Une partie dure d’habitude (minutes) | field=session.usualMinutes number min max=1440 |  | Simple + Expert (E) |  |
| button |  |  | Rétablir cette valeur | bDefault=session.usualMinutes bDefaultValue=60 |  | Simple + Expert (E) |  |
| text | session-capital | goal.capital | J’ai déjà ($) | field=goal.capital number min=0 max=1000000000000 | invalid=false | Simple + Expert |  |
| text | session-reserve | goal.reserve | Argent que je garde de côté ($) | field=goal.reserve number min=0 max=1000000000000 | invalid=false | Simple + Expert |  |
| text | session-activity-0-name | activities.0.name | Nom de mon activité | field=activities.0.name |  | Simple + Expert (opt) |  |
| text | session-activity-0-reward | activities.0.reward | Récompense ($) | field=activities.0.reward number min=0 max=1000000000000 |  | Simple + Expert (opt) |  |
| text | session-activity-0-duration | activities.0.duration | Durée (min) | field=activities.0.duration number min=0 max=1000000 |  | Simple + Expert (opt) |  |
| text | session-activity-0-cost | activities.0.cost | Frais par mission ($) | field=activities.0.cost number min=0 max=1000000000000 |  | Simple + Expert (opt) |  |
| text | session-activity-0-prep | activities.0.prep | Préparation (min) | field=activities.0.prep number min=0 max=1000000 |  | Simple + Expert (opt) |  |
| text | session-activity-0-cooldown | activities.0.cooldown | Attente avant de recommencer (min) | field=activities.0.cooldown number min=0 max=1000000 |  | Simple + Expert (opt) |  |
| text | session-activity-0-share | activities.0.share | Ma part (%) | field=activities.0.share number min=0 max=100 |  | Simple + Expert (opt) |  |
| text | session-activity-0-investment | activities.0.investment | À acheter une seule fois avant de commencer ($) | field=activities.0.investment number min=0 max=1000000000000 |  | Simple + Expert (opt) |  |
| text | session-activity-0-players | activities.0.players | Joueurs nécessaires | field=activities.0.players number integer min max=100 |  | Simple + Expert (opt) |  |
| checkbox |  |  | Je l’ai déjà acheté | owned=0 |  | Simple + Expert (opt) |  |
| checkbox |  |  | Je prépare une seule fois par partie | bPrepOnce=0 |  | Simple + Expert (opt) |  |
| text | session-activity-1-name | activities.1.name | Nom de mon activité | field=activities.1.name |  | Simple + Expert (opt) |  |
| text | session-activity-1-reward | activities.1.reward | Récompense ($) | field=activities.1.reward number min=0 max=1000000000000 |  | Simple + Expert (opt) |  |
| text | session-activity-1-duration | activities.1.duration | Durée (min) | field=activities.1.duration number min=0 max=1000000 |  | Simple + Expert (opt) |  |
| text | session-activity-1-cost | activities.1.cost | Frais par mission ($) | field=activities.1.cost number min=0 max=1000000000000 |  | Simple + Expert (opt) |  |
| text | session-activity-1-prep | activities.1.prep | Préparation (min) | field=activities.1.prep number min=0 max=1000000 |  | Simple + Expert (opt) |  |
| text | session-activity-1-cooldown | activities.1.cooldown | Attente avant de recommencer (min) | field=activities.1.cooldown number min=0 max=1000000 |  | Simple + Expert (opt) |  |
| text | session-activity-1-share | activities.1.share | Ma part (%) | field=activities.1.share number min=0 max=100 |  | Simple + Expert (opt) |  |
| text | session-activity-1-investment | activities.1.investment | À acheter une seule fois avant de commencer ($) | field=activities.1.investment number min=0 max=1000000000000 |  | Simple + Expert (opt) |  |
| text | session-activity-1-players | activities.1.players | Joueurs nécessaires | field=activities.1.players number integer min max=100 |  | Simple + Expert (opt) |  |
| checkbox |  |  | Je l’ai déjà acheté | owned |  | Simple + Expert (opt) |  |
| checkbox |  |  | Je prépare une seule fois par partie | bPrepOnce |  | Simple + Expert (opt) |  |
| text | session-activity-2-name | activities.2.name | Nom de mon activité | field=activities.2.name |  | Simple + Expert (opt) |  |
| text | session-activity-2-reward | activities.2.reward | Récompense ($) | field=activities.2.reward number min=0 max=1000000000000 |  | Simple + Expert (opt) |  |
| text | session-activity-2-duration | activities.2.duration | Durée (min) | field=activities.2.duration number min=0 max=1000000 |  | Simple + Expert (opt) |  |
| text | session-activity-2-cost | activities.2.cost | Frais par mission ($) | field=activities.2.cost number min=0 max=1000000000000 |  | Simple + Expert (opt) |  |
| text | session-activity-2-prep | activities.2.prep | Préparation (min) | field=activities.2.prep number min=0 max=1000000 |  | Simple + Expert (opt) |  |
| text | session-activity-2-cooldown | activities.2.cooldown | Attente avant de recommencer (min) | field=activities.2.cooldown number min=0 max=1000000 |  | Simple + Expert (opt) |  |
| text | session-activity-2-share | activities.2.share | Ma part (%) | field=activities.2.share number min=0 max=100 |  | Simple + Expert (opt) |  |
| text | session-activity-2-investment | activities.2.investment | À acheter une seule fois avant de commencer ($) | field=activities.2.investment number min=0 max=1000000000000 |  | Simple + Expert (opt) |  |
| text | session-activity-2-players | activities.2.players | Joueurs nécessaires | field=activities.2.players number integer min max=100 |  | Simple + Expert (opt) |  |
| checkbox |  |  | Je l’ai déjà acheté | owned=2 |  | Simple + Expert (opt) |  |
| checkbox |  |  | Je prépare une seule fois par partie | bPrepOnce=2 |  | Simple + Expert (opt) |  |
| button |  |  | Voir ma réponse ↓ | showAnswer |  | Simple + Expert |  |
| button |  |  | Changer mon argent et ce que je garde de côté ↗ | open=goal |  | Simple + Expert |  |
| button |  |  | Autres programmes réalisables | foldHead=session-d0 | expanded=false controls=fold-session-d0 | Simple + Expert |  |
| button |  |  | Noter mon résultat dans le business plan | open=plan |  | Simple + Expert |  |
| button |  |  | Ce qui compte dans ce calcul | foldHead=session-assumptions | expanded=false controls=fold-session-assumptions | Simple + Expert |  |
| button |  |  | Modifier | bFocus=f-session-minutes |  | Simple + Expert |  |
| button |  |  | Modifier | bFocus=session-players |  | Simple + Expert |  |
| button |  |  | Modifier | bFocus=session-capital |  | Simple + Expert |  |
| button |  |  | Modifier | bFocus=session-reserve |  | Simple + Expert |  |
| button |  |  | Ton programme, dans l’ordre | foldHead=session-timeline | expanded=false controls=fold-session-timeline | Simple + Expert |  |
| button |  |  | Et si le chiffre bouge de 20 % ? | foldHead=session-sensitivity | expanded=false controls=fold-session-sensitivity | Expert (E) |  |
| button |  |  | Comparer avec un calcul gardé | foldHead=session-reference | expanded=false controls=fold-session-reference | Expert (E) |  |
| button |  |  | Comment est-ce calculé ? | foldHead=session-formula | expanded=false controls=fold-session-formula | Expert (E) |  |
| button |  |  | Tous les chiffres du calcul | foldHead=session-raw | expanded=false controls=fold-session-raw | Expert (E) |  |
| button |  |  | Voir les réglages avancés (mode Expert) | bMode=advanced bAdvanced=session |  | Simple + Expert |  |
| button |  |  | C’est bon pour cette étape ✓ | bComplete=session |  | Simple + Expert |  |
| button |  |  | Aller à mon business plan | open=plan |  | Simple + Expert |  |

## Mon budget (`budget`)

**Étapes du pas à pas** : 1. Combien as-tu ? · 2. Quels achats compter ? · 3. D’autres dépenses ?  
**Pas à pas** : Question 1 sur 3 : Combien as-tu ?

**Sorties** : budget-results (réponse, chiffres, dans la durée, courbe, jauge, dépenses comptées) ; expert-budget ; mode-summary-budget ; calc-live

**Zones repérées dans le panneau** : mode-summary-budget, budget-results, expert-budget

**Liens sortants (Expert)** : aucun

| kind | id | field | label | data | aria | mode | réglage |
|---|---|---|---|---|---|---|---|
| button |  |  | Voir en mode Expert | bMode=advanced |  | Simple + Expert | je répartis moi-même, panier de Quoi acheter d’abord ? |
| text | budget-capital | goal.capital | J’ai déjà ($) | field=goal.capital number min=0 max=1000000000000 | invalid=false | Simple + Expert | je répartis moi-même, panier de Quoi acheter d’abord ? |
| text | budget-reserve | goal.reserve | Argent que je garde de côté ($) | field=goal.reserve number min=0 max=1000000000000 | invalid=false | Simple + Expert | je répartis moi-même, panier de Quoi acheter d’abord ? |
| select | f-budget-source | budget.source | Quels achats compter ? | field=budget.source |  | Simple + Expert | je répartis moi-même, panier de Quoi acheter d’abord ? |
| text | f-budget-allocations-0 | budget.allocations.0 | Véhicules ($) | field=budget.allocations.0 number min=0 max=1000000000000 |  | Simple + Expert (masqué par un réglage) | je répartis moi-même, panier de Quoi acheter d’abord ? |
| text | f-budget-allocations-1 | budget.allocations.1 | Investissements ($) | field=budget.allocations.1 number min=0 max=1000000000000 |  | Simple + Expert (masqué par un réglage) | je répartis moi-même, panier de Quoi acheter d’abord ? |
| text | f-budget-allocations-2 | budget.allocations.2 | Équipement ($) | field=budget.allocations.2 number min=0 max=1000000000000 |  | Simple + Expert (masqué par un réglage) | je répartis moi-même, panier de Quoi acheter d’abord ? |
| text | f-budget-allocations-3 | budget.allocations.3 | Consommables ($) | field=budget.allocations.3 number min=0 max=1000000000000 |  | Simple + Expert (masqué par un réglage) | je répartis moi-même, panier de Quoi acheter d’abord ? |
| text | f-budget-allocations-4 | budget.allocations.4 | Autres achats ($) | field=budget.allocations.4 number min=0 max=1000000000000 |  | Simple + Expert (masqué par un réglage) | je répartis moi-même, panier de Quoi acheter d’abord ? |
| text | f-budget-extra | budget.extra | Autres dépenses prévues ($) | field=budget.extra number min=0 max=1000000000000 |  | Simple + Expert | je répartis moi-même, panier de Quoi acheter d’abord ? |
| button |  |  | Voir ma réponse ↓ | showAnswer |  | Simple + Expert | je répartis moi-même, panier de Quoi acheter d’abord ? |
| text | budget-sessions | analysis.horizon.sessions | Sur combien de parties veux-tu voir ton argent ? | field=analysis.horizon.sessions number integer min=0 max=10000 |  | Simple + Expert (E) | je répartis moi-même, panier de Quoi acheter d’abord ? |
| button |  |  | Rétablir cette valeur | bDefault=analysis.horizon.sessions bDefaultValue=null |  | Simple + Expert (E) | je répartis moi-même, panier de Quoi acheter d’abord ? |
| button |  |  | Voir mes achats | open=order |  | Simple + Expert | je répartis moi-même, panier de Quoi acheter d’abord ? |
| button |  |  | Préparer mon business plan | open=plan |  | Simple + Expert | je répartis moi-même, panier de Quoi acheter d’abord ? |
| button |  |  | Ce qui compte dans ce calcul | foldHead=budget-assumptions | expanded=false controls=fold-budget-assumptions | Simple + Expert | je répartis moi-même, panier de Quoi acheter d’abord ? |
| button |  |  | Modifier | bFocus=budget-capital |  | Simple + Expert | je répartis moi-même, panier de Quoi acheter d’abord ? |
| button |  |  | Modifier | bFocus=budget-reserve |  | Simple + Expert | je répartis moi-même, panier de Quoi acheter d’abord ? |
| button |  |  | Et si le chiffre bouge de 20 % ? | foldHead=budget-sensitivity | expanded=false controls=fold-budget-sensitivity | Expert (E) | je répartis moi-même, panier de Quoi acheter d’abord ? |
| button |  |  | Comparer avec un calcul gardé | foldHead=budget-reference | expanded=false controls=fold-budget-reference | Expert (E) | je répartis moi-même, panier de Quoi acheter d’abord ? |
| button |  |  | Comment est-ce calculé ? | foldHead=budget-formula | expanded=false controls=fold-budget-formula | Expert (E) | je répartis moi-même, panier de Quoi acheter d’abord ? |
| button |  |  | Tous les chiffres du calcul | foldHead=budget-raw | expanded=false controls=fold-budget-raw | Expert (E) | je répartis moi-même, panier de Quoi acheter d’abord ? |
| button |  |  | Voir les réglages avancés (mode Expert) | bMode=advanced bAdvanced=budget |  | Simple + Expert | je répartis moi-même, panier de Quoi acheter d’abord ? |
| button |  |  | C’est bon pour cette étape ✓ | bComplete=budget |  | Simple + Expert | je répartis moi-même, panier de Quoi acheter d’abord ? |
| button |  |  | Aller à mon business plan | open=plan |  | Simple + Expert | je répartis moi-même, panier de Quoi acheter d’abord ? |

## Quoi acheter d’abord ? (`order`)

**Étapes du pas à pas** : 1. Combien as-tu ? · 2. Qu’est-ce que tu veux acheter ? · 3. Ce qui compte pour toi  
**Pas à pas** : Question 1 sur 3 : Combien as-tu ?

**Sorties** : order-capital-summary ; order-items (panier) ; order-results (réponse, étapes, comparer des ordres) ; expert-order ; mode-summary-order ; calc-live

**Zones repérées dans le panneau** : mode-summary-order, order-results, expert-order ; annonces : order-search-feedback

**Liens sortants (Expert)** : aucun

| kind | id | field | label | data | aria | mode | réglage |
|---|---|---|---|---|---|---|---|
| button |  |  | Voir en mode Expert | bMode=advanced |  | Simple + Expert | panier vide, deux achats, éditeur ouvert |
| text | order-capital | goal.capital | J’ai déjà ($) | field=goal.capital number min=0 max=1000000000000 | invalid=false | Simple + Expert | panier vide, deux achats, éditeur ouvert |
| text | order-reserve | goal.reserve | Argent que je garde de côté ($) | field=goal.reserve number min=0 max=1000000000000 | invalid=false | Simple + Expert | panier vide, deux achats, éditeur ouvert |
| text | order-hourly | goal.hourly | Je gagne à peu près ($ par heure), si je dois attendre | field=goal.hourly number min=0 max=1000000000000 |  | Simple + Expert | panier vide, deux achats, éditeur ouvert |
| search | order-search |  | Ajoute un achat (cherche dans le site) | bCombo=order | expanded=false controls=order-search-list | Simple + Expert | panier vide, deux achats, éditeur ouvert |
| button |  |  | Ajouter autre chose, sans fiche | bAddFree |  | Simple + Expert | panier vide, deux achats, éditeur ouvert |
| select | f-order-objective | order.objective | Je veux | field=order.objective |  | Simple + Expert | panier vide, deux achats, éditeur ouvert |
| button |  |  | Voir ma réponse ↓ | showAnswer |  | Simple + Expert | panier vide, deux achats, éditeur ouvert |
| button |  |  | Ce qui compte dans ce calcul | foldHead=order-assumptions | expanded=false controls=fold-order-assumptions | Simple + Expert | panier vide, deux achats, éditeur ouvert |
| button |  |  | Modifier | bFocus=order-capital |  | Simple + Expert | panier vide, deux achats, éditeur ouvert |
| button |  |  | Modifier | bFocus=order-reserve |  | Simple + Expert | panier vide, deux achats, éditeur ouvert |
| button |  |  | Modifier | bFocus=order-hourly |  | Simple + Expert | panier vide, deux achats, éditeur ouvert |
| button |  |  | Et si le chiffre bouge de 20 % ? | foldHead=order-sensitivity | expanded=false controls=fold-order-sensitivity | Expert (E) | panier vide, deux achats, éditeur ouvert |
| button |  |  | Comparer avec un calcul gardé | foldHead=order-reference | expanded=false controls=fold-order-reference | Expert (E) | panier vide, deux achats, éditeur ouvert |
| button |  |  | Comment est-ce calculé ? | foldHead=order-formula | expanded=false controls=fold-order-formula | Expert (E) | panier vide, deux achats, éditeur ouvert |
| button |  |  | Tous les chiffres du calcul | foldHead=order-raw | expanded=false controls=fold-order-raw | Expert (E) | panier vide, deux achats, éditeur ouvert |
| button |  |  | Voir les réglages avancés (mode Expert) | bMode=advanced bAdvanced=order |  | Simple + Expert | panier vide, deux achats, éditeur ouvert |
| button |  |  | C’est bon pour cette étape ✓ | bComplete=order |  | Simple + Expert | panier vide, deux achats, éditeur ouvert |
| button |  |  | Aller à mon business plan | open=plan |  | Simple + Expert | panier vide, deux achats, éditeur ouvert |
| button |  |  | Monter Mon achat libre | bOrderUp=free-<id> |  | Simple + Expert | deux achats, éditeur ouvert |
| button |  |  | Descendre Mon achat libre | bOrderDown=free-<id> |  | Simple + Expert | deux achats, éditeur ouvert |
| button |  |  | Modifier | bOrderEdit=free-<id> | expanded=true | Simple + Expert | deux achats, éditeur ouvert |
| button |  |  | Retirer | bOrderRemove=free-<id> |  | Simple + Expert | deux achats, éditeur ouvert |
| text | f-assets-1-name | assets.1.name | Nom de cet achat | field=assets.1.name |  | Simple + Expert | deux achats, éditeur ouvert |
| text | order-price-0 | assets.1.price | Ça coûte, d’après ce que tu imagines ($) | field=assets.1.price number min=0 max=1000000000000 |  | Simple + Expert | deux achats, éditeur ouvert |
| text | f-assets-1-extras | assets.1.extras | Frais et améliorations ($) | field=assets.1.extras number min=0 max=1000000000000 |  | Simple + Expert (E) | deux achats, éditeur ouvert |
| button |  |  | Rétablir cette valeur | bDefault=assets.1.extras bDefaultValue=0 |  | Simple + Expert (E) | deux achats, éditeur ouvert |
| text | f-assets-1-fees | assets.1.fees | Autres frais au départ ($) | field=assets.1.fees number min=0 max=1000000000000 |  | Simple + Expert (E) | deux achats, éditeur ouvert |
| button |  |  | Rétablir cette valeur | bDefault=assets.1.fees bDefaultValue=0 |  | Simple + Expert (E) | deux achats, éditeur ouvert |
| select | order-assets-1-incomeMode | assets.1.incomeMode | Ce que je gagne après cet achat | field=assets.1.incomeMode |  | Simple + Expert (E) | deux achats, éditeur ouvert |
| text | f-assets-1-boostHourly | assets.1.boostHourly | Il me fait gagner en plus ($ par heure) | field=assets.1.boostHourly number min=0 max=1000000000000 |  | Simple + Expert (E) (masqué par un réglage) | deux achats, éditeur ouvert |
| button |  |  | Rétablir cette valeur | bDefault=assets.1.boostHourly bDefaultValue=0 |  | Simple + Expert (E) (masqué par un réglage) | deux achats, éditeur ouvert |
| checkbox |  |  | Achat déjà possédé (prérequis d’activité satisfait) | bOwned=free-<id> |  | Simple + Expert (E) | deux achats, éditeur ouvert |
| text | order-usage-0 | assets.1.usage.perSession | Il me coûte à chaque partie ($) | field=assets.1.usage.perSession number min=0 max=1000000000000 |  | Simple + Expert (E) | deux achats, éditeur ouvert |
| button |  |  | Rétablir cette valeur | bDefault=assets.1.usage.perSession bDefaultValue=null |  | Simple + Expert (E) | deux achats, éditeur ouvert |
| checkbox |  |  | Mon achat libre | bRequires=free-<id>¦free-<id> |  | Simple + Expert (E) | deux achats, éditeur ouvert |
| text | f-assets-2-name | assets.2.name | Nom de cet achat | field=assets.2.name |  | Simple + Expert (masqué par un réglage) | deux achats, éditeur ouvert |
| text | order-price-1 | assets.2.price | Ça coûte, d’après ce que tu imagines ($) | field=assets.2.price number min=0 max=1000000000000 |  | Simple + Expert (masqué par un réglage) | deux achats, éditeur ouvert |
| text | f-assets-2-extras | assets.2.extras | Frais et améliorations ($) | field=assets.2.extras number min=0 max=1000000000000 |  | Simple + Expert (E) (masqué par un réglage) | deux achats, éditeur ouvert |
| button |  |  | Rétablir cette valeur | bDefault=assets.2.extras bDefaultValue=0 |  | Simple + Expert (E) (masqué par un réglage) | deux achats, éditeur ouvert |
| text | f-assets-2-fees | assets.2.fees | Autres frais au départ ($) | field=assets.2.fees number min=0 max=1000000000000 |  | Simple + Expert (E) (masqué par un réglage) | deux achats, éditeur ouvert |
| button |  |  | Rétablir cette valeur | bDefault=assets.2.fees bDefaultValue=0 |  | Simple + Expert (E) (masqué par un réglage) | deux achats, éditeur ouvert |
| select | order-assets-2-incomeMode | assets.2.incomeMode | Ce que je gagne après cet achat | field=assets.2.incomeMode |  | Simple + Expert (E) (masqué par un réglage) | deux achats, éditeur ouvert |
| text | f-assets-2-boostHourly | assets.2.boostHourly | Il me fait gagner en plus ($ par heure) | field=assets.2.boostHourly number min=0 max=1000000000000 |  | Simple + Expert (E) (masqué par un réglage) | deux achats, éditeur ouvert |
| button |  |  | Rétablir cette valeur | bDefault=assets.2.boostHourly bDefaultValue=0 |  | Simple + Expert (E) (masqué par un réglage) | deux achats, éditeur ouvert |
| text | order-usage-1 | assets.2.usage.perSession | Il me coûte à chaque partie ($) | field=assets.2.usage.perSession number min=0 max=1000000000000 |  | Simple + Expert (E) (masqué par un réglage) | deux achats, éditeur ouvert |
| button |  |  | Rétablir cette valeur | bDefault=assets.2.usage.perSession bDefaultValue=null |  | Simple + Expert (E) (masqué par un réglage) | deux achats, éditeur ouvert |
| button |  |  | Aller à la case à corriger | bFocus=order-price-0 |  | Simple + Expert | deux achats, éditeur ouvert |

## Ça vaut le coup ? (`roi`)

**Étapes du pas à pas** : 1. Quel achat ? · 2. Puis-je me le permettre ? · 3. Pourquoi cet achat ?   
**Pas à pas** : Question 1 sur 3 : Quel achat ?

**Sorties** : roi-selection ; roi-links (selon le mode) ; roi-results (réponse, chiffres, courbe, acheter ou attendre / avec ou sans) ; expert-roi ; mode-summary-roi ; calc-live

**Zones repérées dans le panneau** : mode-summary-roi, roi-results, expert-roi ; annonces : roi-search-feedback, roi-compare-search-feedback

**Liens sortants (Expert)** : aucun

| kind | id | field | label | data | aria | mode | réglage |
|---|---|---|---|---|---|---|---|
| button |  |  | Voir en mode Expert | bMode=advanced |  | Simple + Expert | achat plaisir (estimate), estimate + activité pour regagner, nouvelle activité (new), activité améliorée (improve), chiffre par heure (continuous), deuxième achat comparé |
| search | roi-search |  | Quel achat ? (cherche dans le site) | bCombo=roi | expanded=false controls=roi-search-list | Simple + Expert | achat plaisir (estimate), estimate + activité pour regagner, nouvelle activité (new), activité améliorée (improve), chiffre par heure (continuous), deuxième achat comparé |
| button |  |  | Écrire un achat libre | bRoiManual |  | Simple + Expert | achat plaisir (estimate), estimate + activité pour regagner, nouvelle activité (new), activité améliorée (improve), chiffre par heure (continuous), deuxième achat comparé |
| text | roi-name | assets.0.name | Nom de mon achat | field=assets.0.name |  | Simple + Expert | achat plaisir (estimate), estimate + activité pour regagner, nouvelle activité (new), activité améliorée (improve), chiffre par heure (continuous), deuxième achat comparé |
| text | f-roi-purchase | assets.0.price | Ça coûte, d’après ce que tu imagines ($) | field=assets.0.price number min=0 max=1000000000000 |  | Simple + Expert | achat plaisir (estimate), estimate + activité pour regagner, nouvelle activité (new), activité améliorée (improve), chiffre par heure (continuous), deuxième achat comparé |
| text | roi-capital | goal.capital | J’ai déjà ($) | field=goal.capital number min=0 max=1000000000000 | invalid=false | Simple + Expert | achat plaisir (estimate), estimate + activité pour regagner, nouvelle activité (new), activité améliorée (improve), chiffre par heure (continuous), deuxième achat comparé |
| text | roi-reserve | goal.reserve | Argent que je garde de côté ($) | field=goal.reserve number min=0 max=1000000000000 | invalid=false | Simple + Expert | achat plaisir (estimate), estimate + activité pour regagner, nouvelle activité (new), activité améliorée (improve), chiffre par heure (continuous), deuxième achat comparé |
| select | f-roi-mode | roi.mode | Ce que cet achat change pour moi | field=roi.mode |  | Simple + Expert | achat plaisir (estimate), estimate + activité pour regagner, nouvelle activité (new), activité améliorée (improve), chiffre par heure (continuous), deuxième achat comparé |
| select | f-roi-recoveryActivity | roi.recoveryActivity | Avec quoi je regagne cette somme ? | field=roi.recoveryActivity |  | Simple + Expert (opt) | achat plaisir (estimate), estimate + activité pour regagner, deuxième achat comparé |
| text | roi-recovery-hourly | goal.hourly | Je gagne à peu près ($ par heure de jeu) | field=goal.hourly number min=0 max=1000000000000 |  | Simple + Expert (opt) | achat plaisir (estimate), deuxième achat comparé |
| text | f-roi-hours | roi.hours | Je m’en sers pendant (heures de jeu) | field=roi.hours number min=0 max=16666 |  | Simple + Expert | achat plaisir (estimate), estimate + activité pour regagner, nouvelle activité (new), activité améliorée (improve), chiffre par heure (continuous), deuxième achat comparé |
| text | f-roi-gainPercent | roi.gainPercent | Récompense en plus (%) | field=roi.gainPercent number min=0 max=1000 |  | Simple + Expert (masqué par un réglage) | achat plaisir (estimate), estimate + activité pour regagner, nouvelle activité (new), activité améliorée (improve), chiffre par heure (continuous), deuxième achat comparé |
| text | f-roi-durationReduction | roi.durationReduction | Mission plus courte de (%) | field=roi.durationReduction number min=0 max=95 |  | Simple + Expert (masqué par un réglage) | achat plaisir (estimate), estimate + activité pour regagner, nouvelle activité (new), activité améliorée (improve), chiffre par heure (continuous), deuxième achat comparé |
| button |  |  | Voir ma réponse ↓ | showAnswer |  | Simple + Expert | achat plaisir (estimate), estimate + activité pour regagner, nouvelle activité (new), activité améliorée (improve), chiffre par heure (continuous), deuxième achat comparé |
| search | roi-compare-search |  | Autre achat à comparer (facultatif) | bCombo=roi-compare | expanded=false controls=roi-compare-search-list | Simple + Expert (opt) | achat plaisir (estimate), estimate + activité pour regagner, nouvelle activité (new), activité améliorée (improve), chiffre par heure (continuous), deuxième achat comparé |
| button |  |  | Comparer avec un achat libre | bRoiAlternative |  | Simple + Expert (opt) | achat plaisir (estimate), estimate + activité pour regagner, nouvelle activité (new), activité améliorée (improve), chiffre par heure (continuous), deuxième achat comparé |
| text | f-roi-upgrades | assets.0.extras | Améliorations ($) | field=assets.0.extras number min=0 max=1000000000000 |  | Simple + Expert (opt) | achat plaisir (estimate), estimate + activité pour regagner, nouvelle activité (new), activité améliorée (improve), chiffre par heure (continuous), deuxième achat comparé |
| text | f-roi-fees | assets.0.fees | Autres frais obligatoires au départ ($) | field=assets.0.fees number min=0 max=1000000000000 |  | Simple + Expert (opt) | achat plaisir (estimate), estimate + activité pour regagner, nouvelle activité (new), activité améliorée (improve), chiffre par heure (continuous), deuxième achat comparé |
| text | f-roi-usage | assets.0.usage.perSession | Il me coûte à chaque partie ($) | field=assets.0.usage.perSession number min=0 max=1000000000000 |  | Simple + Expert (opt) | achat plaisir (estimate), estimate + activité pour regagner, nouvelle activité (new), activité améliorée (improve), chiffre par heure (continuous), deuxième achat comparé |
| text | f-roi-resale | assets.0.resale | Je pourrais le revendre ($, mon hypothèse) | field=assets.0.resale number min=0 max=1000000000000 |  | Simple + Expert (opt) | achat plaisir (estimate), estimate + activité pour regagner, nouvelle activité (new), activité améliorée (improve), chiffre par heure (continuous), deuxième achat comparé |
| button |  |  | Le mettre dans mon business plan | bRoiToPlan |  | Simple + Expert | achat plaisir (estimate), estimate + activité pour regagner, deuxième achat comparé |
| button |  |  | Acheter maintenant ou attendre ? | foldHead=roi-d0 | expanded=false controls=fold-roi-d0 | Simple + Expert | achat plaisir (estimate), estimate + activité pour regagner, deuxième achat comparé |
| button |  |  | Ce qui compte dans ce calcul | foldHead=roi-assumptions | expanded=false controls=fold-roi-assumptions | Simple + Expert | achat plaisir (estimate), estimate + activité pour regagner, chiffre par heure (continuous), deuxième achat comparé |
| button |  |  | Modifier | bFocus=f-roi-purchase |  | Simple + Expert | achat plaisir (estimate), estimate + activité pour regagner, chiffre par heure (continuous), deuxième achat comparé |
| button |  |  | Modifier | bFocus=roi-capital |  | Simple + Expert | achat plaisir (estimate), estimate + activité pour regagner, chiffre par heure (continuous), deuxième achat comparé |
| button |  |  | Modifier | bFocus=roi-reserve |  | Simple + Expert | achat plaisir (estimate), estimate + activité pour regagner, chiffre par heure (continuous), deuxième achat comparé |
| button |  |  | Modifier | bFocus=f-roi-hours |  | Simple + Expert | achat plaisir (estimate), estimate + activité pour regagner, chiffre par heure (continuous), deuxième achat comparé |
| button |  |  | Comment est-ce calculé ? | foldHead=roi-d1 | expanded=false controls=fold-roi-d1 | Simple + Expert | achat plaisir (estimate), estimate + activité pour regagner, chiffre par heure (continuous), deuxième achat comparé |
| button |  |  | Ajouter à « Quoi acheter d’abord ? » | bOrderRoi |  | Simple + Expert | achat plaisir (estimate), estimate + activité pour regagner, nouvelle activité (new), activité améliorée (improve), chiffre par heure (continuous), deuxième achat comparé |
| button |  |  | Et si le chiffre bouge de 20 % ? | foldHead=roi-sensitivity | expanded=false controls=fold-roi-sensitivity | Expert (E) | achat plaisir (estimate), estimate + activité pour regagner, nouvelle activité (new), activité améliorée (improve), chiffre par heure (continuous), deuxième achat comparé |
| button |  |  | Comparer avec un calcul gardé | foldHead=roi-reference | expanded=false controls=fold-roi-reference | Expert (E) | achat plaisir (estimate), estimate + activité pour regagner, nouvelle activité (new), activité améliorée (improve), chiffre par heure (continuous), deuxième achat comparé |
| button |  |  | Comment est-ce calculé ? | foldHead=roi-formula | expanded=false controls=fold-roi-formula | Expert (E) | achat plaisir (estimate), estimate + activité pour regagner, nouvelle activité (new), activité améliorée (improve), chiffre par heure (continuous), deuxième achat comparé |
| button |  |  | Tous les chiffres du calcul | foldHead=roi-raw | expanded=false controls=fold-roi-raw | Expert (E) | achat plaisir (estimate), estimate + activité pour regagner, nouvelle activité (new), activité améliorée (improve), chiffre par heure (continuous), deuxième achat comparé |
| button |  |  | Voir les réglages avancés (mode Expert) | bMode=advanced bAdvanced=roi |  | Simple + Expert | achat plaisir (estimate), estimate + activité pour regagner, nouvelle activité (new), activité améliorée (improve), chiffre par heure (continuous), deuxième achat comparé |
| button |  |  | C’est bon pour cette étape ✓ | bComplete=roi |  | Simple + Expert | achat plaisir (estimate), estimate + activité pour regagner, nouvelle activité (new), activité améliorée (improve), chiffre par heure (continuous), deuxième achat comparé |
| button |  |  | Aller à mon business plan | open=plan |  | Simple + Expert | achat plaisir (estimate), estimate + activité pour regagner, nouvelle activité (new), activité améliorée (improve), chiffre par heure (continuous), deuxième achat comparé |
| text | roi-recovery-activity-0-name | activities.0.name | Nom de mon activité | field=activities.0.name |  | Simple + Expert (opt) | estimate + activité pour regagner |
| text | roi-recovery-activity-0-reward | activities.0.reward | Récompense ($) | field=activities.0.reward number min=0 max=1000000000000 |  | Simple + Expert (opt) | estimate + activité pour regagner |
| text | roi-recovery-activity-0-duration | activities.0.duration | Durée (min) | field=activities.0.duration number min=0 max=1000000 |  | Simple + Expert (opt) | estimate + activité pour regagner |
| text | roi-recovery-activity-0-cost | activities.0.cost | Frais par mission ($) | field=activities.0.cost number min=0 max=1000000000000 |  | Simple + Expert (opt) | estimate + activité pour regagner |
| text | roi-recovery-activity-0-prep | activities.0.prep | Préparation (min) | field=activities.0.prep number min=0 max=1000000 |  | Simple + Expert (opt) | estimate + activité pour regagner |
| text | roi-recovery-activity-0-cooldown | activities.0.cooldown | Attente avant de recommencer (min) | field=activities.0.cooldown number min=0 max=1000000 |  | Simple + Expert (opt) | estimate + activité pour regagner |
| text | roi-recovery-activity-0-share | activities.0.share | Ma part (%) | field=activities.0.share number min=0 max=100 |  | Simple + Expert (opt) | estimate + activité pour regagner |
| text | roi-recovery-activity-0-investment | activities.0.investment | À acheter une seule fois avant de commencer ($) | field=activities.0.investment number min=0 max=1000000000000 |  | Simple + Expert (opt) | estimate + activité pour regagner |
| text | roi-recovery-activity-0-players | activities.0.players | Joueurs nécessaires | field=activities.0.players number integer min max=100 |  | Simple + Expert (opt) | estimate + activité pour regagner |
| checkbox |  |  | Je l’ai déjà acheté | owned=0 |  | Simple + Expert (opt) | estimate + activité pour regagner, nouvelle activité (new), activité améliorée (improve) |
| checkbox |  |  | Je prépare une seule fois par partie | bPrepOnce=0 |  | Simple + Expert (opt) | estimate + activité pour regagner, nouvelle activité (new), activité améliorée (improve) |
| text | roi-players | goal.players | Nous sommes combien de joueurs, moi compris ? | field=goal.players number integer min max=100 | invalid=false | Simple + Expert | nouvelle activité (new), activité améliorée (improve) |
| checkbox |  |  | Exemple A : missions courtes · c’est moi qui le dis | bRoiActivity=scenario-a |  | Simple + Expert | nouvelle activité (new), activité améliorée (improve) |
| checkbox |  |  | Exemple B : missions longues · c’est moi qui le dis | bRoiActivity=scenario-b |  | Simple + Expert | nouvelle activité (new), activité améliorée (improve) |
| checkbox |  |  | Exemple C : avec un achat de départ · c’est moi qui le dis | bRoiActivity=scenario-c |  | Simple + Expert | nouvelle activité (new), activité améliorée (improve) |
| text | roi-activity-0-name | activities.0.name | Nom de mon activité | field=activities.0.name |  | Simple + Expert | nouvelle activité (new), activité améliorée (improve) |
| text | roi-activity-0-reward | activities.0.reward | Récompense ($) | field=activities.0.reward number min=0 max=1000000000000 |  | Simple + Expert | nouvelle activité (new), activité améliorée (improve) |
| text | roi-activity-0-duration | activities.0.duration | Durée (min) | field=activities.0.duration number min=0 max=1000000 |  | Simple + Expert | nouvelle activité (new), activité améliorée (improve) |
| text | roi-activity-0-cost | activities.0.cost | Frais par mission ($) | field=activities.0.cost number min=0 max=1000000000000 |  | Simple + Expert | nouvelle activité (new), activité améliorée (improve) |
| text | roi-activity-0-prep | activities.0.prep | Préparation (min) | field=activities.0.prep number min=0 max=1000000 |  | Simple + Expert | nouvelle activité (new), activité améliorée (improve) |
| text | roi-activity-0-cooldown | activities.0.cooldown | Attente avant de recommencer (min) | field=activities.0.cooldown number min=0 max=1000000 |  | Simple + Expert | nouvelle activité (new), activité améliorée (improve) |
| text | roi-activity-0-share | activities.0.share | Ma part (%) | field=activities.0.share number min=0 max=100 |  | Simple + Expert | nouvelle activité (new), activité améliorée (improve) |
| text | roi-activity-0-investment | activities.0.investment | À acheter une seule fois avant de commencer ($) | field=activities.0.investment number min=0 max=1000000000000 |  | Simple + Expert | nouvelle activité (new), activité améliorée (improve) |
| text | roi-activity-0-players | activities.0.players | Joueurs nécessaires | field=activities.0.players number integer min max=100 |  | Simple + Expert | nouvelle activité (new), activité améliorée (improve) |
| text | roi-activity-1-name | activities.1.name | Nom de mon activité | field=activities.1.name |  | Simple + Expert | nouvelle activité (new), activité améliorée (improve) |
| text | roi-activity-1-reward | activities.1.reward | Récompense ($) | field=activities.1.reward number min=0 max=1000000000000 |  | Simple + Expert | nouvelle activité (new), activité améliorée (improve) |
| text | roi-activity-1-duration | activities.1.duration | Durée (min) | field=activities.1.duration number min=0 max=1000000 |  | Simple + Expert | nouvelle activité (new), activité améliorée (improve) |
| text | roi-activity-1-cost | activities.1.cost | Frais par mission ($) | field=activities.1.cost number min=0 max=1000000000000 |  | Simple + Expert | nouvelle activité (new), activité améliorée (improve) |
| text | roi-activity-1-prep | activities.1.prep | Préparation (min) | field=activities.1.prep number min=0 max=1000000 |  | Simple + Expert | nouvelle activité (new), activité améliorée (improve) |
| text | roi-activity-1-cooldown | activities.1.cooldown | Attente avant de recommencer (min) | field=activities.1.cooldown number min=0 max=1000000 |  | Simple + Expert | nouvelle activité (new), activité améliorée (improve) |
| text | roi-activity-1-share | activities.1.share | Ma part (%) | field=activities.1.share number min=0 max=100 |  | Simple + Expert | nouvelle activité (new), activité améliorée (improve) |
| text | roi-activity-1-investment | activities.1.investment | À acheter une seule fois avant de commencer ($) | field=activities.1.investment number min=0 max=1000000000000 |  | Simple + Expert | nouvelle activité (new), activité améliorée (improve) |
| text | roi-activity-1-players | activities.1.players | Joueurs nécessaires | field=activities.1.players number integer min max=100 |  | Simple + Expert | nouvelle activité (new), activité améliorée (improve) |
| checkbox |  |  | Je l’ai déjà acheté | owned |  | Simple + Expert | nouvelle activité (new), activité améliorée (improve) |
| checkbox |  |  | Je prépare une seule fois par partie | bPrepOnce |  | Simple + Expert | nouvelle activité (new), activité améliorée (improve) |
| text | roi-activity-2-name | activities.2.name | Nom de mon activité | field=activities.2.name |  | Simple + Expert | nouvelle activité (new), activité améliorée (improve) |
| text | roi-activity-2-reward | activities.2.reward | Récompense ($) | field=activities.2.reward number min=0 max=1000000000000 |  | Simple + Expert | nouvelle activité (new), activité améliorée (improve) |
| text | roi-activity-2-duration | activities.2.duration | Durée (min) | field=activities.2.duration number min=0 max=1000000 |  | Simple + Expert | nouvelle activité (new), activité améliorée (improve) |
| text | roi-activity-2-cost | activities.2.cost | Frais par mission ($) | field=activities.2.cost number min=0 max=1000000000000 |  | Simple + Expert | nouvelle activité (new), activité améliorée (improve) |
| text | roi-activity-2-prep | activities.2.prep | Préparation (min) | field=activities.2.prep number min=0 max=1000000 |  | Simple + Expert | nouvelle activité (new), activité améliorée (improve) |
| text | roi-activity-2-cooldown | activities.2.cooldown | Attente avant de recommencer (min) | field=activities.2.cooldown number min=0 max=1000000 |  | Simple + Expert | nouvelle activité (new), activité améliorée (improve) |
| text | roi-activity-2-share | activities.2.share | Ma part (%) | field=activities.2.share number min=0 max=100 |  | Simple + Expert | nouvelle activité (new), activité améliorée (improve) |
| text | roi-activity-2-investment | activities.2.investment | À acheter une seule fois avant de commencer ($) | field=activities.2.investment number min=0 max=1000000000000 |  | Simple + Expert | nouvelle activité (new), activité améliorée (improve) |
| text | roi-activity-2-players | activities.2.players | Joueurs nécessaires | field=activities.2.players number integer min max=100 |  | Simple + Expert | nouvelle activité (new), activité améliorée (improve) |
| checkbox |  |  | Je l’ai déjà acheté | owned=2 |  | Simple + Expert | nouvelle activité (new), activité améliorée (improve) |
| checkbox |  |  | Je prépare une seule fois par partie | bPrepOnce=2 |  | Simple + Expert | nouvelle activité (new), activité améliorée (improve) |
| button |  |  | Comment est-ce calculé ? | foldHead=roi-d0 | expanded=false controls=fold-roi-d0 | Simple + Expert | nouvelle activité (new), activité améliorée (improve) |
| text | f-roi-revenueHourly | roi.revenueHourly | Il me fait gagner en plus ($ par heure) | field=roi.revenueHourly number min=0 max=1000000000000 |  | Simple + Expert | chiffre par heure (continuous) |
| text | f-roi-costHourly | roi.costHourly | Il me coûte en plus ($ par heure) | field=roi.costHourly number min=0 max=1000000000000 |  | Simple + Expert | chiffre par heure (continuous) |
| button |  |  | Avec ou sans cet achat, après 10 h de jeu | foldHead=roi-d0 | expanded=false controls=fold-roi-d0 | Simple + Expert | chiffre par heure (continuous) |
| button |  |  | Écrire | bFocus=f-roi-revenueHourly |  | Simple + Expert | chiffre par heure (continuous) |
| text | roi-alternative-name | assets.1.name | Nom du deuxième achat | field=assets.1.name |  | Simple + Expert (opt) | deuxième achat comparé |
| text | roi-alternative-price | assets.1.price | Ça coûte, d’après ce que tu imagines ($) | field=assets.1.price number min=0 max=1000000000000 |  | Simple + Expert (opt) | deuxième achat comparé |
| button |  |  | Retirer cette comparaison | bRoiRemoveComparison |  | Simple + Expert (opt) | deuxième achat comparé |

## Mes activités (`activities`)

**Étapes du pas à pas** : 1. Quelle activité veux-tu refaire ? · 2. Combien de temps as-tu ? · 3. Tu joues seul ou à plusieurs ? · 4. Combien d’argent as-tu ?  
**Pas à pas** : Question 1 sur 4 : Quelle activité veux-tu refaire ?

**Sorties** : inverse-results (réponse) ; activity-results (tableau de toutes les activités) ; activity-live (annonce) ; expert-activities ; mode-summary-activities

**Zones repérées dans le panneau** : mode-summary-activities, inverse-results, activity-results, expert-activities ; annonces : activity-live

**Liens sortants (Expert)** : aucun

| kind | id | field | label | data | aria | mode | réglage |
|---|---|---|---|---|---|---|---|
| button |  |  | Voir en mode Expert | bMode=advanced |  | Simple + Expert |  |
| button |  |  | Exemple A · solo | activityExample=scenario-a |  | Simple + Expert |  |
| button |  |  | Exemple B · solo | activityExample=scenario-b |  | Simple + Expert |  |
| button |  |  | Exemple C · solo | activityExample=scenario-c |  | Simple + Expert |  |
| select | f-inverse-selected | inverse.selected | Activité à refaire | field=inverse.selected |  | Simple + Expert |  |
| text | f-inverse-minutes | inverse.minutes | J’ai combien de temps ? (minutes) | field=inverse.minutes number min=0 max=1000000 |  | Simple + Expert |  |
| radio |  |  | Je joue seul |  |  | Simple + Expert |  |
| radio |  |  | Je joue à plusieurs |  |  | Simple + Expert |  |
| text | activity-players | goal.players | Nombre de joueurs, moi compris | field=goal.players number integer min max=100 | invalid=false | Simple + Expert (masqué par un réglage) |  |
| text | activity-capital | goal.capital | J’ai déjà ($) | field=goal.capital number min=0 max=1000000000000 | invalid=false | Simple + Expert |  |
| text | activity-reserve | goal.reserve | Argent que je garde de côté ($) | field=goal.reserve number min=0 max=1000000000000 | invalid=false | Simple + Expert |  |
| button | activity-answer |  | Voir ma réponse ↓ | showAnswer |  | Simple + Expert |  |
| button |  |  | Ce qui compte dans ce calcul | foldHead=activities-assumptions | expanded=false controls=fold-activities-assumptions | Simple + Expert |  |
| button |  |  | Modifier | bFocus=f-inverse-minutes |  | Simple + Expert |  |
| button |  |  | Modifier | bFocus=activity-players |  | Simple + Expert |  |
| text | f-activities-0-name | activities.0.name | Nom de mon activité | field=activities.0.name |  | Simple + Expert |  |
| text | f-activities-0-reward | activities.0.reward | Récompense de la mission ($) | field=activities.0.reward number min=0 max=1000000000000 |  | Simple + Expert |  |
| text | f-activities-0-cost | activities.0.cost | Ce que je paie à chaque fois ($) | field=activities.0.cost number min=0 max=1000000000000 |  | Simple + Expert |  |
| text | f-activities-0-duration | activities.0.duration | Durée de la mission (min) | field=activities.0.duration number min=0 max=1000000 |  | Simple + Expert |  |
| text | f-activities-0-prep | activities.0.prep | Préparation (min) | field=activities.0.prep number min=0 max=1000000 |  | Simple + Expert |  |
| text | f-activities-0-cooldown | activities.0.cooldown | Attente avant de recommencer (min) | field=activities.0.cooldown number min=0 max=1000000 |  | Simple + Expert |  |
| text | f-activities-0-share | activities.0.share | Ma part de la récompense (%) | field=activities.0.share number min=0 max=100 |  | Simple + Expert |  |
| text | f-activities-0-investment | activities.0.investment | À acheter une seule fois avant de commencer ($) | field=activities.0.investment number min=0 max=1000000000000 |  | Simple + Expert |  |
| text | f-activities-0-players | activities.0.players | Joueurs qu’il faut | field=activities.0.players number integer min max=100 |  | Simple + Expert |  |
| checkbox |  |  | Je l’ai déjà acheté : ne pas le compter une deuxième fois | owned=0 |  | Simple + Expert |  |
| checkbox |  |  | Je prépare une seule fois par partie (sinon, à chaque mission) | bPrepOnce=0 |  | Simple + Expert |  |
| text | f-activities-1-name | activities.1.name | Nom de mon activité | field=activities.1.name |  | Simple + Expert |  |
| text | f-activities-1-reward | activities.1.reward | Récompense de la mission ($) | field=activities.1.reward number min=0 max=1000000000000 |  | Simple + Expert |  |
| text | f-activities-1-cost | activities.1.cost | Ce que je paie à chaque fois ($) | field=activities.1.cost number min=0 max=1000000000000 |  | Simple + Expert |  |
| text | f-activities-1-duration | activities.1.duration | Durée de la mission (min) | field=activities.1.duration number min=0 max=1000000 |  | Simple + Expert |  |
| text | f-activities-1-prep | activities.1.prep | Préparation (min) | field=activities.1.prep number min=0 max=1000000 |  | Simple + Expert |  |
| text | f-activities-1-cooldown | activities.1.cooldown | Attente avant de recommencer (min) | field=activities.1.cooldown number min=0 max=1000000 |  | Simple + Expert |  |
| text | f-activities-1-share | activities.1.share | Ma part de la récompense (%) | field=activities.1.share number min=0 max=100 |  | Simple + Expert |  |
| text | f-activities-1-investment | activities.1.investment | À acheter une seule fois avant de commencer ($) | field=activities.1.investment number min=0 max=1000000000000 |  | Simple + Expert |  |
| text | f-activities-1-players | activities.1.players | Joueurs qu’il faut | field=activities.1.players number integer min max=100 |  | Simple + Expert |  |
| checkbox |  |  | Je l’ai déjà acheté : ne pas le compter une deuxième fois | owned |  | Simple + Expert |  |
| checkbox |  |  | Je prépare une seule fois par partie (sinon, à chaque mission) | bPrepOnce |  | Simple + Expert |  |
| text | f-activities-2-name | activities.2.name | Nom de mon activité | field=activities.2.name |  | Simple + Expert |  |
| text | f-activities-2-reward | activities.2.reward | Récompense de la mission ($) | field=activities.2.reward number min=0 max=1000000000000 |  | Simple + Expert |  |
| text | f-activities-2-cost | activities.2.cost | Ce que je paie à chaque fois ($) | field=activities.2.cost number min=0 max=1000000000000 |  | Simple + Expert |  |
| text | f-activities-2-duration | activities.2.duration | Durée de la mission (min) | field=activities.2.duration number min=0 max=1000000 |  | Simple + Expert |  |
| text | f-activities-2-prep | activities.2.prep | Préparation (min) | field=activities.2.prep number min=0 max=1000000 |  | Simple + Expert |  |
| text | f-activities-2-cooldown | activities.2.cooldown | Attente avant de recommencer (min) | field=activities.2.cooldown number min=0 max=1000000 |  | Simple + Expert |  |
| text | f-activities-2-share | activities.2.share | Ma part de la récompense (%) | field=activities.2.share number min=0 max=100 |  | Simple + Expert |  |
| text | f-activities-2-investment | activities.2.investment | À acheter une seule fois avant de commencer ($) | field=activities.2.investment number min=0 max=1000000000000 |  | Simple + Expert |  |
| text | f-activities-2-players | activities.2.players | Joueurs qu’il faut | field=activities.2.players number integer min max=100 |  | Simple + Expert |  |
| checkbox |  |  | Je l’ai déjà acheté : ne pas le compter une deuxième fois | owned=2 |  | Simple + Expert |  |
| checkbox |  |  | Je prépare une seule fois par partie (sinon, à chaque mission) | bPrepOnce=2 |  | Simple + Expert |  |
| select | activity-filter |  | Afficher |  |  | Simple + Expert |  |
| button |  |  | Et si le chiffre bouge de 20 % ? | foldHead=activities-sensitivity | expanded=false controls=fold-activities-sensitivity | Expert (E) |  |
| button |  |  | Comparer avec un calcul gardé | foldHead=activities-reference | expanded=false controls=fold-activities-reference | Expert (E) |  |
| button |  |  | Comment est-ce calculé ? | foldHead=activities-formula | expanded=false controls=fold-activities-formula | Expert (E) |  |
| button |  |  | Tous les chiffres du calcul | foldHead=activities-raw | expanded=false controls=fold-activities-raw | Expert (E) |  |
| button |  |  | Voir les réglages avancés (mode Expert) | bMode=advanced bAdvanced=activities |  | Simple + Expert |  |
| button |  |  | C’est bon pour cette étape ✓ | bComplete=activities |  | Simple + Expert |  |
| button |  |  | Aller à mon business plan | open=plan |  | Simple + Expert |  |

## Quel achat choisir ? (`compare`)

**Étapes du pas à pas** : 1. Quels achats veux-tu comparer ? · 2. Combien as-tu ? · 3. Pour quel usage ? · 4. Ce qui compte le plus pour toi  
**Pas à pas** : Question 1 sur 4 : Quels achats veux-tu comparer ?

**Sorties** : compare-items ; compare-results (réponse, écartés, selon ce qui compte, tableau côte à côte, coût dans la durée) ; expert-compare ; mode-summary-compare ; calc-live

**Zones repérées dans le panneau** : mode-summary-compare, compare-results, expert-compare ; annonces : compare-search-feedback

**Liens sortants (Expert)** : aucun

| kind | id | field | label | data | aria | mode | réglage |
|---|---|---|---|---|---|---|---|
| button |  |  | Voir en mode Expert | bMode=advanced |  | Simple + Expert | vide, deux achats libres |
| search | compare-search |  | Ajoute un achat (cherche dans le site) | bCombo=compare | expanded=false controls=compare-search-list | Simple + Expert | vide, deux achats libres |
| button |  |  | Ajouter un achat libre | bCompareFree |  | Simple + Expert | vide, deux achats libres |
| text | compare-capital | goal.capital | J’ai déjà ($) | field=goal.capital number min=0 max=1000000000000 | invalid=false | Simple + Expert | vide, deux achats libres |
| text | compare-reserve | goal.reserve | Argent que je garde de côté ($) | field=goal.reserve number min=0 max=1000000000000 | invalid=false | Simple + Expert | vide, deux achats libres |
| text | compare-hourly | goal.hourly | Je gagne à peu près ($ par heure), si je dois attendre | field=goal.hourly number min=0 max=1000000000000 |  | Simple + Expert | vide, deux achats libres |
| text | compare-daily | goal.dailyMinutes | Je joue par jour (minutes) | field=goal.dailyMinutes number min=0 max=1440 |  | Simple + Expert | vide, deux achats libres |
| select | f-analysis-need-terrain | analysis.need.terrain | Il doit aller | field=analysis.need.terrain |  | Simple + Expert | vide, deux achats libres |
| text | need-passengers | analysis.need.passengers | Il doit transporter (personnes, toi compris) | field=analysis.need.passengers number integer min=0 max=100 |  | Simple + Expert | vide, deux achats libres |
| checkbox |  | analysis.need.cargo | Il doit pouvoir transporter des choses | field=analysis.need.cargo |  | Simple + Expert | vide, deux achats libres |
| select | f-compare-criterion | compare.criterion | Je veux surtout | field=compare.criterion |  | Simple + Expert | vide, deux achats libres |
| text | compare-sessions | analysis.horizon.sessions | Je m’en sers pendant (parties) | field=analysis.horizon.sessions number integer min=0 max=10000 |  | Simple + Expert | vide, deux achats libres |
| text | compare-hours | compare.hours | Je m’en sers pendant (heures de jeu) | field=compare.hours number min=0 max=16666 |  | Simple + Expert (E) | vide, deux achats libres |
| button |  |  | Rétablir cette valeur | bDefault=compare.hours bDefaultValue=10 |  | Simple + Expert (E) | vide, deux achats libres |
| button |  |  | Voir ma réponse ↓ | showAnswer |  | Simple + Expert | vide, deux achats libres |
| button |  |  | Et si le chiffre bouge de 20 % ? | foldHead=compare-sensitivity | expanded=false controls=fold-compare-sensitivity | Expert (E) | vide, deux achats libres |
| button |  |  | Comparer avec un calcul gardé | foldHead=compare-reference | expanded=false controls=fold-compare-reference | Expert (E) | vide, deux achats libres |
| button |  |  | Comment est-ce calculé ? | foldHead=compare-formula | expanded=false controls=fold-compare-formula | Expert (E) | vide, deux achats libres |
| button |  |  | Tous les chiffres du calcul | foldHead=compare-raw | expanded=false controls=fold-compare-raw | Expert (E) | vide, deux achats libres |
| button |  |  | Voir les réglages avancés (mode Expert) | bMode=advanced bAdvanced=compare |  | Simple + Expert | vide, deux achats libres |
| button |  |  | C’est bon pour cette étape ✓ | bComplete=compare |  | Simple + Expert | vide, deux achats libres |
| button |  |  | Aller à mon business plan | open=plan |  | Simple + Expert | vide, deux achats libres |
| text | compare-name-0 | assets.1.name | Nom de cet achat | field=assets.1.name |  | Simple + Expert | deux achats libres |
| text | compare-price-0 | assets.1.price | Ça coûte, d’après ce que tu imagines ($) | field=assets.1.price number min=0 max=1000000000000 |  | Simple + Expert | deux achats libres |
| select | f-assets-1-utility | assets.1.utility | Mon envie, de 1 à 5 (facultatif) | field=assets.1.utility |  | Simple + Expert | deux achats libres |
| text | compare-usage-0 | assets.1.usage.perSession | Il me coûte à chaque partie ($) | field=assets.1.usage.perSession number min=0 max=1000000000000 |  | Simple + Expert | deux achats libres |
| select | compare-assets-1-incomeMode | assets.1.incomeMode | Est-ce que cet achat me fait gagner de l’argent ? | field=assets.1.incomeMode |  | Simple + Expert (E) | deux achats libres |
| text | compare-boost-0 | assets.1.boostHourly | Il me fait gagner en plus ($ par heure) | field=assets.1.boostHourly number min=0 max=1000000000000 |  | Simple + Expert (E) (masqué par un réglage) | deux achats libres |
| button |  |  | Rétablir cette valeur | bDefault=assets.1.boostHourly bDefaultValue=0 |  | Simple + Expert (E) (masqué par un réglage) | deux achats libres |
| select | compare-cap-0-terrain | assets.1.capabilities.terrain | Il va (si tu le sais) | field=assets.1.capabilities.terrain |  | Simple + Expert (opt) | deux achats libres |
| text | compare-cap-0-seats | assets.1.capabilities.seats | Places, toi compris (si tu le sais) | field=assets.1.capabilities.seats number integer min=0 max=100 |  | Simple + Expert (opt) | deux achats libres |
| button |  |  | Retirer | bCompareRemove=free-<id> |  | Simple + Expert | deux achats libres |
| text | compare-name-1 | assets.2.name | Nom de cet achat | field=assets.2.name |  | Simple + Expert | deux achats libres |
| text | compare-price-1 | assets.2.price | Ça coûte, d’après ce que tu imagines ($) | field=assets.2.price number min=0 max=1000000000000 |  | Simple + Expert | deux achats libres |
| select | f-assets-2-utility | assets.2.utility | Mon envie, de 1 à 5 (facultatif) | field=assets.2.utility |  | Simple + Expert | deux achats libres |
| text | compare-usage-1 | assets.2.usage.perSession | Il me coûte à chaque partie ($) | field=assets.2.usage.perSession number min=0 max=1000000000000 |  | Simple + Expert | deux achats libres |
| select | compare-assets-2-incomeMode | assets.2.incomeMode | Est-ce que cet achat me fait gagner de l’argent ? | field=assets.2.incomeMode |  | Simple + Expert (E) | deux achats libres |
| text | compare-boost-1 | assets.2.boostHourly | Il me fait gagner en plus ($ par heure) | field=assets.2.boostHourly number min=0 max=1000000000000 |  | Simple + Expert (E) (masqué par un réglage) | deux achats libres |
| button |  |  | Rétablir cette valeur | bDefault=assets.2.boostHourly bDefaultValue=0 |  | Simple + Expert (E) (masqué par un réglage) | deux achats libres |
| select | compare-cap-1-terrain | assets.2.capabilities.terrain | Il va (si tu le sais) | field=assets.2.capabilities.terrain |  | Simple + Expert (opt) | deux achats libres |
| text | compare-cap-1-seats | assets.2.capabilities.seats | Places, toi compris (si tu le sais) | field=assets.2.capabilities.seats number integer min=0 max=100 |  | Simple + Expert (opt) | deux achats libres |
| button |  |  | Ce qui compte dans ce calcul | foldHead=compare-assumptions | expanded=false controls=fold-compare-assumptions | Simple + Expert | deux achats libres |
| button |  |  | Modifier | bFocus=compare-capital |  | Simple + Expert | deux achats libres |
| button |  |  | Modifier | bFocus=compare-reserve |  | Simple + Expert | deux achats libres |

## Mon business plan (`plan`)

**Étapes du pas à pas** : 1. Quel est ton but ? · 2. Où en es-tu ? · 3. Comment tu gagnes ton argent ? · 4. Avant ton but · 5. Ce qui compte pour toi  
**Pas à pas** : Question 1 sur 4 : Quel est ton but ?

**Sorties** : plan-results (réponse, chiffres, point bas, état, prochaine partie) ; plan-report (programme, plans de secours, suivi du réel, point de départ, stratégie, échéance, détails Expert, variantes) ; expert-plan ; calc-live

**Zones repérées dans le panneau** : plan-results, plan-report, expert-plan ; annonces : plan-prereq-search-feedback, plan-log-feedback, plan-search-feedback

**Liens sortants (Expert)** : aucun

| kind | id | field | label | data | aria | mode | réglage |
|---|---|---|---|---|---|---|---|
| button |  |  | Reprendre mes chiffres de Mes calculs | bPlanImportCalcs |  | Simple + Expert | somme, gain par heure, achat, missions, achat d’avant, déblocage |
| select | f-plan-goal-kind | plan.goal.kind | Mon but | field=plan.goal.kind |  | Simple + Expert | somme, gain par heure, achat, missions, achat d’avant, déblocage |
| text | plan-target | plan.goal.target | Je veux avoir ($) | field=plan.goal.target number min=0 max=1000000000000 |  | Simple + Expert | somme, gain par heure |
| select | f-plan-goal-meaning | plan.goal.meaning | « Avoir », pour moi, c’est | field=plan.goal.meaning |  | Simple + Expert | somme, gain par heure |
| text | plan-capital | plan.situation.capital | J’ai déjà ($) | field=plan.situation.capital number min=0 max=1000000000000 |  | Simple + Expert | somme, gain par heure, achat, missions, achat d’avant, déblocage |
| text | plan-reserve | plan.situation.reserve | Argent que je garde de côté ($) | field=plan.situation.reserve number min=0 max=1000000000000 |  | Simple + Expert | somme, gain par heure, achat, missions, achat d’avant, déblocage |
| text | plan-daily | plan.situation.dailyMinutes | Une partie dure (minutes) | field=plan.situation.dailyMinutes number min max=1440 |  | Simple + Expert | somme, gain par heure, achat, missions, achat d’avant, déblocage |
| text | plan-days | plan.situation.daysPerWeek | Je joue combien de jours par semaine ? | field=plan.situation.daysPerWeek number integer min max=7 |  | Simple + Expert | somme, gain par heure, achat, missions, achat d’avant, déblocage |
| text | plan-players | plan.situation.players | Nous jouons à (joueurs) | field=plan.situation.players number integer min max=100 |  | Simple + Expert | somme, gain par heure, achat, missions, achat d’avant, déblocage |
| select | f-plan-source | plan.source | Je gagne mon argent | field=plan.source |  | Simple + Expert | somme, gain par heure, achat, missions, achat d’avant, déblocage |
| text | plan-hourly | plan.situation.hourly | Je gagne à peu près ($ par heure de jeu) | field=plan.situation.hourly number min=0 max=1000000000000 |  | Simple + Expert | somme, gain par heure, déblocage |
| search | plan-prereq-search |  | Ajouter un achat d’avant (cherche dans le site) | bCombo=plan-prereq | expanded=false controls=plan-prereq-search-list | Simple + Expert | somme, gain par heure, achat, missions, achat d’avant, déblocage |
| button |  |  | Ajouter un achat libre | bPlanPAdd |  | Simple + Expert | somme, gain par heure, achat, missions, achat d’avant, déblocage |
| select | f-plan-strategy | plan.strategy | Dans quel ordre les acheter ? | field=plan.strategy |  | Simple + Expert | somme, gain par heure, achat, missions, achat d’avant, déblocage |
| text | plan-upkeep | plan.situation.upkeepPerSession | Je dépense par partie ($) : consommables, munitions… | field=plan.situation.upkeepPerSession number min=0 max=1000000000000 |  | Simple + Expert | somme, gain par heure, achat, missions, achat d’avant, déblocage |
| select | f-plan-priority | plan.priority | Je préfère | field=plan.priority |  | Simple + Expert | somme, gain par heure, achat, missions, achat d’avant, déblocage |
| text | plan-deadline | plan.deadlineDays | Je veux y arriver en (jours, si tu veux) | field=plan.deadlineDays number integer min max=36500 |  | Simple + Expert | somme, gain par heure, achat, missions, achat d’avant, déblocage |
| text | plan-max-repeat | plan.maxRepeat | Même mission à la suite, au maximum | field=plan.maxRepeat number integer min max=256 |  | Simple + Expert (E) | somme, gain par heure, achat, missions, achat d’avant, déblocage |
| button |  |  | Rétablir cette valeur | bDefault=plan.maxRepeat bDefaultValue=100 |  | Simple + Expert (E) | somme, gain par heure, achat, missions, achat d’avant, déblocage |
| button |  |  | Voir ma réponse ↓ | showAnswer |  | Simple + Expert | somme, gain par heure, achat, missions, achat d’avant, déblocage |
| button |  |  | Après avoir joué, écrire ce que j’ai vraiment | bFocus=plan-actual |  | Simple + Expert | somme, gain par heure |
| checkbox |  |  | Afficher plus de détails (partie par partie, et si, courbe, calendrier) | bPlanDetails |  | Expert | somme, gain par heure |
| button |  |  | Modifier | bFocus=plan-capital |  | Simple + Expert | somme, gain par heure |
| button |  |  | Modifier | bFocus=plan-reserve |  | Simple + Expert | somme, gain par heure |
| button |  |  | Tout déplier | bFoldAll=open |  | Simple + Expert | somme, gain par heure |
| button |  |  | Tout replier | bFoldAll=close |  | Simple + Expert | somme, gain par heure |
| button |  |  | Ton programme, dans l’ordre | foldHead=plan-program | expanded=true controls=fold-plan-program | Simple + Expert | somme, gain par heure |
| button |  |  | Si ça ne se passe pas comme prévu | foldHead=plan-alternatives | expanded=true controls=fold-plan-alternatives | Simple + Expert | somme, gain par heure |
| button |  |  | Après avoir joué : où en es-tu vraiment ? | foldHead=plan-actual | expanded=true controls=fold-plan-actual | Simple + Expert | somme, gain par heure |
| text | plan-actual |  | J’ai maintenant ($) | number min=0 max=1000000000000 |  | Simple + Expert | somme, gain par heure |
| text | plan-actual-minutes |  | J’ai joué (minutes) | number min=0 max=100000 |  | Simple + Expert | somme, gain par heure |
| text | plan-actual-note |  | Une note, si tu veux |  |  | Simple + Expert | somme, gain par heure |
| button |  |  | Mettre à jour mon plan | bPlanLog |  | Simple + Expert | somme, gain par heure |
| button |  |  | Ton point de départ | foldHead=plan-start | expanded=true controls=fold-plan-start | Simple + Expert | somme, gain par heure |
| button |  |  | Modifier | bFocus=plan-daily |  | Simple + Expert | somme, gain par heure |
| button |  |  | Modifier | bFocus=plan-upkeep |  | Simple + Expert | somme, gain par heure |
| button |  |  | Modifier | bFocus=plan-hourly |  | Simple + Expert | somme, gain par heure |
| button |  |  | Modifier | bFocus=plan-target |  | Simple + Expert | somme, gain par heure |
| button |  |  | Modifier | bFocus=plan-prereq-search |  | Simple + Expert | somme, gain par heure |
| button |  |  | Partie par partie | foldHead=plan-sessions | expanded=true controls=fold-plan-sessions | Expert | somme, gain par heure |
| button |  |  | Et si… ? | foldHead=plan-variants | expanded=true controls=fold-plan-variants | Expert | somme, gain par heure |
| button |  |  | Ce qui change tout | foldHead=plan-thresholds | expanded=true controls=fold-plan-thresholds | Expert | somme, gain par heure |
| button |  |  | Ton argent au fil du plan | foldHead=plan-curve | expanded=true controls=fold-plan-curve | Expert | somme, gain par heure |
| button |  |  | Ton calendrier | foldHead=plan-calendar | expanded=true controls=fold-plan-calendar | Expert | somme, gain par heure |
| button |  |  | Comment est-ce calculé ? | foldHead=plan-method | expanded=true controls=fold-plan-method | Expert | somme, gain par heure |
| button |  |  | Mes variantes du plan | foldHead=plan-saved | expanded=true controls=fold-plan-saved | Simple + Expert | somme, gain par heure |
| button |  |  | Garder ce plan comme variante | bPlanVsave |  | Simple + Expert | somme, gain par heure |
| button |  |  | Préparer ma prochaine partie | open=session |  | Simple + Expert | somme, gain par heure |
| button |  |  | Vérifier ce qu’un achat rapporte | open=roi |  | Simple + Expert | somme, gain par heure |
| button |  |  | Comparer des achats | open=compare |  | Simple + Expert | somme, gain par heure |
| button |  |  | Enregistrer mon plan (avec sa fiche) | bSave=plan |  | Simple + Expert | somme, gain par heure, achat, missions, achat d’avant, déblocage |
| button |  |  | Imprimer mon plan | bPrint |  | Simple + Expert | somme, gain par heure, achat, missions, achat d’avant, déblocage |
| button |  |  | Télécharger mon plan en texte (à lire ou à envoyer) | bPlanExport |  | Simple + Expert | somme, gain par heure, achat, missions, achat d’avant, déblocage |
| button |  |  | Les chiffres utilisés | foldHead=plan-x-inputs | expanded=true controls=fold-plan-x-inputs | Expert (E) | somme, gain par heure |
| button |  |  | Tous les chiffres du calcul | foldHead=plan-x-raw | expanded=true controls=fold-plan-x-raw | Expert (E) | somme, gain par heure |
| button |  |  | Et si le chiffre bouge de 20 % ? | foldHead=plan-sensitivity | expanded=true controls=fold-plan-sensitivity | Expert (E) | somme, gain par heure |
| search | plan-search |  | Je veux acheter (cherche dans le site) | bCombo=plan | expanded=false controls=plan-search-list | Simple + Expert | achat, missions, achat d’avant |
| button |  |  | Écrire un achat libre | bPlanFree |  | Simple + Expert | achat, missions, achat d’avant |
| text | plan-name | plan.goal.name | Nom de mon achat | field=plan.goal.name |  | Simple + Expert | achat, missions, achat d’avant |
| text | plan-price | plan.goal.price | Ça coûte, d’après ce que tu imagines ($) | field=plan.goal.price number min=0 max=1000000000000 |  | Simple + Expert | achat, missions, achat d’avant |
| text | plan-boost | plan.goal.boostHourly | Une fois acheté, il me fera gagner en plus ($ par heure) | field=plan.goal.boostHourly number min=0 max=1000000000000 |  | Simple + Expert | achat, missions, achat d’avant |
| text | plan-m-0-name | plan.missions.0.name | Nom de la mission | field=plan.missions.0.name |  | Simple + Expert | achat, missions, achat d’avant |
| text | plan-m-0-reward | plan.missions.0.reward | Récompense ($) | field=plan.missions.0.reward number min=0 max=1000000000000 |  | Simple + Expert | achat, missions, achat d’avant |
| text | plan-m-0-duration | plan.missions.0.duration | Durée (min) | field=plan.missions.0.duration number min max=1000000 |  | Simple + Expert | achat, missions, achat d’avant |
| text | plan-m-0-cost | plan.missions.0.cost | Frais à chaque fois ($) | field=plan.missions.0.cost number min=0 max=1000000000000 |  | Simple + Expert | achat, missions, achat d’avant |
| text | plan-m-0-prep | plan.missions.0.prep | Préparation (min) | field=plan.missions.0.prep number min=0 max=1000000 |  | Simple + Expert | achat, missions, achat d’avant |
| text | plan-m-0-cooldown | plan.missions.0.cooldown | Attente avant de recommencer (min) | field=plan.missions.0.cooldown number min=0 max=1000000 |  | Simple + Expert | achat, missions, achat d’avant |
| text | plan-m-0-share | plan.missions.0.share | Ma part (%) | field=plan.missions.0.share number min=0 max=100 |  | Simple + Expert | achat, missions, achat d’avant |
| text | plan-m-0-players | plan.missions.0.players | Se joue à (joueurs) | field=plan.missions.0.players number integer min max=100 |  | Simple + Expert | achat, missions, achat d’avant |
| text | plan-m-0-investment | plan.missions.0.investment | À acheter une seule fois avant de commencer ($) | field=plan.missions.0.investment number min=0 max=1000000000000 |  | Simple + Expert | achat, missions, achat d’avant |
| checkbox |  |  | J’ai déjà payé ce qu’il faut pour commencer | bPlanMOwned=0 |  | Simple + Expert | achat, missions, achat d’avant |
| checkbox |  |  | Mission à faire une seule fois (elle débloque la suite) | bPlanMOnce=0 |  | Simple + Expert | achat, missions, achat d’avant |
| checkbox |  |  | Mon achat d’avant | bPlanMReq=0¦p-<id> |  | Simple + Expert | achat, missions, achat d’avant |
| button |  |  | Retirer cette mission | bPlanMRemove=0 |  | Simple + Expert | achat, missions, achat d’avant |
| button |  |  | Ajouter une mission | bPlanMAdd |  | Simple + Expert | achat, missions, achat d’avant |
| select | plan-m-source |  | Ou reprendre une mission déjà écrite |  |  | Simple + Expert | achat, missions, achat d’avant |
| button |  |  | Ajouter cette mission | bPlanMImport |  | Simple + Expert | achat, missions, achat d’avant |
| text | plan-p-0-name | plan.prerequisites.0.name | Nom | field=plan.prerequisites.0.name |  | Simple + Expert | achat, missions, achat d’avant |
| text | plan-p-0-price | plan.prerequisites.0.price | Prix, d’après ce que tu imagines ($) | field=plan.prerequisites.0.price number min=0 max=1000000000000 |  | Simple + Expert | achat, missions, achat d’avant |
| text | plan-p-0-boost | plan.prerequisites.0.boostHourly | Il me fera gagner en plus ($ par heure) | field=plan.prerequisites.0.boostHourly number min=0 max=1000000000000 |  | Simple + Expert | achat, missions, achat d’avant |
| text | plan-p-0-minutes | plan.prerequisites.0.minutes | Temps pour l’obtenir (min) | field=plan.prerequisites.0.minutes number min=0 max=1000000 |  | Simple + Expert | achat, missions, achat d’avant |
| text | plan-p-0-usage | plan.prerequisites.0.usagePerSession | Ce qu’il coûte à chaque partie ($) | field=plan.prerequisites.0.usagePerSession number min=0 max=1000000000000 |  | Simple + Expert | achat, missions, achat d’avant |
| radio |  |  | Prévu | bPlanPState=0 |  | Simple + Expert | achat, missions, achat d’avant |
| radio |  |  | Commencé (pas encore à moi) | bPlanPState=0 |  | Simple + Expert | achat, missions, achat d’avant |
| radio |  |  | Déjà à moi | bPlanPState=0 |  | Simple + Expert | achat, missions, achat d’avant |
| checkbox |  |  | Indispensable : aucune façon de faire ne le retire du plan | bPlanPLock=p-<id> |  | Simple + Expert | achat, missions, achat d’avant |
| button |  |  | Monter Mon achat d’avant | bPlanPUp=0 |  | Simple + Expert | achat, missions, achat d’avant |
| button |  |  | Descendre Mon achat d’avant | bPlanPDown=0 |  | Simple + Expert | achat, missions, achat d’avant |
| button |  |  | Retirer | bPlanPRemove=0 |  | Simple + Expert | achat, missions, achat d’avant |
| button |  |  | Aller à la case à corriger | bFocus=plan-price |  | Simple + Expert | achat, missions, achat d’avant |
| button |  |  | Écrire le prix de « Mon achat d’avant » | bFocus=plan-p-0-price |  | Simple + Expert | achat, missions, achat d’avant |
| text | plan-name | plan.goal.name | Ce que je veux débloquer | field=plan.goal.name |  | Simple + Expert | déblocage |
| text | plan-units-label | plan.goal.unitLabel | Ça se gagne en | field=plan.goal.unitLabel |  | Simple + Expert | déblocage |
| text | plan-units-target | plan.goal.targetUnits | Il faut atteindre (points) | field=plan.goal.targetUnits number min=0 max=1000000000000 |  | Simple + Expert | déblocage |
| text | plan-units-current | plan.goal.currentUnits | J’en ai déjà (points) | field=plan.goal.currentUnits number min=0 max=1000000000000 |  | Simple + Expert | déblocage |
| text | plan-also-price | plan.goal.alsoPrice | Et il coûte aussi, une fois débloqué ($) | field=plan.goal.alsoPrice number min=0 max=1000000000000 |  | Simple + Expert | déblocage |
| text | plan-units-hourly | plan.situation.unitsHourly | Je gagne à peu près (points par heure) | field=plan.situation.unitsHourly number min=0 max=1000000000000 |  | Simple + Expert | déblocage |
| button |  |  | Aller à la case à corriger | bFocus=plan-units-target |  | Simple + Expert | déblocage |
| button |  |  | Voir en mode Expert | bMode=advanced |  | Simple seulement | somme, gain par heure |

## Erreurs JavaScript au relevé

Aucune.
