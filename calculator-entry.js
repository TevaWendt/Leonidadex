/* Généré depuis outils/sources/calculator-entry.js : modifie la source, pas ce fichier. */
(function () {
  'use strict';
  const form = document.getElementById('lk-mini-form');
  if (!form) return;
  let E = window.LKCalcEngine || null;
  let loadingEngine = null;
  let engineFailed = false;
  function ensureEngine() {
    if (E) return Promise.resolve();
    if (!loadingEngine) loadingEngine = (window.LK && window.LK.lazyScript ? window.LK.lazyScript('calculateurs-engine.js') : Promise.reject(new Error('lazy'))).then(function () { E = window.LKCalcEngine || null; preview(); }).catch(function () { loadingEngine = null; engineFailed = true; preview(); });
    return loadingEngine;
  }
  const output = document.getElementById('lk-mini-answer');
  const error = document.getElementById('lk-mini-error');
  const keys = ['capital', 'target', 'hourly'];
  const labels = { capital: 'ce que tu as', target: 'ce que tu veux', hourly: 'ce que tu gagnes par heure' };
  const format = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 });
  let announceTimer;
  function parseFallback(value) {
    const text = String(value).trim();
    if (!text) return null;
    const sep = /[ \u00a0\u202f]/g;
    if (pageLang === 'de') {
      if (!/^\d+(?:[. \u00a0\u202f]\d{3})*(?:,\d+)?$/.test(text)) return null;
      return Number(text.replace(/[. \u00a0\u202f]/g, '').replace(',', '.'));
    }
    if (pageLang === 'es' || pageLang === 'it' || pageLang === 'pt') {
      if (/^\d+\.\d{1,2}$/.test(text)) return Number(text);
      if (!/^\d+(?:[. \u00a0\u202f]\d{3})*(?:,\d+)?$/.test(text)) return null;
      return Number(text.replace(/[. \u00a0\u202f]/g, '').replace(',', '.'));
    }
    if (pageLang !== 'fr') {
      if (!/^\d+(?:[, \u00a0\u202f]\d{3})*(?:\.\d+)?$/.test(text)) return null;
      return Number(text.replace(/[, \u00a0\u202f]/g, ''));
    }
    if (!/^\d+(?:[ \u00a0\u202f]\d{3})*(?:[,.]\d+)?$/.test(text)) return null;
    return Number(text.replace(sep, '').replace(',', '.'));
  }
  function parse(value) {
    let n;
    if (E && E.parseLocalizedNumber) {
      const parsed = E.parseLocalizedNumber(value);
      if (!parsed.valid) return null;
      n = parsed.value;
    } else {
      n = parseFallback(value);
      if (n === null) return null;
    }
    return Number.isFinite(n) && n >= 0 && n <= 1e12 ? n : null;
  }
  let touched = false;
  function inputs(showErrors) {
    const values = {};
    let invalid;
    keys.forEach(key => {
      const field = form.elements.namedItem(key);
      const value = parse(field.value);
      if (value === null && !(touched || showErrors)) field.removeAttribute('aria-invalid'); else field.setAttribute('aria-invalid', value === null ? 'true' : 'false');
      if (value === null && !invalid) invalid = field;
      values[key] = value;
    });
    if (invalid) {
      error.textContent = 'Écris ' + labels[invalid.name] + ' avec un nombre, par exemple 200 000.';
      error.hidden = !showErrors;
      if (showErrors) invalid.focus();
      return null;
    }
    error.hidden = true;
    return values;
  }
  function duration(minutes) {
    if (minutes === 0) return 'C’est bon !';
    if (minutes < 1) return '< 1 min';
    const rounded = Math.ceil(minutes - 1e-9);
    const hours = Math.floor(rounded / 60), remainder = rounded % 60;
    return (hours ? format.format(hours) + ' h' : '') + (remainder ? (hours ? ' ' : '') + remainder + ' min' : '');
  }
  function many(x) { return /^(fr|pt)/i.test(document.documentElement.lang || 'fr') ? x >= 2 : x !== 1; }
  function words(n) { if (n === null || n < 1000) return ''; if (n >= 1e9) return format.format(n / 1e9) + (many(n / 1e9) ? ' milliards' : ' milliard'); if (n >= 1e6) return format.format(n / 1e6) + (many(n / 1e6) ? ' millions' : ' million'); return format.format(n / 1e3) + ' mille'; }
  const pageLang = (document.documentElement.lang || 'fr').slice(0, 2).toLowerCase();
  const en = pageLang !== 'fr';
  const sign = s => pageLang === 'en' ? '$' + s : pageLang === 'pt' ? '$\u00a0' + s : s + '\u00a0$';
  function echoes() { keys.forEach(key => { const node = document.getElementById('lk-mini-echo-' + key); if (!node) return; const field = form.elements.namedItem(key), v = parse(field.value), w = words(v); node.textContent = w ? '= ' + (E && E.dollars ? E.dollars(w, ' ') : sign(w)) : ''; if (v !== null && v >= 1000 && Number.isInteger(v) && document.activeElement !== field && (/^[\d\s\u00a0\u202f]+$/.test(field.value) || (en && (pageLang === 'de' || pageLang === 'pt' ? /^[\d.]+$/ : /^[\d,]+$/).test(field.value)) )) { const g = en ? format.format(v) : String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); if (field.value !== g) field.value = g; } }); }
  function preview() {
    echoes();
    const values = inputs(false);
    output.replaceChildren();
    if (!values) { output.textContent = 'Remplis les trois cases pour voir ta réponse.'; return; }
    if (!E || !E.goalContinuous) { output.textContent = loadingEngine || !engineFailed ? 'Un instant…' : 'Ouvre le calculateur complet pour voir ta réponse.'; return; }
    const result = E.goalContinuous(Object.assign({ dailyMinutes: 60, reserve: 0 }, values));
    if (!result.valid) { output.textContent = result.reason; return; }
    const main = document.createElement('div');
    const big = document.createElement('strong'); big.textContent = duration(result.totalMinutes);
    const caption = document.createElement('span'); caption.textContent = result.totalMinutes === 0 ? 'Tu as déjà assez d’argent.' : 'de jeu';
    main.append(big, caption);
    const detail = document.createElement('p');
    const missing = document.createElement('b'); missing.textContent = E && E.dollars ? E.dollars(format.format(result.missing), ' ') : format.format(result.missing) + ' $';
    detail.append(document.createTextNode('Il te manque '), missing);
    output.append(main, detail);
  }
  form.addEventListener('focusin', () => { ensureEngine(); }, { once: true });
  form.addEventListener('input', () => { touched = true; ensureEngine(); clearTimeout(announceTimer); announceTimer = setTimeout(preview, 180); });
  function preloadEngine() {
    if (E || (navigator.connection && navigator.connection.saveData)) return;
    const idle = typeof window.requestIdleCallback === 'function' ? cb => window.requestIdleCallback(cb, { timeout: 2500 }) : cb => setTimeout(cb, 1500);
    idle(() => { ensureEngine(); });
  }
  if (document.readyState === 'complete') preloadEngine(); else window.addEventListener('load', preloadEngine, { once: true });
  form.addEventListener('submit', event => {
    event.preventDefault();
    clearTimeout(announceTimer);
    if (!E && loadingEngine) { loadingEngine.then(() => form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event('submit', { cancelable: true }))); return; }
    const values = inputs(true);
    if (!values) return;
    const params = new URLSearchParams({ tool: 'goal', from: 'home' });
    keys.forEach(key => params.set(key, String(values[key])));
    window.location.assign('calculateurs.html?' + params.toString() + '#atelier');
  });
  form.addEventListener('focusout', () => setTimeout(echoes, 0));
  preview();
}());
