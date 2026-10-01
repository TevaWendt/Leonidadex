'use strict';
/* v7.54 — deux audits (30 septembre 2026) : les fonctions du mode Expert de la v7.47 retirées pendant la mission sont de retour
   (à côté des ajouts), et les écarts relevés par l’audit indépendant du cahier des charges sont corrigés. Références écrites
   à la main. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(process.env.SITE_ROOT||path.join(__dirname,'../..')),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const {load}=require('./runtime-helper.cjs');
const B=require(path.join(root,'calculateurs-scenario.js')),M=require(path.join(root,'calculateurs-modele.js')),E=require(path.join(root,'calculateurs-engine.js'));
const initial=B.initial('v754',[]),fresh=()=>B.copy(initial);
const asset=(key,name,price,extra={})=>({...B.copy(B.assetTemplate),key,name,price,...extra});
const P=[{id:'scenario-a',name:'A',reward:25000,cost:2500,duration:12,prep:3,cooldown:5,share:100,investment:0,players:1},{id:'scenario-b',name:'B',reward:120000,cost:10000,duration:40,prep:10,cooldown:10,share:100,investment:0,players:4}];

/* ---------- Ce qui revient de la v7.47 ---------- */

test('Quoi acheter d’abord ? : « Comparer des ordres selon le délai » est de retour (saisi, inverse, prix croissants) avec ses deux boutons, à côté de l’ordre proposé',()=>{
  const s=fresh();s.goal.capital=200000;s.goal.hourly=50000;
  s.assets=[asset('a','Feroci',30000),asset('b','Kamacho',100000),asset('c','Bati 801',150000)];s.order.keys=['c','b','a'];
  const x=B.analysis('order',s,[]);assert.equal(x.valid,true);
  assert.deepEqual(x.manual.map(m=>m.label),['Inverse','Prix croissants']);
  assert.deepEqual(x.manual[0].order,['a','b','c'],'l’inverse de c,b,a');assert.deepEqual(x.manual[1].order,['a','b','c'],'prix croissants');
  assert.equal(x.manual[1].valid,true);assert.ok(x.manual[1].result.totalHours<=x.given.result.totalHours+1e-9,'les prix croissants ne font pas pire que l’ordre saisi ici');
  const js=read('calculateurs-workspace.js');assert.match(js,/Comparer des ordres selon le délai/);assert.match(js,/data-b-reverse="1"/);assert.match(js,/data-b-cheapest="1"/);
  assert.match(read('outils/tuto.json'),/Comparer des ordres selon le délai/);
});

