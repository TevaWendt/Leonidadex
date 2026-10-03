/* Léo v2 (lot 8) : compréhension locale du français approximatif. Normalisation, lexique (abréviations, SMS, anglais),
   lemmatisation légère par suffixes, distance de Damerau-Levenshtein, repères phonétiques et score BM25.
   Aucun appel réseau, aucune bibliothèque : tout tourne dans le navigateur (ou dans Node pour les tests). */
(function(root,factory){'use strict';if(typeof module==='object'&&module.exports)module.exports=factory();else root.LKLeoNLP=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const STOP=new Set(['le','la','les','l','un','une','des','de','du','d','et','a','au','aux','en','y','il','elle','ils','elles','on','je','j','tu','t','nous','vous','ce','c','cet','cette','ces','ca','sa','son','ses','mon','ma','mes','ton','ta','tes','leur','leurs','notre','nos','votre','vos','se','s','me','m','te','moi','toi','lui','eux','est','sont','ete','etre','suis','es','sera','seront','serait','etait','etaient','ai','as','avons','avez','ont','avoir','pour','par','sur','dans','avec','sans','pas','ne','n','non','oui','plus','moins','tres','bien','mal','que','qu','dont','si','donc','alors','mais','car','comme','aussi','encore','deja','ici','la','peut','peux','peuvent','pouvoir','faire','fait','fais','dis','dire','dit','va','vais','vas','vont','aller','veux','veut','voudrais','vouloir','the','of','to','in','is','are','it','i','you','my','and','or','for','with','on','at','do','does','can','there','this','that','what','how','de','vers','chez','entre','puis','tout','tous','toute','toutes','meme','ma','mon','vraiment','juste','un','peu','trop','assez','autre','autres','chaque','quelque','quelques','rien','jamais','toujours','beaucoup','maintenant','aujourd','hui','stp','svp']);
const norm=s=>String(s||'').replace(/ß/g,'ss').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[œ]/g,'oe').replace(/[æ]/g,'ae').replace(/[’‘`´]/g,"'").replace(/[‐‑–—]/g,'-').replace(/\s+/g,' ').trim();
/* Découpage : apostrophes et tirets deviennent des espaces ; « $ », « € », « % », « gta+ » et « r* » sont transcrits avant. */
function raw(text){let s=norm(text).replace(/\bgta\s*\+/g,' gtaplus ').replace(/\br\*/g,' rockstar ').replace(/\$/g,' $ ').replace(/€/g,' € ').replace(/%/g,' pourcent ').replace(/['-]/g,' ');
 s=s.replace(/(\d)\s*(?:h|heures?)\s*(\d{1,2})\b/g,'$1h$2');
 return s.split(/[^a-z0-9$€]+/).filter(Boolean);}
/* Lemmatisation légère : pluriels, féminins en -ée, quelques suffixes verbaux fréquents. Les mots courts ne bougent pas. */
function stem(w){if(w.length<=3||/\d/.test(w))return w;let s=w;
 if(/eaux$/.test(s))s=s.slice(0,-1);else if(/aux$/.test(s)&&s.length>5)s=s.slice(0,-3)+'al';else if(/[^s]s$/.test(s)&&!/(?:us|is|os|as)$/.test(s)&&s.length>4)s=s.slice(0,-1);else if(/x$/.test(s)&&/(?:eu|ou)x$/.test(s))s=s.slice(0,-1);
 if(s.length>6){if(/(?:issent|issez|issons|issais|issait)$/.test(s))s=s.replace(/(?:issent|issez|issons|issais|issait)$/,'ir');else if(/(?:erons|eront|erait|erais|eriez|erez|aient|ions)$/.test(s))s=s.replace(/(?:erons|eront|erait|erais|eriez|erez|aient|ions)$/,'e');else if(/(?:ent|ons|ez|ais|ait|era|es|er)$/.test(s)&&s.length>5)s=s.replace(/(?:ent|ons|ez|ais|ait|era|es|er)$/,'e');}
 /* féminins et « e » muet final : « achetée », « chercher » → « cherche » → « cherch », comme « je cherche » */
 if(/ees$/.test(s))s=s.slice(0,-2);else if(/ee$/.test(s))s=s.slice(0,-1);if(/[^e]e$/.test(s)&&s.length>4)s=s.slice(0,-1);
 return s;}
/* Repère phonétique approximatif pour le français : « kestion » → « question », « veicule » → « vehicule ». */
function phonetic(w){let k=w.replace(/ph/g,'f').replace(/qu/g,'k').replace(/q/g,'k').replace(/ck/g,'k').replace(/c(?=[eiy])/g,'s').replace(/c/g,'k').replace(/g(?=[eiy])/g,'j').replace(/x/g,'ks').replace(/y/g,'i').replace(/w/g,'v').replace(/h/g,'').replace(/z/g,'s').replace(/eau/g,'o').replace(/au/g,'o').replace(/ai|ei/g,'e').replace(/ou/g,'u').replace(/oi/g,'oa').replace(/eu/g,'e').replace(/(?:ain|ein|in|un)(?![aeiou])/g,'in').replace(/(?:an|en|am|em)(?![aeiou])/g,'an').replace(/(.)\1+/g,'$1');
 if(k.length>3)k=k.replace(/[estdx]$/,'');if(k.length>3)k=k.replace(/e$/,'');return k;}
/* Distance de Damerau-Levenshtein (alignement optimal), avec plafond pour couper court. */
function distance(a,b,max=3){if(a===b)return 0;const la=a.length,lb=b.length;if(Math.abs(la-lb)>max)return max+1;let prev2=null,prev=[],cur=[];for(let j=0;j<=lb;j++)prev[j]=j;
 for(let i=1;i<=la;i++){cur=[i];let best=i;for(let j=1;j<=lb;j++){const cost=a[i-1]===b[j-1]?0:1;let v=Math.min(prev[j]+1,cur[j-1]+1,prev[j-1]+cost);if(i>1&&j>1&&a[i-1]===b[j-2]&&a[i-2]===b[j-1])v=Math.min(v,prev2[j-2]+cost);cur[j]=v;if(v<best)best=v;}if(best>max)return max+1;prev2=prev;prev=cur;}
 return prev[lb];}
const allowed=w=>w.length<4?0:w.length<=6?1:2;
function createAnalyzer(lexique){
 /* v7.61 : mots vides en plus (index d'une autre langue : « el », « los », « para »…) */const stopX=new Set((lexique?.stop||[]).map(w=>norm(w)));
 const map=new Map(),concepts=new Map(),conceptPhrases=[],phraseByFirst=new Map(),firstMax=new Map();let longest=1;
 /* firstMax : pour chaque premier mot d'une forme, la longueur de sa plus longue forme ; les autres mots ne sont pas cherchés (analyse en temps linéaire) */
 const add=(f,to)=>{const r=raw(f),key=r.join(' ');if(!key)return;map.set(key,raw(to));longest=Math.max(longest,r.length);firstMax.set(r[0],Math.max(firstMax.get(r[0])||0,r.length));};
 for(const x of lexique?.abbreviations||[])add(x.f,x.to);for(const x of lexique?.english||[])add(x.f,x.to);
 for(const [id,words] of Object.entries(lexique?.concepts||{}))for(const w of words){const parts=raw(w).map(stem);if(!parts.length)continue;if(parts.length===1){const list=concepts.get(parts[0])||[];if(!list.includes(id))list.push(id);concepts.set(parts[0],list);}else{conceptPhrases.push({parts,id});const l=phraseByFirst.get(parts[0])||[];l.push({parts,id});phraseByFirst.set(parts[0],l);}}
 /* Lexique : remplacement glouton, la forme la plus longue d'abord, jusqu'à quatre mots. */
 function expand(tokens){const out=[];let replaced=0;for(let i=0;i<tokens.length;){let hit=null;for(let n=Math.min(firstMax.get(tokens[i])||0,tokens.length-i);n>=1;n--){const key=tokens.slice(i,i+n).join(' ');if(map.has(key)){hit={n,to:map.get(key)};break;}}if(hit){const identity=hit.to.join(' ')===tokens.slice(i,i+hit.n).join(' ');if(!identity)replaced++;/* second passe : un mot issu d'un remplacement peut lui-même être une forme du lexique (« combien coute » → « combien prix ») ; une entrée identité (nom de fiche protégé, « vice city ») est gardée telle quelle */for(const t of hit.to){const again=identity?null:map.get(t);if(again&&again.length===1&&again[0]!==t&&!map.has(again[0]))out.push(again[0]);else out.push(t);}i+=hit.n;}else{out.push(tokens[i]);i++;}}return {tokens:out,replaced};}
 function analyze(text){const r=raw(text),{tokens:expanded,replaced}=expand(r),stems=expanded.map(stem),tags=new Set();
  for(let i=0;i<stems.length;i++){for(const id of concepts.get(stems[i])||[])tags.add(id);for(const p of phraseByFirst.get(stems[i])||[])if(p.parts.every((w,k)=>stems[i+k]===w))tags.add(p.id);}
  return {raw:r,expanded,stems,terms:stems.filter(t=>!STOP.has(t)&&!stopX.has(t)),concepts:[...tags],replaced};}
 return Object.freeze({analyze,expand,stem,concepts:w=>concepts.get(stem(w))||[]});
}
/* Index BM25 : documents = suites de jetons ; recherche avec rapprochement des mots inconnus (distance ≤ 1 pour 4 à 6 lettres, ≤ 2 au-delà, ou même repère phonétique). */
function createIndex(options={}){
 const k1=options.k1??1.2,b=options.b??0.75,docs=[],postings=new Map(),df=new Map(),byLength=new Map(),byPhonetic=new Map();let avgdl=0,total=0,finished=false;
 function add(id,terms,meta){const tf=new Map();for(const t of terms)tf.set(t,(tf.get(t)||0)+1);docs.push({id,tf,len:terms.length,meta});total+=terms.length;for(const t of tf.keys()){df.set(t,(df.get(t)||0)+1);if(!postings.has(t))postings.set(t,[]);postings.get(t).push(docs.length-1);}}
 function finish(){avgdl=docs.length?total/docs.length:1;for(const t of df.keys()){if(/\d/.test(t))continue;const L=t.length;if(!byLength.has(L))byLength.set(L,[]);byLength.get(L).push(t);const p=phonetic(t);if(!byPhonetic.has(p))byPhonetic.set(p,[]);byPhonetic.get(p).push(t);}finished=true;}
 const idf=t=>{const n=df.get(t)||0;return Math.log(1+(docs.length-n+0.5)/(n+0.5));};
 /* Mot inconnu → mot le plus proche du vocabulaire, ou null. Les nombres et les mots de moins de 4 lettres ne sont jamais rapprochés. */
 function nearest(t){if(df.has(t))return {term:t,distance:0};if(!finished||/\d/.test(t)||t.length<4||STOP.has(t))return null;const max=allowed(t);let best=null;
  for(const c of byPhonetic.get(phonetic(t))||[]){if(Math.abs(c.length-t.length)>2)continue;const d=distance(t,c,2);if(d>2)continue;const score=0.5;if(!best||score<best.score||(score===best.score&&df.get(c)>df.get(best.term)))best={term:c,distance:d,score};}
  if(best)return {term:best.term,distance:best.distance};
  for(let L=t.length-max;L<=t.length+max;L++)for(const c of byLength.get(L)||[]){const d=distance(t,c,max);if(d>max)continue;if(!best||d<best.score||(d===best.score&&df.get(c)>df.get(best.term)))best={term:c,distance:d,score:d};}
  return best?{term:best.term,distance:best.distance}:null;}
 /* Recherche : retourne les documents classés, avec les jetons reconnus, la couverture de la question et la précision du document. */
 function search(terms,limit=8){const q=new Map(),unknown=[],exact=new Set();for(const t of new Set(terms)){const n=nearest(t);if(n){q.set(n.term,(q.get(n.term)||0)+(n.distance?0.8:1));if(!n.distance)exact.add(n.term);}else unknown.push(t);}
  const scores=new Map(),matched=new Map();let qidf=0;/* un mot inconnu de 4 lettres ou plus compte comme un mot rare non couvert : la couverture baisse */for(const u of unknown)if(/^[a-z]{4,}$/.test(u))qidf+=Math.log(1+docs.length)*0.6;for(const [t,w] of q){const i=idf(t);qidf+=i*w;for(const d of postings.get(t)||[]){const doc=docs[d],tf=doc.tf.get(t),s=i*w*(tf*(k1+1))/(tf+k1*(1-b+b*doc.len/avgdl));scores.set(d,(scores.get(d)||0)+s);if(!matched.has(d))matched.set(d,[]);matched.get(d).push(t);}}
  const out=[];for(const [d,score] of scores){const doc=docs[d],m=matched.get(d);let covered=0;for(const t of m)covered+=idf(t)*q.get(t);let docIdf=0,docCovered=0;for(const t of doc.tf.keys()){const i=idf(t);docIdf+=i;if(q.has(t))docCovered+=i;}
   const recall=qidf?covered/qidf:0,precision=docIdf?docCovered/docIdf:0;let confidence=0.65*recall+0.35*precision;if(!m.some(t=>exact.has(t)))confidence*=0.7;if(doc.meta&&doc.meta.q&&recall>=0.99)confidence+=0.03;out.push({id:doc.id,meta:doc.meta,score,recall,precision,confidence,matched:m,exact:m.filter(t=>exact.has(t)),fuzzyOnly:!m.some(t=>exact.has(t))});}
  out.sort((a,b)=>b.confidence-a.confidence||b.score-a.score);return {results:out.slice(0,limit),known:[...q.keys()],unknown};}
 return Object.freeze({add,finish,search,nearest,idf,has:t=>df.has(t),size:()=>docs.length,vocabulary:()=>[...df.keys()]});
}
/* Jetons d'un nom de fiche, partagés par gen-leo.cjs (calcul d'avance) et leo-core.js : mots du nom (sans la précision « (nom réel) »,
   sans les nombres s'il reste un mot), repères courts (numéros, lettres seules) qui départagent des fiches de même nom, et suite de
   lettres pour un nom sans mot de deux lettres (« P’s & Q’s »). null si le nom ne peut pas être reconnu. */
const SIG=t=>t&&t.length>=2&&!/^(?:\$|€|dollars|euros)$/.test(t);
function nameTokens(analyzer,label){const name=String(label).replace(/\s*\((?:nom r[ée]el|nom suppos[ée]|real name|assumed name|presumed name)\)\s*$/i,'')||String(label);const all=analyzer.analyze(name).terms.filter(SIG),words=all.filter(t=>!/^\d+$/.test(t)),toks=words.length?words:all;const r=raw(name);
 if(!toks.length){const r2=raw(name.replace(/[’']/g,''));if(r.length>=2&&r.join('').length>=3&&r.every(t=>t.length===1)&&!r.every(t=>/^\d$/.test(t)))return {toks:[...new Set([...r,...r2])],minor:[],seqs:[...new Set([r.join(' '),r2.join(' ')])]};return null;}
 return {toks,minor:r.filter(t=>/^\d+$/.test(t)||(t.length===1&&/[a-z]/.test(t))),seqs:null};}
/* v7.61 (langues) : une question écrite dans une autre langue (anglais) est d'abord réécrite dans la forme française que Léo
   lit : montants (« $200,000 » → « 200000 $ »), puis expressions de la table (les plus longues d'abord, en un seul passage).
   La table vient du noyau de la langue (en/leo-index.json → pivot) ; une entrée identité protège un nom de fiche
   (« Ocean Beach » n'est pas réécrit). Rien n'est appelé sur le site français. */
function pivotTable(list,lang){const map=new Map(),parts=[];for(const e of list||[]){if(!Array.isArray(e))continue;const k=norm(e[0]).replace(/[^a-z0-9$'& ]+/g,' ').replace(/\s+/g,' ').trim();if(!k||map.has(k))continue;map.set(k,String(e[1]||''));parts.push(k);}
 parts.sort((a,b)=>b.length-a.length);const esc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/ /g,'\\s+');
 return {map,lang:lang||'en',re:parts.length?new RegExp("(^|[^a-z0-9'])("+parts.map(esc).join('|')+")(?=$|[^a-z0-9'])",'g'):null};}
function pivot(text,table){if(!table||!table.re)return String(text||'');
 let s=norm(text).replace(/[’‘`´]/g,"'");const de=table.lang==='de';
 /* montants à l'américaine : séparateurs de milliers retirés, « $ » placé après le nombre (« $1.5m » → « 1.5m $ ») ;
    v7.62, allemand : point des milliers retiré, virgule décimale gardée (« 1.250,50 $ » → « 1250,50 $ », lu comme en français) */
 if(de)s=s.replace(/(\d)\.(?=\d{3}(?!\d))/g,'$1').replace(/\$\s*(\d+(?:,\d+)?)\s*(k|m|mio|mrd|millionen|million|tausend|milliarden?)?(?![a-z0-9])/g,(m,n,u)=>n+(u?' '+u:'')+' $');
 else s=s.replace(/(\d),(?=\d{3}(?!\d))/g,'$1').replace(/\$\s*(\d+(?:\.\d+)?)\s*(k|m|bn|mil|million|millions|thousand|grand|billion|billions)?(?![a-z0-9])/g,(m,n,u)=>n+(u?' '+u:'')+' $');
 /* calcul hors sujet (« what's 12 times 12 », « was ist 12 mal 12 ») : lu comme « combien font … » */
 const math=de?/\d\s*(?:mal|plus|minus|geteilt durch|durch|x|\*|\+|\/)\s*\d/.test(s)&&!/\$|\bk\b|mio|million|stunden?|std|min/.test(s):/\d\s*(?:times|plus|minus|divided by|multiplied by|x|\*|\+|\/)\s*\d/.test(s)&&!/\$|\bk\b|million|hours?|min/.test(s);
 s=de?s.replace(/(\d)\s*(?:std|stunden?|stdn?|h)(?![a-z])/g,'$1 heures').replace(/(\d)\s*(?:min|minuten?|mins?)(?![a-z])/g,'$1 minutes'):s.replace(/(\d)\s*(?:hrs?|hours?)(?![a-z])/g,'$1 heures').replace(/(\d)\s*(?:mins?|minutes?)(?![a-z])/g,'$1 minutes');
 s=s.replace(table.re,(m,pre,w)=>{const to=table.map.get(w.replace(/\s+/g,' '));return pre+(to===undefined?w:to===''?' ':' '+to+' ');});
 s=s.replace(/\s+/g,' ').trim();return math?'combien font '+s:s;}
return Object.freeze({STOP,norm,raw,stem,phonetic,distance,createAnalyzer,createIndex,nameTokens,SIG,pivotTable,pivot});
});
