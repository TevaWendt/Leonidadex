'use strict';
/* v7.49 (lot 2) : les huit calculs et le business plan utilisent vraiment les nouveaux critères.
   Références numériques écrites à la main (indépendantes des fonctions testées). Tous les cas sont fictifs :
   ils vérifient un modèle de simulation, pas une mécanique de GTA VI. */
const test = require('node:test'), assert = require('node:assert/strict'), path = require('node:path');
const root = path.resolve(__dirname, '../..');
const E = require(path.join(root, 'calculateurs-engine.js')), B = require(path.join(root, 'calculateurs-scenario.js')), L = require(path.join(root, 'calculateurs-modele.js'));
const P = [
  { id: 'scenario-a', name: 'A', reward: 25000, cost: 2500, duration: 12, prep: 3, cooldown: 5, share: 100, investment: 0, players: 1 },
  { id: 'scenario-b', name: 'B', reward: 120000, cost: 10000, duration: 40, prep: 10, cooldown: 10, share: 100, investment: 0, players: 1 },
  { id: 'scenario-c', name: 'C', reward: 90000, cost: 15000, duration: 45, prep: 15, cooldown: 0, share: 100, investment: 500000, players: 1 }
];
const initial = B.initial('v749', P);
const fresh = () => B.copy(initial);
const asset = (key, name, price, extra = {}) => ({ ...B.copy(B.assetTemplate), key, name, price, ...extra });
const TOOLS = ['goal', 'purchase', 'session', 'budget', 'order', 'roi', 'activities', 'compare', 'plan'];
// Catalogue minimal : une voiture de route et un bateau (terrain déduit de la catégorie, prix inconnus).
const catalogue = [
  { id: 'supercar-x', type: 'vehicle', name: 'Supercar X', category: 'supercar', price: null, purchasable: null, fieldMeta: { price: { status: 'unknown' } } },
  { id: 'bateau-y', type: 'vehicle', name: 'Bateau Y', category: 'bateau', price: null, purchasable: null, fieldMeta: { price: { status: 'unknown' } } }
];

test('le cas « un million » de la demande : 7 répétitions, 240 min, point bas 25 000, solde 1 045 000', () => {
  const r = E.missionPlan({ capital: 100000, reserve: 20000, goalMeaning: 'held', target: 1000000,
    purchases: [{ id: 'v', name: 'Véhicule requis', price: 60000, minutes: 12 }, { id: 'w', name: 'Arme requise', price: 10000, minutes: 8 }],
    activities: [{ id: 'u', name: 'Déblocage', reward: 0, cost: 0, duration: 10, once: true }, { id: 'm', name: 'Mission répétable', reward: 150000, cost: 5000, duration: 30, requiresPurchaseIds: ['v', 'w'], requiresMissions: ['u'] }] });
  assert.equal(r.valid, true); assert.equal(r.reached, true);
  assert.equal(r.sessions[0].steps[0].runs, 7);
  assert.equal(r.totalMinutes, 240);
  assert.equal(r.finalCash, 1045000);
  assert.equal(r.lowPoint.cash, 25000);
  assert.equal(r.conserved, true);
  // Après 6 répétitions : 900 000 (30 000 + 6 × 145 000), encore sous le million.
  const six = r.events.filter(e => e.type === 'receive' && /Récompense/.test(e.label))[5];
  assert.equal(six.cash, 900000);
  assert.deepEqual(r.route.map(x => x.type), ['acquire', 'acquire', 'unlock', 'run']);
  // La mission de déblocage est faite une fois ; l’achat n’est jamais financé par la mission qui en a besoin.
  assert.equal(r.route.filter(x => x.type === 'unlock').length, 1);
  assert.ok(r.events.findIndex(e => /Véhicule/.test(e.label)) < r.events.findIndex(e => /Mission répétable/.test(e.label)));
});

