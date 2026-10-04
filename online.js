/* Section « GTA Online » (section online) : petites aides de l’espace GTA Online.
   - Sur online.html, le sommaire de l’espace montre où tu en es : le lien de la partie de la page affichée à l’écran
     (Ce qui change, Activités, Achats et entreprises, Mises à jour) s’allume.
   - Le réseau décoratif de l’en-tête ne pulse que visible à l’écran, onglet affiché et mouvement permis.
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
