/* Généré depuis outils/sources/calculateurs-visuals.js : modifie la source, pas ce fichier. */
(function(global){
'use strict';
const roiModeOf=s=>global.LKCalcScenario&&global.LKCalcScenario.roiMode?global.LKCalcScenario.roiMode(s):s.roi.mode;
function create(h){
 const {esc,money,hours}=h,nf=new Intl.NumberFormat('pt-BR',{maximumFractionDigits:2}),compact=new Intl.NumberFormat('pt-BR',{notation:'compact',maximumFractionDigits:1});
 const fmt=(v,u)=>u==='$'?money(v):u==='h'?hours(v):u==='min'?hours(v/60):u==='%'?nf.format(v)+'%':nf.format(v)+(u?' '+u:'');
 const PATTERN={forecast:{dash:'',marker:'circle'},realized:{dash:'',marker:'square'},reference:{dash:'8 6',marker:'diamond'},hypothesis:{dash:'2 5',marker:'triangle'},
  opt1:{dash:'',marker:'circle'},opt2:{dash:'8 6',marker:'diamond'},opt3:{dash:'2 5',marker:'triangle'},opt4:{dash:'12 4 2 4',marker:'square'}};
 function marker(kind,x,y,r){x=Number(x);y=Number(y);const f=v=>Number(v.toFixed(2));if(kind==='square')return '<rect x="'+f(x-r)+'" y="'+f(y-r)+'" width="'+2*r+'" height="'+2*r+'"/>';if(kind==='diamond')return '<path d="M'+f(x)+' '+f(y-r*1.3)+'L'+f(x+r*1.3)+' '+f(y)+'L'+f(x)+' '+f(y+r*1.3)+'L'+f(x-r*1.3)+' '+f(y)+'Z"/>';if(kind==='triangle')return '<path d="M'+f(x)+' '+f(y-r*1.3)+'L'+f(x+r*1.2)+' '+f(y+r)+'L'+f(x-r*1.2)+' '+f(y+r)+'Z"/>';return '<circle cx="'+f(x)+'" cy="'+f(y)+'" r="'+r+'"/>';}
 function niceTicks(lo,hi,n){if(!(hi>lo))return [lo];const raw=(hi-lo)/n,mag=Math.pow(10,Math.floor(Math.log10(raw))),norm=raw/mag,step=(norm<1.5?1:norm<3?2:norm<7?5:10)*mag,start=Math.floor(lo/step)*step,out=[];for(let v=start;v<=hi+step*1e-6&&out.length<12;v+=step)out.push(Math.round(v/step)*step);return out;}
 function progress(id,label,value,total,explain){
  if(!Number.isFinite(value)||!Number.isFinite(total)||total<0)return '<p class="c-progress-note">'+esc(label)+': não dá para calcular com esses números.</p>';
  if(total===0)return '<p class="c-progress-note">'+esc(label)+': '+(value>0?'nenhum valor de referência disponível para calcular uma porcentagem.':'nenhum valor a cobrir.')+'</p>';
  const raw=value/total*100,pct=Math.max(0,Math.min(100,raw));
  return '<div class="c-progress-block"><label for="'+id+'">'+esc(label)+' <strong data-c-number="'+id+'-value">'+nf.format(raw)+'%</strong>'+(raw>100?', já ultrapassado':raw<0?', ainda não começou':'')+'</label><progress class="calc-progress" id="'+id+'" max="100" value="'+pct+'" aria-valuetext="'+esc(nf.format(raw)+'%, '+label)+'"></progress>'+(explain?'<p class="calc-note c-progress-explain">'+esc(explain)+'</p>':'')+'</div>';
 }
 function chart(id,o){
  const series=(o.series||[]).filter(s=>s&&s.points&&s.points.length&&s.points.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)));
  if(!series.length)return '<p class="c-progress-note">'+esc(o.title||'Gráfico')+': não há números suficientes para um gráfico honesto.</p>';
  const all=series.flatMap(s=>s.points),xs=all.map(p=>p.x),ys=all.map(p=>p.y).concat((o.thresholds||[]).map(t=>t.y));
  const xLo=Math.min(0,...xs),xHi=Math.max(...xs,xLo+1),yLo=Math.min(0,...ys),yHi=Math.max(...ys,yLo+1);
  const W=640,H=300,L=92,R=20,T=44,B=66,px=v=>L+(v-xLo)/(xHi-xLo||1)*(W-L-R),py=v=>T+(1-(v-yLo)/(yHi-yLo||1))*(H-T-B);
  const yt=niceTicks(yLo,yHi,4),xLabels=Array.isArray(o.xLabels)?o.xLabels:null,xt=xLabels?xLabels.map((_,i)=>i):niceTicks(xLo,xHi,5);
  const xTick=v=>xLabels?(xLabels[v]||''):o.xUnit==='h'?hours(v):nf.format(v);
  const grid=yt.map(v=>'<line class="gridline" x1="'+L+'" x2="'+(W-R)+'" y1="'+py(v).toFixed(1)+'" y2="'+py(v).toFixed(1)+'"/><text class="c-tick" x="'+(L-8)+'" y="'+(py(v)+4).toFixed(1)+'" text-anchor="end">'+esc(o.unit==='$'?(global.LKCalcEngine&&global.LKCalcEngine.dollars?global.LKCalcEngine.dollars(compact.format(v),' '):compact.format(v)+' $'):o.unit==='%'?nf.format(v)+'%':nf.format(v))+'</text>').join('')+xt.map(v=>'<line class="gridline c-grid-x" y1="'+T+'" y2="'+(H-B)+'" x1="'+px(v).toFixed(1)+'" x2="'+px(v).toFixed(1)+'"/><text class="c-tick" x="'+px(v).toFixed(1)+'" y="'+(H-B+18)+'" text-anchor="middle">'+esc(xTick(v))+'</text>').join('');
  const zero=yLo<0?'<line class="c-threshold" x1="'+L+'" x2="'+(W-R)+'" y1="'+py(0).toFixed(1)+'" y2="'+py(0).toFixed(1)+'"/>':'';
  const thresholds=(o.thresholds||[]).map(t=>'<line class="c-threshold" x1="'+L+'" x2="'+(W-R)+'" y1="'+py(t.y).toFixed(1)+'" y2="'+py(t.y).toFixed(1)+'"/><text class="c-tick c-threshold-label" x="'+(W-R)+'" y="'+(py(t.y)-5).toFixed(1)+'" text-anchor="end">'+esc(t.label)+'</text>').join('');
  const gid='g-'+String(id).replace(/[^a-z0-9_-]/gi,'');
  const defs='<defs><linearGradient id="'+gid+'" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="c-area-top"/><stop offset="1" class="c-area-bottom"/></linearGradient></defs>';
  const area=o.area!==false&&!series[0].step&&series[0]&&series[0].points.length>1&&(series[0].kind==='forecast'||series[0].kind==='hypothesis')?'<path class="c-area" fill="url(#'+gid+')" d="'+series[0].points.map((p,k)=>(k?'L':'M')+px(p.x).toFixed(1)+' '+py(p.y).toFixed(1)).join(' ')+' L'+px(series[0].points[series[0].points.length-1].x).toFixed(1)+' '+py(Math.max(yLo,0)).toFixed(1)+' L'+px(series[0].points[0].x).toFixed(1)+' '+py(Math.max(yLo,0)).toFixed(1)+' Z"/>':'';
  const paths=series.map((s,i)=>{const pt=PATTERN[s.kind]||PATTERN.forecast;
   const d=s.step?s.points.map((p,k)=>k?'H'+px(p.x).toFixed(1)+' V'+py(p.y).toFixed(1):'M'+px(p.x).toFixed(1)+' '+py(p.y).toFixed(1)).join(' '):s.points.map((p,k)=>(k?'L':'M')+px(p.x).toFixed(1)+' '+py(p.y).toFixed(1)).join(' ');const shown=s.step?s.points.filter(p=>p.key||p.label):s.points;const marks=shown.map(p=>{const text=s.name+', '+(p.label||fmt(p.x,o.xUnit))+': '+fmt(p.y,o.unit),act=p.edit?' data-c-edit="'+esc(p.edit)+'"':p.apply?' data-c-apply="'+esc(p.apply)+'"':'';return '<g class="c-chart-point c-series-'+i+(act?' is-actionable':'')+'" tabindex="0" role="'+(act?'button':'img')+'" data-tip="'+esc(text+(p.edit?'. Clique para corrigir':p.apply?'. Clique para usar este número':''))+'" aria-label="'+esc(text)+'"'+act+'><title>'+esc(text)+'</title>'+marker(pt.marker,px(p.x).toFixed(1),py(p.y).toFixed(1),p.key||act?6.5:5)+'</g>';}).join('');return (s.points.length>1&&!s.dots?'<path class="path c-series-'+i+'" d="'+d+'"'+(pt.dash?' stroke-dasharray="'+pt.dash+'"':'')+'/>':'')+marks;}).join('');
  const legend=series.length>1||o.legendAlways?'<ul class="c-legend">'+series.map((s,i)=>{const pt=PATTERN[s.kind]||PATTERN.forecast;return '<li><svg viewBox="0 0 40 16" width="40" height="16" aria-hidden="true"><line class="path c-series-'+i+'" x1="2" x2="38" y1="8" y2="8"'+(pt.dash?' stroke-dasharray="'+pt.dash+'"':'')+'/><g class="c-chart-point c-legend-mark c-series-'+i+'">'+marker(pt.marker,20,8,4)+'</g></svg>'+esc(s.name)+(o.optionsLegend?'':s.kind==='realized'?' (real)':s.kind==='hypothesis'?' (hipótese)':s.kind==='reference'?' (referência)':'')+'</li>';}).join('')+'</ul>':'';
  const rows=[];const xsAll=[...new Set(all.map(p=>p.x))].sort((a,b)=>a-b);xsAll.forEach(x=>{rows.push('<tr><th scope="row">'+esc(xLabels?(xLabels[x]||nf.format(x)):o.xUnit==='h'?hours(x):nf.format(x)+(o.xUnit?' '+o.xUnit:''))+'</th>'+series.map(s=>{const p=s.points.filter(q=>q.x===x);return '<td>'+(p.length?p.map(q=>esc(fmt(q.y,o.unit))).join(', depois '):'—')+'</td>';}).join('')+'</tr>');});
  return '<figure class="calc-chart c-chart" data-c-chart="'+esc(id)+'"><figcaption class="c-chart-head"><strong id="'+esc(id)+'-title">'+esc(o.title)+'</strong>'+(o.question?'<span class="c-chart-question">'+esc(o.question)+'</span>':'')+'</figcaption><svg viewBox="0 0 '+W+' '+H+'" role="img" aria-labelledby="'+esc(id)+'-title '+esc(id)+'-reading"><text class="c-axis-title" x="'+L+'" y="'+(T-16)+'">'+esc(o.yTitle||'')+'</text><text class="c-axis-title" x="'+(W-R)+'" y="'+(H-B+40)+'" text-anchor="end">'+esc(o.xTitle||'')+'</text>'+defs+grid+area+zero+thresholds+paths+'</svg>'+legend+'<p class="c-chart-reading" id="'+esc(id)+'-reading"><strong>Para lembrar:</strong> '+esc(o.reading||'')+'</p>'+(o.note?'<p class="calc-note">'+esc(o.note)+'</p>':'')+'<details class="c-chart-data"><summary>Os números do gráfico</summary><div class="calc-table-wrap" tabindex="0"><table class="calc-table"><caption>'+esc(o.title)+'</caption><thead><tr><th scope="col">'+esc(o.xTitle||'x')+'</th>'+series.map(s=>'<th scope="col">'+esc(s.name)+'</th>').join('')+'</tr></thead><tbody>'+rows.join('')+'</tbody></table></div></details></figure>';
 }
 function plot(id,title,points,unit,options={}){
  if(points.length<2||points.some(p=>!Number.isFinite(p.value)))return '';
  const pts=points.map((p,i)=>({x:options.time?p.time:i,y:p.value,label:p.label,key:p.key}));
  return chart(id,{title:title,question:options.question||'',xLabels:options.time?null:points.map(p=>p.label),xTitle:options.time?'Tempo de jogo (horas)':(options.xTitle||'Etapa'),yTitle:options.yTitle||(unit==='$'?'Dinheiro ($)':unit==='h'?'Tempo de jogo (horas)':unit==='min'?'Tempo (minutos)':unit),unit:unit,xUnit:options.time?'h':'',series:[{name:options.seriesName||'Previsto com seus números',kind:options.kind||'forecast',points:pts}],thresholds:options.zero&&pts.some(p=>p.y<0)?[{y:0,label:'Recuperado'}]:[],reading:options.reading||'',note:options.note||''});
 }
 function sensitivity(tool,sens,metric,applyPath){
  if(!sens)return '';const [key,label,unit]=metric;
  if(sens.rows.some(x=>!x.result.valid||!Number.isFinite(x.result[key])))return '';
  const vals=sens.rows.map(x=>x.result[key]);
  return chart('c-sensitivity-'+tool,{title:'E se o número variar 20%?',question:label,xTitle:sens.label,yTitle:label+(unit?' ('+unit+')':''),unit:unit,area:false,xLabels:sens.rows.map(x=>x.factor===1?'Seu número':x.factor<1?'−20 %':'+20 %'),series:[{name:'Resultado recalculado',kind:'hypothesis',points:sens.rows.map((x,i)=>({x:i,y:x.result[key],label:(x.factor===1?'Seu número':x.factor<1?'−20 %':'+20 %')+(x.value===null?'':' ('+nf.format(x.value)+')'),key:x.factor===1,apply:applyPath&&x.factor!==1&&x.value!==null?applyPath+'|'+x.value:null}))}],reading:'Entre −20% e +20%, o resultado vai de '+fmt(Math.min(...vals),unit)+' a '+fmt(Math.max(...vals),unit)+'. São três novos cálculos, não uma previsão.'+(applyPath?' Clique em −20% ou +20% para adotar esse número.':'')});
 }
 function roi(s,r,d){
  if(!r.valid)return '';
  const marg=roiModeOf(s)==='new'&&Number.isFinite(r.baselineHourly)&&Number.isFinite(r.marginalProfit),pbH=marg?r.marginalPaybackHours:r.paybackHours,pbC=marg?r.marginalPaybackCycles:r.paybackCycles;
  let html='<div class="c-payback"><span>Se paga após</span><strong data-c-number="roi-payback">'+(pbH===null||pbH===undefined?'Não alcançado com esses números':r.investment===0&&pbH===0?'Nada a recuperar':hours(pbH))+'</strong><small>'+(roiModeOf(s)==='continuous'?'de jogo, com o seu número por hora':pbC===null||pbC===undefined?'Não foram encontradas missões suficientes':nf.format(pbC)+((global.LKCalcEngine&&global.LKCalcEngine.plural?global.LKCalcEngine.plural(pbC):pbC>1)?' missões feitas':' missão concluída'))+'</small></div>';
  html+=progress('roi-progress','Parte do preço já recuperada',marg?r.marginalProfit:r.operatingProfit,r.investment,'100% = o que a compra rendeu cobre o preço inicial dela ('+money(r.investment)+') durante o tempo em que você usa a compra.');
  if(d&&d.valid&&d.hours!==null&&d.hours>0&&d.baselineHourly===null&&d.difference!==null){
   const H=d.hours,pts=[{x:0,y:-d.investment,label:'Compra paga'}];if(d.breakEvenHours!==null&&d.breakEvenHours>0&&d.breakEvenHours<H)pts.push({x:d.breakEvenHours,y:0,label:'Recuperado',key:true});pts.push({x:H,y:d.difference,label:hours(H)});
   html+='<div class="b-expert">'+chart('c-roi-compare',{title:'O que a compra deixa para você a mais, descontado o preço',question:'A partir de quando a compra se paga?',xTitle:'Tempo de jogo (horas)',yTitle:'Vantagem da compra ($)',unit:'$',xUnit:'h',series:[{name:'Vantagem da compra',kind:'forecast',points:pts}],thresholds:[{y:0,label:'Recuperado'}],reading:d.investment===0&&d.breakEvenHours===0?(d.marginalHourly>0?'Não custa nada: a linha parte de zero e sobe desde o início.':'A linha fica em zero: com esses números, a compra não muda nada.'):d.breakEvenHours===null?'A linha nunca volta a ficar acima de zero: a compra não se paga com esses números.':d.breakEvenHours>H?'A linha só volta a passar de zero depois de '+hours(d.breakEvenHours)+', mais tarde do que o tempo em que você usa a compra.':'A linha passa de zero depois de '+hours(d.breakEvenHours)+' de jogo: a partir daí, a compra rendeu mais do que custou.',note:'Escreva o que você já ganha por hora (Meu objetivo) para ver as duas situações completas, com e sem a compra.'})+'</div>';
  }
  else if(d&&d.valid&&d.hours!==null&&d.hours>0&&d.marginalHourly!==null&&(!(d.shortfall>0)||(d.thresholds&&d.thresholds.waitHours!==null&&d.thresholds.waitHours<d.hours))){
   const H=d.hours,base=d.baselineHourly||0,cap=d.capital===undefined?0:d.capital,w=d.shortfall>0?d.thresholds.waitHours:0,cross=d.breakEvenHours===null?null:w+d.breakEvenHours;
   const withoutPts=[{x:0,y:cap,label:'Início'},{x:H,y:cap+base*H,label:hours(H)}],withPts=(w>0?[{x:0,y:cap,label:'Início'},{x:w,y:cap+base*w,label:hours(w)}]:[]).concat([{x:w,y:cap+base*w-d.investment,label:'Compra paga'},{x:H,y:cap-d.investment+base*H+d.marginalHourly*(H-w),label:hours(H)}]);
   if(cross!==null&&cross>0&&cross<H){const y=cap+base*cross;withoutPts.splice(1,0,{x:cross,y:y,label:'Alcançado'});withPts.splice(withPts.length-1,0,{x:cross,y:y,label:'Alcançado',key:true});}
   html+='<div class="b-expert">'+chart('c-roi-compare',{title:'Com ou sem esta compra: seu dinheiro ao longo do tempo',question:'A partir de quando a situação com a compra ultrapassa a situação sem ela?',xTitle:'Tempo de jogo (horas)',yTitle:'Dinheiro no bolso ($)',unit:'$',xUnit:'h',series:[{name:'Sem a compra',kind:'reference',points:withoutPts},{name:'Com a compra',kind:'forecast',points:withPts}],reading:d.investment===0&&cross===0?(d.marginalHourly>0?'Não custa nada: desde o início, a linha com a compra sobe mais rápido que a linha sem ela.':'As duas linhas se sobrepõem: com esses números, a compra não muda seu dinheiro.'):cross===null?'Com o que você escreveu, a situação com a compra nunca alcança a situação sem ela: a compra não se paga.':cross>H?'Você precisaria de '+hours(cross)+' de jogo para alcançar a situação sem compra, mais do que o tempo em que você usa a compra ('+hours(H)+').':'As duas linhas se cruzam depois de '+hours(cross)+' de jogo: depois disso, a compra deixa você com mais dinheiro do que se não a tivesse feito.',note:'As duas linhas supõem que você sempre ganha o mesmo. O ganho “sem a compra” vem do seu número por hora; o “com a compra” só soma o que a compra rende a mais.'})+'</div>';
  }
  return html;
 }
 function costLines(id,rows,maxSessions,cross){
  const drawn=rows.filter(r=>Number.isFinite(r.initial)&&Number.isFinite(r.rate)),hidden=rows.filter(r=>drawn.indexOf(r)<0);
  if(!drawn.length||!(maxSessions>0))return '';
  const n=Math.max(1,Math.ceil(maxSessions)),xs=[0,...(cross&&cross.n>0&&cross.n<n?[cross.n]:[]),n].sort((a,b)=>a-b);
  const kinds=['opt1','opt2','opt3','opt4'];
  return chart(id,{title:'Quanto cada opção custa no total, sessão após sessão',question:'Qual custa menos ao longo do tempo?',xTitle:'Sessões jogadas',yTitle:'Custo total ($)',unit:'$',xUnit:'',area:false,legendAlways:true,optionsLegend:true,
   series:drawn.map((r,i)=>({name:r.name,kind:kinds[i%kinds.length],points:xs.map(x=>({x,y:r.initial+r.rate*x,label:x===0?'Compra':(cross&&x===cross.n?'Ponto de virada':x+' sessões'),key:cross&&x===cross.n}))})),
   reading:cross&&cross.n>0?'“'+cross.before+'” custa menos antes de '+nf.format(Math.round(cross.n*10)/10)+' sessões; depois disso, “'+cross.after+'” passa a custar menos.':'As linhas não se cruzam neste período: a mais barata continua sendo a mais barata.',
   note:hidden.length?'Não desenhado (preço ou custo de uso desconhecido, nunca contado como 0): '+hidden.map(r=>'“'+r.name+'”').join(', ')+'.':''});
 }
 function cashSteps(id,points,o={}){
  if(!Array.isArray(points)||points.length<2)return '';
  const low=points.reduce((m,p)=>p.y<m.y?p:m,points[0]);
  const pts=points.map(p=>({...p,key:p===low&&p.y<points[0].y,label:p===low&&p.y<points[0].y?(p.label||'')+', no ponto mais baixo':p.label}));
  return chart(id,{title:o.title||'Seu dinheiro, etapa por etapa',question:o.question||'Quando o dinheiro cai e quando volta a subir?',xTitle:o.xTitle||'Tempo de jogo (horas)',yTitle:'Dinheiro no bolso ($)',unit:'$',xUnit:o.xUnit===undefined?'h':o.xUnit,area:false,
   series:[{name:o.name||'Previsto com seus números',kind:o.kind||'forecast',step:true,points:pts}],thresholds:Number.isFinite(o.reserve)&&o.reserve>0?[{y:o.reserve,label:'Guardado'}]:[],
   reading:o.reading||('No ponto mais baixo: '+money(low.y)+(low.label?' ('+low.label.replace(', no ponto mais baixo','')+')':'')+'. O dinheiro sobe de uma vez no fim de cada missão, não aos poucos.'),note:o.note||''});
 }
 function chain(steps,o={}){
  if(!Array.isArray(steps)||!steps.length)return '';
  const KIND={start:'Início',acquire:'Comprar',unlock:'Desbloquear',run:'Fazer',goal:'Meta alcançada',missing:'A completar'};
  return '<figure class="c-chain" aria-label="'+esc(o.title||'O percurso, em ordem')+'"><figcaption class="c-chart-head"><strong>'+esc(o.title||'O percurso, em ordem')+'</strong><span class="c-chart-question">'+esc(o.question||'Lê-se de cima para baixo: cada etapa abre a seguinte.')+'</span></figcaption><ol class="c-chain-list">'+steps.map((st,i)=>'<li class="c-chain-step is-'+esc(st.type)+'" style="--i:'+Math.min(i,12)+'"><span class="c-chain-k">'+esc(st.label||KIND[st.type]||st.type)+'</span><span class="c-chain-body"><b>'+(st.url?'<a href="'+esc(st.url)+'">'+esc(st.name)+'</a>':esc(st.name))+'</b>'+(st.detail?'<small>'+esc(st.detail)+'</small>':'')+'</span>'+(st.cash!==undefined&&st.cash!==null?'<span class="c-chain-cash">'+esc(money(st.cash))+'</span>':'')+'</li>').join('')+'</ol>'+(o.note?'<p class="calc-note">'+esc(o.note)+'</p>':'')+'</figure>';
 }
 return {progress,plot,chart,sensitivity,roi,fmt,costLines,cashSteps,chain};
}
global.LKCalcVisuals={create};
})(window);
