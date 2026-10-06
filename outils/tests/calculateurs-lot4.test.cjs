'use strict';
/* Calculateur, lot 4 (« Même interface, intelligence renforcée ») : compréhension des demandes, recalcul après une partie réelle,
   carnets, mêmes réponses dans les trois modes et dans les langues présentes. Valeurs attendues écrites à la main ; montants FICTIFS. */
const test = require('node:test'), assert = require('node:assert/strict'), path = require('node:path'), fs = require('node:fs');
const root = path.resolve(__dirname, '../..');
const B = require(path.join(root, 'calculateurs-scenario.js')), E = require(path.join(root, 'calculateurs-engine.js'));
const H = require('./check-ultime-helper.cjs');
const { load } = require('./runtime-helper.cjs');
const site = H.siteData(), initial = B.initial(H.dataVersion(site.D, site.catalogue, site.sourceActivities), site.presets);
const flat = t => String(t || '').replace(/[\s  ]+/g, ' ').trim();
const fire = (p, n, t) => n.dispatchEvent(new p.w.Event(t, { bubbles: true, cancelable: true }));
const edit = (p, id, v) => { const n = p.d.getElementById(id); assert.ok(n, 'champ absent : ' + id); n.value = String(v); fire(p, n, 'input'); };
const stored = p => JSON.parse(p.w.localStorage.getItem('lk-calculator-v1'));
const ask = (p, q) => { const input = p.d.getElementById('calc-ask-input'); input.value = q; p.d.getElementById('calc-ask').dispatchEvent(new p.w.Event('submit', { bubbles: true, cancelable: true })); p.flush(); return flat(p.d.getElementById('calc-ask-out').textContent); };

/* ---------- la barre « Que veux-tu calculer ? » : corpus de phrases ---------- */
/* Avant le lot 4 (base 9fc0813c), mesuré sur la page : 24 phrases sur 43 du premier corpus (56 %), 5 sur 20 du second (25 %). Le second
   corpus a été écrit APRÈS les premières corrections, sans les regarder, puis les règles générales qui manquaient ont été ajoutées. */
const CORPUS = [
 ['J’ai 200 000 $ et je veux 1 million',{tab:'goal',cap:200000,target:1e6}],
 ['je veux 1 000 000 $, j’ai 200 000 $',{tab:'goal',cap:200000,target:1e6}],
 ['Objectif : un million, j’ai deux cent mille dollars',{tab:'goal',cap:200000,target:1e6}],
 ['j’ai 200.000 $ et je vise 1.000.000 $',{tab:'goal',cap:200000,target:1e6}],
 ['J’ai 200k, je veux atteindre 1M',{tab:'goal',cap:200000,target:1e6}],
 ['j’ai 200000 et je veux 1000000',{tab:'goal',cap:200000,target:1e6}],
 ['Avec 200 000 $ en poche, combien de temps pour avoir 1 million ?',{tab:'goal',cap:200000,target:1e6}],
 ['je pars de 200 000 $ pour arriver à 1 000 000 $',{tab:'goal',cap:200000,target:1e6}],
 ['il me reste 200 000 et je voudrais un million',{tab:'goal',cap:200000,target:1e6}],
 ['j’ai 200 000 $, non 300 000 $, et je veux 1 million',{tab:'goal',cap:300000,target:1e6}],
 ['je veux 1 million, enfin plutôt 2 millions',{tab:'goal',target:2e6}],
 ['objectif 500 000 $… en fait 800 000 $',{tab:'goal',target:800000}],
 ['j’ai 100k pardon 150k, objectif 1 million',{tab:'goal',cap:150000,target:1e6}],
 ['je n’ai rien et je veux 1 million',{tab:'goal',cap:0,target:1e6}],
 ['je pars de zéro, objectif 500k',{tab:'goal',cap:0,target:500000}],
 ['je n’ai pas d’argent, combien de temps pour 1 million ?',{tab:'goal',cap:0,target:1e6}],
 ['je joue 1h30 par jour, j’ai 50 000 $, je veux 500 000 $',{tab:'goal',cap:50000,target:500000,daily:90}],
 ['une heure par jour pour atteindre 2 millions',{tab:'goal',target:2e6,daily:60}],
 ['une demi-heure par jour, objectif 300k',{tab:'goal',target:300000,daily:30}],
 ['2 heures et demie par jour pour 1 million',{tab:'goal',target:1e6,daily:150}],
 ['deux heures par jour, objectif un million',{tab:'goal',target:1e6,daily:120}],
 ['je joue seul, j’ai 100 000 $ et je veux 1 million',{tab:'goal',cap:100000,target:1e6,players:1}],
 ['on est 4 joueurs, combien de temps pour 2 millions ?',{tab:'goal',target:2e6,players:4}],
 ['avec 2 amis, objectif 1 million',{tab:'goal',target:1e6,players:3}],
 ['Combien de temps pour atteindre 1,5 million avec 2 h par jour ?',{tab:'goal',target:1.5e6,daily:120}],
 ['je veux économiser 250k',{tab:'goal',target:250000}],
 ['un milliard, c’est possible ?',{tab:'goal',target:1e9}],
 ['J’ai 500 000 $, je veux acheter une voiture à 200 000 $',{tab:'purchase',cap:500000,price:200000}],
 ['Puis-je acheter une moto à 80k si j’ai 120k ?',{tab:'purchase',cap:120000,price:80000}],
 ['un bateau coûte 1,2 million, j’ai 900 000 $',{tab:'purchase',cap:900000,price:1.2e6}],
 ['Puis-je me permettre d’acheter un véhicule à 250000 $ ?',{tab:'purchase',price:250000}],
 ['ça vaut le coup d’acheter un local à 2 M si j’ai 800k ?',{tab:'roi',cap:800000,roiPrice:2e6}],
 ['est-ce rentable d’investir 300 000 $ ?',{tab:'roi',roiPrice:300000}],
 ['En combien de temps un investissement de 500000 $ est amorti ?',{tab:'roi',roiPrice:500000}],
 ['J’ai 30 minutes pour ma session',{tab:'session',session:30}],
 ['j’ai 45 min ce soir',{tab:'session',session:45}],
 ['quelle mission rapporte le plus en 90 minutes ?',{tab:'activities',inverse:90}],
 ['mon business plan : j’ai 50k et je veux 400 000 $, parties de 1 h',{tab:'plan',planCap:50000,planTarget:400000,planDaily:60}],
 ['plan étape par étape pour un million avec 100 000 $',{tab:'plan',planCap:100000,planTarget:1e6}],
 ['quoi acheter d’abord',{tab:'order'}],
 ['lequel choisir : la moto à 80 000 $ ou la voiture à 120 000 $ ?',{tab:'compare'}],
 ['j’ai 300 000 $, comment les répartir ?',{tab:'budget',cap:300000}],
 ['j’ai 200 000 $ et j’ai 300 000 $, je veux 1 million',{tab:'goal',cap:300000,target:1e6,note:/deux montants pour ton argent/}],
];
const HELD = [
 ['J’aimerais avoir 750 000 $ et j’en ai 150 000',{tab:'goal',cap:150000,target:750000}],
 ['Il me faut 2 millions, je possède 500 000 $',{tab:'goal',cap:500000,target:2e6}],
 ['Combien d’heures pour passer de 100k à 1M ?',{tab:'goal',cap:100000,target:1e6}],
 ['Je dispose de 300 000 dollars, objectif 3 millions',{tab:'goal',cap:300000,target:3e6}],
 ['Avec 3h par jour et 0 $ au départ, combien pour un million ?',{tab:'goal',cap:0,target:1e6,daily:180}],
 ['Je veux acheter un hélico à 1,5 M, j’ai 2 M',{tab:'purchase',cap:2e6,price:1.5e6}],
 ['Est-ce que ça vaut le coup de payer 400 000 $ pour un garage qui rapporte 20 000 $ par heure ?',{tab:'roi',roiPrice:400000}],
 ['j’ai seulement 20 000 $ et je joue 30 min par jour, je vise 1 M',{tab:'goal',cap:20000,target:1e6,daily:30}],
 ['objectif un million et demi',{tab:'goal',target:1.5e6}],
 ['j’ai 1 250 000 $ et je veux 5 000 000 $',{tab:'goal',cap:1250000,target:5e6}],
 ['je veux 1M en jouant 45 minutes par jour en solo',{tab:'goal',target:1e6,daily:45,players:1}],
 ['à deux joueurs, combien pour 2 M ?',{tab:'goal',target:2e6,players:2}],
 ['je possède déjà 400 000 $ et j’aimerais 900 000 $',{tab:'goal',cap:400000,target:900000}],
 ['Combien de temps pour 10 millions si je gagne 200 000 $ par heure ?',{tab:'goal',target:1e7,hourly:200000}],
 ['J’ai 0 $, je veux 100 000 $',{tab:'goal',cap:0,target:100000}],
 ['Je n’ai que 5 000 $, je veux une moto à 30 000 $',{tab:'purchase',cap:5000,price:30000}],
 ['j’ai 200 000 $ et je veux 1 million… non, 2 millions',{tab:'goal',cap:200000,target:2e6}],
 ['Je voudrais 300 000 $ d’ici 10 jours, j’ai 50 000 $',{tab:'plan',planCap:50000,planTarget:300000,deadline:10}],
 ['j’ai 3 heures, que faire ?',{tab:'session',session:180}],
 ['je gagne 80 000 $ de l’heure, je veux 2 millions',{tab:'goal',target:2e6,hourly:80000}],
];
/* Troisième corpus, écrit après l’implémentation et mesuré sans y toucher : base 8/25 (32 %), lot 4 14/25 (56 %) — mesure publiée ;
   ses erreurs ont ensuite servi à des règles générales (CALCULATEUR-LOT4.md § 4), il est gardé ici comme non-régression. */
