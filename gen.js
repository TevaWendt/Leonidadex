const fs=require('fs');
global.window={}; eval(fs.readFileSync('vehicules-data.js','utf8'));
const V=window.LK_VEHICULES;

const CATL={berline:'Berlines',sport:'Voitures de sport',supercar:'Supercars',muscle:'Muscle cars',
 suv:'SUV et 4x4',pickup:'Pickups et tout-terrain',van:'Vans et cargos',moto:'Deux-roues et quads',
 helicoptere:'Hélicoptères',avion:'Avions',bateau:'Bateaux et jet-skis',service:'Service et urgence',divers:'Divers'};
const ORDRE=Object.keys(CATL);
const ST={officiel:{c:'Officiel',l:'Nommé par Rockstar',d:'Nommé par Rockstar.'},
 vu:{c:'Aperçu officiel',l:'Vu dans un support officiel',d:'Vu dans un support officiel, sans nom communiqué.'},
 comm:{c:'Communautaire',l:'Identification communautaire',d:'Identification communautaire.'}};
const SLOT={americain:'Modèle américain',japonais:'Modèle japonais',europeen:'Modèle européen'};
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#x27;');
const nomC=v=>(v.marque&&v.marque!=='Marque inconnue'?v.marque+' ':'')+v.nom;

/* silhouettes et vignettes existantes */
const hub0=fs.readFileSync('vehicules.html','utf8');
const ART_ID={},ART_CAT={},THUMB={};
let m;const re=/<a class="veh-card rise" href="vehicules\/[^"]+\.html" data-id="([^"]+)"[\s\S]*?<div class="veh-thumb([^"]*)">([\s\S]*?)<\/div><div class="veh-body">/g;
while((m=re.exec(hub0))!==null){ THUMB[m[1]]={cls:m[2],in:m[3]};
  const s=m[3].match(/<svg class="veh-art"[\s\S]*?<\/svg>/); if(s){ ART_ID[m[1]]=s[0];
    const v=V.find(x=>x.id===m[1]); if(v&&!ART_CAT[v.cat])ART_CAT[v.cat]=s[0]; } }
const art=v=>ART_ID[v.id]||ART_CAT[v.cat]||ART_CAT.sport||'';

/* ================= HUB ================= */
function carte(v){
 const t=THUMB[v.id];
 const cls=t?t.cls:' veh-thumb--'+v.cat;
 const inner=t?t.in.replace(/<span class="veh-badge">[^<]*<\/span>/,'<span class="veh-badge">'+CATL[v.cat]+'</span>')
   :'<span class="veh-badge">'+CATL[v.cat]+'</span>'+art(v);
 return '<a class="veh-card rise" href="vehicules/'+v.id+'.html" data-id="'+v.id+'"'
  +(v.slot?' data-slot="'+v.slot+'"':'')+' data-st="'+v.st+'" data-cat="'+v.cat+'"'
  +(v.reel?' data-reel="'+esc(v.reel)+'" data-reel-nom="'+esc(v.reelNom)+'"':'')
  +' data-search="'+esc(v.search)+'">'
  +'<div class="veh-thumb'+cls+'">'+inner+'</div><div class="veh-body">'
  +'<span class="veh-st veh-st--'+v.st+'">'+ST[v.st].c+'</span>'
  +(v.edition?'<span class="veh-ed">'+esc(v.edition==='Pre-Order'?'Précommande':'Édition Ultimate')+'</span>':'')
  +'<span class="veh-marque">'+esc(v.marque||'Marque inconnue')+'</span><h3>'+esc(v.nom)+'</h3>'
  +(v.insp?'<p class="veh-insp">Inspiration&nbsp;: <span>'+esc(v.insp)+'</span></p>'
    :v.fam?'<p class="veh-insp veh-insp--fam">Famille&nbsp;: <span>'+esc(v.fam)+'</span></p>':'')
  +'<span class="veh-go">Voir la fiche</span></div></a>';
}
let H=hub0;
const N=V.length, nCat=new Set(V.map(v=>v.cat)).size;
const nMq=new Set(V.map(v=>v.marque).filter(x=>x&&x!=='Marque inconnue')).size;
const nSt={officiel:0,vu:0,comm:0}; V.forEach(v=>nSt[v.st]++);
const nSlot={}; V.forEach(v=>{if(v.slot)nSlot[v.slot]=(nSlot[v.slot]||0)+1;});
const parCat={}; V.forEach(v=>parCat[v.cat]=(parCat[v.cat]||0)+1);

