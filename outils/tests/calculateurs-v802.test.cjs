'use strict';
/* v8.02, calculateur lot 1 (« l’indispensable, invisible à l’écran ») : ponts de données et conditions de lancement.
   1. Référence : sans les nouvelles données, chaque résultat est identique à la v8.01 (exemples A, B et C, neuf outils, moteur,
      business plan) — outils/tests/reference-v801.cjs, fixtures/calculateur-v801-reference.json.
   2. Adaptateur (calculateurs-data.js → activities, rules, catalogue) : chaque champ relu.
   3. Ponts : outils/gen-missions.cjs (activitesDe) et outils/gen-activites.cjs (activitesCalculateur, pont qui écrit vraiment).
   4. Moteur : argent à avoir en poche (minCash) et rang (minRank), ordre de l’histoire, vérificateur (R11, R12).
   5. Scénario et atelier : le plan reçoit ces champs, demande le rang, explique ; une mission « une seule fois » ne se répète pas
      dans Mes calculs ; l’atelier copie une mission du site avec ses conditions (jsdom).
   Chaque valeur attendue est calculée à la main dans le commentaire qui la précède. Tous les montants sont FICTIFS : ils
   vérifient le modèle, pas une mécanique de GTA VI. */
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), os = require('node:os');
const root = path.resolve(__dirname, '../..');
const E = require(path.join(root, 'calculateurs-engine.js')), B = require(path.join(root, 'calculateurs-scenario.js'));
const REF = require('./reference-v801.cjs');
const flat = s => String(s === undefined || s === null ? '' : s).replace(/[\s  ]+/g, ' ');
const rules = v => (v.violations || []).map(x => x.rule);
const m = o => ({ id: 'm', name: 'M', reward: 0, cost: 0, duration: 10, prep: 0, cooldown: 0, share: 100, investment: 0, players: 1, ...o });
const toEvents = j => j.map(e => e.kind ? e : { at: e.at, kind: e.type === 'spend' ? 'spend' : 'earn', amount: e.amount, needs: e.needs, unlocks: e.unlocks, asset: e.asset, id: e.id, session: e.session });
/* l’adaptateur tourne dans un contexte à part (comme la page) : ses résultats sont recopiés dans ce contexte-ci (tableaux comparables) */
const plain = x => JSON.parse(JSON.stringify(x));
function adapter(activities, extra = {}) {
  const ctx = { window: { LK_ACTIVITIES: activities, ...extra } }; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(root, 'calculateurs-data.js'), 'utf8'), ctx);
  const D = ctx.window.LKCalcData;
  return { activities: () => plain(D.activities()), rules: () => plain(D.rules()), catalogue: () => plain(D.catalogue()) };
}

/* ---------- 1. Référence v8.01 ---------- */
test('v8.02 lot 1 : sans données nouvelles, les neuf outils, le moteur et le plan donnent exactement les résultats de la v8.01 (exemples A, B, C)', () => {
  const ref = JSON.parse(fs.readFileSync(REF.FILE, 'utf8')).results, now = REF.compute(), diffs = REF.compare(ref, now);
  assert.ok(Object.keys(ref).length >= 200, 'référence complète');
  assert.deepEqual(diffs.map(d => d.key), [], 'écarts : ' + JSON.stringify(diffs.slice(0, 3)));
});

