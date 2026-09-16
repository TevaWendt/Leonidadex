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

const SITE='https://www.leonidakit.com';
const SECTIONS={
  regions:{hub:'lieux',label:'Lieux',one:'Région',title:'Les régions de Leonida',
    lede:'Six régions présentées par Rockstar, chacune reliée à ses lieux sur la carte et aux personnages qui y évoluent.',
    desc:'Les six régions officielles de GTA VI : Vice City, Leonida Keys, Grassrivers, Port Gellhorn, Ambrosia et Mount Kalaga, avec visuels officiels et liens vers la carte.'},
  characters:{hub:'personnages',label:'Personnages',one:'Personnage',title:'Les personnages de GTA VI',
    lede:'Les huit personnages présentés par Rockstar, avec leur région et leurs liens entre eux.',
    desc:'Jason, Lucia, Cal, Boobie, Dre\u2019Quan, Real Dimez, Raul et Brian : les personnages officiels de GTA VI, avec visuels Rockstar et liens vers les lieux de Leonida.'},
  businesses:{hub:'entreprises',label:'Entreprises',one:'Entreprise',title:'Les entreprises de Leonida',
    lede:'Commerces et ateliers montrés dans les médias officiels, situés sur la carte quand leur emplacement est connu.',
    desc:'Les entreprises de GTA VI présentées par Rockstar : ateliers, salons, boutiques et studios, avec visuels officiels et position sur la carte de Leonida.'},
};
const byId={};for(const k of Object.keys(SECTIONS))for(const x of ED[k])byId[x.id]=Object.assign({sec:k},x);

const media=x=>(x.media||[]).map(id=>MED[id]).filter(Boolean)[0]||null;
const imgTag=(m,alt,big)=>{if(!m)return '';const a=m.variants[0],b=m.variants[1]||a;
  return '<img src="'+a.src+'" srcset="'+a.src+' '+a.w+'w, '+b.src+' '+b.w+'w" sizes="'+(big?'(max-width:820px) 100vw, 560px':'(max-width:600px) 100vw, 300px')+'" width="'+(big?b.w:a.w)+'" height="'+(big?b.h:a.h)+'" alt="'+esc(alt)+'" loading="'+(big?'eager':'lazy')+'" decoding="async">';};
const mapHref=(id,p)=>p+'carte.html#lieu='+encodeURIComponent(id);
const bc=items=>'<script type="application/ld+json">'+JSON.stringify({"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":items.map((it,i)=>({"@type":"ListItem","position":i+1,"name":it[0],"item":SITE+it[1]}))})+'</script>';

