const fs=require('fs');
process.chdir(require('path').join(__dirname,'..'));
global.window={}; eval(fs.readFileSync('vehicules-data.js','utf8'));
const V=window.LK_VEHICULES;
const MED=JSON.parse(fs.readFileSync('outils/medias-officiels.json','utf8'));
const medList=v=>(v.medias||[]).map(id=>MED[id]).filter(Boolean);
const PERSO_NOM=Object.fromEntries(JSON.parse(fs.readFileSync('outils/editorial.json','utf8')).characters.map(c=>[c.id,c.name]));
const medAlt=(v,m)=>(v.imageAlts&&v.imageAlts[m.id])||m.alt||(nomC(v)+', '+m.titre+', capture officielle Rockstar Games');
const medBig=m=>m.variants[1]||m.variants[0];
const medSrcset=m=>m.variants[0].src+' '+m.variants[0].w+'w, '+medBig(m).src+' '+medBig(m).w+'w';
const medAttr=v=>esc(JSON.stringify(medList(v).map(m=>({s:m.variants[0].src,l:medBig(m).src,w:m.variants[0].w,h:m.variants[0].h,lw:medBig(m).w,lh:medBig(m).h,t:m.titre,a:medAlt(v,m)}))));
const CREDIT_RS='Visuels officiels © Rockstar Games / Take-Two Interactive. <a href="../medias.html">Provenance et crédits</a>.';

const CATL={berline:'Berlines',sport:'Voitures de sport',supercar:'Supercars',muscle:'Muscle cars',
 suv:'SUV et 4x4',pickup:'Pickups et tout-terrain',van:'Vans et cargos',moto:'Deux-roues et quads',
 helicoptere:'Hélicoptères',avion:'Avions',bateau:'Bateaux et jet-skis',service:'Service et urgence',divers:'Divers'};
const ORDRE=Object.keys(CATL);
const ST={officiel:{c:'Officiel',l:'Nommé par Rockstar',d:'Nommé par Rockstar.'},
 vu:{c:'Aperçu officiel',l:'Vu dans un support officiel',d:'Vu dans un support officiel, sans nom communiqué.'},
 comm:{c:'Communautaire',l:'Identification communautaire',d:'Identification communautaire.'}};
const SLOT={americain:'Modèle américain',japonais:'Modèle japonais',europeen:'Modèle européen'};
const SLOTP={americain:'Modèles américains',japonais:'Modèles japonais',europeen:'Modèles européens'};
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#x27;');
const nomC=v=>(v.marque&&v.marque!=='Marque inconnue'?v.marque+' ':'')+v.nom;

/* silhouettes et vignettes existantes */
const hub0=fs.readFileSync('outils/templates/vehicules.html','utf8');
const ART_ID={},ART_CAT={},THUMB={};
let m;const re=/<a class="veh-card rise" href="vehicules\/[^"]+\.html" data-id="([^"]+)"[\s\S]*?<div class="veh-thumb([^"]*)">([\s\S]*?)<\/div><div class="veh-body">/g;
while((m=re.exec(hub0))!==null){ THUMB[m[1]]={cls:m[2],in:m[3]};
  const s=m[3].match(/<svg class="veh-art"[\s\S]*?<\/svg>/); if(s){ ART_ID[m[1]]=s[0];
    const v=V.find(x=>x.id===m[1]); if(v&&!ART_CAT[v.cat])ART_CAT[v.cat]=s[0]; } }
const art=v=>ART_ID[v.id]||ART_CAT[v.cat]||ART_CAT.sport||'';

