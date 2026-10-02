'use strict';
/* Check ultime du calculateur (v7.59) — CALC-11 : la barre « Que veux-tu calculer ? » (calculateurs-hub.js) et les liens Léo
   (leo-link.js / leo-calculator.js) : phrases naturelles, chiffres et unités, ambiguïtés, demandes incohérentes, aller-retour
   sans perte. Valeurs d'essai seulement. */
const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const H=require('./check-ultime-helper.cjs'),root=H.root,{load}=require('./runtime-helper.cjs');
const B=require(path.join(root,'calculateurs-scenario.js')),L=require(path.join(root,'leo-link.js'));
const {D,catalogue,sourceActivities,presets}=H.siteData(),DV=H.dataVersion(D,catalogue,sourceActivities),initial=B.initial(DV,presets);
const stored=p=>JSON.parse(p.w.localStorage.getItem('lk-calculator-v1'));
const ask=(p,q)=>{const input=p.d.getElementById('calc-ask-input');input.value=q;p.d.getElementById('calc-ask').dispatchEvent(new p.w.Event('submit',{bubbles:true,cancelable:true}));p.flush();return {tab:p.d.querySelector('[data-tab][aria-selected="true"]').dataset.tab,out:p.d.getElementById('calc-ask-out').textContent,s:stored(p)};};

test('CALC-11 : la barre « Que veux-tu calculer ? » ouvre le bon outil et remplit les bonnes cases depuis une phrase (chiffres, k, M, million, heures, minutes)',async()=>{
 const cases=[
  ['J’ai 200 000 $ et je joue 45 min par jour, je veux 1 million',r=>{assert.equal(r.tab,'goal');assert.equal(r.s.goal.capital,200000);assert.equal(r.s.goal.target,1000000);assert.equal(r.s.goal.dailyMinutes,45);assert.match(r.out,/ton argent est rempli/);}],
  ['Combien de temps pour atteindre 1,5 million avec 2 h par jour ?',r=>{assert.equal(r.tab,'goal');assert.equal(r.s.goal.target,1500000);assert.equal(r.s.goal.dailyMinutes,120);}],
  ['je veux économiser 250k',r=>{assert.equal(r.tab,'goal');assert.equal(r.s.goal.target,250000);}],
  ['Puis-je me permettre d’acheter un véhicule à 250000 $ ?',r=>{assert.equal(r.tab,'purchase');assert.equal(B.asset(r.s,r.s.purchase.key).price,250000);assert.match(r.out,/le prix est rempli/);}],
  ['J’ai 30 minutes pour ma session',r=>{assert.equal(r.tab,'session');assert.equal(r.s.session.minutes,30);}],
  ['En combien de temps un investissement de 500000 $ est amorti ?',r=>{assert.equal(r.tab,'roi');assert.equal(B.asset(r.s,r.s.roi.key).price,500000,'v7.59 : le prix va dans Ça vaut le coup ?');}],
  ['ça vaut le coup d’acheter un local à 2 M si j’ai 800k ?',r=>{assert.equal(r.tab,'roi');assert.equal(r.s.goal.capital,800000);assert.equal(B.asset(r.s,r.s.roi.key).price,2000000);}],
  ['quoi acheter d’abord',r=>{assert.equal(r.tab,'order');assert.match(r.out,/remplis les cases/);}],
  ['lequel choisir : la moto ou la voiture ?',r=>{assert.equal(r.tab,'compare');}],
  ['j’ai 300 000 $, comment les répartir ?',r=>{assert.equal(r.tab,'budget');assert.equal(r.s.goal.capital,300000,'v7.59 : « j’ai X » remplit J’ai déjà dans l’outil ouvert');}],
  ['quelle mission rapporte le plus en 90 minutes ?',r=>{assert.equal(r.tab,'activities');assert.equal(r.s.inverse.minutes,90);}],
  ['mon business plan : j’ai 50k et je veux 400 000 $, parties de 1 h',r=>{assert.equal(r.tab,'plan');assert.equal(r.s.plan.situation.capital,50000);assert.equal(r.s.plan.goal.target,400000);assert.equal(r.s.plan.situation.dailyMinutes,60);assert.equal(r.s.goal.capital,initial.goal.capital,'le plan ne touche pas aux huit calculs');}],
  ['bonjour',r=>{assert.equal(r.tab,'goal','sans mot connu : Mon objectif, sans rien remplir');assert.match(r.out,/remplis les cases/);}],
 ];
 for(const [q,check] of cases){const p=await load(root,'calculateurs.html',{});const r=ask(p,q);try{check(r);}catch(e){e.message='« '+q+' » : '+e.message;throw e;}assert.deepEqual(p.errors,[],q);p.close();}});

