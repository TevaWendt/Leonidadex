'use strict';
/* Calculateur, lot 3 (« Même interface, intelligence renforcée ») : optimisation, comparaison et robustesse.
   Valeurs attendues calculées à la main dans les commentaires (jamais avec la fonction testée) ; les optimums annoncés
   sont vérifiés par une énumération indépendante écrite ici. Tous les montants sont FICTIFS (scénarios D, E, G, B, B bis). */
const test = require('node:test'), assert = require('node:assert/strict'), path = require('node:path');
const root = path.resolve(__dirname, '../..');
const E = require(path.join(root, 'calculateurs-engine.js')), B = require(path.join(root, 'calculateurs-scenario.js'));
const H = require('./check-ultime-helper.cjs');
const { load } = require('./runtime-helper.cjs');
const near = (a, b, eps = 1e-6) => assert.ok(a !== null && Math.abs(a - b) <= eps * Math.max(1, Math.abs(b)), a + ' ≠ ' + b);
const IC = o => E.investmentCompare({ capital: 500000, reserve: 0, price: 120000, baselineHourly: 100000, ...o });

/* ---------- « Ça vaut le coup ? » (modèle continu) ---------- */
test('T3-01 D : 120 000 $, +30 000 $/h : −60 000 $ sur 2 h, à l’équilibre sur 4 h, +60 000 $ sur 6 h ; seuil vérifié de part et d’autre', () => {
  // 30 000 × 2 − 120 000 = −60 000 ; 30 000 × 4 − 120 000 = 0 ; 30 000 × 6 − 120 000 = 60 000 ; remboursé après 120 000 ÷ 30 000 = 4 h
  const d2 = IC({ extraHourly: 30000, hours: 2 }), d4 = IC({ extraHourly: 30000, hours: 4 }), d6 = IC({ extraHourly: 30000, hours: 6 });
  assert.equal(d2.difference, -60000); assert.equal(d2.verdict, 'not-yet');
  assert.equal(d4.difference, 0); assert.equal(d4.verdict, 'even');
  assert.equal(d6.difference, 60000); assert.equal(d6.verdict, 'buy');
  assert.equal(d4.breakEvenHours, 4);
  // de part et d’autre du seuil : 4,0001 h → +3 $ (30 000 × 0,0001), 3,9999 h → −3 $
  assert.equal(IC({ extraHourly: 30000, hours: 4.0001 }).verdict, 'buy'); assert.equal(IC({ extraHourly: 30000, hours: 3.9999 }).verdict, 'not-yet');
  // prix seuil sur 2 h : 30 000 × 2 = 60 000 $ (payable tout de suite) ; gain en plus minimal sur 2 h : 120 000 ÷ 2 = 60 000 $/h
  assert.equal(d2.thresholds.maxPriceForHorizon, 60000); assert.equal(d2.thresholds.extraHourlyForHorizon, 60000);
});

test('T3-02 attendre l’argent : l’achat se paie quand l’argent est là (2 h), pas au départ — +40 000 $ sur 10 h au lieu de +80 000 $', () => {
  // 100 000 $, 20 000 gardés : disponible 80 000 ; prix 120 000 → il manque 40 000 ; à 20 000 $/h : 2 h d’attente ; 8 h d’usage
  // sans achat : 100 000 + 20 000 × 10 = 300 000 ; avec : 100 000 + 20 000 × 2 − 120 000 + 40 000 × 8 = 340 000 ; différence 40 000
  const w = E.investmentCompare({ capital: 100000, reserve: 20000, price: 120000, baselineHourly: 20000, extraHourly: 20000, hours: 10 });
  assert.equal(w.verdict, 'wait'); assert.equal(w.thresholds.waitHours, 2); assert.equal(w.thresholds.usableHours, 8);
  assert.equal(w.withoutCash, 300000); assert.equal(w.withCash, 340000); assert.equal(w.difference, 40000);
  // pour être remboursé sur les 8 h d’usage : 120 000 ÷ 8 = 15 000 $/h de plus
  assert.equal(w.thresholds.extraHourlyForHorizon, 15000);
  // prix seuil avec attente : P = m(bH + A)/(b + m) = 20 000 × (200 000 + 80 000) ÷ 40 000 = 140 000 ;
  // vérification : à 140 000, il manque 60 000 → 3 h d’attente, 7 h d’usage, 20 000 × 7 − 140 000 = 0
  assert.equal(w.thresholds.maxPriceForHorizon, 140000);
  assert.equal(E.investmentCompare({ capital: 100000, reserve: 20000, price: 140000, baselineHourly: 20000, extraHourly: 20000, hours: 10 }).difference, 0);
});

test('T3-03 attendre au-delà de l’horizon, ou sans gain actuel : rien n’est inventé', () => {
  // horizon 2 h, attente 2 h : l’argent n’est là qu’à la fin → aucun achat sur ce temps : différence 0, argent égal (100 000 + 40 000)
  const w = E.investmentCompare({ capital: 100000, reserve: 20000, price: 120000, baselineHourly: 20000, extraHourly: 20000, hours: 2 });
  assert.equal(w.difference, 0); assert.equal(w.withCash, 140000); assert.equal(w.withoutCash, 140000); assert.equal(w.thresholds.extraHourlyForHorizon, null);
  // sans gain actuel : le moment de l’achat est inconnu → ni différence, ni seuil (pas d’achat au départ inventé)
  const u = E.investmentCompare({ capital: 100000, price: 120000, extraHourly: 20000, hours: 10 });
  assert.equal(u.verdict, 'wait'); assert.equal(u.difference, null); assert.equal(u.withCash, null); assert.equal(u.thresholds.waitHours, null);
  assert.equal(u.thresholds.extraHourlyForHorizon, null); assert.equal(u.thresholds.maxPriceForHorizon, null);
});

