'use strict';
/* Check ultime du calculateur (v7.59) : CALC-01 (inventaire à jour), CALC-02/03 (matrice de causalité, cohérence
   croisée : changement de mode, rechargement, lien partagé, import, migrations), CALC-05 (boutons, ARIA, clavier),
   CALC-07 (raccords entrants et sortants, empreintes), CALC-08 (sauvegardes), CALC-10 (graphiques, mouvement réduit),
   CALC-12 (une phrase de réponse par outil, vocabulaire). Toutes les données sont des valeurs d'essai. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const H=require('./check-ultime-helper.cjs'),root=H.root,{load}=require('./runtime-helper.cjs');
const B=require(path.join(root,'calculateurs-scenario.js')),E=require(path.join(root,'calculateurs-engine.js'));
const {D,catalogue,sourceActivities,presets}=H.siteData(),DV=H.dataVersion(D,catalogue,sourceActivities),initial=B.initial(DV,presets);
const TOOLS=['goal','purchase','session','budget','order','roi','activities','compare','plan'];
const fire=(p,n,t='click')=>n.dispatchEvent(new p.w.Event(t,{bubbles:true,cancelable:true}));
const clean=p=>{assert.deepEqual(p.errors,[],'aucune erreur JS');};
const stored=p=>JSON.parse(p.w.localStorage.getItem('lk-calculator-v1'));
const page=(url,s,extra={})=>load(root,url,{storage:{...(s?{'lk-calculator-v1':JSON.stringify(s)}:{}),...(extra.storage||{})},...extra});
const base=()=>{const s=H.baseState(B,initial,catalogue);s.dataVersion=DV;return s;};
const sig=s=>B.signature(B.validate(s,initial));

test('CALC-01 : l’inventaire livré est celui que la page produit (outils/calculateur-inventaire.cjs)',async()=>{
 const inv=require('../calculateur-inventaire.cjs');const text=inv.md(await inv.collect());
 assert.equal(fs.readFileSync(path.join(root,'outils/CALCULATEUR-INVENTAIRE.md'),'utf8'),text,'relance node outils/calculateur-inventaire.cjs');
 assert.match(text,/0 erreur|Aucune\./);});

test('CALC-02 / CALC-03 : la matrice de causalité est conforme (outils/calculateur-causalite.cjs, chaque entrée vraiment variée)',async()=>{
 const C=require('../calculateur-causalite.cjs');const ko=[];let n=0;
 for(const tool of TOOLS)for(const [variant,specs] of Object.entries(C.E[tool]))for(const spec of specs){const r=await C.measure(tool,variant,spec);n++;if(r.verdict.length)ko.push(tool+'/'+variant+' '+r.input+' : '+r.verdict.join(' ; '));}
 assert.deepEqual(ko,[],ko.join('\n'));assert.ok(n>=130,n+' lignes mesurées');});

test('CALC-03 : changer de mode (Simple → Pas à pas → Expert → Simple) ne perd aucune valeur, dans les neuf outils',async()=>{
 const s=base();const p=await page('calculateurs.html',s);const d=p.d;
 for(const tool of TOOLS){fire(p,d.getElementById('tab-'+tool));const before=stored(p)||s;const sigBefore=sig(before);
  for(const mode of ['guided','advanced','quick']){fire(p,d.querySelector('.calc-mode-switch [data-mode="'+mode+'"]'));p.flush();assert.equal(d.querySelector('.calc-mode-switch [data-mode="'+mode+'"]').getAttribute('aria-pressed'),'true',tool+' : '+mode+' pressé');assert.equal(d.getElementById('calc-panels').dataset.mode,mode);}
  const after=stored(p);assert.equal(sig(after),sigBefore,tool+' : signature identique après le tour des modes');assert.equal(after.views[tool],'quick');}
 clean(p);p.close();});

test('CALC-03 : recharger la page rend exactement le même état et le même écran',async()=>{
 const s=base();const p=await page('calculateurs.html?tool=compare',s);const d=p.d;
 const cap=d.getElementById('compare-capital');cap.value='333 333';fire(p,cap,'input');const price=d.getElementById('compare-price-0');price.value='275000';fire(p,price,'input');p.flush();
 const saved=p.w.localStorage.getItem('lk-calculator-v1');const zones=H.readZones(d),fields=Object.fromEntries([...d.querySelectorAll('[data-field]:not([type=checkbox])')].map(el=>[el.id||el.dataset.field,el.value]));
 const again=await load(root,'calculateurs.html',{storage:{'lk-calculator-v1':saved}});const d2=again.d;
 assert.equal(d2.querySelector('[data-tab][aria-selected="true"]').dataset.tab,'compare','le dernier outil est rouvert');
 const zones2=H.readZones(d2);for(const k of Object.keys(zones))if(!/^(expert|summary)-/.test(k)&&k!=='live')assert.equal(zones2[k],zones[k],'zone '+k+' identique au rechargement');
 for(const [k,v] of Object.entries(fields)){const el=d2.getElementById(k)||d2.querySelector('[data-field="'+k+'"]');if(el)assert.equal(el.value.replace(/[\s  ]/g,''),String(v).replace(/[\s  ]/g,''),'case '+k+' identique');}
 assert.equal(again.w.localStorage.getItem('lk-calculator-v1'),saved,'rien n’est réécrit au chargement');
 clean(p);clean(again);p.close();again.close();});

test('CALC-03 / CALC-08 : lien partagé (#plan=) et export / import JSON rouvrent exactement le même état ; limites 24 000 caractères et 200 ko',async()=>{
 const s=base();s.name='À partager';const p=await page('calculateurs.html?tool=order',s);const d=p.d;
 const cap=d.getElementById('order-capital');cap.value='123456';fire(p,cap,'input');p.flush();
 let copied=null;p.w.LK.copy=async(text)=>{copied=text;return true;};fire(p,d.getElementById('calc-share'));await new Promise(r=>setTimeout(r,20));
 assert.ok(copied&&copied.includes('#plan='),'lien copié');assert.ok(copied.length<=24000,'lien ≤ 24 000 caractères : '+copied.length);
 const current=stored(p);const hash=new p.w.URL(copied).hash;
 const q=await load(root,'calculateurs.html'+hash,{});assert.equal(sig(stored(q)||current),sig(current),'même signature après le lien');assert.equal(q.d.querySelector('[data-tab][aria-selected="true"]').dataset.tab,'order');assert.match(q.d.getElementById('calc-live').textContent,/Calcul partagé ouvert/);
 const z1=H.readZones(d),z2=H.readZones(q.d);for(const k of ['order','goal','purchase','budget','compare','plan','session','activities','roi'])assert.equal(z2[k],z1[k],'zone '+k+' identique via le lien');
 /* export = JSON de l’état ; import = validate(JSON) */
 const exported=JSON.stringify(current,null,2);assert.ok(Buffer.byteLength(exported)<=200000,'export ≤ 200 ko : '+Buffer.byteLength(exported));
 const imported=B.validate(JSON.parse(exported),initial);assert.equal(B.signature(imported),sig(current),'import = même état');
 for(const tool of TOOLS){const a=B.evaluate(tool,imported,sourceActivities,{catalogue}),b=B.evaluate(tool,current,sourceActivities,{catalogue});assert.equal(JSON.stringify(a),JSON.stringify(b),tool+' : même résultat après import');}
 /* un lien trop long est refusé avec un message, le calcul courant reste */
 const big={...current,name:'x'.repeat(100)};const longHash='#plan='+encodeURIComponent(JSON.stringify({...big,assets:Array(40).fill(big.assets[0]).map((a,i)=>({...a,key:'k'+i,name:'n'.repeat(190)}))}));
 const r=await load(root,'calculateurs.html'+longHash,{storage:{'lk-calculator-v1':JSON.stringify(current)}});assert.match(r.d.getElementById('calc-live').textContent,/Lien invalide|trop long/);assert.equal(sig(stored(r)),sig(current),'le calcul d’avant est gardé');
 clean(p);clean(q);p.close();q.close();r.close();});

