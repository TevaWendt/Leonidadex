/* LEONIDAKIT — sélecteur illustré « Où le trouver » (v7.50, lot 3).
   Balisage produit par outils/localisateur.cjs. Ce script : recherche, filtre de catégorie, choix d’un objet, résumé
   synchronisé (ce qui est sélectionné, ce qui est montré), repères de la carte mis en évidence, lieux en texte.
   Le choix est gardé pour la visite (sessionStorage, clé « lk_loc_<type> ») : revenir en arrière retrouve le même objet.
   Rien n’est écrit en HTML depuis les données : tout passe par textContent. Sans script, le premier objet reste montré. */
(function () {
  'use strict';
  function fold(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n; }
  function store(kind) {
    var k = 'lk_loc_' + kind;
    return {
      get: function () { try { return JSON.parse(sessionStorage.getItem(k) || 'null'); } catch (e) { return null; } },
      set: function (v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* stockage indisponible : le choix vaut pour cette page */ } }
    };
  }
  function init(root) {
    var kind = root.getAttribute('data-lk-loc'), memo = store(kind);
    var items = Array.prototype.slice.call(root.querySelectorAll('[data-loc-id]'));
    var chips = Array.prototype.slice.call(root.querySelectorAll('[data-loc-catf]'));
    var q = root.querySelector('[data-loc-q]'), count = root.querySelector('[data-loc-count]'), empty = root.querySelector('[data-loc-empty]');
    var sum = root.querySelector('[data-loc-sum]'), pins = Array.prototype.slice.call(root.querySelectorAll('.lk-loc-pin'));
    var scope = root.closest('section') || root, rows = Array.prototype.slice.call(scope.querySelectorAll('a.ed-place[href*="#lieu="]'));
    var noun = (count && count.textContent.replace(/^\d+\s*/, '')) || '';
    var names = {};
    pins.forEach(function (p) { names[p.getAttribute('data-place')] = p.getAttribute('data-name') || p.getAttribute('data-place'); });
    function placeOf(a) { return decodeURIComponent((a.getAttribute('href') || '').split('#lieu=')[1] || ''); }
    var state = { cat: '', q: '', raw: '', id: null };
    function visible(it) {
      return (!state.cat || it.getAttribute('data-loc-cat') === state.cat) && (!state.q || it.getAttribute('data-loc-q').indexOf(state.q) >= 0);
    }
    function filter() {
      var n = 0;
      items.forEach(function (it) { var on = visible(it); it.parentNode.hidden = !on; if (on) n += 1; });
      if (count) count.textContent = n + ' ' + noun;
      if (empty) empty.hidden = n > 0;
      chips.forEach(function (c) { c.setAttribute('aria-pressed', String(c.getAttribute('data-loc-catf') === state.cat)); });
    }
    function render(it) {
      var linked = (it.getAttribute('data-loc-places') || '').split(',').filter(Boolean);
      pins.forEach(function (p) { var on = linked.indexOf(p.getAttribute('data-place')) >= 0; p.classList.toggle('is-on', on); p.classList.toggle('is-off', !on); });
      rows.forEach(function (a) { a.classList.toggle('is-linked', linked.indexOf(placeOf(a)) >= 0); });
      if (!sum) return;
      var box = el('div', 'lk-loc-sum-in'), th = el('span', 'lk-loc-sum-thumb'), src = it.querySelector('.lk-loc-thumb');
      if (src) th.innerHTML = src.innerHTML; // vignette déjà présente dans la page (générée), pas une donnée saisie
      var t = el('div', 'lk-loc-sum-t');
      t.appendChild(el('p', 'lk-loc-kicker', it.getAttribute('data-loc-catlabel')));
      t.appendChild(el('p', 'lk-loc-name', it.querySelector('.lk-loc-txt b').textContent));
      var st = el('p', 'lk-loc-status'); st.appendChild(el('b', null, 'Où ' + (it.getAttribute('data-loc-pronoun') || 'le') + ' trouver :')); st.appendChild(document.createTextNode(' ' + it.getAttribute('data-loc-status'))); t.appendChild(st);
      t.appendChild(el('p', 'lk-loc-note', linked.length ? it.getAttribute('data-loc-linked') + ' ' + linked.map(function (id) { return names[id] || id; }).join(', ') + '.' : it.getAttribute('data-loc-none')));
      var act = el('p', 'lk-loc-actions'), a = el('a', 'lk-loc-btn lk-loc-btn--main', 'Ouvrir la fiche'); a.href = it.getAttribute('data-loc-url'); act.appendChild(a);
      if (linked.length) { var m = el('a', 'lk-loc-btn', 'Voir ces lieux sur la carte'); m.href = (root.getAttribute('data-loc-prefix') || '') + 'carte.html#pins=' + linked.map(encodeURIComponent).join(',') + '&t=' + encodeURIComponent(it.getAttribute('data-loc-title')); act.appendChild(m); }
      t.appendChild(act); box.appendChild(th); box.appendChild(t);
      sum.replaceChildren(box);
      sum.classList.remove('is-fresh'); void sum.offsetWidth; sum.classList.add('is-fresh');
    }
    function select(it, save) {
      if (!it) return;
      items.forEach(function (x) { x.setAttribute('aria-pressed', String(x === it)); });
      state.id = it.getAttribute('data-loc-id');
      render(it);
      if (save) memo.set(state);
    }
    root.addEventListener('click', function (ev) {
      var b = ev.target.closest('button'); if (!b || !root.contains(b)) return;
      if (b.hasAttribute('data-loc-id')) { select(b, true); return; }
      if (b.hasAttribute('data-loc-catf')) { state.cat = b.getAttribute('data-loc-catf'); filter(); memo.set(state); return; }
      if (b.hasAttribute('data-loc-reset')) { state.cat = ''; state.q = ''; state.raw = ''; if (q) q.value = ''; filter(); memo.set(state); }
    });
    if (q) q.addEventListener('input', function () { state.raw = q.value.slice(0, 80); state.q = fold(state.raw.trim()); filter(); memo.set(state); });
    // Retour sur la page : même objet, même filtre.
    var saved = memo.get();
    if (saved && typeof saved === 'object') {
      state.cat = chips.some(function (c) { return c.getAttribute('data-loc-catf') === saved.cat; }) ? saved.cat : '';
      state.raw = typeof saved.raw === 'string' ? saved.raw.slice(0, 80) : '';
      state.q = fold(state.raw.trim());
      if (q && state.raw) q.value = state.raw;
      filter();
      var again = items.filter(function (x) { return x.getAttribute('data-loc-id') === saved.id; })[0];
      select(again || items.filter(function (x) { return x.getAttribute('aria-pressed') === 'true'; })[0], false);
    } else { filter(); select(items.filter(function (x) { return x.getAttribute('aria-pressed') === 'true'; })[0] || items[0], false); }
    root.classList.add('is-ready');
  }
  function start() { Array.prototype.forEach.call(document.querySelectorAll('[data-lk-loc]'), init); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
}());