test('le même plan passe par le scénario (business plan, sens « solde détenu ») sans perdre un coût ni une condition', () => {
  const s = fresh();
  s.plan.goal = { ...s.plan.goal, kind: 'amount', target: 1000000, meaning: 'held' };
  s.plan.situation = { ...s.plan.situation, capital: 100000, reserve: 20000, dailyMinutes: null };
  s.plan.source = 'missions';
  s.plan.prerequisites = [{ ...B.copy(B.planPrereqTemplate), id: 'p-1', name: 'Véhicule requis', price: 60000, minutes: 12 }, { ...B.copy(B.planPrereqTemplate), id: 'p-2', name: 'Arme requise', price: 10000, minutes: 8 }];
  s.plan.missions = [{ ...B.copy(B.planMissionTemplate), id: 'm-1', name: 'Déblocage', reward: 0, cost: 0, duration: 10, once: true }, { ...B.copy(B.planMissionTemplate), id: 'm-2', name: 'Mission répétable', reward: 150000, cost: 5000, duration: 30, requires: ['p-1', 'p-2'], requiresMissions: ['m-1'] }];
  const v = B.validate(s, initial), r = B.evaluate('plan', v, []);
  assert.equal(r.totalMinutes, 240); assert.equal(r.finalCash, 1045000); assert.equal(r.lowPoint.cash, 25000); assert.equal(r.days, null, 'pas de calendrier sans durée de partie');
  const x = B.analysis('plan', v, []);
  assert.deepEqual(x.explain.unaccounted, []); assert.ok(x.explain.used.includes('deblocage')); assert.ok(x.explain.used.includes('possession-requise'));
  assert.deepEqual(x.chain.order, ['p-1', 'p-2', 'm-1', 'm-2']);
  // Échéance en jours sans calendrier : dit honnêtement.
  assert.match(E.missionDeadline(r.input, 3).reason, /calendrier/);
});

test('sens du but : détenu, disponible après la réserve ou gains cumulés (Mon objectif et business plan)', () => {
  const s = fresh(); s.goal.reserve = 50000;
  const miss = m => { s.goal.meaning = m; return B.evaluate('goal', s, []).missing; };
  assert.equal(miss('held'), 800000);       // 1 000 000 − 200 000
  assert.equal(miss('available'), 850000);  // 1 000 000 − (200 000 − 50 000)
  assert.equal(miss('cumulative'), 1000000);
  const base = { capital: 200000, reserve: 50000, sessionMinutes: 60, hourly: 100000, target: 1000000 };
  assert.equal(E.missionPlan({ ...base, goalMeaning: 'available' }).totalSessions, 9); // 850 000 / 100 000 → 9 parties
  assert.equal(E.missionPlan({ ...base, goalMeaning: 'held' }).totalSessions, 8);      // 800 000 → 8
  assert.equal(E.missionPlan({ ...base, goalMeaning: 'cumulative' }).totalSessions, 10);
});

test('dépenses d’utilisation : elles baissent le gain net, la trésorerie et la vitesse (objectif, ordre, plan)', () => {
  const s = fresh();
  const t0 = B.evaluate('goal', s, []).totalMinutes;
  s.goal.upkeepPerSession = 20000; // 100 000/h − 20 000 par partie d’une heure = 80 000/h
  const r = B.evaluate('goal', s, []);
  assert.equal(r.hourly, 80000); assert.equal(r.totalMinutes, 600); assert.ok(r.totalMinutes > t0);
  // Ordre d’achats : un achat qui coûte 2 000/h à l’usage et rapporte 5 000/h → gain de 13 000/h ensuite (10 000 + 5 000 − 2 000).
  const o = E.order({ capital: 100000, hourly: 10000, items: [{ name: 'A', price: 50000, boostHourly: 5000, costHourly: 2000 }, { name: 'B', price: 100000 }] });
  assert.equal(o.steps[0].hourly, 13000); assert.ok(Math.abs(o.totalHours - 50000 / 13000) < 1e-9);
  // Plan : une dépense par partie allonge le parcours.
  const base = { capital: 200000, sessionMinutes: 60, hourly: 100000, target: 1000000 };
  const a = E.missionPlan(base), b = E.missionPlan({ ...base, upkeepPerSession: 30000 });
  assert.equal(a.totalSessions, 8); assert.equal(b.totalSessions, 12); // 800 000 / 70 000 → 12 parties
  assert.ok(b.finalCash - 200000 === 12 * 70000);
});