const THIRD = [
 ['J’ai 200 000, je joue 45 minutes le soir, je suis solo et je veux atteindre un million sans acheter un truc qui ne servira plus après.',{tab:'goal',cap:200000,target:1e6,daily:45,players:1}],
 ['Mon objectif c’est 3 M, j’ai déjà 750k de côté',{tab:'goal',cap:750000,target:3e6}],
 ['Je suis à 120 000 $, je voudrais arriver à 600 000 $',{tab:'goal',cap:120000,target:600000}],
 ['Combien de parties pour passer de 0 à 500 000 $ ?',{tab:'goal',cap:0,target:500000}],
 ['je compte faire 250 000 $ par semaine, objectif 2 millions',{tab:'goal',target:2e6}],
 ['j’ai 1 million 200 mille et je vise 5 millions',{tab:'goal',cap:1200000,target:5e6}],
 ['Est-ce que je peux m’offrir une villa à 1,8 M avec 1,5 M en banque ?',{tab:'purchase',cap:1.5e6,price:1.8e6}],
 ['je veux savoir si une voiture à 95 000 $ est dans mon budget, j’ai 60 000 $',{tab:'purchase',cap:60000,price:95000}],
 ['le garage coûte 350 000 $ et me rapporterait 15 000 $ par heure, rentable ?',{tab:'roi',roiPrice:350000}],
 ['investir 2 M dans une boîte de nuit, ça se rembourse quand ?',{tab:'roi',roiPrice:2e6}],
 ['Je dispose de 40 minutes ce soir, que faire ?',{tab:'session',session:40}],
 ['j’ai une heure devant moi',{tab:'session',session:60}],
 ['quelle activité rapporte le plus en 2 heures ?',{tab:'activities',inverse:120}],
 ['business plan pour 2 M avec 300k au départ et 1 h par jour',{tab:'plan',planCap:300000,planTarget:2e6,planDaily:60}],
 ['je veux un plan pour acheter un yacht à 4 millions, j’ai 1 million',{tab:'plan',planCap:1e6,planTarget:4e6}],
 ['j’ai 500k... euh non, 450k, et je veux 1 M',{tab:'goal',cap:450000,target:1e6}],
 ['objectif 2 millions, enfin non, 2,5 millions',{tab:'goal',target:2.5e6}],
 ['je n’ai plus rien, je veux remonter à 300 000 $',{tab:'goal',cap:0,target:300000}],
 ['On joue à trois, objectif 1 million',{tab:'goal',target:1e6,players:3}],
 ['je gagne environ 60 000 $ par heure et je veux 1,2 million',{tab:'goal',target:1.2e6,hourly:60000}],
 ['j’ai 2 heures par jour et 100 000 $, je veux 900 000 $',{tab:'goal',cap:100000,target:900000,daily:120}],
 ['dans 15 jours je veux avoir 800 000 $',{tab:'plan',planTarget:800000}],
 ['Combien de temps pour un demi-million ?',{tab:'goal',target:500000}],
 ['j’ai 3.500.000 $ et je veux 10.000.000 $',{tab:'goal',cap:3500000,target:1e7}],
 ['Puis-je me payer un jet à 3 millions et demi si j’ai 2 millions ?',{tab:'purchase',cap:2e6,price:3.5e6}],
];
const VAL = { deadline: r => r.values.deadlineDays, tab: r => r.tab, cap: r => r.values.capital, target: r => r.values.target, daily: r => r.values.minutes, session: r => r.values.minutes, inverse: r => r.values.minutes, players: r => r.values.players, hourly: r => r.values.hourly, price: r => r.values.price, roiPrice: r => r.values.price, planCap: r => r.values.capital, planTarget: r => r.values.target, planDaily: r => r.values.minutes };
function rate(p, list) {
  const misses = [];
  for (const [q, exp] of list) {
    const r = p.w.LKCalcHub.route(q), bad = [];
    for (const [k, v] of Object.entries(exp)) { if (k === 'note') { if (!v.test(r.notes.join(' · '))) bad.push('note'); continue; } const got = VAL[k](r); if (got !== v) bad.push(k + ' = ' + got + ' au lieu de ' + v); }
    if (bad.length) misses.push('« ' + q + ' » : ' + bad.join(', '));
  }
  return misses;
}
test('T4-01 barre de saisie : 43 + 20 + 25 phrases comprises (outil, argent, but, prix, temps, joueurs, gain par heure, corrections)', async () => {
  const p = await load(root, 'calculateurs.html', {});
  try {
    assert.deepEqual(rate(p, CORPUS), [], 'premier corpus'); assert.deepEqual(rate(p, HELD), [], 'second corpus'); assert.deepEqual(rate(p, THIRD), [], 'troisième corpus');
    // une même demande reformulée de neuf façons construit le même état : 200 000 $, but 1 000 000 $
    const same = CORPUS.slice(0, 9).map(([q]) => p.w.LKCalcHub.route(q)).map(r => [r.tab, r.values.capital, r.values.target]);
    assert.deepEqual(new Set(same.map(x => JSON.stringify(x))).size, 1, JSON.stringify(same));
    assert.deepEqual(p.errors, []);
  } finally { p.close(); }
});
test('T4-02 barre de saisie dans la page : valeurs redites, correction et contradiction dites, référence au calcul d’avant', async () => {
  let p = await load(root, 'calculateurs.html', {});
  try {
    let out = ask(p, 'J’ai 200 000 $, non 300 000 $, et je veux 1 million');
    let s = stored(p); assert.equal(s.goal.capital, 300000); assert.equal(s.goal.target, 1000000);
    assert.match(out, /ton argent est rempli \(300 000 \$\)/); assert.match(out, /ton objectif est rempli \(1 000 000 \$\)/); assert.match(out, /j’ai pris le montant corrigé/);
    // référence au dernier calcul : seule la durée change, l’argent et le but restent
    out = ask(p, 'et avec 2 h par jour ?'); s = stored(p);
    assert.equal(s.goal.capital, 300000); assert.equal(s.goal.target, 1000000); assert.equal(s.goal.dailyMinutes, 120); assert.match(out, /ton temps de jeu est rempli \(2 h\)/);
    // changement d’objectif : le nouveau but remplace l’ancien
    ask(p, 'finalement je veux 2 millions'); assert.equal(stored(p).goal.target, 2000000);
    // contradiction sans mot de correction : le dernier montant est gardé et c’est dit
    out = ask(p, 'j’ai 200 000 $ et j’ai 250 000 $'); assert.equal(stored(p).goal.capital, 250000); assert.match(out, /deux montants pour ton argent : j’ai gardé le dernier/);
    // une durée négative n’est jamais lue comme une échéance
    ask(p, 'je veux 1 million en -3 jours'); assert.equal(stored(p).plan.deadlineDays, null); assert.equal(stored(p).goal.deadlineDays, null);
    // négation : « je n’ai rien » = 0 $, dit
    out = ask(p, 'je n’ai rien et je veux 1 million'); assert.equal(stored(p).goal.capital, 0); assert.match(out, /ton argent est rempli \(0 \$\)/);
    assert.deepEqual(p.errors, []);
  } finally { p.close(); }
  // le prix d’un achat n’est plus le plus grand montant de la phrase (avant : 500 000 $, l’argent du joueur)
  p = await load(root, 'calculateurs.html', {});
  try {
    const out = ask(p, 'J’ai 500 000 $, je veux acheter une voiture à 200 000 $'); const s = stored(p);
    assert.equal(B.asset(s, s.purchase.key).price, 200000); assert.equal(s.goal.capital, 500000); assert.match(out, /le prix est rempli \(200 000 \$\)/);
    ask(p, 'je joue seul, j’ai 100 000 $ et je veux 1 million'); assert.equal(stored(p).goal.players, 1);
    assert.deepEqual(p.errors, []);
  } finally { p.close(); }
});
test('T4-03 barre de saisie dans les autres langues de la page (copies générées) : nombres, corrections, négation, joueurs, gain par heure', async () => {
  const cases = {
    en: [['I have 200k, no, 300k, and I want 1M', 300000, 1000000], ['I\'m broke, how long to get 500k?', 0, 500000], ['two hours a day, goal of half a million', null, 500000, 120]],
    es: [['tengo 200 mil, perdón, 300 mil, y quiero un millón', 300000, 1000000], ['no tengo dinero, objetivo medio millón', 0, 500000]],
    it: [['ho 200 mila, anzi 300 mila, e voglio un milione', 300000, 1000000], ['da solo, guadagno 50.000 $ all\'ora, obiettivo 2 milioni', null, 2000000, null, 1, 50000]],
    de: [['ich habe 200 Tausend, nein, 300 Tausend, und will eine Million', 300000, 1000000], ['allein, ich verdiene 50.000 $ pro Stunde, Ziel 2 Millionen', null, 2000000, null, 1, 50000]]
  };
  for (const [lang, list] of Object.entries(cases)) {
    if (!fs.existsSync(path.join(root, lang, 'calculateurs.html'))) continue;
    const p = await load(root, lang + '/calculateurs.html', {});
    try {
      for (const [q, cap, goal, minutes = null, players = null, hourly = null] of list) {
        const x = p.w.LKCalcHub.interpret(q);
        assert.deepEqual([x.capital, x.goal, x.minutes, x.players, x.hourly], [cap, goal, minutes, players, hourly], lang + ' : ' + q);
      }
    } finally { p.close(); }
  }
});

