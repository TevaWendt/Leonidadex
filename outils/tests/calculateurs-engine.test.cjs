'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../../calculateurs-engine.js');
const A = { reward: 25000, cost: 2500, duration: 12, prep: 3, cooldown: 5, share: 100, investment: 0, players: 1 };
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) <= Math.max(1e-8, Math.abs(expected) * 1e-10), `${actual} ≠ ${expected}`);
function assertSafe(value) {
  assert.notEqual(value, undefined);
  if (typeof value === 'number') assert.ok(Number.isFinite(value), `Unsafe number: ${value}`);
  if (Array.isArray(value)) value.forEach(assertSafe);
  else if (value && typeof value === 'object') Object.values(value).forEach(assertSafe);
}

test('activity includes preparation, cooldown and personal expenses', () => {
  assert.deepEqual(E.activity(A), { valid: true, reason: null, net: 22500, activeMinutes: 15, cycleMinutes: 20, hourly: 67500, investment: 0, paybackRuns: 0 });
});
test('activity computes whole-run payback without a decimal rounding mission', () => {
  assert.equal(E.activity({ reward: 0.01, duration: 1, investment: 0.07 }).paybackRuns, 7);
  assert.equal(E.activity({ reward: 0, duration: 1, investment: 1 }).paybackRuns, null);
  assert.equal(E.activity({ reward: 0, duration: 1, investment: 0 }).paybackRuns, 0);
});
test('reward share is applied once, players never divides it twice', () => {
  const result = E.activity({ ...A, share: 25, players: 4 });
  assert.equal(result.net, 3750);
  assert.equal(result.hourly, 11250);
});
test('optional activity fields default explicitly', () => {
  assert.equal(E.activity({ reward: 100, duration: 30 }).hourly, 200);
});
test('negative net is informative in activity, unreachable in goal', () => {
  const loss = { ...A, cost: 30000 };
  assert.equal(E.activity(loss).net, -5000);
  assert.equal(E.goal({ capital: 100000, target: 200000, dailyMinutes: 60, activity: loss }).valid, false);
});
test('whole runs and sessions: 200k to 1M, 60 minutes per day', () => {
  const result = E.goal({ capital: 200000, target: 1000000, dailyMinutes: 60, activity: A });
  assert.equal(result.valid, true);
  assert.equal(result.missing, 800000);
  assert.equal(result.runs, 36);
  assert.equal(result.sessions, 12);
  assert.equal(result.days, 12);
  assert.equal(result.totalMinutes, 660);
  assert.equal(result.continuousMinutes, 715);
  assert.equal(result.finalCapital, 1010000);
});
test('initial investment reduces cash and increases required earnings', () => {
  const result = E.goal({ capital: 200, target: 300, dailyMinutes: 60, activity: { reward: 50, duration: 10, investment: 100 } });
  assert.equal(result.missing, 200);
  assert.equal(result.runs, 4);
  assert.equal(result.finalCapital, 300);
});
test('initial investment must be affordable', () => {
  const result = E.goal({ capital: 99, target: 300, dailyMinutes: 60, activity: { reward: 50, duration: 10, investment: 100 } });
  assert.equal(result.valid, false);
  assert.match(result.reason, /Capital insuffisant/);
});
test('already reached goal does not trigger an unnecessary investment', () => {
  const result = E.goal({ capital: 100, target: 50, dailyMinutes: 60, activity: { ...A, investment: 500 } });
  assert.equal(result.valid, true);
  assert.equal(result.runs, 0);
  assert.equal(result.investment, 0);
  assert.equal(result.finalCapital, 100);
});
test('indivisible activities do not fit by averaging across days', () => {
  const result = E.goal({ capital: 0, target: 300, dailyMinutes: 60, activity: { reward: 100, duration: 40 } });
  assert.equal(result.sessions, 3);
  assert.equal(result.totalMinutes, 120);
  assert.equal(E.goal({ capital: 0, target: 300, dailyMinutes: 30, activity: { reward: 100, duration: 40 } }).valid, false);
});
test('goal does not count a cooldown after the last activity of a session', () => {
  const result = E.goal({ capital: 0, target: 200, dailyMinutes: 40, activity: { reward: 100, duration: 15, cooldown: 10 } });
  assert.equal(result.sessions, 1);
  assert.equal(result.totalMinutes, 40);
});
test('cooldowns too long for overnight reset produce an explicit limitation', () => {
  const result = E.goal({ capital: 0, target: 200, dailyMinutes: 60, activity: { reward: 100, duration: 40, cooldown: 1440 } });
  assert.equal(result.valid, false);
  assert.match(result.reason, /pause entre/);
});
test('inverse excludes partial missions and excludes the final cooldown', () => {
  assert.equal(E.inverse({ capital: 0, minutes: 14, activity: A }).runs, 0);
  assert.equal(E.inverse({ capital: 0, minutes: 15, activity: A }).runs, 1);
  assert.equal(E.inverse({ capital: 0, minutes: 34.99, activity: A }).runs, 1);
  const result = E.inverse({ capital: 0, minutes: 35, activity: A });
  assert.equal(result.runs, 2);
  assert.equal(result.totalMinutes, 35);
  assert.equal(result.profit, 45000);
});
test('inverse charges investment once and preserves capital when no run fits', () => {
  const activity = { reward: 50, duration: 10, investment: 100 };
  assert.equal(E.inverse({ capital: 200, minutes: 30, activity }).finalCapital, 250);
  assert.equal(E.inverse({ capital: 200, minutes: 5, activity }).finalCapital, 200);
});
test('decimals do not add a spurious activity near an integer boundary', () => {
  const result = E.goal({ capital: 0, target: 0.3, dailyMinutes: 1, activity: { reward: 0.1, duration: 0.1 } });
  assert.equal(result.runs, 3);
  near(result.totalMinutes, 0.3);
  assert.equal(E.inverse({ capital: 0, minutes: 0.3, activity: { reward: 1, duration: 0.1 } }).runs, 3);
});
test('a tiny positive target still requires one whole activity', () => {
  const result = E.goal({ capital: 0, target: 1e-17, dailyMinutes: 1, activity: { reward: 1, duration: 1 } });
  assert.equal(result.runs, 1);
});
test('ROI separates revenues, operating profit and profit after purchase', () => {
  const result = E.roi({ purchase: 400000, upgrades: 75000, fees: 25000, revenueHourly: 100000, costHourly: 25000, hours: 10 });
  assert.equal(result.investment, 500000);
  assert.equal(result.netHourly, 75000);
  assert.equal(result.grossProfit, 1000000);
  assert.equal(result.operatingProfit, 750000);
  assert.equal(result.netProfit, 250000);
  assert.equal(result.roiPercent, 50);
  near(result.paybackHours, 6 + 40 / 60);
});
test('ROI handles zero investment and zero or negative operating profit', () => {
  assert.equal(E.roi({ purchase: 0, revenueHourly: 100, hours: 1 }).roiPercent, null);
  assert.equal(E.roi({ purchase: 0, revenueHourly: 100, hours: 1 }).paybackHours, 0);
  assert.equal(E.roi({ purchase: 100, revenueHourly: 0, hours: 1 }).paybackHours, null);
  assert.equal(E.roi({ purchase: 100, revenueHourly: 10, costHourly: 20, hours: 1 }).paybackHours, null);
});
test('purchase reports shortfall, capital share and target delay', () => {
  const result = E.purchase({ capital: 200000, price: 50000, hourly: 25000, target: 1000000 });
  assert.equal(result.remaining, 150000);
  assert.equal(result.capitalPercent, 25);
  assert.equal(result.recoveryHours, 2);
  assert.equal(result.goalDelayHours, 2);
  assert.equal(result.shortfall, 0);
  assert.equal(E.purchase({ capital: 0, price: 100, hourly: 0, target: 1000 }).shortfall, 100);
  assert.equal(E.purchase({ capital: 0, price: 100, hourly: 0, target: 1000 }).capitalPercent, null);
});
test('purchase target delay is zero if target remains attained after purchase', () => {
  assert.equal(E.purchase({ capital: 1000, price: 100, hourly: 0, target: 500 }).goalDelayHours, 0);
});
test('budget preserves a reserve and reports overspending honestly', () => {
  const result = E.budget({ capital: 1000, allocations: [300, 200, 100], reserve: 200 });
  assert.equal(result.spent, 600);
  assert.equal(result.remaining, 400);
  assert.equal(result.available, 200);
  assert.equal(result.overBudget, false);
  assert.deepEqual(result.shares, [30, 20, 10]);
  assert.equal(E.budget({ capital: 100, allocations: [100], reserve: 20 }).overBudget, true);
  assert.deepEqual(E.budget({ capital: 0, allocations: [0], reserve: 0 }).shares, [null]);
});
test('decimal budget allocations do not produce fictional debt', () => {
  const result = E.budget({ capital: 0.3, allocations: [0.1, 0.2], reserve: 0 });
  assert.equal(result.overBudget, false);
  assert.equal(result.remaining, 0);
});
test('purchase order changes later earning speed', () => {
  const itemA = { name: 'Activité', price: 100, boostHourly: 100 };
  const itemB = { name: 'Véhicule', price: 200, boostHourly: 0 };
  const a = E.order({ capital: 100, hourly: 100, items: [itemA, itemB] });
  const b = E.order({ capital: 100, hourly: 100, items: [itemB, itemA] });
  assert.equal(a.totalHours, 1);
  assert.equal(b.totalHours, 2);
  assert.equal(a.steps[1].capital, 0);
  assert.equal(a.finalHourly, 200);
});
test('purchase order cannot bootstrap from zero cash and zero income', () => {
  assert.equal(E.order({ capital: 0, hourly: 0, items: [{ price: 100, boostHourly: 100 }] }).valid, false);
  assert.equal(E.order({ capital: 0, hourly: 0, items: [{ price: 0, boostHourly: 100 }] }).finalHourly, 100);
});
test('buy now versus save compares liquid cash objectives and rejects unaffordable now', () => {
  const result = E.compareBuy({ capital: 200, target: 1000, hourly: 100, price: 100, boostHourly: 100 });
  assert.equal(result.buyHours, 4.5);
  assert.equal(result.saveHours, 8);
  assert.equal(result.affordable, true);
  assert.equal(E.compareBuy({ capital: 0, target: 1000, hourly: 100, price: 100 }).buyHours, null);
  assert.equal(E.compareBuy({ capital: 0, target: 1000, hourly: 0, price: 0 }).saveHours, null);
});
test('mixed rotation lets another activity cover a cooldown', () => {
  const result = E.goalMixed({ capital: 0, target: 300, dailyMinutes: 60, activities: [
    { name: 'A', reward: 100, duration: 10, cooldown: 10 },
    { name: 'B', reward: 100, duration: 10, cooldown: 0 }
  ] });
  assert.equal(result.valid, true);
  assert.equal(result.runs, 3);
  assert.equal(result.totalMinutes, 30);
  assert.equal(result.days, 1);
  assert.deepEqual(result.breakdown.map(x => x.runs), [2, 1]);
});
test('mixed rotation charges each initial investment once', () => {
  const result = E.goalMixed({ capital: 200, target: 300, dailyMinutes: 20, activities: [
    { reward: 100, duration: 10, investment: 50 },
    { reward: 100, duration: 10, investment: 100 }
  ] });
  assert.equal(result.investment, 150);
  assert.equal(result.runs, 3);
  assert.equal(result.days, 2);
  assert.equal(result.finalCapital, 350);
});
test('mixed rotation avoids cumulative decimal drift', () => {
  const result = E.goalMixed({ capital: 0, target: 1, dailyMinutes: 60, activities: [{ reward: 0.1, duration: 1 }] });
  assert.equal(result.runs, 10);
  assert.equal(result.finalCapital, 1);
});
test('mixed rotation reports simulation bounds instead of returning a partial result', () => {
  assert.equal(E.goalMixed({ capital: 0, target: 100001, dailyMinutes: 60, activities: [{ reward: 1, duration: 1 }] }).valid, false);
});
test('strict validation rejects blank, null, negative, infinite and huge values', () => {
  for (const reward of [undefined, null, '', '100', -1, NaN, Infinity, 1e12 + 1]) {
    assert.equal(E.activity({ reward, duration: 1 }).valid, false, String(reward));
  }
  for (const duration of [0, -1, 1e6 + 1, Infinity]) assert.equal(E.activity({ reward: 1, duration }).valid, false);
  assert.equal(E.activity({ reward: 1, duration: 1, share: 101 }).valid, false);
  assert.equal(E.activity({ reward: 1, duration: 1, players: 1.5 }).valid, false);
  assert.equal(E.activity({ reward: 1, duration: Number.MIN_VALUE }).valid, false);
});
test('all public functions return safe structured errors for absent input', () => {
  for (const fn of Object.values(E)) {
    for (const input of [undefined, null, [], {}, { capital: Infinity }]) {
      const result = fn(input);
      assert.equal(result.valid, false);
      assert.equal(typeof result.reason, 'string');
      assertSafe(result);
    }
  }
});
test('boundary samples preserve whole-run constraints and finite outputs', () => {
  for (const duration of [0.1, 1, 15, 59.9]) {
    for (const cooldown of [0, 0.1, 5, 100]) {
      const activity = { reward: 7.5, duration, cooldown };
      const available = 120;
      const result = E.inverse({ capital: 0, minutes: available, activity });
      assertSafe(result);
      assert.equal(result.valid, true);
      assert.ok(Number.isInteger(result.runs));
      assert.ok(result.totalMinutes <= available + 1e-8);
      assert.ok((result.runs + 1) * duration + result.runs * cooldown > available - 1e-8);
    }
  }
});
test('engine is pure and leaves caller objects unchanged', () => {
  const activity = Object.freeze({ ...A });
  E.activity(activity);
  E.goal(Object.freeze({ capital: 200000, target: 1000000, dailyMinutes: 60, activity }));
  assert.deepEqual(activity, A);
});
