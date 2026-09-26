/* Keep static HTML, search, images and sitemaps consistent. No runtime framework. */
/* Lot E : version des fichiers de Léo (chargés dynamiquement, hors empreintes des pages). Doit précéder les empreintes des pages. */
{const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
 const inputs=['leo-index.json','leo-core.js','leo-link.js','leo-ui.js','leo-loader.js','leo-calculator.js','leo.css','calculateurs-engine.js','motion-tokens.css'].filter(f=>fs.existsSync(path.join(root,f)));
 const norm=t=>t.replace(/\?v=(?:LEO|__LEO_VERSION__|[a-f0-9]{12})/g,'?v=LEO');
 const version=crypto.createHash('sha256').update(inputs.map(f=>f+'\n'+norm(read(f))).join('\n')).digest('hex').slice(0,12);
 for(const f of ['common.js','leo-ui.js','leo-loader.js','leo.css'])if(fs.existsSync(path.join(root,f))){const cur=read(f),next=cur.replace(/\?v=(?:LEO|__LEO_VERSION__|[a-f0-9]{12})/g,'?v='+version);if(next!==cur)fs.writeFileSync(path.join(root,f),next);}}

const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.resolve(__dirname,'..');process.chdir(root);
// Catalogue du calculateur : projeter les sources avant le calcul de version.
require('child_process').execFileSync(process.execPath,[path.join(__dirname,'gen-calculateurs-catalogue.cjs')],{stdio:'inherit'});
const crypto=require('crypto');
// Les empreintes sont calculées après toutes les sorties, fichier par fichier.
const data={window:{}};for(const f of ['vehicules-data.js','armes-data.js','search-index.js','carte-gtadb.js'])vm.runInNewContext(fs.readFileSync(f,'utf8'),data);
const V=data.window.LK_VEHICULES,A=data.window.LK_ARMES;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const name=v=>(v.marque&&v.marque!=='Marque inconnue'?v.marque+' ':'')+v.nom;
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(x=>x.isDirectory()?walk(path.join(d,x.name)):[path.join(d,x.name)]);
const shipped=['photos','img'].flatMap(d=>fs.existsSync(d)?walk(d):[]).map(p=>'/'+p.replaceAll('\\','/')).sort();if(fs.existsSync('credits-reels.json'))shipped.push('/credits-reels.json');
// Le manifeste chargé par toutes les pages ne liste pas les photos de la carte : elles ne servent qu'à carte.html et carte-gtadb.js est déjà filtré ci-dessous.
const assets=shipped.filter(p=>!p.startsWith('/photos/'));
fs.writeFileSync('assets-manifest.js','/* Generated from the files actually shipped. */\nwindow.LK_ASSETS = '+JSON.stringify(assets)+';\n');
const assetSet=new Set(shipped);
const available=(file,u)=>{try{const url=new URL(u,'https://www.leonidakit.com/'+file);return url.origin!=='https://www.leonidakit.com'||url.protocol==='data:'||assetSet.has(url.pathname);}catch{return false;}};
let home=fs.readFileSync('index.html','utf8');home=home.replace(/data-count="\d+">\d+<\/span><span class="label">fiches véhicules/, 'data-count="'+V.length+'">'+V.length+'</span><span class="label">fiches véhicules');
home=home.replace(/(class="chip live">)\d+ fiches<\/span>/g,'$1'+(V.length+A.length)+' fiches</span>').replace(/\d+ véhicules, \d+ armes/g,V.length+' véhicules, '+A.length+' armes');
// Resolve the explicit counter independently of its presentation classes.
home=home.replace(/(<[^>]+data-count=")\d+("[^>]*>)\d+(<\/[^>]+>\s*<[^>]+>fiches véhicules)/g,'$1'+V.length+'$2'+V.length+'$3');
home=home.replace('Les outils sont prêts, les données arrivent avec le jeu.','La carte et les catalogues sont accessibles. Les autres outils se complètent avec le jeu.');
home=home.replace('Six comtés confirmés par Rockstar à ce jour.','Six comtés recensés. Leur niveau de certitude est détaillé sur la carte.').replace('comtés à explorer','comtés recensés');fs.writeFileSync('index.html',home);
let hub=fs.readFileSync('vehicules.html','utf8');const st=V.reduce((a,v)=>(a[v.st]=(a[v.st]||0)+1,a),{});
const counts=[V.length,new Set(V.map(v=>v.cat)).size,new Set(V.map(v=>v.marque).filter(x=>x&&x!=='Marque inconnue')).size,V.filter(v=>v.insp).length];let ci=0;
hub=hub.replace(/(<span class="n" data-count=")\d+(">)\d+(<\/span>)/g,(_,a,b,c)=>{const n=counts[ci++];return a+n+b+n+c;});
hub=hub.replace(/(<div class="kpi"><b>)\d+(<\/b><span>véhicules recensés ici)/,'$1'+V.length+'$2').replace(/(<div class="kpi"><b>)\d+(<\/b><span>nommés par Rockstar)/,'$1'+st.officiel+'$2').replace(/(<div class="kpi"><b>)\d+(<\/b><span>vus sans nom communiqué)/,'$1'+st.vu+'$2').replace(/(<div class="kpi"><b>)\d+(<\/b><span>identifications communautaires)/,'$1'+st.comm+'$2');
hub=hub.replace(/Nous recensons ici \d+ véhicules/g,'Nous recensons ici '+V.length+' véhicules').replace(/les \d+ modèles (recensés|confirmés)/g,'les '+V.length+' modèles recensés');
const kit=v=>'<a class="kit kit--lien" href="vehicules/'+v.id+'.html"><b>'+esc(name(v))+'</b><span>'+esc(v.insp||v.fam)+'</span><span class="kit-src">'+esc(v.src)+'</span></a>';
hub=hub.replace(/(<div class="kit-grid rise">)[\s\S]*?(<\/div>)/, '$1'+V.filter(v=>v.st==='officiel').map(kit).join('')+'$2');fs.writeFileSync('vehicules.html',hub);

