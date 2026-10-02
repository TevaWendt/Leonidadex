/* Intent shortcuts. Calculation and state ownership stay in LKCalculator. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[’‘]/g, "'").replace(/[\u00a0\u202f]/g, ' ');
  const rules = [
    { tab: 'plan', label: 'My business plan', re: /business plan|mon plan|plan complet|etape par etape|quoi faire en premier|plan d'action|echeance|d'ici (le|la|\d)|en \d+ jours|avant le \d|prochaine partie|programme de la semaine|ou en suis-je|mission par mission|partie par partie|plan de secours|plan b|debloquer|rang \d|niveau \d|\bxp\b|my plan|step by step|what (?:should i|to) do first|action plan|deadline|in \d+ days|by (?:the )?\d|next session|weekly schedule|backup plan|\bunlock|\brank \d|\blevel \d/ },
    { tab: 'compare', label: 'Which purchase should I pick?', re: /choisir|comparer|lequel|laquelle|le mieux|meilleur achat|rapport qualite|le plus rentable|le moins cher|\bou\b.*\bou\b|\bchoose|\bcompare|\bwhich (?:one|is|should)|best (?:buy|purchase|value)|value for money|most profitable|\bcheapest/ },
    { tab: 'order', label: 'What should I buy first?', re: /\bordre\b|priorit|d'abord|en premier|sequence|\border\b|buy first|\bfirst\b/ },
    { tab: 'roi', label: 'Is it worth it?', re: /rentab|\broi\b|amorti|retour sur|investi|seuil|vaut le coup|a partir de quand|rembours|vaut-il|ca vaut|profitab|worth it|is it worth|pay(?:s)? (?:for itself|back|off)|break.?even|return on|\binvest/ },
    { tab: 'session', label: 'My play time', re: /session|j'ai du temps|minutes?\b|temps disponible|i have (?:some )?time|time (?:i have|available)|available time|tonight/ },
    { tab: 'budget', label: 'My budget', re: /repart|reserve|enveloppe|poste de depense|\bsplit\b|\bspread\b|allocat|divide (?:it|my)/ },
    { tab: 'purchase', label: 'My purchases', re: /achet|achat|prix|cout|permettre|vehicule|voiture|moto|bateau|propriete|maison|arme|budget|\bbuy|purchase|price|\bcost|afford|vehicle|\bcar\b|\bbike|motorcycle|\bboat|property|\bhouse|weapon|\bgun/ },
    { tab: 'activities', label: 'My activities', re: /activit|grind|mission|par heure|rapporte|farm|braquage|gain net|per hour|an hour|\bearn|heist|payout|net gain/ },
    { tab: 'goal', label: 'My goal', re: /objectif|million|atteindre|capital|economis|epargn|combien de temps|\bgoal|\breach|\bsave|saving|how long/ }
  ];
  /* v7.60 (langues) : la page dit sa langue (<html lang>) : en français « 1 000 000 », « 1,5 million », « 250 k », « j'ai… » ;
     en anglais « 1,000,000 », « 1.5 million », « $200,000 », « 250k », « I have… », « 2 hours a day ». */
  const LANG = (document.documentElement.lang || 'fr').slice(0, 2).toLowerCase();
  const toNumber = raw => { const t = String(raw).replace(/[\s  ]/g, ''); return Number(LANG === 'fr' ? t.replace(',', '.') : t.replace(/,/g, '')); };
  const UNIT = 'millions?|mille|thousand|billions?|k(?![a-z])|m(?![a-z])';
  const scale = unit => /^(m|millions?)$/.test(unit) ? 1e6 : /^(k|mille|thousand)$/.test(unit) ? 1e3 : /^billions?$/.test(unit) ? 1e9 : 1;
  const SUFFIX = new RegExp('(\\d[\\d\\s\\u00a0\\u202f.,]*?)\\s*(' + UNIT + '|\\$)', 'g');
  const PREFIX = new RegExp('\\$\\s*(\\d[\\d,.]*\\d|\\d)\\s*(' + UNIT + ')?', 'g');
  function parseMoney(value) {
    const text = normalize(value);
    const amounts = [];
    const push = (num, unit) => { const amount = toNumber(num) * scale(unit || ''); if (Number.isFinite(amount) && amount >= 0 && amount <= 1e12) amounts.push(amount); };
    for (const match of text.matchAll(SUFFIX)) push(match[1], match[2] === '$' ? '' : match[2]);
    if (LANG !== 'fr') for (const match of text.matchAll(PREFIX)) push(match[1], match[2]);
    return amounts.length ? Math.max(...amounts) : null;
  }
  function parseMinutesPerDay(value) {
    const match = normalize(value).match(/(\d+(?:[.,]\d+)?)\s*(heures?|hours?|hrs?|h|min(?:utes?)?|mins?)\b/);
    if (!match) return null;
    const minutes = Number(match[1].replace(',', '.')) * (match[2].startsWith('h') ? 60 : 1);
    return Number.isFinite(minutes) && minutes > 0 && minutes <= 1e6 ? minutes : null;
  }
  /* L'argent que le joueur a déjà : « j'ai 200 000 $ » ; « I have $200,000 », « I've got 250k » */
  const HAVE_FR = /j'ai\s+(\d[\d\s.,]*?)\s*(millions?|mille|k(?![a-z])|m(?![a-z])|\$)/;
  const HAVE_EN = new RegExp("\\bi(?: have| ve got| ve| got| own)\\s+(?:got\\s+)?(\\$\\s*\\d[\\d,.]*(?:\\s*(?:" + UNIT + "))?|\\d[\\d\\s.,]*?\\s*(?:" + UNIT + "|\\$))");
  function haveAmount(text) { const m = text.match(HAVE_FR) || (LANG !== 'fr' ? text.replace(/i'/g, 'i ').match(HAVE_EN) : null); return m ? parseMoney(m[0].replace(/^.*?(?=\$|\d)/, '')) : null; }
  function field(id, value) {
    const input = $(id);
    if (!input || value === null || value === undefined) return false;
    input.value = String(value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  }
  function openTab(tab) {
    if (window.LKCalculator && window.LKCalculator.openTab) { window.LKCalculator.openTab(tab); return true; }
    const button = document.querySelector('[data-tab="' + tab + '"]');
    if (button) button.click();
    return !!button;
  }
  function applyGoal(values) {
    if (window.LKCalculator && window.LKCalculator.applyGoal) window.LKCalculator.applyGoal(values);
    else Object.keys(values).forEach(key => field('f-goal-' + key, values[key]));
  }
  function route(value) {
    const q = String(value || '').trim();
    if (!q) return null;
    const text = normalize(q);
    let intent = /objectif|million|atteindre|epargn|economis|\bgoal\b/.test(text) ? rules[rules.length - 1] : rules.find(rule => rule.re.test(text)) || rules[rules.length - 1];
    /* v7.59 (check ultime, CALC-11) : « quelle mission rapporte le plus en 90 minutes ? » parle d'activités, pas d'une partie ;
       le mot « minutes » seul ne suffit plus à ouvrir Mon temps de jeu quand la phrase parle de missions ou de gains. */
    if (intent.tab === 'session' && !/session|j'ai du temps|temps disponible|ce soir|i have (?:some )?time|tonight/.test(text) && rules.find(r => r.tab === 'activities').re.test(text)) intent = rules.find(r => r.tab === 'activities');
    const amount = parseMoney(text), minutes = parseMinutesPerDay(text), changed = [];
    openTab(intent.tab);
    if (intent.tab === 'goal') {
      const params = {};
      const capital = haveAmount(text);
      if (capital !== null) { params.capital = capital; changed.push('your money is entered'); }
      if (amount !== null && amount !== capital) { params.target = amount; changed.push('your goal is entered'); }
      if (minutes !== null && minutes <= 1440) { params.dailyMinutes = minutes; changed.push('your play time is entered'); }
      if (Object.keys(params).length) applyGoal(params);
    }
    if (intent.tab === 'session' && minutes !== null && field('f-session-minutes', minutes)) changed.push('your time is entered');
    if (intent.tab === 'plan') {
      /* Le business plan a ses propres cases : on remplit celles-là, jamais celles des huit calculs. */
      const capital = haveAmount(text);
      if (capital !== null && field('plan-capital', capital)) changed.push('your money is entered in the plan');
      if (amount !== null && amount !== capital && (field('plan-price', amount) || field('plan-target', amount))) changed.push('your goal is entered in the plan');
      if (minutes !== null && minutes <= 1440 && field('plan-daily', minutes)) changed.push('the duration of your sessions is entered');
    }
    if (intent.tab === 'purchase' && amount !== null && field('f-purchase-price', amount)) changed.push('the price is entered');
    /* v7.59 (check ultime, CALC-11) : « j'ai X $ » remplit « J'ai déjà » dans l'outil ouvert (même case partagée) ; un prix
       va aussi dans « Ça vaut le coup ? » ; un temps en minutes va dans « Mes activités ». Rien d'autre n'est deviné. */
    if (intent.tab !== 'goal' && intent.tab !== 'plan') {
      const capital = haveAmount(text);
      const capField = document.querySelector('#panel-' + intent.tab + ' input[data-field="goal.capital"]');
      if (capital !== null && capField && field(capField.id, capital)) changed.push('your money is entered');
      if (intent.tab === 'roi' && amount !== null && amount !== capital && field('f-roi-purchase', amount)) changed.push('the price is entered');
      if (intent.tab === 'activities' && minutes !== null && minutes <= 1000000 && field('f-inverse-minutes', minutes)) changed.push('your time is entered');
    }
    return { tab: intent.tab, label: intent.label, done: changed };
  }
  function focusWorkshop() {
    const workshop = $('atelier');
    if (workshop) workshop.scrollIntoView({ behavior: 'auto', block: 'start' });
  }
  const form = $('calc-ask'), input = $('calc-ask-input'), out = $('calc-ask-out');
  function answer(value) {
    const result = route(value);
    if (!result) return;
    if (out) { out.textContent = result.label + (result.done.length ? ' · ' + result.done.join(' · ') : ' — fill in the boxes just below.'); out.hidden = false; }
    focusWorkshop();
  }
  if (form && input) {
    form.addEventListener('submit', event => { event.preventDefault(); answer(input.value); });
    document.querySelectorAll('[data-ask]').forEach(button => button.addEventListener('click', () => { input.value = button.dataset.ask; answer(input.value); }));
  }
  document.querySelectorAll('[data-goal-preset]').forEach(button => button.addEventListener('click', () => {
    const target = Number(button.dataset.goalPreset);
    if (!Number.isFinite(target) || target < 0 || target > 1e12) return;
    openTab('goal'); applyGoal({ target }); focusWorkshop();
  }));
  document.querySelectorAll('[data-open-tab]').forEach(button => button.addEventListener('click', event => { event.preventDefault(); openTab(button.dataset.openTab); focusWorkshop(); }));
  window.LKCalcHub = { route, parseMoney, parseMinutesPerDay };
}());
