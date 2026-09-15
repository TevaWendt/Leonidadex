const fs = require('fs');
global.window = {};
eval(fs.readFileSync('vehicules-data.js', 'utf8'));
const V = window.LK_VEHICULES;

const MODELE = fs.readFileSync('vehicules/albany-emperor.html', 'utf8');
const HEADER = MODELE.match(/<a class="skip"[\s\S]*?<main id="main">/)[0];
const FOOTER = MODELE.match(/<footer>[\s\S]*?<\/body>/)[0];
const FAVICON = MODELE.match(/<link rel="icon"[^>]*>/)[0];
const CARTE_LIENS = MODELE.match(/<div class="fiche-liens rise">[\s\S]*?<\/div>/)[0];
const NOTE = MODELE.match(/<div class="note-box rise">[\s\S]*?<\/div>/)[0];
const PENDING = MODELE.match(/<h2 class="sec-h">Ce qui arrive avec le jeu<\/h2>([\s\S]*?)<\/div>\s*<\/section>/)[1];

const CAT = { berline:'Berlines', sport:'Voitures de sport', supercar:'Supercars',
  muscle:'Muscle cars', suv:'SUV et 4x4', pickup:'Pickups', van:'Vans et cargos',
  moto:'Deux-roues et quads', helicoptere:'Hélicoptères', avion:'Avions',
  bateau:'Bateaux et jet-skis', service:'Service et urgence', divers:'Divers' };
const ORDRE = ['berline','sport','supercar','muscle','suv','pickup','van','moto',
               'helicoptere','avion','bateau','service','divers'];
const ST = {
  officiel:{ chip:'Officiel', ligne:'Nommé par Rockstar', lede:'Nommé par Rockstar.' },
  vu:{ chip:'Aperçu officiel', ligne:'Vu dans un support officiel', lede:'Vu dans un support officiel, sans nom communiqué.' },
  comm:{ chip:'Communautaire', ligne:'Identification communautaire', lede:'Identification communautaire.' }
};

const hub0 = fs.readFileSync('vehicules.html', 'utf8');
const ART_ID = {}, ART_CAT = {};
let m; const re = /data-id="([^"]+)"[\s\S]{0,500}?(<svg class="veh-art"[\s\S]*?<\/svg>)/g;
while ((m = re.exec(hub0)) !== null) {
  ART_ID[m[1]] = m[2];
  const v = V.find(x => x.id === m[1]);
  if (v && !ART_CAT[v.cat]) ART_CAT[v.cat] = m[2];
}
const art = v => (ART_ID[v.id] || ART_CAT[v.cat] || ART_CAT.sport || '');
const artH = v => art(v).replace(/style="height:\d+px"/, 'style="height:120px"');

const MARQUES = {
  japonais:['toyota','nissan','honda','subaru','mitsubishi','mazda','yamaha','suzuki','kawasaki',
    'lexus','datsun','isuzu','skyline','impreza','civic','corolla','camry','sentra','patrol',
    'hilux','xr250','yzf','vfr','crf','ae86','cr-x','del sol','eclipse','japonais','japonaise'],
  europeen:['ferrari','lamborghini','porsche','bmw','mercedes','audi','bentley','aston martin',
    'jaguar','land rover','range rover','bugatti','pagani','maserati','alfa romeo','vespa','ducati',
    'piaggio','volkswagen','bavaria','agustawestland','testarossa','huracán','huracan','countach',
    'urus','cayenne','bentayga','f-type','db11','911','m4','sesto','veneno','sf90','458 italia','f12',
    'italienne','allemande','britannique','e30','e63','rs5','série 3','série 6'],
  americain:['cadillac','buick','chevrolet','ford','dodge','chrysler','lincoln','pontiac',
    'oldsmobile','amc','jeep','gmc','shelby','winnebago','grumman','cigarette','chris-craft',
    'bayliner','harley','mci','greyhound','lenco','boeing','stearman','cessna','bell','learjet',
    'sea-doo','de havilland','dhc','metromover','metrorail','corvette','mustang','camaro','charger',
    'challenger','silverado','tahoe','bronco','ranchero','malibu','impala','firebird','trans am',
    'javelin','riviera','eldorado','continental','fairlane','regal','lesabre','bel air','c10',
    'f-150','f-350','raptor','explorer','astro','safari','tradesman','kurbmaster','express','savana',
    'voyager','taurus','crown victoria','ah-6','h-13','chevelle','matador','gladiator','tacoma',
    'cherokee','k5 blazer','ram van','américain','americain','américaine','americaine']
};
const SLOT_LBL = { americain:'Modèle américain', japonais:'Modèle japonais', europeen:'Modèle européen' };
function origine(v) {
  const t = (v.insp || v.fam || '').toLowerCase();
  if (!t) return null;
  for (const k of ['japonais','europeen','americain'])
    if (MARQUES[k].some(w => t.includes(w))) return k;
  return null;
}
V.forEach(v => { const o = origine(v); if (o) v.slot = o; else delete v.slot; });

