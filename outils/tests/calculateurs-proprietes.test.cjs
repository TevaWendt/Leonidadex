'use strict';
/* Check ultime du calculateur (v7.59) — CALC-04 : propriétés du moteur, vérifiées sur des milliers de cas générés
   par un générateur déterministe (même graine → mêmes cas). Monotonie, bornes, unités, identités, limites documentées,
   valeurs extrêmes, saisie en cours. Aucun chiffre ici n'est une donnée de GTA VI. */
const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const H=require('./check-ultime-helper.cjs'),root=H.root;
const E=require(path.join(root,'calculateurs-engine.js')),B=require(path.join(root,'calculateurs-scenario.js'));
const {D,catalogue,sourceActivities,presets}=H.siteData(),initial=B.initial(H.dataVersion(D,catalogue,sourceActivities),presets);
const N=Number(process.env.LK_PROP_CASES||3000);
const finite=v=>typeof v==='number'?Number.isFinite(v):v===null||typeof v==='string'||typeof v==='boolean'||v===undefined||(Array.isArray(v)?v.every(finite):v&&typeof v==='object'?Object.values(v).every(finite):true);
/* Aucune sortie n'est NaN, Infinity ou undefined ; un calcul refusé a une raison lisible. */
function sane(r,label){assert.equal(typeof r.valid,'boolean',label);if(!r.valid){assert.equal(typeof r.reason,'string',label+' : raison');assert.ok(r.reason.length>3,label+' : raison lisible');}assert.ok(finite(r),label+' : aucune valeur non finie : '+JSON.stringify(r).slice(0,200));}
const act=(r,o={})=>({reward:H.amount(r,1e9),cost:H.amount(r,1e6),duration:1+Math.floor(r()*120),prep:Math.floor(r()*30),cooldown:Math.floor(r()*60),share:r()<0.2?Math.round(r()*100):100,investment:r()<0.3?H.amount(r,1e8):0,players:r()<0.1?1+Math.floor(r()*4):1,...o});

test('activity : net, temps actif, cycle, rendement, remboursement — formules et bornes ('+N+' cas)',()=>{const r=H.rng(1);let ok=0;
 for(let i=0;i<N;i+=1){const a=act(r);const x=E.activity(a);sane(x,'activity');if(!x.valid)continue;ok++;
  assert.ok(Math.abs(x.net-(a.reward*a.share/100-a.cost))<1e-6*Math.max(1,a.reward),'net');assert.equal(x.activeMinutes,a.duration+a.prep);assert.equal(x.cycleMinutes,a.duration+a.prep+a.cooldown);
  assert.ok(Math.abs(x.hourly-x.net*60/x.cycleMinutes)<1e-6*Math.max(1,Math.abs(x.hourly)),'rendement = net × 60 ÷ cycle');
  if(a.investment===0)assert.equal(x.paybackRuns,0);else if(x.net<=0)assert.equal(x.paybackRuns,null);else{assert.ok(Number.isSafeInteger(x.paybackRuns)&&x.paybackRuns>=1);assert.ok(x.paybackRuns*x.net>=a.investment-1e-6&&(x.paybackRuns-1)*x.net<a.investment);}}
 assert.ok(ok>N*0.9,'la plupart des cas sont valides');
 /* entrées refusées, jamais transformées en 0 */
 for(const bad of [{},{reward:null,duration:10},{reward:'25000',duration:10},{reward:25000,duration:0},{reward:25000,duration:-1},{reward:-5,duration:10},{reward:1e13,duration:10},{reward:25000,duration:10,share:101},{reward:25000,duration:10,players:0},{reward:25000,duration:10,players:1.5},{reward:25000,duration:1e6+1}])assert.equal(E.activity(bad).valid,false,JSON.stringify(bad));
 assert.equal(E.activity({reward:25000,duration:10,cost:undefined}).valid,true,'frais omis = 0 (valeur par défaut documentée)');});

