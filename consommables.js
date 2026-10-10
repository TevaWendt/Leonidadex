/* v7.61 : pluriel selon la langue de la page : français n > 1 (« 0 coché », « 1,5 million ») ; anglais, espagnol n ≠ 1 (« 0 marcados ») */
var lkPluriel=function(n){return ((typeof document!=='undefined'&&document.documentElement&&document.documentElement.lang)||'fr').slice(0,2)==='fr'?n>1:n!==1;};
/* LEONIDAKIT — consommables « en un regard » : comparer trois objets au plus (v7.50, lot 3).
   Lit les faits déjà écrits dans les cartes (aucune donnée de jeu ajoutée ici). La simulation « coût par point de vie »
   n’utilise que les chiffres que TU écris, et le dit : sans les deux chiffres, rien n’est calculé (jamais un zéro). */
(function () {
  'use strict';
  var lkPl = function (n) { return /^fr/.test(document.documentElement.lang || "fr") ? n > 1 : n !== 1; }; /* pluriel selon la langue de la page (français : n > 1) */
  var lkDollars = function (s) { return /^(fr|de)/.test(document.documentElement.lang || "fr") ? s + "\u00a0$" : "$" + s; }; /* « 1 250 $ », « 1.250 $ » (allemand) ou « $1,250 » selon la langue de la page */
  var root = document.getElementById('en-un-regard'); if (!root) return;
  var tools = root.querySelector('[data-cg-tools]'), box = root.querySelector('[data-cg-compare]'), status = root.querySelector('[data-cg-status]');
  var checks = Array.prototype.slice.call(root.querySelectorAll('[data-cg-cmp]'));
  if (!tools || !box || !checks.length) return;
  tools.hidden = false; checks.forEach(function (c) { c.closest('label').hidden = false; });
  var sim = {}; // id → {price, heal} écrits par le joueur, pour cette visite seulement
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n; }
  function num(v) { var t = String(v || '').trim().replace(/[\s  ]/g, ''); t = /^fr/.test(document.documentElement.lang || 'fr') ? t.replace(',', '.') : /^de/.test(document.documentElement.lang) ? t.replace(/\.(?=\d{3}(?!\d))/g, '').replace(',', '.') : t.replace(/,/g, ''); if (!/^\d+(\.\d+)?$/.test(t)) return null; var n = Number(t); return Number.isFinite(n) ? n : null; }
  function facts(card) { var out = {}; Array.prototype.forEach.call(card.querySelectorAll('.cg-facts > div'), function (d) { out[d.querySelector('dt').textContent] = d.querySelector('dd').textContent; }); return out; }
  function chosen() { return checks.filter(function (c) { return c.checked; }).map(function (c) { return c.closest('.cg-card'); }); }
  function render() {
    var cards = chosen();
    checks.forEach(function (c) { c.disabled = !c.checked && cards.length >= 3; });
    status.textContent = cards.length ? cards.length + (lkPl(cards.length) ? ' sur 3 comparés.' : ' sur 3 comparé.') : 'Coche jusqu’à trois consommables pour les comparer.';
    box.hidden = cards.length < 2; box.replaceChildren();
    if (cards.length < 2) return;
    var table = el('table', 'cg-table'), cap = el('caption', null, 'Comparaison : ce qu’on sait de chaque consommable'), thead = el('thead'), tr = el('tr');
    tr.appendChild(el('th', null, 'Ce qu’on compare')); cards.forEach(function (c) { var th = el('th', null, c.querySelector('.cg-nom').textContent); th.scope = 'col'; tr.appendChild(th); });
    thead.appendChild(tr); table.appendChild(cap); table.appendChild(thead);
    var rows = ['À quoi ça sert', 'Prix', 'Vie rendue', 'Protection', 'Où'], F = cards.map(facts), tb = el('tbody');
    rows.forEach(function (r) { if (!F.some(function (f) { return r in f; })) return; var line = el('tr'), th = el('th', null, r); th.scope = 'row'; line.appendChild(th); F.forEach(function (f) { line.appendChild(el('td', null, f[r] || 'Ne s’applique pas')); }); tb.appendChild(line); });
    // Simulation personnelle : deux cases par objet, résultat seulement si les deux sont écrites.
    var s1 = el('tr', 'cg-sim'), s2 = el('tr', 'cg-sim'), s3 = el('tr', 'cg-sim-r');
    [[s1, 'Ton prix imaginé ($)', 'price'], [s2, 'Ta vie rendue imaginée (points)', 'heal']].forEach(function (x) {
      var th = el('th', null, x[1]); th.scope = 'row'; x[0].appendChild(th);
      cards.forEach(function (c) { var id = c.getAttribute('data-cg-id'), td = el('td'), inp = el('input'); inp.type = 'text'; inp.inputMode = 'decimal'; inp.maxLength = 12; inp.setAttribute('aria-label', x[1] + ' : ' + c.querySelector('.cg-nom').textContent); inp.value = sim[id] && sim[id][x[2]] !== undefined ? sim[id][x[2]] : ''; inp.addEventListener('input', function () { sim[id] = sim[id] || {}; sim[id][x[2]] = inp.value; result(); }); td.appendChild(inp); x[0].appendChild(td); });
    });
    var th3 = el('th', null, 'Coût par point de vie (ta simulation)'); th3.scope = 'row'; s3.appendChild(th3);
    var outs = cards.map(function () { var td = el('td', 'cg-out'); s3.appendChild(td); return td; });
    function result() { cards.forEach(function (c, i) { var id = c.getAttribute('data-cg-id'), p = num(sim[id] && sim[id].price), h = num(sim[id] && sim[id].heal); outs[i].textContent = p === null || h === null ? 'Écris les deux chiffres' : h === 0 ? 'Ne rend pas de vie : pas de coût par point' : lkDollars((Math.round(p / h * 100) / 100).toLocaleString('fr-FR')) + ' par point · simulation'; }); }
    tb.appendChild(s1); tb.appendChild(s2); tb.appendChild(s3); table.appendChild(tb); result();
    var wrap = el('div', 'cg-table-wrap'); wrap.tabIndex = 0; wrap.appendChild(table);
    box.appendChild(el('h3', 'ed-h3', 'Côte à côte'));
    var act = el('p', 'cg-actions-budget'); act.appendChild(budgetLink(cards)); act.appendChild(el('span', 'cg-note', ' Les prix de GTA VI ne sont pas publiés : le budget te les demandera.'));
    box.appendChild(wrap);
    box.appendChild(act);
    box.appendChild(el('p', 'cg-note', 'Les lignes du haut viennent des fiches. Les trois lignes du bas sont une simulation personnelle : tes chiffres, gardés le temps de la visite, jamais présentés comme ceux du jeu. Le plafond de vie et le gaspillage ne sont pas publiés : ils ne sont pas comptés.'));
  }
  /* v7.53 : la sélection part dans « Mon budget » (achats libres, prix à venir : jamais comptés à 0). */
  function budgetLink(cards) { var names = cards.map(function (c) { return c.querySelector('.cg-nom').textContent.trim(); }), a = el('a', 'cg-budget', 'Préparer ces achats dans mon budget');
    a.href = 'calculateurs.html?tool=budget&achats=' + encodeURIComponent(names.join('|')) + '&from=nourriture#atelier'; return a; }
  root.addEventListener('change', function (ev) { if (ev.target.hasAttribute('data-cg-cmp')) render(); });
  root.addEventListener('click', function (ev) { if (ev.target.closest('[data-cg-clear]')) { checks.forEach(function (c) { c.checked = false; }); render(); } });
  render();
}());

