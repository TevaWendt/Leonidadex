'use strict';
/* v7.67 : IA de Leonidakit (API Claude d'Anthropic), deux usages, une seule fonction serveur :
   - « calcul » : la barre « Que veux-tu calculer ? » du calculateur. L'IA lit la phrase et renvoie QUELLES CASES remplir
     (chemins du scénario, valeurs écrites par le joueur) ; elle ne calcule jamais : les chiffres de la réponse viennent du
     moteur du calculateur, dans la page. Elle peut aussi proposer deux ou trois variantes (intervalle, prudent / favorable).
   - « leo » : Léo. L'IA rédige la réponse à partir de ce que la page lui envoie (réponse locale de Léo, extraits des pages
     du site) et de rien d'autre ; elle ne cite que des liens présents dans ces éléments, ou le site officiel de Rockstar.
   Fonction Node.js du dossier /api détectée par Vercel sans configuration (comme api/contact.js), fetch natif, aucune
   dépendance. Variables d'environnement Vercel : ANTHROPIC_API_KEY (obligatoire ; sans elle, réponse 503 et la page garde
   son fonctionnement local), LK_IA_MODELE (facultatif, modèle utilisé ; par défaut Claude Haiku 4.5).
   Rien n'est conservé par le site : pas de base, pas de fichier, aucune question dans les journaux. Le compteur anti-abus
   garde en mémoire vive, dix minutes au plus, une empreinte (SHA-256 tronquée) de l'adresse IP. */
const crypto=require('node:crypto');

const MODEL_DEFAULT='claude-haiku-4-5-20251001';
const MODELS=/^claude-[a-z0-9.-]{3,60}$/;
const LANGS={fr:'français',en:'anglais',es:'espagnol',it:'italien',de:'allemand'};
const TOOLS=['goal','purchase','session','budget','order','roi','activities','compare','plan'];
const LIMITS={body:24000,question:400,page:200,local:1600,passages:6,passage:900,history:4,historyItem:400,state:3000};
const WINDOW_MS=10*60*1000,MAX_PER_WINDOW=30,TIMEOUT_MS=18000;
const ORIGINS=[/^https:\/\/(?:www\.)?leonidakit\.com$/,/^https:\/\/[a-z0-9-]+\.vercel\.app$/,/^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/];
const hits=new Map();

const clean=(v,max)=>typeof v==='string'?v.replace(/\r\n?/g,'\n').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g,'').trim().slice(0,max):'';

