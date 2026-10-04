/* Section « Trophées et succès » (section trophees) : suivi des trophées sur trophees.html, trophees/<id>.html et la page de
   démonstration trophees/modele.html.
   - Case « Obtenu » par trophée, gardée sur l’appareil seulement, sous une seule clé (lk-trophees-obtenus-v1 : liste
     d’identifiants de trophées) ; aucun cookie, aucune requête. Sans JavaScript ou sans stockage, les cases restent cachées.
     Sur la page de démonstration (data-trophees-demo), tout marche sans rien enregistrer.
   - Bilan : nombre obtenu, pourcentage et anneau de progression ; le bilan est relu aux lecteurs d’écran après chaque case
     (la case elle-même annonce son état « coché »).
   - Filtres (grade, manquable, catégorie, obtenus) : boutons à état, au clavier.
   - Mouvement : cartes qui arrivent en cascade, badge qui apparaît avec un éclat bref quand on coche, anneau qui se remplit.
     Jetons de motion-tokens.css, transform et opacity (cadre fixe : aucun décalage de mise en page), coupé avec
     prefers-reduced-motion: reduce.
   Tout le texte vient de la page (déjà traduite) : ce script n’écrit que des nombres. */
(function () {
  'use strict';
  var KEY = 'lk-trophees-obtenus-v1';
  var boxes = Array.prototype.slice.call(document.querySelectorAll('[data-trophees-obtenu]'));
  if (!boxes.length) return;
  var demo = !!document.querySelector('[data-trophees-demo]');
  var mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  var reduced = function () { return !!mq.matches; };
  var okId = function (x) { return typeof x === 'string' && /^[a-z0-9-]+$/.test(x); };
  function read() { try { var v = JSON.parse(window.localStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v.filter(okId) : []; } catch (e) { return null; } }
  function write(list) { try { if (list.length) window.localStorage.setItem(KEY, JSON.stringify(list)); else window.localStorage.removeItem(KEY); return true; } catch (e) { return false; } }
  var saved = demo ? [] : read();
  if (saved === null) return;
  var lang = (document.documentElement.lang || 'fr').slice(0, 2);
  var pct = function (p) { try { return new Intl.NumberFormat(lang, { style: 'percent', maximumFractionDigits: 0 }).format(p); } catch (e) { return Math.round(p * 100) + ' %'; } };
  var cardOf = function (input) { return input.closest('[data-trophees-id]'); };
  var idOf = function (input) { var c = cardOf(input); return c ? c.getAttribute('data-trophees-id') : null; };

  /* ---------- bilan : nombre, pourcentage, anneau ---------- */
  var bilan = document.querySelector('[data-trophees-bilan]');
  var live = document.querySelector('[data-trophees-annonce]');
  function update(announce) {
    var total = boxes.length, n = boxes.filter(function (b) { return b.checked; }).length, p = total ? n / total : 0;
    if (!bilan) return;
    bilan.hidden = false;
    var set = function (sel, v) { var el = bilan.querySelector(sel); if (el) el.textContent = v; };
    set('[data-trophees-n]', String(n)); set('[data-trophees-total]', String(total)); set('[data-trophees-pct]', pct(p));
    var ring = bilan.querySelector('[data-trophees-anneau]');
    if (ring) ring.style.setProperty('--p', p.toFixed(4));
    bilan.classList.toggle('is-complet', total > 0 && n === total);
    if (announce && live) {
      var label = bilan.querySelector('[data-trophees-libelle]');
      live.textContent = n + ' / ' + total + ' · ' + pct(p) + (label ? ' · ' + label.textContent.replace(/\s+/g, ' ').trim() : '');
    }
  }

  /* ---------- cases « Obtenu » ---------- */
  boxes.forEach(function (input) {
    var id = idOf(input), card = cardOf(input), wrap = input.closest('[data-trophees-case]') || input.parentNode;
    if (!okId(id)) return;
    input.checked = saved.indexOf(id) >= 0;
    card.classList.toggle('is-obtenu', input.checked);
    wrap.hidden = false;
    input.addEventListener('change', function () {
      card.classList.toggle('is-obtenu', input.checked);
      if (input.checked && !reduced()) {
        card.classList.remove('trophees-eclat');
        void card.offsetWidth;
        card.classList.add('trophees-eclat');
        window.setTimeout(function () { card.classList.remove('trophees-eclat'); }, 1100);
      }
      update(true);
      if (demo) return;
      var list = (read() || []).filter(function (x) { return x !== id; });
      if (input.checked) list.push(id);
      write(list);
    });
  });
  update(false);

  /* ---------- filtres ---------- */
  var filters = document.querySelector('[data-trophees-filtres]');
  var cards = Array.prototype.slice.call(document.querySelectorAll('[data-trophees-liste] [data-trophees-id]'));
  if (filters && cards.length) {
    var state = {};
    var groups = Array.prototype.slice.call(filters.querySelectorAll('[data-trophees-groupe]'));
    var count = document.querySelector('[data-trophees-visibles]');
    var apply = function () {
      var shown = 0;
      cards.forEach(function (c) {
        var ok = Object.keys(state).every(function (g) {
          var v = state[g];
          if (v === 'tous') return true;
          if (g === 'etat') return (v === 'obtenus') === c.classList.contains('is-obtenu');
          return c.getAttribute('data-' + g) === v;
        });
        c.hidden = !ok;
        if (ok) shown++;
      });
      if (count) count.textContent = String(shown);
    };
    groups.forEach(function (g) {
      var name = g.getAttribute('data-trophees-groupe'), btns = Array.prototype.slice.call(g.querySelectorAll('[data-trophees-valeur]'));
      state[name] = 'tous';
      btns.forEach(function (b, i) {
        b.addEventListener('click', function () {
          state[name] = b.getAttribute('data-trophees-valeur');
          btns.forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
          apply();
        });
        b.addEventListener('keydown', function (e) {
          var k = e.key, n = btns.length, j = -1;
          if (k === 'ArrowRight') j = (i + 1) % n; else if (k === 'ArrowLeft') j = (i - 1 + n) % n; else if (k === 'Home') j = 0; else if (k === 'End') j = n - 1;
          if (j < 0) return;
          e.preventDefault(); btns[j].focus(); btns[j].click();
        });
      });
    });
    boxes.forEach(function (input) { input.addEventListener('change', function () { if (state.etat && state.etat !== 'tous') apply(); }); });
    filters.hidden = false;
    apply();
  }

  /* ---------- arrivée des cartes, en cascade, quand la liste arrive à l’écran ---------- */
  var list = document.querySelector('[data-trophees-liste]');
  if (list && !reduced() && 'IntersectionObserver' in window) {
    list.classList.add('trophees-attend');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (!en.isIntersecting) return; io.disconnect(); list.classList.remove('trophees-attend'); list.classList.add('trophees-arrivee'); });
    }, { threshold: 0.1 });
    io.observe(list);
  }
})();
