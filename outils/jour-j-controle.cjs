#!/usr/bin/env node
'use strict';
/* v8.04 (jour J, prompt 2) — contrôle du jour J, en Node pur, sans rien écrire : ce que le site lit des données publiées et le
   business plan d’un début de partie fait avec les missions du site.
   1. État : prix publiés par famille et par statut, missions et activités chiffrées, règles d’argent, revenus, erreurs de forme
      (outils/donnees-publiees.cjs, la même lecture que les générateurs).
   2. Business plan : les missions du site copiées comme le fait le business plan (« Ou reprendre une mission déjà écrite », puis
      « Ajouter cette mission » ; une valeur non publiée prend la valeur par défaut du formulaire : frais 0, part 100 %), douze au
      plus comme dans la page, puis le moteur du site (calculateurs-engine.js, missionPlan) pour
      atteindre le premier million depuis l’argent de départ : ordre des missions, attente de l’argent en poche, rang, blocages
      dits en mots simples, vérification indépendante (missionVerify).
   Usage : node outils/jour-j-controle.cjs [--depart 0] [--but 1000000] [--rang N] [--partie 120]
   Code 1 si une donnée est mal formée ou si le plan ne se vérifie pas. Aucune valeur de ce script n’est une donnée de GTA VI. */
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 && process.argv[i + 1] !== undefined ? Number(process.argv[i + 1]) : d; };
const depart = arg('--depart', 0), but = arg('--but', 1000000), rang = arg('--rang', null), partie = arg('--partie', null);
const nf = n => new Intl.NumberFormat('fr-FR').format(Math.round(n)).replace(/[  ]/g, ' ');
const duree = m => m >= 60 ? Math.floor(m / 60) + ' h ' + String(Math.round(m % 60)).padStart(2, '0') : Math.round(m) + ' min';
const flat = s => String(s == null ? '' : s).replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim();
let code = 0;
/* ---------- 1. état ---------- */
const DP = require(path.join(root, 'outils/donnees-publiees.cjs')), e = DP.etat(root);
console.log('1. ÉTAT DES DONNÉES PUBLIÉES');
const pl = (n, t) => n + ' ' + (DP.TYPE_LABEL[t] || t) + (n > 1 ? (t === 'place' ? 'x' : 's') : '');
console.log('   Prix publiés : ' + e.prix.connus + ' sur ' + e.prix.total + ' fiches' + (e.prix.connus ? ' ; par type : ' + Object.entries(e.prix.parType || {}).filter(([, n]) => n.connus).map(([t, n]) => pl(n.connus, t) + (n.officiels ? ' (dont ' + n.officiels + ' officiel' + (n.officiels > 1 ? 's' : '') + ')' : '')).join(', ') : ''));
const ctx = { window: {} }; ctx.window.window = ctx.window; vm.createContext(ctx);
for (const f of ['vehicules-data.js', 'armes-data.js', 'acquisitions-data.js', 'calculateurs-catalogue.js', 'calculateurs-activites.js', 'calculateurs-data.js']) if (fs.existsSync(path.join(root, f))) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx);
const D = ctx.window.LKCalcData, cat = D.catalogue(), acts = D.activities(), rules = D.rules();
const parStatut = {};
for (const x of cat) if (x.price !== null && x.fieldMeta && x.fieldMeta.price) { const k = (x.type || '?') + ' : ' + (DP.STATUS_LABEL[x.fieldMeta.price.status] || x.fieldMeta.price.status); parStatut[k] = (parStatut[k] || 0) + 1; }
console.log('   Prix lus par le calculateur, par type et statut : ' + (Object.keys(parStatut).length ? Object.entries(parStatut).map(([k, n]) => k + ' (' + n + ')').join(', ') : 'aucun'));
for (const [fam, x] of Object.entries(e.catalogues || {})) if (x.connus) console.log('   Liste ' + fam + ' : ' + x.connus + ' prix GTA VI sur ' + x.total);
const revenus = cat.filter(x => x.income);
console.log('   Revenus passifs publiés : ' + (revenus.length ? revenus.map(x => x.name + ' (' + (x.income.amount !== null ? nf(x.income.amount) + ' $' : 'montant inconnu') + (x.income.everyMinutes ? ' toutes les ' + nf(x.income.everyMinutes) + ' min' : '') + (x.income.cap !== null && x.income.cap !== undefined ? ', plafond ' + nf(x.income.cap) + ' $' : '') + ')').join(', ') : 'aucun'));
const regle = (n, r) => n + ' : ' + (r.value === null ? 'inconnu' : (typeof r.value === 'number' ? nf(r.value) + ' ' + (r.meta.unit || '') : r.value) + ' (' + (DP.STATUS_LABEL[r.meta.status] || r.meta.status) + ')');
console.log('   Règles d’argent : ' + [regle('argent de Jason et Lucia', rules.money), regle('amende', rules.fine), regle('perte à la mort', rules.death), regle('perte à l’arrestation', rules.arrest)].join(' ; '));
console.log('   Missions et activités chiffrées (gain et durée) : ' + acts.length + (acts.length ? ' : ' + acts.map(a => a.name + ' (' + (a.once ? 'une fois' : 'se refait') + ')').join(', ') : ''));
if (e.errors.length) { code = 1; console.log('   ERREURS DE FORME (' + e.errors.length + ') :\n   - ' + e.errors.join('\n   - ')); } else console.log('   Erreurs de forme : aucune');
/* ---------- 2. business plan d’un début de partie ---------- */
console.log('\n2. BUSINESS PLAN : de ' + nf(depart) + ' $ à ' + nf(but) + ' $' + (rang !== null ? ', rang ' + rang : ', rang non écrit') + (partie ? ', parties de ' + partie + ' min' : ', en un seul parcours'));
const E = require(path.join(root, 'calculateurs-engine.js'));
/* comme « Ajouter cette mission » avec une mission du site (calculateurs-plan.js, importSiteMission) */
const toutes = acts.map(x => ({ id: x.id, name: x.name, reward: x.reward ?? null, cost: x.cost ?? 0, duration: x.duration ?? null, prep: x.prep ?? 0, cooldown: x.cooldown ?? 0, share: x.share ?? 100, investment: x.investment ?? 0, players: Number.isInteger(x.players) && x.players > 0 ? x.players : 1, units: 0, once: x.once === true, requiresMissions: (x.requiresMissions || []).slice(), requires: [], minCash: Number.isFinite(x.minCash) ? x.minCash : null, minRank: Number.isFinite(x.minRank) ? x.minRank : null, order: Number.isFinite(x.order) ? x.order : null }));
/* douze au plus, comme la page : les missions « une seule fois » dans l’ordre de l’histoire (huit au plus), puis les activités qui se
   refont, les plus rentables à la minute d’abord ; une mission dont une mission demandée n’est pas prise est laissée de côté */