/* ---------- 2. Adaptateur ---------- */
test('adaptateur : activities() relit requiresMissions, requiresPurchaseIds, once, units, done, order, chapitre, déblocage, argent à avoir et rang', () => {
  const D = adapter([
    { id: 'mission-a', name: 'A', reward: { value: 25000, status: 'official', source: 'https://example.test/a', verifiedAt: '2026-11-20', unit: '$' }, duration: 12, requiresMissions: ['mission-b', 3], requiresPurchaseIds: ['garage'], once: true, done: true, units: { value: 40, status: 'verified', source: 'relevé', verifiedAt: '2026-11-21', unit: 'XP' }, order: 3, chapter: 2, chapterTitle: 'Chapitre deux', kind: 'histoire', unlockText: 'Après B.', minCash: { value: 30000, status: 'official', source: 'https://example.test/a', verifiedAt: '2026-11-20', unit: '$' }, minRank: 12 },
    { id: 'mission-b', name: 'B', reward: 1000, cost: 0, duration: 5, prep: 0, cooldown: 0, share: 100, investment: 0, players: 1 }
  ]);
  const [a, b] = D.activities();
  assert.deepEqual(a.requiresMissions, ['mission-b']); // le 3 (pas un identifiant) est écarté
  assert.deepEqual(a.requiresPurchaseIds, ['garage']);
  assert.equal(a.once, true); assert.equal(a.done, true);
  assert.equal(a.units, 40); assert.equal(a.fieldMeta.units.status, 'verified');
  assert.equal(a.order, 3); assert.equal(a.chapter, 2); assert.equal(a.chapterTitle, 'Chapitre deux'); assert.equal(a.kind, 'histoire'); assert.equal(a.unlockText, 'Après B.');
  assert.equal(a.minCash, 30000); assert.equal(a.fieldMeta.minCash.status, 'official'); assert.equal(a.fieldMeta.minCash.source, 'https://example.test/a');
  assert.equal(a.minRank, 12); assert.equal(a.fieldMeta.minRank.status, 'unverified'); // nombre nu : non confirmé
  /* B ne publie rien de plus : listes vides, faux, null ; units, minCash et minRank absents (jamais 0, jamais une erreur de saisie) */
  assert.deepEqual(b.requiresMissions, []); assert.equal(b.once, false); assert.equal(b.done, false); assert.equal(b.order, null);
  assert.ok(!('units' in b) && !('minCash' in b) && !('minRank' in b));
  assert.equal(b.fieldMeta.units.status, 'unknown');
  assert.equal(E.activity(b).valid, true, 'une activité complète sans points reste calculable (aucune erreur « points »)');
});

test('adaptateur : rules() lit les règles d’argent publiées et rend « inconnu » sans elles', () => {
  const none = adapter([]).rules();
  assert.equal(none.money.value, null); assert.equal(none.fine.value, null); assert.equal(none.death.value, null); assert.equal(none.arrest.value, null);
  const D = adapter([], { LK_CALC_REGLES: { argentPersonnages: { value: 'separe', status: 'official', source: 'https://example.test/r', verifiedAt: '2026-11-20' }, amende: { value: 500, status: 'verified', source: 'relevé', verifiedAt: '2026-11-21', unit: '$' }, perteMort: { value: 10, status: 'estimated', unit: '%' }, perteArrestation: { value: null, status: 'unknown', unit: '$' } } }).rules();
  assert.equal(D.money.value, 'separe'); assert.equal(D.money.meta.status, 'official');
  assert.equal(D.fine.value, 500); assert.equal(D.fine.meta.unit, '$');
  assert.equal(D.death.value, 10); assert.equal(D.death.meta.unit, '%');
  assert.equal(D.arrest.value, null);
  const bad = adapter([], { LK_CALC_REGLES: { argentPersonnages: { value: 'moitié', status: 'official' } } }).rules();
  assert.equal(bad.money.value, null, 'une valeur hors « commun » / « separe » n’est jamais retenue');
});

test('adaptateur : le revenu passif d’une fiche n’apparaît que s’il est publié (empreinte des données inchangée sans lui)', () => {
  const entry = { id: 'atelier', type: 'business', name: 'Atelier', url: '/entreprises/atelier.html' };
  const plain = adapter([], { LK_CALCULATEURS_CATALOGUE: { entries: [entry] } }).catalogue().find(x => x.id === 'atelier');
  assert.ok(!('income' in plain));
  const withIncome = adapter([], { LK_CALCULATEURS_CATALOGUE: { entries: [{ ...entry, revenu: { montant: { value: 5000, status: 'official', source: 'https://example.test/e', verifiedAt: '2026-11-20', unit: '$' }, frequence: { value: 48, status: 'official', source: 'https://example.test/e', verifiedAt: '2026-11-20', unit: 'min' }, plafond: { value: 100000, status: 'official', source: 'https://example.test/e', verifiedAt: '2026-11-20', unit: '$' }, conditions: 'Posséder le local.' } }] } }).catalogue().find(x => x.id === 'atelier');
  assert.deepEqual([withIncome.income.amount, withIncome.income.everyMinutes, withIncome.income.cap, withIncome.income.conditions], [5000, 48, 100000, 'Posséder le local.']);
  assert.equal(withIncome.income.meta.amount.status, 'official');
  assert.deepEqual(Object.keys(withIncome.fieldMeta).sort(), ['acceleration', 'price', 'seats', 'speed'], 'les métadonnées du revenu ne vont pas dans fieldMeta (empreinte)');
});

