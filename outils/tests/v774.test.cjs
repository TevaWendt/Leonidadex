'use strict';
/* v7.74 (demande de Téva du 08/10/2026) : business plan, mode Expert avec les mêmes points que les huit calculs (« Et si le
   chiffre bouge de 20 % ? », « Comparer avec un calcul gardé », « Comment est-ce calculé ? », « Tous les chiffres du calcul »),
   calculable ou pas encore ; « Et si autre chose change ? » (hypothèses utiles : gains, prix, frais, durées, temps de jeu, argent
   de côté, argent de départ, objectif, puis tout ensemble) dans les huit calculs et le plan ; micro : l'en-tête du site ne
   l'interdit plus (Permissions-Policy microphone=(self)), l'autorisation se demande depuis le site, avec les étapes du
   navigateur quand il est bloqué. Données fictives, aucun chiffre du jeu, aucun réseau. */
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = path.resolve(__dirname, '../..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const { load } = require('./runtime-helper.cjs');
const B = require(root + '/calculateurs-scenario.js');
const ctx = { window: {} }; vm.createContext(ctx);
for (const f of ['vehicules-data.js', 'armes-data.js', 'acquisitions-data.js', 'calculateurs-catalogue.js', 'calculateurs-activites.js', 'calculateurs-data.js']) vm.runInContext(read(f), ctx);
const initial = B.initial('v774', JSON.parse(JSON.stringify(ctx.window.LKCalcData.presets)));
const flat = t => String(t).replace(/[  ]/g, ' ').replace(/\s+/g, ' ');
const FOLDS = 'lk-calc-folds-v1';
function missionsPlan() {
  const s = B.copy(initial); s.tab = 'plan'; const p = s.plan;
  p.source = 'missions'; p.goal = { ...p.goal, kind: 'purchase', name: 'Villa', price: 2000000 };
  p.situation = { ...p.situation, capital: 100000, dailyMinutes: 120, daysPerWeek: 5, reserve: 20000, upkeepPerSession: 3000 };
  p.missions = [{ ...B.planMissionTemplate, id: 'm-a', name: 'Livraison', reward: 80000, cost: 5000, duration: 25, prep: 10, cooldown: 30 }, { ...B.planMissionTemplate, id: 'm-b', name: 'Gros coup', reward: 150000, cost: 20000, duration: 45, prep: 20, cooldown: 60, investment: 300000 }];
  p.prerequisites = [{ ...B.planPrereqTemplate, id: 'p-a', name: 'Garage', price: 400000, boostHourly: 20000 }];
  return s;
}
async function page(tool, s) {
  const storage = { [FOLDS]: JSON.stringify({ all: true }) }; if (s) storage['lk-calculator-v1'] = JSON.stringify(B.validate(s, initial));
  const p = await load(root, 'calculateurs.html?tool=' + tool, { storage });
  const adv = p.d.querySelector('.calc-mode-switch [data-mode="advanced"]') || p.d.querySelector('[data-mode="advanced"]');
  adv.dispatchEvent(new p.w.Event('click', { bubbles: true })); p.flush();
  return p;
}
const foldsOf = (p, id) => [...p.d.querySelectorAll('#' + id + ' .b-fold')].map(f => ({ id: f.dataset.fold, n: (f.querySelector('.b-fold-num') || {}).textContent, title: flat((f.querySelector('.b-fold-title') || {}).textContent || ''), teaser: flat((f.querySelector('.b-fold-teaser') || {}).textContent || '') }));

test('moteur : B.hypotheses refait le calcul avec un seul levier, ne touche pas au calcul de départ, et dit ce qui pèse le plus', () => {
  const s = B.copy(initial), before = JSON.stringify(s);
  const h = B.hypotheses('goal', s, []);
  assert.equal(JSON.stringify(s), before, 'le calcul de départ ne bouge pas');
  assert.ok(h.valid); assert.equal(h.key, 'totalMinutes');
  const gains = h.rows.find(r => r.id === 'gains');
  assert.ok(gains && gains.valid && gains.value > h.base.value && gains.better === false, '20 % de gains en moins : plus de temps de jeu, moins bien');
  const play = h.rows.find(r => r.id === 'play');
  assert.ok(play && play.days < h.base.days && play.better === true, '30 min de plus par jour : moins de jours, mieux');
  assert.ok(h.top && Math.abs(h.top.delta) === Math.max(...h.rows.filter(r => r.kind === 'one' && r.valid).map(r => Math.abs(r.delta))));
  for (const r of h.rows) assert.ok(typeof r.label === 'string' && r.label.length > 3 && (r.valid ? Number.isFinite(r.value) : !!r.reason));
  /* deux leviers « marché » ou plus : tout moins bien / tout mieux encadrent la réponse */
  const a = B.hypotheses('activities', B.copy(initial), []);
  assert.ok(a.range && a.range.prudent.value < a.base.value && a.range.favorable.value > a.base.value, 'Mes activités : de « tout va mieux » à « tout va moins bien »');
});

test('moteur : le business plan a ses hypothèses (missions, prix, frais, jours, argent de côté) et ses textes d’attente pointent vers les vraies questions', () => {
  const s = missionsPlan(), h = B.hypotheses('plan', s);
  assert.ok(h.valid && h.base.days > 0);
  const ids = h.rows.map(r => r.id);
  for (const id of ['gains', 'prices', 'days', 'reserve', 'prudent', 'favorable']) assert.ok(ids.includes(id), 'hypothèse ' + id);
  assert.ok(h.range.prudent.value > h.base.value && h.range.favorable.value < h.base.value, 'le pire est plus long, le meilleur plus court');
  assert.equal(h.rows.find(r => r.id === 'reserve').label, 'Tu dépenses aussi ton argent de côté');
  /* attentes */
  const o = B.hypotheses('order', B.copy(initial), []); assert.ok(o.pending && /Quoi acheter d’abord/.test(o.reason));
  const c = B.hypotheses('compare', B.copy(initial), []); assert.ok(c.pending && /deux achats/.test(c.reason));
  const m = B.copy(initial); m.plan.source = 'missions'; m.plan.missions = [];
  const pm = B.hypotheses('plan', m); assert.ok(!pm.valid);
  const sens = B.sensitivity('plan', m, []); assert.ok(sens.pending && /Comment tu gagnes ton argent/.test(flat(sens.need)), '« Et si » du plan : la question du formulaire');
  assert.doesNotMatch(read('calculateurs-scenario.js'), /« Ta situation »|« Tes missions »/, 'aucune question qui n’existe pas dans le formulaire');
});

test('moteur : 600 calculs au hasard, huit outils et plan : jamais d’erreur, jamais de chiffre infini, toujours une raison', () => {
  let seed = 11; const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; }; const pick = a => a[Math.floor(rnd() * a.length)];
  const items = [{ id: 'v1', name: 'Voiture', price: 250000 }, { id: 'v2', name: 'Moto', price: 90000 }, { id: 'v3', name: 'Hangar', price: 1200000 }, { id: 'v4', name: 'Inconnu', price: null }];
  let runs = 0;
  for (let it = 0; it < 600; it++) {
    const s = B.copy(initial);
    s.goal.capital = pick([0, 50000, 200000, null]); s.goal.hourly = pick([0, 50000, 100000, null]); s.goal.reserve = pick([0, 10000]); s.model = pick(['continuous', 'cycles']);
    for (const x of items) if (rnd() < 0.6) B.addAsset(s, x);
    const keys = s.assets.map(a => a.key); s.order.keys = keys.filter(() => rnd() < 0.7); s.compare.keys = keys.filter(() => rnd() < 0.7); if (keys.length) { s.purchase.key = pick(keys); s.roi.key = pick(keys); }
    s.plan.source = pick(['hourly', 'missions']); s.plan.situation.capital = pick([100000, null]); s.plan.goal.kind = pick(['amount', 'purchase', 'unlock']); s.plan.goal.price = pick([500000, null]);
    if (s.plan.source === 'missions' && rnd() < 0.8) s.plan.missions = [{ ...B.planMissionTemplate, id: 'm-a', name: 'A', reward: pick([80000, null]), cost: 5000, duration: 25, prep: 10, cooldown: 30 }];
    let v; try { v = B.validate(s, initial); } catch (e) { continue; }
    for (const t of [...B.tools, 'plan']) {
      const h = B.hypotheses(t, v, []); runs++;
      if (!h.valid) { assert.ok(h.reason, t + ' : raison'); continue; }
      for (const r of h.rows) assert.ok(r.valid ? Number.isFinite(r.value) : !!r.reason, t + ' / ' + r.id);
    }
  }
  assert.ok(runs > 3000, runs + ' calculs');
});

