'use strict';
/* v7.46 (lot 9) : envoi du formulaire de Contact (canal B). Seule fonction serveur du site : fichier du dossier /api,
   détecté par Vercel sans configuration (runtime Node.js, https://vercel.com/docs/functions/runtimes/node-js,
   « Create a Node.js function in /api »), sans package.json ni dépendance (fetch natif de Node).
   Reçoit un POST JSON, vérifie champ piège, délai minimal, débit, origine et longueurs, puis envoie un e-mail par l'API
   transactionnelle de Brevo (POST https://api.brevo.com/v3/smtp/email). Variables d'environnement Vercel :
   BREVO_API_KEY (obligatoire), CONTACT_TO (boîte de réception, jamais écrite dans le dépôt ; sinon l'adresse publique).
   Rien n'est conservé : pas de base, pas de fichier, aucun contenu de message dans les journaux. Le compteur anti-abus
   garde en mémoire vive, dix minutes au plus, une empreinte (SHA-256 tronquée) de l'adresse IP. */
const crypto=require('node:crypto');

const PUBLIC_ADDRESS='contact@leonidakit.com';
const SENDER={name:'Leonidakit',email:PUBLIC_ADDRESS};
const TOPICS=['Erreur dans une fiche','Suggestion de contenu','Problème de calcul ou d’affichage','Demande concernant un visuel','Réponse de Léo à corriger','Question sur le site','Question sur mes données'];
const LIMITS={details:[10,5000],page:1000,source:1000,email:254,body:20000};
const MIN_DELAY_MS=3000,MAX_AGE_MS=24*3600*1000,WINDOW_MS=10*60*1000,MAX_PER_WINDOW=5,SEND_TIMEOUT_MS=8000;
const ORIGINS=[/^https:\/\/(?:www\.)?leonidakit\.com$/,/^https:\/\/[a-z0-9-]+\.vercel\.app$/,/^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/];
const hits=new Map();

const clean=(v,max)=>typeof v==='string'?v.replace(/\r\n?/g,'\n').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g,'').trim().slice(0,max):'';
const isEmail=v=>/^[^\s<>@,;"]+@[^\s<>@,;"]+\.[^\s<>@,;"]{2,}$/.test(v)&&v.length<=LIMITS.email;
const isURL=v=>{try{const u=new URL(v);return u.protocol==='https:'||u.protocol==='http:';}catch{return false;}};
const escapeHTML=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/* Numéro de référence lisible : LK-AAAAMMJJ-XXXXXX (base 32 sans lettres ambiguës). */
function reference(now=new Date()){const A='23456789ABCDEFGHJKLMNPQRSTUVWXYZ',b=crypto.randomBytes(6);let r='';for(const x of b)r+=A[x%A.length];return 'LK-'+now.toISOString().slice(0,10).replace(/-/g,'')+'-'+r;}

/* Contrôle des champs : renvoie {ok, data} ou {ok:false, status, code, field, message}. */
function validate(body,now=Date.now()){
 if(!body||typeof body!=='object'||Array.isArray(body))return {ok:false,status:400,code:'format',message:'Le message n’a pas pu être lu.'};
 if(typeof body.website==='string'&&body.website.trim()!=='')return {ok:false,status:400,code:'refused',message:'Le message n’a pas pu être envoyé.'};
 const started=Number(body.startedAt);
 if(!Number.isFinite(started)||now-started<MIN_DELAY_MS)return {ok:false,status:429,code:'too-fast',message:'Envoi trop rapide : relis ton message puis réessaie dans quelques secondes.'};
 if(now-started>MAX_AGE_MS)return {ok:false,status:400,code:'stale',message:'La page est ouverte depuis trop longtemps : recharge-la puis réessaie.'};
 const topic=clean(body.topic,80);if(!TOPICS.includes(topic))return {ok:false,status:400,code:'field',field:'topic',message:'Choisis un motif dans la liste.'};
 const details=clean(body.details,LIMITS.details[1]+1);
 if(details.length<LIMITS.details[0])return {ok:false,status:400,code:'field',field:'details',message:'Décris ce que tu as remarqué en quelques mots (10 caractères au moins).'};
 if(details.length>LIMITS.details[1])return {ok:false,status:400,code:'field',field:'details',message:'Le message dépasse 5 000 caractères.'};
 const page=clean(body.page,LIMITS.page+1);if(page&&(page.length>LIMITS.page||!isURL(page)))return {ok:false,status:400,code:'field',field:'page',message:'L’adresse de la page n’est pas valide.'};
 const source=clean(body.source,LIMITS.source+1);if(source&&(source.length>LIMITS.source||!isURL(source)))return {ok:false,status:400,code:'field',field:'source',message:'Le lien de la source n’est pas valide.'};
 const email=clean(body.email,LIMITS.email+1);if(email&&!isEmail(email))return {ok:false,status:400,code:'field',field:'email',message:'Ton adresse e-mail ne semble pas valide (elle est facultative).'};
 return {ok:true,data:{topic,details,page,source,email}};
}

/* Limite de débit par instance : cinq envois par empreinte d'IP et par tranche de dix minutes. */
function limited(ip,now=Date.now()){
 const key=crypto.createHash('sha256').update(String(ip||'inconnue')).digest('hex').slice(0,16);
 for(const [k,list] of hits){const kept=list.filter(t=>now-t<WINDOW_MS);if(kept.length)hits.set(k,kept);else hits.delete(k);}
 const list=hits.get(key)||[];if(list.length>=MAX_PER_WINDOW)return true;list.push(now);hits.set(key,list);return false;
}

function composeEmail(data,ref,to){
 const lines=['Référence : '+ref,'Motif : '+data.topic,'Page : '+(data.page||'non précisée'),'Source : '+(data.source||'non précisée'),'Adresse pour répondre : '+(data.email||'non donnée'),'','Message :',data.details,'','—','Envoyé depuis le formulaire de https://www.leonidakit.com/contact.html. Le site ne conserve pas ce message.'];
 const text=lines.join('\n');
 const payload={sender:SENDER,to:[{email:to}],subject:'[Leonidakit] '+data.topic+' — '+ref,textContent:text,htmlContent:'<!doctype html><html><body><pre style="font:14px/1.5 monospace;white-space:pre-wrap">'+escapeHTML(text)+'</pre></body></html>',tags:['contact']};
 if(data.email)payload.replyTo={email:data.email};
 return payload;
}

async function send(payload,env,fetchImpl){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),SEND_TIMEOUT_MS);
 try{const r=await fetchImpl('https://api.brevo.com/v3/smtp/email',{method:'POST',headers:{'api-key':env.BREVO_API_KEY,'content-type':'application/json',accept:'application/json'},body:JSON.stringify(payload),signal:controller.signal});return r.status===201||r.status===200||r.status===202?{ok:true}:{ok:false,status:r.status};}
 catch(e){return {ok:false,status:0};}
 finally{clearTimeout(timer);}
}

