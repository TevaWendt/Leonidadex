/* LEONIDAKIT — vitrine.js (v7.92) : comportements des briques communes des pages enrichies (vitrine.css, outils/vitrine.cjs).
   Amélioration progressive : sans ce script, tout est visible et chaque lien mène où il doit. Aucun mot n’est écrit ici
   (les textes sont dans la page, déjà traduite ; le compte à rebours est formulé par le navigateur dans la langue de la
   page, Intl.RelativeTimeFormat), rien n’est gardé sur l’appareil, aucune requête n’est envoyée.
   - [data-vt-cd="AAAA-MM-JJ"] : « dans 28 jours », « demain »… jusqu’à minuit, heure locale du visiteur ; vide ensuite.
   - [data-vt-strip] : flèches de la bande de photogrammes (montrées seulement si la bande déborde).
   - [data-vt-leo] : ouvre Léo et lui pose la question écrite sur le bouton.
   - [data-vt-copy] : copie le texte de [data-vt-copy-src] voisin ; le libellé « Copié » est dans la page.
   - [data-vt-filters] : filtre les éléments [data-vt-item] selon leur type (data-vt-t), avec l’entrée du moteur commun.
   - v7.92.1 : [data-vt-tilt="7"] : un visuel qu’on regarde (boîte, carte de presse, coffret) s’incline vers le pointeur,
     de 7 degrés au plus, avec un reflet ; souris seulement, jamais en « réduire les animations » ni sur une carte qu’on lit.
   - v7.92.1 : [data-vt-pick] : un petit choix (boutons radio) affiche la réponse [data-vt-answer] qui lui correspond.
   - v7.92.1 : [data-vt-sum] : additionne les montants (data-vt-cents, en centimes) des cases cochées dans [data-vt-total],
     au format monétaire de la langue de la page (Intl.NumberFormat, euros sauf data-vt-currency).
   - v7.94 : [data-vt-check] : liste à cocher gardée sur l’appareil (localStorage, clé lk_check_<nom>), rien d’envoyé ;
     [data-vt-dl] : temps de téléchargement d’après une taille et un débit tapés par le visiteur. */
