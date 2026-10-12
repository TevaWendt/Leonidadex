/* v7.87 : vidéos officielles (videos/<id>.html). Le lecteur de YouTube (youtube-nocookie, permis par la CSP) ne se charge
   qu’au clic, comme sur Radios et musique : avant, la page ne demande rien à YouTube. Sans script, « Regarder la vidéo » et
   « Revoir ce moment » sont de simples liens vers la vidéo sur YouTube. Rien n’est écrit sur l’appareil. */
(function () {
  'use strict';
  /* page des éditions : le nom officiel (anglais) sous un contenu est masqué quand la traduction l’écrit déjà tel quel
     (page anglaise : « Sara's Unisex Salon » deux fois) */
  var norm = function (t) { return String(t || '').toLowerCase().replace(/[’‘]/g, '\'').replace(/^(the|an?)\s+/, '').replace(/\s+/g, ' ').trim(); };
  Array.prototype.forEach.call(document.querySelectorAll('.ac-ue-i'), function (li) {
    var a = li.querySelector('.ac-ue-fr'), b = li.querySelector('.ac-ue-en');
    if (a && b && norm(a.textContent) === norm(b.textContent)) b.hidden = true;
  });
  var screen = document.querySelector('[data-ac-screen]');
  if (!screen) return;
  var base = screen.getAttribute('data-src') || '';
  if (!/^https:\/\/www\.youtube-nocookie\.com\/embed\/[A-Za-z0-9_-]{11}\?[a-z0-9=&]+$/.test(base)) return;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function load(t) {
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
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-ac-play],[data-ac-at]');
    if (!b || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    var at = b.hasAttribute('data-ac-at') ? parseInt(b.getAttribute('data-ac-at'), 10) || 0 : 0;
    var f = load(at);
    if (b.hasAttribute('data-ac-at')) {
      var r = screen.getBoundingClientRect();
      if (r.top < 0 || r.bottom > window.innerHeight) screen.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
    }
    try { f.focus({ preventScroll: true }); } catch (x) { /* rien */ }
  });
})();
