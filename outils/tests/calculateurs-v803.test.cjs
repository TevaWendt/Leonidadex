'use strict';
/* v8.03, calculateur lot 2 (« réglages en plus, désactivés par défaut ») : chaque réglage, éteint puis allumé.
   1. Éteints : chaque résultat, explication, hypothèse « Et si… », entrée du moteur, plan de secours, échéance, courbe et projection
      est celui de la v8.01 (outils/tests/reference-v801.cjs, 851 résultats écrits sur le code de la v8.01).
   2. Allumés : valeurs calculées à la main dans le commentaire qui précède chaque vérification.
   3. Moteur : revenu hors ligne entre deux parties et règle R13 du vérificateur (falsifications refusées).
   4. Sauvegardes : un état et un carnet « Mes calculs » au format v8.01 se relisent sans « non enregistré », mêmes résultats.
   5. Atelier (jsdom) : les nouveaux réglages n’existent qu’en mode Expert (classe b-expert) ; le bloc « Mes hypothèses en plus »
      ne change rien tant que rien n’est coché, et dit ce qu’il change quand un réglage est coché.
   Tous les montants sont FICTIFS : ils vérifient le modèle, pas une mécanique de GTA VI. */
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = path.resolve(__dirname, '../..');
const E = require(path.join(root, 'calculateurs-engine.js')), B = require(path.join(root, 'calculateurs-scenario.js'));
const REF = require('./reference-v801.cjs'), H = require('./check-ultime-helper.cjs');
const flat = s => String(s === undefined || s === null ? '' : s).replace(/[\s  ]+/g, ' ');
const rules = v => (v.violations || []).map(x => x.rule);
const close = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) <= eps * Math.max(1, Math.abs(b)), a + ' ≠ ' + b);
const { D, catalogue, sourceActivities, presets } = H.siteData();
const initial = B.initial(H.dataVersion(D, catalogue, sourceActivities), presets), ctx = { catalogue };
const base = () => H.baseState(B, initial, catalogue);
const texts = e => e.drivers.map(d => d.label + ' : ' + d.text).concat(e.changes, e.missing.map(m => m.text)).map(flat).join(' ¶ ');

/* ---------- 1. Éteints : la v8.01 ---------- */
test('v8.03 lot 2 : réglages éteints, tout ce que lisent les neuf outils et le plan est identique à la v8.01 (851 résultats)', () => {
  const ref = JSON.parse(fs.readFileSync(REF.FILE, 'utf8')).results, now = REF.compute(), diffs = REF.compare(ref, now);
  assert.ok(Object.keys(ref).length >= 800, 'référence complète (sections 1 à 6)');
  assert.deepEqual(diffs.map(d => d.key), [], 'écarts : ' + JSON.stringify(diffs.slice(0, 3)));
});

test('état de départ : tous les réglages en plus sont éteints, avec leurs valeurs « pas encore écrit »', () => {
  const s = B.copy(initial), an = s.analysis;
  for (const k of ['soin', 'revenu-passif', 'bonus', 'amendes', 'mort', 'arrestation']) assert.equal(an.simulations[k], false, k);
  assert.deepEqual(an.sim.soin, { points: null, vieParPartie: null, prixUnitaire: null });
  assert.deepEqual([an.sim.amendes, an.sim.mort, an.sim.arrestation], [{ parPartie: null, prix: null }, { parPartie: null, perte: null }, { parPartie: null, perte: null }]);
  assert.deepEqual(an.money, { split: 'commun', perso: 'jason' }); assert.equal(an.shareAuto, false); assert.equal(s.goal.resaleOwned, false);
  assert.deepEqual([s.plan.useHypotheses, s.plan.offline, s.plan.includeFailure, s.plan.resaleAfterGoal], [false, { on: false, cap: null }, false, false]);
  assert.equal(B.planMissionTemplate.who, ''); assert.equal(B.planPrereqTemplate.resale, null);
});

/* ---------- 2. Allumés : valeurs calculées à la main ---------- */
/* État de base (outils/tests/check-ultime-helper.cjs) : 200 000 $ en poche, 20 000 $ gardés de côté, objectif 1 000 000 $ « en plus de
   ce que je garde », 100 000 $ par heure, parties de 60 min. Il manque 1 000 000 − (200 000 − 20 000) = 820 000 $ ; sans réglage :
   820 000 ÷ 100 000 = 8,2 h = 492 min. */
