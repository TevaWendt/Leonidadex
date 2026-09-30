'use strict';
/* v7.53 — revue de conformité au cahier des charges, après le lot 5. Un test par écart relevé par la relecture
   indépendante ; références écrites à la main. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(process.env.SITE_ROOT||path.join(__dirname,'../..')),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const {load}=require('./runtime-helper.cjs');
const B=require(path.join(root,'calculateurs-scenario.js')),M=require(path.join(root,'calculateurs-modele.js')),E=require(path.join(root,'calculateurs-engine.js'));
const initial=B.initial('v753',[]),fresh=()=>B.copy(initial);
const asset=(key,name,price,extra={})=>({...B.copy(B.assetTemplate),key,name,price,...extra});

test('coût d’usage : « non renseigné » n’est pas « sans objet » quand une autre option en a un (la comparaison reste ouverte)',()=>{
  const s=fresh();s.goal.capital=500000;s.analysis.horizon.sessions=15;s.compare.criterion='cheapestTotal';
  s.assets=[asset('a','A',100000,{usage:{perSession:4000,perUse:null,uses:null}}),asset('b','B',130000)];s.purchase.key='a';s.roi.key='a';s.compare.keys=['a','b'];
  const r=B.evaluate('compare',s,[]);assert.equal(r.best,null,'B ne gagne plus à tort à 130 000');assert.equal(r.undecided,true);
  const x=B.analysis('compare',s,[]);assert.equal(x.rows.find(y=>y.key==='b').usage.source,'blank');
  s.assets[1].usage={perSession:0,perUse:null,uses:null};assert.equal(B.evaluate('compare',s,[]).best,'B','0 écrit : 130 000 contre 100 000 + 15 × 4 000 = 160 000');
});

test('« Quoi acheter d’abord ? » sans achat : pas de « Ordre proposé : : 0 min », pas de « Et si… » vide',()=>{
  const s=fresh();s.order.keys=[];const x=B.analysis('order',s,[]);
  const d=(x.explain&&x.explain.drivers)||[];assert.ok(d.length);assert.doesNotMatch(d.map(y=>y.label+' : '+y.text).join(' '),/: : |0 min de jeu au total/);
  assert.match(d[0].text,/Aucun achat à ordonner/);const se=B.sensitivity('order',s,[]);assert.equal(se.pending,true,'v7.54 : le bloc « Et si » reste, avec ce qu’il faut écrire');assert.match(se.need,/Ajoute au moins un achat/);
});

test('business plan : prévu, commencé et fait sont distincts ; « commencé » ne crédite rien',()=>{
  const s=fresh();s.plan.goal={...s.plan.goal,kind:'amount',target:1000000,meaning:'held'};s.plan.situation={...s.plan.situation,capital:100000,reserve:20000,dailyMinutes:null};s.plan.source='missions';
  s.plan.prerequisites=[{...B.copy(B.planPrereqTemplate),id:'p-1',name:'Véhicule requis',price:60000,minutes:12}];
  s.plan.missions=[{...B.copy(B.planMissionTemplate),id:'m-1',name:'Déblocage',reward:0,cost:0,duration:10,once:true},{...B.copy(B.planMissionTemplate),id:'m-2',name:'Répétable',reward:150000,cost:5000,duration:30,requires:['p-1'],requiresMissions:['m-1']}];
  const base=B.evaluate('plan',B.validate(s,initial),[]);
  const started=B.copy(s);started.plan.missions[0].started=true;started.plan.prerequisites[0].started=true;const rs=B.evaluate('plan',B.validate(started,initial),[]);
  assert.equal(rs.totalMinutes,base.totalMinutes,'commencé : même calcul que prévu');assert.equal(rs.finalCash,base.finalCash);
  const done=B.copy(s);done.plan.missions[0].done=true;done.plan.prerequisites[0].owned=true;const rd=B.evaluate('plan',B.validate(done,initial),[]);
  assert.ok(rd.totalMinutes<base.totalMinutes,'fait : le déblocage et l’achat ne sont plus à faire');
  assert.equal(B.validate(started,initial).plan.missions[0].started,true,'l’état « commencé » est gardé dans la sauvegarde');
  const old=B.copy(s);delete old.plan.missions[0].started;assert.equal(B.validate(old,initial).plan.missions[0].started,false,'ancienne sauvegarde : « prévu » par défaut');
  assert.match(read('calculateurs-plan.js'),/Commencée \(pas encore comptée\)/);
});

test('recherche d’ordre : exhaustive jusqu’à 6, recherche locale au-delà, identique à l’exhaustif sur 200 cas tirés au sort ; chaque saisie reste rapide',()=>{
  let seed=11;const rnd=()=>(seed=(seed*1103515245+12345)%2147483648)/2147483648;let same=0;
  for(let c=0;c<200;c++){const n=4+Math.floor(rnd()*3);const items=Array.from({length:n},(_,i)=>({id:'x'+i,price:Math.round(10+rnd()*200)*1000,boostHourly:Math.round(rnd()*40)*1000,before:[]}));if(rnd()<0.4)items[n-1].before=['x0'];
    const run=o=>{const r=E.order({capital:50000,reserve:0,hourly:30000,items:o.map(id=>({name:id,...items.find(x=>x.id===id)}))});return r.valid?{valid:true,result:r,key:[r.totalHours,-(r.finalHourly||0)]}:{valid:false,key:[Infinity]};};
    const ex=M.sequences(items,run,{exhaustiveUpTo:6}),he=M.sequences(items,run,{exhaustiveUpTo:0});
    assert.equal(ex.method,'exhaustive');assert.equal(he.method,'heuristic');if(Math.abs(ex.best.result.result.totalHours-he.best.result.result.totalHours)<1e-9)same++;}
  assert.equal(same,200);
  const s=fresh();s.goal.capital=100000;s.goal.hourly=50000;s.assets=[...s.assets,...Array.from({length:12},(_,i)=>asset('a'+i,'A'+i,20000+i*7000,{incomeMode:'personal',boostHourly:3000+i*500}))];s.order.keys=s.assets.filter(a=>/^a\d/.test(a.key)).map(a=>a.key);
  const v=B.validate(s,initial);B.evaluate('order',v,[]);const t0=Date.now();B.evaluate('order',v,[]);B.analysis('order',v,[]);assert.ok(Date.now()-t0<500,'12 achats : moins d’une demi-seconde (mesuré ~30 ms)');
});

test('recherche du site : chaque calcul et le business plan ont leur entrée, vers le bon outil',()=>{
  const c={window:{}};vm.runInNewContext(read('search-index.js'),c);const idx=c.window.LK_INDEX;
  for(const t of ['goal','purchase','session','budget','order','roi','activities','compare','plan'])assert.ok(idx.some(e=>e.u==='/calculateurs.html?tool='+t+'#atelier'),t);
  const find=q=>idx.filter(e=>e.s.includes(q)).map(e=>e.u);assert.ok(find('carburant').some(u=>/tool=compare/.test(u)));assert.ok(find('business plan').some(u=>/tool=plan/.test(u)));
});

test('carte : aucun temps de trajet par défaut ; la simulation se demande et se dit « GTA V »',()=>{
  const js=read('carte.js'),html=read('carte.html');assert.match(js,/let simTrajets = false;/);assert.match(js,/Simuler des temps de trajet \(vitesses de GTA V/);
  assert.doesNotMatch(html,/temps de trajet selon sept modes|modes de trajet/);assert.match(html,/Aucun temps de trajet n’est donné par défaut/);
});

test('Léo : un achat déjà au garage est « déjà possédé » comme au calculateur ; sinon, la même fonction du moteur et ce qui n’est pas compté',async()=>{
  const src=read('leo-core.js');assert.match(src,/ownedInCarnet\(selected\[0\]\)/);assert.match(src,/E\.worth\(/);assert.match(src,/Sans options, frais obligatoires ni coût d’usage/);
  const C=require(path.join(root,'leo-core.js')),json=f=>JSON.parse(read(f)),data=json('leo-index.json');
  const core=C.create(data,{load:async(name,file)=>JSON.parse(read(file.slice(1)))});for(const name of Object.keys(data.shards))core.attach(name,JSON.parse(read(data.shards[name].file.slice(1))));
  const store=new Map(),prev=globalThis.localStorage;globalThis.localStorage={getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v))};
  try{const ctx={tool:'purchase',values:{capital:100000,price:50000}};
    const a=core.choose('vehicle:albany-emperor',ctx);assert.match(a.note,/il te restera 50\s000\s\$/);assert.match(a.note,/Sans options, frais obligatoires ni coût d’usage/);
    store.set('lk_own_vehicules','{"albany-emperor":1}');const b=core.choose('vehicle:albany-emperor',ctx);assert.match(b.note,/déjà coché Albany Emperor dans «\sMon garage\s»/);}
  finally{if(prev===undefined)delete globalThis.localStorage;else globalThis.localStorage=prev;}
});

test('sélection des listes → budget : achats libres, prix inconnu (jamais 0), 12 au plus, texte seulement',async()=>{
  const p=await load(root,'calculateurs.html?tool=budget&achats='+encodeURIComponent('Sprunk|eCola|<img src=x>|Sprunk')+'&from=nourriture',{storage:{}});
  try{const s=JSON.parse(p.w.localStorage.getItem('lk-calculator-v1'));const names=s.order.keys.map(k=>s.assets.find(a=>a.key===k)).filter(Boolean);
    assert.deepEqual(names.map(a=>a.name),['Sprunk','eCola'],'doublon et balise écartés');assert.ok(names.every(a=>a.price===null),'prix inconnu, jamais 0');assert.equal(s.budget.source,'basket');
    assert.match(p.d.getElementById('calc-live').textContent,/Rien n’est compté à 0/);assert.deepEqual(p.errors,[]);}finally{p.close();}
  assert.match(read('consommables.js'),/tool=budget&achats=/);assert.match(read('carnets.js'),/Préparer ces envies dans mon budget/);
});

test('Tuto : textes de la version finale, critères lus dans le registre, plus de légende « captures anciennes »',()=>{
  const html=read('tuto.html');assert.doesNotMatch(html,/ont changé de place depuis cette capture|Me fait gagner en plus/);assert.match(html,/Comparer des ordres selon le délai/,'v7.54 : le bloc de la v7.47 est de retour');
  assert.match(html,/Ce que le calcul prend en compte/);assert.match(html,/Commencé \(pas encore à moi\)/);assert.match(html,/1 h 36 de jeu/);
  const tools=JSON.parse(read('outils/tuto.json')).chapters.map(c=>c.tool),F=JSON.parse(read('outils/modele-donnees.json')).facteurs;
  for(const t of tools){const n=F.filter(f=>f.outils.includes(t)).length;assert.ok(html.includes('Tous les critères de cet outil ('+n+')'),t);}
  const shots=JSON.parse(read('outils/tuto-captures.json'));for(const k of Object.keys(shots))assert.ok(fs.existsSync(path.join(root,shots[k].src.slice(1))),k);
});

test('rendu : pastilles de statut dessinées, lieux homonymes distingués, grille des adresses et tableau du Tuto repliés sur téléphone, en-tête non collant en fenêtre basse',()=>{
  const css=read('acquisitions.css');assert.match(css,/\.cg-st \.pip\{width:12px/);assert.match(css,/@media\(max-width:700px\)\{\.d-grid--3\{grid-template-columns:minmax\(0,1fr\)/);
  assert.match(read('tuto.css'),/@media\(max-width:560px\)\{\.t-table-wrap table/);assert.match(read('style.css'),/@media \(max-height:520px\)\{\s*body>header\{position:relative!important\}/);
  const n=read('nourriture.html');assert.match(n,/Xero Gas Station \(2 lieux\)/);assert.doesNotMatch(n,/Xero Gas Station · Xero Gas Station|Xero Gas Station, Xero Gas Station/);
  assert.match(read('calculateurs-data.js'),/function catLabel\(type, id\)/);assert.match(read('calculateurs-scenario.js'),/fromVehicle\(\{cat:item.categoryId/);
});

test('mode Simple : l’argent de côté écrit dans le formulaire n’est pas annoncé « changé en mode Expert » (sauf « Mon objectif », où il est replié)',async()=>{
  const p=await load(root,'calculateurs.html?tool=budget',{storage:{}});
  try{const set=(id,v)=>{const el=p.d.getElementById(id);el.value=v;el.dispatchEvent(new p.w.Event('input',{bubbles:true}));el.dispatchEvent(new p.w.Event('change',{bubbles:true}));p.flush();};
    set('budget-reserve','30000');assert.doesNotMatch(p.d.getElementById('mode-summary-budget').textContent,/argent de côté/);
    p.d.querySelector('[data-tab="goal"]').click();p.flush();assert.match(p.d.getElementById('mode-summary-goal').textContent,/Changé en mode Expert\s:\sargent de côté 30\s000\s\$/);
    assert.deepEqual(p.errors,[]);}finally{p.close();}
});

test('Véhicules : le bandeau des marques sous l’en-tête est rempli depuis les données de la page (plus de bande noire vide)',async()=>{
  const p=await load(root,'vehicules.html',{storage:{}});
  try{const t=p.d.getElementById('vstrip').textContent;assert.match(t,/Albany/);assert.match(t,/Pegassi/);assert.doesNotMatch(t,/Marque inconnue/);
    assert.equal(p.d.querySelector('.vhero-strip').hidden,false);assert.deepEqual(p.errors,[]);}finally{p.close();}
  assert.match(read('style.css'),/\.vhero-strip-track\{\s*display:flex; width:max-content;/,'les deux moitiés de la boucle sur une seule ligne');
});

test('propriété : réordonner les candidats ne change ni le gagnant de chaque critère ni les ex æquo (300 listes tirées au sort, égalités fréquentes)',()=>{
  let seed=7;const rnd=()=>(seed=(seed*1103515245+12345)%2147483648)/2147483648,pickOne=a=>a[Math.floor(rnd()*a.length)];
  for(let c=0;c<300;c++){const n=2+Math.floor(rnd()*4);
    const items=Array.from({length:n},(_,i)=>({name:'O'+i,price:pickOne([50000,100000,150000,null]),utility:pickOne([3,5]),incomeHourly:pickOne([null,20000,40000])}));
    const input={capital:pickOne([60000,200000]),reserve:0,hourly:pickOne([null,50000]),dailyMinutes:60,hours:10,criterion:'value'};
    const a=E.choose({...input,items});if(!a.valid)continue;
    const shuffled=items.slice().sort(()=>rnd()-0.5),b=E.choose({...input,items:shuffled});
    assert.deepEqual(b.bestByCriterion,a.bestByCriterion,'cas '+c);
    for(const k of Object.keys(a.ties))assert.deepEqual([...b.ties[k]].sort(),[...a.ties[k]].sort(),'ex æquo, cas '+c+' '+k);}
  const r=E.choose({capital:200000,reserve:0,criterion:'fastest',items:[{name:'Kamacho',price:150000,utility:5},{name:'Bati 801',price:50000,utility:3}]});
  assert.equal(r.best,'Bati 801','tous deux payables tout de suite : départagé par le rapport envie / prix');assert.deepEqual(r.ties.fastest,['Bati 801','Kamacho']);
  assert.match(read('calculateurs-workspace.js'),/à égalité avec /);
});
