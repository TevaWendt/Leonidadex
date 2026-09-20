/* ============================================================
   LEONIDAKIT — gen-armes.cjs : armes-data.js -> fiches armes/ + hub armes.html
   Même logique que gen.js pour les véhicules : les textes vivent dans
   armes-data.js, les visuels officiels dans outils/armes-medias.json
   (ids du registre outils/medias-officiels.json). Le gabarit d'une fiche
   est lu dans armes/girardi-es9.html (en-tête, pied de page, blocs fixes) ;
   le hub garde tout son contenu, seuls les compteurs, les filtres, les
   sélecteurs du constructeur d'équipement, la grille et l'ItemList sont réécrits.
   Lancer depuis la racine : node outils/gen-armes.cjs
   ============================================================ */
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm');
process.chdir(path.join(__dirname,'..'));
const ctx={window:{}};vm.runInNewContext(fs.readFileSync('armes-data.js','utf8'),ctx);
const A=ctx.window.LK_ARMES,CATL=ctx.window.LK_ARMES_CATS;
const MED=JSON.parse(fs.readFileSync('outils/medias-officiels.json','utf8'));
const AM=JSON.parse(fs.readFileSync('outils/armes-medias.json','utf8'));
const {schema}=require('./armes-schemas.cjs');
const RED=require('./redaction.cjs');
const VIDE_TXT='Schéma indicatif du type d\'arme. Les visuels officiels détaillés arriveront avec le jeu.';
const PERSO_NOM=Object.fromEntries(JSON.parse(fs.readFileSync('outils/editorial.json','utf8')).characters.map(c=>[c.id,c.name.split(' ')[0]]));
/* armureries repérées sur la carte : mêmes liens sur toutes les fiches, comme les concessions sur les fiches véhicules */
const CARTE='<section class="shell reveal" id="carte">\n  <h2 class="sec-h">Sur la carte de Leonida</h2>\n  <p class="fiche-txt rise">Les armureries repérées sur notre carte. Les emplacements et prix de chaque arme seront ajoutés après la sortie.</p>\n  <div class="fiche-liens rise"><a href="../carte.html#lieu=g-L1074">Phil&#x27;s Ammu-Nation</a><a href="../carte.html#lieu=g-L1091">Ammu-Nation de Rockridge</a><a href="../carte.html#lieu=g-L298">Pawn &amp; Gun, Port Gellhorn</a></div>\n</section>';
const esc=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#x27;');
const dec=s=>String(s).replace(/&quot;/g,'"').replace(/&#(?:39|x27);/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
const ST={officiel:{chip:'Officielle',l:'Nommée par Rockstar',card:'Officielle'},vu:{chip:'Aperçue',l:'Vue dans un média officiel',card:'Aperçue'}};
const SLOTL={longue:'Arme longue',poing:'Arme de poing'};
const CREDIT_RS='Visuels officiels © Rockstar Games / Take-Two Interactive. <a href="../medias.html">Provenance et crédits</a>.';
const medList=a=>(AM[a.id]||[]).map(id=>MED[id]).filter(m=>m&&m.variants&&m.variants.every(x=>fs.existsSync(x.src.replace(/^\//,''))));
const medBig=m=>m.variants[1]||m.variants[0];
const medAlt=(a,m)=>(a.imageAlts&&a.imageAlts[m.id])||m.alt||(a.nom+', '+m.titre+', capture officielle Rockstar Games');
const medSrcset=m=>m.variants[0].src+' '+m.variants[0].w+'w, '+medBig(m).src+' '+medBig(m).w+'w';
const medAttr=a=>esc(JSON.stringify(medList(a).map(m=>({s:m.variants[0].src,l:medBig(m).src,w:m.variants[0].w,h:m.variants[0].h,lw:medBig(m).w,lh:medBig(m).h,t:m.titre,a:medAlt(a,m)}))));

/* ---------- silhouettes : reprises du hub existant (une par catégorie) ---------- */
let hub=fs.readFileSync('armes.html','utf8');
const ART={};
for(const m of hub.matchAll(/<article class="veh-card[^>]+data-cat="([^"]+)"[^>]*>([\s\S]*?)<\/article>/g)){const svg=m[2].match(/<svg class="veh-art"[\s\S]*?<\/svg>/);if(svg&&!ART[m[1]])ART[m[1]]=svg[0];}
for(const a of A)if(!ART[a.cat]&&fs.existsSync('armes/'+a.id+'.html')){const raw=fs.readFileSync('armes/'+a.id+'.html','utf8').match(/data-art="([^"]*)"/);if(raw)ART[a.cat]=dec(raw[1]).replace(/style="height:\d+px"/,'style="height:90px"');}
const art=(a,h)=>schema(a.id,h)||(ART[a.cat]||ART.pistolet||'').replace(/style="height:\d+px"/,'style="height:'+h+'px"');

/* ---------- gabarit d'une fiche : blocs fixes d'une fiche existante ---------- */
const BASE=fs.readFileSync('armes/girardi-es9.html','utf8');
const between=(re)=>{const m=BASE.match(re);if(!m)throw new Error('gabarit : '+re);return m[0];};
const HEAD_TOP=between(/<meta name="theme-color"[\s\S]*?<link href="https:\/\/fonts\.googleapis\.com[^>]*>\n/);
const HEADER=between(/<a class="skip"[\s\S]*?<main id="main">/);
const FCOUNT=between(/<div class="fcount">[\s\S]*?<\/div>\n<\/div>/);
const PENDING=between(/<div class="fiche-col reveal">\s*<h2 class="sec-h">Ce qui arrive avec le jeu<\/h2>[\s\S]*?<\/div>\n\n<\/section>/);
const NOTE=between(/<section class="shell">\s*<div class="note-box rise">[\s\S]*?<\/section>/);
const FOOTER=between(/<footer>[\s\S]*?<\/body>\n<\/html>/);

const lede=a=>{const cat=CATL[a.cat].toLowerCase();return a.nom+' dans GTA VI : '+cat+(a.insp?'. Inspiration : '+a.insp:'')+'. '+ST[a.st].l+' ('+a.src+').';};
/* meta description : les premières phrases du contexte de l'arme (165 caractères max), sinon le lede générique */
const description=a=>{const ph=(a.ctx||'').split(/(?<=[.!?])\s+/);let d=a.nom+' dans GTA VI.';let n=0;for(const q of ph){if((d+' '+q).length>165)break;d=d+' '+q;n++;}return n?d:lede(a);};
const related=a=>{let r=A.filter(x=>x.cat===a.cat&&x.id!==a.id);if(r.length<4)for(const x of A){if(r.length>=6)break;if(x.id!==a.id&&x.slot===a.slot&&!r.includes(x))r.push(x);}return r.slice(0,6);};

function fiche(a,i){
 const meds=medList(a),cat=CATL[a.cat],st=ST[a.st],url='https://www.leonidakit.com/armes/'+a.id+'.html';
 const red=RED.arme(a,CATL);
 const prev=A[(i-1+A.length)%A.length],next=A[(i+1)%A.length];
 const ld=JSON.stringify({'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[
  {'@type':'ListItem',position:1,name:'Accueil',item:'https://www.leonidakit.com/'},
  {'@type':'ListItem',position:2,name:'Armes',item:'https://www.leonidakit.com/armes.html'},
  {'@type':'ListItem',position:3,name:a.nom,item:url}]},null,2);
 const tags=[...(meds.length?['<span class="chip">Images officielles</span>','']:[]),
  '<span class="chip live">'+st.chip+'</span>','<span class="chip">'+esc(a.src)+'</span>','<span class="chip">'+SLOTL[a.slot]+'</span>'].join('\n          ');
 const insp=a.insp?esc(a.insp)+' <span class="unknown">— rapprochement communautaire</span>':a.fam?esc(a.fam)+' <span class="unknown">— famille d\'objet</span>':'<span class="unknown">Objet du quotidien</span>';
 const rows=[['Nom',esc(a.nom)+(a.perso?' <span class="perso-tag">Arme de '+esc(PERSO_NOM[a.perso]||a.perso)+'</span>':'')],...(a.fr?[['Désignation courante',esc(a.fr)]]:[]),['Statut',st.l],
  ['Catégorie','<a href="../armes.html#'+a.cat+'">'+esc(cat)+'</a>'],['Emplacement',SLOTL[a.slot]],
  ...(a.portee?[['Portée estimée',esc(a.portee)]]:[]),['Inspiration réelle',insp],...(a.mun?[['Munitions',esc(a.mun)]]:[]),
  ...(a.ue?[['Édition Ultimate','Version exclusive ou mise en avant']]:[]),['Source',esc(a.src)]];
 const gal=`<div class="gal" data-base="../img/armes/${a.id}" data-vues="" data-nom="${esc(a.nom)}"
             data-art="${esc(art(a,150))}" data-vide-txt="${esc(VIDE_TXT)}" aria-label="Schéma : ${esc(a.nom)}" data-vide="1"><div class="gal-track"><div class="gal-item"><div class="gal-vide">${art(a,150)}<span>${esc(VIDE_TXT)}</span></div></div></div></div>`;
 const rel=related(a).map(x=>'<a class="rel-card" href="'+x.id+'.html"><span class="rel-art">'+art(x,108)+'</span><span class="rel-txt"><span class="rel-marque">'+esc(CATL[x.cat])+'</span><span class="rel-nom">'+esc(x.nom)+'</span></span></a>').join('');
 return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(a.nom)} — GTA VI | Leonidakit</title>
<meta name="description" content="${esc(description(a))}">
<meta property="og:title" content="${esc(a.nom)} — GTA VI | Leonidakit">
<meta property="og:description" content="${esc(description(a))}">
<meta property="og:type" content="website">
<meta property="og:locale" content="fr_FR">
${HEAD_TOP.replace(/<link rel="canonical" href="[^"]*">/,'<link rel="canonical" href="'+url+'">')}<script type="application/ld+json">
${ld}
</script>
<link rel="stylesheet" href="../style.css">
<link rel="stylesheet" href="../fiches.css">
<script type="application/ld+json">${JSON.stringify({'@context':'https://schema.org','@type':'Thing',name:a.nom,description:description(a),url,isPartOf:{'@type':'VideoGame',name:'Grand Theft Auto VI'},...(meds.length?{image:['https://www.leonidakit.com'+medBig(meds[0]).src]}:{})})}</script>
<meta property="og:image" content="https://www.leonidakit.com${meds.length?medBig(meds[0]).src:'/img/social-card.png'}">
<meta name="twitter:card" content="summary_large_image">
<meta property="og:url" content="${url}">
</head>
<body data-own="armes">

${HEADER}

<section class="fhero fhero--arme fhero--${a.cat}">
  <div class="fhero-bg" aria-hidden="true"></div>
  <div class="shell">
    <nav class="crumbs" aria-label="Fil d'Ariane">
      <a href="../index.html">Accueil</a> <span>/</span>
      <a href="../armes.html">Armes</a> <span>/</span>
      <a href="../armes.html#${a.cat}">${esc(cat)}</a> <span>/</span>
      <span aria-current="page">${esc(a.nom)}</span>
    </nav>

    <div class="fhero-in">
      <div class="fhero-txt">
        <p class="fiche-cat">${esc(cat)}</p>
        <h1>${esc(a.nom)}</h1>
        <p class="lede">${esc(lede(a))}</p>
        <div class="fiche-tags">
          ${tags}
        </div>
        <div class="fiche-liens"><button type="button" class="own-bt" id="own-bt" data-id="${a.id}"><span class="ck"></span><span>Ajouter à mon arsenal</span></button><a href="../comparateur.html?type=armes&amp;ids=${a.id}">Comparer</a></div>
      </div>
      <div class="fhero-art fhero-art--gal">
        ${gal}
        <p class="gal-note">${meds.length?'Schéma Leonidakit. '+meds.length+(meds.length>1?' aperçus officiels':' aperçu officiel')+' plus bas sur cette fiche.':'Schéma Leonidakit. Aucun aperçu officiel détaillé pour l\'instant.'}</p>
      </div>
    </div>
  </div>
</section>

${FCOUNT}

<section class="shell fiche-body">

  <div class="fiche-col reveal">
    <h2 class="sec-h">Identité</h2>
    <table class="spec rise">
      <tbody>
${rows.map(([k,v])=>'        <tr><th scope="row">'+k+'</th><td>'+v+'</td></tr>').join('\n')}
      </tbody>
    </table>
  </div>

  ${PENDING}

<section class="shell reveal">
  <h2 class="sec-h">${esc(red.h2[0])}</h2>
  <p class="fiche-txt rise">${esc(a.ctx)}</p>
  <div class="fiche-clair rise"><p class="fiche-clair-k">En clair</p><p>${esc(red.p1)}</p><p>${esc(red.p3)}</p></div>
</section>
<section class="shell reveal">
  <h2 class="sec-h">${esc(red.h2[1])}</h2>
  <p class="fiche-txt rise">${esc(red.p2)}</p>
</section>
${meds.length?`<section class="shell reveal" id="apercus">
  <h2 class="sec-h">Aperçus dans les supports officiels</h2>
  <p class="fiche-txt rise">Les captures où cette arme apparaît. Elles montrent la scène plus que l'arme : le schéma ci-dessus reste la référence visuelle tant que Rockstar n'a pas publié de vue détaillée.</p>
  <div class="lore-gallery-grid rise">${meds.map(m=>'<a class="apercu" href="'+medBig(m).src+'" target="_blank" rel="noopener" aria-label="Agrandir : '+esc(m.titre)+'"><img src="'+m.variants[0].src+'" srcset="'+medSrcset(m)+'" sizes="(max-width:700px) 100vw, 560px" width="'+m.variants[0].w+'" height="'+m.variants[0].h+'" alt="'+esc(medAlt(a,m))+'" loading="lazy" decoding="async"></a>').join('')}</div>
</section>`:''}

${CARTE}

${NOTE}

<section class="shell reveal">
  <h2 class="rel-title">Autres armes : ${esc(cat.toLowerCase())}</h2>
  <div class="rel-grid rise">${rel}</div>
</section>

<nav class="fiche-nav shell" aria-label="Navigation entre fiches">
  <a class="fnav prev" href="${prev.id}.html">
    <span class="fnav-lbl">Précédente</span>
    <span class="fnav-nom">${esc(prev.nom)}</span>
  </a>
  <a class="fnav next" href="${next.id}.html">
    <span class="fnav-lbl">Suivante</span>
    <span class="fnav-nom">${esc(next.nom)}</span>
  </a>
</nav>

</main>

${FOOTER}
`;
}
A.forEach((a,i)=>fs.writeFileSync('armes/'+a.id+'.html',fiche(a,i)));

/* ---------- hub : cartes, filtres, sélecteurs, compteurs, ItemList ---------- */
const search=a=>[a.nom,a.fr,a.insp,CATL[a.cat]].filter(Boolean).join(' ').toLowerCase();
function card(a){const meds=medList(a);
 const thumb=art(a,90);
 return '<article class="veh-card rise arm-card" data-id="'+a.id+'" data-cat="'+a.cat+'" data-slot="'+a.slot+'" data-st="'+a.st+'" data-search="'+esc(search(a))+'"><a class="veh-link" href="armes/'+a.id+'.html"><div class="veh-thumb veh-thumb--arm veh-thumb--'+a.cat+'"><span class="veh-badge">'+esc(CATL[a.cat])+'</span>'+thumb+'<span class="arm-slot arm-slot--'+a.slot+'">'+(a.slot==='longue'?'Longue':'Poing')+'</span></div><div class="veh-body"><span class="veh-st veh-st--'+a.st+'">'+ST[a.st].card+'</span><h3>'+esc(a.nom)+'</h3>'+(a.insp?'<p class="veh-insp">Inspiration&nbsp;: <span>'+esc(a.insp)+'</span></p>':a.fam?'<p class="veh-insp veh-insp--fam">Famille&nbsp;: <span>'+esc(a.fam)+'</span></p>':'')+'<span class="veh-go">Voir la fiche</span></div></a></article>';}
const nSt={officiel:0,vu:0};A.forEach(a=>nSt[a.st]++);
const nSlot={longue:0,poing:0};A.forEach(a=>nSlot[a.slot]++);
const nCat={};A.forEach(a=>nCat[a.cat]=(nCat[a.cat]||0)+1);
hub=hub.replace(/(<div class="veh-grid" id="vgrid" data-mot="arme">)[\s\S]*?(<\/div>\s*<p class="vempty")/,'$1'+A.map(card).join('')+'<i class="veh-spacer" aria-hidden="true"></i>'.repeat(3)+'$2');
hub=hub.replace(/(<button class="chip-filter is-on" data-filter="all">Tout<em>)\d+(<\/em><\/button>)/,'$1'+A.length+'$2');
hub=hub.replace(/(<button class="chip-filter is-on" data-filter="all">Tout<em>\d+<\/em><\/button>)[\s\S]*?(\n\s*<span class="chip-sep"><\/span>)/,'$1'+Object.keys(CATL).map(c=>'<button class="chip-filter" data-filter="'+c+'">'+esc(CATL[c])+'<em>'+(nCat[c]||0)+'</em></button>').join('')+'$2');
hub=hub.replace(/(data-stf="officiel">Nommées par Rockstar<em>)\d+/,'$1'+nSt.officiel).replace(/(data-stf="vu">Vues officiellement<em>)\d+/,'$1'+nSt.vu)
 .replace(/(data-slotf="longue">Longues<em>)\d+/,'$1'+nSlot.longue).replace(/(data-slotf="poing">Poing<em>)\d+/,'$1'+nSlot.poing);
const opt=list=>'<option value="">Aucune</option>'+list.map(a=>'<option value="'+a.id+'">'+esc(a.nom+' · '+CATL[a.cat])+'</option>').join('');
hub=hub.replace(/(<select id="lo-(?:dos|main)"[^>]*>)[\s\S]*?<\/select>/g,(m0,open)=>open+opt(A.filter(a=>a.slot==='longue'))+'</select>');
hub=hub.replace(/(<select id="lo-poing"[^>]*>)[\s\S]*?<\/select>/,(m0,open)=>open+opt(A.filter(a=>a.slot==='poing'&&(a.cat==='pistolet'||a.cat==='pm')))+'</select>');
hub=hub.replace(/(<p class="vcount" id="vcount" role="status"><strong>)\d+/,'$1'+A.length);
const vst=[A.length,Object.keys(nCat).length,nSt.officiel,2];let vi=0;
hub=hub.replace(/(<span class="n" data-count=")\d+(">)\d+(<\/span>)/g,(_,x,y,z)=>{const n=vst[vi++];return n==null?_:x+n+y+n+z;});
hub=hub.replace(/(<span class="l">)nommées? par Rockstar(<\/span>)/,'$1'+(nSt.officiel>1?'nommées par Rockstar':'nommée par Rockstar')+'$2');
hub=hub.replace(/<script type="application\/ld\+json">\{"@context":"https:\/\/schema\.org","@type":"ItemList"[\s\S]*?<\/script>/,
 '<script type="application/ld+json">'+JSON.stringify({'@context':'https://schema.org','@type':'ItemList',name:'Armes de GTA VI recensées par Leonidakit',numberOfItems:A.length,itemListElement:A.map((a,i)=>({'@type':'ListItem',position:i+1,name:a.nom,url:'https://www.leonidakit.com/armes/'+a.id+'.html'}))})+'</script>');
hub=hub.replace(/(<title>Armes de GTA VI : les )\d+( modèles identifiés)/,'$1'+A.length+'$2').replace(/(content="Armes de GTA VI : les )\d+( modèles identifiés)/g,'$1'+A.length+'$2')
 .replace(/Les \d+ armes identifiées de GTA VI/g,'Les '+A.length+' armes identifiées de GTA VI').replace(/"description": "\d+ armes identifiées/,'"description": "'+A.length+' armes identifiées');
hub=hub.replace(/Nous recensons \d+ armes visibles dans les supports officiels, dont \d+ sont nommées/g,'Nous recensons '+A.length+' armes visibles dans les supports officiels, dont '+nSt.officiel+' sont nommées');
fs.writeFileSync('armes.html',hub);
console.log('armes : '+A.length+' fiches ('+A.filter(a=>medList(a).length).length+' avec visuels officiels, '+nSt.officiel+' nommées par Rockstar), hub armes.html mis à jour');
