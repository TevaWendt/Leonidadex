/* v7.43 (lot 6) : personnalisations des véhicules et des armes en listes dépliables (perso-vehicules, perso-armes).
   Schéma et données (compat, acq, statuts et sources), rendu (ligne de compatibilité, case reliée à une carte Rockstar,
   compteur « postes »), colonne GTA VI jamais remplie par une valeur de la série, page Personnalisations (gabarit, deux
   listes, ateliers, ancres, JSON-LD), filtres de compatibilité par l'adresse (jsdom), suivi et Progression (14 cartes),
   liens croisés des fiches véhicules, armes et entreprises, recherche interne, Léo, sitemap. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm');
const {JSDOM}=require('jsdom');
const {load}=require('./runtime-helper.cjs');
const root=process.env.SITE_ROOT||path.resolve(__dirname,'../..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const doc=f=>new JSDOM(read(f)).window.document;
const C=require(path.join(root,'outils/catalogues.cjs'));
const S=require(path.join(root,'outils/sections.cjs'));
const D=C.load();
const LOT6=['perso-vehicules','perso-armes'];
const withPage=(file,fn,opts={})=>async()=>{const a=await load(root,file,opts);try{await fn(a);assert.deepEqual(a.errors.filter(x=>!x.includes('Not implemented: navigation')),[]);}finally{a.close();}};
const ld=d=>[...d.querySelectorAll('script[type="application/ld+json"]')].map(s=>JSON.parse(s.textContent));
const progress=()=>{const c={window:{}};vm.runInNewContext(read('progression-data.js'),c);return c.window;};
const armes=()=>{const c={window:{}};vm.runInNewContext(read('armes-data.js'),c);return c.window.LK_ARMES;};
const vehicules=()=>{const c={window:{}};vm.runInNewContext(read('vehicules-data.js'),c);return c.window.LK_VEHICULES;};

test('schéma : deux familles de personnalisation, au moins 40 postes chacune, statuts et sources cohérents, compat limité aux catégories du site et aux armes recensées, acq relié à une acquisition suivable',()=>{
  assert.deepEqual(C.FAMILIES.slice(-2),LOT6);
  const A=new Map(armes().map(a=>[a.id,a])),lieux=new Set(progress().LK_PROGRESS_IDS.lieux),medias=JSON.parse(read('outils/medias-officiels.json'));
  const acq=JSON.parse(read('outils/acquisitions.json')).items.filter(x=>x.trackable===true).map(x=>x.id);
  for(const fam of LOT6){const d=D.families[fam];assert.ok(d.items.length>=40,fam+' : au moins 40 postes');assert.equal(d.page,'/personnalisations.html');assert.match(d.suivi.cle,/^lk_own_perso-/);
    const c=C.counts(fam);assert.ok(c.officiel>=8,fam+' : au moins 8 postes officiels');assert.ok(c.serie>=20,fam+' : au moins 20 repères');assert.equal(c.confirmes,c.officiel+c.vu);
    assert.match(C.counterText(fam),new RegExp('^'+c.n+' postes référencés, dont '+c.confirmes+' confirmés pour GTA VI$'));
    for(const it of d.items){
      assert.equal(it.prix_gta6.valeur,null,it.id);if(it.effet.valeur!==null)assert.ok(it.effet.jeu&&it.effet.unite,it.id);
      if(it.statut==='serie')assert.ok(it.prix_repere_serie&&it.sources.some(s=>D.sources[s].statut==='serie'),it.id+' repère sourcé');
      if(it.statut==='officiel')assert.ok(it.sources.some(s=>D.sources[s].statut==='officiel'),it.id+' officiel sourcé');
      if(it.statut==='vu')assert.ok(it.media&&medias[it.media],it.id+' : un poste vu cite sa capture');
      for(const o of it.ou_le_trouver){if(o.lieu)assert.ok(lieux.has(o.lieu),it.id+' lieu '+o.lieu);else assert.ok(o.type,it.id+' type');}
      assert.ok(it.compat,it.id+' : chaque poste dit à quoi il s’applique');
      if(fam==='perso-vehicules'){assert.ok(it.compat.vehicules&&it.compat.vehicules.every(x=>C.VEH_CATS[x]),it.id);assert.equal(it.compat.armes,undefined);assert.equal(it.compat.ids,undefined);}
      else{assert.ok(it.compat.armes&&it.compat.armes.every(x=>C.ARM_CATS[x]),it.id);for(const id of it.compat.ids||[]){assert.ok(A.has(id),it.id+' arme '+id);assert.ok(it.compat.armes.includes(A.get(id).cat),it.id+' catégorie de '+id);}
        if(it.compat.ids)assert.ok(it.sources.some(s=>['officiel','vu'].includes(D.sources[s].statut)),it.id+' : compatibilité arme par arme sourcée');}
      if(it.acq){assert.ok(acq.includes(it.acq),it.id+' acq');assert.equal(it.suivi,false,it.id+' : suivi false avec acq');}
    }}
  /* les deux contenus documentés de la page (kit Ganado, motif Vintage) ont chacun leur ligne reliée */
  assert.equal(D.families['perso-vehicules'].items.find(x=>x.acq==='ganado-retro-build').suivi,false);
  assert.equal(D.families['perso-armes'].items.find(x=>x.acq==='vintage-weapon-pattern').suivi,false);
  /* les catégories de véhicules et d'armes du site sont toutes couvertes par au moins un poste */
  for(const cat of new Set(vehicules().map(v=>v.cat)))assert.ok(C.coverage('perso-vehicules').has(cat),'catégorie de véhicule sans poste : '+cat);
  for(const cat of new Set(armes().map(a=>a.cat)))assert.ok(C.coverage('perso-armes').has(cat),'catégorie d’arme sans poste : '+cat);
});