test('goalContinuous : monotonie, identités, réserve jamais entamée ('+N+' cas)',()=>{const r=H.rng(2);let reached=0;
 for(let i=0;i<N;i+=1){const capital=H.amount(r),reserve=r()<0.3?Math.round(r()*capital):0,target=H.amount(r),hourly=r()<0.05?null:H.amount(r,1e7),daily=r()<0.2?null:1+Math.floor(r()*1440);
  const x=E.goalContinuous({capital,reserve,target,hourly,dailyMinutes:daily});sane(x,'goalContinuous');if(!x.valid)continue;
  assert.ok(x.missing>=0&&x.totalMinutes>=0&&x.hours>=0,'jamais négatif');assert.equal(x.availableCapital,capital-reserve);
  if(target<=capital-reserve){reached++;assert.equal(x.missing,0);assert.equal(x.totalMinutes,0);assert.equal(x.sessions,0);assert.equal(x.finalCapital,capital);}
  else{assert.ok(Math.abs(x.missing-(target-(capital-reserve)))<1e-6*Math.max(1,target),'manque = cible − disponible');assert.ok(Math.abs(x.totalMinutes-x.missing/hourly*60)<1e-6*Math.max(1,x.totalMinutes),'temps = manque ÷ gain × 60');assert.equal(x.activeMinutes+x.waitMinutes,x.totalMinutes);
   if(daily!==null){assert.ok(Number.isSafeInteger(x.sessions)&&x.sessions>=1);assert.ok(x.sessions*daily>=x.totalMinutes-1e-6&&(x.sessions-1)*daily<x.totalMinutes+1e-6,'parties = arrondi au-dessus');}else assert.equal(x.sessions,null);
   /* monotonie */
   const more=E.goalContinuous({capital:capital*1.1+1,reserve,target,hourly,dailyMinutes:daily});if(more.valid)assert.ok(more.totalMinutes<=x.totalMinutes+1e-9,'plus de capital → pas plus de temps');
   const faster=E.goalContinuous({capital,reserve,target,hourly:hourly*1.25,dailyMinutes:daily});if(faster.valid)assert.ok(faster.totalMinutes<=x.totalMinutes+1e-9,'plus de gain → pas plus de temps');
   const higher=E.goalContinuous({capital,reserve,target:target*1.2+1,hourly,dailyMinutes:daily});if(higher.valid)assert.ok(higher.totalMinutes>=x.totalMinutes-1e-9,'cible plus haute → pas moins de temps');
   const safer=E.goalContinuous({capital,reserve:Math.min(capital,reserve+1000),target,hourly,dailyMinutes:daily});if(safer.valid)assert.ok(safer.missing>=x.missing-1e-9,'plus de réserve → pas moins à gagner');}}
 assert.ok(reached>0);
 assert.equal(E.goalContinuous({capital:100,reserve:200,target:50}).valid,false,'réserve > capital refusée');
 assert.equal(E.goalContinuous({capital:100,reserve:0,target:500,hourly:0}).valid,false,'0 $/h et objectif non atteint : refusé, pas Infinity');
 const noHourly=E.goalContinuous({capital:100,reserve:0,target:500,hourly:null});assert.equal(noHourly.valid,false);assert.equal(noHourly.missing,400,'le manque est donné même sans gain par heure');});