test('T3-04 G : gain en plus pas écrit → réponse conditionnelle (jamais une erreur ni un 0) et gain minimal 12 000 $/h sur 10 h', () => {
  // 120 000 ÷ 10 = 12 000 $/h de plus pour être remboursé en 10 h ; aucun remboursement, aucune différence chiffrés
  const g = IC({ extraHourly: null, hours: 10 });
  assert.equal(g.valid, true); assert.equal(g.verdict, 'unknown-gain'); assert.equal(g.extraKnown, false);
  assert.equal(g.thresholds.extraHourlyForHorizon, 12000); assert.equal(g.breakEvenHours, null); assert.equal(g.difference, null); assert.equal(g.withCash, null);
  assert.equal(g.withoutCash, 1500000); // 500 000 + 100 000 × 10
});

test('T3-05 E : gain en plus nul ou négatif → « jamais », jamais « 0 h » (même pour un achat gratuit qui coûte à l’usage)', () => {
  const e = IC({ extraHourly: 0, hours: 10 }); assert.equal(e.verdict, 'never'); assert.equal(e.breakEvenHours, null);
  const f = IC({ price: 0, extraHourly: 0, costHourly: 1000, hours: 10 }); assert.equal(f.verdict, 'never'); assert.equal(f.breakEvenHours, null); assert.equal(f.difference, -10000);
});

test('T3-06 inversion et changement sans effet : le prix franchit le seuil (60 000 $ sur 2 h) ; le gain actuel ne change pas la différence', () => {
  // sur 2 h, +30 000 $/h : prix 59 000 → +1 000 (achète) ; 61 000 → −1 000 (pas encore)
  assert.equal(IC({ price: 59000, extraHourly: 30000, hours: 2 }).verdict, 'buy'); assert.equal(IC({ price: 61000, extraHourly: 30000, hours: 2 }).verdict, 'not-yet');
  // sans effet : ce que le joueur gagnait déjà (achat payable tout de suite) ne change ni la différence ni le verdict
  assert.equal(IC({ baselineHourly: 10000, extraHourly: 30000, hours: 6 }).difference, IC({ baselineHourly: 90000, extraHourly: 30000, hours: 6 }).difference);
});

/* ---------- Mon temps de jeu : optimum vérifié par énumération indépendante (B, B bis) ---------- */
function bestByEnumeration(acts, minutes) {
  // toutes les suites d’activités qui tiennent dans la partie (missions indivisibles, sans attente) : meilleur gain
  let best = 0;
  (function walk(t, gain) { best = Math.max(best, gain); acts.forEach(a => { const d = a.duration + (a.prep || 0); if (t + d <= minutes + 1e-9) walk(t + d, gain + a.reward - (a.cost || 0)); }); })(0, 0);
  return best;
}
test('T3-07 B et B bis : 30 min ; une action de 40 min est infaisable ; deux B (60 000 $) battent une A de 20 min (50 000 $) ; le moteur sait que sa recherche est complète', () => {
  const mk = (id, d, r) => ({ id, name: id, reward: r, cost: 0, duration: d, prep: 0, cooldown: 0, share: 100, investment: 0 });
  for (const acts of [[mk('A', 40, 100000), mk('B', 15, 30000)], [mk('A', 20, 50000), mk('B', 15, 30000)]]) {
    const r = E.sessionPlan({ capital: 0, reserve: 0, minutes: 30, activities: acts });
    assert.equal(r.valid, true); assert.equal(r.profit, 60000); assert.equal(r.profit, bestByEnumeration(acts, 30));
    assert.equal(r.exhaustive, true); assert.equal(r.limited, false);
    assert.deepEqual(r.timeline.map(x => x.id), ['B', 'B']);
  }
});

/* ---------- business plan : un achat qui en demande un autre attend qu’il soit obtenu ---------- */
test('T3-08 plan : B (demande A) se paie après l’obtention de A (60 min), jamais avant ; le vérificateur rejette l’ordre inverse (R3)', () => {
  // 200 000 $, A 30 000 obtenu en 60 min, B 50 000 demande A, 100 000 $/h, but 400 000 disponibles, parties de 60 :
  // A avant la partie 1 (170 000) ; partie 1 = obtention, 0 $ ; B après la partie 1 (120 000) ; parties 2 à 4 : 220 000, 320 000, 420 000 → 4 parties
  const input = { capital: 200000, reserve: 0, hourly: 100000, target: 400000, sessionMinutes: 60, purchases: [{ id: 'a', name: 'A', price: 30000, minutes: 60 }, { id: 'b', name: 'B', price: 50000, requires: ['a'] }] };
  const r = E.missionPlan(input);
  assert.equal(r.valid, true); assert.equal(r.totalSessions, 4); assert.equal(r.finalCash, 420000);
  const b = r.purchases.find(x => x.id === 'b'); assert.equal(b.atSession, 1); assert.equal(b.before, false); assert.equal(b.atMinute, 60);
  assert.equal(E.missionVerify(r).ok, true);
  // corruption : la dépense de B déplacée avant la fin de l’obtention de A (à 0 min) → R3 (B demande A, pas encore possédé)
  const bad = JSON.parse(JSON.stringify(r)); const i = bad.journal.findIndex(e => e.type === 'spend' && e.id === 'b'); const e = bad.journal.splice(i, 1)[0];
  e.at = 0; e.t = 0; e.session = 1; bad.journal.splice(1, 0, e);
  assert.ok(E.missionVerify(bad).violations.some(v => v.rule === 'R3'), JSON.stringify(E.missionVerify(bad).violations));
  // parcours : A à 0, obtention 0 → 60, B à 60 (120 000), puis 280 000 ÷ 100 000 = 2,8 h → 60 + 168 = 228 min
  const f = E.missionPlan({ ...input, sessionMinutes: null }); assert.equal(f.totalMinutes, 228); assert.equal(E.missionVerify(f).ok, true);
});

