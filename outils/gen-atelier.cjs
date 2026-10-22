#!/usr/bin/env node
'use strict';
/* ============================================================
   LEONIDAKIT — gen-atelier.cjs (v7.81, v7.84) : la section « Atelier 3D » (atelier-3d.html) et ses données.
   - atelier/vehicules/<id>.json, atelier/armes/<id>.json : silhouettes, vitrages, roues, contour de dessus, feux, tirés des
     schémas du site (outils/svg-polys.cjs). L'Atelier (atelier-3d.js, three.js en vendor/) en construit des volumes : ce
     sont des maquettes bâties sur les schémas Leonidakit, pas les modèles du jeu.
   - atelier-3d.html : la page, avec la liste complète des véhicules et des armes, toutes les options de personnalisation
     (chaque option renvoie au poste du catalogue de Personnalisations, avec le repère de la série quand il existe) et tous
     les textes de l'interface : le script ne porte aucun mot.
   ============================================================ */
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), root = path.resolve(__dirname, '..');
process.chdir(root);
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ctx = { window: {} }; vm.runInNewContext(read('vehicules-data.js') + '\n' + read('armes-data.js'), ctx);
const V = ctx.window.LK_VEHICULES, A = ctx.window.LK_ARMES, VCAT = ctx.window.LK_VEHICULES_CATS, ACAT = ctx.window.LK_ARMES_CATS;
const S = require('./vehicules-schemas.cjs'), VA = require('./vehicules-angles.cjs'), AS = require('./armes-schemas.cjs'), AA = require('./armes-angles.cjs'), SP = require('./svg-polys.cjs');
const C = require('./catalogues.cjs');
const PV = JSON.parse(read('outils/catalogues/perso-vehicules.json')), PA = JSON.parse(read('outils/catalogues/perso-armes.json'));
/* v7.84 : pré-listes de la série (outils/atelier-prelistes.json) */
const PRE = JSON.parse(read('outils/atelier-prelistes.json'));
const nomC = v => (v.marque && v.marque !== 'Marque inconnue' ? v.marque + ' ' : '') + v.nom;
const DP = require('./donnees-publiees.cjs');

/* ---------- données ---------- */
fs.mkdirSync('atelier/vehicules', { recursive: true }); fs.mkdirSync('atelier/armes', { recursive: true });
const TWO = new Set(['sport', 'naked', 'dirt', 'cruiser', 'chopper', 'scooter', 'mobility']); /* motos : une roue par cercle */
let nv = 0, na = 0;
const vIndex = [];
for (const v of V) {
  const svg = S.schema(v, 120); if (!svg) continue;
  const d = S.describe(v), kind = d ? d.kind : 'misc', sub = d && d.o ? (d.o.kind || d.o.style || '') : '';
  const pr = SP.readProfile(svg), ang = VA.angles(v) || {}, T = SP.transformOf(svg);
  const top = ang.dessus ? SP.readTop(ang.dessus, T) : { outline: null, glass: [], plates: [] };
  const face = ang.face ? SP.readFace(ang.face) : null, rear = ang.arriere ? SP.readFace(ang.arriere) : null;
  const o = (d && d.o) || {};
  const out = { id: v.id, nom: nomC(v), cat: v.cat, kind, sub, two: kind === 'bike' || (kind === 'moto' && TWO.has(sub)), era: o.era || null, style: o.style || null, extra: o.extra || [],
    parts: pr.parts, glass: pr.glass, wheels: pr.wheels, lights: pr.lights, top, front: face, rear };
  fs.writeFileSync('atelier/vehicules/' + v.id + '.json', JSON.stringify(out));
  vIndex.push({ id: v.id, nom: nomC(v), cat: v.cat, marque: v.marque, two: out.two, kind }); nv++;
}
const aIndex = [];
for (const a of A) {
  const svg = AS.schema(a.id, 120); if (!svg) continue;
  const pr = SP.readProfile(svg, { wheelMin: 99, minArea: 4 }), g = AA.angles(a.id) || {};
  const top = g.dessus ? SP.readTop(g.dessus) : { outline: null, glass: [] };
  /* bouche du canon : point le plus à droite des silhouettes, à mi-hauteur de la pièce la plus longue */
  let muzzle = [0, 60], best = 0;
  for (const p of pr.parts) { const b = SP.bbox(p); if (b.x1 > best) { best = b.x1; muzzle = [b.x1, Math.round((b.y0 + b.y1) / 2 * 10) / 10]; } }
  const out = { id: a.id, nom: a.nom, cat: a.cat, parts: pr.parts, hl: pr.lights, muzzle, top };
  fs.writeFileSync('atelier/armes/' + a.id + '.json', JSON.stringify(out));
  aIndex.push({ id: a.id, nom: a.nom, cat: a.cat }); na++;
}
/* fichiers d'un modèle disparu : retirés */
for (const [dir, idx] of [['atelier/vehicules', vIndex], ['atelier/armes', aIndex]]) { const keep = new Set(idx.map(x => x.id + '.json')); for (const f of fs.readdirSync(dir)) if (!keep.has(f)) fs.unlinkSync(path.join(dir, f)); }

