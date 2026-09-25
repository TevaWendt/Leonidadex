'use strict';
/* v7.34 — business plan mission par mission : références indépendantes du code, séparation avec les huit calculs,
   plans de secours, recalcul complet après une partie, fiches enregistrées. Toutes les données sont fictives. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..'),{load}=require('./runtime-helper.cjs');
const E=require(root+'/calculateurs-engine.js'),B=require(root+'/calculateurs-scenario.js');
const ctx={window:{}};vm.createContext(ctx);for(const f of ['vehicules-data.js','armes-data.js','acquisitions-data.js','calculateurs-catalogue.js','calculateurs-activites.js','calculateurs-data.js'])vm.runInContext(fs.readFileSync(root+'/'+f,'utf8'),ctx);
const initial=B.initial('v34',JSON.parse(JSON.stringify(ctx.window.LKCalcData.presets))),blank=()=>B.blank(initial);
const fire=(p,node,type='input')=>node.dispatchEvent(new p.w.Event(type,{bubbles:true,cancelable:true}));
const edit=(p,id,value,type='input')=>{const n=p.d.getElementById(id);assert.ok(n,'champ absent : '+id);n.value=value===null?'':String(value);fire(p,n,type);};
const clickSel=(p,sel)=>{const n=p.d.querySelector(sel);assert.ok(n,'bouton absent : '+sel);fire(p,n,'click');};
/* v7.35 : les « gros points » sont repliés par défaut ; ces tests les déplient tous pour lire les contenus. */
async function page(tool,s=blank(),extra={}){return load(root,'calculateurs.html?tool='+tool,{storage:{'lk-calculator-v1':JSON.stringify(s),'lk-calc-folds-v1':JSON.stringify({all:true}),...(extra.storage||{})},...Object.fromEntries(Object.entries(extra).filter(([k])=>k!=='storage'))});}
const clean=p=>{assert.deepEqual(p.errors,[]);assert.doesNotMatch(p.d.querySelector('.calc-panel:not([hidden])')?.textContent||'',/NaN|Infinity|undefined|\bnull\b/);p.close();};
const text=(p,id)=>p.d.getElementById(id).textContent.replace(/\s+/g,' ');
const stored=p=>JSON.parse(p.w.localStorage.getItem('lk-calculator-v1'));
const safe=x=>assert.doesNotMatch(JSON.stringify(x),/Infinity|NaN/);

/* Référence : 50 000 en poche, 10 000 de côté, parties de 90 min, 5 jours par semaine.
   Courses : 20 000 − 2 000 en 10 min. Braquage : 150 000 − 20 000 en 40 min + 5 min d’attente, seulement avec le Garage (100 000, +5 000/h). */
const A={id:'a',name:'Courses',reward:20000,cost:2000,duration:10,prep:0,cooldown:0,share:100,investment:0,units:0};
const Bq={id:'b',name:'Braquage',reward:150000,cost:20000,duration:40,prep:0,cooldown:5,share:100,investment:0,units:0,requiresPurchaseIds:['g']};
const G={id:'g',name:'Garage',price:100000,boostHourly:5000};
const ref=()=>({capital:50000,reserve:10000,sessionMinutes:90,daysPerWeek:5,goalPrice:1000000,activities:[A,Bq],purchases:[G]});