test('CALC-03 : une sauvegarde v5 et une v3 migrent sans changer un résultat (mêmes réponses dans les huit calculs)',()=>{
 const v6=base();const asV5={...B.copy(v6),version:5};delete asV5.analysis;delete asV5.modelVersion;asV5.assets.forEach(a=>{delete a.role;delete a.usage;delete a.resale;delete a.capabilities;delete a.requires;delete a.unlocks;});
 const m5=B.validate(asV5,initial);assert.equal(m5.version,6);for(const tool of TOOLS){const a=B.evaluate(tool,m5,sourceActivities,{catalogue}),b=B.evaluate(tool,B.validate(v6,initial),sourceActivities,{catalogue});
  /* l’horizon (analysis) n’existe pas en v5 : seules les réponses qui n’en dépendent pas sont comparées à l’identique */
  if(!['budget','compare','purchase'].includes(tool))assert.equal(JSON.stringify(a),JSON.stringify(b),tool+' : même réponse v5 → v6');else assert.equal(a.valid,b.valid,tool+' : même validité v5 → v6');}
 assert.deepEqual(m5.analysis.horizon,{sessions:null,uses:null,hours:null},'les nouvelles cases valent « pas encore écrit »');
 const asV3={...B.copy(v6),version:3};delete asV3.plan;delete asV3.analysis;delete asV3.modelVersion;asV3.assets.forEach(a=>{delete a.role;delete a.usage;delete a.resale;delete a.capabilities;delete a.requires;delete a.unlocks;delete a.utility;});delete asV3.compare;
 const m3=B.validate(asV3,initial);assert.equal(m3.version,6);assert.equal(m3.plan.situation.capital,v6.goal.capital,'v3 : le plan reçoit une copie des chiffres');assert.equal(B.evaluate('goal',m3,sourceActivities).totalMinutes,B.evaluate('goal',v6,sourceActivities).totalMinutes);});

