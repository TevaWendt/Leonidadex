/* Réception des liens Léo : décision explicite, transaction par le calculateur existant. */
(function(){'use strict';
const L=window.LKLeoLink,api=window.LKCalculator?.leo;if(!L||!api)return;
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n;};
const labels={capital:'Ich habe schon',target:'Ich will haben',hourly:'Ich verdiene ungefähr, pro Spielstunde',reserve:'Rücklage',price:'Preis, den ich mir vorstelle',minutes:'Meine Spielzeit (Minuten)',dailyMinutes:'Ich spiele jeden Tag (Minuten)',players:'Spieler, mich eingeschlossen'},nf=new Intl.NumberFormat('de-DE');
let dialog=null,oldOverflow='',previousFocus=null;
function returnLink(back){document.getElementById('leo-return')?.remove();if(!L.safeReturn(back))return;const p=el('p',null,'leo-return');p.id='leo-return';const a=el('a','Zurück zu meiner Seite und zum Gespräch mit Léo ↗');a.href=back;p.append(a);document.querySelector('.calc-tuto-links')?.after(p);}
/* v7.59 (check ultime, D-10) : même garde que le tiroir du calculateur (navigateur sans <dialog>.close()) : la fenêtre se retire quand même et le lien de retour est posé. */
function close(keep=true){if(keep)api.keep();if(dialog){if(typeof dialog.close==='function'&&dialog.open)dialog.close();dialog.remove();dialog=null;}document.documentElement.style.overflow=oldOverflow;if(previousFocus?.isConnected&&previousFocus!==document.body)previousFocus.focus({preventScroll:true});else document.querySelector('[data-tab][aria-selected="true"]')?.focus({preventScroll:true});window.LKLeoLoader?.place();}
function open(raw){if(dialog)return;previousFocus=document.activeElement;oldOverflow=document.documentElement.style.overflow;dialog=el('dialog',null,'leo-transfer');dialog.id='leo-transfer';dialog.setAttribute('aria-labelledby','leo-transfer-title');dialog.setAttribute('aria-describedby','leo-transfer-description');const title=el('h2','Diese Berechnung mit Léo vorbereiten');title.id='leo-transfer-title';const description=el('p');description.id='leo-transfer-description';dialog.append(title,description);const error=el('p',null,'leo-error');error.setAttribute('role','status');
 const button=(text,fn,secondary=false)=>{const b=el('button',text,'leo-action'+(secondary?' secondary':''));b.type='button';b.addEventListener('click',fn);dialog.append(b);return b;};
 let info;try{if(raw instanceof Error)throw raw;info=api.inspect(raw);description.textContent=info.hasCurrent?'Eine Berechnung ist schon geöffnet: „'+info.currentName+'“. '+(info.dirty?'Sie hat noch nicht gespeicherte Zahlen. ':'')+'Bevor Léo sie ändert, legt er eine Kopie in „Meine Berechnungen“ ab (Liste „Meine Pläne“).':'Prüfe die Zahlen dieser Anfrage. Fehlende Felder füllst du im Rechner aus.';
  const list=el('ul');list.append(el('li','Werkzeug: '+info.tool));for(const [key,value] of Object.entries(info.request.values))list.append(el('li',labels[key]+': '+nf.format(value)));for(const name of info.items)list.append(el('li','Ausgewählter Kauf: '+name));dialog.append(list);
  if(info.items.length&&!Object.hasOwn(info.request.values,'price'))dialog.append(el('p','Kein Preis übermittelt. Ein noch unbekannter Preis bleibt einzutragen.'));
  dialog.append(el('p',(info.hasCurrent?'Ergänzen ändert nur die angezeigten Zahlen und behält den Rest deiner aktuellen Berechnung. ':'')+'Eine neue Berechnung beginnt bei null: Die fehlenden Felder musst du ausfüllen.'));
  const apply=mode=>{try{const result=api.apply(info.request,mode);close(false);returnLink(result.back);document.getElementById('atelier')?.scrollIntoView({block:'start',behavior:'instant'});document.getElementById('tab-'+result.tool)?.focus({preventScroll:true});}catch(e){error.textContent=e.message;}};
  if(info.hasCurrent)button('Meine Berechnung mit diesen Zahlen ergänzen',()=>apply('merge'));
  button(info.hasCurrent?'Eine Kopie behalten und die neue öffnen':'Eine neue Berechnung beginnen',()=>apply('new'));
 }catch(e){description.textContent='Dieser Link kann nicht verwendet werden. Deine aktuelle Berechnung und deine gespeicherten Berechnungen bleiben unverändert.';error.textContent=e.message;}
 dialog.append(error);const keep=button('Meine aktuelle Berechnung behalten',()=>close(),true);dialog.addEventListener('cancel',e=>{e.preventDefault();close();});document.body.append(dialog);document.documentElement.style.overflow='hidden';if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','');keep.focus({preventScroll:true});window.LKLeoLoader?.place();
}
window.LKLeoTransfer={open};returnLink(api.returnTo());
try{const req=L.fromURL(location.search);if(req)open(req);}catch(e){open(e);}
})();
