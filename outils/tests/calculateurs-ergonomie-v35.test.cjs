'use strict';
/* v7.35 — ergonomie : « gros points » repliables sur tout le calculateur, mouvement, graphiques avec points modifiables.
   Toutes les données sont fictives (aucun chiffre du jeu). */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..'),{load}=require('./runtime-helper.cjs');
const B=require(root+'/calculateurs-scenario.js');
const ctx={window:{}};vm.createContext(ctx);for(const f of ['vehicules-data.js','armes-data.js','acquisitions-data.js','calculateurs-catalogue.js','calculateurs-activites.js','calculateurs-data.js'])vm.runInContext(fs.readFileSync(root+'/'+f,'utf8'),ctx);
const initial=B.initial('v35',JSON.parse(JSON.stringify(ctx.window.LKCalcData.presets))),blank=()=>B.blank(initial);
const fire=(p,node,type='click')=>node.dispatchEvent(new p.w.Event(type,{bubbles:true,cancelable:true}));
const clickSel=(p,sel)=>{const n=p.d.querySelector(sel);assert.ok(n,'élément absent : '+sel);fire(p,n,'click');};
const text=(p,id)=>p.d.getElementById(id).textContent.replace(/\s+/g,' ');
const stored=p=>JSON.parse(p.w.localStorage.getItem('lk-calculator-v1'));
const folds=(p,scope)=>[...p.d.querySelectorAll(scope+' .b-fold')].map(f=>f.dataset.fold+':'+(f.classList.contains('is-open')?'open':'closed'));
/* Tel quel : aucun état de pliage enregistré, comme un premier visiteur. */
async function page(tool,s,extra={}){return load(root,'calculateurs.html?tool='+tool,{storage:{...(s?{'lk-calculator-v1':JSON.stringify(s)}:{}),...(extra.storage||{})}});}
const clean=p=>{assert.deepEqual(p.errors,[]);assert.doesNotMatch(p.d.querySelector('.calc-panel:not([hidden])')?.textContent||'',/NaN|Infinity|undefined|\bnull\b/);p.close();};
function scenario(){const s=blank();s.name='Ma voiture';s.plan.goal={...s.plan.goal,kind:'purchase',name:'Ma voiture',price:1000000};s.plan.situation={capital:50000,reserve:10000,hourly:null,unitsHourly:0,dailyMinutes:90,daysPerWeek:5,upkeepPerSession:0};s.plan.source='missions';
 s.plan.missions=[{...B.copy(B.planMissionTemplate),id:'a',name:'Courses',reward:20000,cost:2000,duration:10,requires:[]},{...B.copy(B.planMissionTemplate),id:'b',name:'Braquage',reward:150000,cost:20000,duration:40,cooldown:5,requires:['g']}];s.plan.prerequisites=[{id:'g',name:'Garage',itemId:'',referencePrice:null,price:100000,boostHourly:5000,owned:false}];return s;}

test('Le document du plan : des points repliés par défaut, l’essentiel dans chaque titre, le contenu calculé à l’ouverture',async()=>{const p=await page('plan',scenario());
 const list=folds(p,'#plan-report');assert.equal(list.length,5);assert.ok(list.every(x=>x.endsWith(':closed')),list.join(' '));
 const rep=text(p,'plan-report');assert.match(rep,/Appuie sur un point pour l’ouvrir/);assert.match(rep,/Ton programme, dans l’ordre/);assert.match(rep,/En premier : « Courses » ×9 · 5 parties, 2 étapes/,'le titre porte déjà l’essentiel');assert.match(rep,/Plans A, B, C… calculés sur ta situation/);
 assert.equal(p.d.getElementById('fold-plan-program').innerHTML,'','rien n’est calculé ni rendu tant que le point est fermé');assert.doesNotMatch(rep,/Après la partie 1 : achète/);
 clickSel(p,'[data-fold-head="plan-program"]');const f=p.d.querySelector('[data-fold="plan-program"]');assert.ok(f.classList.contains('is-open'));assert.equal(f.querySelector('.b-fold-head').getAttribute('aria-expanded'),'true');assert.equal(p.d.getElementById('fold-plan-program').hidden,false);assert.match(text(p,'plan-report'),/En premier · Partie 1/);assert.match(text(p,'plan-report'),/Après la partie 1 : achète « Garage »/);
 assert.ok(p.d.getElementById('fold-plan-program').classList.contains('is-anim'),'l’ouverture s’anime');
 clickSel(p,'[data-fold-head="plan-alternatives"]');assert.match(text(p,'plan-report'),/Plan A · Le meilleur mélange/);
 // l’état est gardé sur l’appareil et survit à un recalcul et à un rechargement
 assert.deepEqual(JSON.parse(p.w.localStorage.getItem('lk-calc-folds-v1')).items,{'plan-program':true,'plan-alternatives':true});
 const cap=p.d.getElementById('plan-capital');cap.value='60000';fire(p,cap,'input');assert.deepEqual(folds(p,'#plan-report').slice(0,2),['plan-program:open','plan-alternatives:open']);
 clickSel(p,'[data-fold-head="plan-program"]');assert.equal(p.d.querySelector('[data-fold="plan-program"]').classList.contains('is-open'),false);assert.equal(p.d.getElementById('fold-plan-program').hidden,true);
 const again=await load(root,'calculateurs.html?tool=plan',{storage:{'lk-calculator-v1':p.w.localStorage.getItem('lk-calculator-v1'),'lk-calc-folds-v1':p.w.localStorage.getItem('lk-calc-folds-v1')}});
 assert.deepEqual(folds(again,'#plan-report').slice(0,2),['plan-program:closed','plan-alternatives:open']);again.close();
 // tout déplier / tout replier
 clickSel(p,'[data-b-fold-all="open"]');assert.ok(folds(p,'#plan-report').every(x=>x.endsWith(':open')));assert.match(text(p,'plan-report'),/Mettre à jour mon plan/);
 clickSel(p,'[data-b-fold-all="close"]');assert.ok(folds(p,'#plan-report').every(x=>x.endsWith(':closed')));
 clean(p);});
