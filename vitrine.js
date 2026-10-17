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
     au format monétaire de la langue de la page (Intl.NumberFormat, euros sauf data-vt-currency). */
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
})();
