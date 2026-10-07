/* Leonidakit — lk-ia.js (v7.69) : accès à l'IA de Léo et de la barre du calculateur, côté page.
   - Le visiteur choisit qui répond : « IA » ou « Local » (lk_ia_mode, sur cet appareil). Il voit toujours lequel
     répond : un bandeau sous la barre et dans Léo, et une mention sous chaque réponse.
   - 30 questions IA gratuites par visiteur et par 9 heures (réglage du serveur) ; ensuite, mode local jusqu'au
     renouvellement, ou crédit payant si la vente est ouverte (api/ia-achat.js : paiement chez Stripe).
   - Identifiant aléatoire de l'appareil (lk_ia_appareil) envoyé avec chaque question pour compter les questions
     gratuites ; code de crédit (lk_ia_jeton) si le visiteur a acheté du crédit ; état mis en cache le temps de l'onglet
     (lk_ia_etat, sessionStorage). Aucun cookie. */
(function () {
  'use strict';
  if (window.LKIA) return;
  const KEY_MODE = 'lk_ia_mode', KEY_DEV = 'lk_ia_appareil', KEY_JETON = 'lk_ia_jeton', KEY_ETAT = 'lk_ia_etat';
  const K = { mode: KEY_MODE, dev: KEY_DEV, jeton: KEY_JETON, etat: KEY_ETAT };
  const put = fn => { try { fn(); } catch (e) { /* stockage bloqué (navigation privée stricte) */ } };
  const TOKEN = /^LK(?:-[A-Z2-7]{4}){4}$/, DEVICE = /^[A-Za-z0-9_-]{16,64}$/, MIN_CREDIT = 30000;
  const lang = (document.documentElement.lang || 'fr').slice(0, 2), locale = { fr: 'it-IT', en: 'en-GB', es: 'es-ES', it: 'it-IT', de: 'de-DE' }[lang] || 'it-IT';
  const local = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } } };
  const session = { get(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } } };
  const money = (n, d) => new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR', minimumFractionDigits: d || 2, maximumFractionDigits: d || 2 }).format((Number(n) || 0) / 1e6);
  const clock = t => new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(new Date(t));
  const nf = n => new Intl.NumberFormat(locale).format(n);

  function device() {
    let d = local.get(K.dev);
    if (!DEVICE.test(d || '')) { const b = new Uint8Array(16); (window.crypto || {}).getRandomValues ? crypto.getRandomValues(b) : b.forEach((_, i) => { b[i] = Math.random() * 256; }); d = Array.from(b, x => 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'[x & 63]).join(''); const v = d; put(() => localStorage.setItem(KEY_DEV, v)); }
    return d;
  }
  /* identifiant déjà créé (lecture seule : rien n'est écrit sans action du visiteur) */
  const existing = () => { const d = local.get(K.dev); return DEVICE.test(d || '') ? d : ''; };
  let acted = false; /* le cache de l'état n'est écrit qu'après une action (question, choix du mode, code) */
  const token = () => { const t = local.get(K.jeton); return TOKEN.test(t || '') ? t : ''; };
  const mode = () => local.get(K.mode) === 'local' ? 'local' : 'ia';

  /* état connu : on (IA disponible), gratuit, heures, restant, reset, achat, solde, modele */
  let state = (() => { try { const s = JSON.parse(session.get(K.etat) || 'null'); return s && Date.now() - (s.at || 0) < 5 * 60000 ? s : {}; } catch (e) { return {}; } })();
  const listeners = new Set();
  function emit() { state.at = Date.now(); if (acted) { const v = JSON.stringify(state); put(() => sessionStorage.setItem(KEY_ETAT, v)); } listeners.forEach(fn => { try { fn(api.state()); } catch (e) { /* rien */ } }); paint(); }
  function merge(x) { Object.keys(x || {}).forEach(k => { if (x[k] !== undefined) state[k] = x[k]; }); if (state.reset && state.reset < Date.now()) { state.restant = state.gratuit; state.reset = null; } emit(); }
  const credit = () => typeof state.solde === 'number' && state.solde >= MIN_CREDIT;
  const exhausted = () => state.restant === 0 && !credit();

  async function post(url, body) {
    const ctl = typeof AbortController === 'function' ? new AbortController() : null, timer = setTimeout(() => { if (ctl) ctl.abort(); }, 15000);
    try { const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctl ? ctl.signal : undefined }); let j = null; try { j = await r.json(); } catch (e) { j = null; } return { status: r.status, j }; }
    catch (e) { return { status: 0, j: null }; } finally { clearTimeout(timer); }
  }
  let refreshing = null;
  function refresh(force) {
    /* mode local : rien ne part, pas même la lecture des compteurs (elle reprend quand le visiteur choisit « IA ») */
    if (mode() === 'local' && !force) return Promise.resolve(api.state());
    if (refreshing) return refreshing;
    if (!force && state.at && Date.now() - state.at < 60000 && state.on !== undefined) return Promise.resolve(api.state());
    refreshing = post('/api/ia', { mode: 'etat', appareil: existing() || undefined, jeton: token() || undefined }).then(({ status, j }) => {
      refreshing = null;
      if (status === 503 || status === 404 || status === 405) { merge({ on: false }); return api.state(); }
      if (j && j.ok) merge({ on: true, gratuit: j.gratuit, heures: j.heures, restant: j.restant, reset: j.reset, achat: !!j.achat, solde: j.solde, modele: j.modele, marge: j.marge });
      return api.state();
    });
    return refreshing;
  }
  /* réponse d'une question : mise à jour du compteur ou du crédit */
  function learn(status, j) {
    if (status === 503 || status === 404 || status === 405) return merge({ on: false });
    if (status === 402 && j) return merge({ on: true, gratuit: j.gratuit, heures: j.heures, restant: 0, reset: j.reset, achat: !!j.achat, solde: j.solde });
    if (j && j.acces) { if (j.acces.type === 'credit') merge({ on: true, solde: j.acces.solde, restant: 0 }); else merge({ on: true, gratuit: j.acces.gratuit, heures: j.acces.heures, restant: j.acces.restant, reset: j.acces.reset }); }
  }

  /* ---------- textes ---------- */
  function status() {
    if (state.on === false) return { kind: 'off', text: 'IA non disponibile al momento: risposte locali del sito.' };
    if (mode() === 'local') return { kind: 'local', text: 'Modalità locale: risposte del sito, senza IA. Le tue domande gratuite all’IA restano da parte.' };
    if (typeof state.restant === 'number' && state.restant > 0) return { kind: 'ia', text: 'IA: ' + nf(state.restant) + ' ' + (state.restant > 1 ? 'domande gratuite' : 'domanda gratuita') + ' su ' + nf(state.gratuit || 30) + (state.reset ? ' (di nuovo ' + nf(state.gratuit || 30) + ' alle ' + clock(state.reset) + ')' : ' ogni ' + nf(state.heures || 9) + ' h') + '.' };
    if (credit()) return { kind: 'ia', text: 'IA: credito ' + money(state.solde) + '. Ogni domanda costa il suo prezzo reale più il ' + nf(state.marge || 20) + '%.' };
    if (state.restant === 0) return { kind: 'quota', text: 'Domande gratuite all’IA esaurite: modalità locale' + (state.reset ? ' fino alle ' + clock(state.reset) : '') + '.' };
    return { kind: 'ia', text: 'IA: ' + nf(state.gratuit || 30) + ' domande gratuite ogni ' + nf(state.heures || 9) + ' h.' };
  }

  /* ---------- commande « Qui répond ? » (barre du calculateur, Léo) ---------- */
  const controls = new Set();
  function control(where) {
    const box = document.createElement('div'); box.className = 'lkia lkia--' + where;
    box.innerHTML = '<div class="lkia-sw" role="group" aria-label="Chi risponde?"><span class="lkia-t">Chi risponde?</span><button type="button" data-lkia-mode="ia">IA</button><button type="button" data-lkia-mode="local">Locale</button></div><p class="lkia-st" role="status" aria-live="polite"></p><button type="button" class="lkia-more" data-lkia-shop hidden>Altre domande</button>';
    box.addEventListener('click', e => {
      const m = e.target.closest('[data-lkia-mode]'); if (m) { setMode(m.dataset.lkiaMode); return; }
      if (e.target.closest('[data-lkia-shop]')) shop();
    });
    controls.add(box); paintOne(box);
    /* l'état réel (questions restantes) n'est lu qu'en mode IA : à l'ouverture de Léo, ou quand le visiteur entre dans
       la barre du calculateur (clic, clavier) ; jamais au simple survol, jamais en mode local */
    const wake = () => refresh(false);
    if (where === 'leo') wake(); else box.addEventListener('focusin', wake, { once: true, passive: true });
    return box;
  }
  function paintOne(box) {
    const st = status(), m = mode(), off = state.on === false;
    box.dataset.kind = st.kind;
    box.querySelectorAll('[data-lkia-mode]').forEach(b => { const on = off ? b.dataset.lkiaMode === 'local' : b.dataset.lkiaMode === m; b.setAttribute('aria-pressed', String(on)); b.disabled = off && b.dataset.lkiaMode === 'ia'; });
    const p = box.querySelector('.lkia-st'); if (p.textContent !== st.text) p.textContent = st.text;
    const more = box.querySelector('[data-lkia-shop]'); more.hidden = !(state.achat && m === 'ia' && !off && (exhausted() || credit() || token()));
  }
  function paint() { controls.forEach(b => { if (b.isConnected) paintOne(b); else controls.delete(b); }); }
  function setMode(m) { acted = true; put(() => { if (m === 'local') localStorage.setItem(KEY_MODE, 'local'); else localStorage.removeItem(KEY_MODE); }); emit(); if (m !== 'local') refresh(false); }

  /* mention sous une réponse : qui l'a écrite */
  function credit_line(byAI) { return byAI ? 'Risposta dell’IA.' : 'Risposta locale, senza IA.'; }

  /* ---------- crédit payant (si la vente est ouverte) ---------- */
  let dlg = null;
  const PER_Q = { sonnet: 11000, haiku: 5500, opus: 22000, fable: 55000 };
  function perQuestion() { const m = String(state.modele || ''); for (const k of Object.keys(PER_Q)) if (m.indexOf(k) !== -1) return PER_Q[k]; return PER_Q.sonnet; }
  function estimate(eur) { const credit = Math.max(0, (eur - (0.25 + eur * 0.015)) * 1e6); return Math.floor(credit / perQuestion()); }
  function shop() {
    if (!dlg) {
      dlg = document.createElement('dialog'); dlg.className = 'lkia-dlg'; dlg.setAttribute('aria-labelledby', 'lkia-dlg-t');
      dlg.innerHTML = '<div class="lkia-dlg-in"><button type="button" class="lkia-x" data-lkia-close aria-label="Chiudi"><span aria-hidden="true">×</span></button>'
        + '<p class="lkia-k">IA</p><h2 id="lkia-dlg-t">Altre domande all’IA</h2>'
        + '<p class="lkia-p" data-lkia-intro></p>'
        + '<p class="lkia-solde" data-lkia-solde></p>'
        + '<div class="lkia-packs" data-lkia-packs role="group" aria-label="Importo"></div>'
        + '<label class="lkia-renonce"><input type="checkbox" data-lkia-renonce> <span>Voglio usare subito questo credito e rinuncio al mio diritto di recesso per questo credito (articolo L221-28 del Codice del consumo francese). <a href="/conditions-de-vente.html" target="_blank" rel="noopener">Condizioni di vendita</a></span></label>'
        + '<button type="button" class="lkia-pay" data-lkia-pay disabled>Paga con Stripe</button>'
        + '<p class="lkia-msg" data-lkia-msg role="status" aria-live="polite"></p>'
        + '<div class="lkia-code" data-lkia-code hidden><p>Il tuo codice di credito: <b data-lkia-code-v></b> <button type="button" class="lkia-copy" data-lkia-copy>Copia</button></p><p class="lkia-small">Annotalo: dà accesso al tuo credito su un altro dispositivo o dopo aver svuotato il browser.</p></div>'
        + '<details class="lkia-have"><summary>Ho già un codice</summary><div class="lkia-have-in"><input type="text" data-lkia-have placeholder="LK-XXXX-XXXX-XXXX-XXXX" maxlength="22" autocomplete="off" spellcheck="false" aria-label="Il tuo codice di credito"><button type="button" data-lkia-use>Usa questo codice</button></div></details>'
        + '</div>';
      document.body.appendChild(dlg);
      let chosen = 0;
      dlg.addEventListener('click', e => {
        if (e.target === dlg || e.target.closest('[data-lkia-close]')) { dlg.close(); return; }
        const p = e.target.closest('[data-lkia-pack]'); if (p) { chosen = Number(p.dataset.lkiaPack); dlg.querySelectorAll('[data-lkia-pack]').forEach(b => b.setAttribute('aria-pressed', String(b === p))); sync(); return; }
        if (e.target.closest('[data-lkia-copy]')) { const v = token(); if (navigator.clipboard && v) navigator.clipboard.writeText(v).then(() => say('Codice copiato.'), () => say(v)); return; }
        if (e.target.closest('[data-lkia-use]')) { const v = String(dlg.querySelector('[data-lkia-have]').value || '').trim().toUpperCase(); if (!TOKEN.test(v)) { say('Questo codice non ha il formato giusto: LK- seguito da quattro gruppi di quattro caratteri.'); return; } put(() => localStorage.setItem(KEY_JETON, v)); verify().then(() => fill()); return; }
        if (e.target.closest('[data-lkia-pay]')) pay(chosen);
      });
      dlg.querySelector('[data-lkia-renonce]').addEventListener('change', sync);
      function sync() { dlg.querySelector('[data-lkia-pay]').disabled = !(chosen && dlg.querySelector('[data-lkia-renonce]').checked); }
    }
    fill(); verify().then(fill);
    try { dlg.showModal(); } catch (e) { dlg.setAttribute('open', ''); }
  }
  function say(t) { if (dlg) dlg.querySelector('[data-lkia-msg]').textContent = t; }
  function fill() {
    if (!dlg) return;
    const packs = state.packs || [3, 5, 10];
    dlg.querySelector('[data-lkia-intro]').textContent = 'Le tue ' + nf(state.gratuit || 30) + ' domande gratuite tornano ogni ' + nf(state.heures || 9) + ' ore. Per continuare subito, aggiungi credito: ogni domanda costa il suo prezzo reale presso il fornitore dell’IA più il ' + nf(state.marge || 20) + '% per il sito, circa ' + money(perQuestion(), 3) + '. Le commissioni di pagamento (0,25 € + 1,5 %) vengono tolte dal credito.';
    dlg.querySelector('[data-lkia-solde]').textContent = typeof state.solde === 'number' ? 'Il tuo credito: ' + money(Math.max(0, state.solde)) + '.' : '';
    const wrap = dlg.querySelector('[data-lkia-packs]');
    if (!wrap.children.length || wrap.dataset.k !== packs.join(',')) { wrap.dataset.k = packs.join(','); wrap.innerHTML = packs.map(p => '<button type="button" data-lkia-pack="' + p + '" aria-pressed="false"><b>' + money(p * 1e6) + '</b><span>circa ' + nf(estimate(p)) + ' domande</span></button>').join(''); }
    const t = token(), code = dlg.querySelector('[data-lkia-code]'); code.hidden = !t; if (t) code.querySelector('[data-lkia-code-v]').textContent = t;
    const open = !!state.achat; wrap.hidden = !open; dlg.querySelector('.lkia-renonce').hidden = !open; dlg.querySelector('[data-lkia-pay]').hidden = !open;
    if (!open) say('L’acquisto di credito non è aperto al momento: l’IA torna da sola all’ora indicata.');
  }
  async function verify() {
    const t = token(); if (!t) return;
    const { status, j } = await post('/api/ia-achat', { action: 'verifier', jeton: t });
    if (status === 400 && j && j.code === 'jeton') { say('Questo codice non è valido.'); return; }
    if (j && j.ok) { merge({ solde: j.solde, packs: j.packs, achat: j.achat }); if (j.credite > 0) say('Pagamento ricevuto: ' + money(j.credite) + ' aggiunti al tuo credito.'); }
  }
  async function pay(pack) {
    if (!pack) return;
    say('Preparazione del pagamento…');
    const { j } = await post('/api/ia-achat', { action: 'creer', pack, jeton: token() || undefined, retour: location.pathname, renonce: dlg.querySelector('[data-lkia-renonce]').checked });
    if (!j || !j.ok || !j.url || !TOKEN.test(j.jeton || '')) { say('Il pagamento non è potuto partire. Riprova tra un attimo.'); return; }
    const code = j.jeton; put(() => localStorage.setItem(KEY_JETON, code)); /* le code est gardé AVANT de partir chez Stripe */
    location.assign(j.url);
  }
  /* retour de Stripe : ?ia=paye ou ?ia=annule */
  function back() {
    const q = new URLSearchParams(location.search), v = q.get('ia'); if (!v) return;
    q.delete('ia'); try { history.replaceState(null, '', location.pathname + (q.toString() ? '?' + q : '') + location.hash); } catch (e) { /* rien */ }
    if (v === 'paye') { shop(); say('Verifica del pagamento…'); verify().then(() => { fill(); if (!dlg.querySelector('[data-lkia-msg]').textContent.startsWith('Pagamento ricevuto')) say('Pagamento in fase di conferma: il tuo credito comparirà tra un attimo.'); }); }
    else if (v === 'annule') { shop(); say('Pagamento annullato: non è stato addebitato nulla.'); }
  }

  /* feuille de style du module (injectée : la commande vit dans Léo et dans la barre du calculateur) */
  const css = document.createElement('style'); css.id = 'lkia-css';
  css.textContent = '.lkia{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;margin:10px 0 0}.lkia--leo{flex-shrink:0;margin:0;padding:8px 16px 9px;background:#f7f3ec;border-bottom:1px solid #e3dfd7;color:#281949;gap:6px 10px}.lkia--leo .lkia-st{flex-basis:100%;font-size:12px;color:#4a3d63}.lkia--leo .lkia-sw button{min-height:30px}.lkia-sw{display:inline-flex;align-items:center;gap:4px;padding:3px;border:1.5px solid currentColor;border-radius:999px}.lkia-t{font:800 .7rem/1 var(--font-mono,ui-monospace,monospace);letter-spacing:.1em;text-transform:uppercase;padding:0 6px;opacity:.85}.lkia-sw button{min-height:32px;padding:0 12px;border:0;border-radius:999px;background:none;color:inherit;font:700 .84rem/1 "Archivo",sans-serif;cursor:pointer}.lkia-sw button[aria-pressed="true"]{background:var(--amber,#f7b645);color:#1a1a1e}.lkia-sw button:disabled{opacity:.45;cursor:not-allowed}.lkia-st{flex:1 1 220px;margin:0;font-size:.84rem;line-height:1.4}.lkia[data-kind="quota"] .lkia-st,.lkia[data-kind="off"] .lkia-st{font-weight:700}.lkia-more{min-height:32px;padding:0 12px;border:1.5px solid currentColor;border-radius:999px;background:none;color:inherit;font:700 .82rem "Archivo",sans-serif;cursor:pointer}.lkia-dlg{width:min(560px,calc(100vw - 24px));max-height:calc(100dvh - 24px);padding:0;border:2px solid #1a1a1e;border-radius:16px;background:#fdfbf7;color:#1a1a1e;box-shadow:8px 8px 0 #1a1a1e}.lkia-dlg::backdrop{background:rgba(26,16,48,.55)}.lkia-dlg-in{position:relative;display:grid;gap:12px;padding:22px 22px 20px;overflow:auto;max-height:calc(100dvh - 28px)}.lkia-x{position:absolute;top:10px;right:10px;width:36px;height:36px;border:0;border-radius:50%;background:none;font-size:1.5rem;cursor:pointer}.lkia-k{margin:0;font:800 .72rem/1 var(--font-mono,ui-monospace,monospace);letter-spacing:.14em;text-transform:uppercase;color:#b93220}.lkia-dlg h2{margin:0;font:900 1.5rem/1.1 "Archivo",sans-serif}.lkia-p,.lkia-solde,.lkia-small,.lkia-msg{margin:0;font-size:.92rem;line-height:1.5}.lkia-solde{font-weight:800}.lkia-packs{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px}.lkia-packs[hidden],.lkia-renonce[hidden],.lkia-pay[hidden]{display:none}.lkia-packs button{display:grid;gap:2px;padding:12px;border:2px solid #1a1a1e;border-radius:12px;background:#fff;cursor:pointer;text-align:left;font:inherit}.lkia-packs button b{font:900 1.2rem "Archivo",sans-serif}.lkia-packs button span{font-size:.8rem;color:#5c5a63}.lkia-packs button[aria-pressed="true"]{background:#1a1a1e;color:#fff}.lkia-packs button[aria-pressed="true"] span{color:#e7def3}.lkia-renonce{display:flex;gap:10px;align-items:flex-start;font-size:.82rem;line-height:1.45}.lkia-renonce input{width:20px;height:20px;flex:none;margin-top:1px}.lkia-renonce a{color:#b93220;font-weight:700;text-decoration:underline;text-underline-offset:2px}.lkia-pay{min-height:48px;border:2px solid #1a1a1e;border-radius:999px;background:#f7b645;color:#1a1a1e;font:800 1rem "Archivo",sans-serif;cursor:pointer;box-shadow:3px 3px 0 #1a1a1e}.lkia-pay:disabled{opacity:.5;cursor:not-allowed;box-shadow:none}.lkia-code{padding:12px;border-radius:12px;background:#241740;color:#fff9ef}.lkia-code p{margin:0}.lkia-code b{font-family:var(--font-mono,ui-monospace,monospace);letter-spacing:.06em}.lkia-copy{margin-left:6px;min-height:30px;padding:0 10px;border:1.5px solid #fff9ef;border-radius:999px;background:none;color:#fff9ef;cursor:pointer}.lkia-have summary{cursor:pointer;font-weight:700;font-size:.9rem}.lkia-have-in{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}.lkia-have-in input{flex:1 1 220px;min-height:42px;padding:0 12px;border:2px solid #1a1a1e;border-radius:10px;font:600 16px var(--font-mono,ui-monospace,monospace);text-transform:uppercase}.lkia-have-in button{min-height:42px;padding:0 14px;border:2px solid #1a1a1e;border-radius:999px;background:#fff;font-weight:800;cursor:pointer}@media(prefers-reduced-motion:no-preference){.lkia-dlg[open]{animation:lkia-in .26s cubic-bezier(.2,.7,.2,1)}@keyframes lkia-in{from{opacity:0;transform:translate3d(0,14px,0) scale(.98)}}}';
  document.head.appendChild(css);

  const api = {
    mode, setMode, token, device, refresh, learn, control, shop, subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    state() { return Object.assign({ mode: mode(), exhausted: exhausted(), credit: credit() }, state); },
    /* l'IA peut répondre : choisie, disponible, et des questions gratuites ou du crédit restent */
    usable() { return mode() === 'ia' && state.on !== false && !exhausted(); },
    body(extra) { acted = true; return Object.assign({}, extra, { appareil: device(), jeton: token() || undefined }); },
    line: credit_line, status
  };
  window.LKIA = api;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', back); else back();
}());
