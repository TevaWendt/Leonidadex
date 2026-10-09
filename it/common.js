/* Shared browser helpers. No network service and no tracking. */
(function () {
  'use strict';
  document.documentElement.classList.add('js');
  const assets=new Set(window.LK_ASSETS||[]);
  const record = x => !!x && typeof x === 'object' && !Array.isArray(x);
  const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  /* v7.53 : { silent: true } montre le message sans le faire lire une deuxième fois (la page l’annonce déjà ailleurs). */
  function status(message, opts) {
    let box = document.getElementById('lk-status');
    if (!box) { box = document.createElement('p'); box.id = 'lk-status'; box.className = 'lk-status'; box.setAttribute('role','status'); document.body.appendChild(box); }
    if (opts && opts.silent) box.setAttribute('aria-hidden', 'true'); else box.removeAttribute('aria-hidden');
    box.textContent = message;
  }
  function read(key, fallback, valid) {
    try { const raw = localStorage.getItem(key); if (raw === null) return fallback; const value = JSON.parse(raw); return valid(value) ? value : fallback; }
    catch (_) { return fallback; }
  }
  function write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (_) { status('Il salvataggio su questo dispositivo non è disponibile. Esporta i tuoi dati prima di uscire.'); return false; }
  }
  function writeBatch(values) {
    const previous = {}, written = [];
    try {
      const entries = Object.entries(values).map(([key,value]) => [key,JSON.stringify(value)]);
      for (const [key] of entries) previous[key] = localStorage.getItem(key);
      for (const [key,value] of entries) { localStorage.setItem(key,value); written.push(key); }
      return true;
    } catch (_) {
      let restored = true;
      for (const key of written.reverse()) try {
        if (previous[key] === null) localStorage.removeItem(key); else localStorage.setItem(key,previous[key]);
      } catch (_) { restored = false; }
      status(restored ? 'Importazione non salvata: archiviazione non disponibile. I dati precedenti sono conservati.' : 'Importazione interrotta. Esporta i dati mostrati prima di uscire: l’archiviazione non è disponibile.');
      return false;
    }
  }
  const own = value => record(value) && Object.entries(value).every(([k,v]) => /^[a-zA-Z0-9-]+$/.test(k) && !['__proto__','constructor','prototype'].includes(k) && [0,1,false,true].includes(v));
  const coord = n => typeof n === 'number' && Number.isFinite(n) && Math.abs(n) <= 1000000;
  const pair = p => Array.isArray(p) && p.length === 2 && p.every(coord);
  const markers = value => Array.isArray(value) && value.length <= 5000 && value.every(p => record(p) && typeof p.n === 'string' && p.n.length <= 200 && coord(p.x) && coord(p.y) && (p.note === undefined || (typeof p.note === 'string' && p.note.length <= 4000)) && (p.cat === undefined || (typeof p.cat === 'string' && p.cat.length <= 100)));
  const strokes = value => Array.isArray(value) && value.length <= 5000 && value.every(s => record(s) && /^#[\da-f]{6}$/i.test(s.c) && typeof s.w === 'number' && s.w > 0 && s.w <= 100 && typeof s.o === 'number' && s.o >= 0 && s.o <= 1 && (s.t === 'pen' ? Array.isArray(s.p) && s.p.length <= 20000 && s.p.every(pair) : ['line','rect','circle'].includes(s.t) && pair(s.a) && pair(s.b)));
  function mapImport(d) {
    if (!record(d) || ![1,2].includes(d.version) || !markers(d.marqueurs) || !own(d.repere) || (d.traces !== undefined && !strokes(d.traces))) throw new Error('Formato di salvataggio non riconosciuto o dati non validi.');
    return {marqueurs:d.marqueurs.map(p => ({n:p.n,x:p.x,y:p.y,note:p.note || '',...(p.cat ? {cat:p.cat} : {})})),repere:{...d.repere},traces:d.traces || []};
  }
  async function copy(text, button, success) {
    const label = button?.textContent;
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Appunti non disponibili');
      await navigator.clipboard.writeText(text);
      if (button && success) { button.textContent = success; setTimeout(() => { button.textContent = label; }, 1800); }
      status('Link o testo copiato.'); return true;
    } catch (_) { status('Copia non riuscita. Seleziona e copia questo testo: ' + text); return false; }
  }
  function hasAsset(url) {
    try { return assets.has(new URL(url,location.href).pathname); } catch (_) { return false; }
  }
  function safeUrl(url) { try { const u = new URL(url,location.href); return ['https:','http:'].includes(u.protocol) ? u.href : ''; } catch (_) { return ''; } }
  /* v7.54 (lot 1) : chargement à la demande d'un script déclaré <script type="lk/lazy" src="…"> (le navigateur ne
     télécharge pas un script d'un type inconnu). Une seule requête par fichier, promesse partagée, version conservée. */
  const lazyScripts = new Map();
  function lazyScript(name) {
    if (lazyScripts.has(name)) return lazyScripts.get(name);
    const tag = Array.from(document.querySelectorAll('script[type="lk/lazy"][src]')).find(s => (s.getAttribute('src') || '').split('?')[0].split('/').pop() === name);
    const promise = new Promise((resolve, reject) => {
      if (!tag) { reject(new Error(name + ' non dichiarato')); return; }
      const s = document.createElement('script'); s.src = tag.getAttribute('src'); s.async = true; s.id = 'lk-lazy-' + name.replace(/[^a-z0-9]+/gi, '-');
      s.onload = () => resolve(); s.onerror = () => { lazyScripts.delete(name); s.remove(); reject(new Error(name + ' indisponible')); };
      document.head.appendChild(s);
    });
    lazyScripts.set(name, promise);
    return promise;
  }
  window.LK = {esc,record,read,write,writeBatch,own,markers,strokes,mapImport,copy,status,hasAsset,safeUrl,lazyScript};
})();

/* v7.69 : visionneuse d'images. Un lien vers une image du site (galeries « En images », aperçus, captures du tuto) ouvre
   l'image dans la page (lk-visionneuse.js, déclaré <script type="lk/lazy"> par outils/sync-site.cjs et chargé au premier
   survol ou au premier clic) au lieu du fichier brut. Clic du milieu, Ctrl ou Maj : comportement normal du navigateur. */