test('ajouter un coût sans avantage ne peut pas améliorer le gain net ; retirer une possession indispensable ne débloque rien', () => {
  const act = { reward: 100000, cost: 10000, duration: 20 };
  const base = E.activity(act).net, more = E.activity({ ...act, cost: 15000 }).net;
  assert.ok(more <= base);
  const plan = { capital: 50000, sessionMinutes: 60, target: 500000, activities: [{ id: 'm', name: 'Mission', reward: 100000, cost: 0, duration: 30, requiresPurchaseIds: ['v'] }], purchases: [{ id: 'v', name: 'Véhicule', price: 80000 }] };
  const without = E.missionPlan({ ...plan, capital: 50000 });
  assert.equal(without.valid, false); assert.match(without.reason, /demande d’abord un achat \(Véhicule\)/);
  const owned = E.missionPlan({ ...plan, purchases: [{ id: 'v', name: 'Véhicule', price: 80000, owned: true }] });
  assert.equal(owned.valid, true); assert.equal(owned.purchases[0].atSession, null, 'déjà possédé : pas refacturé');
  // Un véhicule qui n’est pas relié à la mission ne la débloque pas et ne la bloque pas : la relation doit être écrite.
  const unrelated = E.missionPlan({ ...plan, capital: 10000, activities: [{ ...plan.activities[0], requiresPurchaseIds: [] }] });
  assert.equal(unrelated.valid, true);
});

test('joueurs et part : la part s’applique une fois à la récompense, le nombre de joueurs ne redivise pas', () => {
  const two = E.activity({ reward: 100000, share: 50, cost: 5000, duration: 20, players: 2 });
  const four = E.activity({ reward: 100000, share: 50, cost: 5000, duration: 20, players: 4 });
  assert.equal(two.net, 45000); assert.equal(four.net, 45000);
  const s = fresh(); s.activities[0].players = 3; s.goal.players = 2; s.inverse.selected = 'scenario-a';
  assert.equal(B.evaluate('activities', s, []).valid, false);
  const x = B.analysis('activities', s, []);
  assert.match(x.rank.find(a => a.id === 'scenario-a').excluded.join(), /3 joueurs/);
});

test('Quel achat choisir ? : un véhicule très performant mais incompatible avec le besoin est exclu', () => {
  const s = fresh(); s.goal.capital = 2000000;
  s.assets = [asset('car', 'Supercar X', 400000, { itemId: 'supercar-x' }), asset('boat', 'Bateau Y', 600000, { itemId: 'bateau-y' })];
  s.purchase.key = 'car'; s.roi.key = 'car'; s.compare.keys = ['car', 'boat']; s.compare.criterion = 'cheapest';
  assert.equal(B.evaluate('compare', s, [], { catalogue }).best, 'Supercar X', 'sans besoin écrit, la moins chère');
  s.analysis.need.terrain = 'eau';
  const r = B.evaluate('compare', s, [], { catalogue });
  assert.equal(r.valid, false); assert.match(r.reason, /Une seule option convient.*Bateau Y/); assert.deepEqual(r.excludedByNeed, ['Supercar X']);
  const x = B.analysis('compare', s, [], { catalogue });
  assert.equal(x.excluded[0].name, 'Supercar X'); assert.equal(x.admissible[0].name, 'Bateau Y');
  assert.ok(x.explain.used.includes('usage-compatible')); assert.deepEqual(x.explain.unaccounted, []);
  // Tout-terrain : pour une voiture de route, rien n’est documenté → « on ne peut pas dire », jamais supposé.
  s.analysis.need.terrain = 'tout-terrain';
  assert.equal(B.analysis('compare', s, [], { catalogue }).rows.find(r2 => r2.key === 'car').admission.state, 'inconnu');
});