test('business plan en Expert : cinq points, numérotés 1 à 5, comme les calculs ; la méthode est passée du document au bloc Expert', async () => {
  const p = await page('plan', missionsPlan());
  try {
    const f = foldsOf(p, 'expert-plan');
    assert.deepEqual(f.map(x => x.id), ['plan-sensitivity', 'plan-hypotheses', 'plan-reference', 'plan-formula', 'plan-x-raw']);
    assert.deepEqual(f.map(x => x.n.trim()), ['1', '2', '3', '4', '5']);
    assert.deepEqual(f.map(x => x.title), ['Et si le chiffre bouge de 20 % ?', 'Et si autre chose change ?', 'Comparer avec un calcul gardé', 'Comment est-ce calculé ?', 'Tous les chiffres du calcul']);
    const ex = flat(p.d.getElementById('expert-plan').textContent);
    assert.match(ex, /Ton calcul, tel quel/); assert.match(ex, /Tout va moins bien, en même temps/); assert.match(ex, /Ce qui pèse le plus/);
    assert.match(ex, /Partie après partie : avec l’argent que tu as/); assert.match(ex, /Les chiffres utilisés/); assert.match(ex, /Villa : 2 000 000 \$/);
    assert.ok(!p.d.querySelector('#plan-report [data-fold="plan-method"]'), 'plus de « Comment est-ce calculé ? » en double dans le document');
    assert.equal(p.d.querySelectorAll('#expert-plan .b-hyp tbody tr.is-base').length, 1);
    assert.ok(p.d.querySelector('#expert-plan .b-hyp[role="region"][tabindex="0"]'), 'tableau défilable atteignable au clavier');
    assert.deepEqual(p.errors, []);
  } finally { p.close(); }
});

