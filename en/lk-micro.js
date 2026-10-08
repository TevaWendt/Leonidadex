/* Leonidakit — lk-micro.js (v7.71, demande de Téva du 07/10/2026) : parler au lieu d'écrire, dans la barre « Que veux-tu
   calculer ? » du calculateur et dans Léo.
   - La reconnaissance vocale est celle du navigateur (API SpeechRecognition). Elle n'est ni faite ni relayée par le site :
     selon le navigateur, l'audio part chez son éditeur pour être transcrit (Chrome et Edge → Google ou Microsoft, Safari →
     Apple) ; la page ne reçoit que le texte, qu'elle met dans la case comme si le visiteur l'avait tapé. Le site ne garde
     aucun son ni aucune transcription. Le micro ne s'allume qu'au clic du visiteur et s'éteint seul à la fin de la phrase.
   - Le bouton n'apparaît que si le navigateur sait le faire (Firefox, par exemple, ne le propose pas) et jamais sans
     connexion sûre (https ou localhost, exigés par les navigateurs).
   - Langue de la reconnaissance : celle de la page (fr, en, es, it, de). */
(function () {
  'use strict';
  if (window.LKMicro) return;
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const ok = !!SR && (location.protocol === 'https:' || /^(localhost|127\.0\.0\.1)$/.test(location.hostname));
  const lang = (document.documentElement.lang || 'fr').slice(0, 2), LOCALE = { fr: 'en-US', en: 'en-GB', es: 'es-ES', it: 'it-IT', de: 'de-DE' };
  const T = { start: 'Speak instead of typing', stop: 'Stop the microphone', listening: 'I’m listening… speak, then pause.', denied: 'The microphone is blocked by the browser: allow it to speak, or type your question.', none: 'I didn’t hear anything: try again, or type your question.', fail: 'The microphone could not start: type your question.' };
  let current = null; /* une seule écoute à la fois */
  const ICON = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path fill="currentColor" d="M12 15a4 4 0 0 0 4-4V6a4 4 0 0 0-8 0v5a4 4 0 0 0 4 4Zm6-4h-1.5a4.5 4.5 0 0 1-9 0H6a6 6 0 0 0 5.25 5.95V19H8.5v2h7v-2h-2.75v-2.05A6 6 0 0 0 18 11Z"/></svg>';

  function attach(input, opts) {
    if (!ok || !input || input.dataset.lkMicro) return null;
    const o = opts || {};
    input.dataset.lkMicro = '1';
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'lk-mic' + (o.className ? ' ' + o.className : ''); btn.setAttribute('aria-label', T.start); btn.title = T.start; btn.setAttribute('aria-pressed', 'false');
    btn.innerHTML = ICON;
    const live = document.createElement('span'); live.className = 'lk-mic-live'; live.setAttribute('role', 'status'); live.setAttribute('aria-live', 'polite');
    (o.after || input).insertAdjacentElement('afterend', btn); (o.liveHost || input.parentElement || btn).insertAdjacentElement('afterend', live);
    let rec = null, base = '', final = '';
    const say = t => { live.textContent = t || ''; live.hidden = !t; };
    const stop = () => { if (rec) { try { rec.stop(); } catch (e) { /* déjà arrêté */ } } };
    const done = () => { rec = null; current = null; btn.setAttribute('aria-pressed', 'false'); btn.classList.remove('is-on'); btn.setAttribute('aria-label', T.start); btn.title = T.start; input.classList.remove('is-listening'); };
    const commit = (text, isFinal) => {
      const v = (base ? base.replace(/\s+$/, '') + ' ' : '') + text.trim();
      input.value = v.slice(0, Number(input.maxLength) > 0 ? Number(input.maxLength) : 4000);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      if (isFinal) { final = v; say(''); if (o.submit !== false) { const f = input.form; if (f) { if (typeof f.requestSubmit === 'function') f.requestSubmit(); else f.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); } } }
    };
    btn.addEventListener('click', () => {
      if (rec) { stop(); return; }
      if (current) { try { current.stop(); } catch (e) { /* rien */ } }
      try { rec = new SR(); } catch (e) { say(T.fail); return; }
      current = rec; base = input.value || ''; final = '';
      rec.lang = LOCALE[lang] || 'en-US'; rec.interimResults = true; rec.continuous = false; rec.maxAlternatives = 1;
      btn.setAttribute('aria-pressed', 'true'); btn.classList.add('is-on'); btn.setAttribute('aria-label', T.stop); btn.title = T.stop; input.classList.add('is-listening'); say(T.listening);
      rec.onresult = e => { let interim = '', fin = ''; for (let i = e.resultIndex; i < e.results.length; i++) { const r = e.results[i]; if (r.isFinal) fin += r[0].transcript; else interim += r[0].transcript; } if (fin) commit(fin, true); else if (interim) commit(interim, false); };
      rec.onerror = e => { const k = e && e.error; say(k === 'not-allowed' || k === 'service-not-allowed' ? T.denied : k === 'no-speech' ? T.none : k === 'aborted' ? '' : T.fail); done(); };
      rec.onend = () => { if (!final && input.value === base) say(live.textContent === T.listening ? T.none : live.textContent); done(); input.focus({ preventScroll: true }); };
      try { rec.start(); } catch (e) { say(T.fail); done(); }
    });
    return btn;
  }

  /* feuille de style du bouton (injectée : il vit dans la barre du calculateur et dans Léo) */
  if (ok) {
    const css = document.createElement('style'); css.id = 'lk-micro-css';
    css.textContent = '.lk-mic{flex:none;display:inline-grid;place-items:center;width:46px;min-height:46px;padding:0;border:2px solid var(--ink,#1a1a1e);border-radius:10px;background:#fff;color:var(--ink,#1a1a1e);cursor:pointer;transition:background .2s,color .2s,transform .2s}.lk-mic:hover{background:var(--amber,#f7b645)}.lk-mic:active{transform:scale(.95)}.lk-mic.is-on{background:#b93220;border-color:#b93220;color:#fff9ef;animation:lk-mic-pulse 1.1s ease-in-out infinite}.lk-mic:focus-visible{outline:3px solid var(--amber,#f7b645);outline-offset:3px}.lk-mic-live{flex-basis:100%;margin:0;font-size:.82rem;line-height:1.4;color:#5c5a63}.lk-mic-live:empty,.lk-mic-live[hidden]{display:none}.leo-compose .lk-mic{width:40px;min-height:40px;border-radius:50%;border-width:1.5px}.leo-compose .lk-mic-live{order:9;font-size:12px}.lk-ask-row .lk-mic{min-height:56px;width:56px;box-shadow:3px 3px 0 var(--ink,#1a1a1e)}input.is-listening{box-shadow:0 0 0 3px rgba(185,50,32,.25)}@keyframes lk-mic-pulse{0%,100%{box-shadow:0 0 0 0 rgba(185,50,32,.45)}50%{box-shadow:0 0 0 8px rgba(185,50,32,0)}}@media(prefers-reduced-motion:reduce){.lk-mic.is-on{animation:none}}@media(max-width:600px){.lk-ask-row:has(.lk-mic){flex-direction:row;flex-wrap:wrap}.lk-ask-row:has(.lk-mic) input{flex:1 1 0;min-width:0}.lk-ask-row .lk-mic{width:56px;flex:none}.lk-ask-row:has(.lk-mic) button[type="submit"]{flex:1 1 100%}}';
    document.head.appendChild(css);
  }
  window.LKMicro = { supported: ok, attach };
  /* barre du calculateur : le bouton s'ajoute après la case ; Léo l'ajoute lui-même quand son panneau existe (leo-ui.js) */
  const auto = () => { const i = document.getElementById('calc-ask-input'); if (i) attach(i, { submit: true }); const q = document.getElementById('leo-question'); if (q) attach(q, { submit: true }); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', auto); else auto();
}());
