'use strict';
/* v7.48 (lot 1) : état v6 du calculateur — migration v5 → v6 sans changer un seul résultat, nouvelles cases « pas encore
   écrit », valeurs inattendues ramenées au défaut, variantes et historique du plan. */
const test = require('node:test'), assert = require('node:assert/strict'), path = require('node:path');
const root = path.resolve(__dirname, '../..');
const B = require(path.join(root, 'calculateurs-scenario.js'));
const presets = [
  { id: 'scenario-a', name: 'A', reward: 25000, cost: 2500, duration: 12, prep: 3, cooldown: 5, share: 100, investment: 0, players: 1 },
  { id: 'scenario-b', name: 'B', reward: 120000, cost: 10000, duration: 40, prep: 10, cooldown: 10, share: 100, investment: 0, players: 1 },
  { id: 'scenario-c', name: 'C', reward: 90000, cost: 15000, duration: 45, prep: 15, cooldown: 0, share: 100, investment: 500000, players: 1 }
];
const initial = B.initial('test-data', presets);
function asV5(s) {
  const raw = B.copy(s); raw.version = 5; delete raw.analysis; delete raw.modelVersion;
  raw.assets.forEach(a => { for (const k of ['role', 'usage', 'resale', 'capabilities', 'requires', 'unlocks']) delete a[k]; });
  delete raw.plan.locked; delete raw.plan.variants; delete raw.plan.goal.meaning;
  raw.plan.missions.forEach(m => { delete m.once; delete m.done; delete m.requiresMissions; });
  raw.plan.prerequisites.forEach(p => { delete p.minutes; delete p.requires; delete p.usagePerSession; });
  raw.plan.log.forEach(e => { delete e.id; });
  return raw;
}
const TOOLS = ['goal', 'purchase', 'session', 'budget', 'order', 'roi', 'activities', 'compare', 'plan'];

test('v6 : l’état de départ est en version 6 avec les versions du modèle et des données', () => {
  assert.equal(initial.version, 6); assert.equal(initial.modelVersion, 1); assert.equal(initial.dataVersion, 'test-data');
  assert.deepEqual(initial.analysis.horizon, { sessions: null, uses: null, hours: null });
  assert.ok(Object.values(initial.analysis.simulations).every(v => v === false), 'aucune mécanique simulée sans ton choix');
  assert.equal(initial.assets[0].role, 'unknown'); assert.deepEqual(initial.assets[0].usage, { perSession: null, perUse: null, uses: null });
  assert.equal(initial.assets[0].resale, null);
});

test('v5 → v6 : aucune valeur existante ne change, les neuf résultats sont identiques, les nouvelles cases sont vides', () => {
  const s = B.copy(initial);
  s.assets.push({ ...B.copy(B.assetTemplate), key: 'kamacho', itemId: 'canis-kamacho', name: 'Kamacho', price: 150000 });
  s.order.keys = ['free-1', 'kamacho']; s.compare.keys = ['free-1', 'kamacho'];
  s.plan.prerequisites = [{ ...B.copy(B.planPrereqTemplate), id: 'p-1', name: 'Garage', price: 80000, boostHourly: 5000 }];
  s.plan.log = [{ ...B.copy(B.planLogTemplate), id: 'x', at: '2026-09-20', capital: 250000, gain: 50000, sessionMinutes: 60 }];
  const v6 = B.validate(s, initial), migrated = B.validate(asV5(s), initial);
  assert.equal(migrated.version, 6);
  for (const t of TOOLS) {
    const a = B.evaluate(t, v6, []), b = B.evaluate(t, migrated, []);
    assert.equal(JSON.stringify(b), JSON.stringify(a), t);
  }
  assert.equal(migrated.assets[1].price, 150000); assert.equal(migrated.plan.prerequisites[0].minutes, null);
  assert.equal(migrated.plan.goal.meaning, 'available', 'v7.49 : par défaut, le but vise l’argent disponible après la réserve, comme avant'); assert.deepEqual(migrated.plan.locked, []); assert.deepEqual(migrated.plan.variants, []);
  assert.equal(migrated.plan.log[0].id, '', 'un ancien relevé n’a pas d’identifiant : il est gardé tel quel');
});

test('v6 : relire deux fois donne exactement le même état (aucune dérive)', () => {
  const once = B.validate(B.copy(initial), initial), twice = B.validate(B.copy(once), initial);
  assert.deepEqual(twice, once);
});

test('v6 : une valeur inattendue revient au défaut au lieu de tout refuser ; les références sont nettoyées', () => {
  const s = B.copy(initial);
  s.assets[0].role = 'magie'; s.assets[0].capabilities.terrain = 'lune'; s.assets[0].requires = ['free-1', 'absent'];
  s.analysis.priority = 'n’importe'; s.plan.goal.meaning = 'x';
  s.plan.prerequisites = [{ ...B.copy(B.planPrereqTemplate), id: 'p-1', requires: ['p-1', 'p-9'] }, { ...B.copy(B.planPrereqTemplate), id: 'p-2', requires: ['p-1'] }];
  s.plan.missions = [{ ...B.copy(B.planMissionTemplate), id: 'm-1', requiresMissions: ['m-1', 'm-2'] }, { ...B.copy(B.planMissionTemplate), id: 'm-2', once: true, requiresMissions: [] }];
  s.plan.locked = ['strategy', 'm-2', 'inconnu'];
  const v = B.validate(s, initial);
  assert.equal(v.assets[0].role, 'unknown'); assert.equal(v.assets[0].capabilities.terrain, ''); assert.deepEqual(v.assets[0].requires, ['absent']);
  assert.equal(v.analysis.priority, 'fast'); assert.equal(v.plan.goal.meaning, 'available');
  assert.deepEqual(v.plan.prerequisites[0].requires, []); assert.deepEqual(v.plan.prerequisites[1].requires, ['p-1']);
  assert.deepEqual(v.plan.missions[0].requiresMissions, ['m-2']); assert.equal(v.plan.missions[1].once, true);
  assert.deepEqual(v.plan.locked, ['strategy', 'm-2']);
});

test('v6 : les variantes du plan sont des copies bornées (cinq au plus) qui n’écrasent pas le plan de référence', () => {
  const s = B.copy(initial);
  const variant = { ...B.copy(B.planVariantTemplate), id: 'v-1', label: 'Sans garage', at: '2026-09-29', goal: { ...B.copy(s.plan.goal), target: 2000000 }, situation: B.copy(s.plan.situation) };
  s.plan.variants = [variant];
  const v = B.validate(s, initial);
  assert.equal(v.plan.variants[0].goal.target, 2000000); assert.equal(v.plan.goal.target, initial.plan.goal.target);
  s.plan.variants = Array.from({ length: 6 }, (_, i) => ({ ...variant, id: 'v-' + i }));
  assert.throws(() => B.validate(s, initial), /Cinq variantes/);
});

test('v6 : « Partir de zéro » remet l’analyse à vide et laisse les mécaniques non confirmées désactivées', () => {
  const s = B.copy(initial); s.analysis.simulations.carburant = true; s.analysis.horizon.sessions = 12;
  const b = B.blank(s);
  assert.equal(b.analysis.simulations.carburant, false); assert.equal(b.analysis.horizon.sessions, null);
  assert.equal(B.validate(b, initial).version, 6);
});
