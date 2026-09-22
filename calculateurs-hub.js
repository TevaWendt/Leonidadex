/* Intent shortcuts. Calculation and state ownership stay in LKCalculator. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const rules = [
    { tab: 'order', label: 'Quoi acheter d’abord ?', re: /\bordre\b|priorit|d'abord|en premier|sequence/ },
    { tab: 'roi', label: 'Ça vaut le coup ?', re: /rentab|\broi\b|amorti|retour sur|investi|seuil/ },
    { tab: 'session', label: 'Mon temps de jeu', re: /session|j'ai du temps|minutes?\b|temps disponible/ },
    { tab: 'budget', label: 'Mon budget', re: /repart|reserve|enveloppe|poste de depense/ },
    { tab: 'purchase', label: 'Mes achats', re: /achet|achat|prix|cout|permettre|vehicule|voiture|moto|bateau|propriete|maison|arme|budget/ },
    { tab: 'activities', label: 'Mes activités', re: /activit|grind|mission|par heure|rapporte|farm|braquage|gain net/ },
    { tab: 'goal', label: 'Mon objectif', re: /objectif|million|atteindre|capital|economis|epargn|combien de temps/ }
  ];
  function parseMoney(value) {
    const text = normalize(value);
    const matches = text.matchAll(/(\d[\d\s\u00a0\u202f.,]*?)\s*(millions?|mille|k(?![a-z])|m(?![a-z])|\$)/g);
    const amounts = [];
    for (const match of matches) {
      const num = Number(match[1].replace(/[\s\u00a0\u202f]/g, '').replace(',', '.'));
      const unit = match[2];
      const amount = num * (/^(m|millions?)$/.test(unit) ? 1e6 : /^(k|mille)$/.test(unit) ? 1e3 : 1);
      if (Number.isFinite(amount) && amount >= 0 && amount <= 1e12) amounts.push(amount);
    }
    return amounts.length ? Math.max(...amounts) : null;
  }
  function parseMinutesPerDay(value) {
    const match = normalize(value).match(/(\d+(?:[.,]\d+)?)\s*(heures?|h|min(?:utes?)?)\b/);
    if (!match) return null;
    const minutes = Number(match[1].replace(',', '.')) * (match[2].startsWith('h') ? 60 : 1);
    return Number.isFinite(minutes) && minutes > 0 && minutes <= 1e6 ? minutes : null;
  }
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
    const intent = /objectif|million|atteindre|epargn|economis/.test(text) ? rules[rules.length - 1] : rules.find(rule => rule.re.test(text)) || rules[rules.length - 1];
    const amount = parseMoney(text), minutes = parseMinutesPerDay(text), changed = [];
    openTab(intent.tab);
    if (intent.tab === 'goal') {
      const params = {};
      const have = text.match(/j['’]ai\s+(\d[\d\s.,]*?)\s*(millions?|mille|k(?![a-z])|m(?![a-z])|\$)/);
      const capital = have ? parseMoney(have[0]) : null;
      if (capital !== null) { params.capital = capital; changed.push('ton argent est rempli'); }
      if (amount !== null && amount !== capital) { params.target = amount; changed.push('ton objectif est rempli'); }
      if (minutes !== null && minutes <= 1440) { params.dailyMinutes = minutes; changed.push('ton temps de jeu est rempli'); }
      if (Object.keys(params).length) applyGoal(params);
    }
    if (intent.tab === 'session' && minutes !== null && field('f-session-minutes', minutes)) changed.push('ton temps est rempli');
    if (intent.tab === 'purchase' && amount !== null && field('f-purchase-price', amount)) changed.push('le prix est rempli');
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
    if (out) { out.textContent = result.label + (result.done.length ? ' · ' + result.done.join(' · ') : ' : remplis les cases juste en dessous.'); out.hidden = false; }
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
