#!/usr/bin/env node
'use strict';
/* Contrôles navigateur des carnets de progression (v7.51, lot 4) : pages carnets/<id>.html, tableau de bord de la page
   Progression, fiches, carte, calculateur. Chaque contrôle est compté ; le script ne s’arrête pas au premier échec.
   Usage : NODE_PATH=<dépendances>/node_modules node outils/tests/carnets-browser.cjs
   Variables : QA_OUT=<dossier hors dépôt> (captures et rapport), QA_CHROMIUM=<chemin d’un Chromium déjà installé>. */
const {chromium}=require('playwright');
const fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const root=path.resolve(process.env.SITE_ROOT||path.join(__dirname,'../..')),out=path.resolve(process.env.QA_OUT||path.join(require('node:os').tmpdir(),'leonidakit-carnets-qa'));fs.mkdirSync(out,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.svg':'image/svg+xml','.png':'image/png','.json':'application/json','.woff2':'font/woff2'};
const cfg=JSON.parse(fs.readFileSync(root+'/vercel.json')),headers=Object.fromEntries(cfg.headers.find(r=>r.source==='/(.*)').headers.map(h=>[h.key,h.value]));
const server=http.createServer((req,res)=>{let n=decodeURIComponent(new URL(req.url,'http://local').pathname);if(n==='/')n='/index.html';const file=path.join(root,n);if(file.startsWith(root)&&fs.existsSync(file)&&fs.statSync(file).isFile()){res.writeHead(200,{...headers,'Content-Type':mime[path.extname(file)]||'application/octet-stream'});res.end(fs.readFileSync(file));}else{res.writeHead(404,{'Content-Type':'text/plain'});res.end('404');}});
const report={checks:[],failed:[],errors:[],failures:[]};let browser;
function ok(condition,label,detail=''){(condition?report.checks:report.failed).push(label);console.log((condition?'PASS ':'FAIL ')+label+(!condition&&detail!==''?' — '+String(detail).slice(0,240):''));}
async function group(name,fn){try{await fn();}catch(e){ok(false,name+' : arrêt inattendu',e.message.split('\n')[0]);}}
const store=(p,k)=>p.evaluate(key=>{try{return JSON.parse(localStorage.getItem(key)||'null');}catch(e){return 'illisible';}},k);
const text=(p,sel)=>p.locator(sel).first().innerText();
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({...(process.env.QA_CHROMIUM?{executablePath:process.env.QA_CHROMIUM}:{}),args:['--no-sandbox','--disable-background-networking']});
 const ctx=await browser.newContext({viewport:{width:1280,height:900}});
 const page=async()=>{const p=await ctx.newPage();p.setDefaultTimeout(8000);p.on('pageerror',e=>report.errors.push(p.url()+' : '+e.message));p.on('response',r=>{if(r.status()>=400&&r.url().startsWith(base))report.failures.push(r.url());});p.on('dialog',d=>d.accept());return p;};
 const p=await page();

 await group('Mon garage : carnet vide, vues, possession, annulation, envies',async()=>{
  await p.goto(base+'/carnets/garage.html',{waitUntil:'load'});
  ok((await p.locator('h1').innerText()).replace(/\s+/g,' ')==='Mon garage','Titre « Mon garage »');
  ok(await p.locator('[role=tab]').count()===3,'Trois vues : possédés, envies, restants');
  ok(await p.locator('[data-cn-empty]').isVisible()&&/garage est vide/.test(await text(p,'[data-cn-empty]')),'Garage vide : état vide expliqué, sans collection fictive');
  ok(await p.locator('[data-cn-empty] a[href="../vehicules.html"]').count()===1,'État vide : lien vers le catalogue');
  await p.locator('[data-cn-goto="rest"]').click();
  ok(await p.locator('#cn-tab-rest').getAttribute('aria-selected')==='true','« Voir ce qui reste » ouvre la vue des restants');
  ok(/302/.test(await text(p,'[data-cn-tabn="rest"]')),'302 véhicules restants au départ');
  ok(await p.locator('.cn-card').count()===48,'Affichage par pages de 48');
  ok(await p.locator('[data-cn-more]').isVisible(),'« Afficher la suite » proposé');
  const first=p.locator('.cn-card').first(),key=await first.getAttribute('data-key'),id=key.split(':')[1];
  await first.locator('[data-cn-act="own"]').click();await p.waitForTimeout(300);
  ok((await store(p,'lk_own_vehicules'))?.[id]===1,'« Je l’ai » écrit la même clé que les fiches (lk_own_vehicules, valeur 1)');
  ok(await p.locator('[data-cn-n="done"]').innerText()==='1','Compteur « dans ton garage » à 1');
  ok(await p.locator('[data-cn-undo]').isVisible(),'Message avec « Annuler »');
  await p.locator('[data-cn-undo]').click();await p.waitForTimeout(150);
  ok(!(await store(p,'lk_own_vehicules'))?.[id],'« Annuler » retire la possession');
  const c2=p.locator('.cn-card').nth(1),id2=(await c2.getAttribute('data-key')).split(':')[1];
  await c2.locator('[data-cn-act="wish"]').click();await p.waitForTimeout(150);
  const w=await store(p,'lk_wish_v1');ok(w&&w.items['vehicules:'+id2]&&w.items['vehicules:'+id2].from==='catalogue','« Je le veux » : envie dans lk_wish_v1');
  ok(!(await store(p,'lk_own_vehicules'))?.[id2],'Une envie ne coche rien');
  ok(await p.locator('.cn-card[data-key="vehicules:'+id2+'"] [data-cn-act="unwish"]').getAttribute('aria-pressed')==='true','Bouton d’envie pressé');
  const c3=p.locator('.cn-card').nth(2);await c3.locator('[data-cn-act="wish"]').click();await p.waitForTimeout(150);
  await p.locator('#cn-tab-wish').click();
  ok(await p.locator('.cn-card').count()===2,'Vue « Mes envies » : deux véhicules');
  ok(/tool=order/.test(await p.locator('[data-cn-calc]').getAttribute('href')||'')&&await p.locator('[data-cn-calc]').isVisible(),'Deux envies : lien « Classer mes envies dans le calculateur »');
  await p.locator('.cn-card').first().locator('[data-cn-act="own"]').click();await p.waitForTimeout(350);
  ok(await p.locator('.cn-card').count()===1,'« Je l’ai » depuis les envies : la carte quitte la vue');
  const w2=await store(p,'lk_wish_v1');ok(Object.keys(w2.items).length===1,'… et l’envie devenue possession est retirée');
  await p.locator('#cn-tab-own').click();ok(await p.locator('.cn-card').count()===1&&await p.locator('.cn-stamp').first().innerText()!=='','Vue possédés : tampon « Possédé »');
  await p.screenshot({path:out+'/garage-possedes.png'});
 });

 await group('Recherche, filtres, adresse, retour arrière',async()=>{
  await p.locator('#cn-tab-rest').click();await p.locator('#cn-q').fill('stanier');await p.waitForTimeout(250);
  const n=await p.locator('.cn-card').count();ok(n>=1&&n<10,'Recherche « stanier » : quelques résultats',n);
  ok(/q=stanier/.test(p.url())&&/vue=restants/.test(p.url()),'Vue et recherche gardées dans l’adresse');
  const kick=(await p.locator('.cn-card .cn-kicker').first().innerText()).trim().toLowerCase();const opt=await p.locator('#cn-cat option').evaluateAll((os,k)=>{const o=os.find(x=>x.textContent.toLowerCase().startsWith(k));return o?o.value:'';},kick);
  await p.locator('#cn-cat').selectOption(opt);await p.waitForTimeout(150);ok(/cat=/.test(p.url())&&await p.locator('.cn-card').count()>=1,'Catégorie gardée dans l’adresse (liste des catégories de la vue affichée)');
  await p.reload({waitUntil:'load'});await p.waitForTimeout(300);
  ok(await p.locator('#cn-q').inputValue()==='stanier'&&await p.locator('#cn-tab-rest').getAttribute('aria-selected')==='true','Rechargement : même vue, même recherche');
  const link=p.locator('.cn-card .cn-name a').first();const href=await link.getAttribute('href');ok(/^\.\.\/vehicules\/[a-z0-9-]+\.html$/.test(href),'Chaque entrée ouvre sa fiche',href);
  await link.click();await p.waitForLoadState('load');await p.goBack({waitUntil:'load'});await p.waitForTimeout(300);
  ok(await p.locator('#cn-q').inputValue()==='stanier','Retour arrière : la recherche est toujours là');
  await p.locator('[data-cn-reset]').first().click();ok(await p.locator('#cn-q').inputValue()===''&&!/q=/.test(p.url()),'Effacer la recherche et les filtres');
  await p.locator('#cn-q').fill('zzzz introuvable');await p.waitForTimeout(250);ok(/Aucun résultat/.test(await text(p,'[data-cn-empty]')),'Recherche sans résultat : message et bouton pour effacer');
  await p.locator('[data-cn-empty] [data-cn-reset]').click();
  await p.locator('#cn-tab-own').focus();await p.keyboard.press('ArrowRight');ok(await p.locator('#cn-tab-wish').getAttribute('aria-selected')==='true'&&await p.evaluate(()=>document.activeElement.id)==='cn-tab-wish','Onglets au clavier (flèches)');
 });

 await group('Deux onglets : aucune écriture silencieuse',async()=>{
  const q=await page();await q.goto(base+'/carnets/garage.html',{waitUntil:'load'});const before=await q.locator('.cn-card').count();
  await p.goto(base+'/carnets/garage.html#vue=restants',{waitUntil:'load'});const c=p.locator('.cn-card').first();await c.locator('[data-cn-act="own"]').click();await p.waitForTimeout(400);
  ok(await q.locator('.cn-card').count()===before+1,'L’autre onglet relit le garage');ok(/autre onglet/.test(await text(q,'[data-cn-status-t]')),'… et le dit');
  const own=await store(q,'lk_own_vehicules');ok(Object.keys(own).length===before+1,'Les deux cases sont gardées (rien n’est écrasé)');await q.close();
 });

 await group('Fiche véhicule : envie, possession, lien vers le garage',async()=>{
  await p.goto(base+'/vehicules/albany-emperor.html',{waitUntil:'load'});
  ok(await p.locator('.fiche-liens a.own-see[href="../carnets/garage.html"]').innerText()==='Voir mon garage','« Voir mon garage » mène à la page du carnet');
  await p.locator('.wish-bt').click();ok((await store(p,'lk_wish_v1')).items['vehicules:albany-emperor'].from==='fiche','« Je le veux » sur la fiche : envie (origine fiche)');
  await p.locator('#own-bt').click();await p.waitForTimeout(100);
  ok((await store(p,'lk_own_vehicules'))['albany-emperor']===1&&!(await store(p,'lk_wish_v1')).items['vehicules:albany-emperor'],'« Ajouter à mon garage » : possédé, et retiré des envies');
  await p.goto(base+'/carnets/garage.html',{waitUntil:'load'});ok(await p.locator('.cn-card[data-key="vehicules:albany-emperor"]').count()===1,'Le carnet le montre aussitôt');
  await p.goto(base+'/vehicules/brute-camper.html',{waitUntil:'load'});ok(await p.locator('#own-bt').count()===0&&await p.locator('.own-off').count()===1,'Ancienne fiche hors liste : pas de case qui ne compterait jamais');
  await p.goto(base+'/vehicules.html',{waitUntil:'load'});ok(await p.locator('#own-bar a.own-link[href="carnets/garage.html"]').count()===1,'Page Véhicules : « Voir mon garage » vers le carnet');
  await p.goto(base+'/armes.html',{waitUntil:'load'});ok(await p.locator('a.own-link[href="carnets/arsenal.html"]').count()>=1&&await p.locator('a.own-link[href="carnets/arsenal.html#f=equipements"]').count()===1,'Armurerie : « Voir mon arsenal » vers le carnet (famille filtrée pour les équipements)');
 });

 await group('Consommables : stock à renseigner, quantité, réalisations sans double comptage',async()=>{
  await p.evaluate(()=>localStorage.setItem('lk_own_consommables',JSON.stringify({sprunk:1})));
  await p.goto(base+'/carnets/consommables.html',{waitUntil:'load'});
  const card=p.locator('.cn-card[data-key="consommables:sprunk"]');ok(/à renseigner/.test(await card.locator('.cn-stock-state').innerText()),'Ancienne case cochée : « stock à renseigner », aucune quantité inventée');
  ok(await card.locator('[data-cn-act="use"]').count()===0,'Pas de « J’en ai utilisé un » sans quantité connue');
  await card.locator('.cn-stock-form input').fill('3');await card.locator('.cn-stock-form button').click();await p.waitForTimeout(150);
  ok((await store(p,'lk_stock_v1')).items['consommables:sprunk'].q===3,'Quantité notée : 3');
  await p.locator('.cn-card[data-key="consommables:sprunk"] [data-cn-act="use"]').click();await p.waitForTimeout(150);
  ok((await store(p,'lk_stock_v1')).items['consommables:sprunk'].q===2,'« J’en ai utilisé un » : 2');
  const j=await store(p,'lk_journal_v1');ok(j&&Object.keys(j.events).filter(k=>k.indexOf('carnet:consommables:sprunk:')===0).length===1,'Une réalisation = un événement du journal');
  ok((await store(p,'lk_own_consommables')).sprunk===1,'Le stock ne décoche jamais « goûté »');
  await p.locator('#cn-stock').selectOption('en-stock');ok(await p.locator('.cn-card').count()===1,'Filtre « En stock »');
  await p.locator('#cn-stock').selectOption('a-renseigner');ok(await p.locator('.cn-card').count()===0,'Filtre « Stock à renseigner »');
  await p.locator('#cn-stock').selectOption('');await p.screenshot({path:out+'/consommables-stock.png'});
 });

 await group('Arsenal : familles, munitions en stock',async()=>{
  await p.goto(base+'/carnets/arsenal.html#f=munitions&vue=restants',{waitUntil:'load'});
  ok(await p.locator('#cn-fam').inputValue()==='munitions','#f=munitions : famille filtrée');
  const n=await p.locator('.cn-card').count();ok(n===5,'Cinq types de munitions restants',n);
  await p.locator('.cn-card').first().locator('[data-cn-act="own"]').click();await p.waitForTimeout(350);
  await p.locator('#cn-tab-own').click();ok(await p.locator('.cn-card .cn-stock').count()===1,'Munitions obtenues : bloc de stock');
 });

 await group('Lieux, propriétés, collectibles, garde-robe',async()=>{
  await p.goto(base+'/carnets/lieux.html#vue=restants',{waitUntil:'load'});
  ok(/2\s?547/.test((await text(p,'[data-cn-tabn="rest"]')).replace(/ /g,' ')),'2 547 lieux à repérer');
  ok((await p.locator('.cn-card [data-cn-act="own"]').first().innerText())==='Marquer comme repéré','Vocabulaire : « repéré », jamais « possédé »');
  const id=(await p.locator('.cn-card').first().getAttribute('data-key')).split(':')[1];await p.locator('.cn-card').first().locator('[data-cn-act="own"]').click();await p.waitForTimeout(300);
  ok((await store(p,'lk_map_found'))[id]===true,'Même clé que la carte (lk_map_found, valeur true)');
  await p.goto(base+'/carte.html',{waitUntil:'load'});await p.waitForTimeout(400);ok(await p.locator('#map-found-count').innerText()==='1','La carte compte le lieu repéré depuis le carnet');
  ok(await p.locator('.ms-found a[href="carnets/lieux.html"]').count()===1,'Carte : « Voir mes lieux repérés »');
  await p.goto(base+'/carnets/proprietes.html#vue=restants',{waitUntil:'load'});ok(await p.locator('.cn-card').count()===4,'Quatre contenus documentés (les bateaux sont au garage)');
  await p.locator('.cn-card[data-key="acquisitions:garage-paradise"] [data-cn-act="own"]').click();await p.waitForTimeout(300);
  ok((await store(p,'lk_progression_v2'))?.checked?.['garage-paradise']===true,'Garage obtenu : même clé que la page Planques (lk_progression_v2)');
  await p.goto(base+'/carnets/collectibles.html#vue=restants',{waitUntil:'load'});ok(/Rien à trouver/.test(await text(p,'[data-cn-empty]')),'Collectibles : liste vide expliquée, rien d’inventé');
  await p.evaluate(()=>{const now=new Date().toISOString();localStorage.setItem('lk_wish_v1',JSON.stringify({version:1,items:{'styles:imprimes-stock-305':{at:now,from:'catalogue'}}}));});
  await p.goto(base+'/carnets/garde-robe.html#vue=envies',{waitUntil:'load'});ok(await p.locator('.cn-card[data-key="styles:imprimes-stock-305"]').count()===1,'Garde-robe : un style gardé est une envie');
  await p.goto(base+'/style.html',{waitUntil:'load'});ok(await p.locator('.cat-track-link[href="carnets/garde-robe.html#f=tenues"]').count()===1,'Vêtements et style : lien « Voir ma garde-robe » sur la barre des tenues');
 });

 await group('Tableau de bord Progression',async()=>{
  await p.goto(base+'/progression.html#garage',{waitUntil:'load'});await p.waitForTimeout(300);
  ok(await p.locator('.cn-dcard').count()===9,'Neuf carnets');ok(await p.locator('#carnet-garage.is-target').count()===1,'Ancienne ancre #garage : la carte du garage est mise en évidence');
  ok(await p.locator('#carnet-garage a.cn-dcard-btn[href="carnets/garage.html"]').innerText().then(t=>/Voir mon garage/.test(t)),'« Voir mon garage » → page du carnet');
  const g=await p.locator('#carnet-garage [data-cn-done]').innerText();const own=Object.keys(await store(p,'lk_own_vehicules')).length;ok(Number(g)===own,'Même compte que le carnet',g+' / '+own);
  ok(/1 \/ 4/.test((await p.locator('#suivi-acquisitions .suivi-n').innerText()).replace(/ /g,' ')),'Propriétés : 1 / 4');
  ok((await p.locator('section#acquisitions').count())===0&&(await p.locator('#acquisitions').count())===1,'Plus de section « acquisitions » non fermée ; l’ancre #acquisitions reste');
 });

 await group('Calculs : carnet en lecture, fiche ouverte sans rien remplacer',async()=>{
  await p.goto(base+'/calculateurs.html?tool=goal#atelier',{waitUntil:'load'});
  await p.locator('#f-goal-capital').fill('200 000');await p.locator('#f-goal-target').fill('1 000 000');await p.locator('#calc-name').fill('Test carnet');await p.locator('#calc-save').click();await p.waitForTimeout(200);
  await p.goto(base+'/carnets/calculs.html',{waitUntil:'load'});ok(await p.locator('.cn-card').count()===1&&/Test carnet/.test(await text(p,'.cn-card')),'Le calcul enregistré est dans « Mes calculs et mes plans »');
  const href=await p.locator('.cn-card a.cn-act--main').getAttribute('href');await p.locator('.cn-card a.cn-act--main').click();await p.waitForLoadState('load');await p.waitForTimeout(400);
  ok(/voir=/.test(href)&&await p.locator('#calc-sheet').evaluate(d=>d.open),'« Voir la fiche » ouvre la fiche dans le calculateur');
  await p.goto(base+'/calculateurs.html?voir=calc-inconnu#atelier',{waitUntil:'load'});await p.waitForTimeout(300);ok(!(await p.locator('#calc-sheet').evaluate(d=>d.open)),'Calcul supprimé : rien ne s’ouvre, un message le dit');
  await p.goto(base+'/calculateurs.html?tool=order&type=vehicle&ids=albany-emperor,vapid-dominator&from=carnet#atelier',{waitUntil:'load'});await p.waitForTimeout(300);
  ok(await p.locator('#tab-order').getAttribute('aria-selected')==='true','« Classer mes envies » ouvre « Quoi acheter d’abord ? »');
  const keys=await p.evaluate(()=>JSON.parse(localStorage.getItem('lk-calculator-v1')||'{}').order?.keys?.length||0);ok(keys>=2,'… avec les deux véhicules',keys);
 });

 await group('Business plan : prévu ne coche rien, un achat déclaré fait range le véhicule une seule fois',async()=>{
  const c4=await browser.newContext({viewport:{width:1400,height:1000}});const q=await c4.newPage();q.on('dialog',d=>d.accept());q.on('pageerror',e=>report.errors.push('plan : '+e.message));
  await q.goto(base+'/calculateurs.html?tool=order&type=vehicle&ids=albany-emperor&from=carnet#atelier',{waitUntil:'load'});await q.waitForTimeout(300);
  await q.locator('#tab-plan').click();await q.locator('[data-b-plan-import-calcs]').first().click();await q.waitForTimeout(200);
  await q.locator('[data-field="plan.prerequisites.0.price"]').first().fill('50 000');await q.locator('[data-field="plan.prerequisites.0.price"]').first().dispatchEvent('change');await q.waitForTimeout(200);
  ok(!(await store(q,'lk_own_vehicules'))?.['albany-emperor'],'Plan prévu : le garage n’est pas touché');
  const fh=q.locator('[data-fold-head="plan-actual"]');await fh.scrollIntoViewIfNeeded();await fh.click();await q.waitForTimeout(200);
  await q.locator('#plan-actual').fill('160 000');await q.locator('#plan-actual-minutes').fill('60');await q.locator('[data-b-plan-actual-bought]').first().check();await q.locator('[data-b-plan-log]').click();await q.waitForTimeout(300);
  ok((await store(q,'lk_own_vehicules'))?.['albany-emperor']===1,'Achat déclaré fait : le véhicule entre dans le garage');
  ok(/Rangé dans tes carnets/.test(await q.evaluate(()=>document.getElementById('lk-status')?.textContent||'')),'Le message le dit');
  const ev=Object.keys((await store(q,'lk_journal_v1')).events).filter(k=>k.startsWith('plan:'));ok(ev.length===1,'Un événement « plan » au journal',ev.length);
  await q.goto(base+'/carnets/garage.html',{waitUntil:'load'});ok(await q.locator('.cn-card[data-key="vehicules:albany-emperor"]').count()===1,'Le carnet « Mon garage » le montre');
  await c4.close();
 });

 await group('Stockage indisponible : lecture seule annoncée',async()=>{
  const c2=await browser.newContext({viewport:{width:1280,height:900}});await c2.addInitScript(()=>{Object.defineProperty(window,'localStorage',{get(){throw new Error('bloqué');}});});
  const q=await c2.newPage();const errs=[];q.on('pageerror',e=>errs.push(e.message));await q.goto(base+'/carnets/garage.html#vue=restants',{waitUntil:'load'});await q.waitForTimeout(300);
  ok(/ne garde rien/.test(await text(q,'[data-cn-status-t]')),'Message : ce navigateur ne garde rien');ok(await q.locator('.cn-card [data-cn-act="own"]').first().isDisabled(),'Boutons désactivés, aucun succès annoncé');
  ok(!errs.length,'Aucune erreur de script',errs.join(' | '));await c2.close();
 });

 await group('Téléphone, mouvement réduit',async()=>{
  const c3=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});const q=await c3.newPage();
  for(const id of ['garage','arsenal','garde-robe','consommables','personnalisations','proprietes','lieux','collectibles','calculs']){await q.goto(base+'/carnets/'+id+'.html#vue='+(id==='calculs'?'calculs':'restants'),{waitUntil:'load'});await q.waitForTimeout(150);
   const o=await q.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);ok(o<=0,'Téléphone : pas de défilement horizontal ('+id+')',o);}
  const anim=await q.evaluate(()=>{const c=document.querySelector('.cn-card');return c?getComputedStyle(c).animationName:'none';});ok(anim==='none','Mouvement réduit : pas d’apparition animée',anim);
  await q.goto(base+'/carnets/garage.html#vue=restants',{waitUntil:'load'});await q.screenshot({path:out+'/garage-telephone.png'});
  const t=await q.evaluate(()=>[...document.querySelectorAll('.cn-act, [role=tab], .cn-field select, .cn-field input')].filter(e=>e.offsetParent).map(e=>e.getBoundingClientRect().height).filter(h=>h<36).length);ok(t===0,'Cibles tactiles d’au moins 36 px',t);
  await c3.close();
 });

 ok(!report.errors.length,'Aucune erreur de script',report.errors.join(' | '));ok(!report.failures.length,'Aucune ressource manquante',report.failures.join(' | '));
 fs.writeFileSync(out+'/carnets-rapport.json',JSON.stringify(report,null,1));
 console.log('\n'+report.checks.length+' contrôles réussis, '+report.failed.length+' en échec.');
 await browser.close();server.close();process.exitCode=report.failed.length?1:0;
})().catch(async e=>{console.error(e);if(browser)await browser.close();server.close();process.exitCode=1;});