/* ---------- 3. Ponts ---------- */
test('pont des missions : activitesDe transmet frais, préparation, attente, part, achat de départ, joueurs, prérequis, ordre, chapitre, déblocage', () => {
  const G = require(path.join(root, 'outils/gen-missions.cjs'));
  const v = (value, unit, status = 'official') => ({ value, status, source: 'https://example.test/m', verifiedAt: '2026-11-20', unit });
  const missions = [
    { id: 'premier-coup', nom: 'Premier coup', type: 'histoire', ordre: 1, chapitre: { numero: 1, titre: 'Les Keys' }, recompenses: { argent: v(20000, '$') }, duree: v(15, 'min'), joueurs: 1, deblocage: { texte: 'Dès le début.' } },
    { id: 'deuxieme-coup', nom: 'Deuxième coup', type: 'histoire', ordre: 2, chapitre: { numero: 1, titre: 'Les Keys' }, recompenses: { argent: v(50000, '$') }, duree: v(30, 'min'), joueurs: 2,
      cout: v(2500, '$'), preparation: v(5, 'min'), attente: v(0, 'min'), part: v(60, '%'), investissement: v(10000, '$', 'estimated'),
      deblocage: { texte: 'Après Premier coup, avec 30 000 $ en poche.', missions: ['premier-coup', 'sans-chiffres'], achats: ['karin-sultan'], argentMinimum: v(30000, '$'), rang: v(3, 'rang') } },
    { id: 'livraisons', nom: 'Livraisons', type: 'secondaire', repetable: { value: true }, recompenses: { argent: v(4000, '$') }, duree: v(8, 'min') },
    { id: 'rencontre-x', nom: 'Rencontre X', type: 'rencontre', repetable: { value: null }, recompenses: { argent: v(1000, '$') }, duree: v(3, 'min') },
    { id: 'sans-chiffres', nom: 'Sans chiffres', type: 'histoire', recompenses: { argent: { value: null, status: 'unknown', unit: '$' } }, duree: { value: null, status: 'unknown', unit: 'min' } }
  ];
  const acts = G.activitesDe(missions), by = id => acts.find(a => a.id === 'mission-' + id);
  assert.deepEqual(acts.map(a => a.id), ['mission-premier-coup', 'mission-deuxieme-coup', 'mission-livraisons', 'mission-rencontre-x'], 'seules les missions avec gain ET durée publiés');
  const d = by('deuxieme-coup');
  assert.deepEqual([d.cost.value, d.prep.value, d.cooldown.value, d.share.value, d.investment.value, d.investment.status], [2500, 5, 0, 60, 10000, 'estimated']);
  assert.equal(d.players, 2);
  assert.deepEqual(d.requiresMissions, ['mission-premier-coup'], 'une mission demandée sans chiffres n’est pas imposée');
  assert.deepEqual(d.requiresPurchaseIds, ['karin-sultan']);
  assert.deepEqual([d.minCash.value, d.minCash.unit, d.minRank.value, d.minRank.unit], [30000, '$', 3, 'rang']);
  assert.deepEqual([d.once, d.order, d.chapter, d.chapterTitle, d.kind, d.unlockText], [true, 2, 1, 'Les Keys', 'histoire', 'Après Premier coup, avec 30 000 $ en poche.']);
  assert.equal(by('livraisons').once, false, 'repetable: true');
  assert.equal(by('rencontre-x').once, true, 'repetable inconnu : une rencontre compte une seule fois');
  assert.ok(!('cost' in by('premier-coup')) && !('minCash' in by('premier-coup')), 'rien d’inventé quand rien n’est publié');
  assert.deepEqual(G.prerequisNonCalcules(missions), ['deuxieme-coup demande sans-chiffres']);
  /* l’adaptateur relit tout ce que le pont écrit */
  const a2 = adapter(acts).activities().find(a => a.id === 'mission-deuxieme-coup');
  assert.deepEqual([a2.cost, a2.prep, a2.share, a2.investment, a2.minCash, a2.minRank, a2.once, a2.order, a2.players], [2500, 5, 60, 10000, 30000, 3, true, 2, 2]);
  assert.deepEqual(a2.requiresMissions, ['mission-premier-coup']);
});

