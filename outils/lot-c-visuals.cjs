'use strict';
/* Lot C (v7.32) : piles d'images superposées (.lk-stack) pour les en-têtes de pages.
   Une seule source : les visuels officiels déjà livrés dans img/officiel (480 + 1280 px).
   Chaque pile cite ses images par nom de fichier ; le générateur vérifie qu'elles existent. */
const fs=require('node:fs'),path=require('node:path'),root=path.resolve(__dirname,'..');
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const CREDIT='Visuel officiel Rockstar Games';
/* Visuels choisis page par page : nom (sans suffixe -480/-1280), légende courte, texte alternatif. */
const STACKS={
 nourriture:[['leonida-keys-03','The Rusty Anchor','Terrasse d’un bar de plage dans les Keys, visuel officiel Rockstar Games'],['jason-duval-06','Un verre au bar','Jason accoudé au comptoir d’un bar avec des bières, visuel officiel Rockstar Games'],['lucia-caminos-02','Cocktail au bord de la piscine','Lucia au bord d’une piscine avec un cocktail, visuel officiel Rockstar Games']],
 style:[['stock-305-clothing-store-01','Stock 305','Devanture peinte de la boutique Stock 305, visuel officiel Rockstar Games'],['sara-s-unisex-salon-02','Sara’s Unisex Salon','Coupe de cheveux au salon de Sara, visuel officiel Rockstar Games'],['electric-fang-tattoo-04','Electric Fang Tattoo','Dos tatoué dans le salon Electric Fang, visuel officiel Rockstar Games']],
 customizations:[['rideout-customs-mod-shop-01','Rideout Customs','Berline à jantes dorées devant Rideout Customs, visuel officiel Rockstar Games'],['one-eyed-willie-s-mod-shop-01','One-Eyed Willie’s','Pick-up vert éclairé dans l’atelier de One-Eyed Willie, visuel officiel Rockstar Games'],['personalized-weapon-variants','Armes personnalisées','Deux pistolets aux finitions personnalisées, visuel officiel Rockstar Games']],
 logements:[['jason-s-safehouse-vehicles','La maison de Jason','Maison sur pilotis de Jason dans les Keys, visuel officiel Rockstar Games'],['port-gellhorn-01','Motel de Port Gellhorn','Enseigne d’un motel de Port Gellhorn au crépuscule, visuel officiel Rockstar Games'],['trailer-2-brian-boatyard-085','Chantier naval de Brian','Chantier naval de Brian de nuit, visuel officiel Rockstar Games']],
 boats:[['shitzu-squalo-01','Shitzu Squalo','Hors-bord Squalo devant la skyline de Vice City, visuel officiel Rockstar Games'],['trailer-2-seashark-141','Seashark','Jet-ski Seashark lancé sur l’eau, visuel officiel Rockstar Games'],['trailer-1-tropic-011','Tropic','Bateau vu du ciel dans l’eau turquoise, visuel officiel Rockstar Games']],
 achats:[['ultimate-edition-rideout-customs-03','Édition Ultimate','Coupé jaune sur le pont élévateur de Rideout Customs, visuel officiel Rockstar Games'],['stock-305-clothing-store-03','Stock 305','Vitrine de Stock 305, visuel officiel Rockstar Games'],['hawk-little-morgan-revolvers-02','Revolvers Hawk & Little','Revolvers Hawk & Little sur une table, visuel officiel Rockstar Games']],
 armes:[['hawk-little-morgan-revolvers-01','Revolver Morgan','Revolver à lunette tenu à la main, visuel officiel Rockstar Games'],['trailer-2-lucia-grenade-launcher','Lance-grenades','Lucia tire au lance-grenades depuis une voiture, visuel officiel Rockstar Games'],['vintage-vice-city-weapon-pattern-01','Motif Vintage Vice City','Armes au motif Vintage Vice City posées sur une banquette, visuel officiel Rockstar Games']],
 vehicules:[['95-grotti-cheetah-01','Grotti Cheetah','Grotti Cheetah blanche devant un hôtel Art déco, visuel officiel Rockstar Games'],['trailer-2-jet-037','Jet sur l’autoroute','Avion à réaction au-dessus de l’autoroute de Vice City, visuel officiel Rockstar Games'],['dinka-enduro-motorcycle','Dinka Enduro','Moto Dinka Enduro devant un rideau de fer, visuel officiel Rockstar Games']],
 'a-propos':[['vice-city-01','Vice City','Lettres géantes de Vice City au coucher du soleil, visuel officiel Rockstar Games'],['jason-and-lucia-09','Jason et Lucia','Jason et Lucia sur une moto devant une voiture de police, visuel officiel Rockstar Games'],['leonida-keys-01','Leonida Keys','Route au-dessus de la mer dans les Keys, visuel officiel Rockstar Games']],
 contact:[['raul-bautista-01','Un message reçu','Raul au téléphone devant ses écrans, visuel officiel Rockstar Games'],['boobie-ike-02','Jack of Hearts','Boobie Ike devant le club Jack of Hearts, visuel officiel Rockstar Games']],
 progression:[['classic-car-collection-01','Collection de voitures','Homme devant des voitures classiques dans une casse, visuel officiel Rockstar Games'],['leonida-keys-01','Leonida Keys','Route au-dessus de la mer dans les Keys, visuel officiel Rockstar Games'],['mount-kalaga-national-park-01','Mount Kalaga','Motos tout-terrain dans le parc de Mount Kalaga, visuel officiel Rockstar Games']],
 tuto:[['jason-and-lucia-02','Jason et Lucia','Jason et Lucia prêts pour un braquage, visuel officiel Rockstar Games'],['lucia-caminos-01','Lucia','Lucia en pleine action, visuel officiel Rockstar Games']],
 collectibles:[['classic-car-collection-04','Voiture de course','Voiture de course rouge numéro 36, visuel officiel Rockstar Games'],['classic-car-collection-06','Muscle car','Muscle car aux couleurs du drapeau américain, visuel officiel Rockstar Games'],['classic-car-collection-02','Coupé turquoise','Coupé turquoise de la collection, visuel officiel Rockstar Games']],
 carte:[['vice-city-03','Vice City','Vue aérienne de Vice City, visuel officiel Rockstar Games'],['grassrivers-05','Grassrivers','Marais de Grassrivers et skyline au loin, visuel officiel Rockstar Games'],['mount-kalaga-national-park-04','Mount Kalaga','Route en corniche dans Mount Kalaga, visuel officiel Rockstar Games']],
 classement:[['95-grotti-cheetah-02','Grotti Cheetah','Grotti Cheetah de face, visuel officiel Rockstar Games'],['67-vapid-dominator-buggy-01','Dominator Buggy','Buggy Dominator dans la boue, visuel officiel Rockstar Games'],['55-vapid-stanier-01','Vapid Stanier','Vapid Stanier jaune sous les néons, visuel officiel Rockstar Games']],
};
function file(name,size){const f='img/officiel/'+name+'-'+size+'.webp';return fs.existsSync(path.join(root,f))?'/'+f:null;}
/* Une pile : {src,srcset,alt,caption} × 2 ou 3. `prefix` sert aux pages dans un sous-dossier. */
function pick(key){const list=STACKS[key];if(!list)throw Error('Pile d’images inconnue : '+key);return list.map(([name,caption,alt])=>{const a=file(name,480),b=file(name,1280);if(!a)throw Error('Visuel absent pour la pile '+key+' : '+name);return {src:a,big:b,alt,caption};});}
function stack(key,opts={}){const imgs=Array.isArray(key)?key:pick(key);const prefix=opts.prefix||'';const cls='lk-stack lk-stack--'+imgs.length+(opts.cls?' '+opts.cls:'');
 return `<div class="${cls}" aria-label="${esc(opts.label||CREDIT)}">${imgs.map((m,i)=>`<figure><img src="${prefix}${m.src.replace(/^\//,'')}"${m.big?` srcset="${prefix}${m.src.replace(/^\//,'')} 480w, ${prefix}${m.big.replace(/^\//,'')} 1280w" sizes="(max-width:900px) 70vw, 360px"`:''} width="480" height="270" alt="${esc(m.alt)}" loading="${i===0?'eager':'lazy'}" decoding="async">${m.caption?`<figcaption>${esc(m.caption)}</figcaption>`:''}</figure>`).join('')}</div>`;}