/* ================= HUB ================= */
function carte(v){
 const t0=THUMB[v.id];
 const t=(t0&&!/image-placeholder|<img\b/.test(t0.in))?t0:null; /* vignette du gabarit sans image manquante */
 const cls=t?t.cls.replace(' veh-thumb--photo',''):' veh-thumb--'+v.cat;
 const meds=medList(v);
 const inner=meds.length?'<span class="veh-badge">'+CATL[v.cat]+'</span><img src="'+meds[0].variants[0].src+'" srcset="'+medSrcset(meds[0])+'" sizes="(max-width:600px) 100vw, 280px" width="'+meds[0].variants[0].w+'" height="'+meds[0].variants[0].h+'" alt="'+esc(medAlt(v,meds[0]))+'" loading="lazy" decoding="async">'
   :t?t.in.replace(/<span class="veh-badge">[^<]*<\/span>/,'<span class="veh-badge">'+CATL[v.cat]+'</span>')
   :'<span class="veh-badge">'+CATL[v.cat]+'</span>'+art(v);
 return '<a class="veh-card rise" href="vehicules/'+v.id+'.html" data-id="'+v.id+'"'
  +(v.slot?' data-slot="'+v.slot+'"':'')+' data-ed="'+(v.edition==='Pre-Order'?'precommande':v.edition?'ultimate':'standard')+'"'+' data-st="'+v.st+'" data-cat="'+v.cat+'"'
  +(v.reel?' data-reel="'+esc(v.reel)+'" data-reel-nom="'+esc(v.reelNom)+'"':'')
  +' data-search="'+esc(v.search)+'">'
  +'<div class="veh-thumb'+(meds.length?' veh-thumb--photo':cls)+'">'+inner+'</div><div class="veh-body">'
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
  '$1'+V.map(carte).join('')+'<i class="veh-spacer" aria-hidden="true"></i>'.repeat(3)+'$2');
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
/* nettoyage : on retire les chips slot/édition déjà injectées, sinon elles s'empilent à chaque run */
H=H.replace(/(?:\s*<span class="chip-sep"><\/span>)?(?:\s*<button class="chip-filter chip-(?:slot|ed)"[^>]*>(?:(?!<\/button>)[\s\S])*?<\/button>)+/g,'');

H=H.replace(/(<button class="chip-filter chip-st" data-stf="comm">Communautaires<em>\d+<\/em><\/button>)/,
 '$1\n    <span class="chip-sep"></span>\n    '+['americain','japonais','europeen'].map(k=>
  '<button class="chip-filter chip-slot" data-slotf="'+k+'">'+SLOTP[k]+'<em>'+(nSlot[k]||0)+'</em></button>').join('\n    '));
const nEd={standard:0,ultimate:0,precommande:0};
V.forEach(v=>nEd[v.edition==='Pre-Order'?'precommande':v.edition?'ultimate':'standard']++);
const EDL={standard:'Édition standard',ultimate:'Édition Ultimate',precommande:'Bonus de précommande'};
H=H.replace(/(<button class="chip-filter chip-slot" data-slotf="europeen">[^<]*<em>\d+<\/em><\/button>)/,
 '$1\n    <span class="chip-sep"></span>\n    '+['standard','ultimate','precommande'].map(k=>
  '<button class="chip-filter chip-ed" data-edf="'+k+'">'+EDL[k]+'<em>'+nEd[k]+'</em></button>').join('\n    '));