test('goal (missions) : identités temps actif + attente = total, runs entiers, pause quotidienne ('+N+' cas)',()=>{const r=H.rng(3);let ok=0;
 for(let i=0;i<N;i+=1){const a=act(r,{cooldown:Math.floor(r()*40)}),capital=H.amount(r,1e7),reserve=r()<0.3?Math.round(r()*capital):0,target=capital+H.amount(r,5e6),daily=15+Math.floor(r()*1425);
  const x=E.goal({capital,reserve,target,dailyMinutes:daily,activity:a,prepOnce:false});sane(x,'goal');if(!x.valid)continue;ok++;
  assert.ok(Number.isSafeInteger(x.runs)&&x.runs>=0&&Number.isSafeInteger(x.sessions));assert.equal(x.days,x.sessions);
  assert.ok(Math.abs(x.activeMinutes+x.waitMinutes-x.totalMinutes)<1e-6,'actif + attente = total');assert.ok(x.continuousMinutes>=x.totalMinutes-1e-6,'en continu (sans pause quotidienne), l’attente compte toujours : jamais plus court qu’en parties');
  if(target<=capital){assert.equal(x.runs,0);assert.equal(x.investment,0);}
  else{assert.ok(x.finalCapital>=target-1e-6,'objectif atteint');assert.ok(x.finalCapital>=0);const one=E.activity(a);assert.ok(x.runs*one.net>=target-capital+one.investment-1e-6&&(x.runs-1)*one.net<target-capital+one.investment,'runs = arrondi au-dessus');assert.ok(x.sessions*daily>=x.activeMinutes-1e-6,'tout tient dans les parties');
   assert.ok(capital-reserve>=one.investment-1e-6,'la réserve n’est pas entamée par l’achat de départ');}
  const bigger=E.goal({capital,reserve,target:target*1.5,dailyMinutes:daily,activity:a});if(bigger.valid&&x.valid)assert.ok(bigger.totalMinutes>=x.totalMinutes-1e-6,'objectif plus grand → pas moins de temps');}
 assert.ok(ok>N*0.3,'assez de cas valides : '+ok);
 assert.match(E.goal({capital:100,reserve:0,target:500,dailyMinutes:10,activity:{reward:100,duration:20}}).reason,/dépasse ton temps de jeu/);
 assert.match(E.goal({capital:0,reserve:0,target:2000,dailyMinutes:1400,activity:{reward:100,duration:10,cooldown:100}}).reason,/pause entre deux parties/,'20 missions sur 2 parties, attente de 100 min > pause de 40 min : refusé, pas de fausse date');});

test('inverse : runs = 1 + ⌊(temps − actif) ÷ cycle⌋, zéro si rien ne tient, réserve respectée ('+N+' cas)',()=>{const r=H.rng(4);
 for(let i=0;i<N;i+=1){const a=act(r),minutes=Math.floor(r()*600),capital=H.amount(r,1e7),reserve=r()<0.3?Math.round(r()*capital):0;
  const x=E.inverse({minutes,capital,reserve,activity:a});sane(x,'inverse');if(!x.valid)continue;const one=E.activity(a);
  const expected=minutes<one.activeMinutes?0:1+Math.floor((minutes-one.activeMinutes)/one.cycleMinutes);assert.equal(x.runs,expected,'runs');assert.ok(x.totalMinutes<=minutes+1e-9,'jamais plus que le temps donné');
  assert.equal(x.finalCapital,capital+x.profit);if(x.runs===0){assert.equal(x.profit,0);assert.equal(x.totalMinutes,0);}
  assert.ok(x.finalCapital>=0,'jamais négatif');
  const longer=E.inverse({minutes:minutes+one.cycleMinutes,capital,reserve,activity:a});if(longer.valid&&one.net>=0){assert.ok(longer.runs>=x.runs,'plus de temps → au moins autant de missions');if(one.investment===0)assert.ok(longer.profit>=x.profit-1e-6,'sans achat de départ, plus de temps → au moins autant de gain');}}
 /* une somme négative du gain ne peut pas dépasser l’argent */
 const loss=E.inverse({minutes:600,capital:1000,reserve:0,activity:{reward:10,cost:500,duration:10}});assert.equal(loss.valid,false);assert.match(loss.reason,/pertes|avancer les coûts/);});