test('soins simulés : 100 points de vie perdus par partie ÷ 25 rendus par soin × 500 $ = 2 000 $ par partie, retirés du gain', () => {
  const s0 = base(); close(B.evaluate('goal', s0, sourceActivities, ctx).totalMinutes, 492);
  const s = base(); s.analysis.simulations.soin = true; Object.assign(s.analysis.sim.soin, { vieParPartie: 100, points: 25, prixUnitaire: 500 });
  /* gain net = 100 000 − 2 000 × 60 ÷ 60 = 98 000 $/h ; 820 000 ÷ 98 000 × 60 = 502,0408… min */
  const r = B.evaluate('goal', s, sourceActivities, ctx);
  assert.equal(r.valid, true); assert.equal(r.hourly, 98000); close(r.totalMinutes, 820000 / 98000 * 60);
  assert.equal(B.hourlyNet(s).upkeepHourly, 2000);
  const x = B.analysis('goal', s, sourceActivities, ctx).explain;
  assert.ok(x.used.includes('cout-usage') && x.used.includes('mecanique-simulee'));
  assert.ok(!x.excluded.some(c => c.id === 'cout-usage'), 'les dépenses simulées comptent : « coût d’usage » n’est plus écarté');
  assert.ok(x.values.some(v => v.label === 'Soins (simulation)' && v.value.v === 2000 && v.value.s === 'simulated'));
  assert.match(texts(x), /Dépenses simulées : 2 000 \$ par partie \(frais de soins\) comptés comme des dépenses par partie\. Elles baissent ton gain à 98 000 \$ par heure\./);
  /* incomplet : la case cochée sans tous ses chiffres n’est pas comptée, et c’est dit */
  const t = base(); t.analysis.simulations.soin = true; t.analysis.sim.soin.points = 25;
  close(B.evaluate('goal', t, sourceActivities, ctx).totalMinutes, 492);
  assert.match(texts(B.analysis('goal', t, sourceActivities, ctx).explain), /Soins : écris la vie perdue par partie/);
});

test('amendes, mort, arrestation : nombre par partie × montant, ajoutés aux tiennes (Mon objectif, Mon budget, Quoi acheter d’abord ?)', () => {
  const s = base(); s.goal.upkeepPerSession = 1000;
  Object.assign(s.analysis.simulations, { amendes: true, mort: true, arrestation: true });
  Object.assign(s.analysis.sim.amendes, { parPartie: 2, prix: 500 }); Object.assign(s.analysis.sim.mort, { parPartie: 0.5, perte: 4000 }); Object.assign(s.analysis.sim.arrestation, { parPartie: 1, perte: 3000 });
  /* 2 × 500 + 0,5 × 4 000 + 1 × 3 000 = 1 000 + 2 000 + 3 000 = 6 000 $ simulés ; + 1 000 $ à toi = 7 000 $ par partie de 60 min
     → gain net 100 000 − 7 000 = 93 000 $/h ; 820 000 ÷ 93 000 × 60 = 529,0322… min */
  const r = B.evaluate('goal', s, sourceActivities, ctx);
  assert.equal(r.hourly, 93000); close(r.totalMinutes, 820000 / 93000 * 60);
  /* Quoi acheter d’abord ? attend avec le même gain net */
  assert.equal(B.orderInput(s, sourceActivities).hourly, 93000);
  /* Mon budget : 10 parties (horizon), chaque partie gagne 100 000 $ et dépense 7 000 $ */
  const x = B.analysis('budget', s, sourceActivities, ctx);
  assert.equal(x.flow.upkeep, 7000); assert.equal(x.flow.earn, 100000);
  /* Mon temps de jeu : la projection retire 7 000 $ par partie (parties qu’il reste) */
  const se = B.session(s, sourceActivities), pr = B.projection(s, sourceActivities, se);
  const s1 = base(); s1.goal.upkeepPerSession = 7000; const pr1 = B.projection(s1, sourceActivities, B.session(s1, sourceActivities));
  assert.deepEqual(pr, pr1, 'mêmes parties qu’il reste qu’avec 7 000 $ de dépenses écrites');
});

