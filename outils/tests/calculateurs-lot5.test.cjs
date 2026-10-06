'use strict';
/* Calculateur, lot 5 (seconde relecture contradictoire) : barre plus prudente (aucune valeur écrite sans indice net), « remboursé après »
   qui suit la réponse, prévu du business plan en parcours, éditeur du point réel, carnets qui n’écrasent rien. Valeurs attendues écrites à
   la main (détail en commentaire) ; montants FICTIFS. */
const test = require('node:test'), assert = require('node:assert/strict'), path = require('node:path');
const root = path.resolve(__dirname, '../..');
const B = require(path.join(root, 'calculateurs-scenario.js')), E = require(path.join(root, 'calculateurs-engine.js'));
const H = require('./check-ultime-helper.cjs');
const { load } = require('./runtime-helper.cjs');
const site = H.siteData(), initial = B.initial(H.dataVersion(site.D, site.catalogue, site.sourceActivities), site.presets);
const flat = t => String(t || '').replace(/[\s  ]+/g, ' ').trim();
const fire = (p, n, t) => n.dispatchEvent(new p.w.Event(t, { bubbles: true, cancelable: true }));
const edit = (p, id, v) => { const n = p.d.getElementById(id); assert.ok(n, 'champ absent : ' + id); n.value = String(v); fire(p, n, 'input'); };
const stored = p => JSON.parse(p.w.localStorage.getItem('lk-calculator-v1'));