test('sessionPlan : limites 12 activités, 1 440 minutes, 256 réalisations ; profit ≥ 0 ; chronologie cohérente (400 cas)',()=>{const r=H.rng(5);const M=Math.min(N,400);
 for(let i=0;i<M;i+=1){const n=1+Math.floor(r()*4),acts=Array.from({length:n},(_,k)=>({...act(r,{duration:5+Math.floor(r()*60),cooldown:Math.floor(r()*30)}),id:'a'+k,name:'A'+k}));const minutes=Math.floor(r()*300),capital=H.amount(r,1e6),reserve=r()<0.3?Math.round(r()*capital):0;
  const x=E.sessionPlan({capital,reserve,minutes,activities:acts,maxRepeat:r()<0.3?1+Math.floor(r()*3):undefined});sane(x,'sessionPlan');if(!x.valid)continue;
  assert.ok(x.profit>=-1e-9,'un programme ne perd jamais d’argent (ne rien faire est permis)');assert.ok(x.totalMinutes<=minutes+1e-9);assert.ok(x.runs<=256);assert.equal(x.timeline.length,x.runs);
  assert.ok(Math.abs(x.activeMinutes+x.waitMinutes-x.totalMinutes)<1e-6,'actif + attente = total');assert.ok(Math.abs(x.unusedMinutes-(minutes-x.totalMinutes))<1e-6);
  let t=0;for(const st of x.timeline){assert.ok(st.start>=t-1e-9,'jamais deux missions en même temps');assert.ok(st.end>st.start);t=st.end;assert.ok(st.capitalBefore-reserve>=st.cost+st.investment-1e-6,'les frais sont payés sans toucher à la réserve');}
  assert.ok(Math.abs(x.breakdown.reduce((s,b)=>s+b.net,0)-x.breakdown.reduce((s,b)=>s+b.investment,0)-x.profit)<1e-6,'profit = Σ net − Σ achats de départ');}
 assert.equal(E.sessionPlan({capital:1,minutes:10,activities:[]}).valid,false);assert.equal(E.sessionPlan({capital:1,minutes:10,activities:Array(13).fill({reward:1,duration:1})}).valid,false,'13 activités refusées');assert.equal(E.sessionPlan({capital:1,minutes:1441,activities:[{reward:1,duration:1}]}).valid,false,'1 441 minutes refusées');
 const cap=E.sessionPlan({capital:1e6,minutes:1440,activities:[{reward:10,duration:1,id:'x',name:'x'}]});assert.ok(cap.valid&&cap.runs===256&&cap.limited&&/256/.test(cap.note),'256 réalisations au plus, et c’est dit');});