test('pont des missions : une donnée mal formée arrête la génération (valeurs, prérequis inconnus, boucles, mission qui se rejoue demandée)', () => {
  const G = require(path.join(root, 'outils/gen-missions.cjs')), ctx = G.context(root);
  const base = { id: 'test-x', nom: 'Test', type: 'histoire', resume: 'Résumé.', statut: 'officiel', sources: [] };
  const errs = mm => G.checkMission(mm, { ...ctx, M: { ...ctx.M, missions: [mm, { ...base, id: 'rejouable', repetable: { value: true } }] } });
  assert.deepEqual(errs(base), []);
  assert.ok(errs({ ...base, cout: { value: 10, status: 'official', unit: '$' } }).some(e => /frais pour la lancer.*exige source/.test(e)));
  assert.ok(errs({ ...base, part: { value: 50, status: 'estimated', unit: '$' } }).some(e => /part du butin : unité attendue « % »/.test(e)));
  assert.ok(errs({ ...base, deblocage: { missions: ['inconnue'] } }).some(e => /mission demandée inconnue inconnue/.test(e)));
  assert.ok(errs({ ...base, deblocage: { missions: ['rejouable'] } }).some(e => /se rejoue/.test(e)));
  assert.ok(errs({ ...base, deblocage: { missions: ['test-x'] } }).some(e => /elle-même/.test(e)));
  assert.ok(errs({ ...base, deblocage: { achats: ['pas-une-fiche'] } }).some(e => /achat demandé inconnu pas-une-fiche/.test(e)));
  assert.ok(errs({ ...base, deblocage: { rang: { value: 3, status: 'estimated', unit: 'niveau' } } }).some(e => /rang demandé : unité attendue « rang »/.test(e)));
  assert.ok(errs({ ...base, repetable: { value: 'oui' } }).some(e => /repetable attendu/.test(e)));
  assert.ok(errs({ ...base, joueurs: 0 }).some(e => /joueurs doit être un entier/.test(e)));
  /* boucle : a demande b, b demande a */
  const loop = [{ ...base, id: 'a', deblocage: { missions: ['b'] } }, { ...base, id: 'b', deblocage: { missions: ['a'] } }];
  assert.throws(() => G.check({ ...ctx, M: { ...ctx.M, missions: loop } }), /missions demandées en boucle : a → b → a/);
});

