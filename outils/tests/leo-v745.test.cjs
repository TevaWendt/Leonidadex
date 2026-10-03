'use strict';
/* v7.45 (lot 8) : Léo v2. Base de connaissances, lexique, noyau et morceaux, compréhension du français approximatif, suites de
   conversation, renvoi Rockstar, hors sujet, évaluation (outils/tests/leo-eval.cjs), interface dans jsdom (réponse progressive,
   mouvement réduit, signalement, mention locale, suggestions selon la page), préremplissage de Contact, chaîne de génération. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process'),{JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'../..'),read=f=>fs.readFileSync(path.join(root,f),'utf8'),json=f=>JSON.parse(read(f));
const C=require(root+'/leo-core.js'),N=require(root+'/leo-nlp.js'),data=json('leo-index.json'),kb=json('outils/leo-knowledge.json'),lex=json('outils/leo-lexique.json'),manifest=json('outils/leo-index-manifest.json');
const core=C.create(data,{load:async(name,file)=>JSON.parse(read(file.slice(1)))});for(const name of Object.keys(data.shards))core.attach(name,JSON.parse(read(data.shards[name].file.slice(1))));
const ask=(q,c={})=>core.answer(q,c,{now:'2026-10-01T12:00:00Z',page:'/index.html'});

test('Base : au moins 300 questions rédigées, 5 à 15 formulations chacune, réponse en « tu » avec sa page source',()=>{
 assert.ok(kb.topics.length>=300,'sujets : '+kb.topics.length);const ids=new Set();
 for(const t of kb.topics){assert.ok(!ids.has(t.id),t.id);ids.add(t.id);assert.ok(t.q&&t.f.length>=5&&t.f.length<=15,t.id);assert.ok(t.text.length<=900&&t.text.length>=40,t.id);assert.ok(t.links.length>=1,t.id);assert.ok(fs.existsSync(path.join(root,t.links[0].url.split(/[?#]/)[0].slice(1))),t.id+' '+t.links[0].url);}
 const abbreviated=kb.topics.reduce((n,t)=>n+t.f.filter(f=>/\b(?:cb|pq|pk|koi|c koi|ckoi|kan|kel|kelle|ki|cmt|jsp|ya|ds|pr|mtn|ultim|ed |gta6|gtavi|vc|lk|bp|preco|ptet|esk|eske|keske)\b/.test(f)).length,0);
 assert.ok(abbreviated>=80,'formulations abrégées ou fautives : '+abbreviated);
 assert.ok(manifest.counts.questionsRedigees>=300&&manifest.counts.questionsGenerees>=10000&&manifest.counts.passages>=300,JSON.stringify(manifest.counts));});
test('Lexique : au moins 150 abréviations avec forme normalisée et concept, synonymes par concept, anglais courant',()=>{
 assert.ok(lex.abbreviations.length>=150);for(const a of lex.abbreviations){assert.ok(typeof a.f==='string'&&a.f&&typeof a.to==='string'&&typeof a.c==='string'&&a.c,JSON.stringify(a));assert.equal(a.f,a.f.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase());}
 for(const w of ['gta6','gta 6','gta vi','vc','jsp','cb','pq','koi','ultim','dlc','pnj','bagnole','flingue','thune','baraque','safehouse','tuning','edition ultim','ed ultimate'])assert.ok(lex.abbreviations.some(a=>a.f===w),w);
 assert.ok(Object.keys(lex.concepts).length>=20&&lex.english.length>=80);
 const A=N.createAnalyzer(lex);assert.deepEqual(A.analyze('GTA 6').terms,A.analyze('gta6').terms);assert.deepEqual(A.analyze('gta vi').terms,A.analyze('grand theft auto 6').terms);assert.ok(A.analyze('cb coute la baraque de jason').expanded.includes('maison'));assert.ok(A.analyze('price of the car').expanded.includes('prix'));});
test('Noyau ≤ 320 ko (v7.58 : 300 → 320, vues de section et aide par page), morceaux présents, chargés à la demande seulement',async()=>{
 assert.ok(fs.statSync(path.join(root,'leo-index.json')).size<=320*1024);for(const [name,s] of Object.entries(data.shards)){assert.ok(fs.existsSync(path.join(root,s.file.slice(1))),name);const j=JSON.parse(read(s.file.slice(1)));assert.equal(j.revision,data.revision,name);}
 const fresh=C.create(data,{load:async(name,file)=>JSON.parse(read(file.slice(1)))});assert.deepEqual(fresh.loaded(),[]);
 const a=await fresh.ask('Quand sort GTA 6 ?',{},{now:'2026-10-01T12:00:00Z'});assert.equal(a.topic,'sortie');assert.deepEqual(fresh.loaded(),[],'une question rédigée ne charge aucun morceau');
 for(const q of ['bonjour','c est quoi le roi','merci'])await fresh.ask(q,{},{});assert.deepEqual(fresh.loaded(),[],'salutations, définitions et FAQ répondent depuis le noyau seul');
 assert.ok(fresh.needs('c est quoi le kamacho').includes('vehicules'));assert.ok(fresh.needs('ou est ocean beach').includes('lieux'));assert.ok(fresh.needs('emperr').includes('vehicules'),'un nom mal orthographié désigne son morceau');assert.ok(!fresh.needs('bonjour').length);
 const b=await fresh.ask('albany emperor s inspire de quoi',{},{});assert.equal(b.entity,'vehicle:albany-emperor');assert.ok(fresh.loaded().includes('vehicules')&&!fresh.loaded().includes('armes')&&!fresh.loaded().includes('passages'),'seuls les morceaux dont le vocabulaire touche la question : '+fresh.loaded().join(', '));});
test('Compréhension : abréviations, SMS, fautes, anglais, chiffres',()=>{
 assert.equal(ask('kan sor gta6').topic,'sortie');assert.ok(['editions','ultime-contenu'].includes(ask('C koi l ed ultimate').topic));assert.equal(ask('ki est cal').topic,'cal');assert.equal(ask('les flics ds gta6').topic,'police');
 assert.equal(ask('kestion : veicule le + rapide ?').topic,'vehicule-rapide');{const k=ask('kamasho ca vaut le coup ?');assert.ok(k.entity==='vehicle:canis-kamacho'||(k.request&&k.request.items.includes('canis-kamacho'))||(k.results||[]).some(r=>r.key==='vehicle:canis-kamacho'),'faute sur un nom : '+k.kind);}assert.equal(ask('when is gta 6 release').topic,'sortie');
 const calc=ask('g 300k je veux 2 millions');assert.equal(calc.kind,'calc');assert.equal(calc.request.values.capital,300000);assert.equal(calc.request.values.target,2000000);
 assert.equal(ask('prix gta 6 en euros').kind==='choices'?'prix':ask('prix gta 6 en euros').topic,'prix');assert.equal(ask('cb coute gta6').kind==='calc',false);
 assert.ok(N.distance('kamacho','kamasho')<=1&&N.distance('emperor','emperr')<=1);assert.equal(N.phonetic('kestion'),N.phonetic('question'));});
test('Suites de conversation : la dernière fiche ou le dernier sujet est repris',()=>{
 let a=ask('qui est jason');assert.equal(a.topic,'jason');a=ask('et son arme ?',a.context);assert.equal(a.entity,'character:jason');assert.match(a.text,/Girardi ES9/);a=ask('et sa maison ?',a.context);assert.match(a.text,/maison de Jason/);assert.ok(a.action&&a.action.type==='map');
 let b=ask('canis kamacho c est quoi');b=ask('et son prix ?',b.context);assert.equal(b.entity,'vehicle:canis-kamacho');assert.ok(b.request&&b.request.tool==='purchase');
 let c=ask('ou est ocean beach');assert.equal(c.entity,'map:ocean-beach');c=ask('et a vice city ?',c.context);assert.equal(c.entity,'place:vice-city');assert.ok(c.action.url.includes('lieu=vice-city'));
 assert.ok(Array.isArray(c.context.recent)&&c.context.recent.length<=6);
 /* première question sur une fiche : elle vise la fiche ouverte */
 const onPage=(q,pageKey)=>core.answer(q,{},{now:'2026-10-01T12:00:00Z',pageKey});
 assert.match(onPage('et son arme ?','character:jason').text,/Girardi ES9/);assert.match(onPage('et son prix ?','vehicle:canis-kamacho').text,/Canis Kamacho/);assert.equal(onPage('ça vaut le coup ?','vehicle:canis-kamacho').request.tool,'roi');assert.deepEqual(onPage('est-ce que je peux l’acheter ?','vehicle:canis-kamacho').request.items,['canis-kamacho']);assert.equal(onPage('c est ou ?','map:ocean-beach').entity,'map:ocean-beach');assert.equal(onPage('qui est jason','vehicle:canis-kamacho').topic,'jason');});