test('revenu passif simulé : ajouté au gain par heure, au plus son stock par partie (et dit sans parties)', () => {
  const s = base(); s.analysis.simulations['revenu-passif'] = true; Object.assign(s.analysis.sim['revenu-passif'], { parHeure: 10000, plafond: 6000 });
  /* parties de 60 min, stock 6 000 $ : taux effectif min(10 000 ; 6 000 × 60 ÷ 60) = 6 000 $/h → 106 000 $/h ;
     820 000 ÷ 106 000 × 60 = 464,1509… min */
  const hn = B.hourlyNet(s); assert.equal(hn.passive, 6000); assert.equal(hn.net, 106000);
  close(B.evaluate('goal', s, sourceActivities, ctx).totalMinutes, 820000 / 106000 * 60);
  const x = B.analysis('goal', s, sourceActivities, ctx).explain;
  assert.ok(x.values.some(v => v.label === 'Revenu passif (simulation)' && v.value.v === 6000 && /Au plus 6 000 \$ par partie \(stock maximum\) : 10 000 \$ par heure ramenés à 6 000 \$/.test(flat(v.text))));
  /* sans durée de partie : le stock ne s’applique pas → 10 000 $/h, et c’est dit */
  const t = B.copy(s); t.goal.dailyMinutes = null;
  assert.equal(B.hourlyNet(t).passive, 10000);
  assert.ok(B.analysis('goal', t, sourceActivities, ctx).explain.values.some(v => /Sans durée de partie, le stock maximum ne s’applique pas/.test(flat(v.text))));
  /* mode « à la fin de chaque mission » : pas compté, et c’est dit */
  const c = B.copy(s); c.model = 'cycles';
  assert.deepEqual(B.evaluate('goal', c, sourceActivities, ctx), (() => { const z = base(); z.model = 'cycles'; return B.evaluate('goal', z, sourceActivities, ctx); })());
  assert.match(texts(B.analysis('goal', c, sourceActivities, ctx).explain), /Ton revenu passif simulé compte en mode « petit à petit »/);
});

test('bonus simulé : chaque récompense × (1 + bonus ÷ 100) dans les calculs par missions', () => {
  /* exemple A : 25 000 $ de récompense, 2 500 $ de frais. Sans bonus : 820 000 ÷ 22 500 = 36,4 → 37 missions ;
     bonus 50 % : 37 500 − 2 500 = 35 000 $ net, 820 000 ÷ 35 000 = 23,4 → 24 missions */
  const s0 = base(); s0.model = 'cycles'; assert.equal(B.evaluate('goal', s0, sourceActivities, ctx).runs, 37);
  const s = B.copy(s0); s.analysis.simulations.bonus = true; s.analysis.sim.bonus.pourcentage = 50;
  assert.equal(B.evaluate('goal', s, sourceActivities, ctx).runs, 24);
  assert.equal(B.activities(s, sourceActivities).find(a => a.id === 'scenario-a').reward, 37500);
  assert.equal(s.activities.find(a => a.id === 'scenario-a').reward, 25000, 'le chiffre écrit par le joueur ne change pas');
  /* « petit à petit » : ton gain par heure écrit n’est pas changé, et c’est dit */
  const c = B.copy(s); c.model = 'continuous';
  close(B.evaluate('goal', c, sourceActivities, ctx).totalMinutes, 492);
  assert.match(texts(B.analysis('goal', c, sourceActivities, ctx).explain), /ton gain par heure écrit n’est pas changé/);
});

test('partage automatique : 100 ÷ joueurs pour une activité à plusieurs, jamais à la place d’une part publiée', () => {
  /* exemple B à 4 joueurs : part 25 % → 120 000 × 25 % − 10 000 = 20 000 $ net ; 820 000 ÷ 20 000 = 41 missions */
  const s = base(); s.model = 'cycles'; s.goal.players = 4; s.activities[1].players = 4; s.goal.selected = 'scenario-b'; s.analysis.shareAuto = true;
  const r = B.evaluate('goal', s, sourceActivities, ctx); assert.equal(r.runs, 41);
  const b = B.activities(s, sourceActivities).find(a => a.id === 'scenario-b'); assert.equal(b.share, 25); assert.equal(b.shareAuto, 4);
  assert.equal(s.activities[1].share, 100, 'la part écrite ne change pas');
  assert.match(texts(B.analysis('goal', s, sourceActivities, ctx).explain), /« Exemple B : missions longues » 25 % : part égale pour chaque joueur/);
  /* une part publiée (officielle) n’est jamais remplacée */
  const pub = [{ id: 'mission-p', name: 'P', reward: 100000, cost: 0, duration: 10, prep: 0, cooldown: 0, share: 60, investment: 0, players: 4, status: 'official', fieldMeta: { share: { status: 'official', source: 'x', verifiedAt: '2026-11-19' } } }];
  assert.equal(B.activities(s, pub).find(a => a.id === 'mission-p').share, 60);
});

