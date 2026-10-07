'use strict';
/* v7.67 : IA de Leonidakit (API Claude d'Anthropic), deux usages, une seule fonction serveur :
   - « calcul » : la barre « Que veux-tu calculer ? » du calculateur. L'IA lit la phrase et renvoie QUELLES CASES remplir
     (chemins du scénario, valeurs écrites par le joueur) ; elle ne calcule jamais : les chiffres de la réponse viennent du
     moteur du calculateur, dans la page. Elle peut aussi proposer deux ou trois variantes (intervalle, prudent / favorable).
   - « leo » : Léo. L'IA rédige la réponse à partir de ce que la page lui envoie (réponse locale de Léo, extraits des pages
     du site) et de rien d'autre ; elle ne cite que des liens présents dans ces éléments, ou le site officiel de Rockstar.
   Fonction Node.js du dossier /api détectée par Vercel sans configuration (comme api/contact.js), fetch natif, aucune
   dépendance. Variables d'environnement Vercel : ANTHROPIC_API_KEY (obligatoire ; sans elle, réponse 503 et la page garde
   son fonctionnement local), LK_IA_MODELE (facultatif, modèle utilisé ; par défaut Claude Sonnet 5.5 depuis la v7.69, choix de Téva).
   Aucune question n'est conservée par le site (pas de fichier, rien dans les journaux). Le compteur anti-rafale garde en
   mémoire vive, dix minutes au plus, une empreinte (SHA-256 tronquée) de l'adresse IP.
   v7.69 (demande de Téva du 06/10/2026) : accès à l'IA par visiteur.
   - 30 questions gratuites par visiteur et par 9 heures (LK_IA_GRATUIT, LK_IA_HEURES). Le visiteur est compté par un
     identifiant aléatoire de son appareil (lk_ia_appareil, envoyé par la page) et par une empreinte salée de son adresse
     IP (plafond 5 fois plus haut, pour une box ou un réseau partagés). Les compteurs vivent dans la base Redis d'Upstash
     reliée au projet Vercel (KV_REST_API_URL / KV_REST_API_TOKEN), effacés seuls au bout de 9 heures ; sans base, la
     fonction compte en mémoire vive (moins fiable).
   - Au-delà : crédit payant, si la vente est ouverte (LK_IA_VENTE=oui, STRIPE_SECRET_KEY, LK_IA_SEL, base Upstash ; achats par
     api/ia-achat.js). Chaque question coûte son prix réel chez Anthropic (jetons lus et écrits, d'après la réponse de
     l'API, convertis en euros par LK_IA_EUR_PAR_USD) plus la marge LK_IA_MARGE (20 % par défaut).
   - Sinon : réponse 402 « quota » et la page repasse en mode local (Léo local, lecture locale du calculateur). */
const crypto=require('node:crypto');

const MODEL_DEFAULT='claude-sonnet-5-5';
const MODELS=/^claude-[a-z0-9.-]{3,60}$/;
const LANGS={fr:'français',en:'anglais',es:'espagnol',it:'italien',de:'allemand'};
const TOOLS=['goal','purchase','session','budget','order','roi','activities','compare','plan'];
const LIMITS={body:24000,question:400,page:200,local:1600,passages:6,passage:900,history:4,historyItem:400,state:3000};
const WINDOW_MS=10*60*1000,MAX_PER_WINDOW=60,TIMEOUT_MS=18000; /* v7.69 : anti-rafale à 60 par 10 minutes (les 30 questions gratuites par 9 heures sont comptées à part) */
const ORIGINS=[/^https:\/\/(?:www\.)?leonidakit\.com$/,/^https:\/\/[a-z0-9-]+\.vercel\.app$/,/^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/];
const hits=new Map(),freeMem=new Map();
const FREE_DEFAULT=30,HOURS_DEFAULT=9,IP_FACTOR=5,MARGIN_DEFAULT=20,EUR_PER_USD_DEFAULT=0.89,MIN_CREDIT=30000;
/* prix Anthropic en dollars par million de jetons : lecture, écriture, écriture en cache, lecture en cache (tarifs consultés le 06/10/2026) */
const PRICES={'claude-sonnet-5-5':[2,10,2.5,0.2],'claude-haiku-4-5-20251001':[1,5,1.25,0.1],'claude-opus-5-5':[4,20,5,0.2],'claude-fable-5-1':[10,50,12.5,0.25]};
const DEVICE=/^[A-Za-z0-9_-]{16,64}$/,TOKEN=/^LK(?:-[A-Z2-7]{4}){4}$/;

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