(function () {
  'use strict';
  var doc = document, each = function (l, f) { Array.prototype.forEach.call(l, f); };
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var lang = (doc.documentElement.lang || 'fr').slice(0, 5);

  /* ---------- 1. comptes à rebours en jours ---------- */
  var cds = doc.querySelectorAll('[data-vt-cd]');
  if (cds.length) {
    var rtf = null;
    try { rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' }); } catch (e) { rtf = null; }
    var tick = function () {
      var now = new Date();
      each(cds, function (el) {
        var m = /^(\d{4})-(\d\d)-(\d\d)$/.exec(el.getAttribute('data-vt-cd') || ''); if (!m || !rtf) { el.textContent = ''; return; }
        var target = new Date(+m[1], +m[2] - 1, +m[3], 0, 0, 0);
        var diff = target - now;
        if (diff <= 0) { el.textContent = ''; return; }
        var days = Math.ceil(diff / 86400000);
        var txt = days <= 1 && diff < 36e5 * 24 ? rtf.format(Math.max(1, Math.ceil(diff / 36e5)), 'hour') : rtf.format(days, 'day');
        if (el.textContent !== txt) el.textContent = txt;
      });
    };
    tick();
    window.setInterval(tick, 60000);
    doc.addEventListener('visibilitychange', function () { if (!doc.hidden) tick(); });
  }

  /* ---------- 2. bandes de photogrammes ---------- */
  each(doc.querySelectorAll('[data-vt-strip]'), function (box) {
    var list = box.querySelector('.vt-strip-l'), nav = box.querySelector('.vt-strip-nav'); if (!list || !nav) return;
    var prev = nav.querySelector('[data-vt-prev]'), next = nav.querySelector('[data-vt-next]');
    var queued = false;
    var update = function () {
      queued = false;
      var max = list.scrollWidth - list.clientWidth;
      var over = max > 4;
      if (nav.hidden === over) nav.hidden = !over;
      if (prev) prev.disabled = list.scrollLeft <= 4;
      if (next) next.disabled = list.scrollLeft >= max - 4;
    };
    var schedule = function () { if (!queued) { queued = true; window.requestAnimationFrame(update); } };
    var go = function (dir) { list.scrollBy({ left: dir * Math.max(240, list.clientWidth * 0.86), behavior: reduce ? 'auto' : 'smooth' }); };
    if (prev) prev.addEventListener('click', function () { go(-1); });
    if (next) next.addEventListener('click', function () { go(1); });
    list.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    window.addEventListener('load', schedule, { once: true });
    update();
  });

  /* ---------- 3. questions à Léo ---------- */
  doc.addEventListener('click', function (e) {
    var b = e.target && e.target.closest ? e.target.closest('[data-vt-leo]') : null; if (!b) return;
    var q = (b.textContent || '').replace(/\s+/g, ' ').trim(); if (!q) return;
    e.preventDefault();
    var ask = function () { if (window.LKLeoUI) { if (!window.LKLeoUI.isOpen()) window.LKLeoUI.open(); window.LKLeoUI.ask(q); return true; } return false; };
    if (ask()) return;
    if (window.LKLeoLoader && typeof window.LKLeoLoader.open === 'function') window.LKLeoLoader.open();
    var t0 = Date.now();
    var wait = window.setInterval(function () { if (ask() || Date.now() - t0 > 10000) window.clearInterval(wait); }, 120);
  });

  /* ---------- 4. copier ---------- */
  each(doc.querySelectorAll('[data-vt-copy]'), function (b) { b.hidden = false; });
  doc.addEventListener('click', function (e) {
    var b = e.target && e.target.closest ? e.target.closest('[data-vt-copy]') : null; if (!b) return;
    var box = b.closest('[data-vt-copy-box]'), src = box && box.querySelector('[data-vt-copy-src]'); if (!src) return;
    var text = (src.innerText || src.textContent || '').replace(/[ \t]+\n/g, '\n').trim();
    var done = function () { b.classList.add('is-done'); window.setTimeout(function () { b.classList.remove('is-done'); }, 2200); };
    var fallback = function () {
      var t = doc.createElement('textarea'); t.value = text; t.setAttribute('readonly', ''); t.style.position = 'fixed'; t.style.opacity = '0'; doc.body.appendChild(t); t.select();
      try { doc.execCommand('copy'); done(); } catch (x) { /* rien */ }
      t.remove(); b.focus({ preventScroll: true });
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback); else fallback();
  });

  /* ---------- 5. filtres ---------- */
  each(doc.querySelectorAll('[data-vt-filters]'), function (bar) {
    var scope = doc.getElementById(bar.getAttribute('data-vt-filters')); if (!scope) return;
    var items = scope.querySelectorAll('[data-vt-item]'), groups = scope.querySelectorAll('[data-vt-group]');
    var buttons = bar.querySelectorAll('[data-vt-f]');
    bar.hidden = false;
    var apply = function (f) {
      var shown = [];
      each(buttons, function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-vt-f') === f ? 'true' : 'false'); });
      each(items, function (it) {
        var on = !f || (' ' + (it.getAttribute('data-vt-t') || '') + ' ').indexOf(' ' + f + ' ') >= 0;
        if (it.hidden === on) it.hidden = !on;
        if (on) shown.push(it);
      });
      each(groups, function (g) { var any = g.querySelector('[data-vt-item]:not([hidden])'); g.hidden = !any; });
      /* repères (années de la frise) : visibles seulement si un élément visible les suit avant le repère suivant */
      each(scope.querySelectorAll('[data-vt-sep]'), function (sep) {
        var n = sep.nextElementSibling, any = false;
        while (n && !n.hasAttribute('data-vt-sep')) { if (n.hasAttribute('data-vt-item') && !n.hidden) { any = true; break; } n = n.nextElementSibling; }
        sep.hidden = !any;
      });
      if (window.LKMotion && shown.length) window.LKMotion.enter(shown, { stagger: 40, cap: 280 });
    };
    each(buttons, function (b) { b.addEventListener('click', function () { apply(b.getAttribute('data-vt-f')); }); });
  });

  /* ---------- 6. inclinaison au pointeur ---------- */
  if (!reduce && window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    each(doc.querySelectorAll('[data-vt-tilt]'), function (el) {
      var max = Math.min(12, +(el.getAttribute('data-vt-tilt') || 7) || 7), raf = 0, ev = null, box = null;
      var glare = doc.createElement('span'); glare.className = 'vt-tilt-glare'; glare.setAttribute('aria-hidden', 'true'); el.appendChild(glare);
      var paint = function () {
        raf = 0; if (!ev || !box) return;
        var x = Math.min(1, Math.max(0, (ev.clientX - box.left) / box.width)), y = Math.min(1, Math.max(0, (ev.clientY - box.top) / box.height));
        el.style.setProperty('--ry', ((x - 0.5) * 2 * max).toFixed(2) + 'deg');
        el.style.setProperty('--rx', ((0.5 - y) * 2 * max).toFixed(2) + 'deg');
        el.style.setProperty('--gx', (x * 100).toFixed(1) + '%');
        el.style.setProperty('--gy', (y * 100).toFixed(1) + '%');
      };
      var reset = function () { ev = null; box = null; el.classList.remove('is-tilting'); el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); };
      el.addEventListener('pointerenter', function () { box = el.getBoundingClientRect(); });
      el.addEventListener('pointermove', function (e) { if (e.pointerType && e.pointerType !== 'mouse') return; if (!box) box = el.getBoundingClientRect(); ev = e; el.classList.add('is-tilting'); if (!raf) raf = window.requestAnimationFrame(paint); });
      el.addEventListener('pointerleave', reset);
      window.addEventListener('scroll', function () { if (ev) box = null; }, { passive: true });
    });
  }

  /* ---------- 7. petit choix : la réponse suit le bouton coché ---------- */
  each(doc.querySelectorAll('[data-vt-pick]'), function (form) {
    var scope = form.closest('[data-vt-pick-scope]') || form.parentNode;
    var answers = scope.querySelectorAll('[data-vt-answer]');
    var show = function (anim) {
      var keys = [];
      each(form.querySelectorAll('input[type="radio"]:checked'), function (r) { keys.push(r.value); });
      var key = keys.join('-');
      each(answers, function (a) {
        var on = a.getAttribute('data-vt-answer') === key;
        if (a.hidden === on) a.hidden = !on;
        if (on && anim && !reduce && typeof a.animate === 'function') a.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 360, easing: 'cubic-bezier(.16,1,.3,1)' });
      });
    };
    form.addEventListener('change', function () { show(true); });
    form.hidden = false;
    show(false);
  });

  /* ---------- 8. total à cocher ---------- */
  each(doc.querySelectorAll('[data-vt-sum]'), function (form) {
    var out = form.querySelector('[data-vt-total]'); if (!out) return;
    var fmt = null;
    try { fmt = new Intl.NumberFormat(doc.documentElement.lang || 'fr', { style: 'currency', currency: form.getAttribute('data-vt-currency') || 'EUR' }); } catch (e) { fmt = null; }
    var sum = function (anim) {
      var c = 0;
      each(form.querySelectorAll('input:checked'), function (i) { c += parseInt(i.getAttribute('data-vt-cents'), 10) || 0; });
      var t = fmt ? fmt.format(c / 100) : (c / 100).toFixed(2);
      if (out.textContent === t) return;
      out.textContent = t;
      if (anim && !reduce && typeof out.animate === 'function') out.animate([{ transform: 'scale(1.08)' }, { transform: 'none' }], { duration: 320, easing: 'cubic-bezier(.34,1.56,.64,1)' });
    };
    form.addEventListener('change', function () { sum(true); });
    form.hidden = false;
    sum(false);
  });

  /* v7.94 : liste à cocher gardée sur l’appareil (localStorage, clé lk_check_<nom>) ; rien n’est envoyé */
  each(doc.querySelectorAll('[data-vt-check]'), function (list) {
    var key = 'lk_check_' + list.getAttribute('data-vt-check'), boxes = list.querySelectorAll('input[type="checkbox"]'), done = list.parentNode.querySelector('[data-vt-check-done]');
    var read = function () { try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch (e) { return []; } };
    var save = function (v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) { /* stockage indisponible : la liste marche quand même */ } };
    var sync = function () { var all = boxes.length > 0; each(boxes, function (b) { if (!b.checked) all = false; }); if (done) done.hidden = !all; };
    var saved = read(); each(boxes, function (b) { b.checked = saved.indexOf(b.value) >= 0; });
    /* v8.04 : la jauge à cases suit le nombre de gestes cochés (une case par geste) */
    var meter = list.parentNode.querySelector('[data-vt-check-meter="' + list.getAttribute('data-vt-check') + '"]'), cells = meter ? meter.querySelectorAll('i') : [];
    var fill = function () { var n = 0; each(boxes, function (b) { if (b.checked) n++; }); each(cells, function (c, i) { var on = i < n; if (c.classList.contains('is-on') !== on) c.classList.toggle('is-on', on); }); if (meter) meter.classList.toggle('is-full', n > 0 && n === boxes.length); };
    list.addEventListener('change', function () { var v = []; each(boxes, function (b) { if (b.checked) v.push(b.value); }); save(v); sync(); fill(); });
    sync(); fill();
  });

  /* v7.94 : temps de téléchargement : taille (Go, 1 Go = 8 000 Mbit) et débit (Mbit/s) → durée, écrite dans la langue de la page */
  each(doc.querySelectorAll('[data-vt-dl]'), function (form) {
    var sizeIn = form.querySelector('[data-vt-dl-size-in]'), speedIn = form.querySelector('[data-vt-dl-speed-in]'), out = form.querySelector('[data-vt-dl-out]'), empty = out ? out.textContent : '';
    var fmtUnits = (function () { try { return { h: new Intl.NumberFormat(lang, { style: 'unit', unit: 'hour', unitDisplay: 'narrow' }), min: new Intl.NumberFormat(lang, { style: 'unit', unit: 'minute', unitDisplay: 'narrow' }) }; } catch (e) { return null; } })();
    var say = function (sec) {
      var h = Math.floor(sec / 3600), m = Math.round((sec % 3600) / 60); if (m === 60) { h++; m = 0; }
      if (fmtUnits) return ((h ? fmtUnits.h.format(h) + ' ' : '') + (m || !h ? fmtUnits.min.format(m) : '')).trim();
      return ((h ? h + ' h ' : '') + (m || !h ? m + ' min' : '')).trim();
    };
    /* v8.04 : la barre se remplit à chaque nouveau résultat, en un temps qui grandit avec la durée réelle (0,35 s à 2,4 s) ; le
       tableau des débits courants donne le temps de chacun pour la même taille (la plus longue barre pour le plus lent) */
    var bar = form.querySelector('[data-vt-dl-bar]'), cmp = form.querySelector('[data-vt-dl-cmp]'), rows = cmp ? cmp.querySelectorAll('li[data-n]') : [], last = '';
    var paint = function (sec) {
      if (!bar) return;
      if (!(sec > 0)) { bar.style.setProperty('--f', '0'); return; }
      bar.style.setProperty('--f', '1');
      if (reduce || typeof bar.animate !== 'function') return;
      var d = Math.round(Math.min(2400, Math.max(350, 350 + 520 * Math.log10(1 + sec / 600))));
      bar.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: d, easing: 'cubic-bezier(.16,1,.3,1)' });
    };
    var table = function (size, speed) {
      if (!cmp) return;
      if (!(size > 0)) { cmp.hidden = true; return; }
      var times = [], max = 0;
      each(rows, function (r) { var t = size * 8000 / (+r.getAttribute('data-n')); times.push(t); if (t > max) max = t; });
      each(rows, function (r, i) {
        var b = r.querySelector('[data-vt-dl-cmp-out]'), w = r.querySelector('.vt-dl-cmp-bar i'), txt = '≈ ' + say(times[i]);
        if (b && b.textContent !== txt) b.textContent = txt;
        if (w) w.style.setProperty('--w', (times[i] / max).toFixed(4));
        r.classList.toggle('is-me', +r.getAttribute('data-n') === speed);
      });
      cmp.hidden = false;
    };
    var calc = function () {
      var size = parseFloat(sizeIn && sizeIn.value), speed = parseFloat(speedIn && speedIn.value);
      table(size, speed);
      if (!(size > 0) || !(speed > 0)) { out.textContent = empty; last = ''; paint(0); return; }
      var sec = size * 8000 / speed, txt = '≈ ' + say(sec);
      out.textContent = txt;
      if (txt !== last) { last = txt; paint(sec); }
    };
    form.addEventListener('input', calc);
    form.addEventListener('submit', function (e) { e.preventDefault(); calc(); });
    each(form.querySelectorAll('[data-vt-dl-try]'), function (b) { b.addEventListener('click', function () { if (sizeIn) { sizeIn.value = b.getAttribute('data-vt-dl-try'); calc(); } }); });
    each(form.querySelectorAll('[data-vt-dl-preset]'), function (b) {
      b.addEventListener('click', function () { speedIn.value = b.getAttribute('data-vt-dl-preset'); each(form.querySelectorAll('[data-vt-dl-preset]'), function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); }); calc(); });
      if (speedIn && b.getAttribute('data-vt-dl-preset') === speedIn.value) b.setAttribute('aria-pressed', 'true');
    });
    calc();
  });

  /* ---------- v8.04 refonte C (Préchargement, GTA VI sur PC, GTA VI et GTA V) ---------- */
  /* frise à stations : la station dont la date est passée (heure locale du visiteur) se coche, celle du jour se signale */
  var today = (function () { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); })();
  each(doc.querySelectorAll('.vt-rail-s[data-vt-day]'), function (s) {
    var day = s.getAttribute('data-vt-day');
    if (!/^\d{4}-\d\d-\d\d$/.test(day)) return;
    if (day < today) s.classList.add('is-past'); else if (day === today) s.classList.add('is-today');
  });
  /* superposition (GTA VI et GTA V) : le curseur fait glisser le carré GTA V sur le carré GTA VI (0 : côte à côte, 100 : posé
     dessus) ; sans script, les deux carrés restent côte à côte et le curseur reste caché */
  each(doc.querySelectorAll('[data-rc-ov]'), function (box) {
    var stage = box.querySelector('.rc-ov-stage'), input = box.querySelector('[data-rc-ov-in]'), ctl = input && input.closest('label');
    if (!stage || !input) return;
    var set = function () { var t = Math.max(0, Math.min(100, +input.value || 0)) / 100; stage.style.setProperty('--t', t.toFixed(3)); stage.classList.toggle('is-over', t >= 0.95); };
    input.addEventListener('input', set);
    if (ctl) ctl.hidden = false;
    set();
  });
})();