/* ---------- moteur ---------- */
test('Programme mission par mission : partie 1 = Courses ×9 puis achat du Garage, parties 2 à 5 = Courses ×1 + Braquage ×2, but atteint à la partie 5',()=>{
 const r=E.missionPlan(ref());assert.equal(r.valid,true);assert.equal(r.reached,true);
 assert.equal(r.totalSessions,5);assert.equal(r.days,5);assert.equal(r.finalCash,1254000);
 // partie 1 : 9 courses (90 min) = 9 × 18 000 = 162 000 → 212 000, le Garage se paie (212 000 − 10 000 ≥ 100 000) → 112 000
 assert.deepEqual(r.sessions[0].steps.map(x=>x.name+'×'+x.runs),['Courses×9']);assert.equal(r.sessions[0].gain,162000);assert.deepEqual(r.sessions[0].purchases,['Garage']);assert.equal(r.sessions[0].cashAfter,112000);
 // parties suivantes : deux braquages (130 000 chacun) + une course (18 000) dans 90 min (l’attente de 5 min est occupée par la course) + 5 000/h × 1,5 h de Garage
 assert.equal(r.sessions[1].gain,2*130000+18000+7500);assert.equal(r.sessions[1].cashAfter,112000+285500);
 assert.equal(r.purchases[0].atSession,1);assert.equal(r.purchases[0].owned,true);
 assert.equal(r.phases.length,2);assert.equal(r.phases[0].from,1);assert.equal(r.phases[0].to,1);assert.deepEqual(r.phases[0].purchasesAfter,['Garage']);assert.equal(r.phases[1].from,2);assert.equal(r.phases[1].to,5);assert.equal(r.phases[1].cashBefore,112000);assert.equal(r.phases[1].cashAfter,1254000);
 // trésorerie : jamais sous la réserve, jamais un achat payé avant d’avoir l’argent
 r.sessions.forEach(se=>assert.ok(se.cashAfter>=10000));
 assert.equal(r.startCash,50000);assert.equal(r.goalMoney,1000000);assert.equal(r.missing,0);safe(r);
});
test('Le but « avoir une somme » et le gain continu par heure donnent un programme partie par partie, achats au bon moment',()=>{
 const r=E.missionPlan({capital:200000,reserve:20000,sessionMinutes:60,daysPerWeek:7,hourly:100000,goalPrice:1000000,purchases:[{id:'p1',name:'Sans gain',price:100000},{id:'p2',name:'Rapporte',price:200000,boostHourly:50000}]});
 assert.equal(r.valid,true);assert.equal(r.totalSessions,9);assert.equal(r.days,9);assert.equal(r.finalCash,1150000);
 assert.deepEqual(r.sessions[0].purchases,['Sans gain']);assert.deepEqual(r.sessions[1].purchases,['Rapporte']);assert.equal(r.sessions[2].gain,150000);
 assert.equal(r.phases.length,3);
 const amount=E.missionPlan({capital:200000,reserve:0,sessionMinutes:60,hourly:100000,target:1000000});assert.equal(amount.totalSessions,8);assert.equal(amount.finalCash,1000000);
 // 5 jours par semaine : la partie 8 tombe le jour 10 (semaine 1 : jours 1-5, semaine 2 : jours 8-10)
 assert.equal(E.missionPlan({capital:200000,sessionMinutes:60,daysPerWeek:5,hourly:100000,target:1000000}).days,10);
});
test('But gagné avec l’expérience : points par mission, points par heure, déblocage + prix, et refus honnête quand rien ne donne de points',()=>{
 const acts=[{...A,units:120},{...Bq,units:900,requiresPurchaseIds:[]}];
 const u=E.missionPlan({capital:50000,reserve:0,sessionMinutes:90,daysPerWeek:5,targetUnits:5000,currentUnits:0,activities:acts});
 assert.equal(u.valid,true);assert.equal(u.reached,true);assert.equal(u.totalSessions,3);assert.equal(u.finalUnits,5400);assert.deepEqual(u.sessions[0].steps.map(x=>x.name+'×'+x.runs),['Braquage×2']);
 const mixed=E.missionPlan({capital:50000,reserve:10000,sessionMinutes:90,daysPerWeek:5,targetUnits:2000,currentUnits:0,goalPrice:400000,activities:acts});assert.equal(mixed.reached,true);assert.equal(mixed.totalSessions,2);assert.ok(mixed.finalUnits>=2000);assert.ok(mixed.finalCash-10000>=400000);
 const hourly=E.missionPlan({capital:10000,sessionMinutes:60,targetUnits:100,unitsHourly:30,hourly:1000});assert.equal(hourly.reached,true);assert.equal(hourly.totalSessions,4);assert.equal(hourly.finalUnits,120);
 const none=E.missionPlan({capital:10000,sessionMinutes:60,targetUnits:100,activities:[A]});assert.equal(none.valid,false);assert.match(none.reason,/points/);
 const already=E.missionPlan({capital:10000,sessionMinutes:60,targetUnits:100,currentUnits:150,activities:[A]});assert.equal(already.reached,true);assert.equal(already.totalSessions,0);
});
test('Plans de secours : classés par nombre de parties, sans doublon, avec les plans impossibles expliqués et les plans supplémentaires',()=>{
 const alt=E.missionAlternatives({...ref(),extraPlans:[{id:'observed',label:'Au rythme réel',changes:{activities:[],hourly:80000},note:'d’après tes parties'}]});
 assert.equal(alt.valid,true);const ids=alt.plans.map(x=>x.id);
 assert.equal(ids[0],'all');assert.ok(ids.includes('only-a'));assert.ok(ids.includes('no-purchases'));assert.ok(ids.includes('observed'));
 const ok=alt.plans.filter(x=>x.valid);for(let i=1;i<ok.length;i+=1)assert.ok(ok[i-1].totalSessions<=ok[i].totalSessions);
 const onlyB=alt.plans.find(x=>x.id==='only-b');assert.equal(onlyB.valid,false);assert.match(onlyB.reason,/Garage/);
 assert.equal(alt.results.all.totalSessions,5);assert.equal(alt.results.observed.valid,true);assert.ok(alt.results.observed.totalSessions>5);
 assert.equal(E.missionAlternatives({}).valid,false);assert.equal(E.missionAlternatives({capital:Infinity}).valid,false);safe(alt);
});
test('Échéance d’un programme : faisable ou non, leviers vérifiés par recalcul (tous les jours, parties plus longues, gain par heure)',()=>{
 const base={capital:200000,reserve:20000,sessionMinutes:60,daysPerWeek:5,hourly:100000,goalPrice:1000000};
 const ok=E.missionDeadline(base,30);assert.equal(ok.feasible,true);assert.equal(ok.days,11);assert.equal(ok.spareDays,19);
 const ko=E.missionDeadline(base,5);assert.equal(ko.feasible,false);assert.equal(ko.days,11);assert.equal(ko.requiredSessionMinutes,105);assert.equal(ko.requiredHourly,164100);
 assert.equal(E.missionPlan({...base,sessionMinutes:105}).days<=5,true);assert.equal(E.missionPlan({...base,hourly:164100}).days<=5,true);
 const every=E.missionDeadline(base,9);assert.equal(every.feasible,false);assert.equal(every.everydayDays,9,'en jouant tous les jours, 9 parties = 9 jours');
 assert.equal(E.missionDeadline(base,0).valid,false);assert.equal(E.missionDeadline({},3).valid,false);
});
test('Courbe du programme : un point par partie, l’argent baisse au moment de l’achat, jamais avant',()=>{
 const r=E.missionPlan(ref()),c=E.missionCurve(r);assert.equal(c.valid,true);assert.equal(c.points.length,6);
 assert.equal(c.points[0].cash,50000);assert.equal(c.points[1].cash,112000);assert.equal(c.points[1].purchase,'Garage');assert.equal(c.points[1].hours,1.5);assert.equal(c.points[5].cash,1254000);
 const at=E.planCashAt({points:c.points.map(x=>({hours:x.hours,cash:x.cash})),hours:1});assert.equal(at.valid,true);
 assert.equal(E.missionCurve(null).valid,false);assert.equal(E.missionCurve({valid:false}).valid,false);
});
test('Refus clairs : rien ne rentre, mission verrouillée au départ, but absent, trop de missions, jamais d’Infinity',()=>{
 assert.match(E.missionPlan({capital:0,sessionMinutes:60,goalPrice:1000,activities:[A]}).reason,/Aucune mission ne rentre/);
 assert.match(E.missionPlan({capital:120000,reserve:10000,sessionMinutes:90,goalPrice:1000000,activities:[Bq],purchases:[G]}).reason,/« Braquage » demande d’abord un achat \(Garage\)/);
 assert.match(E.missionPlan({capital:100,sessionMinutes:60,hourly:10}).reason,/Dis-moi ton but/);
 assert.match(E.missionPlan({capital:100,sessionMinutes:60,goalPrice:10}).reason,/comment tu gagnes ton argent/);
 assert.match(E.missionPlan({capital:100,sessionMinutes:60,goalPrice:10,activities:Array.from({length:13},()=>A)}).reason,/douze/);
 assert.match(E.missionPlan({capital:100,sessionMinutes:60,goalPrice:10,activities:[{...A,reward:'x'}]}).reason,/Mission 1 \(Courses\)/);
 for(const input of [undefined,null,[],{},{capital:Infinity},ref(),{...ref(),goalPrice:1e12}])safe(E.missionPlan(input));
 const huge=E.missionPlan({...ref(),goalPrice:1e12});assert.equal(huge.reached,false);assert.equal(huge.totalSessions,400);assert.match(huge.note,/400 parties/);
});

