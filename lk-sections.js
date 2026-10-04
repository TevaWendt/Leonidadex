/* LEONIDAKIT — motion design et fiches plein écran des sections Gangs et factions, Missions, Activités annexes, Radios
   et musique (lk-sections.css). Amélioration progressive : sans ce script, tout est visible et chaque fiche s’ouvre dans
   la page (details). Ce script n’écrit aucun mot (les textes sont dans la page, déjà traduite), ne garde rien sur
   l’appareil et n’envoie aucune requête. Mouvement coupé avec prefers-reduced-motion: reduce. */
(function () {
  'use strict';
  var mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  var reduced = !!mq.matches;
  var fine = window.matchMedia ? window.matchMedia('(hover: hover) and (pointer: fine)').matches : false;
  var root = document.documentElement;
  var each = function (list, fn) { Array.prototype.forEach.call(list, fn); };

  /* ---------- 1. entrées des groupes [data-lkx-in] ---------- */
  var groups = document.querySelectorAll('[data-lkx-in]');
  each(groups, function (g) { each(g.children, function (c, i) { c.style.setProperty('--i', i); }); });
  function deal(g) {
    if (!g.classList.contains('lkx-deal')) return;
    var r = g.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + Math.min(r.height, window.innerHeight) / 2;
    each(g.children, function (c, i) {
      var b = c.getBoundingClientRect();
      c.style.setProperty('--dx', Math.round(cx - (b.left + b.width / 2)) + 'px');
      c.style.setProperty('--dy', Math.round(cy - (b.top + b.height / 2) + 40) + 'px');
      c.style.setProperty('--rz', ((i % 2 ? 1 : -1) * (5 + (i % 3) * 4)) + 'deg');
    });
  }
  var rows = document.querySelectorAll('.lkx-page .ed-tl-item--media');
  if (reduced || !('IntersectionObserver' in window)) {
    each(groups, function (g) { g.classList.add('is-in'); });
    each(rows, function (r) { r.classList.add('is-in'); });
  } else {
    root.classList.add('lkx-js');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        deal(e.target);
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.06 });
    each(groups, function (g) { io.observe(g); });
    each(rows, function (r) { io.observe(r); });
  }

  /* ---------- 2. inclinaison et reflet au survol (pointeur fin) ---------- */
  if (fine && !reduced) {
    each(document.querySelectorAll('.lkx-tilt'), function (el) {
      if (!el.querySelector('.lkx-sheen')) { var s = document.createElement('span'); s.className = 'lkx-sheen'; s.setAttribute('aria-hidden', 'true'); el.appendChild(s); }
      var raf = 0, px = 0, py = 0;
      el.addEventListener('pointermove', function (e) {
        var b = el.getBoundingClientRect(); px = (e.clientX - b.left) / b.width; py = (e.clientY - b.top) / b.height;
        if (raf) return;
        raf = window.requestAnimationFrame(function () {
          raf = 0;
          el.style.setProperty('--ry', ((px - 0.5) * 10).toFixed(2) + 'deg');
          el.style.setProperty('--rx', ((0.5 - py) * 8).toFixed(2) + 'deg');
          el.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
          el.style.setProperty('--my', (py * 100).toFixed(1) + '%');
          el.classList.add('lkx-tilting');
        });
      });
      el.addEventListener('pointerleave', function () { if (raf) { window.cancelAnimationFrame(raf); raf = 0; } el.classList.remove('lkx-tilting'); el.style.removeProperty('--rx'); el.style.removeProperty('--ry'); });
    });
  }

  /* ---------- 3. fiches plein écran : details.lkx-det → <dialog class="lkx-sheet"> de la page ---------- */
  var dlg = document.getElementById('lkx-sheet');
  var canSheet = dlg && typeof dlg.showModal === 'function';
  var last = null, openDet = null;
  function closeSheet() {
    if (!canSheet || !dlg.open) return;
    dlg.close();
    dlg.classList.remove('lkx-sheet-open');
    var body = dlg.querySelector('[data-lkx-body]'); if (body) body.replaceChildren();
    if (openDet && openDet.id && window.history && window.history.replaceState && location.hash === '#' + openDet.id) window.history.replaceState(null, '', location.pathname + location.search);
    openDet = null;
    if (last && last.isConnected) { try { last.focus({ preventScroll: true }); } catch (e) { /* rien */ } }
  }
  function openSheet(det, trigger) {
    var src = det.querySelector('.lkx-sheet-src'); if (!src) return false;
    var body = dlg.querySelector('[data-lkx-body]'); if (!body) return false;
    if (dlg.open) dlg.close();
    body.replaceChildren();
    var c = src.cloneNode(true);
    c.hidden = false; c.removeAttribute('id');
    each(c.querySelectorAll('[id]'), function (n) { n.removeAttribute('id'); });
    var t = c.querySelector('.lkx-sheet-t'); if (t) t.id = 'lkx-sheet-title';
    each(c.querySelectorAll('.lkx-sheet-main>*'), function (n, i) { n.style.setProperty('--i', Math.min(i, 10)); });
    each(c.querySelectorAll('img[loading="lazy"]'), function (im) { im.loading = 'eager'; });
    body.appendChild(c);
    last = trigger || det.querySelector('summary'); openDet = det;
    try { dlg.showModal(); } catch (e) { body.replaceChildren(); return false; }
    dlg.classList.remove('lkx-sheet-open'); void dlg.offsetWidth;
    if (!reduced) dlg.classList.add('lkx-sheet-open');
    var inner = dlg.querySelector('.lkx-sheet-in'); if (inner) inner.scrollTop = 0;
    var x = dlg.querySelector('[data-lkx-close]'); if (x) x.focus({ preventScroll: true });
    if (det.id && window.history && window.history.replaceState) window.history.replaceState(null, '', '#' + det.id);
    return true;
  }
  if (canSheet) {
    dlg.addEventListener('click', function (e) {
      if (e.target === dlg || e.target.closest('[data-lkx-close]')) { e.preventDefault(); closeSheet(); return; }
      var a = e.target.closest('a[href]');
      if (!a) return;
      var h = a.getAttribute('href');
      if (h.charAt(0) === '#') {
        var target = document.getElementById(decodeURIComponent(h.slice(1)));
        if (target && target.matches('details.lkx-det')) { e.preventDefault(); openSheet(target, last); return; }
        closeSheet();
      }
    });
    dlg.addEventListener('cancel', function (e) { e.preventDefault(); closeSheet(); });
    document.addEventListener('click', function (e) {
      if (dlg.contains(e.target)) return;
      var s = e.target.closest('details.lkx-det>summary');
      if (s) { if (!s.parentNode.open && openSheet(s.parentNode, s)) e.preventDefault(); return; }
      var a = e.target.closest('a[href^="#"]');
      if (a) { var d = document.getElementById(decodeURIComponent(a.getAttribute('href').slice(1))); if (d && d.matches('details.lkx-det') && openSheet(d, a)) e.preventDefault(); }
    });
    var fromHash = function () { var h = decodeURIComponent((location.hash || '').slice(1)); var d = h && document.getElementById(h); if (d && d.matches('details.lkx-det')) openSheet(d, d.querySelector('summary')); };
    if (location.hash) window.setTimeout(fromHash, 60);
    window.addEventListener('hashchange', function () { if (!dlg.open) fromHash(); });
  }

  /* ---------- 4. menus « Écouter » (details.lkx-listen) : un seul ouvert, fermé par un clic ailleurs ou Échap ---------- */
  var listens = document.querySelectorAll('details.lkx-listen');
  if (listens.length) {
    each(listens, function (d) { d.addEventListener('toggle', function () { if (d.open) each(listens, function (o) { if (o !== d) o.open = false; }); }); });
    document.addEventListener('click', function (e) { each(listens, function (d) { if (d.open && !d.contains(e.target)) d.open = false; }); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') each(listens, function (d) { if (d.open) { d.open = false; var s = d.querySelector('summary'); if (s) s.focus(); } }); });
  }
})();
