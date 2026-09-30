'use strict';
/* v7.49 (lot 2) — Mon business plan dans la page : parcours sans durée de partie, chaîne des étapes, point bas,
   missions « une seule fois », prérequis entre achats, achat indispensable, variantes gardées, parcours à compléter.
   Toutes les données sont fictives (aucun chiffre du jeu). */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..'),{load}=require('./runtime-helper.cjs');
const B=require(root+'/calculateurs-scenario.js');
const ctx={window:{}};vm.createContext(ctx);for(const f of ['vehicules-data.js','armes-data.js','acquisitions-data.js','calculateurs-catalogue.js','calculateurs-activites.js','calculateurs-data.js'])vm.runInContext(fs.readFileSync(root+'/'+f,'utf8'),ctx);
const initial=B.initial('v749-ui',JSON.parse(JSON.stringify(ctx.window.LKCalcData.presets))),blank=()=>B.blank(initial);
const fire=(p,node,type='click')=>node.dispatchEvent(new p.w.Event(type,{bubbles:true,cancelable:true}));
const clickSel=(p,sel)=>{const n=p.d.querySelector(sel);assert.ok(n,'élément absent : '+sel);fire(p,n,'click');};
const text=(p,id)=>p.d.getElementById(id).textContent.replace(/\s+/g,' ');
const stored=p=>JSON.parse(p.w.localStorage.getItem('lk-calculator-v1'));
const clean=p=>{assert.deepEqual(p.errors,[]);assert.doesNotMatch(p.d.querySelector('.calc-panel:not([hidden])')?.textContent||'',/NaN|Infinity|undefined|\bnull\b/);p.close();};
async function page(s,folds){return load(root,'calculateurs.html?tool=plan',{storage:{'lk-calculator-v1':JSON.stringify(s),...(folds?{'lk-calc-folds-v1':JSON.stringify(folds)}:{})}});}
/* Le cas « un million » de la demande, écrit dans le business plan, sans durée de partie. */
function million(){const s=blank();s.name='Un million';s.plan.goal={...s.plan.goal,kind:'amount',target:1000000,meaning:'held'};
 s.plan.situation={capital:100000,reserve:20000,hourly:null,unitsHourly:0,dailyMinutes:null,daysPerWeek:7,upkeepPerSession:0};s.plan.source='missions';s.plan.strategy='asIs';
 s.plan.prerequisites=[{...B.copy(B.planPrereqTemplate),id:'v',name:'Véhicule requis',price:60000,minutes:12},{...B.copy(B.planPrereqTemplate),id:'w',name:'Arme requise',price:10000,minutes:8}];
 s.plan.missions=[{...B.copy(B.planMissionTemplate),id:'u',name:'Déblocage',reward:0,cost:0,duration:10,once:true},{...B.copy(B.planMissionTemplate),id:'m',name:'Mission répétable',reward:150000,cost:5000,duration:30,requires:['v','w'],requiresMissions:['u']}];
 return s;}

test('sans durée de partie : un parcours en temps de jeu (4 h), sans calendrier, avec son point bas et sa chaîne d’étapes',async()=>{
 const p=await page(million(),{all:true});
 const res=text(p,'plan-results');
 assert.match(res,/tu y arrives en 4 h de jeu/);assert.match(res,/il te manque 900\s000 \$/,'« en tout » : l’argent gardé de côté compte dans le million');assert.match(res,/Sans durée de partie, il n’y a pas de calendrier/);
 assert.match(res,/Au plus bas\s: 25\s000 \$/);assert.match(res,/jamais sous l’argent gardé de côté/);
 assert.doesNotMatch(res,/\bjours?\b.*vers le/,'aucune date inventée sans durée de partie');
 const rep=text(p,'plan-report');assert.match(rep,/Ton parcours, dans l’ordre/);
 const chain=[...p.d.querySelectorAll('#plan-report .c-chain-step')].map(n=>n.className.replace('c-chain-step is-',''));
 assert.deepEqual(chain.slice(0,5),['start','acquire','acquire','unlock','run'],chain.join(' '));assert.equal(chain.at(-1),'goal');
 assert.match(rep,/Mission répétable ×7/);
 assert.ok(p.d.querySelector('#plan-results .b-explain'),'« Ce qui compte dans ce calcul » est aussi dans le plan');
 clean(p);});

