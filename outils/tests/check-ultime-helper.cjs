'use strict';
/* Check ultime du calculateur (v7.59) : aides communes aux scripts et tests.
   - données du site chargées dans un contexte Node (comme la page) ;
   - état de base « riche » (tous les outils ont une réponse valide), construit sur le scénario v6 ;
   - lecture des zones de sortie d'une page jsdom ;
   - générateur pseudo-aléatoire déterministe (tests de propriétés).
   Aucun chiffre ici n'est un prix ou un gain de GTA VI : ce sont des valeurs d'essai. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..');
function siteData(){const ctx={window:{}};vm.createContext(ctx);for(const f of ['vehicules-data.js','armes-data.js','acquisitions-data.js','calculateurs-catalogue.js','calculateurs-activites.js','calculateurs-data.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx);const D=ctx.window.LKCalcData;return {D,catalogue:D.catalogue(),sourceActivities:D.activities(),presets:JSON.parse(JSON.stringify(D.presets))};}
/* Empreinte des données, calculée comme dans calculateurs.js (dataVersion) : une sauvegarde faite avec cette empreinte ne déclenche pas « les données ont changé ». */
/* v7.60 : empreinte des seules données de calcul (même formule que calculateurs.js), identique dans toutes les langues ;
   legacyDataVersion = l'ancienne formule (libellés compris), toujours reconnue. */
