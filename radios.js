/* Section « Radios et musique » (section radios) : le poste de Leonida (radios.html).
   Amélioration progressive : sans JavaScript, les quatre sources de musique se lisent l’une après l’autre et les touches
   sont des liens vers chacune. Avec JavaScript, les touches deviennent des onglets (clavier : flèches, Début, Fin) ;
   choisir une source tourne la molette, déplace l’aiguille, fait défiler son nom à l’écran et fait arriver ses morceaux.
   Tout le texte vient de la page (déjà traduite) : ce script n’écrit aucun mot. Les animations sont décoratives
   (transform et opacity, cadre fixe) et s’arrêtent avec prefers-reduced-motion: reduce, hors écran et onglet caché.
   Aucun stockage, aucune requête. */
(function () {
  'use strict';
  var root = document.querySelector('[data-radios-poste]');
  if (!root) return;
  var nav = root.querySelector('[data-radios-presets]');
  var tabs = Array.prototype.slice.call(root.querySelectorAll('[data-radios-preset]'));
  var panels = Array.prototype.slice.call(root.querySelectorAll('[data-radios-panneau]'));
  if (!nav || !tabs.length || tabs.length !== panels.length) return;
  var screenK = root.querySelector('[data-radios-k]'), screenT = root.querySelector('[data-radios-defile]');
  var live = root.querySelector('[data-radios-annonce]');
  var mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  var reduced = function () { return !!mq.matches; };
  var current = -1, visible = false;
  var text = function (el) { return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; };

  root.classList.add('radios-poste--js');
  nav.setAttribute('role', 'tablist');
  tabs.forEach(function (t, i) {
    var p = panels[i];
    t.id = t.id || 'radios-touche-' + i;
    t.setAttribute('role', 'tab');
    t.setAttribute('aria-controls', p.id);
    p.setAttribute('role', 'tabpanel');
    p.setAttribute('aria-labelledby', t.id);
    p.tabIndex = 0;
  });

  /* position du cadran : la molette tourne de -120° à +120°, l’aiguille va de 8 % à 92 % de la graduation */
  function dial(i) {
    var r = tabs.length > 1 ? i / (tabs.length - 1) : 0;
    root.style.setProperty('--radios-angle', (-120 + 240 * r).toFixed(1) + 'deg');
    root.style.setProperty('--radios-pct', (8 + 84 * r).toFixed(1) + '%');
  }
  /* écran : nom de la source, puis date et premier morceau, qui défilent (texte doublé pour une boucle sans à-coup) */
  function screen(i) {
    var p = panels[i], first = p.querySelector('.radios-morceau');
    var parts = [text(p.querySelector('time')), first ? text(first.querySelector('.radios-morceau-a')) + ' — ' + text(first.querySelector('.radios-morceau-t')) : ''].filter(Boolean);
    if (screenK) screenK.textContent = text(tabs[i].querySelector('.radios-preset-t'));
    if (!screenT) return;
    var line = parts.join(' · ');
    var holder = screenT.parentNode;
    holder.classList.remove('radios-defile--anime');
    if (reduced()) { screenT.textContent = line; return; }
    screenT.textContent = line + ' · ' + line + ' · ';
    screenT.style.setProperty('--radios-duree', Math.max(9, Math.round(line.length / 4)) + 's');
    holder.style.setProperty('--radios-duree', Math.max(9, Math.round(line.length / 4)) + 's');
    window.requestAnimationFrame(function () { window.requestAnimationFrame(function () { holder.classList.add('radios-defile--anime'); }); });
  }
  /* arrivée des morceaux, en cascade */
  function arrive(p) {
    if (reduced()) return;
    p.classList.remove('radios-arrive');
    window.requestAnimationFrame(function () { window.requestAnimationFrame(function () { p.classList.add('radios-arrive'); }); });
  }
  function select(i, opts) {
    opts = opts || {};
    if (i < 0 || i >= tabs.length) return;
    var changed = i !== current;
    current = i;
    tabs.forEach(function (t, j) {
      var on = j === i;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
      panels[j].hidden = !on;
    });
    dial(i);
    screen(i);
    if (opts.focus) tabs[i].focus();
    if (changed && opts.animate !== false && visible) arrive(panels[i]);
    if (opts.announce && live) {
      var h = panels[i].querySelector('.radios-panneau-h h3'), m = panels[i].querySelector('.radios-panneau-meta');
      live.textContent = text(h) + ', ' + text(m);
    }
    if (opts.hash && window.history && window.history.replaceState) window.history.replaceState(null, '', '#' + panels[i].id);
  }

  tabs.forEach(function (t, i) {
    t.addEventListener('click', function (e) { e.preventDefault(); select(i, { announce: true, hash: true }); });
  });
  nav.addEventListener('keydown', function (e) {
    var k = e.key, n = tabs.length, i = current;
    if (k === 'ArrowRight' || k === 'ArrowDown') i = (current + 1) % n;
    else if (k === 'ArrowLeft' || k === 'ArrowUp') i = (current - 1 + n) % n;
    else if (k === 'Home') i = 0;
    else if (k === 'End') i = n - 1;
    else return;
    e.preventDefault();
    select(i, { focus: true, announce: true, hash: true });
  });

  /* le poste ne joue (égaliseur, écran) que visible à l’écran et onglet affiché */
  function play() {
    var on = visible && !document.hidden && !reduced();
    root.classList.toggle('radios-joue', on);
    var holder = screenT && screenT.parentNode;
    if (holder) holder.style.animationPlayState = on ? 'running' : 'paused';
    if (screenT) screenT.style.animationPlayState = on ? '' : 'paused';
  }
  var start = 0;
  var fromHash = function () { var h = decodeURIComponent((location.hash || '').slice(1)); for (var j = 0; j < panels.length; j++) if (panels[j].id === h) return j; return -1; };
  if (fromHash() >= 0) start = fromHash();
  select(start, { animate: false });
  window.addEventListener('hashchange', function () { var j = fromHash(); if (j >= 0 && j !== current) select(j, { announce: true }); });

  if ('IntersectionObserver' in window) {
    var first = true;
    new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        visible = en.isIntersecting;
        if (visible && first) { first = false; arrive(panels[current]); }
        play();
      });
    }, { threshold: 0.15 }).observe(root);
  } else { visible = true; play(); }
  document.addEventListener('visibilitychange', play);
  var onMotion = function () { screen(current); play(); };
  if (mq.addEventListener) mq.addEventListener('change', onMotion); else if (mq.addListener) mq.addListener(onMotion);
})();
