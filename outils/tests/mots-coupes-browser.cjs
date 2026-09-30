#!/usr/bin/env node
'use strict';
/* Mots coupés au milieu (v7.52, lot 5) : dans un vrai navigateur, aux largeurs 1 280, 1 024, 768, 390 et 320 px, cherche
   dans les boutons, liens, onglets, étiquettes, en-têtes de tableau et pastilles un mot dont les lettres tombent sur deux
   lignes ailleurs qu’après un trait d’union ou une apostrophe (« Obten / u », « Indica / tion »). L’audit de clôture ne voit
   pas ce défaut (rien ne déborde ni n’est masqué) : c’est le signe d’une colonne trop étroite. Un état de démonstration est
   écrit dans le stockage local pour que les boutons « Obtenu », les stocks et les envies soient affichés.
   Usage : NODE_PATH=<dépendances>/node_modules node outils/tests/mots-coupes-browser.cjs [dossier de sortie hors dépôt]
   Variables : QA_CHROMIUM=<chemin d’un Chromium déjà installé>. */
const {chromium}=require('playwright');
const fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const root=path.resolve(process.env.SITE_ROOT||path.join(__dirname,'../..')),out=process.argv[2]?path.resolve(process.argv[2]):null;if(out)fs.mkdirSync(out,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.svg':'image/svg+xml','.png':'image/png','.json':'application/json','.woff2':'font/woff2'};
const server=http.createServer((req,res)=>{let n=decodeURIComponent(new URL(req.url,'http://local').pathname);if(n==='/')n='/index.html';const file=path.join(root,n);if(file.startsWith(root)&&fs.existsSync(file)&&fs.statSync(file).isFile()){res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});res.end(fs.readFileSync(file));}else{res.writeHead(404);res.end('404');}});
const redirect=f=>/http-equiv="refresh"/.test(fs.readFileSync(path.join(root,f),'utf8'));
const PAGES=[...fs.readdirSync(root).filter(f=>f.endsWith('.html')&&!f.startsWith('google')&&f!=='404.html'&&!redirect(f)),
 ...fs.readdirSync(path.join(root,'carnets')).filter(f=>f.endsWith('.html')).map(f=>'carnets/'+f),
 'vehicules/karin-sultan.html','armes/girardi-es9.html','lieux/vice-city.html','personnages/jason-duval.html'].filter(f=>fs.existsSync(path.join(root,f)));
const now=new Date().toISOString();
const STORE={lk_own_vehicules:'{"albany-emperor":1,"karin-sultan":1}',lk_own_armes:'{"girardi-es9":1}',lk_own_munitions:'{"cartouches":1}',lk_own_consommables:'{"sprunk":1}',lk_own_tenues:'{"milliers-de-tenues":1}','lk_own_perso-armes':'{"silencieux":1}',
 lk_map_found:'{"vice-city":true}',lk_wish_v1:JSON.stringify({version:1,items:{'vehicules:vapid-dominator':{at:now,from:'fiche'},'styles:imprimes-stock-305':{at:now,from:'catalogue'}}}),lk_stock_v1:JSON.stringify({version:1,items:{'consommables:sprunk':{q:2,at:now}}})};
function scan(){
  const found=[];
  const rotated=el=>{for(let a=el;a&&a!==document.body;a=a.parentElement){const t=getComputedStyle(a).transform;if(t&&t!=='none'){const m=t.match(/matrix\(([^)]+)\)/);if(m){const v=m[1].split(',').map(Number);if(Math.abs(v[1])>0.001)return true;}}}return false;};
  for(const el of document.querySelectorAll('button,a,label,summary,[role=tab],th,.cat-conf,.ed-st,.cn-stamp,.track-bt')){
    if(!el.getClientRects().length||rotated(el))continue;
    const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);let n;
    while((n=walker.nextNode())){
      for(const m of n.textContent.matchAll(/[A-Za-zÀ-ÖØ-öø-ÿŒœ’'-]{4,}/g)){
        let prev=null,cut=-1;
        for(let i=0;i<m[0].length;i++){const r=document.createRange();r.setStart(n,m.index+i);r.setEnd(n,m.index+i+1);const rect=[...r.getClientRects()].find(x=>x.width>0);if(!rect)continue;const top=Math.round(rect.top);if(prev!==null&&Math.abs(top-prev)>2){cut=i;break;}prev=top;}
        if(cut>0&&!/[-’']/.test(m[0][cut-1]))found.push(m[0].slice(0,cut)+' | '+m[0].slice(cut)+' ('+el.tagName.toLowerCase()+(el.className&&typeof el.className==='string'?'.'+el.className.split(' ')[0]:'')+')');
      }
    }
  }
  return [...new Set(found)];
}
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({...(process.env.QA_CHROMIUM?{executablePath:process.env.QA_CHROMIUM}:{}),args:['--no-sandbox','--disable-background-networking']});
 const report=[];let total=0,loads=0;
 for(const w of [1280,1024,768,390,320]){
  const ctx=await browser.newContext({viewport:{width:w,height:900}});
  await ctx.addInitScript(s=>{try{if(!sessionStorage.getItem('__qa')){for(const k in s)localStorage.setItem(k,s[k]);sessionStorage.setItem('__qa','1');}}catch(e){}},STORE);
  const p=await ctx.newPage();
  for(const u of PAGES){
   try{await p.goto(base+'/'+u,{waitUntil:'load'});await p.waitForTimeout(350);const r=await p.evaluate(scan);loads++;
    if(r.length){total+=r.length;report.push({w,u,words:r});console.log('COUPÉ '+w+' /'+u+' · '+r.slice(0,6).join(' ; '));}}
   catch(e){report.push({w,u,error:e.message.split('\n')[0]});console.log('ERREUR '+w+' /'+u+' · '+e.message.split('\n')[0]);total++;}
  }
  await ctx.close();
 }
 if(out)fs.writeFileSync(path.join(out,'mots-coupes.json'),JSON.stringify({date:new Date().toISOString(),pages:PAGES.length,loads,report},null,1));
 console.log('\n'+PAGES.length+' pages × 5 largeurs = '+loads+' chargements ; '+total+' mot(s) coupé(s) au milieu.');
 await browser.close();server.close();process.exitCode=total?1:0;
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
