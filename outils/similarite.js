/* Mesure la similarité entre fiches. À relancer après chaque ajout de véhicules.
   Usage : node outils/similarite.js   (depuis la racine du dépôt) */
const fs=require('fs');
process.chdir(require('path').join(__dirname,'..'));
const fichiers=fs.readdirSync('vehicules').filter(f=>f.endsWith('.html'));
const mots=f=>{let s=fs.readFileSync('vehicules/'+f,'utf8');
 s=s.replace(/<script[\s\S]*?<\/script>/g,' ').replace(/<style[\s\S]*?<\/style>/g,' ')
    .replace(/<[^>]+>/g,' ').replace(/&[a-z#0-9]+;/g,' ').toLowerCase();
 return s.match(/[\wàâäéèêëîïôöùûüç'-]+/g)||[];};
const S={};
fichiers.forEach(f=>{const w=mots(f),s=new Set();
 for(let i=0;i+8<=w.length;i++)s.add(w.slice(i,i+8).join(' '));
 if(s.size>50)S[f]=s;});
const ids=Object.keys(S),mx=[];
ids.forEach(a=>{let best=0,qui='';
 ids.forEach(b=>{if(a===b)return;let inter=0;S[a].forEach(g=>{if(S[b].has(g))inter++;});
  const j=inter/(S[a].size+S[b].size-inter); if(j>best){best=j;qui=b;}});
 mx.push([best,a,qui]);});
mx.sort((x,y)=>y[0]-x[0]);
const med=mx[Math.floor(mx.length/2)][0];
console.log('SIMILARITÉ ENTRE FICHES — '+ids.length+' pages');
console.log('  médiane du plus proche voisin : '+(med*100).toFixed(0)+'%');
console.log('  pire cas                      : '+(mx[0][0]*100).toFixed(0)+'%');
console.log('  seuil de vigilance            : 60% (au-delà, deux fiches se ressemblent trop)');
console.log('\n  les 8 paires les plus proches :');
mx.slice(0,8).forEach(([j,a,b])=>console.log('   '+(j*100).toFixed(0)+'%  '+a.replace('.html','')+'  ~  '+b.replace('.html','')));
