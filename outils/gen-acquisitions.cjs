#!/usr/bin/env node
'use strict';
// Une seule saisie éditoriale ; projection vers les hubs, le calculateur et la progression.
// v7.42 (lot 5) : gabarit « vrai site » des pages de section (bandeau avec pile d'images cliquable, sous-navigation
// collante, sections éditoriales de outils/sections.cjs, listes dépliables des catalogues de outils/catalogues.cjs en
// position centrale, encart calculateur et puces posés par sync-site.cjs, bloc « Vérification et sources » en pied).
// Contenu éditorial : outils/catalogues/editorial.json ; listes : outils/catalogues/<famille>.json.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const source=JSON.parse(read('outils/acquisitions.json')),ed=JSON.parse(read('outils/editorial.json')),media=JSON.parse(read('outils/medias-officiels.json'));
const EDITO=JSON.parse(read('outils/catalogues/editorial.json'));
const S=require('./sections.cjs'),C=require('./catalogues.cjs');
const context={window:{}};vm.createContext(context);
for(const f of ['vehicules-data.js','armes-data.js'])vm.runInContext(read(f),context);
const vehicles=context.window.LK_VEHICULES,weapons=context.window.LK_ARMES;
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cat=id=>source.categories.find(x=>x.id===id);
const visuals=require('./lot-c-visuals.cjs');
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
const services=source.services.map(x=>{const ref=ed.businesses.find(y=>y.id===x.ref);if(!ref)throw Error('Commerce inconnu : '+x.ref);return {...x,id:ref.id,name:ref.name,url:'/entreprises/'+ref.id+'.html',images:images(x.media),condition:'Service de l’Édition Ultimate · tarifs non publiés',evidenceLevel:1};});
const variants=source.weaponVariants.map(id=>{const ref=weapons.find(x=>x.id===id);if(!ref)throw Error('Arme inconnue : '+id);return {id,name:ref.nom,url:'/armes/'+id+'.html'};});
const payload={schemaVersion:source.schemaVersion,verifiedAt:source.verifiedAt,game:source.game,sources:source.sources,categories:source.categories,items,services,weaponVariants:variants};
fs.writeFileSync(path.join(root,'acquisitions-data.js'),'/* Généré par outils/gen-acquisitions.cjs depuis outils/acquisitions.json et les données canoniques existantes. */\nwindow.LK_ACQUISITIONS = '+JSON.stringify(payload,null,2)+';\n');
const base=read('a-propos.html'),header=base.match(/<header>[\s\S]*?<\/header>/)[0].replace(/ class="here"/g,''),footer=base.match(/<footer>[\s\S]*?<\/footer>/)[0];
const metaDesc=t=>{t=String(t||'').replace(/\s+/g,' ').trim();if(t.length<=158)return t;const ph=t.split(/(?<=[.!?])\s+/);let d='';for(const q of ph){if(d&&(d+' '+q).length>158)break;d=d?d+' '+q:q;}return d.length<=158&&d.length>=60?d:t.slice(0,155).replace(/\s+\S*$/,'')+'…';};
const favicon=base.match(/<link rel="icon"[^>]*>/)[0];
function photo(m,alt){if(!m)return '';const a=m.variants[0],b=m.variants.find(x=>x.w===1280)||a;return `<img src="${a.src}" srcset="${a.src} ${a.w}w, ${b.src} ${b.w}w" sizes="(max-width:700px) 100vw, 50vw" width="${a.w}" height="${a.h}" alt="${esc(alt)}" loading="lazy" decoding="async">`;}
function provenance(item){const s=source.sources[item.sourceId];return `<details class="d-source"><summary>Source et niveau de confirmation</summary><p>Niveau ${item.evidenceLevel||1} · obtention ou personnalisation décrite. L’achat séparé en jeu n’est pas confirmé.</p><p><a href="${s.url}" target="_blank" rel="noopener">${esc(s.title)}</a> · consultée le <time datetime="${s.consultedAt}">${s.consultedAt.split('-').reverse().join('/')}</time>. Publication de la source : ${s.publishedAt||'date non indiquée'}.</p></details>`;}
function gallery(list,name){if(list.length<2)return '';return `<details class="d-gallery"><summary>Voir les ${list.length-1} autres vues officielles</summary><div>${list.slice(1).map(m=>`<figure>${photo(m,name+' : '+m.titre)}<figcaption>${esc(m.titre)} · © Rockstar Games / Take-Two Interactive</figcaption></figure>`).join('')}</div></details>`;}
function card(item){const media=item.images[0];return `<article class="d-card" id="${item.id}" data-d-reveal>
 ${photo(media,(item.nameKind==='official-description'?'Visuel du contenu décrit : ':'')+item.name+', capture officielle Rockstar Games')}
 <div class="d-card-body"><p class="d-label">${esc(item.condition)}</p><h3>${esc(item.name)}</h3><p>${esc(item.description)}</p>
 ${item.trackable?'<p class="d-status">Obtention documentée · prix séparé inconnu</p>':'<p class="d-status">Collection annoncée · détail des pièces à documenter</p>'}
 ${item.nameKind==='official-description'?'<p class="d-label d-label--note">Libellé descriptif fondé sur la présentation officielle.</p>':''}
 ${item.trackable?`<label class="d-check" hidden><input type="checkbox" data-acq-toggle="${item.id}"> J’ai obtenu ${esc(item.name)}</label>`:''}
 <div class="d-actions">${item.ref?`<a href="${item.url}">Ouvrir la fiche existante</a>`:''}${item.calculatorCompatible?`<a href="/calculateurs.html?tool=purchase&amp;type=${item.type}&amp;id=${item.id}&amp;from=fiche#atelier">Simuler un budget personnel</a>`:''}</div>
 ${provenance(item)}${gallery(item.images,item.name)}
 </div></article>`;}
