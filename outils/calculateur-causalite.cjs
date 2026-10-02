#!/usr/bin/env node
'use strict';
/* Check ultime du calculateur (v7.59) — CALC-02 / CALC-03 : matrice de causalité entrées × sorties, vérifiée par variation réelle.
   Pour chaque outil (et ses variantes de réglage), chaque entrée est vraiment changée dans la page (jsdom), puis toutes les
   zones de sortie de TOUS les outils sont relues : ce qui a changé, ce qui n'a pas changé, le sens du chiffre principal
   (évalué avec le moteur sur l'état enregistré), la présence de ce chiffre à l'écran, et l'accord des cases partagées
   (chaque case qui écrit le même chemin montre la même valeur). L'attendu est écrit ici, formule à l'appui ; un écart
   entre attendu et observé est un défaut (ou une attente à corriger, documentée).
   Écrit outils/CALCULATEUR-CAUSALITE.md ; code de sortie 1 si une attente stricte est violée.
   Usage : NODE_PATH=<dépendances>/node_modules node outils/calculateur-causalite.cjs [--json <fichier>] */
const fs=require('node:fs'),path=require('node:path');
const H=require('./tests/check-ultime-helper.cjs'),root=H.root,{load}=require('./tests/runtime-helper.cjs');
const B=require(path.join(root,'calculateurs-scenario.js'));
const {D,catalogue,sourceActivities,presets}=H.siteData(),DV=H.dataVersion(D,catalogue,sourceActivities),initial=B.initial(DV,presets);
const nf=new Intl.NumberFormat('fr-FR',{maximumFractionDigits:2});
const hours=n=>{if(!Number.isFinite(n))return '—';const m=Math.ceil(n*60-1e-8);return m<60?m+' min':Math.floor(m/60)+' h'+(m%60?' '+String(m%60).padStart(2,'0'):'');};
const money=n=>Number.isFinite(n)?nf.format(n)+' $':'—';
function resultValue(t,r,s){if(t==='plan')return null;const [key,,unit]=B.metric(t,s);if(!r||!r.valid||!Number.isFinite(r[key]))return null;return H.flat(unit==='$'?money(r[key]):unit==='h'?hours(r[key]):hours(r[key]/60));}
const TOOLS=['goal','purchase','session','budget','order','roi','activities','compare','plan'];
const GROUPS=['goal','purchase','catalogue','session','budget','order','roi','activities','compare','plan'];
/* ---- Attendu. change : zones qui DOIVENT changer ; same : zones qui ne doivent PAS changer ; dir : sens du chiffre
   principal de l'outil (+1 monte, −1 baisse, 0 identique) ; f : formule / fonction du moteur. Les zones non citées
   sont observées sans contrainte (« libre »). ---- */
