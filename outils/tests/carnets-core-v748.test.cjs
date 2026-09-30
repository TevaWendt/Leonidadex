'use strict';
/* v7.48 (lot 1) : fondations des carnets (carnets-core.js) — stock, souhaits, journal idempotent, lien avec progression-core. */
const test = require('node:test'), assert = require('node:assert/strict'), path = require('node:path');
const root = path.resolve(__dirname, '../..');
const C = require(path.join(root, 'carnets-core.js'));
const P = require(path.join(root, 'progression-core.js'));
const M = require(path.join(root, 'modele-donnees.js'));
function memory(initial) {
  const data = Object.assign({}, initial || {}); let broken = false;
  return { data, break() { broken = true; }, get length() { return Object.keys(data).length; }, key(i) { return Object.keys(data)[i]; },
    getItem(k) { return Object.prototype.hasOwnProperty.call(data, k) ? data[k] : null; },
    setItem(k, v) { if (broken) throw new Error('quota'); data[k] = String(v); }, removeItem(k) { delete data[k]; } };
}
const ids = { consommables: ['sprunk', 'burger'], munitions: ['9mm'], vehicules: ['kamacho', 'bati'], armes: ['smg'] };
const names = { vehicules: { kamacho: { n: 'Canis Kamacho', c: 'Tout-terrain', u: 'vehicules/canis-kamacho.html' } } };
const make = (storage, extra) => C.create(Object.assign({ storage, modele: M, ids, names, now: () => '2026-09-29T10:00:00.000Z' }, extra || {}));

test('carnets : une ancienne case cochée devient « stock à renseigner », jamais une quantité inventée', () => {
  const s = memory({ lk_own_consommables: JSON.stringify({ sprunk: 1 }) });
  const k = make(s);
  assert.deepEqual(k.stock('consommables', 'sprunk'), { qty: null, unit: null, at: null, state: 'a-renseigner' });
  assert.equal(k.stock('consommables', 'burger').state, 'aucun');
  assert.equal(s.getItem('lk_stock_v1'), null, 'rien n’est écrit à la lecture');
  k.setStock('consommables', 'sprunk', 6, 'canettes');
  assert.equal(k.stock('consommables', 'sprunk').qty, 6); assert.equal(k.stock('consommables', 'sprunk').state, 'connu');
  assert.throws(() => k.setStock('consommables', 'sprunk', 2.5), /quantité entière/);
  assert.equal(k.setStock('vehicules', 'kamacho', 1), false, 'un véhicule n’a pas de stock');
});

test('carnets : une réalisation déclarée deux fois ne compte qu’une fois ; un stock inconnu n’est jamais décrémenté', () => {
  const s = memory(); const k = make(s);
  k.setStock('consommables', 'burger', 5);
  assert.equal(k.applyEvent('plan-etape-3', [{ type: 'stock', famille: 'consommables', id: 'burger', delta: -2 }, { type: 'own', famille: 'vehicules', id: 'bati' }]).applied, true);
  assert.equal(k.stock('consommables', 'burger').qty, 3); assert.equal(k.isOwned('vehicules', 'bati'), true);
  assert.equal(k.applyEvent('plan-etape-3', [{ type: 'stock', famille: 'consommables', id: 'burger', delta: -2 }]).applied, false);
  assert.equal(k.stock('consommables', 'burger').qty, 3, 'pas de double comptage');
  const r = k.applyEvent('plan-etape-4', [{ type: 'stock', famille: 'consommables', id: 'sprunk', delta: -1 }]);
  assert.equal(r.applied, false); assert.equal(k.hasEvent('plan-etape-4'), false, 'rien d’appliqué : l’événement reste à faire');
  assert.equal(k.stock('consommables', 'sprunk').state, 'aucun');
});

test('carnets : un souhait (prévu) n’est jamais une possession et se compte à part', () => {
  const s = memory(); const k = make(s);
  k.setWish('vehicules', 'kamacho', true, 'plan');
  assert.equal(k.isOwned('vehicules', 'kamacho'), false); assert.equal(k.isWished('vehicules', 'kamacho'), true);
  const sum = k.summary('garage'); assert.equal(sum.done, 0); assert.equal(sum.wishes, 1); assert.equal(sum.total, 2);
  k.setWish('vehicules', 'kamacho', false); assert.equal(k.wishes('vehicules').length, 0);
});

