/* v7.51 (lot 4) : carnets de progression — une page dédiée par carnet (carnets/<id>.html), tableau de bord de la page
   Progression, raccordements (fiches, catalogues, carte, calculateur, Léo, recherche, accueil), anomalies 8 à 15 et 24. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm');
const {load}=require('./runtime-helper.cjs');const root=process.env.SITE_ROOT||path.resolve(__dirname,'../..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const withPage=(file,fn,opts={})=>async()=>{const a=await load(root,file,opts);try{await fn(a);assert.deepEqual(a.errors.filter(x=>!x.includes('Not implemented: navigation')),[]);}finally{a.close();}};
const M=JSON.parse(read('outils/modele-donnees.json'));
const P={window:{}};vm.runInNewContext(read('progression-data.js'),P);const plain=x=>JSON.parse(JSON.stringify(x));const IDS=plain(P.window.LK_PROGRESS_IDS);
const S=require(path.join(root,'outils/carnets-source.cjs'));
const dataOf=html=>JSON.parse(html.match(/<script type="application\/json" id="lk-carnet-data">([\s\S]*?)<\/script>/)[1]);
const now=new Date().toISOString();

test('Neuf carnets, neuf pages sous /carnets/ : titre, description, canonique, fil d’Ariane, h1 = nom du carnet, sitemap',()=>{
  assert.equal(M.carnets.length,9);const titles=new Set(),descs=new Set();const sitemap=read('sitemap.xml'),fiches=read('sitemap-fiches.xml');
  for(const k of M.carnets){const f=k.url.slice(1),html=read(f);
    const title=html.match(/<title>([^<]*)<\/title>/)[1],desc=html.match(/<meta name="description" content="([^"]*)"/)[1];
    assert.ok(!titles.has(title)&&!descs.has(desc),'titre et description uniques : '+f);titles.add(title);descs.add(desc);
    assert.ok(desc.length>=90&&desc.length<=180,'description de 90 à 180 caractères : '+f+' ('+desc.length+')');
    assert.ok(html.includes('<link rel="canonical" href="https://www.leonidakit.com'+k.url+'">'),'canonique '+f);
    assert.doesNotMatch(html,/name="robots" content="[^"]*noindex/,'présentation publique indexable : '+f);
    assert.equal(html.match(/<h1[^>]*>([^<]*)<\/h1>/)[1].replace(/\s+/g,' '),k.titre.replace(/\s+/g,' '));
    const ld=[...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map(m=>JSON.parse(m[1]));
    const crumbs=ld.find(x=>x['@type']==='BreadcrumbList');assert.deepEqual(crumbs.itemListElement.map(x=>x.name),['Accueil','Progression',k.titre]);
    assert.ok(ld.some(x=>x['@type']==='FAQPage'&&x.mainEntity.length>=3),'questions fréquentes en données structurées : '+f);
    assert.ok(sitemap.includes('<loc>https://www.leonidakit.com'+k.url+'</loc>'),'dans sitemap.xml : '+f);assert.ok(!fiches.includes(k.url),'pas dans sitemap-fiches.xml : '+f);
    assert.match(html,/<a href="\.\.\/progression\.html"[^>]*class="here" aria-current="page"|<a href="\.\.\/progression\.html" class="here"/,'menu : Progression active');
    for(const o of M.carnets.filter(o=>o.id!==k.id))assert.ok(html.includes('href="'+o.url.replace('/carnets/','')+'"'),f+' → '+o.url);
    assert.ok(html.includes('href="../progression.html#carnets"'),'retour à la progression : '+f);
  }
});

test('Aucune liste personnelle publiée : données de la page = catalogue public, rien de lk_* dans les métadonnées',()=>{
  for(const k of M.carnets){const html=read(k.url.slice(1)),d=dataOf(html);
    assert.equal(d.id,k.id);assert.deepEqual(d.fams,k.familles);
    for(const it of d.items.concat(d.styles))assert.deepEqual(Object.keys(it).filter(x=>!['f','id','n','c','g','u','x','t','k','sr'].includes(x)),[],'champ inattendu '+it.id);
    assert.doesNotMatch(html.replace(/<script[\s\S]*?<\/script>/g,''),/lk_own_|lk_wish_v1|lk_stock_v1/,'aucune clé de stockage dans le HTML publié : '+k.id);
    assert.doesNotMatch(html,/"(?:owned|possede|possedes|mine)"\s*:/,'aucun état personnel dans la page : '+k.id);}
});

test('Mêmes identifiants partout : carnets = progression-data.js (fiches, tableau de bord, calculateur)',()=>{
  const src=plain(S.progress());for(const f of Object.keys(IDS))assert.deepEqual(src.ids[f],IDS[f],'famille '+f);
  for(const k of M.carnets.filter(k=>k.nature!=='document'&&k.id!=='lieux')){const d=dataOf(read(k.url.slice(1)));
    for(const f of k.familles.filter(f=>IDS[f]))assert.deepEqual(d.items.filter(x=>x.f===f).map(x=>x.id),[...new Set(IDS[f])],k.id+' / '+f);}
  const L={window:{}};vm.runInNewContext(read('carnets/lieux-data.js'),L);assert.deepEqual(plain(L.window.LK_CARNET_LIEUX.rows.map(r=>r[0])).sort(),[...new Set(IDS.lieux)].sort());
  const acq=dataOf(read('carnets/proprietes.html')).items;assert.deepEqual(acq.map(x=>x.id).sort(),['ganado-retro-build','garage-paradise','garage-shore-court','vintage-weapon-pattern'],'les bateaux (renvois vers un véhicule) comptent au garage, jamais deux fois');
  /* chaque lien de fiche ou de ligne existe */
  for(const k of M.carnets.filter(k=>k.nature!=='document'&&k.id!=='lieux'))for(const it of dataOf(read(k.url.slice(1))).items.concat(dataOf(read(k.url.slice(1))).styles)){const [file,anchor]=it.u.split('#');assert.ok(fs.existsSync(path.join(root,file)),it.u);if(anchor)assert.ok(read(file).includes('id="'+anchor+'"'),it.u);}
});