test('sans durée de partie, le mode Expert montre « Étape par étape » et une courbe en marches, sans calendrier',async()=>{
 const s=million();s.views={...(s.views||{}),plan:'advanced'};s.mode='advanced';
 const p=await page(s,{all:true});
 const rep=text(p,'plan-report');assert.match(rep,/Étape par étape/);assert.doesNotMatch(rep,/Ton calendrier/);
 const fig=p.d.querySelector('[data-c-chart="c-plan-curve"]');assert.ok(fig);assert.match(fig.querySelector('path.c-series-0').getAttribute('d'),/H[\d.]+ V[\d.]+/);
 assert.match(text(p,'plan-report'),/rien n’est lissé/);
 clean(p);});

test('avec une durée de partie, le même parcours redevient un programme partie par partie, chaîne d’achats comprise',async()=>{
 const s=million();s.plan.situation.dailyMinutes=120;
 const p=await page(s,{all:true});
 const res=text(p,'plan-results');assert.match(res,/2 parties/);assert.doesNotMatch(res,/de jeu, étape après étape/);
 const rep=text(p,'plan-report');assert.match(rep,/Le parcours, dans l’ordre/);assert.match(rep,/avant ta première partie/);
 clean(p);});

test('mission « une seule fois » et « déjà faite » : cases dans la carte, état gardé, recalcul immédiat',async()=>{
 const p=await page(million());
 const once=p.d.querySelector('[data-b-plan-m-once="0"]');assert.ok(once.checked);
 const done=p.d.querySelector('[data-b-plan-m-done="0"]');assert.ok(done,'« Je l’ai déjà faite » apparaît pour une mission unique');
 done.checked=true;fire(p,done,'change');assert.equal(stored(p).plan.missions[0].done,true);
 assert.doesNotMatch(text(p,'plan-results'),/Fais « Déblocage »/,'une mission déjà faite ne revient pas dans le parcours');
 const again=p.d.querySelector('[data-b-plan-m-once="0"]');again.checked=false;fire(p,again,'change');
 assert.equal(stored(p).plan.missions[0].once,false);assert.equal(stored(p).plan.missions[0].done,false,'une mission répétable n’est jamais « déjà faite »');
 const reqm=p.d.querySelector('[data-b-plan-m-reqm="1|u"]');assert.ok(reqm.checked,'la mission répétable demande la mission de déblocage');
 clean(p);});

test('achat d’avant : prérequis, temps pour l’obtenir, coût par partie et « indispensable » se règlent dans la carte',async()=>{
 const s=million();s.plan.situation.dailyMinutes=120;
 const p=await page(s);
 const req=p.d.querySelector('[data-b-plan-p-req="1|v"]');assert.ok(req,'l’arme peut demander le véhicule');req.checked=true;fire(p,req,'change');
 assert.deepEqual(stored(p).plan.prerequisites[1].requires,['v']);
 assert.ok(p.d.querySelector('[data-b-plan-p-req="0|u"]'),'une mission unique peut être demandée par un achat');
 assert.equal(p.d.querySelector('[data-b-plan-p-req="0|m"]'),null,'une mission répétable ne peut pas être un prérequis d’achat');
 const lock=p.d.querySelector('[data-b-plan-p-lock="w"]');lock.checked=true;fire(p,lock,'change');assert.deepEqual(stored(p).plan.locked,['w']);
 assert.match(p.d.querySelector('[data-b-plan-p-head="1"]').textContent,/indispensable/);
 assert.ok(p.d.getElementById('plan-p-0-minutes'));assert.ok(p.d.getElementById('plan-p-0-usage'));
 // retirer le véhicule nettoie les références
 clickSel(p,'[data-b-plan-p-remove="0"]');const st=stored(p);assert.deepEqual(st.plan.prerequisites.map(a=>a.id),['w']);assert.deepEqual(st.plan.prerequisites[0].requires,[]);assert.deepEqual(st.plan.missions[1].requires,['w']);
 clean(p);});

test('prix d’un achat d’avant inconnu : « Parcours à compléter », jamais gratuit, bouton vers la bonne case',async()=>{
 const s=million();s.plan.prerequisites[0].price=null;
 const p=await page(s);
 const res=text(p,'plan-results');assert.match(res,/Parcours à compléter/);assert.match(res,/jamais compté comme gratuit/);
 const b=p.d.querySelector('#plan-results [data-b-focus="plan-p-0-price"]');assert.ok(b);assert.match(b.textContent,/Véhicule requis/);
 assert.ok(p.d.querySelector('#plan-results .c-chain-step.is-missing'));
 clean(p);});

