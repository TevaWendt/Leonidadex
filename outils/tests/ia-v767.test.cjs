'use strict';
/* v7.67 : fonction IA (api/ia.js, API Claude) : sans clé elle se tait (503, la page reste locale) ; elle refuse ce qui n'est
   pas une demande du site ; elle ne transmet au service que la question et les éléments du site ; elle filtre ce qui revient
   (chemins et valeurs des cases, liens). Aucun appel réseau réel : le service est simulé. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..'),API=require(root+'/api/ia.js'),T=API._test;
function call(handler,{method='POST',body,headers={}}={}){return new Promise(resolve=>{const res={statusCode:0,headers:{},setHeader(k,v){this.headers[k.toLowerCase()]=v;},end(s){resolve({status:this.statusCode,body:s?JSON.parse(s):null,headers:this.headers});}};
 handler({method,headers:{'content-type':'application/json',origin:'https://www.leonidakit.com',...headers},body,socket:{remoteAddress:'1.2.3.4'}},res);});}
/* v7.69 : le service répond en JSON imposé par le schéma (bloc de texte), comme Claude Sonnet 5.5 */
function fakeService(input,seen=[]){return async(url,opt)=>{seen.push({url,opt,body:JSON.parse(opt.body)});return {ok:true,status:200,json:async()=>({content:[{type:'text',text:JSON.stringify(input)}],stop_reason:'end_turn'})};};}

test('sans clé : 503 « off », aucune requête vers le service',async()=>{T.reset();const seen=[];const h=API.createHandler({env:{},fetch:fakeService({},seen)});
 const r=await call(h,{body:{mode:'calcul',question:'J’ai 200 000'}});assert.equal(r.status,503);assert.equal(r.body.code,'off');assert.equal(seen.length,0);});
test('méthode, origine, format et demande invalides sont refusés',async()=>{T.reset();const h=API.createHandler({env:{ANTHROPIC_API_KEY:'k'},fetch:fakeService({})});
 assert.equal((await call(h,{method:'GET'})).status,405);assert.equal((await call(h,{body:{mode:'calcul',question:'x y'},headers:{origin:'https://evil.example'}})).status,403);
 assert.equal((await call(h,{body:{mode:'autre',question:'bonjour'}})).status,400);assert.equal((await call(h,{body:{mode:'leo',question:'x'.repeat(401)}})).status,400);});
test('calcul : modèle par défaut Claude Sonnet 5.5 (v7.69), consigne mise en cache, sortie JSON imposée par un schéma (ni outil imposé ni température, refusés par Sonnet 5.5), réflexion coupée, clé jamais renvoyée',async()=>{T.reset();const seen=[];
 const h=API.createHandler({env:{ANTHROPIC_API_KEY:'secret-key'},fetch:fakeService({outil:'goal',cases:[{chemin:'goal.capital',valeur:200000}],note:'Compris.'},seen)});
 const r=await call(h,{body:{mode:'calcul',question:'J’ai 200 000 et je veux 1 million',lang:'fr',state:'{"outil":"goal"}'}});
 assert.equal(r.status,200);assert.equal(seen[0].url,'https://api.anthropic.com/v1/messages');const b=seen[0].body;
 assert.equal(b.model,'claude-sonnet-5-5');assert.equal(b.system[0].cache_control.type,'ephemeral');
 assert.equal(b.output_config.format.type,'json_schema');assert.deepEqual(b.output_config.format.schema.required,['outil','cases','scenarios','note','question']);
 assert.equal(b.tool_choice,undefined);assert.equal(b.tools,undefined);assert.equal(b.temperature,undefined);assert.equal(b.top_p,undefined);
 assert.deepEqual(b.thinking,{type:'between_tools'});assert.equal(b.output_config.effort,'low');
 assert.equal(seen[0].opt.headers['x-api-key'],'secret-key');assert.ok(!JSON.stringify(r.body).includes('secret-key'));assert.match(b.messages[0].content,/J’ai 200 000 et je veux 1 million/);});
test('modèle choisi dans Vercel (LK_IA_MODELE), valeur invalide ignorée',async()=>{for(const [m,expected] of [['claude-haiku-4-5-20251001','claude-haiku-4-5-20251001'],['rm -rf /','claude-sonnet-5-5']]){T.reset();const seen=[];
 const h=API.createHandler({env:{ANTHROPIC_API_KEY:'k',LK_IA_MODELE:m},fetch:fakeService({outil:'goal',cases:[],note:''},seen)});await call(h,{body:{mode:'calcul',question:'bonjour'}});assert.equal(seen[0].body.model,expected);
 if(expected.startsWith('claude-haiku')){assert.equal(seen[0].body.thinking,undefined);assert.equal(seen[0].body.output_config.effort,undefined);}}});
test('calcul : cases filtrées (chemin mal formé, valeur trop grande, texte trop long), outil inconnu ramené à goal',()=>{
 const d={mode:'calcul'};const s=T.shape(d,{outil:'pirate',cases:[{chemin:'goal.capital',valeur:5},{chemin:'__proto__.x',valeur:1},{chemin:'goal.target',valeur:1e15},{chemin:'assets.0.name',valeur:'x'.repeat(81)},{chemin:'order.keys',valeur:['a','b']}],scenarios:[{nom:'bas',cases:[{chemin:'goal.hourly',valeur:20000}]}],note:'ok'},'m');
 assert.equal(s.outil,'goal');assert.deepEqual(s.cases.map(c=>c.chemin),['goal.capital','order.keys']);assert.equal(s.scenarios[0].cases[0].valeur,20000);});
