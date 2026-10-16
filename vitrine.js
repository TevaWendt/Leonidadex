/* LEONIDAKIT — vitrine.js (v7.92) : comportements des briques communes des pages enrichies (vitrine.css, outils/vitrine.cjs).
   Amélioration progressive : sans ce script, tout est visible et chaque lien mène où il doit. Aucun mot n’est écrit ici
   (les textes sont dans la page, déjà traduite ; le compte à rebours est formulé par le navigateur dans la langue de la
   page, Intl.RelativeTimeFormat), rien n’est gardé sur l’appareil, aucune requête n’est envoyée.
   - [data-vt-cd="AAAA-MM-JJ"] : « dans 28 jours », « demain »… jusqu’à minuit, heure locale du visiteur ; vide ensuite.
   - [data-vt-strip] : flèches de la bande de photogrammes (montrées seulement si la bande déborde).
   - [data-vt-leo] : ouvre Léo et lui pose la question écrite sur le bouton.
   - [data-vt-copy] : copie le texte de [data-vt-copy-src] voisin ; le libellé « Copié » est dans la page.
   - [data-vt-filters] : filtre les éléments [data-vt-item] selon leur type (data-vt-t), avec l’entrée du moteur commun. */
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
})();
