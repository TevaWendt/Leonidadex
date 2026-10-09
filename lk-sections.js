/* LEONIDAKIT — motion design et fiches plein écran des sections Gangs et factions, Missions, Activités annexes, Radios
   et musique (lk-sections.css). Amélioration progressive : sans ce script, tout est visible et chaque fiche s’ouvre dans
   la page (details). Ce script n’écrit aucun mot (les textes sont dans la page, déjà traduite ; seul le titre d’un morceau
   est recopié dans le lecteur), ne garde rien sur l’appareil et n’envoie aucune requête : le lecteur officiel (YouTube ou
   Spotify) ne se charge qu’après un clic sur « Écouter ici ». Mouvement coupé avec prefers-reduced-motion: reduce. */
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
  /* v7.75 : entrée « tableau des départs » des Lieux : le nom de chaque région bascule lettre par lettre, comme un volet
     d'affichage. Les lettres sont celles de la page (déjà traduite) : une copie décorative (aria-hidden) est animée, le nom
     reste lisible (sr-only), puis le titre redevient exactement le texte d'origine. */
  function flap(g) {
    if (!g.classList.contains('lkx-flap')) return;
    each(g.children, function (card, i) {
      var h = card.querySelector('h3'); if (!h || h.getAttribute('data-lkx-flap')) return;
      var text = h.textContent, d = i * 130 + 560, k = 0;
      h.setAttribute('data-lkx-flap', '1');
      var sr = document.createElement('span'); sr.className = 'sr-only'; sr.textContent = text;
      var vis = document.createElement('span'); vis.setAttribute('aria-hidden', 'true');
      text.split(/(\s+)/).forEach(function (part) {
        if (!part) return;
        if (/^\s+$/.test(part)) { vis.appendChild(document.createTextNode(part)); return; }
        var w = document.createElement('span'); w.className = 'lkx-flap-w';
        Array.prototype.forEach.call(part, function (ch) { var c = document.createElement('span'); c.className = 'lkx-flap-c'; c.textContent = ch; c.style.setProperty('--k', k++); w.appendChild(c); });
        vis.appendChild(w);
      });
      h.style.setProperty('--d', d + 'ms');
      h.replaceChildren(sr, vis);
      window.setTimeout(function () { h.textContent = text; h.style.removeProperty('--d'); }, d + k * 26 + 700);
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
        flap(e.target);
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

  /* ---------- 4. menus « Écouter » (popover : au-dessus de la page, jamais coupés par une carte) ---------- */
  var menus = document.querySelectorAll('.lkx-listen-menu[popover]');
  var hasPopover = typeof HTMLElement !== 'undefined' && Object.prototype.hasOwnProperty.call(HTMLElement.prototype, 'popover');
  var isOpen = function (m) { try { return m.matches(':popover-open'); } catch (e) { return false; } };
  function place(m) {
    m.style.left = ''; m.style.top = '';
    if (window.matchMedia && window.matchMedia('(max-width:560px)').matches) return;
    var b = document.querySelector('[popovertarget="' + m.id + '"]'); if (!b) return;
    var r = b.getBoundingClientRect(), w = m.offsetWidth, h = m.offsetHeight, vw = document.documentElement.clientWidth, vh = window.innerHeight;
    var left = Math.max(8, Math.min(r.right - w, vw - w - 8)), top = r.bottom + 8;
    if (top + h > vh - 8 && r.top - h - 8 >= 8) top = r.top - h - 8;
    m.style.left = Math.round(left) + 'px'; m.style.top = Math.round(Math.max(8, top)) + 'px';
  }
  if (menus.length && hasPopover) {
    each(menus, function (m) {
      m.addEventListener('beforetoggle', function (e) { if (e.newState === 'open') window.requestAnimationFrame(function () { place(m); }); });
      m.addEventListener('toggle', function (e) { if (e.newState === 'open') place(m); });
    });
    var reflow = function () { each(menus, function (m) { if (isOpen(m)) place(m); }); };
    window.addEventListener('scroll', reflow, { passive: true });
    window.addEventListener('resize', reflow);
  }

  /* ---------- 5. lecteur au clic : rien ne se charge avant « Écouter ici » (lecteur officiel YouTube ou Spotify) ---------- */
  var player = document.getElementById('lkx-player');
  if (player) {
    var box = player.querySelector('[data-lkx-player-f]'), label = player.querySelector('[data-lkx-player-t]');
    var stop = function () { if (box) box.replaceChildren(); player.hidden = true; };
    document.addEventListener('click', function (e) {
      var b = e.target.closest('[data-lkx-play]');
      if (b && box) {
        var src = b.getAttribute('data-lkx-src') || '';
        if (!/^https:\/\/(www\.youtube-nocookie\.com|open\.spotify\.com)\/embed\//.test(src)) return;
        var f = document.createElement('iframe');
        f.src = src;
        f.title = b.getAttribute('data-lkx-title') || '';
        f.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture; fullscreen');
        f.setAttribute('allowfullscreen', '');
        f.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
        box.replaceChildren(f);
        if (label) label.textContent = f.title;
        player.classList.remove('lkx-player--yt', 'lkx-player--sp');
        player.classList.add('lkx-player--' + (b.getAttribute('data-lkx-play') === 'sp' ? 'sp' : 'yt'));
        player.hidden = false;
        var menu = b.closest('[popover]'); if (menu && menu.hidePopover) { try { menu.hidePopover(); } catch (x) { /* rien */ } }
        var x = player.querySelector('[data-lkx-player-close]'); if (x) x.focus({ preventScroll: true });
        return;
      }
      if (e.target.closest('[data-lkx-player-close]')) stop();
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !player.hidden && player.contains(document.activeElement)) stop(); });
  }
})();
