#!/usr/bin/env node
'use strict';
/* v7.47 (lot 10) : parcours complet du calculateur dans un vrai navigateur (Chromium headless via Playwright).
   Ce que fait un nouveau venu : il remplit, il calcule, il enregistre, il recharge, il retrouve.
   - les huit outils en Simple, Pas à pas et Expert, puis le business plan : cases remplies, réponse lisible
     (aucun NaN, undefined, Infinity), exemples préremplis, « Choisir cette activité », « Et si… » ;
   - « Mes calculs enregistrés » : badge avec le nombre, tiroir (clavier, Échap, retour du focus), cartes (nom,
     outil, date, réponse, chiffres clés), ouvrir, renommer, dupliquer, supprimer puis annuler, comparer deux calculs,
     rappel discret quand on quitte un calcul changé sans l’enregistrer ;
   - rechargement : tout est retrouvé ; partage (lien #plan=), impression (un seul panneau), téléchargement puis
     ouverture du fichier ; anciennes sauvegardes lisibles (réglages v1, v2, v3 ; carnets saved-v1, recent-v1,
     reference-v2 ; carnet v3) ;
   - sept largeurs avec le tiroir ouvert : aucun débordement ; mouvement réduit ; contrastes AA de chaque texte des
     neuf panneaux dans les trois modes et du tiroir ; 0 erreur console, 0 requête en échec.
   Usage : NODE_PATH=<dépendances>/node_modules node outils/tests/calculateurs-parcours-browser.cjs <dossier hors dépôt>
   (LK_CHROMIUM=<chemin> pour un Chromium déjà installé). Code de sortie 1 si un contrôle échoue. */