const rentable = m => ((m.reward || 0) * (m.share || 100) / 100 - (m.cost || 0)) / Math.max(1, (m.duration || 0) + (m.prep || 0) + (m.cooldown || 0));
const onces = toutes.filter(m => m.once).sort((a, b) => (a.order ?? 1e9) - (b.order ?? 1e9)), reps = toutes.filter(m => !m.once).sort((a, b) => rentable(b) - rentable(a));
let missions = toutes.length <= 12 ? toutes.slice() : [...onces.slice(0, Math.max(8, 12 - reps.length)), ...reps].slice(0, 12);
for (let changed = true; changed;) { changed = false; const ids = new Set(missions.map(m => m.id)); const keep = missions.filter(m => m.requiresMissions.every(id => ids.has(id))); if (keep.length < missions.length) { missions = keep; changed = true; } }
if (toutes.length > missions.length) console.log('   Le site a ' + toutes.length + ' missions et activités chiffrées ; le plan en prend ' + missions.length + ' (douze au plus, comme la page) : ' + missions.filter(m => m.once).length + ' de l’histoire dans l’ordre, ' + missions.filter(m => !m.once).length + ' qui se refont, les plus rentables d’abord.');
if (!missions.length) console.log('   Aucune mission ni activité chiffrée : rien à planifier (le site garde les exemples A, B et C).');
else {
  const input = { capital: depart, target: but, activities: missions };
  if (rang !== null) input.rank = rang; if (partie) input.sessionMinutes = partie;
  let r; try { r = E.missionPlan(input); } catch (err) { r = { valid: false, reason: err.message }; }
  if (!r.valid) console.log('   Plan impossible : ' + flat(r.reason));
  else {
    console.log('   ' + (r.reached ? 'But atteint' : 'But non atteint') + (Number.isFinite(r.totalMinutes) ? ' en ' + duree(r.totalMinutes) + ' de jeu' : '') + (partie && Number.isFinite(r.totalSessions) ? ', soit ' + r.totalSessions + ' partie' + (r.totalSessions > 1 ? 's' : '') + ' de ' + partie + ' min' : '') + (Number.isFinite(r.finalCash) ? ', argent à la fin : ' + nf(r.finalCash) + ' $' : '') + '.');
    if (r.note) console.log('   Note du plan : ' + flat(r.note));
    const etapes = (r.route || []).filter(x => ['unlock', 'run', 'acquire'].includes(x.type));
    /* étapes du plan : une mission « une seule fois » (unlock), une mission répétée (run), un achat (acquire) ; les répétitions qui se suivent sont regroupées */
    const lib = x => x.type === 'unlock' ? 'fait « ' + x.name + ' » (une seule fois' + (x.holds ? ', avec au moins ' + nf(x.holds) + ' $ en poche, non dépensés' : '') + ')' : x.type === 'acquire' ? 'achète « ' + x.name + ' » (' + nf(x.spend || 0) + ' $)' : 'répète « ' + x.name + ' »';
    /* les répétitions entre deux étapes marquantes (mission « une seule fois », achat) sont résumées en une ligne : « × n » par activité */
    const lignes = []; let lot = null;
    /* en parties (--partie), les heures sont comptées dans chaque partie : « partie 2, 0 min à 1 h 40 » */
    const quand = (session, m) => (partie && session ? 'partie ' + session + ', ' : '') + duree(m);
    const flush = () => { if (!lot) return; lignes.push('   - ' + quand(lot.session, lot.start) + ' à ' + duree(lot.end) + ' : répète ' + [...lot.n].map(([nom, n]) => '« ' + nom + ' » × ' + n).join(', ') + (lot.cash !== undefined ? ', argent ensuite : ' + nf(lot.cash) + ' $' : '')); lot = null; };
    for (const x of etapes) {
      if (x.type === 'run') { if (lot && partie && x.session !== lot.session) flush(); if (!lot) lot = { session: x.session, start: x.start || 0, end: 0, n: new Map(), cash: x.cashAfter }; lot.n.set(x.name, (lot.n.get(x.name) || 0) + (x.runs || 1)); lot.end = (x.start || 0) + (x.minutes || 0); lot.cash = x.cashAfter; continue; }
      flush(); lignes.push('   - ' + (x.start !== undefined ? quand(x.session, x.start) + ' : ' : '') + lib(x) + (x.cashAfter !== undefined ? ', argent ensuite : ' + nf(x.cashAfter) + ' $' : ''));
    }
    flush();
    /* en parties, le moteur range le plan partie par partie (sessions) : une ligne par partie, les premières et les dernières */
    if (partie && Array.isArray(r.sessions) && r.sessions.length) {
      lignes.length = 0;
      const parS = r.sessions.map(se => '   - partie ' + se.index + ' : ' + [...(se.onceSteps || []).map(o => 'fait « ' + o.name + ' »'), (se.steps || []).length ? 'répète ' + se.steps.map(st => '« ' + st.name + ' » × ' + st.runs).join(', ') : null, ...(se.purchases || []).map(pu => 'achète « ' + (pu.name || pu.id) + ' »')].filter(Boolean).join(' ; ') + (Number.isFinite(se.cashAfter) ? ', argent ensuite : ' + nf(se.cashAfter) + ' $' : ''));
      lignes.push(...(parS.length > 10 ? [...parS.slice(0, 6), '   - … (' + (parS.length - 8) + ' parties de plus)', ...parS.slice(-2)] : parS));
    }
    for (const l of lignes) console.log(l);
    if (!lignes.length) console.log('   (le moteur n’a pas détaillé d’étapes)');
    const onceOrder = etapes.filter(x => (missions.find(m => m.id === x.id) || {}).once).map(x => missions.find(m => m.id === x.id)).filter((m, i, a) => a.indexOf(m) === i && m.order !== null);
    const ordered = onceOrder.every((m, i) => i === 0 || onceOrder[i - 1].order <= m.order);
    console.log('   Missions de l’histoire dans l’ordre publié : ' + (ordered ? 'oui' : 'NON') + (onceOrder.length ? ' (' + onceOrder.map(m => m.order + '. ' + m.name).join(', ') + ')' : ''));
    const v = E.missionVerify(r);
    console.log('   Vérification indépendante du plan : ' + (v.ok ? 'juste' : 'ÉCART : ' + JSON.stringify((v.violations || []).slice(0, 3))));
    if (!v.ok || !ordered) code = 1;
  }
  /* une mission qui demande un rang ne compte pas sans --rang (la page demande le rang avant de la calculer) */
  if (rang === null) for (const m of toutes.filter(x => x.minRank !== null)) console.log('   Attention : « ' + m.name + ' » demande le rang ' + nf(m.minRank) + ' ; sans --rang, le plan la laisse de côté (relance avec --rang <ton rang>).');
  /* revenu passif : l’achat d’une entreprise, d’une demeure ou d’une planque au revenu publié, avant le but */
  for (const x of cat.filter(c => c.income && Number.isFinite(c.income.amount) && Number.isFinite(c.income.everyMinutes) && c.income.everyMinutes > 0 && Number.isFinite(c.price))) {
    const hourly = x.income.amount * 60 / x.income.everyMinutes, base = { capital: depart, target: but, activities: missions, ...(rang !== null ? { rank: rang } : {}), ...(partie ? { sessionMinutes: partie } : {}) };
    let a, b; try { a = E.missionPlan({ ...base, purchases: [{ id: x.id, name: x.name, price: x.price, boostHourly: hourly }] }); b = E.missionPlan(base); } catch (err) { a = b = { valid: false, reason: err.message }; }
    console.log('   Revenu passif « ' + x.name + ' » (' + nf(x.price) + ' $, ' + nf(hourly) + ' $ par heure de jeu' + (Number.isFinite(x.income.cap) ? ', plafond ' + nf(x.income.cap) + ' $' : '') + ') : ' + (a.valid && Number.isFinite(a.totalMinutes) ? 'but en ' + duree(a.totalMinutes) + ' en l’achetant' : 'achat impossible' + (a.reason ? ' (' + flat(a.reason) + ')' : '')) + (b.valid && Number.isFinite(b.totalMinutes) ? ', ' + duree(b.totalMinutes) + ' sans lui' : '') + '.');
  }
  /* chaque mission qui demande de l’argent en poche, seule, depuis l’argent de départ : le message que verra le joueur */
  for (const m of toutes.filter(x => x.minCash !== null)) {
    let b; try { b = E.missionPlan({ capital: depart, target: but, rank: rang !== null ? rang : m.minRank || undefined, activities: [{ ...m, requiresMissions: [] }] }); } catch (err) { b = { valid: false, reason: err.message }; }
    console.log('   « ' + m.name + ' » seule, depuis ' + nf(depart) + ' $ : ' + (b.valid ? 'possible' : flat(b.reason)));
  }
}
process.exit(code);
