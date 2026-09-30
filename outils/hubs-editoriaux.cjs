'use strict';
/* v7.40 (lot 3) : zones éditoriales des hubs Véhicules et Armurerie.
   Contenu : outils/hubs-editoriaux.json (mêmes faits et statuts qu'avant, {N} & co remplacés par les comptes réels).
   Balisage : outils/sections.cjs. Appelé par gen.js (vehicules.html) et gen-armurerie.cjs (armes.html). */
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const S = require('./sections.cjs'), carte = require('./carte-vignette.cjs'), LOC = require('./localisateur.cjs');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const esc = S.esc;
const DATA = JSON.parse(read('outils/hubs-editoriaux.json'));

function fill(s, vars) { return String(s).replace(/\{(\w+)\}/g, (m, k) => { if (!(k in vars)) throw Error('Variable inconnue dans hubs-editoriaux.json : ' + k); return String(vars[k]); }); }
const para = (list, vars) => list.map(p => '<p>' + fill(p, vars) + '</p>').join('');

function explore(items, vars) {
  return '<section class="shell reveal lk-explore"><h2 class="sec-h">Continuer la visite</h2><div class="lk-links rise">'
    + items.map(x => '<a class="lk-link" href="' + esc(x.href) + '"><img src="' + esc(x.img) + '" width="480" height="270" alt="" loading="lazy" decoding="async"><span><b>' + esc(fill(x.b, vars)) + '</b><i>' + esc(fill(x.i, vars)) + '</i></span></a>').join('')
    + '</div></section>';
}
function faq(items, vars) {
  return S.section({ id: 'faq', kicker: 'Questions', title: 'Questions fréquentes', icon: 'faq', tone: 'paper', reveal: true },
    '<div class="faq rise">' + items.map(x => '<details><summary>' + esc(x.q) + '</summary><div class="ans">' + esc(fill(x.a, vars)) + '</div></details>').join('') + '</div>');
}
function levels(L, num, tone) {
  return S.section({ id: 'fiabilite', num, kicker: 'Méthode', title: 'Comment lire cette page', icon: 'lire', tone, lede: esc(L.intro) },
    '<div class="ed-levels">' + L.niveaux.map(n => '<div class="ed-level"><h3><span class="pip pip--' + esc(n.statut) + '" aria-hidden="true"></span>' + esc(n.titre) + '</h3><p>' + esc(n.texte) + '</p></div>').join('') + '</div>'
    + '<div class="ed-callout"><p><strong>Notre règle.</strong> ' + esc(L.regle) + '</p>' + (L.notes ? '<p><strong>Comment lire ces fiches.</strong> ' + esc(L.notes[0]) + '</p><p>' + esc(L.notes[1]) + '</p>' : '') + '</div>');
}

