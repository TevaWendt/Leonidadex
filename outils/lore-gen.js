/* Génère lieux.html, personnages.html, entreprises.html et les fiches lieux/, personnages/, entreprises/
   à partir de outils/editorial.json et outils/medias-officiels.json, avec l'en-tête, le pied de page
   et les scripts déjà utilisés par le site (copiés depuis a-propos.html et une fiche véhicule).
   Usage : node outils/lore-gen.js   (depuis la racine du dépôt, après gen.js) */
const fs=require('fs'),path=require('path');
process.chdir(path.join(__dirname,'..'));
const esc=t=>String(t==null?'':t).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const ED=JSON.parse(fs.readFileSync('outils/editorial.json','utf8'));
const MED=JSON.parse(fs.readFileSync('outils/medias-officiels.json','utf8'));
const CREDIT='Capture officielle © Rockstar Games / Take-Two Interactive';
global.window={};eval(fs.readFileSync('vehicules-data.js','utf8'));const VNOM=Object.fromEntries(window.LK_VEHICULES.map(v=>[v.id,(v.marque?v.marque+' ':'')+v.nom]));const VMED=Object.fromEntries(window.LK_VEHICULES.filter(v=>v.medias).map(v=>[v.id,v.medias]));
const AMED=JSON.parse(fs.readFileSync('outils/armes-medias.json','utf8'));