test('schéma : le validateur refuse une compatibilité hors liste, une arme inconnue, une compatibilité arme par arme sans source officielle, un acq sans suivi false, un prix GTA VI',()=>{
  const item=D.schema.properties.items.items;
  const good=JSON.parse(JSON.stringify(D.families['perso-armes'].items.find(x=>x.id==='silencieux')));
  let e=[];C.check(good,item,'x',e);assert.deepEqual(e,[]);
  e=[];C.check({...good,compat:{armes:['laser-gun']}},item,'x',e);assert.ok(e.some(x=>/compat\.armes/.test(x)),e.join());
  e=[];C.check({...good,compat:{vehicules:['fusee']}},item,'x',e);assert.ok(e.some(x=>/compat\.vehicules/.test(x)));
  e=[];C.check({...good,effet:{texte:'x',valeur:1,unite:'litres',jeu:'GTA V'}},item,'x',e);assert.ok(e.some(x=>/unite/.test(x)));
  e=[];C.check({...good,prix_gta6:{valeur:12,statut:'conf'}},item,'x',e);assert.ok(e.some(x=>/prix_gta6\.valeur/.test(x)));
  const file=path.join(root,'outils/catalogues/perso-armes.json'),backup=read('outils/catalogues/perso-armes.json');
  try{const bad=JSON.parse(backup);const s=bad.items.find(x=>x.id==='silencieux');s.compat={armes:['pistolet'],ids:['arme-inventee']};
    const t=bad.items.find(x=>x.id==='teintes');t.compat={armes:['pistolet'],ids:['girardi-es9']};/* source « serie » seulement */
    const m=bad.items.find(x=>x.id==='motif-vintage-vice-city');delete m.suivi;
    fs.writeFileSync(file,JSON.stringify(bad));
    assert.throws(()=>C.load({fresh:true}),e=>/arme inconnue « arme-inventee »/.test(e.message)&&/teintes : une compatibilité arme par arme doit s’appuyer sur une source officielle ou vue/.test(e.message)&&/motif-vintage-vice-city : une ligne reliée à une acquisition porte suivi false/.test(e.message));
  }finally{fs.writeFileSync(file,backup);C.load({fresh:true});}
});