/* Les cases que l'IA peut remplir (chemins du scénario v6, lus par la page avec ses propres contrôles). */
const CASES=`Cases du calculateur (chemin = sens, unité). Montants en dollars du jeu, durées en minutes sauf mention.
COMMUN : goal.capital = argent que j'ai ($) · goal.reserve = argent gardé de côté, à ne jamais dépenser ($) · goal.hourly = ce que je gagne par heure de jeu ($/h) · goal.dailyMinutes = minutes de jeu par jour · goal.players = joueurs, moi compris (1 à 4)
MON OBJECTIF (goal) : goal.target = je veux avoir ($) · goal.meaning = "held" (avoir cette somme en poche) | "available" (disponible après la réserve) | "cumulative" (gagner cette somme à partir de maintenant) · model = "continuous" (je gagne tant par heure) | "cycles" (je fais des activités précises) · goal.selected = id de l'activité utilisée en mode "cycles" · goal.plannedSpend = achats à payer avant l'objectif ($) · goal.upkeepPerSession = dépenses à chaque partie ($) · goal.deadlineDays = échéance en jours
ACTIVITÉS (activities.0, activities.1, activities.2 ; utilisées par goal en "cycles", session, activities, roi "new"/"improve") : .name · .reward = récompense ($) · .cost = frais à chaque fois ($) · .duration = durée (min) · .prep = préparation (min) · .prepOnce = true si la préparation se fait une seule fois par partie · .cooldown = attente avant de recommencer (min) · .share = ma part de la récompense (%) · .players = joueurs nécessaires · .investment = achat unique avant de commencer ($)
MON TEMPS DE JEU (session) : session.minutes = temps disponible (min) · session.maxRepeat = même activité à la suite, au maximum · session.daysPerWeek · session.usualMinutes = durée habituelle d'une partie · session.enabled = liste des ids d'activités permises
MES ACTIVITÉS (activities) : inverse.minutes = temps disponible (min) · inverse.selected = id de l'activité à refaire
ACHATS (assets.N, N = index donné dans l'état) : .name · .price ($) · .extras = options ($) · .fees = frais obligatoires au départ ($) · .owned = true si déjà possédé · .role = "unknown" | "income" | "unlock" | "improve" | "replace" | "comfort" | "pleasure" · .incomeMode = "none" | "personal" · .boostHourly = gain en plus par heure si incomeMode "personal" ($/h) · .usage.perSession = coût à chaque partie ($) · .resale = revente possible, hypothèse ($) · .utility = envie de 1 à 5 · .capabilities.terrain = "route" | "tout-terrain" | "eau" | "air" · .capabilities.seats = places · .requires = liste des clés d'achats à avoir avant
MES ACHATS (purchase) : purchase.key = clé de l'achat étudié
QUOI ACHETER D'ABORD (order) : order.keys = liste des clés · order.objective = "all" (tout avoir au plus vite) | "income" (premier gain au plus tôt) | "reserve" (garder de l'argent) | "given" (mon ordre)
ÇA VAUT LE COUP (roi) : roi.key = clé de l'achat · roi.mode = "estimate" (plaisir ou gain inconnu) | "new" (sans lui je ne peux pas faire ces activités) | "improve" (il améliore ces activités) | "continuous" (je connais son gain par heure) · roi.revenueHourly = gain en plus ($/h) · roi.costHourly = coût en plus ($/h) · roi.hours = heures d'utilisation · roi.activityIds = ids d'activités · roi.gainPercent = récompense en plus (%) · roi.durationReduction = mission plus courte de (%)
MON BUDGET (budget) : budget.source = "basket" (achats de Quoi acheter d'abord) | "manual" · budget.allocations.0 à .4 = véhicules, investissements, équipement, consommables, autres ($) · budget.extra = autres dépenses prévues ($)
QUEL ACHAT CHOISIR (compare) : compare.keys = 2 à 6 clés · compare.criterion = "value" | "cheapest" | "cheapestTotal" (le moins cher sur la durée) | "fastest" | "profit" | "utility" · compare.hours = heures d'utilisation
ANALYSE (tous outils) : analysis.horizon.sessions = nombre de parties pour le coût dans la durée · analysis.need.terrain = "route" | "tout-terrain" | "eau" | "air" · analysis.need.passengers · analysis.need.cargo = true/false · analysis.priority = "fast" | "cheapStart" | "cheapTotal" | "reserve" · analysis.simulations.echec = true pour simuler des tentatives ratées, avec analysis.sim.echec.tentativesRatees = tentatives ratées par réussite · analysis.simulations.munitions = true avec analysis.sim.munitions.parTentative ($)
BUSINESS PLAN (plan) : plan.goal.kind = "amount" (une somme) | "purchase" (un achat) | "unlock" (des points à atteindre) · plan.goal.target ($) · plan.goal.name · plan.goal.price ($) · plan.goal.meaning = comme goal.meaning · plan.goal.targetUnits · plan.source = "hourly" | "missions" · plan.situation.capital · plan.situation.reserve · plan.situation.hourly ($/h) · plan.situation.dailyMinutes = durée d'une partie (min) · plan.situation.daysPerWeek · plan.situation.upkeepPerSession · plan.situation.players · plan.deadlineDays · plan.priority = "balanced" | "fast" | "safe" | "cheap" · plan.strategy = "auto" | "asIs" | "byPayback" | "cheapFirst" | "skipNoBoost" | "direct" | "useReserve" · plan.maxRepeat · plan.missions.N.(name, reward, cost, duration, prep, cooldown, share, players, investment, once) · plan.prerequisites.N.(name, price, minutes, boostHourly, usagePerSession)`;

