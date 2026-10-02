/* Réception des liens Léo : décision explicite, transaction par le calculateur existant. */
(function(){'use strict';
const L=window.LKLeoLink,api=window.LKCalculator?.leo;if(!L||!api)return;
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n;};
const labels={capital:'I already have',target:'I want to have',hourly:'I earn roughly, per hour of play',reserve:'Money set aside',price:'The price I imagine',minutes:'My play time (minutes)',dailyMinutes:'I play each day (minutes)',players:'Players, including me'},nf=new Intl.NumberFormat('en-US');
let dialog=null,oldOverflow='',previousFocus=null;
function returnLink(back){document.getElementById('leo-return')?.remove();if(!L.safeReturn(back))return;const p=el('p',null,'leo-return');p.id='leo-return';const a=el('a','Back to my page and my chat with Léo ↗');a.href=back;p.append(a);document.querySelector('.calc-tuto-links')?.after(p);}
/* v7.59 (check ultime, D-10) : même garde que le tiroir du calculateur (navigateur sans <dialog>.close()) : la fenêtre se retire quand même et le lien de retour est posé. */
function close(keep=true){if(keep)api.keep();if(dialog){if(typeof dialog.close==='function'&&dialog.open)dialog.close();dialog.remove();dialog=null;}document.documentElement.style.overflow=oldOverflow;if(previousFocus?.isConnected&&previousFocus!==document.body)previousFocus.focus({preventScroll:true});else document.querySelector('[data-tab][aria-selected="true"]')?.focus({preventScroll:true});window.LKLeoLoader?.place();}
function open(raw){if(dialog)return;previousFocus=document.activeElement;oldOverflow=document.documentElement.style.overflow;dialog=el('dialog',null,'leo-transfer');dialog.id='leo-transfer';dialog.setAttribute('aria-labelledby','leo-transfer-title');dialog.setAttribute('aria-describedby','leo-transfer-description');const title=el('h2','Set up this calculation with Léo');title.id='leo-transfer-title';const description=el('p');description.id='leo-transfer-description';dialog.append(title,description);const error=el('p',null,'leo-error');error.setAttribute('role','status');
 const button=(text,fn,secondary=false)=>{const b=el('button',text,'leo-action'+(secondary?' secondary':''));b.type='button';b.addEventListener('click',fn);dialog.append(b);return b;};
 let info;try{if(raw instanceof Error)throw raw;info=api.inspect(raw);description.textContent=info.hasCurrent?'A calculation is already open: “'+info.currentName+'”. '+(info.dirty?'It has numbers that are not saved yet. ':'')+'Before changing it, Léo keeps a copy in “My calculations” (“My plans” list).':'Check the numbers in this request. You’ll fill in any missing fields in the calculator.';
  const list=el('ul');list.append(el('li','Tool: '+info.tool));for(const [key,value] of Object.entries(info.request.values))list.append(el('li',labels[key]+': '+nf.format(value)));for(const name of info.items)list.append(el('li','Selected purchase: '+name));dialog.append(list);
  if(info.items.length&&!Object.hasOwn(info.request.values,'price'))dialog.append(el('p','No price sent. Any price that isn’t known yet is left for you to enter.'));
  dialog.append(el('p',(info.hasCurrent?'Filling in only changes the numbers shown and keeps the rest of your current calculation. ':'')+'A new calculation starts from scratch: you’ll fill in the missing fields.'));
  const apply=mode=>{try{const result=api.apply(info.request,mode);close(false);returnLink(result.back);document.getElementById('atelier')?.scrollIntoView({block:'start',behavior:'instant'});document.getElementById('tab-'+result.tool)?.focus({preventScroll:true});}catch(e){error.textContent=e.message;}};
  if(info.hasCurrent)button('Fill in my calculation with these numbers',()=>apply('merge'));
  button(info.hasCurrent?'Keep a copy and open the new one':'Start a new calculation',()=>apply('new'));
 }catch(e){description.textContent='This link can’t be used. Your current calculation and your saved calculations stay untouched.';error.textContent=e.message;}
 dialog.append(error);const keep=button('Keep my current calculation',()=>close(),true);dialog.addEventListener('cancel',e=>{e.preventDefault();close();});document.body.append(dialog);document.documentElement.style.overflow='hidden';if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','');keep.focus({preventScroll:true});window.LKLeoLoader?.place();
}
window.LKLeoTransfer={open};returnLink(api.returnTo());
try{const req=L.fromURL(location.search);if(req)open(req);}catch(e){open(e);}
})();