H=H.replace(/(<div class="veh-grid" id="vgrid" data-mot="véhicule">)[\s\S]*?(<\/div>\n\n  <p class="vempty")/,
  '$1'+V.map(carte).join('')+'$2');
H=H.replace(/<p class="vcount" id="vcount" role="status"><strong>\d+<\/strong>/,
  '<p class="vcount" id="vcount" role="status"><strong>'+N+'</strong>');
H=H.replace(/<div class="vstat"><span class="n" data-count="\d+">0<\/span><span class="l">véhicules<\/span><\/div>[\s\S]*?<span class="l">inspirations identifiées<\/span><\/div>/,
  ['<div class="vstat"><span class="n" data-count="'+N+'">0</span><span class="l">véhicules</span></div>',
   '<div class="vstat"><span class="n" data-count="'+nCat+'">0</span><span class="l">catégories</span></div>',
   '<div class="vstat"><span class="n" data-count="'+nMq+'">0</span><span class="l">constructeurs</span></div>',
   '<div class="vstat"><span class="n" data-count="'+V.filter(v=>v.insp).length+'">0</span><span class="l">modèles réels identifiés</span></div>'].join('\n      '));
H=H.replace(/<button class="chip-filter is-on" data-filter="all">Tout<em>\d+<\/em><\/button>/,
  '<button class="chip-filter is-on" data-filter="all">Tout<em>'+N+'</em></button>');
H=H.replace(/<button class="chip-filter" data-filter="berline">[\s\S]*?data-filter="divers">Divers<em>\d+<\/em><\/button>/,
  ORDRE.map(c=>'<button class="chip-filter" data-filter="'+c+'">'+CATL[c]+'<em>'+(parCat[c]||0)+'</em></button>').join(''));
H=H.replace(/data-stf="officiel">Nommés par Rockstar<em>\d+<\/em>/,'data-stf="officiel">Nommés par Rockstar<em>'+nSt.officiel+'</em>')
   .replace(/data-stf="vu">Vus officiellement<em>\d+<\/em>/,'data-stf="vu">Vus officiellement<em>'+nSt.vu+'</em>')
   .replace(/data-stf="comm">Communautaires<em>\d+<\/em>/,'data-stf="comm">Communautaires<em>'+nSt.comm+'</em>');
H=H.replace(/(<button class="chip-filter chip-st" data-stf="comm">Communautaires<em>\d+<\/em><\/button>)/,
 '$1\n    <span class="chip-sep"></span>\n    '+['americain','japonais','europeen'].map(k=>
  '<button class="chip-filter chip-slot" data-slotf="'+k+'">'+SLOT[k]+'s<em>'+(nSlot[k]||0)+'</em></button>').join('\n    '));

/* styles ajoutés */
H=H.replace('.chip-filter.chip-st em{background:rgba(0,0,0,.08);}',
 `.chip-filter.chip-st em{background:rgba(0,0,0,.08);}
.chip-filter.chip-slot em{background:rgba(0,0,0,.08);}
.veh-ed{display:inline-flex;align-self:flex-start;font-size:.6rem;font-weight:800;letter-spacing:.05em;
  text-transform:uppercase;padding:2px 8px;border-radius:20px;margin:0 0 7px;
  background:rgba(245,165,36,.2);color:#7A4E0A;}
.ouvert{border:2px solid #1A1A1E;border-radius:12px;padding:20px 22px;background:#fff;
  box-shadow:4px 4px 0 rgba(26,26,30,.12);margin-top:18px;}
.ouvert h3{margin:0 0 8px;font-size:1.05rem;}
.ouvert p{margin:0 0 10px;font-size:.9rem;line-height:1.65;color:#55525C;max-width:74ch;}
.ouvert p:last-child{margin-bottom:0;}
.ouvert b{color:#1A1A1E;}`);

