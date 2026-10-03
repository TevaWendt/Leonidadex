#!/usr/bin/env node
'use strict';
/* v7.45 (lot 8) : évaluation de Léo. Rejoue outils/tests/leo-questions.json dans un navigateur simulé (jsdom) avec les vrais
   fichiers du site (calculateurs-engine.js, leo-link.js, leo-nlp.js, leo-core.js), le vrai noyau leo-index.json et les vrais
   morceaux leo/*.json (servis par un fetch local). Seuils : au moins 95 % de bonnes pages ou intentions, 100 % des hors sujet
   refusés avec le lien Rockstar, 0 réponse sans source. Sortie : rapport lisible, code 1 si un seuil n'est pas tenu.
   Usage : NODE_PATH=<dossier des dépendances> node outils/tests/leo-eval.cjs [--verbose] [--json] */
const fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'../..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const verbose=process.argv.includes('--verbose'),asJSON=process.argv.includes('--json');
/* v7.61 : --lang en rejoue le jeu anglais (outils/tests/leo-questions-en.json) avec le Léo anglais : en/leo-index.json, en/leo/*.json, scripts traduits de en/, page lang="en" */
const ARG_LANG=(process.argv.find(a=>a.startsWith('--lang='))||'').slice(7)||(process.argv.includes('--lang')?process.argv[process.argv.indexOf('--lang')+1]:'fr');
async function run(opts={}){
 const LANG=opts.lang||ARG_LANG,PFX=LANG==='fr'?'':LANG+'/';
 const dom=new JSDOM('<!doctype html><html lang="'+LANG+'"><body><main></main></body></html>',{runScripts:'outside-only',url:'https://www.leonidakit.com/'+PFX+'index.html'});const w=dom.window;
 w.fetch=async url=>{const p=String(url).replace(/^https:\/\/www\.leonidakit\.com/,'').replace(/\?.*$/,'');const file=path.join(root,p.replace(/^\//,''));if(!fs.existsSync(file))return {ok:false,status:404,headers:{get:()=>'0'},text:async()=>''};const text=fs.readFileSync(file,'utf8');return {ok:true,status:200,headers:{get:()=>String(Buffer.byteLength(text))},text:async()=>text};};
 for(const f of ['calculateurs-engine.js','leo-link.js','leo-nlp.js','leo-core.js'])w.eval(read(PFX+f));
 const data=JSON.parse(read(PFX+'leo-index.json')),loads=[];const core=w.LKLeoCore.create(data,{load:async(name,file)=>{const r=await w.fetch((PFX?'/'+LANG:'')+file);if(!r.ok)throw Error('Morceau absent : '+file);loads.push(name);return JSON.parse(await r.text());}});
 const QFILE=opts.questions||(process.argv.find(a=>a.startsWith('--questions='))||'').slice(12),set=JSON.parse(QFILE?fs.readFileSync(QFILE,'utf8'):read(LANG==='fr'?'outils/tests/leo-questions.json':'outils/tests/leo-questions-'+LANG+'.json')).questions,results=[],now='2026-10-01T12:00:00Z';
 const hasSource=a=>(a.links||[]).length>0||!!a.source||(a.external||[]).length>0||!!a.request||(a.results||[]).length>0;
 /* une réponse « Tu voulais dire… ? » compte comme bonne si le sujet attendu est l'une des deux puces */
 const check=(exp,a)=>{if(exp.any)return exp.any.some(e=>check(e,a));if(exp.offtopic)return a.kind==='refusal'&&(a.external||[]).some(x=>/rockstargames\.com/.test(x.url));if(exp.topic&&a.kind==='choices'&&(a.topics||[]).includes(exp.topic))return true;if(exp.kind&&a.kind!==exp.kind)return false;if(exp.topic&&a.topic!==exp.topic)return false;if(exp.tool&&(!a.request||a.request.tool!==exp.tool))return false;
  if(exp.entity&&!(a.entity===exp.entity||(a.results||[]).some(r=>r.key===exp.entity)||(a.links||[]).some(l=>core.byKey.get(exp.entity)&&l.url===core.byKey.get(exp.entity).url)))return false;
  if(exp.page&&!((a.links||[]).some(l=>l.url.split(/[?#]/)[0]===exp.page)||(a.action&&a.action.url.split(/[?#]/)[0]===exp.page)))return false;return true;};
 for(const x of set){let ctx={};const t0=process.hrtime.bigint();if(x.prev){const p=await core.ask(x.prev,{},{now});ctx=p.context||{};}const a=await core.ask(x.q,ctx,{now});const ms=Number(process.hrtime.bigint()-t0)/1e6;
  const ok=check(x.expect,a),src=['answer','results','calc','choices'].includes(a.kind)?hasSource(a):true;results.push({q:x.q,prev:x.prev||null,tags:x.tags,expect:x.expect,ok,src,kind:a.kind,topic:a.topic||null,entity:a.entity||null,tool:a.request?.tool||null,ms:+ms.toFixed(1)});}
 const total=results.length,good=results.filter(r=>r.ok).length,off=results.filter(r=>r.expect.offtopic),offOK=off.filter(r=>r.ok).length,noSource=results.filter(r=>!r.src);
 const byTag={};for(const r of results)for(const t of r.tags){byTag[t]=byTag[t]||{n:0,ok:0};byTag[t].n++;if(r.ok)byTag[t].ok++;}
 const times=results.map(r=>r.ms).sort((a,b)=>a-b),median=times[Math.floor(times.length/2)],p95=times[Math.floor(times.length*0.95)];
 const sizes=Object.fromEntries(['leo-index.json',...fs.readdirSync(path.join(root,'leo')).map(f=>'leo/'+f)].map(f=>[f,fs.statSync(path.join(root,f)).size]));
 const report={questions:total,correct:good,accuracy:+(100*good/total).toFixed(1),offtopic:{n:off.length,refused:offOK},withoutSource:noSource.length,byTag:Object.fromEntries(Object.entries(byTag).map(([k,v])=>[k,+(100*v.ok/v.n).toFixed(1)+' % ('+v.ok+'/'+v.n+')'])),timingMs:{median,p95,max:times[times.length-1]},shardsLoaded:[...new Set(loads)],sizes,thresholds:{accuracy:good/total>=0.95,offtopic:off.length===offOK,sources:noSource.length===0}};
 const failures=results.filter(r=>!r.ok||!r.src);
 if(asJSON)console.log(JSON.stringify({report,failures},null,1));else{
  console.log('Léo — évaluation : '+good+'/'+total+' bonnes pages ou intentions ('+report.accuracy+' %), hors sujet refusés '+offOK+'/'+off.length+', réponses sans source : '+noSource.length+'.');
  console.log('Par étiquette : '+Object.entries(report.byTag).map(([k,v])=>k+' '+v).join(' · '));
  console.log('Temps par question (jsdom, chargements compris) : médiane '+median+' ms, p95 '+p95+' ms, max '+times[times.length-1]+' ms. Morceaux chargés : '+report.shardsLoaded.join(', ')+'.');
  if(failures.length||verbose)for(const r of (verbose?results:failures))console.log((r.ok?'  ok  ':'  KO  ')+(r.src?'':'[sans source] ')+JSON.stringify(r.q)+(r.prev?' (après '+JSON.stringify(r.prev)+')':'')+' → '+r.kind+(r.topic?' '+r.topic:'')+(r.entity?' '+r.entity:'')+(r.tool?' outil '+r.tool:'')+' ; attendu '+JSON.stringify(r.expect));
  console.log(Object.values(report.thresholds).every(Boolean)?'Seuils tenus.':'Seuil non tenu.');}
 dom.window.close();return report;
}
if(require.main===module)run().then(r=>{process.exitCode=Object.values(r.thresholds).every(Boolean)?0:1;}).catch(e=>{console.error(e);process.exitCode=1;});
module.exports={run};