/* ---------- options : chaque option de l'Atelier renvoie à un poste du catalogue ---------- */
const itemV = Object.fromEntries(PV.items.map(it => [it.id, it])), itemA = Object.fromEntries(PA.items.map(it => [it.id, it]));
const prix = it => it && it.prix_repere_serie && typeof it.prix_repere_serie.valeur === 'number' ? it.prix_repere_serie.valeur : null;
const fmt = n => DP.fmt(n) + ' $';
const VCATS = ['berline', 'sport', 'supercar', 'muscle', 'suv', 'pickup', 'van', 'service', 'divers', 'moto', 'bateau', 'avion', 'helicoptere'];
const ACATS = ['pistolet', 'pm', 'assaut', 'precision', 'mitrailleuse', 'pompe', 'melee', 'projectile', 'speciale'];
/* lien vers le poste du catalogue (ligne de la liste des Personnalisations) et son repère de la série */
function poste(fam, id) {
  const it = (fam === 'v' ? itemV : itemA)[id]; if (!it) throw new Error('gen-atelier : poste inconnu ' + id);
  const p = prix(it), compat = fam === 'v' ? (it.compat.vehicules || []) : (it.compat.armes || []);
  return { id, nom: it.nom, prix: p, compat, href: 'personnalisations.html#perso-' + (fam === 'v' ? 'vehicules' : 'armes') + '-' + id, statut: it.statut };
}
const link = p => '<li><a class="at-poste" href="' + esc(p.href) + '" data-at-prix="' + (p.prix === null ? '' : p.prix) + '"><span class="at-poste-n">' + esc(p.nom) + '</span><span class="at-poste-p">' + (p.prix === null ? 'repère à venir' : 'repère de la série : ' + esc(fmt(p.prix))) + '</span></a></li>';
const SW = [['noir', '#1A1A1E', 'Noir Vice'], ['blanc', '#F4F1EA', 'Blanc nacré'], ['gris', '#8A8C92', 'Gris titane'], ['rouge', '#E8452C', 'Rouge Leonida'], ['orange', '#F28C28', 'Orange sunset'], ['jaune', '#F5C542', 'Jaune Keys'], ['vert', '#2E8B57', 'Vert Everglades'], ['bleu', '#2F6FE0', 'Bleu océan'], ['rose', '#F06AA8', 'Rose Vice'], ['violet', '#5B3A9E', 'Violet nuit'], ['or', '#C9A227', 'Or'], ['cyan', '#38C7D4', 'Turquoise']];
const swatches = (k, def, label = '') => '<div class="at-sw" role="group"' + (label ? ' data-label="' + esc(label) + '" aria-label="' + esc(label) + '"' : '') + '>' + SW.map(([id, hex, nom]) => '<label class="at-sw-i" title="' + esc(nom) + '"><input type="radio" name="' + k + '" value="' + hex.slice(1) + '"' + (id === def ? ' checked' : '') + ' data-at-k="' + k + '" aria-label="' + esc(nom) + '"><span style="--sw:' + hex + '"></span></label>').join('') + '<label class="at-sw-c"><span>Autre</span><input type="color" value="#E8452C" data-at-k="' + k + '" aria-label="Couleur libre"></label></div>';
const radios = (k, list, def, label = '') => '<div class="at-rad" role="group"' + (label ? ' data-label="' + esc(label) + '" aria-label="' + esc(label) + '"' : '') + '>' + list.map(([v, l]) => '<label class="at-rad-i"><input type="radio" name="' + k + '" value="' + v + '"' + (v === def ? ' checked' : '') + ' data-at-k="' + k + '"><span>' + esc(l) + '</span></label>').join('') + '</div>';
const check = (k, l, compat, fam) => '<label class="at-chk" data-at-compat="' + esc(compat.join(' ')) + '"><input type="checkbox" data-at-k="' + k + '" value="1"><span>' + esc(l) + '</span></label>';
const opt = (fam, id, titre, body, compat, postes) => '<fieldset class="at-opt" id="at-' + fam + '-' + id + '" data-at-opt="' + id + '" data-at-fam="' + fam + '" data-at-compat="' + esc(compat.join(' ')) + '"><legend>' + esc(titre) + '</legend>' + body + (postes.length ? '<ul class="at-postes">' + postes.map(link).join('') + '</ul>' : '') + '</fieldset>';
const ALL = VCATS.filter(c => !['bateau', 'avion', 'helicoptere'].includes(c));
/* catégories de menu (véhicules) */
const INT = ALL.filter(c => c !== 'moto'); /* v7.84 : l'habitacle (voitures, utilitaires, poids lourds) */
const note = t => '<p class="at-opt-note">' + esc(t) + '</p>';
const VMENU = [
  ['peinture', 'Peinture', [
    opt('v', 'paint', 'Peinture principale', swatches('paint', 'rouge', 'Couleur') + radios('finish', [['gloss', 'Brillante'], ['matte', 'Mate'], ['metal', 'Métallisée'], ['chrome', 'Chromée'], ['nacre', 'Nacrée'], ['cameleon', 'Caméléon']], 'gloss', 'Finition') + swatches('pearl', null, 'Reflet (finition nacrée)'), VCATS, [poste('v', 'peinture-principale'), poste('v', 'nacre'), poste('v', 'cameleon')]),
    opt('v', 'paint2', 'Peinture secondaire (accessoires, aileron, rétroviseurs)', swatches('paint2', 'noir'), VCATS, [poste('v', 'peinture-secondaire')]),
    opt('v', 'stripes', 'Livrée', check('stripes', 'Deux bandes sur le capot et le toit', ALL, 'v') + swatches('stripeColor', 'blanc', 'Couleur des bandes') + radios('camo', [['none', 'Aucun'], ['foret', 'Forêt'], ['desert', 'Désert'], ['urbain', 'Urbain'], ['numerique', 'Numérique'], ['neige', 'Neige'], ['marine', 'Marine']], 'none', 'Camouflage (motif générique)'), ALL, [poste('v', 'livrees-serie')])
  ]],
  ['jantes', 'Jantes et pneus', [
    opt('v', 'rims', 'Jantes', swatches('rim', 'gris', 'Couleur des jantes') + radios('rimSize', [['-1', 'Petites'], ['0', 'D’origine'], ['1', 'Grandes'], ['2', 'Surdimensionnées (donk)']], '0', 'Taille des jantes') + radios('rimStyle', [['five', 'Cinq branches'], ['multi', 'Multibranches'], ['mesh', 'Nid d’abeille'], ['wire', 'Rayons fins'], ['steelie', 'Tôle'], ['disc', 'Pleine']], 'five', 'Style de jante (générique)'), ALL, [poste('v', 'couleur-jantes'), poste('v', 'jantes-familles'), poste('v', 'jantes-donk')]),
    opt('v', 'tyres', 'Pneus', radios('tyres', [['std', 'Route'], ['tt', 'Tout-terrain (larges)'], ['slick', 'Faible adhérence (fins)']], 'std') + radios('tyreWall', [['none', 'Noirs'], ['white', 'Flanc blanc'], ['whiteline', 'Ligne blanche'], ['redline', 'Ligne rouge'], ['blueline', 'Ligne bleue']], 'none', 'Flancs'), ALL, [poste('v', 'pneus-tout-terrain'), poste('v', 'pneus-faible-adherence'), poste('v', 'pneus-pare-balles'), poste('v', 'pneus-flancs')])
  ]],
  ['carrosserie', 'Carrosserie', [
    opt('v', 'body', 'Pièces', [check('aileron', 'Aileron', ALL), check('jupes', 'Jupes latérales', ALL), check('capot', 'Prise d’air sur le capot', ALL), check('toit', 'Barres de toit', ALL), check('bullbar', 'Pare-chocs tout-terrain', ['pickup', 'suv']), check('exhaust', 'Double échappement', [...ALL]), check('arceau', 'Arceau', ALL)].join(''), ALL, [poste('v', 'aileron'), poste('v', 'jupes'), poste('v', 'capot'), poste('v', 'toit'), poste('v', 'pare-chocs-tout-terrain'), poste('v', 'echappement'), poste('v', 'arceau')])
  ]],
  ['vitres', 'Vitres', [
    opt('v', 'tint', 'Teinte des vitres', '<label class="at-range"><span>Teinte</span><input type="range" min="0" max="100" value="35" step="5" data-at-k="tint"><output data-at-out="tint">35 %</output></label>', ALL, [poste('v', 'vitres-teintees'), poste('v', 'vitres-noir-pur')])
  ]],
  ['neons', 'Néons', [
    opt('v', 'neon', 'Néons sous la caisse', check('neon', 'Néons allumés', ALL) + swatches('neonColor', 'rose', 'Couleur des néons') + radios('neonLayout', [['all', 'Tout le tour'], ['front', 'À l’avant'], ['back', 'À l’arrière'], ['sides', 'Sur les côtés'], ['fb', 'Avant et arrière'], ['fs', 'Avant et côtés'], ['bs', 'Arrière et côtés']], 'all', 'Disposition'), ALL, [poste('v', 'neons-couleur'), poste('v', 'neons-disposition')])
  ]],
  ['suspension', 'Suspension', [
    opt('v', 'susp', 'Hauteur de caisse', radios('susp', [['-2', 'Rabaissée (course)'], ['-1', 'Rabaissée (street)'], ['0', 'D’origine'], ['1', 'Rehaussée']], '0'), ALL, [poste('v', 'suspension-niveaux'), poste('v', 'suspension-rehaussee'), poste('v', 'hydrauliques')])
  ]],
  ['phares', 'Phares', [
    opt('v', 'lights', 'Phares', radios('lights', [['off', 'Éteints'], ['halo', 'Halogène'], ['xenon', 'Xénon'], ['color', 'De couleur']], 'halo') + swatches('lightColor', 'cyan', 'Couleur des phares'), VCATS, [poste('v', 'phares-xenon'), poste('v', 'phares-couleur')])
  ]],
  ['plaques', 'Plaque', [
    opt('v', 'plate', 'Plaque d’immatriculation', '<label class="at-text"><span>Texte (8 caractères)</span><input type="text" maxlength="8" value="LEONIDA" data-at-k="plate" autocomplete="off" spellcheck="false"></label>' + radios('plateStyle', [['blue', 'Bleue Leonida'], ['white', 'Blanche'], ['yellow', 'Jaune'], ['black', 'Noire'], ['yellowblue', 'Jaune sur bleu'], ['yellowblack', 'Jaune sur noir']], 'blue', 'Style de plaque'), ALL, [poste('v', 'plaques')])
  ]],
  /* v7.84 (Téva : « la vue intérieure… on va pouvoir aussi modifier l'intérieur ») : habitacle générique, teintes et pièces */
  ['interieur', 'Intérieur', [
    opt('v', 'trim', 'Habillage (sièges, portes, tableau de bord)', swatches('trim', 'noir', 'Couleur d’habillage'), INT, [poste('v', 'interieur-rideout'), poste('v', 'interieur-bennys')]),
    opt('v', 'accent', 'Accents (cadrans, surpiqûres)', swatches('accent', 'blanc', 'Couleur d’accent'), INT, []),
    opt('v', 'seats', 'Sièges et volant', radios('seats', [['std', 'D’origine'], ['bucket', 'Baquets'], ['bench', 'Banquette']], 'std', 'Sièges') + radios('wheel', [['std', 'D’origine'], ['sport', 'Sport'], ['race', 'Course']], 'std', 'Volant') + '<p class="at-opt-go"><button type="button" class="at-go" data-at-go="interieur">Voir l’intérieur</button></p>', INT, [])
  ]],
  ['klaxons', 'Klaxons', [
    opt('v', 'horn', 'Klaxon', note('Pas de son dans l’Atelier : les 46 klaxons de GTA V et de GTA Online sont dans la pré-liste, sous la maquette.'), ALL, [poste('v', 'klaxons'), poste('v', 'klaxons-boucle')])
  ]],
  ['perfs', 'Performances', [
    opt('v', 'perf', 'Sans effet visible, comptés dans le total', [check('turbo', 'Turbo', ALL), check('moteur', 'Moteur (EMS)', ALL), check('freins', 'Freins', ALL), check('transmission', 'Transmission', ALL), check('blindage', 'Blindage', ALL)].join(''), ALL, [poste('v', 'turbo'), poste('v', 'moteur-ems'), poste('v', 'freins'), poste('v', 'transmission'), poste('v', 'blindage')])
  ]]
];
const GUNS = ['pistolet', 'pm', 'assaut', 'precision', 'mitrailleuse', 'pompe'];
const AMENU = [
  ['finitions', 'Finition', [
    opt('a', 'finish', 'Finition', radios('finish', [['black', 'Noir d’usine'], ['green', 'Vert'], ['army', 'Vert armée'], ['orange', 'Orange'], ['lspd', 'Bleu LSPD'], ['pink', 'Rose'], ['gold', 'Or'], ['platinum', 'Platine'], ['chrome', 'Chrome'], ['custom', 'Autre']], 'black') + '<label class="at-sw-c at-sw-c--alone"><span>Couleur libre</span><input type="color" value="#E8452C" data-at-k="finishColor" aria-label="Couleur libre"></label>', ACATS, [poste('a', 'teintes'), poste('a', 'teintes-mk2'), poste('a', 'finition-doree')]),
    opt('a', 'camo', 'Camouflage', radios('camo', [['none', 'Aucun'], ['woodland', 'Forêt'], ['desert', 'Désert'], ['tropical', 'Tropical (palmiers)'], ['urban', 'Urbain'], ['digital', 'Numérique'], ['brush', 'Coup de pinceau'], ['leopard', 'Léopard'], ['zebra', 'Zèbre'], ['geometric', 'Géométrique']], 'none'), GUNS, [poste('a', 'camouflages-mk2'), poste('a', 'motif-vintage-vice-city')]),
    opt('a', 'engrave', 'Gravures', check('engrave', 'Crosse gravée de palmiers', ['pistolet']), ['pistolet'], [poste('a', 'crosses-gravees')])
  ]],
  ['chargeurs', 'Chargeurs', [
    opt('a', 'mag', 'Chargeur', radios('mag', [['std', 'D’origine'], ['ext', 'Étendu'], ['drum', 'Tambour'], ['box', 'Caisson (100 coups)']], 'std'), GUNS, [poste('a', 'chargeur-etendu'), poste('a', 'chargeur-tambour'), poste('a', 'chargeur-caisson')])
  ]],
  ['viseurs', 'Viseurs', [
    opt('a', 'sight', 'Viseur ou lunette', radios('sight', [['none', 'Organes de visée'], ['holo', 'Viseur holographique'], ['scope', 'Lunette'], ['scope2', 'Grande lunette'], ['night', 'Vision nocturne'], ['thermal', 'Thermique']], 'none'), GUNS, [poste('a', 'viseur-holographique'), poste('a', 'lunette'), poste('a', 'lunettes-mk2'), poste('a', 'lunette-montee-pistolet'), poste('a', 'lunette-nocturne'), poste('a', 'lunette-thermique')])
  ]],
  ['canons', 'Canon', [
    opt('a', 'barrel', 'Bout du canon', radios('barrel', [['std', 'D’origine'], ['silencer', 'Silencieux'], ['comp', 'Compensateur'], ['brake', 'Frein de bouche'], ['heavy', 'Canon lourd']], 'std'), GUNS, [poste('a', 'silencieux'), poste('a', 'compensateur'), poste('a', 'freins-de-bouche'), poste('a', 'canon-lourd')])
  ]],
  ['accessoires', 'Accessoires', [
    opt('a', 'acc', 'Poignée, lampe, laser', [check('grip', 'Poignée', ['assaut', 'precision', 'mitrailleuse', 'pm', 'pompe']), check('lamp', 'Lampe tactique', GUNS), check('laser', 'Laser', GUNS)].join(''), GUNS, [poste('a', 'poignee'), poste('a', 'lampe-tactique'), poste('a', 'laser')])
  ]],
  ['munitions', 'Munitions', [
    opt('a', 'ammo', 'Munitions spéciales (sans effet visible, comptées dans le total)', radios('ammo', [['std', 'Standard'], ['tracer', 'Traçantes'], ['incend', 'Incendiaires'], ['ap', 'Perforantes'], ['hp', 'Pointe creuse'], ['fmj', 'Blindées'], ['explo', 'Explosives']], 'std'), GUNS, [poste('a', 'munitions-tracantes'), poste('a', 'munitions-incendiaires'), poste('a', 'munitions-perforantes'), poste('a', 'munitions-creuses'), poste('a', 'munitions-blindees'), poste('a', 'munitions-explosives'), poste('a', 'munitions-gta6-conf')])
  ]]
];
const menu = (fam, M) => '<nav class="at-cats" data-at-cats="' + fam + '" aria-label="' + (fam === 'v' ? 'Ateliers du véhicule' : 'Ateliers de l’arme') + '"><ul>' + M.map(([id, l], k) => '<li><button type="button" class="at-cat' + (k === 0 ? ' is-on' : '') + '" data-at-cat="' + id + '" aria-pressed="' + (k === 0) + '">' + esc(l) + '</button></li>').join('') + '</ul></nav>' +
  '<div class="at-opts" data-at-opts="' + fam + '">' + M.map(([id, l, opts], k) => '<div class="at-group' + (k === 0 ? ' is-on' : '') + '" data-at-group="' + id + '"' + (k === 0 ? '' : ' hidden') + '>' + opts.join('') + '</div>').join('') + '</div>';

