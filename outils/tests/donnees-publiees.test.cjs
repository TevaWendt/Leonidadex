'use strict';
/* Check ultime du calculateur (v7.59) — CALC-13 à CALC-16 : le schéma unique d'une valeur publiée, lu partout de la même façon
   (calculateurs-data.js à l'exécution, calculateurs-modele.js pour les fiches, outils/donnees-publiees.cjs pour les générateurs),
   les phrases d'absence reliées aux données, les garde-fous sur une valeur mal formée, l'inventaire des phrases figées. */
const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..');
const DP=require(path.join(root,'outils/donnees-publiees.cjs')),M=require(path.join(root,'calculateurs-modele.js'));
const dataCtx=()=>{const c={window:{}};vm.createContext(c);vm.runInContext(fs.readFileSync(path.join(root,'calculateurs-data.js'),'utf8'),c);return c.window;};
const SAMPLES=[
 [35000,{data:'unverified',model:'estimated'}],
 [{value:35000,status:'official',source:'https://www.rockstargames.com/x',verifiedAt:'2026-11-20',unit:'$'},{data:'official',model:'official'}],
 [{value:35000,status:'verified',source:'relevé',verifiedAt:'2026-11-20'},{data:'verified',model:'measured'}],
 [{value:35000,status:'estimated'},{data:'estimated',model:'estimated'}],
 [{value:35000,status:'manual'},{data:'manual',model:'personal'}],
 [{value:35000,status:'unknown'},{data:'unknown',model:'unknown'}],
 [null,{data:'unknown',model:'unknown'}],
 [{value:-5,status:'official'},{data:'unknown',model:'unknown'}],
 [{value:'abc',status:'official'},{data:'unknown',model:'unknown'}],
];
test('CALC-13 : le même prix (nombre nu ou {value,status,source,verifiedAt,unit}) donne le même statut dans calculateurs-data.js, calculateurs-modele.js et donnees-publiees.cjs',()=>{
 const w=dataCtx();
 for(const [raw,exp] of SAMPLES){
  const entry={id:'x-1',nom:'X',cat:'berline',price:raw};
  const row=w.LKCalcData.catalogue.call(null)?null:null; /* catalogue() lit window.LK_VEHICULES : on passe par normalize via un faux LK_VEHICULES */
  w.LK_VEHICULES=[entry];const cat=w.LKCalcData.catalogue();const it=cat.find(x=>x.id==='x-1');
  assert.ok(it,'fiche normalisée');
  const dataStatus=it.price===null?'unknown':it.fieldMeta.price.status;
  assert.equal(dataStatus,exp.data,'calculateurs-data '+JSON.stringify(raw));
  const mv=M.V.published(raw);assert.equal(mv.s,exp.model,'modèle '+JSON.stringify(raw));
  const dp=DP.prixDe(entry);if(exp.data==='unknown')assert.equal(dp,null,'donnees-publiees '+JSON.stringify(raw));else{assert.equal(dp.status,exp.data,'donnees-publiees statut');assert.equal(dp.value,it.price);}
  if(raw&&typeof raw==='object'&&raw.source&&exp.model!=='unknown'){assert.equal(mv.source,raw.source);assert.equal(it.fieldMeta.price.source,raw.source);assert.equal(dp.source,raw.source);assert.equal(mv.verifiedAt,raw.verifiedAt);assert.equal(it.fieldMeta.price.verifiedAt,raw.verifiedAt);assert.equal(dp.verifiedAt,raw.verifiedAt);}
 }});

test('CALC-13 : aujourd’hui, aucune valeur publiée : 0 prix, 0 activité, aucune erreur, et les phrases disent l’absence',()=>{
 const e=DP.etat(root);assert.equal(e.prix.connus,0);assert.equal(e.activites.completes,0);assert.deepEqual(e.errors,[]);assert.ok(e.prix.total>300);
 const ph=DP.phrases(e);assert.match(ph.prix,/n’a publié aucun prix/);assert.match(ph.activites,/aucun gain ni aucune durée/);assert.match(ph.faqExemples,/^Pas encore\./);assert.match(ph.prixMini,/pas encore connus/);assert.match(ph.faqApropos,/^Non\. Rockstar n’a publié aucun prix/);
 assert.ok(Object.values(e.catalogues).every(x=>x.connus===0&&x.total>0),'listes dépliables : colonne GTA VI vide');});

