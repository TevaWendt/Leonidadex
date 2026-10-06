'use strict';
/* Calculateur, lot 2 : pages réelles dans jsdom, UNE page à la fois. Seules les zones dynamiques existantes sont lues
   (#plan-results, #plan-report, #session-results, #order-results, #calc-live, #expert-goal) ; aucun texte fixe, aucun
   contrôle n’est attendu en plus. Les valeurs attendues sont calculées à la main dans les commentaires (jamais par le code
   testé). Tous les montants sont FICTIFS. P1 à P7 = plan de tests de la spécification du lot 2 (§5.2). */
const test = require('node:test'), assert = require('node:assert/strict'), path = require('node:path');
const root = path.resolve(__dirname, '../..');
const B = require(path.join(root, 'calculateurs-scenario.js'));
const H = require('./check-ultime-helper.cjs');
const { load } = require('./runtime-helper.cjs');
const { D, catalogue, sourceActivities, presets } = H.siteData();
const initial = B.initial(H.dataVersion(D, catalogue, sourceActivities), presets);
const base = () => H.baseState(B, initial, catalogue);
const flat = s => String(s === undefined || s === null ? '' : s).replace(/[\s  ]+/g, ' ');
async function page(tool, s, storage = {}) { return load(root, 'calculateurs.html?tool=' + tool, { storage: { 'lk-calculator-v1': JSON.stringify(s), 'lk-calc-folds-v1': JSON.stringify({ all: true }), ...storage } }); }
const fire = (p, n, t) => n.dispatchEvent(new p.w.Event(t, { bubbles: true, cancelable: true }));
const text = (p, id) => { const n = p.d.getElementById(id); assert.ok(n, '#' + id + ' absent'); return flat(n.textContent); };
const stored = p => JSON.parse(p.w.localStorage.getItem('lk-calculator-v1'));
const set = (p, id, v) => { const el = p.d.getElementById(id); assert.ok(el, id); el.value = v; fire(p, el, el.tagName === 'SELECT' ? 'change' : 'input'); p.flush(); };
const mode = (p, m) => { const b = p.d.querySelector('.calc-mode-switch [data-mode="' + m + '"]'); assert.ok(b, 'mode ' + m); fire(p, b, 'click'); p.flush(); };
// aucune erreur JavaScript, aucun « NaN / Infinity / undefined / null » dans le panneau visible ; puis fermeture
const clean = p => { const errors = p.errors.slice(), panel = flat(p.d.querySelector('.calc-panel:not([hidden])')?.textContent || ''); p.close(); assert.deepEqual(errors, []); assert.doesNotMatch(panel, /NaN|Infinity|undefined|\bnull\b/); };
function planState(goal, situation, extra = {}) {
  const s = base(); s.tab = 'plan'; s.plan = B.copy(B.planTemplate);
  s.plan.goal = { ...s.plan.goal, kind: 'amount', meaning: 'available', ...goal };
  s.plan.situation = { ...s.plan.situation, dailyMinutes: 60, daysPerWeek: 7, ...situation };
  Object.assign(s.plan, extra); return B.validate(s, initial);
}

test('P1 plan, scénario H (parties de 60 min) : « tu y arrives en 7 parties », B acheté après la partie 2, plus de « Bonne nouvelle »', async () => {
  // 90 000, 10 000 de côté, but 50 000 disponibles, 10 000 $/h ; A 30 000 avant la partie 1 ; p2 : 80 000 → B (70 000) → 10 000 ; p3–p7 → 60 000 : 7 parties
  const s = planState({ target: 50000 }, { capital: 90000, reserve: 10000, hourly: 10000 }, { strategy: 'asIs',
    prerequisites: [{ ...B.copy(B.planPrereqTemplate), id: 'p-a', name: 'A', price: 30000 }, { ...B.copy(B.planPrereqTemplate), id: 'p-b', name: 'B', price: 70000, requires: ['p-a'] }] });
  const p = await page('plan', s);
  const res = text(p, 'plan-results'), rep = text(p, 'plan-report');
  assert.match(res, /tu y arrives en 7 parties/); assert.doesNotMatch(res, /Bonne nouvelle/);
  assert.match(rep, /Après la partie 2 : achète « B »/);
  clean(p);
});

test('P2 plan, 50 M à 1 000 $/h sans réserve : refus chiffré (400 parties, il manquerait 49 600 000 $), sans « 0 $ de côté » ni bouton de priorité', async () => {
  // 400 parties × 1 000 $ = 400 000 ; 50 000 000 − 400 000 = 49 600 000
  const p = await page('plan', planState({ target: 50000000 }, { capital: 0, reserve: 0, hourly: 1000 }));
  const res = text(p, 'plan-results');
  assert.match(res, /400 parties/); assert.match(res, /49 600 000 \$/); assert.doesNotMatch(res, /0 \$ de côté/);
  assert.ok(![...p.d.querySelectorAll('#plan-results button')].some(b => /Choisir « Le plus vite possible »/.test(flat(b.textContent))), 'aucun bouton de priorité hors sujet');
  clean(p);
});