/* ---------- v7.84 : pré-listes de la série (Téva : « des pré-listes qu'on peut cliquer pour voir la liste qui va arriver,
   camouflages, etc., qu'on peut appliquer à la voiture, à la moto ») ----------
   Une section sous la maquette : un onglet par atelier qui a des listes (synchronisé avec le menu), une carte par liste
   (titre, nombre, jeu de référence, « GTA VI : à venir ») qui s'ouvre d'un clic. Le contenu de chaque liste est dans un
   <template> : rien n'est mis en page avant l'ouverture (la page reste légère). Un élément qui s'essaie est un bouton
   (data-at-set : réglages de la maquette) ; les autres sont du texte. Noms du jeu : en anglais (lang="en", translate="no",
   jamais traduits) ou libellés officiels français (traduits par la mémoire, outils/langues/<l>/v784-jeu.json). */
const PRE_SRC = Object.assign({}, PRE.sources);
const setAttr = set => Object.entries(set).map(([k, v]) => k + ':' + v).join(',');
const preItem = (x, langue, type) => {
  const en = langue === 'en' && !x.fr, nm = en ? '<span lang="en" translate="no">' + esc(x.n) + '</span>' : '<span>' + esc(x.n) + '</span>';
  const swb = x.hex ? '<i class="at-pi-sw" style="--sw:#' + esc(x.hex) + '"></i>' : '';
  const extra = type === 'fin' && x.armes ? '<ul class="at-pi-armes">' + x.armes.map(a => '<li>' + esc(a) + '</li>').join('') + '</ul>' : '';
  if (x.set) return '<li><button type="button" class="at-pi at-pi--try" data-at-set="' + esc(setAttr(x.set)) + '" aria-pressed="false">' + swb + nm + '</button></li>';
  return '<li class="at-pi' + (extra ? ' at-pi--fin' : '') + '">' + swb + nm + extra + '</li>';
};
const preItems = (items, langue, type) => '<ul class="at-pl-items at-pl-items--' + (type === 'sw' ? 'sw' : type === 'fin' ? 'fin' : 'txt') + '">' + items.map(x => preItem(x, langue, type)).join('') + '</ul>';
const preList = L => {
  const id = 'at-pl-' + L.id;
  const body = '<p class="at-pl-note">' + esc(L.note) + '</p>' +
    (L.items ? preItems(L.items, L.langue, L.type) : '') +
    (L.sous ? L.sous.map(S0 => '<div class="at-pl-sub"><h4 class="at-pl-sub-t"><span' + (/^[A-Z0-9]/.test(S0.titre) && L.id === 'jantes-familles' ? ' lang="en" translate="no"' : '') + '>' + esc(S0.titre) + '</span> <small>' + esc(S0.compte) + '</small></h4>' + (S0.note ? '<p class="at-pl-sub-note">' + esc(S0.note) + '</p>' : '') + preItems(S0.items, L.langue, L.type) + '</div>').join('') : '') +
    '<p class="at-pl-src">Sources : ' + L.sources.map(k => { const s = PRE_SRC[k]; if (!s) throw new Error('gen-atelier : source inconnue ' + k); return '<a href="' + esc(s.url) + '" target="_blank" rel="noopener nofollow">' + esc(s.titre) + '</a>'; }).join(' ; ') + '</p>';
  return '<article class="at-pl" data-at-pl="' + esc(L.id) + '"' + (L.compat ? ' data-at-compat="' + esc(L.compat.join(' ')) + '"' : '') + (L.ids ? ' data-at-ids="' + esc(L.ids.join(' ')) + '"' : '') + '>' +
    '<button type="button" class="at-pl-b" aria-expanded="false" aria-controls="' + id + '"><span class="at-pl-t">' + esc(L.titre) + '</span><span class="at-pl-m"><span class="at-pl-n">' + esc(L.compte) + '</span><span class="at-pl-g">' + esc(L.jeu) + '</span></span><span class="at-pl-s">GTA VI : à venir</span></button>' +
    '<div class="at-pl-body" id="' + id + '" hidden><template data-at-pl-tpl>' + body + '</template></div></article>';
};
const preFam = (fam, M) => {
  const groups = M.filter(([g]) => PRE.listes.some(L => L.fam === fam && L.groupe === g));
  return '<div class="at-pre-fam" data-at-pre-fam="' + fam + '"' + (fam === 'v' ? '' : ' hidden') + '>' +
    '<div class="at-pre-tabs" role="group" aria-label="' + (fam === 'v' ? 'Ateliers du véhicule' : 'Ateliers de l’arme') + '">' + groups.map(([g, l], k) => '<button type="button" class="at-pre-tab' + (k === 0 ? ' is-on' : '') + '" data-at-pre-tab="' + g + '" aria-pressed="' + (k === 0) + '">' + esc(l) + '</button>').join('') + '</div>' +
    M.map(([g]) => { const lists = PRE.listes.filter(L => L.fam === fam && L.groupe === g); return '<div class="at-pre-group" data-at-pre-group="' + g + '"' + (g === groups[0][0] ? '' : ' hidden') + '>' + (lists.length ? lists.map(preList).join('') : '<p class="at-pre-none">Pas de pré-liste pour cet atelier : ses options suffisent à la maquette.</p>') + '</div>'; }).join('') +
    '</div>';
};
const preCount = PRE.listes.reduce((n, L) => n + (L.items ? L.items.length : 0) + (L.sous ? L.sous.reduce((m, S0) => m + S0.items.length, 0) : 0), 0);
for (const L of PRE.listes) if (![...VMENU, ...AMENU].some(([g]) => g === L.groupe)) throw new Error('gen-atelier : atelier inconnu pour la pré-liste ' + L.id);
const preSection = '<section class="at-pre" data-at-pre aria-labelledby="at-pre-t"><div class="at-pre-head"><h2 class="at-pre-t" id="at-pre-t">Pré-listes de la série</h2><p class="at-pre-lede">Ce que GTA V et GTA Online proposent, atelier par atelier, en attendant les listes de GTA VI. Chaque liste s’ouvre d’un clic ; les pastilles et les noms soulignés s’essaient sur la maquette.</p></div>' + preFam('v', VMENU) + preFam('a', AMENU) + '</section>';

