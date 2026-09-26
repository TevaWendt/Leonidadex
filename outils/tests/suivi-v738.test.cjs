/* v7.38 : suivi générique par famille (suivi.js), cartes de la page Progression avec listes dépliables,
   familles équipements / munitions dans progression-core (compte, export, import). */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm');
const {load}=require('./runtime-helper.cjs');const root=process.env.SITE_ROOT||path.resolve(__dirname,'../..');
const withPage=(file,fn,opts={})=>async()=>{const a=await load(root,file,opts);try{await fn(a);assert.deepEqual(a.errors.filter(x=>!x.includes('Not implemented: navigation')),[]);}finally{a.close();}};
const data={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'progression-data.js'),'utf8'),data);
const IDS=data.window.LK_PROGRESS_IDS,NAMES=data.window.LK_PROGRESS_NAMES;

test('progression-data.js : familles équipements et munitions lues dans armes.html, noms pour chaque famille',()=>{
  assert.equal(IDS.equipements.length,16);assert.equal(IDS.munitions.length,5);
  const html=fs.readFileSync(path.join(root,'armes.html'),'utf8');
  for(const id of IDS.equipements)assert.ok(html.includes('data-track="equipements" data-track-id="'+id+'"'),id);
  assert.equal(Object.keys(NAMES.vehicules).length,IDS.vehicules.length);assert.equal(Object.keys(NAMES.armes).length,IDS.armes.length);
  assert.ok(NAMES.vehicules['albany-emperor'].u.endsWith('vehicules/albany-emperor.html'));assert.ok(NAMES.equipements['cle-usb'].n);
});

test('Armurerie : bouton « Je l’ai » sur chaque équipement, barre synchronisée, clé lk_own_equipements',withPage('armes.html',a=>{
  const items=a.d.querySelectorAll('[data-track="equipements"] .track-bt');assert.equal(items.length,16);
  items[0].click();items[1].click();
  assert.equal(a.d.querySelector('[data-track-bar="equipements"] b').textContent,'2');
  assert.equal(a.d.querySelector('[data-track-bar="equipements"] progress').value,2);
  assert.deepEqual(JSON.parse(a.w.localStorage.getItem('lk_own_equipements')),{[items[0].dataset.trackFor]:1,[items[1].dataset.trackFor]:1});
  items[0].click();assert.equal(a.d.querySelector('[data-track-bar="equipements"] b').textContent,'1');
  assert.ok(a.d.querySelector('#own-bar a.own-link[href="progression.html#arsenal"]'));
}));

test('Progression : huit cartes alignées, liste du garage avec noms, catégories, liens et retrait',withPage('progression.html',a=>{
  const cards=[...a.d.querySelectorAll('.suivi-card')];assert.equal(cards.length,8);
  for(const c of cards){assert.ok(c.querySelector('h3'));assert.ok(c.querySelector('.suivi-n'));assert.ok(c.querySelector('progress, .suivi-spacer'));assert.ok(c.querySelector('.suivi-links a'));}
  const veh=a.d.getElementById('progress-vehicules');
  assert.match(veh.querySelector('.suivi-n').textContent,/^2 \/ /);
  assert.match(a.d.getElementById('suivi-equipements').querySelector('.suivi-n').textContent,/^1 \/ 16$/);
  veh.querySelector('.suivi-toggle').click();
  const list=a.d.getElementById('suivi-list-vehicules');assert.equal(list.hidden,false);
  const links=[...list.querySelectorAll('a')].map(x=>x.getAttribute('href'));
  assert.deepEqual(links.sort(),['vehicules/albany-emperor.html','vehicules/vapid-dominator.html']);
  assert.ok(list.textContent.includes('Berlines'));
  list.querySelector('[data-suivi-remove="albany-emperor"]').click();
  assert.match(veh.querySelector('.suivi-n').textContent,/^1 \/ /);
  assert.deepEqual(JSON.parse(a.w.localStorage.getItem('lk_own_vehicules')),{'vapid-dominator':1});
  assert.match(a.d.getElementById('progress-global-text').textContent,/^3 cochés sur/);
},{storage:{lk_own_vehicules:'{"albany-emperor":1,"vapid-dominator":1}',lk_own_equipements:'{"cle-usb":1}'}}));

test('progression-core : export et import transportent les nouvelles familles, le total les compte',()=>{
  const P=require(path.join(root,'progression-core.js'));
  const mem=new Map();const storage={get length(){return mem.size;},key:i=>[...mem.keys()][i],getItem:k=>mem.has(k)?mem.get(k):null,setItem:(k,v)=>mem.set(k,String(v)),removeItem:k=>mem.delete(k)};
  const store=P.create({storage,acquisitions:{categories:[],items:[]},ids:IDS,collectibles:[]});
  assert.ok(store.toggle('cle-usb',true));assert.ok(store.toggle('harpons',true));
  const s=store.summary();
  assert.equal(s.groups.find(g=>g.id==='equipements').done,1);assert.equal(s.groups.find(g=>g.id==='munitions').total,5);
  assert.equal(s.total,IDS.vehicules.length+IDS.armes.length+new Set(IDS.lieux).size+16+5);
  const out=store.exportData();assert.equal(out.data.lk_own_equipements,'{"cle-usb":true}');assert.equal(out.data.lk_own_munitions,'{"harpons":true}');
  mem.clear();
  const plan=store.prepareImport(JSON.stringify(out));assert.deepEqual(plan.issues,[]);store.applyImport(plan,'merge');
  assert.equal(store.summary().done,2);
});