test('Quel achat choisir ? : A moins cher au départ, plus coûteux à l’usage (cas A/B) ; la réserve, l’horizon et la fréquence déplacent le choix', () => {
  const s = fresh(); s.goal.capital = 500000;
  s.assets = [asset('a', 'A', 100000, { usage: { perSession: 4000, perUse: null, uses: null } }), asset('b', 'B', 130000, { usage: { perSession: 1000, perUse: null, uses: null } })];
  s.purchase.key = 'a'; s.roi.key = 'a'; s.compare.keys = ['a', 'b']; s.compare.criterion = 'cheapestTotal';
  s.analysis.horizon.sessions = 5; let r = B.evaluate('compare', s, []);
  assert.equal(r.best, 'A'); assert.deepEqual(r.totals, { A: 120000, B: 135000 });
  s.analysis.horizon.sessions = 10; r = B.evaluate('compare', s, []);
  assert.equal(r.tie, true); assert.deepEqual(r.totals, { A: 140000, B: 140000 });
  s.analysis.horizon.sessions = 15; r = B.evaluate('compare', s, []);
  assert.equal(r.best, 'B'); assert.deepEqual(r.totals, { A: 160000, B: 145000 });
  const x = B.analysis('compare', s, []);
  assert.equal(x.crossover.n, 10); assert.equal(x.crossover.before, 'A'); assert.equal(x.crossover.after, 'B');
  // Sans horizon, pas de coût sur la durée : la réponse le dit.
  s.analysis.horizon.sessions = null; assert.equal(B.evaluate('compare', s, []).undecided, true);
  // Un meilleur coût à long terme ne rend pas un achat payable maintenant (trésorerie : 120 000 disponibles, B coûte 130 000).
  s.goal.capital = 120000; s.purchase.key = 'b';
  assert.equal(B.analysis('purchase', s, []).cash.state, 'short'); assert.equal(B.analysis('purchase', s, []).cash.shortfall, 10000);
  // Réordonner les candidats ne change pas le mérite.
  s.goal.capital = 500000; s.analysis.horizon.sessions = 15; s.compare.keys = ['b', 'a'];
  assert.equal(B.evaluate('compare', s, []).best, 'B');
  // v7.54 (audit) : la réserve et la fréquence sont vraiment variées ici, comme le titre le dit.
  // Réserve : 140 000 en poche, B à 130 000 est payable avec 0 de côté ; avec 30 000 gardés, il manque 20 000.
  s.goal.capital = 140000; s.goal.reserve = 0; s.purchase.key = 'b';
  assert.equal(B.analysis('purchase', s, []).cash.state, 'ok');
  s.goal.reserve = 30000; assert.equal(B.analysis('purchase', s, []).cash.state, 'short'); assert.equal(B.analysis('purchase', s, []).cash.shortfall, 20000);
  assert.equal(B.evaluate('compare', s, []).items.find(it => it.name === 'B').affordable, false);
  // Fréquence : le même horizon de 30 heures fait 30 parties d’une heure (B moins cher : 160 000 contre 145 000 déjà à 15)
  // ou 5 parties de six heures (A moins cher : 120 000 contre 135 000).
  s.goal.capital = 500000; s.goal.reserve = 0; s.analysis.horizon.sessions = null; s.analysis.horizon.hours = 30;
  s.goal.dailyMinutes = 60; assert.equal(B.evaluate('compare', s, []).best, 'B');
  s.goal.dailyMinutes = 360; r = B.evaluate('compare', s, []); assert.equal(r.best, 'A'); assert.deepEqual(r.totals, { A: 120000, B: 135000 });
});