test('rendu : sept colonnes, compteur « postes », ligne de compatibilité avec liens vers les fiches d’armes, attribut data-compat, case reliée à la carte Rockstar, libellés des filtres',()=>{
  for(const fam of LOT6){const html=C.listBox(fam),d=new JSDOM('<body>'+html+'</body>').window.document,data=D.families[fam],c=C.counts(fam);
    const box=d.querySelector('details.cat-box');assert.equal(box.dataset.catalogue,fam);assert.ok(box.dataset.catTags,'libellés des filtres');
    const tags=JSON.parse(box.dataset.catTags);assert.deepEqual(tags,C.compatLabels(fam));
    assert.match(box.querySelector('.cat-sum').textContent,new RegExp(c.n+'\\s*postes référencés'));assert.ok(d.querySelector('[data-cat-filter]').hasAttribute('hidden'));
    assert.equal(d.querySelectorAll('thead th').length,7);
    const rows=[...d.querySelectorAll('tr.cat-row')];assert.equal(rows.length,data.items.length);
    for(const r of rows){assert.equal(r.querySelectorAll('td').length,7);const it=data.items.find(x=>fam+'-'+x.id===r.id);assert.ok(it,r.id);
      assert.ok(r.dataset.compat.split(' ').length>=1);for(const t of r.dataset.compat.split(' '))assert.ok(tags[t],r.id+' étiquette '+t);
      const comp=r.querySelector('.cat-compat');assert.ok(comp,r.id+' ligne de compatibilité');
      for(const id of (it.compat.ids||[]))assert.ok(comp.querySelector('a[href="armes/'+id+'.html"]'),r.id+' fiche '+id);
      const own=r.querySelector('.cat-c-own');
      if(it.acq){assert.equal(own.dataset.track,undefined);const inp=own.querySelector('input[data-acq-toggle]');assert.equal(inp.dataset.acqToggle,it.acq);assert.equal(own.querySelector('a.cat-acq-link').getAttribute('href'),'#'+it.acq);}
      else if(it.suivi!==false){assert.equal(own.dataset.track,fam);assert.equal(own.dataset.trackId,it.id);}
      assert.match(r.querySelector('td.cat-c-p6').textContent.replace(/\s+/g,' ').trim(),/^(Prix à venir\s?Achat à confirmer|Ne s’achète pas\s?.+)$/);}
    for(const b of d.querySelectorAll('.cat-repere'))assert.match(b.textContent.replace(/[  ]/g,' '),/^GTA (V|Online|IV|San Andreas)\s?: /);
    for(const b of d.querySelectorAll('.cat-eff-n'))assert.match(b.textContent,/\((GTA V|GTA Online)\)/);}
  const blind=new JSDOM('<body>'+C.listBox('perso-vehicules')+'</body>').window.document.querySelector('#perso-vehicules-blindage .cat-eff-n');assert.match(blind.textContent,/^100 % d’armure/);
  const charg=new JSDOM('<body>'+C.listBox('perso-armes')+'</body>').window.document.querySelector('#perso-armes-chargeur-etendu .cat-eff-n');assert.match(charg.textContent,/^300 % de capacité/);
});

