'use strict';
/* v7.73 (lot 3, demande de Téva) : « Personnaliser ce véhicule » / « Personnaliser cette arme » sur chaque fiche de véhicule
   (outils/gen.js) et d'arme (outils/gen-armes.cjs) : les postes de personnalisation du catalogue (outils/catalogues/perso-*.json)
   qui s'appliquent à ce modèle (catégorie, ou arme nommée), rangés par atelier, avec le statut, le prix GTA VI (à confirmer),
   le repère de la série, le déblocage repère, et les sous-listes d'options (outils/catalogues/perso-options.json : finitions,
   niveaux, couleurs). Rien n'est inventé pour GTA VI : chaque chiffre dit son jeu.
   - persoSection(kind, item) : la section statique de la fiche (titre, résumé, ateliers, lien sans script) ;
   - persoData() : window.LK_PERSO (perso-data.js, écrit par gen-acquisitions.cjs), lu par perso-fiche.js pour dessiner le tableau
     des postes et « Ma configuration » (choix enregistrés sur l'appareil, total des repères). */
const fs = require('node:fs'), path = require('node:path');
const C = require('./catalogues.cjs'), S = require('./sections.cjs'), FD = require('./fiche-doc.cjs');
const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const OPTIONS = JSON.parse(fs.readFileSync(path.join(__dirname, 'catalogues', 'perso-options.json'), 'utf8'));
const FAM = { vehicules: 'perso-vehicules', armes: 'perso-armes' };
const CATS = { vehicules: C.VEH_CATS, armes: C.ARM_CATS };
/* familles de teintes de la palette de GTA V (rangées par famille : la liste exacte des teintes n'est pas reproduite) */
const COULEURS = [['Noirs', '#1b1b1f'], ['Gris et argents', '#9da3ad'], ['Rouges', '#c8302a'], ['Roses', '#ef6fae'], ['Oranges', '#f08a24'], ['Jaunes et ors', '#e8c23a'], ['Verts', '#3a9a4f'], ['Bleus', '#2d6bd1'], ['Violets', '#7a3fb8'], ['Bruns et beiges', '#a8835a'], ['Blancs et crèmes', '#f3efe4']];
const fmt = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' $';
function check() {
  const d = C.load(), errors = [];
  for (const [fam, posts] of Object.entries(OPTIONS)) {
    if (fam.startsWith('_')) continue;
    const items = new Map((d.families[fam] || { items: [] }).items.map(it => [it.id, it]));
    for (const [id, o] of Object.entries(posts)) {
      const it = items.get(id);
      if (!it) { errors.push('perso-options : poste inconnu « ' + id + ' » (' + fam + ')'); continue; }
      if (o.options && !o.jeu) errors.push('perso-options : « ' + id + ' » a des options sans jeu repère');
      for (const op of o.options || []) { if (!op.n) errors.push('perso-options : option sans nom (' + id + ')'); if (op.p !== undefined && !(op.p >= 0)) errors.push('perso-options : prix illisible (' + id + ' / ' + op.n + ')'); }
      if (o.jeu && it.prix_repere_serie && it.prix_repere_serie.jeu && it.prix_repere_serie.jeu !== o.jeu && o.options && o.options.some(op => op.p !== undefined)) errors.push('perso-options : « ' + id + ' » : jeu des options (' + o.jeu + ') différent du repère du poste (' + it.prix_repere_serie.jeu + ')');
    }
  }
  return errors;
}
/* les postes d'une famille, en forme compacte (textes déjà présents dans la page du catalogue, donc dans la mémoire de traduction) */
function posts(kind) {
  const fam = FAM[kind], d = C.load(), data = d.families[fam], cats = new Map(data.categories.map(c => [c.id, c]));
  return C.sortItems(data).map(it => {
    const cat = cats.get(it.categorie), acc = FD.accessCell(it), rep = C.repereText(it.prix_repere_serie), o = (OPTIONS[fam] || {})[it.id] || {};
    const opts = (o.options || []).map(op => ({ n: op.n, p: op.p, pmin: op.pmin, pmax: op.pmax, sw: op.swatch || null }));
    return {
      id: it.id, nom: it.nom, cat: it.categorie, st: it.statut, stl: S.STATUS_LABEL[it.statut] || it.statut, desc: it.description, effet: it.effet.texte,
      p6: acc.price, achat: acc.buy,
      rep: rep ? { t: rep, note: it.prix_repere_serie && it.prix_repere_serie.note ? it.prix_repere_serie.note : '' } : null,
      repv: it.prix_repere_serie && (typeof it.prix_repere_serie.valeur === 'number' || typeof it.prix_repere_serie.min === 'number') ? { valeur: typeof it.prix_repere_serie.valeur === 'number' ? it.prix_repere_serie.valeur : undefined, min: it.prix_repere_serie.min, max: it.prix_repere_serie.max } : null,
      ou: it.ou_le_trouver.map(x => x.lieu ? C.place(x.lieu).name : x.type + (x.note ? ' (' + x.note + ')' : '')).join(' · '),
      compat: it.compat ? (it.compat.vehicules || it.compat.armes || []) : [], ids: it.compat && it.compat.ids ? it.compat.ids : null,
      jeu: o.jeu || null, opts, couleurs: !!o.couleurs, note: o.note || '', deb: o.deblocage || '',
      lien: it.lien ? { href: it.lien.href, label: it.lien.label } : null,
      url: data.page.slice(1) + '#' + C.rowId(fam, it)
    };
  });
}
/* un poste va à ce modèle : sa liste d'armes nommées le cite ; sinon sa catégorie (ou son identifiant) est dans sa compatibilité */
function fits(post, item) { return post.ids ? post.ids.includes(item.id) : (post.compat.includes(item.cat) || post.compat.includes(item.id)); }
function forItem(kind, item) { return posts(kind).filter(p => fits(p, item)); }
function persoData() {
  const out = {};
  for (const kind of ['vehicules', 'armes']) {
    const fam = FAM[kind], data = C.load().families[fam];
    out[kind] = { page: data.page.slice(1), cats: data.categories.map(c => { const v = C.catVisual(c); return { id: c.id, label: c.label, h: c.teinte, ico: S.icon(c.icon), img: v ? v.src : null }; }), posts: posts(kind), couleurs: COULEURS.map(([n, sw]) => ({ n, sw })) };
  }
  return out;
}
/* la section statique d'une fiche : résumé chiffré, ateliers (catégories qui ont au moins un poste pour ce modèle), tableau
   dessiné par perso-fiche.js ; sans script, le lien mène à la liste filtrée sur ce modèle */
