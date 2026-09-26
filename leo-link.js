/* Contrat limité des liens Léo v1. Aucun calcul économique ni texte de conversation. */
(function(root,factory){'use strict';if(typeof module==='object'&&module.exports)module.exports=factory();else root.LKLeoLink=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const VERSION=1,MAX_LENGTH=2600,tools=['goal','session','activities','purchase','roi','order','budget','compare','plan'];
const limits={capital:[0,1e12],target:[0,1e12],hourly:[0,1e12],reserve:[0,1e12],price:[0,1e12],minutes:[1,1440],dailyMinutes:[1,1440],players:[1,100]};
const record=x=>!!x&&typeof x==='object'&&!Array.isArray(x),copy=x=>JSON.parse(JSON.stringify(x));
const safeId=x=>typeof x==='string'&&/^[a-z0-9][a-z0-9:_-]{0,159}$/i.test(x)&&!['constructor','prototype','__proto__'].includes(x);
function safeReturn(value){if(typeof value!=='string'||value.length>220)return null;if(value==='/')return '/';if(!/^\/(?:[a-z0-9-]+\/)?[a-z0-9-]+\.html(?:#[a-z0-9][a-z0-9=_-]{0,159})?$/i.test(value))return null;return value;}
function values(input){if(!record(input)||Object.keys(input).some(k=>!Object.hasOwn(limits,k)))throw Error('Paramètres de calcul non reconnus.');const out={};for(const [key,value] of Object.entries(input)){const [min,max]=limits[key];if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max||(key==='players'&&!Number.isInteger(value)))throw Error('Valeur invalide pour '+key+'.');out[key]=value;}return out;}
function validate(raw){if(!record(raw)||raw.v!==VERSION||!tools.includes(raw.tool)||Object.keys(raw).some(k=>!['v','tool','values','items','back'].includes(k)))throw Error('Lien Léo non reconnu.');const items=raw.items===undefined?[]:raw.items;if(!Array.isArray(items)||items.length>8||items.some(x=>!safeId(x)))throw Error('Sélection d’achats invalide.');const val=values(raw.values===undefined?{}:raw.values);if(Object.hasOwn(val,'price')&&items.length>1)throw Error('Précise le prix de chaque achat dans le calculateur.');const back=raw.back===undefined?null:safeReturn(raw.back);if(raw.back!==undefined&&!back)throw Error('Page de retour invalide.');return {v:VERSION,tool:raw.tool,values:val,items:[...new Set(items)],...(back?{back}:{})};}
function fromURL(search){const q=new URLSearchParams(search);if(!q.has('leo'))return null;if(q.getAll('leo').length!==1)throw Error('Lien Léo répété.');const s=q.get('leo');if(s.length>MAX_LENGTH)throw Error('Lien Léo trop long.');try{return validate(JSON.parse(s));}catch(e){throw Error('Lien Léo invalide : '+e.message);}}
function toURL(raw){const request=validate(raw),json=JSON.stringify(request);if(json.length>MAX_LENGTH)throw Error('Lien Léo trop long.');return '/calculateurs.html?'+new URLSearchParams({leo:json})+'#atelier';}
function apply(raw,base,initial,B,catalogue,mode,source=[]){
 const req=validate(raw);if(!['new','merge'].includes(mode))throw Error('Choisis un nouveau calcul ou de compléter le calcul en cours.');
 const selected=req.items.map(id=>{const item=catalogue.find(x=>x.id===id);if(!item||item.purchaseCandidate===false||item.type==='place')throw Error('Une fiche du lien n’est plus disponible pour cet outil : '+id+'.');return item;});
 const s=copy(mode==='new'?initial:base),v=req.values;
 if(mode==='new'){s.name='Mon calcul préparé avec Léo';s.goal.capital=null;s.goal.target=null;s.goal.hourly=null;s.assets[0].price=null;s.session.enabled=[];/* le temps de jeu par jour et la durée d’une partie gardent leurs valeurs de départ (réglages) ; les activités à faire restent à cocher */}
 for(const k of ['capital','target','hourly','reserve','players','dailyMinutes'])if(Object.hasOwn(v,k))s.goal[k]=v[k];
 if(Object.hasOwn(v,'hourly'))s.model='continuous';
 if(Object.hasOwn(v,'minutes')){s.session.minutes=v.minutes;s.inverse.minutes=v.minutes;}
 if(Object.hasOwn(v,'dailyMinutes')){s.session.usualMinutes=v.dailyMinutes;if(!Object.hasOwn(v,'minutes')){s.session.minutes=v.dailyMinutes;s.inverse.minutes=v.dailyMinutes;}}
 if(s.goal.capital!==null&&s.goal.reserve!==null&&s.goal.reserve>s.goal.capital)throw Error('Ce que tu as est plus petit que l’argent gardé de côté. Change l’argent de côté, ou commence un nouveau calcul.');
 const assets=selected.map(item=>B.addAsset(s,item));
 if(assets.length){s.purchase.key=assets[0].key;if(req.tool==='roi'){s.roi.key=assets[0].key;s.roi.mode='estimate';s.roi.activityIds=B.activities(s,source).filter(a=>selected[0].activityIds?.includes(a.id)||a.purchaseIds?.includes(selected[0].id)).map(a=>a.id);}if(req.tool==='order')s.order.keys=[...new Set([...s.order.keys,...assets.map(a=>a.key)])];if(req.tool==='compare'){s.compare=s.compare||{keys:[]};s.compare.keys=[...new Set([...(s.compare.keys||[]),...assets.map(a=>a.key)])].slice(0,6);}}
 if(Object.hasOwn(v,'price')){const a=B.asset(s,req.tool==='roi'?s.roi.key:s.purchase.key);a.price=v.price;}
 if(req.tool==='plan'){/* Le plan a ses propres cases : Léo y copie ce qu'il a compris, sans lien avec les huit calculs. */
  if(mode==='new'){s.plan.situation.capital=null;s.plan.situation.hourly=null;s.plan.goal.target=null;}
  const si=s.plan.situation;s.plan.situation={...si,capital:Object.hasOwn(v,'capital')?v.capital:si.capital,reserve:Object.hasOwn(v,'reserve')?v.reserve:si.reserve,hourly:Object.hasOwn(v,'hourly')?v.hourly:si.hourly,dailyMinutes:Object.hasOwn(v,'dailyMinutes')?v.dailyMinutes:(Object.hasOwn(v,'minutes')?v.minutes:si.dailyMinutes)};if(Object.hasOwn(v,'hourly'))s.plan.source='hourly';s.plan.variant='auto';
  if(selected.length){const first=selected[0];s.plan.goal={...s.plan.goal,kind:'purchase',name:first.name,itemId:first.id,referencePrice:first.price,price:Object.hasOwn(v,'price')?v.price:first.price};selected.slice(1,21).forEach((item,i)=>{if(!s.plan.prerequisites.some(x=>x.itemId===item.id))s.plan.prerequisites.push({id:'p-leo-'+i,name:item.name,itemId:item.id,referencePrice:item.price,price:item.price,boostHourly:0,owned:false});});}
  else if(Object.hasOwn(v,'target')){s.plan.goal={...s.plan.goal,kind:'amount',target:v.target};}}
 s.tab=req.tool;s.mode=s.views[req.tool]||'quick';s.completed=[];
 return B.validate(s,initial);
}
return Object.freeze({VERSION,MAX_LENGTH,limits,tools,safeId,safeReturn,values,validate,fromURL,toURL,apply});
});