/* ---------- business plan : recalcul après une partie réelle ---------- */
function planState() {
  const s = H.baseState(B, initial, site.catalogue), T = B.planMissionTemplate;
  s.tab = 'plan'; s.views.plan = 'advanced';
  s.plan.goal = { ...s.plan.goal, kind: 'amount', target: 1000000 };
  s.plan.situation = { ...s.plan.situation, capital: 100000, reserve: 0, hourly: null, unitsHourly: 0, dailyMinutes: 60, daysPerWeek: 7, upkeepPerSession: 0 };
  s.plan.source = 'missions'; s.plan.prerequisites = [];
  s.plan.missions = [{ ...B.copy(T), id: 'u', name: 'Coup unique', reward: 80000, duration: 30, once: true }, { ...B.copy(T), id: 'l', name: 'Livraison', reward: 25000, duration: 15 }, { ...B.copy(T), id: 'w', name: 'Atelier', reward: 60000, duration: 20, investment: 40000 }];
  return B.validate(s, initial);
}
const same = (a, b) => { const x = B.evaluate('plan', a), y = B.evaluate('plan', b); assert.equal(x.valid, true); assert.deepEqual([x.totalSessions, x.totalMinutes, x.finalCash, x.reached], [y.totalSessions, y.totalMinutes, y.finalCash, y.reached]); };
test('T4-04 plan : après une partie notée, le recalcul égale un plan neuf dans le même état (mission « une fois » faite, achat de départ payé) ; prévision sans dérive, calculée à la main', async () => {
  // Plan de départ (parties de 60 min, 100 000 $) : la mission « une fois » prête se joue d’abord (règle du moteur, lot 2) : Coup unique
  // 30 min, +80 000 $ ; dans les 30 min restantes, Livraison ×2 (+50 000 $) bat Atelier ×1 (60 000 − 40 000 d’achat de départ = +20 000 $).
  // Argent du plan à 1 h : 100 000 + 80 000 + 50 000 = 230 000 $.
  const s0 = planState(), p = await load(root, 'calculateurs.html?tool=plan', { storage: { 'lk-calculator-v1': JSON.stringify(s0), 'lk-calc-folds-v1': JSON.stringify({ all: true }) } });
  try {
    // partie 1 (60 min) : Coup unique ×1 et Livraison ×2 → 210 000 $ écrits
    edit(p, 'plan-actual', 210000); edit(p, 'plan-actual-minutes', 60); edit(p, 'plan-actual-runs-u', 1); edit(p, 'plan-actual-runs-l', 2);
    fire(p, p.d.querySelector('[data-b-plan-log]'), 'click'); p.flush();
    const s1 = stored(p);
    assert.equal(s1.plan.situation.capital, 210000); assert.equal(s1.plan.missions.find(m => m.id === 'u').done, true, 'mission « une fois » faite');
    const fresh1 = B.copy(s0); fresh1.plan.situation.capital = 210000; fresh1.plan.missions.find(m => m.id === 'u').done = true;
    same(s1, fresh1);
    // sans la correction, la mission « une fois » serait comptée deux fois : le plan ne serait pas le même
    const twice = B.copy(fresh1); twice.plan.missions.find(m => m.id === 'u').done = false; assert.notEqual(B.evaluate('plan', twice).finalCash, B.evaluate('plan', fresh1).finalCash);
    assert.equal(s1.plan.log[0].forecast, 230000, 'prévision de la partie 1 : argent du plan à 1 h');
    assert.equal(s1.plan.log[0].plannedGain, 130000); assert.equal(s1.plan.log[0].gain, 110000);
    // Plan d’après la partie 1 (210 000 $, Coup unique fait) : Atelier ×3 en 60 min = 180 000 − 40 000 = +140 000 $ (Livraison ×4 : +100 000 ;
    // Atelier ×2 + Livraison : +105 000) → 350 000 $ à 1 h ; à 2 h, Atelier possédé : +180 000 → 530 000 $ (la dérive d’avant lisait ce point)
    edit(p, 'plan-actual', 200000); edit(p, 'plan-actual-minutes', 60); edit(p, 'plan-actual-runs-w', 1);
    fire(p, p.d.querySelector('[data-b-plan-log]'), 'click'); p.flush();
    const s2 = stored(p);
    assert.equal(s2.plan.missions.find(m => m.id === 'w').owned, true, 'achat de départ payé');
    const fresh2 = B.copy(fresh1); fresh2.plan.situation.capital = 200000; fresh2.plan.missions.find(m => m.id === 'w').owned = true;
    same(s2, fresh2);
    const unpaid = B.copy(fresh2); unpaid.plan.missions.find(m => m.id === 'w').owned = false; assert.notEqual(B.evaluate('plan', unpaid).finalCash, B.evaluate('plan', fresh2).finalCash, 'l’achat de départ payé change le plan');
    assert.equal(s2.plan.log[1].forecast, 350000); assert.notEqual(s2.plan.log[1].forecast, 530000);
    // prévu et réel sur le même temps : 350 000 − 210 000 = +140 000 prévus ; 200 000 − 210 000 = −10 000 réels
    assert.equal(s2.plan.log[1].plannedGain, 140000); assert.equal(s2.plan.log[1].gain, -10000);
    // la courbe « Prévu » part du temps déjà joué (2 h)
    const fig = p.d.querySelector('[data-c-chart="c-plan-curve"]');
    if (fig) { const rows = [...fig.querySelectorAll('.c-chart-data tbody tr')].map(tr => [...tr.children].map(c => flat(c.textContent))); assert.ok(rows.some(r => /^2 h/.test(r[0] || '')), JSON.stringify(rows.slice(0, 4))); }
    assert.deepEqual(p.errors, []);
  } finally { p.close(); }
});
test('T4-04b plan : partie courte (30 min) quand le plan paie un achat d’avant au départ : prévu = réel = +50 000 $, écart 0, « Pile comme prévu » (relecture lot 5, P1)', async () => {
  // 100 000 $, 100 000 $/h, parties de 60 min, achat d’avant P 80 000 $ (sans gain) payé au début de la partie 1 : argent du plan à 30 min =
  // 100 000 − 80 000 + 100 000 × 30 ÷ 60 = 70 000 $ ; prévu = 70 000 − 100 000 + 80 000 (achat payé dans ce temps) = +50 000 $. Le joueur note
  // 150 000 $ sans avoir payé P : réel = 150 000 − 100 000 = +50 000 $. Avant : +90 000 prévus et « Tu as gagné moins que prévu ».
  const s = H.baseState(B, initial, site.catalogue); s.tab = 'plan'; s.views.plan = 'advanced';
  s.plan.goal = { ...s.plan.goal, kind: 'amount', target: 500000 };
  s.plan.situation = { ...s.plan.situation, capital: 100000, reserve: 0, hourly: 100000, unitsHourly: 0, dailyMinutes: 60, daysPerWeek: 7, upkeepPerSession: 0 };
  s.plan.source = 'hourly'; s.plan.prerequisites = [{ ...B.copy(B.planPrereqTemplate), id: 'p', name: 'P', price: 80000, boostHourly: 0, minutes: null, usagePerSession: null }];
  const p = await load(root, 'calculateurs.html?tool=plan', { storage: { 'lk-calculator-v1': JSON.stringify(B.validate(s, initial)), 'lk-calc-folds-v1': JSON.stringify({ all: true }) } });
  try {
    edit(p, 'plan-actual', 150000); edit(p, 'plan-actual-minutes', 30);
    fire(p, p.d.querySelector('[data-b-plan-log]'), 'click'); p.flush();
    const L = stored(p).plan.log[0];
    assert.equal(L.forecast, 70000); assert.equal(L.plannedGain, 50000); assert.equal(L.gain, 50000);
    const bilan = flat(p.d.querySelector('.b-bilan')?.textContent);
    assert.match(bilan, /Écart ?0 \$/); assert.match(bilan, /Pile comme prévu : le plan repart de ce que tu as\./);
    assert.doesNotMatch(bilan, /moins que prévu|en avance|\+0 \$/);
    assert.deepEqual(p.errors, []);
  } finally { p.close(); }
});

