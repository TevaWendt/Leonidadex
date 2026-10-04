/* Section « Codes de triche » (section codes) : les cartes de codes de codes-de-triche.html et de ses fiches.
   Amélioration progressive : sans JavaScript, chaque carte montre toutes ses séquences (PlayStation, Xbox, PC) et son
   numéro de téléphone, en texte et en pictogrammes. Avec JavaScript :
   - un choix de console (boutons à état, au clavier) n’affiche que la séquence de la console choisie ;
   - quand une carte arrive à l’écran, sa séquence s’affiche touche après touche, comme si on la tapait, puis la carte
     s’allume (effet d’activation) ; le bouton « Rejouer » la retape ;
   - le bouton « Copier » copie le numéro de téléphone (presse-papiers, sinon le numéro est sélectionné).
   Tout le texte vient de la page (déjà traduite) : ce script n’écrit aucun mot. Animations décoratives (transform et
   opacity, cadre fixe : aucun décalage de mise en page), coupées avec prefers-reduced-motion: reduce. Aucun stockage,
   aucune requête. */
(function () {
  'use strict';
  var cards = Array.prototype.slice.call(document.querySelectorAll('[data-codes-carte]'));
  if (!cards.length) return;
  var mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  var reduced = function () { return !!mq.matches; };
  var live = document.querySelector('[data-codes-annonce]');
  var say = function (t) { if (!live) return; live.textContent = ''; window.setTimeout(function () { live.textContent = t; }, 60); };
  var STEP = 140, timers = new Map();
  document.documentElement.classList.add('codes-js');

  /* ---------- frappe d’une séquence, touche après touche ---------- */
  function shown(card) { return Array.prototype.slice.call(card.querySelectorAll('[data-codes-seq]')).filter(function (s) { return !s.hidden; }); }
  function clear(card) { (timers.get(card) || []).forEach(function (t) { window.clearTimeout(t); }); timers.set(card, []); }
  function type(card) {
    clear(card);
    var seqs = shown(card), keys = [];
    seqs.forEach(function (s) { keys = keys.concat(Array.prototype.slice.call(s.querySelectorAll('[data-codes-touche]'))); });
    card.classList.remove('is-active');
    if (reduced() || !keys.length) { keys.forEach(function (k) { k.classList.add('is-tapee'); }); card.classList.add('is-tapee'); return; }
    card.classList.remove('is-tapee');
    keys.forEach(function (k) { k.classList.remove('is-tapee'); });
    var list = timers.get(card);
    /* une seule séquence se tape à la fois : la séquence suivante attend la fin de la précédente ; la première touche part
       au pas suivant, pour que son animation reparte bien quand on rejoue */
    var i = 1;
    seqs.forEach(function (s) {
      Array.prototype.slice.call(s.querySelectorAll('[data-codes-touche]')).forEach(function (k) {
        list.push(window.setTimeout(function () { k.classList.add('is-tapee'); }, STEP * i++));
      });
      i += 2;
    });
    list.push(window.setTimeout(function () { card.classList.add('is-tapee', 'is-active'); }, STEP * i));
  }

  /* ---------- choix de la console ---------- */
  var group = document.querySelector('[data-codes-consoles]');
  var buttons = group ? Array.prototype.slice.call(group.querySelectorAll('[data-codes-console]')) : [];
  var current = null;
  function choose(name, opts) {
    opts = opts || {};
    current = name;
    buttons.forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-codes-console') === name ? 'true' : 'false'); });
    cards.forEach(function (card) {
      var seqs = Array.prototype.slice.call(card.querySelectorAll('[data-codes-seq]'));
      var has = seqs.some(function (s) { return s.getAttribute('data-codes-seq') === name; });
      /* une carte sans séquence pour cette console (code par téléphone seulement) garde ses séquences visibles */
      seqs.forEach(function (s) { s.hidden = has && s.getAttribute('data-codes-seq') !== name; });
      if (opts.retype && card.classList.contains('is-vue')) type(card);
    });
    if (opts.announce) { var b = buttons.filter(function (x) { return x.getAttribute('data-codes-console') === name; })[0]; if (b) say(b.textContent.replace(/\s+/g, ' ').trim()); }
  }
  if (buttons.length) {
    group.hidden = false;
    buttons.forEach(function (b, i) {
      b.addEventListener('click', function () { choose(b.getAttribute('data-codes-console'), { retype: true, announce: true }); });
      b.addEventListener('keydown', function (e) {
        var k = e.key, n = buttons.length, j = -1;
        if (k === 'ArrowRight' || k === 'ArrowDown') j = (i + 1) % n; else if (k === 'ArrowLeft' || k === 'ArrowUp') j = (i - 1 + n) % n; else if (k === 'Home') j = 0; else if (k === 'End') j = n - 1;
        if (j < 0) return;
        e.preventDefault(); buttons[j].focus(); choose(buttons[j].getAttribute('data-codes-console'), { retype: true, announce: true });
      });
    });
    choose(buttons[0].getAttribute('data-codes-console'));
  }

  /* ---------- rejouer ---------- */
  cards.forEach(function (card) {
    var again = card.querySelector('[data-codes-rejouer]');
    if (!again) return;
    again.hidden = false;
    again.addEventListener('click', function () { card.classList.add('is-vue'); type(card); });
  });

  /* ---------- copier un numéro de téléphone ---------- */
  Array.prototype.slice.call(document.querySelectorAll('[data-codes-copier]')).forEach(function (btn) {
    var box = btn.closest('[data-codes-tel]'), num = box && box.querySelector('[data-codes-numero]'), ok = box && box.querySelector('[data-codes-copie]');
    if (!num) return;
    btn.hidden = false;
    var done = function () {
      box.classList.remove('is-copie');
      void box.offsetWidth;
      box.classList.add('is-copie');
      if (ok) say(ok.textContent.replace(/\s+/g, ' ').trim() + ' ' + num.textContent.trim());
    };
    var select = function () { try { var r = document.createRange(); r.selectNodeContents(num); var s = window.getSelection(); s.removeAllRanges(); s.addRange(r); } catch (e) { /* rien à sélectionner */ } };
    btn.addEventListener('click', function () {
      var text = num.textContent.trim();
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function () { select(); done(); });
      else { select(); done(); }
    });
  });

  /* ---------- la séquence se tape quand la carte arrive à l’écran (une fois) ---------- */
  if (!reduced() && 'IntersectionObserver' in window) {
    cards.forEach(function (card) { card.classList.add('codes-attend'); });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        io.unobserve(en.target);
        en.target.classList.remove('codes-attend');
        en.target.classList.add('is-vue');
        type(en.target);
      });
    }, { threshold: 0.35 });
    cards.forEach(function (card) { io.observe(card); });
  } else cards.forEach(function (card) { card.classList.add('is-vue', 'is-tapee'); Array.prototype.slice.call(card.querySelectorAll('[data-codes-touche]')).forEach(function (k) { k.classList.add('is-tapee'); }); });
  var onMotion = function () { if (reduced()) cards.forEach(function (card) { clear(card); card.classList.remove('codes-attend'); card.classList.add('is-tapee'); Array.prototype.slice.call(card.querySelectorAll('[data-codes-touche]')).forEach(function (k) { k.classList.add('is-tapee'); }); }); };
  if (mq.addEventListener) mq.addEventListener('change', onMotion); else if (mq.addListener) mq.addListener(onMotion);
})();
