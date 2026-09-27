'use strict';
/* v7.41 (lot 4) : zones éditoriales des cinq hubs du monde (lieux, personnages, demeures, planques, entreprises).
   Contenu : outils/editorial-hubs.json. Balisage : outils/sections.cjs (système du lot 3 + frise datée, paires
   fiction ↔ réel, questions ouvertes, cartes d'action, liste de sources). Appelé par outils/lore-gen.js, qui pose la
   zone sous la grille des fiches. Ordre des sections : Rockstar (papier) · Communauté (papier-2, corail) · À confirmer
   (nuit) · Pour toi (papier) · FAQ (papier-2) · Sources et statuts (nuit, corail). */
const fs = require('node:fs'), path = require('node:path');
const S = require('./sections.cjs');
const root = path.resolve(__dirname, '..');
const DATA = JSON.parse(fs.readFileSync(path.join(root, 'outils/editorial-hubs.json'), 'utf8'));
const esc = S.esc;
const HUBS = ['lieux', 'personnages', 'demeures', 'planques', 'entreprises'];

const para = list => (list || []).map(p => '<p>' + esc(p) + '</p>').join('');
const pinsHref = a => a.pins ? 'carte.html#pins=' + a.pins.join(',') + (a.pinsTitle ? '&t=' + encodeURIComponent(a.pinsTitle) : '') : a.href;

function sourcesOf(hub) {
  return (DATA[hub].sources || []).map(id => { const s = DATA.sources[id]; if (!s) throw Error('Source inconnue dans editorial-hubs.json : ' + id); return { id, ...s }; });
}
function faq(items) {
  return S.section({ id: 'faq', num: 5, kicker: 'Questions', title: 'Questions fréquentes', icon: 'faq', tone: 'paper2' },
    '<p>Les questions qu’on tape dans un moteur de recherche, avec des réponses courtes et datées.</p><div class="faq rise">' + items.map(x => '<details><summary>' + esc(x.q) + '</summary><div class="ans">' + esc(x.a) + '</div></details>').join('') + '</div>');
}
function sources(hub) {
  const list = sourcesOf(hub);
  const legend = '<div class="ed-levels">' + DATA.statuts.map(n => '<div class="ed-level"><h3>' + S.pip(n.statut) + esc(n.titre) + '</h3><p>' + esc(n.texte) + '</p></div>').join('') + '</div>';
  return S.section({ id: 'sources', num: 6, kicker: list.length + ' sources ouvertes', title: 'Sources et statuts', icon: 'lire', tone: 'night', accent: 'coral',
    lede: esc('Chaque affirmation de cette page porte un statut et vient d’une page ouverte à la date indiquée. Les pages Rockstar sont citées avec leur dernière ouverture directe ; leurs textes ont été relus le 27 septembre 2026 dans les sources qui les reproduisent.') },
    legend + '<h3 class="ed-h3">Pages consultées</h3>' + S.sourceList(list) + '<div class="ed-callout"><p><strong>Ce qu’on ne fait pas.</strong> Aucune donnée issue des fuites de 2022 ou de 2026, aucun prix inventé, aucun rapprochement présenté comme confirmé. Les statuts sont expliqués dans le <a href="tuto.html#sources">Tuto</a>.</p></div>');
}

/* Rend la zone complète d'un hub. ctx : {label, n} (nom du hub et nombre de fiches, pour les libellés). */
function render(hub, ctx = {}) {
  if (!HUBS.includes(hub)) throw Error('Hub inconnu : ' + hub);
  const D = DATA[hub], srcMap = DATA.sources;
  for (const k of ['nav', 'rockstar', 'communaute', 'confirmer', 'toi', 'faq', 'sources']) if (!D[k]) throw Error('Hub ' + hub + ' : bloc manquant « ' + k + ' »');
  if (D.faq.length < 4 || D.faq.length > 6) throw Error('Hub ' + hub + ' : la FAQ doit compter 4 à 6 questions (' + D.faq.length + ')');
  for (const p of D.communaute.pairs) if (p.src && (!srcMap[p.src] || !D.sources.includes(p.src))) throw Error('Hub ' + hub + ' : source « ' + p.src + ' » inconnue ou absente de la liste des sources du hub');
  for (const a of D.toi.actions) if (!a.href && !a.pins) throw Error('Hub ' + hub + ' : action sans lien « ' + a.t + ' »');
  const out = ['<div class="ed-zone ed-zone--monde">'];
  out.push(S.nav(D.nav, 'Sections de la page ' + (ctx.label || hub)));
  out.push(S.section({ id: 'rockstar', num: 1, kicker: 'Sources officielles', title: 'Ce que Rockstar a montré', icon: 'film', tone: 'paper', lede: esc(D.rockstar.lede) },
    S.timeline(D.rockstar.items) + para(D.rockstar.p)));
  out.push(S.section({ id: 'communaute', num: 2, kicker: 'Observations des joueurs', title: 'Ce que la communauté a identifié', icon: 'loupe', tone: 'paper2', accent: 'coral', lede: esc(D.communaute.lede) },
    S.pairs(D.communaute.pairs, srcMap) + para(D.communaute.p)));
  out.push(S.section({ id: 'a-confirmer', num: 3, kicker: 'Questions ouvertes', title: 'Ce qui reste à confirmer', icon: 'sablier', tone: 'night', lede: esc(D.confirmer.lede) },
    S.pending(D.confirmer.items) + para(D.confirmer.p)));
  out.push(S.section({ id: 'pour-toi', num: 4, kicker: 'Outils du site', title: 'Ce que ça change pour toi', icon: 'boussole', tone: 'paper', lede: esc(D.toi.lede) },
    S.actions(D.toi.actions.map(a => ({ ...a, href: pinsHref(a) }))) + para(D.toi.p)));
  out.push(faq(D.faq));
  out.push(sources(hub));
  out.push('</div>');
  return out.join('\n');
}

/* Nombre de mots du contenu éditorial d'un hub (sections 1 à 5, hors bloc Sources, hors sous-navigation) : pour le
   contrôle « 500 à 800 mots » du lot. */
function words(hub) {
  const D = DATA[hub], parts = [];
  for (const k of ['rockstar', 'communaute', 'confirmer', 'toi']) {
    const s = D[k]; parts.push(s.lede, ...(s.p || []));
    (s.items || []).forEach(x => parts.push(x.titre, x.texte, x.q, x.etat, x.date));
    (s.pairs || []).forEach(x => parts.push(x.fiction, x.reel));
    (s.actions || []).forEach(x => parts.push(x.k, x.t, x.d));
  }
  D.faq.forEach(x => parts.push(x.q, x.a));
  return parts.filter(Boolean).join(' ').match(/[\p{L}\p{N}’'-]+/gu).length;
}
module.exports = { render, words, sourcesOf, HUBS, DATA };
