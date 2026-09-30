'use strict';
/* v7.48 (lot 1) : fondations communes (calculateurs-modele.js, modele-donnees.js, outils/gen-modele.cjs).
   Les chiffres attendus sont écrits à la main dans le test (références indépendantes des fonctions testées).
   Tous les cas sont fictifs : ils vérifient un modèle de simulation, pas une économie de GTA VI. */
const test = require('node:test'), assert = require('node:assert/strict'), path = require('node:path');
const root = path.resolve(__dirname, '../..');
const L = require(path.join(root, 'calculateurs-modele.js'));
const G = require(path.join(root, 'outils/gen-modele.cjs'));
const { V } = L;

test('modèle : outils/modele-donnees.json est valide et modele-donnees.js est à jour', () => {
  const m = G.load();
  assert.deepEqual(G.validate(m), []);
  assert.equal(require('node:fs').readFileSync(path.join(root, 'modele-donnees.js'), 'utf8'), G.render(m));
  assert.equal(L.DATA_VERSION, m.version);
});

test('modèle : le validateur refuse un facteur au genre inconnu, un carnet hors de /carnets/ et une famille oubliée', () => {
  const m = JSON.parse(JSON.stringify(G.load()));
  m.facteurs[0].genre = 'magie';
  m.carnets[0].url = '/progression.html#garage';
  m.carnets = m.carnets.filter(k => k.id !== 'lieux');
  const errors = G.validate(m).join('\n');
  assert.match(errors, /genre inconnu magie/);
  assert.match(errors, /URL hors de \/carnets\//);
  assert.match(errors, /famille sans carnet : lieux/);
});

test('modèle : chaque outil (8 calculs + plan) a des facteurs, chaque genre est représenté', () => {
  for (const t of ['goal', 'purchase', 'session', 'budget', 'order', 'roi', 'activities', 'compare', 'plan']) assert.ok(L.factorsFor(t).length >= 4, t);
  const genres = new Set(L.modele.facteurs.map(f => f.genre));
  for (const g of ['condition', 'grandeur', 'comparaison', 'preference', 'hypothese']) assert.ok(genres.has(g), g);
});

test('valeurs : vide, zéro, inconnu, sans objet et mécanique non confirmée restent distincts', () => {
  assert.equal(V.from('').s, 'blank'); assert.equal(V.from(null).s, 'blank'); assert.equal(V.from(undefined).s, 'blank');
  assert.equal(V.from(0).s, 'personal'); assert.equal(V.from(0).v, 0); assert.equal(V.usable(V.from(0)), true);
  assert.equal(V.usable(V.unknown()), false); assert.equal(V.usable(V.blank()), false); assert.equal(V.usable(V.na()), false);
  assert.equal(V.usable(V.unconfirmed('carburant')), false);
  assert.equal(V.usable(V.series(250)), false, 'un repère de GTA V ne sert pas de valeur GTA VI');
  assert.equal(V.usable(V.simulated(250)), true, 'sauf s’il est choisi comme hypothèse');
  assert.equal(V.emptyText(V.unknown(), 'prix'), 'Prix à venir');
  assert.equal(V.emptyText(V.unknown(), 'soin'), 'Récupération de vie : à confirmer');
  assert.equal(V.emptyText(V.na()), 'Ne s’applique pas');
  assert.equal(V.missing(V.na()), false); assert.equal(V.missing(V.unknown()), true);
});

test('sommes : un poste inconnu laisse un sous-total, jamais un total complet ; un poste sans objet n’est pas un manque', () => {
  const t = L.total([{ label: 'Prix', value: 40000 }, { label: 'Frais', value: V.unknown() }, { label: 'Assurance', value: V.na() }]);
  assert.equal(t.value, 40000); assert.equal(t.complete, false); assert.equal(t.label, 'Sous-total connu');
  assert.deepEqual(t.missing.map(m => m.label), ['Frais']); assert.deepEqual(t.na, ['Assurance']);
  const u = L.total([{ label: 'Prix', value: 40000 }, { label: 'Assurance', value: V.na() }]);
  assert.equal(u.complete, true); assert.equal(u.label, 'Total');
});

test('cas A/B du coût d’usage : égalité à 10 parties (140 000), puis A 160 000 et B 145 000 à 15 parties', () => {
  const A = { initial: V.example(100000), perSession: V.example(4000) }, B = { initial: V.example(130000), perSession: V.example(1000) };
  const a10 = L.usageCost(A, { sessions: 10 }), b10 = L.usageCost(B, { sessions: 10 });
  assert.equal(a10.total.value, 140000); assert.equal(b10.total.value, 140000);
  assert.equal(L.compareCosts(a10.total, b10.total).lower, 'equal');
  const a15 = L.usageCost(A, { sessions: 15 }), b15 = L.usageCost(B, { sessions: 15 });
  assert.equal(a15.total.value, 160000); assert.equal(b15.total.value, 145000);
  assert.equal(L.compareCosts(a15.total, b15.total, ['A', 'B']).lower, 'b');
  const x = L.crossover({ initial: 100000, rate: 4000 }, { initial: 130000, rate: 1000 });
  assert.equal(x.n, 10); assert.equal(x.before, 'a'); assert.equal(x.after, 'b'); assert.equal(x.costAt, 140000);
  // Achat moins cher au départ : A ; plus cher à l’usage au-delà de 10 parties.
  assert.equal(L.usageCost(A, { sessions: 5 }).total.value, 120000); assert.equal(L.usageCost(B, { sessions: 5 }).total.value, 135000);
  // Payer aujourd’hui : seulement le prix d’achat, quel que soit l’horizon.
  assert.equal(a15.payNow.value, 100000);
});

test('coût d’usage : un coût par partie sans nombre de parties rend le total incomplet ; la revente ne baisse pas l’argent à payer aujourd’hui', () => {
  const r = L.usageCost({ initial: 100000, perSession: 4000, resale: V.simulated(30000) }, {});
  assert.equal(r.total.complete, false); assert.match(r.total.missing[0].label, /nombre de parties manquant/);
  const s = L.usageCost({ initial: 100000, perSession: 4000, resale: V.simulated(30000) }, { sessions: 10 });
  assert.equal(s.total.value, 140000); assert.equal(s.futureNet, 110000); assert.equal(s.payNow.value, 100000); assert.match(s.resaleNote, /ne baisse pas l’argent à payer aujourd’hui/);
  const u = L.usageCost({ initial: 100000, perSession: V.unconfirmed('carburant') }, { sessions: 10 });
  assert.equal(u.total.complete, false, 'carburant non confirmé : pas compté comme 0');
  const w = L.usageCost({ initial: 100000, resale: V.unconfirmed('revente') }, { sessions: 10 });
  assert.equal(w.futureNet, null); assert.match(w.resaleNote, /rien ne dit qu’elle existe/);
});

test('un coût inconnu ne favorise pas une option comme s’il valait zéro ; une borne basse suffit parfois pour conclure', () => {
  const known = L.total([{ label: 'Prix', value: 120000 }]);
  const partial = L.total([{ label: 'Prix', value: 90000 }, { label: 'Améliorations', value: V.unknown(), field: 'f-extras' }]);
  const c = L.compareCosts(known, partial, ['Connue', 'Partielle']);
  assert.equal(c.decided, false); assert.equal(c.lower, null); assert.deepEqual(c.needed.map(n => n.label), ['Améliorations']);
  const expensive = L.total([{ label: 'Prix', value: 150000 }, { label: 'Améliorations', value: V.unknown() }]);
  const d = L.compareCosts(known, expensive, ['Connue', 'Chère']);
  assert.equal(d.decided, true); assert.equal(d.lower, 'a'); assert.equal(d.atLeast, 30000);
});

test('trésorerie : 50 000 disponibles, 10 000 gardés, achat 40 000 et frais immédiats 5 000 → il manque 5 000', () => {
  const r = L.cashCheck({ cash: 50000, reserve: 10000, spends: [{ label: 'Achat', value: 40000 }, { label: 'Frais immédiats obligatoires', value: 5000 }] });
  assert.equal(r.state, 'short'); assert.equal(r.shortfall, 5000); assert.equal(r.exact, true);
  // Sans les frais, le prix seul est inférieur au solde : ce n’est pas une preuve d’accès.
  assert.equal(L.cashCheck({ cash: 50000, reserve: 10000, spends: [{ label: 'Achat', value: 40000 }] }).state, 'ok');
  const unknownFee = L.cashCheck({ cash: 50000, reserve: 10000, spends: [{ label: 'Achat', value: 40000 }, { label: 'Frais', value: V.unknown() }] });
  assert.equal(unknownFee.state, 'unknown');
  const shortAnyway = L.cashCheck({ cash: 50000, reserve: 10000, spends: [{ label: 'Achat', value: 45000 }, { label: 'Frais', value: V.unknown() }] });
  assert.equal(shortAnyway.state, 'short'); assert.equal(shortAnyway.exact, false); assert.equal(shortAnyway.shortfall, 5000);
  assert.equal(L.cashCheck({ cash: null, spends: [] }).state, 'unknown');
});

test('admission : une condition non remplie n’est jamais compensée ; inconnu, hypothèse et plus petit changement utile', () => {
  const ko = L.admission([{ id: 'budget', label: 'Budget', state: 'ok' }, { id: 'terrain', label: 'Tout-terrain', state: 'ko', fix: { text: 'Choisir un véhicule tout-terrain.' } }, { id: 'perf', label: 'Très rapide', state: 'ok' }]);
  assert.equal(ko.state, 'impossible'); assert.equal(ko.fix.text, 'Choisir un véhicule tout-terrain.');
  assert.equal(L.admission([{ state: 'ok' }, { state: 'unknown' }]).state, 'inconnu');
  assert.equal(L.admission([{ state: 'ok' }, { state: 'assumed' }]).state, 'conditionnel');
  assert.equal(L.admission([{ state: 'ok' }, { state: 'na' }]).state, 'admissible');
  assert.equal(L.admission([{ state: 'ko', fix: { text: 'a', delta: 9 } }]).fix.delta, 9);
});

test('prérequis : chaîne récursive, prérequis partagé compté une fois, possession réutilisée sans être refacturée', () => {
  const nodes = {
    mission: { id: 'mission', name: 'Mission répétable', kind: 'activity', requires: ['vehicule', 'arme', 'deblocage'] },
    mission2: { id: 'mission2', name: 'Autre mission', kind: 'activity', requires: ['vehicule', 'deblocage'] },
    vehicule: { id: 'vehicule', name: 'Véhicule requis', kind: 'item', price: 60000, minutes: 12 },
    arme: { id: 'arme', name: 'Arme requise', kind: 'item', price: 10000, minutes: 8 },
    deblocage: { id: 'deblocage', name: 'Mission de déblocage', kind: 'unlock', minutes: 10, requires: ['vehicule'] }
  };
  const r = L.prerequisites({ nodes, targets: ['mission', 'mission2'] });
  assert.equal(r.ok, true);
  assert.deepEqual(r.order, ['vehicule', 'arme', 'deblocage', 'mission', 'mission2']);
  assert.equal(r.totals.price.value, 70000, 'le véhicule partagé est payé une fois');
  assert.equal(r.totals.minutes.value, 30);
  assert.equal(r.steps.find(s => s.id === 'vehicule').shared, true);
  const owned = L.prerequisites({ nodes, targets: ['mission'], owned: ['vehicule'] });
  assert.equal(owned.totals.price.value, 10000); assert.deepEqual(owned.reused, ['vehicule']);
  // Retirer une possession indispensable ne peut pas rendre une activité accessible sans l’acheter.
  assert.ok(owned.order.indexOf('vehicule') < 0 && r.order.indexOf('vehicule') >= 0);
});

test('prérequis : dépendance circulaire et référence absente donnent un blocage expliqué, sans boucle', () => {
  const cyc = L.prerequisites({ nodes: { a: { id: 'a', name: 'A', requires: ['b'] }, b: { id: 'b', name: 'B', requires: ['c'] }, c: { id: 'c', name: 'C', requires: ['a'] } }, targets: ['a'] });
  assert.equal(cyc.ok, false); assert.deepEqual(cyc.cycles[0], ['a', 'b', 'c', 'a']); assert.match(cyc.reason, /Dépendance circulaire : A → B → C → A/);
  const miss = L.prerequisites({ nodes: { a: { id: 'a', name: 'A', requires: ['fantome'] } }, targets: ['a'] });
  assert.equal(miss.ok, false); assert.equal(miss.missingRefs[0].ref, 'fantome'); assert.match(miss.reason, /n’existe pas/);
});

test('prérequis : solutions équivalentes — la possédée, sinon la moins chère ; à départager si un prix manque', () => {
  const nodes = { act: { id: 'act', name: 'Activité', requires: [{ anyOf: ['moto', 'voiture'], label: 'un véhicule rapide' }] }, moto: { id: 'moto', name: 'Moto', price: 30000 }, voiture: { id: 'voiture', name: 'Voiture', price: 50000 } };
  const r = L.prerequisites({ nodes, targets: ['act'] });
  assert.equal(r.choices[0].chosen, 'moto'); assert.equal(r.totals.price.value, 30000);
  assert.equal(L.prerequisites({ nodes, targets: ['act'], owned: ['voiture'] }).totals.price.value, 0);
  const unknown = L.prerequisites({ nodes: { ...nodes, moto: { id: 'moto', name: 'Moto', price: V.unknown() } }, targets: ['act'] });
  assert.equal(unknown.choices[0].chosen, 'voiture'); assert.equal(unknown.choices[0].decided, false);
});

test('grand livre : conservation des flux, point le plus bas, franchissement de la réserve', () => {
  const g = L.ledger(100000, [
    { t: 0, type: 'spend', amount: 60000, label: 'Véhicule' }, { t: 12, type: 'spend', amount: 10000, label: 'Arme' },
    { t: 30, type: 'spend', amount: 5000, label: 'Consommables' }, { t: 60, type: 'receive', amount: 150000, label: 'Récompense' }
  ], 20000);
  assert.equal(g.final, 175000); assert.equal(g.receipts, 150000); assert.equal(g.spends, 75000);
  assert.equal(g.conserved, true); assert.equal(g.low.value, 25000); assert.equal(g.low.label, 'Consommables'); assert.equal(g.reserveBreach, null);
  assert.equal(L.ledger(30000, [{ t: 0, type: 'spend', amount: 15000, label: 'X' }], 20000).reserveBreach.label, 'X');
});

test('seuil de bascule, résultats trop proches, variations sans probabilité', () => {
  // Achat A (100 000 + 4 000/partie) contre B (130 000 + 1 000/partie) : la décision bascule à 10 parties.
  const f = n => (100000 + 4000 * n) <= (130000 + 1000 * n) ? 'A' : 'B';
  const t = L.threshold(f, 1, 30);
  assert.equal(t.flips, true); assert.ok(Math.abs(t.at - 10) < 1e-6); assert.equal(t.before, 'A'); assert.equal(t.after, 'B');
  assert.equal(L.threshold(() => 'X', 0, 1).flips, false);
  assert.equal(L.close(100000, 103000, 0.05), true); assert.equal(L.close(100000, 120000, 0.05), false); assert.equal(L.close(null, 1), false);
  assert.deepEqual(L.variations(x => x * 2, 10).map(v => v.result), [16, 20, 24]);
});

test('séquences : la recherche exhaustive retrouve le meilleur ordre d’une recherche brute indépendante et respecte les contraintes', () => {
  const items = [{ id: 'a' }, { id: 'b', before: ['a'] }, { id: 'c' }, { id: 'd' }];
  const cost = { a: 3, b: 1, c: 2, d: 4 };
  const score = order => ({ valid: true, key: [order.reduce((s, id, i) => s + cost[id] * (i + 1), 0)] });
  const r = L.sequences(items, score);
  assert.equal(r.method, 'exhaustive'); assert.equal(r.explored, 24);
  // Brute force indépendante.
  let best = null;
  const perm = (p, rest) => { if (!rest.length) { if (p.indexOf('a') > p.indexOf('b')) return; const v = p.reduce((s, id, i) => s + cost[id] * (i + 1), 0); if (!best || v < best.v) best = { p, v }; return; } rest.forEach((x, i) => perm(p.concat(x), rest.filter((_, j) => j !== i))); };
  perm([], ['a', 'b', 'c', 'd']);
  assert.deepEqual(r.best.order, best.p); assert.equal(r.best.result.key[0], best.v);
  assert.ok(r.valid.every(v => v.order.indexOf('a') < v.order.indexOf('b')));
  // Au-delà de 7 éléments : heuristique annoncée comme telle.
  const many = Array.from({ length: 9 }, (_, i) => ({ id: 'x' + i }));
  const h = L.sequences(many, o => ({ valid: true, key: [o.reduce((s, id, i) => s + Number(id.slice(1)) * (9 - i), 0)] }));
  assert.equal(h.method, 'heuristic'); assert.match(h.note, /il peut en exister une meilleure/);
});

test('classement : faisabilité d’abord, front de Pareto, une option sans intérêt ajoutée ne change pas le front des autres', () => {
  const opts = [
    { id: 'rapide', admission: { state: 'admissible' }, values: { cost: 100, time: 2 } },
    { id: 'eco', admission: { state: 'admissible' }, values: { cost: 60, time: 5 } },
    { id: 'incompatible', admission: { state: 'impossible' }, values: { cost: 10, time: 1 } }
  ];
  const p = L.pareto(opts, ['cost', 'time']);
  assert.deepEqual(p.front.map(x => x.id).sort(), ['eco', 'rapide']); assert.deepEqual(p.excluded.map(x => x.id), ['incompatible']);
  const q = L.pareto(opts.concat([{ id: 'nul', admission: { state: 'admissible' }, values: { cost: 200, time: 9 } }]), ['cost', 'time']);
  assert.deepEqual(q.front.map(x => x.id).sort(), ['eco', 'rapide']);
  // Donnée manquante : pas d’avantage ni de pénalité artificielle.
  const r = L.pareto([{ id: 'x', values: { cost: 50, time: null } }, { id: 'y', values: { cost: 40, time: 3 } }], ['cost', 'time']);
  assert.deepEqual(r.front.map(x => x.id).sort(), ['x', 'y']);
  // Réordonner la liste ne change pas le mérite.
  assert.deepEqual(L.pareto(opts.slice().reverse(), ['cost', 'time']).front.map(x => x.id).sort(), ['eco', 'rapide']);
});

test('explication : les facteurs de l’outil sont soit utilisés, soit écartés avec une raison ; les autres sont signalés', () => {
  const all = L.factorsFor('budget').map(f => f.id);
  const e = L.explain({ tool: 'budget', used: all.slice(0, 2), excluded: {}, aim: 'Garder assez', values: [{ label: 'Argent', value: 200000, unit: '$' }] });
  assert.equal(e.unaccounted.length, all.length - 2);
  const excluded = Object.fromEntries(all.slice(2).map(id => [id, 'Pas dans ce calcul']));
  const f = L.explain({ tool: 'budget', used: all.slice(0, 2), excluded });
  assert.deepEqual(f.unaccounted, []); assert.equal(f.excluded.length, all.length - 2);
  assert.equal(e.values[0].origin, 'toi'); assert.equal(e.values[0].status, 'personal');
});

test('unités : carburant simulé cohérent (km × L/100 km × $/L) et conversions partie ↔ heure sans double comptage', () => {
  assert.equal(L.units.fuelPerSession(50, 8, 2), 8);
  assert.equal(L.units.perSessionToPerHour(3000, 60), 3000); assert.equal(L.units.perSessionToPerHour(3000, 90), 2000);
  assert.equal(L.units.perHourToPerSession(2000, 90), 3000);
  assert.equal(L.units.perSessionToPerHour(3000, 0), null);
  // Convertir correctement les unités ne change pas le résultat.
  const perSession = L.usageCost({ initial: 0, perSession: 3000 }, { sessions: 4 }).total.value;
  const perHour = L.usageCost({ initial: 0, perHour: L.units.perSessionToPerHour(3000, 90) }, { hours: 4 * 90 / 60 }).total.value;
  assert.equal(perSession, perHour);
  assert.equal(L.parseFr('1 250,50').value, 1250.5); assert.equal(L.parseFr('').valid, false);
});

test('fiche documentaire : « Prix à venir » et « Achat à confirmer » restent distincts ; un repère de GTA V n’est pas une valeur de GTA VI', () => {
  const v = L.fiche('vehicle', L.fromVehicle({ cat: 'bateau' }));
  const field = (f, id) => f.flatMap(r => r.champs).find(c => c.id === id);
  assert.equal(field(v, 'price').text, 'Prix à venir'); assert.equal(field(v, 'purchasable').text, 'Achat à confirmer');
  assert.equal(field(v, 'terrain').value.v, 'eau'); assert.equal(field(v, 'terrain').value.s, 'estimated');
  assert.match(field(v, 'fuel').text, /Carburant : mécanique non confirmée/); assert.match(field(v, 'fuel').note, /jauge/);
  const c = L.fiche('consumable', L.fromConsumable({ statut: 'officiel', effet: { texte: 'Rend de la vie', valeur: 20, unite: 'sante', jeu: 'GTA V' }, prix_gta6: { valeur: null } }));
  const h = field(c, 'health');
  assert.equal(h.text, 'Récupération de vie : à confirmer'); assert.equal(h.repere.v, 20); assert.equal(L.V.usable(h.value), false);
  // v7.50 : un chiffre d’armure (gilet) n’est jamais lu comme de la vie rendue.
  const armure = field(L.fiche('consumable', L.fromConsumable({ statut: 'serie', effet: { texte: 'Protège', valeur: 40, unite: 'armure', jeu: 'GTA V' } })), 'health');
  assert.equal(armure.repere, null); assert.equal(armure.text, 'Récupération de vie : à confirmer');
  const na = L.fiche('style', { price: L.V.na() }); assert.equal(field(na, 'price').text, 'Ne s’applique pas');
  const known = L.fiche('weapon', { price: L.V.official(1200) }); assert.equal(field(known, 'price').text, null); assert.equal(field(known, 'price').known, true);
  // Toutes les catégories ont des rubriques et des champs exploitables.
  for (const cat of L.modele.categories) assert.ok(L.fiche(cat.id, {}).every(r => r.champs.length), cat.id);
});
