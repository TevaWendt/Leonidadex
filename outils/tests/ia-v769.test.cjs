'use strict';
/* v7.69 : accès à l'IA par visiteur (demande de Téva du 06/10/2026) : 30 questions gratuites toutes les 9 heures, puis
   crédit payant au prix réel d'Anthropic + 20 % si la vente est ouverte, sinon mode local ; le visiteur choisit qui répond
   (IA Claude ou local) et voit lequel a répondu. Aucun appel réseau réel : Claude, la base Upstash et Stripe sont simulés. */
const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'../..'),IA=require(root+'/api/ia.js'),T=IA._test,ACHAT=require(root+'/api/ia-achat.js');

/* base Redis simulée (commandes utilisées par les deux fonctions) */
function fakeKV(){const db=new Map(),ttl=new Map();let now=0;
 const live=k=>{if(ttl.has(k)&&ttl.get(k)<=now){db.delete(k);ttl.delete(k);}return db.get(k);};
 const run=c=>{const [cmd,k,...a]=c;live(k);switch(cmd){
  case 'SET':{const nx=a.includes('NX'),ex=a.indexOf('EX');if(nx&&db.has(k))return null;db.set(k,a[0]);if(ex>=0)ttl.set(k,now+Number(a[ex+1])*1000);return 'OK';}
  case 'GET':return db.has(k)?String(db.get(k)):null;
  case 'INCR':case 'INCRBY':{const v=(Number(db.get(k))||0)+(cmd==='INCR'?1:Number(a[0]));db.set(k,String(v));return v;}
  case 'DECR':case 'DECRBY':{const v=(Number(db.get(k))||0)-(cmd==='DECR'?1:Number(a[0]));db.set(k,String(v));return v;}
  case 'PTTL':return ttl.has(k)?ttl.get(k)-now:(db.has(k)?-1:-2);
  case 'EXPIRE':if(!db.has(k))return 0;ttl.set(k,now+Number(a[0])*1000);return 1;
  case 'SADD':{const s=db.get(k)||new Set();s.add(a[0]);db.set(k,s);return 1;}
  case 'SMEMBERS':return [...(db.get(k)||[])];
  case 'SREM':{const s=db.get(k);if(s)s.delete(a[0]);return 1;}
  default:throw Error('commande inconnue '+cmd);}};
 return {db,tick:ms=>{now+=ms;},fetch:async(url,opt)=>({ok:true,status:200,json:async()=>JSON.parse(opt.body).map(c=>({result:run(c)}))})};}
const KV_ENV={KV_REST_API_URL:'https://kv.example',KV_REST_API_TOKEN:'t'};
function services({kv,claude,stripe}={}){return async(url,opt)=>{
 if(url.startsWith('https://kv.example'))return kv.fetch(url,opt);
 if(url.startsWith('https://api.anthropic.com'))return claude?claude(url,opt):{ok:true,status:200,json:async()=>({content:[{type:'text',text:JSON.stringify({reponse:'Réponse.',liens:[],trouve:true})}],usage:{input_tokens:3000,output_tokens:400}})};
 if(url.startsWith('https://api.stripe.com'))return stripe(url,opt);
 throw Error('appel inattendu '+url);};}
function call(handler,body,{ip='1.2.3.4'}={}){return new Promise(resolve=>{const res={statusCode:0,headers:{},setHeader(k,v){this.headers[k.toLowerCase()]=v;},end(s){resolve({status:this.statusCode,body:s?JSON.parse(s):null});}};
 handler({method:'POST',headers:{'content-type':'application/json',origin:'https://www.leonidakit.com','x-forwarded-for':ip},body,socket:{}},res);});}
const DEV='appareil-de-test-0123456789';

test('état : 30 questions gratuites toutes les 9 heures, rien de consommé, vente fermée par défaut',async()=>{T.reset();const kv=fakeKV();
 const h=IA.createHandler({env:{ANTHROPIC_API_KEY:'k',...KV_ENV},fetch:services({kv})});
 const r=await call(h,{mode:'etat',appareil:DEV});assert.equal(r.status,200);assert.equal(r.body.gratuit,30);assert.equal(r.body.heures,9);assert.equal(r.body.restant,30);assert.equal(r.body.achat,false);assert.equal(r.body.modele,'claude-sonnet-5-5');
 const r2=await call(h,{mode:'etat',appareil:DEV});assert.equal(r2.body.restant,30,'lire l’état ne consomme rien');});

