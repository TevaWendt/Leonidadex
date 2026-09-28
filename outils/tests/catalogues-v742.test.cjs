/* v7.42 (lot 5) : catalogues en listes dépliables (consommables, coiffures, tatouages, tenues et accessoires).
   Schéma et données (outils/catalogues/*.json validés par outils/catalogues.cjs), rendu des listes, colonne GTA VI
   jamais remplie par une valeur de la série, pages Consommables et Vêtements et style (gabarit, ancres, JSON-LD,
   sources), filtres et suivi dans le navigateur (jsdom), page Progression, recherche interne, Léo, sitemap. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm');
const {JSDOM}=require('jsdom');
const {load}=require('./runtime-helper.cjs');
const root=process.env.SITE_ROOT||path.resolve(__dirname,'../..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const doc=f=>new JSDOM(read(f)).window.document;
const C=require(path.join(root,'outils/catalogues.cjs'));
const S=require(path.join(root,'outils/sections.cjs'));
const D=C.load();
const PAGES={consommables:'nourriture.html',coiffures:'style.html',tatouages:'style.html',tenues:'style.html'};
/* v7.43 (lot 6) : les familles perso-vehicules et perso-armes s'ajoutent ; ce fichier garde les vérifications du lot 5 sur ses quatre familles, catalogues-v743.test.cjs couvre les deux nouvelles. */
const LOT5=['consommables','coiffures','tatouages','tenues'];
const withPage=(file,fn,opts={})=>async()=>{const a=await load(root,file,opts);try{await fn(a);assert.deepEqual(a.errors.filter(x=>!x.includes('Not implemented: navigation')),[]);}finally{a.close();}};
const ld=d=>[...d.querySelectorAll('script[type="application/ld+json"]')].map(s=>JSON.parse(s.textContent));
const progress=()=>{const c={window:{}};vm.runInNewContext(read('progression-data.js'),c);return c.window;};