/* ---------- relecture contradictoire (lot 5) : phrases pièges, quatrième corpus, autres langues ; attendus écrits à la main ---------- */
/* Pièges : un montant qui n’est pas de l’argent (« 2 voitures », « une dette de 50 000 $ », « avec 30 000 $ de frais »), « mais » qui n’est pas
   une correction, « et non X », nombres en lettres composés, demi-heures, heure d’horloge, « par semaine », joueurs niés ou ambigus.
   null = rien ne doit être lu ; targetNot / playersNot = valeur interdite ; nonote = note interdite. */
const TRAPS = [
 ['J’ai 300 000 $ mais il me faut 1 million',{tab:'goal',cap:300000,target:1e6,nonote:/corrig/}],
 ['J’ai 300k mais je veux 1M',{cap:300000,target:1e6}],
 ['J’ai 300k mais j’ai besoin de 1M',{cap:300000,target:1e6}],
 ['J’ai 200 000 $ mais 50 000 $ sont mis de côté, objectif 1 million',{cap:200000,target:1e6}],
 ['J’ai 100 000 $ et non 50 000 $, je veux 1 million',{cap:100000,target:1e6}],
 ['Je veux 2 millions et non 1 million',{target:2e6}],
 ['J’ai 2 voitures et 300 000 $, je veux 1 million',{cap:300000,target:1e6}],
 ['J’ai 4 potes qui jouent avec moi, objectif 1 million',{cap:null,target:1e6}],
 ['J’ai 5 ou 6 heures ce soir',{tab:'session',cap:null}],
 ['J’ai une dette de 50 000 $, je veux 1 million',{cap:null,target:1e6}],
 ['Je suis à -20 000 $, objectif 1 million',{cap:null,target:1e6}],
 ['Je n’ai plus rien à acheter, objectif 1 million',{cap:null,target:1e6}],
 ['Objectif 1 million, sans argent de côté',{cap:null,target:1e6}],
 ['Je n’ai rien compris, j’ai 200 000 $ et je veux 1 million',{cap:200000,target:1e6}],
 ['Je ne joue pas en solo, on est 4 joueurs, objectif 1 million',{players:4,target:1e6}],
 ['Je joue 3 heures par semaine, objectif 1 million',{daily:null,target:1e6}],
 ['Je joue une heure et demie par jour, objectif 1 million',{daily:90,target:1e6}],
 ['Je joue deux heures et demie par jour, objectif 1 million',{daily:150,target:1e6}],
 ['J’ai vingt-cinq mille dollars, je veux un million',{cap:25000,target:1e6}],
 ['J’ai trois cent cinquante mille dollars et je veux un million',{cap:350000,target:1e6}],
 ['J’ai quatre-vingt mille dollars, objectif un million',{cap:80000,target:1e6}],
 ['J’ai soixante-quinze mille dollars, objectif un million',{cap:75000,target:1e6}],
 ['Je gagne 50 000 $ en une heure, je veux 1 million',{daily:null,hourly:50000,target:1e6}],
 ['Ce soir à 21h30 j’ai 45 minutes',{tab:'session',session:45}],
 ['En 2026 je veux avoir 1 million, j’ai 30 ans',{cap:null,target:1e6}],
 ['Je veux acheter une moto à 80 000 $ et une voiture à 120 000 $',{note:/deux montants pour le prix/}],
 ['J’ai 200 000 $, il me manque 800 000 $ pour mon objectif',{cap:200000,targetNot:800000}],
 ['Un garage à 400 000 $ avec 30 000 $ de frais, ça vaut le coup ?',{tab:'roi',roiPrice:400000,cap:null}],
 ['Le seul achat qui m’intéresse coûte 300 000 $, j’ai 100 000 $',{players:null,price:300000,cap:100000}],
 ['J’ai 1 500 000 $ et je veux 1 000 000 $ de plus',{cap:1.5e6,targetNot:1e6}],
 ['Je suis à 2 missions de débloquer le garage',{cap:null}],
 ['J’ai besoin de 500 000 $ pour acheter une villa',{cap:null,price:500000}],
 ['J’ai perdu 100 000 $ au casino, objectif 1 million',{cap:null,target:1e6}],
 ['J’ai dépensé 300 000 $ ce mois-ci, je veux 1 million',{cap:null,target:1e6}],
 ['J’ai -50 000 $ de dettes, objectif 1 million',{cap:null,target:1e6}],
 ['J’ai 200 000 $ mais je dépense 20 000 $ par partie, objectif 1 million',{cap:200000,target:1e6}],
 ['Je ne comprends pas, combien de temps pour 1 million ?',{tab:'goal',target:1e6}],
 ['J’ai 500 000 $ y compris ma voiture, combien de temps pour 1 million ?',{tab:'goal',cap:500000,target:1e6}],
 ['Je veux passer de 2 à 4 propriétés',{cap:null}],
 ['Je fais les missions solo ou à 4 joueurs',{playersNot:1}],
 ['Avec 300 000 $ de frais par mois, est-ce que la boîte de nuit à 2 M vaut le coup ?',{tab:'roi',roiPrice:2e6,cap:null}],
 ['Je gagne 50 000 $ par heure en solo et 80 000 $ par heure en groupe, objectif 1 million',{nonote:/undefined/}],
 ['J’ai 200k, mais il me manque 800k',{cap:200000,targetNot:800000}],
];
/* Quatrième corpus : écrit avant d’être passé, jamais utilisé pour régler les règles. Mesuré sur la page (une page neuve par phrase, état
   enregistré relu) : base 9fc0813c 12/30 (40 %) ; première mesure après correction 28/30, dont un faux échec du script de mesure (case
   inchangée mal lue) et un vrai manque (« une heure et quart », ajouté ensuite comme règle générale des quarts d’heure) ; puis 30/30. */
