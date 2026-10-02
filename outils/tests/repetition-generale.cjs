#!/usr/bin/env node
'use strict';
/* v7.59 (check ultime, CALC-14/15) — répétition générale « le jour où Rockstar publie ».
   Sur une COPIE temporaire du site (jamais sur le dossier livré), on écrit des valeurs FICTIVES avec le schéma unique
   { value, status, source, verifiedAt, unit } : un prix de véhicule (outils/v-corrige.json), un prix d'arme (armes-data.js),
   un prix d'entreprise avec purchasable:true (outils/editorial.json) et une activité chiffrée (calculateurs-activites.js).
   Puis : node outils/regenerer.cjs dans la copie, et l'on vérifie que chaque surface reflète la donnée sans rien d'autre à
   toucher : fiche (puce, tableau, fiche documentaire, encart calculateur), hubs et page Achats, phrases d'absence
   (calculateurs.html, index.html, FAQ JSON-LD), Mes achats (Simple et Expert : prix de référence, provenance, source, date),
   Comparer, Classer, Ça vaut le coup ?, Mes activités / Mon temps de jeu, carnets et export, lien de partage, Léo.
   On vérifie aussi qu'une valeur mal formée (prix « officiel » sans source) ARRÊTE la régénération.
   Enfin, preuve d'absence de trace : empreinte du dossier réel avant/après identique, aucun marqueur fictif dans le dossier réel.
   Usage : NODE_PATH=<deps> node outils/tests/repetition-generale.cjs [--garder] [--rapport <fichier.md>]
   Code de sortie 1 si une vérification échoue. Aucune valeur de cet essai n'est une donnée de GTA VI. */
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..');
const args=process.argv.slice(2),keep=args.includes('--garder'),rapportAt=args.includes('--rapport')?args[args.indexOf('--rapport')+1]:null;
const MARK='REPETITION-GENERALE-FICTIF';
const SRC='https://www.rockstargames.com/'+MARK.toLowerCase();  /* lien fictif : n'existe pas, sert de marqueur */
const DATE='2026-11-20';
const FICTIF={vehicle:{id:'albany-emperor',price:35000},weapon:{id:'girardi-es9',price:1250},business:{id:'rideout-customs',price:2500000},catalogue:{id:'sprunk',price:3},
 activity:{id:'convoyage-repetition',name:'Convoyage (répétition générale)',reward:18000,cost:1500,duration:20,prep:5,cooldown:10,share:100,investment:0,players:1,beginner:true,status:'official',source:SRC,verifiedAt:DATE}};
const checks=[];let failed=0;
const check=(label,ok,detail)=>{checks.push({label,ok:!!ok,detail:detail||''});if(!ok)failed++;console.log((ok?'  ok   ':'  ÉCHEC ')+label+(detail&&!ok?' — '+detail:''));};
const sha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const SKIP=new Set(['.git','node_modules','photos','.cache','coverage']);
function listFiles(dir,base=dir,out=[]){for(const e of fs.readdirSync(dir,{withFileTypes:true})){if(SKIP.has(e.name))continue;const p=path.join(dir,e.name);if(e.isDirectory())listFiles(p,base,out);else if(e.isFile())out.push(path.relative(base,p));}return out.sort();}
function fingerprint(dir){const h=crypto.createHash('sha256');for(const f of listFiles(dir)){h.update(f+'\0'+sha(path.join(dir,f))+'\n');}return h.digest('hex');}
function copySite(){const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'leonidakit-repetition-'));
 for(const e of fs.readdirSync(root,{withFileTypes:true})){if(SKIP.has(e.name)&&e.name!=='photos')continue;const s=path.join(root,e.name),d=path.join(tmp,e.name);if(e.name==='photos'){try{fs.symlinkSync(s,d,'dir');}catch{fs.cpSync(s,d,{recursive:true});}continue;}fs.cpSync(s,d,{recursive:true});}
 return tmp;}
