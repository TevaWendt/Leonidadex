/* LEONIDAKIT v7.78 — cartes en tête des hubs du monde (monde.css, balisage : outils/monde-cartes.cjs).
   Chargé dans <head> (petit, bloquant) pour poser html.mo-js avant le premier rendu : les cartes ne s'affichent jamais
   une fois pour disparaître et réapparaître. Sans ce script, sans IntersectionObserver ou avec « réduire les
   animations », rien n'est caché : tout est posé. Ce script n'écrit aucun mot, ne garde rien sur l'appareil et
   n'envoie aucune requête.
   - Entrées : la carte de Leonida (Lieux) entre d'un bloc ; ailleurs, chaque carte entre à son arrivée à l'écran, en
     cascade avec celles qui arrivent en même temps (--d) ; une carte déjà dépassée (défilement rapide) est posée telle
     quelle (mo-still).
   - Lieux : un trait relie chaque carte à sa région sur la carte (ordinateur) ; pointer une carte ou un repère met la
     région en lumière.
   - Personnages : pointer une case (souris ou clavier) allume les cases des personnages liés, les autres s'éteignent. */
(function () {
  'use strict';
  var root = document.documentElement;
  var reduced = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false;
  var motion = !reduced && 'IntersectionObserver' in window;
  if (motion) root.classList.add('mo-js');
  var each = function (list, fn) { Array.prototype.forEach.call(list, fn); };
  var SVGNS = 'http://www.w3.org/2000/svg';

  function reveal(mod) {
    if (mod.getAttribute('data-mo') === 'lieux') mod.classList.add('is-in');
    else each(mod.children, function (el) { el.classList.add('is-in'); });
  }

  /* ---------- entrées ---------- */
  function entrances(mods) {
    if (!motion) { each(mods, reveal); return; }
    var io = new IntersectionObserver(function (entries) {
      var batch = entries.filter(function (e) { return e.isIntersecting; }).map(function (e) { return e.target; });
      batch.sort(function (a, b) { return a.compareDocumentPosition(b) & 4 ? -1 : 1; });
      batch.forEach(function (el, k) {
        if (!el.hasAttribute('data-mo')) el.style.setProperty('--d', Math.min(k, 5) * 100 + 'ms');
        /* déjà dépassé (défilement rapide) : posé sans animation */
        if (el.getBoundingClientRect().bottom < 0) el.classList.add('mo-still');
        el.classList.add('is-in');
        io.unobserve(el);
        if (el.getAttribute('data-mo') === 'lieux') window.setTimeout(function () { el.classList.add('is-drawn'); }, 3400);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    each(mods, function (mod) {
      if (mod.getAttribute('data-mo') === 'lieux') io.observe(mod);
      else each(mod.children, function (el) { io.observe(el); });
    });
  }

  /* ---------- Lieux : traits et mise en lumière ---------- */
  function atlas(mod) {
    var box = mod.querySelector('.mo-map-box'), lines = mod.querySelector('.mo-lines'), pinsSvg = mod.querySelector('.mo-pins');
    if (!box || !lines || !pinsSvg) return;
    var vb = pinsSvg.viewBox.baseVal, cards = mod.querySelectorAll('.mo-reg'), pins = {}, raf = 0, timer = 0;
    each(mod.querySelectorAll('.mo-pin'), function (p) { pins[p.getAttribute('data-mo-id')] = p; });
    var pinPos = function (id) { var c = pins[id] && pins[id].querySelector('.mo-pin-dot'); return c ? { x: +c.getAttribute('cx'), y: +c.getAttribute('cy') } : null; };
    function draw() {
      raf = 0;
      while (lines.firstChild) lines.removeChild(lines.firstChild);
      if (window.getComputedStyle(lines).display === 'none') return;
      var A = mod.getBoundingClientRect(), B = box.getBoundingClientRect();
      lines.setAttribute('viewBox', '0 0 ' + Math.round(A.width) + ' ' + Math.round(A.height));
      each(cards, function (card) {
        var id = card.getAttribute('data-mo-id'), p = pinPos(id); if (!p) return;
        var r = card.getBoundingClientRect(), left = r.left + r.width / 2 < B.left + B.width / 2;
        var x1 = (left ? r.right : r.left) - A.left, y1 = r.top + r.height / 2 - A.top;
        var x2 = B.left - A.left + p.x / vb.width * B.width, y2 = B.top - A.top + p.y / vb.height * B.height;
        var dx = Math.max(40, Math.abs(x2 - x1) * 0.45) * (left ? 1 : -1);
        var path = document.createElementNS(SVGNS, 'path');
        path.setAttribute('d', 'M' + x1.toFixed(1) + ' ' + y1.toFixed(1) + 'C' + (x1 + dx).toFixed(1) + ' ' + y1.toFixed(1) + ' ' + (x2 - dx * 0.6).toFixed(1) + ' ' + y2.toFixed(1) + ' ' + x2.toFixed(1) + ' ' + y2.toFixed(1));
        path.setAttribute('pathLength', '1');
        path.setAttribute('class', 'mo-line');
        path.setAttribute('data-mo-id', id);
        path.style.setProperty('--c', card.style.getPropertyValue('--c'));
        path.style.setProperty('--k', card.style.getPropertyValue('--k'));
        var end = document.createElementNS(SVGNS, 'circle');
        end.setAttribute('cx', x1.toFixed(1)); end.setAttribute('cy', y1.toFixed(1)); end.setAttribute('r', '5');
        end.setAttribute('class', 'mo-line-end');
        end.setAttribute('data-mo-id', id);
        end.style.setProperty('--c', card.style.getPropertyValue('--c'));
        end.style.setProperty('--k', card.style.getPropertyValue('--k'));
        lines.appendChild(path); lines.appendChild(end);
      });
      if (mod.dataset.active) light(mod.dataset.active);
    }
    var queue = function () { if (!raf) raf = window.requestAnimationFrame(draw); };
    function light(id) {
      window.clearTimeout(timer);
      mod.dataset.active = id;
      mod.classList.add('is-active');
      var p = pinPos(id);
      if (p) { mod.style.setProperty('--sx', (p.x / vb.width * 100).toFixed(2) + '%'); mod.style.setProperty('--sy', (p.y / vb.height * 100).toFixed(2) + '%'); }
      each(mod.querySelectorAll('[data-mo-id]'), function (el) { el.classList.toggle('is-on', el.getAttribute('data-mo-id') === id); });
    }
    function dark() {
      window.clearTimeout(timer);
      timer = window.setTimeout(function () {
        delete mod.dataset.active;
        mod.classList.remove('is-active');
        each(mod.querySelectorAll('.is-on'), function (el) { el.classList.remove('is-on'); });
      }, 90);
    }
    var hover = function (el) {
      var id = el.getAttribute('data-mo-id');
      el.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') light(id); });
      el.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') dark(); });
    };
    each(cards, function (card) {
      hover(card);
      card.addEventListener('focusin', function () { light(card.getAttribute('data-mo-id')); });
      card.addEventListener('focusout', function (e) { if (!card.contains(e.relatedTarget)) dark(); });
    });
    each(mod.querySelectorAll('.mo-pin'), hover);
    if ('ResizeObserver' in window) new ResizeObserver(queue).observe(mod); else window.addEventListener('resize', queue);
    window.addEventListener('load', queue);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(queue);
    queue();
  }

  /* ---------- Personnages : qui connaît qui ---------- */
  function cover(mod) {
    var panels = mod.querySelectorAll('.mo-panel'), timer = 0;
    function on(panel) {
      window.clearTimeout(timer);
      var ties = (panel.getAttribute('data-mo-links') || '').split(' ').filter(Boolean);
      mod.classList.add('is-focus');
      mod.style.setProperty('--fc', panel.style.getPropertyValue('--c'));
      each(panels, function (p) {
        var id = p.getAttribute('data-mo-id');
        p.classList.toggle('is-on', p === panel);
        p.classList.toggle('is-tie', ties.indexOf(id) !== -1);
      });
    }
    function off() {
      window.clearTimeout(timer);
      timer = window.setTimeout(function () {
        mod.classList.remove('is-focus');
        each(panels, function (p) { p.classList.remove('is-on', 'is-tie'); });
      }, 80);
    }
    each(panels, function (panel) {
      panel.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') on(panel); });
      panel.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') off(); });
      panel.addEventListener('focusin', function () { on(panel); });
      panel.addEventListener('focusout', function (e) { if (!panel.contains(e.relatedTarget)) off(); });
    });
  }

  function init() {
    var mods = document.querySelectorAll('[data-mo]');
    if (!mods.length) return;
    try {
      entrances(mods);
      each(mods, function (mod) {
        var kind = mod.getAttribute('data-mo');
        if (kind === 'lieux') atlas(mod);
        else if (kind === 'personnages') cover(mod);
      });
    } catch (e) {
      root.classList.remove('mo-js');
      each(mods, reveal);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