/* ---------- barre : chaque famille de défauts de la seconde relecture ---------- */
// null = rien ne doit être lu pour cette case ; un nombre = la seule valeur juste ; note = phrase qui doit être dite
const FR = [
 ['Combien de temps pour atteindre 1 million en une heure par jour ?', { tab: 'goal', target: 1e6, minutes: 60, hourly: null }], // « par jour » : une durée, pas un gain par heure
 ['J’ai 200 000 $ à l’heure actuelle, objectif 1 million', { cap: 200000, target: 1e6, hourly: null }],
 ['Avec 50 000 $ de gain par heure, combien de temps pour 1 million ?', { cap: null, hourly: 50000, target: 1e6 }],
 ['J’ai une voiture de 200 000 $ et je veux 1 million', { cap: null, target: 1e6 }], // un bien n’est pas de l’argent
 ['J’ai 3 propriétés qui valent 900 000 $ au total, objectif 2 millions', { cap: null, target: 2e6 }],
 ['J’ai 25 000 RP et 300 000 $, je veux 1 million', { cap: 300000, target: 1e6 }], // 25 000 RP : des points, pas des dollars
 ['Un garage à 400 000 $ avec 50 000 $ d’améliorations, ça vaut le coup ?', { tab: 'roi', cap: null, price: 400000 }],
 ['Je suis à 100 000 $ de mon objectif de 1 million', { target: 1e6, cap: 900000, note: /ton argent = objectif − ce qui te manque/ }], // 1 000 000 − 100 000
 ['Je n’ai rien gagné aujourd’hui, objectif 1 million', { cap: null, target: 1e6 }], // « rien gagné » n’est pas « rien »
 ['Je n’aime pas jouer en solo, objectif 1 million', { players: null, target: 1e6 }],
 ['On est à 20 000 $ de notre objectif d’un million', { players: null, cap: 980000, target: 1e6 }],
 ['Combien de temps pour avoir 1 million sans rien acheter ?', { tab: 'goal', target: 1e6 }],
 ['Je veux 1 million à tout prix', { tab: 'goal', target: 1e6 }],
 ['J’ai 500 000 $ et je veux 1 million de plus que ça', { cap: 500000, target: 1.5e6 }], // 500 000 + 1 000 000
 ['Je veux 300 000 $ de plus que ce que j’ai', { target: null, note: /écris aussi ton argent/ }],
 ['Avec mes 300 000 $, il me faut 1 million de plus', { cap: 300000, target: 1.3e6 }],
 ['Je veux gagner 100 000 $ de plus que mon frère, j’ai 200 000 $', { cap: 200000, target: null }], // l’argent du frère est inconnu
 ['Je joue une heure trente par jour, objectif 1 million', { minutes: 90 }],
 ['Je joue deux heures et demi par jour, objectif 1 million', { minutes: 150 }],
 ['Je joue 1 heure 45 par jour, objectif 1 million', { minutes: 105 }],
 ['J’ai trois mille cinq cents dollars et je veux un million', { cap: 3500, target: 1e6 }],
 ['Ce soir à 20 heures j’ai 45 minutes', { tab: 'session', minutes: 45 }], // 20 heures : une heure de la journée
 ['Je joue de 20h à 22h tous les soirs, objectif 1 million', { minutes: 120 }],
 ['J’ai mis 2 h pour gagner 100 000 $, objectif 1 million', { minutes: null, target: 1e6 }],
 ['Combien de temps pour doubler mes 500 000 $ ?', { cap: 500000, target: 1e6, note: /objectif = 2 × ton argent/ }],
 ['Je joue 1 h par jour, non plutôt 2 h, pour avoir 4 millions', { minutes: 120, target: 4e6, note: /j’ai pris la durée corrigée/ }],
 ['Je joue 1 h par jour en semaine et 3 h le week-end, objectif 1 million', { minutes: null, note: /deux durées différentes/ }],
 ['J’ai 2,4 M sur mon compte et 100 000 en cash, je veux 5 M', { cap: 2.5e6, target: 5e6, note: /la somme de ces montants/ }], // 2 400 000 + 100 000
 ['J’ai 1 million mais 200 000 de frais à payer, le reste je le mets dans quoi ?', { tab: 'budget', cap: 800000, note: /les frais à payer/ }],
 ['Le hangar est à 1,2 M au lieu de 1,6 M cette semaine, je le prends ? J’ai 1,4 M', { tab: 'purchase', price: 1.2e6, cap: 1.4e6 }],
 ['C’est mieux le bunker ou le hangar ?', { tab: 'compare' }],
 ['J’ai 3,5 M, j’achète quoi en premier entre le bureau, le hangar et le sous-marin ?', { tab: 'order', cap: 3.5e6 }],
 ['On est 4, on a 1h30, on fait quoi ?', { tab: 'session', players: 4, minutes: 90 }],
 ['Mon pote se fait 500k de l’heure, combien de temps pour 5 millions ?', { hourly: null, target: 5e6 }],
 ['Je veux 1 million en 2 semaines', { deadline: 14, target: 1e6 }],
 ['J’ai 1M2 sur moi, je vise les 5M', { cap: 1.2e6, target: 5e6 }],
 ['La villa coûte un million deux, j’ai 900 000', { tab: 'purchase', price: 1.2e6, cap: 900000 }],
 ['J’ai 12 voitures et 5 propriétés, je veux 1 million', { cap: null, target: 1e6 }],
 ['J’ai économisé 1,8 M, je peux prendre l’agence à 2 M ?', { tab: 'purchase', cap: 1.8e6, price: 2e6 }],
 // « le mieux », « lequel », « l’ordre des missions », « repartir de zéro » ne demandent pas un autre outil : Mon objectif, comme avant
 ['C’est quoi le mieux pour avoir 1 million ?', { tab: 'goal', target: 1e6 }],
 ['Lequel me fait gagner 1 million le plus vite ?', { tab: 'goal', target: 1e6 }],
 ['Dans quel ordre faire les missions pour 1 million ?', { tab: 'goal', target: 1e6 }],
 ['Je veux repartir de zéro et faire 1 million', { tab: 'goal', target: 1e6 }],
 // les six valeurs fausses du second corpus écrit à l’aveugle (premier passage), corrigées
 ['je joue chaque soir de 22h à minuit, fais-moi un plan pour 8M', { tab: 'plan', minutes: 120, target: 8e6 }], // de 22 h à 24 h
 ['j’ai 3M et je veux 2M de plus d’ici 10 jours, quel plan ?', { tab: 'plan', cap: 3e6, target: 5e6, deadline: 10 }], // 3 M + 2 M
 ['je dois 300k à la banque et j’ai plus un rond, aide-moi avec un plan', { tab: 'plan', cap: 0 }], // une dette n’est pas de l’argent ; « plus un rond » = 0
];
const LANGS = {
 en: [
  ['I have nothing to buy, goal 1M', { cap: null, target: 1e6 }],
  ['I have $300k but I need $1M more', { cap: 300000, target: 1.3e6, note: /goal = your money \+ what you want on top/ }],
  ['I want 1M more than what I have', { target: null }],
  ['I hate playing solo, goal 1M', { players: null }],
  ['I’ve got $250k, how long to reach $2M?', { cap: 250000, target: 2e6 }],
  ['I make about 150k an hour, how long to get 3M if I already have 600k?', { tab: 'goal', hourly: 150000, target: 3e6, cap: 600000 }],
  ['I’m 250k short of my 1M goal, playing an hour a day', { target: 1e6, cap: 750000, minutes: 60 }],
  ['I make about 250k an hour, sorry, 300k, how long to reach $4M?', { hourly: 300000, target: 4e6 }], // correction après « an hour »
  ['I play 10 hours a week, how long until I hit 5M?', { minutes: null, target: 5e6 }], // par semaine : pas un temps par jour
 ],
 es: [
  ['no tengo nada que comprar, objetivo un millón', { cap: null, target: 1e6 }],
  ['a las 9 h tengo 45 minutos', { tab: 'session', minutes: 45 }],
  ['¿Merece la pena el club nocturno por 1,2 millones si genera 40 mil al día?', { tab: 'roi', price: 1.2e6 }],
  ['tengo un millón y medio, ¿cómo lo reparto entre negocios y coches?', { tab: 'budget', cap: 1.5e6 }],
 ],
 it: [
  ['non ho niente da comprare, obiettivo un milione', { cap: null, target: 1e6 }],
  ['Siamo in 4 e abbiamo due ore', { tab: 'session', players: 4, minutes: 120 }],
 ],
 de: [
  ['ich habe nichts zu kaufen, Ziel eine Million', { cap: null, target: 1e6 }],
  ['wie lange für 1 Million in einer Stunde pro Tag?', { target: 1e6, minutes: 60, hourly: null }],
  ['Wir sind zu viert und haben anderthalb Stunden', { tab: 'session', players: 4, minutes: 90 }],
  ['ich spiele nicht gerne allein, Ziel 1 Million', { players: null }],
  ['das Motorrad kostet 400.000, nee, 420.000, und ich bin pleite, wann kann ich es kaufen?', { tab: 'purchase', price: 420000, cap: 0 }],
 ],
};
const VAL = { tab: r => r.tab, cap: r => r.values.capital, target: r => r.values.target, price: r => r.values.price, minutes: r => r.values.minutes, players: r => r.values.players, hourly: r => r.values.hourly, deadline: r => r.values.deadlineDays };
function check(r, exp) {
  const bad = [];
  for (const [k, v] of Object.entries(exp)) {
    if (k === 'note') { if (!v.test(r.notes.join(' · '))) bad.push('note absente : ' + v); continue; }
    const got = VAL[k](r);
    if (v === null ? got !== null : got !== v) bad.push(k + ' = ' + got + ' au lieu de ' + v);
  }
  return bad;
}
test('T5-01 barre (seconde relecture) : rien n’est lu sans indice net ; heures de la journée, durées passées, biens, autres joueurs, négations, relatifs et corrections lus comme un lecteur attentif', async () => {
  for (const [lang, list] of [['fr', FR], ...Object.entries(LANGS)]) {
    const p = await load(root, (lang === 'fr' ? '' : lang + '/') + 'calculateurs.html', {});
    try {
      const bad = [];
      for (const [q, exp] of list) { const r = p.w.LKCalcHub.route(q); p.flush(); const b = check(r, exp); if (b.length) bad.push(lang + ' « ' + q + ' » : ' + b.join(', ') + ' [' + r.tab + ' · ' + r.notes.join(' · ') + ']'); }
      assert.deepEqual(bad, []); assert.deepEqual(p.errors, []);
    } finally { p.close(); }
  }
});