test('Les points suivent le plan : suivi, échéance et détails ont leur titre parlant ; la mise à jour se fait dans un point ouvert',async()=>{const p=await page('plan',scenario());
 clickSel(p,'[data-fold-head="plan-actual"]');const set=(id,v)=>{const n=p.d.getElementById(id);n.value=String(v);fire(p,n,'input');};set('plan-actual',120000);set('plan-actual-minutes',90);clickSel(p,'[data-b-plan-log]');
 assert.equal(stored(p).plan.situation.capital,120000);assert.ok(p.d.querySelector('[data-fold="plan-actual"]').classList.contains('is-open'),'le point reste ouvert après la mise à jour');
 let rep=text(p,'plan-report');assert.match(rep,/1 partie notée · dernière : \+70\s000 \$ \(−92\s000 \$ par rapport au prévu\)/);assert.match(rep,/70\s000 \$ gagnés au lieu de 162\s000 \$ prévus · plans A, B, C…/);assert.ok(p.d.querySelector('[data-fold="plan-alternatives"]').classList.contains('b-fold--alert'));
 const dl=p.d.getElementById('plan-deadline');dl.value='2';fire(p,dl,'input');rep=text(p,'plan-report');assert.match(rep,/Ton échéance : 2 jours/);assert.match(rep,/Pas avec ton rythme · jour \d+ au lieu de 2/);
 clickSel(p,'[data-mode="advanced"]');const list=folds(p,'#plan-report');assert.ok(list.length>=10,'les détails ajoutent leurs points : '+list.join(' '));assert.ok(list.includes('plan-curve:closed'));assert.equal(folds(p,'#expert-plan').length,2);
 clean(p);});
test('Les huit calculs aussi : hypothèses, compromis et formules deviennent des points fermés, la réponse et ses chiffres restent seuls visibles',async()=>{const p=await page('goal');
 const list=folds(p,'#goal-results');assert.deepEqual(list,['goal-assumptions:closed','goal-d0:closed']);
 const t=text(p,'goal-results');assert.match(t,/Il te manque/);assert.match(t,/Ce qui compte dans ce calcul/);assert.match(t,/Argent en poche 200\s000 \$ · Objectif 1\s000\s000 \$/,'le titre résume les deux premières hypothèses');
 assert.equal(p.d.querySelector('#fold-goal-assumptions').hidden,true);clickSel(p,'[data-fold-head="goal-assumptions"]');assert.equal(p.d.querySelector('#fold-goal-assumptions').hidden,false);assert.ok(p.d.querySelector('#fold-goal-assumptions .b-assumptions-box'));
 clickSel(p,'[data-tab="roi"]');clickSel(p,'[data-b-roi-manual]');const price=p.d.getElementById('f-roi-purchase');price.value='120000';fire(p,price,'input');
 const roi=folds(p,'#roi-results');assert.ok(roi.some(x=>x.startsWith('roi-assumptions')));assert.ok(roi.some(x=>x.startsWith('roi-d')));assert.ok(roi.every(x=>x.endsWith(':closed')));
 const heads=[...p.d.querySelectorAll('#roi-results .b-fold-title')].map(n=>n.textContent);assert.ok(heads.some(h=>/Acheter maintenant ou attendre/.test(h)),heads.join('|'));assert.ok(heads.some(h=>/Comment est-ce calculé/.test(h)));
 clickSel(p,'[data-tab="session"]');assert.deepEqual(folds(p,'#session-timeline'),['session-timeline:closed']);assert.match(text(p,'session-timeline'),/Ton programme, dans l’ordre/);clickSel(p,'[data-fold-head="session-timeline"]');assert.ok(p.d.querySelector('#session-timeline .calc-session-timeline'));
 clickSel(p,'[data-mode="advanced"]');const ex=folds(p,'#expert-session');assert.ok(ex.includes('session-formula:closed')&&ex.includes('session-raw:closed'),ex.join(' '));
 clean(p);});
