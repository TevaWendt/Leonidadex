const fs=require('fs');
process.chdir(__dirname);
const V=JSON.parse(fs.readFileSync('v-corrige.json','utf8'));
const P=[]; const add=(g,d)=>P.push({g,d});
const NEG="(?:aucun\\w*|non|jamais|pas|ne l'a pas|n'a pas|n'est pas|rien)";
const contreditVu=t=>new RegExp(NEG+"[^.]{0,60}(support|trailer|capture|officiel|confirm|montr\u00e9)","i").test(t);
const nieApparition=t=>/(rien ne l.atteste|rien de tel n.a encore été diffusé|rockstar n.a rien publié|n.est.{0,45}(attestée?|apparue?).{0,25}aucun visuel|aucun visuel de Rockstar ne|aucune image diffusée ne l.a|rockstar ne l.a pas encore fait apparaître|absent de tout ce que Rockstar a diffusé)/i.test(t);
const affirmeVu=t=>/(apparaît|est visible|figure|se repère|on (le|la) (voit|retrouve)|présent sur|passe à l'image|traverse plusieurs plans)[^.]{0,60}(trailer|capture|support|image)/i.test(t);
const NOMME=['Premier trailer','Second trailer','Captures officielles','Extended Look','Artworks officiels','Édition Ultimate',"Visuel officiel de l'édition Ultimate","Page officielle de l'édition Ultimate"];
const SRCOFF=['Premier trailer','Second trailer','Captures officielles','Extended Look','Média officiel de Rockstar','Édition Ultimate',"Visuel officiel de l'édition Ultimate","Page officielle de l'édition Ultimate",'Artworks officiels'];

V.forEach(v=>{
  if(v.st==='comm'&&SRCOFF.includes(v.src)) add('statut',v.id+' : source officielle mais statut communautaire');
  if(v.st!=='comm'&&v.src==='Rapprochement de la communauté') add('statut',v.id+' : statut '+v.st+' sans source officielle');
  if(v.st!=='comm'&&!NOMME.includes(v.src)) add('statut',v.id+' : statut '+v.st+' sur une source non nommée (« '+v.src+' »)');
  if(v.st!=='comm'&&(nieApparition(v.txt)||(contreditVu(v.txt)&&!affirmeVu(v.txt)))) add('contradiction',v.id+' : statut '+v.st+', texte nie la confirmation');
  if(v.st==='comm'&&affirmeVu(v.txt)) add('contradiction',v.id+' : statut communautaire, texte affirme une apparition officielle');
  if(!v.insp&&!v.fam) add('champ',v.id+' : ni inspiration ni famille');
  if(!v.marque) add('champ',v.id+' : constructeur vide');
  if(!v.src) add('champ',v.id+' : source vide');
  if(!/[.!?]$/.test(v.txt.trim())) add('champ',v.id+' : texte sans ponctuation finale');
  ['nom','marque','insp','fam','src','txt'].forEach(k=>{
    if(v[k]&&/[—–]/.test(v[k])) add('typo',v.id+' : tiret long dans '+k);
    if(v[k]&&/\s{2,}/.test(v[k])) add('typo',v.id+' : double espace dans '+k);});
});
const nom={}; V.forEach(v=>{const k=((v.marque!=='Marque inconnue'?v.marque+' ':'')+v.nom).toLowerCase();(nom[k]=nom[k]||[]).push(v.id);});
Object.entries(nom).forEach(([k,i])=>{if(i.length>1)add('doublon','nom affiché identique : '+i.join(' + '))});
const ids=new Set(); V.forEach(v=>{if(ids.has(v.id))add('doublon','identifiant en double : '+v.id);ids.add(v.id);});
const ph={}; V.forEach(v=>v.txt.split(/(?<=[.!?])\s+/).forEach(p=>{const n=p.trim().toLowerCase();
  if(n.length>45)(ph[n]=ph[n]||[]).push(v.id);}));
Object.entries(ph).forEach(([p,i])=>{if(i.length>1)add('répétition',i.length+' fiches : « '+p.slice(0,60)+'… » ['+i.join(', ')+']')});

const g={}; P.forEach(p=>(g[p.g]=g[p.g]||[]).push(p.d));
console.log('AUDIT FINAL — '+V.length+' véhicules\n');
['statut','contradiction','champ','doublon','répétition','typo'].forEach(k=>{
  const n=g[k]?g[k].length:0;
  console.log((n?'✗ ':'✓ ')+k.padEnd(15)+' : '+n);
  if(g[k])g[k].forEach(d=>console.log('     '+d));
});
const L=V.map(v=>v.txt.length);
console.log('\nlongueur des textes : min '+Math.min(...L)+' · moyenne '+Math.round(L.reduce((a,b)=>a+b)/L.length)+' · max '+Math.max(...L));
const st={};V.forEach(v=>st[v.st]=(st[v.st]||0)+1);
console.log('statuts : '+Object.entries(st).map(([k,n])=>k+' '+n).join(' · '));

if(P.length)process.exitCode=1;