/* v7.79 (Téva : « une apparition des cartes ; plus de trou dans la dernière rangée ; les gilets pare-balles à part ») :
   - chaque carte « En un regard » entre à son arrivée à l'écran (classe is-in, cascade par rangée) ; une carte déjà dépassée
     est posée telle quelle (cg-still) ; sans IntersectionObserver ou en mouvement réduit, tout est posé ;
   - après un filtre, le nombre de cartes visibles de chaque grille est écrit dans data-cg-n : acquisitions.css choisit le
     nombre de colonnes pour que la dernière rangée reste centrée, sans trou ;
   - le rayon protection : pointer ou choisir un palier remplit la jauge d'armure du gilet à son niveau ; à l'arrivée, la jauge
     monte d'un palier à l'autre puis s'arrête au gilet complet. Aucune donnée ajoutée : les niveaux sont ceux des lignes. */
(function () {
  'use strict';
  var root = document.getElementById('en-un-regard'); if (!root) return;
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var each = function (list, fn) { Array.prototype.forEach.call(list, fn); };
  var grids = root.querySelectorAll('.cg-grid');
  /* colonnes : nombre de cartes visibles après filtre */
  function count() { each(grids, function (g) { var n = 0; each(g.children, function (c) { if (c.offsetParent !== null) n++; }); g.setAttribute('data-cg-n', String(n)); }); }
  root.addEventListener('change', function (ev) { if (ev.target.name === 'cg-f') { window.requestAnimationFrame(count); } });
  count();
  /* entrées */
  var cards = root.querySelectorAll('.cg-grid > .cg-card'), rack = root.querySelector('[data-rk]');
  var show = function (el) { el.classList.add('is-in'); };
  if (reduced || !('IntersectionObserver' in window)) { each(cards, show); if (rack) rack.classList.add('is-in'); }
  else {
    var io = new IntersectionObserver(function (entries) {
      var batch = entries.filter(function (e) { return e.isIntersecting; }).map(function (e) { return e.target; });
      batch.sort(function (a, b) { return a.compareDocumentPosition(b) & 4 ? -1 : 1; });
      batch.forEach(function (el, k) {
        if (el.getBoundingClientRect().bottom < 0) el.classList.add('cg-still');
        if (el.classList.contains('cg-card')) el.style.setProperty('--d', Math.min(k, 7) * 80 + 'ms');
        show(el); io.unobserve(el);
        if (el.hasAttribute('data-rk')) demo(el);
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.1 });
    each(cards, function (c) { io.observe(c); });
    if (rack) io.observe(rack);
  }
  /* le rayon protection */
  if (!rack) return;
  var tiers = rack.querySelectorAll('.rk-tier'), val = rack.querySelector('[data-rk-val]'), name = rack.querySelector('[data-rk-name]');
  var chosen = null, timer = 0;
  function set(tier) {
    var lvl = tier.getAttribute('data-rk-level'), nom = tier.querySelector('.rk-nom');
    rack.style.setProperty('--lvl', lvl);
    if (val) val.textContent = lvl;
    if (name && nom) name.textContent = nom.textContent;
    each(tiers, function (t) { t.classList.toggle('is-on', t === tier); var b = t.querySelector('.rk-pick'); if (b) b.setAttribute('aria-pressed', t === tier ? 'true' : 'false'); });
  }
  function demo(el) {
    if (reduced || !tiers.length) return;
    rack.style.setProperty('--lvl', '0'); if (val) val.textContent = '0'; if (name) name.textContent = '';
    var i = 0;
    var step = function () { set(tiers[i]); i++; if (i < tiers.length) timer = window.setTimeout(step, 420); else { chosen = tiers[tiers.length - 1]; } };
    timer = window.setTimeout(step, 450);
  }
  each(tiers, function (t) {
    var b = t.querySelector('.rk-pick'); if (!b) return;
    b.addEventListener('click', function () { window.clearTimeout(timer); chosen = t; set(t); });
    t.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') { window.clearTimeout(timer); set(t); } });
    t.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse' && chosen) set(chosen); });
    b.addEventListener('focus', function () { set(t); });
  });
  if (tiers.length) { chosen = tiers[tiers.length - 1]; if (reduced || !('IntersectionObserver' in window)) set(chosen); else { rack.style.setProperty('--lvl', '0'); if (val) val.textContent = '0'; } }
}());