const strip=h=>h.replace(/<[^>]+>/g,' ').replace(/&nbsp;| /g,' ').replace(/&#x27;|&#39;/g,'’').replace(/&amp;/g,'&').replace(/\s+/g,' ');
const norm=s=>String(s).replace(/ /g,' ').replace(/ /g,' ');
function inject(T){
 /* véhicule : outils/v-corrige.json (source de vehicules-data.js) */
 const vj=path.join(T,'outils/v-corrige.json');const V=JSON.parse(fs.readFileSync(vj,'utf8'));const v=V.find(x=>x.id===FICTIF.vehicle.id);if(!v)throw Error('véhicule absent');
 v.price={value:FICTIF.vehicle.price,status:'official',source:SRC,verifiedAt:DATE,unit:'$'};fs.writeFileSync(vj,JSON.stringify(V));
 /* arme : armes-data.js (une ligne par arme) */
 const aj=path.join(T,'armes-data.js');let A=fs.readFileSync(aj,'utf8');const re=new RegExp('^\\{"id":"'+FICTIF.weapon.id+'",','m');if(!re.test(A))throw Error('arme absente');
 A=A.replace(re,'{"id":"'+FICTIF.weapon.id+'","price":{"value":'+FICTIF.weapon.price+',"status":"official","source":"'+SRC+'","verifiedAt":"'+DATE+'","unit":"$"},');fs.writeFileSync(aj,A);
 /* entreprise : outils/editorial.json (purchasable + price) */
 const ej=path.join(T,'outils/editorial.json');const E=JSON.parse(fs.readFileSync(ej,'utf8'));const b=E.businesses.find(x=>x.id===FICTIF.business.id);if(!b)throw Error('entreprise absente');
 b.purchasable=true;b.price={value:FICTIF.business.price,status:'official',source:SRC,verifiedAt:DATE,unit:'$'};fs.writeFileSync(ej,JSON.stringify(E,null,1));
 /* ligne de liste : outils/catalogues/consommables.json (prix_gta6) */
 const kj=path.join(T,'outils/catalogues/consommables.json');const K=JSON.parse(fs.readFileSync(kj,'utf8'));const sp=K.items.find(x=>x.id===FICTIF.catalogue.id);if(!sp)throw Error('consommable absent');
 sp.prix_gta6={valeur:FICTIF.catalogue.price,statut:'officiel',source:SRC,verifiedAt:DATE};fs.writeFileSync(kj,JSON.stringify(K,null,2)+'\n');
 /* activité : calculateurs-activites.js */
 const cj=path.join(T,'calculateurs-activites.js');let C=fs.readFileSync(cj,'utf8');if(!/window\.LK_ACTIVITIES = \[\];/.test(C))throw Error('activités : forme inattendue');
 C=C.replace('window.LK_ACTIVITIES = [];','window.LK_ACTIVITIES = ['+JSON.stringify(FICTIF.activity)+'];');fs.writeFileSync(cj,C);}
function regenerer(T,label){const t0=Date.now();try{execFileSync(process.execPath,[path.join(T,'outils/regenerer.cjs')],{cwd:T,stdio:['ignore','pipe','pipe'],env:{...process.env,SITE_ROOT:T},maxBuffer:64*1024*1024});return {ok:true,ms:Date.now()-t0};}catch(e){const err=String(e.stderr||e.stdout||e.message);const line=(err.match(/Error: [^\n]+/)||[err.slice(-300)])[0];return {ok:false,ms:Date.now()-t0,err:line.slice(0,600),full:err.slice(-3000)};}}
async function main(){
 console.log('Répétition générale — copie temporaire du site, valeurs FICTIVES, dossier réel intouché.');
 const before=fingerprint(root);
 const T=copySite();console.log('Copie : '+T);
 try{
  inject(T);
  /* 1. une valeur mal formée arrête la régénération */
  {const ej=path.join(T,'outils/editorial.json');const E=JSON.parse(fs.readFileSync(ej,'utf8'));const b=E.businesses.find(x=>x.id===FICTIF.business.id);const good=b.price;b.price={value:FICTIF.business.price,status:'official'};fs.writeFileSync(ej,JSON.stringify(E,null,1));
   const r=regenerer(T,'mal formé');check('Garde-fou : un prix « officiel » sans source ni date arrête node outils/regenerer.cjs',!r.ok&&/exige une source/.test(r.full||''),r.ok?'la régénération a accepté la valeur':(r.err||''));
   b.price=good;fs.writeFileSync(ej,JSON.stringify(E,null,1));}
  {const kj=path.join(T,'outils/catalogues/consommables.json');const K=JSON.parse(fs.readFileSync(kj,'utf8'));const sp=K.items.find(x=>x.id===FICTIF.catalogue.id);const good=sp.prix_gta6;sp.prix_gta6={valeur:FICTIF.catalogue.price,statut:'conf'};fs.writeFileSync(kj,JSON.stringify(K,null,2)+'\n');
   const r=regenerer(T,'liste mal formée');check('Garde-fou (listes) : un prix GTA VI écrit avec le statut « conf », sans source ni date, arrête la régénération',!r.ok&&/prix_gta6/.test(r.full||''),r.ok?'accepté':(r.err||''));
   sp.prix_gta6=good;fs.writeFileSync(kj,JSON.stringify(K,null,2)+'\n');}
  /* 2. régénération avec les valeurs fictives bien formées */
  const r=regenerer(T,'fictif');check('node outils/regenerer.cjs passe avec les valeurs fictives ('+Math.round(r.ms/1000)+' s)',r.ok,r.err);
  if(!r.ok)throw Error('régénération impossible');
  const read=f=>fs.readFileSync(path.join(T,f),'utf8');
  /* 3. état lu par donnees-publiees */
  const DP=require(path.join(T,'outils/donnees-publiees.cjs'));const e=DP.etat(T);
  check('donnees-publiees : 3 prix publiés (véhicule, arme, entreprise), 3 officiels, 1 activité complète, 1 prix de liste (consommables)',e.prix.connus===3&&e.prix.officiels===3&&e.activites.completes===1&&e.errors.length===0&&e.catalogues.consommables.connus===1,JSON.stringify({connus:e.prix.connus,officiels:e.prix.officiels,act:e.activites.completes,cat:e.catalogues.consommables,err:e.errors}));
  /* 4. fiches */
  const fv=read('vehicules/'+FICTIF.vehicle.id+'.html');
  check('Fiche véhicule : puce « Prix publié : 35 000 $ · Officiel »',/chip chip-prix[^>]*>Prix publié[  ]: 35[  ]000[  ]\$ · Officiel</.test(norm(fv).replace(/ /g,' ')),'');
  check('Fiche véhicule : ligne « Prix en jeu » avec source et date',/Prix en jeu<\/th><td>Prix publié[^<]*35[  ]000[^<]*Officiel[^<]*source[^<]*repetition-generale-fictif[^<]*vérifié le 20 novembre 2026/.test(norm(fv)),'');
  check('Fiche véhicule : bouton du garage porte data-prix="35000" data-prix-statut="official"',/id="own-bt" data-id="albany-emperor" data-prix="35000" data-prix-statut="official"/.test(fv),'');
  check('Fiche véhicule : fiche documentaire « Prix 35 000 $ · Officiel · Source … · vérifié le 20 novembre 2026 »',/<dt>Prix<\/dt><dd><span class="doc-v">35[  ]000[  ]\$<\/span><span class="doc-st">Officiel<\/span><small class="doc-ctx doc-prov">Source[  ]: <a href="https:\/\/www\.rockstargames\.com\/repetition-generale-fictif"[^>]*>[^<]*<\/a> · vérifié le 20 novembre 2026<\/small>/.test(norm(fv)),'');
  const fa=read('armes/'+FICTIF.weapon.id+'.html');
  check('Fiche arme : puce de prix, ligne « Prix en jeu », data-prix, fiche documentaire',/chip chip-prix/.test(fa)&&/Prix en jeu/.test(fa)&&/data-prix="1250" data-prix-statut="official"/.test(fa)&&/<dt>Prix<\/dt><dd><span class="doc-v">1[  ]250[  ]\$<\/span><span class="doc-st">Officiel<\/span>/.test(norm(fa)),'');
  const fb=read('entreprises/'+FICTIF.business.id+'.html');
  check('Fiche entreprise : encart calculateur « Prix publié : 2 500 000 $ · Officiel · source … · vérifié le … » (data-prix posé)',/<p data-prix="2500000" data-prix-statut="official">Prix publié[  ]: 2[  ]500[  ]000[  ]\$ · Officiel · source[  ]: [^<]*vérifié le 20 novembre 2026\. Le calculateur le propose comme prix de référence/.test(norm(fb)),'');
  /* 5. phrases d'absence, FAQ, hubs, Achats, Tuto */
  const calc=read('calculateurs.html'),idx=read('index.html');
  check('calculateurs.html : « Dès que les vrais prix… » devient « 3 prix publiés déjà dans le catalogue… »',/data-lk-donnees="bientot">3 prix publiés déjà dans le catalogue/.test(norm(calc)),'');
  check('calculateurs.html : phrase du tableau des activités mise à jour (« 1 activité a déjà un gain et une durée relevés »)',/data-lk-donnees="activitesTable">1 activité a déjà un gain et une durée relevés/.test(norm(calc)),'');
  check('calculateurs.html : réponse FAQ « En partie. Le site connaît 3 prix publiés et 1 activité chiffrée… »',/data-lk-donnees="faqExemples">En partie\. Le site connaît 3 prix publiés et 1 activité chiffrée/.test(norm(calc)),'');
  {const m=calc.match(/<script type="application\/ld\+json" data-lk="faq">([\s\S]*?)<\/script>/);const ld=m?JSON.parse(m[1]):null;check('calculateurs.html : le JSON-LD FAQ reflète la nouvelle réponse',!!ld&&ld.mainEntity.some(q=>/En partie\. Le site connaît 3 prix publiés/.test(norm(q.acceptedAnswer.text))),'');}
  check('index.html : « Les vrais prix du jeu ne sont pas encore connus » devient « 3 prix du jeu sont déjà connus… »',/data-lk-donnees="prixMini">3 prix du jeu sont déjà connus/.test(norm(idx)),'');
  check('bateaux.html (encart, type véhicule) : « 1 prix publié sur le site, avec leur source… » ; demeures.html (aucun prix de demeure) garde « Aucun prix n’est publié »',/1 prix publié sur le site/.test(norm(read('bateaux.html')))&&/Aucun prix n’est publié/.test(norm(read('demeures.html'))),'');
  const ach=read('achats.html');
  check('achats.html : note d’introduction « 3 prix publiés sur … fiches » ; carte Armurerie « 1 prix publié avec source. » ; statut Véhicules « 1 prix publié avec source » ; FAQ « Pourquoi il n’y a aucun prix ? » recalculée',/3 prix publiés sur \d+ fiches, chacun avec sa source/.test(norm(ach))&&/types de munitions\. 1 prix publié avec source\./.test(norm(ach))&&/fiches déjà en ligne, 1 prix publié avec source/.test(norm(ach))&&/3 prix publiés sur \d+ fiches, chacun avec sa source et sa date de vérification/.test(norm(ach)),norm(ach).match(/types de munitions\.[^<]{0,80}/)?.[0]||'');
  /* 5 bis. listes dépliables : la colonne GTA VI, la fiche complète, la FAQ et les phrases de la page suivent le prix publié */
  const nour=read('nourriture.html');
  check('nourriture.html : la ligne Sprunk affiche « 3 $ · Officiel » dans la colonne GTA VI, avec « vérifié le 20 novembre 2026 »',/3[  ]\$ · Officiel<\/span><small class="cat-buy">vérifié le 20 novembre 2026/.test(norm(nour)),(norm(nour).match(/cat-conf">[^<]{0,60}/g)||[]).slice(0,2).join(' | '));
  check('nourriture.html : la fiche complète du Sprunk porte « Prix 3 $ · Officiel · Source … · vérifié le … »',/<dt>Prix<\/dt><dd><span class="doc-v">3[  ]\$<\/span><span class="doc-st">Officiel<\/span><small class="doc-ctx doc-prov">Source[  ]: <a href="https:\/\/www\.rockstargames\.com\/repetition-generale-fictif"/.test(norm(nour)),'');
  check('nourriture.html : FAQ « 1 prix GTA VI publié dans la liste, avec source. » et page Achats « 1 prix GTA VI publié dans la liste » ; À propos « En partie. Le site connaît 4 prix GTA VI publiés »',/1 prix GTA VI publié dans la liste, avec source\. Repère de la série/.test(norm(nour))&&/1 prix GTA VI publié dans la liste, avec source\./.test(norm(ach))&&/En partie\. Le site connaît 4 prix GTA VI publiés/.test(norm(read('a-propos.html'))),'');
  check('nourriture.html : la section « À confirmer » dit « 1 prix GTA VI publié … 29 autres lignes »',/1 prix GTA VI publié dans la liste, avec source\. La colonne GTA VI reste « à confirmer » sur les 29 autres lignes\./.test(norm(nour)),'');
  /* 6. calculateur dans un navigateur simulé (jsdom), depuis la copie */
  const {load}=require('./runtime-helper.cjs');
  const stored=p=>JSON.parse(p.w.localStorage.getItem('lk-calculator-v1'));
  {const p=await load(T,'calculateurs.html?tool=purchase&type=vehicle&id='+FICTIF.vehicle.id+'&from=fiche&mode=expert',{});const d=p.d;const sel=d.getElementById('purchase-selection')||d.querySelector('#panel-purchase');
   const s=stored(p);const asset=s.assets.find(a=>a.itemId===FICTIF.vehicle.id);
   check('Mes achats (Expert, arrivée depuis la fiche) : le prix de référence 35 000 $ est pré-rempli, statut Officiel, source et date affichés',!!asset&&asset.price===35000&&/Prix (?:publié|de référence)[  ]: 35[  ]000[  ]\$/.test(norm(sel.textContent))&&/Officiel · source[  ]: https:\/\/www\.rockstargames\.com\/repetition-generale-fictif · vérifié le 20 novembre 2026/.test(norm(sel.textContent)),norm(sel.textContent).slice(0,300));
   check('Mes achats : bouton « Remettre le prix du site » présent, réponse calculée avec ce prix',!!d.querySelector('[data-b-price-reset]')&&/Il te manque|tu peux acheter|Oui|Pas encore/i.test(d.getElementById('purchase-results').textContent),'');
   check('Mes achats : la phrase du catalogue dit « 3 prix publiés sur N fiches (dont 3 officiels) »',/3 prix publiés sur \d+ fiches \(dont 3 officiels\)/.test(norm(d.querySelector('[data-lk-prix-etat]').textContent)),'');
   /* catalogue : la carte de l'Emperor affiche le prix et son statut */
   const q=d.getElementById('catalogue-search');q.value='Emperor';q.dispatchEvent(new p.w.Event('input',{bubbles:true}));p.flush();
   const card=[...d.querySelectorAll('.calc-product')].find(x=>x.dataset.product===FICTIF.vehicle.id);
   check('Catalogue : la carte Albany Emperor affiche « 35 000 $ · Officiel »',!!card&&/35[  ]000[  ]\$ · Officiel/.test(norm(card.textContent)),card?norm(card.textContent).slice(0,200):'carte absente');
   check('Aucune erreur JS',p.errors.length===0,p.errors.join(' | '));p.close();}
  {const p=await load(T,'calculateurs.html?tool=purchase&type=vehicle&id='+FICTIF.vehicle.id+'&from=fiche&mode=simple',{});const d=p.d;const t=norm(d.getElementById('purchase-selection').textContent);
   check('Mes achats (Simple) : « Prix de référence : 35 000 $ · Officiel », source et « vérifié le 20 novembre 2026 »',/Prix de référence[  ]: 35[  ]000[  ]\$ · Officiel/.test(t)&&/repetition-generale-fictif · vérifié le 20 novembre 2026/.test(t),t.slice(0,300));p.close();}
  {const p=await load(T,'calculateurs.html?tool=roi&type=business&id='+FICTIF.business.id+'&from=fiche&mode=expert',{});const d=p.d;const s=stored(p);const asset=s.assets.find(a=>a.itemId===FICTIF.business.id);
   check('Ça vaut le coup ? (entreprise) : prix 2 500 000 $ pré-rempli, provenance affichée, achat confirmé (pas de « non confirmé »)',!!asset&&asset.price===2500000&&/Prix publié[  ]: 2[  ]500[  ]000[  ]\$/.test(norm(d.getElementById('panel-roi').textContent))&&!/Achat dans GTA VI non confirmé/.test(d.getElementById('panel-roi').textContent),'');p.close();}
  {const p=await load(T,'calculateurs.html?tool=compare&type=vehicle&ids='+FICTIF.vehicle.id+',albany-primo&from=comparateur&mode=expert',{});const d=p.d;const t=norm(d.getElementById('panel-compare').textContent);
   check('Comparer (deux véhicules) : l’Emperor arrive avec 35 000 $ publié, la Primo reste « prix pas encore connu »',/Emperor[^]*?35[  ]000[  ]\$/.test(t)&&/Primo[^]*?prix pas encore connu/i.test(t),t.slice(0,300));p.close();}
  {const p=await load(T,'calculateurs.html?tool=compare&type=weapon&ids='+FICTIF.weapon.id+',klose-k17&from=comparateur&mode=expert',{});const d=p.d;const t=norm(d.getElementById('panel-compare').textContent);
   check('Comparer (deux armes) : le Girardi ES9 arrive avec 1 250 $ publié, le Klose K17 reste « prix pas encore connu »',/1[  ]250[  ]\$/.test(t)&&/prix pas encore connu/i.test(t),t.slice(0,300));p.close();}
  {const p=await load(T,'calculateurs.html?tool=order&type=vehicle&ids='+FICTIF.vehicle.id+'&from=fiche&mode=expert',{});const d=p.d;const t=norm(d.getElementById('panel-order').textContent);
   check('Classer mes achats : l’Emperor arrive avec son prix publié',/35[  ]000[  ]\$/.test(t),t.slice(0,200));p.close();}
  {const p=await load(T,'calculateurs.html?tool=activities&mode=expert',{});const d=p.d;const opt=[...d.getElementById('f-inverse-selected').options].find(o=>o.value===FICTIF.activity.id);
   check('Mes activités : l’activité du site est proposée avec l’étiquette « · du site »',!!opt&&/du site/.test(opt.textContent),opt?opt.textContent:'option absente');
   if(opt){const sel=d.getElementById('f-inverse-selected');sel.value=FICTIF.activity.id;sel.dispatchEvent(new p.w.Event('change',{bubbles:true}));p.flush();const t=norm(d.getElementById('inverse-results').textContent);
    check('Mes activités : le calcul utilise la récompense publiée (2 missions en 60 min : 2 × (18 000 − 1 500) = 33 000 $)',/33[  ]000[  ]\$/.test(t),t.slice(0,200));}
   check('Aucune erreur JS',p.errors.length===0,p.errors.join(' | '));p.close();}
  {const p=await load(T,'calculateurs.html?tool=session&mode=expert',{});const d=p.d;const t=norm(d.getElementById('panel-session').textContent);
   check('Mon temps de jeu : l’activité du site est éligible (nom affiché)',/Convoyage \(répétition générale\)/.test(t),t.slice(0,200));p.close();}
  /* carnets, export, lien de partage */
  {const p=await load(T,'calculateurs.html?tool=purchase&type=vehicle&id='+FICTIF.vehicle.id+'&from=fiche&mode=expert',{});const d=p.d;
   const save=d.getElementById('calc-save');let saved=false;
   if(save){save.dispatchEvent(new p.w.Event('click',{bubbles:true}));p.flush();const nb=p.w.localStorage.getItem('lk-calculator-notebooks-v3');saved=!!nb&&nb.includes('"'+FICTIF.vehicle.id+'"')&&nb.includes('35000');}
   check('Mes calculs : l’enregistrement garde l’achat avec son prix de référence',saved,save?'carnet sans la fiche':'bouton d’enregistrement introuvable');
   const S=p.w.LKCalcScenario||p.w.LKScenario||null;const st=stored(p);const json=JSON.stringify(st);
   check('Export : l’état exporté porte l’itemId et le prix 35000 (rien d’autre à faire côté joueur)',json.includes('"albany-emperor"')&&json.includes('35000'),'');
   const share=d.getElementById('calc-share');check('Lien de partage : le bouton existe et l’état est sérialisable',!!share&&json.length<24000,'');p.close();}
  /* 7. Léo (noyau régénéré dans la copie) */
  {const {JSDOM}=require('jsdom');const dom=new JSDOM('<!doctype html><html><body><main></main></body></html>',{runScripts:'outside-only',url:'https://www.leonidakit.com/index.html'});const w=dom.window;
   w.fetch=async url=>{const pth=String(url).replace(/^https:\/\/www\.leonidakit\.com/,'').replace(/\?.*$/,'');const file=path.join(T,pth.replace(/^\//,''));if(!fs.existsSync(file))return {ok:false,status:404,text:async()=>''};return {ok:true,status:200,text:async()=>fs.readFileSync(file,'utf8')};};
   for(const f of ['calculateurs-engine.js','leo-link.js','leo-nlp.js','leo-core.js'])w.eval(read(f));
   const data=JSON.parse(read('leo-index.json'));const core=w.LKLeoCore.create(data,{load:async(name,file)=>{const r=await w.fetch(file);if(!r.ok)throw Error('Morceau absent : '+file);return JSON.parse(await r.text());}});
   const now='2026-12-01T12:00:00Z';
   const a1=await core.ask('combien coûte l’Albany Emperor ?',{},{now});check('Léo : « combien coûte l’Albany Emperor ? » → prix publié 35 000 $ (Officiel · source · vérifié le 20 novembre 2026)',/35[  ]000[  ]\$ \(Officiel · source[  ]: https:\/\/www\.rockstargames\.com\/repetition-generale-fictif · vérifié le 20 novembre 2026\)/.test(norm(a1.text||'')),norm(a1.text||a1.kind));
   const a2=await core.ask('quel est le prix du Girardi ES9 ?',{},{now});check('Léo : « quel est le prix du Girardi ES9 ? » → 1 250 $ (Officiel) — « ES9 » n’est pas lu comme un montant',/1[  ]250[  ]\$ \(Officiel/.test(norm(a2.text||'')),norm(a2.text||a2.kind));
   const a3=await core.ask('combien coûte Rideout Customs ?',{},{now});check('Léo : prix de l’entreprise Rideout Customs → 2 500 000 $',/2[  ]500[  ]000[  ]\$/.test(norm(a3.text||'')),norm(a3.text||a3.kind));
   const a5=await core.ask('combien coûte un Sprunk ?',{},{now});check('Léo : « combien coûte un Sprunk ? » (ligne de liste) → 3 $ (Officiel · source · vérifié le …) + repère de la série',/3[  ]\$ \(Officiel · source[  ]: https:\/\/www\.rockstargames\.com\/repetition-generale-fictif · vérifié le 20 novembre 2026\)/.test(norm(a5.text||'')),norm(a5.text||a5.kind));
   const a4=await core.ask('Rockstar a publié des prix ?',{},{now});check('Léo : la question générale sur les prix n’affirme plus « aucun prix » tel quel (sujet réécrit ou textKnown)',!/n’a publié aucun prix en jeu[  ]: tant que c’est le cas/.test(norm(a4.text||'')),norm(a4.text||'').slice(0,160));}
  /* 8. Léo : la génération s'arrête si un sujet affirme encore une absence contredite (sans textKnown) */
  {const kj=path.join(T,'outils/leo-knowledge.json');const K=JSON.parse(fs.readFileSync(kj,'utf8'));const t=K.topics.find(x=>x.id==='msg-prix-inconnu');const saved=t.textKnown;delete t.textKnown;fs.writeFileSync(kj,JSON.stringify(K,null,1)+'\n');
   let out='';try{execFileSync(process.execPath,[path.join(T,'outils/gen-leo.cjs'),'--check'],{cwd:T,stdio:['ignore','pipe','pipe'],env:process.env});}catch(err){out=String(err.stderr||'');}
   check('Garde-fou Léo : un sujet « absence » sans textKnown arrête gen-leo.cjs en nommant le sujet',/msg-prix-inconnu/.test(out)&&/affirment une absence/.test(out),out.slice(-300));
   t.textKnown=saved;fs.writeFileSync(kj,JSON.stringify(K,null,1)+'\n');}
 }finally{
  /* 9. preuve d'absence de trace dans le dossier réel */
  const after=fingerprint(root);check('Dossier réel : empreinte identique avant/après (aucun fichier touché)',before===after,'');
  let traces=[];for(const f of listFiles(root)){if(/\.(png|jpg|jpeg|webp|svg|ico|woff2?|zip)$/i.test(f))continue;if(f==='outils/tests/repetition-generale.cjs'||f==='outils/QUAND-ROCKSTAR-PUBLIE.md'||/^outils\/(PREUVES|CHANGEMENTS|MATRICE)/.test(f))continue;const c=fs.readFileSync(path.join(root,f),'utf8');if(c.includes(MARK.toLowerCase())||c.includes('Convoyage (répétition générale)'))traces.push(f);}
  check('Dossier réel : aucun marqueur fictif (lien, activité) nulle part',traces.length===0,traces.join(', '));
  if(keep)console.log('Copie gardée : '+T);else fs.rmSync(T,{recursive:true,force:true});
 }
 const ok=checks.filter(c=>c.ok).length;console.log('\n'+ok+'/'+checks.length+' vérifications conformes'+(failed?' — '+failed+' en échec':''));
 if(rapportAt){const md=['# Répétition générale — « le jour où Rockstar publie »','','Copie temporaire du site, valeurs FICTIVES (jamais des données de GTA VI) : véhicule '+FICTIF.vehicle.id+' '+FICTIF.vehicle.price+' $, arme '+FICTIF.weapon.id+' '+FICTIF.weapon.price+' $, entreprise '+FICTIF.business.id+' '+FICTIF.business.price+' $ (purchasable), activité « '+FICTIF.activity.name+' » ('+FICTIF.activity.reward+' $ / '+FICTIF.activity.duration+' min). Source fictive : '+SRC+', vérifiée le '+DATE+'.','','Exécuté le '+new Date().toISOString().slice(0,10)+' : **'+ok+'/'+checks.length+' conformes**.','','| État | Vérification | Détail |','|---|---|---|',...checks.map(c=>'| '+(c.ok?'✅':'❌')+' | '+c.label.replace(/\|/g,'\\|')+' | '+(c.ok?'':c.detail.replace(/\|/g,'\\|').slice(0,200))+' |'),''].join('\n');fs.mkdirSync(path.dirname(path.resolve(rapportAt)),{recursive:true});fs.writeFileSync(path.resolve(rapportAt),md);console.log('Rapport : '+rapportAt);}
 process.exit(failed?1:0);}
main().catch(e=>{console.error(e);process.exit(1);});
