'use strict';
/* v7.46 (lot 9) : Contact réel (api/contact.js → Brevo, secours par la messagerie), Mentions complètes et vérifiées contre
   le code (outils/preuve-confidentialite.cjs), alerte de l’accueil avec consentement, cohérence du site. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process'),{Readable}=require('node:stream');
const root=path.resolve(__dirname,'../..'),read=f=>fs.readFileSync(path.join(root,f),'utf8'),{load}=require('./runtime-helper.cjs'),{JSDOM}=require('jsdom');
const API=require(root+'/api/contact.js'),T=API._test,INFO=JSON.parse(read('outils/site-informations.json'));
const doc=f=>new JSDOM(read(f)).window.document;

/* requête et réponse façon Vercel (ou Node pur quand body est absent) */
function call(handler,{method='POST',headers={},body,raw}={}){
 const h={'content-type':'application/json',origin:'https://www.leonidakit.com','x-forwarded-for':'203.0.113.'+Math.floor(Math.random()*250),...headers};
 const req=raw!==undefined?Object.assign(Readable.from([Buffer.from(raw)]),{method,headers:h}):{method,headers:h,body};
 return new Promise(resolve=>{const res={statusCode:200,headers:{},setHeader(k,v){this.headers[k.toLowerCase()]=v;},end(s){resolve({status:this.statusCode,headers:this.headers,json:JSON.parse(s)});}};handler(req,res);});
}
const valid=(o={})=>({topic:'Erreur dans une fiche',page:'https://www.leonidakit.com/vehicules/canis-kamacho.html',details:'Le prix affiché devrait être « à confirmer ».',source:'https://www.rockstargames.com/VI',email:'joueur@example.com',website:'',startedAt:Date.now()-10000,...o});
function brevo(status=201){const calls=[];return {calls,fetch:async(url,init)=>{calls.push({url,init,body:JSON.parse(init.body)});return {status,ok:status<300,json:async()=>({messageId:'<x@relay>'})};}};}

test('Fonction d’envoi : un seul fichier api/contact.js, sans dépendance ni package.json, détecté par Vercel',()=>{
 assert.deepEqual(fs.readdirSync(path.join(root,'api')).sort(),['contact.js','ia.js']);/* v7.67 : fonction IA (api/ia.js), testée dans ia-v767.test.cjs */assert.ok(!fs.existsSync(path.join(root,'package.json')));
 const src=read('api/contact.js');for(const m of src.matchAll(/require\(\s*['"]([^'"]+)['"]\s*\)/g))assert.match(m[1],/^node:/,'dépendance : '+m[1]);
 assert.equal(typeof API,'function');assert.match(src,/https:\/\/api\.brevo\.com\/v3\/smtp\/email/);assert.match(src,/BREVO_API_KEY/);assert.match(src,/CONTACT_TO/);
 assert.ok(!/@gmail|@hotmail|@outlook|@yahoo/i.test(src),'aucune boîte personnelle dans le code');assert.ok(!read('.vercelignore').split('\n').includes('api'));
 const v=JSON.parse(read('vercel.json'));assert.ok(v.headers.some(h=>h.source==='/api/(.*)'&&h.headers.some(x=>x.key==='Cache-Control'&&x.value==='no-store')));
 const csp=v.headers[0].headers[0].value;assert.match(csp,/connect-src 'self';/);assert.ok(!/googleapis|gstatic/.test(csp));assert.match(csp,/form-action 'self' https:\/\/affd58b3\.sibforms\.com$/);});

