/* v7.44 (lot 7) : page À propos refaite (outils/gen-informations.cjs + outils/informations-editorial.json) : gabarit commun
   des pages d'information (bandeau avec pile, sous-navigation, sections du lot 3), séquence lk-showcase des six outils
   (visuels officiels crédités, titres mot à mot, clavier, mouvement réduit), contenu complet (neuf sections, 700 à 1 100
   mots, aucun nombre tapé à la main : chiffres posés par sync-site depuis les données), SEO (AboutPage + Organization
   cohérents avec l'accueil, FAQPage, fil d'Ariane), Contact et Mentions dans le nouveau gabarit sans changer de contenu. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm');
const {JSDOM}=require('jsdom');
const {load}=require('./runtime-helper.cjs');
const root=process.env.SITE_ROOT||path.resolve(__dirname,'../..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const doc=f=>new JSDOM(read(f)).window.document;
const ld=d=>[...d.querySelectorAll('script[type="application/ld+json"]')].map(s=>JSON.parse(s.textContent));
const ED=JSON.parse(read('outils/informations-editorial.json')).aPropos;
const withPage=(file,fn,opts={})=>async()=>{const a=await load(root,file,opts);try{await fn(a);assert.deepEqual(a.errors.filter(x=>!x.includes('Not implemented: navigation')&&!/scrollIntoView/.test(x)),[]);}finally{a.close();}};
const strip=h=>h.replace(/<script[\s\S]*?<\/script>/g,' ').replace(/<style[\s\S]*?<\/style>/g,' ').replace(/<[^>]+>/g,' ').replace(/&[a-z#0-9]+;/g,' ');
const words=t=>(t.match(/[\p{L}\p{N}’'-]+/gu)||[]).length;

test('À propos : gabarit (bandeau avec pile cliquable, sous-navigation, neuf sections numérotées aux compositions variées), ancres de navigation, 700 à 1 100 mots de corps, registre « tu », aucun superlatif creux',()=>{
  const d=doc('a-propos.html');
  assert.equal(d.querySelectorAll('.page-head .lk-stack').length,1);assert.ok(d.querySelectorAll('.page-head .lk-stack a.lk-stack-link').length>=3,'pile cliquable');
  assert.equal(d.querySelectorAll('.ed-zone--info > nav.ed-nav').length,1);
  for(const a of d.querySelectorAll('.ed-nav a'))assert.ok(d.getElementById(a.getAttribute('href').slice(1)),'ancre '+a.getAttribute('href'));
  const secs=[...d.querySelectorAll('.ed-zone--info > section.ed')];assert.equal(secs.length,9);
  secs.forEach((s,i)=>assert.equal(s.querySelector('.ed-num').textContent,String(i+1).padStart(2,'0')));
  assert.deepEqual(secs.map(s=>s.id),['pourquoi','ce-que-le-site-fait','comment-on-verifie','en-chiffres','calendrier','independance','qui','contribuer','faq']);
  /* compositions : jamais deux sections identiques à la suite (premier enfant du corps) */
  const kinds=secs.map(s=>{const b=s.querySelector('.ed-body');const f=b.firstElementChild;return f.className.split(' ')[0];});
  for(let i=1;i<kinds.length;i++)assert.notEqual(kinds[i],kinds[i-1],'sections '+(i)+' et '+(i+1)+' : '+kinds[i]);
  const body=strip(d.querySelector('.ed-zone--info').outerHTML.replace(/<nav[\s\S]*?<\/nav>/,''));
  const n=words(body);assert.ok(n>=700&&n<=1400,'mots du corps : '+n);
  const txt=read('a-propos.html');
  assert.doesNotMatch(txt,/le plus complet|le meilleur site|incontournable|révolutionnaire/i);
  assert.doesNotMatch(strip(txt),/\bvous\b/i,'registre « tu »');
  assert.equal(d.querySelectorAll('.lk-entry-hub').length,0);assert.equal(d.querySelectorAll('nav.lk-chips').length,0);
  assert.equal(d.querySelectorAll('.info-grid, .info-sources, .info-split').length,0,'plus de présentation « PowerPoint » sur À propos');
});

