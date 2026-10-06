'use strict';
/* Calculateur, lot 1 (« Même interface, intelligence renforcée ») : la chaîne « Mon objectif si j’achète / si je n’achète pas »
   et son vérificateur de plan indépendant. Toutes les valeurs attendues sont calculées à la main dans les commentaires (jamais
   avec la fonction testée). Tous les montants sont FICTIFS : ils vérifient un modèle de simulation, pas une mécanique de GTA VI.
   Lettres A à N : scénarios de démonstration du cahier des charges du lot 1. */
const test = require('node:test'), assert = require('node:assert/strict'), path = require('node:path');
const root = path.resolve(__dirname, '../..');
const E = require(path.join(root, 'calculateurs-engine.js')), B = require(path.join(root, 'calculateurs-scenario.js'));
const { load } = require('./runtime-helper.cjs');
const near = (a, b, eps = 1e-6) => assert.ok(a !== null && Math.abs(a - b) <= eps * Math.max(1, Math.abs(b)), a + ' ≠ ' + b);
const P = [
  { id: 'scenario-a', name: 'A', reward: 50000, cost: 5000, duration: 20, prep: 0, cooldown: 0, share: 100, investment: 0, players: 1 },
  { id: 'scenario-b', name: 'B', reward: 120000, cost: 10000, duration: 40, prep: 10, cooldown: 10, share: 100, investment: 0, players: 1 },
  { id: 'scenario-c', name: 'C', reward: 90000, cost: 15000, duration: 45, prep: 15, cooldown: 0, share: 100, investment: 500000, players: 1 }
];
const initial = B.initial('lot1', P), fresh = () => B.copy(initial);
const continuous = (goal, asset = {}) => { const s = fresh(); s.model = 'continuous'; s.goal = { ...s.goal, reserve: 0, plannedSpend: null, upkeepPerSession: null, meaning: 'available', dailyMinutes: 60, ...goal }; Object.assign(s.assets[0], { price: 100000, extras: 0, fees: 0, incomeMode: 'none', boostHourly: 0, owned: false }, asset); return s; };

