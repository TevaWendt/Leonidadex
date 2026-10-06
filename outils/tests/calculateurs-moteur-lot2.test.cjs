'use strict';
/* Calculateur, lot 2 (« Moteur économique, temporalité et faisabilité ») : tests indépendants, Node pur.
   Chaque valeur attendue est CALCULÉE À LA MAIN dans le commentaire qui la précède : jamais produite par la fonction testée
   ni par une autre fonction du moteur. Tous les montants sont FICTIFS : ils vérifient un modèle de simulation, pas une
   mécanique de GTA VI. Numéros T2-xx = plan de tests de la spécification du lot 2 ; lettres A à N = scénarios du cahier.
   Les espaces entre un nombre et « $ » (insécables, fines ou simples) sont neutralisées avant comparaison (flat). */
const test = require('node:test'), assert = require('node:assert/strict'), path = require('node:path');
const root = path.resolve(__dirname, '../..');
const E = require(path.join(root, 'calculateurs-engine.js')), B = require(path.join(root, 'calculateurs-scenario.js')), L = require(path.join(root, 'calculateurs-modele.js'));
const H = require('./check-ultime-helper.cjs');
const { D, catalogue, sourceActivities, presets } = H.siteData();
const initial = B.initial(H.dataVersion(D, catalogue, sourceActivities), presets);
const base = () => H.baseState(B, initial, catalogue);
const near = (a, b, eps = 1e-6) => assert.ok(typeof a === 'number' && Math.abs(a - b) <= eps * Math.max(1, Math.abs(b)), a + ' ≠ ' + b);
const flat = s => String(s === undefined || s === null ? '' : s).replace(/[\s  ]+/g, ' ');
const safe = x => assert.doesNotMatch(JSON.stringify(x), /Infinity|NaN/);
const dc = x => JSON.parse(JSON.stringify(x));
const rules = v => (v.violations || []).map(x => x.rule);
const has = (v, rule) => assert.ok(rules(v).includes(rule), 'attendu ' + rule + ', obtenu ' + JSON.stringify(v.violations));
const okVerify = (v, label) => { assert.equal(v.valid, true, label + ' : ' + v.reason); assert.equal(v.ok, true, label + ' : ' + JSON.stringify(v.violations)); };
// mission fictive : récompense, frais, durée en minutes (préparation, attente, part, achat de départ à 0 sauf indication)
const m = o => ({ id: 'm', name: 'M', reward: 0, cost: 0, duration: 10, prep: 0, cooldown: 0, share: 100, investment: 0, players: 1, ...o });
// chaîne H : A (30 000) puis B (70 000, qui demande A)
const chainAB = (bExtra = {}) => [{ id: 'a', name: 'A', price: 30000 }, { id: 'b', name: 'B', price: 70000, requires: ['a'], ...bExtra }];
const money = j => (j || []).filter(e => e.type === 'spend' || e.type === 'receive');
// journal du moteur → événements de E.cashJournalVerify (argent : kind spend|earn ; act et check tels quels)
const toEvents = j => j.map(e => e.kind ? e : { at: e.at, kind: e.type === 'spend' ? 'spend' : 'earn', amount: e.amount, needs: e.needs, unlocks: e.unlocks, asset: e.asset, id: e.id, session: e.session });

/* ---------- T2-01 : un seul calendrier (C1) ---------- */
test('T2-01 calendrier unique : jour de la N-ième partie sur les jours joués par semaine (Mon temps de jeu, plan)', () => {
  // partie 1 = jour 1 ; on joue les dpw premiers jours de chaque semaine : ⌊(n−1)/dpw⌋×7 + ((n−1) mod dpw) + 1
  for (const [n, dpw, days] of [[0, 5, 0], [1, 5, 1], [5, 5, 5], [6, 5, 8], [7, 5, 9], [8, 5, 10], [3, 3, 3], [4, 3, 8], [16, 7, 16], [7, 1, 43]]) assert.equal(E.calendarDays(n, dpw), days, n + ' parties à ' + dpw + ' j/sem');
  // Mon temps de jeu : 100 000 → 1 000 000 ; partie : 100 000 gagnés, 50 000 d’achat de départ, 200 000 à la fin.
  // après la partie : 1 000 000 − 200 000 = 800 000 ; suivante 100 000 + 50 000 = 150 000 → ⌈800 000 ÷ 150 000⌉ = 6 parties ;
  // 6 parties à 5 j/sem : jours 1–5 puis 8 → 8 (et non ⌈6×7÷5⌉ = 9, qui comptait un jour sans partie)
  const p = E.sessionProjection({ capital: 100000, target: 1000000, reserve: 0, session: { valid: true, profit: 100000, investment: 50000, finalCapital: 200000 }, daysPerWeek: 5 });
  assert.equal(p.valid, true); assert.equal(p.missingBefore, 900000); assert.equal(p.missingAfter, 800000); assert.equal(p.sessionsLeft, 6); assert.equal(p.calendarDays, 8);
  // plan : 300 000 → 1 000 000 à 100 000 $/h, parties de 60 min : 7 parties → jours 1–5, 8, 9 → 9 jours
  const r = E.missionPlan({ capital: 300000, reserve: 0, target: 1000000, hourly: 100000, sessionMinutes: 60, daysPerWeek: 5 });
  assert.equal(r.valid, true); assert.equal(r.totalSessions, 7); assert.equal(r.days, 9); safe(r);
});

/* ---------- T2-02 / T2-03 : le but exige les achats d’avant (C2, scénario H) ---------- */
test('T2-02 H : le but exige les achats d’avant — parcours 420 min et 7 parties, B payé à la minute 120 / après la partie 2', () => {
  // 90 000, 10 000 de côté, but 50 000 disponibles, 10 000 $/h ; A 30 000 puis B 70 000 (demande A).
  // Parcours : A à 0 → 60 000 ; B demande 70 000 + 10 000 = 80 000 → 20 000 à gagner = 2 h → B à 120 → 10 000 ;
  // but : 50 000 + 10 000 = 60 000 → 50 000 à gagner = 5 h → 420 min, 60 000 $.
  const input = { capital: 90000, reserve: 10000, target: 50000, goalMeaning: 'available', hourly: 10000, purchases: chainAB() };
  const f = E.missionPlan(input);
  assert.equal(f.valid, true); assert.equal(f.reached, true); near(f.totalMinutes, 420); near(f.finalCash, 60000);
  assert.deepEqual(f.purchases.map(x => [x.id, x.owned]), [['a', true], ['b', true]]); near(f.purchases[1].atMinute, 120); assert.deepEqual(f.unpaid, []);
  okVerify(E.missionVerify(f), 'parcours'); near(E.missionVerify(f).reachedAt, 420);
  // Parties de 60 min : A avant la partie 1 (60 000) ; p1 70 000 ; p2 80 000 → B après p2 → 10 000 ; p3–p7 → 60 000 : 7 parties = 420 min.
  const s = E.missionPlan({ ...input, sessionMinutes: 60 });
  assert.equal(s.valid, true); assert.equal(s.reached, true); assert.equal(s.totalSessions, 7); near(s.totalMinutes, 420); near(s.finalCash, 60000);
  assert.equal(s.purchases[1].owned, true); assert.equal(s.purchases[1].atSession, 2); assert.deepEqual(s.sessions[0].purchasesBefore, ['A']); assert.deepEqual(s.sessions[1].purchasesAfterOnly, ['B']);
  assert.deepEqual(s.unpaid, []); okVerify(E.missionVerify(s), 'parties'); near(E.missionVerify(s).reachedAt, 420); safe(f); safe(s);
});
test('T2-03 H, cible couverte : A et B payés tout de suite, il reste 10 000 à gagner → 60 min / 1 partie, 210 000 $', () => {
  // 300 000 − 30 000 − 70 000 = 200 000 ; but 200 000 disponibles + 10 000 de côté = 210 000 → 1 h à 10 000 $/h
  const input = { capital: 300000, reserve: 10000, target: 200000, goalMeaning: 'available', hourly: 10000, purchases: chainAB() };
  const f = E.missionPlan(input), s = E.missionPlan({ ...input, sessionMinutes: 60 });
  assert.equal(f.reached, true); near(f.totalMinutes, 60); near(f.finalCash, 210000); assert.ok(f.purchases.every(x => x.owned && x.atMinute === 0));
  assert.equal(s.reached, true); assert.equal(s.totalSessions, 1); near(s.finalCash, 210000); assert.deepEqual(s.sessions[0].purchasesBefore, ['A', 'B']);
  okVerify(E.missionVerify(f), 'parcours'); okVerify(E.missionVerify(s), 'parties');
});

/* ---------- T2-04 : obtention en attente après le but (C2.2, C3b) ---------- */
test('T2-04 obtention après le but : P payé puis obtenu en 60 min sans gain → 1 partie / 60 min, 200 000 $, atteinte constatée à 60', () => {
  // 300 000, but 100 000 disponibles, 100 000 $/h, P 100 000 obtenu en 60 min : l’argent suffit dès l’achat, mais P n’est
  // possédé qu’à la fin de l’obtention ; pendant ce temps aucun gain par heure.
  const input = { capital: 300000, reserve: 0, target: 100000, hourly: 100000, purchases: [{ id: 'p', name: 'P', price: 100000, minutes: 60 }] };
  const s = E.missionPlan({ ...input, sessionMinutes: 60 });
  assert.equal(s.valid, true); assert.equal(s.reached, true); assert.equal(s.totalSessions, 1); near(s.totalMinutes, 60); near(s.finalCash, 200000);
  assert.equal(s.sessions[0].passive, 0); near(s.acquisitionMinutes, 60); assert.equal(s.purchases[0].owned, true);
  const f = E.missionPlan(input);
  assert.equal(f.reached, true); near(f.totalMinutes, 60); near(f.finalCash, 200000); near(f.activeMinutes, 0); near(f.acquisitionMinutes, 60);
  for (const [r, label] of [[s, 'parties'], [f, 'parcours']]) { const v = E.missionVerify(r); okVerify(v, label); near(v.reachedAt, 60); }
});

/* ---------- T2-05 : cycle et référence absente (C2.3) ---------- */
test('T2-05 dépendance circulaire et référence absente : refus avec les phrases existantes de M.prerequisites, dans les deux modes', () => {
  const cycle = { capital: 100000, reserve: 0, target: 150000, hourly: 100000, purchases: [{ id: 'A', name: 'A', price: 10000, requires: ['B'] }, { id: 'B', name: 'B', price: 10000, requires: ['A'] }] };
  const ref = L.prerequisites({ nodes: { A: { id: 'A', name: 'A', requires: ['B'] }, B: { id: 'B', name: 'B', requires: ['A'] } }, targets: ['A', 'B'] }).reason;
  assert.equal(flat(ref), 'Dépendance circulaire : A → B → A.'); // phrase existante, copiée avec ses espaces d’origine
  for (const input of [cycle, { ...cycle, sessionMinutes: 60 }]) { const r = E.missionPlan(input); assert.equal(r.valid, false); assert.equal(r.reason, ref); }
  const absent = { ...cycle, purchases: [{ id: 'A', name: 'A', price: 10000 }, { id: 'B', name: 'B', price: 10000, requires: ['z'] }] };
  const ref2 = L.prerequisites({ nodes: { A: { id: 'A', name: 'A', requires: [] }, B: { id: 'B', name: 'B', requires: ['z'] } }, targets: ['A', 'B'] }).reason;
  assert.equal(flat(ref2), 'Référence absente : « z » n’existe pas dans les données.');
  for (const input of [absent, { ...absent, sessionMinutes: 60 }]) { const r = E.missionPlan(input); assert.equal(r.valid, false); assert.equal(r.reason, ref2); }
  // même contrôle sur les missions : une mission qui demande une mission inconnue
  const mz = E.missionPlan({ capital: 0, target: 1000, sessionMinutes: 60, activities: [m({ reward: 1000, requiresMissions: ['zz'] })] });
  assert.equal(mz.valid, false); assert.match(flat(mz.reason), /Référence absente : « zz »/);
});

/* ---------- T2-06 : gains cumulés nets (C3a) ---------- */
test('T2-06 but « gagné à partir de maintenant » net des dépenses par partie : 6 parties, 30 000 gagnés, 50 000 $ à la fin', () => {
  // 10 000 $/h sur 60 min = 10 000 par partie, moins 5 000 de dépenses = 5 000 nets ; 30 000 ÷ 5 000 = 6 parties ;
  // argent : 20 000 + 6 × 5 000 = 50 000.
  const r = E.missionPlan({ capital: 20000, reserve: 0, target: 30000, goalMeaning: 'cumulative', hourly: 10000, sessionMinutes: 60, upkeepPerSession: 5000 });
  assert.equal(r.valid, true); assert.equal(r.reached, true); assert.equal(r.totalSessions, 6); near(r.earned, 30000); near(r.finalCash, 50000);
  const v = E.missionVerify(r); okVerify(v, 'cumulatif'); near(v.reachedAt, 360); safe(r);
});

/* ---------- T2-07 : aucun gain par heure pendant l’obtention (C3b, H) ---------- */
test('T2-07 obtention sans revenu : G en 60 min → 9 parties = parcours 540 min ; G en 90 min → 10 parties, parcours 570 min', () => {
  // 300 000, G 100 000 payé à 0 → 200 000 ; partie 1 entièrement prise par l’obtention (gain 0) ; puis 8 × 100 000 → 1 000 000 à la partie 9.
  const input = { capital: 300000, reserve: 0, target: 1000000, hourly: 100000, purchases: [{ id: 'g', name: 'G', price: 100000, minutes: 60 }] };
  const s = E.missionPlan({ ...input, sessionMinutes: 60 });
  assert.equal(s.reached, true); assert.equal(s.totalSessions, 9); near(s.totalMinutes, 540); near(s.finalCash, 1000000);
  assert.equal(s.sessions[0].passive, 0); near(s.activeMinutes, 480); near(s.acquisitionMinutes, 60);
  const f = E.missionPlan(input);
  assert.equal(f.reached, true); near(f.totalMinutes, 540); near(f.activeMinutes, 480); near(f.acquisitionMinutes, 60);
  // 90 min : partie 1 = 60 min d’obtention (0) ; partie 2 = 30 min d’obtention puis 30 min à 100 000 $/h = 50 000 → 250 000 ;
  // puis 8 × 100 000 → 1 050 000 à la partie 10 (950 000 après la partie 9) ; parcours 90 + 480 = 570 min.
  const s90 = E.missionPlan({ ...input, sessionMinutes: 60, purchases: [{ id: 'g', name: 'G', price: 100000, minutes: 90 }] });
  assert.equal(s90.totalSessions, 10); near(s90.totalMinutes, 600); assert.equal(s90.sessions[0].passive, 0); near(s90.sessions[1].passive, 50000); near(s90.sessions[1].cashAfter, 250000); near(s90.acquisitionMinutes, 90);
  const f90 = E.missionPlan({ ...input, purchases: [{ id: 'g', name: 'G', price: 100000, minutes: 90 }] });
  near(f90.totalMinutes, 570); near(f90.acquisitionMinutes, 90);
  for (const [r, label] of [[s, 'parties 60'], [f, 'parcours 60'], [s90, 'parties 90'], [f90, 'parcours 90']]) okVerify(E.missionVerify(r), label);
});

/* ---------- T2-08 : dépenses de la partie contre la réserve (C3d) ---------- */
test('T2-08 dépenses de la partie sous la réserve : 112 000 → refus nommé (partie 1, 3 000 $, 10 000 $) ; 115 000 → 3 parties, 46 000 $', () => {
  const mk = capital => ({ capital, reserve: 10000, target: 30000, goalMeaning: 'available', sessionMinutes: 60, upkeepPerSession: 3000, purchases: [{ id: 'p', name: 'P', price: 100000, minutes: 60 }], activities: [m({ reward: 10000, duration: 30, requiresPurchaseIds: ['p'] })] });
  // 112 000 − 100 000 = 12 000 ; partie 1 prise par l’obtention (gain 0) ; dépenses 3 000 > 12 000 − 10 000 = 2 000 utilisables → refus
  const ko = E.missionPlan(mk(112000));
  assert.equal(ko.valid, false); const t = flat(ko.reason);
  assert.match(t, /partie 1/); assert.match(t, /3 000 \$/); assert.match(t, /10 000 \$/);
  // 115 000 − 100 000 = 15 000 ; p1 : −3 000 → 12 000 ; p2 : 2 missions × 10 000 − 3 000 → 29 000 ; p3 → 46 000 ≥ 30 000 + 10 000
  const ok = E.missionPlan(mk(115000));
  assert.equal(ok.valid, true); assert.equal(ok.reached, true); assert.equal(ok.totalSessions, 3); near(ok.finalCash, 46000);
  near(ok.sessions[0].cashAfter, 12000); near(ok.sessions[1].cashAfter, 29000); okVerify(E.missionVerify(ok), 'parties'); safe(ok);
});

/* ---------- T2-09 : dépenses par partie qui mangent le gain (C3e) ---------- */
test('T2-09 dépenses par partie (3 000 $) au-dessus de ce que rapporte la partie (2 000 $) : refus nommé, pas « ne rentre »', () => {
  const r = E.missionPlan({ capital: 50000, reserve: 0, target: 100000, sessionMinutes: 60, upkeepPerSession: 3000, activities: [m({ reward: 2000, duration: 60 })] });
  assert.equal(r.valid, false); const t = flat(r.reason);
  assert.match(t, /3 000 \$/); assert.match(t, /2 000 \$/); assert.doesNotMatch(t, /ne rentre/);
});

/* ---------- T2-10 : attente plus longue que la pause (C5) ---------- */
test('T2-10 attente de 2 000 min entre deux parties de 60 : refus identique à Mon objectif ; parcours 8 050 min ; mission dominée jamais jouée : pas de refus', () => {
  const slow = m({ id: 'l', name: 'L', reward: 20000, duration: 10, cooldown: 2000 });
  const expected = E.goal({ capital: 0, reserve: 0, target: 100000, dailyMinutes: 60, activity: { reward: 20000, duration: 10, cooldown: 2000 } }).reason;
  assert.match(expected, /pause entre deux parties/);
  const s = E.missionPlan({ capital: 0, reserve: 0, target: 100000, sessionMinutes: 60, activities: [slow] });
  assert.equal(s.valid, false); assert.equal(s.reason, expected);
  // parcours : départs 0, 2 010, 4 020, 6 030, 8 040 (10 min de mission + 2 000 d’attente) → fin 8 050, 50 min actives, 100 000 $
  const f = E.missionPlan({ capital: 0, reserve: 0, target: 100000, activities: [slow] });
  assert.equal(f.reached, true); near(f.totalMinutes, 8050); near(f.activeMinutes, 50); near(f.finalCash, 100000);
  // K (30 000 en 10 min, sans attente) ×6 = 180 000 en une partie : L n’est jamais jouée, aucun refus
  const k = E.missionPlan({ capital: 0, reserve: 0, target: 100000, sessionMinutes: 60, activities: [slow, m({ id: 'k', name: 'K', reward: 30000, duration: 10 })] });
  assert.equal(k.valid, true); assert.equal(k.reached, true); assert.equal(k.totalSessions, 1); near(k.finalCash, 180000);
});

/* ---------- T2-11 : but atteint pendant une attente (C3f) ---------- */
test('T2-11 parcours : le but tombe pendant l’attente → on ne prend que le temps nécessaire (30 min, 125 000 $) ; attente entière (60 min, 130 000 $)', () => {
  // 100 000 ; mission 10 min → 20 000, attente 50 ; 10 000 $/h en plus. Après la mission : 120 000 + 10 000 × 10 ÷ 60 = 121 666,67 ;
  // il manque 3 333,33 → 20 min à 10 000 $/h → atteint à t = 30, 125 000 $, une seule mission.
  const mk = target => ({ capital: 100000, reserve: 0, target, hourly: 10000, activities: [m({ reward: 20000, duration: 10, cooldown: 50 })] });
  const r = E.missionPlan(mk(125000));
  assert.equal(r.valid, true); assert.equal(r.reached, true); near(r.totalMinutes, 30); near(r.finalCash, 125000); assert.equal(r.sessions[0].steps[0].runs, 1);
  // but 130 000 : il manque 8 333,33 → 50 min = toute l’attente → 60 min, 130 000 $ (et pas une mission de plus : 70 min / 151 667 $ avant)
  const r2 = E.missionPlan(mk(130000));
  assert.equal(r2.reached, true); near(r2.totalMinutes, 60); near(r2.finalCash, 130000); assert.equal(r2.sessions[0].steps[0].runs, 1);
  okVerify(E.missionVerify(r), '125 000'); okVerify(E.missionVerify(r2), '130 000');
});

/* ---------- T2-12 : scénario J (C4, C2) ---------- */
test('T2-12 J : A achetable, B (qui porte le revenu) pas financée → « Il manque 20 000 $ pour « B » » dans les deux modes ; financé : 108 min / 2 parties', () => {
  // 90 000 − 10 000 de côté = 80 000 dépensables ; A 30 000 + B 70 000 = 100 000 → manque 20 000 (= 70 000 + 10 000 − 60 000 après A)
  const J = { capital: 90000, reserve: 10000, target: 100000, goalMeaning: 'available', hourly: 0, purchases: chainAB({ boostHourly: 50000 }) };
  for (const input of [J, { ...J, sessionMinutes: 60 }]) { const r = E.missionPlan(input); assert.equal(r.valid, false); assert.match(flat(r.reason), /Il manque 20 000 \$ pour « B »/); }
  // 120 000 : A → 90 000, B → 20 000 ; 50 000 $/h ; cible 100 000 + 10 000 = 110 000 → 90 000 ÷ 50 000 = 1,8 h = 108 min
  const f = E.missionPlan({ ...J, capital: 120000 });
  assert.equal(f.reached, true); near(f.totalMinutes, 108); near(f.finalCash, 110000);
  // parties de 60 min : 20 000 + 50 000 → 70 000 ; + 50 000 → 120 000 ≥ 110 000 → 2 parties
  const s = E.missionPlan({ ...J, capital: 120000, sessionMinutes: 60 });
  assert.equal(s.reached, true); assert.equal(s.totalSessions, 2); near(s.finalCash, 120000);
  okVerify(E.missionVerify(f), 'parcours'); okVerify(E.missionVerify(s), 'parties');
});

