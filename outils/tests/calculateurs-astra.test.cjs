'use strict';
/* v7.33 — calculateur « puissant » : références indépendantes du code et parcours utilisateur.
   Toutes les données sont fictives (aucun chiffre du jeu). */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..'),{load}=require('./runtime-helper.cjs');
const E=require(root+'/calculateurs-engine.js'),B=require(root+'/calculateurs-scenario.js');
const ctx={window:{}};vm.createContext(ctx);for(const f of ['vehicules-data.js','armes-data.js','acquisitions-data.js','calculateurs-catalogue.js','calculateurs-activites.js','calculateurs-data.js'])vm.runInContext(fs.readFileSync(root+'/'+f,'utf8'),ctx);
const initial=B.initial('astra',JSON.parse(JSON.stringify(ctx.window.LKCalcData.presets))),blank=()=>B.blank(initial);
const fire=(p,node,type='input')=>node.dispatchEvent(new p.w.Event(type,{bubbles:true,cancelable:true}));
const edit=(p,id,value,type='input')=>{const n=p.d.getElementById(id);assert.ok(n,'champ absent : '+id);n.value=value===null?'':String(value);fire(p,n,type);};
const clickSel=(p,sel)=>{const n=p.d.querySelector(sel);assert.ok(n,'bouton absent : '+sel);fire(p,n,'click');};
async function page(tool,s=blank(),extra={}){return load(root,'calculateurs.html?tool='+tool,{storage:{'lk-calculator-v1':JSON.stringify(s)},...extra});}
const clean=p=>{assert.deepEqual(p.errors,[]);assert.doesNotMatch(p.d.querySelector('.calc-panel:not([hidden])')?.textContent||'',/NaN|Infinity|undefined|\bnull\b/);p.close();};
const text=(p,id)=>p.d.getElementById(id).textContent.replace(/\s+/g,' ');
const near=(a,b,eps=1e-9)=>Math.abs(a-b)<=eps,tick=()=>new Promise(r=>setTimeout(r,20));

