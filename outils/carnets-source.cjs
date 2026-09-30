'use strict';
/* LEONIDAKIT — source commune des carnets de progression (v7.51, lot 4).
   Rassemble, pour chaque famille suivie, ce qu’un carnet affiche : identifiant, nom, catégorie, lien vers la fiche
   (ou vers la ligne du catalogue quand il n’y a pas de fiche) et vignette. Aucune donnée n’est inventée ici : tout est lu
   dans les fichiers qui alimentent déjà le site (vehicules-data.js, armes-data.js, outils/hubs-editoriaux.json,
   outils/catalogues/*.json, outils/acquisitions.json, carte.js et carte-gtadb.js, outils/collectibles.json).
   Les identifiants suivis sont exactement ceux de progression-data.js (écrit par sync-site.cjs) : un carnet compte
   pareil que la page Progression, que les fiches et que le calculateur. */
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const json = f => JSON.parse(read(f));
function run(files) { const ctx = { window: {} }; for (const f of files) vm.runInNewContext(read(f), ctx); return ctx.window; }

/* Famille → carnet (modèle commun : outils/modele-donnees.json). */
function modele() { return json('outils/modele-donnees.json'); }
function carnetOf(fam) { return modele().carnets.find(k => k.familles.includes(fam)) || null; }
/* Lien relatif vers le carnet d’une famille (depuis la racine ou depuis un sous-dossier) ; pour un carnet à
   plusieurs familles, le filtre de la famille est posé dans l’ancre (#f=…). */
