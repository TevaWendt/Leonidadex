#!/usr/bin/env node
'use strict';
/* Calculateur, lot 1 (« Même interface, intelligence renforcée ») — instantané du CADRE visible, pour prouver que le moteur
   change sans que la présentation change. Charge calculateurs.html (fr) et les pages traduites (en, es, it, de) dans jsdom,
   ouvre chacun des neuf outils dans chacun des trois modes, et relève, hors des zones de résultat dynamiques inventoriées
   (ZONES ci-dessous, vidées avant la lecture) : chaque élément dans l’ordre (balise, id, classes, hidden), son texte propre,
   ses attributs lus (placeholder, aria-label, title, alt, data-question, data-short exclu car dynamique), les options des
   listes et les types des cases, sans leurs valeurs (l’état). Ajoute l’empreinte de chaque feuille de style de la page (empreintes de cache « ?v= » retirées : elles changent à
   chaque régénération sans changer un style).
   Usage : NODE_PATH=<dépendances>/node_modules node outils/calculateur-cadre.cjs --ecrire   (fixe outils/calculateur-cadre.json)
           NODE_PATH=<dépendances>/node_modules node outils/calculateur-cadre.cjs           (compare ; code 1 si le cadre a changé) */
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const root = path.resolve(__dirname, '..'), { load } = require('./tests/runtime-helper.cjs');
const OUT = path.join(__dirname, 'calculateur-cadre.json');
const TOOLS = ['goal', 'purchase', 'session', 'budget', 'order', 'roi', 'activities', 'compare', 'plan'];
const MODES = ['quick', 'guided', 'advanced'];
const LANGS = ['', 'en/', 'es/', 'it/', 'de/'];
/* Zones dont le CONTENU est produit par le moteur (valeurs, réponses, explications, graphiques, tableaux de résultats) :
   seul leur contenu est neutralisé ; la balise elle-même (id, classes, place) reste dans le cadre comparé. */
const ZONES = ['[id$="-results"]', '[id$="-timeline"]', '[id^="expert-"]', '[id^="mode-summary-"]', '#plan-report', '#goal-routes',
  '#vehicle-comparison', '#catalogue-count', '#catalogue-filter-chips', '#purchase-selection', '#compare-items', '#order-items',
  '[aria-live]', '[role="status"]', '#calc-saved', '#calc-drawer-list', '.calc-live', '#lk-sticky-text'];
