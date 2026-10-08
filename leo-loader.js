/* Petit amorçage : aucun index, moteur ou média de Léo avant une ouverture (v7.45 : leo-nlp.js s'ajoute à la chaîne ; le noyau et les morceaux ne sont chargés qu'après). */
(function(){'use strict';if(document.getElementById('leo-launch')||!document.querySelector('main'))return;
const button=document.createElement('button');button.id='leo-launch';button.type='button';button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-expanded','false');button.innerHTML='<span class="leo-symbol" aria-hidden="true"><span>L</span></span><span>Léo<span class="sr-only"> : ouvrir l’assistant Leonidakit</span></span>';document.body.append(button);
/* v7.61 : les modules viennent du dossier de la langue (/es/…) ; un module identique dans toutes les langues (leo-nlp.js) n'y est pas copié : il est pris directement à la racine (un module
   absent du dossier de la langue y est aussi cherché en dernier recours) */
const BASE=(document.currentScript&&document.currentScript.src||'').replace(/^https?:\/\/[^/]+/,'').replace(/[^/]*$/,'')||'/';
const href=(name,root)=>(root?'/':BASE)+name+'?v=5300a865c8f9';let loading=null,frame=0;
function script(name,global,root){if(window[global])return Promise.resolve();return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=href(name,root);s.onload=()=>window[global]?resolve():reject(Error('Module local indisponible.'));s.onerror=()=>{s.remove();if(!root&&BASE!=='/'){script(name,global,true).then(resolve,reject);return;}reject(Error('Un fichier local de Léo n’a pas pu être chargé.'));};document.head.append(s);});}
async function open(){if(window.LKLeoUI){window.LKLeoUI.open();return;}if(loading)return;button.disabled=true;button.setAttribute('aria-busy','true');const label=button.lastElementChild;label.textContent='Ouverture';loading=(async()=>{await Promise.all([script('calculateurs-engine.js','LKCalcEngine'),script('leo-link.js','LKLeoLink'),script('leo-nlp.js','LKLeoNLP',true),script('lk-ia.js','LKIA'),script('lk-micro.js','LKMicro').catch(()=>{}).catch(()=>{})]);await script('leo-core.js','LKLeoCore');await script('leo-ui.js','LKLeoUI');window.LKLeoUI.open();})();try{await loading;}catch(e){window.LK?.status(e.message+' Tu peux continuer à utiliser le site et réessayer.');}finally{loading=null;button.disabled=false;button.removeAttribute('aria-busy');label.textContent='Léo';}}
button.addEventListener('click',()=>window.LKLeoUI?.isOpen()?window.LKLeoUI.close():open());
/* v7.54 (lot 1) : la place du bouton n'est plus recalculée à chaque trame du défilement (sept tests de recouvrement par
   position, jusqu'à douze positions : autant de lectures de mise en page). Pendant le défilement, une vérification au plus
   toutes les 120 ms, puis une dernière à l'arrêt ; une position encore libre ne provoque aucune écriture. Clics, clavier,
   menu et changements de contenu sont traités dès la trame suivante, comme avant. */