test('Léo : liens limités aux éléments envoyés et au site de Rockstar ; « trouve » transmis',async()=>{T.reset();
 const h=API.createHandler({env:{ANTHROPIC_API_KEY:'k'},fetch:fakeService({reponse:'Réponse.',liens:[{titre:'Fiche',url:'/vehicules/jet.html'},{titre:'Autre page',url:'/armes.html'},{titre:'Pirate',url:'https://evil.example/'},{titre:'Rockstar',url:'https://www.rockstargames.com/VI'}],trouve:true})});
 const r=await call(h,{body:{mode:'leo',question:'C’est quoi le Jet ?',lang:'fr',local:{text:'Le Jet…',links:[{label:'Fiche',url:'/vehicules/jet.html'}]},passages:[]}});
 assert.equal(r.status,200);assert.deepEqual(r.body.liens.map(l=>l.url),['/vehicules/jet.html','https://www.rockstargames.com/VI']);assert.equal(r.body.trouve,true);});
test('Léo : la consigne interdit les faits hors des éléments et GTA V présenté comme GTA VI',()=>{assert.match(T.SYSTEM_LEO,/uniquement à partir des ÉLÉMENTS/);assert.match(T.SYSTEM_LEO,/GTA V ou de GTA Online/);assert.match(T.SYSTEM_CALC,/Tu ne calcules JAMAIS/);assert.match(T.SYSTEM_CALC,/N'invente aucun chiffre/);});
test('anti-rafale : 60 demandes par empreinte d’IP et par dix minutes (v7.69 ; les 15 gratuites par 12 heures sont comptées à part)',()=>{T.reset();let blocked=0;for(let i=0;i<62;i++)if(T.limited('9.9.9.9',1000))blocked++;assert.equal(blocked,2);});
test('service en panne ou réponse sans outil : 502, la page garde sa réponse locale',async()=>{T.reset();const h=API.createHandler({env:{ANTHROPIC_API_KEY:'k'},fetch:async()=>({ok:false,status:529,json:async()=>({})})});
 const r=await call(h,{body:{mode:'leo',question:'bonjour Léo'}});assert.equal(r.status,502);assert.equal(r.body.code,'service');});
test('fonction sans dépendance (node: seulement), pages : la barre et Léo gardent leur repli local',()=>{const src=fs.readFileSync(root+'/api/ia.js','utf8');for(const m of src.matchAll(/require\(\s*['"]([^'"]+)['"]\s*\)/g))assert.match(m[1],/^node:/);
 const hub=fs.readFileSync(root+'/calculateurs-hub.js','utf8'),ui=fs.readFileSync(root+'/leo-ui.js','utf8');assert.match(hub,/const result = route\(value\);/);assert.match(hub,/answer\(input\.value, true\)/);assert.match(ui,/if\(!r\.ok\)return \{\.\.\.local,by:'local'/);assert.match(ui,/lk_ia_off/);});
test('barre du calculateur : la lecture locale répond tout de suite ; l’IA n’est appelée que si la phrase va au-delà, puis complète les cases',async()=>{
 const {load}=require('./runtime-helper.cjs'),p=await load(root,'calculateurs.html',{});
 try{const H=p.w.LKCalcHub,stored=()=>JSON.parse(p.w.localStorage.getItem('lk-calculator-v1'));
  for(const q of ['J’ai 200 000 $ et je veux 1 million','Combien de temps pour atteindre 1,5 million avec 2 h par jour ?'])assert.equal(H.needsAI(q,H.route(q)),false,'phrase comprise : pas d’appel · '+q);
  for(const q of ['je gagne entre 20 000 et 40 000 par heure, combien de temps pour 1 million ?','je réussis 70 % des braquages','bonjour','j’ai 300 000 $, les missions rapportent 25 000 $ par mission'])assert.equal(H.needsAI(q,H.route(q)),true,'au-delà de la lecture locale · '+q);
  const seen=[];p.w.fetch=async(url,opt)=>{seen.push({url,body:JSON.parse(opt.body)});return {ok:true,status:200,json:async()=>({ok:true,mode:'calcul',outil:'goal',cases:[{chemin:'goal.hourly',valeur:30000}],scenarios:[{nom:'Si je gagne 20 000 par heure',cases:[{chemin:'goal.hourly',valeur:20000}]}],note:'Compris.'})};};
  const out=p.d.getElementById('calc-ask-out');p.d.getElementById('calc-ask-input').value='J’ai 200 000 $, je gagne entre 20 000 et 40 000 par heure, je veux 1 million';
  p.d.getElementById('calc-ask').dispatchEvent(new p.w.Event('submit',{bubbles:true,cancelable:true}));p.flush();
  assert.equal(stored().goal.capital,200000,'réponse locale immédiate');assert.equal(stored().goal.target,1000000);assert.match(out.textContent,/Je lis ta demande…/);
  for(let i=0;i<50&&!/Compris/.test(out.textContent);i++)await new Promise(r=>setImmediate(r));p.flush();
  assert.equal(stored().goal.hourly,30000,'case remplie par l’IA puis validée par le calculateur');assert.equal(stored().goal.capital,200000);
  assert.match(out.textContent,/Compris\./);assert.match(out.textContent,/Si je gagne 20 000 par heure : /);assert.doesNotMatch(out.textContent,/Je lis ta demande/);
  assert.equal(seen.length,1);assert.equal(seen[0].url,'/api/ia');assert.equal(seen[0].body.mode,'calcul');assert.match(seen[0].body.state,/"capital":200000/,'le résumé envoyé contient la réponse locale');
  assert.deepEqual(p.errors,[]);}finally{p.close();}});
