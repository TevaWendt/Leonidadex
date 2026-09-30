/* LEONIDAKIT — fondations communes du calculateur (v7.48, lot 1).
   Fonctions pures, sans DOM ni stockage, partagées par les huit calculs, le business plan, les catalogues et Léo :
   - valeurs avec statut (officiel, ton chiffre, simulation, exemple, inconnu, pas encore écrit, sans objet, non confirmé) ;
   - sommes partielles : un poste inconnu laisse un sous-total, jamais un zéro ;
   - comparaison de coûts incomplets avec des bornes honnêtes (un coût inconnu est positif ou nul, jamais négatif) ;
   - coût sur la durée (achat, par partie, par utilisation, par heure, dépenses déclenchées, revente) et point de bascule ;
   - trésorerie : un achat et ses frais obligatoires immédiats doivent tenir dans l’argent disponible, réserve gardée ;
   - conditions et admission (possible, possible si l’hypothèse est juste, impossible, on ne peut pas encore dire) ;
   - prérequis récursifs (cycles, références absentes, alternatives, prérequis partagés comptés une fois) ;
   - grand livre d’événements (dépense avant, récompense à la fin, point le plus bas, conservation des flux) ;
   - seuils de bascule, résultats trop proches pour trancher, recherche de séquences bornée et annoncée ;
   - explication « Ce qui compte dans ce calcul » construite depuis les critères réellement actifs.
   Unités : dollars du jeu, minutes, heures, parties. Aucune donnée de GTA VI n’est écrite ici. */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./calculateurs-engine.js'), require('./modele-donnees.js'));
  else root.LKCalcModel = factory(root.LKCalcEngine, root.LK_MODELE);
}(typeof globalThis !== 'undefined' ? globalThis : this, function (E, M) {
  'use strict';
  M = M || { statuts: [], facteurs: [], mecaniques: [], vides: {}, categories: [], carnets: [], genres: [], etatsAdmission: [] };
  var MODEL_VERSION = 1;
  var STATUS = {};
  (M.statuts || []).forEach(function (s) { STATUS[s.id] = s; });
  var CALC = { official: 1, measured: 1, estimated: 1, personal: 1, simulated: 1, example: 1 };
  var EPS = 1e-9;

  /* ---------- Valeurs avec statut ---------- */
  function isValue(x) { return !!x && typeof x === 'object' && !Array.isArray(x) && typeof x.s === 'string' && Object.prototype.hasOwnProperty.call(x, 'v'); }
  function make(v, s, meta) { var out = { v: v === undefined ? null : v, s: s }; if (meta && typeof meta === 'object') for (var k in meta) if (Object.prototype.hasOwnProperty.call(meta, k) && meta[k] !== undefined && meta[k] !== null) out[k] = meta[k]; return out; }
  var V = {
    official: function (v, meta) { return make(v, 'official', meta); },
    measured: function (v, meta) { return make(v, 'measured', meta); },
    estimated: function (v, meta) { return make(v, 'estimated', meta); },
    personal: function (v, meta) { return make(v, 'personal', meta); },
    simulated: function (v, meta) { return make(v, 'simulated', meta); },
    example: function (v, meta) { return make(v, 'example', meta); },
    series: function (v, meta) { return make(v, 'series', meta); },
    unknown: function (note) { return make(null, 'unknown', note ? { note: note } : null); },
    blank: function (note) { return make(null, 'blank', note ? { note: note } : null); },
    na: function (note) { return make(null, 'na', note ? { note: note } : null); },
    unconfirmed: function (mecanique, note) { return make(null, 'unconfirmed', { mecanique: mecanique, note: note }); },
    /* Saisie brute → valeur : un nombre écrit est « ton chiffre » ; vide, null ou absent reste « pas encore écrit ».
       Un objet valeur est rendu tel quel. Jamais de zéro par défaut. */
    from: function (raw, status, meta) {
      if (isValue(raw)) return raw;
      if (raw === null || raw === undefined || raw === '') return make(null, 'blank');
      if (typeof raw === 'number') return Number.isFinite(raw) ? make(raw, status || 'personal', meta) : make(null, 'unknown', { note: 'Nombre illisible.' });
      return make(raw, status || 'personal', meta);
    },
    usable: function (x) { x = V.from(x); return !!CALC[x.s] && typeof x.v === 'number' && Number.isFinite(x.v); },
    num: function (x) { x = V.from(x); return V.usable(x) ? x.v : null; },
    isNA: function (x) { return V.from(x).s === 'na'; },
    missing: function (x) { x = V.from(x); return !V.usable(x) && x.s !== 'na'; },
    hypothesis: function (x) { x = V.from(x); return x.s === 'simulated' || x.s === 'example'; },
    origin: function (x) { var s = STATUS[V.from(x).s]; return s ? s.origine : 'toi'; },
    statusLabel: function (x) { var s = STATUS[V.from(x).s]; return s ? s.court : 'À confirmer'; },
    /* Texte d’un état vide selon la catégorie de champ (outils/modele-donnees.json → vides). */
    emptyText: function (x, vide) {
      x = V.from(x);
      if (x.s === 'na') return (M.vides && M.vides.na) || 'Ne s’applique pas';
      if (x.s === 'blank') return (M.vides && M.vides.blank) || 'Pas encore écrit';
      if (x.s === 'unconfirmed') return 'Mécanique non confirmée';
      if (x.s === 'series') return 'Repère d’un autre jeu';
      return (M.vides && M.vides[vide || 'effet']) || 'à confirmer';
    }
  };

  /* ---------- Sommes partielles ---------- */
  // parts : [{label, value, field?}] — un poste « sans objet » n’entre pas dans la somme et ne la rend pas incomplète.
  function total(parts) {
    var sum = 0, known = [], missing = [], na = [], hypotheses = [], rows = [];
    (parts || []).forEach(function (p) {
      var value = V.from(p.value);
      var row = { label: p.label, value: value, field: p.field || null };
      rows.push(row);
      if (value.s === 'na') { na.push(p.label); return; }
      if (V.usable(value)) { sum += value.v; known.push(p.label); if (V.hypothesis(value)) hypotheses.push(p.label); return; }
      missing.push({ label: p.label, status: value.s, field: p.field || null, mecanique: value.mecanique || null });
    });
    return { value: sum, complete: missing.length === 0, known: known, missing: missing, na: na, hypotheses: hypotheses, rows: rows, label: missing.length ? 'Sous-total connu' : 'Total' };
  }

  /* ---------- Comparer deux coûts incomplets ---------- */
  // Les postes inconnus sont positifs ou nuls : un sous-total connu est une borne basse. On conclut seulement si
  // la borne basse de l’un dépasse déjà le total complet de l’autre ; sinon on dit ce qu’il faudrait écrire.
  function compareCosts(a, b, labels) {
    labels = labels || ['A', 'B'];
    if (a.complete && b.complete) {
      var d = a.value - b.value;
      if (Math.abs(d) <= EPS * Math.max(1, Math.abs(a.value), Math.abs(b.value))) return { decided: true, lower: 'equal', gap: 0, reason: 'Même coût.', needed: [] };
      return { decided: true, lower: d < 0 ? 'a' : 'b', gap: Math.abs(d), reason: (d < 0 ? labels[0] : labels[1]) + ' coûte ' + Math.abs(d) + ' $ de moins.', needed: [] };
    }
    if (a.complete && !b.complete && b.value > a.value + EPS) return { decided: true, lower: 'a', gap: null, atLeast: b.value - a.value, reason: 'Même sans ses coûts inconnus, ' + labels[1] + ' coûte déjà plus cher.', needed: [] };
    if (b.complete && !a.complete && a.value > b.value + EPS) return { decided: true, lower: 'b', gap: null, atLeast: a.value - b.value, reason: 'Même sans ses coûts inconnus, ' + labels[0] + ' coûte déjà plus cher.', needed: [] };
    var needed = [];
    if (!a.complete) a.missing.forEach(function (m) { needed.push({ option: labels[0], label: m.label, field: m.field, status: m.status }); });
    if (!b.complete) b.missing.forEach(function (m) { needed.push({ option: labels[1], label: m.label, field: m.field, status: m.status }); });
    return { decided: false, lower: null, gap: null, reason: 'On ne peut pas encore dire lequel coûte le moins : des coûts manquent.', needed: needed };
  }

  /* ---------- Coût sur la durée ---------- */
  // o : {initial, extras, fees, perSession, perUse, perHour, triggered:[{label, value, atSession}], resale}
  // h : {sessions, uses, hours} (nombres ou null). Un coût par partie sans nombre de parties rend le total incomplet.
  function horizonNumber(h, key) { var x = h && h[key]; return typeof x === 'number' && Number.isFinite(x) && x >= 0 ? x : null; }
  function usageCost(o, h) {
    o = o || {}; h = h || {};
    var acq = total([
      { label: 'Prix', value: o.initial === undefined ? V.blank() : o.initial, field: o.fields && o.fields.initial },
      { label: 'Options indispensables', value: o.extras === undefined ? V.na() : o.extras, field: o.fields && o.fields.extras },
      { label: 'Frais au départ', value: o.fees === undefined ? V.na() : o.fees, field: o.fields && o.fields.fees }
    ]);
    var lines = [], recurringParts = [];
    [['perSession', 'sessions', 'par partie', 'parties'], ['perUse', 'uses', 'par utilisation', 'utilisations'], ['perHour', 'hours', 'par heure', 'heures']].forEach(function (d) {
      if (o[d[0]] === undefined) return;
      var rate = V.from(o[d[0]]);
      if (rate.s === 'na') return;
      var count = horizonNumber(h, d[1]);
      var label = (o.labels && o.labels[d[0]]) || ('Coût ' + d[2]);
      if (V.usable(rate) && count !== null) {
        var amount = rate.v * count;
        recurringParts.push({ label: label, value: make(amount, rate.s, { note: rate.note }) });
        lines.push({ label: label, rate: rate.v, count: count, unit: d[3], amount: amount, status: rate.s, formula: rate.v + ' × ' + count + ' ' + d[3] });
      } else if (V.usable(rate)) {
        recurringParts.push({ label: label + ' (nombre de ' + d[3] + ' manquant)', value: V.blank(), field: (o.fields && o.fields[d[1]]) || null });
      } else recurringParts.push({ label: label, value: rate, field: o.fields && o.fields[d[0]] });
    });
    (o.triggered || []).forEach(function (t) {
      var at = typeof t.atSession === 'number' ? t.atSession : null, count = horizonNumber(h, 'sessions');
      if (at !== null && count !== null && at > count) return; // déclenchée après l’horizon : hors calcul
      recurringParts.push({ label: t.label || 'Dépense déclenchée', value: t.value });
    });
    var recurring = total(recurringParts);
    // Le total garde le détail des manques de l’achat et de l’usage.
    var all = total(acq.rows.map(function (r) { return { label: r.label, value: r.value, field: r.field }; }).concat(recurringParts));
    var resale = o.resale === undefined ? V.na() : V.from(o.resale), futureNet = null, resaleNote;
    if (V.usable(resale)) { futureNet = all.complete ? all.value - resale.v : null; resaleNote = 'La revente (' + resale.v + ' $, ' + V.statusLabel(resale) + ') baisse le coût net futur seulement le jour où tu revends ; elle ne baisse pas l’argent à payer aujourd’hui.'; }
    else if (resale.s === 'unconfirmed' || resale.s === 'unknown') resaleNote = 'Revente non comptée : ' + (resale.s === 'unconfirmed' ? 'rien ne dit qu’elle existe dans GTA VI.' : 'son prix est inconnu.');
    return { acquisition: acq, recurring: recurring, total: all, payNow: acq, lines: lines, resale: resale, futureNet: futureNet, resaleNote: resaleNote || null, horizon: { sessions: horizonNumber(h, 'sessions'), uses: horizonNumber(h, 'uses'), hours: horizonNumber(h, 'hours') } };
  }
  // Point de bascule entre deux options linéaires : initial + taux × n. Renvoie null si l’une des valeurs est inconnue.
  function crossover(a, b) {
    var ia = V.num(a.initial), ib = V.num(b.initial), ra = V.num(a.rate), rb = V.num(b.rate);
    if ([ia, ib, ra, rb].some(function (x) { return x === null; })) return { known: false, n: null, reason: 'Un prix ou un coût d’usage manque : pas de point de bascule calculable.' };
    if (Math.abs(ra - rb) <= EPS) return { known: true, n: null, parallel: true, cheaper: ia < ib ? 'a' : ia > ib ? 'b' : 'equal', reason: 'Même coût d’usage : la moins chère à l’achat le reste toujours.' };
    var n = (ib - ia) / (ra - rb);
    if (n <= 0) return { known: true, n: null, cheaper: ra < rb ? 'a' : 'b', reason: 'L’une est moins chère dès le départ et à chaque utilisation.' };
    return { known: true, n: n, before: ia < ib ? 'a' : 'b', after: ra < rb ? 'a' : 'b', costAt: ia + ra * n };
  }
  function costAt(o, n) { var i = V.num(o.initial), r = V.num(o.rate); return i === null || r === null ? null : i + r * n; }

  /* ---------- Trésorerie : puis-je payer maintenant ? ---------- */
  // Un achat moins cher que ce que tu as n’est pas « accessible » si ses frais obligatoires immédiats et la réserve
  // ne tiennent pas. Retourne le manque exact, ou « au moins » quand une dépense obligatoire est inconnue.
  function cashCheck(o) {
    var cash = V.num(o.cash), reserve = o.reserve === undefined || o.reserve === null ? 0 : V.num(o.reserve);
    if (cash === null) return { state: 'unknown', reason: 'Écris l’argent que tu as.', field: 'capital', shortfall: null, required: null, available: null, after: null, unknown: [] };
    if (reserve === null) return { state: 'unknown', reason: 'Écris l’argent que tu gardes de côté (0 si rien).', field: 'reserve', shortfall: null, required: null, available: null, after: null, unknown: [] };
    var spends = total((o.spends || []).map(function (s) { return { label: s.label, value: s.value, field: s.field }; }));
    var available = cash - reserve, required = spends.value, gap = required - available;
    if (!spends.complete) {
      if (gap > EPS) return { state: 'short', exact: false, shortfall: gap, required: required, available: available, after: null, unknown: spends.missing, reason: 'Il manque au moins ' + gap + ' $ (et une dépense obligatoire est encore inconnue).' };
      return { state: 'unknown', exact: false, shortfall: null, required: required, available: available, after: null, unknown: spends.missing, reason: 'Une dépense obligatoire est inconnue : on ne peut pas dire si tu peux payer maintenant.' };
    }
    if (gap > EPS) return { state: 'short', exact: true, shortfall: gap, required: required, available: available, after: cash - required, unknown: [], reason: 'Il manque ' + gap + ' $ pour payer sans toucher à l’argent gardé de côté.' };
    return { state: 'ok', exact: true, shortfall: 0, required: required, available: available, after: cash - required, unknown: [], reason: null };
  }

  /* ---------- Conditions et admission ---------- */
  // checks : [{id, label, state: 'ok'|'ko'|'unknown'|'assumed'|'na', detail, fix:{text, delta}}]
  // Une condition non remplie n’est jamais compensée : l’option est « impossible » tant qu’elle n’est pas remplie.
  function admission(checks) {
    var list = (checks || []).filter(function (c) { return c && c.state !== 'na'; });
    var failed = list.filter(function (c) { return c.state === 'ko'; }), unknown = list.filter(function (c) { return c.state === 'unknown'; }), assumed = list.filter(function (c) { return c.state === 'assumed'; });
    var state = failed.length ? 'impossible' : unknown.length ? 'inconnu' : assumed.length ? 'conditionnel' : 'admissible';
    var fixes = failed.filter(function (c) { return c.fix; }).map(function (c) { return c.fix; });
    fixes.sort(function (x, y) { return (typeof x.delta === 'number' ? x.delta : Infinity) - (typeof y.delta === 'number' ? y.delta : Infinity); });
    return { state: state, ok: list.filter(function (c) { return c.state === 'ok'; }), failed: failed, unknown: unknown, assumed: assumed, fix: failed.length === 1 && fixes.length ? fixes[0] : (fixes.length && failed.length === fixes.length ? { text: fixes.map(function (f) { return f.text; }).join(' puis ') } : null), label: labelOf('etatsAdmission', state) };
  }
  function labelOf(list, id) { var x = (M[list] || []).filter(function (y) { return y.id === id; })[0]; return x ? x.label : id; }

  /* ---------- Prérequis récursifs ---------- */
  // nodes : {id: {id, name, kind: 'item'|'unlock'|'activity', requires: [id | {anyOf:[ids], label}], price, minutes}}
  // owned : ids déjà possédés ou déblocages déjà faits (réutilisés, jamais refacturés).
  // Retourne la séquence dans l’ordre des dépendances, chaque prérequis une seule fois, les cycles, les références absentes,
  // les choix entre alternatives (et pourquoi) et les totaux (sous-totaux si un prix ou une durée manque).
  function prerequisites(input) {
    var nodes = input.nodes || {}, owned = {}, targets = input.targets || [];
    (input.owned || []).forEach(function (id) { owned[id] = true; });
    var state = {}, sequence = [], cycles = [], missingRefs = [], choices = [], reused = [], dependents = {}, blocked = [];
    function costOf(id, seen) {
      // Coût d’une branche sans l’appliquer : prix et minutes des nœuds non possédés, sous-total si inconnu.
      seen = seen || {};
      if (owned[id] || seen[id]) return { price: 0, minutes: 0, complete: true, reachable: !!nodes[id] || owned[id] };
      var n = nodes[id]; if (!n) return { price: 0, minutes: 0, complete: false, reachable: false };
      seen[id] = true;
      var price = V.num(n.price), minutes = V.num(n.minutes);
      var priceKnown = price !== null || n.price === undefined || V.isNA(n.price), minutesKnown = minutes !== null || n.minutes === undefined || V.isNA(n.minutes);
      var complete = priceKnown && minutesKnown;
      var out = { price: price || 0, minutes: minutes || 0, complete: complete, reachable: true };
      (n.requires || []).forEach(function (r) {
        var ids = typeof r === 'string' ? [r] : (r && r.anyOf) || [];
        var best = null;
        ids.forEach(function (x) { var c = costOf(x, Object.assign({}, seen)); if (!c.reachable) return; if (!best || (c.complete && !best.complete) || (c.complete === best.complete && c.price < best.price)) best = c; });
        if (!best) { out.reachable = false; return; }
        out.price += best.price; out.minutes += best.minutes; out.complete = out.complete && best.complete;
      });
      return out;
    }
    function visit(id, path, parent) {
      if (parent) (dependents[id] = dependents[id] || []).indexOf(parent) === -1 && dependents[id].push(parent);
      if (owned[id]) { if (reused.indexOf(id) === -1) reused.push(id); return true; }
      if (state[id] === 'done') return true;
      if (state[id] === 'active') { var at = path.indexOf(id); cycles.push(path.slice(at).concat(id)); return false; }
      var n = nodes[id];
      if (!n) { missingRefs.push({ from: parent || null, ref: id }); return false; }
      state[id] = 'active';
      var ok = true;
      (n.requires || []).forEach(function (r) {
        if (typeof r === 'string') { if (!visit(r, path.concat(id), id)) ok = false; return; }
        var alts = (r && r.anyOf) || [];
        var ownedAlt = alts.filter(function (x) { return owned[x]; })[0];
        if (ownedAlt) { choices.push({ for: id, label: r.label || null, chosen: ownedAlt, alternatives: alts, reason: 'déjà possédé' }); visit(ownedAlt, path.concat(id), id); return; }
        var ranked = alts.map(function (x) { return { id: x, cost: costOf(x) }; }).filter(function (x) { return x.cost.reachable; });
        ranked.sort(function (x, y) { return (y.cost.complete - x.cost.complete) || (x.cost.price - y.cost.price) || (x.cost.minutes - y.cost.minutes) || alts.indexOf(x.id) - alts.indexOf(y.id); });
        if (!ranked.length) { ok = false; alts.forEach(function (x) { if (!nodes[x]) missingRefs.push({ from: id, ref: x }); }); blocked.push({ id: id, reason: 'Aucune des solutions équivalentes n’est disponible.' }); return; }
        var decided = ranked.length === 1 || ranked.every(function (x) { return x.cost.complete; });
        choices.push({ for: id, label: r.label || null, chosen: ranked[0].id, alternatives: alts, decided: decided, reason: ranked.length === 1 ? 'seule solution disponible' : decided ? 'la moins chère (puis la plus rapide) des solutions équivalentes' : 'à départager : un prix ou une durée manque ; la solution chiffrée est gardée pour continuer, sans dire qu’elle est la moins chère' });
        if (!visit(ranked[0].id, path.concat(id), id)) ok = false;
      });
      state[id] = 'done';
      if (!ok) { blocked.push({ id: id, reason: 'Un de ses prérequis est bloqué.' }); return false; }
      sequence.push(id);
      return true;
    }
    targets.forEach(function (t) { visit(t, [], null); });
    var steps = sequence.map(function (id) { var n = nodes[id]; return { id: id, name: n.name || id, kind: n.kind || 'item', price: V.from(n.price === undefined ? V.na() : n.price), minutes: V.from(n.minutes === undefined ? V.na() : n.minutes), neededBy: (dependents[id] || []).slice(), shared: (dependents[id] || []).length > 1, target: targets.indexOf(id) >= 0 }; });
    var price = total(steps.map(function (s) { return { label: s.name, value: s.price }; })), minutes = total(steps.map(function (s) { return { label: s.name, value: s.minutes }; }));
    var ok = !cycles.length && !missingRefs.length && !blocked.length;
    return { ok: ok, steps: steps, order: sequence.slice(), reused: reused, cycles: cycles, missingRefs: missingRefs, choices: choices, blocked: blocked, totals: { price: price, minutes: minutes }, reason: cycles.length ? 'Dépendance circulaire : ' + cycles[0].map(function (id) { return nodes[id] && nodes[id].name || id; }).join(' → ') + '.' : missingRefs.length ? 'Référence absente : « ' + missingRefs[0].ref + ' » n’existe pas dans les données.' : blocked.length ? blocked[0].reason : null };
  }

  /* ---------- Grand livre ---------- */
  // events : [{t (minutes), type: 'spend'|'receive'|'time', amount, label}] dans l’ordre réel. Contrôle de conservation :
  // départ + recettes − dépenses = arrivée ; le point le plus bas est le solde minimal atteint après une dépense.
  function ledger(start, events, reserve) {
    var cash = start, receipts = 0, spends = 0, low = { value: start, at: 0, label: 'Départ' }, rows = [], breach = null;
    reserve = reserve || 0;
    (events || []).forEach(function (e) {
      var before = cash;
      if (e.type === 'spend') { cash -= e.amount; spends += e.amount; }
      else if (e.type === 'receive') { cash += e.amount; receipts += e.amount; }
      if (cash < low.value - EPS) low = { value: cash, at: e.t, label: e.label };
      if (!breach && cash < reserve - EPS) breach = { at: e.t, label: e.label, cash: cash };
      rows.push(Object.assign({}, e, { before: before, after: cash }));
    });
    var conserved = Math.abs(start + receipts - spends - cash) <= EPS * Math.max(1, Math.abs(cash), Math.abs(start));
    return { rows: rows, final: cash, receipts: receipts, spends: spends, low: low, conserved: conserved, reserveBreach: breach };
  }

  /* ---------- Seuils et solidité ---------- */
  // f(x) → clé de décision. Cherche entre lo et hi la valeur où la décision change (dichotomie, 50 pas au plus).
  function threshold(f, lo, hi, steps) {
    var a = f(lo), b = f(hi);
    if (a === b) return { flips: false, at: null, before: a, after: b };
    var x = lo, y = hi;
    for (var i = 0; i < (steps || 50); i += 1) { var mid = (x + y) / 2; if (f(mid) === a) x = mid; else y = mid; }
    return { flips: true, at: y, before: a, after: b };
  }
  // Deux résultats plus proches que la précision des données : on ne tranche pas.
  function close(a, b, precision) {
    if (a === null || b === null || !Number.isFinite(a) || !Number.isFinite(b)) return false;
    var p = typeof precision === 'number' ? precision : 0.05;
    var scale = Math.max(Math.abs(a), Math.abs(b), 1);
    return Math.abs(a - b) <= p * scale;
  }
  // Variations utiles d’un paramètre, sans probabilité : même calcul relancé, la clé de décision comparée.
  function variations(f, base, factors) {
    return (factors || [0.8, 1, 1.2]).map(function (k) { var x = base * k; return { factor: k, value: x, result: f(x) }; });
  }

  /* ---------- Séquences (quoi acheter d’abord) ---------- */
  // items : [{id, before:[ids qui doivent passer avant]}] ; score(order) → {valid, key:[nombres à minimiser], …}.
  // n ≤ 7 : toutes les séquences valides sont essayées (5 040 au plus). Au-delà : départ glouton puis échanges de voisins,
  // et on le dit (« parmi les séquences essayées »). Jamais d’optimum annoncé sans preuve.
  function permutations(list, max) {
    var out = [];
    (function rec(prefix, rest) { if (out.length >= max) return; if (!rest.length) { out.push(prefix); return; } for (var i = 0; i < rest.length; i += 1) rec(prefix.concat([rest[i]]), rest.slice(0, i).concat(rest.slice(i + 1))); }([], list));
    return out;
  }
  function respects(order, items) {
    var pos = {}; order.forEach(function (id, i) { pos[id] = i; });
    return items.every(function (it) { return (it.before || []).every(function (b) { return pos[b] === undefined || pos[b] < pos[it.id]; }); });
  }
  function lexLess(a, b) { for (var i = 0; i < Math.max(a.length, b.length); i += 1) { var x = a[i], y = b[i]; if (x === y) continue; if (x === null || x === undefined) return false; if (y === null || y === undefined) return true; if (Math.abs(x - y) <= EPS * Math.max(1, Math.abs(x), Math.abs(y))) continue; return x < y; } return false; }
  function sequences(items, score, options) {
    options = options || {};
    var ids = items.map(function (x) { return x.id; }), results = [], method, explored = 0;
    var limit = options.exhaustiveUpTo || 7;
    function consider(order) { explored += 1; if (!respects(order, items)) return; var r = score(order); results.push({ order: order.slice(), result: r }); }
    function better(x, y) { if (!x || !x.valid) return false; if (!y || !y.valid) return true; return lexLess(x.key, y.key); }
    if (ids.length <= limit) { method = 'exhaustive'; permutations(ids, 5040).forEach(consider); }
    else {
      // Départ : l’ordre donné, rendu compatible avec les contraintes ; puis échanges de voisins tant que ça améliore.
      method = 'heuristic';
      var current = ids.slice(), guard = 0;
      while (!respects(current, items) && guard++ < ids.length * ids.length) { for (var k = 0; k < current.length - 1; k += 1) { var probe = current.slice(); var tmp = probe[k]; probe[k] = probe[k + 1]; probe[k + 1] = tmp; if (items.some(function (it) { return it.id === probe[k] && (it.before || []).indexOf(probe[k + 1]) >= 0; })) current = probe; } }
      consider(current);
      var currentScore = results.length ? results[results.length - 1].result : null;
      for (var pass = 0, improved = true; improved && pass < 12; pass += 1) {
        improved = false;
        for (var i = 0; i < current.length - 1; i += 1) {
          var swapped = current.slice(); var t = swapped[i]; swapped[i] = swapped[i + 1]; swapped[i + 1] = t;
          if (!respects(swapped, items)) continue;
          consider(swapped);
          var candidate = results[results.length - 1].result;
          if (better(candidate, currentScore)) { current = swapped; currentScore = candidate; improved = true; }
        }
      }
    }
    var valid = results.filter(function (x) { return x.result && x.result.valid; });
    valid.sort(function (a, b) { return lexLess(a.result.key, b.result.key) ? -1 : lexLess(b.result.key, a.result.key) ? 1 : ids.indexOf(a.order[0]) - ids.indexOf(b.order[0]); });
    return { method: method, explored: explored, valid: valid, invalid: results.filter(function (x) { return !x.result || !x.result.valid; }), best: valid[0] || null, note: method === 'exhaustive' ? 'Toutes les séquences possibles (' + explored + ') ont été comparées.' : 'Séquence trouvée parmi ' + explored + ' séquences essayées : il peut en exister une meilleure.' };
  }

  /* ---------- Critères actifs et explication ---------- */
  function factorsFor(tool, category) {
    return (M.facteurs || []).filter(function (f) { return f.outils.indexOf(tool) >= 0 && (!f.categories || !category || f.categories.indexOf(category) >= 0); });
  }
  function factor(id) { return (M.facteurs || []).filter(function (f) { return f.id === id; })[0] || null; }
  function mechanic(id) { return (M.mecaniques || []).filter(function (f) { return f.id === id; })[0] || null; }
  // Construit l’explication fidèle d’un résultat. used : ids des facteurs réellement utilisés ; excluded : {id: raison}.
  // Un facteur de l’outil qui n’est ni utilisé ni écarté avec une raison est signalé (contrôle des tests).
  function explain(o) {
    var used = o.used || [], excludedMap = o.excluded || {}, tool = o.tool;
    var known = factorsFor(tool, o.category).map(function (f) { return f.id; });
    var unaccounted = known.filter(function (id) { return used.indexOf(id) < 0 && !excludedMap[id]; });
    var excluded = Object.keys(excludedMap).map(function (id) { var f = factor(id); return { id: id, label: f ? f.label : id, why: excludedMap[id] }; });
    var conditions = { ok: [], ko: [], unknown: [], assumed: [] };
    (o.conditions || []).forEach(function (c) { if (conditions[c.state]) conditions[c.state].push(c); });
    return {
      tool: tool, aim: o.aim || null, horizon: o.horizon || null,
      conditions: conditions,
      values: (o.values || []).map(function (v) { var value = V.from(v.value); return { label: v.label, value: value, unit: v.unit || null, origin: V.origin(value), status: value.s, text: v.text || null, field: v.field || null }; }),
      drivers: (o.drivers || []).map(function (d) { return { label: d.label, text: d.text, decisive: d.decisive !== false, factor: d.factor || null }; }),
      missing: (o.missing || []).map(function (m) { return { label: m.label, text: m.text || null, field: m.field || null, decisive: !!m.decisive }; }),
      excluded: excluded, used: used.slice(), unaccounted: unaccounted,
      tradeoffs: o.tradeoffs || [], changes: o.changes || [], summary: o.summary || null, method: o.method || null
    };
  }

  /* ---------- Classement honnête ---------- */
  // Faisabilité d’abord, puis front de Pareto sur des critères à minimiser (null = inconnu, jamais un avantage).
  // Aucune normalisation par le meilleur ou le pire candidat : ajouter une option sans intérêt ne change pas l’ordre des autres.
  function pareto(candidates, criteria) {
    var admissible = candidates.filter(function (c) { return !c.admission || c.admission.state === 'admissible' || c.admission.state === 'conditionnel'; });
    function dominates(a, b) {
      var better = false;
      for (var i = 0; i < criteria.length; i += 1) {
        var k = criteria[i], x = a.values[k], y = b.values[k];
        if (x === null || x === undefined || y === null || y === undefined) return false; // comparaison partielle : pas de domination
        if (x > y + EPS) return false; if (x < y - EPS) better = true;
      }
      return better;
    }
    var front = admissible.filter(function (c) { return !admissible.some(function (o) { return o !== c && dominates(o, c); }); });
    return { admissible: admissible, front: front, excluded: candidates.filter(function (c) { return admissible.indexOf(c) < 0; }) };
  }

  /* ---------- Fiche documentaire d’une catégorie ---------- */
  // known : {champ: valeur} (valeurs avec statut). Chaque champ de la catégorie reçoit sa valeur ou son état vide
  // (« Prix à venir », « Achat à confirmer », « Récupération de vie : à confirmer », « Ne s’applique pas »…) ;
  // un champ lié à une mécanique non confirmée l’indique, sans chiffre. Rien n’est inventé.
  function category(id) { return (M.categories || []).filter(function (c) { return c.id === id; })[0] || null; }
  function fiche(categoryId, known) {
    var c = category(categoryId); known = known || {};
    if (!c) return null;
    return c.rubriques.map(function (r) {
      return { id: r.id, titre: r.titre, champs: c.champs.filter(function (ch) { return ch.rubrique === r.id; }).map(function (ch) {
        var value = Object.prototype.hasOwnProperty.call(known, ch.id) ? V.from(known[ch.id]) : ch.mecanique ? V.unconfirmed(ch.mecanique) : V.unknown();
        var me = ch.mecanique ? mechanic(ch.mecanique) : null;
        // Un repère d’un autre jeu n’est jamais affiché comme la valeur de GTA VI : état vide + repère à part.
        var repere = value.s === 'series' ? { v: value.v, ctx: value.ctx || null, unit: value.unit || null } : null;
        var shown = value.s === 'series' ? V.unknown() : value;
        var hasValue = V.usable(shown) || (['blank', 'unknown', 'na', 'unconfirmed'].indexOf(shown.s) < 0 && shown.v !== null);
        var text = hasValue ? null : shown.s === 'unconfirmed' ? (me ? me.label + ' : mécanique non confirmée' : 'Mécanique non confirmée') : V.emptyText(shown, ch.vide);
        return { id: ch.id, label: ch.label, unite: ch.unite || null, genre: ch.genre, value: shown, text: text, known: text === null, repere: repere, mecanique: ch.mecanique || null, note: ch.note || (me ? me.texte : null) };
      }) };
    });
  }
  /* Adaptateurs : ce que les données actuelles du site savent vraiment, avec leur statut. */
  var SITE_STATUS = { officiel: 'official', vu: 'official', comm: 'estimated', conf: 'unknown', spec: 'estimated', serie: 'series' };
  function fromVehicle(v) {
    var cat = v && v.cat, terrain = cat === 'bateau' ? 'eau' : cat === 'avion' || cat === 'helicoptere' ? 'air' : cat ? 'route' : null;
    return {
      price: v && typeof v.price === 'number' ? V.official(v.price) : V.unknown(),
      purchasable: typeof (v && v.purchasable) === 'boolean' ? V.official(v.purchasable) : V.unknown(),
      terrain: terrain ? V.estimated(terrain, { ctx: 'Déduit du type de véhicule (catégorie du site), pas d’une fiche technique.' }) : V.unknown(),
      topSpeed: V.unknown(), acceleration: V.unknown(), braking: V.unknown(), handling: V.unknown(), seats: V.unknown(), cargo: V.unknown()
    };
  }
  function fromWeapon(a) {
    return {
      price: a && typeof a.price === 'number' ? V.official(a.price) : V.unknown(),
      purchasable: V.unknown(),
      ammoType: a && a.mun ? make(a.mun, SITE_STATUS[a.st] || 'estimated', { ctx: 'Type de munitions écrit sur la fiche.' }) : V.unknown(),
      range: a && a.portee ? make(a.portee, 'estimated', { ctx: 'Portée décrite en mots d’après l’arme réelle qui l’inspire ; aucune mesure de GTA VI.' }) : V.unknown(),
      rate: V.unknown(), accuracy: V.unknown(), reload: V.unknown(), capacity: V.unknown()
    };
  }
  function fromConsumable(row) {
    var effet = row && row.effet || {};
    var health = typeof effet.valeur === 'number' && effet.jeu && effet.unite === 'sante' ? V.series(effet.valeur, { ctx: 'Chiffre de ' + effet.jeu + ', pas de GTA VI.', unit: effet.unite || null }) : V.unknown();
    return {
      price: row && row.prix_gta6 && typeof row.prix_gta6.valeur === 'number' ? V.official(row.prix_gta6.valeur) : V.unknown(),
      purchasable: V.unknown(),
      effectType: effet.texte ? make(effet.texte, SITE_STATUS[row.statut] || 'estimated') : V.unknown(),
      health: health, unit: V.unknown(), duration: V.unknown(), conditions: V.unknown(), limits: V.unknown()
    };
  }

  /* ---------- Conversions d’unités ---------- */
  var units = {
    hoursToMinutes: function (h) { return h * 60; },
    minutesToHours: function (m) { return m / 60; },
    perSessionToPerHour: function (amount, sessionMinutes) { return sessionMinutes > 0 ? amount * 60 / sessionMinutes : null; },
    perHourToPerSession: function (amount, sessionMinutes) { return amount * sessionMinutes / 60; },
    fuelPerSession: function (distanceKm, litresPer100, pricePerLitre) { return distanceKm * litresPer100 / 100 * pricePerLitre; }
  };
  function parseFr(text) { return E && E.parseLocalizedNumber ? E.parseLocalizedNumber(text) : { valid: false, value: null, reason: 'Moteur absent.' }; }

  return Object.freeze({ MODEL_VERSION: MODEL_VERSION, DATA_VERSION: M.version || null, V: V, total: total, compareCosts: compareCosts, usageCost: usageCost, crossover: crossover, costAt: costAt, cashCheck: cashCheck, admission: admission, prerequisites: prerequisites, ledger: ledger, threshold: threshold, close: close, variations: variations, sequences: sequences, permutations: permutations, factorsFor: factorsFor, factor: factor, mechanic: mechanic, explain: explain, pareto: pareto, category: category, fiche: fiche, fromVehicle: fromVehicle, fromWeapon: fromWeapon, fromConsumable: fromConsumable, units: units, parseFr: parseFr, modele: M });
}));