test('argent d’un seul personnage : une mission jouée seulement avec l’autre est écartée, avec la raison ; à deux, comptée', () => {
  const src = [{ id: 'mission-l', name: 'Chez Lucia', reward: 50000, cost: 0, duration: 10, prep: 0, cooldown: 0, share: 100, investment: 0, players: 1, characters: ['lucia'] },
    { id: 'mission-d', name: 'À deux', reward: 50000, cost: 0, duration: 10, prep: 0, cooldown: 0, share: 100, investment: 0, players: 1, characters: ['jason', 'lucia'] }];
  const s = base(); s.model = 'cycles'; s.goal.selected = 'mission-l'; s.session.enabled.push('mission-l', 'mission-d');
  /* argent commun (défaut) : rien n’est écarté */
  assert.equal(B.evaluate('goal', s, src, ctx).valid, true);
  s.analysis.money = { split: 'separe', perso: 'jason' };
  const r = B.evaluate('goal', s, src, ctx);
  assert.equal(r.valid, false); assert.equal(flat(r.reason), '« Chez Lucia » est jouée avec Lucia : tu comptes seulement l’argent de Jason (Mes hypothèses en plus).');
  assert.ok(!B.eligible(s, src).some(a => a.id === 'mission-l')); assert.ok(B.eligible(s, src).some(a => a.id === 'mission-d'));
  assert.ok(B.analysis('session', s, src, ctx).activities.find(a => a.id === 'mission-l').reasons.includes('jouée avec Lucia : tu comptes seulement l’argent de Jason'));
  s.goal.selected = 'mission-d';
  assert.match(texts(B.analysis('goal', s, src, ctx).explain), /Mission à deux \(« À deux »\) : écris dans « Ma part » ce que touche Jason\./);
  /* Lucia : l’inverse */
  s.analysis.money.perso = 'lucia'; s.goal.selected = 'mission-l'; assert.equal(B.evaluate('goal', s, src, ctx).valid, true);
});

test('revendre ce que je possède déjà : la revente s’ajoute à l’argent de départ de Mon objectif (pas en « gains »)', () => {
  /* achat libre possédé, revente 100 000 $ : il manque 820 000 − 100 000 = 720 000 $ → 7,2 h = 432 min */
  const s = base(); s.assets[0].owned = true; s.assets[0].resale = 100000;
  close(B.evaluate('goal', s, sourceActivities, ctx).totalMinutes, 492);
  s.goal.resaleOwned = true;
  const r = B.evaluate('goal', s, sourceActivities, ctx);
  close(r.totalMinutes, 432); assert.equal(r.missing, 720000); assert.equal(r.resaleOwned, 100000);
  /* Mon temps de jeu part de la même somme */
  assert.equal(B.projection(s, sourceActivities, B.session(s, sourceActivities)).missingBefore, 720000);
  /* « ce que je vais gagner à partir de maintenant » : la revente n’est pas un gain */
  const c = B.copy(s); c.goal.meaning = 'cumulative'; const c0 = B.copy(c); c0.goal.resaleOwned = false;
  assert.equal(B.evaluate('goal', c, sourceActivities, ctx).totalMinutes, B.evaluate('goal', c0, sourceActivities, ctx).totalMinutes);
  assert.match(texts(B.analysis('goal', c, sourceActivities, ctx).explain), /elle ne compte pas comme un gain/);
  /* sans prix de revente écrit : rien ne change, et c’est dit */
  const z = base(); z.goal.resaleOwned = true;
  close(B.evaluate('goal', z, sourceActivities, ctx).totalMinutes, 492);
  assert.match(texts(B.analysis('goal', z, sourceActivities, ctx).explain), /aucun achat que tu possèdes n’a de prix de revente écrit/);
});

/* Plan de l’atelier (H.planWithMissions) : « Courses » (25 000 $, frais 2 500, 12 + 3 min, attente 5) et « Braquage » (120 000 $,
   frais 10 000, 40 + 10 min, attente 10, demande le garage), « Garage » 80 000 $, but « Ma voiture » 600 000 $, 100 000 $ en poche,
   parties de 90 min, 5 jours par semaine. */
