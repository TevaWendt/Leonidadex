/* v7.61 : pluriel selon la langue de la page : français n > 1 (« 0 coché », « 1,5 million ») ; anglais, espagnol n ≠ 1 (« 0 marcados ») */
var lkPluriel=function(n){return ((typeof document!=='undefined'&&document.documentElement&&document.documentElement.lang)||'fr').slice(0,2)==='fr'?n>1:n!==1;};
/* État partagé v5 et sélecteurs déterministes. Aucun prix ni revenu n'est inventé.
   v4 (v7.33) : le business plan garde une stratégie, une échéance, les étapes faites et l'historique du réel.
   v5 (v7.34) : le business plan a ses propres réponses (but, situation, missions, achats d'avant) : rien n'est pris en silence
   dans les huit calculs ; le programme se fait mission par mission ; les sauvegardes v1 à v4 se lisent telles quelles.
   v6 (v7.48, lot 1) : structures communes de l’analyse, ajoutées sans rien changer aux chiffres existants — horizon et
   besoin d’usage partagés, sens d’un but en argent (détenu, disponible après la réserve, gains cumulés), mécaniques
   simulées (désactivées par défaut), par achat : rôle, coût d’usage, capacités, revente, dépendances et déblocages ;
   dans le plan : durée d’obtention et prérequis des achats d’avant, missions de déblocage faites une fois, choix
   verrouillés, variantes sans écraser le plan de référence, identifiant de chaque réalisation (pas de double crédit),
   versions du modèle et des données. Une case nouvelle vaut null (pas encore écrit), jamais 0 inventé. */