test('business plan pas encore calculable : les cinq points restent, chacun dit ce qui manque', async () => {
  const s = B.copy(initial); s.tab = 'plan'; s.plan.goal.kind = 'purchase'; s.plan.goal.name = 'Hangar'; s.plan.goal.price = null;
  const p = await page('plan', s);
  try {
    const f = foldsOf(p, 'expert-plan');
    assert.deepEqual(f.map(x => x.id), ['plan-sensitivity', 'plan-hypotheses', 'plan-reference', 'plan-formula', 'plan-x-raw']);
    assert.equal(f[1].teaser, 'Pas encore calculable'); assert.equal(f[4].teaser, 'Pas encore calculable');
    const ex = flat(p.d.getElementById('expert-plan').textContent);
    assert.match(ex, /Le plan n’a pas encore sa réponse/); assert.match(ex, /Écris le prix de ton but/); assert.match(ex, /Hangar : —/);
    assert.doesNotMatch(ex, /NaN|undefined|Infinity/);
    assert.deepEqual(p.errors, []);
  } finally { p.close(); }
});

test('« Comparer avec un calcul gardé » marche pour le business plan : garder, changer un chiffre, voir l’écart', async () => {
  const p = await page('plan', missionsPlan());
  try {
    p.d.querySelector('[data-b-keep-ref="plan"]').dispatchEvent(new p.w.Event('click', { bubbles: true })); p.flush();
    let ex = flat(p.d.getElementById('expert-plan').textContent);
    assert.match(ex, /Courant \/ référence/); assert.match(ex, /Résultats identiques sur ce critère/);
    const cap = p.d.getElementById('plan-capital'); cap.value = '900000'; cap.dispatchEvent(new p.w.Event('input', { bubbles: true })); cap.dispatchEvent(new p.w.Event('change', { bubbles: true })); p.flush();
    ex = flat(p.d.getElementById('expert-plan').textContent);
    assert.match(ex, /Écart absolu/); assert.match(ex, /Le scénario courant est plus favorable sur ce critère/);
    assert.deepEqual(p.errors, []);
  } finally { p.close(); }
});