/* styles ajoutés : on purge les copies précédentes avant de réinjecter */
H=H.replace(/\n\.chip-filter\.chip-slot em\{background:rgba\(0,0,0,\.08\);\}[\s\S]*?\n\.ouvert b\{color:#1A1A1E;\}/g,'');
H=H.replace('.chip-filter.chip-st em{background:rgba(0,0,0,.08);}',
 `.chip-filter.chip-st em{background:rgba(0,0,0,.08);}
.chip-filter.chip-slot em{background:rgba(0,0,0,.08);}\n.chip-filter.chip-ed em{background:rgba(0,0,0,.08);}
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
H=H.replace(/\n*<section class="shell reveal" id="a-venir">[\s\S]*?<\/section>\n*/g,'\n');
H=H.replace('<section class="shell reveal" id="aller-plus-loin">', bloc+'<section class="shell reveal" id="aller-plus-loin">');

/* données structurées */
H=H.replace(/<script type="application\/ld\+json">\{"@context":"https:\/\/schema\.org","@type":"ItemList"[\s\S]*?<\/script>/,
 '<script type="application/ld+json">'+JSON.stringify({'@context':'https://schema.org','@type':'ItemList',
  name:'Véhicules de GTA VI recensés par Leonidakit',numberOfItems:N,
  itemListElement:V.map((v,i)=>({'@type':'ListItem',position:i+1,name:nomC(v),
   url:'https://www.leonidakit.com/vehicules/'+v.id+'.html'}))})+'</script>');
H=H.replace(/les \d+ modèles recensés/g,'les '+N+' modèles recensés')
   .replace(/les \d+ modèles confirmés/g,'les '+N+' modèles recensés')
   .replace(/Les \d+ véhicules confirmés de GTA VI/g,'Les '+N+' véhicules recensés de GTA VI')
   .replace(/"numberOfItems": \d+/g,'"numberOfItems": '+N)
   .replace(/\d+ véhicules confirmés de GTA VI/g,N+' véhicules recensés de GTA VI')
   .replace(/Nous recensons ici \d+ véhicules, dont \d+ sont nommés/g,'Nous recensons ici '+N+' véhicules, dont '+nSt.officiel+' sont nommés')
   .replace(/Les \d+ véhicules nommés par Rockstar/g,'Les '+nSt.officiel+' véhicules nommés par Rockstar');
H=H.replace(/\n{3,}/g,'\n\n');
fs.writeFileSync('vehicules.html',H);

/* ================= FICHES ================= */
/* variantes de formulation, choisies de façon déterministe sur l'identifiant :
   une fiche garde toujours la même tournure, mais deux fiches voisines diffèrent */
const graine=id=>{let h=0;for(let i=0;i<id.length;i++)h=(h*31+id.charCodeAt(i))>>>0;return h;};
const pioche=(id,sel,liste)=>liste[graine(id+sel)%liste.length];

const V_INSP=[
 "Rockstar ne confirme jamais ses inspirations : c'est une observation établie à partir des visuels officiels, pas une licence.",
 "Aucune licence n'est en jeu ici. Le studio ne valide pas ses sources, et ce rapprochement vient de l'observation des visuels publiés.",
 "Le studio garde le silence sur ses références. Ce rapprochement repose sur la comparaison des images officielles, rien de plus.",
 "À prendre pour ce que c'est : une lecture des images diffusées. Rockstar n'a jamais commenté ses modèles de départ.",
 "Personne chez Rockstar n'a confirmé quoi que ce soit. L'identification vient de la comparaison avec les visuels publiés.",
 "Le studio ne dépose aucune licence et ne nomme aucune référence. Ce rapprochement est une déduction tirée des images.",
 "Rockstar dessine des répliques, jamais des modèles sous licence, et ne dit pas lesquelles. Ce rapprochement reste une observation.",
 "Il s'agit d'une comparaison visuelle, pas d'une information officielle : le studio ne commente pas ses inspirations."];

const V_CARTE=[
 "Notre carte situe déjà les concessions, l'atelier et le circuit. Les points d'apparition précis viendront avec le jeu.",
 "Les lieux utiles au conducteur sont placés sur la carte : vendeurs, préparateur, piste. Restent les spots de chaque modèle, après le 19 novembre.",
 "Concessionnaires, garage de préparation et circuit figurent sur notre carte. Où trouver ce véhicule exactement, nous le saurons à la sortie.",
 "La carte recense les adresses liées à l'automobile. Les emplacements propres à chaque modèle seront relevés une fois le jeu en main.",
 "Vendeurs, atelier et circuit sont déjà cartographiés. Le détail des apparitions par véhicule suivra le lancement.",
 "Notre carte couvre les points de vente, l'atelier et la piste. Le repérage véhicule par véhicule commencera le jour de la sortie."];

const V_SANSIMG=[
 "Illustration provisoire : les visuels officiels restent à intégrer à cette fiche.",
 "Silhouette temporaire en attendant l'intégration des images du véhicule.",
 "Les images ne sont pas encore disponibles sur cette fiche. Illustration provisoire."];


const PENDCAT={
 bateau:["Vitesse de pointe, tenue de mer et comportement dans le clapot.","Prix, ponton de vente et mouillages où le trouver en Leonida.","Coques, teintes, sellerie et équipements de pont."],
 avion:["Vitesse, plafond, distance de décollage et maniabilité.","Prix, aérodrome de vente et pistes où le croiser.","Livrées, décorations de fuselage et aménagements de cabine."],
 helicoptere:["Vitesse, taux de montée et stabilité en vol stationnaire.","Prix, hélisurface de vente et toits où le trouver.","Livrées, teintes et équipements de bord."],
 moto:["Vitesse de pointe, reprise, freinage et stabilité en courbe.","Prix, concessionnaire et rues où la croiser en Leonida.","Guidons, échappements, peintures et pièces moteur."],
 service:["Vitesse, masse, résistance aux chocs et comportement à vide.","Prix s'il est vendable, sinon les endroits où le récupérer.","Livrées de service, gyrophares et équipements spécifiques."],
 divers:["Vitesse, tenue de route et comportement propre à cet engin.","Prix, point de vente et endroits où le trouver en Leonida.","Options disponibles, teintes et améliorations."],
 pickup:["Vitesse de pointe, motricité, franchissement et charge utile.","Prix, concessionnaire et terrains où le repérer.","Suspensions, pneumatiques, pare-chocs et teintes."],
 suv:["Vitesse de pointe, accélération, freinage et comportement en charge.","Prix, concessionnaire et quartiers où le croiser.","Jantes, teintes, intérieurs et améliorations moteur."],
 van:["Vitesse, volume utile, masse et stabilité une fois chargé.","Prix, vendeur et zones où le trouver en Leonida.","Marquages, teintes, jantes et aménagements."],
 berline:["Vitesse de pointe, accélération, freinage et tenue de route.","Prix, concessionnaire et emplacements où la trouver dans Leonida.","Options de garage, livrées, teintes et améliorations."],
 sport:["Vitesse de pointe, reprise, freinage et agilité en appui.","Prix, concessionnaire et endroits où la voir passer.","Kits carrosserie, appuis aérodynamiques, jantes et teintes."],
 supercar:["Vitesse maximale, accélération départ arrêté et tenue en virage rapide.","Prix, vitrine de vente et lieux où elle se montre.","Aérodynamique, matériaux, jantes et peintures rares."],
 muscle:["Vitesse de pointe, couple disponible, freinage et motricité.","Prix, concessionnaire et rues où la surprendre.","Moteurs, échappements, capots, bandes et peintures."]};
const pend=v=>{const t=PENDCAT[v.cat]||PENDCAT.divers;
 return ["Performances","Acquisition","Personnalisation"].map((h,i)=>
  '\n    <div class="pending rise"><div class="pending-top"><h3>'+h+'</h3><span class="pending-tag">À venir</span></div><p>'
  +esc(t[i])+'</p><div class="pending-bars" aria-hidden="true"><span></span><span></span><span></span></div></div>').join('')+'\n  ';};

const MOD=fs.readFileSync('outils/templates/vehicle-reference.html','utf8');
const HEADER=MOD.match(/<a class="skip"[\s\S]*?<main id="main">/)[0];
const FOOTER=MOD.match(/<footer>[\s\S]*?<\/body>/)[0];
const FAV=MOD.match(/<link rel="icon"[^>]*>/)[0];
const CARTE='<div class="fiche-liens rise"><a href="../carte.html#lieu=g-L1610">Vapid Dealership</a><a href="../carte.html#lieu=g-L2375">Rideout Customs</a><a href="../carte.html#lieu=g-L590">Ambrosia Raceway Park</a></div>';
const NOTE=MOD.match(/<div class="note-box rise">[\s\S]*?<\/div>/)[0];
const V_NOTE=[
 "Les inspirations réelles sont des rapprochements établis à partir des visuels officiels, pas des informations communiquées par Rockstar. Aucune donnée issue de fuites n'est utilisée ici.",
 "Ce que vous lisez ici vient des visuels publiés par Rockstar, jamais d'une annonce du studio. Rien de ce qui a filtré par des fuites n'entre dans cette base.",
 "Chaque modèle réel cité est une déduction tirée des images officielles. Le studio ne confirme rien, et nous n'exploitons aucun contenu volé.",
 "Nos identifications reposent uniquement sur ce que Rockstar a diffusé publiquement. Les fuites, quelles qu'elles soient, restent hors de cette base.",
 "Les modèles réels indiqués sont le fruit d'une comparaison avec les visuels officiels. Rien ici ne provient d'un code ou d'une vidéo dérobés.",
 "Tout ce qui figure sur cette fiche a été relevé dans les supports publiés par Rockstar. Aucun élément ne vient des fuites de 2022 ou de 2026."];
const note=v=>NOTE.replace("Les inspirations réelles sont des rapprochements établis à partir des visuels officiels, pas des informations communiquées par Rockstar. Aucune donnée issue de fuites n'est utilisée ici.",
  pioche(v.id,'note',V_NOTE));
const artH=v=>art(v).replace(/style="height:\d+px"/,'style="height:120px"');

function fiche(v,i){
 const cat=CATL[v.cat],mod=v.insp||v.fam,st=ST[v.st],nom=nomC(v);
 const prev=V[(i-1+V.length)%V.length],next=V[(i+1)%V.length];
 const vois=V.filter(x=>x.cat===v.cat&&x.id!==v.id).slice(0,6);
 const ed=v.edition==='Pre-Order'?'Bonus de précommande':v.edition?'Exclusif à l\u2019édition Ultimate':null;
 const lede=nom+' dans GTA VI : '+cat.toLowerCase()+(mod?'. Inspiration : '+mod:'')+'. '+st.d;
 /* meta description : les premières phrases du texte de la fiche (160 caractères max), sinon le lede générique */
 const description=(()=>{const ph=(v.txt||'').split(/(?<=[.!?])\s+/);let d=nom+' dans GTA VI.';let n=0;for(const q of ph){if((d+' '+q).length>165)break;d=d+' '+q;n++;}return n?d:lede;})();
 const available=(v.vues||[]).filter(view=>fs.existsSync('img/vehicules/'+v.id+'-'+view+'.jpg'));
 const meds=medList(v);
 const img=available.length>0, vues=img?available.join(','):'';
 const tags=['<span class="chip live">'+st.c+'</span>']
  .concat(ed?['<span class="chip">'+ed+'</span>']:[])
  .concat((img||meds.length)?['<span class="chip">Images officielles</span>']:[])
  .concat(v.slot?['<span class="chip">'+SLOT[v.slot]+'</span>']:[]).join('\n          ');
 const panneau=v.reel?`
<section class="shell reveal" id="modele-reel">
  <h2 class="sec-h">Le modèle réel</h2>
  <p class="fiche-txt rise">Le rapprochement retenu pour ce véhicule est <strong>${esc(v.insp||v.fam)}</strong>. ${esc(pioche(v.id,'insp',V_INSP))}</p>
  <div class="fiche-liens rise"><a id="reel-bt" href="${esc(v.reel)}" target="_blank" rel="noopener nofollow">Voir ${esc(v.reelNom)} en photo</a><a href="https://fr.wikipedia.org/w/index.php?search=${encodeURIComponent(v.reelNom)}" target="_blank" rel="noopener nofollow">Fiche encyclopédique</a>${v.slot?'<a href="../vehicules.html#slot='+v.slot+'">Autres modèles '+SLOT[v.slot].replace('Modèle ','')+'s</a>':''}</div>
</section>`:'';
 return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(nom)} — GTA VI | Leonidakit</title>
<meta name="description" content="${esc(description)}">
<meta property="og:title" content="${esc(nom)} — GTA VI | Leonidakit">
<meta property="og:description" content="${esc(description)}">
<meta property="og:type" content="website">
<meta property="og:locale" content="fr_FR">${meds.length?`
<meta property="og:image" content="https://www.leonidakit.com${(meds[0].variants[1]||meds[0].variants[0]).src}">
<meta name="twitter:card" content="summary_large_image">`:img?`
<meta property="og:image" content="https://www.leonidakit.com/img/vehicules/${v.id}-${available[0]}.jpg">
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
        <div class="fiche-liens"><button type="button" class="own-bt" id="own-bt" data-id="${v.id}"><span class="ck"></span><span>Ajouter à mon garage</span></button><a href="../comparateur.html?type=vehicules&amp;ids=${v.id}">Comparer</a>${v.reel?'<a href="#modele-reel">Le modèle réel</a>':''}${v.perso?'<a href="../personnages/'+v.perso+'.html">Véhicule de '+esc(PERSO_NOM[v.perso]||v.perso)+'</a>':''}</div>
      </div>
      <div class="fhero-art fhero-art--gal">
        <div class="gal" data-base="../img/vehicules/${v.id}" data-vues="${vues}" data-nom="${esc(nom)}" data-vide="${img?0:1}"${meds.length?` data-medias="${medAttr(v)}"`:''}
             data-art="${esc(artH(v))}">${meds.length?'<div class="gal-track"><div class="gal-item"><img src="'+meds[0].variants[0].src+'" srcset="'+medSrcset(meds[0])+'" sizes="(max-width:700px) 100vw, 520px" width="'+meds[0].variants[0].w+'" height="'+meds[0].variants[0].h+'"'+(meds[0].variants[0].h>meds[0].variants[0].w?' class="gal-portrait"':'')+' alt="'+esc(medAlt(v,meds[0]))+'" fetchpriority="high" decoding="async"><span class="gal-lbl">'+esc(meds[0].titre)+'</span></div></div>':''}</div>
        <p class="gal-note">${meds.length?CREDIT_RS:img?esc(v.credit||'Captures officielles de Rockstar Games.'):esc(pioche(v.id,'img',V_SANSIMG))}</p>
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
        <tr><th scope="row">Modèle</th><td>${esc(v.nom)}${v.alias?' <span class="unknown">(anciennement '+esc(v.alias)+')</span>':''}</td></tr>
        <tr><th scope="row">Constructeur</th><td>${esc(v.marque||'Non identifié')}</td></tr>
        <tr><th scope="row">Statut</th><td>${st.l}</td></tr>
        <tr><th scope="row">Catégorie</th><td><a href="../vehicules.html#cat=${v.cat}">${esc(cat)}</a></td></tr>
        <tr><th scope="row">Inspiration réelle</th><td>${mod?esc(mod)+' <span class="unknown">(rapprochement communautaire)</span>':'<span class="unknown">Non identifiée</span>'}</td></tr>${v.slot?`
        <tr><th scope="row">Origine du modèle</th><td><a href="../vehicules.html#slot=${v.slot}">${SLOT[v.slot]}</a></td></tr>`:''}${ed?`
        <tr><th scope="row">Disponibilité</th><td><a href="../vehicules-rares.html">${ed}</a></td></tr>`:''}
        <tr><th scope="row">Source</th><td>${esc(v.src||'Rapprochement de la communauté')}</td></tr>
      </tbody>
    </table>
  </div>
  <div class="fiche-col reveal">
    <h2 class="sec-h">Ce qui arrive avec le jeu</h2>${pend(v)}
    <div class="pending rise"><div class="pending-top"><h3>Personnalisation</h3><span class="pending-tag">À venir</span></div><p>Peintures, jantes, vitres teintées, pare-chocs, ailerons et intérieur : le prix de chaque option et le niveau requis pour la débloquer, tels qu'affichés chez Rideout Customs.</p><div class="pending-bars" aria-hidden="true"><span></span><span></span><span></span></div></div></div>
</section>
<section class="shell reveal" id="carte">
  <h2 class="sec-h">Sur la carte de Leonida</h2>
  <p class="fiche-txt rise">${esc(pioche(v.id,'carte',V_CARTE))}</p>
  ${CARTE}
</section>
<section class="shell">
  ${note(v)}
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
/* redirections : anciens identifiants conservés pour ne pas casser l'indexation */
let REDIR={};
REDIR=JSON.parse(fs.readFileSync('outils/redirections.json','utf8')); 
delete REDIR._commentaire;
const LEGACY=JSON.parse(fs.readFileSync('outils/legacy-pages.json','utf8'));
const garder=new Set(V.map(v=>v.id+'.html'));
Object.keys(REDIR).forEach(k=>garder.add(k+'.html'));
try{ const R0=JSON.parse(fs.readFileSync('outils/retraits.json','utf8'));
     Object.keys(R0).forEach(k=>{ if(k!=='_commentaire') garder.add(k+'.html'); }); }catch(e){}
fs.readdirSync('vehicules').forEach(f=>{ if(f.endsWith('.html')&&!garder.has(f)&&!LEGACY.includes(f)) throw new Error('Fiche orpheline à examiner : '+f); });
V.forEach((v,i)=>fs.writeFileSync('vehicules/'+v.id+'.html',fiche(v,i)));
Object.entries(REDIR).forEach(([ancien,cible])=>{
  const v=V.find(x=>x.id===cible); if(!v)throw new Error('Cible de redirection absente : '+cible);
  const url='/vehicules/'+cible+'.html';
  fs.writeFileSync('vehicules/'+ancien+'.html',
`<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(nomC(v))} — GTA VI | Leonidakit</title>
<link rel="canonical" href="https://www.leonidakit.com${url}">
<meta name="robots" content="noindex, follow">
<meta http-equiv="refresh" content="0; url=${url}">
</head>
<body>
<p>Cette page a été remplacée. <a href="${url}">Voir la fiche ${esc(nomC(v))}</a>.</p>
</body>
</html>
`);
});
console.log('redirections     : '+Object.keys(REDIR).length);

/* retraits : fiches sorties de la base, conservées en page d'explication */
let RETR={};
try{ RETR=JSON.parse(fs.readFileSync('outils/retraits.json','utf8')); }catch(e){}
delete RETR._commentaire;
Object.entries(RETR).forEach(([id,r])=>{
  fs.writeFileSync('vehicules/'+id+'.html',
`<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Fiche retirée | Leonidakit</title>
<link rel="canonical" href="https://www.leonidakit.com/vehicules.html">
<meta name="robots" content="noindex, follow">
<meta name="description" content="Cette fiche a été retirée de la base Leonidakit.">
</head>
<body>
<h1>${esc(r.nom)}</h1>
<p>Cette fiche a été retirée de la base. ${esc(r.motif.replace(/GTA Base ne la donne plus que dans la fuite de septembre 2022\./g,'La source conservée dans notre historique ne satisfait plus les critères de cette base.'))}</p>
<p>Leonidakit n'utilise aucune donnée issue d'une fuite. <a href="/vehicules.html">Revenir à la liste des véhicules</a>.</p>
</body>
</html>
`);
});
console.log('retraits         : '+Object.keys(RETR).length);

/* index de recherche */
global.window={}; eval(fs.readFileSync('search-index.js','utf8'));
let IDX=window.LK_INDEX.filter(e=>e.u.indexOf('/vehicules/')!==0);
V.forEach(v=>IDX.push({l:nomC(v),k:'Véhicule',u:'/vehicules/'+v.id+'.html',s:v.search}));
fs.writeFileSync('search-index.js','/* Index de recherche, généré automatiquement. Ne pas éditer à la main. */\nwindow.LK_INDEX = '+JSON.stringify(IDX)+';\n');

console.log('fiches générées :',V.length);
console.log('index           :',IDX.length,'entrées');
require('./sync-site.cjs');