/* ---------- état partagé v5 ---------- */
test('v4 → v5 : le plan récupère une copie de ce qu’il utilisait (argent, but, achats d’avant, activité), puis vit sa vie',()=>{
 const raw=B.copy(initial);raw.version=4;raw.goal={...raw.goal,capital:300000,reserve:25000,hourly:80000,dailyMinutes:45};raw.session.daysPerWeek=4;
 raw.assets.push({key:'k1',itemId:'',name:'Équipement',price:50000,referencePrice:null,extras:5000,fees:0,owned:false,incomeMode:'personal',boostHourly:2000,utility:3},{key:'but',itemId:'',name:'Ma voiture',price:900000,referencePrice:null,extras:0,fees:0,owned:false,incomeMode:'none',boostHourly:0,utility:3});
 raw.order={keys:['k1','but']};raw.plan={kind:'purchase',key:'but',target:null,usePrerequisites:true,upkeepPerSession:1500,priority:'safe',activity:'scenario-a',details:true,strategy:'cheapFirst',deadlineDays:20,countDoneBoost:true,done:[],log:[{at:'2026-09-01T10:00:00.000Z',capital:310000,minutes:45,forecast:305000,note:'ok'}],playedMinutes:45};
 const s=B.validate(raw,initial);assert.equal(s.version,5);
 assert.deepEqual(s.plan.situation,{capital:300000,reserve:25000,hourly:80000,unitsHourly:0,dailyMinutes:45,daysPerWeek:4,upkeepPerSession:1500});
 assert.equal(s.plan.goal.kind,'purchase');assert.equal(s.plan.goal.name,'Ma voiture');assert.equal(s.plan.goal.price,900000);
 assert.equal(s.plan.prerequisites.length,1);assert.equal(s.plan.prerequisites[0].name,'Équipement');assert.equal(s.plan.prerequisites[0].price,55000);assert.equal(s.plan.prerequisites[0].boostHourly,2000);
 assert.equal(s.plan.source,'missions');assert.equal(s.plan.missions.length,1);assert.equal(s.plan.missions[0].name,initial.activities[0].name);
 assert.equal(s.plan.priority,'safe');assert.equal(s.plan.strategy,'cheapFirst');assert.equal(s.plan.deadlineDays,20);assert.equal(s.plan.playedMinutes,45);assert.equal(s.plan.log[0].capital,310000);assert.equal(s.plan.log[0].sessionMinutes,0);assert.deepEqual(s.plan.log[0].runs,{});
 // séparation : changer les huit calculs ne change plus le plan
 const c=B.copy(s);c.goal.capital=1;c.order.keys=[];c.assets.find(a=>a.key==='k1').owned=true;
 assert.equal(B.planInput(c).capital,300000);assert.equal(B.planInput(c).purchases.length,1);assert.equal(B.planInput(c).purchases[0].owned,false);
 // v5 lue telle quelle ; partir de zéro vide le plan
 assert.equal(B.validate(B.copy(s),initial).plan.goal.price,900000);assert.equal(B.blank(s).plan.situation.capital,null);assert.equal(B.blank(s).plan.missions.length,0);
});
test('Le plan dit ce qui manque dans l’ordre de ses questions, compare les ordres d’achats, suit un plan de secours choisi',()=>{
 const s=blank();assert.match(B.planMissing(s),/prix de ton but/);s.plan.goal.kind='amount';assert.match(B.planMissing(s),/somme/);s.plan.goal.target=1000000;assert.match(B.planMissing(s),/argent que tu as/);
 s.plan.situation.capital=50000;assert.match(B.planMissing(s),/dure une partie/);s.plan.situation.dailyMinutes=90;assert.match(B.planMissing(s),/gagnes par heure/);s.plan.source='missions';assert.match(B.planMissing(s),/au moins une mission/);
 s.plan.missions=[{...B.copy(B.planMissionTemplate),...A,requires:[]},{...B.copy(B.planMissionTemplate),...Bq,requires:['g']}];s.plan.prerequisites=[{id:'g',name:'Garage',itemId:'',referencePrice:null,price:100000,boostHourly:5000,owned:false},{id:'h',name:'Gadget',itemId:'',referencePrice:null,price:20000,boostHourly:0,owned:false}];s.plan.situation.reserve=10000;
 assert.equal(B.planMissing(s),null);const r=B.evaluate('plan',s);assert.equal(r.valid,true);assert.equal(r.reached,true);assert.ok(r.strategies.candidates.length>=2);assert.ok(r.strategies.candidates.every(c=>c.id!=='direct'||c.removes));
 assert.equal(r.strategy,r.strategies.recommended);assert.ok(['asIs','byPayback','cheapFirst'].includes(r.strategy));
 s.plan.priority='fast';assert.equal(B.planInput(s).reserve,0);s.plan.priority='balanced';assert.equal(B.planInput(s).reserve,10000);
 s.plan.variant='only-a';const v=B.evaluate('plan',s);assert.equal(v.variant,'only-a');assert.ok(v.sessions.every(se=>se.steps.every(st=>st.id==='a')));
 s.plan.variant='nope';assert.equal(B.evaluate('plan',s).variant,'auto');
 const alt=B.planAlternatives(s,B.evaluate('plan',s));assert.equal(alt.valid,true);assert.ok(alt.plans.some(x=>x.id==='no-purchases'));
 // historique : validé, borné, entrées détaillées
 s.plan.log=Array.from({length:70},(_,i)=>({at:'2026-09-0'+(i%9+1),capital:1000+i,minutes:10*i,forecast:null,note:'n'+i,units:null,unitsGain:null,gain:100,plannedGain:120,sessionMinutes:10,runs:{a:2,b:1},purchases:['g']}));
 const ok=B.validate(B.copy(s),initial);assert.equal(ok.plan.log.length,60);assert.deepEqual(ok.plan.log[0].runs,{a:2,b:1});assert.deepEqual(ok.plan.log[0].purchases,['g']);
 const obs=B.planObserved(ok);assert.equal(obs.sessions,60);assert.equal(obs.hourly,600);assert.equal(obs.last.gap,-20);
});