test('business plan : « Compter aussi mes hypothèses en plus » (dépenses, revenu passif, bonus, partage, Jouée par)', () => {
  const s = H.planWithMissions(B, base());
  s.analysis.simulations.amendes = true; Object.assign(s.analysis.sim.amendes, { parPartie: 2, prix: 1000 });
  s.analysis.simulations['revenu-passif'] = true; Object.assign(s.analysis.sim['revenu-passif'], { parHeure: 2000, plafond: 3000 });
  s.analysis.simulations.bonus = true; s.analysis.sim.bonus.pourcentage = 10;
  const off = B.planInput(s);
  assert.equal(off.upkeepPerSession, 0); assert.equal(off.hourly, 0); assert.equal(off.passiveSim, undefined, 'option du plan décochée : rien n’est repris');
  assert.match(texts(B.analysis('plan', s, sourceActivities, ctx).explain), /Tes hypothèses en plus .* ne comptent pas dans le plan/);
  s.plan.useHypotheses = true;
  /* amendes 2 × 1 000 = 2 000 $ par partie ; revenu passif min(2 000 ; 3 000 × 60 ÷ 90 = 2 000) = 2 000 $/h ; bonus 10 % :
     25 000 → 27 500, 120 000 → 132 000 */
  const inp = B.planInput(s);
  assert.equal(inp.upkeepPerSession, 2000); assert.equal(inp.hourly, 2000); assert.equal(inp.passiveSim, 2000);
  assert.deepEqual(inp.activities.map(a => [a.id, Math.round(a.reward)]), [['m-a', 27500], ['m-b', 132000]]);
  const r = B.evaluate('plan', s, sourceActivities, ctx);
  assert.equal(r.valid, true); assert.equal(r.verification.ok, true);
  /* chaque partie : la part simulée du gain par heure est dite à part (2 000 × 90 ÷ 60 = 3 000 $, hors obtention) */
  assert.ok(r.sessions.every(se => Math.abs(se.simPart - 2000 * (90 - se.acquisitionMinutes) / 60) < 1e-6 && Math.abs(se.hourlyPart) < 1e-9));
  /* Jouée par : argent de Jason seulement, « Braquage » jouée avec Lucia → écartée ; « deux » gardée */
  s.analysis.money = { split: 'separe', perso: 'jason' }; s.plan.missions[1].who = 'lucia'; s.plan.missions[0].who = 'deux';
  const inp2 = B.planInput(s);
  assert.deepEqual(inp2.activities.map(a => a.id), ['m-a']); assert.deepEqual(inp2.excludedByCharacter, [{ id: 'm-b', name: 'Braquage', who: 'lucia' }]);
  /* partage : une mission à 2 joueurs (le groupe en a 2) compte 50 % */
  s.analysis.money.split = 'commun'; s.plan.missions[1].who = ''; s.plan.situation.players = 2; s.plan.missions[1].players = 2; s.analysis.shareAuto = true;
  assert.equal(B.planInput(s).activities.find(a => a.id === 'm-b').share, 50);
});

test('business plan : tentatives ratées (moyenne pour ce qui se refait, jusqu’à la réussite pour une seule fois ; 10 sur 10 refusé)', () => {
  const s = H.planWithMissions(B, base()); s.plan.includeFailure = true;
  /* sans « Tentatives ratées » dans Mes hypothèses : rien ne change, et c’est dit */
  assert.deepEqual(B.planInput(s).activities, (() => { const t = B.copy(s); t.plan.includeFailure = false; return B.planInput(t).activities; })());
  assert.match(texts(B.analysis('plan', s, sourceActivities, ctx).explain), /Tentatives ratées : coche et remplis « Tentatives ratées » dans Mes hypothèses/);
  s.analysis.simulations.echec = true; s.analysis.sim.echec.tentativesRatees = 2;
  /* k = 2 sur 10 : récompense × 0,8 (25 000 → 20 000 ; 120 000 → 96 000), frais et durée inchangés */
  const inp = B.planInput(s);
  assert.deepEqual(inp.activities.map(a => [a.id, a.reward, a.cost, a.duration]), [['m-a', 20000, 2500, 12], ['m-b', 96000, 10000, 40]]);
  /* une mission « une seule fois » : frais 10 000 ÷ 0,8 = 12 500, durée 40 ÷ 0,8 = 50, préparation 10 ÷ 0,8 = 12,5 ; récompense une fois */
  s.plan.missions[1].once = true;
  const o = B.planInput(s).activities.find(a => a.id === 'm-b');
  assert.deepEqual([o.reward, o.cost, o.duration, o.prep], [120000, 12500, 50, 12.5]);
  const r = B.evaluate('plan', s, sourceActivities, ctx); assert.equal(r.valid, true);
  assert.match(texts(B.analysis('plan', s, sourceActivities, ctx).explain), /Avec 2 tentatives ratées sur 10 : une mission qui se refait rapporte en moyenne 80 % de sa récompense ; une mission faite une seule fois coûte et dure en moyenne 1,25 fois plus/);
  /* k = 10 : refus clair */
  s.analysis.sim.echec.tentativesRatees = 10;
  const z = B.evaluate('plan', s, sourceActivities, ctx);
  assert.equal(z.valid, false);
  assert.equal(flat(z.reason), 'Avec 10 tentatives ratées sur 10, aucune mission ne réussit : le plan ne peut pas se faire. Baisse « Tentatives ratées sur 10 » dans Mes hypothèses, ou décoche « Compter les tentatives ratées » dans le plan.');
});