function serviceCard(item){return `<article class="d-card" data-d-reveal>${photo(item.images[0],item.name+', commerce présenté par Rockstar')}<div class="d-card-body"><p class="d-label">${esc(item.condition)}</p><h3><a href="${item.url}">${esc(item.name)}</a></h3><p>${esc(item.description)}</p><p class="d-status">Service annoncé · propriété du commerce non confirmée</p>${provenance(item)}${gallery(item.images,item.name)}</div></article>`;}
// v7.40 : les puces « Explorer les contenus documentés » sont générées par outils/site-shell.cjs (chips) et posées en bas de chaque page de section par sync-site.cjs.
const contextual=()=>'';
const frDate=iso=>iso?iso.split('-').reverse().join('/'):null;
const para=list=>(list||[]).map(p=>'<p>'+esc(p)+'</p>').join('');
const pinsHref=a=>a.pins?'carte.html#pins='+a.pins.join(',')+(a.pinsTitle?'&t='+encodeURIComponent(a.pinsTitle):''):a.href;
const fill=(t,vars)=>String(t).replace(/\{(\w+)\}/g,(m,k)=>vars[k]!==undefined?String(vars[k]):m);
/* Sources de acquisitions.json présentées comme entrées du bloc Sources (ids acq-*) */
const acqSources=ids=>ids.map(k=>{const s=source.sources[k];return {id:'acq-'+k,url:s.url,title:s.title,publishedAt:s.publishedAt,consultedAt:s.consultedAt,statut:'officiel',claim:s.claim};});
const LEGEND=[
 {statut:'officiel',titre:'Officiel',texte:'Nommé ou décrit par Rockstar : page du site officiel, Newswire, vidéo, ou texte officiel reproduit par la presse.'},
 {statut:'vu',titre:'Vu dans un média',texte:'Visible dans un trailer, une capture officielle ou l’Extended Look. Ça existe à l’écran ; on ne sait ni le prix ni si ça s’achète.'},
 {statut:'comm',titre:'Identification communautaire',texte:'Rapprochement fait par des joueurs (wiki, gtadb.org), cité comme tel, jamais présenté comme confirmé.'},
 {statut:'serie',titre:'Repère de la série',texte:'Ce que GTA V, GTA Online, GTA IV ou San Andreas font. Un prix de la série reste dans sa colonne : il ne vaut pas pour GTA VI.'},
 {statut:'conf',titre:'À confirmer',texte:'Rien de publié par Rockstar. La ligne existe pour dire ce qu’on attend, pas pour l’affirmer.'}
];
function legend(){return '<div class="ed-levels">'+LEGEND.map(n=>'<div class="ed-level"><h3>'+S.pip(n.statut)+esc(n.titre)+'</h3><p>'+esc(n.texte)+'</p></div>').join('')+'</div>';}
function sourcesSection(num,entries,lede){
 return S.section({id:'sources',num,kicker:entries.length+' sources ouvertes',title:'Vérification et sources',icon:'lire',tone:'night',accent:'coral',lede:esc(lede||'Chaque ligne des listes et chaque affirmation de cette page portent un statut et renvoient à une page ouverte à la date indiquée. Les pages Rockstar sont citées avec leur dernière ouverture directe ; leurs textes ont été relus le 27 septembre 2026 dans les sources qui les reproduisent.')},
  legend()+'<h3 class="ed-h3">Pages consultées</h3>'+S.sourceList(entries)+'<div class="ed-callout"><p><strong>Ce qu’on ne fait pas.</strong> Aucun prix ni effet GTA VI inventé, aucune donnée issue des fuites, aucune image qui ne soit pas officielle. Les statuts sont expliqués dans le <a href="tuto.html#sources">Tuto</a>. Contenus vérifiés le '+esc(frDate(source.verifiedAt))+' ; GTA VI est annoncé pour le '+esc(new Intl.DateTimeFormat('fr-FR',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(source.game.releaseDate+'T12:00:00Z')))+'. Ce suivi personnel ne confirme pas qu’un contenu est déjà accessible dans le jeu.</p></div>');
}
function rockstarSection(num,R){return S.section({id:R.id,num,kicker:'Sources officielles',title:'Ce que Rockstar a dit et montré',icon:'film',tone:'paper',lede:esc(R.lede)},S.timeline(R.items)+para(R.p));}
function listSection(num,fam,opts={}){const d=C.load().families[fam];return S.section({id:d.section,num,kicker:'Liste dépliable · '+C.counterText(fam),title:d.titre,icon:'liste',tone:opts.tone||'paper2',accent:opts.accent||'amber',fam,lede:esc(d.intro)},C.listBox(fam,{open:!!opts.open}));}
function placesSection(num,L,opts={}){
 const groups=L.groups.map(g=>({title:g.title,items:g.lieux.map(id=>{const p=C.place(id);return {id,name:p.name,where:S.STATUS_LABEL[p.statut]+(p.region?' · '+p.region:'')};})}));
 return S.section({id:L.id,num,kicker:'Sur la carte',title:opts.title||'Où on s’attend à en trouver',icon:'carte',tone:'paper2',accent:'coral',lede:esc(L.lede)},(opts.before||'')+S.defs()+S.places(groups)+para(L.p));
}
/* v7.43 (lot 6) : cartes-ateliers. Un atelier = une entreprise du site (fiche entreprises/<id>.html) ou une enseigne vue sur la
   carte ; vignette de la carte et lien carte.html#lieu=… quand le lieu est placé, silhouette sans repère et « pas encore placé »
   sinon (One-Eyed Willie’s). Chaque carte dit ce qu’on y fait, son statut, et renvoie à la sous-section de la liste. */