test('« avoir » a un sens choisi : disponible, en tout ou gagné ; le choix change le résultat et il est gardé',async()=>{
 const s=million();s.plan.situation.dailyMinutes=null;
 const p=await page(s);
 const sel=p.d.getElementById('f-plan-goal-meaning');assert.ok(sel);assert.equal(sel.value,'held');
 const before=text(p,'plan-results');
 sel.value='cumulative';fire(p,sel,'change');assert.equal(stored(p).plan.goal.meaning,'cumulative');assert.match(text(p,'plan-results'),/il te manque 1\s000\s000 \$/,'« gagné à partir de maintenant » : ce que tu as déjà ne compte pas');
 const after=text(p,'plan-results');assert.notEqual(after,before);assert.match(after,/de jeu/);
 clean(p);});

test('variantes : garder, comparer, reprendre sans rien perdre, retirer ; cinq au plus',async()=>{
 const s=million();s.plan.situation.dailyMinutes=120;
 const p=await page(s,{all:true});
 clickSel(p,'[data-b-plan-vsave]');assert.equal(stored(p).plan.variants.length,1);
 const cap=p.d.getElementById('plan-capital');cap.value='500000';fire(p,cap,'input');
 const rep=text(p,'plan-report');assert.match(rep,/Plan actuel/);assert.match(rep,/1 variante gardée/);
 const id=stored(p).plan.variants[0].id;clickSel(p,'[data-b-plan-vload="'+id+'"]');
 let st=stored(p);assert.equal(st.plan.situation.capital,100000,'la variante est reprise');assert.equal(st.plan.variants.length,1);assert.equal(st.plan.variants[0].situation.capital,500000,'le plan d’avant est rangé à sa place');
 for(let i=0;i<4;i++)clickSel(p,'[data-b-plan-vsave]');assert.equal(stored(p).plan.variants.length,5);
 assert.ok(p.d.querySelector('[data-b-plan-vsave]').disabled,'cinq variantes au plus');
 clickSel(p,'[data-b-plan-vdel="'+stored(p).plan.variants[0].id+'"]');assert.equal(stored(p).plan.variants.length,4);
 clean(p);});

test('la fiche enregistrée suit le parcours sans durée de partie : temps de jeu, chaîne, aucun jour inventé',async()=>{
 const p=await page(million());p.w.confirm=()=>true;
 clickSel(p,'[data-b-save="plan"]');
 const summary=JSON.parse(p.w.localStorage.getItem('lk-calculator-notebooks-v3')).entries[0].summary.replace(/[\u00a0\u202f]/g,' ');
 assert.match(summary,/But : avoir 1 000 000 \$ · 4 h de jeu · 2 missions/);
 clickSel(p,'#saved-plans-list [data-b-sheet]');const sheet=text(p,'calc-sheet-body');
 for(const part of ['FICHE DE BUSINESS PLAN','En bref','Temps de jeu','Il faut 4 h de jeu, étape après étape (sans calendrier).','Au plus bas','Le parcours, dans l’ordre','Mission répétable ×7','pendant le parcours'])assert.match(sheet,new RegExp(part.replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/ /g,'\\s')),part);
 assert.doesNotMatch(sheet,/NaN|Infinity|undefined|\bnull\b|Partie 1|jour \d/);
 clickSel(p,'[data-b-sheet-close]');
 clean(p);});

test('saisies rapides : la dernière valeur écrite gagne, partout (réponse, stockage, explication)',async()=>{
 const s=million();s.plan.situation.dailyMinutes=120;
 const p=await page(s);
 const cap=p.d.getElementById('plan-capital');
 for(const v of ['1','12','120','1200','12000','120000','200000']){cap.value=v;fire(p,cap,'input');}
 assert.equal(stored(p).plan.situation.capital,200000);
 const res=text(p,'plan-results');assert.match(res,/il te manque 800\s000 \$/,'le résultat affiché est celui de la dernière saisie');
 assert.doesNotMatch(res,/999\s880|988\s000/,'aucun résultat d’une saisie intermédiaire ne reste');
 clean(p);});