const FOURTH = [
 ['J’ai 350 000 $ et j’aimerais atteindre 2 millions',{tab:'goal',cap:350000,target:2e6}],
 ['Il me faut 1,5 million, je suis à 400 000 $',{tab:'goal',cap:400000,target:1.5e6}],
 ['Je joue 2 h par jour, j’ai 0 $, objectif 500 000 $',{tab:'goal',cap:0,target:500000,daily:120}],
 ['J’ai 600k mais je dois garder 100k de côté, objectif 1M',{tab:'goal',cap:600000,target:1e6}],
 ['Je vise 3 millions, j’ai déjà 1,2 million',{tab:'goal',cap:1.2e6,target:3e6}],
 ['J’ai trente mille dollars et je veux cent mille dollars',{tab:'goal',cap:30000,target:100000}],
 ['Combien de temps pour un million si je gagne 75 000 $ de l’heure ?',{tab:'goal',target:1e6,hourly:75000}],
 ['j’ai 50 000 $, non pardon, 80 000 $, et je vise 400 000 $',{tab:'goal',cap:80000,target:400000}],
 ['Je n’ai que 10 000 $ et je veux une voiture à 45 000 $',{tab:'purchase',cap:10000,price:45000}],
 ['Un yacht coûte 3 millions, j’ai 1 million, je peux ?',{tab:'purchase',cap:1e6,price:3e6}],
 ['Ça vaut le coup d’acheter un garage à 500 000 $ qui rapporte 25 000 $ par heure ?',{tab:'roi',roiPrice:500000}],
 ['J’ai 20 minutes ce soir, que faire ?',{tab:'session',session:20}],
 ['Ce soir à 20h j’ai une heure de jeu',{tab:'session',session:60}],
 ['On joue à 3, objectif 2 millions',{tab:'goal',target:2e6,players:3}],
 ['Je ne joue jamais seul, on est 2 joueurs, je veux 1 million',{tab:'goal',target:1e6,players:2}],
 ['J’ai perdu 200 000 $ hier, il me reste 100 000 $, objectif 1 million',{tab:'goal',cap:100000,target:1e6}],
 ['Je dois 50 000 $ à un ami et j’ai 300 000 $, je veux 1 million',{tab:'goal',cap:300000,target:1e6}],
 ['J’ai 2 garages et 150 000 $, je veux 600 000 $',{tab:'goal',cap:150000,target:600000}],
 ['Je joue 4 heures par semaine, combien de temps pour 1 million ?',{tab:'goal',dailySame:true,target:1e6}],
 ['J’ai besoin de 250 000 $ pour un appartement, j’ai 100 000 $',{tab:'purchase',cap:100000,price:250000}],
 ['je veux 1 million de plus, j’ai 500 000 $',{tab:'goal',cap:500000,target:1.5e6}],
 ['Il me manque 300 000 $ pour atteindre mon objectif, j’ai 700 000 $',{tab:'goal',cap:700000,target:1e6}],
 ['J’ai deux cent cinquante mille dollars, objectif un million et demi',{tab:'goal',cap:250000,target:1.5e6}],
 ['je joue une heure et quart par jour pour 1 million',{tab:'goal',daily:75,target:1e6}],
 ['Je compte gagner 100 000 $ par jour, objectif 3 millions',{tab:'goal',target:3e6}],
 ['j’ai 1M, je veux pas 2M mais 3M',{tab:'goal',cap:1e6,target:3e6}],
 ['Plan pour 5 millions en 20 jours avec 500k au départ',{tab:'plan',planCap:500000,planTarget:5e6}],
 ['Quelle activité rapporte le plus en 45 minutes ?',{tab:'activities',inverse:45}],
 ['Je préfère jouer en solo, j’ai 400 000 $ et je veux 2 millions',{tab:'goal',cap:400000,target:2e6,players:1}],
 ['J’ai 1 000 000 $ mais 300 000 $ sont réservés pour un achat, objectif 3 M',{tab:'goal',cap:1e6,target:3e6}],
];
const OTHER_VAL = { tab: r => r.tab, cap: r => r.values.capital, target: r => r.values.target, daily: r => r.values.minutes, session: r => r.values.minutes, inverse: r => r.values.minutes, players: r => r.values.players, hourly: r => r.values.hourly, price: r => r.values.price, roiPrice: r => r.values.price, planCap: r => r.values.capital, planTarget: r => r.values.target };
function trapMisses(p, list) {
  const misses = [];
  for (const [q, exp] of list) {
    const r = p.w.LKCalcHub.route(q), bad = [], notes = r.notes.join(' · ');
    for (const [k, v] of Object.entries(exp)) {
      if (k === 'note') { if (!v.test(notes)) bad.push('note absente'); continue; }
      if (k === 'nonote') { if (v.test(notes)) bad.push('note « ' + notes + ' »'); continue; }
      if (k === 'targetNot') { if (r.values.target === v) bad.push('but = ' + v); continue; }
      if (k === 'playersNot') { if (r.values.players === v) bad.push('joueurs = ' + v); continue; }
      if (k === 'dailySame') { if (r.values.minutes !== null) bad.push('temps lu : ' + r.values.minutes); continue; }
      const got = OTHER_VAL[k](r); if (got !== v) bad.push(k + ' = ' + got + ' au lieu de ' + v);
    }
    if (bad.length) misses.push('« ' + q + ' » : ' + bad.join(', '));
  }
  return misses;
}
test('T4-07 barre : 43 phrases pièges de la relecture et 30 phrases du quatrième corpus, toutes comprises (rien de faux écrit en silence)', async () => {
  const p = await load(root, 'calculateurs.html', {});
  try {
    assert.deepEqual(trapMisses(p, TRAPS), []);
    assert.deepEqual(trapMisses(p, FOURTH), []);
    // la réponse visible dit la règle d’un but calculé
    assert.match(ask(p, 'J’ai 200 000 $, il me manque 800 000 $ pour mon objectif'), /ton objectif est rempli \(1 000 000 \$\).*objectif = ton argent \+ ce qui te manque/);
    assert.doesNotMatch(ask(p, 'J’ai 300 000 $ mais il me faut 1 million'), /corrigé/);
    assert.deepEqual(p.errors, []);
  } finally { p.close(); }
});
const OTHER = {
 en:[['I have 300k but I need 1M',{capital:300000,target:1e6}],['I have 500k but I spend 20k per session, goal 1M',{capital:500000,target:1e6}],['I have $100,000 and not $50,000, I want 1 million',{capital:100000,target:1e6}],['I have 200k, no, 300k, and I want 1M',{capital:300000,target:1e6}],['I have twenty-five thousand dollars and I want a million',{capital:null}],['I play an hour and a half a day, goal 1M',{minutes:90,target:1e6}],['I don’t play solo, we are 4 players, goal 1M',{players:4}],['I have 200k and I’m missing 800k',{capital:200000,target:1e6}],['At 9pm I have 45 minutes',{minutes:45}],['I make $50k in an hour, goal 1M',{hourly:50000,target:1e6}]],
 es:[['tengo 300 mil pero necesito un millón',{capital:300000,target:1e6}],['tengo 100 mil y no 50 mil, quiero un millón',{capital:100000,target:1e6}],['tengo 200 mil, no, 300 mil, y quiero un millón',{capital:300000,target:1e6}],['juego una hora y media al día, objetivo un millón',{minutes:90,target:1e6}],['tengo 200 mil y me faltan 800 mil',{capital:200000,target:1e6}]],
 it:[['ho 300 mila ma mi serve un milione',{capital:300000,target:1e6}],['ho 100 mila e non 50 mila, voglio un milione',{capital:100000,target:1e6}],['ho 200 mila, no, 300 mila, e voglio un milione',{capital:300000,target:1e6}],['gioco un\'ora e mezza al giorno, obiettivo un milione',{minutes:90,target:1e6}],['ho 200 mila e mi mancano 800 mila',{capital:200000,target:1e6}]],
 de:[['ich habe 300 Tausend aber brauche eine Million',{capital:300000,target:1e6}],['ich habe 100 Tausend und nicht 50 Tausend, Ziel eine Million',{capital:100000,target:1e6}],['ich habe 200 Tausend, nein, 300 Tausend, Ziel eine Million',{capital:300000,target:1e6}],['ich spiele eineinhalb Stunden pro Tag, Ziel eine Million',{target:1e6}],['ich habe 200 Tausend und mir fehlen 800 Tausend',{capital:200000,target:1e6}]],
};
test('T4-08 barre : les mêmes pièges dans les autres langues de la page (copies générées) : « but / pero / ma / aber », « and not », manque, demi-heure', async () => {
  for (const [lang, list] of Object.entries(OTHER)) {
    const p = await load(root, lang + '/calculateurs.html', {});
    try {
      const misses = list.filter(([q, exp]) => { const r = p.w.LKCalcHub.route(q); return Object.entries(exp).some(([k, v]) => r.values[k] !== v); }).map(([q]) => lang + ' : « ' + q + ' »');
      assert.deepEqual(misses, []); assert.deepEqual(p.errors, [], lang);
    } finally { p.close(); }
  }
});