/* ---------- gabarit : on reprend le vrai HTML du site ---------- */
const rootRef=fs.readFileSync('a-propos.html','utf8');
const subRef=fs.readFileSync('vehicules/karin-sultan.html','utf8');
const pick=(s,re)=>{const m=s.match(re);if(!m)throw new Error('gabarit introuvable : '+re);return m[0];};
const chrome=(s)=>({
  fav:pick(s,/<link rel="icon"[^>]*>/),
  fonts:pick(s,/<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com">[\s\S]*?rel="stylesheet">/),
  header:pick(s,/<header>[\s\S]*?<\/header>/),
  footer:pick(s,/<footer>[\s\S]*?<\/footer>/),
  scripts:(s.match(/<script src="[^"]*"><\/script>/g)||[]).filter(x=>!/fiches\.js|vehicules-data\.js|armes-data\.js/.test(x)).join('\n'),
});
const ROOT=chrome(rootRef), SUB=chrome(subRef);
const withHere=(header,hub)=>header.replace(/ class="here"/g,'').replace(new RegExp('(<a href="(?:\\.\\./)?'+hub+'\\.html")>'),'$1 class="here">');

const SITE='https://www.leonidakit.com';
const SECTIONS={
  regions:{hub:'lieux',label:'Lieux',one:'Région',title:'Les régions de Leonida',
    lede:'Six régions présentées par Rockstar, chacune reliée à ses lieux sur la carte et aux personnages qui y évoluent.',
    desc:'Les six régions officielles de GTA VI : Vice City, Leonida Keys, Grassrivers, Port Gellhorn, Ambrosia et Mount Kalaga, avec visuels officiels et liens vers la carte.'},
  characters:{hub:'personnages',label:'Personnages',one:'Personnage',title:'Les personnages de GTA VI',
    lede:'Les huit personnages présentés par Rockstar, avec leur région, leurs liens entre eux et ce qu’ils cherchent.',
    desc:'Jason, Lucia, Cal, Boobie, Dre\u2019Quan, Real Dimez, Raul et Brian : les personnages officiels de GTA VI, avec visuels Rockstar et liens vers les lieux de Leonida.'},
  businesses:{hub:'entreprises',label:'Entreprises',one:'Entreprise',title:'Les entreprises de Leonida',
    lede:'Commerces et ateliers montrés dans les médias officiels, situés sur la carte quand leur emplacement est connu.',
    desc:'Les entreprises de GTA VI présentées par Rockstar : ateliers, salons, boutiques et studios, avec visuels officiels et position sur la carte de Leonida.'},
  residences:{hub:'demeures',label:'Demeures',one:'Demeure',title:'Les demeures de Leonida',
    lede:'Où vivent les personnages, d’après ce que Rockstar a montré ou raconté : maisons des Keys, chantier naval, pénitencier.',
    desc:'Les habitations des personnages de GTA VI décrites par Rockstar : la maison de Jason dans les Keys, chez Cal Hampton, chez Brian et Lori, le parcours de Lucia.'},
  hideouts:{hub:'planques',label:'Planques',one:'Planque',title:'Les planques de Leonida',
    lede:'Les repaires vus dans les trailers et la galerie officielle. La liste s’allongera avec le jeu et votre suivi de progression.',
    desc:'Les planques de GTA VI repérées dans les médias officiels : la planque de Jason dans les Keys, le chantier naval de Brian, le motel du premier trailer.'},
};
const byId={};for(const k of Object.keys(SECTIONS))for(const x of ED[k])byId[x.id]=Object.assign({sec:k},x);

const media=x=>(x.media||[]).map(id=>MED[id]).filter(Boolean)[0]||null;
const GT=JSON.parse(fs.readFileSync('outils/data/carte-gtadb-source.json','utf8'));const GTBY={};for(const q of [...GT.groupes,...GT.lieux])GTBY[q.id]=q;
/* visuel de secours : la capture de la carte (gtadb, créditée dans les mentions légales) */
const mapPhoto=id=>{const q=GTBY[id];if(!q||!q.img||!/\.webp$/.test(q.img)||!fs.existsSync(q.img))return null;return {variants:[{src:'/'+q.img,w:960,h:540}],titre:q.n.replace(/&#x27;/g,"'").replace(/&amp;/g,'&')};};
const visual=x=>media(x)||(x.mapId?mapPhoto(x.mapId):null);
const RELATED=[['regions','Régions'],['characters','Personnages'],['residences','Demeures'],['hideouts','Planques'],['businesses','Entreprises']];
const gtName=id=>{const q=GTBY[id];return q?q.n.replace(/&#x27;/g,"'").replace(/&amp;/g,'&').replace(/ \(nom réel\)$/,''):id;};
const LOCAL={'vice-city':'Vice City','leonida-keys':'Leonida Keys','grassrivers':'Grassrivers','port-gellhorn':'Port Gellhorn','ambrosia':'Ambrosia','mount-kalaga':'Mount Kalaga','ocean-beach':'Ocean Beach','little-cuba':'Little Cuba','tisha-wocka':'Tisha-Wocka','vc-port':'VC Port','key-lento':'Key Lento','allied-crystal':'Allied Crystal','leonida-penitentiary':'Pénitencier de Leonida','ptt-youngin':'PTT Youngin$'};
const placeName=id=>LOCAL[id]||gtName(id);
const IMG_ALT=(m,x)=>x.name+', capture officielle Rockstar Games';
const imgTag=(m,alt,big)=>{if(!m)return '';const a=m.variants[0],b=m.variants[1]||a;
  return '<img src="'+a.src+'" srcset="'+a.src+' '+a.w+'w, '+b.src+' '+b.w+'w" sizes="'+(big?'(max-width:820px) 100vw, 560px':'(max-width:600px) 100vw, 300px')+'" width="'+(big?b.w:a.w)+'" height="'+(big?b.h:a.h)+'" alt="'+esc(alt)+'" loading="'+(big?'eager':'lazy')+'" decoding="async">';};
const mapHref=(id,p)=>p+'carte.html#lieu='+encodeURIComponent(id);
const bc=items=>'<script type="application/ld+json">'+JSON.stringify({"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":items.map((it,i)=>({"@type":"ListItem","position":i+1,"name":it[0],"item":SITE+it[1]}))})+'</script>';

function page({p,title,desc,canonical,ogImg,body,crumbs,hub}){
  const C=p?SUB:ROOT;const header=hub?withHere(C.header,hub):C.header.replace(/ class="here"/g,'');
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:type" content="website">
<meta property="og:locale" content="fr_FR">
<meta name="theme-color" content="#FDFBF7">
<meta name="color-scheme" content="light">
<link rel="canonical" href="${SITE}${canonical}">
${C.fav}
${C.fonts}
${bc(crumbs)}
<link rel="stylesheet" href="${p}style.css">
<meta property="og:image" content="${SITE}${ogImg||'/img/social-card.png'}">
<meta name="twitter:card" content="summary_large_image">
<meta property="og:url" content="${SITE}${canonical}">
</head>
<body>

<a class="skip" href="#main">Aller au contenu</a>
<div class="sunset" aria-hidden="true"></div>

${header}

<main id="main" class="lore-page">
${body}
</main>

${C.footer}

${C.scripts}
</body>
</html>
`;}

/* ---------- hubs ---------- */
const index=[];
const cardOf=(x,S,pfx,extraCls)=>{const m=visual(x);
  return `<a class="lore-card rise${extraCls||''}" href="${pfx}${S.hub}/${x.id}.html">${m?imgTag(m,IMG_ALT(m,x),false):'<div class="lore-vide">Visuel officiel à venir</div>'}<div class="veh-body"><span class="veh-marque">${esc(S.one)}</span><h3>${esc(x.name)}</h3><p>${esc(x.tagline||x.description)}</p><span class="veh-go">Voir la fiche</span></div></a>`;};
for(const [key,S] of Object.entries(SECTIONS)){
  const items=ED[key];
  const cards=items.map(x=>cardOf(x,S,'')).join('\n');
  const body=`<section class="page-head shell">
  <p class="fiche-cat">${esc(S.label)} · GTA VI</p>
  <h1>${esc(S.title)}</h1>
  <p class="lede">${esc(S.lede)}</p>
</section>
<section class="shell">
  <div class="lore-grid lore-grid--center">
${cards}
  </div>
</section>`;
  fs.writeFileSync(S.hub+'.html',page({p:'',title:S.title+' — Leonidakit',desc:S.desc,canonical:'/'+S.hub+'.html',ogImg:visual(items[0])?(visual(items[0]).variants[1]||visual(items[0]).variants[0]).src:null,body,crumbs:[['Accueil','/'],[S.label,'/'+S.hub+'.html']],hub:S.hub}));
  index.push({l:S.title,k:S.label,u:'/'+S.hub+'.html',s:(S.title+' '+S.label+' leonida gta vi').toLowerCase(),w:1});

  /* ---------- fiches ---------- */
  fs.mkdirSync(S.hub,{recursive:true});
  for(const x of items){
    const m=visual(x), p='../';
    /* entités liées : cartes avec visuel, groupées par type */
    const relIds=new Set();
    for(const k of ['characters','places','residences','hideouts','businesses'])for(const id of (x[k]||[]))if(byId[id])relIds.add(id);
    /* liens implicites : tout ce qui pointe vers cette fiche */
    for(const [k2,S2] of Object.entries(SECTIONS))for(const y of ED[k2])if(y.id!==x.id)for(const kk of ['characters','places','residences','hideouts','businesses'])if((y[kk]||[]).includes(x.id))relIds.add(y.id);
    const relBlocks=RELATED.map(([sec,lbl])=>{const l=[...relIds].map(id=>byId[id]).filter(y=>y&&y.sec===sec);if(!l.length)return '';
      return `<div class="lore-rel-group"><h3>${lbl}</h3><div class="lore-mini">${l.map(y=>{const mm=visual(y);return '<a class="lore-minicard" href="../'+SECTIONS[y.sec].hub+'/'+y.id+'.html">'+(mm?'<img src="'+mm.variants[0].src+'" width="'+mm.variants[0].w+'" height="'+mm.variants[0].h+'" alt="" loading="lazy" decoding="async">':'<i class="lore-minivide"></i>')+'<span><b>'+esc(y.name)+'</b><i>'+esc(SECTIONS[y.sec].one)+'</i></span></a>';}).join('')}</div></div>`;}).join('');
    const vehBlock=(x.vehicles&&x.vehicles.length)?`<div class="lore-rel-group"><h3>Véhicules</h3><ul class="lore-chips">${x.vehicles.map(id=>'<li><a href="../vehicules/'+id+'.html">'+esc(VNOM[id]||id)+'</a></li>').join('')}</ul></div>`:'';
    /* sur la carte : lieu principal + lieux gtadb/local cités, avec la capture de carte quand elle existe */
    const mapIds=[...new Set([].concat(x.mapId?[x.mapId]:[],x.mapPlaces||[],x.relatedPlaces||[]))];
    const mapBlock=mapIds.length?`<div class="lore-rel-group lore-rel-group--map"><h3>Sur la carte</h3><div class="lore-map">${mapIds.map(id=>{const ph=mapPhoto(id);return '<a class="lore-mapcard" href="'+mapHref(id,p)+'">'+(ph?'<img src="'+ph.variants[0].src+'" width="320" height="180" alt="" loading="lazy" decoding="async">':'<i class="lore-mapvide"></i>')+'<span>'+esc(placeName(id))+'</span></a>';}).join('')}</div></div>`:'';
    const facts=(x.facts&&x.facts.length)?`<div class="lore-facts"><h2>À retenir</h2><ul>${x.facts.map(f=>'<li class="rise">'+esc(f)+'</li>').join('')}</ul></div>`:'';
    const links=[];
    if(x.mapId)links.push(`<a href="${mapHref(x.mapId,p)}">Voir sur la carte</a>`);
    if(key==='regions')links.push(`<a href="${p}vehicules.html">Véhicules</a>`);
    if(x.source)links.push(`<a href="${esc(x.source)}" target="_blank" rel="noopener nofollow">Page officielle</a>`);
    const body=`<section class="page-head shell">
  <nav class="crumbs" aria-label="Fil d'Ariane"><a href="../index.html">Accueil</a> / <a href="../${S.hub}.html">${esc(S.label)}</a> / <span>${esc(x.name)}</span></nav>
  <div class="lore-hero lore-enter">
    <div class="lore-copy">
      <p class="fiche-cat">${esc(S.one)} · GTA VI</p>
      <h1>${esc(x.name)}</h1>
      ${x.tagline?`<p class="lore-tag">${esc(x.tagline)}</p>`:''}
      <p class="lede">${esc(x.description)}</p>
      <div class="lore-links">${links.join('')}</div>
    </div>
    ${m?`<figure class="lore-fig">${imgTag(m,IMG_ALT(m,x),true)}</figure>`:'<figure class="lore-fig"><div class="lore-vide" style="aspect-ratio:16/9;display:flex;align-items:center;justify-content:center;color:#FDFBF7">Visuel officiel à venir</div></figure>'}
  </div>
</section>
<section class="shell lore-body">
  ${facts}
  ${(relBlocks||vehBlock||mapBlock)?`<div class="lore-related"><h2>En lien</h2>${relBlocks}${vehBlock}${mapBlock}</div>`:''}
</section>`;
    fs.writeFileSync(S.hub+'/'+x.id+'.html',page({p,title:x.name+' — GTA VI | Leonidakit',desc:x.description,canonical:'/'+S.hub+'/'+x.id+'.html',ogImg:m?(m.variants[1]||m.variants[0]).src:null,body,crumbs:[['Accueil','/'],[S.label,'/'+S.hub+'.html'],[x.name,'/'+S.hub+'/'+x.id+'.html']],hub:S.hub}));
    index.push({l:x.name,k:S.one,u:'/'+S.hub+'/'+x.id+'.html',s:(x.name+' '+S.one+' '+x.description+' '+(x.tagline||'')).toLowerCase(),w:1});
  }
  console.log(S.hub+' : '+items.length+' fiches');
}
fs.writeFileSync('outils/lore-index.json',JSON.stringify(index));

/* ---------- medias.html : crédits des visuels officiels ---------- */
{
  const usage={};
  const add=(id,lbl,href)=>{(usage[id]=usage[id]||[]).push('<a href="'+href+'">'+esc(lbl)+'</a>');};
  for(const [vid,ids] of Object.entries(VMED))for(const id of ids)add(id,VNOM[vid]||vid,'vehicules/'+vid+'.html');
  for(const [aid,ids] of Object.entries(AMED))for(const id of ids)add(id,aid.replace(/-/g,' '),'armes/'+aid+'.html');
  for(const [k,S] of Object.entries(SECTIONS))for(const x of ED[k])for(const id of (x.media||[]))add(id,x.name,S.hub+'/'+x.id+'.html');
  const rows=Object.values(MED).map(m=>{const a=m.variants[0];return `<li class="media-row"><img src="${a.src}" width="${a.w}" height="${a.h}" alt="${esc(m.titre)}" loading="lazy" decoding="async"><div><b>${esc(m.titre)}</b><br><span>${esc(m.credit)}</span>${usage[m.id]?'<br><span>Utilisé sur : '+usage[m.id].join(', ')+'</span>':''}<br><a href="${esc(m.source)}" target="_blank" rel="noopener nofollow">Galerie officielle</a></div></li>`;}).join('\n');
  const body=`<section class="page-head shell">
  <p class="fiche-cat">Crédits · Visuels officiels</p>
  <h1>Les visuels officiels utilisés</h1>
  <p class="lede">${Object.keys(MED).length} captures publiées par Rockstar Games dans la galerie de rockstargames.com/VI, reproduites ici en tant que site de fans, sans modification autre que le redimensionnement. Elles restent la propriété de Rockstar Games et Take-Two Interactive.</p>
</section>
<section class="shell">
  <ul class="media-list">
${rows}
  </ul>
  <p class="lore-src">Les photos de la carte proviennent de gtadb.org et de ses contributeurs (CC BY 4.0), voir les <a href="mentions-legales.html">mentions légales</a>.</p>
</section>`;
  fs.writeFileSync('medias.html',page({p:'',title:'Visuels officiels et crédits — Leonidakit',desc:'Liste des '+Object.keys(MED).length+' visuels officiels Rockstar Games utilisés sur Leonidakit, avec leur source et les fiches où ils apparaissent.',canonical:'/medias.html',ogImg:null,body,crumbs:[['Accueil','/'],['Visuels officiels','/medias.html']]}));
  console.log('medias.html : '+Object.keys(MED).length+' visuels');
}

/* ---------- accueil ---------- */
let home=fs.readFileSync('index.html','utf8');
const homeCard=(x,S,sub)=>{const m=visual(x);return `    <a class="lore-card rise" href="${S.hub}/${x.id}.html">${imgTag(m,IMG_ALT(m,x),false)}<div class="veh-body"><span class="veh-marque">${esc(sub||S.one)}</span><h3>${esc(x.name)}</h3><p>${esc(x.tagline||x.description)}</p><span class="veh-go">Voir la fiche</span></div></a>`;};

/* 1. "L'État de Leonida" : les six régions officielles remplacent les vignettes de comtés (les comtés restent sur la carte) */
const etat=`<section class="counties-sec shell" id="etat">
  <div class="sec-head reveal">
    <h2>L'État de Leonida</h2>
    <p>Six régions présentées par Rockstar. Les six comtés et leur niveau de certitude sont sur <a href="carte.html">la carte</a>.</p>
  </div>
  <div class="lore-grid lore-grid--center">
${ED.regions.map(x=>homeCard(x,SECTIONS.regions)).join('\n')}
  </div>
</section>`;
if(!/<section class="counties-sec shell"[^>]*>[\s\S]*?<\/section>/.test(home))throw new Error("section 'L'État de Leonida' introuvable");
home=home.replace(/<section class="counties-sec shell"[^>]*>[\s\S]*?<\/section>/,etat);

/* 2. "Le monde de Leonida" : personnages, demeures, planques, entreprises (les lieux sont déjà au-dessus) */
const hubCard=k=>{const S=SECTIONS[k],x=ED[k][0],m=visual(x);return `    <a class="lore-card rise" href="${S.hub}.html">${imgTag(m,S.title+', capture officielle Rockstar Games',false)}<div class="veh-body"><span class="veh-marque">${ED[k].length} fiches</span><h3>${esc(S.label)}</h3><p>${esc(S.lede)}</p><span class="veh-go">Explorer</span></div></a>`;};
const block=`<section class="lore-sec shell" id="monde">
  <div class="sec-head rise"><h2>Le monde de Leonida</h2><p>Personnages, demeures, planques et entreprises présentés par Rockstar, avec leurs visuels officiels.</p></div>
  <div class="lore-grid lore-grid--center lore-grid--four">
${['characters','residences','hideouts','businesses'].map(hubCard).join('\n')}
  </div>
</section>
`;
home=home.replace(/<section class="lore-sec shell" id="monde">[\s\S]*?<\/section>\n/,'');
home=home.replace(/(<section class="tools-sec shell" id="outils">)/,block+'$1');
if(!home.includes('id="monde"'))throw new Error("section 'Le monde de Leonida' non insérée");

/* 3. Les outils : les calculateurs passent en tête, en pleine largeur */
const tools=`<section class="tools-sec shell" id="outils">
  <div class="sec-head reveal">
    <h2>Les outils</h2>
    <p>Quatre choses, faites correctement.</p>
  </div>
  <a class="calc-feature reveal" href="calculateurs.html" id="calc-feature">
    <div class="calc-copy">
      <span class="chip">Le 19 novembre, dès l'ouverture des serveurs</span>
      <h3>Calculateurs</h3>
      <p>Trois questions que tout le monde se posera dès le premier soir, et auxquelles on répondra avec les vraies formules du jeu, pas avec des estimations.</p>
      <ul class="calc-q">
        <li>Combien rapporte vraiment un coup, une fois l'équipe et les frais payés ?</li>
        <li>Combien de temps pour se payer le véhicule qu'on vise ?</li>
        <li>Quelle activité rapporte le plus à l'heure de jeu ?</li>
      </ul>
      <span class="veh-go">Découvrir les calculateurs</span>
    </div>
    <div class="calc-art" aria-hidden="true">
      <div class="calc-screen"><span class="calc-line calc-line--1"></span><span class="calc-line calc-line--2"></span><span class="calc-line calc-line--3"></span><b class="calc-sum">= ?</b></div>
    </div>
  </a>
  <div class="tools tools--three">
    <a class="tool reveal" href="carte.html">
      <h3>Carte interactive <span class="chip live">En construction</span></h3>
      <p>Filtres, suivi de ce que tu as trouvé, et calcul de distance entre deux points avec le temps de trajet.</p>
    </a>
    <a class="tool reveal" href="vehicules.html">
      <h3>Fiches véhicules et armes <span class="chip live">324 fiches</span></h3>
      <p>301 véhicules, 23 armes, et un constructeur d'équipement fondé sur les règles officielles.</p>
    </a>
    <a class="tool reveal" href="progression.html">
      <h3>Suivi de progression <span class="chip live">En construction</span></h3>
      <p>Missions terminées, collectibles ramassés, succès obtenus. Sauvegardé sur ton appareil.</p>
    </a>
  </div>
</section>`;
if(!/<section class="tools-sec shell" id="outils">[\s\S]*?<\/section>/.test(home))throw new Error("section 'Les outils' introuvable");
home=home.replace(/<section class="tools-sec shell" id="outils">[\s\S]*?<\/section>/,tools);
fs.writeFileSync('index.html',home);
console.log('accueil : État de Leonida (6 régions), Le monde de Leonida (4 hubs), calculateurs mis en avant');
require('./sync-site.cjs');
