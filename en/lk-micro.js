/* Leonidakit — lk-micro.js (v7.71, demande de Téva du 07/10/2026) : parler au lieu d'écrire, dans la barre « Que veux-tu
   calculer ? » du calculateur et dans Léo.
   - La reconnaissance vocale est celle du navigateur (API SpeechRecognition). Elle n'est ni faite ni relayée par le site :
     selon le navigateur, l'audio part chez son éditeur pour être transcrit (Chrome et Edge → Google ou Microsoft, Safari →
     Apple) ; la page ne reçoit que le texte, qu'elle met dans la case comme si le visiteur l'avait tapé. Le site ne garde
     aucun son ni aucune transcription. Le micro ne s'allume qu'au clic du visiteur et s'éteint seul à la fin de la phrase.
   - Le bouton n'apparaît que si le navigateur sait le faire (Firefox, par exemple, ne le propose pas) et jamais sans
     connexion sûre (https ou localhost, exigés par les navigateurs).
   - Langue de la reconnaissance : celle de la page (fr, en, es, it, de).
   v7.74 (Téva : « le micro ne marche pas, on me demande l'autorisation mais je ne sais pas comment l'activer ») :
   - la vraie cause était l'en-tête Permissions-Policy du site (vercel.json : microphone=()), qui interdisait le micro à toutes
     les pages : il vaut maintenant microphone=(self) (le site seul, jamais un cadre intégré) ;
   - l'autorisation se demande depuis le site : au premier clic, une phrase prévient que le navigateur va demander l'accès
     (« Autoriser ») ; si l'accès est refusé ou bloqué, un encadré « Autoriser le micro » donne les étapes du navigateur
     utilisé (Chrome, Edge, Safari sur Mac, iPhone ou iPad, Android), les réglages de l'ordinateur, et un bouton
     « Réessayer ». L'état de l'autorisation est lu sur l'appareil (navigator.permissions) : rien ne part vers le site ;
   - messages propres aux autres pannes : aucun micro trouvé, service de transcription injoignable (hors connexion, ou
     navigateur qui le bloque), Dictée coupée sur un appareil Apple. */