/* v7.69 (correctif du 07/10/2026) : Claude Sonnet 5.5 refuse l'outil imposé (tool_choice « tool ») et une température choisie
   (erreur 400, documentation d'Anthropic). La réponse est donc une sortie JSON imposée par un schéma (output_config.format) ;
   les limites (40 cases, 3 scénarios, 3 liens) sont dites dans les descriptions et appliquées ensuite par cases() et safeLink(). */
const VALEUR={anyOf:[{type:'string'},{type:'number'},{type:'boolean'},{type:'null'},{type:'array',items:{type:'string'}}]};
const CASE={type:'object',properties:{chemin:{type:'string'},valeur:VALEUR},required:['chemin','valeur'],additionalProperties:false};
const SCHEMA_CALC={type:'object',properties:{
 outil:{type:'string',enum:TOOLS},
 cases:{type:'array',description:'Cases à remplir, 40 au plus.',items:CASE},
 scenarios:{type:'array',description:'Variantes, 3 au plus (12 cases chacune au plus) ; liste vide s’il n’y en a pas.',items:{type:'object',properties:{nom:{type:'string'},cases:{type:'array',items:CASE}},required:['nom','cases'],additionalProperties:false}},
 note:{type:'string'},question:{type:'string',description:'Vide, ou une seule question courte.'}},required:['outil','cases','scenarios','note','question'],additionalProperties:false};
const SCHEMA_LEO={type:'object',properties:{
 reponse:{type:'string'},liens:{type:'array',description:'3 liens au plus, pris dans les éléments fournis ou le site officiel de Rockstar ; liste vide sinon.',items:{type:'object',properties:{titre:{type:'string'},url:{type:'string'}},required:['titre','url'],additionalProperties:false}},
 trouve:{type:'boolean',description:'true si les éléments permettaient de répondre'}},required:['reponse','liens','trouve'],additionalProperties:false};
/* Réglages propres aux modèles récents : Claude Sonnet 5.5 réfléchit par défaut (effort « high »), « between_tools » coupe la
   réflexion avant la réponse et l'effort « low » garde une réponse courte et rapide ; Opus 5.5 et Fable 5.1 réfléchissent
   toujours : seul l'effort est abaissé (et la place pour la réflexion ajoutée). Les autres modèles gardent les réglages de base. */
function modelOptions(model){
 if(/^claude-sonnet-5-5(?:$|-)/.test(model))return {thinking:{type:'between_tools'},effort:'low',extra:0};
 if(/^claude-(?:opus-5-5|fable-5|mythos-5)/.test(model))return {effort:'low',extra:2000};
 return {extra:0};
}

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
 const who={appareil:typeof body.appareil==='string'&&DEVICE.test(body.appareil)?body.appareil:'',jeton:typeof body.jeton==='string'&&TOKEN.test(body.jeton)?body.jeton:''};
 if(body.mode==='etat')return {ok:true,data:{mode:'etat',...who}};
 const r=validateAsk(body);if(r.ok)Object.assign(r.data,who);return r;
}
function validateAsk(body){
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
 const model=MODELS.test(String(env.LK_IA_MODELE||''))?env.LK_IA_MODELE:MODEL_DEFAULT,calc=d.mode==='calcul',opt=modelOptions(model);
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),TIMEOUT_MS);
 try{
  const body={model,max_tokens:(calc?1400:900)+opt.extra,system:[{type:'text',text:calc?SYSTEM_CALC:SYSTEM_LEO,cache_control:{type:'ephemeral'}}],
   messages:[{role:'user',content:userMessage(d)}],output_config:{format:{type:'json_schema',schema:calc?SCHEMA_CALC:SCHEMA_LEO}}};
  if(opt.effort)body.output_config.effort=opt.effort;
  if(opt.thinking)body.thinking=opt.thinking;
  const r=await fetchImpl('https://api.anthropic.com/v1/messages',{method:'POST',signal:controller.signal,headers:{'content-type':'application/json','x-api-key':env.ANTHROPIC_API_KEY,'anthropic-version':'2023-06-01'},body:JSON.stringify(body)});
  /* la raison donnée par Anthropic (type et message d'erreur, jamais la question) va dans le journal de Vercel */
  if(!r.ok){let why='';try{const e=await r.json();why=[e&&e.error&&e.error.type,e&&e.error&&e.error.message].filter(x=>typeof x==='string'&&x).join(' : ').slice(0,180);}catch{why='';}return {ok:false,status:r.status,why};}
  const j=await r.json(),text=(j.content||[]).filter(c=>c&&c.type==='text'&&typeof c.text==='string').map(c=>c.text).join('').trim();
  let input=null;try{input=JSON.parse(text);}catch{input=null;}
  return input&&typeof input==='object'&&!Array.isArray(input)?{ok:true,input,model,usage:j.usage||{}}:{ok:false,status:0,why:'réponse illisible ('+String(j.stop_reason||'?').slice(0,30)+')'};
 }catch(e){return {ok:false,status:0,why:e&&e.name==='AbortError'?'délai dépassé':'service injoignable'};}
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