test('roi, purchase, worth, compareBuy : formules, division par zéro → null ('+N+' cas)',()=>{const r=H.rng(6);
 for(let i=0;i<N;i+=1){const purchase=H.amount(r,1e8),upgrades=r()<0.3?H.amount(r,1e6):0,fees=r()<0.3?H.amount(r,1e6):0,revenueHourly=H.amount(r,1e6),costHourly=r()<0.4?H.amount(r,1e6):0,hours=Math.round(r()*1000)/10;
  const x=E.roi({purchase,upgrades,fees,revenueHourly,costHourly,hours});sane(x,'roi');if(x.valid){assert.equal(x.investment,purchase+upgrades+fees);assert.ok(Math.abs(x.netHourly-(revenueHourly-costHourly))<1e-6*Math.max(1,revenueHourly));assert.ok(Math.abs(x.netProfit-(x.netHourly*hours-x.investment))<1e-6*Math.max(1,Math.abs(x.netProfit)));
   if(x.investment===0){assert.equal(x.roiPercent,null);assert.equal(x.paybackHours,0);}else{assert.ok(Math.abs(x.roiPercent-x.netProfit/x.investment*100)<1e-6*Math.max(1,Math.abs(x.roiPercent)));if(x.netHourly>0)assert.ok(Math.abs(x.paybackHours-x.investment/x.netHourly)<1e-6*Math.max(1,x.paybackHours));else assert.equal(x.paybackHours,null,'net ≤ 0 : jamais remboursé → null, pas Infinity');}}
  const capital=H.amount(r,1e8),price=H.amount(r,1e8),hourly=r()<0.2?null:H.amount(r,1e6),target=r()<0.3?null:H.amount(r,1e8);
  const q=E.purchase({capital,price,hourly,target});sane(q,'purchase');if(q.valid){assert.equal(q.remaining,capital-price===0?0:capital-price);assert.equal(q.shortfall,Math.max(0,price-capital));assert.equal(q.capitalPercent,capital>0?price*100/capital:null,'capital nul → part null');if(price===0)assert.equal(q.recoveryHours,0);else if(hourly===null||hourly<=0)assert.equal(q.recoveryHours,null);else assert.ok(Math.abs(q.recoveryHours-price/hourly)<1e-9*Math.max(1,price/hourly));}
  const reserve=r()<0.3?Math.floor(r()*capital):0,w=E.worth({capital,reserve,price,extras:upgrades,fees,hourly,hours});sane(w,'worth');if(w.valid){assert.equal(w.investment,price+upgrades+fees);assert.equal(w.shortfall,Math.max(0,w.investment-(capital-reserve)));assert.equal(w.cashRemaining,capital-w.investment);if(w.shortfall>0)assert.equal(w.buyNowCash,null,'pas d’achat financé en silence');}
  if(hourly!==null&&target!==null){const c=E.compareBuy({capital,target,hourly,price,boostHourly:0});sane(c,'compareBuy');if(c.valid){assert.equal(c.affordable,capital>=price);if(!c.affordable)assert.equal(c.buyHours,null);else if(hourly>0)assert.ok(c.buyHours>=c.saveHours-1e-9,'sans gain en plus, acheter ne fait jamais gagner du temps');}}}});

test('budget et order : parts, réserve, attentes, 100 postes / achats au plus ('+N+' cas)',()=>{const r=H.rng(7);
 for(let i=0;i<N;i+=1){const capital=H.amount(r,1e8),reserve=r()<0.3?Math.floor(r()*capital):0,n=Math.floor(r()*8),alloc=Array.from({length:n},()=>H.amount(r,1e7));
  const b=E.budget({capital,reserve,allocations:alloc});sane(b,'budget');if(b.valid){const spent=alloc.reduce((a,v)=>a+v,0);assert.ok(Math.abs(b.spent-spent)<1e-6*Math.max(1,spent));assert.ok(Math.abs(b.available-(capital-spent-reserve))<1e-6*Math.max(1,capital),'il reste = capital − dépenses − réserve');assert.equal(b.overBudget,b.available<0);b.shares.forEach((s,k)=>assert.equal(s,capital>0?alloc[k]*100/capital:null));}
  const items=Array.from({length:1+Math.floor(r()*4)},(_,k)=>({name:'A'+k,price:H.amount(r,1e7),boostHourly:r()<0.4?H.amount(r,1e5):0,costHourly:r()<0.2?H.amount(r,1e4):0})),hourly=r()<0.15?null:H.amount(r,1e6);
  const o=E.order({capital,reserve,hourly,items});sane(o,'order');if(o.valid){let t=0;o.steps.forEach((st,k)=>{assert.ok(st.waitHours>=0);assert.ok(Math.abs(st.timeHours-(t+st.waitHours))<1e-9*Math.max(1,st.timeHours));t=st.timeHours;assert.ok(st.capital>=reserve-1e-6,'la réserve est gardée à chaque étape');});assert.equal(o.steps.length,items.length);assert.ok(Math.abs(o.totalHours-t)<1e-9*Math.max(1,t));
   if(hourly!==null&&hourly>0){const richer=E.order({capital:capital*1.2+1,reserve,hourly,items});if(richer.valid)assert.ok(richer.totalHours<=o.totalHours+1e-9,'plus de capital → pas plus d’attente');}}
  else if(hourly===null||hourly===0)assert.match(o.reason,/bloquée|manque/,'un achat inaccessible sans gain : raison explicite');}
 assert.equal(E.budget({capital:1,allocations:Array(101).fill(0)}).valid,false,'101 postes refusés');assert.equal(E.order({capital:1,items:Array(101).fill({price:0})}).valid,false,'101 achats refusés');
 assert.equal(E.budget({capital:100,reserve:0,allocations:[null]}).valid,false,'un poste inconnu (null) n’est pas transformé en 0 par le moteur');});

