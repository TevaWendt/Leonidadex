/* v7.40 (lot 3) : sections éditoriales des hubs (sections.cjs, hubs-editoriaux.json), zones générées de vehicules.html et
   armes.html, page Achats (descriptions, bloc éditorial, FAQ), puces de navigation communes (site-shell.cjs). */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm');
const {load}=require('./runtime-helper.cjs');const root=process.env.SITE_ROOT||path.resolve(__dirname,'../..');
const {JSDOM}=require('jsdom');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const doc=f=>new JSDOM(read(f)).window.document;
const withPage=(file,fn,opts={})=>async()=>{const a=await load(root,file,opts);try{await fn(a);assert.deepEqual(a.errors.filter(x=>!x.includes('Not implemented: navigation')),[]);}finally{a.close();}};
const data=(()=>{const c={window:{}};for(const f of ['vehicules-data.js','armes-data.js'])vm.runInNewContext(read(f),c);return c.window;})();
const S=require(path.join(root,'outils/sections.cjs'));
const shell=require(path.join(root,'outils/site-shell.cjs'));
const HUBS=JSON.parse(read('outils/hubs-editoriaux.json'));

test('sections.cjs : icônes connues, section complète (numéro, kicker, titre, accent, fond), erreurs franches',()=>{
  for(const x of HUBS.armes.equipements.items)assert.ok(S.ICONS[x.icon||x.id],'icône manquante : '+x.id);
  const html=S.section({id:'x',num:3,kicker:'Kick',title:'Titre',icon:'chiffres',tone:'night',accent:'coral',lede:'Lede'},'<p>corps</p>');
  assert.match(html,/<section class="ed ed--night ed--coral reveal" id="x" aria-labelledby="x-t">/);
  assert.match(html,/<span class="ed-num" aria-hidden="true">03<\/span>/);assert.match(html,/<p class="ed-kicker">Kick<\/p>/);
  assert.match(html,/<h2 class="ed-title" id="x-t">Titre<\/h2><p class="ed-lede">Lede<\/p>/);assert.match(html,/<div class="ed-body"><p>corps<\/p><\/div>/);
  assert.throws(()=>S.icon('inconnue'),/Icône inconnue/);assert.throws(()=>S.section({id:'y',title:'T',tone:'rose'},''),/Fond inconnu/);
  assert.throws(()=>S.mediaFigure('pas-un-visuel'),/Visuel officiel inconnu/);
  assert.equal(S.initials('Western Company'),'WC');assert.equal(S.initials('Albany'),'AL');
});

test('carte-vignette.cjs : silhouette simplifiée déterministe, repère aux coordonnées de la carte, lieu inconnu refusé',()=>{
  const C=require(path.join(root,'outils/carte-vignette.cjs'));
  const land=C.land();assert.ok(land.length>4000&&land.length<12000,'silhouette : '+land.length);assert.equal(land,C.land());
  const v=C.vignette('g-L1074');assert.match(v,/<use href="#lk-leonida" width="5200" height="6000"\/>/);assert.match(v,/cx="3121" cy="3990"/);
  /* v7.69 : vignette cadrée sur le lieu (fenêtre carrée gardée dans la carte, repère dedans) */
  const vb=v.match(/viewBox="(\d+) (\d+) (\d+) (\d+)"/).slice(1).map(Number);assert.equal(vb[2],C.ZOOM);assert.equal(vb[3],C.ZOOM);
  assert.ok(vb[0]>=0&&vb[1]>=0&&vb[0]+vb[2]<=C.W&&vb[1]+vb[3]<=C.H&&3121>vb[0]&&3121<vb[0]+vb[2]&&3990>vb[1]&&3990<vb[1]+vb[3],'fenêtre '+vb);
  assert.throws(()=>C.vignette('nulle-part'),/Lieu inconnu/);
  assert.equal(C.defs().match(/<symbol id="lk-leonida"/g).length,1);
});

