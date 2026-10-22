#!/usr/bin/env node
'use strict';
/* v8.02 (calculateur, lots 1 et 2) : référence figée de la v8.01, pour prouver que les ajouts ne changent aucun résultat tant
   que leurs données manquent (lot 1) et que leurs réglages restent désactivés (lot 2). v8.03 : la référence couvre aussi tout ce
   que l’écran lit autour du résultat (section 6 : explications, sensibilité, hypothèses, entrées du moteur, plan).
   Rejoue, en Node pur (sans navigateur), tout ce que calculent les neuf outils et le moteur sur les exemples A, B et C du site
   (« Exemple A : missions courtes », « Exemple B : missions longues », « Exemple C : avec un achat de départ » de
   calculateurs-data.js), seuls et mélangés, dans les deux modèles (« petit à petit » et « par missions »), puis le business plan
   avec ces exemples en missions (parties et parcours, mission « une seule fois », mission déjà faite, achat d’avant, plans de
   secours, vérification indépendante). Les chiffres sont ceux des exemples : aucun n’est une donnée de GTA VI.
   Usage : node outils/tests/reference-v801.cjs --ecrire   (écrit outils/tests/fixtures/calculateur-v801-reference.json :
           à lancer UNE fois, sur le code de la v8.01, commit 21b210d4 « Leonidakit-v8.01-modifs-1-à-7 »)
           node outils/tests/reference-v801.cjs            (compare le code actuel à la référence ; code 1 au premier écart)
   Le test outils/tests/calculateurs-v802.test.cjs fait la même comparaison. */
const fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname, '../..');
const FILE = path.join(__dirname, 'fixtures/calculateur-v801-reference.json');