const READ = ['placeholder', 'aria-label', 'title', 'alt', 'data-question', 'aria-describedby', 'for', 'type', 'data-field', 'role'];
const norm = s => String(s || '').replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim();
/* identifiants horodatés (achat libre, mission…) stabilisés, comme dans calculateur-inventaire.cjs */
const stable = t => String(t).replace(/(free|m|p|v)-[a-z0-9]{6,}-\d+/g, '$1-<id>').replace(/log-[a-z0-9]+/g, 'log-<id>');
function frame(scope) {
  const lines = [];
  (function walk(el, depth) {
    for (const c of el.children) {
      const tag = c.tagName.toLowerCase();
      if (tag === 'script' || tag === 'style' || tag === 'template') continue;
      let head = depth + ' ' + tag + (c.id ? '#' + stable(c.id) : '') + (c.classList.length ? '.' + [...c.classList].join('.') : '') + (c.hidden ? ' [hidden]' : '');
      const zone = ZONES.some(z => c.matches(z));
      if (zone) { lines.push(head + ' ⟦zone dynamique⟧'); continue; }
      const attrs = READ.map(a => c.hasAttribute(a) ? a + '=' + JSON.stringify(stable(norm(c.getAttribute(a)))) : '').filter(Boolean);
      const own = norm([...c.childNodes].filter(n => n.nodeType === 3).map(n => n.nodeValue).join(' '));
      if (tag === 'svg') { lines.push(head + (attrs.length ? ' ' + attrs.join(' ') : '')); continue; }
      lines.push(head + (attrs.length ? ' ' + attrs.join(' ') : '') + (own ? ' «' + stable(own) + '»' : ''));
      if (tag === 'select') { lines.push(depth + 1 + ' options ' + JSON.stringify([...c.options].map(o => o.value + '=' + norm(o.textContent)))); continue; }
      walk(c, depth + 1);
    }
  })(scope, 0);
  return lines;
}
function cssPrints(d, lang) {
  return [...d.querySelectorAll('link[rel="stylesheet"]')].map(l => l.getAttribute('href').split('?')[0]).filter(h => !/^(https?:)?\/\//.test(h)).map(h => {
    const f = path.join(root, h.startsWith('/') ? h.slice(1) : path.posix.join(lang, h));
    return h + ' ' + (fs.existsSync(f) ? crypto.createHash('sha256').update(fs.readFileSync(f, 'utf8').replace(/\?v=[0-9a-f]+/g, '?v=')).digest('hex').slice(0, 16) : 'absent');
  });
}
async function collect() {
  const out = { note: 'Instantané du cadre du calculateur (lot 1) : ne pas éditer à la main ; voir l’en-tête de outils/calculateur-cadre.cjs.', pages: {}, css: {}, errors: [] };
  for (const lang of LANGS) {
    if (!fs.existsSync(path.join(root, lang + 'calculateurs.html'))) continue;
    for (const tool of TOOLS) for (const mode of MODES) {
      const p = await load(root, lang + 'calculateurs.html?tool=' + tool);
      const d = p.d, w = p.w, fire = (n, t) => n && n.dispatchEvent(new w.Event(t, { bubbles: true, cancelable: true }));
      p.flush(); fire(d.querySelector('.calc-mode-switch [data-mode="' + mode + '"]'), 'click'); p.flush();
      const key = (lang || 'fr/') + tool + '/' + mode;
      /* le cadre commun (en-tête, onglets, modes, tiroir, barre « Voir ma réponse » des téléphones) une fois par langue et par mode ; le panneau de l’outil à chaque fois */
      if (tool === 'goal') { const common = d.querySelector('#atelier') || d.body; const clone = common.cloneNode(true); clone.querySelectorAll('#calc-panels').forEach(n => n.remove()); const box = d.createElement('div'); box.appendChild(clone); d.querySelectorAll('.lk-sticky').forEach(n => box.appendChild(n.cloneNode(true))); out.pages[(lang || 'fr/') + 'commun/' + mode] = frame(box); }
      const panel = d.getElementById('panel-' + tool);
      out.pages[key] = panel ? frame(panel) : ['(panneau absent)'];
      if (tool === 'goal' && mode === 'quick') out.css[lang || 'fr/'] = cssPrints(d, lang);
      out.errors.push(...p.errors.map(e => key + ' : ' + e)); p.close();
    }
  }
  return out;
}
if (require.main === module) collect().then(out => {
  if (process.argv.includes('--ecrire')) { fs.writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n'); console.log('Cadre écrit : ' + Object.keys(out.pages).length + ' vues, ' + Object.values(out.pages).reduce((n, l) => n + l.length, 0) + ' lignes, erreurs ' + out.errors.length); return; }
  const ref = JSON.parse(fs.readFileSync(OUT, 'utf8')); const diffs = [];
  for (const k of new Set([...Object.keys(ref.pages), ...Object.keys(out.pages)])) {
    const a = ref.pages[k] || [], b = out.pages[k] || [];
    if (a.join('\n') !== b.join('\n')) { let i = 0; while (i < a.length && a[i] === b[i]) i++; diffs.push(k + ' : ligne ' + i + '\n   avant : ' + (a[i] || '(rien)') + '\n   après : ' + (b[i] || '(rien)')); }
  }
  for (const k of new Set([...Object.keys(ref.css), ...Object.keys(out.css)])) if ((ref.css[k] || []).join() !== (out.css[k] || []).join()) diffs.push('styles ' + k + ' : ' + (out.css[k] || []).filter(x => !(ref.css[k] || []).includes(x)).join(', '));
  console.log(diffs.length ? 'CADRE CHANGÉ (' + diffs.length + ') :\n' + diffs.slice(0, 30).join('\n') : 'Cadre identique : ' + Object.keys(out.pages).length + ' vues, ' + Object.values(out.pages).reduce((n, l) => n + l.length, 0) + ' lignes, styles identiques.');
  if (out.errors.length) console.log('Erreurs JavaScript : ' + out.errors.length + '\n' + out.errors.slice(0, 5).join('\n'));
  process.exitCode = diffs.length || out.errors.length ? 1 : 0;
}).catch(e => { console.error(e); process.exitCode = 1; });
module.exports = { collect, frame, ZONES };
