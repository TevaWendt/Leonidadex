/* Graphiques SVG et jauges du calculateur, construits uniquement à partir des résultats du moteur.
   v7.33 : chaque graphique a un titre qui dit la question, deux axes nommés avec leur unité, des séries
   reconnaissables sans la couleur (trait plein, tirets, pointillés, formes des points), une légende,
   une phrase de lecture et le tableau des chiffres. Prévu, réalisé et hypothèse ne se confondent pas. */
(function(global){
'use strict';
function create(h){
 const {esc,money,hours}=h,nf=new Intl.NumberFormat('de-DE',{maximumFractionDigits:2}),compact=new Intl.NumberFormat('de-DE',{notation:'compact',maximumFractionDigits:1});
 const fmt=(v,u)=>u==='$'?money(v):u==='h'?hours(v):u==='min'?hours(v/60):u==='%'?nf.format(v)+' %':nf.format(v)+(u?' '+u:'');
 const PATTERN={forecast:{dash:'',marker:'circle'},realized:{dash:'',marker:'square'},reference:{dash:'8 6',marker:'diamond'},hypothesis:{dash:'2 5',marker:'triangle'},
  /* v7.53 : motifs neutres pour distinguer des options entre elles (aucune n’est « réalisée » ni « de référence ») */
  opt1:{dash:'',marker:'circle'},opt2:{dash:'8 6',marker:'diamond'},opt3:{dash:'2 5',marker:'triangle'},opt4:{dash:'12 4 2 4',marker:'square'}};
 function marker(kind,x,y,r){x=Number(x);y=Number(y);const f=v=>Number(v.toFixed(2));if(kind==='square')return '<rect x="'+f(x-r)+'" y="'+f(y-r)+'" width="'+2*r+'" height="'+2*r+'"/>';if(kind==='diamond')return '<path d="M'+f(x)+' '+f(y-r*1.3)+'L'+f(x+r*1.3)+' '+f(y)+'L'+f(x)+' '+f(y+r*1.3)+'L'+f(x-r*1.3)+' '+f(y)+'Z"/>';if(kind==='triangle')return '<path d="M'+f(x)+' '+f(y-r*1.3)+'L'+f(x+r*1.2)+' '+f(y+r)+'L'+f(x-r*1.2)+' '+f(y+r)+'Z"/>';return '<circle cx="'+f(x)+'" cy="'+f(y)+'" r="'+r+'"/>';}
 function niceTicks(lo,hi,n){if(!(hi>lo))return [lo];const raw=(hi-lo)/n,mag=Math.pow(10,Math.floor(Math.log10(raw))),norm=raw/mag,step=(norm<1.5?1:norm<3?2:norm<7?5:10)*mag,start=Math.floor(lo/step)*step,out=[];for(let v=start;v<=hi+step*1e-6&&out.length<12;v+=step)out.push(Math.round(v/step)*step);return out;}
 function progress(id,label,value,total,explain){
  if(!Number.isFinite(value)||!Number.isFinite(total)||total<0)return '<p class="c-progress-note">'+esc(label)+': mit diesen Zahlen nicht berechenbar.</p>';
  if(total===0)return '<p class="c-progress-note">'+esc(label)+': '+(value>0?'kein Referenzbetrag, um einen Prozentsatz zu berechnen.':'kein Betrag zu decken.')+'</p>';
  const raw=value/total*100,pct=Math.max(0,Math.min(100,raw));
  return '<div class="c-progress-block"><label for="'+id+'">'+esc(label)+' <strong data-c-number="'+id+'-value">'+nf.format(raw)+' %</strong>'+(raw>100?' · schon überschritten':raw<0?' · noch nicht begonnen':'')+'</label><progress class="calc-progress" id="'+id+'" max="100" value="'+pct+'" aria-valuetext="'+esc(nf.format(raw)+' % — '+label)+'"></progress>'+(explain?'<p class="calc-note c-progress-explain">'+esc(explain)+'</p>':'')+'</div>';
 }
 /* Graphique à axes. options : {title, question, xTitle, yTitle, unit, xUnit, series:[{name,kind,points:[{x,y,label}]}], thresholds:[{y,label}], reading, note} */
 function chart(id,o){
  const series=(o.series||[]).filter(s=>s&&s.points&&s.points.length&&s.points.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)));
  if(!series.length)return '<p class="c-progress-note">'+esc(o.title||'Diagramm')+': nicht genug Zahlen, um ein ehrliches Diagramm zu zeichnen.</p>';
  const all=series.flatMap(s=>s.points),xs=all.map(p=>p.x),ys=all.map(p=>p.y).concat((o.thresholds||[]).map(t=>t.y));
  const xLo=Math.min(0,...xs),xHi=Math.max(...xs,xLo+1),yLo=Math.min(0,...ys),yHi=Math.max(...ys,yLo+1);
  const W=640,H=300,L=92,R=20,T=44,B=66,px=v=>L+(v-xLo)/(xHi-xLo||1)*(W-L-R),py=v=>T+(1-(v-yLo)/(yHi-yLo||1))*(H-T-B);
  const yt=niceTicks(yLo,yHi,4),xLabels=Array.isArray(o.xLabels)?o.xLabels:null,xt=xLabels?xLabels.map((_,i)=>i):niceTicks(xLo,xHi,5);
  const xTick=v=>xLabels?(xLabels[v]||''):o.xUnit==='h'?hours(v):nf.format(v);
  const grid=yt.map(v=>'<line class="gridline" x1="'+L+'" x2="'+(W-R)+'" y1="'+py(v).toFixed(1)+'" y2="'+py(v).toFixed(1)+'"/><text class="c-tick" x="'+(L-8)+'" y="'+(py(v)+4).toFixed(1)+'" text-anchor="end">'+esc(o.unit==='$'?(global.LKCalcEngine&&global.LKCalcEngine.dollars?global.LKCalcEngine.dollars(compact.format(v),' '):compact.format(v)+' $'):o.unit==='%'?nf.format(v)+' %':nf.format(v))+'</text>').join('')+xt.map(v=>'<line class="gridline c-grid-x" y1="'+T+'" y2="'+(H-B)+'" x1="'+px(v).toFixed(1)+'" x2="'+px(v).toFixed(1)+'"/><text class="c-tick" x="'+px(v).toFixed(1)+'" y="'+(H-B+18)+'" text-anchor="middle">'+esc(xTick(v))+'</text>').join('');
  const zero=yLo<0?'<line class="c-threshold" x1="'+L+'" x2="'+(W-R)+'" y1="'+py(0).toFixed(1)+'" y2="'+py(0).toFixed(1)+'"/>':'';
  const thresholds=(o.thresholds||[]).map(t=>'<line class="c-threshold" x1="'+L+'" x2="'+(W-R)+'" y1="'+py(t.y).toFixed(1)+'" y2="'+py(t.y).toFixed(1)+'"/><text class="c-tick c-threshold-label" x="'+(W-R)+'" y="'+(py(t.y)-5).toFixed(1)+'" text-anchor="end">'+esc(t.label)+'</text>').join('');
  const gid='g-'+String(id).replace(/[^a-z0-9_-]/gi,'');
  const defs='<defs><linearGradient id="'+gid+'" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="c-area-top"/><stop offset="1" class="c-area-bottom"/></linearGradient></defs>';
  const area=o.area!==false&&!series[0].step&&series[0]&&series[0].points.length>1&&(series[0].kind==='forecast'||series[0].kind==='hypothesis')?'<path class="c-area" fill="url(#'+gid+')" d="'+series[0].points.map((p,k)=>(k?'L':'M')+px(p.x).toFixed(1)+' '+py(p.y).toFixed(1)).join(' ')+' L'+px(series[0].points[series[0].points.length-1].x).toFixed(1)+' '+py(Math.max(yLo,0)).toFixed(1)+' L'+px(series[0].points[0].x).toFixed(1)+' '+py(Math.max(yLo,0)).toFixed(1)+' Z"/>':'';
  const paths=series.map((s,i)=>{const pt=PATTERN[s.kind]||PATTERN.forecast;
   // v7.49 : série « en marches » : l’argent reste plat puis saute au moment du paiement (jamais une pente qui ferait croire à un versement progressif).
   const d=s.step?s.points.map((p,k)=>k?'H'+px(p.x).toFixed(1)+' V'+py(p.y).toFixed(1):'M'+px(p.x).toFixed(1)+' '+py(p.y).toFixed(1)).join(' '):s.points.map((p,k)=>(k?'L':'M')+px(p.x).toFixed(1)+' '+py(p.y).toFixed(1)).join(' ');const shown=s.step?s.points.filter(p=>p.key||p.label):s.points;/* v7.49 : « dots » = points relevés, jamais reliés (on ne sait pas ce qui s’est passé entre deux). */const marks=shown.map(p=>{const text=s.name+' · '+(p.label||fmt(p.x,o.xUnit))+': '+fmt(p.y,o.unit),act=p.edit?' data-c-edit="'+esc(p.edit)+'"':p.apply?' data-c-apply="'+esc(p.apply)+'"':'';return '<g class="c-chart-point c-series-'+i+(act?' is-actionable':'')+'" tabindex="0" role="'+(act?'button':'img')+'" data-tip="'+esc(text+(p.edit?' · klicken zum Korrigieren':p.apply?' · klicken, um diese Zahl zu nutzen':''))+'" aria-label="'+esc(text)+'"'+act+'><title>'+esc(text)+'</title>'+marker(pt.marker,px(p.x).toFixed(1),py(p.y).toFixed(1),p.key||act?6.5:5)+'</g>';}).join('');return (s.points.length>1&&!s.dots?'<path class="path c-series-'+i+'" d="'+d+'"'+(pt.dash?' stroke-dasharray="'+pt.dash+'"':'')+'/>':'')+marks;}).join('');
  const legend=series.length>1||o.legendAlways?'<ul class="c-legend">'+series.map((s,i)=>{const pt=PATTERN[s.kind]||PATTERN.forecast;return '<li><svg viewBox="0 0 40 16" width="40" height="16" aria-hidden="true"><line class="path c-series-'+i+'" x1="2" x2="38" y1="8" y2="8"'+(pt.dash?' stroke-dasharray="'+pt.dash+'"':'')+'/><g class="c-chart-point c-legend-mark c-series-'+i+'">'+marker(pt.marker,20,8,4)+'</g></svg>'+esc(s.name)+(o.optionsLegend?'':s.kind==='realized'?' (tatsächlich)':s.kind==='hypothesis'?' (Annahme)':s.kind==='reference'?' (Richtwert)':'')+'</li>';}).join('')+'</ul>':'';
  const rows=[];const xsAll=[...new Set(all.map(p=>p.x))].sort((a,b)=>a-b);xsAll.forEach(x=>{rows.push('<tr><th scope="row">'+esc(xLabels?(xLabels[x]||nf.format(x)):o.xUnit==='h'?hours(x):nf.format(x)+(o.xUnit?' '+o.xUnit:''))+'</th>'+series.map(s=>{const p=s.points.filter(q=>q.x===x);return '<td>'+(p.length?p.map(q=>esc(fmt(q.y,o.unit))).join(' → '):'—')+'</td>';}).join('')+'</tr>');});
  return '<figure class="calc-chart c-chart" data-c-chart="'+esc(id)+'"><figcaption class="c-chart-head"><strong id="'+esc(id)+'-title">'+esc(o.title)+'</strong>'+(o.question?'<span class="c-chart-question">'+esc(o.question)+'</span>':'')+'</figcaption><svg viewBox="0 0 '+W+' '+H+'" role="img" aria-labelledby="'+esc(id)+'-title '+esc(id)+'-reading"><text class="c-axis-title" x="'+L+'" y="'+(T-16)+'">'+esc(o.yTitle||'')+'</text><text class="c-axis-title" x="'+(W-R)+'" y="'+(H-B+40)+'" text-anchor="end">'+esc(o.xTitle||'')+'</text>'+defs+grid+area+zero+thresholds+paths+'</svg>'+legend+'<p class="c-chart-reading" id="'+esc(id)+'-reading"><strong>Fazit:</strong> '+esc(o.reading||'')+'</p>'+(o.note?'<p class="calc-note">'+esc(o.note)+'</p>':'')+'<details class="c-chart-data"><summary>Die Zahlen des Diagramms</summary><div class="calc-table-wrap" tabindex="0"><table class="calc-table"><caption>'+esc(o.title)+'</caption><thead><tr><th scope="col">'+esc(o.xTitle||'x')+'</th>'+series.map(s=>'<th scope="col">'+esc(s.name)+'</th>').join('')+'</tr></thead><tbody>'+rows.join('')+'</tbody></table></div></details></figure>';
 }
 /* Compatibilité : courbe simple d'une série (points {label,value} ou {time,label,value}). */
 function plot(id,title,points,unit,options={}){
  if(points.length<2||points.some(p=>!Number.isFinite(p.value)))return '';
  const pts=points.map((p,i)=>({x:options.time?p.time:i,y:p.value,label:p.label,key:p.key}));
  return chart(id,{title:title,question:options.question||'',xLabels:options.time?null:points.map(p=>p.label),xTitle:options.time?'Spielzeit (Stunden)':(options.xTitle||'Schritt'),yTitle:options.yTitle||(unit==='$'?'Geld ($)':unit==='h'?'Spielzeit (Stunden)':unit==='min'?'Zeit (Minuten)':unit),unit:unit,xUnit:options.time?'h':'',series:[{name:options.seriesName||'Geplant mit deinen Zahlen',kind:options.kind||'forecast',points:pts}],thresholds:options.zero&&pts.some(p=>p.y<0)?[{y:0,label:'Wieder eingespielt'}]:[],reading:options.reading||'',note:options.note||''});
 }
 function sensitivity(tool,sens,metric,applyPath){
  if(!sens)return '';const [key,label,unit]=metric;
  if(sens.rows.some(x=>!x.result.valid||!Number.isFinite(x.result[key])))return '';
  const vals=sens.rows.map(x=>x.result[key]);
  return chart('c-sensitivity-'+tool,{title:'Was wäre, wenn sich die Zahl um 20 % ändert?',question:label,xTitle:sens.label,yTitle:label+(unit?' ('+unit+')':''),unit:unit,area:false,xLabels:sens.rows.map(x=>x.factor===1?'Deine Zahl':x.factor<1?'−20 %':'+20 %'),series:[{name:'Neu berechnetes Ergebnis',kind:'hypothesis',points:sens.rows.map((x,i)=>({x:i,y:x.result[key],label:(x.factor===1?'Deine Zahl':x.factor<1?'−20 %':'+20 %')+(x.value===null?'':' ('+nf.format(x.value)+')'),key:x.factor===1,apply:applyPath&&x.factor!==1&&x.value!==null?applyPath+'|'+x.value:null}))}],reading:'Zwischen −20 % und +20 % reicht das Ergebnis von '+fmt(Math.min(...vals),unit)+' bis '+fmt(Math.max(...vals),unit)+'. Das sind drei Neuberechnungen, keine Prognose.'+(applyPath?' Klick auf −20 % oder +20 %, um diese Zahl zu übernehmen.':'')});
 }
 function roi(s,r,d){
  if(!r.valid)return '';
  let html='<div class="c-payback"><span>Wieder eingespielt nach</span><strong data-c-number="roi-payback">'+(r.paybackHours===null?'Mit diesen Zahlen nicht erreicht':hours(r.paybackHours))+'</strong><small>'+(s.roi.mode==='continuous'?'Spielzeit, mit deiner Zahl pro Stunde':r.paybackCycles===null?'Nicht genug Missionen gefunden':nf.format(r.paybackCycles)+' erledigte Missionen')+'</small></div>';
  html+=progress('roi-progress','Bereits wieder eingespielter Anteil des Preises',r.operatingProfit,r.investment,'100 % = was der Kauf eingebracht hat, deckt seinen Startpreis ('+money(r.investment)+') in der Zeit, in der du es nutzt.');
  if(d&&d.valid&&d.hours!==null&&d.hours>0&&d.baselineHourly===null){
   // Sans le gain actuel du joueur, on ne dessine que l'avantage de l'achat : prix payé au départ, puis ce qu'il rapporte en plus.
   const H=d.hours,pts=[{x:0,y:-d.investment,label:'Kauf bezahlt'}];if(d.breakEvenHours!==null&&d.breakEvenHours>0&&d.breakEvenHours<H)pts.push({x:d.breakEvenHours,y:0,label:'Wieder eingespielt',key:true});pts.push({x:H,y:d.difference,label:hours(H)});
   html+='<div class="b-expert">'+chart('c-roi-compare',{title:'Was dir der Kauf zusätzlich lässt, abzüglich Preis',question:'Ab wann ist der Kauf wieder eingespielt?',xTitle:'Spielzeit (Stunden)',yTitle:'Vorteil durch den Kauf ($)',unit:'$',xUnit:'h',series:[{name:'Vorteil durch den Kauf',kind:'forecast',points:pts}],thresholds:[{y:0,label:'Wieder eingespielt'}],reading:d.breakEvenHours===null?'Die Linie steigt nie über null: Mit diesen Zahlen spielt sich der Kauf nicht wieder ein.':d.breakEvenHours>H?'Die Linie liegt erst nach '+hours(d.breakEvenHours)+', also nach deiner Nutzungszeit, wieder oberhalb von null.':'Die Linie steigt über null nach '+hours(d.breakEvenHours)+' Spielzeit: Ab da hat dir der Kauf mehr eingebracht, als er gekostet hat.',note:'Gib ein, was du schon pro Stunde verdienst („Mein Ziel“), um beide Situationen vollständig zu sehen, mit und ohne Kauf.'})+'</div>';
  }
  else if(d&&d.valid&&d.hours!==null&&d.hours>0){
   const H=d.hours,base=d.baselineHourly||0,cap=d.capital===undefined?0:d.capital;
   const withoutPts=[{x:0,y:cap,label:'Start'},{x:H,y:cap+base*H,label:hours(H)}],withPts=[{x:0,y:cap-d.investment,label:'Kauf bezahlt'},{x:H,y:cap-d.investment+(base+d.marginalHourly)*H,label:hours(H)}];
   if(d.breakEvenHours!==null&&d.breakEvenHours>0&&d.breakEvenHours<H){const y=cap+base*d.breakEvenHours;withoutPts.splice(1,0,{x:d.breakEvenHours,y:y,label:'Eingeholt'});withPts.splice(1,0,{x:d.breakEvenHours,y:y,label:'Eingeholt',key:true});}
   html+='<div class="b-expert">'+chart('c-roi-compare',{title:'Mit oder ohne diesen Kauf: dein Geld im Lauf der Zeit',question:'Ab wann überholt die Situation mit Kauf die ohne?',xTitle:'Spielzeit (Stunden)',yTitle:'Geld in der Tasche ($)',unit:'$',xUnit:'h',series:[{name:'Ohne den Kauf',kind:'reference',points:withoutPts},{name:'Mit dem Kauf',kind:'forecast',points:withPts}],reading:d.breakEvenHours===null?'Mit deinen Angaben holt die Situation mit Kauf die ohne nie ein: Er spielt sich nicht wieder ein.':d.breakEvenHours>H?'Es bräuchte '+hours(d.breakEvenHours)+' Spielzeit, um die Situation ohne Kauf einzuholen, mehr als die Zeit, in der du es nutzt ('+hours(H)+').':'Die beiden Linien kreuzen sich nach '+hours(d.breakEvenHours)+' Spielzeit: Danach bleibt dir mit dem Kauf mehr Geld als ohne ihn.',note:'Beide Linien nehmen an, dass du immer gleich viel verdienst. Die Einnahmen „ohne den Kauf“ kommen aus deiner Zahl pro Stunde; „mit“ addiert nur, was der Kauf zusätzlich einbringt.'})+'</div>';
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
  return chart(id,{title:'Was jede Option insgesamt kostet, Session für Session',question:'Welche kostet auf Dauer am wenigsten?',xTitle:'Gespielte Sessions',yTitle:'Gesamtkosten ($)',unit:'$',xUnit:'',area:false,legendAlways:true,optionsLegend:true,
   series:drawn.map((r,i)=>({name:r.name,kind:kinds[i%kinds.length],points:xs.map(x=>({x,y:r.initial+r.rate*x,label:x===0?'Kauf':(cross&&x===cross.n?'Wendepunkt':x+' Sessions'),key:cross&&x===cross.n}))})),
   reading:cross&&cross.n>0?'„'+cross.before+'“ kostet weniger bis '+nf.format(Math.round(cross.n*10)/10)+' Sessions; danach wird „'+cross.after+'“ günstiger.':'Die Linien kreuzen sich in diesem Zeitraum nicht: Die günstigste bleibt die günstigste.',
   note:hidden.length?'Nicht gezeichnet (Preis oder laufende Kosten unbekannt, nie als 0 gezählt): '+hidden.map(r=>'„'+r.name+'“').join(', ')+'.':''});
 }
 /* v7.49 : argent dans le temps, en marches (dépense avant, récompense à la fin), argent gardé de côté et point le plus bas. */
 function cashSteps(id,points,o={}){
  if(!Array.isArray(points)||points.length<2)return '';
  const low=points.reduce((m,p)=>p.y<m.y?p:m,points[0]);
  const pts=points.map(p=>({...p,key:p===low&&p.y<points[0].y,label:p===low&&p.y<points[0].y?(p.label||'')+' · Tiefststand':p.label}));
  return chart(id,{title:o.title||'Dein Geld, Schritt für Schritt',question:o.question||'Wann sinkt das Geld, wann steigt es wieder?',xTitle:o.xTitle||'Spielzeit (Stunden)',yTitle:'Geld in der Tasche ($)',unit:'$',xUnit:o.xUnit===undefined?'h':o.xUnit,area:false,
   series:[{name:o.name||'Geplant mit deinen Zahlen',kind:o.kind||'forecast',step:true,points:pts}],thresholds:Number.isFinite(o.reserve)&&o.reserve>0?[{y:o.reserve,label:'Zurückgelegt'}]:[],
   reading:o.reading||('Tiefster Stand: '+money(low.y)+(low.label?' ('+low.label.replace(' · Tiefststand','')+')':'')+'. Das Geld steigt am Ende jeder Mission auf einmal, nicht nach und nach.'),note:o.note||''});
 }
 /* v7.49 : chaîne du parcours, lisible sans couleur : situation → ce qui manque → comment l’obtenir → activités → solde. */
 function chain(steps,o={}){
  if(!Array.isArray(steps)||!steps.length)return '';
  const KIND={start:'Start',acquire:'Kauf von',unlock:'Freischaltung',run:'Machen',goal:'Ziel erreicht',missing:'Zu ergänzen'};
  return '<figure class="c-chain" aria-label="'+esc(o.title||'Der Weg, der Reihe nach')+'"><figcaption class="c-chart-head"><strong>'+esc(o.title||'Der Weg, der Reihe nach')+'</strong><span class="c-chart-question">'+esc(o.question||'Von oben nach unten lesen: Jeder Schritt öffnet den nächsten.')+'</span></figcaption><ol class="c-chain-list">'+steps.map((st,i)=>'<li class="c-chain-step is-'+esc(st.type)+'" style="--i:'+Math.min(i,12)+'"><span class="c-chain-k">'+esc(st.label||KIND[st.type]||st.type)+'</span><span class="c-chain-body"><b>'+(st.url?'<a href="'+esc(st.url)+'">'+esc(st.name)+'</a>':esc(st.name))+'</b>'+(st.detail?'<small>'+esc(st.detail)+'</small>':'')+'</span>'+(st.cash!==undefined&&st.cash!==null?'<span class="c-chain-cash">'+esc(money(st.cash))+'</span>':'')+'</li>').join('')+'</ol>'+(o.note?'<p class="calc-note">'+esc(o.note)+'</p>':'')+'</figure>';
 }
 return {progress,plot,chart,sensitivity,roi,fmt,costLines,cashSteps,chain};
}
global.LKCalcVisuals={create};
})(window);