test('page Personnalisations : gabarit du lot 5, deux listes dans l’ordre, cartes Rockstar avec leur case, ateliers avec vignette ou « pas encore placé », ancres, JSON-LD (deux ItemList, FAQPage), sources ancrées, plus d’ancienne section « variantes »',()=>{
  const d=doc('personnalisations.html'),html=read('personnalisations.html');
  assert.equal(d.querySelectorAll('.page-head .lk-stack').length,1);assert.equal(d.querySelectorAll('.ed-zone--acq > nav.ed-nav').length,1);
  for(const a of d.querySelectorAll('.ed-nav a'))assert.ok(d.getElementById(a.getAttribute('href').slice(1)),'ancre de nav '+a.getAttribute('href'));
  for(const id of ['ce-que-rockstar-a-montre','contenus','ganado-retro-build','vintage-weapon-pattern','perso-vehicules','box-perso-vehicules','perso-armes','box-perso-armes','ateliers','a-confirmer','pour-toi','faq','sources'])assert.ok(d.getElementById(id),'#'+id);
  assert.equal(d.getElementById('variantes'),null,'l’ancienne section « Armes personnalisées déjà recensées » est remplacée par les lignes de la liste');
  const secs=[...d.querySelectorAll('.ed-zone--acq > section.ed')];assert.equal(secs.length,9);secs.forEach((s,i)=>assert.equal(s.querySelector('.ed-num').textContent,String(i+1).padStart(2,'0')));
  assert.deepEqual([...d.querySelectorAll('details.cat-box')].map(b=>b.dataset.catalogue),LOT6);
  for(const fam of LOT6){const box=d.getElementById('box-'+fam);assert.equal(box.closest('section.ed').id,D.families[fam].section);
    const item=ld(d).find(x=>x['@type']==='ItemList'&&x.name.startsWith(D.families[fam].titre));assert.ok(item,'ItemList '+fam);assert.equal(item.numberOfItems,D.families[fam].items.length);
    for(const li of item.itemListElement)assert.ok(d.getElementById(li.url.split('#')[1]),'ItemList ancre '+li.url);}
  /* cartes Rockstar : deux cases (kit Ganado, motif Vintage), reprises une fois chacune dans les listes */
  assert.deepEqual([...d.querySelectorAll('#contenus .d-card')].map(x=>x.id),['ganado-retro-build','vintage-weapon-pattern']);
  assert.equal(d.querySelectorAll('input[data-acq-toggle="ganado-retro-build"]').length,2);assert.equal(d.querySelectorAll('input[data-acq-toggle="vintage-weapon-pattern"]').length,2);
  /* ateliers (v7.70 : plateau avec une seule carte à repères numérotés) : Rideout avec vignette et lien carte, One-Eyed Willie’s
     sans repère avec sa fiche, trois armureries */
  const at=[...d.querySelectorAll('#ateliers li.ed-at')];assert.ok(at.length>=9,'cartes-ateliers');
  assert.ok(d.querySelector('#ateliers .ed-at-board figure.ed-at-map svg .lk-loc-pin[data-place="g-L2375"]'),'repère de Rideout sur le plateau');
  const rideout=at.find(x=>x.querySelector('b').textContent==='Rideout Customs');assert.equal(rideout.dataset.atelier,'g-L2375');assert.ok(rideout.querySelector('.ed-at-visual img'));assert.ok(rideout.querySelector('a[href="carte.html#lieu=g-L2375"]'));assert.ok(rideout.querySelector('a[href="entreprises/rideout-customs.html"]'));
  const willie=at.find(x=>x.querySelector('b').textContent==='One-Eyed Willie’s');assert.equal(willie.querySelector('a[href^="carte.html#lieu="]'),null);assert.match(willie.textContent,/Pas encore placé/);assert.ok(willie.querySelector('a[href="entreprises/one-eyed-willie.html"]'));
  for(const name of ['Phil’s Ammu-Nation','Pawn & Gun'])assert.ok(at.some(x=>x.querySelector('b').textContent===name),name);
  for(const a of d.querySelectorAll('#ateliers a[href^="carte.html#lieu="]'))assert.ok(progress().LK_PROGRESS_IDS.lieux.includes(a.getAttribute('href').split('=')[1]),a.getAttribute('href'));
  const faq=ld(d).find(x=>x['@type']==='FAQPage');assert.ok(faq&&faq.mainEntity.length===5);
  for(const a of d.querySelectorAll('a.cat-src'))assert.ok(d.getElementById(a.getAttribute('href').slice(1)),'source ancrée '+a.getAttribute('href'));
  for(const a of d.querySelectorAll('a.cat-link, a.cat-media, .cat-compat a')){const h=a.getAttribute('href');if(h.startsWith('#'))assert.ok(d.getElementById(h.slice(1)),h);else if(h.startsWith('medias.html#'))assert.ok(read('medias.html').includes('id="'+h.split('#')[1]+'"'),h);else assert.ok(fs.existsSync(path.join(root,h.split('#')[0])),h);}
  assert.equal(d.querySelectorAll('.lk-entry-hub').length,1);assert.equal(d.querySelectorAll('nav.lk-chips').length,1);
  assert.ok(d.querySelectorAll('#sources .ed-srcs li').length>=20,'sources');assert.doesNotMatch(html,/pourra acheter|probablement/);
  const p6=[...d.querySelectorAll('td.cat-c-p6')];assert.equal(p6.length,D.families['perso-vehicules'].items.length+D.families['perso-armes'].items.length);for(const td of p6)assert.doesNotMatch(td.textContent,/\d|\$/);
});