test('un coût inconnu ne favorise pas une option : comparaison partielle, conclusion conditionnelle', () => {
  const s = fresh(); s.goal.capital = 500000;
  s.assets = [asset('a', 'A', 100000, { usage: { perSession: 4000, perUse: null, uses: null } }), asset('b', 'B', 130000)];
  s.purchase.key = 'a'; s.roi.key = 'a'; s.compare.keys = ['a', 'b']; s.compare.criterion = 'cheapestTotal'; s.analysis.horizon.sessions = 15;
  const r = B.evaluate('compare', s, []);
  // Revue v7.53 : B (achat libre) n’a pas de coût d’usage écrit alors que A en a un → « non renseigné », pas « sans objet » :
  // la comparaison sur la durée reste indécise au lieu de désigner B à tort (le prompt : non applicable ≠ non renseigné).
  assert.equal(r.best, null); assert.equal(r.undecided, true);
  assert.ok(B.analysis('compare', s, []).explain.missing.some(m => /« B »/.test(m.label)), 'la donnée manquante est nommée');
  // B seul (sans autre option qui a un coût d’usage) : le vide reste « sans objet ».
  const solo = fresh(); solo.assets = [asset('b', 'B', 130000)]; solo.purchase.key = 'b';
  assert.equal(B.analysis('purchase', solo, []).usage.source, 'na');
  // Écrire 0 lève le doute : B est alors le moins cher sur 15 parties (130 000 contre 160 000).
  s.assets[1] = asset('b', 'B', 130000, { usage: { perSession: 0, perUse: null, uses: null } });
  assert.equal(B.evaluate('compare', s, []).best, 'B');
  s.assets[1] = asset('b', 'B', null);
  const r2 = B.evaluate('compare', s, []);
  assert.equal(r2.best, null); assert.equal(r2.undecided, true); assert.match(r2.undecidedReason, /coût incomplet/);
  const x = B.analysis('compare', s, []);
  assert.ok(x.explain.missing.some(m => /« B »/.test(m.label)));
});

test('Mes achats : trésorerie avec frais obligatoires (50 000, 10 000 gardés, 40 000 + 5 000 → manque 5 000) ; déjà possédé non refacturé', () => {
  const s = fresh(); s.goal.capital = 50000; s.goal.reserve = 10000; s.assets[0].price = 40000; s.assets[0].fees = 5000; s.assets[0].extras = 0;
  const x = B.analysis('purchase', s, []);
  assert.equal(x.cash.state, 'short'); assert.equal(x.cash.shortfall, 5000); assert.equal(x.admission.state, 'impossible');
  assert.match(x.explain.drivers[0].text, /5\s000\s\$/); assert.deepEqual(x.explain.unaccounted, []);
  s.assets[0].owned = true;
  assert.equal(B.analysis('purchase', s, []).cash.owned, true);
});

test('Mes achats : payable maintenant mais pas soutenable dans la durée ; revente jamais sur l’argent à payer aujourd’hui', () => {
  const s = fresh(); s.goal.capital = 300000; s.goal.hourly = 60000; s.goal.dailyMinutes = 60;
  s.assets[0].price = 100000; s.assets[0].usage = { perSession: 80000, perUse: null, uses: null }; s.assets[0].resale = 40000;
  s.analysis.horizon.sessions = 5;
  const x = B.analysis('purchase', s, []);
  assert.equal(x.cash.state, 'ok'); assert.equal(x.sustain.state, 'insoutenable'); assert.equal(x.sustain.netPerSession, -20000);
  assert.equal(x.sustain.after, 300000 - 100000 - 5 * 20000);
  assert.equal(x.cost.total.value, 100000 + 5 * 80000); assert.equal(x.cost.payNow.value, 100000); assert.equal(x.cost.futureNet, 500000 - 40000);
  assert.ok(x.explain.used.includes('revente-prevue'));
});

test('une dépense de plaisir est analysée sans rentabilité fictive', () => {
  const s = fresh(); s.roi.mode = 'estimate'; s.assets[0].incomeMode = 'none';
  const x = B.analysis('roi', s, []), p = B.analysis('purchase', s, []);
  assert.ok(x.explain.excluded.some(e => e.id === 'gain-en-plus' && /aucune rentabilité/.test(e.why)));
  assert.equal(p.role, 'pleasure'); assert.ok(p.explain.excluded.some(e => e.id === 'gain-en-plus'));
  const r = B.evaluate('roi', s, []); assert.equal(r.roiPercent, undefined);
});