/* ---------- carnets : une entrée illisible n’est jamais effacée ---------- */
test('T4-05 carnets : une entrée illisible est gardée à part (lk-calculator-notebooks-v3-illisibles) ; les autres restent ; rien n’est effacé', async () => {
  const good = B.copy(H.baseState(B, initial, site.catalogue));
  const bundle = { version: 3, entries: [{ id: 'ok-1', tool: 'goal', name: 'Bon calcul', createdAt: '2026-01-01', updatedAt: '2026-01-01', config: good }, { id: 'bad-1', tool: 'goal', name: 'Abîmé', config: { version: 99, nimporte: true } }], active: {}, references: {} };
  const p = await load(root, 'calculateurs.html', { storage: { 'lk-calculator-notebooks-v3': JSON.stringify(bundle) } });
  try {
    // une écriture du carnet (enregistrer le calcul en cours) déclenche la sauvegarde
    const save = p.d.querySelector('[data-b-save-current], [data-b-save]'); assert.ok(save, 'bouton « Enregistrer »'); fire(p, save, 'click'); p.flush();
    const nb = JSON.parse(p.w.localStorage.getItem('lk-calculator-notebooks-v3'));
    assert.ok(nb.entries.some(e => e.id === 'ok-1'), 'le bon calcul est là'); assert.ok(nb.entries.length >= 2, 'le nouvel enregistrement est écrit');
    assert.ok(!nb.entries.some(e => e.id === 'bad-1'), 'l’entrée illisible n’est plus dans le carnet lisible');
    const side = JSON.parse(p.w.localStorage.getItem('lk-calculator-notebooks-v3-illisibles') || 'null');
    assert.ok(side && side.entries.some(e => e.id === 'bad-1' && e.config.nimporte === true), 'gardée telle quelle à part');
    assert.deepEqual(p.errors, []);
  } finally { p.close(); }
});