test('mode Expert : le bloc « Et si le chiffre bouge de 20 % ? » reste présent sans achat (il dit ce qu’il faut écrire) et la ligne « Temps pour regagner le prix » est revenue dans la comparaison',()=>{
  const s=fresh();s.order.keys=[];s.compare.keys=[];
  assert.equal(B.sensitivity('order',s,[]).pending,true);assert.match(B.sensitivity('order',s,[]).need,/Ajoute au moins un achat/);
  assert.equal(B.sensitivity('compare',s,[]).pending,true);
  s.assets=[asset('a','A',100000),asset('b','B',130000)];s.order.keys=['a','b'];s.compare.keys=['a','b'];s.goal.hourly=50000;
  assert.ok(Array.isArray(B.sensitivity('order',s,[]).rows),'avec des achats, la courbe revient');
  assert.match(read('calculateurs-workspace.js'),/\['Temps pour regagner le prix',\.\.\.r\.items\.map/);
  assert.match(read('calculateurs-workspace.js'),/b-explain-keys/,'les chiffres clés avec « Modifier » au premier niveau de « Ce qui compte »');
});

test('comparateur : les deux liens vers le calculateur (« Quel achat choisir ? » et « Lequel puis-je acheter ? »)',()=>{
  const html=read('comparateur.html');assert.match(html,/id="cmp-calculator-link"[^>]*>Quel achat choisir\s\?/);assert.match(html,/id="cmp-purchase-link"[^>]*>Lequel puis-je acheter\s\?/);
  assert.match(read('comparateur.js'),/cmp-purchase-link/);
});

/* ---------- Écarts bloquants de l’audit (business plan) ---------- */

test('parcours sans durée de partie : attendre la mission la plus rentable vaut mieux que lancer n’importe laquelle (cas de l’audit : 25 min, pas 1 h 11) ; un sous-ensemble plus rapide est trouvé et dit',()=>{
  const r=E.missionPlan({capital:320000,reserve:0,target:720000,activities:[{id:'a0',name:'Course éclair',reward:140000,cost:5000,duration:5,prep:0,cooldown:5,share:100},{id:'a1',name:'Livraison',reward:35000,cost:5000,duration:25,prep:2,cooldown:0,share:25},{id:'a2',name:'Casse',reward:115000,cost:3000,duration:28,prep:1,cooldown:15,share:50}]});
  assert.equal(r.valid,true);assert.equal(r.reached,true);assert.equal(r.totalMinutes,25,'4 × Course éclair (5 min + 5 min d’attente, la dernière sans attente)');
  // Sur 200 tirages, jamais plus lent qu’en retirant des missions (comparaison exhaustive des sous-ensembles).
  let seed=99;const rnd=()=>(seed=(seed*1103515245+12345)%2147483648)/2147483648,ri=(a,b)=>a+Math.floor(rnd()*(b-a+1)),pick=a=>a[Math.floor(rnd()*a.length)];
  let n=0,worse=0;for(let k=0;k<200;k++){const m=ri(2,4),acts=Array.from({length:m},(_,i)=>({id:'a'+i,name:'A'+i,reward:ri(1,30)*5000,cost:ri(0,6)*1000,duration:ri(5,30),prep:ri(0,5),cooldown:pick([0,5,15,30]),share:pick([100,100,50,25])}));
    const cap=ri(5,40)*10000,base={capital:cap,reserve:0,target:cap+ri(2,40)*20000,activities:acts},all=E.missionPlan(base);if(!all.valid||!all.reached)continue;n++;
    for(let mask=1;mask<(1<<m)-1;mask++){const sub=E.missionPlan({...base,activities:acts.filter((_,i)=>mask&(1<<i))});if(sub.valid&&sub.reached&&sub.totalMinutes<all.totalMinutes-1e-9){worse++;break;}}}
  assert.ok(n>100);assert.equal(worse,0,'aucun plan complet plus lent qu’un plan qui retire des missions');
  const sub=E.missionPlan({capital:10000,reserve:0,target:200000,activities:[{id:'x',name:'Rapide',reward:20000,cost:0,duration:5,prep:0,cooldown:0,share:100},{id:'y',name:'Lente',reward:21000,cost:0,duration:60,prep:0,cooldown:0,share:100}]});
  assert.equal(sub.valid,true);assert.equal(sub.totalMinutes,50,'10 × Rapide ; Lente n’est jamais utile');
});

test('priorité du plan : « je garde mon argent de côté » et « sécurité » ne recommandent jamais un plan qui puise dans la réserve ; bloqué et expliqué ; « le plus vite » l’autorise et le dit ; « le moins coûteux » existe',()=>{
  const mk=pr=>{const s=fresh();s.plan.goal={...s.plan.goal,kind:'amount',target:300000,meaning:'held'};s.plan.situation={...s.plan.situation,capital:30000,reserve:20000,dailyMinutes:null};s.plan.source='missions';s.plan.priority=pr;
    s.plan.missions=[{...B.copy(B.planMissionTemplate),id:'m-1',name:'Mission',reward:100000,cost:20000,duration:30}];return B.validate(s,initial);};
  for(const pr of ['balanced','safe','cheap']){const r=B.evaluate('plan',mk(pr),[]);assert.equal(r.valid,false,pr);assert.equal(r.blockedByReserve,true);assert.match(r.reason,/Aucun plan ne garde tes 20\s000 \$ de côté/);assert.match(r.reason,/au plus bas 10\s000 \$/);}
  const fast=B.evaluate('plan',mk('fast'),[]);assert.equal(fast.valid,true);assert.equal(fast.input.reserve,0);assert.equal(fast.lowPoint.cash,10000);
  assert.match(read('calculateurs-plan.js'),/\['cheap','Le moins coûteux sur tout le parcours/);
  const x=B.analysis('plan',mk('fast'),[]);const low=x.explain.drivers.find(d=>d.label==='Au plus bas');assert.ok(low);assert.doesNotMatch(low.text,/jamais sous les 0 \$/,'plus de « jamais sous 0 $ gardés » quand la réserve est utilisée');
});

test('munitions simulées : comptées dans le plan comme dans Mes activités, et dites ; les missions à trop de joueurs sont écartées et dites ; « Reprendre mes chiffres » copie groupe, coût d’usage, gain, dépendances et sens du but',async()=>{
  const mk=ammo=>{const s=fresh();s.plan.goal={...s.plan.goal,kind:'amount',target:500000,meaning:'held'};s.plan.situation={...s.plan.situation,capital:100000,reserve:0,dailyMinutes:null};s.plan.source='missions';
    s.plan.missions=[{...B.copy(B.planMissionTemplate),id:'m-1',name:'Mission',reward:50000,cost:1000,duration:20}];if(ammo){s.analysis.simulations.munitions=true;s.analysis.sim.munitions.parTentative=9000;}return B.validate(s,initial);};
  const a=B.evaluate('plan',mk(false),[]),b=B.evaluate('plan',mk(true),[]);assert.ok(b.totalMinutes>a.totalMinutes&&b.finalCash<a.finalCash,'9 000 $ de munitions par tentative changent le plan');
  const xb=B.analysis('plan',mk(true),[]);assert.ok(xb.explain.changes.some(c=>/Munitions simulées\s:\s9\s000\s\$/.test(c)));assert.ok(xb.explain.values.some(v=>/Munitions simulées/.test(v.label)));
  // v7.54 (contrôle visuel) : le groupe écrit dans « Nous jouons à » est gardé à l’enregistrement (l’état de départ le connaît), et 1 par défaut.
  {const k=fresh();k.plan.situation.players=2;assert.equal(B.validate(k,initial).plan.situation.players,2);delete k.plan.situation.players;assert.equal(B.validate(k,initial).plan.situation.players,1);assert.equal(initial.plan.situation.players,1);}
  const g=mk(false);g.plan.situation.players=3;g.plan.missions.push({...B.copy(B.planMissionTemplate),id:'m-2',name:'À quatre',reward:900000,cost:0,duration:10,players:4});const rg=B.evaluate('plan',B.validate(g,initial),[]);
  assert.deepEqual(rg.input.excludedMissions.map(m=>m.name),['À quatre']);assert.equal(rg.totalMinutes,a.totalMinutes,'la mission à quatre ne compte pas quand on joue seul');
  // Import complet, dans la page.
  const p=await load(root,'calculateurs.html?tool=plan',{storage:{}});
  try{const s0=JSON.parse(p.w.localStorage.getItem('lk-calculator-v1'));s0.goal.players=4;s0.goal.meaning='held';s0.goal.upkeepPerSession=3000;s0.model='cycles';
    s0.assets=[...s0.assets,asset('g','Garage',50000),asset('v','Voiture',80000,{requires:['g'],incomeMode:'personal',boostHourly:30000,usage:{perSession:5000,perUse:null,uses:null}})];s0.order.keys=['g','v'];
    s0.activities[0]={...s0.activities[0],name:'Mission à quatre',players:4};s0.session.enabled=[s0.activities[0].id];
        const q=await load(root,'calculateurs.html?tool=plan',{storage:{'lk-calculator-v1':JSON.stringify(s0)}});
    try{q.d.querySelector('[data-b-plan-import-calcs]').click();q.flush();const s1=JSON.parse(q.w.localStorage.getItem('lk-calculator-v1'));
      assert.equal(s1.plan.situation.players,4);assert.equal(s1.plan.situation.upkeepPerSession,3000);assert.equal(s1.plan.goal.meaning,'held');
      const v=s1.plan.prerequisites.find(x=>x.name==='Voiture'),gg=s1.plan.prerequisites.find(x=>x.name==='Garage');assert.ok(v&&gg);assert.equal(v.usagePerSession,5000);assert.equal(v.boostHourly,30000);assert.deepEqual(v.requires,[gg.id]);
      const m=s1.plan.missions.find(x=>x.name==='Mission à quatre');assert.equal(m.players,4);assert.deepEqual(q.errors,[]);}finally{q.close();}}
  finally{p.close();}
});

/* ---------- Écarts importants ---------- */

test('Quel achat choisir ? : l’envie n’est plus notée par le site ; sans note, la réponse par défaut devient « le moins cher » et le dit ; un prix inconnu rend la réponse conditionnelle',()=>{
  assert.equal(B.assetTemplate.utility,null);
  const s=fresh();s.goal.capital=500000;s.assets=[asset('a','A',150000),asset('b','B',50000)];s.compare.keys=['a','b'];
  const r=B.evaluate('compare',s,[]);assert.equal(r.criterion,'cheapest');assert.equal(r.best,'B');assert.deepEqual(r.fallback.unrated.sort(),['A','B']);
  s.assets[0].utility=5;s.assets[1].utility=3;const r2=B.evaluate('compare',s,[]);assert.equal(r2.criterion,'value');assert.equal(r2.best,'B','3/50 000 > 5/150 000');assert.equal(r2.fallback,undefined);
  const js=read('calculateurs-workspace.js');assert.match(js,/'— pas notée'/);assert.match(js,/n’a pas de prix\s:\sla réponse vaut pour les prix connus seulement/);
  assert.match(read('calculateurs-engine.js'),/entry\.utility === null \|\| entry\.utility === undefined \? null/);
});

test('exemples : un chiffre encore égal à l’exemple est étiqueté « exemple » et le bandeau dit « calculé avec les exemples » ; après une saisie, « ton chiffre »',async()=>{
  const p=await load(root,'calculateurs.html?tool=goal',{storage:{}});
  try{assert.match(p.d.querySelector('#goal-results .calc-tag').textContent,/LES EXEMPLES/);
    assert.ok(p.d.querySelectorAll('#goal-results .b-explain .b-assumptions li.is-example').length>=3);
    const el=p.d.getElementById('f-goal-capital');el.value='250000';el.dispatchEvent(new p.w.Event('input',{bubbles:true}));p.flush();
    const li=[...p.d.querySelectorAll('#goal-results .b-explain .b-explain-more .b-assumptions li')].find(l=>/J’ai déjà/.test(l.textContent));assert.ok(li&&!li.classList.contains('is-example'));assert.match(li.querySelector('.b-origin').textContent,/ton chiffre/);
    assert.match(p.d.querySelector('#goal-results .calc-tag').textContent,/TES CHIFFRES/);assert.deepEqual(p.errors,[]);}finally{p.close();}
});

test('Mon budget : un coût d’usage non confirmé n’est ni compté ni tu ; Quoi acheter d’abord ? : un prérequis sorti du panier bloque avec la raison',()=>{
  const cat=[{id:'veh-x',type:'vehicle',name:'Véhicule X',category:'suv',price:null,purchasable:null}];
  const s=fresh();s.goal.capital=300000;s.goal.hourly=50000;s.goal.dailyMinutes=60;s.analysis.horizon.sessions=10;
  s.assets=[asset('veh-x','Véhicule X',100000,{itemId:'veh-x'})];s.order.keys=['veh-x'];s.budget.source='basket';
  const x=B.analysis('budget',s,[],{catalogue:cat});assert.equal(x.perSession.complete,false);assert.deepEqual(x.perSession.unconfirmed,['Véhicule X']);
  assert.ok(x.explain.missing.some(m=>/Coût d’usage de « Véhicule X »/.test(m.label)));
  const o=fresh();o.goal.capital=300000;o.assets=[asset('g','Garage',50000),asset('v','Voiture',100000,{requires:['g']})];o.order.keys=['v'];
  const r=B.evaluate('order',o,[]);assert.equal(r.valid,false);assert.match(r.reason,/« Voiture » demande d’abord « Garage », qui n’est plus dans le panier/);
  o.assets[0].owned=true;assert.equal(B.evaluate('order',o,[]).valid,true,'déjà possédé : la dépendance est satisfaite');
});

test('tentatives ratées : chiffrées dans Mon objectif (missions) et Mon temps de jeu, et dites ; le registre les liste pour ces outils',()=>{
  const s=B.initial('v754',P);s.model='cycles';s.goal.selected='scenario-a';s.analysis.simulations.echec=true;s.analysis.sim.echec.tentativesRatees=3;
  const xg=B.analysis('goal',s,[]);const dg=xg.explain.drivers.find(d=>/ratent/.test(d.label));assert.ok(dg);assert.match(dg.text,/54 tentatives au lieu de 36/,'36 réussites nécessaires : 36 × 22 500 ÷ (0,7 × 25 000 − 2 500) = 54');
  const xs=B.analysis('session',s,[]);const ds=xs.explain.drivers.find(d=>/ratent/.test(d.label));assert.ok(ds);assert.match(ds.text,/au lieu de/);
  const F=JSON.parse(read('outils/modele-donnees.json')).facteurs.find(f=>f.id==='scenario-echec');assert.ok(F.outils.includes('goal')&&F.outils.includes('session'));
  assert.deepEqual(xg.explain.unaccounted,[]);assert.deepEqual(xs.explain.unaccounted,[]);
});

test('fiches : une arme de mêlée ou de jet dit « sans objet » pour chargeur, rechargement et munitions ; un vélo ou un kayak pour le carburant ; plus d’« arme de poing rangée dans la ceinture » pour une batte',()=>{
  const w=M.fromWeapon({id:'batte',cat:'melee',st:'vu',portee:'Corps à corps',mun:null});assert.equal(w.ammoType.s,'na');assert.equal(w.capacity.s,'na');assert.equal(w.reload.s,'na');assert.equal(w.ammoCost.s,'na');
  const j=M.fromWeapon({id:'molotov',cat:'projectile',st:'vu',mun:null});assert.equal(j.capacity.s,'na');assert.equal(j.rate.s,'unknown','un projectile garde une cadence à confirmer');
  assert.equal(M.fromVehicle({id:'bmx',cat:'divers'}).fuel.s,'na');assert.equal(M.fromVehicle({id:'crest-kayak',cat:'bateau'}).fuel.s,'na');assert.equal(M.fromVehicle({id:'canis-kamacho',cat:'suv'}).fuel,undefined);
  const html=read('armes/batte.html');assert.doesNotMatch(html,/arme de poing/);assert.match(html,/arme de mêlée/);assert.match(html,/<dt>Chargeur<\/dt><dd><span class="doc-v">Ne s’applique pas/);
  assert.match(read('vehicules/bmx.html'),/<dt>Carburant<\/dt><dd><span class="doc-v">Ne s’applique pas/);
  /* v7.56 : le port d’armes est sourcé depuis le lot 2 (Rob Nelson via GamingBolt, 07/09/2026 : deux armes de poing dissimulées et deux armes longues) ; l’ancien « Nombre non limité annoncé » est retiré et l’inventaire renvoie à cette source. */
  const ed=read('outils/hubs-editoriaux.json');assert.doesNotMatch(ed,/Nombre non limité annoncé/);assert.match(ed,/Deux armes de poing dissimulées sur soi d’après Rob Nelson/);assert.match(ed,/gamingbolt\.com\/gta-6-lets-you-carry-2-concealed-handguns/);
});

test('carnets et catalogues : repères de la série marqués et comptés à part ; Collectibles renvoie au carnet ; la ligne visée passe sous les bandeaux et sa fiche s’ouvre ; Progression tient sans stockage',async()=>{
  const gr=read('carnets/garde-robe.html');assert.match(gr,/data-cn-serie/);const data=JSON.parse(gr.match(/<script[^>]*id="lk-carnet-data"[^>]*>([\s\S]*?)<\/script>/)[1]);
  const serie=data.items.filter(it=>it.sr);assert.ok(serie.length>=40,'coiffures et tatouages de GTA V / Online marqués');assert.ok(serie.every(it=>['coiffures','tatouages','tenues','accessoires'].includes(it.f)));
  assert.match(read('carnets.js'),/Repère de la série/);
  const col=read('collectibles.html');assert.match(col,/href="carnets\/collectibles\.html">Ouvrir mon carnet des collectibles/);assert.doesNotMatch(col,/href="#suivi">Ouvrir mon carnet</);
  assert.match(read('catalogue.js'),/fiche\.open = true/);assert.match(read('catalogue.js'),/scrollBy\(0, -\(stuck \+ 12\)\)/);
  const p=await load(root,'progression.html',{before:w=>{Object.defineProperty(w,'localStorage',{get(){throw new Error('SecurityError');}});}});
  try{assert.deepEqual(p.errors.filter(e=>!/SecurityError/.test(e)),[]);assert.match(p.d.getElementById('save-msg').textContent,/stockage de ce navigateur est indisponible/);}finally{p.close();}
});

test('Léo : « combien de temps pour 1 000 000 $ » est un objectif ; deux achats nommés partent tous les deux dans « Quoi acheter d’abord ? »',async()=>{
  const C=require(path.join(root,'leo-core.js')),json=f=>JSON.parse(read(f)),data=json('leo-index.json');
  const core=C.create(data,{load:async(name,file)=>JSON.parse(read(file.slice(1)))});for(const name of Object.keys(data.shards))core.attach(name,JSON.parse(read(data.shards[name].file.slice(1))));
  const a=await core.answer('J’ai 200 000 $, je gagne 50 000 $ par heure. Combien de temps pour 1 000 000 $ ?',{});assert.equal(a.kind,'calc');assert.equal(a.request.tool,'goal');assert.equal(a.request.values.target,1000000);assert.equal(a.request.values.price,undefined);
  const b=await core.answer('quoi acheter en premier entre la cheetah et l’emperor ?',{});assert.equal(b.kind,'calc');assert.equal(b.request.tool,'order');assert.deepEqual(b.request.items.slice().sort(),['albany-emperor','grotti-cheetah-classic']);
  const c=await core.answer('combien coute le kamacho',{});assert.match(c.text,/aucun prix/i);
});
