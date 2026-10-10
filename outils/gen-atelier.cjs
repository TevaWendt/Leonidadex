#!/usr/bin/env node
'use strict';
/* ============================================================
   LEONIDAKIT — gen-atelier.cjs (v7.81) : la section « Atelier 3D » (atelier-3d.html) et ses données.
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
const VMENU = [
  ['peinture', 'Peinture', [
    opt('v', 'paint', 'Peinture principale', swatches('paint', 'rouge', 'Couleur') + radios('finish', [['gloss', 'Brillante'], ['matte', 'Mate'], ['metal', 'Métallisée'], ['chrome', 'Chromée'], ['nacre', 'Nacrée'], ['cameleon', 'Caméléon']], 'gloss', 'Finition'), VCATS, [poste('v', 'peinture-principale'), poste('v', 'nacre'), poste('v', 'cameleon')]),
    opt('v', 'paint2', 'Peinture secondaire (accessoires, aileron, rétroviseurs)', swatches('paint2', 'noir'), VCATS, [poste('v', 'peinture-secondaire')]),
    opt('v', 'stripes', 'Livrée', check('stripes', 'Deux bandes sur le capot et le toit', ALL, 'v') + swatches('stripeColor', 'blanc', 'Couleur des bandes'), ALL, [poste('v', 'livrees-serie')])
  ]],
  ['jantes', 'Jantes et pneus', [
    opt('v', 'rims', 'Jantes', swatches('rim', 'gris', 'Couleur des jantes') + radios('rimSize', [['-1', 'Petites'], ['0', 'D’origine'], ['1', 'Grandes'], ['2', 'Surdimensionnées (donk)']], '0', 'Taille des jantes'), ALL, [poste('v', 'couleur-jantes'), poste('v', 'jantes-familles'), poste('v', 'jantes-donk')]),
    opt('v', 'tyres', 'Pneus', radios('tyres', [['std', 'Route'], ['tt', 'Tout-terrain (larges)'], ['slick', 'Faible adhérence (fins)']], 'std'), ALL, [poste('v', 'pneus-tout-terrain'), poste('v', 'pneus-faible-adherence'), poste('v', 'pneus-pare-balles')])
  ]],
  ['carrosserie', 'Carrosserie', [
    opt('v', 'body', 'Pièces', [check('aileron', 'Aileron', ALL), check('jupes', 'Jupes latérales', ALL), check('capot', 'Prise d’air sur le capot', ALL), check('toit', 'Barres de toit', ALL), check('bullbar', 'Pare-chocs tout-terrain', ['pickup', 'suv']), check('exhaust', 'Double échappement', [...ALL]), check('arceau', 'Arceau', ALL)].join(''), ALL, [poste('v', 'aileron'), poste('v', 'jupes'), poste('v', 'capot'), poste('v', 'toit'), poste('v', 'pare-chocs-tout-terrain'), poste('v', 'echappement'), poste('v', 'arceau')])
  ]],
  ['vitres', 'Vitres', [
    opt('v', 'tint', 'Teinte des vitres', '<label class="at-range"><span>Teinte</span><input type="range" min="0" max="100" value="35" step="5" data-at-k="tint"><output data-at-out="tint">35 %</output></label>', ALL, [poste('v', 'vitres-teintees'), poste('v', 'vitres-noir-pur')])
  ]],
  ['neons', 'Néons', [
    opt('v', 'neon', 'Néons sous la caisse', check('neon', 'Néons allumés', ALL) + swatches('neonColor', 'rose', 'Couleur des néons'), ALL, [poste('v', 'neons-couleur'), poste('v', 'neons-disposition')])
  ]],
  ['suspension', 'Suspension', [
    opt('v', 'susp', 'Hauteur de caisse', radios('susp', [['-2', 'Rabaissée (course)'], ['-1', 'Rabaissée (street)'], ['0', 'D’origine'], ['1', 'Rehaussée']], '0'), ALL, [poste('v', 'suspension-niveaux'), poste('v', 'suspension-rehaussee'), poste('v', 'hydrauliques')])
  ]],
  ['phares', 'Phares', [
    opt('v', 'lights', 'Phares', radios('lights', [['off', 'Éteints'], ['halo', 'Halogène'], ['xenon', 'Xénon'], ['color', 'De couleur']], 'halo') + swatches('lightColor', 'cyan', 'Couleur des phares'), VCATS, [poste('v', 'phares-xenon'), poste('v', 'phares-couleur')])
  ]],
  ['plaques', 'Plaque', [
    opt('v', 'plate', 'Plaque d’immatriculation', '<label class="at-text"><span>Texte (8 caractères)</span><input type="text" maxlength="8" value="LEONIDA" data-at-k="plate" autocomplete="off" spellcheck="false"></label>' + radios('plateStyle', [['blue', 'Bleue Leonida'], ['white', 'Blanche'], ['yellow', 'Jaune'], ['black', 'Noire']], 'blue', 'Style de plaque'), ALL, [poste('v', 'plaques')])
  ]],
  ['perfs', 'Performances', [
    opt('v', 'perf', 'Sans effet visible, comptés dans le total', [check('turbo', 'Turbo', ALL), check('moteur', 'Moteur (EMS)', ALL), check('freins', 'Freins', ALL), check('transmission', 'Transmission', ALL), check('blindage', 'Blindage', ALL)].join(''), ALL, [poste('v', 'turbo'), poste('v', 'moteur-ems'), poste('v', 'freins'), poste('v', 'transmission'), poste('v', 'blindage')])
  ]]
];
const GUNS = ['pistolet', 'pm', 'assaut', 'precision', 'mitrailleuse', 'pompe'];
const AMENU = [
  ['finitions', 'Finition', [
    opt('a', 'finish', 'Finition', radios('finish', [['black', 'Noir d’usine'], ['army', 'Vert armée'], ['orange', 'Orange'], ['lspd', 'Bleu LSPD'], ['pink', 'Rose'], ['gold', 'Or'], ['platinum', 'Platine'], ['chrome', 'Chrome'], ['custom', 'Autre']], 'black') + '<label class="at-sw-c at-sw-c--alone"><span>Couleur libre</span><input type="color" value="#E8452C" data-at-k="finishColor" aria-label="Couleur libre"></label>', ACATS, [poste('a', 'teintes'), poste('a', 'teintes-mk2'), poste('a', 'finition-doree')]),
    opt('a', 'camo', 'Camouflage', radios('camo', [['none', 'Aucun'], ['woodland', 'Forêt'], ['desert', 'Désert'], ['tropical', 'Tropical (palmiers)'], ['urban', 'Urbain']], 'none'), GUNS, [poste('a', 'camouflages-mk2'), poste('a', 'motif-vintage-vice-city')]),
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

/* ---------- la page ---------- */
const base = read('a-propos.html'), header = base.match(/<header>[\s\S]*?<\/header>/)[0].replace(/ class="here"/g, '').replace(/ aria-current="page"/g, ''), footer = base.match(/<footer>[\s\S]*?<\/footer>/)[0], favicon = base.match(/<link rel="icon"[^>]*>/)[0];
const byCat = (idx, cats, labels) => cats.filter(c => idx.some(x => x.cat === c)).map(c => '<optgroup label="' + esc(labels[c] || c) + '">' + idx.filter(x => x.cat === c).sort((a, b) => a.nom.localeCompare(b.nom, 'fr')).map(x => '<option value="' + esc(x.id) + '">' + esc(x.nom) + '</option>').join('') + '</optgroup>').join('');
const listV = vIndex.slice().sort((a, b) => a.nom.localeCompare(b.nom, 'fr')).map(x => '<li><button type="button" class="at-item" data-at-pick="v" data-at-id="' + esc(x.id) + '" data-at-cat="' + esc(x.cat) + '" data-at-q="' + esc((x.nom + ' ' + (VCAT[x.cat] || '')).toLowerCase()) + '"><span class="at-item-n">' + esc(x.nom) + '</span><span class="at-item-c">' + esc(VCAT[x.cat] || x.cat) + '</span></button></li>').join('');
const listA = aIndex.slice().sort((a, b) => a.nom.localeCompare(b.nom, 'fr')).map(x => '<li><button type="button" class="at-item" data-at-pick="a" data-at-id="' + esc(x.id) + '" data-at-cat="' + esc(x.cat) + '" data-at-q="' + esc((x.nom + ' ' + (ACAT[x.cat] || '')).toLowerCase()) + '"><span class="at-item-n">' + esc(x.nom) + '</span><span class="at-item-c">' + esc(ACAT[x.cat] || x.cat) + '</span></button></li>').join('');
const catSel = (fam, cats, labels, idx) => '<select class="at-catsel" data-at-catsel="' + fam + '" aria-label="' + (fam === 'v' ? 'Catégorie de véhicule' : 'Catégorie d’arme') + '"><option value="">Toutes les catégories</option>' + cats.filter(c => idx.some(x => x.cat === c)).map(c => '<option value="' + c + '">' + esc(labels[c] || c) + '</option>').join('') + '</select>';
const first = vIndex.find(x => x.id === 'pegassi-zentorno') || vIndex[0];
const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Atelier 3D : personnaliser ${nv} véhicules et ${na} armes de GTA VI | Leonidakit</title>
<meta name="description" content="Tourne, peins et équipe chaque véhicule et chaque arme de GTA VI en 3D : peinture, jantes, carrosserie, vitres, néons, suspension, plaque, finitions, chargeurs, viseurs, canons. Chaque option renvoie au poste de personnalisation et à son repère de la série.">
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
</head>
<body class="at-page">
<a class="skip" href="#main">Aller au contenu</a>
<div class="sunset" aria-hidden="true"></div>
${header}
<main id="main">
<section class="shell at-hero">
  <nav class="crumbs" aria-label="Fil d’Ariane"><a href="index.html">Accueil</a><span>/</span><a href="personnalisations.html">Personnalisations</a><span>/</span>Atelier 3D</nav>
  <div class="at-hero-in">
    <div class="at-hero-txt">
      <p class="fiche-cat">Personnalisations</p>
      <h1>Atelier 3D</h1>
      <p class="lede">Choisis un véhicule ou une arme, fais-le tourner, peins-le, équipe-le. Chaque option renvoie au poste de personnalisation du catalogue, avec le repère de la série quand il existe. Les volumes sont des maquettes bâties sur les schémas Leonidakit, pas les modèles du jeu.</p>
    </div>
    <ul class="at-facts" aria-label="L’Atelier en bref"><li><b>${nv}</b><span>véhicules</span></li><li><b>${na}</b><span>armes</span></li><li><b>${PV.items.length + PA.items.length}</b><span>postes du catalogue reliés</span></li><li><b>0</b><span>modèle inventé</span></li></ul>
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
        <p class="at-help" data-at-help>Glisser pour tourner · molette ou pincer pour zoomer</p>
      </div>
      <div class="at-view-bottom">
        <div class="at-angles" role="group" aria-label="Angles"><button type="button" data-at-angle="tq" class="is-on" aria-pressed="true">Trois quarts</button><button type="button" data-at-angle="profil" aria-pressed="false">Profil</button><button type="button" data-at-angle="face" aria-pressed="false">Face</button><button type="button" data-at-angle="arriere" aria-pressed="false">Arrière</button><button type="button" data-at-angle="dessus" aria-pressed="false">Dessus</button></div>
        <div class="at-view-tools"><button type="button" data-at-spin aria-pressed="true">Rotation</button><button type="button" data-at-full>Plein écran</button></div>
      </div>
      <p class="at-loading" data-at-loading>Chargement de la maquette…</p>
      <div class="at-nojs" data-at-nojs><p>La maquette 3D a besoin d’un navigateur avec WebGL et le script activé. Les schémas sous tous les angles restent sur chaque fiche.</p><p><a href="vehicules.html">Véhicules</a> · <a href="armes.html">Armurerie</a></p></div>
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
console.log('Atelier 3D : ' + nv + ' véhicules, ' + na + ' armes, ' + (VMENU.length + AMENU.length) + ' ateliers, ' + (PV.items.length + PA.items.length) + ' postes du catalogue.');
