/* Home preview uses exactly the same pure calculator as the full workshop. */
(function () {
  'use strict';
  const form = document.getElementById('lk-mini-form');
  if (!form) return;
  /* v7.82 (latence) : le moteur (calculateurs-engine.js, 48 Ko compressés) n'est plus chargé avec la page d'accueil ;
     déclaré <script type="lk/lazy">, il arrive au premier geste dans le formulaire (focus, saisie), puis l'aperçu se
     recalcule. S'il est déjà là (Tuto, pages qui le chargent), rien ne change. */
  let E = window.LKCalcEngine || null;
  let loadingEngine = null;
  function ensureEngine() {
    if (E) return Promise.resolve();
    if (!loadingEngine) loadingEngine = (window.LK && window.LK.lazyScript ? window.LK.lazyScript('calculateurs-engine.js') : Promise.reject(new Error('lazy'))).then(function () { E = window.LKCalcEngine || null; preview(); }).catch(function () { loadingEngine = null; });
    return loadingEngine;
  }
  const output = document.getElementById('lk-mini-answer');
  const error = document.getElementById('lk-mini-error');
  const keys = ['capital', 'target', 'hourly'];
  const labels = { capital: 'what you have', target: 'what you want', hourly: 'what you earn per hour' };
  const format = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
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
      error.textContent = 'Enter ' + labels[invalid.name] + ' as a number, for example 200,000.';
      error.hidden = !showErrors;
      if (showErrors) invalid.focus();
      return null;
    }
    error.hidden = true;
    return values;
  }
  function duration(minutes) {
    if (minutes === 0) return 'All set!';
    if (minutes < 1) return '< 1 min';
    const rounded = Math.ceil(minutes - 1e-9);
    const hours = Math.floor(rounded / 60), remainder = rounded % 60;
    return (hours ? format.format(hours) + ' h' : '') + (remainder ? (hours ? ' ' : '') + remainder + ' min' : '');
  }
  /* v7.61 : pluriel selon la langue de la page (« 1,5 million » en français, « 1,5 millones » en espagnol) */
  function many(x) { return /^fr/i.test(document.documentElement.lang || 'fr') ? x >= 2 : x !== 1; }
  function words(n) { if (n === null || n < 1000) return ''; if (n >= 1e9) return format.format(n / 1e9) + (many(n / 1e9) ? ' billion' : ' billion'); if (n >= 1e6) return format.format(n / 1e6) + (many(n / 1e6) ? ' million' : ' million'); return format.format(n / 1e3) + ' thousand'; }
  /* v7.60 (langues) : en anglais, « 200,000 » ; en français, « 200 000 » comme avant */
  const pageLang = (document.documentElement.lang || 'fr').slice(0, 2).toLowerCase();
  const en = pageLang !== 'fr';
  function echoes() { keys.forEach(key => { const node = document.getElementById('lk-mini-echo-' + key); if (!node) return; const field = form.elements.namedItem(key), v = parse(field.value), w = words(v); node.textContent = w ? '= ' + (E && E.dollars ? E.dollars(w, ' ') : w + ' $') : ''; if (v !== null && v >= 1000 && Number.isInteger(v) && document.activeElement !== field && (/^[\d\s\u00a0\u202f]+$/.test(field.value) || (en && (pageLang === 'de' ? /^[\d.]+$/ : /^[\d,]+$/).test(field.value)))) { const g = en ? format.format(v) : String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); if (field.value !== g) field.value = g; } }); }
  function preview() {
    echoes();
    const values = inputs(false);
    output.replaceChildren();
    if (!values) { output.textContent = 'Fill in all three fields to see your answer.'; return; }
    if (!E || !E.goalContinuous) { output.textContent = loadingEngine ? 'One moment…' : 'Open the full calculator to see your answer.'; return; }
    const result = E.goalContinuous(Object.assign({ dailyMinutes: 60, reserve: 0 }, values));
    if (!result.valid) { output.textContent = result.reason; return; }
    const main = document.createElement('div');
    const big = document.createElement('strong'); big.textContent = duration(result.totalMinutes);
    const caption = document.createElement('span'); caption.textContent = result.totalMinutes === 0 ? 'You already have enough money.' : 'of play';
    main.append(big, caption);
    const detail = document.createElement('p');
    const missing = document.createElement('b'); missing.textContent = E && E.dollars ? E.dollars(format.format(result.missing), ' ') : format.format(result.missing) + ' $';
    detail.append(document.createTextNode('You still need '), missing);
    output.append(main, detail);
  }
  form.addEventListener('focusin', () => { ensureEngine(); }, { once: true });
  form.addEventListener('input', () => { ensureEngine(); clearTimeout(announceTimer); announceTimer = setTimeout(preview, 180); });
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
