#!/usr/bin/env node
'use strict';
/* v7.59 (check ultime, CALC-13 à CALC-16) — l'état des données chiffrées de GTA VI, lu dans les sources du site.
   Une seule lecture, partagée par les générateurs (sync-site.cjs, gen.js, gen-armes.cjs, lore-gen.js, gen-tuto.cjs,
   gen-leo.cjs) : combien de prix et d'activités sont publiés, avec quel statut, et les phrases qui disent l'absence ou
   la présence de ces chiffres. Les textes qui affirment « Rockstar n'a publié aucun prix » viennent d'ici : ils changent
   d'eux-mêmes le jour où une source du site porte un prix ou une activité, et la génération refuse une valeur mal formée.

   Schéma d'une valeur chiffrée (outils/CALCULATEUR-V2.md, CALCULATEURS-DONNEES.md) :
     { value: 35000, status: 'officiel' | 'official' | 'verified' | 'estimated' | 'manual' | 'unverified' | 'unknown',
       source: 'URL ou référence précise', verifiedAt: 'AAAA-MM-JJ', unit: '$' }
   Où l'écrire : véhicule → outils/v-corrige.json (clé price) ; arme → armes-data.js (clé price) ; entreprise, demeure, planque
   → outils/editorial.json (clé price) ; activité → calculateurs-activites.js (window.LK_ACTIVITIES). Voir outils/QUAND-ROCKSTAR-PUBLIE.md.

   Usage : node outils/donnees-publiees.cjs  → affiche l'état ; code 1 si une valeur est mal formée. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const STATUS_LABEL={official:'Officiel',verified:'Mesuré et vérifié',estimated:'Estimation',manual:'Valeur personnelle',unverified:'Non confirmé',unknown:'Pas encore connu',observed:'Repéré',community:'Communautaire','source-listed':'Source indiquée'};
const TYPE_LABEL={vehicle:'véhicule',weapon:'arme',business:'entreprise',property:'demeure',hideout:'planque',place:'lieu',style:'style',customization:'personnalisation',consumable:'consommable',ammo:'munition',housing:'logement'};
const plural=(n,one,many)=>n+' '+(n>1?(many||one+'s'):one);
function siteData(r=root){const ctx={window:{}};vm.createContext(ctx);for(const f of ['vehicules-data.js','armes-data.js','acquisitions-data.js','calculateurs-catalogue.js','calculateurs-activites.js','calculateurs-data.js'])if(fs.existsSync(path.join(r,f)))vm.runInContext(fs.readFileSync(path.join(r,f),'utf8'),ctx);return ctx.window;}
/* Lit un prix dans une entrée source (véhicule, arme, fiche éditoriale) : la même logique que calculateurs-data.js, en Node, pour les générateurs. */
function prixDe(entry){if(!entry)return null;const raw=entry.price??entry.prix??entry.prixAchat??(entry.economy&&(entry.economy.price??entry.economy.prix));if(raw===null||raw===undefined)return null;const w=raw&&typeof raw==='object'?raw:{value:raw};
 const meta=Object.assign({},entry.economy&&entry.economy.fieldMeta&&entry.economy.fieldMeta.price,entry.economy&&entry.economy.priceMeta,entry.fieldMeta&&entry.fieldMeta.price,entry.priceMeta,w.meta);for(const k of ['status','source','verifiedAt','unit'])if(w[k]!==undefined)meta[k]=w[k];
 const value=typeof w.value==='number'&&Number.isFinite(w.value)&&w.value>=0?w.value:null;if(value===null)return null;
 const status=({officiel:'official',official:'official',verified:'verified',confirmed:'verified',estimated:'estimated',manual:'manual',hypothetical:'manual',unverified:'unverified',unknown:'unknown'})[meta.status]||'unverified';if(status==='unknown')return null; /* un chiffre marqué « inconnu » n'est pas une valeur */
 return {value,status,label:STATUS_LABEL[status]||'Non confirmé',source:typeof meta.source==='string'&&meta.source.trim()?meta.source.trim():null,verifiedAt:typeof meta.verifiedAt==='string'&&/^\d{4}-\d{2}-\d{2}/.test(meta.verifiedAt)?meta.verifiedAt.slice(0,10):null,unit:typeof meta.unit==='string'&&meta.unit.trim()?meta.unit.trim():'$'};}