/* Pile construite à partir de médias déjà résolus (hubs du monde) : [{src,big,alt,caption}] */
/* v7.38 : chaque image d'une pile est un lien vers ce qu'elle représente.
   Cible d'un visuel (par identifiant de média, ex. « vice-city-01ʼ ») : la fiche du monde qui le cite (editorial.json),
   sinon l'élément d'acquisition qui le cite (fiche existante ou section), sinon l'arme (armes-medias.json), sinon le véhicule
   dont c'est la photo (vehicules-data.js), sinon la ligne du visuel dans medias.html. Les liens sont relatifs à la racine. */
let targetMap=null;
function targets(){
 if(targetMap)return targetMap;
 const map={};
 const put=(id,href)=>{if(id&&href&&!map[id])map[id]=href;};
 try{const ED=JSON.parse(fs.readFileSync(path.join(root,'outils/editorial.json'),'utf8'));const HUB={regions:'lieux',characters:'personnages',businesses:'entreprises',residences:'demeures',hideouts:'planques'};
  for(const [k,hub] of Object.entries(HUB))for(const x of ED[k]||[])for(const m of x.media||[])put(m,hub+'/'+x.id+'.html');}catch(e){}
 try{const AC=JSON.parse(fs.readFileSync(path.join(root,'outils/acquisitions.json'),'utf8'));const route=Object.fromEntries((AC.categories||[]).map(c=>[c.id,String(c.route||'').replace(/^\//,'')]));
  for(const it of AC.items||[]){const href=it.ref&&it.ref.type==='vehicle'?'vehicules/'+it.ref.id+'.html':it.ref&&it.ref.type==='weapon'?'armes/'+it.ref.id+'.html':(route[it.category]?route[it.category].replace(/#.*$/,'')+'#'+it.id:null);for(const m of it.media||[])put(m,href);}}catch(e){}
 try{const AM=JSON.parse(fs.readFileSync(path.join(root,'outils/armes-medias.json'),'utf8'));const uses={};for(const list of Object.values(AM))for(const m of list||[])uses[m]=(uses[m]||0)+1;for(const [id,list] of Object.entries(AM))for(const m of list||[])put(m,uses[m]>1?'armes.html':'armes/'+id+'.html');}catch(e){}
 try{const vm=require('node:vm');const d={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'vehicules-data.js'),'utf8'),d);for(const v of d.window.LK_VEHICULES||[]){const mm=/\/img\/officiel\/([a-z0-9-]+)-480\.webp$/.exec(v.thumb||'');if(mm)put(mm[1],'vehicules/'+v.id+'.html');}}catch(e){}
 targetMap=map;return map;
}
function targetFor(mediaId){return targets()[mediaId]||('medias.html#media-'+mediaId);}
const unesc=x=>String(x).replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
/* Réécrit toutes les piles d'un document : <figure><img…><figcaption>…</figcaption></figure> devient un lien couvrant la figure.
   Idempotent : une pile déjà liée est reconstruite à partir de son image et de sa légende. prefix = chemin vers la racine ('' ou '../'). */
function linkify(html,prefix){
 prefix=prefix||'';
 return html.replace(/<div class="lk-stack[^"]*"[^>]*>[\s\S]*?<\/div>/g,block=>block.replace(/<figure>([\s\S]*?)<\/figure>/g,(f,inner)=>{
  const img=/<img [^>]*>/.exec(inner);if(!img)return f;
  const src=/ src="([^"]*)"/.exec(img[0]);const id=src?/([a-z0-9-]+)-(?:480|1280)\.webp$/i.exec(src[1]):null;
  const cap=/<figcaption>([\s\S]*?)<\/figcaption>/.exec(inner)||/<span class="lk-stack-cap">([\s\S]*?)<\/span>/.exec(inner);
  const caption=cap?cap[1]:'';
  const href=prefix+targetFor(id?id[1].toLowerCase():'');
  const label=(caption?unesc(caption)+' : ':'')+(href.includes('medias.html')?'voir le visuel et ses crédits':'ouvrir la fiche');
  return `<figure><a class="lk-stack-link" href="${href}" aria-label="${esc(label)}">${img[0]}${caption?`<span class="lk-stack-cap">${caption}</span>`:''}</a></figure>`;
 }));
}
module.exports={STACKS,pick,stack,file,CREDIT,targets,targetFor,linkify};