test('P3 plan, dépenses par partie (3 000 $) au-dessus de ce que rapporte la partie (2 000 $) : refus nommé dans #plan-results', async () => {
  const s = planState({ target: 100000 }, { capital: 50000, reserve: 0, hourly: null, upkeepPerSession: 3000 }, { source: 'missions', missions: [{ ...B.copy(B.planMissionTemplate), id: 'm-1', name: 'Lente', reward: 2000, cost: 0, duration: 60 }] });
  const p = await page('plan', s);
  const res = text(p, 'plan-results');
  assert.match(res, /3 000 \$/); assert.match(res, /2 000 \$/); assert.doesNotMatch(res, /ne rentre/);
  clean(p);
});

test('P4 Mon temps de jeu, état CALC-02 + 1 000 $ de dépenses par partie : 711 000 $, encore 7 parties, 9 jours — même chiffre en Simple et en Expert', async () => {
  // partie B 110 000 → 310 000 ; après = 1 000 000 − (310 000 − 1 000 − 20 000) = 711 000 ; ⌈711 000 ÷ 109 000⌉ = 7 ; 7 parties à 5 j/sem → 9 jours
  const s = base(); s.tab = 'session'; s.goal.upkeepPerSession = 1000;
  const p = await page('session', s);
  const res = text(p, 'session-results');
  assert.match(res, /711 000 \$/); assert.match(res, /Encore 7 parties/); assert.match(res, /9 jours/);
  const seen = [];
  for (const m of ['quick', 'advanced']) { mode(p, m); const n = p.d.querySelector('#session-results [data-c-number="session-count"]'); assert.ok(n, 'compteur de parties en mode ' + m); seen.push(flat(n.textContent).trim()); }
  assert.deepEqual(seen, ['7', '7']);
  assert.match(text(p, 'session-results'), /711 000 \$/);
  clean(p);
});

test('P5 Quoi acheter d’abord ?, même état : « 4 h 34 » et « Joue encore 43 min » ; sens « en tout » → « 980 000 $ à gagner »', async () => {
  // Emperor : (250 000 + 20 000 − 200 000) ÷ 99 000 = 0,7071 h → 43 min ; Primo : 400 000 ÷ 104 000 = 3,8462 h ; total 4,5532 h → 4 h 34
  const s = base(); s.tab = 'order'; s.goal.upkeepPerSession = 1000;
  const p = await page('order', s);
  const res = text(p, 'order-results');
  assert.match(res, /4 h 34/); assert.match(res, /Joue encore 43 min/);
  clean(p);
  // « en tout » : 1 000 000 − 20 000 de côté = 980 000 à gagner après les achats (il reste alors 20 000, l’argent de côté)
  const h = base(); h.tab = 'order'; h.goal.upkeepPerSession = 1000; h.goal.meaning = 'held';
  const q = await page('order', h);
  assert.match(text(q, 'order-results'), /980 000 \$ à gagner/);
  clean(q);
});

test('P6 sauvegarde v6 calculée sous la version 1 : notification « corrigées depuis ta dernière visite », sauvegarde réécrite 2 / null, silence au rechargement', async () => {
  const raw = { ...base(), modelVersion: 1 }; delete raw.modelUpgradedFrom;
  const p = await page('goal', raw);
  assert.match(text(p, 'calc-live'), /corrigées depuis ta dernière visite/);
  set(p, 'f-goal-capital', '210000');
  const after = stored(p); assert.equal(after.modelVersion, 2); assert.equal(after.modelUpgradedFrom, null); assert.equal(after.goal.capital, 210000, 'la saisie est gardée');
  clean(p);
  const q = await page('goal', after);
  assert.doesNotMatch(text(q, 'calc-live'), /corrigées/);
  assert.equal(stored(q).modelVersion, 2); assert.equal(stored(q).modelUpgradedFrom, null);
  clean(q);
});

test('P7 mode Expert de Mon objectif avec une référence de carnet calculée sous la version 1 : note « version 1 → 2 », aucun mot interdit dans le panneau', async () => {
  const cfg = { ...base(), modelVersion: 2, modelUpgradedFrom: 1 };
  const notebooks = { version: 3, entries: [{ id: 'ref-1', tool: 'goal', name: 'Ancien calcul', createdAt: '2026-09-01T10:00:00.000Z', updatedAt: '2026-09-01T10:00:00.000Z', schemaVersion: 3, dataVersion: cfg.dataVersion, config: cfg, summary: 'Mon objectif · 8 h' }], active: {}, references: { goal: 'ref-1' } };
  const s = base(); s.tab = 'goal'; s.views.goal = 'advanced'; s.mode = 'advanced';
  const p = await page('goal', s, { 'lk-calculator-notebooks-v3': JSON.stringify(notebooks) });
  const xg = text(p, 'expert-goal');
  assert.match(xg, /version 1 → 2/);
  // Les mots interdits de v747 sont contrôlés sur le panneau Expert, là où la note nouvelle est rendue : « Horizon : … » est une
  // étiquette de base du bloc « Ce qui compte » de #goal-results (calculateurs-workspace.js, .b-explain-horizon, antérieure au lot 2,
  // texte fixe généré, hors périmètre) que #panel-goal contient dès qu’un résultat est affiché (réconciliation lot 2 ; la spec §5.2
  // visait #panel-goal). La phrase nouvelle elle-même est contrôlée à part.
  assert.doesNotMatch(xg, /\bcapital\b|\bmoteur\b|\bHorizon\b|\bPrérequis\b/);
  const note = [...p.d.querySelectorAll('#expert-goal .calc-note')].map(n => flat(n.textContent)).find(t => /version 1 → 2/.test(t));
  assert.ok(note, 'note de version dans une .calc-note du panneau Expert');
  assert.doesNotMatch(note, /\bcapital\b|\bmoteur\b|\bHorizon\b|\bPrérequis\b/);
  // sans référence calculée sous l’ancienne version : pas de note
  clean(p);
  const q = await page('goal', s, { 'lk-calculator-notebooks-v3': JSON.stringify({ ...notebooks, entries: [{ ...notebooks.entries[0], config: { ...cfg, modelUpgradedFrom: null } }] }) });
  assert.doesNotMatch(text(q, 'expert-goal'), /version 1 → 2/);
  clean(q);
});