function carnetHref(fam, prefix = '') {
  const k = carnetOf(fam); if (!k) return prefix + 'progression.html#carnets';
  return prefix + k.url.replace(/^\//, '') + (k.familles.length > 1 ? '#f=' + fam : '');
}

/* Vocabulaire par famille : ce qu’on dit d’un élément coché (jamais « possédé » pour un lieu). */
const FAM = {
  vehicules: { label: 'Véhicules', one: 'véhicule', many: 'véhicules', done: 'possédé', doneP: 'possédés', fem: false, catalogue: 'vehicules.html', calc: 'vehicle', fiche: true },
  armes: { label: 'Armes', one: 'arme', many: 'armes', done: 'possédée', doneP: 'possédées', fem: true, catalogue: 'armes.html', calc: 'weapon', fiche: true },
  equipements: { label: 'Équipements', one: 'équipement', many: 'équipements', done: 'obtenu', doneP: 'obtenus', fem: false, catalogue: 'armes.html#equipements' },
  munitions: { label: 'Munitions', one: 'type de munitions', many: 'types de munitions', done: 'obtenu', doneP: 'obtenus', fem: false, catalogue: 'armes.html#munitions', stock: true },
  tenues: { label: 'Tenues et accessoires', one: 'tenue ou accessoire', many: 'tenues et accessoires', done: 'porté', doneP: 'portés', fem: false, catalogue: 'style.html#tenues' },
  coiffures: { label: 'Coiffures', one: 'coiffure', many: 'coiffures', done: 'essayée', doneP: 'essayées', fem: true, catalogue: 'style.html#coiffures' },
  tatouages: { label: 'Tatouages', one: 'tatouage', many: 'tatouages', done: 'fait', doneP: 'faits', fem: false, catalogue: 'style.html#tatouages' },
  consommables: { label: 'Consommables', one: 'consommable', many: 'consommables', done: 'goûté', doneP: 'goûtés', fem: false, catalogue: 'nourriture.html#liste-consommables', stock: true },
  'perso-vehicules': { label: 'Modifs de véhicule', one: 'modif de véhicule', many: 'modifs de véhicule', done: 'posée', doneP: 'posées', fem: true, catalogue: 'personnalisations.html#perso-vehicules' },
  'perso-armes': { label: 'Modifs d’arme', one: 'modif d’arme', many: 'modifs d’arme', done: 'posée', doneP: 'posées', fem: true, catalogue: 'personnalisations.html#perso-armes' },
  acquisitions: { label: 'Contenus documentés', one: 'contenu', many: 'contenus', done: 'obtenu', doneP: 'obtenus', fem: false, catalogue: 'achats.html' },
  lieux: { label: 'Lieux', one: 'lieu', many: 'lieux', done: 'repéré', doneP: 'repérés', fem: false, catalogue: 'carte.html' },
  collectibles: { label: 'Collectibles', one: 'collectible', many: 'collectibles', done: 'trouvé', doneP: 'trouvés', fem: false, catalogue: 'collectibles.html' },
  calculs: { label: 'Calculs', one: 'calcul', many: 'calculs', done: 'enregistré', doneP: 'enregistrés', fem: false, catalogue: 'calculateurs.html' }
};

/* Identifiants et noms suivis, lus dans les mêmes sources et avec les mêmes règles que sync-site.cjs (qui écrit
   progression-data.js pour la page Progression) : un test vérifie que les deux listes sont identiques. Calculées ici,
   elles ne dépendent pas de l’ordre des générateurs (gen-carnets.cjs passe avant sync-site.cjs). */
const CATA = { pistolet: 'Pistolets', pompe: 'Fusils à pompe', pm: 'Pistolets-mitrailleurs', assaut: 'Fusils d’assaut', precision: 'Fusils de précision', mitrailleuse: 'Mitrailleuses', melee: 'Corps à corps', projectile: 'Projectiles', speciale: 'Armes spéciales' };
let progressCache = null;
function progress() {
  if (progressCache) return progressCache;
  const w = run(['vehicules-data.js', 'armes-data.js']), V = w.LK_VEHICULES, A = w.LK_ARMES;
  const vname = v => (v.marque && v.marque !== 'Marque inconnue' ? v.marque + ' ' : '') + v.nom;
  const H = json('outils/hubs-editoriaux.json').armes;
  const ids = { vehicules: V.map(v => v.id), armes: A.map(a => a.id), equipements: H.equipements.items.map(x => x.id), munitions: H.munitions.items.map(x => x.id) };
  const names = {
    vehicules: Object.fromEntries(V.map(v => [v.id, { n: vname(v), c: w.LK_VEHICULES_CATS[v.cat] || v.cat || '', u: 'vehicules/' + v.id + '.html' }])),
    armes: Object.fromEntries(A.map(a => [a.id, { n: a.nom, c: CATA[a.cat] || a.cat || '', u: 'armes/' + a.id + '.html' }])),
    equipements: Object.fromEntries(H.equipements.items.map(x => [x.id, { n: x.nom }])),
    munitions: Object.fromEntries(H.munitions.items.map(x => [x.id, { n: x.nom }]))
  };
  const C = require('./catalogues.cjs');
  for (const f of C.FAMILIES) { ids[f] = C.progressIds(f); names[f] = C.progressNames(f); }
  const src = read('carte.js'), G = run(['carte-gtadb.js']).LK_GTADB;
  const local = vm.runInNewContext('(' + src.match(/const POINTS = (\[[\s\S]*?\n {2}\]);/)[1] + ')');
  ids.lieux = [...local, ...G.groupes, ...G.lieux].map(p => p.id);
  progressCache = { ids, names };
  return progressCache;
}
function medias() { return json('outils/medias-officiels.json'); }
function media480(id) {
  const m = medias()[id]; if (!m) return null;
  const v = m.variants.find(x => x.w === 480) || m.variants[0];
  return v ? String(v.src).replace(/^\//, '') : null;
}

/* Un élément de carnet : f famille, id, n nom, c catégorie (libellé), g catégorie (identifiant), u lien depuis la racine,
   x « fiche » (page dédiée) ou « ligne » (ancre d’un catalogue), t vignette : {img} image, {svg} symbole d’un sprite,
   {ico} pictogramme de la catégorie (dit comme tel), {dot} pastille de couleur ; k mots cherchables en plus du nom. */
function items(fam) {
  const P = progress(), ids = [...new Set(P.ids[fam] || [])], names = P.names[fam] || {};
  if (fam === 'vehicules') {
    const w = run(['vehicules-data.js']), byId = new Map(w.LK_VEHICULES.map(v => [v.id, v]));
    return ids.map(id => { const v = byId.get(id) || {}, nm = names[id] || { n: id };
      return { f: fam, id, n: nm.n, c: nm.c || w.LK_VEHICULES_CATS[v.cat] || '', g: v.cat || '', u: nm.u || 'vehicules/' + id + '.html', x: 'fiche', t: v.thumb ? { img: String(v.thumb).replace(/^\//, '') } : null, k: [v.marque, v.insp, v.fam, v.fr, v.alias].filter(Boolean).join(' ') }; });
  }
  if (fam === 'armes') {
    const w = run(['armes-data.js']), byId = new Map(w.LK_ARMES.map(a => [a.id, a]));
    return ids.map(id => { const a = byId.get(id) || {}, nm = names[id] || { n: id };
      return { f: fam, id, n: nm.n, c: nm.c || w.LK_ARMES_CATS[a.cat] || '', g: a.cat || '', u: nm.u || 'armes/' + id + '.html', x: 'fiche', t: { svg: 'armes', id }, k: [a.fr, a.insp].filter(Boolean).join(' ') }; });
  }
  if (fam === 'equipements' || fam === 'munitions') {
    const H = json('outils/hubs-editoriaux.json').armes[fam].items, byId = new Map(H.map(x => [x.id, x]));
    return ids.map(id => { const h = byId.get(id) || {}, nm = names[id] || { n: h.nom || id };
      return { f: fam, id, n: nm.n, c: FAM[fam].label, g: fam, u: FAM[fam].catalogue, x: 'ligne', t: fam === 'equipements' ? { ico: h.icon || id } : { ico: 'munitions', dot: h.dot || 'amber' }, k: h.usage || '' }; });
  }
  const C = require('./catalogues.cjs');
  if (C.FAMILIES.includes(fam)) {
    const d = C.load().families[fam], cats = new Map(d.categories.map(c => [c.id, c])), byId = new Map(d.items.map(it => [it.id, it]));
    return ids.map(id => { const it = byId.get(id) || {}, nm = names[id] || { n: it.nom || id }, cat = cats.get(it.categorie) || {}, img = it.media ? media480(it.media) : null;
      return { f: fam, id, n: nm.n, c: nm.c || cat.label || '', g: it.categorie || '', u: nm.u || d.page.slice(1) + '#' + fam + '-' + id, x: 'ligne', t: img ? { img } : { ico: cat.icon || 'etiquette' }, k: [it.description, (it.variantes || []).join(' ')].filter(Boolean).join(' ').slice(0, 240) }; });
  }
  if (fam === 'acquisitions') {
    const A = json('outils/acquisitions.json'), cats = new Map(A.categories.map(c => [c.id, c]));
    /* Les éléments qui renvoient à un véhicule ou à une arme (bateaux de l’Édition Ultimate…) sont comptés dans ces
       familles, donc dans le garage ou l’arsenal : jamais deux fois. */
    return A.items.filter(it => it.trackable === true && !(it.ref && it.ref.type && it.ref.id)).map(it => {
      const cat = cats.get(it.category) || {}, img = (it.media || []).map(media480).find(Boolean) || null;
      const route = String(cat.route || '/achats.html').replace(/^\//, '').split('#')[0];
      return { f: fam, id: it.id, n: it.name, c: cat.label || '', g: it.category, u: route + '#' + it.id, x: 'ligne', t: img ? { img } : { ico: 'casier' }, k: [it.description, it.condition].filter(Boolean).join(' ').slice(0, 240) };
    });
  }
  if (fam === 'collectibles') {
    const K = json('outils/collectibles.json'), list = Array.isArray(K.items) ? K.items : [];
    return list.filter(x => x && x.trackable === true && x.published !== false && ['confirmed', 'established'].includes(x.status)).map(x => ({ f: fam, id: x.id, n: x.name || x.id, c: x.category || '', g: x.category || '', u: 'collectibles.html', x: 'ligne', t: { ico: 'etiquette' }, k: '' }));
  }
  if (fam === 'lieux') return lieux().items;
  return [];
}

/* Lieux de la carte : 37 points locaux (carte.js) + groupes et lieux de GTADB (carte-gtadb.js), mêmes identifiants que
   progression-data.js. Six régions ont une fiche ; les autres s’ouvrent sur la carte. */
let lieuxCache = null;
function lieux() {
  if (lieuxCache) return lieuxCache;
  const src = read('carte.js');
  const local = vm.runInNewContext('(' + src.match(/const POINTS = (\[[\s\S]*?\n {2}\]);/)[1] + ')');
  const CATS = vm.runInNewContext('(' + src.match(/const CATS = (\{[\s\S]*?\n {2}\});/)[1] + ')');
  const G = run(['carte-gtadb.js']).LK_GTADB;
  const all = [...local, ...G.groupes, ...G.lieux];
  /* Texte simple : la source GTADB peut écrire un nom en entités HTML (&quot;…&quot;, &amp;) ; la page l’échappe elle-même. */
  const ENT = { quot: '"', amp: '&', apos: "'", '#39': "'", '#x27': "'", lt: '<', gt: '>' }, plainText = v => String(v || '').replace(/&(quot|amp|apos|#39|#x27|lt|gt);/g, (m, k) => ENT[k]);
  const groupName = Object.fromEntries(G.groupes.map(g => [g.id, plainText(g.n)]));
  const fiches = new Set(fs.existsSync(path.join(root, 'lieux')) ? fs.readdirSync(path.join(root, 'lieux')).filter(f => f.endsWith('.html')).map(f => f.slice(0, -5)) : []);
  const P = progress(), wanted = new Set(P.ids.lieux || []), seen = new Set(), out = [];
  for (const p of all) {
    if (!p || !p.id || !wanted.has(p.id) || seen.has(p.id)) continue; seen.add(p.id);
    const fiche = fiches.has(p.id) && !/http-equiv="refresh"/.test(read('lieux/' + p.id + '.html'));
    out.push({ f: 'lieux', id: p.id, n: plainText(p.n) || p.id, c: (CATS[p.c] && CATS[p.c].nom) || 'Lieux', g: p.c || 'lieu', u: fiche ? 'lieux/' + p.id + '.html' : 'carte.html#lieu=' + encodeURIComponent(p.id), x: fiche ? 'fiche' : 'carte', p: groupName[p.p] || '', col: (CATS[p.c] && CATS[p.c].col) || '#B5762A' });
  }
  lieuxCache = { items: out, cats: CATS };
  return lieuxCache;
}

/* Planches du carnet de style (souhaits « styles », jamais des possessions). */
function styles() {
  const E = json('outils/catalogues/editorial.json'), L = (E.style && E.style.lookbook) || {};
  const planches = Array.isArray(L.planches) ? L.planches : Array.isArray(L.items) ? L.items : [];
  return planches.filter(p => p && p.id).map(p => { const img = (p.medias || []).map(media480).find(Boolean) || null;
    return { f: 'styles', id: p.id, n: p.titre || p.id, c: 'Carnet de style', g: 'styles', u: 'style.html#style-' + p.id, x: 'ligne', t: img ? { img } : { ico: 'etiquette' }, k: [p.lieu, ...(p.vu || [])].filter(Boolean).join(' ').slice(0, 240) }; });
}

module.exports = { FAM, modele, carnetOf, carnetHref, progress, items, lieux, styles, media480 };