/* ---------- Véhicules ---------- */
/* V : liste LK_VEHICULES ; marques : outils/marques.json ; counts : {N, nOfficiel, nVu, nComm, nArmes, nLieux} */
function vehicules(V, counts) {
  const D = DATA.vehicules, vars = counts;
  const marques = JSON.parse(read('outils/marques.json')).marques;
  const evoque = Object.fromEntries(marques.map(m => [m.name, m.evoque]));
  const byBrand = {};
  V.forEach(v => { if (v.marque && v.marque !== 'Marque inconnue') byBrand[v.marque] = (byBrand[v.marque] || 0) + 1; });
  const brands = Object.keys(byBrand).sort((a, b) => a.localeCompare(b, 'fr')).map(name => ({ name, evoque: evoque[name] || null, n: byBrand[name], href: 'vehicules.html#q=' + encodeURIComponent(name) }));
  const out = [];
  out.push('<div class="ed-zone">');
  out.push(S.nav(D.nav, 'Sections de la page Véhicules'));
  out.push(S.section({ id: 'a-venir', num: 1, kicker: 'Le compte', title: 'Et les autres ?', icon: 'ouvert', tone: 'paper' },
    '<h3 class="ed-h3">' + esc(D.aVenir.titre) + '</h3>' + para(D.aVenir.p, vars)));
  out.push(S.section({ id: 'aller-plus-loin', num: 2, kicker: 'Outils', title: 'Aller plus loin', icon: 'boussole', tone: 'paper2' },
    '<div class="duo-grid rise">' + D.aller.map(x => '<a class="duo" href="' + esc(x.href) + '"><span class="duo-k">' + esc(x.k) + '</span><span class="duo-t">' + esc(x.t) + '</span><span class="duo-d">' + esc(fill(x.d, vars)) + '</span></a>').join('') + '</div>'));
  out.push(S.section({ id: 'chiffres', num: 3, kicker: 'Inventaire', title: 'Les chiffres, sans arrondi', icon: 'chiffres', tone: 'night' },
    S.figures([{ n: counts.N, label: 'véhicules recensés ici' }, { n: counts.nOfficiel, label: 'nommés par Rockstar' }, { n: counts.nVu, label: 'vus sans nom communiqué' }, { n: counts.nComm, label: 'identifications communautaires' }, { n: 0, label: 'total officiel publié' }])
    + '<p>' + esc(D.chiffres.texte) + '</p>'));
  out.push(S.section({ id: 'marques', num: 4, kicker: brands.length + ' constructeurs', title: 'Marques fictives et constructeurs évoqués', icon: 'marques', tone: 'paper', lede: esc(D.marques.lede) },
    S.brandWall(brands, { none: 'constructeur fictif, pas de rapprochement retenu' })));
  out.push(S.section({ id: 'conduite', num: 5, kicker: 'Gameplay', title: 'Conduite et mécaniques montrées à ce jour', icon: 'conduite', tone: 'paper2', accent: 'coral' },
    S.columns(D.conduite.cards) + '<div class="ed-callout"><p>' + esc(D.conduite.note) + '</p></div>'));
  out.push(S.section({ id: 'ultimate', num: 6, kicker: counts.nOfficiel + ' noms officiels', title: 'Véhicules nommés par Rockstar', icon: 'nommes', tone: 'paper', lede: esc(D.nommes.lede) },
    '<div class="kit-grid rise"></div>'));
  /* v7.50 : sélecteur illustré (un véhicule → les lieux liés à son type), puis tous les lieux en cartes. */
  const locV = LOC.data();
  out.push(S.section({ id: 'carte', num: 7, kicker: 'Sur la carte', title: 'Où les trouver sur la carte', icon: 'carte', tone: 'night', lede: esc(D.carte.lede) },
    S.defs() + LOC.hub({ kind: 'vehicules', items: locV.V.map(v => LOC.vehicleItem(v, '')), places: locV.placesV, cats: Object.entries(locV.VC), catsLabel: 'Types de véhicules', searchLabel: 'Chercher un véhicule', noun: 'véhicules', listLabel: 'Véhicules à situer', mapLabel: 'Carte de Leonida : lieux liés aux véhicules', caption: 'Ce sont des lieux de notre carte liés au type de véhicule, pas des emplacements confirmés par Rockstar.' })
    + '<h3 class="ed-h3 lk-loc-after">Tous les lieux repérés</h3>' + S.places(D.carte.groups)));
  out.push(levels(D.lecture, 8, 'paper2'));
  out.push(explore(D.explore, vars));
  out.push(faq(D.faq, vars));
  out.push('</div>');
  return out.join('\n');
}