/* ---------- moteur ---------- */
test('Ça vaut le coup ? : 120 000 d’investissement, 30 000 → 50 000 par heure = +20 000 par heure, rattrapage après 6 heures',()=>{
 const r=E.investmentCompare({capital:500000,reserve:0,price:120000,baselineHourly:30000,extraHourly:20000,hours:10,dailyMinutes:60});
 assert.equal(r.valid,true);assert.equal(r.marginalHourly,20000);assert.equal(r.breakEvenHours,6);
 assert.equal(r.withoutCash,500000+30000*10);assert.equal(r.withCash,500000-120000+50000*10);assert.equal(r.difference,80000);
 assert.equal(r.verdict,'buy');assert.equal(r.thresholds.sessionsForPayback,6);assert.equal(r.thresholds.extraHourlyForHorizon,12000);
 // la différence ne dépend pas de ce que le joueur gagnait déjà : seul le gain EN PLUS compte
 const r2=E.investmentCompare({capital:500000,price:120000,baselineHourly:80000,extraHourly:20000,hours:10});assert.equal(r2.difference,80000);assert.equal(r2.breakEvenHours,6);
 const r3=E.investmentCompare({capital:500000,price:120000,extraHourly:20000,hours:10});assert.equal(r3.withoutCash,null);assert.equal(r3.difference,80000);
});
test('Ça vaut le coup ? : verdicts jamais / attendre / pas sur cet horizon / horizon inconnu',()=>{
 assert.equal(E.investmentCompare({capital:500000,price:120000,extraHourly:10000,costHourly:10000,hours:10}).verdict,'never');
 const w=E.investmentCompare({capital:100000,reserve:20000,price:120000,baselineHourly:20000,extraHourly:20000,hours:10});assert.equal(w.verdict,'wait');assert.equal(w.shortfall,40000);assert.equal(w.thresholds.waitHours,2);
 const n=E.investmentCompare({capital:500000,price:120000,extraHourly:20000,hours:4});assert.equal(n.verdict,'not-yet');assert.equal(n.difference,-40000);
 assert.equal(E.investmentCompare({capital:500000,price:120000,extraHourly:20000}).verdict,'unknown-horizon');
 assert.equal(E.investmentCompare({capital:500000,price:'abc',extraHourly:20000}).valid,false);
});
test('Nouvelle activité : le temps passé dessus ne rapporte plus ce que le joueur gagnait déjà',()=>{
 const act={id:'x',name:'Mission',reward:50000,cost:0,duration:30,prep:0,cooldown:0,share:100,investment:0,players:1};
 const brut=E.investmentActivities({purchase:120000,hours:4,mode:'new',activities:[act]});assert.equal(brut.paybackHours,1.5);assert.equal(brut.paybackCycles,3);assert.equal(brut.marginalPaybackHours,null);
 const net=E.investmentActivities({purchase:120000,hours:4,mode:'new',activities:[act],baselineHourly:30000});
 // 50 000 par demi-heure − 30 000 par heure qu’on ne gagne plus : 35 000 nets par mission → 4 missions (140 000) couvrent 120 000
 assert.equal(net.paybackHours,1.5);assert.equal(net.marginalPaybackHours,2);assert.equal(net.marginalPaybackCycles,4);
 assert.equal(net.opportunityCost,120000);assert.equal(net.marginalProfit,400000-120000);assert.equal(net.marginalNetProfit,400000-120000-120000);
});
test('Stratégies du plan : ordre par remboursement recommandé, réserve gardée sauf priorité « vite », alternatives jamais imposées',()=>{
 const p={capital:200000,reserve:20000,hourly:100000,dailyMinutes:60,daysPerWeek:7,goalName:'But',goalPrice:1000000,prerequisites:[{name:'Sans gain',price:100000,boostHourly:0},{name:'Rapporte',price:200000,boostHourly:50000}]};
 const st=E.planStrategies({...p,priority:'balanced'});assert.equal(st.valid,true);
 const ids=st.candidates.map(c=>c.id);assert.ok(ids.includes('asIs')&&ids.includes('byPayback')&&ids.includes('skipNoBoost')&&ids.includes('direct')&&ids.includes('useReserve'));
 assert.equal(st.recommended,'byPayback');assert.ok(st.candidates.find(c=>c.id==='byPayback').totalHours<st.candidates.find(c=>c.id==='asIs').totalHours);
 assert.ok(!['skipNoBoost','direct','useReserve'].includes(E.planStrategies({...p,priority:'safe'}).recommended));
 const fast=E.planStrategies({...p,priority:'fast'});assert.ok(['byPayback','useReserve'].includes(fast.recommended));
 assert.ok(st.candidates.every(c=>!c.input),'les entrées internes ne sortent pas dans la liste');
 // le plan recommandé se recalcule à l’identique avec l’entrée retournée
 const again=E.businessPlan({...st.recommendedInput,variants:false});assert.equal(again.totalHours,st.candidates.find(c=>c.id==='byPayback').totalHours);
});
test('Échéance : faisable ou non, rythme nécessaire, gain nécessaire vérifié par recalcul',()=>{
 const p={capital:200000,reserve:0,hourly:100000,dailyMinutes:60,daysPerWeek:5,goalName:'But',goalPrice:1000000,prerequisites:[]};
 const ok=E.planDeadline(p,14);assert.equal(ok.feasible,true);assert.equal(ok.sessionsAvailable,10);assert.equal(ok.spareHours,2);
 const ko=E.planDeadline(p,5);assert.equal(ko.feasible,false);assert.equal(ko.sessionsAvailable,5);assert.equal(ko.requiredDailyMinutes,96);
 const check=E.businessPlan({...p,hourly:ko.requiredHourly,variants:false});assert.ok(check.totalHours<=ko.hoursAvailable+1e-6);
 assert.equal(E.planDeadline(p,0).valid,false);assert.equal(E.planDeadline({...p,hourly:0},5).valid,false);
});
test('Prochaine partie : gain continu ou missions entières, achats atteignables pendant la partie, avancement',()=>{
 const steps=[{name:'Petit achat',atHours:0.5,kind:'prerequisite'},{name:'But',atHours:8,kind:'goal'}];
 const c=E.nextSession({minutes:60,capital:200000,reserve:0,hourly:100000,steps,goalTotal:1000000});assert.equal(c.gain,100000);assert.equal(c.capitalAfter,300000);assert.deepEqual(c.reached,['Petit achat']);assert.equal(c.progressBefore,20);assert.equal(c.progressAfter,30);
 const a=E.nextSession({minutes:45,capital:200000,reserve:0,upkeepPerSession:5000,activity:{name:'Mission',reward:50000,cost:0,duration:20,prep:0,cooldown:0,share:100,investment:0,players:1},steps:[],goalTotal:null});
 assert.equal(a.mode,'activity');assert.equal(a.runs,2);assert.equal(a.gain,95000);assert.equal(a.progressAfter,null);
 assert.equal(E.nextSession({minutes:0,capital:1,hourly:1}).valid,false);
});
test('Courbe du plan : l’argent baisse au paiement, jamais avant ; lecture à un instant donné',()=>{
 const input={capital:200000,reserve:0,hourly:100000,dailyMinutes:60,daysPerWeek:7,goalName:'But',goalPrice:1000000,prerequisites:[{name:'A',price:200000,boostHourly:50000}]};
 const r=E.businessPlan(input),curve=E.planCurve({plan:input,result:r}).points;
 assert.deepEqual(curve.map(p=>[p.hours,p.cash]),[[0,200000],[0,0],[1000000/150000,1000000],[1000000/150000,0]]);
 const at=h=>E.planCashAt({points:curve,hours:h}).cash;assert.equal(at(0),0);assert.ok(near(at(2),300000));assert.equal(at(100),0);
 assert.equal(E.planCurve({plan:input,result:{valid:false}}).valid,false);assert.equal(E.planCashAt({points:[],hours:1}).valid,false);
});
test('Objectif atteint, gain nul, gain négatif : réponses explicites, aucun programme inutile',()=>{
 const done=E.businessPlan({capital:2000000,reserve:0,hourly:0,dailyMinutes:60,target:1000000});assert.equal(done.valid,true);assert.equal(done.totalHours,0);assert.equal(done.sessions,0);assert.equal(done.steps.length,1);
 const zero=E.businessPlan({capital:200000,reserve:0,hourly:0,dailyMinutes:60,target:1000000});assert.equal(zero.valid,false);assert.match(zero.reason,/gain|manque|attendre/i);
 const neg=E.businessPlan({capital:200000,reserve:0,hourly:20000,dailyMinutes:60,upkeepPerSession:30000,target:1000000});assert.equal(neg.valid,false);assert.match(neg.reason,/dépenses par partie/);
});
test('Sauvegardes v3 lues telles quelles, migrées (v4 puis v5) avec un plan complet',()=>{
 const raw=B.copy(initial);raw.version=3;raw.plan={kind:'amount',key:'',target:750000,usePrerequisites:true,upkeepPerSession:0,priority:'balanced',activity:''};
 const s=B.validate(raw,initial);assert.equal(s.version,5);assert.equal(s.plan.strategy,'auto');assert.deepEqual(s.plan.log,[]);assert.equal(s.plan.deadlineDays,null);assert.equal(s.plan.goal.kind,'amount');assert.equal(s.plan.goal.target,750000);assert.equal(s.plan.situation.capital,initial.goal.capital);
 const bad=B.copy(initial);bad.plan.log=[{capital:'x'}];assert.throws(()=>B.validate(bad,initial),/Historique/);
 const future=B.copy(initial);future.version=6;assert.throws(()=>B.validate(future,initial),/Version/);
});

