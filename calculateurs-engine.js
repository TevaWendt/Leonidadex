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
  var MONTHS_FR = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  var MONTHS_FR_SHORT = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  function dateText(d, opts, lang) {
    var l = lang || LANG, o = opts || {}; if (Object.prototype.toString.call(d) !== '[object Date]' || !Number.isFinite(d.getTime())) return '';
    if (l === 'fr') {
      var day = d.getDate() === 1 ? '1er' : String(d.getDate()), sp = o.nbsp ? '\u00a0' : ' ';
      var txt = day + sp + (o.short ? MONTHS_FR_SHORT : MONTHS_FR)[d.getMonth()] + (o.year === false ? '' : sp + d.getFullYear());
      return o.time ? txt + ' à ' + d.getHours() + sp + 'h' + sp + String(d.getMinutes()).padStart(2, '0') : txt;
    }
    var f = { month: o.short ? 'short' : 'long', day: 'numeric' }; if (o.year !== false) f.year = 'numeric';
    if (o.time) { f.hour = 'numeric'; f.minute = '2-digit'; }
    try { return d.toLocaleString(l === 'en' ? 'en-US' : l, f); } catch (e) { return d.toISOString().slice(0, 10); }
  }
  /* v7.62 : l'allemand place aussi le signe après le nombre (« 1.250 $ ») */
  function dollars(numberText, sep, lang) {
    var l = lang || LANG, t = String(numberText);
    /* v7.61, v7.63 : l'espagnol et l'italien écrivent aussi le signe après le nombre (« 200.000 $ ») */
    if (l === 'fr' || l === 'es' || l === 'it' || l === 'de') return t + (sep === undefined ? '\u00a0' : sep) + '$';
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
    if (!safe(result)) return fail(shape, 'Le résultat est trop grand pour être calculé de façon fiable. Baisse les montants ou augmente le gain par activité.');
    return Object.assign({ valid: true, reason: null }, result);
  }
  function number(value, label, max, options) {
    options = options || {};
    if (value === undefined && options.defaultValue !== undefined) value = options.defaultValue;
    if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error('Écris ' + label + ' avec un nombre valide.');
    if (value < 0 || value > max || (options.positive && value === 0) || (options.integer && !Number.isInteger(value))) {
      throw new Error(label.charAt(0).toUpperCase() + label.slice(1) + ' doit être un nombre ' + (options.integer ? 'entier ' : '') + (options.positive ? 'plus grand que 0' : 'égal à 0 ou plus') + ', et au plus ' + max.toLocaleString('fr-FR') + '.');
    }
    return value;
  }
  function data(input) { if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Remplis les cases du calcul.'); return input; }
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
  function safeRunCount(runs) { if (!Number.isSafeInteger(runs) || runs < 0) throw new Error('Le nombre de missions à refaire est trop grand pour un calcul fiable.'); }

  // Parse only unambiguous French grouping and French/decimal-point fractions.
  // This boundary helper never turns a blank or a missing value into zero.
  function parseLocalizedNumber(input, lang) {
    var shape = { value: null };
    if (typeof input === 'number') return Number.isFinite(input) ? finish({ value: input }, shape) : fail(shape, 'Saisissez un nombre fini.');
    if (typeof input !== 'string' || !input.trim()) return fail(shape, 'Écris un nombre.');
    var text = input.trim();
    /* v7.62 : en allemand, le point groupe les milliers et la virgule sépare les décimales (« 1.250,50 ») */
    if ((lang || LANG) === 'de') {
      if (!/^[+-]?(?:\d+|\d{1,3}(?:[. \u00a0\u202f]\d{3})+)(?:,\d+)?$/.test(text)) return fail(shape, 'Écris un nombre comme 1 250,50, sans unité.');
      return finish({ value: Number(text.replace(/[. \u00a0\u202f]/g, '').replace(',', '.')) }, shape);
    }
    /* v7.60 : hors du français, la virgule groupe les milliers et le point sépare les décimales (« 1,250.50 ») */
    /* v7.61, v7.63 : en espagnol et en italien, le point groupe les milliers et la virgule sépare les décimales (« 1.250,50 ») ;
       « 1.5 » reste un décimal */
    if ((lang || LANG) === 'es' || (lang || LANG) === 'it') {
      if (/^[+-]?\d+\.\d{1,2}$/.test(text)) return finish({ value: Number(text) }, shape);
      if (!/^[+-]?(?:\d+|\d{1,3}(?:[. \u00a0\u202f]\d{3})+)(?:,\d+)?$/.test(text)) return fail(shape, 'Écris un nombre comme 1 250,50, sans unité.');
      return finish({ value: Number(text.replace(/[. \u00a0\u202f]/g, '').replace(',', '.')) }, shape);
    }
    if ((lang || LANG) !== 'fr') {
      if (!/^[+-]?(?:\d+|\d{1,3}(?:[, \u00a0\u202f]\d{3})+)(?:\.\d+)?$/.test(text)) return fail(shape, 'Écris un nombre comme 1 250,50, sans unité.');
      return finish({ value: Number(text.replace(/[, \u00a0\u202f]/g, '')) }, shape);
    }
    if (!/^[+-]?(?:\d+|\d{1,3}(?:[ \u00a0\u202f]\d{3})+)(?:[,.]\d+)?$/.test(text)) return fail(shape, 'Écris un nombre comme 1 250,50, sans unité.');
    return finish({ value: Number(text.replace(/[ \u00a0\u202f]/g, '').replace(',', '.')) }, shape);
  }

  var activityShape = { net: null, activeMinutes: null, cycleMinutes: null, hourly: null, investment: null, paybackRuns: null, units: null, unitsHourly: null };
  function activity(input) {
    try {
      var a = data(input);
      var reward = money(a.reward, 'la récompense');
      var cost = money(a.cost, 'les frais', 0);
      var duration = minutes(a.duration, 'la durée', undefined, true);
      var prep = minutes(a.prep, 'la préparation', 0);
      var cooldown = minutes(a.cooldown, 'l’attente avant de recommencer', 0);
      var share = number(a.share, 'ta part de la récompense', 100, { defaultValue: 100 });
      number(a.players, 'le nombre de joueurs', 100, { defaultValue: 1, positive: true, integer: true });
      var investment = money(a.investment, "l’achat de départ", 0);
      var units = number(a.units, 'les points par mission', MONEY_MAX, { defaultValue: 0 });
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
      var capital = money(p.capital, 'ce que tu as');
      var reserve = money(p.reserve, 'l’argent gardé de côté', 0);
      var target = money(p.target, 'l’objectif');
      var daily = number(p.dailyMinutes, 'ton temps de jeu par jour, en minutes', 1440, { positive: true });
      if (reserve > capital && !equal(reserve, capital)) return fail(goalShape, 'L’argent que tu gardes de côté (ta réserve) dépasse ce que tu as.');
      var a = activity(p.activity);
      if (!a.valid) return fail(goalShape, a.reason);
      if (target <= capital) return finish({ missing: 0, runs: 0, totalMinutes: 0, activeMinutes: 0, waitMinutes: 0, continuousMinutes: 0, sessions: 0, days: 0, finalCapital: capital, hourly: a.hourly, investment: 0 }, goalShape);
      var spendable = subtract(capital, reserve);
      if (spendable < a.investment && !equal(spendable, a.investment)) return fail(goalShape, 'Pas assez d’argent pour acheter ce qu’il faut avant de commencer, sans toucher à l’argent mis de côté.');
      var afterInvestment = subtract(spendable, a.investment);
      if (afterInvestment < (p.activity.cost || 0) && !equal(afterInvestment, p.activity.cost || 0)) return fail(goalShape, 'Pas assez d’argent pour avancer les coûts de la première activité après l’achat de départ, sans toucher à ta réserve.');
      if (a.net <= 0) return fail(goalShape, 'Pour atteindre cet objectif, chaque mission doit rapporter plus que ses frais.');
      if (a.activeMinutes > daily) return fail(goalShape, 'Une activité complète, préparation comprise, dépasse ton temps de jeu par jour. Joue plus longtemps chaque jour.');
      var cooldown = a.cycleMinutes - a.activeMinutes;
      var missing = target - capital + a.investment;
      var runs = ceil(missing / a.net);
      safeRunCount(runs);
      var prepOnce = p.activity.prepOnce ? (p.activity.prep || 0) : 0;
      var perSession = 1 + floor((daily - a.activeMinutes) / (a.cycleMinutes - prepOnce));
      var sessions = ceil(runs / perSession);
      if (sessions > 1 && cooldown > 1440 - daily) return fail(goalShape, 'L’attente avant de recommencer est plus longue que la pause entre deux parties. Ce cas n’est pas calculé ici.');
      return finish({ missing: missing, runs: runs, totalMinutes: runs * a.activeMinutes - (runs - sessions) * prepOnce + (runs - sessions) * cooldown, activeMinutes: runs * a.activeMinutes - (runs - sessions) * prepOnce, waitMinutes: (runs - sessions) * cooldown, continuousMinutes: runs * a.activeMinutes - Math.max(0,runs - 1) * prepOnce + Math.max(0, runs - 1) * cooldown, sessions: sessions, days: sessions, finalCapital: capital - a.investment + runs * a.net, hourly: a.hourly, investment: a.investment }, goalShape);
    } catch (error) { return fail(goalShape, error.message); }
  }

  function goalMixed(input) {
    var shape = Object.assign({}, goalShape, { breakdown: [] });
    try {
      var p = data(input);
      var capital = money(p.capital, 'ce que tu as');
      var reserve = money(p.reserve, 'l’argent gardé de côté', 0);
      var target = money(p.target, 'l’objectif');
      var daily = number(p.dailyMinutes, 'ton temps de jeu par jour, en minutes', 1440, { positive: true });
      if (reserve > capital && !equal(reserve, capital)) return fail(shape, 'L’argent que tu gardes de côté (ta réserve) dépasse ce que tu as.');
      if (!Array.isArray(p.activities) || !p.activities.length || p.activities.length > 20) return fail(shape, 'Choisis entre 1 et 20 activités à faire chacune leur tour.');
      var activities = p.activities.map(function (entry, index) {
        var a = activity(entry);
        if (!a.valid) throw new Error('Activité ' + (index + 1) + ' : ' + a.reason);
        return Object.assign({}, a, { name: typeof entry.name === 'string' ? entry.name.slice(0, 120) : 'Activité ' + (index + 1), cooldown: a.cycleMinutes - a.activeMinutes, prep: entry.prep || 0, prepOnce: entry.prepOnce === true });
      });
      if (target <= capital) return finish({ missing: 0, runs: 0, totalMinutes: 0, activeMinutes: 0, waitMinutes: 0, continuousMinutes: 0, sessions: 0, days: 0, finalCapital: capital, hourly: null, investment: 0, breakdown: [] }, shape);
      var investment = activities.reduce(function (sum, a) { return sum + a.investment; }, 0);
      var spendable = subtract(capital, reserve);
      if (spendable < investment && !equal(spendable, investment)) return fail(shape, 'Pas assez d’argent pour acheter ce qu’il faut avant de commencer toutes ces activités, sans toucher à l’argent mis de côté.');
      if (activities.some(function (a) { return a.net <= 0; })) return fail(shape, 'Chaque activité de cette rotation doit rapporter plus que ses frais.');
      if (activities.some(function (a) { return a.activeMinutes > daily; })) return fail(shape, 'Une activité de la rotation ne tient pas dans ton temps de jeu par jour.');
      var cash = capital - investment;
      var ready = activities.map(function () { return 0; });
      var continuousReady = ready.slice();
      var counts = ready.slice(), sessionCounts = ready.slice();
      var total = 0, active = 0, waiting = 0, continuous = 0, elapsed = 0, sessions = 1, runs = 0;
      while (cash < target && !equal(cash, target) && runs < MAX_MIXED_RUNS) {
        var index = runs % activities.length;
        var a = activities[index];
        var startingCash = subtract(cash, reserve);
        if (startingCash < (p.activities[index].cost || 0) && !equal(startingCash, p.activities[index].cost || 0)) return fail(shape, 'Pas assez d’argent pour avancer les coûts de « ' + a.name + ' » avant sa récompense, sans toucher à ta réserve.');
        var wait = Math.max(0, ready[index] - elapsed);
        var activeDuration = a.activeMinutes - (a.prepOnce && sessionCounts[index] ? a.prep : 0);
        if (elapsed + wait + activeDuration > daily + Number.EPSILON * daily * 4) {
          if (activities.some(function (item) { return item.cooldown > 1440 - daily; })) return fail(shape, 'Une attente avant de recommencer est plus longue que la pause entre deux parties. Ce cas n’est pas calculé ici.');
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
      if (cash < target && !equal(cash, target)) return fail(shape, 'La rotation dépasse 100 000 activités. Baisse l’objectif ou passe par le calcul à une seule activité.');
      if (equal(cash, target)) cash = target;
      return finish({ missing: target - capital + investment, runs: runs, totalMinutes: total, activeMinutes: active, waitMinutes: waiting, continuousMinutes: continuous, sessions: sessions, days: sessions, finalCapital: cash, hourly: (cash - capital + investment) * 60 / total, investment: investment, breakdown: activities.map(function (a, index) { return { name: a.name, runs: counts[index], net: counts[index] * a.net }; }) }, shape);
    } catch (error) { return fail(shape, error.message); }
  }

  var inverseShape = { runs: null, totalMinutes: null, profit: null, finalCapital: null };
  function inverse(input) {
    try {
      var p = data(input);
      var available = minutes(p.minutes, 'le temps que tu as');
      var capital = money(p.capital, 'ce que tu as');
      var reserve = money(p.reserve, 'l’argent gardé de côté', 0);
      if (reserve > capital && !equal(reserve, capital)) return fail(inverseShape, 'L’argent que tu gardes de côté (ta réserve) dépasse ce que tu as.');
      var a = activity(p.activity);
      if (!a.valid) return fail(inverseShape, a.reason);
      var cooldown = a.cycleMinutes - a.activeMinutes;
      var repeatCycle = a.cycleMinutes - (p.activity.prepOnce ? (p.activity.prep || 0) : 0);
      var runs = available < a.activeMinutes ? 0 : 1 + floor((available - a.activeMinutes) / repeatCycle);
      safeRunCount(runs);
      var spendable = subtract(capital, reserve);
      if (runs && spendable < a.investment && !equal(spendable, a.investment)) return fail(inverseShape, 'Pas assez d’argent pour acheter ce qu’il faut avant de commencer, sans toucher à l’argent mis de côté.');
      var lowestStartingCash = spendable - a.investment + Math.min(0, (runs - 1) * a.net);
      if (runs && lowestStartingCash < (p.activity.cost || 0) && !equal(lowestStartingCash, p.activity.cost || 0)) return fail(inverseShape, 'Pas assez d’argent pour avancer les coûts de chaque activité sans toucher à ta réserve. Fais moins de répétitions ou baisse les coûts.');
      var profit = runs ? runs * a.net - a.investment : 0;
      if (capital + profit < 0) return fail(inverseShape, 'Les pertes de cette activité dépasseraient l’argent que tu as.');
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
      var capital = money(p.capital, 'ce que tu as');
      var reserve = money(p.reserve, 'l’argent gardé de côté', 0);
      var target = money(p.target, 'l’objectif');
      if (reserve > capital) return fail(continuousShape, 'L’argent que tu gardes de côté (ta réserve) dépasse ce que tu as. Baisse la réserve.');
      var available = subtract(capital, reserve);
      var missing = Math.max(0, subtract(target, available));
      if(missing===0)return finish({missing:0,availableCapital:available,reserve:reserve,hourly:Number.isFinite(p.hourly)&&p.hourly>=0?p.hourly:null,totalMinutes:0,hours:0,activeMinutes:0,waitMinutes:0,sessions:0,days:0,finalCapital:capital},continuousShape);
      if(p.hourly==null)return fail(Object.assign({},continuousShape,{missing:missing,availableCapital:available,reserve:reserve}),'Il te manque cette somme. Écris ce que tu gagnes par heure pour avoir le temps de jeu.');
      var hourly = money(p.hourly, 'ce que tu gagnes par heure');
      var daily = p.dailyMinutes == null ? null : number(p.dailyMinutes, 'ton temps de jeu par jour, en minutes', 1440, { positive: true });
      if (missing > 0 && hourly <= 0) return fail(continuousShape, 'Pour atteindre cet objectif, il faut gagner plus de 0 $ par heure.');
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
      var capital = money(p.capital, 'ce que tu as');
      var reserve = money(p.reserve, 'l’argent gardé de côté', 0);
      var available = number(p.minutes, 'la durée de ta partie, en minutes', 1440);
      var maxRepeat = number(p.maxRepeat, 'le nombre de fois à la suite', SESSION_MAX_RUNS, { defaultValue: SESSION_MAX_RUNS, positive: true, integer: true });
      if (reserve > capital) return fail(sessionShape, 'L’argent que tu gardes de côté (ta réserve) dépasse ce que tu as.');
      if (!Array.isArray(p.activities) || !p.activities.length || p.activities.length > 12) return fail(sessionShape, 'Choisis entre 1 et 12 activités pour la partie.');
      var activities = p.activities.map(function (entry, index) {
        var result = activity(entry);
        if (!result.valid) throw new Error('Activité ' + (index + 1) + ' : ' + result.reason);
        return Object.assign({}, result, { id: typeof entry.id === 'string' ? entry.id.slice(0, 120) : String(index), name: typeof entry.name === 'string' && entry.name.trim() ? entry.name.trim().slice(0, 120) : 'Activité ' + (index + 1), cost: entry.cost || 0, reward: entry.reward * (entry.share === undefined ? 100 : entry.share) / 100, cooldown: result.cycleMinutes - result.activeMinutes, prep: entry.prep || 0, prepOnce: entry.prepOnce === true });
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
      var note = best.runs ? 'Programme trouvé parmi les combinaisons essayées : le meilleur gain de partie trouvé, sans garantie qu’il n’en existe pas un meilleur.' : 'Aucun programme qui rapporte n’a été trouvé. Vérifie le temps disponible, les coûts à avancer, les achats de départ et la réserve.';
      if (capped) note += ' On regarde au plus 256 missions par partie.';
      return finish({ profit: subtract(best.cash, capital), finalCapital: best.cash, reserve: reserve, investment: best.investment, runs: best.runs, activeMinutes: best.active, waitMinutes: best.wait, unusedMinutes: Math.max(0, subtract(available, best.time)), totalMinutes: best.time, timeline: timeline, breakdown: activities.map(function (a, index) { return { id: a.id, name: a.name, runs: best.counts[index], net: best.counts[index] * a.net, investment: best.counts[index] ? a.investment : 0 }; }), method: 'bounded-beam', limited: pruned || capped, exhaustive: !pruned && !capped, limits: sessionShape.limits, note: note }, sessionShape); /* lot 3 : exhaustive = aucune suite de missions écartée (faisceau jamais plein, aucune limite de longueur atteinte) : le programme gardé est le meilleur possible dans ce modèle (gain, puis temps) */
    } catch (error) { return fail(sessionShape, error.message); }
  }

  var roiShape = { investment: null, netHourly: null, grossProfit: null, operatingProfit: null, netProfit: null, roiPercent: null, paybackHours: null };
  function roi(input) {
    try {
      var p = data(input);
      var purchasePrice = money(p.purchase, 'le prix d’achat');
      var upgrades = money(p.upgrades, 'les améliorations', 0);
      var fees = money(p.fees, 'les frais supplémentaires', 0);
      var revenue = money(p.revenueHourly, 'ce que ça rapporte par heure');
      var cost = money(p.costHourly, 'les coûts horaires', 0);
      var hours = number(p.hours, 'le temps de jeu, en heures', MINUTES_MAX / 60);
      var investment = purchasePrice + upgrades + fees;
      var netHourly = subtract(revenue, cost);
      var operatingProfit = netHourly * hours;
      var netProfit = subtract(operatingProfit, investment);
      return finish({ investment: investment, netHourly: netHourly, grossProfit: revenue * hours, operatingProfit: operatingProfit, netProfit: netProfit, roiPercent: investment > 0 ? netProfit / investment * 100 : null, paybackHours: investment === 0 ? (netHourly >= 0 ? 0 : null) : ratio(investment, netHourly) }, roiShape); /* lot 3 (E) : gratuit mais perdant à l’usage → jamais « remboursé après 0 min » */
    } catch (error) { return fail(roiShape, error.message); }
  }

  var purchaseShape = { remaining: null, capitalPercent: null, recoveryHours: null, goalDelayHours: null, shortfall: null };
  function purchase(input) {
    try {
      var p = data(input);
      var capital = money(p.capital, 'ce que tu as');
      var price = money(p.price, 'le prix d’achat');
      // Le budget d'achat ne dépend ni d'un objectif ni d'un revenu.
      var hourly = p.hourly == null ? null : money(p.hourly, 'ce que tu gagnes par heure');
      var target = p.target == null ? null : money(p.target, 'l’objectif');
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
      var p=data(input), capital=money(p.capital,'l’argent disponible'), reserve=money(p.reserve,'l’argent gardé de côté',0);
      if(reserve>capital)return fail(shape,'L’argent gardé de côté dépasse ce que tu as.');
      var investment=money(p.price,'le prix d’achat')+money(p.extras,'les options',0)+money(p.fees,'les frais',0);
      var hourly=p.hourly==null?null:money(p.hourly,'ce que tu gagnes par heure');
      var horizon=p.hours==null?null:number(p.hours,'le temps de jeu, en heures',MINUTES_MAX/60);
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
      var capital = money(p.capital, 'ce que tu as');
      var reserve = money(p.reserve, 'l’argent gardé de côté', 0);
      if (!Array.isArray(p.allocations) || p.allocations.length > 100) return fail(budgetShape, '100 dépenses maximum.');
      var allocations = p.allocations.map(function (value, index) { return money(value, 'la dépense ' + (index + 1)); });
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
      var cash = money(p.capital, 'ce que tu as');
      var hourly = p.hourly == null ? null : money(p.hourly, 'ce que tu gagnes par heure');
      var reserve = money(p.reserve, 'l’argent gardé de côté', 0);
      if (reserve > cash) return fail(orderShape, 'La réserve dépasse l’argent que tu as.');
      if (!Array.isArray(p.items) || p.items.length > 100) return fail(orderShape, '100 achats maximum dans l’ordre.');
      var items = p.items.map(function (entry, index) {
        entry = data(entry);
        var label = typeof entry.name === 'string' && entry.name.trim() ? entry.name.trim().slice(0, 120) : 'Achat ' + (index + 1);
        return { name: label, price: money(entry.price, 'le prix de « ' + label + ' »'), boostHourly: money(entry.boostHourly, 'ce que rapporte en plus l’achat ' + (index + 1), 0), costHourly: money(entry.costHourly, 'ce que coûte l’achat ' + (index + 1) + ' à l’usage', 0) }; // v7.49 : coût d’usage par heure
      });
      var time = 0;
      var steps = [];
      /* lot 3 : deferLosses (« Quoi acheter d’abord ? ») : un achat qui coûte plus à l’usage qu’il ne rapporte (gain net < 0) se paie
         en même temps que les achats suivants de l’ordre, jusqu’à ce que le groupe ne fasse plus baisser le gain par heure (ou tout à
         la fin) : payé plus tôt, il ralentirait l’attente des suivants. Jamais plus lent que « dès que possible » ni que « tout d’un
         coup à la fin » (preuve dans CALCULATEUR-LOT3.md). L’ordre reste celui donné ; sans l’option, comportement d’avant (Léo). */
      var defer = p.deferLosses === true;
      for (var i = 0; i < items.length; i += 1) {
        var last = i;
        if (defer) { var net = subtract(items[i].boostHourly, items[i].costHourly); while (net < 0 && last < items.length - 1) { last += 1; net += subtract(items[last].boostHourly, items[last].costHourly); } }
        var need = 0; for (var g = i; g <= last; g += 1) need += items[g].price;
        var wait = timeTo(need + reserve, cash, hourly);
        if (wait === null) return fail(Object.assign({}, orderShape, {steps: steps, blockedIndex: i, shortfall: need + reserve - cash}), 'Étape ' + (i + 1) + ' bloquée : il manque ' + dollars((need + reserve - cash).toLocaleString('fr-FR'), ' ') + ' pour ' + items.slice(i, last + 1).map(function (x) { return '« ' + x.name + ' »'; }).join(' et ') + '. ' + (hourly !== null && hourly < 0 ? 'Tes achats d’avant coûtent plus à l’usage qu’ils ne rapportent : tu perds de l’argent en jouant.' : hourly === null ? 'Écris ce que tu gagnes par heure pour calculer l’attente avant cet achat.' /* lot 2 (C11.5) : un gain vide n’est pas un gain nul */ : 'Tu ne gagnes rien par heure avant cet achat.'));
        time += wait;
        var left = wait > 0 ? reserve + need : cash;
        for (var k = i; k <= last; k += 1) {
          var item = items[k];
          left -= item.price;
          // Waiting ends exactly at the price: avoid residual floating-point debt.
          if (k === last && wait > 0) left = reserve;
          // Un revenu inconnu ne devient pas implicitement zéro.
          if(hourly!==null)hourly = subtract(hourly + item.boostHourly, item.costHourly);
          steps.push(Object.assign({ name: item.name, waitHours: k === i ? wait : 0, timeHours: time, capital: left, hourly: hourly }, k < last ? { withNext: true } : {}));
        }
        cash = left; i = last;
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
      var capital = money(p.capital, 'l’argent que tu as');
      var reserve = money(p.reserve, 'l’argent mis de côté', 0);
      if (reserve > capital) return fail(chooseShape, 'L’argent gardé de côté dépasse ce que tu as.');
      var hourly = p.hourly == null ? null : money(p.hourly, 'ce que tu gagnes par heure');
      var dailyMinutes = p.dailyMinutes == null ? null : number(p.dailyMinutes, 'le temps de jeu par jour', 1440, { positive: true });
      var horizon = p.hours == null ? null : number(p.hours, 'le temps où tu t’en sers', MINUTES_MAX / 60);
      if (!Array.isArray(p.items) || p.items.length < 2 || p.items.length > 6) return fail(chooseShape, 'Compare entre deux et six achats.');
      var available = subtract(capital, reserve);
      var items = p.items.map(function (entry, index) {
        entry = data(entry);
        var name = typeof entry.name === 'string' && entry.name.trim() ? entry.name.trim().slice(0, 120) : 'Achat ' + (index + 1);
        if (entry.price == null) return { name: name, known: false, price: null, total: null, utility: null, incomeHourly: null, affordable: null, shortfall: null, waitHours: null, waitDays: null, recoveryHours: null, paybackHours: null, valueScore: null, gainOverHorizon: null };
        var total = money(entry.price, 'le prix de ' + name) + money(entry.extras, 'les options de ' + name, 0) + money(entry.fees, 'les frais de ' + name, 0);
        // v7.54 : l’envie n’est plus notée 3 par le site : absente, elle reste absente (revue v7.53) ; le critère « envie / prix » attend alors ta note.
        var utility = entry.utility === null || entry.utility === undefined ? null : number(entry.utility, 'l’envie pour ' + name, 5, { integer: true, positive: true });
        var income = entry.incomeHourly == null ? null : money(entry.incomeHourly, 'ce que rapporte ' + name);
        var shortfall = Math.max(0, subtract(total, available));
        var waitHours = shortfall === 0 ? 0 : hourly === null || hourly <= 0 ? null : shortfall / hourly;
        var waitDays = waitHours === null ? null : dailyMinutes === null ? null : ceil(waitHours * 60 / dailyMinutes);
        var recoveryHours = hourly === null || hourly <= 0 ? null : total / hourly;
        var paybackHours = income === null || income <= 0 ? null : total / income;
        var gain = income === null || horizon === null ? null : income * horizon - total;
        return { name: name, known: true, price: entry.price, total: total, utility: utility, incomeHourly: income, affordable: shortfall === 0, shortfall: shortfall, waitHours: waitHours, waitDays: waitDays, recoveryHours: recoveryHours, paybackHours: paybackHours, valueScore: total > 0 && utility !== null ? utility * 100000 / total : null, gainOverHorizon: gain };
      });
      var known = items.filter(function (x) { return x.known; });
      if (!known.length) return fail(chooseShape, 'Écris au moins un prix, même imaginé.');
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
        /* lot 3 : un achat gratuit (ou déjà à toi) noté a le meilleur rapport envie / prix possible : il n’est plus écarté du critère */
        value: pick('value', function (x) { return x.valueScore !== null ? x.valueScore : x.total === 0 && x.utility !== null ? 1e300 : null; }, true),
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
      var capital = money(p.capital, 'l’argent que tu as');
      var reserve = money(p.reserve, 'l’argent mis de côté', 0);
      if (reserve > capital) return fail(planShape, 'L’argent gardé de côté dépasse ce que tu as.');
      var hourly = money(p.hourly, 'ce que tu gagnes par heure');
      var dailyMinutes = number(p.dailyMinutes, 'le temps de jeu par jour', 1440, { positive: true });
      var daysPerWeek = number(p.daysPerWeek, 'les jours par semaine', 7, { defaultValue: 7, integer: true, positive: true });
      var upkeep = money(p.upkeepPerSession, 'les dépenses par partie', 0);
      var goalPrice = p.goalPrice == null ? null : money(p.goalPrice, 'le prix du but');
      var goalTarget = p.target == null ? null : money(p.target, 'la somme visée');
      if (goalPrice === null && goalTarget === null) return fail(planShape, 'Dis-moi ton but : une somme à avoir ou un achat avec son prix.');
      var goalIncome = p.goalIncomeHourly == null ? 0 : money(p.goalIncomeHourly, 'ce que rapporte le but');
      var prerequisites = Array.isArray(p.prerequisites) ? p.prerequisites : [];
      if (prerequisites.length > 20) return fail(planShape, 'Vingt achats maximum avant le but.');
      // Le gain utile par heure enlève les dépenses de chaque partie (consommables, munitions…).
      var upkeepHourly = upkeep * 60 / dailyMinutes;
      var effective = subtract(hourly, upkeepHourly);
      if (effective <= 0 && (goalPrice !== null ? goalPrice : goalTarget) > subtract(capital, reserve)) return fail(planShape, 'Tes dépenses par partie mangent tout ce que tu gagnes : baisse-les ou augmente ton gain par heure.');
      var items = prerequisites.map(function (x, i) { x = data(x); var label = typeof x.name === 'string' && x.name.trim() ? x.name.trim().slice(0, 120) : 'Achat ' + (i + 1); return { name: label, price: money(x.price, 'le prix de « ' + label + ' »'), boostHourly: money(x.boostHourly, 'ce que rapporte l’achat ' + (i + 1), 0) }; });
      var goalItem = goalPrice !== null ? { name: typeof p.goalName === 'string' && p.goalName.trim() ? p.goalName.trim().slice(0, 120) : 'Mon but', price: goalPrice, boostHourly: goalIncome } : null;
      var chain = order({ capital: capital, reserve: reserve, hourly: Math.max(0, effective), items: goalItem ? items.concat([goalItem]) : items });
      if (!chain.valid) return fail(planShape, chain.reason);
      var steps = chain.steps.map(function (st, i) { return { name: st.name, kind: goalItem && i === chain.steps.length - 1 ? 'goal' : 'prerequisite', waitHours: st.waitHours, atHours: st.timeHours, capitalAfter: st.capital, hourlyAfter: st.hourly }; });
      var totalHours = chain.totalHours;
      var finalTargetHours = 0;
      if (goalTarget !== null) {
        // Après les achats, il faut encore réunir la somme visée (en plus de la réserve).
        var missingAfter = Math.max(0, subtract(goalTarget + reserve, chain.finalCapital));
        var rate = chain.finalHourly === null ? Math.max(0, effective) : chain.finalHourly;
        if (missingAfter > 0 && rate <= 0) return fail(planShape, 'Avec ce gain par heure, la somme visée ne peut pas être atteinte.');
        finalTargetHours = missingAfter > 0 ? missingAfter / rate : 0;
        totalHours += finalTargetHours;
        steps.push({ name: 'Avoir ' + dollars(goalTarget.toLocaleString('fr-FR'), ' ') + '', kind: 'goal', waitHours: finalTargetHours, atHours: totalHours, capitalAfter: goalTarget + reserve, hourlyAfter: rate });
      }
      var totalMinutes = totalHours * 60;
      var sessions = totalMinutes === 0 ? 0 : ceil(totalMinutes / dailyMinutes);
      var weeks = sessions === 0 ? 0 : Math.floor((sessions - 1) / daysPerWeek);
      // Jour calendaire de chaque étape, avec la même règle de semaine que les jalons.
      /* lot 2 (C1) : même calendrier que le plan (calendarDays), valeur inchangée. */
      steps.forEach(function (st) { var sess = st.atHours === 0 ? 0 : ceil(st.atHours * 60 / dailyMinutes); st.sessions = sess; st.days = calendarDays(sess, daysPerWeek); });
      var days = calendarDays(sessions, daysPerWeek);
      var missing = Math.max(0, subtract(items.reduce(function (a, x) { return a + x.price; }, 0) + (goalPrice || 0) + (goalTarget || 0) + reserve, capital));
      var milestones = [0.25, 0.5, 0.75, 1].map(function (f) { var h = totalHours * f; var sess = h === 0 ? 0 : ceil(h * 60 / dailyMinutes); return { fraction: f, hours: h, sessions: sess, days: calendarDays(sess, daysPerWeek) }; });
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
      var capital = money(p.capital, 'ce que tu as');
      var target = money(p.target, 'l’objectif');
      var hourly = money(p.hourly, 'ce que tu gagnes par heure');
      var price = money(p.price, 'le prix d’achat');
      var boost = money(p.boostHourly, 'ce que tu gagnes en plus par heure', 0);
      var affordable = capital >= price;
      return finish({ buyHours: affordable ? timeTo(target, capital - price, hourly + boost) : null, saveHours: timeTo(target, capital, hourly), affordable: affordable }, compareShape);
    } catch (error) { return fail(compareShape, error.message); }
  }


  /* lot 2 (C1) : un seul calendrier pour Mon temps de jeu et le plan : jour de la n-ième partie quand on joue les dpw premiers
     jours de chaque semaine (partie 1 = jour 1). (6, 5) → 8 : jours 1 à 5 puis 8 ; ceil(6 × 7 ÷ 5) = 9 comptait un jour sans partie. */
  function calendarDays(n, dpw) { return n <= 0 ? 0 : Math.floor((n - 1) / dpw) * 7 + ((n - 1) % dpw) + 1; }

  function sessionProjection(input) {
    var shape = { missingBefore: null, missingAfter: null, progressPercent: null, sessionsLeft: null, calendarDays: null, calendarReason: null, calendarField: null };
    try {
      var p = data(input), capital = money(p.capital, 'ce que tu as'), reserve = money(p.reserve, 'l’argent gardé de côté', 0);
      var target = money(p.target, 'l’objectif');
      if (!p.session || !p.session.valid) return fail(shape, 'Remplis d’abord ta partie.');
      /* lot 2 (C11) : les dépenses par partie (facultatives, défaut 0) sont retirées de la partie faite, des suivantes et de l’avancement. */
      var up = money(p.upkeepPerSession, 'les dépenses par partie', 0);
      var before = Math.max(0, target - (capital - reserve)), after = Math.max(0, target - (p.session.finalCapital - up - reserve));
      var base = p.repeatProfit === undefined ? p.session.profit + (p.session.investment || 0) : p.repeatProfit;
      /* lot 2 (C11) : une partie suivante inconnue (repeatProfit null, repeatReason) reste inconnue ; connue, elle est nette des dépenses par partie (next ≤ 0 → pas de nombre de parties, sans raison de calendrier). */
      var next = typeof base === 'number' && Number.isFinite(base) ? base - up : base;
      var count = after === 0 ? 0 : Number.isFinite(next) && next > 0 ? ceil(after / next) : null;
      var calendar = count === 0 ? 0 : null, calendarReason = null, calendarField = null;
      if (after > 0 && !Number.isFinite(next)) {
        calendarReason = 'On ne peut pas calculer les parties suivantes. ' + (p.repeatReason || 'Écris combien de temps dure une partie, d’habitude.');
        calendarField = 'usualMinutes';
      } else if (count > 0) {
        try { var days = number(p.daysPerWeek, 'les jours joués par semaine', 7, {positive:true,integer:true,defaultValue:7}); calendar = calendarDays(count, days); /* lot 2 (C1) */ }
        catch(error) { calendarReason = error.message; calendarField = 'daysPerWeek'; }
      }
      return finish({missingBefore:before, missingAfter:after, progressPercent:before === 0 ? 100 : Math.max(0, Math.min(100, (p.session.profit - up) / before * 100)), sessionsLeft:count, calendarDays:calendar, calendarReason:calendarReason, calendarField:calendarField}, shape);
    } catch(error) { return fail(shape, error.message); }
  }

  // Sequential activity rotation; costs at start and rewards at completion.
  // Compare the two event streams for an improvement, without prorating rewards.
  function investmentActivities(input) {
    var shape = {investment:null, grossProfit:null, costs:null, operatingProfit:null, netProfit:null, paybackHours:null, paybackCycles:null, netHourly:null, runs:null};
    try {
      var p = data(input), investment = money(p.purchase, 'le prix d’achat') + money(p.upgrades,'les améliorations',0) + money(p.fees,'les frais au départ',0);
      var horizon = number(p.hours, 'le temps de jeu, en heures', MINUTES_MAX / 60) * 60;
      if (!Array.isArray(p.activities) || !p.activities.length || p.activities.length > 12) return fail(shape,'Choisis une activité qui va avec cet achat, ou dis combien il te rapporte par heure.');
      var improve = p.mode === 'improve';
      // Ce que le joueur gagnait déjà sans l'achat (par heure) : le temps passé sur la nouvelle activité ne rapporte plus ce gain-là.
      var baseline = improve || p.baselineHourly == null ? null : money(p.baselineHourly, 'ce que tu gagnes déjà par heure');
      var gain = improve ? number(p.gainPercent,'l’augmentation de récompense (%)',1000,{defaultValue:0}) : 0;
      var reduction = improve ? number(p.durationReduction,'la réduction de durée (%)',95,{defaultValue:0}) : 0;
      var original = p.activities.map(function(a){ var r=activity(a); if(!r.valid) throw Error(a.name+' : '+r.reason); return Object.assign({},a,{name:typeof a.name==='string'?a.name:'Activité',net:r.net,active:r.activeMinutes,cost:a.cost===undefined?0:a.cost,prep:a.prep===undefined?0:a.prep,cooldown:a.cooldown===undefined?0:a.cooldown,share:a.share===undefined?100:a.share}); });
      var after = original.map(function(a){var out=Object.assign({},a);if(improve){out.reward*=1+gain/100;out.duration*=1-reduction/100;}out.net=out.reward*out.share/100-out.cost;out.active=out.duration+out.prep;return out;});
      function rate(list){var net=list.reduce(function(t,a){return t+a.net;},0), duration=list.reduce(function(t,a){return t+a.active+a.cooldown;},0);return duration>0?net*60/duration:0;}
      var approximate = rate(after) - (improve ? rate(original) : 0);
      var longest = Math.max.apply(null,after.concat(improve?original:[]).map(function(a){return a.active+a.cooldown;}));
      /* lot 5 (relecture, L5) : avec le gain d’avant, la fenêtre se règle sur ce que l’activité rapporte EN PLUS de lui, pour voir où la
         différence se stabilise (avant : réglée sur le gain brut, elle pouvait finir avant le dernier creux) */
      var spare = !improve && baseline !== null ? approximate - baseline : approximate;
      var until = Math.min(MINUTES_MAX, Math.max(horizon, spare > 0 ? investment / spare * 120 + longest * 4 : approximate > 0 ? investment / approximate * 120 + longest * 4 : longest * 4));
      /* chaque mission finie, à sa fin, avec ses frais (ce que compte la réponse sur le temps d’usage) */
      function stream(list, limit) {
        var events=[], ready=list.map(function(){return 0;}), counts=ready.slice(), time=0, gross=0,costs=0,runs=0;
        for(var n=0;n<100000;n++){
          var i=n%list.length,a=list[i],start=Math.max(time,ready[i]);
          var end=start+a.active-(a.prepOnce&&counts[i]?a.prep:0);
          if(end>limit) return {events:events,gross:gross,costs:costs,runs:runs,limited:false};
          events.push({time:end,net:a.reward*a.share/100-a.cost});
          if(end<=horizon){gross+=a.reward*a.share/100;costs+=a.cost;runs++;}
          ready[i]=end+a.cooldown;counts[i]++;time=end;
        }
        if(time<horizon) throw Error('La période dépasse 100 000 activités. Réduis le temps où tu t’en sers.');
        return {events:events,gross:gross,costs:costs,runs:runs,limited:true};
      }
      function simulate(limit){
        var A=stream(after,limit),B=improve?stream(original,limit):{events:[],gross:0,costs:0,runs:0,limited:false};
        var done=A.events.map(function(e){return {time:e.time,value:e.net,run:1};}).concat(B.events.map(function(e){return {time:e.time,value:-e.net,run:0};})).sort(function(x,y){return x.time-y.time;});
        return {a:A,b:B,done:done};
      }
      /* lot 5 (seconde relecture) : « remboursé après » suit la même comptabilité que la réponse : l’argent des missions FINIES (frais compris),
         moins celui des missions sans l’achat (amélioration), moins le gain d’avant jusqu’à cet instant (nouvelle activité, s’il est connu),
         moins le prix. Cette différence monte à la fin de chaque mission et baisse entre deux (gain d’avant) : on la regarde juste avant
         chaque fin de mission (ses creux). Règle unique :
         - devant à la fin du temps d’usage : début de la dernière période où l’achat reste devant jusqu’à cette fin ; ce temps n’est
           jamais plus long que le temps d’usage, comme la réponse « Oui » (avant : un « pour de bon » plus tard, 4 h pour 3 h) ;
         - derrière ou à égalité à la fin du temps d’usage : l’instant où il passe devant POUR DE BON (scénario I : 4 h 15), seulement s’il
           le reste au moins deux cycles entiers et que la différence ne baisse pas sur la seconde moitié de la période regardée (la
           fenêtre double tant qu’elle monte) ; sinon « pas atteint » (à égalité : l’équilibre sur le temps d’usage). Avant : le premier
           passage, même pour un achat jamais remboursé, et un passage au bout de la fenêtre pris pour « pour de bon ».
         Achat gratuit : 0, inchangé. */
      var first=simulate(until),tol=0.005+1e-9*investment,searched=until;
      function scan(done,perMinute,limit){
        var cum=0,cyc=0,ahead=-investment>=-tol,start=ahead?0:null,startC=0;
        for(var i=0;i<done.length&&done[i].time<=limit+1e-9;){
          var t=done[i].time;
          if(cum-perMinute*t-investment<-tol){ahead=false;start=null;}
          do{cum+=done[i].value;cyc+=done[i].run;i++;}while(i<done.length&&equal(done[i].time,t));
          if(cum-perMinute*t-investment>=-tol){if(!ahead){ahead=true;start=t;startC=cyc;}}else{ahead=false;start=null;}
        }
        var end=cum-perMinute*limit-investment;
        if(end<-tol){ahead=false;start=null;}
        return {start:ahead?start:null,cycles:startC,end:end};
      }
      function paybackFor(perMinute){
        if(investment===0)return {hours:0,cycles:0};
        var r=scan(first.done,perMinute,horizon);
        if(r.end>tol)return {hours:r.start/60,cycles:r.cycles};
        var W=until,sim=first;
        for(var k=0;k<8;k++){
          var w=scan(sim.done,perMinute,W),mid=scan(sim.done,perMinute,W/2);
          if(w.start!==null&&W-w.start>=2*longest-1e-9&&w.end>=mid.end-tol)return {hours:w.start/60,cycles:w.cycles};
          if(w.end<mid.end-tol||W>=MINUTES_MAX)break;
          W=Math.min(MINUTES_MAX,W*2);sim=simulate(W);searched=Math.max(searched,W);
        }
        /* à égalité à la fin du temps d’usage sans jamais rester devant ensuite : l’équilibre sur ce temps-là, rien au-delà */
        return r.end>=-tol?{hours:r.start/60,cycles:r.cycles}:{hours:null,cycles:null};
      }
      var plain=paybackFor(0),marginalPb=baseline===null?{hours:null,cycles:null}:paybackFor(baseline/60);
      var a=first.a,b=first.b,payback=plain.hours,paybackCycles=plain.cycles,marginalPayback=marginalPb.hours,marginalCycles=marginalPb.cycles;
      var gross=a.gross-b.gross,costs=a.costs-b.costs,operating=gross-costs;
      // Gain marginal : ce que l'achat rapporte en plus de ce que le joueur gagnait déjà pendant le même temps (horizon entier consacré à ces activités).
      var opportunity=baseline===null?null:baseline*horizon/60,marginal=opportunity===null?null:operating-opportunity;
      return finish({investment:investment,grossProfit:gross,costs:costs,operatingProfit:operating,netProfit:operating-investment,paybackHours:payback,paybackCycles:paybackCycles,netHourly:horizon>0?operating*60/horizon:null,runs:a.runs,beforeNet:b.gross-b.costs,afterNet:a.gross-a.costs,roiPercent:investment>0?(operating-investment)/investment*100:null,limited:a.limited||b.limited||payback===null, searchedMinutes:searched,mode:improve?'improve':p.mode||'estimate',baselineHourly:baseline,opportunityCost:opportunity,marginalProfit:marginal,marginalNetProfit:marginal===null?null:marginal-investment,marginalPaybackHours:baseline===null?null:marginalPayback,marginalPaybackCycles:baseline===null?null:marginalCycles},shape);
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
      var capital = money(p.capital, 'l’argent que tu as');
      var reserve = money(p.reserve, 'l’argent mis de côté', 0);
      if (reserve > capital) return fail(compareShapeInvest, 'L’argent gardé de côté dépasse ce que tu as.');
      var investment = money(p.price, 'le prix d’achat') + money(p.extras, 'les options', 0) + money(p.fees, 'les frais', 0);
      var baseline = p.baselineHourly == null ? null : money(p.baselineHourly, 'ce que tu gagnes déjà par heure');
      /* lot 3 (scénario G) : un gain en plus pas écrit n’est ni une erreur ni un zéro : la réponse reste conditionnelle et le
         gain en plus minimal qui la ferait basculer est rendu (thresholds.extraHourlyForHorizon). */
      var extraKnown = p.extraHourly !== null && p.extraHourly !== undefined && p.extraHourly !== '';
      var extra = extraKnown ? money(p.extraHourly, 'ce que l’achat te fait gagner en plus par heure') : null;
      var costHourly = money(p.costHourly, 'ce que l’achat te coûte par heure', 0);
      var hours = p.hours == null ? null : number(p.hours, 'le temps où tu t’en sers', MINUTES_MAX / 60);
      var daily = p.dailyMinutes == null ? null : number(p.dailyMinutes, 'le temps de jeu par jour', 1440, { positive: true });
      var marginal = extraKnown ? subtract(extra, costHourly) : null;
      var available = subtract(capital, reserve);
      var shortfall = Math.max(0, subtract(investment, available));
      /* lot 3 : pas assez d’argent maintenant : l’achat se fait quand l’argent le permet, en jouant comme aujourd’hui
         (attente = manque ÷ gain actuel), jamais au départ ; la comparaison garde le même horizon depuis maintenant. Sans gain
         actuel connu, le moment de l’achat est inconnu : rien n’est chiffré. */
      var wait = shortfall === 0 ? 0 : baseline === null || baseline <= 0 ? null : shortfall / baseline;
      var usable = hours === null || wait === null ? null : Math.max(0, subtract(hours, wait));
      // E : sans gain en plus (ou avec une perte), aucun délai fini ; un achat gratuit qui coûte à l’usage ne se « rembourse » pas en 0 h.
      var breakEven = !extraKnown ? null : investment === 0 ? (marginal >= 0 ? 0 : null) : marginal > 0 ? investment / marginal : null;
      var withoutCash = baseline === null || hours === null ? null : capital + baseline * hours;
      var withCash = null, difference = null;
      if (extraKnown && hours !== null) {
        if (shortfall === 0) { difference = marginal * hours - investment; withCash = capital - investment + ((baseline || 0) + marginal) * hours; }
        else if (usable !== null && usable > 0) { difference = marginal * usable - investment; withCash = capital - investment + baseline * hours + marginal * usable; }
        else if (usable !== null) { difference = 0; withCash = withoutCash; } // l’argent n’est pas là avant la fin de l’horizon : pas d’achat sur ce temps
      }
      /* lot 3 (§ 8, sensibilité) : prix total au-delà duquel l’achat n’est plus remboursé sur l’horizon (différence nulle), en
         tenant compte de l’attente quand ce prix dépasse l’argent disponible : m·(H − (P − A)/b) = P ⇒ P = m·(b·H + A)/(b + m). */
      var maxPrice = null;
      if (extraKnown && hours !== null && marginal > 0) {
        if (marginal * hours <= available + 1e-9) maxPrice = marginal * hours;
        else if (baseline !== null && baseline > 0) maxPrice = marginal * (baseline * hours + available) / (baseline + marginal);
        // sans gain actuel connu (ou nul), on ne sait pas quand un prix plus haut que l’argent disponible serait payable : pas de seuil
      }
      var thresholds = {
        hoursForPayback: breakEven,
        sessionsForPayback: breakEven === null || daily === null ? null : ceil(breakEven * 60 / daily),
        extraHourlyForHorizon: usable === null || usable <= 0 ? null : investment / usable + costHourly,
        waitHours: wait,
        usableHours: usable,
        maxPriceForHorizon: maxPrice
      };
      /* lot 3 : à la différence nulle (seuil exact), l’achat n’est ni gagnant ni perdant : « even », vérifié de part et d’autre */
      var even = difference !== null && Math.abs(difference) <= 0.005 + 1e-9 * investment;
      var verdict = !extraKnown ? 'unknown-gain' : marginal < 0 || (marginal === 0 && investment > 0) ? 'never' : shortfall > 0 ? 'wait' : hours === null ? 'unknown-horizon' : even ? 'even' : difference > 0 ? 'buy' : 'not-yet';
      return finish({ investment: investment, capital: capital, reserve: reserve, affordable: shortfall === 0, shortfall: shortfall, baselineHourly: baseline, extraHourly: extra, extraKnown: extraKnown, costHourly: costHourly, marginalHourly: marginal, hours: hours, withoutCash: withoutCash, withCash: withCash, difference: difference, breakEvenHours: breakEven, thresholds: thresholds, verdict: verdict }, compareShapeInvest);
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
      if (!plan || typeof plan !== 'object' || !result || !result.valid || !Array.isArray(result.steps)) return fail(curveShape, 'Il faut un plan valide pour tracer la courbe.');
      var capital = money(plan.capital, 'l’argent que tu as'), hourly = Math.max(0, result.effectiveHourly === undefined ? money(plan.hourly, 'ce que tu gagnes par heure') : result.effectiveHourly);
      var points = [{ hours: 0, cash: capital, label: 'Départ' }];
      var cash = capital, rate = hourly, time = 0;
      result.steps.forEach(function (st) {
        var amount = st.kind === 'goal' && st.name.indexOf('Avoir ') === 0;
        if (st.waitHours > 0) { time = st.atHours; cash = amount ? st.capitalAfter : cash + rate * st.waitHours; points.push({ hours: time, cash: cash, label: 'Avant « ' + st.name + ' »' }); }
        if (!amount) { cash = st.capitalAfter; points.push({ hours: st.atHours, cash: cash, label: st.name, purchase: true }); }
        rate = st.hourlyAfter === null || st.hourlyAfter === undefined ? rate : st.hourlyAfter;
      });
      if (points.length === 1 && result.totalHours > 0) points.push({ hours: result.totalHours, cash: capital + hourly * result.totalHours, label: 'Fin' });
      return finish({ points: points }, curveShape);
    } catch (error) { return fail(curveShape, error.message); }
  }
  var cashShape = { cash: null };
  function planCashAt(input) {
    try {
      var p = data(input);
      var points = p.points, hours = number(p.hours, 'le temps de jeu', MINUTES_MAX / 60);
      if (!Array.isArray(points) || !points.length) return fail(cashShape, 'Aucune courbe à lire.');
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
      var reserve = money(p.reserve, 'l’argent mis de côté', 0);
      var candidates = [];
      function candidate(id, label, changes, note) {
        var alt = Object.assign({}, p, changes, { variants: false });
        var r = businessPlan(alt);
        candidates.push({ id: id, label: label, note: note || null, valid: r.valid, reason: r.valid ? null : r.reason, totalHours: r.valid ? r.totalHours : null, days: r.valid ? r.days : null, sessions: r.valid ? r.sessions : null, finalCapital: r.valid ? r.finalCapital : null, reserveKept: (alt.reserve || 0) >= reserve, reserve: alt.reserve || 0, prerequisites: (alt.prerequisites || []).map(function (x) { return x.name; }), input: alt });
      }
      candidate('asIs', prerequisites.length ? 'Dans l’ordre que tu as donné' : 'Directement vers ton but', {});
      if (prerequisites.length > 1) {
        var byPayback = prerequisites.slice().sort(function (a, b) {
          var ra = a.boostHourly > 0 ? a.price / a.boostHourly : Infinity, rb = b.boostHourly > 0 ? b.price / b.boostHourly : Infinity;
          return ra - rb || prerequisites.indexOf(a) - prerequisites.indexOf(b);
        });
        if (byPayback.some(function (x, i) { return x !== prerequisites[i]; })) candidate('byPayback', 'Ce qui rapporte le plus vite d’abord', { prerequisites: byPayback }, 'Les achats qui se remboursent le plus vite passent devant ; les autres gardent leur ordre.');
        var cheapFirst = prerequisites.slice().sort(function (a, b) { return a.price - b.price || prerequisites.indexOf(a) - prerequisites.indexOf(b); });
        if (cheapFirst.some(function (x, i) { return x !== prerequisites[i]; }) && cheapFirst.some(function (x, i) { return x !== byPayback[i]; })) candidate('cheapFirst', 'Le moins cher d’abord', { prerequisites: cheapFirst }, 'Tu commences par ce qui coûte le moins : moins d’attente au début.');
      }
      if (prerequisites.some(function (x) { return !(x.boostHourly > 0); }) && prerequisites.some(function (x) { return x.boostHourly > 0; })) candidate('skipNoBoost', 'Seulement les achats qui rapportent', { prerequisites: prerequisites.filter(function (x) { return x.boostHourly > 0; }) }, 'À prendre seulement si tu peux te passer des autres achats avant ton but.');
      if (prerequisites.length) candidate('direct', 'Directement vers ton but, sans achat avant', { prerequisites: [] }, 'Seulement si aucun de ces achats n’est indispensable pour ton but.');
      if (reserve > 0) candidate('useReserve', 'En touchant à l’argent mis de côté', { reserve: 0 }, 'Plus vite, mais sans filet : tout ton argent sert au plan.');
      var valid = candidates.filter(function (c) { return c.valid; });
      var listed = candidates.map(function (c) { var out = Object.assign({}, c); delete out.input; return out; });
      if (!valid.length) return fail(Object.assign({}, shape, { candidates: listed }), candidates[0] && candidates[0].reason || 'Aucun ordre d’achats ne peut être calculé.');
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
      var days = number(deadlineDays, 'l’échéance en jours', 36500, { positive: true, integer: true });
      var daysPerWeek = number(p.daysPerWeek, 'les jours par semaine', 7, { defaultValue: 7, integer: true, positive: true });
      var dailyMinutes = number(p.dailyMinutes, 'le temps de jeu par jour', 1440, { positive: true });
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
      var minutes = number(p.minutes, 'la durée de la prochaine partie', 1440, { positive: true });
      var capital = money(p.capital, 'l’argent que tu as');
      var reserve = money(p.reserve, 'l’argent mis de côté', 0);
      var upkeep = money(p.upkeepPerSession, 'les dépenses par partie', 0);
      var gain, runs = null, mode = 'continuous', detail = null;
      if (p.activity) {
        var r = inverse({ minutes: minutes, capital: capital, reserve: reserve, activity: p.activity });
        if (!r.valid) return fail(shape, r.reason);
        gain = r.profit; runs = r.runs; mode = 'activity'; detail = { activeMinutes: r.totalMinutes, name: p.activity.name || null };
      } else {
        var hourly = money(p.hourly, 'ce que tu gagnes par heure');
        gain = hourly * minutes / 60;
      }
      gain = subtract(gain, upkeep);
      var after = capital + gain;
      var goalTotal = p.goalTotal == null ? null : money(p.goalTotal, 'le montant total du but');
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
  var missionShape = { sessions: [], totalSessions: null, totalMinutes: null, activeMinutes: null, days: null, weeks: null, phases: [], purchases: [], reached: null, finalCash: null, finalUnits: null, missing: null, missingUnits: null, averagePerSession: null, goalMoney: null, startCash: null, startUnits: null, limited: false, note: null, route: [], events: [], lowPoint: null, earned: null, conserved: null, continuous: false, goalMeaning: null, onceDone: [], journal: [], journalComplete: false, rules: null, acquisitionMinutes: null, pendingAcquisitions: [], pendingAcquisitionMinutes: null, goalIncomeHourly: null, goalPaybackHours: null, unpaid: [], needAtStart: null };
  // v7.49 : un achat d’avant peut demander du temps pour l’obtenir (minutes), d’autres achats ou des missions faites avant
  // (requires), et coûter à chaque partie une fois possédé (usagePerSession). Une mission peut être une mission de
  // déblocage faite une seule fois (once), déjà faite (done), et demander d’autres missions faites avant (requiresMissions).
  // Le but « avoir une somme » dit ce qu’il vise : argent disponible après l’argent gardé de côté (« available », comme
  // avant), argent détenu en tout (« held », la réserve comprise mais jamais entamée) ou gains cumulés (« cumulative »).
  function missionPrep(p) {
    var capital = money(p.capital, 'l’argent que tu as');
    var reserve = money(p.reserve, 'l’argent mis de côté', 0);
    if (reserve > capital) throw new Error('L’argent gardé de côté dépasse ce que tu as.');
    var continuous = p.sessionMinutes === null || p.sessionMinutes === undefined;
    var sessionMinutes = continuous ? null : number(p.sessionMinutes, 'la durée d’une partie', 1440, { positive: true });
    var daysPerWeek = number(p.daysPerWeek, 'les jours par semaine', 7, { defaultValue: 7, integer: true, positive: true });
    var upkeep = money(p.upkeepPerSession, 'les dépenses par partie', 0);
    var hourly = money(p.hourly, 'ce que tu gagnes par heure', 0);
    var unitsHourly = number(p.unitsHourly, 'les points par heure', MONEY_MAX, { defaultValue: 0 });
    var maxRepeat = number(p.maxRepeat, 'le nombre de fois à la suite', SESSION_MAX_RUNS, { defaultValue: SESSION_MAX_RUNS, positive: true, integer: true });
    var goalPrice = p.goalPrice == null ? null : money(p.goalPrice, 'le prix du but');
    var goalTarget = p.target == null ? null : money(p.target, 'la somme visée');
    var goalUnits = p.targetUnits == null ? null : number(p.targetUnits, 'les points à atteindre', MONEY_MAX);
    var units = number(p.currentUnits, 'tes points actuels', MONEY_MAX, { defaultValue: 0 });
    var meaning = ['held', 'available', 'cumulative'].indexOf(p.goalMeaning) >= 0 ? p.goalMeaning : 'available';
    if (goalPrice === null && goalTarget === null && goalUnits === null) throw new Error('Dis-moi ton but : un achat avec son prix, une somme à avoir, ou des points à atteindre.');
    var list = Array.isArray(p.activities) ? p.activities : [];
    if (list.length > 12) throw new Error('Choisis douze missions au maximum.');
    /* lot 2 (C6) : « une fois acheté, il me fera gagner en plus » du but, lu par le moteur (remboursement calculé ici). */
    var goalIncome = p.goalIncomeHourly == null ? 0 : money(p.goalIncomeHourly, 'ce que rapporte le but');
    var acts = list.map(function (entry, index) {
      var r = activity(entry);
      if (!r.valid) throw new Error('Mission ' + (index + 1) + (entry && typeof entry.name === 'string' && entry.name.trim() ? ' (' + entry.name.trim().slice(0, 40) + ')' : '') + ' : ' + r.reason);
      return { id: typeof entry.id === 'string' ? entry.id : String(index), name: typeof entry.name === 'string' && entry.name.trim() ? entry.name.trim().slice(0, 120) : 'Mission ' + (index + 1), entry: entry, res: r, requires: Array.isArray(entry.requiresPurchaseIds) ? entry.requiresPurchaseIds : [], requiresMissions: Array.isArray(entry.requiresMissions) ? entry.requiresMissions : [], once: entry.once === true, done: entry.done === true, paid: entry.owned === true || !(entry.investment > 0) };
    });
    var purchases = (Array.isArray(p.purchases) ? p.purchases : []).map(function (x, i) { x = data(x); var nm = typeof x.name === 'string' && x.name.trim() ? x.name.trim().slice(0, 120) : 'Achat ' + (i + 1); return { id: typeof x.id === 'string' ? x.id : 'achat-' + i, name: nm, price: money(x.price, 'le prix de l’achat « ' + nm.slice(0, 40) + ' »'), boostHourly: money(x.boostHourly, 'ce que rapporte l’achat ' + (i + 1), 0), minutes: number(x.minutes, 'le temps pour obtenir « ' + nm.slice(0, 40) + ' »', MINUTES_MAX, { defaultValue: 0 }), usage: money(x.usagePerSession, 'ce que coûte « ' + nm.slice(0, 40) + ' » à chaque partie', 0), requires: Array.isArray(x.requires) ? x.requires.filter(function (id) { return typeof id === 'string'; }) : [], owned: x.owned === true, at: null, atMinute: null, before: false }; });
    if (purchases.length > 20) throw new Error('Vingt achats maximum avant le but.');
    /* lot 2 (J) : un achat d’avant qui rapporte est une source de revenu : le refus « comment tu gagnes » vient après les achats. */
    if (!list.length && !(hourly > 0) && !(unitsHourly > 0) && !purchases.some(function (x) { return !x.owned && x.boostHourly > 0; })) throw new Error('Dis-moi comment tu gagnes ton argent : choisis au moins une mission, ou écris ce que tu gagnes par heure.');
    if (continuous && (upkeep > 0 || purchases.some(function (x) { return x.usage > 0; }))) throw new Error('Des dépenses « par partie » demandent la durée d’une partie : écris-la, ou mets ces dépenses à 0.');
    if (goalUnits !== null && units < goalUnits - 1e-9 && !(unitsHourly > 0) && !acts.some(function (a) { return a.res.units > 0; })) throw new Error('Aucune de tes missions ne donne de points : écris les points gagnés par mission (ou par heure), sinon le but ne peut pas être atteint.');
    /* lot 2 (C7) : journal complet sauf journal:false (calculs exploratoires) ; possédés au départ et achats à faire, figés avant tout calcul. */
    var c = { capital: capital, reserve: reserve, continuous: continuous, sessionMinutes: sessionMinutes, daysPerWeek: daysPerWeek, upkeep: upkeep, hourly: hourly, unitsHourly: unitsHourly, maxRepeat: maxRepeat, goalPrice: goalPrice, goalTarget: goalTarget, goalUnits: goalUnits, units: units, meaning: meaning, acts: acts, purchases: purchases, names: knownNames(p, purchases),
      /* correctif lot 2 (ARI2-4) : identifiants connus comme missions, même retirées par un plan de secours « Seulement … » : un message dit « la mission (…) », jamais « un achat (…) ». */
      missionIds: acts.concat(Array.isArray(p.knownMissions) ? p.knownMissions.filter(function (id) { return typeof id === 'string'; }).map(function (id) { return { id: id }; }) : []).reduce(function (o, a) { o[a.id] = true; return o; }, {}),
      goalIncome: goalIncome, journal: p.journal !== false, owned0: purchases.filter(function (x) { return x.owned; }).map(function (x) { return x.id; }).concat(acts.filter(function (a) { return a.done; }).map(function (a) { return a.id; })), after: purchases.filter(function (x) { return !x.owned; }).map(function (x) { return x.id; }) };
    missionChecks(c);
    return c;
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
      var best = full, bestKeep = null, bestSub = null, better = function (r) { return r.valid && r.reached && (!best.valid || !best.reached || r.totalMinutes < best.totalMinutes - 1e-9 || (Math.abs(r.totalMinutes - best.totalMinutes) < 1e-9 && r.finalCash > best.finalCash)); };
      subsets.forEach(function (keep) {
        var key = keep.map(function (a) { return a.id; }).sort().join('|'); if (seen[key]) return; seen[key] = true;
        var ids = {}; keep.forEach(function (a) { ids[a.id] = true; });
        var sub = (p.activities || []).filter(function (a) { return a.once || ids[a.id]; });
        /* lot 2 (C7.7) : les sous-ensembles sont explorés sans journal ; le meilleur est recalculé une fois avec. */
        var r; try { r = missionFlow(missionPrep(Object.assign({}, p, { activities: sub, journal: false }))); } catch (e) { return; }
        if (better(r)) { best = r; bestKeep = keep; bestSub = sub; }
      });
      if (bestKeep) {
        best = missionFlow(missionPrep(Object.assign({}, p, { activities: bestSub })));
        var left = acts.filter(function (a) { return bestKeep.indexOf(a) < 0; }).map(function (a) { return '« ' + a.name + ' »'; });
        best = Object.assign({}, best, { method: 'flow-subset', leftOut: left, note: (best.note ? best.note + ' ' : '') + 'Parcours le plus rapide en laissant de côté ' + left.join(', ') + ' : ' + (left.length > 1 ? 'elles ralentissaient' : 'elle ralentissait') + ' l’ensemble' + (full.valid && full.reached ? ' (' + Math.round(full.totalMinutes) + ' min avec toutes tes missions)' : '') + '.' });
      }
      return best;
    } catch (error) { return fail(missionShape, error.message); }
  }
  // Commun aux deux modes : état, but, achats, grand livre.
  /* lot 2 : plafond du journal complet (entrées d’argent, occupations et points de contrôle, en ordre d’insertion). */
  var JOURNAL_MAX = 60000;
  function missionState(c) {
    var st = { cash: c.capital, units: c.units, earned: 0, boost: 0, upkeepOwned: 0, owned: {}, done: {}, events: [], low: { cash: c.capital, at: 'Départ' }, receipts: 0, spends: 0, route: [],
      /* lot 2 : journal daté en absolu (at = minutes de jeu depuis le départ, session = partie en cours), obtentions en attente, achats de départ déjà payés. */
      journal: [], complete: true, at: 0, session: 1, journalOn: c.journal !== false, acq: [], invPaid: {} };
    c.purchases.forEach(function (x) { if (x.owned) { st.owned[x.id] = true; st.boost += x.boostHourly; st.upkeepOwned += x.usage; } });
    c.acts.forEach(function (a) { if (a.done) st.done[a.id] = true; });
    return st;
  }
  function goalMoneyOf(c) { return (c.goalPrice !== null ? c.goalPrice : 0) + (c.goalTarget !== null ? c.goalTarget : 0); }
  function reachedOf(c, st) {
    /* lot 2 : le but exige les achats d’avant (H) ; un achat retiré par une stratégie n’est pas dans c.purchases. */
    if (c.purchases.some(function (x) { return !x.owned; })) return false;
    if (c.goalUnits !== null && st.units < c.goalUnits - 1e-9) return false;
    var need = goalMoneyOf(c);
    if (c.goalTarget !== null && c.goalPrice === null) {
      if (c.meaning === 'held') return st.cash >= need - 1e-9;
      if (c.meaning === 'cumulative') return st.earned >= need - 1e-9;
    }
    return subtract(st.cash, c.reserve) >= need - 1e-9;
  }
  /* lot 2 : argent qu’il manque encore pour le but (sens du but compris), sans les achats ; null si le but est en points seulement. */
  function goalNeedOf(c, st) {
    if (c.goalPrice === null && c.goalTarget === null) return null;
    if (c.meaning === 'cumulative' && c.goalPrice === null) return Math.max(0, goalMoneyOf(c) - st.earned);
    return goalMoneyOf(c) + (c.meaning === 'held' && c.goalPrice === null ? 0 : c.reserve) - st.cash;
  }
  function journalPush(st, e) { if (!st.journalOn) return; if (st.journal.length < JOURNAL_MAX) st.journal.push(e); else st.complete = false; }
  function withMeta(e, meta) { if (meta) Object.keys(meta).forEach(function (k) { if (meta[k] !== undefined) e[k] = meta[k]; }); return e; }
  /* lot 2 : chaque événement d’argent porte aussi at (minutes absolues), session, et les champs utiles au vérificateur (needs, unlocks,
     asset, id, passive, minutes, upkeep). Avec le journal : events et journal reçoivent le même objet, chacun plafonné à JOURNAL_MAX ;
     sans journal (journal:false, calculs exploratoires) : events plafonné à 600 comme avant, journal vide et incomplet. */
  function ledgerAdd(st, t, type, amount, label, meta) {
    if (!(amount > 0)) return;
    if (type === 'spend') { st.cash = subtract(st.cash, amount); st.spends += amount; if (st.cash < st.low.cash - 1e-9) st.low = { cash: st.cash, at: label, t: t }; }
    else { st.cash += amount; st.receipts += amount; }
    var e = withMeta({ t: t, type: type, amount: amount, label: label, cash: st.cash, at: st.at + t, session: st.session }, meta);
    if (st.journalOn) { if (st.events.length < JOURNAL_MAX) st.events.push(e); journalPush(st, e); }
    else if (st.events.length < 600) st.events.push(e);
  }
  /* lot 2 : occupation (mission ou obtention d’un achat) et point de contrôle (fin de partie), dans le journal seulement. */
  function actAdd(st, at, until, meta) { journalPush(st, withMeta({ kind: 'act', at: at, until: until, session: st.session }, meta)); }
  function checkAdd(st, at, session) { journalPush(st, { kind: 'check', at: at, session: session === undefined ? st.session : session }); }
  function satisfied(ids, st) { return ids.every(function (id) { return st.owned[id] || st.done[id]; }); }
  // Achats d’avant dans l’ordre donné (la stratégie) : on paie dès que possible, sans jamais descendre sous la réserve ;
  // un achat dont les prérequis ne sont pas faits attend, et ceux d’après aussi (l’ordre est respecté).
  function buyPurchases(c, st, t, session, where, advance) {
    var bought = [], cursor = t;
    for (var k = 0; k < c.purchases.length; k += 1) {
      var x = c.purchases[k]; if (x.owned) continue;
      if (!satisfied(x.requires, st)) break;
      /* lot 3 (ARI-4 du lot 2) : un achat qui demande un autre achat attend que celui-ci soit OBTENU (fin de son obtention), pas seulement payé */
      if (x.requires.some(function (id) { return (st.acq || []).some(function (q) { return q.id === id && q.left > 1e-9; }); })) break;
      if (subtract(st.cash, c.reserve) < x.price - 1e-9) break;
      /* lot 3 : la dépense porte les achats qu’elle demande (needs) : le vérificateur contrôle qu’ils sont possédés avant le paiement (R3) */
      var needP = x.requires.filter(function (id) { return c.purchases.some(function (y) { return y.id === id; }); });
      ledgerAdd(st, cursor, 'spend', x.price, 'Achat « ' + x.name + ' »', { asset: true, id: x.id, unlocks: x.minutes > 0 ? undefined : x.id, needs: needP.length ? needP : undefined });
      x.owned = true; x.at = session; x.atMinute = cursor; x.before = where === 'before'; st.owned[x.id] = true; st.boost += x.boostHourly; st.upkeepOwned += x.usage;
      bought.push(x);
      st.route.push({ type: 'acquire', id: x.id, name: x.name, session: session, start: cursor, minutes: x.minutes, spend: x.price, receive: 0, cashAfter: st.cash, requires: x.requires.slice(), where: where });
      /* lot 2 : une obtention immédiate rend l’achat possédé à la dépense (unlocks sur la dépense) ; une obtention qui dure occupe le
         temps de jeu et ne rend l’achat possédé qu’à sa fin (unlocks sur l’occupation) : en parcours tout de suite, en parties au début
         de la partie suivante (file st.acq). */
      if (x.minutes > 0 && advance) { actAdd(st, st.at + cursor, st.at + cursor + x.minutes, { id: x.id, blocking: true, unlocks: x.id }); cursor += x.minutes; }
      else if (x.minutes > 0) { st.acq.push({ id: x.id, left: x.minutes }); if (!(x.price > 0)) actAdd(st, st.at + cursor, st.at + cursor, { id: x.id }); /* correctif lot 2 : achat gratuit à obtenir : aucune dépense inscrite (montant 0) ; une occupation de durée 0 date son paiement pour le coût d’usage (R10) ; la possession reste datée par la fin de l’obtention */ }
      else if (!(x.price > 0)) actAdd(st, st.at + cursor, st.at + cursor, { id: x.id, unlocks: x.id }); /* achat gratuit : aucune dépense inscrite, la possession vient d’une occupation de durée 0 */
    }
    return bought;
  }
  /* lot 2 : une exécution d’une mission dans le grand livre : occupation (needs = ce qu’elle demande, + son achat de départ dès la
     2e fois), frais à son début, achat de départ séparé (une seule fois, asset), récompense à sa fin. */
  function runStep(c, st, a, start, end, cost, invest, reward, n, unlocks) {
    var tag = c.continuous ? '' : ' (partie ' + n + ')';
    var needs = a.requires.concat(a.requiresMissions); if (st.invPaid[a.id]) needs = needs.concat(['inv:' + a.id]);
    actAdd(st, st.at + start, st.at + end, { id: a.id, needs: needs.length ? needs.slice() : undefined, unlocks: unlocks });
    ledgerAdd(st, start, 'spend', cost, 'Frais de « ' + a.name + ' »' + tag, { needs: needs.length ? needs.slice() : undefined });
    if (invest > 0) { ledgerAdd(st, start, 'spend', invest, 'Achat de départ de « ' + a.name + ' »' + tag, { asset: true, id: 'inv:' + a.id, unlocks: 'inv:' + a.id }); st.invPaid[a.id] = true; }
    ledgerAdd(st, end, 'receive', reward, 'Récompense de « ' + a.name + ' »' + tag);
    st.earned += reward - cost;
  }
  function runOnce(c, st, a, t, session) {
    var invest = a.paid ? 0 : a.entry.investment || 0, cost0 = a.entry.cost || 0, cost = cost0 + invest;
    var end = t + a.res.activeMinutes, reward = (a.entry.reward || 0) * (a.entry.share === undefined ? 100 : a.entry.share) / 100;
    runStep(c, st, a, t, end, cost0, invest, reward, session, a.id);
    a.paid = true; st.done[a.id] = true; st.units += a.res.units > 0 ? a.res.units : 0;
    st.route.push({ type: 'unlock', id: a.id, name: a.name, session: session, start: t, minutes: a.res.activeMinutes, spend: cost, receive: reward, cashAfter: st.cash, requires: a.requires.concat(a.requiresMissions) });
    return end;
  }
  function onceReady(c, st, a) { return a.once && !st.done[a.id] && satisfied(a.requires, st) && satisfied(a.requiresMissions, st); }
  /* correctif lot 2 (ARI5-1) : tout ce qu’un achat d’avant impayé attend encore, de proche en proche (achats et missions qu’il demande, et ce
     qu’elles demandent) : sans ces missions « une fois », le but ne se fera pas (C2 : le but exige les achats d’avant). */
  function neededIds(c, st) {
    var need = {}, stack = [];
    c.purchases.forEach(function (x) { if (!x.owned) x.requires.forEach(function (id) { stack.push(id); }); });
    while (stack.length) {
      var id = stack.pop(); if (need[id] || st.owned[id] || st.done[id]) continue; need[id] = true;
      c.acts.filter(function (y) { return y.id === id; }).forEach(function (a) { a.requires.concat(a.requiresMissions).forEach(function (r) { stack.push(r); }); });
      c.purchases.filter(function (y) { return y.id === id; }).forEach(function (x) { x.requires.forEach(function (r) { stack.push(r); }); });
    }
    return need;
  }
  function affordableStart(c, st, a) { var invest = a.paid ? 0 : a.entry.investment || 0; return subtract(st.cash, c.reserve) >= (a.entry.cost || 0) + invest - 1e-9; }
  // « un achat (Garage) », « la mission (Déblocage) » : ce qui manque, dit avec les noms.
  // Noms des achats, même retirés d’un plan de secours (« Sans les achats d’avant ») : un message ne montre jamais un identifiant.
  function knownNames(p, purchases) { var names = {}; purchases.forEach(function (x) { names[x.id] = x.name; }); var k = p.knownNames && typeof p.knownNames === 'object' ? p.knownNames : {}; Object.keys(k).forEach(function (id) { if (typeof k[id] === 'string' && !names[id]) names[id] = k[id].slice(0, 120); }); return names; }
  function lockedReason(c, st, a) {
    var need = (a.requires || []).filter(function (id) { return !st.owned[id] && !st.done[id]; }).map(function (id) { var x = c.purchases.filter(function (y) { return y.id === id; })[0]; var m = c.acts.filter(function (y) { return y.id === id; })[0]; return x ? { k: 'p', n: x.name } : m ? { k: 'm', n: m.name } : { k: c.missionIds && c.missionIds[id] ? 'm' : 'p', n: (c.names && c.names[id]) || id }; });
    (a.requiresMissions || []).filter(function (id) { return !st.done[id]; }).forEach(function (id) { var x = c.acts.filter(function (y) { return y.id === id; })[0]; need.push({ k: 'm', n: x ? x.name : (c.names && c.names[id]) || id }); });
    var ps = need.filter(function (x) { return x.k === 'p'; }).map(function (x) { return x.n; }), ms = need.filter(function (x) { return x.k === 'm'; }).map(function (x) { return x.n; });
    return [(ps.length ? (ps.length > 1 ? 'des achats (' : 'un achat (') + ps.join(', ') + ')' : '') + (ps.length && ms.length ? ' et ' : '') + (ms.length ? (ms.length > 1 ? 'les missions (' : 'la mission (') + ms.join(', ') + ')' : '')];
  }
  /* lot 2 (J) : pourquoi le plan n’avance plus à cause du premier achat non possédé, dit pareil dans les deux modes (phrases du
     parcours v7.52) : ses prérequis ne peuvent pas se faire, ou l’argent manque et rien ne rapporte sans lui. Sinon null. */
  function stuckReason(c, st) {
    var nb = c.purchases.filter(function (x) { return !x.owned; })[0];
    if (!nb) return null;
    var isMission = function (id) { return c.acts.some(function (y) { return y.id === id; }) || !!(c.missionIds && c.missionIds[id]); };
    if (!satisfied(nb.requires, st)) return 'L’achat « ' + nb.name + ' » attend d’abord ' + lockedReason(c, st, { requires: nb.requires.filter(function (id) { return !isMission(id); }), requiresMissions: nb.requires.filter(isMission) }).join(', ') + ', qui ne peut pas se faire.';
    if (subtract(st.cash, c.reserve) < nb.price - 1e-9) return 'Il manque ' + dollars(Math.max(0, nb.price + c.reserve - st.cash).toLocaleString('fr-FR'), ' ') + ' pour « ' + nb.name + ' », et aucune mission possible sans lui ne rapporte : ajoute une mission faisable maintenant (financement), ou baisse la réserve.';
    return null;
  }
  /* lot 2 : un achat non possédé qui demande quelque chose qui n’existe ni parmi les achats ni parmi les missions de ce plan
     (retiré par une stratégie) ne se fera jamais : on le dit tout de suite plutôt que de jouer 400 parties.
     Correctif lot 2 (ARI2-1) : même règle pour ce que ce plan ne pourra jamais satisfaire — un achat listé après l’achat qui attend
     (l’ordre donné est tenu : rien ne s’achète tant qu’il attend), une mission répétable (jamais « faite »), une mission « une fois »
     plus longue que la partie, ou une mission qui demande elle-même l’impossible. Les deux modes répondent pareil, tout de suite,
     au lieu de « réduis le but » après 400 parties ou 20 000 étapes avec l’argent du but déjà en poche. */
  function impossibleReq(c, st, id, seen) {
    if (st.owned[id] || st.done[id]) return false;
    if (seen[id]) return true;
    seen[id] = true;
    if (c.purchases.some(function (y) { return y.id === id; })) return true;
    var a = c.acts.filter(function (y) { return y.id === id; })[0];
    if (!a || !a.once) return true;
    if (!c.continuous && a.res.activeMinutes > c.sessionMinutes + 1e-9) return true;
    return a.requires.concat(a.requiresMissions).some(function (r) { return impossibleReq(c, st, r, seen); });
  }
  function neverSatisfied(c, st) {
    var nb = c.purchases.filter(function (x) { return !x.owned; })[0];
    return !!nb && nb.requires.some(function (id) { return impossibleReq(c, st, id, {}); });
  }
  /* lot 2 (C2.3) : références absentes et dépendances circulaires refusées avant tout calcul, avec les phrases de M.prerequisites.
     Achats : requires vers un achat, une mission ou un nom connu (achat retiré par une stratégie) ; missions : requiresMissions vers
     une mission ou un nom connu (mission retirée par un plan de secours « Seulement … ») ; les requiresPurchaseIds d’une mission
     vers un achat retiré restent « demande d’abord un achat (…) ». */
  function missionChecks(c) {
    var nodes = {};
    c.purchases.forEach(function (x) { nodes['p:' + x.id] = { name: x.name, leaf: x.owned, edges: [] }; });
    c.acts.forEach(function (a) { nodes['m:' + a.id] = { name: a.name, leaf: a.done, edges: [] }; });
    var isP = function (id) { return !!nodes['p:' + id]; }, isM = function (id) { return !!nodes['m:' + id]; };
    c.purchases.forEach(function (x) { if (x.owned) return; x.requires.forEach(function (id) {
      if (isP(id)) nodes['p:' + x.id].edges.push('p:' + id); else if (isM(id)) nodes['p:' + x.id].edges.push('m:' + id);
      else if (!(c.names && c.names[id])) throw new Error('Référence absente : « ' + id + ' » n’existe pas dans les données.');
    }); });
    c.acts.forEach(function (a) { if (a.done) return;
      a.requiresMissions.forEach(function (id) { if (isM(id)) nodes['m:' + a.id].edges.push('m:' + id); else if (!(c.names && c.names[id])) throw new Error('Référence absente : « ' + id + ' » n’existe pas dans les données.'); });
      a.requires.forEach(function (id) { if (isP(id)) nodes['m:' + a.id].edges.push('p:' + id); });
    });
    var state = {};
    function visit(key, path) {
      var n = nodes[key]; if (n.leaf || state[key] === 'done') return;
      if (state[key] === 'active') { var at = path.indexOf(key); throw new Error('Dépendance circulaire : ' + path.slice(at).concat(key).map(function (k) { return nodes[k].name; }).join(' → ') + '.'); }
      state[key] = 'active'; n.edges.forEach(function (e) { visit(e, path.concat(key)); }); state[key] = 'done';
    }
    c.purchases.forEach(function (x) { visit('p:' + x.id, []); });
    c.acts.forEach(function (a) { visit('m:' + a.id, []); });
  }
  function missionResult(c, st, sessions, extra) {
    var ok = reachedOf(c, st) && !(extra.pendingAcquisition > 1e-9), total = sessions.length;
    var days = c.continuous ? null : calendarDays(total, c.daysPerWeek);
    var phases = [];
    sessions.forEach(function (se) {
      var key = se.steps.map(function (s2) { return s2.id + '×' + s2.runs; }).join('|') + '#' + Math.round(se.gain) + '#' + (se.acquisitions || []).map(function (a) { return a.id + ':' + Math.round(a.minutes); }).join(',') + '#' + Math.round(se.boostPart || 0);
      var last = phases[phases.length - 1];
      if (last && last.key === key && !last.purchasesAfter.length && !(se.purchasesBefore || []).length && !(se.onceSteps || []).length) { last.to = se.index; last.count += 1; last.cashAfter = se.cashAfter; last.unitsAfter = se.unitsAfter; last.purchasesAfter = se.purchasesAfterOnly.slice(); }
      else phases.push({ key: key, from: se.index, to: se.index, count: 1, steps: se.steps, gain: se.gain, unitsGain: se.unitsGain, cashBefore: se.cashBefore, cashAfter: se.cashAfter, unitsAfter: se.unitsAfter, purchasesAfter: se.purchasesAfterOnly.slice(), purchasesBefore: (se.purchasesBefore || []).slice(), onceSteps: (se.onceSteps || []).slice(), acquisitions: (se.acquisitions || []).slice(), acquisitionMinutes: se.acquisitionMinutes || 0, hourlyPart: se.hourlyPart || 0, boostPart: se.boostPart || 0, boosters: (se.boosters || []).slice(), upkeep: se.upkeep || 0 });
    });
    /* lot 2 (C2.4) : ce qui manque compte les achats d’avant non payés (U) ; unpaid les nomme. */
    var unpaid = c.purchases.filter(function (x) { return !x.owned; }).map(function (x) { return { id: x.id, name: x.name, price: x.price }; });
    var U = unpaid.reduce(function (s2, x) { return s2 + x.price; }, 0), sum = c.goalTarget !== null && c.goalPrice === null;
    var missing = sum && c.meaning === 'held' ? Math.max(0, goalMoneyOf(c) + U - st.cash)
      : sum && c.meaning === 'cumulative' ? Math.max(0, goalMoneyOf(c) - st.earned, U + c.reserve - st.cash)
      : Math.max(0, goalMoneyOf(c) + c.reserve + U - st.cash);
    /* correctif lot 2 (PER5-1) : le manque au départ (même formule que missing, sur l’état initial : argent de départ, rien de gagné, tous les achats
       d’avant impayés U0), lu par l’affichage (« il te manque X $ ») pour les trois sens du but, au lieu d’être recalculé là-bas sans les achats. */
    var U0 = c.purchases.filter(function (x) { return c.after.indexOf(x.id) >= 0; }).reduce(function (s2, x) { return s2 + x.price; }, 0);
    var needAtStart = sum && c.meaning === 'held' ? Math.max(0, goalMoneyOf(c) + U0 - c.capital)
      : sum && c.meaning === 'cumulative' ? Math.max(0, goalMoneyOf(c), U0 + c.reserve - c.capital)
      : Math.max(0, goalMoneyOf(c) + c.reserve + U0 - c.capital);
    var conserved =Math.abs(c.capital + st.receipts - st.spends - st.cash) <= 1e-6 * Math.max(1, Math.abs(st.cash));
    /* correctif lot 2 (ARI2-1) : « non atteint » avec l’argent du but en poche (manque 0) et des achats d’avant jamais payés : la vraie
       cause est l’achat qui attend, jamais « réduis le but ». */
    /* correctif lot 2 (ARI3-3) : « non atteint » avec l’argent du but en poche (manque 0) et une obtention encore en cours après la dernière
       partie : la vraie cause est l’obtention, dite avec le temps de jeu restant (pendingAcquisitions, pendingAcquisitionMinutes), jamais
       « réduis le but ». En parcours, l’obtention est toujours prise en entier (file vide). */
    var pendingList = (st.acq || []).filter(function (q) { return q.left > 1e-9; }).map(function (q) { var x = c.purchases.filter(function (y) { return y.id === q.id; })[0]; return { id: q.id, name: x ? x.name : q.id, minutes: q.left }; });
    var pendingMinutes = pendingList.reduce(function (s2, q) { return s2 + q.minutes; }, 0);
    var failNote = !ok && pendingMinutes > 1e-9 && missing <= 1e-9 ? 'L’obtention de « ' + pendingList[0].name + ' » n’est pas finie après ' + MISSION_MAX_SESSIONS + ' parties (' + durationText(pendingMinutes / 60) + ' de jeu restants) : allonge tes parties.'
      : !ok && unpaid.length && missing <= 1e-9 ? stuckReason(c, st) || extra.failNote : extra.failNote;
    return finish({ sessions: sessions, totalSessions: c.continuous ? null : total, totalMinutes: extra.totalMinutes, activeMinutes: extra.activeMinutes, acquisitionMinutes: extra.acquisitionMinutes || 0, pendingAcquisitions: pendingList, pendingAcquisitionMinutes: pendingMinutes, days: days, weeks: c.continuous ? null : total === 0 ? 0 : ceil(total / c.daysPerWeek),
      phases: phases.map(function (ph) { return { from: ph.from, to: ph.to, count: ph.count, steps: ph.steps, gain: ph.gain, unitsGain: ph.unitsGain, cashBefore: ph.cashBefore, cashAfter: ph.cashAfter, unitsAfter: ph.unitsAfter, purchasesAfter: ph.purchasesAfter, purchasesBefore: ph.purchasesBefore, onceSteps: ph.onceSteps, acquisitions: ph.acquisitions, acquisitionMinutes: ph.acquisitionMinutes, hourlyPart: ph.hourlyPart, boostPart: ph.boostPart, boosters: ph.boosters, upkeep: ph.upkeep }; }),
      /* lot 2 (C6) : remboursement d’un achat qui rapporte, calculé ici (null = aucun délai fini, jamais « 0 h »). */
      purchases: c.purchases.map(function (x) { return { id: x.id, name: x.name, price: x.price, boostHourly: x.boostHourly, minutes: x.minutes, usagePerSession: x.usage, atSession: x.at, atMinute: x.atMinute, before: x.before, owned: x.owned, paybackHours: x.boostHourly > 0 && x.price > 0 ? x.price / x.boostHourly : null }; }),
      reached: ok, finalCash: st.cash, finalUnits: st.units, missing: ok ? 0 : missing, needAtStart: needAtStart, missingUnits: c.goalUnits === null ? 0 : Math.max(0, c.goalUnits - st.units), unpaid: unpaid, averagePerSession: c.continuous ? null : total ? subtract(st.cash, c.capital) / total : null, goalMoney: goalMoneyOf(c), startCash: c.capital, startUnits: c.units, limited: extra.limited || !ok,
      note: ok ? (extra.limited ? extra.limitNote : null) : failNote,
      goalIncomeHourly: c.goalIncome, goalPaybackHours: c.goalPrice !== null && c.goalPrice > 0 && c.goalIncome > 0 ? c.goalPrice / c.goalIncome : null,
      route: st.route, events: st.events, journal: st.journal, journalComplete: !!(st.journalOn && st.complete),
      /* lot 2 (C7.6) : ce que le vérificateur indépendant doit savoir du plan, sans rien lire de sa conclusion. */
      rules: { reserve: c.reserve, sessionMinutes: c.sessionMinutes, hourly: c.hourly, upkeepPerSession: c.upkeep, purchases: c.purchases.map(function (x) { return { id: x.id, boostHourly: x.boostHourly, usagePerSession: x.usage }; }), owned0: c.owned0.slice(), after: c.after.slice(), meaning: c.meaning, goalMoney: goalMoneyOf(c), goalPrice: c.goalPrice, units: c.goalUnits !== null },
      lowPoint: { cash: st.low.cash, at: st.low.at, t: st.low.t === undefined ? null : st.low.t }, earned: st.earned, conserved: conserved, continuous: c.continuous, goalMeaning: c.meaning, onceDone: Object.keys(st.done), method: extra.method }, missionShape);
  }
  // Mode « parties » (comme avant) : partie après partie ; achats au début de la partie 1 si possible, puis entre deux
  // parties ; le temps d’obtention d’un achat se prend au début de la partie suivante ; missions de déblocage d’abord.
  function missionSessions(c) {
    var st = missionState(c), sessions = [], totalActive = 0, totalAcq = 0, limited = false, lastUsed = {};
    var carryOf = function () { return st.acq.reduce(function (s2, q) { return s2 + q.left; }, 0); };
    var first = buyPurchases(c, st, 0, 1, 'before');
    checkAdd(st, 0, 0);
    if (neverSatisfied(c, st)) return fail(Object.assign({}, missionShape, { route: st.route }), stuckReason(c, st));
    /* lot 2 (C2.2) : la boucle continue tant que le but n’est pas atteint OU qu’une obtention est en cours (H). */
    for (var n = 1; n <= MISSION_MAX_SESSIONS && !(reachedOf(c, st) && carryOf() <= 1e-9); n += 1) {
      st.at = (n - 1) * c.sessionMinutes; st.session = n;
      /* lot 2 (C5) : une mission jouée à une partie d’avant dont l’attente dépasse la pause jusqu’à cette partie (k parties plus tard : k × 1 440 − S)
         n’est pas prête. Correctif lot 2 (ARI5-3) : elle est simplement écartée de la partie (une autre mission peut suffire, ou le but est déjà
         atteint et seule une obtention reste) ; le refus « attente plus longue que la pause » (phrase de Mon objectif) ne vient que si la partie
         n’avance plus sans elle (T2-10). Avant, tout le plan était refusé dès qu’elle avait été jouée à la partie d’avant. */
      var notReady = c.acts.filter(function (a) { return !a.once && lastUsed[a.id] !== undefined && a.res.cycleMinutes - a.res.activeMinutes > (n - lastUsed[a.id]) * 1440 - c.sessionMinutes; });
      /* correctif lot 2 (ARI5-3) : but déjà atteint (la boucle ne continue que pour finir une obtention) : la partie ne sert qu’à l’obtention, aucune mission
         n’est planifiée — sauf si les dépenses de la partie dépassent le gain par heure du temps libre (le but retomberait : les missions restent planifiées, comme avant). */
      var onlyAcq = reachedOf(c, st) && (st.boost + c.hourly) * subtract(c.sessionMinutes, Math.min(c.sessionMinutes, carryOf())) / 60 >= c.upkeep + st.upkeepOwned - 1e-9;
      var cashBefore = st.cash, unitsBefore = st.units, tAcq = Math.min(c.sessionMinutes, carryOf()), t = tAcq, onceSteps = [], before = n === 1 ? first.map(function (x) { return x.name; }) : [], acquiring = tAcq > 0;
      /* lot 2 (C3b, C7) : l’obtention en attente occupe le début de la partie, achat par achat, bout à bout ; le dernier morceau
         rend l’achat possédé (unlocks). Pendant ce temps, aucun gain par heure. */
      var taken = []; /* correctif lot 2 (revue 7) : les morceaux d’obtention pris dans cette partie, rendus par la partie et sa phase (l’affichage les nomme) */
      if (tAcq > 0) { var cur = 0, left = tAcq; while (left > 1e-9 && st.acq.length) { var q = st.acq[0], take = Math.min(q.left, left); q.left = subtract(q.left, take); actAdd(st, st.at + cur, st.at + cur + take, { id: q.id, blocking: true, unlocks: q.left <= 1e-9 ? q.id : undefined }); taken.push({ id: q.id, name: (c.purchases.filter(function (y) { return y.id === q.id; })[0] || { name: q.id }).name, minutes: take, done: q.left <= 1e-9 }); cur += take; left = subtract(left, take); if (q.left <= 1e-9) st.acq.shift(); } }
      totalAcq += tAcq;
      // Missions de déblocage prêtes : une seule fois chacune, si elles tiennent dans la partie et se paient.
      for (var guard = 0; guard < c.acts.length; guard += 1) {
        var once = onlyAcq ? null : c.acts.filter(function (a) { return onceReady(c, st, a) && t + a.res.activeMinutes <= c.sessionMinutes + 1e-9 && affordableStart(c, st, a); })[0];
        if (!once) break;
        t = runOnce(c, st, once, t, n); onceSteps.push({ id: once.id, name: once.name });
        totalActive += once.res.activeMinutes;
      }
      var available = onlyAcq ? [] : c.acts.filter(function (a) { return !a.once && notReady.indexOf(a) < 0 && satisfied(a.requires, st) && satisfied(a.requiresMissions, st); });
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
      /* lot 2 (C3b) : aucun gain par heure pendant l’obtention d’un achat (I, H). */
      var passive = (st.boost + c.hourly) * subtract(c.sessionMinutes, tAcq) / 60;
      /* même taux que passive, figé ici (les achats d’après-partie s’ajoutent plus bas) : l’affichage lit ces parts au lieu de les recalculer */
      var boostNow = st.boost, boostersNow = c.purchases.filter(function (x) { return st.owned[x.id] && x.boostHourly > 0; }).map(function (x) { return { id: x.id, name: x.name, boostHourly: x.boostHourly }; });
      var passiveUnits = c.unitsHourly * subtract(c.sessionMinutes, tAcq) / 60;
      var upkeepNow = c.upkeep + st.upkeepOwned;
      var sessionGain = session ? session.profit : 0;
      // Une partie prise par l’obtention d’un achat avance le parcours, même sans gain.
      var progress = sessionGain + passive - upkeepNow > 1e-9 || onceSteps.length > 0 || acquiring || (needUnits && (unitsGain > 0 || passiveUnits > 0));
      /* correctif lot 2 (ARI5-4, préexistant) : un achat de départ qui ne se rembourse pas dans la partie (−200 000 + 100 000) : sessionPlan ne garde
         qu’un programme qui augmente l’argent, donc 0 mission et « Aucune mission ne rentre » (faux), alors que le parcours atteint le but en 420 min.
         Quand la partie n’avance pas autrement, le bien est payé une seule fois, comme en parcours : la mission la plus rentable par minute, payable
         et qui tient dans la partie, est essayée avec son achat de départ compté payé d’avance ; si un programme en sort, la dépense est inscrite au
         début des missions (même entrée de journal que runStep : asset, inv:id) et le programme est joué avec cet achat à 0. Une partie qui avance
         déjà (gain par heure) n’est pas changée : le remboursement d’un achat de départ sur plusieurs parties relève de l’optimisation (lot 3). */
      if (!progress && !session && remaining > 0) {
        var pre = available.filter(function (a) { return !a.paid && a.entry.investment > 0 && a.res.net > 0 && affordableStart(c, st, a) && a.res.activeMinutes <= remaining + 1e-9; })
          .sort(function (a, b) { return b.res.net / b.res.cycleMinutes - a.res.net / a.res.cycleMinutes || c.acts.indexOf(a) - c.acts.indexOf(b); })[0];
        if (pre) {
          var preAmt = pre.entry.investment, sp2 = sessionPlan({ capital: subtract(st.cash, preAmt), reserve: c.reserve, minutes: remaining, maxRepeat: c.maxRepeat, activities: entries.map(function (e) { return e.id === pre.id ? Object.assign({}, e, { investment: 0 }) : e; }) });
          if (sp2.valid && sp2.runs && sp2.breakdown.some(function (b) { return b.id === pre.id && b.runs; })) {
            ledgerAdd(st, t, 'spend', preAmt, 'Achat de départ de « ' + pre.name + ' »' + ' (partie ' + n + ')', { asset: true, id: 'inv:' + pre.id, unlocks: 'inv:' + pre.id }); st.invPaid[pre.id] = true; pre.paid = true;
            session = sp2; used = available.filter(function (a) { return sp2.breakdown.some(function (b) { return b.id === a.id && b.runs; }); }); if (sp2.limited) limited = true; unitsGain = sp2.breakdown.reduce(function (sum, b) { var a = available.filter(function (x) { return x.id === b.id; })[0]; return sum + (a && a.res.units > 0 ? a.res.units * b.runs : 0); }, 0);
            sessionGain = session.profit; progress = sessionGain + passive - upkeepNow > 1e-9 || (needUnits && (unitsGain > 0 || passiveUnits > 0));
          }
        }
      }
      if (!progress) {
        var locked = c.acts.filter(function (a) { return !a.once && available.indexOf(a) < 0; }), pendingOnce = c.acts.filter(function (a) { return a.once && !st.done[a.id]; });
        /* lot 2 : d’abord les dépenses par partie qui mangent le gain (C3e), puis l’achat qui bloque (J, seulement si aucune mission
           n’attend cet achat : la phrase « demande d’abord un achat (…) » reste), puis les raisons d’avant dans leur ordre. */
        var stuck = locked.length ? null : stuckReason(c, st);
        var why = notReady.length ? 'L’attente avant de recommencer est plus longue que la pause entre deux parties. Ce cas n’est pas calculé ici.'
          : sessionGain + passive > 1e-9 && sessionGain + passive - upkeepNow <= 1e-9 ? 'Tes dépenses par partie (' + dollars(Math.round(upkeepNow).toLocaleString('fr-FR')) + ') dépassent ce que rapporte une partie (' + dollars(Math.round(sessionGain + passive).toLocaleString('fr-FR')) + ') : baisse-les, ou choisis des missions qui rapportent plus.'
          : stuck ? stuck
          : n !== 1 ? 'À la partie ' + n + ', plus aucune mission ne rentre ni ne rapporte : vérifie tes missions et tes achats.'
          : needUnits && !(unitsGain > 0 || passiveUnits > 0) && sessionGain + passive - upkeepNow > 1e-9 ? 'Aucune de tes missions ne donne de points : écris les points gagnés par mission (ou par heure).'
          : !available.length && locked.length ? 'Aucune mission n’est possible au départ : « ' + locked[0].name + ' » demande d’abord ' + lockedReason(c, st, locked[0]).join(', ') + '. Ajoute une mission faisable tout de suite, ou coche « je l’ai déjà » sur ce qu’il te faut.'
          : pendingOnce.length && !available.length ? 'La mission de déblocage « ' + pendingOnce[0].name + ' » ne peut pas se faire : ' + (lockedReason(c, st, pendingOnce[0]).length ? 'il faut d’abord ' + lockedReason(c, st, pendingOnce[0]).join(', ') + '.' : 'elle ne tient pas dans une partie ou ses frais dépassent ton argent disponible.')
          : available.length && available.every(function (a) { return !affordableStart(c, st, a); }) ? '« ' + available[0].name + ' » demande ' + dollars(((available[0].entry.cost || 0) + (available[0].paid ? 0 : available[0].entry.investment || 0)).toLocaleString('fr-FR'), ' ') + ' avant de commencer, et il ne te reste que ' + dollars(Math.max(0, subtract(st.cash, c.reserve)).toLocaleString('fr-FR'), ' ') + ' utilisables' + (st.route.some(function (r) { return r.type === 'acquire'; }) ? ' après tes achats d’avant' : '') + ' : baisse l’argent gardé de côté ou ajoute une mission moins chère à lancer.'
          : 'Aucune mission ne rentre dans une partie avec ce que tu as : ajoute du temps, choisis une mission plus courte, ou vérifie tes frais et tes achats.';
        return fail(Object.assign({}, missionShape, { sessions: sessions, route: st.route }), why);
      }
      // Grand livre de la partie : frais avant chaque mission, récompense à la fin ; revenus « par heure » et dépenses par partie à la fin.
      if (session && session.timeline) session.timeline.forEach(function (s2) { var a2 = available.filter(function (x) { return x.id === s2.id; })[0]; runStep(c, st, a2, s2.start + t, s2.end + t, s2.cost, s2.investment, s2.reward, n); });
      else if (session && session.single) {
        var a0 = session.single.a, inv0 = a0.paid ? 0 : a0.entry.investment || 0, rew0 = (a0.entry.reward || 0) * (a0.entry.share === undefined ? 100 : a0.entry.share) / 100, cost0 = a0.entry.cost || 0, t0 = t;
        /* correctif lot 2 (ARI2-5) : préparation « une seule fois » (prepOnce) : dès la 2e répétition, la durée est activeMinutes − prep et
           l’espacement = durée + attente (comme inverse et le parcours) ; avant, chaque répétition était espacée du cycle entier, et les
           actes sortaient de la partie (R8). */
        for (var k0 = 0; k0 < session.runs; k0 += 1) { var dur0 = k0 && a0.entry.prepOnce ? a0.res.activeMinutes - (a0.entry.prep || 0) : a0.res.activeMinutes; runStep(c, st, a0, t0, t0 + dur0, cost0, k0 === 0 ? inv0 : 0, rew0, n); t0 += dur0 + (a0.res.cycleMinutes - a0.res.activeMinutes); }
      }
      ledgerAdd(st, c.sessionMinutes, 'receive', passive, 'Gain par heure (partie ' + n + ')', { passive: true });
      /* lot 2 (C3d) : les dépenses de la partie ne passent jamais sous l’argent gardé de côté : refus nommé. */
      /* correctif lot 2 (ARI5-5) : sans argent gardé de côté (réserve 0), la phrase ne parle ni de « 0 $ gardés de côté » ni de « garder moins de côté » :
         les dépenses de la partie dépassent l’argent qu’il resterait (argent après le gain par heure de la partie, réserve retirée). */
      if (subtract(st.cash, c.reserve) < upkeepNow - 1e-9) return fail(Object.assign({}, missionShape, { sessions: sessions, route: st.route }), c.reserve > 0
        ? 'Les dépenses de la partie ' + n + ' (' + dollars(Math.round(upkeepNow).toLocaleString('fr-FR')) + ') feraient passer ton argent sous les ' + dollars(Math.round(c.reserve).toLocaleString('fr-FR')) + ' gardés de côté : baisse-les, garde moins de côté ou choisis des missions qui rapportent plus.'
        : 'Les dépenses de la partie ' + n + ' (' + dollars(Math.round(upkeepNow).toLocaleString('fr-FR')) + ') dépassent l’argent qu’il te resterait (' + dollars(Math.round(Math.max(0, subtract(st.cash, c.reserve))).toLocaleString('fr-FR')) + ') : baisse-les ou choisis des missions qui rapportent plus.');
      ledgerAdd(st, c.sessionMinutes, 'spend', upkeepNow, 'Dépenses de la partie ' + n, { upkeep: true });
      /* lot 2 (C3a) : « gagné » est net des dépenses par partie et du coût d’usage des achats (comme en parcours, où il n’y en a pas). */
      st.earned = subtract(st.earned + passive, upkeepNow);
      used.forEach(function (a) { a.paid = true; });
      st.units += unitsGain + passiveUnits;
      var active = session ? session.activeMinutes : (c.hourly > 0 || passiveUnits > 0 || st.boost > 0 ? subtract(c.sessionMinutes, t) : 0);
      totalActive += active;
      var boughtAfter = buyPurchases(c, st, c.sessionMinutes, n, 'after');
      checkAdd(st, n * c.sessionMinutes);
      sessions.push({ index: n, steps: session ? session.breakdown.filter(function (b) { return b.runs; }).map(function (b) { return { id: b.id, name: b.name, runs: b.runs, net: b.net }; }) : [], onceSteps: onceSteps, gain: subtract(st.cash + boughtAfter.reduce(function (sum, x) { return sum + x.price; }, 0), cashBefore), passive: passive, upkeep: upkeepNow, cashBefore: cashBefore, cashAfter: st.cash, unitsAfter: st.units, unitsGain: st.units - unitsBefore, purchases: before.concat(boughtAfter.map(function (x) { return x.name; })), purchasesBefore: before, purchasesAfterOnly: boughtAfter.map(function (x) { return x.name; }), activeMinutes: active, acquisitionMinutes: tAcq, acquisitions: taken, hourlyPart: c.hourly * subtract(c.sessionMinutes, tAcq) / 60, boostPart: boostNow * subtract(c.sessionMinutes, tAcq) / 60, boosters: boostersNow });
      used.forEach(function (a) { lastUsed[a.id] = n; });
      if (neverSatisfied(c, st)) return fail(Object.assign({}, missionShape, { sessions: sessions, route: st.route }), stuckReason(c, st));
    }
    var ok = reachedOf(c, st) && carryOf() <= 1e-9;
    return missionResult(c, st, sessions, { totalMinutes: sessions.length * c.sessionMinutes, activeMinutes: totalActive, acquisitionMinutes: totalAcq, pendingAcquisition: carryOf(), limited: limited, limitNote: 'Programme trouvé parmi les séquences explorées à chaque partie ; il peut en exister un plus rapide.', failNote: ok ? null : 'Le but n’est pas atteint en ' + MISSION_MAX_SESSIONS + ' parties : réduis le but, allonge tes parties ou change de missions.', method: 'sessions' });
  }
  // Mode « parcours » (sans durée de partie) : une étape après l’autre, sans calendrier. À chaque étape : acheter ce qui
  // peut l’être (dans l’ordre donné), faire une mission de déblocage prête, sinon la mission répétable qui rapporte le
  // plus par minute parmi celles qui sont possibles maintenant ; on s’arrête dès que le but est atteint. Méthode simple et
  // annoncée : elle ne prétend pas trouver l’optimum.
  function missionFlow(c) {
    var st = missionState(c), t = 0, active = 0, acq = 0, runs = {}, ready = {}, streak = { id: null, n: 0 }, steps = 0, limited = false;
    c.acts.forEach(function (a) { runs[a.id] = 0; ready[a.id] = 0; });
    /* lot 2 (C3c) : l’obtention d’un achat est comptée à part (acquisitionMinutes), plus dans activeMinutes. */
    function acquire() { var b = buyPurchases(c, st, t, 1, 'flow', true); b.forEach(function (x) { t += x.minutes; acq += x.minutes; }); return b.length; }
    /* correctif lot 2 (ARI2-6) : les points par heure courent aussi pendant les missions et les attentes, comme en parties (C3b : seule
       l’obtention d’un achat interrompt le gain) ; avant, seule la branche « gain continu » les créditait. */
    function accrue(dt, label) { if (!(dt > 0)) return; var rate = st.boost + c.hourly; if (rate > 0) { ledgerAdd(st, t, 'receive', rate * dt / 60, label || 'Gain par heure', { passive: true, minutes: dt }); st.earned += rate * dt / 60; } st.units += c.unitsHourly * dt / 60; }
    /* correctif lot 2 (ARI2-1) : un achat d’avant que ce plan ne pourra jamais payer (voir neverSatisfied) est refusé tout de suite,
       comme en parties, au lieu de 20 000 étapes « réduis le but » avec l’argent du but en poche. */
    var stuck = neverSatisfied(c, st);
    while (!stuck && !reachedOf(c, st) && steps < FLOW_MAX_STEPS) {
      steps += 1;
      if (acquire()) { stuck = neverSatisfied(c, st); continue; }
      var once = c.acts.filter(function (a) { return onceReady(c, st, a) && affordableStart(c, st, a); })[0];
      if (once) { t = runOnce(c, st, once, t, 1); active += once.res.activeMinutes; accrue(once.res.activeMinutes); /* correctif lot 2 : le gain par heure court aussi pendant une mission « une fois », comme pendant une mission répétable et comme en parties (C3b : seule l’obtention d’un achat l’interrompt) */ continue; }
      var candidates = c.acts.filter(function (a) { return !a.once && a.res.net > 0 && satisfied(a.requires, st) && satisfied(a.requiresMissions, st) && affordableStart(c, st, a) && !(streak.id === a.id && streak.n >= c.maxRepeat && c.acts.some(function (o) { return o !== a && !o.once && o.res.net > 0 && satisfied(o.requires, st) && satisfied(o.requiresMissions, st); })); });
      if (!candidates.length) {
        var rate = st.boost + c.hourly;
        if (rate > 0 || c.unitsHourly > 0) {
          // Gain continu seulement : on avance jusqu’au prochain achat possible ou jusqu’au but.
          var nextBuy = c.purchases.filter(function (x) { return !x.owned; })[0], needCash = null;
          if (nextBuy && satisfied(nextBuy.requires, st)) needCash = nextBuy.price + c.reserve;
          var goalCash = c.goalPrice !== null || c.goalTarget !== null ? goalMoneyOf(c) + (c.meaning === 'held' && c.goalPrice === null ? 0 : c.reserve) : null;
          /* correctif lot 2 (ARI3-1) : troisième seuil — une mission répétable rentable et débloquée mais pas encore payable (frais + achat de
             départ restant + réserve) : le bloc s’arrête dès qu’elle devient payable et la boucle reprend avec des candidats. Avant, le temps
             avançait d’un seul bloc jusqu’au but au seul gain par heure (1 000 min au lieu de 110 ; les parties répondaient 120). Tolérance
             1e-9 comme affordableStart et buyPurchases : un seuil atteint à l’arrondi près n’est pas revisé. */
          var needMission = c.acts.filter(function (a) { return !a.once && a.res.net > 0 && satisfied(a.requires, st) && satisfied(a.requiresMissions, st) && !affordableStart(c, st, a); })
            .map(function (a) { return (a.entry.cost || 0) + (a.paid ? 0 : a.entry.investment || 0) + c.reserve; }).sort(function (a, b) { return a - b; })[0];
          var target = [needCash, goalCash, needMission === undefined ? null : needMission].filter(function (x) { return x !== null && x > st.cash + 1e-9; }).sort(function (a, b) { return a - b; })[0];
          /* correctif lot 2 (ARI5-1) : quatrième seuil — une mission « une fois » prête mais pas encore payable (frais + achat de départ + réserve) quand
             un achat d’avant impayé l’attend, de proche en proche (le but ne se fera pas sans elle), ou quand elle rapporte (frais et achat de départ
             compris) et finit avant le seuil suivant (le gain par heure court pendant la mission : la faire d’abord n’est jamais plus lent). Avant, le
             bloc sautait au but et le parcours finissait sur « L’achat « P » attend d’abord la mission (M), qui ne peut pas se faire. » (110 min à la
             main, 3 parties de 60 min en parties), ou prenait 200 min là où les parties de 10 min en prennent 160. */
          var onceWait = rate > 0 ? c.acts.filter(function (a) { return a.once && onceReady(c, st, a) && !affordableStart(c, st, a); }).map(function (a) { var inv = a.paid ? 0 : a.entry.investment || 0; return { id: a.id, th: (a.entry.cost || 0) + inv + c.reserve, net: a.res.net - inv, d: a.res.activeMinutes }; }).filter(function (o) { return o.th > st.cash + 1e-9; }) : [];
          if (onceWait.length) {
            var needed = neededIds(c, st);
            var needOnce = onceWait.filter(function (o) { return needed[o.id] || (o.net > 0 && (target === undefined || o.th - st.cash + o.d * rate / 60 <= target - st.cash + 1e-9)); }).map(function (o) { return o.th; }).sort(function (a, b) { return a - b; })[0];
            if (needOnce !== undefined) target = target === undefined ? needOnce : Math.min(target, needOnce);
          }
          var dt = null;
          /* correctif lot 2 (ARI4-1) : un but « gagné à partir de maintenant » déjà couvert par les gains ne borne plus le bloc à 0 min (le parcours
             s’arrêtait sur « Il manque X $ pour « P » » alors que le gain par heure finance l’achat d’avant encore impayé qu’exige le but, C2) :
             seul ce qui reste à gagner borne le bloc ; sinon le prochain seuil (achat, mission payable, argent du but) fixe dt. */
          if (c.meaning === 'cumulative' && c.goalPrice === null && c.goalTarget !== null && rate > 0 && goalMoneyOf(c) - st.earned > 1e-9) dt = (goalMoneyOf(c) - st.earned) * 60 / rate;
          if (target !== undefined && rate > 0) dt = dt === null ? (target - st.cash) * 60 / rate : Math.min(dt, (target - st.cash) * 60 / rate);
          if (c.goalUnits !== null && st.units < c.goalUnits && c.unitsHourly > 0) { var du = (c.goalUnits - st.units) * 60 / c.unitsHourly; dt = dt === null ? du : Math.max(dt, du); }
          /* correctif lot 2 (ARI5-1) : rien d’autre ne borne le bloc (l’argent du but est là, l’achat attend une mission « une fois ») : financer la moins
             chère des missions « une fois » prêtes, au lieu de s’arrêter sur « qui ne peut pas se faire » alors que le gain par heure la paie. */
          if (dt === null && onceWait.length) dt = (onceWait.map(function (o) { return o.th; }).sort(function (a, b) { return a - b; })[0] - st.cash) * 60 / rate;
          if (dt === null || !(dt > 0)) break;
          ledgerAdd(st, t + dt, 'receive', rate * dt / 60, 'Gain par heure', { passive: true, minutes: dt }); st.earned += rate * dt / 60; st.units += c.unitsHourly * dt / 60; t += dt; active += dt;
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
      if (ready[pick.id] > t) {
        var wait = ready[pick.id] - t;
        /* lot 2 (C3f) : si le gain par heure atteint le but pendant l’attente, on ne prend que le temps nécessaire, sans relancer la mission. */
        var rate0 = st.boost + c.hourly, need0 = rate0 > 0 && c.purchases.every(function (x) { return x.owned; }) && (c.goalUnits === null || st.units >= c.goalUnits - 1e-9) ? goalNeedOf(c, st) : null;
        var dtGoal = need0 !== null && need0 > 0 ? (function (x) { var r = Math.round(x); return Math.abs(x - r) <= 1e-9 * Math.max(1, Math.abs(x)) ? r : x; }(need0 * 60 / rate0)) : null; /* bruit flottant d’une division (19,99999999999997 → 20) */
        if (dtGoal !== null && dtGoal > 1e-9 && dtGoal <= wait + 1e-9) { var dtg = Math.min(dtGoal, wait); t += dtg; accrue(dtg, 'Gain par heure pendant l’attente'); continue; }
        t = ready[pick.id]; accrue(wait, 'Gain par heure pendant l’attente');
      }
      var invest = pick.paid ? 0 : pick.entry.investment || 0, cost = (pick.entry.cost || 0) + invest;
      var duration = pick.res.activeMinutes - (pick.entry.prepOnce && runs[pick.id] ? pick.entry.prep || 0 : 0), reward = (pick.entry.reward || 0) * (pick.entry.share === undefined ? 100 : pick.entry.share) / 100;
      runStep(c, st, pick, t, t + duration, pick.entry.cost || 0, invest, reward, 1);
      t += duration; active += duration;
      accrue(duration);
      st.units += pick.res.units > 0 ? pick.res.units : 0; pick.paid = true;
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
      /* lot 2 (J) : l’achat qui bloque est dit par stuckReason, commun aux deux modes (mêmes phrases qu’avant). */
      var why = stuckReason(c, st)
        || (locked.length ? '« ' + locked[0].name + ' » demande d’abord ' + lockedReason(c, st, locked[0]).join(', ') + '.'
        : poor ? '« ' + poor.name + ' » demande ' + dollars(Math.round((poor.entry.cost || 0) + (poor.paid ? 0 : poor.entry.investment || 0)).toLocaleString('fr-FR'), ' ') + ' de frais avant de commencer ; en gardant ' + dollars(Math.round(c.reserve).toLocaleString('fr-FR'), ' ') + ' de côté, il ne te reste que ' + dollars(Math.round(Math.max(0, st.cash - c.reserve)).toLocaleString('fr-FR'), ' ') + '. Baisse la réserve ou les frais, ou ajoute une mission moins chère pour démarrer.'
        : 'Aucune mission possible ne rapporte plus que ses frais avec ce que tu as.');
      return fail(Object.assign({}, missionShape, { route: st.route, continuous: true }), why);
    }
    var steps2 = Object.keys(runs).filter(function (id) { return runs[id] > 0; }).map(function (id) { var a = c.acts.filter(function (x) { return x.id === id; })[0]; return { id: id, name: a.name, runs: runs[id], net: runs[id] * a.res.net }; });
    var one = { index: 1, steps: steps2, onceSteps: st.route.filter(function (r) { return r.type === 'unlock'; }).map(function (r) { return { id: r.id, name: r.name }; }), gain: subtract(st.cash, c.capital) + c.purchases.filter(function (x) { return x.at !== null; }).reduce(function (s2, x) { return s2 + x.price; }, 0), passive: 0, upkeep: 0, cashBefore: c.capital, cashAfter: st.cash, unitsAfter: st.units, unitsGain: st.units - c.units, purchases: c.purchases.filter(function (x) { return x.at !== null; }).map(function (x) { return x.name; }), purchasesBefore: [], purchasesAfterOnly: [], activeMinutes: active };
    return missionResult(c, st, t > 0 || steps2.length ? [one] : [], { totalMinutes: t, activeMinutes: active, acquisitionMinutes: acq, limited: limited, limitNote: 'Parcours arrêté après ' + FLOW_MAX_STEPS + ' étapes.', failNote: limited ? 'Le parcours dépasse ' + FLOW_MAX_STEPS + ' étapes : réduis le but ou choisis des missions qui rapportent plus.' : null, method: 'flow' });
  }

  // Plans A, B, C : le programme complet, puis chaque mission seule, puis sans
  // les achats d'avant, puis les plans supplémentaires demandés (par exemple
  // « au rythme que tu as vraiment eu »). Classés par nombre de parties, sans
  // doublon. Aucun optimum garanti.
  function missionAlternatives(input) {
    var shape = { plans: [], results: {}, inputs: {} };
    try {
      var p = data(input);
      var acts = Array.isArray(p.activities) ? p.activities : [];
      var plans = [], inputs = {};
      var allNames = (p.purchases || []).concat(acts).reduce(function (o, x) { if (x && typeof x.id === 'string' && typeof x.name === 'string') o[x.id] = x.name; return o; }, {});
      /* lot 2 (C7.7) : chaque plan de secours est calculé sans journal ; inputs[id] permet de le recalculer avec. */
      /* correctif lot 2 (ARI2-4) : les missions du plan complet restent connues comme missions dans chaque plan de secours (« la mission (…) »). */
      var allMissions = acts.filter(function (a) { return a && typeof a.id === 'string'; }).map(function (a) { return a.id; });
      function add(id, label, changes, note) { var used = Object.assign({}, p, { knownNames: allNames, knownMissions: allMissions }, changes); inputs[id] = JSON.parse(JSON.stringify(used)); /* copie inerte : aucun undefined dans un résultat */ var r = missionPlan(Object.assign({}, used, { journal: false })); plans.push({ id: id, label: label, note: note || null, valid: r.valid && r.reached, reason: r.valid ? (r.reached ? null : r.note) : r.reason, totalSessions: r.valid && r.reached ? r.totalSessions : null, totalMinutes: r.valid && r.reached ? r.totalMinutes : null, days: r.valid && r.reached ? r.days : null, activeMinutes: r.valid ? r.activeMinutes : null, finalCash: r.valid ? r.finalCash : null, phases: r.valid ? r.phases.slice(0, 6) : [], result: r }); }
      add('all', acts.length > 1 ? 'Le meilleur mélange de tes missions' : (acts.length ? 'Ta mission, répétée' : 'Ton gain par heure, partie après partie'), {}, acts.length > 1 ? 'À chaque partie, les missions qui rapportent le plus dans le temps disponible.' : null);
      if (!plans[0].result.valid) return fail(shape, plans[0].result.reason);
      if (acts.length > 1) acts.forEach(function (a, i) { add('only-' + (typeof a.id === 'string' ? a.id : i), 'Seulement « ' + (a && a.name ? String(a.name).slice(0, 60) : 'Mission ' + (i + 1)) + ' »', { activities: [a] }, 'La même mission, répétée tant qu’elle rentre dans la partie.'); });
      if (Array.isArray(p.purchases) && p.purchases.some(function (x) { return x && !x.owned; })) add('no-purchases', 'Sans les achats d’avant', { purchases: (p.purchases || []).filter(function (x) { return x && x.owned; }), knownNames: (p.purchases || []).reduce(function (o, x) { if (x && typeof x.id === 'string' && typeof x.name === 'string') o[x.id] = x.name; return o; }, {}) }, 'Seulement si tu peux te passer de ces achats pour ton but.');
      (Array.isArray(p.extraPlans) ? p.extraPlans : []).slice(0, 6).forEach(function (x, i) { if (x && typeof x === 'object') add(typeof x.id === 'string' ? x.id : 'extra-' + i, typeof x.label === 'string' ? x.label : 'Autre plan', x.changes && typeof x.changes === 'object' ? x.changes : {}, typeof x.note === 'string' ? x.note : null); });
      var ranked = plans.filter(function (x) { return x.valid; }).sort(function (a, b) { return (a.totalSessions || 0) - (b.totalSessions || 0) || (a.totalMinutes || 0) - (b.totalMinutes || 0) || b.finalCash - a.finalCash; });
      var seen = {}, distinct = [];
      ranked.forEach(function (x) { var key = x.totalSessions + '|' + x.totalMinutes + '|' + x.phases.map(function (ph) { return ph.steps.map(function (st) { return st.id + st.runs; }).join(','); }).join('/'); if (!seen[key]) { seen[key] = true; distinct.push(x); } });
      var failed = plans.filter(function (x) { return !x.valid; });
      var results = {}; plans.forEach(function (x) { results[x.id] = x.result; });
      return finish({ plans: distinct.concat(failed).map(function (x) { var out = Object.assign({}, x); delete out.result; return out; }), results: results, inputs: inputs }, shape);
    } catch (error) { return fail(shape, error.message); }
  }

  // Échéance d'un programme mission par mission : faisable ou non ; sinon, les
  // leviers vérifiés par recalcul (jouer tous les jours, parties plus longues,
  // gagner plus par heure quand le gain est continu) et la date la plus proche.
  function missionDeadline(input, days) {
    var shape = { feasible: null, days: null, spareDays: null, everydayDays: null, requiredSessionMinutes: null, requiredHourly: null };
    try {
      var d = number(days, 'l’échéance en jours', 36500, { positive: true, integer: true });
      /* lot 2 (C7.7) : calculs exploratoires sans journal. */
      var q = Object.assign({}, data(input), { journal: false });
      var base = missionPlan(q);
      if (!base.valid) return fail(shape, base.reason);
      if (!base.reached) return fail(shape, base.note);
      if (base.continuous) return fail(shape, 'Une échéance en jours demande un calendrier : écris la durée d’une partie et tes jours de jeu par semaine.');
      var p = q;
      if (base.days <= d) return finish({ feasible: true, days: base.days, spareDays: d - base.days, everydayDays: null, requiredSessionMinutes: null, requiredHourly: null }, shape);
      var every = null, dpw = number(p.daysPerWeek, 'les jours par semaine', 7, { defaultValue: 7, integer: true, positive: true });
      if (dpw < 7) { var e = missionPlan(Object.assign({}, p, { daysPerWeek: 7 })); if (e.valid && e.reached) every = e.days; }
      var minutes = null, cur = number(p.sessionMinutes, 'la durée d’une partie', 1440, { positive: true });
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
      if (!result || !result.valid || !Array.isArray(result.sessions)) return fail(shape, 'Programme non calculé.');
      // Parcours sans parties : une marche par dépense ou récompense (l’argent n’arrive jamais « petit à petit »).
      if (result.continuous) {
        var pts = [{ hours: 0, cash: result.startCash, units: result.startUnits, label: 'Départ', purchase: null }], prev = result.startCash;
        var isBuy = function (e) { return e.type === 'spend' && (e.asset === true || /^(?:Achat|Purchase|Compra|Acquisto|Kauf)\b/.test(e.label)); };
        var buyName = function (e) { return e.asset === true ? e.label.replace(/^[^«“„]*[«“„]\s?|\s?[»”“]$/g, '') : e.label.replace(/^(?:Achat « |Purchase “|Compra “|Acquisto “|Kauf „)|[»”“]$/g, ''); };
        /* lot 2 (C9) : tous les événements, jamais tronqués ; au-delà de 600, un sur k, en gardant les achats, le premier et le dernier. */
        var evs = result.events || [], sampled = false;
        if (evs.length > 600) { var k = Math.ceil(evs.length / 600), kept = []; evs.forEach(function (e, i) { if (i === 0 || i === evs.length - 1 || isBuy(e) || i % k === 0) kept.push(e); }); evs = kept; sampled = true; }
        evs.forEach(function (e) { var h = e.t / 60; if (e.cash !== prev) { pts.push({ hours: h, cash: prev, label: null, purchase: null, hold: true }); pts.push({ hours: h, cash: e.cash, label: e.label, purchase: isBuy(e) ? buyName(e) : null }); prev = e.cash; } });
        /* correctif lot 2 (REG4-1) : journal plafonné (journalComplete false) et dernier événement gardé avant la fin du parcours : un dernier point
           aux valeurs annoncées par le résultat (temps total, argent final), dit tronqué (truncated) ; rien d’inventé entre les deux. */
        var cut = result.journalComplete === false && evs.length > 0 && evs[evs.length - 1].t < result.totalMinutes - 1e-9;
        if (cut) pts.push({ hours: result.totalMinutes / 60, cash: result.finalCash, units: result.finalUnits, label: 'Fin', purchase: null, truncated: true });
        return finish({ points: pts, stepped: true, sampled: sampled, truncated: cut }, shape);
      }
      var minutes = result.totalSessions ? result.totalMinutes / result.totalSessions : 0;
      var points = [{ hours: 0, cash: result.startCash, units: result.startUnits, label: 'Départ', purchase: null }];
      /* correctif lot 2 (ARI2-7) : 0 partie avec un achat d’avant payé tout de suite : une marche à 0 h (même libellé qu’une partie, numéro 0),
         pour que la courbe finisse à l’argent annoncé (« À la fin ») et non à l’argent de départ. */
      var paid0 = !result.sessions.length ? (result.purchases || []).filter(function (x) { return x.before === true; }).map(function (x) { return x.name; }) : [];
      if (paid0.length) points.push({ hours: 0, cash: result.finalCash, units: result.startUnits, label: 'Partie ' + 0 + ' · ' + paid0.join(', '), purchase: paid0.join(', ') });
      result.sessions.forEach(function (se) { points.push({ hours: se.index * minutes / 60, cash: se.cashAfter, units: se.unitsAfter, label: 'Partie ' + se.index + (se.purchases.length ? ' · ' + se.purchases.join(', ') : ''), purchase: se.purchases.length ? se.purchases.join(', ') : null }); });
      return finish({ points: points, sampled: false }, shape);
    } catch (error) { return fail(shape, error.message); }
  }

  /* v7.60 : dollars et lang sont des aides d’affichage, pas des calculs : non énumérables (l’API des calculs reste la même). */

  /** Lot 1 (calculateur) : vérificateur de plan indépendant de l’optimiseur. Rejoue un journal d’événements datés en minutes
   * de jeu, sans rien lire du score ni de la conclusion de la fonction qui l’a produit :
   * R1 instants lisibles et jamais en arrière ; R2 avant chaque dépense, l’argent couvre la réserve + la dépense (aucune
   * recette future dépensée) ; R3 chaque prérequis (needs) payé plus tôt ; R4 un achat (unlocks) payé une seule fois ;
   * R5 deux activités (act) jamais en même temps ; R6 argent final rejoué = argent final annoncé ; R7 instant d’atteinte
   * rejoué (premier instant où argent − réserve ≥ but, prérequis du but possédés) = instant annoncé.
   * Rend ok:false avec la liste des règles violées ; valid:false seulement si l’entrée est illisible. */
  var verifyShape = { ok: false, finalCash: null, reachedAt: null, violations: [] };
  /* lot 2 (C8) : options ADDITIVES (sans elles, comportement du lot 1) : owned (possédés au départ) ; act.unlocks (effectif à la
     fin de l’occupation, dans l’ordre des fins) ; check (points de contrôle, acceptés seulement avec claim.checkpoints : l’atteinte
     n’est alors regardée qu’à ces instants) ; spend.asset (hors « gagné ») ; claim.earnedTarget (but en gains cumulés) ;
     claim.sessionMinutes → R8 (chaque occupation tient dans sa partie). Tolérance : 1e-6 relatif, jamais plus stricte que le moteur. */
  function cashJournalVerify(input) {
    try {
      var p = data(input);
      var capital = money(p.capital, 'ce que tu as');
      var reserve = money(p.reserve, 'l’argent gardé de côté', 0);
      if (!Array.isArray(p.events) || p.events.length > 1000000) throw new Error('Le journal du plan est illisible.');
      var claim = p.claim && typeof p.claim === 'object' ? p.claim : {};
      var goal = Number.isFinite(claim.target) ? claim.target : null, after = Array.isArray(claim.after) ? claim.after : [];
      var earnedTarget = Number.isFinite(claim.earnedTarget) ? claim.earnedTarget : null, checkpoints = claim.checkpoints === true;
      var S = Number.isFinite(claim.sessionMinutes) && claim.sessionMinutes > 0 ? claim.sessionMinutes : null, hasGoal = goal !== null || earnedTarget !== null;
      var cash = capital, earned = 0, last = 0, owned = {}, busyUntil = -Infinity, violations = [], reachedAt = null, pending = [];
      (Array.isArray(p.owned) ? p.owned : []).forEach(function (id) { owned[String(id)] = true; });
      var tol = function (x) { return 1e-6 * Math.max(1, Math.abs(x)); };
      var reached = function () { return hasGoal && (earnedTarget !== null ? earned >= earnedTarget - tol(earnedTarget) : cash - reserve >= goal - tol(goal)) && after.every(function (id) { return owned[id]; }); };
      var flush = function (upTo) {
        pending.sort(function (a, b) { return a.until - b.until || a.index - b.index; });
        while (pending.length && (upTo === null || pending[0].until <= upTo + 1e-9)) {
          var u = pending.shift();
          if (owned[u.id]) violations.push({ rule: 'R4', index: u.index, detail: String(u.id) });
          owned[u.id] = true;
          if (!checkpoints && reachedAt === null && reached()) reachedAt = u.until;
        }
      };
      if (!checkpoints && reached()) reachedAt = 0;
      for (var i = 0; i < p.events.length; i += 1) {
        var e = p.events[i] || {}, at = e.at;
        if (typeof at !== 'number' || !Number.isFinite(at) || at < 0) { violations.push({ rule: 'R1', index: i, detail: 'instant illisible' }); continue; }
        if (at < last - 1e-9) violations.push({ rule: 'R1', index: i, detail: 'instant antérieur à l’événement précédent' });
        last = Math.max(last, at);
        flush(at);
        (Array.isArray(e.needs) ? e.needs : []).forEach(function (id) { if (!owned[id]) violations.push({ rule: 'R3', index: i, detail: String(id) }); });
        var amount = e.amount === undefined ? 0 : e.amount;
        if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0) { violations.push({ rule: 'R6', index: i, detail: 'montant illisible' }); continue; }
        if (e.kind === 'spend') {
          if (cash - amount < reserve - tol(amount + reserve)) violations.push({ rule: 'R2', index: i, detail: 'dépense de ' + amount + ' avec ' + cash + ' en poche' });
          if (e.unlocks) { if (owned[e.unlocks]) violations.push({ rule: 'R4', index: i, detail: String(e.unlocks) }); owned[e.unlocks] = true; }
          cash -= amount; if (e.asset !== true) earned -= amount;
        } else if (e.kind === 'earn') { cash += amount; earned += amount; }
        /* correctif lot 2 (ARI3-4) : un événement d’argent daté d’une partie (session) doit tomber dans cette partie, comme une action (R8) ;
           sans numéro de partie (Mon temps de jeu), rien ne change. */
        if ((e.kind === 'spend' || e.kind === 'earn') && S !== null && Number.isInteger(e.session) && e.session >= 1 && (at < (e.session - 1) * S - tol((e.session - 1) * S) || at > e.session * S + tol(e.session * S))) violations.push({ rule: 'R8', index: i, detail: 'argent hors de sa partie' });
        if (e.kind === 'act') {
          if (typeof e.until !== 'number' || !Number.isFinite(e.until) || e.until < at) violations.push({ rule: 'R1', index: i, detail: 'fin d’activité illisible' });
          else {
            if (at < busyUntil - 1e-9) violations.push({ rule: 'R5', index: i, detail: 'deux activités en même temps' });
            busyUntil = Math.max(busyUntil, e.until);
            if (e.unlocks) pending.push({ until: e.until, id: String(e.unlocks), index: i });
            if (S !== null) {
              var sn = e.session;
              if (!(Number.isInteger(sn) && sn >= 1)) violations.push({ rule: 'R1', index: i, detail: 'partie illisible' });
              else if (at < (sn - 1) * S - tol((sn - 1) * S) || e.until > sn * S + tol(sn * S)) violations.push({ rule: 'R8', index: i, detail: 'action hors de sa partie' });
            }
          }
        } else if (e.kind === 'check' && checkpoints) { if (reachedAt === null && reached()) reachedAt = at; }
        else if (e.kind !== 'spend' && e.kind !== 'earn') violations.push({ rule: 'R1', index: i, detail: 'événement inconnu' });
        if (!checkpoints && reachedAt === null && reached()) reachedAt = at;
      }
      flush(null);
      if (claim.finalCash !== undefined && claim.finalCash !== null && !(Number.isFinite(claim.finalCash) && Math.abs(claim.finalCash - cash) <= tol(cash) + 0.005)) violations.push({ rule: 'R6', index: -1, detail: 'argent final annoncé ' + claim.finalCash + ', rejoué ' + cash });
      if (claim.reachedAt !== undefined && hasGoal && !(claim.reachedAt === null ? reachedAt === null : reachedAt !== null && Math.abs(claim.reachedAt - reachedAt) <= 1e-6 * Math.max(1, reachedAt))) violations.push({ rule: 'R7', index: -1, detail: 'atteinte annoncée ' + claim.reachedAt + ', rejouée ' + reachedAt });
      return finish({ ok: violations.length === 0, finalCash: cash, reachedAt: reachedAt, violations: violations }, verifyShape);
    } catch (error) { return fail(verifyShape, error.message); }
  }

  /** lot 2 (C8) : vérification indépendante d’un programme de E.missionPlan. Lit le journal complet et les règles du plan
   * (rules : réserve, durée d’une partie, gain par heure, dépenses par partie, achats, possédés au départ, sens du but), et comme
   * affirmations seulement l’argent final, l’atteinte et les totaux annoncés. R1 à R8 par cashJournalVerify (points de contrôle en
   * parties) ; R9 : chaque gain par heure = taux (gain + achats obtenus) × temps hors obtention ; R10 : les dépenses de chaque
   * partie = dépenses par partie + coût d’usage des achats payés avant le début de la partie (un achat gratuit est daté par sa
   * première occupation, puisqu’aucune dépense à 0 $ n’est inscrite). ok:null si le journal est incomplet
   * (journal:false ou plus de 60 000 entrées) ; skipped:'reach' quand le but est en points (l’argent est rejoué, pas les points). */
  var missionVerifyShape = { ok: null, skipped: null, violations: [], finalCash: null, reachedAt: null, checked: 0 };
  function missionVerify(result) {
    try {
      if (!result || typeof result !== 'object' || Array.isArray(result)) throw new Error('Programme non calculé.');
      if (!result.valid) return fail(missionVerifyShape, result.reason || 'Programme non calculé.');
      var rules = result.rules;
      if (!rules || typeof rules !== 'object' || !Array.isArray(result.journal)) throw new Error('Le journal du plan est illisible.');
      if (!result.journalComplete) return finish({ ok: null, skipped: 'journal', violations: [], finalCash: null, reachedAt: null, checked: 0 }, missionVerifyShape);
      var S = Number.isFinite(rules.sessionMinutes) && rules.sessionMinutes > 0 ? rules.sessionMinutes : null, sessions = S !== null;
      var keep = ['needs', 'unlocks', 'asset', 'id', 'passive', 'minutes', 'upkeep', 'session'];
      var events = result.journal.map(function (e) {
        if (e.kind === 'act' || e.kind === 'check') return e;
        var o = { at: e.at, kind: e.type === 'spend' ? 'spend' : 'earn', amount: e.amount };
        keep.forEach(function (k) { if (e[k] !== undefined) o[k] = e[k]; });
        return o;
      });
      var claim = { finalCash: result.finalCash, after: Array.isArray(rules.after) ? rules.after : [] }, skipped = null;
      if (sessions) { claim.sessionMinutes = S; claim.checkpoints = true; }
      if (rules.units) skipped = 'reach';
      else if (rules.meaning === 'cumulative' && rules.goalPrice === null) claim.earnedTarget = rules.goalMoney;
      else if (rules.meaning === 'held' && rules.goalPrice === null) claim.target = rules.goalMoney - rules.reserve;
      else claim.target = rules.goalMoney;
      if (!skipped) claim.reachedAt = result.reached ? (sessions ? result.totalSessions * S : result.totalMinutes) : null;
      var v = cashJournalVerify({ capital: result.startCash, reserve: rules.reserve, owned: rules.owned0, events: events, claim: claim });
      if (!v.valid) return fail(missionVerifyShape, v.reason);
      var violations = v.violations.slice(), tol = function (x) { return 1e-6 * Math.max(1, Math.abs(x)); };
      /* R9 et R10 : rejeu des possessions (obtention finie = unlocks traité) et des achats payés, dans l’ordre du journal. */
      var purchases = Array.isArray(rules.purchases) ? rules.purchases : [], byId = {};
      purchases.forEach(function (x) { byId[x.id] = x; });
      var owned = {}; (Array.isArray(rules.owned0) ? rules.owned0 : []).forEach(function (id) { owned[id] = true; });
      var pending = [], blockingBySession = {}, upkeepBySession = {}, checks = [];
      var blockingActs = [];
      events.forEach(function (e, i) { if (e.kind === 'act' && e.blocking === true && Number.isFinite(e.until) && Number.isFinite(e.at)) { blockingBySession[e.session] = (blockingBySession[e.session] || 0) + (e.until - e.at); blockingActs.push(e); } });
      /* correctif lot 2 (ARI3-4) : en parcours, un gain par heure couvre [at − minutes, at] (accrue est appelé après l’avance du temps) ; le
         recouvrement avec une obtention (acte bloquant) est retiré, comme en parties (C3b : aucun gain par heure pendant l’obtention). */
      var overlapBlocking = function (from, to) { return blockingActs.reduce(function (s2, a) { return s2 + Math.max(0, Math.min(a.until, to) - Math.max(a.at, from)); }, 0); };
      /* correctif lot 2 (R10) : le coût d’usage d’un achat compte dès la partie qui suit son paiement (règle du moteur : upkeepOwned dès
         l’achat, obtention finie ou non) ; le paiement est daté par la première entrée du journal qui porte l’achat (dépense asset, ou
         occupation : un achat gratuit n’a aucune dépense inscrite), les achats possédés au départ à 0. */
      var paidAt = {}; (Array.isArray(rules.owned0) ? rules.owned0 : []).forEach(function (id) { if (byId[id]) paidAt[id] = 0; });
      events.forEach(function (e) { if (!Number.isFinite(e.at)) return; var pid = e.kind === 'act' ? e.id : (e.kind === 'spend' && e.asset === true ? e.id : undefined); if (pid !== undefined && byId[pid] && paidAt[pid] === undefined) paidAt[pid] = e.at; });
      var hourly = Number.isFinite(rules.hourly) ? rules.hourly : 0, upkeep = Number.isFinite(rules.upkeepPerSession) ? rules.upkeepPerSession : 0;
      /* correctif lot 2 (ARI4-2) : en parties, la partie d’un gain par heure se lit sur sa date (at = n × S, règle du moteur), jamais sur parole, et
         chaque partie à taux > 0 en porte exactement un (comme R10 pour les dépenses) : un gain daté dans une autre partie ou omis viole R9.
         Possession datée (unlockAt) : dépense avec unlocks à sa date, obtention à sa fin, possédé au départ à 0. */
      var unlockAt = {}; (Array.isArray(rules.owned0) ? rules.owned0 : []).forEach(function (id) { unlockAt[id] = 0; });
      var own = function (id, at) { owned[id] = true; if (unlockAt[id] === undefined) unlockAt[id] = at; };
      var flush = function (upTo) { pending.sort(function (a, b) { return a.until - b.until; }); while (pending.length && pending[0].until <= upTo + 1e-9) { var q = pending.shift(); own(q.id, q.until); } };
      var passiveBySession = {}, passiveSum = {}, lastPassiveEnd = 0;
      events.forEach(function (e, i) {
        if (!Number.isFinite(e.at)) return;
        flush(e.at);
        if (e.kind === 'act') { if (e.unlocks) pending.push({ until: e.until, id: String(e.unlocks) }); return; }
        if (e.kind === 'check') { checks.push({ index: i, session: e.session, at: e.at }); return; }
        if (e.kind === 'spend') {
          if (e.unlocks) own(String(e.unlocks), e.at);
          if (e.upkeep === true) (upkeepBySession[e.session] = upkeepBySession[e.session] || []).push(e.amount);
          return;
        }
        if (e.kind === 'earn' && e.passive === true) {
          if (sessions && !(Number.isInteger(e.session) && e.session >= 1 && Math.abs(e.at - e.session * S) <= tol(e.session * S))) { violations.push({ rule: 'R9', index: i, detail: 'gain par heure différent du taux' }); return; }
          if (sessions) { passiveBySession[e.session] = (passiveBySession[e.session] || 0) + 1; passiveSum[e.session] = (passiveSum[e.session] || 0) + e.amount; }
          /* correctif lot 2 (ARI5-2) : en parcours, un gain par heure couvre [at − minutes, at] : jamais avant le départ, jamais sur un temps déjà crédité
             (les intervalles se suivent dans l’ordre du journal) ; sinon le même temps compterait deux fois, ou plus de minutes que de temps joué (R9 :
             « gain par heure ≠ taux × temps joué »). */
          if (!sessions) { var from9 = Number.isFinite(e.minutes) ? e.at - e.minutes : NaN; if (!(from9 >= -tol(e.at) && from9 >= lastPassiveEnd - tol(e.at))) { violations.push({ rule: 'R9', index: i, detail: 'gain par heure différent du taux' }); return; } lastPassiveEnd = e.at; }
          var rate = hourly + purchases.filter(function (x) { return owned[x.id]; }).reduce(function (s2, x) { return s2 + (x.boostHourly || 0); }, 0);
          var minutes = sessions ? S - (blockingBySession[e.session] || 0) : (Number.isFinite(e.minutes) ? e.minutes - overlapBlocking(e.at - e.minutes, e.at) : NaN);
          var expected = rate * minutes / 60;
          if (!(Math.abs(expected - e.amount) <= tol(expected))) violations.push({ rule: 'R9', index: i, detail: 'gain par heure différent du taux' });
        }
      });
      /* correctif lot 2 (ARI6-1) : recensement des points de contrôle avant R9/R10 par partie (spec C8.6 : « pour chaque partie n ≥ 1 ») : chaque partie
         annoncée 0…N (N = totalSessions, affirmation seulement) porte exactement un point de contrôle daté n × S, lisible et sans doublon (sinon R1) ;
         une partie sans point de contrôle n’est plus contrôlée par personne → R10 (avant : une partie dont le check ET la dépense de partie ou le gain
         par heure disparaissaient passait la vérification). */
      if (sessions) {
        var N = Number.isInteger(result.totalSessions) ? result.totalSessions : -1, seenCk = {};
        checks.forEach(function (ck) {
          if (!(Number.isInteger(ck.session) && ck.session >= 0 && ck.session <= N) || seenCk[ck.session] || Math.abs(ck.at - ck.session * S) > tol(ck.session * S)) violations.push({ rule: 'R1', index: ck.index, detail: 'partie illisible' });
          seenCk[ck.session] = true;
        });
        for (var n0 = 0; n0 <= N; n0 += 1) if (!seenCk[n0]) violations.push({ rule: 'R10', index: -1, detail: 'dépenses par partie absentes ou différentes' });
      }
      if (sessions) checks.forEach(function (ck) {
        if (!(Number.isInteger(ck.session) && ck.session >= 1)) return;
        /* R9 (ARI4-2) : taux de la partie n = gain par heure + achats possédés avant sa fin (nS), hors ceux payés à nS après la partie ; temps = S − obtention ;
           un gain attendu → exactement un gain par heure de partie n ; aucun attendu → au plus un, infime (montant déjà contrôlé plus haut). */
        var endAt = ck.session * S, rate9 = hourly + purchases.filter(function (x) { return unlockAt[x.id] !== undefined && unlockAt[x.id] < endAt - tol(endAt); }).reduce(function (s2, x) { return s2 + (x.boostHourly || 0); }, 0);
        var want9 = rate9 * Math.max(0, S - (blockingBySession[ck.session] || 0)) / 60, got9 = passiveBySession[ck.session] || 0;
        /* correctif lot 2 (ARI6-2) : le MONTANT de la partie est comparé lui aussi (somme des gains par heure de la partie = taux × temps hors obtention) : un achat
           d’après-partie avancé devant le gain de la même partie (même instant n × S) gonflait le gain de son boost sans que le nombre de gains ne bouge. */
        if (got9 > 1 || (want9 > tol(want9) && got9 !== 1) || Math.abs((passiveSum[ck.session] || 0) - want9) > tol(want9)) violations.push({ rule: 'R9', index: ck.index, detail: 'gain par heure différent du taux' });
        var startAt = (ck.session - 1) * S, expected = upkeep + purchases.filter(function (x) { return paidAt[x.id] !== undefined && paidAt[x.id] <= startAt + tol(startAt); }).reduce(function (s2, x) { return s2 + (x.usagePerSession || 0); }, 0), got = upkeepBySession[ck.session] || [];
        var fine = expected > tol(expected) ? got.length === 1 && Math.abs(got[0] - expected) <= tol(expected) : got.length === 0;
        if (!fine) violations.push({ rule: 'R10', index: ck.index, detail: 'dépenses par partie absentes ou différentes' });
      });
      return finish({ ok: violations.length === 0, skipped: skipped, violations: violations, finalCash: v.finalCash, reachedAt: v.reachedAt, checked: events.length }, missionVerifyShape);
    } catch (error) { return fail(missionVerifyShape, error.message); }
  }

  /** Lot 1 : « Mon objectif si j’achète », modèle continu (je gagne à peu près tant par heure). Dollars et heures de jeu.
   * Entrées : capital, reserve, target (argent disponible visé, après la réserve, dépenses prévues comprises), hourly (gain net
   * par heure avant l’achat), price (prix total), extraHourly (gain en plus avec l’achat ; null = inconnu, compté 0 et signalé),
   * usageHourly (coût d’usage de l’achat ramené à l’heure).
   * Acheter à l’instant τ (au plus tôt quand l’argent disponible couvre le prix, au plus tard juste avant le but) donne un temps
   * total linéaire en τ : la meilleure date est à une des deux bornes. Les deux sont calculées et la plus courte est gardée :
   * c’est l’optimum de ce modèle (un gain par heure constant, aucune autre dépense), pas une vérité sur le jeu.
   * extraThreshold : gain en plus minimal pour que l’achat ne recule pas le but (null si aucun gain ne suffit ou sans objet). */
  var timingShape = { saveHours: null, buyHours: null, delayHours: null, strategy: null, buyAtHours: null, affordHours: null, affordableNow: null, extraKnown: null, extraThreshold: null, optimal: false, journal: [], claim: null };
  function purchaseGoalTiming(input) {
    try {
      var p = data(input);
      var capital = money(p.capital, 'ce que tu as');
      var reserve = money(p.reserve, 'l’argent gardé de côté', 0);
      var target = money(p.target, 'l’objectif');
      var hourly = money(p.hourly, 'ce que tu gagnes par heure');
      var price = money(p.price, 'le prix d’achat');
      var extraKnown = p.extraHourly !== null && p.extraHourly !== undefined;
      var extra = extraKnown ? money(p.extraHourly, 'ce que l’achat te fait gagner en plus par heure') : 0;
      var usage = money(p.usageHourly, 'le coût d’usage par heure', 0);
      if (reserve > capital) return fail(timingShape, 'L’argent que tu gardes de côté (ta réserve) dépasse ce que tu as. Baisse la réserve.');
      var available = subtract(capital, reserve), rateAfter = hourly + extra - usage;
      var save = target <= available ? 0 : hourly > 0 ? (target - available) / hourly : null;
      var affordableNow = price <= available;
      var options = [];
      /* au plus tôt : dès que l’argent disponible couvre le prix */
      var tauSoon = affordableNow ? 0 : hourly > 0 ? (price - available) / hourly : null;
      if (tauSoon !== null) {
        var left = Math.max(0, subtract(target, available + hourly * tauSoon - price));
        if (left === 0 || rateAfter > 0) options.push({ strategy: affordableNow ? 'now' : 'soon', buyAt: tauSoon, hours: tauSoon + (left === 0 ? 0 : left / rateAfter), rate: rateAfter });
      }
      /* au plus tard : juste avant d’atteindre le but (argent disponible = but + prix), donc sans gain ni coût d’usage avant */
      var gap = subtract(target + price, available);
      var tauLate = gap <= 0 ? 0 : hourly > 0 ? gap / hourly : null;
      if (tauLate !== null && !(tauSoon !== null && tauLate <= tauSoon)) options.push({ strategy: 'late', buyAt: tauLate, hours: tauLate, rate: rateAfter });
      else if (tauLate !== null && !options.length) options.push({ strategy: tauLate === 0 ? 'now' : 'late', buyAt: tauLate, hours: tauLate, rate: rateAfter });
      if (!options.length) return finish(Object.assign({}, timingShape, { saveHours: save, affordHours: tauSoon, affordableNow: affordableNow, extraKnown: extraKnown, optimal: true }), timingShape);
      options.sort(function (a, b) { return a.hours - b.hours || a.buyAt - b.buyAt; });
      var best = options[0];
      /* journal de la stratégie gardée (minutes de jeu), pour le vérificateur */
      var journal = [], buyMin = best.buyAt * 60, endMin = best.hours * 60, before = hourly * best.buyAt;
      if (before > 0) journal.push({ at: buyMin, kind: 'earn', amount: before, label: 'gains avant l’achat' });
      journal.push({ at: buyMin, kind: 'spend', amount: price, label: 'achat', unlocks: 'achat' });
      var afterGain = (best.hours - best.buyAt) * best.rate;
      if (afterGain > 0) journal.push({ at: endMin, kind: 'earn', amount: afterGain, label: 'gains après l’achat', needs: ['achat'] });
      var threshold = null;
      if (target > available) {
        if (affordableNow) threshold = hourly * price / (target - available) + usage;
        else if (target > price && hourly > 0) threshold = hourly * price / (target - price) + usage;
      }
      /* écart minuscule entre le but et l’argent disponible : seuil hors d’échelle, non rendu plutôt que de faire échouer le calcul */
      if (threshold !== null && !(Math.abs(threshold) <= RESULT_MAX)) threshold = null;
      return finish({ saveHours: save, buyHours: best.hours, delayHours: save === null ? null : best.hours - save, strategy: best.strategy, buyAtHours: best.buyAt, affordHours: tauSoon, affordableNow: affordableNow, extraKnown: extraKnown, extraThreshold: threshold, optimal: hourly > 0 || affordableNow, journal: journal, claim: { finalCash: capital + before + Math.max(0, afterGain) - price, target: target, after: ['achat'], reachedAt: endMin } }, timingShape);
    } catch (error) { return fail(timingShape, error.message); }
  }

  /** Lot 1 : durée de jeu lisible, comme dans l’interface (minutes arrondies au-dessus ; « 1 h 05 », « 1 h 05 min » en allemand). */
  function durationText(hoursValue, lang) {
    if (typeof hoursValue !== 'number' || !Number.isFinite(hoursValue)) return '—';
    var m = Math.ceil(hoursValue * 60 - 1e-8), l = lang || LANG;
    return m < 60 ? m + ' min' : Math.floor(m / 60) + ' h' + (m % 60 ? ' ' + String(m % 60).padStart(2, '0') + (l === 'de' ? ' min' : '') : '');
  }

  return Object.freeze(Object.defineProperties({ missionPlan:missionPlan, missionAlternatives:missionAlternatives, missionDeadline:missionDeadline, missionCurve:missionCurve, missionVerify:missionVerify, investmentCompare:investmentCompare, planCurve:planCurve, planCashAt:planCashAt, planStrategies:planStrategies, planDeadline:planDeadline, nextSession:nextSession, choose:choose, businessPlan:businessPlan, worth:worth, investmentActivities: investmentActivities, sessionProjection: sessionProjection, activity: activity, goal: goal, goalMixed: goalMixed, inverse: inverse, roi: roi, purchase: purchase, budget: budget, order: order, compareBuy: compareBuy, goalContinuous: goalContinuous, sessionPlan: sessionPlan, parseLocalizedNumber: parseLocalizedNumber, cashJournalVerify: cashJournalVerify, purchaseGoalTiming: purchaseGoalTiming }, { dollars: { value: dollars }, lang: { value: LANG }, plural: { value: plural }, dateText: { value: dateText }, durationText: { value: durationText }, calendarDays: { value: calendarDays } /* lot 2 : aide de calendrier (rend un nombre), non énumérable comme durationText */ }));
}));