let arms=fs.readFileSync('armes.html','utf8');const ast=A.reduce((m,a)=>(m[a.st]=(m[a.st]||0)+1,m),{});let ai=0;
const ac=[A.length,new Set(A.map(a=>a.cat)).size,ast.officiel,2];
arms=arms.replace(/(<span class="n" data-count=")\d+(">)\d+(<\/span>)/g,(_,a,b,c)=>{const n=ac[ai++];return a+n+b+n+c;}).replace(/22 armes/g,A.length+' armes').replace(/(<p class="vcount"[^>]*><strong>)\d+/, '$1'+A.length);
for(const slot of ['dos','main','poing']){const allowed=A.filter(a=>slot==='poing'?a.slot==='poing'&&['pistolet','pm'].includes(a.cat):a.slot==='longue');const pattern=new RegExp('(<select[^>]+id="lo-'+slot+'"[^>]*>)[\\s\\S]*?<\\/select>');arms=arms.replace(pattern,'$1<option value="">Aucune</option>'+allowed.map(a=>'<option value="'+a.id+'">'+esc(a.nom)+' · '+esc(data.window.LK_ARMES_CATS[a.cat])+'</option>').join('')+'</select>');}
fs.writeFileSync('armes.html',arms);

let ranking=fs.readFileSync('classement-vehicules.html','utf8');ranking=ranking.replace(/(<select[^>]+id="cl-sel"[^>]*>)[\s\S]*?<\/select>/,'$1<option value="">Ajouter un véhicule</option>'+V.map(v=>'<option value="'+v.id+'">'+esc(name(v))+'</option>').join('')+'</select>');fs.writeFileSync('classement-vehicules.html',ranking);
let rare=fs.readFileSync('vehicules-rares.html','utf8');rare=rare.replace(/(<a class="rare-card rise" href="vehicules\/([^"/]+)\.html">)([\s\S]*?)(<\/a>)/g,(all,open,id,body,end)=>{const v=V.find(x=>x.id===id);if(!v)return all;return open+body.replace(/<div class="rare-img">[\s\S]*?<\/div>/,'<div class="rare-img'+(/\.svg$/.test(v.thumb||'')?' rare-img--schema':'')+'"><img src="'+(v.thumb||'/img/schemas/'+v.id+'.svg')+'" alt="" loading="lazy" decoding="async"></div>').replace(/(<span class="veh-marque">)[\s\S]*?<\/span>/,'$1'+esc(v.marque)+'</span>').replace(/<h3>[\s\S]*?<\/h3>/,'<h3>'+esc(v.nom)+'</h3>').replace(/<p>[\s\S]*?<\/p>/,'<p>'+esc(v.insp||v.fam)+'</p>').replace(/(<span class="rare-src">)[\s\S]*?<\/span>/,'$1'+esc(v.src)+'</span>')+end;});
rare=rare.replace('Vus une seule fois','Noms repérés sur les visuels').replace(/mais qui n'apparaissent nulle part ailleurs : ni dans les trailers, ni dans les listes des autres\s+sites\./,"dont l'identification est consignée dans notre base.");fs.writeFileSync('vehicules-rares.html',rare);

const rawPath='outils/data/carte-gtadb-source.json';fs.mkdirSync('outils/data',{recursive:true});
if(!fs.existsSync(rawPath))fs.writeFileSync(rawPath,JSON.stringify(data.window.LK_GTADB));
const mapData=JSON.parse(fs.readFileSync(rawPath,'utf8'));
for(const p of [...mapData.groupes,...mapData.lieux,...Object.values(mapData.enrichit)])for(const key of ['img','img2'])if(p[key]&&!available('carte.html',p[key]))delete p[key];
fs.writeFileSync('carte-gtadb.js','/* Generated from data/carte-gtadb-source.json. gtadb.org et ses contributeurs, CC BY 4.0; adapté pour Leonidakit. */\nwindow.LK_GTADB = '+JSON.stringify(mapData)+';\n');

const htmlFiles=[...fs.readdirSync('.').filter(x=>x.endsWith('.html')),...['armes','vehicules','lieux','personnages','entreprises','demeures','planques'].filter(d=>fs.existsSync(d)).flatMap(d=>fs.readdirSync(d).filter(f=>f.endsWith('.html')).map(f=>d+'/'+f))].sort();
const canonicals=[];
for(const file of htmlFiles){let s=fs.readFileSync(file,'utf8');if(file.startsWith('google'))continue;const prefix=file==='404.html'?'/':file.includes('/')?'../':'';
 if(s.includes('app.js')){
  s=s.replace(/<script src="(?:\.\.\/|\/)?(?:assets-manifest|common)\.js"><\/script>\n?/g,'');
  s=s.replace(/(<script src="(?:\.\.\/|\/)?app\.js"><\/script>)/,'<script src="'+prefix+'assets-manifest.js"></script>\n<script src="'+prefix+'common.js"></script>\n$1');
 }
 if(!s.includes('name="viewport"'))s=s.replace('</head>','<meta name="viewport" content="width=device-width, initial-scale=1.0">\n</head>');
 // v7.37 : police Archivo hébergée sur le site (style.css) : plus aucun lien vers Google Fonts, préchargement du fichier latin.
 s=s.replace(/[ \t]*<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com">\s*\n?/g,'').replace(/[ \t]*<link rel="preconnect" href="https:\/\/fonts\.gstatic\.com" crossorigin>\s*\n?/g,'').replace(/[ \t]*<link href="https:\/\/fonts\.googleapis\.com\/css2[^"]*" rel="stylesheet">\s*\n?/g,'');
 if(!s.includes('rel="preload" href="/fonts/archivo-latin.woff2"'))s=s.replace(/(<link rel="stylesheet" href="(?:\.\.\/|\/)?style\.css[^>]*>)/,'<link rel="preload" href="/fonts/archivo-latin.woff2" as="font" type="font/woff2" crossorigin>\n$1');
 // v7.37 : aperçus d'images larges autorisés dans les résultats de recherche (pages indexables sans directive robots).
 if(!s.includes('name="robots"')&&!s.includes('http-equiv="refresh"'))s=s.replace(/(<meta name="description"[^>]*>)/,'$1\n<meta name="robots" content="max-image-preview:large">');
 if(s.includes('http-equiv="refresh"')&&!s.includes('name="robots"'))s=s.replace('</head>','<meta name="robots" content="noindex, follow">\n</head>');
 s=s.replace(/\s+onerror="[^"]*"/g,'');
 // Separate the catalogue link from its possession/comparison buttons.
 s=s.replace(/<a class="([^"]*\bveh-card\b[^"]*)" href="([^"]+)"([^>]*)>([\s\S]*?)<\/a>/g,(_,cls,href,attrs,body)=>'<article class="'+cls+'"'+attrs+'><a class="veh-link" href="'+href+'">'+body+'</a></article>');
 // Avoid known-missing image requests; do not erase source view declarations.
 s=s.replace(/(<h2>Contenu<\/h2>\s*<nav>)(<a href="(\.\.\/)?carte\.html">Carte<\/a>[\s\S]*?)(<\/nav>)/,(m0,a,b,p,c)=>{p=p||'';let nb=b;if(!nb.includes('lieux.html'))nb+='<a href="'+p+'lieux.html">Lieux</a><a href="'+p+'personnages.html">Personnages</a><a href="'+p+'entreprises.html">Entreprises</a>';if(!nb.includes('demeures.html'))nb+='<a href="'+p+'demeures.html">Demeures</a><a href="'+p+'planques.html">Planques</a>';return a+nb+c;});
 s=s.replace(/<img\b[^>]*src="([^"]+)"[^>]*>/g,(tag,src)=>available(file,src)?tag:'<span class="image-placeholder">Visuel à intégrer</span>');
 s=s.replace(/<div class="gal"([^>]+)>/g,(tag,attrs)=>{const base=attrs.match(/data-base="([^"]+)"/)?.[1];const vv=attrs.match(/data-vues="([^"]*)"/)?.[1]||'face,profil,detail';const views=vv.split(',').filter(v=>v&&available(file,base+'-'+v+'.jpg'));attrs=attrs.replace(/\sdata-vide="[^"]*"/,'').replace(/data-vues="[^"]*"/,'data-vues="'+views.join(',')+'"');const hasMed=/data-medias="[^"]*[^"\]]/.test(attrs);return '<div class="gal"'+attrs+' data-vide="'+((views.length||hasMed)?0:1)+'">';});
 if(/class="gal"[^>]*data-vide="1"/.test(s)&&!s.includes('data-vide-txt')){s=s.replace(/<p class="gal-note">[\s\S]*?<\/p>/,'<p class="gal-note">Illustration provisoire : les visuels restent à intégrer à cette fiche.</p>').replace(/<span class="chip">Images officielles<\/span>/g,'');}
 s=s.replace(/<meta property="og:image" content="([^"]+)"\s*\/?>/g,(tag,src)=>available(file,src)?tag:'<meta property="og:image" content="https://www.leonidakit.com/img/social-card.png">');
 // Le calculateur est utilisable et indexable depuis la v7.16.
 if(!s.includes('http-equiv="refresh"')&&!s.includes('name="robots" content="noindex')){
  if(!s.includes('property="og:image"'))s=s.replace('</head>','<meta property="og:image" content="https://www.leonidakit.com/img/social-card.png">\n</head>');
  if(!s.includes('name="twitter:card"'))s=s.replace('</head>','<meta name="twitter:card" content="summary_large_image">\n</head>');
 }
 s=s.replace(/<footer[\s\S]*?<\/footer>/g,footer=>require('./site-shell.cjs').footer(footer,prefix));
 const title=s.match(/<title>([^<]*)<\/title>/)?.[1];const canonical=s.match(/<link rel="canonical" href="([^"]+)"/)?.[1];const description=s.match(/<meta name="description" content="([^"]*)"/)?.[1];
 if(title&&!s.includes('property="og:title"'))s=s.replace('</head>','<meta property="og:title" content="'+title+'">\n</head>');
 if(description&&!s.includes('property="og:description"'))s=s.replace('</head>','<meta property="og:description" content="'+description+'">\n</head>');
 if(canonical&&!s.includes('property="og:url"'))s=s.replace('</head>','<meta property="og:url" content="'+canonical+'">\n</head>');
 // Real text is available even when animations or JavaScript are disabled.
 s=s.replace(/(data-count="(\d+)"[^>]*>)0(<\/)/g,'$1$2$3');
 s=s.replace('<div class="sunset">','<div class="sunset" aria-hidden="true">').replace('<nav id="nav">','<nav id="nav" aria-label="Navigation principale">');
 s=s.replace(/(<progress)(?![^>]*aria-label)([^>]*>)/g,'$1 aria-label="Possessions enregistrées"$2');
 s=s.replace('id="map-panel"','id="map-panel" inert').replace('id="map-panel" inert inert','id="map-panel" inert');
 if(canonical&&!/name="robots" content="[^"]*noindex/.test(s)&&!s.includes('http-equiv="refresh"')&&file!=='404.html')canonicals.push(canonical);
 // Navigation principale : toutes les pages importantes, onglet actif selon la page
 {const ul=require('./site-shell.cjs').nav(file,prefix);s=s.replace(/(<nav id="nav" aria-label="Navigation principale">)[\s\S]*?<\/nav>/,'$1'+ul+'</nav>');}
 fs.writeFileSync(file,s);
}
const urls=[...new Set(canonicals)].sort();for(const f of ['sitemap.xml','sitemap-fiches.xml']){const list=f==='sitemap-fiches.xml'?urls.filter(u=>/\/(armes|vehicules|lieux|personnages|entreprises|demeures|planques)\//.test(u)):urls;fs.writeFileSync(f,'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+list.map(u=>'  <url><loc>'+esc(u)+'</loc></url>').join('\n')+'\n</urlset>\n');}
// Rebuild search terms from current names and aliases; exclude old retired pages.
// Une page devenue un simple renvoi (meta refresh) sort de l’index interne : sa cible y est déjà.
const redirectPage=u=>{const f=u.replace(/^\//,'').split('#')[0];return /\.html$/.test(f)&&!f.includes('/')&&fs.existsSync(f)&&/http-equiv="refresh"/.test(fs.readFileSync(f,'utf8'));};
let index=data.window.LK_INDEX.filter(e=>!/^\/(vehicules|armes)\//.test(e.u)&&!redirectPage(e.u));
for(const[type,list]of [['vehicules',V],['armes',A]])for(const v of list)index.push({l:name(v),k:type==='vehicules'?'Véhicule':'Arme',u:'/'+type+'/'+v.id+'.html',s:[v.id,v.search,name(v),v.fr,v.alias,v.insp,v.fam].filter(Boolean).join(' ').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()});
if(fs.existsSync('outils/lore-index.json'))index=index.concat(JSON.parse(fs.readFileSync('outils/lore-index.json','utf8')));
{ /* recherche des lieux : fichier séparé, chargé à la première saisie */
  const CATL={ville:'Villes',quartier:'Quartiers',comte:'Comtés',region:'Régions',transport:'Transports',nature:'Nature',notable:'Lieux notables',batiment:'Bâtiments',planque:'Planques'};
  const gnom=Object.fromEntries(mapData.groupes.map(g=>[g.id,g.n]));
  const lieux=[...mapData.groupes,...mapData.lieux].filter(p=>p.id&&p.n).map(p=>({l:p.n,k:CATL[p.c]||'Lieu',u:'/carte.html#lieu='+encodeURIComponent(p.id),s:(p.n+' '+(p.r||'')+' '+(gnom[p.p]||'')+' '+(CATL[p.c]||'')+' lieu carte').toLowerCase(),w:2}));
  fs.writeFileSync('search-lieux.js','/* Généré automatiquement : lieux de la carte pour la recherche globale. */\nwindow.LK_INDEX_LIEUX = '+JSON.stringify(lieux)+';\n');
}
index=[...new Map(index.map(e=>[e.u,e])).values()];fs.writeFileSync('search-index.js','/* Generated from current data. */\nwindow.LK_INDEX = '+JSON.stringify(index)+';\n');
const mapSource=fs.readFileSync('carte.js','utf8');const local=vm.runInNewContext('('+mapSource.match(/const POINTS = (\[[\s\S]*?\n  \]);/)[1]+')');
const allPoints=[...local,...data.window.LK_GTADB.groupes,...data.window.LK_GTADB.lieux];
const pointIds=allPoints.map(p=>p.id);
const cats=vm.runInNewContext('('+mapSource.match(/const CATS = (\{[\s\S]*?\n  \});/)[1]+')');
const mapCounts=[allPoints.length,allPoints.filter(p=>p.s==='officiel').length,7,Object.keys(cats).length];let mi=0;
fs.writeFileSync('carte.html',fs.readFileSync('carte.html','utf8').replace(/(<span class="n" data-count=")\d+(">)\d+(<\/span>)/g,(_,a,b,c)=>{const n=mapCounts[mi++];return a+n+b+n+c;}));
// v7.37 : la carte d'outil de l'accueil affiche le même nombre de lieux que la carte.
{const nb=String(allPoints.length).replace(/\B(?=(\d{3})+(?!\d))/g,'\u202f');fs.writeFileSync('index.html',fs.readFileSync('index.html','utf8').replace(/(<h3>Carte interactive <span class="chip live">)[^<]*lieux(<\/span>)/,'$1'+nb+' lieux$2'));}
// v7.38 : familles suivies génériques (équipements, munitions) lues dans armes.html (data-track), et noms pour les listes de la page Progression.
const tracked={equipements:[],munitions:[]},trackedNames={equipements:{},munitions:{}};
{const armesHtml=fs.readFileSync('armes.html','utf8');const re=/data-track="(equipements|munitions)" data-track-id="([a-z0-9-]+)"><b>([^<]*)<\/b>/g;let m;while((m=re.exec(armesHtml))){if(!tracked[m[1]].includes(m[2])){tracked[m[1]].push(m[2]);trackedNames[m[1]][m[2]]={n:m[3].replace(/&#39;|&#x27;/g,'’').replace(/&amp;/g,'&')};}}}
const CATV={berline:'Berlines',sport:'Voitures de sport',supercar:'Supercars',muscle:'Muscle cars',suv:'SUV et 4x4',pickup:'Pickups et tout-terrain',van:'Vans et cargos',moto:'Deux-roues et quads',helicoptere:'Hélicoptères',avion:'Avions',bateau:'Bateaux et jet-skis',service:'Service et urgence',divers:'Divers'};
const CATA={pistolet:'Pistolets',pompe:'Fusils à pompe',pm:'Pistolets-mitrailleurs',assaut:'Fusils d’assaut',precision:'Fusils de précision',mitrailleuse:'Mitrailleuses',melee:'Corps à corps',projectile:'Projectiles',speciale:'Armes spéciales'};
const progressNames={vehicules:Object.fromEntries(V.map(v=>[v.id,{n:name(v),c:CATV[v.cat]||v.cat||'',u:'vehicules/'+v.id+'.html'}])),armes:Object.fromEntries(A.map(a=>[a.id,{n:a.nom,c:CATA[a.cat]||a.cat||'',u:'armes/'+a.id+'.html'}])),equipements:trackedNames.equipements,munitions:trackedNames.munitions};
fs.writeFileSync('progression-data.js','/* IDs only; no need to load the full map on this page. */\nwindow.LK_PROGRESS_IDS = '+JSON.stringify({vehicules:V.map(v=>v.id),armes:A.map(v=>v.id),lieux:pointIds,equipements:tracked.equipements,munitions:tracked.munitions})+';\n/* v7.38 : noms, catégories et liens pour les listes dépliables de la page Progression. */\nwindow.LK_PROGRESS_NAMES = '+JSON.stringify(progressNames)+';\n');
console.log('Synchronisation : '+htmlFiles.length+' pages, '+assets.length+' assets, '+urls.length+' URL canoniques.');

// Collectibles : le générateur dédié régénère collectibles-data.js, les fiches et sitemap-collectibles.xml à partir d'outils/collectibles.json.
require('child_process').execFileSync(process.execPath,[path.join(__dirname,'gen-collectibles.cjs')],{stdio:'inherit'});

/* Pages et contenus d'acquisition : les sources remplacent les anciennes entrées. */
{const ctx={window:{}};vm.runInNewContext(readFile('search-index.js'),ctx);
 function readFile(file){return fs.readFileSync(path.join(root,file),'utf8');}
 const extra=[];
 for(const file of fs.readdirSync(root).filter(f=>f.endsWith('.html')&&!f.startsWith('google')&&f!=='404.html')){
  const html=readFile(file);if(/http-equiv="refresh"/.test(html))continue; // Le noindex des moteurs externes n’exclut pas la recherche interne.
  const label=({'a-propos.html':'À propos','contact.html':'Contact','mentions-legales.html':'Mentions et confidentialité','calculateurs.html':'Calculateur : huit calculs et un business plan','tuto.html':'Tuto du calculateur','index.html':'Accueil — Leonidakit'})[file]||html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1]?.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
  if(!label)continue;const desc=html.match(/<meta name="description" content="([^"]*)"/)?.[1]||'';
  const synonyms=({'tuto.html':'tutoriel aide apprendre','achats.html':'achats acheter acquisitions','a-propos.html':'a propos equipe projet fonctionnement sources','contact.html':'contact erreur correction signalement retrait','style.html':'vetements habits looks coiffures style','personnalisations.html':'customisation ameliorations peinture tuning','medias.html':'credits photos images sources droits'})[file]||'';
  extra.push({l:label,k:file.includes('calcul')||file==='tuto.html'?'Outil':'Page',u:'/'+file,s:label+' '+desc+' '+synonyms,w:-1});
 }
 const acqContext={window:{}};vm.runInNewContext(readFile('acquisitions-data.js'),acqContext);
 for(const item of acqContext.window.LK_ACQUISITIONS.items){
  if(item.ref)continue; // L'entité canonique véhicule/arme est déjà indexée.
  extra.push({l:item.name,k:acqContext.window.LK_ACQUISITIONS.categories.find(c=>c.id===item.category)?.label||'Acquisition',u:item.hubUrl,s:item.name+' '+item.description+' '+item.condition,w:0});
 }
 for(const c of acqContext.window.LK_ACQUISITIONS.categories.filter(c=>!c.alias&&Array.isArray(c.sections)))for(const x of c.sections)extra.push({l:x.title,k:c.label,u:c.route+'#'+x.id,s:(x.title+' '+x.text+' '+c.label).toLowerCase(),w:0});
 for(const e of [{l:'Munitions et équipement',k:'Armurerie',u:'/armes.html#munitions',s:'munitions balles cartouches chargeurs equipement armurerie'},{l:'Constructeur d’équipement',k:'Armurerie',u:'/armes.html#equipement',s:'arsenal equipement loadout constructeur armes longues armurerie'},{l:'Gadgets et équipements',k:'Armurerie',u:'/armes.html#equipements',s:'gadgets sac gilet pare-balles kit de soin equipement armurerie'},{l:'Garages documentés',k:'Planques',u:'/planques.html#garages',s:'garages garage paradise shore court planques'}])extra.push({...e,w:0});
 const index=[...new Map([...ctx.window.LK_INDEX,...extra].filter(e=>!redirectPage(e.u)).map(e=>[e.u,e])).values()];
 fs.writeFileSync(path.join(root,'search-index.js'),'/* Généré depuis les pages, catalogues et acquisitions. */\nwindow.LK_INDEX = '+JSON.stringify(index)+';\n');
}

// v7.37 : données structurées FAQPage générées depuis les questions visibles (div.faq > details), pages indexables seulement.
// Le bloc est reconstruit à chaque régénération : il ne peut pas diverger du texte de la page.
{const strip=h=>h.replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/&#x27;|&#39;/g,'’').replace(/&quot;/g,'"').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
 for(const file of htmlFiles){if(file.startsWith('google')||file==='404.html')continue;let html=fs.readFileSync(file,'utf8');
  if(/name="robots" content="[^"]*noindex/.test(html)||html.includes('http-equiv="refresh"'))continue;
  html=html.replace(/<script type="application\/ld\+json" data-lk="faq">[\s\S]*?<\/script>\n?/,'');
  const faq=html.match(/<div class="faq(?: [^"]*)?"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/section>/);
  const qa=[];if(faq&&!/"@type":\s*"FAQPage"/.test(html.replace(/data-lk="faq"[\s\S]*?<\/script>/,'')))for(const m of faq[1].matchAll(/<details[^>]*>\s*<summary>([\s\S]*?)<\/summary>\s*<div class="ans">([\s\S]*?)<\/div>\s*<\/details>/g)){const q=strip(m[1]),a=strip(m[2]);if(q&&a)qa.push({'@type':'Question',name:q,acceptedAnswer:{'@type':'Answer',text:a}});}
  if(qa.length>=2){const ld='<script type="application/ld+json" data-lk="faq">'+JSON.stringify({'@context':'https://schema.org','@type':'FAQPage',mainEntity:qa})+'</script>\n';html=html.replace('</head>',ld+'</head>');}
  fs.writeFileSync(file,html);}}

// v7.37 : typographie française sur toutes les pages (apostrophes, espaces insécables, groupes de chiffres).
// Appliquée en dernier, sur les nœuds texte et les attributs lisibles seulement : une source corrigée le reste après régénération.
{const typo=require('./typographie.cjs');for(const file of htmlFiles){if(file.startsWith('google'))continue;const html=fs.readFileSync(file,'utf8');const next=typo.html(html);if(next!==html)fs.writeFileSync(file,next);}}

// Empreintes finales : ne dépendent pas de l’état antérieur des autres fichiers.
// v7.38 : chaque image d'une pile (.lk-stack) est un lien vers ce qu'elle représente (outils/lot-c-visuals.cjs).
{const visuals=require('./lot-c-visuals.cjs');for(const file of htmlFiles){const html=fs.readFileSync(file,'utf8');if(!html.includes('class="lk-stack'))continue;const prefix=file.includes('/')?'../':'';const next=visuals.linkify(html,prefix);if(next!==html)fs.writeFileSync(file,next);}}
{const hashes=new Map();for(const file of htmlFiles){let html=fs.readFileSync(file,'utf8');html=html.replace(/((?:href|src)=")([^"?#]+\.(?:css|js))(?:\?v=[a-f0-9]+)?("[^>]*>)/g,(match,start,url,end)=>{if(/^(?:https?:)?\/\//.test(url))return match;const target=url.startsWith('/')?path.join(root,url.slice(1)):path.resolve(root,path.dirname(file),url);if(!fs.existsSync(target))return match;if(!hashes.has(target))hashes.set(target,crypto.createHash('sha256').update(fs.readFileSync(target)).digest('hex').slice(0,12));return start+url+'?v='+hashes.get(target)+end;});fs.writeFileSync(file,html);}}