/* ---------- parcours ---------- */
test('Un seul outil, session vide : « Ça vaut le coup ? » répond avec une recommandation, une prochaine étape et ses hypothèses',async()=>{const p=await page('roi');
 clickSel(p,'[data-b-roi-manual]');edit(p,'f-roi-purchase',120000);edit(p,'roi-capital',500000);edit(p,'roi-reserve',0);
 const mode=p.d.getElementById('f-roi-mode');mode.value='continuous';fire(p,mode,'change');edit(p,'f-roi-revenueHourly',20000);edit(p,'f-roi-hours',10);
 const t=text(p,'roi-results');assert.match(t,/Oui, ça vaut le coup/);assert.match(t,/remboursé après 6 h/);assert.match(t,/80\s000\s\$ de plus/);assert.match(t,/Ta prochaine étape/);assert.match(t,/CE QUI COMPTE DANS CE CALCUL/);assert.match(t,/Il manque : ce que tu gagnes déjà/);
 edit(p,'f-roi-hours',4);assert.match(text(p,'roi-results'),/Pas sur 4 h/);
 edit(p,'f-roi-costHourly',20000);assert.match(text(p,'roi-results'),/Non : /);assert.match(text(p,'roi-results'),/jamais/);
 clean(p);});
test('Achat plaisir : accessibilité, ce qui reste, temps pour retrouver son argent, aucun remboursement inventé',async()=>{const p=await page('roi');
 clickSel(p,'[data-b-roi-manual]');edit(p,'f-roi-purchase',150000);edit(p,'roi-capital',200000);edit(p,'roi-reserve',20000);
 let t=text(p,'roi-results');assert.match(t,/Oui, tu peux acheter/);assert.match(t,/ne rapporte rien/);assert.doesNotMatch(t,/Remboursé après \d/);assert.doesNotMatch(t,/rendement|score/i);
 assert.match(t,/Il manque : ce que tu gagnes par heure/);
 edit(p,'roi-recovery-hourly',50000);t=text(p,'roi-results');assert.match(t,/3 h de jeu pour retrouver ton argent/);
 edit(p,'f-roi-purchase',300000);t=text(p,'roi-results');assert.match(t,/Pas encore : il te manque 120\s000/);assert.match(t,/joue encore 2 h 24/i);
 clean(p);});