/* ---------- correctifs de la revue contradictoire du lot 2 (tour 1) : REG-3, REG-2 / PER-2 ---------- */
test('P8 ouvrir un calcul enregistré sous la version 1 (carnet) : sauvegarde principale réécrite 2 / null, silence au rechargement ; l’entrée du carnet garde sa version', async () => {
  // la sauvegarde principale est à jour ; l’entrée e1 a été calculée sous la version 1 (modelVersion 1, sans modelUpgradedFrom) : 200 000 → 800 000
  const live = base(); live.tab = 'goal';
  const old = { ...base(), modelVersion: 1, name: 'Ancien objectif' }; delete old.modelUpgradedFrom; old.goal = { ...old.goal, target: 800000 };
  const notebooks = { version: 3, entries: [{ id: 'e1', tool: 'goal', name: 'Ancien objectif', createdAt: '2026-09-01T10:00:00.000Z', updatedAt: '2026-09-01T10:00:00.000Z', schemaVersion: 3, dataVersion: old.dataVersion, config: old, summary: 'objectif 800 000' }], active: {}, references: {} };
  const p = await page('goal', live, { 'lk-calculator-notebooks-v3': JSON.stringify(notebooks) });
  assert.doesNotMatch(text(p, 'calc-live'), /corrigées/);
  p.w.confirm = () => true;
  const b = p.d.querySelector('[data-b-load="e1"]'); assert.ok(b, 'bouton d’ouverture de l’entrée'); fire(p, b, 'click'); p.flush();
  assert.match(text(p, 'calc-live'), /est ouvert/); assert.doesNotMatch(text(p, 'calc-live'), /corrigées/);
  // le calcul ouvert est recalculé avec les règles actuelles : (800 000 + 20 000 − 200 000) ÷ 100 000 = 6,2 h → « 6 h 12 »
  assert.match(text(p, 'goal-results'), /6 h 12/);
  const st = stored(p); assert.equal(st.modelVersion, 2); assert.equal(st.modelUpgradedFrom, null, 'sauvegarde principale à jour (avant : 1, rejoué au rechargement)'); assert.equal(st.goal.target, 800000);
  const nb = JSON.parse(p.w.localStorage.getItem('lk-calculator-notebooks-v3')); assert.equal(nb.entries[0].config.modelVersion, 2); assert.equal(nb.entries[0].config.modelUpgradedFrom, 1, 'l’entrée du carnet garde « calculé sous la version 1 »');
  clean(p);
  const q = await page('goal', st, { 'lk-calculator-notebooks-v3': JSON.stringify(nb) });
  assert.doesNotMatch(text(q, 'calc-live'), /corrigées/);
  assert.equal(stored(q).modelUpgradedFrom, null);
  clean(q);
});