test('les huit calculs : « Et si autre chose change ? » entre « Et si » et « Comparer », points numérotés à la suite sans doublon', async () => {
  for (const t of B.tools) {
    const p = await page(t);
    try {
      const f = foldsOf(p, 'expert-' + t), ids = f.map(x => x.id);
      const i = ids.indexOf(t + '-hypotheses');
      assert.ok(i > 0, t + ' : hypothèses présentes'); assert.equal(ids[i + 1], t + '-reference', t + ' : puis la comparaison');
      assert.deepEqual(f.map(x => x.n.trim()), f.map((x, k) => String(k + 1)), t + ' : 1, 2, 3… sans doublon');
      assert.equal(f[i].title, 'Et si autre chose change ?');
      assert.deepEqual(p.errors, []);
    } finally { p.close(); }
  }
});

test('micro : l’en-tête du site l’autorise pour le site seul, l’autorisation se demande depuis la page, étapes par navigateur, rien n’est envoyé', () => {
  const v = JSON.parse(read('vercel.json'));
  const pp = v.headers.flatMap(h => h.headers).filter(h => h.key === 'Permissions-Policy').map(h => h.value);
  assert.ok(pp.length >= 1); for (const x of pp) { assert.match(x, /microphone=\(self\)/); assert.match(x, /camera=\(\)/); assert.match(x, /geolocation=\(\)/); }
  const src = read('lk-micro.js');
  assert.match(src, /navigator\.permissions\.query\(\{ name: 'microphone' \}\)/);
  assert.match(src, /if \(micState === 'denied'\) \{ showHelp\(\); return; \}/);
  assert.match(src, /k === 'not-allowed'/); assert.match(src, /k === 'audio-capture'/); assert.match(src, /k === 'network'/);
  for (const k of ['chrome', 'edge', 'safari', 'ios', 'android', 'other']) assert.match(src, new RegExp('\\b' + k + ': \\['), 'étapes ' + k);
  assert.doesNotMatch(src.replace(/\/\*[\s\S]*?\*\//g, ''), /fetch\(|XMLHttpRequest|sendBeacon|localStorage/, 'rien ne part, rien n’est gardé');
  assert.match(read('de/lk-micro.js'), /Das Mikrofon für diese Website zulassen/);
  assert.match(read('en/lk-micro.js'), /Your browser will ask you for access to the microphone/);
  assert.match(read('es/lk-micro.js'), /Permitir el micrófono en este sitio/);
  assert.match(read('it/lk-micro.js'), /Consenti il microfono per questo sito/);
});

test('traductions : les hypothèses et le plan existent dans les quatre langues', () => {
  assert.match(read('en/calculateurs-workspace.js'), /What if something else changes\?/);
  assert.match(read('es/calculateurs-workspace.js'), /¿Y si cambia otra cosa\?/);
  assert.match(read('it/calculateurs-workspace.js'), /E se cambia qualcos’altro\?/);
  assert.match(read('de/calculateurs-workspace.js'), /Was, wenn sich etwas anderes ändert\?/);
  assert.match(read('en/calculateurs-scenario.js'), /Everything goes worse, at the same time/);
  assert.match(read('de/calculateurs-plan.js'), /Der Plan hat noch keine Antwort/);
});