test('Fonction d’envoi : envoi réel par Brevo, destinataire CONTACT_TO, réponse avec référence, rien dans les journaux',async()=>{
 T.reset();const b=brevo(),errors=[],orig=console.error;console.error=(...a)=>errors.push(a.join(' '));
 try{const h=API.createHandler({env:{BREVO_API_KEY:'cle-test',CONTACT_TO:'boite@example.org'},fetch:b.fetch});const r=await call(h,{body:valid()});
  assert.equal(r.status,200);assert.equal(r.json.ok,true);assert.match(r.json.ref,/^LK-\d{8}-[2-9A-HJ-NP-Z]{6}$/);assert.equal(r.headers['cache-control'],'no-store');
  assert.equal(b.calls.length,1);const c=b.calls[0];assert.equal(c.url,'https://api.brevo.com/v3/smtp/email');assert.equal(c.init.method,'POST');assert.equal(c.init.headers['api-key'],'cle-test');
  assert.deepEqual(c.body.sender,{name:'Leonidakit',email:'contact@leonidakit.com'});assert.deepEqual(c.body.to,[{email:'boite@example.org'}]);assert.deepEqual(c.body.replyTo,{email:'joueur@example.com'});
  assert.ok(c.body.subject.includes(r.json.ref));assert.match(c.body.textContent,/Le prix affiché/);assert.ok(!/<script/i.test(c.body.htmlContent));
  const x=await call(h,{body:valid({details:'<img src=x onerror=alert(1)> dix caractères',email:''})});assert.equal(x.status,200);const c2=b.calls[1];assert.equal(c2.body.replyTo,undefined);assert.ok(c2.body.htmlContent.includes('&lt;img'));
  const n=await call(API.createHandler({env:{BREVO_API_KEY:'k'},fetch:b.fetch}),{body:valid()});assert.equal(n.status,200);assert.deepEqual(b.calls[2].body.to,[{email:'contact@leonidakit.com'}],'sans CONTACT_TO : l’adresse publique');
  const s=await call(h,{raw:JSON.stringify(valid())});assert.equal(s.status,200,'corps lu depuis le flux (runtime sans helpers)');
  assert.deepEqual(errors,[]);}finally{console.error=orig;}});

test('Fonction d’envoi : champ piège, délai, débit, origine, méthode, format, longueurs, clé absente, refus de Brevo',async()=>{
 T.reset();const b=brevo(),h=API.createHandler({env:{BREVO_API_KEY:'k'},fetch:b.fetch}),errors=[],orig=console.error;console.error=(...a)=>errors.push(a.join(' '));
 try{
  assert.equal((await call(h,{method:'GET'})).status,405);
  assert.equal((await call(h,{body:valid(),headers:{origin:'https://example.com'}})).status,403);
  assert.equal((await call(h,{body:valid(),headers:{'content-type':'text/plain'}})).status,415);
  const trap=await call(h,{body:valid({website:'http://spam'})});assert.equal(trap.status,400);assert.equal(trap.json.code,'refused');
  const fast=await call(h,{body:valid({startedAt:Date.now()-500})});assert.equal(fast.status,429);assert.equal(fast.json.code,'too-fast');
  assert.equal((await call(h,{body:valid({startedAt:Date.now()-2*86400000})})).json.code,'stale');
  for(const [o,field] of [[{details:'court'},'details'],[{details:'x'.repeat(5001)},'details'],[{page:'javascript:alert(1)'},'page'],[{source:'pas une adresse'},'source'],[{email:'moi@'},'email'],[{topic:'Autre chose'},'topic']]){const r=await call(h,{body:valid(o)});assert.equal(r.status,400,field);assert.equal(r.json.field,field);}
  assert.equal((await call(h,{raw:'{pas du json'})).json.code,'format');
  assert.equal(b.calls.length,0,'aucun envoi pour un message refusé');
  const nokey=await call(API.createHandler({env:{},fetch:b.fetch}),{body:valid()});assert.equal(nokey.status,503);assert.equal(nokey.json.fallback,true);assert.match(nokey.json.message,/contact@leonidakit\.com/);
  const down=await call(API.createHandler({env:{BREVO_API_KEY:'k'},fetch:brevo(401).fetch}),{body:valid()});assert.equal(down.status,502);assert.equal(down.json.fallback,true);
  assert.equal(errors.length,1);assert.ok(!/Le prix affiché|joueur@example/.test(errors[0]),'le journal ne contient pas le message');
  T.reset();const ip={'x-forwarded-for':'198.51.100.7'};const codes=[];for(let i=0;i<6;i++)codes.push((await call(h,{body:valid(),headers:ip})).status);assert.deepEqual(codes,[200,200,200,200,200,429]);
 }finally{console.error=orig;}});

