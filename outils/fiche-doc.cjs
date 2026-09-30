'use strict';
/* v7.50 (lot 3) : fiche documentaire commune (véhicules, armes, consommables, vêtements et style, personnalisations).
   La structure vient du modèle commun (outils/modele-donnees.json → LKCalcModel.fiche) : rubriques, champs, unités et
   états vides. Rien n’est inventé : un champ sans source garde son état (« Prix à venir », « Achat à confirmer »,
   « Récupération de vie : à confirmer », « Emplacement à venir », « Ne s’applique pas »…) ; un chiffre d’un autre jeu
   n’est jamais la valeur de GTA VI, il s’affiche à part comme « repère de la série ». Sortie HTML statique, déterministe. */
const M = require('../calculateurs-modele.js');
const V = M.V;
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const nf = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 });
const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
/* état d’un champ → classe et libellé court (même vocabulaire que le calculateur) */
const STATE = { official: 'is-known', measured: 'is-known', estimated: 'is-est', personal: 'is-known', simulated: 'is-sim', example: 'is-sim', series: 'is-wait', unknown: 'is-wait', blank: 'is-wait', unconfirmed: 'is-unconf', na: 'is-na' };
const UNIT_TEXT = { '$': ' $', 'points de vie': ' points de vie', s: ' s', 'km/h': ' km/h', places: ' places', '%': ' %' };
function valueText(v, unite) {
  if (v === true) return 'Oui';
  if (v === false) return 'Non';
  if (typeof v === 'number') return nf.format(v) + (unite && UNIT_TEXT[unite] ? UNIT_TEXT[unite] : unite ? ' ' + unite : '');
  if (Array.isArray(v)) return v.join(', ');
  return String(v);
}
function repereText(r) {
  if (!r) return '';
  const unit = r.unit === 'sante' ? ' % de vie' : r.unit === 'armure' ? ' % d’armure' : r.unit === 'graisse' ? ' de graisse' : '';
  return (typeof r.v === 'number' ? nf.format(r.v) + unit : String(r.v)) + (r.ctx ? ' — ' + r.ctx : '');
}
/* Rendu d’une fiche. opts.level : niveau des titres de rubrique (défaut 3) ; opts.compact : version dans une liste ;
   opts.title : titre de la fiche ; opts.lead : phrase d’introduction. */
function render(categoryId, known, opts = {}) {
  const rubs = M.fiche(categoryId, known || {});
  if (!rubs) throw Error('Catégorie documentaire inconnue : ' + categoryId);
  const h = 'h' + (opts.level || 3);
  let waiting = 0, total = 0;
  const body = rubs.map(r => '<section class="doc-rub"><' + h + ' class="doc-rub-t">' + esc(r.titre) + '</' + h + '><dl class="doc-list">' + r.champs.map(ch => {
    total += 1; if (!ch.known) waiting += 1;
    const cls = STATE[ch.value.s] || 'is-wait';
    const shown = ch.known ? valueText(ch.value.v, ch.unite) : cap(ch.text);
    const badge = ch.known ? '<span class="doc-st">' + esc(V.statusLabel(ch.value)) + '</span>' : '';
    const ctx = ch.value.ctx ? '<small class="doc-ctx">' + esc(ch.value.ctx) + '</small>' : '';
    const rep = ch.repere ? '<small class="doc-rep"><b>Repère de la série :</b> ' + esc(repereText(ch.repere)) + '</small>' : '';
    const note = ch.value.note && !ch.known ? '<small class="doc-ctx">' + esc(ch.value.note) + '</small>' : (!ch.known && ch.note ? '<small class="doc-ctx">' + esc(ch.note) + '</small>' : '');
    return '<div class="doc-row ' + cls + '"><dt>' + esc(ch.label) + '</dt><dd><span class="doc-v">' + esc(shown) + '</span>' + badge + ctx + rep + note + '</dd></div>';
  }).join('') + '</dl></section>').join('');
  const head = opts.title ? '<p class="doc-head"><b>' + esc(opts.title) + '</b> <span class="doc-count">' + (total - waiting) + ' connu' + (total - waiting > 1 ? 's' : '') + ' sur ' + total + '</span></p>' : '';
  return '<div class="doc-fiche' + (opts.compact ? ' doc-fiche--compact' : '') + '" data-doc="' + esc(categoryId) + '">' + head + (opts.lead ? '<p class="doc-lead">' + esc(opts.lead) + '</p>' : '') + '<div class="doc-rubs">' + body + '</div></div>';
}
/* Ce qu’on sait vraiment d’une ligne de catalogue (consommables, style, personnalisations), avec son statut.
   statut du site : officiel / vu → publié par Rockstar ; serie → repère d’un autre jeu ; conf / comm → à confirmer. */
