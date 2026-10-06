/* Graphiques SVG et jauges du calculateur, construits uniquement à partir des résultats du moteur.
   v7.33 : chaque graphique a un titre qui dit la question, deux axes nommés avec leur unité, des séries
   reconnaissables sans la couleur (trait plein, tirets, pointillés, formes des points), une légende,
   une phrase de lecture et le tableau des chiffres. Prévu, réalisé et hypothèse ne se confondent pas. */
(function(global){
'use strict';
function create(h){
 const {esc,money,hours}=h,nf=new Intl.NumberFormat('fr-FR',{maximumFractionDigits:2}),compact=new Intl.NumberFormat('fr-FR',{notation:'compact',maximumFractionDigits:1});
 const fmt=(v,u)=>u==='$'?money(v):u==='h'?hours(v):u==='min'?hours(v/60):u==='%'?nf.format(v)+' %':nf.format(v)+(u?' '+u:'');
 const PATTERN={forecast:{dash:'',marker:'circle'},realized:{dash:'',marker:'square'},reference:{dash:'8 6',marker:'diamond'},hypothesis:{dash:'2 5',marker:'triangle'},
  /* v7.53 : motifs neutres pour distinguer des options entre elles (aucune n’est « réalisée » ni « de référence ») */
  opt1:{dash:'',marker:'circle'},opt2:{dash:'8 6',marker:'diamond'},opt3:{dash:'2 5',marker:'triangle'},opt4:{dash:'12 4 2 4',marker:'square'}};
 function marker(kind,x,y,r){x=Number(x);y=Number(y);const f=v=>Number(v.toFixed(2));if(kind==='square')return '<rect x="'+f(x-r)+'" y="'+f(y-r)+'" width="'+2*r+'" height="'+2*r+'"/>';if(kind==='diamond')return '<path d="M'+f(x)+' '+f(y-r*1.3)+'L'+f(x+r*1.3)+' '+f(y)+'L'+f(x)+' '+f(y+r*1.3)+'L'+f(x-r*1.3)+' '+f(y)+'Z"/>';if(kind==='triangle')return '<path d="M'+f(x)+' '+f(y-r*1.3)+'L'+f(x+r*1.2)+' '+f(y+r)+'L'+f(x-r*1.2)+' '+f(y+r)+'Z"/>';return '<circle cx="'+f(x)+'" cy="'+f(y)+'" r="'+r+'"/>';}
 function niceTicks(lo,hi,n){if(!(hi>lo))return [lo];const raw=(hi-lo)/n,mag=Math.pow(10,Math.floor(Math.log10(raw))),norm=raw/mag,step=(norm<1.5?1:norm<3?2:norm<7?5:10)*mag,start=Math.floor(lo/step)*step,out=[];for(let v=start;v<=hi+step*1e-6&&out.length<12;v+=step)out.push(Math.round(v/step)*step);return out;}
 function progress(id,label,value,total,explain){
  if(!Number.isFinite(value)||!Number.isFinite(total)||total<0)return '<p class="c-progress-note">'+esc(label)+' : pas calculable avec ces chiffres.</p>';
  if(total===0)return '<p class="c-progress-note">'+esc(label)+' : '+(value>0?'aucun montant de référence disponible pour calculer un pourcentage.':'aucun montant à couvrir.')+'</p>';
  const raw=value/total*100,pct=Math.max(0,Math.min(100,raw));
  return '<div class="c-progress-block"><label for="'+id+'">'+esc(label)+' <strong data-c-number="'+id+'-value">'+nf.format(raw)+' %</strong>'+(raw>100?' · déjà dépassé':raw<0?' · pas encore commencé':'')+'</label><progress class="calc-progress" id="'+id+'" max="100" value="'+pct+'" aria-valuetext="'+esc(nf.format(raw)+' % — '+label)+'"></progress>'+(explain?'<p class="calc-note c-progress-explain">'+esc(explain)+'</p>':'')+'</div>';
 }
 /* Graphique à axes. options : {title, question, xTitle, yTitle, unit, xUnit, series:[{name,kind,points:[{x,y,label}]}], thresholds:[{y,label}], reading, note} */
 function chart(id,o){
  const series=(o.series||[]).filter(s=>s&&s.points&&s.points.length&&s.points.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)));
  if(!series.length)return '<p class="c-progress-note">'+esc(o.title||'Graphique')+' : pas assez de chiffres pour un dessin honnête.</p>';
  const all=series.flatMap(s=>s.points),xs=all.map(p=>p.x),ys=all.map(p=>p.y).concat((o.thresholds||[]).map(t=>t.y));
  const xLo=Math.min(0,...xs),xHi=Math.max(...xs,xLo+1),yLo=Math.min(0,...ys),yHi=Math.max(...ys,yLo+1);
  const W=640,H=300,L=92,R=20,T=44,B=66,px=v=>L+(v-xLo)/(xHi-xLo||1)*(W-L-R),py=v=>T+(1-(v-yLo)/(yHi-yLo||1))*(H-T-B);
  const yt=niceTicks(yLo,yHi,4),xLabels=Array.isArray(o.xLabels)?o.xLabels:null,xt=xLabels?xLabels.map((_,i)=>i):niceTicks(xLo,xHi,5);
  const xTick=v=>xLabels?(xLabels[v]||''):o.xUnit==='h'?hours(v):nf.format(v);
  const grid=yt.map(v=>'<line class="gridline" x1="'+L+'" x2="'+(W-R)+'" y1="'+py(v).toFixed(1)+'" y2="'+py(v).toFixed(1)+'"/><text class="c-tick" x="'+(L-8)+'" y="'+(py(v)+4).toFixed(1)+'" text-anchor="end">'+esc(o.unit==='$'?(global.LKCalcEngine&&global.LKCalcEngine.dollars?global.LKCalcEngine.dollars(compact.format(v),' '):compact.format(v)+' $'):o.unit==='%'?nf.format(v)+' %':nf.format(v))+'</text>').join('')+xt.map(v=>'<line class="gridline c-grid-x" y1="'+T+'" y2="'+(H-B)+'" x1="'+px(v).toFixed(1)+'" x2="'+px(v).toFixed(1)+'"/><text class="c-tick" x="'+px(v).toFixed(1)+'" y="'+(H-B+18)+'" text-anchor="middle">'+esc(xTick(v))+'</text>').join('');
  const zero=yLo<0?'<line class="c-threshold" x1="'+L+'" x2="'+(W-R)+'" y1="'+py(0).toFixed(1)+'" y2="'+py(0).toFixed(1)+'"/>':'';
  const thresholds=(o.thresholds||[]).map(t=>'<line class="c-threshold" x1="'+L+'" x2="'+(W-R)+'" y1="'+py(t.y).toFixed(1)+'" y2="'+py(t.y).toFixed(1)+'"/><text class="c-tick c-threshold-label" x="'+(W-R)+'" y="'+(py(t.y)-5).toFixed(1)+'" text-anchor="end">'+esc(t.label)+'</text>').join('');
  const gid='g-'+String(id).replace(/[^a-z0-9_-]/gi,'');
  const defs='<defs><linearGradient id="'+gid+'" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="c-area-top"/><stop offset="1" class="c-area-bottom"/></linearGradient></defs>';
  const area=o.area!==false&&!series[0].step&&series[0]&&series[0].points.length>1&&(series[0].kind==='forecast'||series[0].kind==='hypothesis')?'<path class="c-area" fill="url(#'+gid+')" d="'+series[0].points.map((p,k)=>(k?'L':'M')+px(p.x).toFixed(1)+' '+py(p.y).toFixed(1)).join(' ')+' L'+px(series[0].points[series[0].points.length-1].x).toFixed(1)+' '+py(Math.max(yLo,0)).toFixed(1)+' L'+px(series[0].points[0].x).toFixed(1)+' '+py(Math.max(yLo,0)).toFixed(1)+' Z"/>':'';
  const paths=series.map((s,i)=>{const pt=PATTERN[s.kind]||PATTERN.forecast;
   // v7.49 : série « en marches » : l’argent reste plat puis saute au moment du paiement (jamais une pente qui ferait croire à un versement progressif).
   const d=s.step?s.points.map((p,k)=>k?'H'+px(p.x).toFixed(1)+' V'+py(p.y).toFixed(1):'M'+px(p.x).toFixed(1)+' '+py(p.y).toFixed(1)).join(' '):s.points.map((p,k)=>(k?'L':'M')+px(p.x).toFixed(1)+' '+py(p.y).toFixed(1)).join(' ');const shown=s.step?s.points.filter(p=>p.key||p.label):s.points;/* v7.49 : « dots » = points relevés, jamais reliés (on ne sait pas ce qui s’est passé entre deux). */const marks=shown.map(p=>{const text=s.name+' · '+(p.label||fmt(p.x,o.xUnit))+' : '+fmt(p.y,o.unit),act=p.edit?' data-c-edit="'+esc(p.edit)+'"':p.apply?' data-c-apply="'+esc(p.apply)+'"':'';return '<g class="c-chart-point c-series-'+i+(act?' is-actionable':'')+'" tabindex="0" role="'+(act?'button':'img')+'" data-tip="'+esc(text+(p.edit?' · clique pour corriger':p.apply?' · clique pour utiliser ce chiffre':''))+'" aria-label="'+esc(text)+'"'+act+'><title>'+esc(text)+'</title>'+marker(pt.marker,px(p.x).toFixed(1),py(p.y).toFixed(1),p.key||act?6.5:5)+'</g>';}).join('');return (s.points.length>1&&!s.dots?'<path class="path c-series-'+i+'" d="'+d+'"'+(pt.dash?' stroke-dasharray="'+pt.dash+'"':'')+'/>':'')+marks;}).join('');
  const legend=series.length>1||o.legendAlways?'<ul class="c-legend">'+series.map((s,i)=>{const pt=PATTERN[s.kind]||PATTERN.forecast;return '<li><svg viewBox="0 0 40 16" width="40" height="16" aria-hidden="true"><line class="path c-series-'+i+'" x1="2" x2="38" y1="8" y2="8"'+(pt.dash?' stroke-dasharray="'+pt.dash+'"':'')+'/><g class="c-chart-point c-legend-mark c-series-'+i+'">'+marker(pt.marker,20,8,4)+'</g></svg>'+esc(s.name)+(o.optionsLegend?'':s.kind==='realized'?' (réalisé)':s.kind==='hypothesis'?' (hypothèse)':s.kind==='reference'?' (repère)':'')+'</li>';}).join('')+'</ul>':'';
  const rows=[];const xsAll=[...new Set(all.map(p=>p.x))].sort((a,b)=>a-b);xsAll.forEach(x=>{rows.push('<tr><th scope="row">'+esc(xLabels?(xLabels[x]||nf.format(x)):o.xUnit==='h'?hours(x):nf.format(x)+(o.xUnit?' '+o.xUnit:''))+'</th>'+series.map(s=>{const p=s.points.filter(q=>q.x===x);return '<td>'+(p.length?p.map(q=>esc(fmt(q.y,o.unit))).join(' → '):'—')+'</td>';}).join('')+'</tr>');});
  return '<figure class="calc-chart c-chart" data-c-chart="'+esc(id)+'"><figcaption class="c-chart-head"><strong id="'+esc(id)+'-title">'+esc(o.title)+'</strong>'+(o.question?'<span class="c-chart-question">'+esc(o.question)+'</span>':'')+'</figcaption><svg viewBox="0 0 '+W+' '+H+'" role="img" aria-labelledby="'+esc(id)+'-title '+esc(id)+'-reading"><text class="c-axis-title" x="'+L+'" y="'+(T-16)+'">'+esc(o.yTitle||'')+'</text><text class="c-axis-title" x="'+(W-R)+'" y="'+(H-B+40)+'" text-anchor="end">'+esc(o.xTitle||'')+'</text>'+defs+grid+area+zero+thresholds+paths+'</svg>'+legend+'<p class="c-chart-reading" id="'+esc(id)+'-reading"><strong>À retenir :</strong> '+esc(o.reading||'')+'</p>'+(o.note?'<p class="calc-note">'+esc(o.note)+'</p>':'')+'<details class="c-chart-data"><summary>Les chiffres du graphique</summary><div class="calc-table-wrap" tabindex="0"><table class="calc-table"><caption>'+esc(o.title)+'</caption><thead><tr><th scope="col">'+esc(o.xTitle||'x')+'</th>'+series.map(s=>'<th scope="col">'+esc(s.name)+'</th>').join('')+'</tr></thead><tbody>'+rows.join('')+'</tbody></table></div></details></figure>';
 }
 /* Compatibilité : courbe simple d'une série (points {label,value} ou {time,label,value}). */
 function plot(id,title,points,unit,options={}){
  if(points.length<2||points.some(p=>!Number.isFinite(p.value)))return '';
  const pts=points.map((p,i)=>({x:options.time?p.time:i,y:p.value,label:p.label,key:p.key}));
  return chart(id,{title:title,question:options.question||'',xLabels:options.time?null:points.map(p=>p.label),xTitle:options.time?'Temps de jeu (heures)':(options.xTitle||'Étape'),yTitle:options.yTitle||(unit==='$'?'Argent ($)':unit==='h'?'Temps de jeu (heures)':unit==='min'?'Temps (minutes)':unit),unit:unit,xUnit:options.time?'h':'',series:[{name:options.seriesName||'Prévu avec tes chiffres',kind:options.kind||'forecast',points:pts}],thresholds:options.zero&&pts.some(p=>p.y<0)?[{y:0,label:'Remboursé'}]:[],reading:options.reading||'',note:options.note||''});
 }
 function sensitivity(tool,sens,metric,applyPath){
  if(!sens)return '';const [key,label,unit]=metric;
  if(sens.rows.some(x=>!x.result.valid||!Number.isFinite(x.result[key])))return '';
  const vals=sens.rows.map(x=>x.result[key]);
  return chart('c-sensitivity-'+tool,{title:'Et si le chiffre bouge de 20 % ?',question:label,xTitle:sens.label,yTitle:label+(unit?' ('+unit+')':''),unit:unit,area:false,xLabels:sens.rows.map(x=>x.factor===1?'Ton chiffre':x.factor<1?'−20 %':'+20 %'),series:[{name:'Résultat recalculé',kind:'hypothesis',points:sens.rows.map((x,i)=>({x:i,y:x.result[key],label:(x.factor===1?'Ton chiffre':x.factor<1?'−20 %':'+20 %')+(x.value===null?'':' ('+nf.format(x.value)+')'),key:x.factor===1,apply:applyPath&&x.factor!==1&&x.value!==null?applyPath+'|'+x.value:null}))}],reading:'Entre −20 % et +20 %, le résultat va de '+fmt(Math.min(...vals),unit)+' à '+fmt(Math.max(...vals),unit)+'. Ce sont trois recalculs, pas une prévision.'+(applyPath?' Clique sur −20 % ou +20 % pour adopter ce chiffre.':'')});
 }
 function roi(s,r,d){
  if(!r.valid)return '';
  /* lot 3 (scénario I) : nouvelle activité avec ton gain actuel connu : le remboursement compte ce que tu aurais gagné de toute façon
     (même chiffre que la réponse) ; un achat gratuit n’a rien à rembourser (jamais « 0 min ») */
  const marg=s.roi.mode==='new'&&Number.isFinite(r.baselineHourly)&&Number.isFinite(r.marginalProfit),pbH=marg?r.marginalPaybackHours:r.paybackHours,pbC=marg?r.marginalPaybackCycles:r.paybackCycles;
  let html='<div class="c-payback"><span>Remboursé après</span><strong data-c-number="roi-payback">'+(pbH===null||pbH===undefined?'Pas atteint avec ces chiffres':r.investment===0&&pbH===0?'Rien à rembourser':hours(pbH))+'</strong><small>'+(s.roi.mode==='continuous'?'de jeu, avec ton chiffre par heure':pbC===null||pbC===undefined?'Pas assez de missions trouvées':nf.format(pbC)+(/* lot 5 (seconde relecture) : « 1 mission faite », plus « 1 missions faites » */(global.LKCalcEngine&&global.LKCalcEngine.plural?global.LKCalcEngine.plural(pbC):pbC>1)?' missions faites':' mission faite'))+'</small></div>';
  html+=progress('roi-progress','Part du prix déjà regagnée',marg?r.marginalProfit:r.operatingProfit,r.investment,'100 % = ce que l’achat a rapporté couvre son prix de départ ('+money(r.investment)+') pendant le temps où tu t’en sers.');
  if(d&&d.valid&&d.hours!==null&&d.hours>0&&d.baselineHourly===null&&d.difference!==null){ /* lot 3 : sans moment d’achat connu (attente inconnue), pas de courbe */
   // Sans le gain actuel du joueur, on ne dessine que l'avantage de l'achat : prix payé au départ, puis ce qu'il rapporte en plus.
   const H=d.hours,pts=[{x:0,y:-d.investment,label:'Achat payé'}];if(d.breakEvenHours!==null&&d.breakEvenHours>0&&d.breakEvenHours<H)pts.push({x:d.breakEvenHours,y:0,label:'Remboursé',key:true});pts.push({x:H,y:d.difference,label:hours(H)});
   html+='<div class="b-expert">'+chart('c-roi-compare',{title:'Ce que l’achat te laisse en plus, prix enlevé',question:'À partir de quand l’achat est-il remboursé ?',xTitle:'Temps de jeu (heures)',yTitle:'Avantage de l’achat ($)',unit:'$',xUnit:'h',series:[{name:'Avantage de l’achat',kind:'forecast',points:pts}],thresholds:[{y:0,label:'Remboursé'}],reading:d.investment===0&&d.breakEvenHours===0?(d.marginalHourly>0?'Il ne coûte rien : la ligne part de zéro et monte dès le départ.':'La ligne reste à zéro : avec ces chiffres, l’achat ne change rien.')/* lot 3 : jamais « après 0 min » */:d.breakEvenHours===null?'La ligne ne remonte jamais au-dessus de zéro : l’achat ne se rembourse pas avec ces chiffres.':d.breakEvenHours>H?'La ligne ne repasse au-dessus de zéro qu’après '+hours(d.breakEvenHours)+', plus tard que le temps où tu t’en sers.':'La ligne passe au-dessus de zéro après '+hours(d.breakEvenHours)+' de jeu : à partir de là, l’achat t’a rapporté plus qu’il n’a coûté.',note:'Écris ce que tu gagnes déjà par heure (Mon objectif) pour voir les deux situations complètes, avec et sans l’achat.'})+'</div>';
  }
  /* lot 3 : pas assez d’argent au départ : l’achat est payé quand l’argent est là (waitHours du moteur) ; s’il ne l’est pas avant la fin, pas de courbe « avec » */
  else if(d&&d.valid&&d.hours!==null&&d.hours>0&&d.marginalHourly!==null&&(!(d.shortfall>0)||(d.thresholds&&d.thresholds.waitHours!==null&&d.thresholds.waitHours<d.hours))){
   const H=d.hours,base=d.baselineHourly||0,cap=d.capital===undefined?0:d.capital,w=d.shortfall>0?d.thresholds.waitHours:0,cross=d.breakEvenHours===null?null:w+d.breakEvenHours;
   const withoutPts=[{x:0,y:cap,label:'Départ'},{x:H,y:cap+base*H,label:hours(H)}],withPts=(w>0?[{x:0,y:cap,label:'Départ'},{x:w,y:cap+base*w,label:hours(w)}]:[]).concat([{x:w,y:cap+base*w-d.investment,label:'Achat payé'},{x:H,y:cap-d.investment+base*H+d.marginalHourly*(H-w),label:hours(H)}]);
   if(cross!==null&&cross>0&&cross<H){const y=cap+base*cross;withoutPts.splice(1,0,{x:cross,y:y,label:'Rattrapé'});withPts.splice(withPts.length-1,0,{x:cross,y:y,label:'Rattrapé',key:true});}
   html+='<div class="b-expert">'+chart('c-roi-compare',{title:'Avec ou sans cet achat : ton argent au fil du temps',question:'À partir de quand la situation avec l’achat dépasse-t-elle celle sans ?',xTitle:'Temps de jeu (heures)',yTitle:'Argent en poche ($)',unit:'$',xUnit:'h',series:[{name:'Sans l’achat',kind:'reference',points:withoutPts},{name:'Avec l’achat',kind:'forecast',points:withPts}],reading:d.investment===0&&cross===0?(d.marginalHourly>0?'Il ne coûte rien : dès le départ, la ligne avec l’achat monte plus vite que celle sans.':'Les deux lignes se confondent : avec ces chiffres, l’achat ne change rien à ton argent.')/* lot 3 : jamais « se croisent après 0 min » */:cross===null?'Avec ce que tu as écrit, la situation avec l’achat ne rattrape jamais celle sans : il ne se rembourse pas.':cross>H?'Il faudrait '+hours(cross)+' de jeu pour rattraper la situation sans achat, plus que le temps où tu t’en sers ('+hours(H)+').':'Les deux lignes se croisent après '+hours(cross)+' de jeu : au-delà, l’achat te laisse plus d’argent que si tu ne l’avais pas fait.',note:'Les deux lignes supposent que tu gagnes toujours pareil. Le gain « sans l’achat » vient de ton chiffre par heure ; celui « avec » ajoute seulement ce que l’achat rapporte en plus.'})+'</div>';
  }
  return html;
 }
 /* v7.49 : coût complet dans la durée (achat + usage × parties) pour plusieurs options ; point de bascule marqué.
    Une option dont le prix ou le coût d’usage est inconnu n’est pas dessinée (jamais comme 0) et le graphique le dit. */
 function costLines(id,rows,maxSessions,cross){
  const drawn=rows.filter(r=>Number.isFinite(r.initial)&&Number.isFinite(r.rate)),hidden=rows.filter(r=>drawn.indexOf(r)<0);
  if(!drawn.length||!(maxSessions>0))return '';
  const n=Math.max(1,Math.ceil(maxSessions)),xs=[0,...(cross&&cross.n>0&&cross.n<n?[cross.n]:[]),n].sort((a,b)=>a-b);
  const kinds=['opt1','opt2','opt3','opt4'];
  return chart(id,{title:'Ce que chaque option coûte en tout, partie après partie',question:'Laquelle coûte le moins sur la durée ?',xTitle:'Parties jouées',yTitle:'Coût total ($)',unit:'$',xUnit:'',area:false,legendAlways:true,optionsLegend:true,
   series:drawn.map((r,i)=>({name:r.name,kind:kinds[i%kinds.length],points:xs.map(x=>({x,y:r.initial+r.rate*x,label:x===0?'Achat':(cross&&x===cross.n?'Bascule':x+' parties'),key:cross&&x===cross.n}))})),
   reading:cross&&cross.n>0?'« '+cross.before+' » coûte moins avant '+nf.format(Math.round(cross.n*10)/10)+' parties ; au-delà, « '+cross.after+' » devient moins chère.':'Les lignes ne se croisent pas sur cet horizon : la moins chère le reste.',
   note:hidden.length?'Pas dessiné (prix ou coût d’usage inconnu, jamais compté comme 0) : '+hidden.map(r=>'« '+r.name+' »').join(', ')+'.':''});
 }
 /* v7.49 : argent dans le temps, en marches (dépense avant, récompense à la fin), argent gardé de côté et point le plus bas. */
 function cashSteps(id,points,o={}){
  if(!Array.isArray(points)||points.length<2)return '';
  const low=points.reduce((m,p)=>p.y<m.y?p:m,points[0]);
  const pts=points.map(p=>({...p,key:p===low&&p.y<points[0].y,label:p===low&&p.y<points[0].y?(p.label||'')+' · au plus bas':p.label}));
  return chart(id,{title:o.title||'Ton argent, étape par étape',question:o.question||'Quand l’argent baisse-t-il, quand remonte-t-il ?',xTitle:o.xTitle||'Temps de jeu (heures)',yTitle:'Argent en poche ($)',unit:'$',xUnit:o.xUnit===undefined?'h':o.xUnit,area:false,
   series:[{name:o.name||'Prévu avec tes chiffres',kind:o.kind||'forecast',step:true,points:pts}],thresholds:Number.isFinite(o.reserve)&&o.reserve>0?[{y:o.reserve,label:'Gardé de côté'}]:[],
   reading:o.reading||('Au plus bas : '+money(low.y)+(low.label?' ('+low.label.replace(' · au plus bas','')+')':'')+'. L’argent monte d’un coup à la fin de chaque mission, pas petit à petit.'),note:o.note||''});
 }
 /* v7.49 : chaîne du parcours, lisible sans couleur : situation → ce qui manque → comment l’obtenir → activités → solde. */
 function chain(steps,o={}){
  if(!Array.isArray(steps)||!steps.length)return '';
  const KIND={start:'Départ',acquire:'Acheter',unlock:'Débloquer',run:'Faire',goal:'But atteint',missing:'À compléter'};
  return '<figure class="c-chain" aria-label="'+esc(o.title||'Le parcours, dans l’ordre')+'"><figcaption class="c-chart-head"><strong>'+esc(o.title||'Le parcours, dans l’ordre')+'</strong><span class="c-chart-question">'+esc(o.question||'Se lit de haut en bas : chaque étape ouvre la suivante.')+'</span></figcaption><ol class="c-chain-list">'+steps.map((st,i)=>'<li class="c-chain-step is-'+esc(st.type)+'" style="--i:'+Math.min(i,12)+'"><span class="c-chain-k">'+esc(st.label||KIND[st.type]||st.type)+'</span><span class="c-chain-body"><b>'+(st.url?'<a href="'+esc(st.url)+'">'+esc(st.name)+'</a>':esc(st.name))+'</b>'+(st.detail?'<small>'+esc(st.detail)+'</small>':'')+'</span>'+(st.cash!==undefined&&st.cash!==null?'<span class="c-chain-cash">'+esc(money(st.cash))+'</span>':'')+'</li>').join('')+'</ol>'+(o.note?'<p class="calc-note">'+esc(o.note)+'</p>':'')+'</figure>';
 }
 return {progress,plot,chart,sensitivity,roi,fmt,costLines,cashSteps,chain};
}
global.LKCalcVisuals={create};
})(window);