(function(root,factory){'use strict';if(typeof module==='object'&&module.exports)module.exports=factory(require('./calculateurs-engine.js'),require('./calculateurs-modele.js'));else root.LKCalcScenario=factory(root.LKCalcEngine,root.LKCalcModel);})(typeof globalThis!=='undefined'?globalThis:this,function(E,M){
'use strict';
const copy=x=>JSON.parse(JSON.stringify(x));
const tools=['goal','activities','session','purchase','order','roi','budget','compare'];
const names={goal:'Mi objetivo',activities:'Mis actividades',session:'Mi tiempo de juego',purchase:'Mis compras',order:'¿Qué compro primero?',roi:'¿Vale la pena?',budget:'Mi presupuesto',compare:'¿Qué compra elijo?',plan:'Mi plan de negocio'};
const assetTemplate={key:'free-1',itemId:'',name:'Mi compra libre',price:100000,referencePrice:null,extras:0,fees:0,owned:false,incomeMode:'none',boostHourly:0,utility:null,
 // v6 : rôle de l’achat (ouvre une activité, améliore, remplace une dépense, confort, plaisir ; « unknown » = pas dit),
 // coût d’usage (par partie, par utilisation) et nombre d’utilisations, revente (non comptée sans valeur choisie),
 // capacités écrites par le joueur quand le site ne les connaît pas, achats à posséder avant, activités débloquées.
 role:'unknown',usage:{perSession:null,perUse:null,uses:null},resale:null,capabilities:{seats:null,terrain:'',cargo:null},requires:[],unlocks:[]};
// Quel achat choisir ? et Mon business plan : réglages propres à chaque outil, achats partagés via assets.
const compareTemplate={keys:[],criterion:'value',hours:10};
const planTemplateV4={kind:'purchase',key:'',target:null,usePrerequisites:true,upkeepPerSession:0,priority:'balanced',activity:'',details:false,strategy:'auto',deadlineDays:null,countDoneBoost:true,done:[],log:[],playedMinutes:0};
// v5 : le plan possède ses réponses. goal = le but (achat, somme, ou déblocage par des points : rang, XP, réputation…) ;
// situation = où en est le joueur ; missions = ses missions à lui (copiées, jamais liées) ; prerequisites = ses achats d'avant.
const planGoalTemplate={kind:'purchase',name:'',itemId:'',referencePrice:null,price:null,boostHourly:0,target:null,unitLabel:'points',targetUnits:null,currentUnits:0,alsoPrice:0,meaning:'available'};
const planSituationTemplate={capital:null,reserve:0,hourly:null,unitsHourly:0,dailyMinutes:null,daysPerWeek:7,upkeepPerSession:0,players:1};
const planMissionTemplate={id:'m-1',name:'Mi misión',reward:null,cost:0,duration:null,prep:0,cooldown:0,share:100,investment:0,owned:false,units:0,requires:[],once:false,done:false,started:false,requiresMissions:[],players:1};
const planPrereqTemplate={id:'p-1',name:'Mi compra previa',itemId:'',referencePrice:null,price:null,boostHourly:0,owned:false,started:false,minutes:null,requires:[],usagePerSession:null};
const planLogTemplate={id:'',at:'',capital:0,minutes:0,forecast:null,note:'',units:null,unitsGain:null,gain:null,plannedGain:null,sessionMinutes:0,runs:{},purchases:[]};
const planTemplate={goal:copy(planGoalTemplate),situation:copy(planSituationTemplate),source:'hourly',missions:[],prerequisites:[],priority:'balanced',strategy:'auto',variant:'auto',maxRepeat:100,deadlineDays:null,details:false,log:[],playedMinutes:0,sessionsPlayed:0,locked:[],variants:[]};
// v6 : une variante garde une copie des réponses du plan (jamais le plan de référence écrasé) ; cinq au plus.
const planVariantTemplate={id:'v-1',label:'Mi variante',at:'',goal:copy(planGoalTemplate),situation:copy(planSituationTemplate),source:'hourly',missions:[],prerequisites:[],priority:'balanced',strategy:'auto',maxRepeat:100,deadlineDays:null};
// v6 : réglages d’analyse partagés par les huit calculs. Tout est « pas encore écrit » (null) ou désactivé au départ.
const MECHANICS=['carburant','entretien','reparation','assurance','revente','munitions','soin','revenu-passif','echec','bonus'];
const analysisTemplate={horizon:{sessions:null,uses:null,hours:null},need:{usage:'',passengers:null,terrain:'',cargo:false},priority:'fast',
 simulations:Object.fromEntries(MECHANICS.map(m=>[m,false])),
 sim:{carburant:{distance:null,consommation:null,prixUnitaire:null},entretien:{parPartie:null},reparation:{parPartie:null},assurance:{parPartie:null},revente:{valeur:null},munitions:{parTentative:null},soin:{points:null},'revenu-passif':{parHeure:null,plafond:null},echec:{tentativesRatees:null},bonus:{pourcentage:null}}};
const ROLES=['unknown','income','unlock','improve','replace','comfort','pleasure'],GOAL_MEANINGS=['held','available','cumulative'],PRIORITIES=['fast','cheapStart','cheapTotal','reserve'],TERRAINS=['','route','tout-terrain','eau','air'];
const STRATEGIES=['auto','asIs','byPayback','cheapFirst','skipNoBoost','direct','useReserve'];
const PLAN_KINDS=['purchase','amount','unlock'],PLAN_SOURCES=['hourly','missions'];
function defaults(old){
 const s=copy(old);s.version=6;s.modelVersion=1;s.analysis=copy(analysisTemplate);s.views=Object.fromEntries([...tools,'plan'].map(t=>[t,'quick']));
 s.assets=[copy(assetTemplate)];s.purchase={key:'free-1'};
 s.session={...s.session,daysPerWeek:7,usualMinutes:60};
 s.activities=s.activities.map(a=>({...a,prepOnce:false,requiresPurchaseIds:[]}));
 s.roi={key:'free-1',mode:'estimate',activityIds:[],hours:10,revenueHourly:null,costHourly:0,gainPercent:20,durationReduction:0,recoveryActivity:'',compareKey:''};
 s.order={keys:[],objective:'all'};s.budget={source:'basket',extra:0,allocations:[50000,60000,20000,10000,0]};
 s.compare=copy(compareTemplate);s.plan=copy(planTemplate);
 // Exemple de départ du plan : les mêmes chiffres d'exemple que les huit calculs, mais écrits ici, dans ses propres cases.
 s.plan.goal.kind='amount';s.plan.goal.target=s.goal.target;s.plan.situation={capital:s.goal.capital,reserve:s.goal.reserve,hourly:s.goal.hourly,unitsHourly:0,dailyMinutes:s.goal.dailyMinutes,daysPerWeek:7,upkeepPerSession:0,players:s.goal.players??1};
 s.completed=[];return s;
}
function asset(s,key){return s.assets.find(a=>a.key===key);}
function addAsset(s,item){let a=s.assets.find(x=>x.itemId===item.id);if(!a){if(s.assets.length>=40)throw Error('Cuarenta compras como máximo. Quita una compra que no uses antes de seguir.');a={...copy(assetTemplate),key:item.id,itemId:item.id,name:item.name,price:item.price,referencePrice:item.price};/* v7.52 : un véhicule ou une arme déjà déclaré dans un carnet (fiche, carnet, tableau de bord) arrive « déjà possédé » : même contexte de calcul. Le crochet LKCalcOwned n’existe que dans le navigateur ; décocher reste possible. */if(typeof globalThis!=='undefined'&&typeof globalThis.LKCalcOwned==='function'&&globalThis.LKCalcOwned(item)===true)a.owned=true;s.assets.push(a);}return a;}
// v4 → v5 : le plan récupère une copie de ce qu'il utilisait (argent, réserve, gain, rythme, but, achats d'avant, activité) ;
// ensuite plus rien n'est partagé avec les huit calculs.
function planToV5(s){
 if(s.plan&&s.plan.goal&&typeof s.plan.goal==='object'&&s.plan.situation)return {...copy(s),version:5};
 const old={...planTemplateV4,...(s.plan||{})},assets=Array.isArray(s.assets)?s.assets:[],find=k=>assets.find(a=>a&&a.key===k),g=s.goal||{};
 const total=a=>a.price===null||a.price===undefined?null:a.price+(Number.isFinite(a.extras)?a.extras:0)+(Number.isFinite(a.fees)?a.fees:0);
 const boost=a=>a.incomeMode==='personal'&&Number.isFinite(a.boostHourly)?a.boostHourly:0;
 const plan=copy(planTemplate);
 plan.situation={capital:g.capital??null,reserve:g.reserve??0,hourly:g.hourly??null,unitsHourly:0,dailyMinutes:g.dailyMinutes??null,daysPerWeek:s.session?.daysPerWeek??7,upkeepPerSession:old.upkeepPerSession??0,players:old.situation?.players??g.players??1};
 const goalAsset=old.kind==='purchase'?find(old.key):null;
 if(goalAsset)plan.goal={...plan.goal,kind:'purchase',name:goalAsset.name||'Mi meta',itemId:goalAsset.itemId||'',referencePrice:goalAsset.referencePrice??null,price:total(goalAsset),boostHourly:boost(goalAsset)};
 else plan.goal={...plan.goal,kind:'amount',target:old.target??g.target??null};
 if(old.usePrerequisites!==false)plan.prerequisites=(s.order?.keys||[]).filter(k=>k!==old.key).map(find).filter(Boolean).slice(0,20).map((a,i)=>({id:'p-'+(i+1),name:a.name||'Compra',itemId:a.itemId||'',referencePrice:a.referencePrice??null,price:total(a),boostHourly:boost(a),owned:a.owned===true}));
 if(old.activity){const a=(s.activities||[]).find(x=>x&&x.id===old.activity);if(a){plan.source='missions';plan.missions=[{id:'m-1',name:a.name||'Mi misión',reward:a.reward??null,cost:a.cost??0,duration:a.duration??null,prep:a.prep??0,cooldown:a.cooldown??0,share:a.share??100,investment:a.investment??0,owned:a.owned===true,units:0,requires:[]}];}}
 plan.priority=old.priority;plan.strategy=old.strategy;plan.deadlineDays=old.deadlineDays;plan.details=old.details;plan.playedMinutes=old.playedMinutes;
 plan.log=(Array.isArray(old.log)?old.log:[]).map(e=>({...copy(planLogTemplate),...e}));
 return {...copy(s),version:5,plan};
}
function migrate(raw,initial){
 if(!raw||typeof raw!=='object'||![1,2,3,4,5,6].includes(raw.version))throw Error('Versión de guardado no reconocida.');
 if(raw.version===6)return raw;
 // v5 → v6 : aucune valeur existante ne change ; les nouvelles cases prennent leur valeur « pas encore écrit » à la validation.
 if(raw.version===5)return {...copy(raw),version:6,modelVersion:raw.modelVersion??1};
 // v3 → v4 : mêmes données, le plan reçoit ses cases de la v4 avec leurs valeurs par défaut ; puis v4 → v5 → v6.
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
 const r=raw.roi||{};s.assets.push({...copy(assetTemplate),key:'legacy-roi',name:'Inversión importada',price:r.purchase===undefined?null:r.purchase,extras:r.upgrades||0,fees:r.fees||0});
 s.roi={...copy(initial.roi),...r,key:'legacy-roi',mode:'continuous',activityIds:[]};
 s.order={keys:[]};(raw.order?.items||[]).forEach((item,i)=>{const a={...copy(assetTemplate),...item,key:'legacy-order-'+i,itemId:'',incomeMode:item.boostHourly?'personal':'none'};s.assets.push(a);s.order.keys.push(a.key);});
 s.budget={...copy(initial.budget),...raw.budget,source:'manual'};s.completed=[];
 /* v7.59 (check ultime, D-08) : comme pour une sauvegarde v3/v4, le business plan reçoit une copie des chiffres du joueur (jamais l’exemple du site). */
 s.plan.situation={...s.plan.situation,capital:s.goal.capital??null,reserve:s.goal.reserve??0,hourly:s.goal.hourly??null,dailyMinutes:s.goal.dailyMinutes??null};s.plan.goal.target=s.goal.target??null;
 // Shared goal values are authoritative; historical copies stay in the untouched v1 storage.
 return s;
}
function validate(raw,initial){
 if(!raw||!raw.goal||!Array.isArray(raw.activities)||(raw.version===3&&!Array.isArray(raw.assets)))throw Error('Guardado incompleto: faltan el objetivo, las actividades o las compras.');
 raw=migrate(raw,initial);
 function walk(t,v,key){
  if(v===undefined)return ['price','reward','duration','capital','target','hourly'].includes(key)?null:copy(t);
  if(t===null||typeof t==='number'){if(v===null)return null;if(typeof v!=='number'||!Number.isFinite(v)||Math.abs(v)>1e12)throw Error('Número no válido: '+key);return v;}
  if(typeof t==='string'){if(typeof v!=='string'||v.length>200)throw Error('Texto no válido: '+key);return v;}
  if(typeof t==='boolean'){if(typeof v!=='boolean')throw Error('Opción no válida: '+key);return v;}
  if(Array.isArray(t)){
   if(!Array.isArray(v)||v.length>100)throw Error('Lista no válida: '+key);
   if(key==='log'){const seenLog=new Set();return v.slice(0,60).filter(e=>{if(!e||typeof e!=='object'||typeof e.id!=='string'||!e.id)return true;if(seenLog.has(e.id))return false;seenLog.add(e.id);return true;}).map(e=>{if(!e||typeof e!=='object'||Array.isArray(e))throw Error('Historial del plan no válido.');const capital=typeof e.capital==='number'&&Number.isFinite(e.capital)&&e.capital>=0&&e.capital<=1e12?e.capital:null;if(capital===null)throw Error('Historial del plan no válido.');const num=(x,max)=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=max?x:null;const any=x=>typeof x==='number'&&Number.isFinite(x)&&Math.abs(x)<=1e12?x:null;const runs={};if(e.runs&&typeof e.runs==='object'&&!Array.isArray(e.runs))Object.keys(e.runs).slice(0,12).forEach(k=>{const n=num(e.runs[k],1e5);if(k.length<=60&&n!==null)runs[k]=n;});return {id:typeof e.id==='string'?e.id.slice(0,80):'',at:typeof e.at==='string'?e.at.slice(0,40):'',capital,minutes:num(e.minutes,1e7)??0,forecast:any(e.forecast),note:typeof e.note==='string'?e.note.slice(0,300):'',units:num(e.units,1e12),unitsGain:any(e.unitsGain),gain:any(e.gain),plannedGain:any(e.plannedGain),sessionMinutes:num(e.sessionMinutes,1e5)??0,runs,purchases:Array.isArray(e.purchases)?e.purchases.filter(x=>typeof x==='string'&&x.length<=60).slice(0,20):[]};});}
   if(key==='missions'){if(v.length>12)throw Error('Doce misiones como máximo en el plan.');return v.map((x,i)=>{const m=walk(planMissionTemplate,x,'mission');if(typeof m.id!=='string'||!m.id)m.id='m-'+(i+1);return m;});}
   if(key==='prerequisites'){if(v.length>20)throw Error('Veinte compras previas como máximo en el plan.');return v.map((x,i)=>{const a=walk(planPrereqTemplate,x,'prerequisite');if(typeof a.id!=='string'||!a.id)a.id='p-'+(i+1);return a;});}
   if(key==='variants'){if(v.length>5)throw Error('Cinco variantes como máximo en el plan.');return v.map((x,i)=>{const a=walk(planVariantTemplate,x,'variant');if(typeof a.id!=='string'||!a.id)a.id='v-'+(i+1);return a;});}
   if(['keys','activityIds','requiresPurchaseIds','enabled','favorites','compareIds','completed','done','requires','unlocks','requiresMissions','locked'].includes(key)){if(v.some(x=>typeof x!=='string'||x.length>160))throw Error('Identificador no válido.');return [...new Set(v)].slice(0,key==='compareIds'?3:100);}
   if(key==='assets'){if(v.length<1||v.length>40)throw Error('De una a cuarenta compras por escenario.');return v.map(x=>walk(assetTemplate,x,'asset'));}
   if(key==='activities'){if(v.length!==initial.activities.length)throw Error('Número de actividades personales incompatible.');return v.map((x,i)=>walk(initial.activities[i],x,'activity'));}
   if(key==='allocations'&&v.length!==5)throw Error('Reparto del presupuesto incompatible.');
   return v.map((x,i)=>walk(t[i]===undefined?t[0]:t[i],x,key));
  }
  if(!v||typeof v!=='object'||Array.isArray(v))throw Error('Ajustes incompletos: '+key);
  const o={};for(const k of Object.keys(t))o[k]=walk(t[k],v[k],k);return o;
 }
 const s=walk(initial,raw,'scenario');
 if(![...tools,'plan'].includes(s.tab)||!['quick','guided','advanced'].includes(s.mode)||!['continuous','cycles'].includes(s.model))throw Error('Herramienta o modo no válido.');
 if(!asset(s,s.purchase.key)||!asset(s,s.roi.key))throw Error('Falta la referencia interna de una compra. No se puede restaurar el guardado.');
 if(!['all','vehicle','weapon','property','business','place','hideout','style','customization','consumable','ammo','housing','activity'].includes(s.catalogue.type)||!['all','known','unknown','manual','official','verified','estimated'].includes(s.catalogue.status)||!['name','price-up','price-down'].includes(s.catalogue.sort))throw Error('Filtro de catálogo incompatible.');
 if(s.activities.some((a,i)=>a.id!==initial.activities[i].id))throw Error('Referencia de actividad no válida.');
 if(new Set(s.assets.map(a=>a.key)).size!==s.assets.length||s.assets.some(a=>!a.key||!['none','personal','roi'].includes(a.incomeMode)))throw Error('Referencias de compras incompatibles.');
 if(!['estimate','new','improve','continuous'].includes(s.roi.mode)||!['basket','manual'].includes(s.budget.source))throw Error('Modelo de cálculo incompatible.');
 if(!['value','cheapest','cheapestTotal','fastest','profit','utility'].includes(s.compare.criterion)||!PLAN_KINDS.includes(s.plan.goal.kind)||!PLAN_SOURCES.includes(s.plan.source)||!['balanced','fast','safe','cheap'].includes(s.plan.priority))throw Error('Ajuste de comparación o de plan incompatible.');
 if(!STRATEGIES.includes(s.plan.strategy))s.plan.strategy='auto';if(s.plan.deadlineDays!==null&&(!Number.isInteger(s.plan.deadlineDays)||s.plan.deadlineDays<1||s.plan.deadlineDays>36500))s.plan.deadlineDays=null;if(!Number.isFinite(s.plan.playedMinutes)||s.plan.playedMinutes<0)s.plan.playedMinutes=0;if(!Number.isInteger(s.plan.sessionsPlayed)||s.plan.sessionsPlayed<0)s.plan.sessionsPlayed=0;
 if(typeof s.plan.variant!=='string'||s.plan.variant.length>80)s.plan.variant='auto';if(!Number.isInteger(s.plan.maxRepeat)||s.plan.maxRepeat<1||s.plan.maxRepeat>256)s.plan.maxRepeat=100;if(s.plan.goal.unitLabel.trim()==='')s.plan.goal.unitLabel='points';
 {const ids=new Set();s.plan.missions.forEach((m,i)=>{if(ids.has(m.id))m.id='m-'+(i+1)+'-'+ids.size;ids.add(m.id);});const pids=new Set();s.plan.prerequisites.forEach((a,i)=>{if(pids.has(a.id))a.id='p-'+(i+1)+'-'+pids.size;pids.add(a.id);});s.plan.missions.forEach(m=>{m.requires=m.requires.filter(id=>pids.has(id));});}
 s.compare.keys=s.compare.keys.filter(k=>asset(s,k)).slice(0,6);
 s.assets.forEach(a=>{if(a.utility!==null&&(!Number.isInteger(a.utility)||a.utility<1||a.utility>5))a.utility=null;if(!ROLES.includes(a.role))a.role='unknown';if(!TERRAINS.includes(a.capabilities.terrain))a.capabilities.terrain='';for(const k of ['perSession','perUse','uses'])if(a.usage[k]!==null&&a.usage[k]<0)a.usage[k]=null;if(a.usage.uses!==null&&!Number.isInteger(a.usage.uses))a.usage.uses=Math.round(a.usage.uses);a.requires=a.requires.filter(k=>k!==a.key);});
 // v6 : sens du but, priorité et besoin d’usage ; une valeur inattendue revient à la valeur par défaut au lieu de tout refuser.
 if(!GOAL_MEANINGS.includes(s.plan.goal.meaning))s.plan.goal.meaning='available';if(!GOAL_MEANINGS.includes(s.goal.meaning))s.goal.meaning='available';if(!OBJECTIVES.includes(s.order.objective))s.order.objective='all';if(s.goal.deadlineDays!==null&&(!Number.isInteger(s.goal.deadlineDays)||s.goal.deadlineDays<1||s.goal.deadlineDays>36500))s.goal.deadlineDays=null;if(!PRIORITIES.includes(s.analysis.priority))s.analysis.priority='fast';if(!TERRAINS.includes(s.analysis.need.terrain))s.analysis.need.terrain='';
 {const pids=new Set(s.plan.prerequisites.map(a=>a.id)),mids=new Set(s.plan.missions.map(m=>m.id));s.plan.prerequisites.forEach(a=>{a.requires=a.requires.filter(id=>(pids.has(id)||mids.has(id))&&id!==a.id);});s.plan.missions.forEach(m=>{m.requiresMissions=m.requiresMissions.filter(id=>mids.has(id)&&id!==m.id);});s.plan.locked=s.plan.locked.filter(id=>id==='strategy'||id==='goal'||mids.has(id)||pids.has(id));}
 for(const t of [...tools,'plan'])if(!['quick','guided','advanced'].includes(s.views[t]))s.views[t]='quick';
 s.mode=s.views[s.tab];return s;
}
// v7.49 : munitions simulées (ton hypothèse, désactivée par défaut) : ajoutées aux frais de chaque tentative, dans tous les outils.
function ammoPerAttempt(s){const on=s.analysis&&s.analysis.simulations&&s.analysis.simulations.munitions,v=on?s.analysis.sim.munitions.parTentative:null;return typeof v==='number'&&Number.isFinite(v)&&v>0?v:0;}
function activities(s,source=[]){const ammo=ammoPerAttempt(s);return [...s.activities.map(a=>({...a,status:'manual',investment:a.owned?0:a.investment,...(ammo&&typeof a.cost==='number'?{cost:a.cost+ammo,ammoSimulated:ammo}:{})})),...source.map(a=>ammo&&typeof a.cost==='number'?{...a,cost:a.cost+ammo,ammoSimulated:ammo}:a)];}
function eligible(s,source=[]){
 const owned=s.assets.filter(a=>a.owned).map(a=>a.itemId).filter(Boolean);
 return activities(s,source).filter(a=>s.session.enabled.includes(a.id)&&a.players<=s.goal.players&&(a.requiresPurchaseIds||[]).every(id=>owned.includes(id)));
}
function purchase(s,source=[]){const a=asset(s,s.purchase.key)||{...assetTemplate,price:null};let boost=a.incomeMode==='personal'?a.boostHourly:0;if(a.incomeMode==='roi'){const r=roi(s,source);boost=s.roi.key===a.key&&['new','improve'].includes(s.roi.mode)&&r.valid&&Number.isFinite(r.netHourly)?Math.max(0,r.netHourly):null;}return {...a,extras:a.extras===null||a.fees===null?null:a.extras+a.fees,capital:s.goal.capital,reserve:s.goal.reserve,target:s.goal.target,hourly:s.goal.hourly,boostHourly:boost};}
function goal(s,source=[]){
 // v7.49 : le but vise l’argent disponible après la réserve (comme avant), l’argent détenu (réserve comprise) ou des gains
 // cumulés ; les dépenses prévues avant le but s’ajoutent à ce qu’il faut gagner ; les dépenses par partie baissent le gain.
 const g=s.goal,target=goalTarget(s),daily=typeof g.dailyMinutes==='number'&&g.dailyMinutes>0?g.dailyMinutes:null,up=typeof g.upkeepPerSession==='number'&&g.upkeepPerSession>0?g.upkeepPerSession:0;
 if(s.model==='continuous'){
  let hourly=g.hourly;
  if(up>0){if(!daily)return{valid:false,reason:'Tus gastos por partida necesitan tu tiempo de juego por día: escríbelo.'};if(typeof hourly==='number')hourly=hourly-up*60/daily;}
  if(typeof hourly==='number'&&hourly<=0&&up>0&&target!==null&&target>(g.capital??0)-(g.reserve??0))return{valid:false,reason:'Tus gastos por partida se comen todo lo que ganas: bájalos o gana más por hora.'};
  const r=E.goalContinuous({...g,target,hourly:typeof hourly==='number'?Math.max(0,hourly):hourly});
  return up>0&&r.valid?{...r,upkeepHourly:up*60/daily}:r;}
 if(!Number.isInteger(g.players)||g.players<1||g.players>100)return{valid:false,reason:'Escribe un número de jugadores entre 1 y 100.'};
 const all=activities(s,source), compatible=all.filter(a=>a.players<=g.players&&(a.requiresPurchaseIds||[]).every(id=>s.assets.some(x=>x.itemId===id&&x.owned)));
 const run=extra=>{const t=target===null?null:target+g.reserve+extra;
  if(g.selected==='mixed')return E.goalMixed({...g,target:t,activities:compatible.filter(a=>s.activities.some(x=>x.id===a.id))});
  const a=compatible.find(a=>a.id===g.selected);if(!a){const excluded=all.find(a=>a.id===g.selected);return{valid:false,reason:excluded&&excluded.players>g.players?'Este escenario se juega con '+excluded.players+' jugadores; sois '+g.players+'.':'Elige una actividad compatible con tu grupo y las compras que tienes.'};}
  return E.goal({...g,target:t,activity:a});};
 if(!up)return run(0);
 // Dépenses par partie : chaque partie en plus coûte aussi ; on recalcule jusqu’à ce que le nombre de parties ne bouge plus.
 let extra=0,r=run(0);for(let i=0;i<24&&r.valid;i+=1){const need=up*r.sessions;if(need===extra)break;extra=need;r=run(extra);}
 return r.valid?{...r,upkeepTotal:extra}:r;
}
function session(s,source=[]){
 if(!Number.isInteger(s.goal.players)||s.goal.players<1||s.goal.players>100)return{valid:false,reason:'Dime si juegas solo o con más gente en Mis actividades.'};
 const candidates=eligible(s,source),valid=candidates.filter(a=>E.activity(a).valid);
 return E.sessionPlan({capital:s.goal.capital,reserve:s.goal.reserve,minutes:s.session.minutes,maxRepeat:s.session.maxRepeat,activities:valid.length?valid:candidates});
}
function projection(s,source=[],r=session(s,source)){
 if(!r.valid)return r;
 const repeat=copy(s);repeat.goal.capital=r.finalCapital;repeat.session.minutes=s.session.usualMinutes;
 const paid=new Set(r.breakdown.filter(a=>a.runs).map(a=>a.id));repeat.activities.forEach(a=>{if(paid.has(a.id))a.owned=true;});
 const next=repeat.session.minutes===s.session.minutes?{valid:true,profit:r.profit+r.investment}:session(repeat,source);
 return E.sessionProjection({capital:s.goal.capital,reserve:s.goal.reserve,target:s.goal.target,session:r,repeatProfit:next.valid?next.profit:null,repeatReason:next.valid?null:next.reason,daysPerWeek:s.session.daysPerWeek});
}
function roi(s,source=[],ctx={}){
 const r=s.roi,a=asset(s,r.key);if(!a)return{valid:false,reason:'Elige una compra de la lista.'};
 if(r.mode==='estimate')return decision(s,source);
 const input={...r,purchase:a.price,upgrades:a.extras,fees:a.fees};
 if(r.mode==='continuous'){const u=usagePerHourOf(s,a,ctx);if(u!==null&&!(r.costHourly>0))return {...E.roi({...input,costHourly:u}),usageFromPurchase:u};return E.roi(input);}
 const acts=activities(s,source).filter(a=>r.activityIds.includes(a.id));
 if(acts.length!==r.activityIds.length)return{valid:false,reason:'Una de las actividades ya no existe. Elige otra.'};
 if(acts.some(a=>a.players>s.goal.players))return{valid:false,reason:'Una de las actividades necesita más jugadores de los que sois. Cambia el número de jugadores en Mis actividades.'};
 // Nouvelle activité : le temps passé dessus ne rapporte plus ce que le joueur gagnait déjà (son chiffre par heure), si on le connaît.
 return E.investmentActivities({...input,activities:acts,baselineHourly:r.mode==='new'?s.goal.hourly:null});
}
function investment(s,source=[],ctx={}){const a=asset(s,s.roi.key);if(!a)return{valid:false,reason:'Elige una compra.'};const u=usagePerHourOf(s,a,ctx),cost=u!==null&&!(s.roi.costHourly>0)?u:s.roi.costHourly;return E.investmentCompare({capital:s.goal.capital,reserve:s.goal.reserve,price:a.price,extras:a.extras,fees:a.fees,baselineHourly:s.goal.hourly,extraHourly:s.roi.revenueHourly,costHourly:cost,hours:s.roi.hours,dailyMinutes:s.goal.dailyMinutes});}
// Coût d’usage de l’achat converti par heure (une partie = ton temps de jeu par jour) ; null s’il n’est pas connu.
function usagePerHourOf(s,a,ctx){if(!M||!a)return null;const u=usageOf(s,a,itemOf(a,ctx)),d=typeof s.goal.dailyMinutes==='number'&&s.goal.dailyMinutes>0?s.goal.dailyMinutes:null;return M.V.usable(u.perSession)&&d?u.perSession.v*60/d:null;}
function decision(s,source=[],key=s.roi.key){
 const a=asset(s,key);if(!a)return{valid:false,reason:'Elige una compra o escribe una compra libre.'};
 let hourly=s.goal.hourly;
 if(s.roi.recoveryActivity){const activity=activities(s,source).find(x=>x.id===s.roi.recoveryActivity),r=activity&&E.activity(activity);hourly=r?.valid&&r.hourly>=0?r.hourly:null;}
 return E.worth({capital:s.goal.capital,reserve:s.goal.reserve,price:a.price,extras:a.extras,fees:a.fees,hourly,hours:s.roi.hours});
}
function blank(current){
 const s=copy(current);s.name='Mi cálculo';s.model='continuous';s.completed=[];
 s.goal={...s.goal,capital:null,target:null,hourly:null,dailyMinutes:null,reserve:0,players:1,selected:'scenario-a',meaning:'available',plannedSpend:null,upkeepPerSession:null,deadlineDays:null};
 s.assets=[{...copy(assetTemplate),price:null}];s.purchase={key:'free-1'};
 s.roi={...s.roi,key:'free-1',mode:'estimate',hours:null,gainPercent:0,durationReduction:0,activityIds:[],revenueHourly:null,costHourly:0,compareKey:'',recoveryActivity:''};
 s.order={keys:[],objective:'all'};s.budget={source:'manual',extra:0,allocations:[0,0,0,0,0]};s.compare={...copy(compareTemplate)};s.plan=copy(planTemplate);s.analysis=copy(analysisTemplate);
 s.activities=s.activities.map((a,i)=>({...a,name:'Mi actividad '+String.fromCharCode(65+i),reward:null,duration:null,cost:0,prep:0,cooldown:0,share:100,investment:0,players:1,owned:false,prepOnce:false,requiresPurchaseIds:[]}));
 s.session={...s.session,enabled:['scenario-a'],minutes:null,usualMinutes:null,daysPerWeek:null};s.inverse={selected:'scenario-a',minutes:null};
 return s;
}
function orderInput(s,source=[]){
 const items=s.order.keys.map(key=>{const a=asset(s,key);if(!a)return{name:'Compra ausente',price:null};let boost=0;
  if(a.incomeMode==='personal')boost=a.boostHourly;
  if(a.incomeMode==='roi'){const r=roi(s,source);boost=s.roi.key===key&&['new','improve'].includes(s.roi.mode)&&r.valid&&Number.isFinite(r.netHourly)?Math.max(0,r.netHourly):null;}
  return{name:a.name+(a.owned?' (ya en tu poder)':''),price:a.owned?0:a.price===null||a.extras===null||a.fees===null?null:a.price+a.extras+a.fees,boostHourly:a.owned?0:boost};});
 return {capital:s.goal.capital,reserve:s.goal.reserve,hourly:s.goal.hourly,items};
}
function budgetInput(s){const allocations=s.budget.source==='basket'?s.order.keys.map(k=>{const a=asset(s,k);return a?.owned?0:!a||a.price===null||a.extras===null||a.fees===null?null:a.price+a.extras+a.fees;}):s.budget.allocations.slice();allocations.push(s.budget.extra);return{capital:s.goal.capital,reserve:s.goal.reserve,allocations};}
function chooseInput(s,source=[]){
 const items=s.compare.keys.map(k=>{const a=asset(s,k);if(!a)return null;let income=null;if(a.incomeMode==='personal'&&a.boostHourly>0)income=a.boostHourly;if(a.incomeMode==='roi'){const r=roi(s,source);if(s.roi.key===k&&['new','improve','continuous'].includes(s.roi.mode)&&r.valid&&Number.isFinite(r.netHourly)&&r.netHourly>0)income=r.netHourly;}
  return {name:a.name,price:a.owned?0:a.price,extras:a.extras,fees:a.fees,utility:a.utility,incomeHourly:income};}).filter(Boolean);
 return {capital:s.goal.capital,reserve:s.goal.reserve,hourly:s.goal.hourly,dailyMinutes:s.goal.dailyMinutes,hours:s.compare.hours,criterion:s.compare.criterion,items};
}
/* ---------- Mon business plan (v5) : ses propres réponses, un programme mission par mission ---------- */
const STRATEGY_LABEL={auto:'Dejar que la calculadora elija',asIs:'En el orden que he dado',byPayback:'Primero lo que más rápido da dinero',cheapFirst:'Primero lo más barato',skipNoBoost:'Solo las compras que dan dinero',direct:'Directamente hacia mi meta, sin comprar nada antes',useReserve:'Tocando el dinero apartado'};
function planReserve(s,strategy=s.plan.strategy){return s.plan.priority==='fast'||strategy==='useReserve'?0:(s.plan.situation.reserve??0);}
// Achats d'avant dans l'ordre de la stratégie ; « auto » = l'ordre donné (la recommandation se calcule à part).
function planPurchases(s,strategy=s.plan.strategy){const list=s.plan.prerequisites.slice(),ratio=x=>x.boostHourly>0&&x.price!==null?x.price/x.boostHourly:Infinity;let ordered=list.slice();
 if(strategy==='byPayback')ordered.sort((a,b)=>ratio(a)-ratio(b)||list.indexOf(a)-list.indexOf(b));
 if(strategy==='cheapFirst')ordered.sort((a,b)=>(a.price??1e12)-(b.price??1e12)||list.indexOf(a)-list.indexOf(b));
 // v7.49 : un achat verrouillé (« indispensable ») n’est jamais retiré par une stratégie ; les dépendances entre achats
 // d’avant sont respectées quel que soit l’ordre choisi (un achat passe après ce qu’il demande).
 const locked=new Set(s.plan.locked||[]);
 if(strategy==='skipNoBoost')ordered=ordered.filter(x=>x.owned||x.boostHourly>0||locked.has(x.id));
 if(strategy==='direct')ordered=ordered.filter(x=>x.owned||locked.has(x.id));
 return dependencyOrder(ordered).map(x=>({id:x.id,name:x.name,price:x.price,boostHourly:x.boostHourly,owned:x.owned,minutes:x.minutes??0,requires:(x.requires||[]).slice(),usagePerSession:x.usagePerSession??0}));}
function dependencyOrder(list){const ids=new Set(list.map(x=>x.id)),out=[],placed=new Set();let guard=0;
 while(out.length<list.length&&guard++<list.length*list.length+5){const next=list.find(x=>!placed.has(x.id)&&(x.requires||[]).every(r=>!ids.has(r)||placed.has(r)));if(!next){list.filter(x=>!placed.has(x.id)).forEach(x=>{placed.add(x.id);out.push(x);});break;}placed.add(next.id);out.push(next);}
 return out;}
function planGoalName(s){const g=s.plan.goal;return g.kind==='amount'?'tener '+E.dollars(String(g.target),' ')+'':g.kind==='unlock'?'desbloquear '+(g.name||'mi objetivo'):(g.name||'mi compra');}
function planInput(s,strategy=s.plan.strategy){const p=s.plan,g=p.goal,si=p.situation;
 /* v7.54 : le groupe (si.players) écarte les missions qui demandent plus de joueurs ; les munitions simulées s’ajoutent aux frais de
    chaque tentative, comme dans Mes activités (revue v7.53, écarts B1 et B2). */
 const group=Number.isInteger(si.players)&&si.players>0?si.players:1,ammo=ammoPerAttempt(s),excludedMissions=p.source==='missions'?p.missions.filter(m=>(m.players||1)>group).map(m=>({id:m.id,name:m.name,players:m.players})):[];
 return {capital:si.capital,reserve:planReserve(s,strategy),sessionMinutes:si.dailyMinutes,excludedMissions,ammoPerAttempt:ammo,players:group,daysPerWeek:si.daysPerWeek??7,upkeepPerSession:si.upkeepPerSession??0,maxRepeat:p.maxRepeat,goalMeaning:g.kind==='amount'?g.meaning:'available',
  hourly:p.source==='hourly'?si.hourly:0,unitsHourly:p.source==='hourly'&&g.kind==='unlock'?(si.unitsHourly??0):0,
  goalPrice:g.kind==='purchase'?g.price:g.kind==='unlock'?(g.alsoPrice??0):null,target:g.kind==='amount'?g.target:null,targetUnits:g.kind==='unlock'?g.targetUnits:null,currentUnits:g.kind==='unlock'?(g.currentUnits??0):0,
  activities:p.source==='missions'?p.missions.filter(m=>(m.players||1)<=group).map(m=>({id:m.id,name:m.name,reward:m.reward,cost:typeof m.cost==='number'&&ammo&&!m.once?m.cost+ammo:m.cost,duration:m.duration,prep:m.prep,cooldown:m.cooldown,share:m.share,investment:m.investment,owned:m.owned,units:g.kind==='unlock'?m.units:0,requiresPurchaseIds:m.requires,requiresMissions:m.requiresMissions||[],once:m.once===true,done:m.done===true,players:1,ammoSimulated:ammo||0})):[],
  purchases:planPurchases(s,strategy),goalName:planGoalName(s),goalIncomeHourly:g.kind==='purchase'?(g.boostHourly||0):0};}
// Ce qui manque pour calculer : dit dans l'ordre des questions du formulaire.
function planMissing(s){const p=s.plan,g=p.goal,si=p.situation;
 if(g.kind==='purchase'&&(g.price===null||!Number.isFinite(g.price)))return 'Escribe el precio de tu meta, aunque sea el que imaginas.';
 if(g.kind==='amount'&&(g.target===null||!Number.isFinite(g.target)))return 'Escribe la cantidad que quieres tener.';
 if(g.kind==='unlock'&&(g.targetUnits===null||!Number.isFinite(g.targetUnits)))return 'Escribe la cantidad de '+g.unitLabel+' que hay que llegar a tener.';
 if(si.capital===null||!Number.isFinite(si.capital))return 'Escribe el dinero que tienes ahora.';
 // v7.49 : sans durée de partie, le plan se fait en parcours continu (sans calendrier) ; une durée écrite doit être positive.
 if(si.dailyMinutes!==null&&(!Number.isFinite(si.dailyMinutes)||si.dailyMinutes<=0))return 'Una partida dura al menos 1 minuto (o déjalo vacío para un recorrido sin partidas).';
 if(si.dailyMinutes===null&&(si.upkeepPerSession>0||p.prerequisites.some(x=>x.usagePerSession>0)))return 'Tus gastos por partida necesitan la duración de una partida: escríbela.';
 {const todo=p.prerequisites.filter(x=>!x.owned&&(x.price===null||!Number.isFinite(x.price)));if(todo.length)return 'Recorrido por completar: escribe el precio de '+todo.map(x=>'“'+x.name+'”').join(', ')+' (aunque sea el que imaginas), o marca “Ya lo tengo”.';}
 if(p.source==='hourly'&&(si.hourly===null||!Number.isFinite(si.hourly)))return 'Escribe lo que ganas por hora, o elige tus misiones.';
 if(p.source==='missions'&&!p.missions.length)return 'Añade al menos una misión que puedas hacer.';
 return null;}
// Stratégies : plusieurs ordres d'achats d'avant (et la réserve) comparés par recalcul complet ; la recommandation suit la priorité.
function planStrategies(s){const missing=planMissing(s);if(missing)return {valid:false,reason:missing,candidates:[],recommended:null,explored:0};
 const ids=['asIs','byPayback','cheapFirst','skipNoBoost','direct','useReserve'],seen={},candidates=[];
 ids.forEach(id=>{const input=planInput(s,id),key=id==='useReserve'?'reserve':input.purchases.map(x=>x.id).join('|');if(id!=='asIs'&&id!=='useReserve'&&seen[key]!==undefined)return;if(id==='useReserve'&&input.reserve===planInput(s,'asIs').reserve)return;seen[key]=id;
  const r=E.missionPlan(input),removes=input.purchases.filter(x=>!x.owned).length<planInput(s,'asIs').purchases.filter(x=>!x.owned).length;
  candidates.push({id,label:STRATEGY_LABEL[id],valid:r.valid&&r.reached,reason:r.valid?(r.reached?null:r.note):r.reason,totalSessions:r.valid&&r.reached?r.totalSessions:null,totalMinutes:r.valid&&r.reached?r.totalMinutes:null,days:r.valid&&r.reached?r.days:null,finalCash:r.valid?r.finalCash:null,lowCash:r.valid&&r.lowPoint&&Number.isFinite(r.lowPoint.cash)?r.lowPoint.cash:null,reserveKept:input.reserve>0||(s.plan.situation.reserve??0)===0,removes,note:removes?'quita una compra pedida':(id==='useReserve'?'gasta el dinero apartado':null)});});
 const ok=candidates.filter(c=>c.valid&&!c.removes),byTime=(a,b)=>(a.totalSessions===null&&b.totalSessions===null?a.totalMinutes-b.totalMinutes:a.totalSessions-b.totalSessions)||b.finalCash-a.finalCash||ids.indexOf(a.id)-ids.indexOf(b.id);
 /* v7.54 : « je garde mon argent de côté » (équilibre) et « je ne touche jamais à mon argent de côté » (sécurité) sont respectés :
    aucun plan qui puise dans la réserve n’est recommandé à leur place. S’il n’en existe pas, le plan est bloqué avec la raison et
    la façon d’en sortir (revue v7.53, écart B3). En sécurité, le plan gardé est celui dont le point bas est le plus haut. */
 const priority=['fast','balanced','safe','cheap'].includes(s.plan.priority)?s.plan.priority:'balanced';
 const kept=(s.plan.situation.reserve??0);
 let pool=priority==='fast'?ok:ok.filter(c=>c.reserveKept);
 const bySafety=(a,b)=>((b.lowCash??-Infinity)-(a.lowCash??-Infinity))||byTime(a,b);
 if(!pool.length){const asIs=candidates.find(c=>c.id==='asIs'),usesReserve=ok.find(c=>!c.reserveKept);
  return {valid:true,reason:null,candidates,recommended:null,blocked:true,explored:candidates.length,blockedReason:'Ningún plan mantiene tus '+E.dollars(new Intl.NumberFormat('es-ES').format(Math.round(kept)),' ')+' apartados'+(asIs&&asIs.reason?': '+asIs.reason.replace(/\.?$/,'')+'.':'.')+(usesReserve?' Si usas el dinero apartado, hay un plan ('+(usesReserve.totalSessions!==null?usesReserve.totalSessions+(E.plural(usesReserve.totalSessions)?' partidas':' partida'):Math.round(usesReserve.totalMinutes)+' min')+', con un mínimo de '+E.dollars(new Intl.NumberFormat('es-ES').format(Math.round(usesReserve.lowCash??0)),' ')+'): para verlo, elige “Lo más rápido posible: puedo tocar mi dinero apartado” en “Prefiero”.':' Baja el dinero apartado o los gastos, o añade una misión más barata para empezar.')};}
 const byCost=(a,b)=>((b.finalCash??-Infinity)-(a.finalCash??-Infinity))||byTime(a,b);
 const recommended=pool.slice().sort(priority==='safe'?bySafety:priority==='cheap'?byCost:byTime)[0]?.id||null;
 return {valid:true,reason:null,candidates,recommended,explored:candidates.length};}
function planAlternatives(s,r){if(!r||!r.valid||!r.input)return {valid:false,reason:'Plan sin calcular.',plans:[],results:{}};const obs=planObserved(s);const extra=[];
 if(obs&&obs.hourly!==null&&obs.hourly>0)extra.push({id:'observed',label:'Al ritmo que has tenido de verdad ('+E.dollars(new Intl.NumberFormat('es-ES',{maximumFractionDigits:0}).format(Math.round(obs.hourly)),' ')+' por hora)',changes:{activities:[],hourly:obs.hourly,unitsHourly:obs.unitsHourly||0},note:'Según tus actualizaciones, no según tus misiones.'});
 return E.missionAlternatives({...r.input,extraPlans:extra});}
// Ce que le joueur a vraiment fait, d'après ses mises à jour : gain moyen par heure et par partie, dernière partie contre prévu.
function planObserved(s){const log=s.plan.log.filter(e=>e.gain!==null&&e.sessionMinutes>0);if(!log.length)return null;const minutes=log.reduce((a,e)=>a+e.sessionMinutes,0),gain=log.reduce((a,e)=>a+e.gain,0),units=log.reduce((a,e)=>a+(e.unitsGain||0),0);const last=log[log.length-1];
 return {sessions:log.length,minutes,gain,hourly:minutes>0?gain*60/minutes:null,perSession:gain/log.length,unitsHourly:minutes>0?units*60/minutes:0,last:{gain:last.gain,plannedGain:last.plannedGain,gap:last.plannedGain===null?null:last.gain-last.plannedGain,minutes:last.sessionMinutes,at:last.at}};}
// v7.49 : identifiant d’un relevé réel, tiré de son contenu : le même relevé envoyé deux fois (double clic, import répété) n’est compté qu’une fois.
function planLogId(o){const t=JSON.stringify(o);let h=2166136261;for(let i=0;i<t.length;i+=1){h^=t.charCodeAt(i);h=Math.imul(h,16777619);}return 'log-'+(h>>>0).toString(36);}
function planDeadline(s,r){if(!s.plan.deadlineDays||!r||!r.valid||!r.input)return null;return E.missionDeadline(r.input,s.plan.deadlineDays);}
function planCurve(r){if(!r||!r.valid)return [];const c=E.missionCurve(r);return c.valid?c.points:[];}
function planNextSession(r){return r&&r.valid&&r.sessions.length?r.sessions[0]:null;}
/* ---------- v7.49 (lot 2) : analyses complètes, calculées avec les fonctions communes (LKCalcModel) ----------
   analysis(outil, état, activités du site, {catalogue}) → { conditions, admission, valeurs, coûts, verdict, explication… }.
   Tout chiffre vient du moteur ou de LKCalcModel ; une valeur inconnue garde son statut jusque dans l’explication. */
const OBJECTIVES=['all','income','reserve','given'];
const SIM_LABEL={carburant:'Combustible',entretien:'Mantenimiento',reparation:'Reparaciones',assurance:'Seguro',revente:'Reventa',munitions:'Munición',soin:'Curación',"revenu-passif":'Ingresos del negocio',echec:'Intentos fallidos',bonus:'Bonus'};
const V=M?M.V:null;
function itemOf(a,ctx){return a&&a.itemId&&ctx&&Array.isArray(ctx.catalogue)?ctx.catalogue.find(x=>x.id===a.itemId)||null:null;}
const num=x=>typeof x==='number'&&Number.isFinite(x);
const fmt=n=>num(n)?new Intl.NumberFormat('es-ES',{maximumFractionDigits:0}).format(Math.round(n)):'?';
// Prix d’un achat avec son statut : le prix du site (officiel) seulement s’il est connu et repris tel quel.
/* v7.59 (check ultime, CALC-13) : le prix du site garde son statut réel (officiel, mesuré, estimation…) via le schéma unique (V.published), jamais « officiel » par défaut. */
function priceV(a,item){if(!a||a.price===null||a.price===undefined)return V.blank();if(item&&num(item.price)&&a.price===item.price){const m=item.fieldMeta?.price||{};const v=V.published({value:a.price,status:m.status||'unverified',source:m.source||null,verifiedAt:m.verifiedAt||null});if(v.source)v.src=v.source;return v;}return V.personal(a.price);}
function totalAcq(a,item){if(!a)return M.total([]);if(a.owned)return M.total([{label:'Ya es tuyo',value:V.personal(0)}]);return M.total([{label:'Precio',value:priceV(a,item),field:'price'},{label:'Opciones',value:a.extras===null?V.blank():V.personal(a.extras||0),field:'extras'},{label:'Gastos obligatorios al principio',value:a.fees===null?V.blank():V.personal(a.fees||0),field:'fees'}]);}
// Coût d’usage par partie : ton chiffre s’il est écrit ; sinon les mécaniques que tu as choisi de simuler (véhicule) ;
// sinon « mécanique non confirmée » (véhicule, arme) ou « sans objet » (le reste). Jamais les deux à la fois.
function usageOf(s,a,item){
 const u=a&&a.usage||{},on=s.analysis.simulations,sim=s.analysis.sim,type=item?item.type:(a&&!a.itemId&&a.capabilities&&a.capabilities.terrain?'vehicle':null);
 const anySim=['carburant','entretien','reparation','assurance'].some(k=>on[k]);
 if(num(u.perSession))return {perSession:V.personal(u.perSession),lines:[{label:'Coste por partida (tu cifra)',value:u.perSession,status:'personal'}],missing:[],note:anySim?'Has escrito un coste por partida: las simulaciones no se suman a él (nada se cuenta dos veces).':null,source:'personal'};
 const lines=[],missing=[];let total=0,any=false;
 if(type==='vehicle'){
  if(on.carburant){const f=sim.carburant;if([f.distance,f.consommation,f.prixUnitaire].every(num)){const v=M.units.fuelPerSession(f.distance,f.consommation,f.prixUnitaire);total+=v;any=true;lines.push({label:'Combustible (simulación)',value:v,status:'simulated',formula:fmt(f.distance)+' km × '+f.consommation+' L/100 km ÷ 100 × '+f.prixUnitaire+' $/L'});}else missing.push('Combustible: distancia, consumo y precio del litro');}
  for(const k of ['entretien','reparation','assurance'])if(on[k]){const v=sim[k].parPartie;if(num(v)){total+=v;any=true;lines.push({label:SIM_LABEL[k]+' (simulation)',value:v,status:'simulated'});}else missing.push(SIM_LABEL[k]+' por partida');}
 }
 if(any&&!missing.length)return {perSession:V.simulated(total),lines,missing,note:null,source:'simulated'};
 if(missing.length)return {perSession:V.blank(),lines,missing,note:'Simulación incompleta: '+missing.join(', ')+'.',source:'blank'};
 if(type==='vehicle')return {perSession:V.unconfirmed('carburant'),lines,missing,note:'Combustible, mantenimiento, reparaciones: ningún coste confirmado en GTA VI. Puedes escribir tu cifra o elegir una simulación.',source:'unconfirmed'};
 if(type==='weapon')return {perSession:V.unconfirmed('munitions'),lines,missing,note:'Munición: precio y consumo no publicados. Puedes escribir tu cifra si quieres contarlos.',source:'unconfirmed'};
 return {perSession:V.na('Sin coste de uso para este tipo de compra, salvo que escribas uno.'),lines,missing,note:null,source:'na'};
}
function resaleOf(s,a){if(!a||a.resale===null||a.resale===undefined)return V.unconfirmed('revente');return V.simulated(a.resale,{note:'Reventa elegida por ti'});}
function purchasableCheck(item,a){
 if(!a||!a.itemId)return {id:'achetable',label:'Compra libre',state:'na'};
 if(!item)return {id:'achetable',label:'Ficha no encontrada',state:'unknown',detail:'Esta ficha ya no existe en el catálogo: tu precio se conserva.'};
 if(item.purchasable===false||item.type==='place')return {id:'achetable',label:'Comprable',state:'ko',detail:item.type==='place'?'Un lugar no se puede comprar.':'Este objeto no se puede comprar en GTA VI.',fix:{text:'Elige un objeto que se pueda comprar.'}};
 if(item.purchasable===true)return {id:'achetable',label:'Comprable',state:'ok'};
 return {id:'achetable',label:'Compra por confirmar',state:'assumed',detail:'Rockstar aún no ha dicho si se puede comprar ni cómo: el cálculo supone que sí.'};
}
function cashCond(cc,label){if(!cc)return null;if(cc.owned)return {id:'argent-disponible',label:label||'Pagar ahora',state:'na',detail:'Ya es tuyo: no hay nada que pagar.'};return {id:'argent-disponible',label:label||'Pagar ahora',state:cc.state==='ok'?'ok':cc.state==='short'?'ko':'unknown',detail:cc.state==='short'?(cc.exact?'Te faltan ':'Te faltan al menos ')+E.dollars(fmt(cc.shortfall),' ')+' sin tocar el dinero apartado.':cc.state==='unknown'?cc.reason:'Te alcanza con tu dinero disponible.',fix:cc.state==='short'?{text:'Deja menos apartado, o gana otros '+E.dollars(fmt(cc.shortfall),' ')+' antes.',delta:cc.shortfall}:null};}
function cashFor(s,acq,a){if(a&&a.owned)return {owned:true,state:'ok',shortfall:0};return M.cashCheck({cash:s.goal.capital===null?null:V.personal(s.goal.capital),reserve:s.goal.reserve===null?null:V.personal(s.goal.reserve),spends:acq.rows.map(r=>({label:r.label,value:r.value,field:r.field}))});}
function sessionMinutesOf(s){return num(s.goal.dailyMinutes)&&s.goal.dailyMinutes>0?s.goal.dailyMinutes:null;}
function horizonSessions(s){const h=s.analysis.horizon;if(num(h.sessions))return h.sessions;const d=sessionMinutesOf(s);if(num(h.hours)&&d)return Math.ceil(h.hours*60/d-1e-9);return null;}
// Payable maintenant ≠ soutenable dans la durée : chaque partie rapporte ton gain par heure et coûte l’usage.
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
/* ----- Mes achats ----- */
function purchaseAnalysis(s,source,ctx){
 const a=asset(s,s.purchase.key),item=itemOf(a,ctx),acq=totalAcq(a,item),cc=cashFor(s,acq,a),use=usageOf(s,a,item),sessions=horizonSessions(s);
 const cost=M.usageCost({initial:acq.complete?V.personal(acq.value):V.unknown(),perSession:use.perSession,resale:resaleOf(s,a)},{sessions});
 const pc=purchasableCheck(item,a),need=needChecks(s,a,item),conditions=[cashCond(cc),pc,...need].filter(Boolean),adm=M.admission(conditions);
 const role=a?(a.role!=='unknown'?a.role:a.incomeMode==='none'?'pleasure':'income'):'unknown';
 const st=sustain(s,acq.complete?acq.value:null,use.perSession,sessions);
 const used=['argent-disponible','reserve','cout-acquisition'],excluded={};
 if(pc.state==='na')excluded.achetable='Compra libre: la describes tú.';else used.push('achetable');
 if(need.length)used.push('usage-compatible');else excluded['usage-compatible']='No has escrito ninguna necesidad de uso (terreno, plazas, carga).';
 if(V.usable(use.perSession)){used.push('cout-usage');if(sessions!==null)used.push('cout-complet','horizon','frequence');else{excluded['cout-complet']='Escribe en cuántas partidas piensas usarlo para tener el coste completo.';excluded.horizon='No has escrito ningún periodo.';excluded.frequence='No has escrito ningún número de partidas.';}}
 else{excluded['cout-usage']=use.source==='na'?'Este tipo de compra no tiene coste de uso, salvo que escribas uno.':use.note||'Coste de uso sin escribir.';excluded['cout-complet']='Hace falta un coste de uso para ir más allá del precio.';excluded.horizon='Solo sirve con un coste de uso.';excluded.frequence='Solo sirve con un coste de uso.';}
 if(num(s.goal.hourly)){used.push('delai-recuperation');}else excluded['delai-recuperation']='Escribe lo que ganas por hora para saber en cuánto tiempo recuperas tu dinero.';
 used.push('argent-restant');
 if(role==='income'&&a&&a.incomeMode!=='none')used.push('gain-en-plus');else excluded['gain-en-plus']=role==='pleasure'?'Compra por gusto: no se calcula ninguna rentabilidad.':'No has escrito ninguna ganancia extra.';
 if(V.usable(cost.resale))used.push('revente-prevue');else excluded['revente-prevue']='Reventa: mecánica no confirmada; solo se cuenta si escribes un precio de reventa.';
 const mechanicsOn=Object.keys(s.analysis.simulations).filter(k=>s.analysis.simulations[k]);
 if(use.source==='simulated')used.push('mecanique-simulee');else excluded['mecanique-simulee']=mechanicsOn.length?'Has escrito tu propio coste por partida: la simulación no se añade.':'Ninguna mecánica simulada (combustible, mantenimiento…): no se inventa nada.';
 const values=[{label:'Precio',value:acq.rows[0]?.value,unit:'$',field:'f-purchase-price'},{label:'Opciones',value:acq.rows[1]?.value,unit:'$',field:'f-purchase-extras'},{label:'Gastos obligatorios al principio',value:acq.rows[2]?.value,unit:'$',field:'f-purchase-fees'},{label:'Ya tengo',value:V.from(s.goal.capital),unit:'$',field:'f-purchase-capital'},{label:'Apartado',value:V.from(s.goal.reserve),unit:'$',field:'f-purchase-reserve'},{label:'Coste por partida',value:use.perSession,unit:'$/partie',field:'f-purchase-usage'},{label:'Partidas contadas',value:sessions===null?V.blank():V.personal(sessions),unit:'partidas',field:'f-analysis-horizon'}];
 const drivers=[];
 if(cc.state==='short')drivers.push({label:'Dinero disponible',text:'Precio, opciones y gastos obligatorios superan lo que puedes gastar en '+E.dollars(fmt(cc.shortfall),' ')+'.',factor:'argent-disponible'});
 else if(cc.state==='ok'&&!cc.owned)drivers.push({label:'Dinero disponible',text:'Todo se paga ahora sin tocar el dinero apartado.',factor:'argent-disponible'});
 if(st&&st.state==='insoutenable')drivers.push({label:'Coste de uso',text:'Cada partida cuesta '+E.dollars(fmt(st.usagePerSession),' ')+' y solo te da '+E.dollars(fmt(st.earnPerSession),' ')+': pierdes '+E.dollars(fmt(-st.netPerSession),' ')+' por partida.',factor:'cout-usage'});
 else if(st&&st.breach)drivers.push({label:'Dinero apartado a la larga',text:'Durante '+st.sessions+' partidas, tu dinero bajaría por debajo de lo que dejas apartado.',factor:'reserve'});
 const missing=[];if(acq.missing.length)missing.push({label:acq.missing.map(m=>m.label).join(', '),text:'Sin esta cifra, no se puede saber si puedes pagar.',field:'f-purchase-price',decisive:true});
 if(!V.usable(use.perSession)&&use.source==='unconfirmed')missing.push({label:'Coste de uso',text:'Puede cambiar la respuesta a la larga; no está confirmado en GTA VI.',field:'f-purchase-usage',decisive:false});
 if(pc.state==='assumed')missing.push({label:'Se puede comprar en GTA VI',text:'Aún no confirmado: la respuesta supone que sí.',decisive:true});
 const explain=M.explain({tool:'purchase',category:item?item.type:null,aim:'Saber si puedes pagar esta compra ahora y lo que cuesta después.',horizon:sessions===null?'Ahora (ninguna partida contada después de la compra)':'Ahora, y luego '+sessions+' partidas',conditions,used,excluded,values,drivers,missing,changes:cc.state==='short'?['Guardar '+E.dollars(fmt(cc.shortfall),' ')+' menos apartados haría posible la compra ahora.']:[]});
 return {tool:'purchase',asset:a,item,acquisition:acq,cash:cc,usage:use,cost,sustain:st,purchasable:pc,admission:adm,role,sessions,explain};
}
/* ----- Quel achat choisir ? ----- */
// Terrain : l’eau et l’air demandent un bateau ou un aéronef ; la route accepte le tout-terrain ; le tout-terrain d’un
// véhicule de route n’est pas documenté (« on ne peut pas dire »), jamais supposé.
/* v7.60 (langues) : le terrain s’affiche en mots (« sur l’eau »), jamais avec son code interne (route, tout-terrain, eau, air). */
const TERRAIN_TXT={route:'por carretera','tout-terrain':'campo a través',eau:'por el agua',air:'por el aire'},terrainText=t=>TERRAIN_TXT[t]||t;
function terrainFits(need,have){const h=have.v;if(need==='eau'||need==='air')return h===need?'ok':'ko';if(need==='route')return h==='route'||h==='tout-terrain'?'ok':'ko';if(need==='tout-terrain')return h==='tout-terrain'?'ok':h==='route'?'unknown':'ko';return 'unknown';}
function needChecks(s,a,item){
 const need=s.analysis.need,checks=[];
 const cap=a&&a.capabilities||{};
 if(need.terrain){const have=cap.terrain?V.personal(cap.terrain):item&&item.type==='vehicle'?M.fromVehicle({cat:item.categoryId||item.category}).terrain:V.unknown();
  const state=have.v===null?'unknown':terrainFits(need.terrain,have);
  checks.push({id:'usage-compatible',label:'Terreno: '+terrainText(need.terrain),state,detail:state==='unknown'?(have.v==='route'&&need.terrain==='tout-terrain'?'Nada indica que vaya campo a través: escríbelo en sus capacidades si lo sabes.':'Terreno desconocido para esta compra: escríbelo en sus capacidades.'):state==='ok'?'Sirve ('+terrainText(have.v)+(have.s==='estimated'?', según su tipo':'')+').':'No sirve: va '+terrainText(have.v)+'.',fix:state==='ko'?{text:'Elige un vehículo que vaya '+terrainText(need.terrain)+'.'}:null});}
 if(num(need.passengers)&&need.passengers>0){const seats=num(cap.seats)?V.personal(cap.seats):item&&num(item.seats)?V.official(item.seats):V.unknown();checks.push({id:'usage-compatible',label:'Plazas: '+need.passengers,state:!V.usable(seats)?'unknown':seats.v>=need.passengers?'ok':'ko',detail:!V.usable(seats)?'Número de plazas desconocido: escríbelo si lo sabes.':seats.v>=need.passengers?seats.v+' plazas.':'Solo '+seats.v+' plazas.',fix:{text:'Elige un vehículo con al menos '+need.passengers+' plazas.'}});}
 if(need.cargo){const cargo=cap.cargo===null||cap.cargo===undefined?V.unknown():V.personal(cap.cargo);checks.push({id:'usage-compatible',label:'Carga',state:!V.usable(cargo)?'unknown':cargo.v>0?'ok':'ko',detail:!V.usable(cargo)?'Capacidad de carga desconocida.':cargo.v>0?'Puede llevar carga.':'No puede llevar carga.'});}
 return checks;
}
function compareAnalysis(s,source,ctx){
 const sessions=horizonSessions(s),rows=[];
 s.compare.keys.forEach(k=>{const a=asset(s,k);if(!a)return;const item=itemOf(a,ctx),acq=totalAcq(a,item),use=usageOf(s,a,item),cost=M.usageCost({initial:acq.complete?V.personal(acq.value):V.unknown(),perSession:use.perSession},{sessions});
  const cc=cashFor(s,acq,a),pc=purchasableCheck(item,a),need=needChecks(s,a,item),conditions=[pc,...need].filter(Boolean),adm=M.admission(conditions);
  rows.push({key:k,name:a.name,asset:a,item,acquisition:acq,usage:use,cost,cash:cc,conditions,admission:adm,utility:a.utility,income:a.incomeMode==='personal'&&a.boostHourly>0?a.boostHourly:null});});
 /* Revue de conformité (v7.53) : un achat libre sans coût d’usage écrit est « sans objet » quand il est seul ; comparé à un
    achat qui a un coût d’usage, ce vide devient « non renseigné » (inconnu), sinon il gagnerait à tort sur la durée. */
 if(rows.some(r=>r.usage.source==='personal'||r.usage.source==='simulated'))for(const r of rows)if(r.usage.source==='na'){
  r.usage={perSession:V.blank(),lines:[],missing:['Coste de uso de “'+r.name+'” (sin rellenar)'],note:'Coste de uso sin rellenar: otra opción tiene uno. Escribe 0 si de verdad no tiene.',source:'blank'};
  r.cost=M.usageCost({initial:r.acquisition.complete?V.personal(r.acquisition.value):V.unknown(),perSession:r.usage.perSession},{sessions});}
 const admissible=rows.filter(r=>r.admission.state==='admissible'||r.admission.state==='conditionnel'||r.admission.state==='inconnu');
 const excluded=rows.filter(r=>r.admission.state==='impossible');
 const P=M.pareto(admissible.map(r=>({id:r.key,admission:{state:'admissible'},values:{now:r.acquisition.complete?r.acquisition.value:null,total:r.cost.total.complete&&sessions!==null&&V.usable(r.usage.perSession)?r.cost.total.value:null,envie:-(r.utility||0)}})),['now','total','deseo']);
 // Point de bascule entre les deux options admissibles les moins chères à l’achat, si leurs coûts d’usage sont connus.
 let cross=null;const priced=admissible.filter(r=>r.acquisition.complete&&V.usable(r.usage.perSession)).sort((x,y)=>x.acquisition.value-y.acquisition.value);
 if(priced.length>=2){const A=priced[0],Bq=priced[1],x=M.crossover({initial:A.acquisition.value,rate:A.usage.perSession.v},{initial:Bq.acquisition.value,rate:Bq.usage.perSession.v});if(x.known&&x.n!==null)cross={a:A.name,b:Bq.name,n:x.n,before:x.before==='a'?A.name:Bq.name,after:x.after==='a'?A.name:Bq.name,costAt:x.costAt};}
 const partial=admissible.filter(r=>!r.acquisition.complete||(sessions!==null&&!r.cost.total.complete&&r.usage.source!=='na'));
 return {tool:'compare',rows,admissible,excluded,pareto:P,crossover:cross,partial,sessions};
}
/* ----- Quoi acheter d’abord ? ----- */
function orderAnalysis(s,source,ctx){
 const keys=s.order.keys.filter(k=>asset(s,k)),d=sessionMinutesOf(s),objective=OBJECTIVES.includes(s.order.objective)?s.order.objective:'all';
 const items=keys.map(k=>{const a=asset(s,k),item=itemOf(a,ctx),use=usageOf(s,a,item);let boost=a.owned?0:a.incomeMode==='personal'?a.boostHourly:0;if(a.incomeMode==='roi'){const r=roi(s,source);boost=s.roi.key===k&&['new','improve'].includes(s.roi.mode)&&r.valid&&Number.isFinite(r.netHourly)?Math.max(0,r.netHourly):null;}
  const costHourly=V.usable(use.perSession)&&d?use.perSession.v*60/d:0;
  return {id:k,name:a.name+(a.owned?' (ya en tu poder)':''),price:a.owned?0:a.price===null||a.extras===null||a.fees===null?null:a.price+a.extras+a.fees,boostHourly:a.owned?0:boost,costHourly:a.owned?0:costHourly,before:(a.requires||[]).filter(r=>keys.includes(r)),unlocks:a.unlocks||[],owned:a.owned,usage:use};});
 const unknown=items.filter(x=>x.price===null);
 /* v7.54 : un prérequis déclaré qui n’est plus dans le panier (ni déjà possédé) bloque l’ordre avec la raison, au lieu de disparaître en silence (revue v7.53, écart I1). */
 const unmet=[];keys.forEach(k=>{const a=asset(s,k);(a.requires||[]).forEach(r=>{if(keys.includes(r))return;const dep=asset(s,r);if(dep&&dep.owned)return;unmet.push({id:k,name:a.name,requires:r,requiresName:dep?dep.name:'una compra retirada'});});});
 if(unmet.length)return {tool:'order',valid:false,reason:unmet.map(u=>'“'+u.name+'” necesita antes “'+u.requiresName+'”, que ya no está en el carrito').join('; ')+'. Vuelve a ponerlo en el carrito, márcalo como “ya lo tengo” o quita la dependencia (Editar).',items,objective,unmet};
 const graph={};items.forEach(x=>{graph[x.id]={id:x.id,name:x.name,requires:x.before,price:x.price===null?V.unknown():V.personal(x.price)};});
 const deps=M.prerequisites({nodes:graph,targets:items.map(x=>x.id)});
 if(deps.cycles.length)return {tool:'order',valid:false,reason:deps.reason,items,deps,objective};
 if(unknown.length)return {tool:'order',valid:false,incomplete:true,reason:'Recorrido por completar: escribe el precio de '+unknown.map(x=>'“'+x.name+'”').join(', ')+' (aunque sea el que imaginas).',items,deps,objective,unknown};
 /* v7.53 : chaque ordre n’est simulé qu’une fois, même quand trois objectifs le comparent (mémoire locale à ce calcul, donc
    toujours à jour avec les dernières saisies). */
 const memo=new Map(),run=order=>{const k=order.join('\u0001');if(!memo.has(k))memo.set(k,runOnce(order));return memo.get(k);};
 const runOnce=order=>{const r=E.order({capital:s.goal.capital,reserve:s.goal.reserve,hourly:s.goal.hourly,items:order.map(id=>items.find(x=>x.id===id))});
  if(!r.valid)return {valid:false,reason:r.reason,key:[Infinity]};
  let firstIncome=null;r.steps.forEach((st,i)=>{const it=items.find(x=>x.id===order[i]);if(firstIncome===null&&it.boostHourly>0)firstIncome=st.timeHours;});
  const low=r.steps.reduce((m,st)=>Math.min(m,st.capital),s.goal.capital);
  const out={valid:true,result:r,firstIncome,low};out.key=orderKey(objective,out);return out;};
 const pack=(order,run)=>({order,run,result:run.valid?run.result:null,valid:run.valid,reason:run.valid?null:run.reason});
 const given=pack(keys,run(keys));
 /* v7.54 : les deux ordres « à la main » de la v7.47 (inverse, prix croissants) sont toujours calculés et montrés à côté de l’ordre proposé. */
 const manual=keys.length<2?[]:[{label:'Orden inverso',order:keys.slice().reverse()},{label:'Precio de menor a mayor',order:keys.slice().sort((a,b)=>((items.find(x=>x.id===a)||{}).price??1e12)-((items.find(x=>x.id===b)||{}).price??1e12))}].map(m=>({label:m.label,...pack(m.order,run(m.order))}));
 if(objective==='given'||keys.length<2)return {tool:'order',valid:given.valid,reason:given.reason,items,deps,objective,best:given,given,manual,search:{method:'given',explored:1,note:'Tu orden, tal cual.'},alternatives:[]};
 const search=M.sequences(items.map(x=>({id:x.id,before:x.before})),run);
 if(!search.best)return {tool:'order',valid:false,reason:(search.invalid[0]&&search.invalid[0].result.reason)||'Ningún orden posible con estas cifras.',items,deps,objective,given,manual,search:{method:search.method,explored:search.explored,note:search.note},alternatives:[]};
 const best=pack(search.best.order,search.best.result);
 // Une autre séquence utile : la meilleure pour un autre objectif, si elle diffère (pour montrer le compromis).
 const alternatives=[];
 for(const other of OBJECTIVES.filter(o=>o!=='given'&&o!==objective)){const alt=bestFor(other,items,run);if(alt&&alt.order.join()!==best.order.join()&&!alternatives.some(x=>x.order.join()===alt.order.join()))alternatives.push({objective:other,...pack(alt.order,alt.run)});}
 return {tool:'order',valid:true,items,deps,objective,best,given,manual,search:{method:search.method,explored:search.explored,note:search.note},alternatives};
}
function orderKey(objective,r){return objective==='income'?[r.firstIncome===null?Infinity:r.firstIncome,r.result.totalHours]:objective==='reserve'?[-r.low,r.result.totalHours]:[r.result.totalHours,-(r.result.finalHourly||0)];}
function bestFor(objective,items,runBase){const sr=M.sequences(items.map(x=>({id:x.id,before:x.before})),order=>{const r=runBase(order);return r.valid?{...r,key:orderKey(objective,r)}:r;});return sr.best?{order:sr.best.order,run:sr.best.result}:null;}
/* ----- Mon budget ----- */
function budgetAnalysis(s,source,ctx){
 const basket=s.budget.source==='basket';
 const rows=basket?s.order.keys.map(k=>{const a=asset(s,k);if(!a)return null;const item=itemOf(a,ctx),acq=totalAcq(a,item),use=usageOf(s,a,item);return {label:a.name,value:acq.complete?(a.owned?V.personal(0):V.personal(acq.value)):V.blank(),usage:use,owned:a.owned,field:null,item};}).filter(Boolean):s.budget.allocations.map((v,i)=>({label:['Vehículos','Inversiones','Equipo','Consumibles','Otras compras'][i],value:V.personal(v),usage:null}));
 rows.push({label:'Otros gastos previstos',value:V.personal(s.budget.extra||0),usage:null});
 const spend=M.total(rows.map(r=>({label:r.label,value:r.value})));
 /* v7.54 : un coût d’usage « non confirmé » (véhicule du site, rien d’écrit) n’est ni compté ni passé sous silence : le total par
    partie est incomplet et nomme l’achat, comme dans « Quel achat choisir ? » (revue v7.53, écart I4). */
 const usageRows=rows.filter(r=>r.usage&&!r.owned),unconfirmedUsage=usageRows.filter(r=>r.usage.perSession&&r.usage.perSession.s==='unconfirmed').map(r=>r.label);
 const perSession=M.total(usageRows.map(r=>({label:'Uso de '+r.label,value:r.usage.perSession})).filter(p=>p.value.s!=='unconfirmed'));
 if(unconfirmedUsage.length)perSession.complete=false;perSession.unconfirmed=unconfirmedUsage;
 const sessions=horizonSessions(s),d=sessionMinutesOf(s),earn=num(s.goal.hourly)&&d?s.goal.hourly*d/60:null;
 let flow=null;
 if(sessions!==null&&num(s.goal.capital)){const events=[{t:0,type:'spend',amount:spend.value,label:'Compras (subtotal conocido)'}];for(let i=1;i<=Math.min(sessions,400);i+=1){if(earn!==null)events.push({t:i,type:'receive',amount:earn,label:'Ganancia de la partida '+i});if(perSession.value>0)events.push({t:i,type:'spend',amount:perSession.value,label:'Uso (partida '+i+')'});}flow={sessions,earn,usage:perSession.value,usageComplete:perSession.complete,ledger:M.ledger(s.goal.capital,events,s.goal.reserve||0)};}
 return {tool:'budget',spend,perSession,flow,rows,sessions};
}
/* ----- Mon objectif ----- */
function goalTarget(s){const g=s.goal;if(g.target===null)return null;let t=g.target;const meaning=['held','available','cumulative'].includes(g.meaning)?g.meaning:'available';
 if(meaning==='held')t=Math.max(0,t-(g.reserve||0));else if(meaning==='cumulative')t=t+Math.max(0,(g.capital||0)-(g.reserve||0));
 if(num(g.plannedSpend)&&g.plannedSpend>0)t+=g.plannedSpend;return t;}
function goalAnalysis(s,source,ctx,r){
 const g=s.goal,meaning=['held','available','cumulative'].includes(g.meaning)?g.meaning:'available',d=sessionMinutesOf(s);
 let deadline=null;
 if(num(g.deadlineDays)&&g.deadlineDays>0&&r&&r.valid){const days=r.days;if(days===null||days===undefined){deadline={known:false,reason:'Escribe tu tiempo de juego por día para tener un plazo en días.'};}
  else if(days<=g.deadlineDays)deadline={known:true,feasible:true,days,spare:g.deadlineDays-days};
  else{let minutes=null;for(let m=Math.ceil((d||1)/15)*15+15;m<=1440;m+=15){const t=evaluate('goal',{...s,goal:{...s.goal,dailyMinutes:m,deadlineDays:null}},source);if(t.valid&&t.days<=g.deadlineDays){minutes=m;break;}}
   let hourly=null;if(s.model==='continuous'&&num(g.hourly)&&g.hourly>0){let lo=g.hourly,hi=g.hourly*64;const ok=evaluate('goal',{...s,goal:{...s.goal,hourly:hi,deadlineDays:null}},source);if(ok.valid&&ok.days<=g.deadlineDays){for(let i=0;i<40;i+=1){const mid=(lo+hi)/2,t=evaluate('goal',{...s,goal:{...s.goal,hourly:mid,deadlineDays:null}},source);if(t.valid&&t.days<=g.deadlineDays)hi=mid;else lo=mid;}hourly=Math.ceil(hi/100)*100;}}
   deadline={known:true,feasible:false,days,over:days-g.deadlineDays,requiredDailyMinutes:minutes,requiredHourly:hourly};}}
 return {tool:'goal',meaning,target:goalTarget(s),plannedSpend:num(g.plannedSpend)?g.plannedSpend:null,upkeep:num(g.upkeepPerSession)?g.upkeepPerSession:null,deadline};
}
/* ----- Mes activités ----- */
function failureShare(s){return s.analysis.simulations.echec&&num(s.analysis.sim.echec.tentativesRatees)?Math.min(10,Math.max(0,s.analysis.sim.echec.tentativesRatees))/10:null;}
function activitiesAnalysis(s,source,ctx){
 const minutes=s.inverse.minutes,rank=[];
 activities(s,source).forEach(a=>{const reasons=[];if(a.players>s.goal.players)reasons.push('es para '+a.players+' jugadores, sois '+s.goal.players);const miss=(a.requiresPurchaseIds||[]).filter(id=>!s.assets.some(x=>x.itemId===id&&x.owned));if(miss.length)reasons.push('primero necesitas '+miss.map(id=>(ctx&&ctx.catalogue&&ctx.catalogue.find(c=>c.id===id)?.name)||id).join(', '));
  const one=E.activity(a);if(!one.valid){rank.push({id:a.id,name:a.name,valid:false,reason:one.reason,excluded:reasons});return;}
  const r=num(minutes)?E.inverse({minutes,capital:s.goal.capital,reserve:s.goal.reserve,activity:a}):null;
  let fail=null;const k=failureShare(s);if(k!==null&&r&&r.valid&&r.runs){const reward=(a.reward||0)*(a.share??100)/100,cost=a.cost||0,okRuns=Math.round(r.runs*(1-k)),badRuns=r.runs-okRuns;fail={share:k,okRuns,badRuns,profit:okRuns*reward-r.runs*cost-(a.investment&&!a.owned?a.investment:0)};}
  rank.push({id:a.id,name:a.name,valid:true,hourly:one.hourly,net:one.net,cycle:one.cycleMinutes,profit:r&&r.valid?r.profit:null,runs:r&&r.valid?r.runs:null,reason:r&&!r.valid?r.reason:null,excluded:reasons,fail});});
 const ok=rank.filter(x=>x.valid&&!x.excluded.length&&x.profit!==null);ok.sort((x,y)=>y.profit-x.profit||y.hourly-x.hourly);
 return {tool:'activities',rank,accessible:ok,excludedList:rank.filter(x=>x.excluded.length),best:ok[0]||null,failureShare:failureShare(s)};
}
/* ----- Mon temps de jeu ----- */
function sessionAnalysis(s,source,ctx){
 const out=[];activities(s,source).forEach(a=>{const reasons=[];if(!s.session.enabled.includes(a.id))reasons.push('sin marcar');if(a.players>s.goal.players)reasons.push('es para '+a.players+' jugadores');const miss=(a.requiresPurchaseIds||[]).filter(id=>!s.assets.some(x=>x.itemId===id&&x.owned));if(miss.length)reasons.push('falta una compra');const one=E.activity(a);if(!one.valid)reasons.push('faltan cifras');else{if(num(s.session.minutes)&&one.activeMinutes>s.session.minutes)reasons.push('no cabe en '+s.session.minutes+' min');if(one.net<=0)reasons.push('no da más que sus gastos');}out.push({id:a.id,name:a.name,reasons});});
 return {tool:'session',activities:out,excluded:out.filter(x=>x.reasons.length),kept:out.filter(x=>!x.reasons.length)};
}
/* ----- Ça vaut le coup ? ----- */
function roiAnalysis(s,source,ctx){
 const a=asset(s,s.roi.key),item=itemOf(a,ctx),acq=totalAcq(a,item),cc=cashFor(s,acq,a),use=usageOf(s,a,item),d=sessionMinutesOf(s);
 const hoursH=num(s.roi.hours)?s.roi.hours:null,sessions=hoursH!==null&&d?Math.ceil(hoursH*60/d-1e-9):null;
 const cost=M.usageCost({initial:acq.complete?V.personal(acq.value):V.unknown(),perSession:use.perSession,resale:resaleOf(s,a)},{sessions});
 const usagePerHour=V.usable(use.perSession)&&d?use.perSession.v*60/d:null;
 const pc=purchasableCheck(item,a),conditions=[cashCond(cc,'Pagar ahora'),pc].filter(Boolean),adm=M.admission(conditions);
 return {tool:'roi',asset:a,item,acquisition:acq,cash:cc,usage:use,usagePerHour,cost,sessions,purchasable:pc,admission:adm,hours:hoursH};
}
/* ----- Business plan : chaîne des prérequis ----- */
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
/* ----- « Ce qui compte dans ce calcul » : explication fidèle, construite depuis les critères réellement actifs -----
   Chaque facteur de l’outil (outils/modele-donnees.json) est soit utilisé, soit écarté avec une raison dite simplement ;
   les tests vérifient qu’aucun ne reste « oublié ». */
const H=n=>{if(!num(n))return '?';const m=Math.ceil(n*60-1e-8);return m<60?m+' min':Math.floor(m/60)+' h'+(m%60?' '+String(m%60).padStart(2,'0')+(typeof document!=='undefined'&&/^de/.test(document.documentElement.lang||'')?' min':''):'');};
const MEANING={held:'el dinero que tendrás en total (incluido el dinero apartado)',available:'el dinero disponible además de lo que dejas apartado',cumulative:'el dinero ganado a partir de ahora, sin contar lo que ya tienes'};
function vPers(v){return v===null||v===undefined?V.blank():V.personal(v);}
/* v7.54 : le libellé de ce qui bloque dit de quoi il s’agit (plus de « Un chiffre » générique) : « Parcours à compléter », « Blocage », « À écrire » ou « À corriger ». */
function missingLabel(reason){const t=String(reason||'');if(/Parcours à compléter|Path to complete|Recorrido por completar|Percorso da completare|Weg vervollständigen/.test(t))return 'Recorrido por completar';if(/^(Écris|Dis|Choisis|Ajoute|Note|Enter|Write|Tell|Choose|Pick|Add|Escribe|Dime|Dinos|Elige|Añade|Anota|Indica|Scrivi|Dimmi|Dicci|Scegli|Aggiungi|Annota|Gib|Sag|Wähle|Füge|Notiere|Trag)/.test(t))return 'Por escribir';if(/demande|bloqu|impossible|Aucun plan|aucune mission|ne rapporte|requires|needs|block|no plan|no mission|earns nothing|pide|bloque|imposible|ning[úu]n plan|ninguna misi[óo]n|no rinde|no da dinero|no genera|requiere|necesita|richiede|blocc|impossibil|nessun piano|nessuna missione|non rende/i.test(t))return 'Bloqueo';return 'Por corregir';}
function explainGoal(s,source,r,x){
 const g=s.goal,cycles=s.model==='cycles',used=['argent-disponible','reserve','gain-net','avancement'],excluded={},values=[],drivers=[],missing=[],changes=[],conditions=[];
 values.push({label:'Ya tengo',value:vPers(g.capital),unit:'$',field:'f-goal-capital'},{label:'Quiero tener',value:vPers(g.target),unit:'$',field:'f-goal-target',text:'Es '+MEANING[x.meaning]+'.'},{label:'Apartado',value:vPers(g.reserve),unit:'$',field:'f-goal-reserve'});
 if(num(g.plannedSpend)&&g.plannedSpend>0)values.push({label:'Gastos previstos antes de la meta',value:V.personal(g.plannedSpend),unit:'$',field:'f-goal-plannedSpend'});
 if(!cycles){values.push({label:'Gano por hora',value:vPers(g.hourly),unit:'$/h',field:'f-goal-hourly'});excluded.joueurs='En el modo “poco a poco” no hay misiones en grupo.';excluded['temps-actif']='No hay misiones en el modo “poco a poco”: tu ganancia por hora ya lo cuenta todo.';excluded.attente='No hay espera entre misiones en el modo “poco a poco”.';excluded.versement='En el modo “poco a poco”, el dinero llega mientras juegas; cambia a “al final de cada misión” para contar las recompensas enteras.';}
 else{used.push('joueurs','temps-actif','attente','versement');conditions.push({id:'joueurs',label:'Jugadores: '+g.players,state:r.valid||!/joueurs|players|jugadores|giocatori/.test(r.reason||'')?'ok':'ko',detail:r.valid?'La actividad encaja con tu número de jugadores.':r.reason});}
 if(num(g.dailyMinutes)){used.push('temps-partie','horizon');values.push({label:'Juego cada día',value:V.personal(g.dailyMinutes),unit:'min',field:'f-goal-dailyMinutes'});if(cycles)conditions.push({id:'temps-partie',label:'Una misión cabe en tu partida',state:r.valid||!/temps de jeu par jour|play time per day|tiempo de juego por d[íi]a|tempo di gioco al giorno/.test(r.reason||'')?'ok':'ko',detail:r.valid?'Cada misión, preparación incluida, cabe en '+g.dailyMinutes+' min.':r.reason,fix:{text:'Juega más tiempo cada día o elige una misión más corta.'}});}
 else{excluded['temps-partie']='Tiempo de juego por día sin escribir: te damos el tiempo de juego, no el número de días.';excluded.horizon='Sin tiempo por día, no hay calendario.';}
 if(num(g.upkeepPerSession)&&g.upkeepPerSession>0){used.push('cout-usage');values.push({label:'Gastos por partida',value:V.personal(g.upkeepPerSession),unit:'$/partie',field:'f-goal-upkeepPerSession'});drivers.push({label:'Gastos por partida',text:cycles?'Suman '+E.dollars(fmt(r.upkeepTotal),' ')+' que tienes que ganar a lo largo del recorrido.':'Bajan tu ganancia a '+E.dollars(fmt(r.hourly),' ')+' por hora.',factor:'cout-usage'});}
 else excluded['cout-usage']=cycles?'Los gastos de cada misión ya están en su ganancia neta; no has escrito ningún otro gasto por partida.':'No has escrito ningún gasto por partida (consumibles, munición…).';
 if(r.valid){drivers.unshift({label:'Lo que falta',text:E.dollars(fmt(r.missing),' ')+' por ganar'+(cycles?' con misiones enteras, gastos pagados antes y recompensa al final':' al ritmo de '+E.dollars(fmt(r.hourly),' ')+' por hora')+'.',factor:'gain-net'});
  /* v7.54 : « tentatives ratées » (mode Expert) chiffré aussi pour l’objectif par missions : la part ratée paie ses frais sans récompense, donc plus de missions (revue v7.53, écart I6). */
  {const k=failureShare(s);if(k!==null&&cycles){used.push('scenario-echec');const a=activities(s,source).find(z=>z.id===g.selected);if(a&&r.runs&&(a.reward||0)>0){const reward=(a.reward||0)*(a.share??100)/100,cost=a.cost||0,netOk=reward-cost,perAttempt=(1-k)*reward-cost;drivers.push({label:'Si fallan intentos',text:perAttempt>0?'Con '+Math.round(k*10)+' intentos fallidos de cada 10, harían falta unos '+Math.ceil(r.runs*netOk/perAttempt)+' intentos en vez de '+r.runs+' (gastos pagados cada vez, recompensa solo cuando sale bien).':'Con '+Math.round(k*10)+' intentos fallidos de cada 10, esta misión ya no da nada: el objetivo no se puede alcanzar así.',factor:'scenario-echec'});}}
   else if(k!==null)excluded['scenario-echec']='En el modo “poco a poco” no hay intentos que fallar: baja tu ganancia por hora si quieres ir con cuidado.';
   else excluded['scenario-echec']='El cálculo supone que cada intento sale bien; añade un escenario de intentos fallidos en el modo Experto si quieres ir con cuidado.';}
  if(x.deadline&&x.deadline.known){if(x.deadline.feasible)drivers.push({label:'Plazo',text:'Factible: '+x.deadline.days+' días de '+g.deadlineDays+'.'});else{drivers.push({label:'Plazo',text:'No es factible a este ritmo: '+x.deadline.days+' días en vez de '+g.deadlineDays+'.'});if(x.deadline.requiredDailyMinutes)changes.push('Jugar '+x.deadline.requiredDailyMinutes+' min por día cumpliría el plazo.');if(x.deadline.requiredHourly)changes.push('Ganar '+E.dollars(fmt(x.deadline.requiredHourly),' ')+' por hora cumpliría el plazo.');}}}
 else missing.push({label:missingLabel(r.reason),text:r.reason,decisive:true});
 if(!cycles&&num(g.hourly))changes.push('El tiempo cambia en proporción a tu ganancia por hora: un 20 % más, un 17 % menos de tiempo.');
 return M.explain({tool:'goal',aim:'El tiempo de juego para tener '+MEANING[x.meaning]+'.',horizon:num(g.dailyMinutes)?'Hasta la meta, en partidas de '+g.dailyMinutes+' min por día':'Hasta la meta (sin calendario)',conditions,used,excluded,values,drivers,missing,changes});
}
function explainSession(s,source,r,x){
 const used=['argent-disponible','reserve','possession-requise','joueurs','temps-partie','ressource-exclusive','gain-net','temps-actif','attente','versement','variete'],excluded={'cout-usage':'Los gastos de cada misión se pagan antes de ella; ningún otro gasto por partida en este cálculo.'};
 const conditions=x.activities.map(a=>({id:'possession-requise',label:a.name,state:a.reasons.length?'ko':'ok',detail:a.reasons.length?'Descartada: '+a.reasons.join(', ')+'.':'Posible en tu partida.'}));
 const drivers=[];if(r.valid){drivers.push({label:'Programa',text:r.runs+(E.plural(r.runs)?' misiones':' misión')+', '+E.dollars(fmt(r.profit),' ')+' ganados en '+r.totalMinutes+' min; cada recompensa llega al final de su misión.'});if(r.limited)drivers.push({label:'Búsqueda limitada',text:'Mejor programa encontrado entre los probados: puede que exista uno mejor.'});}
 /* v7.54 : le scénario « tentatives ratées » (mode Expert) est chiffré ici aussi, comme dans Mes activités : frais payés, récompense perdue sur la part ratée (revue v7.53, écart I6). */
 const k=failureShare(s);if(k!==null){used.push('scenario-echec');if(r.valid&&r.runs){const acts=activities(s,source),gross=(r.timeline||[]).reduce((sum,st)=>{const a=acts.find(z=>z.id===st.id);return sum+(a?(a.reward||0)*(a.share??100)/100:0);},0);drivers.push({label:'Si fallan intentos',text:'Con '+Math.round(k*10)+' intentos fallidos de cada 10: unos '+E.dollars(fmt(Math.round(r.profit-k*gross)),' ')+' en lugar de '+E.dollars(fmt(r.profit),' ')+' (gastos pagados, sin recompensa).',factor:'scenario-echec'});}}
 else excluded['scenario-echec']='El cálculo supone que cada misión sale bien; añade un escenario de intentos fallidos en el modo Experto si quieres ir con cuidado.';
 return M.explain({tool:'session',aim:'Ganar el máximo dinero durante tu partida.',horizon:'Una partida de '+(s.session.minutes??'?')+' min',conditions,used,excluded,values:[{label:'Tiempo de la partida',value:vPers(s.session.minutes),unit:'min',field:'f-session-minutes'},{label:'Jugadores',value:vPers(s.goal.players),unit:'jugadores',field:'session-players'},{label:'Ya tengo',value:vPers(s.goal.capital),unit:'$',field:'session-capital'},{label:'Apartado',value:vPers(s.goal.reserve),unit:'$',field:'session-reserve'}],drivers,missing:r.valid?[]:[{label:'Una cifra',text:r.reason,decisive:true}],changes:x.excluded.filter(a=>a.reasons.includes('sin marcar')).length?['Marcar otras actividades puede cambiar el programa.']:[]});
}
function explainActivities(s,source,r,x){
 const sel=x.rank.find(a=>a.id===s.inverse.selected),used=['argent-disponible','reserve','possession-requise','joueurs','temps-partie','gain-net','temps-actif','attente','versement'],excluded={'cout-usage':'Los gastos de cada misión ya están en su ganancia neta.'};
 if(ammoPerAttempt(s))used.push('mecanique-simulee');else excluded['mecanique-simulee']='Ninguna munición simulada: solo cuentan los gastos que has escrito.';
 if(x.failureShare!==null)used.push('scenario-echec');else excluded['scenario-echec']='El cálculo supone que cada intento sale bien; añade un escenario de intentos fallidos en el modo Experto si quieres ir con cuidado.';
 const drivers=[];if(x.best)drivers.push({label:'Clasificación',text:(x.best.id===s.inverse.selected?'Es la actividad que más da en {m} min: {g}.':'“{nom}” da más en {m} min: {g}.').replace('{nom}',x.best.name).replace('{m}',s.inverse.minutes??'?').replace('{g}',E.dollars(fmt(x.best.profit),' '))});
 if(sel&&sel.fail)drivers.push({label:'Si fallan intentos',text:'Con '+Math.round(sel.fail.share*10)+' intentos fallidos de cada 10: '+E.dollars(fmt(sel.fail.profit),' ')+' en lugar de '+E.dollars(fmt(sel.profit),' ')+' (gastos pagados, sin recompensa).',factor:'scenario-echec'});
 return M.explain({tool:'activities',aim:'Lo que da tu tiempo con una actividad, comparado con las demás actividades posibles.',horizon:(s.inverse.minutes??'?')+' min de juego',conditions:x.rank.map(a=>({id:'possession-requise',label:a.name,state:!a.valid?'unknown':a.excluded.length?'ko':'ok',detail:!a.valid?a.reason:a.excluded.length?a.excluded.join(', '):'Posible.'})),used,excluded,values:[{label:'Tiempo',value:vPers(s.inverse.minutes),unit:'min',field:'f-inverse-minutes'},{label:'Jugadores',value:vPers(s.goal.players),unit:'jugadores',field:'activity-players'}],drivers,missing:r.valid?[]:[{label:'Una cifra',text:r.reason,decisive:true}]});
}
function explainBudget(s,source,r,x){
 const used=['argent-disponible','reserve','cout-acquisition','argent-restant'],excluded={'effet-soin':x.rows.some(row=>row.item&&row.item.type==='consumable')?'El presupuesto cuenta el dinero; el efecto de los consumibles no tiene cifras en GTA VI.':'No aplica: ningún consumible en estos gastos.'},drivers=[],missing=[];
 if(x.flow){used.push('cout-usage','cout-complet','frequence','horizon');drivers.push({label:'A la larga',text:x.flow.ledger.reserveBreach?'Bajarías por debajo del dinero apartado en la partida '+x.flow.ledger.reserveBreach.at+'.':'Durante '+x.flow.sessions+' partidas, tu dinero se mantiene por encima de lo que dejas apartado (en el punto más bajo: '+E.dollars(fmt(x.flow.ledger.low.value),' ')+').'});}
 else{excluded['cout-usage']='Escribe cuántas partidas quieres contar (modo Experto) para ver los gastos a la larga.';excluded['cout-complet']='No has escrito ningún periodo.';excluded.frequence='No has escrito ningún número de partidas.';excluded.horizon='No has escrito ningún periodo: solo se calcula “ahora”.';}
 if(x.rows.some(row=>row.usage&&row.usage.source==='simulated'))used.push('mecanique-simulee');else excluded['mecanique-simulee']='Ninguna mecánica simulada en tus compras.';
 if(!x.spend.complete)missing.push({label:x.spend.missing.map(m=>m.label).join(', '),text:'Precio aún sin escribir: el dinero restante mostrado es un máximo.',decisive:true});
 if(x.perSession&&x.perSession.unconfirmed&&x.perSession.unconfirmed.length)missing.push({label:'Coste de uso de '+x.perSession.unconfirmed.map(n=>'“'+n+'”').join(', '),text:'No confirmado en GTA VI, no se cuenta: escribe el tuyo si lo hay.',decisive:!!x.flow});
 return M.explain({tool:'budget',aim:'Saber lo que te queda después de tus gastos, sin tocar el dinero apartado.',horizon:x.flow?'Ahora, y luego '+x.flow.sessions+' partidas':'Ahora',conditions:[{id:'argent-disponible',label:'Gastos posibles ahora',state:!r.valid?'unknown':r.overBudget?'ko':x.spend.complete?'ok':'unknown',detail:r.valid?(r.overBudget?'Tus gastos y el dinero apartado superan lo que tienes.':'Todo cabe.'):r.reason}],used,excluded,values:x.rows.map(row=>({label:row.label,value:row.value,unit:'$'})).concat([{label:'Ya tengo',value:vPers(s.goal.capital),unit:'$',field:'budget-capital'},{label:'Apartado',value:vPers(s.goal.reserve),unit:'$',field:'budget-reserve'}]),drivers,missing});
}
function explainOrder(s,source,r,x){
 const used=['argent-disponible','reserve','cout-acquisition','gain-en-plus','delai-recuperation','argent-restant','priorite'],excluded={'usage-compatible':'El orden no comprueba ninguna necesidad de uso: compara las opciones en “¿Qué compra elijo?”.',envie:'El orden se decide por el tiempo y el dinero; tus ganas cuentan en “¿Qué compra elijo?”.'};
 if(x.items.some(i=>i.before.length))used.push('possession-requise');else excluded['possession-requise']='Ninguna de tus compras necesita otra antes.';
 const conds=[];x.items.forEach(i=>{const a=asset(s,i.id);if(a&&a.itemId)conds.push({id:'achetable',label:i.name,state:'assumed',detail:'Compra por confirmar en GTA VI.'});});
 if(conds.length)used.push('achetable');else excluded.achetable='Compras libres: eres tú quien dice que se pueden comprar.';
 const OBJ={all:'tenerlo todo lo antes posible',income:'tener cuanto antes una compra que dé dinero',reserve:'conservar el máximo dinero en cada paso',given:'mantener tu orden'};
 const drivers=[],missing=[];
 if(x.valid&&x.best&&!x.best.order.length)drivers.push({label:'Orden propuesto',text:'No hay compras que ordenar: añade al menos dos compras a tu carrito.'});
 else if(x.valid&&x.best){drivers.push({label:'Orden propuesto',text:x.best.order.map(id=>'“'+(x.items.find(i=>i.id===id)||{}).name+'”').join(' → ')+': '+H(x.best.result.totalHours)+' de juego en total.'});if(x.given&&x.given.valid&&x.given.order.join()!==x.best.order.join())drivers.push({label:'Tu orden',text:H(x.given.result.totalHours)+' de juego en total con tu orden.'});if(x.search)drivers.push({label:'Búsqueda',text:x.search.note});}
 else missing.push({label:x.incomplete?'Precio':'Bloqueo',text:x.reason,decisive:true});
 return M.explain({tool:'order',aim:'Encontrar el orden de compra que permite '+OBJ[x.objective]+'.',horizon:'Hasta la última compra',conditions:conds,used,excluded,values:[{label:'Ya tengo',value:vPers(s.goal.capital),unit:'$',field:'order-capital'},{label:'Apartado',value:vPers(s.goal.reserve),unit:'$',field:'order-reserve'},{label:'Gano por hora',value:vPers(s.goal.hourly),unit:'$/h',field:'order-hourly'}].concat(x.items.map(i=>({label:i.name,value:i.price===null?V.blank():V.personal(i.price),unit:'$'}))),drivers,missing,changes:(x.alternatives||[]).map(a=>'Para '+OBJ[a.objective]+': '+a.order.map(id=>'“'+(x.items.find(i=>i.id===id)||{}).name+'”').join(' → ')+(a.valid?' ('+H(a.result.totalHours)+')':''))});
}
function explainRoi(s,source,r,x){
 const mode=s.roi.mode,used=['argent-disponible','reserve','cout-acquisition','argent-restant'],excluded={},drivers=[],missing=[];
 if(['new','improve'].includes(mode))used.push('joueurs','gain-net');else{excluded.joueurs='No hay actividades en grupo en este modo.';excluded['gain-net']=mode==='estimate'?'Compra por gusto: no se calcula ninguna ganancia.':'Has escrito directamente la ganancia extra por hora.';}
 if(mode==='estimate'){excluded['gain-en-plus']='Compra por gusto o ganancia desconocida: no se inventa ninguna rentabilidad.';if(num(s.goal.hourly)||s.roi.recoveryActivity)used.push('delai-recuperation');else excluded['delai-recuperation']='Escribe lo que ganas por hora para saber en cuánto tiempo recuperas tu dinero.';}
 else used.push('gain-en-plus','delai-recuperation');
 if(x.purchasable.state==='na')excluded.achetable='Compra libre: la describes tú.';else used.push('achetable');
 if(V.usable(x.usage.perSession)){used.push('cout-usage');if(x.sessions!==null)used.push('cout-complet','frequence','horizon');else{excluded['cout-complet']='Escribe tu tiempo de juego por día para convertir las horas en partidas.';excluded.frequence='No se puede calcular el número de partidas.';excluded.horizon='Horas de uso sin tiempo por día.';}}
 else{excluded['cout-usage']=x.usage.note||'No has escrito ningún coste de uso.';excluded['cout-complet']='Sin coste de uso, el coste completo es el precio.';if(num(s.roi.hours)){used.push('horizon','frequence');}else{excluded.horizon='Escribe cuántas horas lo usas.';excluded.frequence='No has escrito horas de uso.';}}
 if(V.usable(x.cost.resale))used.push('revente-prevue');else excluded['revente-prevue']='Reventa no confirmada en GTA VI: solo se cuenta si escribes un precio de reventa.';
 if(x.usage.source==='simulated')used.push('mecanique-simulee');else excluded['mecanique-simulee']='Ninguna mecánica simulada para esta compra.';
 excluded.priorite='La respuesta compara “con” y “sin” la compra en el mismo tiempo de juego; no hay prioridad que elegir.';
 if(x.cash.state==='short')drivers.push({label:'Dinero disponible',text:'Te faltan '+E.dollars(fmt(x.cash.shortfall),' ')+' para pagar ahora.'});
 if(mode==='estimate'&&!num(s.goal.hourly)&&!s.roi.recoveryActivity)missing.push({label:'Lo que ganas por hora',text:'para saber en cuánto tiempo recuperas tu dinero',field:'roi-recovery-hourly',decisive:false});
 if(mode==='continuous'&&!num(s.goal.hourly))missing.push({label:'Lo que ya ganas por hora',text:'para comparar las dos situaciones, con y sin la compra, con el mismo dinero',field:'f-goal-hourly',decisive:false});
 if(mode!=='estimate'&&!num(s.roi.revenueHourly)&&mode==='continuous')missing.push({label:'Ganancia extra por hora',text:'Es el dato que decide: sin él, no se calcula cuándo lo recuperas.',field:'f-roi-revenueHourly',decisive:true});
 if(!r.valid)missing.push({label:missingLabel(r.reason),text:r.reason,decisive:true});
 return M.explain({tool:'roi',aim:mode==='estimate'?'Saber si te lo puedes permitir y lo que te deja.':'Saber si la compra te hace ganar más de lo que cuesta, comparado con no comprarla.',horizon:num(s.roi.hours)?s.roi.hours+' h de juego':'Ahora',conditions:x.admission.ok.concat(x.admission.failed,x.admission.unknown,x.admission.assumed),used,excluded,values:[{label:'Precio total',value:x.acquisition.complete?V.personal(x.acquisition.value):V.blank(),unit:'$',field:'f-roi-purchase'},{label:'Ya tengo',value:vPers(s.goal.capital),unit:'$',field:'roi-capital'},{label:'Apartado',value:vPers(s.goal.reserve),unit:'$',field:'roi-reserve'},{label:'Coste por partida',value:x.usage.perSession,unit:'$/partie'},{label:'Horas de uso',value:vPers(s.roi.hours),unit:'h',field:'f-roi-hours'}],drivers,missing});
}
function explainCompare(s,source,r,x){
 const used=['argent-disponible','reserve','cout-acquisition','priorite'],excluded={},drivers=[],missing=[],need=s.analysis.need;
 const hasNeed=!!(need.terrain||num(need.passengers)||need.cargo);
 if(hasNeed){used.push('usage-compatible');if(num(need.passengers)||need.cargo)used.push('capacite');else excluded.capacite='No se piden plazas ni carga.';}else{excluded['usage-compatible']='No has escrito ninguna necesidad de uso (terreno, plazas, carga): no se descarta ninguna opción por eso.';excluded.capacite='No se pide ninguna capacidad.';}
 if(x.rows.some(row=>row.item))used.push('achetable');else excluded.achetable='Compras libres: las describes tú.';
 if(x.rows.some(row=>row.asset.owned))used.push('possession-requise');else excluded['possession-requise']='Ninguna de estas compras es ya tuya: cada una se cuenta a su precio.';
 if(x.rows.some(row=>V.usable(row.usage.perSession))){used.push('cout-usage');if(x.sessions!==null)used.push('cout-complet','frequence','horizon');else{excluded['cout-complet']='Escribe en cuántas partidas los usas para comparar el coste completo.';excluded.frequence='Sin número de partidas.';excluded.horizon='No has escrito ningún periodo.';}}
 else{excluded['cout-usage']='Ningún coste de uso conocido para estas compras (combustible, mantenimiento: no confirmados).';excluded['cout-complet']='Sin coste de uso, se compara el precio.';excluded.frequence='Sirve con un coste de uso.';excluded.horizon='Sirve con un coste de uso.';}
 if(x.rows.some(row=>row.income!==null)){used.push('gain-en-plus','delai-recuperation');}else{excluded['gain-en-plus']='Ninguna compra tiene ganancia extra escrita: no se compara cuándo se recupera el dinero.';if(num(s.goal.hourly))used.push('delai-recuperation');else excluded['delai-recuperation']='Escribe lo que ganas por hora para saber cuándo podrás pagar.';}
 excluded['revente-prevue']='Reventa no confirmada en GTA VI: no se cuenta en la comparación.';
 excluded['performance-usage']='No se ha publicado ningún rendimiento (velocidad, aceleración…) para GTA VI: no se compara nada en eso.';
 /* v7.54 : « Effet sur la vie » ne concerne que les consommables : pour d’autres achats, il est écarté comme « sans objet », pas comme « pas chiffré ». */
 excluded['effet-soin']=x.rows.some(row=>row.item&&row.item.type==='consumable')?'El efecto de los consumibles no tiene cifras en GTA VI.':'No aplica: no hay consumibles entre estas compras.';
 excluded.esthetique='El sitio no puntúa tu gusto: dilo con tu nota de ganas.';
 used.push('deseo');
 if(x.rows.some(row=>row.usage.source==='simulated'))used.push('mecanique-simulee');else excluded['mecanique-simulee']='Ninguna mecánica simulada.';
 if(x.excluded.length)drivers.push({label:'Descartadas',text:x.excluded.map(row=>'“'+row.name+'” ('+row.admission.failed.map(c=>c.detail||c.label).join(', ')+')').join('; ')+'.'});
 if(x.crossover)drivers.push({label:'Coste a largo plazo',text:'“'+x.crossover.before+'” cuesta menos antes de '+Math.ceil(x.crossover.n-1e-9)+' partidas; a partir de ahí, “'+x.crossover.after+'” pasa a costar menos.'});
 x.partial.forEach(row=>missing.push({label:'“'+row.name+'”',text:'Coste incompleto: comparación parcial.',decisive:true}));
 if(!r.valid)missing.push({label:missingLabel(r.reason),text:r.reason,decisive:true});
 const conditions=[];x.rows.forEach(row=>row.conditions.forEach(c=>conditions.push({...c,label:row.name+' · '+c.label})));
 return M.explain({tool:'compare',aim:'Elegir la compra que cubre lo que necesitas, primero entre las que encajan y luego según lo que te importa.',horizon:x.sessions!==null?'Compra, luego '+x.sessions+' partidas':'En el momento de la compra',conditions,used,excluded,values:x.rows.map(row=>({label:row.name,value:row.acquisition.complete?V.personal(row.acquisition.value):V.blank(),unit:'$'})).concat([{label:'Ya tengo',value:vPers(s.goal.capital),unit:'$',field:'compare-capital'},{label:'Apartado',value:vPers(s.goal.reserve),unit:'$',field:'compare-reserve'}]),drivers,missing});
}
function explainPlan(s,source,r,x){
 const p=s.plan,g=p.goal,missions=p.source==='missions',used=['argent-disponible','reserve','argent-restant','avancement','priorite'],excluded={},drivers=[],missing=[],changes=[];
 const any=(k)=>p.missions.some(k),anyP=(k)=>p.prerequisites.some(k);
 if(p.prerequisites.length){used.push('cout-acquisition','achetable');}else{excluded['cout-acquisition']='Ninguna compra antes de tu objetivo.';excluded.achetable='Ninguna compra antes de tu objetivo.';}
 if(anyP(a=>a.boostHourly>0)||g.boostHourly>0)used.push('gain-en-plus');else excluded['gain-en-plus']='Ninguna compra te hace ganar más (o no lo has escrito).';
 const input=r&&r.input||planInput(s),ex=(input.excludedMissions||[]);
 if(missions){used.push('gain-net','temps-actif','attente','versement','ressource-exclusive','variete','joueurs');if(ex.length)changes.push((lkPluriel(ex.length)?'Descartadas':'Descartada')+' del plan: '+ex.map(m=>'“'+m.name+'” (se juega con '+m.players+', sois '+(input.players||1)+')').join(', ')+'. Cambia “Jugamos con” para contarlas.');}
 else{excluded['gain-net']='Ganas “poco a poco”: tu ganancia por hora ya incluye los gastos.';excluded['temps-actif']='Sin misiones: no hay tiempo de misión aparte.';excluded.attente='Sin misiones: no hay espera.';excluded.versement='Ganancia continua: no hay recompensa al final de la misión.';excluded['ressource-exclusive']='No hay misiones que encadenar.';excluded.variete='No hay misiones que variar.';excluded.joueurs='No hay misiones en grupo.';}
 if(missions&&any(m=>(m.requires||[]).length)||anyP(a=>(a.requires||[]).length))used.push('possession-requise');else excluded['possession-requise']='Ninguna misión ni compra requiere otra.';
 if(any(m=>m.once))used.push('deblocage');else excluded.deblocage='Ninguna misión de desbloqueo (se hace una sola vez).';
 if(p.situation.dailyMinutes){used.push('temps-partie','horizon');}else{excluded['temps-partie']='Sin duración de partida: recorrido continuo, sin calendario.';excluded.horizon='Sin partidas no hay fechas: solo el tiempo de juego.';}
 if((p.situation.upkeepPerSession||0)>0||anyP(a=>(a.usagePerSession||0)>0))used.push('cout-usage');else excluded['cout-usage']='No has anotado ningún gasto por partida.';
 if(ammoPerAttempt(s)){used.push('mecanique-simulee');changes.push('Munición simulada: '+E.dollars(fmt(ammoPerAttempt(s)),' ')+' añadidos a los gastos de cada intento de misión, como en Mis actividades. Desmarca la simulación para quitarlos.');}else excluded['mecanique-simulee']='Ninguna mecánica simulada en el plan.';
 excluded['scenario-echec']='El plan supone que cada misión sale bien; si una partida va peor, escribe lo que has ganado de verdad: el plan se rehace.';
 if(r.valid){drivers.push({label:'Recorrido',text:(r.continuous?H(r.totalMinutes/60)+' de juego en total':r.totalSessions+(E.plural(r.totalSessions)?' partidas':' partida')+(r.days?' ('+r.days+' días)':''))+', '+E.dollars(fmt(r.finalCash),' ')+' al final.'});
  if(r.lowPoint)drivers.push({label:'Punto más bajo',text:E.dollars(fmt(r.lowPoint.cash),' ')+' ('+(r.lowPoint.at||'inicio')+'), '+((r.input&&r.input.reserve||0)>0?'nunca por debajo de los '+E.dollars(fmt(r.input.reserve),' ')+' apartados.':(r.keptReserve||0)>0?'tirando de tus '+E.dollars(fmt(r.keptReserve),' ')+' apartados (has elegido ir lo más rápido posible).':'sin dinero apartado.')});
  if(x.chain&&x.chain.steps.length)drivers.push({label:'Preparación',text:x.chain.steps.filter(st=>st.kind!=='activity').map(st=>st.name).join(' → ')||'Nada que preparar.'});}
 else missing.push({label:missingLabel(r.reason),text:r.reason,decisive:true});
 if(x.chain&&!x.chain.ok&&x.chain.reason)missing.push({label:'Requisitos',text:x.chain.reason,decisive:true});
 return M.explain({tool:'plan',aim:g.kind==='amount'?'Tener '+E.dollars(fmt(g.target),' ')+': '+MEANING[g.meaning]+'.':g.kind==='unlock'?'Desbloquear '+(g.name||'tu objetivo')+'.':'Comprar '+(g.name||'tu objetivo')+'.',horizon:p.situation.dailyMinutes?'Partida tras partida ('+p.situation.dailyMinutes+' min, '+(p.situation.daysPerWeek||7)+' días por semana)':'Una etapa tras otra, sin calendario',conditions:[],used,excluded,values:[{label:'Ya tengo',value:vPers(p.situation.capital),unit:'$',field:'plan-capital'},{label:'Apartado',value:vPers(p.situation.reserve),unit:'$',field:'plan-reserve'},...(missions?[{label:'Somos',value:vPers(p.situation.players??1),unit:lkPluriel((p.situation.players??1))?'jugadores':'jugador',field:'plan-players'}]:[]),...(ammoPerAttempt(s)?[{label:'Munición simulada, por intento',value:V.simulated(ammoPerAttempt(s)),unit:'$',field:null,origin:'simulation'}]:[])],drivers,missing,changes});
}
function explainTool(tool,s,source,ctx,r,x){
 if(tool==='goal')return explainGoal(s,source,r,x);if(tool==='session')return explainSession(s,source,r,x);if(tool==='activities')return explainActivities(s,source,r,x);
 if(tool==='budget')return explainBudget(s,source,r,x);if(tool==='order')return explainOrder(s,source,r,x);if(tool==='roi')return explainRoi(s,source,r,x);
 if(tool==='compare')return explainCompare(s,source,r,x);if(tool==='plan')return explainPlan(s,source,r,x);return x.explain||null;
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
  // v7.49 : une option incompatible avec ton besoin (terrain, places, chargement) ou qui ne s’achète pas est écartée avant de choisir.
  const x=M?compareAnalysis(s,source,ctx):null,bad=new Set(x?x.excluded.map(row=>row.name):[]);
  if(bad.size){const kept=input.items.filter(it=>!bad.has(it.name));if(kept.length<2)return {valid:false,reason:kept.length?'Solo una opción encaja con lo que necesitas: “'+kept[0].name+'”. Las demás quedan descartadas: '+[...bad].join(', ')+'.':'Ninguna opción encaja con lo que necesitas: '+[...bad].join(', ')+'.',excludedByNeed:[...bad],items:[],best:null,bestByCriterion:{}};r={...E.choose({...input,items:kept}),excludedByNeed:[...bad]};}
  else r=E.choose(input);
  /* v7.54 : sans note d’envie sur un achat, « rapport envie / prix » ne peut pas trancher ; on répond « le moins cher à l’achat » en le disant, jusqu’à ce que l’envie soit notée. */
  if(r.valid&&!total&&r.criterion==='value'&&r.best===null&&r.unrated&&r.unrated.length)r={...r,criterion:'cheapest',best:r.bestByCriterion.cheapest,fallback:{from:'value',unrated:r.unrated}};
  if(!total||!r.valid||!x)return r;
  // « Le moins cher sur la durée » : prix + coût d’usage sur le nombre de parties écrit ; un coût incomplet n’est jamais un avantage.
  if(x.sessions===null)return {...r,criterion:'cheapestTotal',best:null,undecided:true,undecidedReason:'Escribe en cuántas partidas lo vas a usar: sin eso, no hay coste a largo plazo.'};
  /* v7.54 : à égalité de coût sur la durée, le gagnant ne dépend plus de l’ordre de la liste : départage par le nom (le résultat dit « à égalité »). */
  const rows=x.admissible,complete=rows.filter(row=>row.cost.total.complete).sort((a,b)=>(a.cost.total.value-b.cost.total.value)||String(a.name).localeCompare(String(b.name),'fr'));
  if(!complete.length)return {...r,criterion:'cheapestTotal',best:null,undecided:true,undecidedReason:'Ninguna opción tiene un coste completo: escribe los costes de uso o los precios que faltan.'};
  const lead=complete[0],doubt=rows.filter(row=>!row.cost.total.complete&&!M.compareCosts(lead.cost.total,row.cost.total).decided);
  const bestTotals=Object.fromEntries(rows.map(row=>[row.name,row.cost.total.complete?row.cost.total.value:null]));
  if(doubt.length)return {...r,criterion:'cheapestTotal',best:null,undecided:true,undecidedReason:'“'+lead.name+'” cuesta menos entre las opciones con coste completo, pero '+doubt.map(row=>'“'+row.name+'”').join(', ')+' tiene un coste incompleto que podría ser más bajo.',totals:bestTotals};
  const chosen=r.items.find(it=>it.name===lead.name),second=complete[1],tie=second&&Math.abs(second.cost.total.value-lead.cost.total.value)<=1e-6*Math.max(1,lead.cost.total.value),near=second&&!tie&&M.close(lead.cost.total.value,second.cost.total.value,0.02);
  return {...r,criterion:'cheapestTotal',tie:!!tie,near:!!near,closeWith:tie||near?second.name:null,best:lead.name,bestWaitHours:chosen?chosen.waitHours:null,bestTotal:lead.cost.total.value,totals:bestTotals,bestByCriterion:{...r.bestByCriterion,cheapestTotal:lead.name}};}
 if(tool==='plan'){const missing=planMissing(s);if(missing)return{valid:false,reason:missing};
  const st=s.plan.strategy==='auto'?planStrategies(s):null,strategy=st&&st.recommended?st.recommended:(s.plan.strategy==='auto'?'asIs':s.plan.strategy),input=planInput(s,strategy);
  if(st&&st.blocked)return Object.assign({valid:false,reason:st.blockedReason,blockedByReserve:true},{strategy:'asIs',strategies:st,variant:'auto',input});
  let r=E.missionPlan(input),variant='auto';
  // Plan de secours choisi (« Suivre ce plan ») : même situation, missions ou achats d'avant réduits.
  if(s.plan.variant!=='auto'){const alt=E.missionAlternatives(input);const v=alt.valid?alt.results[s.plan.variant]:null;if(v&&v.valid&&v.reached){r=v;variant=s.plan.variant;}}
  return Object.assign(r,{strategy,strategies:st,variant,input,keptReserve:s.plan.situation.reserve??0});}
 if(tool==='goal')return goal(s,source);if(tool==='session')return session(s,source);if(tool==='roi')return roi(s,source,ctx);if(tool==='order'){if(!M)return E.order(orderInput(s,source));const x=orderAnalysis(s,source,ctx);if(x.best&&x.best.valid)return {...x.best.result,order:x.best.order,objective:x.objective,method:x.search&&x.search.method};return {valid:false,reason:x.reason,incomplete:!!x.incomplete,steps:[],totalHours:null,finalCapital:null,finalHourly:null};}
 if(tool==='budget'){const input=budgetInput(s),unknown=input.allocations.filter(v=>v===null).length;if(!unknown)return E.budget(input);
  // v7.49 : un prix inconnu ne vaut pas 0 : le calcul se fait sur le sous-total connu et le dit (« au plus »).
  const r=E.budget({...input,allocations:input.allocations.map(v=>v===null?0:v)});return r.valid?{...r,partial:true,unknownCount:unknown,shares:r.shares.map((x,i)=>input.allocations[i]===null?null:x)}:r;}
 if(tool==='purchase'){const p=purchase(s,source);return E.purchase({...p,capital:p.capital===null||p.reserve===null?null:p.capital-p.reserve,price:p.price===null||p.extras===null?null:p.price+p.extras});}
 if(tool==='activities'){if(!Number.isInteger(s.goal.players)||s.goal.players<1||s.goal.players>100)return{valid:false,reason:'Escribe un número de jugadores entre 1 y 100.'};const a=activities(s,source).find(a=>a.id===s.inverse.selected);if(!a)return{valid:false,reason:'Elige una actividad.'};if(a.players>s.goal.players)return{valid:false,reason:'Esta actividad se juega con '+a.players+' jugadores; sois '+s.goal.players+'. Ajusta tu grupo o elige un escenario en solitario.'};if((a.requiresPurchaseIds||[]).some(id=>!s.assets.some(x=>x.itemId===id&&x.owned)))return{valid:false,reason:'Te falta una compra para esta actividad. Marca “Ya lo he comprado” en “¿Qué compro primero?”.'};return E.inverse({...s.inverse,capital:s.goal.capital,reserve:s.goal.reserve,activity:a});}
 return{valid:false,reason:'Elige una herramienta.'};
}
const metrics={compare:['bestWaitHours','Tiempo de juego hasta tener la opción elegida','h',-1],goal:['totalMinutes','Tiempo de juego para mi objetivo','min',-1],session:['profit','Ganado durante la partida','$',1],activities:['profit','Ganado, sin contar la compra inicial','$',1],roi:['netProfit','Ganado al final, sin contar el precio','$',1],purchase:['remaining','Lo que me queda tras la compra','$',1],order:['totalHours','Tiempo de juego hasta la última compra','h',-1],budget:['available','Lo que me queda, sin el dinero apartado','$',1]};
/* v7.59 (check ultime, D-06) : en « nouvelle activité » avec ton gain actuel écrit, l’écran répond avec le gain EN PLUS de ce que tu gagnais déjà (marginalNetProfit) ; le chiffre gardé dans Mes calculs et comparé en mode Expert est le même. */
function metric(tool,s){if(tool==='roi'&&s.roi.mode==='estimate')return ['remaining','Lo que me queda tras esta compra','$',1];if(tool==='roi'&&s.roi.mode==='new'&&typeof s.goal.hourly==='number'&&Number.isFinite(s.goal.hourly))return ['marginalNetProfit','Ganado de más respecto a lo que ya ganaba, sin contar el precio','$',1];return metrics[tool];}
function sensitivity(tool,s,source=[]){
 let path,label,sourceInput=false;
 function reward(id){let i=s.activities.findIndex(a=>a.id===id),a=s.activities[i];if(i<0){i=source.findIndex(a=>a.id===id);a=source[i];sourceInput=true;}if(!a)return;path=sourceInput?[i,'reward']:['activities',i,'reward'];label='Recompensa de “'+a.name+'” únicamente';}
 if(tool==='goal'){if(s.model==='continuous'){path=['goal','hourly'];label='Lo que ganas por hora: un 20 % más o menos';}else{const owned=s.assets.filter(a=>a.owned).map(a=>a.itemId),candidate=s.activities.find(a=>a.players<=s.goal.players&&(a.requiresPurchaseIds||[]).every(id=>owned.includes(id))&&E.activity(a).valid);reward(s.goal.selected==='mixed'?candidate?.id:s.goal.selected);}}
 if(tool==='activities')reward(s.inverse.selected);
 if(tool==='session'){const r=session(s,source),id=r.valid?r.timeline.find(x=>x.net>0)?.id:null;reward(id||eligible(s,source).find(a=>E.activity(a).valid)?.id);}
 if(['roi','purchase'].includes(tool)){const i=s.assets.findIndex(a=>a.key===(tool==='roi'?s.roi.key:s.purchase.key));if(i<0)return null;path=['assets',i,'price'];label='El precio de la compra: un 20 % más caro o más barato';}
 /* v7.53 : sans achat à ordonner ou à comparer, pas de courbe « Et si… » (elle afficherait « de 0 min à 0 min »).
    v7.54 : le bloc reste affiché (comme en v7.47) avec la raison et ce qu’il faut écrire : voir « pending » dans l’écran. */
 if(tool==='order'&&s.order.keys.filter(k=>asset(s,k)).length<1)return {pending:true,label:'Lo que ganas por hora: un 20 % más o menos',need:'Añade al menos una compra con su precio en “¿Qué compro primero?”: este bloque mostrará entonces cómo cambia el tiempo hasta la última compra cuando tu ganancia por hora varía un 20 %.'};
 if(tool==='compare'&&s.compare.keys.filter(k=>asset(s,k)).length<2)return {pending:true,label:'Lo que ganas por hora: un 20 % más o menos',need:'Añade al menos dos compras para comparar: este bloque mostrará entonces cómo cambia la espera antes de poder comprar cuando tu ganancia por hora varía un 20 %.'};
 if(tool==='order'||tool==='compare'){path=['goal','hourly'];label='Lo que ganas por hora: un 20 % más o menos';}
 if(tool==='budget'){const first=s.budget.source==='basket'?s.assets.findIndex(a=>a.key===s.order.keys[0]):-1;path=first>=0?['assets',first,'price']:s.budget.source==='manual'?['budget','allocations',0]:['budget','extra'];label='Solo el precio de tu primer gasto';}
 if(!path)return null;let value=sourceInput?source:s;for(const k of path)value=value[k];
 return{label,path:path.slice(),sourceInput,rows:[.8,1,1.2].map(f=>{const c=copy(s),sources=sourceInput?copy(source):source;let p=sourceInput?sources:c;path.slice(0,-1).forEach(k=>p=p[k]);const v=Number.isFinite(value)?Math.min(1e12,value*f):null;p[path.at(-1)]=v;return{factor:f,value:v,bounded:Number.isFinite(value)&&value*f>1e12,result:evaluate(tool,c,sources)};})};
}
function signature(s){const c=copy(s);delete c.name;delete c.mode;delete c.views;delete c.tab;delete c.catalogue;delete c.completed;return JSON.stringify(c);}
function referenceWarnings(s,catalogue){const out=[];s.assets.forEach(a=>{if(!a.itemId)return;const item=catalogue.find(x=>x.id===a.itemId);if(!item)out.push(a.name+': esta ficha ya no existe, se conserva tu precio.');else if(a.referencePrice!==item.price)out.push(item.name+': el precio del sitio ha cambiado; revisa tu cifra.');});return out;}
function initial(dataVersion,presets){return defaults({version:2,dataVersion,mode:'quick',model:'continuous',name:'Mi primer millón',tab:'goal',goal:{capital:200000,target:1000000,hourly:100000,reserve:0,dailyMinutes:60,players:1,selected:'scenario-a',meaning:'available',plannedSpend:null,upkeepPerSession:null,deadlineDays:null},activities:presets.map(a=>({id:a.id,name:a.name,reward:a.reward,cost:a.cost,duration:a.duration,prep:a.prep,cooldown:a.cooldown,share:a.share,investment:a.investment,players:a.players,owned:false})),session:{minutes:60,maxRepeat:100,enabled:['scenario-a','scenario-b','scenario-c']},inverse:{minutes:60,selected:'scenario-a'},purchase:{itemId:'',price:100000,hourly:50000,boostHourly:0,capital:200000,target:1000000,reserve:0,extras:0},catalogue:{query:'',type:'all',status:'all',maxPrice:null,sort:'name',favorites:[],compareIds:[],favoritesOnly:false}});}
return Object.freeze({planLogId,analysis,goalTarget,usageOf,terrainFits,OBJECTIVES,dependencyOrder,copy,tools,names,defaults,initial,validate,migrate,asset,addAsset,activities,eligible,purchase,goal,session,projection,roi,investment,decision,blank,orderInput,budgetInput,chooseInput,planInput,planMissing,planPurchases,planReserve,planGoalName,planStrategies,planAlternatives,planObserved,planNextSession,planDeadline,planCurve,planTemplate,planMissionTemplate,planPrereqTemplate,planLogTemplate,planVariantTemplate,analysisTemplate,assetTemplate,MECHANICS,ROLES,GOAL_MEANINGS,PRIORITIES,TERRAINS,STRATEGIES,STRATEGY_LABEL,PLAN_KINDS,PLAN_SOURCES,evaluate,metrics,metric,sensitivity,signature,referenceWarnings});
});