const NOT_BOUGHT = /bonus|livr[ée]e? avec|récompense de mission|partout, à l’arrêt|garde-robe|à la planque|^planque$/i;
function notBought(it) { return it.ou_le_trouver.length > 0 && it.ou_le_trouver.every(o => o.type && NOT_BOUGHT.test(o.type)); }
function statusOf(it) { return it.statut === 'officiel' || it.statut === 'vu' ? 'official' : it.statut === 'serie' ? 'series' : 'estimated'; }
function mk(v, s, ctx) { return s === 'series' ? V.series(v, { ctx: ctx || 'Vu dans un autre jeu de la série, pas dans GTA VI.' }) : s === 'official' ? V.official(v, ctx ? { ctx } : null) : V.estimated(v, ctx ? { ctx } : null); }
/* Une description d’effet écrite par le site n’est pas une donnée officielle : « estimé », ou repère si la ligne vient de la série. */
function describe(text, st) { return st === 'series' ? V.series(text, { ctx: 'Ce que fait l’objet dans un autre jeu de la série.' }) : V.estimated(text, { ctx: 'Description du site d’après les sources citées ; aucun chiffre de GTA VI.' }); }
function whereText(it, placeName) { return it.ou_le_trouver.map(o => o.lieu ? placeName(o.lieu) : o.type).filter(Boolean).join(', '); }
function knownOfRow(fam, it, placeName) {
  const st = statusOf(it), bonus = notBought(it), where = whereText(it, placeName);
  const base = { price: V.unknown(), purchasable: bonus ? V.na('Obtenu autrement qu’en boutique : ' + it.ou_le_trouver.map(o => o.type).join(', ') + '.') : V.unknown() };
  if (bonus) base.price = V.na();
  if (fam === 'consommables') {
    const e = it.effet || {};
    return Object.assign(base, {
      unit: V.unknown(),
      effectType: e.texte ? describe(e.texte, st) : V.unknown(),
      health: typeof e.valeur === 'number' && e.unite === 'sante' && e.jeu ? V.series(e.valeur, { ctx: 'Chiffre de ' + e.jeu + ', pas de GTA VI.', unit: 'sante' }) : V.unknown(),
      duration: V.unknown(), conditions: V.unknown(), limits: V.unknown(),
      location: where ? mk(where, st === 'official' ? 'estimated' : st, st === 'official' ? 'Lieu vu ou annoncé ; la vente de cet objet à cet endroit reste à confirmer.' : null) : V.unknown()
    });
  }
  if (fam === 'coiffures' || fam === 'tatouages' || fam === 'tenues') {
    return Object.assign(base, {
      availability: V.unknown(),
      provenance: bonus ? V.official(it.ou_le_trouver.map(o => o.type).join(', ')) : it.personnage ? mk('Porté par ' + ({ jason: 'Jason', lucia: 'Lucia', 'jason-lucia': 'Jason et Lucia' })[it.personnage] + ' dans un média officiel', 'official') : V.unknown(),
      location: bonus ? V.na() : where ? mk(where, st === 'official' ? 'estimated' : st, st === 'official' ? 'Boutique vue ou annoncée ; la vente de cette pièce à cet endroit reste à confirmer.' : null) : V.unknown(),
      variants: it.variantes && it.variantes.length ? mk(it.variantes.join(', '), st) : V.unknown()
    });
  }
  if (fam === 'perso-vehicules' || fam === 'perso-armes') {
    return Object.assign(base, {
      compat: it.compat ? V.estimated(compatText(it.compat), { ctx: 'D’après la source citée ; à confirmer pour GTA VI.' }) : V.unknown(),
      prereq: V.unknown(),
      effect: it.effet && it.effet.texte ? describe(it.effet.texte, st) : V.unknown(),
      restrictions: V.unknown()
    });
  }
  return base;
}
function compatText(c) { return [...(c.vehicules || []), ...(c.armes || []), ...(c.ids || [])].join(', ') || 'Non précisé'; }
const CATEGORY_OF = { consommables: 'consumable', coiffures: 'style', tatouages: 'style', tenues: 'style', 'perso-vehicules': 'customization', 'perso-armes': 'customization' };
/* Colonne « GTA VI » d’une ligne : prix et achat, dits séparément. */
function accessCell(it) {
  if (notBought(it)) return { price: 'Ne s’achète pas', buy: it.ou_le_trouver.map(o => o.type).join(', ') };
  return { price: M.modele.vides.prix, buy: M.modele.vides.achat };
}
module.exports = { render, knownOfRow, accessCell, notBought, CATEGORY_OF, valueText, esc };