(function () {
  'use strict';
  const IMG = /\.(?:webp|avif|jpe?g|png)$/i;
  const declared = () => !!document.querySelector('script[type="lk/lazy"][src*="lk-visionneuse.js"]');
  const imageLink = function (el) {
    const a = el && el.closest ? el.closest('a[href]') : null;
    if (!a || a.hasAttribute('download') || a.closest('.lkv')) return null;
    try { const u = new URL(a.href, location.href); return u.origin === location.origin && IMG.test(u.pathname) ? a : null; } catch (_) { return null; }
  };
  const load = function () { return window.LK && window.LK.lazyScript ? window.LK.lazyScript('lk-visionneuse.js') : Promise.reject(new Error('LK')); };
  document.addEventListener('click', function (ev) {
    if (ev.defaultPrevented || ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
    const a = imageLink(ev.target); if (!a || !declared()) return;
    ev.preventDefault();
    load().then(function () { window.LKViewer.open(a); }).catch(function () { location.href = a.href; });
  });
  /* préchargement discret au survol ou au focus : la visionneuse est prête avant le clic */
  const warm = function (ev) {
    if (!imageLink(ev.target) || !declared()) return;
    document.removeEventListener('pointerover', warm); document.removeEventListener('focusin', warm);
    load().catch(function () {});
  };
  document.addEventListener('pointerover', warm, { passive: true });
  document.addEventListener('focusin', warm);
})();

/* v7.69 : deux petits mouvements partagés.
   - [data-lk-count] : un nombre (« 170+ », « 7 ») défile de 0 à sa valeur quand il arrive à l'écran ; le texte final est
     celui de la page, rien ne bouge s'il est déjà visible au chargement ou si « réduire les animations » est demandé.
   - [data-lk-vt] : un groupe de boutons radio (filtre) change d'état dans une transition de vue quand le navigateur la
     connaît : les cartes glissent à leur nouvelle place au lieu de sauter. */
(function () {
  'use strict';
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const counts = Array.prototype.slice.call(document.querySelectorAll('[data-lk-count]'));
  if (counts.length && !reduce && 'IntersectionObserver' in window) {
    const vh = window.innerHeight || 800;
    const run = function (el) {
      const final = el.dataset.lkFinal, m = final.match(/^(\D*)(\d+)(\D*)$/); if (!m) { el.textContent = final; return; }
      const target = parseInt(m[2], 10), t0 = performance.now(), dur = Math.min(1500, 500 + target * 5);
      const step = function (now) { const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3); el.textContent = p < 1 ? m[1] + Math.round(target * e) + m[3] : final; if (p < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    };
    const io = new IntersectionObserver(function (entries) { entries.forEach(function (en) { if (!en.isIntersecting) return; io.unobserve(en.target); run(en.target); }); }, { threshold: 0.5 });
    /* déjà à l'écran : on ne compte que si la page n'a pas encore été peinte (sinon 170 → 0 → 170 se verrait) */
    const painted = !window.LKMotion || window.LKMotion.painted;
    counts.forEach(function (el) {
      const final = el.textContent.trim(), m = final.match(/^(\D*)(\d+)(\D*)$/), r = el.getBoundingClientRect();
      if (!m || (painted && r.top < vh && r.bottom > 0)) return;
      el.dataset.lkFinal = final; el.textContent = m[1] + '0' + m[3]; io.observe(el);
    });
    window.addEventListener('beforeprint', function () { counts.forEach(function (el) { if (el.dataset.lkFinal) el.textContent = el.dataset.lkFinal; }); });
  }
  document.addEventListener('click', function (ev) {
    const label = ev.target && ev.target.closest ? ev.target.closest('[data-lk-vt] label[for]') : null;
    if (!label || reduce || typeof document.startViewTransition !== 'function') return;
    const input = document.getElementById(label.htmlFor);
    if (!input || input.type !== 'radio' || input.checked || input.disabled) return;
    ev.preventDefault();
    document.startViewTransition(function () { input.checked = true; input.dispatchEvent(new Event('change', { bubbles: true })); });
    try { input.focus({ preventScroll: true }); } catch (_) {}
  });
})();

/* v7.54 (lot 1, PERF-05) : LKMotion, moteur d'apparition partagé par toutes les pages.
   - Un seul IntersectionObserver pour .reveal / .rise (classe « in »), .lk-reveal et [data-lk-reveal] (classe « is-in »).
   - Ce qui est déjà à l'écran quand la page s'ouvre est montré tout de suite, dans la même tâche que la pose de la classe
     « js » : aucun clignotement, aucune attente pour le contenu principal (LCP). Le reste apparaît en entrant dans l'écran,
     par vagues (60 ms par élément, 300 ms au plus), sans lecture de géométrie pendant le défilement.
   - « Réduire les animations » : tout est visible, rien ne bouge (style.css). Sans JavaScript : tout est visible.
   - Filet de sécurité : après 2,5 s, ce qui est dans l'écran et toujours caché est montré ; le reste garde son apparition
     au défilement (l'ancien filet montrait toute la page d'un coup et supprimait les apparitions suivantes).
   - Contenus ajoutés ou filtrés : observe(nœuds, {replay:true}) rejoue l'entrée ; enter(nœuds) anime en cascade des lignes
     ou cellules déjà visibles (Web Animations, sans écouteur ni classe à retirer), pour les listes des lots suivants. */
(function () {
  'use strict';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const SEL = '.reveal, .rise, .lk-reveal, [data-lk-reveal]';
  /* Le haut de la page a-t-il déjà été peint quand ce script (en fin de page) s'exécute ? L'entrée « first-contentful-paint »
     arrive souvent après coup sur un appareil lent : au-delà de 200 ms depuis le début de la navigation, on considère que oui.
     Sert à ne jamais cacher un titre, un texte ou une image que le visiteur a déjà vus pour les faire réapparaître. */
  const painted = (function () { try { return performance.now() > 200 || performance.getEntriesByType('paint').some(function (e) { return e.name === 'first-contentful-paint'; }); } catch (_) { return true; } })();
  const seen = new WeakSet(), timers = new WeakMap(), running = new WeakMap(), active = new Set();
  let pending = 0;
  /* Montrer sans transition : la mesure « est-ce à l'écran ? » force un calcul de style où le bloc est encore transparent ; sans
     garde-fou, le passage à « visible » jouerait la transition (clignotement au chargement). La classe lk-instant coupe toute
     transition le temps d'une trame, puis est retirée : les apparitions suivantes gardent leur mouvement. */
  const instant = new Set(); let instantFrame = 0;
  function noTransition(el) {
    el.classList.add('lk-instant'); instant.add(el);
    if (!instantFrame) instantFrame = requestAnimationFrame(function () { requestAnimationFrame(function () { instantFrame = 0; instant.forEach(function (n) { n.classList.remove('lk-instant'); }); instant.clear(); }); });
  }
  /* v7.55 (lot 2) : un bloc peut porter les deux langages à la fois (classe « rise » du gabarit + « lk-reveal » posée par
     Motion+ : cartes des hubs du monde, outils de l'accueil, textes des fiches). La v7.54 ne lui donnait que « in » : il
     restait à opacité 0 (75 blocs sur 30 pages, animations actives). Il reçoit maintenant « in » et « is-in ». */
  const legacy = el => el.classList.contains('reveal') || el.classList.contains('rise');
  const modern = el => el.classList.contains('lk-reveal') || el.hasAttribute('data-lk-reveal');
  const shown = el => (!legacy(el) || el.classList.contains('in')) && (!modern(el) || el.classList.contains('is-in'));
  function show(el, delay, settled) {
    const leg = legacy(el), mod = modern(el) || !leg;
    const t = timers.get(el); if (t) { clearTimeout(t); timers.delete(el); }
    const apply = function () { if (leg) el.classList.add('in'); if (mod) el.classList.add('is-in'); };
    if (settled) { noTransition(el); if (mod) { el.style.setProperty('--lk-delay', '0ms'); el.classList.add('lk-settled'); } apply(); return; }
    if (mod && el.dataset.lkStagger !== '1') el.style.setProperty('--lk-delay', (!leg && delay > 0 ? delay : 0) + 'ms');
    if (leg && delay > 0) { timers.set(el, setTimeout(function () { timers.delete(el); apply(); }, delay)); return; }
    apply();
  }
  const io = 'IntersectionObserver' in window ? new IntersectionObserver(function (entries) {
    let k = 0;
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      const el = en.target; io.unobserve(el); pending = Math.max(0, pending - 1);
      if (shown(el)) return;
      const own = parseInt(el.dataset.delay || '-1', 10);
      const d = own >= 0 ? Math.min(own, 300) : Math.min(k * 60, 300); k++;
      show(el, d, false);
    });
  }, { threshold: 0.01, rootMargin: '0px 0px 12% 0px' }) : null;
  const inView = function (el, vh) { const r = el.getBoundingClientRect(); return r.height > 0 && r.top < vh && r.bottom > 0; };
  /* observe(nœuds, {initial, replay, disabled}) : initial (défaut vrai) montre sans transition ce qui est déjà à l'écran ;
     replay réarme un nœud déjà traité (résultat filtré réaffiché). */
  function observe(targets, options) {
    if (!targets) return;
    const opt = options || {};
    const list = targets.nodeType === 1 ? [targets] : Array.from(targets);
    if (!list.length) return;
    const vh = window.innerHeight || 800;
    const noMotion = reduced.matches || !io || opt.disabled;
    /* v7.66 (latence) : trois passes au lieu d'une boucle qui alternait lecture de géométrie et écriture de classes
       (une mise en page forcée par bloc : jusqu'à 1,1 s de calcul sur Vêtements et style, processeur ralenti ×4).
       1) écritures du « replay », 2) toutes les lectures, 3) toutes les écritures : une seule mise en page. */
    const todo = [], again = [];
    list.forEach(function (el) {
      if (!el || el.nodeType !== 1) return;
      /* bloc déjà suivi qui reçoit de nouvelles classes (lk-reveal posée après la première passe) : s'il est déjà montré
         par l'ancien langage, il le reste, sans transition ; sinon l'observateur en cours le montrera entièrement */
      if (seen.has(el) && !opt.replay) { if (!shown(el) && legacy(el) && el.classList.contains('in')) again.push(el); return; }
      seen.add(el);
      if (opt.replay) { el.classList.remove('in', 'is-in', 'lk-settled'); if (io) io.unobserve(el); }
      todo.push(el);
    });
    const visible = !noMotion && opt.initial !== false ? todo.map(function (el) { return inView(el, vh); }) : null;
    again.forEach(function (el) { show(el, 0, true); });
    todo.forEach(function (el, i) {
      if (noMotion || (visible && visible[i])) { show(el, 0, true); return; }
      pending++; io.observe(el);
    });
  }
  function scan(root, options) {
    root = root || document;
    const found = root.querySelectorAll ? Array.from(root.querySelectorAll(SEL)) : [];
    if (root.nodeType === 1 && root.matches && root.matches(SEL)) found.unshift(root);
    observe(found, options);
  }
  /* enter(nœuds, {stagger, cap, duration, rise}) : cascade d'entrée pour des lignes ou cellules déjà visibles (listes filtrées,
     onglets). Seuls les nœuds dans l'écran sont animés ; les autres restent simplement visibles. Un nœud qui contient le focus
     n'est pas déplacé. Sans Web Animations ou avec « réduire les animations » : rien ne bouge, tout est visible. */
  function enter(targets, options) {
    const opt = options || {};
    const list = (targets && targets.nodeType === 1 ? [targets] : Array.from(targets || [])).filter(function (el) { return el && el.nodeType === 1; });
    if (!list.length || reduced.matches || document.hidden || typeof Element.prototype.animate !== 'function') return;
    const vh = window.innerHeight || 800, stagger = opt.stagger ?? 30, cap = opt.cap ?? 240, duration = opt.duration ?? 380, rise = opt.rise ?? 10;
    let i = 0;
    const rects = list.map(function (el) { return el.getBoundingClientRect(); });
    list.forEach(function (el, n) {
      const prev = running.get(el); if (prev) { prev.cancel(); running.delete(el); }
      const r = rects[n]; if (!(r.height > 0 && r.top < vh + 40 && r.bottom > -40)) return;
      if (el.contains(document.activeElement)) return;
      const keep = getComputedStyle(el).display === 'table-row';
      const from = keep ? { opacity: 0 } : { opacity: 0, transform: 'translate3d(0,' + rise + 'px,0)' };
      const to = keep ? { opacity: 1 } : { opacity: 1, transform: 'none' };
      const a = el.animate([from, to], { duration: duration, delay: Math.min(i * stagger, cap), easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'backwards' });
      i++;
      running.set(el, a); active.add(a);
      a.onfinish = a.oncancel = function () { active.delete(a); if (running.get(el) === a) running.delete(el); };
    });
  }
  /* settle() : termine net les cascades en cours (impression, page masquée) */
  function settle() { active.forEach(function (a) { a.finish(); }); active.clear(); }
  document.addEventListener('visibilitychange', function () { if (document.hidden) settle(); });
  /* tout montrer : impression, ou préférence « réduire les animations » activée en cours de visite */
  function showAll(root) {
    (root || document).querySelectorAll(SEL).forEach(function (el) { if (!shown(el)) show(el, 0, true); if (io) io.unobserve(el); });
    pending = 0;
  }
  if (reduced.addEventListener) reduced.addEventListener('change', function () { if (reduced.matches) showAll(); });
  window.addEventListener('beforeprint', function () { settle(); showAll(); });
  /* filet de sécurité : seul ce qui est dans l'écran est forcé ; le reste garde son apparition au défilement */
  setTimeout(function () {
    if (!pending) return;
    const vh = window.innerHeight || 800;
    document.querySelectorAll(SEL).forEach(function (el) { if (!shown(el) && inView(el, vh)) { show(el, 0, true); if (io) io.unobserve(el); } });
  }, 2500);
  /* v7.39 : une fois l'apparition jouée, la promotion en couche (will-change) est rendue */
  document.addEventListener('transitionend', function (ev) { const el = ev.target; if (!el || !el.classList) return; if (el.classList.contains('lk-reveal') && el.classList.contains('is-in')) el.classList.add('lk-settled'); if (el.classList.contains('lk-w')) { const w = el.closest('.lk-words'); if (w) w.classList.add('lk-settled'); } });
  window.LKMotion = { observe: observe, scan: scan, enter: enter, settle: settle, showAll: showAll, reduced: function () { return reduced.matches; }, painted: painted };
  /* les .reveal / .rise écrits dans la page : traités ici, dans la même tâche que la classe « js » */
  scan(document, { initial: true });
})();

