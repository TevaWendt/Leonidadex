'use strict';
/* v7.46 (lot 9) : contrôle navigateur de Contact et des Mentions (Chromium headless via Playwright, site servi en local).
   - contact.html et mentions-legales.html à 320, 390, 768, 1024, 1280, 1440, 1920 px, mouvement normal et réduit :
     0 erreur console, 0 débordement horizontal, captures pleine page ;
   - noms accessibles (arbre d'accessibilité de Chromium, comme un lecteur d'écran) de chaque champ et bouton ;
   - contrastes des textes (WCAG AA : 4,5:1, 3:1 pour les grands textes) sur les deux pages ;
   - formulaire au clavier : Tab jusqu'aux champs, saisie, Entrée → /api/contact servi par la vraie fonction
     (api/contact.js) avec un faux Brevo local (imitation : aucun e-mail réel sans BREVO_API_KEY), référence affichée ;
     puis clé absente → repli vers la messagerie ;
   - cibles tactiles des champs et boutons ≥ 44 px.
   Usage : NODE_PATH=<dépendances>/node_modules node outils/tests/contact-browser.cjs <dossier de sortie hors dépôt>
   (LK_CHROMIUM=<chemin> pour un Chromium déjà installé). */
const fs=require('fs'),path=require('path'),http=require('http');const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../..'),out=process.argv[2];if(!out){console.error('Usage : node outils/tests/contact-browser.cjs <dossier>');process.exit(2);}fs.mkdirSync(out,{recursive:true});
const API=require(path.join(root,'api/contact.js'));
const MIME={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2','.txt':'text/plain'};
let mode='ok';const brevoCalls=[];
const fakeBrevo=async(url,init)=>{brevoCalls.push({url,body:JSON.parse(init.body)});return {status:201,ok:true};};
const server=http.createServer((req,res)=>{const p0=decodeURIComponent(req.url.split('?')[0]);
 if(p0==='/api/contact'){const h=API.createHandler({env:mode==='ok'?{BREVO_API_KEY:'imitation-locale',CONTACT_TO:'boite@example.org'}:{},fetch:fakeBrevo});return h(req,res);}
 let p=p0;if(p.endsWith('/'))p+='index.html';const f=path.join(root,p);if(!f.startsWith(root)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){res.writeHead(404);res.end();return;}res.writeHead(200,{'content-type':MIME[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(res);});
const widths=[320,390,768,1024,1280,1440,1920],pages=[['contact','/contact.html'],['mentions','/mentions-legales.html']];
const report={date:new Date().toISOString(),widths:{},names:{},contrast:{},keyboard:{},fallback:{},targets:{},consoleErrors:[]};
/* contraste : couleur du texte contre le premier fond opaque des ancêtres ; les textes posés sur une image sont comptés à part */
const contrastScript=()=>{const lum=c=>{const [r,g,b]=c.map(v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4);});return .2126*r+.7152*g+.0722*b;};const parse=s=>{const m=s.match(/rgba?\(([^)]+)\)/);if(!m)return null;const p=m[1].split(',').map(x=>parseFloat(x));return {c:p.slice(0,3),a:p.length>3?p[3]:1};};
 const res={checked:0,skippedImage:0,fails:[]};const seen=new Set();
 for(const el of document.querySelectorAll('main *, footer *')){if(![...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim().length>1))continue;const cs=getComputedStyle(el);if(cs.visibility==='hidden'||cs.display==='none'||parseFloat(cs.opacity)<0.1)continue;const r=el.getBoundingClientRect();if(!r.width||!r.height)continue;if(el.closest('[aria-hidden="true"],.trap'))continue;
  const fg=parse(cs.color);let bg=null,img=false;for(let n=el;n;n=n.parentElement){const s=getComputedStyle(n);if(s.backgroundImage&&s.backgroundImage!=='none'&&!/gradient/.test(s.backgroundImage)){img=true;break;}const b=parse(s.backgroundColor);if(b&&b.a>=0.9){bg=b;break;}}
  if(img){res.skippedImage++;continue;}if(!bg)bg={c:[253,251,247],a:1};const L1=lum(fg.c),L2=lum(bg.c),ratio=(Math.max(L1,L2)+.05)/(Math.min(L1,L2)+.05);const size=parseFloat(cs.fontSize),bold=parseInt(cs.fontWeight)>=700,large=size>=24||(bold&&size>=18.66);res.checked++;
  if(ratio<(large?3:4.5)){const key=el.tagName+'|'+cs.color+'|'+cs.backgroundColor;if(!seen.has(key)){seen.add(key);res.fails.push({tag:el.tagName.toLowerCase(),cls:el.className&&String(el.className).slice(0,40),text:el.textContent.trim().slice(0,40),ratio:+ratio.toFixed(2),size});}}}
 return res;};
(async()=>{
 await new Promise(r=>server.listen(0,r));const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({...(process.env.LK_CHROMIUM?{executablePath:process.env.LK_CHROMIUM}:{}),args:['--no-sandbox']});
 /* le scénario « clé absente » provoque volontairement une réponse 503 : Chromium la journalise (« Failed to load resource »), elle est comptée à part */
 const attach=(page,label)=>{page.on('console',m=>{if(m.type()!=='error')return;if(label==='clavier-sans-cle'&&/status of 503/.test(m.text())){report.expected503=(report.expected503||0)+1;return;}report.consoleErrors.push(label+' '+m.text());});page.on('pageerror',e=>report.consoleErrors.push(label+' '+e));};
 /* 1. largeurs, mouvement normal et réduit */
 for(const [name,url] of pages){report.widths[name]={};for(const w of widths)for(const motion of ['no-preference','reduce']){const ctx=await browser.newContext({viewport:{width:w,height:w<600?780:900},reducedMotion:motion});const page=await ctx.newPage();attach(page,name+'@'+w+'/'+motion);await page.goto(base+url,{waitUntil:'load'});
  await page.evaluate(async()=>{for(let y=0;y<document.body.scrollHeight;y+=500){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,60));}window.scrollTo(0,0);});await page.waitForTimeout(motion==='reduce'?100:900);
  const r=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,hidden:[...document.querySelectorAll('main h2, main h3, main p, main li')].filter(e=>{const s=getComputedStyle(e);const b=e.getBoundingClientRect();return b.height>0&&parseFloat(s.opacity)<0.5;}).length}));
  report.widths[name][w+'/'+motion]=r;if(motion==='reduce'||w===1280)await page.screenshot({path:path.join(out,name+'-'+w+(motion==='reduce'?'-reduit':'')+'.png'),fullPage:true});
  if(w===1280&&motion==='reduce'){report.contrast[name]=await page.evaluate(contrastScript);}
  if(w===390&&motion==='reduce'){report.targets[name]=await page.evaluate(()=>[...document.querySelectorAll('main :is(input:not([type=hidden]),select,textarea,button)')].filter(e=>!e.closest('.trap')).map(e=>{const b=e.getBoundingClientRect();return {id:e.id,h:Math.round(b.height),w:Math.round(b.width)};}).filter(x=>x.h<44));}
  await ctx.close();}}
 /* 2. noms accessibles (arbre d'accessibilité de Chromium) */
 {const ctx=await browser.newContext({viewport:{width:1280,height:900}});const page=await ctx.newPage();attach(page,'noms');await page.goto(base+'/contact.html',{waitUntil:'load'});const cdp=await ctx.newCDPSession(page);await cdp.send('Accessibility.enable');const {nodes}=await cdp.send('Accessibility.getFullAXTree');
  const roles=['textbox','combobox','button','link','checkbox'];const list=nodes.filter(n=>!n.ignored&&roles.includes(n.role?.value)).map(n=>({role:n.role.value,name:(n.name?.value||'').trim()}));
  report.names.contact={count:list.length,empty:list.filter(x=>!x.name),fields:list.filter(x=>['textbox','combobox'].includes(x.role))};await ctx.close();}
 /* 3. clavier : Tab, saisie, Entrée → envoi imité, référence ; puis clé absente → repli */
 for(const m of ['ok','sans-cle']){mode=m;const ctx=await browser.newContext({viewport:{width:390,height:844}});const page=await ctx.newPage();attach(page,'clavier-'+m);await page.goto(base+'/contact.html#ecrire',{waitUntil:'load'});
  await page.focus('#contact-topic');const order=[];for(let i=0;i<5;i++){order.push(await page.evaluate(()=>document.activeElement.id));await page.keyboard.press('Tab');}
  await page.focus('#contact-details');await page.keyboard.type('court');await page.focus('#contact-send');await page.waitForTimeout(3200);await page.keyboard.press('Enter');await page.waitForTimeout(300);
  const err=await page.evaluate(()=>({invalid:document.getElementById('contact-details').getAttribute('aria-invalid'),msg:document.getElementById('err-details').textContent,focus:document.activeElement.id}));
  await page.fill('#contact-details','');await page.focus('#contact-details');await page.keyboard.type('Le lien « Centrer la carte » de Vice City ne centre pas la carte sur téléphone.');await page.focus('#contact-email');await page.keyboard.type('joueur@example.com');await page.focus('#contact-send');await page.keyboard.press('Enter');
  await page.waitForFunction(()=>document.getElementById('contact-result').textContent.trim().length>20,null,{timeout:10000});await page.waitForTimeout(300);
  const r=await page.evaluate(()=>({result:document.getElementById('contact-result').textContent,fallback:!document.getElementById('contact-fallback').hidden,mailto:document.getElementById('contact-mailto').getAttribute('href').slice(0,80),draft:localStorage.getItem('lk_contact_draft_v1'),preview:document.getElementById('contact-preview').value.slice(0,60)}));
  await page.screenshot({path:path.join(out,'contact-envoi-'+m+'-390.png'),fullPage:false});
  (m==='ok'?report.keyboard:report.fallback).result={order,err,...r,brevoCalls:brevoCalls.length};await ctx.close();}
 await browser.close();server.close();
 const over=Object.values(report.widths).flatMap(x=>Object.values(x)).filter(x=>x.overflow>0).length,hidden=Object.values(report.widths).flatMap(x=>Object.values(x)).reduce((n,x)=>n+x.hidden,0);
 report.summary={consoleErrors:report.consoleErrors.length,overflow:over,hiddenText:hidden,contrastFails:Object.values(report.contrast).reduce((n,c)=>n+c.fails.length,0),contrastChecked:Object.values(report.contrast).reduce((n,c)=>n+c.checked,0),emptyNames:report.names.contact.empty.length,smallTargets:Object.values(report.targets).reduce((n,x)=>n+x.length,0),sent:/LK-\d{8}-/.test(report.keyboard.result.result)&&report.keyboard.result.draft===null,fallbackShown:report.fallback.result.fallback};
 fs.writeFileSync(path.join(out,'rapport-contact.json'),JSON.stringify(report,null,1));console.log(JSON.stringify(report.summary));
 if(report.summary.contrastFails)console.log('contrastes',JSON.stringify(report.contrast,null,0).slice(0,1500));if(report.consoleErrors.length)console.log(report.consoleErrors.slice(0,8).join('\n'));if(report.summary.smallTargets)console.log('cibles',JSON.stringify(report.targets));
 console.log('clavier',JSON.stringify(report.keyboard.result));console.log('repli',JSON.stringify(report.fallback.result));
 const ok=!report.summary.consoleErrors&&!over&&!hidden&&!report.summary.contrastFails&&!report.summary.emptyNames&&!report.summary.smallTargets&&report.summary.sent&&report.summary.fallbackShown;console.log(ok?'Contrôle tenu.':'Contrôle non tenu.');process.exitCode=ok?0:1;
})().catch(e=>{console.error(e);process.exit(1);});