test('vehicules.html : zone éditoriale générée (nav, 9 sections, chiffres et mur de marques issus de la base, lieux avec vignette, FAQ)',()=>{
  const d=doc('vehicules.html'),V=data.LK_VEHICULES;
  assert.deepEqual([...d.querySelectorAll('.ed-zone section.ed')].map(s=>s.id),['a-venir','aller-plus-loin','chiffres','marques','conduite','ultimate','carte','fiabilite','faq']);
  assert.equal(d.querySelectorAll('.ed-nav a').length,HUBS.vehicules.nav.length);
  for(const a of d.querySelectorAll('.ed-nav a, .vhero-jump a'))assert.ok(d.getElementById(a.getAttribute('href').slice(1)),'ancre : '+a.getAttribute('href'));
  const figs=[...d.querySelectorAll('#chiffres .fig-n')].map(x=>+x.dataset.count);
  const st=V.reduce((a,v)=>(a[v.st]=(a[v.st]||0)+1,a),{});
  assert.deepEqual(figs,[V.length,st.officiel,st.vu,st.comm,0]);
  const brands=new Set(V.map(v=>v.marque).filter(m=>m&&m!=='Marque inconnue'));
  const tiles=[...d.querySelectorAll('#marques .ed-brand')];assert.equal(tiles.length,brands.size);
  assert.equal(tiles.filter(t=>t.querySelector('.ed-brand-ev:not(.ed-brand-ev--none)')).length>=35,true);
  const albany=tiles.find(t=>t.querySelector('b').textContent==='Albany');assert.equal(albany.getAttribute('href'),'vehicules.html#q=Albany');
  assert.equal(albany.querySelector('.ed-brand-n').textContent.replace(/\s+/g,' ').trim(),V.filter(v=>v.marque==='Albany').length+' véhicules →');
  assert.equal(d.querySelectorAll('#marques button[data-letter]').length,new Set([...brands].map(b=>S.fold(b)[0].toUpperCase())).size+1);
  assert.equal(d.querySelectorAll('#carte .ed-place').length,HUBS.vehicules.carte.groups.reduce((n,g)=>n+g.items.length,0));
  assert.equal(d.querySelectorAll('#lk-leonida').length,1);
  for(const p of d.querySelectorAll('#carte .ed-place'))assert.match(p.getAttribute('href'),/^carte\.html#lieu=[\w-]+$/);
  assert.equal(d.querySelectorAll('#ultimate .kit-grid .kit--lien').length,st.officiel);
  assert.equal(d.querySelectorAll('#faq details').length,HUBS.vehicules.faq.length);
  assert.match(d.querySelector('#faq .ans').textContent,new RegExp('Nous recensons ici '+V.length+' véhicules, dont '+st.officiel+' sont nommés'));
  assert.equal(d.querySelectorAll('script[data-lk="faq"]').length,1);
  assert.ok(!read('vehicules.html').includes('marque-row')&&!read('vehicules.html').includes('class="kpi"'));
});

test('armes.html : zone générée entre les marqueurs, idempotente ; équipements et munitions gardent leur suivi ; combat et lieux',()=>{
  const html=read('armes.html'),d=doc('armes.html'),A=data.LK_ARMES;
  assert.equal(html.match(/<!-- lk:armurerie-editorial/g).length,1);assert.equal(html.match(/<!-- \/lk:armurerie-editorial -->/g).length,1);
  assert.deepEqual([...d.querySelectorAll('.ed-zone section.ed')].map(s=>s.id),['inventaire','chiffres','equipements','munitions','combat','carte','fiabilite','faq']);
  const st=A.reduce((a,x)=>(a[x.st]=(a[x.st]||0)+1,a),{});
  assert.deepEqual([...d.querySelectorAll('#chiffres .fig-n')].map(x=>+x.dataset.count).slice(0,3),[A.length,st.officiel,st.vu]);
  assert.equal(d.querySelectorAll('#equipements [data-track="equipements"]').length,16);assert.equal(d.querySelectorAll('#equipements .ed-kit .ed-ico').length,16);
  assert.equal(d.querySelectorAll('#munitions [data-track="munitions"]').length,5);assert.ok(d.querySelector('#munitions').classList.contains('ed--night'));
  /* v7.55 (lot 2, VIS-01) : six cartes homogènes, toutes avec visuel officiel, statut, limite et source datée */
  assert.equal(d.querySelectorAll('#combat .ed-step').length,6);assert.equal(d.querySelectorAll('#combat .ed-step--media img[loading="lazy"]').length,6);
  assert.equal(d.querySelectorAll('#combat .ed-steps--sourced .ed-step .ed-status .ed-st').length,6);assert.equal(d.querySelectorAll('#combat .ed-step-limit').length,6);
  assert.equal(d.querySelectorAll('#combat .ed-step-src a[href^="https://"][rel~="noopener"]').length,6);assert.equal(d.querySelectorAll('#combat .ed-step-src .ed-src-meta').length,6);
  assert.ok(d.querySelector('#combat .ed-callout a[href="#fiabilite"]'));assert.ok(d.querySelector('#fiabilite'));
  assert.ok(!/Changement de main|rangent d’ailleurs leur arme automatiquement/.test(d.querySelector('#combat').textContent),'anciennes formulations non sourcées retirées');
  for(const img of d.querySelectorAll('#combat img'))assert.ok(fs.existsSync(path.join(root,img.getAttribute('src'))),img.getAttribute('src'));
  assert.equal(d.querySelectorAll('#carte .ed-place').length,3);
  assert.deepEqual([...d.querySelectorAll('.ed-nav a')].map(a=>a.dataset.fam),HUBS.armes.nav.map(x=>x.fam));
  assert.equal(d.querySelectorAll('#faq details').length,6);assert.equal(d.querySelectorAll('script[data-lk="faq"]').length,1);
  const ids=[...d.querySelectorAll('[id]')].map(x=>x.id);assert.deepEqual(ids.filter((x,i)=>ids.indexOf(x)!==i),[]);
  // les noms des familles suivies sont toujours lus par sync-site (progression-data.js)
  const p={window:{}};vm.runInNewContext(read('progression-data.js'),p);
  assert.equal(p.window.LK_PROGRESS_IDS.equipements.length,16);assert.equal(p.window.LK_PROGRESS_IDS.munitions.length,5);
  assert.equal(p.window.LK_PROGRESS_NAMES.equipements['sac-a-dos'].n,'Sac à dos');
});

test('Armurerie : « Je l’ai » fonctionne toujours sur les nouvelles cartes (16 équipements, 5 munitions)',withPage('armes.html',a=>{
  const items=a.d.querySelectorAll('#equipements .track-bt');assert.equal(items.length,16);
  items[0].click();assert.equal(a.d.querySelector('[data-track-bar="equipements"] b').textContent,'1');
  assert.equal(a.d.querySelectorAll('#munitions .track-bt').length,5);
  assert.deepEqual(JSON.parse(a.w.localStorage.getItem('lk_own_equipements')),{[items[0].dataset.trackFor]:1});
}));

test('Véhicules : le mur de marques se filtre par lettre et par recherche, tout reste visible sans filtre',withPage('vehicules.html',a=>{
  const tiles=[...a.d.querySelectorAll('.ed-brand')];assert.ok(tiles.length>40);assert.ok(tiles.every(t=>!t.hidden));
  const q=a.d.querySelector('[data-brand-q]');q.value='ferrari';q.dispatchEvent(new a.w.Event('input'));
  const shown=tiles.filter(t=>!t.hidden);assert.equal(shown.length,1);assert.equal(shown[0].querySelector('b').textContent,'Grotti');
  assert.equal(a.d.querySelector('[data-brand-count]').textContent,'1 sur '+tiles.length);
  q.value='';q.dispatchEvent(new a.w.Event('input'));
  a.d.querySelector('[data-letter="V"]').click();
  assert.deepEqual(tiles.filter(t=>!t.hidden).map(t=>t.dataset.letter),tiles.filter(t=>t.dataset.letter==='V').map(()=>'V'));
  a.d.querySelector('[data-letter="V"]').click();assert.ok(tiles.every(t=>!t.hidden));
}));

test('achats.html : description utile sous chaque carte (acquisitions.json), actions, bloc éditorial sourcé de 400 à 600 mots, FAQ de quatre questions en FAQPage',()=>{
  const d=doc('achats.html');const cards=[...d.querySelectorAll('.ak-card')];assert.equal(cards.length,11);
  const acq=JSON.parse(read('outils/acquisitions.json'));
  for(const c of cards){const desc=c.querySelector('.ak-desc');assert.ok(desc&&desc.textContent.length>120,c.querySelector('h3').textContent);assert.ok(c.querySelectorAll('.ak-do a').length>=2);
    for(const a of c.querySelectorAll('.ak-do a'))assert.ok(fs.existsSync(path.join(root,a.getAttribute('href').split(/[?#]/)[0])),a.getAttribute('href'));}
  assert.ok(cards[0].querySelector('.ak-desc').textContent.startsWith(data.LK_VEHICULES.length+' fiches'));
  assert.equal(acq.categories.filter(c=>c.description).length,6);assert.equal(Object.keys(acq.hub.cards).length,5);
  const sections=[...d.querySelectorAll('#comprendre section.ed')].map(s=>s.id);assert.deepEqual(sections,['statuts','rockstar','serie','calculateur']);
  const words=[...d.querySelectorAll('#comprendre .ed-body')].map(b=>{const c=b.cloneNode(true);c.querySelectorAll('.ed-sources,.ed-links').forEach(x=>x.remove());return c.textContent.replace(/\s+/g,' ');}).join(' ').match(/[\p{L}\d’'-]+/gu).length;
  assert.ok(words>=400&&words<=620,'mots (hors sources et boutons) : '+words);
  const sources=[...d.querySelectorAll('#rockstar .ed-sources a')];assert.equal(sources.length,5);
  for(const a of sources)assert.match(a.getAttribute('href'),/^https:\/\/www\.rockstargames\.com\//);
  assert.equal(d.querySelectorAll('#faq details').length,4);assert.equal(d.querySelectorAll('script[data-lk="faq"]').length,1);
  assert.ok(d.querySelector('#calculateur a[href^="calculateurs.html?tool=purchase"]')&&d.querySelector('#calculateur a[href^="calculateurs.html?tool=roi"]')&&d.querySelector('#calculateur a[href^="calculateurs.html?tool=order"]'));
});

test('Puces de navigation : un seul module, même liste et même ordre partout, page courante exclue, absentes ailleurs',()=>{
  const pages=[...shell.sectionPages];assert.ok(pages.includes('planques.html')&&pages.includes('vehicules.html')&&pages.includes('achats.html')&&pages.includes('progression.html'));
  /* v7.69 : une liste par famille de pages (monde, jouer, s’équiper), même ordre dans chaque famille */
  for(const f of pages){const expected=shell.chipSets[shell.chipSetOf(f)].map(x=>x[1]);const d=doc(f);const navs=d.querySelectorAll('nav.lk-chips');assert.equal(navs.length,1,f);
    const labels=[...navs[0].querySelectorAll('a')].map(a=>a.textContent);
    assert.deepEqual(labels,expected.filter(l=>labels.includes(l)),'ordre : '+f);
    for(const a of navs[0].querySelectorAll('a')){const href=a.getAttribute('href');assert.notEqual(href.split('#')[0],f,'page courante listée : '+f);assert.ok(fs.existsSync(path.join(root,href.split('#')[0])),href);}
    assert.ok(labels.length>=expected.length-2,f);
    assert.equal(d.querySelectorAll('nav.d-related').length,0,f);}
  for(const f of ['index.html','carte.html','calculateurs.html','tuto.html','a-propos.html','vehicules/albany-emperor.html'])assert.equal(doc(f).querySelectorAll('nav.lk-chips').length,0,f);
});