const SYSTEM_CALC=`Tu es le module de compréhension du calculateur de Leonidakit, un site de fans de GTA VI (non officiel).
Ton seul travail : transformer la demande du joueur en cases à remplir dans le calculateur, puis l'outil à ouvrir. Tu ne calcules JAMAIS de résultat : le moteur du site le fait.
Règles :
1. N'invente aucun chiffre. Une valeur ne vient que de la phrase du joueur (ou d'une conversion simple : « 1 h » = 60, « 200k » = 200000, « 1 M » = 1000000, « 45 min le soir » = goal.dailyMinutes 45). Ce que le joueur ne dit pas reste tel quel.
2. Aucun prix, gain ou durée de GTA VI n'est connu officiellement : si le joueur demande « combien coûte X », ne donne pas de prix ; ouvre l'outil adapté et dis-le dans la note.
3. Choisis l'outil qui répond à sa question : goal (combien de temps pour avoir une somme), purchase (puis-je acheter), session (que faire pendant ma partie), budget, order (dans quel ordre acheter), roi (est-ce rentable), activities (combien je gagne en X minutes), compare (lequel choisir), plan (programme étape par étape).
4. Situations sans case dédiée, à traduire avec les cases existantes :
   - un taux de réussite p (ex. 80 %) : analysis.simulations.echec = true et analysis.sim.echec.tentativesRatees = (1 − p) / p, arrondi à 2 décimales ;
   - un gain ou un coût donné comme un intervalle (« entre 20 000 et 40 000 ») : mets la valeur basse dans les cases, et ajoute deux scénarios « bas » et « haut » avec les valeurs de chaque borne ;
   - « prudent / favorable » : deux scénarios, sans inventer de probabilité ;
   - une activité continue avec une préparation sans revenu (« 30 min de préparation puis 40 000 par heure ») : activité de 30 min, récompense = gain horaire / 2, prep = la préparation, prepOnce = true ;
   - « avoir un million » est ambigu : si le joueur ne précise pas, garde goal.meaning tel quel et pose la question.
5. Si la demande est trop floue pour remplir une case utile, ne remplis rien et pose UNE question courte.
6. note : une ou deux phrases dans la langue demandée, qui disent ce que tu as compris et les hypothèses prises. question : vide, ou une seule question.
7. Utilise uniquement les clés d'achats et ids d'activités donnés dans l'état. Pour un nouvel achat sans clé, utilise l'achat de purchase.key.
${CASES}`;

const SYSTEM_LEO=`Tu es Léo, l'assistant de Leonidakit, un site de fans de GTA VI (non officiel, sans lien avec Rockstar Games).
Réponds uniquement à partir des ÉLÉMENTS fournis (réponse locale de Léo et extraits des pages du site). N'ajoute aucun fait, prix, date, nom ou chiffre qui n'y figure pas. Ne présente jamais une information de GTA V ou de GTA Online comme une information de GTA VI.
Si les éléments ne permettent pas de répondre, dis-le simplement et conseille le site officiel de Rockstar (https://www.rockstargames.com/VI).
Style : réponse courte (2 à 5 phrases), claire, tutoiement, dans la langue demandée. Distingue ce que Rockstar a confirmé, ce qui est observé dans les vidéos, et ce qui n'est pas connu.
Liens : propose seulement des liens présents dans les éléments (champ url), ou le site officiel de Rockstar ; trois au plus.
Pour un calcul (argent, temps, rentabilité), ne calcule pas toi-même : renvoie vers le calculateur (/calculateurs.html) si ce lien est présent dans les éléments.`;

const TOOL_CALC={name:'remplir_calculateur',description:'Cases à remplir dans le calculateur et outil à ouvrir.',input_schema:{type:'object',properties:{
 outil:{type:'string',enum:TOOLS},
 cases:{type:'array',maxItems:40,items:{type:'object',properties:{chemin:{type:'string'},valeur:{}},required:['chemin','valeur']}},
 scenarios:{type:'array',maxItems:3,items:{type:'object',properties:{nom:{type:'string'},cases:{type:'array',maxItems:12,items:{type:'object',properties:{chemin:{type:'string'},valeur:{}},required:['chemin','valeur']}}},required:['nom','cases']}},
 note:{type:'string'},question:{type:'string'}},required:['outil','cases','note']}};
const TOOL_LEO={name:'repondre',description:'Réponse de Léo et liens utiles.',input_schema:{type:'object',properties:{
 reponse:{type:'string'},liens:{type:'array',maxItems:3,items:{type:'object',properties:{titre:{type:'string'},url:{type:'string'}},required:['titre','url']}},
 trouve:{type:'boolean',description:'true si les éléments permettaient de répondre'}},required:['reponse','trouve']}};

function limited(ip,now=Date.now()){
 const key=crypto.createHash('sha256').update(String(ip||'inconnue')).digest('hex').slice(0,16);
 for(const [k,list] of hits){const kept=list.filter(t=>now-t<WINDOW_MS);if(kept.length)hits.set(k,kept);else hits.delete(k);}
 const list=hits.get(key)||[];if(list.length>=MAX_PER_WINDOW)return true;list.push(now);hits.set(key,list);return false;
}

