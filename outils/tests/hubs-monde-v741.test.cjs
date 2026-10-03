/* v7.41 (lot 4) : hubs du monde — zones éditoriales générées (outils/editorial-hubs.json → hubs-monde.cjs → lore-gen.js),
   anti-doublon hubs ↔ fiches, FAQ en FAQPage et dans Léo, CollectionPage, encart calculateur unique (site-shell.cjs),
   sources datées, ancres, compte de mots. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm');
const {JSDOM}=require('jsdom');
const root=process.env.SITE_ROOT||path.resolve(__dirname,'../..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const doc=f=>new JSDOM(read(f)).window.document;
const S=require(path.join(root,'outils/sections.cjs'));
const M=require(path.join(root,'outils/hubs-monde.cjs'));
const D=require(path.join(root,'outils/hubs-doublons.cjs'));
const shell=require(path.join(root,'outils/site-shell.cjs'));
const ED=JSON.parse(read('outils/editorial.json')),HUBS=JSON.parse(read('outils/editorial-hubs.json'));
const HUB_FILES={lieux:'lieux.html',personnages:'personnages.html',demeures:'demeures.html',planques:'planques.html',entreprises:'entreprises.html',gangs:'gangs.html'};
const N={lieux:ED.regions.length,personnages:ED.characters.length,demeures:ED.residences.length,planques:ED.hideouts.length,entreprises:ED.businesses.length,gangs:ED.factions.length};
const ld=d=>[...d.querySelectorAll('script[type="application/ld+json"]')].map(s=>JSON.parse(s.textContent));
const words=(d,ids)=>{let n=0;for(const id of ids){const s=d.getElementById(id).cloneNode(true);s.querySelectorAll('.ed-st,.ed-pair-src,.veh-go,figcaption,.ed-num,.ed-kicker,.ed-title').forEach(x=>x.remove());n+=(s.textContent.match(/[\p{L}\p{N}’'-]+/gu)||[]).length;}return n;};

test('sections.cjs : compositions du lot 4 (frise, paires, questions, actions, sources) et trois icônes nouvelles',()=>{
  for(const i of ['film','loupe','sablier'])assert.ok(S.ICONS[i],i);
  const tl=S.timeline([{date:'1 janvier 2026',titre:'T',statut:'vu',texte:'Texte.',media:'vice-city-01',alt:'Alt'},{date:'2 janvier 2026',titre:'U',statut:'officiel',texte:'Texte 2.'}]);
  assert.equal((tl.match(/<li class="ed-tl-item/g)||[]).length,2);assert.match(tl,/ed-tl-item--media/);assert.match(tl,/img\/officiel\/vice-city-01-480\.webp/);assert.match(tl,/pip pip--vu/);assert.match(tl,/Vu dans un média/);
  assert.throws(()=>S.timeline([{date:'x',titre:'T',statut:'vu',texte:'t',media:'inconnu'}]),/Visuel officiel inconnu/);
  const pr=S.pairs([{fiction:'A',reel:'B',src:'s1'},{fiction:'C',reel:'D'}],{s1:{title:'Source 1'}});
  assert.equal((pr.match(/class="ed-pair"/g)||[]).length,2);assert.match(pr,/href="#src-s1"/);assert.equal((pr.match(/ed-pair-src/g)||[]).length,1);
  assert.match(S.pending([{q:'Q ?',etat:'E.'}]),/<h3>Q \?<\/h3><p>E\.<\/p>/);
  assert.match(S.actions([{k:'K',t:'T',d:'D',href:'x.html'}]),/<a class="ed-act" href="x\.html"><span class="ed-act-k">K<\/span>/);
  const sl=S.sourceList([{id:'a',url:'https://x.test/',title:'T',publishedAt:'2026-01-02',consultedAt:'2026-09-27',statut:'comm',claim:'C'}]);
  assert.match(sl,/<li id="src-a">/);assert.match(sl,/publié le 02\/01\/2026 · consulté le 27\/09\/2026/);assert.match(sl,/rel="noopener nofollow"/);assert.match(sl,/Identification communautaire/);
});

test('editorial-hubs.json : hubs complets (six depuis la v7.65), FAQ de 4 à 6 questions avec mots-clés, sources datées et connues, actions avec lien',()=>{
  for(const s of Object.values(HUBS.sources)){assert.match(s.url,/^https:\/\//);assert.ok(s.title&&s.claim,s.url);assert.match(s.consultedAt,/^2026-\d\d-\d\d$/);assert.ok(['officiel','vu','comm','conf'].includes(s.statut),s.url);}
  assert.equal(HUBS.statuts.length,4);
  for(const hub of M.HUBS){const H=HUBS[hub];
    for(const k of ['nav','rockstar','communaute','confirmer','toi','faq','sources'])assert.ok(H[k],hub+' '+k);
    assert.ok(H.faq.length>=4&&H.faq.length<=6,hub+' faq');for(const f of H.faq)assert.ok(Array.isArray(f.k)&&f.k.length>=3&&f.a.length<=900,hub+' : '+f.q);
    assert.ok(H.sources.length>=8,hub+' sources');for(const id of H.sources)assert.ok(HUBS.sources[id],hub+' source '+id);
    assert.ok(H.sources.some(id=>HUBS.sources[id].url.startsWith('https://www.rockstargames.com/')),hub+' : au moins une page Rockstar');
    assert.ok(H.sources.some(id=>HUBS.sources[id].statut==='comm'),hub+' : au moins une source communautaire');
    for(const p of H.communaute.pairs)assert.ok(H.sources.includes(p.src),hub+' : source de paire absente '+p.src);
    for(const x of H.rockstar.items){assert.ok(['officiel','vu','comm','conf'].includes(x.statut),hub+' statut');assert.match(x.date,/20\d\d$/);if(x.media)assert.ok(x.alt,hub+' alt manquant '+x.media);}
    assert.ok(H.confirmer.items.length>=4,hub+' questions ouvertes');assert.equal(H.toi.actions.length,4,hub+' actions');
    assert.ok(H.toi.actions.some(a=>a.pins),hub+' : une action ouvre la carte avec des repères');assert.ok(H.toi.actions.some(a=>/calculateurs\.html\?tool=/.test(a.href||'')),hub+' : une action ouvre le calculateur');
    const wc=M.words(hub);assert.ok(wc>=500&&wc<=800,hub+' : '+wc+' mots dans le JSON');}
});

test('hubs-doublons.cjs : aucune phrase des hubs identique à une phrase des fiches ; le contrôle détecte bien une copie',()=>{
  assert.deepEqual(D.check(),[]);
  const copy=JSON.parse(JSON.stringify(HUBS));copy.lieux.rockstar.p=[ED.regions[0].facts[0]];
  const d=D.check({hubs:copy});assert.ok(d.length>=1);assert.ok(d.every(x=>x.hub==='lieux'&&x.ou==='fiche'));
  assert.equal(D.norm('L’État de Leonida, six régions !'),'l etat de leonida six regions');
});

for(const [hub,file] of Object.entries(HUB_FILES))test(file+' : zone éditoriale sous la grille (six sections dans l’ordre, 500 à 800 mots, frise avec visuels présents, FAQ, sources, ancres), CollectionPage + FAQPage + BreadcrumbList, puces et encart conservés',()=>{
  const d=doc(file),html=read(file);
  assert.ok(d.getElementById('fiches'),'grille #fiches');
  assert.deepEqual([...d.querySelectorAll('.ed-zone--monde section.ed')].map(s=>s.id),['rockstar','communaute','a-confirmer','pour-toi','faq','sources']);
  const order=[...d.querySelectorAll('main > *')].map(e=>e.id||e.className.split(' ')[0]);
  assert.ok(order.indexOf('fiches')<order.indexOf('ed-zone'),'zone après la grille');assert.ok(order.indexOf('ed-zone')<order.indexOf('lk-chips'),'puces après la zone');
  if(hub==='planques')assert.ok(order.indexOf('garages')>order.indexOf('fiches')&&order.indexOf('garages')<order.indexOf('ed-zone'),'Garages entre la grille et la zone');
  const nav=[...d.querySelectorAll('.ed-zone--monde .ed-nav a')];assert.equal(nav.length,HUBS[hub].nav.length);
  for(const a of nav)assert.ok(d.getElementById(a.getAttribute('href').slice(1)),'ancre '+a.getAttribute('href'));
  const wc=words(d,['rockstar','communaute','a-confirmer','pour-toi','faq']);assert.ok(wc>=500&&wc<=800,'mots : '+wc);
  assert.equal(d.querySelectorAll('#rockstar .ed-tl-item').length,HUBS[hub].rockstar.items.length);
  for(const img of d.querySelectorAll('#rockstar img')){assert.ok(fs.existsSync(path.join(root,img.getAttribute('src'))),img.getAttribute('src'));assert.ok(img.getAttribute('alt').length>10);assert.equal(img.getAttribute('loading'),'lazy');}
  assert.equal(d.querySelectorAll('#communaute .ed-pair').length,HUBS[hub].communaute.pairs.length);
  for(const a of d.querySelectorAll('#communaute .ed-pair-src'))assert.ok(d.getElementById(a.getAttribute('href').slice(1)),'source ancrée '+a.getAttribute('href'));
  assert.equal(d.querySelectorAll('#a-confirmer .ed-open-item').length,HUBS[hub].confirmer.items.length);assert.ok(d.getElementById('a-confirmer').classList.contains('ed--night'));
  const acts=[...d.querySelectorAll('#pour-toi .ed-act')];assert.equal(acts.length,4);
  for(const a of acts){const h=a.getAttribute('href');if(h.startsWith('#'))assert.ok(d.getElementById(h.slice(1)),h);else assert.ok(fs.existsSync(path.join(root,h.split(/[?#]/)[0])),h);}
  assert.ok(acts.some(a=>/^carte\.html#pins=[\w,-]+&t=/.test(a.getAttribute('href'))),'carte avec repères préréglés');
  assert.equal(d.querySelectorAll('#faq details').length,HUBS[hub].faq.length);
  const srcs=[...d.querySelectorAll('#sources .ed-srcs li')];assert.equal(srcs.length,HUBS[hub].sources.length);
  for(const li of srcs){assert.match(li.querySelector('a').getAttribute('href'),/^https:\/\//);assert.match(li.querySelector('.ed-src-meta').textContent,/consulté le \d\d\/\d\d\/2026/);}
  assert.equal(d.querySelectorAll('#sources .ed-level').length,4);
  const types=ld(d).map(x=>x['@type']);assert.ok(types.includes('BreadcrumbList')&&types.includes('CollectionPage')&&types.includes('FAQPage'),types.join(','));
  const cp=ld(d).find(x=>x['@type']==='CollectionPage');assert.equal(cp.mainEntity['@type'],'ItemList');assert.equal(cp.mainEntity.numberOfItems,N[hub]);assert.equal(cp.mainEntity.itemListElement.length,N[hub]);
  for(const it of cp.mainEntity.itemListElement){assert.equal(it['@type'],'ListItem');assert.ok(fs.existsSync(path.join(root,it.url.replace('https://www.leonidakit.com/',''))),it.url);}
  const fq=ld(d).find(x=>x['@type']==='FAQPage');assert.equal(fq.mainEntity.length,HUBS[hub].faq.length);const fold=t=>t.replace(/[\u00a0\u202f]/g,' ').replace(/’/g,"'");assert.equal(fold(fq.mainEntity[0].name),fold(HUBS[hub].faq[0].q));
  const ids=[...d.querySelectorAll('[id]')].map(x=>x.id);assert.deepEqual(ids.filter((x,i)=>ids.indexOf(x)!==i),[],'identifiants uniques');
  assert.equal(d.querySelectorAll('nav.lk-chips').length,1);assert.equal(d.querySelectorAll('.lk-stack').length,1);
  assert.equal(html.match(/<!-- lot-d-garages:start -->/g)?.length||0,hub==='planques'?1:0);
});

test('Encart calculateur : un composant unique (site-shell.cjs), même position (avant les puces) sur toutes les pages de section, outil valide, absent ailleurs, idempotent',()=>{
  const tabs=['goal','purchase','session','budget','order','roi','activities','compare','plan'];
  const types=['vehicle','weapon','property','business','place','hideout','style','customization','consumable','ammo','housing'];
  for(const file of shell.entryPages()){const d=doc(file),html=read(file);
    const cards=d.querySelectorAll('.lk-entry-hub');assert.equal(cards.length,1,file);
    const a=cards[0].querySelector('a.lk-entry-button');const u=new URL(a.getAttribute('href'),'https://www.leonidakit.com/'+file);
    assert.equal(u.pathname,'/calculateurs.html');assert.ok(tabs.includes(u.searchParams.get('tool')),file+' tool');if(u.searchParams.get('type'))assert.ok(types.includes(u.searchParams.get('type')),file+' type');
    assert.equal(u.searchParams.get('from'),file.replace(/\.html$/,''));assert.equal(u.hash,'#atelier');
    assert.ok(cards[0].querySelector('h2').textContent.trim().endsWith('?'),file+' : question');
    assert.ok(/calculator-entry\.css/.test(html),file+' : feuille de l’encart');
    const main=[...d.querySelectorAll('main > *')];const i=main.findIndex(e=>e.classList.contains('lk-entry-hub'));
    const chips=main.findIndex(e=>e.classList.contains('lk-chips')),outro=main.findIndex(e=>e.classList.contains('lk-outro'));
    if(chips>=0)assert.equal(i,chips-1,file+' : juste avant les puces');else if(outro>=0)assert.equal(i,outro-1,file+' : juste avant le bandeau de fin');else assert.equal(i,main.length-1,file);
    const fold=t=>t.replace(/[\u00a0\u202f]/g,' ').replace(/’/g,"'");assert.equal(fold(shell.placeEntry(html,file)),fold(html),file+' : idempotent');}
  for(const f of ['index.html','tuto.html','calculateurs.html','progression.html','a-propos.html','medias.html','lieux/vice-city.html','vehicules/albany-emperor.html'])assert.equal(doc(f).querySelectorAll('.lk-entry-hub').length,0,f);
  assert.equal(shell.entry('inconnue.html'),'');
});

test('Léo : les FAQ des hubs du monde sont dans l’index (après les sujets rédigés), avec lien vers la FAQ du hub, et répondent',()=>{
  const idx=JSON.parse(read('leo-index.json'));
  const hubTopics=idx.knowledge.filter(x=>/^hub-/.test(x.id));
  assert.equal(hubTopics.length,M.HUBS.reduce((n,h)=>n+HUBS[h].faq.length,0));
  const firstHub=idx.knowledge.findIndex(x=>/^hub-/.test(x.id));assert.ok(idx.knowledge.slice(0,firstHub).every(x=>!/^hub-/.test(x.id)));
  for(const t of hubTopics){assert.match(t.links[0].url,/^\/(lieux|personnages|demeures|planques|entreprises|gangs)\.html#faq$/);assert.ok(t.text.length<=900);}
  const core=require(path.join(root,'outils/tests/leo-complet.cjs')).fullCore(root)/* v7.45 : noyau + morceaux */;
  for(const [q,re,url] of [['combien de planques dans gta 6 ?',/Jason’s Safehouse/,'/planques.html#faq'],['ou habite jason ?',/Key Lento/,'/demeures.html#faq'],['on peut changer de personnage quand on veut ?',/Pas toujours/,'/personnages.html#faq'],['la carte est plus grande que gta 5 ?',/Red Dead Redemption 2/,'/lieux.html#faq'],['ou faire le plein ?',/stations-service/,'/entreprises.html#faq'],['peut-on attaquer les repaires de gangs ?',/Famitsu/,'/gangs.html#faq']]){
    const a=core.answer(q);assert.equal(a.kind,'answer',q);assert.match(a.text,re,q);/* v7.45 : la réponse rédigée peut viser une fiche du même hub */assert.ok(a.links[0].url.startsWith(url.replace(/\.html#faq$/,'')),q+' → '+a.links[0].url);}
  for(const [q,re] of [['combien de régions ?',/Six régions/],['c est quoi leonida',/Floride/],['qui sont jason et lucia ?',/Lucia Caminos/]]){const a=core.answer(q);assert.equal(a.kind,'answer',q);assert.match(a.text,re,q);}
});

test('Recherche interne et sitemap : hubs présents, FAQ non dupliquée dans l’index, aucune page ajoutée',()=>{
  const c={window:{}};vm.runInNewContext(read('search-index.js'),c);
  for(const f of Object.values(HUB_FILES))assert.ok(c.window.LK_INDEX.some(e=>e.u==='/'+f),f);
  const sm=read('sitemap.xml');for(const f of Object.values(HUB_FILES))assert.ok(sm.includes('https://www.leonidakit.com/'+f),f);
});