const tri = V.slice().sort((a,b) =>
  ORDRE.indexOf(a.cat) - ORDRE.indexOf(b.cat) ||
  (a.marque||'').localeCompare(b.marque||'','fr') || a.nom.localeCompare(b.nom,'fr'));

const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
  .replace(/"/g,'&quot;').replace(/'/g,'&#x27;');
const nomC = v => (v.marque && v.marque !== 'Marque inconnue' ? v.marque + ' ' : '') + v.nom;

function fiche(v, i) {
  const cat = CAT[v.cat], modele = v.insp || v.fam, st = ST[v.st];
  const nom = nomC(v);
  const prev = tri[(i - 1 + tri.length) % tri.length];
  const next = tri[(i + 1) % tri.length];
  const voisins = tri.filter(x => x.cat === v.cat && x.id !== v.id).slice(0, 6);
  const lede = nom + ' dans GTA VI : ' + cat.toLowerCase()
    + (modele ? (v.insp ? '. Inspiration : ' + modele : '. Famille : ' + modele) : '') + '. ' + st.lede;
  const aImages = Array.isArray(v.vues) && v.vues.length;
  const vues = aImages ? v.vues.join(',') : 'face,profil,detail';
  const tags = ['<span class="chip live">' + st.chip + '</span>']
    .concat(v.src ? ['<span class="chip">' + esc(v.src) + '</span>'] : [])
    .concat(aImages ? ['<span class="chip">Images officielles</span>'] : [])
    .concat(v.slot ? ['<span class="chip">' + SLOT_LBL[v.slot] + '</span>'] : []).join('\n          ');
  const panneauReel = v.reel ? `
<section class="shell reveal" id="modele-reel">
  <h2 class="sec-h">Le modèle réel</h2>
  <p class="fiche-txt rise">${v.insp
    ? 'Le rapprochement le plus solide pour ce véhicule est la <strong>' + esc(v.insp) + '</strong>. Rockstar ne confirme jamais ses inspirations : c&#x27;est une observation de joueurs à partir des visuels officiels, pas une licence.'
    : 'Aucun modèle unique ne se dégage. La famille réelle la plus proche est&nbsp;: <strong>' + esc(v.fam) + '</strong>.'}</p>
  <div class="fiche-liens rise"><a id="reel-bt" href="${esc(v.reel)}" target="_blank" rel="noopener nofollow">Voir ${esc(modele)} en photo</a><a href="https://fr.wikipedia.org/w/index.php?search=${encodeURIComponent(modele)}" target="_blank" rel="noopener nofollow">Fiche encyclopédique</a>${v.slot ? '<a href="../vehicules.html#slot=' + v.slot + '">Autres modèles ' + SLOT_LBL[v.slot].replace('Modèle ','') + 's</a>' : ''}</div>
</section>` : '';

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(nom)} — GTA VI | Leonidakit</title>
<meta name="description" content="${esc(lede)}">
<meta property="og:title" content="${esc(nom)} — GTA VI | Leonidakit">
<meta property="og:description" content="${esc(lede)}">
<meta property="og:type" content="website">
<meta property="og:locale" content="fr_FR">${aImages ? `
<meta property="og:image" content="https://www.leonidakit.com/img/vehicules/${v.id}-${v.vues[0]}.jpg">
<meta name="twitter:card" content="summary_large_image">` : ''}
<meta name="theme-color" content="#FDFBF7">
<meta name="color-scheme" content="light">
<link rel="canonical" href="https://www.leonidakit.com/vehicules/${v.id}.html">
${FAVICON}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;900&display=swap" rel="stylesheet">
<script type="application/ld+json">${JSON.stringify({'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[
  {'@type':'ListItem',position:1,name:'Accueil',item:'https://www.leonidakit.com/'},
  {'@type':'ListItem',position:2,name:'Véhicules',item:'https://www.leonidakit.com/vehicules.html'},
  {'@type':'ListItem',position:3,name:nom,item:'https://www.leonidakit.com/vehicules/'+v.id+'.html'}]})}</script>
