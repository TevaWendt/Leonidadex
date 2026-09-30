'use strict';
/* v7.52 (lot 5) : validation d’ensemble. Complète les tests des lots 1 à 4 sur les points où plusieurs parties du site doivent
   dire la même chose : un critère changé se répercute partout (résultat, explication, courbe, étapes du plan) ; les carnets et
   le tableau de bord comptent le même total que la progression ; une ancienne progression importée est conservée et comptée ;
   une possession déclarée sert au calcul, une prévision ne devient jamais une possession. Références écrites à la main. */
const test = require('node:test'), assert = require('node:assert/strict'), path = require('node:path'), fs = require('node:fs'), vm = require('node:vm');
const root = path.resolve(process.env.SITE_ROOT || path.join(__dirname, '../..'));
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const E = require(path.join(root, 'calculateurs-engine.js')), B = require(path.join(root, 'calculateurs-scenario.js'));
const initial = B.initial('v752', []);
const mem = () => { const m = new Map(); return { get length() { return m.size; }, key: i => [...m.keys()][i], getItem: k => m.has(k) ? m.get(k) : null, setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) }; };

function million(cost) {
  const s = B.copy(initial);
  s.plan.goal = { ...s.plan.goal, kind: 'amount', target: 1000000, meaning: 'held' };
  s.plan.situation = { ...s.plan.situation, capital: 100000, reserve: 20000, dailyMinutes: null };
  s.plan.source = 'missions';
  s.plan.prerequisites = [{ ...B.copy(B.planPrereqTemplate), id: 'p-1', name: 'Véhicule requis', price: 60000, minutes: 12 }, { ...B.copy(B.planPrereqTemplate), id: 'p-2', name: 'Arme requise', price: 10000, minutes: 8 }];
  s.plan.missions = [{ ...B.copy(B.planMissionTemplate), id: 'm-1', name: 'Déblocage', reward: 0, cost: 0, duration: 10, once: true }, { ...B.copy(B.planMissionTemplate), id: 'm-2', name: 'Mission répétable', reward: 150000, cost, duration: 30, requires: ['p-1', 'p-2'], requiresMissions: ['m-1'] }];
  return B.validate(s, initial);
}

test('un critère changé (frais de consommables par tentative) se répercute dans le résultat, l’explication, la courbe et les étapes du plan', () => {
  const a = million(5000), b = million(8000);
  const ra = B.evaluate('plan', a, []), rb = B.evaluate('plan', b, []);
  // Références à la main : départ utile après achats = 100 000 − 70 000 = 30 000 ; par tentative 150 000 − frais.
  assert.equal(ra.finalCash, 1045000); assert.equal(ra.lowPoint.cash, 25000); assert.equal(ra.totalMinutes, 240);
  // 8 000 de frais : 30 000 + 6 × 142 000 = 882 000 (< 1 000 000) ; + 142 000 = 1 024 000 → 7 tentatives ; point bas 22 000.
  assert.equal(rb.finalCash, 1024000); assert.equal(rb.lowPoint.cash, 22000); assert.equal(rb.totalMinutes, 240);
  assert.equal(rb.sessions[0].steps.find(x => x.id === 'm-2').runs, 7);
  // Courbe : même nombre de marches, dernier point au nouveau solde.
  const ca = B.planCurve(ra), cb = B.planCurve(rb);
  assert.equal(ca[ca.length - 1].cash, 1045000); assert.equal(cb[cb.length - 1].cash, 1024000);
  // Explication : le coût par tentative est un facteur utilisé, jamais oublié.
  const xa = B.analysis('plan', a, []), xb = B.analysis('plan', b, []);
  assert.deepEqual(xb.explain.unaccounted, []); assert.notEqual(JSON.stringify(xa.explain), JSON.stringify(xb.explain), 'l’explication suit le nouveau chiffre');
  // Étapes : l’ordre des étapes ne change pas (achats, déblocage, mission), seul le solde de chaque étape bouge.
  assert.deepEqual(rb.route.map(x => x.type), ['acquire', 'acquire', 'unlock', 'run']);
  assert.ok(rb.route[3].cashAfter < ra.route[3].cashAfter);
  // 20 000 de frais : impossible en gardant la réserve (30 000 − 20 000 = 10 000 < 20 000). Le plan « choisi par le
  // calculateur » passe alors par la réserve ; il le dit, avec la raison chiffrée et le point bas (10 000).
  const s20 = million(20000), rc = B.evaluate('plan', s20, []);
  assert.equal(rc.strategy, 'useReserve'); assert.equal(rc.lowPoint.cash, 10000);
  const asIs = rc.strategies.candidates.find(c => c.id === 'asIs');
  assert.equal(asIs.valid, false); assert.match(asIs.reason, /demande 20\s000 \$ de frais avant de commencer\s?; en gardant 20\s000 \$ de côté, il ne te reste que 10\s000 \$/);
  assert.match(read('calculateurs-plan.js'), /Ce plan touche à tes '\+money\(kept\)\+' gardés de côté/);
  // En gardant l’ordre donné (réserve tenue), aucun plan « faisable » n’est inventé.
  const kept = B.copy(s20); kept.plan.strategy = 'asIs'; const rk = B.evaluate('plan', B.validate(kept, initial), []);
  assert.equal(rk.valid, false); assert.match(rk.reason, /il ne te reste que 10\s000 \$/);
});