test('P9 plan, but à 0 $ qui rapporte 20 000 $/h : aucun remboursement annoncé (ni « ? », ni « — », ni « 0 min ») dans #plan-results et #plan-report', async () => {
  // prix 0 : aucun délai fini (C6 : jamais « 0 h ») ; le but est déjà possible avec 100 000 $ ; le gain du but arrive après le but
  const s = planState({ kind: 'purchase', name: 'Truc', price: 0, boostHourly: 20000 }, { capital: 100000, reserve: 0, hourly: 50000, daysPerWeek: 5 });
  s.views.plan = 'advanced'; s.mode = 'advanced';
  const p = await page('plan', s);
  const res = text(p, 'plan-results'), rep = text(p, 'plan-report');
  assert.doesNotMatch(res + ' ' + rep, /remboursé après (\?|—|0 min)/);
  assert.match(res, /arrive après le but/); assert.doesNotMatch(res, /\(remboursé après/);
  assert.doesNotMatch(rep, /de plus par heure/, 'but déjà possible : aucune carte « Objectif atteint »');
  clean(p);
  // le même but derrière un achat d’avant « Outil » à 150 000 $ : p1 → 100 000 + 50 000 = 150 000 → Outil après la partie 1 → 0 $ ; but à 0 $ atteint : 1 partie ;
  // la carte « Objectif atteint » annonce le gain du but sans remboursement (« 20 000 $ de plus par heure. », ni « — », ni « 0 min »)
  const t = planState({ kind: 'purchase', name: 'Truc', price: 0, boostHourly: 20000 }, { capital: 100000, reserve: 0, hourly: 50000, daysPerWeek: 5 }, { strategy: 'asIs', prerequisites: [{ ...B.copy(B.planPrereqTemplate), id: 'p-1', name: 'Outil', price: 150000 }] });
  t.views.plan = 'advanced'; t.mode = 'advanced';
  const q = await page('plan', t);
  const res2 = text(q, 'plan-results'), rep2 = text(q, 'plan-report');
  assert.match(res2, /tu y arrives en 1 partie/);
  assert.match(rep2, /20 000 \$ de plus par heure\./); assert.doesNotMatch(res2 + ' ' + rep2, /remboursé après (\?|—|0 min)/); assert.doesNotMatch(rep2, /de plus par heure : remboursé/);
  clean(q);
});

/* ---------- Correctifs du tour 2 de la revue contradictoire (pages) : REG2-1, PER2-1, ARI2-2 ---------- */
test('REG2-1 plan, scénario H : « il te manque 70 000 $ » (achats d’avant compris), jamais « 0 $ » à côté de 7 parties', async () => {
  // 50 000 + 10 000 de côté + (30 000 + 70 000) d’achats d’avant − 90 000 = 70 000 $ = 7 parties × 10 000 $/h × 1 h ; cible affichée 160 000 $ (inchangée)
  const s = planState({ target: 50000 }, { capital: 90000, reserve: 10000, hourly: 10000 }, { strategy: 'asIs',
    prerequisites: [{ ...B.copy(B.planPrereqTemplate), id: 'p-a', name: 'A', price: 30000 }, { ...B.copy(B.planPrereqTemplate), id: 'p-b', name: 'B', price: 70000, requires: ['p-a'] }] });
  const p = await page('plan', s); const res = text(p, 'plan-results');
  assert.match(res, /il te manque 70 000 \$/); assert.doesNotMatch(res, /il te manque 0 \$/); assert.match(res, /tu y arrives en 7 parties/); assert.match(res, /Cible : 160 000 \$/);
  clean(p);
});

test('PER2-1 plan, « Ta prochaine partie » : part de l’argent après l’achat d’avant-partie (20 000 → 175 000 $), « Achète d’abord : Garage », jamais 255 000 $', async () => {
  // état planWithMissions : 100 000 $, Garage 80 000 payé avant la partie 1 (→ 20 000) ; partie 1 (90 min) : Braquage ×1 (+120 000 − 10 000) + Courses ×2 (+2 × (25 000 − 2 500))
  // = +155 000 → 175 000 $. Avant : « Tu passes de 100 000 $ à 255 000 $. Puis achète : Garage » (un solde qui n’existe à aucun instant du journal).
  const s0 = H.planWithMissions(B, base()); s0.tab = 'plan'; const s = B.validate(s0, initial);
  const p = await page('plan', s); const res = text(p, 'plan-results');
  assert.match(res, /Ta prochaine partie \(1 h 30\)/); assert.match(res, /Achète d’abord : Garage → il te reste 20 000 \$\. Tu passes de 20 000 \$ à 175 000 \$\./);
  assert.doesNotMatch(res, /255 000|Puis achète/);
  clean(p);
});

test('ARI2-2 plan, tableau des stratégies : une stratégie qui retire un achat d’avant nomme l’achat (« un achat (Hangar) »), jamais un identifiant', async () => {
  // asIs : 100 000 − 20 000 − 50 000 = 30 000, +60 000 par partie (50 000 + 10 000 de l’Avion) → 5 parties, 330 000 $ ; « Seulement les achats qui rapportent » retire Hangar
  const s = planState({ target: 300000 }, { capital: 100000, reserve: 0, hourly: 50000 }, { strategy: 'auto',
    prerequisites: [{ ...B.copy(B.planPrereqTemplate), id: 'p-1', name: 'Hangar', price: 20000, boostHourly: 0 }, { ...B.copy(B.planPrereqTemplate), id: 'p-2', name: 'Avion', price: 50000, boostHourly: 10000, requires: ['p-1'] }] });
  const p = await page('plan', s); const res = text(p, 'plan-results'), rep = text(p, 'plan-report');
  assert.match(res, /tu y arrives en 5 parties/); assert.match(rep, /un achat \(Hangar\)/); assert.doesNotMatch(rep + res, /\bp-\d|Référence absente/);
  clean(p);
});

/* ---------- Correctifs du tour 3 de la revue contradictoire (pages) : PER3-1, PER3-2 ---------- */
test('PER3-1 plan refusé par le moteur sans case à corriger (50 M à 1 000 $/h) : l’action suivante dit de changer un chiffre, jamais « la case indiquée » ; un chiffre effacé rend « Corrige la case indiquée »', async () => {
  // 400 parties × 1 000 $ = 400 000 : refus chiffré, planMissing null, aucun bouton → « Change un chiffre du plan … » sous le titre fixe « Pour avoir ton programme »
  const p = await page('plan', planState({ target: 50000000 }, { capital: 0, reserve: 0, hourly: 1000 }));
  const next = () => flat(p.d.querySelector('#plan-results .calc-next-action p')?.textContent || '');
  assert.match(text(p, 'plan-results'), /400 parties/); assert.equal(flat(p.d.querySelector('#plan-results .calc-next-action strong')?.textContent || ''), 'Pour avoir ton programme', 'titre fixe inchangé');
  assert.equal(next(), 'Change un chiffre du plan (but, durée des parties, missions ou achats d’avant) : il se recalcule tout seul, partie par partie.');
  assert.equal(p.d.querySelectorAll('#plan-results button').length, 0, 'aucun bouton vers une case');
  // gain par heure effacé → « Écris ce que tu gagnes par heure… » (planMissing) : l’action d’avant, avec sa case
  set(p, 'plan-hourly', ''); assert.match(text(p, 'plan-results'), /ce que tu gagnes par heure/); assert.match(next(), /Corrige la case indiquée/); assert.doesNotMatch(next(), /Change un chiffre du plan/);
  clean(p);
});

test('PER3-2 ouvrir un calcul enregistré sous la version 1 (carnet) : le message d’ouverture dit une fois « version 1 → 2 », sauvegarde principale 2 / null, l’entrée garde 1 ; une entrée à jour n’a pas la mention', async () => {
  // entrée e1 calculée sous la version 1 (modelVersion 1, sans modelUpgradedFrom) ; entrée e2 à jour (2 / null)
  const live = base(); live.tab = 'goal';
  const old = { ...base(), modelVersion: 1, name: 'Ancien objectif' }; delete old.modelUpgradedFrom; old.goal = { ...old.goal, target: 800000 };
  const fresh = { ...base(), name: 'Objectif récent' }; fresh.goal = { ...fresh.goal, target: 900000 };
  const entry = (id, name, config, summary) => ({ id, tool: 'goal', name, createdAt: '2026-09-01T10:00:00.000Z', updatedAt: '2026-09-01T10:00:00.000Z', schemaVersion: 3, dataVersion: config.dataVersion, config, summary });
  const notebooks = { version: 3, entries: [entry('e1', 'Ancien objectif', old, 'objectif 800 000'), entry('e2', 'Objectif récent', fresh, 'objectif 900 000')], active: {}, references: {} };
  const p = await page('goal', live, { 'lk-calculator-notebooks-v3': JSON.stringify(notebooks) });
  p.w.confirm = () => true;
  const b = p.d.querySelector('[data-b-load="e1"]'); assert.ok(b, 'bouton d’ouverture de e1'); fire(p, b, 'click'); p.flush();
  assert.equal(text(p, 'calc-live').trim(), '« Ancien objectif » est ouvert. Les règles de calcul ont changé depuis cet enregistrement (version 1 → 2) : certains résultats peuvent changer. Tes chiffres sont gardés.');
  assert.match(text(p, 'goal-results'), /6 h 12/); // (800 000 + 20 000 − 200 000) ÷ 100 000 = 6,2 h
  const st = stored(p); assert.equal(st.modelVersion, 2); assert.equal(st.modelUpgradedFrom, null); assert.equal(st.goal.target, 800000);
  const nb = JSON.parse(p.w.localStorage.getItem('lk-calculator-notebooks-v3')); assert.equal(nb.entries[0].config.modelUpgradedFrom, 1, 'l’entrée du carnet garde « calculé sous la version 1 »');
  const b2 = p.d.querySelector('[data-b-load="e2"]'); assert.ok(b2, 'bouton d’ouverture de e2'); fire(p, b2, 'click'); p.flush();
  assert.equal(text(p, 'calc-live').trim(), '« Objectif récent » est ouvert.'); assert.equal(stored(p).goal.target, 900000);
  clean(p);
});

test('REG4-2 « Le parcours, dans l’ordre » (parcours long) : la ligne « … et N étapes de plus » porte l’étiquette « … », jamais « Faire » ; les vraies étapes gardent « Faire »', async () => {
  // 5 000 $, sans gain par heure ni durée de partie, 3 missions avec attente (Alpha 9 000 − 500 en 8 min, attente 20 ; Bêta 8 000 − 400 en 7 min, attente 20 ; Gamma 3 000 − 100 en 5 min),
  // achats d’avant Un (30 000, +1 000 $/h) → Deux (40 000, 15 min) → Trois (50 000, +2 000 $/h), but 900 000 $ : bien plus de 24 étapes de route → une ligne de suite (list.length − 24)
  const M = (id, name, reward, cost, duration, cooldown) => ({ ...B.copy(B.planMissionTemplate), id, name, reward, cost, duration, prep: 0, cooldown, share: 100, investment: 0, players: 1 });
  const s = planState({ target: 900000, meaning: 'available' }, { capital: 5000, reserve: 0, hourly: 0, dailyMinutes: null, daysPerWeek: 5 }, { source: 'missions', strategy: 'asIs',
    missions: [M('m-a', 'Alpha', 9000, 500, 8, 20), M('m-b', 'Bêta', 8000, 400, 7, 20), M('m-c', 'Gamma', 3000, 100, 5, 0)],
    prerequisites: [{ ...B.copy(B.planPrereqTemplate), id: 'p-1', name: 'Un', price: 30000, boostHourly: 1000 }, { ...B.copy(B.planPrereqTemplate), id: 'p-2', name: 'Deux', price: 40000, minutes: 15, requires: ['p-1'] }, { ...B.copy(B.planPrereqTemplate), id: 'p-3', name: 'Trois', price: 50000, boostHourly: 2000, requires: ['p-2'] }] });
  const r = B.evaluate('plan', s); assert.equal(r.valid, true, r.reason); assert.ok((r.route || []).length > 24, 'parcours long : ' + (r.route || []).length + ' étapes');
  const p = await page('plan', s);
  const steps = [...p.d.querySelectorAll('#plan-report .c-chain-step')]; assert.ok(steps.length > 20, 'chaîne rendue');
  const more = steps.filter(el => /étapes de plus/.test(el.textContent)); assert.equal(more.length, 1, 'une ligne de suite');
  const kind = flat(more[0].querySelector('.c-chain-k').textContent); assert.equal(kind, '…'); assert.match(flat(more[0].textContent), /… et \d+ étapes de plus/); assert.doesNotMatch(flat(more[0].textContent), /Faire/);
  assert.ok(steps.some(el => flat(el.querySelector('.c-chain-k').textContent) === 'Faire' && /Bêta|Alpha|Gamma/.test(el.textContent)), 'les vraies étapes gardent « Faire »');
  clean(p);
});

/* ---------- Correctifs du tour 5 de la revue contradictoire (pages) : PER5-1, ARI5-6 ---------- */
test('PER5-1 plan, but « gagné à partir de maintenant » avec un achat d’avant impayé : « il te manque 80 000 $ » (achat compris, cohérent avec les 8 parties), jamais « 10 000 $ » ; parcours : 8 h', async () => {
  // 20 000 $, 10 000 $/h, parties de 60 min, gagner 10 000 ; Hangar 100 000 : il faut 100 000 − 20 000 = 80 000 pour le payer, après quoi 80 000 gagnés ≥ 10 000 → 8 parties (Hangar après la partie 8, 0 $) ;
  // manque au départ = max(0, 10 000, 100 000 + 0 − 20 000) = 80 000 (formule C2.4 sur l’état initial, lue du moteur) ; avant : « il te manque 10 000 $ » à côté de « 8 parties » (formule dupliquée dans la vue)
  const pre = [{ ...B.copy(B.planPrereqTemplate), id: 'p-h', name: 'Hangar', price: 100000 }];
  const s = planState({ target: 10000, meaning: 'cumulative' }, { capital: 20000, reserve: 0, hourly: 10000 }, { strategy: 'asIs', prerequisites: pre });
  const p = await page('plan', s); const res = text(p, 'plan-results');
  assert.match(res, /il te manque 80 000 \$/); assert.doesNotMatch(res, /il te manque 10 000 \$/); assert.match(res, /tu y arrives en 8 parties/);
  clean(p);
  // parcours (sans durée de partie) : même somme ; 80 000 à 10 000 $/h = 8 h de jeu
  const f = planState({ target: 10000, meaning: 'cumulative' }, { capital: 20000, reserve: 0, hourly: 10000, dailyMinutes: null }, { strategy: 'asIs', prerequisites: pre });
  const q = await page('plan', f); const r2 = text(q, 'plan-results');
  assert.match(r2, /il te manque 80 000 \$/); assert.doesNotMatch(r2, /il te manque 10 000 \$/); assert.match(r2, /tu y arrives en 8 h/);
  clean(q);
});

test('ARI5-6 plan, « Mettre à jour mon plan » en parcours long (journal complet, courbe échantillonnée) : la prévision enregistrée est l’argent du journal (5 100 000 $), pas la lecture de la courbe (5 085 000 $)', async () => {
  // 0 $, sans gain par heure ni durée de partie, « Vite » 5 000 $ en 1 min, but 10 000 000 : 2 000 missions = 2 000 événements (> 600 : courbe échantillonnée, k = ⌈2 000 ÷ 600⌉ = 4, missions 1, 5, 9, …).
  // Après 1 020 min joués : 1 020 missions × 5 000 = 5 100 000 $ (journal). La courbe gardait la mission 1 017 (5 085 000 $) et tenait ce palier jusqu’à la mission 1 021 : 15 000 $ d’écart lus comme « prévu ».
  const E = require(path.join(root, 'calculateurs-engine.js'));
  const s = planState({ target: 10000000, meaning: 'available' }, { capital: 0, reserve: 0, hourly: null, dailyMinutes: null }, { source: 'missions', strategy: 'asIs', missions: [{ ...B.copy(B.planMissionTemplate), id: 'm-v', name: 'Vite', reward: 5000, cost: 0, duration: 1 }] });
  const r = B.evaluate('plan', s); assert.equal(r.valid, true, r.reason); assert.equal(r.continuous, true); assert.equal(r.events.length, 2000); assert.equal(r.journalComplete, true); assert.equal(E.missionCurve(r).sampled, true);
  assert.equal(E.planCashAt({ points: B.planCurve(r).map(pt => ({ hours: pt.hours, cash: pt.cash })), hours: 17 }).cash, 5085000, 'lecture de la courbe échantillonnée (l’ancienne prévision)');
  const p = await page('plan', s);
  set(p, 'plan-actual', '5100000'); set(p, 'plan-actual-minutes', '1020');
  const b = p.d.querySelector('[data-b-plan-log]'); assert.ok(b, 'bouton « Mettre à jour mon plan »'); fire(p, b, 'click'); p.flush();
  const log = stored(p).plan.log; assert.equal(log.length, 1); assert.equal(log[0].forecast, 5100000); assert.equal(log[0].minutes, 1020); assert.equal(log[0].capital, 5100000);
  clean(p);
});

/* ---------- Correctif du tour 6 de la revue contradictoire (pages) : REG6-1 ---------- */
test('REG6-1 plan, partie à gain négatif : un seul signe (« −2 000 $ », « −100 000 $ »), jamais « +-… » — prochaine partie, carte de phase, programme complet, bilan et tableau des mises à jour', async () => {
  // (b) 300 000 $, réserve 0, but 100 000 $ disponibles, « Achat P » 100 000 $ à obtenir en 90 min avec 2 000 $ de coût d’usage par partie, « Courte » 3 000 $ / 10 min, parties de 60 min :
  // P payé avant la partie 1 (300 000 − 100 000 = 200 000) ; partie 1 = obtention seule (60 min), coût d’usage 2 000 → gain −2 000 (198 000) ; partie 2 : 30 min d’obtention puis
  // Courte ×3 = 9 000 − 2 000 = +7 000 (205 000), P possédé → 2 parties. Avant : « Joue 1 h : environ +-2 000 $. » et « Par partie +-2 000 $ » (« + » codé en dur devant le signe moins).
  const s = planState({ target: 100000, meaning: 'available' }, { capital: 300000, reserve: 0, hourly: 0, dailyMinutes: 60 }, { source: 'missions', strategy: 'asIs',
    missions: [{ ...B.copy(B.planMissionTemplate), id: 'k', name: 'Courte', reward: 3000, cost: 0, duration: 10 }],
    prerequisites: [{ ...B.copy(B.planPrereqTemplate), id: 'p', name: 'Achat P', price: 100000, minutes: 90, usagePerSession: 2000 }] });
  s.views.plan = 'advanced'; s.mode = 'advanced';
  const r = B.evaluate('plan', s); assert.equal(r.valid, true, r.reason); assert.equal(r.totalSessions, 2); assert.equal(r.sessions[0].gain, -2000); assert.equal(r.sessions[1].gain, 7000);
  const p = await page('plan', s); const res = text(p, 'plan-results'), rep = text(p, 'plan-report');
  // correctif lot 2 (revue 7) : la partie 1 n’est qu’obtention (60 min) : la prochaine partie le dit (« Commence par obtenir… ») au lieu de « Joue 1 h : environ −2 000 $ » ;
  // les 2 000 $ de coût d’usage restent visibles : 200 000 → 198 000 $, « Par partie −2 000 $ », ligne du tableau « obtenir « Achat P » (1 h) −2 000 $ 198 000 $ »
  assert.match(res, /Commence par obtenir « Achat P » \(1 h\)\./); assert.match(res, /Tu passes de 200 000 \$ à 198 000 \$/); assert.match(rep, /Par partie ?−2 000 \$/); assert.match(rep, /Partie 1 · jour 1 ?obtenir « Achat P » \(1 h\) ?−2 000 \$ ?198 000 \$/);
  assert.match(rep, /Partie 2 · jour 2 ?obtenir « Achat P » \(30 min\), Courte ×3 ?\+7 000 \$ ?205 000 \$/); // la partie 2 finit l’obtention (30 min) avant les missions assert.doesNotMatch(res + ' ' + rep, /\+[-−]|[-−]\+/, 'double signe');
  clean(p);
  // (a) + (c) 500 000 $, réserve 0, but 1 000 000 $ disponibles, « M » 100 000 $ / 60 min / achat de départ 200 000 $ (ARI5-4) : partie 1 = −200 000 + 100 000 = −100 000 (400 000),
  // puis +100 000 par partie : 400 000 + 6 × 100 000 = 1 000 000 → 7 parties. « Mettre à jour mon plan » avec 410 000 $ après 60 min : prévu −100 000, réel 410 000 − 500 000 = −90 000,
  // écart −90 000 − (−100 000) = +10 000 → « Prévu −100 000 $ · Réel −90 000 $ · Écart +10 000 $ » (avant : « Prévu +-100 000 $ · Réel +-90 000 $ ») ; le tableau des mises à jour de même.
  const t = planState({ target: 1000000, meaning: 'available' }, { capital: 500000, reserve: 0, hourly: 0, dailyMinutes: 60 }, { source: 'missions', strategy: 'asIs',
    missions: [{ ...B.copy(B.planMissionTemplate), id: 'm', name: 'M', reward: 100000, cost: 0, duration: 60, investment: 200000 }] });
  t.views.plan = 'advanced'; t.mode = 'advanced';
  const r2 = B.evaluate('plan', t); assert.equal(r2.valid, true, r2.reason); assert.equal(r2.totalSessions, 7); assert.equal(r2.sessions[0].gain, -100000);
  const q = await page('plan', t); const rep0 = text(q, 'plan-report');
  assert.match(rep0, /Par partie ?−100 000 \$/); assert.match(rep0, /Partie 1 · jour 1 ?M ×1 ?−100 000 \$ ?400 000 \$/); assert.doesNotMatch(text(q, 'plan-results') + ' ' + rep0, /\+[-−]|[-−]\+/, 'double signe');
  set(q, 'plan-actual', '410000'); set(q, 'plan-actual-minutes', '60');
  const b = q.d.querySelector('[data-b-plan-log]'); assert.ok(b, 'bouton « Mettre à jour mon plan »'); fire(q, b, 'click'); q.flush();
  const log = stored(q).plan.log; assert.equal(log.length, 1); assert.equal(log[0].plannedGain, -100000); assert.equal(log[0].gain, -90000);
  const rep2 = text(q, 'plan-report');
  assert.match(rep2, /Prévu ?−100 000 \$ ?Réel ?−90 000 \$ ?Écart ?\+10 000 \$/); assert.match(rep2, /1 h ?−100 000 \$ ?−90 000 \$ ?410 000 \$/); assert.doesNotMatch(text(q, 'plan-results') + ' ' + rep2, /\+[-−]|[-−]\+/, 'double signe');
  clean(q);
});

test('REV7-1 plan, obtention dans la partie 1 : la carte dit « Obtiens « Garage » (30 min), puis fais… » et le gain de « Pack » ne compte que le temps libre (+10 000 $, pas +20 000 $)', async () => {
  // 60 000 $ ; Garage 50 000 payé avant la partie 1 → 10 000 $ ; obtention 30 min sans gain (C3b) ; Pack déjà possédé +20 000 $/h
  // partie 1 : 30 min libres → 3 × Livraison (10 min, 10 000) = 30 000 + Pack 20 000 × 30 ÷ 60 = 10 000 → +40 000 → 50 000 $
  // parties 2 et 3 : 6 × 10 000 + 20 000 = 80 000 → 130 000 puis 210 000 ≥ 200 000 : 3 parties
  const mis = { ...B.copy(B.planMissionTemplate), id: 'm-1', name: 'Livraison', reward: 10000, cost: 0, duration: 10, prep: 0, cooldown: 0 };
  const s = planState({ target: 200000 }, { capital: 60000, reserve: 0, hourly: 0 }, { strategy: 'asIs', source: 'missions', missions: [mis],
    prerequisites: [{ ...B.copy(B.planPrereqTemplate), id: 'p-p', name: 'Pack', price: 10000, owned: true, boostHourly: 20000 }, { ...B.copy(B.planPrereqTemplate), id: 'p-g', name: 'Garage', price: 50000, minutes: 30 }] });
  const p = await page('plan', s);
  const phases = [...p.d.querySelectorAll('#plan-report li.b-phase')].map(li => ({ h4: flat(li.querySelector('h4')?.textContent).trim(), note: flat(li.querySelector('.calc-note')?.textContent).trim() }));
  assert.equal(phases[0].h4, 'Obtiens « Garage » (30 min), puis fais « Livraison » ×3.');
  assert.match(phases[0].note, /\+10 000 \$ par partie grâce à « Pack »/); assert.doesNotMatch(phases[0].note, /20 000/);
  assert.match(phases[1].note, /\+20 000 \$ par partie grâce à « Pack »/);
  assert.match(text(p, 'plan-results'), /Commence par obtenir « Garage » \(30 min\)\./);
  clean(p);
});

test('REV7-2 plan, partie entière prise par l’obtention : « Obtiens « Garage » (1 h). » au lieu de « Joue 1 h : tu gagnes à peu près 0 $ » ; tableau « obtenir « Garage » (1 h) »', async () => {
  // T2-07 : 300 000 $, Garage 100 000 en 60 min, 100 000 $/h, parties de 60 : partie 1 = obtention (0 $), parties 2 à 9 : +100 000 → 1 000 000 $
  const s = planState({ target: 1000000 }, { capital: 300000, reserve: 0, hourly: 100000 }, { strategy: 'asIs',
    prerequisites: [{ ...B.copy(B.planPrereqTemplate), id: 'p-g', name: 'Garage', price: 100000, minutes: 60 }] });
  s.views.plan = 'advanced'; s.mode = 'advanced'; // le tableau « Partie par partie » est en mode Expert
  const p = await page('plan', s);
  const h4 = [...p.d.querySelectorAll('#plan-report li.b-phase h4')].map(n => flat(n.textContent).trim());
  assert.equal(h4[0], 'Obtiens « Garage » (1 h).');
  assert.match(h4[1], /^Joue 1 h : tu gagnes à peu près 100 000 \$ par partie/);
  const res = text(p, 'plan-results'), rep = text(p, 'plan-report');
  assert.match(res, /Commence par obtenir « Garage » \(1 h\)\./); assert.doesNotMatch(res, /Joue 1 h : environ \+0 \$/);
  assert.match(rep, /Partie 1 · jour 1 ?obtenir « Garage » \(1 h\) ?\+0 \$/);
  clean(p);
});
