#!/usr/bin/env node
'use strict';
/* Zoom et fenêtres de faible hauteur (v7.53, revue de conformité). Un zoom du navigateur réduit la largeur utile en pixels
   CSS : 1 280 px à 200 % = 640 px, à 400 % = 320 px (règle WCAG « redistribution »). Contrôlé sur les pages de la mission :
   - aucun débordement horizontal de la page ;
   - l’en-tête et les barres qui restent collées en haut ne couvrent pas plus de 40 % de la hauteur de la fenêtre ;
   - le titre principal (h1) est atteignable et visible après défilement ;
   - le premier champ ou bouton de la page reçoit le focus au clavier et reste visible (pas caché sous une barre collée).
   Tailles : 640 × 360 (200 %), 320 × 256 (400 % d’un écran 1 280 × 1 024), 1 280 × 500 et 1 024 × 480 (fenêtres basses).
   Usage : NODE_PATH=<dépendances>/node_modules node outils/tests/zoom-hauteur-browser.cjs [dossier de sortie hors dépôt]
   Variables : QA_CHROMIUM=<chemin d’un Chromium déjà installé>. */
const {chromium}=require('playwright');
const fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const root=path.resolve(process.env.SITE_ROOT||path.join(__dirname,'../..')),out=process.argv[2]?path.resolve(process.argv[2]):null;if(out)fs.mkdirSync(out,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.svg':'image/svg+xml','.png':'image/png','.json':'application/json','.woff2':'font/woff2'};
const server=http.createServer((req,res)=>{let n=decodeURIComponent(new URL(req.url,'http://local').pathname);if(n==='/')n='/index.html';const file=path.join(root,n);if(file.startsWith(root)&&fs.existsSync(file)&&fs.statSync(file).isFile()){res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});res.end(fs.readFileSync(file));}else{res.writeHead(404);res.end('404');}});
const PAGES=['index.html','calculateurs.html?tool=plan','calculateurs.html?tool=compare','style.html','nourriture.html','armes.html','vehicules.html','achats.html','progression.html','carnets/garage.html','carnets/consommables.html','carte.html','tuto.html','vehicules/karin-sultan.html'];
const SIZES=[[640,360,'zoom 200 %'],[320,256,'zoom 400 %'],[1280,500,'fenêtre basse'],[1024,480,'fenêtre basse']];
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({...(process.env.QA_CHROMIUM?{executablePath:process.env.QA_CHROMIUM}:{}),args:['--no-sandbox','--disable-background-networking']});
 let fails=0,checks=0;const report=[];
 for(const [w,h,label] of SIZES){const ctx=await browser.newContext({viewport:{width:w,height:h}});const p=await ctx.newPage();
  for(const u of PAGES){try{await p.goto(base+'/'+u,{waitUntil:'load'});await p.waitForTimeout(400);
    const r=await p.evaluate(async()=>{const docW=document.documentElement.scrollWidth,vw=innerWidth;
      window.scrollTo({top:Math.min(600,document.documentElement.scrollHeight),behavior:'instant'});await new Promise(r=>setTimeout(r,250));
      let covered=0;for(const el of document.querySelectorAll('body *')){const cs=getComputedStyle(el);if((cs.position==='fixed'||cs.position==='sticky')&&cs.display!=='none'&&cs.visibility!=='hidden'&&!el.closest('dialog:not([open])')){const b=el.getBoundingClientRect();if(b.top<=2&&b.bottom>0&&b.width>innerWidth*0.5)covered=Math.max(covered,b.bottom);}}
      const h1=document.querySelector('h1');let h1ok=false;if(h1){h1.scrollIntoView({block:'center',behavior:'instant'});await new Promise(r=>setTimeout(r,300));const b=h1.getBoundingClientRect();let top=0;for(const el of document.querySelectorAll('body *')){const c=getComputedStyle(el);if((c.position==='fixed'||c.position==='sticky')&&c.display!=='none'&&c.visibility!=='hidden'){const q=el.getBoundingClientRect();if(q.top<=2&&q.width>innerWidth*0.5)top=Math.max(top,q.bottom);}}h1ok=b.height>0&&b.bottom>top&&b.top<innerHeight;}
      window.scrollTo({top:0,behavior:'instant'});return {overflow:docW>vw+1?docW-vw:0,covered:Math.round(covered),h1ok};});
    await p.keyboard.press('Tab');await p.keyboard.press('Tab');await p.waitForTimeout(1200);/* défilement doux jusqu’au champ */
    const f=await p.evaluate(()=>{const a=document.activeElement;if(!a||a===document.body)return {ok:true,what:'aucun'};const b=a.getBoundingClientRect();let top=0;for(const el of document.querySelectorAll('body *')){const cs=getComputedStyle(el);if((cs.position==='fixed'||cs.position==='sticky')&&!el.contains(a)&&cs.visibility!=='hidden'&&cs.display!=='none'){const q=el.getBoundingClientRect();if(q.top<=2&&q.width>innerWidth*0.5)top=Math.max(top,q.bottom);}}return {ok:b.bottom>top&&b.top<innerHeight,what:a.tagName.toLowerCase()+(a.id?'#'+a.id:'')};});
    const bad=[];if(r.overflow)bad.push('débordement de '+r.overflow+' px');if(r.covered>h*0.4)bad.push('barres collées : '+r.covered+' px sur '+h);if(!r.h1ok)bad.push('titre principal non atteignable');if(!f.ok)bad.push('focus caché ('+f.what+')');
    checks++;if(bad.length){fails++;console.log('ÉCHEC '+w+'×'+h+' ('+label+') /'+u+' · '+bad.join(' ; '));}else console.log('OK    '+w+'×'+h+' ('+label+') /'+u+' · collé '+r.covered+' px');
    report.push({w,h,label,u,...r,focus:f,bad});}
   catch(e){fails++;checks++;console.log('ERREUR '+w+'×'+h+' /'+u+' · '+e.message.split('\n')[0]);}}
  await ctx.close();}
 if(out)fs.writeFileSync(path.join(out,'zoom-hauteur.json'),JSON.stringify({date:new Date().toISOString(),report},null,1));
 console.log('\n'+(checks-fails)+' contrôles réussis, '+fails+' en échec ('+PAGES.length+' pages × '+SIZES.length+' tailles).');
 await browser.close();server.close();process.exitCode=fails?1:0;
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
