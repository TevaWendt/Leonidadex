/* ============================================================
   LEONIDAKIT — angles-markup.cjs (v7.80) : le bloc « sous tous les angles » des fiches véhicules et armes.
   Un écran (le schéma de profil, puis les autres angles dessinés par vehicules-angles.cjs / armes-angles.cjs),
   cliquable : chaque clic passe à l'angle suivant avec l'effet d'un écran cathodique qui change de chaîne
   (fiches.css, fiches.js). Les onglets en bas choisissent un angle ; ← → au clavier, glisser au doigt.
   Sans script : le profil est posé, les onglets sont cachés. Les textes sont dans le balisage (traduits par
   outils/langues.cjs) : le script ne porte aucun mot.
   render({id, nom, profil, vues, hint, next, group, desc, dot}) → balisage HTML.
   - profil : la balise <svg> complète du schéma de profil (classe veh-art veh-art--schema)
   - vues : [{id, label, body}] : les autres angles (contenu SVG sans balise <svg>)
   ============================================================ */
'use strict';
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const SVG = (id, body, on) => `<svg class="veh-art veh-art--schema ang-img${on ? ' is-on' : ''}" data-ang-id="${id}" viewBox="0 0 240 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${body}</svg>`;
function render(o) {
  const vues = [{ id: 'profil', label: o.labels.profil }].concat(o.vues.map(v => ({ id: v.id, label: v.label })));
  const n = vues.length;
  /* le schéma de profil existant (avec sa variation propre à la fiche) reçoit les attributs de l'écran */
  const head = (o.profil.match(/^<svg\b[^>]*>/) || [''])[0];
  if (!head) throw new Error('angles-markup : schéma de profil sans balise <svg> (' + o.id + ')');
  const profil = head.replace(/\s*class="[^"]*"/, ' class="veh-art veh-art--schema ang-img is-on" data-ang-id="profil"').replace(/\s*style="[^"]*"/, '') + o.profil.slice(head.length);
  const imgs = profil + o.vues.map(v => SVG(v.id, v.body, false)).join('');
  const tabs = vues.map((v, k) => `<button type="button" class="ang-tab${k === 0 ? ' is-on' : ''}" data-ang-go="${k}" aria-pressed="${k === 0 ? 'true' : 'false'}">${esc(v.label)}</button>`).join('');
  const did = 'ang-desc-' + o.id;
  return `<div class="ang" data-ang data-ang-n="${n}" data-ang-dot="${esc(o.dot)}" aria-describedby="${did}">` +
    `<button type="button" class="ang-view" data-ang-next aria-label="${esc(o.next)}">` +
    `<span class="ang-screen">${imgs}<span class="ang-scan" aria-hidden="true"></span></span>` +
    `<span class="ang-tag" aria-live="polite"><b data-ang-label>${esc(vues[0].label)}</b><span data-ang-count>1/${n}</span></span>` +
    `<span class="ang-hint" aria-hidden="true">${esc(o.hint)}</span>` +
    `</button>` +
    `<div class="ang-tabs" role="group" aria-label="${esc(o.group)}">${tabs}</div>` +
    `<span class="sr-only" id="${did}">${esc(o.desc)}</span>` +
    `</div>`;
}
const TXT = { profil: 'Profil', face: 'Face', arriere: 'Arrière', dessus: 'Dessus', hint: 'Cliquer : angle suivant', next: 'Angle suivant', group: 'Angles du schéma', dot: 'Schéma' };
module.exports = { render, TXT };