test('navigateur : #perso-vehicules=sport ouvre la liste filtrée sur les voitures de sport avec la note de filtre ; « Tout afficher » retire le filtre ; #perso-armes=girardi-es9 filtre sur les postes qui citent cette arme',withPage('personnalisations.html#perso-vehicules=sport',a=>{
  const box=a.d.getElementById('box-perso-vehicules');assert.equal(box.open,true);
  const rows=()=>[...box.querySelectorAll('tr.cat-row')],visible=()=>rows().filter(r=>!r.hidden);
  assert.ok(visible().length>=20&&visible().length<rows().length);assert.ok(visible().every(r=>r.dataset.compat.split(' ').includes('sport')));
  const note=box.querySelector('[data-cat-filter]');assert.equal(note.hidden,false);assert.equal(box.querySelector('[data-cat-filter-label]').textContent,'Voitures de sport');
  assert.equal(a.d.getElementById('box-perso-armes').open,false);
  note.querySelector('[data-cat-reset]').click();assert.equal(visible().length,rows().length);assert.equal(note.hidden,true);
  a.w.location.hash='#perso-armes=girardi-es9';a.w.dispatchEvent(new a.w.Event('hashchange'));a.flush();
  const arm=a.d.getElementById('box-perso-armes');assert.equal(arm.open,true);
  /* v7.69 : l’arme est choisie dans « Ton arme » : ses postes nommés et ceux des pistolets qui ne sont réservés à aucune autre arme */
  const shown=[...arm.querySelectorAll('tr.cat-row')].filter(r=>!r.hidden);assert.ok(shown.length>=3&&shown.every(r=>r.dataset.ids?r.dataset.ids.split(' ').includes('girardi-es9'):r.dataset.compat.split(' ').some(t=>t==='girardi-es9'||t==='pistolet')));
  assert.ok(shown.some(r=>(r.dataset.ids||'').split(' ').includes('girardi-es9')));assert.ok(!shown.some(r=>r.id.endsWith('variante-klose-k17')),'la variante d’une autre arme n’est pas proposée');
  assert.equal(arm.querySelector('[data-cat-filter-label]').textContent,'Girardi ES9');assert.equal(a.d.querySelector('[data-cat-pick="perso-armes"] [data-cat-pick-name]').textContent,'Girardi ES9');
  a.w.location.hash='#perso-armes=pistolet';a.w.dispatchEvent(new a.w.Event('hashchange'));a.flush();
  const pist=[...arm.querySelectorAll('tr.cat-row')].filter(r=>!r.hidden);assert.ok(pist.length>shown.length&&pist.every(r=>r.dataset.compat.split(' ').includes('pistolet')));
  /* une catégorie inconnue dans l'adresse : la liste s'ouvre entière, sans note */
  a.w.location.hash='#perso-armes=inconnue';a.w.dispatchEvent(new a.w.Event('hashchange'));a.flush();
  assert.equal([...arm.querySelectorAll('tr.cat-row')].filter(r=>!r.hidden).length,arm.querySelectorAll('tr.cat-row').length);assert.equal(arm.querySelector('[data-cat-filter]').hidden,true);
}));