/* ---------- vérificateur de plan ---------- */
test('vérificateur : le journal du scénario M passe (équipement commun payé une fois, solvabilité avant chaque activité, 55 000 à la fin)', () => {
  // 50 000 − 40 000 − 5 000 + 30 000 − 5 000 + 25 000 = 55 000
  const events = [{ at: 0, kind: 'spend', amount: 40000, unlocks: 'equipement' },
    { at: 0, kind: 'act', until: 10 }, { at: 0, kind: 'spend', amount: 5000, needs: ['equipement'] }, { at: 10, kind: 'earn', amount: 30000 },
    { at: 10, kind: 'act', until: 20 }, { at: 10, kind: 'spend', amount: 5000, needs: ['equipement'] }, { at: 20, kind: 'earn', amount: 25000 }];
  const v = E.cashJournalVerify({ capital: 50000, reserve: 0, events, claim: { finalCash: 55000 } });
  assert.equal(v.valid, true); assert.equal(v.ok, true, JSON.stringify(v.violations)); assert.equal(v.finalCash, 55000);
  // 44 000 au départ : après l’équipement il reste 4 000, la première activité (5 000) n’est pas payable
  const poor = E.cashJournalVerify({ capital: 44000, reserve: 0, events });
  assert.equal(poor.ok, false); assert.equal(poor.violations[0].rule, 'R2'); assert.equal(poor.violations[0].index, 2);
});
test('vérificateur : rejette chaque plan corrompu (F, J, prérequis, achat payé deux fois, chevauchement, total faux, atteinte fausse)', () => {
  const rules = (capital, reserve, events, claim) => E.cashJournalVerify({ capital, reserve, events, claim }).violations.map(v => v.rule);
  // F : 40 000 à payer avant de toucher 100 000, avec 30 000 en poche
  assert.deepEqual(rules(30000, 0, [{ at: 0, kind: 'spend', amount: 40000 }, { at: 10, kind: 'earn', amount: 100000 }]), ['R2']);
  // J : 90 000 dont 10 000 gardés ; A (30 000) puis B (70 000) : il reste 60 000, B ferait descendre à −10 000 (manque 20 000)
  assert.deepEqual(rules(90000, 10000, [{ at: 0, kind: 'spend', amount: 30000, unlocks: 'A' }, { at: 0, kind: 'spend', amount: 70000, unlocks: 'B', needs: ['A'] }]), ['R2']);
  // revenu de l’achat encaissé avant de l’avoir payé
  assert.deepEqual(rules(500000, 0, [{ at: 5, kind: 'earn', amount: 10000, needs: ['achat'] }, { at: 6, kind: 'spend', amount: 100000, unlocks: 'achat' }]), ['R3']);
  assert.deepEqual(rules(500000, 0, [{ at: 0, kind: 'spend', amount: 100000, unlocks: 'X' }, { at: 1, kind: 'spend', amount: 100000, unlocks: 'X' }]), ['R4']);
  // B du cahier : une action de 40 min commencée à 0 et une autre à 30 : chevauchement
  assert.deepEqual(rules(0, 0, [{ at: 0, kind: 'act', until: 40 }, { at: 30, kind: 'act', until: 45 }]), ['R5']);
  assert.deepEqual(rules(1000, 0, [{ at: 0, kind: 'earn', amount: 500 }], { finalCash: 2000 }), ['R6']);
  // atteinte : 1 000 + 500 à 10 min = 1 500 ≥ 1 500 à la minute 10, pas à la minute 5
  assert.deepEqual(rules(1000, 0, [{ at: 10, kind: 'earn', amount: 500 }], { target: 1500, reachedAt: 5 }), ['R7']);
  assert.deepEqual(rules(1000, 0, [{ at: 10, kind: 'earn', amount: 500 }], { target: 1500, reachedAt: 10 }), []);
  assert.deepEqual(rules(0, 0, [{ at: 10, kind: 'earn', amount: 1 }, { at: 5, kind: 'earn', amount: 1 }]), ['R1']);
});
test('vérificateur : L (attente entre missions) — départs 0, 25, 50 ; paiements 10, 35, 60 ; 60 000 ; fin exacte à 60 comptée', () => {
  const ev = [0, 25, 50].flatMap(t => [{ at: t, kind: 'act', until: t + 10 }, { at: t + 10, kind: 'earn', amount: 20000 }]);
  const v = E.cashJournalVerify({ capital: 0, reserve: 0, events: ev, claim: { finalCash: 60000, target: 60000, reachedAt: 60 } });
  assert.equal(v.ok, true, JSON.stringify(v.violations)); assert.equal(v.reachedAt, 60);
});