test('Une même situation donne les mêmes chiffres en Simple, Pas à pas et Expert',async()=>{const p=await page('goal');
 edit(p,'f-goal-capital',200000);edit(p,'f-goal-target',1000000);edit(p,'f-goal-hourly',100000);edit(p,'f-goal-dailyMinutes',60);
 const stats=()=>[...p.d.querySelectorAll('#goal-results .calc-stat')].map(n=>n.textContent.replace(/\s+/g,' ').trim()).join('|');
 const answer=()=>p.d.querySelector('#goal-results .calc-answer').textContent.replace(/\s+/g,' ');
 const ref={stats:stats(),answer:answer()};
 for(const m of ['guided','advanced','quick']){clickSel(p,'[data-mode="'+m+'"]');assert.equal(stats(),ref.stats,'stats en mode '+m);assert.equal(answer(),ref.answer,'réponse en mode '+m);}
 assert.match(text(p,'goal-results'),/Ta prochaine étape/);
 clean(p);});
test('Pas à pas : les questions expliquent leur raison et sautent celles qui ne servent plus',async()=>{const p=await page('goal');
 clickSel(p,'[data-mode="guided"]');p.flush();edit(p,'f-goal-capital',200000);edit(p,'f-goal-target',1000000);p.flush();
 assert.match(p.d.getElementById('wiz-why').textContent,/Pourquoi cette question/);
 assert.equal(p.d.querySelectorAll('#panel-goal .calc-step[data-skip]').length,0);
 edit(p,'f-goal-target',100000);p.flush();
 assert.equal(p.d.querySelectorAll('#panel-goal .calc-step[data-skip]').length,2,'gain et rythme inutiles quand l’objectif est atteint');
 assert.match(text(p,'goal-results'),/Bravo/);
 clean(p);});
test('Saisie invalide : le champ concerné est nommé et un bouton y mène',async()=>{const p=await page('goal');
 edit(p,'f-goal-capital',200000);edit(p,'f-goal-target',1000000);edit(p,'f-goal-hourly',100000);edit(p,'f-goal-reserve',500000);
 const t=text(p,'goal-results');assert.match(t,/réserve|de côté/i);const b=p.d.querySelector('#goal-results [data-b-focus]');assert.ok(b);assert.equal(b.dataset.bFocus,'f-goal-reserve');
 clean(p);});
test('Business plan (v5) : gain par heure, achats d’avant, réserve gardée, ordre conseillé, prochaine partie, échéance et suivi du réel',async()=>{
 const s=blank();s.plan.goal={...s.plan.goal,kind:'purchase',name:'Mon but',price:1000000};s.plan.situation={capital:200000,reserve:20000,hourly:100000,unitsHourly:0,dailyMinutes:60,daysPerWeek:7,upkeepPerSession:0};s.plan.source='hourly';
 s.plan.prerequisites=[{id:'p1',name:'Sans gain',itemId:'',referencePrice:null,price:100000,boostHourly:0,owned:false},{id:'p2',name:'Rapporte',itemId:'',referencePrice:null,price:200000,boostHourly:50000,owned:false}];
 const p=await page('plan',s);let t=text(p,'plan-results'),rep=text(p,'plan-report');
 assert.match(t,/il te manque/);assert.match(t,/Ta prochaine partie \(1 h\)/);assert.match(rep,/Ton programme, dans l’ordre/);assert.match(rep,/En premier/);assert.match(rep,/achète « Rapporte »/);assert.match(rep,/L’ordre des achats d’avant/);assert.match(rep,/Ce qui rapporte le plus vite d’abord/);
 // la réserve est gardée à chaque partie : jamais moins de 20 000 après un achat
 const r=B.evaluate('plan',JSON.parse(p.w.localStorage.getItem('lk-calculator-v1')));assert.ok(r.valid);assert.ok(r.sessions.every(x=>x.cashAfter>=20000-1e-6));assert.equal(r.strategy,'byPayback');assert.equal(r.purchases.find(x=>x.id==='p2').atSession,1);
 // suivi du réel : ce que j’ai maintenant remplace l’argent de départ du plan, l’historique garde prévu et réel, l’achat coché sort du plan
 edit(p,'plan-actual',350000);edit(p,'plan-actual-minutes',60);const bought=p.d.querySelector('[data-b-plan-actual-bought="p2"]');bought.checked=true;fire(p,bought,'change');clickSel(p,'[data-b-plan-log]');
 const saved=JSON.parse(p.w.localStorage.getItem('lk-calculator-v1'));assert.equal(saved.plan.situation.capital,350000);assert.equal(saved.goal.capital,s.goal.capital,'les huit calculs ne bougent pas');assert.equal(saved.plan.log.length,1);assert.equal(saved.plan.log[0].sessionMinutes,60);assert.equal(saved.plan.log[0].gain,350000-200000+200000);assert.equal(saved.plan.log[0].plannedGain,100000);assert.deepEqual(saved.plan.log[0].purchases,['p2']);assert.equal(saved.plan.prerequisites.find(x=>x.id==='p2').owned,true);
 rep=text(p,'plan-report');assert.match(rep,/BILAN DE TA DERNIÈRE PARTIE/);assert.match(rep,/Réalisé contre prévu/);assert.match(rep,/350\s000/);assert.doesNotMatch(rep,/achète « Rapporte »/);
 // échéance impossible : dit clairement, avec les leviers ; puis faisable
 edit(p,'plan-deadline',2);rep=text(p,'plan-report');assert.match(rep,/Pas avec ton rythme actuel/);assert.match(rep,/Ou gagner/);
 edit(p,'plan-deadline',60);assert.match(text(p,'plan-report'),/Oui, c’est faisable/);
 assert.ok(p.d.querySelector('[data-b-plan-export]'));
 clean(p);});
