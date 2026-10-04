/* Section « GTA Online » (section online) : petites aides de l’espace GTA Online.
   - Sur online.html, le sommaire de l’espace montre où tu en es : le lien de la partie de la page affichée à l’écran
     (Ce qui change, Activités, Achats et entreprises, Mises à jour) s’allume.
   - Le réseau décoratif de l’en-tête ne pulse que visible à l’écran, onglet affiché et mouvement permis.
   - La présentation de l’espace (écrans [data-online-scene]) se lit en défilant : ce script pose sur chaque écran sa
     progression --p (0 : encore sous l’écran, 1 : déjà passé) et la classe is-on ; online.css en fait des apparitions.
     Sans script ou en mouvement réduit, tout est affiché d’un coup.
   Tout le texte est dans la page : ce script n’écrit aucun mot. Aucun stockage, aucune requête. */
(function () {
  'use strict';
  var mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  var reduced = function () { return !!mq.matches; };

  /* sommaire : partie de la page affichée */
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

  /* présentation : progression de chaque écran, posée en --p (lue par online.css) */
  var scenes = Array.prototype.slice.call(document.querySelectorAll('[data-online-scene]'));
  var cine = document.querySelector('[data-online-cine]');
  if (scenes.length && cine && !reduced() && 'requestAnimationFrame' in window) {
    document.documentElement.classList.add('online-cine-js');
    /* titres des écrans, mot à mot (le texte est seulement enveloppé, jamais réécrit) */
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
    var raf = 0;
    var tick = function () {
      raf = 0;
      var vh = window.innerHeight || 1;
      scenes.forEach(function (sc) {
        var r = sc.getBoundingClientRect();
        /* 0 quand le haut de l’écran entre par le bas, 1 quand son bas sort par le haut ; les écrans collants (sticky)
           prennent leur progression sur toute leur hauteur de défilement */
        var p = (vh - r.top) / (vh + r.height);
        p = p < 0 ? 0 : p > 1 ? 1 : p;
        sc.style.setProperty('--p', p.toFixed(4));
        sc.classList.toggle('is-on', p > 0.08 && p < 0.97);
      });
      var cr = cine.getBoundingClientRect();
      var cp = (vh - cr.top) / (vh + cr.height); cp = cp < 0 ? 0 : cp > 1 ? 1 : cp;
      cine.style.setProperty('--cp', cp.toFixed(4));
    };
    var ask = function () { if (!raf) raf = window.requestAnimationFrame(tick); };
    window.addEventListener('scroll', ask, { passive: true });
    window.addEventListener('resize', ask);
    tick();
  }

  /* réseau de l’en-tête : il pulse seulement à l’écran */
  var signal = document.querySelector('.online-signal');
  if (!signal) return;
  var visible = false;
  var play = function () { signal.classList.toggle('online-joue', visible && !document.hidden && !reduced()); };
  if ('IntersectionObserver' in window) new IntersectionObserver(function (entries) { entries.forEach(function (en) { visible = en.isIntersecting; play(); }); }, { threshold: 0.2 }).observe(signal);
  else { visible = true; play(); }
  document.addEventListener('visibilitychange', play);
  if (mq.addEventListener) mq.addEventListener('change', play); else if (mq.addListener) mq.addListener(play);
})();