/* ---------- moteur : « Mon objectif si j’achète », modèle continu ---------- */
const T = p => E.purchaseGoalTiming({ capital: 200000, reserve: 0, target: 1000000, hourly: 100000, price: 120000, extraHourly: 0, usageHourly: 0, ...p });
test('A : 200 000 → 1 000 000 à 100 000 $/h : 8 h ; en parties de 30 min : 16 parties, sans conversion en jours', () => {
  near(T({}).saveHours, 8);
  const s = continuous({ capital: 200000, target: 1000000, hourly: 100000, dailyMinutes: 30 }), r = B.goal(s, []);
  near(r.totalMinutes, 480); assert.equal(r.sessions, 16);
});
test('D : amélioration à 120 000 qui rapporte 30 000 $/h de plus : objectif en 7,0769 h au lieu de 8 h (920 000 ÷ 130 000), seuil 15 000 $/h', () => {
  const t = T({ extraHourly: 30000 });
  near(t.buyHours, 920000 / 130000); near(t.delayHours, 920000 / 130000 - 8); assert.equal(t.strategy, 'now'); assert.equal(t.optimal, true);
  // seuil : 920 000 ÷ (100 000 + x) = 8 → x = 15 000
  near(t.extraThreshold, 15000);
  const v = E.cashJournalVerify({ capital: 200000, reserve: 0, events: t.journal, claim: t.claim }); assert.equal(v.ok, true, JSON.stringify(v.violations));
});
test('E : gain en plus nul : l’objectif recule de 1,2 h (prix ÷ gain par heure) ; à 15 000 $/h de plus il ne recule plus, à 15 001 il avance', () => {
  near(T({ extraHourly: 0 }).delayHours, 1.2);
  near(T({ extraHourly: 15000 }).delayHours, 0, 1e-9);
  assert.ok(T({ extraHourly: 15001 }).delayHours < 0);
  assert.ok(T({ extraHourly: 14999 }).delayHours > 0);
});
test('G : gain en plus inconnu : compté 0 et signalé (extraKnown false), seuil de 15 000 $/h rendu, jamais un gain inventé', () => {
  const t = T({ extraHourly: null });
  assert.equal(t.extraKnown, false); near(t.buyHours, 9.2); near(t.extraThreshold, 15000);
});
test('coût d’usage plus fort que le gain en plus : acheter juste avant le but (9,2 h) plutôt que maintenant (920 000 ÷ 90 000 = 10,22 h)', () => {
  const t = T({ extraHourly: 10000, usageHourly: 20000 });
  assert.equal(t.strategy, 'late'); near(t.buyHours, 9.2);
});
test('pas assez d’argent maintenant : payable après 0,7 h, puis 1 000 000 ÷ 150 000 → 7,3667 h ; seuil 12 000 000 000 ÷ 880 000', () => {
  const t = T({ capital: 50000, extraHourly: 50000 });
  assert.equal(t.affordableNow, false); near(t.affordHours, 0.7); assert.equal(t.strategy, 'soon');
  near(t.buyHours, 0.7 + 1000000 / 150000); near(t.saveHours, 9.5); near(t.extraThreshold, 120000 * 100000 / 880000);
});
test('réserve : 300 000 dont 100 000 de côté, prix 250 000 : pas payable maintenant, payable après 30 min ; objectif 10,5 h au lieu de 8', () => {
  const t = T({ capital: 300000, reserve: 100000, price: 250000 });
  assert.equal(t.affordableNow, false); near(t.affordHours, 0.5); near(t.buyHours, 10.5); near(t.saveHours, 8);
});
test('objectif déjà atteint, gain nul, achat qui crée le revenu : cas limites', () => {
  const a = E.purchaseGoalTiming({ capital: 2000000, reserve: 0, target: 1000000, hourly: 100000, price: 500000, extraHourly: 0 });
  assert.equal(a.saveHours, 0); assert.equal(a.buyHours, 0); // il reste 1 500 000 ≥ 1 000 000
  near(E.purchaseGoalTiming({ capital: 2000000, reserve: 0, target: 1000000, hourly: 100000, price: 1500000, extraHourly: 0 }).buyHours, 5);
  // aucun gain sans l’achat ; l’achat (100 000) rapporte 20 000 $/h : (1 000 000 − 100 000) ÷ 20 000 = 45 h
  const c = E.purchaseGoalTiming({ capital: 200000, reserve: 0, target: 1000000, hourly: 0, price: 100000, extraHourly: 20000 });
  assert.equal(c.saveHours, null); near(c.buyHours, 45);
  // ni gain sans l’achat ni gain avec : impossible, sans chiffre inventé
  const d = E.purchaseGoalTiming({ capital: 200000, reserve: 0, target: 1000000, hourly: 0, price: 100000, extraHourly: 0 });
  assert.equal(d.buyHours, null); assert.equal(d.saveHours, null);
  assert.equal(E.purchaseGoalTiming({ capital: 100, reserve: 200, target: 1000, hourly: 10, price: 50 }).valid, false);
});
test('optimum garanti : sur une grille de 2 001 instants d’achat entre « au plus tôt » et « juste avant le but », aucun ne fait mieux que le moteur', () => {
  const cases = [{ extraHourly: 30000 }, { extraHourly: 10000, usageHourly: 20000 }, { capital: 50000, extraHourly: 50000 }, { capital: 50000, extraHourly: 5000, usageHourly: 8000 }, { extraHourly: 0 }, { capital: 300000, reserve: 100000, price: 250000, extraHourly: 40000 }];
  for (const c of cases) {
    const p = { capital: 200000, reserve: 0, target: 1000000, hourly: 100000, price: 120000, extraHourly: 0, usageHourly: 0, ...c };
    const A = p.capital - p.reserve, h = p.hourly, after = h + p.extraHourly - p.usageHourly;
    const t0 = Math.max(0, (p.price - A) / h), t1 = (p.target + p.price - A) / h;
    // temps total si l’achat a lieu à τ (formule écrite ici, indépendante du moteur)
    const total = tau => { const left = Math.max(0, p.target - (A + h * tau - p.price)); return left === 0 ? tau : after > 0 ? tau + left / after : Infinity; };
    let best = Infinity; for (let i = 0; i <= 2000; i++) best = Math.min(best, total(t0 + (t1 - t0) * i / 2000));
    const t = E.purchaseGoalTiming(p);
    assert.ok(t.buyHours <= best + 1e-9, JSON.stringify(c) + ' : moteur ' + t.buyHours + ' > grille ' + best);
    assert.ok(t.buyHours >= best - (t1 - t0) / 2000 - 1e-9, JSON.stringify(c));
  }
});