/* Fiches du monde : galerie « En images » épinglée. Le cadre reste fixe le temps de N écrans de défilement ;
   la progression du défilement choisit la vue affichée (t = avancement de la transition vers la suivante).
   La vue suivante arrive depuis la profondeur, la gauche, la droite ou le bas (classe lore-slide--z/l/r/b), l'ancienne se floute. */
(function () {
  const stack = document.querySelector('.lore-stack');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!stack || motion.matches) return;
  const stage = stack.querySelector('.lore-stage');
  const slides = Array.from(stack.querySelectorAll('.lore-slide'));
  if (!stage || slides.length < 2) return;
  const N = slides.length;
  let queued = false, last = -1;
  /* v7.39 : la géométrie (position de la galerie, hauteur, décalage collant) est mesurée au chargement et au
     redimensionnement ; le défilement ne lit plus le layout. */
  let stackTop = 0, travel = 1, stickTop = 96;
  function measure() {
    const rect = stack.getBoundingClientRect();
    stackTop = rect.top + window.scrollY;
    stickTop = parseFloat(getComputedStyle(stage).top) || 96;
    travel = Math.max(1, rect.height - stage.offsetHeight);
  }
  function update() {
    queued = false;
    if (motion.matches) return;
    const p = Math.min(1, Math.max(0, (stickTop - (stackTop - window.scrollY)) / travel));
    const pos = p * (N - 1), i = Math.min(N - 2, Math.floor(pos)), t = Math.min(1, Math.max(0, pos - i));
    /* v7.54 : aucune écriture quand la position n'a pas changé (défilement hors de la galerie) */
    const state = Math.round(pos * 1000);
    if (state === last) return;
    last = state;
    slides.forEach(function (s, k) {
      s.classList.remove('is-active', 'is-out', 'is-next');
      s.style.removeProperty('--t');
      if (k === i) {
        if (t < 0.999) { s.classList.add('is-active'); if (t > 0.001) { s.classList.add('is-out'); s.style.setProperty('--t', t.toFixed(3)); } }
      } else if (k === i + 1) {
        if (t >= 0.999) s.classList.add('is-active');
        else if (t > 0.001) { s.classList.add('is-next'); s.style.setProperty('--t', t.toFixed(3)); }
      }
    });
  }
  window.addEventListener('scroll', function () { if (!queued) { queued = true; requestAnimationFrame(update); } }, { passive: true });
  window.addEventListener('resize', function () { measure(); last = -1; update(); });
  window.addEventListener('load', function () { measure(); last = -1; update(); });
  setTimeout(function () { measure(); last = -1; update(); }, 1200);
  measure(); update();
})();