test('choose : 2 à 6 achats, prix inconnu jamais classé, égalités rendues, critères cohérents ('+N+' cas)',()=>{const r=H.rng(8);
 for(let i=0;i<N;i+=1){const n=1+Math.floor(r()*7),items=Array.from({length:n},(_,k)=>({name:'A'+k,price:r()<0.15?null:H.amount(r,1e7),extras:0,fees:0,utility:r()<0.3?null:1+Math.floor(r()*5),incomeHourly:r()<0.3?H.amount(r,1e5):null}));
  const capital=H.amount(r,1e7),reserve=r()<0.3?Math.floor(r()*capital):0,hourly=r()<0.2?null:H.amount(r,1e6),criterion=H.pick(r,['value','cheapest','fastest','profit','utility']);
  const x=E.choose({capital,reserve,hourly,dailyMinutes:60,hours:10,items,criterion});sane(x,'choose');
  if(n<2||n>6){assert.equal(x.valid,false);continue;}if(!x.valid){assert.ok(items.every(it=>it.price===null),'refusé seulement si aucun prix');continue;}
  const known=x.items.filter(it=>it.known);assert.ok(x.items.filter(it=>!it.known).every(it=>it.total===null&&it.waitHours===null&&it.valueScore===null),'un prix inconnu ne vaut jamais 0');
  const cheapest=known.slice().sort((a,b)=>a.total-b.total)[0];if(x.bestByCriterion.cheapest)assert.ok(Math.abs(known.find(k=>k.name===x.bestByCriterion.cheapest).total-cheapest.total)<1e-9,'le moins cher est bien le moins cher');
  for(const it of known){assert.equal(it.affordable,it.shortfall===0);assert.equal(it.shortfall,Math.max(0,it.total-(capital-reserve)));if(it.utility===null)assert.equal(it.valueScore,null);}
  if(x.best!==null)assert.ok(known.some(k=>k.name===x.best));for(const k of Object.keys(x.ties))assert.ok(Array.isArray(x.ties[k]));}});