test('Tableau de bord Progression : neuf cartes, lignes par famille, anciennes ancres, section « acquisitions » refermée, calculs lus dans le bon carnet',()=>{
  const html=read('progression.html');
  assert.equal((html.match(/<article class="cn-dcard"/g)||[]).length,9);
  for(const a of ['garage','arsenal','equipements','munitions','lieux','collectibles','consommables','coiffures','tatouages','tenues','perso-vehicules','perso-armes','acquisitions','sauvegarde','suivi','carnets'])assert.ok(html.includes('id="'+a+'"'),'ancre #'+a);
  for(const id of ['progress-vehicules','progress-armes','progress-lieux','progress-collectibles','progress-calc','progress-calc-n','suivi-consommables','suivi-perso-armes'])assert.ok(html.includes('id="'+id+'"'),id);
  assert.equal((html.match(/<section\b/g)||[]).length,(html.match(/<\/section>/g)||[]).length,'sections équilibrées (anomalie 11)');
  const C=require(path.join(root,'outils/catalogues.cjs'));
  assert.match(html,new RegExp('data-family="consommables"><span>[^<]*</span> <strong class="suivi-n">0 / '+C.counts('consommables').suivis+'<'),'consommables : '+C.counts('consommables').suivis+' (anomalie 10)');
  assert.match(html,/data-family="perso-vehicules"><span>[^<]*<\/span> <strong class="suivi-n">0 \/ 57</);
  for(const k of M.carnets)assert.ok(html.includes('href="'+k.url.slice(1)+'">'+k.bouton.replace(/’/g,'’')),'bouton « '+k.bouton+' »');
});

