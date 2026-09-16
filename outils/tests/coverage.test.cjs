/* Broad structural and startup checks; jsdom does not measure visual layout. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm');
const {JSDOM}=require('jsdom'),{load}=require('./runtime-helper.cjs');
const root=process.env.SITE_ROOT||path.resolve(__dirname,'../..');
const pages=[...fs.readdirSync(root).filter(f=>f.endsWith('.html')),...['vehicules','armes','lieux','personnages','entreprises','demeures','planques'].flatMap(dir=>fs.readdirSync(path.join(root,dir)).filter(f=>f.endsWith('.html')).map(f=>dir+'/'+f))];
const ctx={window:{}};for(const file of ['vehicules-data.js','armes-data.js','carte-gtadb.js','search-index.js','assets-manifest.js','progression-data.js'])vm.runInNewContext(fs.readFileSync(path.join(root,file),'utf8'),ctx);
const docs=new Map();const errors=[];
function checkUrl(url,file){if(!url)return;const u=new URL(url,'https://www.leonidakit.com/'+file);if(u.origin!=='https://www.leonidakit.com')return;const rel=decodeURIComponent(u.pathname.slice(1))||'index.html';assert.ok(fs.existsSync(path.join(root,rel)),file+' → '+rel);if(!u.hash)return;if(u.hash.startsWith('#lieu='))assert.ok(ctx.window.LK_PROGRESS_IDS.lieux.includes(u.hash.slice(6)),file+' → '+u.hash);else if(!u.hash.includes('=')&&rel.endsWith('.html')){const d=docs.get(rel);if(d&&!d.getElementById(u.hash.slice(1))){const cat=u.hash.slice(1);assert.ok((rel==='vehicules.html'&&Object.hasOwn(ctx.window.LK_VEHICULES_CATS,cat))||(rel==='armes.html'&&Object.hasOwn(ctx.window.LK_ARMES_CATS,cat)),file+' → '+rel+u.hash);}}}
test('Every public page has valid local references, IDs, metadata and CSP-compatible scripts',()=>{
 for(const file of pages)docs.set(file,new JSDOM(fs.readFileSync(path.join(root,file),'utf8')).window.document);
 try{for(const [file,d] of docs){if(file.startsWith('google'))continue;try{
  const ids=[...d.querySelectorAll('[id]')].map(n=>n.id);assert.equal(new Set(ids).size,ids.length,'duplicate DOM id');
  assert.ok(d.querySelector('meta[name=viewport]'),'viewport');assert.equal(d.querySelectorAll('a button,a input,a select').length,0,'nested interactive element');
  for(const n of d.querySelectorAll('*'))for(const a of n.attributes)assert.ok(!/^on/i.test(a.name),'inline event handler');
  for(const n of d.querySelectorAll('script')){if(n.src)checkUrl(n.getAttribute('src'),file);else {assert.equal(n.type,'application/ld+json','executable inline script');JSON.parse(n.textContent);}}
  for(const n of d.querySelectorAll('a[href],link[href],img[src],meta[property="og:image"]'))checkUrl(n.getAttribute('href')||n.getAttribute('src')||n.getAttribute('content'),file);
  for(const n of d.querySelectorAll('img'))assert.ok(n.hasAttribute('alt'),'image alt');
  if(!d.querySelector('meta[http-equiv=refresh]')){assert.equal(d.querySelectorAll('h1').length,1,'single h1');assert.ok(d.title,'title');assert.ok(d.querySelector('meta[name=description]'),'description');}
  if(file!=='404.html')assert.ok(d.querySelector('link[rel=canonical]'),'canonical');
 }catch(e){errors.push(file+': '+e.message);}}assert.deepEqual(errors,[]);}finally{for(const d of docs.values())d.defaultView.close();docs.clear();}
});
test('All public pages start without JavaScript errors or absent dynamic resources',async()=>{
 const failures=[];for(const file of pages){const a=await load(root,file);try{for(const e of a.errors)failures.push(file+': '+e);for(const url of a.requests)checkUrl(url,file);}finally{a.close();}}assert.deepEqual(failures,[]);
});
test('Data, search and sitemap only reference valid unique current entities',()=>{
 for(const [type,list]of [['vehicules',ctx.window.LK_VEHICULES],['armes',ctx.window.LK_ARMES]]){assert.equal(new Set(list.map(x=>x.id)).size,list.length);for(const x of list)checkUrl('/'+type+'/'+x.id+'.html','index.html');}
 const entries=ctx.window.LK_INDEX;assert.equal(new Set(entries.map(x=>x.u)).size,entries.length);for(const e of entries)checkUrl(e.u,'index.html');
 const map=ctx.window.LK_GTADB;for(const p of [...map.groupes,...map.lieux,...Object.values(map.enrichit)])for(const k of ['img','img2'])if(p[k])checkUrl(p[k],'carte.html');
 for(const file of ['sitemap.xml','sitemap-fiches.xml']){const dom=new JSDOM(fs.readFileSync(path.join(root,file),'utf8'),{contentType:'application/xml'});try{const locs=[...dom.window.document.querySelectorAll('loc')].map(n=>n.textContent);assert.equal(new Set(locs).size,locs.length);for(const u of locs){checkUrl(u,file);const html=fs.readFileSync(path.join(root,new URL(u).pathname==='/'?'index.html':new URL(u).pathname),'utf8');assert.doesNotMatch(html,/name="robots" content="[^"]*noindex/);}}finally{dom.window.close();}}
});