const carteV=require('./carte-vignette.cjs');
function atelierCard(a){
 const biz=a.business?ed.businesses.find(b=>b.id===a.business):null;if(a.business&&!biz)throw Error('Atelier inconnu : '+a.business);
 const name=biz?biz.name:a.name;const p=a.lieu?C.place(a.lieu):null;if(a.lieu&&!p)throw Error('Lieu inconnu : '+a.lieu);
 const where=p?'Sur la carte'+(p.region?' · '+p.region:''):'Pas encore placé sur la carte';
 const href=p?'carte.html#lieu='+esc(a.lieu):(biz?'entreprises/'+esc(biz.id)+'.html':'#'+esc(a.fam));
 const map=p?carteV.vignette(a.lieu):'<svg class="ed-map ed-map--vide" viewBox="0 0 '+carteV.W+' '+carteV.H+'" aria-hidden="true" focusable="false"><use href="#lk-leonida"/></svg>';
 return '<article class="ed-place ed-atelier"><a class="ed-atelier-map" href="'+href+'" aria-label="'+esc(name)+' : '+esc(p?'voir sur la carte':'fiche de l’atelier')+'">'+map+'</a>'
  +'<div class="ed-place-body"><b>'+esc(name)+'</b><span class="ed-place-where">'+S.pip(a.statut,true)+' <span>'+esc(where)+'</span></span><span class="ed-atelier-fait">'+esc(a.fait)+'</span>'
  +'<span class="ed-atelier-links">'+(p?'<a class="veh-go" href="carte.html#lieu='+esc(a.lieu)+'">Voir sur la carte</a>':'')+(biz?'<a class="veh-go" href="entreprises/'+esc(biz.id)+'.html">La fiche</a>':'')+'<a class="veh-go" href="#'+esc(a.fam)+'">La liste</a></span></div></article>';
}
function ateliersSection(num,L){
 return S.section({id:L.id,num,kicker:'Sur la carte',title:'Les ateliers et les armureries',icon:'carte',tone:'paper2',accent:'coral',lede:esc(L.lede)},
  S.defs()+L.groups.map(g=>'<h3 class="ed-h3">'+esc(g.title)+'</h3><div class="ed-places ed-places--ateliers">'+g.items.map(atelierCard).join('')+'</div>').join('')+para(L.p));
}
function serieSection(num,Z){return S.section({id:Z.id,num,kicker:'Repères',title:'Ce que la série faisait déjà',icon:'statuts',tone:'paper',lede:esc(Z.lede)},S.columns(Z.cols)+para(Z.p));}
function pendingSection(num,P,vars){return S.section({id:P.id,num,kicker:'Questions ouvertes',title:'Ce qui reste à confirmer',icon:'sablier',tone:'night',lede:esc(P.lede)},S.pending(P.items.map(x=>({q:x.q,etat:fill(x.etat,vars)}))));}
function actionsSection(num,T){return S.section({id:T.id,num,kicker:'Outils du site',title:'Ce que ça change pour toi',icon:'boussole',tone:'paper',lede:esc(T.lede)},S.actions(T.actions.map(a=>({...a,href:pinsHref(a)}))));}
function faqSection(num,items){if(items.length<4||items.length>6)throw Error('FAQ : 4 à 6 questions attendues ('+items.length+')');return S.section({id:'faq',num,kicker:'Questions',title:'Questions fréquentes',icon:'faq',tone:'paper2'},'<p>Les questions qu’on tape dans un moteur de recherche, avec des réponses courtes et datées.</p><div class="faq rise">'+items.map(x=>'<details><summary>'+esc(x.q)+'</summary><div class="ans">'+esc(x.a)+'</div></details>').join('')+'</div>');}
function cardsSection(num,opts,list,extra){return S.section({id:opts.id,num,kicker:opts.kicker,title:opts.title,icon:opts.icon||'inventaire',tone:opts.tone||'paper',accent:opts.accent||'amber',lede:opts.lede?esc(opts.lede):''},(opts.before||'')+(list.length?'<div class="d-grid">'+list.join('')+'</div>':'')+(extra||''));}
for(const c of source.categories.filter(c=>c.alias)){
 const target=c.alias,[file,hash]=target.slice(1).split('#');
 const dest=source.categories.find(x=>x.route===('/'+file))?.label||(file==='armes.html'?'Armurerie':file);
 fs.writeFileSync(path.join(root,c.route.slice(1)),`<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${esc(c.label)} — cette page a rejoint ${esc(dest)} | Leonidakit</title><meta name="robots" content="noindex, follow"><link rel="canonical" href="https://www.leonidakit.com${target}"><meta http-equiv="refresh" content="0; url=${target}">${favicon}
<link rel="stylesheet" href="style.css"></head>
<body><main id="main" class="shell" style="padding:48px 0"><h1>${esc(c.label)}</h1><p>Cette section fait maintenant partie de <a href="${target}">${esc(dest)}</a>. Tu y es redirigé automatiquement.</p></main></body></html>
`);
}
const nStyle=['coiffures','tatouages','tenues'].reduce((n,f)=>n+C.counts(f).n,0),nConsommables=C.counts('consommables').n,nPerso=['perso-vehicules','perso-armes'].reduce((n,f)=>n+C.counts(f).n,0);
for(const c of source.categories.filter(c=>c.id!=='garages'&&!c.alias)){
 const own=items.filter(x=>x.category===c.id),tracked=own.filter(x=>x.trackable),editorial=own.filter(x=>!x.trackable),svc=services.filter(x=>x.category===c.id);
 const E=EDITO[c.id];if(!E||!E.nav)throw Error('Contenu éditorial absent pour la catégorie '+c.id);
 const pile=visuals.STACKS[c.id]?visuals.stack(c.id):'';
 const head=`<section class="page-head shell lk-glow">${pile?'<div class="lk-head-grid"><div>':''}<p class="fiche-cat">GTA VI · contenus documentés</p><h1>${esc(c.label)}</h1><p class="lede">${esc(c.intro)}</p><p class="d-intro-note">${esc(c.limit)}</p>${contextual(c.id)}${pile?'</div>'+pile+'</div>':''}</section>`;
 const parts=[S.nav(E.nav,'Sections de la page '+c.label)];let n=0;const ld=[];
 const vars={nStyle,nConsommables,nPerso};
 if(c.id==='customizations'){
  /* v7.43 (lot 6) : deux sous-sections (véhicules, armes), les cartes Rockstar avec leur case (kit Ganado, motif Vintage), les ateliers, puis À confirmer, Pour toi, FAQ, Sources. */
  parts.push(rockstarSection(++n,E.rockstar));
  parts.push(cardsSection(++n,{id:'contenus',kicker:'Sources officielles',title:'Ce que Rockstar a décrit',icon:'film',tone:'paper',lede:tracked.length+' contenus documentés, chacun avec sa source et son niveau de confirmation. Tu peux les cocher ici ou depuis leur ligne dans les listes ; le compte se retrouve dans Ma progression.'},tracked.map(card)));
  parts.push(listSection(++n,'perso-vehicules',{tone:'paper2'}));ld.push(['perso-vehicules',C.ldItemList('perso-vehicules')]);
  parts.push(listSection(++n,'perso-armes',{tone:'paper',accent:'coral'}));ld.push(['perso-armes',C.ldItemList('perso-armes')]);
  parts.push(ateliersSection(++n,E.ateliers));
  parts.push(pendingSection(++n,E.confirmer,vars));
  parts.push(actionsSection(++n,E.toi));
  parts.push(faqSection(++n,E.faq));
  parts.push(sourcesSection(++n,[...C.sourcesOf(['perso-vehicules','perso-armes']),...acqSources(['ultimate','vintage'])]));
 }else if(c.id==='nourriture'){
  parts.push(rockstarSection(++n,E.rockstar));
  parts.push(listSection(++n,'consommables',{tone:'paper2'}));ld.push(['consommables',C.ldItemList('consommables')]);
  parts.push(placesSection(++n,E.lieux));
  parts.push(serieSection(++n,E.serie));
  parts.push(pendingSection(++n,E.confirmer,vars));
  parts.push(actionsSection(++n,E.toi));
  parts.push(faqSection(++n,E.faq));
  parts.push(sourcesSection(++n,C.sourcesOf(['consommables'])));
 }else if(c.id==='style'){
  parts.push(rockstarSection(++n,E.rockstar));
  parts.push(listSection(++n,'coiffures',{tone:'paper2'}));ld.push(['coiffures',C.ldItemList('coiffures')]);
  parts.push(listSection(++n,'tatouages',{tone:'paper',accent:'coral'}));ld.push(['tatouages',C.ldItemList('tatouages')]);
  parts.push(listSection(++n,'tenues',{tone:'paper2'}));ld.push(['tenues',C.ldItemList('tenues')]);
  parts.push(placesSection(++n,E.lieux,{title:'Les adresses',before:'<h3 class="ed-h3">Présentées par Rockstar</h3><div class="d-grid d-grid--3">'+svc.map(serviceCard).join('')+'</div>'}));
  parts.push(cardsSection(++n,{id:'collections',kicker:'Éditions',title:'Collections annoncées',icon:'inventaire',tone:'paper',lede:'Ce que les éditions décrivent comme collections. Une collection annoncée n’est pas une liste de pièces achetables : rien n’est à cocher ici, les pièces connues sont dans les listes ci-dessus.'},editorial.map(card)));
  parts.push(pendingSection(++n,E.confirmer,vars));
  parts.push(actionsSection(++n,E.toi));
  parts.push(faqSection(++n,E.faq));
  parts.push(sourcesSection(++n,[...C.sourcesOf(['coiffures','tatouages','tenues']),...acqSources(['ultimate','vintage'])]));
 }else{
  const empty=`<div class="d-empty"><h3>En attente de données officielles</h3><p>${esc(c.empty)}</p></div>`;
  parts.push(cardsSection(++n,{id:'contenus',kicker:'Sources officielles',title:tracked.length?'Ce que Rockstar a décrit':'Où en est cette section',icon:'film',tone:'paper',lede:tracked.length?tracked.length+' contenus documentés, chacun avec sa source et son niveau de confirmation. Tu peux les cocher ; le compte se retrouve dans Ma progression.':c.empty},tracked.map(card),tracked.length?'':empty));
  if(c.id==='boats')parts.push(S.section({id:'observations',num:++n,kicker:'Dans les médias',title:'Aperçus dans les médias',icon:'loupe',tone:'paper2',accent:'coral',lede:esc('Les autres embarcations restent dans le catalogue Véhicules, avec leur niveau d’identification. Un nom reconnu ou une apparition dans un trailer ne prouve pas un achat.')},'<div class="d-actions"><a href="/vehicules.html#cat=bateau">Consulter les embarcations recensées</a><a href="/vehicules.html#cat=avion">Avions recensés</a><a href="/vehicules.html#cat=helico">Hélicoptères recensés</a></div>'));
  if(svc.length)parts.push(cardsSection(++n,{id:'services',kicker:'Adresses',title:'Ateliers et adresses',icon:'carte',tone:'paper2',accent:'coral',lede:'Ces établissements décrivent des possibilités de personnalisation. Ils ne forment pas un catalogue d’entreprises à acheter.'},svc.map(serviceCard)));
  /* v7.43 : la section « Armes personnalisées déjà recensées » de Personnalisations est remplacée par les lignes de la liste perso-armes (variantes gravées reliées aux fiches). */
  parts.push(pendingSection(++n,E.confirmer,vars));
  parts.push(actionsSection(++n,E.toi));
  parts.push(sourcesSection(++n,acqSources(['ultimate','vintage','preorder','screenshots','extended'])));
 }
 const body=head+'<div class="ed-zone ed-zone--acq">'+parts.join('\n')+'</div>';
 const og=own.flatMap(x=>x.images)[0]?.variants[0].src||svc[0]?.images[0]?.variants[0].src||'/img/social-card.png';
 const ldScripts='<script type="application/ld+json">'+JSON.stringify({"@context":"https://schema.org","@type":"BreadcrumbList",itemListElement:[{"@type":"ListItem",position:1,name:"Accueil",item:"https://www.leonidakit.com/"},{"@type":"ListItem",position:2,name:"Tout ce qui s’achète",item:"https://www.leonidakit.com/achats.html"},{"@type":"ListItem",position:3,name:c.label,item:"https://www.leonidakit.com"+c.route}]})+'</script>'+ld.map(([fam,obj])=>'<script type="application/ld+json" data-lk="catalogue-'+fam+'">'+JSON.stringify(obj)+'</script>').join('');
 fs.writeFileSync(path.join(root,c.route.slice(1)),`<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${esc(c.label)} GTA VI : ce qu’on sait | Leonidakit</title><meta name="description" content="${esc(metaDesc(c.intro))}"><meta name="theme-color" content="#FDFBF7">${c.pending&&!own.length&&!svc.length?'<meta name="robots" content="noindex, follow">':''}<link rel="canonical" href="https://www.leonidakit.com${c.route}">${ldScripts}<meta property="og:title" content="${esc(c.label)} : ce qu’on sait dans GTA VI"><meta property="og:description" content="${esc(metaDesc(c.intro))}"><meta property="og:type" content="website"><meta property="og:locale" content="fr_FR"><meta property="og:url" content="https://www.leonidakit.com${c.route}"><meta property="og:image" content="https://www.leonidakit.com${og}"><meta name="twitter:card" content="summary_large_image">${favicon}<link rel="stylesheet" href="style.css"><link rel="stylesheet" href="motion-tokens.css"><link rel="stylesheet" href="acquisitions.css"></head>
<body class="d-page"><a class="skip" href="#main">Aller au contenu</a><div class="sunset" aria-hidden="true"></div>${header}<main id="main" class="lore-page">${body}<p class="shell d-feedback" id="acq-feedback" role="status" aria-live="polite"></p></main>${footer}
<script src="search-index.js"></script><script src="assets-manifest.js"></script><script src="common.js"></script><script src="app.js"></script><script src="acquisitions-data.js"></script><script src="progression-core.js"></script><script src="acquisitions.js"></script><script src="suivi.js"></script><script src="catalogue.js"></script><script src="learning-motion.js"></script></body></html>\n`);
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
/* Index de recherche : catégories, sections des catalogues (ancres), éléments des listes (type « élément »), contenus documentés. */
const famSections=C.FAMILIES.map(f=>{const d=C.load().families[f];return {l:d.label,k:cat(d.page==='/style.html'?'style':d.page==='/personnalisations.html'?'customizations':'nourriture').label,u:d.page+'#'+d.section,s:(d.label+' '+d.titre+' '+d.intro).toLowerCase()};});
fs.writeFileSync(path.join(__dirname,'acquisitions-index.json'),JSON.stringify([...source.categories.filter(c=>!c.alias).map(c=>({l:c.label,k:'Contenus documentés',u:c.route,s:c.label.toLowerCase()})),...famSections,{l:'Accessoires',k:cat('style').label,u:'/style.html#accessoires',s:'accessoires lunettes bijoux montres chapeaux masques'},...C.FAMILIES.flatMap(f=>C.searchEntries(f)),...items.map(x=>({l:x.name,k:cat(x.category).label,u:x.hubUrl,s:(x.name+' '+x.description).toLowerCase()}))]));
console.log(`Acquisitions : ${items.length} références (${items.filter(x=>x.trackable).length} suivables), ${services.length} services, ${source.categories.filter(c=>c.id!=='garages'&&!c.alias).length} pages de section et le bloc Garages ; catalogues : ${C.FAMILIES.map(f=>f+' '+C.counts(f).n).join(', ')}.`);