test('« Tu voulais dire… ? », renvoi Rockstar obligatoire, hors sujet, jamais sans source',()=>{
 const nf=ask('c est quoi le zorglub de gta 6');assert.equal(nf.kind,'unknown');assert.match(nf.text,/Je n’ai pas cette réponse/);assert.ok(nf.external.some(x=>x.url==='https://www.rockstargames.com/VI'));assert.ok(nf.links.length>=1);assert.match(nf.report,/^\/contact\.html#motif=leo/);
 const off=ask('capitale de la france');assert.equal(off.kind,'refusal');assert.match(off.text,/seulement sur Leonidakit et GTA VI/);assert.equal(off.choices.length,2);assert.ok(off.external.some(x=>/rockstargames\.com/.test(x.url)));
 assert.equal(ask('2+2').kind,'refusal');assert.equal(ask('minecraft c est bien ?').kind,'refusal');{const m=ask('comment maigrir vite dans gta 6');assert.notEqual(m.kind,'refusal','ancré sur GTA VI : pas un refus');assert.ok((m.links||[]).length||(m.external||[]).length,'toujours une piste');}
 const who=ask('qui est jason');assert.ok(who.links[0].url.startsWith('/personnages/'));assert.equal(who.source,'https://www.rockstargames.com/VI/only-in-leonida/jason');
 for(const t of data.knowledge)assert.ok(t.links.length>=1,t.id);const shardK=JSON.parse(read('leo/calculateur.json')).knowledge;for(const t of shardK)assert.ok(t.links.length>=1,t.id);
 for(const [k,v] of Object.entries(data.official)){assert.match(v.url,/^https:\/\/www\.rockstargames\.com\//);assert.ok(C.safeSource(v.url),k);}});
test('Gabarits par famille : véhicule, arme, lieu, personnage, ligne de liste',()=>{
 const v=ask('albany emperor s inspire de quoi');assert.match(v.text,/Cadillac Sedan de Ville/);assert.equal(v.links[0].url,'/vehicules/albany-emperor.html');
 const p=ask('combien coute le kamacho');assert.equal(p.entity,'vehicle:canis-kamacho');assert.match(p.text,/aucun prix/i);assert.ok(p.request);
 const u=ask('le kamacho est dans l edition ultimate ?');assert.match(u.text,/^Non/);const w=ask('munitions du nipper 38');assert.equal(w.entity,'weapon:nipper-38');assert.match(w.text,/utilise/);
 const l=ask('ou est ocean beach');assert.equal(l.action.url,'/carte.html#lieu=ocean-beach');assert.match(l.text,/Vice City/);
 const r=ask('combien coute le turbo');assert.ok(r.topic==='prix-tuning'||r.entity==='catalogue:turbo');const c=ask('c est quoi le shake proteine');assert.ok(c.entity==='catalogue:shake-proteine'||c.topic);
 const s=ask('c est quoi une supercar');assert.ok(['answer','unknown','results','choices'].includes(s.kind));});
test('Noms de fiches : un nom seul mène à sa fiche, homonymes départagés par leur numéro, noms sans mot long',()=>{
 for(const [q,key] of [['marteau','weapon:marteau'],['cocktail molotov','weapon:molotov'],['pm compact','weapon:smg-compact'],['c est quoi le sprunk','catalogue:sprunk'],['p\'s & q\'s','catalogue:ps-and-qs'],['100 fisher island dr','map:g-L759'],['4522 fisher island dr','map:g-L1249'],['bravado bison 1800','vehicle:bravado-bison-1800'],['bravado bison','vehicle:bravado-bison'],['vapid dominator 67','vehicle:vapid-dominator-67']]){const a=ask(q);assert.ok(a.entity===key||(a.links||[]).some(l=>l.url===core.byKey.get(key).url),q+' → '+(a.entity||a.topic));}
 assert.equal(ask('lucia').topic,'lucia');assert.equal(ask('jason').topic,'jason');
 const k=ask('je veux acheter leonida keys');assert.match(k.text,/destination/);assert.equal(k.request,undefined);
 /* balayage : chaque nom unique (hors codes « plus code ») mène à sa fiche */
 const strip=s=>s.replace(/\s*\((?:nom r[ée]el|nom suppos[ée])\)\s*$/i,''),cl=s=>N.raw(strip(s)).map(N.stem).join(' '),count=new Map();for(const it of core.items)count.set(cl(it.name),(count.get(cl(it.name))||0)+1);
 let n=0,ok=0;const bad=[];for(const it of core.items){const k2=cl(it.name);if(count.get(k2)>1||!/[a-z]{3}/.test(k2)||/^[a-z0-9]{4}\+/i.test(it.name))continue;n++;const a=ask(strip(it.name)),urls=[...(a.links||[]).map(l=>l.url),...(a.results||[]).map(r=>r.url),a.action?.url];if(urls.includes(it.url))ok++;else bad.push(it.name);}
 assert.ok(ok/n>=0.995,'noms uniques : '+ok+'/'+n+' ; '+bad.slice(0,10).join(' | '));});
test('Précalculs : formulations, noms et passages livrés analysés = analyse du navigateur ; un morceau n’est chargé qu’une fois',async()=>{
 const byId=new Map([...data.knowledge,...json('leo/calculateur.json').knowledge].map(t=>[t.id,t]));let checked=0;
 for(const t of kb.topics){const c=byId.get(t.id);assert.ok(c,t.id);assert.equal(c.f,undefined);assert.equal(c.d.length,t.f.length,t.id);t.f.forEach((f,i)=>assert.equal(c.d[i],core.analyze(f).terms.join(' '),t.id+' '+f));assert.equal(c.dq,core.analyze(c.q).terms.join(' '),t.id);checked++;}
 assert.equal(checked,kb.topics.length);
 const lieux=json('leo/lieux.json'),ntCol=lieux.packed.indexOf('nt'),nameCol=lieux.packed.indexOf('name');assert.ok(ntCol>0);for(const row of lieux.items){const t=N.nameTokens({analyze:core.analyze},row[nameCol]);if(row[ntCol])assert.equal(row[ntCol],t.toks.join(' ')+'|'+t.minor.join(' '),row[nameCol]);}
 const pass=json('leo/passages.json').items;for(const p of pass.slice(0,120))assert.equal(p.s,core.analyze(p.h+' '+p.x).terms.join(' '),p.p);
 assert.deepEqual(data.seqNames.map(x=>x[0]).sort(),['p s q s','ps qs']);
 let calls=0;const lazy=C.create(data,{load:async(name,file)=>{calls++;await new Promise(r=>setTimeout(r,15));return JSON.parse(read(file.slice(1)));}});const [a,b]=await Promise.all([lazy.loadShard('lieux'),lazy.loadShard('lieux')]);assert.ok(a&&b);assert.equal(calls,1,'une seule requête pour deux demandes simultanées');assert.equal(lazy.items.filter(x=>x.key==='map:ocean-beach').length,1);});
test('Suggestions selon la page et lien de signalement',()=>{
 assert.equal(core.suggest({path:'/index.html'}).length,6);assert.ok(core.suggest({path:'/carte.html'}).some(q=>/carte/i.test(q)));assert.ok(core.suggest({path:'/vehicules/albany-emperor.html',name:'Albany Emperor'}).some(q=>/Albany Emperor/.test(q)));
 assert.ok(core.suggest({path:'/calculateurs.html'}).some(q=>/calcul/i.test(q)));assert.ok(core.suggest({path:'/nourriture.html'}).some(q=>/coûte|coiffure|tuning|tatouage/i.test(q)));
 const link=core.reportLink('ma question','sa réponse','/index.html');assert.match(link,/^\/contact\.html#motif=leo&question=ma\+question&reponse=sa\+r%C3%A9ponse&page=%2Findex\.html$/);});
test('Évaluation : ≥ 95 % de bonnes pages ou intentions, 100 % des hors sujet refusés avec le lien Rockstar, 0 réponse sans source',async()=>{
 const set=json('outils/tests/leo-questions.json').questions;assert.ok(set.length>=300);const count=tag=>set.filter(x=>x.tags.includes(tag)).length;
 assert.ok(count('sms')+count('abrev')+count('faute')+count('anglais')>=80);assert.ok(count('horssujet')>=30);assert.ok(count('suite')>=20);assert.ok(count('lot5')+count('lot6')>=20);
 const report=await require('./leo-eval.cjs').run();assert.ok(report.accuracy>=95,'précision '+report.accuracy);assert.equal(report.offtopic.refused,report.offtopic.n);assert.equal(report.withoutSource,0);assert.ok(report.timingMs.median<50);});
test('Interface (jsdom) : réponse progressive lisible, mouvement réduit, signalement, mention locale, suggestions',async()=>{
 const html='<!doctype html><html lang="fr"><head></head><body><main><h1>Accueil</h1></main><button id="leo-launch" type="button"><span class="leo-symbol"><span>L</span></span><span>Léo</span></button></body></html>';
 const run=async reduced=>{const dom=new JSDOM(html,{runScripts:'outside-only',url:'https://www.leonidakit.com/index.html',pretendToBeVisual:true});const w=dom.window;
  w.matchMedia=q=>({matches:/reduced-motion/.test(q)?reduced:false,addEventListener(){},removeEventListener(){}});w.HTMLElement.prototype.animate=function(){return {cancel(){}};};w.Element.prototype.getAnimations=()=>[];w.HTMLDialogElement=w.HTMLDialogElement||w.HTMLElement;
  for(const proto of [w.HTMLElement.prototype]){if(!proto.showModal)proto.showModal=function(){this.open=true;this.setAttribute('open','');};if(!proto.show)proto.show=function(){this.open=true;this.setAttribute('open','');};if(!proto.close)proto.close=function(){this.open=false;this.removeAttribute('open');};}
  w.fetch=async url=>{const p=String(url).replace(/^https:\/\/www\.leonidakit\.com/,'').replace(/\?.*$/,'').replace(/^\//,'');const text=read(p);return {ok:true,status:200,headers:{get:()=>String(Buffer.byteLength(text))},text:async()=>text};};
  try{w.LKLeoLoader={place(){}};for(const f of ['calculateurs-engine.js','leo-link.js','leo-nlp.js','leo-core.js','leo-ui.js'])w.eval(read(f));
  w.LKLeoUI.open();await new Promise(r=>setTimeout(r,50));const panel=w.document.getElementById('leo-panel');assert.ok(panel.open);
  assert.equal(panel.querySelectorAll('.leo-suggestions button').length,6,'six suggestions selon la page');assert.match(panel.querySelector('.leo-notice').textContent,/rien n’est envoyé/);assert.ok(panel.querySelector('.leo-notice a[href*="mentions-legales"]'));
  await w.LKLeoUI.ask('Quand sort GTA 6 ?');const bots=()=>[...panel.querySelectorAll('.leo-message.bot')];let last=bots().pop(),p=last.querySelector('p');const expected=core.answer('Quand sort GTA 6 ?',{},{now:new Date().toISOString()}).text;
  if(reduced)assert.equal(p.textContent,expected,'mouvement réduit : texte complet immédiatement');else{await new Promise(r=>setTimeout(r,450));assert.equal(p.textContent,expected,'texte complet après la composition');}
  assert.ok(last.querySelector('a.leo-report')&&/^\/contact\.html#motif=leo/.test(last.querySelector('a.leo-report').getAttribute('href')));assert.ok(last.querySelector('.leo-links a'));
  await w.LKLeoUI.ask('capitale de la france');await new Promise(r=>setTimeout(r,450));last=bots().pop();assert.ok(last.querySelector('.leo-external a[target="_blank"][rel="noopener"]'),'lien Rockstar externe');assert.equal(last.querySelectorAll('button.leo-choice').length,2);
  await w.LKLeoUI.ask('qui est jason');await w.LKLeoUI.ask('et son arme ?');await new Promise(r=>setTimeout(r,450));last=bots().pop();assert.match(last.textContent,/Girardi ES9/);
  const stored=JSON.parse(w.sessionStorage.getItem('lk_leo_session_v2'));assert.equal(stored.v,2);assert.ok(stored.messages.length>=8&&stored.messages.length<=32);}finally{dom.window.close();}};
 await run(false);await run(true);});
test('Interface (jsdom) : sur une fiche, le morceau de sa famille est préparé à l’ouverture et « ça vaut le coup ? » vise la fiche ouverte',async()=>{
 const html='<!doctype html><html lang="fr"><head></head><body><main><h1>Canis Kamacho</h1></main><button id="leo-launch" type="button"><span class="leo-symbol"><span>L</span></span><span>Léo</span></button></body></html>';const dom=new JSDOM(html,{runScripts:'outside-only',url:'https://www.leonidakit.com/vehicules/canis-kamacho.html',pretendToBeVisual:true});const w=dom.window;
 w.matchMedia=q=>({matches:/reduced-motion/.test(q),addEventListener(){},removeEventListener(){}});w.HTMLElement.prototype.animate=function(){return {cancel(){}};};w.Element.prototype.getAnimations=()=>[];for(const k of ['showModal','show'])if(!w.HTMLElement.prototype[k])w.HTMLElement.prototype[k]=function(){this.open=true;this.setAttribute('open','');};if(!w.HTMLElement.prototype.close)w.HTMLElement.prototype.close=function(){this.open=false;this.removeAttribute('open');};
 const asked=[];w.fetch=async url=>{const p=String(url).replace(/^https:\/\/www\.leonidakit\.com/,'').replace(/\?.*$/,'').replace(/^\//,'');asked.push(p);const text=read(p);return {ok:true,status:200,headers:{get:()=>String(Buffer.byteLength(text))},text:async()=>text};};
 try{w.LKLeoLoader={place(){}};for(const f of ['calculateurs-engine.js','leo-link.js','leo-nlp.js','leo-core.js','leo-ui.js'])w.eval(read(f));
 w.LKLeoUI.open();await new Promise(r=>setTimeout(r,80));assert.ok(asked.includes('leo/vehicules.json'),'morceau des véhicules préparé : '+asked.join(', '));assert.ok(!asked.includes('leo/lieux.json')&&!asked.includes('leo/passages.json'));
 await w.LKLeoUI.ask('ça vaut le coup ?');const stored=JSON.parse(w.sessionStorage.getItem('lk_leo_session_v2'));const a=stored.messages[stored.messages.length-1].answer;assert.equal(a.kind,'calc');assert.equal(a.request.tool,'roi');assert.deepEqual(a.request.items,['canis-kamacho']);
 await w.LKLeoUI.ask('combien ça coûte ?');const s2=JSON.parse(w.sessionStorage.getItem('lk_leo_session_v2'));const b=s2.messages[s2.messages.length-1].answer;assert.match(b.text,/Canis Kamacho/);
 const input=w.document.getElementById('leo-question');input.value='ou est ocean beach';input.dispatchEvent(new w.Event('input'));await new Promise(r=>setTimeout(r,260));assert.ok(asked.includes('leo/lieux.json'),'les lieux sont préparés pendant la frappe');}finally{dom.window.close();}});
test('Contact : préremplissage depuis le lien de signalement, rien n’est envoyé',()=>{
 const url='https://www.leonidakit.com/contact.html#motif=leo&question=cb+coute+la+baraque+de+jason&reponse=Aucun+prix&page=%2Findex.html';const dom=new JSDOM(read('contact.html'),{runScripts:'outside-only',url});const w=dom.window;w.LK={copy:async()=>true};w.eval(read('contact.js'));
 assert.equal(w.document.getElementById('contact-topic').value,'Réponse de Léo à corriger');assert.match(w.document.getElementById('contact-details').value,/Question posée à Léo\s: cb coute la baraque de jason/);assert.equal(w.document.getElementById('contact-page').value,'https://www.leonidakit.com/index.html');assert.match(w.document.getElementById('contact-status').textContent,/Rien n’est envoyé/);
 assert.ok(read('contact.html').includes('<option>Réponse de Léo à corriger</option>'));dom.window.close();
 const old=new JSDOM(read('contact.html'),{runScripts:'outside-only',url:'https://www.leonidakit.com/contact.html?motif=leo&question=ancienne+forme'});old.window.LK={copy:async()=>true};old.window.eval(read('contact.js'));assert.match(old.window.document.getElementById('contact-details').value,/ancienne forme/,'l’ancienne forme après ? reste lue');old.window.close();
 const plain=new JSDOM(read('contact.html'),{runScripts:'outside-only',url:'https://www.leonidakit.com/contact.html#formulaire'});plain.window.LK={copy:async()=>true};plain.window.eval(read('contact.js'));assert.equal(plain.window.document.getElementById('contact-details').value,'','une ancre ordinaire ne préremplit rien');plain.window.close();});
test('Chaîne : loader, empreintes, cache, CSP, générateur --check, verifier',()=>{
 assert.ok(/script\('leo-nlp\.js','LKLeoNLP'(?:,true)?\)/.test(read('leo-loader.js')));assert.ok(read('outils/sync-site.cjs').includes("'leo-nlp.js'")&&read('outils/sync-site.cjs').includes("'leo/'+f"));
 const v=/\?v=([a-f0-9]{12})/.exec(read('leo-ui.js'))[1];assert.equal(v,/leo-loader\.js\?v=([a-f0-9]{12})/.exec(read('common.js'))[1]);
 const vercel=json('vercel.json');assert.ok(vercel.headers.some(h=>h.source==='/leo/(.*)'));assert.match(vercel.headers[0].headers[0].value,/connect-src 'self'/);assert.ok(!fs.existsSync(path.join(root,'package.json')));
 execFileSync(process.execPath,[path.join(root,'outils/gen-leo.cjs'),'--check'],{cwd:root,stdio:'pipe'});const out=execFileSync(process.execPath,[path.join(root,'outils/verifier.js')],{cwd:root,stdio:'pipe'}).toString();assert.match(out,/Aucune erreur/);});
