/* Contrôles locaux sans dépendance : HTML, srcset, CSS, galeries, données et sitemaps.
   Ce contrôle ne teste ni les URL externes, ni le rendu, ni la véracité des contenus. */
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.resolve(__dirname,'..');process.chdir(root);
const origin='https://www.leonidakit.com';
const excluded=new Set(['outils','node_modules','.git']);
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(x=>x.isDirectory()?(excluded.has(x.name)?[]:walk(path.join(d,x.name))):[path.join(d,x.name)]);
const files=walk('.'),pages=files.filter(f=>f.endsWith('.html'));
const errors=new Set(),documents=new Map();let checked=0;
const decode=s=>String(s||'').replace(/&(?:amp|quot|apos|lt|gt|#39);/g,m=>({'&amp;':'&','&quot;':'"','&apos;':"'",'&#39;':"'",'&lt;':'<','&gt;':'>'}[m]));
const attr=(s,key)=>{const m=s.match(new RegExp('(?:^|\\s)'+key+'\\s*=\\s*(["\\\'])([\\s\\S]*?)\\1','i'));return m?decode(m[2]):null;};
const bad=(file,message)=>errors.add(file+' → '+message);
function reference(raw,file,kind='lien'){
  if(!raw||/^(data:|blob:|mailto:|tel:)/i.test(raw))return;
  let u;try{u=new URL(decode(raw),origin+'/'+file);}catch{bad(file,kind+' invalide : '+raw);return;}
  if(u.origin!==origin)return;
  checked++;let rel;try{rel=decodeURIComponent(u.pathname).replace(/^\/+/, '')||'index.html';}catch{bad(file,'URL mal encodée : '+raw);return;}
  let target=path.resolve(root,rel);if(!target.startsWith(root+path.sep)&&target!==root){bad(file,'chemin hors dépôt : '+raw);return;}
  if(fs.existsSync(target)&&fs.statSync(target).isDirectory())target=path.join(target,'index.html');
  if(!fs.existsSync(target)){bad(file,kind+' absent : '+raw);return;}
  if(/\.(?:webp|png|jpe?g|avif|gif|svg)$/i.test(target)&&fs.statSync(target).size===0){bad(file,kind+' vide : '+raw);return;}
  return {u,target,rel:path.relative(root,target).split(path.sep).join('/')};
}
for(const file of pages){
  const text=fs.readFileSync(file,'utf8'),ids=new Set();
  for(const m of text.matchAll(/\sid\s*=\s*(["'])(.*?)\1/g)){if(ids.has(m[2]))bad(file,'id dupliqué : '+m[2]);ids.add(m[2]);}
  documents.set(file,{text,ids});
}
for(const [file,{text}] of documents){
  for(const match of text.matchAll(/<(?:a|link|script|img|source|video|audio|iframe)\b[^>]*>/gi)){
    const tag=match[0];
    for(const key of ['href','src','poster']){const value=attr(tag,key);if(value)reference(value,file,key);}
    const srcset=attr(tag,'srcset');
    /* les photos de la carte gardent la virgule de leur nom (L172,ig.webp) : les candidats d'un srcset sont séparés par « virgule + espace » */
    if(srcset&&!srcset.startsWith('data:'))for(const item of srcset.split(/,\s+/))reference(item.trim().split(/\s+/)[0],file,'srcset');
    if(/^<img\b/i.test(tag)&&attr(tag,'alt')===null)bad(file,'image sans alt');
  }
  for(const m of text.matchAll(/<meta\b[^>]*>/gi)){
    const property=attr(m[0],'property')||attr(m[0],'name');
    if(['og:image','twitter:image'].includes(property))reference(attr(m[0],'content'),file,property);
  }
  for(const m of text.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){
    try{JSON.parse(m[1]);}catch(e){bad(file,'JSON-LD invalide : '+e.message);}
  }
  for(const m of text.matchAll(/<[^>]*\bdata-medias=["'][^>]*>/gi)){
    try{const medias=JSON.parse(attr(m[0],'data-medias'));for(const media of medias)for(const key of ['s','l'])if(media[key])reference(media[key],file,'galerie '+key);}catch(e){bad(file,'galerie invalide : '+e.message);}
  }
  if(file.startsWith('google'))continue;
  if(!/<meta\b[^>]*name=["']viewport["']/i.test(text))bad(file,'viewport absent');
  if(!/<title>[^<]+<\/title>/i.test(text))bad(file,'title absent');
  if(!/<meta\b[^>]*http-equiv=["']refresh["']/i.test(text)){
    if((text.match(/<h1\b/gi)||[]).length!==1)bad(file,'nombre de H1 différent de 1');
    if(!/<meta\b[^>]*name=["']description["']/i.test(text))bad(file,'description absente');
  }
  if(file!=='404.html'&&!/<link\b[^>]*rel=["']canonical["']/i.test(text))bad(file,'canonical absent');
}
for(const file of files.filter(f=>f.endsWith('.css'))){const css=fs.readFileSync(file,'utf8');for(const m of css.matchAll(/url\(\s*(["']?)(.*?)\1\s*\)/g))reference(m[2],file,'CSS');}
const data={window:{}};
for(const file of ['vehicules-data.js','armes-data.js','carte-gtadb.js','search-index.js','assets-manifest.js','progression-data.js']){
  try{vm.runInNewContext(fs.readFileSync(file,'utf8'),data,{timeout:3000});}catch(e){bad(file,'données invalides : '+e.message);}
}
for(const [type,items] of [['vehicules',data.window.LK_VEHICULES],['armes',data.window.LK_ARMES]]){
  const ids=new Set();for(const item of items||[]){if(ids.has(item.id))bad(type+'-data.js','identifiant dupliqué : '+item.id);ids.add(item.id);reference('/'+type+'/'+item.id+'.html',type+'-data.js','fiche');}
}
for(const item of data.window.LK_ASSETS||[])reference(item,'assets-manifest.js','asset');
for(const item of data.window.LK_INDEX||[])reference(item.u,'search-index.js','résultat');
const map=data.window.LK_GTADB||{};
for(const item of [...(map.groupes||[]),...(map.lieux||[]),...Object.values(map.enrichit||{})])for(const key of ['img','img2'])if(item[key])reference(item[key],'carte.html','photo '+item.id);
const mapIds=new Set(data.window.LK_PROGRESS_IDS?.lieux||[]);
for(const [file,{text}] of documents)for(const m of text.matchAll(/<a\b[^>]*>/gi)){
  const raw=attr(m[0],'href');if(!raw)continue;let u;try{u=new URL(raw,origin+'/'+file);}catch{continue;}
  if(u.origin!==origin||!u.hash)continue;
  if(u.hash.startsWith('#lieu=')){if(!mapIds.has(decodeURIComponent(u.hash.slice(6))))bad(file,'lieu de carte absent : '+raw);continue;}
  if(u.hash.includes('='))continue;
  const rel=u.pathname.slice(1)||'index.html';let id;try{id=decodeURIComponent(u.hash.slice(1));}catch{continue;}
  const cats=rel==='vehicules.html'?data.window.LK_VEHICULES_CATS:rel==='armes.html'?data.window.LK_ARMES_CATS:null;
  if(documents.has(rel)&&!documents.get(rel).ids.has(id)&&!Object.hasOwn(cats||{},id))bad(file,'ancre absente : '+raw);
}
for(const file of ['sitemap.xml','sitemap-fiches.xml']){
  const urls=new Set();for(const m of fs.readFileSync(file,'utf8').matchAll(/<loc>(.*?)<\/loc>/g)){
    const raw=decode(m[1]);if(urls.has(raw))bad(file,'URL dupliquée : '+raw);urls.add(raw);
    const result=reference(raw,file,'URL sitemap');if(!result)continue;
    const html=documents.get(result.rel)?.text;if(html&&(/name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html)||/http-equiv=["']refresh/i.test(html)))bad(file,'page non indexable : '+raw);
  }
}
for(const error of errors)console.error('ERREUR '+error);
console.log(errors.size?errors.size+' erreur(s) sur '+checked+' références dans '+pages.length+' pages.':'Aucune erreur : '+checked+' références vérifiées dans '+pages.length+' pages (HTML, srcset, CSS, galeries, données et sitemaps).');
process.exitCode=errors.size?1:0;