/* ---------- « Quel achat choisir ? » : deux achats du même nom ne se confondent plus ---------- */
const site = H.siteData(), initial = B.initial(H.dataVersion(site.D, site.catalogue, site.sourceActivities), site.presets);
function twoFree() {
  const s = H.baseState(B, initial, site.catalogue);
  s.assets = [...s.assets, { ...B.copy(B.assetTemplate), key: 'free-a', name: 'Mon achat libre', price: 300000, extras: 0, fees: 0, utility: 3 }, { ...B.copy(B.assetTemplate), key: 'free-b', name: 'Mon achat libre', price: 50000, extras: 0, fees: 0, utility: 3 }];
  s.compare.keys = ['free-a', 'free-b']; s.compare.criterion = 'cheapest'; return B.validate(s, initial);
}
test('T3-09 comparateur : deux « Mon achat libre » → noms uniques ; le moins cher (50 000 $) gagne sous son propre nom', () => {
  const s = twoFree();
  assert.deepEqual(B.compareNames(s), { 'free-a': 'Mon achat libre', 'free-b': 'Mon achat libre (2)' });
  // un nom déjà de la forme « X (2) » n’est jamais repris : le deuxième « X » devient « X (3) »
  assert.deepEqual(B.compareNames({ compare: { keys: ['a', 'b', 'c'] }, assets: [{ key: 'a', name: 'X' }, { key: 'b', name: 'X (2)' }, { key: 'c', name: 'X' }] }), { a: 'X', b: 'X (2)', c: 'X (3)' });
  const r = B.evaluate('compare', s, site.sourceActivities, { catalogue: site.catalogue });
  assert.equal(r.valid, true); assert.equal(r.best, 'Mon achat libre (2)'); assert.equal(r.bestTotal, 50000);
});

/* ---------- « Ça vaut le coup ? » : ce qui ferait basculer la réponse, dans le bon sens (§ 8) ---------- */
const sp = t => String(t || '').replace(/[\s  ]+/g, ' ').trim();
test('T3-10 seuils de bascule : achat pas remboursé → ce qui le ferait gagner ; remboursé → ce qui le ferait perdre ; rien d’inventé', () => {
  // 500 000 $, prix 120 000, +20 000 $/h. Sur 4 h : 80 000 − 120 000 = −40 000 (pas remboursé) ; prix seuil 20 000 × 4 = 80 000 ;
  // gain seuil 120 000 ÷ 4 = 30 000 $/h ; remboursé après 120 000 ÷ 20 000 = 6 h d’usage
  assert.deepEqual(B.roiChanges(IC({ extraHourly: 20000, hours: 4 })).map(sp), ['À 80 000 $ de prix total ou moins, il serait remboursé en 4 h.', 'À partir de 30 000 $ de gain en plus par heure, il serait remboursé en 4 h.', 'S’il te sert au moins 6 h après l’achat, il est remboursé.']);
  // sur 10 h : 200 000 − 120 000 = +80 000 ; prix seuil 200 000 ; gain seuil 12 000 $/h
  assert.deepEqual(B.roiChanges(IC({ extraHourly: 20000, hours: 10 })).map(sp), ['Au-dessus de 200 000 $ de prix total, il n’est plus remboursé en 10 h.', 'En dessous de 12 000 $ de gain en plus par heure, il n’est plus remboursé en 10 h.', 'S’il te sert moins de 6 h, il n’est pas remboursé.']);
  // l’argent n’est là qu’à la fin (attente 2 h sur 2 h) : pas remboursé ; à 40 000 $ (≤ 80 000 disponibles), 20 000 × 2 − 40 000 = 0
  const w = E.investmentCompare({ capital: 100000, reserve: 20000, price: 120000, baselineHourly: 20000, extraHourly: 20000, hours: 2 });
  assert.deepEqual(B.roiChanges(w).map(sp), ['À 40 000 $ de prix total ou moins, il serait remboursé en 2 h.', 'S’il te sert au moins 6 h après l’achat, il est remboursé.']);
  // gain en plus pas écrit, ou achat gratuit qui ne change rien : aucun seuil chiffré
  assert.deepEqual(B.roiChanges(IC({ extraHourly: null, hours: 10 })), []);
  assert.deepEqual(B.roiChanges(IC({ price: 0, extraHourly: 0, hours: 10 })), []);
});

test('T3-11 E : achat gratuit qui coûte à l’usage → jamais « remboursé après 0 h » (E.roi aussi) ; gratuit et gagnant → rien à rembourser (0)', () => {
  assert.equal(E.roi({ purchase: 0, revenueHourly: 0, costHourly: 1000, hours: 10 }).paybackHours, null);
  assert.equal(E.roi({ purchase: 0, revenueHourly: 5000, costHourly: 0, hours: 10 }).paybackHours, 0);
  assert.equal(E.roi({ purchase: 50000, revenueHourly: 1000, costHourly: 1000, hours: 10 }).paybackHours, null);
});

