/* Leonidakit calculator engine. Pure functions; dollars, minutes and percent. */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.LKCalcEngine = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  var MONEY_MAX = 1e12;
  var MINUTES_MAX = 1e6;
  var RESULT_MAX = Number.MAX_SAFE_INTEGER;
  var MAX_MIXED_RUNS = 100000;

  function fail(shape, reason) { return Object.assign({}, shape, { valid: false, reason: reason }); }
  function finish(result, shape) {
    function safe(value) {
      if (typeof value === 'number') return Number.isFinite(value) && Math.abs(value) <= RESULT_MAX;
      if (Array.isArray(value)) return value.every(safe);
      if (value && typeof value === 'object') return Object.keys(value).every(function (key) { return safe(value[key]); });
      return value !== undefined;
    }
    if (!safe(result)) return fail(shape, 'Le résultat dépasse la précision fiable du calculateur. Réduisez les montants ou augmentez le gain par activité.');
    return Object.assign({ valid: true, reason: null }, result);
  }
  function number(value, label, max, options) {
    options = options || {};
    if (value === undefined && options.defaultValue !== undefined) value = options.defaultValue;
    if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error('Renseignez ' + label + ' avec un nombre valide.');
    if (value < 0 || value > max || (options.positive && value === 0) || (options.integer && !Number.isInteger(value))) {
      throw new Error(label + ' doit être ' + (options.integer ? 'un entier ' : '') + (options.positive ? 'strictement positif' : 'positif ou nul') + ', au maximum ' + max.toLocaleString('fr-FR') + '.');
    }
    return value;
  }
  function data(input) { if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Renseignez les paramètres du calcul.'); return input; }
  function money(value, label, defaultValue) { return number(value, label, MONEY_MAX, { defaultValue: defaultValue }); }
  function minutes(value, label, defaultValue, positive) { return number(value, label, MINUTES_MAX, { defaultValue: defaultValue, positive: !!positive }); }
  function ratio(numerator, denominator) { return denominator > 0 ? numerator / denominator : null; }
  // Correct floating-point noise only near an integer; never round partial runs up.
  function integerNear(value) { var rounded = Math.round(value); return rounded !== 0 && Math.abs(value - rounded) <= Math.min(1e-7, Number.EPSILON * Math.max(1, Math.abs(value)) * 4) ? rounded : value; }
  function equal(a, b) { return a === b || Math.abs(a - b) <= Number.EPSILON * Math.max(Math.abs(a), Math.abs(b)) * 4; }
  function subtract(a, b) { return equal(a, b) ? 0 : a - b; }
  function ceil(value) { return Math.ceil(integerNear(value)); }
  function floor(value) { return Math.floor(integerNear(value)); }
  function timeTo(target, capital, hourly) { return target <= capital ? 0 : ratio(target - capital, hourly); }
  function safeRunCount(runs) { if (!Number.isSafeInteger(runs) || runs < 0) throw new Error('Le nombre de répétitions dépasse la précision fiable du calculateur.'); }

  var activityShape = { net: null, activeMinutes: null, cycleMinutes: null, hourly: null, investment: null, paybackRuns: null };
  function activity(input) {
    try {
      var a = data(input);
      var reward = money(a.reward, 'la récompense');
      var cost = money(a.cost, 'les coûts personnels', 0);
      var duration = minutes(a.duration, 'la durée', undefined, true);
      var prep = minutes(a.prep, 'la préparation', 0);
      var cooldown = minutes(a.cooldown, 'le délai de relance', 0);
      var share = number(a.share, 'la part de récompense', 100, { defaultValue: 100 });
      number(a.players, 'le nombre de joueurs', 100, { defaultValue: 1, positive: true, integer: true });
      var investment = money(a.investment, "l’investissement", 0);
      var net = subtract(reward * share / 100, cost);
      var active = duration + prep;
      return finish({ net: net, activeMinutes: active, cycleMinutes: active + cooldown, hourly: net * 60 / (active + cooldown), investment: investment, paybackRuns: investment === 0 ? 0 : net > 0 ? ceil(investment / net) : null }, activityShape);
    } catch (error) { return fail(activityShape, error.message); }
  }

  var goalShape = { missing: null, runs: null, totalMinutes: null, continuousMinutes: null, sessions: null, days: null, finalCapital: null, hourly: null, investment: null };
  function goal(input) {
    try {
      var p = data(input);
      var capital = money(p.capital, 'le capital');
      var target = money(p.target, 'l’objectif');
      var daily = number(p.dailyMinutes, 'le temps quotidien en minutes', 1440, { positive: true });
      var a = activity(p.activity);
      if (!a.valid) return fail(goalShape, a.reason);
      if (target <= capital) return finish({ missing: 0, runs: 0, totalMinutes: 0, continuousMinutes: 0, sessions: 0, days: 0, finalCapital: capital, hourly: a.hourly, investment: 0 }, goalShape);
      if (capital < a.investment) return fail(goalShape, 'Capital insuffisant pour financer l’investissement initial.');
      if (a.net <= 0) return fail(goalShape, 'Un bénéfice net strictement positif est nécessaire pour atteindre cet objectif.');
      if (a.activeMinutes > daily) return fail(goalShape, 'Une activité complète avec sa préparation dépasse votre temps quotidien. Augmentez la durée de session.');
      var cooldown = a.cycleMinutes - a.activeMinutes;
      var missing = target - capital + a.investment;
      var runs = ceil(missing / a.net);
      safeRunCount(runs);
      var perSession = Math.max(1, floor((daily + cooldown) / a.cycleMinutes));
      var sessions = ceil(runs / perSession);
      if (sessions > 1 && cooldown > 1440 - daily) return fail(goalShape, 'Le délai de relance dépasse la pause entre deux sessions quotidiennes. Ce calendrier nécessite une simulation différente.');
      return finish({ missing: missing, runs: runs, totalMinutes: runs * a.activeMinutes + (runs - sessions) * cooldown, continuousMinutes: runs * a.activeMinutes + Math.max(0, runs - 1) * cooldown, sessions: sessions, days: sessions, finalCapital: capital - a.investment + runs * a.net, hourly: a.hourly, investment: a.investment }, goalShape);
    } catch (error) { return fail(goalShape, error.message); }
  }

  function goalMixed(input) {
    var shape = Object.assign({}, goalShape, { breakdown: [] });
    try {
      var p = data(input);
      var capital = money(p.capital, 'le capital');
      var target = money(p.target, 'l’objectif');
      var daily = number(p.dailyMinutes, 'le temps quotidien en minutes', 1440, { positive: true });
      if (!Array.isArray(p.activities) || !p.activities.length || p.activities.length > 20) return fail(shape, 'Choisissez de 1 à 20 activités pour la rotation.');
      var activities = p.activities.map(function (entry, index) {
        var a = activity(entry);
        if (!a.valid) throw new Error('Activité ' + (index + 1) + ' : ' + a.reason);
        return Object.assign({}, a, { name: typeof entry.name === 'string' ? entry.name.slice(0, 120) : 'Activité ' + (index + 1), cooldown: a.cycleMinutes - a.activeMinutes });
      });
      if (target <= capital) return finish({ missing: 0, runs: 0, totalMinutes: 0, continuousMinutes: 0, sessions: 0, days: 0, finalCapital: capital, hourly: null, investment: 0, breakdown: [] }, shape);
      var investment = activities.reduce(function (sum, a) { return sum + a.investment; }, 0);
      if (capital < investment) return fail(shape, 'Capital insuffisant pour financer les investissements initiaux de la rotation.');
      if (activities.some(function (a) { return a.net <= 0; })) return fail(shape, 'Chaque activité de cette rotation doit avoir un bénéfice net strictement positif.');
      if (activities.some(function (a) { return a.activeMinutes > daily; })) return fail(shape, 'Une activité de la rotation ne tient pas dans votre session quotidienne.');
      var cash = capital - investment;
      var ready = activities.map(function () { return 0; });
      var continuousReady = ready.slice();
      var counts = ready.slice();
      var total = 0, continuous = 0, elapsed = 0, sessions = 1, runs = 0;
      while (cash < target && !equal(cash, target) && runs < MAX_MIXED_RUNS) {
        var index = runs % activities.length;
        var a = activities[index];
        var wait = Math.max(0, ready[index] - elapsed);
        if (elapsed + wait + a.activeMinutes > daily + Number.EPSILON * daily * 4) {
          if (activities.some(function (item) { return item.cooldown > 1440 - daily; })) return fail(shape, 'Un délai de relance dépasse la pause entre les sessions. Ce calendrier nécessite une simulation différente.');
          sessions += 1;
          elapsed = 0;
          ready = ready.map(function () { return 0; });
          wait = 0;
        }
        elapsed += wait + a.activeMinutes;
        total += wait + a.activeMinutes;
        ready[index] = elapsed + a.cooldown;
        continuous = Math.max(continuous, continuousReady[index]) + a.activeMinutes;
        continuousReady[index] = continuous + a.cooldown;
        counts[index] += 1;
        cash = capital - investment + activities.reduce(function (profit, entry, activityIndex) { return profit + counts[activityIndex] * entry.net; }, 0);
        runs += 1;
      }
      if (cash < target && !equal(cash, target)) return fail(shape, 'La rotation dépasse 100 000 activités. Réduisez l’objectif ou utilisez le calcul à une activité.');
      if (equal(cash, target)) cash = target;
      return finish({ missing: target - capital + investment, runs: runs, totalMinutes: total, continuousMinutes: continuous, sessions: sessions, days: sessions, finalCapital: cash, hourly: (cash - capital + investment) * 60 / total, investment: investment, breakdown: activities.map(function (a, index) { return { name: a.name, runs: counts[index], net: counts[index] * a.net }; }) }, shape);
    } catch (error) { return fail(shape, error.message); }
  }

  var inverseShape = { runs: null, totalMinutes: null, profit: null, finalCapital: null };
  function inverse(input) {
    try {
      var p = data(input);
      var available = minutes(p.minutes, 'le temps disponible');
      var capital = money(p.capital, 'le capital');
      var a = activity(p.activity);
      if (!a.valid) return fail(inverseShape, a.reason);
      if (capital < a.investment) return fail(inverseShape, 'Capital insuffisant pour financer l’investissement initial.');
      var cooldown = a.cycleMinutes - a.activeMinutes;
      var runs = available < a.activeMinutes ? 0 : floor((available + cooldown) / a.cycleMinutes);
      safeRunCount(runs);
      var profit = runs ? runs * a.net - a.investment : 0;
      if (capital + profit < 0) return fail(inverseShape, 'Les pertes de cette activité dépasseraient votre capital disponible.');
      return finish({ runs: runs, totalMinutes: runs ? runs * a.activeMinutes + (runs - 1) * cooldown : 0, profit: profit, finalCapital: capital + profit }, inverseShape);
    } catch (error) { return fail(inverseShape, error.message); }
  }

  var roiShape = { investment: null, netHourly: null, grossProfit: null, operatingProfit: null, netProfit: null, roiPercent: null, paybackHours: null };
  function roi(input) {
    try {
      var p = data(input);
      var purchasePrice = money(p.purchase, 'le prix d’achat');
      var upgrades = money(p.upgrades, 'les améliorations', 0);
      var fees = money(p.fees, 'les frais supplémentaires', 0);
      var revenue = money(p.revenueHourly, 'les revenus horaires');
      var cost = money(p.costHourly, 'les coûts horaires', 0);
      var hours = number(p.hours, 'la durée en heures', MINUTES_MAX / 60);
      var investment = purchasePrice + upgrades + fees;
      var netHourly = subtract(revenue, cost);
      var operatingProfit = netHourly * hours;
      var netProfit = subtract(operatingProfit, investment);
      return finish({ investment: investment, netHourly: netHourly, grossProfit: revenue * hours, operatingProfit: operatingProfit, netProfit: netProfit, roiPercent: investment > 0 ? netProfit / investment * 100 : null, paybackHours: investment === 0 ? 0 : ratio(investment, netHourly) }, roiShape);
    } catch (error) { return fail(roiShape, error.message); }
  }

  var purchaseShape = { remaining: null, capitalPercent: null, recoveryHours: null, goalDelayHours: null, shortfall: null };
  function purchase(input) {
    try {
      var p = data(input);
      var capital = money(p.capital, 'le capital');
      var price = money(p.price, 'le prix d’achat');
      var hourly = money(p.hourly, 'le bénéfice horaire');
      var target = money(p.target, 'l’objectif');
      var remaining = subtract(capital, price);
      var before = timeTo(target, capital, hourly);
      var after = timeTo(target, remaining, hourly);
      return finish({ remaining: remaining, capitalPercent: ratio(price * 100, capital), recoveryHours: price === 0 ? 0 : ratio(price, hourly), goalDelayHours: before === null || after === null ? null : after - before, shortfall: Math.max(0, price - capital) }, purchaseShape);
    } catch (error) { return fail(purchaseShape, error.message); }
  }

  var budgetShape = { spent: null, remaining: null, available: null, overBudget: null, shares: [] };
  function budget(input) {
    try {
      var p = data(input);
      var capital = money(p.capital, 'le capital');
      var reserve = money(p.reserve, 'la réserve', 0);
      if (!Array.isArray(p.allocations) || p.allocations.length > 100) return fail(budgetShape, 'Renseignez au maximum 100 postes budgétaires.');
      var allocations = p.allocations.map(function (value, index) { return money(value, 'le poste budgétaire ' + (index + 1)); });
      var spent = allocations.reduce(function (sum, value) { return sum + value; }, 0);
      var remaining = subtract(capital, spent);
      var available = subtract(remaining, reserve);
      return finish({ spent: spent, remaining: remaining, available: available, overBudget: available < 0, shares: allocations.map(function (value) { return ratio(value * 100, capital); }) }, budgetShape);
    } catch (error) { return fail(budgetShape, error.message); }
  }

  var orderShape = { steps: [], totalHours: null, finalCapital: null, finalHourly: null };
  function order(input) {
    try {
      var p = data(input);
      var cash = money(p.capital, 'le capital');
      var hourly = money(p.hourly, 'le bénéfice horaire');
      if (!Array.isArray(p.items) || p.items.length > 100) return fail(orderShape, 'Renseignez au maximum 100 achats dans l’ordre souhaité.');
      var items = p.items.map(function (entry, index) {
        entry = data(entry);
        return { name: typeof entry.name === 'string' && entry.name.trim() ? entry.name.trim().slice(0, 120) : 'Achat ' + (index + 1), price: money(entry.price, 'le prix de l’achat ' + (index + 1)), boostHourly: money(entry.boostHourly, 'le revenu supplémentaire de l’achat ' + (index + 1), 0) };
      });
      var time = 0;
      var steps = [];
      for (var i = 0; i < items.length; i += 1) {
        var item = items[i];
        var wait = timeTo(item.price, cash, hourly);
        if (wait === null) return fail(orderShape, 'L’achat « ' + item.name + ' » est inaccessible avec le capital et le revenu actuels.');
        time += wait;
        // Waiting ends exactly at the price: avoid residual floating-point debt.
        cash = wait > 0 ? 0 : cash - item.price;
        hourly += item.boostHourly;
        steps.push({ name: item.name, waitHours: wait, timeHours: time, capital: cash, hourly: hourly });
      }
      return finish({ steps: steps, totalHours: time, finalCapital: cash, finalHourly: hourly }, orderShape);
    } catch (error) { return fail(orderShape, error.message); }
  }

  var compareShape = { buyHours: null, saveHours: null, affordable: null };
  function compareBuy(input) {
    try {
      var p = data(input);
      var capital = money(p.capital, 'le capital');
      var target = money(p.target, 'l’objectif');
      var hourly = money(p.hourly, 'le bénéfice horaire');
      var price = money(p.price, 'le prix d’achat');
      var boost = money(p.boostHourly, 'le revenu horaire supplémentaire', 0);
      var affordable = capital >= price;
      return finish({ buyHours: affordable ? timeTo(target, capital - price, hourly + boost) : null, saveHours: timeTo(target, capital, hourly), affordable: affordable }, compareShape);
    } catch (error) { return fail(compareShape, error.message); }
  }

  return Object.freeze({ activity: activity, goal: goal, goalMixed: goalMixed, inverse: inverse, roi: roi, purchase: purchase, budget: budget, order: order, compareBuy: compareBuy });
}));