test('Quoi acheter d’abord ? : séquences comparées, dépendances respectées, autre séquence utile ; prix inconnu → parcours à compléter', () => {
  const s = fresh(); s.goal.capital = 100000; s.goal.hourly = 20000; s.goal.reserve = 0;
  s.assets = [asset('cher', 'Cher sans gain', 90000), asset('rentable', 'Rentable', 60000, { incomeMode: 'personal', boostHourly: 40000 }), asset('petit', 'Petit', 20000)];
  s.purchase.key = 'cher'; s.roi.key = 'cher'; s.order.keys = ['cher', 'rentable', 'petit'];
  const r = B.evaluate('order', s, []);
  // Référence : Rentable d’abord (60 000/h dès la première étape). Ensuite Petit puis Cher, ou Cher puis Petit : même total
  // (1 h 10 = 70 000 ÷ 60 000), l’ordre donné départage les égalités.
  assert.equal(r.order[0], 'rentable');
  assert.ok(Math.abs(r.totalHours - 70000 / 60000) < 1e-9);
  const given = E.order({ capital: 100000, hourly: 20000, items: [{ price: 90000 }, { price: 60000, boostHourly: 40000 }, { price: 20000 }] });
  assert.ok(r.totalHours < given.totalHours);
  // Dépendance : Petit demande Cher avant lui.
  s.assets[2].requires = ['cher'];
  const d = B.evaluate('order', s, []);
  assert.ok(d.order.indexOf('cher') < d.order.indexOf('petit'));
  const x = B.analysis('order', s, []);
  assert.equal(x.search.method, 'exhaustive'); assert.ok(x.explain.used.includes('possession-requise')); assert.deepEqual(x.explain.unaccounted, []);
  // Cycle : blocage expliqué.
  s.assets[0].requires = ['petit'];
  const c = B.analysis('order', s, []); assert.equal(c.valid, false); assert.match(c.reason, /circulaire/);
  // Prix inconnu : parcours à compléter, avec le nom.
  s.assets[0].requires = []; s.assets[2].requires = []; s.assets[1].price = null;
  const u = B.evaluate('order', s, []); assert.equal(u.valid, false); assert.equal(u.incomplete, true); assert.match(u.reason, /Rentable/);
  // Objectif « garder ton ordre » : exactement l’ancien calcul.
  s.assets[1].price = 60000; s.order.objective = 'given';
  assert.deepEqual(B.evaluate('order', s, []).order, ['cher', 'rentable', 'petit']);
});

test('Mon budget : prix inconnu → sous-total « au plus » ; flux sur N parties avec coûts d’usage et point bas', () => {
  const s = fresh(); s.goal.capital = 300000; s.goal.reserve = 50000; s.goal.hourly = 30000; s.goal.dailyMinutes = 60;
  s.assets = [asset('a', 'A', 100000, { usage: { perSession: 40000, perUse: null, uses: null } }), asset('b', 'B', null)];
  s.purchase.key = 'a'; s.roi.key = 'a'; s.order.keys = ['a', 'b']; s.budget.source = 'basket'; s.budget.extra = 0; s.analysis.horizon.sessions = 10;
  const r = B.evaluate('budget', s, []);
  assert.equal(r.valid, true); assert.equal(r.partial, true); assert.equal(r.available, 150000);
  const x = B.analysis('budget', s, []);
  assert.equal(x.spend.complete, false);
  // Flux : 300 000 − 100 000 = 200 000, puis chaque partie +30 000 − 40 000 = −10 000 → après 10 parties 100 000 ; sous 50 000 ? non (point bas 100 000).
  assert.equal(x.flow.ledger.final, 100000); assert.equal(x.flow.ledger.conserved, true); assert.equal(x.flow.ledger.reserveBreach, null);
  s.analysis.horizon.sessions = 20;
  const y = B.analysis('budget', s, []); assert.ok(y.flow.ledger.reserveBreach); assert.match(y.explain.drivers[0].text, /sous l’argent gardé de côté/);
});

