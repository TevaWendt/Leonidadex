/* Généré depuis outils/sources/contact.js : modifie la source, pas ce fichier. */
(function(){'use strict';const $=id=>document.getElementById(id);
const links=[...document.querySelectorAll('a.lk-mail[data-u][data-d]')];let ADDRESS='';
for(const a of links){const addr=a.dataset.u+'@'+a.dataset.d;if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addr))continue;ADDRESS=addr;a.replaceChildren(a.dataset.u+'@',document.createElement('wbr'),a.dataset.d);a.href='mailto:'+addr;}
const copyText=async(text,button,ok)=>{try{if(window.LK&&window.LK.copy)return await window.LK.copy(text,button,ok);await navigator.clipboard.writeText(text);return true;}catch{return false;}};
const copyAddress=$('contact-copy-address');if(copyAddress&&ADDRESS)copyAddress.addEventListener('click',async()=>{const ok=await copyText(ADDRESS,copyAddress,'Endereço copiado');const s=$('contact-status');if(s)s.textContent=ok?'Endereço copiado: '+ADDRESS+'.':'Não foi possível copiar: o endereço é '+ADDRESS+'.';});
const form=$('contact-draft');if(!form)return;
const F={topic:$('contact-topic'),page:$('contact-page'),details:$('contact-details'),source:$('contact-source'),email:$('contact-email')};
const output=$('contact-preview'),status=$('contact-status'),result=$('contact-result'),fallback=$('contact-fallback'),mailto=$('contact-mailto'),send=$('contact-send'),count=$('contact-count');
const DRAFT='lk_contact_draft_v1',startedAt=Date.now(),MAX_MAILTO=1800;let busy=false,saveTimer=0;
const isURL=v=>{try{const u=new URL(v);return u.protocol==='https:'||u.protocol==='http:';}catch{return false;}};
const isEmail=v=>/^[^\s<>@,;"]+@[^\s<>@,;"]+\.[^\s<>@,;"]{2,}$/.test(v)&&v.length<=254;
const values=()=>({topic:F.topic.value,page:F.page.value.trim(),details:F.details.value.trim(),source:F.source.value.trim(),email:F.email?F.email.value.trim():''});
const topicLabel=t=>{for(const o of F.topic.options)if(o.value===t)return o.textContent;return t;};
const compose=v=>['Assunto: '+topicLabel(v.topic),'Página: '+(v.page||'A especificar'),'','Descrição e correção proposta:',v.details,'','Fonte: '+(v.source||'A especificar')].concat(v.email?['','Endereço para resposta: '+v.email]:[]).join('\n');
function mailtoHref(v){if(!ADDRESS)return '#ecrire';const subject='[Leonidakit] '+topicLabel(v.topic);let body=compose(v),href='mailto:'+ADDRESS+'?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body);
 if(href.length>MAX_MAILTO){const note='\n\n[…] Texto cortado: cole o restante com o botão “Copiar o texto” da página.',cps=Array.from(body),cut=n=>cps.slice(0,n).join('');let lo=0,hi=cps.length;while(lo<hi){const mid=Math.ceil((lo+hi)/2),h='mailto:'+ADDRESS+'?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(cut(mid)+note);if(h.length<=MAX_MAILTO)lo=mid;else hi=mid-1;}href='mailto:'+ADDRESS+'?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(cut(lo)+note);}
 return href;}
function refresh(){const v=values();if(count)count.textContent=new Intl.NumberFormat('pt-BR').format(F.details.value.length)+' de 5.000 caracteres';if(mailto){let h='#ecrire';try{h=mailtoHref(v);}catch{h='#ecrire';}mailto.href=h;}}
function setError(name,text){const input=F[name],err=$('err-'+name);if(!input)return;if(text){input.setAttribute('aria-invalid','true');if(err)err.textContent=text;}else{input.removeAttribute('aria-invalid');if(err)err.textContent='';}}
function check(){const v=values(),errors={};
 if(v.details.length<10)errors.details='Descreva o que você notou em poucas palavras (pelo menos 10 caracteres).';else if(v.details.length>5000)errors.details='A mensagem passa de 5.000 caracteres.';
 if(v.page&&!isURL(v.page))errors.page='O endereço da página deve começar com https://.';
 if(v.source&&!isURL(v.source))errors.source='O link da fonte deve começar com https://.';
 if(v.email&&!isEmail(v.email))errors.email='Este e-mail não parece válido (ele é opcional).';
 for(const k of Object.keys(F))setError(k,errors[k]||'');const first=Object.keys(F).find(k=>errors[k]);return {ok:!first,first,errors};}
function saveDraft(){try{const v=values();if(!v.details&&!v.page&&!v.source&&!v.email){localStorage.removeItem(DRAFT);return;}localStorage.setItem(DRAFT,JSON.stringify({v:1,at:Date.now(),...v}));}catch{}}
function clearDraft(){try{localStorage.removeItem(DRAFT);}catch{}}
function restoreDraft(){try{const raw=localStorage.getItem(DRAFT);if(!raw||raw.length>20000)return false;const d=JSON.parse(raw);if(d.v!==1)return false;for(const k of Object.keys(F)){if(!F[k]||typeof d[k]!=='string')continue;if(k==='topic'){const o=[...F.topic.options].find(o=>o.value===d.topic)||[...F.topic.options].find(o=>o.textContent===d.topic);if(o)F.topic.value=o.value;}else F[k].value=d[k];}return !!(d.details||d.page);}catch{return false;}}
let prefilled=false;
try{const h=location.hash.slice(1),p=new URLSearchParams(/(?:^|&)(?:motif|question|reponse|details|page|source)=/.test(h)?h:location.search);const pick=(k,max)=>{const v=p.get(k);return typeof v==='string'?v.replace(/[\u0000-\u0008\u000b-\u001f]/g,' ').slice(0,max):'';};
 const motif=pick('motif',60);if(motif){const wanted=motif==='leo'?'Resposta do Léo a corrigir':motif;for(const o of F.topic.options)if(o.textContent===wanted||o.value===wanted)F.topic.value=o.value;}
 const page=pick('page',1000);if(page){try{const u=new URL(page,location.origin);if(u.origin===location.origin)F.page.value=u.href;}catch{}}
 const source=pick('source',1000);if(source&&/^https?:\/\//.test(source))F.source.value=source;
 const question=pick('question',300),reponse=pick('reponse',300),details=pick('details',3000);
 if(question||reponse)F.details.value=['Pergunta feita ao Léo: '+question,'Resposta do Léo: '+reponse,'','O que está errado ou o que falta: ','Fonte que permite conferir: '].join('\n');else if(details)F.details.value=details;
 if(motif||page||question||details){prefilled=true;status.textContent='Campos preenchidos a partir do link. Nada é enviado até você clicar em “Enviar a mensagem”.';F.details.focus({preventScroll:true});}}catch{}
if(!prefilled&&restoreDraft())status.textContent='Seu rascunho foi encontrado neste navegador.';
refresh();
form.addEventListener('input',()=>{refresh();clearTimeout(saveTimer);saveTimer=setTimeout(saveDraft,300);});
form.addEventListener('change',()=>{refresh();saveDraft();});window.addEventListener('pagehide',()=>{if(!busy)saveDraft();});
function prepare(){const c=check();if(!c.ok){F[c.first].focus();status.textContent='Corrija o campo indicado e tente de novo.';return false;}
 output.value=compose(values());$('contact-copy').disabled=false;$('contact-download').disabled=false;status.textContent='Texto pronto. Nenhuma mensagem foi enviada: copie, baixe ou abra seu app de e-mail.';return true;}
$('contact-prepare').addEventListener('click',()=>{if(prepare())output.focus();});
$('contact-copy').addEventListener('click',async()=>{const ok=await copyText(output.value);status.textContent=ok?'Texto copiado. Nenhuma mensagem enviada.':'Selecione o texto e copie manualmente.';if(!ok){output.focus();output.select();}});
$('contact-download').addEventListener('click',()=>{const blob=new Blob([output.value],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='signalement-leonidakit.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status.textContent='Texto baixado. Nenhuma mensagem enviada.';});
const clearBtn=$('contact-clear');if(clearBtn)clearBtn.addEventListener('click',()=>{clearDraft();for(const k of ['page','details','source','email'])if(F[k])F[k].value='';F.topic.selectedIndex=0;output.value='';$('contact-copy').disabled=true;$('contact-download').disabled=true;refresh();status.textContent='Rascunho apagado deste navegador.';});
function showResult(text,kind){result.textContent=text;result.className='info-result'+(kind?' is-'+kind:'');}
function showFallback(){output.value=compose(values());$('contact-copy').disabled=false;$('contact-download').disabled=false;fallback.hidden=false;refresh();}
function localMessage(d){const end=' '+ADDRESS+': seu texto está pronto para copiar.';switch(d.field||d.code){case 'topic':return 'Escolha um motivo na lista.';case 'details':return F.details&&F.details.value.length>5000?'A mensagem passa de 5.000 caracteres.':'Descreva o que você notou em poucas palavras (pelo menos 10 caracteres).';case 'page':return 'O endereço da página não é válido.';case 'source':return 'O link da fonte não é válido.';case 'email':return 'Seu endereço de e-mail não parece válido (ele é opcional).';case 'format':return 'Não foi possível ler a mensagem.';case 'refused':return 'Não foi possível enviar a mensagem.';case 'too-fast':return 'Envio rápido demais: releia sua mensagem e tente de novo em alguns segundos.';case 'stale':return 'A página está aberta há tempo demais: recarregue-a e tente de novo.';case 'method':return 'Aqui só é aceito o envio do formulário.';case 'origin':return 'Envio recusado a partir deste endereço.';case 'size':return 'A mensagem é longa demais.';case 'rate':return 'Envios demais em pouco tempo: tente de novo em dez minutos ou escreva diretamente para '+ADDRESS+'.';case 'config':return 'O envio não está disponível no momento. Escreva diretamente para'+end;case 'send':return 'A mensagem não foi enviada. Escreva diretamente para'+end;}return null;}
form.addEventListener('submit',async event=>{event.preventDefault();if(busy)return;const c=check();if(!c.ok){showResult('A mensagem não foi enviada: corrija o campo indicado.','error');F[c.first].focus();return;}
 busy=true;send.disabled=true;send.setAttribute('aria-busy','true');showResult('Enviando…','');fallback.hidden=true;
 const website=$('contact-website')?$('contact-website').value:'';let data=null,ok=false;
 try{const r=await fetch('/api/contact',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({...values(),website,startedAt})});try{data=await r.json();}catch{data=null;}ok=r.ok&&data&&data.ok===true;}catch{data=null;}
 busy=false;send.disabled=false;send.removeAttribute('aria-busy');
 if(ok){clearTimeout(saveTimer);output.value=compose(values());clearDraft();for(const k of ['page','details','source','email'])if(F[k])F[k].value='';refresh();showResult('Mensagem enviada. Sua referência: '+data.ref+'. Guarde essa referência se você nos escrever de novo sobre este assunto.','ok');$('contact-copy').disabled=false;$('contact-download').disabled=false;status.textContent='O texto enviado continua aqui; o formulário foi esvaziado e o rascunho apagado deste navegador.';return;}
 if(data&&data.message&&!/^fr\b/i.test(document.documentElement.lang||'fr'))data.message=localMessage(data)||data.message;
 if(data&&data.field&&F[data.field]){setError(data.field,data.message);showResult('A mensagem não foi enviada: '+data.message,'error');F[data.field].focus();return;}
 showResult((data&&data.message)||('Não foi possível enviar a mensagem (conexão ou serviço indisponível). Escreva diretamente para '+ADDRESS+': seu texto está pronto logo abaixo.'),'error');
 if(!data||data.fallback!==false)showFallback();});
})();