const fnv=str=>{let h=2166136261;for(const c of str){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return (h>>>0).toString(16);};
const FP_KEYS=['id','type','price','fieldMeta','purchasable','purchaseCandidate','evidenceLevel','activityIds','categoryId','status','verifiedAt','speed','acceleration','seats'];
function dataVersion(D,catalogue,sourceActivities){return 'schema'+D.meta.schemaVersion+'-'+fnv(JSON.stringify([catalogue.map(e=>FP_KEYS.map(k=>e[k]===undefined?null:e[k])),sourceActivities.map(({name,source,note,...a})=>a)]));}
function legacyDataVersion(D,catalogue,sourceActivities){return 'schema'+D.meta.schemaVersion+'-'+fnv(JSON.stringify([catalogue.map(({imageFallback,schemaImage,...e})=>e),sourceActivities]));}
const VEHICLES=['albany-emperor','albany-primo'];
/* État de base : tous les outils répondent ; les achats partagés sont deux véhicules du site (prix personnels) et un achat libre. */
function baseState(B,initial,catalogue){
 const s=B.copy(initial);s.name='Check ultime';s.tab='goal';s.model='continuous';
 s.goal={...s.goal,capital:200000,target:1000000,hourly:100000,reserve:20000,dailyMinutes:60,players:1,selected:'scenario-a',meaning:'available',plannedSpend:null,upkeepPerSession:null,deadlineDays:null};
 s.session={...s.session,minutes:60,usualMinutes:60,daysPerWeek:5,maxRepeat:100,enabled:['scenario-a','scenario-b','scenario-c']};s.inverse={minutes:60,selected:'scenario-a'};
 const items=VEHICLES.map(id=>catalogue.find(x=>x.id===id)).filter(Boolean);if(items.length<2)throw Error('Véhicules de base introuvables dans le catalogue : '+VEHICLES.join(', '));
 s.assets=[{...B.copy(B.assetTemplate),key:'free-1',itemId:'',name:'Mon achat libre',price:100000,referencePrice:null,extras:0,fees:0,utility:3}];
 items.forEach((item,i)=>{s.assets.push({...B.copy(B.assetTemplate),key:item.id,itemId:item.id,name:item.name,price:[250000,400000][i],referencePrice:item.price,extras:0,fees:0,utility:[4,2][i],incomeMode:i===0?'personal':'none',boostHourly:i===0?5000:0});});
 s.purchase={key:'free-1'};s.order={keys:items.map(x=>x.id),objective:'all'};s.budget={source:'manual',extra:5000,allocations:[50000,60000,20000,10000,0]};
 s.compare={keys:items.map(x=>x.id),criterion:'value',hours:10};s.roi={...s.roi,key:'free-1',mode:'continuous',activityIds:[],hours:10,revenueHourly:20000,costHourly:2000,gainPercent:20,durationReduction:0,recoveryActivity:'',compareKey:''};
 s.analysis=B.copy(B.analysisTemplate);s.analysis.horizon.sessions=10;
 s.plan=B.copy(B.planTemplate);s.plan.goal={...s.plan.goal,kind:'amount',target:500000,meaning:'available'};s.plan.situation={capital:100000,reserve:0,hourly:50000,unitsHourly:0,dailyMinutes:60,daysPerWeek:5,upkeepPerSession:0,players:1};s.plan.source='hourly';
 s.views=Object.fromEntries([...B.tools,'plan'].map(t=>[t,'quick']));s.mode='quick';
 return B.validate(s,initial);}
/* Variante « missions » du plan : trois missions copiées des exemples, un achat d'avant, un but d'achat. */
function planWithMissions(B,s){const c=B.copy(s);c.plan.goal={...c.plan.goal,kind:'purchase',name:'Ma voiture',itemId:'',referencePrice:null,price:600000,boostHourly:0};c.plan.source='missions';c.plan.situation.dailyMinutes=90;/* 1 h 30 : « Braquage » ×1 (50 min) puis « Courses » ×2 tiennent dans une partie, les deux missions comptent */
 c.plan.missions=[{...B.copy(B.planMissionTemplate),id:'m-a',name:'Courses',reward:25000,cost:2500,duration:12,prep:3,cooldown:5},{...B.copy(B.planMissionTemplate),id:'m-b',name:'Braquage',reward:120000,cost:10000,duration:40,prep:10,cooldown:10,requires:['p-g']}];
 c.plan.prerequisites=[{...B.copy(B.planPrereqTemplate),id:'p-g',name:'Garage',price:80000,boostHourly:0,minutes:null,usagePerSession:null}];return c;}
/* Zones de sortie lues pour la matrice : tout ce que l'écran montre, outil par outil (panneaux cachés compris : ils sont rendus). */
const ZONES={goal:['goal-results','goal-routes'],purchase:['purchase-selection','purchase-results'],catalogue:['catalogue-count','catalogue-results','vehicle-comparison'],session:['session-capital-summary','session-results','session-timeline'],budget:['budget-results'],order:['order-capital-summary','order-items','order-results'],roi:['roi-selection','roi-links','roi-results'],activities:['inverse-results','activity-results'],compare:['compare-items','compare-results'],plan:['plan-results','plan-report']};
const flat=s=>String(s||'').replace(/[  ]/g,' ').replace(/\s+/g,' ').trim();
function readZones(d){const out={};for(const [group,ids] of Object.entries(ZONES))out[group]=ids.map(id=>{const n=d.getElementById(id);return n?flat(n.textContent):'';}).join(' ¶ ');
 for(const t of ['goal','purchase','session','budget','order','roi','activities','compare','plan']){out['expert-'+t]=flat(d.getElementById('expert-'+t)?.textContent);out['summary-'+t]=flat(d.getElementById('mode-summary-'+t)?.textContent);}
 out.live=flat(d.getElementById('calc-live')?.textContent);return out;}
/* Toutes les cases qui écrivent le même chemin doivent montrer la même valeur (hors case en cours de saisie). */
function mirrors(d){const m={};d.querySelectorAll('[data-field]:not([type=checkbox])').forEach(el=>{if(el.closest('[hidden]'))return;(m[el.dataset.field]=m[el.dataset.field]||[]).push({id:el.id,value:el.value});});return m;}
/* Générateur déterministe (mulberry32). */
function rng(seed){let a=seed>>>0;return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};}
const pick=(r,arr)=>arr[Math.floor(r()*arr.length)];
/* Nombre « réaliste » entre 0 et max, souvent rond, parfois décimal, parfois extrême. */
function amount(r,max=1e12){const k=r();if(k<0.05)return 0;if(k<0.1)return max;if(k<0.15)return Math.round(r()*1000)/100;if(k<0.6)return Math.round(r()*1e6/1000)*1000;if(k<0.9)return Math.round(r()*1e8);return Math.round(r()*max);}
module.exports={root,siteData,dataVersion,legacyDataVersion,baseState,planWithMissions,ZONES,readZones,mirrors,flat,rng,pick,amount,VEHICLES};
