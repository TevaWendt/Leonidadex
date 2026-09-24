(function(){'use strict';
if(!window.LK_ACQUISITIONS||!window.LKProgression)return;
const message=text=>{const box=document.getElementById('acq-feedback');if(box)box.textContent=text;else window.LK?.status(text);};
let store;try{store=window.LKProgression.create({storage:localStorage,acquisitions:window.LK_ACQUISITIONS,notice:message});}catch{message('Le suivi local est indisponible dans ce navigateur. Les fiches restent consultables.');return;}
function render(){document.querySelectorAll('[data-acq-toggle]').forEach(input=>{const item=window.LK_ACQUISITIONS.items.find(x=>x.id===input.dataset.acqToggle);if(!item)return;input.checked=store.checked(item);input.closest('label').hidden=false;});}
document.addEventListener('change',event=>{const input=event.target.closest('[data-acq-toggle]');if(!input)return;if(store.toggle(input.dataset.acqToggle,input.checked))message('Suivi enregistré sur cet appareil.');render();});
store.migrate();render();store.subscribe(render);window.addEventListener('storage',render);window.addEventListener('pageshow',render);
})();