test('Tableau de bord : comptes, envies (jamais comptées), stocks à renseigner, saisies à part, calculs (anomalie 9)',withPage('progression.html',a=>{
  const card=id=>a.d.getElementById('carnet-'+id);
  assert.equal(card('garage').querySelector('[data-cn-done]').textContent,'2');
  assert.match(card('garage').querySelector('[data-cn-extra]').textContent,/1 envie · 1 saisie à part/);
  assert.equal(card('arsenal').querySelector('#suivi-munitions .suivi-n').textContent,'1 / 5');assert.match(card('arsenal').querySelector('[data-cn-extra]').textContent,/1 stock à renseigner/);
  assert.equal(card('garde-robe').querySelector('[data-cn-extra]').textContent,'1 envie');
  assert.equal(a.d.getElementById('progress-calc-n').textContent,'2 calculs');assert.equal(card('calculs').querySelector('[data-cn-plans-n]').textContent,'1 plan');
  assert.equal(card('proprietes').querySelector('[data-cn-done]').textContent,'1');
  assert.equal(card('collectibles').querySelector('.cn-dcard-n').textContent,'À documenter');
},{storage:{lk_own_vehicules:'{"albany-emperor":1,"vapid-dominator":1,"ancien-vehicule":1}',lk_own_munitions:'{"cartouches":1}',lk_progression_v2:JSON.stringify({version:2,migratedAt:now,checked:{'garage-paradise':true}}),
  lk_wish_v1:JSON.stringify({version:1,items:{'vehicules:karin-sultan':{at:now,from:'fiche'},'styles:imprimes-stock-305':{at:now,from:'catalogue'}}}),
  'lk-calculator-notebooks-v3':JSON.stringify({version:3,entries:[{id:'a',tool:'goal',name:'A'},{id:'b',tool:'roi',name:'B'},{id:'c',tool:'plan',name:'C'}],active:{},references:{}})}}));

test('Page d’un carnet (garage) : vues, orphelins, envies, adresse ; lecture seule sans stockage',withPage('carnets/garage.html#vue=envies',a=>{
  assert.equal(a.d.getElementById('cn-tab-wish').getAttribute('aria-selected'),'true','#vue=envies ouvre les envies');
  assert.deepEqual([...a.d.querySelectorAll('.cn-card')].map(c=>c.dataset.key),['vehicules:karin-sultan']);
  assert.equal(a.d.querySelector('[data-cn-n="done"]').textContent,'1');assert.equal(a.d.querySelector('[data-cn-n="wish"]').textContent,'1');
  assert.equal(a.d.querySelector('[data-cn-n="wish"]').nextElementSibling.textContent,'envie','singulier accordé');
  const orph=[...a.d.querySelectorAll('[data-cn-orphan-list] li')].map(li=>li.querySelector('code').textContent).sort();assert.deepEqual(orph,['ancien-vehicule','grotti-cheetah'],'saisies à part gardées, jamais comptées');
  a.d.getElementById('cn-tab-own').click();assert.equal(a.d.querySelector('.cn-card .cn-stamp').textContent,'Possédé');
  a.d.getElementById('cn-tab-rest').click();assert.match(a.w.location.hash,/vue=restants/);assert.equal(a.d.querySelectorAll('.cn-card').length,48);
},{storage:{lk_own_vehicules:'{"albany-emperor":1,"ancien-vehicule":1}',lk_wish_v1:JSON.stringify({version:1,items:{'vehicules:karin-sultan':{at:now,from:'fiche'},'vehicules:grotti-cheetah':{at:now,from:'fiche'}}})}}));

test('Consommables et munitions : ancienne case = « stock à renseigner », quantité jamais inventée',withPage('carnets/consommables.html',a=>{
  const card=a.d.querySelector('.cn-card[data-key="consommables:sprunk"]');assert.match(card.querySelector('.cn-stock-state').textContent,/à renseigner/);
  assert.equal(card.querySelector('[data-cn-act="use"]'),null);
  const cafe=a.d.querySelector('.cn-card[data-key="consommables:cafe-du-matin"]');assert.match(cafe.querySelector('.cn-stock-state').textContent,/épuisé/);
  assert.ok(cafe.querySelector('[data-cn-act="buy"]'));
},{storage:{lk_own_consommables:'{"sprunk":1,"cafe-du-matin":1}',lk_stock_v1:JSON.stringify({version:1,items:{'consommables:cafe-du-matin':{q:0,at:now}}})}}));

