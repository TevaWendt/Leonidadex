/* Graphiques SVG et jauges du calculateur, construits uniquement à partir des résultats du moteur.
   v7.33 : chaque graphique a un titre qui dit la question, deux axes nommés avec leur unité, des séries
   reconnaissables sans la couleur (trait plein, tirets, pointillés, formes des points), une légende,
   une phrase de lecture et le tableau des chiffres. Prévu, réalisé et hypothèse ne se confondent pas. */
(function(global){
'use strict';
function create(h){
 const {esc,money,hours}=h,nf=new Intl.NumberFormat('fr-FR',{maximumFractionDigits:2}),compact=new Intl.NumberFormat('fr-FR',{notation:'compact',maximumFractionDigits:1});
 const fmt=(v,u)=>u==='$'?money(v):u==='h'?hours(v):u==='min'?hours(v/60):u==='%'?nf.format(v)+' %':nf.format(v)+(u?' '+u:'');
 const PATTERN={forecast:{dash:'',marker:'circle'},realized:{dash:'',marker:'square'},reference:{dash:'8 6',marker:'diamond'},hypothesis:{dash:'2 5',marker:'triangle'}};
 function marker(kind,x,y,r){x=Number(x);y=Number(y);const f=v=>Number(v.toFixed(2));if(kind==='square')return '<rect x="'+f(x-r)+'" y="'+f(y-r)+'" width="'+2*r+'" height="'+2*r+'"/>';if(kind==='diamond')return '<path d="M'+f(x)+' '+f(y-r*1.3)+'L'+f(x+r*1.3)+' '+f(y)+'L'+f(x)+' '+f(y+r*1.3)+'L'+f(x-r*1.3)+' '+f(y)+'Z"/>';if(kind==='triangle')return '<path d="M'+f(x)+' '+f(y-r*1.3)+'L'+f(x+r*1.2)+' '+f(y+r)+'L'+f(x-r*1.2)+' '+f(y+r)+'Z"/>';return '<circle cx="'+f(x)+'" cy="'+f(y)+'" r="'+r+'"/>';}
 function niceTicks(lo,hi,n){if(!(hi>lo))return [lo];const raw=(hi-lo)/n,mag=Math.pow(10,Math.floor(Math.log10(raw))),norm=raw/mag,step=(norm<1.5?1:norm<3?2:norm<7?5:10)*mag,start=Math.floor(lo/step)*step,out=[];for(let v=start;v<=hi+step*1e-6&&out.length<12;v+=step)out.push(Math.round(v/step)*step);return out;}
 function progress(id,label,value,total,explain){
  if(!Number.isFinite(value)||!Number.isFinite(total)||total<0)return '<p class="c-progress-note">'+esc(label)+' : indisponible avec ces paramètres.</p>';
  if(total===0)return '<p class="c-progress-note">'+esc(label)+' : '+(value>0?'aucun montant de référence disponible pour calculer un pourcentage.':'aucun montant à couvrir.')+'</p>';
  const raw=value/total*100,pct=Math.max(0,Math.min(100,raw));
  return '<div class="c-progress-block"><label for="'+id+'">'+esc(label)+' <strong data-c-number="'+id+'-value">'+nf.format(raw)+' %</strong>'+(raw>100?' · déjà dépassé':raw<0?' · pas encore commencé':'')+'</label><progress class="calc-progress" id="'+id+'" max="100" value="'+pct+'" aria-valuetext="'+esc(nf.format(raw)+' % — '+label)+'"></progress>'+(explain?'<p class="calc-note c-progress-explain">'+esc(explain)+'</p>':'')+'</div>';
 }
 /* Graphique à axes. options : {title, question, xTitle, yTitle, unit, xUnit, series:[{name,kind,points:[{x,y,label}]}], thresholds:[{y,label}], reading, note} */
 function chart(id,o){
  const series=(o.series||[]).filter(s=>s&&s.points&&s.points.length&&s.points.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)));
  if(!series.length)return '<p class="c-progress-note">'+esc(o.title||'Graphique')+' : pas assez de chiffres pour un dessin honnête.</p>';
  const all=series.flatMap(s=>s.points),xs=all.map(p=>p.x),ys=all.map(p=>p.y).concat((o.thresholds||[]).map(t=>t.y));
  const xLo=Math.min(0,...xs),xHi=Math.max(...xs,xLo+1),yLo=Math.min(0,...ys),yHi=Math.max(...ys,yLo+1);
  const W=640,H=300,L=92,R=20,T=44,B=66,px=v=>L+(v-xLo)/(xHi-xLo||1)*(W-L-R),py=v=>T+(1-(v-yLo)/(yHi-yLo||1))*(H-T-B);
  const yt=niceTicks(yLo,yHi,4),xLabels=Array.isArray(o.xLabels)?o.xLabels:null,xt=xLabels?xLabels.map((_,i)=>i):niceTicks(xLo,xHi,5);
  const xTick=v=>xLabels?(xLabels[v]||''):o.xUnit==='h'?hours(v):nf.format(v);
  const grid=yt.map(v=>'<line class="gridline" x1="'+L+'" x2="'+(W-R)+'" y1="'+py(v).toFixed(1)+'" y2="'+py(v).toFixed(1)+'"/><text class="c-tick" x="'+(L-8)+'" y="'+(py(v)+4).toFixed(1)+'" text-anchor="end">'+esc(o.unit==='$'?compact.format(v)+' $':o.unit==='%'?nf.format(v)+' %':nf.format(v))+'</text>').join('')+xt.map(v=>'<line class="gridline c-grid-x" y1="'+T+'" y2="'+(H-B)+'" x1="'+px(v).toFixed(1)+'" x2="'+px(v).toFixed(1)+'"/><text class="c-tick" x="'+px(v).toFixed(1)+'" y="'+(H-B+18)+'" text-anchor="middle">'+esc(xTick(v))+'</text>').join('');
  const zero=yLo<0?'<line class="c-threshold" x1="'+L+'" x2="'+(W-R)+'" y1="'+py(0).toFixed(1)+'" y2="'+py(0).toFixed(1)+'"/>':'';
  const thresholds=(o.thresholds||[]).map(t=>'<line class="c-threshold" x1="'+L+'" x2="'+(W-R)+'" y1="'+py(t.y).toFixed(1)+'" y2="'+py(t.y).toFixed(1)+'"/><text class="c-tick c-threshold-label" x="'+(W-R)+'" y="'+(py(t.y)-5).toFixed(1)+'" text-anchor="end">'+esc(t.label)+'</text>').join('');
  const gid='g-'+String(id).replace(/[^a-z0-9_-]/gi,'');
  const defs='<defs><linearGradient id="'+gid+'" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="c-area-top"/><stop offset="1" class="c-area-bottom"/></linearGradient></defs>';
  const area=o.area!==false&&series[0]&&series[0].points.length>1&&(series[0].kind==='forecast'||series[0].kind==='hypothesis')?'<path class="c-area" fill="url(#'+gid+')" d="'+series[0].points.map((p,k)=>(k?'L':'M')+px(p.x).toFixed(1)+' '+py(p.y).toFixed(1)).join(' ')+' L'+px(series[0].points[series[0].points.length-1].x).toFixed(1)+' '+py(Math.max(yLo,0)).toFixed(1)+' L'+px(series[0].points[0].x).toFixed(1)+' '+py(Math.max(yLo,0)).toFixed(1)+' Z"/>':'';
  const paths=series.map((s,i)=>{const pt=PATTERN[s.kind]||PATTERN.forecast;const d=s.points.map((p,k)=>(k?'L':'M')+px(p.x).toFixed(1)+' '+py(p.y).toFixed(1)).join(' ');const marks=s.points.map(p=>{const text=s.name+' · '+(p.label||fmt(p.x,o.xUnit))+' : '+fmt(p.y,o.unit),act=p.edit?' data-c-edit="'+esc(p.edit)+'"':p.apply?' data-c-apply="'+esc(p.apply)+'"':'';return '<g class="c-chart-point c-series-'+i+(act?' is-actionable':'')+'" tabindex="0" role="'+(act?'button':'img')+'" data-tip="'+esc(text+(p.edit?' · clique pour corriger':p.apply?' · clique pour utiliser ce chiffre':''))+'" aria-label="'+esc(text)+'"'+act+'><title>'+esc(text)+'</title>'+marker(pt.marker,px(p.x).toFixed(1),py(p.y).toFixed(1),p.key||act?6.5:5)+'</g>';}).join('');return (s.points.length>1?'<path class="path c-series-'+i+'" d="'+d+'"'+(pt.dash?' stroke-dasharray="'+pt.dash+'"':'')+'/>':'')+marks;}).join('');
  const legend=series.length>1||o.legendAlways?'<ul class="c-legend">'+series.map((s,i)=>{const pt=PATTERN[s.kind]||PATTERN.forecast;return '<li><svg viewBox="0 0 40 16" width="40" height="16" aria-hidden="true"><line class="path c-series-'+i+'" x1="2" x2="38" y1="8" y2="8"'+(pt.dash?' stroke-dasharray="'+pt.dash+'"':'')+'/><g class="c-chart-point c-legend-mark c-series-'+i+'">'+marker(pt.marker,20,8,4)+'</g></svg>'+esc(s.name)+(s.kind==='realized'?' (réalisé)':s.kind==='hypothesis'?' (hypothèse)':s.kind==='reference'?' (repère)':'')+'</li>';}).join('')+'</ul>':'';
  const rows=[];const xsAll=[...new Set(all.map(p=>p.x))].sort((a,b)=>a-b);xsAll.forEach(x=>{rows.push('<tr><th scope="row">'+esc(xLabels?(xLabels[x]||nf.format(x)):o.xUnit==='h'?hours(x):nf.format(x)+(o.xUnit?' '+o.xUnit:''))+'</th>'+series.map(s=>{const p=s.points.filter(q=>q.x===x);return '<td>'+(p.length?p.map(q=>esc(fmt(q.y,o.unit))).join(' → '):'—')+'</td>';}).join('')+'</tr>');});
  return '<figure class="calc-chart c-chart" data-c-chart="'+esc(id)+'"><figcaption class="c-chart-head"><strong id="'+esc(id)+'-title">'+esc(o.title)+'</strong>'+(o.question?'<span class="c-chart-question">'+esc(o.question)+'</span>':'')+'</figcaption><svg viewBox="0 0 '+W+' '+H+'" role="img" aria-labelledby="'+esc(id)+'-title '+esc(id)+'-reading"><text class="c-axis-title" x="'+L+'" y="'+(T-16)+'">'+esc(o.yTitle||'')+'</text><text class="c-axis-title" x="'+(W-R)+'" y="'+(H-B+40)+'" text-anchor="end">'+esc(o.xTitle||'')+'</text>'+defs+grid+area+zero+thresholds+paths+'</svg>'+legend+'<p class="c-chart-reading" id="'+esc(id)+'-reading"><strong>À retenir :</strong> '+esc(o.reading||'')+'</p>'+(o.note?'<p class="calc-note">'+esc(o.note)+'</p>':'')+'<details class="c-chart-data"><summary>Les chiffres du graphique</summary><div class="calc-table-wrap" tabindex="0"><table class="calc-table"><caption>'+esc(o.title)+'</caption><thead><tr><th scope="col">'+esc(o.xTitle||'x')+'</th>'+series.map(s=>'<th scope="col">'+esc(s.name)+'</th>').join('')+'</tr></thead><tbody>'+rows.join('')+'</tbody></table></div></details></figure>';
 }
 /* Compatibilité : courbe simple d'une série (points {label,value} ou {time,label,value}). */
 function plot(id,title,points,unit,options={}){
  if(points.length<2||points.some(p=>!Number.isFinite(p.value)))return '';
  const pts=points.map((p,i)=>({x:options.time?p.time:i,y:p.value,label:p.label,key:p.key}));
  return chart(id,{title:title,question:options.question||'',xLabels:options.time?null:points.map(p=>p.label),xTitle:options.time?'Temps de jeu (heures)':(options.xTitle||'Scénarios'),yTitle:options.yTitle||(unit==='$'?'Argent ($)':unit==='h'?'Temps de jeu (heures)':unit==='min'?'Temps (minutes)':unit),unit:unit,xUnit:options.time?'h':'',series:[{name:options.seriesName||'Prévu avec tes chiffres',kind:options.kind||'forecast',points:pts}],thresholds:options.zero&&pts.some(p=>p.y<0)?[{y:0,label:'Remboursé'}]:[],reading:options.reading||'',note:options.note||''});
 }
 function sensitivity(tool,sens,metric,applyPath){
  if(!sens)return '';const [key,label,unit]=metric;
  if(sens.rows.some(x=>!x.result.valid||!Number.isFinite(x.result[key])))return '';
  const vals=sens.rows.map(x=>x.result[key]);
  return chart('c-sensitivity-'+tool,{title:'Et si le chiffre bouge de 20 % ?',question:label,xTitle:sens.label,yTitle:label+(unit?' ('+unit+')':''),unit:unit,area:false,xLabels:sens.rows.map(x=>x.factor===1?'Ton chiffre':x.factor<1?'−20 %':'+20 %'),series:[{name:'Résultat recalculé',kind:'hypothesis',points:sens.rows.map((x,i)=>({x:i,y:x.result[key],label:(x.factor===1?'Ton chiffre':x.factor<1?'−20 %':'+20 %')+(x.value===null?'':' ('+nf.format(x.value)+')'),key:x.factor===1,apply:applyPath&&x.factor!==1&&x.value!==null?applyPath+'|'+x.value:null}))}],reading:'Entre −20 % et +20 %, le résultat va de '+fmt(Math.min(...vals),unit)+' à '+fmt(Math.max(...vals),unit)+'. Ce sont trois recalculs, pas une prévision.'+(applyPath?' Clique sur −20 % ou +20 % pour adopter ce chiffre.':'')});
 }
 function roi(s,r,d){
  if(!r.valid)return '';
  let html='<div class="c-payback"><span>Remboursé après</span><strong data-c-number="roi-payback">'+(r.paybackHours===null?'Non atteint dans la simulation':hours(r.paybackHours))+'</strong><small>'+(s.roi.mode==='continuous'?'de jeu, avec ton chiffre par heure':r.paybackCycles===null?'Aucun cycle suffisant trouvé':nf.format(r.paybackCycles)+' missions faites')+'</small></div>';
  html+=progress('roi-progress','Part du prix déjà regagnée',r.operatingProfit,r.investment,'100 % = ce que l’achat a rapporté couvre son prix de départ ('+money(r.investment)+') pendant le temps où tu t’en sers.');
  if(d&&d.valid&&d.hours!==null&&d.hours>0&&d.baselineHourly===null){
   // Sans le gain actuel du joueur, on ne dessine que l'avantage de l'achat : prix payé au départ, puis ce qu'il rapporte en plus.
   const H=d.hours,pts=[{x:0,y:-d.investment,label:'Achat payé'}];if(d.breakEvenHours!==null&&d.breakEvenHours>0&&d.breakEvenHours<H)pts.push({x:d.breakEvenHours,y:0,label:'Remboursé',key:true});pts.push({x:H,y:d.difference,label:hours(H)});
   html+='<div class="b-expert">'+chart('c-roi-compare',{title:'Ce que l’achat te laisse en plus, prix enlevé',question:'À partir de quand l’achat est-il remboursé ?',xTitle:'Temps de jeu (heures)',yTitle:'Avantage de l’achat ($)',unit:'$',xUnit:'h',series:[{name:'Avantage de l’achat',kind:'forecast',points:pts}],thresholds:[{y:0,label:'Remboursé'}],reading:d.breakEvenHours===null?'La ligne ne remonte jamais au-dessus de zéro : l’achat ne se rembourse pas avec ces chiffres.':d.breakEvenHours>H?'La ligne ne repasse au-dessus de zéro qu’après '+hours(d.breakEvenHours)+', plus tard que le temps où tu t’en sers.':'La ligne passe au-dessus de zéro après '+hours(d.breakEvenHours)+' de jeu : à partir de là, l’achat t’a rapporté plus qu’il n’a coûté.',note:'Écris ce que tu gagnes déjà par heure (Mon objectif) pour voir les deux situations complètes, avec et sans l’achat.'})+'</div>';
  }
  else if(d&&d.valid&&d.hours!==null&&d.hours>0){
   const H=d.hours,base=d.baselineHourly||0,cap=d.capital===undefined?0:d.capital;
   const withoutPts=[{x:0,y:cap,label:'Départ'},{x:H,y:cap+base*H,label:hours(H)}],withPts=[{x:0,y:cap-d.investment,label:'Achat payé'},{x:H,y:cap-d.investment+(base+d.marginalHourly)*H,label:hours(H)}];
   if(d.breakEvenHours!==null&&d.breakEvenHours>0&&d.breakEvenHours<H){const y=cap+base*d.breakEvenHours;withoutPts.splice(1,0,{x:d.breakEvenHours,y:y,label:'Rattrapé'});withPts.splice(1,0,{x:d.breakEvenHours,y:y,label:'Rattrapé',key:true});}
   html+='<div class="b-expert">'+chart('c-roi-compare',{title:'Avec ou sans cet achat : ton argent au fil du temps',question:'À partir de quand la situation avec l’achat dépasse-t-elle celle sans ?',xTitle:'Temps de jeu (heures)',yTitle:'Argent en poche ($)',unit:'$',xUnit:'h',series:[{name:'Sans l’achat',kind:'reference',points:withoutPts},{name:'Avec l’achat',kind:'forecast',points:withPts}],reading:d.breakEvenHours===null?'Avec ce que tu as écrit, la situation avec l’achat ne rattrape jamais celle sans : il ne se rembourse pas.':d.breakEvenHours>H?'Il faudrait '+hours(d.breakEvenHours)+' de jeu pour rattraper la situation sans achat, plus que le temps où tu t’en sers ('+hours(H)+').':'Les deux lignes se croisent après '+hours(d.breakEvenHours)+' de jeu : au-delà, l’achat te laisse plus d’argent que si tu ne l’avais pas fait.',note:'Les deux lignes supposent que tu gagnes toujours pareil. Le gain « sans l’achat » vient de ton chiffre par heure ; celui « avec » ajoute seulement ce que l’achat rapporte en plus.'})+'</div>';
  }
  return html;
 }
 return {progress,plot,chart,sensitivity,roi,fmt};
}
global.LKCalcVisuals={create};
})(window);
