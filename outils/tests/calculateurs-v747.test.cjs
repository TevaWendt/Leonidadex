'use strict';
/* v7.47 (lot 10) : « Mes calculs enregistrés » (tiroir, badge, cartes, comparaison, rappel), carnet de
   « Quel achat choisir ? » gardé au rechargement, Pas à pas de « Mes activités », messages en mots simples.
   Le vrai HTML du calculateur et ses scripts tournent dans JSDOM ; la mise en page est vérifiée par
   outils/tests/calculateurs-parcours-browser.cjs dans un vrai navigateur. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM,VirtualConsole}=require('jsdom');
const root=path.resolve(__dirname,'../..');
const scripts=['calculateurs-data.js','calculateurs-engine.js','calculateurs-scenario.js','calculateurs-notebooks.js','calculateurs-visuals.js','calculateurs-workspace.js','calculateurs-plan.js','calculateurs.js'].map(f=>[f,fs.readFileSync(path.join(root,f),'utf8')]);
const opened=[];
test.afterEach(()=>{for(const p of opened.splice(0)){const errors=p.errors.slice();p.close();assert.deepEqual(errors,[],'aucune erreur de script');}});
function app(storage={}){const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
 const dom=new JSDOM(fs.readFileSync(path.join(root,'calculateurs.html'),'utf8'),{url:'https://www.leonidakit.com/calculateurs.html',runScripts:'outside-only',virtualConsole:vc});const w=dom.window,d=w.document;opened.push({errors,close:()=>w.close()});
 w.LK_VEHICULES=[{id:'kamacho',nom:'Kamacho'},{id:'bati',nom:'Bati 801'}];w.LK_ARMES=[];w.LK_ACTIVITIES=[];w.LK_CALCULATEURS_CATALOGUE={entries:[],weaponImages:{}};
 w.LK={esc:v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]),status(){},async copy(){return true;}};
 w.matchMedia=()=>({matches:true});w.HTMLElement.prototype.scrollIntoView=function(){};w.scrollTo=()=>{};w.setTimeout=()=>0;w.clearTimeout=()=>{};w.requestAnimationFrame=cb=>{cb();return 0;};w.confirm=()=>true;
 w.localStorage.setItem('lk-calc-folds-v1',JSON.stringify({all:true}));for(const [k,v] of Object.entries(storage))w.localStorage.setItem(k,v);
 for(const [f,code] of scripts)w.eval(code+'\n//# sourceURL='+f);
 const $=id=>{const el=d.getElementById(id);assert.ok(el,'#'+id);return el;};
 const fire=(el,type)=>el.dispatchEvent(new w.Event(type,{bubbles:true,cancelable:true}));
 const click=sel=>{const el=typeof sel==='string'?d.querySelector(sel):sel;assert.ok(el,'élément '+sel);fire(el,'click');};
 const type=(id,v)=>{const el=$(id);el.value=String(v);fire(el,'input');};
 const store=()=>Object.fromEntries(Object.keys(w.localStorage).map(k=>[k,w.localStorage.getItem(k)]));
 const text=id=>$(id).textContent.replace(/[  ]/g,' ');
 return {w,d,$,fire,click,type,store,text};}
test('Badge « Mes calculs » : le nombre suit chaque enregistrement, en haut et en bas de l’atelier',()=>{
 const p=app();const badges=()=>[...p.d.querySelectorAll('[data-saved-open] [data-saved-count]')].map(x=>x.textContent);
 assert.deepEqual(badges(),['0','0']);p.click('#calc-save');assert.deepEqual(badges(),['1','1']);
 p.click('[data-tab="session"]');p.click('#calc-save-bottom');assert.deepEqual(badges(),['2','2']);
 p.click('[data-tab="plan"]');p.click('#calc-save');assert.deepEqual(badges(),['3','3']);
 assert.equal(p.d.querySelector('[data-saved-count="calcs"]').textContent,'2');assert.equal(p.d.querySelector('[data-saved-count="plans"]').textContent,'1');
 assert.match(p.$('calc-saved-open').getAttribute('aria-label'),/Mes calculs enregistrés\s:\s2\scalculs et 1\sbusiness plan/);});
test('Tiroir : s’ouvre d’un clic depuis n’importe quel outil, sur la bonne liste, et se ferme',()=>{
 const p=app();p.click('[data-tab="roi"]');p.click('#calc-saved-open');assert.ok(p.$('calc-drawer').open,'ouvert depuis Ça vaut le coup ?');
 assert.equal(p.$('saved-calcs').hidden,false);assert.equal(p.$('saved-plans').hidden,true);assert.match(p.text('saved-now'),/EN CE MOMENT · ÇA VAUT LE COUP/);
 p.click('[data-drawer-close]');assert.equal(p.$('calc-drawer').open,false);
 p.click('[data-tab="plan"]');p.click('.calc-plan-toolbar [data-saved-open]');assert.ok(p.$('calc-drawer').open,'ouvert depuis le bas de l’atelier');assert.equal(p.$('saved-plans').hidden,false,'depuis le business plan, la liste des plans');
 p.click('[data-drawer-view="calcs"]');assert.equal(p.$('saved-calcs').hidden,false);assert.equal(p.d.querySelector('[data-drawer-view="calcs"]').getAttribute('aria-pressed'),'true');});
test('Carte : nom, outil, date, réponse en une ligne et trois chiffres clés ; les calculs les plus récents d’abord',()=>{
 const p=app();p.type('calc-name','Mon objectif témoin');p.click('#calc-save');
 const card=p.d.querySelector('#saved-list .b-notebook-entry[data-tool="goal"]'),t=card.textContent.replace(/[  ]/g,' ');
 assert.equal(card.querySelector('[data-b-rename]').value,'Mon objectif témoin');assert.match(t,/Mon objectif/);assert.match(t,/Enregistré le \d{1,2}(er)? [a-zéû]+\.? \d{4} à \d{1,2} h \d{2}/);
 assert.match(t,/Temps de jeu pour mon objectif\s*8 h/);assert.match(t,/J’ai 200 000 \$/);assert.match(t,/Je veux 1 000 000 \$/);assert.match(t,/Je gagne 100 000 \$ par heure/);
 for(const label of ['Ouvrir','Voir la fiche','Renommer','Dupliquer','Supprimer'])assert.ok([...card.querySelectorAll('button')].some(b=>b.textContent===label),label);
 assert.ok(card.querySelector('[data-b-pick]'),'case « Comparer »');
 p.click('[data-tab="budget"]');p.click('#calc-save');assert.equal(p.d.querySelector('#saved-list .b-notebook-entry').dataset.tool,'budget','le plus récent en haut');});
test('Quel achat choisir ? : le calcul enregistré revient après rechargement (il disparaissait avant la v7.47)',()=>{
 const p=app();p.click('[data-tab="compare"]');p.type('calc-name','Choix témoin');p.click('#calc-save');const saved=p.store();
 const again=app(saved);assert.equal(again.d.querySelectorAll('#saved-list .b-notebook-entry[data-tool="compare"]').length,1);assert.doesNotMatch(again.text('calc-live'),/illisible/);});
test('Comparer deux calculs : phrase claire, tableau côte à côte, lignes différentes marquées',()=>{
 const p=app();p.type('calc-name','Normal');p.click('#calc-save');p.type('f-goal-hourly','80000');p.type('calc-name','Prudent');p.click('#calc-saved-open');p.click('#saved-now [data-b-save-copy]');
 const picks=[...p.d.querySelectorAll('#saved-list [data-b-pick]')];assert.equal(picks.length,2);
 picks[0].checked=true;p.fire(picks[0],'change');assert.match(p.text('saved-pick'),/1 calcul coché/);
 picks[1].checked=true;p.fire(picks[1],'change');assert.match(p.text('saved-pick'),/2 calculs cochés/);p.click('[data-b-compare-go]');
 assert.equal(p.$('saved-compare').hidden,false);assert.equal(p.$('saved-calcs').hidden,true);
 assert.match(p.text('saved-compare'),/Le n° 2 « Normal » demande 2 h de jeu en moins\./);
 const diff=[...p.d.querySelectorAll('#saved-compare tr.is-diff th')].map(th=>th.textContent);assert.ok(diff.some(x=>/La réponse/.test(x)));assert.ok(diff.some(x=>/Je gagne par heure/.test(x)));
 assert.ok(!diff.some(x=>/J’ai déjà/.test(x)),'les chiffres pareils ne sont pas marqués');
 p.click('[data-b-compare-back]');assert.equal(p.$('saved-compare').hidden,true);assert.equal(p.$('saved-calcs').hidden,false);
 // un troisième coché remplace le plus ancien
 p.click('[data-tab="session"]');p.click('#calc-save');const all=[...p.d.querySelectorAll('#saved-list [data-b-pick]')];const third=all.find(i=>!i.checked);third.checked=true;p.fire(third,'change');assert.equal(p.d.querySelectorAll('#saved-list [data-b-pick]:checked').length,2);});
test('Renommer, dupliquer, supprimer puis annuler : le carnet v3 suit',()=>{
 const p=app();p.click('#calc-save');const id=p.d.querySelector('#saved-list .b-notebook-entry').dataset.entry;
 p.click('[data-b-rename-focus="'+id+'"]');const input=p.$('entry-'+id);assert.equal(p.d.activeElement,input);input.value='Nouveau nom';p.fire(input,'change');
 assert.equal(JSON.parse(p.store()['lk-calculator-notebooks-v3']).entries[0].name,'Nouveau nom');
 p.click('[data-b-duplicate="'+id+'"]');assert.equal(p.d.querySelectorAll('#saved-list .b-notebook-entry').length,2);
 p.click('[data-b-delete="'+id+'"]');assert.equal(p.d.querySelectorAll('#saved-list .b-notebook-entry').length,1);assert.ok(p.d.querySelector('#saved-list [data-b-notebook-undo]'));
 p.click('[data-b-notebook-undo]');assert.equal(p.d.querySelectorAll('#saved-list .b-notebook-entry').length,2);});
test('Rappel discret : seulement quand on quitte un calcul changé et pas enregistré',()=>{
 const p=app();const box=p.$('calc-reminder');p.click('[data-tab="session"]');assert.equal(box.hidden,true,'rien changé : pas de rappel');
 p.click('[data-tab="goal"]');p.type('f-goal-capital','300000');p.click('[data-tab="roi"]');assert.equal(box.hidden,false);assert.match(p.text('calc-reminder'),/« Mon objectif » n’est pas enregistré/);
 p.click('#calc-reminder [data-b-save="goal"]');assert.equal(box.hidden,true);assert.equal(JSON.parse(p.store()['lk-calculator-notebooks-v3']).entries[0].tool,'goal');
 p.click('[data-tab="goal"]');p.click('[data-tab="budget"]');assert.equal(box.hidden,true,'enregistré : pas de rappel');
 p.type('budget-capital','123456');p.click('[data-tab="goal"]');assert.equal(box.hidden,false);p.click('[data-reminder-close]');assert.equal(box.hidden,true,'« Plus tard » ferme le rappel');});
test('Liens vers le tiroir : #saved-calcs et #saved-plans (Progression, Léo) l’ouvrent sur la bonne liste',()=>{
 const url=(hash)=>{const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));const dom=new JSDOM(fs.readFileSync(path.join(root,'calculateurs.html'),'utf8'),{url:'https://www.leonidakit.com/calculateurs.html'+hash,runScripts:'outside-only',virtualConsole:vc});const w=dom.window;opened.push({errors,close:()=>w.close()});
  w.LK_VEHICULES=[];w.LK_ARMES=[];w.LK_ACTIVITIES=[];w.LK_CALCULATEURS_CATALOGUE={entries:[],weaponImages:{}};w.LK={esc:v=>String(v??''),status(){},async copy(){return true;}};w.matchMedia=()=>({matches:true});w.HTMLElement.prototype.scrollIntoView=function(){};w.scrollTo=()=>{};w.requestAnimationFrame=cb=>{cb();return 0;};
  for(const [f,code] of scripts)w.eval(code);return w.document;};
 const plans=url('#saved-plans');assert.ok(plans.getElementById('calc-drawer').open);assert.equal(plans.getElementById('saved-plans').hidden,false);
 const calcs=url('#saved-calcs');assert.ok(calcs.getElementById('calc-drawer').open);assert.equal(calcs.getElementById('saved-calcs').hidden,false);});
test('Mes activités : quatre questions en Pas à pas, comme les autres outils',()=>{
 const p=app();const steps=[...p.d.querySelectorAll('#panel-activities .calc-step[data-step]')].map(s=>s.dataset.question);
 assert.deepEqual(steps,['Quelle activité veux-tu refaire ?','Combien de temps as-tu ?','Tu joues seul ou à plusieurs ?','Combien d’argent as-tu ?'].map(x=>x.replace(/ \?/,' ?')));
 assert.equal(p.d.querySelectorAll('#panel-activities .calc-show-answer').length,1,'un seul bouton « Voir ma réponse »');});
test('Mots simples : plus de « capital », « moteur », « sensibilité » ni de clé technique dans les réponses et réglages',()=>{
 const p=app();for(const t of ['goal','purchase','session','budget','order','roi','activities','compare']){p.click('[data-tab="'+t+'"]');p.click('.calc-mode-switch [data-mode="advanced"]');
  const txt=p.$('panel-'+t).textContent;for(const word of [/\bcapital\b/i,/\bmoteur\b/i,/Sensibilité/,/Résultats bruts/,/Revenu net/,/\bHorizon\b/,/Prérequis/])assert.doesNotMatch(txt,word,t+' : '+word);
  const keys=[...p.$('panel-'+t).querySelectorAll('th,td')].map(c=>c.textContent.trim()).filter(x=>/^[a-z]+[A-Z][A-Za-z]*$/.test(x));assert.deepEqual(keys,[],t+' : aucune clé technique dans les tableaux');}
 const E=p.w.LKCalcEngine;const r=E.goalContinuous({capital:-5,target:10,hourly:1,reserve:0,dailyMinutes:60});assert.equal(r.valid,false);assert.match(r.reason,/^Ce que tu as doit être un nombre égal à 0 ou plus/);});
test('Doublons (décision de Téva, 29/09/2026) : les copies inutiles sont retirées, les voisins utiles ont chacun leur nom',()=>{
 const p=app();const all=sel=>[...p.d.querySelectorAll(sel)];const label=el=>el.textContent.replace(/[\u00a0\u202f]/g,' ').replace(/\s+/g,' ').trim();
 /* « Partir de zéro » : un seul bouton, dans l’atelier, à côté de « Remettre les exemples » ; le tiroir ne garde que les calculs */
 assert.equal(all('button').filter(b=>label(b)==='Partir de zéro').length,1);assert.ok(p.$('calc-reset').closest('.calc-data-note'));
 assert.equal(label(p.$('calc-reset')),'Remettre les exemples');assert.equal(p.d.getElementById('calc-zero'),null);assert.doesNotMatch(label(p.$('calc-drawer')),/Recommencer/);
 p.type('f-goal-capital',123456);p.click('[data-calc-zero]');assert.ok(!/123/.test(p.$('f-goal-capital').value));p.click('#calc-reset');assert.equal(p.$('f-goal-capital').value.replace(/\D/g,''),'200000');
 /* business plan : plus de boutons Enregistrer / Imprimer en double ; le téléchargement en texte (autre fonction) reste, sous un nom clair */
 p.click('[data-tab="plan"]');const plan=label(p.$('panel-plan'));assert.doesNotMatch(plan,/Imprimer mon plan|Enregistrer mon plan \(avec sa fiche\)/);assert.match(plan,/Télécharger mon plan en texte/);
 assert.equal(label(p.$('calc-save')),'☆ Enregistrer le plan');
 assert.equal(p.d.querySelector('[data-b-plan-details]'),null,'plus de case « Afficher plus de détails » (même contenu que le mode Expert)');assert.ok(p.d.querySelector('#plan-report [data-b-mode="advanced"]'));assert.doesNotMatch(label(p.$('panel-plan')),/réserve/);
 /* Expert : un seul nom (« mode Expert ») ; plus de bouton « Voir les réglages avancés » qui doublait le choix du mode */
 p.click('[data-tab="goal"]');assert.equal(all('.b-simple-action').length,0);assert.doesNotMatch(label(p.$('calc-panels')),/[Rr]églages avancés/);assert.match(label(p.$('mode-summary-goal')),/Mode Expert : rien de changé/);
 /* Mon objectif : le « Et si » ±20 % n’est plus en double (il reste dans le mode Expert) ; la comparaison des activités a son propre nom */
 assert.equal(p.d.getElementById('goal-sensitivity'),null);assert.match(label(p.$('panel-goal')),/Avec quelle activité j’arrive le plus vite à mon objectif \?/);assert.doesNotMatch(label(p.$('panel-goal')),/Trois chemins|Et si je gagne plus/);
 /* tableau des activités du jeu : plus de colonnes vides (« À relever ») */
 const head=all('#activites-gains thead th').map(label);assert.deepEqual(head,['Activité','Ce qu’il faut avant','Où on l’a vue']);assert.doesNotMatch(label(p.$('activites-gains')),/À relever/);
});
