/* Généré depuis outils/sources/leo-loader.js : modifie la source, pas ce fichier. */
(function(){'use strict';if(document.getElementById('leo-launch')||!document.querySelector('main'))return;
const button=document.createElement('button');button.id='leo-launch';button.type='button';button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-expanded','false');button.innerHTML='<span class="leo-symbol" aria-hidden="true"><span>L</span></span><span>Léo<span class="sr-only"> : ouvrir l’assistant Leonidakit</span></span>';document.body.append(button);
const BASE=(document.currentScript&&document.currentScript.src||'').replace(/^https?:\/\/[^/]+/,'').replace(/[^/]*$/,'')||'/';
const href=(name,root)=>(root?'/':BASE)+name+'?v=ce1a8e3241bf';let loading=null,frame=0;
function script(name,global,root){if(window[global])return Promise.resolve();return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=href(name,root);s.onload=()=>window[global]?resolve():reject(Error('Module local indisponible.'));s.onerror=()=>{s.remove();if(!root&&BASE!=='/'){script(name,global,true).then(resolve,reject);return;}reject(Error('Un fichier local de Léo n’a pas pu être chargé.'));};document.head.append(s);});}
async function open(){if(window.LKLeoUI){window.LKLeoUI.open();return;}if(loading)return;button.disabled=true;button.setAttribute('aria-busy','true');const label=button.lastElementChild;label.textContent='Ouverture';loading=(async()=>{await Promise.all([script('calculateurs-engine.js','LKCalcEngine'),script('leo-link.js','LKLeoLink'),script('leo-nlp.js','LKLeoNLP',true),script('lk-ia.js','LKIA'),script('lk-micro.js','LKMicro').catch(()=>{}).catch(()=>{})]);await script('leo-core.js','LKLeoCore');await script('leo-ui.js','LKLeoUI');window.LKLeoUI.open();})();try{await loading;}catch(e){window.LK?.status(e.message+' Tu peux continuer à utiliser le site et réessayer.');}finally{loading=null;button.disabled=false;button.removeAttribute('aria-busy');label.textContent='Léo';}}
button.addEventListener('click',()=>window.LKLeoUI?.isOpen()?window.LKLeoUI.close():open());
let lastPlace=0,scrollTimer=0;
function place(){frame=0;lastPlace=performance.now();if(window.LKLeoUI?.isOpen())return;const modal=document.querySelector('dialog[open]'),burger=document.getElementById('burger');const hidden=!!modal||burger?.getAttribute('aria-expanded')==='true';if(button.hidden!==hidden)button.hidden=hidden;if(hidden||document.activeElement===button)return;const small=innerWidth<600,edge=small?12:18,originalBottom=edge+(parseFloat(getComputedStyle(button).getPropertyValue('--leo-safe'))||0);
 const narrow=innerWidth<=600;if(button.classList.contains('leo-compact')!==narrow)button.classList.toggle('leo-compact',narrow);
 const w=button.offsetWidth,h=button.offsetHeight;
 const blocked=(left,top)=>[[left+2,top+2],[left+w-2,top+2],[left+2,top+h-2],[left+w-2,top+h-2],[left+w/2,top+h/2],[left+w/2,top+2],[left+w/2,top+h-2]].some(([x,y])=>document.elementsFromPoint(x,y).some(el=>!button.contains(el)&&el!==button&&el.closest('button,input,select,textarea,a,summary,.cmp-tray.on,#lk-status:not(:empty),[role="slider"],.vbar,.own-bar,.lk-sticky:not([hidden])')));
 const free=bottom=>!blocked(innerWidth-edge-w,innerHeight-bottom-h);
 const bottomPx=free(originalBottom)?originalBottom:free(originalBottom+70)?originalBottom+70:originalBottom;
 const bottom='calc('+bottomPx+'px + env(safe-area-inset-bottom,0px))';
 if(button.style.left!=='auto')button.style.left='auto';if(button.style.right!==edge+'px')button.style.right=edge+'px';if(button.style.bottom!==bottom)button.style.bottom=bottom;}
const schedule=()=>{if(scrollTimer){clearTimeout(scrollTimer);scrollTimer=0;}if(!frame)frame=requestAnimationFrame(place);};
const onScroll=()=>{if(frame||scrollTimer||document.hidden)return;const wait=Math.max(0,120-(performance.now()-lastPlace));scrollTimer=setTimeout(()=>{scrollTimer=0;schedule();},wait);};
window.addEventListener('scroll',onScroll,{passive:true});
let lastY=scrollY;
const away=()=>{const y=scrollY,dy=y-lastY;if(innerWidth>600||window.LKLeoUI?.isOpen()){if(button.classList.contains('leo-away'))button.classList.remove('leo-away');lastY=y;return;}if(Math.abs(dy)<12)return;lastY=y;const hide=dy>0&&y>160&&y+innerHeight<document.documentElement.scrollHeight-120;if(button.classList.contains('leo-away')!==hide)button.classList.toggle('leo-away',hide);};
window.addEventListener('scroll',away,{passive:true});button.addEventListener('focus',()=>button.classList.remove('leo-away'));window.addEventListener('resize',schedule);document.addEventListener('click',schedule);document.addEventListener('keydown',schedule);const menu=document.getElementById('burger');if(menu)new MutationObserver(schedule).observe(menu,{attributes:true,attributeFilter:['aria-expanded']});document.addEventListener('close',schedule,true);window.addEventListener('pageshow',schedule);
if(window.MutationObserver){let t=0;new MutationObserver(()=>{if(t)return;t=setTimeout(()=>{t=0;schedule();},250);}).observe(document.body,{childList:true,subtree:true});}
if(window.requestIdleCallback)requestIdleCallback(schedule,{timeout:1200});else setTimeout(schedule,300);
window.LKLeoLoader={open,place:schedule};
try{const raw=sessionStorage.getItem('lk_leo_session_v2');if(raw&&raw.length<100000){const r=JSON.parse(raw);if(r.resumeTo===location.pathname+location.hash&&r.at<=Date.now()&&Date.now()-r.at<1800000)open();}}catch{}
})();