function compute() {
  const E = require(path.join(root, 'calculateurs-engine.js')), B = require(path.join(root, 'calculateurs-scenario.js'));
  const H = require('./check-ultime-helper.cjs');
  /* v8.04 (jour J) : le site lu sans ses données publiées, pour comparer le code à la v8.01 même après le jour J (check-ultime-helper.cjs) */
  const { D, catalogue, sourceActivities, presets } = H.siteData({ sansPublication: true });
  const initial = B.initial(H.dataVersion(D, catalogue, sourceActivities), presets);
  const out = {};
  /* JSON : les valeurs non sérialisables (fonctions) et l’ordre d’insertion des clés sont ceux du code ; une clé nouvelle dans un
     résultat est un écart (le lot 1 n’ajoute une clé que lorsque sa donnée existe). */
  const keep = (key, value) => { out[key] = JSON.parse(JSON.stringify(value === undefined ? null : value)); };
  const examples = ['scenario-a', 'scenario-b', 'scenario-c'];
  const ctx = { catalogue };
  /* 1. Les neuf outils, état de base de la page (exemples écrits), chaque exemple choisi, puis le mélange. */
  for (const model of ['continuous', 'cycles']) {
    for (const selected of [...examples, 'mixed']) {
      const s = H.baseState(B, initial, catalogue);
      s.model = model; s.goal.selected = selected; s.inverse.selected = selected === 'mixed' ? 'scenario-a' : selected;
      for (const tool of [...B.tools, 'plan']) keep('outil:' + tool + ':' + model + ':' + selected, B.evaluate(tool, s, sourceActivities, ctx));
    }
  }
  /* 2. L’état initial de la page, tel qu’un visiteur l’ouvre. */
  for (const tool of [...B.tools, 'plan']) keep('initial:' + tool, B.evaluate(tool, B.copy(initial), sourceActivities, ctx));
  /* 3. Le moteur sur chaque exemple : activité, objectif, temps donné, partie. */
  for (const id of examples) {
    const a = presets.find(x => x.id === id), ex = a.example;
    keep('moteur:activity:' + id, E.activity(a));
    keep('moteur:goal:' + id, E.goal({ capital: ex.capital, target: 1000000, dailyMinutes: ex.minutes, activity: a }));
    keep('moteur:inverse:' + id, E.inverse({ minutes: ex.minutes, activity: a, capital: ex.capital }));
    keep('moteur:goalContinuous:' + id, E.goalContinuous ? E.goalContinuous({ capital: ex.capital, target: 1000000, dailyMinutes: ex.minutes, activity: a }) : null);
  }
  keep('moteur:goalMixed', E.goalMixed({ capital: 600000, target: 2000000, dailyMinutes: 480, activities: presets }));
  keep('moteur:sessionPlan', E.sessionPlan({ capital: 600000, minutes: 480, activities: presets }));
  /* 4. Le business plan avec les exemples en missions : parties de 60, 90 et 480 minutes, parcours sans parties. */
  const missions = presets.map(a => ({ id: a.id, name: a.name, reward: a.reward, cost: a.cost, duration: a.duration, prep: a.prep, cooldown: a.cooldown, share: a.share, investment: a.investment, players: 1 }));
  const plans = {
    'un-exemple': { capital: 200000, target: 1000000, activities: [missions[0]] },
    'trois-exemples': { capital: 600000, target: 2000000, activities: missions },
    'achat-du-but': { capital: 200000, goalPrice: 900000, activities: missions.slice(0, 2) },
    'achat-d-avant': { capital: 200000, goalPrice: 900000, activities: [missions[0], { ...missions[1], requiresPurchaseIds: ['garage'] }], purchases: [{ id: 'garage', name: 'Garage', price: 80000 }] },
    'une-seule-fois': { capital: 200000, target: 1500000, activities: [{ ...missions[2], once: true }, { ...missions[0], requiresMissions: ['scenario-c'] }, missions[1]] },
    'deja-faite': { capital: 200000, target: 1500000, activities: [{ ...missions[2], once: true, done: true }, { ...missions[0], requiresMissions: ['scenario-c'] }] },
    'reserve': { capital: 300000, reserve: 50000, target: 1000000, activities: missions },
    'gain-par-heure': { capital: 100000, target: 500000, hourly: 50000, activities: [] },
    'points': { capital: 100000, targetUnits: 100, currentUnits: 0, goalPrice: 0, activities: missions.map((m, i) => ({ ...m, units: [5, 20, 10][i] })) }
  };
  for (const [name, p] of Object.entries(plans)) {
    for (const sessionMinutes of [60, 90, 480, null]) {
      const input = { daysPerWeek: 5, ...p, sessionMinutes };
      const r = E.missionPlan(input);
      keep('plan:' + name + ':' + sessionMinutes, r);
      keep('plan-verif:' + name + ':' + sessionMinutes, r.valid ? E.missionVerify(r) : null);
      keep('plan-secours:' + name + ':' + sessionMinutes, E.missionAlternatives({ ...input, journal: false }));
    }
  }
  /* 5. Le business plan de l’atelier (scénario) : missions copiées des exemples, achat d’avant, but d’achat. */
  {
    const s = H.planWithMissions(B, H.baseState(B, initial, catalogue));
    keep('atelier:plan', B.evaluate('plan', s, sourceActivities, ctx));
    keep('atelier:strategies', B.planStrategies(s));
    const s2 = B.copy(s); s2.plan.situation.dailyMinutes = null;
    keep('atelier:plan-parcours', B.evaluate('plan', s2, sourceActivities, ctx));
  }
  /* 6. v8.03 (lot 2) : tout ce que l’écran lit en plus du résultat, outil par outil : « Ce qui compte dans ce calcul » (analysis, avec
     l’explication), « Et si mes chiffres changent ? » (sensitivity), « Et si autre chose change ? » (hypotheses), la mesure affichée
     (metric), les entrées préparées pour le moteur (gain net, ordre, budget, choix, plan) et, pour le business plan, les plans de
     secours, l’échéance, la courbe et la prochaine partie ; « Mon objectif si j’achète » et la projection de Mon temps de jeu.
     États : les quatre choix × deux modèles de la section 1, l’état initial, le plan de l’atelier (missions) et quatre états qui
     allument des réglages EXISTANTS (dépenses par partie, échéance, dépense prévue, tentatives ratées, munitions, plan en points,
     plan avec dépenses) : avec les réglages du lot 2 éteints, rien de tout cela ne doit bouger. */
  {
    const states = {};
    for (const model of ['continuous', 'cycles']) for (const selected of [...examples, 'mixed']) {
      const s = H.baseState(B, initial, catalogue); s.model = model; s.goal.selected = selected; s.inverse.selected = selected === 'mixed' ? 'scenario-a' : selected;
      states[model + ':' + selected] = s;
    }
    states.initial = B.copy(initial);
    states.atelier = H.planWithMissions(B, H.baseState(B, initial, catalogue));
    {
      const s = H.baseState(B, initial, catalogue);
      s.goal.upkeepPerSession = 5000; s.goal.deadlineDays = 20; s.goal.plannedSpend = 50000;
      s.plan.situation.upkeepPerSession = 3000; s.plan.deadlineDays = 30;
      states.depenses = s;
      const c = B.copy(s); c.model = 'cycles'; states['depenses-cycles'] = c;
    }
    {
      const s = H.baseState(B, initial, catalogue); s.model = 'cycles';
      s.analysis.simulations.echec = true; s.analysis.sim.echec.tentativesRatees = 3;
      s.analysis.simulations.munitions = true; s.analysis.sim.munitions.parTentative = 500;
      s.analysis.simulations.carburant = true; s.analysis.sim.carburant = { distance: 20, consommation: 8, prixUnitaire: 2 };
      states['echec-munitions'] = s;
      const p = H.planWithMissions(B, B.copy(s)); p.plan.situation.upkeepPerSession = 1000; states['echec-plan'] = p;
    }
    {
      const s = H.planWithMissions(B, H.baseState(B, initial, catalogue));
      s.plan.goal = { ...s.plan.goal, kind: 'unlock', name: 'Rang', unitLabel: 'points', targetUnits: 50, currentUnits: 0, alsoPrice: 0 };
      s.plan.missions = s.plan.missions.map((m, i) => ({ ...m, units: [3, 10][i] }));
      states['plan-points'] = s;
    }
    for (const [name, s0] of Object.entries(states)) {
      const s = B.copy(s0);
      for (const tool of [...B.tools, 'plan']) {
        keep('analyse:' + tool + ':' + name, B.analysis(tool, B.copy(s), sourceActivities, ctx));
        keep('sensibilite:' + tool + ':' + name, B.sensitivity(tool, B.copy(s), sourceActivities));
        keep('hypotheses:' + tool + ':' + name, B.hypotheses(tool, B.copy(s), tool === 'plan' ? [] : sourceActivities, ctx));
        keep('mesure:' + tool + ':' + name, B.metric(tool, s));
      }
      keep('entrees:' + name, { hourlyNet: B.hourlyNet(s), orderInput: B.orderInput(s, sourceActivities), budgetInput: B.budgetInput(s), chooseInput: B.chooseInput(s, sourceActivities), planInput: B.planInput(s), planMissing: B.planMissing(s), goalTarget: B.goalTarget(s), activities: B.activities(s, sourceActivities), eligible: B.eligible(s, sourceActivities) });
      const r = B.evaluate('plan', B.copy(s), sourceActivities, ctx);
      keep('plan-secours-ecran:' + name, B.planAlternatives(B.copy(s), r));
      keep('plan-echeance:' + name, B.planDeadline(s, r));
      keep('plan-courbe:' + name, B.planCurve(r));
      keep('plan-prochaine:' + name, B.planNextSession(r));
      keep('objectif-si-achat:' + name, B.goalPurchase(B.copy(s), sourceActivities, ctx));
      const se = B.session(B.copy(s), sourceActivities);
      keep('projection:' + name, B.projection(B.copy(s), sourceActivities, se));
    }
  }
  return out;
}

