/* Réception des liens Léo : décision explicite, transaction par le calculateur existant. */
(function(){'use strict';
const L=window.LKLeoLink,api=window.LKCalculator?.leo;if(!L||!api)return;
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n;};
const labels={capital:'Já tenho',target:'Quero ter',hourly:'Ganho mais ou menos, por hora de jogo',reserve:'Dinheiro guardado',price:'Preço que imagino',minutes:'Meu tempo de jogo (minutos)',dailyMinutes:'Jogo todo dia (minutos)',players:'Jogadores, eu incluído'},nf=new Intl.NumberFormat('pt-BR');
let dialog=null,oldOverflow='',previousFocus=null;
function returnLink(back){document.getElementById('leo-return')?.remove();if(!L.safeReturn(back))return;const p=el('p',null,'leo-return');p.id='leo-return';const a=el('a','Voltar à minha página e à conversa com o Léo ↗');a.href=back;p.append(a);document.querySelector('.calc-tuto-links')?.after(p);}
/* v7.59 (check ultime, D-10) : même garde que le tiroir du calculateur (navigateur sans <dialog>.close()) : la fenêtre se retire quand même et le lien de retour est posé. */
function close(keep=true){if(keep)api.keep();if(dialog){if(typeof dialog.close==='function'&&dialog.open)dialog.close();dialog.remove();dialog=null;}document.documentElement.style.overflow=oldOverflow;if(previousFocus?.isConnected&&previousFocus!==document.body)previousFocus.focus({preventScroll:true});else document.querySelector('[data-tab][aria-selected="true"]')?.focus({preventScroll:true});window.LKLeoLoader?.place();}
function open(raw){if(dialog)return;previousFocus=document.activeElement;oldOverflow=document.documentElement.style.overflow;dialog=el('dialog',null,'leo-transfer');dialog.id='leo-transfer';dialog.setAttribute('aria-labelledby','leo-transfer-title');dialog.setAttribute('aria-describedby','leo-transfer-description');const title=el('h2','Preparar este cálculo com o Léo');title.id='leo-transfer-title';const description=el('p');description.id='leo-transfer-description';dialog.append(title,description);const error=el('p',null,'leo-error');error.setAttribute('role','status');
 const button=(text,fn,secondary=false)=>{const b=el('button',text,'leo-action'+(secondary?' secondary':''));b.type='button';b.addEventListener('click',fn);dialog.append(b);return b;};
 let info;try{if(raw instanceof Error)throw raw;info=api.inspect(raw);description.textContent=info.hasCurrent?'Já existe um cálculo aberto: “'+info.currentName+'”. '+(info.dirty?'Ele tem números ainda não salvos. ':'')+'Antes de modificá-lo, o Léo guarda uma cópia em “Meus cálculos” (lista “Meus planos”).':'Confira os números deste pedido. Os campos que faltarem você preencherá na calculadora.';
  const list=el('ul');list.append(el('li','Ferramenta: '+info.tool));for(const [key,value] of Object.entries(info.request.values))list.append(el('li',labels[key]+': '+nf.format(value)));for(const name of info.items)list.append(el('li','Compra selecionada: '+name));dialog.append(list);
  if(info.items.length&&!Object.hasOwn(info.request.values,'price'))dialog.append(el('p','Nenhum preço enviado. Um preço ainda não conhecido ficará para você escrever.'));
  dialog.append(el('p',(info.hasCurrent?'Completar muda apenas os números exibidos e mantém o resto do seu cálculo em andamento. ':'')+'Um novo cálculo começa do zero: os campos que faltarem você terá de preencher.'));
  const apply=mode=>{try{const result=api.apply(info.request,mode);close(false);returnLink(result.back);document.getElementById('atelier')?.scrollIntoView({block:'start',behavior:'instant'});document.getElementById('tab-'+result.tool)?.focus({preventScroll:true});}catch(e){error.textContent=e.message;}};
  if(info.hasCurrent)button('Completar meu cálculo com estes números',()=>apply('merge'));
  button(info.hasCurrent?'Guardar uma cópia e abrir o novo':'Começar um novo cálculo',()=>apply('new'));
 }catch(e){description.textContent='Este link não pode ser usado. Seu cálculo em andamento e seus cálculos salvos não mudam.';error.textContent=e.message;}
 dialog.append(error);const keep=button('Manter meu cálculo em andamento',()=>close(),true);dialog.addEventListener('cancel',e=>{e.preventDefault();close();});document.body.append(dialog);document.documentElement.style.overflow='hidden';if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','');keep.focus({preventScroll:true});window.LKLeoLoader?.place();
}
window.LKLeoTransfer={open};returnLink(api.returnTo());
try{const req=L.fromURL(location.search);if(req)open(req);}catch(e){open(e);}
})();