/* ---------- « Ça vaut le coup ? » : remboursement qui suit la réponse ---------- */
test('T5-02 « remboursé après » : devant à la fin du temps d’usage → au plus ce temps ; à égalité ou derrière → devant pour de bon, ou rien ; missions finies seulement', () => {
  const A1 = { id: 'm', name: 'M', reward: 100000, duration: 60, prep: 0, cost: 0, cooldown: 0, share: 100, players: 1 };
  const nw = h => E.investmentActivities({ purchase: 100000, hours: h, activities: [A1], baselineHourly: 60000, mode: 'new' });
  // D(k h) aux fins = 100 000 k − 60 000 k − 100 000 = 40 000 k − 100 000 ; juste avant la fin k : 100 000 (k − 1) − 60 000 k − 100 000
  // 3 h : +20 000 (devant depuis 3 h) ; 4 h : derrière juste avant (−40 000), +60 000 à 4 h ; 3 h 30 : −10 000, devant pour de bon à 4 h
  let r = nw(3); assert.equal(r.marginalNetProfit, 20000); assert.equal(r.marginalPaybackHours, 3); assert.equal(r.marginalPaybackCycles, 3);
  r = nw(4); assert.equal(r.marginalPaybackHours, 4); assert.equal(r.marginalPaybackCycles, 4);
  r = nw(3.5); assert.equal(r.marginalNetProfit, -10000); assert.equal(r.marginalPaybackHours, 4);
  // un cycle de 75 min (5 + 20 min de préparation une fois ; 45 + 20 une fois + 30 d’attente) rapporte 20 000 + 5 000 = 25 000 $ = 20 000 $/h,
  // autant que le gain d’avant : la différence ne se stabilise jamais → aucun « remboursé après » (avant : 25 min, le premier passage)
  const P0 = { id: 'a', name: 'A0', reward: 40000, share: 50, duration: 5, prep: 20, prepOnce: true, cost: 0, cooldown: 0, players: 1 };
  const P1 = { id: 'b', name: 'A1', reward: 10000, share: 100, duration: 45, prep: 20, prepOnce: true, cost: 5000, cooldown: 30, players: 1 };
  r = E.investmentActivities({ purchase: 10000, hours: 10, activities: [P0, P1], baselineHourly: 20000, mode: 'new' });
  assert.equal(r.marginalNetProfit, -15000); assert.equal(r.marginalPaybackHours, null);
  // amélioration : 10 min, +40 000 $, attente 30 min ; −25 % : fins avec 7,5 + 37,5 k, sans 10 + 40 k ; D = 40 000 (n avec − n sans) − 10 000.
  // Après 3 h : 5 contre 5 → −10 000. Calcul exact : dernier instant derrière à 530 min (fin « sans »), devant pour de bon à 532,5 min (15e fin « avec »)
  const M2 = { id: 'c', name: 'M2', reward: 40000, duration: 10, prep: 0, cost: 0, cooldown: 30, share: 100, players: 1 };
  r = E.investmentActivities({ purchase: 10000, hours: 3, activities: [M2], mode: 'improve', durationReduction: 25 });
  assert.equal(r.netProfit, -10000); assert.ok(Math.abs(r.paybackHours * 60 - 532.5) < 1e-9, String(r.paybackHours * 60)); assert.equal(r.paybackCycles, 15);
  // amélioration avec frais : +20 000 $, 10 min + 5 min de préparation, frais 10 000 $ ; −25 % (12,5 min contre 15) ; prix 10 000 $.
  // Missions finies seulement : D = 10 000 (n avec − n sans) − 10 000 ; devant pour de bon dès 62,5 min (5 contre 4) ; sur 3 h : 14 − 12 → +10 000
  const M3 = { id: 'd', name: 'M3', reward: 20000, duration: 10, prep: 5, cost: 10000, cooldown: 0, share: 100, players: 1 };
  r = E.investmentActivities({ purchase: 10000, hours: 3, activities: [M3], mode: 'improve', durationReduction: 25 });
  assert.equal(r.netProfit, 10000); assert.ok(Math.abs(r.paybackHours * 60 - 62.5) < 1e-9, String(r.paybackHours * 60)); assert.equal(r.paybackCycles, 5);
});
const roiState = fn => { const s = H.baseState(B, initial, site.catalogue); s.tab = 'roi'; s.views.roi = 'advanced'; fn(s); return B.validate(s, initial); };
test('T5-03 page « Ça vaut le coup ? » : réponse, résumé, chiffre et « Ce qui décide » disent le même remboursement (oui sur 3 h ; pas sur 3 h ; jamais stable)', async () => {
  const run = async (fn, check) => { const p = await load(root, 'calculateurs.html?tool=roi', { storage: { 'lk-calculator-v1': JSON.stringify(roiState(fn)), 'lk-calc-folds-v1': JSON.stringify({ all: true }) } });
    try { const res = p.d.getElementById('roi-results'); check({ answer: flat(res.querySelector('.calc-answer')?.textContent), short: res.querySelector('.calc-answer')?.dataset.short || '', figure: flat(res.querySelector('.c-payback')?.textContent), all: flat(res.textContent) }); assert.deepEqual(p.errors, []); } finally { p.close(); } };
  const one = (s, act) => { Object.assign(s.activities[0], { investment: 0, owned: true, ...act }); s.roi.activityIds = [s.activities[0].id]; };
  // mission de 60 min, +100 000 $ ; gain d’avant 60 000 $/h ; prix 100 000 $ ; 3 h : +20 000 $, devant depuis 3 h (3 missions)
  await run(s => { B.asset(s, s.roi.key).price = 100000; one(s, { reward: 100000, duration: 60, prep: 0, prepOnce: false, cost: 0, cooldown: 0, share: 100, players: 1 }); s.roi.mode = 'new'; s.goal.capital = 500000; s.goal.reserve = 0; s.goal.hourly = 60000; s.roi.hours = 3; }, v => {
    assert.match(v.answer, /^Oui : .* est remboursé après 3 h de jeu \(3 missions finies\)\. Après 3 h, il te laisse 20 000 \$ de plus/);
    assert.equal(v.short, 'Remboursé après 3 h'); assert.match(v.figure, /3 h ?3 missions faites/); assert.match(v.all, /Remboursement — Après 3 h de jeu \(3 missions\)\./); });
  // amélioration : 10 min, +40 000 $, attente 30 min, −25 % ; prix 10 000 $ ; 3 h : −10 000 $ ; remboursé seulement après 532,5 min = 8 h 52 min 30 s
  await run(s => { B.asset(s, s.roi.key).price = 10000; one(s, { reward: 40000, duration: 10, prep: 0, prepOnce: false, cost: 0, cooldown: 30, share: 100, players: 1 }); s.roi.mode = 'improve'; s.roi.durationReduction = 25; s.roi.gainPercent = 0; s.goal.capital = 500000; s.goal.reserve = 0; s.roi.hours = 3; }, v => {
    assert.match(v.answer, /^Pas sur 3 h : .* te fait perdre 10 000 \$\. Il ne serait remboursé qu’après 8 h 5[23] de jeu \(15 missions finies\)\.$/);
    assert.equal(v.short, 'Pas remboursé'); assert.doesNotMatch(v.all, /Remboursé après 8 min|1 missions/); });
  // deux activités dont le cycle rapporte autant que le gain d’avant : jamais devant pour de bon → « Pas atteint » partout
  await run(s => { B.asset(s, s.roi.key).price = 10000; Object.assign(s.activities[0], { reward: 40000, share: 50, duration: 5, prep: 20, prepOnce: true, cost: 0, cooldown: 0, investment: 0, owned: true, players: 1 }); Object.assign(s.activities[1], { reward: 10000, share: 100, duration: 45, prep: 20, prepOnce: true, cost: 5000, cooldown: 30, investment: 0, owned: true, players: 1 }); s.roi.activityIds = [s.activities[0].id, s.activities[1].id]; s.roi.mode = 'new'; s.goal.capital = 500000; s.goal.reserve = 0; s.goal.hourly = 20000; s.roi.hours = 10; }, v => {
    assert.equal(v.short, 'Pas remboursé'); assert.match(v.figure, /Pas atteint avec ces chiffres/); assert.match(v.all, /Remboursement — Pas atteint avec ces chiffres\./); assert.doesNotMatch(v.all, /Remboursé après 25 min/); });
});