/* ---------- couche scénario : même calcul que Mon objectif ---------- */
test('C : départ 500 000, dépense prévue 200 000, objectif 1 000 000 disponibles : il manque 700 000 (7 h) ; 1 000 000 à la fin, pas 1 200 000', () => {
  const r = B.goal(continuous({ capital: 500000, target: 1000000, hourly: 100000, plannedSpend: 200000 }), []);
  assert.equal(r.missing, 700000); near(r.totalMinutes, 420); assert.equal(r.finalCapital, 1000000);
  // courbe : la dépense part tout de suite (300 000 au départ), puis +100 000 $/h
  assert.deepEqual(r.curve.map(p => Math.round(p[1])), [300000, 475000, 650000, 825000, 1000000]);
});
test('H : sens « détenu », dépense prévue et dépenses par partie : Mes achats « sans achat » = Mon objectif ; « avec achat » à la main', () => {
  // but détenu 1 050 000 − réserve 50 000 + dépense prévue 100 000 = 1 100 000 disponibles ; disponible 250 000 ;
  // gain net 100 000 − 5 000 × 60 ÷ 60 = 95 000 $/h ; sans achat 850 000 ÷ 95 000 ; avec achat (200 000, rien en plus) 1 050 000 ÷ 95 000
  const s = continuous({ capital: 300000, reserve: 50000, target: 1050000, meaning: 'held', plannedSpend: 100000, upkeepPerSession: 5000, dailyMinutes: 60, hourly: 100000 }, { price: 200000 });
  const g = B.goal(s, []), d = B.goalPurchase(s, [], {});
  assert.equal(d.valid, true); assert.equal(d.save.hours, g.totalMinutes / 60);
  near(d.save.hours, 850000 / 95000); near(d.buy.hours, 1050000 / 95000);
  assert.equal(g.finalCapital, 1050000); // 300 000 + 850 000 − 100 000 : la dépense prévue n’est plus comptée comme argent détenu
  assert.ok(d.checks.length >= 2 && d.checks.every(c => c.ok), JSON.stringify(d.checks));
});
test('changement sans effet : le prix de revente, l’envie ou le nom ne changent ni le temps sans achat ni le temps avec achat', () => {
  const s = continuous({ capital: 200000, target: 1000000, hourly: 100000 }, { price: 120000, incomeMode: 'personal', boostHourly: 30000 });
  const a = B.goalPurchase(s, [], {});
  Object.assign(s.assets[0], { resale: 50000, utility: 5, name: 'Autre nom' });
  const b = B.goalPurchase(s, [], {});
  assert.equal(b.save.hours, a.save.hours); assert.equal(b.buy.hours, a.buy.hours); near(a.buy.hours, 920000 / 130000);
});
test('inversion : un gain en plus au-dessus du seuil fait passer l’achat de « recule l’objectif » à « l’avance »', () => {
  const s = continuous({ capital: 200000, target: 1000000, hourly: 100000 }, { price: 120000, incomeMode: 'personal', boostHourly: 10000 });
  assert.ok(B.goalPurchase(s, [], {}).delayHours > 0);
  s.assets[0].boostHourly = 20000; assert.ok(B.goalPurchase(s, [], {}).delayHours < 0);
  s.assets[0].boostHourly = null; const u = B.goalPurchase(s, [], {});
  assert.equal(u.extraKnown, false); assert.ok(u.state.unknowns.includes('gain-en-plus'));
});
test('à la fin de chaque mission : 7 missions sans achat (2 h 20), 9 avec un achat de 90 000 acheté juste avant le but (3 h)', () => {
  // gain net 50 000 − 5 000 = 45 000 ; (400 000 − 100 000) ÷ 45 000 = 6,67 → 7 ; (490 000 − 100 000) ÷ 45 000 = 8,67 → 9 ; 20 min chacune
  const s = fresh(); s.model = 'cycles';
  s.goal = { ...s.goal, capital: 100000, reserve: 0, target: 400000, selected: 'scenario-a', dailyMinutes: 1440, meaning: 'available', plannedSpend: null, upkeepPerSession: null };
  Object.assign(s.assets[0], { price: 90000, extras: 0, fees: 0, owned: false });
  const d = B.goalPurchase(s, [], {});
  near(d.save.hours, 140 / 60); near(d.buy.hours, 3); assert.equal(d.buy.strategy, 'late');
});
test('dépendance : l’activité choisie demande l’achat → sans lui « pas possible », avec lui payé au départ (8 missions de 30 min = 4 h)', () => {
  // 300 000 − 150 000 = 150 000 ; il manque 450 000 ; 450 000 ÷ 60 000 = 7,5 → 8 missions
  const src = [{ id: 'act-x', name: 'X', reward: 60000, cost: 0, duration: 30, prep: 0, cooldown: 0, share: 100, investment: 0, players: 1, requiresPurchaseIds: ['veh-1'] }];
  const s = fresh(); s.model = 'cycles';
  s.goal = { ...s.goal, capital: 300000, reserve: 0, target: 600000, selected: 'act-x', dailyMinutes: 1440, meaning: 'available', plannedSpend: null, upkeepPerSession: null };
  Object.assign(s.assets[0], { itemId: 'veh-1', price: 150000, extras: 0, fees: 0, owned: false });
  const d = B.goalPurchase(s, src, {});
  assert.equal(d.base.valid, false); assert.equal(d.save.hours, null); near(d.buy.hours, 4); assert.equal(d.buy.strategy, 'now');
  s.goal.capital = 100000; assert.equal(B.goalPurchase(s, src, {}).buy.state, 'money-first');
});