/* ---------- la page ---------- */
const base = read('a-propos.html'), header = base.match(/<header>[\s\S]*?<\/header>/)[0].replace(/ class="here"/g, '').replace(/ aria-current="page"/g, ''), footer = base.match(/<footer>[\s\S]*?<\/footer>/)[0], favicon = base.match(/<link rel="icon"[^>]*>/)[0];
const byCat = (idx, cats, labels) => cats.filter(c => idx.some(x => x.cat === c)).map(c => '<optgroup label="' + esc(labels[c] || c) + '">' + idx.filter(x => x.cat === c).sort((a, b) => a.nom.localeCompare(b.nom, 'fr')).map(x => '<option value="' + esc(x.id) + '">' + esc(x.nom) + '</option>').join('') + '</optgroup>').join('');
const listV = vIndex.slice().sort((a, b) => a.nom.localeCompare(b.nom, 'fr')).map(x => '<li><button type="button" class="at-item" data-at-pick="v" data-at-id="' + esc(x.id) + '" data-at-cat="' + esc(x.cat) + '"><span class="at-item-n">' + esc(x.nom) + '</span><span class="at-item-c">' + esc(VCAT[x.cat] || x.cat) + '</span></button></li>').join('');
const listA = aIndex.slice().sort((a, b) => a.nom.localeCompare(b.nom, 'fr')).map(x => '<li><button type="button" class="at-item" data-at-pick="a" data-at-id="' + esc(x.id) + '" data-at-cat="' + esc(x.cat) + '"><span class="at-item-n">' + esc(x.nom) + '</span><span class="at-item-c">' + esc(ACAT[x.cat] || x.cat) + '</span></button></li>').join('');
const catSel = (fam, cats, labels, idx) => '<select class="at-catsel" data-at-catsel="' + fam + '" aria-label="' + (fam === 'v' ? 'Catégorie de véhicule' : 'Catégorie d’arme') + '"><option value="">Toutes les catégories</option>' + cats.filter(c => idx.some(x => x.cat === c)).map(c => '<option value="' + c + '">' + esc(labels[c] || c) + '</option>').join('') + '</select>';
const first = vIndex.find(x => x.id === 'pegassi-zentorno') || vIndex[0];
/* v8.04 (lot M, Téva : « précise que l'Atelier 3D est en construction ») : bandeau « En construction » sous l'en-tête de la
   page (section at-wip) : ce qui marche déjà, ce qui arrive ; le lien du menu (outils/site-shell.cjs) et les boutons des
   fiches (outils/perso-fiche.cjs) portent la même étiquette. */