test('CALC-05 : onglets (aria-selected, flèches, Début, Fin, tabindex), modes (aria-pressed), puces (aria-pressed) exacts',async()=>{
 const p=await page('calculateurs.html',base());const d=p.d,tabs=d.querySelector('.calc-tabs');
 const sel=()=>[...d.querySelectorAll('[data-tab]')].filter(b=>b.getAttribute('aria-selected')==='true').map(b=>b.dataset.tab);
 assert.deepEqual(sel(),['goal']);assert.deepEqual([...d.querySelectorAll('[data-tab]')].map(b=>b.tabIndex),[0,-1,-1,-1,-1,-1,-1,-1,-1],'tabindex : seul l’onglet actif est 0');
 const key=k=>tabs.dispatchEvent(new p.w.KeyboardEvent('keydown',{key:k,bubbles:true,cancelable:true}));
 key('ArrowRight');assert.deepEqual(sel(),['purchase']);key('End');assert.deepEqual(sel(),['plan']);key('ArrowRight');assert.deepEqual(sel(),['goal'],'après le dernier, retour au premier');key('ArrowLeft');assert.deepEqual(sel(),['plan']);key('Home');assert.deepEqual(sel(),['goal']);
 for(const t of TOOLS){fire(p,d.getElementById('tab-'+t));assert.deepEqual(sel(),[t]);assert.equal(d.getElementById('panel-'+t).hidden,false);assert.equal([...d.querySelectorAll('.calc-panel:not([hidden])')].length,1,'un seul panneau visible');assert.equal(d.querySelector('.calc-mode-switch [aria-pressed="true"]').dataset.mode,stored(p)?.views?.[t]||'quick');}
 fire(p,d.getElementById('tab-goal'));const chips=[...d.querySelectorAll('#panel-goal [data-target]')];fire(p,chips[1]);p.flush();assert.deepEqual(chips.map(c=>c.getAttribute('aria-pressed')),['false','true','false','false','false'],'puce 500 k pressée');
 const t=d.getElementById('f-goal-target');t.value='777 777';fire(p,t,'input');p.flush();assert.ok(chips.every(c=>c.getAttribute('aria-pressed')==='false'),'une valeur libre : aucune puce pressée');
 const daily=[...d.querySelectorAll('#panel-goal [data-daily]')];fire(p,daily[3]);p.flush();assert.equal(daily[3].getAttribute('aria-pressed'),'true');assert.equal(d.getElementById('f-goal-dailyMinutes').value,'180');
 clean(p);p.close();});

