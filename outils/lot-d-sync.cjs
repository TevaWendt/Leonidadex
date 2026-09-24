#!/usr/bin/env node
'use strict';
// À exécuter après les générateurs : navigation partagée, index, médias réellement livrés et versions.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8'),write=(f,s)=>fs.writeFileSync(path.join(root,f),s);
const walk=d=>fs.readdirSync(path.join(root,d),{withFileTypes:true}).flatMap(x=>x.isDirectory()?(['node_modules','.git','outils'].includes(x.name)?[]:walk(path.join(d,x.name))):[path.join(d,x.name)]);
const files=walk(''),pages=files.filter(f=>f.endsWith('.html'));
function chrome(s){
 s=s.replace(/<header>[\s\S]*?<\/header>/,h=>{
  if(!h.includes('tuto.html'))h=h.replace(/(<li><a\b[^>]*href="((?:\.\.\/|\/)?)calculateurs\.html"[^>]*>Calculateur<\/a><\/li>)/,'$1\n        <li><a href="$2tuto.html">Tuto</a></li>');
  return h.replace(/(<a\b[^>]*class="here")([^>]*>)/g,(m,a,b)=>b.includes('aria-current')?m:a+' aria-current="page"'+b);
 });
 s=s.replace(/<footer>[\s\S]*?<\/footer>/,f=>{
  if(!f.includes('tuto.html'))f=f.replace(/(<a href="((?:\.\.\/|\/)?)calculateurs\.html"[^>]*>Calculateur<\/a>)/,'$1<a href="$2tuto.html">Tuto</a>');
  if(!f.includes('bateaux.html'))f=f.replace(/(<a href="((?:\.\.\/|\/)?)planques\.html"[^>]*>Planques<\/a>)/,'$1<a href="$2bateaux.html">Bateaux</a><a href="$2style.html">Vêtements et style</a><a href="$2personnalisations.html">Personnalisations</a>');
  return f;
 });return s;
}
for(const file of pages)write(file,chrome(read(file)));
const ctx={window:{}};vm.runInNewContext(read('search-index.js'),ctx);
let index=ctx.window.LK_INDEX;
if(fs.existsSync(path.join(__dirname,'acquisitions-index.json')))index=index.concat(JSON.parse(fs.readFileSync(path.join(__dirname,'acquisitions-index.json'),'utf8')));
if(fs.existsSync(path.join(root,'tuto.html')))index.push({l:'Tuto : utiliser le calculateur',k:'Aide',u:'/tuto.html',s:'tuto aide calculateur simple expert objectif activites achats temps carnets mon plan progression'});
index=[...new Map(index.map(x=>[x.u,x])).values()];write('search-index.js','/* Generated from current data. */\nwindow.LK_INDEX = '+JSON.stringify(index)+';\n');
const assets=files.filter(x=>x.startsWith('img/')).map(x=>'/'+x.replaceAll('\\','/')).sort();if(fs.existsSync(path.join(root,'credits-reels.json')))assets.push('/credits-reels.json');
write('assets-manifest.js','/* Generated from the files actually shipped. */\nwindow.LK_ASSETS = '+JSON.stringify(assets)+';\n');
let sitemap=read('sitemap.xml');for(const file of ['bateaux.html','style.html','personnalisations.html','tuto.html'])if(fs.existsSync(path.join(root,file))&&!sitemap.includes('https://www.leonidakit.com/'+file+'<'))sitemap=sitemap.replace('</urlset>','  <url><loc>https://www.leonidakit.com/'+file+'</loc></url>\n</urlset>');write('sitemap.xml',sitemap);
const hashes=new Map();
for(const file of pages){let s=read(file);s=s.replace(/((?:href|src)=")([^"?#]+\.(?:css|js))(?:\?v=[^"#]*)?("[^>]*>)/g,(m,a,url,end)=>{if(/^(?:https?:)?\/\//.test(url))return m;const f=url.startsWith('/')?path.join(root,url.slice(1)):path.resolve(root,path.dirname(file),url);if(!fs.existsSync(f))return m;if(!hashes.has(f))hashes.set(f,crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex').slice(0,12));return a+url+'?v='+hashes.get(f)+end;});write(file,s);}
console.log(`Navigation et versions synchronisées : ${pages.length} pages, ${assets.length} médias.`);
