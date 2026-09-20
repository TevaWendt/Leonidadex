/* ============================================================
   LEONIDAKIT — calculateurs-hub.js : le point d'entrée des calculateurs
   - « Que veux-tu calculer ? » : une phrase suffit, l'outil qui répond s'ouvre, prérempli quand la phrase
     contient un montant ou une durée (« 1 million », « 45 minutes par jour », « acheter une voiture »…).
   - Objectifs populaires : un clic règle l'objectif et ouvre l'outil.
   - Cartes des six outils : ouvrent l'onglet correspondant.
   - Compteurs animés : les résultats principaux glissent d'une valeur à l'autre au lieu de sauter.
   - Étiquette « hypothèse » sur chaque panneau de résultat : rien ici n'est une donnée officielle GTA VI.
   Ne touche ni au moteur ni aux formules (calculateurs-engine.js).
   ============================================================ */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- lecture d'une phrase ---------- */
  const ROUTES = [
    { tab: 'goal', label: 'Mon objectif', re: /objectif|million|millions|\bM\$|atteindre|cap\b|combien de temps|jours|semaines|route|passer de|capital|économiser|epargn|épargn/i },
    { tab: 'activities', label: 'Activités & grind', re: /activit|grind|mission|\$\s*\/\s*h|par heure|heure de jeu|rentable|rapporte|gagner|gain|farm|braquage|coup\b|session|comparer les activ|inverse/i },
    { tab: 'roi', label: 'Rentabilité', re: /rentab|roi\b|amorti|retour sur|investi|seuil|break|rembours|combien d'utilisations|payer son/i },
    { tab: 'purchase', label: 'Mes achats', re: /achet|achat|prix|coûte|coute|me permettre|véhicule|vehicule|voiture|moto|bateau|propriét|propriet|maison|compar(er|aison) (de|des|deux) (véhicules|vehicules|voitures)|catalogue/i },
    { tab: 'budget', label: 'Mon budget', re: /budget|répart|repart|réserve|reserve|poste|dépens|depens|enveloppe/i },
    { tab: 'order', label: "Ordre d'achat", re: /ordre|d'abord|en premier|priorit|scénario|scenario|puis\b|avant de|séquence|sequence/i },
  ];
  const STRONG = [
    { tab: 'order', re: /\bordre\b|priorit|d'abord|en premier|séquence|sequence/i },
    { tab: 'budget', re: /budget|répartir|repartir|répartition|repartition|enveloppe/i },
    { tab: 'roi', re: /rentab|\broi\b|amorti|retour sur|seuil/i },
    { tab: 'activities', re: /activit|grind|par heure|\$\s*\/\s*h|je gagne combien|combien (puis-je|je peux) gagner|rapporte le plus/i },
  ];
  const MONEY = /(\d[\d\s.,]*?)\s*(millions?|mille|k(?![a-z])|m(?![a-z])|\$)/gi;
  function parseMoney(text) {
    const t = text.replace(/\u202f|\u00a0/g, ' ');
    let best = null;
    for (const m of t.matchAll(MONEY)) {
      let n = parseFloat(m[1].replace(/\s/g, '').replace(',', '.'));
      if (!Number.isFinite(n)) continue;
      const u = m[2].toLowerCase();
      if (u === 'k' || u === 'mille') n *= 1000;
      if (u === 'm' || u === 'million' || u === 'millions') n *= 1000000;
      if (best === null || n > best) best = n;
    }
    return best;
  }
  function parseMinutesPerDay(text) {
    const m = text.match(/(\d+(?:[.,]\d+)?)\s*(h|heure|heures|min|minutes?)\b[^.]*?(jour|day|quotid)/i) || text.match(/(\d+(?:[.,]\d+)?)\s*(h|heure|heures|min|minutes?)\b/i);
    if (!m) return null;
    const n = parseFloat(m[1].replace(',', '.'));
    return /^h/i.test(m[2]) ? Math.round(n * 60) : Math.round(n);
  }
  function setField(id, value) {
    const el = $(id); if (!el || value === null || value === undefined) return false;
    el.value = String(value); el.dispatchEvent(new Event('input', { bubbles: true })); return true;
  }
  function openTab(tab) { const b = document.querySelector('[data-tab="' + tab + '"]'); if (b) b.click(); return !!b; }
  function route(text) {
    const q = String(text || '').trim(); if (!q) return null;
    const strong = STRONG.find(x => x.re.test(q));
    const r = strong ? ROUTES.find(x => x.tab === strong.tab) : (ROUTES.find(x => x.re.test(q)) || ROUTES[0]);
    const money = parseMoney(q), minutes = parseMinutesPerDay(q);
    const have = q.match(/j'ai\s+(\d[\d\s.,]*?)\s*(millions?|mille|k(?![a-z])|m(?![a-z])|\$)/i);
    const capital = have ? parseMoney(have[0].replace(/^j'ai\s+/i, '')) : null;
    const done = [];
    if (r.tab === 'goal') {
      if (capital && setField('f-goal-capital', capital)) done.push('capital ' + fmt(capital));
      if (money && money >= 10000 && money !== capital) { if (setField('f-goal-target', money)) done.push('objectif ' + fmt(money)); }
      if (minutes && setField('f-goal-dailyMinutes', minutes)) done.push(minutes + ' min par jour');
    }
    if (r.tab === 'activities' && minutes && setField('f-inverse-minutes', minutes)) done.push(minutes + ' min de jeu');
    if (r.tab === 'purchase' && money && setField('f-purchase-price', money)) done.push('prix ' + fmt(money));
    openTab(r.tab);
    /* un nom de véhicule du catalogue dans la phrase : l'outil Achats le cherche directement */
    if (r.tab === 'purchase' && Array.isArray(window.LK_VEHICULES)) {
      const ql = q.toLowerCase();
      const v = window.LK_VEHICULES.filter(x => x.nom && x.nom.length >= 4 && ql.includes(x.nom.toLowerCase())).sort((a, b) => b.nom.length - a.nom.length)[0];
      if (v && setField('catalogue-search', v.nom)) done.push('catalogue : ' + v.nom);
    }
    return { tab: r.tab, label: r.label, done };
  }
  const fmt = n => new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' $';

  /* ---------- barre « que veux-tu calculer ? » ---------- */
  const form = $('calc-ask'), input = $('calc-ask-input'), out = $('calc-ask-out');
  function answer(text) {
    const r = route(text);
    if (!r) return;
    if (out) { out.textContent = 'Ouvert : ' + r.label + (r.done.length ? ' · ' + r.done.join(' · ') : ''); out.hidden = false; }
    const target = $('atelier'); if (target) target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  }
  if (form && input) {
    form.addEventListener('submit', ev => { ev.preventDefault(); answer(input.value); });
    document.querySelectorAll('[data-ask]').forEach(b => b.addEventListener('click', () => { input.value = b.dataset.ask; answer(b.dataset.ask); }));
  }
  /* objectifs populaires et cartes des outils */
  document.querySelectorAll('[data-goal-preset]').forEach(b => b.addEventListener('click', () => {
    setField('f-goal-target', Number(b.dataset.goalPreset)); openTab('goal');
    const target = $('atelier'); if (target) target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  }));
  document.querySelectorAll('[data-open-tab]').forEach(b => b.addEventListener('click', ev => {
    ev.preventDefault(); openTab(b.dataset.openTab);
    const target = $('atelier'); if (target) target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  }));

  /* ---------- compteurs animés sur les résultats principaux ---------- */
  const last = new WeakMap();
  function animateNode(node) {
    const txt = node.textContent;
    const m = txt.match(/^(\D*?)(-?\d[\d\s\u202f\u00a0.,]*)(.*)$/);
    if (!m) return;
    const target = parseFloat(m[2].replace(/[\s\u202f\u00a0]/g, '').replace(',', '.'));
    if (!Number.isFinite(target)) return;
    const from = last.get(node);
    last.set(node, target);
    if (reduced || from === undefined || from === target || node.dataset.lkAnimating) return;
    const dec = (m[2].split(/[.,]/)[1] || '').length, prefix = m[1], suffix = m[3], t0 = performance.now(), dur = 520;
    node.dataset.lkAnimating = '1';
    const step = now => {
      const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      const v = from + (target - from) * e;
      node.textContent = prefix + new Intl.NumberFormat('fr-FR', { minimumFractionDigits: dec, maximumFractionDigits: dec }).format(v).replace(/\u202f/g, ' ') + suffix;
      if (p < 1) requestAnimationFrame(step); else { node.textContent = txt; delete node.dataset.lkAnimating; }
    };
    requestAnimationFrame(step);
  }
  const results = document.querySelector('#atelier');
  if (results && window.MutationObserver) {
    const obs = new MutationObserver(() => { results.querySelectorAll('.calc-result-main, .calc-metric-value, .calc-big').forEach(animateNode); tagHypotheses(); });
    obs.observe(results, { childList: true, subtree: true, characterData: true });
    results.querySelectorAll('.calc-result-main, .calc-metric-value, .calc-big').forEach(n => last.set(n, parseFloat((n.textContent.match(/-?\d[\d\s\u202f\u00a0.,]*/) || ['NaN'])[0].replace(/[\s\u202f\u00a0]/g, '').replace(',', '.'))));
  }
  /* ---------- étiquette « hypothèse utilisateur » sur chaque panneau de résultat ---------- */
  function tagHypotheses() {
    document.querySelectorAll('#atelier .calc-result').forEach(panel => {
      if (panel.querySelector('.lk-hyp')) return;
      const tag = document.createElement('span'); tag.className = 'lk-hyp'; tag.textContent = 'Calculé sur tes hypothèses, pas sur des données officielles';
      panel.insertBefore(tag, panel.firstChild);
    });
  }
  tagHypotheses();
  window.LKCalcHub = { route, parseMoney, parseMinutesPerDay };
})();