<link rel="stylesheet" href="../style.css">
<link rel="stylesheet" href="../fiches.css">
<script type="application/ld+json">${JSON.stringify({'@context':'https://schema.org','@type':'Vehicle',
  name:nom, brand:{'@type':'Brand',name:v.marque||'Inconnu'}, model:v.nom,
  vehicleConfiguration:cat, url:'https://www.leonidakit.com/vehicules/'+v.id+'.html',
  isPartOf:{'@type':'VideoGame',name:'Grand Theft Auto VI'}})}</script>
</head>
<body data-own="vehicules">
${HEADER}
<section class="fhero fhero--${v.cat}">
  <div class="fhero-bg" aria-hidden="true"></div>
  <div class="shell">
    <nav class="crumbs" aria-label="Fil d'Ariane">
      <a href="../index.html">Accueil</a> <span>/</span>
      <a href="../vehicules.html">Véhicules</a> <span>/</span>
      <a href="../vehicules.html#cat=${v.cat}">${esc(cat)}</a> <span>/</span>
      <span aria-current="page">${esc(v.nom)}</span>
    </nav>
    <div class="fhero-in">
      <div class="fhero-txt">
        <p class="fiche-cat">${esc(cat)}</p>
        <h1>${esc(nom)}</h1>
        <p class="lede">${esc(lede)}</p>
        <div class="fiche-tags">
          ${tags}
        </div>
        <div class="fiche-liens"><button type="button" class="own-bt" id="own-bt" data-id="${v.id}"><span class="ck"></span><span>Ajouter à mon garage</span></button><a href="../comparateur.html?type=vehicules&amp;ids=${v.id}">Comparer</a>${v.reel ? '<a href="#modele-reel">Le modèle réel</a>' : ''}</div>
      </div>
      <div class="fhero-art fhero-art--gal">
        <div class="gal" data-base="../img/vehicules/${v.id}" data-vues="${vues}" data-nom="${esc(nom)}" data-vide="${aImages ? 0 : 1}"
             data-art="${esc(artH(v))}"></div>
        <p class="gal-note">${aImages ? esc(v.credit || 'Captures officielles de Rockstar Games.')
          : 'Aucune image officielle de ce véhicule n&#x27;a été publiée. Illustration provisoire.'}</p>
      </div>
    </div>
  </div>
</section>
<div class="fcount">
  <div class="shell fcount-in">
    <span class="fcount-lbl">Statistiques disponibles dans</span>
    <span class="fcount-nums" id="fcd">
      <span class="fcd-box"><b id="fd">—</b><i>j</i></span>
      <span class="fcd-box"><b id="fh">—</b><i>h</i></span>
      <span class="fcd-box"><b id="fm">—</b><i>min</i></span>
      <span class="fcd-box"><b id="fs">—</b><i>s</i></span>
    </span>
  </div>
</div>
<section class="shell reveal" id="presentation">
  <h2 class="sec-h">Ce qu'il faut savoir</h2>
  <p class="fiche-txt rise">${esc(v.txt || '')}</p>
</section>${panneauReel}
<section class="shell fiche-body">
  <div class="fiche-col reveal">
    <h2 class="sec-h">Identité</h2>
    <table class="spec rise">
      <tbody>
        <tr><th scope="row">Modèle</th><td>${esc(v.nom)}</td></tr>
        <tr><th scope="row">Constructeur</th><td>${esc(v.marque || 'Non identifié')}</td></tr>
        <tr><th scope="row">Statut</th><td>${st.ligne}</td></tr>
        <tr><th scope="row">Catégorie</th><td><a href="../vehicules.html#cat=${v.cat}">${esc(cat)}</a></td></tr>
        <tr><th scope="row">${v.insp ? 'Inspiration réelle' : 'Famille réelle'}</th><td>${modele ? esc(modele) + ' <span class="unknown">— rapprochement communautaire</span>' : '<span class="unknown">Non identifiée</span>'}</td></tr>${v.slot ? `
        <tr><th scope="row">Origine du modèle</th><td><a href="../vehicules.html#slot=${v.slot}">${SLOT_LBL[v.slot]}</a></td></tr>` : ''}
        <tr><th scope="row">Source</th><td>${esc(v.src || 'Rapprochement de la communauté')}</td></tr>
      </tbody>
    </table>
  </div>
  <div class="fiche-col reveal">
    <h2 class="sec-h">Ce qui arrive avec le jeu</h2>${PENDING}</div>