test('CALC-05 : chaque bouton a un nom, chaque case un libellé, chaque « Modifier / Écrire » vise une case qui existe, dans les neuf outils et les trois modes',async()=>{
 const problems=[];
 for(const tool of TOOLS){const s=tool==='plan'?H.planWithMissions(B,base()):base();s.tab=tool;const p=await page('calculateurs.html?tool='+tool,s);const d=p.d;
  for(const mode of ['quick','guided','advanced']){fire(p,d.querySelector('.calc-mode-switch [data-mode="'+mode+'"]'));p.flush();if(tool==='plan')fire(p,d.querySelector('[data-b-fold-all="open"]'));
   const panel=d.getElementById('panel-'+tool);
   panel.querySelectorAll('button').forEach(b=>{const name=(b.textContent||'').replace(/\s+/g,' ').trim()||b.getAttribute('aria-label')||b.getAttribute('title');if(!name)problems.push(tool+'/'+mode+' : bouton sans nom '+b.outerHTML.slice(0,80));if(b.dataset.bFocus&&!d.getElementById(b.dataset.bFocus))problems.push(tool+'/'+mode+' : « Modifier » vers une case absente '+b.dataset.bFocus);if(b.dataset.open&&!d.getElementById('panel-'+b.dataset.open))problems.push(tool+'/'+mode+' : ouvre un outil absent '+b.dataset.open);});
   panel.querySelectorAll('input:not([type=hidden]),select,textarea').forEach(el=>{const lab=el.id&&d.querySelector('label[for="'+el.id+'"]');if(!lab&&!el.closest('label')&&!el.getAttribute('aria-label'))problems.push(tool+'/'+mode+' : case sans libellé '+(el.id||el.dataset.field||el.outerHTML.slice(0,60)));});
   panel.querySelectorAll('[aria-controls]').forEach(el=>{if(!d.getElementById(el.getAttribute('aria-controls')))problems.push(tool+'/'+mode+' : aria-controls vers un id absent '+el.getAttribute('aria-controls'));});
   panel.querySelectorAll('[aria-expanded]').forEach(el=>{const id=el.getAttribute('aria-controls');if(id&&d.getElementById(id)&&el.getAttribute('aria-expanded')==='true'&&d.getElementById(id).hidden)problems.push(tool+'/'+mode+' : aria-expanded=true mais corps caché '+id);});}
  assert.deepEqual(p.errors,[],tool);p.close();}
 assert.deepEqual(problems,[],problems.join('\n'));});

test('CALC-05 : points repliables, double clic, Entrée en pas à pas, Échap et flèches de la recherche d’achat',async()=>{
 const p=await page('calculateurs.html?tool=goal',base());const d=p.d;
 const head=()=>d.querySelector('[data-fold-head="goal-assumptions"]'),body=()=>d.getElementById('fold-goal-assumptions');
 assert.equal(head().getAttribute('aria-expanded'),'false');assert.equal(body().hidden,true);
 fire(p,head());assert.equal(head().getAttribute('aria-expanded'),'true');assert.equal(body().hidden,false);assert.ok(body().classList.contains('is-anim'),'l’ouverture s’anime (D-01)');
 fire(p,head());assert.equal(head().getAttribute('aria-expanded'),'false');assert.equal(body().hidden,true,'deuxième clic : refermé (pas d’effet double)');
 assert.deepEqual(JSON.parse(p.w.localStorage.getItem('lk-calc-folds-v1')).items,{'goal-assumptions':false});
 /* Pas à pas : Entrée dans une case passe à la question suivante ; la dernière mène à la réponse */
 fire(p,d.querySelector('.calc-mode-switch [data-mode="guided"]'));p.flush();
 const count=()=>d.getElementById('wiz-count').textContent;assert.match(count(),/Question 1 sur 4/);
 const cap=d.getElementById('f-goal-capital');cap.focus();cap.dispatchEvent(new p.w.KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));p.flush();assert.match(count(),/Question 2 sur 4/);
 fire(p,d.querySelector('[data-wiz="prev"]'));p.flush();assert.match(count(),/Question 1 sur 4/);
 for(let i=0;i<3;i++){fire(p,d.querySelector('[data-wiz="next"]'));p.flush();}assert.match(d.querySelector('[data-wiz="next"]').textContent,/Voir ma réponse/);
 fire(p,d.querySelector('[data-wiz="next"]'));p.flush();assert.ok(d.getElementById('goal-results').classList.contains('is-highlighted'),'la réponse est mise en évidence');
 /* recherche d’achat (combobox) : flèches, Entrée, Échap */
 fire(p,d.querySelector('.calc-mode-switch [data-mode="quick"]'));fire(p,d.getElementById('tab-order'));const box=d.getElementById('order-search');box.value='albany';fire(p,box,'input');
 assert.equal(box.getAttribute('aria-expanded'),'true');const list=d.getElementById('order-search-list');assert.ok(list.querySelectorAll('[role=option]').length>=2);
 box.dispatchEvent(new p.w.KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true,cancelable:true}));assert.equal(box.getAttribute('aria-activedescendant'),'order-search-option-0');assert.equal(list.querySelector('[role=option]').getAttribute('aria-selected'),'true');
 box.dispatchEvent(new p.w.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));assert.equal(box.getAttribute('aria-expanded'),'false');assert.equal(list.hidden,true);
 box.value='albany';fire(p,box,'input');box.dispatchEvent(new p.w.KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true,cancelable:true}));const n0=stored(p).order.keys.length;box.dispatchEvent(new p.w.KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));p.flush();
 assert.ok(stored(p).order.keys.length>=n0,'Entrée choisit la suggestion (ou la garde si déjà là)');assert.match(d.getElementById('calc-live').textContent,/sélectionné/);
 clean(p);p.close();});

