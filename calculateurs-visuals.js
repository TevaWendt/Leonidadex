/* Lot C — graphiques SVG et jauges issus uniquement des résultats du lot B.
   Aucune animation ni règle économique ici : les données finales sont du HTML. */
(function(global){
'use strict';
function create(h){
 const {esc,money,hours}=h,nf=new Intl.NumberFormat('fr-FR',{maximumFractionDigits:2}),compact=new Intl.NumberFormat('fr-FR',{notation:'compact',maximumFractionDigits:1});
 const fmt=(v,u)=>u==='$'?money(v):u==='h'?hours(v):u==='min'?hours(v/60):nf.format(v)+(u?' '+u:'');
 function progress(id,label,value,total){
  if(!Number.isFinite(value)||!Number.isFinite(total)||total<0)return '<p class="c-progress-note">'+esc(label)+' : indisponible avec ces paramètres.</p>';
  if(total===0)return '<p class="c-progress-note">'+esc(label)+' : '+(value>0?'aucun montant de référence disponible pour calculer un pourcentage.':'aucun montant à couvrir.')+'</p>';
  const raw=value/total*100,pct=Math.max(0,Math.min(100,raw));
  return '<div class="c-progress-block"><label for="'+id+'">'+esc(label)+' <strong data-c-number="'+id+'-value">'+nf.format(raw)+' %</strong>'+(raw>100?' · déjà remboursé':raw<0?' · pas encore remboursé':'')+'</label><progress class="calc-progress" id="'+id+'" max="100" value="'+pct+'" aria-valuetext="'+esc(nf.format(raw)+' % — '+label)+'"></progress></div>';
 }
 function plot(id,title,points,unit,options={}){
  if(points.length<2||points.some(p=>!Number.isFinite(p.value)))return '';
  const low=Math.min(0,...points.map(p=>p.value)),high=Math.max(1,...points.map(p=>p.value)),range=high-low||1;
  const x=(p,i)=>options.time?88+(p.time/(options.end||1))*480:88+i/(points.length-1)*480,y=v=>178-(v-low)/range*138;
  const d=points.map((p,i)=>(i?'L':'M')+x(p,i).toFixed(2)+' '+y(p.value).toFixed(2)).join(' ');
  const ticks=[low,(low+high)/2,high].map(v=>'<line class="gridline" x1="88" x2="568" y1="'+y(v)+'" y2="'+y(v)+'"/><text x="78" y="'+(y(v)+6)+'" text-anchor="end">'+esc(compact.format(v))+'</text>').join('');
  const marks=points.map((p,i)=>'<circle class="c-chart-point'+(p.key?' c-chart-key':'')+'" cx="'+x(p,i)+'" cy="'+y(p.value)+'" r="'+(p.key?6:4)+'" tabindex="0" role="img" aria-label="'+esc(p.label+' : '+fmt(p.value,unit))+'"><title>'+esc(p.label+' : '+fmt(p.value,unit))+'</title></circle>').join('');
  const labels=points.filter((p,i)=>!options.time||i===0||i===points.length-1).map(p=>{const i=points.indexOf(p);return '<text x="'+x(p,i)+'" y="211" text-anchor="'+(i===0?'start':i===points.length-1?'end':'middle')+'">'+esc(p.label)+'</text>';}).join('');
  const rows=points.map(p=>'<tr><th scope="row">'+esc(p.label)+'</th><td>'+esc(fmt(p.value,unit))+'</td></tr>').join('');
  return '<figure class="calc-chart c-chart" data-c-chart="'+id+'"><svg viewBox="0 0 600 228" role="img" aria-labelledby="'+id+'-title '+id+'-caption"><title id="'+id+'-title">'+esc(title)+'</title>'+ticks+'<text x="88" y="22">'+esc(unit)+'</text>'+(options.zero?'<line class="c-threshold" x1="88" x2="568" y1="'+y(0)+'" y2="'+y(0)+'"/>':'')+'<path class="path" d="'+d+'"/>'+marks+labels+'</svg><figcaption id="'+id+'-caption">'+esc(title)+(options.note?' '+esc(options.note):'')+'</figcaption><details class="c-chart-data"><summary>Les chiffres du graphique</summary><div class="calc-table-wrap" tabindex="0" role="region" aria-label="'+esc(title)+'"><table class="calc-table"><caption>'+esc(title)+'</caption><thead><tr><th scope="col">Repère</th><th scope="col">Valeur ('+esc(unit)+')</th></tr></thead><tbody>'+rows+'</tbody></table></div></details></figure>';
 }
 function sensitivity(tool,sens,metric){
  if(!sens)return '';const [key,label,unit]=metric;
  if(sens.rows.some(x=>!x.result.valid||!Number.isFinite(x.result[key])))return '';
  return plot('c-sensitivity-'+tool,'Sensibilité · '+label,sens.rows.map(x=>({label:x.factor===1?'Ton chiffre':x.factor<1?'−20 %':'+20 %',value:x.result[key],key:x.factor===1})),unit,{note:'Trois scénarios recalculés ; chaque point est accessible au clavier.'});
 }
 function roi(s,r){
  if(!r.valid)return '';
  let html='<div class="c-payback"><span>Remboursé après</span><strong data-c-number="roi-payback">'+(r.paybackHours===null?'Non atteint dans la simulation':hours(r.paybackHours))+'</strong><small>'+(s.roi.mode==='continuous'?'de jeu, avec ton chiffre par heure':r.paybackCycles===null?'Aucun cycle suffisant trouvé':nf.format(r.paybackCycles)+' missions faites')+'</small></div>';
  html+=progress('roi-progress','Part du prix déjà regagnée',r.operatingProfit,r.investment);
  if(s.roi.mode==='continuous'&&s.roi.hours>0){
   const points=[{time:0,label:'0 h',value:-r.investment}];
   if(r.paybackHours>0&&r.paybackHours<s.roi.hours)points.push({time:r.paybackHours,label:'Remboursé après '+hours(r.paybackHours),value:0,key:true});
   points.push({time:s.roi.hours,label:hours(s.roi.hours),value:r.netProfit});
   html+='<div class="b-expert">'+plot('c-roi-curve','Ce que l’achat t’a rapporté, prix enlevé',points,'$',{time:true,end:s.roi.hours,zero:true,note:'Trait pointillé : achat remboursé. On suppose que ça rapporte toujours pareil.'})+'</div>';
  }
  return html;
 }
 return {progress,plot,sensitivity,roi};
}
global.LKCalcVisuals={create};
})(window);