const fs=require('fs'),path=require('path'),http=require('http');const {chromium}=require('playwright');
const root=path.resolve(process.env.SITE_ROOT||path.join(__dirname,'../..')),out=path.resolve(process.argv[2]||path.join(root,'../../qa/parcours'));fs.mkdirSync(out,{recursive:true});
const vercel=JSON.parse(fs.readFileSync(path.join(root,'vercel.json'),'utf8')),H=Object.fromEntries((vercel.headers.find(r=>r.source==='/(.*)')?.headers||[]).map(h=>[h.key,h.value]));
const MIME={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.woff2':'font/woff2','.txt':'text/plain','.xml':'application/xml'};
const server=http.createServer((req,res)=>{let p;try{p=decodeURIComponent(new URL(req.url,'http://x').pathname);}catch{res.writeHead(400).end();return;}if(p.endsWith('/'))p+='index.html';const f=path.join(root,p);if(!f.startsWith(root)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){res.writeHead(404,H).end();return;}res.writeHead(200,{...H,'content-type':MIME[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(res);});
const lines=[],errors=[],failedRequests=[];let passed=0,failed=0,browser,base;
function check(ok,label,detail=''){ok?passed++:failed++;const t=(ok?'PASS ':'FAIL ')+label+(detail&&!ok?' — '+String(detail).slice(0,300):'');lines.push(t);console.log(t);}
const flat=s=>String(s).replace(/[  ]/g,' ').replace(/\s+/g,' ').trim();
const digits=s=>String(s).replace(/[^\d]/g,'');
async function group(name,fn){try{await fn();}catch(e){check(false,name+' : arrêt inattendu',e.message.split('\n')[0]);}}
async function fresh(width=1440,opts={}){const ctx=await browser.newContext({viewport:{width,height:width<700?844:1000},acceptDownloads:true,...opts});const page=await ctx.newPage();page.setDefaultTimeout(8000);
 page.on('console',m=>{if(m.type()==='error')errors.push(width+' '+m.text());});page.on('pageerror',e=>errors.push(width+' '+e.message));page.on('response',r=>{if(r.url().startsWith(base)&&r.status()>=400)failedRequests.push(r.status()+' '+r.url());});page.on('dialog',d=>d.accept());return {ctx,page};}
async function open(page,suffix=''){await page.goto(base+'/calculateurs.html'+suffix,{waitUntil:'load'});await page.waitForSelector('#panel-goal');}
async function tab(page,t){await page.locator('#tab-'+t).click();}
async function mode(page,m){await page.locator('.calc-mode-switch [data-mode="'+m+'"]').click();}
async function fill(page,id,v){await page.locator('#'+id).fill(String(v));}
async function sane(page,label){const txt=await page.locator('#atelier').innerText();const bad=txt.match(/\b(?:NaN|undefined|Infinity|null)\b/g);check(!bad,label+' : aucune valeur technique affichée',bad&&bad.join(', '));}
async function answer(page,sel){return flat(await page.locator(sel).first().innerText());}
async function count(page){return Number(await page.locator('#calc-saved-open [data-saved-count]').innerText());}
async function drawer(page){if(!await page.locator('#calc-drawer').evaluate(d=>d.open))await page.locator('#calc-saved-open').click();await page.waitForSelector('#calc-drawer[open]');}
async function closeDrawer(page){await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.getElementById('calc-drawer').open);}
/* Chaque outil : de quoi le remplir, et où lire la réponse. */
const TOOLS={
 goal:{fill:async p=>{await fill(p,'f-goal-capital','250 000');await fill(p,'f-goal-target','1 250 000');await fill(p,'f-goal-hourly','125 000');await fill(p,'f-goal-dailyMinutes','60');},answer:'#goal-results .calc-answer',expect:/Il te manque 1 000 000 \$.*8 jours/},
 purchase:{fill:async p=>{await fill(p,'purchase-name','Voiture témoin');await fill(p,'f-purchase-price','150 000');await fill(p,'f-purchase-capital','250 000');},answer:'#purchase-results .calc-answer',expect:/Oui, tu peux l’acheter maintenant/},
 session:{fill:async p=>{await p.locator('[data-session-minutes="45"]').click();},answer:'#session-results .calc-answer',expect:/En 45 min/},
 budget:{fill:async p=>{await p.locator('#f-budget-source').selectOption('manual').catch(()=>{});await fill(p,'f-budget-extra','20 000');},answer:'#budget-results .calc-answer',expect:/reste|dépens|manque/i},
 order:{fill:async p=>{await fill(p,'order-search','fe');await p.locator('#order-search').press('ArrowDown');await p.locator('#order-search').press('Enter');await p.locator('.b-order-editor:not([hidden]) [data-number]').first().fill('50 000');},answer:'#order-results .calc-answer',expect:/Tout est à toi|tu peux tout acheter|maintenant|\$/},
 roi:{fill:async p=>{await p.locator('[data-b-roi-manual]').click();await fill(p,'f-roi-purchase','120 000');await fill(p,'roi-capital','500 000');},answer:'#roi-results .calc-answer',expect:/Oui|Non|Pas/},
 activities:{fill:async p=>{await p.locator('[data-activity-example="scenario-b"]').click();await fill(p,'f-inverse-minutes','120');await p.locator('#activity-answer').click();},answer:'#inverse-results .calc-answer',expect:/Avec 120 minutes, tu peux terminer \d+ missions? et gagner/},
 compare:{fill:async p=>{for(const q of ['kamacho','bati']){await fill(p,'compare-search',q);await p.locator('#compare-search').press('ArrowDown');await p.locator('#compare-search').press('Enter');}for(const [i,v] of [[0,'150 000'],[1,'50 000']]){const f=p.locator('#compare-price-'+i);if(await f.count())await f.fill(v);}},answer:'#compare-results .calc-answer',expect:/Pour toi, c’est|Ajoute|départager/},
 plan:{fill:async p=>{await p.locator('#f-plan-goal-kind').selectOption('amount');await fill(p,'plan-target','1 000 000');await fill(p,'plan-capital','200 000');await fill(p,'plan-hourly','100 000');await fill(p,'plan-daily','60');},answer:'#plan-results .calc-answer',expect:/8 parties de 1 h/}
};
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({...(process.env.LK_CHROMIUM?{executablePath:process.env.LK_CHROMIUM}:{}),args:['--no-sandbox','--disable-background-networking','--disable-component-update']});
 lines.push('Parcours du calculateur — '+new Date().toISOString());
 /* 1. Huit outils et le business plan, trois modes, puis enregistrement de chacun */
 const {ctx,page}=await fresh(1440);
 await group('Outils et modes',async()=>{await open(page);
  check(await page.locator('[role="tabpanel"]').count()===9,'Neuf panneaux : huit calculs et le business plan');
  check(await count(page)===0,'Badge « Mes calculs » à 0 au départ');
  let saved=0;
  for(const [t,spec] of Object.entries(TOOLS)){
   await tab(page,t);check(await page.locator('#panel-'+t).isVisible()&&await page.locator('#tab-'+t).getAttribute('aria-selected')==='true',t+' : onglet actif et panneau visible');
   await mode(page,'quick');await spec.fill(page);await page.waitForTimeout(120);
   const a=await answer(page,spec.answer);check(spec.expect.test(a),t+' : réponse en Simple',a.slice(0,160));
   await mode(page,'guided');await page.waitForSelector('.calc-wizard:not([hidden]) #wiz-count',{timeout:2000}).catch(()=>{});const wiz=page.locator('.calc-wizard:not([hidden]) #wiz-count');
   if(t!=='plan'||await wiz.count()){const wt=await wiz.count()?await wiz.innerText():'(absent)';check(/Question 1 sur \d/.test(wt),t+' : Pas à pas commence à la question 1',wt);let n=0;while(n<8&&await page.locator('.calc-wiz-nav:not([hidden]) [data-wiz="next"]').isVisible()){const last=/Voir ma réponse/.test(await page.locator('[data-wiz="next"]').innerText());await page.locator('[data-wiz="next"]').click();n++;if(last)break;}
    check(await answer(page,spec.answer)===a,t+' : même réponse en Pas à pas',n+' étape(s)');}
   await mode(page,'advanced');check(await answer(page,spec.answer)===a,t+' : même réponse en Expert');
   if(t!=='plan'){const ex=page.locator('#expert-'+t);check(/Et si le chiffre bouge de 20 %|Comparer avec un calcul gardé/.test(flat(await ex.innerText())),t+' : tout le détail affiché en Expert');}
   await sane(page,t);
   await mode(page,'quick');await fill(page,'calc-name','Parcours '+t);await page.locator('#calc-save').click();saved++;
   check(await count(page)===saved,t+' : enregistré, badge à '+saved,String(await count(page)));
  }
 });
 /* 2. Rechargement : tout est retrouvé dans le tiroir */
 await group('Recharger et retrouver',async()=>{await page.reload({waitUntil:'load'});check(await count(page)===9,'Après rechargement : 9 enregistrements dans le badge',String(await count(page)));
  await tab(page,'goal');await page.locator('#calc-saved-open').focus();await page.keyboard.press('Enter');await page.waitForSelector('#calc-drawer[open]');
  check(await page.locator('#saved-list .b-notebook-entry').count()===8,'Tiroir : huit calculs dans « Mes calculs »');
  const card=page.locator('#saved-list .b-notebook-entry[data-tool="goal"]');const txt=flat(await card.innerText());
  check(/Mon objectif/.test(txt)&&/(Enregistré|Modifié) le \d/.test(txt)&&/Temps de jeu pour mon objectif\s*8 h/.test(txt)&&/J’ai 250 000 \$/.test(txt)&&/Je veux 1 250 000 \$/.test(txt),'Carte : outil, date, réponse et chiffres clés',txt.slice(0,220));
  check(await card.locator('[data-b-rename]').inputValue()==='Parcours goal','Carte : le nom enregistré');
  await page.locator('[data-drawer-view="plans"]').click();check(await page.locator('#saved-plans-list .b-notebook-entry').count()===1&&!(await page.locator('#saved-calcs').isVisible()),'« Mes plans » : le business plan, seul');
  check(/8\s*parties de 1\s*h/.test(flat(await page.locator('#saved-plans-list .b-notebook-entry').innerText())),'Carte du plan : la réponse du plan');
  await page.locator('[data-drawer-view="calcs"]').click();
  await closeDrawer(page);check(await page.evaluate(()=>document.activeElement?.id==='calc-saved-open'),'Échap ferme le tiroir et rend le focus au bouton');
 });
 /* 3. Ouvrir, renommer, dupliquer, supprimer, annuler, comparer */
 await group('Actions sur les cartes',async()=>{await tab(page,'session');await drawer(page);
  await page.locator('#saved-list .b-notebook-entry[data-tool="goal"] [data-b-load]').click();
  check(!(await page.locator('#calc-drawer').evaluate(d=>d.open))&&await page.locator('#tab-goal').getAttribute('aria-selected')==='true','Ouvrir : le tiroir se ferme et l’outil du calcul s’affiche');
  check(digits(await page.locator('#f-goal-capital').inputValue())==='250000','Ouvrir : les chiffres enregistrés reviennent');
  await drawer(page);const goal=page.locator('#saved-list .b-notebook-entry[data-tool="goal"]').first();const id=await goal.getAttribute('data-entry');
  await goal.locator('[data-b-rename-focus]').click();check(await page.evaluate(i=>document.activeElement?.id==='entry-'+i,id),'Renommer : le nom est prêt à être changé');
  await page.keyboard.type('Objectif renommé');await page.keyboard.press('Enter');await page.waitForTimeout(80);
  check(await page.evaluate(i=>JSON.parse(localStorage.getItem('lk-calculator-notebooks-v3')).entries.find(e=>e.id===i)?.name,id)==='Objectif renommé','Renommer : le nouveau nom est enregistré');
  await page.locator('#saved-list [data-entry="'+id+'"] [data-b-duplicate]').click();check(await page.locator('#saved-list .b-notebook-entry').count()===9&&await count(page)===10,'Dupliquer : une carte de plus, badge à 10');
  check(/copie/.test(await page.locator('#saved-list .b-notebook-entry [data-b-rename]').first().inputValue()),'Dupliquer : la copie est en haut de la liste');
  const copyId=await page.locator('#saved-list .b-notebook-entry').first().getAttribute('data-entry');
  await page.locator('#saved-list [data-entry="'+copyId+'"] [data-b-delete]').click();check(await page.locator('#saved-list .b-notebook-entry').count()===8,'Supprimer : la carte disparaît');
  check(await page.evaluate(()=>document.activeElement?.matches('[data-b-notebook-undo]')),'Supprimer : le focus va sur « Annuler la suppression »');
  await page.keyboard.press('Enter');check(await page.locator('#saved-list .b-notebook-entry').count()===9,'Annuler la suppression : la carte revient');
  await page.locator('#saved-list [data-entry="'+copyId+'"] [data-b-delete]').click();
  /* comparer deux calculs : l’objectif et une copie changée */
  await closeDrawer(page);await fill(page,'f-goal-hourly','250 000');await fill(page,'calc-name','Objectif rapide');await drawer(page);await page.locator('#saved-now [data-b-save-copy]').click();
  const cards=page.locator('#saved-list .b-notebook-entry[data-tool="goal"]');check(await cards.count()===2,'Enregistrer une copie : deux calculs de Mon objectif');
  await cards.nth(0).locator('[data-b-pick]').check();check(/1 calcul coché/.test(flat(await page.locator('#saved-pick').innerText())),'Comparer : la barre demande un deuxième calcul');
  await cards.nth(1).locator('[data-b-pick]').check();await page.locator('[data-b-compare-go]').click();
  const view=flat(await page.locator('#saved-compare').innerText());
  check(await page.locator('#saved-compare').isVisible()&&/Les deux côte à côte/.test(view)&&/demande 4 h de jeu en moins/.test(view),'Comparer : tableau côte à côte et phrase claire',view.slice(0,200));
  check(await page.locator('#saved-compare tr.is-diff').count()>=2,'Comparer : les lignes différentes sont marquées');
  check(await page.evaluate(()=>document.activeElement?.id==='saved-compare-title'),'Comparer : le focus va sur le titre du comparatif');
  await page.locator('[data-b-compare-back]').click();check(await page.locator('#saved-list').isVisible(),'Comparer : retour à la liste');
  await closeDrawer(page);
 });
 /* 4. Rappel discret : un calcul changé qu’on quitte sans l’enregistrer */
 await group('Rappel discret',async()=>{await tab(page,'budget');await fill(page,'f-budget-extra','33 000');await tab(page,'goal');
  const box=page.locator('#calc-reminder');check(await box.isVisible()&&/« Mon budget » n’est pas enregistré/.test(flat(await box.innerText())),'Rappel : visible après avoir quitté un calcul changé');
  const before=await count(page);await box.locator('[data-b-save]').click();check(await count(page)===before&&!(await box.isVisible()),'Rappel : « L’enregistrer » met à jour le calcul de Mon budget et se ferme');
  await tab(page,'roi');check(!(await box.isVisible()),'Rappel : rien quand on n’a rien changé');
 });
 /* 5. Exemples, « Choisir cette activité », « Et si… » */
 await group('Exemples et raccourcis',async()=>{await tab(page,'goal');await mode(page,'quick');
  for(const v of ['100000','500000','1000000','5000000','10000000']){await page.locator('[data-target="'+v+'"]').click();check(digits(await page.locator('#f-goal-target').inputValue())===v,'Objectif rapide '+v);}
  await page.locator('#f-model').selectOption('cycles');await page.waitForTimeout(80);
  await mode(page,'advanced');/* « Avec quelle activité j’arrive le plus vite ? » est ouvert en Expert */const routes=page.locator('#goal-routes [data-scenario]');const n=await routes.count();check(n>=1,'« Choisir cette activité » présent',String(n));
  if(n){const id=await routes.nth(1).getAttribute('data-scenario');await routes.nth(1).click();check(await page.locator('#f-goal-selected').inputValue()===id,'« Choisir cette activité » choisit cette activité',id);}
  await page.locator('#f-model').selectOption('continuous');await mode(page,'advanced');const head=page.locator('[data-fold-head="goal-sensitivity"]');if(await head.getAttribute('aria-expanded')==='false')await head.click();
  const point=page.locator('#expert-goal [data-c-apply]').first();if(await point.count()){const before=await page.locator('#f-goal-hourly').inputValue();await point.click();check(await page.locator('#f-goal-hourly').inputValue()!==before,'« Et si… » : un clic sur un point garde ce chiffre');}else check(false,'« Et si… » : point cliquable absent');
  await tab(page,'activities');for(const id of ['scenario-a','scenario-b','scenario-c']){await page.locator('[data-activity-example="'+id+'"]').click();check(await page.locator('#f-inverse-selected').inputValue()===id,'Exemple '+id+' chargé');}
  await tab(page,'session');for(const m of ['15','30','45','60','90']){await page.locator('[data-session-minutes="'+m+'"]').click();check(await page.locator('#f-session-minutes').inputValue()===m,'Session de '+m+' min');}
  await sane(page,'Exemples');await mode(page,'quick');
 });
 /* 6. Partage, impression, téléchargement puis ouverture du fichier */
 await group('Partager, imprimer, télécharger',async()=>{await tab(page,'goal');await fill(page,'f-goal-capital','310 000');
  await ctx.grantPermissions(['clipboard-read','clipboard-write']).catch(()=>{});await page.locator('#calc-share').click();await page.waitForTimeout(150);
  const link=await page.evaluate(()=>navigator.clipboard.readText().catch(()=>''));check(/#plan=/.test(link),'Partager : un lien #plan= est copié');
  if(link){const other=await fresh(390);await other.page.goto(link.replace(/^https?:\/\/[^/]+/,base),{waitUntil:'load'});check(digits(await other.page.locator('#f-goal-capital').inputValue())==='310000','Lien partagé : le même calcul s’ouvre ailleurs');await other.ctx.close();}
  await page.evaluate(()=>{window.__printed=0;window.print=()=>{window.__printed++;};});await page.locator('#calc-print').click();check(await page.evaluate(()=>window.__printed)===1,'Imprimer : l’impression est lancée');
  await page.emulateMedia({media:'print'});const vis=await page.evaluate(()=>[...document.querySelectorAll('.calc-panel')].filter(p=>getComputedStyle(p).display!=='none'&&!p.hidden).length);const hiddenBits=await page.evaluate(()=>['.calc-tabs','.calc-mode-row','.calc-drawer','.calc-saved-open','header'].every(s=>{const e=document.querySelector(s);return !e||getComputedStyle(e).display==='none';}));
  check(vis===1&&hiddenBits,'Impression : un seul panneau, sans onglets ni boutons');await page.emulateMedia({media:'screen'});
  await drawer(page);const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#calc-export').click()]);const file=path.join(out,'calcul-telecharge.json');await download.saveAs(file);const json=JSON.parse(fs.readFileSync(file,'utf8'));
  check(json.version===5&&json.goal.capital===310000,'Télécharger : un fichier avec mes chiffres');
  const other=await fresh(768);await open(other.page);await drawer(other.page);await other.page.locator('#calc-import').setInputFiles(file);await other.page.waitForTimeout(200);
  check(digits(await other.page.locator('#f-goal-capital').inputValue())==='310000'&&!(await other.page.locator('#calc-drawer').evaluate(d=>d.open)),'Ouvrir un fichier : le calcul revient sur un autre appareil, le tiroir se ferme');await other.ctx.close();
  await closeDrawer(page).catch(()=>{});
 });
 /* 7. Anciennes sauvegardes : réglages v1, v2, v3 et carnets des anciennes versions */
 await group('Anciennes sauvegardes',async()=>{const current=await page.evaluate(()=>JSON.parse(localStorage.getItem('lk-calculator-v1')));
  const acts=current.activities.map(({prepOnce,requiresPurchaseIds,...a})=>a);
  const v1={version:1,tab:'goal',mode:'quick',goal:{capital:123456,target:900000,dailyMinutes:60,players:1,selected:'scenario-a'},activities:acts,session:{minutes:60,maxRepeat:100,enabled:['scenario-a']},purchase:{price:50000},roi:{purchase:200000,upgrades:0,fees:0,hours:10},order:{items:[{name:'Voiture ancienne',price:300000}]},budget:{allocations:[1000,2000,3000,4000,5000]}};
  const v2={...v1,version:2,model:'continuous',goal:{...v1.goal,capital:234567,hourly:50000,reserve:1000}};
  const v3={...JSON.parse(JSON.stringify(current)),version:3,goal:{...current.goal,capital:345678},plan:{kind:'amount',key:'',target:750000,usePrerequisites:true,upkeepPerSession:0,priority:'balanced',activity:''}};
  for(const [label,cfg,expect] of [['v1',v1,'123456'],['v2',v2,'234567'],['v3',v3,'345678']]){const t=await fresh(1024);await t.page.addInitScript(c=>{if(!sessionStorage.getItem('seeded')){localStorage.setItem('lk-calculator-v1',c);sessionStorage.setItem('seeded','1');}},JSON.stringify(cfg));await open(t.page);
   check(digits(await t.page.locator('#f-goal-capital').inputValue())===expect,'Réglages '+label+' lus : le calcul reprend');await sane(t.page,'Réglages '+label);
   check(await t.page.evaluate(()=>JSON.parse(localStorage.getItem('lk-calculator-v1')).version)===cfg.version,'Réglages '+label+' : rien n’est réécrit tant qu’on ne change rien');
   await fill(t.page,'f-goal-target','2 000 000');await t.page.waitForTimeout(100);
   check(await t.page.evaluate(()=>JSON.parse(localStorage.getItem('lk-calculator-v1')).version)===5,'Réglages '+label+' : mis à jour en version 5 au premier changement');
   check(await t.page.evaluate(v=>Object.keys(localStorage).filter(k=>k.startsWith('lk-calculator-v1-backup-')).some(k=>JSON.parse(localStorage.getItem(k)).version===v),cfg.version),'Réglages '+label+' : l’original est gardé à part');await t.ctx.close();}
  const legacy=await fresh(390);await legacy.page.addInitScript(([saved,recent,ref])=>{if(sessionStorage.getItem('seeded'))return;localStorage.setItem('lk-calculator-saved-v1',saved);localStorage.setItem('lk-calculator-recent-v1',recent);localStorage.setItem('lk-calculator-reference-v2',ref);sessionStorage.setItem('seeded','1');},[JSON.stringify([{name:'Vieux carnet',config:v2}]),JSON.stringify([{name:'Vieux récent',config:v1}]),JSON.stringify({...v2,name:'Vieille référence'})]);
  await open(legacy.page);await drawer(legacy.page);const names=async()=>(await legacy.page.locator('#calc-drawer [data-b-rename]').evaluateAll(els=>els.map(e=>e.value))).join(' | ');const all=await names();
  check(/Vieux carnet/.test(all)&&/Vieux récent/.test(all)&&/Vieille référence/.test(all),'Anciens carnets (saved-v1, recent-v1, reference-v2) rangés dans Mes calculs',all.slice(0,200));
  check(await legacy.page.evaluate(()=>!!localStorage.getItem('lk-calculator-saved-v1')&&!!localStorage.getItem('lk-calculator-notebooks-v3')),'Anciens carnets : l’original reste, le carnet v3 est écrit');
  const n0=await legacy.page.locator('.b-notebook-entry').count();await legacy.page.reload({waitUntil:'load'});await drawer(legacy.page);check(await legacy.page.locator('.b-notebook-entry').count()===n0&&/Vieux carnet/.test(await names()),'Carnet v3 relu tel quel au rechargement, sans doublon',n0+' '+(await names()));
  const n1=await legacy.page.locator('.b-notebook-entry').count();await legacy.page.reload({waitUntil:'load'});check(await legacy.page.locator('.b-notebook-entry').count()===n1,'Pas de migration en double');await legacy.ctx.close();
 });
 /* 8. Largeurs, clavier dans le tiroir, mouvement réduit */
 await group('Largeurs et accessibilité',async()=>{for(const w of [320,390,768,1024,1280,1440,1920]){const t=await fresh(w,{reducedMotion:w===390?'reduce':'no-preference'});await open(t.page);await t.page.locator('#calc-save').click();await t.page.locator('#calc-saved-open').click();await t.page.waitForTimeout(w===390?60:420);
   const r=await t.page.evaluate(()=>{const d=document.getElementById('calc-drawer'),b=d.getBoundingClientRect(),inner=d.querySelector('.calc-drawer-in');return {doc:document.documentElement.scrollWidth-document.documentElement.clientWidth,inside:inner.scrollWidth-inner.clientWidth,right:Math.round(b.right-innerWidth),width:Math.round(b.width),targets:[...d.querySelectorAll('button,input[type=checkbox],label.calc-button')].filter(e=>e.offsetParent).map(e=>{const q=(e.matches('input[type=checkbox]')?e.closest('label'):e).getBoundingClientRect();return Math.min(q.width,q.height);}).filter(x=>x<44).length};});
   check(r.doc<=0&&r.inside<=0&&r.right===0,w+' px : tiroir sans débordement, collé à droite',JSON.stringify(r));check(r.targets===0,w+' px : boutons du tiroir d’au moins 44 px',String(r.targets));
   await t.page.screenshot({path:path.join(out,'tiroir-'+w+'.png')});
   if(w===390){const anim=await t.page.evaluate(()=>document.getAnimations().filter(a=>a.playState==='running').length);check(anim===0,'Mouvement réduit : le tiroir s’ouvre sans animation',String(anim));}
   if(w===1440){await t.page.keyboard.press('Tab');const inside=await t.page.evaluate(()=>!!document.activeElement?.closest('#calc-drawer'));check(inside,'Clavier : Tab reste dans le tiroir ouvert');
    const names=await t.page.evaluate(()=>[...document.querySelectorAll('#calc-drawer button,#calc-drawer input')].filter(e=>e.offsetParent).filter(e=>!(e.getAttribute('aria-label')||e.textContent.trim()||(e.id&&document.querySelector('label[for="'+e.id+'"]'))||e.closest('label'))).length);check(names===0,'Noms accessibles : chaque bouton et champ du tiroir a un nom',String(names));}
   await t.ctx.close();}
 });
 /* 9. Contrastes AA de chaque texte visible, dans chaque outil et chaque mode, puis dans le tiroir (v7.47 : la phrase
    réponse de « Mes activités » était blanche sur une carte claire) */
 await group('Contrastes',async()=>{const t=await fresh(1280);await open(t.page);const scan=sel=>t.page.evaluate(sel=>{
   const col=c=>{const m=(c.match(/[\d.]+/g)||[]).map(Number);return m.length<3?null:m;};
   function bg(el){while(el){const cs=getComputedStyle(el);if(cs.backgroundImage.includes('gradient')){const g=cs.backgroundImage.match(/rgba?\([^)]+\)/);if(g)return col(g[0]);}const c=col(cs.backgroundColor);if(c&&(c.length<4||c[3]>.5))return c;el=el.parentElement;}return [255,255,255];}
   const lum=c=>{const v=c.slice(0,3).map(x=>{x/=255;return x<=.03928?x/12.92:Math.pow((x+.055)/1.055,2.4);});return .2126*v[0]+.7152*v[1]+.0722*v[2];};
   const bad=[];document.querySelectorAll(sel).forEach(el=>{if(![...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim()))return;const r=el.getBoundingClientRect();if(!r.width||!r.height)return;const cs=getComputedStyle(el);if(cs.visibility==='hidden'||+cs.opacity===0)return;
    const a=lum(col(cs.color)),b=lum(bg(el)),ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05),size=parseFloat(cs.fontSize),big=size>=24||(size>=18.66&&+cs.fontWeight>=700);if(ratio<(big?3:4.5))bad.push(ratio.toFixed(2)+' «'+el.textContent.trim().slice(0,40)+'»');});return bad;},sel);
  const bad=[];for(const m of ['quick','guided','advanced']){await mode(t.page,m);for(const id of Object.keys(TOOLS)){await tab(t.page,id);await t.page.waitForTimeout(250);bad.push(...(await scan('#panel-'+id+' *')).map(x=>({quick:'Simple',guided:'Pas à pas',advanced:'Expert'})[m]+'/'+id+' '+x));}}
  check(!bad.length,'Contrastes AA : chaque texte des 9 panneaux, dans les 3 modes',[...new Set(bad)].slice(0,8).join(' | '));
  await t.page.locator('#calc-save').click();await t.page.locator('#calc-saved-open').click();await t.page.waitForTimeout(450);const d=await scan('#calc-drawer *');check(!d.length,'Contrastes AA : le tiroir « Mes calculs enregistrés »',d.slice(0,6).join(' | '));await t.ctx.close();});
 check(!errors.length,'Aucune erreur console',[...new Set(errors)].join(' | '));check(!failedRequests.length,'Aucune requête en échec',[...new Set(failedRequests)].join(' | '));
 await ctx.close();
})().catch(e=>check(false,'Arrêt inattendu',e.stack)).finally(async()=>{if(browser)await browser.close();server.close();lines.push(`SUMMARY ${passed} passed; ${failed} failed.`);console.log(lines.at(-1));fs.writeFileSync(path.join(out,'parcours.txt'),lines.join('\n')+'\n');if(failed)process.exitCode=1;});