/* bloc « et d'autres à venir » */
const bloc=`
<section class="shell reveal" id="a-venir">
  <h2 class="sec-h">Et les autres ?</h2>
  <div class="ouvert rise">
    <h3>Cette liste est incomplète, et c'est normal</h3>
    <p>Rockstar n'a publié aucun total. Pour situer : <b>GTA V comptait 252 véhicules au lancement</b>,
    avant les centaines ajoutées par GTA Online. Leonidakit en recense aujourd'hui <b>${N}</b>, tous
    repérés dans un support officiel de Rockstar ou identifiés par la communauté à partir de ces supports.</p>
    <p>D'autres sites annoncent des chiffres plus élevés. L'écart vient de là : ils comptent des véhicules
    vus dans les fuites de 2022 et de 2026. <b>Nous ne les listons pas</b>, parce qu'un véhicule vu dans du
    code volé peut ne jamais sortir, et parce que relayer ce matériel n'est ni légitime ni utile au joueur.</p>
    <p>Le compte réel sera connu le <b>19 novembre 2026</b>. Cette page sera mise à jour à partir du jeu
    lui-même, avec les vitesses, les prix et les emplacements qui manquent encore à chaque fiche.</p>
  </div>
</section>
`;
H=H.replace('<section class="shell reveal" id="aller-plus-loin">', bloc+'<section class="shell reveal" id="aller-plus-loin">');