/* ---------- v7.69 : accès (gratuit, crédit) ---------- */
function settings(env){
 const n=(v,d,min,max)=>{const x=Number(v);return Number.isFinite(x)&&x>=min&&x<=max?x:d;};
 const url=env.KV_REST_API_URL||env.UPSTASH_REDIS_REST_URL,token=env.KV_REST_API_TOKEN||env.UPSTASH_REDIS_REST_TOKEN;
 const kv=url&&token&&/^https:\/\//.test(url)?{url:String(url).replace(/\/+$/,''),token:String(token)}:null;
 return {free:Math.round(n(env.LK_IA_GRATUIT,FREE_DEFAULT,0,1000)),windowS:Math.round(n(env.LK_IA_HEURES,HOURS_DEFAULT,1,168)*3600),margin:n(env.LK_IA_MARGE,MARGIN_DEFAULT,0,500)/100,
  eur:n(env.LK_IA_EUR_PAR_USD,EUR_PER_USD_DEFAULT,0.2,5),kv,sell:env.LK_IA_VENTE==='oui'&&!!env.STRIPE_SECRET_KEY&&!!kv&&String(env.LK_IA_SEL||'').length>=16,salt:String(env.LK_IA_SEL||env.ANTHROPIC_API_KEY||'leonidakit')};
}
const digest=(salt,v)=>crypto.createHash('sha256').update(salt+'|'+v).digest('hex').slice(0,32);
async function kvRun(kv,fetchImpl,cmds){
 const r=await fetchImpl(kv.url+'/pipeline',{method:'POST',headers:{Authorization:'Bearer '+kv.token,'Content-Type':'application/json'},body:JSON.stringify(cmds)});
 if(!r.ok)throw Error('kv '+r.status);const j=await r.json();if(!Array.isArray(j))throw Error('kv');
 return j.map(x=>{if(x&&x.error)throw Error('kv '+x.error);return x?x.result:null;});
}
/* compteur gratuit : un essai consomme une question (sauf lecture seule) ; au-delà de la limite, rien n'est retenu */
function keysOf(st,who,ip){const ki='lkia:q:i:'+digest(st.salt,'ip:'+ip);return {ka:who.appareil?'lkia:q:a:'+digest(st.salt,'app:'+who.appareil):ki,ki,capA:st.free,capI:who.appareil?st.free*IP_FACTOR:st.free};}
async function freeUse(st,who,ip,fetchImpl,now,take){
 const {ka,ki,capA,capI}=keysOf(st,who,ip),W=String(st.windowS);
 if(st.free<=0)return {ok:false,restant:0,reset:null};
 if(st.kv){try{
   if(!take){const [a,t]=await kvRun(st.kv,fetchImpl,[['GET',ka],['PTTL',ka]]);const used=Number(a)||0;return {ok:used<capA,restant:Math.max(0,st.free-Math.min(st.free,used)),reset:Number(t)>0?now+Number(t):null};}
   const r=await kvRun(st.kv,fetchImpl,ka===ki?[['SET',ka,'0','EX',W,'NX'],['INCR',ka],['PTTL',ka]]:[['SET',ka,'0','EX',W,'NX'],['INCR',ka],['PTTL',ka],['SET',ki,'0','EX',W,'NX'],['INCR',ki]]);
   const na=Number(r[1]),ni=ka===ki?na:Number(r[4]),reset=Number(r[2])>0?now+Number(r[2]):null;
   if(na>capA||ni>capI){await kvRun(st.kv,fetchImpl,ka===ki?[['DECR',ka]]:[['DECR',ka],['DECR',ki]]).catch(()=>{});return {ok:false,restant:0,reset};}
   return {ok:true,restant:Math.max(0,Math.min(st.free,capA)-na),reset,undo:()=>kvRun(st.kv,fetchImpl,ka===ki?[['DECR',ka]]:[['DECR',ka],['DECR',ki]]).catch(()=>{})};
  }catch(e){console.error('ia: base des compteurs indisponible');}}
 /* sans base : mémoire vive de cette instance */
 for(const [k,v] of freeMem)if(v.until<=now)freeMem.delete(k);
 const a=freeMem.get(ka)||{n:0,until:now+st.windowS*1000},i=ka===ki?a:(freeMem.get(ki)||{n:0,until:now+st.windowS*1000});
 if(!take)return {ok:a.n<capA,restant:Math.max(0,st.free-Math.min(st.free,a.n)),reset:a.n?a.until:null};
 if(a.n+1>capA||(ka!==ki&&i.n+1>capI))return {ok:false,restant:0,reset:a.until};
 a.n++;freeMem.set(ka,a);if(ka!==ki){i.n++;freeMem.set(ki,i);}
 return {ok:true,restant:Math.max(0,Math.min(st.free,capA)-a.n),reset:a.until,undo:()=>{a.n=Math.max(0,a.n-1);if(ka!==ki)i.n=Math.max(0,i.n-1);}};
}
async function balance(st,who,fetchImpl){if(!st.kv||!who.jeton)return null;try{const [b]=await kvRun(st.kv,fetchImpl,[['GET','lkia:b:'+digest(st.salt,'jeton:'+who.jeton)]]);return b===null?null:Number(b)||0;}catch{return null;}}
/* prix d'une question en micro-euros : jetons réels × tarif du modèle, en euros, plus la marge */
function priceOf(model,usage,st){
 const p=PRICES[model]||PRICES[MODEL_DEFAULT],u=usage||{},n=x=>Math.max(0,Number(x)||0);
 const usd=(n(u.input_tokens)*p[0]+n(u.output_tokens)*p[1]+n(u.cache_creation_input_tokens)*p[2]+n(u.cache_read_input_tokens)*p[3])/1e6;
 return Math.ceil(usd*st.eur*(1+st.margin)*1e6);
}
async function charge(st,who,fetchImpl,cost){try{const [b]=await kvRun(st.kv,fetchImpl,[['DECRBY','lkia:b:'+digest(st.salt,'jeton:'+who.jeton),String(cost)]]);return Number(b);}catch{return null;}}

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
  const st=settings(env),now=clock(),d=v.data,who={appareil:d.appareil,jeton:d.jeton};
  const model=MODELS.test(String(env.LK_IA_MODELE||''))?env.LK_IA_MODELE:MODEL_DEFAULT;
  /* v7.69 : état de l'accès (questions gratuites restantes, crédit, vente ouverte), sans rien consommer */
  if(d.mode==='etat'){const f=await freeUse(st,who,ip,fetchImpl,now,false),b=await balance(st,who,fetchImpl);
   return reply(res,200,{ok:true,mode:'etat',modele:model,gratuit:st.free,heures:st.windowS/3600,restant:f.restant,reset:f.reset,achat:st.sell,solde:b,marge:Math.round(st.margin*100)});}
  if(limited(ip,now))return reply(res,429,{ok:false,code:'rate'});
  let access=await freeUse(st,who,ip,fetchImpl,now,true),paid=false,bal=null;
  if(!access.ok){bal=await balance(st,who,fetchImpl);
   if(bal!==null&&bal>=MIN_CREDIT)paid=true;
   else return reply(res,402,{ok:false,code:'quota',gratuit:st.free,heures:st.windowS/3600,restant:0,reset:access.reset,achat:st.sell,solde:bal});}
  const r=await callClaude(d,env,fetchImpl);
  if(!r.ok){if(access.undo)await access.undo();console.error('ia: réponse refusée par le service ('+r.status+(r.why?' — '+r.why:'')+')');return reply(res,502,{ok:false,code:'service'});}
  const out=shape(d,r.input,r.model);
  if(paid){const cost=priceOf(r.model,r.usage,st),left=await charge(st,who,fetchImpl,cost);out.acces={type:'credit',cout:cost,solde:left===null?bal-cost:left};}
  else out.acces={type:'gratuit',gratuit:st.free,heures:st.windowS/3600,restant:access.restant,reset:access.reset};
  return reply(res,200,out);
 };
}

module.exports=createHandler();
module.exports.createHandler=createHandler;
module.exports._test={validate,limited,cases,safeLink,shape,userMessage,SYSTEM_CALC,SYSTEM_LEO,SCHEMA_CALC,SCHEMA_LEO,modelOptions,MODEL_DEFAULT,PRICES,priceOf,settings,digest,reset:()=>{hits.clear();freeMem.clear();}};