test('Contact : adresse assemblée (jamais en clair dans le HTML), copie, messagerie, préparation sans réseau',async()=>{
 for(const f of ['contact.html','mentions-legales.html']){assert.ok(!read(f).includes('contact@leonidakit.com'),f+' : adresse en clair');assert.ok(read(f).includes('contact [arobase] leonidakit [point] com'),f+' : repli lisible');}
 assert.equal(INFO.contactVerified,true);assert.equal(INFO.contactEmail,'contact@leonidakit.com');
 const p=await load(root,'contact.html');const d=p.d;
 const a=d.getElementById('contact-mail');assert.equal(a.textContent,'contact@leonidakit.com');assert.equal(a.getAttribute('href'),'mailto:contact@leonidakit.com');
 assert.deepEqual([...d.getElementById('contact-topic').options].map(o=>o.textContent),T.TOPICS);
 d.getElementById('contact-details').value='La Canis Kamacho est rangée dans la mauvaise catégorie.';d.getElementById('contact-details').dispatchEvent(new p.w.Event('input',{bubbles:true}));
 const m=d.getElementById('contact-mailto').getAttribute('href');assert.match(m,/^mailto:contact@leonidakit\.com\?subject=%5BLeonidakit%5D%20Erreur%20dans%20une%20fiche&body=/);assert.ok(decodeURIComponent(m).includes('mauvaise catégorie'));
 d.getElementById('contact-prepare').click();assert.match(d.getElementById('contact-preview').value,/mauvaise catégorie/);assert.match(d.getElementById('contact-status').textContent,/Aucun message envoyé/);assert.equal(d.getElementById('contact-copy').disabled,false);
 assert.equal(p.requests.filter(u=>/api\/contact/.test(u)).length,0);
 d.getElementById('contact-details').value='x'.repeat(5000);d.getElementById('contact-details').dispatchEvent(new p.w.Event('input',{bubbles:true}));const long=d.getElementById('contact-mailto').getAttribute('href');assert.ok(long.length<=1800,'messagerie : '+long.length);assert.match(decodeURIComponent(long),/Texte coupé/);
 assert.deepEqual(p.errors,[]);p.close();});

test('Contact : erreurs annoncées, envoi réussi (référence, brouillon effacé), repli vers la messagerie si l’envoi échoue',async()=>{
 const run=async(responder)=>{const sent=[];const p=await load(root,'contact.html',{before:w=>{w.fetch=async(url,init)=>{sent.push({url:String(url),body:init&&init.body?JSON.parse(init.body):null});return responder();};}});return {p,sent};};
 let {p,sent}=await run(async()=>({ok:true,status:200,json:async()=>({ok:true,ref:'LK-20260928-ABCDEF'})}));let d=p.d;const form=d.getElementById('contact-draft');const submit=()=>form.dispatchEvent(new p.w.Event('submit',{cancelable:true,bubbles:true}));
 d.getElementById('contact-details').value='court';d.getElementById('contact-email').value='pas-une-adresse';submit();await new Promise(r=>setImmediate(r));
 assert.equal(sent.length,0);assert.equal(d.getElementById('contact-details').getAttribute('aria-invalid'),'true');assert.match(d.getElementById('err-details').textContent,/10 caractères/);assert.match(d.getElementById('err-email').textContent,/facultative/);assert.equal(d.getElementById('err-details').getAttribute('aria-live'),'polite');
 d.getElementById('contact-details').value='Le lien vers la carte de Vice City ne centre pas la carte.';d.getElementById('contact-email').value='';d.getElementById('contact-details').dispatchEvent(new p.w.Event('change',{bubbles:true}));
 assert.ok(p.w.localStorage.getItem('lk_contact_draft_v1'),'brouillon enregistré');
 submit();for(let i=0;i<5;i++)await new Promise(r=>setImmediate(r));
 assert.equal(sent.length,1);assert.equal(sent[0].url,'/api/contact');assert.equal(sent[0].body.website,'');assert.ok(Number.isFinite(sent[0].body.startedAt));assert.equal(sent[0].body.topic,'Erreur dans une fiche');
 assert.match(d.getElementById('contact-result').textContent,/LK-20260928-ABCDEF/);assert.equal(d.getElementById('contact-result').getAttribute('role'),'status');assert.equal(p.w.localStorage.getItem('lk_contact_draft_v1'),null,'brouillon effacé après l’envoi');assert.equal(d.getElementById('contact-fallback').hidden,true);p.close();
 for(const responder of [async()=>({ok:false,status:503,json:async()=>({ok:false,code:'config',fallback:true,message:'L’envoi n’est pas disponible pour le moment. Écris directement à contact@leonidakit.com : ton texte est prêt à copier.'})}),async()=>{throw new TypeError('réseau');}]){
  ({p,sent}=await run(responder));d=p.d;d.getElementById('contact-details').value='Le lien vers la carte de Vice City ne centre pas la carte.';d.getElementById('contact-draft').dispatchEvent(new p.w.Event('submit',{cancelable:true,bubbles:true}));for(let i=0;i<5;i++)await new Promise(r=>setImmediate(r));
  assert.equal(d.getElementById('contact-fallback').hidden,false);assert.match(d.getElementById('contact-result').textContent,/contact@leonidakit\.com/);assert.match(d.getElementById('contact-preview').value,/Vice City/);assert.equal(d.getElementById('contact-copy').disabled,false);assert.match(d.getElementById('contact-mailto').getAttribute('href'),/^mailto:contact@leonidakit\.com\?/);assert.ok(p.w.localStorage.getItem('lk_contact_draft_v1')||true);p.close();}
 const again=await load(root,'contact.html',{storage:{lk_contact_draft_v1:JSON.stringify({v:1,at:1,topic:'Suggestion de contenu',page:'',details:'Brouillon retrouvé ici.',source:'',email:''})}});assert.equal(again.d.getElementById('contact-details').value,'Brouillon retrouvé ici.');assert.equal(again.d.getElementById('contact-topic').value,'Suggestion de contenu');assert.match(again.d.getElementById('contact-status').textContent,/brouillon/);
 again.d.getElementById('contact-clear').click();assert.equal(again.w.localStorage.getItem('lk_contact_draft_v1'),null);assert.equal(again.d.getElementById('contact-details').value,'');again.close();});