/* Vitrine à deux cartes superposées (.lk-flip) : survol ou clic amène l'autre carte devant. */
(function () {
  document.querySelectorAll('[data-lk-flip]').forEach(function (box) {
    const cards = Array.from(box.querySelectorAll('.lk-flip-card'));
    function front(card) { cards.forEach(function (c) { const on = c === card; c.classList.toggle('is-front', on); c.setAttribute('aria-pressed', on ? 'true' : 'false'); }); }
    cards.forEach(function (c) {
      c.addEventListener('click', function () { front(c.classList.contains('is-front') ? cards[(cards.indexOf(c) + 1) % cards.length] : c); });
      c.addEventListener('mouseenter', function () { if (!c.classList.contains('is-front')) front(c); });
    });
  });
})();

/* Rails animés sur les deux bords, du compte à rebours au pied de page. */
(function () {
  const main = document.getElementById('main');
  if (!main || document.querySelector('.lk-rails')) return;
  const fc = document.querySelector('.fcount') || main.querySelector('.vhero, .hero, .fhero, .lore-hero');
  const rails = document.createElement('div'); rails.className = 'lk-rails'; rails.setAttribute('aria-hidden', 'true');
  rails.innerHTML = '<span class="lk-rail lk-rail--l"></span><span class="lk-rail lk-rail--r"></span>';
  /* v7.58 (FINAL-01) : les rails restent invisibles (visibility) tant que la page n'est pas chargée : leur recalage après le
     chargement des images de l'en-tête déplaçait un bloc visible (décalage de mise en page 0,078 mesuré par intermittence). */
  rails.style.visibility = 'hidden';
  main.appendChild(rails);
  /* Les rails commencent sous le premier bloc pleine largeur (en-tête de page ou compte à rebours) et passent
     derrière tous les blocs pleine largeur suivants (bandeaux, compte à rebours, chiffres clés) : ils ne se
     superposent qu'aux marges des sections centrées.
     v7.54 : toutes les lectures de géométrie d'abord, les écritures ensuite (l'ancienne boucle forçait une mise en page
     par bloc) ; le redimensionnement est regroupé par trame. */
  function place() {
    const m = main.getBoundingClientRect(), vw = document.documentElement.clientWidth;
    const kids = Array.from(main.children).filter(el => el !== rails).map(el => ({ el, rect: el.getBoundingClientRect() })).filter(k => k.rect.height >= 4);
    const writes = [];
    let leadEnd = 0, lead = true;
    for (const k of kids) {
      if (k.rect.width < vw - 2) { lead = false; continue; }
      if (lead) leadEnd = k.rect.bottom - m.top;
      const cs = getComputedStyle(k.el);
      writes.push({ el: k.el, position: cs.position === 'static', zIndex: cs.zIndex === 'auto' || cs.zIndex === '0' });
    }
    const hero = main.querySelector('.vhero, .hero, .fhero, .lore-hero, .lk-home-hero, .lk-calc-hero');
    let top = hero ? Math.max(0, hero.getBoundingClientRect().bottom - m.top) : 0;
    /* Le compte à rebours sert de repère seulement s'il fait partie du bloc pleine largeur d'ouverture (hubs). */
    if (fc && fc.classList.contains('fcount')) { const fb = fc.getBoundingClientRect().bottom - m.top; if (fb <= leadEnd + 2) top = Math.max(top, fb); }
    writes.forEach(function (w) { if (w.position) w.el.style.position = 'relative'; if (w.zIndex) w.el.style.zIndex = '1'; });
    const px = top + 'px'; if (rails.style.top !== px) rails.style.top = px;
  }
  let queued = false;
  const schedule = function () { if (queued) return; queued = true; requestAnimationFrame(function () { queued = false; place(); }); };
  const reveal = function () { requestAnimationFrame(function () { place(); rails.style.visibility = ''; }); };
  window.addEventListener('resize', schedule); window.addEventListener('load', reveal, { once: true }); place();
  if (document.readyState === 'complete') reveal(); else setTimeout(reveal, 4000);
})();

/* Léo : amorçage isolé. Les données ne se chargent qu'à l'ouverture du panneau. */
(function(){'use strict';if(!document.querySelector('main')||document.getElementById('leo-style'))return;/* v7.60-v7.64 : Léo parle les langues de outils/langues.json → leo (français, espagnol, italien, anglais, allemand) : pas de Léo sur une page d’une autre langue */if(!/^(?:fr|es|it|en|de)\b/i.test(document.documentElement.lang||'fr'))return;const base=(document.currentScript&&document.currentScript.src||'').replace(/[^/]*$/,'')||'/';const css=document.createElement('link');css.id='leo-style';css.rel='stylesheet';css.href='/leo.css?v=0ff305b3c08b';css.onload=()=>{const script=document.createElement('script');script.src=base+'leo-loader.js?v=0ff305b3c08b';document.head.append(script);};document.head.append(css);})();

