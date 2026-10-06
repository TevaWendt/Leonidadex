/* Graphiques SVG et jauges du calculateur, construits uniquement à partir des résultats du moteur.
   v7.33 : chaque graphique a un titre qui dit la question, deux axes nommés avec leur unité, des séries
   reconnaissables sans la couleur (trait plein, tirets, pointillés, formes des points), une légende,
   une phrase de lecture et le tableau des chiffres. Prévu, réalisé et hypothèse ne se confondent pas. */
(function(global){
'use strict';
function create(h){
 const {esc,money,hours}=h,nf=new Intl.NumberFormat('es-ES',{maximumFractionDigits:2}),compact=new Intl.NumberFormat('es-ES',{notation:'compact',maximumFractionDigits:1});
 const fmt=(v,u)=>u==='$'?money(v):u==='h'?hours(v):u==='min'?hours(v/60):u==='%'?nf.format(v)+' %':nf.format(v)+(u?' '+u:'');
 const PATTERN={forecast:{dash:'',marker:'circle'},realized:{dash:'',marker:'square'},reference:{dash:'8 6',marker:'diamond'},hypothesis:{dash:'2 5',marker:'triangle'},
  /* v7.53 : motifs neutres pour distinguer des options entre elles (aucune n’est « réalisée » ni « de référence ») */
  opt1:{dash:'',marker:'circle'},opt2:{dash:'8 6',marker:'diamond'},opt3:{dash:'2 5',marker:'triangle'},opt4:{dash:'12 4 2 4',marker:'square'}};
 function marker(kind,x,y,r){x=Number(x);y=Number(y);const f=v=>Number(v.toFixed(2));if(kind==='square')return '<rect x="'+f(x-r)+'" y="'+f(y-r)+'" width="'+2*r+'" height="'+2*r+'"/>';if(kind==='diamond')return '<path d="M'+f(x)+' '+f(y-r*1.3)+'L'+f(x+r*1.3)+' '+f(y)+'L'+f(x)+' '+f(y+r*1.3)+'L'+f(x-r*1.3)+' '+f(y)+'Z"/>';if(kind==='triangle')return '<path d="M'+f(x)+' '+f(y-r*1.3)+'L'+f(x+r*1.2)+' '+f(y+r)+'L'+f(x-r*1.2)+' '+f(y+r)+'Z"/>';return '<circle cx="'+f(x)+'" cy="'+f(y)+'" r="'+r+'"/>';}
 function niceTicks(lo,hi,n){if(!(hi>lo))return [lo];const raw=(hi-lo)/n,mag=Math.pow(10,Math.floor(Math.log10(raw))),norm=raw/mag,step=(norm<1.5?1:norm<3?2:norm<7?5:10)*mag,start=Math.floor(lo/step)*step,out=[];for(let v=start;v<=hi+step*1e-6&&out.length<12;v+=step)out.push(Math.round(v/step)*step);return out;}
 function progress(id,label,value,total,explain){
  if(!Number.isFinite(value)||!Number.isFinite(total)||total<0)return '<p class="c-progress-note">'+esc(label)+': no se puede calcular con estas cifras.</p>';
  if(total===0)return '<p class="c-progress-note">'+esc(label)+': '+(value>0?'no hay ninguna cantidad de referencia para calcular un porcentaje.':'no hay ninguna cantidad que cubrir.')+'</p>';
  const raw=value/total*100,pct=Math.max(0,Math.min(100,raw));
  return '<div class="c-progress-block"><label for="'+id+'">'+esc(label)+' <strong data-c-number="'+id+'-value">'+nf.format(raw)+' %</strong>'+(raw>100?' · ya superado':raw<0?' · aún sin empezar':'')+'</label><progress class="calc-progress" id="'+id+'" max="100" value="'+pct+'" aria-valuetext="'+esc(nf.format(raw)+' % — '+label)+'"></progress>'+(explain?'<p class="calc-note c-progress-explain">'+esc(explain)+'</p>':'')+'</div>';
 }
 /* Graphique à axes. options : {title, question, xTitle, yTitle, unit, xUnit, series:[{name,kind,points:[{x,y,label}]}], thresholds:[{y,label}], reading, note} */
 function chart(id,o){
  const series=(o.series||[]).filter(s=>s&&s.points&&s.points.length&&s.points.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)));
  if(!series.length)return '<p class="c-progress-note">'+esc(o.title||'Gráfico')+': no hay cifras suficientes para un gráfico honesto.</p>';
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
   const d=s.step?s.points.map((p,k)=>k?'H'+px(p.x).toFixed(1)+' V'+py(p.y).toFixed(1):'M'+px(p.x).toFixed(1)+' '+py(p.y).toFixed(1)).join(' '):s.points.map((p,k)=>(k?'L':'M')+px(p.x).toFixed(1)+' '+py(p.y).toFixed(1)).join(' ');const shown=s.step?s.points.filter(p=>p.key||p.label):s.points;/* v7.49 : « dots » = points relevés, jamais reliés (on ne sait pas ce qui s’est passé entre deux). */const marks=shown.map(p=>{const text=s.name+' · '+(p.label||fmt(p.x,o.xUnit))+': '+fmt(p.y,o.unit),act=p.edit?' data-c-edit="'+esc(p.edit)+'"':p.apply?' data-c-apply="'+esc(p.apply)+'"':'';return '<g class="c-chart-point c-series-'+i+(act?' is-actionable':'')+'" tabindex="0" role="'+(act?'button':'img')+'" data-tip="'+esc(text+(p.edit?' · haz clic para corregir':p.apply?' · haz clic para usar esta cifra':''))+'" aria-label="'+esc(text)+'"'+act+'><title>'+esc(text)+'</title>'+marker(pt.marker,px(p.x).toFixed(1),py(p.y).toFixed(1),p.key||act?6.5:5)+'</g>';}).join('');return (s.points.length>1&&!s.dots?'<path class="path c-series-'+i+'" d="'+d+'"'+(pt.dash?' stroke-dasharray="'+pt.dash+'"':'')+'/>':'')+marks;}).join('');
  const legend=series.length>1||o.legendAlways?'<ul class="c-legend">'+series.map((s,i)=>{const pt=PATTERN[s.kind]||PATTERN.forecast;return '<li><svg viewBox="0 0 40 16" width="40" height="16" aria-hidden="true"><line class="path c-series-'+i+'" x1="2" x2="38" y1="8" y2="8"'+(pt.dash?' stroke-dasharray="'+pt.dash+'"':'')+'/><g class="c-chart-point c-legend-mark c-series-'+i+'">'+marker(pt.marker,20,8,4)+'</g></svg>'+esc(s.name)+(o.optionsLegend?'':s.kind==='realized'?' (real)':s.kind==='hypothesis'?' (hipótesis)':s.kind==='reference'?' (referencia)':'')+'</li>';}).join('')+'</ul>':'';
  const rows=[];const xsAll=[...new Set(all.map(p=>p.x))].sort((a,b)=>a-b);xsAll.forEach(x=>{rows.push('<tr><th scope="row">'+esc(xLabels?(xLabels[x]||nf.format(x)):o.xUnit==='h'?hours(x):nf.format(x)+(o.xUnit?' '+o.xUnit:''))+'</th>'+series.map(s=>{const p=s.points.filter(q=>q.x===x);return '<td>'+(p.length?p.map(q=>esc(fmt(q.y,o.unit))).join(' → '):'—')+'</td>';}).join('')+'</tr>');});
  return '<figure class="calc-chart c-chart" data-c-chart="'+esc(id)+'"><figcaption class="c-chart-head"><strong id="'+esc(id)+'-title">'+esc(o.title)+'</strong>'+(o.question?'<span class="c-chart-question">'+esc(o.question)+'</span>':'')+'</figcaption><svg viewBox="0 0 '+W+' '+H+'" role="img" aria-labelledby="'+esc(id)+'-title '+esc(id)+'-reading"><text class="c-axis-title" x="'+L+'" y="'+(T-16)+'">'+esc(o.yTitle||'')+'</text><text class="c-axis-title" x="'+(W-R)+'" y="'+(H-B+40)+'" text-anchor="end">'+esc(o.xTitle||'')+'</text>'+defs+grid+area+zero+thresholds+paths+'</svg>'+legend+'<p class="c-chart-reading" id="'+esc(id)+'-reading"><strong>Lo importante:</strong> '+esc(o.reading||'')+'</p>'+(o.note?'<p class="calc-note">'+esc(o.note)+'</p>':'')+'<details class="c-chart-data"><summary>Las cifras del gráfico</summary><div class="calc-table-wrap" tabindex="0"><table class="calc-table"><caption>'+esc(o.title)+'</caption><thead><tr><th scope="col">'+esc(o.xTitle||'x')+'</th>'+series.map(s=>'<th scope="col">'+esc(s.name)+'</th>').join('')+'</tr></thead><tbody>'+rows.join('')+'</tbody></table></div></details></figure>';
 }
 /* Compatibilité : courbe simple d'une série (points {label,value} ou {time,label,value}). */
 function plot(id,title,points,unit,options={}){
  if(points.length<2||points.some(p=>!Number.isFinite(p.value)))return '';
  const pts=points.map((p,i)=>({x:options.time?p.time:i,y:p.value,label:p.label,key:p.key}));
  return chart(id,{title:title,question:options.question||'',xLabels:options.time?null:points.map(p=>p.label),xTitle:options.time?'Tiempo de juego (horas)':(options.xTitle||'Etapa'),yTitle:options.yTitle||(unit==='$'?'Dinero ($)':unit==='h'?'Tiempo de juego (horas)':unit==='min'?'Tiempo (minutos)':unit),unit:unit,xUnit:options.time?'h':'',series:[{name:options.seriesName||'Previsto con tus cifras',kind:options.kind||'forecast',points:pts}],thresholds:options.zero&&pts.some(p=>p.y<0)?[{y:0,label:'Recuperado'}]:[],reading:options.reading||'',note:options.note||''});
 }
 function sensitivity(tool,sens,metric,applyPath){
  if(!sens)return '';const [key,label,unit]=metric;
  if(sens.rows.some(x=>!x.result.valid||!Number.isFinite(x.result[key])))return '';
  const vals=sens.rows.map(x=>x.result[key]);
  return chart('c-sensitivity-'+tool,{title:'¿Y si la cifra cambia un 20 %?',question:label,xTitle:sens.label,yTitle:label+(unit?' ('+unit+')':''),unit:unit,area:false,xLabels:sens.rows.map(x=>x.factor===1?'Tu cifra':x.factor<1?'−20 %':'+20 %'),series:[{name:'Resultado recalculado',kind:'hypothesis',points:sens.rows.map((x,i)=>({x:i,y:x.result[key],label:(x.factor===1?'Tu cifra':x.factor<1?'−20 %':'+20 %')+(x.value===null?'':' ('+nf.format(x.value)+')'),key:x.factor===1,apply:applyPath&&x.factor!==1&&x.value!==null?applyPath+'|'+x.value:null}))}],reading:'Entre −20 % y +20 %, el resultado va de '+fmt(Math.min(...vals),unit)+' a '+fmt(Math.max(...vals),unit)+'. Son tres recálculos, no una previsión.'+(applyPath?' Haz clic en −20 % o +20 % para usar esa cifra.':'')});
 }
 function roi(s,r,d){
  if(!r.valid)return '';
  /* lot 3 (scénario I) : nouvelle activité avec ton gain actuel connu : le remboursement compte ce que tu aurais gagné de toute façon
     (même chiffre que la réponse) ; un achat gratuit n’a rien à rembourser (jamais « 0 min ») */
  const marg=s.roi.mode==='new'&&Number.isFinite(r.baselineHourly)&&Number.isFinite(r.marginalProfit),pbH=marg?r.marginalPaybackHours:r.paybackHours,pbC=marg?r.marginalPaybackCycles:r.paybackCycles;
  let html='<div class="c-payback"><span>Recuperado tras</span><strong data-c-number="roi-payback">'+(pbH===null||pbH===undefined?'No se alcanza con estas cifras':r.investment===0&&pbH===0?'Nada que recuperar':hours(pbH))+'</strong><small>'+(s.roi.mode==='continuous'?'de juego, con tu cifra por hora':pbC===null||pbC===undefined?'No se han encontrado suficientes misiones':nf.format(pbC)+(/* lot 5 (seconde relecture) : « 1 mission faite », plus « 1 missions faites » */(global.LKCalcEngine&&global.LKCalcEngine.plural?global.LKCalcEngine.plural(pbC):pbC>1)?' misiones completadas':' misión completada'))+'</small></div>';
  html+=progress('roi-progress','Parte del precio ya recuperada',marg?r.marginalProfit:r.operatingProfit,r.investment,'100 % = lo que ha generado la compra cubre su precio inicial ('+money(r.investment)+') durante el tiempo que lo usas.');
  if(d&&d.valid&&d.hours!==null&&d.hours>0&&d.baselineHourly===null&&d.difference!==null){ /* lot 3 : sans moment d’achat connu (attente inconnue), pas de courbe */
   // Sans le gain actuel du joueur, on ne dessine que l'avantage de l'achat : prix payé au départ, puis ce qu'il rapporte en plus.
   const H=d.hours,pts=[{x:0,y:-d.investment,label:'Compra pagada'}];if(d.breakEvenHours!==null&&d.breakEvenHours>0&&d.breakEvenHours<H)pts.push({x:d.breakEvenHours,y:0,label:'Recuperado',key:true});pts.push({x:H,y:d.difference,label:hours(H)});
   html+='<div class="b-expert">'+chart('c-roi-compare',{title:'Lo que la compra te deja de más, sin contar el precio',question:'¿A partir de cuándo se recupera la compra?',xTitle:'Tiempo de juego (horas)',yTitle:'Ventaja de la compra ($)',unit:'$',xUnit:'h',series:[{name:'Ventaja de la compra',kind:'forecast',points:pts}],thresholds:[{y:0,label:'Recuperado'}],reading:d.investment===0&&d.breakEvenHours===0?(d.marginalHourly>0?'No cuesta nada: la línea parte de cero y sube desde el principio.':'La línea se queda en cero: con estas cifras, la compra no cambia nada.')/* lot 3 : jamais « après 0 min » */:d.breakEvenHours===null?'La línea nunca vuelve a subir por encima de cero: la compra no se recupera con estas cifras.':d.breakEvenHours>H?'La línea solo vuelve a pasar por encima de cero tras '+hours(d.breakEvenHours)+', más allá del tiempo que lo usas.':'La línea pasa por encima de cero tras '+hours(d.breakEvenHours)+' de juego: a partir de ahí, la compra te ha dado más de lo que ha costado.',note:'Escribe lo que ya ganas por hora (Mi objetivo) para ver las dos situaciones completas, con y sin la compra.'})+'</div>';
  }
  /* lot 3 : pas assez d’argent au départ : l’achat est payé quand l’argent est là (waitHours du moteur) ; s’il ne l’est pas avant la fin, pas de courbe « avec » */
  else if(d&&d.valid&&d.hours!==null&&d.hours>0&&d.marginalHourly!==null&&(!(d.shortfall>0)||(d.thresholds&&d.thresholds.waitHours!==null&&d.thresholds.waitHours<d.hours))){
   const H=d.hours,base=d.baselineHourly||0,cap=d.capital===undefined?0:d.capital,w=d.shortfall>0?d.thresholds.waitHours:0,cross=d.breakEvenHours===null?null:w+d.breakEvenHours;
   const withoutPts=[{x:0,y:cap,label:'Inicio'},{x:H,y:cap+base*H,label:hours(H)}],withPts=(w>0?[{x:0,y:cap,label:'Inicio'},{x:w,y:cap+base*w,label:hours(w)}]:[]).concat([{x:w,y:cap+base*w-d.investment,label:'Compra pagada'},{x:H,y:cap-d.investment+base*H+d.marginalHourly*(H-w),label:hours(H)}]);
   if(cross!==null&&cross>0&&cross<H){const y=cap+base*cross;withoutPts.splice(1,0,{x:cross,y:y,label:'Alcanzado'});withPts.splice(withPts.length-1,0,{x:cross,y:y,label:'Alcanzado',key:true});}
   html+='<div class="b-expert">'+chart('c-roi-compare',{title:'Con o sin esta compra: tu dinero a lo largo del tiempo',question:'¿A partir de cuándo la situación con la compra supera a la situación sin ella?',xTitle:'Tiempo de juego (horas)',yTitle:'Dinero en el bolsillo ($)',unit:'$',xUnit:'h',series:[{name:'Sin la compra',kind:'reference',points:withoutPts},{name:'Con la compra',kind:'forecast',points:withPts}],reading:d.investment===0&&cross===0?(d.marginalHourly>0?'No cuesta nada: desde el principio, la línea con la compra sube más rápido que la línea sin ella.':'Las dos líneas coinciden: con estas cifras, la compra no cambia tu dinero.')/* lot 3 : jamais « se croisent après 0 min » */:cross===null?'Con lo que has escrito, la situación con la compra nunca alcanza a la situación sin ella: no se recupera.':cross>H?'Harían falta '+hours(cross)+' de juego para alcanzar la situación sin compra, más que el tiempo que lo usas ('+hours(H)+').':'Las dos líneas se cruzan tras '+hours(cross)+' de juego: a partir de ahí, la compra te deja más dinero que si no la hubieras hecho.',note:'Las dos líneas suponen que siempre ganas lo mismo. La ganancia “sin la compra” sale de tu cifra por hora; la de “con” solo añade lo que la compra te da de más.'})+'</div>';
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
  return chart(id,{title:'Lo que cuesta cada opción en total, partida tras partida',question:'¿Cuál cuesta menos a largo plazo?',xTitle:'Partidas jugadas',yTitle:'Coste total ($)',unit:'$',xUnit:'',area:false,legendAlways:true,optionsLegend:true,
   series:drawn.map((r,i)=>({name:r.name,kind:kinds[i%kinds.length],points:xs.map(x=>({x,y:r.initial+r.rate*x,label:x===0?'Compra':(cross&&x===cross.n?'Punto de cruce':x+' partidas'),key:cross&&x===cross.n}))})),
   reading:cross&&cross.n>0?'“'+cross.before+'” cuesta menos antes de '+nf.format(Math.round(cross.n*10)/10)+' partidas; a partir de ahí, “'+cross.after+'” pasa a costar menos.':'Las líneas no se cruzan en este horizonte: la más barata sigue siéndolo.',
   note:hidden.length?'No dibujado (precio o coste de uso desconocido, nunca contado como 0): '+hidden.map(r=>'“'+r.name+'”').join(', ')+'.':''});
 }
 /* v7.49 : argent dans le temps, en marches (dépense avant, récompense à la fin), argent gardé de côté et point le plus bas. */
 function cashSteps(id,points,o={}){
  if(!Array.isArray(points)||points.length<2)return '';
  const low=points.reduce((m,p)=>p.y<m.y?p:m,points[0]);
  const pts=points.map(p=>({...p,key:p===low&&p.y<points[0].y,label:p===low&&p.y<points[0].y?(p.label||'')+' · punto más bajo':p.label}));
  return chart(id,{title:o.title||'Tu dinero, paso a paso',question:o.question||'¿Cuándo baja el dinero y cuándo vuelve a subir?',xTitle:o.xTitle||'Tiempo de juego (horas)',yTitle:'Dinero en el bolsillo ($)',unit:'$',xUnit:o.xUnit===undefined?'h':o.xUnit,area:false,
   series:[{name:o.name||'Previsto con tus cifras',kind:o.kind||'forecast',step:true,points:pts}],thresholds:Number.isFinite(o.reserve)&&o.reserve>0?[{y:o.reserve,label:'Apartado'}]:[],
   reading:o.reading||('En el punto más bajo: '+money(low.y)+(low.label?' ('+low.label.replace(' · punto más bajo','')+')':'')+'. El dinero sube de golpe al final de cada misión, no poco a poco.'),note:o.note||''});
 }
 /* v7.49 : chaîne du parcours, lisible sans couleur : situation → ce qui manque → comment l’obtenir → activités → solde. */
 function chain(steps,o={}){
  if(!Array.isArray(steps)||!steps.length)return '';
  const KIND={start:'Inicio',acquire:'Comprar',unlock:'Desbloquear',run:'Hacer',goal:'Objetivo alcanzado',missing:'Por completar'};
  return '<figure class="c-chain" aria-label="'+esc(o.title||'El recorrido, en orden')+'"><figcaption class="c-chart-head"><strong>'+esc(o.title||'El recorrido, en orden')+'</strong><span class="c-chart-question">'+esc(o.question||'Se lee de arriba abajo: cada etapa abre la siguiente.')+'</span></figcaption><ol class="c-chain-list">'+steps.map((st,i)=>'<li class="c-chain-step is-'+esc(st.type)+'" style="--i:'+Math.min(i,12)+'"><span class="c-chain-k">'+esc(st.label||KIND[st.type]||st.type)+'</span><span class="c-chain-body"><b>'+(st.url?'<a href="'+esc(st.url)+'">'+esc(st.name)+'</a>':esc(st.name))+'</b>'+(st.detail?'<small>'+esc(st.detail)+'</small>':'')+'</span>'+(st.cash!==undefined&&st.cash!==null?'<span class="c-chain-cash">'+esc(money(st.cash))+'</span>':'')+'</li>').join('')+'</ol>'+(o.note?'<p class="calc-note">'+esc(o.note)+'</p>':'')+'</figure>';
 }
 return {progress,plot,chart,sensitivity,roi,fmt,costLines,cashSteps,chain};
}
global.LKCalcVisuals={create};
})(window);
