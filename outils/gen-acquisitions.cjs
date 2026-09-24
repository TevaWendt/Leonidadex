#!/usr/bin/env node
'use strict';
// Une seule saisie éditoriale ; projection vers les hubs, le calculateur et la progression.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const source=JSON.parse(read('outils/acquisitions.json')),ed=JSON.parse(read('outils/editorial.json')),media=JSON.parse(read('outils/medias-officiels.json'));
const context={window:{}};vm.createContext(context);
for(const f of ['vehicules-data.js','armes-data.js'])vm.runInContext(read(f),context);
const vehicles=context.window.LK_VEHICULES,weapons=context.window.LK_ARMES;
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cat=id=>source.categories.find(x=>x.id===id);
const images=ids=>(ids||[]).map(id=>{if(!media[id])throw Error('Média inconnu : '+id);return {id,...media[id]};});
const items=source.items.map(item=>{
 if(!/^[a-z0-9-]+$/.test(item.id)||!cat(item.category)||!source.sources[item.sourceId])throw Error('Référence incorrecte : '+item.id);
 const ref=item.ref?.type==='vehicle'?vehicles.find(x=>x.id===item.ref.id):item.ref?.type==='weapon'?weapons.find(x=>x.id===item.ref.id):null;
 if(item.ref&&!ref)throw Error('Objet canonique absent : '+item.id);
 if(item.trackable&&item.evidenceLevel!==1)throw Error('Un simple aperçu ne peut être suivi comme acquisition : '+item.id);
 const type=item.ref?.type||cat(item.category).type;
 const route=cat(item.category).route.split('#')[0];
 return {...item,type,name:ref?((ref.marque?ref.marque+' ':'')+ref.nom):item.name,
  url:ref?'/'+(type==='vehicle'?'vehicules':'armes')+'/'+ref.id+'.html':route+'#'+item.id,
  hubUrl:route+'#'+item.id,images:images(item.media),source:source.sources[item.sourceId].url,
  verifiedAt:item.verifiedAt||source.verifiedAt,status:'official',purchasable:null};
});
if(new Set(items.map(x=>x.id)).size!==items.length)throw Error('Identifiant dupliqué');
const services=source.services.map(x=>{const ref=ed.businesses.find(y=>y.id===x.ref);if(!ref)throw Error('Commerce inconnu : '+x.ref);return {...x,id:ref.id,name:ref.name,url:'/entreprises/'+ref.id+'.html',images:images(x.media),condition:'Service de l’Édition Ultime · tarifs non publiés',evidenceLevel:1};});
const variants=source.weaponVariants.map(id=>{const ref=weapons.find(x=>x.id===id);if(!ref)throw Error('Arme inconnue : '+id);return {id,name:ref.nom,url:'/armes/'+id+'.html'};});
const payload={schemaVersion:source.schemaVersion,verifiedAt:source.verifiedAt,game:source.game,sources:source.sources,categories:source.categories,items,services,weaponVariants:variants};
fs.writeFileSync(path.join(root,'acquisitions-data.js'),'/* Généré par outils/gen-acquisitions.cjs depuis outils/acquisitions.json et les données canoniques existantes. */\nwindow.LK_ACQUISITIONS = '+JSON.stringify(payload,null,2)+';\n');
const base=read('a-propos.html'),header=base.match(/<header>[\s\S]*?<\/header>/)[0].replace(/ class="here"/g,''),footer=base.match(/<footer>[\s\S]*?<\/footer>/)[0];
const fonts=base.match(/<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com">[\s\S]*?rel="stylesheet">/)[0],favicon=base.match(/<link rel="icon"[^>]*>/)[0];
function photo(m,alt){if(!m)return '';const a=m.variants[0],b=m.variants.find(x=>x.w===1280)||a;return `<img src="${a.src}" srcset="${a.src} ${a.w}w, ${b.src} ${b.w}w" sizes="(max-width:700px) 100vw, 420px" width="${a.w}" height="${a.h}" alt="${esc(alt)}" loading="lazy" decoding="async">`;}
function provenance(item){const s=source.sources[item.sourceId];return `<details class="d-source"><summary>Source et niveau de confirmation</summary><p>Niveau ${item.evidenceLevel||1} · obtention ou personnalisation décrite. L’achat séparé en jeu n’est pas confirmé.</p><p><a href="${s.url}" target="_blank" rel="noopener">${esc(s.title)}</a> · consultée le <time datetime="${s.consultedAt}">${s.consultedAt.split('-').reverse().join('/')}</time>. Publication de la source : ${s.publishedAt||'date non indiquée'}.</p></details>`;}
function gallery(list,name){if(list.length<2)return '';return `<details class="d-gallery"><summary>Voir les ${list.length-1} autres vues officielles</summary><div>${list.slice(1).map(m=>`<figure>${photo(m,name+' : '+m.titre)}<figcaption>${esc(m.titre)} · © Rockstar Games / Take-Two Interactive</figcaption></figure>`).join('')}</div></details>`;}
function card(item){const media=item.images[0];return `<article class="d-card" id="${item.id}" data-d-reveal>
 ${photo(media,(item.nameKind==='official-description'?'Visuel du contenu décrit : ':'')+item.name+', capture officielle Rockstar Games')}
 <div class="d-card-body"><p class="d-label">${esc(item.condition)}</p><h3>${esc(item.name)}</h3><p>${esc(item.description)}</p>
 ${item.trackable?'<p class="d-status">Obtention documentée · prix séparé inconnu</p>':'<p class="d-status">Collection annoncée · détail des pièces à documenter</p>'}
 ${item.trackable?`<label class="d-check" hidden><input type="checkbox" data-acq-toggle="${item.id}"> J’ai obtenu ${esc(item.name)}</label>`:''}
 <div class="d-actions">${item.ref?`<a href="${item.url}">Ouvrir la fiche existante</a>`:''}${item.calculatorCompatible?`<a href="/calculateurs.html?tool=purchase&amp;type=${item.type}&amp;id=${item.id}&amp;from=fiche#atelier">Simuler un budget personnel</a>`:''}</div>
 ${item.nameKind==='official-description'?'<p class="d-label">Libellé descriptif fondé sur la présentation officielle.</p>':''}${provenance(item)}${gallery(item.images,item.name)}
 </div></article>`;}
function serviceCard(item){return `<article class="d-card" data-d-reveal>${photo(item.images[0],item.name+', commerce présenté par Rockstar')}<div class="d-card-body"><p class="d-label">${esc(item.condition)}</p><h3><a href="${item.url}">${esc(item.name)}</a></h3><p>${esc(item.description)}</p><p class="d-status">Service annoncé · propriété du commerce non confirmée</p>${provenance(item)}${gallery(item.images,item.name)}</div></article>`;}
const contextual=current=>`<nav class="d-related" aria-label="Explorer les contenus documentés">${source.categories.filter(x=>x.id!==current).map(x=>`<a href="${x.route}">${esc(x.label)}</a>`).join('')}<a href="/progression.html#acquisitions">Ma progression</a><a href="/tuto.html#sources">Comprendre les statuts</a></nav>`;
function sourcesBlock(){return `<section class="shell d-sources" aria-labelledby="d-sources-title"><h2 id="d-sources-title">Vérification et sources</h2><p>Contenus vérifiés le <time datetime="${source.verifiedAt}">${source.verifiedAt.split('-').reverse().join('/')}</time>. GTA VI est annoncé pour le ${new Intl.DateTimeFormat('fr-FR',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(source.game.releaseDate+'T12:00:00Z'))}. Ce suivi personnel ne confirme pas qu’un bonus est déjà accessible dans le jeu.</p><ul>${['ultimate','vintage','preorder','screenshots'].map(k=>{const s=source.sources[k];return `<li><a href="${s.url}" target="_blank" rel="noopener">${esc(s.title)}</a>${s.publishedAt?' · publié le '+s.publishedAt:''} · consulté le ${s.consultedAt}</li>`;}).join('')}</ul><p>Les captures réutilisées conservent leurs crédits et leur provenance dans <a href="/medias.html">les médias du site</a>. Les références communautaires restent dans leur catalogue d’origine, avec leur statut.</p></section>`;}
for(const c of source.categories.filter(c=>c.id!=='garages')){
 const own=items.filter(x=>x.category===c.id),tracked=own.filter(x=>x.trackable),editorial=own.filter(x=>!x.trackable),svc=services.filter(x=>x.category===c.id);
 const extra=c.id==='boats'?`<section class="shell d-section" aria-labelledby="observations"><h2 id="observations">Aperçus dans les médias</h2><p>Les autres embarcations restent dans le catalogue Véhicules, avec leur niveau d’identification. Un nom reconnu ou une apparition dans un trailer ne prouve pas un achat.</p><div class="d-actions"><a href="/vehicules.html#cat=bateau">Consulter les embarcations recensées</a><a href="/vehicules.html#cat=avion">Avions recensés</a><a href="/vehicules.html#cat=helico">Hélicoptères recensés</a></div></section>`:c.id==='customizations'?`<section class="shell d-section" aria-labelledby="variantes"><h2 id="variantes">Armes personnalisées déjà recensées</h2><p>Les variantes annoncées dans l’Édition Ultime restent reliées aux fiches de l’arsenal. Elles ne deviennent pas de nouvelles armes comptées deux fois.</p><ul class="d-related">${variants.map(v=>`<li><a href="${v.url}">${esc(v.name)}</a></li>`).join('')}</ul><p><a href="/collectibles.html#catalogue">La collection de voitures classiques de Wyman</a> possède déjà sa page : une commande spéciale ne confirme pas la propriété d’une entreprise.</p></section>`:'';
 const body=`<section class="page-head shell"><p class="fiche-cat">GTA VI · contenus documentés</p><h1>${esc(c.label)}</h1><p class="lede">${esc(c.intro)}</p><p class="d-intro-note">${esc(c.limit)}</p>${contextual(c.id)}</section>
 <section class="shell d-section" id="catalogue" aria-labelledby="catalogue-title"><h2 id="catalogue-title">${c.id==='style'?'Pièces individuelles':'Contenus à suivre'}</h2>${tracked.length?`<p class="d-category-count">${tracked.length} contenus documentés · <a href="/progression.html#acquisitions">suivre leur obtention</a></p><div class="d-grid">${tracked.map(card).join('')}</div>`:`<div class="d-empty"><h3>En attente de données officielles</h3><p>${esc(c.empty)}</p></div>`}</section>
 ${editorial.length?`<section class="shell d-section" aria-labelledby="collections"><h2 id="collections">Collections annoncées</h2><div class="d-grid">${editorial.map(card).join('')}</div></section>`:''}
 ${svc.length?`<section class="shell d-section" aria-labelledby="services"><h2 id="services">Services et adresses</h2><p>Ces établissements décrivent des possibilités de personnalisation. Ils ne forment pas un catalogue d’entreprises à acheter.</p><div class="d-grid">${svc.map(serviceCard).join('')}</div></section>`:''}${extra}${sourcesBlock()}`;
 const og=own.flatMap(x=>x.images)[0]?.variants[0].src||svc[0]?.images[0]?.variants[0].src||'/img/social-card.png';
 fs.writeFileSync(path.join(root,c.route.slice(1)),`<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${esc(c.label)} GTA VI : ce qu’on sait | Leonidakit</title><meta name="description" content="${esc(c.intro)}"><meta name="theme-color" content="#FDFBF7"><link rel="canonical" href="https://www.leonidakit.com${c.route}"><meta property="og:title" content="${esc(c.label)} : ce qu’on sait dans GTA VI"><meta property="og:description" content="${esc(c.intro)}"><meta property="og:type" content="website"><meta property="og:locale" content="fr_FR"><meta property="og:url" content="https://www.leonidakit.com${c.route}"><meta property="og:image" content="https://www.leonidakit.com${og}"><meta name="twitter:card" content="summary_large_image">${favicon}${fonts}<link rel="stylesheet" href="style.css"><link rel="stylesheet" href="motion-tokens.css"><link rel="stylesheet" href="acquisitions.css"></head>
<body class="d-page"><a class="skip" href="#main">Aller au contenu</a><div class="sunset" aria-hidden="true"></div>${header}<main id="main" class="lore-page">${body}<p class="shell d-feedback" id="acq-feedback" role="status" aria-live="polite"></p></main>${footer}
<script src="search-index.js"></script><script src="assets-manifest.js"></script><script src="common.js"></script><script src="app.js"></script><script src="acquisitions-data.js"></script><script src="progression-core.js"></script><script src="acquisitions.js"></script><script src="learning-motion.js"></script></body></html>\n`);
}
// Le bloc réutilise les mêmes données que les nouveaux hubs. Pas de deuxième liste de garages.
const garages=cat('garages');
const block=`<!-- lot-d-garages:start --><section class="shell d-section" id="garages" aria-labelledby="garages-title"><h2 id="garages-title">Garages documentés</h2><p>${esc(garages.intro)} ${esc(garages.limit)}</p><div class="d-grid">${items.filter(x=>x.category==='garages').map(card).join('')}</div>${contextual('garages')}<p id="acq-feedback" class="d-feedback" role="status" aria-live="polite"></p></section><!-- lot-d-garages:end -->`;
let planques=read('planques.html');
if(planques.includes('<!-- lot-d-garages:start -->'))planques=planques.replace(/<!-- lot-d-garages:start -->[\s\S]*?<!-- lot-d-garages:end -->/,block);
else planques=planques.replace(/<section class="shell reveal lk-explore">/,block+'\n<section class="shell reveal lk-explore">');
for(const f of ['motion-tokens.css','acquisitions.css'])if(!planques.includes(f))planques=planques.replace('</head>',`<link rel="stylesheet" href="${f}">\n</head>`);
for(const f of ['acquisitions-data.js','progression-core.js','acquisitions.js','learning-motion.js'])if(!planques.includes(f))planques=planques.replace('</body>',`<script src="${f}"></script>\n</body>`);
fs.writeFileSync(path.join(root,'planques.html'),planques);
fs.writeFileSync(path.join(__dirname,'acquisitions-index.json'),JSON.stringify([...source.categories.map(c=>({l:c.label,k:'Contenus documentés',u:c.route,s:c.label.toLowerCase()})),...items.map(x=>({l:x.name,k:cat(x.category).label,u:x.hubUrl,s:(x.name+' '+x.description).toLowerCase()}))]));
console.log(`Acquisitions : ${items.length} références (${items.filter(x=>x.trackable).length} suivables), ${services.length} services, 3 hubs et le bloc Garages.`);