test('30 questions puis mode local (402 « quota » avec l’heure de renouvellement) ; une panne ne consomme pas ; renouvellement au bout de 9 heures',async()=>{T.reset();const kv=fakeKV();let fail=false;
 const h=IA.createHandler({env:{ANTHROPIC_API_KEY:'k',...KV_ENV},fetch:services({kv,claude:async(u,o)=>fail?{ok:false,status:529,json:async()=>({})}:{ok:true,status:200,json:async()=>({content:[{type:'text',text:JSON.stringify({reponse:'R.',liens:[],trouve:true})}],usage:{input_tokens:100,output_tokens:10}})}})});
 const ask=()=>call(h,{mode:'leo',question:'Bonjour Léo',appareil:DEV});
 fail=true;assert.equal((await ask()).status,502);fail=false;
 for(let i=1;i<=30;i++){const r=await ask();assert.equal(r.status,200,'question '+i);assert.equal(r.body.acces.type,'gratuit');assert.equal(r.body.acces.restant,30-i);}
 const over=await ask();assert.equal(over.status,402);assert.equal(over.body.code,'quota');assert.equal(over.body.restant,0);assert.ok(over.body.reset>Date.now());assert.equal(over.body.achat,false);
 kv.tick(9*3600*1000+1);const again=await ask();assert.equal(again.status,200,'de nouveau des questions après 9 heures');});

test('le compteur suit l’appareil, et l’adresse IP d’une box partagée a un plafond 5 fois plus haut',async()=>{T.reset();const kv=fakeKV();
 const h=IA.createHandler({env:{ANTHROPIC_API_KEY:'k',...KV_ENV,LK_IA_GRATUIT:'2'},fetch:services({kv})});
 const ask=dev=>call(h,{mode:'calcul',question:'J’ai 200k',appareil:dev},{ip:'9.9.9.9'});
 for(let d=0;d<5;d++)for(let i=0;i<2;i++)assert.equal((await ask('appareil-partage-'+d+'-xxxxxxxx')).status,200);
 assert.equal((await ask('appareil-partage-5-xxxxxxxx')).status,402,'au-delà de 5 × 2 sur la même adresse');});

test('crédit payant : au-delà des gratuites, chaque question coûte son prix réel (jetons × tarif × taux) plus 20 %',async()=>{T.reset();const kv=fakeKV();
 const env={ANTHROPIC_API_KEY:'k',...KV_ENV,LK_IA_GRATUIT:'0'};const h=IA.createHandler({env,fetch:services({kv})});
 const st=T.settings(env),jeton='LK-ABCD-EFGH-IJKL-MNOP';kv.db.set('lkia:b:'+T.digest(st.salt,'jeton:'+jeton),'1000000');
 const price=T.priceOf('claude-sonnet-5-5',{input_tokens:3000,output_tokens:400},st);assert.equal(price,Math.ceil((3000*2+400*10)/1e6*0.89*1.2*1e6));
 const r=await call(h,{mode:'leo',question:'Bonjour Léo',appareil:DEV,jeton});assert.equal(r.status,200);assert.equal(r.body.acces.type,'credit');assert.equal(r.body.acces.cout,price);assert.equal(r.body.acces.solde,1000000-price);
 kv.db.set('lkia:b:'+T.digest(st.salt,'jeton:'+jeton),'1000');const poor=await call(h,{mode:'leo',question:'Encore ?',appareil:DEV,jeton});assert.equal(poor.status,402,'crédit trop bas : mode local');assert.equal(poor.body.solde,1000);});

test('sans base Upstash : le compteur tient en mémoire vive (repli), la vente reste fermée',async()=>{T.reset();
 const h=IA.createHandler({env:{ANTHROPIC_API_KEY:'k',LK_IA_GRATUIT:'1',LK_IA_VENTE:'oui',STRIPE_SECRET_KEY:'sk',LK_IA_SEL:'sel-de-test-assez-long'},fetch:services({})});
 assert.equal((await call(h,{mode:'leo',question:'Une',appareil:DEV})).status,200);const r=await call(h,{mode:'leo',question:'Deux',appareil:DEV});assert.equal(r.status,402);assert.equal(r.body.achat,false);});

