/* ============================================================
   LEONIDAKIT — build véhicules
   1. fusionne les nouveaux véhicules dans la source de vérité
   2. calcule le lien "modèle réel" de chaque entrée
   3. régénère la grille, les compteurs et les données structurées
      de vehicules.html SANS toucher au reste de la page
   ============================================================ */
const fs = require('fs');

/* ---------- 1. chargement ---------- */
global.window = {};
eval(fs.readFileSync('vehicules-data.js', 'utf8'));
const BASE = window.LK_VEHICULES;
const NEW  = process.env.NOUVEAUX === '0' ? [] : require('./nouveaux.js');

const vus = new Set(BASE.map(v => v.id));
const ajouts = NEW.filter(v => !vus.has(v.id));
const V = BASE.concat(ajouts);

/* ---------- 2. lien vers le modèle réel ----------
   Même principe que Street View sur la carte : on ne stocke aucune image,
   on ouvre une recherche visuelle sur le modèle réel identifié.          */
function lienReel(v) {
  const cible = v.insp || v.fam;
  if (!cible) return null;
  // on nettoie les formulations descriptives pour ne garder que le modèle
  const q = cible
    .replace(/,.*$/, '')
    .replace(/\b(type|genre|façon)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  return 'https://www.google.com/search?tbm=isch&q=' + encodeURIComponent(q);
}
V.forEach(v => {
  const l = lienReel(v);
  if (l) v.reel = l;
  if (!v.search) {
    v.search = [v.marque, v.nom, v.insp || v.fam].filter(Boolean).join(' ')
      .toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }
});

/* ---------- 3. libellés ---------- */
const CAT = {
  berline:'Berlines', sport:'Voitures de sport', supercar:'Supercars',
  muscle:'Muscle cars', suv:'SUV et 4x4', pickup:'Pickups',
  van:'Vans et cargos', moto:'Deux-roues et quads', helicoptere:'Hélicoptères',
  avion:'Avions', bateau:'Bateaux et jet-skis', service:'Service et urgence',
  divers:'Divers'
};
const ORDRE = ['berline','sport','supercar','muscle','suv','pickup','van','moto',
               'helicoptere','avion','bateau','service','divers'];
const ST = { officiel:'Officiel', vu:'Aperçu', comm:'Communautaire' };

/* ---------- 4. récupération des silhouettes existantes ---------- */
const html = fs.readFileSync('vehicules.html', 'utf8');
const ART = {};      // cat -> svg par défaut
const ART_ID = {};   // id  -> svg exact déjà utilisé
const THUMB_ID = {}; // id  -> bloc thumb complet (préserve les photos)
const reCard = /<a class="veh-card rise" href="vehicules\/([^"]+)\.html" data-id="([^"]+)"[\s\S]*?<div class="veh-thumb([^"]*)">([\s\S]*?)<\/div><div class="veh-body">/g;
let m;
while ((m = reCard.exec(html)) !== null) {
  const id = m[2], classes = m[3], inner = m[4];
  THUMB_ID[id] = { classes, inner };
  const svg = inner.match(/<svg class="veh-art"[\s\S]*?<\/svg>/);
  if (svg) {
    ART_ID[id] = svg[0];
    const v = V.find(x => x.id === id);
    if (v && !ART[v.cat]) ART[v.cat] = svg[0];
  }
}

const esc = s => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#x27;');

