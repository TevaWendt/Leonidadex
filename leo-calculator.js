/* Réception des liens Léo : décision explicite, transaction par le calculateur existant. */
(function(){'use strict';
const L=window.LKLeoLink,api=window.LKCalculator?.leo;if(!L||!api)return;
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n;};
const labels={capital:'J’ai déjà',target:'Je veux avoir',hourly:'Je gagne à peu près, par heure de jeu',reserve:'Argent gardé de côté',price:'Prix que j’imagine',minutes:'Mon temps de jeu (minutes)',dailyMinutes:'Je joue chaque jour (minutes)',players:'Joueurs, moi compris'},nf=new Intl.NumberFormat('fr-FR');
let dialog=null,oldOverflow='',previousFocus=null;
function returnLink(back){document.getElementById('leo-return')?.remove();if(!L.safeReturn(back))return;const p=el('p',null,'leo-return');p.id='leo-return';const a=el('a','Revenir à ma page et à l’échange avec Léo ↗');a.href=back;p.append(a);document.querySelector('.calc-tuto-links')?.after(p);}
function close(keep=true){if(keep)api.keep();if(dialog){dialog.close();dialog.remove();dialog=null;}document.documentElement.style.overflow=oldOverflow;if(previousFocus?.isConnected&&previousFocus!==document.body)previousFocus.focus({preventScroll:true});else document.querySelector('[data-tab][aria-selected="true"]')?.focus({preventScroll:true});window.LKLeoLoader?.place();}
function open(raw){if(dialog)return;previousFocus=document.activeElement;oldOverflow=document.documentElement.style.overflow;dialog=el('dialog',null,'leo-transfer');dialog.id='leo-transfer';dialog.setAttribute('aria-labelledby','leo-transfer-title');dialog.setAttribute('aria-describedby','leo-transfer-description');const title=el('h2','Préparer ce calcul avec Léo');title.id='leo-transfer-title';const description=el('p');description.id='leo-transfer-description';dialog.append(title,description);const error=el('p',null,'leo-error');error.setAttribute('role','status');
 const button=(text,fn,secondary=false)=>{const b=el('button',text,'leo-action'+(secondary?' secondary':''));b.type='button';b.addEventListener('click',fn);dialog.append(b);return b;};
 let info;try{if(raw instanceof Error)throw raw;info=api.inspect(raw);description.textContent=info.hasCurrent?'Un calcul est déjà ouvert : « '+info.currentName+' ». '+(info.dirty?'Il a des chiffres pas encore enregistrés. ':'')+'Avant de le modifier, Léo conservera une copie dans Mes plans enregistrés.':'Vérifie les chiffres de cette demande. Les cases manquantes seront à remplir dans le calculateur.';
  const list=el('ul');list.append(el('li','Outil : '+info.tool));for(const [key,value] of Object.entries(info.request.values))list.append(el('li',labels[key]+' : '+nf.format(value)));for(const name of info.items)list.append(el('li','Achat sélectionné : '+name));dialog.append(list);
  if(info.items.length&&!Object.hasOwn(info.request.values,'price'))dialog.append(el('p','Aucun prix envoyé. Un prix pas encore connu restera à écrire.'));
  dialog.append(el('p',(info.hasCurrent?'Compléter change seulement les chiffres affichés et garde le reste de ton calcul en cours. ':'')+'Un nouveau calcul repart de zéro : les cases manquantes seront à remplir.'));
  const apply=mode=>{try{const result=api.apply(info.request,mode);close(false);returnLink(result.back);document.getElementById('atelier')?.scrollIntoView({block:'start',behavior:'instant'});document.getElementById('tab-'+result.tool)?.focus({preventScroll:true});}catch(e){error.textContent=e.message;}};
  if(info.hasCurrent)button('Compléter mon calcul avec ces chiffres',()=>apply('merge'));
  button(info.hasCurrent?'Conserver une copie et ouvrir le nouveau':'Commencer un nouveau calcul',()=>apply('new'));
 }catch(e){description.textContent='Ce lien ne peut pas être utilisé. Ton calcul en cours et tes carnets ne bougent pas.';error.textContent=e.message;}
 dialog.append(error);const keep=button('Garder mon calcul en cours',()=>close(),true);dialog.addEventListener('cancel',e=>{e.preventDefault();close();});document.body.append(dialog);document.documentElement.style.overflow='hidden';dialog.showModal();keep.focus({preventScroll:true});window.LKLeoLoader?.place();
}
window.LKLeoTransfer={open};returnLink(api.returnTo());
try{const req=L.fromURL(location.search);if(req)open(req);}catch(e){open(e);}
})();