function page({p,title,desc,canonical,ogImg,body,crumbs}){
  const C=p?SUB:ROOT;
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

${C.header}

<main id="main">
${body}
</main>

${C.footer}

${C.scripts}
</body>
</html>
`;}

/* ---------- hubs ---------- */
const index=[];
for(const [key,S] of Object.entries(SECTIONS)){
  const items=ED[key];
  const cards=items.map(x=>{const m=media(x);
    return `<a class="lore-card rise" href="${S.hub}/${x.id}.html">${m?imgTag(m,x.name+', '+CREDIT.toLowerCase(),false):'<div class="lore-vide">Visuel officiel à venir</div>'}<div class="veh-body"><span class="veh-marque">${esc(S.one)}</span><h3>${esc(x.name)}</h3><p>${esc(x.description)}</p><span class="veh-go">Voir la fiche</span></div></a>`;}).join('\n');
  const body=`<section class="page-head shell">
  <p class="fiche-cat">${esc(S.label)} · GTA VI</p>
  <h1>${esc(S.title)}</h1>
  <p class="lede">${esc(S.lede)} Visuels : ${esc(CREDIT)}.</p>
</section>
<section class="shell">
  <div class="lore-grid">
${cards}
  </div>
  <p class="lore-src">Textes rédigés d'après les présentations officielles de Rockstar Games (rockstargames.com/VI). Les positions sur la carte sont communautaires et peuvent changer avec la sortie du jeu.</p>
</section>`;
  fs.writeFileSync(S.hub+'.html',page({p:'',title:S.title+' — Leonidakit',desc:S.desc,canonical:'/'+S.hub+'.html',ogImg:media(items[0])?(media(items[0]).variants[1]||media(items[0]).variants[0]).src:null,body,crumbs:[['Accueil','/'],[S.label,'/'+S.hub+'.html']]}));
  index.push({l:S.title,k:S.label,u:'/'+S.hub+'.html',s:(S.title+' '+S.label+' leonida gta vi').toLowerCase()});

  /* ---------- fiches ---------- */
  fs.mkdirSync(S.hub,{recursive:true});
  for(const x of items){
    const m=media(x), p='../';
    const rel=[];
    const list=(ids,lbl)=>{const l=(ids||[]).map(id=>byId[id]).filter(Boolean);if(!l.length)return '';
      return `<div class="lore-rel"><h2>${lbl}</h2><ul>${l.map(y=>'<li><a href="../'+SECTIONS[y.sec].hub+'/'+y.id+'.html">'+esc(y.name)+'</a></li>').join('')}</ul></div>`;};
    if(key==='regions'){
      rel.push(list(x.characters,'Personnages liés à cette région'));
      if(x.relatedPlaces&&x.relatedPlaces.length)rel.push(`<div class="lore-rel"><h2>Lieux cités par Rockstar</h2><ul>${x.relatedPlaces.map(id=>'<li><a href="'+mapHref(id,p)+'">'+esc(id.replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase()))+'</a></li>').join('')}</ul></div>`);
    }
    if(key==='characters'){rel.push(list(x.places,'Région'));rel.push(list(x.characters,'Personnages liés'));if(x.vehicles)rel.push(`<div class="lore-rel"><h2>Véhicules associés</h2><ul>${x.vehicles.map(id=>'<li><a href="../vehicules/'+id+'.html">'+esc(id)+'</a></li>').join('')}</ul></div>`);}
    if(key==='businesses'){rel.push(list(x.places,'Région'));}
    const links=[];
    if(x.mapId)links.push(`<a href="${mapHref(x.mapId,p)}">Voir sur la carte</a>`);
    if(key==='regions')links.push(`<a href="${p}vehicules.html">Véhicules</a>`);
    if(x.source)links.push(`<a href="${esc(x.source)}" target="_blank" rel="noopener nofollow">Présentation officielle Rockstar</a>`);
    const body=`<section class="page-head shell">
  <nav class="crumbs" aria-label="Fil d'Ariane"><a href="../index.html">Accueil</a> / <a href="../${S.hub}.html">${esc(S.label)}</a> / <span>${esc(x.name)}</span></nav>
  <div class="lore-hero">
    <div>
      <p class="fiche-cat">${esc(S.one)} · GTA VI</p>
      <h1>${esc(x.name)}</h1>
      <p class="lede">${esc(x.description)}</p>
      <div class="lore-links">${links.join('')}</div>
      ${rel.join('\n      ')}
    </div>
    ${m?`<figure>${imgTag(m,x.name+', '+CREDIT.toLowerCase(),true)}<figcaption>${esc(m.titre)} · ${esc(CREDIT)}</figcaption></figure>`:'<figure><div class="lore-vide" style="aspect-ratio:16/9;display:flex;align-items:center;justify-content:center;color:#FDFBF7">Visuel officiel à venir</div></figure>'}
  </div>
  <p class="lore-src">Source : <a href="${esc(x.source||'https://www.rockstargames.com/VI')}" target="_blank" rel="noopener nofollow">rockstargames.com</a>. Les coordonnées de la carte sont communautaires (gtadb.org, CC BY 4.0) et ne sont pas confirmées par Rockstar.</p>
</section>`;
    fs.writeFileSync(S.hub+'/'+x.id+'.html',page({p,title:x.name+' — GTA VI | Leonidakit',desc:x.description,canonical:'/'+S.hub+'/'+x.id+'.html',ogImg:m?(m.variants[1]||m.variants[0]).src:null,body,crumbs:[['Accueil','/'],[S.label,'/'+S.hub+'.html'],[x.name,'/'+S.hub+'/'+x.id+'.html']]}));
    index.push({l:x.name,k:S.one,u:'/'+S.hub+'/'+x.id+'.html',s:(x.name+' '+S.one+' '+x.description).toLowerCase()});
  }
  console.log(S.hub+' : '+items.length+' fiches');
}
fs.writeFileSync('outils/lore-index.json',JSON.stringify(index));

/* ---------- accueil : un bloc "Le monde de Leonida" avant "Les outils" ---------- */
let home=fs.readFileSync('index.html','utf8');
const block=`<section class="lore-sec shell" id="monde">
  <div class="sec-head rise"><h2>Le monde de Leonida</h2><p>Régions, personnages et entreprises présentés par Rockstar, avec leurs visuels officiels.</p></div>
  <div class="lore-grid">
${['regions','characters','businesses'].map(k=>{const S=SECTIONS[k],x=ED[k][0],m=media(x);return `    <a class="lore-card rise" href="${S.hub}.html">${imgTag(m,S.title+', '+CREDIT.toLowerCase(),false)}<div class="veh-body"><span class="veh-marque">${ED[k].length} fiches</span><h3>${esc(S.label)}</h3><p>${esc(S.lede)}</p><span class="veh-go">Explorer</span></div></a>`;}).join('\n')}
  </div>
</section>
`;
home=home.replace(/<section class="lore-sec shell" id="monde">[\s\S]*?<\/section>\n/,'');
home=home.replace(/(<section class="tools-sec shell" id="outils">)/,block+'$1');
if(!home.includes('id="monde"'))throw new Error("section 'Le monde de Leonida' non insérée");
fs.writeFileSync('index.html',home);
console.log('accueil : bloc "Le monde de Leonida" en place');
require('./sync-site.cjs');