const OTHERS_SHARED_MONEY=['purchase','session','budget','order','roi','compare'];
const E={
 goal:{
  base:[
   {id:'f-goal-capital',num:300000,change:['goal',...OTHERS_SHARED_MONEY,'activities'],same:['plan','catalogue'],dir:-1,f:'goalContinuous : manque = cible − (capital − réserve) ; plus de capital → moins de temps. Partagé : Mes achats, Mon temps de jeu, Mon budget, Quoi acheter d’abord ?, Ça vaut le coup ?, Mes activités, Quel achat choisir ?. Jamais le plan.'},
   {id:'f-goal-target',num:2000000,change:['goal','purchase','session','order'],same:['plan','catalogue','budget','compare','activities'],dir:+1,f:'goalContinuous : cible plus haute → manque et temps plus grands ; Mes achats (objectif si j’achète), Mon temps de jeu (avancement), Quoi acheter d’abord ? (reste à gagner)'},
   {sel:'#panel-goal [data-target="5000000"]',click:true,change:['goal','purchase','session','order'],same:['plan','catalogue','budget','compare','activities'],dir:+1,f:'puce = la case « Je veux avoir » (5 M $)'},
   {id:'lk-goal-range',range:900,change:['goal'],same:['plan','catalogue'],dir:+1,f:'réglette logarithmique → f-goal-target (toVal) → mêmes effets que la case'},
   {id:'f-goal-meaning',select:'held',change:['goal'],same:['plan','catalogue','purchase','session','budget','order','roi','activities','compare'],dir:-1,f:'goalTarget : « en tout » retire la réserve de la cible (cible − réserve) → moins à gagner'},
   {id:'f-model',select:'cycles',change:['goal'],same:['plan','catalogue','purchase','budget','order','compare','activities'],f:'E.goal (missions entières) remplace goalContinuous ; Mon temps de jeu et Ça vaut le coup ? ne dépendent pas de ce choix'},
   {id:'f-goal-hourly',num:150000,change:['goal','purchase','order','roi','compare','budget'],same:['plan','catalogue','session','activities'],dir:-1,f:'goalContinuous : temps = manque ÷ gain par heure ; partagé avec Mes achats (temps pour regagner), Quoi acheter d’abord ? (attentes), Ça vaut le coup ? (situation « sans »), Quel achat choisir ? (délai), Mon budget (dans la durée)'},
   {sel:'lk-help',help:[30000,15],change:['goal','purchase','order','roi','compare','budget'],same:['plan','catalogue','session','activities'],f:'aide « je ne sais pas combien je gagne » : 30 000 $ ÷ 15 min × 60 = 120 000 $/h écrits dans f-goal-hourly, modèle « petit à petit »'},
   {id:'f-goal-dailyMinutes',num:120,change:['goal','compare','roi','budget','order'],same:['plan','catalogue','session','activities'],dir:0,f:'jours = temps ÷ temps par jour (arrondi au-dessus) : le temps de jeu ne change pas, le nombre de jours oui ; Quel achat choisir ? (jours d’attente), Ça vaut le coup ? (parties), Mon budget (gain par partie), Quoi acheter d’abord ? (parties avant le premier achat)'},
   {sel:'#panel-goal [data-daily="30"]',click:true,change:['goal','compare','roi','budget','order'],same:['plan','catalogue','session','activities'],dir:0,f:'puce = la case « Je joue chaque jour » (30 min)'},
   {id:'f-goal-reserve',num:50000,change:['goal',...OTHERS_SHARED_MONEY],same:['plan','catalogue'],dir:+1,f:'disponible = capital − réserve : plus de réserve → plus à gagner ; partagé par les huit calculs'},
   {id:'f-goal-plannedSpend',num:50000,change:['goal'],same:['plan','catalogue',...OTHERS_SHARED_MONEY,'activities'],dir:+1,f:'goalTarget : les achats prévus s’ajoutent à la cible'},
   {id:'f-goal-upkeepPerSession',num:1000,change:['goal'],same:['plan','catalogue',...OTHERS_SHARED_MONEY,'activities'],dir:+1,f:'gain utile = gain − dépenses × 60 ÷ minutes par jour → plus de temps'},
   {id:'f-goal-deadlineDays',num:5,change:['goal'],same:['plan','catalogue',...OTHERS_SHARED_MONEY,'activities'],dir:0,f:'échéance : seule la ligne « Échéance » et « Ce qui compte » changent, pas le temps'},
   {sel:'#panel-goal [data-b-default="goal.reserve"]',click:true,change:['goal',...OTHERS_SHARED_MONEY],same:['plan','catalogue'],dir:-1,f:'« Rétablir cette valeur » remet la réserve à 0 → moins à gagner'}
  ],
  cycles:[
   {id:'f-goal-selected',select:'scenario-b',change:['goal'],same:['plan','catalogue','purchase','session','budget','order','roi','compare','activities'],f:'E.goal avec l’exemple B (missions longues) : autre nombre de missions'},
   {id:'goal-activity-0-reward',num:50000,change:['goal','activities','session'],same:['plan','catalogue','purchase','budget','order','compare'],dir:-1,f:'activity : net = récompense × part ÷ 100 − frais ; plus de net → moins de missions ; l’exemple A sert aussi dans Mes activités et Mon temps de jeu'},
   {id:'goal-activity-0-duration',num:24,change:['goal','activities','session'],same:['plan','catalogue','purchase','budget','order','compare'],dir:+1,f:'temps actif = durée + préparation → plus de temps par mission'},
   {id:'goal-activity-0-cooldown',num:20,change:['goal','activities','session'],same:['plan','catalogue','purchase','budget','order','compare'],dir:+1,f:'cycle = actif + attente ; l’attente compte dans le temps en session'},
   {id:'goal-activity-0-share',num:50,change:['goal','activities','session'],same:['plan','catalogue','purchase','budget','order','compare'],dir:+1,f:'part de 50 % → net plus petit → plus de missions'},
   {id:'goal-activity-0-cost',num:10000,change:['goal','activities','session'],same:['plan','catalogue','purchase','budget','order','compare'],dir:+1,f:'frais plus hauts → net plus petit'},
   {id:'goal-activity-0-investment',num:50000,change:['goal','activities'],same:['plan','catalogue','purchase','budget','order','compare'],dir:+1,f:'achat de départ payé une fois : manque = cible − capital + achat'},
   {sel:'#goal-cycle-fields [data-b-prep-once="0"]',click:true,change:['goal','session'],same:['plan','catalogue','purchase','budget','order','compare'],dir:-1,f:'préparation une seule fois par partie → moins de temps (Mes activités : seulement si le nombre de missions dans l’heure change)'},
   {id:'f-goal-players',num:3,change:['goal','session','activities'],same:['plan','catalogue','purchase','budget','order','roi','compare'],dir:0,f:'3 joueurs : les exemples se jouent à 1, le temps ne change pas ; le nombre de joueurs est rappelé dans Mon objectif (conditions), Mon temps de jeu et Mes activités'}
  ]},
 purchase:{
  base:[
   {id:'f-purchase-price',num:150000,change:['purchase','roi'],same:['plan','catalogue','goal','session','budget','order','compare','activities'],dir:-1,f:'worth : il reste = (capital − réserve) − (prix + options + frais) ; l’achat libre est aussi celui de « Ça vaut le coup ? » (roi.key)'},
   {id:'purchase-name',text:'Mon jet-ski',change:['purchase','roi'],same:['plan','catalogue','goal','session','budget','order','compare','activities'],dir:0,f:'le nom de l’achat libre partagé'},
   {id:'f-assets-0-role',select:'comfort',change:['purchase'],same:['plan','catalogue','goal','session','budget','order','roi','compare','activities'],dir:0,f:'rôle « pour mon confort » : la ligne « achat plaisir » disparaît de l’explication, rien d’autre ne bouge'},
   {id:'f-purchase-capital',num:300000,change:['goal','purchase',...OTHERS_SHARED_MONEY.filter(x=>x!=='purchase'),'activities'],same:['plan','catalogue'],dir:+1,f:'même case que « J’ai déjà » de Mon objectif (goal.capital) : il reste plus'},
   {id:'f-purchase-reserve',num:50000,change:['goal','purchase',...OTHERS_SHARED_MONEY.filter(x=>x!=='purchase')],same:['plan','catalogue'],dir:-1,f:'goal.reserve partagée : il reste moins'},
   {id:'f-purchase-usage',num:500,change:['purchase'],same:['plan','catalogue','goal','session','budget','compare','activities'],dir:0,f:'coût d’usage par partie de l’achat libre : tenable dans la durée, coût complet ; la réponse « il te reste » ne bouge pas'},
   {id:'f-analysis-horizon',num:20,change:['purchase','compare','budget'],same:['plan','catalogue','goal','session','activities'],dir:0,f:'horizon en parties partagé par Mes achats, Quel achat choisir ? et Mon budget'},
   {id:'f-purchase-hourly',num:150000,change:['goal','purchase','order','roi','compare','budget'],same:['plan','catalogue','session','activities'],dir:0,f:'goal.hourly partagé : temps pour regagner le prix ; il reste ne change pas'},
   {id:'f-purchase-target',num:2000000,change:['goal','purchase','session','order'],same:['plan','catalogue','budget','compare','activities'],dir:0,f:'goal.target partagé : objectif si j’achète / si je n’achète pas'},
   {id:'f-purchase-extras',num:20000,change:['purchase','roi'],same:['plan','catalogue','goal','session','budget','order','compare','activities'],dir:-1,f:'prix total = prix + options + frais'},
   {id:'f-purchase-fees',num:10000,change:['purchase','roi'],same:['plan','catalogue','goal','session','budget','order','compare','activities'],dir:-1,f:'les frais obligatoires se paient avec le prix'},
   {id:'f-purchase-resale',num:30000,change:['purchase'],same:['plan','catalogue','goal','session','budget','order','compare','activities'],dir:0,f:'revente : baisse le coût futur, jamais l’argent à payer aujourd’hui'},
   {id:'f-assets-0-incomeMode',select:'personal',change:['purchase'],same:['plan','catalogue','goal','session','budget','activities'],dir:0,f:'« il me fait gagner » : affiche la case « en plus par heure » ; sans chiffre, rien ne bouge ailleurs'}
  ]},
 session:{
  base:[
   {id:'f-session-minutes',num:120,change:['session'],same:['plan','catalogue','goal','purchase','budget','order','roi','compare','activities'],dir:+1,f:'sessionPlan : plus de temps → plus de missions, plus de gain (jamais moins)'},
   {sel:'#panel-session [data-session-minutes="30"]',click:true,change:['session'],same:['plan','catalogue','goal','purchase','budget','order','roi','compare','activities'],dir:-1,f:'puce = la case « J’ai combien de temps ? »'},
   {sel:'#panel-session [data-session-activity="scenario-b"]',click:true,change:['session'],same:['plan','catalogue','goal','purchase','budget','order','roi','compare','activities'],f:'décocher une activité la retire du programme (eligible)'},
   {id:'f-session-maxRepeat',num:1,change:['session'],same:['plan','catalogue','goal','purchase','budget','order','roi','compare','activities'],f:'maxRepeat = même activité à la suite ; 1 force l’alternance'},
   {id:'f-session-daysPerWeek',num:7,change:['session'],same:['plan','catalogue','goal','purchase','budget','order','roi','compare','activities'],dir:0,f:'sessionProjection : jours = parties × 7 ÷ jours par semaine ; le gain de la partie ne change pas'},
   {id:'f-session-usualMinutes',num:120,change:['session'],same:['plan','catalogue','goal','purchase','budget','order','roi','compare','activities'],dir:0,f:'durée habituelle : parties suivantes (projection), pas celle de ce soir'},
   {id:'session-capital',num:300000,change:['goal','purchase','session','budget','order','roi','compare','activities'],same:['plan','catalogue'],dir:0,f:'goal.capital partagé : le gain de la partie ne dépend pas du capital (frais couverts), l’avancement oui'},
   {id:'session-reserve',num:50000,change:['goal','purchase','session','budget','order','roi','compare'],same:['plan','catalogue'],dir:0,f:'goal.reserve partagée'},
   {sel:'#panel-session [name="session-play-mode"][value="group"]',radio:true,change:['session','activities'],same:['plan','catalogue','goal','purchase','budget','order','compare'],dir:0,f:'« à plusieurs » met 2 joueurs (goal.players) : résumé et Mes activités (joueurs), programme identique (exemples solo)'},
   {id:'session-activity-0-reward',num:50000,change:['session','activities','goal'],same:['plan','catalogue','purchase','budget','order','compare'],dir:+1,f:'activité A partagée : récompense plus haute → plus de gain dans la partie'}
  ]},
 budget:{
  base:[
   {id:'budget-capital',num:300000,change:['budget','goal','purchase','session','order','roi','compare','activities'],same:['plan','catalogue'],dir:+1,f:'budget : il reste = capital − dépenses − réserve'},
   {id:'budget-reserve',num:50000,change:['budget','goal','purchase','session','order','roi','compare'],same:['plan','catalogue'],dir:-1,f:'réserve plus grande → il reste moins'},
   {id:'f-budget-source',select:'basket',change:['budget'],same:['plan','catalogue','goal','purchase','session','order','roi','compare','activities'],f:'dépenses = les achats du panier de Quoi acheter d’abord ? (250 000 + 400 000) au lieu de la répartition'},
   {id:'f-budget-allocations-0',num:100000,change:['budget'],same:['plan','catalogue','goal','purchase','session','order','roi','compare','activities'],dir:-1,f:'poste Véhicules plus haut → il reste moins'},
   {id:'f-budget-allocations-4',num:15000,change:['budget'],same:['plan','catalogue','goal','purchase','session','order','roi','compare','activities'],dir:-1,f:'poste Autres achats'},
   {id:'f-budget-extra',num:20000,change:['budget'],same:['plan','catalogue','goal','purchase','session','order','roi','compare','activities'],dir:-1,f:'autres dépenses prévues'},
   {id:'budget-sessions',num:20,change:['budget','purchase','compare'],same:['plan','catalogue','goal','session','order','roi','activities'],dir:0,f:'horizon partagé (analysis.horizon.sessions) : « dans la durée » ; il reste maintenant ne change pas'}
  ]},
 order:{
  base:[
   {id:'order-capital',num:300000,change:['order','goal','purchase','session','budget','roi','compare','activities'],same:['plan','catalogue'],dir:-1,f:'order : attente = (prix + réserve − capital) ÷ gain par heure ; plus de capital → moins de temps'},
   {id:'order-reserve',num:50000,change:['order','goal','purchase','session','budget','roi','compare'],same:['plan','catalogue'],dir:+1,f:'la réserve est gardée à chaque étape'},
   {id:'order-hourly',num:150000,change:['order','goal','purchase','budget','roi','compare'],same:['plan','catalogue','session','activities'],dir:-1,f:'plus de gain par heure → moins d’attente'},
   {id:'f-order-objective',select:'given',change:['order'],same:['plan','catalogue','goal','purchase','session','budget','roi','compare','activities'],f:'objectif « garder mon ordre » : plus de recherche, ton ordre tel quel'},
   {sel:'#panel-order [data-b-reverse]',click:true,change:['order'],same:['plan','catalogue','goal','purchase','session','roi','activities','budget'],f:'ordre inversé : l’ordre saisi change ; Mon budget (répartition manuelle) ne bouge pas'},
   {sel:'#panel-order [data-b-order-down]',click:true,change:['order'],same:['plan','catalogue','goal','purchase','session','roi','activities'],f:'↓ descend le premier achat'},
   {sel:'#panel-order [data-b-cheapest]',click:true,change:[],same:['plan','catalogue','goal','purchase','session','roi','activities'],f:'tri par prix croissant : déjà dans cet ordre → rien ne change'},
   {sel:'#panel-order [data-b-order-edit]',edit:'order-price-0',num:300000,change:['order','compare'],same:['plan','goal','purchase','session','roi','activities','catalogue','budget'],dir:+1,f:'prix personnel de l’achat partagé (asset) : l’attente s’allonge ; même achat dans Quel achat choisir ? ; les fiches comparées gardent le prix du site (inconnu) ; Mon budget (répartition manuelle) ne bouge pas'},
   {sel:'#panel-order [data-b-order-edit]',edit:'f-assets-1-boostHourly',num:20000,change:['order','compare'],same:['plan','catalogue','goal','purchase','session','roi','activities'],dir:-1,f:'gain en plus après l’achat : moins d’attente pour le suivant'},
   {sel:'#panel-order [data-b-order-edit]',editCheck:'[data-b-owned]',change:['order','compare'],same:['plan','catalogue','goal','purchase','session','roi','activities','budget'],dir:-1,f:'déjà possédé : prix 0, pas de gain en plus ; Quel achat choisir ? (prix 0) suit ; Mon budget (répartition manuelle) ne bouge pas'}
  ]},
 roi:{
  base:[
   {id:'f-roi-purchase',num:150000,change:['roi','purchase'],same:['plan','catalogue','goal','session','budget','order','compare','activities'],dir:-1,f:'investmentCompare : différence = gain net × heures − prix ; même achat libre que Mes achats'},
   {id:'roi-capital',num:300000,change:['roi','goal','purchase','session','budget','order','compare','activities'],same:['plan','catalogue'],dir:0,f:'goal.capital partagé : payable maintenant ; la différence avec/sans ne change pas'},
   {id:'roi-reserve',num:50000,change:['roi','goal','purchase','session','budget','order','compare'],same:['plan','catalogue'],dir:0,f:'goal.reserve partagée'},
   {id:'f-roi-mode',select:'estimate',change:['roi'],same:['plan','catalogue','goal','purchase','session','budget','order','compare','activities'],f:'achat plaisir : worth (il reste) au lieu du remboursement'},
   {id:'f-roi-revenueHourly',num:40000,change:['roi'],same:['plan','catalogue','goal','purchase','session','budget','order','compare','activities'],dir:+1,f:'gain en plus par heure → plus de différence'},
   {id:'f-roi-costHourly',num:5000,change:['roi'],same:['plan','catalogue','goal','purchase','session','budget','order','compare','activities'],dir:-1,f:'coût en plus par heure → moins de différence'},
   {id:'f-roi-hours',num:20,change:['roi'],same:['plan','catalogue','goal','purchase','session','budget','order','compare','activities'],dir:+1,f:'plus d’heures d’usage → plus de différence (gain net positif)'},
   {id:'f-roi-upgrades',num:20000,change:['roi','purchase'],same:['plan','catalogue','goal','session','budget','order','compare','activities'],dir:-1,f:'prix total = prix + améliorations + frais'},
   {id:'f-roi-fees',num:10000,change:['roi','purchase'],same:['plan','catalogue','goal','session','budget','order','compare','activities'],dir:-1,f:'frais au départ'},
   {id:'f-roi-usage',num:500,change:['roi','purchase'],same:['plan','catalogue','goal','session','budget','order','compare','activities'],dir:0,f:'coût d’usage par partie : converti par heure seulement quand « il me coûte en plus » vaut 0 (ici 2 000 $/h est écrit : le chiffre principal ne bouge pas, l’explication le montre)'},
   {id:'f-roi-resale',num:30000,change:['roi','purchase'],same:['plan','catalogue','goal','session','budget','order','compare','activities'],dir:0,f:'revente : coût futur seulement'},
   {sel:'#panel-roi [data-b-roi-alternative]',click:true,change:['roi'],same:['plan','catalogue','goal','purchase','session','budget','order','compare','activities'],dir:0,f:'deuxième achat comparé (achat libre) : tableau « Deux envies, un même budget »'}
  ],
  newActivity:[
   {sel:'#panel-roi [data-b-roi-activity="scenario-b"]',click:true,change:['roi'],same:['plan','catalogue','goal','purchase','session','budget','order','compare','activities'],f:'investmentActivities : une activité de plus dans la rotation liée à l’achat'},
   {id:'roi-players',num:3,change:['session','activities'],same:['plan','catalogue','goal','purchase','budget','order','compare'],dir:0,f:'3 joueurs (goal.players partagé) : l’exemple A se joue à 1, le remboursement ne change pas ; le nombre est rappelé dans Mon temps de jeu et Mes activités'},
   {id:'roi-activity-0-reward',num:50000,change:['roi','goal','activities','session'],same:['plan','catalogue','purchase','budget','order','compare'],dir:+1,f:'récompense de l’activité A (partagée) → remboursement plus vite, plus de gain'},
   {id:'f-roi-hours',num:20,change:['roi'],same:['plan','catalogue','goal','purchase','session','budget','order','compare','activities'],dir:-1,f:'gain EN PLUS de ce que tu gagnais déjà (100 000 $/h écrits) : l’activité A rapporte moins par heure que ton gain actuel, chaque heure de plus creuse l’écart (marginalNetProfit)'}
  ]},
 activities:{
  base:[
   {id:'f-inverse-selected',select:'scenario-b',change:['activities'],same:['plan','catalogue','goal','purchase','session','budget','order','roi','compare'],f:'inverse avec l’exemple B'},
   {id:'f-inverse-minutes',num:120,change:['activities'],same:['plan','catalogue','goal','purchase','session','budget','order','roi','compare'],dir:+1,f:'inverse : missions = 1 + (minutes − actif) ÷ cycle → plus de gain'},
   {sel:'#panel-activities [name="activity-play-mode"][value="group"]',radio:true,change:['activities','session'],same:['plan','catalogue','goal','purchase','budget','order','roi','compare'],dir:0,f:'« à plusieurs » = 2 joueurs (goal.players) : rien ne change au calcul (exemples solo), résumé des joueurs seulement'},
   {id:'activity-capital',num:300000,change:['goal','purchase','session','budget','order','roi','compare','activities'],same:['plan','catalogue'],dir:0,f:'goal.capital partagé : « tu auras à la fin » change, le gain non'},
   {id:'activity-reserve',num:50000,change:['goal','purchase','session','budget','order','roi','compare'],same:['plan','catalogue'],dir:0,f:'goal.reserve partagée : la réserve ne bloque pas les frais de l’exemple A'},
   {id:'f-activities-0-reward',num:50000,change:['activities','goal','session'],same:['plan','catalogue','purchase','budget','order','compare'],dir:+1,f:'activity : net plus grand ; l’exemple A est aussi la mission de Mon objectif et du programme de Mon temps de jeu (Ça vaut le coup ? en mode « chiffre par heure » ne s’en sert pas)'},
   {id:'f-activities-0-duration',num:24,change:['activities','goal','session'],same:['plan','catalogue','purchase','budget','order','compare'],dir:-1,f:'durée plus longue → moins de missions dans le temps'},
   {id:'f-activities-0-cost',num:10000,change:['activities','goal','session'],same:['plan','catalogue','purchase','budget','order','compare'],dir:-1,f:'frais plus hauts → net plus petit'},
   {id:'f-activities-0-prep',num:10,change:['activities','goal','session'],same:['plan','catalogue','purchase','budget','order','compare'],dir:-1,f:'préparation comptée dans le temps actif'},
   {id:'f-activities-0-cooldown',num:20,change:['activities','goal','session'],same:['plan','catalogue','purchase','budget','order','compare'],dir:-1,f:'attente plus longue → moins de missions'},
   {id:'f-activities-0-share',num:50,change:['activities','goal','session'],same:['plan','catalogue','purchase','budget','order','compare'],dir:-1,f:'part de 50 % → net divisé par deux'},
   {id:'f-activities-0-investment',num:50000,change:['activities','goal','session'],same:['plan','catalogue','purchase','budget','order','compare'],dir:-1,f:'achat de départ payé une fois : gain − achat'},
   {id:'f-activities-0-players',num:2,change:['activities','goal','session'],same:['plan','catalogue','purchase','budget','order','compare'],f:'l’exemple A demande 2 joueurs, tu joues seul : il est écarté (réponse « se joue à 2 joueurs »)'},
   {sel:'#panel-activities [data-owned="0"]',click:true,change:[],same:['plan','catalogue','purchase','budget','order','compare','goal','session','roi'],dir:0,f:'« je l’ai déjà acheté » : l’achat de départ de A vaut 0 → rien ne change (A n’en a pas)'},
   {id:'f-activities-0-name',text:'Mes courses',change:['activities','goal','session'],same:['plan','catalogue','purchase','budget','order','compare'],dir:0,f:'le nom de l’activité partagé'}
  ]},
 compare:{
  base:[
   {id:'compare-price-0',num:300000,change:['compare','order'],same:['plan','goal','purchase','session','roi','activities','catalogue','budget'],dir:+1,f:'choose : prix plus haut → plus de délai (bestWaitHours) ; achat partagé avec Quoi acheter d’abord ? ; Mon budget en répartition manuelle et les fiches comparées (prix du site) ne bougent pas'},
   {id:'f-assets-1-utility',select:'5',change:['compare'],same:['plan','catalogue','goal','purchase','session','budget','order','roi','activities'],dir:0,f:'envie : envie pour 100 000 $ = note ÷ prix × 100 000'},
   {id:'compare-usage-0',num:500,change:['compare','order'],same:['plan','catalogue','goal','purchase','session','roi','activities','budget'],dir:0,f:'coût d’usage par partie : coût sur la durée ; Quoi acheter d’abord ? (coût par heure) suit ; Mon budget en répartition manuelle ne s’en sert pas'},
   {id:'compare-capital',num:300000,change:['compare','goal','purchase','session','budget','order','roi','activities'],same:['plan','catalogue'],dir:-1,f:'goal.capital partagé : moins de délai'},
   {id:'compare-reserve',num:50000,change:['compare','goal','purchase','session','budget','order','roi'],same:['plan','catalogue'],dir:+1,f:'réserve plus grande → plus de délai'},
   {id:'compare-hourly',num:150000,change:['compare','goal','purchase','budget','order','roi'],same:['plan','catalogue','session','activities'],dir:-1,f:'goal.hourly partagé : moins de délai'},
   {id:'compare-daily',num:120,change:['compare','goal','roi','budget','order'],same:['plan','catalogue','session','activities'],dir:0,f:'goal.dailyMinutes partagé : jours d’attente (le délai en heures ne change pas)'},
   {id:'f-analysis-need-terrain',select:'eau',change:['compare','purchase'],same:['plan','catalogue','goal','session','budget','order','roi','activities'],f:'besoin « sur l’eau » partagé (analysis.need) : condition « terrain » dans Quel achat choisir ? et dans Mes achats (terrainFits)'},
   {id:'need-passengers',num:3,change:['compare','purchase'],same:['plan','catalogue','goal','session','budget','order','roi','activities'],f:'places demandées (besoin partagé) : condition « à confirmer » tant que les places sont inconnues, dans Quel achat choisir ? et Mes achats'},
   {id:'f-compare-criterion',select:'cheapest',change:['compare'],same:['plan','catalogue','goal','purchase','session','budget','order','roi','activities'],f:'critère « le moins cher à l’achat »'},
   {id:'compare-sessions',num:20,change:['compare','purchase','budget'],same:['plan','catalogue','goal','session','order','roi','activities'],dir:0,f:'horizon partagé (parties)'},
   {id:'compare-hours',num:20,change:['compare'],same:['plan','catalogue','goal','purchase','session','budget','order','roi','activities'],dir:0,f:'compare.hours : gain sur la durée des achats qui rapportent'}
  ]},
 plan:{
  base:[
   {id:'plan-target',num:800000,change:['plan'],same:['catalogue','goal','purchase','session','budget','order','roi','compare','activities'],dir:+1,f:'missionPlan (gain continu) : somme plus grande → plus de parties ; le plan n’écrit jamais dans les huit calculs'},
   {id:'f-plan-goal-meaning',select:'cumulative',change:['plan'],same:['catalogue','goal','purchase','session','budget','order','roi','compare','activities'],f:'« gagné à partir de maintenant » : ce que tu as ne compte plus'},
   {id:'plan-capital',num:200000,change:['plan'],same:['catalogue','goal','purchase','session','budget','order','roi','compare','activities'],dir:-1,f:'plan.situation.capital (propre au plan) : moins de parties'},
   {id:'plan-reserve',num:50000,change:['plan'],same:['catalogue','goal','purchase','session','budget','order','roi','compare','activities'],dir:+1,f:'réserve du plan : plus à réunir'},
   {id:'plan-daily',num:120,change:['plan'],same:['catalogue','goal','purchase','session','budget','order','roi','compare','activities'],dir:-1,f:'parties plus longues → moins de parties'},
   {id:'plan-days',num:7,change:['plan'],same:['catalogue','goal','purchase','session','budget','order','roi','compare','activities'],dir:0,f:'jours par semaine : les jours changent, pas les parties'},
   {id:'plan-players',num:3,change:[],same:['plan','catalogue','goal','purchase','session','budget','order','roi','compare','activities'],dir:0,f:'sans mission, le nombre de joueurs ne change rien'},
   {id:'plan-hourly',num:100000,change:['plan'],same:['catalogue','goal','purchase','session','budget','order','roi','compare','activities'],dir:-1,f:'gain par heure du plan : moins de parties'},
   {id:'plan-upkeep',num:1000,change:['plan'],same:['catalogue','goal','purchase','session','budget','order','roi','compare','activities'],dir:+1,f:'dépenses par partie : plus de parties'},
   {id:'f-plan-priority',select:'fast',change:[],same:['plan','catalogue','goal','purchase','session','budget','order','roi','compare','activities'],dir:0,f:'sans argent de côté, « le plus vite possible » n’a rien à changer : même plan, même texte'},
   {id:'plan-deadline',num:3,change:['plan'],same:['catalogue','goal','purchase','session','budget','order','roi','compare','activities'],dir:0,f:'échéance : section « Ton échéance », parties inchangées'},
   {id:'plan-max-repeat',num:1,change:[],same:['plan','catalogue','goal','purchase','session','budget','order','roi','compare','activities'],dir:0,f:'sans mission, « même mission à la suite » ne change rien'}
  ],
  missions:[
   {id:'plan-price',num:900000,change:['plan'],same:['catalogue','goal','purchase','session','budget','order','roi','compare','activities'],dir:+1,f:'prix du but plus haut → plus de parties'},
   {id:'plan-boost',num:20000,change:['plan'],same:['catalogue','goal','purchase','session','budget','order','roi','compare','activities'],dir:0,f:'ce que rapporte le but ensuite : remboursement affiché, parties inchangées'},
   {id:'plan-m-0-reward',num:50000,change:['plan'],same:['catalogue','goal','purchase','session','budget','order','roi','compare','activities'],dir:-1,f:'mission copiée (jamais liée) : récompense plus haute → moins de parties ; Mes activités ne bouge pas'},
   {id:'plan-m-0-duration',num:24,change:['plan'],same:['catalogue','goal','purchase','session','budget','order','roi','compare','activities'],f:'durée plus longue → moins de missions par partie'},
   {id:'plan-m-0-cost',num:10000,change:['plan'],same:['catalogue','goal','purchase','session','budget','order','roi','compare','activities'],f:'frais plus hauts'},
   {id:'plan-m-0-cooldown',num:80,change:['plan'],same:['catalogue','goal','purchase','session','budget','order','roi','compare','activities'],f:'attente de 80 min : « Courses » ne peut plus être refaite dans la même partie (avec 30 min, l’attente était couverte par « Braquage » : rien ne changeait, et c’est juste)'},
   {id:'plan-m-0-share',num:50,change:['plan'],same:['catalogue','goal','purchase','session','budget','order','roi','compare','activities'],f:'part de 50 %'},
   {id:'plan-m-0-players',num:3,change:['plan'],same:['catalogue','goal','purchase','session','budget','order','roi','compare','activities'],f:'mission à 3 joueurs, groupe de 1 : écartée du plan (et dit)'},
   {id:'plan-p-0-price',num:200000,change:['plan'],same:['catalogue','goal','purchase','session','budget','order','roi','compare','activities'],dir:+1,f:'achat d’avant plus cher → plus de parties'},
   {id:'plan-p-0-boost',num:30000,change:['plan'],same:['catalogue','goal','purchase','session','budget','order','roi','compare','activities'],dir:-1,f:'achat d’avant qui rapporte → moins de parties'},
   {id:'plan-p-0-minutes',num:60,change:['plan'],same:['catalogue','goal','purchase','session','budget','order','roi','compare','activities'],f:'temps pour obtenir l’achat : pris sur la partie suivante'},
   {id:'plan-p-0-usage',num:2000,change:['plan'],same:['catalogue','goal','purchase','session','budget','order','roi','compare','activities'],f:'coût par partie une fois possédé'},
   {sel:'#panel-plan [data-b-plan-p-state="0"][value="done"]',radio:true,change:['plan'],same:['catalogue','goal','purchase','session','budget','order','roi','compare','activities'],f:'« déjà à moi » : rien à payer, mission B débloquée'},
   {sel:'#panel-plan [data-b-plan-p-state="0"][value="started"]',radio:true,change:['plan'],same:['catalogue','goal','purchase','session','budget','order','roi','compare','activities'],dir:0,f:'« commencé » : visible, jamais compté (parties inchangées)'},
   {sel:'#panel-plan [data-b-plan-m-owned="0"]',click:true,change:[],same:['plan','catalogue','goal','purchase','session','budget','order','roi','compare','activities'],dir:0,f:'« déjà payé ce qu’il faut » sans achat de départ : rien ne change'},
   {sel:'#panel-plan [data-b-plan-m-once="0"]',click:true,change:['plan'],same:['catalogue','goal','purchase','session','budget','order','roi','compare','activities'],f:'mission faite une seule fois : elle sort de la répétition'},
   {sel:'#panel-plan [data-b-plan-p-lock]',click:true,change:['plan'],same:['catalogue','goal','purchase','session','budget','order','roi','compare','activities'],dir:0,f:'indispensable : aucune stratégie ne le retire (étiquette), parties inchangées'},
   {id:'f-plan-strategy',select:'direct',change:['plan'],same:['catalogue','goal','purchase','session','budget','order','roi','compare','activities'],f:'« directement vers mon but » retire l’achat d’avant (la mission B reste verrouillée)'},
   {id:'plan-upkeep',num:1000,change:['plan'],same:['catalogue','goal','purchase','session','budget','order','roi','compare','activities'],f:'dépenses par partie : moins de gain par partie'},
   {id:'plan-max-repeat',num:1,change:[],same:['plan','catalogue','goal','purchase','session','budget','order','roi','compare','activities'],f:'au plus une fois de suite : le programme alterne déjà (« Courses », « Braquage », « Courses ») → rien ne change ; l’effet se voit dans Mon temps de jeu (f-session-maxRepeat)'}
  ]}
};
/* Variantes d'état avant la mesure. */
const VARIANT_STATE={goal:{base:s=>s,cycles:s=>{s.model='cycles';s.goal.selected='scenario-a';return s;}},purchase:{base:s=>s},session:{base:s=>s},budget:{base:s=>s},order:{base:s=>s},
 roi:{base:s=>s,newActivity:s=>{s.roi.mode='new';s.roi.activityIds=['scenario-a'];return s;}},activities:{base:s=>s},compare:{base:s=>s},plan:{base:s=>s,missions:s=>H.planWithMissions(B,s)}};