(function () {
  'use strict';
  if (window.LKMicro) return;
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const ok = !!SR && (location.protocol === 'https:' || /^(localhost|127\.0\.0\.1)$/.test(location.hostname));
  const lang = (document.documentElement.lang || 'fr').slice(0, 2), LOCALE = { fr: 'en-US', en: 'en-GB', es: 'es-ES', it: 'it-IT', de: 'de-DE' };
  const T = {
    start: 'Speak instead of typing', stop: 'Stop the microphone', listening: 'I’m listening… speak, then pause.',
    asking: 'Your browser will ask you for access to the microphone: choose “Allow”.',
    none: 'I didn’t hear anything: try again, or type your question.', fail: 'The microphone could not start: type your question.',
    nomic: 'No microphone found: plug one in, or check that it’s switched on, then try again.',
    network: 'Your browser’s transcription isn’t responding (no connection, or a browser that blocks it, like Brave): try Chrome, Edge or Safari, or type your question.',
    langue: 'Your browser can’t transcribe this language: type your question.',
    granted: 'Microphone allowed: press the microphone to speak.',
    title: 'Allow the microphone for this site', lead: 'Your browser doesn’t let the site use the microphone yet. To allow it:',
    retry: 'Try again', close: 'Close',
    pc: 'Still blocked? Your computer must also let your browser use the microphone. Windows: Settings › Privacy & security › Microphone. Mac: System Settings › Privacy & Security › Microphone.',
    phone: 'Still blocked? Phone settings › Apps › your browser › Permissions › Microphone: “Allow”.',
    apple: 'On iPhone, iPad and Mac, Safari transcribes with Dictation: check that it’s turned on (Settings › General › Keyboard › Dictation; on Mac: System Settings › Keyboard › Dictation).',
    privacy: 'The site keeps neither your voice nor the text: only your question lands in the box.'
  };
  const RELOAD = 'Reload the page, then press the microphone again.';
  const STEPS = {
    chrome: ['Click the icon to the left of the site’s address (two small sliders or a padlock).', 'On the “Microphone” line, choose “Allow”.', RELOAD],
    edge: ['Click the padlock to the left of the site’s address, then “Permissions for this site”.', 'On the “Microphone” line, choose “Allow”.', RELOAD],
    safari: ['In the menu bar, open “Safari”, then “Settings for This Website…”.', 'On the “Microphone” line, choose “Allow”.', RELOAD],
    ios: ['Tap “aA” (or the icon to the left of the address), then “Website Settings”.', 'On the “Microphone” line, choose “Allow”.', 'If it’s still blocked: Settings app › Safari › Microphone › “Allow”. Then reload the page.'],
    android: ['Tap the icon to the left of the site’s address, then “Permissions”.', 'Turn on “Microphone”.', RELOAD],
    other: ['Open this site’s settings in your browser (the icon to the left of the address).', 'Allow the microphone for this site.', RELOAD]
  };
  /* le navigateur, lu sur l'appareil pour choisir les bonnes étapes (rien n'est envoyé) */
  const ua = navigator.userAgent || '';
  const KIND = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) ? 'ios' : /Android/.test(ua) ? 'android' : /Edg\//.test(ua) ? 'edge' : /Chrome\/|Chromium\//.test(ua) ? 'chrome' : /Safari\//.test(ua) ? 'safari' : 'other';
  const APPLE = KIND === 'ios' || KIND === 'safari';
  let current = null; /* une seule écoute à la fois */
  /* état de l'autorisation (« granted », « prompt », « denied » ; « unknown » si le navigateur ne le dit pas) */
  let micState = 'unknown';
  const watchers = new Set();
  if (ok && navigator.permissions && typeof navigator.permissions.query === 'function') {
    try {
      navigator.permissions.query({ name: 'microphone' }).then(function (st) {
        micState = st.state;
        st.onchange = function () { micState = st.state; watchers.forEach(function (f) { f(micState); }); };
      }).catch(function () { /* nom de permission inconnu : on essaiera au clic */ });
    } catch (e) { /* idem */ }
  }
  const ICON = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path fill="currentColor" d="M12 15a4 4 0 0 0 4-4V6a4 4 0 0 0-8 0v5a4 4 0 0 0 4 4Zm6-4h-1.5a4.5 4.5 0 0 1-9 0H6a6 6 0 0 0 5.25 5.95V19H8.5v2h7v-2h-2.75v-2.05A6 6 0 0 0 18 11Z"/></svg>';
  const ICON_OFF = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path fill="currentColor" d="M12 15a4 4 0 0 0 4-4V6a4 4 0 0 0-8 0v5a4 4 0 0 0 4 4Zm6-4h-1.5a4.5 4.5 0 0 1-9 0H6a6 6 0 0 0 5.25 5.95V19H8.5v2h7v-2h-2.75v-2.05A6 6 0 0 0 18 11Z"/><path d="M4 3.5 20.5 20" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';

  function attach(input, opts) {
    if (!ok || !input || input.dataset.lkMicro) return null;
    const o = opts || {};
    input.dataset.lkMicro = '1';
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'lk-mic' + (o.className ? ' ' + o.className : ''); btn.setAttribute('aria-label', T.start); btn.title = T.start; btn.setAttribute('aria-pressed', 'false');
    btn.innerHTML = ICON;
    const live = document.createElement('span'); live.className = 'lk-mic-live'; live.setAttribute('role', 'status'); live.setAttribute('aria-live', 'polite');
    (o.after || input).insertAdjacentElement('afterend', btn); (o.liveHost || input.parentElement || btn).insertAdjacentElement('afterend', live);
    let rec = null, base = '', final = '', help = null;
    const say = t => { live.textContent = t || ''; live.hidden = !t; };
    const stop = () => { if (rec) { try { rec.stop(); } catch (e) { /* déjà arrêté */ } } };
    const done = () => { rec = null; current = null; btn.setAttribute('aria-pressed', 'false'); btn.classList.remove('is-on'); btn.setAttribute('aria-label', T.start); btn.title = T.start; input.classList.remove('is-listening'); };
    const commit = (text, isFinal) => {
      const v = (base ? base.replace(/\s+$/, '') + ' ' : '') + text.trim();
      input.value = v.slice(0, Number(input.maxLength) > 0 ? Number(input.maxLength) : 4000);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      if (isFinal) { final = v; say(''); if (o.submit !== false) { const f = input.form; if (f) { if (typeof f.requestSubmit === 'function') f.requestSubmit(); else f.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); } } }
    };
    /* l'encadré « Autoriser le micro » : les étapes du navigateur utilisé, les réglages de l'appareil, « Réessayer » */
    const hideHelp = () => { if (help) help.hidden = true; btn.classList.remove('is-blocked'); };
    const showHelp = (extra) => {
      say('');
      if (!help) {
        help = document.createElement('div'); help.className = 'lk-mic-help'; help.setAttribute('role', 'group');
        const t = document.createElement('p'); t.className = 'lk-mic-help-t'; t.innerHTML = ICON_OFF; const ts = document.createElement('strong'); ts.textContent = T.title; t.appendChild(ts);
        help.setAttribute('aria-label', T.title);
        const lead = document.createElement('p'); lead.textContent = T.lead;
        const ol = document.createElement('ol'); (STEPS[KIND] || STEPS.other).forEach(function (s) { const li = document.createElement('li'); li.textContent = s; ol.appendChild(li); });
        const more = document.createElement('p'); more.className = 'lk-mic-help-more';
        const priv = document.createElement('p'); priv.className = 'lk-mic-help-more'; priv.textContent = T.privacy;
        const row = document.createElement('div'); row.className = 'lk-mic-help-actions';
        const again = document.createElement('button'); again.type = 'button'; again.className = 'is-main'; again.textContent = T.retry; again.addEventListener('click', function () { hideHelp(); listen(); });
        const close = document.createElement('button'); close.type = 'button'; close.textContent = T.close; close.addEventListener('click', function () { hideHelp(); btn.focus({ preventScroll: true }); });
        row.append(again, close); help.append(t, lead, ol, row, more, priv); /* les boutons juste après les étapes : visibles sans faire défiler, même dans Léo */
        live.insertAdjacentElement('afterend', help);
      }
      help.querySelector('.lk-mic-help-more').textContent = extra || (KIND === 'android' ? T.phone : KIND === 'ios' ? T.apple : T.pc);
      help.hidden = false; btn.classList.add('is-blocked');
    };
    watchers.add(function (st) { if (st === 'granted' && help && !help.hidden) { hideHelp(); say(T.granted); } });
    function listen() {
      if (current) { try { current.stop(); } catch (e) { /* rien */ } }
      try { rec = new SR(); } catch (e) { say(T.fail); return; }
      current = rec; base = input.value || ''; final = '';
      rec.lang = LOCALE[lang] || 'en-US'; rec.interimResults = true; rec.continuous = false; rec.maxAlternatives = 1;
      const asking = micState === 'prompt';
      btn.setAttribute('aria-pressed', 'true'); btn.classList.add('is-on'); btn.setAttribute('aria-label', T.stop); btn.title = T.stop; input.classList.add('is-listening'); say(asking ? T.asking : T.listening);
      /* le son arrive : l'accès est donné (la phrase « va te demander » devient « je t'écoute ») */
      rec.onaudiostart = () => { hideHelp(); say(T.listening); };
      rec.onresult = e => { let interim = '', fin = ''; for (let i = e.resultIndex; i < e.results.length; i++) { const r = e.results[i]; if (r.isFinal) fin += r[0].transcript; else interim += r[0].transcript; } if (fin) commit(fin, true); else if (interim) commit(interim, false); };
      rec.onerror = e => {
        const k = e && e.error;
        if (k === 'not-allowed') { done(); showHelp(); return; }
        if (k === 'service-not-allowed') { done(); showHelp(APPLE ? T.apple : null); return; }
        say(k === 'no-speech' ? T.none : k === 'audio-capture' ? T.nomic : k === 'network' ? T.network : k === 'language-not-supported' ? T.langue : k === 'aborted' ? '' : T.fail); done();
      };
      rec.onend = () => { if (!final && input.value === base && (live.textContent === T.listening || live.textContent === T.asking)) say(T.none); done(); if (!help || help.hidden) input.focus({ preventScroll: true }); };
      try { rec.start(); } catch (e) { say(T.fail); done(); }
    }
    btn.addEventListener('click', () => {
      if (rec) { stop(); return; }
      /* déjà bloqué sur cet appareil : le navigateur ne redemandera pas, les étapes s'affichent tout de suite */
      if (micState === 'denied') { showHelp(); return; }
      hideHelp(); listen();
    });
    return btn;
  }

  /* feuille de style du bouton et de l'encadré (injectée : ils vivent dans la barre du calculateur et dans Léo) */
  if (ok) {
    const css = document.createElement('style'); css.id = 'lk-micro-css';
    css.textContent = '.lk-mic{flex:none;display:inline-grid;place-items:center;width:46px;min-height:46px;padding:0;border:2px solid var(--ink,#1a1a1e);border-radius:10px;background:#fff;color:var(--ink,#1a1a1e);cursor:pointer;transition:background .2s,color .2s,transform .2s}.lk-mic:hover{background:var(--amber,#f7b645)}.lk-mic:active{transform:scale(.95)}.lk-mic.is-on{background:#b93220;border-color:#b93220;color:#fff9ef;animation:lk-mic-pulse 1.1s ease-in-out infinite}.lk-mic:focus-visible{outline:3px solid var(--amber,#f7b645);outline-offset:3px}.lk-mic-live{flex-basis:100%;margin:0;font-size:.82rem;line-height:1.4;color:#5c5a63}.lk-mic-live:empty,.lk-mic-live[hidden]{display:none}.leo-compose .lk-mic{width:40px;min-height:40px;border-radius:50%;border-width:1.5px}.leo-compose .lk-mic-live{order:9;font-size:12px}.lk-ask-row .lk-mic{min-height:56px;width:56px;box-shadow:3px 3px 0 var(--ink,#1a1a1e)}input.is-listening{box-shadow:0 0 0 3px rgba(185,50,32,.25)}@keyframes lk-mic-pulse{0%,100%{box-shadow:0 0 0 0 rgba(185,50,32,.45)}50%{box-shadow:0 0 0 8px rgba(185,50,32,0)}}@media(prefers-reduced-motion:reduce){.lk-mic.is-on{animation:none}}@media(max-width:600px){.lk-ask-row:has(.lk-mic){flex-direction:row;flex-wrap:wrap}.lk-ask-row:has(.lk-mic) input{flex:1 1 0;min-width:0}.lk-ask-row .lk-mic{width:56px;flex:none}.lk-ask-row:has(.lk-mic) button[type="submit"]{flex:1 1 100%}}'
      + '.lk-mic.is-blocked{border-color:#b93220;color:#b93220}.lk-mic-help{flex-basis:100%;box-sizing:border-box;max-width:640px;margin:12px 0 0;padding:14px 16px 14px;border:2px solid var(--ink,#1a1a1e);border-radius:12px;background:#fff8ec;color:var(--ink,#1a1a1e);font-size:.9rem;line-height:1.45;text-align:left;box-shadow:4px 4px 0 var(--ink,#1a1a1e)}.lk-mic-help[hidden]{display:none}.lk-mic-help p{margin:0 0 6px}.lk-mic-help-t{display:flex;align-items:center;gap:8px;font-size:1rem}.lk-mic-help-t svg{flex:none;color:#b93220}.lk-mic-help ol{margin:6px 0 10px;padding-left:22px}.lk-mic-help li{margin:4px 0;padding-left:2px}.lk-mic-help li::marker{font-weight:800;color:#b93220}.lk-mic-help-more{font-size:.82rem;color:#5c5a63}.lk-mic-help-actions{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0 12px}.lk-mic-help-actions button{min-height:42px;padding:6px 16px;border:2px solid var(--ink,#1a1a1e);border-radius:10px;background:#fff;color:var(--ink,#1a1a1e);font:inherit;font-weight:750;cursor:pointer}.lk-mic-help-actions button.is-main{background:var(--ink,#1a1a1e);color:#fff}.lk-mic-help-actions button:hover{background:var(--amber,#f7b645);color:var(--ink,#1a1a1e)}.lk-mic-help-actions button:focus-visible{outline:3px solid var(--amber,#f7b645);outline-offset:2px}.leo-panel .lk-mic-help{flex:0 1 auto;min-height:120px;margin:6px 14px 12px;max-height:42vh;overflow:auto;overscroll-behavior:contain;padding:10px 12px;font-size:12.5px;box-shadow:none;border-width:1.5px}.leo-panel .lk-mic-help-t{font-size:13px}.leo-panel .lk-mic-help-actions button{min-height:36px;padding:4px 12px}';
    document.head.appendChild(css);
  }
  window.LKMicro = { supported: ok, attach };
  /* barre du calculateur : le bouton s'ajoute après la case ; Léo l'ajoute lui-même quand son panneau existe (leo-ui.js) */
  const auto = () => { const i = document.getElementById('calc-ask-input'); if (i) attach(i, { submit: true }); const q = document.getElementById('leo-question'); if (q) attach(q, { submit: true }); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', auto); else auto();
}());
