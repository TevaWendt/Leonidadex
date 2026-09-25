/* État partagé v3 et sélecteurs déterministes. Aucun prix ni revenu n'est inventé. */
(function(root,factory){'use strict';if(typeof module==='object'&&module.exports)module.exports=factory(require('./calculateurs-engine.js'));else root.LKCalcScenario=factory(root.LKCalcEngine);})(typeof globalThis!=='undefined'?globalThis:this,function(E){
'use strict';
const copy=x=>JSON.parse(JSON.stringify(x));
const tools=['goal','activities','session','purchase','order','roi','budget','compare'];
const names={goal:'Mon objectif',activities:'Mes activités',session:'Mon temps de jeu',purchase:'Mes achats',order:'Quoi acheter d’abord ?',roi:'Ça vaut le coup ?',budget:'Mon budget',compare:'Quel achat choisir ?',plan:'Mon business plan'};
const assetTemplate={key:'free-1',itemId:'',name:'Mon achat libre',price:100000,referencePrice:null,extras:0,fees:0,owned:false,incomeMode:'none',boostHourly:0,utility:3};
// Quel achat choisir ? et Mon business plan : réglages propres à chaque outil, achats partagés via assets.
const compareTemplate={keys:[],criterion:'value',hours:10};
const planTemplate={kind:'purchase',key:'',target:null,usePrerequisites:true,upkeepPerSession:0,priority:'balanced',activity:'',details:false};
function defaults(old){
 const s=copy(old);s.version=3;s.views=Object.fromEntries([...tools,'plan'].map(t=>[t,'quick']));
 s.assets=[copy(assetTemplate)];s.purchase={key:'free-1'};
 s.session={...s.session,daysPerWeek:7,usualMinutes:60};
 s.activities=s.activities.map(a=>({...a,prepOnce:false,requiresPurchaseIds:[]}));
 s.roi={key:'free-1',mode:'estimate',activityIds:[],hours:10,revenueHourly:null,costHourly:0,gainPercent:20,durationReduction:0,recoveryActivity:'',compareKey:''};
 s.order={keys:[]};s.budget={source:'basket',extra:0,allocations:[50000,60000,20000,10000,0]};
 s.compare=copy(compareTemplate);s.plan=copy(planTemplate);
 s.completed=[];return s;
}
function asset(s,key){return s.assets.find(a=>a.key===key);}
function addAsset(s,item){let a=s.assets.find(x=>x.itemId===item.id);if(!a){if(s.assets.length>=40)throw Error('Quarante achats maximum. Retire un achat inutilisé avant de continuer.');a={...copy(assetTemplate),key:item.id,itemId:item.id,name:item.name,price:item.price,referencePrice:item.price};s.assets.push(a);}return a;}
function migrate(raw,initial){
 if(!raw||typeof raw!=='object'||![1,2,3].includes(raw.version))throw Error('Version de sauvegarde non reconnue.');
 if(raw.version===3)return raw;
 const s={...copy(initial),...copy(raw),version:3};
 s.goal={...initial.goal,...raw.goal};
 const oldContext=raw.tab==='purchase'?raw.purchase:raw.tab==='budget'?raw.budget:raw.tab==='order'?raw.order:null;
 if(oldContext)for(const key of ['capital','reserve','hourly','target'])if(Object.prototype.hasOwnProperty.call(oldContext,key))s.goal[key]=oldContext[key];
 s.views=Object.fromEntries([...tools,'plan'].map(t=>[t,raw.mode==='advanced'?'advanced':'quick']));s.mode=s.views[s.tab]||'quick';
 s.activities=(raw.activities||initial.activities).map(a=>({...a,owned:a.owned===true,prepOnce:false,requiresPurchaseIds:[]}));
 s.session={...initial.session,...raw.session};s.assets=[];
 const old=raw.purchase||{}, a={...copy(assetTemplate),key:old.itemId||'free-1',itemId:old.itemId||'',price:old.price===undefined?100000:old.price,extras:old.extras||0,boostHourly:old.boostHourly||0,incomeMode:old.boostHourly?'personal':'none'};
 s.assets.push(a);s.purchase={key:a.key};
 const r=raw.roi||{};s.assets.push({...copy(assetTemplate),key:'legacy-roi',name:'Investissement importé',price:r.purchase===undefined?null:r.purchase,extras:r.upgrades||0,fees:r.fees||0});
 s.roi={...copy(initial.roi),...r,key:'legacy-roi',mode:'continuous',activityIds:[]};
 s.order={keys:[]};(raw.order?.items||[]).forEach((item,i)=>{const a={...copy(assetTemplate),...item,key:'legacy-order-'+i,itemId:'',incomeMode:item.boostHourly?'personal':'none'};s.assets.push(a);s.order.keys.push(a.key);});
 s.budget={...copy(initial.budget),...raw.budget,source:'manual'};s.completed=[];
 // Shared goal values are authoritative; historical copies stay in the untouched v1 storage.
 return s;
}
function validate(raw,initial){
 if(!raw||!raw.goal||!Array.isArray(raw.activities)||(raw.version===3&&!Array.isArray(raw.assets)))throw Error('Sauvegarde incomplète : objectif, activités ou achats absents.');
 raw=migrate(raw,initial);
 function walk(t,v,key){
  if(v===undefined)return ['price','reward','duration','capital','target','hourly'].includes(key)?null:copy(t);
  if(t===null||typeof t==='number'){if(v===null)return null;if(typeof v!=='number'||!Number.isFinite(v)||Math.abs(v)>1e12)throw Error('Nombre invalide : '+key);return v;}
  if(typeof t==='string'){if(typeof v!=='string'||v.length>200)throw Error('Texte invalide : '+key);return v;}
  if(typeof t==='boolean'){if(typeof v!=='boolean')throw Error('Option invalide : '+key);return v;}
  if(Array.isArray(t)){
   if(!Array.isArray(v)||v.length>100)throw Error('Liste invalide : '+key);
   if(['keys','activityIds','requiresPurchaseIds','enabled','favorites','compareIds','completed'].includes(key)){if(v.some(x=>typeof x!=='string'||x.length>160))throw Error('Identifiant invalide.');return [...new Set(v)].slice(0,key==='compareIds'?3:100);}
   if(key==='assets'){if(v.length<1||v.length>40)throw Error('Un à quarante achats par scénario.');return v.map(x=>walk(assetTemplate,x,'asset'));}
   if(key==='activities'){if(v.length!==initial.activities.length)throw Error('Nombre d’activités personnelles incompatible.');return v.map((x,i)=>walk(initial.activities[i],x,'activity'));}
   if(key==='allocations'&&v.length!==5)throw Error('Répartition du budget incompatible.');
   return v.map((x,i)=>walk(t[i]===undefined?t[0]:t[i],x,key));
  }
  if(!v||typeof v!=='object'||Array.isArray(v))throw Error('Paramètres incomplets : '+key);
  const o={};for(const k of Object.keys(t))o[k]=walk(t[k],v[k],k);return o;
 }
 const s=walk(initial,raw,'scenario');
 if(![...tools,'plan'].includes(s.tab)||!['quick','guided','advanced'].includes(s.mode)||!['continuous','cycles'].includes(s.model))throw Error('Outil ou mode invalide.');
 if(!asset(s,s.purchase.key)||!asset(s,s.roi.key))throw Error('Référence interne d’achat absente. La sauvegarde ne peut pas être restaurée.');
 if(!['all','vehicle','weapon','property','business','place','hideout','style','customization','consumable','ammo','housing','activity'].includes(s.catalogue.type)||!['all','known','unknown','manual','official','verified','estimated'].includes(s.catalogue.status)||!['name','price-up','price-down'].includes(s.catalogue.sort))throw Error('Filtre de catalogue incompatible.');
 if(s.activities.some((a,i)=>a.id!==initial.activities[i].id))throw Error('Référence d’activité invalide.');
 if(new Set(s.assets.map(a=>a.key)).size!==s.assets.length||s.assets.some(a=>!a.key||!['none','personal','roi'].includes(a.incomeMode)))throw Error('Références d’achats incompatibles.');
 if(!['estimate','new','improve','continuous'].includes(s.roi.mode)||!['basket','manual'].includes(s.budget.source))throw Error('Modèle de calcul incompatible.');
 if(!['value','cheapest','fastest','profit','utility'].includes(s.compare.criterion)||!['purchase','amount'].includes(s.plan.kind)||!['balanced','fast','safe'].includes(s.plan.priority))throw Error('Réglage de comparaison ou de plan incompatible.');
 s.compare.keys=s.compare.keys.filter(k=>asset(s,k)).slice(0,6);if(s.plan.key&&!asset(s,s.plan.key))s.plan.key='';
 s.assets.forEach(a=>{if(!Number.isInteger(a.utility)||a.utility<1||a.utility>5)a.utility=3;});
 for(const t of [...tools,'plan'])if(!['quick','guided','advanced'].includes(s.views[t]))s.views[t]='quick';
 s.mode=s.views[s.tab];return s;
}
function activities(s,source=[]){return [...s.activities.map(a=>({...a,status:'manual',investment:a.owned?0:a.investment})),...source];}
function eligible(s,source=[]){
 const owned=s.assets.filter(a=>a.owned).map(a=>a.itemId).filter(Boolean);
 return activities(s,source).filter(a=>s.session.enabled.includes(a.id)&&a.players<=s.goal.players&&(a.requiresPurchaseIds||[]).every(id=>owned.includes(id)));
}
function purchase(s,source=[]){const a=asset(s,s.purchase.key)||{...assetTemplate,price:null};let boost=a.incomeMode==='personal'?a.boostHourly:0;if(a.incomeMode==='roi'){const r=roi(s,source);boost=s.roi.key===a.key&&['new','improve'].includes(s.roi.mode)&&r.valid&&Number.isFinite(r.netHourly)?Math.max(0,r.netHourly):null;}return {...a,extras:a.extras===null||a.fees===null?null:a.extras+a.fees,capital:s.goal.capital,reserve:s.goal.reserve,target:s.goal.target,hourly:s.goal.hourly,boostHourly:boost};}
function goal(s,source=[]){
 const g=s.goal;if(s.model==='continuous')return E.goalContinuous(g);
 if(!Number.isInteger(g.players)||g.players<1||g.players>100)return{valid:false,reason:'Écris un nombre de joueurs entre 1 et 100.'};
 const all=activities(s,source), compatible=all.filter(a=>a.players<=g.players&&(a.requiresPurchaseIds||[]).every(id=>s.assets.some(x=>x.itemId===id&&x.owned)));
 if(g.selected==='mixed')return E.goalMixed({...g,target:g.target===null?null:g.target+g.reserve,activities:compatible.filter(a=>s.activities.some(x=>x.id===a.id))});
 const a=compatible.find(a=>a.id===g.selected);if(!a){const excluded=all.find(a=>a.id===g.selected);return{valid:false,reason:excluded&&excluded.players>g.players?'Ce scénario se joue à '+excluded.players+' joueurs ; vous êtes '+g.players+'.':'Choisis une activité compatible avec ton groupe et tes achats possédés.'};}
 return E.goal({...g,target:g.target===null?null:g.target+g.reserve,activity:a});
}
function session(s,source=[]){
 if(!Number.isInteger(s.goal.players)||s.goal.players<1||s.goal.players>100)return{valid:false,reason:'Dis si tu joues seul ou à plusieurs dans Mes activités.'};
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
function roi(s,source=[]){
 const r=s.roi,a=asset(s,r.key);if(!a)return{valid:false,reason:'Choisis un achat dans la liste.'};
 if(r.mode==='estimate')return decision(s,source);
 const input={...r,purchase:a.price,upgrades:a.extras,fees:a.fees};
 if(r.mode==='continuous')return E.roi(input);
 const acts=activities(s,source).filter(a=>r.activityIds.includes(a.id));
 if(acts.length!==r.activityIds.length)return{valid:false,reason:'Une des activités n’existe plus. Choisis-en une autre.'};
 if(acts.some(a=>a.players>s.goal.players))return{valid:false,reason:'Une des activités se joue à plus de joueurs que vous. Change le nombre de joueurs dans Mes activités.'};
 return E.investmentActivities({...input,activities:acts});
}
function decision(s,source=[],key=s.roi.key){
 const a=asset(s,key);if(!a)return{valid:false,reason:'Choisis un achat ou écris un achat libre.'};
 let hourly=s.goal.hourly;
 if(s.roi.recoveryActivity){const activity=activities(s,source).find(x=>x.id===s.roi.recoveryActivity),r=activity&&E.activity(activity);hourly=r?.valid&&r.hourly>=0?r.hourly:null;}
 return E.worth({capital:s.goal.capital,reserve:s.goal.reserve,price:a.price,extras:a.extras,fees:a.fees,hourly,hours:s.roi.hours});
}
function blank(current){
 const s=copy(current);s.name='Mon calcul';s.model='continuous';s.completed=[];
 s.goal={...s.goal,capital:null,target:null,hourly:null,dailyMinutes:null,reserve:0,players:1,selected:'scenario-a'};
 s.assets=[{...copy(assetTemplate),price:null}];s.purchase={key:'free-1'};
 s.roi={...s.roi,key:'free-1',mode:'estimate',hours:null,gainPercent:0,durationReduction:0,activityIds:[],revenueHourly:null,costHourly:0,compareKey:'',recoveryActivity:''};
 s.order={keys:[]};s.budget={source:'manual',extra:0,allocations:[0,0,0,0,0]};s.compare={...copy(compareTemplate)};s.plan={...copy(planTemplate),key:''};
 s.activities=s.activities.map((a,i)=>({...a,name:'Mon activité '+String.fromCharCode(65+i),reward:null,duration:null,cost:0,prep:0,cooldown:0,share:100,investment:0,players:1,owned:false,prepOnce:false,requiresPurchaseIds:[]}));
 s.session={...s.session,enabled:['scenario-a'],minutes:null,usualMinutes:null,daysPerWeek:null};s.inverse={selected:'scenario-a',minutes:null};
 return s;
}
function orderInput(s,source=[]){
 const items=s.order.keys.map(key=>{const a=asset(s,key);if(!a)return{name:'Achat absent',price:null};let boost=0;
  if(a.incomeMode==='personal')boost=a.boostHourly;
  if(a.incomeMode==='roi'){const r=roi(s,source);boost=s.roi.key===key&&['new','improve'].includes(s.roi.mode)&&r.valid&&Number.isFinite(r.netHourly)?Math.max(0,r.netHourly):null;}
  return{name:a.name+(a.owned?' (déjà possédé)':''),price:a.owned?0:a.price===null||a.extras===null||a.fees===null?null:a.price+a.extras+a.fees,boostHourly:a.owned?0:boost};});
 return {capital:s.goal.capital,reserve:s.goal.reserve,hourly:s.goal.hourly,items};
}
function budgetInput(s){const allocations=s.budget.source==='basket'?s.order.keys.map(k=>{const a=asset(s,k);return a?.owned?0:!a||a.price===null||a.extras===null||a.fees===null?null:a.price+a.extras+a.fees;}):s.budget.allocations.slice();allocations.push(s.budget.extra);return{capital:s.goal.capital,reserve:s.goal.reserve,allocations};}
function chooseInput(s,source=[]){
 const items=s.compare.keys.map(k=>{const a=asset(s,k);if(!a)return null;let income=null;if(a.incomeMode==='personal'&&a.boostHourly>0)income=a.boostHourly;if(a.incomeMode==='roi'){const r=roi(s,source);if(s.roi.key===k&&['new','improve','continuous'].includes(s.roi.mode)&&r.valid&&Number.isFinite(r.netHourly)&&r.netHourly>0)income=r.netHourly;}
  return {name:a.name,price:a.owned?0:a.price,extras:a.extras,fees:a.fees,utility:a.utility,incomeHourly:income};}).filter(Boolean);
 return {capital:s.goal.capital,reserve:s.goal.reserve,hourly:s.goal.hourly,dailyMinutes:s.goal.dailyMinutes,hours:s.compare.hours,criterion:s.compare.criterion,items};
}
function planHourly(s,source=[]){if(!s.plan.activity)return s.goal.hourly;const a=activities(s,source).find(x=>x.id===s.plan.activity);const r=a&&E.activity(a);return r?.valid&&Number.isFinite(r.hourly)?r.hourly:null;}
function planInput(s,source=[]){
 const goalAsset=s.plan.kind==='purchase'?asset(s,s.plan.key):null;
 const prerequisites=s.plan.usePrerequisites?s.order.keys.filter(k=>k!==s.plan.key).map(k=>{const a=asset(s,k);if(!a||a.owned)return null;return {name:a.name,price:a.price===null||a.extras===null||a.fees===null?null:a.price+a.extras+a.fees,boostHourly:a.incomeMode==='personal'?a.boostHourly:0};}).filter(Boolean):[];
 let goalIncome=0;if(goalAsset){if(goalAsset.incomeMode==='personal')goalIncome=goalAsset.boostHourly;if(goalAsset.incomeMode==='roi'){const r=roi(s,source);if(s.roi.key===goalAsset.key&&r.valid&&Number.isFinite(r.netHourly)&&r.netHourly>0)goalIncome=r.netHourly;}}
 return {capital:s.goal.capital,reserve:s.plan.priority==='safe'?s.goal.reserve:s.plan.priority==='fast'?0:s.goal.reserve,hourly:planHourly(s,source),dailyMinutes:s.goal.dailyMinutes,daysPerWeek:s.session.daysPerWeek==null?7:s.session.daysPerWeek,upkeepPerSession:s.plan.upkeepPerSession==null?0:s.plan.upkeepPerSession,
  goalName:goalAsset?goalAsset.name:null,goalPrice:goalAsset?(goalAsset.price===null||goalAsset.extras===null||goalAsset.fees===null?null:goalAsset.price+goalAsset.extras+goalAsset.fees):null,goalIncomeHourly:goalIncome,target:s.plan.kind==='amount'?(s.plan.target===null?s.goal.target:s.plan.target):null,prerequisites};
}
function evaluate(tool,s,source=[]){
 if(tool==='compare')return E.choose(chooseInput(s,source));
 if(tool==='plan'){const i=planInput(s,source);if(s.plan.kind==='purchase'&&!asset(s,s.plan.key))return{valid:false,reason:'Choisis ce que tu veux acheter, ou dis-moi la somme que tu veux avoir.'};if(i.hourly===null)return{valid:false,reason:'Écris ce que tu gagnes par heure, ou choisis une activité avec des chiffres.'};return E.businessPlan(i);}
 if(tool==='goal')return goal(s,source);if(tool==='session')return session(s,source);if(tool==='roi')return roi(s,source);if(tool==='order')return E.order(orderInput(s,source));if(tool==='budget')return E.budget(budgetInput(s));
 if(tool==='purchase'){const p=purchase(s,source);return E.purchase({...p,capital:p.capital===null||p.reserve===null?null:p.capital-p.reserve,price:p.price===null||p.extras===null?null:p.price+p.extras});}
 if(tool==='activities'){if(!Number.isInteger(s.goal.players)||s.goal.players<1||s.goal.players>100)return{valid:false,reason:'Écris un nombre de joueurs entre 1 et 100.'};const a=activities(s,source).find(a=>a.id===s.inverse.selected);if(!a)return{valid:false,reason:'Choisis une activité.'};if(a.players>s.goal.players)return{valid:false,reason:'Cette activité se joue à '+a.players+' joueurs ; vous êtes '+s.goal.players+'. Ajuste ton groupe ou choisis un scénario solo.'};if((a.requiresPurchaseIds||[]).some(id=>!s.assets.some(x=>x.itemId===id&&x.owned)))return{valid:false,reason:'Il te manque un achat pour cette activité. Coche « Je l’ai déjà » dans Quoi acheter d’abord.'};return E.inverse({...s.inverse,capital:s.goal.capital,reserve:s.goal.reserve,activity:a});}
 return{valid:false,reason:'Choisis un outil.'};
}
const metrics={compare:['bestWaitHours','Temps de jeu avant d’avoir le choix retenu','h',-1],goal:['totalMinutes','Temps de jeu pour mon objectif','min',-1],session:['profit','Gagné pendant la partie','$',1],activities:['profit','Gagné, achat de départ enlevé','$',1],roi:['netProfit','Gagné au final, prix enlevé','$',1],purchase:['remaining','Ce qu’il me reste après l’achat','$',1],order:['totalHours','Temps de jeu jusqu’au dernier achat','h',-1],budget:['available','Ce qu’il me reste, sans l’argent mis de côté','$',1]};
function metric(tool,s){return tool==='roi'&&s.roi.mode==='estimate'?['remaining','Ce qu’il me reste après cet achat','$',1]:metrics[tool];}
function sensitivity(tool,s,source=[]){
 let path,label,sourceInput=false;
 function reward(id){let i=s.activities.findIndex(a=>a.id===id),a=s.activities[i];if(i<0){i=source.findIndex(a=>a.id===id);a=source[i];sourceInput=true;}if(!a)return;path=sourceInput?[i,'reward']:['activities',i,'reward'];label='Récompense de '+a.name+' uniquement';}
 if(tool==='goal'){if(s.model==='continuous'){path=['goal','hourly'];label='Gain net horaire : +20 % = revenu plus élevé';}else{const owned=s.assets.filter(a=>a.owned).map(a=>a.itemId),candidate=s.activities.find(a=>a.players<=s.goal.players&&(a.requiresPurchaseIds||[]).every(id=>owned.includes(id))&&E.activity(a).valid);reward(s.goal.selected==='mixed'?candidate?.id:s.goal.selected);}}
 if(tool==='activities')reward(s.inverse.selected);
 if(tool==='session'){const r=session(s,source),id=r.valid?r.timeline.find(x=>x.net>0)?.id:null;reward(id||eligible(s,source).find(a=>E.activity(a).valid)?.id);}
 if(['roi','purchase'].includes(tool)){const i=s.assets.findIndex(a=>a.key===(tool==='roi'?s.roi.key:s.purchase.key));if(i<0)return null;path=['assets',i,'price'];label='Prix d’achat : +20 % = achat plus cher';}
 if(tool==='order'||tool==='compare'){path=['goal','hourly'];label='Ce que tu gagnes par heure : +20 % = tu attends moins';}
 if(tool==='budget'){const first=s.budget.source==='basket'?s.assets.findIndex(a=>a.key===s.order.keys[0]):-1;path=first>=0?['assets',first,'price']:s.budget.source==='manual'?['budget','allocations',0]:['budget','extra'];label='Coût du premier poste du budget uniquement';}
 if(!path)return null;let value=sourceInput?source:s;for(const k of path)value=value[k];
 return{label,rows:[.8,1,1.2].map(f=>{const c=copy(s),sources=sourceInput?copy(source):source;let p=sourceInput?sources:c;path.slice(0,-1).forEach(k=>p=p[k]);const v=Number.isFinite(value)?Math.min(1e12,value*f):null;p[path.at(-1)]=v;return{factor:f,value:v,bounded:Number.isFinite(value)&&value*f>1e12,result:evaluate(tool,c,sources)};})};
}
function signature(s){const c=copy(s);delete c.name;delete c.mode;delete c.views;delete c.tab;delete c.catalogue;delete c.completed;return JSON.stringify(c);}
function referenceWarnings(s,catalogue){const out=[];s.assets.forEach(a=>{if(!a.itemId)return;const item=catalogue.find(x=>x.id===a.itemId);if(!item)out.push(a.name+' : cette fiche n’existe plus, ton prix est gardé.');else if(a.referencePrice!==item.price)out.push(item.name+' : le prix du site a changé ; vérifie ton chiffre.');});return out;}
function initial(dataVersion,presets){return defaults({version:2,dataVersion,mode:'quick',model:'continuous',name:'Mon premier million',tab:'goal',goal:{capital:200000,target:1000000,hourly:100000,reserve:0,dailyMinutes:60,players:1,selected:'scenario-a'},activities:presets.map(a=>({id:a.id,name:a.name,reward:a.reward,cost:a.cost,duration:a.duration,prep:a.prep,cooldown:a.cooldown,share:a.share,investment:a.investment,players:a.players,owned:false})),session:{minutes:60,maxRepeat:100,enabled:['scenario-a','scenario-b','scenario-c']},inverse:{minutes:60,selected:'scenario-a'},purchase:{itemId:'',price:100000,hourly:50000,boostHourly:0,capital:200000,target:1000000,reserve:0,extras:0},catalogue:{query:'',type:'all',status:'all',maxPrice:null,sort:'name',favorites:[],compareIds:[],favoritesOnly:false}});}
return Object.freeze({copy,tools,names,defaults,initial,validate,migrate,asset,addAsset,activities,eligible,purchase,goal,session,projection,roi,decision,blank,orderInput,budgetInput,chooseInput,planInput,planHourly,evaluate,metrics,metric,sensitivity,signature,referenceWarnings});
});
