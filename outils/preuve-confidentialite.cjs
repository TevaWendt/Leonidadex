#!/usr/bin/env node
'use strict';
/* v7.46 (lot 9) : preuve, sur les fichiers réellement déployés (tout sauf ce que .vercelignore exclut : outils/…),
   de ce que disent les Mentions : aucun cookie (ni document.cookie, ni cookieStore, ni en-tête Set-Cookie dans
   vercel.json ou api/), aucune ressource d'un autre site (script, feuille de style, police, image, cadre, média),
   aucun outil de mesure d'audience ou de publicité, aucune requête réseau du navigateur vers un autre site, CSP
   connect-src 'self', formulaires : seul l'accueil poste vers Brevo, deux fonctions serveur (api/contact.js, api/ia.js depuis la v7.67), pas de
   package.json, stockage du navigateur : toutes les clés commencent par « lk ».
   Usage : node outils/preuve-confidentialite.cjs [--json]. Code 1 si une affirmation n'est plus vraie. */
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),asJSON=process.argv.includes('--json');
const ignore=fs.readFileSync(path.join(root,'.vercelignore'),'utf8').split('\n').map(l=>l.trim()).filter(l=>l&&!l.startsWith('#'));
const skipped=rel=>rel.split('/').some(part=>ignore.includes(part)||part==='.git'||part==='node_modules')||ignore.some(p=>!p.includes('*')&&rel===p);
function walk(dir,out=[]){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const abs=path.join(dir,e.name),rel=path.relative(root,abs).split(path.sep).join('/');if(skipped(rel))continue;if(e.isDirectory())walk(abs,out);else out.push(rel);}return out;}
const files=walk(root),text=f=>fs.readFileSync(path.join(root,f),'utf8');
const html=files.filter(f=>f.endsWith('.html')),js=files.filter(f=>/\.(?:js|mjs|cjs)$/.test(f)),css=files.filter(f=>f.endsWith('.css'));
const OWN=/^(?:https?:)?\/\/(?:www\.)?leonidakit\.com(?:\/|$)/i,EXT=/^(?:https?:)?\/\//i;
const problems=[],facts={};
const fail=(rule,where,detail)=>problems.push({rule,where,detail});
/* 1. cookies */
/* dans les pages, seul le code compte (scripts en ligne, attributs on…=), pas le texte qui explique cette preuve */
const codeOf=f=>f.endsWith('.html')?[...text(f).matchAll(/<script(?![^>]*application\/ld\+json)[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]).join('\n')+[...text(f).matchAll(/\son[a-z]+="([^"]*)"/gi)].map(m=>m[1]).join('\n'):text(f);
for(const f of [...js,...html])if(/document\s*\.\s*cookie|\bcookieStore\b/.test(codeOf(f)))fail('cookie',f,'document.cookie ou cookieStore');
const vercel=JSON.parse(text('vercel.json'));
for(const h of vercel.headers||[])for(const x of h.headers||[])if(/^set-cookie$/i.test(x.key))fail('cookie','vercel.json','en-tête Set-Cookie');
const api=files.filter(f=>f.startsWith('api/'));facts.api=api;
for(const f of api)if(/set-cookie|setHeader\(\s*['"]set-cookie/i.test(text(f)))fail('cookie',f,'Set-Cookie dans la fonction');
/* 2. ressources d'autres sites dans les pages (script, style, police, image, cadre, média, préchargement) */
const attr=/<(script|link|img|iframe|source|video|audio|embed|object|track)\b[^>]*?\s(src|href|srcset|data|poster)\s*=\s*"([^"]*)"/gi;
let external=0;
for(const f of html){const s=text(f);for(const m of s.matchAll(attr)){const tag=m[1].toLowerCase(),name=m[2].toLowerCase(),val=m[3];
 if(tag==='link'){const whole=m[0];if(/rel="(?:canonical|alternate)"/i.test(whole))continue;}
 for(const u of name==='srcset'?val.split(',').map(x=>x.trim().split(/\s+/)[0]):[val])if(EXT.test(u)&&!OWN.test(u)){external++;fail('ressource externe',f,'<'+tag+' '+name+'="'+u+'">');}}
 for(const m of s.matchAll(/<meta[^>]+http-equiv="refresh"[^>]*content="[^"]*url=([^"]+)"/gi))if(EXT.test(m[1].trim())&&!OWN.test(m[1].trim()))fail('redirection externe',f,m[1]);}
for(const f of css){const s=text(f);for(const m of s.matchAll(/url\(\s*['"]?([^'")]+)/g))if(EXT.test(m[1]))fail('ressource externe',f,'url('+m[1]+')');for(const m of s.matchAll(/@import\s+(?:url\()?['"]?([^'");]+)/g))if(EXT.test(m[1]))fail('ressource externe',f,'@import '+m[1]);}
facts.externalResources=external;
/* 3. outils de mesure, publicité, réseaux sociaux intégrés */
const trackers=/googletagmanager|google-analytics|\bgtag\(|\bga\(\s*['"]create|plausible\.io|matomo|piwik|hotjar|clarity\.ms|connect\.facebook|\bfbq\(|segment\.(?:io|com)|mixpanel|umami|\/_vercel\/insights|\/_vercel\/speed-insights|doubleclick|adsbygoogle|googlesyndication|platform\.twitter|tiktok\.com\/embed/i;
for(const f of [...html,...js]){const c=f.endsWith('.html')?text(f).replace(/<(?:p|li|td|code)[^>]*>[\s\S]*?<\/(?:p|li|td|code)>/gi,''):text(f);if(trackers.test(c))fail('traceur',f,c.match(trackers)[0]);}
/* 4. requêtes du navigateur vers un autre site (le serveur, api/, peut appeler Brevo) */
const netCall=/\b(?:fetch|sendBeacon|EventSource|WebSocket|importScripts)\s*\(\s*['"`](https?:)?\/\/[^'"`]+['"`]|\.open\(\s*['"`][A-Z]+['"`]\s*,\s*['"`](?:https?:)?\/\/|new\s+Image\(\)[^;]*\.src\s*=\s*['"`]https?:/g;
for(const f of js.filter(f=>!f.startsWith('api/')))for(const m of text(f).matchAll(netCall))if(!OWN.test(m[0].replace(/^[^'"`]*['"`]/,'')))fail('requête externe',f,m[0].slice(0,120));
const csp=((vercel.headers||[]).find(h=>h.source==='/(.*)')?.headers||[]).find(x=>/content-security-policy/i.test(x.key))?.value||'';facts.csp=csp;
if(!/connect-src 'self'(?:;|$)/.test(csp))fail('CSP',"vercel.json","connect-src n’est pas limité à 'self'");
if(!/script-src 'self'(?:;|$)/.test(csp))fail('CSP','vercel.json',"script-src n’est pas limité à 'self'");
/* 5. formulaires qui postent ailleurs */
const forms=[];for(const f of html)for(const m of text(f).matchAll(/<form\b[^>]*\saction="([^"]+)"/gi))if(EXT.test(m[1])&&!OWN.test(m[1]))forms.push({file:f,action:m[1]});
facts.externalForms=forms;/* v7.60 : l'accueil traduit (en/index.html) porte le même formulaire d'alerte que l'accueil */for(const x of forms)if(!(/^(?:[a-z]{2}\/)?index\.html$/.test(x.file)&&/^https:\/\/[a-z0-9]+\.sibforms\.com\//.test(x.action)))fail('formulaire externe',x.file,x.action);
/* 6. fonctions serveur connues (contact, IA), pas de package.json */
if(files.includes('package.json'))fail('build','package.json','présent');
if(JSON.stringify(api)!==JSON.stringify(['api/contact.js','api/ia-achat.js','api/ia.js']))fail('fonction serveur','api/',api.join(', ')); /* v7.67 : api/ia.js (IA Claude de Léo et du calculateur, déclarée dans les Mentions) ; v7.69 : api/ia-achat.js (crédit IA payant, fermé tant que la vente n'est pas ouverte) */
/* 7. stockage du navigateur : toutes les clés commencent par « lk » */
const keys=new Set(),unresolved=[];
for(const f of js.filter(f=>!f.startsWith('api/'))){const s=text(f),consts=new Map();for(const m of s.matchAll(/\b([A-Za-z_$][\w$]*)\s*=\s*['"`]([^'"`]*)['"`]/g))if(!consts.has(m[1]))consts.set(m[1],m[2]);
 for(const m of s.matchAll(/\b(?:localStorage|sessionStorage|storage|store)\.setItem\(\s*([^,]+),/g)){const a=m[1].trim();let key=null;
  const lit=a.match(/^['"`]([^'"`]*)['"`]/);if(lit)key=lit[1];else{const id=a.match(/^([A-Za-z_$][\w$]*)/);if(id&&consts.has(id[1]))key=consts.get(id[1]);}
  if(key===null){unresolved.push(f+' : '+a.slice(0,50));continue;}keys.add(key);if(!/^lk/.test(key))fail('stockage',f,'clé '+key);}}
facts.storageKeys=[...keys].sort();facts.storageUnresolved=unresolved;
/* Clés calculées : ce sont les paramètres des fonctions génériques (common.js write/writeBatch, calculateurs.js persist,
   progression-core.js, carnets). Leurs appelants passent tous une clé « lk… » (LEGACY et TRANSPORT de progression-core.js,
   FAMILIES de suivi.js, constantes de carte.js) : relu le 28/09/2026, voir outils/CHANGEMENTS-v7.46.txt. */
const report={checkedFiles:{html:html.length,js:js.length,css:css.length},facts,problems};
if(asJSON)console.log(JSON.stringify(report,null,1));else{
 console.log('Preuve de confidentialité : '+html.length+' pages, '+js.length+' scripts, '+css.length+' feuilles de style déployés.');
 console.log('- Cookies : '+(problems.some(p=>p.rule==='cookie')?'TROUVÉ':'aucun (ni document.cookie, ni cookieStore, ni Set-Cookie)')+'.');
 console.log('- Ressources d’autres sites dans les pages : '+external+'. Traceurs : '+(problems.some(p=>p.rule==='traceur')?'TROUVÉ':'aucun')+'. Requêtes du navigateur vers un autre site : '+problems.filter(p=>p.rule==='requête externe').length+'.');
 console.log('- CSP : '+csp);
 console.log('- Formulaires qui postent ailleurs : '+forms.map(x=>x.file+' → '+new URL(x.action).host).join(', ')+'. Fonctions serveur : '+api.join(', ')+'. package.json : '+(files.includes('package.json')?'présent':'absent')+'.');
 console.log('- Clés de stockage lues dans le code : '+facts.storageKeys.join(', ')+' ; clés calculées : '+unresolved.length+'.');
 for(const p of problems)console.log('  ✗ '+p.rule+' — '+p.where+' : '+p.detail);
 console.log(problems.length?'Affirmation fausse : corrige le code ou les Mentions.':'Toutes les affirmations des Mentions sont tenues.');}
process.exitCode=problems.length?1:0;
module.exports={report};