const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>GTA VI personnalisation de voiture et d’arme : l’Atelier 3D | Leonidakit</title>
<meta name="description" content="Personnalise chaque voiture et chaque arme de GTA 6 en 3D : peinture, jantes, néons, plaque, viseurs. ${nv} véhicules et ${na} armes, dans ton navigateur.">
<link rel="canonical" href="https://www.leonidakit.com/atelier-3d.html">
<script type="application/ld+json">{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"Accueil","item":"https://www.leonidakit.com/"},{"@type":"ListItem","position":2,"name":"Personnalisations","item":"https://www.leonidakit.com/personnalisations.html"},{"@type":"ListItem","position":3,"name":"Atelier 3D","item":"https://www.leonidakit.com/atelier-3d.html"}]}</script>
<meta property="og:title" content="Atelier 3D Leonidakit : personnalise les véhicules et les armes de GTA VI">
<meta property="og:description" content="${nv} véhicules, ${na} armes, toutes les options de personnalisation, en 3D, reliées aux postes du catalogue.">
<meta property="og:type" content="website">
<meta property="og:locale" content="fr_FR">
<meta property="og:url" content="https://www.leonidakit.com/atelier-3d.html">
<meta property="og:image" content="https://www.leonidakit.com/img/social-card.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#FDFBF7">
${favicon}
<link rel="stylesheet" href="style.css">
<link rel="stylesheet" href="atelier-3d.css">
<link rel="modulepreload" href="vendor/three.atelier.min.js">
</head>
<body class="at-page">
<a class="skip" href="#main">Aller au contenu</a>
<div class="sunset" aria-hidden="true"></div>
${header}
<main id="main">
<section class="shell at-hero">
  <nav class="crumbs" aria-label="Fil d’Ariane"><a href="index.html">Accueil</a> <span class="crumbs-sep" aria-hidden="true"></span> <a href="personnalisations.html">Personnalisations</a> <span class="crumbs-sep" aria-hidden="true"></span> Atelier 3D</nav>
  <div class="at-hero-in">
    <div class="at-hero-txt">
      <p class="fiche-cat">Personnalisations</p>
      <h1>Atelier 3D</h1>
      <p class="lede">Choisis un véhicule ou une arme, fais-le tourner, peins-le, équipe-le, monte à bord. Chaque option renvoie au poste de personnalisation du catalogue, avec le repère de la série quand il existe ; les pré-listes donnent, atelier par atelier, ce que GTA V et GTA Online proposent. Les volumes sont des maquettes bâties sur les schémas Leonidakit, pas les modèles du jeu.</p>
    </div>
    <ul class="at-facts" aria-label="L’Atelier en bref"><li><b>${nv}</b><span>véhicules</span></li><li><b>${na}</b><span>armes</span></li><li><b>${PV.items.length + PA.items.length}</b><span>postes du catalogue reliés</span></li><li><b>${preCount}</b><span>éléments en pré-liste</span></li><li><b>0</b><span>modèle inventé</span></li></ul>
  </div>