test('CALC-08 : enregistrer deux fois = une entrée ; copie ; renommer ; dupliquer ; supprimer puis annuler ; « Partir de zéro » puis annuler ; 160 au plus',async()=>{
 const p=await page('calculateurs.html?tool=goal',base());const d=p.d,nb=()=>JSON.parse(p.w.localStorage.getItem('lk-calculator-notebooks-v3'));
 fire(p,d.getElementById('calc-save'));fire(p,d.getElementById('calc-save'));assert.equal(nb().entries.length,1,'deux clics : une seule entrée');
 fire(p,d.querySelector('[data-b-save-copy="goal"]'));assert.equal(nb().entries.length,2,'une copie de plus');
 const id=nb().entries[0].id;fire(p,d.querySelector('[data-saved-open]'));const input=d.getElementById('entry-'+id);assert.ok(input);input.value='Mon calcul renommé';fire(p,input,'change');assert.equal(nb().entries.find(e=>e.id===id).name,'Mon calcul renommé');
 fire(p,d.querySelector('[data-b-duplicate="'+id+'"]'));assert.equal(nb().entries.length,3);assert.match(nb().entries[0].name,/copie/);
 fire(p,d.querySelector('[data-b-delete="'+id+'"]'));assert.equal(nb().entries.length,2);assert.ok(d.querySelector('[data-b-notebook-undo]'),'annulation proposée');fire(p,d.querySelector('[data-b-notebook-undo]'));assert.equal(nb().entries.length,3,'supprimé puis annulé');
 /* zéro puis annuler */
 const before=stored(p);fire(p,d.querySelector('[data-calc-zero]'));assert.equal(stored(p).goal.capital,null,'tout à zéro');assert.equal(nb().entries.length,3,'les enregistrements ne bougent pas');assert.equal(d.getElementById('calc-undo').hidden,false);fire(p,d.getElementById('calc-undo'));assert.equal(sig(stored(p)),sig(before),'annulé : le calcul d’avant est revenu');
 /* 160 au plus */
 const bundle=nb();const many={...bundle,entries:Array.from({length:160},(_,i)=>({...bundle.entries[0],id:'e'+i,name:'E'+i}))};
 const q=await page('calculateurs.html?tool=goal',base(),{storage:{'lk-calculator-notebooks-v3':JSON.stringify(many)}});fire(q,q.d.querySelector('[data-b-save-copy="goal"]'));assert.match(q.d.getElementById('calc-live').textContent,/160 enregistrements/);assert.equal(JSON.parse(q.w.localStorage.getItem('lk-calculator-notebooks-v3')).entries.length,160);
 clean(p);clean(q);p.close();q.close();});