test('navigateur : « Je l’ai » remplit lk_own_perso-vehicules et lk_own_perso-armes ; la case du kit Ganado dans la liste est celle de la carte (lk_progression_v2, une seule fois dans le total)',withPage('personnalisations.html',a=>{
  const veh=a.d.getElementById('box-perso-vehicules'),arm=a.d.getElementById('box-perso-armes');
  assert.equal(veh.querySelectorAll('td.cat-c-own .track-bt').length,C.counts('perso-vehicules').suivis);assert.equal(arm.querySelectorAll('td.cat-c-own .track-bt').length,C.counts('perso-armes').suivis);
  a.d.querySelector('tr#perso-vehicules-turbo .track-bt').click();a.d.querySelector('tr#perso-armes-silencieux .track-bt').click();
  assert.deepEqual(JSON.parse(a.w.localStorage.getItem('lk_own_perso-vehicules')),{turbo:1});assert.deepEqual(JSON.parse(a.w.localStorage.getItem('lk_own_perso-armes')),{silencieux:1});
  assert.equal(veh.querySelector('[data-track-bar="perso-vehicules"] b').textContent,'1');assert.equal(arm.querySelector('[data-track-bar="perso-armes"] b').textContent,'1');
  const rowBox=a.d.querySelector('tr#perso-vehicules-kit-ganado-retro input[data-acq-toggle]'),cardBox=a.d.querySelector('#ganado-retro-build input[data-acq-toggle]');
  assert.equal(rowBox.closest('label').hidden,false,'case affichée par acquisitions.js');assert.equal(a.d.querySelector('tr#perso-vehicules-kit-ganado-retro .track-bt'),null,'pas de second bouton');
  rowBox.checked=true;rowBox.dispatchEvent(new a.w.Event('change',{bubbles:true}));a.flush();
  assert.equal(JSON.parse(a.w.localStorage.getItem('lk_progression_v2')).checked['ganado-retro-build'],true);assert.equal(cardBox.checked,true,'la carte suit');
  assert.equal(a.w.localStorage.getItem('lk_own_perso-vehicules'),'{"turbo":1}','aucune clé de famille touchée');
}));

/* v7.51 (lot 4) : les deux familles sont deux lignes de la carte « Mes personnalisations » ; le kit Ganado et le motif
   Vintage sont des contenus documentés (carte « Mes propriétés et contenus »), comptés une fois dans le total. */