/* ---------- T2-13 : D dans le plan (C6) ---------- */
const D13 = boost => ({ capital: 100000, reserve: 20000, target: 1000000, goalMeaning: 'available', hourly: 100000, sessionMinutes: 60, purchases: [{ id: 'p', name: 'P', price: 120000, boostHourly: boost }] });
test('T2-13 D : amélioration à 120 000 (+30 000 $/h) payée après la partie 1 → 9 parties, remboursée en 4 h ; sans elle 10 parties', () => {
  // 100 000 − 20 000 = 80 000 < 120 000 : pas payable avant ; p1 → 200 000 → P → 80 000 ; p2…p9 : +130 000 → 80 000 + 8 × 130 000 = 1 120 000 ≥ 1 020 000
  const r = E.missionPlan(D13(30000));
  assert.equal(r.reached, true); assert.equal(r.totalSessions, 9); assert.equal(r.purchases[0].atSession, 1); near(r.purchases[0].paybackHours, 4); near(r.finalCash, 1120000);
  assert.equal(r.goalPaybackHours, null);
  // sans P : (1 000 000 + 20 000 − 100 000) ÷ 100 000 = 9,2 → 10 parties
  const n = E.missionPlan({ ...D13(30000), purchases: [] }); assert.equal(n.totalSessions, 10);
  okVerify(E.missionVerify(r), 'avec P');
});
test('inversion : le gain en plus de l’achat décide du meilleur plan de secours (« tous » avec +30 000 $/h, « sans les achats » à 0 $/h)', () => {
  // +30 000 $/h : avec P 9 parties < sans P 10 ; 0 $/h : avec P, 80 000 + 9 × 100 000 = 980 000 < 1 020 000 → 11 parties > 10
  const a = E.missionAlternatives(D13(30000)); assert.equal(a.valid, true); assert.equal(a.plans[0].id, 'all'); assert.equal(a.plans[0].totalSessions, 9);
  const b = E.missionAlternatives(D13(0)); assert.equal(b.valid, true); assert.equal(b.plans[0].id, 'no-purchases'); assert.equal(b.plans[0].totalSessions, 10);
  assert.equal(b.results.all.totalSessions, 11);
});
test('sans effet : le nom de l’achat et les jours par semaine ne changent ni les parties, ni l’argent, ni le journal (seuls les jours calendaires bougent)', () => {
  const a = E.missionPlan(D13(30000)), b = E.missionPlan({ ...D13(30000), daysPerWeek: 3, purchases: [{ id: 'p', name: 'Autre nom', price: 120000, boostHourly: 30000 }] });
  assert.equal(b.totalSessions, a.totalSessions); assert.equal(b.finalCash, a.finalCash); assert.deepEqual(b.sessions.map(x => x.cashAfter), a.sessions.map(x => x.cashAfter));
  assert.deepEqual(money(b.events).map(e => [e.at, e.type, e.amount]), money(a.events).map(e => [e.at, e.type, e.amount]));
  // 9 parties : 7 j/sem → jour 9 ; 3 j/sem → ⌊8/3⌋×7 + 8 mod 3 + 1 = 14 + 2 + 1 = 17
  assert.equal(a.days, 9); assert.equal(b.days, 17);
});

/* ---------- T2-14 : E et but qui rapporte (C6) ---------- */
test('T2-14 E : achat sans gain → remboursement null (jamais 0 h) ; but qui rapporte 50 000 $/h → remboursé en 12 h, sans changer les parties', () => {
  // P 60 000 payé à 0 → 140 000 ; but 600 000 : 460 000 ÷ 100 000 = 4,6 → 5 parties ; 600 000 ÷ 50 000 = 12 h
  const mk = income => ({ capital: 200000, reserve: 0, hourly: 100000, sessionMinutes: 60, goalPrice: 600000, goalIncomeHourly: income, purchases: [{ id: 'p', name: 'P', price: 60000, boostHourly: 0 }] });
  const r = E.missionPlan(mk(50000));
  assert.equal(r.valid, true); assert.equal(r.purchases[0].paybackHours, null); near(r.goalPaybackHours, 12); near(r.goalIncomeHourly, 50000); assert.equal(r.totalSessions, 5);
  const z = E.missionPlan(mk(0)); assert.equal(z.goalPaybackHours, null); assert.equal(z.totalSessions, 5);
  // sans achat : (600 000 − 200 000) ÷ 100 000 = 4 parties, que le but rapporte 50 000 $/h ou rien (son gain arrive après le but)
  const a = E.missionPlan({ ...mk(50000), purchases: [] }), b = E.missionPlan({ ...mk(0), purchases: [] });
  assert.equal(a.totalSessions, 4); assert.equal(b.totalSessions, 4); assert.equal(a.finalCash, b.finalCash); near(a.finalCash, 600000);
  safe(r); safe(z);
});

/* ---------- T2-15 : I dans le plan (C3b) ---------- */
test('T2-15 I : préparation de 30 min sans revenu comptée une fois — parcours 240 min avec ou sans l’achat ; parties 4 et 4', () => {
  // 100 000 ; 20 000 $/h ; P 60 000 (+20 000 $/h, 30 min) ; but 180 000. Avec P : 30 min + (180 000 − 40 000) ÷ 40 000 × 60 = 30 + 210 = 240 ;
  // sans P : 80 000 ÷ 20 000 = 4 h = 240.
  const input = { capital: 100000, reserve: 0, target: 180000, hourly: 20000, purchases: [{ id: 'p', name: 'P', price: 60000, boostHourly: 20000, minutes: 30 }] };
  const f = E.missionPlan(input), f0 = E.missionPlan({ ...input, purchases: [] });
  near(f.totalMinutes, 240); near(f0.totalMinutes, 240); near(f.activeMinutes, 210); near(f.acquisitionMinutes, 30);
  // parties de 60 min avec P : partie 1 = 30 min d’obtention + 30 min à 40 000 $/h = 20 000 → 60 000 ; puis 100 000, 140 000, 180 000 → 4 parties
  const s = E.missionPlan({ ...input, sessionMinutes: 60 }), s0 = E.missionPlan({ ...input, sessionMinutes: 60, purchases: [] });
  near(s.sessions[0].cashAfter, 60000); assert.equal(s.totalSessions, 4); near(s.finalCash, 180000); assert.equal(s0.totalSessions, 4);
  okVerify(E.missionVerify(f), 'parcours'); okVerify(E.missionVerify(s), 'parties');
});

/* ---------- T2-16 : F (verrou) ---------- */
test('T2-16 F : 40 000 à payer avant de toucher 100 000 avec 30 000 en poche : impossible sans financement, dans les deux modes', () => {
  const X = m({ id: 'x', name: 'X', reward: 100000, cost: 40000, duration: 30 });
  for (const input of [{ capital: 30000, reserve: 0, target: 100000, activities: [X] }, { capital: 30000, reserve: 0, target: 100000, sessionMinutes: 60, activities: [X] }]) {
    const r = E.missionPlan(input); assert.equal(r.valid, false); const t = flat(r.reason); assert.match(t, /40 000 \$/); assert.match(t, /30 000 \$/);
  }
});

/* ---------- T2-17 : L (verrou + journal) ---------- */
test('T2-17 L : départs 0, 25, 50 ; paiements 10, 35, 60 ; 60 000 $, 30 min actives, 60 min en tout ; vérifié, atteinte à 60', () => {
  const Lm = m({ id: 'l', name: 'L', reward: 20000, duration: 10, cooldown: 15 });
  const s = E.missionPlan({ capital: 0, reserve: 0, target: 60000, sessionMinutes: 60, activities: [Lm] }), f = E.missionPlan({ capital: 0, reserve: 0, target: 60000, activities: [Lm] });
  for (const [r, label] of [[s, 'parties'], [f, 'parcours']]) {
    assert.equal(r.valid, true, label); assert.equal(r.reached, true, label); near(r.finalCash, 60000); near(r.totalMinutes, 60); near(r.activeMinutes, 30);
    assert.deepEqual(money(r.events).map(e => e.at), [10, 35, 60], label);
    const v = E.missionVerify(r); okVerify(v, label); near(v.reachedAt, 60);
  }
  assert.ok(money(s.events).every(e => e.session === 1)); assert.equal(s.totalSessions, 1);
});

/* ---------- T2-18 : M (verrou + corruptions rejetées par le vérificateur) ---------- */
const M18 = S => ({ capital: 50000, reserve: 0, target: 55000, goalMeaning: 'held', sessionMinutes: S, purchases: [{ id: 'equip', name: 'Equip', price: 40000 }],
  activities: [m({ id: 'a1', name: 'A1', reward: 30000, cost: 5000, duration: 10, once: true, requiresPurchaseIds: ['equip'] }), m({ id: 'a2', name: 'A2', reward: 25000, cost: 5000, duration: 10, once: true, requiresPurchaseIds: ['equip'], requiresMissions: ['a1'] })] });
test('T2-18 M : équipement payé une fois, solvabilité avant chaque activité, 55 000 $ à la fin, point bas 5 000 ; journal dans l’ordre', () => {
  // 50 000 − 40 000 − 5 000 + 30 000 − 5 000 + 25 000 = 55 000 ; point bas après les frais de A1 : 5 000
  for (const [r, label] of [[E.missionPlan(M18(60)), 'parties'], [E.missionPlan(M18(null)), 'parcours']]) {
    assert.equal(r.valid, true, label + ' : ' + r.reason); assert.equal(r.reached, true, label); near(r.finalCash, 55000); near(r.lowPoint.cash, 5000);
    const am = money(r.journal).map(e => [e.type, e.amount]);
    assert.deepEqual(am, [['spend', 40000], ['spend', 5000], ['receive', 30000], ['spend', 5000], ['receive', 25000]], label);
    // occupations : A1 puis A2 (l’obtention de l’équipement, de durée 0, peut aussi figurer avant elles)
    const acts = r.journal.filter(e => e.kind === 'act').map(e => e.id); assert.deepEqual(acts.filter(id => id !== 'equip'), ['a1', 'a2'], label + ' : occupations');
    const equip = money(r.journal)[0]; assert.equal(equip.asset, true); assert.equal(equip.id, 'equip');
    assert.equal(r.journal.filter(e => e.unlocks === 'equip').length, 1, label + ' : l’équipement débloqué une seule fois (dépense ou obtention)');
    okVerify(E.missionVerify(r), label);
  }
});
test('T2-18 corruptions : prérequis après coup (R3), achat payé deux fois (R4), chevauchement (R5), total faux (R6), atteinte fausse (R7), dépense impayable (R2)', () => {
  for (const [S, label] of [[60, 'parties'], [null, 'parcours']]) {
    const r = E.missionPlan(M18(S)); assert.equal(r.valid, true, label);
    const idx = f => { const i = r.journal.findIndex(f); assert.ok(i >= 0, label + ' : entrée introuvable'); return i; };
    const iFraisA1 = idx(e => e.type === 'spend' && !e.asset && /A1/.test(e.label)), iActA1 = idx(e => e.kind === 'act' && e.id === 'a1');
    idx(e => e.type === 'spend' && e.asset && e.id === 'equip');
    // entrées de l’achat de l’équipement : sa dépense et, s’il y en a une, son obtention (c’est l’une d’elles qui porte « unlocks »)
    const isEquip = e => e.id === 'equip' && ((e.type === 'spend' && e.asset) || e.kind === 'act');
    // (a) l’achat de l’équipement déplacé après les frais de A1 : A1 demande Equip avant d’être payé
    const a = dc(r); const moved = a.journal.filter(isEquip); a.journal = a.journal.filter(e => !isEquip(e)); a.journal.splice(a.journal.findIndex(e => e.type === 'spend' && !e.asset && /A1/.test(e.label)) + 1, 0, ...moved); has(E.missionVerify(a), 'R3');
    // (b) l’équipement payé deux fois (dépense et obtention dupliquées à la suite)
    const b = dc(r); const dup = b.journal.filter(isEquip).map(dc); const last = b.journal.map(isEquip).lastIndexOf(true); b.journal.splice(last + 1, 0, ...dup); has(E.missionVerify(b), 'R4');
    // (c) A1 prolongée jusqu’à 15 : A2 (à 10) commence pendant A1
    const c = dc(r); c.journal[iActA1].until = 15; has(E.missionVerify(c), 'R5');
    // (d) argent final annoncé 56 000 au lieu de 55 000
    const d = dc(r); d.finalCash = 56000; has(E.missionVerify(d), 'R6');
    // (e) atteinte annoncée trop tôt : 0 partie (parties) ou 10 min (parcours)
    const e = dc(r); if (S) e.totalSessions = 0; else e.totalMinutes = 10; has(E.missionVerify(e), 'R7');
    // (f) frais de A1 à 50 000 : impayables avec 10 000 en poche
    const f = dc(r); f.journal[iFraisA1].amount = 50000; has(E.missionVerify(f), 'R2');
    assert.equal(E.missionVerify(r).ok, true, label + ' : l’original passe');
  }
});

/* ---------- T2-19 : R8, R9, R10 ---------- */
test('T2-19 R8 (action hors de sa partie), R9 (gain par heure ≠ taux × temps), R10 (dépenses par partie absentes)', () => {
  const S4 = E.missionPlan({ capital: 300000, reserve: 0, target: 1000000, hourly: 100000, sessionMinutes: 60, purchases: [{ id: 'g', name: 'G', price: 100000, minutes: 60 }] });
  assert.equal(E.missionVerify(S4).ok, true);
  // (a) l’obtention de G (partie 1, 0 → 60) prolongée à 70 : elle ne tient plus dans sa partie de 60 min
  const a = dc(S4); const act = a.journal.find(e => e.kind === 'act' && e.session === 1); assert.ok(act, 'occupation de la partie 1'); act.until = 70; has(E.missionVerify(a), 'R8');
  // (b) gain par heure de la partie 2 porté à 90 000 au lieu de 100 000 × 60 ÷ 60 = 100 000
  const b = dc(S4); const pas = b.journal.find(e => e.type === 'receive' && e.passive && e.session === 2); assert.ok(pas, 'gain par heure de la partie 2'); near(pas.amount, 100000); pas.amount = 90000; has(E.missionVerify(b), 'R9');
  // (b bis) obtention de 90 min : la partie 2 rapporte 50 000 (30 min libres) ; dire 100 000 est faux
  const S90 = E.missionPlan({ capital: 300000, reserve: 0, target: 1000000, hourly: 100000, sessionMinutes: 60, purchases: [{ id: 'g', name: 'G', price: 100000, minutes: 90 }] });
  const b2 = dc(S90); const p2 = b2.journal.find(e => e.type === 'receive' && e.passive && e.session === 2); near(p2.amount, 50000); p2.amount = 100000; has(E.missionVerify(b2), 'R9');
  // (c) T2-08 (115 000) : les dépenses de la partie 2 retirées du journal
  const S8 = E.missionPlan({ capital: 115000, reserve: 10000, target: 30000, sessionMinutes: 60, upkeepPerSession: 3000, purchases: [{ id: 'p', name: 'P', price: 100000, minutes: 60 }], activities: [m({ reward: 10000, duration: 30, requiresPurchaseIds: ['p'] })] });
  assert.equal(E.missionVerify(S8).ok, true);
  const c = dc(S8); const i = c.journal.findIndex(e => e.type === 'spend' && e.upkeep && e.session === 2); assert.ok(i >= 0, 'dépenses de la partie 2'); c.journal.splice(i, 1); has(E.missionVerify(c), 'R10');
  // (d) correctif lot 2 (ARI3-4) : parcours T2-07 (G obtenu de 0 à 60, gain par heure inscrit à 540 pour 480 min = 100 000 × 480 ÷ 60 = 800 000) : un journal qui crédite
  //     aussi les 60 min d’obtention (540 min → 900 000, argent final 1 100 000) viole C3b → R9 (attendu : 100 000 × (540 − 60) ÷ 60 = 800 000 ≠ 900 000)
  const F = E.missionPlan({ capital: 300000, reserve: 0, hourly: 100000, goalPrice: 1000000, purchases: [{ id: 'g', name: 'G', price: 100000, minutes: 60 }] });
  assert.equal(E.missionVerify(F).ok, true); const d = dc(F); const pv = d.journal.find(x => x.passive); near(pv.at, 540); near(pv.minutes, 480); near(pv.amount, 800000);
  pv.minutes = 540; pv.amount = 900000; pv.cash = 1100000; d.finalCash = 1100000; has(E.missionVerify(d), 'R9');
  // (e) correctif lot 2 (ARI3-4) : un événement d’argent daté hors de sa partie : les dépenses de la partie 2 (à 120) dites de la partie 1 (0 → 60) → R8 (l’ordre des instants est gardé : pas de R1)
  const e = dc(S8); const up2 = e.journal.find(x => x.type === 'spend' && x.upkeep && x.session === 2); near(up2.at, 120); up2.session = 1; const ve = E.missionVerify(e); has(ve, 'R8'); assert.ok(!rules(ve).includes('R1'), 'ordre gardé');
  // (f) correctif lot 2 (ARI5-2) : parcours au seul gain par heure (0 → 100 000 à 60 000 $/h : un gain de 100 min inscrit à t = 100). Le même gain inscrit deux fois (200 min de gain
  //     pour 100 min de jeu), ses minutes et son montant ×3 (300 min de gain en 100 min), ou daté à 50 avec 100 min (gain commencé avant le départ) : R9 (« gain par heure ≠ taux × temps
  //     joué », spec §4.1). Avant, les trois passaient : R9 ne contrôlait que montant = taux × minutes de l’entrée, sans tenir les intervalles [at − minutes, at] disjoints et ≥ 0.
  const H = E.missionPlan({ capital: 0, reserve: 0, hourly: 60000, target: 100000 }); okVerify(E.missionVerify(H), 'gain seul'); near(H.journal.find(x => x.passive).minutes, 100); near(H.journal.find(x => x.passive).at, 100);
  { const g = dc(H); const ev = g.journal.find(x => x.passive); g.journal.push({ ...ev }); g.finalCash += ev.amount; has(E.missionVerify(g), 'R9'); }
  { const g = dc(H); const ev = g.journal.find(x => x.passive); ev.minutes *= 3; ev.amount *= 3; ev.cash = ev.amount; g.finalCash = ev.amount; has(E.missionVerify(g), 'R9'); }
  { const g = dc(H); const ev = g.journal.find(x => x.passive); ev.at = 50; g.totalMinutes = 50; has(E.missionVerify(g), 'R9'); }
  // deux gains qui se suivent sans trou ni recouvrement (attente puis mission, T2-11 ; blocs successifs, ARI5-1) restent acceptés (okVerify de ces tests et propriété T2-34)
});

/* ---------- T2-20 : points de contrôle ---------- */
test('T2-20 points de contrôle : l’atteinte ne se constate qu’entre deux parties (120), pas au milieu d’une partie (60) — avec et sans checkpoints', () => {
  // 0 $ ; mission 30 min → 6 000 ; 5 000 de dépenses par partie ; but 10 000. p1 : 12 000 à t = 60 puis −5 000 → 7 000 ; p2 : 19 000 − 5 000 = 14 000 → 2 parties.
  const r = E.missionPlan({ capital: 0, reserve: 0, target: 10000, sessionMinutes: 60, upkeepPerSession: 5000, activities: [m({ reward: 6000, duration: 30 })] });
  assert.equal(r.reached, true); assert.equal(r.totalSessions, 2); near(r.finalCash, 14000);
  const v = E.missionVerify(r); okVerify(v, 'plan'); near(v.reachedAt, 120);
  const all = toEvents(r.journal), claim = { finalCash: 14000, target: 10000, reachedAt: 120 };
  // sans points de contrôle : l’argent passe 10 000 à la minute 60 (12 000 avant les dépenses) → atteinte rejouée 60 ≠ 120 annoncée
  const loose = E.cashJournalVerify({ capital: 0, reserve: 0, events: all.filter(e => e.kind !== 'check'), claim });
  assert.equal(loose.valid, true); has(loose, 'R7'); near(loose.reachedAt, 60);
  // avec les points de contrôle : atteinte constatée au contrôle 120
  const strict = E.cashJournalVerify({ capital: 0, reserve: 0, events: all, claim: { ...claim, checkpoints: true } });
  okVerify(strict, 'checkpoints'); near(strict.reachedAt, 120);
  // sans l’option, une entrée « check » n’est pas un événement connu (R1), lot 1 intact
  has(E.cashJournalVerify({ capital: 0, reserve: 0, events: all }), 'R1');
});

/* ---------- T2-21 : journal complet (plus de 600 événements) ---------- */
const S21 = { capital: 1000, reserve: 0, target: 7200000, sessionMinutes: 60, activities: [m({ reward: 20000, cost: 1000, duration: 10 })] };
test('T2-21 journal complet : 64 parties, 768 événements, 7 297 000 $ rejoués par M.ledger et par le vérificateur', () => {
  // 6 missions par partie × (20 000 − 1 000) = 114 000 ; 1 000 + 114 000 × n ≥ 7 200 000 → n = 64 ; 1 000 + 64 × 114 000 = 7 297 000 ;
  // 12 événements d’argent par partie → 768 ; dernière partie : 63 × 60 … 64 × 60 = 3 840
  const r = E.missionPlan(S21);
  assert.equal(r.valid, true); assert.equal(r.reached, true); assert.equal(r.totalSessions, 64); near(r.finalCash, 7297000);
  assert.equal(r.events.length, 768); assert.equal(r.journalComplete, true);
  const last = r.events[r.events.length - 1]; near(last.at, 3840); assert.equal(last.session, 64);
  near(L.ledger(1000, r.events, 0).final, 7297000);
  const v = E.missionVerify(r); okVerify(v, 'S2'); near(v.reachedAt, 3840); near(v.finalCash, 7297000);
});

/* ---------- T2-22 : courbe du parcours sur le journal complet (C9) ---------- */
test('T2-22 courbe du parcours long : dernier point 61,5 h / 7 012 000 $, échantillonnée sans point inventé, achat conservé', () => {
  // 369 missions × 19 000 + 1 000 = 7 012 000 (368 : 6 993 000 < 7 000 000) ; 369 × 10 min = 3 690 min = 61,5 h ; 738 événements > 600
  const r = E.missionPlan({ ...S21, sessionMinutes: null, target: 7000000 });
  assert.equal(r.reached, true); near(r.totalMinutes, 3690); near(r.finalCash, 7012000); assert.equal(r.events.length, 738);
  const c = E.missionCurve(r); assert.equal(c.valid, true); const end = c.points[c.points.length - 1];
  near(end.hours, 61.5); near(end.cash, 7012000); assert.ok(c.points.length <= 1203, 'points : ' + c.points.length); assert.equal(c.sampled, true);
  assert.ok(c.points.every(p => Number.isFinite(p.hours) && Number.isFinite(p.cash)));
  // achat de 100 000 au milieu (payé dès que l’argent le permet) : sa marche reste dans la courbe
  const p = E.missionPlan({ ...S21, sessionMinutes: null, target: 7000000, purchases: [{ id: 'p', name: 'P', price: 100000 }] });
  assert.equal(p.reached, true); assert.equal(p.purchases[0].owned, true);
  const cp = E.missionCurve(p); assert.equal(cp.sampled, true); assert.ok(cp.points.some(x => x.purchase === 'P'), 'le point d’achat est présent');
});