/* ---------- parcours ---------- */
function scenario(){const s=blank();s.name='Ma voiture';s.plan.goal={...s.plan.goal,kind:'purchase',name:'Ma voiture',price:1000000};s.plan.situation={capital:50000,reserve:10000,hourly:null,unitsHourly:0,dailyMinutes:90,daysPerWeek:5,upkeepPerSession:0};s.plan.source='missions';
 s.plan.missions=[{...B.copy(B.planMissionTemplate),...A,requires:[]},{...B.copy(B.planMissionTemplate),...Bq,requires:['g']}];s.plan.prerequisites=[{id:'g',name:'Garage',itemId:'',referencePrice:null,price:100000,boostHourly:5000,owned:false}];return s;}
test('Parcours : programme dans l’ordre, prochaine partie, plans A/B/C, plan de secours suivi, mise à jour qui recalcule tout',async()=>{
 const p=await page('plan',scenario());let t=text(p,'plan-results'),rep=text(p,'plan-report');
 assert.match(t,/il te manque 960\s000/);assert.match(t,/5 parties de 1 h 30/);assert.match(t,/En premier : « Courses » ×9/);assert.match(t,/Ta prochaine partie \(1 h 30\)/);assert.match(t,/Puis achète : Garage/);
 assert.match(rep,/Ton programme, dans l’ordre/);assert.match(rep,/En premier · Partie 1/);assert.match(rep,/Fais « Courses » ×9/);assert.match(rep,/Après la partie 1 : achète « Garage »/);assert.match(rep,/En deuxième · Parties 2 à 5/);assert.match(rep,/Fais « Courses » ×1 puis « Braquage » ×2 à chaque partie/);assert.match(rep,/Objectif atteint · après la partie 5/);
 assert.match(rep,/Si ça ne se passe pas comme prévu/);assert.match(rep,/Plan A · Le meilleur mélange de tes missions TON PLAN ACTUEL/);assert.match(rep,/Plan B/);assert.match(rep,/Suivre ce plan/);assert.match(rep,/Impossible avec ces chiffres : Seulement « Braquage »/);
 // suivre un plan de secours, puis revenir
 const follow=p.d.querySelector('[data-b-plan-variant="only-a"]');assert.ok(follow);fire(p,follow,'click');assert.equal(stored(p).plan.variant,'only-a');t=text(p,'plan-results');assert.match(t,/PLAN DE SECOURS/);assert.match(t,/Seulement « Courses »/);assert.match(text(p,'plan-report'),/Plan A · Seulement « Courses » TON PLAN ACTUEL/);
 clickSel(p,'[data-b-plan-variant="auto"]');assert.equal(stored(p).plan.variant,'auto');
 // mise à jour complète : 120 000 après 90 min et 5 courses, au lieu de 212 000 prévus
 edit(p,'plan-actual',120000);edit(p,'plan-actual-minutes',90);edit(p,'plan-actual-runs-a',5);edit(p,'plan-actual-note','partie difficile');clickSel(p,'[data-b-plan-log]');
 const s=stored(p);assert.equal(s.plan.situation.capital,120000);assert.equal(s.plan.log.length,1);assert.equal(s.plan.log[0].gain,70000);assert.equal(s.plan.log[0].plannedGain,162000);assert.deepEqual(s.plan.log[0].runs,{a:5});assert.equal(s.plan.log[0].note,'partie difficile');assert.equal(s.plan.playedMinutes,90);assert.equal(s.plan.sessionsPlayed,1);
 t=text(p,'plan-results');rep=text(p,'plan-report');assert.match(t,/Tu passes de 120\s000/);assert.match(rep,/BILAN DE TA DERNIÈRE PARTIE/);assert.match(rep,/Prévu\+162\s000 \$Réel\+70\s000 \$Écart−92\s000 \$/);assert.match(rep,/Ta dernière partie a rapporté 70\s000 \$ au lieu de 162\s000 \$ prévus/);assert.match(rep,/Au rythme que tu as vraiment eu/);assert.match(rep,/Courses ×5/);
 // l’achat fait pendant la partie sort du plan
 edit(p,'plan-actual',60000);edit(p,'plan-actual-minutes',90);const b=p.d.querySelector('[data-b-plan-actual-bought="g"]');assert.ok(b);b.checked=true;fire(p,b,'change');clickSel(p,'[data-b-plan-log]');
 const s2=stored(p);assert.equal(s2.plan.prerequisites[0].owned,true);assert.deepEqual(s2.plan.log[1].purchases,['g']);assert.equal(s2.plan.log[1].gain,60000-120000+100000);rep=text(p,'plan-report');assert.doesNotMatch(rep,/achète « Garage »/);assert.match(rep,/Braquage/);
 clickSel(p,'[data-b-plan-clear]');assert.equal(stored(p).plan.log.length,0);
 clean(p);});
