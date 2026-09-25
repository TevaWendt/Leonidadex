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
  assert.deepEqual(E.activity(A), { valid: true, reason: null, net: 22500, activeMinutes: 15, cycleMinutes: 20, hourly: 67500, investment: 0, paybackRuns: 0, units: 0, unitsHourly: 0 });
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
  assert.match(result.reason, /Pas assez d’argent/);
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
  assert.equal(E.inverse({ capital: 2500, minutes: 15, activity: A }).runs, 1);
  assert.equal(E.inverse({ capital: 2500, minutes: 34.99, activity: A }).runs, 1);
  const result = E.inverse({ capital: 2500, minutes: 35, activity: A });
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

test('reference continuous model needs 8 hours from 200k to 1M at 100k/hour', () => {
  const result = E.goalContinuous({ capital: 200000, target: 1000000, hourly: 100000, dailyMinutes: 60 });
  assert.equal(result.valid, true);
  assert.equal(result.missing, 800000);
  assert.equal(result.hours, 8);
  assert.equal(result.totalMinutes, 480);
  assert.equal(result.sessions, 8);
  assert.equal(result.finalCapital, 1000000);
});
test('continuous target is usable capital and protects the stated reserve', () => {
  const result = E.goalContinuous({ capital: 200000, reserve: 50000, target: 1000000, hourly: 100000, dailyMinutes: 120 });
  assert.equal(result.availableCapital, 150000);
  assert.equal(result.missing, 850000);
  assert.equal(result.finalCapital, 1050000);
  assert.equal(result.sessions, 5);
  assert.equal(E.goalContinuous({ capital: 10, reserve: 11, target: 20, hourly: 1, dailyMinutes: 60 }).valid, false);
});
test('continuous model handles already attained target and unreachable target', () => {
  const reached = E.goalContinuous({ capital: 1200000, target: 1000000, hourly: 0, dailyMinutes: 60 });
  assert.equal(reached.valid, true);
  assert.equal(reached.missing, 0);
  assert.equal(reached.hours, 0);
  assert.equal(reached.sessions, 0);
  assert.equal(reached.finalCapital, 1200000);
  assert.equal(E.goalContinuous({ capital: 0, target: 1, hourly: 0, dailyMinutes: 60 }).valid, false);
  assert.equal(E.goalContinuous({ capital: 0, target: 1, hourly: -1, dailyMinutes: 60 }).valid, false);
});
test('reference discrete scenario pays five full cycles, never 4.17 missions', () => {
  const result = E.goal({ capital: 0, target: 250000, dailyMinutes: 90, activity: { reward: 60000, duration: 15 } });
  assert.equal(result.runs, 5);
  assert.equal(result.totalMinutes, 75);
  assert.equal(result.finalCapital, 300000);
  assert.equal(E.activity({ reward: 100000, cost: 20000, duration: 40 }).hourly, 120000);
});
test('all discrete calculators require costs to be financed before reward', () => {
  const a = { reward: 100, cost: 20, duration: 10, investment: 10 };
  assert.equal(E.goal({ capital: 29, target: 200, dailyMinutes: 60, activity: a }).valid, false);
  assert.equal(E.goal({ capital: 30, target: 200, dailyMinutes: 60, activity: a }).valid, true);
  assert.equal(E.inverse({ capital: 29, minutes: 10, activity: a }).valid, false);
  assert.equal(E.inverse({ capital: 30, minutes: 10, activity: a }).finalCapital, 100);
  assert.equal(E.goalMixed({ capital: 29, target: 200, dailyMinutes: 60, activities: [a] }).valid, false);
  const rotation = E.goalMixed({ capital: 20, target: 200, dailyMinutes: 60, activities: [{ reward: 30, duration: 10 }, { reward: 200, cost: 60, duration: 10 }] });
  assert.equal(rotation.valid, false);
  assert.match(rotation.reason, /avancer les coûts/);
});
test('loss-making inverse checks cash before the last run, not only final cash', () => {
  const activity = { reward: 40, cost: 60, duration: 10 };
  assert.equal(E.inverse({ capital: 70, minutes: 10, activity }).finalCapital, 50);
  // Final cash would be 30, but the second run needs 60 when only 50 remain.
  assert.equal(E.inverse({ capital: 70, minutes: 20, activity }).valid, false);
  assert.equal(E.inverse({ capital: 0, minutes: 5, activity: { ...activity, investment: 100 } }).finalCapital, 0);
});
test('localized parser accepts French groups and decimals without accepting malformed data', () => {
  for (const input of ['1 234,56', '1\u00a0234,56', '1\u202f234,56', '1234.56', ' 1234,56 ']) {
    assert.equal(E.parseLocalizedNumber(input).value, 1234.56, input);
  }
  assert.equal(E.parseLocalizedNumber('0').value, 0);
  assert.equal(E.parseLocalizedNumber(12.5).value, 12.5);
  for (const input of ['', ' ', null, undefined, '12 34', '1,234.56', '1.234,56', '1e3', '100 $', 'Infinity', Infinity, '9007199254740992']) {
    assert.equal(E.parseLocalizedNumber(input).valid, false, String(input));
  }
});
test('session rotation covers cooldowns and never charges a final wait', () => {
  const result = E.sessionPlan({ capital: 0, minutes: 30, activities: [
    { name: 'A', reward: 100, duration: 10, cooldown: 10 },
    { name: 'B', reward: 60, duration: 10 }
  ] });
  assert.equal(result.valid, true);
  assert.deepEqual(result.timeline.map(step => step.name), ['A', 'B', 'A']);
  assert.equal(result.profit, 260);
  assert.equal(result.activeMinutes, 30);
  assert.equal(result.waitMinutes, 0);
  assert.equal(result.unusedMinutes, 0);
  assert.equal(result.timeline[2].end, 30);
});
test('session tracks active time, necessary wait and unused time independently', () => {
  const result = E.sessionPlan({ capital: 0, minutes: 36, activities: [{ reward: 100, duration: 10, cooldown: 15 }] });
  assert.equal(result.runs, 2);
  assert.equal(result.activeMinutes, 20);
  assert.equal(result.waitMinutes, 15);
  assert.equal(result.totalMinutes, 35);
  assert.equal(result.unusedMinutes, 1);
  assert.equal(result.timeline[1].start, 25);
  assert.equal(result.timeline[1].waitBefore, 15);
});
test('session can earn startup costs and pays investment only on first use', () => {
  const earned = E.sessionPlan({ capital: 0, minutes: 20, activities: [
    { name: 'Start', reward: 60, duration: 10 },
    { name: 'Next', reward: 500, cost: 50, duration: 10 }
  ] });
  assert.deepEqual(earned.timeline.map(step => step.name), ['Start', 'Next']);
  assert.equal(earned.profit, 510);
  const invested = E.sessionPlan({ capital: 150, reserve: 20, minutes: 20, activities: [{ reward: 100, cost: 30, investment: 100, duration: 10 }] });
  assert.equal(invested.runs, 2);
  assert.equal(invested.investment, 100);
  assert.equal(invested.finalCapital, 190);
  assert.deepEqual(invested.timeline.map(step => step.investment), [100, 0]);
});
test('session never uses reserve or future rewards to fund startup costs', () => {
  const result = E.sessionPlan({ capital: 100, reserve: 90, minutes: 60, activities: [{ reward: 100, cost: 20, duration: 10 }] });
  assert.equal(result.valid, true);
  assert.equal(result.runs, 0);
  assert.equal(result.finalCapital, 100);
  assert.equal(result.unusedMinutes, 60);
  assert.match(result.note, /coûts à avancer/);
});
test('session respects indivisible durations and avoids an unprofitable investment', () => {
  assert.equal(E.sessionPlan({ capital: 0, minutes: 9, activities: [{ reward: 100, duration: 10 }] }).runs, 0);
  const result = E.sessionPlan({ capital: 1000, minutes: 10, activities: [{ reward: 100, duration: 10, investment: 500 }] });
  assert.equal(result.runs, 0);
  assert.equal(result.profit, 0);
  assert.equal(result.investment, 0);
});
test('session repetition preference is consecutive and can be satisfied by alternating', () => {
  const one = { name: 'A', reward: 100, duration: 10 };
  assert.equal(E.sessionPlan({ capital: 0, minutes: 60, maxRepeat: 1, activities: [one] }).runs, 1);
  const alternate = E.sessionPlan({ capital: 0, minutes: 30, maxRepeat: 1, activities: [one, { name: 'B', reward: 50, duration: 10 }] });
  assert.deepEqual(alternate.timeline.map(step => step.name), ['A', 'B', 'A']);
  assert.equal(alternate.profit, 250);
});
test('session has explicit finite limits and safe structured errors', () => {
  const capped = E.sessionPlan({ capital: 0, minutes: 60, activities: [{ reward: 1, duration: 0.01 }] });
  assert.equal(capped.runs, 256);
  assert.equal(capped.limited, true);
  assert.match(capped.note, /256 activités/);
  assert.equal(E.sessionPlan({ capital: 0, minutes: 1441, activities: [A] }).valid, false);
  assert.equal(E.sessionPlan({ capital: 0, minutes: 60, activities: Array(13).fill(A) }).valid, false);
  assert.equal(E.sessionPlan({ capital: 0, minutes: 60, maxRepeat: 0, activities: [A] }).valid, false);
});
test('session timeline independently conserves cash, time, cooldowns and reserve', () => {
  const activities = [{ reward: 80, cost: 20, duration: 7, prep: 3, cooldown: 13, investment: 50 }, { reward: 50, cost: 10, duration: 8, investment: 15 }];
  const input = { capital: 200, reserve: 80, minutes: 90, maxRepeat: 2, activities };
  const result = E.sessionPlan(input);
  assert.equal(result.valid, true);
  let cash = input.capital, time = 0;
  const ready = [0, 0], paid = [false, false];
  result.timeline.forEach(step => {
    const a = activities[step.index];
    const investment = paid[step.index] ? 0 : a.investment;
    assert.ok(step.start >= time);
    assert.ok(step.start >= ready[step.index]);
    assert.ok(cash - investment - a.cost >= input.reserve);
    near(step.end - step.start, a.duration + (a.prep || 0));
    near(step.capitalBefore, cash);
    cash += a.reward - a.cost - investment;
    near(step.capitalAfter, cash);
    time = step.end;
    ready[step.index] = time + (a.cooldown || 0);
    paid[step.index] = true;
  });
  near(cash, result.finalCapital);
  near(result.profit, cash - input.capital);
  near(result.activeMinutes + result.waitMinutes + result.unusedMinutes, input.minutes);
  assert.ok(time <= input.minutes);
  assertSafe(result);
});
test('discrete goal preserves reserve before investment and before every upfront expense', () => {
  const activity = { reward: 50, cost: 10, investment: 20, duration: 10 };
  const input = { capital: 100, target: 200, dailyMinutes: 60, activity };
  assert.equal(E.goal({ ...input, reserve: 81 }).valid, false);
  assert.equal(E.goal({ ...input, reserve: 71 }).valid, false);
  const result = E.goal({ ...input, reserve: 70 });
  assert.equal(result.valid, true);
  // target stays TOTAL capital; reserve is not added a second time.
  assert.equal(result.missing, 120);
  assert.equal(result.runs, 3);
  assert.equal(result.finalCapital, 200);
  assert.equal(E.goal({ ...input, reserve: 101 }).valid, false);
});
test('mixed goal protects reserve across its investment and entire rotation', () => {
  const input = { capital: 100, reserve: 60, target: 300, dailyMinutes: 60, activities: [
    { name: 'A', reward: 10, cost: 10, investment: 10, duration: 10 },
    { name: 'B', reward: 100, cost: 40, investment: 10, duration: 10 }
  ] };
  // A must be profitable to reach the later cash constraint.
  input.activities[0].reward = 11;
  const result = E.goalMixed(input);
  assert.equal(result.valid, false);
  assert.match(result.reason, /B.*réserve/);
  const enough = E.goalMixed({ ...input, reserve: 40 });
  assert.equal(enough.valid, true);
  assert.ok(enough.finalCapital >= input.target);
  assert.equal(E.goalMixed({ ...input, reserve: 81 }).valid, false);
  assert.equal(E.goalMixed({ ...input, reserve: 101 }).valid, false);
});
test('inverse preserves reserve at every cost payment including loss-making runs', () => {
  const activity = { reward: 40, cost: 60, duration: 10 };
  assert.equal(E.inverse({ capital: 120, reserve: 50, minutes: 10, activity }).finalCapital, 100);
  const blocked = E.inverse({ capital: 120, reserve: 50, minutes: 20, activity });
  assert.equal(blocked.valid, false);
  assert.match(blocked.reason, /réserve/);
  assert.equal(E.inverse({ capital: 120, reserve: 61, minutes: 10, activity }).valid, false);
  assert.equal(E.inverse({ capital: 120, reserve: 121, minutes: 10, activity }).valid, false);
  assert.equal(E.inverse({ capital: 120, reserve: 120, minutes: 5, activity }).finalCapital, 120);
});
test('goal metrics separate active play from actual session waits and skip overnight pauses', () => {
  const result = E.goal({ capital: 200000, target: 1000000, dailyMinutes: 60, activity: A });
  assert.equal(result.activeMinutes, 540);
  assert.equal(result.waitMinutes, 120);
  assert.equal(result.activeMinutes + result.waitMinutes, result.totalMinutes);
  const mixed = E.goalMixed({ capital: 0, target: 300, dailyMinutes: 40, activities: [{ reward: 100, duration: 10, cooldown: 15 }] });
  assert.equal(mixed.sessions, 2);
  assert.equal(mixed.activeMinutes, 30);
  assert.equal(mixed.waitMinutes, 15);
  assert.equal(mixed.activeMinutes + mixed.waitMinutes, mixed.totalMinutes);
  for (const reached of [
    E.goal({ capital: 200, reserve: 200, target: 100, dailyMinutes: 60, activity: A }),
    E.goalMixed({ capital: 200, reserve: 200, target: 100, dailyMinutes: 60, activities: [A] })
  ]) {
    assert.equal(reached.valid, true);
    assert.equal(reached.activeMinutes, 0);
    assert.equal(reached.waitMinutes, 0);
    assert.equal(reached.investment, 0);
  }
});

