#!/usr/bin/env node
'use strict';
/* Contrôle d’accessibilité (axe-core, règles WCAG 2.0 / 2.1 / 2.2 A et AA) et mesures de performance des pages de la
   mission (v7.52, lot 5). Chaque page est ouverte à 1280 et 390 px, avec un état de démonstration dans le stockage local
   pour que les carnets montrent des cartes. Mesures : octets transférés (sans compression du serveur local : plafond
   haut), DOMContentLoaded, load, plus grand élément affiché (LCP) et décalages de mise en page (CLS).
   Usage : NODE_PATH=<dépendances>/node_modules node outils/tests/accessibilite-perf-browser.cjs <dossier hors dépôt>
   Variables : QA_CHROMIUM=<chemin d’un Chromium déjà installé>. axe-core est une dépendance de développement hors dépôt. */
const {chromium}=require('playwright');
const fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const root=path.resolve(process.env.SITE_ROOT||path.join(__dirname,'../..')),out=path.resolve(process.argv[2]||path.join(require('node:os').tmpdir(),'leonidakit-a11y'));fs.mkdirSync(out,{recursive:true});
const axeSource=fs.readFileSync(require.resolve('axe-core/axe.min.js'),'utf8');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.svg':'image/svg+xml','.png':'image/png','.json':'application/json','.woff2':'font/woff2'};
const cfg=JSON.parse(fs.readFileSync(root+'/vercel.json')),headers=Object.fromEntries(cfg.headers.find(r=>r.source==='/(.*)').headers.map(h=>[h.key,h.value]));
const server=http.createServer((req,res)=>{let n=decodeURIComponent(new URL(req.url,'http://local').pathname);if(n==='/')n='/index.html';const file=path.join(root,n);if(file.startsWith(root)&&fs.existsSync(file)&&fs.statSync(file).isFile()){res.writeHead(200,{...headers,'Content-Type':mime[path.extname(file)]||'application/octet-stream'});res.end(fs.readFileSync(file));}else{res.writeHead(404);res.end('404');}});
const PAGES=['/index.html','/calculateurs.html','/vehicules.html','/vehicules/karin-sultan.html','/armes.html','/armes/girardi-es9.html','/style.html','/nourriture.html','/personnalisations.html','/achats.html','/progression.html',
 '/carnets/garage.html','/carnets/arsenal.html','/carnets/garde-robe.html','/carnets/consommables.html','/carnets/personnalisations.html','/carnets/proprietes.html','/carnets/lieux.html','/carnets/collectibles.html','/carnets/calculs.html','/carte.html','/tuto.html'];
const now=new Date().toISOString();
const STORE={lk_own_vehicules:'{"albany-emperor":1,"karin-sultan":1}',lk_own_armes:'{"girardi-es9":1}',lk_own_munitions:'{"cartouches":1}',lk_own_consommables:'{"sprunk":1}',lk_own_tenues:'{"milliers-de-tenues":1}','lk_own_perso-armes':'{"silencieux":1}',
 lk_map_found:'{"vice-city":true}',lk_wish_v1:JSON.stringify({version:1,items:{'vehicules:vapid-dominator':{at:now,from:'fiche'},'styles:imprimes-stock-305':{at:now,from:'catalogue'}}}),lk_stock_v1:JSON.stringify({version:1,items:{'consommables:sprunk':{q:2,at:now}}})};
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({...(process.env.QA_CHROMIUM?{executablePath:process.env.QA_CHROMIUM}:{}),args:['--no-sandbox','--disable-background-networking']});
 const report={date:new Date().toISOString(),pages:[]};let violations=0;
 for(const w of [1280,390]){
  for(const url of PAGES){const ctx=await browser.newContext({viewport:{width:w,height:w<700?844:900},bypassCSP:true});
   await ctx.addInitScript(s=>{try{if(!sessionStorage.getItem('__qa')){for(const k in s)localStorage.setItem(k,s[k]);sessionStorage.setItem('__qa','1');}}catch(e){}
     window.__lcp=0;window.__cls=0;try{new PerformanceObserver(l=>{for(const e of l.getEntries())window.__lcp=e.startTime;}).observe({type:'largest-contentful-paint',buffered:true});new PerformanceObserver(l=>{for(const e of l.getEntries())if(!e.hadRecentInput)window.__cls+=e.value;}).observe({type:'layout-shift',buffered:true});}catch(e){}},STORE);
   const p=await ctx.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
   await p.goto(base+url,{waitUntil:'load'});await p.waitForTimeout(1200);
   const perf=await p.evaluate(()=>{const n=performance.getEntriesByType('navigation')[0],res=performance.getEntriesByType('resource');const bytes=(n?n.encodedBodySize:0)+res.reduce((a,r)=>a+(r.encodedBodySize||0),0);return {bytes,requests:res.length+1,dcl:n?Math.round(n.domContentLoadedEventEnd):null,load:n?Math.round(n.loadEventEnd):null,lcp:Math.round(window.__lcp||0),cls:Math.round((window.__cls||0)*1000)/1000};});
   await p.addScriptTag({content:axeSource});
   const axe=await p.evaluate(async()=>{const r=await window.axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']},resultTypes:['violations']});return r.violations.map(v=>({id:v.id,impact:v.impact,help:v.help,nodes:v.nodes.length,targets:v.nodes.slice(0,3).map(n=>n.target.join(' '))}));});
   violations+=axe.length;report.pages.push({url,w,perf,axe,errors});
   console.log((axe.length?'A11Y ':'OK   ')+w+' '+url+' · '+Math.round(perf.bytes/1024)+' Ko, '+perf.requests+' req., DCL '+perf.dcl+' ms, LCP '+perf.lcp+' ms, CLS '+perf.cls+(axe.length?' · '+axe.map(v=>v.id+'×'+v.nodes).join(', '):'')+(errors.length?' · ERREUR '+errors.join(' | '):''));
   await ctx.close();}}
 fs.writeFileSync(path.join(out,'accessibilite-perf.json'),JSON.stringify(report,null,1));
 console.log('\n'+report.pages.length+' chargements, '+violations+' violations axe (WCAG A/AA), '+report.pages.filter(x=>x.errors.length).length+' pages avec erreur de script.');
 await browser.close();server.close();process.exitCode=violations?1:0;
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