/* ---------- Armurerie ---------- */
function armes(A, counts) {
  const D = DATA.armes, vars = counts;
  const out = [];
  out.push('<div class="ed-zone">');
  out.push(S.nav(D.nav, 'Sections de l’armurerie'));
  out.push(S.section({ id: 'inventaire', num: 1, kicker: 'Extended Look', title: 'Le nouveau système d’inventaire', icon: 'inventaire', tone: 'paper', lede: esc(D.inventaire.lede), fam: 'armes' },
    S.columns(D.inventaire.items.map(x => ({ titre: x.titre, p: [x.texte], icon: x.icon })))));
  const figs = [{ n: counts.N, label: 'armes recensées ici' }, { n: counts.nOfficiel, label: 'nommées par Rockstar' }, { n: counts.nVu, label: 'vues sans nom communiqué' }];
  if (counts.nComm) figs.push({ n: counts.nComm, label: 'identifications communautaires' });
  figs.push({ n: counts.nCat, label: 'classes' }, { n: 0, label: 'total officiel publié' });
  out.push(S.section({ id: 'chiffres', num: 2, kicker: 'Inventaire', title: 'Les chiffres, sans arrondi', icon: 'chiffres', tone: 'paper2', fam: 'armes' },
    S.figures(figs) + '<p>' + esc(D.chiffres.texte) + '</p>'));
  const bar = (fam, label, total, href, aria) => '<div class="own-bar own-bar--track rise" data-track-bar="' + fam + '"><span class="own-lbl">' + label + ' :</span> <b>0</b><span class="own-lbl">/ <span class="own-total">' + total + '</span> obtenus</span>'
    + '<progress aria-label="' + esc(aria) + '" value="0" max="' + total + '"></progress><div class="own-actions"><a class="own-link" href="' + href + '">Voir mon arsenal</a><button type="button" data-raz>Vider</button></div></div>';
  out.push(S.section({ id: 'equipements', num: 3, kicker: D.equipements.items.length + ' objets', title: 'Équipements et gadgets', icon: 'equipements', tone: 'paper', lede: esc(D.equipements.lede), fam: 'equipements' },
    bar('equipements', 'Mon équipement', D.equipements.items.length, 'carnets/arsenal.html#f=equipements', 'Équipements obtenus') + S.kits(D.equipements.items, 'equipements')));
  out.push(S.section({ id: 'munitions', num: 4, kicker: D.munitions.items.length + ' familles', title: 'Types de munitions', icon: 'munitions', tone: 'night', accent: 'coral', fam: 'munitions' },
    bar('munitions', 'Mes munitions', D.munitions.items.length, 'carnets/arsenal.html#f=munitions', 'Types de munitions obtenus') + S.ammo(D.munitions.items, 'munitions')));
  out.push(S.section({ id: 'combat', num: 5, kicker: 'Six changements', title: 'Combat : ce qui change', icon: 'combat', tone: 'paper2', accent: 'coral', fam: 'combat' },
    S.steps(D.combat.items)));
  const locA = LOC.data(), { schema } = require('./armes-schemas.cjs');
  out.push(S.section({ id: 'carte', num: 6, kicker: 'Sur la carte', title: 'Où les trouver sur la carte', icon: 'carte', tone: 'paper', lede: esc(D.carte.lede), fam: 'carte' },
    S.defs() + LOC.hub({ kind: 'armes', items: locA.A.map(a => LOC.weaponItem(a, '', schema)), places: locA.placesA, cats: Object.entries(locA.AC).filter(([k]) => locA.A.some(a => a.cat === k)), catsLabel: 'Classes d’armes', searchLabel: 'Chercher une arme', noun: 'armes', listLabel: 'Armes à situer', mapLabel: 'Carte de Leonida : armureries repérées', caption: 'Ce sont les armureries de notre carte, pas des points de vente confirmés pour une arme.' })
    + '<h3 class="ed-h3 lk-loc-after">Toutes les armureries repérées</h3>' + S.places(D.carte.groups)));
  out.push(levels(D.lecture, 7, 'night'));
  out.push(explore(D.explore, vars));
  out.push(faq(D.faq, vars));
  out.push('</div>');
  return out.join('\n');
}

function counts(list) {
  const st = list.reduce((a, x) => (a[x.st] = (a[x.st] || 0) + 1, a), {});
  return { N: list.length, nOfficiel: st.officiel || 0, nVu: st.vu || 0, nComm: st.comm || 0, nCat: new Set(list.map(x => x.cat)).size };
}
function loadData() {
  const c = { window: {} }; vm.createContext(c);
  for (const f of ['vehicules-data.js', 'armes-data.js']) vm.runInContext(read(f), c);
  return { V: c.window.LK_VEHICULES, A: c.window.LK_ARMES };
}
/* Remplace le contenu entre deux marqueurs HTML (le marqueur d'ouverture peut porter un commentaire). */
function replaceZone(html, name, content) {
  const re = new RegExp('<!-- lk:' + name + '[^>]*-->[\\s\\S]*?(?=<!-- /lk:' + name + ' -->)|<!-- lk:' + name + '[^>]*-->(?![\\s\\S]*<!-- /lk:' + name + ' -->)');
  if (!re.test(html)) throw Error('Marqueur lk:' + name + ' introuvable');
  return html.replace(re, '<!-- lk:' + name + ' (zone générée, ne pas éditer à la main : outils/hubs-editoriaux.json) -->\n' + content + '\n');
}
module.exports = { vehicules, armes, counts, loadData, replaceZone, nLieux: () => Object.keys(carte.points()).length };