test('CALC-08 : stockage indisponible (mode privé strict) : message honnête, calcul, export et copie d’adresse utilisables',async()=>{
 const p=await load(root,'calculateurs.html',{before:w=>{const broken={getItem(){throw new p_err();},setItem(){throw new p_err();},removeItem(){throw new p_err();},key(){return null;},get length(){return 0;}};function p_err(){const e=new Error('QuotaExceeded');return e;}Object.defineProperty(w,'localStorage',{value:broken,configurable:true});}});
 const d=p.d;const cap=d.getElementById('f-goal-capital');cap.value='250000';fire(p,cap,'input');p.flush();
 assert.match(d.getElementById('calc-live').textContent,/Impossible d’enregistrer|ne garde rien/,'le visiteur est prévenu');assert.match(d.getElementById('goal-results').textContent,/Il te manque/,'le calcul marche quand même');
 let copied=null;p.w.LK.copy=async(t)=>{copied=t;return true;};fire(p,d.getElementById('calc-share'));await new Promise(r=>setTimeout(r,20));assert.ok(copied&&copied.includes('#plan='),'le lien se copie sans stockage');
 const clicks=[];p.w.HTMLAnchorElement.prototype.click=function(){clicks.push(this.download);};fire(p,d.getElementById('calc-export'));assert.deepEqual(clicks,['leonidakit-calcul.json'],'le téléchargement part');
 p.close();});

test('CALC-07 : chaque point d’entrée ouvre le bon outil avec les bonnes valeurs ; « from » n’a pas d’effet caché ; les paramètres incorrects sont ignorés avec explication ; l’adresse est nettoyée après une modification',async()=>{
 const veh=H.VEHICLES[0],item=catalogue.find(x=>x.id===veh),biz=catalogue.find(x=>x.type==='business');
 const cases=[
  ['calculateurs.html?tool=goal&target=1000000&from=home#atelier',s=>{assert.equal(s.tab,'goal');assert.equal(s.goal.target,1000000);}],
  ['calculateurs.html?tool=goal&capital=200000&target=1500000&hourly=80000&from=home#atelier',s=>{assert.equal(s.goal.capital,200000);assert.equal(s.goal.target,1500000);assert.equal(s.goal.hourly,80000);assert.equal(s.model,'continuous');}],
  ['calculateurs.html?tool=session&minutes=30&from=home#atelier',s=>{assert.equal(s.tab,'session');assert.equal(s.session.minutes,30);assert.equal(s.goal.dailyMinutes,initial.goal.dailyMinutes,'minutes ne touche que Mon temps de jeu');}],
  ['calculateurs.html?tool=purchase&type=vehicules&id='+veh+'&from=fiche#atelier',s=>{assert.equal(s.tab,'purchase');const a=B.asset(s,s.purchase.key);assert.equal(a.itemId,veh);assert.equal(a.price,null,'prix inconnu : reste inconnu, jamais 0');}],
  ['calculateurs.html?tool=purchase&type=vehicules&ids='+H.VEHICLES.join(',')+'&from=catalogue#atelier',s=>{assert.deepEqual(s.catalogue.compareIds,H.VEHICLES);}],
  ['calculateurs.html?tool=compare&ids='+H.VEHICLES.join(',')+'&from=comparateur#atelier',s=>{assert.equal(s.tab,'compare');assert.equal(s.compare.keys.length,2);}],
  ['calculateurs.html?tool=order&type=vehicle&ids='+H.VEHICLES.join(',')+'&from=carnet#atelier',s=>{assert.equal(s.tab,'order');assert.equal(s.order.keys.length,2);assert.ok(s.order.keys.every(k=>B.asset(s,k).price===null),'prix inconnus');}],
  ['calculateurs.html?tool=budget&achats=Tenue%20noire%7CCasquette&from=carnet#atelier',s=>{assert.equal(s.tab,'budget');assert.equal(s.budget.source,'basket');assert.equal(s.order.keys.length,2);assert.ok(s.order.keys.every(k=>B.asset(s,k).price===null&&!B.asset(s,k).itemId));}],
  ['calculateurs.html?tool=roi&type=business&id='+biz.id+'&from=fiche#atelier',s=>{assert.equal(s.tab,'roi');assert.equal(B.asset(s,s.roi.key).itemId,biz.id);assert.equal(s.roi.mode,'estimate','une entreprise importée n’est pas présumée exploitable');assert.equal(B.asset(s,s.roi.key).price,null);}],
  ['calculateurs.html?tool=plan&from=home#atelier',s=>{assert.equal(s.tab,'plan');}],
  ['calculateurs.html?tool=plan&capital=50000&target=400000&minutes=45',s=>{assert.equal(s.plan.situation.capital,50000);assert.equal(s.plan.goal.target,400000);assert.equal(s.plan.goal.kind,'amount');assert.equal(s.plan.situation.dailyMinutes,45);assert.equal(s.goal.capital,initial.goal.capital,'le plan ne touche pas aux huit calculs');}],
  ['calculateurs.html?tool=goal&mode=expert&from=tuto&chapter=modes#atelier',s=>{assert.equal(s.views.goal,'advanced');}],
 ];
 for(const [url,check] of cases){const p=await load(root,url,{});const s=stored(p)||(()=>{const d=p.d;const cap=d.querySelector('.calc-panel:not([hidden]) input[data-field]');cap.value=cap.value||'1';fire(p,cap,'input');return stored(p);})();check(s);assert.deepEqual(p.errors,[],url);p.close();}
 /* from= sans effet caché : même état avec ou sans */
 const a=await load(root,'calculateurs.html?tool=purchase&type=vehicules&id='+veh,{}),b=await load(root,'calculateurs.html?tool=purchase&type=vehicules&id='+veh+'&from=fiche',{});
 const touch=p=>{const el=p.d.getElementById('f-purchase-capital');el.value='200000';fire(p,el,'input');return stored(p);};assert.equal(sig(touch(a)),sig(touch(b)),'from=fiche ne change rien à l’état');a.close();b.close();
 /* paramètres incorrects */
 const bad=await load(root,'calculateurs.html?tool=goal&capital=abc&target=-5&mode=magique&type=licorne&id=inexistant',{});assert.match(bad.d.getElementById('calc-live').textContent,/ignoré|n’existe plus|n’existe pas/);const el=bad.d.getElementById('f-goal-capital');assert.equal(el.value.replace(/[\s\u00a0\u202f]/g,''),String(initial.goal.capital),'capital illisible : la valeur d’avant reste');bad.close();
 const place=catalogue.find(x=>x.type==='place');const pl=await load(root,'calculateurs.html?tool=purchase&type=lieux&id='+place.id,{});assert.match(pl.d.getElementById('calc-live').textContent,/pas un achat|ne s’achète pas/);pl.close();
 /* l’adresse est nettoyée après une modification (pas d’écrasement au rechargement) */
 const c=await load(root,'calculateurs.html?tool=goal&capital=200000&target=1500000&from=home#atelier',{});const cap=c.d.getElementById('f-goal-capital');cap.value='999';fire(c,cap,'input');assert.equal(c.w.location.search,'','paramètres retirés');assert.equal(c.w.location.hash,'#atelier');c.close();
 const t=await load(root,'calculateurs.html?tool=goal&mode=simple&from=tuto&chapter=objectif#atelier',{});const cap2=t.d.getElementById('f-goal-capital');cap2.value='999';fire(t,cap2,'input');assert.match(t.w.location.search,/from=tuto&chapter=objectif&tool=goal&mode=simple/,'le retour vers le Tuto est gardé, sans chiffre');assert.equal(t.d.getElementById('calc-tuto-return').hidden,false);assert.equal(t.d.getElementById('calc-tuto-return').getAttribute('href'),'tuto.html#objectif');t.close();});