test('Séparation : les huit calculs ne nourrissent pas le plan tout seuls ; « Reprendre mes chiffres » copie, puis les deux vivent séparément',async()=>{
 const s=blank();s.goal.capital=777000;s.goal.hourly=55000;s.goal.dailyMinutes=30;s.assets.push({key:'x1',itemId:'',name:'Achat des calculs',price:100000,referencePrice:null,extras:0,fees:0,owned:true,incomeMode:'none',boostHourly:0,utility:3});s.order.keys=['x1'];
 const p=await page('plan',s);assert.equal(p.d.getElementById('plan-capital').value,'');assert.doesNotMatch(text(p,'plan-report')+text(p,'plan-results'),/Achat des calculs|777/);
 clickSel(p,'[data-b-plan-import-calcs]');const a=stored(p);assert.equal(a.plan.situation.capital,777000);assert.equal(a.plan.situation.hourly,55000);assert.equal(a.plan.prerequisites.length,1);assert.equal(a.plan.prerequisites[0].owned,true);
 edit(p,'plan-capital',5000);const c=stored(p);assert.equal(c.plan.situation.capital,5000);assert.equal(c.goal.capital,777000,'le plan ne réécrit pas Mon objectif');
 clickSel(p,'[data-tab="goal"]');edit(p,'f-goal-capital',1);assert.equal(stored(p).plan.situation.capital,5000,'Mon objectif ne réécrit pas le plan');
 clean(p);});