test('business plan : revente des achats d’avant après le but (argent à la fin, coût net ; temps inchangé)', () => {
  const s = H.planWithMissions(B, base()); s.plan.prerequisites[0].resale = 40000;
  const r0 = B.evaluate('plan', s, sourceActivities, ctx); assert.equal(r0.resaleAfterGoal, undefined, 'réglage décoché : rien');
  s.plan.resaleAfterGoal = true;
  const r = B.evaluate('plan', s, sourceActivities, ctx);
  /* garage acheté 80 000 $, revendu 40 000 $ : coût net 40 000 $ ; argent à la fin + 40 000 $ ; même nombre de parties */
  assert.equal(r.totalSessions, r0.totalSessions); assert.equal(r.finalCash, r0.finalCash);
  assert.deepEqual(r.resaleAfterGoal, { total: 40000, items: [{ id: 'p-g', name: 'Garage', resale: 40000 }], finalCashAfter: r0.finalCash + 40000, spent: 80000, netCost: 40000 });
  assert.match(texts(B.analysis('plan', s, sourceActivities, ctx).explain), /\+40 000 \$ en revendant « Garage » après le but/);
});

/* ---------- 3. Moteur : revenu hors ligne et R13 ---------- */
test('revenu hors ligne : pause du calendrier × taux, plafonds compris ; journal rejoué (R13)', () => {
  const base0 = { capital: 0, target: 100000, sessionMinutes: 60, daysPerWeek: 7, hourly: 10000, purchases: [], activities: [] };
  /* sans réglage : 10 000 $ par partie → 10 parties */
  const r0 = E.missionPlan(base0); assert.equal(r0.totalSessions, 10); assert.equal(r0.offlineTotal, undefined);
  /* revenu passif simulé 1 000 $/h, stock 5 000 $ : pause de 1 440 − 60 = 1 380 min → 23 000 $, plafonné à 5 000 $ avant chaque partie n ≥ 2.
     Après n parties : 10 000 n + 5 000 (n − 1) ≥ 100 000 → n = 7 (105 000 − 5 000 = 100 000) ; hors ligne en tout 6 × 5 000 = 30 000 $ */
  const r = E.missionPlan({ ...base0, offline: { cap: null, passiveHourly: 1000, passiveCap: 5000 } });
  assert.equal(r.totalSessions, 7); assert.equal(r.offlineTotal, 30000); assert.equal(r.finalCash, 100000);
  assert.deepEqual([r.sessions[0].offline, r.sessions[1].offline, r.sessions[1].offlineMinutes], [undefined, 5000, 1380]);
  const v = E.missionVerify(r); assert.equal(v.ok, true, JSON.stringify(v.violations));
  /* achat qui rapporte 2 000 $/h, obtenu en 30 min dans la partie 1 : pause 1 380 min → 46 000 $, plafond par pause 30 000 $ */
  const r2 = E.missionPlan({ ...base0, capital: 50000, hourly: 1000, target: 200000, purchases: [{ id: 'p1', name: 'Bureau', price: 40000, boostHourly: 2000, minutes: 30 }], offline: { cap: 30000, passiveHourly: 0, passiveCap: null } });
  assert.equal(r2.sessions[1].offline, 30000); assert.equal(E.missionVerify(r2).ok, true);
  /* cinq jours par semaine : la pause du week-end (avant la partie 6) dure 3 × 1 440 − 60 = 4 260 min → 4 260 × 1 000 ÷ 60 = 71 000 $ */
  const r3 = E.missionPlan({ ...base0, daysPerWeek: 5, hourly: 100, target: 300000, purchases: [{ id: 'p1', name: 'Bureau', price: 0, boostHourly: 1000, owned: true }], offline: { cap: null, passiveHourly: 0, passiveCap: null } });
  assert.deepEqual([r3.sessions[4].offlineMinutes, r3.sessions[5].offlineMinutes, r3.sessions[5].offline], [1380, 4260, 71000]);
  assert.equal(E.missionVerify(r3).ok, true);
  /* parcours sans parties : pas de pause, rien n’est crédité */
  const r4 = E.missionPlan({ ...base0, sessionMinutes: null, offline: { cap: null, passiveHourly: 1000, passiveCap: null } });
  assert.equal(r4.offlineTotal, undefined); assert.equal(r4.valid, true);
});