/* ---------- T2-23 : journal:false et inputs ---------- */
test('T2-23 journal:false : mêmes chiffres, journal vide et dit incomplet ; les plans de secours rendent leurs entrées pour recalculer avec journal', () => {
  const r = E.missionPlan({ ...S21, journal: false });
  assert.equal(r.valid, true); near(r.finalCash, 7297000); assert.equal(r.totalSessions, 64); assert.ok(r.events.length <= 600); assert.deepEqual(r.journal, []); assert.equal(r.journalComplete, false);
  const v = E.missionVerify(r); assert.equal(v.valid, true); assert.equal(v.ok, null); assert.equal(v.skipped, 'journal');
  const alt = E.missionAlternatives({ capital: 90000, reserve: 10000, target: 50000, goalMeaning: 'available', hourly: 10000, sessionMinutes: 60, purchases: chainAB() });
  assert.equal(alt.valid, true); assert.ok(Object.values(alt.results).filter(x => x.valid).every(x => x.journalComplete === false), 'candidats sans journal');
  assert.ok(alt.inputs && alt.inputs.all, 'inputs.all'); const again = E.missionPlan(alt.inputs.all);
  assert.equal(again.journalComplete, true); assert.equal(again.totalSessions, 7); near(again.finalCash, 60000);
});

/* ---------- T2-24 : plafond du journal ---------- */
test('T2-24 plafond : 400 parties de 1 440 min à 256 missions → journal incomplet, vérification ni réussie ni ratée (ok:null), en moins de 3 s', () => {
  // 256 missions par partie au plus (limite documentée) × 1 000 = 256 000 ; 400 parties → 102 400 000 < 1 000 000 000 : but non atteint ;
  // 102 400 récompenses + 102 400 occupations > 60 000 : le journal s’arrête, le résultat est gardé.
  const t0 = Date.now(); const r = E.missionPlan({ capital: 0, reserve: 0, target: 1e9, sessionMinutes: 1440, activities: [m({ reward: 1000, duration: 5 })] }); const ms = Date.now() - t0;
  assert.equal(r.valid, true); assert.equal(r.reached, false); assert.equal(r.totalSessions, 400); assert.equal(r.journalComplete, false);
  assert.ok(r.journal.length <= 60000 && r.events.length <= 60000, 'plafond'); assert.ok(r.events.length > 600, 'plus que les 600 d’avant : ' + r.events.length);
  const v = E.missionVerify(r); assert.equal(v.valid, true); assert.equal(v.ok, null); assert.equal(v.skipped, 'journal');
  assert.ok(ms < 3000, 'durée ' + ms + ' ms'); safe(r);
});

