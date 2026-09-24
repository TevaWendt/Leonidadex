/* Lot C — amélioration progressive de présentation, sans accès à l’état métier.
   Un RAF commun pour les compteurs, le scan et la scène. WAAPI pour les effets
   finis ; observer unique pour les apparitions et l’arrêt hors écran. */
(function(global){
'use strict';
const page=document.querySelector('.calculator-page'),main=document.getElementById('main');
if(!page||!main)return;
global.LKCalcMotion?.destroy();
const reduced=matchMedia('(prefers-reduced-motion: reduce)'),coarse=matchMedia('(pointer: coarse)'),connection=navigator.connection;
const css=getComputedStyle(page),token=(name,fallback)=>parseFloat(css.getPropertyValue('--c-'+name))||fallback;
const times={fast:token('fast',190),standard:token('standard',300),narrative:token('narrative',620),stagger:token('stagger',35)};
const easing=css.getPropertyValue('--c-ease-result').trim()||'ease-out';
const numberFormats=[0,1,2].map(maximumFractionDigits=>new Intl.NumberFormat('fr-FR',{maximumFractionDigits}));
const abort=new AbortController(),seen=new WeakSet(),observed=new Set(),waiting=new Map(),effects=new Map(),numbers=new Map(),memory=new Map(),states=new Map();
let enabled=false,light=false,printing=false,destroyed=false,suspended=false,raf=0,scanPending=false,sceneDirty=false,heroVisible=false,px=0,py=0,pointer=null,scans=0,frames=0;
const hero=document.querySelector('.lk-calc-hero'),scene=document.querySelector('.lk-calc-hero-scene');
const options={childList:true,subtree:true,attributes:true,attributeFilter:['hidden','open','data-mode','aria-selected']};
const mutations=typeof MutationObserver==='function'?new MutationObserver(()=>schedule(true)):null;
function mutate(fn){mutations?.disconnect();try{return fn();}finally{if(!destroyed)mutations?.observe(main,options);}}
function visible(el){return el.isConnected&&el.getClientRects().length>0;}
function inside(el){if(!visible(el))return false;const r=el.getBoundingClientRect();return r.bottom>0&&r.top<innerHeight&&r.right>0&&r.left<innerWidth;}
function listen(target,name,fn,extra={}){target?.addEventListener?.(name,fn,{...extra,signal:abort.signal});}
function remember(key,value){memory.set(key,value);if(memory.size>256)memory.delete(memory.keys().next().value);}
function finishNumber(job){job.el.classList.remove('c-counting');job.overlay?.remove();if(numbers.get(job.key)===job)numbers.delete(job.key);job.shown=job.value;remember(job.key,{value:job.value,shown:job.value,type:job.type});}
function stopNumber(job,finish=true){if(finish)finishNumber(job);else{job.el.classList.remove('c-counting');job.overlay?.remove();numbers.delete(job.key);remember(job.key,{value:job.value,shown:job.shown,type:job.type});}}
function cancel(el){effects.get(el)?.cancel();for(const job of [...numbers.values()])if(el===job.el||el.contains(job.el))finishNumber(job);}
function watch(el){if(intersections&&!observed.has(el)){observed.add(el);intersections.observe(el);}}
function unwatch(el){observed.delete(el);intersections?.unobserve(el);}
function play(el,keyframes,duration,delay=0){
 effects.get(el)?.cancel();if(!enabled||!inside(el)||effects.size>=18||typeof el.animate!=='function')return;
 try{const a=el.animate(keyframes,{duration:light?Math.min(duration,220):duration,delay:light?0:delay,easing});effects.set(el,a);watch(el);
 const done=()=>{if(effects.get(el)===a)effects.delete(el);};a.onfinish=done;a.oncancel=done;}catch{/* Le style final reste visible. */}
}
function reveal(el,index=0){
 if(el.contains(document.activeElement))return;
 const fixed=el.matches('.calc-panel,.calc-card,.b-notebook-entry,.b-plan-step,.calc-saved-body,dialog')||el.querySelector('input,select,textarea');
 const transform=getComputedStyle(el).transform,base=transform==='none'?'':transform+' ';
 const distance=token('rise',10);play(el,fixed||light?[{opacity:.82},{opacity:1}]:[{opacity:.55,transform:base+'translateY('+distance+'px)'},{opacity:1,transform}],times.standard,Math.min(index,3)*times.stagger);
}
function queue(el,fn){if(!visible(el))return;if(!enabled||inside(el)||!intersections)fn();else{waiting.set(el,fn);watch(el);}}
const intersections=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>mutate(()=>{
 for(const entry of entries){const el=entry.target;
  if(el===hero){heroVisible=entry.isIntersecting;if(heroVisible)scheduleScene();else resetScene();continue;}
  if(el.matches('.calc-result'))el.classList.toggle('c-inview',entry.isIntersecting&&enabled);
  if(entry.isIntersecting){const fn=waiting.get(el);if(fn){waiting.delete(el);if(el.isConnected)fn();}}
  else cancel(el);
 }
}),{threshold:.02}):null;
function durationText(value,signed){const n=Math.round(Math.abs(value)),sign=value<0&&n?'−':signed?'+':'';return sign+(n<60?n+' min':Math.floor(n/60)+' h'+(n%60?' '+String(n%60).padStart(2,'0'):''));}
function parse(text){
 const s=text.trim().replace(/\u2212/g,'-');let m=s.match(/^([+-]?\d+)\s*h(?:\s*(\d{1,2}))?$/);
 if(m){const value=Number(m[1])*60+(s.startsWith('-')?-1:1)*Number(m[2]||0);return {value,type:'time',format:v=>durationText(v,s.startsWith('+'))};}
 m=s.match(/^([+-]?\d+)\s*min$/);if(m)return {value:Number(m[1]),type:'time',format:v=>durationText(v,s.startsWith('+'))};
 m=s.match(/^([+-]?(?:\d{1,3}(?:[ \u00a0\u202f]\d{3})+|\d+)(?:,\d+)?)(?:\s*([$%]))?$/);
 if(!m)return null;const value=Number(m[1].replace(/[ \u00a0\u202f]/g,'').replace(',','.')),unit=m[2]||'',signed=s.startsWith('+');
 if(!Number.isFinite(value))return null;
 const nf=numberFormats[Math.min(2,(m[1].split(',')[1]||'').length)];
 return {value,type:unit||'number',format:v=>(signed&&v>=0?'+':'')+nf.format(Math.abs(v)<.005?0:v)+(unit?'\u00a0'+unit:'')};
}
function numberKey(el,index){const result=el.closest('[id$="-results"],.calc-panel');const label=el.closest('.calc-stat')?.querySelector(':scope>span')?.textContent;return (result?.id||'result')+':'+(el.dataset.cNumber||label||(el.classList.contains('calc-result-main')?'main':index));}
function number(el,key){
 if(seen.has(el))return;seen.add(el);
 const text=el.textContent.trim(),parsed=parse(text);if(!parsed)return;
 const old=numbers.get(key);if(old)stopNumber(old,false);
 const previous=memory.get(key),from=previous?.type===parsed.type?previous.shown:0;
 remember(key,{value:parsed.value,shown:parsed.value,type:parsed.type});
 if(!enabled||!inside(el)||from===parsed.value||numbers.size>=12||!Number.isFinite(from))return;
 const final=document.createElement('span'),overlay=document.createElement('span');
 final.className='c-final';final.textContent=text;overlay.className='c-rolling';overlay.setAttribute('aria-hidden','true');overlay.dataset.display=parsed.format(from);
 el.replaceChildren(final,overlay);el.classList.add('c-number','c-counting');el.dataset.cFinal=text;
 const job={el,key,overlay,...parsed,shown:from,from,start:performance.now(),duration:light?times.standard:times.narrative};
 numbers.set(key,job);remember(key,{value:parsed.value,shown:from,type:parsed.type});watch(el);schedule();
}
function progress(el){
 if(seen.has(el))return;seen.add(el);const value=Math.max(0,Math.min(1,el.value/el.max));if(!Number.isFinite(value))return;
 const key='progress:'+el.id,previous=memory.get(key)?.value??0;remember(key,{value});
 const track=document.createElement('span'),fill=document.createElement('span');track.className='c-progress-track';fill.className='c-progress-fill';fill.setAttribute('aria-hidden','true');fill.style.transform='scaleX('+value+')';
 el.replaceWith(track);track.append(el,fill);
 if(enabled&&previous!==value)play(fill,[{transform:'scaleX('+previous+')'},{transform:'scaleX('+value+')'}],times.narrative);
 if(el.id==='goal-progress'||el.id==='roi-progress'){
  const result=el.closest('.calc-result');result?.classList.toggle('c-complete',value===1);
  if(value===1&&previous<1&&result)play(result,[{outline:'2px solid #99dec3'},{outline:'2px solid transparent'}],times.standard);
 }
}
function chart(el){
 if(seen.has(el))return;seen.add(el);const figure=el.closest('figure'),key='chart:'+(figure?.dataset.cChart||figure?.closest('[id]')?.id),d=el.getAttribute('d');const old=states.get(key);states.set(key,d);
 if(old===d||!enabled)return;
 try{const length=el.getTotalLength();if(Number.isFinite(length)&&length>0){play(el,[{strokeDasharray:length+' '+length,strokeDashoffset:length},{strokeDasharray:length+' '+length,strokeDashoffset:0}],times.narrative);figure.querySelectorAll('.c-chart-point').forEach((p,i)=>play(p,[{opacity:.4},{opacity:1}],times.standard,Math.min(i,3)*times.stagger));}}catch{/* Données SVG finales déjà présentes. */}
}
function stateEffect(el,key,value){const old=states.get(key);states.set(key,value);if(old!==undefined&&old!==value&&visible(el))play(el,[{opacity:.75},{opacity:1}],times.fast);}
function scan(){
 scans++;scanPending=false;
 mutate(()=>{
  for(const [el] of effects)if(!el.isConnected||!visible(el)){cancel(el);effects.delete(el);}
  for(const job of [...numbers.values()])if(!job.el.isConnected)stopNumber(job,false);
  for(const el of observed)if(!el.isConnected){waiting.delete(el);unwatch(el);}
  for(const [el] of waiting)if(!visible(el)){waiting.delete(el);unwatch(el);}
  const panel=main.querySelector('.calc-panel:not([hidden])');
  if(panel){
   const mode=document.getElementById('calc-panels').dataset.mode;stateEffect(panel,'panel',panel.id);stateEffect(panel,'mode:'+panel.id,mode);
   panel.querySelectorAll('.calc-result-main,.calc-result .calc-stat strong,.calc-result-metrics strong,[data-c-number]').forEach((el,i)=>queue(el,()=>number(el,numberKey(el,i))));
   panel.querySelectorAll('progress.calc-progress').forEach(el=>{if(!el.closest('.c-progress-track'))queue(el,()=>progress(el));});
   panel.querySelectorAll('.calc-chart .path').forEach(el=>queue(el,()=>chart(el)));
   const comparison=panel.querySelector('[data-c-comparison]');if(comparison)stateEffect(comparison,panel.id+':comparison',comparison.textContent+comparison.getAttribute('aria-label'));else states.set(panel.id+':comparison','');
   panel.querySelectorAll('.calc-warning,.b-empty,.calc-empty').forEach((el,i)=>stateEffect(el,panel.id+':message:'+i,el.textContent));
  }
  const zones=main.querySelectorAll('.lk-tool,.calc-editorial,.calc-card,.b-plan-step,.b-notebook-entry,.calc-session-step,.b-expert[id],.lk-tool-guide>h2,.lk-explore>h2');
  zones.forEach((el,i)=>{if(!seen.has(el)&&!waiting.has(el)&&visible(el))queue(el,()=>{seen.add(el);if(!location.hash||!el.closest(location.hash==='#atelier'?'#atelier':'.not-a-real-target'))reveal(el,i%4);});});
  main.querySelectorAll('.calc-result').forEach((el,i)=>{if(!observed.has(el)){el.style.setProperty('--c-phase',String(-(i%4)*2)+'s');watch(el);if(!intersections)el.classList.toggle('c-inview',inside(el));}});
  main.querySelectorAll('[data-c-stage]').forEach(el=>{const key='stage:'+el.dataset.cStage,value=el.dataset.cStageState;const old=states.get(key);states.set(key,value);if(old&&old!==value&&inside(el))play(el,[{backgroundColor:value==='Terminé'?'#d7eae0':'#eee0e9'},{backgroundColor:'#fff9fc'}],times.standard);});
  const saved=main.querySelector('.b-save-state');if(saved){saved.dataset.cDirty=String(/non enregistr|mémoire seulement/.test(saved.textContent));stateEffect(saved,'saved-status',saved.textContent);}
  const ref=panel?.querySelector('[data-b-reference]')?.value;
  main.querySelectorAll('.b-notebook-entry').forEach(el=>{const id=el.querySelector('[data-b-rename]')?.dataset.bRename,button=el.querySelector('[data-b-ref-entry]');if(button)button.setAttribute('aria-pressed',String(id===ref));const tag=el.querySelector('.c-reference-tag');if(id===ref&&!tag){const t=document.createElement('span');t.className='c-reference-tag';t.textContent='Référence de comparaison';el.append(t);}else if(id!==ref)tag?.remove();});
  const dialog=main.querySelector('#compare-dialog');if(dialog?.open)stateEffect(dialog,'comparison',dialog.textContent);
 });
}
function tick(now){
 raf=0;frames++;if(destroyed)return;if(scanPending)scan();
 for(const job of [...numbers.values()]){
  if(!job.el.isConnected){stopNumber(job,false);continue;}
  if(!enabled||!visible(job.el)){finishNumber(job);continue;}
  const t=Math.max(0,Math.min(1,(now-job.start)/job.duration)),e=1-Math.pow(1-t,3);job.shown=job.from+(job.value-job.from)*e;job.overlay.dataset.display=job.format(job.shown);remember(job.key,{value:job.value,shown:job.shown,type:job.type});
  if(t>=1)finishNumber(job);
 }
 if(sceneDirty){sceneDirty=false;updateScene();}
 if(numbers.size||scanPending||sceneDirty)schedule();
}
function schedule(scanNeeded=false){if(destroyed)return;scanPending=scanPending||scanNeeded;if(!raf&&!document.hidden&&!suspended)raf=requestAnimationFrame(tick);}
function resetScene(){px=0;py=0;pointer=null;sceneDirty=false;scene?.style.removeProperty('--c-scene-x');scene?.style.removeProperty('--c-scene-y');}
function updateScene(){
 if(!enabled||light||!heroVisible||!hero||!scene)return resetScene();const r=hero.getBoundingClientRect();
 if(r.bottom<=0||r.top>=innerHeight)return resetScene();if(pointer){px=Math.max(-1,Math.min(1,(pointer.x-r.left)/r.width*2-1));py=Math.max(-1,Math.min(1,(pointer.y-r.top)/r.height*2-1));}const drift=Math.max(0,Math.min(1,-r.top/Math.max(r.height,1)))*10;
 scene.style.setProperty('--c-scene-x',(px*10).toFixed(2)+'px');scene.style.setProperty('--c-scene-y',(drift+py*4).toFixed(2)+'px');
}
function scheduleScene(){if(enabled&&!light&&heroVisible){sceneDirty=true;schedule();}}
function settle(event){
 for(const [el] of effects)if(el.contains(event.target)||event.target.closest('.c-chart')?.contains(el))cancel(el);
 const graphic=event.target.closest('.c-chart');if(graphic)for(const [el] of effects)if(graphic.contains(el))cancel(el);
}
function preference(){
 if(destroyed)return;
 light=coarse.matches||innerWidth<768||!!connection?.saveData||(navigator.hardwareConcurrency>0&&navigator.hardwareConcurrency<=4)||(navigator.deviceMemory>0&&navigator.deviceMemory<=4);
 enabled=!reduced.matches&&!document.hidden&&!printing&&!suspended;
 page.dataset.cMotion=enabled?(light?'light':'full'):'off';
 for(const a of [...effects.values()])a.cancel();effects.clear();for(const job of [...numbers.values()])finishNumber(job);
 if(raf)cancelAnimationFrame(raf);raf=0;resetScene();
 if(!document.hidden&&!suspended){schedule(true);scheduleScene();}
}
function destroy(){
 destroyed=true;abort.abort();mutations?.disconnect();intersections?.disconnect();for(const a of [...effects.values()])a.cancel();effects.clear();for(const job of [...numbers.values()])finishNumber(job);
 if(raf)cancelAnimationFrame(raf);raf=0;waiting.clear();observed.clear();effects.clear();memory.clear();states.clear();resetScene();delete page.dataset.cMotion;
 main.querySelectorAll('.c-inview').forEach(el=>el.classList.remove('c-inview'));
}
listen(reduced,'change',preference);listen(coarse,'change',preference);listen(connection,'change',preference);
listen(document,'visibilitychange',preference);listen(global,'resize',preference,{passive:true});listen(global,'scroll',scheduleScene,{passive:true});
listen(global,'beforeprint',()=>{printing=true;preference();scan();});listen(global,'afterprint',()=>{printing=false;preference();});
listen(global,'pagehide',e=>{if(e.persisted){suspended=true;preference();}else destroy();});listen(global,'pageshow',()=>{suspended=false;preference();});
listen(main,'pointerdown',settle,{capture:true});listen(main,'focusin',settle,{capture:true});
listen(main,'toggle',e=>{const el=e.target;if(el.matches('details')){cancel(el);if(el.open){const body=el.querySelector(':scope > :not(summary)');if(body)reveal(body);}schedule(true);}},{capture:true});
listen(hero,'pointermove',e=>{if(!enabled||light||e.pointerType==='touch')return;pointer={x:e.clientX,y:e.clientY};scheduleScene();},{passive:true});
listen(hero,'pointerleave',()=>{px=0;py=0;pointer=null;scheduleScene();},{passive:true});
if(hero){heroVisible=inside(hero);watch(hero);}
mutations?.observe(main,options);preference();
if(enabled&&heroVisible){hero.querySelectorAll('.lk-calc-hero-copy > *').forEach((el,i)=>reveal(el,i));const photo=scene?.querySelector('img');if(photo)play(photo,[{opacity:.6},{opacity:.88}],times.narrative);}
global.LKCalcMotion=Object.freeze({destroy,refresh:()=>schedule(true),status:()=>({mode:page.dataset.cMotion,frames,scans,raf:!!raf,numbers:numbers.size,effects:effects.size,waiting:waiting.size,observed:observed.size,memory:memory.size,sceneActive:enabled&&!light&&heroVisible})});
})(window);