test('Business plan dans les trois modes : mêmes chiffres, profondeur différente',async()=>{
 const s=blank();s.plan.goal={...s.plan.goal,kind:'amount',target:1000000};s.plan.situation={capital:200000,reserve:0,hourly:100000,unitsHourly:0,dailyMinutes:60,daysPerWeek:7,upkeepPerSession:0};
 const p=await page('plan',s);const answer=()=>p.d.querySelector('#plan-results .calc-answer').textContent.replace(/\s+/g,' ');const ref=answer();assert.match(ref,/8 parties/);
 assert.doesNotMatch(text(p,'plan-report'),/Ton calendrier/);
 clickSel(p,'[data-mode="advanced"]');assert.equal(answer(),ref);assert.match(text(p,'plan-report'),/Ton calendrier/);assert.match(text(p,'plan-report'),/Partie par partie/);assert.match(text(p,'plan-report'),/Et si/);assert.match(text(p,'expert-plan'),/Résultats bruts/);
 clickSel(p,'[data-mode="guided"]');p.flush();assert.equal(answer(),ref);assert.ok(p.d.getElementById('wiz-count'));assert.match(p.d.getElementById('wiz-count').textContent,/Question 1 sur/);
 clean(p);});
test('Graphiques : titre, axes nommés, légende sans la couleur, phrase de lecture et chiffres qui correspondent',async()=>{const p=await page('roi');
 clickSel(p,'[data-b-roi-manual]');edit(p,'f-roi-purchase',120000);edit(p,'roi-capital',500000);const mode=p.d.getElementById('f-roi-mode');mode.value='continuous';fire(p,mode,'change');edit(p,'f-roi-revenueHourly',20000);edit(p,'f-roi-hours',10);
 clickSel(p,'[data-mode="advanced"]');const fig=p.d.querySelector('[data-c-chart="c-roi-compare"]');assert.ok(fig,'graphique avec/sans');
 const svg=fig.querySelector('svg');assert.match(svg.textContent,/Avantage de l’achat/);assert.match(svg.textContent,/Temps de jeu \(heures\)/);
 assert.match(fig.querySelector('.c-chart-reading').textContent,/6 h/);
 let rows=[...fig.querySelectorAll('.c-chart-data tbody tr')].map(tr=>[...tr.children].map(c=>c.textContent.trim()));
 let last=rows[rows.length-1];assert.match(last[0],/10 h/);assert.match(last[1],/80\s000/);
 // avec le gain actuel connu : deux situations complètes, séries reconnaissables sans la couleur
 edit(p,'f-goal-hourly',30000);const fig2=p.d.querySelector('[data-c-chart="c-roi-compare"]');assert.equal(fig2.querySelectorAll('.c-legend li').length,2);assert.ok(fig2.querySelector('path[stroke-dasharray]'),'série repère en tirets');
 rows=[...fig2.querySelectorAll('.c-chart-data tbody tr')].map(tr=>[...tr.children].map(c=>c.textContent.trim()));last=rows[rows.length-1];assert.match(last[1],/800\s000/);assert.match(last[2],/880\s000/);
 assert.match(text(p,'roi-results'),/Argent après 10 h/);
 clean(p);});