/* données structurées */
H=H.replace(/<script type="application\/ld\+json">\{"@context":"https:\/\/schema\.org","@type":"ItemList"[\s\S]*?<\/script>/,
 '<script type="application/ld+json">'+JSON.stringify({'@context':'https://schema.org','@type':'ItemList',
  name:'Véhicules de GTA VI recensés par Leonidakit',numberOfItems:N,
  itemListElement:V.map((v,i)=>({'@type':'ListItem',position:i+1,name:nomC(v),
   url:'https://www.leonidakit.com/vehicules/'+v.id+'.html'}))})+'</script>');
H=H.replace(/les 139 modèles recensés/g,'les '+N+' modèles recensés')
   .replace(/les 139 modèles confirmés/g,'les '+N+' modèles confirmés')
   .replace(/Les 139 véhicules confirmés/g,'Les '+N+' véhicules confirmés')
   .replace(/"numberOfItems": 139/g,'"numberOfItems": '+N)
   .replace(/139 véhicules confirmés de GTA VI/g,N+' véhicules confirmés de GTA VI')
   .replace(/Nous recensons ici 139 véhicules, dont 9 sont nommés/g,'Nous recensons ici '+N+' véhicules, dont '+nSt.officiel+' sont nommés')
   .replace(/Les 9 véhicules nommés par Rockstar/g,'Les '+nSt.officiel+' véhicules nommés par Rockstar');
fs.writeFileSync('vehicules.html',H);

/* ================= FICHES ================= */
const MOD=fs.readFileSync('vehicules/albany-emperor.html','utf8');
const HEADER=MOD.match(/<a class="skip"[\s\S]*?<main id="main">/)[0];
const FOOTER=MOD.match(/<footer>[\s\S]*?<\/body>/)[0];
const FAV=MOD.match(/<link rel="icon"[^>]*>/)[0];
const CARTE=MOD.match(/<div class="fiche-liens rise">[\s\S]*?<\/div>/)[0];
const NOTE=MOD.match(/<div class="note-box rise">[\s\S]*?<\/div>/)[0];
const PEND=MOD.match(/<h2 class="sec-h">Ce qui arrive avec le jeu<\/h2>([\s\S]*?)<\/div>\s*<\/section>/)[1];
const artH=v=>art(v).replace(/style="height:\d+px"/,'style="height:120px"');

function fiche(v,i){
 const cat=CATL[v.cat],mod=v.insp||v.fam,st=ST[v.st],nom=nomC(v);
 const prev=V[(i-1+V.length)%V.length],next=V[(i+1)%V.length];
 const vois=V.filter(x=>x.cat===v.cat&&x.id!==v.id).slice(0,6);
 const ed=v.edition==='Pre-Order'?'Bonus de précommande':v.edition?'Exclusif à l\u2019édition Ultimate':null;
 const lede=nom+' dans GTA VI : '+cat.toLowerCase()+(mod?'. Inspiration : '+mod:'')+'. '+st.d;
 const img=Array.isArray(v.vues)&&v.vues.length, vues=img?v.vues.join(','):'face,profil,detail';
 const tags=['<span class="chip live">'+st.c+'</span>']
  .concat(ed?['<span class="chip">'+ed+'</span>']:[])
  .concat(img?['<span class="chip">Images officielles</span>']:[])
  .concat(v.slot?['<span class="chip">'+SLOT[v.slot]+'</span>']:[]).join('\n          ');
 const panneau=v.reel?`
<section class="shell reveal" id="modele-reel">
  <h2 class="sec-h">Le modèle réel</h2>
  <p class="fiche-txt rise">Le rapprochement retenu pour ce véhicule est <strong>${esc(v.insp||v.fam)}</strong>. Rockstar ne confirme jamais ses inspirations : c&#x27;est une observation établie à partir des visuels officiels, pas une licence.</p>
  <div class="fiche-liens rise"><a id="reel-bt" href="${esc(v.reel)}" target="_blank" rel="noopener nofollow">Voir ${esc(v.reelNom)} en photo</a><a href="https://fr.wikipedia.org/w/index.php?search=${encodeURIComponent(v.reelNom)}" target="_blank" rel="noopener nofollow">Fiche encyclopédique</a>${v.slot?'<a href="../vehicules.html#slot='+v.slot+'">Autres modèles '+SLOT[v.slot].replace('Modèle ','')+'s</a>':''}</div>
</section>`:'';
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
<meta property="og:locale" content="fr_FR">${img?`
<meta property="og:image" content="https://www.leonidakit.com/img/vehicules/${v.id}-${v.vues[0]}.jpg">
<meta name="twitter:card" content="summary_large_image">`:''}
<meta name="theme-color" content="#FDFBF7">
<meta name="color-scheme" content="light">
<link rel="canonical" href="https://www.leonidakit.com/vehicules/${v.id}.html">
${FAV}
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
 name:nom,brand:{'@type':'Brand',name:v.marque||'Inconnu'},model:v.nom,vehicleConfiguration:cat,
 url:'https://www.leonidakit.com/vehicules/'+v.id+'.html',isPartOf:{'@type':'VideoGame',name:'Grand Theft Auto VI'}})}</script>
</head>
<body data-own="vehicules">
${HEADER}
<section class="fhero fhero--${v.cat==='pickup'?'pickup':v.cat}">
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
        <div class="fiche-liens"><button type="button" class="own-bt" id="own-bt" data-id="${v.id}"><span class="ck"></span><span>Ajouter à mon garage</span></button><a href="../comparateur.html?type=vehicules&amp;ids=${v.id}">Comparer</a>${v.reel?'<a href="#modele-reel">Le modèle réel</a>':''}</div>
      </div>
      <div class="fhero-art fhero-art--gal">
        <div class="gal" data-base="../img/vehicules/${v.id}" data-vues="${vues}" data-nom="${esc(nom)}" data-vide="${img?0:1}"
             data-art="${esc(artH(v))}"></div>
        <p class="gal-note">${img?esc(v.credit||'Captures officielles de Rockstar Games.'):'Aucune image officielle de ce véhicule n&#x27;a été publiée. Illustration provisoire.'}</p>
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
  <p class="fiche-txt rise">${esc(v.txt||'')}</p>