test('achat : fermé sans LK_IA_VENTE=oui ; ouvert, exige la renonciation et un montant prévu ; crée le code avant Stripe ; crédite une seule fois, frais de paiement retirés',async()=>{
 const kv=fakeKV(),sessions=new Map();let n=0;
 const stripe=async(url,opt)=>{if(opt.method==='POST'){const f=new URLSearchParams(opt.body),id='cs_test_'+(++n)+'abcdefghij';sessions.set(id,{id,url:'https://checkout.stripe.com/c/pay/'+id,payment_status:'unpaid',status:'open',currency:f.get('line_items[0][price_data][currency]'),amount_total:Number(f.get('line_items[0][price_data][unit_amount]')),metadata:{jeton:f.get('metadata[jeton]')},success:f.get('success_url')});return {ok:true,status:200,json:async()=>sessions.get(id)};}
  const id=decodeURIComponent(url.split('/').pop());return sessions.has(id)?{ok:true,status:200,json:async()=>sessions.get(id)}:{ok:false,status:404,json:async()=>({})};};
 const closed=ACHAT.createHandler({env:{...KV_ENV,STRIPE_SECRET_KEY:'sk_test'},fetch:services({kv,stripe})});
 assert.equal((await call(closed,{action:'creer',pack:5,renonce:true,retour:'/calculateurs.html'})).body.code,'ferme');
 const noSalt=ACHAT.createHandler({env:{...KV_ENV,STRIPE_SECRET_KEY:'sk_test',LK_IA_VENTE:'oui',ANTHROPIC_API_KEY:'k'},fetch:services({kv,stripe})});
 assert.equal((await call(noSalt,{action:'creer',pack:5,renonce:true,retour:'/calculateurs.html'})).body.code,'ferme','sans LK_IA_SEL fixe, la vente reste fermée');
 assert.equal(IA._test.settings({...KV_ENV,STRIPE_SECRET_KEY:'sk',LK_IA_VENTE:'oui',LK_IA_SEL:'court'}).sell,false);
 const env={...KV_ENV,STRIPE_SECRET_KEY:'sk_test',LK_IA_VENTE:'oui',ANTHROPIC_API_KEY:'k',LK_IA_SEL:'sel-de-test-assez-long'},h=ACHAT.createHandler({env,fetch:services({kv,stripe})});
 assert.equal((await call(h,{action:'creer',pack:5,retour:'/calculateurs.html'})).body.code,'renonce');
 assert.equal((await call(h,{action:'creer',pack:7,renonce:true})).body.code,'pack');
 const c=await call(h,{action:'creer',pack:5,renonce:true,retour:'/calculateurs.html'});assert.equal(c.status,200);assert.match(c.body.jeton,ACHAT._test.TOKEN);assert.match(c.body.url,/^https:\/\/checkout\.stripe\.com\//);
 const s=[...sessions.values()][0];assert.equal(s.success,'https://www.leonidakit.com/calculateurs.html?ia=paye');assert.equal(s.amount_total,500);assert.equal(s.currency,'eur');
 let v=await call(h,{action:'verifier',jeton:c.body.jeton});assert.equal(v.body.solde,0,'pas encore payé');
 s.payment_status='paid';s.status='complete';v=await call(h,{action:'verifier',jeton:c.body.jeton});
 assert.equal(v.body.credite,Math.floor((5-(0.25+5*0.015))*1e6));assert.equal(v.body.solde,4675000);
 v=await call(h,{action:'verifier',jeton:c.body.jeton});assert.equal(v.body.credite,0,'un paiement n’est crédité qu’une fois');assert.equal(v.body.solde,4675000);
 /* le crédit sert ensuite aux questions de l'IA */
 const ia=IA.createHandler({env:{...env,LK_IA_GRATUIT:'0'},fetch:services({kv})});const r=await call(ia,{mode:'leo',question:'Bonjour',appareil:DEV,jeton:c.body.jeton});assert.equal(r.status,200);assert.equal(r.body.acces.type,'credit');assert.ok(r.body.acces.solde<4675000);
 const etat=await call(ia,{mode:'etat',appareil:DEV,jeton:c.body.jeton});assert.equal(etat.body.achat,true);assert.equal(etat.body.solde,r.body.acces.solde);});

test('pages : « Qui répond ? » sous la barre du calculateur et dans Léo ; mode local : aucun appel ; chaque réponse dit qui l’a écrite',async()=>{
 const {load}=require('./runtime-helper.cjs'),p=await load(root,'calculateurs.html',{});
 try{const ctl=p.d.querySelector('#calc-ask .lkia');assert.ok(ctl,'commande présente');assert.equal(ctl.querySelectorAll('[data-lkia-mode]').length,2);
  const calls=[];p.w.fetch=async(url,opt)=>{calls.push(url);return {ok:false,status:503,json:async()=>({ok:false,code:'off'})};};
  ctl.querySelector('[data-lkia-mode="local"]').click();assert.equal(p.w.localStorage.getItem('lk_ia_mode'),'local');assert.equal(ctl.querySelector('[data-lkia-mode="local"]').getAttribute('aria-pressed'),'true');
  p.d.getElementById('calc-ask-input').value='J’ai 200 000 $, je gagne entre 20 000 et 40 000 par heure, je veux 1 million';p.d.getElementById('calc-ask').dispatchEvent(new p.w.Event('submit',{bubbles:true,cancelable:true}));p.flush();
  for(let i=0;i<10;i++)await new Promise(r=>setImmediate(r));
  assert.equal(calls.filter(u=>u==='/api/ia').length,0,'mode local : rien ne part');assert.match(p.d.getElementById('calc-ask-out').textContent,/Réponse locale, sans IA/);
  /* v7.69 : en mode local, pas même la lecture des compteurs (focus de la barre, entrée dans la commande, appel direct) ; le survol ne lit rien */
  p.d.getElementById('calc-ask-input').dispatchEvent(new p.w.FocusEvent('focus'));ctl.dispatchEvent(new p.w.FocusEvent('focusin',{bubbles:true}));ctl.dispatchEvent(new p.w.Event('pointerenter'));await p.w.LKIA.refresh(false);
  for(let i=0;i<5;i++)await new Promise(r=>setImmediate(r));
  assert.equal(calls.filter(u=>u==='/api/ia').length,0,'mode local : aucune lecture de l’état');
  ctl.querySelector('[data-lkia-mode="ia"]').click();for(let i=0;i<5;i++)await new Promise(r=>setImmediate(r));
  assert.equal(calls.filter(u=>u==='/api/ia').length,1,'retour à « IA Claude » : l’état est lu une fois');assert.equal(p.w.localStorage.getItem('lk_ia_mode'),null);
  assert.deepEqual(p.errors,[]);}finally{p.close();}
 const ia=require('node:fs').readFileSync(root+'/lk-ia.js','utf8');assert.doesNotMatch(ia,/pointerenter/,'jamais de lecture au simple survol');assert.match(ia,/if \(mode\(\) === 'local' && !force\) return Promise\.resolve/);
 const fs=require('node:fs'),ui=fs.readFileSync(root+'/leo-ui.js','utf8');assert.match(ui,/window\.LKIA\.control\('leo'\)/);assert.match(ui,/by:'ia'/);assert.match(ui,/Réponse locale de Léo, sans IA\./);
 assert.match(fs.readFileSync(root+'/leo-loader.js','utf8'),/script\('lk-ia\.js','LKIA'\)/);});
test('correctif du 07/10/2026 : demande acceptée par Claude Sonnet 5.5 (schéma JSON sans mot-clé refusé), raison du refus dans le journal, refus non compté',async()=>{
 /* schémas : chaque objet fermé (additionalProperties false, toutes les propriétés requises), aucun mot-clé non pris en charge par la sortie JSON */
 const walk=(n,where)=>{if(!n||typeof n!=='object')return;for(const k of ['maxItems','minItems','minimum','maximum','minLength','maxLength','pattern'])assert.ok(!(k in n),where+' : '+k);
  if(!Array.isArray(n)&&!Object.keys(n).length)assert.fail(where+' : schéma vide');
  if(n.type==='object'){assert.equal(n.additionalProperties,false,where);assert.deepEqual([...n.required].sort(),Object.keys(n.properties).sort(),where);}
  for(const [k,v] of Object.entries(n))if(v&&typeof v==='object')walk(v,where+'.'+k);};
 walk(T.SCHEMA_CALC,'calcul');walk(T.SCHEMA_LEO,'leo');
 assert.deepEqual(T.modelOptions('claude-sonnet-5-5'),{thinking:{type:'between_tools'},effort:'low',extra:0});assert.equal(T.modelOptions('claude-haiku-4-5-20251001').thinking,undefined);assert.equal(T.modelOptions('claude-opus-5-5').thinking,undefined);
 /* refus d'Anthropic : 502, raison (type et message, jamais la question) dans le journal, question gratuite rendue */
 T.reset();const kv=fakeKV(),logs=[],orig=console.error;console.error=(...a)=>logs.push(a.join(' '));
 try{const h=IA.createHandler({env:{ANTHROPIC_API_KEY:'k',...KV_ENV},fetch:services({kv,claude:async()=>({ok:false,status:400,json:async()=>({type:'error',error:{type:'invalid_request_error',message:'Your credit balance is too low to access the Anthropic API.'}})})})});
  const r=await call(h,{mode:'leo',question:'Question secrète du joueur',appareil:DEV});assert.equal(r.status,502);
  assert.equal(logs.length,1);assert.match(logs[0],/\(400 — invalid_request_error : Your credit balance is too low/);assert.doesNotMatch(logs[0],/secrète/);
  const e=await call(h,{mode:'etat',appareil:DEV});assert.equal(e.body.restant,30,'un refus ne coûte pas de question');
  /* réponse sans JSON lisible : 502, rien de consommé */
  const h2=IA.createHandler({env:{ANTHROPIC_API_KEY:'k',...KV_ENV},fetch:services({kv,claude:async()=>({ok:true,status:200,json:async()=>({content:[{type:'text',text:'{"reponse":'}],stop_reason:'max_tokens'})})})});
  assert.equal((await call(h2,{mode:'leo',question:'Bonjour',appareil:DEV})).status,502);assert.match(logs[1],/réponse illisible \(max_tokens\)/);
  assert.equal((await call(h,{mode:'etat',appareil:DEV})).body.restant,30);
 }finally{console.error=orig;}});