test('Carnets : identifiants des lieux avec majuscules acceptés (g-L1848) pour les cases, les envies et le stock',()=>{
  const K=require(path.join(root,'carnets-core.js'));const mem={};const storage={getItem:k=>k in mem?mem[k]:null,setItem:(k,v)=>{mem[k]=String(v);},removeItem:k=>{delete mem[k];}};
  const s=K.create({storage});assert.equal(s.setOwned('lieux','g-L1848',true),true);assert.equal(JSON.parse(mem.lk_map_found)['g-L1848'],true);
  assert.equal(s.setWish('lieux','g-L1848',true,'catalogue'),true);assert.equal(s.isWished('lieux','g-L1848'),true);
  assert.throws(()=>s.setWish('lieux','bad id',true),/invalide/);
});

test('« Voir mon… » mène aux pages des carnets, plus aux ancres de la page Progression',()=>{
  assert.ok(read('vehicules.html').includes('<a class="own-link" href="carnets/garage.html">Voir mon garage</a>'));
  assert.ok(read('armes.html').includes('<a class="own-link" href="carnets/arsenal.html">Voir mon arsenal</a>'));
  assert.ok(read('armes.html').includes('href="carnets/arsenal.html#f=equipements"')&&read('armes.html').includes('href="carnets/arsenal.html#f=munitions"'));
  for(const [page,href,label] of [['style.html','carnets/garde-robe.html#f=tenues','Voir ma garde-robe'],['nourriture.html','carnets/consommables.html','Voir mes consommables'],['personnalisations.html','carnets/personnalisations.html#f=perso-vehicules','Voir mes personnalisations']])
    assert.ok(read(page).includes('class="cat-track-link" href="'+href+'">'+label+'</a>'),page);
  assert.ok(read('carte.html').includes('href="carnets/lieux.html"'));assert.ok(read('collectibles.html').includes('href="carnets/collectibles.html"'));
  assert.ok(read('achats.html').includes('href="carnets/collectibles.html"'));assert.ok(read('calculateurs.html').includes('href="carnets/calculs.html"'));
  assert.ok(read('tuto.html').includes('href="carnets/calculs.html"'));assert.ok(read('index.html').includes('href="progression.html#carnets"'));
  const html=fs.readdirSync(root).filter(f=>f.endsWith('.html')&&f!=='progression.html');
  for(const f of html)assert.doesNotMatch(read(f),/href="progression\.html#(garage|arsenal|equipements|munitions|tenues|coiffures|tatouages|consommables|perso-vehicules|perso-armes|lieux|collectibles)"/,f);
  const leo=JSON.parse(read('outils/leo-knowledge.json')).topics;assert.ok(leo.find(t=>t.id==='voir-garage').links[0].url==='/carnets/garage.html');assert.ok(leo.find(t=>t.id==='carnets-stock'));
  const idx={window:{}};vm.runInNewContext(read('search-index.js'),idx);for(const k of M.carnets)assert.ok(idx.window.LK_INDEX.some(e=>e.u===k.url),'recherche : '+k.url);
});

test('Fiches véhicules et armes : envie et lien vers le carnet ; anciennes fiches hors liste sans case (anomalie 14)',withPage('vehicules/albany-emperor.html',a=>{
  const see=a.d.querySelector('.fiche-liens a.own-see');assert.equal(see.getAttribute('href'),'../carnets/garage.html');assert.equal(see.textContent,'Voir mon garage');
  const wb=a.d.querySelector('.wish-bt');assert.equal(wb.textContent,'Je le veux');wb.click();
  assert.equal(JSON.parse(a.w.localStorage.getItem('lk_wish_v1')).items['vehicules:albany-emperor'].from,'fiche');
  a.d.getElementById('own-bt').click();assert.equal(JSON.parse(a.w.localStorage.getItem('lk_own_vehicules'))['albany-emperor'],1);
  assert.equal(JSON.parse(a.w.localStorage.getItem('lk_wish_v1')).items['vehicules:albany-emperor'],undefined,'possédé : retiré des envies');
  for(const f of ['bravado-youga','brute-camper','vapid-stanier-le']){const h=read('vehicules/'+f+'.html');assert.ok(!h.includes('id="own-bt"')&&h.includes('class="own-off"'),f);}
  assert.ok(read('armes/girardi-es9.html').includes('carnets-core.js'),'fiche d’arme : carnets-core chargé');
}));