</section>

<section class="shell at-wip" aria-labelledby="at-wip-t">
  <div class="at-wip-box">
    <div class="at-wip-head"><p class="at-wip-tag">En construction</p><h2 class="at-wip-t" id="at-wip-t">L’Atelier 3D est en construction</h2><p class="at-wip-lede">Tu peux déjà t’en servir : il s’enrichit à chaque mise à jour du site.</p></div>
    <div class="at-wip-cols">
      <div class="at-wip-col"><h3>Ce qui marche déjà</h3><ul><li>Tous les véhicules et toutes les armes du site, à faire tourner et à regarder de profil, de face, de dessus ou de l’intérieur</li><li>Peinture, jantes, néons, vitres, plaque et pièces de carrosserie ; finition, viseur, canon et chargeur pour les armes</li><li>Les pré-listes de GTA V et de GTA Online, à essayer sur la maquette</li><li>Ta configuration enregistrée sur cet appareil, en lien à copier ou en image ; celle cochée sur une fiche s’ouvre ici d’un clic</li></ul></div>
      <div class="at-wip-col at-wip-col--next"><h3>Ce qui arrive</h3><ul><li>Les options, les teintes et les prix de GTA VI dès que Rockstar les publie : en attendant, les repères viennent de GTA V et de GTA Online</li><li>Des maquettes plus fidèles, modèle par modèle, au fil des mises à jour : aujourd’hui, ce sont des volumes bâtis sur les schémas du site, pas les modèles du jeu</li></ul></div>
    </div>
  </div>
