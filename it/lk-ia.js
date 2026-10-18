/* Généré depuis outils/sources/lk-ia.js : modifie la source, pas ce fichier. */
(function () {
  'use strict';
  if (window.LKIA) return;
  const KEY_MODE = 'lk_ia_mode', KEY_DEV = 'lk_ia_appareil', KEY_ETAT = 'lk_ia_etat';
  const K = { mode: KEY_MODE, dev: KEY_DEV, etat: KEY_ETAT };
  const put = fn => { try { fn(); } catch (e) {  } };
  const DEVICE = /^[A-Za-z0-9_-]{16,64}$/;
  const lang = (document.documentElement.lang || 'fr').slice(0, 2), locale = { fr: 'it-IT', en: 'en-GB', es: 'es-ES', it: 'it-IT', de: 'de-DE', pt: 'pt-BR' }[lang] || 'it-IT';
  const local = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } } };
  const session = { get(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } } };
  const nf = n => new Intl.NumberFormat(locale).format(n);
  put(() => localStorage.removeItem('lk_ia_jeton'));
  function device() {
    let d = local.get(K.dev);
    if (!DEVICE.test(d || '')) { const b = new Uint8Array(16); (window.crypto || {}).getRandomValues ? crypto.getRandomValues(b) : b.forEach((_, i) => { b[i] = Math.random() * 256; }); d = Array.from(b, x => 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'[x & 63]).join(''); const v = d; put(() => localStorage.setItem(KEY_DEV, v)); }
    return d;
  }
  const existing = () => { const d = local.get(K.dev); return DEVICE.test(d || '') ? d : ''; };
  let acted = false;
  const mode = () => local.get(K.mode) === 'local' ? 'local' : 'ia';
  let state = (() => { try { const s = JSON.parse(session.get(K.etat) || 'null'); return s && Date.now() - (s.at || 0) < 5 * 60000 ? s : {}; } catch (e) { return {}; } })();
  const listeners = new Set();
  function emit() { state.at = Date.now(); if (acted) { const v = JSON.stringify(state); put(() => sessionStorage.setItem(KEY_ETAT, v)); } listeners.forEach(fn => { try { fn(api.state()); } catch (e) {  } }); paint(); }
  function merge(x) { Object.keys(x || {}).forEach(k => { if (x[k] !== undefined) state[k] = x[k]; }); if (state.reset && state.reset < Date.now()) { state.restant = state.gratuit; state.reset = null; } if (state.plafond && state.plafond < Date.now()) state.plafond = null; emit(); }
  const exhausted = () => state.restant === 0;
  const total = () => state.gratuit || 15, hours = () => state.heures || 12;
  async function post(url, body) {
    const ctl = typeof AbortController === 'function' ? new AbortController() : null, timer = setTimeout(() => { if (ctl) ctl.abort(); }, 15000);
    try { const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctl ? ctl.signal : undefined }); let j = null; try { j = await r.json(); } catch (e) { j = null; } return { status: r.status, j }; }
    catch (e) { return { status: 0, j: null }; } finally { clearTimeout(timer); }
  }
  let refreshing = null;
  function refresh(force) {
    if (mode() === 'local' && !force) return Promise.resolve(api.state());
    if (refreshing) return refreshing;
    if (!force && state.at && Date.now() - state.at < 60000 && state.on !== undefined) return Promise.resolve(api.state());
    refreshing = post('/api/ia', { mode: 'etat', appareil: existing() || undefined }).then(({ status, j }) => {
      refreshing = null;
      if (status === 503 || status === 404 || status === 405) { merge({ on: false }); return api.state(); }
      if (j && j.ok) merge({ on: true, gratuit: j.gratuit, heures: j.heures, restant: j.restant, reset: j.reset, modele: j.modele, plafond: j.plafond || null });
      return api.state();
    });
    return refreshing;
  }
  function learn(status, j) {
    if (status === 503 || status === 404 || status === 405) return merge({ on: false });
    if (status === 402 && j && j.code === 'plafond') return merge({ on: true, gratuit: j.gratuit, heures: j.heures, restant: j.restant, reset: j.reset, plafond: j.plafond || null });
    if (status === 402 && j) return merge({ on: true, gratuit: j.gratuit, heures: j.heures, restant: 0, reset: j.reset });
    if (j && j.acces) merge({ on: true, gratuit: j.acces.gratuit, heures: j.acces.heures, restant: j.acces.restant, reset: j.acces.reset });
  }
  const pad = n => (n < 10 ? '0' : '') + n;
  function countdown(at) { const left = Math.max(0, Math.round((at - Date.now()) / 1000)), h = Math.floor(left / 3600), m = Math.floor((left % 3600) / 60), s = left % 60; return (h ? h + ':' : '') + pad(m) + ':' + pad(s); }
  const tpl = (t, v) => t.replace(/\{(\w+)\}/g, (m, k) => v[k] === undefined ? m : String(v[k]));
  const T = {
    off: 'IA non disponibile al momento: risposte locali del sito.',
    local: 'Modalità locale: risposte del sito, senza IA. Le tue domande gratuite all’IA restano da parte.',
    some: 'IA: {n} domande gratuite su {total}, di nuovo {total} tra {timer}.',
    one: 'IA: {n} domanda gratuita su {total}, di nuovo {total} tra {timer}.',
    full: 'IA: {total} domande gratuite ogni {h} h.',
    quota: 'Domande IA gratuite esaurite: modalità locale, l’IA torna tra {timer}.',
    quotaNoReset: 'Domande IA gratuite esaurite: modalità locale.',
    plafond: 'L’IA del sito ha raggiunto il suo limite giornaliero: modalità locale, torna tra {timer}.'
  };
  function status() {
    const r = raw(); r.plain = r.timer ? tpl(r.text, { timer: countdown(r.timer) }) : r.text; return r;
  }
  function raw() {
    if (state.on === false) return { kind: 'off', text: T.off };
    if (mode() === 'local') return { kind: 'local', text: T.local };
    if (state.plafond && state.plafond > Date.now()) return { kind: 'quota', text: T.plafond, timer: state.plafond };
    const v = { n: nf(state.restant || 0), total: nf(total()), h: nf(hours()), timer: '{timer}' };
    if (typeof state.restant === 'number' && state.restant > 0) {
      if (!state.reset || state.restant >= total()) return { kind: 'ia', text: tpl(T.full, v) };
      return { kind: 'ia', text: tpl(state.restant > 1 ? T.some : T.one, v), timer: state.reset };
    }
    if (state.restant === 0) return state.reset ? { kind: 'quota', text: tpl(T.quota, v), timer: state.reset } : { kind: 'quota', text: T.quotaNoReset };
    return { kind: 'ia', text: tpl(T.full, v) };
  }
  const controls = new Set();
  function control(where) {
    const box = document.createElement('div'); box.className = 'lkia lkia--' + where;
    box.innerHTML = '<div class="lkia-sw" role="group" aria-label="Chi risponde?"><span class="lkia-t">Chi risponde?</span><button type="button" data-lkia-mode="ia">IA</button><button type="button" data-lkia-mode="local">Locale</button></div><p class="lkia-st" role="status" aria-live="polite"></p>';
    box.addEventListener('click', e => { const m = e.target.closest('[data-lkia-mode]'); if (m) setMode(m.dataset.lkiaMode); });
    controls.add(box); paintOne(box);
    const wake = () => refresh(false);
    if (where === 'leo') wake(); else box.addEventListener('focusin', wake, { once: true, passive: true });
    return box;
  }
  function line(p, st) {
    const parts = st.text.split('{timer}');
    if (p.dataset.lkiaText === st.text && p.dataset.lkiaTimer === String(st.timer || '')) { if (st.timer) { const t = p.querySelector('.lkia-timer'); if (t) t.textContent = countdown(st.timer); } return; }
    p.dataset.lkiaText = st.text; p.dataset.lkiaTimer = String(st.timer || ''); p.textContent = '';
    parts.forEach((txt, i) => { if (i) { const t = document.createElement('time'); t.className = 'lkia-timer'; t.setAttribute('role', 'timer'); t.dateTime = new Date(st.timer).toISOString(); t.textContent = countdown(st.timer); p.appendChild(t); } if (txt) p.appendChild(document.createTextNode(txt)); });
  }
  function paintOne(box) {
    const st = status(), m = mode(), off = state.on === false;
    box.dataset.kind = st.kind;
    box.querySelectorAll('[data-lkia-mode]').forEach(b => { const on = off ? b.dataset.lkiaMode === 'local' : b.dataset.lkiaMode === m; b.setAttribute('aria-pressed', String(on)); b.disabled = off && b.dataset.lkiaMode === 'ia'; });
    line(box.querySelector('.lkia-st'), st);
  }
  function paint() { controls.forEach(b => { if (b.isConnected) paintOne(b); else controls.delete(b); }); ticking(); }
  let clock = 0;
  function ticking() {
    const need = !!(state.reset || state.plafond) && mode() !== 'local' && state.on !== false && [...controls].some(b => b.isConnected);
    if (need && !clock) clock = setInterval(() => { const st = raw(); if ((state.reset && state.reset <= Date.now()) || (state.plafond && state.plafond <= Date.now())) { merge({}); return; } if (!st.timer) return; controls.forEach(b => { if (!b.isConnected) return; const t = b.querySelector('.lkia-timer'); if (t) t.textContent = countdown(st.timer); }); }, 1000);
    if (!need && clock) { clearInterval(clock); clock = 0; }
  }
  function setMode(m) { acted = true; put(() => { if (m === 'local') localStorage.setItem(KEY_MODE, 'local'); else localStorage.removeItem(KEY_MODE); }); emit(); if (m !== 'local') refresh(false); }
  function credit_line(byAI) { return byAI ? 'Risposta dell’IA.' : 'Risposta locale, senza IA.'; }
  const css = document.createElement('style'); css.id = 'lkia-css';
  css.textContent = '.lkia{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;margin:10px 0 0}.lkia--leo{flex-shrink:0;margin:0;padding:8px 16px 9px;background:#f7f3ec;border-bottom:1px solid #e3dfd7;color:#281949;gap:6px 10px}.lkia--leo .lkia-st{flex-basis:100%;font-size:12px;color:#4a3d63}.lkia--leo .lkia-sw button{min-height:30px}.lkia-sw{display:inline-flex;align-items:center;gap:4px;padding:3px;border:1.5px solid currentColor;border-radius:999px}.lkia-t{font:800 .7rem/1 var(--font-mono,ui-monospace,monospace);letter-spacing:.1em;text-transform:uppercase;padding:0 6px;opacity:.85}.lkia-sw button{min-height:32px;padding:0 12px;border:0;border-radius:999px;background:none;color:inherit;font:700 .84rem/1 "Archivo",sans-serif;cursor:pointer}.lkia-sw button[aria-pressed="true"]{background:var(--amber,#f7b645);color:#1a1a1e}.lkia-sw button:disabled{opacity:.45;cursor:not-allowed}.lkia-st{flex:1 1 220px;margin:0;font-size:.84rem;line-height:1.4}.lkia[data-kind="quota"] .lkia-st,.lkia[data-kind="off"] .lkia-st{font-weight:700}.lkia-timer{display:inline-block;margin:0 2px;padding:1px 7px;border-radius:999px;background:#1a1a1e;color:#f7b645;font:800 .78rem/1.5 var(--font-mono,ui-monospace,monospace);letter-spacing:.06em;font-variant-numeric:tabular-nums;vertical-align:baseline}.lkia[data-kind="quota"] .lkia-timer{background:#b93220;color:#fff9ef}';
  document.head.appendChild(css);
  const api = {
    mode, setMode, device, refresh, learn, control, subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    state() { return Object.assign({ mode: mode(), exhausted: exhausted() }, state); },
    usable() { return mode() === 'ia' && state.on !== false && !exhausted(); },
    body(extra) { acted = true; return Object.assign({}, extra, { appareil: device() }); },
    line: credit_line, status, countdown
  };
  window.LKIA = api;
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') paint(); });
}());