let position=null,lastPlace=0,scrollTimer=0;
function place(){frame=0;lastPlace=performance.now();if(window.LKLeoUI?.isOpen())return;const modal=document.querySelector('dialog[open]'),burger=document.getElementById('burger');const hidden=!!modal||burger?.getAttribute('aria-expanded')==='true';if(button.hidden!==hidden)button.hidden=hidden;if(hidden||document.activeElement===button)return;const small=innerWidth<600,edge=small?12:18,originalBottom=edge+(parseFloat(getComputedStyle(button).getPropertyValue('--leo-safe'))||0);let chosen=null;
 const blocked=(left,top,w,h)=>[[left+2,top+2],[left+w-2,top+2],[left+2,top+h-2],[left+w-2,top+h-2],[left+w/2,top+h/2],[left+w/2,top+2],[left+w/2,top+h-2]].some(([x,y])=>document.elementsFromPoint(x,y).some(el=>!button.contains(el)&&el!==button&&el.closest('button,input,select,textarea,a,summary,.cmp-tray.on,#lk-status:not(:empty),[role="slider"],.vbar,.own-bar')));
 const free=(side,bottom,w,h)=>{const left=side==='right'?innerWidth-edge-w:edge,top=innerHeight-bottom-h;return top>Math.max(120,innerHeight*.45)&&!blocked(left,top,w,h);};
 /* position déjà choisie, encore libre, même écran : rien à faire */
 if(position&&position.vw===innerWidth&&position.vh===innerHeight&&position.base===originalBottom&&free(position.side,position.bottom,button.offsetWidth,button.offsetHeight))return;
 /* v7.37 : si aucune place libre n'existe pour le bouton complet, il se replie sur son seul symbole (moins de recouvrement). */
 const find=()=>{const w=button.offsetWidth,h=button.offsetHeight;for(const bottom of [originalBottom,originalBottom+70,originalBottom+140,originalBottom+210,originalBottom+280,originalBottom+350])for(const side of ['right','left']){if(free(side,bottom,w,h))return {side,bottom};}return null;};
 /* v7.68 (téléphone) : sur un écran étroit, le bouton est d’emblée réduit à son symbole (son nom reste lu) */
 const narrow=innerWidth<=600;if(button.classList.contains('leo-compact')!==narrow)button.classList.toggle('leo-compact',narrow);chosen=find();if(!chosen&&!narrow){button.classList.add('leo-compact');chosen=find();}
 const left=chosen?.side==='left'?edge+'px':'auto',right=chosen?.side==='left'?'auto':edge+'px',bottom='calc('+(chosen?.bottom??originalBottom)+'px + env(safe-area-inset-bottom,0px))';
 if(button.style.left!==left)button.style.left=left;if(button.style.right!==right)button.style.right=right;if(button.style.bottom!==bottom)button.style.bottom=bottom;
 position=chosen?{side:chosen.side,bottom:chosen.bottom,vw:innerWidth,vh:innerHeight,base:originalBottom}:null;}
const schedule=()=>{if(scrollTimer){clearTimeout(scrollTimer);scrollTimer=0;}if(!frame)frame=requestAnimationFrame(place);};
const onScroll=()=>{if(frame||scrollTimer||document.hidden)return;const wait=Math.max(0,120-(performance.now()-lastPlace));scrollTimer=setTimeout(()=>{scrollTimer=0;schedule();},wait);};
window.addEventListener('scroll',onScroll,{passive:true});
/* v7.68 (téléphone) : sur un écran étroit, le bouton s’efface quand on descend dans la page et revient dès qu’on remonte, en bas
   de page ou quand il reçoit le focus : il ne cache plus le texte qu’on lit. Rien ne change au-dessus de 600 px. */
let lastY=scrollY;
const away=()=>{const y=scrollY,dy=y-lastY;if(innerWidth>600||window.LKLeoUI?.isOpen()){if(button.classList.contains('leo-away'))button.classList.remove('leo-away');lastY=y;return;}if(Math.abs(dy)<12)return;lastY=y;const hide=dy>0&&y>160&&y+innerHeight<document.documentElement.scrollHeight-120;if(button.classList.contains('leo-away')!==hide)button.classList.toggle('leo-away',hide);};
window.addEventListener('scroll',away,{passive:true});button.addEventListener('focus',()=>button.classList.remove('leo-away'));window.addEventListener('resize',()=>{position=null;schedule();});document.addEventListener('click',schedule);document.addEventListener('keydown',schedule);const menu=document.getElementById('burger');if(menu)new MutationObserver(schedule).observe(menu,{attributes:true,attributeFilter:['aria-expanded']});document.addEventListener('close',schedule,true);window.addEventListener('pageshow',schedule);
/* v7.37 : le contenu rendu après le chargement (onglets du calculateur, listes filtrées) est pris en compte : la place du bouton est revue quand la page change. */
if(window.MutationObserver){let t=0;new MutationObserver(()=>{if(t)return;t=setTimeout(()=>{t=0;schedule();},250);}).observe(document.body,{childList:true,subtree:true});}
/* v7.66 (latence) : la première place du bouton est cherchée quand le navigateur est libre (jusqu’à 168 tests de recouvrement), pas pendant le premier affichage */
if(window.requestIdleCallback)requestIdleCallback(schedule,{timeout:1200});else setTimeout(schedule,300);
window.LKLeoLoader={open,place:schedule};
try{const raw=sessionStorage.getItem('lk_leo_session_v2');if(raw&&raw.length<100000){const r=JSON.parse(raw);if(r.resumeTo===location.pathname+location.hash&&r.at<=Date.now()&&Date.now()-r.at<1800000)open();}}catch{}
})();
