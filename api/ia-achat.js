'use strict';
/* v7.69 : crédit IA payant de Leonidakit (demande de Téva du 06/10/2026) : au-delà des questions gratuites, le visiteur
   peut acheter du crédit ; chaque question en consomme son prix réel chez Anthropic plus la marge (api/ia.js).
   Fonction Node.js du dossier /api (comme api/contact.js et api/ia.js), fetch natif, aucune dépendance.
   Fermée tant que les quatre réglages ne sont pas posés dans Vercel : LK_IA_VENTE=oui, STRIPE_SECRET_KEY (clé secrète
   Stripe), LK_IA_SEL (phrase secrète de 16 caractères au moins, posée une fois pour toutes : les codes achetés sont
   retrouvés par leur empreinte salée avec elle ; la changer rendrait les crédits introuvables), base Redis d'Upstash
   reliée au projet (KV_REST_API_URL / KV_REST_API_TOKEN). Facultatif : LK_IA_PACKS
   (montants proposés en euros, « 3,5,10 » par défaut), LK_IA_FRAIS (frais de paiement retenus, « 0.25+1.5% » par défaut).
   Le visiteur n'a pas de compte : son crédit est attaché à un code (LK-XXXX-XXXX-XXXX-XXXX) gardé dans son navigateur
   (lk_ia_jeton) et qu'il peut noter. La base ne garde que l'empreinte salée du code, le solde et les paiements en
   attente ; le paiement lui-même se fait chez Stripe (page Stripe Checkout).
   Actions (POST JSON) :
   - creer   : {pack, jeton?, retour, renonce:true} → session Stripe Checkout ; renvoie {url, jeton}. Le code est créé ici
               s'il n'existe pas, et la page le garde AVANT de partir chez Stripe.
   - verifier: {jeton} → crédite les paiements réussis de ce code (une seule fois chacun) ; renvoie {solde}. */
const crypto=require('node:crypto');

const ORIGINS=[/^https:\/\/(?:www\.)?leonidakit\.com$/,/^https:\/\/[a-z0-9-]+\.vercel\.app$/,/^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/];
const TOKEN=/^LK(?:-[A-Z2-7]{4}){4}$/,SESSION=/^cs_[A-Za-z0-9_]{10,200}$/,RETURN=/^\/[a-z0-9/._-]{0,160}$/i;
const PENDING_S=40*24*3600,CREDIT_S=400*24*3600,TIMEOUT_MS=15000,BODY_MAX=4000;

function settings(env){
 const url=env.KV_REST_API_URL||env.UPSTASH_REDIS_REST_URL,token=env.KV_REST_API_TOKEN||env.UPSTASH_REDIS_REST_TOKEN;
 const kv=url&&token&&/^https:\/\//.test(url)?{url:String(url).replace(/\/+$/,''),token:String(token)}:null;
 const packs=String(env.LK_IA_PACKS||'3,5,10').split(',').map(x=>Math.round(Number(x))).filter(x=>Number.isFinite(x)&&x>=1&&x<=200).slice(0,4);
 const fm=String(env.LK_IA_FRAIS||'0.25+1.5%').match(/^\s*(\d+(?:\.\d+)?)\s*\+\s*(\d+(?:\.\d+)?)\s*%\s*$/);
 return {kv,packs:packs.length?packs:[3,5,10],feeFixed:fm?Number(fm[1]):0.25,feePct:fm?Number(fm[2])/100:0.015,stripe:env.STRIPE_SECRET_KEY||'',
  open:env.LK_IA_VENTE==='oui'&&!!env.STRIPE_SECRET_KEY&&!!kv&&String(env.LK_IA_SEL||'').length>=16,salt:String(env.LK_IA_SEL||env.ANTHROPIC_API_KEY||'leonidakit'),site:/^https:\/\/[a-z0-9.-]+$/i.test(env.LK_SITE_URL||'')?env.LK_SITE_URL:''};
}
const digest=(salt,v)=>crypto.createHash('sha256').update(salt+'|'+v).digest('hex').slice(0,32);
/* crédit en micro-euros d'un paiement : montant payé moins les frais de paiement retenus */
function creditOf(cents,st){const eur=cents/100;return Math.max(0,Math.floor((eur-(st.feeFixed+eur*st.feePct))*1e6));}
function newToken(){const A='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567',b=crypto.randomBytes(16);let s='';for(let i=0;i<16;i++)s+=A[b[i]%32];return 'LK-'+s.match(/.{4}/g).join('-');}
async function kvRun(kv,fetchImpl,cmds){
 const r=await fetchImpl(kv.url+'/pipeline',{method:'POST',headers:{Authorization:'Bearer '+kv.token,'Content-Type':'application/json'},body:JSON.stringify(cmds)});
 if(!r.ok)throw Error('kv '+r.status);const j=await r.json();if(!Array.isArray(j))throw Error('kv');
 return j.map(x=>{if(x&&x.error)throw Error('kv '+x.error);return x?x.result:null;});
}
async function stripe(st,fetchImpl,method,path,form){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),TIMEOUT_MS);
 try{const r=await fetchImpl('https://api.stripe.com/v1/'+path,{method,signal:controller.signal,headers:{Authorization:'Bearer '+st.stripe,...(form?{'Content-Type':'application/x-www-form-urlencoded'}:{})},body:form?new URLSearchParams(form).toString():undefined});
  const j=await r.json().catch(()=>null);return r.ok&&j?j:null;}catch{return null;}finally{clearTimeout(timer);}
}
async function readBody(req){
 if(req.body!==undefined){if(typeof req.body==='string'){try{return JSON.parse(req.body);}catch{return null;}}return req.body;}
 return await new Promise(resolve=>{let size=0;const chunks=[];req.on('data',c=>{size+=c.length;if(size>BODY_MAX){resolve(null);req.destroy?.();return;}chunks.push(c);});req.on('end',()=>{try{resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));}catch{resolve(null);}});req.on('error',()=>resolve(null));});
}
function reply(res,status,obj){res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.end(JSON.stringify(obj));}

