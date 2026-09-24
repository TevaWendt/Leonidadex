/* Présentation pédagogique : tokens du Lot C, effets finis, contenu visible sans script. */
(function(){'use strict';
const reduced=matchMedia('(prefers-reduced-motion: reduce)'),effects=new Set(),seen=new WeakSet(),style=getComputedStyle(document.documentElement);
const duration=parseFloat(style.getPropertyValue('--c-standard'))||300,easing=style.getPropertyValue('--c-ease-result').trim()||'ease-out',rise=style.getPropertyValue('--c-rise').trim()||'10px';
function settle(){effects.forEach(a=>a.cancel());effects.clear();}
function reveal(el){if(seen.has(el))return;seen.add(el);if(reduced.matches||document.hidden||el.contains(document.activeElement)||typeof el.animate!=='function')return;const stable=el.querySelector('input,button,select');const frames=stable?[{opacity:.82},{opacity:1}]:[{opacity:.6,transform:'translateY('+rise+')'},{opacity:1,transform:'none'}];const animation=el.animate(frames,{duration,easing});effects.add(animation);animation.onfinish=()=>effects.delete(animation);animation.oncancel=()=>effects.delete(animation);}
const observer=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{for(const e of entries)if(e.isIntersecting){reveal(e.target);observer.unobserve(e.target);}},{threshold:.06}):null;
document.querySelectorAll('[data-d-reveal]').forEach(el=>observer?.observe(el));
reduced.addEventListener('change',settle);document.addEventListener('visibilitychange',()=>{if(document.hidden)settle();});document.addEventListener('focusin',settle);window.addEventListener('pagehide',()=>{settle();observer?.disconnect();});
})();