test('Mes activités : classement des activités accessibles et scénario de tentatives ratées, sans probabilité inventée', () => {
  const s = fresh(); s.inverse.minutes = 60;
  const x = B.analysis('activities', s, []);
  assert.equal(x.best.id, 'scenario-b'); // B : 1 mission (50 min) = 110 000 ; A : 3 missions = 67 500
  assert.equal(x.rank.find(a => a.id === 'scenario-a').profit, 67500);
  s.analysis.simulations.echec = true; s.analysis.sim.echec.tentativesRatees = 2; s.inverse.minutes = 100; s.inverse.selected = 'scenario-a';
  const y = B.analysis('activities', s, []), a = y.rank.find(r => r.id === 'scenario-a');
  // A : 100 min → 5 missions ; 2 ratées sur 10 → 4 réussies : 4 × 25 000 − 5 × 2 500 = 87 500.
  assert.equal(a.runs, 5); assert.equal(a.fail.okRuns, 4); assert.equal(a.fail.profit, 87500);
  assert.ok(y.explain.used.includes('scenario-echec'));
});

test('munitions simulées : ajoutées aux frais de chaque tentative dans tous les outils, désactivées par défaut', () => {
  const s = fresh(); s.model = 'cycles'; s.goal.selected = 'scenario-a';
  const before = B.evaluate('goal', s, []).runs;
  s.analysis.simulations.munitions = true; s.analysis.sim.munitions.parTentative = 2500;
  const after = B.evaluate('goal', s, []).runs;
  // Gain net par mission : 22 500 → 20 000 ; il manque 800 000 → 36 puis 40 missions.
  assert.equal(before, 36); assert.equal(after, 40);
});

test('Mon objectif : échéance faisable ou non, avec le levier vérifié par recalcul', () => {
  const s = fresh(); s.goal.deadlineDays = 5; // 8 jours nécessaires à 60 min par jour
  const x = B.analysis('goal', s, []);
  assert.equal(x.deadline.feasible, false); assert.equal(x.deadline.days, 8);
  // 800 000 / 100 000 = 8 h ; en 5 jours → 96 min par jour (arrondi au quart d’heure : 105 min).
  assert.equal(x.deadline.requiredDailyMinutes, 105);
  assert.ok(x.explain.changes.some(c => /105 min/.test(c)));
});

test('les trois modes donnent les mêmes résultats et la même explication, y compris sans enregistrement', () => {
  for (const t of TOOLS) {
    const s = fresh(); s.tab = t;
    const out = ['quick', 'guided', 'advanced'].map(m => { const c = B.copy(s); c.views[t] = m; c.mode = m; return JSON.stringify([B.evaluate(t, c, []), B.analysis(t, c, []).explain]); });
    assert.equal(out[0], out[1], t); assert.equal(out[1], out[2], t);
  }
});

test('chaque outil explique tous ses critères : utilisés ou écartés avec une raison, jamais oubliés', () => {
  const s = fresh(); s.assets.push(asset('k2', 'Deux', 150000)); s.compare.keys = ['free-1', 'k2']; s.order.keys = ['free-1', 'k2'];
  for (const t of TOOLS) {
    const x = B.analysis(t, s, [], { catalogue: [] });
    assert.ok(!x.error, t + ' : ' + x.error);
    assert.deepEqual(x.explain.unaccounted, [], t);
    assert.ok(x.explain.aim, t); assert.ok(x.explain.excluded.every(e => e.why && e.why.length > 10), t);
  }
});

test('un relevé réel envoyé deux fois n’est compté qu’une fois ; un import répété non plus', () => {
  const id1 = B.planLogId({ prev: 100, cap: 200, mins: 60, runs: {}, bought: [], units: null, count: 0 });
  assert.equal(id1, B.planLogId({ prev: 100, cap: 200, mins: 60, runs: {}, bought: [], units: null, count: 0 }));
  assert.notEqual(id1, B.planLogId({ prev: 100, cap: 250, mins: 60, runs: {}, bought: [], units: null, count: 0 }));
  const s = fresh(); const e = { ...B.copy(B.planLogTemplate), id: id1, at: '2026-09-29', capital: 200, gain: 100, sessionMinutes: 60 };
  s.plan.log = [e, { ...e }];
  assert.equal(B.validate(s, initial).plan.log.length, 1);
});