test('CALC-07 : chaque lien sortant du calculateur (panneaux rendus, Tuto, fiches, comparateur, progression) mène à une page et une ancre qui existent',async()=>{
 const s=H.planWithMissions(B,base());const p=await page('calculateurs.html',s);const d=p.d;const hrefs=new Set();
 for(const tool of TOOLS){fire(p,d.getElementById('tab-'+tool));fire(p,d.querySelector('.calc-mode-switch [data-mode="advanced"]'));p.flush();d.querySelectorAll('#atelier a[href], main a[href]').forEach(a=>hrefs.add(a.getAttribute('href')));}
 const missing=[];for(const h of hrefs){if(/^(https?:|mailto:|javascript:)/.test(h))continue;const [file,anchor]=h.split('#');const f=file?path.join(root,file.replace(/^\//,'').split('?')[0]):path.join(root,'calculateurs.html');if(!fs.existsSync(f)){missing.push(h+' (fichier absent)');continue;}if(anchor&&!/^plan=/.test(anchor)){const html=fs.readFileSync(f,'utf8');if(!html.includes('id="'+anchor+'"')&&!/^(atelier|saved-calcs|saved-plans)$/.test(anchor))missing.push(h+' (ancre absente)');}}
 assert.deepEqual(missing,[],missing.join('\n'));assert.ok(hrefs.size>=10,hrefs.size+' liens relevés');
 const tuto=fs.readFileSync(path.join(root,'tuto.html'),'utf8');for(const ch of ['demarrer','modes','objectif','activites','temps','achats','comparateur','choisir','ordre','rentabilite','budget','carnets','plan','sources','faq'])assert.ok(tuto.includes('id="'+ch+'"'),'chapitre du Tuto : '+ch);
 clean(p);p.close();});

test('CALC-07 : fiches.js charge calculator-entry.css avec l’empreinte de la feuille, et jamais deux fois',()=>{
 const js=fs.readFileSync(path.join(root,'fiches.js'),'utf8'),css=fs.readFileSync(path.join(root,'calculator-entry.css'));
 const v=crypto.createHash('sha256').update(css).digest('hex').slice(0,12);assert.ok(js.includes('calculator-entry.css?v='+v),'empreinte posée par sync-site : '+v);assert.ok(!js.includes('calculator-entry.css?v=20260921'),'plus d’empreinte écrite à la main');
 assert.ok(js.includes('link[rel="stylesheet"][href*="calculator-entry.css"]'),'la feuille déjà chargée par la page est détectée');});

test('CALC-10 : chaque graphique a son tableau des valeurs et des points au clavier ; en mouvement réduit, les compteurs montrent la valeur finale tout de suite',async()=>{
 const s=base();s.views.goal='advanced';s.views.plan='advanced';s.plan=H.planWithMissions(B,s).plan;s.plan.log=[{id:'l1',at:'2026-09-20T10:00:00.000Z',capital:150000,minutes:90,forecast:160000,note:'',units:null,unitsGain:null,gain:50000,plannedGain:60000,sessionMinutes:90,runs:{},purchases:[]}];
 const p=await page('calculateurs.html?tool=plan',s,{storage:{'lk-calc-folds-v1':JSON.stringify({all:true})},before:w=>{w.matchMedia=q=>({matches:/reduce/.test(q),media:q,addEventListener(){},removeEventListener(){},addListener(){},removeListener(){}});}});
 const d=p.d;const charts=[...d.querySelectorAll('.c-chart[data-c-chart]')];assert.ok(charts.length>=1,'au moins un graphique dans le plan en Expert');
 for(const fig of charts){assert.ok(fig.querySelector('svg[role="img"]'),fig.dataset.cChart+' : image nommée');assert.ok(fig.querySelector('.c-chart-data, table'),fig.dataset.cChart+' : tableau des valeurs');const pts=fig.querySelectorAll('.c-chart-point');if(pts.length)assert.ok([...pts].some(pt=>pt.getAttribute('tabindex')==='0'||pt.getAttribute('role')==='button'),fig.dataset.cChart+' : points au clavier');}
 assert.equal(d.querySelector('.calculator-page').dataset.cMotion,'off','mouvement réduit : animations coupées');
 fire(p,d.getElementById('tab-goal'));p.flush();const main=d.querySelector('#goal-results .calc-result-main');assert.ok(main);const overlay=main.querySelector('[data-display]');if(overlay)assert.equal(overlay.dataset.display,main.textContent.replace(overlay.textContent,'').trim()||overlay.dataset.display,'la valeur finale est affichée sans attendre');
 assert.match(main.textContent,/h|min|C’est bon/,'la vraie valeur est dans le DOM');
 clean(p);p.close();});

test('CALC-12 : une phrase de réponse (.calc-answer) par outil, dans les trois modes ; pas de jargon dans les réponses',async()=>{
 const s=H.planWithMissions(B,base());const p=await page('calculateurs.html',s);const d=p.d;const jargon=/\b(ROI|amortissement|trésorerie|hypothèse|scénario|capital)\b/i;const found=[];
 for(const tool of TOOLS){fire(p,d.getElementById('tab-'+tool));for(const mode of ['quick','guided','advanced']){fire(p,d.querySelector('.calc-mode-switch [data-mode="'+mode+'"]'));p.flush();const res=d.getElementById(({activities:'inverse-results'})[tool]||tool+'-results');const ans=res.querySelector('.calc-answer');assert.ok(ans&&ans.textContent.trim().length>10,tool+'/'+mode+' : une phrase de réponse');
   const t=ans.textContent;if(jargon.test(t))found.push(tool+'/'+mode+' : '+t.slice(0,80));}}
 assert.deepEqual(found,[],found.join('\n'));clean(p);p.close();});
