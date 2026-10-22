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
/* v8.04 (lot M, Téva : « la fonction qui permet de voir la configuration directement sur la fiche ») : ce que chaque choix de
   « Ma configuration » change sur l'aperçu dessiné par perso-fiche.js (le schéma du modèle, tiré des données de l'Atelier 3D :
   atelier/<famille>/<id>.json) et dans le lien « Ouvrir ma configuration dans l'Atelier 3D ». Chaque réglage est écrit comme
   dans le lien de l'Atelier (atelier-3d.js : fromParams, mêmes clés et mêmes valeurs) ; une clé qui commence par « _ » ne
   sert qu'à l'aperçu de la fiche. p : réglage du poste coché ; o : réglage de chaque option, par son nom français (vérifié
   par check()) ; c : réglage qui reçoit la famille de teinte choisie ; w : réglage qui reçoit la pastille de l'option.
   Les valeurs sont des repères de dessin (teinte des vitres, hauteur de caisse), jamais une donnée de GTA VI. */
const FIN_V = { 'Classique': 'finish=gloss', 'Métallisée': 'finish=metal', 'Métal': 'finish=metal', 'Mate': 'finish=matte', 'Chrome': 'finish=chrome' };
const APERCU = {
  'perso-vehicules': {
    'peinture-principale': { c: 'paint', o: FIN_V }, 'nacre': { p: 'finish=nacre', c: 'pearl' }, 'cameleon': { p: 'finish=cameleon' },
    'peinture-secondaire': { c: 'paint2' }, 'couleur-jantes': { c: 'rim', o: { 'Chromées': 'rim=E4E6EA' } }, 'jantes-donk': { p: 'rimSize=2' },
    'pneus-tout-terrain': { p: 'tyres=tt' }, 'pneus-faible-adherence': { p: 'tyres=slick' }, 'fumee-pneus': { p: '_smoke=B9BCC4', w: '_smoke' },
    'aileron': { p: 'aileron=1', o: { 'Bas': '_ail=lip', 'Haut': '_ail=wing', 'Aile GT': '_ail=gt' } },
    'jupes': { p: 'jupes=1' }, 'capot': { p: 'capot=1' }, 'toit': { p: 'toit=1' }, 'pare-chocs-tout-terrain': { p: 'bullbar=1' }, 'echappement': { p: 'exhaust=1' }, 'arceau': { p: 'arceau=1' },
    'vitres-teintees': { p: 'tint=65', o: { 'Fumé léger': 'tint=50', 'Fumé foncé': 'tint=75', 'Limousine': 'tint=90' } }, 'vitres-noir-pur': { p: 'tint=100' },
    'neons-couleur': { p: 'neon=1', w: 'neonColor' },
    'neons-disposition': { p: 'neon=1', o: { 'Avant': 'neonLayout=front', 'Arrière': 'neonLayout=back', 'Côtés': 'neonLayout=sides', 'Avant et arrière': 'neonLayout=fb', 'Tout le tour': 'neonLayout=all' } },
    'suspension-niveaux': { p: 'susp=-1', o: { 'Rabaissée': 'susp=-1', 'Street': 'susp=-1', 'Sport': 'susp=-2', 'Compétition': 'susp=-2' } }, 'suspension-rehaussee': { p: 'susp=1' },
    'phares-xenon': { p: 'lights=xenon' }, 'phares-couleur': { p: 'lights=color', w: 'lightColor' },
    'plaques': { o: { 'Bleu sur blanc': 'plateStyle=white', 'Jaune sur bleu': 'plateStyle=yellowblue', 'Jaune sur noir': 'plateStyle=yellowblack' } },
    'moteur-ems': { p: 'moteur=1' }, 'freins': { p: 'freins=1' }, 'transmission': { p: 'transmission=1' }, 'turbo': { p: 'turbo=1' }, 'blindage': { p: 'blindage=1' }
  },
  'perso-armes': {
    'teintes': { w: '_col', o: { 'Armée': 'finish=army', 'Vert': 'finish=green', 'Orange': 'finish=orange', 'LSPD': 'finish=lspd', 'Rose': 'finish=pink', 'Or': 'finish=gold', 'Platine': 'finish=platinum' } },
    'finition-doree': { p: 'finish=gold&_col=D4A62A' },
    'camouflages-mk2': { o: { 'Digital': 'camo=digital', 'Coup de pinceau': 'camo=brush', 'Forêt': 'camo=woodland', 'Léopard': 'camo=leopard', 'Zèbre': 'camo=zebra', 'Géométrique': 'camo=geometric' } },
    'motif-vintage-vice-city': { p: 'camo=tropical' }, 'crosses-gravees': { p: 'engrave=1' },
    'chargeur-etendu': { p: 'mag=ext' }, 'chargeur-tambour': { p: 'mag=drum' }, 'chargeur-caisson': { p: 'mag=box' },
    'viseur-holographique': { p: 'sight=holo' }, 'lunette': { p: 'sight=scope' }, 'lunette-montee-pistolet': { p: 'sight=scope' }, 'lunettes-mk2': { p: 'sight=scope2' }, 'lunette-nocturne': { p: 'sight=night' }, 'lunette-thermique': { p: 'sight=thermal' },
    'silencieux': { p: 'barrel=silencer' }, 'compensateur': { p: 'barrel=comp' }, 'freins-de-bouche': { p: 'barrel=brake' }, 'canon-lourd': { p: 'barrel=heavy' },
    'poignee': { p: 'grip=1' }, 'lampe-tactique': { p: 'lamp=1' }, 'laser': { p: 'laser=1' },
    'munitions-tracantes': { p: 'ammo=tracer' }, 'munitions-incendiaires': { p: 'ammo=incend' }, 'munitions-perforantes': { p: 'ammo=ap' }, 'munitions-creuses': { p: 'ammo=hp' }, 'munitions-blindees': { p: 'ammo=fmj' }, 'munitions-explosives': { p: 'ammo=explo' }
  }
};
function apercuOf(fam, it, o) {
  const a = (APERCU[fam] || {})[it.id]; if (!a) return null;
  return { ap: a.p || '', apc: a.c || '', apw: a.w || '', opts: (o.options || []).map(op => (a.o && a.o[op.n]) || '') };
}
function check() {
  const d = C.load(), errors = [];
  /* v8.04 (lot M) : aperçu de « Ma configuration » : chaque poste et chaque option nommés existent dans le catalogue */
  for (const [fam, list] of Object.entries(APERCU)) {
    const items = new Set((d.families[fam] || { items: [] }).items.map(it => it.id));
    for (const [id, a] of Object.entries(list)) {
      if (!items.has(id)) { errors.push('aperçu : poste inconnu « ' + id + ' » (' + fam + ')'); continue; }
      const o = (OPTIONS[fam] || {})[id] || {}, names = new Set((o.options || []).map(op => op.n));
      for (const n of Object.keys(a.o || {})) if (!names.has(n)) errors.push('aperçu : option inconnue « ' + n + ' » (' + id + ')');
      if (a.c && !o.couleurs) errors.push('aperçu : « ' + id + ' » reçoit une famille de teinte sans liste de teintes');
    }
  }
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
    const ap = apercuOf(fam, it, o); /* v8.04 (lot M) : réglages de l'aperçu et du lien de l'Atelier */
    const opts = (o.options || []).map((op, i) => Object.assign({ n: op.n, p: op.p, pmin: op.pmin, pmax: op.pmax, sw: op.swatch || null }, ap && ap.opts[i] ? { ap: ap.opts[i] } : {}));
    return {
      id: it.id, nom: it.nom, cat: it.categorie, st: it.statut, stl: S.STATUS_LABEL[it.statut] || it.statut, desc: it.description, effet: it.effet.texte,
      p6: acc.price, achat: acc.buy,
      rep: rep ? { t: rep, note: it.prix_repere_serie && it.prix_repere_serie.note ? it.prix_repere_serie.note : '' } : null,
      repv: it.prix_repere_serie && (typeof it.prix_repere_serie.valeur === 'number' || typeof it.prix_repere_serie.min === 'number') ? { valeur: typeof it.prix_repere_serie.valeur === 'number' ? it.prix_repere_serie.valeur : undefined, min: it.prix_repere_serie.min, max: it.prix_repere_serie.max } : null,
      ou: it.ou_le_trouver.map(x => x.lieu ? C.place(x.lieu).name : x.type + (x.note ? ' (' + x.note + ')' : '')).join(', '),
      compat: it.compat ? (it.compat.vehicules || it.compat.armes || []) : [], ids: it.compat && it.compat.ids ? it.compat.ids : null,
      jeu: o.jeu || null, opts, couleurs: !!o.couleurs, note: o.note || '', deb: o.deblocage || '',
      lien: it.lien ? { href: it.lien.href, label: it.lien.label } : null,
      url: data.page.slice(1) + '#' + C.rowId(fam, it),
      ...(ap ? { ap: ap.ap, apc: ap.apc, apw: ap.apw } : {})
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
  const catLabel = CATS[kind][item.cat] || item.cat, nSerie = list.filter(p => p.st === 'serie').length, nVi = list.filter(p => p.st === 'officiel' || p.st === 'vu').length;
  const titre = kind === 'vehicules' ? 'Personnaliser ce véhicule' : 'Personnaliser cette arme';
  const quoi = kind === 'vehicules' ? 'un véhicule de la catégorie « ' + catLabel + ' »' : 'une arme de la catégorie « ' + catLabel + ' »';
  /* résumé : une phrase par cas (un seul poste à confirmer, ou la liste), chiffres écrits dans des <b> : chaque phrase est une
     entrée de la mémoire de traduction par catégorie */
  /* v7.86 (référencement) : une phrase fixe et trois chiffres (postes, annoncés ou vus pour GTA VI, repères de la série) au lieu
     d’une longue phrase propre à chaque catégorie, répétée mot pour mot sur toutes ses fiches ; « chaque chiffre dit son jeu »
     reste écrit dans le tableau des postes. */
  const lede = !list.length
    ? 'Aucun poste de personnalisation n’est encore documenté pour ' + quoi + ' : la liste s’allongera avec les annonces de Rockstar.'
    : list.length === 1 && list[0].st === 'conf'
      ? 'Un seul poste pour ' + quoi + ', encore à confirmer : Rockstar n’a rien publié sur sa personnalisation, rien n’est inventé.'
      : (kind === 'vehicules' ? 'Ce que tu pourras modifier sur ce modèle, atelier par atelier : ce que Rockstar a montré pour GTA VI et les repères de GTA V et de GTA Online.' : 'Ce que tu pourras modifier sur cette arme, atelier par atelier : ce que Rockstar a montré pour GTA VI et les repères de GTA V et de GTA Online.');
  const stats = list.length > 1 || (list.length === 1 && list[0].st !== 'conf') ? '<dl class="pf-stats"><div><dt>Postes</dt><dd>' + list.length + '</dd></div><div><dt>Annoncés ou vus pour GTA VI</dt><dd>' + nVi + '</dd></div><div><dt>Repères de la série</dt><dd>' + nSerie + '</dd></div></dl>' : '';
  /* la puce d'atelier : un bouton (le groupe qu'il ouvre est dessiné par perso-fiche.js : pas d'ancre à vérifier) avec le
     pictogramme et le nom ; le compteur est un bloc à part (<div>) : le nom reste une seule entrée de la mémoire, quel que soit le nombre */
  const chips = cats.map(c => { const n = list.filter(p => p.cat === c.id).length; return '<li class="pf-chip-li" style="--ch:' + c.teinte + '"><button type="button" class="pf-chip" data-pf-chip="' + esc(c.id) + '">' + S.icon(c.icon, 'pf-chip-ico') + '<span>' + esc(c.label) + '</span></button><div class="pf-chip-n" aria-hidden="true">' + n + '</div></li>'; }).join('');
  const listHref = '../' + data.page.slice(1) + (kind === 'vehicules' ? '?vehicule=' : '?arme=') + encodeURIComponent(item.id) + '#box-' + fam;
  return '<section class="shell reveal pf" id="personnaliser" data-pf="' + kind + '" data-pf-id="' + esc(item.id) + '" data-pf-cat="' + esc(item.cat) + '" data-pf-name="' + esc(item.name) + '">\n'
    + '  <h2 class="sec-h">' + titre + '</h2>\n'
    /* le résumé et les puces ne portent pas d'apparition propre (la section entre d'un bloc) : le tableau se dessine en dessous
       après coup, et une apparition retardée pouvait rester invisible à l'audit */
    + '  <div class="pf-head"><p class="fiche-txt">' + esc(lede) + '</p>' + stats + '\n'
    /* v7.81 : l'Atelier 3D ouvre ce modèle, prêt à peindre et à équiper. v8.04 (lot M, Téva : « précise que l'Atelier 3D est
       en construction ») : l'étiquette « En construction » accolée au bouton, lue avec lui (aria-describedby) */
    + '  <p class="pf-atelier"><a class="pf-atelier-link" href="../atelier-3d.html?' + (kind === 'vehicules' ? 'v=' : 'a=') + encodeURIComponent(item.id) + '" aria-describedby="pf-wip">' + (kind === 'vehicules' ? 'Essayer ce véhicule dans l’Atelier 3D' : 'Essayer cette arme dans l’Atelier 3D') + '</a><span class="pf-wip" id="pf-wip">En construction</span></p>\n'
    + (cats.length ? '  <ul class="pf-cats" aria-label="Ateliers">' + chips + '</ul>\n' : '') + '</div>\n'
    + '  <div class="pf-board" data-pf-board>' + (list.length ? '<p class="pf-nojs"><a href="' + esc(listHref) + '">Voir ces postes dans la liste des personnalisations</a></p>' : '') + '</div>\n'
    + '</section>';
}
module.exports = { check, posts, forItem, fits, persoData, persoSection, COULEURS, FAM, APERCU };