/* ---------- business plan : prévu en parcours, éditeur du point réel ---------- */
function plan({ target = 500000, daily = 60, prereq = null }) {
  const s = H.baseState(B, initial, site.catalogue); s.tab = 'plan'; s.views.plan = 'advanced';
  s.plan.goal = { ...s.plan.goal, kind: 'amount', target };
  s.plan.situation = { ...s.plan.situation, capital: 100000, reserve: 0, hourly: 100000, unitsHourly: 0, dailyMinutes: daily, daysPerWeek: 7, upkeepPerSession: 0 };
  s.plan.source = 'hourly'; s.plan.prerequisites = prereq ? [{ ...B.copy(B.planPrereqTemplate), id: 'p', name: 'P', price: prereq, boostHourly: 0, minutes: null, usagePerSession: null }] : [];
  return B.validate(s, initial);
}
async function planRun(st, steps) {
  const p = await load(root, 'calculateurs.html?tool=plan', { storage: { 'lk-calculator-v1': JSON.stringify(st), 'lk-calc-folds-v1': JSON.stringify({ all: true }) } });
  try {
    for (const s of steps) {
      if (s.log) { edit(p, 'plan-actual', s.log[0]); edit(p, 'plan-actual-minutes', s.log[1]); fire(p, p.d.querySelector('[data-b-plan-log]'), 'click'); p.flush(); }
      if (s.editPoint !== undefined) { fire(p, p.d.querySelector('[data-c-edit="log:' + s.editPoint + '"]'), 'click'); p.flush(); const box = p.d.querySelector('.c-edit'); assert.ok(box, 'éditeur ouvert'); box.querySelector('[data-c-edit-capital]').value = String(s.cap); box.querySelector('[data-c-edit-minutes]').value = String(s.mins); fire(p, box.querySelector('[data-c-edit-save]'), 'click'); p.flush(); }
    }
    assert.deepEqual(p.errors, []);
    return { log: stored(p).plan.log, bilan: flat(p.d.querySelector('.b-bilan')?.textContent) };
  } finally { p.close(); }
}
test('T5-04 business plan : en parcours avec un gain par heure, le prévu d’une partie compte le gain au prorata (avant : « Prévu +0 $ »)', async () => {
  // 45 min à 100 000 $/h, sans achat : prévu 75 000 $ ; 175 000 $ notés → réel +75 000 → pile comme prévu
  let v = await planRun(plan({ daily: null }), [{ log: [175000, 45] }]);
  assert.equal(v.log.at(-1).plannedGain, 75000); assert.equal(v.log.at(-1).forecast, 175000); assert.match(v.bilan, /Prévu\+75 000 \$Réel\+75 000 \$Écart0 \$/); assert.match(v.bilan, /Pile comme prévu/);
  // achat P de 80 000 $ payé au départ ; 30 min : 100 000 − 80 000 + 50 000 = 70 000 $ prévus ; prévu de la partie 70 000 − 100 000 + 80 000 = +50 000
  v = await planRun(plan({ daily: null, prereq: 80000 }), [{ log: [150000, 30] }]);
  assert.equal(v.log.at(-1).forecast, 70000); assert.equal(v.log.at(-1).plannedGain, 50000);
});
test('T5-05 business plan, éditeur du point réel : le gain et la durée corrigés passent au point suivant ; un prévu qui dépendait du chiffre corrigé devient « — »', async () => {
  // une partie (30 min → 150 000 $, prévu +50 000) corrigée en 180 000 $ : réel +80 000, écart +30 000, en avance
  let v = await planRun(plan({}), [{ log: [150000, 30] }, { editPoint: 0, cap: 180000, mins: 30 }]);
  assert.equal(v.log[0].gain, 80000); assert.equal(v.log[0].plannedGain, 50000); assert.match(v.bilan, /Réel\+80 000 \$Écart\+30 000 \$/); assert.match(v.bilan, /Tu es en avance/);
  // deux parties (30 min → 150 000 ; 60 min → 260 000) ; le premier point corrigé en 170 000 : gains +70 000 puis +90 000 ; le prévu de la
  // seconde partie partait de 150 000 $ : il n’est plus connu
  v = await planRun(plan({}), [{ log: [150000, 30] }, { log: [260000, 60] }, { editPoint: 0, cap: 170000, mins: 30 }]);
  assert.deepEqual(v.log.map(e => e.gain), [70000, 90000]); assert.equal(v.log[1].plannedGain, null); assert.match(v.bilan, /Prévu—Réel\+90 000 \$Écart—/);
  // le dernier point passe de 90 à 120 min en tout : la seconde partie a duré 90 min ; rythme réel 160 000 $ en 120 min = 80 000 $/h
  v = await planRun(plan({}), [{ log: [150000, 30] }, { log: [260000, 60] }, { editPoint: 1, cap: 260000, mins: 120 }]);
  assert.deepEqual(v.log.map(e => e.sessionMinutes), [30, 90]); assert.match(v.bilan, /Ton rythme réel80 000 \$ par heure/); assert.doesNotMatch(v.bilan, /106 667/);
});