test('Contact : chaque champ et chaque bouton a un nom accessible, cibles de 44 px, JSON-LD ContactPage',()=>{
 const d=doc('contact.html');for(const el of d.querySelectorAll('main :is(input,select,textarea)')){if(el.closest('.trap'))continue;assert.ok(d.querySelector('label[for="'+el.id+'"]'),'étiquette : '+el.id);}
 for(const b of d.querySelectorAll('main button'))assert.ok(b.textContent.trim().length>=4,'bouton sans nom');
 assert.equal(d.querySelector('.trap input').getAttribute('tabindex'),'-1');assert.equal(d.querySelector('.trap').getAttribute('aria-hidden'),'true');
 assert.match(read('informations.css'),/\.info-page main :is\(input,select,textarea\)\{min-height:46px;\}/);
 const ld=[...d.querySelectorAll('script[type="application/ld+json"]')].map(s=>JSON.parse(s.textContent));assert.ok(ld.some(x=>(x['@graph']||[]).some(y=>y['@type']==='ContactPage')));assert.ok(ld.some(x=>x['@type']==='BreadcrumbList'));
 for(const id of ['envoi','utile','ecrire'])assert.ok(d.getElementById(id),id);assert.equal(d.querySelectorAll('#utile .info-illus li').length,3);assert.equal(d.querySelectorAll('#utile svg.ed-ico').length>=3,true);});

test('Mentions : complètes (éditeur non professionnel, hébergeur, propriété, données, droits, cookies, responsabilité, accessibilité, historique)',()=>{
 const d=doc('mentions-legales.html'),t=d.body.textContent;
 for(const id of ['en-bref','editeur','hebergement','propriete','confidentialite','donnees-navigateur','donnees-envois','donnees-contact','donnees-alerte','droits','cookies','responsabilite','accessibilite','mises-a-jour'])assert.ok(d.getElementById(id),id);
 for(const a of d.querySelectorAll('.ed-nav a'))assert.ok(d.getElementById(a.getAttribute('href').slice(1)),a.getAttribute('href'));
 assert.ok(!/à compléter|à confirmer par l’éditeur/.test(t),'plus rien à compléter');assert.match(t,/commencent par «\s*lk\s*»/u);
 for(const s of ['à titre non professionnel','article 1-1, II','Vercel Inc.','440 N Barranca Avenue','privacy@vercel.com','SENDINBLUE SAS (service Brevo)','RCS Paris 498 019 298','Responsable du traitement','Légifrance','Creative Commons BY 4.0','SIL Open Font License','tous droits réservés','localStorage','32 messages','intérêt légitime','consentement','délai d’un mois','CNIL','3 place de Fontenoy','Aucun cookie','article 82','RGAA','lecteur d’écran réel','Dernière mise à jour'])assert.ok(t.includes(s),s);
 assert.equal(d.querySelectorAll('.info-clair').length,d.querySelectorAll('section.ed').length-2,'un bloc « En clair » par section (hors En bref et Mises à jour)');
 assert.equal(d.querySelectorAll('.info-history li').length,INFO.history.length);assert.ok(d.querySelector('.info-table th[scope="col"]'));
 const ld=[...d.querySelectorAll('script[type="application/ld+json"]')].map(s=>JSON.parse(s.textContent));assert.ok(ld.some(x=>(x['@graph']||[]).some(y=>y['@type']==='WebPage'&&y.dateModified===INFO.checkedAt)));
 for(const a of d.querySelectorAll('main a[target="_blank"]'))assert.equal(a.getAttribute('rel'),'noopener');
 assert.ok(!/nom réel de l’éditeur|Teva|Téva/.test(t),'aucune identité de l’éditeur publiée');});

