'use strict';
/* v7.49 (lot 2) — liens vers le calculateur : anomalies 1 à 7 de l’inventaire.
   Un lien remplit l’outil demandé, jamais un autre ; il ne remplace jamais un calcul existant sans en garder une copie. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..'),{load}=require('./runtime-helper.cjs');
const B=require(root+'/calculateurs-scenario.js');
const ctx={window:{}};vm.createContext(ctx);for(const f of ['vehicules-data.js','armes-data.js','acquisitions-data.js','calculateurs-catalogue.js','calculateurs-activites.js','calculateurs-data.js'])vm.runInContext(fs.readFileSync(root+'/'+f,'utf8'),ctx);
const initial=B.initial(ctx.window.LKCalcData.version||'x',JSON.parse(JSON.stringify(ctx.window.LKCalcData.presets)));
const fire=(p,node,type='click')=>node.dispatchEvent(new p.w.Event(type,{bubbles:true,cancelable:true}));
const stored=p=>JSON.parse(p.w.localStorage.getItem('lk-calculator-v1'))||B.copy(initial);/* rien d’enregistré = rien de changé par le lien */
const live=p=>p.d.getElementById('calc-live').textContent.replace(/\s+/g,' ');
const clean=p=>{assert.deepEqual(p.errors,[]);p.close();};
const open=(q,storage)=>load(root,'calculateurs.html?'+q,{storage:storage||{}});

