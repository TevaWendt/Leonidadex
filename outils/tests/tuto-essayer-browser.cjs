#!/usr/bin/env node
'use strict';
/* Tuto (v7.53, revue de conformité) : chaque bouton « Essayer » et le formulaire de démarrage ouvrent le bon outil, dans le bon
   mode, avec le retour vers le bon chapitre et sans erreur ; les exemples et exercices écrits dans le Tuto donnent bien la
   réponse annoncée (même calculateur, chiffres de l’exemple). Chaque contrôle est compté.
   Usage : NODE_PATH=<dépendances>/node_modules node outils/tests/tuto-essayer-browser.cjs
   Variables : QA_CHROMIUM=<chemin d’un Chromium déjà installé>. */
const {chromium}=require('playwright');
const fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const root=path.resolve(process.env.SITE_ROOT||path.join(__dirname,'../..'));
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.svg':'image/svg+xml','.png':'image/png','.json':'application/json','.woff2':'font/woff2'};
const server=http.createServer((req,res)=>{let n=decodeURIComponent(new URL(req.url,'http://local').pathname);if(n==='/')n='/index.html';const file=path.join(root,n);if(file.startsWith(root)&&fs.existsSync(file)&&fs.statSync(file).isFile()){res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});res.end(fs.readFileSync(file));}else{res.writeHead(404);res.end('404');}});
let pass=0,fail=0;const ok=(c,label,extra)=>{if(c){pass++;console.log('PASS '+label);}else{fail++;console.log('FAIL '+label+(extra!==undefined?' — '+JSON.stringify(extra).slice(0,300):''));}};
const setv=(id,v)=>`(()=>{const el=document.getElementById('${id}');if(!el)return;el.value='${v}';el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));})()`;
const pick=(id,q)=>`(()=>{const s=document.getElementById('${id}');s.focus();s.value='${q}';s.dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('#${id}-list [data-b-suggestion="0"]')?.click();})()`;
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({...(process.env.QA_CHROMIUM?{executablePath:process.env.QA_CHROMIUM}:{}),args:['--no-sandbox','--disable-background-networking']});
 const tuto=fs.readFileSync(path.join(root,'tuto.html'),'utf8');
 const links=[...new Set([...tuto.matchAll(/href="(\/calculateurs\.html\?[^"]+)"/g)].map(m=>m[1].replace(/&amp;/g,'&')))];
 ok(links.length>=12,'Le Tuto a un bouton « Essayer » par chapitre ('+links.length+')',links.length);
 for(const href of links){const q=new URLSearchParams(href.split('?')[1].split('#')[0]);const ctx=await browser.newContext({viewport:{width:1280,height:900}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.goto(base+href,{waitUntil:'load'});await p.waitForTimeout(500);
  const r=await p.evaluate(()=>({tab:(document.querySelector('[role=tab][aria-selected=true]')||{}).id||'',back:(()=>{const b=document.getElementById('calc-tuto-return');return b&&!b.hidden?b.getAttribute('href'):null;})()}));
  ok(r.tab==='tab-'+q.get('tool')&&r.back&&r.back.endsWith('tuto.html#'+q.get('chapter'))&&!errs.length,'« Essayer » '+q.get('chapter')+' → '+q.get('tool')+' et retour au chapitre',{r,errs});await ctx.close();}
 {const ctx=await browser.newContext({viewport:{width:1280,height:900}});const p=await ctx.newPage();await p.goto(base+'/tuto.html',{waitUntil:'load'});
  await p.evaluate(()=>document.querySelector('.t-start-form').submit());await p.waitForLoadState('load');await p.waitForTimeout(600);
  const t=await p.evaluate(()=>document.getElementById('goal-results').innerText.replace(/\s+/g,' '));ok(/Il te manque 800\s000 \$/.test(t)&&/8 jours/.test(t),'Formulaire « Ton premier calcul » : la réponse annoncée',t.slice(0,160));await ctx.close();}
 async function tool(t,steps,sel){const ctx=await browser.newContext({viewport:{width:1280,height:900}});const p=await ctx.newPage();await p.goto(base+'/calculateurs.html?tool='+t+'#atelier',{waitUntil:'load'});await p.waitForTimeout(400);
  for(const s of steps){await p.evaluate(s);await p.waitForTimeout(250);}const text=await p.evaluate(s=>document.querySelector(s).innerText.replace(/\s+/g,' '),sel);await ctx.close();return text;}
 let t=await tool('goal',[],'#goal-results');ok(/Il te manque 800\s000 \$\. En jouant 1 h par jour, tu y arrives en 8 jours/.test(t),'Mon objectif : exemple (8 jours)',t.slice(0,120));
 t=await tool('goal',[setv('f-goal-hourly','50000')],'#goal-results');ok(/16 h/.test(t),'Mon objectif : exercice (50 000 $/h → le temps double, 16 h)',t.slice(0,160));
 t=await tool('purchase',[setv('f-purchase-hourly','50000')],'#purchase-results');ok(/Oui, tu peux l’acheter maintenant/.test(t)&&/2 h/.test(t),'Mes achats : exemple (2 h pour regagner le prix)',t.slice(0,200));
 t=await tool('purchase',[setv('f-purchase-hourly','50000'),setv('f-purchase-price','400000')],'#purchase-results');ok(/il te manque 200\s000 \$/i.test(t)&&/4 h/.test(t),'Mes achats : exercice (400 000 $ → manque 200 000 $, 4 h)',t.slice(0,240));
 t=await tool('order',[setv('order-hourly','50000'),pick('order-search','fe'),setv('order-price-0','30000'),pick('order-search','kam'),setv('order-price-1','100000'),pick('order-search','bati'),setv('order-price-2','150000')],'#order-results');
 ok(/Tout est à toi en 1 h 36 de jeu/.test(t),'Quoi acheter d’abord ? : exemple (1 h 36)',t.slice(0,160));
 t=await tool('budget',[setv('budget-reserve','30000'),setv('f-budget-source','manual'),...[1,2,3,4].map(i=>setv('f-budget-allocations-'+i,'0')),setv('f-budget-extra','0'),setv('f-budget-allocations-0','140000')],'#budget-results');
 ok(/il te reste 30\s000 \$ de disponible/.test(t),'Mon budget : exemple (30 000 $ de disponible)',t.slice(0,160));
 t=await tool('budget',[setv('budget-reserve','30000'),setv('f-budget-source','manual'),...[1,2,3,4].map(i=>setv('f-budget-allocations-'+i,'0')),setv('f-budget-allocations-0','140000'),setv('f-budget-extra','50000')],'#budget-results');
 ok(/Il manque 20\s000 \$ pour couvrir les dépenses/.test(t),'Mon budget : exercice (+50 000 $ → il manque 20 000 $)',t.slice(0,160));
 console.log('\n'+pass+' contrôles réussis, '+fail+' en échec.');await browser.close();server.close();process.exitCode=fail?1:0;
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