test('R13 : un revenu hors ligne faux, en trop, déplacé ou sans réglage est refusé', () => {
  const r = E.missionPlan({ capital: 0, target: 100000, sessionMinutes: 60, daysPerWeek: 7, hourly: 10000, offline: { cap: null, passiveHourly: 1000, passiveCap: 5000 } });
  const mut = f => { const c = JSON.parse(JSON.stringify(r)); f(c); return rules(E.missionVerify(c)); };
  /* montant changé (et argent final ajusté pour que seule R13 parle) */
  assert.deepEqual(mut(c => { const e = c.journal.find(x => x.offline); e.amount += 10; c.finalCash += 10; }), ['R13']);
  /* revenu hors ligne retiré */
  assert.ok(mut(c => { const i = c.journal.findIndex(x => x.offline); c.finalCash -= c.journal[i].amount; c.journal.splice(i, 1); }).includes('R13'));
  /* durée de pause fausse */
  assert.deepEqual(mut(c => { c.journal.find(x => x.offline).minutes = 1000; }), ['R13']);
  /* sans le réglage dans les règles du plan, aucun revenu hors ligne n’est permis */
  assert.ok(mut(c => { delete c.rules.offline; }).includes('R13'));
  /* le plan sans le réglage n’a aucun revenu hors ligne */
  const r0 = E.missionPlan({ capital: 0, target: 100000, sessionMinutes: 60, daysPerWeek: 7, hourly: 10000 });
  assert.ok(!r0.journal.some(e => e.offline)); assert.equal(E.missionVerify(r0).ok, true);
});

test('business plan : « Compter un revenu hors ligne » passe par le moteur et se vérifie ; la règle R13 a ses mots', () => {
  const s = H.planWithMissions(B, base()); s.plan.offline = { on: true, cap: 20000 };
  s.plan.prerequisites[0].boostHourly = 1000;
  const r = B.evaluate('plan', s, sourceActivities, ctx);
  assert.equal(r.valid, true); assert.equal(r.verification.ok, true); assert.ok(r.offlineTotal > 0);
  assert.deepEqual(r.input.offline, { cap: 20000, passiveHourly: 0, passiveCap: null });
  assert.match(texts(B.analysis('plan', s, sourceActivities, ctx).explain), /Revenu hors ligne \(simulation\) : \+.* en tout, gagnés pendant les pauses entre tes parties/);
  /* sans parties : dit, rien de compté */
  const t = B.copy(s); t.plan.situation.dailyMinutes = null;
  assert.match(texts(B.analysis('plan', t, sourceActivities, ctx).explain), /en parcours sans parties, il n’est pas compté/);
  assert.equal(flat(B.evaluate('plan', (() => { const z = B.copy(s); return z; })(), sourceActivities, ctx).valid), 'true');
});