test('businessPlan et missionPlan : argent conservé, jamais sous la réserve, limites (12 missions, 20 achats) (300 cas)',()=>{const r=H.rng(9);const M=Math.min(N,300);
 for(let i=0;i<M;i+=1){const capital=H.amount(r,1e6),reserve=r()<0.4?Math.round(r()*capital):0,hourly=1000+H.amount(r,1e5),daily=15+Math.floor(r()*200),n=Math.floor(r()*4);
  const prerequisites=Array.from({length:n},(_,k)=>({name:'P'+k,price:H.amount(r,5e5),boostHourly:r()<0.5?H.amount(r,2e4):0}));
  const bp=E.businessPlan({capital,reserve,hourly,dailyMinutes:daily,daysPerWeek:1+Math.floor(r()*7),target:r()<0.5?H.amount(r,2e6):null,goalPrice:r()<0.7?H.amount(r,2e6):null,prerequisites,upkeepPerSession:r()<0.2?H.amount(r,1e3):0});sane(bp,'businessPlan');
  if(bp.valid){let t=0;bp.steps.forEach(st=>{assert.ok(st.atHours>=t-1e-9);t=st.atHours;assert.ok(st.capitalAfter>=reserve-1e-6,'jamais sous la réserve');});assert.ok(bp.sessions*daily>=bp.totalMinutes-1e-6);assert.ok(bp.days>=bp.sessions||bp.sessions===0);}
  const acts=Array.from({length:1+Math.floor(r()*3)},(_,k)=>({...act(r,{duration:5+Math.floor(r()*40),cooldown:Math.floor(r()*20),investment:0,cost:H.amount(r,5e3)}),id:'m'+k,name:'M'+k}));
  const mp=E.missionPlan({capital,reserve,sessionMinutes:r()<0.2?null:60+Math.floor(r()*120),daysPerWeek:7,activities:acts,purchases:prerequisites.map((p,k)=>({...p,id:'p'+k})),goalPrice:H.amount(r,3e5),upkeepPerSession:0});sane(mp,'missionPlan');
  if(mp.valid){assert.ok(mp.conserved,'argent conservé : départ + reçu − payé = fin');for(const e of mp.events)assert.ok(e.cash>=reserve-1e-6||e.type==='receive','jamais sous la réserve après une dépense');if(mp.reached)assert.ok(mp.missing===0);else assert.ok(mp.missing>0||mp.missingUnits>0);assert.ok(mp.sessions.length<=400);}}
 assert.equal(E.missionPlan({capital:1,activities:Array(13).fill({reward:1,duration:1}),goalPrice:1}).valid,false,'13 missions refusées');assert.equal(E.businessPlan({capital:1,hourly:1,dailyMinutes:60,goalPrice:1,prerequisites:Array(21).fill({name:'x',price:0})}).valid,false,'21 achats refusés');
 assert.match(E.missionPlan({capital:1000,activities:[],hourly:0,goalPrice:500}).reason,/comment tu gagnes/,'sans mission ni gain par heure : raison lisible');});

test('parseLocalizedNumber : virgule, espaces, point ; refus du texte, des unités, du vide ; jamais 0 à la place d’un vide',()=>{
 const ok=[['250 000,50',250000.5],['1 250,50',1250.5],['1250.50',1250.5],['0',0],['999999999999',999999999999],['1 000',1000],['1 000 000',1e6],['+12',12],['-5',-5],[' 42 ',42],['3,0',3]];
 for(const [t,v] of ok)assert.deepEqual(E.parseLocalizedNumber(t),{valid:true,reason:null,value:v},t);
 for(const bad of ['','   ','abc','1,5 million','1,5M','12$','12 $','1.000.000','1,000,000','10 00','1e5','0x10','1 2 3','.5','5.',',5','1 000 000,',null,undefined,NaN,Infinity,{},[]])assert.equal(E.parseLocalizedNumber(bad).valid,false,'refusé : '+JSON.stringify(bad));
 assert.equal(E.parseLocalizedNumber(12.5).value,12.5,'un nombre passe tel quel');});