test('But gagné avec l’expérience dans le formulaire : ses cases, sa réponse en points, sa progression',async()=>{
 const p=await page('plan',B.copy(initial));const kind=p.d.getElementById('f-plan-goal-kind');kind.value='unlock';fire(p,kind,'change');
 for(const id of ['plan-name','plan-units-label','plan-units-target','plan-units-current','plan-also-price','plan-units-hourly'])assert.ok(p.d.getElementById(id),id);
 edit(p,'plan-name','Voiture de rang');edit(p,'plan-units-label','niveaux');edit(p,'plan-units-target',20);edit(p,'plan-units-current',5);edit(p,'plan-units-hourly',2);edit(p,'plan-also-price',300000);
 const t=text(p,'plan-results');assert.match(t,/Pour débloquer Voiture de rang, il te manque 15 niveaux et 100\s000 \$/);assert.match(t,/8 parties/);assert.match(t,/niveaux déjà gagnés/);assert.match(t,/\+2 niveaux/);
 assert.match(text(p,'plan-report'),/Tu débloques Voiture de rang et tu le paies \(300\s000 \$\)/);
 const src=p.d.getElementById('f-plan-source');src.value='missions';fire(p,src,'change');assert.match(text(p,'plan-results'),/Ajoute au moins une mission/);
 clickSel(p,'[data-b-plan-m-add]');edit(p,'plan-m-0-name','Course de rue');edit(p,'plan-m-0-reward',30000);edit(p,'plan-m-0-duration',15);edit(p,'plan-m-0-units',1);
 assert.match(text(p,'plan-results'),/« Course de rue » ×4/);assert.equal(stored(p).plan.missions[0].units,1);
 clean(p);});