test('carnets = tableau de bord = progression : la somme des carnets suivis égale le total de « Tout mon suivi » (3 134 aujourd’hui)', () => {
  const Pg = require(path.join(root, 'progression-core.js'));
  const c = { window: {} }; for (const f of ['acquisitions-data.js', 'progression-data.js', 'collectibles-data.js']) vm.runInNewContext(read(f), c);
  const w = c.window, store = Pg.create({ storage: mem(), acquisitions: w.LK_ACQUISITIONS, ids: w.LK_PROGRESS_IDS, collectibles: (w.LK_COLLECTIBLES && w.LK_COLLECTIBLES.items) || [] });
  const M = JSON.parse(read('outils/modele-donnees.json'));
  let sum = 0;
  for (const k of M.carnets.filter(k => k.nature !== 'document')) {
    const html = read(k.url.slice(1)), d = JSON.parse(html.match(/<script type="application\/json" id="lk-carnet-data">([\s\S]*?)<\/script>/)[1]);
    if (k.id === 'lieux') { const L = { window: {} }; vm.runInNewContext(read('carnets/lieux-data.js'), L); sum += L.window.LK_CARNET_LIEUX.rows.length; }
    else sum += d.items.length;
  }
  assert.equal(sum, store.summary().total);
  // Référence indépendante : véhicules + armes + équipements + munitions + listes + contenus documentés + lieux + collectibles.
  const I = w.LK_PROGRESS_IDS, lists = ['tenues', 'coiffures', 'tatouages', 'consommables', 'perso-vehicules', 'perso-armes'].reduce((n, f) => n + new Set(I[f]).size, 0);
  const acq = w.LK_ACQUISITIONS.items.filter(x => x.trackable === true && !(x.ref && x.ref.id)).length;
  assert.equal(sum, I.vehicules.length + I.armes.length + I.equipements.length + I.munitions.length + lists + acq + new Set(I.lieux).size + 0);
});

test('ancienne progression importée (fichier version 1) : conservée, comptée dans les carnets ; une référence inconnue gardée à part', () => {
  const Pg = require(path.join(root, 'progression-core.js')), K = require(path.join(root, 'carnets-core.js'));
  const c = { window: {} }; for (const f of ['progression-data.js', 'acquisitions-data.js']) vm.runInNewContext(read(f), c); const IDS = JSON.parse(JSON.stringify(c.window.LK_PROGRESS_IDS));
  const storage = mem(), P = Pg.create({ storage, ids: IDS, acquisitions: JSON.parse(JSON.stringify(c.window.LK_ACQUISITIONS)) });
  const old = { site: 'leonidakit', date: '2026-07-01', data: { lk_own_vehicules: '{"albany-emperor":true,"ancien-id":true}', lk_map_found: '{"vice-city":true}', lk_own_armes: '{"girardi-es9":1}' } };
  const plan = P.prepareImport(JSON.stringify(old)); assert.equal(plan.version, 1); assert.ok(plan.issues.some(x => /ancien-id/.test(x)), 'référence inconnue signalée');
  P.applyImport(plan, 'merge');
  const carnets = K.create({ storage, modele: JSON.parse(read('outils/modele-donnees.json')), ids: IDS });
  assert.deepEqual(carnets.owned('vehicules').sort(), ['albany-emperor', 'ancien-id']);
  const s = carnets.summary('garage'); assert.equal(s.done, 1); assert.equal(s.unknownRefs, 1, 'gardée, jamais comptée');
  assert.equal(carnets.summary('lieux').done, 1); assert.equal(carnets.summary('arsenal').done, 1);
  // Même compte côté tableau de bord (progression-core) : véhicules hors bateaux + bateaux = garage.
  const g = P.summary().groups; assert.equal(g.find(x => x.id === 'vehicules').done + g.find(x => x.id === 'boats').done, 1);
});