test('Graphiques : aire dégradée, info-bulle sur chaque point, point réel modifiable, chiffre de sensibilité applicable d’un clic',async()=>{
 const s=blank();s.goal={...s.goal,capital:200000,target:1000000,hourly:100000,dailyMinutes:60};s.plan.goal={...s.plan.goal,kind:'amount',target:1000000};s.plan.situation={capital:250000,reserve:0,hourly:100000,unitsHourly:0,dailyMinutes:60,daysPerWeek:7,upkeepPerSession:0};s.plan.details=true;
 s.plan.log=[{at:'2026-09-20T10:00:00.000Z',capital:250000,minutes:60,forecast:300000,note:'',units:null,unitsGain:null,gain:50000,plannedGain:100000,sessionMinutes:60,runs:{},purchases:[]}];
 const p=await page('plan',s,{storage:{'lk-calc-folds-v1':JSON.stringify({all:true})}});
 const fig=p.d.querySelector('[data-c-chart="c-plan-curve"]');assert.ok(fig);assert.ok(fig.querySelector('.c-area'),'aire sous la courbe prévue');assert.ok(fig.querySelector('linearGradient'));
 const pts=[...fig.querySelectorAll('svg[role="img"] .c-chart-point')];assert.ok(pts.length>=3);assert.ok(pts.every(x=>x.getAttribute('data-tip')));
 const real=fig.querySelector('[data-c-edit="log:0"]');assert.ok(real,'le point réel est modifiable');assert.equal(real.getAttribute('role'),'button');assert.match(real.getAttribute('data-tip'),/clique pour corriger/);
 fire(p,real,'click');const box=p.d.querySelector('.c-edit');assert.ok(box,'fenêtre de correction');assert.equal(box.querySelector('[data-c-edit-capital]').value.replace(/\s/g,''),'250000');
 box.querySelector('[data-c-edit-capital]').value='260 000';box.querySelector('[data-c-edit-minutes]').value='75';clickSel(p,'[data-c-edit-save]');
 assert.equal(stored(p).plan.log[0].capital,260000);assert.equal(stored(p).plan.log[0].minutes,75);assert.equal(p.d.querySelector('.c-edit'),null,'la fenêtre se ferme au rendu suivant');
 fire(p,p.d.querySelector('[data-c-edit="log:0"]'),'click');clickSel(p,'[data-c-edit-delete]');assert.equal(stored(p).plan.log.length,0);
 // sensibilité (Expert de Mon objectif) : −20 % / +20 % s’appliquent au chiffre du joueur, jamais le point central
 clickSel(p,'[data-tab="goal"]');clickSel(p,'[data-mode="advanced"]');const sens=p.d.querySelector('[data-c-chart="c-sensitivity-goal"]');assert.ok(sens);
 const apply=[...sens.querySelectorAll('[data-c-apply]')];assert.equal(apply.length,2);assert.ok(apply.every(x=>x.dataset.cApply.startsWith('goal.hourly|')));
 const before=stored(p).goal.hourly;fire(p,apply[1],'click');assert.equal(stored(p).goal.hourly,Math.min(1e12,before*1.2));assert.equal(p.d.getElementById('f-goal-hourly').value,String(before*1.2));
 // au clavier aussi
 const k=p.d.querySelector('[data-c-chart="c-sensitivity-goal"] [data-c-apply]');k.dispatchEvent(new p.w.KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));assert.equal(stored(p).goal.hourly,before*1.2*0.8);
 clean(p);});
test('À l’impression tout se déplie, puis tout revient comme avant',async()=>{const p=await page('plan',scenario());
 assert.ok(folds(p,'#plan-report').every(x=>x.endsWith(':closed')));p.w.dispatchEvent(new p.w.Event('beforeprint'));assert.ok(folds(p,'#plan-report').every(x=>x.endsWith(':open')));assert.match(text(p,'plan-report'),/En premier · Partie 1/);
 p.w.dispatchEvent(new p.w.Event('afterprint'));assert.ok(folds(p,'#plan-report').every(x=>x.endsWith(':closed')));
 clean(p);});
test('La réponse qui change se signale ; une réponse identique ne bouge pas',async()=>{const p=await page('goal');
 const answer=()=>p.d.querySelector('#goal-results .calc-answer');assert.equal(answer().classList.contains('is-updated'),false);
 const cap=p.d.getElementById('f-goal-capital');cap.value='300000';fire(p,cap,'input');assert.equal(answer().classList.contains('is-updated'),true);
 fire(p,answer(),'animationend');assert.equal(answer().classList.contains('is-updated'),false,'le signal s’éteint à la fin de l’animation');clickSel(p,'[data-tab="session"]');clickSel(p,'[data-tab="goal"]');assert.equal(answer().classList.contains('is-updated'),false);
 clean(p);});
