/* Static local preview with a real 404 and the deployment headers. */
const http=require('http'),fs=require('fs'),path=require('path');const root=path.resolve(__dirname,'../dist');
if(!fs.existsSync(root)){console.error('Lance npm run build avant npm run serve.');process.exit(1);}
const config=require('../vercel.json'),types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.xml':'application/xml','.txt':'text/plain; charset=utf-8','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml'};
http.createServer((req,res)=>{let u;try{u=new URL(req.url,'http://localhost');u.pathname=decodeURIComponent(u.pathname);}catch{res.writeHead(400);res.end();return;}
 for(const rule of config.headers)if(u.pathname.startsWith(rule.source.replace('(.*)','')))for(const h of rule.headers)res.setHeader(h.key,h.value);
 const red=config.redirects.find(r=>r.source===u.pathname);if(red){res.writeHead(308,{Location:red.destination+u.search});res.end();return;}
 const p=path.resolve(root,'.'+u.pathname+(u.pathname.endsWith('/')?'index.html':''));if(!p.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
 const found=fs.existsSync(p)&&fs.statSync(p).isFile();const file=found?p:path.join(root,'404.html');res.writeHead(found?200:404,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});if(req.method==='HEAD'){res.end();return;}fs.createReadStream(file).pipe(res);
}).listen(8766,'0.0.0.0',()=>console.log('Aperçu : http://localhost:8766'));