/* ---------- 5. génération d'une carte ---------- */
function carte(v) {
  const t = THUMB_ID[v.id];
  const thumbCls = t ? t.classes : ' veh-thumb--' + v.cat;
  const thumbIn  = t ? t.inner
    : '<span class="veh-badge">' + CAT[v.cat] + '</span>' +
      (ART[v.cat] || ART.sport || '');
  const insp = v.insp
    ? '<p class="veh-insp">Inspiration&nbsp;: <span>' + esc(v.insp) + '</span></p>'
    : (v.fam ? '<p class="veh-insp veh-insp--fam">Famille&nbsp;: <span>' + esc(v.fam) + '</span></p>' : '');
  return '<a class="veh-card rise" href="vehicules/' + v.id + '.html"'
    + ' data-id="' + v.id + '"'
    + ' data-st="' + v.st + '"'
    + ' data-cat="' + v.cat + '"'
    + (v.reel ? ' data-reel="' + esc(v.reel) + '"' : '')
    + (v.insp || v.fam ? ' data-reel-nom="' + esc(v.insp || v.fam) + '"' : '')
    + ' data-search="' + esc(v.search) + '">'
    + '<div class="veh-thumb' + thumbCls + '">' + thumbIn + '</div>'
    + '<div class="veh-body">'
    + '<span class="veh-st veh-st--' + v.st + '">' + ST[v.st] + '</span>'
    + '<span class="veh-marque">' + esc(v.marque || 'Marque inconnue') + '</span>'
    + '<h3>' + esc(v.nom) + '</h3>'
    + insp
    + '<span class="veh-go">Voir la fiche</span>'
    + '</div></a>';
}

/* ordre d'affichage : par catégorie puis par marque puis par nom */
const tri = V.slice().sort((a, b) =>
  ORDRE.indexOf(a.cat) - ORDRE.indexOf(b.cat) ||
  (a.marque || '').localeCompare(b.marque || '', 'fr') ||
  a.nom.localeCompare(b.nom, 'fr'));

/* ---------- 6. chiffres ---------- */
const N = V.length;
const nCat = new Set(V.map(v => v.cat)).size;
const nMarque = new Set(V.map(v => v.marque).filter(x => x && x !== 'Marque inconnue')).size;
const nReel = V.filter(v => v.reel).length;
const nSt = { officiel:0, vu:0, comm:0 };
V.forEach(v => nSt[v.st]++);
const parCat = {};
V.forEach(v => parCat[v.cat] = (parCat[v.cat] || 0) + 1);

/* ---------- 7. réécriture ciblée de vehicules.html ---------- */
let out = html;
function remplace(re, par, nom) {
  if (!re.test(out)) { console.error('  !! motif introuvable : ' + nom); return; }
  out = out.replace(re, par);
}

/* grille */
remplace(
  /(<div class="veh-grid" id="vgrid" data-mot="véhicule">)[\s\S]*?(<\/div>\n\n  <p class="vempty")/,
  '$1' + tri.map(carte).join('') + '$2',
  'grille'
);

/* compteurs du bandeau */
remplace(/<p class="vcount" id="vcount" role="status"><strong>\d+<\/strong>/,
  '<p class="vcount" id="vcount" role="status"><strong>' + N + '</strong>', 'vcount');

remplace(/<div class="vstat"><span class="n" data-count="\d+">0<\/span><span class="l">véhicules<\/span><\/div>[\s\S]*?<span class="l">inspirations identifiées<\/span><\/div>/,
  '<div class="vstat"><span class="n" data-count="' + N + '">0</span><span class="l">véhicules</span></div>\n'
+ '      <div class="vstat"><span class="n" data-count="' + nCat + '">0</span><span class="l">catégories</span></div>\n'
+ '      <div class="vstat"><span class="n" data-count="' + nMarque + '">0</span><span class="l">constructeurs</span></div>\n'
+ '      <div class="vstat"><span class="n" data-count="' + nReel + '">0</span><span class="l">modèles réels liés</span></div>',
  'vstats');

/* chips catégories */
remplace(/<button class="chip-filter is-on" data-filter="all">Tout<em>\d+<\/em><\/button>/,
  '<button class="chip-filter is-on" data-filter="all">Tout<em>' + N + '</em></button>', 'chip all');

remplace(/<button class="chip-filter" data-filter="berline">[\s\S]*?data-filter="divers">Divers<em>\d+<\/em><\/button>/,
  ORDRE.map(c => '<button class="chip-filter" data-filter="' + c + '">' + CAT[c] + '<em>' + (parCat[c] || 0) + '</em></button>').join(''),
  'chips catégories');