/* paiements en attente de ce code : chacun n'est crédité qu'une fois (marque lkia:ok:<session>) */
async function settle(st,fetchImpl,tok){
 const h=digest(st.salt,'jeton:'+tok),bk='lkia:b:'+h,pk='lkia:s:'+h;let added=0;
 const [ids]=await kvRun(st.kv,fetchImpl,[['SMEMBERS',pk]]);
 for(const id of (Array.isArray(ids)?ids:[]).slice(0,20)){
  if(!SESSION.test(id))continue;
  const s=await stripe(st,fetchImpl,'GET','checkout/sessions/'+encodeURIComponent(id));if(!s)continue;
  if(s.payment_status==='paid'&&s.metadata&&s.metadata.jeton===h&&s.currency==='eur'&&Number.isInteger(s.amount_total)){
   const [first]=await kvRun(st.kv,fetchImpl,[['SET','lkia:ok:'+id,'1','EX',String(CREDIT_S),'NX']]);
   if(first==='OK'){const c=creditOf(s.amount_total,st);await kvRun(st.kv,fetchImpl,[['INCRBY',bk,String(c)],['EXPIRE',bk,String(CREDIT_S)]]);added+=c;}
   await kvRun(st.kv,fetchImpl,[['SREM',pk,id]]);
  }else if(s.status==='expired')await kvRun(st.kv,fetchImpl,[['SREM',pk,id]]);
 }
 const [b]=await kvRun(st.kv,fetchImpl,[['GET',bk]]);
 return {solde:b===null?0:Number(b)||0,credite:added};
}

function createHandler(options={}){
 const env=options.env||process.env,fetchImpl=options.fetch||globalThis.fetch;
 return async function handler(req,res){
  if(req.method!=='POST'){res.setHeader('Allow','POST');return reply(res,405,{ok:false,code:'method'});}
  const origin=req.headers?.origin;if(origin&&!ORIGINS.some(re=>re.test(origin)))return reply(res,403,{ok:false,code:'origin'});
  if(!/application\/json/i.test(String(req.headers?.['content-type']||'')))return reply(res,415,{ok:false,code:'format'});
  const st=settings(env);
  if(!st.kv||!st.stripe||typeof fetchImpl!=='function')return reply(res,503,{ok:false,code:'off'});
  let body;try{body=await readBody(req);}catch{body=null;}
  if(!body||typeof body!=='object')return reply(res,400,{ok:false,code:'format'});
  try{
   if(body.action==='verifier'){
    if(typeof body.jeton!=='string'||!TOKEN.test(body.jeton))return reply(res,400,{ok:false,code:'jeton'});
    const r=await settle(st,fetchImpl,body.jeton);return reply(res,200,{ok:true,...r,packs:st.packs,achat:st.open});
   }
   if(body.action==='creer'){
    if(!st.open)return reply(res,503,{ok:false,code:'ferme'});
    const pack=Math.round(Number(body.pack));if(!st.packs.includes(pack))return reply(res,400,{ok:false,code:'pack'});
    if(body.renonce!==true)return reply(res,400,{ok:false,code:'renonce'});
    const retour=typeof body.retour==='string'&&RETURN.test(body.retour)&&!body.retour.includes('..')?body.retour:'/calculateurs.html';
    const base=st.site||(origin&&ORIGINS.some(re=>re.test(origin))?origin:'https://www.leonidakit.com');
    const tok=typeof body.jeton==='string'&&TOKEN.test(body.jeton)?body.jeton:newToken(),h=digest(st.salt,'jeton:'+tok);
    const s=await stripe(st,fetchImpl,'POST','checkout/sessions',{
     mode:'payment',submit_type:'pay',locale:'auto',client_reference_id:h,
     success_url:base+retour+'?ia=paye',cancel_url:base+retour+'?ia=annule',
     'line_items[0][quantity]':'1','line_items[0][price_data][currency]':'eur','line_items[0][price_data][unit_amount]':String(pack*100),
     'line_items[0][price_data][product_data][name]':'Crédit IA Leonidakit ('+pack+' €)',
     'line_items[0][price_data][product_data][description]':'Questions à l’IA de Léo et du calculateur, au prix réel d’Anthropic plus la marge du site.',
     'metadata[jeton]':h,'metadata[renonciation]':new Date().toISOString(),'payment_intent_data[description]':'Crédit IA Leonidakit'});
    if(!s||typeof s.url!=='string'||!SESSION.test(String(s.id)))return reply(res,502,{ok:false,code:'stripe'});
    await kvRun(st.kv,fetchImpl,[['SADD','lkia:s:'+h,s.id],['EXPIRE','lkia:s:'+h,String(PENDING_S)]]);
    return reply(res,200,{ok:true,url:s.url,jeton:tok});
   }
   return reply(res,400,{ok:false,code:'action'});
  }catch(e){console.error('ia-achat : base ou paiement indisponible');return reply(res,502,{ok:false,code:'service'});}
 };
}

module.exports=createHandler();
module.exports.createHandler=createHandler;
module.exports._test={settings,creditOf,newToken,digest,TOKEN};