/* ---------- scénario I : préparation sans revenu comptée une fois, coût d’opportunité ---------- */
test('T3-12 I : 60 000 $, 30 min de préparation, 40 000 $/h au lieu de 20 000 $/h → égalité à 4 h (80 000 $ de part et d’autre)', () => {
  // activité : 10 000 $ toutes les 15 min (= 40 000 $/h), 30 min de préparation une seule fois. Fins : 45, 60, …, 45 + 15k ≤ 240 → 14
  // missions = 140 000 $ = 3,5 h × 40 000. Continuer : 4 × 20 000 = 80 000. Investir : 140 000 − 60 000 = 80 000 → différence 0.
  const act = { id: 'i', name: 'I', reward: 10000, duration: 15, prep: 30, prepOnce: true, cost: 0, cooldown: 0, share: 100, players: 1 };
  const at = h => E.investmentActivities({ purchase: 60000, hours: h, activities: [act], baselineHourly: 20000, mode: 'new' });
  const r4 = at(4);
  assert.equal(r4.operatingProfit, 140000); assert.equal(r4.opportunityCost, 80000); assert.equal(r4.netProfit, 80000);
  assert.equal(r4.marginalNetProfit, 0);
  // remboursé POUR DE BON (lot 5, relecture L5) : à 4 h la différence vaut 0 ; juste avant la 15e fin (4 h 15) : 140 000 − 85 000 − 60 000 = −5 000 ;
  // à 4 h 15 : +5 000 ; ensuite le point le plus bas avant chaque fin monte de 5 000 par mission (0 juste avant 4 h 30) : devant pour de bon à 4 h 15
  assert.equal(r4.marginalPaybackHours, 4.25); assert.equal(r4.marginalPaybackCycles, 15);
  // 60 000 ÷ (40 000 − 20 000) = 3 h oublierait la préparation : le moteur ne le fait pas
  assert.notEqual(r4.marginalPaybackHours, 60000 / (40000 - 20000));
  // 3 h : fins 45…180 → 10 missions = 100 000 ; 100 000 − 60 000 − 60 000 = −20 000. 6 h : 22 missions = 220 000 ; 220 000 − 120 000 − 60 000 = +40 000
  assert.equal(at(3).marginalNetProfit, -20000); assert.equal(at(6).marginalNetProfit, 40000);
});

/* ---------- « Quel achat choisir ? » : gratuit noté, prix qui inverse le gagnant ---------- */
test('T3-13 comparateur : un achat gratuit noté a le meilleur rapport envie / prix ; prix qui inverse le gagnant pour chaque critère chiffré', () => {
  const base = { capital: 200000, reserve: 0, hourly: 50000 };
  const ch = (criterion, items) => E.choose({ ...base, criterion, items });
  assert.equal(ch('value', [{ name: 'Gratuit', price: 0, utility: 3 }, { name: 'Payant', price: 100000, utility: 4 }]).best, 'Gratuit');
  const flip = r => B.compareChanges(r).map(sp);
  // le moins cher : A 80 000 gagne ; B (120 000) passe devant si A dépasse 120 000
  assert.deepEqual(flip(ch('cheapest', [{ name: 'A', price: 80000 }, { name: 'B', price: 120000 }, { name: 'C', price: 150000 }])), ['« B » passerait devant si le prix total de « A » dépassait 120 000 $.']);
  // envie / prix : A 4 pour 100 000 (4 pour 100 000 $), B 5 pour 150 000 (3,33) ; A reste devant tant que 4 × 100 000 ÷ P ≥ 3,33 → P ≤ 120 000
  assert.deepEqual(flip(ch('value', [{ name: 'A', price: 100000, utility: 4 }, { name: 'B', price: 150000, utility: 5 }])), ['« B » passerait devant si le prix total de « A » dépassait 120 000 $.']);
  // se rembourse le plus vite : A 100 000 ÷ 20 000 = 5 h, B 90 000 ÷ 10 000 = 9 h ; A passe derrière au-delà de 20 000 × 9 = 180 000
  assert.deepEqual(flip(ch('profit', [{ name: 'A', price: 100000, incomeHourly: 20000 }, { name: 'B', price: 90000, incomeHourly: 10000 }])), ['« B » passerait devant si le prix total de « A » dépassait 180 000 $.']);
  // le plus vite à avoir : 200 000 disponibles, 50 000 $/h : A 300 000 → 2 h, B 400 000 → 4 h ; même gain : le seuil est le prix de B
  assert.deepEqual(flip(ch('fastest', [{ name: 'A', price: 300000 }, { name: 'B', price: 400000 }])), ['« B » passerait devant si le prix total de « A » dépassait 400 000 $.']);
  // sans effet : deux achats payables tout de suite sont à égalité de délai (0 h) → rien n’est inventé ; l’envie (1 à 5) n’a pas de seuil en $
  assert.deepEqual(B.compareChanges(ch('fastest', [{ name: 'A', price: 100000 }, { name: 'B', price: 150000 }])), []);
  assert.deepEqual(B.compareChanges(ch('utility', [{ name: 'A', price: 100000, utility: 5 }, { name: 'B', price: 150000, utility: 3 }])), []);
});