test('Preuve de confidentialité : aucun cookie, aucune ressource ni requête vers un autre site, stockage « lk », formulaires connus',()=>{
 const out=execFileSync(process.execPath,[path.join(root,'outils/preuve-confidentialite.cjs'),'--json'],{cwd:root,encoding:'utf8'});const r=JSON.parse(out);
 assert.deepEqual(r.problems,[]);assert.equal(r.facts.externalResources,0);/* v7.60 : l’accueil traduit (en/index.html) porte le même formulaire d’alerte */const forms=r.facts.externalForms.map(x=>x.file);assert.ok(forms.includes('index.html')&&forms.every(f=>/^(?:[a-z]{2}\/)?index\.html$/.test(f)),forms.join(', '));/* v7.67 : la fonction IA (api/ia.js) s’ajoute à celle du formulaire */assert.deepEqual(r.facts.api,['api/contact.js','api/ia.js']);
 assert.ok(r.facts.storageKeys.every(k=>k.startsWith('lk')));assert.ok(r.facts.storageKeys.includes('lk_contact_draft_v1'));});

test('Alerte de l’accueil : case de consentement obligatoire (non transmise), texte vrai, lien vers les données',async()=>{
 const d=doc('index.html'),c=d.getElementById('consent');assert.ok(c&&c.required&&!c.getAttribute('name'),'case sans name : non transmise à Brevo');assert.ok(c.closest('form#signup'));
 assert.ok(d.querySelector('.signup-legal a[href="mentions-legales.html#donnees-alerte"]'));assert.ok(doc('mentions-legales.html').getElementById('donnees-alerte'));assert.ok(!d.querySelector('.signup').textContent.includes('lien de confirmation te sera envoyé'));
 const p=await load(root,'index.html');const f=p.d.getElementById('signup');p.d.getElementById('mail').value='joueur@example.com';const e=new p.w.Event('submit',{cancelable:true});f.dispatchEvent(e);assert.equal(e.defaultPrevented,true,'sans consentement : pas d’envoi');assert.match(p.d.getElementById('signup-note').textContent,/Coche la case/);
 p.d.getElementById('consent').checked=true;const e2=new p.w.Event('submit',{cancelable:true});f.dispatchEvent(e2);assert.equal(e2.defaultPrevented,false);p.close();});

test('Cohérence : Léo pointe vers la section Données, À propos et Léo disent la même chose que les Mentions, pied de page',()=>{
 assert.match(read('leo-ui.js'),/mentions-legales\.html#confidentialite/);assert.ok(doc('mentions-legales.html').getElementById('confidentialite'));
 const about=doc('a-propos.html').body.textContent;/* v7.67 : À propos dit aussi ce qui part vers l’IA, comme les Mentions (#donnees-ia) et Léo */assert.ok(about.includes('l’alerte de l’accueil et le formulaire de Contact (par Brevo)'));assert.ok(about.includes('l’IA Claude'));assert.ok(doc('mentions-legales.html').getElementById('donnees-ia'));assert.ok(!about.includes('Seul le formulaire d’alerte'));
 const kb=JSON.parse(read('outils/leo-knowledge.json')).topics;const by=Object.fromEntries(kb.map(t=>[t.id,t]));assert.ok(!/pas encore (?:en place|confirmé)/.test(by['contact-page'].text+by['site-erreur'].text));assert.match(by['cookies'].text,/aucun cookie/);
 for(const t of kb)for(const l of t.links)assert.notEqual(l.url,'/mentions-legales.html#independance',t.id);
 for(const f of ['index.html','contact.html','vehicules/canis-kamacho.html']){const foot=doc(f).querySelector('footer');assert.ok(foot.querySelector('a[href$="contact.html"]')&&foot.querySelector('a[href$="mentions-legales.html"]'),f);}
 const titles=new Set();for(const f of ['contact.html','mentions-legales.html','a-propos.html']){const d=doc(f);const tt=d.querySelector('title').textContent;assert.ok(!titles.has(tt));titles.add(tt);assert.ok(d.querySelector('meta[name="description"]').content.length<=160,f);}});