test('Deux carnets : le plan enregistré a sa fiche complète, le calcul enregistré la sienne, chacun dans sa boîte',async()=>{
 const p=await page('plan',scenario());p.w.confirm=()=>true;
 clickSel(p,'[data-b-save="plan"]');assert.equal(p.d.querySelectorAll('#saved-plans-list .b-notebook-entry').length,1);assert.equal(p.d.querySelectorAll('#saved-list .b-notebook-entry').length,0);
 assert.match(text(p,'saved-plans-list'),/But : Ma voiture · 5 parties de 1 h 30 · 5 jours · 2 missions · 1 achat d’avant/);
 clickSel(p,'#saved-plans-list [data-b-sheet]');const sheet=text(p,'calc-sheet-body');
 for(const part of ['FICHE DE BUSINESS PLAN','Ma voiture','En bref','Le but','Où j’en suis','Mes missions','Le programme, dans l’ordre','En premier · Partie 1','Après la partie 1 : achète « Garage »','Mes achats et investissements','après la partie 1','remboursé après','Si ça ne se passe pas comme prévu','Plan A'])assert.match(sheet,new RegExp(part.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')),part);
 assert.doesNotMatch(sheet,/NaN|Infinity|undefined/);
 clickSel(p,'[data-b-sheet-close]');
 // un calcul des huit outils va dans l’autre carnet, avec sa propre fiche
 clickSel(p,'[data-tab="goal"]');clickSel(p,'#calc-save');assert.equal(p.d.querySelectorAll('#saved-list .b-notebook-entry[data-tool="goal"]').length,1);assert.equal(p.d.querySelectorAll('#saved-plans-list .b-notebook-entry').length,1);
 assert.match(text(p,'saved-list'),/Mon objectif/);clickSel(p,'#saved-list [data-b-sheet]');const calc=text(p,'calc-sheet-body');assert.match(calc,/FICHE DE CALCUL · MON OBJECTIF/);assert.match(calc,/Ma réponse/);assert.match(calc,/Les chiffres utilisés/);
 // « Ouvrir dans le calculateur » depuis la fiche du plan restaure le plan
 clickSel(p,'[data-b-sheet-close]');clickSel(p,'[data-tab="plan"]');edit(p,'plan-capital',99999);clickSel(p,'#saved-plans-list [data-b-sheet]');clickSel(p,'[data-b-sheet-open]');assert.equal(stored(p).plan.situation.capital,50000);assert.equal(stored(p).tab,'plan');
 clean(p);});
test('Pas à pas sur le plan : cinq questions expliquées, « Avant ton but » sauté quand une somme sans achat d’avant',async()=>{
 const s=blank();s.plan.goal={...s.plan.goal,kind:'amount',target:500000};s.plan.situation={capital:100000,reserve:0,hourly:50000,unitsHourly:0,dailyMinutes:60,daysPerWeek:7,upkeepPerSession:0};
 const p=await page('plan',s);clickSel(p,'[data-mode="guided"]');p.flush();
 assert.match(p.d.getElementById('wiz-count').textContent,/Question 1 sur 4/);assert.match(p.d.getElementById('wiz-why').textContent,/Pourquoi cette question/);assert.equal(p.d.querySelectorAll('#panel-plan .calc-step[data-skip]').length,1);
 clean(p);});
test('Léo : une fiche et « business plan » remplissent le but du plan et ses cases à lui, sans toucher aux huit calculs',()=>{
 const L=require(root+'/leo-link.js'),catalogue=ctx.window.LKCalcData.catalogue(),activities=ctx.window.LKCalcData.activities(),item=catalogue.find(x=>x.purchaseCandidate);
 const req=L.validate({v:L.VERSION,tool:'plan',items:[item.id],values:{capital:120000,hourly:40000,dailyMinutes:45},back:'/leo.html'});
 const s=L.apply(req,initial,initial,B,catalogue,'new',activities);assert.equal(s.tab,'plan');assert.equal(s.plan.goal.kind,'purchase');assert.equal(s.plan.goal.itemId,item.id);assert.equal(s.plan.goal.price,item.price);
 assert.equal(s.plan.situation.capital,120000);assert.equal(s.plan.situation.hourly,40000);assert.equal(s.plan.situation.dailyMinutes,45);assert.equal(s.plan.source,'hourly');
 const amount=L.apply(L.validate({v:L.VERSION,tool:'plan',items:[],values:{capital:1000,target:90000,hourly:3000},back:'/leo.html'}),initial,initial,B,catalogue,'new',activities);assert.equal(amount.plan.goal.kind,'amount');assert.equal(amount.plan.goal.target,90000);
});
