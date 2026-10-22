/* Généré depuis outils/sources/actus.js : modifie la source, pas ce fichier. */
(function () {
  'use strict';
  var norm = function (t) { return String(t || '').toLowerCase().replace(/[’‘]/g, '\'').replace(/^(the|an?)\s+/, '').replace(/\s+/g, ' ').trim(); };
  Array.prototype.forEach.call(document.querySelectorAll('.ac-ue-i'), function (li) {
    var a = li.querySelector('.ac-ue-fr'), b = li.querySelector('.ac-ue-en');
    if (a && b && norm(a.textContent) === norm(b.textContent)) b.hidden = true;
  });
  Array.prototype.forEach.call(document.querySelectorAll('#ultimate .vt-card'), function (c) {
    var a = c.querySelector('.vt-card-t'), b = c.querySelector('.vt-card-d');
    if (a && b && norm(a.textContent) === norm(b.textContent)) b.hidden = true;
  });
  var screen = document.querySelector('[data-ac-screen]');
  if (!screen) return;
  var OK = /^https:\/\/www\.youtube-nocookie\.com\/embed\/[A-Za-z0-9_-]{11}\?[a-z0-9=&]+$/;
  if (!OK.test(screen.getAttribute('data-src') || '')) return;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var poster = Array.prototype.slice.call(screen.childNodes).map(function (n) { return n.cloneNode(true); });
  function load(t) {
    var base = screen.getAttribute('data-src') || ''; if (!OK.test(base)) return null;
    var src = base + (t > 0 ? '&start=' + Math.floor(t) : '');
    var f = screen.querySelector('iframe');
    if (!f) {
      f = document.createElement('iframe');
      f.className = 'ac-screen-f';
      f.title = screen.getAttribute('data-title') || '';
      f.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture; fullscreen');
      f.setAttribute('allowfullscreen', '');
      f.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
      screen.replaceChildren(f);
      screen.classList.add('is-playing');
    }
    f.src = src;
    return f;
  }
  function pick(a) {
    var id = a.getAttribute('data-ac-pick'), src = a.getAttribute('data-src') || '';
    if (!OK.test(src)) return false;
    screen.setAttribute('data-src', src); screen.setAttribute('data-title', a.getAttribute('data-title') || '');
    screen.classList.remove('is-playing');
    var fresh = poster.map(function (n) { return n.cloneNode(true); });
    screen.replaceChildren.apply(screen, fresh);
    var img = screen.querySelector('img'), big = a.getAttribute('data-poster'), small = a.getAttribute('data-poster-s'), mid = a.getAttribute('data-poster-m'), phone = screen.querySelector('source');
    if (phone) { if (small && mid) phone.srcset = small + ' 480w, ' + mid + ' 800w'; else phone.remove(); }
    if (img && big) { img.src = big; if (small) img.srcset = small + ' 480w, ' + (mid ? mid + ' 800w, ' : '') + big + ' 1280w'; img.alt = (img.alt || '').replace(/:\s.*$/, ': ' + (a.getAttribute('data-title') || '')); img.loading = 'eager'; }
    var watch = screen.querySelector('[data-ac-play]'), yt = /embed\/([A-Za-z0-9_-]{11})/.exec(src);
    if (watch && yt) watch.href = 'https://www.youtube.com/watch?v=' + yt[1];
    Array.prototype.forEach.call(document.querySelectorAll('[data-ac-info]'), function (p) { p.hidden = p.getAttribute('data-ac-info') !== id; });
    Array.prototype.forEach.call(document.querySelectorAll('[data-ac-pick]'), function (b) { if (b === a) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); });
    if (!reduce && typeof screen.animate === 'function') screen.animate([{ opacity: 0.35, transform: 'scale(.985)' }, { opacity: 1, transform: 'none' }], { duration: 380, easing: 'cubic-bezier(.16,1,.3,1)' });
    return true;
  }
  document.addEventListener('click', function (e) {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var p = e.target.closest && e.target.closest('[data-ac-pick]');
    if (p) { if (pick(p)) { e.preventDefault(); var r = screen.getBoundingClientRect(); if (r.top < 0 || r.bottom > window.innerHeight) screen.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' }); } return; }
    var b = e.target.closest && e.target.closest('[data-ac-play],[data-ac-at]');
    if (!b) return;
    e.preventDefault();
    var at = b.hasAttribute('data-ac-at') ? parseInt(b.getAttribute('data-ac-at'), 10) || 0 : 0;
    var f = load(at); if (!f) return;
    if (b.hasAttribute('data-ac-at')) {
      var r = screen.getBoundingClientRect();
      if (r.top < 0 || r.bottom > window.innerHeight) screen.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
    }
    try { f.focus({ preventScroll: true }); } catch (x) {  }
  });
})();
(function () {
  'use strict';
  var bar = document.querySelector('[data-px-vue]');
  if (!bar) return;
  var panes = {};
  Array.prototype.forEach.call(document.querySelectorAll('[data-px-pane]'), function (p) { panes[p.getAttribute('data-px-pane')] = p; });
  if (!panes.galerie || !panes.liste) return;
  var current = 'galerie';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function show(name) {
    if (!panes[name] || name === current) return;
    current = name;
    Object.keys(panes).forEach(function (k) { panes[k].hidden = k !== name; });
    Array.prototype.forEach.call(bar.querySelectorAll('[data-px-pick]'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-px-pick') === name)); });
    var p = panes[name];
    p.classList.remove('is-shown'); void p.offsetWidth; p.classList.add('is-shown');
  }
  bar.hidden = false;
  bar.addEventListener('click', function (ev) {
    var b = ev.target.closest ? ev.target.closest('[data-px-pick]') : null;
    if (b) show(b.getAttribute('data-px-pick'));
  });
  document.addEventListener('click', function (ev) {
    var a = ev.target.closest ? ev.target.closest('.px-belt-i') : null;
    if (!a || current !== 'liste') return;
    var row = document.getElementById('objl-' + (a.getAttribute('href') || '').replace(/^#obj-/, ''));
    if (!row) return;
    ev.preventDefault();
    row.open = true;
    row.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
    var s = row.querySelector('summary');
    if (s) try { s.focus({ preventScroll: true }); } catch (_) {}
  });
})();