</section>

<section class="shell at" id="atelier" data-at data-at-first="${esc(first.id)}">
  <div class="at-pick" data-at-pick>
    <div class="at-fam" role="tablist" aria-label="Famille"><button type="button" role="tab" class="at-fam-b is-on" data-at-fam-b="v" aria-selected="true">Véhicules <small>${nv}</small></button><button type="button" role="tab" class="at-fam-b" data-at-fam-b="a" aria-selected="false">Armes <small>${na}</small></button></div>
    <div class="at-filters">
      <label class="at-search"><span class="sr-only">Chercher un modèle</span><input type="search" placeholder="Chercher un modèle…" data-at-search autocomplete="off"></label>
      ${catSel('v', VCATS, VCAT, vIndex)}${catSel('a', ACATS, ACAT, aIndex)}
    </div>
    <div class="at-lists">
      <ul class="at-list" data-at-list="v" aria-label="Véhicules">${listV}</ul>
      <ul class="at-list" data-at-list="a" aria-label="Armes" hidden>${listA}</ul>
      <p class="at-list-empty" data-at-empty hidden>Aucun modèle ne correspond.</p>
    </div>
  </div>

  <div class="at-stage">
    <div class="at-view" data-at-view>
      <canvas class="at-canvas" data-at-canvas aria-label="Maquette 3D"></canvas>
      <div class="at-view-top">
        <p class="at-name"><b data-at-name>${esc(first.nom)}</b><span data-at-model-cat>${esc(VCAT[first.cat] || first.cat)}</span></p>
        <p class="at-help" data-at-help><span data-at-help-out>Glisser pour tourner, molette ou pincer pour zoomer</span><span data-at-help-in hidden>Glisser pour regarder autour, molette ou pincer pour le champ de vision</span></p>
      </div>
      <div class="at-view-bottom">
        <div class="at-angles" role="group" aria-label="Angles"><button type="button" data-at-angle="tq" class="is-on" aria-pressed="true">Trois quarts</button><button type="button" data-at-angle="profil" aria-pressed="false">Profil</button><button type="button" data-at-angle="face" aria-pressed="false">Face</button><button type="button" data-at-angle="arriere" aria-pressed="false">Arrière</button><button type="button" data-at-angle="dessus" aria-pressed="false">Dessus</button><button type="button" data-at-angle="interieur" aria-pressed="false" data-at-inside><span data-at-in-car>Intérieur</span><span data-at-in-moto hidden>Première personne</span></button></div>
        <div class="at-view-tools"><button type="button" data-at-spin aria-pressed="true">Rotation</button><button type="button" data-at-full>Plein écran</button></div>
      </div>
      <p class="at-inside-note" data-at-inside-note hidden><span data-at-note-car>Habitacle générique de l’Atelier : ni le tableau de bord ni les sièges du modèle.</span><span data-at-note-moto hidden>Guidon, rétroviseurs et compteur génériques de l’Atelier.</span></p>
      <p class="at-loading" data-at-loading>Chargement de la maquette…</p>
      <div class="at-nojs" data-at-nojs><p>La maquette 3D a besoin d’un navigateur avec WebGL et le script activé. Les schémas sous tous les angles restent sur chaque fiche.</p><p><a href="vehicules.html">Véhicules</a>, <a href="armes.html">Armurerie</a></p></div>
    </div>
    <div class="at-bar">
      <div class="at-total"><span>Total des repères de la série</span><b data-at-total>0 $</b><small data-at-total-note>options sans repère : à confirmer pour GTA VI</small></div>
      <div class="at-acts">
        <button type="button" class="at-act at-act--main" data-at-save data-hint="Configuration enregistrée sur cet appareil">Enregistrer cette configuration</button>
        <button type="button" class="at-act" data-at-share data-hint="Lien copié : il ouvre cette configuration" data-hint-alt="Copie ce lien :">Copier le lien</button>
        <button type="button" class="at-act" data-at-png data-hint="Image téléchargée">Image PNG</button>
        <button type="button" class="at-act" data-at-reset data-hint="Options remises à zéro">Réinitialiser</button>
      </div>
      <p class="at-links"><a data-at-fiche href="vehicules/${esc(first.id)}.html">Fiche du modèle</a><a data-at-perso href="personnalisations.html#perso-vehicules=${esc(first.id)}">Ses postes dans Personnalisations</a></p>
      <p class="at-msg" data-at-msg aria-live="polite"></p>
    </div>
  </div>

  <div class="at-menu" data-at-menu="v">${menu('v', VMENU)}</div>
  <div class="at-menu" data-at-menu="a" hidden>${menu('a', AMENU)}</div>

  <ul class="at-chosen" data-at-chosen aria-label="Options choisies"></ul>

  ${preSection}
