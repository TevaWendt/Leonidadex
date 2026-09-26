/* Home preview uses exactly the same pure calculator as the full workshop. */
(function () {
  'use strict';
  const form = document.getElementById('lk-mini-form');
  if (!form) return;
  const E = window.LKCalcEngine;
  const output = document.getElementById('lk-mini-answer');
  const error = document.getElementById('lk-mini-error');
  const keys = ['capital', 'target', 'hourly'];
  const labels = { capital: 'ce que tu as', target: 'ce que tu veux', hourly: 'ce que tu gagnes par heure' };
  const format = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 });
  let announceTimer;

  function parse(value) {
    let n;
    if (E && E.parseLocalizedNumber) {
      const parsed = E.parseLocalizedNumber(value);
      if (!parsed.valid) return null;
      n = parsed.value;
    } else {
      const text = String(value).trim();
      if (!/^\d+(?:[,.]\d+)?$/.test(text)) return null;
      n = Number(text.replace(',', '.'));
    }
    return Number.isFinite(n) && n >= 0 && n <= 1e12 ? n : null;
  }
  function inputs(showErrors) {
    const values = {};
    let invalid;
    keys.forEach(key => {
      const field = form.elements.namedItem(key);
      const value = parse(field.value);
      field.setAttribute('aria-invalid', value === null ? 'true' : 'false');
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
  function words(n) { if (n === null || n < 1000) return ''; if (n >= 1e9) return format.format(n / 1e9) + (n / 1e9 >= 2 ? ' milliards' : ' milliard'); if (n >= 1e6) return format.format(n / 1e6) + (n / 1e6 >= 2 ? ' millions' : ' million'); return format.format(n / 1e3) + ' mille'; }
  function echoes() { keys.forEach(key => { const node = document.getElementById('lk-mini-echo-' + key); if (!node) return; const field = form.elements.namedItem(key), v = parse(field.value), w = words(v); node.textContent = w ? '= ' + w + ' $' : ''; if (v !== null && v >= 1000 && Number.isInteger(v) && document.activeElement !== field && /^[\d\s\u00a0\u202f]+$/.test(field.value)) { const g = String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); if (field.value !== g) field.value = g; } }); }
  function preview() {
    echoes();
    const values = inputs(false);
    output.replaceChildren();
    if (!values) { output.textContent = 'Remplis les trois cases pour voir ta réponse.'; return; }
    if (!E || !E.goalContinuous) { output.textContent = 'Ouvre le calculateur complet pour voir ta réponse.'; return; }
    const result = E.goalContinuous(Object.assign({ dailyMinutes: 60, reserve: 0 }, values));
    if (!result.valid) { output.textContent = result.reason; return; }
    const main = document.createElement('div');
    const big = document.createElement('strong'); big.textContent = duration(result.totalMinutes);
    const caption = document.createElement('span'); caption.textContent = result.totalMinutes === 0 ? 'Tu as déjà assez d’argent.' : 'de jeu';
    main.append(big, caption);
    const detail = document.createElement('p');
    const missing = document.createElement('b'); missing.textContent = format.format(result.missing) + ' $';
    detail.append(document.createTextNode('Il te manque '), missing);
    output.append(main, detail);
  }
  form.addEventListener('input', () => { clearTimeout(announceTimer); announceTimer = setTimeout(preview, 180); });
  form.addEventListener('submit', event => {
    event.preventDefault();
    clearTimeout(announceTimer);
    const values = inputs(true);
    if (!values) return;
    const params = new URLSearchParams({ tool: 'goal', from: 'home' });
    keys.forEach(key => params.set(key, String(values[key])));
    document.dispatchEvent(new CustomEvent('lk:calculator', { detail: { event: 'open', origin: 'home', tool: 'goal' } }));
    window.location.assign('calculateurs.html?' + params.toString() + '#atelier');
  });
  form.addEventListener('focusout', () => setTimeout(echoes, 0));
  preview();
}());