/* v7.61 (langues) : page introuvable. Le serveur renvoie la page 404 française pour toute adresse inconnue ; sous
   /en/… (une adresse d'une langue publiée), c'est la page introuvable de cette langue qui s'affiche. */
(function () {
  'use strict';
  if (!document.querySelector('.e404')) return;
  const m = location.pathname.match(/^\/([a-z]{2})\//), here = (document.documentElement.lang || 'fr').slice(0, 2);
  if (!m || m[1] === here) return;
  const a = document.querySelector('[data-lk-langbar] a[data-lk-lang="' + m[1] + '"][href]');
  if (a) location.replace(a.getAttribute('href'));
})();

/* Lot C (v7.32) : du mouvement sur toutes les pages. Les blocs de contenu apparaissent au défilement (par vagues,
   avec un léger décalage), les piles d'images s'ouvrent, les titres de section tirent leur trait, l'en-tête prend
   une ombre dès qu'on défile. Sans JavaScript ou avec « réduire les animations », tout est visible immédiatement.
   v7.54 : les apparitions passent par LKMotion (un seul observateur pour toute la page). */
(function () {
  'use strict';
  const header = document.querySelector('header');
  if (header) {
    let queued = false;
    const onScroll = function () { if (queued) return; queued = true; requestAnimationFrame(function () { header.classList.toggle('is-scrolled', window.scrollY > 8); queued = false; }); };
    window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  }
  const main = document.querySelector('main');
  if (!main || !window.LKMotion) return;
  const calc = document.body.classList.contains('calculator-page');
  const TITLES = 'main section.shell>h2, main .d-section>h2, main .info-section>h2, main .lore-sec>h2, main .tools-sec>h2, main .counties-sec>h2, main .lk-explore>h2, main .t-chapter>h2';
  const BLOCKS = calc
    ? '.lk-stack, .lk-tool, .lk-outro, .calc-editorial>*, .lk-tool-guide>*:not(h2)'
    : '.lk-stack, .d-card, .info-card, .tool, .lk-her, .lk-feature, .t-chapter, .d-progress-group, .d-empty, .lk-photo-card, .lk-link, .lk-flip, .lk-outro, .col-card, .info-section>p, .info-section>.info-grid, .info-sources dl>div, .d-section>p, .d-section>.d-related, .d-sources>ul, .lore-texte, .d-global, .kit, .rare-card, .lk-entry-card, .faq details, .county, .fq, .t-intro, .t-figure, .t-steps, .t-mode-fields, .t-table-wrap';
  const skip = function (el) { return el.closest('[hidden], template, .reveal, .rise, .lore-stack, .leo-panel, .lk-arrive, .lk-showcase, .lk-loc, .ak-stack') || el.classList.contains('reveal') || el.classList.contains('rise') || el.classList.contains('lk-arrive') || el.classList.contains('sr-only'); };
  const targets = [];
  /* v7.47 : ce qui est déjà à l'écran à l'ouverture n'est jamais caché (LKMotion le montre sans transition, dans la même
     tâche que la pose de la classe) : le texte principal se peint dès le premier rendu. Les piles d'images (.lk-stack)
     glissent toujours depuis la droite après le texte. */
  main.querySelectorAll(TITLES).forEach(function (h) { if (skip(h)) return; h.classList.add('lk-h2', 'lk-reveal'); targets.push(h); });
  const stacks = [];
  main.querySelectorAll(BLOCKS).forEach(function (el) { if (skip(el) || el.classList.contains('lk-reveal')) return; el.classList.add('lk-reveal'); (el.matches('.lk-stack') ? stacks : targets).push(el); });
  main.querySelectorAll('.lk-stack').forEach(function (el) { if (!el.classList.contains('lk-reveal')) { el.classList.add('lk-reveal'); stacks.push(el); } });
  window.LKMotion.observe(targets, { initial: true });
  /* les piles glissent depuis la droite après le texte, sauf si la page est déjà peinte (elles resteraient visibles → cachées → visibles) */
  window.LKMotion.observe(stacks, { initial: window.LKMotion.painted });
})();

/* v7.36 : Motion+ — encore plus de vie, toujours sobre. Les titres se composent mot à mot, les images se dévoilent d'un
   rideau (façon bande-annonce), les paragraphes se nettoient d'un flou, les cartes des grilles arrivent en cascade,
   les fonds des bandeaux glissent au défilement (parallaxe), une fine barre ambre suit la lecture, les cartes s'inclinent
   sous la souris, les boutons principaux reçoivent un reflet. Sans JavaScript ou avec « réduire les animations », tout est
   visible immédiatement, rien ne bouge. */
(function () {
  'use strict';
  const main = document.querySelector('main');
  if (!main) return;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const reduced = motion.matches;
  const calc = document.body.classList.contains('calculator-page');
  const io = 'IntersectionObserver' in window && !!window.LKMotion;
  /* --- 1. titres mot à mot ------------------------------------------------------------------------------- */
  function splitWords(el) {
    if (!el || el.dataset.lkWords || el.querySelector('input,button,select,textarea,svg,img') || el.textContent.trim().length > 140) return;
    let i = 0;
    const walk = function (node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          if (!n.textContent.trim()) return;
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (!part.trim()) { frag.appendChild(document.createTextNode(part)); return; }
            const s = document.createElement('span'); s.className = 'lk-w'; s.style.setProperty('--lk-i', Math.min(i++, 8)); s.textContent = part; frag.appendChild(s);
          });
          n.parentNode.replaceChild(frag, n);
        } else if (n.nodeType === 1 && !/^(BR|SCRIPT|STYLE)$/.test(n.tagName) && !n.classList.contains('lk-w') && !n.classList.contains('w')) {
          /* v7.37 : un texte peint par un dégradé (background-clip:text) reste entier : le dégradé n'est pas
             transmis à un span enfant en inline-block, le mot deviendrait transparent (ex. « VI » du titre d'accueil). */
          const cs = window.getComputedStyle(n);
          if ((cs.webkitBackgroundClip || cs.backgroundClip) === 'text') { n.classList.add('lk-w'); n.style.setProperty('--lk-i', Math.min(i++, 8)); return; }
          walk(n);
        }
      });
    };
    walk(el);
    el.dataset.lkWords = '1';
    el.classList.add('lk-words');
  }
  /* --- 2. bandeaux : entrée en cascade au chargement --------------------------------------------------------- */
  /* v7.54 (lot 1) : la cascade ne joue que si l'en-tête de page n'a pas encore été peint quand ce script s'exécute (script en fin
     de page : c'est rare). Quand le visiteur a déjà vu le titre, le texte et les images, on ne les cache plus pour les faire
     réapparaître : mesuré avant le lot 1, ce clignotement durait jusqu'à 3 s sur Véhicules à processeur lent. */
  const painted = !window.LKMotion || window.LKMotion.painted;
  const now = [];
  const HERO = '.page-head, .vhero-in, .fhero-in, .lore-hero, .info-hero, .t-hero, .lk-calc-hero-in, .lk-tool-guide>header';
  const HERO_ITEMS = 'h1, .fiche-cat, .vhero-eyebrow, .info-eyebrow, .calc-kicker, .lk-kicker, .lede, .info-lede, .d-intro-note, .lk-hero-meta, .c-hero-action, .d-actions, .fiche-liens, .lk-stack, figure, p, .lk-calc-hero-scene';
  main.querySelectorAll(HERO).forEach(function (hero) {
    if (hero.closest('.hero, .lore-stack')) return;
    const items = Array.prototype.filter.call(hero.querySelectorAll(HERO_ITEMS), function (el) {
      if (el.matches('.rise, .reveal, [hidden], .vhero-bg, .fhero-bg, .lk-rails') || el.closest('.rise, .reveal, figure figure, .lk-stack figure')) return false;
      const parentItem = el.parentElement && el.parentElement.closest(HERO_ITEMS);
      return !(parentItem && hero.contains(parentItem));
    });
    items.forEach(function (child, i) {
      child.classList.add('lk-hero-item'); if (painted) child.classList.add('lk-hero-still'); child.style.setProperty('--lk-i', Math.min(i, 8));
      if (child.matches('h1')) { splitWords(child); now.push(child); }
    });
  });
  main.querySelectorAll('h1').forEach(function (h) { if (!h.dataset.lkWords && !h.closest('.hero') && !h.querySelector('.w')) { splitWords(h); now.push(h); } });
  const promise = main.querySelector('.lk-home-promise'); if (promise) { splitWords(promise); now.push(promise); }
  /* les mots partent de leur état invisible : la classe qui les fait monter est posée un rendu plus tard.
     v7.54 : la promotion en couche des mots est rendue dès la fin de l'entrée, aussi quand la préférence change ; page déjà
     peinte : les mots restent visibles, sans transition (classe lk-hero-still), posés dans la même tâche. */
  const settleWords = function () { main.querySelectorAll('.lk-words').forEach(function (el) { el.classList.add('lk-settled'); }); };
  if (motion.addEventListener) motion.addEventListener('change', function () { if (motion.matches) settleWords(); });
  const go = function () { now.forEach(function (el) { el.classList.add('lk-now'); }); if (reduced || painted) settleWords(); };
  if (painted) { now.forEach(function (el) { el.classList.add('lk-hero-still'); }); go(); }
  else if (reduced || !window.requestAnimationFrame) go(); else window.requestAnimationFrame(function () { window.requestAnimationFrame(go); });
  if (reduced) return;
  /* --- 3. apparition au défilement, variantes selon la nature du bloc ---------------------------------------- */
  /* v7.55 (lot 2) : les cartes « Combat » (.ed-step) et les carnets de Progression (.cn-dcard) entrent en cascade comme les autres cartes */
  const GRID_CARDS = '.d-card, .info-card, .tool, .lk-feature, .kit, .rare-card, .lk-entry-card, .col-card, .lk-tool, .lk-photo-card, .county, .lore-card, .d-topic, .lk-her, .ed-step, .cn-dcard';
  const FIGURES = 'main figure';
  const TEXTS = '.lede, .info-lede, .lk-home-support, main .shell>p, main .d-section>p, main .info-section>p, .lore-texte>p, .t-intro>p, .calc-section-desc, .calc-card-desc';
  const ROWS = 'main table>tbody, main .shell>ul, main .shell>ol, .t-steps, .d-sources>ul, .info-grid, .lk-goals';
  const extra = [];
  /* v7.44 : la séquence lk-showcase (À propos) gère ses propres apparitions (lk-showcase.js, informations.css) */
  /* v7.72 : une zone d'annonce (aria-live) ou un texte réservé aux lecteurs d'écran (.sr-only) n'entre pas en scène : il resterait à opacité 0 (l'observateur ne voit jamais une case de 1 px) */
  const add = function (el, variant) { if (!el || el.matches('.sr-only, [aria-live]') || el.closest('[hidden], template, .lore-stack, .leo-panel, .hero, header, footer, #calc-panels, .lk-arrive, .lk-showcase, .lk-loc, .ak-stack')) return; if (!el.classList.contains('lk-reveal')) { el.classList.add('lk-reveal'); extra.push(el); } if (variant) el.classList.add('lk-reveal--' + variant); };
  main.querySelectorAll(FIGURES).forEach(function (el) { if (el.closest('.lk-stack, figure figure, .lk-reveal--clip, .lk-hero-item, .d-card, .lore-card, .ed-step, .cn-dcard')) return; add(el, 'clip'); });
  main.querySelectorAll(TEXTS).forEach(function (el) { if (el.closest('.lk-reveal--clip') || el.classList.contains('lk-hero-item') || el.closest('.lk-hero-item')) return; add(el, 'blur'); });
  /* v7.56 (lot 3, UI-03) : les listes des catalogues (.cat-table) animent chaque ligne elles-mêmes (catalogue.js), y compris
     après un filtre ou un tri ; le bloc entier n'est plus traité comme une rangée de Motion+. */
  main.querySelectorAll(ROWS).forEach(function (el) { if (el.closest('.lk-reveal, .cat-table')) return; if (el.children.length > 1 && el.children.length <= 40) { add(el, 'rows'); Array.prototype.slice.call(el.children).forEach(function (c, i) { c.style.setProperty('--lk-i', Math.min(i, 8)); }); } });
  main.querySelectorAll(GRID_CARDS).forEach(function (el) { if (el.classList.contains('lk-arrive') || el.closest('.lk-loc, .ak-stack')) return; el.classList.add('lk-reveal--zoom'); if (!el.classList.contains('lk-reveal')) add(el); });
  main.querySelectorAll('.lk-stack').forEach(function (el) { el.classList.add('lk-reveal--right'); el.querySelectorAll('img').forEach(function (img) { img.classList.add('lk-kb'); }); });
  /* v7.37 : la variante « depuis la gauche » ne s'ajoute qu'aux blocs réellement suivis par l'observateur (classe lk-reveal),
     sinon le décalage de -22 px restait appliqué pour toujours (textes des fiches du monde hors de la gouttière). */
  main.querySelectorAll('.lore-texte, .calc-editorial>div:first-child').forEach(function (el) { if (el.classList.contains('lk-reveal')) el.classList.add('lk-reveal--left'); });
  main.querySelectorAll('.lk-h2').forEach(function (h) { splitWords(h); });
  /* cascade dans les grilles : le rang parmi les frères décide du décalage */
  main.querySelectorAll('.lk-reveal').forEach(function (el) {
    const parent = el.parentElement; if (!parent) return;
    const siblings = Array.prototype.filter.call(parent.children, function (c) { return c.classList.contains('lk-reveal'); });
    if (siblings.length > 1) { const idx = siblings.indexOf(el); el.style.setProperty('--lk-delay', Math.min(idx * 60, 300) + 'ms'); el.dataset.lkStagger = '1'; }
  });
  if (io) window.LKMotion.observe(extra, { initial: true }); else extra.forEach(function (el) { el.classList.add('is-in', 'lk-settled'); });
  /* le calculateur : ses cartes sont créées par calculateurs.js ; elles apparaissent à leur première venue seulement.
     v7.54 : même observateur partagé ; une seule passe par trame quand le panneau change. */
  if (calc && io) {
    const panels = document.getElementById('calc-panels'), seen = {};
    if (panels) {
      const reveal = function () {
        panels.querySelectorAll('.calc-panel').forEach(function (panel) {
          const cards = panel.querySelectorAll(':scope>.calc-grid>.calc-card, :scope>.calc-card, :scope>div>.calc-card');
          const fresh = [];
          cards.forEach(function (card, i) {
            if (card.classList.contains('lk-reveal')) return;
            card.classList.add('lk-reveal', 'lk-reveal--zoom');
            if (seen[panel.id]) { card.style.setProperty('--lk-delay', '0ms'); card.classList.add('is-in', 'lk-settled'); return; }
            card.style.setProperty('--lk-delay', Math.min(i * 60, 300) + 'ms'); card.dataset.lkStagger = '1';
            fresh.push(card);
          });
          if (fresh.length) { seen[panel.id] = true; window.LKMotion.observe(fresh, { initial: false }); }
        });
      };
      let queued = false;
      new MutationObserver(function () { if (queued) return; queued = true; window.requestAnimationFrame(function () { queued = false; reveal(); }); }).observe(panels, { childList: true });
      reveal();
    }
  }
  /* --- 4. défilement : barre de lecture et parallaxe des bandeaux -------------------------------------------- */
  const bar = document.createElement('div'); bar.className = 'lk-progress'; bar.setAttribute('aria-hidden', 'true'); bar.innerHTML = '<i></i>'; document.body.appendChild(bar);
  const fill = bar.firstChild;
  const parallax = Array.prototype.slice.call(document.querySelectorAll('.calc-hero-image, .vhero-bg, .fhero-bg, .info-hero>img, .t-hero img, .lk-calc-hero-scene img'));
  parallax.forEach(function (el) { el.classList.add('lk-parallax'); });
  const coarse = window.matchMedia('(pointer:coarse)').matches;
  /* v7.39 : aucune lecture de géométrie pendant le défilement. Les positions des bandeaux sont mesurées au chargement
     et au redimensionnement, puis le défilement ne fait que de l'arithmétique sur scrollY. */
  let queued = false, geo = [], docMax = 1;
  const measure = function () {
    docMax = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    geo = parallax.map(function (el) { const r = (el.parentElement || el).getBoundingClientRect(); return { el: el, top: r.top + window.scrollY, h: r.height }; });
  };
  const frame = function () {
    queued = false;
    if (motion.matches) return;
    const p = Math.min(1, Math.max(0, window.scrollY / docMax));
    fill.style.transform = 'scaleX(' + p.toFixed(4) + ')';
    if (coarse) return;
    const vh = window.innerHeight, y = window.scrollY;
    geo.forEach(function (g) {
      const top = g.top - y;
      if (top + g.h < -80 || top > vh + 80) return;
      const shift = Math.round((top + g.h / 2 - vh / 2) * -0.14);
      g.el.style.transform = 'translate3d(0,' + shift + 'px,0) scale(1.12)';
    });
  };
  const onScroll = function () { if (queued) return; queued = true; window.requestAnimationFrame(frame); };
  const remeasure = function () { measure(); onScroll(); };
  window.addEventListener('scroll', onScroll, { passive: true }); window.addEventListener('resize', remeasure, { passive: true }); window.addEventListener('load', remeasure);
  setTimeout(remeasure, 1200); remeasure();
  /* v7.39 : les animations infinies (respiration des piles, halo) se mettent en pause hors écran */
  if (io) {
    const loops = Array.prototype.slice.call(document.querySelectorAll('.lk-stack, .lk-glow'));
    if (loops.length) { const lo = new IntersectionObserver(function (entries) { entries.forEach(function (en) { en.target.classList.toggle('lk-off', !en.isIntersecting); }); }, { rootMargin: '10% 0px 10% 0px' }); loops.forEach(function (el) { lo.observe(el); }); }
  }
  /* --- 6. lk-arrive : arrivée liée au défilement (cartes Achats, lignes des Médias) ------------------------------- */
  /* La colonne de chaque carte dans sa rangée décale la cascade (--lk-col). Sans timeline de défilement (Firefox, anciens
     Safari), un observateur pose is-in un peu avant l'entrée ; garde-fou : tout est visible au plus tard après 1,5 s. */
  const arrive = Array.prototype.slice.call(main.querySelectorAll('.lk-arrive'));
  if (arrive.length) {
    const columns = function () {
      const groups = new Map();
      arrive.forEach(function (el) { const p = el.parentElement; if (!groups.has(p)) groups.set(p, []); groups.get(p).push(el); });
      groups.forEach(function (list) {
        /* v7.54 : toutes les mesures d'abord, puis les écritures */
        const tops = list.map(function (el) { return Math.round(el.getBoundingClientRect().top); });
        let rowTop = null, col = 0;
        list.forEach(function (el, i) { const t = tops[i]; if (rowTop === null || Math.abs(t - rowTop) > 8) { rowTop = t; col = 0; } el.style.setProperty('--lk-col', Math.min(col, 3)); col++; });
      });
    };
    columns(); window.addEventListener('resize', columns); window.addEventListener('load', columns);
    const scrollTimeline = window.CSS && CSS.supports && CSS.supports('animation-timeline: view()');
    if (!scrollTimeline && io) {
      const ao = new IntersectionObserver(function (entries) { entries.forEach(function (en) { if (!en.isIntersecting) return; en.target.classList.add('is-in'); ao.unobserve(en.target); }); }, { threshold: 0.01, rootMargin: '0px 0px 4% 0px' });
      arrive.forEach(function (el) { ao.observe(el); });
      setTimeout(function () { arrive.forEach(function (el) { el.classList.add('is-in'); }); }, 1500);
      window.addEventListener('beforeprint', function () { arrive.forEach(function (el) { el.classList.add('is-in'); }); });
    } else if (!scrollTimeline) arrive.forEach(function (el) { el.classList.add('is-in'); });
  }
  /* --- 5. survol : reflet sur les boutons principaux ------------------------------------------------------------ */
  /* v7.39 : l'inclinaison 3D des cartes sous la souris (perspective + rotation) est retirée : elle rendait le texte flou
     et faisait bouger les cartes qu'on lit. Une carte signale le survol par un état « sélectionné » immobile (style.css). */
  const CTA = '.lk-cta, .calc-primary, .calc-button.primary, .lk-entry-button, .lk-home-discover, .info-primary, .t-button';
  document.querySelectorAll(CTA).forEach(function (el) { el.classList.add('lk-shine'); });
})();