test('1 — le chapitre « choisir » du Tuto a son bouton de retour',async()=>{
 const p=await open('tool=compare&mode=simple&from=tuto&chapter=choisir');
 const back=p.d.getElementById('calc-tuto-return');assert.ok(back&&!back.hidden);assert.match(back.getAttribute('href'),/tuto\.html#choisir$/);
 clean(p);});

test('2 — un type sans fiche limite le catalogue ; un lieu ne devient jamais un achat',async()=>{
 let p=await open('tool=purchase&type=vehicle&from=vehicules');assert.equal(stored(p).catalogue.type,'vehicle');assert.match(live(p),/Véhicule/);assert.equal(stored(p).tab,'purchase');clean(p);
 p=await open('tool=purchase&type=place&from=lieux');assert.equal(stored(p).catalogue.type,'all');assert.match(live(p),/Un lieu ne s’achète pas/);clean(p);
 p=await open('tool=budget&type=style&from=style');assert.equal(stored(p).catalogue.type,'style');assert.match(live(p),/écris tes montants à la main/);clean(p);
 p=await open('tool=purchase&type=licorne');assert.match(live(p),/type demandé par le lien n’existe pas/);clean(p);});

test('3 — « ids » remplit « Quel achat choisir ? », pas la comparaison de Mes achats',async()=>{
 const p=await open('tool=compare&ids=albany-emperor,albany-primo');const s=stored(p);
 assert.equal(s.tab,'compare');assert.deepEqual(s.compare.keys.length,2);assert.ok(s.compare.keys.every(k=>s.assets.some(a=>a.key===k)));assert.deepEqual(s.catalogue.compareIds,[]);
 assert.match(live(p),/2 achats à comparer/);clean(p);});

test('4 — « minutes » ne remplit que l’outil demandé ; 0 minute est refusé',async()=>{
 let p=await open('tool=session&minutes=30&from=home');let s=stored(p);assert.equal(s.session.minutes,30);assert.equal(s.goal.dailyMinutes,initial.goal.dailyMinutes,'« Je joue chaque jour » n’est pas touché');clean(p);
 p=await open('tool=goal&minutes=0');s=stored(p);assert.equal(s.goal.dailyMinutes,initial.goal.dailyMinutes);assert.match(live(p),/minutes/);clean(p);
 p=await open('tool=plan&minutes=90&capital=5000');s=stored(p);assert.equal(s.plan.situation.dailyMinutes,90);assert.equal(s.plan.situation.capital,5000);assert.equal(s.goal.capital,initial.goal.capital,'le plan a ses propres cases');clean(p);});

test('5 — prix, réserve, joueurs et mode « pas à pas » passent par l’adresse',async()=>{
 const p=await open('tool=purchase&type=vehicle&id=albany-primo&price=45000&reserve=20000&players=3&mode=guided');const s=stored(p);
 const a=s.assets.find(x=>x.key===s.purchase.key);assert.equal(a.itemId,'albany-primo');assert.equal(a.price,45000);
 assert.equal(s.goal.reserve,20000);assert.equal(s.goal.players,3);assert.equal(s.views.purchase,'guided');clean(p);
 const q=await open('tool=goal&players=0&reserve=-5');assert.match(live(q),/players, reserve|reserve, players/);clean(q);});

test('6 — un lien ne remplace pas un calcul existant en silence : copie gardée, retour possible',async()=>{
 const mine=B.copy(initial);mine.name='Mon calcul à moi';mine.goal.capital=345678;
 const p=await open('tool=goal&capital=1000&from=home',{'lk-calculator-v1':JSON.stringify(mine)});
 assert.equal(stored(p).goal.capital,1000);
 const box=p.d.getElementById('calc-link-notice');assert.ok(box,'un bandeau dit ce qui s’est passé');assert.match(box.textContent,/Ce lien a changé des chiffres de ton calcul/);assert.match(box.textContent,/gardé dans «\sMes calculs\s»/);
 const books=JSON.parse(p.w.localStorage.getItem('lk-calculator-notebooks-v3'));assert.ok(books.entries.some(e=>/avant le lien/.test(e.name)&&e.config.goal.capital===345678));
 fire(p,box.querySelector('[data-link-restore]'));assert.equal(stored(p).goal.capital,345678);assert.equal(p.d.getElementById('calc-link-notice'),null);
 clean(p);
 // Même chose pour un calcul partagé (#plan=)
 const other=B.copy(initial);other.goal.capital=777;
 const q=await load(root,'calculateurs.html#plan='+encodeURIComponent(JSON.stringify(other)),{storage:{'lk-calculator-v1':JSON.stringify(mine)}});
 assert.equal(stored(q).goal.capital,777);assert.match(q.d.getElementById('calc-link-notice').textContent,/calcul partagé à la place du tien/);
 fire(q,q.d.querySelector('[data-link-keep]'));assert.equal(stored(q).goal.capital,777);assert.equal(q.d.getElementById('calc-link-notice'),null);clean(q);
 // Un premier visiteur n’a rien à protéger : pas de bandeau
 const r=await open('tool=goal&capital=1000');assert.equal(r.d.getElementById('calc-link-notice'),null);clean(r);});

test('7 — « id » va dans l’outil demandé (comparaison, ordre, budget, plan) au lieu de forcer Mes achats',async()=>{
 let p=await open('tool=compare&type=vehicle&id=albany-emperor');let s=stored(p);assert.equal(s.tab,'compare');assert.ok(s.compare.keys.includes(s.assets.find(a=>a.itemId==='albany-emperor').key));clean(p);
 p=await open('tool=order&type=vehicle&id=albany-emperor');s=stored(p);assert.equal(s.tab,'order');assert.equal(s.order.keys.length,1);clean(p);
 p=await open('tool=plan&type=business&id=rideout-customs&price=250000');s=stored(p);assert.equal(s.tab,'plan');assert.equal(s.plan.goal.kind,'purchase');assert.equal(s.plan.goal.itemId,'rideout-customs');assert.equal(s.plan.goal.price,250000);clean(p);
 p=await open('tool=roi&type=business&id=rideout-customs');s=stored(p);assert.equal(s.tab,'roi');assert.equal(s.roi.key,s.purchase.key);clean(p);});

test('fiche → comparaison → plan : le prix écrit, l’usage et le choix suivent sans être perdus ni recopiés en silence',async()=>{
 const p=await open('tool=compare&type=vehicle&id=albany-emperor&price=100000');
 let s=stored(p);const a=s.assets.find(x=>x.itemId==='albany-emperor');assert.equal(a.price,100000);
 // deuxième achat depuis une autre fiche : la comparaison garde le premier
 const q=await load(root,'calculateurs.html?tool=compare&type=vehicle&id=albany-primo&price=130000',{storage:{'lk-calculator-v1':p.w.localStorage.getItem('lk-calculator-v1'),'lk-calculator-notebooks-v3':p.w.localStorage.getItem('lk-calculator-notebooks-v3')||''}});clean(p);
 s=stored(q);assert.equal(s.compare.keys.length,2);
 const b=s.assets.find(x=>x.itemId==='albany-primo');assert.equal(b.price,130000);
 const btn=q.d.querySelector('[data-b-compare-to-plan]');assert.ok(btn,'la réponse propose d’en faire le but du plan');fire(q,btn);
 s=stored(q);assert.equal(s.tab,'plan');assert.equal(s.plan.goal.kind,'purchase');assert.ok(['albany-emperor','albany-primo'].includes(s.plan.goal.itemId));
 assert.equal(s.plan.goal.price,s.assets.find(x=>x.itemId===s.plan.goal.itemId).price,'le prix écrit dans la comparaison devient celui du but');
 assert.equal(s.assets.find(x=>x.itemId==='albany-emperor').price,100000,'rien n’est changé dans les achats');
 clean(q);});
