/* LEONIDAKIT — consommables « en un regard » : comparer trois objets au plus (v7.50, lot 3).
   Lit les faits déjà écrits dans les cartes (aucune donnée de jeu ajoutée ici). La simulation « coût par point de vie »
   n’utilise que les chiffres que TU écris, et le dit : sans les deux chiffres, rien n’est calculé (jamais un zéro). */
(function () {
  'use strict';
  var root = document.getElementById('en-un-regard'); if (!root) return;
  var tools = root.querySelector('[data-cg-tools]'), box = root.querySelector('[data-cg-compare]'), status = root.querySelector('[data-cg-status]');
  var checks = Array.prototype.slice.call(root.querySelectorAll('[data-cg-cmp]'));
  if (!tools || !box || !checks.length) return;
  tools.hidden = false; checks.forEach(function (c) { c.closest('label').hidden = false; });
  var sim = {}; // id → {price, heal} écrits par le joueur, pour cette visite seulement
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n; }
  function num(v) { var t = String(v || '').trim().replace(/[\s  ]/g, '').replace(',', '.'); if (!/^\d+(\.\d+)?$/.test(t)) return null; var n = Number(t); return Number.isFinite(n) ? n : null; }
  function facts(card) { var out = {}; Array.prototype.forEach.call(card.querySelectorAll('.cg-facts > div'), function (d) { out[d.querySelector('dt').textContent] = d.querySelector('dd').textContent; }); return out; }
  function chosen() { return checks.filter(function (c) { return c.checked; }).map(function (c) { return c.closest('.cg-card'); }); }
  function render() {
    var cards = chosen();
    checks.forEach(function (c) { c.disabled = !c.checked && cards.length >= 3; });
    status.textContent = cards.length ? cards.length + ' sur 3 comparé' + (cards.length > 1 ? 's' : '') + '.' : 'Coche jusqu’à trois consommables pour les comparer.';
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
    function result() { cards.forEach(function (c, i) { var id = c.getAttribute('data-cg-id'), p = num(sim[id] && sim[id].price), h = num(sim[id] && sim[id].heal); outs[i].textContent = p === null || h === null ? 'Écris les deux chiffres' : h === 0 ? 'Ne rend pas de vie : pas de coût par point' : (Math.round(p / h * 100) / 100).toLocaleString('fr-FR') + ' $ par point · simulation'; }); }
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