test('Progression : deux familles du lot 6 comptées dans la carte « Mes personnalisations », kit et motif dans « Mes propriétés et contenus », ancres, total ; liste sur la page du carnet',withPage('progression.html#perso-armes',a=>{
  const P=progress();
  for(const fam of LOT6){const line=a.d.querySelector('#carnet-personnalisations [data-family="'+fam+'"]');assert.ok(line,fam);assert.ok(a.d.getElementById(fam),'ancre #'+fam);
    assert.equal(P.LK_PROGRESS_IDS[fam].length,C.counts(fam).suivis);assert.equal(Object.keys(P.LK_PROGRESS_NAMES[fam]).length,C.counts(fam).suivis);
    assert.match(read('progression.html'),new RegExp('data-family="'+fam+'"><span>[^<]*</span> <strong class="suivi-n">0 / '+C.counts(fam).suivis+'<'));}
  assert.match(a.d.querySelector('[data-family="perso-armes"] .suivi-n').textContent,new RegExp('^1 / '+C.counts('perso-armes').suivis+'$'));
  assert.match(a.d.querySelector('[data-family="perso-vehicules"] .suivi-n').textContent,/^1 \//);
  assert.ok(a.d.getElementById('carnet-personnalisations').classList.contains('is-target'),'l’ancre #perso-armes met la carte du carnet en évidence');
  assert.equal(a.d.querySelector('#carnet-personnalisations [data-cn-done]').textContent,'2');
  assert.equal(a.d.querySelector('#carnet-proprietes [data-cn-done]').textContent,'1','kit Ganado : contenu documenté');
  assert.match(a.d.getElementById('progress-global-text').textContent,/^3 cochés sur/);
},{storage:{'lk_own_perso-armes':'{"silencieux":1}','lk_own_perso-vehicules':'{"turbo":1}',lk_progression_v2:'{"version":2,"migratedAt":"2026-09-27T00:00:00.000Z","checked":{"ganado-retro-build":true}}'}}));

test('Carnet « Mes personnalisations » : ligne cochée vers son ancre, catégorie, filtre par famille depuis l’adresse (#f=perso-armes)',withPage('carnets/personnalisations.html#f=perso-armes',a=>{
  assert.equal(a.d.getElementById('cn-fam').value,'perso-armes');
  const cards=[...a.d.querySelectorAll('.cn-card')];assert.deepEqual(cards.map(c=>c.dataset.key),['perso-armes:silencieux']);
  assert.equal(cards[0].querySelector('.cn-name a').getAttribute('href'),'../personnalisations.html#perso-armes-silencieux');assert.ok(cards[0].textContent.includes('Silencieux et canons'));
  cards[0].querySelector('[data-cn-act="unown"]').click();a.flush();assert.deepEqual(JSON.parse(a.w.localStorage.getItem('lk_own_perso-armes')),{});
},{storage:{'lk_own_perso-armes':'{"silencieux":1}','lk_own_perso-vehicules':'{"turbo":1}'}}));

test('progression-core : les deux familles entrent dans le total, l’export et l’import ; une case du kit reste une acquisition',()=>{
  const P=require(path.join(root,'progression-core.js')),IDS=progress().LK_PROGRESS_IDS;
  const mem=new Map();const storage={get length(){return mem.size;},key:i=>[...mem.keys()][i],getItem:k=>mem.has(k)?mem.get(k):null,setItem:(k,v)=>mem.set(k,String(v)),removeItem:k=>mem.delete(k)};
  const store=P.create({storage,acquisitions:{categories:[],items:[]},ids:IDS,collectibles:[]});
  assert.ok(store.toggle('turbo',true));assert.ok(store.toggle('silencieux',true));
  const s=store.summary();for(const fam of LOT6){const g=s.groups.find(x=>x.id===fam);assert.ok(g,fam);assert.equal(g.total,IDS[fam].length);assert.equal(g.done,1);assert.equal(g.label,fam==='perso-armes'?'Personnalisation des armes':'Personnalisation des véhicules');}
  const out=store.exportData();assert.equal(out.data['lk_own_perso-vehicules'],'{"turbo":true}');assert.equal(out.data['lk_own_perso-armes'],'{"silencieux":true}');
  mem.clear();const plan=store.prepareImport(JSON.stringify(out));assert.deepEqual(plan.issues,[]);store.applyImport(plan,'merge');assert.equal(store.summary().done,2);
  assert.ok(!IDS['perso-vehicules'].includes('kit-ganado-retro')&&!IDS['perso-armes'].includes('motif-vintage-vice-city'),'les lignes reliées à une carte ne sont pas comptées deux fois');
});

test('fiches : chaque fiche véhicule a « Personnaliser ce véhicule » vers sa catégorie filtrée, chaque fiche d’arme « Accessoires compatibles », les fiches des deux ateliers renvoient à la sous-section',()=>{
  /* v7.69 : le lien vise le modèle lui-même (#perso-vehicules=<véhicule>, #perso-armes=<arme>) : la section le choisit dans « Ton véhicule » / « Ton arme » */
  for(const v of vehicules()){const h=read('vehicules/'+v.id+'.html');const m=h.match(/<a href="\.\.\/personnalisations\.html#perso-vehicules=([a-z0-9-]+)">Personnaliser ce véhicule<\/a>/);assert.ok(m,v.id);assert.equal(m[1],v.id);}
  for(const a of armes()){const h=read('armes/'+a.id+'.html');const m=h.match(/<a href="\.\.\/personnalisations\.html#perso-armes=([a-z0-9-]+)">Personnaliser cette arme<\/a>/);assert.ok(m,a.id);assert.equal(m[1],a.id);}
  for(const b of ['rideout-customs','one-eyed-willie'])assert.ok(read('entreprises/'+b+'.html').includes('href="../personnalisations.html#perso-vehicules">Personnaliser mon véhicule</a>'),b);
  assert.ok(!read('entreprises/stock-305.html').includes('personnalisations.html#perso-'),'une boutique de vêtements ne renvoie pas aux ateliers');
  /* le lien reste dans le bloc de liens du bandeau, une fois */
  const g=doc('vehicules/vapid-ganado.html');assert.equal(g.querySelectorAll('.fhero .fiche-liens a[href*="personnalisations.html"]').length,1);
});

test('recherche interne, Léo et sitemap : chaque poste indexé vers son ancre (type élément, mots de compatibilité), les deux familles indexées, cinq FAQ dans Léo avec réponses, « trouve silencieux »',()=>{
  const c={window:{}};vm.runInNewContext(read('search-index.js'),c);const idx=c.window.LK_INDEX;
  for(const fam of LOT6){const d=D.families[fam];const sec=idx.find(e=>e.u===d.page+'#'+d.section);assert.ok(sec&&sec.l===d.label&&sec.k==='Personnalisations',fam+' section');
    for(const it of d.items){const e=idx.find(x=>x.u===d.page+'#'+C.rowId(fam,it));assert.ok(e,it.id+' indexé');assert.equal(e.t,'element');assert.equal(e.k,C.KIND[fam]);}}
  assert.ok(idx.find(e=>e.u==='/personnalisations.html#perso-armes-silencieux').s.includes('pistolets'),'mots de compatibilité dans la recherche');
  const leo=JSON.parse(read('leo-index.json')),core=require(path.join(root,'outils/tests/leo-complet.cjs')).fullCore(root)/* v7.45 : noyau + morceaux */;
  for(const fam of LOT6){const rows=core.items.filter(x=>x.kind==='catalogue-'+fam);assert.equal(rows.length,D.families[fam].items.length,fam+' dans Léo');for(const r of rows){assert.ok(r.url.startsWith('/personnalisations.html#'),r.name);assert.equal(r.price,undefined);}}
  const faq=leo.knowledge.filter(x=>/^acq-customizations-/.test(x.id));assert.equal(faq.length,5);for(const t of faq)assert.equal(t.links[0].url,'/personnalisations.html#faq');
  for(const [q,re] of [['peut-on personnaliser sa voiture dans gta 6 ?',/Rideout Customs/],['peut-on repeindre sa voiture dans gta 6 ?',/Pay ’n’ Spray/],['peut-on personnaliser ses armes dans gta 6 ?',/Rob Nelson/],['c est quoi le kit retro du ganado ?',/Édition Ultimate/],['ou est ammu nation dans gta 6 ?',/Ammu-Nation/]]){const a=core.answer(q);assert.equal(a.kind,'answer',q);assert.match(a.text,re,q);/* v7.45 : la réponse rédigée peut viser une ancre plus précise de la même page */assert.ok(a.links[0].url.startsWith('/personnalisations.html'),q+' → '+a.links[0].url);}
  const r=core.answer('trouve silencieux');assert.equal(r.kind,'results');assert.ok(r.results.some(x=>x.url==='/personnalisations.html#perso-armes-silencieux'));
  assert.ok(read('sitemap.xml').includes('https://www.leonidakit.com/personnalisations.html'));
});

test('sections.cjs : les 27 icônes des postes existent et sont dessinées dans la charte (24 × 24, un accent)',()=>{
  const icons=new Set();for(const fam of LOT6)for(const c of D.families[fam].categories)icons.add(c.icon);
  assert.ok(icons.size>=25);for(const i of icons){const svg=S.icon(i);assert.match(svg,/^<svg class="ed-ico" viewBox="0 0 24 24"/);assert.ok(svg.includes('class="ac"'),i+' : accent');}
  for(const i of ['kit','carrosserie','jante','peinture','vitre','plaque','klaxon','phare','neon','suspension','moteur','frein','transmission','turbo','blindage','interieur','livree','securite','chargeur','viseur','silencieux','poignee','finition','camouflage','conversion','casier'])assert.ok(S.ICONS[i],i);
});