/* v7.40 (lot 3) : sections éditoriales des hubs — mur de marques filtrable et sous-navigation collante.
   Sans JavaScript, tout est visible : le filtre et l'état actif sont un complément. */
(function () {
  /* --- mur de marques : recherche + filtre par lettre ------------------------------------------------------------- */
  document.querySelectorAll('[data-brandbar]').forEach(function (bar) {
    const wall = bar.parentNode.querySelector('[data-brands]'); if (!wall) return;
    const tiles = Array.from(wall.querySelectorAll('.ed-brand'));
    const q = bar.querySelector('[data-brand-q]'), letters = Array.from(bar.querySelectorAll('[data-letter]'));
    const count = bar.querySelector('[data-brand-count]'), empty = bar.parentNode.querySelector('[data-brand-empty]');
    const fold = function (s) { return String(s || '').replace(/ß/g,'ss').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim(); };
    let letter = '';
    function apply() {
      const needle = fold(q ? q.value : '');
      let shown = 0;
      tiles.forEach(function (t) {
        const ok = (!letter || t.dataset.letter === letter) && (!needle || t.dataset.n.indexOf(needle) !== -1);
        if (t.hidden === ok) t.hidden = !ok; if (ok) shown++;
      });
      if (count) count.textContent = (needle || letter) ? shown + ' su ' + tiles.length : '';
      if (empty) empty.hidden = shown > 0;
      letters.forEach(function (b) {
        b.classList.toggle('is-on', b.dataset.letter === letter);
        b.setAttribute('aria-pressed', b.dataset.letter === letter ? 'true' : 'false');
        if (b.dataset.letter) b.disabled = !!needle && !tiles.some(function (t) { return t.dataset.letter === b.dataset.letter && t.dataset.n.indexOf(needle) !== -1; });
      });
    }
    letters.forEach(function (b) { b.addEventListener('click', function () { letter = b.dataset.letter === letter ? '' : b.dataset.letter; apply(); }); });
    if (q) q.addEventListener('input', apply);
    apply();
  });

  /* --- sous-navigation collante : hauteur de l'en-tête, ombre quand elle colle, état actif qui suit le défilement --- */
  const header = document.querySelector('body > header');
  function head() { if (header) document.documentElement.style.setProperty('--lk-head-h', header.offsetHeight + 'px'); }
  head(); window.addEventListener('resize', head); window.addEventListener('load', head);
  const navs = Array.from(document.querySelectorAll('.ed-nav'));
  if (!navs.length) return;
  navs.forEach(function (nav) {
    const links = Array.from(nav.querySelectorAll('a[href^="#"]'));
    const targets = links.map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); });
    const sentinel = document.createElement('div'); sentinel.setAttribute('aria-hidden', 'true');
    nav.parentNode.insertBefore(sentinel, nav);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (e) { nav.classList.toggle('stuck', !e[0].isIntersecting && e[0].boundingClientRect.top < 0); }, { threshold: 1 }).observe(sentinel);
    }
    function setActive(i) {
      links.forEach(function (a, k) { const on = k === i; a.classList.toggle('is-active', on); if (on) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current'); });
      const a = links[i]; if (!a) return;
      const box = nav.querySelector('.ed-nav-in'); if (!box || box.scrollWidth <= box.clientWidth) return;
      const left = a.offsetLeft - (box.clientWidth - a.offsetWidth) / 2;
      box.scrollTo({ left: Math.max(0, left), behavior: 'auto' });
    }
    /* état actif par IntersectionObserver (aucune lecture de géométrie au défilement, règle du lot 2) : une ligne
       de lecture juste sous la barre ; la section qui la traverse est la section courante. Recalculé au redimensionnement. */
    let io = null, timer = 0;
    function arm() {
      if (io) io.disconnect();
      if (!('IntersectionObserver' in window)) return;
      const line = (parseFloat(getComputedStyle(nav).top) || 0) + nav.offsetHeight + 24;
      const below = Math.max(0, window.innerHeight - line - 1);
      io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) setActive(targets.indexOf(en.target)); });
      }, { rootMargin: -line + 'px 0px -' + below + 'px 0px', threshold: 0 });
      targets.forEach(function (t) { if (t) io.observe(t); });
    }
    window.addEventListener('resize', function () { clearTimeout(timer); timer = setTimeout(arm, 150); });
    /* v7.66 (latence) : première mesure de la barre à la trame suivante, hors de la tâche de chargement (une mise en page
       forcée de moins pendant l’exécution du script ; l’état actif arrive une trame plus tard, sans effet visible) */
    requestAnimationFrame(arm);
  });
})();
/* v7.60 (langues) : menu « Changer la langue » (barre tout en haut, posée par outils/sync-site.cjs) et bandeau de suggestion.
   Le choix n'est écrit (clé lk_lang_v1) qu'après un clic : une langue du menu, « Lire en … » ou « Non merci ». Jamais de
   redirection : le bandeau propose la même page dans la langue choisie (ou celle du navigateur) quand elle existe. */