async function readBody(req){
 if(req.body!==undefined){if(typeof req.body==='string'){try{return JSON.parse(req.body);}catch{return null;}}return req.body;}
 return await new Promise(resolve=>{let size=0,chunks=[];req.on('data',c=>{size+=c.length;if(size>LIMITS.body){resolve(null);req.destroy?.();return;}chunks.push(c);});req.on('end',()=>{try{resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));}catch{resolve(null);}});req.on('error',()=>resolve(null));});
}

function reply(res,status,obj,extra={}){res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');for(const [k,v] of Object.entries(extra))res.setHeader(k,v);res.end(JSON.stringify(obj));}

function createHandler(options={}){
 const env=options.env||process.env,fetchImpl=options.fetch||globalThis.fetch,clock=options.now||(()=>Date.now());
 return async function handler(req,res){
  if(req.method!=='POST')return reply(res,405,{ok:false,code:'method',message:'Seul l’envoi du formulaire est accepté ici.'},{Allow:'POST'});
  const origin=req.headers?.origin;if(origin&&!ORIGINS.some(re=>re.test(origin)))return reply(res,403,{ok:false,code:'origin',message:'Envoi refusé depuis cette adresse.'});
  if(!/application\/json/i.test(String(req.headers?.['content-type']||'')))return reply(res,415,{ok:false,code:'format',message:'Le message n’a pas pu être lu.'});
  if(Number(req.headers?.['content-length']||0)>LIMITS.body)return reply(res,413,{ok:false,code:'size',message:'Le message est trop long.'});
  let body;try{body=await readBody(req);}catch{body=null;}
  const now=clock(),v=validate(body,now);if(!v.ok)return reply(res,v.status,{ok:false,code:v.code,field:v.field||null,message:v.message,fallback:v.code==='refused'?false:undefined});
  const ip=String(req.headers?.['x-forwarded-for']||'').split(',')[0].trim()||req.socket?.remoteAddress||'';
  if(limited(ip,now))return reply(res,429,{ok:false,code:'rate',message:'Trop d’envois en peu de temps : réessaie dans dix minutes, ou écris directement à '+PUBLIC_ADDRESS+'.',fallback:true});
  if(!env.BREVO_API_KEY||typeof fetchImpl!=='function')return reply(res,503,{ok:false,code:'config',message:'L’envoi n’est pas disponible pour le moment. Écris directement à '+PUBLIC_ADDRESS+' : ton texte est prêt à copier.',fallback:true});
  const to=isEmail(String(env.CONTACT_TO||'').trim())?String(env.CONTACT_TO).trim():PUBLIC_ADDRESS;
  const ref=reference(new Date(now)),sent=await send(composeEmail(v.data,ref,to),env,fetchImpl);
  if(!sent.ok){console.error('contact: envoi refusé par le service ('+sent.status+')');return reply(res,502,{ok:false,code:'send',message:'Le message n’est pas parti. Écris directement à '+PUBLIC_ADDRESS+' : ton texte est prêt à copier.',fallback:true});}
  return reply(res,200,{ok:true,ref,message:'Message envoyé. Garde ta référence : '+ref+'.'});
 };
}

module.exports=createHandler();
module.exports.createHandler=createHandler;
module.exports._test={validate,limited,reference,composeEmail,TOPICS,PUBLIC_ADDRESS,reset:()=>hits.clear()};