function persoSection(kind, item) {
  const fam = FAM[kind], data = C.load().families[fam], list = forItem(kind, item), cats = data.categories.filter(c => list.some(p => p.cat === c.id));
  const catLabel = CATS[kind][item.cat] || item.cat, nSerie = list.filter(p => p.st === 'serie').length, nVi = list.filter(p => p.st === 'officiel' || p.st === 'vu').length, nOpts = list.reduce((n, p) => n + p.opts.length + (p.couleurs ? COULEURS.length : 0), 0);
  const titre = kind === 'vehicules' ? 'Personnaliser ce véhicule' : 'Personnaliser cette arme';
  const quoi = kind === 'vehicules' ? 'un véhicule de la catégorie « ' + catLabel + ' »' : 'une arme de la catégorie « ' + catLabel + ' »';
  /* résumé : une phrase par cas (un seul poste à confirmer, ou la liste), chiffres écrits dans des <b> : chaque phrase est une
     entrée de la mémoire de traduction par catégorie */
  const lede = !list.length
    ? 'Aucun poste de personnalisation n’est encore documenté pour ' + quoi + ' : la liste s’allongera avec les annonces de Rockstar.'
    : list.length === 1 && list[0].st === 'conf'
      ? 'Un seul poste pour ' + quoi + ', encore à confirmer : Rockstar n’a rien publié sur sa personnalisation, rien n’est inventé.'
      : list.length + ' postes de personnalisation s’appliquent à ' + quoi + ' : ' + (nVi ? nVi + ' annoncé' + (nVi > 1 ? 's' : '') + ' ou vu' + (nVi > 1 ? 's' : '') + ' pour GTA VI, ' : '') + nSerie + ' repère' + (nSerie > 1 ? 's' : '') + ' de la série (GTA V, GTA Online), ' + nOpts + ' options en sous-listes. Rockstar n’a publié ni prix ni niveau requis pour GTA VI : chaque chiffre dit de quel jeu il vient.';
  /* la puce d'atelier : un bouton (le groupe qu'il ouvre est dessiné par perso-fiche.js : pas d'ancre à vérifier) avec le
     pictogramme et le nom ; le compteur est un bloc à part (<div>) : le nom reste une seule entrée de la mémoire, quel que soit le nombre */
  const chips = cats.map(c => { const n = list.filter(p => p.cat === c.id).length; return '<li class="pf-chip-li" style="--ch:' + c.teinte + '"><button type="button" class="pf-chip" data-pf-chip="' + esc(c.id) + '">' + S.icon(c.icon, 'pf-chip-ico') + '<span>' + esc(c.label) + '</span></button><div class="pf-chip-n" aria-hidden="true">' + n + '</div></li>'; }).join('');
  const listHref = '../' + data.page.slice(1) + (kind === 'vehicules' ? '?vehicule=' : '?arme=') + encodeURIComponent(item.id) + '#box-' + fam;
  return '<section class="shell reveal pf" id="personnaliser" data-pf="' + kind + '" data-pf-id="' + esc(item.id) + '" data-pf-cat="' + esc(item.cat) + '" data-pf-name="' + esc(item.name) + '">\n'
    + '  <h2 class="sec-h">' + titre + '</h2>\n'
    /* le résumé et les puces ne portent pas d'apparition propre (la section entre d'un bloc) : le tableau se dessine en dessous
       après coup, et une apparition retardée pouvait rester invisible à l'audit */
    + '  <div class="pf-head"><p class="fiche-txt">' + esc(lede) + '</p>\n'
    + (cats.length ? '  <ul class="pf-cats" aria-label="Ateliers">' + chips + '</ul>\n' : '') + '</div>\n'
    + '  <div class="pf-board" data-pf-board>' + (list.length ? '<p class="pf-nojs"><a href="' + esc(listHref) + '">Voir ces postes dans la liste des personnalisations</a></p>' : '') + '</div>\n'
    + '</section>';
}
module.exports = { check, posts, forItem, fits, persoData, persoSection, COULEURS, FAM };