</section>
<section class="shell reveal" id="carte">
  <h2 class="sec-h">Sur la carte de Leonida</h2>
  <p class="fiche-txt rise">Concessions, atelier de personnalisation et circuit repérés sur notre carte. Les emplacements exacts de chaque véhicule seront ajoutés après la sortie.</p>
  ${CARTE_LIENS}
</section>
<section class="shell">
  ${NOTE}
</section>
<section class="shell reveal">
  <h2 class="rel-title">Autres ${esc(cat.toLowerCase())}</h2>
  <div class="rel-grid rise">${voisins.map(x =>
    '<a class="rel-card" href="' + x.id + '.html"><span class="rel-art">' + art(x) + '</span>'
    + '<span class="rel-txt"><span class="rel-marque">' + esc(x.marque || 'Marque inconnue') + '</span>'
    + '<span class="rel-nom">' + esc(x.nom) + '</span></span></a>').join('')}</div>
</section>
<nav class="fiche-nav shell" aria-label="Navigation entre fiches">
  <a class="fnav prev" href="${prev.id}.html">
    <span class="fnav-lbl">Précédent</span>
    <span class="fnav-nom">${esc(nomC(prev))}</span>
  </a>
  <a class="fnav next" href="${next.id}.html">
    <span class="fnav-lbl">Suivant</span>
    <span class="fnav-nom">${esc(nomC(next))}</span>
  </a>
</nav>
</main>
${FOOTER}
</html>
`;
}

tri.forEach((v, i) => fs.writeFileSync('vehicules/' + v.id + '.html', fiche(v, i)));

let H = hub0;
tri.forEach(v => { if (v.slot)
  H = H.replace('data-id="' + v.id + '" data-st=', 'data-id="' + v.id + '" data-slot="' + v.slot + '" data-st='); });
const nSlot = {}; V.forEach(v => { if (v.slot) nSlot[v.slot] = (nSlot[v.slot] || 0) + 1; });
const chipsSlot = '\n    <span class="chip-sep"></span>\n    '
  + ['americain','japonais','europeen'].map(k =>
      '<button class="chip-filter chip-slot" data-slotf="' + k + '">' + SLOT_LBL[k] + 's<em>' + (nSlot[k] || 0) + '</em></button>').join('\n    ');
H = H.replace(/(<button class="chip-filter chip-st" data-stf="comm">Communautaires<em>\d+<\/em><\/button>)/, '$1' + chipsSlot);
fs.writeFileSync('vehicules.html', H);

fs.writeFileSync('vehicules-data.js',
  fs.readFileSync('vehicules-data.js','utf8').split('window.LK_VEHICULES = ')[0]
  + 'window.LK_VEHICULES = ' + JSON.stringify(V) + ';\n');

const d = new Date().toISOString().slice(0,10);
['sitemap.xml','sitemap-fiches.xml'].forEach(f => {
  if (!fs.existsSync(f)) return;
  let s = fs.readFileSync(f, 'utf8'), n = 0;
  const bloc = V.filter(v => s.indexOf('/vehicules/' + v.id + '.html') < 0).map(v => { n++;
    return '  <url>\n    <loc>https://www.leonidakit.com/vehicules/' + v.id + '.html</loc>\n'
      + '    <lastmod>' + d + '</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>'; }).join('\n');
  if (n) { s = s.replace('</urlset>', bloc + '\n</urlset>'); fs.writeFileSync(f, s); }
  console.log(f.padEnd(20) + ' +' + n + ' URL');
});
console.log('fiches régénérées : ' + tri.length);
console.log('origine détectée  : ' + Object.entries(nSlot).map(([k,n]) => k + ' ' + n).join(' · ')
  + ' · non classés ' + V.filter(v => !v.slot).length);
