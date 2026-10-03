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
  var SESSION_BEAM_WIDTH = 24;
  var SESSION_MAX_RUNS = 256;
  /* v7.60 (langues) : la langue de la page (<html lang>) règle la saisie et l'affichage des nombres. Le français reste la
     référence (Node, tests) ; une page anglaise accepte « 1,250.50 » et écrit « $1,250 ». */
  var LANG = (function () { try { var l = typeof document !== 'undefined' && document.documentElement && document.documentElement.lang; return l ? String(l).slice(0, 2).toLowerCase() : 'fr'; } catch (e) { return 'fr'; } }());
  /* Un montant déjà mis en forme (« 1 250 », « 1,250 ») → avec le signe dollar à la place d'usage : après en français
     (séparateur choisi par l'appelant, inchangé), devant en anglais (« -$1,250 »). */
  /* Pluriel du nom qui suit un nombre : règle française (plus de 1) ou anglaise (tout sauf 1). */
  function plural(n, lang) { var l = lang || LANG; return l === 'fr' ? n > 1 : Math.abs(n) !== 1; }
  /* Date lisible : « 3 décembre 2026 » (« 1er » le premier du mois) en français, « December 3, 2026 » ailleurs ;
     opts.time ajoute l'heure, opts.short le mois abrégé, opts.year:false retire l'année. */
  var MONTHS_FR = ['janvier', 'February', 'mars', 'avril', 'mai', 'juin', 'juillet', 'August', 'septembre', 'octobre', 'novembre', 'December'];
  var MONTHS_FR_SHORT = ['janv.', 'Feb.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'August', 'sept.', 'oct.', 'nov.', 'Dec.'];
  function dateText(d, opts, lang) {
    var l = lang || LANG, o = opts || {}; if (Object.prototype.toString.call(d) !== '[object Date]' || !Number.isFinite(d.getTime())) return '';
    if (l === 'fr') {
      var day = d.getDate() === 1 ? '1er' : String(d.getDate()), sp = o.nbsp ? '\u00a0' : ' ';
      var txt = day + sp + (o.short ? MONTHS_FR_SHORT : MONTHS_FR)[d.getMonth()] + (o.year === false ? '' : sp + d.getFullYear());
      return o.time ? txt + ' to ' + d.getHours() + sp + 'h' + sp + String(d.getMinutes()).padStart(2, '0') : txt;
    }
    var f = { month: o.short ? 'short' : 'long', day: 'numeric' }; if (o.year !== false) f.year = 'numeric';
    if (o.time) { f.hour = 'numeric'; f.minute = '2-digit'; }
    try { return d.toLocaleString(l === 'en' ? 'en-US' : l, f); } catch (e) { return d.toISOString().slice(0, 10); }
  }
  function dollars(numberText, sep, lang) {
    var l = lang || LANG, t = String(numberText);
    /* v7.61 : l'espagnol écrit aussi le signe après le nombre (« 200.000 $ ») */
    if (l === 'fr' || l === 'es') return t + (sep === undefined ? '\u00a0' : sep) + '$';
    return t.replace(/^([-\u2212]?)\s*/, '$1$$');
  }

  function fail(shape, reason) { return Object.assign({}, shape, { valid: false, reason: reason }); }
  function finish(result, shape) {
    function safe(value) {
      if (typeof value === 'number') return Number.isFinite(value) && Math.abs(value) <= RESULT_MAX;
      if (Array.isArray(value)) return value.every(safe);
      if (value && typeof value === 'object') return Object.keys(value).every(function (key) { return safe(value[key]); });
      return value !== undefined;
    }
    if (!safe(result)) return fail(shape, 'The result is too big to calculate reliably. Lower the amounts or raise the earnings per activity.');
    return Object.assign({ valid: true, reason: null }, result);
  }
  function number(value, label, max, options) {
    options = options || {};
    if (value === undefined && options.defaultValue !== undefined) value = options.defaultValue;
    if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error('Enter ' + label + ' as a valid number.');
    if (value < 0 || value > max || (options.positive && value === 0) || (options.integer && !Number.isInteger(value))) {
      throw new Error(label.charAt(0).toUpperCase() + label.slice(1) + ' must be a ' + (options.integer ? 'whole ' : '') + (options.positive ? 'number greater than 0' : 'number that is 0 or more') + ', and at most ' + max.toLocaleString('en-US') + '.');
    }
    return value;
  }
  function data(input) { if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Fill in the calculation boxes.'); return input; }
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
  function safeRunCount(runs) { if (!Number.isSafeInteger(runs) || runs < 0) throw new Error('The number of missions to repeat is too big for a reliable calculation.'); }

  // Parse only unambiguous French grouping and French/decimal-point fractions.
  // This boundary helper never turns a blank or a missing value into zero.
  function parseLocalizedNumber(input, lang) {
    var shape = { value: null };
    if (typeof input === 'number') return Number.isFinite(input) ? finish({ value: input }, shape) : fail(shape, 'Enter a finite number.');
    if (typeof input !== 'string' || !input.trim()) return fail(shape, 'Enter a number.');
    var text = input.trim();
    /* v7.60 : hors du français, la virgule groupe les milliers et le point sépare les décimales (« 1,250.50 ») */
    /* v7.61 : en espagnol, le point groupe les milliers et la virgule sépare les décimales (« 1.250,50 ») ; « 1.5 » reste un décimal */
    if ((lang || LANG) === 'es') {
      if (/^[+-]?\d+\.\d{1,2}$/.test(text)) return finish({ value: Number(text) }, shape);
      if (!/^[+-]?(?:\d+|\d{1,3}(?:[. \u00a0\u202f]\d{3})+)(?:,\d+)?$/.test(text)) return fail(shape, 'Enter a number like 1,250.50, with no unit.');
      return finish({ value: Number(text.replace(/[. \u00a0\u202f]/g, '').replace(',', '.')) }, shape);
    }
    if ((lang || LANG) !== 'fr') {
      if (!/^[+-]?(?:\d+|\d{1,3}(?:[, \u00a0\u202f]\d{3})+)(?:\.\d+)?$/.test(text)) return fail(shape, 'Enter a number like 1,250.50, with no unit.');
      return finish({ value: Number(text.replace(/[, \u00a0\u202f]/g, '')) }, shape);
    }
    if (!/^[+-]?(?:\d+|\d{1,3}(?:[ \u00a0\u202f]\d{3})+)(?:[,.]\d+)?$/.test(text)) return fail(shape, 'Enter a number like 1,250.50, with no unit.');
    return finish({ value: Number(text.replace(/[ \u00a0\u202f]/g, '').replace(',', '.')) }, shape);
  }

  var activityShape = { net: null, activeMinutes: null, cycleMinutes: null, hourly: null, investment: null, paybackRuns: null, units: null, unitsHourly: null };
  function activity(input) {
    try {
      var a = data(input);
      var reward = money(a.reward, 'the reward');
      var cost = money(a.cost, 'the fees', 0);
      var duration = minutes(a.duration, 'the duration', undefined, true);
      var prep = minutes(a.prep, 'the prep time', 0);
      var cooldown = minutes(a.cooldown, 'the cooldown before you can start again', 0);
      var share = number(a.share, 'your share of the reward', 100, { defaultValue: 100 });
      number(a.players, 'the number of players', 100, { defaultValue: 1, positive: true, integer: true });
      var investment = money(a.investment, "the starting purchase", 0);
      var units = number(a.units, 'the points per mission', MONEY_MAX, { defaultValue: 0 });
      var net = subtract(reward * share / 100, cost);
      var active = duration + prep;
      return finish({ net: net, activeMinutes: active, cycleMinutes: active + cooldown, hourly: net * 60 / (active + cooldown), investment: investment, paybackRuns: investment === 0 ? 0 : net > 0 ? ceil(investment / net) : null, units: units, unitsHourly: units * 60 / (active + cooldown) }, activityShape);
    } catch (error) { return fail(activityShape, error.message); }
  }

  // In the discrete goal APIs target remains TOTAL capital, reserve included.
  // reserve protects upfront cash only; callers add it to a spendable goal.
  var goalShape = { missing: null, runs: null, totalMinutes: null, activeMinutes: null, waitMinutes: null, continuousMinutes: null, sessions: null, days: null, finalCapital: null, hourly: null, investment: null };
  function goal(input) {
    try {
      var p = data(input);
      var capital = money(p.capital, 'what you have');
      var reserve = money(p.reserve, 'the money set aside', 0);
      var target = money(p.target, 'the goal');
      var daily = number(p.dailyMinutes, 'your play time per day, in minutes', 1440, { positive: true });
      if (reserve > capital && !equal(reserve, capital)) return fail(goalShape, 'The money you set aside (your reserve) is more than what you have.');
      var a = activity(p.activity);
      if (!a.valid) return fail(goalShape, a.reason);
      if (target <= capital) return finish({ missing: 0, runs: 0, totalMinutes: 0, activeMinutes: 0, waitMinutes: 0, continuousMinutes: 0, sessions: 0, days: 0, finalCapital: capital, hourly: a.hourly, investment: 0 }, goalShape);
      var spendable = subtract(capital, reserve);
      if (spendable < a.investment && !equal(spendable, a.investment)) return fail(goalShape, 'Not enough money to buy what you need before you start without touching the money you set aside.');
      var afterInvestment = subtract(spendable, a.investment);
      if (afterInvestment < (p.activity.cost || 0) && !equal(afterInvestment, p.activity.cost || 0)) return fail(goalShape, 'Not enough money to pay the costs of the first activity up front after the starting purchase without touching your reserve.');
      if (a.net <= 0) return fail(goalShape, 'To reach this goal, each mission has to earn more than its fees.');
      if (a.activeMinutes > daily) return fail(goalShape, 'A full activity, prep included, takes longer than your play time per day. Play longer each day.');
      var cooldown = a.cycleMinutes - a.activeMinutes;
      var missing = target - capital + a.investment;
      var runs = ceil(missing / a.net);
      safeRunCount(runs);
      var prepOnce = p.activity.prepOnce ? (p.activity.prep || 0) : 0;
      var perSession = 1 + floor((daily - a.activeMinutes) / (a.cycleMinutes - prepOnce));
      var sessions = ceil(runs / perSession);
      if (sessions > 1 && cooldown > 1440 - daily) return fail(goalShape, 'The cooldown before you can start again is longer than the break between two sessions. This case isn’t calculated here.');
      return finish({ missing: missing, runs: runs, totalMinutes: runs * a.activeMinutes - (runs - sessions) * prepOnce + (runs - sessions) * cooldown, activeMinutes: runs * a.activeMinutes - (runs - sessions) * prepOnce, waitMinutes: (runs - sessions) * cooldown, continuousMinutes: runs * a.activeMinutes - Math.max(0,runs - 1) * prepOnce + Math.max(0, runs - 1) * cooldown, sessions: sessions, days: sessions, finalCapital: capital - a.investment + runs * a.net, hourly: a.hourly, investment: a.investment }, goalShape);
    } catch (error) { return fail(goalShape, error.message); }
  }

  function goalMixed(input) {
    var shape = Object.assign({}, goalShape, { breakdown: [] });
    try {
      var p = data(input);
      var capital = money(p.capital, 'what you have');
      var reserve = money(p.reserve, 'the money set aside', 0);
      var target = money(p.target, 'the goal');
      var daily = number(p.dailyMinutes, 'your play time per day, in minutes', 1440, { positive: true });
      if (reserve > capital && !equal(reserve, capital)) return fail(shape, 'The money you set aside (your reserve) is more than what you have.');
      if (!Array.isArray(p.activities) || !p.activities.length || p.activities.length > 20) return fail(shape, 'Choose between 1 and 20 activities to do one after another.');
      var activities = p.activities.map(function (entry, index) {
        var a = activity(entry);
        if (!a.valid) throw new Error('Activity ' + (index + 1) + ': ' + a.reason);
        return Object.assign({}, a, { name: typeof entry.name === 'string' ? entry.name.slice(0, 120) : 'Activity ' + (index + 1), cooldown: a.cycleMinutes - a.activeMinutes, prep: entry.prep || 0, prepOnce: entry.prepOnce === true });
      });
      if (target <= capital) return finish({ missing: 0, runs: 0, totalMinutes: 0, activeMinutes: 0, waitMinutes: 0, continuousMinutes: 0, sessions: 0, days: 0, finalCapital: capital, hourly: null, investment: 0, breakdown: [] }, shape);
      var investment = activities.reduce(function (sum, a) { return sum + a.investment; }, 0);
      var spendable = subtract(capital, reserve);
      if (spendable < investment && !equal(spendable, investment)) return fail(shape, 'Not enough money to buy what you need before starting all these activities without touching the money you set aside.');
      if (activities.some(function (a) { return a.net <= 0; })) return fail(shape, 'Each activity in this rotation has to earn more than its fees.');
      if (activities.some(function (a) { return a.activeMinutes > daily; })) return fail(shape, 'One activity in the rotation doesn’t fit in your play time per day.');
      var cash = capital - investment;
      var ready = activities.map(function () { return 0; });
      var continuousReady = ready.slice();
      var counts = ready.slice(), sessionCounts = ready.slice();
      var total = 0, active = 0, waiting = 0, continuous = 0, elapsed = 0, sessions = 1, runs = 0;
      while (cash < target && !equal(cash, target) && runs < MAX_MIXED_RUNS) {
        var index = runs % activities.length;
        var a = activities[index];
        var startingCash = subtract(cash, reserve);
        if (startingCash < (p.activities[index].cost || 0) && !equal(startingCash, p.activities[index].cost || 0)) return fail(shape, 'Not enough money to pay the costs of “' + a.name + '” up front before its reward comes in, without touching your reserve.');
        var wait = Math.max(0, ready[index] - elapsed);
        var activeDuration = a.activeMinutes - (a.prepOnce && sessionCounts[index] ? a.prep : 0);
        if (elapsed + wait + activeDuration > daily + Number.EPSILON * daily * 4) {
          if (activities.some(function (item) { return item.cooldown > 1440 - daily; })) return fail(shape, 'One of the cooldowns is longer than the break between two sessions. This case isn’t calculated here.');
          sessions += 1;
          elapsed = 0;
          ready = ready.map(function () { return 0; });
          wait = 0;sessionCounts = sessionCounts.map(function(){return 0;});activeDuration=a.activeMinutes;
        }
        elapsed += wait + activeDuration;
        total += wait + activeDuration;
        active += activeDuration;sessionCounts[index] += 1;
        waiting += wait;
        ready[index] = elapsed + a.cooldown;
        continuous = Math.max(continuous, continuousReady[index]) + a.activeMinutes - (a.prepOnce && counts[index] ? a.prep : 0);
        continuousReady[index] = continuous + a.cooldown;
        counts[index] += 1;
        cash = capital - investment + activities.reduce(function (profit, entry, activityIndex) { return profit + counts[activityIndex] * entry.net; }, 0);
        runs += 1;
      }
      if (cash < target && !equal(cash, target)) return fail(shape, 'The rotation goes over 100,000 activities. Lower the goal or use the single-activity calculation.');
      if (equal(cash, target)) cash = target;
      return finish({ missing: target - capital + investment, runs: runs, totalMinutes: total, activeMinutes: active, waitMinutes: waiting, continuousMinutes: continuous, sessions: sessions, days: sessions, finalCapital: cash, hourly: (cash - capital + investment) * 60 / total, investment: investment, breakdown: activities.map(function (a, index) { return { name: a.name, runs: counts[index], net: counts[index] * a.net }; }) }, shape);
    } catch (error) { return fail(shape, error.message); }
  }

  var inverseShape = { runs: null, totalMinutes: null, profit: null, finalCapital: null };
  function inverse(input) {
    try {
      var p = data(input);
      var available = minutes(p.minutes, 'the time you have');
      var capital = money(p.capital, 'what you have');
      var reserve = money(p.reserve, 'the money set aside', 0);
      if (reserve > capital && !equal(reserve, capital)) return fail(inverseShape, 'The money you set aside (your reserve) is more than what you have.');
      var a = activity(p.activity);
      if (!a.valid) return fail(inverseShape, a.reason);
      var cooldown = a.cycleMinutes - a.activeMinutes;
      var repeatCycle = a.cycleMinutes - (p.activity.prepOnce ? (p.activity.prep || 0) : 0);
      var runs = available < a.activeMinutes ? 0 : 1 + floor((available - a.activeMinutes) / repeatCycle);
      safeRunCount(runs);
      var spendable = subtract(capital, reserve);
      if (runs && spendable < a.investment && !equal(spendable, a.investment)) return fail(inverseShape, 'Not enough money to buy what you need before you start without touching the money you set aside.');
      var lowestStartingCash = spendable - a.investment + Math.min(0, (runs - 1) * a.net);
      if (runs && lowestStartingCash < (p.activity.cost || 0) && !equal(lowestStartingCash, p.activity.cost || 0)) return fail(inverseShape, 'Not enough money to pay each activity’s costs up front without touching your reserve. Do fewer repeats or lower the costs.');
      var profit = runs ? runs * a.net - a.investment : 0;
      if (capital + profit < 0) return fail(inverseShape, 'This activity’s losses would be more than the money you have.');
      return finish({ runs: runs, totalMinutes: runs ? a.activeMinutes + (runs - 1) * repeatCycle : 0, profit: profit, finalCapital: capital + profit }, inverseShape);
    } catch (error) { return fail(inverseShape, error.message); }
  }

  /** Continuous personal model: target is usable cash EXCLUDING the protected
   * reserve. No discrete mission, cooldown, purchase or passive-income rule is
   * inferred. dailyMinutes is played minutes per day, not wall-clock time. */
  var continuousShape = { missing: null, availableCapital: null, reserve: null, hourly: null, totalMinutes: null, hours: null, activeMinutes: null, waitMinutes: null, sessions: null, days: null, finalCapital: null };
  function goalContinuous(input) {
    try {
      var p = data(input);
      var capital = money(p.capital, 'what you have');
      var reserve = money(p.reserve, 'the money set aside', 0);
      var target = money(p.target, 'the goal');
      if (reserve > capital) return fail(continuousShape, 'The money you set aside (your reserve) is more than what you have. Lower the reserve.');
      var available = subtract(capital, reserve);
      var missing = Math.max(0, subtract(target, available));
      if(missing===0)return finish({missing:0,availableCapital:available,reserve:reserve,hourly:Number.isFinite(p.hourly)&&p.hourly>=0?p.hourly:null,totalMinutes:0,hours:0,activeMinutes:0,waitMinutes:0,sessions:0,days:0,finalCapital:capital},continuousShape);
      if(p.hourly==null)return fail(Object.assign({},continuousShape,{missing:missing,availableCapital:available,reserve:reserve}),'You’re short this amount. Enter what you earn per hour to get the play time needed.');
      var hourly = money(p.hourly, 'what you earn per hour');
      var daily = p.dailyMinutes == null ? null : number(p.dailyMinutes, 'your play time per day, in minutes', 1440, { positive: true });
      if (missing > 0 && hourly <= 0) return fail(continuousShape, 'To reach this goal, you need to earn more than $0 per hour.');
      var hours = missing === 0 ? 0 : missing / hourly;
      var total = hours * 60;
      var sessions = total === 0 ? 0 : daily === null ? null : ceil(total / daily);
      return finish({ missing: missing, availableCapital: available, reserve: reserve, hourly: hourly, totalMinutes: total, hours: hours, activeMinutes: total, waitMinutes: 0, sessions: sessions, days: sessions, finalCapital: capital + missing }, continuousShape);
    } catch (error) { return fail(continuousShape, error.message); }
  }

  /** Deterministic bounded beam search, maximizing final liquid capital.
   * All costs are paid at START; personal reward is received at END. Investment
   * is paid once on first use; preparation repeats; cooldown starts at END and
   * another activity can cover it. No simultaneous active work is permitted.
   * At most 12 activities, 1440 minutes, 256 runs and 24 retained states/depth.
   * maxRepeat limits consecutive uses, including after a wait. This is NOT a
   * proof of a global optimum. A path may stop early if another run loses cash.
   */
  var sessionShape = { profit: null, finalCapital: null, reserve: null, investment: null, runs: null, activeMinutes: null, waitMinutes: null, unusedMinutes: null, totalMinutes: null, timeline: [], breakdown: [], method: 'bounded-beam', limited: true, limits: { activities: 12, minutes: 1440, runs: SESSION_MAX_RUNS, beamWidth: SESSION_BEAM_WIDTH }, note: null };
  function sessionPlan(input) {
    try {
      var p = data(input);
      var capital = money(p.capital, 'what you have');
      var reserve = money(p.reserve, 'the money set aside', 0);
      var available = number(p.minutes, 'the duration of your session, in minutes', 1440);
      var maxRepeat = number(p.maxRepeat, 'the number of times in a row', SESSION_MAX_RUNS, { defaultValue: SESSION_MAX_RUNS, positive: true, integer: true });
      if (reserve > capital) return fail(sessionShape, 'The money you set aside (your reserve) is more than what you have.');
      if (!Array.isArray(p.activities) || !p.activities.length || p.activities.length > 12) return fail(sessionShape, 'Choose between 1 and 12 activities for the session.');
      var activities = p.activities.map(function (entry, index) {
        var result = activity(entry);
        if (!result.valid) throw new Error('Activity ' + (index + 1) + ': ' + result.reason);
        return Object.assign({}, result, { id: typeof entry.id === 'string' ? entry.id.slice(0, 120) : String(index), name: typeof entry.name === 'string' && entry.name.trim() ? entry.name.trim().slice(0, 120) : 'Activity ' + (index + 1), cost: entry.cost || 0, reward: entry.reward * (entry.share === undefined ? 100 : entry.share) / 100, cooldown: result.cycleMinutes - result.activeMinutes, prep: entry.prep || 0, prepOnce: entry.prepOnce === true });
      });
      var empty = activities.map(function () { return 0; });
      var initial = { cash: capital, time: 0, active: 0, wait: 0, investment: 0, counts: empty.slice(), ready: empty.slice(), last: -1, streak: 0, runs: 0, path: null };
      var best = initial;
      var beam = [initial];
      var pruned = false;
      var capped = false;
      function better(left, right) {
        if (!equal(left.cash, right.cash)) return left.cash > right.cash;
        if (!equal(left.time, right.time)) return left.time < right.time;
        if (!equal(left.investment, right.investment)) return left.investment < right.investment;
        return left.runs < right.runs;
      }
      for (var depth = 0; depth < SESSION_MAX_RUNS && beam.length; depth += 1) {
        var candidates = [];
        beam.forEach(function (state) {
          activities.forEach(function (a, index) {
            if (a.net <= 0 || (state.last === index && state.streak >= maxRepeat)) return;
            var start = Math.max(state.time, state.ready[index]);
            var activeDuration = a.activeMinutes - (a.prepOnce && state.counts[index] ? a.prep : 0);
            var end = start + activeDuration;
            if (end > available && !equal(end, available)) return;
            if (equal(end, available)) end = available;
            var investment = state.counts[index] === 0 ? a.investment : 0;
            var upfront = investment + a.cost;
            var spendable = subtract(state.cash, reserve);
            if (upfront > spendable && !equal(upfront, spendable)) return;
            var counts = state.counts.slice();
            counts[index] += 1;
            var ready = state.ready.slice();
            ready[index] = end + a.cooldown;
            // Recompute from counts to avoid drift over repeated decimal gains.
            var totalInvestment = state.investment + investment;
            var cash = capital - totalInvestment + activities.reduce(function (sum, item, i) { return sum + counts[i] * item.net; }, 0);
            var step = { type: 'activity', index: index, id: a.id, name: a.name, start: start, end: end, waitBefore: start - state.time, investment: investment, cost: a.cost, reward: a.reward, net: a.net, capitalBefore: state.cash, capitalAfter: cash };
            var candidate = { cash: cash, time: end, active: state.active + activeDuration, wait: state.wait + step.waitBefore, investment: totalInvestment, counts: counts, ready: ready, last: index, streak: state.last === index ? state.streak + 1 : 1, runs: state.runs + 1, path: { step: step, previous: state.path } };
            if (better(candidate, best)) best = candidate;
            candidates.push(candidate);
          });
        });
        candidates.sort(function (a, b) {
          // Reward already earned determines priority; retain earlier paths on
          // ties to leave more room for subsequent activities. Stable order is
          // supplied by the input order and the original candidate index.
          return b.cash - a.cash || a.time - b.time || a.investment - b.investment;
        });
        // Different orderings may reach exactly the same future state. Keep
        // one representative so duplicate paths cannot crowd out alternatives.
        var unique = [];
        var seen = new Set();
        for (var c = 0; c < candidates.length; c += 1) {
          var candidate = candidates[c];
          var key = [candidate.time, candidate.last, candidate.streak, candidate.counts.join(','), candidate.ready.join(',')].join('|');
          if (!seen.has(key)) { seen.add(key); unique.push(candidate); }
        }
        if (unique.length > SESSION_BEAM_WIDTH) pruned = true;
        beam = unique.slice(0, SESSION_BEAM_WIDTH);
        if (depth === SESSION_MAX_RUNS - 1 && beam.length) capped = true;
      }
      var timeline = [];
      for (var path = best.path; path; path = path.previous) timeline.push(path.step);
      timeline.reverse();
      var note = best.runs ? 'Schedule found among the combinations tried: the best session earnings found, with no guarantee there isn’t a better one.' : 'No schedule that makes money was found. Check the available time, the costs to pay up front, the starting purchases and the reserve.';
      if (capped) note += ' We look at no more than 256 missions per session.';
      return finish({ profit: subtract(best.cash, capital), finalCapital: best.cash, reserve: reserve, investment: best.investment, runs: best.runs, activeMinutes: best.active, waitMinutes: best.wait, unusedMinutes: Math.max(0, subtract(available, best.time)), totalMinutes: best.time, timeline: timeline, breakdown: activities.map(function (a, index) { return { id: a.id, name: a.name, runs: best.counts[index], net: best.counts[index] * a.net, investment: best.counts[index] ? a.investment : 0 }; }), method: 'bounded-beam', limited: pruned || capped, limits: sessionShape.limits, note: note }, sessionShape);
    } catch (error) { return fail(sessionShape, error.message); }
  }

  var roiShape = { investment: null, netHourly: null, grossProfit: null, operatingProfit: null, netProfit: null, roiPercent: null, paybackHours: null };
  function roi(input) {
    try {
      var p = data(input);
      var purchasePrice = money(p.purchase, 'the purchase price');
      var upgrades = money(p.upgrades, 'the upgrades', 0);
      var fees = money(p.fees, 'the extra fees', 0);
      var revenue = money(p.revenueHourly, 'what it earns per hour');
      var cost = money(p.costHourly, 'the hourly costs', 0);
      var hours = number(p.hours, 'the play time, in hours', MINUTES_MAX / 60);
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
      var capital = money(p.capital, 'what you have');
      var price = money(p.price, 'the purchase price');
      // Le budget d'achat ne dépend ni d'un objectif ni d'un revenu.
      var hourly = p.hourly == null ? null : money(p.hourly, 'what you earn per hour');
      var target = p.target == null ? null : money(p.target, 'the goal');
      var remaining = subtract(capital, price);
      var before = target === null ? null : timeTo(target, capital, hourly);
      var after = target === null ? null : timeTo(target, remaining, hourly);
      return finish({ remaining: remaining, capitalPercent: ratio(price * 100, capital), recoveryHours: price === 0 ? 0 : ratio(price, hourly), goalDelayHours: before === null || after === null ? null : after - before, shortfall: Math.max(0, price - capital) }, purchaseShape);
    } catch (error) { return fail(purchaseShape, error.message); }
  }

  // Décision d'achat sans attribution de revenu. Regagner une dépense n'est pas
  // un amortissement : seul un revenu additionnel explicite autorise un ROI.
  function worth(input) {
    var shape = { investment:null, remaining:null, cashRemaining:null, shortfall:null,
      capitalPercent:null, recoveryHours:null, waitHours:null, buyNowCash:null, waitCash:null };
    try {
      var p=data(input), capital=money(p.capital,'the money available'), reserve=money(p.reserve,'the money set aside',0);
      if(reserve>capital)return fail(shape,'The money set aside is more than what you have.');
      var investment=money(p.price,'the purchase price')+money(p.extras,'the options',0)+money(p.fees,'the fees',0);
      var hourly=p.hourly==null?null:money(p.hourly,'what you earn per hour');
      var horizon=p.hours==null?null:number(p.hours,'the play time, in hours',MINUTES_MAX/60);
      var r=purchase({capital:capital-reserve,price:investment,hourly:hourly});
      if(!r.valid)return fail(shape,r.reason);
      return finish({investment:investment,remaining:r.remaining,cashRemaining:capital-investment,
        shortfall:r.shortfall,capitalPercent:ratio(investment*100,capital),recoveryHours:r.recoveryHours,
        waitHours:r.shortfall===0?0:ratio(r.shortfall,hourly),
        buyNowCash:r.shortfall===0&&hourly!==null&&horizon!==null?capital-investment+hourly*horizon:null,
        waitCash:hourly!==null&&horizon!==null?capital+hourly*horizon:null},shape);
    } catch(error){return fail(shape,error.message);}
  }

  var budgetShape = { spent: null, remaining: null, available: null, overBudget: null, shares: [] };
  function budget(input) {
    try {
      var p = data(input);
      var capital = money(p.capital, 'what you have');
      var reserve = money(p.reserve, 'the money set aside', 0);
      if (!Array.isArray(p.allocations) || p.allocations.length > 100) return fail(budgetShape, '100 expenses at most.');
      var allocations = p.allocations.map(function (value, index) { return money(value, 'expense ' + (index + 1)); });
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
      var cash = money(p.capital, 'what you have');
      var hourly = p.hourly == null ? null : money(p.hourly, 'what you earn per hour');
      var reserve = money(p.reserve, 'the money set aside', 0);
      if (reserve > cash) return fail(orderShape, 'The reserve is more than the money you have.');
      if (!Array.isArray(p.items) || p.items.length > 100) return fail(orderShape, '100 purchases at most in the buying order.');
      var items = p.items.map(function (entry, index) {
        entry = data(entry);
        var label = typeof entry.name === 'string' && entry.name.trim() ? entry.name.trim().slice(0, 120) : 'Purchase ' + (index + 1);
        return { name: label, price: money(entry.price, 'the price of “' + label + '”'), boostHourly: money(entry.boostHourly, 'the extra earnings from purchase ' + (index + 1), 0), costHourly: money(entry.costHourly, 'what purchase ' + (index + 1) + ' costs to use', 0) }; // v7.49 : coût d’usage par heure
      });
      var time = 0;
      var steps = [];
      for (var i = 0; i < items.length; i += 1) {
        var item = items[i];
        var wait = timeTo(item.price + reserve, cash, hourly);
        if (wait === null) return fail(Object.assign({}, orderShape, {steps: steps, blockedIndex: i, shortfall: item.price + reserve - cash}), 'Step ' + (i + 1) + ' is blocked: you’re short ' + dollars((item.price + reserve - cash).toLocaleString('en-US'), ' ') + ' for “' + item.name + '”. ' + (hourly !== null && hourly < 0 ? 'Your earlier purchases cost more to use than they earn: you lose money by playing.' : 'You earn nothing per hour before this purchase.'));
        time += wait;
        // Waiting ends exactly at the price: avoid residual floating-point debt.
        cash = wait > 0 ? reserve : cash - item.price;
        // Un revenu inconnu ne devient pas implicitement zéro.
        if(hourly!==null)hourly = subtract(hourly + item.boostHourly, item.costHourly);
        steps.push({ name: item.name, waitHours: wait, timeHours: time, capital: cash, hourly: hourly });
      }
      return finish({ steps: steps, totalHours: time, finalCapital: cash, finalHourly: hourly }, orderShape);
    } catch (error) { return fail(orderShape, error.message); }
  }

  // ---------------------------------------------------------------------------
  // Quel achat choisir ? Compare plusieurs achats avec le même argent, le même
  // gain par heure et le même temps de jeu. L'envie (1 à 5) vient du joueur ;
  // aucun revenu n'est inventé : sans revenu renseigné, pas de remboursement.
  var chooseShape = { items: [], best: null, bestByCriterion: {}, ties: {} };
  function choose(input) {
    try {
      var p = data(input);
      var capital = money(p.capital, 'the money you have');
      var reserve = money(p.reserve, 'the money set aside', 0);
      if (reserve > capital) return fail(chooseShape, 'The money set aside is more than what you have.');
      var hourly = p.hourly == null ? null : money(p.hourly, 'what you earn per hour');
      var dailyMinutes = p.dailyMinutes == null ? null : number(p.dailyMinutes, 'the play time per day', 1440, { positive: true });
      var horizon = p.hours == null ? null : number(p.hours, 'how long you use it', MINUTES_MAX / 60);
      if (!Array.isArray(p.items) || p.items.length < 2 || p.items.length > 6) return fail(chooseShape, 'Compare two to six purchases.');
      var available = subtract(capital, reserve);
      var items = p.items.map(function (entry, index) {
        entry = data(entry);
        var name = typeof entry.name === 'string' && entry.name.trim() ? entry.name.trim().slice(0, 120) : 'Purchase ' + (index + 1);
        if (entry.price == null) return { name: name, known: false, price: null, total: null, utility: null, incomeHourly: null, affordable: null, shortfall: null, waitHours: null, waitDays: null, recoveryHours: null, paybackHours: null, valueScore: null, gainOverHorizon: null };
        var total = money(entry.price, 'the price of ' + name) + money(entry.extras, 'the options for ' + name, 0) + money(entry.fees, 'the fees for ' + name, 0);
        // v7.54 : l’envie n’est plus notée 3 par le site : absente, elle reste absente (revue v7.53) ; le critère « envie / prix » attend alors ta note.
        var utility = entry.utility === null || entry.utility === undefined ? null : number(entry.utility, 'the want score for ' + name, 5, { integer: true, positive: true });
        var income = entry.incomeHourly == null ? null : money(entry.incomeHourly, 'the earnings from ' + name);
        var shortfall = Math.max(0, subtract(total, available));
        var waitHours = shortfall === 0 ? 0 : hourly === null || hourly <= 0 ? null : shortfall / hourly;
        var waitDays = waitHours === null ? null : dailyMinutes === null ? null : ceil(waitHours * 60 / dailyMinutes);
        var recoveryHours = hourly === null || hourly <= 0 ? null : total / hourly;
        var paybackHours = income === null || income <= 0 ? null : total / income;
        var gain = income === null || horizon === null ? null : income * horizon - total;
        return { name: name, known: true, price: entry.price, total: total, utility: utility, incomeHourly: income, affordable: shortfall === 0, shortfall: shortfall, waitHours: waitHours, waitDays: waitDays, recoveryHours: recoveryHours, paybackHours: paybackHours, valueScore: total > 0 && utility !== null ? utility * 100000 / total : null, gainOverHorizon: gain };
      });
      var known = items.filter(function (x) { return x.known; });
      if (!known.length) return fail(chooseShape, 'Enter at least one price, even an imagined one.');
      // v7.53 : à égalité sur un critère, le gagnant ne dépend plus de l’ordre de la liste (avant, le premier écrit
      // gagnait) : départage fixe par le rapport envie / prix, l’envie, le prix, le délai, puis le nom ; les ex æquo
      // sont rendus (ties) pour que l’écran dise « à égalité ».
      var ties = {};
      function near(a, b) { return Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b)); }
      function tieBreak(a, b) {
        var keys = [['valueScore', true], ['utility', true], ['total', false], ['waitHours', false]];
        for (var i = 0; i < keys.length; i++) {
          var va = a[keys[i][0]], vb = b[keys[i][0]];
          if (va == null && vb == null) continue;
          if (va == null) return 1;
          if (vb == null) return -1;
          if (!near(va, vb)) return keys[i][1] ? vb - va : va - vb;
        }
        return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
      }
      function pick(key, score, higher) {
        var scored = known.filter(function (x) { var v = score(x); return v !== null && v !== undefined; });
        ties[key] = [];
        if (!scored.length) return null;
        var bestValue = scored.reduce(function (m, x) { var v = score(x); return m === null || (higher ? v > m : v < m) ? v : m; }, null);
        var top = scored.filter(function (x) { return near(score(x), bestValue); }).sort(tieBreak);
        if (top.length > 1) ties[key] = top.map(function (x) { return x.name; });
        return top[0].name;
      }
      var byCriterion = {
        value: pick('value', function (x) { return x.valueScore; }, true),
        cheapest: pick('cheapest', function (x) { return x.total; }, false),
        fastest: pick('fastest', function (x) { return x.waitHours; }, false),
        profit: pick('profit', function (x) { return x.paybackHours; }, false),
        utility: pick('utility', function (x) { return x.utility; }, true)
      };
      var criterion = ['value', 'cheapest', 'fastest', 'profit', 'utility'].indexOf(p.criterion) >= 0 ? p.criterion : 'value';
      var unrated = known.filter(function (x) { return x.utility === null; }).map(function (x) { return x.name; });
      var chosen = known.find(function (x) { return x.name === byCriterion[criterion]; }) || null;
      return finish({ items: items, best: byCriterion[criterion], bestByCriterion: byCriterion, ties: ties, unrated: unrated, criterion: criterion, available: available, bestWaitHours: chosen ? chosen.waitHours : null, bestTotal: chosen ? chosen.total : null }, chooseShape);
    } catch (error) { return fail(chooseShape, error.message); }
  }

  // ---------------------------------------------------------------------------
  // Business plan : un but (une somme ou un achat), ce que le joueur a, ce qu'il
  // gagne, son temps de jeu, les achats à faire avant, et ce que le but rapporte
  // après. Sort une chronologie en heures de jeu et en jours, des jalons, et deux
  // variantes prudentes (prix +20 %, gain −20 %). Rien n'est promis par le jeu.
  var planShape = { steps: [], totalHours: null, totalMinutes: null, sessions: null, days: null, weeks: null, missing: null, milestones: [], payback: null, effectiveHourly: null, variants: {} };
  function businessPlan(input) {
    try {
      var p = data(input);
      var capital = money(p.capital, 'the money you have');
      var reserve = money(p.reserve, 'the money set aside', 0);
      if (reserve > capital) return fail(planShape, 'The money set aside is more than what you have.');
      var hourly = money(p.hourly, 'what you earn per hour');
      var dailyMinutes = number(p.dailyMinutes, 'the play time per day', 1440, { positive: true });
      var daysPerWeek = number(p.daysPerWeek, 'the days per week', 7, { defaultValue: 7, integer: true, positive: true });
      var upkeep = money(p.upkeepPerSession, 'the expenses per session', 0);
      var goalPrice = p.goalPrice == null ? null : money(p.goalPrice, 'the price of the goal');
      var goalTarget = p.target == null ? null : money(p.target, 'the target amount');
      if (goalPrice === null && goalTarget === null) return fail(planShape, 'Tell me your goal: an amount to have or a purchase with its price.');
      var goalIncome = p.goalIncomeHourly == null ? 0 : money(p.goalIncomeHourly, 'what the goal earns');
      var prerequisites = Array.isArray(p.prerequisites) ? p.prerequisites : [];
      if (prerequisites.length > 20) return fail(planShape, 'Twenty purchases at most before the goal.');
      // Le gain utile par heure enlève les dépenses de chaque partie (consommables, munitions…).
      var upkeepHourly = upkeep * 60 / dailyMinutes;
      var effective = subtract(hourly, upkeepHourly);
      if (effective <= 0 && (goalPrice !== null ? goalPrice : goalTarget) > subtract(capital, reserve)) return fail(planShape, 'Your expenses per session eat up everything you earn: lower them or raise your earnings per hour.');
      var items = prerequisites.map(function (x, i) { x = data(x); var label = typeof x.name === 'string' && x.name.trim() ? x.name.trim().slice(0, 120) : 'Purchase ' + (i + 1); return { name: label, price: money(x.price, 'the price of “' + label + '”'), boostHourly: money(x.boostHourly, 'the earnings from purchase ' + (i + 1), 0) }; });
      var goalItem = goalPrice !== null ? { name: typeof p.goalName === 'string' && p.goalName.trim() ? p.goalName.trim().slice(0, 120) : 'My goal', price: goalPrice, boostHourly: goalIncome } : null;
      var chain = order({ capital: capital, reserve: reserve, hourly: Math.max(0, effective), items: goalItem ? items.concat([goalItem]) : items });
      if (!chain.valid) return fail(planShape, chain.reason);
      var steps = chain.steps.map(function (st, i) { return { name: st.name, kind: goalItem && i === chain.steps.length - 1 ? 'goal' : 'prerequisite', waitHours: st.waitHours, atHours: st.timeHours, capitalAfter: st.capital, hourlyAfter: st.hourly }; });
      var totalHours = chain.totalHours;
      var finalTargetHours = 0;
      if (goalTarget !== null) {
        // Après les achats, il faut encore réunir la somme visée (en plus de la réserve).
        var missingAfter = Math.max(0, subtract(goalTarget + reserve, chain.finalCapital));
        var rate = chain.finalHourly === null ? Math.max(0, effective) : chain.finalHourly;
        if (missingAfter > 0 && rate <= 0) return fail(planShape, 'With these earnings per hour, the target amount can’t be reached.');
        finalTargetHours = missingAfter > 0 ? missingAfter / rate : 0;
        totalHours += finalTargetHours;
        steps.push({ name: 'Reach ' + dollars(goalTarget.toLocaleString('en-US'), ' ') + '', kind: 'goal', waitHours: finalTargetHours, atHours: totalHours, capitalAfter: goalTarget + reserve, hourlyAfter: rate });
      }
      var totalMinutes = totalHours * 60;
      var sessions = totalMinutes === 0 ? 0 : ceil(totalMinutes / dailyMinutes);
      var weeks = sessions === 0 ? 0 : Math.floor((sessions - 1) / daysPerWeek);
      // Jour calendaire de chaque étape, avec la même règle de semaine que les jalons.
      steps.forEach(function (st) { var sess = st.atHours === 0 ? 0 : ceil(st.atHours * 60 / dailyMinutes); var wk = sess === 0 ? 0 : Math.floor((sess - 1) / daysPerWeek); st.sessions = sess; st.days = sess === 0 ? 0 : wk * 7 + ((sess - 1) % daysPerWeek) + 1; });
      var days = sessions === 0 ? 0 : weeks * 7 + ((sessions - 1) % daysPerWeek) + 1;
      var missing = Math.max(0, subtract(items.reduce(function (a, x) { return a + x.price; }, 0) + (goalPrice || 0) + (goalTarget || 0) + reserve, capital));
      var milestones = [0.25, 0.5, 0.75, 1].map(function (f) { var h = totalHours * f; var sess = h === 0 ? 0 : ceil(h * 60 / dailyMinutes); var wk = sess === 0 ? 0 : Math.floor((sess - 1) / daysPerWeek); return { fraction: f, hours: h, sessions: sess, days: sess === 0 ? 0 : wk * 7 + ((sess - 1) % daysPerWeek) + 1 }; });
      var payback = goalItem && goalIncome > 0 ? goalPrice / goalIncome : null;
      function variant(priceFactor, hourlyFactor) {
        var alt = businessPlan(Object.assign({}, p, { hourly: hourly * hourlyFactor, goalPrice: goalPrice === null ? null : goalPrice * priceFactor, prerequisites: prerequisites.map(function (x) { return Object.assign({}, x, { price: x.price * priceFactor }); }), variants: false }));
        return alt.valid ? { totalHours: alt.totalHours, days: alt.days, sessions: alt.sessions } : null;
      }
      var variants = p.variants === false ? {} : { pricePlus20: variant(1.2, 1), hourlyMinus20: variant(1, 0.8), noReserve: reserve > 0 ? (function () { var alt = businessPlan(Object.assign({}, p, { reserve: 0, variants: false })); return alt.valid ? { totalHours: alt.totalHours, days: alt.days, sessions: alt.sessions } : null; })() : null };
      return finish({ steps: steps, totalHours: totalHours, totalMinutes: totalMinutes, sessions: sessions, days: days, weeks: sessions === 0 ? 0 : ceil(sessions / daysPerWeek), missing: missing, milestones: milestones, payback: payback, effectiveHourly: effective, upkeepHourly: upkeepHourly, finalCapital: chain.finalCapital, variants: variants }, planShape);
    } catch (error) { return fail(planShape, error.message); }
  }

  var compareShape = { buyHours: null, saveHours: null, affordable: null };
  function compareBuy(input) {
    try {
      var p = data(input);
      var capital = money(p.capital, 'what you have');
      var target = money(p.target, 'the goal');
      var hourly = money(p.hourly, 'what you earn per hour');
      var price = money(p.price, 'the purchase price');
      var boost = money(p.boostHourly, 'what you earn extra per hour', 0);
      var affordable = capital >= price;
      return finish({ buyHours: affordable ? timeTo(target, capital - price, hourly + boost) : null, saveHours: timeTo(target, capital, hourly), affordable: affordable }, compareShape);
    } catch (error) { return fail(compareShape, error.message); }
  }


  function sessionProjection(input) {
    var shape = { missingBefore: null, missingAfter: null, progressPercent: null, sessionsLeft: null, calendarDays: null, calendarReason: null, calendarField: null };
    try {
      var p = data(input), capital = money(p.capital, 'what you have'), reserve = money(p.reserve, 'the money set aside', 0);
      var target = money(p.target, 'the goal');
      if (!p.session || !p.session.valid) return fail(shape, 'Fill in your session first.');
      var before = Math.max(0, target - (capital - reserve)), after = Math.max(0, target - (p.session.finalCapital - reserve));
      var next = p.repeatProfit === undefined ? p.session.profit + (p.session.investment || 0) : p.repeatProfit;
      var count = after === 0 ? 0 : Number.isFinite(next) && next > 0 ? ceil(after / next) : null;
      var calendar = count === 0 ? 0 : null, calendarReason = null, calendarField = null;
      if (after > 0 && !Number.isFinite(next)) {
        calendarReason = 'We can’t calculate the next sessions. ' + (p.repeatReason || 'Enter how long a session usually lasts.');
        calendarField = 'usualMinutes';
      } else if (count > 0) {
        try { var days = number(p.daysPerWeek, 'the days per week you play', 7, {positive:true,integer:true,defaultValue:7}); calendar = ceil(count * 7 / days); }
        catch(error) { calendarReason = error.message; calendarField = 'daysPerWeek'; }
      }
      return finish({missingBefore:before, missingAfter:after, progressPercent:before === 0 ? 100 : Math.max(0, Math.min(100, p.session.profit / before * 100)), sessionsLeft:count, calendarDays:calendar, calendarReason:calendarReason, calendarField:calendarField}, shape);
    } catch(error) { return fail(shape, error.message); }
  }

  // Sequential activity rotation; costs at start and rewards at completion.
  // Compare the two event streams for an improvement, without prorating rewards.
  function investmentActivities(input) {
    var shape = {investment:null, grossProfit:null, costs:null, operatingProfit:null, netProfit:null, paybackHours:null, paybackCycles:null, netHourly:null, runs:null};
    try {
      var p = data(input), investment = money(p.purchase, 'the purchase price') + money(p.upgrades,'the upgrades',0) + money(p.fees,'the upfront fees',0);
      var horizon = number(p.hours, 'the play time, in hours', MINUTES_MAX / 60) * 60;
      if (!Array.isArray(p.activities) || !p.activities.length || p.activities.length > 12) return fail(shape,'Choose an activity that goes with this purchase, or tell me how much it earns you per hour.');
      var improve = p.mode === 'improve';
      // Ce que le joueur gagnait déjà sans l'achat (par heure) : le temps passé sur la nouvelle activité ne rapporte plus ce gain-là.
      var baseline = improve || p.baselineHourly == null ? null : money(p.baselineHourly, 'what you already earn per hour');
      var gain = improve ? number(p.gainPercent,'the reward increase (%)',1000,{defaultValue:0}) : 0;
      var reduction = improve ? number(p.durationReduction,'the duration reduction (%)',95,{defaultValue:0}) : 0;
      var original = p.activities.map(function(a){ var r=activity(a); if(!r.valid) throw Error(a.name+': '+r.reason); return Object.assign({},a,{name:typeof a.name==='string'?a.name:'Activity',net:r.net,active:r.activeMinutes,cost:a.cost===undefined?0:a.cost,prep:a.prep===undefined?0:a.prep,cooldown:a.cooldown===undefined?0:a.cooldown,share:a.share===undefined?100:a.share}); });
      var after = original.map(function(a){var out=Object.assign({},a);if(improve){out.reward*=1+gain/100;out.duration*=1-reduction/100;}out.net=out.reward*out.share/100-out.cost;out.active=out.duration+out.prep;return out;});
      function rate(list){var net=list.reduce(function(t,a){return t+a.net;},0), duration=list.reduce(function(t,a){return t+a.active+a.cooldown;},0);return duration>0?net*60/duration:0;}
      var approximate = rate(after) - (improve ? rate(original) : 0);
      var longest = Math.max.apply(null,after.map(function(a){return a.active+a.cooldown;}));
      var until = Math.min(MINUTES_MAX, Math.max(horizon, approximate > 0 ? investment / approximate * 120 + longest * 4 : longest * 4));
      function stream(list) {
        var events=[], ready=list.map(function(){return 0;}), counts=ready.slice(), time=0, gross=0,costs=0,runs=0;
        for(var n=0;n<100000;n++){
          var i=n%list.length,a=list[i],start=Math.max(time,ready[i]);
          var end=start+a.active-(a.prepOnce&&counts[i]?a.prep:0);
          if(end>until) return {events:events,gross:gross,costs:costs,runs:runs,limited:false};
          events.push({time:start,value:-a.cost,run:0});events.push({time:end,value:a.reward*a.share/100,run:1});
          if(end<=horizon){gross+=a.reward*a.share/100;costs+=a.cost;runs++;}
          ready[i]=end+a.cooldown;counts[i]++;time=end;
        }
        if(time<horizon) throw Error('The period goes over 100,000 activities. Shorten how long you use it.');
        return {events:events,gross:gross,costs:costs,runs:runs,limited:true};
      }
      var a=stream(after),b=improve?stream(original):{events:[],gross:0,costs:0,runs:0};
      var events=a.events.map(function(e){return Object.assign({side:1},e);}).concat(b.events.map(function(e){return {time:e.time,value:-e.value,run:0,completion:e.run===1,side:-1};})).sort(function(x,y){return x.time-y.time;});
      var cumulative=0,cycles=0,payback=investment===0?0:null,paybackCycles=investment===0?0:null,marginalPayback=investment===0?0:null,marginalCycles=investment===0?0:null;
      for(var i=0;i<events.length;){var time=events[i].time,starts=0;do{if(events[i].run||events[i].completion)cumulative+=events[i].value;else starts+=events[i].value;cycles+=events[i].run;i++;}while(i<events.length&&equal(events[i].time,time));if(payback===null&&cumulative>=investment){payback=time/60;paybackCycles=cycles;}if(marginalPayback===null&&baseline!==null&&cumulative-baseline*time/60>=investment){marginalPayback=time/60;marginalCycles=cycles;}cumulative+=starts;}
      var gross=a.gross-b.gross,costs=a.costs-b.costs,operating=gross-costs;
      // Gain marginal : ce que l'achat rapporte en plus de ce que le joueur gagnait déjà pendant le même temps (horizon entier consacré à ces activités).
      var opportunity=baseline===null?null:baseline*horizon/60,marginal=opportunity===null?null:operating-opportunity;
      return finish({investment:investment,grossProfit:gross,costs:costs,operatingProfit:operating,netProfit:operating-investment,paybackHours:payback,paybackCycles:paybackCycles,netHourly:horizon>0?operating*60/horizon:null,runs:a.runs,beforeNet:b.gross-b.costs,afterNet:a.gross-a.costs,roiPercent:investment>0?(operating-investment)/investment*100:null,limited:a.limited||b.limited||payback===null, searchedMinutes:until,mode:improve?'improve':p.mode||'estimate',baselineHourly:baseline,opportunityCost:opportunity,marginalProfit:marginal,marginalNetProfit:marginal===null?null:marginal-investment,marginalPaybackHours:baseline===null?null:marginalPayback,marginalPaybackCycles:baseline===null?null:marginalCycles},shape);
    } catch(error){return fail(shape,error.message);}
  }


  // ---------------------------------------------------------------------------
  // Ça vaut le coup ? (modèle continu) : la situation AVEC l'achat contre la
  // situation SANS, sur le même temps de jeu. Seul le gain EN PLUS compte ; ce
  // que le joueur gagnait déjà n'est jamais présenté comme un bénéfice de l'achat.
  var compareShapeInvest = { investment: null, affordable: null, shortfall: null, marginalHourly: null, hours: null, withoutCash: null, withCash: null, difference: null, breakEvenHours: null, thresholds: {}, verdict: null };
  function investmentCompare(input) {
    try {
      var p = data(input);
      var capital = money(p.capital, 'the money you have');
      var reserve = money(p.reserve, 'the money set aside', 0);
      if (reserve > capital) return fail(compareShapeInvest, 'The money set aside is more than what you have.');
      var investment = money(p.price, 'the purchase price') + money(p.extras, 'the options', 0) + money(p.fees, 'the fees', 0);
      var baseline = p.baselineHourly == null ? null : money(p.baselineHourly, 'what you already earn per hour');
      var extra = money(p.extraHourly, 'what the purchase earns you extra per hour');
      var costHourly = money(p.costHourly, 'what the purchase costs you per hour', 0);
      var hours = p.hours == null ? null : number(p.hours, 'how long you use it', MINUTES_MAX / 60);
      var daily = p.dailyMinutes == null ? null : number(p.dailyMinutes, 'the play time per day', 1440, { positive: true });
      var marginal = subtract(extra, costHourly);
      var shortfall = Math.max(0, subtract(investment, subtract(capital, reserve)));
      var breakEven = investment === 0 ? 0 : marginal > 0 ? investment / marginal : null;
      var withoutCash = baseline === null || hours === null ? null : capital + baseline * hours;
      var withCash = hours === null ? null : capital - investment + ((baseline || 0) + marginal) * hours;
      var difference = hours === null ? null : marginal * hours - investment;
      var thresholds = {
        hoursForPayback: breakEven,
        sessionsForPayback: breakEven === null || daily === null ? null : ceil(breakEven * 60 / daily),
        extraHourlyForHorizon: hours === null || hours <= 0 ? null : investment / hours + costHourly,
        waitHours: shortfall === 0 ? 0 : baseline === null || baseline <= 0 ? null : shortfall / baseline
      };
      var verdict = marginal <= 0 && investment > 0 ? 'never' : shortfall > 0 ? 'wait' : hours === null ? 'unknown-horizon' : difference >= 0 ? 'buy' : 'not-yet';
      return finish({ investment: investment, capital: capital, reserve: reserve, affordable: shortfall === 0, shortfall: shortfall, baselineHourly: baseline, extraHourly: extra, costHourly: costHourly, marginalHourly: marginal, hours: hours, withoutCash: withoutCash, withCash: withCash, difference: difference, breakEvenHours: breakEven, thresholds: thresholds, verdict: verdict }, compareShapeInvest);
    } catch (error) { return fail(compareShapeInvest, error.message); }
  }

  // ---------------------------------------------------------------------------
  // Courbe d'un business plan : l'argent au fil du temps de jeu, avec les
  // paliers d'achat (l'argent baisse au moment du paiement, jamais avant).
  var curveShape = { points: [] };
  function planCurve(input) {
    try {
      var p = data(input);
      var plan = p.plan, result = p.result;
      if (!plan || typeof plan !== 'object' || !result || !result.valid || !Array.isArray(result.steps)) return fail(curveShape, 'You need a valid plan to draw the curve.');
      var capital = money(plan.capital, 'the money you have'), hourly = Math.max(0, result.effectiveHourly === undefined ? money(plan.hourly, 'what you earn per hour') : result.effectiveHourly);
      var points = [{ hours: 0, cash: capital, label: 'Start' }];
      var cash = capital, rate = hourly, time = 0;
      result.steps.forEach(function (st) {
        var amount = st.kind === 'goal' && st.name.indexOf('Reach ') === 0;
        if (st.waitHours > 0) { time = st.atHours; cash = amount ? st.capitalAfter : cash + rate * st.waitHours; points.push({ hours: time, cash: cash, label: 'Before “' + st.name + '”' }); }
        if (!amount) { cash = st.capitalAfter; points.push({ hours: st.atHours, cash: cash, label: st.name, purchase: true }); }
        rate = st.hourlyAfter === null || st.hourlyAfter === undefined ? rate : st.hourlyAfter;
      });
      if (points.length === 1 && result.totalHours > 0) points.push({ hours: result.totalHours, cash: capital + hourly * result.totalHours, label: 'End' });
      return finish({ points: points }, curveShape);
    } catch (error) { return fail(curveShape, error.message); }
  }
  var cashShape = { cash: null };
  function planCashAt(input) {
    try {
      var p = data(input);
      var points = p.points, hours = number(p.hours, 'the play time', MINUTES_MAX / 60);
      if (!Array.isArray(points) || !points.length) return fail(cashShape, 'No curve to read.');
      var i = -1;
      for (var k = 0; k < points.length; k += 1) if (points[k].hours <= hours || equal(points[k].hours, hours)) i = k;
      if (i < 0) return finish({ cash: points[0].cash }, cashShape);
      // Plusieurs points au même instant (attente puis paiement) : on prend le dernier, l'achat est fait.
      var at = points[i];
      if (equal(at.hours, hours) || i === points.length - 1) return finish({ cash: at.cash }, cashShape);
      var next = points[i + 1];
      if (next.hours === at.hours) return finish({ cash: next.cash }, cashShape);
      return finish({ cash: at.cash + (next.cash - at.cash) * (hours - at.hours) / (next.hours - at.hours) }, cashShape);
    } catch (error) { return fail(cashShape, error.message); }
  }

  // ---------------------------------------------------------------------------
  // Stratégies d'un business plan : plusieurs enchaînements possibles pour le
  // même but, comparés sur le délai, l'argent à la fin et la réserve gardée.
  // On explore un petit ensemble d'ordres raisonnables : ce n'est pas une preuve
  // d'optimum, et on le dit.
  function planStrategies(input) {
    var shape = { candidates: [], recommended: null, priority: 'balanced', explored: 0 };
    try {
      var p = data(input);
      var priority = ['balanced', 'fast', 'safe'].indexOf(p.priority) >= 0 ? p.priority : 'balanced';
      var prerequisites = Array.isArray(p.prerequisites) ? p.prerequisites : [];
      var reserve = money(p.reserve, 'the money set aside', 0);
      var candidates = [];
      function candidate(id, label, changes, note) {
        var alt = Object.assign({}, p, changes, { variants: false });
        var r = businessPlan(alt);
        candidates.push({ id: id, label: label, note: note || null, valid: r.valid, reason: r.valid ? null : r.reason, totalHours: r.valid ? r.totalHours : null, days: r.valid ? r.days : null, sessions: r.valid ? r.sessions : null, finalCapital: r.valid ? r.finalCapital : null, reserveKept: (alt.reserve || 0) >= reserve, reserve: alt.reserve || 0, prerequisites: (alt.prerequisites || []).map(function (x) { return x.name; }), input: alt });
      }
      candidate('asIs', prerequisites.length ? 'In the order you gave' : 'Straight to your goal', {});
      if (prerequisites.length > 1) {
        var byPayback = prerequisites.slice().sort(function (a, b) {
          var ra = a.boostHourly > 0 ? a.price / a.boostHourly : Infinity, rb = b.boostHourly > 0 ? b.price / b.boostHourly : Infinity;
          return ra - rb || prerequisites.indexOf(a) - prerequisites.indexOf(b);
        });
        if (byPayback.some(function (x, i) { return x !== prerequisites[i]; })) candidate('byPayback', 'What pays off fastest first', { prerequisites: byPayback }, 'The purchases paid back the fastest go first; the others keep their order.');
        var cheapFirst = prerequisites.slice().sort(function (a, b) { return a.price - b.price || prerequisites.indexOf(a) - prerequisites.indexOf(b); });
        if (cheapFirst.some(function (x, i) { return x !== prerequisites[i]; }) && cheapFirst.some(function (x, i) { return x !== byPayback[i]; })) candidate('cheapFirst', 'Cheapest first', { prerequisites: cheapFirst }, 'You start with what costs the least: less waiting at the start.');
      }
      if (prerequisites.some(function (x) { return !(x.boostHourly > 0); }) && prerequisites.some(function (x) { return x.boostHourly > 0; })) candidate('skipNoBoost', 'Only the purchases that earn money', { prerequisites: prerequisites.filter(function (x) { return x.boostHourly > 0; }) }, 'Only pick this if you can skip the other purchases before your goal.');
      if (prerequisites.length) candidate('direct', 'Straight to your goal, no purchases before', { prerequisites: [] }, 'Only if none of these purchases is essential for your goal.');
      if (reserve > 0) candidate('useReserve', 'Using the money set aside', { reserve: 0 }, 'Faster, but no safety net: all your money goes into the plan.');
      var valid = candidates.filter(function (c) { return c.valid; });
      var listed = candidates.map(function (c) { var out = Object.assign({}, c); delete out.input; return out; });
      if (!valid.length) return fail(Object.assign({}, shape, { candidates: listed }), candidates[0] && candidates[0].reason || 'No purchase order can be calculated.');
      // Les stratégies qui retirent un achat demandé ou vident la réserve sont des alternatives : elles ne sont recommandées qu'en priorité « vite ».
      var honest = valid.filter(function (c) { return c.id !== 'skipNoBoost' && c.id !== 'direct'; });
      var pool = priority === 'fast' ? honest : honest.filter(function (c) { return c.reserveKept; });
      if (!pool.length) pool = honest.length ? honest : valid;
      var best = pool.slice().sort(function (a, b) { return a.totalHours - b.totalHours || b.finalCapital - a.finalCapital; })[0];
      return finish({ candidates: listed, recommended: best.id, priority: priority, explored: candidates.length, recommendedInput: best.input }, shape);
    } catch (error) { return fail(shape, error.message); }
  }

  // ---------------------------------------------------------------------------
  // Échéance : combien de temps par jour (ou quel gain par heure) il faudrait
  // pour finir le plan avant N jours. Une échéance impossible est dite telle
  // quelle, avec le premier chiffre qui la rendrait possible.
  function planDeadline(input, deadlineDays) {
    var shape = { deadlineDays: null, sessionsAvailable: null, hoursAvailable: null, feasible: null, requiredDailyMinutes: null, requiredHourly: null, spareHours: null };
    try {
      var p = data(input);
      var days = number(deadlineDays, 'the deadline in days', 36500, { positive: true, integer: true });
      var daysPerWeek = number(p.daysPerWeek, 'the days per week', 7, { defaultValue: 7, integer: true, positive: true });
      var dailyMinutes = number(p.dailyMinutes, 'the play time per day', 1440, { positive: true });
      var base = businessPlan(Object.assign({}, p, { variants: false }));
      if (!base.valid) return fail(shape, base.reason);
      var sessions = Math.floor(days / 7) * daysPerWeek + Math.min(days % 7, daysPerWeek);
      var hoursAvailable = sessions * dailyMinutes / 60;
      var feasible = base.totalHours <= hoursAvailable || equal(base.totalHours, hoursAvailable);
      var requiredDaily = sessions === 0 ? null : Math.min(1440, ceil(base.totalHours * 60 / sessions));
      // Gain par heure nécessaire avec le rythme actuel : recherche par dichotomie sur le facteur (les achats changent le gain en cours de route).
      var requiredHourly = null;
      if (!feasible && sessions > 0) {
        var lo = 1, hi = 1;
        for (var k = 0; k < 40 && hi < 1e6; k += 1) { var test = businessPlan(Object.assign({}, p, { hourly: p.hourly * hi, variants: false })); if (test.valid && test.totalHours <= hoursAvailable) break; lo = hi; hi *= 2; }
        if (hi < 1e6) { for (var j = 0; j < 30; j += 1) { var mid = (lo + hi) / 2, t = businessPlan(Object.assign({}, p, { hourly: p.hourly * mid, variants: false })); if (t.valid && t.totalHours <= hoursAvailable) hi = mid; else lo = mid; } requiredHourly = p.hourly * hi; }
      }
      return finish({ deadlineDays: days, sessionsAvailable: sessions, hoursAvailable: hoursAvailable, feasible: feasible, requiredDailyMinutes: feasible ? dailyMinutes : requiredDaily, requiredDailyPossible: requiredDaily !== null && requiredDaily <= 1440, requiredHourly: feasible ? p.hourly : requiredHourly, spareHours: feasible ? hoursAvailable - base.totalHours : null, totalHours: base.totalHours }, shape);
    } catch (error) { return fail(shape, error.message); }
  }

  // ---------------------------------------------------------------------------
  // Programme de la prochaine partie : ce que rapporte la prochaine session et
  // ce qu'elle débloque dans le plan. Une activité entière ou rien ; en gain
  // continu, une estimation proportionnelle au temps.
  function nextSession(input) {
    var shape = { minutes: null, gain: null, capitalAfter: null, runs: null, mode: null, reached: [], progressBefore: null, progressAfter: null };
    try {
      var p = data(input);
      var minutes = number(p.minutes, 'the duration of the next session', 1440, { positive: true });
      var capital = money(p.capital, 'the money you have');
      var reserve = money(p.reserve, 'the money set aside', 0);
      var upkeep = money(p.upkeepPerSession, 'the expenses per session', 0);
      var gain, runs = null, mode = 'continuous', detail = null;
      if (p.activity) {
        var r = inverse({ minutes: minutes, capital: capital, reserve: reserve, activity: p.activity });
        if (!r.valid) return fail(shape, r.reason);
        gain = r.profit; runs = r.runs; mode = 'activity'; detail = { activeMinutes: r.totalMinutes, name: p.activity.name || null };
      } else {
        var hourly = money(p.hourly, 'what you earn per hour');
        gain = hourly * minutes / 60;
      }
      gain = subtract(gain, upkeep);
      var after = capital + gain;
      var goalTotal = p.goalTotal == null ? null : money(p.goalTotal, 'the total amount of the goal');
      var steps = Array.isArray(p.steps) ? p.steps : [];
      var reached = steps.filter(function (st) { return st.atHours <= minutes / 60 + 1e-9 && st.atHours > 0; }).map(function (st) { return st.name; });
      var progress = function (cash) { return goalTotal === null || goalTotal <= 0 ? null : Math.max(0, Math.min(100, subtract(cash, reserve) / goalTotal * 100)); };
      return finish({ minutes: minutes, gain: gain, capitalAfter: after, runs: runs, mode: mode, detail: detail, reached: reached, progressBefore: progress(capital), progressAfter: progress(after) }, shape);
    } catch (error) { return fail(shape, error.message); }
  }


  // ---------------------------------------------------------------------------
  // Programme mission par mission : partie après partie, on choisit les missions
  // qui rapportent le plus dans le temps de la partie (même recherche bornée que
  // Mon temps de jeu), on paie les achats d'avant dès qu'on peut (dans l'ordre
  // donné), ce qui peut débloquer d'autres missions, jusqu'au but. Le but peut
  // être un prix, une somme, ou des points (XP, rang, réputation…) à atteindre,
  // éventuellement les deux (débloquer ET payer). Sans mission, un gain continu
  // par heure (« hourly ») joue le même rôle. Trésorerie respectée partie après
  // partie ; jamais d'argent gagné avant sa partie ; un achat ne se paie pas avec
  // ce qu'il rapportera.
  var MISSION_MAX_SESSIONS = 400;
  var FLOW_MAX_STEPS = 20000;
  var missionShape = { sessions: [], totalSessions: null, totalMinutes: null, activeMinutes: null, days: null, weeks: null, phases: [], purchases: [], reached: null, finalCash: null, finalUnits: null, missing: null, missingUnits: null, averagePerSession: null, goalMoney: null, startCash: null, startUnits: null, limited: false, note: null, route: [], events: [], lowPoint: null, earned: null, conserved: null, continuous: false, goalMeaning: null, onceDone: [] };
  // v7.49 : un achat d’avant peut demander du temps pour l’obtenir (minutes), d’autres achats ou des missions faites avant
  // (requires), et coûter à chaque partie une fois possédé (usagePerSession). Une mission peut être une mission de
  // déblocage faite une seule fois (once), déjà faite (done), et demander d’autres missions faites avant (requiresMissions).
  // Le but « avoir une somme » dit ce qu’il vise : argent disponible après l’argent gardé de côté (« available », comme
  // avant), argent détenu en tout (« held », la réserve comprise mais jamais entamée) ou gains cumulés (« cumulative »).
  function missionPrep(p) {
    var capital = money(p.capital, 'the money you have');
    var reserve = money(p.reserve, 'the money set aside', 0);
    if (reserve > capital) throw new Error('The money set aside is more than what you have.');
    var continuous = p.sessionMinutes === null || p.sessionMinutes === undefined;
    var sessionMinutes = continuous ? null : number(p.sessionMinutes, 'the duration of a session', 1440, { positive: true });
    var daysPerWeek = number(p.daysPerWeek, 'the days per week', 7, { defaultValue: 7, integer: true, positive: true });
    var upkeep = money(p.upkeepPerSession, 'the expenses per session', 0);
    var hourly = money(p.hourly, 'what you earn per hour', 0);
    var unitsHourly = number(p.unitsHourly, 'the points per hour', MONEY_MAX, { defaultValue: 0 });
    var maxRepeat = number(p.maxRepeat, 'the number of times in a row', SESSION_MAX_RUNS, { defaultValue: SESSION_MAX_RUNS, positive: true, integer: true });
    var goalPrice = p.goalPrice == null ? null : money(p.goalPrice, 'the price of the goal');
    var goalTarget = p.target == null ? null : money(p.target, 'the target amount');
    var goalUnits = p.targetUnits == null ? null : number(p.targetUnits, 'the points to reach', MONEY_MAX);
    var units = number(p.currentUnits, 'your current points', MONEY_MAX, { defaultValue: 0 });
    var meaning = ['held', 'available', 'cumulative'].indexOf(p.goalMeaning) >= 0 ? p.goalMeaning : 'available';
    if (goalPrice === null && goalTarget === null && goalUnits === null) throw new Error('Tell me your goal: a purchase with its price, an amount to have, or points to reach.');
    var list = Array.isArray(p.activities) ? p.activities : [];
    if (list.length > 12) throw new Error('Choose twelve missions at most.');
    if (!list.length && !(hourly > 0) && !(unitsHourly > 0)) throw new Error('Tell me how you earn your money: choose at least one mission, or enter what you earn per hour.');
    var acts = list.map(function (entry, index) {
      var r = activity(entry);
      if (!r.valid) throw new Error('Mission ' + (index + 1) + (entry && typeof entry.name === 'string' && entry.name.trim() ? ' (' + entry.name.trim().slice(0, 40) + ')' : '') + ': ' + r.reason);
      return { id: typeof entry.id === 'string' ? entry.id : String(index), name: typeof entry.name === 'string' && entry.name.trim() ? entry.name.trim().slice(0, 120) : 'Mission ' + (index + 1), entry: entry, res: r, requires: Array.isArray(entry.requiresPurchaseIds) ? entry.requiresPurchaseIds : [], requiresMissions: Array.isArray(entry.requiresMissions) ? entry.requiresMissions : [], once: entry.once === true, done: entry.done === true, paid: entry.owned === true || !(entry.investment > 0) };
    });
    var purchases = (Array.isArray(p.purchases) ? p.purchases : []).map(function (x, i) { x = data(x); var nm = typeof x.name === 'string' && x.name.trim() ? x.name.trim().slice(0, 120) : 'Purchase ' + (i + 1); return { id: typeof x.id === 'string' ? x.id : 'achat-' + i, name: nm, price: money(x.price, 'the price of the purchase “' + nm.slice(0, 40) + '”'), boostHourly: money(x.boostHourly, 'the earnings from purchase ' + (i + 1), 0), minutes: number(x.minutes, 'the time to get “' + nm.slice(0, 40) + '”', MINUTES_MAX, { defaultValue: 0 }), usage: money(x.usagePerSession, 'what “' + nm.slice(0, 40) + '” costs per session', 0), requires: Array.isArray(x.requires) ? x.requires.filter(function (id) { return typeof id === 'string'; }) : [], owned: x.owned === true, at: null, atMinute: null, before: false }; });
    if (purchases.length > 20) throw new Error('Twenty purchases at most before the goal.');
    if (continuous && (upkeep > 0 || purchases.some(function (x) { return x.usage > 0; }))) throw new Error('“Per session” expenses need the duration of a session: enter it, or set these expenses to 0.');
    if (goalUnits !== null && units < goalUnits - 1e-9 && !(unitsHourly > 0) && !acts.some(function (a) { return a.res.units > 0; })) throw new Error('None of your missions give points: enter the points earned per mission (or per hour), otherwise the goal can’t be reached.');
    return { capital: capital, reserve: reserve, continuous: continuous, sessionMinutes: sessionMinutes, daysPerWeek: daysPerWeek, upkeep: upkeep, hourly: hourly, unitsHourly: unitsHourly, maxRepeat: maxRepeat, goalPrice: goalPrice, goalTarget: goalTarget, goalUnits: goalUnits, units: units, meaning: meaning, acts: acts, purchases: purchases, names: knownNames(p, purchases) };
  }
  function missionPlan(input) {
    try {
      var p = data(input), c = missionPrep(p);
      if (!c.continuous) return missionSessions(c);
      /* v7.54 : en parcours (sans durée de partie), le programme avec toutes les missions est comparé à ceux qui en laissent de
         côté (les k missions les plus rentables par minute, k = 1…n, et chaque mission seule) : le plus court qui atteint le but
         gagne. Une mission qui ralentit l’ensemble n’est plus imposée en silence ; la note dit lesquelles sont laissées de côté. */
      var full = missionFlow(c), acts = (p.activities || []).filter(function (a) { return a && !a.once; });
      if (acts.length < 2) return full;
      var rateOf = function (a) { var e = c.acts.filter(function (x) { return x.id === a.id; })[0]; return e && e.res && e.res.cycleMinutes > 0 ? e.res.net / e.res.cycleMinutes : -Infinity; };
      var byRate = acts.slice().sort(function (a, b) { return rateOf(b) - rateOf(a); }), subsets = [], seen = {};
      if (acts.length <= 4) { for (var mask = 1; mask < (1 << acts.length) - 1; mask++) subsets.push(acts.filter(function (a, i) { return mask & (1 << i); })); }
      else { for (var k = 1; k < byRate.length; k++) subsets.push(byRate.slice(0, k)); byRate.forEach(function (a) { subsets.push([a]); }); }
      var best = full, bestKeep = null, better = function (r) { return r.valid && r.reached && (!best.valid || !best.reached || r.totalMinutes < best.totalMinutes - 1e-9 || (Math.abs(r.totalMinutes - best.totalMinutes) < 1e-9 && r.finalCash > best.finalCash)); };
      subsets.forEach(function (keep) {
        var key = keep.map(function (a) { return a.id; }).sort().join('|'); if (seen[key]) return; seen[key] = true;
        var ids = {}; keep.forEach(function (a) { ids[a.id] = true; });
        var sub = (p.activities || []).filter(function (a) { return a.once || ids[a.id]; });
        var r; try { r = missionFlow(missionPrep(Object.assign({}, p, { activities: sub }))); } catch (e) { return; }
        if (better(r)) { best = r; bestKeep = keep; }
      });
      if (bestKeep) {
        var left = acts.filter(function (a) { return bestKeep.indexOf(a) < 0; }).map(function (a) { return '“' + a.name + '”'; });
        best = Object.assign({}, best, { method: 'flow-subset', leftOut: left, note: (best.note ? best.note + ' ' : '') + 'Fastest path leaving out ' + left.join(', ') + ': ' + (left.length > 1 ? 'they slowed down' : 'it slowed down') + ' the whole run' + (full.valid && full.reached ? ' (' + Math.round(full.totalMinutes) + ' min with all your missions)' : '') + '.' });
      }
      return best;
    } catch (error) { return fail(missionShape, error.message); }
  }
  // Commun aux deux modes : état, but, achats, grand livre.
  function missionState(c) {
    var st = { cash: c.capital, units: c.units, earned: 0, boost: 0, upkeepOwned: 0, owned: {}, done: {}, events: [], low: { cash: c.capital, at: 'Start' }, receipts: 0, spends: 0, route: [] };
    c.purchases.forEach(function (x) { if (x.owned) { st.owned[x.id] = true; st.boost += x.boostHourly; st.upkeepOwned += x.usage; } });
    c.acts.forEach(function (a) { if (a.done) st.done[a.id] = true; });
    return st;
  }
  function goalMoneyOf(c) { return (c.goalPrice !== null ? c.goalPrice : 0) + (c.goalTarget !== null ? c.goalTarget : 0); }
  function reachedOf(c, st) {
    if (c.goalUnits !== null && st.units < c.goalUnits - 1e-9) return false;
    var need = goalMoneyOf(c);
    if (c.goalTarget !== null && c.goalPrice === null) {
      if (c.meaning === 'held') return st.cash >= need - 1e-9;
      if (c.meaning === 'cumulative') return st.earned >= need - 1e-9;
    }
    return subtract(st.cash, c.reserve) >= need - 1e-9;
  }
  function ledgerAdd(st, t, type, amount, label) {
    if (!(amount > 0)) return;
    if (type === 'spend') { st.cash = subtract(st.cash, amount); st.spends += amount; if (st.cash < st.low.cash - 1e-9) st.low = { cash: st.cash, at: label, t: t }; }
    else { st.cash += amount; st.receipts += amount; }
    if (st.events.length < 600) st.events.push({ t: t, type: type, amount: amount, label: label, cash: st.cash });
  }
  function satisfied(ids, st) { return ids.every(function (id) { return st.owned[id] || st.done[id]; }); }
  // Achats d’avant dans l’ordre donné (la stratégie) : on paie dès que possible, sans jamais descendre sous la réserve ;
  // un achat dont les prérequis ne sont pas faits attend, et ceux d’après aussi (l’ordre est respecté).
  function buyPurchases(c, st, t, session, where, advance) {
    var bought = [], cursor = t;
    for (var k = 0; k < c.purchases.length; k += 1) {
      var x = c.purchases[k]; if (x.owned) continue;
      if (!satisfied(x.requires, st)) break;
      if (subtract(st.cash, c.reserve) < x.price - 1e-9) break;
      ledgerAdd(st, cursor, 'spend', x.price, 'Purchase “' + x.name + '”');
      x.owned = true; x.at = session; x.atMinute = cursor; x.before = where === 'before'; st.owned[x.id] = true; st.boost += x.boostHourly; st.upkeepOwned += x.usage;
      bought.push(x);
      st.route.push({ type: 'acquire', id: x.id, name: x.name, session: session, start: cursor, minutes: x.minutes, spend: x.price, receive: 0, cashAfter: st.cash, requires: x.requires.slice(), where: where });
      if (advance) cursor += x.minutes;
    }
    return bought;
  }
  function runOnce(c, st, a, t, session) {
    var invest = a.paid ? 0 : a.entry.investment || 0, cost = (a.entry.cost || 0) + invest;
    ledgerAdd(st, t, 'spend', cost, 'Fees for “' + a.name + '”');
    var end = t + a.res.activeMinutes, reward = (a.entry.reward || 0) * (a.entry.share === undefined ? 100 : a.entry.share) / 100;
    ledgerAdd(st, end, 'receive', reward, 'Reward for “' + a.name + '”');
    st.earned += reward - cost + invest; a.paid = true; st.done[a.id] = true; st.units += a.res.units > 0 ? a.res.units : 0;
    st.route.push({ type: 'unlock', id: a.id, name: a.name, session: session, start: t, minutes: a.res.activeMinutes, spend: cost, receive: reward, cashAfter: st.cash, requires: a.requires.concat(a.requiresMissions) });
    return end;
  }
  function onceReady(c, st, a) { return a.once && !st.done[a.id] && satisfied(a.requires, st) && satisfied(a.requiresMissions, st); }
  function affordableStart(c, st, a) { var invest = a.paid ? 0 : a.entry.investment || 0; return subtract(st.cash, c.reserve) >= (a.entry.cost || 0) + invest - 1e-9; }
  // « un achat (Garage) », « la mission (Déblocage) » : ce qui manque, dit avec les noms.
  // Noms des achats, même retirés d’un plan de secours (« Sans les achats d’avant ») : un message ne montre jamais un identifiant.
  function knownNames(p, purchases) { var names = {}; purchases.forEach(function (x) { names[x.id] = x.name; }); var k = p.knownNames && typeof p.knownNames === 'object' ? p.knownNames : {}; Object.keys(k).forEach(function (id) { if (typeof k[id] === 'string' && !names[id]) names[id] = k[id].slice(0, 120); }); return names; }
  function lockedReason(c, st, a) {
    var need = (a.requires || []).filter(function (id) { return !st.owned[id] && !st.done[id]; }).map(function (id) { var x = c.purchases.filter(function (y) { return y.id === id; })[0]; var m = c.acts.filter(function (y) { return y.id === id; })[0]; return x ? { k: 'p', n: x.name } : m ? { k: 'm', n: m.name } : { k: 'p', n: (c.names && c.names[id]) || id }; });
    (a.requiresMissions || []).filter(function (id) { return !st.done[id]; }).forEach(function (id) { var x = c.acts.filter(function (y) { return y.id === id; })[0]; need.push({ k: 'm', n: x ? x.name : (c.names && c.names[id]) || id }); });
    var ps = need.filter(function (x) { return x.k === 'p'; }).map(function (x) { return x.n; }), ms = need.filter(function (x) { return x.k === 'm'; }).map(function (x) { return x.n; });
    return [(ps.length ? (ps.length > 1 ? 'purchases (' : 'a purchase (') + ps.join(', ') + ')' : '') + (ps.length && ms.length ? ' and ' : '') + (ms.length ? (ms.length > 1 ? 'the missions (' : 'the mission (') + ms.join(', ') + ')' : '')];
  }
  function missionResult(c, st, sessions, extra) {
    var ok = reachedOf(c, st), total = sessions.length;
    var weeks = total === 0 ? 0 : Math.floor((total - 1) / c.daysPerWeek);
    var days = c.continuous ? null : total === 0 ? 0 : weeks * 7 + ((total - 1) % c.daysPerWeek) + 1;
    var phases = [];
    sessions.forEach(function (se) {
      var key = se.steps.map(function (s2) { return s2.id + '×' + s2.runs; }).join('|') + '#' + Math.round(se.gain);
      var last = phases[phases.length - 1];
      if (last && last.key === key && !last.purchasesAfter.length && !(se.purchasesBefore || []).length && !(se.onceSteps || []).length) { last.to = se.index; last.count += 1; last.cashAfter = se.cashAfter; last.unitsAfter = se.unitsAfter; last.purchasesAfter = se.purchasesAfterOnly.slice(); }
      else phases.push({ key: key, from: se.index, to: se.index, count: 1, steps: se.steps, gain: se.gain, unitsGain: se.unitsGain, cashBefore: se.cashBefore, cashAfter: se.cashAfter, unitsAfter: se.unitsAfter, purchasesAfter: se.purchasesAfterOnly.slice(), purchasesBefore: (se.purchasesBefore || []).slice(), onceSteps: (se.onceSteps || []).slice() });
    });
    var missing = Math.max(0, subtract(goalMoneyOf(c) + (c.meaning === 'held' && c.goalPrice === null ? 0 : c.reserve), c.meaning === 'cumulative' && c.goalPrice === null ? st.earned + c.reserve : st.cash));
    var conserved = Math.abs(c.capital + st.receipts - st.spends - st.cash) <= 1e-6 * Math.max(1, Math.abs(st.cash));
    return finish({ sessions: sessions, totalSessions: c.continuous ? null : total, totalMinutes: extra.totalMinutes, activeMinutes: extra.activeMinutes, days: days, weeks: c.continuous ? null : total === 0 ? 0 : ceil(total / c.daysPerWeek),
      phases: phases.map(function (ph) { return { from: ph.from, to: ph.to, count: ph.count, steps: ph.steps, gain: ph.gain, unitsGain: ph.unitsGain, cashBefore: ph.cashBefore, cashAfter: ph.cashAfter, unitsAfter: ph.unitsAfter, purchasesAfter: ph.purchasesAfter, purchasesBefore: ph.purchasesBefore, onceSteps: ph.onceSteps }; }),
      purchases: c.purchases.map(function (x) { return { id: x.id, name: x.name, price: x.price, boostHourly: x.boostHourly, minutes: x.minutes, usagePerSession: x.usage, atSession: x.at, atMinute: x.atMinute, before: x.before, owned: x.owned }; }),
      reached: ok, finalCash: st.cash, finalUnits: st.units, missing: ok ? 0 : missing, missingUnits: c.goalUnits === null ? 0 : Math.max(0, c.goalUnits - st.units), averagePerSession: c.continuous ? null : total ? subtract(st.cash, c.capital) / total : null, goalMoney: goalMoneyOf(c), startCash: c.capital, startUnits: c.units, limited: extra.limited || !ok,
      note: ok ? (extra.limited ? extra.limitNote : null) : extra.failNote,
      route: st.route, events: st.events, lowPoint: { cash: st.low.cash, at: st.low.at, t: st.low.t === undefined ? null : st.low.t }, earned: st.earned, conserved: conserved, continuous: c.continuous, goalMeaning: c.meaning, onceDone: Object.keys(st.done), method: extra.method }, missionShape);
  }
  // Mode « parties » (comme avant) : partie après partie ; achats au début de la partie 1 si possible, puis entre deux
  // parties ; le temps d’obtention d’un achat se prend au début de la partie suivante ; missions de déblocage d’abord.
  function missionSessions(c) {
    var st = missionState(c), sessions = [], totalActive = 0, limited = false, carry = 0;
    var first = buyPurchases(c, st, 0, 1, 'before');
    first.forEach(function (x) { carry += x.minutes; });
    for (var n = 1; n <= MISSION_MAX_SESSIONS && !reachedOf(c, st); n += 1) {
      var cashBefore = st.cash, unitsBefore = st.units, t = Math.min(c.sessionMinutes, carry), onceSteps = [], before = n === 1 ? first.map(function (x) { return x.name; }) : [], acquiring = t > 0;
      carry -= t;
      // Missions de déblocage prêtes : une seule fois chacune, si elles tiennent dans la partie et se paient.
      for (var guard = 0; guard < c.acts.length; guard += 1) {
        var once = c.acts.filter(function (a) { return onceReady(c, st, a) && t + a.res.activeMinutes <= c.sessionMinutes + 1e-9 && affordableStart(c, st, a); })[0];
        if (!once) break;
        t = runOnce(c, st, once, t, n); onceSteps.push({ id: once.id, name: once.name });
        totalActive += once.res.activeMinutes;
      }
      var available = c.acts.filter(function (a) { return !a.once && satisfied(a.requires, st) && satisfied(a.requiresMissions, st); });
      var entries = available.map(function (a) { return Object.assign({}, a.entry, { id: a.id, name: a.name, investment: a.paid ? 0 : a.entry.investment }); });
      var session = null, unitsGain = 0, used = [], remaining = subtract(c.sessionMinutes, t);
      var needUnits = c.goalUnits !== null && st.units < c.goalUnits - 1e-9;
      if (entries.length && remaining > 0) {
        if (needUnits && available.some(function (a) { return a.res.units > 0; })) {
          var best = null;
          available.forEach(function (a) {
            if (!(a.res.units > 0)) return;
            var r = inverse({ minutes: remaining, capital: st.cash, reserve: c.reserve, activity: Object.assign({}, a.entry, { investment: a.paid ? 0 : a.entry.investment }) });
            if (!r.valid || !r.runs) return;
            var gained = r.runs * a.res.units;
            if (!best || gained > best.units || (gained === best.units && r.profit > best.profit)) best = { a: a, r: r, units: gained, profit: r.profit };
          });
          if (best) { session = { profit: best.profit, investment: best.a.paid ? 0 : best.a.entry.investment, runs: best.r.runs, activeMinutes: best.r.totalMinutes, breakdown: [{ id: best.a.id, name: best.a.name, runs: best.r.runs, net: best.r.runs * best.a.res.net }], timeline: null, single: best }; unitsGain = best.units; used = [best.a]; }
        }
        if (!session) {
          var sp = sessionPlan({ capital: st.cash, reserve: c.reserve, minutes: remaining, maxRepeat: c.maxRepeat, activities: entries });
          if (sp.valid && sp.runs) { session = sp; used = available.filter(function (a) { return sp.breakdown.some(function (b) { return b.id === a.id && b.runs; }); }); if (sp.limited) limited = true; unitsGain = sp.breakdown.reduce(function (sum, b) { var a = available.filter(function (x) { return x.id === b.id; })[0]; return sum + (a && a.res.units > 0 ? a.res.units * b.runs : 0); }, 0); }
        }
      }
      var passive = (st.boost + c.hourly) * c.sessionMinutes / 60;
      var passiveUnits = c.unitsHourly * c.sessionMinutes / 60;
      var upkeepNow = c.upkeep + st.upkeepOwned;
      var sessionGain = session ? session.profit : 0;
      // Une partie prise par l’obtention d’un achat avance le parcours, même sans gain.
      var progress = sessionGain + passive - upkeepNow > 1e-9 || onceSteps.length > 0 || acquiring || (needUnits && (unitsGain > 0 || passiveUnits > 0));
      if (!progress) {
        var locked = c.acts.filter(function (a) { return !a.once && available.indexOf(a) < 0; }), pendingOnce = c.acts.filter(function (a) { return a.once && !st.done[a.id]; });
        var why = n !== 1 ? 'In session ' + n + ', no mission fits or earns anything anymore: check your missions and your purchases.'
          : needUnits && !(unitsGain > 0 || passiveUnits > 0) && sessionGain + passive - upkeepNow > 1e-9 ? 'None of your missions give points: enter the points earned per mission (or per hour).'
          : !available.length && locked.length ? 'No mission is possible at the start: “' + locked[0].name + '” first needs ' + lockedReason(c, st, locked[0]).join(', ') + '. Add a mission you can do right away, or check “I already have it” on what you need.'
          : pendingOnce.length && !available.length ? 'The unlock mission “' + pendingOnce[0].name + '” can’t be done: ' + (lockedReason(c, st, pendingOnce[0]).length ? 'you first need ' + lockedReason(c, st, pendingOnce[0]).join(', ') + '.' : 'it doesn’t fit in a session or its fees are more than your available money.')
          : available.length && available.every(function (a) { return !affordableStart(c, st, a); }) ? '“' + available[0].name + '” needs ' + dollars(((available[0].entry.cost || 0) + (available[0].paid ? 0 : available[0].entry.investment || 0)).toLocaleString('en-US'), ' ') + ' before starting, and all you have left is ' + dollars(Math.max(0, subtract(st.cash, c.reserve)).toLocaleString('en-US'), ' ') + ' utilisables' + (st.route.some(function (r) { return r.type === 'acquire'; }) ? ' after your earlier purchases' : '') + ' — lower the money set aside or add a mission that’s cheaper to start.'
          : 'No mission fits in a session with what you have: add time, choose a shorter mission, or check your fees and purchases.';
        return fail(Object.assign({}, missionShape, { sessions: sessions, route: st.route }), why);
      }
      // Grand livre de la partie : frais avant chaque mission, récompense à la fin ; revenus « par heure » et dépenses par partie à la fin.
      if (session && session.timeline) session.timeline.forEach(function (s2) { ledgerAdd(st, s2.start + t, 'spend', s2.cost + s2.investment, 'Fees for “' + s2.name + '” (session ' + n + ')'); ledgerAdd(st, s2.end + t, 'receive', s2.reward, 'Reward for “' + s2.name + '” (session ' + n + ')'); st.earned += s2.reward - s2.cost; });
      else if (session && session.single) {
        var a0 = session.single.a, inv0 = a0.paid ? 0 : a0.entry.investment || 0, rew0 = (a0.entry.reward || 0) * (a0.entry.share === undefined ? 100 : a0.entry.share) / 100, cost0 = a0.entry.cost || 0, t0 = t;
        for (var k0 = 0; k0 < session.runs; k0 += 1) { ledgerAdd(st, t0, 'spend', cost0 + (k0 === 0 ? inv0 : 0), 'Fees for “' + a0.name + '” (session ' + n + ')'); t0 += a0.res.activeMinutes; ledgerAdd(st, t0, 'receive', rew0, 'Reward for “' + a0.name + '” (session ' + n + ')'); st.earned += rew0 - cost0; t0 += a0.res.cycleMinutes - a0.res.activeMinutes; }
      }
      ledgerAdd(st, c.sessionMinutes, 'receive', passive, 'Earnings per hour (session ' + n + ')'); st.earned += passive;
      ledgerAdd(st, c.sessionMinutes, 'spend', upkeepNow, 'Expenses for session ' + n);
      used.forEach(function (a) { a.paid = true; });
      st.units += unitsGain + passiveUnits;
      var active = session ? session.activeMinutes : (c.hourly > 0 || passiveUnits > 0 || st.boost > 0 ? subtract(c.sessionMinutes, t) : 0);
      totalActive += active;
      var boughtAfter = buyPurchases(c, st, c.sessionMinutes, n, 'after');
      boughtAfter.forEach(function (x) { carry += x.minutes; });
      sessions.push({ index: n, steps: session ? session.breakdown.filter(function (b) { return b.runs; }).map(function (b) { return { id: b.id, name: b.name, runs: b.runs, net: b.net }; }) : [], onceSteps: onceSteps, gain: subtract(st.cash + boughtAfter.reduce(function (sum, x) { return sum + x.price; }, 0), cashBefore), passive: passive, upkeep: upkeepNow, cashBefore: cashBefore, cashAfter: st.cash, unitsAfter: st.units, unitsGain: st.units - unitsBefore, purchases: before.concat(boughtAfter.map(function (x) { return x.name; })), purchasesBefore: before, purchasesAfterOnly: boughtAfter.map(function (x) { return x.name; }), activeMinutes: active });
    }
    var ok = reachedOf(c, st);
    return missionResult(c, st, sessions, { totalMinutes: sessions.length * c.sessionMinutes, activeMinutes: totalActive, limited: limited, limitNote: 'Schedule found among the sequences explored for each session; there may be a faster one.', failNote: ok ? null : 'The goal isn’t reached in ' + MISSION_MAX_SESSIONS + ' sessions: lower the goal, make your sessions longer or change missions.', method: 'sessions' });
  }
  // Mode « parcours » (sans durée de partie) : une étape après l’autre, sans calendrier. À chaque étape : acheter ce qui
  // peut l’être (dans l’ordre donné), faire une mission de déblocage prête, sinon la mission répétable qui rapporte le
  // plus par minute parmi celles qui sont possibles maintenant ; on s’arrête dès que le but est atteint. Méthode simple et
  // annoncée : elle ne prétend pas trouver l’optimum.
  function missionFlow(c) {
    var st = missionState(c), t = 0, active = 0, runs = {}, ready = {}, streak = { id: null, n: 0 }, steps = 0, limited = false;
    c.acts.forEach(function (a) { runs[a.id] = 0; ready[a.id] = 0; });
    function acquire() { var b = buyPurchases(c, st, t, 1, 'flow', true); b.forEach(function (x) { t += x.minutes; active += x.minutes; }); return b.length; }
    function accrue(dt, label) { var rate = st.boost + c.hourly; if (rate > 0 && dt > 0) { ledgerAdd(st, t, 'receive', rate * dt / 60, label || 'Earnings per hour'); st.earned += rate * dt / 60; } }
    while (!reachedOf(c, st) && steps < FLOW_MAX_STEPS) {
      steps += 1;
      if (acquire()) continue;
      var once = c.acts.filter(function (a) { return onceReady(c, st, a) && affordableStart(c, st, a); })[0];
      if (once) { t = runOnce(c, st, once, t, 1); active += once.res.activeMinutes; continue; }
      var candidates = c.acts.filter(function (a) { return !a.once && a.res.net > 0 && satisfied(a.requires, st) && satisfied(a.requiresMissions, st) && affordableStart(c, st, a) && !(streak.id === a.id && streak.n >= c.maxRepeat && c.acts.some(function (o) { return o !== a && !o.once && o.res.net > 0 && satisfied(o.requires, st) && satisfied(o.requiresMissions, st); })); });
      if (!candidates.length) {
        var rate = st.boost + c.hourly;
        if (rate > 0 || c.unitsHourly > 0) {
          // Gain continu seulement : on avance jusqu’au prochain achat possible ou jusqu’au but.
          var nextBuy = c.purchases.filter(function (x) { return !x.owned; })[0], needCash = null;
          if (nextBuy && satisfied(nextBuy.requires, st)) needCash = nextBuy.price + c.reserve;
          var goalCash = c.goalPrice !== null || c.goalTarget !== null ? goalMoneyOf(c) + (c.meaning === 'held' && c.goalPrice === null ? 0 : c.reserve) : null;
          var target = [needCash, goalCash].filter(function (x) { return x !== null && x > st.cash; }).sort(function (a, b) { return a - b; })[0];
          var dt = null;
          if (c.meaning === 'cumulative' && c.goalPrice === null && c.goalTarget !== null && rate > 0) dt = Math.max(0, goalMoneyOf(c) - st.earned) * 60 / rate;
          if (target !== undefined && rate > 0) dt = dt === null ? (target - st.cash) * 60 / rate : Math.min(dt, (target - st.cash) * 60 / rate);
          if (c.goalUnits !== null && st.units < c.goalUnits && c.unitsHourly > 0) { var du = (c.goalUnits - st.units) * 60 / c.unitsHourly; dt = dt === null ? du : Math.max(dt, du); }
          if (dt === null || !(dt > 0)) break;
          ledgerAdd(st, t + dt, 'receive', rate * dt / 60, 'Earnings per hour'); st.earned += rate * dt / 60; st.units += c.unitsHourly * dt / 60; t += dt; active += dt;
          continue;
        }
        break;
      }
      // v7.54 : rentabilité par minute, attente comprise (net ÷ (attente avant d’être prête + durée)) ; à égalité l’ordre donné.
      // Avant, une mission prête tout de suite passait devant la meilleure en attente, même si l’attente ne durait que quelques
      // minutes : le parcours pouvait être bien plus lent qu’en se contentant de la meilleure mission (revue v7.53, écart B1).
      var waitOf = function (a) { return Math.max(0, ready[a.id] - t); };
      candidates.sort(function (a, b) { return b.res.net / (waitOf(b) + b.res.activeMinutes) - a.res.net / (waitOf(a) + a.res.activeMinutes) || c.acts.indexOf(a) - c.acts.indexOf(b); });
      var pick = candidates[0];
      if (ready[pick.id] > t) { var wait = ready[pick.id] - t; t = ready[pick.id]; accrue(wait, 'Earnings per hour while waiting'); }
      var invest = pick.paid ? 0 : pick.entry.investment || 0, cost = (pick.entry.cost || 0) + invest;
      ledgerAdd(st, t, 'spend', cost, 'Fees for “' + pick.name + '”');
      var duration = pick.res.activeMinutes - (pick.entry.prepOnce && runs[pick.id] ? pick.entry.prep || 0 : 0), reward = (pick.entry.reward || 0) * (pick.entry.share === undefined ? 100 : pick.entry.share) / 100;
      t += duration; active += duration;
      ledgerAdd(st, t, 'receive', reward, 'Reward for “' + pick.name + '”');
      accrue(duration);
      st.earned += reward - (pick.entry.cost || 0); st.units += pick.res.units > 0 ? pick.res.units : 0; pick.paid = true;
      runs[pick.id] += 1; ready[pick.id] = t + (pick.res.cycleMinutes - pick.res.activeMinutes);
      streak = streak.id === pick.id ? { id: pick.id, n: streak.n + 1 } : { id: pick.id, n: 1 };
      var last = st.route[st.route.length - 1];
      if (last && last.type === 'run' && last.id === pick.id) { last.runs += 1; last.minutes = t - last.start; last.spend += cost; last.receive += reward; last.cashAfter = st.cash; }
      else st.route.push({ type: 'run', id: pick.id, name: pick.name, session: 1, start: t - duration, minutes: duration, runs: 1, spend: cost, receive: reward, cashAfter: st.cash, requires: pick.requires.concat(pick.requiresMissions) });
    }
    if (steps >= FLOW_MAX_STEPS) limited = true;
    var ok = reachedOf(c, st);
    if (!ok && !limited) {
      var locked = c.acts.filter(function (a) { return !satisfied(a.requires, st) || !satisfied(a.requiresMissions, st); });
      /* v7.52 : une mission rentable et débloquée mais trop chère à lancer sans toucher à la réserve : on le dit avec les chiffres. */
      var poor = c.acts.filter(function (a) { return !a.once && a.res.net > 0 && satisfied(a.requires, st) && satisfied(a.requiresMissions, st) && !affordableStart(c, st, a); })[0];
      var nextBuy2 = c.purchases.filter(function (x) { return !x.owned; })[0];
      var why = nextBuy2 && !satisfied(nextBuy2.requires, st) ? 'The purchase “' + nextBuy2.name + '” first needs ' + lockedReason(c, st, { requires: nextBuy2.requires.filter(function (id) { return c.purchases.some(function (y) { return y.id === id; }); }), requiresMissions: nextBuy2.requires.filter(function (id) { return c.acts.some(function (y) { return y.id === id; }); }) }).join(', ') + ', which can’t be done.'
        : nextBuy2 ? 'You’re short ' + dollars(Math.max(0, nextBuy2.price + c.reserve - st.cash).toLocaleString('en-US'), ' ') + ' for “' + nextBuy2.name + '”, and no mission you can do without it earns money: add a mission you can do now (to fund it), or lower the reserve.'
        : locked.length ? '“' + locked[0].name + '” first needs ' + lockedReason(c, st, locked[0]).join(', ') + '.'
        : poor ? '“' + poor.name + '” needs ' + dollars(Math.round((poor.entry.cost || 0) + (poor.paid ? 0 : poor.entry.investment || 0)).toLocaleString('en-US'), ' ') + ' in fees before starting; keeping ' + dollars(Math.round(c.reserve).toLocaleString('en-US'), ' ') + ' set aside, all you have left is ' + dollars(Math.round(Math.max(0, st.cash - c.reserve)).toLocaleString('en-US'), ' ') + '. Lower the reserve or the fees, or add a cheaper mission to get started.'
        : 'No possible mission earns more than its fees with what you have.';
      return fail(Object.assign({}, missionShape, { route: st.route, continuous: true }), why);
    }
    var steps2 = Object.keys(runs).filter(function (id) { return runs[id] > 0; }).map(function (id) { var a = c.acts.filter(function (x) { return x.id === id; })[0]; return { id: id, name: a.name, runs: runs[id], net: runs[id] * a.res.net }; });
    var one = { index: 1, steps: steps2, onceSteps: st.route.filter(function (r) { return r.type === 'unlock'; }).map(function (r) { return { id: r.id, name: r.name }; }), gain: subtract(st.cash, c.capital) + c.purchases.filter(function (x) { return x.at !== null; }).reduce(function (s2, x) { return s2 + x.price; }, 0), passive: 0, upkeep: 0, cashBefore: c.capital, cashAfter: st.cash, unitsAfter: st.units, unitsGain: st.units - c.units, purchases: c.purchases.filter(function (x) { return x.at !== null; }).map(function (x) { return x.name; }), purchasesBefore: [], purchasesAfterOnly: [], activeMinutes: active };
    return missionResult(c, st, t > 0 || steps2.length ? [one] : [], { totalMinutes: t, activeMinutes: active, limited: limited, limitNote: 'Path stopped after ' + FLOW_MAX_STEPS + ' steps.', failNote: limited ? 'The path goes over ' + FLOW_MAX_STEPS + ' steps: lower the goal or choose missions that earn more.' : null, method: 'flow' });
  }

  // Plans A, B, C : le programme complet, puis chaque mission seule, puis sans
  // les achats d'avant, puis les plans supplémentaires demandés (par exemple
  // « au rythme que tu as vraiment eu »). Classés par nombre de parties, sans
  // doublon. Aucun optimum garanti.
  function missionAlternatives(input) {
    var shape = { plans: [], results: {} };
    try {
      var p = data(input);
      var acts = Array.isArray(p.activities) ? p.activities : [];
      var plans = [];
      var allNames = (p.purchases || []).concat(acts).reduce(function (o, x) { if (x && typeof x.id === 'string' && typeof x.name === 'string') o[x.id] = x.name; return o; }, {});
      function add(id, label, changes, note) { var r = missionPlan(Object.assign({}, p, { knownNames: allNames }, changes)); plans.push({ id: id, label: label, note: note || null, valid: r.valid && r.reached, reason: r.valid ? (r.reached ? null : r.note) : r.reason, totalSessions: r.valid && r.reached ? r.totalSessions : null, totalMinutes: r.valid && r.reached ? r.totalMinutes : null, days: r.valid && r.reached ? r.days : null, activeMinutes: r.valid ? r.activeMinutes : null, finalCash: r.valid ? r.finalCash : null, phases: r.valid ? r.phases.slice(0, 6) : [], result: r }); }
      add('all', acts.length > 1 ? 'The best mix of your missions' : (acts.length ? 'Your mission, repeated' : 'Your earnings per hour, session after session'), {}, acts.length > 1 ? 'In each session, the missions that earn the most in the time available.' : null);
      if (!plans[0].result.valid) return fail(shape, plans[0].result.reason);
      if (acts.length > 1) acts.forEach(function (a, i) { add('only-' + (typeof a.id === 'string' ? a.id : i), 'Only “' + (a && a.name ? String(a.name).slice(0, 60) : 'Mission ' + (i + 1)) + '”', { activities: [a] }, 'The same mission, repeated as long as it fits in the session.'); });
      if (Array.isArray(p.purchases) && p.purchases.some(function (x) { return x && !x.owned; })) add('no-purchases', 'Without the earlier purchases', { purchases: (p.purchases || []).filter(function (x) { return x && x.owned; }), knownNames: (p.purchases || []).reduce(function (o, x) { if (x && typeof x.id === 'string' && typeof x.name === 'string') o[x.id] = x.name; return o; }, {}) }, 'Only if you can do without these purchases for your goal.');
      (Array.isArray(p.extraPlans) ? p.extraPlans : []).slice(0, 6).forEach(function (x, i) { if (x && typeof x === 'object') add(typeof x.id === 'string' ? x.id : 'extra-' + i, typeof x.label === 'string' ? x.label : 'Other plan', x.changes && typeof x.changes === 'object' ? x.changes : {}, typeof x.note === 'string' ? x.note : null); });
      var ranked = plans.filter(function (x) { return x.valid; }).sort(function (a, b) { return (a.totalSessions || 0) - (b.totalSessions || 0) || (a.totalMinutes || 0) - (b.totalMinutes || 0) || b.finalCash - a.finalCash; });
      var seen = {}, distinct = [];
      ranked.forEach(function (x) { var key = x.totalSessions + '|' + x.totalMinutes + '|' + x.phases.map(function (ph) { return ph.steps.map(function (st) { return st.id + st.runs; }).join(','); }).join('/'); if (!seen[key]) { seen[key] = true; distinct.push(x); } });
      var failed = plans.filter(function (x) { return !x.valid; });
      var results = {}; plans.forEach(function (x) { results[x.id] = x.result; });
      return finish({ plans: distinct.concat(failed).map(function (x) { var out = Object.assign({}, x); delete out.result; return out; }), results: results }, shape);
    } catch (error) { return fail(shape, error.message); }
  }

  // Échéance d'un programme mission par mission : faisable ou non ; sinon, les
  // leviers vérifiés par recalcul (jouer tous les jours, parties plus longues,
  // gagner plus par heure quand le gain est continu) et la date la plus proche.
  function missionDeadline(input, days) {
    var shape = { feasible: null, days: null, spareDays: null, everydayDays: null, requiredSessionMinutes: null, requiredHourly: null };
    try {
      var d = number(days, 'the deadline in days', 36500, { positive: true, integer: true });
      var base = missionPlan(input);
      if (!base.valid) return fail(shape, base.reason);
      if (!base.reached) return fail(shape, base.note);
      if (base.continuous) return fail(shape, 'A deadline in days needs a calendar: enter the duration of a session and your play days per week.');
      var p = data(input);
      if (base.days <= d) return finish({ feasible: true, days: base.days, spareDays: d - base.days, everydayDays: null, requiredSessionMinutes: null, requiredHourly: null }, shape);
      var every = null, dpw = number(p.daysPerWeek, 'the days per week', 7, { defaultValue: 7, integer: true, positive: true });
      if (dpw < 7) { var e = missionPlan(Object.assign({}, p, { daysPerWeek: 7 })); if (e.valid && e.reached) every = e.days; }
      var minutes = null, cur = number(p.sessionMinutes, 'the duration of a session', 1440, { positive: true });
      for (var m = Math.ceil(cur / 15) * 15 + 15; m <= 1440; m += 15) { var t = missionPlan(Object.assign({}, p, { sessionMinutes: m })); if (t.valid && t.reached && t.days <= d) { minutes = m; break; } }
      var hourly = null;
      if (!(Array.isArray(p.activities) && p.activities.length) && p.hourly > 0) { var lo = p.hourly, hi = p.hourly * 64, ok = missionPlan(Object.assign({}, p, { hourly: hi })); if (ok.valid && ok.reached && ok.days <= d) { for (var i = 0; i < 40; i += 1) { var mid = (lo + hi) / 2, r = missionPlan(Object.assign({}, p, { hourly: mid })); if (r.valid && r.reached && r.days <= d) hi = mid; else lo = mid; } hourly = Math.ceil(hi / 100) * 100; } }
      return finish({ feasible: false, days: base.days, spareDays: base.days - d, everydayDays: every !== null && every <= d ? every : null, requiredSessionMinutes: minutes, requiredHourly: hourly }, shape);
    } catch (error) { return fail(shape, error.message); }
  }

  // Courbe de l'argent du programme : un point par partie (après la partie), plus le départ.
  function missionCurve(result) {
    var shape = { points: [] };
    try {
      if (!result || !result.valid || !Array.isArray(result.sessions)) return fail(shape, 'Schedule not calculated.');
      // Parcours sans parties : une marche par dépense ou récompense (l’argent n’arrive jamais « petit à petit »).
      if (result.continuous) {
        var pts = [{ hours: 0, cash: result.startCash, units: result.startUnits, label: 'Start', purchase: null }], prev = result.startCash;
        (result.events || []).forEach(function (e) { var h = e.t / 60; if (e.cash !== prev) { pts.push({ hours: h, cash: prev, label: null, purchase: null, hold: true }); pts.push({ hours: h, cash: e.cash, label: e.label, purchase: e.type === 'spend' && /^(?:Achat|Purchase|Compra)\b/.test(e.label) ? e.label.replace(/^(?:Achat « |Purchase “|Compra “)|[»”]$/g, '') : null }); prev = e.cash; } });
        return finish({ points: pts, stepped: true }, shape);
      }
      var minutes = result.totalSessions ? result.totalMinutes / result.totalSessions : 0;
      var points = [{ hours: 0, cash: result.startCash, units: result.startUnits, label: 'Start', purchase: null }];
      result.sessions.forEach(function (se) { points.push({ hours: se.index * minutes / 60, cash: se.cashAfter, units: se.unitsAfter, label: 'Session ' + se.index + (se.purchases.length ? ' · ' + se.purchases.join(', ') : ''), purchase: se.purchases.length ? se.purchases.join(', ') : null }); });
      return finish({ points: points }, shape);
    } catch (error) { return fail(shape, error.message); }
  }

  /* v7.60 : dollars et lang sont des aides d’affichage, pas des calculs : non énumérables (l’API des calculs reste la même). */
  return Object.freeze(Object.defineProperties({ missionPlan:missionPlan, missionAlternatives:missionAlternatives, missionDeadline:missionDeadline, missionCurve:missionCurve, investmentCompare:investmentCompare, planCurve:planCurve, planCashAt:planCashAt, planStrategies:planStrategies, planDeadline:planDeadline, nextSession:nextSession, choose:choose, businessPlan:businessPlan, worth:worth, investmentActivities: investmentActivities, sessionProjection: sessionProjection, activity: activity, goal: goal, goalMixed: goalMixed, inverse: inverse, roi: roi, purchase: purchase, budget: budget, order: order, compareBuy: compareBuy, goalContinuous: goalContinuous, sessionPlan: sessionPlan, parseLocalizedNumber: parseLocalizedNumber }, { dollars: { value: dollars }, lang: { value: LANG }, plural: { value: plural }, dateText: { value: dateText } }));
}));
