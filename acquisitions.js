(function(){'use strict';
if(!window.LK_ACQUISITIONS||!window.LKProgression)return;
const message=text=>{const box=document.getElementById('acq-feedback');if(box)box.textContent=text;else window.LK?.status(text);};
let store;try{store=window.LKProgression.create({storage:localStorage,acquisitions:window.LK_ACQUISITIONS,notice:message});}catch{message('Le suivi local est indisponible dans ce navigateur. Les fiches restent consultables.');return;}
function render(){document.querySelectorAll('[data-acq-toggle]').forEach(input=>{const item=window.LK_ACQUISITIONS.items.find(x=>x.id===input.dataset.acqToggle);if(!item)return;input.checked=store.checked(item);input.closest('label').hidden=false;});}
document.addEventListener('change',event=>{const input=event.target.closest('[data-acq-toggle]');if(!input)return;if(store.toggle(input.dataset.acqToggle,input.checked))message('Suivi enregistré sur cet appareil.');render();});
store.migrate();render();store.subscribe(render);window.addEventListener('storage',render);window.addEventListener('pageshow',render);
})();

/* v7.56 (lot 3, STYLE-03) : carrousels des cartes « Adresses » (style.html). Les vues officielles d'une adresse se parcourent
   directement sur l'image : flèches dès la première vue (cachées sans script ou à vue unique), position « 2 / 4 », points
   cliquables, flèches du clavier, balayage au doigt ; transition rétro courte (balayage de lignes et glissement), coupée en
   « réduire les animations » ; cadrage 16/9 et hauteur de carte inchangés ; légende et lien de crédits mis à jour à chaque vue.
   Rien n'est inventé : seules les vues listées dans outils/medias-officiels.json sont montrées. */
(function(){'use strict';
const cars=Array.from(document.querySelectorAll('[data-car]'));if(!cars.length)return;
const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
cars.forEach(car=>{
 const slides=Array.from(car.querySelectorAll('.d-car-slide'));if(slides.length<2)return;
 const prev=car.querySelector('[data-car-prev]'),next=car.querySelector('[data-car-next]'),nav=car.querySelector('.d-car-nav'),pos=car.querySelector('[data-car-pos]'),dots=car.querySelector('[data-car-dots]'),cap=car.querySelector('[data-car-cap]'),credit=car.querySelector('[data-car-credit]'),track=car.querySelector('.d-car-track');
 if(!prev||!next||!track)return;
 const n=slides.length;let i=0,timer=0;
 const title=k=>slides[(k+n)%n].dataset.carTitle||('Vue '+(((k+n)%n)+1));
 const warm=k=>{const img=slides[(k+n)%n].querySelector('img');if(img&&img.loading==='lazy')img.loading='eager';};
 const dotBts=dots?slides.map((s,k)=>{const b=document.createElement('button');b.type='button';b.className='d-car-dot';b.setAttribute('aria-label','Vue '+(k+1)+' sur '+n+' : '+title(k));b.addEventListener('click',()=>go(k));dots.appendChild(b);return b;}):[];
 function paint(){
  slides.forEach((s,k)=>{s.classList.toggle('is-current',k===i);if(k===i)s.removeAttribute('aria-hidden');else s.setAttribute('aria-hidden','true');});
  if(pos)pos.textContent=(i+1)+' / '+n;if(cap)cap.textContent=title(i);
  if(credit)credit.href='medias.html#media-'+(slides[i].dataset.carId||'');
  prev.setAttribute('aria-label','Vue précédente : '+title(i-1));next.setAttribute('aria-label','Vue suivante : '+title(i+1));
  dotBts.forEach((b,k)=>b.setAttribute('aria-current',k===i?'true':'false'));
 }
 function go(k,dir){
  const to=(k+n)%n;if(to===i)return;const from=i;i=to;warm(to);warm(to+1);
  car.dataset.carDir=dir||(to>from?'next':'prev');
  slides.forEach(s=>s.classList.remove('is-leaving'));
  if(!reduced.matches){slides[from].classList.add('is-leaving');car.classList.add('is-moving');clearTimeout(timer);timer=setTimeout(()=>{car.classList.remove('is-moving');slides[from].classList.remove('is-leaving');},380);}
  paint();
 }
 prev.addEventListener('click',()=>go(i-1,'prev'));next.addEventListener('click',()=>go(i+1,'next'));
 car.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'){e.preventDefault();go(i-1,'prev');}else if(e.key==='ArrowRight'){e.preventDefault();go(i+1,'next');}});
 let x0=null,y0=null;
 track.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button!==0)return;x0=e.clientX;y0=e.clientY;},{passive:true});
 track.addEventListener('pointerup',e=>{if(x0===null)return;const dx=e.clientX-x0,dy=e.clientY-y0;x0=null;if(Math.abs(dx)>40&&Math.abs(dx)>Math.abs(dy)*1.5)go(dx<0?i+1:i-1,dx<0?'next':'prev');},{passive:true});
 track.addEventListener('pointercancel',()=>{x0=null;},{passive:true});
 track.addEventListener('dragstart',e=>e.preventDefault());
 car.addEventListener('pointerenter',()=>warm(i+1),{passive:true});car.addEventListener('focusin',()=>warm(i+1));
 prev.hidden=false;next.hidden=false;if(nav)nav.hidden=false;car.classList.add('is-ready');paint();
});
})();