/* ---------- v8.04 refonte B : Ce qui est confirmé (verification.html) ----------
   - [data-vfx-open="id"] (tableau de bord) : ouvre, dans le <dialog> [data-vfx-sheet], une copie de la carte #id (sans ses
     identifiants) ; « Fermer », Échap ou un clic hors de la fiche la ferment et le focus revient au point cliqué ; « Point
     précédent », « Point suivant » (et les flèches du clavier) parcourent les points du même groupe ([data-vfx-group]) ;
     « Voir dans la page » ferme la fiche et descend jusqu’à la carte, qui se signale. Sans <dialog> ou sans script : le lien
     mène à la carte (#id), qui se signale aussi (:target, informations.css).
   - [data-vfx-cards] : la grille des points confirmés sait quel sujet est filtré (data-vfx-f), pour passer d’une grille avec un
     point en grand à des rangées centrées. Rien n’est envoyé ni gardé. */
(function () {
  'use strict';
  var doc = document, each = function (l, f) { Array.prototype.forEach.call(l, f); };
  each(doc.querySelectorAll('[data-vt-filters]'), function (bar) {
    var scope = doc.getElementById(bar.getAttribute('data-vt-filters'));
    if (!scope || !scope.hasAttribute('data-vfx-cards')) return;
    bar.addEventListener('click', function (e) {
      var b = e.target && e.target.closest ? e.target.closest('[data-vt-f]') : null;
      if (b) scope.setAttribute('data-vfx-f', b.getAttribute('data-vt-f') || '');
    });
  });
  var dlg = doc.querySelector('[data-vfx-sheet]');
  if (!dlg || typeof dlg.showModal !== 'function') return;
  var body = dlg.querySelector('[data-vfx-body]'), go = dlg.querySelector('[data-vfx-go]'), opener = null, list = [], at = -1;
  each(doc.querySelectorAll('[data-vfx-open]'), function (a) { a.setAttribute('aria-haspopup', 'dialog'); });
  var cardOf = function (i) { var a = list[i], id = a && a.getAttribute('data-vfx-open'); return id ? doc.getElementById(id) : null; };
  function fill(i) {
    var card = cardOf(i); if (!card) return false;
    var copy = card.cloneNode(true);
    copy.removeAttribute('id'); copy.removeAttribute('hidden'); copy.removeAttribute('style');
    each(copy.querySelectorAll('[id]'), function (n) { n.removeAttribute('id'); });
    each(copy.querySelectorAll('img[loading]'), function (n) { n.removeAttribute('loading'); });
    copy.classList.add('vfx-in-sheet');
    body.textContent = ''; body.appendChild(copy); body.scrollTop = 0;
    var h = copy.querySelector('h3'); dlg.setAttribute('aria-label', h ? h.textContent : '');
    if (go) go.setAttribute('href', '#' + card.id);
    at = i;
    each(dlg.querySelectorAll('[data-vfx-step]'), function (b) { var j = at + (+b.getAttribute('data-vfx-step')); b.disabled = j < 0 || j >= list.length; });
    return true;
  }
  doc.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('[data-vfx-open]') : null;
    if (!a || e.defaultPrevented || e.button > 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var group = a.closest('[data-vfx-group]');
    list = group ? Array.prototype.slice.call(group.querySelectorAll('[data-vfx-open]')) : [a];
    if (!fill(list.indexOf(a))) return;
    e.preventDefault(); opener = a; dlg.showModal();
    var x = dlg.querySelector('[data-vfx-close]'); if (x) x.focus();
  });
  dlg.addEventListener('click', function (e) {
    if (e.target === dlg) { dlg.close(); return; } /* clic sur le fond, hors de la fiche */
    var t = e.target && e.target.closest ? e.target : null; if (!t) return;
    var step = t.closest('[data-vfx-step]'); if (step) { fill(at + (+step.getAttribute('data-vfx-step'))); return; }
    if (t.closest('[data-vfx-close]')) { dlg.close(); return; }
    if (t.closest('[data-vfx-go]')) {
      var card = cardOf(at); if (!card) return;
      e.preventDefault(); opener = null; dlg.close();
      if (location.hash === '#' + card.id) card.scrollIntoView({ block: 'center' }); else location.hash = card.id;
      card.classList.remove('vfx-flash'); void card.offsetWidth; card.classList.add('vfx-flash');
      card.setAttribute('tabindex', '-1'); card.focus({ preventScroll: true });
    }
  });
  dlg.addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    var j = at + (e.key === 'ArrowRight' ? 1 : -1);
    if (j >= 0 && j < list.length) { e.preventDefault(); fill(j); }
  });
  dlg.addEventListener('close', function () { body.textContent = ''; if (opener && opener.focus) opener.focus({ preventScroll: true }); opener = null; });
})();