/* ---------- « Quoi acheter d’abord ? » : achats perdants payés avec les suivants, branche sans achat, ordre qui s’inverse ---------- */
// simulateur indépendant (écrit ici) : des groupes consécutifs payés ensemble dès que l’argent est là
function simGroups(C, R, h, groups) { let cash = C, t = 0, hr = h; for (const g of groups) { const need = g.reduce((s, x) => s + x.price, 0); if (cash < need + R - 1e-9) { if (!(hr > 0)) return Infinity; t += (need + R - cash) / hr; cash = need + R; } cash -= need; for (const x of g) hr += (x.boostHourly || 0) - (x.costHourly || 0); } return t; }
const perms = a => a.length <= 1 ? [a] : a.flatMap((x, i) => perms(a.slice(0, i).concat(a.slice(i + 1))).map(p => [x].concat(p)));
const splits = a => !a.length ? [[]] : Array.from({ length: a.length }, (_, k) => k + 1).flatMap(k => splits(a.slice(k)).map(rest => [a.slice(0, k)].concat(rest)));
test('T3-14 ordre : un achat qui coûte à l’usage sans rapporter se paie avec le suivant (10 h au lieu de 15 h), jamais plus lent', () => {
  const X = { name: 'X', price: 50000, costHourly: 5000 }, Z = { name: 'Z', price: 50000, costHourly: 5000 }, Y = { name: 'Y', price: 100000, boostHourly: 20000 };
  const o = (items, defer) => E.order({ capital: 0, reserve: 0, hourly: 10000, deferLosses: defer, items });
  // dès que possible : X à 5 h, puis 5 000 $/h → Z à 5 + 10 = 15 h ; payés ensemble : 100 000 ÷ 10 000 = 10 h
  assert.equal(o([X, Z], false).totalHours, 15); assert.equal(o([X, Z], true).totalHours, 10);
  const g = o([X, Z], true); assert.equal(g.steps[0].withNext, true); assert.equal(g.steps[0].timeHours, 10); assert.equal(g.steps[1].waitHours, 0);
  // Y puis X : Y à 10 h (30 000 $/h), X 50 000 ÷ 30 000 = 1 h 40 → 11 h 40 ; X puis Y : groupe X + Y (gain net +15 000) à 150 000 ÷ 10 000 = 15 h
  assert.ok(Math.abs(o([Y, X], true).totalHours - (10 + 50000 / 30000)) < 1e-9); assert.equal(o([X, Y], true).totalHours, 15);
  // K coûte 20 000 $/h : seul, il bloque Y (gain −10 000 $/h) ; payé avec Y (net 0) : 110 000 ÷ 10 000 = 11 h
  const K = { name: 'K', price: 10000, costHourly: 20000 };
  assert.equal(o([K, Y], false).valid, false); assert.equal(o([K, Y], true).totalHours, 11);
  assert.match(sp(E.order({ capital: 0, reserve: 0, hourly: null, deferLosses: true, items: [K, Y] }).reason), /^Étape 1 bloquée : il manque 110 000 \$ pour « K » et « Y »\./);
  // sans l’option (Léo, appel d’avant) : comportement inchangé
  assert.equal(E.order({ capital: 0, reserve: 0, hourly: 10000, items: [X, Z] }).totalHours, 15);
  // propriétés (400 cas, 2 à 4 achats) : jamais plus lent que « dès que possible » ni que « tout d’un coup à la fin » ; la réserve est gardée ;
  // et le meilleur ordre égale l’optimum de l’énumération indépendante (tous les ordres × tous les groupes consécutifs)
  let seed = 11; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  for (let n = 0; n < 400; n += 1) {
    const k = 2 + Math.floor(rnd() * 3), C = Math.floor(rnd() * 3) * 50000, R = rnd() < 0.3 ? 20000 : 0, h = 5000 + Math.floor(rnd() * 4) * 5000;
    if (C < R) { assert.equal(E.order({ capital: C, reserve: R, hourly: h, deferLosses: true, items: [{ name: 'x', price: 1 }] }).valid, false); continue; }
    const items = Array.from({ length: k }, (_, i) => ({ name: 'I' + i, price: (1 + Math.floor(rnd() * 10)) * 20000, boostHourly: rnd() < 0.5 ? Math.floor(rnd() * 6) * 5000 : 0, costHourly: rnd() < 0.4 ? Math.floor(rnd() * 6) * 3000 : 0 }));
    let best = Infinity;
    for (const p of perms(items)) {
      const d = E.order({ capital: C, reserve: R, hourly: h, deferLosses: true, items: p }), a = E.order({ capital: C, reserve: R, hourly: h, items: p });
      if (a.valid) assert.ok(d.valid && d.totalHours <= a.totalHours + 1e-9, 'jamais plus lent que dès que possible');
      if (d.valid) { best = Math.min(best, d.totalHours); d.steps.forEach(st => assert.ok(st.capital >= R - 1e-6, 'réserve gardée')); assert.deepEqual(d.steps.map(st => st.name), p.map(x => x.name), 'ordre tenu'); }
    }
    const all = simGroups(C, R, h, [items]); if (Number.isFinite(all)) assert.ok(best <= all + 1e-9, 'jamais plus lent que tout d’un coup');
    const opt = Math.min(...perms(items).flatMap(p => splits(p).map(g => simGroups(C, R, h, g))));
    assert.ok(Math.abs(best - opt) <= 1e-9 * Math.max(1, opt) || (best === Infinity && opt === Infinity), JSON.stringify({ C, R, h, items, best, opt }));
  }
});

function orderState(defs) {
  let s = H.baseState(B, initial, site.catalogue); s.tab = 'order'; s.views.order = 'advanced'; const keys = [];
  defs.forEach((d, i) => { const a = { ...B.copy(B.assetTemplate), key: 'o' + i, name: d.name, price: d.price, extras: 0, fees: 0, incomeMode: d.boost ? 'personal' : 'none', boostHourly: d.boost || 0, usage: d.usage ? { perSession: d.usage } : {} }; s.assets.push(a); keys.push(a.key); });
  s.order.keys = keys; s.order.objective = 'all'; Object.assign(s.goal, { capital: 0, reserve: 0, hourly: 10000, dailyMinutes: 60 }); return B.validate(s, initial);
}
test('T3-15 ordre : branche sans achat (25 h) et prix qui inverse l’ordre (150 000 $ ; 112 500 $ par la formule d’échange)', () => {
  // 0 $, 10 000 $/h ; A 100 000 (+20 000 $/h), B 150 000 (+20 000 $/h). A puis B : 10 + 150 000 ÷ 30 000 = 15 h ; B puis A : 15 + 3 h 20 ;
  // tout d’un coup : 250 000 ÷ 10 000 = 25 h (10 h de plus). Échange : A d’abord tant que pA·gB·(h + gA) < pB·gA·(h + gB) → pA < 150 000.
  const x = B.analysis('order', orderState([{ name: 'A', price: 100000, boost: 20000 }, { name: 'B', price: 150000, boost: 20000 }]), site.sourceActivities, { catalogue: site.catalogue });
  assert.equal(x.best.result.totalHours, 15); assert.equal(x.noBuy.result.totalHours, 25); assert.equal(x.flip.price, 150000);
  assert.ok(x.explain.drivers.some(d => d.label === 'Sans achat en route' && /cet ordre fait gagner 10 h\.$/.test(sp(d.text))));
  assert.ok(x.explain.changes.map(sp).includes('Si « A » coûtait plus de 150 000 $, acheter « B » avant lui deviendrait plus rapide.'));
  // gains différents : A +10 000, B +20 000 : pA* = 150 000 × 10 000 × 30 000 ÷ (20 000 × 20 000) = 112 500 ; à ce prix les deux ordres prennent 18 h 45
  const y = B.analysis('order', orderState([{ name: 'A', price: 100000, boost: 10000 }, { name: 'B', price: 150000, boost: 20000 }]), site.sourceActivities, { catalogue: site.catalogue });
  assert.equal(y.flip.price, 112500);
  // sans effet : deux achats plaisir (sans gain ni coût d’usage) : l’ordre ne change pas le total (120 000 ÷ 10 000 = 12 h) et aucun seuil n’est dit
  const z = B.analysis('order', orderState([{ name: 'P', price: 50000 }, { name: 'Q', price: 70000 }]), site.sourceActivities, { catalogue: site.catalogue });
  assert.equal(z.best.result.totalHours, 12); assert.equal(z.noBuy.result.totalHours, 12); assert.equal(z.flip, null);
});