test('conservation des flux : départ + recettes − dépenses = arrivée (plan en parties et en parcours)', () => {
  const sessions = E.missionPlan({ capital: 50000, reserve: 10000, sessionMinutes: 90, daysPerWeek: 5, goalPrice: 1000000, activities: [{ id: 'a', name: 'Courses', reward: 20000, cost: 2000, duration: 10 }, { id: 'b', name: 'Braquage', reward: 150000, cost: 20000, duration: 40, cooldown: 5, requiresPurchaseIds: ['g'] }], purchases: [{ id: 'g', name: 'Garage', price: 100000, boostHourly: 5000 }] });
  assert.equal(sessions.conserved, true); assert.equal(sessions.finalCash, 1254000); assert.ok(sessions.lowPoint.cash >= 10000);
  const flow = E.missionPlan({ capital: 50000, reserve: 0, target: 400000, activities: [{ id: 'a', name: 'A', reward: 30000, cost: 1000, duration: 10, cooldown: 20 }, { id: 'b', name: 'B', reward: 12000, cost: 0, duration: 5 }] });
  assert.equal(flow.conserved, true); assert.ok(flow.reached);
  // Pendant l’attente de A, B (moins rentable) occupe le temps : les deux sont utilisés.
  assert.ok(flow.sessions[0].steps.length === 2);
});

test('une incompatibilité ou une dépendance circulaire donne un blocage expliqué, sans boucle et sans plan « faisable » inventé', () => {
  const cyc = E.missionPlan({ capital: 1000000, target: 2000000, activities: [{ id: 'a', name: 'A', reward: 10000, duration: 10, requiresMissions: ['b'], once: true }, { id: 'b', name: 'B', reward: 10000, duration: 10, requiresMissions: ['a'] }] });
  assert.equal(cyc.valid, false);
  const s = fresh(); s.plan.source = 'missions'; s.plan.goal = { ...s.plan.goal, kind: 'amount', target: 2000000 }; s.plan.situation = { ...s.plan.situation, capital: 100000, dailyMinutes: 60 };
  s.plan.missions = [{ ...B.copy(B.planMissionTemplate), id: 'm-1', name: 'A', reward: 1000, duration: 10, once: true, requiresMissions: ['m-2'] }, { ...B.copy(B.planMissionTemplate), id: 'm-2', name: 'B', reward: 1000, duration: 10, requiresMissions: ['m-1'] }];
  const x = B.analysis('plan', B.validate(s, initial), []);
  assert.equal(x.chain.ok, false); assert.match(x.chain.reason, /circulaire/);
  assert.equal(x.result.valid, false);
});

test('mise à jour identifiable : les versions du modèle et des données sont gardées ; un prix du site changé est signalé', () => {
  const s = fresh(); assert.equal(s.modelVersion, 1); assert.equal(s.dataVersion, 'v749');
  s.assets = [asset('x', 'Supercar X', 300000, { itemId: 'supercar-x', referencePrice: 250000 })]; s.purchase.key = 'x'; s.roi.key = 'x';
  const w = B.referenceWarnings(s, [{ id: 'supercar-x', name: 'Supercar X', price: 280000 }]);
  assert.match(w[0], /prix du site a changé/);
});

test('plans de secours : un message d’impossibilité nomme les achats et les missions, jamais leurs identifiants', () => {
  const r = E.missionAlternatives({ capital: 100000, reserve: 20000, goalMeaning: 'held', target: 1000000,
    purchases: [{ id: 'v', name: 'Véhicule requis', price: 60000, minutes: 12 }, { id: 'w', name: 'Arme requise', price: 10000, minutes: 8 }],
    activities: [{ id: 'u', name: 'Déblocage', reward: 0, cost: 0, duration: 10, once: true }, { id: 'm', name: 'Mission répétable', reward: 150000, cost: 5000, duration: 30, requiresPurchaseIds: ['v', 'w'], requiresMissions: ['u'] }] });
  const byId = Object.fromEntries(r.plans.map(p => [p.id, p]));
  assert.match(byId['no-purchases'].reason, /Véhicule requis, Arme requise/);
  assert.match(byId['only-m'].reason, /la mission \(Déblocage\)/);
  assert.ok(r.plans.every(p => !/\((?:v|w|u)(?:,|\))/.test(p.reason || '')));
});