const PATH=/^[a-zA-Z]+(?:\.[a-zA-Z0-9]+){0,4}$/;
function value(v){if(v===null||typeof v==='boolean')return {ok:true,v};if(typeof v==='number')return Number.isFinite(v)&&Math.abs(v)<=1e12?{ok:true,v}:{ok:false};
 if(typeof v==='string')return v.length<=80?{ok:true,v}:{ok:false};if(Array.isArray(v))return v.length<=8&&v.every(x=>typeof x==='string'&&x.length<=60)?{ok:true,v}:{ok:false};return {ok:false};}
function cases(list,max){const out=[];for(const c of Array.isArray(list)?list:[]){if(out.length>=max)break;if(!c||typeof c.chemin!=='string'||!PATH.test(c.chemin)||c.chemin.length>60)continue;const x=value(c.valeur);if(x.ok)out.push({chemin:c.chemin,valeur:x.v});}return out;}
function safeLink(u,allowed){if(typeof u!=='string'||u.length>300)return null;if(/^https:\/\/www\.rockstargames\.com\/[^\s"<>]*$/.test(u)||u==='https://www.rockstargames.com/VI')return u;if(/^\/[a-z0-9/._#-]*$/i.test(u)&&allowed.has(u.split('#')[0]))return u;return null;}

/* Contrôle de la demande : renvoie {ok, data} ou {ok:false, status, code}. */
function validate(body){
 if(!body||typeof body!=='object'||Array.isArray(body))return {ok:false,status:400,code:'format'};
 const mode=body.mode==='leo'?'leo':body.mode==='calcul'?'calcul':null;if(!mode)return {ok:false,status:400,code:'format'};
 const question=clean(body.question,LIMITS.question+1);if(question.length<2||question.length>LIMITS.question)return {ok:false,status:400,code:'question'};
 const lang=LANGS[body.lang]?body.lang:'fr',page=clean(body.page,LIMITS.page);
 if(mode==='calcul'){const state=clean(typeof body.state==='string'?body.state:'',LIMITS.state);return {ok:true,data:{mode,question,lang,page,state}};}
 const local=clean(body.local&&body.local.text,LIMITS.local),links=(Array.isArray(body.local&&body.local.links)?body.local.links:[]).slice(0,6).map(l=>({titre:clean(l&&l.label,120),url:clean(l&&l.url,300)})).filter(l=>l.titre&&l.url);
 const passages=(Array.isArray(body.passages)?body.passages:[]).slice(0,LIMITS.passages).map(p=>({titre:clean(p&&p.t,140),partie:clean(p&&p.h,140),texte:clean(p&&p.x,LIMITS.passage),url:clean(p&&p.u,300)})).filter(p=>p.texte&&p.url);
 const history=(Array.isArray(body.history)?body.history:[]).slice(-LIMITS.history).map(h=>({q:clean(h&&h.q,LIMITS.historyItem),r:clean(h&&h.r,LIMITS.historyItem)})).filter(h=>h.q);
 return {ok:true,data:{mode,question,lang,page,local,links,passages,history}};
}

function userMessage(d){
 if(d.mode==='calcul')return 'Langue de la note : '+LANGS[d.lang]+'.\nPage : '+(d.page||'/calculateurs.html')+'\nÉtat actuel (résumé) : '+(d.state||'inconnu')+'\nDemande du joueur : « '+d.question+' »';
 const el=['RÉPONSE LOCALE DE LÉO : '+(d.local||'aucune'),...d.links.map(l=>'lien : '+l.titre+' → '+l.url),...d.passages.map((p,i)=>'EXTRAIT '+(i+1)+' — '+p.titre+(p.partie?' › '+p.partie:'')+' ('+p.url+') : '+p.texte)];
 const hist=d.history.length?'Échanges précédents :\n'+d.history.map(h=>'- Q : '+h.q+(h.r?'\n  R : '+h.r:'')).join('\n')+'\n':'';
 return 'Langue de la réponse : '+LANGS[d.lang]+'.\nPage consultée : '+(d.page||'/')+'\n'+hist+'ÉLÉMENTS :\n'+el.join('\n')+'\n\nQuestion : « '+d.question+' »';
}

async function callClaude(d,env,fetchImpl){
 const model=MODELS.test(String(env.LK_IA_MODELE||''))?env.LK_IA_MODELE:MODEL_DEFAULT,calc=d.mode==='calcul',tool=calc?TOOL_CALC:TOOL_LEO;
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),TIMEOUT_MS);
 try{
  const r=await fetchImpl('https://api.anthropic.com/v1/messages',{method:'POST',signal:controller.signal,headers:{'content-type':'application/json','x-api-key':env.ANTHROPIC_API_KEY,'anthropic-version':'2023-06-01'},
   body:JSON.stringify({model,max_tokens:calc?900:700,temperature:calc?0:0.3,system:[{type:'text',text:calc?SYSTEM_CALC:SYSTEM_LEO,cache_control:{type:'ephemeral'}}],tools:[tool],tool_choice:{type:'tool',name:tool.name},messages:[{role:'user',content:userMessage(d)}]})});
  if(!r.ok)return {ok:false,status:r.status};
  const j=await r.json(),use=(j.content||[]).find(c=>c.type==='tool_use'&&c.name===tool.name);
  return use&&use.input&&typeof use.input==='object'?{ok:true,input:use.input,model}:{ok:false,status:0};
 }catch(e){return {ok:false,status:0};}
 finally{clearTimeout(timer);}
}

function shape(d,input,model){
 if(d.mode==='calcul'){const outil=TOOLS.includes(input.outil)?input.outil:'goal';
  const scenarios=(Array.isArray(input.scenarios)?input.scenarios:[]).slice(0,3).map(s=>({nom:clean(s&&s.nom,60),cases:cases(s&&s.cases,12)})).filter(s=>s.nom&&s.cases.length);
  return {ok:true,mode:'calcul',modele:model,outil,cases:cases(input.cases,40),scenarios,note:clean(input.note,500),question:clean(input.question,240)};}
 const allowed=new Set(['/calculateurs.html',...d.links.map(l=>l.url.split('#')[0]),...d.passages.map(p=>p.url.split('#')[0])]);
 const liens=(Array.isArray(input.liens)?input.liens:[]).map(l=>({titre:clean(l&&l.titre,90),url:safeLink(clean(l&&l.url,300),allowed)})).filter(l=>l.titre&&l.url).slice(0,3);
 return {ok:true,mode:'leo',modele:model,reponse:clean(input.reponse,1400),liens,trouve:input.trouve===true};
}

async function readBody(req){
 if(req.body!==undefined){if(typeof req.body==='string'){try{return JSON.parse(req.body);}catch{return null;}}return req.body;}
 return await new Promise(resolve=>{let size=0;const chunks=[];req.on('data',c=>{size+=c.length;if(size>LIMITS.body){resolve(null);req.destroy?.();return;}chunks.push(c);});req.on('end',()=>{try{resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));}catch{resolve(null);}});req.on('error',()=>resolve(null));});
}
function reply(res,status,obj,extra={}){res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');for(const [k,v] of Object.entries(extra))res.setHeader(k,v);res.end(JSON.stringify(obj));}

function createHandler(options={}){
 const env=options.env||process.env,fetchImpl=options.fetch||globalThis.fetch,clock=options.now||(()=>Date.now());
 return async function handler(req,res){
  if(req.method!=='POST')return reply(res,405,{ok:false,code:'method'},{Allow:'POST'});
  const origin=req.headers?.origin;if(origin&&!ORIGINS.some(re=>re.test(origin)))return reply(res,403,{ok:false,code:'origin'});
  if(!/application\/json/i.test(String(req.headers?.['content-type']||'')))return reply(res,415,{ok:false,code:'format'});
  if(Number(req.headers?.['content-length']||0)>LIMITS.body)return reply(res,413,{ok:false,code:'size'});
  if(!env.ANTHROPIC_API_KEY||typeof fetchImpl!=='function')return reply(res,503,{ok:false,code:'off'});
  let body;try{body=await readBody(req);}catch{body=null;}
  const v=validate(body);if(!v.ok)return reply(res,v.status,{ok:false,code:v.code});
  const ip=String(req.headers?.['x-forwarded-for']||'').split(',')[0].trim()||req.socket?.remoteAddress||'';
  if(limited(ip,clock()))return reply(res,429,{ok:false,code:'rate'});
  const r=await callClaude(v.data,env,fetchImpl);
  if(!r.ok){console.error('ia: réponse refusée par le service ('+r.status+')');return reply(res,502,{ok:false,code:'service'});}
  return reply(res,200,shape(v.data,r.input,r.model));
 };
}

module.exports=createHandler();
module.exports.createHandler=createHandler;
module.exports._test={validate,limited,cases,safeLink,shape,userMessage,SYSTEM_CALC,SYSTEM_LEO,MODEL_DEFAULT,reset:()=>hits.clear()};