/* ---------- 4. Sauvegardes au format v8.01 ---------- */
test('sauvegardes : un état et « Mes calculs » au format v8.01 se relisent, sans « non enregistré », avec les mêmes résultats', () => {
  const s = base(); s.model = 'cycles';
  /* format v8.01 : les cases du lot 2 n’existent pas */
  const old = B.copy(s);
  for (const k of ['amendes', 'mort', 'arrestation']) { delete old.analysis.simulations[k]; delete old.analysis.sim[k]; }
  delete old.analysis.sim.soin.vieParPartie; delete old.analysis.sim.soin.prixUnitaire; delete old.analysis.money; delete old.analysis.shareAuto; delete old.goal.resaleOwned;
  for (const k of ['useHypotheses', 'offline', 'includeFailure', 'resaleAfterGoal']) delete old.plan[k];
  const back = B.validate(JSON.parse(JSON.stringify(old)), initial);
  assert.equal(B.signature(back), B.signature(s), 'même signature : rien n’apparaît « non enregistré »');
  for (const tool of [...B.tools, 'plan']) assert.deepEqual(B.evaluate(tool, back, sourceActivities, ctx), B.evaluate(tool, s, sourceActivities, ctx), tool);
  /* carnet « Mes calculs » (format 3) qui contient cette sauvegarde : relu, actif, même signature que l’état relu */
  const N = require(path.join(root, 'calculateurs-notebooks.js'));
  assert.ok(N && typeof N.create === 'function', 'module des carnets');
  const store = new Map([[N.KEY, JSON.stringify({ version: 3, entries: [{ id: 'e1', tool: 'goal', name: 'Ancien calcul', createdAt: '2026-10-01', updatedAt: '2026-10-01', schemaVersion: 3, dataVersion: s.dataVersion, config: old, summary: '' }], active: { goal: 'e1' }, references: {} })]]);
  const book = N.create({ getItem: k => store.has(k) ? store.get(k) : null, setItem: (k, v) => store.set(k, v), removeItem: k => store.delete(k) }, c => B.validate(JSON.parse(JSON.stringify(c)), initial), () => {});
  const active = book.active('goal');
  assert.ok(active, 'le calcul enregistré est relu');
  assert.equal(B.signature(active.config), B.signature(back));
});

/* ---------- 5. Atelier (jsdom) ---------- */
test('atelier : les réglages en plus n’existent qu’en mode Expert, ne changent rien éteints, et se disent allumés', async () => {
  let load; try { require('jsdom'); ({ load } = require('./runtime-helper.cjs')); } catch (e) { return; }
  const p = await load(root, 'calculateurs.html'), d = p.d, w = p.w;
  try {
    assert.deepEqual(p.errors, []);
    const blk = d.getElementById('calc-hypotheses-plus');
    assert.ok(blk && blk.classList.contains('b-expert') && blk.classList.contains('b-hypotheses'), 'bloc « Mes hypothèses en plus » en Expert');
    assert.equal(blk.previousElementSibling.id, 'calc-hypotheses', 'juste après « Mes hypothèses »');
    /* chaque nouveau réglage est dans un élément b-expert (masqué en Simple et en Pas à pas) */
    for (const f of ['goal.resaleOwned', 'plan.useHypotheses', 'plan.includeFailure', 'plan.offline.on', 'plan.offline.cap', 'plan.resaleAfterGoal', 'analysis.money.split', 'analysis.shareAuto', 'analysis.simulations.amendes'])
      assert.ok(d.querySelector('[data-field="' + f + '"]').closest('.b-expert'), f);
    /* rien n’est coché */
    assert.ok([...blk.querySelectorAll('input[type=checkbox]')].every(i => !i.checked));
    assert.ok([...blk.querySelectorAll('[data-sim-fields]')].every(x => x.hidden));
    /* cocher les soins : leurs cases s’ouvrent ; écrire les chiffres change la réponse de Mon objectif et l’explication le dit */
    const fire = (el, type) => el.dispatchEvent(new w.Event(type, { bubbles: true }));
    const cb = d.querySelector('[data-field="analysis.simulations.soin"]'); cb.checked = true; fire(cb, 'change'); p.flush();
    assert.equal(blk.querySelector('[data-sim-fields="soin"]').hidden, false);
    for (const [id, v] of [['sim-soin-vieParPartie', '100'], ['sim-soin-points', '25'], ['sim-soin-prixUnitaire', '500']]) { const i = d.getElementById(id); i.value = v; fire(i, 'input'); }
    p.flush(); await new Promise(r => setTimeout(r, 30)); p.flush();
    assert.match(flat(d.getElementById('panel-goal').textContent), /Soins \(simulation\)|Dépenses simulées/);
    /* argent séparé : le choix du personnage n’apparaît qu’avec « L’argent d’un seul personnage » */
    const split = d.getElementById('money-split'), perso = d.querySelector('[data-field="analysis.money.perso"]').closest('[data-money-split]');
    assert.equal(perso.hidden, true); split.value = 'separe'; fire(split, 'change'); p.flush();
    assert.equal(perso.hidden, false);
    assert.deepEqual(p.errors, []);
  } finally { p.close && p.close(); }
});