</section>

<section class="shell at-saved" id="mes-configurations" data-at-saved>
  <h2 class="sec-h">Mes configurations</h2>
  <p class="fiche-txt">Enregistrées sur cet appareil seulement (rien n’est envoyé). Chaque ligne se recharge dans l’Atelier ; le lien copié ouvre la même configuration ailleurs.</p>
  <ul class="at-saved-list" data-at-saved-list></ul>
  <p class="at-saved-empty" data-at-saved-empty>Aucune configuration enregistrée pour l’instant.</p>
  <template data-at-saved-row><li class="at-saved-row"><span class="at-saved-swatch" data-r-sw></span><span class="at-saved-txt"><b data-r-nom></b><small data-r-meta></small></span><span class="at-saved-acts"><button type="button" class="at-act" data-r-load>Charger</button><button type="button" class="at-act" data-r-del>Supprimer</button></span></li></template>
</section>

<section class="shell at-how" id="comment">
  <h2 class="sec-h">Comment l’Atelier est construit</h2>
  <div class="at-how-grid">
    <article><h3>Des maquettes, pas les modèles du jeu</h3><p>Rockstar n’a publié aucun modèle 3D. Chaque maquette est bâtie à partir des schémas Leonidakit de la fiche : la silhouette de profil est étirée en volume, affinée par la vue de dessus, puis reçoit ses roues, ses vitres, ses feux. Les proportions sont celles du type d’engin, pas d’un modèle exact.</p></article>
    <article><h3>Relié aux Personnalisations</h3><p>Chaque option de l’Atelier correspond à un poste du catalogue (peinture, jantes, aileron, vitres teintées, néons, silencieux, lunette…). Le lien sous l’option ouvre sa ligne dans la liste des <a href="personnalisations.html">Personnalisations</a>, avec son statut et son repère de la série. Le total additionne les repères connus ; une option sans repère reste à confirmer pour GTA VI.</p></article>
    <article><h3>Pré-listes et vue intérieure</h3><p>Les pré-listes reprennent ce que GTA V et GTA Online proposent (noms du jeu, couleurs des données du jeu), en attendant les listes de GTA VI. La vue intérieure et la première personne montrent un habitacle générique bâti sur les vitres du schéma : ni le tableau de bord ni les sièges du modèle.</p></article>
    <article><h3>Rien ne sort de l’appareil</h3><p>Les configurations enregistrées restent dans ce navigateur. Le lien copié contient seulement les options choisies. L’image PNG est produite ici, par ton navigateur.</p></article>
  </div>
  <p class="at-how-links"><a href="vehicules.html">Tous les véhicules</a><a href="armes.html">Toute l’armurerie</a><a href="personnalisations.html">Toutes les personnalisations</a></p>
</section>
</main>
${footer}
<script src="search-index.js"></script>
<script src="assets-manifest.js"></script>
<script src="common.js"></script>
<script src="app.js"></script>
<script type="module" src="atelier-3d.js"></script>
</body>
</html>`;
fs.writeFileSync('atelier-3d.html', html);
console.log('Atelier 3D : ' + nv + ' véhicules, ' + na + ' armes, ' + (VMENU.length + AMENU.length) + ' ateliers, ' + (PV.items.length + PA.items.length) + ' postes du catalogue, ' + PRE.listes.length + ' pré-listes (' + preCount + ' éléments).');