test('Planques : encart calculateur comme les demeures (anomalie 15)',()=>{
  for(const f of fs.readdirSync(path.join(root,'planques')).filter(f=>f.endsWith('.html'))){const h=read('planques/'+f);assert.match(h,/calculateurs\.html\?tool=purchase&amp;type=hideout&amp;id=[a-z0-9-]+&amp;from=fiche#atelier/,f);}
});

test('Export du suivi : le brouillon du formulaire de contact n’en fait jamais partie, ni à l’import (anomalie 13)',()=>{
  const Pc=require(path.join(root,'progression-core.js'));const mem={lk_own_vehicules:'{"albany-emperor":1}',lk_contact_draft_v1:'{"email":"x@example.com"}',lk_wish_v1:JSON.stringify({version:1,items:{}})};
  const storage={get length(){return Object.keys(mem).length;},key:i=>Object.keys(mem)[i],getItem:k=>k in mem?mem[k]:null,setItem:(k,v)=>{mem[k]=String(v);},removeItem:k=>{delete mem[k];}};
  const s=Pc.create({storage,ids:IDS});const out=s.exportData();assert.ok(!('lk_contact_draft_v1' in out.data));assert.ok('lk_wish_v1' in out.data);
  const plan=s.prepareImport(JSON.stringify({site:'leonidakit',version:2,data:{lk_contact_draft_v1:'{"email":"y@example.com"}',lk_own_armes:'{"girardi-es9":1}'}}));
  assert.ok(!('lk_contact_draft_v1' in plan.rubrics));assert.ok(plan.issues.some(x=>/privée/.test(x)));
});

test('Léo : l’aperçu « Mon temps de jeu » passe par le moteur (anomalie 8)',()=>{
  const src=read('leo-core.js');assert.doesNotMatch(src,/v\.hourly\*v\.minutes\/60/);assert.match(src,/E\.inverse\(\{minutes:v\.minutes/);
  const E=require(path.join(root,'calculateurs-engine.js'));const r=E.inverse({minutes:45,capital:0,reserve:0,activity:{reward:60000/60,duration:1}});assert.equal(Math.round(r.profit),45000);assert.equal(r.totalMinutes,45);
});

test('Calculateur : « Classer mes envies » (tool=order&ids=…) remplit « Quoi acheter d’abord ? » ; ?voir= ouvre la fiche en lecture',()=>{
  const src=read('calculateurs.js');assert.match(src,/toOrder=tool==='order'\|\|tool==='budget'/);assert.match(src,/tutorialParams\.get\('voir'\)/);
  assert.match(read('calculateurs-workspace.js'),/openDrawer,closeDrawer,openSheet,/);
  assert.match(read('calculateurs-plan.js'),/K\.applyEvent\('plan:'\+logId\+':'\+id/,'achat déclaré : événement idempotent');
  assert.ok(read('calculateurs.html').indexOf('carnets-core.js')<read('calculateurs.html').indexOf('calculateurs-plan.js'));
});

test('Vocabulaire (anomalie 24) : « carnet » réservé au titre de famille ; lieux « repérés », jamais « possédés »',()=>{
  const lieux=dataOf(read('carnets/lieux.html'));assert.equal(lieux.meta.lieux.done,'repéré');assert.doesNotMatch(JSON.stringify(lieux.vues)+JSON.stringify(lieux.compteurs),/possédé/);
  assert.equal(dataOf(read('carnets/consommables.html')).vues.own,'Goûtés');assert.equal(dataOf(read('carnets/collectibles.html')).vues.own,'Trouvés');
  for(const k of M.carnets)assert.ok(!/^Carnet/.test(k.titre)&&/^M(on|a|es) /.test(k.titre),k.titre);
});