function metricOf(tool,s){try{const r=B.evaluate(tool,s,sourceActivities,{catalogue});if(tool==='plan')return r.valid?(r.continuous?r.totalMinutes:r.totalSessions):null;const [key]=B.metric(tool,s);return r.valid&&Number.isFinite(r[key])?r[key]:null;}catch{return null;}}
async function measure(tool,variant,spec){
 let base=H.baseState(B,initial,catalogue);base=VARIANT_STATE[tool][variant](base);base.tab=tool;base.views[tool]='advanced';base.mode='advanced';base.dataVersion=DV;
 const p=await load(root,'calculateurs.html?tool='+tool+'&mode=expert',{storage:{'lk-calculator-v1':JSON.stringify(base)}});const d=p.d,w=p.w;
 const fire=(n,t)=>n.dispatchEvent(new w.Event(t,{bubbles:true,cancelable:true}));
 const row={tool,variant,input:spec.id||spec.sel,f:spec.f,errors:[]};
 try{
  if(spec.sel&&spec.edit!==undefined){fire(d.querySelector(spec.sel),'click');p.flush();}
  if(spec.sel&&spec.editCheck){fire(d.querySelector(spec.sel),'click');p.flush();}
  const before=H.readZones(d),m0=metricOf(tool,base);
  let target=null;
  if(spec.id){target=d.getElementById(spec.id);}else if(spec.edit!==undefined){target=d.getElementById(spec.edit);}else if(spec.editCheck){target=d.querySelector('#panel-order .b-order-editor:not([hidden]) '+spec.editCheck);}else if(spec.sel!=='lk-help'){target=d.querySelector(spec.sel);}
  if(spec.sel==='lk-help'){const r=d.getElementById('lk-help-reward'),m=d.getElementById('lk-help-minutes');r.value=String(spec.help[0]);fire(r,'input');m.value=String(spec.help[1]);fire(m,'input');p.flush();fire(d.getElementById('lk-help-apply'),'click');}
  else{if(!target)throw Error('entrée introuvable : '+(spec.id||spec.sel||spec.edit||spec.editCheck));row.label=(target.labels?.[0]?.textContent||target.getAttribute('aria-label')||target.textContent||'').replace(/\s+/g,' ').trim().slice(0,60);row.field=target.dataset.field||'';
   if(target.closest('[hidden]')&&!target.closest('.b-fold-body'))row.errors.push('entrée masquée au moment du relevé');
   if(spec.num!==undefined||spec.text!==undefined){row.before=target.value;target.value=String(spec.num!==undefined?spec.num:spec.text);fire(target,'input');}
   else if(spec.select!==undefined){row.before=target.value;target.value=spec.select;fire(target,'change');}
   else if(spec.range!==undefined){target.value=String(spec.range);fire(target,'input');}
   else if(spec.radio){target.checked=true;fire(target,'change');}
   else if(target.type==='checkbox'){row.before=String(target.checked);target.checked=!target.checked;fire(target,'change');}
   else fire(target,'click');}
  p.flush();
  const after=H.readZones(d);
  const raw=w.localStorage.getItem('lk-calculator-v1');row.saved=!!raw;const s1=raw?JSON.parse(raw):base;
  const m1=metricOf(tool,s1);row.metricBefore=m0;row.metricAfter=m1;
  row.changed=Object.keys(after).filter(k=>after[k]!==before[k]);
  const ownZone=after[tool]||'';const v=resultValue(tool,B.evaluate(tool,s1,sourceActivities,{catalogue}),s1);row.metricShown=v===null?null:(ownZone.includes(v)||(v==='0 min'&&/maintenant/.test(ownZone))||(v.startsWith('-')&&ownZone.includes(v.slice(1))));row.metricText=v;
  /* cases miroirs */
  const mirrors=H.mirrors(d);row.mirrorMismatch=Object.entries(mirrors).filter(([,list])=>new Set(list.map(x=>(x.value||'').replace(/[\s  ]/g,''))).size>1).map(([f,list])=>f+' : '+list.map(x=>x.id+'='+x.value).join(' / '));
  row.jsErrors=p.errors.slice();
 }catch(e){row.errors.push(e.message);}
 p.close();
 /* verdict */
 const changedSet=new Set(row.changed||[]);row.verdict=[];
 for(const g of spec.change||[])if(!changedSet.has(g))row.verdict.push('attendu « change » pour '+g+', inchangé');
 for(const g of spec.same||[])if(changedSet.has(g))row.verdict.push('attendu « ne change pas » pour '+g+', a changé');
 if(spec.dir!==undefined&&row.metricBefore!==null&&row.metricAfter!==null){const dm=row.metricAfter-row.metricBefore,sign=Math.abs(dm)<1e-9?0:dm>0?1:-1;if(sign!==spec.dir)row.verdict.push('sens attendu '+(spec.dir>0?'↑':spec.dir<0?'↓':'=')+', observé '+(sign>0?'↑':sign<0?'↓':'=')+' ('+row.metricBefore+' → '+row.metricAfter+')');}
 if(spec.dir!==undefined&&(row.metricBefore===null||row.metricAfter===null))row.verdict.push('chiffre principal non calculable ('+row.metricBefore+' → '+row.metricAfter+')');
 if(row.metricShown===false)row.verdict.push('le chiffre du moteur ('+row.metricText+') n’est pas à l’écran');
 if(row.mirrorMismatch&&row.mirrorMismatch.length)row.verdict.push('cases partagées en désaccord : '+row.mirrorMismatch.join(' ; '));
 if(row.jsErrors&&row.jsErrors.length)row.verdict.push('erreur JS : '+row.jsErrors.join(' | ').slice(0,200));
 if(row.errors.length)row.verdict.push(...row.errors);
 return row;}