test('pont des activités : activitesCalculateur transmet les chiffres publiés et pont() écrit calculateurs-activites.js sans toucher aux missions', () => {
  const A = require(path.join(root, 'outils/gen-activites.cjs'));
  const v = (value, unit, status = 'verified') => ({ value, status, source: 'relevé en jeu', verifiedAt: '2026-11-21', unit });
  const list = [
    { id: 'peche', nom: 'Pêche', rapporte: { gain: v(800, '$'), duree: v(6, 'min'), preparation: v(1, 'min'), cout: v(50, '$'), attente: v(2, 'min'), part: v(100, '%'), investissement: v(300, '$'), joueurs: 1, achats: ['karin-sultan'], argentMinimum: v(1000, '$'), rang: v(2, 'rang') } },
    { id: 'courses', nom: 'Courses', rapporte: { gain: null, duree: null } }
  ];
  const acts = A.activitesCalculateur(list);
  assert.equal(acts.length, 1);
  const p = acts[0];
  assert.deepEqual([p.id, p.reward.value, p.duration.value, p.prep.value, p.cost.value, p.cooldown.value, p.share.value, p.investment.value, p.players, p.minCash.value, p.minRank.value, p.once, p.kind], ['activite-peche', 800, 6, 1, 50, 2, 100, 300, 1, 1000, 2, false, 'activite']);
  assert.deepEqual(p.requiresPurchaseIds, ['karin-sultan']);
  /* écriture réelle, dans une copie : les entrées « mission-* » restent, une deuxième passe ne réécrit rien */
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lk-pont-'));
  try {
    const head = fs.readFileSync(path.join(root, 'calculateurs-activites.js'), 'utf8').replace(/window\.LK_ACTIVITIES = \[[\s\S]*?\];\s*$/, '');
    fs.writeFileSync(path.join(dir, 'calculateurs-activites.js'), head + 'window.LK_ACTIVITIES = ' + JSON.stringify([{ id: 'mission-x', name: 'X', reward: 1, duration: 1 }]) + ';\n');
    assert.deepEqual(A.pont(dir, list), { ecrit: true, activites: 1 });
    const written = fs.readFileSync(path.join(dir, 'calculateurs-activites.js'), 'utf8');
    assert.ok(written.startsWith(head), 'l’en-tête et les règles d’argent restent');
    const ctx = { window: {} }; vm.createContext(ctx); vm.runInContext(written, ctx);
    assert.deepEqual(plain(ctx.window.LK_ACTIVITIES.map(a => a.id)), ['mission-x', 'activite-peche']);
    assert.deepEqual(A.pont(dir, list), { ecrit: false, activites: 1 });
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

/* ---------- 4. Moteur ---------- */
test('argent à avoir en poche (parties) : la mission attend la partie où l’argent est là ; le journal le prouve (R11)', () => {
  /* départ 10 000 $ ; A se refait (5 000 $ net en 10 min) ; B une seule fois (50 000 $ en 10 min) demande 30 000 $ en poche.
     Partie 1 (60 min) : B impossible (10 000 < 30 000) → A × 6 = +30 000 → 40 000. Partie 2 : B d’abord (40 000 ≥ 30 000) → 90 000,
     puis A × 5 (50 min) = +25 000 → 115 000 ≥ 100 000 : but atteint en 2 parties. */
  const r = E.missionPlan({ capital: 10000, target: 100000, sessionMinutes: 60, activities: [m({ id: 'a', name: 'A', reward: 5000 }), m({ id: 'b', name: 'B', reward: 50000, once: true, minCash: 30000 })] });
  assert.equal(r.valid, true, r.reason); assert.equal(r.reached, true); assert.equal(r.totalSessions, 2); assert.equal(r.finalCash, 115000);
  const unlock = r.route.find(x => x.type === 'unlock');
  assert.deepEqual([unlock.id, unlock.session, unlock.holds], ['b', 2, 30000]);
  const v = E.missionVerify(r); assert.equal(v.ok, true, JSON.stringify(v.violations));
  /* journal falsifié : B lancé avec 10 000 $ en poche → R11 */
  const events = toEvents(r.journal).map(e => e.kind === 'act' && e.id === 'b' ? { ...e, holds: 999999 } : e);
  const bad = E.cashJournalVerify({ capital: 10000, events, claim: {} });
  assert.ok(rules(bad).includes('R11'));
});

test('argent à avoir en poche (parcours) : la mission se lance dès que l’argent est là, et le blocage se dit en mots simples', () => {
  /* parcours : A × 4 → 30 000 $ (40 min) ; B (40 → 50 min) → 80 000 ; A × 4 → 100 000 à 90 min. */
  const r = E.missionPlan({ capital: 10000, target: 100000, activities: [m({ id: 'a', name: 'A', reward: 5000 }), m({ id: 'b', name: 'B', reward: 50000, once: true, minCash: 30000 })] });
  assert.equal(r.valid, true, r.reason); assert.equal(r.totalMinutes, 90);
  assert.deepEqual(r.route.filter(x => x.type === 'unlock').map(x => [x.id, x.start, x.holds]), [['b', 40, 30000]]);
  assert.equal(E.missionVerify(r).ok, true);
  /* seule B, aucun gain : il manque 30 000 − 10 000 = 20 000 $ */
  for (const sessionMinutes of [null, 60]) {
    const f = E.missionPlan({ capital: 10000, target: 100000, sessionMinutes, activities: [m({ id: 'b', name: 'B', reward: 50000, once: true, minCash: 30000 })] });
    assert.equal(f.valid, false);
    assert.equal(flat(f.reason), 'Il te faut encore 20 000 $ avant de pouvoir lancer « B » : elle demande d’avoir 30 000 $ en poche (cet argent n’est pas dépensé), tu en as 10 000 $.');
  }
  /* mission qui se refait, demandée avec 30 000 $ en poche, départ 10 000 $ : même phrase (il manque 20 000 $) */
  const g = E.missionPlan({ capital: 10000, target: 100000, activities: [m({ id: 'c', name: 'C', reward: 5000, minCash: 30000 })] });
  assert.equal(flat(g.reason), 'Il te faut encore 20 000 $ avant de pouvoir lancer « C » : elle demande d’avoir 30 000 $ en poche (cet argent n’est pas dépensé), tu en as 10 000 $.');
});

test('rang demandé : sans rang écrit ou rang trop bas, la mission est bloquée et le plan dit pourquoi ; rang atteint, elle compte (R12)', () => {
  const A = m({ id: 'a', name: 'A', reward: 5000, minRank: 5 });
  const none = E.missionPlan({ capital: 0, target: 20000, activities: [A] });
  assert.equal(flat(none.reason), '« A » demande d’abord le rang 5 (écris ton rang dans « Où en es-tu ? »).');
  const low = E.missionPlan({ capital: 0, target: 20000, rank: 3, activities: [A] });
  assert.equal(flat(low.reason), '« A » demande d’abord le rang 5 (tu as écrit le rang 3).');
  /* rang 5 : 4 × 5 000 $ = 20 000 $ en 40 min */
  const ok = E.missionPlan({ capital: 0, target: 20000, rank: 5, activities: [A] });
  assert.equal(ok.valid, true, ok.reason); assert.equal(ok.totalMinutes, 40); assert.equal(ok.rules.rank, 5);
  assert.equal(E.missionVerify(ok).ok, true);
  const bad = E.cashJournalVerify({ capital: 0, events: toEvents(ok.journal), claim: { rank: 3 } });
  assert.ok(rules(bad).includes('R12'));
  /* en parties : même refus, même phrase */
  const s = E.missionPlan({ capital: 0, target: 20000, sessionMinutes: 60, rank: 3, activities: [A] });
  assert.match(flat(s.reason), /« A » demande d’abord le rang 5 \(tu as écrit le rang 3\)/);
  /* une mission « une fois » au rang trop haut, demandée par un achat d’avant : refus immédiat (jamais atteignable) */
  const p = E.missionPlan({ capital: 0, goalPrice: 1000, rank: 1, activities: [m({ id: 'u', name: 'U', reward: 5000, once: true, minRank: 9 }), m({ id: 'r', name: 'R', reward: 5000 })], purchases: [{ id: 'p', name: 'P', price: 500, requires: ['u'] }] });
  assert.equal(p.valid, false); assert.match(flat(p.reason), /L’achat « P » attend d’abord la mission \(U\), qui ne peut pas se faire\./);
});

test('ordre de l’histoire : deux missions « une fois » prêtes en même temps passent dans l’ordre publié', () => {
  const acts = order => [m({ id: 'c1', name: 'C1', reward: 1000, once: true, order: order[0] }), m({ id: 'c2', name: 'C2', reward: 1000, once: true, order: order[1] }), m({ id: 'x', name: 'X', reward: 1000 })];
  const ids = r => r.route.filter(x => x.type === 'unlock').map(x => x.id);
  assert.deepEqual(ids(E.missionPlan({ capital: 0, target: 10000, activities: acts([2, 1]) })), ['c2', 'c1']);
  assert.deepEqual(ids(E.missionPlan({ capital: 0, target: 10000, activities: acts([1, 2]) })), ['c1', 'c2']);
  /* sans ordre publié : l’ordre de la liste, comme avant */
  assert.deepEqual(ids(E.missionPlan({ capital: 0, target: 10000, activities: acts([null, null]) })), ['c1', 'c2']);
});

test('argent à avoir en poche dans Mes calculs : objectif, temps donné, rotation et partie le respectent', () => {
  const act = { reward: 1000, cost: 0, duration: 10, minCash: 5000 };
  assert.equal(flat(E.goal({ capital: 1000, target: 10000, dailyMinutes: 60, activity: act }).reason), 'Pour lancer cette activité, il faut avoir 5 000 $ en poche (cet argent n’est pas dépensé) : il te manque encore 4 000 $.');
  /* avec 6 000 $ : comme sans la condition (9 missions de 1 000 $ pour passer de 6 000 à 15 000) */
  const g = E.goal({ capital: 6000, target: 15000, dailyMinutes: 60, activity: act }), g0 = E.goal({ capital: 6000, target: 15000, dailyMinutes: 60, activity: { ...act, minCash: undefined } });
  assert.equal(g.runs, 9); assert.deepEqual(g, g0);
  assert.equal(E.inverse({ minutes: 60, capital: 1000, activity: act }).valid, false);
  assert.equal(E.inverse({ minutes: 60, capital: 5000, activity: act }).runs, 6);
  const mixed = E.goalMixed({ capital: 1000, target: 10000, dailyMinutes: 120, activities: [{ name: 'Libre', reward: 1000, duration: 10 }, { name: 'Chère', reward: 1000, duration: 10, minCash: 5000 }] });
  assert.equal(flat(mixed.reason), 'Pour lancer « Chère », il faut avoir 5 000 $ en poche (cet argent n’est pas dépensé) : il te manque encore 3 000 $.'); // 2e tour : 2 000 $ en poche
  /* partie de 60 min, départ 0 : A (1 000 $/10 min) × 3 → 3 000 $, puis B (10 000 $/10 min, 3 000 $ en poche) × 3 → 33 000 $ */
  const sp = E.sessionPlan({ capital: 0, minutes: 60, activities: [{ id: 'a', name: 'A', reward: 1000, duration: 10 }, { id: 'b', name: 'B', reward: 10000, duration: 10, minCash: 3000 }] });
  assert.equal(sp.profit, 33000); assert.deepEqual(sp.breakdown.map(x => x.runs), [3, 3]);
});

/* ---------- 5. Scénario ---------- */
test('scénario : le plan reçoit les conditions seulement quand elles existent, demande le rang et les explique', () => {
  const H = require('./check-ultime-helper.cjs'), { D, catalogue, sourceActivities, presets } = H.siteData();
  const initial = B.initial(H.dataVersion(D, catalogue, sourceActivities), presets);
  const s = H.planWithMissions(B, H.baseState(B, initial, catalogue));
  const before = B.planInput(s);
  assert.ok(!('rank' in before) && before.activities.every(a => !('minCash' in a) && !('minRank' in a) && !('order' in a)));
  s.plan.missions[1].minCash = 150000; s.plan.missions[1].minRank = 4; s.plan.missions[1].order = 2;
  assert.equal(flat(B.planMissing(s)), 'Écris ton rang dans « Où en es-tu ? » : « Braquage » demande le rang 4.');
  s.plan.situation.rank = 6;
  assert.equal(B.planMissing(s), null);
  const input = B.planInput(s);
  assert.equal(input.rank, 6); assert.deepEqual([input.activities[1].minCash, input.activities[1].minRank, input.activities[1].order], [150000, 4, 2]);
  const x = B.analysis('plan', s, sourceActivities, { catalogue }), r = B.evaluate('plan', s, sourceActivities, { catalogue });
  const drivers = (r.explain || x && x.explain || {}).drivers || [];
  assert.ok(drivers.some(d => d.label === 'Argent à avoir en poche' && /« Braquage » : 150 000 \$/.test(flat(d.text))), JSON.stringify(drivers));
  assert.ok(drivers.some(d => d.label === 'Rang demandé' && /rang 4 ; tu as écrit le rang 6/.test(flat(d.text))));
});

test('Mes calculs : une mission du site « une seule fois » ne se répète pas (objectif, temps de jeu), avec la raison', () => {
  const H = require('./check-ultime-helper.cjs'), { D, catalogue, presets } = H.siteData();
  const once = adapter([{ id: 'mission-u', name: 'Une fois', reward: 5000, duration: 10, players: 1, once: true }]).activities();
  const initial = B.initial(H.dataVersion(D, catalogue, once), presets);
  const s = H.baseState(B, initial, catalogue); s.model = 'cycles'; s.goal.selected = 'mission-u'; s.session.enabled.push('mission-u');
  const r = B.evaluate('goal', s, once, { catalogue });
  assert.equal(r.valid, false); assert.match(flat(r.reason), /« Une fois » se fait une seule fois/);
  assert.ok(!B.eligible(s, once).some(a => a.id === 'mission-u'));
  const sa = B.analysis('session', s, once, { catalogue });
  assert.ok(sa.activities.find(a => a.id === 'mission-u').reasons.includes('mission à faire une seule fois : elle se place dans le business plan'));
});

/* ---------- 5 bis. Atelier (jsdom) : copier une mission du site dans le plan ---------- */
test('atelier : « Ajouter cette mission » copie une mission du site avec ses conditions, ce qu’elle demande avant et ses achats', async () => {
  let JSDOM, VirtualConsole; try { ({ JSDOM, VirtualConsole } = require('jsdom')); } catch (e) { return test.skip ? undefined : undefined; }
  const scripts = ['calculateurs-data.js', 'calculateurs-engine.js', 'modele-donnees.js', 'calculateurs-modele.js', 'calculateurs-scenario.js', 'calculateurs-notebooks.js', 'calculateurs-visuals.js', 'calculateurs-workspace.js', 'calculateurs-plan.js', 'calculateurs.js'];
  const errors = [], vc = new VirtualConsole(); vc.on('jsdomError', e => errors.push(e.message));
  const dom = new JSDOM(fs.readFileSync(path.join(root, 'calculateurs.html'), 'utf8'), { url: 'https://www.leonidakit.com/calculateurs.html', runScripts: 'outside-only', virtualConsole: vc });
  const w = dom.window, d = w.document; let copied = null;
  w.LK_VEHICULES = [{ id: 'karin-sultan', nom: 'Sultan', marque: 'Karin', price: 40000 }]; w.LK_ARMES = [];
  w.LK_ACTIVITIES = [
    { id: 'mission-premier', name: 'Premier coup', reward: 20000, duration: 15, players: 1, once: true, order: 1 },
    { id: 'mission-second', name: 'Deuxième coup', reward: 50000, cost: 2500, duration: 30, players: 1, once: true, order: 2, requiresMissions: ['mission-premier'], requiresPurchaseIds: ['karin-sultan'], minCash: 30000, minRank: 3 }
  ];
  w.LK_CALCULATEURS_CATALOGUE = { entries: [], weaponImages: {} };
  w.LK = { esc: v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]), status() {}, async copy(v) { copied = v; return true; } };
  w.matchMedia = () => ({ matches: true }); w.HTMLElement.prototype.scrollIntoView = function () {}; w.scrollTo = () => {}; w.setTimeout = () => 0; w.clearTimeout = () => {}; w.requestAnimationFrame = cb => { cb(); return 0; };
  for (const f of scripts) w.eval(fs.readFileSync(path.join(root, f), 'utf8') + '\n//# sourceURL=' + f);
  const fire = async (type, el) => { el.dispatchEvent(new w.Event(type, { bubbles: true, cancelable: true })); await Promise.resolve(); await Promise.resolve(); };
  try {
    await fire('click', d.getElementById('tab-plan'));
    const src = d.getElementById('f-plan-source'); src.value = 'missions'; await fire('change', src);
    const sel = d.getElementById('plan-m-source'); assert.ok(sel, 'liste des missions à reprendre');
    sel.value = 'site:mission-second';
    await fire('click', Array.from(d.querySelectorAll('button')).find(b => b.dataset.bPlanMImport));
    await fire('click', d.getElementById('calc-share'));
    const plan = JSON.parse(decodeURIComponent(new w.URL(copied).hash.slice(6))).plan;
    const [first, second] = plan.missions;
    assert.deepEqual([first.name, first.once, first.sourceId, first.order], ['Premier coup', true, 'mission-premier', 1], 'la mission demandée avant est copiée d’abord');
    assert.deepEqual([second.name, second.once, second.minCash, second.minRank, second.order, second.cost], ['Deuxième coup', true, 30000, 3, 2, 2500]);
    assert.deepEqual(second.requiresMissions, [first.id]);
    assert.equal(plan.prerequisites.length, 1); assert.equal(plan.prerequisites[0].itemId, 'karin-sultan'); assert.deepEqual(second.requires, [plan.prerequisites[0].id]);
    assert.ok(d.getElementById('plan-rank'), 'la case du rang apparaît : une mission demande un rang');
    assert.match(flat(d.getElementById('plan-missions').textContent), /avec 30 000 \$ en poche, rang 3/);
    assert.deepEqual(errors, []);
  } finally { w.close(); }
});