(function(){'use strict';
 const bar=document.querySelector('[data-lk-langbar]');if(!bar)return;
 const KEY='lk_lang_v1',here=(document.documentElement.lang||'fr').slice(0,2).toLowerCase(),menu=bar.querySelector('details');
 const read=()=>{try{return localStorage.getItem(KEY);}catch(e){return null;}};
 const keep=v=>{try{localStorage.setItem(KEY,v);}catch(e){/* stockage indisponible : le lien fonctionne quand même */}};
 bar.addEventListener('click',e=>{const a=e.target.closest('a[data-lk-lang][href]');if(a)keep(a.dataset.lkLang);});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&menu&&menu.open){menu.open=false;const s=menu.querySelector('summary');if(s)s.focus();}});
 document.addEventListener('click',e=>{if(menu&&menu.open&&!menu.contains(e.target))menu.open=false;});
 const offers=[...bar.querySelectorAll('a[data-lk-equiv][href]')];if(!offers.length)return;
 const pref=read();let target=null;
 if(pref){if(pref!==here)target=offers.find(a=>a.dataset.lkLang===pref)||null;}
 else{const wanted=(navigator.languages&&navigator.languages.length?navigator.languages:[navigator.language||'']).map(l=>String(l).slice(0,2).toLowerCase()).find(l=>l===here||offers.some(a=>a.dataset.lkLang===l));if(wanted&&wanted!==here)target=offers.find(a=>a.dataset.lkLang===wanted)||null;}
 if(!target||!target.dataset.offre)return;
 const box=document.createElement('div');box.className='lk-lang-offer';box.lang=target.dataset.lkLang;box.setAttribute('role','region');box.setAttribute('aria-label',target.dataset.offre);
 const p=document.createElement('p');p.textContent=target.dataset.offre+' ';
 const go=document.createElement('a');go.href=target.getAttribute('href');go.hreflang=target.dataset.lkLang;go.setAttribute('data-lk-lang',target.dataset.lkLang);go.textContent=target.dataset.aller;go.addEventListener('click',()=>keep(target.dataset.lkLang));
 const no=document.createElement('button');no.type='button';no.textContent=target.dataset.rester||'×';no.addEventListener('click',()=>{keep(here);box.remove();});
 p.append(go);box.append(p,no);bar.insertAdjacentElement('afterend',box);
})();
