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
const names={goal:'Meu objetivo',activities:'Minhas atividades',session:'Meu tempo de jogo',purchase:'Minhas compras',order:'O que comprar primeiro?',roi:'Vale a pena?',budget:'Meu orçamento',compare:'Qual compra escolher?',plan:'Meu plano de negócios'};
const assetTemplate={key:'free-1',itemId:'',name:'Minha compra livre',price:100000,referencePrice:null,extras:0,fees:0,owned:false,incomeMode:'none',boostHourly:0,utility:null,
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
const planMissionTemplate={id:'m-1',name:'Minha missão',reward:null,cost:0,duration:null,prep:0,cooldown:0,share:100,investment:0,owned:false,units:0,requires:[],once:false,done:false,started:false,requiresMissions:[],players:1};
const planPrereqTemplate={id:'p-1',name:'Minha compra anterior',itemId:'',referencePrice:null,price:null,boostHourly:0,owned:false,started:false,minutes:null,requires:[],usagePerSession:null};
const planLogTemplate={id:'',at:'',capital:0,minutes:0,forecast:null,note:'',units:null,unitsGain:null,gain:null,plannedGain:null,sessionMinutes:0,runs:{},purchases:[]};
const planTemplate={goal:copy(planGoalTemplate),situation:copy(planSituationTemplate),source:'hourly',missions:[],prerequisites:[],priority:'balanced',strategy:'auto',variant:'auto',maxRepeat:100,deadlineDays:null,details:false,log:[],playedMinutes:0,sessionsPlayed:0,locked:[],variants:[]};
// v6 : une variante garde une copie des réponses du plan (jamais le plan de référence écrasé) ; cinq au plus.
const planVariantTemplate={id:'v-1',label:'Minha variante',at:'',goal:copy(planGoalTemplate),situation:copy(planSituationTemplate),source:'hourly',missions:[],prerequisites:[],priority:'balanced',strategy:'auto',maxRepeat:100,deadlineDays:null};
// v6 : réglages d’analyse partagés par les huit calculs. Tout est « pas encore écrit » (null) ou désactivé au départ.
const MECHANICS=['carburant','entretien','reparation','assurance','revente','munitions','soin','revenu-passif','echec','bonus'];
const analysisTemplate={horizon:{sessions:null,uses:null,hours:null},need:{usage:'',passengers:null,terrain:'',cargo:false},priority:'fast',
 simulations:Object.fromEntries(MECHANICS.map(m=>[m,false])),
 sim:{carburant:{distance:null,consommation:null,prixUnitaire:null},entretien:{parPartie:null},reparation:{parPartie:null},assurance:{parPartie:null},revente:{valeur:null},munitions:{parTentative:null},soin:{points:null},'revenu-passif':{parHeure:null,plafond:null},echec:{tentativesRatees:null},bonus:{pourcentage:null}}};
const ROLES=['unknown','income','unlock','improve','replace','comfort','pleasure'],GOAL_MEANINGS=['held','available','cumulative'],PRIORITIES=['fast','cheapStart','cheapTotal','reserve'],TERRAINS=['','route','tout-terrain','eau','air'];
const STRATEGIES=['auto','asIs','byPayback','cheapFirst','skipNoBoost','direct','useReserve'];
const PLAN_KINDS=['purchase','amount','unlock'],PLAN_SOURCES=['hourly','missions'];
/* lot 2 (C13) : version des règles de calcul, lue par la migration ; modelUpgradedFrom garde l’ancienne version d’une sauvegarde
   relevée (null sinon), pour dire qu’un résultat gardé a été calculé sous d’autres règles. */
const MODEL_VERSION=M&&M.MODEL_VERSION?M.MODEL_VERSION:2;
function defaults(old){
 const s=copy(old);s.version=6;s.modelVersion=MODEL_VERSION;s.modelUpgradedFrom=null;s.analysis=copy(analysisTemplate);s.views=Object.fromEntries([...tools,'plan'].map(t=>[t,'quick']));
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
function addAsset(s,item){let a=s.assets.find(x=>x.itemId===item.id);if(!a){if(s.assets.length>=40)throw Error('No máximo quarenta compras. Remova uma compra que você não usa antes de continuar.');a={...copy(assetTemplate),key:item.id,itemId:item.id,name:item.name,price:item.price,referencePrice:item.price};/* v7.52 : un véhicule ou une arme déjà déclaré dans un carnet (fiche, carnet, tableau de bord) arrive « déjà possédé » : même contexte de calcul. Le crochet LKCalcOwned n’existe que dans le navigateur ; décocher reste possible. */if(typeof globalThis!=='undefined'&&typeof globalThis.LKCalcOwned==='function'&&globalThis.LKCalcOwned(item)===true)a.owned=true;s.assets.push(a);}return a;}
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
 if(goalAsset)plan.goal={...plan.goal,kind:'purchase',name:goalAsset.name||'Meu objetivo',itemId:goalAsset.itemId||'',referencePrice:goalAsset.referencePrice??null,price:total(goalAsset),boostHourly:boost(goalAsset)};
 else plan.goal={...plan.goal,kind:'amount',target:old.target??g.target??null};
 if(old.usePrerequisites!==false)plan.prerequisites=(s.order?.keys||[]).filter(k=>k!==old.key).map(find).filter(Boolean).slice(0,20).map((a,i)=>({id:'p-'+(i+1),name:a.name||'Compra',itemId:a.itemId||'',referencePrice:a.referencePrice??null,price:total(a),boostHourly:boost(a),owned:a.owned===true}));
 if(old.activity){const a=(s.activities||[]).find(x=>x&&x.id===old.activity);if(a){plan.source='missions';plan.missions=[{id:'m-1',name:a.name||'Minha missão',reward:a.reward??null,cost:a.cost??0,duration:a.duration??null,prep:a.prep??0,cooldown:a.cooldown??0,share:a.share??100,investment:a.investment??0,owned:a.owned===true,units:0,requires:[]}];}}
 plan.priority=old.priority;plan.strategy=old.strategy;plan.deadlineDays=old.deadlineDays;plan.details=old.details;plan.playedMinutes=old.playedMinutes;
 plan.log=(Array.isArray(old.log)?old.log:[]).map(e=>({...copy(planLogTemplate),...e}));
 return {...copy(s),version:5,plan};
}
/* lot 2 (C13) : après la migration de version, une sauvegarde calculée sous une version du modèle plus ancienne est relevée à
   MODEL_VERSION et garde l’ancienne dans modelUpgradedFrom (jamais abaissée ; aucune autre valeur touchée ; idempotent). */
function migrate(raw,initial){
 let out=migrateVersion(raw,initial);
 const mv=Number.isInteger(raw.modelVersion)?raw.modelVersion:1;
 if(mv<MODEL_VERSION)out={...out,modelVersion:MODEL_VERSION,modelUpgradedFrom:Number.isInteger(out.modelUpgradedFrom)?out.modelUpgradedFrom:mv};
 return out;
}
function migrateVersion(raw,initial){
 if(!raw||typeof raw!=='object'||![1,2,3,4,5,6].includes(raw.version))throw Error('Versão de backup não reconhecida.');
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
 const r=raw.roi||{};s.assets.push({...copy(assetTemplate),key:'legacy-roi',name:'Investimento importado',price:r.purchase===undefined?null:r.purchase,extras:r.upgrades||0,fees:r.fees||0});
 s.roi={...copy(initial.roi),...r,key:'legacy-roi',mode:'continuous',activityIds:[]};
 s.order={keys:[]};(raw.order?.items||[]).forEach((item,i)=>{const a={...copy(assetTemplate),...item,key:'legacy-order-'+i,itemId:'',incomeMode:item.boostHourly?'personal':'none'};s.assets.push(a);s.order.keys.push(a.key);});
 s.budget={...copy(initial.budget),...raw.budget,source:'manual'};s.completed=[];
 /* v7.59 (check ultime, D-08) : comme pour une sauvegarde v3/v4, le business plan reçoit une copie des chiffres du joueur (jamais l’exemple du site). */
 s.plan.situation={...s.plan.situation,capital:s.goal.capital??null,reserve:s.goal.reserve??0,hourly:s.goal.hourly??null,dailyMinutes:s.goal.dailyMinutes??null};s.plan.goal.target=s.goal.target??null;
 // Shared goal values are authoritative; historical copies stay in the untouched v1 storage.
 return s;
}
function validate(raw,initial){
 if(!raw||!raw.goal||!Array.isArray(raw.activities)||(raw.version===3&&!Array.isArray(raw.assets)))throw Error('Backup incompleto: faltam o objetivo, as atividades ou as compras.');
 raw=migrate(raw,initial);
 function walk(t,v,key){
  if(v===undefined)return ['price','reward','duration','capital','target','hourly'].includes(key)?null:copy(t);
  if(t===null||typeof t==='number'){if(v===null)return null;if(typeof v!=='number'||!Number.isFinite(v)||Math.abs(v)>1e12)throw Error('Número inválido: '+key);return v;}
  if(typeof t==='string'){if(typeof v!=='string'||v.length>200)throw Error('Texto inválido: '+key);return v;}
  if(typeof t==='boolean'){if(typeof v!=='boolean')throw Error('Opção inválida: '+key);return v;}
  if(Array.isArray(t)){
   if(!Array.isArray(v)||v.length>100)throw Error('Lista inválida: '+key);
   if(key==='log'){const seenLog=new Set();return v.slice(0,60).filter(e=>{if(!e||typeof e!=='object'||typeof e.id!=='string'||!e.id)return true;if(seenLog.has(e.id))return false;seenLog.add(e.id);return true;}).map(e=>{if(!e||typeof e!=='object'||Array.isArray(e))throw Error('Histórico do plano inválido.');const capital=typeof e.capital==='number'&&Number.isFinite(e.capital)&&e.capital>=0&&e.capital<=1e12?e.capital:null;if(capital===null)throw Error('Histórico do plano inválido.');const num=(x,max)=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=max?x:null;const any=x=>typeof x==='number'&&Number.isFinite(x)&&Math.abs(x)<=1e12?x:null;const runs={};if(e.runs&&typeof e.runs==='object'&&!Array.isArray(e.runs))Object.keys(e.runs).slice(0,12).forEach(k=>{const n=num(e.runs[k],1e5);if(k.length<=60&&n!==null)runs[k]=n;});return {id:typeof e.id==='string'?e.id.slice(0,80):'',at:typeof e.at==='string'?e.at.slice(0,40):'',capital,minutes:num(e.minutes,1e7)??0,forecast:any(e.forecast),note:typeof e.note==='string'?e.note.slice(0,300):'',units:num(e.units,1e12),unitsGain:any(e.unitsGain),gain:any(e.gain),plannedGain:any(e.plannedGain),sessionMinutes:num(e.sessionMinutes,1e5)??0,runs,purchases:Array.isArray(e.purchases)?e.purchases.filter(x=>typeof x==='string'&&x.length<=60).slice(0,20):[]};});}
   if(key==='missions'){if(v.length>12)throw Error('No máximo doze missões no plano.');return v.map((x,i)=>{const m=walk(planMissionTemplate,x,'mission');if(typeof m.id!=='string'||!m.id)m.id='m-'+(i+1);return m;});}
   if(key==='prerequisites'){if(v.length>20)throw Error('No máximo vinte compras anteriores no plano.');return v.map((x,i)=>{const a=walk(planPrereqTemplate,x,'prerequisite');if(typeof a.id!=='string'||!a.id)a.id='p-'+(i+1);return a;});}
   if(key==='variants'){if(v.length>5)throw Error('No máximo cinco variantes no plano.');return v.map((x,i)=>{const a=walk(planVariantTemplate,x,'variant');if(typeof a.id!=='string'||!a.id)a.id='v-'+(i+1);return a;});}
   if(['keys','activityIds','requiresPurchaseIds','enabled','favorites','compareIds','completed','done','requires','unlocks','requiresMissions','locked'].includes(key)){if(v.some(x=>typeof x!=='string'||x.length>160))throw Error('Identificador inválido.');return [...new Set(v)].slice(0,key==='compareIds'?3:100);}
   if(key==='assets'){if(v.length<1||v.length>40)throw Error('De uma a quarenta compras por cenário.');return v.map(x=>walk(assetTemplate,x,'asset'));}
   if(key==='activities'){if(v.length!==initial.activities.length)throw Error('Número de atividades pessoais incompatível.');return v.map((x,i)=>walk(initial.activities[i],x,'activity'));}
   if(key==='allocations'&&v.length!==5)throw Error('Divisão do orçamento incompatível.');
   return v.map((x,i)=>walk(t[i]===undefined?t[0]:t[i],x,key));
  }
  if(!v||typeof v!=='object'||Array.isArray(v))throw Error('Parâmetros incompletos: '+key);
  const o={};for(const k of Object.keys(t))o[k]=walk(t[k],v[k],k);return o;
 }
 const s=walk(initial,raw,'scenario');
 if(![...tools,'plan'].includes(s.tab)||!['quick','guided','advanced'].includes(s.mode)||!['continuous','cycles'].includes(s.model))throw Error('Ferramenta ou modo inválido.');
 if(!asset(s,s.purchase.key)||!asset(s,s.roi.key))throw Error('Falta a referência interna de uma compra. Não dá para restaurar o backup.');
 if(!['all','vehicle','weapon','property','business','place','hideout','style','customization','consumable','ammo','housing','activity'].includes(s.catalogue.type)||!['all','known','unknown','manual','official','verified','estimated'].includes(s.catalogue.status)||!['name','price-up','price-down'].includes(s.catalogue.sort))throw Error('Filtro do catálogo incompatível.');
 if(s.activities.some((a,i)=>a.id!==initial.activities[i].id))throw Error('Referência de atividade inválida.');
 if(new Set(s.assets.map(a=>a.key)).size!==s.assets.length||s.assets.some(a=>!a.key||!['none','personal','roi'].includes(a.incomeMode)))throw Error('Referências de compras incompatíveis.');
 if(!['estimate','new','improve','continuous'].includes(s.roi.mode)||!['basket','manual'].includes(s.budget.source))throw Error('Modelo de cálculo incompatível.');
 if(!['value','cheapest','cheapestTotal','fastest','profit','utility'].includes(s.compare.criterion)||!PLAN_KINDS.includes(s.plan.goal.kind)||!PLAN_SOURCES.includes(s.plan.source)||!['balanced','fast','safe','cheap'].includes(s.plan.priority))throw Error('Ajuste de comparação ou de plano incompatível.');
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
function purchase(s,source=[]){const a=asset(s,s.purchase.key)||{...assetTemplate,price:null};let boost=a.incomeMode==='personal'?a.boostHourly:0;if(a.incomeMode==='roi'){const r=roi(s,source);boost=s.roi.key===a.key&&['new','improve'].includes(roiMode(s))&&r.valid&&Number.isFinite(r.netHourly)?Math.max(0,r.netHourly):null;}return {...a,extras:a.extras===null||a.fees===null?null:a.extras+a.fees,capital:s.goal.capital,reserve:s.goal.reserve,target:s.goal.target,hourly:s.goal.hourly,boostHourly:boost};}
/* lot 2 (C11) : un seul gain net par heure (gain − dépenses par partie ramenées à l’heure) pour Mon objectif, Quoi acheter d’abord ?
   et Mon temps de jeu ; sans temps de partie, le brut est gardé et dit (known:false, reason). net est null quand le gain est vide. */
function hourlyNet(s){const g=s.goal,hourly=typeof g.hourly==='number'&&Number.isFinite(g.hourly)?g.hourly:null,daily=typeof g.dailyMinutes==='number'&&g.dailyMinutes>0?g.dailyMinutes:null,up=typeof g.upkeepPerSession==='number'&&g.upkeepPerSession>0?g.upkeepPerSession:0;
 const upkeepHourly=up>0&&daily?up*60/daily:0,known=!(up>0&&!daily);
 return {hourly,net:hourly===null?null:hourly-upkeepHourly,upkeepHourly,known,reason:known?null:'Não escrito: seus gastos por sessão não são descontados do ganho por hora na espera.'};}
function goal(s,source=[]){
 // v7.49 : le but vise l’argent disponible après la réserve (comme avant), l’argent détenu (réserve comprise) ou des gains
 // cumulés ; les dépenses prévues avant le but s’ajoutent à ce qu’il faut gagner ; les dépenses par partie baissent le gain.
 const g=s.goal,target=goalTarget(s),daily=typeof g.dailyMinutes==='number'&&g.dailyMinutes>0?g.dailyMinutes:null,up=typeof g.upkeepPerSession==='number'&&g.upkeepPerSession>0?g.upkeepPerSession:0;
 if(s.model==='continuous'){
  const hn=hourlyNet(s);/* lot 2 (C11) : même gain net que Quoi acheter d’abord ? et Mon temps de jeu (valeur inchangée ici) */
  if(up>0){if(!hn.known)return{valid:false,reason:'Seus gastos por sessão precisam do seu tempo de jogo por dia: escreva essa informação.'};}
  let hourly=hn.net;
  if(typeof hourly==='number'&&hourly<=0&&up>0&&target!==null&&target>(g.capital??0)-(g.reserve??0))return{valid:false,reason:'Seus gastos por sessão comem tudo o que você ganha: diminua esses gastos ou ganhe mais por hora.'};
  const r=E.goalContinuous({...g,target,hourly:typeof hourly==='number'?Math.max(0,hourly):hourly});
  /* lot 1 : la dépense prévue est payée avant le but ; « Tu auras à la fin » ne la compte plus comme argent détenu (scénario C du
     cahier de recette) et la courbe la retire dès qu’elle se paie sans toucher à l’argent gardé de côté. */
  if(!r.valid)return r;const done=settle(r,plannedOf(g));if(r.totalMinutes>0)done.curve=curveOf(g,done,plannedOf(g));
  return up>0?{...done,upkeepHourly:up*60/daily}:done;}
 if(!Number.isInteger(g.players)||g.players<1||g.players>100)return{valid:false,reason:'Escreva um número de jogadores entre 1 e 100.'};
 const all=activities(s,source), compatible=all.filter(a=>a.players<=g.players&&(a.requiresPurchaseIds||[]).every(id=>s.assets.some(x=>x.itemId===id&&x.owned)));
 const run=extra=>{const t=target===null?null:target+g.reserve+extra;
  if(g.selected==='mixed')return E.goalMixed({...g,target:t,activities:compatible.filter(a=>s.activities.some(x=>x.id===a.id))});
  const a=compatible.find(a=>a.id===g.selected);if(!a){const excluded=all.find(a=>a.id===g.selected);return{valid:false,reason:excluded&&excluded.players>g.players?'Este cenário é para '+excluded.players+' jogadores; vocês são '+g.players+'.':'Escolha uma atividade compatível com o seu grupo e com as compras que você já tem.'};}
  return E.goal({...g,target:t,activity:a});};
 if(!up)return settle(run(0),plannedOf(g));
 // Dépenses par partie : chaque partie en plus coûte aussi ; on recalcule jusqu’à ce que le nombre de parties ne bouge plus.
 let extra=0,r=run(0);for(let i=0;i<24&&r.valid;i+=1){const need=up*r.sessions;if(need===extra)break;extra=need;r=run(extra);}
 /* lot 1 : les dépenses par partie et la dépense prévue sont payées : elles ne restent pas dans l’argent de la fin */
 return r.valid?settle({...r,upkeepTotal:extra},plannedOf(g)+extra):r;
}
function session(s,source=[]){
 if(!Number.isInteger(s.goal.players)||s.goal.players<1||s.goal.players>100)return{valid:false,reason:'Diga se você joga sozinho ou em grupo em Minhas atividades.'};
 const candidates=eligible(s,source),valid=candidates.filter(a=>E.activity(a).valid);
 const r=E.sessionPlan({capital:s.goal.capital,reserve:s.goal.reserve,minutes:s.session.minutes,maxRepeat:s.session.maxRepeat,activities:valid.length?valid:candidates});
 /* lot 2 (C12) : le programme est rejoué par le vérificateur indépendant (argent, réserve, achat de départ payé une fois, chaque
    mission dans la partie) ; un programme qui ne passe pas n’est pas proposé. Journal : une action par mission, frais au début,
    achat de départ (asset) la première fois, récompense (déjà nette de la part) à la fin. */
 if(!r.valid||!Array.isArray(r.timeline))return r;
 const events=[],paid=new Set();
 r.timeline.forEach(st=>{events.push({at:st.start,kind:'act',until:st.end,session:1,id:st.id,needs:paid.has(st.id)?['inv:'+st.id]:[]});if(st.cost>0)events.push({at:st.start,kind:'spend',amount:st.cost});if(st.investment>0&&!paid.has(st.id)){events.push({at:st.start,kind:'spend',amount:st.investment,asset:true,unlocks:'inv:'+st.id});paid.add(st.id);}if(st.reward>0)events.push({at:st.end,kind:'earn',amount:st.reward});});
 const v=E.cashJournalVerify({capital:s.goal.capital,reserve:s.goal.reserve,events,claim:{finalCash:r.finalCapital,sessionMinutes:s.session.minutes}});
 if(v.valid&&v.ok===false)return {valid:false,reason:verifyText(v),verification:v};
 r.verification=v;return r;
}
function projection(s,source=[],r=session(s,source)){
 if(!r.valid)return r;
 /* correctif lot 2 (ARI3-2) : la partie suivante (durée habituelle ≠ partie faite) part de l’argent réel après les dépenses de la partie
    faite (finalCapital − up) ; avant, une mission à frais élevés était jugée payable avec un argent que les dépenses avaient déjà entamé. */
 const up=typeof s.goal.upkeepPerSession==='number'&&s.goal.upkeepPerSession>0?s.goal.upkeepPerSession:0;
 const repeat=copy(s),left=r.finalCapital-up;repeat.goal.capital=left;repeat.session.minutes=s.session.usualMinutes;
 const paid=new Set(r.breakdown.filter(a=>a.runs).map(a=>a.id));repeat.activities.forEach(a=>{if(paid.has(a.id))a.owned=true;});
 /* correctif lot 2 (ARI4-3) : quand les dépenses de la partie laissent moins que l’argent gardé de côté (ou rien du tout), la partie suivante ne peut
    pas être calculée (l’entrée fabriquée serait refusée par le moteur : « Ce que tu as doit être un nombre… », hors sujet) : elle ne rapporte rien
    → next ≤ 0, aucun nombre de parties ni raison de calendrier, et « Ce qui compte » dit que les dépenses mangent la partie (P7b), comme à durée égale. */
 const next=repeat.session.minutes===s.session.minutes?{valid:true,profit:r.profit+r.investment}:left<(s.goal.reserve||0)?{valid:true,profit:0}:session(repeat,source);
 /* lot 2 (C11) : même cible que Mon objectif (sens du but, dépense prévue) et dépenses par partie retirées de chaque partie. */
 return E.sessionProjection({capital:s.goal.capital,reserve:s.goal.reserve,target:goalTarget(s),upkeepPerSession:up,session:r,repeatProfit:next.valid?next.profit:null,repeatReason:next.valid?null:next.reason,daysPerWeek:s.session.daysPerWeek});
}
/* v7.66 (contrôle Astra) : un achat déclaré « pour le plaisir » ou « pour le confort » dans Mes achats n’est jamais jugé sur une
   rentabilité, même si « Ça vaut le coup ? » était resté sur un mode à gain : le mode effectif est alors « estimate ». */
function roiMode(s){const a=asset(s,s.roi.key);return a&&(a.role==='pleasure'||a.role==='comfort')?'estimate':s.roi.mode;}
function roi(s,source=[],ctx={}){
 const r={...s.roi,mode:roiMode(s)},a=asset(s,r.key);if(!a)return{valid:false,reason:'Escolha uma compra na lista.'};
 if(r.mode==='estimate')return decision(s,source);
 const input={...r,purchase:a.price,upgrades:a.extras,fees:a.fees};
 if(r.mode==='continuous'){const u=usagePerHourOf(s,a,ctx);if(u!==null&&!(r.costHourly>0))return {...E.roi({...input,costHourly:u}),usageFromPurchase:u};return E.roi(input);}
 const acts=activities(s,source).filter(a=>r.activityIds.includes(a.id));
 if(acts.length!==r.activityIds.length)return{valid:false,reason:'Uma das atividades não existe mais. Escolha outra.'};
 if(acts.some(a=>a.players>s.goal.players))return{valid:false,reason:'Uma das atividades é para mais jogadores do que vocês são. Mude o número de jogadores em Minhas atividades.'};
 // Nouvelle activité : le temps passé dessus ne rapporte plus ce que le joueur gagnait déjà (son chiffre par heure), si on le connaît.
 return E.investmentActivities({...input,activities:acts,baselineHourly:r.mode==='new'?s.goal.hourly:null});
}
function investment(s,source=[],ctx={}){const a=asset(s,s.roi.key);if(!a)return{valid:false,reason:'Escolha uma compra.'};const u=usagePerHourOf(s,a,ctx),cost=u!==null&&!(s.roi.costHourly>0)?u:s.roi.costHourly;return E.investmentCompare({capital:s.goal.capital,reserve:s.goal.reserve,price:a.price,extras:a.extras,fees:a.fees,baselineHourly:s.goal.hourly,extraHourly:s.roi.revenueHourly,costHourly:cost,hours:s.roi.hours,dailyMinutes:s.goal.dailyMinutes});}
// Coût d’usage de l’achat converti par heure (une partie = ton temps de jeu par jour) ; null s’il n’est pas connu.
function usagePerHourOf(s,a,ctx){if(!M||!a)return null;const u=usageOf(s,a,itemOf(a,ctx)),d=typeof s.goal.dailyMinutes==='number'&&s.goal.dailyMinutes>0?s.goal.dailyMinutes:null;return M.V.usable(u.perSession)&&d?u.perSession.v*60/d:null;}
function decision(s,source=[],key=s.roi.key){
 const a=asset(s,key);if(!a)return{valid:false,reason:'Escolha uma compra ou escreva uma compra livre.'};
 let hourly=s.goal.hourly;
 if(s.roi.recoveryActivity){const activity=activities(s,source).find(x=>x.id===s.roi.recoveryActivity),r=activity&&E.activity(activity);hourly=r?.valid&&r.hourly>=0?r.hourly:null;}
 return E.worth({capital:s.goal.capital,reserve:s.goal.reserve,price:a.price,extras:a.extras,fees:a.fees,hourly,hours:s.roi.hours});
}
function blank(current){
 const s=copy(current);s.name='Meu cálculo';s.model='continuous';s.completed=[];
 s.goal={...s.goal,capital:null,target:null,hourly:null,dailyMinutes:null,reserve:0,players:1,selected:'scenario-a',meaning:'available',plannedSpend:null,upkeepPerSession:null,deadlineDays:null};
 s.assets=[{...copy(assetTemplate),price:null}];s.purchase={key:'free-1'};
 s.roi={...s.roi,key:'free-1',mode:'estimate',hours:null,gainPercent:0,durationReduction:0,activityIds:[],revenueHourly:null,costHourly:0,compareKey:'',recoveryActivity:''};
 s.order={keys:[],objective:'all'};s.budget={source:'manual',extra:0,allocations:[0,0,0,0,0]};s.compare={...copy(compareTemplate)};s.plan=copy(planTemplate);s.analysis=copy(analysisTemplate);
 s.activities=s.activities.map((a,i)=>({...a,name:'Minha atividade '+String.fromCharCode(65+i),reward:null,duration:null,cost:0,prep:0,cooldown:0,share:100,investment:0,players:1,owned:false,prepOnce:false,requiresPurchaseIds:[]}));
 s.session={...s.session,enabled:['scenario-a'],minutes:null,usualMinutes:null,daysPerWeek:null};s.inverse={selected:'scenario-a',minutes:null};
 return s;
}
/* correctif lot 2 : un gain net négatif (dépenses par partie > gain) n’est pas une saisie fausse : E.order reçoit 0 (même règle que goal()) et
   la vraie cause est dite avec la phrase existante de Mon objectif (jamais « doit être un nombre égal à 0 ou plus », jamais un montant négatif). */
const UPKEEP_EATS='Seus gastos por sessão comem tudo o que você ganha: diminua esses gastos ou ganhe mais por hora.';
const orderHourly=s=>{const n=hourlyNet(s).net;return n===null?null:Math.max(0,n);};
const upkeepEats=s=>{const hn=hourlyNet(s);return hn.net!==null&&hn.net<=0&&hn.upkeepHourly>0;};
function orderInput(s,source=[]){
 const items=s.order.keys.map(key=>{const a=asset(s,key);if(!a)return{name:'Compra ausente',price:null};let boost=0;
  if(a.incomeMode==='personal')boost=a.boostHourly;
  if(a.incomeMode==='roi'){const r=roi(s,source);boost=s.roi.key===key&&['new','improve'].includes(roiMode(s))&&r.valid&&Number.isFinite(r.netHourly)?Math.max(0,r.netHourly):null;}
  return{name:a.name+(a.owned?' (já obtido)':''),price:a.owned?0:a.price===null||a.extras===null||a.fees===null?null:a.price+a.extras+a.fees,boostHourly:a.owned?0:boost};});
 return {capital:s.goal.capital,reserve:s.goal.reserve,hourly:orderHourly(s)/* lot 2 (C11) : gain net, dépenses par partie retirées ; jamais négatif (correctif : même règle que goal()) */,items};
}
function budgetInput(s){const allocations=s.budget.source==='basket'?s.order.keys.map(k=>{const a=asset(s,k);return a?.owned?0:!a||a.price===null||a.extras===null||a.fees===null?null:a.price+a.extras+a.fees;}):s.budget.allocations.slice();allocations.push(s.budget.extra);return{capital:s.goal.capital,reserve:s.goal.reserve,allocations};}
/* lot 3 : les achats comparés portent un nom unique (« Mon achat libre (2) » pour le deuxième du même nom) : le gagnant, les
   écartés, les coûts sur la durée et le bouton vers le plan se retrouvent par ce nom sans jamais confondre deux achats. */
function compareNames(s){const out={},used=new Set();s.compare.keys.forEach((k,i)=>{const a=asset(s,k);if(!a)return;const base=(typeof a.name==='string'&&a.name.trim()?a.name.trim().slice(0,120):'Compra '+(i+1));let name=base,n=1;while(used.has(name)){n+=1;name=base+' ('+n+')';}used.add(name);out[k]=name;});return out;}
function chooseInput(s,source=[]){
 const names=compareNames(s);
 const items=s.compare.keys.map(k=>{const a=asset(s,k);if(!a)return null;let income=null;if(a.incomeMode==='personal'&&a.boostHourly>0)income=a.boostHourly;if(a.incomeMode==='roi'){const r=roi(s,source);if(s.roi.key===k&&['new','improve','continuous'].includes(roiMode(s))&&r.valid&&Number.isFinite(r.netHourly)&&r.netHourly>0)income=r.netHourly;}
  return {name:names[k],price:a.owned?0:a.price,extras:a.extras,fees:a.fees,utility:a.utility,incomeHourly:income};}).filter(Boolean);
 return {capital:s.goal.capital,reserve:s.goal.reserve,hourly:s.goal.hourly,dailyMinutes:s.goal.dailyMinutes,hours:s.compare.hours,criterion:s.compare.criterion,items};
}
/* ---------- Mon business plan (v5) : ses propres réponses, un programme mission par mission ---------- */
const STRATEGY_LABEL={auto:'Deixar a calculadora escolher',asIs:'Na ordem que eu dei',byPayback:'O que rende mais rápido primeiro',cheapFirst:'O mais barato primeiro',skipNoBoost:'Só as compras que rendem dinheiro',direct:'Direto para a minha meta, sem comprar nada antes',useReserve:'Mexendo no dinheiro guardado'};
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
function planGoalName(s){const g=s.plan.goal;return g.kind==='amount'?'ter '+E.dollars(String(g.target),' ')+'':g.kind==='unlock'?'desbloquear '+(g.name||'meu objetivo'):(g.name||'minha compra');}
function planInput(s,strategy=s.plan.strategy){const p=s.plan,g=p.goal,si=p.situation;
 /* v7.54 : le groupe (si.players) écarte les missions qui demandent plus de joueurs ; les munitions simulées s’ajoutent aux frais de
    chaque tentative, comme dans Mes activités (revue v7.53, écarts B1 et B2). */
 const group=Number.isInteger(si.players)&&si.players>0?si.players:1,ammo=ammoPerAttempt(s),excludedMissions=p.source==='missions'?p.missions.filter(m=>(m.players||1)>group).map(m=>({id:m.id,name:m.name,players:m.players})):[];
 return {capital:si.capital,reserve:planReserve(s,strategy),sessionMinutes:si.dailyMinutes,excludedMissions,ammoPerAttempt:ammo,players:group,daysPerWeek:si.daysPerWeek??7,upkeepPerSession:si.upkeepPerSession??0,maxRepeat:p.maxRepeat,goalMeaning:g.kind==='amount'?g.meaning:'available',
  hourly:p.source==='hourly'?si.hourly:0,unitsHourly:p.source==='hourly'&&g.kind==='unlock'?(si.unitsHourly??0):0,
  goalPrice:g.kind==='purchase'?g.price:g.kind==='unlock'?(g.alsoPrice??0):null,target:g.kind==='amount'?g.target:null,targetUnits:g.kind==='unlock'?g.targetUnits:null,currentUnits:g.kind==='unlock'?(g.currentUnits??0):0,
  activities:p.source==='missions'?p.missions.filter(m=>(m.players||1)<=group).map(m=>({id:m.id,name:m.name,reward:m.reward,cost:typeof m.cost==='number'&&ammo&&!m.once?m.cost+ammo:m.cost,duration:m.duration,prep:m.prep,cooldown:m.cooldown,share:m.share,investment:m.investment,owned:m.owned,units:g.kind==='unlock'?m.units:0,requiresPurchaseIds:m.requires,requiresMissions:m.requiresMissions||[],once:m.once===true,done:m.done===true,players:1,ammoSimulated:ammo||0})):[],
  purchases:planPurchases(s,strategy),goalName:planGoalName(s),goalIncomeHourly:g.kind==='purchase'?(g.boostHourly||0):0,
  /* correctif lot 2 (ARI2-2, ARI2-4) : noms de tous les achats d’avant et missions, même retirés par une stratégie ou un plan de secours :
     le moteur dit « un achat (Hangar) » / « la mission (Déblocage) », jamais un identifiant ni « Référence absente ». */
  knownNames:Object.fromEntries([...p.prerequisites.map((x,i)=>[x.id,(typeof x.name==='string'&&x.name.trim())||'Compra '+(i+1)]),...p.missions.map((m,i)=>[m.id,(typeof m.name==='string'&&m.name.trim())||'Missão '+(i+1)])]),
  knownMissions:p.missions.map(m=>m.id)};}
// Ce qui manque pour calculer : dit dans l'ordre des questions du formulaire.
function planMissing(s){const p=s.plan,g=p.goal,si=p.situation;
 if(g.kind==='purchase'&&(g.price===null||!Number.isFinite(g.price)))return 'Escreva o preço da sua meta, nem que seja o preço que você imagina.';
 if(g.kind==='amount'&&(g.target===null||!Number.isFinite(g.target)))return 'Escreva o valor que você quer ter.';
 if(g.kind==='unlock'&&(g.targetUnits===null||!Number.isFinite(g.targetUnits)))return 'Escreva a quantidade de '+g.unitLabel+' que é preciso chegar a ter.';
 if(si.capital===null||!Number.isFinite(si.capital))return 'Escreva o dinheiro que você tem agora.';
 // v7.49 : sans durée de partie, le plan se fait en parcours continu (sans calendrier) ; une durée écrite doit être positive.
 if(si.dailyMinutes!==null&&(!Number.isFinite(si.dailyMinutes)||si.dailyMinutes<=0))return 'Uma sessão dura pelo menos 1 minuto (ou deixe em branco para um percurso sem sessões).';
 if(si.dailyMinutes===null&&(si.upkeepPerSession>0||p.prerequisites.some(x=>x.usagePerSession>0)))return 'Seus gastos por sessão precisam da duração de uma sessão: escreva essa duração.';
 {const todo=p.prerequisites.filter(x=>!x.owned&&(x.price===null||!Number.isFinite(x.price)));if(todo.length)return 'Percurso a completar: escreva o preço de '+todo.map(x=>'“'+x.name+'”').join(', ')+' (nem que seja o preço que você imagina), ou marque “Já tenho”.';}
 if(p.source==='hourly'&&(si.hourly===null||!Number.isFinite(si.hourly)))return 'Escreva o que você ganha por hora, ou escolha suas missões.';
 if(p.source==='missions'&&!p.missions.length)return 'Adicione pelo menos uma missão que você consiga fazer.';
 return null;}
// Stratégies : plusieurs ordres d'achats d'avant (et la réserve) comparés par recalcul complet ; la recommandation suit la priorité.
/* lot 2 (C8, C10, C12) : la vérification indépendante (E.missionVerify, E.cashJournalVerify) refuse un programme avec la règle
   nommée en mots ; un plan valide mais non atteint en 400 parties (ou au bout du parcours) est refusé avec sa portée chiffrée. */
const RULE_WORDS={R1:'um momento ilegível',R2:'um gasto feito antes de ter o dinheiro',R3:'uma etapa feita antes do que ela exige',R4:'uma compra paga duas vezes',R5:'duas ações ao mesmo tempo',R6:'um total diferente do registro',R7:'um objetivo anunciado na hora errada',R8:'uma ação que não cabe na sessão dela',R9:'um ganho por hora que não bate com o tempo jogado',R10:'gastos por sessão que não batem'};
function verifyText(v){const rules=[...new Set((v&&v.violations||[]).map(x=>x.rule))].map(k=>RULE_WORDS[k]||k);return 'Este programa não passa na verificação independente ('+rules.join(', ')+'): ele não é proposto. Mude um número para refazer o cálculo.';}
/* correctif lot 2 (ARI2-3) : but en points : la portée dit les points (« 0 sur 100 points ; il manquerait 100 points »), l’argent seulement
   si le but a aussi un prix ; aucun chiffre nouveau : finalUnits, missingUnits et targetUnits viennent du moteur et de l’entrée. */
const unitsText=n=>new Intl.NumberFormat('pt-BR',{maximumFractionDigits:2}).format(Math.round(n*100)/100);
function unreachedNote(r,s){const when=r.continuous?'Depois de '+E.durationText(r.totalMinutes/60)+' de jogo':'Depois de '+r.totalSessions+(E.plural(r.totalSessions)?' sessões':' sessão');
 const pts=!!(r.rules&&r.rules.units),label=(s&&s.plan&&s.plan.goal&&String(s.plan.goal.unitLabel||'').trim())||'points',target=r.missingUnits>0?r.finalUnits+r.missingUnits:null;/* missingUnits = max(0, cible − points) : la cible se retrouve sans rien relire */
 const have=[];if(!pts||r.goalMoney>0)have.push(E.dollars(fmt(r.finalCash)));if(pts)have.push(unitsText(r.finalUnits)+(target!==null?' de '+unitsText(target):'')+' '+label);
 const lack=[];if(r.missing>0)lack.push(E.dollars(fmt(r.missing)));if(r.missingUnits>0)lack.push(unitsText(r.missingUnits)+' '+label);
 /* correctif lot 2 (ARI3-3) : rien ne manque en argent mais une obtention est encore en cours (pendingAcquisitions du moteur) : le reste est dit */
 const pend=Array.isArray(r.pendingAcquisitions)?r.pendingAcquisitions.filter(x=>x&&x.minutes>0):[];
 return when+', você teria '+have.join(' e ')+(lack.length?'; faltariam '+lack.join(' e ')+'.':pend.length?'; ainda restariam '+E.durationText(pend.reduce((t,x)=>t+x.minutes,0)/60)+' de obtenção para “'+pend.map(x=>x.name).join('”, “')+'”.':'.');}
function planStrategies(s){const missing=planMissing(s);if(missing)return {valid:false,reason:missing,candidates:[],recommended:null,explored:0};
 const ids=['asIs','byPayback','cheapFirst','skipNoBoost','direct','useReserve'],seen={},candidates=[];
 ids.forEach(id=>{const input=planInput(s,id),key=id==='useReserve'?'reserve':input.purchases.map(x=>x.id).join('|');if(id!=='asIs'&&id!=='useReserve'&&seen[key]!==undefined)return;if(id==='useReserve'&&input.reserve===planInput(s,'asIs').reserve)return;seen[key]=id;
  const r=E.missionPlan({...input,journal:false}),removes=input.purchases.filter(x=>!x.owned).length<planInput(s,'asIs').purchases.filter(x=>!x.owned).length;/* lot 2 (C7) : candidats sans journal */
  candidates.push({id,label:STRATEGY_LABEL[id],valid:r.valid&&r.reached,reason:r.valid?(r.reached?null:r.note):r.reason,reached:r.valid?r.reached:null,missing:r.valid?r.missing:null,unreached:r.valid&&!r.reached,unreachedNote:r.valid&&!r.reached?unreachedNote(r,s):null,totalSessions:r.valid&&r.reached?r.totalSessions:null,totalMinutes:r.valid&&r.reached?r.totalMinutes:null,days:r.valid&&r.reached?r.days:null,finalCash:r.valid?r.finalCash:null,lowCash:r.valid&&r.lowPoint&&Number.isFinite(r.lowPoint.cash)?r.lowPoint.cash:null,reserveKept:input.reserve>0||(s.plan.situation.reserve??0)===0,removes,note:removes?'remove uma compra pedida':(id==='useReserve'?'gasta o dinheiro guardado':null)});});
 const ok=candidates.filter(c=>c.valid&&!c.removes),byTime=(a,b)=>(a.totalSessions===null&&b.totalSessions===null?a.totalMinutes-b.totalMinutes:a.totalSessions-b.totalSessions)||b.finalCash-a.finalCash||ids.indexOf(a.id)-ids.indexOf(b.id);
 /* v7.54 : « je garde mon argent de côté » (équilibre) et « je ne touche jamais à mon argent de côté » (sécurité) sont respectés :
    aucun plan qui puise dans la réserve n’est recommandé à leur place. S’il n’en existe pas, le plan est bloqué avec la raison et
    la façon d’en sortir (revue v7.53, écart B3). En sécurité, le plan gardé est celui dont le point bas est le plus haut. */
 const priority=['fast','balanced','safe','cheap'].includes(s.plan.priority)?s.plan.priority:'balanced';
 const kept=(s.plan.situation.reserve??0);
 let pool=priority==='fast'?ok:ok.filter(c=>c.reserveKept);
 const bySafety=(a,b)=>((b.lowCash??-Infinity)-(a.lowCash??-Infinity))||byTime(a,b);
 if(!pool.length){const asIs=candidates.find(c=>c.id==='asIs'),usesReserve=ok.find(c=>!c.reserveKept);
  /* lot 2 (C10) : « bloqué par l’argent de côté » seulement s’il y en a et qu’un plan existe en y puisant ; sinon la vraie raison
     (but non atteint en 400 parties, chiffré ; ou le refus du moteur), sans « Aucun plan ne garde tes 0 $ de côté ». */
  if(!(kept>0&&usesReserve))return {valid:false,reason:(asIs&&asIs.unreached?asIs.reason+' '+asIs.unreachedNote:asIs&&asIs.reason)||'Nenhum plano pode ser calculado com esses números.',candidates,recommended:null,explored:candidates.length};
  return {valid:true,reason:null,candidates,recommended:null,blocked:true,explored:candidates.length,blockedReason:'Nenhum plano mantém seus '+E.dollars(new Intl.NumberFormat('pt-BR').format(Math.round(kept)),' ')+' guardados'+(asIs&&asIs.reason?': '+asIs.reason.replace(/\.?$/,'')+'.':'.')+(usesReserve?' Se você usar o dinheiro guardado, existe um plano ('+(usesReserve.totalSessions!==null?usesReserve.totalSessions+(E.plural(usesReserve.totalSessions)?' sessões':' sessão'):Math.round(usesReserve.totalMinutes)+' min')+', no ponto mais baixo '+E.dollars(new Intl.NumberFormat('pt-BR').format(Math.round(usesReserve.lowCash??0)),' ')+'): para ver esse plano, escolha “O mais rápido possível: posso mexer no meu dinheiro guardado” em “Prefiro”.':' Diminua o dinheiro guardado ou os gastos, ou adicione uma missão mais barata para começar.')};}
 const byCost=(a,b)=>((b.finalCash??-Infinity)-(a.finalCash??-Infinity))||byTime(a,b);
 const recommended=pool.slice().sort(priority==='safe'?bySafety:priority==='cheap'?byCost:byTime)[0]?.id||null;
 return {valid:true,reason:null,candidates,recommended,explored:candidates.length};}
function planAlternatives(s,r){if(!r||!r.valid||!r.input)return {valid:false,reason:'Plano não calculado.',plans:[],results:{}};const obs=planObserved(s);const extra=[];
 if(obs&&obs.hourly!==null&&obs.hourly>0)extra.push({id:'observed',label:'No ritmo que você realmente teve ('+E.dollars(new Intl.NumberFormat('pt-BR',{maximumFractionDigits:0}).format(Math.round(obs.hourly)),' ')+' por hora)',changes:{activities:[],hourly:obs.hourly,unitsHourly:obs.unitsHourly||0},note:'Com base nas suas atualizações, não nas suas missões.'});
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
const SIM_LABEL={carburant:'Combustível',entretien:'Manutenção',reparation:'Consertos',assurance:'Seguro',revente:'Revenda',munitions:'Munição',soin:'Cura',"revenu-passif":'Receita da empresa',echec:'Tentativas fracassadas',bonus:'Bônus'};
const V=M?M.V:null;
function itemOf(a,ctx){return a&&a.itemId&&ctx&&Array.isArray(ctx.catalogue)?ctx.catalogue.find(x=>x.id===a.itemId)||null:null;}
const num=x=>typeof x==='number'&&Number.isFinite(x);
const fmt=n=>num(n)?new Intl.NumberFormat('pt-BR',{maximumFractionDigits:0}).format(Math.round(n)):'?';
// Prix d’un achat avec son statut : le prix du site (officiel) seulement s’il est connu et repris tel quel.
/* v7.59 (check ultime, CALC-13) : le prix du site garde son statut réel (officiel, mesuré, estimation…) via le schéma unique (V.published), jamais « officiel » par défaut. */
function priceV(a,item){if(!a||a.price===null||a.price===undefined)return V.blank();if(item&&num(item.price)&&a.price===item.price){const m=item.fieldMeta?.price||{};const v=V.published({value:a.price,status:m.status||'unverified',source:m.source||null,verifiedAt:m.verifiedAt||null});if(v.source)v.src=v.source;return v;}return V.personal(a.price);}
function totalAcq(a,item){if(!a)return M.total([]);if(a.owned)return M.total([{label:'Já é seu',value:V.personal(0)}]);return M.total([{label:'Preço',value:priceV(a,item),field:'price'},{label:'Opções',value:a.extras===null?V.blank():V.personal(a.extras||0),field:'extras'},{label:'Gastos obrigatórios no início',value:a.fees===null?V.blank():V.personal(a.fees||0),field:'fees'}]);}
// Coût d’usage par partie : ton chiffre s’il est écrit ; sinon les mécaniques que tu as choisi de simuler (véhicule) ;
// sinon « mécanique non confirmée » (véhicule, arme) ou « sans objet » (le reste). Jamais les deux à la fois.
function usageOf(s,a,item){
 const u=a&&a.usage||{},on=s.analysis.simulations,sim=s.analysis.sim,type=item?item.type:(a&&!a.itemId&&a.capabilities&&a.capabilities.terrain?'vehicle':null);
 const anySim=['carburant','entretien','reparation','assurance'].some(k=>on[k]);
 if(num(u.perSession))return {perSession:V.personal(u.perSession),lines:[{label:'Custo por sessão (seu número)',value:u.perSession,status:'personal'}],missing:[],note:anySim?'Você escreveu um custo por sessão: as simulações não se somam a ele (sem contagem dupla).':null,source:'personal'};
 const lines=[],missing=[];let total=0,any=false;
 if(type==='vehicle'){
  if(on.carburant){const f=sim.carburant;if([f.distance,f.consommation,f.prixUnitaire].every(num)){const v=M.units.fuelPerSession(f.distance,f.consommation,f.prixUnitaire);total+=v;any=true;lines.push({label:'Combustível (simulação)',value:v,status:'simulated',formula:fmt(f.distance)+' km × '+f.consommation+' L/100 km ÷ 100 × '+f.prixUnitaire+' $/L'});}else missing.push('Combustível: distância, consumo e preço do litro');}
  for(const k of ['entretien','reparation','assurance'])if(on[k]){const v=sim[k].parPartie;if(num(v)){total+=v;any=true;lines.push({label:SIM_LABEL[k]+' (simulation)',value:v,status:'simulated'});}else missing.push(SIM_LABEL[k]+' por sessão');}
 }
 if(any&&!missing.length)return {perSession:V.simulated(total),lines,missing,note:null,source:'simulated'};
 if(missing.length)return {perSession:V.blank(),lines,missing,note:'Simulação incompleta: '+missing.join(', ')+'.',source:'blank'};
 if(type==='vehicle')return {perSession:V.unconfirmed('carburant'),lines,missing,note:'Combustível, manutenção, consertos: nenhum custo confirmado em GTA VI. Você pode escrever o seu número ou escolher uma simulação.',source:'unconfirmed'};
 if(type==='weapon')return {perSession:V.unconfirmed('munitions'),lines,missing,note:'Munição: preço e consumo não publicados. Você pode escrever o seu número se quiser contar esses gastos.',source:'unconfirmed'};
 return {perSession:V.na('Sem custo de uso para esse tipo de compra, a não ser que você escreva um.'),lines,missing,note:null,source:'na'};
}
function resaleOf(s,a){if(!a||a.resale===null||a.resale===undefined)return V.unconfirmed('revente');return V.simulated(a.resale,{note:'Revenda escolhida por você'});}
function purchasableCheck(item,a){
 if(!a||!a.itemId)return {id:'achetable',label:'Compra livre',state:'na'};
 if(!item)return {id:'achetable',label:'Ficha não encontrada',state:'unknown',detail:'Esta ficha não existe mais no catálogo: seu preço foi mantido.'};
 if(item.purchasable===false||item.type==='place')return {id:'achetable',label:'À venda',state:'ko',detail:item.type==='place'?'Um lugar não se compra.':'Este item não está à venda em GTA VI.',fix:{text:'Escolha um item que dê para comprar.'}};
 if(item.purchasable===true)return {id:'achetable',label:'À venda',state:'ok'};
 return {id:'achetable',label:'Compra a confirmar',state:'assumed',detail:'A Rockstar ainda não disse se ele pode ser comprado nem como: o cálculo supõe que sim.'};
}
function cashCond(cc,label){if(!cc)return null;if(cc.owned)return {id:'argent-disponible',label:label||'Pagar agora',state:'na',detail:'Já é seu: nada a pagar.'};return {id:'argent-disponible',label:label||'Pagar agora',state:cc.state==='ok'?'ok':cc.state==='short'?'ko':'unknown',detail:cc.state==='short'?(cc.exact?'Faltam ':'Faltam pelo menos ')+E.dollars(fmt(cc.shortfall),' ')+' sem mexer no dinheiro guardado.':cc.state==='unknown'?cc.reason:'Cabe no seu dinheiro disponível.',fix:cc.state==='short'?{text:'Deixe menos guardado, ou ganhe mais '+E.dollars(fmt(cc.shortfall),' ')+' antes.',delta:cc.shortfall}:null};}
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
 /* v7.66 : un rôle « je ne sais pas encore » sans gain écrit reste inconnu (il n’est plus présenté comme un achat plaisir) */
 const role=a?(a.role!=='unknown'?a.role:a.incomeMode==='none'?'unknown':'income'):'unknown';
 const st=sustain(s,acq.complete?acq.value:null,use.perSession,sessions);
 const used=['argent-disponible','reserve','cout-acquisition'],excluded={};
 if(pc.state==='na')excluded.achetable='Compra livre: quem descreve é você.';else used.push('achetable');
 if(need.length)used.push('usage-compatible');else excluded['usage-compatible']='Nenhuma necessidade de uso anotada (terreno, lugares, carga).';
 if(V.usable(use.perSession)){used.push('cout-usage');if(sessions!==null)used.push('cout-complet','horizon','frequence');else{excluded['cout-complet']='Escreva em quantas sessões você pretende usar a compra para ter o custo completo.';excluded.horizon='Nenhum período anotado.';excluded.frequence='Nenhum número de sessões anotado.';}}
 else{excluded['cout-usage']=use.source==='na'?'Esse tipo de compra não tem custo de uso, a não ser que você escreva um.':use.note||'Custo de uso não anotado.';excluded['cout-complet']='É preciso um custo de uso para ir além do preço.';excluded.horizon='Só serve com um custo de uso.';excluded.frequence='Só serve com um custo de uso.';}
 if(num(s.goal.hourly)){used.push('delai-recuperation');}else excluded['delai-recuperation']='Escreva o que você ganha por hora para saber em quanto tempo você recupera o seu dinheiro.';
 used.push('argent-restant');
 if(role==='income'&&a&&a.incomeMode!=='none')used.push('gain-en-plus');else excluded['gain-en-plus']=role==='pleasure'||role==='comfort'?'Compra por prazer ou conforto: nenhum retorno é calculado.':'Nenhum ganho a mais escrito: nenhum retorno é calculado.';
 if(V.usable(cost.resale))used.push('revente-prevue');else excluded['revente-prevue']='Revenda: mecânica não confirmada; só é contada se você escrever um preço de revenda.';
 const mechanicsOn=Object.keys(s.analysis.simulations).filter(k=>s.analysis.simulations[k]);
 if(use.source==='simulated')used.push('mecanique-simulee');else excluded['mecanique-simulee']=mechanicsOn.length?'Você escreveu o seu próprio custo por sessão: a simulação não é somada.':'Nenhuma mecânica simulada (combustível, manutenção…): nada é inventado.';
 const values=[{label:'Preço',value:acq.rows[0]?.value,unit:'$',field:'f-purchase-price'},{label:'Opções',value:acq.rows[1]?.value,unit:'$',field:'f-purchase-extras'},{label:'Gastos obrigatórios no início',value:acq.rows[2]?.value,unit:'$',field:'f-purchase-fees'},{label:'Já tenho',value:V.from(s.goal.capital),unit:'$',field:'f-purchase-capital'},{label:'Guardado',value:V.from(s.goal.reserve),unit:'$',field:'f-purchase-reserve'},{label:'Custo por sessão',value:use.perSession,unit:'$/partie',field:'f-purchase-usage'},{label:'Sessões contadas',value:sessions===null?V.blank():V.personal(sessions),unit:'sessões',field:'f-analysis-horizon'}];
 const drivers=[];
 if(cc.state==='short')drivers.push({label:'Dinheiro disponível',text:'Preço, opções e gastos obrigatórios ultrapassam o que você pode gastar em '+E.dollars(fmt(cc.shortfall),' ')+'.',factor:'argent-disponible'});
 else if(cc.state==='ok'&&!cc.owned)drivers.push({label:'Dinheiro disponível',text:'Dá para pagar tudo agora sem mexer no dinheiro guardado.',factor:'argent-disponible'});
 if(st&&st.state==='insoutenable')drivers.push({label:'Custo de uso',text:'Cada sessão custa '+E.dollars(fmt(st.usagePerSession),' ')+' e só rende '+E.dollars(fmt(st.earnPerSession),' ')+': você perde '+E.dollars(fmt(-st.netPerSession),' ')+' por sessão.',factor:'cout-usage'});
 else if(st&&st.breach)drivers.push({label:'Dinheiro guardado ao longo do tempo',text:'Em '+st.sessions+' sessões, seu dinheiro ficaria abaixo do que você deixa guardado.',factor:'reserve'});
 const missing=[];if(acq.missing.length)missing.push({label:acq.missing.map(m=>m.label).join(', '),text:'Sem esse número, não dá para dizer se você pode pagar.',field:'f-purchase-price',decisive:true});
 /* lot 1 : la chaîne « Mon objectif si j’achète » (goalPurchase) dit si l’achat recule le but, de combien, à quel moment l’acheter,
    et à partir de quel gain en plus il ne le recule plus. Rien n’est dit sans objectif ni gain calculable. */
 const changes=cc.state==='short'?['Guardar '+E.dollars(fmt(cc.shortfall),' ')+' a menos guardados tornaria a compra possível agora.']:[];
 const gp=a&&!a.owned?goalPurchase(s,source,ctx):null,dur=E.durationText||(h=>h+' h');
 if(gp&&gp.valid&&gp.buy&&gp.buy.state==='ok'&&gp.save&&gp.save.hours!==null){
  used.push('avancement');const dl=gp.delayHours;
  drivers.push({label:'Avanço rumo ao objetivo',factor:'avancement',text:dl>1e-9?'Com esta compra, você alcança seu objetivo depois de '+dur(gp.buy.hours)+' de jogo em vez de '+dur(gp.save.hours)+'.':dl<-1e-9?'Com esta compra, você alcança seu objetivo mais cedo: '+dur(gp.buy.hours)+' de jogo em vez de '+dur(gp.save.hours)+'.':'Esta compra não atrasa seu objetivo: '+dur(gp.save.hours)+' de jogo nos dois casos.'});
  if(gp.buy.strategy==='late'&&dl>1e-9)drivers.push({label:'Momento da compra',factor:s.model==='continuous'?'cout-usage':'gain-en-plus',text:s.model==='continuous'?'Para seu objetivo, o melhor é comprar logo antes de alcançá-lo: o custo de uso é maior do que o ganho a mais que a compra traz.':'Uma missão rende o mesmo com ou sem esta compra: comprar antes não faz você chegar mais cedo ao objetivo.'});
  if(dl>1e-9&&num(gp.extraThreshold)&&a.incomeMode!=='none')changes.push('A compra deixa de atrasar seu objetivo se fizer você ganhar pelo menos '+E.dollars(fmt(Math.ceil(gp.extraThreshold-1e-9)),' ')+' a mais por hora.');
 }else if(gp&&gp.valid&&gp.save&&gp.save.hours===null&&gp.buy&&gp.buy.state==='ok'){used.push('avancement');drivers.push({label:'Avanço rumo ao objetivo',factor:'avancement',text:gp.save.why==='income'?'Sem esta compra, o que você ganha não basta para alcançar seu objetivo; com ela você precisa de '+dur(gp.buy.hours)+' de jogo.':'A atividade que você escolheu exige esta compra: sem ela seu objetivo não é possível, com ela você precisa de '+dur(gp.buy.hours)+' de jogo.'});}
 else if(a&&!a.owned)excluded.avancement='Escreva seu objetivo e o que você ganha para saber se esta compra atrasa seu objetivo.';
 if(gp&&gp.valid&&gp.state.unknowns.includes('temps-partie'))missing.push({label:'Tempo da sua sessão',text:'Não escrito: o custo de uso por sessão não entra na conta do tempo para seu objetivo.',field:'f-goal-dailyMinutes',decisive:false});
 /* à la fin de chaque mission, le gain en plus n’entre pas encore dans le calcul (lot 2) : il n’est pas réclamé */
 if(gp&&gp.valid&&gp.buy&&!gp.extraKnown&&a.incomeMode!=='none'&&s.model==='continuous')missing.push({label:'Ganho a mais',text:'Não escrito: conto $ 0 a mais para seu objetivo, sem dizer que ele não rende nada.',field:'f-purchase-boostHourly',decisive:false});
 if(!V.usable(use.perSession)&&use.source==='unconfirmed')missing.push({label:'Custo de uso',text:'Ele pode mudar a resposta com o tempo; não está confirmado em GTA VI.',field:'f-purchase-usage',decisive:false});
 if(pc.state==='assumed')missing.push({label:'Dá para comprar em GTA VI',text:'Ainda não confirmado: a resposta supõe que sim.',decisive:true});
 const explain=M.explain({tool:'purchase',category:item?item.type:null,aim:'Saber se você pode pagar esta compra agora e quanto ela custa depois.',horizon:sessions===null?'Agora (nenhuma sessão contada depois da compra)':'Agora, e depois '+sessions+' sessões',conditions,used,excluded,values,drivers,missing,changes});
 return {tool:'purchase',asset:a,item,acquisition:acq,cash:cc,usage:use,cost,sustain:st,purchasable:pc,admission:adm,role,sessions,explain};
}
/* ----- Quel achat choisir ? ----- */
// Terrain : l’eau et l’air demandent un bateau ou un aéronef ; la route accepte le tout-terrain ; le tout-terrain d’un
// véhicule de route n’est pas documenté (« on ne peut pas dire »), jamais supposé.
/* v7.60 (langues) : le terrain s’affiche en mots (« sur l’eau »), jamais avec son code interne (route, tout-terrain, eau, air). */
const TERRAIN_TXT={route:'na estrada','tout-terrain':'fora de estrada',eau:'na água',air:'no ar'},terrainText=t=>TERRAIN_TXT[t]||t;
function terrainFits(need,have){const h=have.v;if(need==='eau'||need==='air')return h===need?'ok':'ko';if(need==='route')return h==='route'||h==='tout-terrain'?'ok':'ko';if(need==='tout-terrain')return h==='tout-terrain'?'ok':h==='route'?'unknown':'ko';return 'unknown';}
function needChecks(s,a,item){
 const need=s.analysis.need,checks=[];
 const cap=a&&a.capabilities||{};
 if(need.terrain){const have=cap.terrain?V.personal(cap.terrain):item&&item.type==='vehicle'?M.fromVehicle({cat:item.categoryId||item.category}).terrain:V.unknown();
  const state=have.v===null?'unknown':terrainFits(need.terrain,have);
  checks.push({id:'usage-compatible',label:'Terreno: '+terrainText(need.terrain),state,detail:state==='unknown'?(have.v==='route'&&need.terrain==='tout-terrain'?'Nada indica que ele anda em off-road: escreva isso nas capacidades dele, se você souber.':'Terreno desconhecido para esta compra: escreva nas capacidades dela.'):state==='ok'?'Serve ('+terrainText(have.v)+(have.s==='estimated'?', pelo tipo dele':'')+').':'Não serve: ele se move '+terrainText(have.v)+'.',fix:state==='ko'?{text:'Escolha um veículo que se mova '+terrainText(need.terrain)+'.'}:null});}
 if(num(need.passengers)&&need.passengers>0){const seats=num(cap.seats)?V.personal(cap.seats):item&&num(item.seats)?V.official(item.seats):V.unknown();checks.push({id:'usage-compatible',label:'Lugares: '+need.passengers,state:!V.usable(seats)?'unknown':seats.v>=need.passengers?'ok':'ko',detail:!V.usable(seats)?'Número de lugares desconhecido: escreva se você souber.':seats.v>=need.passengers?seats.v+' lugares.':'Só '+seats.v+' lugares.',fix:{text:'Escolha um veículo com pelo menos '+need.passengers+' lugares.'}});}
 if(need.cargo){const cargo=cap.cargo===null||cap.cargo===undefined?V.unknown():V.personal(cap.cargo);checks.push({id:'usage-compatible',label:'Carga',state:!V.usable(cargo)?'unknown':cargo.v>0?'ok':'ko',detail:!V.usable(cargo)?'Capacidade de carga desconhecida.':cargo.v>0?'Pode transportar carga.':'Não transporta nada.'});}
 return checks;
}
function compareAnalysis(s,source,ctx){
 const sessions=horizonSessions(s),rows=[],names=compareNames(s);
 s.compare.keys.forEach(k=>{const a=asset(s,k);if(!a)return;const item=itemOf(a,ctx),acq=totalAcq(a,item),use=usageOf(s,a,item),cost=M.usageCost({initial:acq.complete?V.personal(acq.value):V.unknown(),perSession:use.perSession},{sessions});
  const cc=cashFor(s,acq,a),pc=purchasableCheck(item,a),need=needChecks(s,a,item),conditions=[pc,...need].filter(Boolean),adm=M.admission(conditions);
  rows.push({key:k,name:names[k],asset:a,item,acquisition:acq,usage:use,cost,cash:cc,conditions,admission:adm,utility:a.utility,income:a.incomeMode==='personal'&&a.boostHourly>0?a.boostHourly:null});});
 /* Revue de conformité (v7.53) : un achat libre sans coût d’usage écrit est « sans objet » quand il est seul ; comparé à un
    achat qui a un coût d’usage, ce vide devient « non renseigné » (inconnu), sinon il gagnerait à tort sur la durée. */
 if(rows.some(r=>r.usage.source==='personal'||r.usage.source==='simulated'))for(const r of rows)if(r.usage.source==='na'){
  r.usage={perSession:V.blank(),lines:[],missing:['Custo de uso de “'+r.name+'” (não preenchido)'],note:'Custo de uso não preenchido: outra opção tem um. Escreva 0 se realmente não houver.',source:'blank'};
  r.cost=M.usageCost({initial:r.acquisition.complete?V.personal(r.acquisition.value):V.unknown(),perSession:r.usage.perSession},{sessions});}
 const admissible=rows.filter(r=>r.admission.state==='admissible'||r.admission.state==='conditionnel'||r.admission.state==='inconnu');
 const excluded=rows.filter(r=>r.admission.state==='impossible');
 const P=M.pareto(admissible.map(r=>({id:r.key,admission:{state:'admissible'},values:{now:r.acquisition.complete?r.acquisition.value:null,total:r.cost.total.complete&&sessions!==null&&V.usable(r.usage.perSession)?r.cost.total.value:null,envie:-(r.utility||0)}})),['now','total','envie']);
 // Point de bascule entre les deux options admissibles les moins chères à l’achat, si leurs coûts d’usage sont connus.
 let cross=null;const priced=admissible.filter(r=>r.acquisition.complete&&V.usable(r.usage.perSession)).sort((x,y)=>x.acquisition.value-y.acquisition.value);
 if(priced.length>=2){const A=priced[0],Bq=priced[1],x=M.crossover({initial:A.acquisition.value,rate:A.usage.perSession.v},{initial:Bq.acquisition.value,rate:Bq.usage.perSession.v});if(x.known&&x.n!==null)cross={a:A.name,b:Bq.name,n:x.n,before:x.before==='a'?A.name:Bq.name,after:x.after==='a'?A.name:Bq.name,costAt:x.costAt};}
 const partial=admissible.filter(r=>!r.acquisition.complete||(sessions!==null&&!r.cost.total.complete&&r.usage.source!=='na'));
 return {tool:'compare',rows,admissible,excluded,pareto:P,crossover:cross,partial,sessions};
}
/* ----- Quoi acheter d’abord ? ----- */
function orderAnalysis(s,source,ctx){
 const keys=s.order.keys.filter(k=>asset(s,k)),d=sessionMinutesOf(s),objective=OBJECTIVES.includes(s.order.objective)?s.order.objective:'all';
 const items=keys.map(k=>{const a=asset(s,k),item=itemOf(a,ctx),use=usageOf(s,a,item);let boost=a.owned?0:a.incomeMode==='personal'?a.boostHourly:0;if(a.incomeMode==='roi'){const r=roi(s,source);boost=s.roi.key===k&&['new','improve'].includes(roiMode(s))&&r.valid&&Number.isFinite(r.netHourly)?Math.max(0,r.netHourly):null;}
  const costHourly=V.usable(use.perSession)&&d?use.perSession.v*60/d:0;
  return {id:k,name:a.name+(a.owned?' (já obtido)':''),price:a.owned?0:a.price===null||a.extras===null||a.fees===null?null:a.price+a.extras+a.fees,boostHourly:a.owned?0:boost,costHourly:a.owned?0:costHourly,before:(a.requires||[]).filter(r=>keys.includes(r)),unlocks:a.unlocks||[],owned:a.owned,usage:use};});
 const unknown=items.filter(x=>x.price===null);
 /* v7.54 : un prérequis déclaré qui n’est plus dans le panier (ni déjà possédé) bloque l’ordre avec la raison, au lieu de disparaître en silence (revue v7.53, écart I1). */
 const unmet=[];keys.forEach(k=>{const a=asset(s,k);(a.requires||[]).forEach(r=>{if(keys.includes(r))return;const dep=asset(s,r);if(dep&&dep.owned)return;unmet.push({id:k,name:a.name,requires:r,requiresName:dep?dep.name:'uma compra removida'});});});
 if(unmet.length)return {tool:'order',valid:false,reason:unmet.map(u=>'“'+u.name+'” precisa antes de “'+u.requiresName+'”, que não está mais no carrinho').join('; ')+'. Coloque a compra de volta no carrinho, marque como “já tenho” ou remova a dependência (Editar).',items,objective,unmet};
 const graph={};items.forEach(x=>{graph[x.id]={id:x.id,name:x.name,requires:x.before,price:x.price===null?V.unknown():V.personal(x.price)};});
 const deps=M.prerequisites({nodes:graph,targets:items.map(x=>x.id)});
 if(deps.cycles.length)return {tool:'order',valid:false,reason:deps.reason,items,deps,objective};
 if(unknown.length)return {tool:'order',valid:false,incomplete:true,reason:'Percurso a completar: escreva o preço de '+unknown.map(x=>'“'+x.name+'”').join(', ')+' (nem que seja o preço que você imagina).',items,deps,objective,unknown};
 /* v7.53 : chaque ordre n’est simulé qu’une fois, même quand trois objectifs le comparent (mémoire locale à ce calcul, donc
    toujours à jour avec les dernières saisies). */
 const memo=new Map(),run=order=>{const k=order.join('\u0001');if(!memo.has(k))memo.set(k,runOnce(order));return memo.get(k);};
 const runOnce=order=>{const r=E.order({capital:s.goal.capital,reserve:s.goal.reserve,hourly:orderHourly(s)/* lot 2 (C11) : une seule source, le gain net (jamais négatif) */,deferLosses:true/* lot 3 */,items:order.map(id=>items.find(x=>x.id===id))});
  if(!r.valid)return {valid:false,reason:r.blockedIndex!==undefined&&upkeepEats(s)?UPKEEP_EATS:r.reason,key:[Infinity]};
  let firstIncome=null;r.steps.forEach((st,i)=>{const it=items.find(x=>x.id===order[i]);if(firstIncome===null&&it.boostHourly>0)firstIncome=st.timeHours;});
  const low=r.steps.reduce((m,st)=>Math.min(m,st.capital),s.goal.capital);
  const out={valid:true,result:r,firstIncome,low};out.key=orderKey(objective,out);return out;};
 const pack=(order,run)=>({order,run,result:run.valid?run.result:null,valid:run.valid,reason:run.valid?null:run.reason});
 const given=pack(keys,run(keys));
 /* lot 3 (§ 9, branche sans achat) : ne rien acheter en route, puis tout payer d’un coup quand l’argent est là. Jamais plus rapide
    qu’un ordre (un achat payé ne fait jamais baisser le gain grâce à deferLosses) : il montre ce que l’ordre fait gagner. */
 const noBuy=keys.length<2?null:(()=>{const it=items.map(x=>x);const r=E.order({capital:s.goal.capital,reserve:s.goal.reserve,hourly:orderHourly(s),items:[{name:it.map(x=>x.name).join(' + '),price:it.reduce((t,x)=>t+x.price,0),boostHourly:it.reduce((t,x)=>t+(x.boostHourly||0),0),costHourly:it.reduce((t,x)=>t+(x.costHourly||0),0)}]});
  if(!r.valid)return {label:'Nada até o fim, depois tudo de uma vez',order:null,valid:false,reason:r.reason,result:null,run:null};
  const runR={valid:true,result:r,firstIncome:it.some(x=>x.boostHourly>0)?r.steps[0].timeHours:null,low:Math.min(s.goal.capital,r.steps[0].capital)};
  return {label:'Nada até o fim, depois tudo de uma vez',order:null,valid:true,reason:null,result:r,run:runR};})();
 /* v7.54 : les deux ordres « à la main » de la v7.47 (inverse, prix croissants) sont toujours calculés et montrés à côté de l’ordre proposé. */
 const manual=keys.length<2?[]:[{label:'Inverso',order:keys.slice().reverse()},{label:'Preço, do menor para o maior',order:keys.slice().sort((a,b)=>((items.find(x=>x.id===a)||{}).price??1e12)-((items.find(x=>x.id===b)||{}).price??1e12))}].map(m=>({label:m.label,...pack(m.order,run(m.order))}));
 if(objective==='given'||keys.length<2)return {tool:'order',valid:given.valid,reason:given.reason,items,deps,objective,best:given,given,manual,noBuy,flip:null,search:{method:'given',explored:1,note:'Sua ordem, do jeito que está.'},alternatives:[]};
 const search=M.sequences(items.map(x=>({id:x.id,before:x.before})),run);
 if(!search.best)return {tool:'order',valid:false,reason:(search.invalid[0]&&search.invalid[0].result.reason)||'Nenhuma ordem possível com esses números.',items,deps,objective,given,manual,noBuy,flip:null,search:{method:search.method,explored:search.explored,note:search.note},alternatives:[]};
 const best=pack(search.best.order,search.best.result);
 // Une autre séquence utile : la meilleure pour un autre objectif, si elle diffère (pour montrer le compromis).
 const alternatives=[];
 for(const other of OBJECTIVES.filter(o=>o!=='given'&&o!==objective)){const alt=bestFor(other,items,run);if(alt&&alt.order.join()!==best.order.join()&&!alternatives.some(x=>x.order.join()===alt.order.join()))alternatives.push({objective:other,...pack(alt.order,alt.run)});}
 return {tool:'order',valid:true,items,deps,objective,best,given,manual,noBuy,flip:objective==='all'?orderFlip(s,items,best.order):null,search:{method:search.method,explored:search.explored,note:search.note},alternatives};
}
/* lot 3 (§ 8, conditions qui inversent l’ordre) : pour « tout avoir au plus vite », prix du premier achat de l’ordre proposé à partir
   duquel acheter le deuxième avant lui deviendrait plus rapide (le reste de l’ordre identique). Seuil trouvé par dichotomie sur le
   même moteur (au dollar près), puis vérifié au-dessus (X + 1, ×1,5, ×3, ×10) : rien n’est dit si le basculement n’est pas net. */
function orderFlip(s,items,order){
 if(order.length<2)return null;const A=items.find(x=>x.id===order[0]),Bi=items.find(x=>x.id===order[1]);if(!A||!Bi||Bi.before.includes(A.id))return null;
 const swapped=[order[1],order[0]].concat(order.slice(2)),T=(ord,p)=>{const r=E.order({capital:s.goal.capital,reserve:s.goal.reserve,hourly:orderHourly(s),deferLosses:true,items:ord.map(id=>{const x=items.find(y=>y.id===id);return id===A.id?{...x,price:p}:x;})});return r.valid?r.totalHours:Infinity;};
 const f=p=>T(swapped,p)<T(order,p)-1e-9;
 if(f(A.price)||T(order,A.price)===Infinity)return null;
 let lo=A.price,hi=null;for(let p=Math.max(1000,A.price*2),k=0;k<40&&p<=1e12;k+=1,p*=2){if(f(p)){hi=p;break;}lo=p;}
 if(hi===null)return null;
 for(let k=0;k<60&&hi-lo>0.5;k+=1){const mid=(lo+hi)/2;if(f(mid))hi=mid;else lo=mid;}
 const X=Math.round(hi);if(![X+1,X*1.5,X*3,X*10].every(f))return null; // « plus de X $ » : vrai dès le dollar suivant, vérifié plus haut
 return {first:A.id,second:Bi.id,firstName:A.name,secondName:Bi.name,price:X};
}
function orderKey(objective,r){return objective==='income'?[r.firstIncome===null?Infinity:r.firstIncome,r.result.totalHours]:objective==='reserve'?[-r.low,r.result.totalHours]:[r.result.totalHours,-(r.result.finalHourly||0)];}
function bestFor(objective,items,runBase){const sr=M.sequences(items.map(x=>({id:x.id,before:x.before})),order=>{const r=runBase(order);return r.valid?{...r,key:orderKey(objective,r)}:r;});return sr.best?{order:sr.best.order,run:sr.best.result}:null;}
/* ----- Mon budget ----- */
function budgetAnalysis(s,source,ctx){
 const basket=s.budget.source==='basket';
 const rows=basket?s.order.keys.map(k=>{const a=asset(s,k);if(!a)return null;const item=itemOf(a,ctx),acq=totalAcq(a,item),use=usageOf(s,a,item);return {label:a.name,value:acq.complete?(a.owned?V.personal(0):V.personal(acq.value)):V.blank(),usage:use,owned:a.owned,field:null,item};}).filter(Boolean):s.budget.allocations.map((v,i)=>({label:['Veículos','Investimentos','Equipamento','Consumíveis','Outras compras'][i],value:V.personal(v),usage:null}));
 rows.push({label:'Outros gastos previstos',value:V.personal(s.budget.extra||0),usage:null});
 const spend=M.total(rows.map(r=>({label:r.label,value:r.value})));
 /* v7.54 : un coût d’usage « non confirmé » (véhicule du site, rien d’écrit) n’est ni compté ni passé sous silence : le total par
    partie est incomplet et nomme l’achat, comme dans « Quel achat choisir ? » (revue v7.53, écart I4). */
 const usageRows=rows.filter(r=>r.usage&&!r.owned),unconfirmedUsage=usageRows.filter(r=>r.usage.perSession&&r.usage.perSession.s==='unconfirmed').map(r=>r.label);
 const perSession=M.total(usageRows.map(r=>({label:'Uso de '+r.label,value:r.usage.perSession})).filter(p=>p.value.s!=='unconfirmed'));
 if(unconfirmedUsage.length)perSession.complete=false;perSession.unconfirmed=unconfirmedUsage;
 const sessions=horizonSessions(s),d=sessionMinutesOf(s),earn=num(s.goal.hourly)&&d?s.goal.hourly*d/60:null;
 /* lot 2 (C11) : les dépenses par partie de Mon objectif sortent du flux à chaque partie, comme le coût d’usage des achats. */
 const up=num(s.goal.upkeepPerSession)&&s.goal.upkeepPerSession>0?s.goal.upkeepPerSession:0;
 let flow=null;
 if(sessions!==null&&num(s.goal.capital)){const events=[{t:0,type:'spend',amount:spend.value,label:'Compras (subtotal conhecido)'}];for(let i=1;i<=Math.min(sessions,400);i+=1){if(earn!==null)events.push({t:i,type:'receive',amount:earn,label:'Ganho da sessão '+i});if(up>0)events.push({t:i,type:'spend',amount:up,label:'Gastos por sessão (sessão {i})'.replace('{i}',i)});if(perSession.value>0)events.push({t:i,type:'spend',amount:perSession.value,label:'Uso (sessão '+i+')'});}flow={sessions,earn,upkeep:up,usage:perSession.value,usageComplete:perSession.complete,ledger:M.ledger(s.goal.capital,events,s.goal.reserve||0)};}
 return {tool:'budget',spend,perSession,flow,rows,sessions};
}
/* ----- Mon objectif ----- */
function goalTarget(s){const g=s.goal;if(g.target===null)return null;let t=g.target;const meaning=['held','available','cumulative'].includes(g.meaning)?g.meaning:'available';
 if(meaning==='held')t=Math.max(0,t-(g.reserve||0));else if(meaning==='cumulative')t=t+Math.max(0,(g.capital||0)-(g.reserve||0));
 if(num(g.plannedSpend)&&g.plannedSpend>0)t+=g.plannedSpend;return t;}
function goalAnalysis(s,source,ctx,r){
 const g=s.goal,meaning=['held','available','cumulative'].includes(g.meaning)?g.meaning:'available',d=sessionMinutesOf(s);
 let deadline=null;
 if(num(g.deadlineDays)&&g.deadlineDays>0&&r&&r.valid){const days=r.days;if(days===null||days===undefined){deadline={known:false,reason:'Escreva seu tempo de jogo por dia para ter um prazo em dias.'};}
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
 activities(s,source).forEach(a=>{const reasons=[];if(a.players>s.goal.players)reasons.push('é para '+a.players+' jogadores, vocês são '+s.goal.players);const miss=(a.requiresPurchaseIds||[]).filter(id=>!s.assets.some(x=>x.itemId===id&&x.owned));if(miss.length)reasons.push('antes é preciso '+miss.map(id=>(ctx&&ctx.catalogue&&ctx.catalogue.find(c=>c.id===id)?.name)||id).join(', '));
  const one=E.activity(a);if(!one.valid){rank.push({id:a.id,name:a.name,valid:false,reason:one.reason,excluded:reasons});return;}
  const r=num(minutes)?E.inverse({minutes,capital:s.goal.capital,reserve:s.goal.reserve,activity:a}):null;
  let fail=null;const k=failureShare(s);if(k!==null&&r&&r.valid&&r.runs){const reward=(a.reward||0)*(a.share??100)/100,cost=a.cost||0,okRuns=Math.round(r.runs*(1-k)),badRuns=r.runs-okRuns;fail={share:k,okRuns,badRuns,profit:okRuns*reward-r.runs*cost-(a.investment&&!a.owned?a.investment:0)};}
  rank.push({id:a.id,name:a.name,valid:true,hourly:one.hourly,net:one.net,cycle:one.cycleMinutes,profit:r&&r.valid?r.profit:null,runs:r&&r.valid?r.runs:null,reason:r&&!r.valid?r.reason:null,excluded:reasons,fail});});
 const ok=rank.filter(x=>x.valid&&!x.excluded.length&&x.profit!==null);ok.sort((x,y)=>y.profit-x.profit||y.hourly-x.hourly);
 /* lot 3 (§ 9) : des combinaisons compatibles plutôt qu’un taux isolé : le meilleur enchaînement des activités possibles dans le même
    temps (moteur de Mon temps de jeu, sans limite de répétition comme ici), gardé seulement s’il bat la meilleure activité seule. */
 let mix=null;if(ok.length>1&&num(minutes)&&minutes>0){const acts=activities(s,source).filter(a=>ok.some(o=>o.id===a.id)),sp=E.sessionPlan({capital:s.goal.capital,reserve:s.goal.reserve,minutes,maxRepeat:256,activities:acts});
  if(sp.valid&&sp.runs&&sp.profit>ok[0].profit+0.5){const parts=(sp.breakdown||[]).filter(b=>b.runs>0);if(parts.length>1)mix={profit:sp.profit,gain:sp.profit-ok[0].profit,parts:parts.map(b=>({id:b.id,name:b.name,runs:b.runs})),exhaustive:sp.exhaustive===true};}}
 return {tool:'activities',rank,accessible:ok,excludedList:rank.filter(x=>x.excluded.length),best:ok[0]||null,mix,failureShare:failureShare(s)};
}
/* ----- Mon temps de jeu ----- */
function sessionAnalysis(s,source,ctx){
 const out=[];activities(s,source).forEach(a=>{const reasons=[];if(!s.session.enabled.includes(a.id))reasons.push('não marcada');if(a.players>s.goal.players)reasons.push('é para '+a.players+' jogadores');const miss=(a.requiresPurchaseIds||[]).filter(id=>!s.assets.some(x=>x.itemId===id&&x.owned));if(miss.length)reasons.push('compra faltando');const one=E.activity(a);if(!one.valid)reasons.push('números a completar');else{if(num(s.session.minutes)&&one.activeMinutes>s.session.minutes)reasons.push('não cabe em '+s.session.minutes+' min');if(one.net<=0)reasons.push('não rende mais do que seus gastos');}out.push({id:a.id,name:a.name,reasons});});
 return {tool:'session',activities:out,excluded:out.filter(x=>x.reasons.length),kept:out.filter(x=>!x.reasons.length)};
}
/* ----- Ça vaut le coup ? ----- */
function roiAnalysis(s,source,ctx){
 const a=asset(s,s.roi.key),item=itemOf(a,ctx),acq=totalAcq(a,item),cc=cashFor(s,acq,a),use=usageOf(s,a,item),d=sessionMinutesOf(s);
 const hoursH=num(s.roi.hours)?s.roi.hours:null,sessions=hoursH!==null&&d?Math.ceil(hoursH*60/d-1e-9):null;
 const cost=M.usageCost({initial:acq.complete?V.personal(acq.value):V.unknown(),perSession:use.perSession,resale:resaleOf(s,a)},{sessions});
 const usagePerHour=V.usable(use.perSession)&&d?use.perSession.v*60/d:null;
 const pc=purchasableCheck(item,a),conditions=[cashCond(cc,'Pagar agora'),pc].filter(Boolean),adm=M.admission(conditions);
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
const MEANING={held:'o dinheiro que você terá no total (incluindo o dinheiro guardado)',available:'o dinheiro disponível além do que você deixa guardado',cumulative:'o dinheiro ganho a partir de agora, sem contar o que você já tem'};
function vPers(v){return v===null||v===undefined?V.blank():V.personal(v);}
/* v7.54 : le libellé de ce qui bloque dit de quoi il s’agit (plus de « Un chiffre » générique) : « Parcours à compléter », « Blocage », « À écrire » ou « À corriger ». */
/* v7.91 (portugais) : sur une page portugaise, les mots portugais seulement : « Percurso a completar », « Escreva… / Diga… / Escolha… /
   Adicione… / Anote… », « exige », « bloqueada », « impossível », « Nenhum plano », « não rende »… */
function missingLabel(reason){const t=String(reason||''),pt=E.lang==='pt';if(pt?/Percurso a completar/.test(t):/Parcours à compléter|Path to complete|Recorrido por completar|Percorso da completare|Weg vervollständigen/.test(t))return 'Percurso a completar';if(pt?/^(Escreva|Diga|Escolha|Adicione|Anote)/.test(t):/^(Écris|Dis|Choisis|Ajoute|Note|Enter|Write|Tell|Choose|Pick|Add|Escribe|Dime|Dinos|Elige|Añade|Anota|Indica|Scrivi|Dimmi|Dicci|Scegli|Aggiungi|Annota|Gib|Sag|Wähle|Füge|Notiere|Trag)/.test(t))return 'A escrever';if(pt?/exige|\bpedem?\b|precisa antes|bloque|imposs[íi]vel|nenhum plano|nenhuma miss[ãa]o|n[ãa]o rende|s[óo] rende|n[ãa]o d[áa] dinheiro|n[ãa]o gera|requer/i.test(t):/demande|bloqu|impossible|Aucun plan|aucune mission|ne rapporte|requires|needs|block|no plan|no mission|earns nothing|pide|bloque|imposible|ning[úu]n plan|ninguna misi[óo]n|no rinde|no da dinero|no genera|requiere|necesita|richiede|blocc|impossibil|nessun piano|nessuna missione|non rende/i.test(t))return 'Bloqueio';return 'A corrigir';}
function explainGoal(s,source,r,x){
 const g=s.goal,cycles=s.model==='cycles',used=['argent-disponible','reserve','gain-net','avancement'],excluded={},values=[],drivers=[],missing=[],changes=[],conditions=[];
 values.push({label:'Já tenho',value:vPers(g.capital),unit:'$',field:'f-goal-capital'},{label:'Quero ter',value:vPers(g.target),unit:'$',field:'f-goal-target',text:'Isso é '+MEANING[x.meaning]+'.'},{label:'Guardado',value:vPers(g.reserve),unit:'$',field:'f-goal-reserve'});
 if(num(g.plannedSpend)&&g.plannedSpend>0)values.push({label:'Gastos previstos antes da meta',value:V.personal(g.plannedSpend),unit:'$',field:'f-goal-plannedSpend'});
 if(!cycles){values.push({label:'Ganho por hora',value:vPers(g.hourly),unit:'$/h',field:'f-goal-hourly'});excluded.joueurs='No modo “aos poucos”, não há missões em grupo.';excluded['temps-actif']='Sem missões no modo “aos poucos”: seu ganho por hora já conta tudo.';excluded.attente='Sem espera entre missões no modo “aos poucos”.';excluded.versement='No modo “aos poucos”, o dinheiro chega conforme você joga; mude para “no fim de cada missão” para contar as recompensas inteiras.';}
 else{used.push('joueurs','temps-actif','attente','versement');conditions.push({id:'joueurs',label:'Jogadores: '+g.players,state:r.valid||!/joueurs|players|jugadores|giocatori|jogadores/.test(r.reason||'') /* v7.91 (portugais) : « jogadores » */?'ok':'ko',detail:r.valid?'A atividade é para o seu número de jogadores.':r.reason});}
 if(num(g.dailyMinutes)){used.push('temps-partie','horizon');values.push({label:'Jogo todo dia',value:V.personal(g.dailyMinutes),unit:'min',field:'f-goal-dailyMinutes'});if(cycles)conditions.push({id:'temps-partie',label:'Uma missão cabe na sua sessão',state:r.valid||!/temps de jeu par jour|play time per day|tiempo de juego por d[íi]a|tempo di gioco al giorno|tempo de jogo por dia/.test(r.reason||'') /* v7.91 (portugais) */?'ok':'ko',detail:r.valid?'Cada missão, preparação incluída, cabe em '+g.dailyMinutes+' min.':r.reason,fix:{text:'Jogue por mais tempo a cada dia ou escolha uma missão mais curta.'}});}
 else{excluded['temps-partie']='Tempo de jogo por dia não anotado: mostramos o tempo de jogo, não o número de dias.';excluded.horizon='Sem tempo por dia, não há calendário.';}
 if(num(g.upkeepPerSession)&&g.upkeepPerSession>0){used.push('cout-usage');values.push({label:'Gastos por sessão',value:V.personal(g.upkeepPerSession),unit:'$/partie',field:'f-goal-upkeepPerSession'});drivers.push({label:'Gastos por sessão',text:cycles?'Elas somam '+E.dollars(fmt(r.upkeepTotal),' ')+' a ganhar em todo o percurso.':'Elas baixam seu ganho para '+E.dollars(fmt(r.hourly),' ')+' por hora.',factor:'cout-usage'});}
 else excluded['cout-usage']=cycles?'Os gastos de cada missão já estão no ganho líquido dela; nenhum outro gasto por sessão anotado.':'Nenhum gasto por sessão anotado (consumíveis, munição…).';
 if(r.valid){drivers.unshift({label:'O que falta',text:E.dollars(fmt(r.missing),' ')+' a ganhar'+(cycles?' com missões inteiras, gastos pagos antes e recompensa no fim':' no ritmo de '+E.dollars(fmt(r.hourly),' ')+' por hora')+'.',factor:'gain-net'});
  /* v7.54 : « tentatives ratées » (mode Expert) chiffré aussi pour l’objectif par missions : la part ratée paie ses frais sans récompense, donc plus de missions (revue v7.53, écart I6). */
  {const k=failureShare(s);if(k!==null&&cycles){used.push('scenario-echec');const a=activities(s,source).find(z=>z.id===g.selected);if(a&&r.runs&&(a.reward||0)>0){const reward=(a.reward||0)*(a.share??100)/100,cost=a.cost||0,netOk=reward-cost,perAttempt=(1-k)*reward-cost;drivers.push({label:'Se algumas tentativas falharem',text:perAttempt>0?'Com '+Math.round(k*10)+' tentativas fracassadas a cada 10, você precisaria de cerca de '+Math.ceil(r.runs*netOk/perAttempt)+' tentativas em vez de '+r.runs+' (gastos pagos toda vez, recompensa só quando dá certo).':'Com '+Math.round(k*10)+' tentativas fracassadas a cada 10, esta missão não rende mais nada: o objetivo não dá para alcançar assim.',factor:'scenario-echec'});}}
   else if(k!==null)excluded['scenario-echec']='No modo “aos poucos”, não existe tentativa que possa falhar: baixe seu ganho por hora se quiser ser prudente.';
   else excluded['scenario-echec']='O cálculo supõe que cada tentativa dá certo; adicione um cenário de tentativas fracassadas no modo Avançado se quiser ser prudente.';}
  if(x.deadline&&x.deadline.known){if(x.deadline.feasible)drivers.push({label:'Prazo',text:'Viável: '+x.deadline.days+' dias de '+g.deadlineDays+'.'});else{drivers.push({label:'Prazo',text:'Inviável nesse ritmo: '+x.deadline.days+' dias em vez de '+g.deadlineDays+'.'});if(x.deadline.requiredDailyMinutes)changes.push('Jogar '+x.deadline.requiredDailyMinutes+' min por dia cumpriria o prazo.');if(x.deadline.requiredHourly)changes.push('Ganhar '+E.dollars(fmt(x.deadline.requiredHourly),' ')+' por hora cumpriria o prazo.');}}}
 else missing.push({label:missingLabel(r.reason),text:r.reason,decisive:true});
 if(!cycles&&num(g.hourly))changes.push('O tempo muda em proporção ao seu ganho por hora: 20% a mais, 17% de tempo a menos.');
 return M.explain({tool:'goal',aim:'O tempo de jogo para ter '+MEANING[x.meaning]+'.',horizon:num(g.dailyMinutes)?'Até a meta, em sessões de '+g.dailyMinutes+' min por dia':'Até a meta (sem calendário)',conditions,used,excluded,values,drivers,missing,changes});
}
function explainSession(s,source,r,x){
 const used=['argent-disponible','reserve','possession-requise','joueurs','temps-partie','ressource-exclusive','gain-net','temps-actif','attente','versement','variete'],excluded={'cout-usage':'Os gastos de cada missão são pagos antes dela; nenhum outro gasto por sessão neste cálculo.'};
 const conditions=x.activities.map(a=>({id:'possession-requise',label:a.name,state:a.reasons.length?'ko':'ok',detail:a.reasons.length?'Descartada: '+a.reasons.join(', ')+'.':'Possível na sua sessão.'}));
 const drivers=[];if(r.valid){drivers.push({label:'Cronograma',text:r.runs+(E.plural(r.runs)?' missões':' missão')+', '+E.dollars(fmt(r.profit),' ')+' ganhos em '+r.totalMinutes+' min; cada recompensa chega no fim da sua missão.'});if(r.limited)drivers.push({label:'Busca limitada',text:'Melhor cronograma encontrado entre os testados: pode existir um melhor.'});
  /* lot 3 : sans limite atteinte, le moteur compare toutes les suites de missions qui tiennent dans la partie (r.exhaustive, prouvé par T3-07).
     Lot 5 (relecture, L1) : ce n’est plus écrit à l’écran, car la note existante de Mon temps de jeu dit « Il en existe peut-être un encore
     meilleur » et ne peut pas changer ; les deux phrases se contredisaient. La garantie est dans le rapport du lot 3. */}
 /* v7.54 : le scénario « tentatives ratées » (mode Expert) est chiffré ici aussi, comme dans Mes activités : frais payés, récompense perdue sur la part ratée (revue v7.53, écart I6). */
 const k=failureShare(s);if(k!==null){used.push('scenario-echec');if(r.valid&&r.runs){const acts=activities(s,source),gross=(r.timeline||[]).reduce((sum,st)=>{const a=acts.find(z=>z.id===st.id);return sum+(a?(a.reward||0)*(a.share??100)/100:0);},0);drivers.push({label:'Se algumas tentativas falharem',text:'Com '+Math.round(k*10)+' tentativas fracassadas a cada 10: cerca de '+E.dollars(fmt(Math.round(r.profit-k*gross)),' ')+' em vez de '+E.dollars(fmt(r.profit),' ')+' (gastos pagos, sem recompensa).',factor:'scenario-echec'});}}
 else excluded['scenario-echec']='O cálculo supõe que cada missão dá certo; adicione um cenário de tentativas fracassadas no modo Avançado se quiser ser prudente.';
 const values=[{label:'Tempo da sessão',value:vPers(s.session.minutes),unit:'min',field:'f-session-minutes'},{label:'Jogadores',value:vPers(s.goal.players),unit:'jogadores',field:'session-players'},{label:'Já tenho',value:vPers(s.goal.capital),unit:'$',field:'session-capital'},{label:'Guardado',value:vPers(s.goal.reserve),unit:'$',field:'session-reserve'}];
 /* lot 2 (C11) : les dépenses par partie de Mon objectif sont retirées de la partie faite et des suivantes (parties qu’il reste), et c’est dit. */
 const up=num(s.goal.upkeepPerSession)&&s.goal.upkeepPerSession>0?s.goal.upkeepPerSession:0;
 if(up>0){used.push('cout-usage');delete excluded['cout-usage'];values.push({label:'Gastos por sessão',value:V.personal(up),unit:'$/partie',field:'f-goal-upkeepPerSession'});const pr=r.valid?projection(s,source,r):null,eats=!!(pr&&pr.valid&&pr.missingAfter>0&&pr.sessionsLeft===null&&!pr.calendarReason);
  drivers.push({label:'Gastos por sessão',text:eats?'Seus gastos por sessão ('+E.dollars(fmt(up))+') comem o que uma sessão rende: este programa sozinho não basta para seu objetivo.':E.dollars(fmt(up))+' descontados no fim de cada sessão para contar quantas sessões ainda restam.'});}
 return M.explain({tool:'session',aim:'Ganhar o máximo de dinheiro durante a sua sessão.',horizon:'Uma sessão de '+(s.session.minutes??'?')+' min',conditions,used,excluded,values,drivers,missing:r.valid?[]:[{label:'Um número',text:r.reason,decisive:true}],changes:x.excluded.filter(a=>a.reasons.includes('não marcada')).length?['Marcar outras atividades pode mudar o cronograma.']:[]});
}
function explainActivities(s,source,r,x){
 /* lot 2 (C11.6) : aucun chiffre ne change ici ; des dépenses par partie écrites sont nommées avec la raison (temps non compté en parties, mêmes pour chaque activité). */
 const upA=num(s.goal.upkeepPerSession)&&s.goal.upkeepPerSession>0?s.goal.upkeepPerSession:0;
 const sel=x.rank.find(a=>a.id===s.inverse.selected),used=['argent-disponible','reserve','possession-requise','joueurs','temps-partie','gain-net','temps-actif','attente','versement'],excluded={'cout-usage':upA>0?'Seus gastos por sessão ('+E.dollars(fmt(upA))+') não são descontados aqui: esse tempo não é contado em sessões, e seriam os mesmos para toda atividade. Meu objetivo e Meu plano de negócios os descontam.':'Os gastos de cada missão já estão no ganho líquido dela.'};
 if(ammoPerAttempt(s))used.push('mecanique-simulee');else excluded['mecanique-simulee']='Nenhuma munição simulada: só contam os gastos que você anotou.';
 if(x.failureShare!==null)used.push('scenario-echec');else excluded['scenario-echec']='O cálculo supõe que cada tentativa dá certo; adicione um cenário de tentativas fracassadas no modo Avançado se quiser ser prudente.';
 const drivers=[];if(x.best)drivers.push({label:'Ranking',text:(x.best.id===s.inverse.selected?'É a atividade que mais rende em {m} min: {g}.':'“{nom}” rende mais em {m} min: {g}.').replace('{nom}',x.best.name).replace('{m}',s.inverse.minutes??'?').replace('{g}',E.dollars(fmt(x.best.profit),' '))});
 if(x.mix)drivers.push({label:'Combinando-as',text:'Encadeando '+x.mix.parts.map(p=>'“'+p.name+'” ×'+p.runs).join(', ')+' em suas '+(s.inverse.minutes??'?')+' min: '+E.dollars(fmt(x.mix.profit),' ')+', ou seja, '+E.dollars(fmt(x.mix.gain),' ')+' a mais do que “'+x.best.name+'” sozinha.'+(x.mix.exhaustive?' Todas as sequências possíveis foram comparadas.':' Melhor sequência encontrada entre as testadas: pode existir uma melhor.')});
 if(sel&&sel.fail)drivers.push({label:'Se algumas tentativas falharem',text:'Com '+Math.round(sel.fail.share*10)+' tentativas fracassadas a cada 10: '+E.dollars(fmt(sel.fail.profit),' ')+' em vez de '+E.dollars(fmt(sel.profit),' ')+' (gastos pagos, sem recompensa).',factor:'scenario-echec'});
 return M.explain({tool:'activities',aim:'O que o seu tempo rende com uma atividade, comparado com as outras atividades possíveis.',horizon:(s.inverse.minutes??'?')+' min de jogo',conditions:x.rank.map(a=>({id:'possession-requise',label:a.name,state:!a.valid?'unknown':a.excluded.length?'ko':'ok',detail:!a.valid?a.reason:a.excluded.length?a.excluded.join(', '):'Possível.'})),used,excluded,values:[{label:'Tempo',value:vPers(s.inverse.minutes),unit:'min',field:'f-inverse-minutes'},{label:'Jogadores',value:vPers(s.goal.players),unit:'jogadores',field:'activity-players'}],drivers,missing:r.valid?[]:[{label:'Um número',text:r.reason,decisive:true}]});
}
function explainBudget(s,source,r,x){
 const used=['argent-disponible','reserve','cout-acquisition','argent-restant'],excluded={'effet-soin':x.rows.some(row=>row.item&&row.item.type==='consumable')?'O orçamento conta o dinheiro; o efeito dos consumíveis não tem números em GTA VI.':'Não se aplica: nenhum consumível nesses gastos.'},drivers=[],missing=[];
 if(x.flow){used.push('cout-usage','cout-complet','frequence','horizon');drivers.push({label:'Ao longo do tempo',text:x.flow.ledger.reserveBreach?'Você ficaria abaixo do dinheiro guardado na sessão '+x.flow.ledger.reserveBreach.at+'.':'Em '+x.flow.sessions+' sessões, seu dinheiro fica acima do que você deixa guardado (no ponto mais baixo: '+E.dollars(fmt(x.flow.ledger.low.value),' ')+').'});
  /* lot 2 (C11) : les dépenses par partie de Mon objectif sortent du flux à chaque partie, et c’est dit */
  if(x.flow.upkeep>0)drivers.push({label:'Gastos por sessão',text:E.dollars(fmt(x.flow.upkeep))+' descontados de cada sessão, como em Meu objetivo.'});}
 else{excluded['cout-usage']='Escreva em quantas sessões você pretende contar (modo Avançado) para ver os gastos ao longo do tempo.';excluded['cout-complet']='Nenhum período anotado.';excluded.frequence='Nenhum número de sessões anotado.';excluded.horizon='Nenhum período anotado: só “agora” é calculado.';}
 if(x.rows.some(row=>row.usage&&row.usage.source==='simulated'))used.push('mecanique-simulee');else excluded['mecanique-simulee']='Nenhuma mecânica simulada nas suas compras.';
 if(!x.spend.complete)missing.push({label:x.spend.missing.map(m=>m.label).join(', '),text:'Preço ainda não anotado: o valor restante mostrado é um máximo.',decisive:true});
 if(x.perSession&&x.perSession.unconfirmed&&x.perSession.unconfirmed.length)missing.push({label:'Custo de uso de '+x.perSession.unconfirmed.map(n=>'“'+n+'”').join(', '),text:'Não confirmado em GTA VI, não contado: escreva o seu, se houver.',decisive:!!x.flow});
 return M.explain({tool:'budget',aim:'Saber quanto sobra depois dos seus gastos, sem mexer no dinheiro guardado.',horizon:x.flow?'Agora, e depois '+x.flow.sessions+' sessões':'Agora',conditions:[{id:'argent-disponible',label:'Gastos possíveis agora',state:!r.valid?'unknown':r.overBudget?'ko':x.spend.complete?'ok':'unknown',detail:r.valid?(r.overBudget?'Seus gastos e o dinheiro guardado passam do que você tem.':'Tudo cabe.'):r.reason}],used,excluded,values:x.rows.map(row=>({label:row.label,value:row.value,unit:'$'})).concat([{label:'Já tenho',value:vPers(s.goal.capital),unit:'$',field:'budget-capital'},{label:'Guardado',value:vPers(s.goal.reserve),unit:'$',field:'budget-reserve'}]),drivers,missing});
}
function explainOrder(s,source,r,x){
 const used=['argent-disponible','reserve','cout-acquisition','gain-en-plus','delai-recuperation','argent-restant','priorite'],excluded={'usage-compatible':'A ordem não verifica nenhuma necessidade de uso: compare as opções em “Qual compra escolher?”.',envie:'A ordem é decidida pelo tempo e pelo dinheiro; sua vontade conta em “Qual compra escolher?”.'};
 if(x.items.some(i=>i.before.length))used.push('possession-requise');else excluded['possession-requise']='Nenhuma das suas compras exige outra antes dela.';
 const conds=[];x.items.forEach(i=>{const a=asset(s,i.id);if(a&&a.itemId)conds.push({id:'achetable',label:i.name,state:'assumed',detail:'Compra a confirmar em GTA VI.'});});
 if(conds.length)used.push('achetable');else excluded.achetable='Compras livres: quem diz que dá para comprar é você.';
 const OBJ={all:'ter tudo o mais rápido possível',income:'ter o quanto antes uma compra que dê dinheiro',reserve:'manter o máximo de dinheiro em cada etapa',given:'manter a sua ordem'};
 const drivers=[],missing=[];
 if(x.valid&&x.best&&!x.best.order.length)drivers.push({label:'Ordem sugerida',text:'Nenhuma compra para ordenar: adicione pelo menos duas compras ao seu carrinho.'});
 else if(x.valid&&x.best){drivers.push({label:'Ordem sugerida',text:x.best.order.map(id=>'“'+(x.items.find(i=>i.id===id)||{}).name+'”').join(' → ')+': '+H(x.best.result.totalHours)+' de jogo no total.'});if(x.given&&x.given.valid&&x.given.order.join()!==x.best.order.join())drivers.push({label:'Sua ordem',text:H(x.given.result.totalHours)+' de jogo no total na sua ordem.'});if(x.search)drivers.push({label:'Busca',text:x.search.note});
  /* lot 3 : la branche sans achat (tout d’un coup à la fin), pour dire ce que l’ordre fait gagner */
  /* lot 5 (relecture, L2) : « aucun de ces achats ne fait gagner plus vite » seulement si c’est vrai (aucun achat payé avant le dernier ne rapporte) ;
     tout payable tout de suite : dit tel quel */
  if(x.noBuy&&x.noBuy.valid){const T=x.noBuy.result.totalHours,d=T-x.best.result.totalHours,earn=x.best.order.slice(0,-1).some(id=>{const it=x.items.find(i=>i.id===id)||{};return (it.boostHourly||0)-(it.costHourly||0)>0;});drivers.push({label:'Sem compra no caminho',text:d>1/120?'Comprar tudo de uma vez no fim levaria '+H(T)+': esta ordem economiza '+H(d)+'.':T<=1/120?'Dá para pagar tudo agora mesmo: a ordem não muda o tempo.':earn?'Comprar tudo de uma vez no fim levaria o mesmo tempo ('+H(T)+').':'Comprar tudo de uma vez no fim levaria o mesmo tempo ('+H(T)+'): nenhuma dessas compras faz você ganhar mais rápido; a ordem só muda quando você tem cada uma.'});}}
 else missing.push({label:x.incomplete?'Preço':'Bloqueio',text:x.reason,decisive:true});
 /* lot 2 (C11) : l’attente se calcule avec le gain net (dépenses par partie retirées) ; sans temps de partie, le brut est gardé et dit. */
 {const hn=hourlyNet(s),upk=num(s.goal.upkeepPerSession)&&s.goal.upkeepPerSession>0;
  if(upk&&hn.known&&hn.net!==null&&hn.net>0)drivers.push({label:'Ganho líquido',text:'A espera é calculada com '+E.dollars(fmt(hn.net))+' por hora, com os gastos por sessão descontados.'});
  /* correctif lot 2 : gain net nul ou négatif : aucun montant négatif affiché ; la cause est dite une seule fois (phrase de Mon objectif, déjà la raison du refus quand il bloque) */
  else if(upk&&hn.known&&hn.net!==null&&x.reason!==UPKEEP_EATS)missing.push({label:'Gastos por sessão',text:UPKEEP_EATS,field:'f-goal-upkeepPerSession',decisive:false});
  if(upk&&!hn.known)missing.push({label:'Tempo da sua sessão',text:hn.reason,field:'f-goal-dailyMinutes',decisive:false});}
 return M.explain({tool:'order',aim:'Encontrar a ordem de compra que permite '+OBJ[x.objective]+'.',horizon:'Até a última compra',conditions:conds,used,excluded,values:[{label:'Já tenho',value:vPers(s.goal.capital),unit:'$',field:'order-capital'},{label:'Guardado',value:vPers(s.goal.reserve),unit:'$',field:'order-reserve'},{label:'Ganho por hora',value:vPers(s.goal.hourly),unit:'$/h',field:'order-hourly'}].concat(x.items.map(i=>({label:i.name,value:i.price===null?V.blank():V.personal(i.price),unit:'$'}))),drivers,missing,changes:(x.alternatives||[]).map(a=>'Para '+OBJ[a.objective]+': '+a.order.map(id=>'“'+(x.items.find(i=>i.id===id)||{}).name+'”').join(' → ')+(a.valid?' ('+H(a.result.totalHours)+')':'')).concat(x.flip?['Se “'+x.flip.firstName+'” custasse mais de '+E.dollars(fmt(x.flip.price),' ')+', comprar “'+x.flip.secondName+'” antes dele ficaria mais rápido.']:[])});
}
/* lot 3 (§ 8, sensibilité) : ce qui ferait basculer la réponse de « Ça vaut le coup ? » (modèle continu), chiffré par le moteur
   (prix seuil, gain en plus seuil, temps d’usage seuil) et dit dans le bon sens : si l’achat est remboursé (ou pile à l’équilibre),
   ce qui le ferait perdre ; sinon, ce qui le ferait gagner. Rien n’est dit d’un seuil que le moteur n’a pas pu chiffrer. */
function roiChanges(c){if(!c||!c.valid||c.hours===null)return [];const t=c.thresholds||{},v=c.verdict,H=E.durationText(c.hours),m=n=>E.dollars(fmt(n),' ');
 const ahead=c.difference!==null&&c.difference>-0.005&&!(v==='wait'&&t.usableHours===0);
 return [t.maxPriceForHorizon!=null?(ahead?'Acima de '+m(t.maxPriceForHorizon)+' de preço total, ele não se paga mais em '+H+'.':'Por até '+m(t.maxPriceForHorizon)+' de preço total, ele se pagaria em '+H+'.'):null,
  t.extraHourlyForHorizon!=null&&t.extraHourlyForHorizon>0&&v!=='unknown-gain'?(ahead?'Abaixo de '+m(t.extraHourlyForHorizon)+' de ganho a mais por hora, ele não se paga mais em '+H+'.':'A partir de '+m(t.extraHourlyForHorizon)+' de ganho a mais por hora, ele se pagaria em '+H+'.'):null,
  c.breakEvenHours!=null&&c.breakEvenHours>0?(ahead?'Se você usar por menos de '+E.durationText(c.breakEvenHours)+', ele não se paga.':'Se você usar por pelo menos '+E.durationText(c.breakEvenHours)+' depois da compra, ele se paga.'):null].filter(Boolean);}
function explainRoi(s,source,r,x,ctx={}){
 const mode=roiMode(s),used=['argent-disponible','reserve','cout-acquisition','argent-restant'],excluded={},drivers=[],missing=[];
 if(['new','improve'].includes(mode))used.push('joueurs','gain-net');else{excluded.joueurs='Sem atividades em grupo neste modo.';excluded['gain-net']=mode==='estimate'?'Compra por prazer: nenhum ganho calculado.':'Você escreveu direto o ganho a mais por hora.';}
 if(mode==='estimate'){excluded['gain-en-plus']='Compra por prazer ou ganho desconhecido: nenhum retorno é inventado.';if(num(s.goal.hourly)||s.roi.recoveryActivity)used.push('delai-recuperation');else excluded['delai-recuperation']='Escreva o que você ganha por hora para saber em quanto tempo você recupera o seu dinheiro.';}
 else used.push('gain-en-plus','delai-recuperation');
 if(x.purchasable.state==='na')excluded.achetable='Compra livre: quem descreve é você.';else used.push('achetable');
 if(V.usable(x.usage.perSession)){used.push('cout-usage');if(x.sessions!==null)used.push('cout-complet','frequence','horizon');else{excluded['cout-complet']='Escreva seu tempo de jogo por dia para converter as horas em sessões.';excluded.frequence='Não dá para calcular o número de sessões.';excluded.horizon='Horas de uso sem tempo por dia.';}}
 else{excluded['cout-usage']=x.usage.note||'Nenhum custo de uso anotado.';excluded['cout-complet']='Sem custo de uso, o custo completo é o preço.';if(num(s.roi.hours)){used.push('horizon','frequence');}else{excluded.horizon='Escreva quantas horas você usa.';excluded.frequence='Nenhuma hora de uso anotada.';}}
 if(V.usable(x.cost.resale))used.push('revente-prevue');else excluded['revente-prevue']='Revenda não confirmada em GTA VI: só é contada se você escrever um preço de revenda.';
 if(x.usage.source==='simulated')used.push('mecanique-simulee');else excluded['mecanique-simulee']='Nenhuma mecânica simulada para esta compra.';
 excluded.priorite='A resposta compara “com” e “sem” a compra no mesmo tempo de jogo; não há prioridade para escolher.';
 if(x.cash.state==='short')drivers.push({label:'Dinheiro disponível',text:'Faltam '+E.dollars(fmt(x.cash.shortfall),' ')+' para pagar agora.'});
 if(mode==='estimate'&&!num(s.goal.hourly)&&!s.roi.recoveryActivity)missing.push({label:'O que você ganha por hora',text:'para saber em quanto tempo você recupera o seu dinheiro',field:'roi-recovery-hourly',decisive:false});
 if(mode==='continuous'&&!num(s.goal.hourly))missing.push({label:'O que você já ganha por hora',text:'para comparar as duas situações, com e sem a compra, com o mesmo dinheiro',field:'f-goal-hourly',decisive:false});
 if(mode!=='estimate'&&!num(s.roi.revenueHourly)&&mode==='continuous')missing.push({label:'Ganho a mais por hora',text:'É o dado que decide: sem ele, não se calcula quando você recupera o dinheiro.',field:'f-roi-revenueHourly',decisive:true});
 /* lot 3 : la comparaison avec / sans l’achat (même moteur que la réponse) donne les seuils ; quand elle est lisible et ne manque que du
    gain en plus, ce manque est déjà dit juste au-dessus : on ne le répète pas sous une autre étiquette */
 const c=mode==='continuous'?investment(s,source,ctx):null;
 if(!r.valid&&!(c&&c.valid&&c.verdict==='unknown-gain'))missing.push({label:missingLabel(r.reason),text:r.reason,decisive:true});
 /* lot 3 : « Ce qui décide la réponse » lit les chiffres du moteur (avant : vide, donc « Rien n’est encore calculable » sous une réponse
    calculée) : la différence avec / sans l’achat sur le même temps de jeu, puis le remboursement */
 {const $=n=>E.dollars(fmt(Math.abs(n)),' '),sign=n=>n<=-0.5?'−':n>=0.5?'+':'';
  if(c&&c.valid&&c.extraKnown&&c.hours!==null){if(c.difference!==null)drivers.push({label:'Com ou sem a compra',text:c.shortfall>0&&c.thresholds.usableHours===0&&c.thresholds.waitHours>0/* lot 5 (relecture, L4) : l’argent arrive après la fin du temps d’usage : pas d’achat sur ce temps */?'Depois de '+H(c.hours)+': nada muda, a compra só poderia ser paga depois de '+H(c.thresholds.waitHours)+' de jogo.':'Depois de '+H(c.hours)+': '+sign(c.difference)+$(c.difference)+' com a compra, descontado o preço'+(c.shortfall>0&&c.thresholds.waitHours>0?' (paga depois de '+H(c.thresholds.waitHours)+' de jogo)':'')+'.'});
   drivers.push({label:'Recuperação',text:c.investment===0?'Nada a recuperar: não custa nada no início.':c.breakEvenHours===null?'Nunca com esses números: não rende mais do que custa por hora.':'Depois de '+H(c.breakEvenHours)+' de uso.'});}
  else if(['new','improve'].includes(mode)&&r.valid){const known=mode==='new'&&r.baselineHourly!==null&&r.baselineHourly!==undefined,net=known?r.marginalNetProfit:r.netProfit,pb=known?r.marginalPaybackHours:r.paybackHours,cyc=known?r.marginalPaybackCycles:r.paybackCycles;
   if(num(net))drivers.push({label:'Com ou sem a compra',text:'Em '+H(s.roi.hours)+': '+sign(net)+$(net)+', descontado o preço'+(known?', comparado ao que você fazia':'')+'.'});
   drivers.push({label:'Recuperação',text:r.investment===0?'Nada a recuperar: não custa nada no início.':pb===null?'Não é alcançado com esses números.':'Depois de '+H(pb)+' de jogo ('+cyc+(E.plural(cyc)?' missões':' missão')+').'});}}
 return M.explain({tool:'roi',changes:c?roiChanges(c):[],aim:mode==='estimate'?'Saber se você consegue pagar por isso e quanto ainda sobra.':'Saber se a compra faz você ganhar mais do que custa, comparado a não comprar.',horizon:num(s.roi.hours)?s.roi.hours+' h de jogo':'Agora',conditions:x.admission.ok.concat(x.admission.failed,x.admission.unknown,x.admission.assumed),used,excluded,values:[{label:'Preço total',value:x.acquisition.complete?V.personal(x.acquisition.value):V.blank(),unit:'$',field:'f-roi-purchase'},{label:'Já tenho',value:vPers(s.goal.capital),unit:'$',field:'roi-capital'},{label:'Guardado',value:vPers(s.goal.reserve),unit:'$',field:'roi-reserve'},{label:'Custo por sessão',value:x.usage.perSession,unit:'$/partie'},{label:'Horas de uso',value:vPers(s.roi.hours),unit:'h',field:'f-roi-hours'}],drivers,missing});
}
/* lot 3 (§ 8, sensibilité) : à partir de quel prix total le gagnant de « Quel achat choisir ? » change, pour le critère choisi, avec les
   autres achats comparés tels qu’écrits (rival = le mieux placé des autres). Rien pour l’envie (note de 1 à 5, pas un prix), pour un
   gagnant déjà à égalité (la réponse le dit) ni pour un chiffre inconnu. */
function compareChanges(r){
 if(!r||!r.valid||!r.best||r.undecided||r.tie||r.criterion==='cheapestTotal')return [];
 const k=r.criterion,w=r.items.find(it=>it.name===r.best);if(!w||!w.known||(r.ties&&r.ties[k]&&r.ties[k].length>1))return [];
 const others=r.items.filter(it=>it!==w&&it.known),m=n=>E.dollars(fmt(n),' '),say=(rv,P)=>P>w.total+0.5?['“'+rv.name+'” passaria na frente se o preço total de “'+w.name+'” ultrapassasse '+m(P)+'.']:[];
 const first=(list,f,asc)=>list.filter(it=>f(it)!==null&&f(it)!==undefined).sort((a,b)=>asc?f(a)-f(b):f(b)-f(a))[0];
 if(k==='cheapest'){const rv=first(others,it=>it.total,true);return rv?say(rv,rv.total):[];}
 if(k==='value'&&w.utility!==null&&w.valueScore!==null){const rv=first(others,it=>it.valueScore,false);return rv&&rv.valueScore>0?say(rv,w.utility*100000/rv.valueScore):[];}
 if(k==='profit'&&w.paybackHours!==null&&w.incomeHourly>0){const rv=first(others,it=>it.paybackHours,true);return rv?say(rv,w.incomeHourly*rv.paybackHours):[];}
 // le plus vite à avoir : avec le même gain par heure, attendre plus longtemps = payer plus cher ; le seuil est le prix total du rival
 if(k==='fastest'&&w.waitHours!==null){const rv=first(others,it=>it.waitHours,true);return rv&&rv.waitHours>0?say(rv,rv.total):[];}
 return [];
}
function explainCompare(s,source,r,x){
 const used=['argent-disponible','reserve','cout-acquisition','priorite'],excluded={},drivers=[],missing=[],need=s.analysis.need;
 const hasNeed=!!(need.terrain||num(need.passengers)||need.cargo);
 if(hasNeed){used.push('usage-compatible');if(num(need.passengers)||need.cargo)used.push('capacite');else excluded.capacite='Nenhuma exigência de lugares nem de carga.';}else{excluded['usage-compatible']='Nenhuma necessidade de uso anotada (terreno, lugares, carga): nenhuma opção é descartada por isso.';excluded.capacite='Nenhuma capacidade exigida.';}
 if(x.rows.some(row=>row.item))used.push('achetable');else excluded.achetable='Compras livres: quem descreve é você.';
 if(x.rows.some(row=>row.asset.owned))used.push('possession-requise');else excluded['possession-requise']='Nenhuma dessas compras é sua ainda: cada uma é contada pelo preço dela.';
 if(x.rows.some(row=>V.usable(row.usage.perSession))){used.push('cout-usage');if(x.sessions!==null)used.push('cout-complet','frequence','horizon');else{excluded['cout-complet']='Escreva em quantas sessões você usa cada uma para comparar o custo completo.';excluded.frequence='Sem número de sessões.';excluded.horizon='Nenhum período anotado.';}}
 else{excluded['cout-usage']='Nenhum custo de uso conhecido para essas compras (combustível, manutenção: não confirmados).';excluded['cout-complet']='Sem custo de uso, comparamos o preço.';excluded.frequence='Serve com um custo de uso.';excluded.horizon='Serve com um custo de uso.';}
 if(x.rows.some(row=>row.income!==null)){used.push('gain-en-plus','delai-recuperation');}else{excluded['gain-en-plus']='Nenhuma compra tem ganho a mais anotado: não dá para comparar quando cada compra se paga.';if(num(s.goal.hourly))used.push('delai-recuperation');else excluded['delai-recuperation']='Escreva o que você ganha por hora para saber quando você vai poder pagar.';}
 excluded['revente-prevue']='Revenda não confirmada em GTA VI: não contada na comparação.';
 excluded['performance-usage']='Nenhum desempenho (velocidade, aceleração…) foi publicado para GTA VI: nada é comparado nisso.';
 /* v7.54 : « Effet sur la vie » ne concerne que les consommables : pour d’autres achats, il est écarté comme « sans objet », pas comme « pas chiffré ». */
 excluded['effet-soin']=x.rows.some(row=>row.item&&row.item.type==='consumable')?'Efeito dos consumíveis sem números em GTA VI.':'Não se aplica: nenhum consumível entre essas compras.';
 excluded.esthetique='O site não avalia o seu gosto: mostre isso com a sua nota de vontade.';
 used.push('envie');
 if(x.rows.some(row=>row.usage.source==='simulated'))used.push('mecanique-simulee');else excluded['mecanique-simulee']='Nenhuma mecânica simulada.';
 if(x.excluded.length)drivers.push({label:'Descartados',text:x.excluded.map(row=>'“'+row.name+'” ('+row.admission.failed.map(c=>c.detail||c.label).join(', ')+')').join('; ')+'.'});
 if(x.crossover)drivers.push({label:'Custo ao longo do tempo',text:'“'+x.crossover.before+'” custa menos antes de '+Math.ceil(x.crossover.n-1e-9)+' sessões; depois disso, “'+x.crossover.after+'” passa a custar menos.'});
 x.partial.forEach(row=>missing.push({label:'“'+row.name+'”',text:'Custo incompleto: comparação parcial.',decisive:true}));
 if(!r.valid)missing.push({label:missingLabel(r.reason),text:r.reason,decisive:true});
 const conditions=[];x.rows.forEach(row=>row.conditions.forEach(c=>conditions.push({...c,label:row.name+' · '+c.label})));
 return M.explain({tool:'compare',changes:compareChanges(r),aim:'Escolher a compra que atende à sua necessidade, primeiro entre as que servem e depois conforme o que importa para você.',horizon:x.sessions!==null?'Compra, depois '+x.sessions+' sessões':'No momento da compra',conditions,used,excluded,values:x.rows.map(row=>({label:row.name,value:row.acquisition.complete?V.personal(row.acquisition.value):V.blank(),unit:'$'})).concat([{label:'Já tenho',value:vPers(s.goal.capital),unit:'$',field:'compare-capital'},{label:'Guardado',value:vPers(s.goal.reserve),unit:'$',field:'compare-reserve'}]),drivers,missing});
}
function explainPlan(s,source,r,x){
 const p=s.plan,g=p.goal,missions=p.source==='missions',used=['argent-disponible','reserve','argent-restant','avancement','priorite'],excluded={},drivers=[],missing=[],changes=[];
 const any=(k)=>p.missions.some(k),anyP=(k)=>p.prerequisites.some(k);
 if(p.prerequisites.length){used.push('cout-acquisition','achetable');}else{excluded['cout-acquisition']='Nenhuma compra antes da sua meta.';excluded.achetable='Nenhuma compra antes da sua meta.';}
 /* lot 2 (C6) : ce que rapporte le but arrive après le but (remboursement lu du moteur) ; seul un achat d’avant qui rapporte compte dans le temps pour l’atteindre. */
 const goalBoost=g.kind==='purchase'&&g.boostHourly>0,payback=r&&r.valid&&num(r.goalPaybackHours)?r.goalPaybackHours:null;/* correctif lot 2 : remboursement lu du moteur seulement (aucune formule ici) ; null = aucun délai fini (prix 0, plan non calculé) */
 const afterGoal=goalBoost?(payback!==null?'O que seu objetivo rende só chega depois do objetivo: não muda o tempo para alcançá-lo (se paga depois de '+H(payback)+' de jogo).':'O que seu objetivo rende só chega depois do objetivo: não muda o tempo para alcançá-lo.'):null;
 if(anyP(a=>!a.owned&&a.boostHourly>0))used.push('gain-en-plus');else excluded['gain-en-plus']=afterGoal||'Nenhuma compra faz você ganhar mais (ou você não anotou isso).';
 const input=r&&r.input||planInput(s),ex=(input.excludedMissions||[]);
 if(missions){used.push('gain-net','temps-actif','attente','versement','ressource-exclusive','variete','joueurs');if(ex.length)changes.push((lkPluriel(ex.length)?'Descartadas':'Descartada')+' do plano: '+ex.map(m=>'“'+m.name+'” (é para '+m.players+', vocês são '+(input.players||1)+')').join(', ')+'. Mude “Jogamos em” para contar essas missões.');}
 else{excluded['gain-net']='Você ganha “aos poucos”: seu ganho por hora já conta os gastos.';excluded['temps-actif']='Sem missões: não há tempo de missão separado.';excluded.attente='Sem missões: não há espera.';excluded.versement='Ganho contínuo: não há recompensa no fim da missão.';excluded['ressource-exclusive']='Não há missões para encadear.';excluded.variete='Não há missões para variar.';excluded.joueurs='Não há missões em grupo.';}
 if(missions&&any(m=>(m.requires||[]).length)||anyP(a=>(a.requires||[]).length))used.push('possession-requise');else excluded['possession-requise']='Nenhuma missão nem compra exige outra.';
 if(any(m=>m.once))used.push('deblocage');else excluded.deblocage='Nenhuma missão de desbloqueio (feita uma única vez).';
 if(p.situation.dailyMinutes){used.push('temps-partie','horizon');}else{excluded['temps-partie']='Sem duração da sessão: percurso contínuo, sem calendário.';excluded.horizon='Sem sessões, não há datas: só o tempo de jogo.';}
 if((p.situation.upkeepPerSession||0)>0||anyP(a=>(a.usagePerSession||0)>0))used.push('cout-usage');else excluded['cout-usage']='Nenhum gasto por sessão anotado.';
 if(ammoPerAttempt(s)){used.push('mecanique-simulee');changes.push('Munição simulada: '+E.dollars(fmt(ammoPerAttempt(s)),' ')+' somados aos gastos de cada tentativa de missão, como em Minhas atividades. Desmarque a simulação para tirar esses valores.');}else excluded['mecanique-simulee']='Nenhuma mecânica simulada no plano.';
 excluded['scenario-echec']='O plano supõe que cada missão dá certo; se uma sessão for pior, escreva o que você realmente ganhou: o plano é refeito.';
 if(r.valid){drivers.push({label:'Percurso',text:(r.continuous?H(r.totalMinutes/60)+' de jogo no total':r.totalSessions+(E.plural(r.totalSessions)?' sessões':' sessão')+(r.days?' ('+r.days+' dias)':''))+', '+E.dollars(fmt(r.finalCash),' ')+' no fim.'});
  if(r.lowPoint)drivers.push({label:'Ponto mais baixo',text:E.dollars(fmt(r.lowPoint.cash),' ')+' ('+(r.lowPoint.at||'início')+'), '+((r.input&&r.input.reserve||0)>0?'nunca abaixo dos '+E.dollars(fmt(r.input.reserve),' ')+' guardados.':(r.keptReserve||0)>0?'usando seus '+E.dollars(fmt(r.keptReserve),' ')+' guardados (você escolheu ir o mais rápido possível).':'sem dinheiro guardado.')});
  if(x.chain&&x.chain.steps.length)drivers.push({label:'Preparação',text:x.chain.steps.filter(st=>st.kind!=='activity').map(st=>st.name).join(' → ')||'Nada a preparar.'});}
 else missing.push({label:missingLabel(r.reason),text:r.reason,decisive:true});
 /* lot 2 (C6, C10) : gain du but après le but ; gain par heure d’un achat avec des missions ; vérification indépendante dite (rejouée, trop longue, ou argent seul pour un but en points). */
 if(afterGoal&&anyP(a=>!a.owned&&a.boostHourly>0))drivers.push({label:'O que o objetivo rende',text:afterGoal});
 if(missions&&anyP(a=>a.boostHourly>0))drivers.push({label:'Ganho por hora de uma compra',text:'Contado durante toda a sessão, ao mesmo tempo que suas missões, exceto durante o tempo para obter outra compra.'});
 {const v=r.verification;if(v&&v.skipped==='journal')missing.push({label:'Verificação',text:'Registro longo demais para ser reproduzido (mais de 60.000 eventos): o plano é mostrado sem esta verificação.',decisive:false});
  /* correctif lot 2 (PER4-3) : accord (« 1 événement ») et, en parcours (sans durée de partie, R8 non appliquée), aucune mention du temps de partie :
     la phrase ne revendique que ce qui a été contrôlé. */
  else if(v&&v.ok===true){const ev=v.checked+(E.plural(v.checked)?' eventos':' evento');drivers.push({label:'Verificação',text:v.skipped==='reach'?'Registro reproduzido separadamente ('+ev+'); os pontos não são reproduzidos, só o dinheiro.':r.continuous?'Registro do plano reproduzido separadamente ('+ev+'): dinheiro, dinheiro guardado, compras anteriores e totais conferem.':'Registro do plano reproduzido separadamente ('+ev+'): dinheiro, dinheiro guardado, compras anteriores, tempo de sessão e totais conferem.'});}}
 /* lot 2 (C2) : le moteur refuse désormais lui-même un cycle ou une référence absente : pas de doublon avec la chaîne des prérequis. */
 /* correctif lot 2 (PER4-2) : le même cycle écrit dans une autre rotation (la chaîne part des missions, le moteur du premier achat) n’est pas poussé
    deux fois : les noms du cycle (segments entre « → », le premier répété à la fin) sont comparés comme un ensemble, quelle que soit la langue. */
 const cycleOf=t=>{const g=String(t||'').split(' → ');return g.length<2?null:JSON.stringify([...new Set(g.slice(1,-1).concat(g[g.length-1].replace(/\.\s*$/,'')))].sort());};
 const sameCycle=cycleOf(r.reason)!==null&&cycleOf(r.reason)===cycleOf(x.chain&&x.chain.reason);
 if(x.chain&&!x.chain.ok&&x.chain.reason&&r.reason!==x.chain.reason&&!sameCycle)missing.push({label:'Pré-requisitos',text:x.chain.reason,decisive:true});
 return M.explain({tool:'plan',aim:g.kind==='amount'?'Ter '+E.dollars(fmt(g.target),' ')+': '+MEANING[g.meaning]+'.':g.kind==='unlock'?'Desbloquear '+(g.name||'sua meta')+'.':'Comprar '+(g.name||'sua meta')+'.',horizon:p.situation.dailyMinutes?'Sessão após sessão ('+p.situation.dailyMinutes+' min, '+(p.situation.daysPerWeek||7)+' dias por semana)':'Uma etapa após a outra, sem calendário',conditions:[],used,excluded,values:[{label:'Já tenho',value:vPers(p.situation.capital),unit:'$',field:'plan-capital'},{label:'Guardado',value:vPers(p.situation.reserve),unit:'$',field:'plan-reserve'},...(missions?[{label:'Jogamos em',value:vPers(p.situation.players??1),unit:lkPluriel((p.situation.players??1))?'jogadores':'jogador',field:'plan-players'}]:[]),...(ammoPerAttempt(s)?[{label:'Munição simulada, por tentativa',value:V.simulated(ammoPerAttempt(s)),unit:'$',field:null,origin:'simulation'}]:[])],drivers,missing,changes});
}
function explainTool(tool,s,source,ctx,r,x){
 if(tool==='goal')return explainGoal(s,source,r,x);if(tool==='session')return explainSession(s,source,r,x);if(tool==='activities')return explainActivities(s,source,r,x);
 if(tool==='budget')return explainBudget(s,source,r,x);if(tool==='order')return explainOrder(s,source,r,x);if(tool==='roi')return explainRoi(s,source,r,x,ctx);
 if(tool==='compare')return explainCompare(s,source,r,x);if(tool==='plan')return explainPlan(s,source,r,x);return x.explain||null;
}

/* ----- Lot 1 (calculateur) : « Mon objectif si j’achète / si je n’achète pas » ----- */
const plannedOf=g=>num(g.plannedSpend)&&g.plannedSpend>0?g.plannedSpend:0;
// Argent de la fin après les dépenses payées avant le but (dépense prévue, dépenses par partie) ; spentAtEnd garde leur total.
function settle(r,spent){if(!r||!r.valid)return r;return spent>0?{...r,finalCapital:r.finalCapital-spent,spentAtEnd:spent}:{...r,spentAtEnd:0};}
// Courbe de Mon objectif (petit à petit) : cinq points en minutes de jeu ; la dépense prévue part dès qu’elle se paie.
function curveOf(g,r,ps){const total=r.totalMinutes,h=r.hourly,avail=g.capital-g.reserve,tps=ps<=avail?0:(ps-avail)/h*60;return Array.from({length:5},(_,i)=>{const t=total*i/4;return [t,g.capital+h*t/60-(ps>0&&t>=tps-1e-9?ps:0)];});}
// Journal d’argent d’un résultat de Mon objectif, rejoué par E.cashJournalVerify : achat payé tout de suite (paidNow),
// achat de départ d’une activité, gains encaissés à la fin, dépenses payées avant le but, achat fait juste avant le but (late).
// Les dépenses prévues (et par partie) portent l’étiquette « depenses » : le but ne compte comme atteint qu’une fois elles payées.
function goalJournal(g,r,o={}){
 const end=r.totalMinutes,inv=r.investment||0,start=g.capital-(o.paidNow||0),events=[];
 if(o.paidNow!==undefined)events.push({at:0,kind:'spend',amount:o.paidNow,unlocks:'compra'});
 if(inv>0)events.push({at:0,kind:'spend',amount:inv,unlocks:'activite',needs:o.unlocked?['compra']:[]});
 const gross=r.finalCapital+(r.spentAtEnd||0)-(start-inv);
 if(gross>0)events.push({at:end,kind:'earn',amount:gross,needs:[...(inv>0?['activite']:[]),...(o.unlocked?['compra']:[])]});
 const other=(r.spentAtEnd||0)-(o.late||0);if(other>0)events.push({at:end,kind:'spend',amount:other,unlocks:'depenses'});
 if(o.late!==undefined)events.push({at:end,kind:'spend',amount:o.late,unlocks:'compra'});
 return events;}
// Ce que le but attend d’un journal : chaque achat et chaque dépense prévue qu’il contient, payés.
const paidIn=events=>[...new Set(events.filter(e=>e.unlocks).map(e=>e.unlocks))];
// La chaîne, sur le même calcul que Mon objectif (sens du but, dépenses prévues, dépenses par partie, modèle choisi) :
// 1 état (faits, préférences, contraintes, inconnues) ; 2 contrôles ; 3 dépendances (achat → activité débloquée, gain en plus,
// coût d’usage) ; 4 stratégies (sans achat ; acheter maintenant ou dès que possible ; acheter juste avant le but) ;
// 5 simulation (journal d’argent daté) ; 6 vérification indépendante de chaque journal ; 7 comparaison sur le temps pour
// atteindre le but, l’achat fait ; 8 seuil du gain en plus qui inverserait la conclusion ; 9 restitution par Mes achats.
function goalPurchase(s,source=[],ctx={},key=s.purchase.key){
 const g=s.goal,a=asset(s,key),p=purchase(key===s.purchase.key?s:{...s,purchase:{...s.purchase,key}},source);
 const price=a&&num(p.price)&&num(p.extras)?p.price+p.extras:null,item=a?itemOf(a,ctx):null,use=a&&M?usageOf(s,a,item):null,daily=sessionMinutesOf(s);
 const usageV=use&&V.usable(use.perSession)?use.perSession.v:null,usageUnknown=!!use&&!V.usable(use.perSession)&&use.source!=='na';
 const extra=!a?null:a.incomeMode==='none'?0:num(p.boostHourly)?p.boostHourly:null,extraKnown=extra!==null,ps=plannedOf(g);
 const state={facts:{capital:g.capital,reserve:g.reserve,price,hourly:s.model==='continuous'?g.hourly:null,model:s.model,owned:!!(a&&a.owned)},preferences:{meaning:['held','available','cumulative'].includes(g.meaning)?g.meaning:'available'},constraints:{reserve:g.reserve,dailyMinutes:daily,deadlineDays:num(g.deadlineDays)?g.deadlineDays:null},unknowns:[]};
 if(!extraKnown)state.unknowns.push('gain-en-plus');if(usageUnknown)state.unknowns.push('cout-usage');if(usageV!==null&&usageV>0&&!daily&&s.model==='continuous')state.unknowns.push('temps-partie');
 const base=goal(s,source),out={state,base,price,extra,extraKnown,usage:usageV,usageUnknown,checks:[],rejected:[]};
 if(!a)return{...out,valid:false,reason:'Escolha uma compra na lista.'};
 if(a.owned)return base.valid?{...out,valid:true,owned:true,save:{hours:base.totalMinutes/60},buy:{hours:base.totalMinutes/60,state:'ok',strategy:'owned'}}:{...out,valid:false,reason:base.reason};
 if(price===null)return{...out,valid:false,reason:'Escreva o preço desta compra.'};
 const T=goalTarget(s);if(T===null||!num(g.capital)||!num(g.reserve))return{...out,valid:false,reason:base.reason||'Escreva seu objetivo.'};
 const available=g.capital-g.reserve;
 const verify=(name,events,claim)=>{const v=E.cashJournalVerify({capital:g.capital,reserve:g.reserve,events,claim});out.checks.push({strategy:name,ok:v.valid&&v.ok,violations:v.violations||[]});if(!(v.valid&&v.ok))out.rejected.push(name);return v.valid&&v.ok;};
 if(base.valid){const ev=goalJournal(g,base);verify('sans-achat',ev,{finalCash:base.finalCapital,target:T-ps,after:paidIn(ev),reachedAt:base.totalMinutes});}
 if(s.model==='continuous'){
  const up=num(g.upkeepPerSession)&&g.upkeepPerSession>0?g.upkeepPerSession:0,hNet=num(g.hourly)?g.hourly-(up&&daily?up*60/daily:0):null;
  /* sans achat, le but peut être impossible seulement parce que le gain (net) est nul : l’achat qui rapporte reste calculable */
  const noIncome=!base.valid&&hNet!==null&&hNet<=0&&goal({...s,goal:{...g,hourly:(up&&daily?up*60/daily:0)+1}},source).valid;
  if(!base.valid&&!noIncome)return{...out,valid:false,reason:base.reason};
  if(hNet===null)return{...out,valid:false,reason:base.reason||'Escreva o que você ganha por hora.'};
  const usageHourly=usageV!==null&&usageV>0&&daily?usageV*60/daily:0,save=base.valid?{hours:base.totalMinutes/60}:{hours:null,state:'impossible',why:'income'};
  const t=E.purchaseGoalTiming({capital:g.capital,reserve:g.reserve,target:T,hourly:Math.max(0,hNet),price,extraHourly:extra,usageHourly});
  if(!t.valid)return{...out,valid:false,reason:t.reason};
  const more={hourlyNet:Math.max(0,hNet),affordHours:t.affordHours,extraThreshold:t.extraThreshold,timing:t};
  if(t.buyHours===null)return{...out,...more,valid:true,save,buy:{hours:null,state:price>available?'money-first':'impossible',strategy:null}};
  const events=ps>0?t.journal.concat([{at:t.claim.reachedAt,kind:'spend',amount:ps,unlocks:'depenses'}]):t.journal;
  const ok=verify(t.strategy,events,{...t.claim,finalCash:t.claim.finalCash-ps,target:T-ps,after:paidIn(events)});
  return{...out,...more,valid:true,save,buy:ok?{hours:t.buyHours,state:'ok',strategy:t.strategy,buyAtHours:t.buyAtHours,optimal:t.optimal}:{hours:null,state:'rejected',strategy:t.strategy},delayHours:ok&&save.hours!==null?t.buyHours-save.hours:null};
 }
 /* À la fin de chaque mission : une mission rapporte autant avec ou sans l’achat, sauf s’il débloque une activité choisie. */
 const chosen=g.selected==='mixed'?s.activities.map(x=>x.id):[g.selected],acts=activities(s,source).filter(x=>chosen.includes(x.id));
 const unlocks=!!a.itemId&&acts.some(x=>(x.requiresPurchaseIds||[]).includes(a.itemId));
 if(!unlocks){
  if(!base.valid)return{...out,valid:false,reason:base.reason};
  /* Acheter plus tôt n’avance rien et ajouterait le coût d’usage : le plus court est de l’acheter juste avant le but, ce qui
     revient à ajouter son prix aux dépenses prévues. */
  const s2=copy(s);s2.goal.plannedSpend=ps+price;const r=goal(s2,source),save={hours:base.totalMinutes/60};
  if(!r.valid)return{...out,valid:true,save,buy:{hours:null,state:'impossible',strategy:null,reason:r.reason}};
  const ev=goalJournal(g,r,{late:price}),ok=verify('late',ev,{finalCash:r.finalCapital,target:T-ps,after:paidIn(ev),reachedAt:r.totalMinutes});
  return{...out,valid:true,save,buy:ok?{hours:r.totalMinutes/60,state:'ok',strategy:'late',buyAtHours:r.totalMinutes/60,optimal:true}:{hours:null,state:'rejected',strategy:'late'},delayHours:ok?r.totalMinutes/60-save.hours:null,extraThreshold:null};
 }
 /* L’activité choisie demande cet achat : sans lui, Mon objectif n’est pas possible ; avec lui, il se paie d’abord. */
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
  // v7.49 : une option incompatible avec ton besoin (terrain, places, chargement) ou qui ne s’achète pas est écartée avant de choisir.
  const x=M?compareAnalysis(s,source,ctx):null,bad=new Set(x?x.excluded.map(row=>row.name):[]);
  if(bad.size){const kept=input.items.filter(it=>!bad.has(it.name));if(kept.length<2)return {valid:false,reason:kept.length?'Só uma opção atende à sua necessidade: “'+kept[0].name+'”. As outras estão descartadas: '+[...bad].join(', ')+'.':'Nenhuma opção atende à sua necessidade: '+[...bad].join(', ')+'.',excludedByNeed:[...bad],items:[],best:null,bestByCriterion:{}};r={...E.choose({...input,items:kept}),excludedByNeed:[...bad]};}
  else r=E.choose(input);
  /* v7.54 : sans note d’envie sur un achat, « rapport envie / prix » ne peut pas trancher ; on répond « le moins cher à l’achat » en le disant, jusqu’à ce que l’envie soit notée. */
  if(r.valid&&!total&&r.criterion==='value'&&r.best===null&&r.unrated&&r.unrated.length)r={...r,criterion:'cheapest',best:r.bestByCriterion.cheapest,fallback:{from:'value',unrated:r.unrated}};
  if(!total||!r.valid||!x)return r;
  // « Le moins cher sur la durée » : prix + coût d’usage sur le nombre de parties écrit ; un coût incomplet n’est jamais un avantage.
  if(x.sessions===null)return {...r,criterion:'cheapestTotal',best:null,undecided:true,undecidedReason:'Escreva em quantas sessões você vai usar a compra: sem isso, não há custo ao longo do tempo.'};
  /* v7.54 : à égalité de coût sur la durée, le gagnant ne dépend plus de l’ordre de la liste : départage par le nom (le résultat dit « à égalité »). */
  const rows=x.admissible,complete=rows.filter(row=>row.cost.total.complete).sort((a,b)=>(a.cost.total.value-b.cost.total.value)||String(a.name).localeCompare(String(b.name),'fr'));
  if(!complete.length)return {...r,criterion:'cheapestTotal',best:null,undecided:true,undecidedReason:'Nenhuma opção tem custo completo: escreva os custos de uso ou os preços que faltam.'};
  const lead=complete[0],doubt=rows.filter(row=>!row.cost.total.complete&&!M.compareCosts(lead.cost.total,row.cost.total).decided);
  const bestTotals=Object.fromEntries(rows.map(row=>[row.name,row.cost.total.complete?row.cost.total.value:null]));
  if(doubt.length)return {...r,criterion:'cheapestTotal',best:null,undecided:true,undecidedReason:'“'+lead.name+'” custa menos entre os custos completos, mas '+doubt.map(row=>'“'+row.name+'”').join(', ')+' tem um custo incompleto que poderia ser mais baixo.',totals:bestTotals};
  const chosen=r.items.find(it=>it.name===lead.name),second=complete[1],tie=second&&Math.abs(second.cost.total.value-lead.cost.total.value)<=1e-6*Math.max(1,lead.cost.total.value),near=second&&!tie&&M.close(lead.cost.total.value,second.cost.total.value,0.02);
  return {...r,criterion:'cheapestTotal',tie:!!tie,near:!!near,closeWith:tie||near?second.name:null,best:lead.name,bestWaitHours:chosen?chosen.waitHours:null,bestTotal:lead.cost.total.value,totals:bestTotals,bestByCriterion:{...r.bestByCriterion,cheapestTotal:lead.name}};}
 if(tool==='plan'){const missing=planMissing(s);if(missing)return{valid:false,reason:missing};
  const st=s.plan.strategy==='auto'?planStrategies(s):null;
  /* lot 2 (C10) : aucun candidat valide (but non atteint en 400 parties, refus du moteur) : la raison chiffrée, sans parler de l’argent de côté */
  if(st&&!st.valid)return {valid:false,reason:st.reason,strategies:st,strategy:'asIs',variant:'auto',input:planInput(s,'asIs')};
  const strategy=st&&st.recommended?st.recommended:(s.plan.strategy==='auto'?'asIs':s.plan.strategy),input=planInput(s,strategy);
  if(st&&st.blocked)return Object.assign({valid:false,reason:st.blockedReason,blockedByReserve:true},{strategy:'asIs',strategies:st,variant:'auto',input});
  let r=E.missionPlan(input),variant='auto';
  // Plan de secours choisi (« Suivre ce plan ») : même situation, missions ou achats d'avant réduits.
  /* lot 2 (C7) : les plans de secours sont comparés sans journal ; celui qui est suivi est recalculé avec (vérification possible). */
  if(s.plan.variant!=='auto'){const alt=E.missionAlternatives(input);const v=alt.valid?alt.results[s.plan.variant]:null;if(v&&v.valid&&v.reached){r=E.missionPlan(alt.inputs[s.plan.variant]);variant=s.plan.variant;}}
  const meta={strategy,strategies:st,variant,input,keptReserve:s.plan.situation.reserve??0};
  /* lot 2 (C10) : un plan valide mais non atteint (400 parties, fin du parcours) n’est pas montré comme un programme : refus avec la portée chiffrée. */
  if(r.valid&&!r.reached)return Object.assign({valid:false,unreached:true,limited:true,reason:(r.note?r.note+' ':'')+unreachedNote(r,s),finalCash:r.finalCash,missing:r.missing},meta);
  /* lot 2 (C8, C10) : le plan retenu est rejoué par le vérificateur indépendant ; un plan rejeté n’est pas proposé (règle nommée). */
  if(r.valid){r.verification=E.missionVerify(r);if(r.verification.ok===false)return Object.assign({valid:false,reason:verifyText(r.verification),verification:r.verification},meta);}
  return Object.assign(r,meta);}
 if(tool==='goal')return goal(s,source);if(tool==='session')return session(s,source);if(tool==='roi')return roi(s,source,ctx);if(tool==='order'){if(!M){const r0=E.order(orderInput(s,source));return !r0.valid&&r0.blockedIndex!==undefined&&upkeepEats(s)?{...r0,reason:UPKEEP_EATS}:r0;}const x=orderAnalysis(s,source,ctx);if(x.best&&x.best.valid)return {...x.best.result,order:x.best.order,objective:x.objective,method:x.search&&x.search.method};return {valid:false,reason:x.reason,incomplete:!!x.incomplete,steps:[],totalHours:null,finalCapital:null,finalHourly:null};}
 if(tool==='budget'){const input=budgetInput(s),unknown=input.allocations.filter(v=>v===null).length;if(!unknown)return E.budget(input);
  // v7.49 : un prix inconnu ne vaut pas 0 : le calcul se fait sur le sous-total connu et le dit (« au plus »).
  const r=E.budget({...input,allocations:input.allocations.map(v=>v===null?0:v)});return r.valid?{...r,partial:true,unknownCount:unknown,shares:r.shares.map((x,i)=>input.allocations[i]===null?null:x)}:r;}
 if(tool==='purchase'){const p=purchase(s,source);return E.purchase({...p,capital:p.capital===null||p.reserve===null?null:p.capital-p.reserve,price:p.price===null||p.extras===null?null:p.price+p.extras});}
 if(tool==='activities'){if(!Number.isInteger(s.goal.players)||s.goal.players<1||s.goal.players>100)return{valid:false,reason:'Escreva um número de jogadores entre 1 e 100.'};const a=activities(s,source).find(a=>a.id===s.inverse.selected);if(!a)return{valid:false,reason:'Escolha uma atividade.'};if(a.players>s.goal.players)return{valid:false,reason:'Esta atividade é para '+a.players+' jogadores; vocês são '+s.goal.players+'. Ajuste o seu grupo ou escolha um cenário solo.'};if((a.requiresPurchaseIds||[]).some(id=>!s.assets.some(x=>x.itemId===id&&x.owned)))return{valid:false,reason:'Falta uma compra para esta atividade. Marque “Já tenho” em O que comprar primeiro.'};return E.inverse({...s.inverse,capital:s.goal.capital,reserve:s.goal.reserve,activity:a});}
 return{valid:false,reason:'Escolha uma ferramenta.'};
}
const metrics={plan:['totalMinutes','Tempo de jogo até a meta do plano','min',-1],compare:['bestWaitHours','Tempo de jogo até ter a opção escolhida','h',-1],goal:['totalMinutes','Tempo de jogo para o meu objetivo','min',-1],session:['profit','Ganho durante a sessão','$',1],activities:['profit','Ganho, descontada a compra inicial','$',1],roi:['netProfit','Ganho no final, descontado o preço','$',1],purchase:['remaining','O que sobra para mim depois da compra','$',1],order:['totalHours','Tempo de jogo até a última compra','h',-1],budget:['available','O que sobra para mim, sem o dinheiro guardado','$',1]};
/* v7.59 (check ultime, D-06) : en « nouvelle activité » avec ton gain actuel écrit, l’écran répond avec le gain EN PLUS de ce que tu gagnais déjà (marginalNetProfit) ; le chiffre gardé dans Mes calculs et comparé en mode Expert est le même. */
function metric(tool,s){if(tool==='roi'&&roiMode(s)==='estimate')return ['remaining','O que sobra para mim depois desta compra','$',1];if(tool==='roi'&&roiMode(s)==='new'&&typeof s.goal.hourly==='number'&&Number.isFinite(s.goal.hourly))return ['marginalNetProfit','Ganho a mais do que eu já ganhava, descontado o preço','$',1];return metrics[tool];}
function sensitivity(tool,s,source=[]){
 let path,label,sourceInput=false;
 function reward(id){let i=s.activities.findIndex(a=>a.id===id),a=s.activities[i];if(i<0){i=source.findIndex(a=>a.id===id);a=source[i];sourceInput=true;}if(!a)return;path=sourceInput?[i,'reward']:['activities',i,'reward'];label='Recompensa de “'+a.name+'” somente';}
 if(tool==='goal'){if(s.model==='continuous'){path=['goal','hourly'];label='O que você ganha por hora: 20% a mais ou a menos';}else{const owned=s.assets.filter(a=>a.owned).map(a=>a.itemId),candidate=s.activities.find(a=>a.players<=s.goal.players&&(a.requiresPurchaseIds||[]).every(id=>owned.includes(id))&&E.activity(a).valid);reward(s.goal.selected==='mixed'?candidate?.id:s.goal.selected);}}
 if(tool==='activities')reward(s.inverse.selected);
 if(tool==='session'){const r=session(s,source),id=r.valid?r.timeline.find(x=>x.net>0)?.id:null;reward(id||eligible(s,source).find(a=>E.activity(a).valid)?.id);}
 if(['roi','purchase'].includes(tool)){const i=s.assets.findIndex(a=>a.key===(tool==='roi'?s.roi.key:s.purchase.key));if(i<0)return null;path=['assets',i,'price'];label='O preço da compra: 20% mais caro ou mais barato';}
 /* v7.53 : sans achat à ordonner ou à comparer, pas de courbe « Et si… » (elle afficherait « de 0 min à 0 min »).
    v7.54 : le bloc reste affiché (comme en v7.47) avec la raison et ce qu’il faut écrire : voir « pending » dans l’écran. */
 if(tool==='order'&&s.order.keys.filter(k=>asset(s,k)).length<1)return {pending:true,label:'O que você ganha por hora: 20% a mais ou a menos',need:'Adicione pelo menos uma compra com o preço dela em “O que comprar primeiro?”: este bloco mostra então como o tempo até a última compra muda quando seu ganho por hora varia 20%.'};
 if(tool==='compare'&&s.compare.keys.filter(k=>asset(s,k)).length<2)return {pending:true,label:'O que você ganha por hora: 20% a mais ou a menos',need:'Adicione pelo menos duas compras para comparar: este bloco mostra então como a espera antes de poder comprar muda quando seu ganho por hora varia 20%.'};
 if(tool==='order'||tool==='compare'){path=['goal','hourly'];label='O que você ganha por hora: 20% a mais ou a menos';}
 /* v7.70 (Téva : « il manque la partie et si au business plan en mode Expert ») : le même bloc que les autres outils. Avec un gain
    par heure, c'est lui qui bouge ; avec des missions, c'est la récompense de la première mission jouable (son prix, ses frais et
    le reste du plan ne bougent pas). Sans chiffre encore écrit, le bloc dit ce qu'il attend. */
 if(tool==='plan'){const p=s.plan,si=p.situation;
  if(p.source==='hourly'){if(!Number.isFinite(si.hourly)||si.hourly<=0)return {pending:true,label:'O que você ganha por hora: 20% a mais ou a menos',need:'Escreva quanto você ganha por hora em “Como você ganha seu dinheiro?”: este bloco mostra então como o tempo até a sua meta muda quando esse ganho varia 20%.'};path=['plan','situation','hourly'];label='O que você ganha por hora: 20% a mais ou a menos';}
  else{const i=p.missions.findIndex(m=>Number.isFinite(m.reward)&&m.reward>0&&!(m.once&&m.done));if(i<0)return {pending:true,label:'A recompensa da sua primeira missão: 20% a mais ou a menos',need:'Adicione pelo menos uma missão com a recompensa em “Como você ganha seu dinheiro?”: este bloco mostra então como o tempo até a sua meta muda quando essa recompensa varia 20%.'};path=['plan','missions',i,'reward'];label='Recompensa de “'+p.missions[i].name+'” só: 20% a mais ou a menos';}}
 if(tool==='budget'){const first=s.budget.source==='basket'?s.assets.findIndex(a=>a.key===s.order.keys[0]):-1;path=first>=0?['assets',first,'price']:s.budget.source==='manual'?['budget','allocations',0]:['budget','extra'];label='Só o preço do seu primeiro gasto';}
 if(!path)return null;let value=sourceInput?source:s;for(const k of path)value=value[k];
 return{label,path:path.slice(),sourceInput,rows:[.8,1,1.2].map(f=>{const c=copy(s),sources=sourceInput?copy(source):source;let p=sourceInput?sources:c;path.slice(0,-1).forEach(k=>p=p[k]);const v=Number.isFinite(value)?Math.min(1e12,value*f):null;p[path.at(-1)]=v;return{factor:f,value:v,bounded:Number.isFinite(value)&&value*f>1e12,result:evaluate(tool,c,sources)};})};
}
/* v7.74 (Téva : « rajoute des hypothèses utiles, à la fois pour les calculs et pour le business plan ») : « Et si autre chose
   change ? » du mode Expert. Chaque hypothèse refait tout le calcul (evaluate) sur une copie où un seul levier bouge : ce que tu
   gagnes, les prix, les frais et dépenses, la durée des missions, ton temps de jeu, l'argent gardé de côté, l'argent de départ,
   l'objectif. « Tout va moins bien » et « Tout va mieux » bougent ensemble, de 20 %, les leviers qui ne dépendent pas de toi
   (gains, prix, frais, durées). Seuls les leviers qui touchent un chiffre que l'outil lit sont proposés ; un chiffre inconnu reste
   inconnu. Ce ne sont pas des prévisions : ce sont tes chiffres, déplacés. */
const HYP_MARKET=['gains','prices','costs','time'];
const HYP_NEED={order:'Adicione pelo menos uma compra com o preço em “O que comprar primeiro?”.',compare:'Adicione pelo menos duas compras para comparar.',hourly:'Escreva quanto você ganha por hora em “Como você ganha seu dinheiro?”.',missions:'Adicione pelo menos uma missão com a recompensa em “Como você ganha seu dinheiro?”.'};
const hypScale=(v,f)=>typeof v==='number'&&Number.isFinite(v)?Math.round(v*f*100)/100:v;
function hypLevers(tool,s){const m=tool==='roi'?roiMode(s):null;
 return ({goal:['gains','prices','costs','time','play','reserve','capital','goal'],activities:['gains','prices','costs','time','play','reserve','capital'],session:['gains','prices','costs','time','play','reserve','capital'],purchase:['prices','costs','reserve','capital'],roi:m==='estimate'?['prices','costs','reserve','capital']:['gains','prices','costs','time','play'],order:['gains','prices','costs','reserve','capital'],budget:['prices','costs','reserve','capital'],compare:['gains','prices','costs','reserve','capital'],plan:['gains','prices','goal','costs','time','play','days','reserve','capital']})[tool]||[];}
/* les activités et les achats que l'outil lit vraiment (références dans la copie) */
function hypActs(tool,c,src){const all=[...c.activities,...src],byId=id=>all.filter(a=>a.id===id).slice(0,1);
 if(tool==='goal')return c.model==='cycles'?(c.goal.selected==='mixed'?c.activities.slice():byId(c.goal.selected)):[];
 if(tool==='activities')return byId(c.inverse.selected);
 if(tool==='session')return all.filter(a=>c.session.enabled.includes(a.id));
 if(tool==='roi')return ['new','improve'].includes(roiMode(c))?all.filter(a=>c.roi.activityIds.includes(a.id)):[];
 return [];}
function hypAssets(tool,c){const keys=tool==='purchase'?[c.purchase.key]:tool==='roi'?[c.roi.key]:tool==='order'?c.order.keys:tool==='compare'?c.compare.keys:tool==='budget'&&c.budget.source==='basket'?c.order.keys:[];return keys.map(k=>asset(c,k)).filter(Boolean);}
function hypApply(tool,c,src,lever,f){const g=c.goal,p=c.plan,acts=hypActs(tool,c,src),assets=hypAssets(tool,c),m=tool==='roi'?roiMode(c):null;
 const sc=(o,k,ff=f)=>{if(o)o[k]=hypScale(o[k],ff);};
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
const HYP_LABEL={gains:'Tudo o que você ganha: 20% a menos',prices:'Os preços: 20% mais caros',costs:'Os gastos e as despesas: 20% a mais',time:'As missões duram 20% a mais',days:'Um dia de jogo a mais por semana',capital:'Você começa com 20% a menos de dinheiro',prudent:'Tudo vai pior, ao mesmo tempo',favorable:'Tudo vai melhor, ao mesmo tempo'};
function hypLabel(tool,s,lever){
 if(lever==='play')return tool==='goal'?'Você joga 30 min a mais por dia':tool==='activities'?'Você tem 30 min a mais':tool==='session'?'Sua sessão dura 30 min a mais':tool==='roi'?'Você usa por 20% mais tempo':'Sessões com 30 min a mais';
 if(lever==='reserve')return ((tool==='plan'?s.plan.situation.reserve:s.goal.reserve)??0)>0?'Você também gasta o seu dinheiro guardado':'Você deixa 10% do seu dinheiro guardado';
 if(lever==='goal')return tool==='plan'?'Sua meta pede 20% a mais':'Seu objetivo é 20% mais alto';
 return HYP_LABEL[lever];}
function hypotheses(tool,s,source=[],ctx={}){
 const met=metric(tool,s);if(!met)return {valid:false,reason:'Escolha uma ferramenta.',rows:[]};
 const [key,label,unit,direction]=met,sens=sensitivity(tool,s,source);
 /* même attente que « Et si le chiffre bouge de 20 % ? » (Quoi acheter d’abord ? sans achat, Quel achat choisir ? avec moins de deux) */
 if(sens&&sens.pending)return {valid:false,pending:true,reason:tool==='plan'?(s.plan.source==='hourly'?HYP_NEED.hourly:HYP_NEED.missions):HYP_NEED[tool]||sens.need,key,label,unit,direction,rows:[]};
 const base=evaluate(tool,s,source,ctx);
 if(!base.valid||!Number.isFinite(base[key]))return {valid:false,reason:base.reason||'Ainda não dá para calcular.',key,label,unit,direction,rows:[]};
 const R=v=>Math.round(v*100)/100,baseDays=Number.isFinite(base.days)?base.days:null;
 const before=JSON.stringify([s,source]),levers=hypLevers(tool,s),rows=[];
 const run=(id,kind,label,changes)=>{const c=copy(s),src=copy(source);changes.forEach(([lever,f])=>hypApply(tool,c,src,lever,f));if(JSON.stringify([c,src])===before)return false;
  const r=evaluate(tool,c,src,ctx),ok=r.valid&&Number.isFinite(r[key]),delta=ok?R(r[key]-base[key]):null,days=ok&&Number.isFinite(r.days)?r.days:null,dDays=days!==null&&baseDays!==null?days-baseDays:null;
  /* mieux ou moins bien : d’après le chiffre de l’outil ; s’il ne bouge pas, d’après les jours (finir plus tôt) ; s’ils se contredisent (parties plus longues : plus de temps de jeu, moins de jours), ni l’un ni l’autre */
  const byMetric=ok&&delta!==0?delta*direction>0:null,byDays=dDays?dDays<0:null,better=!ok?false:byMetric===null?byDays:byDays===null||byDays===byMetric?byMetric:null;
  rows.push({id,kind,label,valid:ok,reason:ok?null:(r.reason||'Não dá para calcular.'),value:ok?R(r[key]):null,delta,pct:ok&&base[key]!==0?delta/Math.abs(base[key])*100:null,better,days,dDays});return true;};
 const UNFAV={gains:0.8,prices:1.2,costs:1.2,time:1.2,capital:0.8,goal:1.2,play:1,days:1,reserve:1};
 levers.forEach(l=>run(l,'one',hypLabel(tool,s,l),[[l,UNFAV[l]]]));
 const market=levers.filter(l=>HYP_MARKET.includes(l)&&rows.some(x=>x.id===l));
 if(market.length>1){run('prudent','all',HYP_LABEL.prudent,market.map(l=>[l,l==='gains'?0.8:1.2]));run('favorable','all',HYP_LABEL.favorable,market.map(l=>[l,l==='gains'?1.2:0.8]));}
 const ones=rows.filter(x=>x.kind==='one'),broken=ones.find(x=>!x.valid),moved=ones.filter(x=>x.valid&&x.delta!==0).sort((a,b)=>Math.abs(b.delta)-Math.abs(a.delta));
 const prudent=rows.find(x=>x.id==='prudent'),favorable=rows.find(x=>x.id==='favorable');
 return {valid:true,key,label,unit,direction,base:{value:R(base[key]),days:baseDays},rows,top:moved[0]||null,broken:broken||null,range:prudent&&favorable?{prudent,favorable}:null};
}
function signature(s){const c=copy(s);delete c.name;delete c.mode;delete c.views;delete c.tab;delete c.catalogue;delete c.completed;delete c.modelVersion;delete c.modelUpgradedFrom;/* lot 2 (C13) : la version du modèle ne rend pas un calcul « non enregistré » */return JSON.stringify(c);}
function referenceWarnings(s,catalogue){const out=[];s.assets.forEach(a=>{if(!a.itemId)return;const item=catalogue.find(x=>x.id===a.itemId);if(!item)out.push(a.name+': esta ficha não existe mais, seu preço foi mantido.');else if(a.referencePrice!==item.price)out.push(item.name+': o preço do site mudou; confira o seu número.');});return out;}
function initial(dataVersion,presets){return defaults({version:2,dataVersion,mode:'quick',model:'continuous',name:'Meu primeiro milhão',tab:'goal',goal:{capital:200000,target:1000000,hourly:100000,reserve:0,dailyMinutes:60,players:1,selected:'scenario-a',meaning:'available',plannedSpend:null,upkeepPerSession:null,deadlineDays:null},activities:presets.map(a=>({id:a.id,name:a.name,reward:a.reward,cost:a.cost,duration:a.duration,prep:a.prep,cooldown:a.cooldown,share:a.share,investment:a.investment,players:a.players,owned:false})),session:{minutes:60,maxRepeat:100,enabled:['scenario-a','scenario-b','scenario-c']},inverse:{minutes:60,selected:'scenario-a'},purchase:{itemId:'',price:100000,hourly:50000,boostHourly:0,capital:200000,target:1000000,reserve:0,extras:0},catalogue:{query:'',type:'all',status:'all',maxPrice:null,sort:'name',favorites:[],compareIds:[],favoritesOnly:false}});}
return Object.freeze({MODEL_VERSION,roiMode,hourlyNet,compareNames,compareChanges,roiChanges,planLogId,analysis,goalTarget,goalPurchase,usageOf,terrainFits,OBJECTIVES,dependencyOrder,copy,tools,names,defaults,initial,validate,migrate,asset,addAsset,activities,eligible,purchase,goal,session,projection,roi,investment,decision,blank,orderInput,budgetInput,chooseInput,planInput,planMissing,planPurchases,planReserve,planGoalName,planStrategies,planAlternatives,planObserved,planNextSession,planDeadline,planCurve,planTemplate,planMissionTemplate,planPrereqTemplate,planLogTemplate,planVariantTemplate,analysisTemplate,assetTemplate,MECHANICS,ROLES,GOAL_MEANINGS,PRIORITIES,TERRAINS,STRATEGIES,STRATEGY_LABEL,PLAN_KINDS,PLAN_SOURCES,evaluate,metrics,metric,sensitivity,hypotheses,signature,referenceWarnings});
});
