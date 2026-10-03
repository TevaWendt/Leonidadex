/* Réception des liens Léo : décision explicite, transaction par le calculateur existant. */
(function(){'use strict';
const L=window.LKLeoLink,api=window.LKCalculator?.leo;if(!L||!api)return;
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n;};
const labels={capital:'Ho già',target:'Voglio avere',hourly:'Guadagno più o meno, all’ora di gioco',reserve:'Soldi tenuti da parte',price:'Prezzo che immagino',minutes:'Il mio tempo di gioco (minuti)',dailyMinutes:'Gioco ogni giorno (minuti)',players:'Giocatori, me compreso'},nf=new Intl.NumberFormat('it-IT');
let dialog=null,oldOverflow='',previousFocus=null;
function returnLink(back){document.getElementById('leo-return')?.remove();if(!L.safeReturn(back))return;const p=el('p',null,'leo-return');p.id='leo-return';const a=el('a','Torna alla mia pagina e alla chat con Léo ↗');a.href=back;p.append(a);document.querySelector('.calc-tuto-links')?.after(p);}
/* v7.59 (check ultime, D-10) : même garde que le tiroir du calculateur (navigateur sans <dialog>.close()) : la fenêtre se retire quand même et le lien de retour est posé. */
function close(keep=true){if(keep)api.keep();if(dialog){if(typeof dialog.close==='function'&&dialog.open)dialog.close();dialog.remove();dialog=null;}document.documentElement.style.overflow=oldOverflow;if(previousFocus?.isConnected&&previousFocus!==document.body)previousFocus.focus({preventScroll:true});else document.querySelector('[data-tab][aria-selected="true"]')?.focus({preventScroll:true});window.LKLeoLoader?.place();}
function open(raw){if(dialog)return;previousFocus=document.activeElement;oldOverflow=document.documentElement.style.overflow;dialog=el('dialog',null,'leo-transfer');dialog.id='leo-transfer';dialog.setAttribute('aria-labelledby','leo-transfer-title');dialog.setAttribute('aria-describedby','leo-transfer-description');const title=el('h2','Prepara questo calcolo con Léo');title.id='leo-transfer-title';const description=el('p');description.id='leo-transfer-description';dialog.append(title,description);const error=el('p',null,'leo-error');error.setAttribute('role','status');
 const button=(text,fn,secondary=false)=>{const b=el('button',text,'leo-action'+(secondary?' secondary':''));b.type='button';b.addEventListener('click',fn);dialog.append(b);return b;};
 let info;try{if(raw instanceof Error)throw raw;info=api.inspect(raw);description.textContent=info.hasCurrent?'C’è già un calcolo aperto: “'+info.currentName+'”. '+(info.dirty?'Ha dei numeri non ancora salvati. ':'')+'Prima di modificarlo, Léo ne tiene una copia in “I miei calcoli” (elenco “I miei piani”).':'Controlla i numeri di questa richiesta. Le caselle mancanti saranno da compilare nel calcolatore.';
  const list=el('ul');list.append(el('li','Strumento: '+info.tool));for(const [key,value] of Object.entries(info.request.values))list.append(el('li',labels[key]+': '+nf.format(value)));for(const name of info.items)list.append(el('li','Acquisto selezionato: '+name));dialog.append(list);
  if(info.items.length&&!Object.hasOwn(info.request.values,'price'))dialog.append(el('p','Nessun prezzo inviato. Un prezzo non ancora noto resterà da scrivere.'));
  dialog.append(el('p',(info.hasCurrent?'Completare cambia solo i numeri mostrati e mantiene il resto del tuo calcolo in corso. ':'')+'Un nuovo calcolo riparte da zero: le caselle mancanti saranno da compilare.'));
  const apply=mode=>{try{const result=api.apply(info.request,mode);close(false);returnLink(result.back);document.getElementById('atelier')?.scrollIntoView({block:'start',behavior:'instant'});document.getElementById('tab-'+result.tool)?.focus({preventScroll:true});}catch(e){error.textContent=e.message;}};
  if(info.hasCurrent)button('Completa il mio calcolo con questi numeri',()=>apply('merge'));
  button(info.hasCurrent?'Conserva una copia e apri il nuovo':'Inizia un nuovo calcolo',()=>apply('new'));
 }catch(e){description.textContent='Questo link non si può usare. Il tuo calcolo in corso e i calcoli salvati non cambiano.';error.textContent=e.message;}
 dialog.append(error);const keep=button('Mantieni il mio calcolo in corso',()=>close(),true);dialog.addEventListener('cancel',e=>{e.preventDefault();close();});document.body.append(dialog);document.documentElement.style.overflow='hidden';if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','');keep.focus({preventScroll:true});window.LKLeoLoader?.place();
}
window.LKLeoTransfer={open};returnLink(api.returnTo());
try{const req=L.fromURL(location.search);if(req)open(req);}catch(e){open(e);}
})();
