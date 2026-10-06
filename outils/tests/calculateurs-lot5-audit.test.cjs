'use strict';
/* Calculateur, lot 5 (validation contradictoire) : le registre et les rapports ne citent que des preuves qui existent ; aucun chemin local
   ni dépendance à un fichier de travail ; aucune promesse d'optimum à l'écran ; robustesse des neuf outils sur des états tirés au hasard
   (graine fixe : reproductible). */
const test = require('node:test'), assert = require('node:assert/strict'), path = require('node:path'), fs = require('node:fs');
const root = path.resolve(__dirname, '../..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const DOCS = ['outils/CALCULATEUR-REGISTRE.md', 'outils/CALCULATEUR-LOT1.md', 'outils/CALCULATEUR-LOT2.md', 'outils/CALCULATEUR-LOT3.md', 'outils/CALCULATEUR-LOT4.md', 'outils/CALCULATEUR-LOT5.md'].filter(f => fs.existsSync(path.join(root, f)));
const TESTS = fs.readdirSync(path.join(root, 'outils/tests')).filter(f => /\.test\.cjs$/.test(f)).map(f => read('outils/tests/' + f)).join('\n');
const SRC = { E: read('calculateurs-engine.js'), S: read('calculateurs-scenario.js'), M: read('calculateurs-modele.js'), W: read('calculateurs-workspace.js'), P: read('calculateurs.js') + read('calculateurs-plan.js'), V: read('calculateurs-visuals.js'), H: read('calculateurs-hub.js') };

test('A1 registre et rapports : chaque test cité (T2-xx, T3-xx, T4-xx, T5-xx, T2P Px) existe dans outils/tests', () => {
  const missing = [];
  for (const f of DOCS) {
    const t = read(f);
    for (const id of new Set(t.match(/\bT[2345]-\d{2}\b/g) || [])) if (!new RegExp("test\\('" + id + "\\b").test(TESTS)) missing.push(f + ' : ' + id);
    for (const m of t.matchAll(/T2P (P\d{1,2})\b/g)) if (!new RegExp("test\\('" + m[1] + "\\b").test(TESTS)) missing.push(f + ' : T2P ' + m[1]);
  }
  assert.deepEqual(missing, []);
});

test('A2 registre et rapports : chaque fonction citée (E `x`, S `x`, M `x`, H `x`…) existe dans son fichier', () => {
  const missing = [];
  for (const f of DOCS) {
    const t = read(f);
    for (const m of t.matchAll(/\b([ESMWPVH]) `([A-Za-z_][\w.]*)`(?:, `([A-Za-z_][\w.]*)`)?/g)) for (const name0 of [m[2], m[3]].filter(Boolean)) {
      const k = m[1], name = name0, base = name.split('.')[0], src = SRC[k];
      if (!src) continue;
      if (!new RegExp('(?:function\\s+' + base + '\\b|\\b' + base + '\\s*[:=(]|\\b' + base + '\\s*,|[{,]\\s*' + base + '\\b)').test(src)) missing.push(f + ' : ' + k + ' ' + name);
    }
  }
  assert.deepEqual([...new Set(missing)], []);
});

test('A3 rien de local ni de temporaire dans les fichiers du calculateur livrés', () => {
  const files = ['calculateurs-engine.js', 'calculateurs-scenario.js', 'calculateurs-modele.js', 'calculateurs-workspace.js', 'calculateurs.js', 'calculateurs-plan.js', 'calculateurs-visuals.js', 'calculateurs-hub.js', 'calculateurs-notebooks.js', ...DOCS,
    ...fs.readdirSync(path.join(root, 'outils/tests')).filter(f => /^calculateurs-(lot|moteur-lot|decision-lot)/.test(f)).map(f => 'outils/tests/' + f)];
  const bad = files.filter(f => /\/home\/user|\/tmp\/|scratchpad|claude-0|\/root\//.test(read(f)) && !/calculateurs-lot5-audit/.test(f));
  assert.deepEqual(bad, []);
});

test('A4 jamais « optimal » ni « optimum » dans une phrase montrée au joueur (seulement « meilleur trouvé » ou une recherche complète dite)', () => {
  let acorn; try { acorn = require('acorn'); } catch { return; } // même dépendance que outils/langues.cjs ; sans elle, rien à lire
  const shown = [];
  for (const code of Object.values(SRC)) for (const t of acorn.tokenizer(code, { ecmaVersion: 'latest' })) if ((t.type.label === 'string' || t.type.label === 'template') && typeof t.value === 'string' && /optima|optimum/i.test(t.value) && /\s/.test(t.value)) shown.push(t.value);
  assert.deepEqual(shown, []);
});

/* ---------- robustesse : états tirés au hasard (graine fixe), neuf outils, cas limites ---------- */
const B = require(path.join(root, 'calculateurs-scenario.js')), H = require('./check-ultime-helper.cjs'), { load } = require('./runtime-helper.cjs');
const site = H.siteData(), initial = B.initial(H.dataVersion(site.D, site.catalogue, site.sourceActivities), site.presets);
test('A5 neuf outils, 36 états aux limites (0, vide, très grand, réserve égale à l’argent, achat gratuit) : jamais NaN, undefined, Infinity ni erreur JavaScript', async () => {
  let seed = 20261006; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  const pick = xs => xs[Math.floor(rnd() * xs.length)];
  const money = () => pick([0, 1, 999, 50000, 250000, 1e6, 3.5e6, 1e9, 1e12, null]), mins = () => pick([1, 15, 30, 60, 90, 240, 1440]);
  const tools = ['goal', 'purchase', 'session', 'budget', 'order', 'roi', 'activities', 'compare', 'plan'], bad = [], seen = {};
  for (let i = 0; i < 36; i += 1) {
    const t = tools[i % tools.length], s = H.baseState(B, initial, site.catalogue);
    s.tab = t; s.views[t] = pick(['quick', 'guided', 'advanced']);
    const cap = money(); s.goal.capital = cap === null ? 0 : cap; s.goal.reserve = pick([0, 0, s.goal.capital, Math.floor(s.goal.capital / 2)]);
    s.goal.hourly = money(); s.goal.target = money(); s.goal.dailyMinutes = mins();
    s.session.minutes = mins(); s.inverse.minutes = mins();
    s.assets = [...s.assets, { ...B.copy(B.assetTemplate), key: 'x1', name: 'Essai 1', price: money() ?? 0, utility: pick([null, 1, 5]) }, { ...B.copy(B.assetTemplate), key: 'x2', name: 'Essai 1', price: money() ?? 0, incomeMode: 'personal', boostHourly: pick([0, 5000, 1e6]) }];
    s.compare.keys = ['x1', 'x2']; s.order.keys = ['x1', 'x2'];
    s.roi.mode = pick(['estimate', 'continuous', 'new']); s.roi.revenueHourly = money(); s.roi.hours = pick([0, 1, 10, 1000]);
    let st; try { st = B.validate(s, initial); } catch (e) { continue; }
    seen[t] = (seen[t] || 0) + 1;
    const p = await load(root, 'calculateurs.html?tool=' + t, { storage: { 'lk-calculator-v1': JSON.stringify(st), 'lk-calc-folds-v1': JSON.stringify({ all: true }) } });
    try {
      const zone = p.d.getElementById(t === 'activities' ? 'inverse-results' : t + '-results');
      const txt = zone ? zone.textContent : '';
      if (/\bNaN\b|\bundefined\b|Infinity/.test(txt)) bad.push(t + ' #' + i + ' : ' + (txt.match(/.{0,60}(?:NaN|undefined|Infinity).{0,40}/) || [''])[0]);
      if (p.errors.length) bad.push(t + ' #' + i + ' : ' + p.errors.join(' | '));
    } finally { p.close(); }
  }
  assert.deepEqual(bad, []);
  assert.ok(tools.every(t => seen[t] >= 3), 'chaque outil vu au moins 3 fois : ' + JSON.stringify(seen));
});

/* ---------- compatibilité de déploiement (Vercel : outils/ exclu, CSP « script-src 'self' », versions ?v= par empreinte) ---------- */
test('A6 déploiement : les 15 pages qui chargent le calculateur (5 langues) — chaque script ou style local existe et porte ?v= = son empreinte ; rien d’externe ni de outils/ ; aucun script ni gestionnaire en ligne ; ni eval ni new Function', () => {
  const crypto = require('node:crypto'), bad = [];
  const vercel = JSON.parse(read('vercel.json')), csp = vercel.headers.find(h => h.source === '/(.*)').headers.find(h => h.key === 'Content-Security-Policy').value;
  assert.match(csp, /script-src 'self';/); assert.match(read('.vercelignore'), /^outils$/m);
  const pages = ['', 'en/', 'es/', 'it/', 'de/'].flatMap(l => ['calculateurs.html', 'index.html', 'tuto.html'].map(f => l + f)).filter(f => fs.existsSync(path.join(root, f)));
  assert.equal(pages.length, 15);
  for (const f of pages) {
    const html = read(f);
    assert.match(html, /calculateurs-engine\.js\?v=/, f);
    for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) if (!/\bsrc=/.test(m[1]) && m[2].trim() && !/type="application\/(?:ld\+)?json"/.test(m[1])) bad.push(f + ' : script en ligne « ' + m[2].trim().slice(0, 40) + ' »');
    for (const m of html.matchAll(/<[a-z][^>]*\son(?:click|input|change|submit|load|error|key(?:down|up|press)|mouse\w+|focus|blur|toggle)\s*=/gi)) bad.push(f + ' : gestionnaire en ligne ' + m[0].slice(0, 60));
    for (const m of html.matchAll(/(?:src|href)="([^"#?]+\.(?:js|css))(?:\?v=([0-9a-f]+))?"/g)) {
      const url = m[1];
      if (/^(?:https?:)?\/\//.test(url)) { bad.push(f + ' : ressource externe ' + url); continue; }
      const file = url.startsWith('/') ? path.join(root, url.slice(1)) : path.resolve(root, path.dirname(f), url);
      if (path.relative(root, file).split(path.sep)[0] === 'outils') bad.push(f + ' : charge un fichier de outils/ (jamais mis en ligne) ' + url);
      if (!fs.existsSync(file)) { bad.push(f + ' : fichier absent ' + url); continue; }
      const v = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').slice(0, 12);
      if (m[2] !== v) bad.push(f + ' : ' + url + ' ?v=' + (m[2] || '(rien)') + ' au lieu de ' + v);
    }
  }
  let acorn; try { acorn = require('acorn'); } catch { acorn = null; }
  if (acorn) for (const [k, code] of Object.entries({ ...SRC, hub: read('calculateurs-hub.js'), carnets: read('calculateurs-notebooks.js') })) {
    const toks = [...acorn.tokenizer(code, { ecmaVersion: 'latest' })];
    toks.forEach((t, i) => {
      const next = toks[i + 1], prev = toks[i - 1];
      if (t.type.label === 'name' && next && next.type.label === '(' && (t.value === 'eval' || (t.value === 'Function' && prev && prev.type.label === 'new'))) bad.push(k + ' : ' + t.value + '(…)');
      if (t.type.label === 'name' && /^set(?:Timeout|Interval)$/.test(t.value) && toks[i + 2] && ['string', 'template'].includes(toks[i + 2].type.label)) bad.push(k + ' : ' + t.value + ' avec du texte');
      if (t.type.label === 'name' && t.value === 'fetch' && next && next.type.label === '(' && toks[i + 2] && /^(?:https?:)?\/\//.test(String(toks[i + 2].value))) bad.push(k + ' : appel réseau externe');
      if (['string', 'template'].includes(t.type.label) && typeof t.value === 'string' && /\son(?:click|input|change|submit|load|error|key(?:down|up|press)|mouse\w+|focus|blur|toggle)\s*=\s*["']/i.test(t.value)) bad.push(k + ' : gestionnaire en ligne dans le HTML fabriqué « ' + t.value.slice(0, 60) + ' »');
    });
  }
  assert.deepEqual(bad, []);
});

/* ---------- accessibilité et lisibilité des réponses ajoutées par les lots 2 à 4, dans les trois modes ---------- */
const fireEv = (p, n, t = 'click') => n.dispatchEvent(new p.w.Event(t, { bubbles: true, cancelable: true }));
function a11y(p, tool, label) {
  const d = p.d, out = [], panel = d.getElementById('panel-' + tool);
  if (!panel) return [label + ' : panneau absent'];
  panel.querySelectorAll('button').forEach(b => {
    const name = (b.textContent || '').replace(/\s+/g, ' ').trim() || b.getAttribute('aria-label') || b.getAttribute('title');
    if (!name) out.push(label + ' : bouton sans nom ' + b.outerHTML.slice(0, 80));
    if (b.dataset.bFocus && !d.getElementById(b.dataset.bFocus)) out.push(label + ' : « Modifier / Écrire » vers une case absente ' + b.dataset.bFocus);
    if (b.dataset.open && !d.getElementById('panel-' + b.dataset.open)) out.push(label + ' : ouvre un outil absent ' + b.dataset.open);
  });
  panel.querySelectorAll('input:not([type=hidden]),select,textarea').forEach(el => { const lab = el.id && d.querySelector('label[for="' + el.id + '"]'); if (!lab && !el.closest('label') && !el.getAttribute('aria-label') && !el.getAttribute('aria-labelledby')) out.push(label + ' : case sans libellé ' + (el.id || el.dataset.field || el.outerHTML.slice(0, 60))); });
  panel.querySelectorAll('[aria-controls]').forEach(el => { if (!d.getElementById(el.getAttribute('aria-controls'))) out.push(label + ' : aria-controls vers un id absent ' + el.getAttribute('aria-controls')); });
  const ids = [...d.querySelectorAll('[id]')].map(n => n.id), dup = [...new Set(ids.filter((x, i) => ids.indexOf(x) !== i))];
  if (dup.length) out.push(label + ' : identifiants en double ' + dup.join(', '));
  const txt = panel.textContent;
  if (/\bNaN\b|\bundefined\b|Infinity|\[object /.test(txt)) out.push(label + ' : « ' + (txt.match(/.{0,60}(?:NaN|undefined|Infinity|\[object ).{0,30}/) || [''])[0] + ' »');
  return out;
}
function roiA(edit) { const s = H.baseState(B, initial, site.catalogue); s.tab = 'roi'; const a = B.asset(s, s.roi.key); Object.assign(a, { price: 120000, extras: 0, fees: 0 }); s.roi.mode = 'continuous'; s.roi.costHourly = 0; Object.assign(s.goal, { capital: 500000, reserve: 0, hourly: 100000 }); s.roi.revenueHourly = 20000; s.roi.hours = 10; edit(s, a); return s; }
function orderA(defs) { const s = H.baseState(B, initial, site.catalogue); s.tab = 'order'; const keys = []; defs.forEach((x, i) => { const a = { ...B.copy(B.assetTemplate), key: 'o' + i, name: x.name, price: x.price, extras: 0, fees: 0, incomeMode: x.boost ? 'personal' : 'none', boostHourly: x.boost || 0, usage: x.usage ? { perSession: x.usage } : {} }; s.assets.push(a); keys.push(a.key); }); s.order.keys = keys; s.order.objective = 'all'; Object.assign(s.goal, { capital: 0, reserve: 0, hourly: 10000, dailyMinutes: 60 }); return s; }
function planA() { const s = H.baseState(B, initial, site.catalogue), T = B.planMissionTemplate; s.tab = 'plan'; s.plan.goal = { ...s.plan.goal, kind: 'amount', target: 1000000 }; s.plan.situation = { ...s.plan.situation, capital: 100000, reserve: 0, hourly: null, unitsHourly: 0, dailyMinutes: 60, daysPerWeek: 7, upkeepPerSession: 0 }; s.plan.source = 'missions'; s.plan.prerequisites = []; s.plan.missions = [{ ...B.copy(T), id: 'u', name: 'Coup unique', reward: 80000, duration: 30, once: true }, { ...B.copy(T), id: 'l', name: 'Livraison', reward: 25000, duration: 15 }, { ...B.copy(T), id: 'w', name: 'Atelier', reward: 60000, duration: 20, investment: 40000 }]; return s; }
test('A7 réponses des lots 2 à 4 (attendre l’argent, achat gratuit, gain inconnu ou nul, ordre sans achat, achat payé avec le suivant, noms identiques, activités combinées, plan après une partie notée), trois modes : boutons nommés, cases avec libellé, « Modifier » vers une case qui existe, identifiants uniques, jamais NaN / undefined / Infinity, aucune erreur JavaScript', async () => {
  const cases = [
    ['roi', 'Ça vaut le coup ? attendre l’argent', roiA(s => { s.goal.capital = 50000; })],
    ['roi', 'Ça vaut le coup ? achat gratuit', roiA((s, a) => { a.price = 0; s.roi.revenueHourly = 10000; })],
    ['roi', 'Ça vaut le coup ? gain en plus inconnu', roiA(s => { s.roi.revenueHourly = null; })],
    ['roi', 'Ça vaut le coup ? gain en plus nul', roiA(s => { s.roi.revenueHourly = 0; })],
    ['order', 'ordre : sans achat en route et prix qui inverse', orderA([{ name: 'A', price: 100000, boost: 20000 }, { name: 'B', price: 150000, boost: 20000 }])],
    ['order', 'ordre : payé avec le suivant', orderA([{ name: 'X', price: 50000, usage: 5000 }, { name: 'Y', price: 100000, boost: 20000 }])],
    ['compare', 'comparer : deux noms identiques', (() => { const s = H.baseState(B, initial, site.catalogue); s.tab = 'compare'; s.assets.push({ ...B.copy(B.assetTemplate), key: 'fa', name: 'Mon achat libre', price: 300000, extras: 0, fees: 0, utility: 3 }, { ...B.copy(B.assetTemplate), key: 'fb', name: 'Mon achat libre', price: 50000, extras: 0, fees: 0, utility: 3 }); s.compare.keys = ['fa', 'fb']; s.compare.criterion = 'cheapest'; return s; })()],
    ['activities', 'activités : combinées en 90 min', (() => { const s = H.baseState(B, initial, site.catalogue); s.tab = 'activities'; s.inverse.minutes = 90; return s; })()],
    ['session', 'partie : 30 min', (() => { const s = H.baseState(B, initial, site.catalogue); s.tab = 'session'; s.session.minutes = 30; return s; })()],
    ['plan', 'plan : après une partie notée', planA()],
  ];
  const problems = [];
  for (const [tool, label, raw] of cases) {
    const st = B.validate(raw, initial);
    const p = await load(root, 'calculateurs.html?tool=' + tool, { storage: { 'lk-calculator-v1': JSON.stringify(st), 'lk-calc-folds-v1': JSON.stringify({ all: true }) } });
    try {
      if (tool === 'plan') {
        const set = (id, v) => { const n = p.d.getElementById(id); assert.ok(n, 'case absente ' + id); n.value = String(v); fireEv(p, n, 'input'); };
        set('plan-actual', 210000); set('plan-actual-minutes', 60); set('plan-actual-runs-u', 1); set('plan-actual-runs-l', 2);
        fireEv(p, p.d.querySelector('[data-b-plan-log]')); p.flush();
        assert.equal(JSON.parse(p.w.localStorage.getItem('lk-calculator-v1')).plan.log.length, 1, 'partie notée');
      }
      for (const mode of ['quick', 'guided', 'advanced']) {
        fireEv(p, p.d.querySelector('.calc-mode-switch [data-mode="' + mode + '"]')); p.flush();
        problems.push(...a11y(p, tool, label + ' / ' + mode));
      }
      if (p.errors.length) problems.push(label + ' : ' + p.errors.join(' | '));
    } finally { p.close(); }
  }
  assert.deepEqual(problems, []);
});

/* ---------- performances du moteur : un calcul complet reste rapide sur un état chargé (garde-fou large : 250 ms) ---------- */
test('A8 performances : chaque outil calcule en moins de 250 ms (médiane) sur un état chargé, ordre de 6 achats (tous les ordres) et de 8 achats (recherche locale) compris', () => {
  const heavy = n => { const s = H.baseState(B, initial, site.catalogue); Object.assign(s.goal, { capital: 300000, reserve: 20000, hourly: 60000, target: 5000000, dailyMinutes: 120 });
    const extra = []; for (let i = 1; i <= 8; i += 1) extra.push({ ...B.copy(B.assetTemplate), key: 'h' + i, name: 'Achat ' + i, price: 50000 * i + 25000, incomeMode: 'personal', boostHourly: i % 3 === 0 ? 0 : 4000 * i, requires: i === 4 ? ['h1'] : i === 7 ? ['h2'] : [] });
    s.assets = [...s.assets, ...extra]; s.order.keys = extra.slice(0, n).map(a => a.key); s.compare.keys = ['h1', 'h2', 'h3'];
    s.roi.key = 'h2'; s.roi.mode = 'continuous'; s.roi.revenueHourly = 30000; s.roi.costHourly = 0; s.roi.hours = 10; s.session.minutes = 240; s.inverse.minutes = 240; return B.validate(s, initial); };
  const med = a => a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)], slow = [];
  for (const [tool, n] of [['goal', 6], ['purchase', 6], ['session', 6], ['budget', 6], ['order', 6], ['order', 8], ['roi', 6], ['activities', 6], ['compare', 6], ['plan', 6]]) {
    const s = tool === 'plan' ? H.planWithMissions(B, heavy(n)) : heavy(n); s.tab = tool;
    const t = []; let x = null;
    for (let i = 0; i < 9; i += 1) { const t0 = process.hrtime.bigint(); x = B.analysis(tool, s, site.sourceActivities); t.push(Number(process.hrtime.bigint() - t0) / 1e6); }
    assert.ok(x && !x.error, tool + ' : ' + (x && x.error));
    if (med(t.slice(2)) > 250) slow.push(tool + (tool === 'order' ? ' (' + n + ' achats)' : '') + ' : ' + Math.round(med(t.slice(2))) + ' ms');
  }
  assert.deepEqual(slow, []);
});

/* ---------- registre repris ligne par ligne : chaque critère utilisé, inconnu signalé ou refusé a une preuve, et la preuve existe ---------- */
test('A9 registre : chaque critère « utilisé », « inconnu signalé » ou « refusé » et chaque règle du vérificateur citent au moins une preuve ; chaque preuve citée existe', () => {
  const reg = read('outils/CALCULATEUR-REGISTRE.md').replace(/\\\|/g, '¦');
  const T1 = read('outils/tests/calculateurs-decision-lot1.test.cjs'), T2P = read('outils/tests/calculateurs-lot2-pages.test.cjs'), C02 = read('outils/calculateur-causalite.cjs');
  const norm = t => String(t).replace(/['’]/g, '’').toLowerCase();
  const t1Names = [...T1.matchAll(/^test\('([^']*)'/gm)].map(m => m[1]), t1Notes = [...T1.matchAll(/\/\/ ?(.*)$/gm)].map(m => m[1]);
  const letter = l => t1Names.concat(t1Notes).some(x => new RegExp('(?:^|[\\s(,«])' + l + '(?=[\\s,):»]|$)').test(x));
  const problems = []; let rows = 0, header = null;
  for (const line of reg.split('\n')) {
    if (!line.startsWith('|')) { header = null; continue; }
    const cells = line.split('|').slice(1, -1).map(c => c.trim());
    if (!header) { header = cells; continue; }
    if (cells.every(c => /^-+$/.test(c))) continue;
    const ti = header.findIndex(h => /^Test/.test(h)), si = header.indexOf('Statut');
    if (ti < 0) continue; // § 1 (objectifs et unités) : définitions, pas de colonne de preuve
    if (si >= 0 && !/utilisé|inconnu signalé|refusé|écartée/.test(cells[si])) continue; // exclu ou hors lot : la raison est écrite, rien à prouver
    rows += 1;
    const name = cells[0], proof = cells[ti] || '';
    if (!proof || proof === '—') { problems.push(name + ' : aucune preuve'); continue; }
    let found = 0;
    for (const m of proof.matchAll(/\bT([2345])-(\d{2})\b/g)) { found += 1; if (!new RegExp("test\\('T" + m[1] + '-' + m[2] + '\\b').test(TESTS)) problems.push(name + ' : T' + m[1] + '-' + m[2] + ' absent'); }
    for (const m of proof.matchAll(/\b(?:ARI|PER|REG|REV)\d*-\d+\b/g)) { found += 1; if (!TESTS.includes(m[0])) problems.push(name + ' : ' + m[0] + ' absent'); }
    for (const m of proof.matchAll(/\bT2P ([^;]+)/g)) for (const id of m[1].match(/\b(?:P\d+|[A-Z]{3}\d?-\d+)\b/g) || []) { found += 1; if (!T2P.includes(id)) problems.push(name + ' : T2P ' + id + ' absent'); }
    for (const m of proof.matchAll(/C02 `([^`]+)`/g)) { found += 1; if (!C02.includes(m[1].replace(/\*$/, ''))) problems.push(name + ' : C02 ' + m[1] + ' absent'); }
    for (const m of proof.matchAll(/C02 ×(\d+)/g)) found += 1;
    for (const m of proof.matchAll(/\bA(\d{1,2})\b/g)) { found += 1; if (!new RegExp("test\\('A" + m[1] + ' ').test(TESTS)) problems.push(name + ' : A' + m[1] + ' absent'); }
    for (const m of proof.matchAll(/\b(plan-v34|plan-ui-v749)\b/g)) { found += 1; if (!fs.existsSync(path.join(root, 'outils/tests/calculateurs-' + m[1] + '.test.cjs'))) problems.push(name + ' : ' + m[1] + ' absent'); }
    for (const m of proof.matchAll(/\bT1 ([^;]+)/g)) {
      for (const q of m[1].matchAll(/« ([^»]+) »/g)) { found += 1; if (!norm(T1).includes(norm(q[1]))) problems.push(name + ' : T1 « ' + q[1] + ' » absent'); }
      const rest = m[1].replace(/« [^»]+ »/g, '').replace(/\([^)]*\)/g, '');
      for (const l of rest.match(/\b[A-N]\b/g) || []) { found += 1; if (!letter(l)) problems.push(name + ' : T1 ' + l + ' absent'); }
      for (const w of (rest.match(/[a-zàâçéèêëîïôûùüÿœ]{4,}/g) || []).filter(w => w !== 'toutes')) { found += 1; if (!norm(T1).includes(w)) problems.push(name + ' : T1 ' + w + ' absent'); }
      if (/\btoutes\b/.test(rest)) found += 1;
    }
    if (!found) problems.push(name + ' : preuve illisible « ' + proof + ' »');
  }
  assert.ok(rows >= 60, 'lignes à prouver lues : ' + rows);
  assert.deepEqual(problems, []);
});

/* ---------- langues : chaque étiquette d’explication est traduite dans chaque copie (l’outil de langues peut laisser passer un mot isolé) ---------- */
test('A10 langues : chaque étiquette (« label ») des scripts du calculateur est traduite dans les copies en, es, it, de — sauf un mot qui s’écrit pareil (« Options »)', () => {
  const SAME = new Set(['Options']);
  const labels = f => [...read(f).matchAll(/label:'((?:[^'\\]|\\.)*)'/g)].map(m => m[1]);
  const bad = [];
  for (const f of ['calculateurs-scenario.js', 'calculateurs-workspace.js', 'calculateurs-visuals.js', 'calculateurs-plan.js', 'calculateurs.js', 'calculateurs-hub.js', 'calculateurs-notebooks.js', 'calculateurs-modele.js', 'calculateurs-engine.js']) {
    const fr = labels(f);
    for (const l of ['en', 'es', 'it', 'de']) {
      if (!fs.existsSync(path.join(root, l, f))) { bad.push(l + '/' + f + ' absent'); continue; }
      const t = labels(l + '/' + f);
      if (t.length !== fr.length) { bad.push(l + '/' + f + ' : ' + t.length + ' étiquettes au lieu de ' + fr.length); continue; }
      fr.forEach((x, i) => { if (x === t[i] && /[a-zà-ÿ]{3}/.test(x) && !SAME.has(x)) bad.push(l + '/' + f + ' : « ' + x + ' » pas traduit'); });
    }
  }
  assert.deepEqual([...new Set(bad)], []);
});

/* ---------- scénario H du cahier : mêmes chiffres par tous les points d’entrée qui couvrent ce problème ---------- */
test('A11 scénario H : 200 000 $ → 1 000 000 $ à 100 000 $/h = 8 h de jeu (800 000 $ ÷ 100 000 $/h, à la main), identique dans le mini-calculateur de l’accueil, les trois modes de Mon objectif et la barre de saisie', async () => {
  const flat = t => String(t || '').replace(/[\s  ]+/g, ' ').trim();
  let p = await load(root, 'index.html', {});
  try {
    p.d.getElementById('lk-mini-capital').dispatchEvent(new p.w.Event('input', { bubbles: true })); p.flush();
    const mini = flat(p.d.getElementById('lk-mini-answer').textContent);
    assert.match(mini, /^8 h ?de jeu/); assert.match(mini, /800 000 \$/); assert.deepEqual(p.errors, []);
  } finally { p.close(); }
  const s = H.baseState(B, initial, site.catalogue); s.tab = 'goal'; s.model = 'continuous';
  Object.assign(s.goal, { capital: 200000, reserve: 0, target: 1000000, hourly: 100000, dailyMinutes: 30, plannedSpend: 0, upkeepPerSession: 0 });
  p = await load(root, 'calculateurs.html?tool=goal', { storage: { 'lk-calculator-v1': JSON.stringify(B.validate(s, initial)) } });
  try {
    const answers = [];
    for (const m of ['quick', 'guided', 'advanced']) {
      p.d.querySelector('.calc-mode-switch [data-mode="' + m + '"]').dispatchEvent(new p.w.Event('click', { bubbles: true })); p.flush();
      answers.push(flat(p.d.querySelector('#goal-results .calc-answer').textContent));
      assert.match(flat(p.d.getElementById('goal-results').textContent), /8 h ?de jeu en tout/, m);
    }
    // 30 min par jour : 8 h = 16 parties de 30 min (scénario A : jamais converties en jours de 24 h)
    assert.equal(new Set(answers).size, 1); assert.match(answers[0], /800 000 \$.*16 jours/);
    const input = p.d.getElementById('calc-ask-input'); input.value = 'J’ai 200 000 $, je veux 1 million et je gagne 100 000 $ par heure';
    p.d.getElementById('calc-ask').dispatchEvent(new p.w.Event('submit', { bubbles: true, cancelable: true })); p.flush();
    assert.equal(flat(p.d.querySelector('#goal-results .calc-answer').textContent), answers[0], 'la barre remplit les mêmes cases et donne la même réponse');
    assert.deepEqual(p.errors, []);
  } finally { p.close(); }
});