test('carnets : une possession déclarée ici est vue par progression-core (mêmes clés, mêmes compteurs)', () => {
  const s = memory(); const k = make(s);
  k.setOwned('vehicules', 'kamacho', true); k.setOwned('armes', 'smg', true);
  assert.equal(s.getItem('lk_own_vehicules'), JSON.stringify({ kamacho: 1 }), 'même valeur que suivi.js');
  const p = P.create({ storage: s, ids: { vehicules: ids.vehicules, armes: ids.armes, lieux: [], equipements: [], munitions: [], consommables: [], coiffures: [], tatouages: [], tenues: [], 'perso-vehicules': [], 'perso-armes': [] }, collectibles: [] });
  const g = p.summary().groups;
  assert.equal(g.find(x => x.id === 'vehicules').done, 1); assert.equal(g.find(x => x.id === 'armes').done, 1);
  assert.equal(k.summary('garage').done, 1); assert.equal(k.summary('arsenal').done, 1);
  k.setOwned('vehicules', 'kamacho', false);
  assert.equal(P.create({ storage: s, ids: { vehicules: ids.vehicules } , collectibles: [] }).summary().groups.find(x => x.id === 'vehicules').done, 0);
});

test('carnets : les entrées ouvrent la fiche exacte ; une saisie hors catalogue reste visible et marquée', () => {
  const s = memory({ lk_own_vehicules: JSON.stringify({ kamacho: 1, 'ancienne-fiche': 1 }) });
  const e = make(s).entries('garage');
  const kam = e.find(x => x.id === 'kamacho'), old = e.find(x => x.id === 'ancienne-fiche');
  assert.equal(kam.url, '/vehicules/canis-kamacho.html'); assert.equal(kam.inCatalogue, true);
  assert.equal(old.inCatalogue, false); assert.equal(old.url, null);
  assert.equal(make(s).summary('garage').unknownRefs, 1);
});

test('carnets : rubrique abîmée copiée avant remplacement ; stockage indisponible → false et message, jamais un succès annoncé', () => {
  const s = memory({ lk_stock_v1: '{abîmé' }); const k = make(s);
  assert.equal(k.stock('consommables', 'sprunk').state, 'aucun');
  k.setStock('consommables', 'sprunk', 2);
  assert.ok(Object.keys(s.data).some(x => x.startsWith('lk_recovery_lk_stock_v1_')));
  const t = memory(); let said = ''; const k2 = make(t, { notice: m => { said = m; } });
  t.break();
  assert.equal(k2.setWish('vehicules', 'bati', true), false); assert.match(said, /Exporte ton suivi/);
});

test('carnets : les nouvelles rubriques partent dans l’export et sont reconnues à l’import', () => {
  const s = memory(); const k = make(s);
  k.setStock('munitions', '9mm', 120); k.setWish('armes', 'smg', true); k.applyEvent('e1', [{ type: 'own', famille: 'armes', id: 'smg' }]);
  const p = P.create({ storage: s, ids: { vehicules: [], armes: ['smg'], lieux: [], equipements: [], munitions: ['9mm'], consommables: [], coiffures: [], tatouages: [], tenues: [], 'perso-vehicules': [], 'perso-armes': [] }, collectibles: [] });
  const out = p.exportData();
  for (const key of ['lk_stock_v1', 'lk_wish_v1', 'lk_journal_v1']) assert.ok(out.data[key], key);
  const plan = p.prepareImport(JSON.stringify(out));
  assert.ok(!plan.issues.some(x => /non reconnue/.test(x)), plan.issues.join(' | '));
  const target = memory(); P.create({ storage: target, ids: {}, collectibles: [] }).applyImport(plan, 'replace');
  assert.equal(make(target).stock('munitions', '9mm').qty, 120); assert.equal(make(target).hasEvent('e1'), true);
});

test('carnets : chaque carnet du modèle couvre des familles réelles, avec une URL dédiée hors de progression.html', () => {
  const urls = new Set();
  for (const k of M.carnets) { assert.match(k.url, /^\/carnets\/[a-z0-9-]+\.html$/); assert.ok(!urls.has(k.url)); urls.add(k.url); }
  assert.ok(M.carnets.find(k => k.id === 'garage').bouton === 'Voir mon garage');
  assert.ok(M.carnets.find(k => k.id === 'arsenal').bouton === 'Voir mon arsenal');
});