async function main(){const rows=[];
 for(const tool of TOOLS)for(const [variant,specs] of Object.entries(E[tool])){for(const spec of specs){const row=await measure(tool,variant,spec);rows.push(row);process.stdout.write((row.verdict.length?'ÉCART ':'ok    ')+tool+'/'+variant+' '+row.input+(row.verdict.length?' — '+row.verdict.join(' ; '):'')+'\n');}}
 const ko=rows.filter(r=>r.verdict.length);
 const L=['# Matrice de causalité du calculateur (CALC-02 / CALC-03) — générée par outils/calculateur-causalite.cjs','','Chaque ligne : une entrée vraiment changée dans la page (jsdom, mode Expert, état de base « Check ultime » où tous les outils répondent), puis toutes les zones de sortie relues. **Attendu** = ce que la formule impose (change / ne change pas / sens du chiffre principal) ; **Observé** = zones dont le texte a changé ; **Sens** = chiffre principal de l’outil (B.metric) évalué par le moteur avant → après ; **À l’écran** = le chiffre du moteur apparaît tel quel dans la réponse ; **Miroirs** = toutes les cases qui écrivent le même chemin montrent la même valeur.','','Zones : goal (goal-results, goal-routes), purchase (purchase-selection, purchase-results), catalogue (catalogue-count, catalogue-results, vehicle-comparison), session (session-capital-summary, session-results, session-timeline), budget, order (order-capital-summary, order-items, order-results), roi (roi-selection, roi-links, roi-results), activities (inverse-results, activity-results), compare (compare-items, compare-results), plan (plan-results, plan-report) ; expert-<outil> et summary-<outil> (mode-summary) sont observés mais libres.','','Résultat : **'+(rows.length-ko.length)+' / '+rows.length+' lignes conformes**'+(ko.length?' ; '+ko.length+' écart(s) listé(s) en fin de fichier.':'.'),''];
 for(const tool of TOOLS){L.push('## '+B.names[tool]+' (`'+tool+'`)','');for(const variant of Object.keys(E[tool])){L.push('### Réglage : '+variant,'','| Entrée | Chemin | Action | Attendu change | Attendu ne change pas | Observé (zones changées) | Sens | À l’écran | Miroirs | Formule | Verdict |','|---|---|---|---|---|---|---|---|---|---|---|');
  for(const spec of E[tool][variant]){const r=rows.find(x=>x.tool===tool&&x.variant===variant&&x.input===(spec.id||spec.sel)&&!x._used);if(!r)continue;r._used=true;const action=spec.num!==undefined?'→ '+spec.num:spec.text!==undefined?'→ « '+spec.text+' »':spec.select!==undefined?'→ '+spec.select:spec.range!==undefined?'réglette → '+spec.range:spec.help?'aide '+spec.help.join(' $ / ')+' min':spec.radio?'coche':spec.editCheck?'Modifier → coche '+spec.editCheck:spec.edit?'Modifier → '+spec.edit+' = '+spec.num:'clic';
   const sens=r.metricBefore===null&&r.metricAfter===null?'—':(r.metricBefore===null?'∅':fmtMetric(tool,r.metricBefore))+' → '+(r.metricAfter===null?'∅':fmtMetric(tool,r.metricAfter))+(spec.dir!==undefined?' (attendu '+(spec.dir>0?'↑':spec.dir<0?'↓':'=')+')':'');
   L.push('| '+[(r.label||r.input)+(spec.id?' `'+spec.id+'`':''),r.field||'',action,(spec.change||[]).join(', ')||'—',(spec.same||[]).join(', ')||'—',(r.changed||[]).filter(g=>!/^(expert|summary)-/.test(g)&&g!=='live').join(', ')||'rien',sens,r.metricShown===null?'—':r.metricShown?'oui':'NON',r.mirrorMismatch&&r.mirrorMismatch.length?'DÉSACCORD':'ok',spec.f,r.verdict.length?'**ÉCART** : '+r.verdict.join(' ; '):'conforme'].map(x=>String(x).replace(/\|/g,'¦')).join(' | ')+' |');}
  L.push('');}}
 L.push('## Écarts','',ko.length?ko.map(r=>'- '+r.tool+'/'+r.variant+' `'+r.input+'` : '+r.verdict.join(' ; ')).join('\n'):'Aucun.','');
 fs.writeFileSync(path.join(root,'outils/CALCULATEUR-CAUSALITE.md'),L.join('\n'));
 const j=process.argv.indexOf('--json');if(j>0)fs.writeFileSync(process.argv[j+1],JSON.stringify(rows.map(({_used,...r})=>r),null,1));
 console.log('\n'+(rows.length-ko.length)+'/'+rows.length+' conformes ; écarts : '+ko.length);process.exit(ko.length?1:0);}
function fmtMetric(tool,v){if(tool==='plan')return String(v);const [,,unit]=B.metric(tool,H.baseState(B,initial,catalogue));return unit==='$'?money(v):unit==='h'?hours(v):hours(v/60);}
if(require.main===module)main().catch(e=>{console.error(e);process.exit(2);});
module.exports={E,measure};