const fmt=n=>new Intl.NumberFormat('fr-FR').format(n);
function texteDate(d){if(!d)return '';const [y,m,j]=d.split('-').map(Number);const M=['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];return (j===1?'1er':j)+' '+M[m-1]+' '+y;}
/* Phrase complète pour une fiche : « Prix publié : 35 000 $ · Officiel · source · vérifié le … ». */
function phrasePrix(p){if(!p)return null;return 'Prix publié : '+fmt(p.value)+' '+p.unit+' · '+p.label+(p.source?' · source : '+p.source:'')+(p.verifiedAt?' · vérifié le '+texteDate(p.verifiedAt):'');}
/* Vérifie une valeur publiée : un prix officiel ou vérifié exige une source et une date ; une unité connue ; un nombre fini. */
function verifierPrix(p,label){const errors=[];if(!p)return errors;if(!['official','verified','estimated','manual','unverified','unknown'].includes(p.status))errors.push(label+' : statut inconnu « '+p.status+' »');
 if(['official','verified'].includes(p.status)){if(!p.source)errors.push(label+' : un prix « '+p.label+' » exige une source (URL ou référence précise)');if(!p.verifiedAt)errors.push(label+' : un prix « '+p.label+' » exige une date de vérification verifiedAt (AAAA-MM-JJ)');}
 if(p.unit!=='$')errors.push(label+' : unité attendue « $ », trouvé « '+p.unit+' »');if(p.value>1e12)errors.push(label+' : prix au-dessus de 1 000 milliards');return errors;}
function verifierActivite(a,i){const errors=[],label='calculateurs-activites.js['+i+'] '+(a&&a.id||'?');if(!a||typeof a!=='object')return [label+' : entrée vide'];
 if(!/^[a-z0-9][a-z0-9-]*$/i.test(a.id||''))errors.push(label+' : identifiant manquant ou invalide (lettres, chiffres, tirets)');if(!a.name||typeof a.name!=='string')errors.push(label+' : nom manquant');
 const num=(k,max,positive)=>{const v=a[k];if(v===null||v===undefined)return;const n=v&&typeof v==='object'?v.value:v;if(typeof n!=='number'||!Number.isFinite(n)||n<0||n>max||(positive&&n<=0))errors.push(label+' : '+k+' doit être un nombre entre '+(positive?'1':'0')+' et '+max+' (ou null = inconnu)');};
 num('reward',1e12);num('cost',1e12);num('investment',1e12);num('duration',1e6,true);num('prep',1e6);num('cooldown',1e6);num('share',100);num('players',100);
 if(!['official','officiel','verified','estimated','unverified','unknown'].includes(a.status))errors.push(label+' : status attendu parmi official, verified, estimated, unverified, unknown');
 if(['official','officiel','verified'].includes(a.status)){if(!a.source)errors.push(label+' : une activité « '+a.status+' » exige une source');if(!a.verifiedAt||!/^\d{4}-\d{2}-\d{2}/.test(a.verifiedAt))errors.push(label+' : une activité « '+a.status+' » exige verifiedAt (AAAA-MM-JJ)');}
 const hasDuration=(a.duration&&typeof a.duration==='object'?a.duration.value:a.duration)>0,hasReward=typeof (a.reward&&typeof a.reward==='object'?a.reward.value:a.reward)==='number';if(!hasDuration||!hasReward)errors.push(label+' : reward et duration sont nécessaires pour que le calculateur s’en serve (null = l’activité est listée mais pas calculable)');
 return errors;}
/* Listes dépliables (outils/catalogues.cjs) : colonne « prix GTA VI » (prix_gta6.valeur) par famille. */
function cataloguesEtat(){try{const C=require('./catalogues.cjs');const d=C.load();const out={};for(const f of C.FAMILIES){const items=d.families[f].items||[];out[f]={total:items.length,connus:items.filter(it=>it.prix_gta6&&typeof it.prix_gta6.valeur==='number').length};}return out;}catch{return {};}}
function etat(r=root){const w=siteData(r),D=w.LKCalcData;const cat=D?D.catalogue():[],acts=D?D.activities():[];const raw=Array.isArray(w.LK_ACTIVITIES)?w.LK_ACTIVITIES:[];
 const errors=[];const prix=cat.filter(x=>x.price!==null).map(x=>({id:x.id,type:x.type,name:x.name,value:x.price,status:x.fieldMeta.price.status,source:x.fieldMeta.price.source,verifiedAt:x.fieldMeta.price.verifiedAt,unit:x.fieldMeta.price.unit||'$',label:STATUS_LABEL[x.fieldMeta.price.status]||'Non confirmé'}));
 prix.forEach(p=>errors.push(...verifierPrix(p,TYPE_LABEL[p.type]+' « '+p.name+' »')));raw.forEach((a,i)=>errors.push(...verifierActivite(a,i)));
 const parType={};cat.forEach(x=>{parType[x.type]=parType[x.type]||{total:0,connus:0,officiels:0};parType[x.type].total++;if(x.price!==null){parType[x.type].connus++;if(x.fieldMeta.price.status==='official')parType[x.type].officiels++;}});
 const completes=acts.filter(a=>typeof a.reward==='number'&&typeof a.duration==='number'&&a.duration>0),officielles=completes.filter(a=>a.status==='official'||a.status==='verified');
 return {catalogues:cataloguesEtat(),prix:{total:cat.length,connus:prix.length,officiels:prix.filter(p=>p.status==='official').length,parType,liste:prix},activites:{total:acts.length,completes:completes.length,officielles:officielles.length,liste:acts.map(a=>({id:a.id,name:a.name,status:a.status,source:a.source,verifiedAt:a.verifiedAt,reward:a.reward,duration:a.duration}))},errors};}
/* Les phrases qui disent l'état des chiffres : une absence reste explicite ; une présence est comptée, jamais arrondie. */
function phrases(e){const P=e.prix,A=e.activites,CT=e.catalogues||{};const types=Object.entries(P.parType).filter(([,v])=>v.connus).map(([t,v])=>plural(v.connus,TYPE_LABEL[t]||t));
 const typ=(types,absence,suite)=>{const n=types.reduce((a,t)=>a+((P.parType[t]||{}).connus||0),0);if(!n)return absence;return plural(n,'prix publié','prix publiés')+' sur le site, avec '+(n>1?'leur':'sa')+' source'+(suite?' ; '+suite:'.');};
 const fam=(families,absence,suite)=>{const n=families.reduce((a,f)=>a+((CT[f]||{}).connus||0),0),total=families.reduce((a,f)=>a+((CT[f]||{}).total||0),0);if(!n)return absence.replace('{N}',String(total));return plural(n,'prix GTA VI publié','prix GTA VI publiés')+' dans la liste, avec source'+(suite?'. '+suite.replace('{N}',String(total-n)):'.');};
 return {
  prix: P.connus===0?'Rockstar n’a publié aucun prix en jeu : les prix des fiches sont « pas encore connus » et c’est toi qui écris celui que tu imagines.':'Le site connaît '+plural(P.connus,'prix publié','prix publiés')+' ('+types.join(', ')+(P.officiels?' ; '+plural(P.officiels,'prix officiel','prix officiels')+'' : '')+') : le calculateur '+(P.connus>1?'les propose comme prix de référence, avec leur source':'le propose comme prix de référence, avec sa source')+'. Les autres fiches restent « pas encore connues » : tu écris le prix que tu imagines.',
  prixCourt: P.connus===0?'Les prix du jeu ne sont pas encore connus.':plural(P.connus,'prix publié','prix publiés')+' sur '+P.total+' fiches ; les autres restent à écrire.',
  prixMini: P.connus===0?'Les vrais prix du jeu ne sont pas encore connus.':plural(P.connus,'prix du jeu','prix du jeu')+(P.connus>1?' sont déjà connus':' est déjà connu')+' ; les autres restent à écrire.',
  activites: A.completes===0?'Rockstar n’a publié aucun gain ni aucune durée de mission : les activités du calculateur sont des exemples à remplacer par tes chiffres.':'Le site connaît '+plural(A.completes,'activité','activités')+' avec un gain et une durée publiés'+(A.officielles?' (dont '+plural(A.officielles,'activité officielle','activités officielles')+')':'')+' : « Mes activités » et « Mon temps de jeu » les proposent avec leur source. Les trois exemples restent des exemples.',
  faqExemples: P.connus===0&&A.completes===0?'Pas encore. GTA VI sort le 19 novembre 2026 et Rockstar n’a publié aucun prix ni aucun gain de mission. Les nombres déjà écrits dans les cases sont des exemples : remplace-les par les tiens. Dès que de vrais chiffres seront connus et vérifiés, ils seront ajoutés ici, avec leur source. On n’utilise jamais les chiffres de GTA V ou de GTA Online à la place.':'En partie. Le site connaît '+plural(P.connus,'prix publié','prix publiés')+' et '+plural(A.completes,'activité chiffrée','activités chiffrées')+', chacun avec son statut et sa source : le calculateur les propose comme références. Les nombres déjà écrits dans les cases restent des exemples à remplacer par les tiens. On n’utilise jamais les chiffres de GTA V ou de GTA Online à la place.',
  bientot: P.connus===0?'Dès que les vrais prix sont connus, on les ajoute ici.':plural(P.connus,'prix publié','prix publiés')+' déjà dans le catalogue ; les suivants seront ajoutés avec leur source.',
  /* phrases par type d'achat (hubs, FAQ des hubs, listes) : l'absence reste écrite tant qu'aucun prix de ce type n'est publié */
  prixMaisonsCommerces: typ(['property','business'],'Aucun prix de maison ou de commerce n’est publié.'),
  prixLogement: typ(['property'],'Aucun prix de logement n’existe ; le calculateur te laisse écrire le tien.','le calculateur le propose comme référence et te laisse écrire le tien pour les autres.'),
  prixPlanques: typ(['hideout'],'Aucun prix n’est publié.'),
  prixBateaux: typ(['vehicle'],'Aucune concession ni aucun prix n’est publié.','aucune concession n’est publiée.'),
  prixNourritureCourt: fam(['consommables'],'Rockstar n’a publié aucun prix.'),
  prixPersoCourtMin: fam(['perso-vehicules','perso-armes'],'aucun prix n’est publié.'),
  /* page À propos (FAQ « Les prix affichés sont-ils ceux de GTA VI ? ») */
  faqApropos: P.connus===0&&!Object.values(CT).some(x=>x.connus)?'Non. Rockstar n’a publié aucun prix. Ceux que tu vois viennent de GTA V ou GTA Online, marqués « repère de la série » ; dans le calculateur, ce sont tes chiffres.':'En partie. Le site connaît '+plural(P.connus+Object.values(CT).reduce((a,x)=>a+x.connus,0),'prix GTA VI publié','prix GTA VI publiés')+', chacun avec sa source ; tout autre chiffre vient de GTA V ou GTA Online, marqué « repère de la série », et dans le calculateur ce sont tes chiffres.',
  /* page Achats (FAQ « Pourquoi il n’y a aucun prix ? ») */
  prixAchats: P.connus===0?'Aucun prix séparé en jeu n’est vérifié dans le catalogue actuel. La sortie de GTA VI est annoncée le 19 novembre 2026. Dès qu’un prix sera connu et vérifié, il sera ajouté avec sa source. En attendant, le calculateur te laisse écrire le prix que tu imagines.':plural(P.connus,'prix publié','prix publiés')+' sur '+P.total+' fiches, chacun avec sa source et sa date de vérification ; les autres restent à vérifier. Le calculateur propose un prix publié comme référence et te laisse écrire le tien pour les autres.',
  /* listes dépliables : colonne « prix GTA VI » par famille (consommables ; coiffures, tatouages, tenues ; personnalisations) */
  prixNourriture: fam(['consommables'],'Aucun prix GTA VI publié.'),
  prixStyle: fam(['coiffures','tatouages','tenues'],'Aucun prix GTA VI.'),
  prixPerso: fam(['perso-vehicules','perso-armes'],'Aucun prix GTA VI publié.'),
  etatConsommables: fam(['consommables'],'Aucun prix GTA VI publié. La colonne GTA VI reste « à confirmer » sur les {N} lignes.','La colonne GTA VI reste « à confirmer » sur les {N} autres lignes.'),
  etatStyle: fam(['coiffures','tatouages','tenues'],'Aucun prix GTA VI publié. Les {N} lignes des trois listes gardent la colonne GTA VI « à confirmer ».','Les {N} autres lignes gardent la colonne GTA VI « à confirmer ».'),
  etatPerso: fam(['perso-vehicules','perso-armes'],'Aucun prix publié. Les {N} lignes des deux listes gardent la colonne GTA VI « à confirmer » ; les prix de GTA V et GTA Online sont dans la colonne repère.','Les {N} autres lignes gardent la colonne GTA VI « à confirmer » ; les prix de GTA V et GTA Online restent dans la colonne repère.'),
  limiteStyle: fam(['coiffures','tatouages','tenues'],'Aucun prix GTA VI n’est publié : chaque ligne porte son statut, et les prix de GTA V et GTA Online restent dans leur colonne de repère.','Chaque ligne porte son statut ; les prix de GTA V et GTA Online restent dans leur colonne de repère.'),
  activitesTable: A.completes===0?'Combien chacune rapporte, et en combien de temps ? Personne ne le sait avant la sortie du jeu. Ces chiffres seront ajoutés ligne par ligne avec de vrais relevés faits dans le jeu, jamais avec les chiffres de GTA V.':plural(A.completes,'activité','activités')+(A.completes>1?' ont':' a')+' déjà un gain et une durée relevés (voir « Mes activités », étiquette « du site ») ; les autres seront ajoutées ligne par ligne avec de vrais relevés, jamais avec les chiffres de GTA V.'
 };}
/* Un texte éditorial (JSON, HTML) peut porter {donnees:clé} : la phrase calculée prend la place du marqueur. Clé inconnue = erreur. */
function remplir(text,ph){if(typeof text!=='string'||!text.includes('{donnees:'))return text;return text.replace(/\{donnees:([a-zA-Z]+)\}/g,(m,k)=>{if(!(k in ph))throw new Error('Marqueur {donnees:'+k+'} inconnu (clés : '+Object.keys(ph).join(', ')+')');return ph[k];});}
module.exports={etat,phrases,remplir,absences,prixDe,phrasePrix,verifierPrix,verifierActivite,STATUS_LABEL,TYPE_LABEL,texteDate,fmt};
/* --absences : liste les phrases des SOURCES (éditorial JSON, scripts du site, générateurs) qui affirment qu'un chiffre n'est pas
   publié, avec leur état : « mécanique » (marqueur {donnees:…}, data-lk-donnees, sujet Léo « absence », calcul à l'exécution)
   ou « à relire » (texte figé : à relire le jour où la donnée existe). Les pages générées ne sont pas listées : elles suivent. */
const ABSENCE=/aucun prix|aucun gain|aucun revenu|aucun chiffre économique|prix[^.;]{0,40}?pas (?:encore )?(?:publié|connu)|n’a publié aucun prix|prix non publié|prix pas encore connu|prix (?:en jeu )?ne sont pas publiés/i;
function absences(r=root){const out=[];const files=[];const add=f=>{if(fs.existsSync(path.join(r,f)))files.push(f);};
 for(const f of fs.readdirSync(path.join(r,'outils'))){if(/\.(json|cjs|js)$/.test(f)&&!/^(leo-index-manifest|tuto|v-corrige|medias-officiels|armes-medias|acquisitions-index|modele-donnees)\.json$/.test(f)&&!/^(verifier|audit-|regenerer|final|images|croise|similarite|photos)/.test(f))add('outils/'+f);}
 if(fs.existsSync(path.join(r,'outils/catalogues')))for(const f of fs.readdirSync(path.join(r,'outils/catalogues')))if(f.endsWith('.json'))add('outils/catalogues/'+f);
 for(const f of fs.readdirSync(r))if(/^(calculateurs(?!-catalogue)[a-z-]*|fiches|leo-[a-z]+|common|app|acquisitions|achats-pile|comparateur|progression-core|suivi|carnets-[a-z]+)\.js$/.test(f))add(f);
 for(const f of ['calculateurs.html','index.html','tuto-source.html'])add(f);
 const GEN=/^(outils\/(gen|lore-gen|sync-site|site-shell|hubs-|fiche-doc|sections|redaction|carnets-source|catalogues|localisateur))/;
 /* sujets Léo marqués « absence » : leurs lignes de texte sont mécaniques (textKnown ou arrêt de gen-leo.cjs) */
 const leoAbs=new Set();{const f=path.join(r,'outils/leo-knowledge.json');if(fs.existsSync(f)){const lines=fs.readFileSync(f,'utf8').split('\n');let cur=null;lines.forEach((l,i)=>{const m=l.match(/^\s*"id": "([a-z0-9-]+)"/);if(m)cur={id:m[1],start:i};if(/^\s*"absence":/.test(l)&&cur)cur.abs=true;if(/^\s*\},?$/.test(l)&&cur){if(cur.abs)for(let k=cur.start;k<=i;k++)leoAbs.add(k+1);cur=null;}});}}
 for(const f of files){const lines=fs.readFileSync(path.join(r,f),'utf8').split('\n');lines.forEach((line,i)=>{if(!ABSENCE.test(line))return;if(/^\s*\/[\/*]|^\s*\*/.test(line)&&!f.endsWith('.json'))return;
  const mech=/\{donnees:|data-lk-donnees|"textKnown"|priceStateSentence|prixPhrase|entryText|prixLigne|prixPub|prixDe\(|phrasePrix|DP\.|\.price===null|\.price!==null|price===null|item\?\.price|a\.price===null|x\.price===null|dataset\.prix|STATUS_LABEL|PRICE_STATUS|priceProvenance|known\?|p\.connus|P\.connus|A\.completes|typ\(|fam\(|return n \? n \+|^"(?:price|unknownEntityPrice)": /.test(line.trim())||f==='outils/donnees-publiees.cjs'||(f==='outils/leo-knowledge.json'&&leoAbs.has(i+1));
  out.push({file:f,line:i+1,etat:mech?'mécanique':(GEN.test(f)?'générateur (texte figé) : à relire':'à relire'),texte:line.trim().replace(/\s+/g,' ').slice(0,220)});});}
 return out;}
if(require.main===module&&process.argv.includes('--absences')){const list=absences();const fixed=list.filter(x=>x.etat!=='mécanique');console.log('Phrases d’absence dans les sources : '+list.length+' (mécaniques : '+(list.length-fixed.length)+', à relire : '+fixed.length+')');for(const x of list)console.log((x.etat==='mécanique'?'  [mécanique] ':'  [à relire]  ')+x.file+':'+x.line+'  '+x.texte);process.exit(0);}
if(require.main===module){const e=etat();const p=phrases(e);console.log(JSON.stringify({prix:{total:e.prix.total,connus:e.prix.connus,officiels:e.prix.officiels,parType:e.prix.parType,liste:e.prix.liste},activites:e.activites,phrases:p},null,1));if(e.errors.length){console.error('Valeurs mal formées :\n- '+e.errors.join('\n- '));process.exit(1);}}