test('possession déclarée → calcul : un achat déjà dans le garage arrive « déjà possédé » ; une prévision ne coche jamais rien', () => {
  const s = B.copy(initial), item = { id: 'albany-emperor', type: 'vehicle', name: 'Emperor', price: null };
  assert.equal(B.addAsset(s, item).owned, false, 'sans carnet : rien de supposé');
  globalThis.LKCalcOwned = x => x.id === 'albany-emperor';
  try {
    const t = B.copy(initial); assert.equal(B.addAsset(t, item).owned, true, 'déjà dans le garage : compté comme possédé');
    assert.equal(B.addAsset(t, { ...item, id: 'vapid-dominator', name: 'Dominator' }).owned, false);
  } finally { delete globalThis.LKCalcOwned; }
  // Une prévision (plan évalué) ne touche à aucun stockage : le moteur et le scénario n’ont pas accès aux carnets.
  const src = read('calculateurs-scenario.js') + read('calculateurs-engine.js');
  assert.doesNotMatch(src, /localStorage|lk_own_|lk_stock_v1|applyEvent/);
  // Seul le relevé d’une partie jouée écrit dans un carnet, par un événement idempotent.
  assert.match(read('calculateurs-plan.js'), /Pendant cette partie, j’ai acheté[\s\S]*K\.applyEvent\('plan:'\+logId/);
});

test('harmonisation (lot 5) : aucune police non hébergée, aucun script inutile, aucun événement sans écouteur, aucun module mort',() => {
  const pages = fs.readdirSync(root).filter(f => f.endsWith('.html'));
  for (const f of fs.readdirSync(root).filter(f => f.endsWith('.css'))) assert.doesNotMatch(read(f), /JetBrains Mono/, f);
  assert.match(read('style.css'), /--font-mono:ui-monospace/);
  for (const f of pages) if (!read(f).includes('data-showcase')) assert.doesNotMatch(read(f), /lk-showcase\.js/, f);
  assert.ok(!fs.existsSync(path.join(root, 'calculateurs-tools.js')));
  for (const f of ['calculateurs.js', 'calculator-entry.js']) assert.doesNotMatch(read(f), /leonidakit:calculator|lk:calculator/, f);
});

test('noms de lieux en texte simple : la carte, la recherche et « Mes lieux repérés » n’affichent jamais une entité HTML', () => {
  // Défaut trouvé à la relecture des captures du lot 5 : « &quot;Ambrosia Hills&quot; » affiché tel quel (27 noms entre
  // guillemets, 84 « &amp; »). La source GTADB garde sa forme ; les données publiées sont décodées, chaque page échappe.
  const src = read('outils/data/carte-gtadb-source.json');
  assert.match(src, /&quot;Ambrosia Hills&quot;/, 'la source brute reste intacte');
  for (const f of ['carte-gtadb.js', 'search-lieux.js', 'carnets/lieux-data.js']) assert.doesNotMatch(read(f), /&(quot|amp|apos|#39|#x27|lt|gt);/, f);
  const c = { window: {} }; vm.runInNewContext(read('carte-gtadb.js'), c);
  const g = [...c.window.LK_GTADB.groupes, ...c.window.LK_GTADB.lieux].find(x => x.id === 'g-L1848');
  assert.equal(g.n, '"Ambrosia Hills"');
  const L = { window: {} }; vm.runInNewContext(read('carnets/lieux-data.js'), L);
  assert.equal(L.window.LK_CARNET_LIEUX.rows.find(r => r[0] === 'g-L1848')[1], '"Ambrosia Hills"', 'nom décodé dans le carnet');
  const S = { window: {} }; vm.runInNewContext(read('search-lieux.js'), S);
  assert.equal(S.window.LK_INDEX_LIEUX.find(e => e.u.endsWith('lieu=g-L1848')).l, '"Ambrosia Hills"', 'nom décodé dans la recherche');
});