test('T4-09 plan : corriger la dernière partie notée (éditeur du point réel) fait repartir le plan de ces chiffres ; retirer un point ne change que l’historique (relecture lot 5, P2)', async () => {
  // 100 000 $, 100 000 $/h, parties de 60 min, aucun achat d’avant. Partie 1 : 30 min, 150 000 $ ; partie 2 : 60 min, 260 000 $ (90 min jouées).
  // Correction du dernier point : 300 000 $ et 100 min joués → l’argent du plan devient 300 000 $ et le temps joué 100 min ; la courbe « Prévu »
  // part de 1 h 40 avec 300 000 $, puis +100 000 $ par heure (400 000 $ à 2 h 40).
  const s = H.baseState(B, initial, site.catalogue); s.tab = 'plan'; s.views.plan = 'advanced';
  s.plan.goal = { ...s.plan.goal, kind: 'amount', target: 500000 };
  s.plan.situation = { ...s.plan.situation, capital: 100000, reserve: 0, hourly: 100000, unitsHourly: 0, dailyMinutes: 60, daysPerWeek: 7, upkeepPerSession: 0 };
  s.plan.source = 'hourly'; s.plan.prerequisites = [];
  const p = await load(root, 'calculateurs.html?tool=plan', { storage: { 'lk-calculator-v1': JSON.stringify(B.validate(s, initial)), 'lk-calc-folds-v1': JSON.stringify({ all: true }) } });
  try {
    edit(p, 'plan-actual', 150000); edit(p, 'plan-actual-minutes', 30); fire(p, p.d.querySelector('[data-b-plan-log]'), 'click'); p.flush();
    edit(p, 'plan-actual', 260000); edit(p, 'plan-actual-minutes', 60); fire(p, p.d.querySelector('[data-b-plan-log]'), 'click'); p.flush();
    fire(p, p.d.querySelector('[data-c-edit="log:1"]'), 'click'); p.flush();
    let box = p.d.querySelector('.c-edit'); box.querySelector('[data-c-edit-capital]').value = '300000'; box.querySelector('[data-c-edit-minutes]').value = '100';
    fire(p, box.querySelector('[data-c-edit-save]'), 'click'); p.flush();
    let st = stored(p);
    assert.equal(st.plan.situation.capital, 300000); assert.equal(st.plan.playedMinutes, 100);
    assert.deepEqual(st.plan.log.map(e => [e.minutes, e.capital]), [[30, 150000], [100, 300000]]);
    assert.equal(p.d.getElementById('plan-capital').value.replace(/\D/g, ''), '300000');
    const rows = [...p.d.querySelectorAll('[data-c-chart="c-plan-curve"] .c-chart-data tbody tr')].map(tr => [...tr.children].map(c => flat(c.textContent)));
    assert.deepEqual(rows[1], ['1 h 40', '300 000 $', '300 000 $']); assert.deepEqual(rows[2].slice(0, 2), ['2 h 40', '400 000 $']);
    // retirer le premier point : seul l’historique change (argent et temps joué gardés)
    fire(p, p.d.querySelector('[data-c-edit="log:0"]'), 'click'); p.flush();
    fire(p, p.d.querySelector('[data-c-edit-delete]'), 'click'); p.flush();
    st = stored(p);
    assert.equal(st.plan.situation.capital, 300000); assert.equal(st.plan.playedMinutes, 100); assert.equal(st.plan.log.length, 1);
    assert.deepEqual(p.errors, []);
  } finally { p.close(); }
});
test('T4-10 carnets : appareil presque plein — la copie à part d’une grosse entrée illisible échoue, l’enregistrement réussit quand même et l’entrée reste dans le carnet (relecture lot 5, N1)', async () => {
  // jsdom limite le stockage à 5 000 000 de caractères par origine : une entrée de 3 000 000 de caractères ne peut pas être recopiée à part.
  const good = B.copy(H.baseState(B, initial, site.catalogue));
  const bundle = { version: 3, entries: [{ id: 'ok-1', tool: 'goal', name: 'Bon calcul', createdAt: '2026-01-01', updatedAt: '2026-01-01', config: good }, { id: 'bad-1', tool: 'goal', name: 'Abîmé', config: { version: 99, gros: 'x'.repeat(3000000) } }], active: {}, references: {} };
  const p = await load(root, 'calculateurs.html', { storage: { 'lk-calculator-notebooks-v3': JSON.stringify(bundle) } });
  try {
    fire(p, p.d.querySelector('[data-b-save-current], [data-b-save]'), 'click'); p.flush();
    const nb = JSON.parse(p.w.localStorage.getItem('lk-calculator-notebooks-v3'));
    assert.ok(nb.entries.length >= 3, 'nouvel enregistrement écrit'); assert.ok(nb.entries.some(e => e.id === 'ok-1'));
    assert.ok(nb.entries.some(e => e.id === 'bad-1' && e.config.gros.length === 3000000), 'l’entrée illisible reste, intacte, dans la clé principale');
    assert.equal(p.w.localStorage.getItem('lk-calculator-notebooks-v3-illisibles'), null);
    assert.doesNotMatch(flat(p.d.body.textContent), /Impossible d’enregistrer/);
    assert.deepEqual(p.errors, []);
  } finally { p.close(); }
});