/* ---------- Mes activités : une combinaison plutôt qu’un taux isolé ---------- */
function bestMix(acts, minutes) {
  // énumération indépendante : chaque suite d’activités (attente avant de recommencer comprise) qui finit dans le temps donné
  let best = 0;
  (function walk(t, ready, gain) { best = Math.max(best, gain); acts.forEach((a, i) => { const start = Math.max(t, ready[i]), end = start + a.duration + a.prep; if (end <= minutes + 1e-9) { const r2 = ready.slice(); r2[i] = end + a.cooldown; walk(end, r2, gain + a.reward - a.cost); } }); })(0, acts.map(() => 0), 0);
  return best;
}
test('T3-16 Mes activités : en 90 min, 2 × A + 1 × B (155 000 $) battent B seule (110 000 $) ; en 60 min, rien ne bat B seule', () => {
  const s0 = H.baseState(B, initial, site.catalogue), acts = B.activities(B.validate(s0, initial), site.sourceActivities).filter(a => a.id !== 'scenario-c');
  // A : 25 000 − 2 500 = 22 500 $ en 12 + 3 min, 5 min d’attente ; B : 120 000 − 10 000 = 110 000 $ en 40 + 10 min, 10 min d’attente
  assert.equal(bestMix(acts, 90), 155000); assert.equal(bestMix(acts, 60), 110000);
  const at = m => B.analysis('activities', B.validate({ ...s0, inverse: { ...s0.inverse, minutes: m } }, initial), site.sourceActivities, { catalogue: site.catalogue });
  const x = at(90);
  assert.equal(x.best.profit, 110000); assert.equal(x.mix.profit, 155000); assert.equal(x.mix.gain, 45000); assert.equal(x.mix.exhaustive, true);
  assert.ok(x.explain.drivers.some(d => d.label === 'En les combinant' && /155 000 \$, soit 45 000 \$ de plus .* Toutes les suites possibles ont été comparées\.$/.test(sp(d.text))));
  assert.equal(at(60).mix, null);
});