test('CALC-13 : les phrases changent d’elles-mêmes avec les données (1 et plusieurs prix, activités), sans faute d’accord',()=>{
 const base=DP.etat(root);
 const one={...base,prix:{...base.prix,connus:1,officiels:1,parType:{...base.prix.parType,vehicle:{...base.prix.parType.vehicle,connus:1,officiels:1}}}};
 const p1=DP.phrases(one);assert.match(p1.prix,/^Le site connaît 1 prix publié \(1 véhicule ; 1 prix officiel\) : le calculateur le propose/);assert.match(p1.prixMini,/^1 prix du jeu est déjà connu/);assert.match(p1.bientot,/^1 prix publié déjà/);
 const many={...one,prix:{...one.prix,connus:3,officiels:2,parType:{...one.prix.parType,weapon:{total:27,connus:2,officiels:1}}},activites:{...base.activites,completes:2,officielles:1}};
 const p3=DP.phrases(many);assert.match(p3.prix,/^Le site connaît 3 prix publiés \(1 véhicule, 2 armes ; 2 prix officiels\) : le calculateur les propose comme prix de référence, avec leur source/);assert.match(p3.prixMini,/^3 prix du jeu sont déjà connus/);
 assert.match(p3.activites,/^Le site connaît 2 activités avec un gain et une durée publiés \(dont 1 activité officielle\)/);assert.match(p3.faqExemples,/^En partie\. Le site connaît 3 prix publiés et 2 activités chiffrées/);assert.match(p3.activitesTable,/^2 activités ont déjà/);
 assert.match(p3.prixAchats,/^3 prix publiés sur \d+ fiches, chacun avec sa source/);assert.match(p3.prixMaisonsCommerces,/^Aucun prix de maison/);assert.match(p3.prixBateaux,/^1 prix publié sur le site, avec sa source ; aucune concession/);
 const cat={...base,catalogues:{...base.catalogues,consommables:{total:30,connus:2}}};const pc=DP.phrases(cat);assert.match(pc.prixNourriture,/^2 prix GTA VI publiés dans la liste, avec source\.$/);assert.match(pc.etatConsommables,/^2 prix GTA VI publiés dans la liste, avec source\. La colonne GTA VI reste « à confirmer » sur les 28 autres lignes\.$/);assert.match(pc.faqApropos,/^En partie\. Le site connaît 2 prix GTA VI publiés/);
 for(const ph of [p1,p3,pc])for(const [k,v] of Object.entries(ph))assert.ok(!/\b\d+ (?:prix du jeus|activité chiffrées|activité officielles|activité ont)\b/.test(v),k+' : accord');});

test('CALC-15 : une valeur mal formée est refusée (statut inconnu, officiel sans source ou sans date, unité, bornes ; activité incomplète)',()=>{
 const p=(o)=>DP.verifierPrix(DP.prixDe({id:'x',price:o}),'test');
 assert.deepEqual(p({value:10,status:'estimated'}),[]);
 assert.match(p({value:10,status:'official'}).join(' '),/exige une source/);assert.match(p({value:10,status:'official',source:'s'}).join(' '),/exige une date/);
 assert.deepEqual(p({value:10,status:'official',source:'s',verifiedAt:'2026-11-20'}),[]);
 assert.match(p({value:10,status:'official',source:'s',verifiedAt:'2026-11-20',unit:'€'}).join(' '),/unité attendue/);assert.match(p({value:2e12,status:'estimated'}).join(' '),/1 000 milliards/);
 assert.equal(DP.prixDe({id:'x',price:{value:10,status:'bidule'}}).status,'unverified','statut inconnu → non confirmé (jamais officiel)');
 const a=o=>DP.verifierActivite(o,0).join(' | ');
 assert.equal(a({id:'a-1',name:'A',reward:100,duration:10,status:'estimated'}),'');
 assert.match(a({id:'A 1',name:'A',reward:100,duration:10,status:'estimated'}),/identifiant/);assert.match(a({id:'a-1',name:'A',reward:100,duration:10,status:'official'}),/exige une source/);
 assert.match(a({id:'a-1',name:'A',reward:100,status:'estimated'}),/reward et duration/);assert.match(a({id:'a-1',name:'A',reward:100,duration:0,status:'estimated'}),/duration/);assert.match(a({id:'a-1',name:'A',reward:100,duration:10,share:150,status:'estimated'}),/share/);assert.match(a({id:'a-1',name:'A',reward:100,duration:10,status:'vu'}),/status attendu/);});

test('CALC-13 : {donnees:clé} est remplacé par la phrase calculée ; une clé inconnue arrête la génération',()=>{
 const ph=DP.phrases(DP.etat(root));assert.equal(DP.remplir('A {donnees:prixCourt} B',ph),'A '+ph.prixCourt+' B');assert.equal(DP.remplir('rien',ph),'rien');assert.throws(()=>DP.remplir('{donnees:inconnu}',ph),/inconnu/);});