test('T4-11 barre : une ambiguïté ou un manque est dit avec la case à remplir ; « en plus de ma voiture » et un tiret séparateur ne trompent pas la lecture (lot 5)', async () => {
  const p = await load(root, 'calculateurs.html', {});
  try {
    const H4 = p.w.LKCalcHub;
    let r = H4.route('Je fais les missions solo ou à 4 joueurs, objectif 1 million');
    assert.equal(r.values.players, null); assert.equal(r.values.target, 1e6); assert.match(r.notes.join(' · '), /nombre de joueurs pas clair : écris-le dans sa case/);
    r = H4.route('il me manque 800 000 $');
    assert.equal(r.values.capital, null); assert.equal(r.values.target, null); assert.match(r.notes.join(' · '), /écris aussi ton argent : l’objectif sera ton argent \+ ce montant/);
    assert.match(ask(p, 'il me manque 800 000 $'), /écris aussi ton argent/);
    // « en plus de » n’est pas « de plus » : 200 000 $ reste ton argent ; « Objectif - 1 million » : le tiret n’est pas un signe moins
    r = H4.route('J’ai 200 000 $ en plus de ma voiture, objectif 1 million'); assert.equal(r.values.capital, 200000); assert.equal(r.values.target, 1e6);
    r = H4.route('Objectif - 1 million, j’ai 200k'); assert.equal(r.values.capital, 200000); assert.equal(r.values.target, 1e6);
    // un vrai montant négatif reste écarté
    r = H4.route('J’ai -50 000 $ de dettes, objectif 1 million'); assert.equal(r.values.capital, null); assert.equal(r.values.target, 1e6);
    assert.deepEqual(p.errors, []);
  } finally { p.close(); }
});

/* ---------- mêmes réponses dans les trois modes ---------- */
test('T4-06 Simple, Pas à pas et Expert : même réponse pour chacun des neuf outils, sur le même état', async () => {
  const s = H.baseState(B, initial, site.catalogue);
  s.assets = [...s.assets, { ...B.copy(B.assetTemplate), key: 'k2', name: 'Deuxième achat', price: 150000, utility: 3 }];
  s.compare.keys = ['free-1', 'k2']; s.order.keys = ['free-1', 'k2']; const st = B.validate(s, initial);
  for (const t of ['goal', 'purchase', 'session', 'budget', 'order', 'roi', 'activities', 'compare', 'plan']) {
    const p = await load(root, 'calculateurs.html?tool=' + t, { storage: { 'lk-calculator-v1': JSON.stringify({ ...st, tab: t }) } });
    try {
      const sel = t === 'activities' ? '#inverse-results .calc-answer' : '#' + t + '-results .calc-answer';
      const read = () => { const a = p.d.querySelector(sel); assert.ok(a, t + ' : réponse'); return flat(a.textContent) + ' | ' + (a.dataset.short || ''); };
      const seen = [];
      for (const m of ['quick', 'guided', 'advanced']) { const b = p.d.querySelector('.calc-mode-switch [data-mode="' + m + '"]'); assert.ok(b, 'bouton de mode ' + m); fire(p, b, 'click'); p.flush(); seen.push(read()); }
      assert.equal(new Set(seen).size, 1, t + ' : ' + JSON.stringify(seen));
      assert.deepEqual(p.errors, [], t);
    } finally { p.close(); }
  }
});