// ---- Lot B (refonte) : Quel achat choisir ? et Mon business plan
test('choose: classe les achats selon le critère, sans inventer de revenu', () => {
  const r = E.choose({ capital: 200000, reserve: 20000, hourly: 100000, dailyMinutes: 60, hours: 10, criterion: 'value', items: [{ name: 'A', price: 150000, utility: 5 }, { name: 'B', price: 50000, utility: 3 }, { name: 'C', price: 400000, utility: 2, incomeHourly: 30000 }, { name: 'D', price: null, utility: 4 }] });
  assert.equal(r.valid, true);
  assert.equal(r.best, 'B');
  assert.deepEqual(r.bestByCriterion, { value: 'B', cheapest: 'B', fastest: 'A', profit: 'C', utility: 'A' });
  const c = r.items[2];
  assert.equal(c.affordable, false); assert.equal(c.shortfall, 220000); assert.equal(c.waitHours, 2.2); assert.equal(c.waitDays, 3);
  assert.equal(r.items[0].paybackHours, null); assert.equal(r.items[3].known, false); assert.equal(r.bestWaitHours, 0);
  assert.equal(E.choose({ capital: 100, reserve: 0, items: [{ name: 'A', price: 1 }] }).valid, false);
  assert.equal(E.choose({ capital: 100, reserve: 200, items: [{ name: 'A', price: 1 }, { name: 'B', price: 2 }] }).valid, false);
});
test('businessPlan: 1 h par jour, 100 000 $ par heure et un million = 10 h et 10 jours', () => {
  const r = E.businessPlan({ capital: 0, reserve: 0, hourly: 100000, dailyMinutes: 60, daysPerWeek: 7, target: 1000000 });
  assert.equal(r.valid, true); assert.equal(r.totalHours, 10); assert.equal(r.sessions, 10); assert.equal(r.days, 10); assert.equal(r.steps.length, 1); assert.equal(r.milestones[3].days, 10);
  const w = E.businessPlan({ capital: 0, reserve: 0, hourly: 100000, dailyMinutes: 60, daysPerWeek: 5, target: 1000000 });
  assert.equal(w.days, 12); assert.equal(w.weeks, 2);
});
test('businessPlan: achats d’avant dans l’ordre, dépenses par partie, remboursement et variantes', () => {
  const r = E.businessPlan({ capital: 200000, reserve: 20000, hourly: 100000, dailyMinutes: 60, daysPerWeek: 7, upkeepPerSession: 5000, goalName: 'Kamacho', goalPrice: 1000000, goalIncomeHourly: 50000, prerequisites: [{ name: 'Gilet', price: 20000 }, { name: 'Camion', price: 80000, boostHourly: 20000 }] });
  assert.equal(r.valid, true);
  assert.deepEqual(r.steps.map(s => s.name), ['Gilet', 'Camion', 'Kamacho']);
  assert.equal(r.steps[2].kind, 'goal'); assert.equal(r.effectiveHourly, 95000); assert.equal(r.upkeepHourly, 5000);
  assert.equal(r.steps[2].atHours, 8); assert.equal(r.payback, 20); assert.equal(r.missing, 920000);
  assert.ok(r.variants.pricePlus20.totalHours > r.totalHours); assert.ok(r.variants.hourlyMinus20.totalHours > r.totalHours); assert.ok(r.variants.noReserve.totalHours < r.totalHours);
  assert.equal(E.businessPlan({ capital: 0, reserve: 0, hourly: 1000, dailyMinutes: 60, daysPerWeek: 7, upkeepPerSession: 5000, target: 100 }).valid, false);
  assert.equal(E.businessPlan({ capital: 0, reserve: 0, hourly: 1000, dailyMinutes: 60, daysPerWeek: 7 }).valid, false);
  const reached = E.businessPlan({ capital: 2000000, reserve: 0, hourly: 1000, dailyMinutes: 60, daysPerWeek: 7, goalPrice: 1000000 });
  assert.equal(reached.totalHours, 0); assert.equal(reached.days, 0); assert.equal(reached.missing, 0);
});
