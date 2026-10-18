/* Généré depuis outils/sources/achats-pile.js : modifie la source, pas ce fichier. */
(function () {
  'use strict';
  var stack = document.querySelector('[data-ak-stack]'); if (!stack) return;
  var slots = Array.prototype.slice.call(stack.children), btn = document.querySelector('[data-ak-view]');
  var reduce = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  var tall = window.matchMedia ? window.matchMedia('(min-height: 600px) and (min-width: 601px), (max-width: 600px) and (min-height: 560px)') : { matches: true };
  var phone = window.matchMedia ? window.matchMedia('(max-width: 600px)') : { matches: false };
  function grid() { return stack.classList.contains('is-grid'); }
  function active() { return !reduce.matches && tall.matches && !grid(); }
  function stickTop(slot) { var t = parseFloat(getComputedStyle(slot).top); return Number.isFinite(t) ? t : 0; }
  function clear() { slots.forEach(function (s) { var c = s.firstElementChild; c.style.removeProperty('--ak-cover'); c.style.removeProperty('--ak-blur'); }); }
  var placed = '';
  function place() {
    var key = active() && phone.matches ? window.innerWidth + 'x' + window.innerHeight : '';
    if (key === placed) return; placed = key;
    if (!key) { slots.forEach(function (s) { s.style.removeProperty('--ak-stick'); }); return; }
    var head = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--lk-head-h')) || 71, vh = window.innerHeight;
    var hs = slots.map(function (s) { return s.firstElementChild.offsetHeight; });
    slots.forEach(function (s, i) { s.style.setProperty('--ak-stick', Math.round(Math.min(head + 8 + i * 6, vh - hs[i] - 8)) + 'px'); });
  }
  var queued = false;
  function frame() {
    queued = false;
    place();
    if (!active()) { clear(); return; }
    var vh = window.innerHeight;
    for (var i = 0; i < slots.length; i += 1) {
      var card = slots[i].firstElementChild, r = slots[i].getBoundingClientRect();
      var next = slots[i + 1] ? slots[i + 1].getBoundingClientRect() : null;
      var cover = next ? Math.max(0, Math.min(1, (r.bottom - next.top) / Math.max(1, r.height))) : 0;
      var arrival = Math.max(0, Math.min(1, (vh - r.top) / (vh * 0.55)));
      card.style.setProperty('--ak-cover', cover.toFixed(3));
      card.style.setProperty('--ak-blur', ((1 - arrival) * 6).toFixed(2) + 'px');
    }
  }
  function queue() { if (!queued && document.visibilityState !== 'hidden') { queued = true; window.requestAnimationFrame(frame); } }
  var watching = false;
  function watch(on) { if (on === watching) return; watching = on; if (on) { window.addEventListener('scroll', queue, { passive: true }); window.addEventListener('resize', queue); queue(); } else { window.removeEventListener('scroll', queue); window.removeEventListener('resize', queue); } }
  if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { watch(e[0].isIntersecting); }, { rootMargin: '200px 0px' }).observe(stack);
  else watch(true);
  stack.addEventListener('focusin', function (ev) {
    if (!active()) return;
    var slot = ev.target.closest('.ak-slot'), i = slots.indexOf(slot); if (i < 0) return;
    var card = slot.firstElementChild, cover = parseFloat(card.style.getPropertyValue('--ak-cover')) || 0;
    if (cover < 0.15) return;
    var top = stack.getBoundingClientRect().top + window.scrollY;
    for (var k = 0; k < i; k += 1) top += slots[k].offsetHeight;
    window.scrollTo({ top: Math.max(0, top - stickTop(slot)), behavior: 'auto' });
  });
  Array.prototype.forEach.call(document.querySelectorAll('.ak-jump a[href^="#ak-"]'), function (a) {
    a.addEventListener('click', function (ev) {
      if (!active()) return;
      var slot = document.getElementById(a.getAttribute('href').slice(1)), i = slots.indexOf(slot); if (i < 0) return;
      ev.preventDefault();
      var top = stack.getBoundingClientRect().top + window.scrollY;
      for (var k = 0; k < i; k += 1) top += slots[k].offsetHeight;
      window.scrollTo({ top: Math.max(0, top - stickTop(slot)), behavior: reduce.matches ? 'auto' : 'smooth' });
      if (history.replaceState) history.replaceState(null, '', '#' + slot.id);
      var link = slot.querySelector('h3 a'); if (link) link.focus({ preventScroll: true });
    });
  });
  if (btn) {
    btn.hidden = false;
    function set(on) {
      stack.classList.toggle('is-grid', on); placed = '-'; btn.setAttribute('aria-pressed', String(on)); btn.textContent = on ? 'Zurück zum Stapel' : 'Alles im Raster ansehen';
      queue();
    }
    try { sessionStorage.removeItem('lk_achats_vue'); } catch (e) {  }
    set(false);
    btn.addEventListener('click', function () { set(!grid()); });
    if (reduce.matches) btn.hidden = true;
  }
  if (reduce.addEventListener) reduce.addEventListener('change', function () { placed = '-'; queue(); });
  window.addEventListener('resize', function () { placed = '-'; queue(); });
  window.addEventListener('load', function () { placed = '-'; queue(); });
}());