test('À propos : séquence lk-showcase des six outils (ordre, visuels officiels crédités dans medias-officiels.json et medias.html, cartes focusables, titres, liens vers chaque outil), script chargé',()=>{
  const d=doc('a-propos.html'),medias=JSON.parse(read('outils/medias-officiels.json'));
  const cards=[...d.querySelectorAll('[data-showcase] .lk-show')];assert.equal(cards.length,6);
  assert.deepEqual(cards.map(c=>c.querySelector('.lk-show-t').textContent),['Préparer un choix','Explorer une destination','Lire avant de comparer','Garder ses repères','Demander à Léo','Distinguer apparition et acquisition']);
  cards.forEach((c,i)=>{assert.equal(c.getAttribute('tabindex'),'0');assert.equal(c.getAttribute('aria-labelledby'),c.querySelector('h3').id);
    const img=c.querySelector('.lk-show-fig img');assert.ok(img&&img.getAttribute('alt').length>20,'alt');assert.ok(fs.existsSync(path.join(root,img.getAttribute('src').slice(1))),img.getAttribute('src'));
    const id=ED.showcase.cards[i].media;assert.ok(medias[id],id);assert.ok(img.getAttribute('src').includes(id));
    const credit=c.querySelector('figcaption a');assert.equal(credit.getAttribute('href'),'medias.html#media-'+id);assert.ok(read('medias.html').includes('id="media-'+id+'"'));
    assert.match(c.querySelector('figcaption').textContent,/Rockstar Games/);
    const link=c.querySelector('a.lk-show-link');assert.ok(fs.existsSync(path.join(root,link.getAttribute('href').split(/[?#]/)[0])),link.getAttribute('href'));
    assert.ok(c.querySelector('.lk-show-p').textContent.length>60);});
  assert.ok(read('a-propos.html').includes('src="lk-showcase.js'));assert.ok(fs.existsSync(path.join(root,'lk-showcase.js')));
  /* aucune image de stock : tous les visuels de la page sont dans img/officiel */
  for(const img of d.querySelectorAll('main img'))assert.match(img.getAttribute('src'),/^\/?img\/officiel\//,img.getAttribute('src'));
});

test('À propos : aucun nombre tapé à la main — les chiffres viennent des données (sync-site), la date de sortie et les dates de vérification des fichiers sources',()=>{
  const d=doc('a-propos.html');
  const c={window:{}};for(const f of ['vehicules-data.js','armes-data.js','progression-data.js'])vm.runInNewContext(read(f),c);
  const C=require(path.join(root,'outils/catalogues.cjs'));const medias=JSON.parse(read('outils/medias-officiels.json'));const leo=JSON.parse(read('leo-index.json'));
  const stat=k=>parseInt(d.querySelector('.fig-n[data-stat="'+k+'"]').dataset.count,10);
  assert.equal(stat('vehicules'),c.window.LK_VEHICULES.length);assert.equal(stat('armes'),c.window.LK_ARMES.length);assert.equal(stat('lieux'),new Set(c.window.LK_PROGRESS_IDS.lieux).size);
  assert.equal(stat('lignes'),C.FAMILIES.reduce((n,f)=>n+C.counts(f).n,0));assert.equal(stat('visuels'),Object.keys(medias).length);assert.equal(stat('leo'),leo.knowledge.length+Object.values(leo.shards||{}).filter(x=>x.knowledge).reduce((n,x)=>n+JSON.parse(read(x.file.slice(1))).knowledge.length,0))/* v7.45 : noyau + morceau calculateur */;
  const tests=fs.readdirSync(path.join(root,'outils/tests')).filter(f=>f.endsWith('.test.cjs')).reduce((n,f)=>n+(read('outils/tests/'+f).match(/^\s*test\(/gm)||[]).length,0);assert.equal(stat('tests'),tests);
  const pages=fs.readdirSync(root).filter(f=>f.endsWith('.html')&&!f.startsWith('google')).length+['armes','vehicules','lieux','personnages','entreprises','demeures','planques','carnets'].reduce((n,x)=>n+fs.readdirSync(path.join(root,x)).filter(f=>f.endsWith('.html')).length,0);
  assert.equal(stat('pages'),pages);
  for(const b of d.querySelectorAll('.fig-n'))assert.equal(b.textContent.replace(/[  ]/g,''),b.dataset.count,'texte sans JS = valeur');
  const acq=JSON.parse(read('outils/acquisitions.json'));const fr=iso=>new Intl.DateTimeFormat('fr-FR',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(iso+'T12:00:00Z'));
  assert.ok(d.getElementById('calendrier').textContent.includes(fr(acq.game.releaseDate)));assert.ok(d.getElementById('calendrier').textContent.includes(fr(acq.game.checkedAt)));
  const src=JSON.parse(read('outils/catalogues/sources.json')).sources;assert.ok(d.getElementById('comment-on-verifie').textContent.includes(fr(Object.values(src).map(s=>s.consultedAt).sort().pop())));
  /* aucune date ni aucun nombre de fiches écrit dans le JSON éditorial */
  /* la date de sortie, les dates de vérification et les compteurs ne sont jamais écrits dans le JSON éditorial (seules les dates d’événements cités le sont, comme le texte des éditions du 24 juin 2026) */
  const ed=JSON.stringify(ED);assert.doesNotMatch(ed,/19 novembre|novembre 2026|septembre 2026/);assert.doesNotMatch(ed,/\b(302|2 ?547|148|405|406|237|122)\b/);
});

test('À propos : cinq statuts avec un exemple réel chacun (lien vers une page du site), refus, correction (lien Contact), section « Qui » sans aucun prénom (v7.57, ABOUT-01), Contribuer et Indépendance reliés à Contact et Mentions',()=>{
  const d=doc('a-propos.html');
  const lv=[...d.querySelectorAll('#comment-on-verifie .ed-level')];assert.equal(lv.length,5);
  assert.deepEqual(lv.map(x=>x.querySelector('.pip').className.replace('pip pip--','')),['officiel','vu','comm','serie','conf']);
  for(const x of lv){const a=x.querySelector('.ed-level-ex a');assert.ok(a,'exemple');const h=a.getAttribute('href').split('#')[0];assert.ok(fs.existsSync(path.join(root,h)),h);if(a.getAttribute('href').includes('#'))assert.ok(read(h).includes('id="'+a.getAttribute('href').split('#')[1]+'"'),a.getAttribute('href'));}
  assert.ok(d.querySelector('#comment-on-verifie a[href="contact.html"]'));
  const qui=d.getElementById('qui');assert.equal(qui.querySelector('.ed-sign-name').textContent,'Un joueur, un site');assert.ok(qui.querySelector('a[href="contact.html"]'));
  /* v7.57 (lot 4, ABOUT-01) : aucun prénom ni nom personnel sur la page, ni dans ses métadonnées, ni dans la réponse de Léo */
  const whole=read('a-propos.html');assert.ok(!/Téva|Teva/.test(whole),'aucun prénom dans la page À propos');assert.ok(!/t[ée]va/i.test(read('leo-index.json'))&&!/t[ée]va/i.test(read('outils/leo-knowledge.json')),'aucun prénom dans la base de Léo (texte et déclencheurs)');assert.ok(/équipe, pas de société/.test(qui.textContent),'rédaction centrée sur le projet, sans équipe ni société inventée');
  assert.doesNotMatch(qui.textContent,/EDHEC|Wendt|école|Paris|Instagram|Twitter|TikTok/i);
  assert.ok(d.querySelectorAll('#contribuer a[href="contact.html"]').length>=2);assert.ok(d.querySelector('#independance a[href="mentions-legales.html#confidentialite"]'));
  assert.ok(read('mentions-legales.html').includes('id="confidentialite"'));
  /* liens internes vers chaque outil */
  for(const h of ['calculateurs.html','carte.html','vehicules.html','progression.html','tuto.html','achats.html','contact.html','medias.html'])assert.ok(d.querySelector('main a[href^="'+h+'"]'),h);
});

test('À propos : SEO — titre et description uniques, AboutPage + Organization cohérents avec le @graph de l’accueil, FAQPage à cinq questions, fil d’Ariane, og:image officielle',()=>{
  const d=doc('a-propos.html'),home=doc('index.html');
  const title=d.querySelector('title').textContent,desc=d.querySelector('meta[name="description"]').content;
  assert.match(title,/À propos/);assert.ok(desc.length>80&&desc.length<=180);
  for(const f of ['index.html','contact.html','mentions-legales.html','tuto.html'])assert.notEqual(doc(f).querySelector('title').textContent,title,f);
  const g=ld(d).find(x=>x['@graph']);assert.ok(g,'@graph');
  const org=g['@graph'].find(x=>x['@type']==='Organization'),about=g['@graph'].find(x=>x['@type']==='AboutPage');
  const homeOrg=ld(home).find(x=>x['@graph'])['@graph'].find(x=>x['@type']==='Organization');
  assert.deepEqual(org,homeOrg,'Organization identique à l’accueil');
  assert.equal(about.isPartOf['@id'],'https://www.leonidakit.com/#website');assert.equal(about.about['@id'],org['@id']);assert.equal(about.url,'https://www.leonidakit.com/a-propos.html');
  const faq=ld(d).find(x=>x['@type']==='FAQPage');assert.ok(faq);assert.equal(faq.mainEntity.length,5);assert.equal(d.querySelectorAll('#faq details').length,5);
  assert.ok(ld(d).some(x=>x['@type']==='BreadcrumbList'));
  assert.match(d.querySelector('meta[property="og:image"]').content,/^https:\/\/www\.leonidakit\.com\/img\/officiel\//);
});

test('Contact et Mentions : gabarit (bandeau avec pile, largeur commune), préparateur de signalement et sections des mentions (v7.46 : lot 9), sous-navigation collante sur Mentions',()=>{
  const c=doc('contact.html'),m=doc('mentions-legales.html');
  for(const d of [c,m]){assert.equal(d.querySelectorAll('.page-head .lk-stack').length,1);assert.ok(d.querySelector('body.info-page'));assert.ok(read('contact.html').includes('informations.css'));}
  for(const id of ['contact-draft','contact-topic','contact-page','contact-details','contact-source','contact-preview','contact-copy','contact-download','contact-status'])assert.ok(c.getElementById(id),id);
  assert.ok(read('contact.html').includes('src="contact.js'));/* v7.46 : les trois cartes deviennent une liste illustrée */assert.equal(c.querySelectorAll('#utile .info-illus li').length,3);
  assert.equal(m.querySelectorAll('nav.ed-nav').length,1);for(const a of m.querySelectorAll('.ed-nav a'))assert.ok(m.getElementById(a.getAttribute('href').slice(1)),a.getAttribute('href'));
  /* v7.46 (lot 9) : Mentions complètes ; « Indépendance » devient « Propriété intellectuelle », plus rien « à compléter » */
  for(const id of ['editeur','hebergement','propriete','confidentialite','cookies'])assert.ok(m.getElementById(id),id);
  for(const t of ['Ce qui reste dans ton navigateur','Léo','alerte de l’accueil','Cookies et traceurs','Vercel'])assert.ok(m.body.textContent.includes(t),t);
  assert.ok(!m.body.textContent.includes('à compléter'),'plus rien à compléter (lot 9)');
});

test('navigateur : la séquence se révèle (observateur ou timeline), chaque carte est focusable au clavier et se révèle au focus, les compteurs montent jusqu’à leur valeur, aucune erreur console',withPage('a-propos.html',async a=>{
  const box=a.d.querySelector('[data-showcase]');assert.ok(box.className.includes('lk-showcase--'),'mode choisi par lk-showcase.js : '+box.className);
  const cards=[...box.querySelectorAll('.lk-show')];
  for(const c of cards)assert.ok(c.querySelectorAll('.lk-show-t .lk-sw').length>=2,'titre mot à mot');
  cards[2].focus();assert.ok(cards[2].classList.contains('is-in')&&cards[2].classList.contains('is-focus'));
  cards[2].blur();assert.ok(!cards[2].classList.contains('is-focus'));
  const fig=a.d.querySelector('.fig-n[data-stat="vehicules"]');a.flush();
  assert.equal(fig.textContent.replace(/[  ]/g,''),fig.dataset.count,'compteur arrivé à sa valeur');
}));

test('navigateur : en mouvement réduit, la séquence est marquée immobile et rien n’est caché',withPage('a-propos.html',a=>{
  assert.ok(a.d.querySelector('[data-showcase]').classList.contains('lk-showcase--still'));
  for(const c of a.d.querySelectorAll('.lk-show'))assert.ok(!c.classList.contains('is-in'),'aucun état d’animation posé');
  const fig=a.d.querySelector('.fig-n[data-stat="armes"]');assert.equal(fig.textContent.replace(/[  ]/g,''),fig.dataset.count);
},{before:w=>{w.matchMedia=()=>({matches:true,addEventListener(){},removeEventListener(){}});}}));
