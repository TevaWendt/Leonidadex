/* Généré depuis outils/sources/calculateurs-scenario.js : modifie la source, pas ce fichier. */
var lkPluriel=function(n){return ((typeof document!=='undefined'&&document.documentElement&&document.documentElement.lang)||'fr').slice(0,2)==='fr'?n>1:n!==1;};
(function(root,factory){'use strict';if(typeof module==='object'&&module.exports)module.exports=factory(require('./calculateurs-engine.js'),require('./calculateurs-modele.js'));else root.LKCalcScenario=factory(root.LKCalcEngine,root.LKCalcModel);})(typeof globalThis!=='undefined'?globalThis:this,function(E,M){
'use strict';
const copy=x=>JSON.parse(JSON.stringify(x));
const tools=['goal','activities','session','purchase','order','roi','budget','compare'];
const names={goal:'Il mio obiettivo',activities:'Le mie attività',session:'Il mio tempo di gioco',purchase:'I miei acquisti',order:'Cosa compro prima?',roi:'Ne vale la pena?',budget:'Il mio budget',compare:'Quale acquisto scelgo?',plan:'Il mio business plan'};
const assetTemplate={key:'free-1',itemId:'',name:'Il mio acquisto libero',price:100000,referencePrice:null,extras:0,fees:0,owned:false,incomeMode:'none',boostHourly:0,utility:null,
 role:'unknown',usage:{perSession:null,perUse:null,uses:null},resale:null,capabilities:{seats:null,terrain:'',cargo:null},requires:[],unlocks:[]};
const compareTemplate={keys:[],criterion:'value',hours:10};
const planTemplateV4={kind:'purchase',key:'',target:null,usePrerequisites:true,upkeepPerSession:0,priority:'balanced',activity:'',details:false,strategy:'auto',deadlineDays:null,countDoneBoost:true,done:[],log:[],playedMinutes:0};
const planGoalTemplate={kind:'purchase',name:'',itemId:'',referencePrice:null,price:null,boostHourly:0,target:null,unitLabel:'points',targetUnits:null,currentUnits:0,alsoPrice:0,meaning:'available'};
const planSituationTemplate={capital:null,reserve:0,hourly:null,unitsHourly:0,dailyMinutes:null,daysPerWeek:7,upkeepPerSession:0,players:1,rank:null};
const planMissionTemplate={id:'m-1',name:'La mia missione',reward:null,cost:0,duration:null,prep:0,cooldown:0,share:100,investment:0,owned:false,units:0,requires:[],once:false,done:false,started:false,requiresMissions:[],players:1,minCash:null,minRank:null,order:null,sourceId:'',who:''};
const planPrereqTemplate={id:'p-1',name:'Il mio acquisto da fare prima',itemId:'',referencePrice:null,price:null,boostHourly:0,owned:false,started:false,minutes:null,requires:[],usagePerSession:null,resale:null};
const planLogTemplate={id:'',at:'',capital:0,minutes:0,forecast:null,note:'',units:null,unitsGain:null,gain:null,plannedGain:null,sessionMinutes:0,runs:{},purchases:[]};
const planTemplate={goal:copy(planGoalTemplate),situation:copy(planSituationTemplate),source:'hourly',missions:[],prerequisites:[],priority:'balanced',strategy:'auto',variant:'auto',maxRepeat:100,deadlineDays:null,details:false,log:[],playedMinutes:0,sessionsPlayed:0,locked:[],variants:[],
 useHypotheses:false,offline:{on:false,cap:null},includeFailure:false,resaleAfterGoal:false};
const planVariantTemplate={id:'v-1',label:'La mia variante',at:'',goal:copy(planGoalTemplate),situation:copy(planSituationTemplate),source:'hourly',missions:[],prerequisites:[],priority:'balanced',strategy:'auto',maxRepeat:100,deadlineDays:null};
const MECHANICS=['carburant','entretien','reparation','assurance','revente','munitions','soin','revenu-passif','echec','bonus','amendes','mort','arrestation'];
const analysisTemplate={horizon:{sessions:null,uses:null,hours:null},need:{usage:'',passengers:null,terrain:'',cargo:false},priority:'fast',
 simulations:Object.fromEntries(MECHANICS.map(m=>[m,false])),
 sim:{carburant:{distance:null,consommation:null,prixUnitaire:null},entretien:{parPartie:null},reparation:{parPartie:null},assurance:{parPartie:null},revente:{valeur:null},munitions:{parTentative:null},soin:{points:null,vieParPartie:null,prixUnitaire:null},'revenu-passif':{parHeure:null,plafond:null},echec:{tentativesRatees:null},bonus:{pourcentage:null},amendes:{parPartie:null,prix:null},mort:{parPartie:null,perte:null},arrestation:{parPartie:null,perte:null}},
 money:{split:'commun',perso:'jason'},shareAuto:false};
const ROLES=['unknown','income','unlock','improve','replace','comfort','pleasure'],GOAL_MEANINGS=['held','available','cumulative'],PRIORITIES=['fast','cheapStart','cheapTotal','reserve'],TERRAINS=['','route','tout-terrain','eau','air'];
const STRATEGIES=['auto','asIs','byPayback','cheapFirst','skipNoBoost','direct','useReserve'];
const PLAN_KINDS=['purchase','amount','unlock'],PLAN_SOURCES=['hourly','missions'];
const MODEL_VERSION=M&&M.MODEL_VERSION?M.MODEL_VERSION:2;
function defaults(old){
 const s=copy(old);s.version=6;s.modelVersion=MODEL_VERSION;s.modelUpgradedFrom=null;s.analysis=copy(analysisTemplate);s.views=Object.fromEntries([...tools,'plan'].map(t=>[t,'quick']));
 s.assets=[copy(assetTemplate)];s.purchase={key:'free-1'};
 s.session={...s.session,daysPerWeek:7,usualMinutes:60};
 s.activities=s.activities.map(a=>({...a,prepOnce:false,requiresPurchaseIds:[]}));
 s.roi={key:'free-1',mode:'estimate',activityIds:[],hours:10,revenueHourly:null,costHourly:0,gainPercent:20,durationReduction:0,recoveryActivity:'',compareKey:''};
 s.order={keys:[],objective:'all'};s.budget={source:'basket',extra:0,allocations:[50000,60000,20000,10000,0]};
 s.compare=copy(compareTemplate);s.plan=copy(planTemplate);
 s.plan.goal.kind='amount';s.plan.goal.target=s.goal.target;s.plan.situation={capital:s.goal.capital,reserve:s.goal.reserve,hourly:s.goal.hourly,unitsHourly:0,dailyMinutes:s.goal.dailyMinutes,daysPerWeek:7,upkeepPerSession:0,players:s.goal.players??1};
 s.completed=[];return s;
}
function asset(s,key){return s.assets.find(a=>a.key===key);}
function addAsset(s,item){let a=s.assets.find(x=>x.itemId===item.id);if(!a){if(s.assets.length>=40)throw Error('Quaranta acquisti al massimo. Rimuovi un acquisto che non usi prima di continuare.');a={...copy(assetTemplate),key:item.id,itemId:item.id,name:item.name,price:item.price,referencePrice:item.price};if(typeof globalThis!=='undefined'&&typeof globalThis.LKCalcOwned==='function'&&globalThis.LKCalcOwned(item)===true)a.owned=true;s.assets.push(a);}return a;}
function planToV5(s){
 if(s.plan&&s.plan.goal&&typeof s.plan.goal==='object'&&s.plan.situation)return {...copy(s),version:5};
 const old={...planTemplateV4,...(s.plan||{})},assets=Array.isArray(s.assets)?s.assets:[],find=k=>assets.find(a=>a&&a.key===k),g=s.goal||{};
 const total=a=>a.price===null||a.price===undefined?null:a.price+(Number.isFinite(a.extras)?a.extras:0)+(Number.isFinite(a.fees)?a.fees:0);
 const boost=a=>a.incomeMode==='personal'&&Number.isFinite(a.boostHourly)?a.boostHourly:0;
 const plan=copy(planTemplate);
 plan.situation={capital:g.capital??null,reserve:g.reserve??0,hourly:g.hourly??null,unitsHourly:0,dailyMinutes:g.dailyMinutes??null,daysPerWeek:s.session?.daysPerWeek??7,upkeepPerSession:old.upkeepPerSession??0,players:old.situation?.players??g.players??1};
 const goalAsset=old.kind==='purchase'?find(old.key):null;
 if(goalAsset)plan.goal={...plan.goal,kind:'purchase',name:goalAsset.name||'Il mio obiettivo',itemId:goalAsset.itemId||'',referencePrice:goalAsset.referencePrice??null,price:total(goalAsset),boostHourly:boost(goalAsset)};
 else plan.goal={...plan.goal,kind:'amount',target:old.target??g.target??null};
 if(old.usePrerequisites!==false)plan.prerequisites=(s.order?.keys||[]).filter(k=>k!==old.key).map(find).filter(Boolean).slice(0,20).map((a,i)=>({id:'p-'+(i+1),name:a.name||'Acquisto',itemId:a.itemId||'',referencePrice:a.referencePrice??null,price:total(a),boostHourly:boost(a),owned:a.owned===true}));
 if(old.activity){const a=(s.activities||[]).find(x=>x&&x.id===old.activity);if(a){plan.source='missions';plan.missions=[{id:'m-1',name:a.name||'La mia missione',reward:a.reward??null,cost:a.cost??0,duration:a.duration??null,prep:a.prep??0,cooldown:a.cooldown??0,share:a.share??100,investment:a.investment??0,owned:a.owned===true,units:0,requires:[]}];}}
 plan.priority=old.priority;plan.strategy=old.strategy;plan.deadlineDays=old.deadlineDays;plan.details=old.details;plan.playedMinutes=old.playedMinutes;
 plan.log=(Array.isArray(old.log)?old.log:[]).map(e=>({...copy(planLogTemplate),...e}));
 return {...copy(s),version:5,plan};
}
function migrate(raw,initial){
 let out=migrateVersion(raw,initial);
 const mv=Number.isInteger(raw.modelVersion)?raw.modelVersion:1;
 if(mv<MODEL_VERSION)out={...out,modelVersion:MODEL_VERSION,modelUpgradedFrom:Number.isInteger(out.modelUpgradedFrom)?out.modelUpgradedFrom:mv};
 return out;
}
function migrateVersion(raw,initial){
 if(!raw||typeof raw!=='object'||![1,2,3,4,5,6].includes(raw.version))throw Error('Versione del salvataggio non riconosciuta.');
 if(raw.version===6)return raw;
 if(raw.version===5)return {...copy(raw),version:6,modelVersion:raw.modelVersion??1};
 if(raw.version===3)return {...planToV5({...copy(raw),version:4,plan:{...copy(planTemplateV4),...(raw.plan||{})}}),version:6};
 if(raw.version===4)return {...planToV5(raw),version:6};
 const s={...copy(initial),...copy(raw),version:6};
 s.goal={...initial.goal,...raw.goal};
 const oldContext=raw.tab==='purchase'?raw.purchase:raw.tab==='budget'?raw.budget:raw.tab==='order'?raw.order:null;
 if(oldContext)for(const key of ['capital','reserve','hourly','target'])if(Object.prototype.hasOwnProperty.call(oldContext,key))s.goal[key]=oldContext[key];
 s.views=Object.fromEntries([...tools,'plan'].map(t=>[t,raw.mode==='advanced'?'advanced':'quick']));s.mode=s.views[s.tab]||'quick';
 s.activities=(raw.activities||initial.activities).map(a=>({...a,owned:a.owned===true,prepOnce:false,requiresPurchaseIds:[]}));
 s.session={...initial.session,...raw.session};s.assets=[];
 const old=raw.purchase||{}, a={...copy(assetTemplate),key:old.itemId||'free-1',itemId:old.itemId||'',price:old.price===undefined?100000:old.price,extras:old.extras||0,boostHourly:old.boostHourly||0,incomeMode:old.boostHourly?'personal':'none'};
 s.assets.push(a);s.purchase={key:a.key};
 const r=raw.roi||{};s.assets.push({...copy(assetTemplate),key:'legacy-roi',name:'Investimento importato',price:r.purchase===undefined?null:r.purchase,extras:r.upgrades||0,fees:r.fees||0});
 s.roi={...copy(initial.roi),...r,key:'legacy-roi',mode:'continuous',activityIds:[]};
 s.order={keys:[]};(raw.order?.items||[]).forEach((item,i)=>{const a={...copy(assetTemplate),...item,key:'legacy-order-'+i,itemId:'',incomeMode:item.boostHourly?'personal':'none'};s.assets.push(a);s.order.keys.push(a.key);});
 s.budget={...copy(initial.budget),...raw.budget,source:'manual'};s.completed=[];
 s.plan.situation={...s.plan.situation,capital:s.goal.capital??null,reserve:s.goal.reserve??0,hourly:s.goal.hourly??null,dailyMinutes:s.goal.dailyMinutes??null};s.plan.goal.target=s.goal.target??null;
 return s;
}
function validate(raw,initial){
 if(!raw||!raw.goal||!Array.isArray(raw.activities)||(raw.version===3&&!Array.isArray(raw.assets)))throw Error('Salvataggio incompleto: mancano obiettivo, attività o acquisti.');
 raw=migrate(raw,initial);
 function walk(t,v,key){
  if(v===undefined)return ['price','reward','duration','capital','target','hourly'].includes(key)?null:copy(t);
  if(t===null||typeof t==='number'){if(v===null)return null;if(typeof v!=='number'||!Number.isFinite(v)||Math.abs(v)>1e12)throw Error('Numero non valido: '+key);return v;}
  if(typeof t==='string'){if(typeof v!=='string'||v.length>200)throw Error('Testo non valido: '+key);return v;}
  if(typeof t==='boolean'){if(typeof v!=='boolean')throw Error('Opzione non valida: '+key);return v;}
  if(Array.isArray(t)){
   if(!Array.isArray(v)||v.length>100)throw Error('Lista non valida: '+key);
   if(key==='log'){const seenLog=new Set();return v.slice(0,60).filter(e=>{if(!e||typeof e!=='object'||typeof e.id!=='string'||!e.id)return true;if(seenLog.has(e.id))return false;seenLog.add(e.id);return true;}).map(e=>{if(!e||typeof e!=='object'||Array.isArray(e))throw Error('Cronologia del piano non valida.');const capital=typeof e.capital==='number'&&Number.isFinite(e.capital)&&e.capital>=0&&e.capital<=1e12?e.capital:null;if(capital===null)throw Error('Cronologia del piano non valida.');const num=(x,max)=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=max?x:null;const any=x=>typeof x==='number'&&Number.isFinite(x)&&Math.abs(x)<=1e12?x:null;const runs={};if(e.runs&&typeof e.runs==='object'&&!Array.isArray(e.runs))Object.keys(e.runs).slice(0,12).forEach(k=>{const n=num(e.runs[k],1e5);if(k.length<=60&&n!==null)runs[k]=n;});return {id:typeof e.id==='string'?e.id.slice(0,80):'',at:typeof e.at==='string'?e.at.slice(0,40):'',capital,minutes:num(e.minutes,1e7)??0,forecast:any(e.forecast),note:typeof e.note==='string'?e.note.slice(0,300):'',units:num(e.units,1e12),unitsGain:any(e.unitsGain),gain:any(e.gain),plannedGain:any(e.plannedGain),sessionMinutes:num(e.sessionMinutes,1e5)??0,runs,purchases:Array.isArray(e.purchases)?e.purchases.filter(x=>typeof x==='string'&&x.length<=60).slice(0,20):[]};});}
   if(key==='missions'){if(v.length>12)throw Error('Dodici missioni al massimo nel piano.');return v.map((x,i)=>{const m=walk(planMissionTemplate,x,'mission');if(typeof m.id!=='string'||!m.id)m.id='m-'+(i+1);return m;});}
   if(key==='prerequisites'){if(v.length>20)throw Error('Al massimo venti acquisti prima dell’obiettivo nel piano.');return v.map((x,i)=>{const a=walk(planPrereqTemplate,x,'prerequisite');if(typeof a.id!=='string'||!a.id)a.id='p-'+(i+1);return a;});}
   if(key==='variants'){if(v.length>5)throw Error('Al massimo cinque varianti nel piano.');return v.map((x,i)=>{const a=walk(planVariantTemplate,x,'variant');if(typeof a.id!=='string'||!a.id)a.id='v-'+(i+1);return a;});}
   if(['keys','activityIds','requiresPurchaseIds','enabled','favorites','compareIds','completed','done','requires','unlocks','requiresMissions','locked'].includes(key)){if(v.some(x=>typeof x!=='string'||x.length>160))throw Error('Identificativo non valido.');return [...new Set(v)].slice(0,key==='compareIds'?3:100);}
   if(key==='assets'){if(v.length<1||v.length>40)throw Error('Da uno a quaranta acquisti per scenario.');return v.map(x=>walk(assetTemplate,x,'asset'));}
   if(key==='activities'){if(v.length!==initial.activities.length)throw Error('Numero di attività personali incompatibile.');return v.map((x,i)=>walk(initial.activities[i],x,'activity'));}
   if(key==='allocations'&&v.length!==5)throw Error('Ripartizione del budget incompatibile.');
   return v.map((x,i)=>walk(t[i]===undefined?t[0]:t[i],x,key));
  }
  if(!v||typeof v!=='object'||Array.isArray(v))throw Error('Impostazioni incomplete: '+key);
  const o={};for(const k of Object.keys(t))o[k]=walk(t[k],v[k],k);return o;
 }
 const s=walk(initial,raw,'scenario');
 if(![...tools,'plan'].includes(s.tab)||!['quick','guided','advanced'].includes(s.mode)||!['continuous','cycles'].includes(s.model))throw Error('Strumento o modalità non validi.');
 if(!asset(s,s.purchase.key)||!asset(s,s.roi.key))throw Error('Manca il riferimento interno di un acquisto. Il salvataggio non può essere ripristinato.');
 if(!['all','vehicle','weapon','property','business','place','hideout','style','customization','consumable','ammo','housing','activity'].includes(s.catalogue.type)||!['all','known','unknown','manual','official','verified','estimated'].includes(s.catalogue.status)||!['name','price-up','price-down'].includes(s.catalogue.sort))throw Error('Filtro del catalogo incompatibile.');
 if(s.activities.some((a,i)=>a.id!==initial.activities[i].id))throw Error('Riferimento di attività non valido.');
 if(new Set(s.assets.map(a=>a.key)).size!==s.assets.length||s.assets.some(a=>!a.key||!['none','personal','roi'].includes(a.incomeMode)))throw Error('Riferimenti degli acquisti incompatibili.');
 if(!['estimate','new','improve','continuous'].includes(s.roi.mode)||!['basket','manual'].includes(s.budget.source))throw Error('Modello di calcolo incompatibile.');
 if(!['value','cheapest','cheapestTotal','fastest','profit','utility'].includes(s.compare.criterion)||!PLAN_KINDS.includes(s.plan.goal.kind)||!PLAN_SOURCES.includes(s.plan.source)||!['balanced','fast','safe','cheap'].includes(s.plan.priority))throw Error('Impostazione di confronto o di piano incompatibile.');
 if(!STRATEGIES.includes(s.plan.strategy))s.plan.strategy='auto';if(s.plan.deadlineDays!==null&&(!Number.isInteger(s.plan.deadlineDays)||s.plan.deadlineDays<1||s.plan.deadlineDays>36500))s.plan.deadlineDays=null;if(!Number.isFinite(s.plan.playedMinutes)||s.plan.playedMinutes<0)s.plan.playedMinutes=0;if(!Number.isInteger(s.plan.sessionsPlayed)||s.plan.sessionsPlayed<0)s.plan.sessionsPlayed=0;
 if(typeof s.plan.variant!=='string'||s.plan.variant.length>80)s.plan.variant='auto';if(!Number.isInteger(s.plan.maxRepeat)||s.plan.maxRepeat<1||s.plan.maxRepeat>256)s.plan.maxRepeat=100;if(s.plan.goal.unitLabel.trim()==='')s.plan.goal.unitLabel='points';
 {const ids=new Set();s.plan.missions.forEach((m,i)=>{if(ids.has(m.id))m.id='m-'+(i+1)+'-'+ids.size;ids.add(m.id);});const pids=new Set();s.plan.prerequisites.forEach((a,i)=>{if(pids.has(a.id))a.id='p-'+(i+1)+'-'+pids.size;pids.add(a.id);});s.plan.missions.forEach(m=>{m.requires=m.requires.filter(id=>pids.has(id));});}
 s.compare.keys=s.compare.keys.filter(k=>asset(s,k)).slice(0,6);
 s.assets.forEach(a=>{if(a.utility!==null&&(!Number.isInteger(a.utility)||a.utility<1||a.utility>5))a.utility=null;if(!ROLES.includes(a.role))a.role='unknown';if(!TERRAINS.includes(a.capabilities.terrain))a.capabilities.terrain='';for(const k of ['perSession','perUse','uses'])if(a.usage[k]!==null&&a.usage[k]<0)a.usage[k]=null;if(a.usage.uses!==null&&!Number.isInteger(a.usage.uses))a.usage.uses=Math.round(a.usage.uses);a.requires=a.requires.filter(k=>k!==a.key);});
 if(!GOAL_MEANINGS.includes(s.plan.goal.meaning))s.plan.goal.meaning='available';if(!GOAL_MEANINGS.includes(s.goal.meaning))s.goal.meaning='available';if(!OBJECTIVES.includes(s.order.objective))s.order.objective='all';if(s.goal.deadlineDays!==null&&(!Number.isInteger(s.goal.deadlineDays)||s.goal.deadlineDays<1||s.goal.deadlineDays>36500))s.goal.deadlineDays=null;if(!PRIORITIES.includes(s.analysis.priority))s.analysis.priority='fast';if(!TERRAINS.includes(s.analysis.need.terrain))s.analysis.need.terrain='';
 if(!['commun','separe'].includes(s.analysis.money.split))s.analysis.money.split='commun';if(!['jason','lucia'].includes(s.analysis.money.perso))s.analysis.money.perso='jason';
 [s.plan.missions,...s.plan.variants.map(v=>v.missions)].forEach(list=>list.forEach(m=>{if(!WHO.includes(m.who))m.who='';}));
 if(s.plan.offline.cap!==null&&s.plan.offline.cap<0)s.plan.offline.cap=null;s.plan.prerequisites.forEach(a=>{if(a.resale!==null&&a.resale<0)a.resale=null;});
 {const pids=new Set(s.plan.prerequisites.map(a=>a.id)),mids=new Set(s.plan.missions.map(m=>m.id));s.plan.prerequisites.forEach(a=>{a.requires=a.requires.filter(id=>(pids.has(id)||mids.has(id))&&id!==a.id);});s.plan.missions.forEach(m=>{m.requiresMissions=m.requiresMissions.filter(id=>mids.has(id)&&id!==m.id);});s.plan.locked=s.plan.locked.filter(id=>id==='strategy'||id==='goal'||mids.has(id)||pids.has(id));}
 for(const t of [...tools,'plan'])if(!['quick','guided','advanced'].includes(s.views[t]))s.views[t]='quick';
 s.mode=s.views[s.tab];return s;
}
function ammoPerAttempt(s){const on=s.analysis&&s.analysis.simulations&&s.analysis.simulations.munitions,v=on?s.analysis.sim.munitions.parTentative:null;return typeof v==='number'&&Number.isFinite(v)&&v>0?v:0;}
function activities(s,source=[]){const ammo=ammoPerAttempt(s);return actExtras(s,[...s.activities.map(a=>({...a,status:'manual',investment:a.owned?0:a.investment,...(ammo&&typeof a.cost==='number'?{cost:a.cost+ammo,ammoSimulated:ammo}:{})})),...source.map(a=>ammo&&typeof a.cost==='number'?{...a,cost:a.cost+ammo,ammoSimulated:ammo}:a)]);}
const WHO=['','jason','lucia','deux'],PERSO={jason:'Jason',lucia:'Lucia'};
const xOn=(s,k)=>!!(s&&s.analysis&&s.analysis.simulations&&s.analysis.simulations[k]===true);
const nonNeg=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0;
function simCosts(s){
 const out={total:0,lines:[],missing:[]};if(!s||!s.analysis||!s.analysis.sim)return out;const sim=s.analysis.sim;
 if(xOn(s,'soin')){const f=sim.soin||{};if(nonNeg(f.vieParPartie)&&typeof f.points==='number'&&f.points>0&&nonNeg(f.prixUnitaire)){const v=f.vieParPartie/f.points*f.prixUnitaire;out.total+=v;out.lines.push({key:'soin',label:'Cure (simulazione)',value:v,field:'sim-soin-vieParPartie'});}else out.missing.push({key:'soin',text:'Cure: scrivi la vita persa per partita, la vita che una cura ti ridà e il prezzo di una cura.',field:'sim-soin-vieParPartie'});}
 for(const [k,label,n,m,miss] of [['amendes','Multe (simulazione)','parPartie','prix','Multe: scrivi quante per partita e l’importo di una multa.'],['mort','Soldi persi alla morte (simulazione)','parPartie','perte','Morte: scrivi quante volte per partita e i soldi persi ogni volta.'],['arrestation','Soldi persi all’arresto (simulazione)','parPartie','perte','Arresto: scrivi quante volte per partita e i soldi persi ogni volta.']]){
  if(!xOn(s,k))continue;const f=sim[k]||{};if(nonNeg(f[n])&&nonNeg(f[m])){const v=f[n]*f[m];out.total+=v;out.lines.push({key:k,label,value:v,field:'sim-'+k+'-'+n});}else out.missing.push({key:k,text:miss,field:'sim-'+k+'-'+n});}
 return out;}
function simUpkeep(s){const t=simCosts(s).total;return t>0?t:0;}
function upkeepOf(s){const g=s.goal,up=typeof g.upkeepPerSession==='number'&&g.upkeepPerSession>0?g.upkeepPerSession:0,x=simUpkeep(s);return x>0?up+x:up;}
function simPassive(s,minutes){if(!xOn(s,'revenu-passif'))return null;const f=s.analysis.sim['revenu-passif']||{};if(!(typeof f.parHeure==='number'&&f.parHeure>0))return {rate:0,raw:0,cap:null,incomplete:true};
 const cap=nonNeg(f.plafond)?f.plafond:null,d=typeof minutes==='number'&&minutes>0?minutes:null,rate=cap!==null&&d!==null?Math.min(f.parHeure,cap*60/d):f.parHeure;
 return {rate,raw:f.parHeure,cap,capped:rate<f.parHeure-1e-9,noSessions:cap!==null&&d===null};}
function simBonus(s){if(!xOn(s,'bonus'))return null;const p=s.analysis.sim.bonus&&s.analysis.sim.bonus.pourcentage;return typeof p==='number'&&Number.isFinite(p)&&p>0?p:null;}
const shareAutoOn=s=>!!(s&&s.analysis&&s.analysis.shareAuto===true);
function moneySplit(s){const m=s&&s.analysis&&s.analysis.money;return m&&m.split==='separe'?(m.perso==='lucia'?'lucia':'jason'):null;}
const sharePublished=a=>!!(a&&a.fieldMeta&&a.fieldMeta.share&&['official','verified'].includes(a.fieldMeta.share.status));
function actExtras(s,list){const bonus=simBonus(s),auto=shareAutoOn(s),who=moneySplit(s);if(bonus===null&&!auto&&!who)return list;
 return list.map(a=>{let o=a;
  if(bonus!==null&&typeof a.reward==='number')o={...o,reward:a.reward*(1+bonus/100),bonusSimulated:bonus};
  if(auto&&Number.isInteger(a.players)&&a.players>1&&!sharePublished(a))o={...o,share:100/a.players,shareAuto:a.players};
  if(who&&Array.isArray(a.characters)&&a.characters.length&&!a.characters.includes(who))o={...o,otherCharacter:a.characters.slice()};
  return o;});}
const otherReason=(a,s)=>'si gioca con '+(a.otherCharacter||[]).map(c=>PERSO[c]||c).join(' e ')+': conti solo i soldi di '+PERSO[moneySplit(s)];
function resaleOwnedTotal(s){return (s.assets||[]).filter(a=>a&&a.owned&&typeof a.resale==='number'&&Number.isFinite(a.resale)&&a.resale>0).reduce((t,a)=>t+a.resale,0);}
function withResale(s){if(!s||!s.goal||s.goal.resaleOwned!==true)return s;const t=resaleOwnedTotal(s);return {...s,goal:{...s.goal,resaleOwned:false,capital:typeof s.goal.capital==='number'&&t>0?s.goal.capital+t:s.goal.capital}};}
const onceOnly=a=>!!a&&a.once===true;
const ONCE_REASON='missione da fare una sola volta: va nel business plan';
function eligible(s,source=[]){
 const owned=s.assets.filter(a=>a.owned).map(a=>a.itemId).filter(Boolean);
 return activities(s,source).filter(a=>s.session.enabled.includes(a.id)&&a.players<=s.goal.players&&(a.requiresPurchaseIds||[]).every(id=>owned.includes(id))&&!onceOnly(a)&&!a.otherCharacter);
}
function purchase(s,source=[]){const a=asset(s,s.purchase.key)||{...assetTemplate,price:null};let boost=a.incomeMode==='personal'?a.boostHourly:0;if(a.incomeMode==='roi'){const r=roi(s,source);boost=s.roi.key===a.key&&['new','improve'].includes(roiMode(s))&&r.valid&&Number.isFinite(r.netHourly)?Math.max(0,r.netHourly):null;}return {...a,extras:a.extras===null||a.fees===null?null:a.extras+a.fees,capital:s.goal.capital,reserve:s.goal.reserve,target:s.goal.target,hourly:s.goal.hourly,boostHourly:boost};}
function hourlyNet(s){const g=s.goal,hourly=typeof g.hourly==='number'&&Number.isFinite(g.hourly)?g.hourly:null,daily=typeof g.dailyMinutes==='number'&&g.dailyMinutes>0?g.dailyMinutes:null,up=upkeepOf(s);
 const upkeepHourly=up>0&&daily?up*60/daily:0,known=!(up>0&&!daily);
 const ps=simPassive(s,daily),pr=ps&&ps.rate>0?ps.rate:0;
 const out={hourly,net:hourly===null?null:pr>0?hourly-upkeepHourly+pr:hourly-upkeepHourly,upkeepHourly,known,reason:known?null:'Non scritto: le tue spese per partita non vengono tolte dal guadagno all’ora per l’attesa.'};
 if(pr>0)out.passive=pr;return out;}
function goal(s,source=[]){if(s&&s.goal&&s.goal.resaleOwned===true){const t=resaleOwnedTotal(s),r=goalBase(withResale(s),source);return r&&r.valid&&t>0?{...r,resaleOwned:t}:r;}return goalBase(s,source);}
function goalBase(s,source=[]){
 const g=s.goal,target=goalTarget(s),daily=typeof g.dailyMinutes==='number'&&g.dailyMinutes>0?g.dailyMinutes:null,up=upkeepOf(s);
 if(s.model==='continuous'){
  const hn=hourlyNet(s);
  if(up>0){if(!hn.known)return{valid:false,reason:'Il calcolo delle tue spese per partita richiede il tuo tempo di gioco al giorno: scrivilo.'};}
  let hourly=hn.net;
  if(typeof hourly==='number'&&hourly<=0&&up>0&&target!==null&&target>(g.capital??0)-(g.reserve??0))return{valid:false,reason:'Le tue spese per partita si mangiano tutto quello che guadagni: abbassale o guadagna di più all’ora.'};
  const r=E.goalContinuous({...g,target,hourly:typeof hourly==='number'?Math.max(0,hourly):hourly});
  if(!r.valid)return r;const done=settle(r,plannedOf(g));if(r.totalMinutes>0)done.curve=curveOf(g,done,plannedOf(g));
  return up>0?{...done,upkeepHourly:up*60/daily}:done;}
 if(!Number.isInteger(g.players)||g.players<1||g.players>100)return{valid:false,reason:'Scrivi un numero di giocatori tra 1 e 100.'};
 const all=activities(s,source), compatible=all.filter(a=>a.players<=g.players&&(a.requiresPurchaseIds||[]).every(id=>s.assets.some(x=>x.itemId===id&&x.owned))&&!onceOnly(a)&&!a.otherCharacter);
 const run=extra=>{const t=target===null?null:target+g.reserve+extra;
  if(g.selected==='mixed')return E.goalMixed({...g,target:t,activities:compatible.filter(a=>s.activities.some(x=>x.id===a.id))});
  const a=compatible.find(a=>a.id===g.selected);if(!a){const excluded=all.find(a=>a.id===g.selected);return{valid:false,reason:excluded&&excluded.players>g.players?'Questo scenario si gioca in '+excluded.players+' giocatori; siete in '+g.players+'.':onceOnly(excluded)?'“'+excluded.name+'” si fa una sola volta: non si ripete fino al tuo obiettivo. Mettila nel business plan, con le missioni che si rifanno.':excluded&&excluded.otherCharacter?'“'+excluded.name+'” '+otherReason(excluded,s)+' (Le mie ipotesi in più).':'Scegli un’attività compatibile con il tuo gruppo e con gli acquisti che hai.'};}
  return E.goal({...g,target:t,activity:a});};
 if(!up)return settle(run(0),plannedOf(g));
 const r0=run(0);if(!r0.valid)return r0;if(!(r0.sessions>0))return settle(r0,plannedOf(g));
 let lastReason=null;const fits=S=>{const r=run(up*S);if(!r.valid){lastReason=r.reason;return null;}return r.sessions<=S?r:null;};
 const CAP=1e6;let lo=r0.sessions,hi=lo,rh=fits(hi);
 while(!rh&&hi<CAP){lo=hi;hi=Math.min(CAP,hi*2);rh=fits(hi);}
 if(!rh)return {valid:false,reason:lastReason||UPKEEP_EATS};
 while(hi-lo>1){const mid=Math.floor((lo+hi)/2),rm=fits(mid);if(rm){hi=mid;rh=rm;}else lo=mid;}
 const extra=up*rh.sessions;
 return settle({...rh,upkeepTotal:extra},plannedOf(g)+extra);
}
function session(s,source=[]){
 if(!Number.isInteger(s.goal.players)||s.goal.players<1||s.goal.players>100)return{valid:false,reason:'Dimmi in Le mie attività se giochi da solo o con altri.'};
 const candidates=eligible(s,source),valid=candidates.filter(a=>E.activity(a).valid);
 const r=E.sessionPlan({capital:s.goal.capital,reserve:s.goal.reserve,minutes:s.session.minutes,maxRepeat:s.session.maxRepeat,activities:valid.length?valid:candidates});
 if(!r.valid||!Array.isArray(r.timeline))return r;
 const events=[],paid=new Set();
 r.timeline.forEach(st=>{events.push({at:st.start,kind:'act',until:st.end,session:1,id:st.id,needs:paid.has(st.id)?['inv:'+st.id]:[]});if(st.cost>0)events.push({at:st.start,kind:'spend',amount:st.cost});if(st.investment>0&&!paid.has(st.id)){events.push({at:st.start,kind:'spend',amount:st.investment,asset:true,unlocks:'inv:'+st.id});paid.add(st.id);}if(st.reward>0)events.push({at:st.end,kind:'earn',amount:st.reward});});
 const v=E.cashJournalVerify({capital:s.goal.capital,reserve:s.goal.reserve,events,claim:{finalCash:r.finalCapital,sessionMinutes:s.session.minutes}});
 if(v.valid&&v.ok===false)return {valid:false,reason:verifyText(v),verification:v};
 r.verification=v;return r;
}
function projection(s,source=[],r=session(s,source)){
 if(!r.valid)return r;
 const up=upkeepOf(s);
 const repeat=copy(s),left=r.finalCapital-up;repeat.goal.capital=left;repeat.session.minutes=s.session.usualMinutes;
 const paid=new Set(r.breakdown.filter(a=>a.runs).map(a=>a.id));repeat.activities.forEach(a=>{if(paid.has(a.id))a.owned=true;});
 const next=repeat.session.minutes===s.session.minutes?{valid:true,profit:r.profit+r.investment}:left<(s.goal.reserve||0)?{valid:true,profit:0}:session(repeat,source);
 const sx=withResale(s);
 return E.sessionProjection({capital:sx.goal.capital,reserve:s.goal.reserve,target:goalTarget(sx),upkeepPerSession:up,session:r,repeatProfit:next.valid?next.profit:null,repeatReason:next.valid?null:next.reason,daysPerWeek:s.session.daysPerWeek});
}
function roiMode(s){const a=asset(s,s.roi.key);return a&&(a.role==='pleasure'||a.role==='comfort')?'estimate':s.roi.mode;}
function roi(s,source=[],ctx={}){
 const r={...s.roi,mode:roiMode(s)},a=asset(s,r.key);if(!a)return{valid:false,reason:'Scegli un acquisto dalla lista.'};
 if(r.mode==='estimate')return decision(s,source);
 const input={...r,purchase:a.price,upgrades:a.extras,fees:a.fees};
 if(r.mode==='continuous'){const u=usagePerHourOf(s,a,ctx);if(u!==null&&!(r.costHourly>0))return {...E.roi({...input,costHourly:u}),usageFromPurchase:u};return E.roi(input);}
 const acts=activities(s,source).filter(a=>r.activityIds.includes(a.id));
 if(acts.length!==r.activityIds.length)return{valid:false,reason:'Una delle attività non esiste più. Scegline un’altra.'};
 if(acts.some(a=>a.players>s.goal.players))return{valid:false,reason:'Una delle attività si gioca con più giocatori di voi. Cambia il numero di giocatori in Le mie attività.'};
 return E.investmentActivities({...input,activities:acts,baselineHourly:r.mode==='new'?s.goal.hourly:null});
}
function investment(s,source=[],ctx={}){const a=asset(s,s.roi.key);if(!a)return{valid:false,reason:'Scegli un acquisto.'};const u=usagePerHourOf(s,a,ctx),cost=u!==null&&!(s.roi.costHourly>0)?u:s.roi.costHourly;return E.investmentCompare({capital:s.goal.capital,reserve:s.goal.reserve,price:a.price,extras:a.extras,fees:a.fees,baselineHourly:s.goal.hourly,extraHourly:s.roi.revenueHourly,costHourly:cost,hours:s.roi.hours,dailyMinutes:s.goal.dailyMinutes});}
function usagePerHourOf(s,a,ctx){if(!M||!a)return null;const u=usageOf(s,a,itemOf(a,ctx)),d=typeof s.goal.dailyMinutes==='number'&&s.goal.dailyMinutes>0?s.goal.dailyMinutes:null;return M.V.usable(u.perSession)&&d?u.perSession.v*60/d:null;}
function decision(s,source=[],key=s.roi.key){
 const a=asset(s,key);if(!a)return{valid:false,reason:'Scegli un acquisto o scrivi un acquisto libero.'};
 let hourly=s.goal.hourly;
 if(s.roi.recoveryActivity){const activity=activities(s,source).find(x=>x.id===s.roi.recoveryActivity),r=activity&&E.activity(activity);hourly=r?.valid&&r.hourly>=0?r.hourly:null;}
 return E.worth({capital:s.goal.capital,reserve:s.goal.reserve,price:a.price,extras:a.extras,fees:a.fees,hourly,hours:s.roi.hours});
}
function blank(current){
 const s=copy(current);s.name='Il mio calcolo';s.model='continuous';s.completed=[];
 s.goal={...s.goal,capital:null,target:null,hourly:null,dailyMinutes:null,reserve:0,players:1,selected:'scenario-a',meaning:'available',plannedSpend:null,upkeepPerSession:null,deadlineDays:null};
 s.assets=[{...copy(assetTemplate),price:null}];s.purchase={key:'free-1'};
 s.roi={...s.roi,key:'free-1',mode:'estimate',hours:null,gainPercent:0,durationReduction:0,activityIds:[],revenueHourly:null,costHourly:0,compareKey:'',recoveryActivity:''};
 s.order={keys:[],objective:'all'};s.budget={source:'manual',extra:0,allocations:[0,0,0,0,0]};s.compare={...copy(compareTemplate)};s.plan=copy(planTemplate);s.analysis=copy(analysisTemplate);
 s.activities=s.activities.map((a,i)=>({...a,name:'La mia attività '+String.fromCharCode(65+i),reward:null,duration:null,cost:0,prep:0,cooldown:0,share:100,investment:0,players:1,owned:false,prepOnce:false,requiresPurchaseIds:[]}));
 s.session={...s.session,enabled:['scenario-a'],minutes:null,usualMinutes:null,daysPerWeek:null};s.inverse={selected:'scenario-a',minutes:null};
 return s;
}
const UPKEEP_EATS='Le tue spese per partita si mangiano tutto quello che guadagni: abbassale o guadagna di più all’ora.';
const orderHourly=s=>{const n=hourlyNet(s).net;return n===null?null:Math.max(0,n);};
const upkeepEats=s=>{const hn=hourlyNet(s);return hn.net!==null&&hn.net<=0&&hn.upkeepHourly>0;};
function orderInput(s,source=[]){
 const items=s.order.keys.map(key=>{const a=asset(s,key);if(!a)return{name:'Acquisto mancante',price:null};let boost=0;
  if(a.incomeMode==='personal')boost=a.boostHourly;
  if(a.incomeMode==='roi'){const r=roi(s,source);boost=s.roi.key===key&&['new','improve'].includes(roiMode(s))&&r.valid&&Number.isFinite(r.netHourly)?Math.max(0,r.netHourly):null;}
  return{name:a.name+(a.owned?' (già posseduto)':''),price:a.owned?0:a.price===null||a.extras===null||a.fees===null?null:a.price+a.extras+a.fees,boostHourly:a.owned?0:boost};});
 return {capital:s.goal.capital,reserve:s.goal.reserve,hourly:orderHourly(s),items};
}
function budgetInput(s){const allocations=s.budget.source==='basket'?s.order.keys.map(k=>{const a=asset(s,k);return a?.owned?0:!a||a.price===null||a.extras===null||a.fees===null?null:a.price+a.extras+a.fees;}):s.budget.allocations.slice();allocations.push(s.budget.extra);return{capital:s.goal.capital,reserve:s.goal.reserve,allocations};}
function compareNames(s){const out={},used=new Set();s.compare.keys.forEach((k,i)=>{const a=asset(s,k);if(!a)return;const base=(typeof a.name==='string'&&a.name.trim()?a.name.trim().slice(0,120):'Acquisto '+(i+1));let name=base,n=1;while(used.has(name)){n+=1;name=base+' ('+n+')';}used.add(name);out[k]=name;});return out;}
function chooseInput(s,source=[]){
 const names=compareNames(s);
 const items=s.compare.keys.map(k=>{const a=asset(s,k);if(!a)return null;let income=null;if(a.incomeMode==='personal'&&a.boostHourly>0)income=a.boostHourly;if(a.incomeMode==='roi'){const r=roi(s,source);if(s.roi.key===k&&['new','improve','continuous'].includes(roiMode(s))&&r.valid&&Number.isFinite(r.netHourly)&&r.netHourly>0)income=r.netHourly;}
  return {name:names[k],price:a.owned?0:a.price,extras:a.extras,fees:a.fees,utility:a.utility,incomeHourly:income};}).filter(Boolean);
 return {capital:s.goal.capital,reserve:s.goal.reserve,hourly:s.goal.hourly,dailyMinutes:s.goal.dailyMinutes,hours:s.compare.hours,criterion:s.compare.criterion,items};
}
const STRATEGY_LABEL={auto:'Lascia scegliere il calcolatore',asIs:'Nell’ordine che ho dato',byPayback:'Prima ciò che rende più in fretta',cheapFirst:'Prima il meno caro',skipNoBoost:'Solo gli acquisti che rendono',direct:'Dritto al mio obiettivo, senza acquisti prima',useReserve:'Toccando i soldi messi da parte'};
function planReserve(s,strategy=s.plan.strategy){return s.plan.priority==='fast'||strategy==='useReserve'?0:(s.plan.situation.reserve??0);}
function planPurchases(s,strategy=s.plan.strategy){const list=s.plan.prerequisites.slice(),ratio=x=>x.boostHourly>0&&x.price!==null?x.price/x.boostHourly:Infinity;let ordered=list.slice();
 if(strategy==='byPayback')ordered.sort((a,b)=>ratio(a)-ratio(b)||list.indexOf(a)-list.indexOf(b));
 if(strategy==='cheapFirst')ordered.sort((a,b)=>(a.price??1e12)-(b.price??1e12)||list.indexOf(a)-list.indexOf(b));
 const locked=new Set(s.plan.locked||[]);
 if(strategy==='skipNoBoost')ordered=ordered.filter(x=>x.owned||x.boostHourly>0||locked.has(x.id));
 if(strategy==='direct')ordered=ordered.filter(x=>x.owned||locked.has(x.id));
 return dependencyOrder(ordered).map(x=>({id:x.id,name:x.name,price:x.price,boostHourly:x.boostHourly,owned:x.owned,minutes:x.minutes??0,requires:(x.requires||[]).slice(),usagePerSession:x.usagePerSession??0}));}
function dependencyOrder(list){const ids=new Set(list.map(x=>x.id)),out=[],placed=new Set();let guard=0;
 while(out.length<list.length&&guard++<list.length*list.length+5){const next=list.find(x=>!placed.has(x.id)&&(x.requires||[]).every(r=>!ids.has(r)||placed.has(r)));if(!next){list.filter(x=>!placed.has(x.id)).forEach(x=>{placed.add(x.id);out.push(x);});break;}placed.add(next.id);out.push(next);}
 return out;}
function planGoalName(s){const g=s.plan.goal;return g.kind==='amount'?'avere '+E.dollars(String(g.target),' ')+'':g.kind==='unlock'?'sbloccare '+(g.name||'il mio obiettivo'):(g.name||'il mio acquisto');}
function planInput(s,strategy=s.plan.strategy){return planExtras(s,planInputBase(s,strategy));}
function planExtras(s,inp){const p=s.plan,useH=p.useHypotheses===true,off=!!(p.offline&&p.offline.on===true),fail=p.includeFailure===true;if(!useH&&!off&&!fail)return inp;
 const o={...inp},d=typeof inp.sessionMinutes==='number'&&inp.sessionMinutes>0?inp.sessionMinutes:null,byId=Object.fromEntries(p.missions.map(m=>[m.id,m]));let ps=null;
 if(useH){
  const sc=simCosts(s);if(sc.total>0)o.upkeepPerSession=(o.upkeepPerSession||0)+sc.total;
  ps=simPassive(s,d);if(ps&&ps.rate>0){o.hourly=(o.hourly||0)+ps.rate;o.passiveSim=ps.rate;}
  const bonus=simBonus(s),auto=shareAutoOn(s),who=moneySplit(s);
  if(o.activities.length&&(bonus!==null||auto||who)){const kept=[],out=[];
   o.activities.forEach(a=>{const m=byId[a.id];if(who&&m&&(m.who==='jason'||m.who==='lucia')&&m.who!==who){out.push({id:a.id,name:a.name,who:m.who});return;}
    let x=a;if(bonus!==null&&typeof x.reward==='number')x={...x,reward:x.reward*(1+bonus/100)};if(auto&&m&&Number.isInteger(m.players)&&m.players>1)x={...x,share:100/m.players};kept.push(x);});
   o.activities=kept;if(out.length)o.excludedByCharacter=out;}
 }
 if(fail&&o.activities.length){const k=failureShare(s);if(k!==null&&k>0&&k<1)o.activities=o.activities.map(a=>a.once?{...a,cost:typeof a.cost==='number'?a.cost/(1-k):a.cost,duration:typeof a.duration==='number'?a.duration/(1-k):a.duration,prep:typeof a.prep==='number'?a.prep/(1-k):a.prep}:{...a,reward:typeof a.reward==='number'?a.reward*(1-k):a.reward,units:typeof a.units==='number'?a.units*(1-k):a.units});}
 if(off)o.offline={cap:p.offline.cap,passiveHourly:ps&&ps.raw>0?ps.raw:0,passiveCap:ps&&ps.raw>0?ps.cap:null};
 return o;}
function planInputBase(s,strategy=s.plan.strategy){const p=s.plan,g=p.goal,si=p.situation;
 const group=Number.isInteger(si.players)&&si.players>0?si.players:1,ammo=ammoPerAttempt(s),excludedMissions=p.source==='missions'?p.missions.filter(m=>(m.players||1)>group).map(m=>({id:m.id,name:m.name,players:m.players})):[];
 return {capital:si.capital,reserve:planReserve(s,strategy),sessionMinutes:si.dailyMinutes,excludedMissions,ammoPerAttempt:ammo,players:group,daysPerWeek:si.daysPerWeek??7,upkeepPerSession:si.upkeepPerSession??0,maxRepeat:p.maxRepeat,goalMeaning:g.kind==='amount'?g.meaning:'available',
  hourly:p.source==='hourly'?si.hourly:0,unitsHourly:p.source==='hourly'&&g.kind==='unlock'?(si.unitsHourly??0):0,
  goalPrice:g.kind==='purchase'?g.price:g.kind==='unlock'?(g.alsoPrice??0):null,target:g.kind==='amount'?g.target:null,targetUnits:g.kind==='unlock'?g.targetUnits:null,currentUnits:g.kind==='unlock'?(g.currentUnits??0):0,
  activities:p.source==='missions'?p.missions.filter(m=>(m.players||1)<=group).map(m=>({id:m.id,name:m.name,reward:m.reward,cost:typeof m.cost==='number'&&ammo&&!m.once?m.cost+ammo:m.cost,duration:m.duration,prep:m.prep,cooldown:m.cooldown,share:m.share,investment:m.investment,owned:m.owned,units:g.kind==='unlock'?m.units:0,requiresPurchaseIds:m.requires,requiresMissions:m.requiresMissions||[],once:m.once===true,done:m.done===true,players:1,ammoSimulated:ammo||0,...(m.minCash!=null?{minCash:m.minCash}:{}),...(m.minRank!=null?{minRank:m.minRank}:{}),...(m.order!=null?{order:m.order}:{})})):[],
  purchases:planPurchases(s,strategy),goalName:planGoalName(s),goalIncomeHourly:g.kind==='purchase'?(g.boostHourly||0):0,
  knownNames:Object.fromEntries([...p.prerequisites.map((x,i)=>[x.id,(typeof x.name==='string'&&x.name.trim())||'Acquisto '+(i+1)]),...p.missions.map((m,i)=>[m.id,(typeof m.name==='string'&&m.name.trim())||'Missione '+(i+1)])]),
  knownMissions:p.missions.map(m=>m.id),...(si.rank!=null?{rank:si.rank}:{})};}
function planMissing(s){const p=s.plan,g=p.goal,si=p.situation;
 if(g.kind==='purchase'&&(g.price===null||!Number.isFinite(g.price)))return 'Scrivi il prezzo del tuo obiettivo, anche il prezzo che immagini.';
 if(g.kind==='amount'&&(g.target===null||!Number.isFinite(g.target)))return 'Scrivi la somma che vuoi avere.';
 if(g.kind==='unlock'&&(g.targetUnits===null||!Number.isFinite(g.targetUnits)))return 'Scrivi a quanti '+g.unitLabel+' bisogna arrivare.';
 if(si.capital===null||!Number.isFinite(si.capital))return 'Scrivi i soldi che hai adesso.';
 if(si.dailyMinutes!==null&&(!Number.isFinite(si.dailyMinutes)||si.dailyMinutes<=0))return 'Una partita dura almeno 1 minuto (o lascia vuoto per un percorso senza partite).';
 if(si.dailyMinutes===null&&(si.upkeepPerSession>0||p.prerequisites.some(x=>x.usagePerSession>0)))return 'Il calcolo delle tue spese per partita richiede la durata di una partita: scrivila.';
 {const todo=p.prerequisites.filter(x=>!x.owned&&(x.price===null||!Number.isFinite(x.price)));if(todo.length)return 'Percorso da completare: scrivi il prezzo di '+todo.map(x=>'“'+x.name+'”').join(', ')+' (anche il prezzo che immagini), o spunta “Ce l’ho già”.';}
 if(p.source==='hourly'&&(si.hourly===null||!Number.isFinite(si.hourly)))return 'Scrivi quanto guadagni all’ora, o scegli le tue missioni.';
 if(p.source==='missions'&&!p.missions.length)return 'Aggiungi almeno una missione che puoi fare.';
 {const m=p.source==='missions'?p.missions.find(x=>x.minRank!=null&&!(x.once&&x.done)):null;if(m&&(si.rank===null||si.rank===undefined||!Number.isFinite(si.rank)))return 'Scrivi il tuo livello in “A che punto sei?”: “'+m.name+'” richiede il livello '+new Intl.NumberFormat('it-IT').format(m.minRank)+'.';}
 if(p.includeFailure===true&&p.source==='missions'&&p.missions.some(m=>!(m.once&&m.done))){const k=failureShare(s);if(k!==null&&k>=1)return 'Con 10 tentativi falliti su 10, nessuna missione riesce: il piano non si può fare. Abbassa “Tentativi falliti su 10” in Le mie ipotesi, oppure togli la spunta da “Contare i tentativi falliti delle mie ipotesi” nel piano.';}
 return null;}
const RULE_WORDS={R1:'un istante illeggibile',R2:'una spesa fatta prima di avere i soldi',R3:'un passo fatto prima di ciò che richiede',R4:'un acquisto pagato due volte',R5:'due azioni nello stesso momento',R6:'un totale diverso dal registro',R7:'un obiettivo annunciato nel momento sbagliato',R8:'un’azione che non sta nella sua partita',R9:'un guadagno all’ora che non corrisponde al tempo giocato',R10:'spese per partita che non corrispondono',R11:'una missione avviata senza i soldi che richiede di avere in tasca',R12:'una missione avviata senza il livello che richiede',R13:'un’entrata offline che non corrisponde alla pausa tra due partite'};
function verifyText(v){const rules=[...new Set((v&&v.violations||[]).map(x=>x.rule))].map(k=>RULE_WORDS[k]||k);return 'Questo programma non supera la verifica indipendente ('+rules.join(', ')+'): non viene proposto. Cambia un numero per rifare il calcolo.';}
const unitsText=n=>new Intl.NumberFormat('it-IT',{maximumFractionDigits:2}).format(Math.round(n*100)/100);
function unreachedNote(r,s){const when=r.continuous?'Dopo '+E.durationText(r.totalMinutes/60)+' di gioco':'Dopo '+r.totalSessions+(E.plural(r.totalSessions)?' partite':' partita');
 const pts=!!(r.rules&&r.rules.units),label=(s&&s.plan&&s.plan.goal&&String(s.plan.goal.unitLabel||'').trim())||'points',target=r.missingUnits>0?r.finalUnits+r.missingUnits:null;
 const have=[];if(!pts||r.goalMoney>0)have.push(E.dollars(fmt(r.finalCash)));if(pts)have.push(unitsText(r.finalUnits)+(target!==null?' su '+unitsText(target):'')+' '+label);
 const lack=[];if(r.missing>0)lack.push(E.dollars(fmt(r.missing)));if(r.missingUnits>0)lack.push(unitsText(r.missingUnits)+' '+label);
 const pend=Array.isArray(r.pendingAcquisitions)?r.pendingAcquisitions.filter(x=>x&&x.minutes>0):[];
 return when+', avresti '+have.join(' e ')+(lack.length?'; mancherebbero '+lack.join(' e ')+'.':pend.length?'; resterebbero '+E.durationText(pend.reduce((t,x)=>t+x.minutes,0)/60)+' di ottenimento per “'+pend.map(x=>x.name).join('”, “')+'”.':'.');}
function planStrategies(s){const missing=planMissing(s);if(missing)return {valid:false,reason:missing,candidates:[],recommended:null,explored:0};
 const ids=['asIs','byPayback','cheapFirst','skipNoBoost','direct','useReserve'],seen={},candidates=[];
 ids.forEach(id=>{const input=planInput(s,id),key=id==='useReserve'?'reserve':input.purchases.map(x=>x.id).join('|');if(id!=='asIs'&&id!=='useReserve'&&seen[key]!==undefined)return;if(id==='useReserve'&&input.reserve===planInput(s,'asIs').reserve)return;seen[key]=id;
  const r=E.missionPlan({...input,journal:false}),removes=input.purchases.filter(x=>!x.owned).length<planInput(s,'asIs').purchases.filter(x=>!x.owned).length;
  candidates.push({id,label:STRATEGY_LABEL[id],valid:r.valid&&r.reached,reason:r.valid?(r.reached?null:r.note):r.reason,reached:r.valid?r.reached:null,missing:r.valid?r.missing:null,unreached:r.valid&&!r.reached,unreachedNote:r.valid&&!r.reached?unreachedNote(r,s):null,totalSessions:r.valid&&r.reached?r.totalSessions:null,totalMinutes:r.valid&&r.reached?r.totalMinutes:null,days:r.valid&&r.reached?r.days:null,finalCash:r.valid?r.finalCash:null,lowCash:r.valid&&r.lowPoint&&Number.isFinite(r.lowPoint.cash)?r.lowPoint.cash:null,reserveKept:input.reserve>0||(s.plan.situation.reserve??0)===0,removes,note:removes?'rimuove un acquisto richiesto':(id==='useReserve'?'spende i soldi tenuti da parte':null)});});
 const ok=candidates.filter(c=>c.valid&&!c.removes),byTime=(a,b)=>(a.totalSessions===null&&b.totalSessions===null?a.totalMinutes-b.totalMinutes:a.totalSessions-b.totalSessions)||b.finalCash-a.finalCash||ids.indexOf(a.id)-ids.indexOf(b.id);
 const priority=['fast','balanced','safe','cheap'].includes(s.plan.priority)?s.plan.priority:'balanced';
 const kept=(s.plan.situation.reserve??0);
 let pool=priority==='fast'?ok:ok.filter(c=>c.reserveKept);
 const bySafety=(a,b)=>((b.lowCash??-Infinity)-(a.lowCash??-Infinity))||byTime(a,b);
 if(!pool.length){const asIs=candidates.find(c=>c.id==='asIs'),usesReserve=ok.find(c=>!c.reserveKept);
  if(!(kept>0&&usesReserve))return {valid:false,reason:(asIs&&asIs.unreached?asIs.reason+' '+asIs.unreachedNote:asIs&&asIs.reason)||'Nessun piano può essere calcolato con questi numeri.',candidates,recommended:null,explored:candidates.length};
  return {valid:true,reason:null,candidates,recommended:null,blocked:true,explored:candidates.length,blockedReason:'Nessun piano tiene i tuoi '+E.dollars(new Intl.NumberFormat('it-IT').format(Math.round(kept)),' ')+' da parte'+(asIs&&asIs.reason?': '+asIs.reason.replace(/\.?$/,'')+'.':'.')+(usesReserve?' Attingendo ai soldi da parte, un piano c’è ('+(usesReserve.totalSessions!==null?usesReserve.totalSessions+(E.plural(usesReserve.totalSessions)?' partite':' partita'):Math.round(usesReserve.totalMinutes)+' min')+', al minimo '+E.dollars(new Intl.NumberFormat('it-IT').format(Math.round(usesReserve.lowCash??0)),' ')+'): per vederlo, scegli “Il più veloce possibile: posso toccare i miei soldi da parte” in “Preferisco”.':' Tieni meno soldi da parte o abbassa le spese, oppure aggiungi una missione meno cara per cominciare.')};}
 const byCost=(a,b)=>((b.finalCash??-Infinity)-(a.finalCash??-Infinity))||byTime(a,b);
 const recommended=pool.slice().sort(priority==='safe'?bySafety:priority==='cheap'?byCost:byTime)[0]?.id||null;
 return {valid:true,reason:null,candidates,recommended,explored:candidates.length};}
function planAlternatives(s,r){if(!r||!r.valid||!r.input)return {valid:false,reason:'Piano non calcolato.',plans:[],results:{}};const obs=planObserved(s);const extra=[];
 if(obs&&obs.hourly!==null&&obs.hourly>0)extra.push({id:'observed',label:'Al ritmo che hai avuto davvero ('+E.dollars(new Intl.NumberFormat('it-IT',{maximumFractionDigits:0}).format(Math.round(obs.hourly)),' ')+' all’ora)',changes:{activities:[],hourly:obs.hourly,unitsHourly:obs.unitsHourly||0},note:'In base ai tuoi aggiornamenti, non alle tue missioni.'});
 return E.missionAlternatives({...r.input,extraPlans:extra});}
function planObserved(s){const log=s.plan.log.filter(e=>e.gain!==null&&e.sessionMinutes>0);if(!log.length)return null;const minutes=log.reduce((a,e)=>a+e.sessionMinutes,0),gain=log.reduce((a,e)=>a+e.gain,0),units=log.reduce((a,e)=>a+(e.unitsGain||0),0);const last=log[log.length-1];
 return {sessions:log.length,minutes,gain,hourly:minutes>0?gain*60/minutes:null,perSession:gain/log.length,unitsHourly:minutes>0?units*60/minutes:0,last:{gain:last.gain,plannedGain:last.plannedGain,gap:last.plannedGain===null?null:last.gain-last.plannedGain,minutes:last.sessionMinutes,at:last.at}};}
function planLogId(o){const t=JSON.stringify(o);let h=2166136261;for(let i=0;i<t.length;i+=1){h^=t.charCodeAt(i);h=Math.imul(h,16777619);}return 'log-'+(h>>>0).toString(36);}
function planDeadline(s,r){if(!s.plan.deadlineDays||!r||!r.valid||!r.input)return null;return E.missionDeadline(r.input,s.plan.deadlineDays);}
function planCurve(r){if(!r||!r.valid)return [];const c=E.missionCurve(r);return c.valid?c.points:[];}
function planNextSession(r){return r&&r.valid&&r.sessions.length?r.sessions[0]:null;}
const OBJECTIVES=['all','income','reserve','given'];
const SIM_LABEL={carburant:'Carburante',entretien:'Manutenzione',reparation:'Riparazioni',assurance:'Assicurazione',revente:'Rivendita',munitions:'Munizioni',soin:'Cura',"revenu-passif":'Entrate dell’attività',echec:'Tentativi falliti',bonus:'Bonus'};
const V=M?M.V:null;
function itemOf(a,ctx){return a&&a.itemId&&ctx&&Array.isArray(ctx.catalogue)?ctx.catalogue.find(x=>x.id===a.itemId)||null:null;}
const num=x=>typeof x==='number'&&Number.isFinite(x);
const fmt=n=>num(n)?new Intl.NumberFormat('it-IT',{maximumFractionDigits:0}).format(Math.round(n)):'?';
function priceV(a,item){if(!a||a.price===null||a.price===undefined)return V.blank();if(item&&num(item.price)&&a.price===item.price){const m=item.fieldMeta?.price||{};const v=V.published({value:a.price,status:m.status||'unverified',source:m.source||null,verifiedAt:m.verifiedAt||null});if(v.source)v.src=v.source;return v;}return V.personal(a.price);}
function totalAcq(a,item){if(!a)return M.total([]);if(a.owned)return M.total([{label:'Già tuo',value:V.personal(0)}]);return M.total([{label:'Prezzo',value:priceV(a,item),field:'price'},{label:'Optional',value:a.extras===null?V.blank():V.personal(a.extras||0),field:'extras'},{label:'Spese obbligatorie iniziali',value:a.fees===null?V.blank():V.personal(a.fees||0),field:'fees'}]);}
function usageOf(s,a,item){
 const u=a&&a.usage||{},on=s.analysis.simulations,sim=s.analysis.sim,type=item?item.type:(a&&!a.itemId&&a.capabilities&&a.capabilities.terrain?'vehicle':null);
 const anySim=['carburant','entretien','reparation','assurance'].some(k=>on[k]);
 if(num(u.perSession))return {perSession:V.personal(u.perSession),lines:[{label:'Costo per partita (il tuo numero)',value:u.perSession,status:'personal'}],missing:[],note:anySim?'Hai scritto un costo per partita: le simulazioni non si sommano (niente doppi conteggi).':null,source:'personal'};
 const lines=[],missing=[];let total=0,any=false;
 if(type==='vehicle'){
  if(on.carburant){const f=sim.carburant;if([f.distance,f.consommation,f.prixUnitaire].every(num)){const v=M.units.fuelPerSession(f.distance,f.consommation,f.prixUnitaire);total+=v;any=true;lines.push({label:'Carburante (simulazione)',value:v,status:'simulated',formula:fmt(f.distance)+' km × '+f.consommation+' L/100 km ÷ 100 × '+f.prixUnitaire+' $/L'});}else missing.push('Carburante: distanza, consumo e prezzo al litro');}
  for(const k of ['entretien','reparation','assurance'])if(on[k]){const v=sim[k].parPartie;if(num(v)){total+=v;any=true;lines.push({label:SIM_LABEL[k]+' (simulation)',value:v,status:'simulated'});}else missing.push(SIM_LABEL[k]+' per partita');}
 }
 if(any&&!missing.length)return {perSession:V.simulated(total),lines,missing,note:null,source:'simulated'};
 if(missing.length)return {perSession:V.blank(),lines,missing,note:'Simulazione incompleta: '+missing.join(', ')+'.',source:'blank'};
 if(type==='vehicle')return {perSession:V.unconfirmed('carburant'),lines,missing,note:'Carburante, manutenzione, riparazioni: nessun costo confermato in GTA VI. Puoi scrivere il tuo numero o scegliere una simulazione.',source:'unconfirmed'};
 if(type==='weapon')return {perSession:V.unconfirmed('munitions'),lines,missing,note:'Munizioni: prezzo e consumo non pubblicati. Puoi scrivere il tuo numero se vuoi contarle.',source:'unconfirmed'};
 return {perSession:V.na('Nessun costo d’uso per questo tipo di acquisto, a meno che tu non ne scriva uno.'),lines,missing,note:null,source:'na'};
}
function resaleOf(s,a){if(!a||a.resale===null||a.resale===undefined)return V.unconfirmed('revente');return V.simulated(a.resale,{note:'Rivendita scelta da te'});}
function purchasableCheck(item,a){
 if(!a||!a.itemId)return {id:'achetable',label:'Acquisto libero',state:'na'};
 if(!item)return {id:'achetable',label:'Scheda non trovata',state:'unknown',detail:'Questa scheda non esiste più nel catalogo: il tuo prezzo resta salvato.'};
 if(item.purchasable===false||item.type==='place')return {id:'achetable',label:'Acquistabile',state:'ko',detail:item.type==='place'?'Un luogo non si compra.':'Questo oggetto non si compra in GTA VI.',fix:{text:'Scegli un oggetto che si possa comprare.'}};
 if(item.purchasable===true)return {id:'achetable',label:'Acquistabile',state:'ok'};
 return {id:'achetable',label:'Acquisto da confermare',state:'assumed',detail:'Rockstar non ha ancora detto se e come si compra: il calcolo presume di sì.'};
}
function cashCond(cc,label){if(!cc)return null;if(cc.owned)return {id:'argent-disponible',label:label||'Pagare subito',state:'na',detail:'Già tuo: niente da pagare.'};return {id:'argent-disponible',label:label||'Pagare subito',state:cc.state==='ok'?'ok':cc.state==='short'?'ko':'unknown',detail:cc.state==='short'?(cc.exact?'Ti mancano ':'Ti mancano almeno ')+E.dollars(fmt(cc.shortfall),' ')+' senza toccare i soldi tenuti da parte.':cc.state==='unknown'?cc.reason:'Rientra nei tuoi soldi disponibili.',fix:cc.state==='short'?{text:'Tieni meno da parte, o guadagna altri '+E.dollars(fmt(cc.shortfall),' ')+' prima.',delta:cc.shortfall}:null};}
function cashFor(s,acq,a){if(a&&a.owned)return {owned:true,state:'ok',shortfall:0};return M.cashCheck({cash:s.goal.capital===null?null:V.personal(s.goal.capital),reserve:s.goal.reserve===null?null:V.personal(s.goal.reserve),spends:acq.rows.map(r=>({label:r.label,value:r.value,field:r.field}))});}
function sessionMinutesOf(s){return num(s.goal.dailyMinutes)&&s.goal.dailyMinutes>0?s.goal.dailyMinutes:null;}
function horizonSessions(s){const h=s.analysis.horizon;if(num(h.sessions))return h.sessions;const d=sessionMinutesOf(s);if(num(h.hours)&&d)return Math.ceil(h.hours*60/d-1e-9);return null;}
function sustain(s,acqValue,perSessionV,sessions){
 const d=sessionMinutesOf(s),h=s.goal.hourly;
 if(!V.usable(perSessionV)||!num(h)||!d||!num(s.goal.capital))return null;
 const earn=h*d/60,net=earn-perSessionV.v;
 const n=num(sessions)?sessions:null;
 const after=n===null||!num(acqValue)?null:s.goal.capital-acqValue+net*n;
 const low=!num(acqValue)?null:Math.min(s.goal.capital-acqValue,after===null?Infinity:after);
 return {earnPerSession:earn,usagePerSession:perSessionV.v,netPerSession:net,sessions:n,after,low:Number.isFinite(low)?low:null,breach:low!==null&&low<(s.goal.reserve||0)-1e-9,state:net<0?'insoutenable':'soutenable'};
}
function explainValues(rows){return rows.filter(Boolean);}
function purchaseAnalysis(s,source,ctx){
 const a=asset(s,s.purchase.key),item=itemOf(a,ctx),acq=totalAcq(a,item),cc=cashFor(s,acq,a),use=usageOf(s,a,item),sessions=horizonSessions(s);
 const cost=M.usageCost({initial:acq.complete?V.personal(acq.value):V.unknown(),perSession:use.perSession,resale:resaleOf(s,a)},{sessions});
 const pc=purchasableCheck(item,a),need=needChecks(s,a,item),conditions=[cashCond(cc),pc,...need].filter(Boolean),adm=M.admission(conditions);
 const role=a?(a.role!=='unknown'?a.role:a.incomeMode==='none'?'unknown':'income'):'unknown';
 const st=sustain(s,acq.complete?acq.value:null,use.perSession,sessions);
 const used=['argent-disponible','reserve','cout-acquisition'],excluded={};
 if(pc.state==='na')excluded.achetable='Acquisto libero: sei tu a descriverlo.';else used.push('achetable');
 if(need.length)used.push('usage-compatible');else excluded['usage-compatible']='Nessuna esigenza d’uso scritta (terreno, posti, carico).';
 if(V.usable(use.perSession)){used.push('cout-usage');if(sessions!==null)used.push('cout-complet','horizon','frequence');else{excluded['cout-complet']='Scrivi in quante partite pensi di usarlo per avere il costo completo.';excluded.horizon='Nessun periodo scritto.';excluded.frequence='Nessun numero di partite scritto.';}}
 else{excluded['cout-usage']=use.source==='na'?'Questo tipo di acquisto non ha costo d’uso, a meno che tu non ne scriva uno.':use.note||'Costo d’uso non scritto.';excluded['cout-complet']='Serve un costo d’uso per andare oltre il prezzo.';excluded.horizon='Serve solo con un costo d’uso.';excluded.frequence='Serve solo con un costo d’uso.';}
 if(num(s.goal.hourly)){used.push('delai-recuperation');}else excluded['delai-recuperation']='Scrivi quanto guadagni all’ora per sapere in quanto tempo recuperi i tuoi soldi.';
 used.push('argent-restant');
 if(role==='income'&&a&&a.incomeMode!=='none')used.push('gain-en-plus');else excluded['gain-en-plus']=role==='pleasure'||role==='comfort'?'Acquisto per piacere o comodità: non calcoliamo nessuna redditività.':'Nessun guadagno in più scritto: non calcoliamo nessuna redditività.';
 if(V.usable(cost.resale))used.push('revente-prevue');else excluded['revente-prevue']='Rivendita: meccanica non confermata; contata solo se scrivi un prezzo di rivendita.';
 const mechanicsOn=Object.keys(s.analysis.simulations).filter(k=>s.analysis.simulations[k]);
 if(use.source==='simulated')used.push('mecanique-simulee');else excluded['mecanique-simulee']=mechanicsOn.length?'Hai scritto il tuo costo per partita: la simulazione non viene aggiunta.':'Nessuna meccanica simulata (carburante, manutenzione…): non inventiamo niente.';
 const values=[{label:'Prezzo',value:acq.rows[0]?.value,unit:'$',field:'f-purchase-price'},{label:'Optional',value:acq.rows[1]?.value,unit:'$',field:'f-purchase-extras'},{label:'Spese obbligatorie iniziali',value:acq.rows[2]?.value,unit:'$',field:'f-purchase-fees'},{label:'Ho già',value:V.from(s.goal.capital),unit:'$',field:'f-purchase-capital'},{label:'Tenuto da parte',value:V.from(s.goal.reserve),unit:'$',field:'f-purchase-reserve'},{label:'Costo per partita',value:use.perSession,unit:'$/partie',field:'f-purchase-usage'},{label:'Partite contate',value:sessions===null?V.blank():V.personal(sessions),unit:'partite',field:'f-analysis-horizon'}];
 const drivers=[];
 if(cc.state==='short')drivers.push({label:'Soldi disponibili',text:'Prezzo, optional e spese obbligatorie superano quello che puoi spendere di '+E.dollars(fmt(cc.shortfall),' ')+'.',factor:'argent-disponible'});
 else if(cc.state==='ok'&&!cc.owned)drivers.push({label:'Soldi disponibili',text:'Si paga tutto adesso senza toccare i soldi tenuti da parte.',factor:'argent-disponible'});
 if(st&&st.state==='insoutenable')drivers.push({label:'Costo d’uso',text:'Ogni partita costa '+E.dollars(fmt(st.usagePerSession),' ')+' e rende solo '+E.dollars(fmt(st.earnPerSession),' ')+': perdi '+E.dollars(fmt(-st.netPerSession),' ')+' per partita.',factor:'cout-usage'});
 else if(st&&st.breach)drivers.push({label:'Soldi da parte nel tempo',text:'Nell’arco di '+st.sessions+' partite, i tuoi soldi scenderebbero sotto quello che tieni da parte.',factor:'reserve'});
 const missing=[];if(acq.missing.length)missing.push({label:acq.missing.map(m=>m.label).join(', '),text:'Senza questo numero, non possiamo dire se puoi pagare.',field:'f-purchase-price',decisive:true});
 const changes=cc.state==='short'?['Tenere '+E.dollars(fmt(cc.shortfall),' ')+' in meno da parte renderebbe possibile l’acquisto adesso.']:[];
 const gp=a&&!a.owned?goalPurchase(s,source,ctx):null,dur=E.durationText||(h=>h+' h');
 if(gp&&gp.valid&&gp.buy&&gp.buy.state==='ok'&&gp.save&&gp.save.hours!==null){
  used.push('avancement');const dl=gp.delayHours;
  drivers.push({label:'Avanzamento verso l’obiettivo',factor:'avancement',text:dl>1e-9?'Con questo acquisto raggiungi il tuo obiettivo dopo '+dur(gp.buy.hours)+' di gioco invece di '+dur(gp.save.hours)+'.':dl<-1e-9?'Con questo acquisto raggiungi il tuo obiettivo prima: '+dur(gp.buy.hours)+' di gioco invece di '+dur(gp.save.hours)+'.':'Questo acquisto non rimanda il tuo obiettivo: '+dur(gp.save.hours)+' di gioco in entrambi i casi.'});
  if(gp.buy.strategy==='late'&&dl>1e-9)drivers.push({label:'Quando comprarlo',factor:s.model==='continuous'?'cout-usage':'gain-en-plus',text:s.model==='continuous'?'Per il tuo obiettivo conviene comprarlo poco prima di raggiungerlo: il suo costo d’uso supera quanto ti fa guadagnare in più.':'Una missione rende lo stesso con o senza questo acquisto: comprarlo prima non avvicina il tuo obiettivo.'});
  if(dl>1e-9&&num(gp.extraThreshold)&&a.incomeMode!=='none')changes.push('Non rimanda più il tuo obiettivo se l’acquisto ti fa guadagnare almeno '+E.dollars(fmt(Math.ceil(gp.extraThreshold-1e-9)),' ')+' in più all’ora.');
 }else if(gp&&gp.valid&&gp.save&&gp.save.hours===null&&gp.buy&&gp.buy.state==='ok'){used.push('avancement');drivers.push({label:'Avanzamento verso l’obiettivo',factor:'avancement',text:gp.save.why==='income'?'Senza questo acquisto, quello che guadagni non basta per raggiungere il tuo obiettivo; con l’acquisto ti servono '+dur(gp.buy.hours)+' di gioco.':'L’attività che hai scelto richiede questo acquisto: senza, il tuo obiettivo non è raggiungibile; con l’acquisto ti servono '+dur(gp.buy.hours)+' di gioco.'});}
 else if(a&&!a.owned)excluded.avancement='Scrivi il tuo obiettivo e quanto guadagni per sapere se questo acquisto lo rimanda.';
 if(gp&&gp.valid&&gp.state.unknowns.includes('temps-partie'))missing.push({label:'Tempo della tua partita',text:'Non scritto: il costo d’uso per partita non è contato nel tempo per il tuo obiettivo.',field:'f-goal-dailyMinutes',decisive:false});
 if(gp&&gp.valid&&gp.buy&&!gp.extraKnown&&a.incomeMode!=='none'&&s.model==='continuous')missing.push({label:'Guadagno in più',text:'Non scritto: conto 0 $ in più per il tuo obiettivo, senza dire che non rende nulla.',field:'f-purchase-boostHourly',decisive:false});
 if(!V.usable(use.perSession)&&use.source==='unconfirmed')missing.push({label:'Costo d’uso',text:'Può cambiare la risposta nel tempo; non è confermato in GTA VI.',field:'f-purchase-usage',decisive:false});
 if(pc.state==='assumed')missing.push({label:'Acquistabile in GTA VI',text:'Non ancora confermato: la risposta presume di sì.',decisive:true});
 const explain=M.explain({tool:'purchase',category:item?item.type:null,aim:'Sapere se puoi pagare questo acquisto adesso, e quanto costa dopo.',horizon:sessions===null?'Adesso (nessuna partita contata dopo l’acquisto)':'Adesso, poi '+sessions+' partite',conditions,used,excluded,values,drivers,missing,changes});
 return {tool:'purchase',asset:a,item,acquisition:acq,cash:cc,usage:use,cost,sustain:st,purchasable:pc,admission:adm,role,sessions,explain};
}
const TERRAIN_TXT={route:'su strada','tout-terrain':'fuoristrada',eau:'sull’acqua',air:'in aria'},terrainText=t=>TERRAIN_TXT[t]||t;
function terrainFits(need,have){const h=have.v;if(need==='eau'||need==='air')return h===need?'ok':'ko';if(need==='route')return h==='route'||h==='tout-terrain'?'ok':'ko';if(need==='tout-terrain')return h==='tout-terrain'?'ok':h==='route'?'unknown':'ko';return 'unknown';}
function needChecks(s,a,item){
 const need=s.analysis.need,checks=[];
 const cap=a&&a.capabilities||{};
 if(need.terrain){const have=cap.terrain?V.personal(cap.terrain):item&&item.type==='vehicle'?M.fromVehicle({cat:item.categoryId||item.category}).terrain:V.unknown();
  const state=have.v===null?'unknown':terrainFits(need.terrain,have);
  checks.push({id:'usage-compatible',label:'Terreno: '+terrainText(need.terrain),state,detail:state==='unknown'?(have.v==='route'&&need.terrain==='tout-terrain'?'Niente indica che vada fuoristrada: scrivilo nelle sue capacità se lo sai.':'Terreno sconosciuto per questo acquisto: scrivilo nelle sue capacità.'):state==='ok'?'Va bene ('+terrainText(have.v)+(have.s==='estimated'?', in base al suo tipo':'')+').':'Non va bene: va '+terrainText(have.v)+'.',fix:state==='ko'?{text:'Scegli un veicolo che vada '+terrainText(need.terrain)+'.'}:null});}
 if(num(need.passengers)&&need.passengers>0){const seats=num(cap.seats)?V.personal(cap.seats):item&&num(item.seats)?V.official(item.seats):V.unknown();checks.push({id:'usage-compatible',label:'Posti: '+need.passengers,state:!V.usable(seats)?'unknown':seats.v>=need.passengers?'ok':'ko',detail:!V.usable(seats)?'Numero di posti sconosciuto: scrivilo se lo sai.':seats.v>=need.passengers?seats.v+' posti.':'Solo '+seats.v+' posti.',fix:{text:'Scegli un veicolo con almeno '+need.passengers+' posti.'}});}
 if(need.cargo){const cargo=cap.cargo===null||cap.cargo===undefined?V.unknown():V.personal(cap.cargo);checks.push({id:'usage-compatible',label:'Carico',state:!V.usable(cargo)?'unknown':cargo.v>0?'ok':'ko',detail:!V.usable(cargo)?'Capacità di carico sconosciuta.':cargo.v>0?'Può trasportare carichi.':'Non trasporta niente.'});}
 return checks;
}
function compareAnalysis(s,source,ctx){
 const sessions=horizonSessions(s),rows=[],names=compareNames(s);
 s.compare.keys.forEach(k=>{const a=asset(s,k);if(!a)return;const item=itemOf(a,ctx),acq=totalAcq(a,item),use=usageOf(s,a,item),cost=M.usageCost({initial:acq.complete?V.personal(acq.value):V.unknown(),perSession:use.perSession},{sessions});
  const cc=cashFor(s,acq,a),pc=purchasableCheck(item,a),need=needChecks(s,a,item),conditions=[pc,...need].filter(Boolean),adm=M.admission(conditions);
  rows.push({key:k,name:names[k],asset:a,item,acquisition:acq,usage:use,cost,cash:cc,conditions,admission:adm,utility:a.utility,income:a.incomeMode==='personal'&&a.boostHourly>0?a.boostHourly:null});});
 if(rows.some(r=>r.usage.source==='personal'||r.usage.source==='simulated'))for(const r of rows)if(r.usage.source==='na'){
  r.usage={perSession:V.blank(),lines:[],missing:['Costo d’uso di “'+r.name+'” (non indicato)'],note:'Costo d’uso non indicato: un’altra opzione ne ha uno. Scrivi 0 se davvero non ce l’ha.',source:'blank'};
  r.cost=M.usageCost({initial:r.acquisition.complete?V.personal(r.acquisition.value):V.unknown(),perSession:r.usage.perSession},{sessions});}
 const admissible=rows.filter(r=>r.admission.state==='admissible'||r.admission.state==='conditionnel'||r.admission.state==='inconnu');
 const excluded=rows.filter(r=>r.admission.state==='impossible');
 const P=M.pareto(admissible.map(r=>({id:r.key,admission:{state:'admissible'},values:{now:r.acquisition.complete?r.acquisition.value:null,total:r.cost.total.complete&&sessions!==null&&V.usable(r.usage.perSession)?r.cost.total.value:null,envie:-(r.utility||0)}})),['now','total','envie']);
 let cross=null;const priced=admissible.filter(r=>r.acquisition.complete&&V.usable(r.usage.perSession)).sort((x,y)=>x.acquisition.value-y.acquisition.value);
 if(priced.length>=2){const A=priced[0],Bq=priced[1],x=M.crossover({initial:A.acquisition.value,rate:A.usage.perSession.v},{initial:Bq.acquisition.value,rate:Bq.usage.perSession.v});if(x.known&&x.n!==null)cross={a:A.name,b:Bq.name,n:x.n,before:x.before==='a'?A.name:Bq.name,after:x.after==='a'?A.name:Bq.name,costAt:x.costAt};}
 const partial=admissible.filter(r=>!r.acquisition.complete||(sessions!==null&&!r.cost.total.complete&&r.usage.source!=='na'));
 return {tool:'compare',rows,admissible,excluded,pareto:P,crossover:cross,partial,sessions};
}
function orderAnalysis(s,source,ctx){
 const keys=s.order.keys.filter(k=>asset(s,k)),d=sessionMinutesOf(s),objective=OBJECTIVES.includes(s.order.objective)?s.order.objective:'all';
 const items=keys.map(k=>{const a=asset(s,k),item=itemOf(a,ctx),use=usageOf(s,a,item);let boost=a.owned?0:a.incomeMode==='personal'?a.boostHourly:0;if(a.incomeMode==='roi'){const r=roi(s,source);boost=s.roi.key===k&&['new','improve'].includes(roiMode(s))&&r.valid&&Number.isFinite(r.netHourly)?Math.max(0,r.netHourly):null;}
  const costHourly=V.usable(use.perSession)&&d?use.perSession.v*60/d:0;
  return {id:k,name:a.name+(a.owned?' (già posseduto)':''),price:a.owned?0:a.price===null||a.extras===null||a.fees===null?null:a.price+a.extras+a.fees,boostHourly:a.owned?0:boost,costHourly:a.owned?0:costHourly,before:(a.requires||[]).filter(r=>keys.includes(r)),unlocks:a.unlocks||[],owned:a.owned,usage:use};});
 const unknown=items.filter(x=>x.price===null);
 const unmet=[];keys.forEach(k=>{const a=asset(s,k);(a.requires||[]).forEach(r=>{if(keys.includes(r))return;const dep=asset(s,r);if(dep&&dep.owned)return;unmet.push({id:k,name:a.name,requires:r,requiresName:dep?dep.name:'un acquisto rimosso'});});});
 if(unmet.length)return {tool:'order',valid:false,reason:unmet.map(u=>'“'+u.name+'” richiede prima “'+u.requiresName+'”, che non è più nel carrello').join('; ')+'. Rimettilo nel carrello, spuntalo come “già posseduto”, o togli la dipendenza (Modifica).',items,objective,unmet};
 const graph={};items.forEach(x=>{graph[x.id]={id:x.id,name:x.name,requires:x.before,price:x.price===null?V.unknown():V.personal(x.price)};});
 const deps=M.prerequisites({nodes:graph,targets:items.map(x=>x.id)});
 if(deps.cycles.length)return {tool:'order',valid:false,reason:deps.reason,items,deps,objective};
 if(unknown.length)return {tool:'order',valid:false,incomplete:true,reason:'Percorso da completare: scrivi il prezzo di '+unknown.map(x=>'“'+x.name+'”').join(', ')+' (anche il prezzo che immagini).',items,deps,objective,unknown};
 const memo=new Map(),run=order=>{const k=order.join('\u0001');if(!memo.has(k))memo.set(k,runOnce(order));return memo.get(k);};
 const runOnce=order=>{const r=E.order({capital:s.goal.capital,reserve:s.goal.reserve,hourly:orderHourly(s),deferLosses:true,items:order.map(id=>items.find(x=>x.id===id))});
  if(!r.valid)return {valid:false,reason:r.blockedIndex!==undefined&&upkeepEats(s)?UPKEEP_EATS:r.reason,key:[Infinity]};
  let firstIncome=null;r.steps.forEach((st,i)=>{const it=items.find(x=>x.id===order[i]);if(firstIncome===null&&it.boostHourly>0)firstIncome=st.timeHours;});
  const low=r.steps.reduce((m,st)=>Math.min(m,st.capital),s.goal.capital);
  const out={valid:true,result:r,firstIncome,low};out.key=orderKey(objective,out);return out;};
 const pack=(order,run)=>({order,run,result:run.valid?run.result:null,valid:run.valid,reason:run.valid?null:run.reason});
 const given=pack(keys,run(keys));
 const noBuy=keys.length<2?null:(()=>{const it=items.map(x=>x);const r=E.order({capital:s.goal.capital,reserve:s.goal.reserve,hourly:orderHourly(s),items:[{name:it.map(x=>x.name).join(' + '),price:it.reduce((t,x)=>t+x.price,0),boostHourly:it.reduce((t,x)=>t+(x.boostHourly||0),0),costHourly:it.reduce((t,x)=>t+(x.costHourly||0),0)}]});
  if(!r.valid)return {label:'Niente fino alla fine, poi tutto in una volta',order:null,valid:false,reason:r.reason,result:null,run:null};
  const runR={valid:true,result:r,firstIncome:it.some(x=>x.boostHourly>0)?r.steps[0].timeHours:null,low:Math.min(s.goal.capital,r.steps[0].capital)};
  return {label:'Niente fino alla fine, poi tutto in una volta',order:null,valid:true,reason:null,result:r,run:runR};})();
 const manual=keys.length<2?[]:[{label:'Ordine inverso',order:keys.slice().reverse()},{label:'Prezzi crescenti',order:keys.slice().sort((a,b)=>((items.find(x=>x.id===a)||{}).price??1e12)-((items.find(x=>x.id===b)||{}).price??1e12))}].map(m=>({label:m.label,...pack(m.order,run(m.order))}));
 if(objective==='given'||keys.length<2)return {tool:'order',valid:given.valid,reason:given.reason,items,deps,objective,best:given,given,manual,noBuy,flip:null,search:{method:'given',explored:1,note:'Il tuo ordine, così com’è.'},alternatives:[]};
 const search=M.sequences(items.map(x=>({id:x.id,before:x.before})),run);
 if(!search.best)return {tool:'order',valid:false,reason:(search.invalid[0]&&search.invalid[0].result.reason)||'Nessun ordine possibile con questi numeri.',items,deps,objective,given,manual,noBuy,flip:null,search:{method:search.method,explored:search.explored,note:search.note},alternatives:[]};
 const best=pack(search.best.order,search.best.result);
 const alternatives=[];
 for(const other of OBJECTIVES.filter(o=>o!=='given'&&o!==objective)){const alt=bestFor(other,items,run);if(alt&&alt.order.join()!==best.order.join()&&!alternatives.some(x=>x.order.join()===alt.order.join()))alternatives.push({objective:other,...pack(alt.order,alt.run)});}
 return {tool:'order',valid:true,items,deps,objective,best,given,manual,noBuy,flip:objective==='all'?orderFlip(s,items,best.order):null,search:{method:search.method,explored:search.explored,note:search.note},alternatives};
}
function orderFlip(s,items,order){
 if(order.length<2)return null;const A=items.find(x=>x.id===order[0]),Bi=items.find(x=>x.id===order[1]);if(!A||!Bi||Bi.before.includes(A.id))return null;
 const swapped=[order[1],order[0]].concat(order.slice(2)),T=(ord,p)=>{const r=E.order({capital:s.goal.capital,reserve:s.goal.reserve,hourly:orderHourly(s),deferLosses:true,items:ord.map(id=>{const x=items.find(y=>y.id===id);return id===A.id?{...x,price:p}:x;})});return r.valid?r.totalHours:Infinity;};
 const f=p=>T(swapped,p)<T(order,p)-1e-9;
 if(f(A.price)||T(order,A.price)===Infinity)return null;
 let lo=A.price,hi=null;for(let p=Math.max(1000,A.price*2),k=0;k<40&&p<=1e12;k+=1,p*=2){if(f(p)){hi=p;break;}lo=p;}
 if(hi===null)return null;
 for(let k=0;k<60&&hi-lo>0.5;k+=1){const mid=(lo+hi)/2;if(f(mid))hi=mid;else lo=mid;}
 const X=Math.round(hi);if(![X+1,X*1.5,X*3,X*10].every(f))return null;
 return {first:A.id,second:Bi.id,firstName:A.name,secondName:Bi.name,price:X};
}
function orderKey(objective,r){return objective==='income'?[r.firstIncome===null?Infinity:r.firstIncome,r.result.totalHours]:objective==='reserve'?[-r.low,r.result.totalHours]:[r.result.totalHours,-(r.result.finalHourly||0)];}
function bestFor(objective,items,runBase){const sr=M.sequences(items.map(x=>({id:x.id,before:x.before})),order=>{const r=runBase(order);return r.valid?{...r,key:orderKey(objective,r)}:r;});return sr.best?{order:sr.best.order,run:sr.best.result}:null;}
function budgetAnalysis(s,source,ctx){
 const basket=s.budget.source==='basket';
 const rows=basket?s.order.keys.map(k=>{const a=asset(s,k);if(!a)return null;const item=itemOf(a,ctx),acq=totalAcq(a,item),use=usageOf(s,a,item);return {label:a.name,value:acq.complete?(a.owned?V.personal(0):V.personal(acq.value)):V.blank(),usage:use,owned:a.owned,field:null,item};}).filter(Boolean):s.budget.allocations.map((v,i)=>({label:['Veicoli','Investimenti','Equipaggiamento','Consumabili','Altri acquisti'][i],value:V.personal(v),usage:null}));
 rows.push({label:'Altre spese previste',value:V.personal(s.budget.extra||0),usage:null});
 const spend=M.total(rows.map(r=>({label:r.label,value:r.value})));
 const usageRows=rows.filter(r=>r.usage&&!r.owned),unconfirmedUsage=usageRows.filter(r=>r.usage.perSession&&r.usage.perSession.s==='unconfirmed').map(r=>r.label);
 const perSession=M.total(usageRows.map(r=>({label:'Uso di '+r.label,value:r.usage.perSession})).filter(p=>p.value.s!=='unconfirmed'));
 if(unconfirmedUsage.length)perSession.complete=false;perSession.unconfirmed=unconfirmedUsage;
 const sessions=horizonSessions(s),d=sessionMinutesOf(s),psB=simPassive(s,d),earn=num(s.goal.hourly)&&d?(psB&&psB.rate>0?(s.goal.hourly+psB.rate)*d/60:s.goal.hourly*d/60):null;
 const up=upkeepOf(s);
 let flow=null;
 if(sessions!==null&&num(s.goal.capital)){const events=[{t:0,type:'spend',amount:spend.value,label:'Acquisti (subtotale noto)'}];for(let i=1;i<=Math.min(sessions,400);i+=1){if(earn!==null)events.push({t:i,type:'receive',amount:earn,label:'Guadagno della partita '+i});if(up>0)events.push({t:i,type:'spend',amount:up,label:'Spese per partita (partita {i})'.replace('{i}',i)});if(perSession.value>0)events.push({t:i,type:'spend',amount:perSession.value,label:'Uso (partita '+i+')'});}flow={sessions,earn,upkeep:up,usage:perSession.value,usageComplete:perSession.complete,ledger:M.ledger(s.goal.capital,events,s.goal.reserve||0)};}
 return {tool:'budget',spend,perSession,flow,rows,sessions};
}
function goalTarget(s){const g=s.goal;if(g.target===null)return null;let t=g.target;const meaning=['held','available','cumulative'].includes(g.meaning)?g.meaning:'available';
 if(meaning==='held')t=Math.max(0,t-(g.reserve||0));else if(meaning==='cumulative')t=t+Math.max(0,(g.capital||0)-(g.reserve||0));
 if(num(g.plannedSpend)&&g.plannedSpend>0)t+=g.plannedSpend;return t;}
function goalAnalysis(s,source,ctx,r){
 const g=s.goal,meaning=['held','available','cumulative'].includes(g.meaning)?g.meaning:'available',d=sessionMinutesOf(s);
 let deadline=null;
 if(num(g.deadlineDays)&&g.deadlineDays>0&&r&&r.valid){const days=r.days;if(days===null||days===undefined){deadline={known:false,reason:'Scrivi il tuo tempo di gioco al giorno per avere una scadenza in giorni.'};}
  else if(days<=g.deadlineDays)deadline={known:true,feasible:true,days,spare:g.deadlineDays-days};
  else{let minutes=null;for(let m=Math.ceil((d||1)/15)*15+15;m<=1440;m+=15){const t=evaluate('goal',{...s,goal:{...s.goal,dailyMinutes:m,deadlineDays:null}},source);if(t.valid&&t.days<=g.deadlineDays){minutes=m;break;}}
   let hourly=null;if(s.model==='continuous'&&num(g.hourly)&&g.hourly>0){let lo=g.hourly,hi=g.hourly*64;const ok=evaluate('goal',{...s,goal:{...s.goal,hourly:hi,deadlineDays:null}},source);if(ok.valid&&ok.days<=g.deadlineDays){for(let i=0;i<40;i+=1){const mid=(lo+hi)/2,t=evaluate('goal',{...s,goal:{...s.goal,hourly:mid,deadlineDays:null}},source);if(t.valid&&t.days<=g.deadlineDays)hi=mid;else lo=mid;}hourly=Math.ceil(hi/100)*100;}}
   deadline={known:true,feasible:false,days,over:days-g.deadlineDays,requiredDailyMinutes:minutes,requiredHourly:hourly};}}
 return {tool:'goal',meaning,target:goalTarget(s),plannedSpend:num(g.plannedSpend)?g.plannedSpend:null,upkeep:num(g.upkeepPerSession)?g.upkeepPerSession:null,deadline};
}
function failureShare(s){return s.analysis.simulations.echec&&num(s.analysis.sim.echec.tentativesRatees)?Math.min(10,Math.max(0,s.analysis.sim.echec.tentativesRatees))/10:null;}
function activitiesAnalysis(s,source,ctx){
 const minutes=s.inverse.minutes,rank=[];
 activities(s,source).forEach(a=>{const reasons=[];if(onceOnly(a))reasons.push(ONCE_REASON);if(a.otherCharacter)reasons.push(otherReason(a,s));if(a.players>s.goal.players)reasons.push('si gioca in '+a.players+' giocatori, siete in '+s.goal.players);const miss=(a.requiresPurchaseIds||[]).filter(id=>!s.assets.some(x=>x.itemId===id&&x.owned));if(miss.length)reasons.push('bisogna prima avere '+miss.map(id=>(ctx&&ctx.catalogue&&ctx.catalogue.find(c=>c.id===id)?.name)||id).join(', '));
  const one=E.activity(a);if(!one.valid){rank.push({id:a.id,name:a.name,valid:false,reason:one.reason,excluded:reasons});return;}
  const r=num(minutes)?E.inverse({minutes,capital:s.goal.capital,reserve:s.goal.reserve,activity:a}):null;
  let fail=null;const k=failureShare(s);if(k!==null&&r&&r.valid&&r.runs){const reward=(a.reward||0)*(a.share??100)/100,cost=a.cost||0,okRuns=Math.round(r.runs*(1-k)),badRuns=r.runs-okRuns;fail={share:k,okRuns,badRuns,profit:okRuns*reward-r.runs*cost-(a.investment&&!a.owned?a.investment:0)};}
  rank.push({id:a.id,name:a.name,valid:true,hourly:one.hourly,net:one.net,cycle:one.cycleMinutes,profit:r&&r.valid?r.profit:null,runs:r&&r.valid?r.runs:null,reason:r&&!r.valid?r.reason:null,excluded:reasons,fail});});
 const ok=rank.filter(x=>x.valid&&!x.excluded.length&&x.profit!==null);ok.sort((x,y)=>y.profit-x.profit||y.hourly-x.hourly);
 let mix=null;if(ok.length>1&&num(minutes)&&minutes>0){const acts=activities(s,source).filter(a=>ok.some(o=>o.id===a.id)),sp=E.sessionPlan({capital:s.goal.capital,reserve:s.goal.reserve,minutes,maxRepeat:256,activities:acts});
  if(sp.valid&&sp.runs&&sp.profit>ok[0].profit+0.5){const parts=(sp.breakdown||[]).filter(b=>b.runs>0);if(parts.length>1)mix={profit:sp.profit,gain:sp.profit-ok[0].profit,parts:parts.map(b=>({id:b.id,name:b.name,runs:b.runs})),exhaustive:sp.exhaustive===true};}}
 return {tool:'activities',rank,accessible:ok,excludedList:rank.filter(x=>x.excluded.length),best:ok[0]||null,mix,failureShare:failureShare(s)};
}
function sessionAnalysis(s,source,ctx){
 const out=[];activities(s,source).forEach(a=>{const reasons=[];if(onceOnly(a))reasons.push(ONCE_REASON);if(a.otherCharacter)reasons.push(otherReason(a,s));if(!s.session.enabled.includes(a.id))reasons.push('non spuntata');if(a.players>s.goal.players)reasons.push('si gioca in '+a.players+' giocatori');const miss=(a.requiresPurchaseIds||[]).filter(id=>!s.assets.some(x=>x.itemId===id&&x.owned));if(miss.length)reasons.push('acquisto mancante');const one=E.activity(a);if(!one.valid)reasons.push('numeri da completare');else{if(num(s.session.minutes)&&one.activeMinutes>s.session.minutes)reasons.push('non sta in '+s.session.minutes+' min');if(one.net<=0)reasons.push('non rende più delle sue spese');}out.push({id:a.id,name:a.name,reasons});});
 return {tool:'session',activities:out,excluded:out.filter(x=>x.reasons.length),kept:out.filter(x=>!x.reasons.length)};
}
function roiAnalysis(s,source,ctx){
 const a=asset(s,s.roi.key),item=itemOf(a,ctx),acq=totalAcq(a,item),cc=cashFor(s,acq,a),use=usageOf(s,a,item),d=sessionMinutesOf(s);
 const hoursH=num(s.roi.hours)?s.roi.hours:null,sessions=hoursH!==null&&d?Math.ceil(hoursH*60/d-1e-9):null;
 const cost=M.usageCost({initial:acq.complete?V.personal(acq.value):V.unknown(),perSession:use.perSession,resale:resaleOf(s,a)},{sessions});
 const usagePerHour=V.usable(use.perSession)&&d?use.perSession.v*60/d:null;
 const pc=purchasableCheck(item,a),conditions=[cashCond(cc,'Pagare subito'),pc].filter(Boolean),adm=M.admission(conditions);
 return {tool:'roi',asset:a,item,acquisition:acq,cash:cc,usage:use,usagePerHour,cost,sessions,purchasable:pc,admission:adm,hours:hoursH};
}
function planAnalysis(s,source,ctx,r){
 const p=s.plan,nodes={};
 p.prerequisites.forEach(x=>{nodes[x.id]={id:x.id,name:x.name,kind:'item',price:x.price===null?V.blank():V.personal(x.price),minutes:num(x.minutes)?V.personal(x.minutes):V.na(),requires:(x.requires||[]).slice()};});
 p.missions.forEach(m=>{nodes[m.id]={id:m.id,name:m.name,kind:m.once?'unlock':'activity',minutes:num(m.duration)?V.personal((m.duration||0)+(m.prep||0)):V.blank(),requires:[...(m.requires||[]),...(m.requiresMissions||[])]};});
 const owned=[...p.prerequisites.filter(x=>x.owned).map(x=>x.id),...p.missions.filter(m=>m.done).map(m=>m.id)];
 const targets=p.source==='missions'?p.missions.filter(m=>!m.once).map(m=>m.id):p.prerequisites.map(x=>x.id);
 const chain=M.prerequisites({nodes,targets,owned});
 const incomplete=p.prerequisites.filter(x=>!x.owned&&(x.price===null||!num(x.price))).map(x=>({id:x.id,name:x.name,field:'plan-p-'+p.prerequisites.indexOf(x)+'-price'}));
 const low=r&&r.valid&&r.lowPoint?r.lowPoint:null;
 return {tool:'plan',chain,incomplete,low,meaning:p.goal.meaning,continuous:r?!!r.continuous:false};
}
const H=n=>{if(!num(n))return '?';const m=Math.ceil(n*60-1e-8);return m<60?m+' min':Math.floor(m/60)+' h'+(m%60?' '+String(m%60).padStart(2,'0')+(typeof document!=='undefined'&&/^de/.test(document.documentElement.lang||'')?' min':''):'');};
const MEANING={held:'i soldi che avrai in tutto (compresi i soldi tenuti da parte)',available:'i soldi disponibili oltre a quelli che tieni da parte',cumulative:'i soldi guadagnati da adesso in poi, senza contare quelli che hai già'};
function vPers(v){return v===null||v===undefined?V.blank():V.personal(v);}
function missingLabel(reason){const t=String(reason||''),pt=E.lang==='pt';if(pt?/Percurso a completar/.test(t):/Parcours à compléter|Path to complete|Recorrido por completar|Percorso da completare|Weg vervollständigen/.test(t))return 'Percorso da completare';if(pt?/^(Escreva|Diga|Escolha|Adicione|Anote)/.test(t):/^(Écris|Dis|Choisis|Ajoute|Note|Enter|Write|Tell|Choose|Pick|Add|Escribe|Dime|Dinos|Elige|Añade|Anota|Indica|Scrivi|Dimmi|Dicci|Scegli|Aggiungi|Annota|Gib|Sag|Wähle|Füge|Notiere|Trag)/.test(t))return 'Da scrivere';if(pt?/exige|\bpedem?\b|precisa antes|bloque|imposs[íi]vel|nenhum plano|nenhuma miss[ãa]o|n[ãa]o rende|s[óo] rende|n[ãa]o d[áa] dinheiro|n[ãa]o gera|requer/i.test(t):/demande|bloqu|impossible|Aucun plan|aucune mission|ne rapporte|requires|needs|block|no plan|no mission|earns nothing|pide|bloque|imposible|ning[úu]n plan|ninguna misi[óo]n|no rinde|no da dinero|no genera|requiere|necesita|richiede|blocc|impossibil|nessun piano|nessuna missione|non rende/i.test(t))return 'Blocco';return 'Da correggere';}
function explainGoal(s,source,r,x){
 const g=s.goal,cycles=s.model==='cycles',used=['argent-disponible','reserve','gain-net','avancement'],excluded={},values=[],drivers=[],missing=[],changes=[],conditions=[];
 values.push({label:'Ho già',value:vPers(g.capital),unit:'$',field:'f-goal-capital'},{label:'Voglio avere',value:vPers(g.target),unit:'$',field:'f-goal-target',text:'Sono '+MEANING[x.meaning]+'.'},{label:'Tenuto da parte',value:vPers(g.reserve),unit:'$',field:'f-goal-reserve'});
 if(num(g.plannedSpend)&&g.plannedSpend>0)values.push({label:'Spese previste prima dell’obiettivo',value:V.personal(g.plannedSpend),unit:'$',field:'f-goal-plannedSpend'});
 if(!cycles){values.push({label:'Guadagno all’ora',value:vPers(g.hourly),unit:'$/h',field:'f-goal-hourly'});excluded.joueurs='In modalità “poco a poco” non ci sono missioni di gruppo.';excluded['temps-actif']='Niente missioni in modalità “poco a poco”: il tuo guadagno all’ora conta già tutto.';excluded.attente='Nessuna attesa tra le missioni in modalità “poco a poco”.';excluded.versement='In modalità “poco a poco” i soldi arrivano mentre giochi; passa a “alla fine di ogni missione” per contare le ricompense intere.';}
 else{used.push('joueurs','temps-actif','attente','versement');conditions.push({id:'joueurs',label:'Giocatori: '+g.players,state:r.valid||!/joueurs|players|jugadores|giocatori|jogadores/.test(r.reason||'') ?'ok':'ko',detail:r.valid?'L’attività si gioca con il tuo numero di giocatori.':r.reason});}
 if(num(g.dailyMinutes)){used.push('temps-partie','horizon');values.push({label:'Gioco ogni giorno',value:V.personal(g.dailyMinutes),unit:'min',field:'f-goal-dailyMinutes'});if(cycles)conditions.push({id:'temps-partie',label:'Una missione ci sta nella tua partita',state:r.valid||!/temps de jeu par jour|play time per day|tiempo de juego por d[íi]a|tempo di gioco al giorno|tempo de jogo por dia/.test(r.reason||'') ?'ok':'ko',detail:r.valid?'Ogni missione, preparazione compresa, sta in '+g.dailyMinutes+' min.':r.reason,fix:{text:'Gioca più a lungo ogni giorno o scegli una missione più corta.'}});}
 else{excluded['temps-partie']='Tempo di gioco al giorno non scritto: ti diamo il tempo di gioco, non il numero di giorni.';excluded.horizon='Senza tempo al giorno, niente calendario.';}
 if(num(g.upkeepPerSession)&&g.upkeepPerSession>0){used.push('cout-usage');values.push({label:'Spese per partita',value:V.personal(g.upkeepPerSession),unit:'$/partie',field:'f-goal-upkeepPerSession'});drivers.push({label:'Spese per partita',text:cycles?'Aggiungono '+E.dollars(fmt(r.upkeepTotal),' ')+' da guadagnare su tutto il percorso.':'Abbassano il tuo guadagno a '+E.dollars(fmt(r.hourly),' ')+' all’ora.',factor:'cout-usage'});}
 else excluded['cout-usage']=cycles?'Le spese di ogni missione sono già nel suo guadagno netto; nessun’altra spesa per partita scritta.':'Nessuna spesa per partita scritta (consumabili, munizioni…).';
 if(r.valid){drivers.unshift({label:'Quello che manca',text:E.dollars(fmt(r.missing),' ')+' da guadagnare'+(cycles?' con missioni intere, spese pagate prima e ricompensa alla fine':' al ritmo di '+E.dollars(fmt(r.hourly),' ')+' all’ora')+'.',factor:'gain-net'});
  {const k=failureShare(s);if(k!==null&&cycles){used.push('scenario-echec');const a=activities(s,source).find(z=>z.id===g.selected);if(a&&r.runs&&(a.reward||0)>0){const reward=(a.reward||0)*(a.share??100)/100,cost=a.cost||0,netOk=reward-cost,perAttempt=(1-k)*reward-cost;drivers.push({label:'Se alcuni tentativi falliscono',text:perAttempt>0?'Con '+Math.round(k*10)+' tentativi falliti su 10, servirebbero circa '+Math.ceil(r.runs*netOk/perAttempt)+' tentativi invece di '+r.runs+' (spese pagate ogni volta, ricompensa solo quando va a buon fine).':'Con '+Math.round(k*10)+' tentativi falliti su 10, questa missione non rende più niente: l’obiettivo non è raggiungibile così.',factor:'scenario-echec'});}}
   else if(k!==null)excluded['scenario-echec']='In modalità “poco a poco” non ci sono tentativi da fallire: abbassa il tuo guadagno all’ora se vuoi essere prudente.';
   else excluded['scenario-echec']='Il calcolo presume che ogni tentativo vada a buon fine; aggiungi uno scenario di tentativi falliti in modalità Esperto se vuoi essere prudente.';}
  if(x.deadline&&x.deadline.known){if(x.deadline.feasible)drivers.push({label:'Scadenza',text:'Fattibile: '+x.deadline.days+' giorni su '+g.deadlineDays+'.'});else{drivers.push({label:'Scadenza',text:'Non fattibile a questo ritmo: '+x.deadline.days+' giorni invece di '+g.deadlineDays+'.'});if(x.deadline.requiredDailyMinutes)changes.push('Giocare '+x.deadline.requiredDailyMinutes+' min al giorno rispetterebbe la scadenza.');if(x.deadline.requiredHourly)changes.push('Guadagnare '+E.dollars(fmt(x.deadline.requiredHourly),' ')+' all’ora rispetterebbe la scadenza.');}}}
 else missing.push({label:missingLabel(r.reason),text:r.reason,decisive:true});
 if(!cycles&&num(g.hourly))changes.push('Il tempo cambia in proporzione al tuo guadagno all’ora: 20% in più, 17% di tempo in meno.');
 return M.explain({tool:'goal',aim:'Il tempo di gioco per avere '+MEANING[x.meaning]+'.',horizon:num(g.dailyMinutes)?'Fino all’obiettivo, in partite di '+g.dailyMinutes+' min al giorno':'Fino all’obiettivo (senza calendario)',conditions,used,excluded,values,drivers,missing,changes});
}
function explainSession(s,source,r,x){
 const used=['argent-disponible','reserve','possession-requise','joueurs','temps-partie','ressource-exclusive','gain-net','temps-actif','attente','versement','variete'],excluded={'cout-usage':'Le spese di ogni missione si pagano prima di farla; nessun’altra spesa per partita in questo calcolo.'};
 const conditions=x.activities.map(a=>({id:'possession-requise',label:a.name,state:a.reasons.length?'ko':'ok',detail:a.reasons.length?'Esclusa: '+a.reasons.join(', ')+'.':'Possibile nella tua partita.'}));
 const drivers=[];if(r.valid){drivers.push({label:'Programma',text:r.runs+(E.plural(r.runs)?' missioni':' missione')+', '+E.dollars(fmt(r.profit),' ')+' guadagnati in '+r.totalMinutes+' min; ogni ricompensa arriva alla fine della sua missione.'});if(r.limited)drivers.push({label:'Ricerca limitata',text:'Miglior programma trovato tra quelli provati: forse ce n’è uno migliore.'});
  }
 const k=failureShare(s);if(k!==null){used.push('scenario-echec');if(r.valid&&r.runs){const acts=activities(s,source),gross=(r.timeline||[]).reduce((sum,st)=>{const a=acts.find(z=>z.id===st.id);return sum+(a?(a.reward||0)*(a.share??100)/100:0);},0);drivers.push({label:'Se alcuni tentativi falliscono',text:'Con '+Math.round(k*10)+' tentativi falliti su 10: circa '+E.dollars(fmt(Math.round(r.profit-k*gross)),' ')+' invece di '+E.dollars(fmt(r.profit),' ')+' (spese pagate, nessuna ricompensa).',factor:'scenario-echec'});}}
 else excluded['scenario-echec']='Il calcolo presume che ogni missione vada a buon fine; aggiungi uno scenario di tentativi falliti in modalità Esperto se vuoi essere prudente.';
 const values=[{label:'Durata della partita',value:vPers(s.session.minutes),unit:'min',field:'f-session-minutes'},{label:'Giocatori',value:vPers(s.goal.players),unit:'giocatori',field:'session-players'},{label:'Ho già',value:vPers(s.goal.capital),unit:'$',field:'session-capital'},{label:'Tenuto da parte',value:vPers(s.goal.reserve),unit:'$',field:'session-reserve'}];
 const up=num(s.goal.upkeepPerSession)&&s.goal.upkeepPerSession>0?s.goal.upkeepPerSession:0;
 if(up>0){used.push('cout-usage');delete excluded['cout-usage'];values.push({label:'Spese per partita',value:V.personal(up),unit:'$/partie',field:'f-goal-upkeepPerSession'});const pr=r.valid?projection(s,source,r):null,eats=!!(pr&&pr.valid&&pr.missingAfter>0&&pr.sessionsLeft===null&&!pr.calendarReason);
  drivers.push({label:'Spese per partita',text:eats?'Le tue spese per partita ('+E.dollars(fmt(up))+') si mangiano quello che rende una partita: questo programma da solo non basta per il tuo obiettivo.':E.dollars(fmt(up))+' tolti alla fine di ogni partita per contare le partite che ti restano.'});}
 return M.explain({tool:'session',aim:'Guadagnare più soldi possibile durante la tua partita.',horizon:'Una partita di '+(s.session.minutes??'?')+' min',conditions,used,excluded,values,drivers,missing:r.valid?[]:[{label:'Un numero',text:r.reason,decisive:true}],changes:x.excluded.filter(a=>a.reasons.includes('non spuntata')).length?['Spuntare altre attività può cambiare il programma.']:[]});
}
function explainActivities(s,source,r,x){
 const upA=num(s.goal.upkeepPerSession)&&s.goal.upkeepPerSession>0?s.goal.upkeepPerSession:0;
 const sel=x.rank.find(a=>a.id===s.inverse.selected),used=['argent-disponible','reserve','possession-requise','joueurs','temps-partie','gain-net','temps-actif','attente','versement'],excluded={'cout-usage':upA>0?'Le tue spese per partita ('+E.dollars(fmt(upA))+') non vengono tolte qui: questo tempo non è contato in partite, e sarebbero le stesse per ogni attività. Il mio obiettivo e Il mio business plan le tolgono.':'Le spese di ogni missione sono già nel suo guadagno netto.'};
 if(ammoPerAttempt(s))used.push('mecanique-simulee');else excluded['mecanique-simulee']='Nessuna munizione simulata: contano solo le spese che hai scritto.';
 if(x.failureShare!==null)used.push('scenario-echec');else excluded['scenario-echec']='Il calcolo presume che ogni tentativo vada a buon fine; aggiungi uno scenario di tentativi falliti in modalità Esperto se vuoi essere prudente.';
 const drivers=[];if(x.best)drivers.push({label:'Classifica',text:(x.best.id===s.inverse.selected?'È l’attività che rende di più in {m} min: {g}.':'“{nom}” rende di più in {m} min: {g}.').replace('{nom}',x.best.name).replace('{m}',s.inverse.minutes??'?').replace('{g}',E.dollars(fmt(x.best.profit),' '))});
 if(x.mix)drivers.push({label:'Combinandole',text:'Concatenando '+x.mix.parts.map(p=>'“'+p.name+'” ×'+p.runs).join(', ')+' nei tuoi '+(s.inverse.minutes??'?')+' min: '+E.dollars(fmt(x.mix.profit),' ')+', cioè '+E.dollars(fmt(x.mix.gain),' ')+' in più di “'+x.best.name+'” da sola.'+(x.mix.exhaustive?' Sono state confrontate tutte le sequenze possibili.':' Migliore sequenza trovata tra quelle provate: potrebbe esisterne una migliore.')});
 if(sel&&sel.fail)drivers.push({label:'Se alcuni tentativi falliscono',text:'Con '+Math.round(sel.fail.share*10)+' tentativi falliti su 10: '+E.dollars(fmt(sel.fail.profit),' ')+' invece di '+E.dollars(fmt(sel.profit),' ')+' (spese pagate, nessuna ricompensa).',factor:'scenario-echec'});
 return M.explain({tool:'activities',aim:'Quanto rende il tuo tempo con un’attività, rispetto alle altre attività possibili.',horizon:(s.inverse.minutes??'?')+' min di gioco',conditions:x.rank.map(a=>({id:'possession-requise',label:a.name,state:!a.valid?'unknown':a.excluded.length?'ko':'ok',detail:!a.valid?a.reason:a.excluded.length?a.excluded.join(', '):'Possibile.'})),used,excluded,values:[{label:'Tempo',value:vPers(s.inverse.minutes),unit:'min',field:'f-inverse-minutes'},{label:'Giocatori',value:vPers(s.goal.players),unit:'giocatori',field:'activity-players'}],drivers,missing:r.valid?[]:[{label:'Un numero',text:r.reason,decisive:true}]});
}
function explainBudget(s,source,r,x){
 const used=['argent-disponible','reserve','cout-acquisition','argent-restant'],excluded={'effet-soin':x.rows.some(row=>row.item&&row.item.type==='consumable')?'Il budget conta i soldi; l’effetto dei consumabili non ha numeri in GTA VI.':'Non applicabile: nessun consumabile in queste spese.'},drivers=[],missing=[];
 if(x.flow){used.push('cout-usage','cout-complet','frequence','horizon');drivers.push({label:'Nel tempo',text:x.flow.ledger.reserveBreach?'Scenderesti sotto i soldi tenuti da parte alla partita '+x.flow.ledger.reserveBreach.at+'.':'Nell’arco di '+x.flow.sessions+' partite, i tuoi soldi restano sopra quello che tieni da parte (al minimo: '+E.dollars(fmt(x.flow.ledger.low.value),' ')+').'});
  if(x.flow.upkeep>0)drivers.push({label:'Spese per partita',text:E.dollars(fmt(x.flow.upkeep))+' tolti da ogni partita, come in Il mio obiettivo.'});}
 else{excluded['cout-usage']='Scrivi su quante partite conti (modalità Esperto) per vedere le spese nel tempo.';excluded['cout-complet']='Nessun periodo scritto.';excluded.frequence='Nessun numero di partite scritto.';excluded.horizon='Nessun periodo scritto: viene calcolato solo “adesso”.';}
 if(x.rows.some(row=>row.usage&&row.usage.source==='simulated'))used.push('mecanique-simulee');else excluded['mecanique-simulee']='Nessuna meccanica simulata nei tuoi acquisti.';
 if(!x.spend.complete)missing.push({label:x.spend.missing.map(m=>m.label).join(', '),text:'Prezzo non ancora scritto: la cifra rimanente mostrata è un massimo.',decisive:true});
 if(x.perSession&&x.perSession.unconfirmed&&x.perSession.unconfirmed.length)missing.push({label:'Costo d’uso di '+x.perSession.unconfirmed.map(n=>'“'+n+'”').join(', '),text:'Non confermato in GTA VI, non contato: scrivi il tuo se ce n’è uno.',decisive:!!x.flow});
 return M.explain({tool:'budget',aim:'Sapere quanto ti resta dopo le tue spese, senza toccare i soldi tenuti da parte.',horizon:x.flow?'Adesso, poi '+x.flow.sessions+' partite':'Adesso',conditions:[{id:'argent-disponible',label:'Spese possibili adesso',state:!r.valid?'unknown':r.overBudget?'ko':x.spend.complete?'ok':'unknown',detail:r.valid?(r.overBudget?'Le tue spese e i soldi tenuti da parte superano quello che hai.':'Ci sta tutto.'):r.reason}],used,excluded,values:x.rows.map(row=>({label:row.label,value:row.value,unit:'$'})).concat([{label:'Ho già',value:vPers(s.goal.capital),unit:'$',field:'budget-capital'},{label:'Tenuto da parte',value:vPers(s.goal.reserve),unit:'$',field:'budget-reserve'}]),drivers,missing});
}
function explainOrder(s,source,r,x){
 const used=['argent-disponible','reserve','cout-acquisition','gain-en-plus','delai-recuperation','argent-restant','priorite'],excluded={'usage-compatible':'L’ordine non verifica le esigenze d’uso: confronta le opzioni in “Quale acquisto scelgo?”.',envie:'L’ordine si decide in base a tempo e soldi; la tua voglia conta in “Quale acquisto scelgo?”.'};
 if(x.items.some(i=>i.before.length))used.push('possession-requise');else excluded['possession-requise']='Nessuno dei tuoi acquisti ne richiede un altro prima.';
 const conds=[];x.items.forEach(i=>{const a=asset(s,i.id);if(a&&a.itemId)conds.push({id:'achetable',label:i.name,state:'assumed',detail:'Acquisto da confermare in GTA VI.'});});
 if(conds.length)used.push('achetable');else excluded.achetable='Acquisti liberi: sei tu a dire che si possono comprare.';
 const OBJ={all:'avere tutto il prima possibile',income:'avere il prima possibile un acquisto che rende',reserve:'tenere più soldi possibile a ogni passo',given:'mantenere il tuo ordine'};
 const drivers=[],missing=[];
 if(x.valid&&x.best&&!x.best.order.length)drivers.push({label:'Ordine proposto',text:'Nessun acquisto da ordinare: aggiungi almeno due acquisti al tuo carrello.'});
 else if(x.valid&&x.best){drivers.push({label:'Ordine proposto',text:x.best.order.map(id=>'“'+(x.items.find(i=>i.id===id)||{}).name+'”').join(', poi ')+': '+H(x.best.result.totalHours)+' di gioco in totale.'});if(x.given&&x.given.valid&&x.given.order.join()!==x.best.order.join())drivers.push({label:'Il tuo ordine',text:H(x.given.result.totalHours)+' di gioco in totale con il tuo ordine.'});if(x.search)drivers.push({label:'Ricerca',text:x.search.note});
  if(x.noBuy&&x.noBuy.valid){const T=x.noBuy.result.totalHours,d=T-x.best.result.totalHours,earn=x.best.order.slice(0,-1).some(id=>{const it=x.items.find(i=>i.id===id)||{};return (it.boostHourly||0)-(it.costHourly||0)>0;});drivers.push({label:'Nessun acquisto lungo la strada',text:d>1/120?'Comprare tutto in una volta alla fine richiederebbe '+H(T)+': questo ordine ti fa risparmiare '+H(d)+'.':T<=1/120?'Tutto è pagabile subito: l’ordine non cambia il tempo.':earn?'Comprare tutto in una volta alla fine richiederebbe lo stesso tempo ('+H(T)+').':'Comprare tutto in una volta alla fine richiederebbe lo stesso tempo ('+H(T)+'): nessuno di questi acquisti ti fa guadagnare più in fretta; l’ordine cambia solo quando hai ciascuno.'});}}
 else missing.push({label:x.incomplete?'Prezzo':'Blocco',text:x.reason,decisive:true});
 {const hn=hourlyNet(s),upk=num(s.goal.upkeepPerSession)&&s.goal.upkeepPerSession>0;
  if(upk&&hn.known&&hn.net!==null&&hn.net>0)drivers.push({label:'Guadagno netto',text:'L’attesa si calcola con '+E.dollars(fmt(hn.net))+' all’ora, tolte le spese per partita.'});
  else if(upk&&hn.known&&hn.net!==null&&x.reason!==UPKEEP_EATS)missing.push({label:'Spese per partita',text:UPKEEP_EATS,field:'f-goal-upkeepPerSession',decisive:false});
  if(upk&&!hn.known)missing.push({label:'Tempo della tua partita',text:hn.reason,field:'f-goal-dailyMinutes',decisive:false});}
 return M.explain({tool:'order',aim:'Trovare l’ordine di acquisto che permette di '+OBJ[x.objective]+'.',horizon:'Fino all’ultimo acquisto',conditions:conds,used,excluded,values:[{label:'Ho già',value:vPers(s.goal.capital),unit:'$',field:'order-capital'},{label:'Tenuto da parte',value:vPers(s.goal.reserve),unit:'$',field:'order-reserve'},{label:'Guadagno all’ora',value:vPers(s.goal.hourly),unit:'$/h',field:'order-hourly'}].concat(x.items.map(i=>({label:i.name,value:i.price===null?V.blank():V.personal(i.price),unit:'$'}))),drivers,missing,changes:(x.alternatives||[]).map(a=>'Per '+OBJ[a.objective]+': '+a.order.map(id=>'“'+(x.items.find(i=>i.id===id)||{}).name+'”').join(', poi ')+(a.valid?' ('+H(a.result.totalHours)+')':'')).concat(x.flip?['Se “'+x.flip.firstName+'” costasse più di '+E.dollars(fmt(x.flip.price),' ')+', comprare “'+x.flip.secondName+'” prima diventerebbe più rapido.']:[])});
}
function roiChanges(c){if(!c||!c.valid||c.hours===null)return [];const t=c.thresholds||{},v=c.verdict,H=E.durationText(c.hours),m=n=>E.dollars(fmt(n),' ');
 const ahead=c.difference!==null&&c.difference>-0.005&&!(v==='wait'&&t.usableHours===0);
 return [t.maxPriceForHorizon!=null?(ahead?'Sopra '+m(t.maxPriceForHorizon)+' di prezzo totale, non è più ripagato in '+H+'.':'A '+m(t.maxPriceForHorizon)+' di prezzo totale o meno, si ripagherebbe in '+H+'.'):null,
  t.extraHourlyForHorizon!=null&&t.extraHourlyForHorizon>0&&v!=='unknown-gain'?(ahead?'Sotto i '+m(t.extraHourlyForHorizon)+' di guadagno in più all’ora, non è più ripagato in '+H+'.':'A partire da '+m(t.extraHourlyForHorizon)+' di guadagno in più all’ora, si ripagherebbe in '+H+'.'):null,
  c.breakEvenHours!=null&&c.breakEvenHours>0?(ahead?'Se lo usi meno di '+E.durationText(c.breakEvenHours)+', non si ripaga.':'Se lo usi almeno '+E.durationText(c.breakEvenHours)+' dopo l’acquisto, si ripaga.'):null].filter(Boolean);}
function explainRoi(s,source,r,x,ctx={}){
 const mode=roiMode(s),used=['argent-disponible','reserve','cout-acquisition','argent-restant'],excluded={},drivers=[],missing=[];
 if(['new','improve'].includes(mode))used.push('joueurs','gain-net');else{excluded.joueurs='Niente attività di gruppo in questa modalità.';excluded['gain-net']=mode==='estimate'?'Acquisto per piacere: nessun guadagno calcolato.':'Hai scritto direttamente il guadagno in più all’ora.';}
 if(mode==='estimate'){excluded['gain-en-plus']='Acquisto per piacere o guadagno sconosciuto: non inventiamo quanto rende.';if(num(s.goal.hourly)||s.roi.recoveryActivity)used.push('delai-recuperation');else excluded['delai-recuperation']='Scrivi quanto guadagni all’ora per sapere in quanto tempo recuperi i tuoi soldi.';}
 else used.push('gain-en-plus','delai-recuperation');
 if(x.purchasable.state==='na')excluded.achetable='Acquisto libero: sei tu a descriverlo.';else used.push('achetable');
 if(V.usable(x.usage.perSession)){used.push('cout-usage');if(x.sessions!==null)used.push('cout-complet','frequence','horizon');else{excluded['cout-complet']='Scrivi il tuo tempo di gioco al giorno per convertire le ore in partite.';excluded.frequence='Numero di partite non calcolabile.';excluded.horizon='Ore d’uso senza tempo al giorno.';}}
 else{excluded['cout-usage']=x.usage.note||'Nessun costo d’uso scritto.';excluded['cout-complet']='Senza costo d’uso, il costo completo è il prezzo.';if(num(s.roi.hours)){used.push('horizon','frequence');}else{excluded.horizon='Scrivi quante ore lo usi.';excluded.frequence='Nessuna ora d’uso scritta.';}}
 if(V.usable(x.cost.resale))used.push('revente-prevue');else excluded['revente-prevue']='Rivendita non confermata in GTA VI: contata solo se scrivi un prezzo di rivendita.';
 if(x.usage.source==='simulated')used.push('mecanique-simulee');else excluded['mecanique-simulee']='Nessuna meccanica simulata per questo acquisto.';
 excluded.priorite='La risposta confronta “con” e “senza” l’acquisto sullo stesso tempo di gioco; nessuna priorità da scegliere.';
 if(x.cash.state==='short')drivers.push({label:'Soldi disponibili',text:'Ti mancano '+E.dollars(fmt(x.cash.shortfall),' ')+' per pagare adesso.'});
 if(mode==='estimate'&&!num(s.goal.hourly)&&!s.roi.recoveryActivity)missing.push({label:'Quanto guadagni all’ora',text:'per sapere in quanto tempo recuperi i tuoi soldi',field:'roi-recovery-hourly',decisive:false});
 if(mode==='continuous'&&!num(s.goal.hourly))missing.push({label:'Quanto guadagni già all’ora',text:'per confrontare le due situazioni, con e senza l’acquisto, con gli stessi soldi',field:'f-goal-hourly',decisive:false});
 if(mode!=='estimate'&&!num(s.roi.revenueHourly)&&mode==='continuous')missing.push({label:'Guadagno in più all’ora',text:'È il dato che decide: senza, non si calcola quando lo ripaghi.',field:'f-roi-revenueHourly',decisive:true});
 const c=mode==='continuous'?investment(s,source,ctx):null;
 if(!r.valid&&!(c&&c.valid&&c.verdict==='unknown-gain'))missing.push({label:missingLabel(r.reason),text:r.reason,decisive:true});
 {const $=n=>E.dollars(fmt(Math.abs(n)),' '),sign=n=>n<=-0.5?'−':n>=0.5?'+':'';
  if(c&&c.valid&&c.extraKnown&&c.hours!==null){if(c.difference!==null)drivers.push({label:'Con o senza l’acquisto',text:c.shortfall>0&&c.thresholds.usableHours===0&&c.thresholds.waitHours>0?'Dopo '+H(c.hours)+': non cambia nulla, l’acquisto sarebbe pagabile solo dopo '+H(c.thresholds.waitHours)+' di gioco.':'Dopo '+H(c.hours)+': '+sign(c.difference)+$(c.difference)+' con l’acquisto, prezzo detratto'+(c.shortfall>0&&c.thresholds.waitHours>0?' (pagato dopo '+H(c.thresholds.waitHours)+' di gioco)':'')+'.'});
   drivers.push({label:'Rientro',text:c.investment===0?'Niente da ripagare: non costa nulla all’inizio.':c.breakEvenHours===null?'Mai con queste cifre: non rende più di quanto costa all’ora.':'Dopo '+H(c.breakEvenHours)+' di utilizzo.'});}
  else if(['new','improve'].includes(mode)&&r.valid){const known=mode==='new'&&r.baselineHourly!==null&&r.baselineHourly!==undefined,net=known?r.marginalNetProfit:r.netProfit,pb=known?r.marginalPaybackHours:r.paybackHours,cyc=known?r.marginalPaybackCycles:r.paybackCycles;
   if(num(net))drivers.push({label:'Con o senza l’acquisto',text:'Nell’arco di '+H(s.roi.hours)+': '+sign(net)+$(net)+', prezzo detratto'+(known?', rispetto a quello che facevi':'')+'.'});
   drivers.push({label:'Rientro',text:r.investment===0?'Niente da ripagare: non costa nulla all’inizio.':pb===null?'Non raggiunto con queste cifre.':'Dopo '+H(pb)+' di gioco ('+cyc+(E.plural(cyc)?' missioni':' missione')+').'});}}
 return M.explain({tool:'roi',changes:c?roiChanges(c):[],aim:mode==='estimate'?'Sapere se te lo puoi permettere e quanto ti lascia.':'Sapere se l’acquisto ti fa guadagnare più di quanto costa, rispetto a non comprarlo.',horizon:num(s.roi.hours)?s.roi.hours+' h di gioco':'Adesso',conditions:x.admission.ok.concat(x.admission.failed,x.admission.unknown,x.admission.assumed),used,excluded,values:[{label:'Prezzo totale',value:x.acquisition.complete?V.personal(x.acquisition.value):V.blank(),unit:'$',field:'f-roi-purchase'},{label:'Ho già',value:vPers(s.goal.capital),unit:'$',field:'roi-capital'},{label:'Tenuto da parte',value:vPers(s.goal.reserve),unit:'$',field:'roi-reserve'},{label:'Costo per partita',value:x.usage.perSession,unit:'$/partie'},{label:'Ore d’uso',value:vPers(s.roi.hours),unit:'h',field:'f-roi-hours'}],drivers,missing});
}
function compareChanges(r){
 if(!r||!r.valid||!r.best||r.undecided||r.tie||r.criterion==='cheapestTotal')return [];
 const k=r.criterion,w=r.items.find(it=>it.name===r.best);if(!w||!w.known||(r.ties&&r.ties[k]&&r.ties[k].length>1))return [];
 const others=r.items.filter(it=>it!==w&&it.known),m=n=>E.dollars(fmt(n),' '),say=(rv,P)=>P>w.total+0.5?['“'+rv.name+'” passerebbe davanti se il prezzo totale di “'+w.name+'” superasse '+m(P)+'.']:[];
 const first=(list,f,asc)=>list.filter(it=>f(it)!==null&&f(it)!==undefined).sort((a,b)=>asc?f(a)-f(b):f(b)-f(a))[0];
 if(k==='cheapest'){const rv=first(others,it=>it.total,true);return rv?say(rv,rv.total):[];}
 if(k==='value'&&w.utility!==null&&w.valueScore!==null){const rv=first(others,it=>it.valueScore,false);return rv&&rv.valueScore>0?say(rv,w.utility*100000/rv.valueScore):[];}
 if(k==='profit'&&w.paybackHours!==null&&w.incomeHourly>0){const rv=first(others,it=>it.paybackHours,true);return rv?say(rv,w.incomeHourly*rv.paybackHours):[];}
 if(k==='fastest'&&w.waitHours!==null){const rv=first(others,it=>it.waitHours,true);return rv&&rv.waitHours>0?say(rv,rv.total):[];}
 return [];
}
function explainCompare(s,source,r,x){
 const used=['argent-disponible','reserve','cout-acquisition','priorite'],excluded={},drivers=[],missing=[],need=s.analysis.need;
 const hasNeed=!!(need.terrain||num(need.passengers)||need.cargo);
 if(hasNeed){used.push('usage-compatible');if(num(need.passengers)||need.cargo)used.push('capacite');else excluded.capacite='Nessun posto né carico richiesto.';}else{excluded['usage-compatible']='Nessuna esigenza d’uso scritta (terreno, posti, carico): nessuna opzione viene esclusa per questo.';excluded.capacite='Nessuna capacità richiesta.';}
 if(x.rows.some(row=>row.item))used.push('achetable');else excluded.achetable='Acquisti liberi: sei tu a descriverli.';
 if(x.rows.some(row=>row.asset.owned))used.push('possession-requise');else excluded['possession-requise']='Nessuno di questi acquisti è già tuo: ognuno è contato al suo prezzo.';
 if(x.rows.some(row=>V.usable(row.usage.perSession))){used.push('cout-usage');if(x.sessions!==null)used.push('cout-complet','frequence','horizon');else{excluded['cout-complet']='Scrivi in quante partite li usi per confrontare il costo completo.';excluded.frequence='Nessun numero di partite.';excluded.horizon='Nessun periodo scritto.';}}
 else{excluded['cout-usage']='Nessun costo d’uso noto per questi acquisti (carburante, manutenzione: non confermati).';excluded['cout-complet']='Senza costo d’uso, si confronta il prezzo.';excluded.frequence='Serve con un costo d’uso.';excluded.horizon='Serve con un costo d’uso.';}
 if(x.rows.some(row=>row.income!==null)){used.push('gain-en-plus','delai-recuperation');}else{excluded['gain-en-plus']='Nessun acquisto ha un guadagno in più scritto: nessun confronto su quando si ripaga.';if(num(s.goal.hourly))used.push('delai-recuperation');else excluded['delai-recuperation']='Scrivi quanto guadagni all’ora per sapere quando potrai pagare.';}
 excluded['revente-prevue']='Rivendita non confermata in GTA VI: non contata nel confronto.';
 excluded['performance-usage']='Nessuna prestazione (velocità, accelerazione…) è pubblicata per GTA VI: non si confronta niente su questo.';
 excluded['effet-soin']=x.rows.some(row=>row.item&&row.item.type==='consumable')?'Effetto dei consumabili senza numeri in GTA VI.':'Non applicabile: nessun consumabile tra questi acquisti.';
 excluded.esthetique='Il sito non valuta i tuoi gusti: dillo con il voto della tua voglia.';
 used.push('envie');
 if(x.rows.some(row=>row.usage.source==='simulated'))used.push('mecanique-simulee');else excluded['mecanique-simulee']='Nessuna meccanica simulata.';
 if(x.excluded.length)drivers.push({label:'Esclusi',text:x.excluded.map(row=>'“'+row.name+'” ('+row.admission.failed.map(c=>c.detail||c.label).join(', ')+')').join('; ')+'.'});
 if(x.crossover)drivers.push({label:'Costo nel tempo',text:'“'+x.crossover.before+'” costa meno fino a '+Math.ceil(x.crossover.n-1e-9)+' partite; oltre, “'+x.crossover.after+'” diventa meno caro.'});
 x.partial.forEach(row=>missing.push({label:'“'+row.name+'”',text:'Costo incompleto: confronto parziale.',decisive:true}));
 if(!r.valid)missing.push({label:missingLabel(r.reason),text:r.reason,decisive:true});
 const conditions=[];x.rows.forEach(row=>row.conditions.forEach(c=>conditions.push({...c,label:row.name+', '+c.label})));
 return M.explain({tool:'compare',changes:compareChanges(r),aim:'Scegliere l’acquisto che risponde al tuo bisogno, prima tra quelli adatti, poi in base a quello che conta per te.',horizon:x.sessions!==null?'Acquisto, poi '+x.sessions+' partite':'Al momento dell’acquisto',conditions,used,excluded,values:x.rows.map(row=>({label:row.name,value:row.acquisition.complete?V.personal(row.acquisition.value):V.blank(),unit:'$'})).concat([{label:'Ho già',value:vPers(s.goal.capital),unit:'$',field:'compare-capital'},{label:'Tenuto da parte',value:vPers(s.goal.reserve),unit:'$',field:'compare-reserve'}]),drivers,missing});
}
function explainPlan(s,source,r,x){
 const p=s.plan,g=p.goal,missions=p.source==='missions',used=['argent-disponible','reserve','argent-restant','avancement','priorite'],excluded={},drivers=[],missing=[],changes=[];
 const any=(k)=>p.missions.some(k),anyP=(k)=>p.prerequisites.some(k);
 if(p.prerequisites.length){used.push('cout-acquisition','achetable');}else{excluded['cout-acquisition']='Nessun acquisto prima del tuo obiettivo.';excluded.achetable='Nessun acquisto prima del tuo obiettivo.';}
 const goalBoost=g.kind==='purchase'&&g.boostHourly>0,payback=r&&r.valid&&num(r.goalPaybackHours)?r.goalPaybackHours:null;
 const afterGoal=goalBoost?(payback!==null?'Quello che rende il tuo obiettivo arriva dopo l’obiettivo: non cambia il tempo per raggiungerlo (ripagato dopo '+H(payback)+' di gioco).':'Quello che rende il tuo obiettivo arriva dopo l’obiettivo: non cambia il tempo per raggiungerlo.'):null;
 if(anyP(a=>!a.owned&&a.boostHourly>0))used.push('gain-en-plus');else excluded['gain-en-plus']=afterGoal||'Nessun acquisto ti fa guadagnare di più (o non l’hai scritto).';
 const input=r&&r.input||planInput(s),ex=(input.excludedMissions||[]);
 if(missions){used.push('gain-net','temps-actif','attente','versement','ressource-exclusive','variete','joueurs');if(ex.length)changes.push((lkPluriel(ex.length)?'Escluse':'Esclusa')+' dal piano: '+ex.map(m=>'“'+m.name+'” (si gioca in '+m.players+', siete in '+(input.players||1)+')').join(', ')+'. Cambia “Siamo in” per contarle.');}
 else{excluded['gain-net']='Guadagni “poco a poco”: il tuo guadagno all’ora conta già le spese.';excluded['temps-actif']='Niente missioni: nessun tempo di missione separato.';excluded.attente='Niente missioni: nessuna attesa.';excluded.versement='Guadagno continuo: nessuna ricompensa a fine missione.';excluded['ressource-exclusive']='Nessuna missione da concatenare.';excluded.variete='Nessuna missione da variare.';excluded.joueurs='Nessuna missione di gruppo.';}
 if(missions&&any(m=>(m.requires||[]).length)||anyP(a=>(a.requires||[]).length))used.push('possession-requise');else excluded['possession-requise']='Nessuna missione o acquisto ne richiede un altro.';
 if(any(m=>m.once||m.minRank!=null))used.push('deblocage');else excluded.deblocage='Nessuna missione di sblocco (fatta una sola volta).';
 if(p.situation.dailyMinutes){used.push('temps-partie','horizon');}else{excluded['temps-partie']='Nessuna durata della partita: percorso continuo, senza calendario.';excluded.horizon='Senza partite, niente date: solo il tempo di gioco.';}
 if((p.situation.upkeepPerSession||0)>0||anyP(a=>(a.usagePerSession||0)>0))used.push('cout-usage');else excluded['cout-usage']='Nessuna spesa per partita scritta.';
 if(ammoPerAttempt(s)){used.push('mecanique-simulee');changes.push('Munizioni simulate: '+E.dollars(fmt(ammoPerAttempt(s)),' ')+' aggiunti alle spese di ogni tentativo di missione, come in Le mie attività. Togli la spunta alla simulazione per rimuoverli.');}else excluded['mecanique-simulee']='Nessuna meccanica simulata nel piano.';
 excluded['scenario-echec']='Il piano presume che ogni missione vada a buon fine; se una partita va peggio, scrivi quanto hai guadagnato davvero: il piano si ricalcola.';
 if(r.valid){drivers.push({label:'Percorso',text:(r.continuous?H(r.totalMinutes/60)+' di gioco in tutto':r.totalSessions+(E.plural(r.totalSessions)?' partite':' partita')+(r.days?' ('+r.days+' giorni)':''))+', '+E.dollars(fmt(r.finalCash),' ')+' alla fine.'});
  if(r.lowPoint)drivers.push({label:'Al minimo',text:E.dollars(fmt(r.lowPoint.cash),' ')+' ('+(r.lowPoint.at||'partenza')+'), '+((r.input&&r.input.reserve||0)>0?'mai sotto i '+E.dollars(fmt(r.input.reserve),' ')+' tenuti da parte.':(r.keptReserve||0)>0?'attingendo ai tuoi '+E.dollars(fmt(r.keptReserve),' ')+' tenuti da parte (hai scelto di andare il più veloce possibile).':'senza soldi tenuti da parte.')});
  if(x.chain&&x.chain.steps.length)drivers.push({label:'Preparazione',text:x.chain.steps.filter(st=>st.kind!=='activity').map(st=>st.name).join(', poi ')||'Niente da preparare.'});}
 else missing.push({label:missingLabel(r.reason),text:r.reason,decisive:true});
 if(missions){const hold=p.missions.filter(m=>m.minCash!=null&&!(m.once&&m.done)),rk=p.missions.filter(m=>m.minRank!=null&&!(m.once&&m.done));
  if(hold.length)drivers.push({label:'Soldi da avere in tasca',text:hold.map(m=>'“'+m.name+'”: '+E.dollars(fmt(m.minCash),' ')).join(', ')+'. Questi soldi non si spendono: il piano aspetta che tu li abbia prima di avviare la missione.'});
  if(rk.length)drivers.push({label:'Livello richiesto',text:rk.map(m=>'“'+m.name+'”: livello '+fmt(m.minRank)).join(', ')+(num(p.situation.rank)?'; hai scritto il livello '+fmt(p.situation.rank)+'.':'.')});}
 if(afterGoal&&anyP(a=>!a.owned&&a.boostHourly>0))drivers.push({label:'Quanto rende l’obiettivo',text:afterGoal});
 if(missions&&anyP(a=>a.boostHourly>0))drivers.push({label:'Guadagno all’ora di un acquisto',text:'Contato su tutta la partita, insieme alle tue missioni, tranne durante il tempo per ottenere un altro acquisto.'});
 {const v=r.verification;if(v&&v.skipped==='journal')missing.push({label:'Verifica',text:'Registro troppo lungo per essere rifatto (più di 60.000 eventi): il piano è mostrato senza questa verifica.',decisive:false});
  else if(v&&v.ok===true){const ev=v.checked+(E.plural(v.checked)?' eventi':' evento');drivers.push({label:'Verifica',text:v.skipped==='reach'?'Registro rifatto a parte ('+ev+'); i punti non vengono rifatti, solo i soldi.':r.continuous?'Registro del piano rifatto a parte ('+ev+'): soldi, soldi tenuti da parte, acquisti da fare prima e totali corrispondono.':'Registro del piano rifatto a parte ('+ev+'): soldi, soldi tenuti da parte, acquisti da fare prima, tempo di partita e totali corrispondono.'});}}
 const cycleOf=t=>{const g=String(t||'').split(', poi ');return g.length<2?null:JSON.stringify([...new Set(g.slice(1,-1).concat(g[g.length-1].replace(/\.\s*$/,'')))].sort());};
 const sameCycle=cycleOf(r.reason)!==null&&cycleOf(r.reason)===cycleOf(x.chain&&x.chain.reason);
 if(x.chain&&!x.chain.ok&&x.chain.reason&&r.reason!==x.chain.reason&&!sameCycle)missing.push({label:'Prerequisiti',text:x.chain.reason,decisive:true});
 return M.explain({tool:'plan',aim:g.kind==='amount'?'Avere '+E.dollars(fmt(g.target),' ')+': '+MEANING[g.meaning]+'.':g.kind==='unlock'?'Sbloccare '+(g.name||'il tuo obiettivo')+'.':'Compra '+(g.name||'il tuo obiettivo')+'.',horizon:p.situation.dailyMinutes?'Partita dopo partita ('+p.situation.dailyMinutes+' min, '+(p.situation.daysPerWeek||7)+' giorni a settimana)':'Un passo dopo l’altro, senza calendario',conditions:[],used,excluded,values:[{label:'Ho già',value:vPers(p.situation.capital),unit:'$',field:'plan-capital'},{label:'Tenuto da parte',value:vPers(p.situation.reserve),unit:'$',field:'plan-reserve'},...(missions?[{label:'Siamo in',value:vPers(p.situation.players??1),unit:lkPluriel((p.situation.players??1))?'giocatori':'giocatore',field:'plan-players'}]:[]),...(ammoPerAttempt(s)?[{label:'Munizioni simulate, per tentativo',value:V.simulated(ammoPerAttempt(s)),unit:'$',field:null,origin:'simulation'}]:[])],drivers,missing,changes});
}
function planResale(s,r){const fin=new Map((r.purchases||[]).filter(x=>x.owned).map(x=>[x.id,x]));
 const items=s.plan.prerequisites.filter(x=>typeof x.resale==='number'&&x.resale>0&&fin.has(x.id)).map(x=>({id:x.id,name:x.name,resale:x.resale}));
 const total=items.reduce((t,x)=>t+x.resale,0),spent=[...fin.values()].filter(x=>!(s.plan.prerequisites.find(y=>y.id===x.id)||{}).owned).reduce((t,x)=>t+(x.price||0),0);
 return {total,items,finalCashAfter:r.finalCash+total,spent,netCost:spent-total};}
const SIM_SHORT={soin:'spese per le cure',amendes:'multe da pagare',mort:'soldi persi alla morte',arrestation:'soldi persi all’arresto'};
function extrasExplain(tool,s,source,r,x,e){
 if(!e||!M||!s||!s.analysis)return e;
 const P=s.plan,isPlan=tool==='plan',useH=!isPlan||P.useHypotheses===true,costsOn=['soin','amendes','mort','arrestation'].some(k=>xOn(s,k));
 const anyHyp=costsOn||xOn(s,'revenu-passif')||xOn(s,'bonus')||shareAutoOn(s)||!!moneySplit(s);
 const resale=(tool==='goal'||tool==='session')&&s.goal.resaleOwned===true,off=isPlan&&!!(P.offline&&P.offline.on===true),fail=isPlan&&P.includeFailure===true,resPlan=isPlan&&P.resaleAfterGoal===true;
 if(!(useH&&anyHyp)&&!resale&&!off&&!fail&&!resPlan&&!(isPlan&&anyHyp))return e;
 const values=[],drivers=[],missing=[],changes=[],usedAdd=[],drop=new Set(),why={},cycles=s.model==='cycles';
 const money=n=>E.dollars(fmt(n),' '),use=(...ids)=>ids.forEach(id=>{usedAdd.push(id);drop.add(id);});
 if(isPlan&&!useH&&anyHyp)changes.push('Le tue ipotesi in più (Le mie ipotesi in più, modalità Esperto) non contano nel piano: spunta “Contare anche le mie ipotesi in più” in “Cosa conta per te” per includerle.');
 const missions=isPlan?P.missions:[],planMissions=isPlan&&P.source==='missions';
 if(useH&&anyHyp){
  if(costsOn){const sc=simCosts(s),counted=['goal','session','order','plan'].includes(tool)||(tool==='budget'&&!!(x&&x.flow));
   sc.missing.forEach(m=>missing.push({label:'Da scrivere',text:m.text,field:m.field,decisive:false}));
   if(sc.total>0){
    if(counted){sc.lines.forEach(l=>values.push({label:l.label,value:V.simulated(l.value),unit:'$/partie',field:l.field}));use('cout-usage','mecanique-simulee');
     const userUp=isPlan?(P.situation.upkeepPerSession||0):(num(s.goal.upkeepPerSession)&&s.goal.upkeepPerSession>0?s.goal.upkeepPerSession:0);
     const names=sc.lines.map(l=>SIM_SHORT[l.key]).join(', ');
     drivers.push({label:'Spese simulate',text:money(sc.total)+' per partita ('+names+') '+(userUp>0?'aggiunti alle tue '+money(userUp)+' di spese per partita.':'contati come spese per partita.')+(tool==='goal'&&r&&r.valid&&!userUp?(cycles&&num(r.upkeepTotal)?' Aggiungono '+money(r.upkeepTotal)+' da guadagnare su tutto il percorso.':!cycles&&num(r.hourly)?' Abbassano il tuo guadagno a '+money(r.hourly)+' all’ora.':''):'')});}
    else if(tool==='activities')why['cout-usage']='Le tue spese per partita, spese simulate comprese ('+money(upkeepOf(s))+'), qui non vengono tolte: questo tempo non è contato in partite, e sarebbero le stesse per ogni attività. Il mio obiettivo e Il mio business plan le tolgono.';
    else if(tool==='budget')why['cout-usage']='Scrivi su quante partite conti (modalità Esperto) per vedere le tue spese, simulate comprese, nel tempo.';
    else why['mecanique-simulee']='Le tue spese simulate per partita (cure, multe…) contano in Il mio obiettivo, Il mio tempo di gioco, Cosa compro prima?, Il mio budget e nel business plan; qui conta solo il costo d’uso dell’acquisto.';}}
  if(xOn(s,'revenu-passif')){const d=isPlan?P.situation.dailyMinutes:sessionMinutesOf(s),ps=simPassive(s,d),counted=(tool==='goal'&&!cycles)||tool==='order'||(tool==='budget'&&!!(x&&x.flow))||isPlan;
   if(ps.incomplete)missing.push({label:'Da scrivere',text:'Entrata passiva: scrivi quanto rende all’ora.',field:'sim-revenu-passif-parHeure',decisive:false});
   else if(counted){values.push({label:'Entrata passiva (simulazione)',value:V.simulated(ps.rate),unit:'$/h',field:'sim-revenu-passif-parHeure',text:ps.capped?'Al massimo '+money(ps.cap)+' per partita (scorta massima): '+money(ps.raw)+' all’ora ridotti a '+money(ps.rate)+'.':ps.noSessions?'Senza durata della partita, la scorta massima non si applica.':null});use('mecanique-simulee');
    drivers.push({label:'Entrata passiva',text:'+'+money(ps.rate)+(isPlan&&P.source==='missions'?' per ogni ora di gioco, aggiunti a quanto rendono le tue missioni (simulazione).':' per ogni ora di gioco, aggiunti al tuo guadagno all’ora (simulazione).')});}
   else changes.push(tool==='goal'?'La tua entrata passiva simulata conta in modalità “poco a poco”: qui ogni missione conta da sola.':'La tua entrata passiva simulata qui non è contata: conta in Il mio obiettivo (“poco a poco”), Cosa compro prima?, Il mio budget e nel business plan.');}
  if(xOn(s,'bonus')){const b=simBonus(s),counted=(tool==='goal'&&cycles)||tool==='session'||tool==='activities'||(tool==='roi'&&['new','improve'].includes(roiMode(s)))||planMissions;
   if(b===null)missing.push({label:'Da scrivere',text:'Bonus: scrivi la percentuale in più sulle ricompense.',field:'sim-bonus-pourcentage',decisive:false});
   else if(counted){values.push({label:'Bonus sulle ricompense (simulazione)',value:V.simulated(b),unit:'%',field:'sim-bonus-pourcentage'});use('mecanique-simulee');drivers.push({label:'Bonus simulato',text:'Ogni ricompensa di missione conta '+fmt(b)+'%'+' in più (simulazione).'});}
   else if(tool==='goal')changes.push('Il bonus simulato conta sulle ricompense delle missioni: il guadagno all’ora che hai scritto non cambia.');}
  const acts=isPlan?[]:(tool==='goal'&&cycles)||tool==='session'||tool==='activities'||tool==='roi'?activities(s,source):[];
  if(shareAutoOn(s)){const list=isPlan?(planMissions?missions.filter(m=>Number.isInteger(m.players)&&m.players>1):[]).map(m=>'“'+m.name+'” '+fmt(100/m.players)+'%'):acts.filter(a=>a.shareAuto).map(a=>'“'+a.name+'” '+fmt(a.share)+'%');
   if(list.length){use('joueurs');drivers.push({label:'Divisione tra compagni',text:list.join(', ')+': parte uguale per ogni giocatore, invece della parte scritta.'});}
   else if(acts.length||planMissions)changes.push('Divisione automatica: qui nessuna missione di gruppo, non cambia nulla.');}
  const who=moneySplit(s);
  if(who&&(acts.length||planMissions)){const out=isPlan?((r&&r.input&&r.input.excludedByCharacter)||[]).map(m=>'“'+m.name+'”'):acts.filter(a=>a.otherCharacter).map(a=>'“'+a.name+'”');
   const both=isPlan?missions.filter(m=>m.who==='deux').map(m=>'“'+m.name+'”'):acts.filter(a=>Array.isArray(a.characters)&&a.characters.length>1).map(a=>'“'+a.name+'”');
   drivers.push({label:'Soldi contati: '+PERSO[who],text:'Conti solo i soldi di '+PERSO[who]+(out.length?': '+out.join(', ')+(out.length>1?' sono escluse':' è esclusa')+' (si gioca con l’altro personaggio).':': qui nessuna missione è riservata all’altro personaggio.')+' Rockstar non ha ancora detto se i soldi di Jason e di Lucia sono separati (da confermare).'});
   if(both.length)changes.push('Missione in due ('+both.join(', ')+'): scrivi in “La mia parte” quanto prende '+PERSO[who]+'.');}
 }
 if(resale){const t=resaleOwnedTotal(s);
  if(t>0){values.push({label:'Rivendita di ciò che possiedi (simulazione)',value:V.simulated(t),unit:'$'});use('revente-prevue');drivers.push({label:'Rivendita',text:'+'+money(t)+' aggiunti ai tuoi soldi di partenza: i prezzi di rivendita scritti in I miei acquisti per ciò che possiedi già. La rivendita non è confermata in GTA VI.'+(s.goal.meaning==='cumulative'?' In “quello che guadagnerò da adesso in poi”, non conta come guadagno.':'')});}
  else missing.push({label:'Da scrivere',text:'Rivendita: nessun acquisto che possiedi ha un prezzo di rivendita scritto (I miei acquisti, “Potrei rivenderlo a”).',decisive:false});}
 if(isPlan){
  if(off){if(!P.situation.dailyMinutes)changes.push('Entrate offline: si guadagnano durante le pause tra due partite; in un percorso senza partite non vengono contate.');
   else if(r&&r.valid){const t=num(r.offlineTotal)?r.offlineTotal:0;use('gain-en-plus');values.push({label:'Entrate offline, tetto per pausa',value:num(P.offline.cap)?V.simulated(P.offline.cap):V.blank(),unit:'$',field:'plan-offline-cap'});
    drivers.push({label:'Entrate offline (simulazione)',text:t>0?'+'+money(t)+' in tutto, guadagnati durante le pause tra le tue partite: quanto rendono all’ora i tuoi acquisti'+(xOn(s,'revenu-passif')&&useH?' e la tua entrata passiva simulata':'')+(num(P.offline.cap)?', al massimo '+money(P.offline.cap)+' per pausa':'')+'. Niente è confermato in GTA VI.':'Niente da contare: nessun acquisto posseduto rende all’ora'+(useH?' e nessuna entrata passiva simulata':'')+'.'});}}
  if(fail){const k=failureShare(s);
   if(k===null)missing.push({label:'Da scrivere',text:'Tentativi falliti: spunta e compila “Tentativi falliti” in Le mie ipotesi per contarli nel piano.',decisive:false});
   else if(planMissions){use('scenario-echec');drivers.push({label:'Tentativi falliti (simulazione)',text:k<=0?'Nessun tentativo fallito scritto: non cambia nulla.':'Con '+Math.round(k*10)+' tentativi falliti su 10: una missione che si rifà rende in media '+fmt(Math.round((1-k)*100))+'%'+' della sua ricompensa; una missione fatta una sola volta costa e dura in media '+unitsText(1/(1-k))+' volte tanto (tentativi fino alla riuscita).'});}}
  if(resPlan){const rs=r&&r.valid?r.resaleAfterGoal:null;
   if(rs&&rs.total>0){use('revente-prevue');drivers.push({label:'Rivendita dopo l’obiettivo (simulazione)',text:'+'+money(rs.total)+' rivendendo '+rs.items.map(i=>'“'+i.name+'”').join(', ')+' dopo l’obiettivo: '+money(rs.finalCashAfter)+' alla fine, e i tuoi acquisti da fare prima ti costano '+money(rs.netCost)+' in tutto. Il tempo per raggiungere l’obiettivo non cambia.'});}
   else if(r&&r.valid)missing.push({label:'Da scrivere',text:'Rivendita dopo l’obiettivo: scrivi “Lo rivendo dopo il mio obiettivo” su un acquisto da fare prima che avrai.',decisive:false});}}
 if(!values.length&&!drivers.length&&!missing.length&&!changes.length&&!usedAdd.length&&!Object.keys(why).length)return e;
 const add=M.explain({tool,used:[],excluded:{},values,drivers,missing,changes:[]});
 return {...e,used:[...new Set([...e.used,...usedAdd])],excluded:e.excluded.filter(c=>!drop.has(c.id)).map(c=>why[c.id]?{...c,why:why[c.id]}:c),values:e.values.concat(add.values),drivers:e.drivers.concat(add.drivers),missing:e.missing.concat(add.missing),changes:e.changes.concat(changes),unaccounted:e.unaccounted.filter(id=>!usedAdd.includes(id))};
}
function explainTool(tool,s,source,ctx,r,x){return extrasExplain(tool,s,source,r,x,explainToolBase(tool,s,source,ctx,r,x));}
function explainToolBase(tool,s,source,ctx,r,x){
 if(tool==='goal')return explainGoal(s,source,r,x);if(tool==='session')return explainSession(s,source,r,x);if(tool==='activities')return explainActivities(s,source,r,x);
 if(tool==='budget')return explainBudget(s,source,r,x);if(tool==='order')return explainOrder(s,source,r,x);if(tool==='roi')return explainRoi(s,source,r,x,ctx);
 if(tool==='compare')return explainCompare(s,source,r,x);if(tool==='plan')return explainPlan(s,source,r,x);return x.explain||null;
}
const plannedOf=g=>num(g.plannedSpend)&&g.plannedSpend>0?g.plannedSpend:0;
function settle(r,spent){if(!r||!r.valid)return r;return spent>0?{...r,finalCapital:r.finalCapital-spent,spentAtEnd:spent}:{...r,spentAtEnd:0};}
function curveOf(g,r,ps){const total=r.totalMinutes,h=r.hourly,avail=g.capital-g.reserve,tps=ps<=avail?0:(ps-avail)/h*60;return Array.from({length:5},(_,i)=>{const t=total*i/4;return [t,g.capital+h*t/60-(ps>0&&t>=tps-1e-9?ps:0)];});}
function goalJournal(g,r,o={}){
 const end=r.totalMinutes,inv=r.investment||0,start=g.capital-(o.paidNow||0),events=[];
 if(o.paidNow!==undefined)events.push({at:0,kind:'spend',amount:o.paidNow,unlocks:'acquisto'});
 if(inv>0)events.push({at:0,kind:'spend',amount:inv,unlocks:'activite',needs:o.unlocked?['acquisto']:[]});
 const gross=r.finalCapital+(r.spentAtEnd||0)-(start-inv);
 if(gross>0)events.push({at:end,kind:'earn',amount:gross,needs:[...(inv>0?['activite']:[]),...(o.unlocked?['acquisto']:[])]});
 const other=(r.spentAtEnd||0)-(o.late||0);if(other>0)events.push({at:end,kind:'spend',amount:other,unlocks:'depenses'});
 if(o.late!==undefined)events.push({at:end,kind:'spend',amount:o.late,unlocks:'acquisto'});
 return events;}
const paidIn=events=>[...new Set(events.filter(e=>e.unlocks).map(e=>e.unlocks))];
function goalPurchase(s,source=[],ctx={},key=s.purchase.key){
 if(s&&s.goal&&s.goal.resaleOwned===true)s=withResale(s);
 const g=s.goal,a=asset(s,key),p=purchase(key===s.purchase.key?s:{...s,purchase:{...s.purchase,key}},source);
 const price=a&&num(p.price)&&num(p.extras)?p.price+p.extras:null,item=a?itemOf(a,ctx):null,use=a&&M?usageOf(s,a,item):null,daily=sessionMinutesOf(s);
 const usageV=use&&V.usable(use.perSession)?use.perSession.v:null,usageUnknown=!!use&&!V.usable(use.perSession)&&use.source!=='na';
 const extra=!a?null:a.incomeMode==='none'?0:num(p.boostHourly)?p.boostHourly:null,extraKnown=extra!==null,ps=plannedOf(g);
 const state={facts:{capital:g.capital,reserve:g.reserve,price,hourly:s.model==='continuous'?g.hourly:null,model:s.model,owned:!!(a&&a.owned)},preferences:{meaning:['held','available','cumulative'].includes(g.meaning)?g.meaning:'available'},constraints:{reserve:g.reserve,dailyMinutes:daily,deadlineDays:num(g.deadlineDays)?g.deadlineDays:null},unknowns:[]};
 if(!extraKnown)state.unknowns.push('gain-en-plus');if(usageUnknown)state.unknowns.push('cout-usage');if(usageV!==null&&usageV>0&&!daily&&s.model==='continuous')state.unknowns.push('temps-partie');
 const base=goal(s,source),out={state,base,price,extra,extraKnown,usage:usageV,usageUnknown,checks:[],rejected:[]};
 if(!a)return{...out,valid:false,reason:'Scegli un acquisto dalla lista.'};
 if(a.owned)return base.valid?{...out,valid:true,owned:true,save:{hours:base.totalMinutes/60},buy:{hours:base.totalMinutes/60,state:'ok',strategy:'owned'}}:{...out,valid:false,reason:base.reason};
 if(price===null)return{...out,valid:false,reason:'Scrivi il prezzo di questo acquisto.'};
 const T=goalTarget(s);if(T===null||!num(g.capital)||!num(g.reserve))return{...out,valid:false,reason:base.reason||'Scrivi il tuo obiettivo.'};
 const available=g.capital-g.reserve;
 const verify=(name,events,claim)=>{const v=E.cashJournalVerify({capital:g.capital,reserve:g.reserve,events,claim});out.checks.push({strategy:name,ok:v.valid&&v.ok,violations:v.violations||[]});if(!(v.valid&&v.ok))out.rejected.push(name);return v.valid&&v.ok;};
 if(base.valid){const ev=goalJournal(g,base);verify('sans-achat',ev,{finalCash:base.finalCapital,target:T-ps,after:paidIn(ev),reachedAt:base.totalMinutes});}
 if(s.model==='continuous'){
  const up=upkeepOf(s),hNet=num(g.hourly)?hourlyNet(s).net:null;
  const noIncome=!base.valid&&hNet!==null&&hNet<=0&&goal({...s,goal:{...g,hourly:(up&&daily?up*60/daily:0)+1}},source).valid;
  if(!base.valid&&!noIncome)return{...out,valid:false,reason:base.reason};
  if(hNet===null)return{...out,valid:false,reason:base.reason||'Scrivi quanto guadagni all’ora.'};
  const usageHourly=usageV!==null&&usageV>0&&daily?usageV*60/daily:0,save=base.valid?{hours:base.totalMinutes/60}:{hours:null,state:'impossible',why:'income'};
  const t=E.purchaseGoalTiming({capital:g.capital,reserve:g.reserve,target:T,hourly:Math.max(0,hNet),price,extraHourly:extra,usageHourly});
  if(!t.valid)return{...out,valid:false,reason:t.reason};
  const more={hourlyNet:Math.max(0,hNet),affordHours:t.affordHours,extraThreshold:t.extraThreshold,timing:t};
  if(t.buyHours===null)return{...out,...more,valid:true,save,buy:{hours:null,state:price>available?'money-first':'impossible',strategy:null}};
  const events=ps>0?t.journal.concat([{at:t.claim.reachedAt,kind:'spend',amount:ps,unlocks:'depenses'}]):t.journal;
  const ok=verify(t.strategy,events,{...t.claim,finalCash:t.claim.finalCash-ps,target:T-ps,after:paidIn(events)});
  return{...out,...more,valid:true,save,buy:ok?{hours:t.buyHours,state:'ok',strategy:t.strategy,buyAtHours:t.buyAtHours,optimal:t.optimal}:{hours:null,state:'rejected',strategy:t.strategy},delayHours:ok&&save.hours!==null?t.buyHours-save.hours:null};
 }
 const chosen=g.selected==='mixed'?s.activities.map(x=>x.id):[g.selected],acts=activities(s,source).filter(x=>chosen.includes(x.id));
 const unlocks=!!a.itemId&&acts.some(x=>(x.requiresPurchaseIds||[]).includes(a.itemId));
 if(!unlocks){
  if(!base.valid)return{...out,valid:false,reason:base.reason};
  const s2=copy(s);s2.goal.plannedSpend=ps+price;const r=goal(s2,source),save={hours:base.totalMinutes/60};
  if(!r.valid)return{...out,valid:true,save,buy:{hours:null,state:'impossible',strategy:null,reason:r.reason}};
  const ev=goalJournal(g,r,{late:price}),ok=verify('late',ev,{finalCash:r.finalCapital,target:T-ps,after:paidIn(ev),reachedAt:r.totalMinutes});
  return{...out,valid:true,save,buy:ok?{hours:r.totalMinutes/60,state:'ok',strategy:'late',buyAtHours:r.totalMinutes/60,optimal:true}:{hours:null,state:'rejected',strategy:'late'},delayHours:ok?r.totalMinutes/60-save.hours:null,extraThreshold:null};
 }
 const save=base.valid?{hours:base.totalMinutes/60}:{hours:null,state:'impossible',why:'unlock'};
 if(price>available)return{...out,valid:true,save,buy:{hours:null,state:'money-first',strategy:null},extraThreshold:null};
 const s1=copy(s),a1=asset(s1,key);a1.owned=true;s1.goal.capital=g.capital-price;s1.goal.meaning='available';s1.goal.target=T-ps;
 if(usageV!==null&&usageV>0)s1.goal.upkeepPerSession=(num(g.upkeepPerSession)&&g.upkeepPerSession>0?g.upkeepPerSession:0)+usageV;
 const r=goal(s1,source);
 if(!r.valid)return{...out,valid:true,save,buy:{hours:null,state:'impossible',strategy:null,reason:r.reason},extraThreshold:null};
 const ev=goalJournal(g,r,{paidNow:price,unlocked:true}),ok=verify('now',ev,{finalCash:r.finalCapital,target:T-ps,after:paidIn(ev),reachedAt:r.totalMinutes});
 return{...out,valid:true,save,buy:ok?{hours:r.totalMinutes/60,state:'ok',strategy:'now',buyAtHours:0,optimal:false}:{hours:null,state:'rejected',strategy:'now'},delayHours:ok&&save.hours!==null?r.totalMinutes/60-save.hours:null,extraThreshold:null};
}
function analysis(tool,s,source=[],ctx={}){
 if(!M)return null;
 try{
  const r=evaluate(tool,s,source,ctx);let x=null;
  if(tool==='purchase')x=purchaseAnalysis(s,source,ctx);else if(tool==='compare')x=compareAnalysis(s,source,ctx);else if(tool==='order')x=orderAnalysis(s,source,ctx);
  else if(tool==='budget')x=budgetAnalysis(s,source,ctx);else if(tool==='goal')x=goalAnalysis(s,source,ctx,r);else if(tool==='activities')x=activitiesAnalysis(s,source,ctx);
  else if(tool==='session')x=sessionAnalysis(s,source,ctx);else if(tool==='roi')x=roiAnalysis(s,source,ctx);else if(tool==='plan')x=planAnalysis(s,source,ctx,r);
  if(!x)return null;
  if(!x.explain)x.explain=explainTool(tool,s,source,ctx,r,x);
  x.result=r;return x;
 }catch(error){return {tool,error:error.message};}
}
function evaluate(tool,s,source=[],ctx={}){
 if(tool==='compare'){const input=chooseInput(s,source),total=input.criterion==='cheapestTotal';if(total)input.criterion='cheapest';
  let r;
  const x=M?compareAnalysis(s,source,ctx):null,bad=new Set(x?x.excluded.map(row=>row.name):[]);
  if(bad.size){const kept=input.items.filter(it=>!bad.has(it.name));if(kept.length<2)return {valid:false,reason:kept.length?'Una sola opzione va bene per il tuo bisogno: “'+kept[0].name+'”. Le altre sono escluse: '+[...bad].join(', ')+'.':'Nessuna opzione va bene per il tuo bisogno: '+[...bad].join(', ')+'.',excludedByNeed:[...bad],items:[],best:null,bestByCriterion:{}};r={...E.choose({...input,items:kept}),excludedByNeed:[...bad]};}
  else r=E.choose(input);
  if(r.valid&&!total&&r.criterion==='value'&&r.best===null&&r.unrated&&r.unrated.length)r={...r,criterion:'cheapest',best:r.bestByCriterion.cheapest,fallback:{from:'value',unrated:r.unrated}};
  if(!total||!r.valid||!x)return r;
  if(x.sessions===null)return {...r,criterion:'cheapestTotal',best:null,undecided:true,undecidedReason:'Scrivi in quante partite lo userai: senza, niente costo nel tempo.'};
  const rows=x.admissible,complete=rows.filter(row=>row.cost.total.complete).sort((a,b)=>(a.cost.total.value-b.cost.total.value)||String(a.name).localeCompare(String(b.name),'fr'));
  if(!complete.length)return {...r,criterion:'cheapestTotal',best:null,undecided:true,undecidedReason:'Nessuna opzione ha un costo completo: scrivi i costi d’uso o i prezzi mancanti.'};
  const lead=complete[0],doubt=rows.filter(row=>!row.cost.total.complete&&!M.compareCosts(lead.cost.total,row.cost.total).decided);
  const bestTotals=Object.fromEntries(rows.map(row=>[row.name,row.cost.total.complete?row.cost.total.value:null]));
  if(doubt.length)return {...r,criterion:'cheapestTotal',best:null,undecided:true,undecidedReason:'“'+lead.name+'” costa meno tra i costi completi, ma '+doubt.map(row=>'“'+row.name+'”').join(', ')+' ha un costo incompleto che potrebbe essere più basso.',totals:bestTotals};
  const chosen=r.items.find(it=>it.name===lead.name),second=complete[1],tie=second&&Math.abs(second.cost.total.value-lead.cost.total.value)<=1e-6*Math.max(1,lead.cost.total.value),near=second&&!tie&&M.close(lead.cost.total.value,second.cost.total.value,0.02);
  return {...r,criterion:'cheapestTotal',tie:!!tie,near:!!near,closeWith:tie||near?second.name:null,best:lead.name,bestWaitHours:chosen?chosen.waitHours:null,bestTotal:lead.cost.total.value,totals:bestTotals,bestByCriterion:{...r.bestByCriterion,cheapestTotal:lead.name}};}
 if(tool==='plan'){const missing=planMissing(s);if(missing)return{valid:false,reason:missing};
  const st=s.plan.strategy==='auto'?planStrategies(s):null;
  if(st&&!st.valid)return {valid:false,reason:st.reason,strategies:st,strategy:'asIs',variant:'auto',input:planInput(s,'asIs')};
  const strategy=st&&st.recommended?st.recommended:(s.plan.strategy==='auto'?'asIs':s.plan.strategy),input=planInput(s,strategy);
  if(st&&st.blocked)return Object.assign({valid:false,reason:st.blockedReason,blockedByReserve:true},{strategy:'asIs',strategies:st,variant:'auto',input});
  let r=E.missionPlan(input),variant='auto';
  if(s.plan.variant!=='auto'){const alt=E.missionAlternatives(input);const v=alt.valid?alt.results[s.plan.variant]:null;if(v&&v.valid&&v.reached){r=E.missionPlan(alt.inputs[s.plan.variant]);variant=s.plan.variant;}}
  const meta={strategy,strategies:st,variant,input,keptReserve:s.plan.situation.reserve??0};
  if(r.valid&&!r.reached)return Object.assign({valid:false,unreached:true,limited:true,reason:(r.note?r.note+' ':'')+unreachedNote(r,s),finalCash:r.finalCash,missing:r.missing},meta);
  if(r.valid){r.verification=E.missionVerify(r);if(r.verification.ok===false)return Object.assign({valid:false,reason:verifyText(r.verification),verification:r.verification},meta);}
  if(r.valid&&s.plan.resaleAfterGoal===true)r.resaleAfterGoal=planResale(s,r);
  return Object.assign(r,meta);}
 if(tool==='goal')return goal(s,source);if(tool==='session')return session(s,source);if(tool==='roi')return roi(s,source,ctx);if(tool==='order'){if(!M){const r0=E.order(orderInput(s,source));return !r0.valid&&r0.blockedIndex!==undefined&&upkeepEats(s)?{...r0,reason:UPKEEP_EATS}:r0;}const x=orderAnalysis(s,source,ctx);if(x.best&&x.best.valid)return {...x.best.result,order:x.best.order,objective:x.objective,method:x.search&&x.search.method};return {valid:false,reason:x.reason,incomplete:!!x.incomplete,steps:[],totalHours:null,finalCapital:null,finalHourly:null};}
 if(tool==='budget'){const input=budgetInput(s),unknown=input.allocations.filter(v=>v===null).length;if(!unknown)return E.budget(input);
  const r=E.budget({...input,allocations:input.allocations.map(v=>v===null?0:v)});return r.valid?{...r,partial:true,unknownCount:unknown,shares:r.shares.map((x,i)=>input.allocations[i]===null?null:x)}:r;}
 if(tool==='purchase'){const p=purchase(s,source);return E.purchase({...p,capital:p.capital===null||p.reserve===null?null:p.capital-p.reserve,price:p.price===null||p.extras===null?null:p.price+p.extras});}
 if(tool==='activities'){if(!Number.isInteger(s.goal.players)||s.goal.players<1||s.goal.players>100)return{valid:false,reason:'Scrivi un numero di giocatori tra 1 e 100.'};const a=activities(s,source).find(a=>a.id===s.inverse.selected);if(!a)return{valid:false,reason:'Scegli un’attività.'};if(a.players>s.goal.players)return{valid:false,reason:'Questa attività si gioca in '+a.players+' giocatori; siete in '+s.goal.players+'. Cambia il tuo gruppo o scegli uno scenario da giocare da solo.'};if((a.requiresPurchaseIds||[]).some(id=>!s.assets.some(x=>x.itemId===id&&x.owned)))return{valid:false,reason:'Ti manca un acquisto per questa attività. Spunta “Ce l’ho già” in “Cosa compro prima?”.'};return E.inverse({...s.inverse,capital:s.goal.capital,reserve:s.goal.reserve,activity:a});}
 return{valid:false,reason:'Scegli uno strumento.'};
}
const metrics={plan:['totalMinutes','Tempo di gioco fino all’obiettivo del piano','min',-1],compare:['bestWaitHours','Tempo di gioco prima di avere l’opzione scelta','h',-1],goal:['totalMinutes','Tempo di gioco per il mio obiettivo','min',-1],session:['profit','Guadagnato durante la partita','$',1],activities:['profit','Guadagnato, tolto l’acquisto iniziale','$',1],roi:['netProfit','Guadagnato alla fine, tolto il prezzo','$',1],purchase:['remaining','Quello che mi resta dopo l’acquisto','$',1],order:['totalHours','Tempo di gioco fino all’ultimo acquisto','h',-1],budget:['available','Quello che mi resta, senza i soldi messi da parte','$',1]};
function metric(tool,s){if(tool==='roi'&&roiMode(s)==='estimate')return ['remaining','Quello che mi resta dopo questo acquisto','$',1];if(tool==='roi'&&roiMode(s)==='new'&&typeof s.goal.hourly==='number'&&Number.isFinite(s.goal.hourly))return ['marginalNetProfit','Guadagnato in più rispetto a quanto guadagnavo già, tolto il prezzo','$',1];return metrics[tool];}
function sensitivity(tool,s,source=[]){
 let path,label,sourceInput=false;
 function reward(id){let i=s.activities.findIndex(a=>a.id===id),a=s.activities[i];if(i<0){i=source.findIndex(a=>a.id===id);a=source[i];sourceInput=true;}if(!a)return;path=sourceInput?[i,'reward']:['activities',i,'reward'];label='Ricompensa di “'+a.name+'” soltanto';}
 if(tool==='goal'){if(s.model==='continuous'){path=['goal','hourly'];label='Quanto guadagni all’ora: 20% in più o in meno';}else{const owned=s.assets.filter(a=>a.owned).map(a=>a.itemId),candidate=s.activities.find(a=>a.players<=s.goal.players&&(a.requiresPurchaseIds||[]).every(id=>owned.includes(id))&&E.activity(a).valid);reward(s.goal.selected==='mixed'?candidate?.id:s.goal.selected);}}
 if(tool==='activities')reward(s.inverse.selected);
 if(tool==='session'){const r=session(s,source),id=r.valid?r.timeline.find(x=>x.net>0)?.id:null;reward(id||eligible(s,source).find(a=>E.activity(a).valid)?.id);}
 if(['roi','purchase'].includes(tool)){const i=s.assets.findIndex(a=>a.key===(tool==='roi'?s.roi.key:s.purchase.key));if(i<0)return null;path=['assets',i,'price'];label='Il prezzo dell’acquisto: 20% più caro o più economico';}
 if(tool==='order'&&s.order.keys.filter(k=>asset(s,k)).length<1)return {pending:true,label:'Quanto guadagni all’ora: 20% in più o in meno',need:'Aggiungi almeno un acquisto con il suo prezzo in “Cosa compro prima?”: questo blocco mostrerà come cambia il tempo fino all’ultimo acquisto quando il tuo guadagno all’ora cambia del 20%.'};
 if(tool==='compare'&&s.compare.keys.filter(k=>asset(s,k)).length<2)return {pending:true,label:'Quanto guadagni all’ora: 20% in più o in meno',need:'Aggiungi almeno due acquisti da confrontare: questo blocco mostrerà come cambia l’attesa prima di poter comprare quando il tuo guadagno all’ora cambia del 20%.'};
 if(tool==='order'||tool==='compare'){path=['goal','hourly'];label='Quanto guadagni all’ora: 20% in più o in meno';}
 if(tool==='plan'){const p=s.plan,si=p.situation;
  if(p.source==='hourly'){if(!Number.isFinite(si.hourly)||si.hourly<=0)return {pending:true,label:'Quanto guadagni all’ora: 20% in più o in meno',need:'Scrivi quanto guadagni all’ora in “Come guadagni i tuoi soldi?”: questo blocco mostra allora come cambia il tempo fino al tuo obiettivo quando quel guadagno varia del 20%.'};path=['plan','situation','hourly'];label='Quanto guadagni all’ora: 20% in più o in meno';}
  else{const i=p.missions.findIndex(m=>Number.isFinite(m.reward)&&m.reward>0&&!(m.once&&m.done));if(i<0)return {pending:true,label:'La ricompensa della tua prima missione: 20% in più o in meno',need:'Aggiungi almeno una missione con la sua ricompensa in “Come guadagni i tuoi soldi?”: questo blocco mostra allora come cambia il tempo fino al tuo obiettivo quando quella ricompensa varia del 20%.'};path=['plan','missions',i,'reward'];label='Ricompensa di “'+p.missions[i].name+'” soltanto: 20% in più o in meno';}}
 if(tool==='budget'){const first=s.budget.source==='basket'?s.assets.findIndex(a=>a.key===s.order.keys[0]):-1;path=first>=0?['assets',first,'price']:s.budget.source==='manual'?['budget','allocations',0]:['budget','extra'];label='Solo il prezzo della tua prima spesa';}
 if(!path)return null;let value=sourceInput?source:s;for(const k of path)value=value[k];
 return{label,path:path.slice(),sourceInput,rows:[.8,1,1.2].map(f=>{const c=copy(s),sources=sourceInput?copy(source):source;let p=sourceInput?sources:c;path.slice(0,-1).forEach(k=>p=p[k]);const v=Number.isFinite(value)?Math.min(1e12,value*f):null;p[path.at(-1)]=v;return{factor:f,value:v,bounded:Number.isFinite(value)&&value*f>1e12,result:evaluate(tool,c,sources)};})};
}
const HYP_MARKET=['gains','prices','costs','time'];
const HYP_NEED={order:'Aggiungi almeno un acquisto con il suo prezzo in “Cosa compro prima?”.',compare:'Aggiungi almeno due acquisti da confrontare.',hourly:'Scrivi quanto guadagni all’ora in “Come guadagni i tuoi soldi?”.',missions:'Aggiungi almeno una missione con la sua ricompensa in “Come guadagni i tuoi soldi?”.'};
const hypScale=(v,f)=>typeof v==='number'&&Number.isFinite(v)?Math.round(v*f*100)/100:v;
function hypLevers(tool,s){const m=tool==='roi'?roiMode(s):null;
 return ({goal:['gains','prices','costs','time','play','reserve','capital','goal'],activities:['gains','prices','costs','time','play','reserve','capital'],session:['gains','prices','costs','time','play','reserve','capital'],purchase:['prices','costs','reserve','capital'],roi:m==='estimate'?['prices','costs','reserve','capital']:['gains','prices','costs','time','play'],order:['gains','prices','costs','reserve','capital'],budget:['prices','costs','reserve','capital'],compare:['gains','prices','costs','reserve','capital'],plan:['gains','prices','goal','costs','time','play','days','reserve','capital']})[tool]||[];}
function hypActs(tool,c,src){const all=[...c.activities,...src],byId=id=>all.filter(a=>a.id===id).slice(0,1);
 if(tool==='goal')return c.model==='cycles'?(c.goal.selected==='mixed'?c.activities.slice():byId(c.goal.selected)):[];
 if(tool==='activities')return byId(c.inverse.selected);
 if(tool==='session')return all.filter(a=>c.session.enabled.includes(a.id));
 if(tool==='roi')return ['new','improve'].includes(roiMode(c))?all.filter(a=>c.roi.activityIds.includes(a.id)):[];
 return [];}
function hypAssets(tool,c){const keys=tool==='purchase'?[c.purchase.key]:tool==='roi'?[c.roi.key]:tool==='order'?c.order.keys:tool==='compare'?c.compare.keys:tool==='budget'&&c.budget.source==='basket'?c.order.keys:[];return keys.map(k=>asset(c,k)).filter(Boolean);}
function hypApply(tool,c,src,lever,f){const g=c.goal,p=c.plan,acts=hypActs(tool,c,src),assets=hypAssets(tool,c),m=tool==='roi'?roiMode(c):null;
 const sc=(o,k,ff=f)=>{if(o)o[k]=hypScale(o[k],ff);};
 const simLever=()=>{const sim=c.analysis&&c.analysis.sim;if(!sim)return;if(lever==='costs'){sc(sim.soin,'prixUnitaire');sc(sim.amendes,'prix');sc(sim.mort,'perte');sc(sim.arrestation,'perte');}if(lever==='gains')sc(sim['revenu-passif'],'parHeure');};
 if(tool==='plan'&&p.useHypotheses===true)simLever();else if(tool==='goal'||tool==='order'||(tool==='session'&&lever==='costs'))simLever();
 if(tool==='plan'){const si=p.situation;
  if(lever==='gains'){if(p.source==='hourly')sc(si,'hourly');else p.missions.forEach(x=>sc(x,'reward'));p.prerequisites.forEach(x=>sc(x,'boostHourly'));sc(p.goal,'boostHourly');}
  if(lever==='prices'){if(p.goal.kind==='purchase')sc(p.goal,'price');if(p.goal.kind==='unlock')sc(p.goal,'alsoPrice');p.prerequisites.forEach(x=>{if(!x.owned)sc(x,'price');});if(p.source==='missions')p.missions.forEach(x=>{if(!x.owned)sc(x,'investment');});}
  if(lever==='costs'){sc(si,'upkeepPerSession');if(p.source==='missions')p.missions.forEach(x=>sc(x,'cost'));p.prerequisites.forEach(x=>sc(x,'usagePerSession'));}
  if(lever==='time'&&p.source==='missions')p.missions.forEach(x=>{sc(x,'duration');sc(x,'prep');sc(x,'cooldown');});
  if(lever==='play'&&typeof si.dailyMinutes==='number'&&si.dailyMinutes>0)si.dailyMinutes=Math.min(1440,si.dailyMinutes+30);
  if(lever==='days'&&typeof si.dailyMinutes==='number'&&si.dailyMinutes>0&&(si.daysPerWeek??7)<7)si.daysPerWeek=(si.daysPerWeek??7)+1;
  if(lever==='reserve'){if((si.reserve??0)>0)si.reserve=0;else if(typeof si.capital==='number'&&si.capital>0)si.reserve=Math.round(si.capital*0.1);}
  if(lever==='capital')sc(si,'capital');
  if(lever==='goal'){if(p.goal.kind==='amount')sc(p.goal,'target');if(p.goal.kind==='unlock'&&typeof p.goal.targetUnits==='number')p.goal.targetUnits=Math.ceil(p.goal.targetUnits*f);}
  return;}
 if(lever==='gains'){
  if(tool==='goal'&&c.model==='continuous'||tool==='order'||tool==='compare')sc(g,'hourly');
  if(tool==='roi'&&m==='continuous')sc(c.roi,'revenueHourly');
  if(tool==='roi'&&m==='new')sc(g,'hourly');
  acts.forEach(a=>sc(a,'reward'));
  if(tool==='order'||tool==='compare')assets.forEach(a=>{if(a.incomeMode==='personal')sc(a,'boostHourly');});}
 if(lever==='prices'){
  if(tool==='goal')sc(g,'plannedSpend');
  acts.forEach(a=>{if(!a.owned)sc(a,'investment');});
  assets.forEach(a=>{if(!a.owned)sc(a,'price');});
  if(tool==='budget'){if(c.budget.source!=='basket')c.budget.allocations=c.budget.allocations.map(v=>hypScale(v,f));sc(c.budget,'extra');}}
 if(lever==='costs'){
  if(tool==='goal'||tool==='order')sc(g,'upkeepPerSession');
  acts.forEach(a=>sc(a,'cost'));
  assets.forEach(a=>{if(!a.owned){sc(a,'extras');sc(a,'fees');}});
  if(tool==='roi'&&m==='continuous')sc(c.roi,'costHourly');}
 if(lever==='time')acts.forEach(a=>{sc(a,'duration');sc(a,'prep');sc(a,'cooldown');});
 if(lever==='play'){
  if(tool==='goal'&&typeof g.dailyMinutes==='number'&&g.dailyMinutes>0)g.dailyMinutes=Math.min(1440,g.dailyMinutes+30);
  if(tool==='activities'&&typeof c.inverse.minutes==='number')c.inverse.minutes=Math.min(1440,c.inverse.minutes+30);
  if(tool==='session'&&typeof c.session.minutes==='number')c.session.minutes=Math.min(1440,c.session.minutes+30);
  if(tool==='roi'&&typeof c.roi.hours==='number'&&c.roi.hours>0)c.roi.hours=hypScale(c.roi.hours,1.2);}
 if(lever==='reserve'){if((g.reserve??0)>0)g.reserve=0;else if(typeof g.capital==='number'&&g.capital>0)g.reserve=Math.round(g.capital*0.1);}
 if(lever==='capital')sc(g,'capital');
 if(lever==='goal'&&tool==='goal')sc(g,'target');}
const HYP_LABEL={gains:'Tutto quello che guadagni: 20% in meno',prices:'I prezzi: più cari del 20%',costs:'Spese e costi: 20% in più',time:'Le missioni durano il 20% in più',days:'Un giorno di gioco in più a settimana',capital:'Parti con il 20% di soldi in meno',prudent:'Tutto va peggio, nello stesso momento',favorable:'Tutto va meglio, nello stesso momento'};
function hypLabel(tool,s,lever){
 if(lever==='play')return tool==='goal'?'Giochi 30 min in più al giorno':tool==='activities'?'Hai 30 min in più':tool==='session'?'La tua partita dura 30 min in più':tool==='roi'?'Lo usi il 20% più a lungo':'Partite più lunghe di 30 min';
 if(lever==='reserve')return ((tool==='plan'?s.plan.situation.reserve:s.goal.reserve)??0)>0?'Spendi anche i soldi tenuti da parte':'Tieni da parte il 10% dei tuoi soldi';
 if(lever==='goal')return tool==='plan'?'Il tuo obiettivo richiede il 20% in più':'Il tuo obiettivo è più alto del 20%';
 return HYP_LABEL[lever];}
function hypotheses(tool,s,source=[],ctx={}){
 const met=metric(tool,s);if(!met)return {valid:false,reason:'Scegli uno strumento.',rows:[]};
 const [key,label,unit,direction]=met,sens=sensitivity(tool,s,source);
 if(sens&&sens.pending)return {valid:false,pending:true,reason:tool==='plan'?(s.plan.source==='hourly'?HYP_NEED.hourly:HYP_NEED.missions):HYP_NEED[tool]||sens.need,key,label,unit,direction,rows:[]};
 const base=evaluate(tool,s,source,ctx);
 if(!base.valid||!Number.isFinite(base[key]))return {valid:false,reason:base.reason||'Non ancora calcolabile.',key,label,unit,direction,rows:[]};
 const R=v=>Math.round(v*100)/100,baseDays=Number.isFinite(base.days)?base.days:null;
 const before=JSON.stringify([s,source]),levers=hypLevers(tool,s),rows=[];
 const run=(id,kind,label,changes)=>{const c=copy(s),src=copy(source);changes.forEach(([lever,f])=>hypApply(tool,c,src,lever,f));if(JSON.stringify([c,src])===before)return false;
  const r=evaluate(tool,c,src,ctx),ok=r.valid&&Number.isFinite(r[key]),delta=ok?R(r[key]-base[key]):null,days=ok&&Number.isFinite(r.days)?r.days:null,dDays=days!==null&&baseDays!==null?days-baseDays:null;
  const byMetric=ok&&delta!==0?delta*direction>0:null,byDays=dDays?dDays<0:null,better=!ok?false:byMetric===null?byDays:byDays===null||byDays===byMetric?byMetric:null;
  rows.push({id,kind,label,valid:ok,reason:ok?null:(r.reason||'Non calcolabile.'),value:ok?R(r[key]):null,delta,pct:ok&&base[key]!==0?delta/Math.abs(base[key])*100:null,better,days,dDays});return true;};
 const UNFAV={gains:0.8,prices:1.2,costs:1.2,time:1.2,capital:0.8,goal:1.2,play:1,days:1,reserve:1};
 levers.forEach(l=>run(l,'one',hypLabel(tool,s,l),[[l,UNFAV[l]]]));
 const market=levers.filter(l=>HYP_MARKET.includes(l)&&rows.some(x=>x.id===l));
 if(market.length>1){run('prudent','all',HYP_LABEL.prudent,market.map(l=>[l,l==='gains'?0.8:1.2]));run('favorable','all',HYP_LABEL.favorable,market.map(l=>[l,l==='gains'?1.2:0.8]));}
 const ones=rows.filter(x=>x.kind==='one'),broken=ones.find(x=>!x.valid),moved=ones.filter(x=>x.valid&&x.delta!==0).sort((a,b)=>Math.abs(b.delta)-Math.abs(a.delta));
 const prudent=rows.find(x=>x.id==='prudent'),favorable=rows.find(x=>x.id==='favorable');
 return {valid:true,key,label,unit,direction,base:{value:R(base[key]),days:baseDays},rows,top:moved[0]||null,broken:broken||null,range:prudent&&favorable?{prudent,favorable}:null};
}
function signature(s){const c=copy(s);delete c.name;delete c.mode;delete c.views;delete c.tab;delete c.catalogue;delete c.completed;delete c.modelVersion;delete c.modelUpgradedFrom;return JSON.stringify(c);}
function referenceWarnings(s,catalogue){const out=[];s.assets.forEach(a=>{if(!a.itemId)return;const item=catalogue.find(x=>x.id===a.itemId);if(!item)out.push(a.name+': questa scheda non esiste più, il tuo prezzo resta salvato.');else if(a.referencePrice!==item.price)out.push(item.name+': il prezzo del sito è cambiato; controlla il tuo numero.');});return out;}
function initial(dataVersion,presets){return defaults({version:2,dataVersion,mode:'quick',model:'continuous',name:'Il mio primo milione',tab:'goal',goal:{capital:200000,target:1000000,hourly:100000,reserve:0,dailyMinutes:60,players:1,selected:'scenario-a',meaning:'available',plannedSpend:null,upkeepPerSession:null,deadlineDays:null,resaleOwned:false},activities:presets.map(a=>({id:a.id,name:a.name,reward:a.reward,cost:a.cost,duration:a.duration,prep:a.prep,cooldown:a.cooldown,share:a.share,investment:a.investment,players:a.players,owned:false})),session:{minutes:60,maxRepeat:100,enabled:['scenario-a','scenario-b','scenario-c']},inverse:{minutes:60,selected:'scenario-a'},purchase:{itemId:'',price:100000,hourly:50000,boostHourly:0,capital:200000,target:1000000,reserve:0,extras:0},catalogue:{query:'',type:'all',status:'all',maxPrice:null,sort:'name',favorites:[],compareIds:[],favoritesOnly:false}});}
return Object.freeze({MODEL_VERSION,roiMode,hourlyNet,compareNames,compareChanges,roiChanges,planLogId,analysis,goalTarget,goalPurchase,usageOf,terrainFits,OBJECTIVES,dependencyOrder,copy,tools,names,defaults,initial,validate,migrate,asset,addAsset,activities,eligible,purchase,goal,session,projection,roi,investment,decision,blank,orderInput,budgetInput,chooseInput,planInput,planMissing,planPurchases,planReserve,planGoalName,planStrategies,planAlternatives,planObserved,planNextSession,planDeadline,planCurve,planTemplate,planMissionTemplate,planPrereqTemplate,planLogTemplate,planVariantTemplate,analysisTemplate,assetTemplate,MECHANICS,ROLES,GOAL_MEANINGS,PRIORITIES,TERRAINS,STRATEGIES,STRATEGY_LABEL,PLAN_KINDS,PLAN_SOURCES,evaluate,metrics,metric,sensitivity,hypotheses,signature,referenceWarnings});
});