/* chips statut */
remplace(/data-stf="officiel">Nommés par Rockstar<em>\d+<\/em>/, 'data-stf="officiel">Nommés par Rockstar<em>' + nSt.officiel + '</em>', 'chip officiel');
remplace(/data-stf="vu">Vus officiellement<em>\d+<\/em>/, 'data-stf="vu">Vus officiellement<em>' + nSt.vu + '</em>', 'chip vu');
remplace(/data-stf="comm">Communautaires<em>\d+<\/em>/, 'data-stf="comm">Communautaires<em>' + nSt.comm + '</em>', 'chip comm');

/* ItemList */
const itemList = {
  '@context':'https://schema.org', '@type':'ItemList',
  name:'Véhicules de GTA VI recensés par Leonidakit', numberOfItems:N,
  itemListElement: tri.map((v, i) => ({
    '@type':'ListItem', position:i+1,
    name:(v.marque && v.marque !== 'Marque inconnue' ? v.marque + ' ' : '') + v.nom,
    url:'https://www.leonidakit.com/vehicules/' + v.id + '.html'
  }))
};
remplace(/<script type="application\/ld\+json">\{"@context":"https:\/\/schema\.org","@type":"ItemList"[\s\S]*?<\/script>/,
  '<script type="application/ld+json">' + JSON.stringify(itemList) + '</script>', 'ItemList');

/* titres et descriptions */
out = out.replace(/les 139 modèles recensés/g, 'les ' + N + ' modèles recensés')
         .replace(/les 139 modèles confirmés/g, 'les ' + N + ' modèles confirmés')
         .replace(/Les 139 véhicules confirmés/g, 'Les ' + N + ' véhicules confirmés')
         .replace(/"numberOfItems": 139/g, '"numberOfItems": ' + N)
         .replace(/139 véhicules confirmés de GTA VI par les trailers/g, N + ' véhicules confirmés de GTA VI par les trailers')
         .replace(/Nous recensons ici 139 véhicules, dont 9 sont nommés/g,
                  'Nous recensons ici ' + N + ' véhicules, dont ' + nSt.officiel + ' sont nommés')
         .replace(/Les 9 véhicules nommés par Rockstar/g, 'Les ' + nSt.officiel + ' véhicules nommés par Rockstar');

fs.writeFileSync('vehicules.html', out);

/* ---------- 8. source de vérité ---------- */
const entete = `/* ============================================================
   LEONIDAKIT — véhicules : source de vérité
     st   : officiel / vu / comm
     insp : modèle réel précis (rapprochement communautaire)
     fam  : famille réelle, quand aucun modèle unique ne se dégage
     reel : lien vers le modèle réel, calculé par build.js
     txt  : présentation rédigée, propre au véhicule
   Aucune donnée issue de fuites.
   ============================================================ */
window.LK_VEHICULES = `;
fs.writeFileSync('vehicules-data.js', entete + JSON.stringify(V) + ';\n');

console.log('véhicules      : ' + BASE.length + ' + ' + ajouts.length + ' = ' + N);
console.log('liens modèle   : ' + nReel + '/' + N);
console.log('statuts        : officiel ' + nSt.officiel + ' · vu ' + nSt.vu + ' · comm ' + nSt.comm);
console.log('constructeurs  : ' + nMarque + ' · catégories ' + nCat);
console.log('par catégorie  : ' + ORDRE.map(c => c + ' ' + (parCat[c] || 0)).join(' · '));

/* ---------- 9. index de recherche ---------- */
(function(){
  global.window = {};
  eval(fs.readFileSync('search-index.js', 'utf8'));
  const IDX = window.LK_INDEX;
  const deja = new Set(IDX.map(e => e.u));
  let n = 0;
  ajouts.forEach(v => {
    const u = '/vehicules/' + v.id + '.html';
    if (deja.has(u)) return;
    IDX.push({ l:(v.marque && v.marque !== 'Marque inconnue' ? v.marque + ' ' : '') + v.nom,
               k:'Véhicule', u, s:v.id });
    n++;
  });
  fs.writeFileSync('search-index.js',
    '/* Index de recherche, généré automatiquement. Ne pas éditer à la main. */\nwindow.LK_INDEX = '
    + JSON.stringify(IDX) + ';\n');
  console.log('index          : +' + n + ' entrées, ' + IDX.length + ' au total');
})();