test('CALC-11 : demandes incohérentes ou hors bornes : rien n’est inventé, la case reste celle d’avant ou est signalée',async()=>{
 const p=await load(root,'calculateurs.html',{});
 let r=ask(p,'je veux 1 million en -3 jours');assert.equal(r.tab,'goal');assert.equal(r.s.goal.target,1000000);assert.equal(r.s.goal.dailyMinutes,initial.goal.dailyMinutes,'un temps négatif n’est pas lu');
 r=ask(p,'j’ai 5 000 000 000 000 $');assert.equal(r.s.goal.capital,initial.goal.capital,'au-delà de 1 000 milliards : ignoré, la case garde sa valeur');assert.equal(r.s.goal.target,1000000);
 r=ask(p,'je joue 30 heures par jour pour avoir 2 millions');assert.equal(r.s.goal.target,2000000);assert.equal(r.s.goal.dailyMinutes,initial.goal.dailyMinutes,'1 800 min par jour > 1 440 : pas rempli');
 r=ask(p,'j’ai 40 minutes pour ma session');assert.equal(r.tab,'session');assert.equal(r.s.session.minutes,40);
 assert.deepEqual(p.errors,[]);p.close();});

test('CALC-11 : Léo → calculateur → Léo : la demande v1 est validée, appliquée sans perte, les paramètres répétés ou surdimensionnés sont refusés, le retour est vérifié',async()=>{
 const req={v:1,tool:'goal',values:{capital:150000,target:900000,hourly:60000,dailyMinutes:45},back:'/leo.html'};
 const url=L.toURL(req);assert.match(url,/^\/calculateurs\.html\?leo=/);assert.equal(JSON.stringify(L.fromURL(url.slice(url.indexOf('?'),url.indexOf('#')))),JSON.stringify(L.validate(req)));
 assert.throws(()=>L.fromURL('?leo='+encodeURIComponent(JSON.stringify(req))+'&leo='+encodeURIComponent(JSON.stringify(req))),/répété/);
 assert.throws(()=>L.validate({...req,values:{...req.values,capital:-1}}),/invalide/);assert.throws(()=>L.validate({...req,values:{...req.values,players:1.5}}),/invalide/);assert.throws(()=>L.validate({...req,values:{...req.values,bidule:1}}),/non reconnus/);
 assert.throws(()=>L.validate({...req,items:Array(9).fill('albany-emperor')}),/invalide/);assert.throws(()=>L.validate({...req,back:'https://ailleurs.example/'}),/retour invalide/);assert.throws(()=>L.validate({...req,values:{price:1},items:['albany-emperor','albany-primo']}),/prix de chaque achat/);
 assert.throws(()=>L.fromURL('?leo='+encodeURIComponent(JSON.stringify({...req,back:'/x'.repeat(2000)}))),/trop long/);
 /* fusion : seules les valeurs explicites changent ; le reste du calcul en cours est gardé */
 const base=H.baseState(B,initial,catalogue);const merged=L.apply({v:1,tool:'session',values:{minutes:25}},base,initial,B,catalogue,'merge',sourceActivities);
 assert.equal(merged.session.minutes,25);assert.equal(merged.inverse.minutes,25);assert.equal(merged.goal.capital,base.goal.capital);assert.equal(merged.goal.hourly,base.goal.hourly);assert.deepEqual(merged.order.keys,base.order.keys);assert.equal(merged.tab,'session');
 const fresh=L.apply({v:1,tool:'compare',items:['albany-emperor','albany-primo']},base,initial,B,catalogue,'new',sourceActivities);assert.equal(fresh.compare.keys.length,2);assert.equal(fresh.goal.capital,null,'nouveau calcul : les cases vides restent vides');assert.ok(fresh.assets.every(a=>a.price===null||a.key==='free-1'),'aucun prix inventé');
 assert.throws(()=>L.apply({v:1,tool:'goal',values:{capital:100,reserve:500}},base,initial,B,catalogue,'merge',sourceActivities),/plus petit que l’argent gardé/);
 /* dans la page : fenêtre de décision, « nouveau calcul » remplit l'outil, le calcul d'avant est gardé dans Mes plans, le lien de retour est posé */
 const p=await load(root,url.replace(/^\//,''),{storage:{'lk-calculator-v1':JSON.stringify({...base,dataVersion:DV})}});const d=p.d;
 const dlg=d.getElementById('leo-transfer');assert.ok(dlg,'fenêtre Léo');assert.match(dlg.textContent,/Mon objectif/);assert.match(dlg.textContent,/150\s000/);
 const btn=[...dlg.querySelectorAll('button')].find(b=>/Conserver une copie et ouvrir le nouveau/.test(b.textContent));assert.ok(btn);btn.dispatchEvent(new p.w.Event('click',{bubbles:true}));p.flush();
 const s=stored(p);assert.equal(s.tab,'goal');assert.equal(s.goal.capital,150000);assert.equal(s.goal.target,900000);assert.equal(s.goal.hourly,60000);assert.equal(s.goal.dailyMinutes,45);
 const nb=JSON.parse(p.w.localStorage.getItem('lk-calculator-notebooks-v3'));assert.ok(nb.entries.some(e=>e.tool==='plan'&&/avant Léo/.test(e.name)),'copie gardée dans Mes plans');
 const back=d.getElementById('leo-return');assert.ok(back&&back.querySelector('a').getAttribute('href')==='/leo.html','lien de retour vers la page de Léo');
 assert.match(d.getElementById('goal-results').textContent,/Il te manque/);assert.deepEqual(p.errors,[]);p.close();});
