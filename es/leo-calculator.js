/* Réception des liens Léo : décision explicite, transaction par le calculateur existant. */
(function(){'use strict';
const L=window.LKLeoLink,api=window.LKCalculator?.leo;if(!L||!api)return;
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n;};
const labels={capital:'Ya tengo',target:'Quiero tener',hourly:'Gano más o menos, por hora de juego',reserve:'Dinero apartado',price:'Precio que imagino',minutes:'Mi tiempo de juego (minutos)',dailyMinutes:'Juego cada día (minutos)',players:'Jugadores, yo incluido'},nf=new Intl.NumberFormat('es-ES');
let dialog=null,oldOverflow='',previousFocus=null;
function returnLink(back){document.getElementById('leo-return')?.remove();if(!L.safeReturn(back))return;const p=el('p',null,'leo-return');p.id='leo-return';const a=el('a','Volver a mi página y a la conversación con Léo ↗');a.href=back;p.append(a);document.querySelector('.calc-tuto-links')?.after(p);}
/* v7.59 (check ultime, D-10) : même garde que le tiroir du calculateur (navigateur sans <dialog>.close()) : la fenêtre se retire quand même et le lien de retour est posé. */
function close(keep=true){if(keep)api.keep();if(dialog){if(typeof dialog.close==='function'&&dialog.open)dialog.close();dialog.remove();dialog=null;}document.documentElement.style.overflow=oldOverflow;if(previousFocus?.isConnected&&previousFocus!==document.body)previousFocus.focus({preventScroll:true});else document.querySelector('[data-tab][aria-selected="true"]')?.focus({preventScroll:true});window.LKLeoLoader?.place();}
function open(raw){if(dialog)return;previousFocus=document.activeElement;oldOverflow=document.documentElement.style.overflow;dialog=el('dialog',null,'leo-transfer');dialog.id='leo-transfer';dialog.setAttribute('aria-labelledby','leo-transfer-title');dialog.setAttribute('aria-describedby','leo-transfer-description');const title=el('h2','Preparar este cálculo con Léo');title.id='leo-transfer-title';const description=el('p');description.id='leo-transfer-description';dialog.append(title,description);const error=el('p',null,'leo-error');error.setAttribute('role','status');
 const button=(text,fn,secondary=false)=>{const b=el('button',text,'leo-action'+(secondary?' secondary':''));b.type='button';b.addEventListener('click',fn);dialog.append(b);return b;};
 let info;try{if(raw instanceof Error)throw raw;info=api.inspect(raw);description.textContent=info.hasCurrent?'Ya hay un cálculo abierto: “'+info.currentName+'”. '+(info.dirty?'Tiene cifras aún no guardadas. ':'')+'Antes de modificarlo, Léo guarda una copia en “Mis cálculos” (lista “Mis planes”).':'Revisa las cifras de esta petición. Las casillas que falten tendrás que rellenarlas en la calculadora.';
  const list=el('ul');list.append(el('li','Herramienta: '+info.tool));for(const [key,value] of Object.entries(info.request.values))list.append(el('li',labels[key]+': '+nf.format(value)));for(const name of info.items)list.append(el('li','Compra seleccionada: '+name));dialog.append(list);
  if(info.items.length&&!Object.hasOwn(info.request.values,'price'))dialog.append(el('p','No se ha enviado ningún precio. Un precio que aún no se conoce quedará por escribir.'));
  dialog.append(el('p',(info.hasCurrent?'Completar solo cambia las cifras que se muestran y mantiene el resto de tu cálculo en curso. ':'')+'Un cálculo nuevo empieza de cero: tendrás que rellenar las casillas que falten.'));
  const apply=mode=>{try{const result=api.apply(info.request,mode);close(false);returnLink(result.back);document.getElementById('atelier')?.scrollIntoView({block:'start',behavior:'instant'});document.getElementById('tab-'+result.tool)?.focus({preventScroll:true});}catch(e){error.textContent=e.message;}};
  if(info.hasCurrent)button('Completar mi cálculo con estas cifras',()=>apply('merge'));
  button(info.hasCurrent?'Conservar una copia y abrir el nuevo':'Empezar un cálculo nuevo',()=>apply('new'));
 }catch(e){description.textContent='Este enlace no se puede usar. Tu cálculo en curso y tus cálculos guardados no cambian.';error.textContent=e.message;}
 dialog.append(error);const keep=button('Mantener mi cálculo en curso',()=>close(),true);dialog.addEventListener('cancel',e=>{e.preventDefault();close();});document.body.append(dialog);document.documentElement.style.overflow='hidden';if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','');keep.focus({preventScroll:true});window.LKLeoLoader?.place();
}
window.LKLeoTransfer={open};returnLink(api.returnTo());
try{const req=L.fromURL(location.search);if(req)open(req);}catch(e){open(e);}
})();
