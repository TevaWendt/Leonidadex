/* Outils complémentaires du calculateur : aucune donnée du jeu n'est présumée. */
(function (global) {
  'use strict';
  var budgetNames = ['Véhicules', 'Investissements', 'Équipement', 'Consommables', 'Autres achats'];
  var colors = ['#a9cf57', '#d99eae', '#7fadb0', '#d6b76b', '#a89ac5', '#60705d', '#dfe8ce'];
  var defaults = {
    roi: { purchase: 500000, upgrades: 0, fees: 0, revenueHourly: 90000, costHourly: 15000, hours: 10 },
    budget: { capital: 200000, reserve: 30000, allocations: [50000, 60000, 20000, 10000, 0] },
    order: {
      capital: 200000, hourly: 50000,
      items: [
        { name: 'Véhicule', price: 100000, boostHourly: 0 },
        { name: 'Investissement', price: 150000, boostHourly: 25000 },
        { name: 'Équipement', price: 30000, boostHourly: 0 }
      ]
    }
  };
  function section(id, content) {
    return '<section id="panel-' + id + '" class="calc-panel" role="tabpanel" aria-labelledby="tab-' + id + '" tabindex="0" hidden>' + content + '</section>';
  }
  function markup(state, h) {
    var roi = state.roi, budget = state.budget, order = state.order;
    var roiFields = [
      ['purchase', 'Prix d’achat ($)', { step: 1000 }],
      ['upgrades', 'Améliorations ($)', { step: 1000 }],
      ['fees', 'Frais initiaux ($)', { step: 100 }],
      ['hours', 'Durée d’exploitation (h)', { step: 0.5, max: 16666 }],
      ['revenueHourly', 'Revenus bruts ($/h)', { step: 1000 }],
      ['costHourly', 'Coûts récurrents ($/h)', { step: 1000 }]
    ].map(function (f) { return h.field('roi.' + f[0], f[1], roi[f[0]], f[2]); }).join('');
    var roiPanel = section('roi', '<div class="calc-grid"><div class="calc-card"><p class="calc-kicker">RENTABILITÉ</p><h3>Quand ton achat se rembourse-t-il ?</h3>' +
      '<p class="calc-card-desc">Entre tes hypothèses de coûts et de revenus. Le rythme est supposé constant pendant les heures d’exploitation.</p><div class="calc-fields">' + roiFields + '</div>' +
      '<p class="calc-note">Investissement = achat + améliorations + frais initiaux. Bénéfice horaire = revenus bruts − coûts récurrents. Le ROI déduit aussi l’investissement initial : à l’amortissement, il vaut 0 %.</p></div>' +
      '<div id="roi-results" class="calc-card calc-result" aria-live="polite" aria-atomic="true"></div></div>');
    var budgetFields = h.field('budget.capital', 'Capital disponible ($)', budget.capital, { step: 1000 }) + h.field('budget.reserve', 'Réserve à conserver ($)', budget.reserve, { step: 1000 });
    budgetFields += budget.allocations.map(function (value, index) { return h.field('budget.allocations.' + index, budgetNames[index] + ' ($)', value, { step: 1000 }); }).join('');
    var budgetPanel = section('budget', '<div class="calc-grid"><div class="calc-card"><p class="calc-kicker">BUDGET</p><h3>Répartis ton capital</h3>' +
      '<p class="calc-card-desc">Prévois tes achats tout en gardant une réserve. Tous les montants sont tes estimations personnelles.</p><div class="calc-fields">' + budgetFields + '</div>' +
      '<p class="calc-note">La réserve reste dans ton portefeuille. Le montant disponible pour d’autres achats la déduit ; aucun revenu futur n’est anticipé.</p></div>' +
      '<div id="budget-results" class="calc-card" aria-live="polite" aria-atomic="true"></div></div>');
    var orderFields = h.field('order.capital', 'Capital de départ ($)', order.capital, { step: 1000 }) + h.field('order.hourly', 'Bénéfice net initial ($/h)', order.hourly, { step: 1000 });
    var itemFields = order.items.map(function (item, index) {
      return '<fieldset class="calc-fields three"><legend>Achat ' + (index + 1) + '</legend>' +
        h.field('order.items.' + index + '.name', 'Nom', item.name, { type: 'text' }) +
        h.field('order.items.' + index + '.price', 'Coût total ($)', item.price, { step: 1000 }) +
        h.field('order.items.' + index + '.boostHourly', 'Gain net supplémentaire ($/h)', item.boostHourly, { step: 1000, hint: 'Mets 0 si cet achat ne rapporte rien.' }) + '</fieldset>';
    }).join('');
    var orderPanel = section('order', '<div class="calc-card"><p class="calc-kicker">ORDRE D’ACHAT</p><h3>Deux parcours, le même panier</h3>' +
      '<p class="calc-card-desc">Compare l’ordre saisi avec son inverse. Chaque achat intervient dès qu’il est finançable ; son éventuel gain horaire commence aussitôt.</p>' +
      '<div class="calc-fields">' + orderFields + '</div>' + itemFields +
      '<p class="calc-note">Les gains supplémentaires sont des hypothèses personnelles. Ils s’ajoutent au rythme initial seulement si ton scénario permet réellement ce cumul, par exemple un revenu passif compatible. Ces deux ordres ne constituent pas une recherche exhaustive du meilleur parcours.</p></div>' +
      '<div id="order-results" aria-live="polite" aria-atomic="true"></div>');
    return roiPanel + budgetPanel + orderPanel;
  }
  function percent(value) {
    return value === null ? 'Non applicable' : value.toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' %';
  }
  function roiChart(input, result, h) {
    if (input.hours <= 0) return '<p class="calc-note">Renseigne une durée positive pour afficher l’évolution du bénéfice.</p>';
    var left = 65, right = 420, top = 22, bottom = 172;
    var low = Math.min(0, -result.investment, result.netProfit), high = Math.max(0, -result.investment, result.netProfit);
    var span = high - low || 1, pad = span * 0.13;
    low -= pad; high += pad;
    var y = function (v) { return bottom - (v - low) / (high - low) * (bottom - top); };
    var x = function (v) { return left + v / input.hours * (right - left); };
    var zero = y(0), start = y(-result.investment), end = y(result.netProfit);
    var marker = '';
    if (result.paybackHours !== null && result.paybackHours <= input.hours) {
      var px = x(result.paybackHours);
      marker = '<line x1="' + px + '" x2="' + px + '" y1="' + (zero + 6) + '" y2="' + bottom + '" stroke="#d8a5b0" stroke-dasharray="4 4"/>' +
        '<circle cx="' + px + '" cy="' + zero + '" r="4" fill="#efb2c1"/>';
    }
    var title = 'Bénéfice après investissement, de ' + h.money(-result.investment) + ' à ' + h.money(result.netProfit) + ' en ' + h.hours(input.hours) + '.';
    return '<figure class="calc-chart"><svg viewBox="0 0 445 204" role="img" aria-labelledby="roi-chart-title roi-chart-desc"><title id="roi-chart-title">Évolution du bénéfice net cumulé</title>' +
      '<desc id="roi-chart-desc">' + h.esc(title + ' La ligne horizontale indique zéro. Le point rose indique l’amortissement quand il se trouve dans la durée choisie.') + '</desc>' +
      '<line class="gridline" x1="' + left + '" x2="' + right + '" y1="' + top + '" y2="' + top + '"/>' +
      '<line class="gridline" x1="' + left + '" x2="' + right + '" y1="' + bottom + '" y2="' + bottom + '"/>' +
      '<line x1="' + left + '" x2="' + right + '" y1="' + zero + '" y2="' + zero + '" stroke="#b3c1b7" stroke-dasharray="4 4"/>' +
      '<text x="' + (left - 8) + '" y="' + (zero + 3) + '" text-anchor="end">0 $</text>' +
      '<path class="path" d="M ' + left + ' ' + start + ' L ' + right + ' ' + end + '"/>' + marker +
      '<circle cx="' + right + '" cy="' + end + '" r="4" fill="#F5A524"/>' +
      '<text x="' + left + '" y="195">0 h</text><text x="' + right + '" y="195" text-anchor="end">' + h.esc(h.hours(input.hours)) + '</text></svg>' +
      '<figcaption class="calc-chart-note"><span>Bénéfice cumulé après investissement</span><span>Rose : amortissement</span></figcaption></figure>';
  }
  function renderRoi(input, h) {
    var r = h.E.roi(input);
    if (!r.valid) return h.warning(r.reason);
    var payback = r.paybackHours === null ? 'Non atteint' : h.hours(r.paybackHours);
    var extra = r.netHourly <= 0 && r.investment > 0 ? h.warning('Le bénéfice horaire est nul ou négatif : cet investissement ne s’amortit pas avec ces hypothèses.') : '';
    return '<p class="calc-kicker">AMORTISSEMENT ESTIMÉ</p><div class="calc-result-main">' + h.esc(payback) + '</div>' +
      '<p class="calc-result-sub">Pour récupérer ' + h.esc(h.money(r.investment)) + ' de mise initiale.</p>' +
      h.stats([['Bénéfice net horaire', h.money(r.netHourly) + '/h'], ['Bénéfice après investissement', h.money(r.netProfit)], ['ROI à ' + h.hours(input.hours), percent(r.roiPercent)]]) +
      roiChart(input, r, h) + extra + '<p class="calc-note">Sur ' + h.esc(h.hours(input.hours)) + ' : ' + h.esc(h.money(r.grossProfit)) + ' de recettes brutes, ' + h.esc(h.money(r.operatingProfit)) +
      ' après coûts récurrents, puis ' + h.esc(h.money(r.netProfit)) + ' après la mise initiale. ROI = ce dernier montant ÷ investissement × 100.' +
      (r.roiPercent === null ? ' Le ROI n’est pas applicable lorsque l’investissement est nul.' : '') + '</p>';
  }
  function renderBudget(input, h) {
    var r = h.E.budget(input);
    if (!r.valid) return h.warning(r.reason);
    var amounts = input.allocations.concat([input.reserve, Math.max(0, r.available)]);
    var names = budgetNames.concat(['Réserve conservée', 'Disponible']);
    var scale = Math.max(input.capital, r.spent + input.reserve, 1);
    var bars = amounts.map(function (value, i) { return value > 0 ? '<span style="width:' + (value / scale * 100).toFixed(5) + '%;background:' + colors[i] + '"></span>' : ''; }).join('');
    var legend = amounts.map(function (value, i) {
      return '<div><i aria-hidden="true" style="background:' + colors[i] + '"></i>' + h.esc(names[i]) + ' : <strong>' + h.esc(h.money(value)) + '</strong></div>';
    }).join('');
    return '<p class="calc-kicker">TA RÉPARTITION</p><h3>' + (r.overBudget ? 'Le budget doit être ajusté' : 'Ta réserve est préservée') + '</h3>' +
      h.stats([['Achats prévus', h.money(r.spent)], ['Après les achats', h.money(r.remaining)], ['Hors réserve', h.money(r.available)]]) +
      '<div class="calc-budget-bars" aria-hidden="true">' + bars + '</div><div class="calc-legend">' + legend + '</div>' +
      (r.overBudget ? '<div style="margin-top:20px">' + h.warning('Il manque ' + h.money(-r.available) + ' pour financer ces achats et conserver ta réserve. La barre représente le budget total nécessaire.') + '</div>' : '') +
      '<p class="calc-note">Capital ' + h.esc(h.money(input.capital)) + ' − achats ' + h.esc(h.money(r.spent)) + ' − réserve ' + h.esc(h.money(input.reserve)) + ' = ' + h.esc(h.money(r.available)) + ' disponibles.</p>';
  }
  function orderCard(name, result, h) {
    if (!result.valid) return '<article class="calc-card"><p class="calc-kicker">' + name + '</p>' + h.warning(result.reason) + '</article>';
    var steps = result.steps.map(function (step, i) {
      return '<li><b>' + (i + 1) + '. ' + h.esc(step.name) + '</b><span>Acheté à ' + h.esc(h.hours(step.timeHours)) + '<br>Attente : ' + h.esc(h.hours(step.waitHours)) + '<br>Rythme ensuite : ' + h.esc(h.money(step.hourly)) + '/h</span></li>';
    }).join('');
    return '<article class="calc-card"><p class="calc-kicker">' + name + '</p><h3>Panier complet en ' + h.esc(h.hours(result.totalHours)) + '</h3><ol class="calc-order-steps">' + steps + '</ol>' +
      h.stats([['Durée totale', h.hours(result.totalHours)], ['Capital final', h.money(result.finalCapital)], ['Bénéfice final', h.money(result.finalHourly) + '/h']]) + '</article>';
  }
  function renderOrder(input, h) {
    var a = h.E.order(input), b = h.E.order({ capital: input.capital, hourly: input.hourly, items: input.items.slice().reverse() });
    var comparison = '';
    if (a.valid && b.valid) {
      var delta = a.totalHours - b.totalHours;
      comparison = Math.abs(delta) < 1e-9 ? 'Les deux parcours prennent le même temps avec ces hypothèses.' :
        'Le parcours ' + (delta > 0 ? 'B' : 'A') + ' termine les trois achats ' + h.hours(Math.abs(delta)) + ' plus tôt avec ces hypothèses.';
      comparison = '<p class="calc-note">' + h.esc(comparison) + ' Le résultat compare le temps jusqu’au dernier achat ; il ne mesure pas l’utilité de chaque achat pendant la progression.</p>';
    }
    return comparison + '<div class="calc-grid" style="margin-top:20px">' + orderCard('A · ORDRE SAISI', a, h) + orderCard('B · ORDRE INVERSÉ', b, h) + '</div>';
  }
  function render(state, helpers) {
    [['roi-results', renderRoi, state.roi], ['budget-results', renderBudget, state.budget], ['order-results', renderOrder, state.order]].forEach(function (item) {
      var node = document.getElementById(item[0]);
      if (node) node.innerHTML = item[1](item[2], helpers) + (item[0] === 'budget-results' && helpers.E.budget(state.budget).valid ? '<p class="calc-note">Après ces achats, il reste '+helpers.esc(helpers.money(helpers.E.budget(state.budget).remaining))+' de capital face à ton objectif de '+helpers.esc(helpers.money(state.goal.target))+'. Le budget ne modifie pas automatiquement cet objectif.</p>' : '');
    });
  }
  global.LKCalcTools = { defaults: defaults, markup: markup, render: render };
})(window);