</section>${panneau}
<section class="shell fiche-body">
  <div class="fiche-col reveal">
    <h2 class="sec-h">Identité</h2>
    <table class="spec rise">
      <tbody>
        <tr><th scope="row">Modèle</th><td>${esc(v.nom)}${v.alias?' <span class="unknown">— anciennement '+esc(v.alias)+'</span>':''}</td></tr>
        <tr><th scope="row">Constructeur</th><td>${esc(v.marque||'Non identifié')}</td></tr>
        <tr><th scope="row">Statut</th><td>${st.l}</td></tr>
        <tr><th scope="row">Catégorie</th><td><a href="../vehicules.html#cat=${v.cat}">${esc(cat)}</a></td></tr>
        <tr><th scope="row">Inspiration réelle</th><td>${mod?esc(mod)+' <span class="unknown">— rapprochement communautaire</span>':'<span class="unknown">Non identifiée</span>'}</td></tr>${v.slot?`
        <tr><th scope="row">Origine du modèle</th><td><a href="../vehicules.html#slot=${v.slot}">${SLOT[v.slot]}</a></td></tr>`:''}${ed?`
        <tr><th scope="row">Disponibilité</th><td><a href="../vehicules-rares.html">${ed}</a></td></tr>`:''}
        <tr><th scope="row">Source</th><td>${esc(v.src||'Rapprochement de la communauté')}</td></tr>
      </tbody>
    </table>
  </div>
  <div class="fiche-col reveal">
    <h2 class="sec-h">Ce qui arrive avec le jeu</h2>${PEND}</div>
</section>
<section class="shell reveal" id="carte">
  <h2 class="sec-h">Sur la carte de Leonida</h2>
  <p class="fiche-txt rise">Concessions, atelier de personnalisation et circuit repérés sur notre carte. Les emplacements exacts de chaque véhicule seront ajoutés après la sortie.</p>
  ${CARTE}
</section>
<section class="shell">
  ${NOTE}
</section>
<section class="shell reveal">
  <h2 class="rel-title">Autres ${esc(cat.toLowerCase())}</h2>
  <div class="rel-grid rise">${vois.map(x=>'<a class="rel-card" href="'+x.id+'.html"><span class="rel-art">'+art(x)
   +'</span><span class="rel-txt"><span class="rel-marque">'+esc(x.marque||'Marque inconnue')
   +'</span><span class="rel-nom">'+esc(x.nom)+'</span></span></a>').join('')}</div>
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
const garder=new Set(V.map(v=>v.id+'.html'));
fs.readdirSync('vehicules').forEach(f=>{ if(f.endsWith('.html')&&!garder.has(f)) fs.unlinkSync('vehicules/'+f); });
V.forEach((v,i)=>fs.writeFileSync('vehicules/'+v.id+'.html',fiche(v,i)));

/* index de recherche */
global.window={}; eval(fs.readFileSync('search-index.js','utf8'));
let IDX=window.LK_INDEX.filter(e=>e.u.indexOf('/vehicules/')!==0);
V.forEach(v=>IDX.push({l:nomC(v),k:'Véhicule',u:'/vehicules/'+v.id+'.html',s:v.id}));
fs.writeFileSync('search-index.js','/* Index de recherche, généré automatiquement. Ne pas éditer à la main. */\nwindow.LK_INDEX = '+JSON.stringify(IDX)+';\n');

/* sitemaps */
const d=new Date().toISOString().slice(0,10);
['sitemap.xml','sitemap-fiches.xml'].forEach(f=>{
  let s=fs.readFileSync(f,'utf8');
  s=s.replace(/\s*<url>(?:(?!<\/url>)[\s\S])*?\/vehicules\/[a-z0-9-]+\.html[\s\S]*?<\/url>/g,'');
  const bloc=V.map(v=>'  <url>\n    <loc>https://www.leonidakit.com/vehicules/'+v.id+'.html</loc>\n    <lastmod>'+d+'</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>').join('\n');
  s=s.replace('</urlset>',bloc+'\n</urlset>');
  fs.writeFileSync(f,s);
});
console.log('fiches générées :',V.length);
console.log('index           :',IDX.length,'entrées');
