/* Généré depuis outils/sources/online.js : modifie la source, pas ce fichier. */
(function () {
  'use strict';
  var mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  var reduced = function () { return !!mq.matches; };
  var links = Array.prototype.slice.call(document.querySelectorAll('.online-nav a[data-online-ancre]'));
  var here = location.pathname.replace(/\/index\.html$/, '/');
  var onHub = /\/online\.html$/.test(here);
  if (onHub && links.length && 'IntersectionObserver' in window) {
    var byId = {};
    links.forEach(function (a) { var id = a.getAttribute('data-online-ancre'), sec = document.getElementById(id); if (sec) byId[id] = { a: a, sec: sec }; });
    var seen = {};
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { seen[en.target.id] = en.isIntersecting; });
      var on = null;
      Object.keys(byId).forEach(function (id) { if (seen[id] && !on) on = id; });
      Object.keys(byId).forEach(function (id) { byId[id].a.classList.toggle('is-ici', id === on); });
    }, { rootMargin: '-35% 0px -55% 0px' });
    Object.keys(byId).forEach(function (id) { io.observe(byId[id].sec); });
  }
  var scenes = Array.prototype.slice.call(document.querySelectorAll('[data-online-scene]'));
  var cine = document.querySelector('[data-online-cine]');
  var rail = document.querySelector('[data-online-rail]'), railLinks = rail ? Array.prototype.slice.call(rail.querySelectorAll('a[data-online-go]')) : [];
  if (scenes.length && cine && !reduced() && 'requestAnimationFrame' in window) {
    document.documentElement.classList.add('online-cine-js');
    scenes.forEach(function (sc) {
      var t = sc.querySelector('.online-scene-t'); if (!t || t.dataset.onlineWords) return;
      var frag = document.createDocumentFragment(), i = 0;
      t.textContent.split(/(\s+)/).forEach(function (part) {
        if (!part) return;
        if (!part.trim()) { frag.appendChild(document.createTextNode(part)); return; }
        var s = document.createElement('span'); s.className = 'online-w'; s.style.setProperty('--w', i++); s.textContent = part; frag.appendChild(s);
      });
      t.replaceChildren(frag); t.dataset.onlineWords = '1';
    });
    var n = scenes.length, raf = 0;
    var slotTop = function (k) { var vh = window.innerHeight || 1, r = cine.getBoundingClientRect(), total = r.height - vh; return r.top + window.pageYOffset + (total * k) / n; };
    var tick = function () {
      raf = 0;
      var vh = window.innerHeight || 1, r = cine.getBoundingClientRect(), total = Math.max(1, r.height - vh);
      var t = (-r.top) / total;
      var cp = t < 0 ? 0 : t > 1 ? 1 : t;
      cine.style.setProperty('--cp', cp.toFixed(4));
      var pos = cp * n, on = Math.min(n - 1, Math.max(0, Math.floor(pos + 0.5)));
      scenes.forEach(function (sc, k) {
        var p = pos - k;
        sc.style.setProperty('--p', p.toFixed(4));
        var vis = p > -0.3 && p < 1.3;
        sc.classList.toggle('is-on', vis);
        sc.classList.toggle('is-off', !vis);
      });
      if (rail) {
        rail.classList.toggle('is-on', r.top < vh * 0.5 && r.bottom > vh * 0.92);
        railLinks.forEach(function (a, k) { if (k === on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
      }
    };
    var ask = function () { if (!raf) raf = window.requestAnimationFrame(tick); };
    window.addEventListener('scroll', ask, { passive: true });
    window.addEventListener('resize', ask);
    railLinks.forEach(function (a) { a.addEventListener('click', function (e) { var k = +a.getAttribute('data-online-go'); if (!isNaN(k)) { e.preventDefault(); window.scrollTo({ top: Math.round(slotTop(k) + 2), behavior: 'smooth' }); } }); });
    tick();
  }
  var signal = document.querySelector('.online-signal');
  if (!signal) return;
  var visible = false;
  var play = function () { signal.classList.toggle('online-joue', visible && !document.hidden && !reduced()); };
  if ('IntersectionObserver' in window) new IntersectionObserver(function (entries) { entries.forEach(function (en) { visible = en.isIntersecting; play(); }); }, { threshold: 0.2 }).observe(signal);
  else { visible = true; play(); }
  document.addEventListener('visibilitychange', play);
  if (mq.addEventListener) mq.addEventListener('change', play); else if (mq.addListener) mq.addListener(play);
})();