test('scénario : evaluate(outil) ne rend jamais une valeur non finie ; aucune entrée vide ne devient 0 (600 états)',()=>{const r=H.rng(10);const M=Math.min(N,600);
 const paths=['goal.capital','goal.target','goal.hourly','goal.reserve','goal.dailyMinutes','session.minutes','inverse.minutes','roi.hours','roi.revenueHourly','roi.costHourly','compare.hours','budget.extra','budget.allocations.0','assets.0.price','assets.0.extras','assets.0.fees','activities.0.reward','activities.0.duration','activities.0.cooldown','plan.situation.capital','plan.situation.hourly','plan.situation.dailyMinutes','plan.goal.target','plan.situation.reserve'];
 for(let i=0;i<M;i+=1){const s=H.baseState(B,initial,catalogue);const k=1+Math.floor(r()*4);
  for(let j=0;j<k;j+=1){const p=H.pick(r,paths).split('.');let o=s;for(let q=0;q<p.length-1;q+=1)o=o[p[q]];const key=p.at(-1);o[key]=r()<0.2?null:r()<0.1?0:H.amount(r,p.includes('dailyMinutes')||p.includes('minutes')?1440:p.includes('hours')?16000:1e7);}
  if(r()<0.3)s.model='cycles';if(r()<0.3)s.roi.mode=H.pick(r,['estimate','new','improve','continuous']);if(s.roi.mode==='new'||s.roi.mode==='improve')s.roi.activityIds=['scenario-a'];if(r()<0.3)s.budget.source='basket';if(r()<0.3)s.compare.criterion=H.pick(r,['value','cheapest','cheapestTotal','fastest','profit','utility']);
  for(const tool of [...B.tools,'plan']){let x;try{x=B.evaluate(tool,s,sourceActivities,{catalogue});}catch(e){assert.fail(tool+' : exception '+e.message);}sane(x,tool);
   if(!x.valid)assert.doesNotMatch(x.reason,/NaN|undefined|null|Infinity/,tool+' : raison lisible');}
  /* une case vide (null) ne devient jamais 0 : l'outil refuse ou garde l'inconnu */
  if(s.goal.capital===null)for(const tool of ['goal','purchase','session','activities','order','budget','compare'])assert.equal(B.evaluate(tool,s,sourceActivities,{catalogue}).valid,false,tool+' : « J’ai déjà » vide → pas de réponse inventée');
  if(s.assets[0].price===null){const q=B.evaluate('purchase',s,sourceActivities,{catalogue});assert.equal(q.valid,false,'prix vide → pas de réponse');}}});

test('migrations v1 → v6 : une sauvegarde ancienne migre sans changer un résultat, et sans écrire de 0 à la place d’un vide',()=>{
 const legacy=(version,extra={})=>({version,mode:'quick',model:'continuous',name:'Ancien',tab:'goal',goal:{capital:150000,target:900000,hourly:60000,reserve:0,dailyMinutes:45,players:1,selected:'scenario-a'},activities:presets.map(a=>({id:a.id,name:a.name,reward:a.reward,cost:a.cost,duration:a.duration,prep:a.prep,cooldown:a.cooldown,share:a.share,investment:a.investment,players:a.players,owned:false})),session:{minutes:45,maxRepeat:100,enabled:['scenario-a','scenario-b']},inverse:{minutes:45,selected:'scenario-b'},purchase:{itemId:'',price:120000,hourly:60000,boostHourly:0,capital:150000,target:900000,reserve:0,extras:0},roi:{purchase:300000,upgrades:0,fees:0,revenueHourly:40000,costHourly:5000,hours:12},budget:{allocations:[10000,20000,30000,0,0],reserve:0},order:{items:[{name:'X',price:50000,boostHourly:0},{name:'Y',price:80000,boostHourly:2000}]},catalogue:{query:'',type:'all',status:'all',maxPrice:null,sort:'name',favorites:[],compareIds:[],favoritesOnly:false},...extra});
 for(const v of [1,2]){const s=B.validate(legacy(v),initial);assert.equal(s.version,6);const g=B.evaluate('goal',s,sourceActivities);assert.ok(g.valid);assert.equal(g.missing,750000);assert.equal(g.totalMinutes,750);assert.equal(s.goal.reserve,0);
  const a=B.evaluate('activities',s,sourceActivities);assert.ok(a.valid&&a.runs>=0);const ord=B.evaluate('order',s,sourceActivities,{catalogue});assert.ok(ord.valid,'ordre importé calculable : '+ord.reason);assert.equal(ord.steps.length,2);
  assert.ok(s.assets.every(x=>x.price===null||typeof x.price==='number'),'prix migrés : nombre ou inconnu');assert.equal(s.plan.goal.kind,'amount');assert.equal(s.plan.situation.capital,150000,'le plan reçoit une copie des chiffres (v5), jamais 0');}
 /* version inconnue ou future : refusée, jamais devinée */
 assert.throws(()=>B.validate(legacy(7),initial),/non reconnue/);assert.throws(()=>B.validate({version:6},initial),/incomplète/);});