/* ---------- pages réelles (une à la fois) ---------- */
const flat = t => String(t || '').replace(/[\s  ]+/g, ' ').trim();
async function page(tool, s) { return load(root, 'calculateurs.html?tool=' + tool, { storage: { 'lk-calculator-v1': JSON.stringify(s), 'lk-calc-folds-v1': JSON.stringify({ all: true }) } }); }
function roiState(edit) { const s = H.baseState(B, initial, site.catalogue); s.tab = 'roi'; s.views.roi = 'advanced'; const a = B.asset(s, s.roi.key); Object.assign(a, { price: 120000, extras: 0, fees: 0 }); s.roi.mode = 'continuous'; s.roi.costHourly = 0; edit(s); return B.validate(s, initial); }
test('T3-17 page « Ça vaut le coup ? » : gain en plus pas écrit → réponse conditionnelle avec le seuil (12 000 $/h sur 10 h), pas d’alerte', async () => {
  const p = await page('roi', roiState(s => { s.goal.capital = 500000; s.goal.reserve = 0; s.goal.hourly = 100000; s.roi.revenueHourly = null; s.roi.hours = 10; }));
  const res = p.d.getElementById('roi-results'), ans = flat(res.querySelector('.calc-answer')?.textContent);
  assert.match(ans, /^Je ne peux pas encore dire si .* vaut le coup : écris ce qu’il te fait gagner en plus par heure\. Pour être remboursé en 10 h, il devrait te rapporter au moins 12 000 \$ de plus par heure\.$/);
  assert.doesNotMatch(ans, /\b(ROI|amortissement|trésorerie|hypothèse|scénario|capital)\b/i);
  assert.equal(res.querySelector('.calc-warning'), null);
  assert.deepEqual(p.errors, []); assert.doesNotMatch(flat(res.textContent), /NaN|undefined|Infinity/); p.close();
});
test('T3-18 page « Ça vaut le coup ? » : pas assez d’argent → « 120 000 $ après 2 h », 340 000 $ après 10 h, +40 000 $', async () => {
  const p = await page('roi', roiState(s => { s.goal.capital = 100000; s.goal.reserve = 20000; s.goal.hourly = 20000; s.roi.revenueHourly = 20000; s.roi.hours = 10; }));
  const res = flat(p.d.getElementById('roi-results').textContent);
  assert.match(res, /Acheté dès que possible, il te laisserait 40 000 \$ de plus après 10 h de jeu\./);
  assert.match(res, /Je paie au départ ?0 \$ ?120 000 \$ après 2 h/); assert.match(res, /Argent après 10 h ?300 000 \$ ?340 000 \$/);
  assert.match(res, /Au-dessus de 140 000 \$ de prix total, il ne serait plus remboursé en 10 h\./);
  assert.deepEqual(p.errors, []); p.close();
});
test('T3-19 page Mon temps de jeu : « Si tu n’as que … » parmi les autres programmes ; meilleur programme 110 000 $ (calculé à la main) ; jamais « Recherche complète » à côté de la note « Il en existe peut-être un encore meilleur »', async () => {
  // état de départ, partie de 60 min, 200 000 $ : A = 25 000 − 2 500 = 22 500 $ en 12 + 3 min puis 5 min d’attente ; B = 120 000 − 10 000 = 110 000 $
  // en 40 + 10 min ; C demande un achat de 500 000 $ (pas payable). Suites possibles : B seul (50 min) 110 000 $ ; A, A, A (0–15, 20–35, 40–55)
  // 67 500 $ ; A + B ou B + A = 65 min > 60. Meilleur : 110 000 $.
  const s = H.baseState(B, initial, site.catalogue); s.tab = 'session'; s.views.session = 'advanced';
  const p = await page('session', B.validate(s, initial));
  const res = flat(p.d.getElementById('session-results').textContent);
  assert.match(res, /110 000 \$/);
  assert.match(res, /Si tu n’as que /);
  assert.match(res, /Il en existe peut-être un encore meilleur/);
  assert.doesNotMatch(res, /Recherche complète/);
  assert.deepEqual(p.errors, []); p.close();
});
test('T3-20 page comparateur : deux achats du même nom → le bouton du plan vise le bon achat (free-b, 50 000 $)', async () => {
  const s = twoFree(); s.tab = 'compare';
  const p = await page('compare', s);
  const btn = p.d.querySelector('#compare-results [data-b-compare-to-plan]');
  assert.ok(btn, 'bouton vers le plan'); assert.equal(btn.dataset.bCompareToPlan, 'free-b');
  assert.match(flat(p.d.getElementById('compare-results').querySelector('.calc-answer')?.textContent), /Mon achat libre \(2\)/);
  assert.deepEqual(p.errors, []); p.close();
});
test('T3-21 page « Ça vaut le coup ? » : pas remboursé sur 4 h → seuils dits dans le bon sens ; achat gratuit → « rien à rembourser », jamais « 0 min »', async () => {
  let p = await page('roi', roiState(s => { s.goal.capital = 500000; s.goal.reserve = 0; s.goal.hourly = 100000; s.roi.revenueHourly = 20000; s.roi.hours = 4; }));
  let res = p.d.getElementById('roi-results'), all = flat(res.textContent);
  assert.match(all, /À 80 000 \$ de prix total ou moins, il serait remboursé en 4 h\./); assert.doesNotMatch(all, /Au-dessus de 80 000 \$/);
  assert.match(all, /À partir de 30 000 \$ de gain en plus par heure, il serait remboursé en 4 h\./);
  assert.deepEqual(p.errors, []); p.close();
  p = await page('roi', roiState((s, a) => { B.asset(s, s.roi.key).price = 0; s.goal.capital = 500000; s.goal.reserve = 0; s.goal.hourly = 100000; s.roi.revenueHourly = 10000; s.roi.hours = 10; }));
  res = p.d.getElementById('roi-results'); all = flat(res.textContent);
  assert.match(flat(res.querySelector('.calc-answer')?.textContent), /ne coûte rien au départ et te rapporte 10 000 \$ de plus par heure\. Après 10 h, tu auras 100 000 \$ de plus/);
  assert.equal(flat(res.querySelector('[data-c-number="roi-payback"]')?.textContent), 'Rien à rembourser');
  assert.doesNotMatch(all, /au moins 0 \$|après 0 min/);
  // « Ce qui décide la réponse » lit le moteur (avant : « Rien n’est encore calculable » sous une réponse calculée) ; courbe sans « 0 min »
  assert.doesNotMatch(all, /Rien n’est encore calculable/); assert.match(all, /Remboursement — Rien à rembourser : il ne coûte rien au départ\./);
  assert.match(all, /Avec ou sans l’achat — Après 10 h : \+100 000 \$ avec l’achat, prix enlevé\./);
  assert.match(all, /Il ne coûte rien : dès le départ, la ligne avec l’achat monte plus vite que celle sans\./);
  assert.deepEqual(p.errors, []); p.close();
});
test('T3-22 page « Ça vaut le coup ? », nouvelle activité (scénario I) : à l’équilibre sur 4 h, perte de 20 000 $ sur 3 h, devant pour de bon après 4 h 15 partout (réponse, chiffre, explication)', async () => {
  const st = h => roiState(s => { B.asset(s, s.roi.key).price = 60000; Object.assign(s.activities[0], { reward: 10000, duration: 15, prep: 30, prepOnce: true, cost: 0, cooldown: 0, share: 100, investment: 0, owned: true, players: 1 }); s.roi.mode = 'new'; s.roi.activityIds = [s.activities[0].id]; s.goal.capital = 500000; s.goal.reserve = 0; s.goal.hourly = 20000; s.roi.hours = h; });
  let p = await page('roi', st(4)), res = p.d.getElementById('roi-results');
  assert.match(flat(res.querySelector('.calc-answer')?.textContent), /^À l’équilibre : après 4 h, .* ne te laisse ni plus ni moins qu’en continuant ce que tu faisais\. Il n’est devant pour de bon qu’après 4 h 15 de jeu \(15 missions finies\)\.$/);
  assert.equal(flat(res.querySelector('[data-c-number="roi-payback"]')?.textContent), '4 h 15');
  assert.match(flat(res.querySelector('.calc-next-action p')?.textContent), /au moins 4 h 15 : avant, il ne te laisse rien de plus\.$/);
  assert.match(flat(res.textContent), /Avec ou sans l’achat — Sur 4 h : 0 \$, prix enlevé, comparé à ce que tu faisais\.Remboursement — Après 4 h 15 de jeu \(15 missions\)\./);
  assert.deepEqual(p.errors, []); p.close();
  p = await page('roi', st(3)); res = p.d.getElementById('roi-results');
  assert.match(flat(res.querySelector('.calc-answer')?.textContent), /^Pas sur 3 h : .* te fait perdre 20 000 \$ par rapport à ce que tu faisais\. Il ne serait remboursé qu’après 4 h 15 de jeu \(15 missions finies\)\.$/);
  assert.doesNotMatch(flat(res.querySelector('.calc-answer')?.textContent), /^Oui/);
  assert.deepEqual(p.errors, []); p.close();
});
test('T3-23 page « Quoi acheter d’abord ? » : achat perdant payé avec le suivant (dit à l’étape) et ligne « Rien avant la fin, puis tout d’un coup »', async () => {
  const p = await page('order', orderState([{ name: 'X', price: 50000, usage: 5000 }, { name: 'Z', price: 50000, usage: 5000 }]));
  const res = p.d.getElementById('order-results'), all = flat(res.textContent);
  assert.match(flat(res.querySelector('.calc-answer')?.textContent), /Tout est à toi en 10 h de jeu/);
  assert.match(flat(res.querySelector('.calc-order-steps')?.textContent), /Payé en même temps que le suivant : plus tôt, il te coûterait à l’usage/);
  assert.match(all, /Rien avant la fin, puis tout d’un coup ?10 h/);
  assert.deepEqual(p.errors, []); assert.doesNotMatch(all, /NaN|undefined|Infinity/); p.close();
});

