#!/usr/bin/env node
'use strict';
/* Check ultime du calculateur (v7.59) — parcours Chromium (Playwright) : CALC-05 (tactile, clavier), CALC-06 (largeurs
   360 → 1440 et seuil 700 px du résumé collant ; mouvement réduit ; sans JavaScript ; stockage indisponible),
   CALC-18 (latence à CPU ×4 : ouverture → première réponse, changement d'outil, saisie → réponse, business plan complet).
   Usage : NODE_PATH=<dépendances>/node_modules [LK_CHROMIUM=<chemin>] [SITE_ROOT=<racine>] node outils/tests/calculateurs-check-ultime-browser.cjs <dossier de sortie> [--latence-seulement]
   Écrit <sortie>/check-ultime-browser.txt, <sortie>/latence.json et des captures. Code de sortie 1 si un contrôle échoue. */
const fs=require('fs'),path=require('path'),http=require('http');const {chromium}=require('playwright');
const root=path.resolve(process.env.SITE_ROOT||path.join(__dirname,'../..')),out=path.resolve(process.argv[2]||path.join(root,'../../qa/check-ultime'));fs.mkdirSync(out,{recursive:true});
const latencyOnly=process.argv.includes('--latence-seulement');
const vercel=JSON.parse(fs.readFileSync(path.join(root,'vercel.json'),'utf8')),HDR=Object.fromEntries((vercel.headers.find(r=>r.source==='/(.*)')?.headers||[]).map(h=>[h.key,h.value]));
const MIME={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.woff2':'font/woff2','.txt':'text/plain','.xml':'application/xml'};
const server=http.createServer((req,res)=>{let p;try{p=decodeURIComponent(new URL(req.url,'http://x').pathname);}catch{res.writeHead(400).end();return;}if(p.endsWith('/'))p+='index.html';const f=path.join(root,p);if(!f.startsWith(root)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){res.writeHead(404,HDR).end();return;}res.writeHead(200,{...HDR,'content-type':MIME[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(res);});
const lines=[];let passed=0,failed=0,browser,base;
function check(ok,label,detail=''){ok?passed++:failed++;const t=(ok?'PASS ':'FAIL ')+label+(detail&&!ok?' — '+String(detail).slice(0,300):'');lines.push(t);console.log(t);}
const H=require('./check-ultime-helper.cjs');const B=require(path.join(root,'calculateurs-scenario.js'));
const {D,catalogue,sourceActivities,presets}=H.siteData(),DV=H.dataVersion(D,catalogue,sourceActivities),initial=B.initial(DV,presets);
const TOOLS=['goal','purchase','session','budget','order','roi','activities','compare','plan'];
const seed=(s)=>({'lk-calculator-v1':JSON.stringify({...s,dataVersion:DV})});
async function open(ctx,url,storage={}){const page=await ctx.newPage();page.on('console',m=>{if(m.type()==='error')lines.push('CONSOLE '+url+' : '+m.text());});page.on('pageerror',e=>{lines.push('PAGEERROR '+url+' : '+e.message);failed++;});
 await page.goto(base+'/calculateurs.html',{waitUntil:'domcontentloaded'});await page.evaluate(st=>{for(const [k,v] of Object.entries(st))localStorage.setItem(k,v);},storage);await page.goto(base+url,{waitUntil:'load'});await page.waitForSelector('#calc-panels .calc-panel',{timeout:15000});return page;}
async function layout(page,label){const r=await page.evaluate(()=>{const W=innerWidth,out={overflow:document.documentElement.scrollWidth-W,offscreen:[],hiddenInputs:[],truncated:[],small:[]};
  const vis=el=>{const cs=getComputedStyle(el);if(cs.display==='none'||cs.visibility==='hidden')return false;const r=el.getBoundingClientRect();return r.width>0&&r.height>0;};
  const panel=document.querySelector('.calc-panel:not([hidden])');
  (panel?panel.querySelectorAll('button,input,select,a,textarea'):[]).forEach(el=>{if(!vis(el))return;const r=el.getBoundingClientRect();if(r.right>W+1||r.left<-1)out.offscreen.push((el.id||el.className||el.tagName)+' '+Math.round(r.left)+'→'+Math.round(r.right));if(/^(button|a)$/i.test(el.tagName)&&r.height<24)out.small.push((el.id||el.textContent.trim().slice(0,30))+' h='+Math.round(r.height));});
  const expertMode=document.getElementById('calc-panels').dataset.mode==='advanced';(panel?panel.querySelectorAll('.calc-step:not(.is-off) input[data-field],.calc-step:not(.is-off) select[data-field]'):[]).forEach(el=>{if(el.closest('[hidden]'))return;if(!expertMode&&el.closest('.b-expert'))return;if(el.closest('details:not([open])'))return;if(!vis(el))out.hiddenInputs.push(el.id||el.dataset.field);});
  document.querySelectorAll('.calc-panel:not([hidden]) *').forEach(el=>{const cs=getComputedStyle(el);if(cs.textOverflow==='ellipsis'&&cs.overflow!=='visible'&&el.scrollWidth>el.clientWidth+1&&vis(el)&&el.textContent.trim())out.truncated.push((el.className||el.tagName)+' : '+el.textContent.trim().slice(0,40));});
  return out;});
 check(r.overflow<=1,label+' : aucun défilement horizontal','débordement de '+r.overflow+' px');check(!r.offscreen.length,label+' : aucun bouton ni case hors écran',r.offscreen.slice(0,5).join(' ; '));check(!r.hiddenInputs.length,label+' : aucune case masquée dans l’étape visible',r.hiddenInputs.join(', '));check(!r.truncated.length,label+' : aucun texte tronqué',r.truncated.slice(0,5).join(' ; '));check(!r.small.length,label+' : aucun bouton écrasé',r.small.slice(0,5).join(' ; '));}
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({...(process.env.LK_CHROMIUM?{executablePath:process.env.LK_CHROMIUM}:{}),args:['--no-sandbox','--disable-background-networking','--disable-features=Translate']});
 const full=H.planWithMissions(B,H.baseState(B,initial,catalogue));
 if(!latencyOnly){
  /* ---- CALC-06 : largeurs ---- */
  for(const W of [360,390,700,701,768,1024,1280,1440]){const ctx=await browser.newContext({viewport:{width:W,height:860},deviceScaleFactor:1,hasTouch:W<800});
   const page=await open(ctx,'/calculateurs.html#atelier',seed(full));
   for(const tool of TOOLS){await page.click('#tab-'+tool);for(const mode of ['quick','guided','advanced']){await page.click('.calc-mode-switch [data-mode="'+mode+'"]');await page.waitForTimeout(60);await layout(page,W+' px · '+B.names[tool]+' · '+mode);}}
   /* résumé collant : visible seulement ≤ 700 px, quand la réponse n'est pas à l'écran */
   await page.click('#tab-goal');await page.click('.calc-mode-switch [data-mode="quick"]');await page.waitForTimeout(500);await page.evaluate(()=>{const y=document.getElementById('panel-goal').getBoundingClientRect().top+scrollY+40;window.scrollTo(0,y);});await page.waitForTimeout(600);
   const sticky=await page.evaluate(()=>{const s=document.querySelector('.lk-sticky');if(!s)return {exists:false};const cs=getComputedStyle(s);const res=document.getElementById('goal-results').getBoundingClientRect();return {exists:true,hidden:s.hidden,display:cs.display,text:s.textContent.trim(),resultVisible:res.top<innerHeight&&res.bottom>0};});
   if(W<=700)check(sticky.exists&&(sticky.display!=='none'||sticky.resultVisible),W+' px : le résumé collant est là quand la réponse n’est pas visible',JSON.stringify(sticky));else check(sticky.exists&&sticky.display==='none',W+' px : pas de résumé collant au-dessus de 700 px',JSON.stringify(sticky));
   if(W<=700&&sticky.display!=='none'){const y0=await page.evaluate(()=>scrollY);await page.click('#lk-sticky-go');await page.waitForTimeout(1500);const now=await page.evaluate(()=>{const r=document.getElementById('goal-results').getBoundingClientRect();return {visible:r.top<innerHeight&&r.bottom>0,moved:scrollY,focus:document.activeElement&&document.activeElement.id};});check(now.visible||now.moved!==y0,W+' px : « Voir ma réponse » du résumé collant amène à la réponse',JSON.stringify({y0,...now}));}
   if(W===390){/* tactile : une puce au doigt, un onglet au doigt */await page.tap('#panel-goal [data-target="500000"]');await page.waitForTimeout(80);check(await page.getAttribute('#panel-goal [data-target="500000"]','aria-pressed')==='true','390 px : une puce répond au doigt (aria-pressed)');await page.tap('#tab-session');check(await page.getAttribute('#tab-session','aria-selected')==='true','390 px : un onglet répond au doigt');await page.screenshot({path:path.join(out,'390-session.png'),fullPage:false});}
   if(W===360||W===1440){await page.click('#tab-plan');await page.click('.calc-mode-switch [data-mode="advanced"]');await page.click('[data-b-fold-all="open"]');await page.waitForTimeout(100);await layout(page,W+' px · plan Expert tout déplié');await page.screenshot({path:path.join(out,W+'-plan-expert.png'),fullPage:true});}
   await ctx.close();}
  /* ---- CALC-05 : clavier dans Chromium (Tab parcourt les onglets, flèches, Entrée sur une puce) ---- */
  {const ctx=await browser.newContext({viewport:{width:1280,height:900}});const page=await open(ctx,'/calculateurs.html#atelier',seed(full));
   await page.focus('#tab-goal');await page.keyboard.press('ArrowRight');check(await page.evaluate(()=>document.activeElement.id)==='tab-purchase','clavier : → déplace le focus sur l’onglet suivant');check(await page.getAttribute('#tab-purchase','aria-selected')==='true','clavier : l’onglet suivant est ouvert');await page.keyboard.press('End');check(await page.evaluate(()=>document.activeElement.id)==='tab-plan','clavier : Fin va au dernier onglet');await page.keyboard.press('Home');
   await page.keyboard.press('Tab');const after=await page.evaluate(()=>document.activeElement.id||document.activeElement.className);check(after!=='tab-purchase','clavier : Tab quitte la barre d’onglets (un seul arrêt)',after);
   await page.focus('#panel-goal [data-target="5000000"]');await page.keyboard.press('Enter');await page.waitForTimeout(80);check(await page.inputValue('#f-goal-target')==='5000000'||await page.inputValue('#f-goal-target')==='5 000 000','clavier : Entrée sur une puce l’applique');
   const focusVisible=await page.evaluate(()=>{const el=document.activeElement;const cs=getComputedStyle(el);return cs.outlineStyle!=='none'||cs.boxShadow!=='none';});check(focusVisible,'clavier : le focus est visible sur la puce');
   /* clic pendant une animation : deux clics rapides sur un point repliable = refermé, état cohérent */
   await page.click('[data-fold-head="goal-assumptions"]');await page.click('[data-fold-head="goal-assumptions"]');await page.waitForTimeout(400);const fold=await page.evaluate(()=>({exp:document.querySelector('[data-fold-head="goal-assumptions"]').getAttribute('aria-expanded'),hid:document.getElementById('fold-goal-assumptions').hidden}));check(fold.exp==='false'&&fold.hid===true,'double clic rapide sur un point : refermé, aria-expanded exact',JSON.stringify(fold));
   await ctx.close();}
  /* ---- CALC-06 : mouvement réduit ---- */
  {const ctx=await browser.newContext({viewport:{width:1280,height:900},reducedMotion:'reduce'});const page=await open(ctx,'/calculateurs.html?tool=goal#atelier',seed(full));
   const motion=await page.evaluate(()=>document.querySelector('.calculator-page')?.dataset.cMotion);check(motion==='off','mouvement réduit : animations coupées (data-c-motion=off)',motion);
   await page.fill('#f-goal-capital','50000');const t0=Date.now();const shown=await page.evaluate(()=>{const m=document.querySelector('#goal-results .calc-result-main');const o=m.querySelector('[data-display]');return {text:m.textContent.trim(),overlay:o?o.dataset.display:null};});
   check(/\d+ h|\d+ min|C’est bon/.test(shown.text)&&(!shown.overlay||shown.text.includes(shown.overlay)),'mouvement réduit : le compteur montre la valeur finale tout de suite ('+(Date.now()-t0)+' ms)',JSON.stringify(shown));
   const anims=await page.evaluate(()=>document.getAnimations().filter(a=>a.playState==='running').length);check(anims===0,'mouvement réduit : aucune animation en cours',anims+' animation(s)');
   await ctx.close();}
  /* ---- CALC-06 : sans JavaScript ---- */
  {const ctx=await browser.newContext({viewport:{width:1280,height:900},javaScriptEnabled:false});const page=await ctx.newPage();await page.goto(base+'/calculateurs.html',{waitUntil:'load'});
   const txt=await page.evaluate(()=>({warn:[...document.querySelectorAll('noscript')].map(n=>n.textContent).join(' '),panels:document.getElementById('calc-panels').children.length,bodyW:document.documentElement.scrollWidth-innerWidth}));
   check(/Active JavaScript/.test(txt.warn),'sans JavaScript : message honnête présent');check(txt.panels===0&&txt.bodyW<=1,'sans JavaScript : rien de cassé, pas de débordement');
   const noscriptVisible=await page.evaluate(()=>{const n=document.querySelector('#calc-panels + noscript, noscript');return !!n;});check(noscriptVisible,'sans JavaScript : le bloc noscript est dans la page');await page.screenshot({path:path.join(out,'sans-js.png')});await ctx.close();}
  /* ---- CALC-06 / CALC-08 : stockage indisponible ---- */
  {const ctx=await browser.newContext({viewport:{width:1280,height:900},acceptDownloads:true});await ctx.addInitScript(()=>{const broken={getItem(){throw new Error('blocked');},setItem(){throw new Error('blocked');},removeItem(){throw new Error('blocked');},clear(){},key(){return null;},length:0};Object.defineProperty(window,'localStorage',{get(){return broken;}});});
   const page=await ctx.newPage();page.on('pageerror',e=>{lines.push('PAGEERROR stockage : '+e.message);failed++;});await page.goto(base+'/calculateurs.html?tool=goal#atelier',{waitUntil:'load'});await page.waitForSelector('#goal-results .calc-answer');
   await page.fill('#f-goal-capital','123000');await page.waitForTimeout(200);const live=await page.textContent('#calc-live');check(/Impossible d’enregistrer|ne garde rien/.test(live),'stockage bloqué : le visiteur est prévenu',live);
   check(/Il te manque/.test(await page.textContent('#goal-results')),'stockage bloqué : le calcul répond quand même');
   await ctx.grantPermissions(['clipboard-read','clipboard-write']);await page.click('#calc-share');await page.waitForTimeout(400);const shareText=await page.textContent('#calc-share');const url=page.url();check(/Lien copié|Partager/.test(shareText)&&url.includes('#plan='),'stockage bloqué : le lien de partage est produit (barre d’adresse)',shareText+' '+url.slice(0,60));
   await page.click('[data-saved-open]');await page.waitForSelector('#calc-export',{state:'visible'});const [dl]=await Promise.all([page.waitForEvent('download',{timeout:5000}).catch(()=>null),page.click('#calc-export')]);check(!!dl&&dl.suggestedFilename()==='leonidakit-calcul.json','stockage bloqué : le téléchargement du calcul part');
   await ctx.close();}
 }
 /* ---- CALC-18 : latence à CPU ×4 ---- */
 {const ctx=await browser.newContext({viewport:{width:1280,height:900}});const page=await ctx.newPage();const cdp=await ctx.newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
  const lat={};const runs=Number(process.env.LK_LATENCE_RUNS)||3; /* LK_LATENCE_RUNS=7 pour une médiane plus stable */const med=a=>{const b=a.slice().sort((x,y)=>x-y);return b[Math.floor(b.length/2)];};
  const open1=[],first=[],switchT=[],typeT=[],planT=[];
  for(let i=0;i<runs;i+=1){await page.goto('about:blank');await page.goto(base+'/calculateurs.html',{waitUntil:'domcontentloaded'});await page.evaluate(st=>{for(const [k,v] of Object.entries(st))localStorage.setItem(k,v);},seed(full));
   const t0=Date.now();await page.goto(base+'/calculateurs.html?tool=goal#atelier',{waitUntil:'domcontentloaded'});await page.waitForSelector('#goal-results .calc-answer');open1.push(Date.now()-t0);
   const nav=await page.evaluate(()=>{const n=performance.getEntriesByType('navigation')[0];return {dcl:n.domContentLoadedEventEnd,load:n.loadEventEnd};});first.push(nav.dcl);
   const ts=await page.evaluate(()=>{const t=performance.now();document.getElementById('tab-roi').click();return performance.now()-t;});switchT.push(ts);
   await page.click('#tab-goal');const tt=await page.evaluate(()=>{const el=document.getElementById('f-goal-capital');const before=document.querySelector('#goal-results .calc-answer').textContent;const t=performance.now();el.value='333333';el.dispatchEvent(new Event('input',{bubbles:true}));const after=document.querySelector('#goal-results .calc-answer').textContent;return {ms:performance.now()-t,changed:after!==before};});typeT.push(tt.ms);
   const tp=await page.evaluate(()=>{const t=performance.now();document.getElementById('tab-plan').click();document.querySelector('.calc-mode-switch [data-mode="advanced"]').click();document.querySelector('[data-b-fold-all="open"]').click();return performance.now()-t;});planT.push(tp);await page.click('.calc-mode-switch [data-mode="quick"]');}
  lat['ouverture → première réponse (ms, navigation comprise)']=med(open1);lat['DOMContentLoaded (ms)']=Math.round(med(first));lat['changement d’outil (ms, Ça vaut le coup ?)']=Math.round(med(switchT)*10)/10;lat['saisie → réponse (ms, Mon objectif)']=Math.round(med(typeT)*10)/10;lat['business plan complet, Expert tout déplié (ms)']=Math.round(med(planT)*10)/10;
  fs.writeFileSync(path.join(out,'latence.json'),JSON.stringify({cpuThrottling:4,runs,median:lat,raw:{open1,first,switchT,typeT,planT}},null,2));for(const [k,v] of Object.entries(lat)){lines.push('LATENCE '+k+' : '+v);console.log('LATENCE '+k+' : '+v);}
  await ctx.close();}
 await browser.close();server.close();
 lines.push('SUMMARY '+passed+' passed; '+failed+' failed.');console.log('SUMMARY '+passed+' passed; '+failed+' failed.');fs.writeFileSync(path.join(out,'check-ultime-browser.txt'),lines.join('\n')+'\n');process.exit(failed?1:0);
})().catch(e=>{console.error('FAIL Arrêt inattendu — '+e.message);console.error(e);try{fs.writeFileSync(path.join(out,'check-ultime-browser.txt'),lines.join('\n')+'\nFAIL '+e.message+'\n');}catch{}process.exit(1);});