/* ---------- relecture contradictoire : cas qui ont mis la chaîne en défaut ---------- */
test('dépense prévue déjà couverte au départ : le plan n’est pas rejeté (sans achat 1 h, avec achat 2 h)', () => {
  // but 800 000 + dépense prévue 300 000 = 1 100 000 disponibles ; 1 000 000 au départ : 100 000 ÷ 100 000 = 1 h ;
  // achat de 100 000 payé tout de suite : 1 100 000 − 900 000 = 200 000 ÷ 100 000 = 2 h
  const d = B.goalPurchase(continuous({ capital: 1000000, target: 800000, hourly: 100000, plannedSpend: 300000 }), [], {});
  near(d.save.hours, 1); near(d.buy.hours, 2); assert.equal(d.buy.state, 'ok');
  assert.deepEqual(d.rejected, []); assert.ok(d.checks.length >= 2 && d.checks.every(c => c.ok), JSON.stringify(d.checks));
  // activité qui demande l’achat (150 000), 800 000 au départ, but 600 000 + 200 000 prévus : 800 000 − 650 000 = 150 000 ÷ 60 000 = 2,5 → 3 missions de 30 min
  const src = [{ id: 'act-x', name: 'X', reward: 60000, cost: 0, duration: 30, prep: 0, cooldown: 0, share: 100, investment: 0, players: 1, requiresPurchaseIds: ['veh-1'] }];
  const s = fresh(); s.model = 'cycles';
  s.goal = { ...s.goal, capital: 800000, reserve: 0, target: 600000, selected: 'act-x', dailyMinutes: 1440, meaning: 'available', plannedSpend: 200000, upkeepPerSession: null };
  Object.assign(s.assets[0], { itemId: 'veh-1', price: 150000, extras: 0, fees: 0, owned: false });
  const u = B.goalPurchase(s, src, {}); near(u.buy.hours, 1.5); assert.deepEqual(u.rejected, []);
});
test('achat à 0 $ à la fin de chaque mission : même temps que sans achat (2 h 20), plan accepté', () => {
  const s = fresh(); s.model = 'cycles';
  s.goal = { ...s.goal, capital: 100000, reserve: 0, target: 400000, selected: 'scenario-a', dailyMinutes: 1440, meaning: 'available', plannedSpend: null, upkeepPerSession: null };
  Object.assign(s.assets[0], { price: 0, extras: 0, fees: 0, owned: false });
  const d = B.goalPurchase(s, [], {}); near(d.save.hours, 140 / 60); near(d.buy.hours, 140 / 60); assert.deepEqual(d.rejected, []);
});
test('gain par heure nul : sans achat « pas possible », l’achat qui rapporte 20 000 $/h donne 45 h ((1 000 000 − 100 000) ÷ 20 000)', () => {
  const s = continuous({ capital: 200000, target: 1000000, hourly: 0 }, { price: 100000, incomeMode: 'personal', boostHourly: 20000 });
  const d = B.goalPurchase(s, [], {});
  assert.equal(d.valid, true); assert.equal(d.save.hours, null); assert.equal(d.save.why, 'income'); near(d.buy.hours, 45); assert.equal(d.delayHours, null);
  const x = B.analysis('purchase', s, [], {}).explain;
  assert.ok(x.drivers.some(v => /ce que tu gagnes ne suffit pas/.test(v.text) && /45\sh/.test(v.text)), JSON.stringify(x.drivers));
});
test('temps de partie pas écrit : le coût d’usage n’est pas compté en silence, « Temps de ta partie » est demandé', () => {
  const s = continuous({ capital: 200000, target: 1000000, hourly: 100000, dailyMinutes: null }, { price: 100000, incomeMode: 'personal', boostHourly: 50000 });
  s.assets[0].usage.perSession = 20000;
  assert.ok(B.goalPurchase(s, [], {}).state.unknowns.includes('temps-partie'));
  assert.ok(B.analysis('purchase', s, [], {}).explain.missing.some(m => m.label === 'Temps de ta partie' && m.field === 'f-goal-dailyMinutes'));
});
test('page : gain net nul (dépenses par partie = gain) : ni « joue encore … à 0 $ par heure », ni temps pour regagner le prix', async () => {
  const p = await load(root, 'calculateurs.html?tool=purchase'), d = p.d, w = p.w;
  const fire = (n, t) => n && n.dispatchEvent(new w.Event(t, { bubbles: true, cancelable: true }));
  const set = (id, v) => { const el = d.getElementById(id); assert.ok(el, id); el.value = v; fire(el, el.tagName === 'SELECT' ? 'change' : 'input'); p.flush(); };
  p.flush(); set('f-goal-capital', '1000000'); set('f-goal-target', '500000'); set('f-goal-hourly', '10000'); set('f-goal-dailyMinutes', '60'); set('f-goal-upkeepPerSession', '10000'); set('f-purchase-price', '2000000');
  const out = d.getElementById('purchase-results').textContent;
  assert.doesNotMatch(out, /Joue encore/); assert.doesNotMatch(out, /Temps de jeu pour regagner ce prix/);
  assert.match(d.querySelector('#purchase-results .calc-next-action p').textContent, /^Réunis /);
  assert.deepEqual(p.errors, []); p.close();
});
test('page : « Ça vaut le coup ? » garde l’activité choisie pour regagner l’argent (Exemple A : 100 000 ÷ 67 500 = 1 h 29)', async () => {
  // Exemple A du site : (25 000 − 2 500) par cycle de 12 + 3 + 5 = 20 min → 67 500 $/h ; 100 000 ÷ 67 500 = 1,48 h → 1 h 29
  const p = await load(root, 'calculateurs.html?tool=roi'), d = p.d, w = p.w;
  const fire = (n, t) => n && n.dispatchEvent(new w.Event(t, { bubbles: true, cancelable: true }));
  p.flush(); fire(d.querySelector('.calc-mode-switch [data-mode="advanced"]'), 'click'); p.flush();
  const said = () => (d.getElementById('roi-results').textContent.match(/Il te faudra (.+?) de jeu pour retrouver ton argent/) || [])[1];
  assert.equal(said(), '1 h');
  const sel = d.querySelector('[data-field="roi.recoveryActivity"]'); sel.value = 'scenario-a'; fire(sel, 'change'); p.flush();
  assert.equal(said().replace(/\s/g, ' '), '1 h 29');
  assert.deepEqual(p.errors, []); p.close();
});