/* ---------- relecture lot 5 (L5) puis seconde relecture : « remboursé après », recalculé indépendamment ---------- */
test('T3-24 « remboursé après » suit la réponse : devant à la fin du temps d’usage → début de la dernière période devant (≤ ce temps) ; à égalité ou derrière → devant pour de bon, ou rien (nouvelle activité, amélioration, plusieurs activités ; simulation écrite à part)', () => {
  // simulation indépendante : activités l’une après l’autre dans l’ordre de la liste ; chacune attend la fin de la précédente et sa propre
  // attente ; préparation à chaque fois ou une seule fois ; gain = récompense × part − frais, compté à la fin de la mission.
  // D(t) = gains des missions finies à t (moins ceux sans l’achat, en amélioration) − gain d’avant × t (nouvelle activité) − prix.
  let seed = 11; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648, pick = xs => xs[Math.floor(rnd() * xs.length)];
  const ends = (list, W) => { const out = [], ready = list.map(() => 0), count = list.map(() => 0); let t = 0;
    for (let n = 0; n < 200000; n += 1) { const i = n % list.length, a = list[i], start = Math.max(t, ready[i]), end = start + a.duration + (a.prepOnce && count[i] > 0 ? 0 : a.prep);
      if (end > W) break; out.push({ t: end, v: a.reward * a.share / 100 - a.cost }); ready[i] = end + a.cooldown; count[i] += 1; t = end; }
    return out; };
  const rule = (after, before, price, base, H, W) => {
    const ev = ends(after, W).map(e => ({ ...e, s: 1 })).concat(before ? ends(before, W).map(e => ({ ...e, s: -1 })) : []).sort((x, y) => x.t - y.t), tol = 0.005 + 1e-9 * price, per = (base || 0) / 60;
    const run = limit => { let cum = 0, ahead = false, T = null, i = 0;
      while (i < ev.length && ev[i].t <= limit + 1e-9) { const t = ev[i].t; if (cum - per * t - price < -tol) { ahead = false; T = null; }
        while (i < ev.length && Math.abs(ev[i].t - t) < 1e-9) { cum += ev[i].s * ev[i].v; i += 1; }
        if (cum - per * t - price >= -tol) { if (!ahead) { ahead = true; T = t; } } else { ahead = false; T = null; } }
      const end = cum - per * limit - price; return { T: end < -tol ? null : (ahead ? T : null), end }; };
    const h = run(H); if (h.end > tol) return { T: h.T, beyond: false };
    const w = run(W); if (w.T !== null) return { T: w.T, beyond: true };
    return { T: h.end >= -tol ? h.T : null, beyond: false };
  };
  let same = 0, prudent = 0;
  for (let n = 0; n < 400; n += 1) {
    const improve = rnd() < 0.4, list = Array.from({ length: 1 + Math.floor(rnd() * 3) }, (_, i) => ({ id: 'a' + i, name: 'A' + i, reward: pick([5000, 10000, 20000, 40000]), share: pick([100, 100, 50]), duration: pick([5, 10, 15, 30, 45]), prep: pick([0, 5, 20]), prepOnce: rnd() < 0.4, cost: pick([0, 1000, 5000]), cooldown: pick([0, 10, 30]), players: 1 }));
    const price = pick([5000, 20000, 60000, 100000]), H = pick([1, 2, 3, 4.5, 8]), base = improve ? null : pick([null, 10000, 20000, 40000]), red = improve ? pick([0, 25, 50]) : 0, gain = improve ? pick([0, 25]) : 0;
    const r = E.investmentActivities({ purchase: price, hours: H, activities: list, mode: improve ? 'improve' : 'new', baselineHourly: base, durationReduction: red, gainPercent: gain });
    if (!r.valid) continue;
    const got = improve || base === null ? r.paybackHours : r.marginalPaybackHours, after = list.map(a => ({ ...a, reward: a.reward * (1 + gain / 100), duration: a.duration * (1 - red / 100) }));
    const exp = rule(after, improve ? list : null, price, base, H * 60, Math.max(H * 60 * 40, 20000));
    if ((got === null && exp.T === null) || (got !== null && exp.T !== null && Math.abs(got * 60 - exp.T) < 1e-6)) { same += 1; continue; }
    // seul écart admis : le moteur ne conclut pas (« pas atteint ») quand l’achat ne passe devant pour de bon que bien au-delà du temps d’usage
    assert.ok(got === null && exp.beyond, 'écart : ' + JSON.stringify({ improve, list, price, H, base, red, gain, got, exp }));
    prudent += 1;
  }
  assert.ok(same >= 300, 'cas identiques : ' + same); assert.ok(prudent <= same * 0.02, 'cas prudents : ' + prudent);
});
