/* Outils complémentaires du calculateur : aucune donnée du jeu n'est présumée. */
(function (global) {
  'use strict';
  var budgetNames = ['Véhicules', 'Investissements', 'Équipement', 'Consommables', 'Autres achats'];
  var colors = ['#E8452C', '#F5A524', '#5A2358', '#B93220', '#8E2F4C', '#2B1B4D', '#DFD9CC'];
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
  function step(n, q, inner, h) { return '<div class="calc-step wide" data-step="' + n + '" data-question="' + h.esc(q) + '"><span class="calc-step-n" aria-hidden="true">' + n + '</span><div class="calc-step-body">' + inner + '</div></div>'; }
  function markup(state, h) {
    var roi = state.roi, budget = state.budget, order = state.order;
    var roiFields = [
      ['purchase', 'Ça coûte ($)', { step: 1000 }],
      ['upgrades', 'Améliorations ($)', { step: 1000 }],
      ['fees', 'Frais à payer au début ($)', { step: 100 }],
      ['hours', 'Je m’en sers pendant (heures de jeu)', { step: 0.5, max: 16666 }],
      ['revenueHourly', 'Ça me rapporte ($ par heure)', { step: 1000 }],
      ['costHourly', 'Ça me coûte ($ par heure)', { step: 1000 }]
    ].map(function (f) { return h.field('roi.' + f[0], f[1], roi[f[0]], f[2]); });
    var roiSteps = step(1, 'Ça coûte combien ?', '<div class="calc-fields">' + roiFields[0] + roiFields[1] + roiFields[2] + '</div>', h) + step(2, 'Ça rapporte combien, et ça coûte combien à faire tourner ?', '<div class="calc-fields">' + roiFields[4] + roiFields[5] + '</div>', h) + step(3, 'Tu t’en sers pendant combien de temps ?', roiFields[3], h);
    var roiPanel = section('roi', '<div class="calc-grid"><div class="calc-card"><p class="calc-kicker">ÇA VAUT LE COUP ?</p><h3>Quand est-ce que mon achat est remboursé ?</h3>' +
      '<p class="calc-card-desc">Écris ce que ton achat coûte et ce qu’il te rapporte. On suppose qu’il rapporte toujours pareil.</p><div class="calc-fields calc-steps">' + roiSteps + '</div>' +
      '<p class="calc-note">Dépense de départ = prix + améliorations + frais du début. Gain par heure = ce que ça rapporte − ce que ça coûte. « Remboursé » veut dire : l’achat t’a rapporté autant qu’il t’a coûté.</p></div>' +
      '<div id="roi-results" class="calc-card calc-result" aria-live="polite" aria-atomic="true"></div></div>');
    var budgetFields = step(1, 'Combien as-tu ?', '<div class="calc-fields">' + h.field('budget.capital', 'J’ai déjà ($)', budget.capital, { step: 1000 }) + h.field('budget.reserve', 'Argent que je garde de côté ($)', budget.reserve, { step: 1000 }) + '</div>', h);
    budgetFields += step(2, 'Combien pour chaque chose ?', '<div class="calc-fields">' + budget.allocations.map(function (value, index) { return h.field('budget.allocations.' + index, budgetNames[index] + ' ($)', value, { step: 1000 }); }).join('') + '</div>', h);
    var budgetPanel = section('budget', '<div class="calc-grid"><div class="calc-card"><p class="calc-kicker">MON BUDGET</p><h3>Je partage mon argent</h3>' +
      '<p class="calc-card-desc">Écris combien tu veux dépenser pour chaque chose. On te dit ce qu’il te reste.</p><div class="calc-fields calc-steps">' + budgetFields + '</div>' +
      '<p class="calc-note">L’argent mis de côté reste à toi : on ne le dépense pas. On ne compte pas l’argent que tu gagneras plus tard.</p></div>' +
      '<div id="budget-results" class="calc-card calc-result" aria-live="polite" aria-atomic="true"></div></div>');
    var orderFields = step(1, 'Combien as-tu, et combien gagnes-tu ?', '<div class="calc-fields">' + h.field('order.capital', 'J’ai déjà ($)', order.capital, { step: 1000 }) + h.field('order.hourly', 'Je gagne à peu près ($ par heure de jeu)', order.hourly, { step: 1000 }) + '</div>', h);
    var itemFields = order.items.map(function (item, index) {
      return step(index + 2, 'Achat ' + (index + 1) + ' : c’est quoi, et ça coûte combien ?', '<fieldset class="calc-fields three"><legend>Achat ' + (index + 1) + '</legend>' +
        h.field('order.items.' + index + '.name', 'Nom', item.name, { type: 'text' }) +
        h.field('order.items.' + index + '.price', 'Ça coûte ($)', item.price, { step: 1000 }) +
        h.field('order.items.' + index + '.boostHourly', 'Me fait gagner en plus ($ par heure)', item.boostHourly, { step: 1000, hint: 'Mets 0 si cet achat ne rapporte rien.' }) + '</fieldset>', h);
    }).join('');
    var orderPanel = section('order', '<div class="calc-card"><p class="calc-kicker">QUOI ACHETER D’ABORD ?</p><h3>Trois achats, deux ordres possibles</h3>' +
      '<p class="calc-card-desc">On compare ton ordre avec l’ordre inverse. Tu achètes chaque chose dès que tu as assez d’argent. Si un achat te fait gagner plus, ça compte tout de suite.</p>' +
      '<div class="calc-fields calc-steps">' + orderFields + itemFields + '</div>' +
      '<p class="calc-note">Ce que chaque achat « fait gagner en plus », c’est ton chiffre à toi. On compare seulement ces deux ordres, pas tous les ordres possibles.</p></div>' +
      '<div id="order-results" aria-live="polite" aria-atomic="true"></div>');
    return roiPanel + budgetPanel + orderPanel;
  }
  function percent(value) {
    return value === null ? 'Pas de pourcentage' : value.toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' %';
  }
  function roiChart(input, result, h) {
    if (input.hours <= 0) return '<p class="calc-note">Écris un nombre d’heures plus grand que 0 pour voir la courbe.</p>';
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
      marker = '<line x1="' + px + '" x2="' + px + '" y1="' + (zero + 6) + '" y2="' + bottom + '" stroke="#F5A524" stroke-dasharray="4 4"/>' +
        '<circle cx="' + px + '" cy="' + zero + '" r="4" fill="#F5A524"/>';
    }
    var title = 'Gain, prix de départ enlevé : de ' + h.money(-result.investment) + ' à ' + h.money(result.netProfit) + ' en ' + h.hours(input.hours) + '.';
    return '<figure class="calc-chart"><svg viewBox="0 0 445 204" role="img" aria-labelledby="roi-chart-title roi-chart-desc"><title id="roi-chart-title">Ce que l’achat t’a rapporté au fil du temps</title>' +
      '<desc id="roi-chart-desc">' + h.esc(title + ' La ligne horizontale indique zéro. Le point ambre indique le moment où l’achat est remboursé quand il se trouve dans la durée choisie.') + '</desc>' +
      '<line class="gridline" x1="' + left + '" x2="' + right + '" y1="' + top + '" y2="' + top + '"/>' +
      '<line class="gridline" x1="' + left + '" x2="' + right + '" y1="' + bottom + '" y2="' + bottom + '"/>' +
      '<line x1="' + left + '" x2="' + right + '" y1="' + zero + '" y2="' + zero + '" stroke="#DFD9CC" stroke-dasharray="4 4"/>' +
      '<text x="' + (left - 8) + '" y="' + (zero + 3) + '" text-anchor="end">0 $</text>' +
      '<path class="path" d="M ' + left + ' ' + start + ' L ' + right + ' ' + end + '"/>' + marker +
      '<circle cx="' + right + '" cy="' + end + '" r="4" fill="#F5A524"/>' +
      '<text x="' + left + '" y="195">0 h</text><text x="' + right + '" y="195" text-anchor="end">' + h.esc(h.hours(input.hours)) + '</text></svg>' +
      '<figcaption class="calc-chart-note"><span>Ce que l’achat t’a rapporté, prix enlevé</span><span>Point ambre : achat remboursé</span></figcaption></figure>';
  }
  function renderRoi(input, h) {
    var r = h.E.roi(input);
    if (!r.valid) return h.warning(r.reason);
    var payback = r.paybackHours === null ? 'Jamais' : h.hours(r.paybackHours);
    var extra = r.netHourly <= 0 && r.investment > 0 ? h.warning('Cet achat te coûte autant ou plus qu’il ne te rapporte : il ne sera jamais remboursé avec ces chiffres.') : '';
    var answer = r.investment === 0 ? 'Cet achat ne coûte rien au départ : il rapporte dès la première heure.' : r.paybackHours === null ? 'Avec ces chiffres, cet achat n’est <b>jamais remboursé</b>.' : 'Cet achat est remboursé après <b>' + h.esc(h.hours(r.paybackHours)) + '</b> de jeu.' + (r.netProfit > 0 ? ' Après ' + h.esc(h.hours(input.hours)) + ', il t’a rapporté <b>' + h.esc(h.money(r.netProfit)) + '</b> en plus de son prix.' : '');
    return '<p class="calc-kicker">MA RÉPONSE</p><span class="calc-tag">CALCULÉ AVEC TES CHIFFRES</span><p class="calc-answer" data-short="' + h.esc(r.paybackHours === null ? 'Jamais remboursé' : 'Remboursé : ' + h.hours(r.paybackHours)) + '">' + answer + '</p><p class="calc-kicker">REMBOURSÉ APRÈS</p><div class="calc-result-main">' + h.esc(payback) + '</div>' +
      '<p class="calc-result-sub">de jeu pour regagner les ' + h.esc(h.money(r.investment)) + ' dépensés au départ.</p>' +
      h.stats([['Gain par heure', h.money(r.netHourly) + '/h'], ['Gagné au final, prix enlevé', h.money(r.netProfit)], ['Gagné en % du prix, après ' + h.hours(input.hours), percent(r.roiPercent)]]) +
      roiChart(input, r, h) + extra + '<p class="calc-note">Sur ' + h.esc(h.hours(input.hours)) + ' : ' + h.esc(h.money(r.grossProfit)) + ' rapportés, ' + h.esc(h.money(r.operatingProfit)) +
      ' une fois les coûts payés, puis ' + h.esc(h.money(r.netProfit)) + ' une fois le prix de départ enlevé. Le pourcentage = ce dernier montant ÷ le prix de départ × 100.' +
      (r.roiPercent === null ? ' Pas de pourcentage quand le prix de départ est 0.' : '') + '</p>';
  }
  function renderBudget(input, h) {
    var r = h.E.budget(input);
    if (!r.valid) return h.warning(r.reason);
    var amounts = input.allocations.concat([input.reserve, Math.max(0, r.available)]);
    var names = budgetNames.concat(['Argent gardé de côté', 'Il me reste']);
    var scale = Math.max(input.capital, r.spent + input.reserve, 1);
    var bars = amounts.map(function (value, i) { return value > 0 ? '<span style="width:' + (value / scale * 100).toFixed(5) + '%;background:' + colors[i] + '"></span>' : ''; }).join('');
    var legend = amounts.map(function (value, i) {
      return '<div><i aria-hidden="true" style="background:' + colors[i] + '"></i>' + h.esc(names[i]) + ' : <strong>' + h.esc(h.money(value)) + '</strong></div>';
    }).join('');
    return '<p class="calc-kicker">MA RÉPONSE</p><span class="calc-tag">CALCULÉ AVEC TES CHIFFRES</span><p class="calc-answer" data-short="' + h.esc(r.overBudget ? 'Il manque ' + h.money(-r.available) : 'Il te reste ' + h.money(r.available)) + '">' + (r.overBudget ? 'Non : il te manque <b>' + h.esc(h.money(-r.available)) + '</b> pour tout acheter en gardant ton argent de côté. Enlève ou baisse un achat.' : 'Oui, tu peux tout acheter. Il te reste <b>' + h.esc(h.money(r.available)) + '</b>, sans toucher à l’argent mis de côté.') + '</p>' +
      h.stats([['Je dépense', h.money(r.spent)], ['Il me reste après', h.money(r.remaining)], ['Sans l’argent mis de côté', h.money(r.available)]]) +
      '<div class="calc-budget-bars" aria-hidden="true">' + bars + '</div><div class="calc-legend">' + legend + '</div>' +
      (r.overBudget ? '<div style="margin-top:20px">' + h.warning('Il te manque ' + h.money(-r.available) + ' pour tout acheter en gardant ton argent de côté. La barre montre tout ce qu’il faudrait.') + '</div>' : '') +
      '<p class="calc-note">Ce que j’ai ' + h.esc(h.money(input.capital)) + ' − mes achats ' + h.esc(h.money(r.spent)) + ' − mon argent de côté ' + h.esc(h.money(input.reserve)) + ' = ' + h.esc(h.money(r.available)) + '.</p>';
  }
  function orderCard(name, result, h) {
    if (!result.valid) return '<article class="calc-card"><p class="calc-kicker">' + name + '</p>' + h.warning(result.reason) + '</article>';
    var steps = result.steps.map(function (step, i) {
      return '<li><b>' + (i + 1) + '. ' + h.esc(step.name) + '</b><span>Acheté après ' + h.esc(h.hours(step.timeHours)) + ' de jeu<br>Temps pour avoir l’argent : ' + h.esc(h.hours(step.waitHours)) + '<br>Ensuite tu gagnes ' + h.esc(h.money(step.hourly)) + ' par heure</span></li>';
    }).join('');
    return '<article class="calc-card"><p class="calc-kicker">' + name + '</p><h3>Tout acheté en ' + h.esc(h.hours(result.totalHours)) + ' de jeu</h3><ol class="calc-order-steps">' + steps + '</ol>' +
      h.stats([['Temps de jeu', h.hours(result.totalHours)], ['Tu auras à la fin', h.money(result.finalCapital)], ['Tu gagnes ensuite', h.money(result.finalHourly) + '/h']]) + '</article>';
  }
  function renderOrder(input, h) {
    var a = h.E.order(input), b = h.E.order({ capital: input.capital, hourly: input.hourly, items: input.items.slice().reverse() });
    var comparison = '';
    if (a.valid && b.valid) {
      var delta = a.totalHours - b.totalHours;
      comparison = Math.abs(delta) < 1e-9 ? 'Les deux ordres prennent le même temps avec tes chiffres.' :
        'L’ordre ' + (delta > 0 ? 'B' : 'A') + ' est le plus rapide : tu as tout acheté ' + h.hours(Math.abs(delta)) + ' plus tôt.';
      comparison = '<p class="calc-note">' + h.esc(comparison) + ' On regarde seulement le temps jusqu’au dernier achat.</p>';
    }
    var answer;
    if (a.valid && b.valid) {
      var delta2 = a.totalHours - b.totalHours, win = delta2 > 1e-9 ? b : a, names = win.steps.map(function (s) { return '<b>' + h.esc(s.name) + '</b>'; });
      answer = (Math.abs(delta2) < 1e-9 ? 'Les deux ordres prennent le même temps : ' : 'Achète d’abord ' + names[0] + ', puis ' + names.slice(1).join(', puis ') + '. ') + 'Tout est à toi en <b>' + h.esc(h.hours(win.totalHours)) + '</b> de jeu' + (Math.abs(delta2) < 1e-9 ? '.' : ', soit <b>' + h.esc(h.hours(Math.abs(delta2))) + '</b> plus tôt que l’autre ordre.');
    } else answer = 'Corrige la case signalée pour voir ta réponse.';
    var short = a.valid && b.valid ? 'Tout en ' + h.hours(Math.min(a.totalHours, b.totalHours)) : '';
    return '<div class="calc-card calc-result"><p class="calc-kicker">MA RÉPONSE</p><span class="calc-tag">CALCULÉ AVEC TES CHIFFRES</span><p class="calc-answer" data-short="' + h.esc(short) + '">' + answer + '</p>' + comparison + '</div><div class="calc-grid" style="margin-top:20px">' + orderCard('A · TON ORDRE', a, h) + orderCard('B · L’ORDRE INVERSE', b, h) + '</div>';
  }
  function render(state, helpers) {
    [['roi-results', renderRoi, state.roi], ['budget-results', renderBudget, state.budget], ['order-results', renderOrder, state.order]].forEach(function (item) {
      var node = document.getElementById(item[0]);
      if (node) node.innerHTML = item[1](item[2], helpers) + (item[0] === 'budget-results' && helpers.E.budget(state.budget).valid ? '<p class="calc-note">Après ces achats, il te reste '+helpers.esc(helpers.money(helpers.E.budget(state.budget).remaining))+'. Ton objectif est de '+helpers.esc(helpers.money(state.goal.target))+'.</p>' : '');
    });
  }
  global.LKCalcTools = { defaults: defaults, markup: markup, render: render };
})(window);