/* ---------- page réelle : zones existantes seulement, mêmes chiffres dans les trois modes ---------- */
test('page : Mes achats affiche le temps de Mon objectif (dépense prévue et dépenses par partie comprises), le même dans les trois modes', async () => {
  const p = await load(root, 'calculateurs.html?tool=purchase'), d = p.d, w = p.w;
  const fire = (n, t) => n && n.dispatchEvent(new w.Event(t, { bubbles: true, cancelable: true }));
  const set = (id, v) => { const el = d.getElementById(id); assert.ok(el, id); el.value = v; fire(el, el.tagName === 'SELECT' ? 'change' : 'input'); p.flush(); };
  set('f-goal-plannedSpend', '100000'); set('f-goal-upkeepPerSession', '5000');
  const stat = label => { const s = [...d.querySelectorAll('#purchase-results .calc-stat')].find(n => n.querySelector('span')?.textContent.trim() === label); return s ? s.querySelector('strong').textContent.trim() : null; };
  const seen = [];
  for (const mode of ['quick', 'guided', 'advanced']) { fire(d.querySelector('.calc-mode-switch [data-mode="' + mode + '"]'), 'click'); p.flush(); seen.push([stat('Mon objectif si je n’achète pas'), stat('Mon objectif si j’achète')]); }
  // défaut : 200 000, objectif 1 000 000, 100 000 $/h, 60 min ; + 100 000 prévus ; gain net 95 000 $/h :
  // sans achat 900 000 ÷ 95 000 = 9,47 h → 9 h 29 ; avec l’achat de 100 000 : 1 000 000 ÷ 95 000 = 10,53 h → 10 h 32
  assert.deepEqual(seen, [['9 h 29', '10 h 32'], ['9 h 29', '10 h 32'], ['9 h 29', '10 h 32']]);
  const goalMain = d.querySelector('#goal-results .calc-result-main').textContent.trim(); assert.equal(goalMain, '9 h 29');
  assert.match(d.getElementById('purchase-results').textContent, /Avec cet achat, ton objectif arrive après 10\sh\s32 de jeu au lieu de 9\sh\s29\./);
  assert.deepEqual(p.errors, []); p.close();
});