/* ---------- carnets : rien n’est écrasé ---------- */
test('T5-06 carnets : un carnet illisible très lourd n’empêche plus d’enregistrer et reste gardé ; une copie abîmée ou une copie déjà là n’est jamais écrasée', async () => {
  const raw = '{"version":3,"entries":[' + 'x'.repeat(3000000), save = p => { fire(p, p.d.querySelector('[data-b-save-current], [data-b-save]'), 'click'); p.flush(); };
  let p = await load(root, 'calculateurs.html', { storage: { 'lk-calculator-notebooks-v3': raw } });
  try {
    save(p); const main = JSON.parse(p.w.localStorage.getItem('lk-calculator-notebooks-v3'));
    assert.ok(main.entries.length >= 1, 'enregistré'); assert.ok(main.unreadable === raw || p.w.localStorage.getItem('lk-calculator-notebooks-v3-backup') === raw, 'texte illisible gardé intact');
    assert.doesNotMatch(flat(p.d.body.textContent), /Impossible d’enregistrer/); assert.deepEqual(p.errors, []);
  } finally { p.close(); }
  const good = B.copy(H.baseState(B, initial, site.catalogue)), abime = '{"version":3,"entries":[{"id":"bad-1","config":{"version":98}}';
  p = await load(root, 'calculateurs.html', { storage: { 'lk-calculator-notebooks-v3': JSON.stringify({ version: 3, entries: [{ id: 'ok-1', tool: 'goal', name: 'Bon calcul', createdAt: '2026-01-01', updatedAt: '2026-01-01', config: good }, { id: 'bad-2', tool: 'goal', name: 'Abîmé', config: { version: 99 } }], active: {}, references: {} }), 'lk-calculator-notebooks-v3-illisibles': abime } });
  try {
    save(p); assert.ok(JSON.parse(p.w.localStorage.getItem('lk-calculator-notebooks-v3-illisibles')).entries.some(e => e.id === 'bad-2'));
    assert.equal(p.w.localStorage.getItem('lk-calculator-notebooks-v3-illisibles-ancien'), abime, 'copie abîmée gardée à part'); assert.deepEqual(p.errors, []);
  } finally { p.close(); }
  p = await load(root, 'calculateurs.html', { storage: { 'lk-calculator-notebooks-v3': '{pas du json', 'lk-calculator-notebooks-v3-backup': 'ancienne copie' } });
  try {
    save(p); assert.equal(p.w.localStorage.getItem('lk-calculator-notebooks-v3-backup'), 'ancienne copie');
    const vals = []; for (let i = 0; i < p.w.localStorage.length; i += 1) vals.push(p.w.localStorage.getItem(p.w.localStorage.key(i)));
    assert.ok(vals.includes('{pas du json'), 'nouveau texte illisible gardé à part'); assert.deepEqual(p.errors, []);
  } finally { p.close(); }
});