test('CALC-13 : chaque phrase d’absence des pages est bien celle calculée (data-lk-donnees, marqueurs), et aucun marqueur ne reste dans le site généré',()=>{
 const ph=DP.phrases(DP.etat(root));const norm=s=>s.replace(/ | /g,' ').replace(/&#x27;|&#39;/g,'’').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
 const typo=require(path.join(root,'outils/typographie.cjs'));
 let n=0;for(const f of ['calculateurs.html','index.html']){const html=fs.readFileSync(path.join(root,f),'utf8');for(const m of html.matchAll(/data-lk-donnees="([a-zA-Z]+)"[^>]*>([\s\S]*?)<\/(?:span|div|p)>/g)){n++;assert.ok(ph[m[1]],f+' : clé '+m[1]);assert.equal(norm(m[2]),norm(typo.html('<p>'+ph[m[1]]+'</p>').replace(/<\/?p>/g,'')),f+' : '+m[1]);}}
 assert.ok(n>=4,'au moins quatre phrases reliées');
 const files=[...fs.readdirSync(root).filter(x=>/\.(html|js|json)$/.test(x)),...['armes','vehicules','lieux','entreprises','demeures','planques','gangs','carnets','leo','missions'/* section missions */,'activites'/* section activites */,'radios'/* section radios */,'animaux'/* section animaux */].flatMap(d=>fs.existsSync(path.join(root,d))?fs.readdirSync(path.join(root,d)).map(x=>d+'/'+x):[])].filter(x=>/\.(html|js|json)$/.test(x));
 for(const f of files){const c=fs.readFileSync(path.join(root,f),'utf8');assert.ok(!c.includes('{donnees:'),f+' : marqueur {donnees:…} resté dans un fichier généré');}
 /* la page Achats et la FAQ À propos reflètent bien la phrase calculée */
 const ach=norm(fs.readFileSync(path.join(root,'achats.html'),'utf8')),apr=norm(fs.readFileSync(path.join(root,'a-propos.html'),'utf8'));
 assert.ok(ach.includes(norm(ph.prixAchats)),'achats.html : FAQ « Pourquoi il n’y a aucun prix ? »');assert.ok(apr.includes(norm(ph.faqApropos)),'a-propos.html : FAQ prix');});

test('CALC-16 : l’inventaire des phrases d’absence (--absences) distingue les phrases mécaniques des phrases figées à relire',()=>{
 const list=DP.absences(root);assert.ok(list.length>30);const mech=list.filter(x=>x.etat==='mécanique'),fixed=list.filter(x=>x.etat!=='mécanique');
 assert.ok(mech.some(x=>x.file==='calculateurs.html'||x.file==='index.html'),'les data-lk-donnees sont comptés mécaniques');
 assert.ok(mech.some(x=>x.file==='outils/leo-knowledge.json'),'les sujets Léo « absence » sont comptés mécaniques');
 assert.ok(fixed.every(x=>!/\{donnees:/.test(x.texte)),'un marqueur est toujours mécanique');
 for(const x of list){assert.ok(fs.existsSync(path.join(root,x.file)),x.file);assert.ok(x.line>0);}});

test('CALC-13 : fiche documentaire — un prix publié s’affiche avec son statut, sa source (lien) et sa date ; sans prix, « Prix à venir »',()=>{
 const FD=require(path.join(root,'outils/fiche-doc.cjs'));
 const known=M.fromVehicle({id:'x',cat:'berline',price:{value:35000,status:'official',source:'https://www.rockstargames.com/x/',verifiedAt:'2026-12-03'}});
 const sp=h=>h.replace(/[\u00a0\u202f]/g,' ');const h=sp(FD.render('vehicle',known,{level:3}));assert.match(h,/<dt>Prix<\/dt><dd><span class="doc-v">35 000 \$<\/span><span class="doc-st">Officiel<\/span><small class="doc-ctx doc-prov">Source : <a href="https:\/\/www\.rockstargames\.com\/x\/" target="_blank" rel="noopener nofollow">rockstargames\.com\/x<\/a> · vérifié le 3 décembre 2026<\/small>/);
 const h2=FD.render('vehicle',M.fromVehicle({id:'y',cat:'berline'}),{level:3});assert.match(h2,/<dt>Prix<\/dt><dd><span class="doc-v">Prix à venir<\/span>/);
 const h3=sp(FD.render('weapon',M.fromWeapon({id:'z',cat:'pistolet',price:1200}),{level:3}));assert.match(h3,/<span class="doc-v">1 200 \$<\/span><span class="doc-st">Estimé<\/span><small class="doc-ctx">Statut non précisé dans la source/,'nombre nu : jamais officiel par défaut');});