/* ---------- T2-25 : blocage et but non atteint (C10) ---------- */
test('T2-25 C10 : 50 M à 1 000 $/h sans réserve → refus chiffré (pas « 0 $ de côté ») ; asIs → unreached ; réserve 40 000 → bloqué avec « un plan existe (2 parties » ; réserve 80 000 > 50 000 → bloqué', () => {
  const plan = (goal, situation, extra = {}) => { const s = base(); s.tab = 'plan'; s.plan = B.copy(B.planTemplate); s.plan.goal = { ...s.plan.goal, kind: 'amount', meaning: 'available', ...goal }; s.plan.situation = { ...s.plan.situation, dailyMinutes: 60, daysPerWeek: 5, ...situation }; Object.assign(s.plan, extra); return B.validate(s, initial); };
  // (a) 400 parties × 1 000 $/h × 1 h = 400 000 ; il manquerait 50 000 000 − 400 000 = 49 600 000
  const a = B.evaluate('plan', plan({ target: 50000000 }, { capital: 0, reserve: 0, hourly: 1000 }));
  assert.equal(a.valid, false); assert.ok(!a.blockedByReserve, 'pas « bloqué par la réserve »'); const ta = flat(a.reason); assert.match(ta, /400 parties/); assert.match(ta, /il manquerait 49 600 000 \$/); assert.doesNotMatch(ta, /0 \$ de côté/);
  const b = B.evaluate('plan', plan({ target: 50000000 }, { capital: 0, reserve: 0, hourly: 1000 }, { strategy: 'asIs' }));
  assert.equal(b.valid, false); assert.equal(b.unreached, true); near(b.finalCash, 400000); near(b.missing, 49600000); assert.match(flat(b.reason), /49 600 000 \$/);
  // (c) 50 000 dont 40 000 gardés : 10 000 < 15 000 de frais → impossible ; sans réserve 3 missions par partie → 95 000 puis 140 000 ≥ 100 000 : 2 parties
  const mission = { ...B.copy(B.planMissionTemplate), id: 'm-1', name: 'Mission', reward: 30000, cost: 15000, duration: 20 };
  const c = B.evaluate('plan', plan({ target: 100000 }, { capital: 50000, reserve: 40000, hourly: null }, { source: 'missions', missions: [mission] }));
  assert.equal(c.valid, false); assert.equal(c.blockedByReserve, true); assert.match(flat(c.reason), /un plan existe \(2 parties/);
  // (d) réserve 80 000 > 50 000 : la règle B est conservée (bloqué, un plan existe en puisant dans l’argent de côté)
  const d = B.evaluate('plan', plan({ target: 100000 }, { capital: 50000, reserve: 80000, hourly: null }, { source: 'missions', missions: [mission] }));
  assert.equal(d.valid, false); assert.equal(d.blockedByReserve, true);
  const st = B.planStrategies(plan({ target: 50000000 }, { capital: 0, reserve: 0, hourly: 1000 }));
  assert.equal(st.valid, false); assert.equal(st.recommended, null); assert.ok(st.candidates.find(x => x.id === 'asIs').unreached === true);
});

/* ---------- T2-26 : version du modèle (C13) ---------- */
test('T2-26 modèle 2 : migration non destructive, information gardée, idempotente, invisible dans la signature ; CALC-03 intact', () => {
  assert.equal(B.MODEL_VERSION, 2); assert.equal(L.MODEL_VERSION, 2); assert.equal(initial.modelVersion, 2); assert.equal(initial.modelUpgradedFrom, null);
  const v6 = base(); const mv = s => [s.modelVersion, s.modelUpgradedFrom];
  assert.deepEqual(mv(v6), [2, null]);
  const v6old = { ...B.copy(v6), modelVersion: 1 }; delete v6old.modelUpgradedFrom;
  const u = B.validate(v6old, initial); assert.deepEqual(mv(u), [2, 1]);
  const asV5 = { ...B.copy(v6), version: 5 }; delete asV5.analysis; delete asV5.modelVersion; delete asV5.modelUpgradedFrom; asV5.assets.forEach(a => { for (const k of ['role', 'usage', 'resale', 'capabilities', 'requires', 'unlocks']) delete a[k]; });
  const m5 = B.validate(asV5, initial); assert.deepEqual(mv(m5), [2, 1]);
  const legacy = { version: 1, mode: 'quick', model: 'continuous', name: 'Ancien', tab: 'goal', goal: { capital: 150000, target: 900000, hourly: 60000, reserve: 0, dailyMinutes: 45, players: 1, selected: 'scenario-a' },
    activities: presets.map(a => ({ id: a.id, name: a.name, reward: a.reward, cost: a.cost, duration: a.duration, prep: a.prep, cooldown: a.cooldown, share: a.share, investment: a.investment, players: a.players, owned: false })),
    session: { minutes: 45, maxRepeat: 100, enabled: ['scenario-a', 'scenario-b'] }, inverse: { minutes: 45, selected: 'scenario-b' }, purchase: { itemId: '', price: 120000, hourly: 60000, boostHourly: 0, capital: 150000, target: 900000, reserve: 0, extras: 0 },
    roi: { purchase: 300000, upgrades: 0, fees: 0, revenueHourly: 40000, costHourly: 5000, hours: 12 }, budget: { allocations: [10000, 20000, 30000, 0, 0], reserve: 0 }, order: { items: [{ name: 'X', price: 50000, boostHourly: 0 }] },
    catalogue: { query: '', type: 'all', status: 'all', maxPrice: null, sort: 'name', favorites: [], compareIds: [], favoritesOnly: false } };
  const m1 = B.validate(legacy, initial); assert.deepEqual(mv(m1), [2, 1]); assert.equal(m1.goal.capital, 150000, 'aucune valeur saisie ne change');
  assert.deepEqual(mv(B.validate({ ...B.copy(v6), modelVersion: 2, modelUpgradedFrom: 1 }, initial)), [2, 1]);
  const noFrom = { ...B.copy(v6), modelVersion: 2 }; delete noFrom.modelUpgradedFrom; assert.deepEqual(mv(B.validate(noFrom, initial)), [2, null]);
  assert.deepEqual(mv(B.validate({ ...B.copy(v6), modelVersion: 3, modelUpgradedFrom: null }, initial)), [3, null], 'jamais abaissé');
  for (const s of [u, m5, m1]) assert.deepEqual(B.validate(B.copy(s), initial), s, 'validate idempotent');
  assert.equal(B.signature(u), B.signature(v6), 'la version du modèle ne rend pas un calcul « non enregistré »');
  // CALC-03 : mêmes réponses v5 → v6 (hors outils qui lisent l’horizon d’analyse, absent en v5 : même validité)
  for (const tool of [...B.tools, 'plan']) { const x = B.evaluate(tool, m5, sourceActivities, { catalogue }), y = B.evaluate(tool, B.validate(B.copy(v6), initial), sourceActivities, { catalogue }); if (['budget', 'compare', 'purchase'].includes(tool)) assert.equal(x.valid, y.valid, tool); else assert.equal(JSON.stringify(x), JSON.stringify(y), tool + ' : même réponse v5 → v6'); }
});

/* ---------- T2-27 : gain net partagé ---------- */
test('T2-27 hourlyNet : 100 000 − 1 000 × 60 ÷ 60 = 99 000 ; sans temps de partie, brut gardé et dit ; sans dépenses 100 000 ; gain vide → null', () => {
  const s = base(); s.goal.upkeepPerSession = 1000;
  const a = B.hourlyNet(s); near(a.hourly, 100000); near(a.net, 99000); near(a.upkeepHourly, 1000); assert.equal(a.known, true); assert.equal(a.reason, null);
  s.goal.dailyMinutes = null; const b = B.hourlyNet(s); near(b.net, 100000); assert.equal(b.known, false); assert.match(flat(b.reason), /dépenses par partie/);
  s.goal.dailyMinutes = 60; s.goal.upkeepPerSession = null; const c = B.hourlyNet(s); near(c.net, 100000); assert.equal(c.known, true); assert.equal(c.upkeepHourly, 0);
  s.goal.hourly = null; const d = B.hourlyNet(s); assert.equal(d.hourly, null); assert.equal(d.net, null);
});

/* ---------- T2-28 : Mon temps de jeu (C11) ---------- */
test('T2-28 Mon temps de jeu lit la même cible et les dépenses par partie : 320 000 / 4 parties / 20 % / 4 jours ; état CALC-02 : 711 000 / 13,29 % / 7 / 9', () => {
  // 100 000 → 500 000 ; partie 100 000, 200 000 à la fin, 20 000 de dépenses par partie, 5 j/sem :
  // avant 400 000 ; après 500 000 − (200 000 − 20 000) = 320 000 ; suivante 100 000 − 20 000 = 80 000 → 4 ; avancement 80 000 ÷ 400 000 = 20 % ; 4 parties à 5 j/sem → 4 jours
  const session = { valid: true, profit: 100000, investment: 0, finalCapital: 200000 };
  const p = E.sessionProjection({ capital: 100000, target: 500000, reserve: 0, session, upkeepPerSession: 20000, daysPerWeek: 5 });
  assert.equal(p.valid, true); near(p.missingBefore, 400000); near(p.missingAfter, 320000); assert.equal(p.sessionsLeft, 4); near(p.progressPercent, 20); assert.equal(p.calendarDays, 4);
  // dépenses 150 000 > 100 000 : la suivante ne rapporte rien → pas de nombre de parties, pas de raison de calendrier ;
  // après = cible − (argent à la fin de la partie − dépenses de la partie − réserve) = 500 000 − (200 000 − 150 000 − 0) = 500 000 − 50 000 = 450 000
  // (réconciliation lot 2 : la spec §5.1 T2-28 écrivait « 500 000 − (200 000 − 150 000) = 350 000 », erreur d’arithmétique : 200 000 − 150 000 = 50 000)
  const q = E.sessionProjection({ capital: 100000, target: 500000, reserve: 0, session, upkeepPerSession: 150000, daysPerWeek: 5 });
  assert.equal(q.valid, true); assert.equal(q.sessionsLeft, null); assert.equal(q.calendarReason, null); near(q.missingAfter, 450000); near(q.progressPercent, 0);
  // état CALC-02 (200 000, 20 000 de côté, but 1 000 000, partie B 110 000) + 1 000 de dépenses par partie :
  // après = 1 000 000 − (310 000 − 1 000 − 20 000) = 711 000 ; avant 820 000 ; avancement 109 000 ÷ 820 000 = 13,29 % ; ⌈711 000 ÷ 109 000⌉ = 7 ; 7 parties à 5 j/sem → 9 jours
  const s = base(); s.goal.upkeepPerSession = 1000;
  const r = B.projection(s, []); assert.equal(r.valid, true, r.reason); near(r.missingBefore, 820000); near(r.missingAfter, 711000); near(r.progressPercent, 109000 / 820000 * 100); assert.equal(r.sessionsLeft, 7); assert.equal(r.calendarDays, 9);
  assert.ok(B.analysis('session', s, [], { catalogue }).explain.used.includes('cout-usage'), 'dépenses par partie comptées et dites');
  const x = B.analysis('session', s, [], { catalogue }).explain; assert.ok(x.drivers.some(d => d.label === 'Dépenses par partie'), JSON.stringify(x.drivers));
  // « en tout » : cible 1 000 000 − 20 000 = 980 000 → avant 980 000 − 180 000 = 800 000
  const h = base(); h.goal.meaning = 'held'; near(B.projection(h, []).missingBefore, 800000);
  // dépense prévue 50 000 : cible 1 050 000 → avant 870 000
  const d = base(); d.goal.plannedSpend = 50000; near(B.projection(d, []).missingBefore, 870000);
  const plain = base(); assert.ok(!B.analysis('session', plain, [], { catalogue }).explain.used.includes('cout-usage'), 'sans dépenses : écarté');
});

/* ---------- T2-29 : Mon budget (C11) ---------- */
test('T2-29 Mon budget retire les dépenses par partie : 55 000 + 10 × (100 000 − 1 000) = 1 045 000 $, point bas 55 000, étiquette par partie', () => {
  // dépenses 50 000 + 60 000 + 20 000 + 10 000 + 0 + 5 000 = 145 000 → 200 000 − 145 000 = 55 000 ; 10 parties à 100 000 moins 1 000
  const s = base(); s.goal.upkeepPerSession = 1000;
  const x = B.analysis('budget', s, [], { catalogue }); assert.ok(x.flow, 'flux dans la durée');
  near(x.flow.ledger.final, 1045000); near(x.flow.ledger.low.value, 55000); assert.equal(x.flow.ledger.reserveBreach, null); near(x.flow.upkeep, 1000);
  assert.ok(x.flow.ledger.rows.some(row => /Dépenses par partie \(partie 1\)/.test(flat(row.label))), JSON.stringify(x.flow.ledger.rows.slice(0, 4).map(r => r.label)));
  assert.ok(x.explain.drivers.some(d => d.label === 'Dépenses par partie'), JSON.stringify(x.explain.drivers));
  // sans dépenses par partie : 55 000 + 10 × 100 000 = 1 055 000 (inchangé)
  near(B.analysis('budget', base(), [], { catalogue }).flow.ledger.final, 1055000);
});

/* ---------- T2-30 : Quoi acheter d’abord ? (C11) ---------- */
test('T2-30 Quoi acheter d’abord ? lit le gain net : 4,5532 h (« 4 h 34 »), attente 70 000 ÷ 99 000 ; cible « en tout » 980 000 ; gain vide ≠ gain nul', () => {
  // Emperor 250 000 : (250 000 + 20 000 − 200 000) ÷ 99 000 = 0,7071 h ; puis 99 000 + 5 000 = 104 000 $/h ; Primo 400 000 : 400 000 ÷ 104 000 = 3,8462 h ; total 4,5532 h
  const s = base(); s.goal.upkeepPerSession = 1000;
  const r = B.evaluate('order', s, [], { catalogue }); assert.equal(r.valid, true, r.reason);
  near(r.totalHours, 70000 / 99000 + 400000 / 104000); near(r.steps[0].waitHours, 70000 / 99000); assert.equal(E.durationText(r.totalHours).replace(/\s/g, ' '), '4 h 34');
  near(B.orderInput(s).hourly, 99000);
  const x = B.analysis('order', s, [], { catalogue }).explain; assert.ok(x.drivers.some(d => d.label === 'Gain net' && /99 000 \$/.test(flat(d.text))), JSON.stringify(x.drivers));
  // « en tout » : 1 000 000 − 20 000 de côté = 980 000 à viser
  const h = base(); h.goal.meaning = 'held'; near(B.goalTarget(h), 980000);
  // gain par heure vide : on demande le chiffre ; gain nul : « rien par heure »
  const items = [{ name: 'X', price: 300000 }];
  const none = E.order({ capital: 200000, reserve: 0, hourly: null, items }); assert.equal(none.valid, false); assert.match(flat(none.reason), /Écris ce que tu gagnes par heure/); assert.match(flat(none.reason), /il manque 100 000 \$ pour « X »/);
  const zero = E.order({ capital: 200000, reserve: 0, hourly: 0, items }); assert.equal(zero.valid, false); assert.match(zero.reason, /Tu ne gagnes rien par heure/);
  // sans temps de partie : gain brut gardé (100 000) et « Temps de ta partie » demandé, sans bloquer
  const n = base(); n.goal.upkeepPerSession = 1000; n.goal.dailyMinutes = null;
  near(B.orderInput(n).hourly, 100000); const xn = B.analysis('order', n, [], { catalogue }); assert.equal(xn.result.valid, true); assert.ok(xn.explain.missing.some(k => k.label === 'Temps de ta partie' && k.decisive === false), JSON.stringify(xn.explain.missing));
});

/* ---------- T2-31 : Mes activités (C11.6) ---------- */
test('T2-31 Mes activités : les dépenses par partie ne changent pas le chiffre (67 500) et la raison le dit avec le montant', () => {
  // Exemple A : (25 000 − 2 500) × 3 missions en 60 min (12 + 3 min, 5 d’attente : 15, 35, 55) = 67 500
  const s = base(); s.goal.upkeepPerSession = 1000;
  const x = B.analysis('activities', s, [], { catalogue }); near(x.result.profit, 67500);
  const ex = x.explain.excluded.find(e => e.id === 'cout-usage'); assert.ok(ex, 'écarté avec une raison'); assert.match(flat(ex.why), /1 000 \$/); assert.match(flat(ex.why), /ne sont pas retirées/);
  near(B.analysis('activities', base(), [], { catalogue }).result.profit, 67500);
});

/* ---------- T2-32 : « Ce qui compte » du plan (C6, C10) ---------- */
test('T2-32 « Ce qui compte » du plan : le gain du but arrive après le but (remboursé après 12 h) ; un achat qui rapporte le compte ; vérification dite', () => {
  const mk = prereqs => { const s = base(); s.tab = 'plan'; s.plan = B.copy(B.planTemplate); s.plan.goal = { ...s.plan.goal, kind: 'purchase', name: 'Mon but', price: 600000, boostHourly: 50000 }; s.plan.situation = { ...s.plan.situation, capital: 200000, reserve: 0, hourly: 100000, dailyMinutes: 60, daysPerWeek: 7 }; s.plan.prerequisites = prereqs; return B.validate(s, initial); };
  // 600 000 ÷ 50 000 = 12 h ; sans achat : 400 000 ÷ 100 000 = 4 parties
  const a = B.analysis('plan', mk([])); assert.equal(a.result.valid, true, a.result.reason); assert.equal(a.result.totalSessions, 4);
  assert.ok(!a.explain.used.includes('gain-en-plus')); const ex = a.explain.excluded.find(e => e.id === 'gain-en-plus'); assert.ok(ex); assert.match(flat(ex.why), /remboursé après 12 h/);
  const ver = a.explain.drivers.find(d => d.label === 'Vérification'); assert.ok(ver, JSON.stringify(a.explain.drivers)); assert.match(ver.text, /événements/);
  assert.equal(a.result.verification && a.result.verification.ok, true);
  // avec un achat d’avant 100 000 (+5 000 $/h) : 100 000 restants, 105 000 $/h → 500 000 ÷ 105 000 = 4,76 → 5 parties
  const b = B.analysis('plan', mk([{ ...B.copy(B.planPrereqTemplate), id: 'p-1', name: 'Outil', price: 100000, boostHourly: 5000 }]));
  assert.equal(b.result.totalSessions, 5); assert.ok(b.explain.used.includes('gain-en-plus')); assert.ok(b.explain.drivers.some(d => d.label === 'Ce que rapporte le but'), JSON.stringify(b.explain.drivers));
  assert.ok(b.explain.drivers.some(d => d.label === 'Vérification'));
});

/* ---------- T2-33 : Mon temps de jeu rejoué par le vérificateur (C12) ---------- */
test('T2-33 Mon temps de jeu : le programme passe le vérificateur (état CALC-02 et 400 parties aléatoires, 0 rejet) ; une action hors partie est rejetée (R8)', () => {
  const s0 = base(); const r0 = B.session(s0); assert.equal(r0.valid, true); assert.ok(r0.verification, 'verification'); assert.equal(r0.verification.ok, true, JSON.stringify(r0.verification.violations));
  const r = H.rng(33); let checked = 0;
  for (let i = 0; i < 400; i += 1) {
    const s = base(); s.session.minutes = 15 + Math.floor(r() * 225); s.goal.capital = Math.round(r() * 300000); s.goal.reserve = r() < 0.3 ? Math.round(r() * s.goal.capital) : 0;
    s.activities.forEach(a => { a.reward = Math.round(r() * 60000); a.cost = Math.round(r() * 5000); a.duration = 5 + Math.floor(r() * 50); a.prep = Math.floor(r() * 10); a.cooldown = Math.floor(r() * 25); a.investment = r() < 0.3 ? Math.round(r() * 30000) : 0; a.share = r() < 0.2 ? 50 : 100; a.owned = false; a.prepOnce = r() < 0.2; });
    const res = B.session(s, []); safe(res); if (!res.valid) continue; checked += 1;
    assert.ok(res.verification && res.verification.valid, 'vérification présente'); assert.equal(res.verification.ok, true, i + ' : ' + JSON.stringify(res.verification.violations) + ' ' + JSON.stringify(res.timeline));
  }
  assert.ok(checked > 200, 'assez de parties valides : ' + checked);
  has(E.cashJournalVerify({ capital: 0, reserve: 0, events: [{ at: 0, kind: 'act', until: 70, session: 1 }], claim: { sessionMinutes: 60 } }), 'R8');
  has(E.cashJournalVerify({ capital: 0, reserve: 0, events: [{ at: 0, kind: 'act', until: 10 }], claim: { sessionMinutes: 60 } }), 'R1');
  assert.equal(E.cashJournalVerify({ capital: 0, reserve: 0, events: [{ at: 60, kind: 'act', until: 120, session: 2 }], claim: { sessionMinutes: 60 } }).ok, true, 'partie 2 : 60 à 120');
});

/* ---------- T2-34 : propriété sur 400 plans générés ---------- */
test('T2-34 propriété (400 plans) : chaque plan complet passe le vérificateur ; atteint ⇒ achats possédés ; non atteint ⇒ manque > 0 ou obtention restante ; gain continu seul : parties = ⌈parcours ÷ S⌉ × S', () => {
  const r = H.rng(34); let ok = 0, verified = 0, same = 0;
  for (let i = 0; i < 400; i += 1) {
    const S = r() < 0.35 ? null : 30 + Math.floor(r() * 150), capital = Math.round(r() * 300000), reserve = r() < 0.3 ? Math.round(r() * capital) : 0;
    const nM = Math.floor(r() * 3), nP = Math.floor(r() * 3);
    const activities = Array.from({ length: nM }, (_, k) => m({ id: 'm' + k, name: 'M' + k, reward: 5000 + Math.round(r() * 50000), cost: Math.round(r() * 3000), duration: 5 + Math.floor(r() * 40), prep: Math.floor(r() * 5), cooldown: Math.floor(r() * 20), investment: r() < 0.2 ? Math.round(r() * 20000) : 0, once: r() < 0.15 }));
    const purchases = Array.from({ length: nP }, (_, k) => ({ id: 'p' + k, name: 'P' + k, price: Math.round(r() * 150000), boostHourly: r() < 0.5 ? Math.round(r() * 20000) : 0, minutes: r() < 0.4 ? Math.floor(r() * 30) : 0, requires: k > 0 && r() < 0.5 ? ['p' + (k - 1)] : [], usagePerSession: S !== null && r() < 0.3 ? Math.round(r() * 500) : 0, owned: r() < 0.1 }));
    if (activities.length && purchases.length && r() < 0.4) activities[0].requiresPurchaseIds = [purchases[0].id];
    // correctif lot 2 (ARI2-1) : un achat peut demander une mission « une fois » (parfois plus longue que la partie, ou qui demande elle-même cet achat) :
    // refus nommé tout de suite (« attend d’abord la mission (…) », « Dépendance circulaire »), jamais 400 parties avec « manque 0 »
    if (purchases.length && activities.some(a => a.once) && r() < 0.3) purchases[purchases.length - 1].requires = [activities.find(a => a.once).id];
    const hourly = r() < 0.5 || !activities.length ? Math.round(r() * 50000) : 0;
    const goal = r() < 0.3 ? { goalPrice: 10000 + Math.round(r() * 500000) } : { target: 10000 + Math.round(r() * 500000), goalMeaning: H.pick(r, ['available', 'held', 'cumulative']) };
    const input = { capital, reserve, sessionMinutes: S, daysPerWeek: 1 + Math.floor(r() * 7), hourly, upkeepPerSession: S !== null && r() < 0.3 ? Math.round(r() * 2000) : 0, activities, purchases, ...goal };
    const res = E.missionPlan(input); safe(res); assert.equal(typeof res.valid, 'boolean');
    if (!res.valid) { assert.ok(typeof res.reason === 'string' && res.reason.length > 3, 'raison lisible'); continue; }
    ok += 1;
    if (res.reached) { assert.ok(res.purchases.every(x => x.owned), 'atteint ⇒ achats possédés : ' + JSON.stringify(input)); assert.equal(res.missing, 0); assert.deepEqual(res.unpaid, []); }
    // correctif lot 2 (ARI3-3) : avec l’argent du but en poche, « non atteint » ne peut venir que d’une obtention encore en cours (pendingAcquisitionMinutes > 0)
    else assert.ok(res.missing > 0 || res.missingUnits > 0 || res.pendingAcquisitionMinutes > 0, 'non atteint ⇒ manque > 0 ou obtention restante : ' + JSON.stringify(input));
    assert.ok(res.rules && Array.isArray(res.journal), 'journal et règles présents');
    if (res.journalComplete) { verified += 1; const v = E.missionVerify(res); assert.equal(v.valid, true, v.reason); assert.ok(v.ok === true || v.skipped === 'reach', 'plan rejeté : ' + JSON.stringify(v.violations) + ' ' + JSON.stringify(input)); }
    if (S !== null && !activities.length && !purchases.length && !input.upkeepPerSession && hourly > 0 && res.reached) {
      const flow = E.missionPlan({ ...input, sessionMinutes: null });
      if (flow.valid && flow.reached) { same += 1; near(res.totalMinutes, Math.ceil(flow.totalMinutes / S - 1e-9) * S); }
    }
  }
  assert.ok(ok > 150, 'plans valides : ' + ok); assert.ok(verified > 100, 'plans vérifiés : ' + verified); assert.ok(same > 10, 'parties = parcours arrondi : ' + same);
});

/* ---------- T2-35 : A, B, B bis, C ---------- */
test('T2-35 A : 16 parties de 30 min (480 min) ; B et B bis : deux B valent 60 000, A ne rentre pas ou rapporte moins ; C : le bien n’est pas de l’argent', () => {
  // A : 800 000 ÷ (100 000 × 30 ÷ 60 = 50 000 par partie) = 16 parties = 480 min ; parcours 8 h
  const a = E.missionPlan({ capital: 200000, reserve: 0, target: 1000000, hourly: 100000, sessionMinutes: 30 }); assert.equal(a.totalSessions, 16); near(a.totalMinutes, 480);
  near(E.missionPlan({ capital: 200000, reserve: 0, target: 1000000, hourly: 100000 }).totalMinutes, 480);
  // B : 30 min ; A 40 min → 100 000 (ne rentre pas) ; B 15 min → 30 000 ×2 = 60 000
  const b = E.missionPlan({ capital: 0, reserve: 0, target: 60000, sessionMinutes: 30, activities: [m({ id: 'A', name: 'A', reward: 100000, duration: 40 }), m({ id: 'B', name: 'B', reward: 30000, duration: 15 })] });
  assert.equal(b.reached, true); assert.equal(b.totalSessions, 1); assert.deepEqual(b.sessions[0].steps.map(x => [x.id, x.runs]), [['B', 2]]); near(b.finalCash, 60000);
  // B bis : A 20 min → 50 000 (150 000 $/h) ; deux B (120 000 $/h) donnent 60 000 > 50 000
  const bb = E.missionPlan({ capital: 0, reserve: 0, target: 60000, sessionMinutes: 30, activities: [m({ id: 'A', name: 'A', reward: 50000, duration: 20 }), m({ id: 'B', name: 'B', reward: 30000, duration: 15 })] });
  assert.equal(bb.totalSessions, 1); assert.deepEqual(bb.sessions[0].steps.map(x => [x.id, x.runs]), [['B', 2]]); near(bb.finalCash, 60000);
  // C : 500 000, bien 200 000 → 300 000 ; il manque 700 000 → 7 parties à 100 000 ; 1 000 000 $ à la fin (le bien n’est pas compté)
  const c = E.missionPlan({ capital: 500000, reserve: 0, target: 1000000, hourly: 100000, sessionMinutes: 60, purchases: [{ id: 'bien', name: 'Bien', price: 200000 }] });
  assert.equal(c.totalSessions, 7); near(c.finalCash, 1000000); assert.equal(c.purchases[0].owned, true); near(c.sessions[0].cashBefore, 300000);
  for (const r of [a, b, bb, c]) okVerify(E.missionVerify(r), 'référence');
});

/* ---------- T2-36 : achat de départ payé une fois (C7) ---------- */
test('T2-36 achat de départ : payé une seule fois (50 000, séparé des frais), puis 4 × 30 000 → 2 parties, 170 000 $', () => {
  // p1 : −50 000 + 30 000 + 30 000 → 110 000 ; p2 : +60 000 → 170 000 ≥ 150 000
  const r = E.missionPlan({ capital: 100000, reserve: 0, target: 150000, sessionMinutes: 60, activities: [m({ id: 'm', name: 'M', reward: 30000, duration: 30, investment: 50000 })] });
  assert.equal(r.reached, true); assert.equal(r.totalSessions, 2); near(r.finalCash, 170000); near(r.sessions[0].cashAfter, 110000);
  const ev = money(r.events); assert.equal(ev.length, 5);
  const inv = ev.filter(e => e.type === 'spend'); assert.equal(inv.length, 1); near(inv[0].amount, 50000); assert.equal(inv[0].asset, true); assert.equal(inv[0].unlocks, 'inv:m');
  assert.deepEqual(ev.filter(e => e.type === 'receive').map(e => e.amount), [30000, 30000, 30000, 30000]);
  assert.equal(r.journal.filter(e => e.unlocks === 'inv:m').length, 1, 'un seul déblocage de l’achat de départ');
  okVerify(E.missionVerify(r), 'achat de départ');
});

/* ---------- T2-37 : temps actif et temps d’obtention (C3c) ---------- */
test('T2-37 « un million » : 240 min en tout (inchangé), 220 actives, 20 d’obtention (12 + 8)', () => {
  const r = E.missionPlan({ capital: 100000, reserve: 20000, goalMeaning: 'held', target: 1000000,
    purchases: [{ id: 'v', name: 'Véhicule requis', price: 60000, minutes: 12 }, { id: 'w', name: 'Arme requise', price: 10000, minutes: 8 }],
    activities: [{ id: 'u', name: 'Déblocage', reward: 0, cost: 0, duration: 10, once: true }, { id: 'm', name: 'Mission répétable', reward: 150000, cost: 5000, duration: 30, requiresPurchaseIds: ['v', 'w'], requiresMissions: ['u'] }] });
  assert.equal(r.valid, true); assert.equal(r.reached, true); near(r.totalMinutes, 240); near(r.activeMinutes, 220); near(r.acquisitionMinutes, 20); near(r.finalCash, 1045000);
  okVerify(E.missionVerify(r), 'un million');
});

/* ---------- T2-38 : cas limites ---------- */
test('T2-38 cas limites : but couvert, achat à 0 $, réserve = argent, partie de 1 min, 1 000 milliards, gain nul, temps nul, action trop longue, manque et impayés', () => {
  // but couvert : 100 000 ≥ 50 000 → 0 partie / 0 min, journal réduit au contrôle 0 (ou vide en parcours), atteinte à 0
  const s0 = E.missionPlan({ capital: 100000, reserve: 0, target: 50000, hourly: 10000, sessionMinutes: 60 });
  assert.equal(s0.reached, true); assert.equal(s0.totalSessions, 0); assert.equal(s0.totalMinutes, 0); assert.deepEqual(s0.events, []); assert.ok(s0.journal.length <= 1 && s0.journal.every(e => e.kind === 'check' && e.at === 0));
  const v0 = E.missionVerify(s0); okVerify(v0, 'couvert'); assert.equal(v0.reachedAt, 0);
  const f0 = E.missionPlan({ capital: 100000, reserve: 0, target: 50000, hourly: 10000 }); assert.equal(f0.reached, true); assert.equal(f0.totalMinutes, 0); assert.ok(f0.journal.length <= 1); assert.equal(E.missionVerify(f0).reachedAt, 0);
  // achat à 0 $ : acheté aussitôt ; 1 000 → 2 000 à 1 000 $/h → 1 partie
  const z = E.missionPlan({ capital: 1000, reserve: 0, target: 2000, hourly: 1000, sessionMinutes: 60, purchases: [{ id: 'z', name: 'Z', price: 0 }] });
  assert.equal(z.valid, true); assert.equal(z.purchases[0].owned, true); assert.equal(z.purchases[0].atMinute, 0); assert.equal(z.totalSessions, 1); okVerify(E.missionVerify(z), 'achat à 0');
  // réserve = argent : accepté ; 50 000 gardés, but 10 000 disponibles → 60 000 → 1 h ; réserve > argent : refusé
  const eq = E.missionPlan({ capital: 50000, reserve: 50000, target: 10000, hourly: 10000, sessionMinutes: 60 }); assert.equal(eq.reached, true); assert.equal(eq.totalSessions, 1); near(eq.finalCash, 60000);
  near(E.missionPlan({ capital: 50000, reserve: 50000, target: 10000, hourly: 10000 }).totalMinutes, 60);
  const over = E.missionPlan({ capital: 50000, reserve: 60000, target: 10000, hourly: 10000 }); assert.equal(over.valid, false); assert.match(over.reason, /dépasse/);
  // partie de 1 min à 60 000 $/h = 1 000 par partie → 1 partie, jour 1
  const one = E.missionPlan({ capital: 0, reserve: 0, target: 1000, hourly: 60000, sessionMinutes: 1 }); assert.equal(one.totalSessions, 1); assert.equal(one.days, 1); near(one.finalCash, 1000);
  // très grand : 1 000 milliards en 1 partie à 1 000 milliards par heure ; au-delà du plafond : refus lisible, jamais NaN
  const big = E.missionPlan({ capital: 0, reserve: 0, target: 1e12, hourly: 1e12, sessionMinutes: 60 }); assert.equal(big.valid, true); assert.equal(big.totalSessions, 1); near(big.finalCash, 1e12); safe(big); okVerify(E.missionVerify(big), 'très grand');
  const huge = E.missionPlan({ capital: 0, reserve: 0, target: 1e13, hourly: 1e12, sessionMinutes: 60 }); assert.equal(huge.valid, false); assert.equal(typeof huge.reason, 'string'); safe(huge);
  // gain nul ou inconnu, sans mission ni achat qui rapporte : refus nommé (une inconnue n’est pas 0)
  for (const hourly of [0, null, undefined]) { const g = E.missionPlan({ capital: 100, reserve: 0, target: 1000, hourly, sessionMinutes: 60 }); assert.equal(g.valid, false); assert.match(g.reason, /comment tu gagnes|ce que tu gagnes par heure/, 'refus nommé pour ' + hourly); }
  // temps nul : refus ; action trop longue pour la partie : refus
  const t0 = E.missionPlan({ capital: 0, reserve: 0, target: 1000, hourly: 1000, sessionMinutes: 0 }); assert.equal(t0.valid, false); assert.match(t0.reason, /durée d’une partie/);
  const long = E.missionPlan({ capital: 0, reserve: 0, target: 1000, sessionMinutes: 60, activities: [m({ reward: 1000, duration: 90 })] }); assert.equal(long.valid, false); assert.match(long.reason, /ne rentre/);
  // but non atteint en 400 parties : manque chiffré ; achat impayé compté dans le manque et listé
  const far = E.missionPlan({ capital: 0, reserve: 0, target: 1e9, hourly: 1000, sessionMinutes: 60 }); assert.equal(far.valid, true); assert.equal(far.reached, false); assert.equal(far.totalSessions, 400); near(far.finalCash, 400000); near(far.missing, 999600000); assert.deepEqual(far.unpaid, []);
  // 400 parties à 1 $/h → 400 $ ; manque = 1 000 + 1 000 000 000 (Q impayé) − 400 = 1 000 000 600
  const un = E.missionPlan({ capital: 0, reserve: 0, target: 1000, hourly: 1, sessionMinutes: 60, purchases: [{ id: 'q', name: 'Q', price: 1e9 }] });
  assert.equal(un.valid, true); assert.equal(un.reached, false); near(un.missing, 1000000600); assert.deepEqual(un.unpaid, [{ id: 'q', name: 'Q', price: 1e9 }]);
  for (const r of [s0, f0, z, eq, over, one, big, huge, t0, long, far, un]) safe(r);
});

/* ---------- règles et journal : forme du contrat ---------- */
test('contrat : journal daté en absolu avec numéro de partie, règles rendues, événements compatibles (t relatif, type, label, cash)', () => {
  const r = E.missionPlan({ capital: 90000, reserve: 10000, target: 50000, goalMeaning: 'available', hourly: 10000, sessionMinutes: 60, purchases: chainAB() });
  assert.deepEqual(r.rules.after, ['a', 'b']); assert.deepEqual(r.rules.owned0, []); near(r.rules.reserve, 10000); near(r.rules.sessionMinutes, 60); near(r.rules.hourly, 10000); assert.equal(r.rules.meaning, 'available'); near(r.rules.goalMoney, 50000); assert.equal(r.rules.goalPrice, null); assert.equal(r.rules.units, false);
  assert.deepEqual(r.rules.purchases.map(x => x.id), ['a', 'b']);
  // partie 2 : gain par heure à t = 60 (relatif), à = 120 (absolu), partie 2 ; achat B juste après, à 120
  const p2 = money(r.events).find(e => e.session === 2 && e.passive); assert.ok(p2); near(p2.t, 60); near(p2.at, 120); assert.equal(p2.type, 'receive'); near(p2.cash, 80000);
  const bB = money(r.events).find(e => e.asset && e.id === 'b'); assert.ok(bB); near(bB.at, 120); assert.equal(bB.session, 2); assert.equal(bB.type, 'spend'); near(bB.cash, 10000); assert.match(bB.label, /B/);
  const checks = r.journal.filter(e => e.kind === 'check'); assert.equal(checks[0].at, 0); assert.equal(checks[0].session, 0); assert.equal(checks.length, 8); near(checks[7].at, 420);
  const chk = r.journal.filter(e => e.kind === 'check').map(e => e.at); assert.deepEqual(chk, [0, 60, 120, 180, 240, 300, 360, 420]);
  assert.ok(r.journal.every(e => e.kind ? Number.isFinite(e.at) : Number.isFinite(e.at) && Number.isFinite(e.t)), 'chaque entrée est datée');
});

/* ---------- correctifs de la revue contradictoire du lot 2 (tour 1) : ARI-1, ARI-2/REG-1, ARI-3, REG-2/PER-2 ---------- */
test('ARI-1 un achat d’avant gratuit (0 $) avec un coût d’usage passe le vérificateur (R10) : 2 parties, 128 000 $ ; gratuit à obtenir aussi', () => {
  // P gratuit payé à 0 (aucune dépense à 0 $ dans le journal) ; chaque partie : +60 000 − 1 000 = +59 000 ; 10 000 + 59 000 n ≥ 100 000 → n = 2 ;
  // 10 000 + 2 × 59 000 = 128 000 $ ; dépenses de chaque partie = 0 (dépenses par partie) + 1 000 (usage de P, possédé dès t = 0)
  const r = E.missionPlan({ capital: 10000, reserve: 0, target: 100000, hourly: 60000, sessionMinutes: 60, purchases: [{ id: 'p', name: 'P', price: 0, usagePerSession: 1000 }] });
  assert.equal(r.valid, true, r.reason); assert.equal(r.totalSessions, 2); near(r.finalCash, 128000); assert.equal(r.purchases[0].owned, true);
  assert.deepEqual(r.sessions.map(x => x.upkeep), [1000, 1000]); assert.equal(money(r.journal).filter(e => e.asset).length, 0, 'aucune dépense à 0 $ inscrite');
  okVerify(E.missionVerify(r), 'achat gratuit avec coût d’usage'); // avant le correctif : R10 à chaque point de contrôle (le coût d’usage n’était compté qu’à une dépense asset)
  // deux achats gratuits à obtenir : A (60 min) puis B (30 min, 1 000 $/partie d’usage), tous deux payés à 0 ; l’usage de B compte dès la partie 1
  // (règle du moteur : dès le paiement) ; p1 : obtention de A, gain 0, −1 000 → 9 000 ; p2 : obtention de B 30 min, +30 000 − 1 000 → 38 000 ;
  // p3… : +59 000 → 97 000, 156 000, 215 000, 274 000, 333 000 ≥ 300 000 → 7 parties, 333 000 $
  const q = E.missionPlan({ capital: 10000, reserve: 0, target: 300000, hourly: 60000, sessionMinutes: 60, purchases: [{ id: 'a', name: 'A', price: 0, minutes: 60 }, { id: 'b', name: 'B', price: 0, minutes: 30, usagePerSession: 1000 }] });
  assert.equal(q.valid, true, q.reason); assert.equal(q.totalSessions, 7); near(q.finalCash, 333000); near(q.sessions[0].passive, 0); near(q.sessions[1].passive, 30000);
  assert.deepEqual(q.sessions.map(x => x.upkeep), [1000, 1000, 1000, 1000, 1000, 1000, 1000]);
  okVerify(E.missionVerify(q), 'achats gratuits à obtenir');
  // le vérificateur reste exigeant : la dépense de la partie 1 retirée → R10 ; un achat gratuit payant d’usage sans sa dépense de partie → R10
  const bad = dc(r); bad.journal = bad.journal.filter(e => !(e.upkeep && e.session === 1)); has(E.missionVerify(bad), 'R10');
  const bad2 = dc(q); bad2.journal.find(e => e.upkeep && e.session === 2).amount = 500; has(E.missionVerify(bad2), 'R10');
  // achat payant à obtenir (comparaison, inchangé) : A 5 000 $ (60 min, 1 000 $/partie d’usage) payé à 0 → 5 000 ; p1 : obtention, gain 0, −1 000 → 4 000 ;
  // puis +59 000 par partie : 4 000 + 59 000 n ≥ 300 000 → n = 6 → 7 parties en tout, 4 000 + 6 × 59 000 = 358 000 $
  const w = E.missionPlan({ capital: 10000, reserve: 0, target: 300000, hourly: 60000, sessionMinutes: 60, purchases: [{ id: 'a', name: 'A', price: 5000, minutes: 60, usagePerSession: 1000 }] });
  assert.equal(w.totalSessions, 7); near(w.finalCash, 358000); assert.equal(money(w.journal).filter(e => e.asset).length, 1); okVerify(E.missionVerify(w), 'achat payant à obtenir');
  safe(r); safe(q); safe(w);
});

test('ARI-2 / REG-1 dépenses par partie qui mangent le gain : Quoi acheter d’abord ? dit la vraie cause (phrase de Mon objectif), jamais « doit être un nombre » ni un gain négatif', () => {
  const EATS = 'Tes dépenses par partie mangent tout ce que tu gagnes : baisse-les ou gagne plus par heure.';
  // état CALC-02 : 200 000 $, 20 000 de côté, 100 000 $/h, partie 60 min ; 150 000 $/partie → net = 100 000 − 150 000 × 60 ÷ 60 = −50 000 $/h ;
  // Emperor 250 000 : il manque 70 000 $ et rien ne rentre → aucun ordre possible ; la case « gain par heure » est juste : la cause est les dépenses
  const s = base(); s.goal.upkeepPerSession = 150000;
  near(B.hourlyNet(s).net, -50000); assert.equal(B.orderInput(s).hourly, 0, 'E.order reçoit 0, jamais un gain négatif');
  const r = B.evaluate('order', s, [], { catalogue }); assert.equal(r.valid, false); assert.equal(flat(r.reason), flat(EATS)); assert.doesNotMatch(r.reason, /doit être un nombre/);
  const x = B.analysis('order', s, [], { catalogue }).explain;
  assert.doesNotMatch(JSON.stringify(x), /-50 000|−50 000|-50 000/); assert.ok(!x.drivers.some(d => d.label === 'Gain net'), 'aucun driver « Gain net » négatif');
  assert.equal(x.missing.filter(k => flat(k.text) === flat(EATS)).length, 1, 'la cause est dite une seule fois : ' + JSON.stringify(x.missing));
  // 1 000 $/h et 2 000 $/partie de 60 min → net −1 000 : même réponse ; gain 0 sans dépenses : phrase d’E.order inchangée
  const t = base(); t.goal.hourly = 1000; t.goal.upkeepPerSession = 2000; assert.equal(flat(B.evaluate('order', t, [], { catalogue }).reason), flat(EATS));
  const z = base(); z.goal.hourly = 0; z.goal.upkeepPerSession = null; assert.match(B.evaluate('order', z, [], { catalogue }).reason, /Tu ne gagnes rien par heure/);
  // net ≤ 0 mais tout est payable tout de suite : 700 000 − 20 000 ≥ 250 000 puis 450 000 − 20 000 ≥ 400 000 → 0 h d’attente, et la cause reste dite (non bloquante)
  const a = base(); a.goal.capital = 700000; a.goal.upkeepPerSession = 150000;
  const ra = B.evaluate('order', a, [], { catalogue }); assert.equal(ra.valid, true, ra.reason); near(ra.totalHours, 0);
  const xa = B.analysis('order', a, [], { catalogue }).explain;
  assert.ok(xa.missing.some(k => flat(k.text) === flat(EATS) && k.decisive === false && k.field === 'f-goal-upkeepPerSession'), JSON.stringify(xa.missing)); assert.doesNotMatch(JSON.stringify(xa), /-50 000|−50 000/);
  // gain net positif : driver « Gain net » inchangé (T2-30 : 99 000 $)
  const g = base(); g.goal.upkeepPerSession = 1000; assert.ok(B.analysis('order', g, [], { catalogue }).explain.drivers.some(d => d.label === 'Gain net' && /99 000/.test(flat(d.text))));
  // la réserve qui dépasse l’argent garde sa propre raison (le remplacement ne vise que le blocage de l’attente)
  const v = base(); v.goal.reserve = 300000; v.goal.upkeepPerSession = 150000; const rv = B.evaluate('order', v, [], { catalogue }); assert.equal(rv.valid, false); assert.doesNotMatch(flat(rv.reason), /mangent/);
});

test('ARI-3 le gain par heure court pendant une mission « une fois » en parcours, comme en parties : 60 min et 60 000 $ dans les deux modes (et non 120 min)', () => {
  // U : 60 min, 0 $, une fois ; 60 000 $/h pendant U → 60 000 ; but 60 000 disponibles → atteint à 60 min ; en parties : 1 partie (gain de la partie 60 000)
  const once = [{ id: 'u', name: 'U', reward: 0, duration: 60, once: true }];
  const f = E.missionPlan({ capital: 0, reserve: 0, target: 60000, hourly: 60000, activities: once });
  assert.equal(f.valid, true, f.reason); near(f.totalMinutes, 60); near(f.finalCash, 60000); near(f.activeMinutes, 60); near(f.earned, 60000);
  const pas = money(f.journal).filter(e => e.passive); assert.equal(pas.length, 1); near(pas[0].amount, 60000); near(pas[0].minutes, 60); near(pas[0].at, 60);
  const g = E.missionPlan({ capital: 0, reserve: 0, target: 60000, hourly: 60000, sessionMinutes: 60, activities: once });
  assert.equal(g.totalSessions, 1); near(g.finalCash, 60000); near(g.totalMinutes, f.totalMinutes);
  okVerify(E.missionVerify(f), 'parcours'); okVerify(E.missionVerify(g), 'parties');
  // mission « une fois » de 10 min à 20 000 $ puis gain continu : 20 000 + 10 000 × 10 ÷ 60 = 21 666,67 ; reste 78 333,33 à 10 000 $/h = 470 min → 480 min, 100 000 $
  const h = E.missionPlan({ capital: 0, reserve: 0, target: 100000, hourly: 10000, activities: [{ id: 'd', name: 'D', reward: 20000, duration: 10, once: true }] });
  assert.equal(h.valid, true, h.reason); near(h.totalMinutes, 480); near(h.finalCash, 100000); okVerify(E.missionVerify(h), 'une fois puis gain continu');
  // sans gain par heure, rien ne change : M (T2-18) 55 000 $ ; « un million » (T2-37) 240 min
  near(E.missionPlan(M18(null)).finalCash, 55000);
  safe(f); safe(g); safe(h);
});

test('REG-2 / PER-2 but à 0 $ qui rapporte : aucun « ? » (phrase sans remboursement) ; remboursement lu du moteur seulement (12 h), jamais recalculé par l’affichage', () => {
  const mk = (price, boost) => { const s = base(); s.tab = 'plan'; s.plan = B.copy(B.planTemplate); s.plan.goal = { ...s.plan.goal, kind: 'purchase', name: 'Truc', price, boostHourly: boost }; s.plan.situation = { ...s.plan.situation, capital: 100000, reserve: 0, hourly: 50000, dailyMinutes: 60, daysPerWeek: 5 }; return B.validate(s, initial); };
  // prix 0 : le but est déjà possible (0 partie) ; aucun délai fini (C6 : jamais « 0 h ») → phrase P6 sans parenthèse, aucun « ? »
  const a = B.analysis('plan', mk(0, 20000)); assert.equal(a.result.valid, true, a.result.reason); assert.equal(a.result.goalPaybackHours, null); assert.equal(a.result.totalSessions, 0);
  const ex = a.explain.excluded.find(e => e.id === 'gain-en-plus'); assert.ok(ex, JSON.stringify(a.explain.excluded));
  assert.doesNotMatch(flat(ex.why), /\?|remboursé/); assert.match(flat(ex.why), /arrive après le but/);
  for (const d of a.explain.drivers.concat(a.explain.missing)) assert.doesNotMatch(flat(d.text), /remboursé après \?/);
  // prix 600 000 à 50 000 $/h de gain après le but : 600 000 ÷ 50 000 = 12 h (valeur du moteur) ; 100 000 → 600 000 à 50 000 $/h = 10 parties
  const b = B.analysis('plan', mk(600000, 50000)); assert.equal(b.result.totalSessions, 10); near(b.result.goalPaybackHours, 12);
  assert.match(flat(b.explain.excluded.find(e => e.id === 'gain-en-plus').why), /remboursé après 12 h/);
  // plan non calculable (gain 0, aucune mission) : aucun remboursement inventé par l’affichage
  const c = mk(600000, 50000); c.plan.situation.hourly = 0; const xc = B.analysis('plan', B.validate(c, initial)); assert.equal(xc.result.valid, false);
  const exc = xc.explain.excluded.find(e => e.id === 'gain-en-plus'); assert.ok(exc); assert.doesNotMatch(flat(exc.why), /\?|remboursé/);
});

/* ---------- Correctifs du tour 2 de la revue contradictoire (ARI2-1 à ARI2-7) : valeurs à la main ---------- */
test('ARI2-1 achat d’avant jamais payable : refus nommé tout de suite, identique dans les deux modes (ordre de la liste, mission « une fois » trop longue), jamais « réduis le but » avec l’argent du but en poche', () => {
  const STUCK_AB = 'L’achat « A » attend d’abord un achat (B), qui ne peut pas se faire.';
  // moteur seul : A (10 000) demande B (10 000) listé après lui ; l’ordre donné est tenu (rien ne s’achète tant que A attend) → B jamais payé → A jamais payable.
  // 100 000 $ en poche, but 50 000 disponibles : l’argent du but est là dès le départ. Avant : parties → 400 parties, 4 100 000 $, « manque 0 » ; parcours → refus.
  for (const S of [60, null]) {
    const r = E.missionPlan({ capital: 100000, reserve: 0, sessionMinutes: S, hourly: 10000, target: 50000, purchases: [{ id: 'a', name: 'A', price: 10000, requires: ['b'] }, { id: 'b', name: 'B', price: 10000 }] });
    assert.equal(r.valid, false); assert.equal(flat(r.reason), flat(STUCK_AB)); assert.ok(!r.sessions || !r.sessions.length, 'aucune partie jouée'); safe(r);
  }
  // chemin page (sonde s5 §1) : 200 000 $, but 300 000 disponibles, partie 60 min ; achats d’avant [Hangar 20 000 demande la mission « Installation »] puis [Avion 50 000] ;
  // « Installation » (une fois, 10 min, +1 000) demande Avion ; « Courses » 10 min / 20 000. Hangar attend Installation, qui attend Avion, listé après Hangar.
  const mk = (daily, swap) => { const s = base(); s.plan.goal = { ...s.plan.goal, kind: 'amount', target: 300000, meaning: 'available' }; s.plan.source = 'missions'; s.plan.situation = { ...s.plan.situation, capital: 200000, reserve: 0, hourly: 0, dailyMinutes: daily };
    s.plan.missions = [{ ...B.copy(B.planMissionTemplate), id: 'm-1', name: 'Installation', reward: 1000, duration: 10, once: true, requires: ['p-2'] }, { ...B.copy(B.planMissionTemplate), id: 'm-2', name: 'Courses', reward: 20000, duration: 10 }];
    const pre = [{ ...B.copy(B.planPrereqTemplate), id: 'p-1', name: 'Hangar', price: 20000, requires: ['m-1'] }, { ...B.copy(B.planPrereqTemplate), id: 'p-2', name: 'Avion', price: 50000 }]; s.plan.prerequisites = swap ? [pre[1], pre[0]] : pre; return B.validate(s, initial); };
  const STUCK_H = 'L’achat « Hangar » attend d’abord la mission (Installation), qui ne peut pas se faire.';
  const rp = B.evaluate('plan', mk(60, false)), rf = B.evaluate('plan', mk(null, false));
  assert.equal(rp.valid, false); assert.equal(flat(rp.reason), flat(STUCK_H)); assert.equal(rf.valid, false); assert.equal(flat(rf.reason), flat(STUCK_H));
  assert.doesNotMatch(rp.reason + rf.reason, /réduis le but|400 parties|20000 étapes/);
  // Avion listé avant Hangar : Avion à 0 (→ 150 000) ; p1 : Installation 10 min (+1 000 → 151 000) puis Courses ×5 (+100 000 → 251 000), Hangar après p1 (→ 231 000) ;
  // p2 : Courses ×6 (+120 000) → 351 000 ≥ 300 000 : 2 parties, 351 000 $
  const ok = B.evaluate('plan', mk(60, true)); assert.equal(ok.valid, true, ok.reason); assert.equal(ok.totalSessions, 2); near(ok.finalCash, 351000);
  // sonde s5 §2 : partie de 30 min, Garage (10 000) demande « Longue mission » (une fois, 45 min) qui ne tiendra jamais dans une partie ; Courses 10 min / 20 000 ;
  // but : achat 100 000 avec 50 000 $. Parties : refus nommé (avant : « réduis le but » après 400 parties, 24 050 000 $ en poche).
  const g = base(); g.plan.goal = { ...g.plan.goal, kind: 'purchase', name: 'Voiture', price: 100000, boostHourly: 0 }; g.plan.source = 'missions'; g.plan.situation = { ...g.plan.situation, capital: 50000, reserve: 0, hourly: 0, dailyMinutes: 30 };
  g.plan.missions = [{ ...B.copy(B.planMissionTemplate), id: 'm-1', name: 'Longue mission', reward: 30000, duration: 45, once: true }, { ...B.copy(B.planMissionTemplate), id: 'm-2', name: 'Courses', reward: 20000, duration: 10 }];
  g.plan.prerequisites = [{ ...B.copy(B.planPrereqTemplate), id: 'p-1', name: 'Garage', price: 10000, requires: ['m-1'] }];
  const gs = B.validate(g, initial), rg = B.evaluate('plan', gs); assert.equal(rg.valid, false); assert.equal(flat(rg.reason), flat('L’achat « Garage » attend d’abord la mission (Longue mission), qui ne peut pas se faire.'));
  // en parcours, la même mission de 45 min se joue : Longue mission (45 min, +30 000 → 80 000), Garage (−10 000 → 70 000), Courses ×2 (→ 110 000 ≥ 100 000) : 65 min, 110 000 $
  gs.plan.situation.dailyMinutes = null; const rgf = B.evaluate('plan', gs); assert.equal(rgf.valid, true, rgf.reason); near(rgf.totalMinutes, 65); near(rgf.finalCash, 110000);
  // sonde s2b (cas 136, simplifié) : P0 (14 777) demande M1 (une fois, 34 min) avec des parties de 30 min ; M0 demande P0 ; 43 268 $/h → refus nommé, plus jamais « manque 0 »
  const z = E.missionPlan({ capital: 110035, reserve: 47171, sessionMinutes: 30, hourly: 43268, goalPrice: 107085, activities: [m({ id: 'm0', name: 'M0', reward: 40317, cost: 4827, duration: 37, prep: 4, requiresPurchaseIds: ['p0'] }), m({ id: 'm1', name: 'M1', reward: 29495, duration: 34, cooldown: 32, once: true })], purchases: [{ id: 'p0', name: 'P0', price: 14777, requires: ['m1'], usagePerSession: 383 }] });
  assert.equal(z.valid, false); assert.equal(flat(z.reason), flat('L’achat « P0 » attend d’abord la mission (M1), qui ne peut pas se faire.'));
  // filet : une exigence possible mais jamais faite en 400 parties (mission « une fois » à 10 000 000 $ de frais, 10 000 $/h → au plus 4 100 000 $) : le plan reste une
  // recherche interrompue (valide, non atteint, 400 parties, 4 100 000 $) mais la note nomme l’achat qui attend, jamais « réduis le but »
  const f = E.missionPlan({ capital: 100000, reserve: 0, sessionMinutes: 60, hourly: 10000, target: 50000, activities: [m({ id: 'u', name: 'U', reward: 10000001, cost: 10000000, duration: 10, once: true })], purchases: [{ id: 'a', name: 'A', price: 10000, requires: ['u'] }] });
  assert.equal(f.valid, true, f.reason); assert.equal(f.reached, false); assert.equal(f.totalSessions, 400); near(f.finalCash, 4100000);
  assert.equal(flat(f.note), flat('L’achat « A » attend d’abord la mission (U), qui ne peut pas se faire.')); assert.doesNotMatch(f.note, /réduis le but/); safe(f);
  // une exigence qui devient possible n’est jamais refusée à tort : U coûte 150 000 (rapporte 160 000) ; p1–p5 : +10 000 par partie → 150 000 ; p6 : U (−150 000 + 160 000)
  // + 10 000 → 170 000, puis A après p6 (→ 160 000 ≥ 50 000) : 6 parties, 160 000 $
  const y = E.missionPlan({ capital: 100000, reserve: 0, sessionMinutes: 60, hourly: 10000, target: 50000, activities: [m({ id: 'u', name: 'U', reward: 160000, cost: 150000, duration: 10, once: true })], purchases: [{ id: 'a', name: 'A', price: 10000, requires: ['u'] }] });
  assert.equal(y.valid, true, y.reason); assert.equal(y.reached, true); assert.equal(y.totalSessions, 6); near(y.finalCash, 160000); assert.equal(y.purchases[0].atSession, 6); okVerify(E.missionVerify(y), 'exigence devenue possible');
});

test('ARI2-2 stratégie qui retire un achat d’avant : la raison nomme l’achat retiré (« un achat (Hangar) »), jamais un identifiant (planInput transmet les noms)', () => {
  // 100 000 $, but 300 000 disponibles, 50 000 $/h, partie 60 min ; Hangar (20 000, 0 $/h) puis Avion (50 000, +10 000 $/h, demande Hangar). « Seulement les achats qui
  // rapportent » retire Hangar : Avion attend un achat retiré → phrase existante avec le nom (avant : « Référence absente : « p-1 » n’existe pas dans les données. »)
  const s = base(); s.plan.goal = { ...s.plan.goal, kind: 'amount', target: 300000, meaning: 'available' }; s.plan.situation = { ...s.plan.situation, capital: 100000, reserve: 0, hourly: 50000, dailyMinutes: 60 };
  s.plan.prerequisites = [{ ...B.copy(B.planPrereqTemplate), id: 'p-1', name: 'Hangar', price: 20000, boostHourly: 0 }, { ...B.copy(B.planPrereqTemplate), id: 'p-2', name: 'Avion', price: 50000, boostHourly: 10000, requires: ['p-1'] }];
  const st = B.validate(s, initial), STUCK = 'L’achat « Avion » attend d’abord un achat (Hangar), qui ne peut pas se faire.';
  const cand = B.planStrategies(st).candidates.find(c => c.id === 'skipNoBoost'); assert.ok(cand); assert.equal(cand.valid, false); assert.equal(flat(cand.reason), flat(STUCK));
  st.plan.strategy = 'skipNoBoost'; const r = B.evaluate('plan', st); assert.equal(r.valid, false); assert.equal(flat(r.reason), flat(STUCK)); assert.doesNotMatch(r.reason, /\bp-\d|Référence absente/);
  // auto : l’ordre donné reste valide : 100 000 − 20 000 − 50 000 = 30 000 à 0 ; +60 000 par partie (50 000 + 10 000) → 30 000 + 60 000 n ≥ 300 000 → 5 parties, 330 000 $
  st.plan.strategy = 'auto'; const a = B.evaluate('plan', st); assert.equal(a.valid, true, a.reason); assert.equal(a.totalSessions, 5); near(a.finalCash, 330000);
  // variante : « Braquage » demande l’achat « Garage », retiré par « Directement vers mon but » → « demande d’abord un achat (Garage) », jamais « (p-1) »
  const v = base(); v.plan.goal = { ...v.plan.goal, kind: 'amount', target: 300000, meaning: 'available' }; v.plan.source = 'missions'; v.plan.situation = { ...v.plan.situation, capital: 100000, reserve: 0, hourly: 0, dailyMinutes: 60 };
  v.plan.missions = [{ ...B.copy(B.planMissionTemplate), id: 'm-1', name: 'Braquage', reward: 50000, duration: 30, requires: ['p-1'] }]; v.plan.prerequisites = [{ ...B.copy(B.planPrereqTemplate), id: 'p-1', name: 'Garage', price: 50000 }];
  const vs = B.validate(v, initial); vs.plan.strategy = 'direct'; const d = B.evaluate('plan', vs); assert.equal(d.valid, false); assert.match(flat(d.reason), /demande d’abord un achat \(Garage\)/); assert.doesNotMatch(d.reason, /\bp-\d/);
  const inp = B.planInput(vs); assert.deepEqual(inp.knownNames, { 'p-1': 'Garage', 'm-1': 'Braquage' }); assert.deepEqual(inp.knownMissions, ['m-1']);
});

test('ARI2-3 but en points non atteint en 400 parties : la portée dit les points qui manquent (« 0 sur 100 points ; il manquerait 100 points »), l’argent seulement si le but a un prix', () => {
  // 100 points, 0 $, parties de 30 min ; « Longue » (33 min, 10 points) ne tient jamais dans une partie ; « Courte » (5 min, 1 000 $, 0 point) ×6 par partie
  // → 400 parties, 0 point, 400 × 6 000 = 2 400 000 $ (l’argent n’est pas le but : il n’est pas écrit)
  const s = base(); s.plan.goal = { ...s.plan.goal, kind: 'unlock', name: 'Rang', targetUnits: 100, currentUnits: 0, unitLabel: 'points', alsoPrice: null }; s.plan.source = 'missions'; s.plan.situation = { ...s.plan.situation, capital: 0, reserve: 0, hourly: 0, dailyMinutes: 30 };
  s.plan.missions = [{ ...B.copy(B.planMissionTemplate), id: 'm-1', name: 'Longue', reward: 1000, duration: 33, units: 10 }, { ...B.copy(B.planMissionTemplate), id: 'm-2', name: 'Courte', reward: 1000, duration: 5, units: 0 }];
  const st = B.validate(s, initial), e = B.evaluate('plan', st);
  assert.equal(e.valid, false); assert.equal(e.strategies.candidates.find(x => x.id === 'asIs').unreached, true); assert.match(flat(e.reason), /Après 400 parties, tu aurais 0 sur 100 points ; il manquerait 100 points\./); assert.doesNotMatch(flat(e.reason), /\$/);
  // avec un prix en plus (5 000 000 $) : l’argent compte aussi : 2 400 000 $ en poche, il manquerait 5 000 000 − 2 400 000 = 2 600 000 $ et 100 points
  const p = B.validate({ ...st, plan: { ...st.plan, goal: { ...st.plan.goal, alsoPrice: 5000000 } } }, initial), e2 = B.evaluate('plan', p);
  assert.match(flat(e2.reason), /tu aurais 2 400 000 \$ et 0 sur 100 points ; il manquerait 2 600 000 \$ et 100 points\./);
  // l’étiquette de l’unité est celle de l’état ; un but en argent garde la phrase du lot 2 (T2-25 : « il manquerait 49 600 000 $ »)
  const q = B.validate({ ...st, plan: { ...st.plan, goal: { ...st.plan.goal, alsoPrice: null, unitLabel: 'XP' } } }, initial); assert.match(flat(B.evaluate('plan', q).reason), /0 sur 100 XP ; il manquerait 100 XP\./);
  const c = B.planStrategies(st).candidates.find(x => x.id === 'asIs'); assert.match(flat(c.unreachedNote), /il manquerait 100 points/);
});

test('ARI2-4 plan de secours « Seulement « X » » : une mission retirée reste « la mission (…) », jamais « un achat (…) », dans les deux modes', () => {
  // 100 000 $, but 400 000 ; Garage (50 000) demande la mission « Déblocage » (une fois, 10 min, 1 000) ; Courses 10 min / 20 000. Le plan « Seulement « Courses » »
  // retire Déblocage : Garage attend une mission qui n’est plus dans le plan → refus nommé immédiat (avant : « un achat (Déblocage) » en parties, 20 000 étapes en parcours)
  const STUCK = 'L’achat « Garage » attend d’abord la mission (Déblocage), qui ne peut pas se faire.';
  const input = { capital: 100000, reserve: 0, sessionMinutes: null, hourly: 0, target: 400000, purchases: [{ id: 'p', name: 'Garage', price: 50000, requires: ['u'] }], activities: [m({ id: 'u', name: 'Déblocage', reward: 1000, duration: 10, once: true }), m({ id: 'x', name: 'Courses', reward: 20000, duration: 10 })] };
  for (const S of [null, 60]) { const alt = E.missionAlternatives({ ...input, sessionMinutes: S }); assert.equal(alt.valid, true, alt.reason); const only = alt.plans.find(p => p.id === 'only-x'); assert.ok(only); assert.equal(only.valid, false); assert.equal(flat(only.reason), flat(STUCK)); }
  // plan complet en parcours : Déblocage (10 min, +1 000 → 101 000), Garage (→ 51 000), puis Courses : 51 000 + 20 000 k ≥ 400 000 → k = 18 → 10 + 180 = 190 min, 411 000 $
  const all = E.missionPlan(input); assert.equal(all.reached, true); near(all.totalMinutes, 190); near(all.finalCash, 411000);
  // par la page (planAlternatives) : même phrase pour « Seulement « Courses » »
  const s = base(); s.plan.goal = { ...s.plan.goal, kind: 'amount', target: 400000, meaning: 'available' }; s.plan.source = 'missions'; s.plan.situation = { ...s.plan.situation, capital: 100000, reserve: 0, hourly: 0, dailyMinutes: null };
  s.plan.missions = [{ ...B.copy(B.planMissionTemplate), id: 'm-1', name: 'Déblocage', reward: 1000, duration: 10, once: true }, { ...B.copy(B.planMissionTemplate), id: 'm-2', name: 'Courses', reward: 20000, duration: 10 }];
  s.plan.prerequisites = [{ ...B.copy(B.planPrereqTemplate), id: 'p-1', name: 'Garage', price: 50000, requires: ['m-1'] }];
  const st = B.validate(s, initial), r = B.evaluate('plan', st); assert.equal(r.valid, true, r.reason); near(r.totalMinutes, 190);
  const pa = B.planAlternatives(st, r), oc = pa.plans.find(p => p.id === 'only-m-2'); assert.ok(oc, JSON.stringify(pa.plans)); assert.equal(flat(oc.reason), flat(STUCK));
});

test('ARI2-5 préparation « une seule fois » (prepOnce) en parties : actes [0,30] [30,40] [40,50] [50,60], vérification indépendante réussie', () => {
  // 1 000 $, partie 60 min, 100 points ; mission 10 min + 20 min de préparation une seule fois, 5 points, 100 $ : inverse → 1 + ⌊(60 − 30) ÷ 10⌋ = 4 missions par partie
  // (30 + 10 + 10 + 10 = 60), 20 points par partie → 5 parties, 300 min actives, 1 000 + 20 × 100 = 3 000 $. Avant : actes espacés de 30 ([90,120] hors partie → R8, R1, R5).
  const r = E.missionPlan({ capital: 1000, reserve: 0, sessionMinutes: 60, hourly: 0, targetUnits: 100, currentUnits: 0, activities: [m({ reward: 100, duration: 10, prep: 20, prepOnce: true, units: 5 })] });
  assert.equal(r.valid, true, r.reason); assert.equal(r.totalSessions, 5); near(r.finalCash, 3000); near(r.finalUnits, 100); near(r.activeMinutes, 300);
  assert.deepEqual(r.journal.filter(e => e.kind === 'act' && e.session === 1).map(e => [e.at, e.until]), [[0, 30], [30, 40], [40, 50], [50, 60]]);
  assert.deepEqual(r.journal.filter(e => e.kind === 'act' && e.session === 2).map(e => [e.at, e.until]), [[60, 90], [90, 100], [100, 110], [110, 120]]);
  const v = E.missionVerify(r); assert.equal(v.valid, true, v.reason); assert.deepEqual(v.violations, []); assert.equal(v.skipped, 'reach');
  // avec 5 min d’attente entre deux : espacement = durée + attente → [0,30] [35,45] [50,60] : 1 + ⌊(60 − 30) ÷ 15⌋ = 3 missions, 15 points par partie → 7 parties (105 ≥ 100)
  const w = E.missionPlan({ capital: 1000, reserve: 0, sessionMinutes: 60, hourly: 0, targetUnits: 100, currentUnits: 0, activities: [m({ reward: 100, duration: 10, prep: 20, prepOnce: true, cooldown: 5, units: 5 })] });
  assert.equal(w.totalSessions, 7); assert.deepEqual(w.journal.filter(e => e.kind === 'act' && e.session === 1).map(e => [e.at, e.until]), [[0, 30], [35, 45], [50, 60]]); assert.deepEqual(E.missionVerify(w).violations, []);
  safe(r); safe(w);
});

test('ARI2-6 points par heure en parcours : crédités pendant les missions et les attentes, comme en parties (190 min, et non 500)', () => {
  // 10 points/h, mission 10 min / 1 000 $ / 1 point, but 50 points. Parcours : chaque mission donne 1 + 10 × 10 ÷ 60 = 2,667 points → 18 missions = 48 < 50, 19 → 50,67 :
  // 190 min, 1 000 + 19 × 1 000 = 20 000 $. Parties de 60 min (inchangé) : 6 missions + 10 points = 16 par partie → 4 parties (64). Avant : 500 min (50 missions, 0 point par heure).
  const inp = { capital: 1000, reserve: 0, hourly: 0, unitsHourly: 10, targetUnits: 50, activities: [m({ reward: 1000, duration: 10, units: 1 })] };
  const f = E.missionPlan(inp); assert.equal(f.valid, true, f.reason); assert.equal(f.reached, true); near(f.totalMinutes, 190); near(f.finalUnits, 19 * (1 + 10 / 6)); near(f.finalCash, 20000);
  const s = E.missionPlan({ ...inp, sessionMinutes: 60 }); assert.equal(s.totalSessions, 4); near(s.finalUnits, 64); near(s.totalMinutes, 240);
  // avec 20 min d’attente après chaque mission : après 8 missions et 7 attentes (t = 220) : 8 × 2,667 + 7 × 3,333 = 44,67 ; attente (t = 240) : 48 ; 9e mission (t = 250) : 50,67 ≥ 50 → 250 min
  const w = E.missionPlan({ ...inp, activities: [m({ reward: 1000, duration: 10, cooldown: 20, units: 1 })] }); assert.equal(w.reached, true); near(w.totalMinutes, 250); near(w.finalUnits, 9 * (1 + 10 / 6) + 8 * (10 * 20 / 60));
  for (const r of [f, s, w]) { const v = E.missionVerify(r); assert.equal(v.valid, true); assert.deepEqual(v.violations, []); safe(r); }
});

test('ARI2-7 courbe du plan à 0 partie avec un achat d’avant payé tout de suite : une marche à 0 h jusqu’à l’argent de la fin', () => {
  // 227 000 $, achat d’avant P0 6 804 $ payé à 0 → 220 196 ≥ but 202 632 : 0 partie ; la courbe finit à 220 196 (avant : un seul point à 227 000, différent de « À la fin »)
  const r = E.missionPlan({ capital: 227000, reserve: 0, sessionMinutes: 10, hourly: 27810, goalPrice: 202632, purchases: [{ id: 'p0', name: 'P0', price: 6804 }] });
  assert.equal(r.totalSessions, 0); near(r.finalCash, 220196); assert.equal(r.purchases[0].before, true);
  const c = E.missionCurve(r); assert.equal(c.valid, true); assert.equal(c.points.length, 2); assert.equal(c.points[0].label, 'Départ'); near(c.points[0].cash, 227000);
  assert.equal(c.points[1].hours, 0); near(c.points[1].cash, 220196); assert.equal(c.points[1].purchase, 'P0'); assert.match(c.points[1].label, /P0/);
  // sans achat : un seul point, comme avant ; avec 1 partie (200 000 − 6 804 + 100 000 = 293 196 ≥ 250 000) : départ + partie 1, inchangé
  assert.equal(E.missionCurve(E.missionPlan({ capital: 227000, reserve: 0, sessionMinutes: 10, hourly: 27810, goalPrice: 202632 })).points.length, 1);
  const one = E.missionPlan({ capital: 200000, reserve: 0, sessionMinutes: 60, hourly: 100000, target: 250000, purchases: [{ id: 'p0', name: 'P0', price: 6804 }] }); assert.equal(one.totalSessions, 1); assert.equal(E.missionCurve(one).points.length, 2);
});

/* ---------- Correctifs du tour 3 de la revue contradictoire (ARI3-1 à ARI3-3 ; ARI3-4 dans T2-19) : valeurs à la main ---------- */
test('ARI3-1 parcours sans mission payable au départ : le gain par heure s’arrête dès que la mission devient payable (110 min, 101 000 $), jamais un bloc jusqu’au but (1 000 min) ; parties 2 / 120 min inchangées', () => {
  // 0 $, 6 000 $/h, mission 20 000 − 5 000 de frais / 10 min, but 100 000 disponibles.
  // Parcours : 5 000 $ de frais couverts après 5 000 ÷ 6 000 × 60 = 50 min ; puis chaque mission de 10 min rapporte 15 000 net + 1 000 de gain par heure = 16 000 ;
  // 5 000 + 16 000 k ≥ 100 000 → k ≥ 5,94 → 6 missions → 50 + 60 = 110 min, 5 000 + 96 000 = 101 000 $ (avant : 100 000 ÷ 6 000 × 60 = 1 000 min, aucune mission)
  const inp = { capital: 0, reserve: 0, target: 100000, hourly: 6000, activities: [m({ reward: 20000, cost: 5000, duration: 10 })] };
  const flow = E.missionPlan({ ...inp, sessionMinutes: null });
  assert.equal(flow.valid, true, flow.reason); assert.equal(flow.reached, true); near(flow.totalMinutes, 110); near(flow.finalCash, 101000);
  assert.deepEqual(flow.route.map(x => [x.type, x.runs]), [['run', 6]]); okVerify(E.missionVerify(flow), 'parcours');
  // le premier gain par heure s’arrête à 50 min (5 000 $ : la mission devient payable), pas au but
  const first = flow.journal.find(e => e.passive); near(first.at, 50); near(first.amount, 5000);
  // Parties de 60 min (inchangé) : partie 1 : 0 $ < 5 000 → aucune mission, + 6 000 ; partie 2 : 6 missions (+ 90 000) + 6 000 → 102 000 → 2 parties / 120 min ; parcours ≤ parties
  const ses = E.missionPlan({ ...inp, sessionMinutes: 60 });
  assert.equal(ses.totalSessions, 2); near(ses.finalCash, 102000); assert.deepEqual(ses.sessions.map(x => x.steps.map(y => y.runs)), [[], [6]]); assert.ok(flow.totalMinutes <= ses.totalMinutes);
  // tirage i = 8 de la revue : S 30, 2 473 $, réserve 107, but 231 139, mission 11 900 − 4 162 / 28 min, 20 441 $/h.
  // Attente : 4 162 + 107 − 2 473 = 1 796 $ à 20 441 $/h → 1 796 × 60 ÷ 20 441 min (5,27) ; chaque mission : 7 738 net + 20 441 × 28 ÷ 60 = 9 539,13 → 17 277,13 ;
  // 4 269 + 17 277,13 k ≥ 231 139 + 107 → k ≥ 13,14 → 14 missions → attente + 14 × 28 = 397,27 min, 246 148,87 $ (avant : 671,5 min, aucune mission ; parties de 30 min : 14 / 420 min)
  const i8 = { capital: 2473, reserve: 107, target: 231139, hourly: 20441, activities: [m({ reward: 11900, cost: 4162, duration: 28 })] };
  const f8 = E.missionPlan({ ...i8, sessionMinutes: null }), wait = 1796 * 60 / 20441;
  near(f8.totalMinutes, wait + 14 * 28); near(f8.finalCash, 4269 + 14 * (7738 + 20441 * 28 / 60)); okVerify(E.missionVerify(f8), 'i8');
  assert.equal(E.missionPlan({ ...i8, sessionMinutes: 30 }).totalSessions, 14); assert.ok(f8.totalMinutes <= 420);
  // depuis l’état de la page : « Taxi » déjà possédé qui rapporte 6 000 $/h, gain 0 : même parcours (110 min, 101 000 $), vérifié
  const s = base(); s.plan.goal = { ...s.plan.goal, kind: 'amount', target: 100000, meaning: 'available' }; s.plan.situation = { ...s.plan.situation, capital: 0, reserve: 0, hourly: 0, dailyMinutes: null, upkeepPerSession: 0 }; s.plan.source = 'missions';
  s.plan.missions = [{ ...B.copy(B.planMissionTemplate), id: 'm', name: 'Livraison', reward: 20000, cost: 5000, duration: 10, prep: 0, cooldown: 0, share: 100, investment: 0, players: 1 }];
  s.plan.prerequisites = [{ ...B.copy(B.planPrereqTemplate), id: 'p', name: 'Taxi', price: 50000, boostHourly: 6000, owned: true, minutes: null, usagePerSession: null }];
  const ev = B.evaluate('plan', B.validate(s, initial)); assert.equal(ev.valid, true, ev.reason); near(ev.totalMinutes, 110); near(ev.finalCash, 101000); assert.equal(ev.verification && ev.verification.ok, true);
});

test('ARI3-2 Mon temps de jeu : la partie suivante (durée habituelle ≠ partie faite) part de l’argent après les dépenses de la partie (98 000 $, pas 100 000) → aucun nombre de parties ; cas payable : 17 parties', () => {
  // 99 000 $, 0 de côté, but 1 000 000, 2 000 $ de dépenses par partie ; « Courses » 0 → 1 000 $ en 60 min ; « Gros coup » 100 000 de frais → 150 000 $ en 30 min.
  // Partie faite (60 min) : Gros coup impayable (99 000 < 100 000), Courses ×1 → + 1 000 → 100 000 $ à la fin ; dépenses 2 000 → 98 000 $ réels.
  // Partie habituelle (30 min) avec 98 000 $ : Gros coup impayable, Courses (60 min) ne rentre pas → 0 ; suivante 0 − 2 000 ≤ 0 → aucun nombre de parties ni de jours, sans raison de calendrier
  // (phrase existante « Si tes parties ne rapportent rien… », driver P7b). Avant : 100 000 $ → Gros coup payable → + 50 000 → suivante 48 000 → ⌈902 000 ÷ 48 000⌉ = 19 parties (faux).
  // avant = 1 000 000 − 99 000 = 901 000 ; après = 1 000 000 − (100 000 − 2 000) = 902 000
  const mk = (capital, up) => { const s = base(); s.model = 'cycles'; s.goal = { ...s.goal, capital, reserve: 0, hourly: null, target: 1000000, dailyMinutes: 60, upkeepPerSession: up, plannedSpend: null, meaning: 'available' };
    Object.assign(s.activities[0], { name: 'Courses', reward: 1000, cost: 0, duration: 60, prep: 0, cooldown: 0, share: 100, investment: 0, players: 1, owned: false });
    Object.assign(s.activities[1], { name: 'Gros coup', reward: 150000, cost: 100000, duration: 30, prep: 0, cooldown: 0, share: 100, investment: 0, players: 1, owned: false });
    s.session = { ...s.session, minutes: 60, usualMinutes: 30, enabled: [s.activities[0].id, s.activities[1].id], maxRepeat: 100, daysPerWeek: 7 }; return B.validate(s, initial); };
  const s = mk(99000, 2000), se = B.session(s); assert.equal(se.valid, true, se.reason); near(se.profit, 1000); near(se.finalCapital, 100000);
  const p = B.projection(s); assert.equal(p.valid, true, p.reason); near(p.missingBefore, 901000); near(p.missingAfter, 902000); assert.equal(p.sessionsLeft, null); assert.equal(p.calendarDays, null); assert.equal(p.calendarReason, null);
  assert.ok(B.analysis('session', s).explain.drivers.some(d => d.label === 'Dépenses par partie' && /mangent/.test(d.text)), 'P7b');
  // 101 000 $, 1 000 $ de dépenses : partie faite (60 min) : Gros coup ×2 (101 000 → 1 000 → 151 000 → 51 000 → 201 000) → profit 100 000, 201 000 $ ; dépenses → 200 000 $ ;
  // partie habituelle (30 min) avec 200 000 : Gros coup ×1 → + 50 000 ; suivante 50 000 − 1 000 = 49 000 ; avant 899 000 ; après = 1 000 000 − 200 000 = 800 000 → ⌈800 000 ÷ 49 000⌉ = 17 (16,33) ; 7 j/sem → 17 jours
  const t = mk(101000, 1000), st = B.session(t); near(st.profit, 100000); near(st.finalCapital, 201000);
  const q = B.projection(t); assert.equal(q.valid, true, q.reason); near(q.missingBefore, 899000); near(q.missingAfter, 800000); assert.equal(q.sessionsLeft, 17); assert.equal(q.calendarDays, 17); assert.equal(q.calendarReason, null);
});

test('ARI3-3 obtention plus longue que 400 parties : la note nomme l’achat et le temps restant (« Permis », 33 h 20), jamais « réduis le but » ; manque 0 mais obtention restante exposée ; parties de 60 min → 167', () => {
  // 10 000 $, 3 000 $/h, but 5 000 disponibles, parties de 20 min, « Permis » 1 000 $ à obtenir en 10 000 min : payé à 0 (9 000 ≥ 5 000) ; l’obtention occupe 400 × 20 = 8 000 min
  // sans gain par heure (C3b) → 9 000 $ à la fin, manque 0, il reste 10 000 − 8 000 = 2 000 min = 33 h 20 ; ni « réduis le but », ni « il manquerait »
  const inp = { capital: 10000, reserve: 0, hourly: 3000, target: 5000, sessionMinutes: 20, purchases: [{ id: 'p', name: 'Permis', price: 1000, minutes: 10000 }] };
  const r = E.missionPlan(inp); assert.equal(r.valid, true); assert.equal(r.reached, false); assert.equal(r.totalSessions, 400); near(r.finalCash, 9000); assert.equal(r.missing, 0); assert.deepEqual(r.unpaid, []); assert.equal(r.purchases[0].owned, true);
  near(r.pendingAcquisitionMinutes, 2000); assert.deepEqual(r.pendingAcquisitions.map(x => [x.id, x.name, x.minutes]), [['p', 'Permis', 2000]]);
  assert.match(flat(r.note), /^L’obtention de « Permis » n’est pas finie après 400 parties \(33 h 20 de jeu restants\) : allonge tes parties\.$/); assert.doesNotMatch(r.note, /réduis le but/);
  okVerify(E.missionVerify(r), 'obtention en cours'); safe(r);
  // parties de 60 min : 10 000 ÷ 60 = 166,67 → 167 parties ; la 167e a 20 min libres → + 3 000 × 20 ÷ 60 = 1 000 → 10 000 $ ; parcours : 10 000 min, 9 000 $ (rien en attente)
  const ok = E.missionPlan({ ...inp, sessionMinutes: 60 }); assert.equal(ok.reached, true); assert.equal(ok.totalSessions, 167); near(ok.finalCash, 10000); assert.equal(ok.pendingAcquisitionMinutes, 0); assert.deepEqual(ok.pendingAcquisitions, []); assert.equal(ok.note, null);
  const fl = E.missionPlan({ ...inp, sessionMinutes: null }); assert.equal(fl.reached, true); near(fl.totalMinutes, 10000); near(fl.finalCash, 9000); assert.deepEqual(fl.pendingAcquisitions, []);
  // page : evaluate('plan') refuse avec la cause et la portée : « Après 400 parties, tu aurais 9 000 $ ; il resterait 33 h 20 d’obtention pour « Permis ». »
  const s = base(); s.plan.goal = { ...s.plan.goal, kind: 'amount', target: 5000, meaning: 'available' }; s.plan.situation = { ...s.plan.situation, capital: 10000, reserve: 0, hourly: 3000, dailyMinutes: 20, upkeepPerSession: 0 }; s.plan.source = 'hourly';
  s.plan.prerequisites = [{ ...B.copy(B.planPrereqTemplate), id: 'p', name: 'Permis', price: 1000, minutes: 10000 }];
  const ev = B.evaluate('plan', B.validate(s, initial)); assert.equal(ev.valid, false); assert.equal(ev.strategies && ev.strategies.candidates.find(c => c.id === 'asIs').unreached, true);
  assert.match(flat(ev.reason), /^L’obtention de « Permis » n’est pas finie après 400 parties \(33 h 20 de jeu restants\) : allonge tes parties\. Après 400 parties, tu aurais 9 000 \$ ; il resterait 33 h 20 d’obtention pour « Permis »\.$/);
  assert.doesNotMatch(ev.reason, /réduis le but|il manquerait/);
});

/* ---------- Correctifs du tour 4 de la revue contradictoire (ARI4-1 à ARI4-3, PER4-1 à PER4-3, REG4-1) : valeurs à la main ---------- */
test('ARI4-1 parcours, but « gagné » déjà couvert mais achat d’avant impayé : le gain par heure finance l’achat (120 min / 0 $ = parties 2 × 60), jamais « Il manque 15 000 $ pour « P » »', () => {
  // 0 $, 10 000 $/h, but gagné 5 000, P 20 000 : gagné 5 000 à t = 30 (but couvert, P impayé → pas atteint, C2) ; P demande 20 000 $ → t = 120, payé, 0 $ en poche,
  // gagné 20 000 → atteint à 120 min. Parties de 60 min : 10 000 puis 20 000 → P après la partie 2 → 2 parties, 0 $. Propriété §10 : 2 × 60 = ⌈120 ÷ 60⌉ × 60.
  const A = { capital: 0, reserve: 0, hourly: 10000, target: 5000, goalMeaning: 'cumulative', purchases: [{ id: 'p', name: 'P', price: 20000 }] };
  const f = E.missionPlan(A); assert.equal(f.valid, true, f.reason); assert.equal(f.reached, true); near(f.totalMinutes, 120); near(f.finalCash, 0); near(f.earned, 20000); okVerify(E.missionVerify(f), 'A parcours');
  const s = E.missionPlan({ ...A, sessionMinutes: 60 }); assert.equal(s.reached, true); assert.equal(s.totalSessions, 2); near(s.finalCash, 0);
  // A7 : A 20 000, B 20 000 (demande A), but gagné 30 000 : 20 000 à t = 120 → A payé (0 $) ; gagné 30 000 à t = 180 (10 000 en poche, B impayé) ; 20 000 à t = 240 → B → 240 min, 0 $ (parties : 4)
  const A7 = { capital: 0, reserve: 0, hourly: 10000, target: 30000, goalMeaning: 'cumulative', purchases: [{ id: 'a', name: 'A', price: 20000 }, { id: 'b', name: 'B', price: 20000, requires: ['a'] }] };
  const f7 = E.missionPlan(A7); assert.equal(f7.reached, true); near(f7.totalMinutes, 240); near(f7.finalCash, 0); okVerify(E.missionVerify(f7), 'A7'); assert.equal(E.missionPlan({ ...A7, sessionMinutes: 60 }).totalSessions, 4);
  // A3 : P à obtenir en 30 min → payé à 120, obtenu à 150 (aucun gain pendant l’obtention, C3b) → 150 min, 0 $ ; parties : 3 (la 3e a 30 min libres → 5 000 $) = ⌈150 ÷ 60⌉ × 60 = 180
  const f3 = E.missionPlan({ ...A, purchases: [{ id: 'p', name: 'P', price: 20000, minutes: 30 }] }); assert.equal(f3.reached, true); near(f3.totalMinutes, 150); near(f3.finalCash, 0); okVerify(E.missionVerify(f3), 'A3');
  const s3 = E.missionPlan({ ...A, sessionMinutes: 60, purchases: [{ id: 'p', name: 'P', price: 20000, minutes: 30 }] }); assert.equal(s3.totalSessions, 3); near(s3.finalCash, 5000);
  // but gagné 0 (couvert dès le départ) : seul P compte → 120 min, 0 $ ; sans achat : 30 min, 5 000 $ (inchangé)
  const f0 = E.missionPlan({ ...A, target: 0 }); assert.equal(f0.reached, true); near(f0.totalMinutes, 120); near(f0.finalCash, 0);
  const fn = E.missionPlan({ ...A, purchases: [] }); near(fn.totalMinutes, 30); near(fn.finalCash, 5000);
  // page : evaluate('plan') au sens « gagné à partir de maintenant », sans durée de partie, achat d’avant « Garage » 20 000 $ : plan proposé, 120 min, 0 $, vérifié
  const st = base(); st.plan.goal = { ...st.plan.goal, kind: 'amount', target: 5000, meaning: 'cumulative' }; st.plan.source = 'hourly'; st.plan.strategy = 'asIs';
  st.plan.situation = { ...st.plan.situation, capital: 0, reserve: 0, hourly: 10000, dailyMinutes: null, upkeepPerSession: 0 };
  st.plan.prerequisites = [{ ...B.copy(B.planPrereqTemplate), id: 'p-1', name: 'Garage', price: 20000 }];
  const ev = B.evaluate('plan', B.validate(st, initial)); assert.equal(ev.valid, true, ev.reason); assert.equal(ev.continuous, true); near(ev.totalMinutes, 120); near(ev.finalCash, 0); assert.equal(ev.verification && ev.verification.ok, true);
  safe(f); safe(f7); safe(f3);
});

test('ARI4-2 R9 en parties : la partie d’un gain par heure se lit sur sa date (n × S), et chaque partie à taux > 0 en porte exactement un — étiquette voisine, gain omis, gain doublé : R9', () => {
  // T2-07 parties (300 000, 100 000 $/h, G 100 000 obtenu de 0 à 60, but 1 M, S 60) : 9 parties, la partie 1 ne rapporte rien (obtention). Un gain de 100 000 inséré à at = 60
  // étiqueté « partie 2 » (R8 tient : 60 ∈ [60, 120] ; le total des parties est réduit à 8 et l’argent final suit) : 60 ≠ 2 × 60 → R9 (avant : accepté, 8 parties au lieu de 9).
  const S4 = E.missionPlan({ capital: 300000, reserve: 0, hourly: 100000, goalPrice: 1000000, sessionMinutes: 60, purchases: [{ id: 'g', name: 'G', price: 100000, minutes: 60 }] });
  assert.equal(S4.totalSessions, 9); okVerify(E.missionVerify(S4), 'T2-07 parties');
  const a = dc(S4); const i = a.journal.findIndex(e => e.kind === 'check' && e.session === 1);
  a.journal.splice(i, 0, { t: 60, type: 'receive', amount: 100000, label: 'Gain par heure (partie 1)', cash: 300000, at: 60, session: 2, passive: true });
  for (let k = i + 1; k < a.journal.length; k++) if (!a.journal[k].kind) a.journal[k].cash += 100000;
  const checks = a.journal.map((e, k) => e.kind === 'check' ? k : -1).filter(k => k >= 0); a.journal = a.journal.slice(0, checks[checks.length - 2] + 1);
  a.finalCash = a.journal.filter(e => !e.kind).slice(-1)[0].cash; a.totalSessions = 8; const va = E.missionVerify(a); assert.equal(va.ok, false); has(va, 'R9');
  // 100 000 → 400 000 à 60 000 $/h, S 60 : 5 parties (160, 220, 280, 340, 400). Journal fabriqué à 6 parties où la partie 2 n’a aucun gain (100 → 160, 160, 220, 280, 340, 400) :
  // conservation et atteinte au point de contrôle 6 (360) tiennent ; la partie 2 (taux 60 000 > 0, aucune obtention) devrait porter un gain de 60 000 → R9 seule.
  const r = E.missionPlan({ capital: 100000, reserve: 0, hourly: 60000, target: 400000, sessionMinutes: 60 }); assert.equal(r.totalSessions, 5); okVerify(E.missionVerify(r), '5 parties');
  const b = dc(r); const j = [{ kind: 'check', at: 0, session: 0 }]; let cash = 100000;
  for (let n = 1; n <= 6; n++) { if (n !== 2) { cash += 60000; j.push({ t: 60, type: 'receive', amount: 60000, label: 'Gain par heure (partie ' + n + ')', cash, at: 60 * n, session: n, passive: true }); } j.push({ kind: 'check', at: 60 * n, session: n }); }
  b.journal = j; b.finalCash = cash; b.totalSessions = 6; b.totalMinutes = 360; b.reached = true; const vb = E.missionVerify(b); assert.equal(vb.ok, false); assert.deepEqual(rules(vb), ['R9']); near(vb.finalCash, 400000);
  // gain de la partie 3 inscrit deux fois (argent final + 60 000, atteinte une partie plus tôt) : deux gains pour une partie → R9 (et R7 : atteinte rejouée à 240, annoncée 300)
  const c = dc(r); const p3 = c.journal.find(e => e.passive && e.session === 3), at3 = c.journal.indexOf(p3); c.journal.splice(at3, 0, { ...p3 });
  for (let k = at3 + 1; k < c.journal.length; k++) if (!c.journal[k].kind) c.journal[k].cash += 60000; c.finalCash += 60000; const vc = E.missionVerify(c); has(vc, 'R9'); has(vc, 'R7');
  // le gain d’une partie entièrement prise par une obtention n’est pas attendu (T2-07 : partie 1 sans gain, ok ci-dessus) ; T2-19 (b bis) : 30 min libres → 50 000 attendu, toujours ok
  okVerify(E.missionVerify(E.missionPlan({ capital: 300000, reserve: 0, target: 1000000, hourly: 100000, sessionMinutes: 60, purchases: [{ id: 'g', name: 'G', price: 100000, minutes: 90 }] })), 'obtention 90');
});

test('ARI4-3 Mon temps de jeu : dépenses par partie (150 000 $) plus grandes que l’argent de fin (120 000 $), durée habituelle 30 ≠ 60 → aucun nombre de parties, aucune raison de calendrier, « mangent » (P7b)', () => {
  // état CALC-02 avec 10 000 $, 0 de côté, but 1 000 000 : même programme que T2-28 (110 000 $ en 60 min, payable avec 10 000 $) → 120 000 $ à la fin ; dépenses 150 000 → −30 000 :
  // la partie suivante (30 min) ne peut pas se calculer → elle ne rapporte rien → suivante 0 − 150 000 ≤ 0 → sessionsLeft null, calendarReason null (phrase « Si tes parties ne rapportent rien… »),
  // jamais « Ce que tu as doit être un nombre égal à 0 ou plus » ni le bouton « Dire combien je joue ». avant = 1 000 000 − 10 000 = 990 000 ; après = 1 000 000 − (120 000 − 150 000 − 0) = 1 030 000.
  const s = base(); s.goal.capital = 10000; s.goal.reserve = 0; s.goal.upkeepPerSession = 150000; s.session.minutes = 60; s.session.usualMinutes = 30; const st = B.validate(s, initial);
  const se = B.session(st); assert.equal(se.valid, true, se.reason); near(se.profit, 110000); near(se.finalCapital, 120000);
  const p = B.projection(st); assert.equal(p.valid, true, p.reason); near(p.missingBefore, 990000); near(p.missingAfter, 1030000); assert.equal(p.sessionsLeft, null); assert.equal(p.calendarDays, null);
  assert.equal(p.calendarReason, null); assert.equal(p.calendarField, null);
  const d = B.analysis('session', st).explain.drivers; assert.ok(d.some(x => x.label === 'Dépenses par partie' && /mangent/.test(x.text)), JSON.stringify(d)); assert.ok(!d.some(x => /retirés à la fin de chaque partie/.test(x.text)), 'P7 (nombre de parties) ne s’applique pas');
  // même durée (60 = 60, raccourci existant) : réponse identique
  const t = B.validate({ ...s, session: { ...s.session, usualMinutes: 60 } }, initial); const q = B.projection(t); assert.equal(q.sessionsLeft, null); assert.equal(q.calendarReason, null); near(q.missingAfter, 1030000);
});

test('PER4-1 typographie : la note « …(T de jeu restants) : allonge tes parties. » porte une espace insécable avant le deux-points (octets, pas flat)', () => {
  // ARI3-3 : 10 000 $, 3 000 $/h, but 5 000, parties de 20 min, « Permis » à obtenir en 10 000 min → 400 parties = 8 000 min, il reste 2 000 min = 33 h 20
  const r = E.missionPlan({ capital: 10000, reserve: 0, hourly: 3000, target: 5000, sessionMinutes: 20, purchases: [{ id: 'p', name: 'Permis', price: 1000, minutes: 10000 }] });
  assert.equal(r.reached, false); assert.ok(r.note.includes('de jeu restants) : allonge tes parties.'), JSON.stringify(r.note)); assert.ok(!/ :/.test(r.note.replace(/ :/g, '')), 'aucune espace ordinaire avant « : »');
});

test('PER4-2 « Ce qui compte » du plan : un cycle refusé par le moteur dans une autre rotation que la chaîne des prérequis n’est écrit qu’une fois, sans l’étiquette « Prérequis »', () => {
  // source « missions » : la chaîne part de « Courses » (demande C) → C → A → B → C ; le moteur part du premier achat → A → B → C → A : même cycle {A, B, C}, une seule entrée
  const mk = (prereqs, missions) => { const s = base(); s.tab = 'plan'; s.plan = B.copy(B.planTemplate); s.plan.goal = { ...s.plan.goal, kind: 'amount', target: 150000, meaning: 'available' }; s.plan.situation = { ...s.plan.situation, capital: 50000, reserve: 0, hourly: 100000, dailyMinutes: 60, daysPerWeek: 7 }; s.plan.source = 'missions'; s.plan.strategy = 'asIs'; s.plan.prerequisites = prereqs; s.plan.missions = missions; return B.validate(s, initial); };
  const P = (id, name, req) => ({ ...B.copy(B.planPrereqTemplate), id, name, price: 10000, requires: req }), M = (id, name, req) => ({ ...B.copy(B.planMissionTemplate), id, name, reward: 20000, cost: 1000, duration: 10, requires: req });
  for (const [label, a] of [['A→B→C→A', B.analysis('plan', mk([P('p-a', 'A', ['p-b']), P('p-b', 'B', ['p-c']), P('p-c', 'C', ['p-a'])], [M('m-r', 'Courses', ['p-c'])]))], ['A→B→A', B.analysis('plan', mk([P('p-a', 'A', ['p-b']), P('p-b', 'B', ['p-a'])], [M('m-r', 'Courses', ['p-b'])]))]]) {
    assert.equal(a.result.valid, false); assert.match(a.result.reason, /^Dépendance circulaire/); assert.match(a.chain.reason, /^Dépendance circulaire/); assert.notEqual(a.result.reason, a.chain.reason, label + ' : rotations différentes (sinon le test ne prouve rien)');
    const cyc = a.explain.missing.filter(m => /Dépendance circulaire/.test(m.text)); assert.equal(cyc.length, 1, label + ' : ' + JSON.stringify(a.explain.missing)); assert.ok(!a.explain.missing.some(m => m.label === 'Prérequis'), label);
  }
});

test('PER4-3 driver « Vérification » : « 1 événement » au singulier et, en parcours (R8 non appliquée), aucune mention du temps de partie ; en parties, phrase complète (7 événements)', () => {
  const mk = daily => { const s = base(); s.tab = 'plan'; s.plan = B.copy(B.planTemplate); s.plan.goal = { ...s.plan.goal, kind: 'amount', target: 300000, meaning: 'available' }; s.plan.situation = { ...s.plan.situation, capital: 50000, reserve: 0, hourly: 100000, dailyMinutes: daily, daysPerWeek: 7 }; s.plan.strategy = 'asIs'; return B.validate(s, initial); };
  // parcours : 50 000 → 300 000 à 100 000 $/h = un seul bloc de gain (150 min) → 1 événement rejoué
  const a = B.analysis('plan', mk(null)); assert.equal(a.result.valid, true, a.result.reason); assert.equal(a.result.verification.checked, 1);
  const va = a.explain.drivers.find(d => d.label === 'Vérification'); assert.ok(va, JSON.stringify(a.explain.drivers));
  assert.equal(flat(va.text), 'Journal du plan rejoué séparément (1 événement) : argent, réserve, achats d’avant et totaux conformes.');
  // parties de 60 min : 150 000, 250 000, 350 000 → 3 parties ; journal = point de contrôle 0 + (gain + point de contrôle) × 3 = 7 événements
  const b = B.analysis('plan', mk(60)); assert.equal(b.result.totalSessions, 3); assert.equal(b.result.verification.checked, 7);
  assert.equal(flat(b.explain.drivers.find(d => d.label === 'Vérification').text), 'Journal du plan rejoué séparément (7 événements) : argent, réserve, achats d’avant, temps de partie et totaux conformes.');
});

test('REG4-1 courbe du parcours au-delà du plafond du journal (60 000 événements) : dernier point à la fin annoncée (2 869,58 h / 330 012 583 $), dit tronqué ; rien d’inventé ; plan complet sans point « Fin »', () => {
  // 1 000 $, 1 000 $/h, « Rapide » 20 000 − 1 000 en 5 min, attente 5, but 330 000 000 : un cycle de 10 min rapporte 19 000 + 2 × 83,33 (gain par heure pendant la mission et l’attente).
  // 17 218 missions (17 217 : 1 000 + 17 217 × 19 000 + (17 217 + 17 216) × 83,33 = 329 993 416,67 < 330 M) ; la dernière attente n’est pas jouée :
  // temps = (17 218 + 17 217) × 5 = 172 175 min = 2 869,5833 h ; argent = 1 000 + 17 218 × 19 000 + (17 218 + 17 217) × 1 000 × 5 ÷ 60 = 330 012 583,33 $.
  // 4 événements d’argent par cycle → 68 871 > 60 000 : journal incomplet ; le 60 000e événement clôt le 15 000e cycle : t = 150 000 (2 500 h), 1 000 + 15 000 × 19 166,67 = 287 501 000 $.
  const r = E.missionPlan({ capital: 1000, reserve: 0, hourly: 1000, activities: [m({ id: 'r', name: 'Rapide', reward: 20000, cost: 1000, duration: 5, cooldown: 5 })], target: 330000000 });
  assert.equal(r.valid, true, r.reason); assert.equal(r.reached, true); near(r.totalMinutes, 172175); near(r.finalCash, 330012583.3333); assert.equal(r.journalComplete, false); assert.equal(r.events.length, 60000);
  const cv = E.missionCurve(r); assert.equal(cv.valid, true); assert.equal(cv.sampled, true); assert.equal(cv.truncated, true);
  const last = cv.points[cv.points.length - 1], prev = cv.points[cv.points.length - 2];
  near(last.hours, 172175 / 60); near(last.cash, 330012583.3333); assert.equal(last.label, 'Fin'); assert.equal(last.truncated, true); near(prev.hours, 2500); near(prev.cash, 287501000);
  assert.ok(cv.points.filter(p => p.truncated).length === 1, 'un seul point de fin'); near(E.planCashAt({ points: cv.points, hours: 172175 / 60 }).cash, 330012583.3333);
  // T2-02 (parcours complet, 420 min) : aucun point « Fin », pas tronqué
  const ok = E.missionCurve(E.missionPlan({ capital: 90000, reserve: 10000, hourly: 10000, target: 50000, purchases: chainAB() })); assert.equal(ok.truncated, false); assert.ok(!ok.points.some(p => p.label === 'Fin'));
});

/* ---------- Correctifs du tour 5 de la revue contradictoire (ARI5-1, ARI5-3 à ARI5-5, PER5-1 ; ARI5-2 dans T2-19 (f)) : valeurs à la main ---------- */
test('ARI5-1 parcours : une mission « une fois » prête mais pas encore payable est financée par le gain par heure (A : 110 min / 260 000 $, atteint comme en parties), jamais « qui ne peut pas se faire » ; B : 160 min = parties de 10 min ; C : 140 min', () => {
  // A : 0 $, 60 000 $/h, but 50 000 disponibles ; P 50 000 demande M ; M « une fois » : 100 000 de frais → 300 000, 10 min.
  // Attendre 100 min (0 → 100 000) ; M de 100 à 110 : 100 000 − 100 000 + 300 000 + 10 000 de gain pendant la mission = 310 000 ; P → 260 000 ≥ 50 000 : 110 min, 260 000 $.
  // Parties de 60 min : p1 60 000 ; p2 120 000 ; p3 : M (120 000 − 100 000 + 300 000 = 320 000) + 60 000 de gain = 380 000, P après → 330 000 : 3 parties, 330 000 $ (≥ 110 min).
  const A = { capital: 0, reserve: 0, hourly: 60000, target: 50000, goalMeaning: 'available', purchases: [{ id: 'P', name: 'P', price: 50000, requires: ['M'] }], activities: [m({ id: 'M', name: 'M', reward: 300000, cost: 100000, duration: 10, once: true })] };
  const fa = E.missionPlan(A); assert.equal(fa.valid, true, fa.reason); assert.equal(fa.reached, true); near(fa.totalMinutes, 110); near(fa.finalCash, 260000); okVerify(E.missionVerify(fa), 'A parcours'); near(E.missionVerify(fa).reachedAt, 110);
  assert.deepEqual(fa.route.map(x => x.type + ':' + x.id), ['unlock:M', 'acquire:P']); near(fa.route[0].start, 100);
  const sa = E.missionPlan({ ...A, sessionMinutes: 60 }); assert.equal(sa.reached, true); assert.equal(sa.totalSessions, 3); near(sa.finalCash, 330000); okVerify(E.missionVerify(sa), 'A parties');
  // B (but plus haut que les frais de M : le bloc ne saute plus au but avant M) : 10 000 $, but 200 000, M une fois 50 000 → 100 000, P 20 000 demande M.
  // 40 min (10 000 → 50 000) ; M de 40 à 50 : −50 000 + 100 000 + 10 000 = 110 000 ; P → 90 000 ; 110 000 à 60 000 $/h = 110 min → 160 min, 200 000 $.
  // Parties de 10 min : 4 × 10 000 → 50 000 ; p5 : M → 100 000 + 10 000 = 110 000, P après → 90 000 ; 11 × 10 000 → 200 000 : 16 parties = 160 min (avant : parcours 200 min).
  const Bc = { ...A, capital: 10000, target: 200000, activities: [m({ id: 'M', name: 'M', reward: 100000, cost: 50000, duration: 10, once: true })], purchases: [{ id: 'P', name: 'P', price: 20000, requires: ['M'] }] };
  const fb = E.missionPlan(Bc); assert.equal(fb.reached, true); near(fb.totalMinutes, 160); near(fb.finalCash, 200000); okVerify(E.missionVerify(fb), 'B parcours');
  const sb = E.missionPlan({ ...Bc, sessionMinutes: 10 }); assert.equal(sb.reached, true); assert.equal(sb.totalSessions, 16); near(sb.finalCash, 200000);
  // C (sans achat, M rapporte 50 000 net et finit bien avant le but) : 40 min → M de 40 à 50 → 110 000 ; 90 000 à gagner = 90 min → 140 min, 200 000 $ = parties de 10 min : 14 (avant : 190 min).
  const Cc = { capital: 10000, reserve: 0, hourly: 60000, target: 200000, activities: [m({ id: 'M', name: 'M', reward: 100000, cost: 50000, duration: 10, once: true })] };
  const fc = E.missionPlan(Cc); assert.equal(fc.reached, true); near(fc.totalMinutes, 140); near(fc.finalCash, 200000); okVerify(E.missionVerify(fc), 'C parcours');
  assert.equal(E.missionPlan({ ...Cc, sessionMinutes: 10 }).totalSessions, 14);
  // contre-cas (tirage i = 826 de la revue) : mission « une fois » à perte (10 500 − 33 100 = −22 600) que rien ne demande : le bloc va droit au but,
  // (79 800 + 36 600) ÷ 85 800 = 1,35664 h = 81,399 min, 116 400 $ (inchangé : la faire d’abord serait plus lent)
  const d = E.missionPlan({ capital: 0, reserve: 0, hourly: 85800, goalMeaning: 'available', target: 79800, goalPrice: 36600, activities: [m({ id: 'm0', name: 'M0', reward: 10500, cost: 0, duration: 5, investment: 33100, once: true })] });
  assert.equal(d.reached, true); near(d.totalMinutes, 116400 / 85800 * 60); near(d.finalCash, 116400); assert.deepEqual(d.onceDone, []);
  safe(fa); safe(fb); safe(fc); safe(d);
});

test('ARI5-3 attente plus longue que la pause : la mission est écartée de la partie suivante au lieu de refuser tout le plan — (a) N débloquée par P suffit : 2 parties, 650 000 $ ; (b) but atteint, seule l’obtention reste : 2 parties, 120 min, 100 000 $ ; T2-10 reste refusé', () => {
  // (a) 0 $, but 400 000, parties de 60 min ; P 50 000 ; M 100 000 en 10 min, attente 2 000 ; N 100 000 en 10 min, demande P.
  // p1 : M ×1 → 100 000, P après → 50 000 ; p2 : M pas prête (2 000 > 1 440 − 60), N ×6 → 650 000 ≥ 400 000 : 2 parties, 650 000 $ (avant : refus « attente plus longue que la pause »).
  // Parcours : M à 0 → 100 000, P à 10 → 50 000, N ×4 de 10 à 50 → 450 000 : 50 min.
  const a3 = { capital: 0, reserve: 0, target: 400000, sessionMinutes: 60, purchases: [{ id: 'P', name: 'P', price: 50000 }], activities: [m({ id: 'm', name: 'M', reward: 100000, duration: 10, cooldown: 2000 }), m({ id: 'n', name: 'N', reward: 100000, duration: 10, requiresPurchaseIds: ['P'] })] };
  const ra = E.missionPlan(a3); assert.equal(ra.valid, true, ra.reason); assert.equal(ra.reached, true); assert.equal(ra.totalSessions, 2); near(ra.finalCash, 650000);
  assert.deepEqual(ra.sessions.map(s => s.steps.map(x => x.id + '×' + x.runs)), [['m×1'], ['n×6']]); okVerify(E.missionVerify(ra), '(a) parties');
  const fa = E.missionPlan({ ...a3, sessionMinutes: null }); assert.equal(fa.reached, true); near(fa.totalMinutes, 50); near(fa.finalCash, 450000);
  // (b) 0 $, but 100 000, parties de 60 min ; P 50 000 à obtenir en 30 min ; M 150 000 en 10 min, attente 2 000.
  // p1 : M → 150 000, P après → 100 000 ≥ 100 000 (obtention en attente) ; p2 : 30 min d’obtention seule, aucune mission : 2 parties, 120 min, 100 000 $, 30 min d’obtention ; parcours : 10 + 30 = 40 min.
  const b3 = { capital: 0, reserve: 0, target: 100000, sessionMinutes: 60, purchases: [{ id: 'P', name: 'P', price: 50000, minutes: 30 }], activities: [m({ id: 'm', name: 'M', reward: 150000, duration: 10, cooldown: 2000 })] };
  const rb = E.missionPlan(b3); assert.equal(rb.valid, true, rb.reason); assert.equal(rb.reached, true); assert.equal(rb.totalSessions, 2); near(rb.totalMinutes, 120); near(rb.finalCash, 100000); near(rb.acquisitionMinutes, 30);
  assert.deepEqual(rb.sessions[1].steps, []); okVerify(E.missionVerify(rb), '(b) parties');
  const fb = E.missionPlan({ ...b3, sessionMinutes: null }); assert.equal(fb.reached, true); near(fb.totalMinutes, 40); near(fb.finalCash, 100000);
  // (b′) même cas sans attente : p1 M ×6 → 900 000, P après → 850 000 (but atteint) ; p2 ne sert qu’à l’obtention : 2 parties, 850 000 $ (avant : M ×3 en plus, 1 300 000 $, après le but)
  const rb2 = E.missionPlan({ ...b3, activities: [m({ id: 'm', name: 'M', reward: 150000, duration: 10 })] }); assert.equal(rb2.totalSessions, 2); near(rb2.finalCash, 850000); assert.deepEqual(rb2.sessions[1].steps, []); okVerify(E.missionVerify(rb2), '(b′)');
  // T2-10 (M nécessairement rejouée : rien d’autre à faire à la partie 2) : refus inchangé, phrase de Mon objectif
  const ko = E.missionPlan({ capital: 0, reserve: 0, target: 100000, sessionMinutes: 60, activities: [m({ id: 'l', name: 'L', reward: 20000, duration: 10, cooldown: 2000 })] });
  assert.equal(ko.valid, false); assert.match(ko.reason, /pause entre deux parties/);
  // avec une mission moins bonne K2 (5 000 en 10 min, sans attente) : p1 L + K2 ×5 = 45 000 ; p2 (L pas prête) K2 ×6 = 75 000 ; p3 L prête (2 000 ≤ 2 × 1 440 − 60) + K2 ×5 = 120 000 ≥ 100 000 : 3 parties
  const k2 = E.missionPlan({ capital: 0, reserve: 0, target: 100000, sessionMinutes: 60, activities: [m({ id: 'l', name: 'L', reward: 20000, duration: 10, cooldown: 2000 }), m({ id: 'k', name: 'K2', reward: 5000, duration: 10 })] });
  assert.equal(k2.valid, true, k2.reason); assert.equal(k2.totalSessions, 3); near(k2.finalCash, 120000); assert.deepEqual(k2.sessions.map(s => s.steps.map(x => x.id + '×' + x.runs)), [['l×1', 'k×5'], ['k×6'], ['l×1', 'k×5']]); okVerify(E.missionVerify(k2), 'L + K2');
  safe(ra); safe(rb); safe(k2);
});

test('ARI5-4 parties : un achat de départ qui ne se rembourse pas dans la partie est payé d’avance, une seule fois (7 parties, 420 min, 1 000 000 $ = parcours), jamais « Aucune mission ne rentre »', () => {
  // 500 000 $, but 1 000 000, M : 100 000 en 60 min, achat de départ 200 000 (préexistant : sessionPlan ne garde qu’un programme qui augmente l’argent de la partie, −200 000 + 100 000 < 0 → 0 mission).
  // Partie 1 : −200 000 + 100 000 → 400 000 ; parties 2 à 7 : +100 000 → 1 000 000 : 7 parties = 420 min = parcours (420 min, 1 000 000 $) ; le bien n’est pas de l’argent (finalCash net).
  const inv = { capital: 500000, reserve: 0, target: 1000000, activities: [m({ reward: 100000, duration: 60, investment: 200000 })] };
  const s = E.missionPlan({ ...inv, sessionMinutes: 60 }); assert.equal(s.valid, true, s.reason); assert.equal(s.reached, true); assert.equal(s.totalSessions, 7); near(s.totalMinutes, 420); near(s.finalCash, 1000000);
  near(s.sessions[0].cashAfter, 400000); near(s.sessions[1].cashAfter, 500000); okVerify(E.missionVerify(s), '60 min'); near(E.missionVerify(s).reachedAt, 420);
  // journal de la partie 1 : l’achat de départ (asset, inv:m, 200 000) avant l’occupation de M qui le demande, puis la récompense à 60 ; payé une seule fois dans tout le plan
  const j1 = s.journal.filter(e => e.session === 1); assert.equal(j1[0].type, 'spend'); assert.equal(j1[0].asset, true); assert.equal(j1[0].id, 'inv:m'); near(j1[0].amount, 200000); near(j1[0].at, 0);
  assert.equal(j1[1].kind, 'act'); assert.deepEqual(j1[1].needs, ['inv:m']); assert.equal(s.journal.filter(e => e.asset === true).length, 1); assert.ok(/Achat de départ de « M » \(partie 1\)/.test(flat(j1[0].label)));
  // parties de 120 min : p1 −200 000 + 2 × 100 000 → 500 000 (argent égal : refusé aussi avant) ; puis +200 000 par partie → 700 000, 900 000, 1 100 000 : 4 parties, 1 100 000 $
  const s2 = E.missionPlan({ ...inv, sessionMinutes: 120 }); assert.equal(s2.reached, true); assert.equal(s2.totalSessions, 4); near(s2.finalCash, 1100000); okVerify(E.missionVerify(s2), '120 min');
  const f = E.missionPlan(inv); assert.equal(f.reached, true); near(f.totalMinutes, 420); near(f.finalCash, 1000000);
  // une partie qui avance déjà (10 000 $/h) n’est pas changée : 50 parties de gain par heure (500 000 ÷ 10 000) sans achat de départ (le remboursement sur plusieurs parties relève du lot 3)
  const h = E.missionPlan({ ...inv, hourly: 10000, sessionMinutes: 60 }); assert.equal(h.totalSessions, 50); assert.equal(h.journal.filter(e => e.asset === true).length, 0);
  // achat de départ impayable (600 000 > 500 000) : la raison existante nomme le montant demandé (600 000 $) et ce qu’il reste (500 000 $)
  const ko = E.missionPlan({ ...inv, sessionMinutes: 60, activities: [m({ reward: 100000, duration: 60, investment: 600000 })] }); assert.equal(ko.valid, false); assert.match(flat(ko.reason), /demande 600 000 \$ avant de commencer, et il ne te reste que 500 000 \$/);
  safe(s); safe(s2);
});

test('ARI5-5 dépenses de la partie sans argent gardé de côté (réserve 0) : « dépassent l’argent qu’il te resterait (1 000 $) », jamais « sous les 0 $ gardés de côté » ; réserve > 0 : phrase P2 inchangée', () => {
  // 100 000 $, réserve 0, 10 000 $/h, 2 000 $ de dépenses par partie, P 99 000 à obtenir en 60 min (toute la partie 1, aucun gain) : 100 000 − 99 000 = 1 000 restants < 2 000
  const r = E.missionPlan({ capital: 100000, reserve: 0, hourly: 10000, upkeepPerSession: 2000, target: 50000, sessionMinutes: 60, purchases: [{ id: 'P', name: 'P', price: 99000, minutes: 60 }] });
  assert.equal(r.valid, false); const t = flat(r.reason);
  assert.equal(t, 'Les dépenses de la partie 1 (2 000 $) dépassent l’argent qu’il te resterait (1 000 $) : baisse-les ou choisis des missions qui rapportent plus.');
  assert.doesNotMatch(t, /gardés de côté|garde moins/); assert.ok(!/ :/.test(r.reason.replace(/ :/g, '')), 'espace insécable avant « : »'); assert.ok(r.reason.includes(' $)'), 'espace insécable avant « $ »');
  // T2-08 (réserve 10 000) : la phrase P2 reste
  const p2 = E.missionPlan({ capital: 112000, reserve: 10000, target: 30000, sessionMinutes: 60, upkeepPerSession: 3000, purchases: [{ id: 'p', name: 'P', price: 100000, minutes: 60 }], activities: [m({ reward: 10000, duration: 30, requiresPurchaseIds: ['p'] })] });
  assert.equal(flat(p2.reason), 'Les dépenses de la partie 1 (3 000 $) feraient passer ton argent sous les 10 000 $ gardés de côté : baisse-les, garde moins de côté ou choisis des missions qui rapportent plus.');
});

test('PER5-1 needAtStart : le manque au départ est rendu par le moteur, achats d’avant compris, pour les trois sens du but (80 000 / 110 000 / 70 000 ; 0 quand le but est couvert)', () => {
  // gagné 10 000, Hangar 100 000, 20 000 $, réserve 0, 10 000 $/h : max(0, 10 000 − 0, 100 000 + 0 − 20 000) = 80 000 ; 20 000 + 8 × 10 000 = 100 000 → Hangar après la partie 8 → 0 $, gagné 80 000 ≥ 10 000 : 8 parties
  const c = E.missionPlan({ capital: 20000, reserve: 0, hourly: 10000, target: 10000, goalMeaning: 'cumulative', sessionMinutes: 60, purchases: [{ id: 'h', name: 'Hangar', price: 100000 }] });
  assert.equal(c.reached, true); assert.equal(c.totalSessions, 8); near(c.finalCash, 0); near(c.needAtStart, 80000); assert.equal(c.missing, 0);
  // en tout 30 000, réserve 5 000, même Hangar : 30 000 + 100 000 − 20 000 = 110 000 ; disponible (H) : 50 000 + 10 000 + 30 000 + 70 000 − 90 000 = 70 000 ; but couvert sans achat : 0
  near(E.missionPlan({ capital: 20000, reserve: 5000, hourly: 10000, target: 30000, goalMeaning: 'held', sessionMinutes: 60, purchases: [{ id: 'h', name: 'Hangar', price: 100000 }] }).needAtStart, 110000);
  near(E.missionPlan({ capital: 90000, reserve: 10000, hourly: 10000, target: 50000, goalMeaning: 'available', sessionMinutes: 60, purchases: chainAB() }).needAtStart, 70000);
  near(E.missionPlan({ capital: 300000, reserve: 0, hourly: 10000, target: 50000, sessionMinutes: 60 }).needAtStart, 0);
  // parcours : même valeur (état initial, pas le résultat) ; un achat retiré par une stratégie n’y est pas (direct : liste vide → 10 000)
  near(E.missionPlan({ capital: 20000, reserve: 0, hourly: 10000, target: 10000, goalMeaning: 'cumulative', purchases: [{ id: 'h', name: 'Hangar', price: 100000 }] }).needAtStart, 80000);
  near(E.missionPlan({ capital: 20000, reserve: 0, hourly: 10000, target: 10000, goalMeaning: 'cumulative', sessionMinutes: 60 }).needAtStart, 10000);
});

/* ---------- Correctifs du tour 6 de la revue contradictoire (ARI6-1, ARI6-2) : valeurs à la main ---------- */
test('ARI6-1 vérificateur (parties) : chaque partie annoncée 0…N porte exactement un point de contrôle à n × S — check et dépense de partie (ou gain par heure) retirés ensemble : R10 ; check dupliqué ou daté ailleurs : R1', () => {
  // 0 $, 10 000 $/h, 1 000 $ de dépenses par partie, but 50 000 $ disponibles, S 60 : net 9 000 par partie → ⌈50 000 ÷ 9 000⌉ = 6 parties, 6 × 9 000 = 54 000 $ ;
  // journal : check 0 à 0, puis par partie n : gain 10 000 à 60 n, dépense 1 000 à 60 n, check n à 60 n.
  const r = E.missionPlan({ capital: 0, reserve: 0, hourly: 10000, upkeepPerSession: 1000, target: 50000, sessionMinutes: 60 });
  assert.equal(r.totalSessions, 6); near(r.finalCash, 54000); okVerify(E.missionVerify(r), 'original');
  assert.deepEqual(r.journal.filter(e => e.kind === 'check').map(e => [e.session, e.at]), [[0, 0], [1, 60], [2, 120], [3, 180], [4, 240], [5, 300], [6, 360]]);
  // (a) le check de la partie 3 ET sa dépense de 1 000 $ retirés, argent final annoncé 54 000 + 1 000 = 55 000 (cohérent avec le journal corrompu). Avant : accepté (R9 et R10 n’étaient
  //     évaluées qu’aux points de contrôle présents). Attendu : R10 seule — conservation (R6 : 55 000 rejoué) et atteinte (R7 : après la partie 5, 46 000 < 50 000 ; partie 6 : 55 000 → 360) tiennent.
  const a = dc(r); { const ck = a.journal.findIndex(e => e.kind === 'check' && e.session === 3), up = a.journal.findIndex(e => !e.kind && e.upkeep && e.session === 3); near(a.journal[up].amount, 1000);
    a.journal.splice(Math.max(ck, up), 1); a.journal.splice(Math.min(ck, up), 1); for (const e of a.journal) if (!e.kind && e.at > 180) e.cash += 1000; a.finalCash = 55000; }
  const va = E.missionVerify(a); assert.equal(va.ok, false); assert.deepEqual(rules(va), ['R10']); near(va.finalCash, 55000); near(va.reachedAt, 360);
  // (b) le check de la partie 3 ET son gain par heure (10 000 $) retirés, argent final 44 000 : la partie 3 n’est plus contrôlée par personne → R10 (ici aussi R7 : 44 000 < 50 000 après la partie 6)
  const b = dc(r); { const ck = b.journal.findIndex(e => e.kind === 'check' && e.session === 3), ps = b.journal.findIndex(e => !e.kind && e.passive && e.session === 3); near(b.journal[ps].amount, 10000);
    b.journal.splice(Math.max(ck, ps), 1); b.journal.splice(Math.min(ck, ps), 1); for (const e of b.journal) if (!e.kind && e.at > 180) e.cash -= 10000; b.finalCash = 44000; }
  const vb = E.missionVerify(b); assert.equal(vb.ok, false); has(vb, 'R10'); has(vb, 'R7');
  // (c) check de la partie 3 écrit deux fois → R1 « partie illisible » ; check de la partie 3 daté 190 au lieu de 3 × 60 = 180 (l’ordre des instants est gardé : 190 < 240) → R1 seule
  const c = dc(r); { const ck = c.journal.findIndex(e => e.kind === 'check' && e.session === 3); c.journal.splice(ck, 0, dc(c.journal[ck])); }
  const vc = E.missionVerify(c); assert.equal(vc.ok, false); assert.deepEqual(rules(vc), ['R1']); assert.equal(vc.violations[0].detail, 'partie illisible');
  const d = dc(r); d.journal.find(e => e.kind === 'check' && e.session === 3).at = 190; const vd = E.missionVerify(d); assert.equal(vd.ok, false); assert.deepEqual(rules(vd), ['R1']);
  // (e) une partie annoncée de plus que les points de contrôle (totalSessions 7, journal à 6 parties) → R10 (partie 7 sans point de contrôle) et R7 (atteinte annoncée 7 × 60 = 420, rejouée 360)
  const e = dc(r); e.totalSessions = 7; const ve = E.missionVerify(e); assert.equal(ve.ok, false); has(ve, 'R10'); has(ve, 'R7');
  // 0 rejet à tort : 0 partie (but couvert) → journal [check 0], ok, atteinte à 0 ; but non atteint en 400 parties → 401 points de contrôle 0…400, ok, atteinte null ;
  // les plans complets de T2-07, T2-18, T2-21 et de la propriété T2-34 (okVerify dans leurs tests) restent acceptés.
  const z = E.missionPlan({ capital: 100000, reserve: 0, target: 50000, hourly: 10000, sessionMinutes: 60 }); assert.equal(z.totalSessions, 0); assert.equal(z.journal.length, 1);
  const vz = E.missionVerify(z); okVerify(vz, '0 partie'); assert.equal(vz.reachedAt, 0);
  const u = E.missionPlan({ capital: 0, reserve: 0, target: 50000000, hourly: 1000, sessionMinutes: 60 }); assert.equal(u.reached, false); assert.equal(u.totalSessions, 400);
  assert.equal(u.journal.filter(x => x.kind === 'check').length, 401); const vu = E.missionVerify(u); okVerify(vu, '400 parties'); assert.equal(vu.reachedAt, null);
});

test('ARI6-2 vérificateur (parties) : R9 compare aussi le montant de la partie — un achat d’après-partie avancé devant le gain de la même partie (même instant n × S), gain gonflé de son boost : R9', () => {
  // 40 000 $, 10 000 $/h, « U » une fois 20 000 $ en 10 min, P 50 000 $ (+20 000 $/h, obtention 0 min), but 200 000 $ disponibles, S 60.
  // partie 1 : U à t = 10 (+20 000) puis gain par heure 10 000 × 60 ÷ 60 = 10 000 → 70 000 → P payé après la partie 1 (à 60, après le gain) → 20 000 ;
  // parties 2 à 7 : (10 000 + 20 000) × 60 ÷ 60 = 30 000 par partie ; 20 000 + 6 × 30 000 = 200 000 → 7 parties, 200 000 $ (après la partie 6 : 170 000 < 200 000).
  const r = E.missionPlan({ capital: 40000, reserve: 0, hourly: 10000, target: 200000, sessionMinutes: 60, purchases: [{ id: 'P', name: 'P', price: 50000, boostHourly: 20000 }], activities: [m({ id: 'u', name: 'U', reward: 20000, duration: 10, once: true })] });
  assert.equal(r.totalSessions, 7); near(r.finalCash, 200000); okVerify(E.missionVerify(r), 'original');
  const p1 = r.journal.find(e => e.passive && e.session === 1), buy = r.journal.find(e => e.asset && e.id === 'P'); near(p1.amount, 10000); near(p1.at, 60); near(buy.at, 60);
  assert.ok(r.journal.indexOf(buy) > r.journal.indexOf(p1), 'achat inscrit après le gain de la partie 1'); near(r.journal.find(e => e.passive && e.session === 2).amount, 30000);
  // journal adverse : la dépense de P (à 60) placée AVANT le gain de la partie 1 (à 60), ce gain porté à 10 000 + 20 000 × 60 ÷ 60 = 30 000, argent final 220 000 ; l’argent couvre P avant
  // le gain (40 000 + 20 000 = 60 000 ≥ 50 000 : pas de R2) ; atteinte inchangée (après la partie 6 : 40 000 + 5 × 30 000 = 190 000 < 200 000 ; partie 7 : 220 000 → 420 : pas de R7).
  // Avant : accepté (par événement, l’achat lu plus tôt au même instant était déjà « possédé » ; par partie, seul le nombre de gains était comparé). Attendu : R9 seule — le boost d’un
  // achat payé après la partie n compte à partir de la partie n + 1 (C3b, ARI4-2) : la partie 1 vaut 10 000 × 60 ÷ 60 = 10 000, pas 30 000.
  const c = dc(r); { const k = c.journal.findIndex(e => e.asset && e.id === 'P'), ps = c.journal.findIndex(e => e.passive && e.session === 1); const sp = c.journal[k];
    c.journal[ps].amount = 30000; for (let j = ps; j < c.journal.length; j += 1) if (!c.journal[j].kind) c.journal[j].cash += 20000; c.finalCash = 220000; c.journal.splice(k, 1); c.journal.splice(ps, 0, sp); }
  assert.deepEqual(c.journal.filter(x => x.session === 1).map(x => (x.kind || x.type) + '@' + x.at), ['act@0', 'receive@10', 'spend@60', 'receive@60', 'check@60']);
  const vc = E.missionVerify(c); assert.equal(vc.ok, false); assert.deepEqual(rules(vc), ['R9']); near(vc.finalCash, 220000); near(vc.reachedAt, 420);
  // la même avance de l’achat SANS gonfler le gain (10 000 gardés, argent final 200 000) : rejetée aussi, par la règle par événement (C8.5 : taux lu avec les achats possédés à cet
  // instant, l’achat avec unlocks lu avant le gain compte) — un journal qui ne peut satisfaire à la fois la règle par événement et la règle par partie ; le moteur n’écrit jamais cet
  // ordre (gain puis achat, contrôlé plus haut), donc aucun plan du moteur n’est rejeté (0 rejet à tort sur la propriété T2-34).
  const d = dc(r); { const k = d.journal.findIndex(e => e.asset && e.id === 'P'), ps = d.journal.findIndex(e => e.passive && e.session === 1); const sp = d.journal[k]; d.journal.splice(k, 1); d.journal.splice(ps, 0, sp); }
  const vd = E.missionVerify(d); assert.equal(vd.ok, false); assert.deepEqual(rules(vd), ['R9']);
});

test('REV7 moteur : chaque partie rend ses morceaux d’obtention et la part du gain par heure (temps libre seulement), reprises par la phase', () => {
  // Garage 50 000 obtenu en 30 min, payé avant la partie 1 ; Pack possédé +20 000 $/h ; mission 10 min / 10 000 ; 60 000 → 200 000 ; parties de 60
  const r = E.missionPlan({ capital: 60000, reserve: 0, hourly: 0, target: 200000, sessionMinutes: 60,
    activities: [{ id: 'm-1', name: 'Livraison', reward: 10000, cost: 0, duration: 10, prep: 0, cooldown: 0, share: 100, investment: 0 }],
    purchases: [{ id: 'p-p', name: 'Pack', price: 10000, boostHourly: 20000, owned: true }, { id: 'p-g', name: 'Garage', price: 50000, boostHourly: 0, minutes: 30 }] });
  assert.equal(r.valid, true); assert.equal(r.totalSessions, 3); assert.equal(r.finalCash, 210000);
  const s1 = r.sessions[0];
  assert.deepEqual(s1.acquisitions.map(a => [a.name, a.minutes, a.done]), [['Garage', 30, true]]);
  assert.equal(s1.acquisitionMinutes, 30); assert.equal(s1.boostPart, 10000); assert.equal(s1.hourlyPart, 0);  // 20 000 × 30 ÷ 60
  assert.deepEqual(s1.boosters.map(b => b.name), ['Pack']);
  assert.equal(r.sessions[1].boostPart, 20000); assert.deepEqual(r.sessions[1].acquisitions, []);
  assert.equal(r.phases[0].boostPart, 10000); assert.equal(r.phases[0].acquisitions[0].name, 'Garage');
  assert.equal(r.phases[1].from, 2); assert.equal(r.phases[1].to, 3); assert.equal(r.phases[1].boostPart, 20000);
});