function compare(ref, now) {
  const diffs = [];
  for (const key of new Set([...Object.keys(ref), ...Object.keys(now)])) {
    const a = JSON.stringify(ref[key]), b = JSON.stringify(now[key]);
    if (a !== b) {
      let i = 0; while (i < a.length && a[i] === b[i]) i++;
      diffs.push({ key, at: i, ref: a === undefined ? 'absent' : a.slice(Math.max(0, i - 80), i + 120), now: b === undefined ? 'absent' : b.slice(Math.max(0, i - 80), i + 120) });
    }
  }
  return diffs;
}

module.exports = { compute, compare, FILE };

if (require.main === module) {
  const now = compute();
  if (process.argv.includes('--ecrire')) {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify({ note: 'Référence v8.01 (commit 21b210d4) : résultats des neuf outils, du moteur et du business plan sur les exemples A, B et C, et (v8.03) tout ce que l’écran en lit : analyses et explications, sensibilité, hypothèses, mesures, entrées du moteur, plans de secours, échéance, courbe, projection. Écrite par node outils/tests/reference-v801.cjs --ecrire sur le CODE de la v8.01 ; ne pas éditer à la main.', results: now }) + '\n');
    console.log('Référence écrite : ' + Object.keys(now).length + ' résultats.');
  } else {
    const ref = JSON.parse(fs.readFileSync(FILE, 'utf8')).results, diffs = compare(ref, now);
    console.log(Object.keys(ref).length + ' résultats de référence, ' + diffs.length + ' écart(s).');
    for (const d of diffs.slice(0, 10)) console.log('- ' + d.key + '\n  référence : …' + d.ref + '…\n  maintenant : …' + d.now + '…');
    process.exitCode = diffs.length ? 1 : 0;
  }
}
