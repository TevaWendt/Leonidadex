/* Vérifie que tous les liens internes, images, scripts et feuilles de style des pages HTML
   pointent vers des fichiers existants. Usage : node outils/verifier.js (depuis la racine). */
const fs=require('fs'),path=require('path');
process.chdir(path.join(__dirname,'..'));
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(x=>x.isDirectory()?(['outils','node_modules','.git'].includes(x.name)?[]:walk(path.join(d,x.name))):[path.join(d,x.name)]);
const pages=walk('.').filter(f=>f.endsWith('.html'));
let bad=0,checked=0;
for(const f of pages){
  const s=fs.readFileSync(f,'utf8');
  const refs=[...s.matchAll(/(?:href|src)="([^"#?]+)(?:[#?][^"]*)?"/g)].map(m=>m[1]);
  for(const r of refs){
    if(/^(https?:|mailto:|tel:|data:|\/\/)/.test(r)||r==='/'||!/[./]/.test(r))continue; /* liens externes, racine, jetons de gabarit */
    const target=r.startsWith('/')?r.slice(1):path.join(path.dirname(f),r);
    checked++;
    if(!fs.existsSync(target)){bad++;console.log('CASSÉ  '+f+'  ->  '+r);}
  }
}
console.log((bad?bad+' référence(s) cassée(s)':'Aucune référence cassée')+' sur '+checked+' vérifiées dans '+pages.length+' pages.');
process.exit(bad?1:0);