test('schéma : quatre familles valides, identifiants uniques, catégories et sources connues, lieux de la carte réels, visuels officiels, statuts et sources cohérents',()=>{
  assert.deepEqual(C.FAMILIES,[...LOT5,'perso-vehicules','perso-armes']);
  const ids=new Set();const lieux=new Set(progress().LK_PROGRESS_IDS.lieux);const medias=JSON.parse(read('outils/medias-officiels.json'));
  for(const fam of LOT5){const d=D.families[fam];assert.ok(d.items.length>=20,fam+' : au moins 20 lignes');assert.equal(d.famille,fam);assert.ok(fs.existsSync(path.join(root,d.page.slice(1))),d.page);
    for(const it of d.items){assert.ok(!ids.has(it.id),'doublon '+it.id);ids.add(it.id);
      assert.ok(d.categories.some(c=>c.id===it.categorie),it.id+' catégorie');assert.ok(['officiel','vu','comm','serie','conf'].includes(it.statut),it.id);
      assert.match(it.description,/[.!?»]$/,it.id+' : une phrase');assert.ok(it.sources.length>=1&&it.sources.every(s=>D.sources[s]),it.id+' sources');
      for(const o of it.ou_le_trouver){if(o.lieu)assert.ok(lieux.has(o.lieu),it.id+' lieu '+o.lieu);else assert.ok(o.type,it.id+' type');}
      if(it.media)assert.ok(medias[it.media],it.id+' visuel');
      if(it.statut==='serie')assert.ok(it.prix_repere_serie&&D.sources[it.sources[0]]&&it.sources.some(s=>D.sources[s].statut==='serie'),it.id+' repère sourcé');
      if(it.statut==='officiel')assert.ok(it.sources.some(s=>D.sources[s].statut==='officiel'),it.id+' officiel sourcé');}}
  for(const s of Object.values(D.sources)){assert.match(s.url,/^https:\/\//);assert.match(s.consultedAt,/^2026-\d\d-\d\d$/);assert.ok(s.claim.length>20);}
  assert.ok(Object.values(D.sources).some(s=>s.url.startsWith('https://www.rockstargames.com/')));
});

test('schéma : le validateur refuse un prix GTA VI, un champ inconnu, un statut hors liste, une catégorie inconnue',()=>{
  const item=D.schema.properties.items.items;
  const good=JSON.parse(JSON.stringify(D.families.consommables.items[0]));
  let e=[];C.check(good,item,'x',e);assert.deepEqual(e,[]);
  e=[];C.check({...good,prix_gta6:{valeur:2,statut:'conf'}},item,'x',e);assert.ok(e.some(x=>/prix_gta6\.valeur/.test(x)),e.join());
  e=[];C.check({...good,inconnu:1},item,'x',e);assert.ok(e.some(x=>/champ inconnu/.test(x)));
  e=[];C.check({...good,statut:'rumeur'},item,'x',e);assert.ok(e.some(x=>/statut/.test(x)));
  e=[];C.check({...good,description:'trop court'},item,'x',e);assert.ok(e.length);
  /* la cohérence hors schéma (catégorie, source, lieu) est vérifiée par load() : on la provoque sur une copie temporaire */
  const dir=path.join(root,'outils/catalogues'),file=path.join(dir,'consommables.json'),backup=read('outils/catalogues/consommables.json');
  try{const bad=JSON.parse(backup);bad.items[0].categorie='inexistante';bad.items[1].sources=['source-inconnue'];bad.items[2].ou_le_trouver=[{lieu:'g-L999999'}];bad.items[3].prix_gta6={valeur:null,statut:'conf'};bad.items[3].effet={texte:'x',valeur:5,unite:'sante',jeu:null};
    fs.writeFileSync(file,JSON.stringify(bad));
    assert.throws(()=>C.load({fresh:true}),/catégorie inconnue[\s\S]*source inconnue[\s\S]*lieu de carte inconnu[\s\S]*de quel jeu il vient/);
  }finally{fs.writeFileSync(file,backup);C.load({fresh:true});}
});

test('rendu : la boîte dépliable écrit toute la liste (lisible sans JavaScript), sept colonnes, outils inertes, suivi par ligne, compteur honnête',()=>{
  for(const fam of LOT5){const html=C.listBox(fam),d=new JSDOM('<body>'+html+'</body>').window.document,data=D.families[fam],c=C.counts(fam);
    const box=d.querySelector('details.cat-box');assert.equal(box.dataset.catalogue,fam);assert.equal(box.hasAttribute('open'),false);
    assert.match(box.querySelector('.cat-sum').textContent,new RegExp(c.n+'\\s*référencés'));assert.match(C.counterText(fam),new RegExp('^'+c.n+' référencés, dont '+c.confirmes+' confirmés pour GTA VI$'));
    assert.equal(c.confirmes,c.officiel+c.vu);
    const rows=[...d.querySelectorAll('tr.cat-row')];assert.equal(rows.length,data.items.length);
    assert.equal(d.querySelector('[data-cat-tools]').hasAttribute('hidden'),true);
    assert.equal(d.querySelectorAll('thead th').length,7);
    for(const r of rows){assert.equal(r.querySelectorAll('td').length,7);assert.ok(r.id.startsWith(fam+'-'));assert.ok(r.dataset.q.length>10);
      const own=r.querySelector('.cat-c-own');const it=data.items.find(x=>fam+'-'+x.id===r.id);
      if(it.suivi===false)assert.equal(own.dataset.track,undefined);else{assert.equal(own.dataset.track,fam);assert.equal(own.dataset.trackId,it.id);assert.equal(own.dataset.trackName,it.nom);}
      for(const a of r.querySelectorAll('a.cat-src'))assert.match(a.getAttribute('href'),/^#src-[a-z0-9-]+$/);
      for(const a of r.querySelectorAll('a.cat-lieu'))assert.match(a.getAttribute('href'),/^carte\.html#lieu=/);}
    assert.equal(d.querySelector('[data-track-bar]').dataset.trackBar,fam);assert.equal(d.querySelector('.own-total').textContent,String(c.suivis));
    const st=[...d.querySelectorAll('[data-cat-f="st"] option')].map(o=>o.value).filter(Boolean);for(const s of st)assert.ok(c[s]>0,s);}
});

test('aucune valeur de la série dans une colonne GTA VI : toutes les cellules GTA VI disent « à confirmer », tout repère nomme son jeu',()=>{
  for(const file of ['nourriture.html','style.html']){const d=doc(file);
    const p6=[...d.querySelectorAll('td.cat-c-p6')];assert.ok(p6.length>=24,file);
    for(const td of p6){assert.match(td.textContent.replace(/\s+/g,' ').trim(),/^À confirmer$/);assert.doesNotMatch(td.textContent,/\d|\$/);}
    for(const b of d.querySelectorAll('.cat-repere'))assert.match(b.textContent.replace(/[  ]/g,' '),/^GTA (V|Online|IV|San Andreas)\s?: /);
    for(const b of d.querySelectorAll('.cat-eff-n'))assert.match(b.textContent,/\((GTA V|GTA Online|GTA IV|GTA San Andreas)\)/);}
  for(const fam of LOT5)for(const it of D.families[fam].items){assert.equal(it.prix_gta6.valeur,null,it.id);assert.equal(it.prix_gta6.statut,'conf');if(it.effet.valeur!==null)assert.ok(it.effet.jeu,it.id);}
});

test('pages Consommables et Vêtements et style : gabarit (bandeau, sous-navigation, sections numérotées, listes centrales, encart, puces), ancres attendues, JSON-LD, sources ancrées',()=>{
  const expect={ 'nourriture.html':{lists:['consommables'],ids:['ce-qui-est-montre','liste-consommables','ou-en-trouver','a-quoi-ca-sert','a-confirmer','et-le-calculateur','faq','sources']},
    'style.html':{lists:['coiffures','tatouages','tenues'],ids:['ce-que-rockstar-a-dit','coiffures','tatouages','tenues','accessoires','adresses','collections','a-confirmer','pour-toi','faq','sources']}};
  for(const [file,e] of Object.entries(expect)){const d=doc(file),html=read(file);
    assert.equal(d.querySelectorAll('.page-head .lk-stack').length,1,file+' pile');assert.equal(d.querySelectorAll('.ed-zone--acq > nav.ed-nav').length,1,file+' sous-navigation');
    for(const a of d.querySelectorAll('.ed-nav a'))assert.ok(d.getElementById(a.getAttribute('href').slice(1)),file+' ancre de nav '+a.getAttribute('href'));
    for(const id of e.ids)assert.ok(d.getElementById(id),file+' #'+id);
    const secs=[...d.querySelectorAll('.ed-zone--acq > section.ed')];assert.ok(secs.length>=8,file+' sections');
    secs.forEach((s,i)=>assert.equal(s.querySelector('.ed-num').textContent,String(i+1).padStart(2,'0'),file+' numérotation'));
    assert.deepEqual([...d.querySelectorAll('details.cat-box')].map(b=>b.dataset.catalogue),e.lists,file+' listes');
    for(const fam of e.lists){const box=d.getElementById('box-'+fam);assert.ok(box.closest('section.ed').id===D.families[fam].section,file+' section de '+fam);
      const item=ld(d).find(x=>x['@type']==='ItemList'&&x.name.startsWith(D.families[fam].titre));assert.ok(item,file+' ItemList '+fam);assert.equal(item.numberOfItems,D.families[fam].items.length);
      for(const li of item.itemListElement)assert.ok(d.getElementById(li.url.split('#')[1]),file+' ItemList ancre '+li.url);}
    const faq=ld(d).find(x=>x['@type']==='FAQPage');assert.ok(faq&&faq.mainEntity.length>=4,file+' FAQPage');assert.ok(ld(d).some(x=>x['@type']==='BreadcrumbList'));
    for(const a of d.querySelectorAll('a.cat-src'))assert.ok(d.getElementById(a.getAttribute('href').slice(1)),file+' source ancrée '+a.getAttribute('href'));
    for(const a of d.querySelectorAll('a.cat-link, a.cat-media')){const h=a.getAttribute('href');if(h.startsWith('medias.html#'))assert.ok(read('medias.html').includes('id="'+h.split('#')[1]+'"'),h);else if(h.includes('#')&&h.split('#')[0]===file)assert.ok(d.getElementById(h.split('#')[1]),h);}
    assert.equal(d.querySelectorAll('.lk-entry-hub').length,1);assert.equal(d.querySelectorAll('nav.lk-chips').length,1);
    const main=[...d.querySelectorAll('main > *')];assert.ok(main.findIndex(x=>x.classList.contains('ed-zone--acq'))<main.findIndex(x=>x.classList.contains('lk-entry-hub')));
    assert.equal(d.querySelectorAll('.d-topics').length,0,file+' plus de volets « PowerPoint »');
    assert.ok(d.querySelector('#sources .ed-levels .pip--serie'),file+' légende repère de la série');assert.ok(d.querySelectorAll('#sources .ed-srcs li').length>=10,file+' sources');
    assert.doesNotMatch(html,/pourra acheter|pourront porter et acheter/);}
  const s=doc('style.html');assert.equal(s.querySelectorAll('#adresses .d-card').length,3);assert.equal(s.querySelectorAll('#collections .d-card').length,3);
  for(const id of ['style-vice-city','articles-du-bonheur','vintage-tenues-coiffures'])assert.ok(s.getElementById(id),id);
  for(const f of ['bateaux.html','logements.html']){const d=doc(f);assert.equal(d.querySelectorAll('.ed-zone--acq > nav.ed-nav').length,1,f);assert.ok(d.getElementById('sources')&&d.getElementById('a-confirmer')&&d.getElementById('pour-toi'),f);assert.equal(d.querySelectorAll('details.cat-box').length,0,f);}
  /* v7.43 : personnalisations.html reçoit ses deux listes au lot 6 (catalogues-v743.test.cjs). */
});

test('navigateur : recherche, filtres par catégorie et statut, tri, réinitialisation, compteur de lignes, ouverture par l’ancre d’une ligne',withPage('nourriture.html#consommables-sprunk',a=>{
  const box=a.d.getElementById('box-consommables'),tools=box.querySelector('[data-cat-tools]');
  assert.equal(tools.hidden,false,'outils activés par catalogue.js');assert.equal(box.open,true,'ouverte par l’ancre');
  assert.ok(a.d.getElementById('consommables-sprunk').classList.contains('is-target'));
  const rows=()=>[...box.querySelectorAll('tr.cat-row')],visible=()=>rows().filter(r=>!r.hidden);
  const fire=(el,type)=>el.dispatchEvent(new a.w.Event(type,{bubbles:true}));
  const q=tools.querySelector('[data-cat-q]');q.value='sprunk';fire(q,'input');a.flush();
  assert.ok(visible().length>=1&&visible().every(r=>/sprunk/.test(r.dataset.q)));assert.match(tools.querySelector('[data-cat-count]').textContent,/ligne/);
  q.value='';fire(q,'input');a.flush();assert.equal(visible().length,rows().length);
  const cat=tools.querySelector('[data-cat-f="cat"]');cat.value='protection';fire(cat,'change');assert.ok(visible().length>=5&&visible().every(r=>r.dataset.cat==='protection'));
  const st=tools.querySelector('[data-cat-f="st"]');st.value='officiel';fire(st,'change');assert.ok(visible().every(r=>r.dataset.st==='officiel'&&r.dataset.cat==='protection'));
  assert.equal(box.querySelector('[data-cat-empty]').hidden,visible().length>0);
  tools.querySelector('.cat-reset').click();assert.equal(visible().length,rows().length);assert.equal(cat.value,'');assert.equal(st.value,'');
  const sort=tools.querySelector('[data-cat-sort]');sort.value='nom';fire(sort,'change');const noms=rows().map(r=>r.dataset.nom);assert.deepEqual(noms,[...noms].sort((x,y)=>x.localeCompare(y,'fr')));
  sort.value='prix';fire(sort,'change');const prix=rows().filter(r=>'prix' in r.dataset).map(r=>Number(r.dataset.prix));assert.deepEqual(prix,[...prix].sort((x,y)=>x-y));
  sort.value='statut';fire(sort,'change');assert.equal(rows()[0].dataset.st,'officiel');
}));

test('navigateur : « Je l’ai » sur une ligne remplit la clé lk_own_consommables, la barre de la liste et compte dans progression.html',withPage('nourriture.html',a=>{
  const box=a.d.getElementById('box-consommables');
  const bts=[...box.querySelectorAll('td.cat-c-own .track-bt')];assert.equal(bts.length,C.counts('consommables').suivis);
  assert.equal(box.querySelector('tr#consommables-recuperation-automatique td.cat-c-own .track-bt'),null,'ligne sans suivi');
  const sprunk=a.d.querySelector('tr#consommables-sprunk td.cat-c-own .track-bt');assert.equal(sprunk.getAttribute('aria-label'),'Je l’ai : Sprunk');
  sprunk.click();bts[0].click();
  assert.deepEqual(JSON.parse(a.w.localStorage.getItem('lk_own_consommables')),{sprunk:1,[bts[0].dataset.trackFor]:1});
  assert.equal(box.querySelector('[data-track-bar="consommables"] b').textContent,'2');assert.equal(box.querySelector('[data-track-bar="consommables"] progress').value,2);
  assert.ok(a.d.querySelector('tr#consommables-sprunk td.cat-c-own').classList.contains('is-own'));
}));

test('navigateur : style.html, trois boîtes, l’ancre #accessoires ouvre la garde-robe filtrée sur le groupe Accessoires',withPage('style.html#accessoires',a=>{
  assert.deepEqual([...a.d.querySelectorAll('details.cat-box')].map(b=>b.dataset.catalogue),['coiffures','tatouages','tenues']);
  const box=a.d.getElementById('box-tenues');assert.equal(box.open,true);
  const visible=[...box.querySelectorAll('tr.cat-row')].filter(r=>!r.hidden);assert.ok(visible.length>=8&&visible.every(r=>r.dataset.group==='accessoires'));
  assert.equal(a.d.getElementById('accessoires').getAttribute('aria-pressed'),'true');
  assert.equal(a.d.getElementById('box-coiffures').open,false);
}));

test('Progression : quatorze cartes (douze du lot 5 + deux du lot 6), les quatre familles comptent leurs lignes, la liste dépliée mène à l’ancre de la ligne, export / import',withPage('progression.html',a=>{
  const cards=[...a.d.querySelectorAll('.suivi-card')];assert.equal(cards.length,14);
  const P=progress();
  for(const fam of LOT5){const card=a.d.querySelector('.suivi-card[data-family="'+fam+'"]');assert.ok(card,fam);assert.ok(a.d.getElementById(fam),'ancre #'+fam);
    assert.equal(P.LK_PROGRESS_IDS[fam].length,C.counts(fam).suivis);assert.equal(Object.keys(P.LK_PROGRESS_NAMES[fam]).length,C.counts(fam).suivis);
    assert.match(card.querySelector('.suivi-n').textContent,new RegExp('^'+(fam==='consommables'?'1':'0')+' \\/ '+C.counts(fam).suivis+'$'),fam);}
  const card=a.d.querySelector('.suivi-card[data-family="consommables"]');card.querySelector('.suivi-toggle').click();
  const list=a.d.getElementById('suivi-list-consommables');assert.equal(list.hidden,false);
  assert.equal(list.querySelector('a').getAttribute('href'),'nourriture.html#consommables-sprunk');assert.ok(list.textContent.includes('Boissons'));
  list.querySelector('[data-suivi-remove="sprunk"]').click();assert.match(card.querySelector('.suivi-n').textContent,/^0 \//);
  assert.match(read('progression.html'),new RegExp('data-family="coiffures">[\\s\\S]*?<strong class="suivi-n">0 / '+C.counts('coiffures').suivis+'<'));
},{storage:{lk_own_consommables:'{"sprunk":1}'}}));

test('progression-core : les quatre familles entrent dans le total, l’export et l’import (sans rubrique inconnue)',()=>{
  const P=require(path.join(root,'progression-core.js')),IDS=progress().LK_PROGRESS_IDS;
  const mem=new Map();const storage={get length(){return mem.size;},key:i=>[...mem.keys()][i],getItem:k=>mem.has(k)?mem.get(k):null,setItem:(k,v)=>mem.set(k,String(v)),removeItem:k=>mem.delete(k)};
  const store=P.create({storage,acquisitions:{categories:[],items:[]},ids:IDS,collectibles:[]});
  assert.ok(store.toggle('sprunk',true));assert.ok(store.toggle('zone-bras',true));assert.ok(store.toggle('gta5-fade',true));assert.ok(store.toggle('lunettes-de-soleil',true));
  const s=store.summary();for(const fam of LOT5){const g=s.groups.find(x=>x.id===fam);assert.ok(g,fam);assert.equal(g.total,IDS[fam].length);assert.equal(g.done,1);}
  const out=store.exportData();assert.equal(out.data.lk_own_consommables,'{"sprunk":true}');assert.equal(out.data.lk_own_tenues,'{"lunettes-de-soleil":true}');
  mem.clear();const plan=store.prepareImport(JSON.stringify(out));assert.deepEqual(plan.issues,[]);store.applyImport(plan,'merge');assert.equal(store.summary().done,4);
});

test('recherche interne, Léo et sitemap : chaque ligne indexée (type élément) vers son ancre, familles et Accessoires indexés, FAQ dans Léo, réponses',()=>{
  const c={window:{}};vm.runInNewContext(read('search-index.js'),c);const idx=c.window.LK_INDEX;
  for(const fam of LOT5){const d=D.families[fam];assert.ok(idx.some(e=>e.u===d.page+'#'+d.section&&e.l===d.label),fam+' section');
    for(const it of d.items){const e=idx.find(x=>x.u===d.page+'#'+C.rowId(fam,it));assert.ok(e,it.id+' indexé');assert.equal(e.t,'element');assert.equal(e.k,C.KIND[fam]);assert.ok(e.s.includes(it.nom.normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/’/g,"'").toLowerCase().split(' ')[0]));}}
  assert.ok(idx.some(e=>e.u==='/style.html#accessoires'));assert.ok(idx.some(e=>e.u==='/style.html#tatouages'&&e.l==='Tatouages'));assert.ok(idx.some(e=>e.u==='/nourriture.html'));
  const leo=JSON.parse(read('leo-index.json')),core=require(path.join(root,'outils/tests/leo-complet.cjs')).fullCore(root)/* v7.45 : noyau + morceaux */;
  for(const fam of LOT5){const rows=core.items.filter(x=>x.kind==='catalogue-'+fam);assert.equal(rows.length,D.families[fam].items.length,fam+' dans Léo');for(const r of rows){assert.ok(r.url.startsWith(D.families[fam].page+'#'),r.name);assert.equal(r.price,undefined);}}
  const faq=leo.knowledge.filter(x=>/^acq-(nourriture|style)-/.test(x.id));assert.equal(faq.length,10);for(const t of faq)assert.match(t.links[0].url,/^\/(nourriture|style)\.html#faq$/);
  for(const [q,re,url] of [['peut-on manger dans gta 6 ?',/Rob Nelson/,'/nourriture.html#faq'],['est-ce qu’on grossit dans gta 6 ?',/grossir/,'/nourriture.html#faq'],['peut-on changer de coiffure dans gta 6 ?',/salon/,'/style.html#faq'],['peut-on se faire tatouer ?',/FAILE/,'/style.html#faq'],['y a-t-il des gilets pare-balles dans gta 6 ?',/Ammu-Nation/,'/nourriture.html#faq'],['combien de tenues dans gta 6 ?',/milliers/,'/style.html#faq']]){const a=core.answer(q);assert.equal(a.kind,'answer',q);assert.match(a.text,re,q);/* v7.45 : la réponse rédigée peut viser une ancre plus précise de la même page */assert.ok(a.links[0].url.startsWith(url.split('#')[0]),q+' → '+a.links[0].url);}
  const r=core.answer('trouve sprunk');assert.equal(r.kind,'results');assert.ok(r.results.some(x=>x.url==='/nourriture.html#consommables-sprunk'));
  const sm=read('sitemap.xml');for(const f of ['nourriture.html','style.html'])assert.ok(sm.includes('https://www.leonidakit.com/'+f));
  for(const f of ['vetements.html','accessoires.html','tatouages.html'])assert.ok(!sm.includes('/'+f)&&/http-equiv="refresh"/.test(read(f)),f+' reste un renvoi');
});

test('sections.cjs : statut « repère de la série » et icônes des catégories',()=>{
  assert.equal(S.STATUS_LABEL.serie,'Repère de la série');assert.match(S.pip('serie',true),/pip--serie/);
  for(const fam of C.FAMILIES)for(const c of D.families[fam].categories)assert.ok(S.ICONS[c.icon],c.icon);
  for(const i of ['liste','boisson','snack','repas','coupe','barbe','couleur','maquillage','zone','motif','retrait','tenue','haut','bas','chaussure','lunettes','chapeau','bijou','masque','etiquette'])assert.match(S.icon(i),/<svg class="ed-ico"/);
});
