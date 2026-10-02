/* Contact (v7.46, lot 9). Adresse publique assemblée ici (jamais en clair dans le HTML), bouton « Copier l’adresse »,
   formulaire : canal B = envoi par /api/contact (Brevo, rien de conservé par le site), canal A de secours = messagerie
   (mailto prérempli, longueur limitée) et texte à copier ou télécharger. Brouillon local (clé lk_contact_draft_v1),
   effacé après l’envoi. Préremplissage par l’adresse (lien « Signaler une mauvaise réponse » de Léo : données après #,
   jamais envoyées au serveur ; l’ancienne forme après ? reste lue). Aussi chargé par les Mentions (adresse seulement). */
(function(){'use strict';const $=id=>document.getElementById(id);
/* ---------- adresse publique ---------- */
const links=[...document.querySelectorAll('a.lk-mail[data-u][data-d]')];let ADDRESS='';
for(const a of links){const addr=a.dataset.u+'@'+a.dataset.d;if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addr))continue;ADDRESS=addr;/* coupure possible après « @ » seulement */a.replaceChildren(a.dataset.u+'@',document.createElement('wbr'),a.dataset.d);a.href='mailto:'+addr;}
const copyText=async(text,button,ok)=>{try{if(window.LK&&window.LK.copy)return await window.LK.copy(text,button,ok);await navigator.clipboard.writeText(text);return true;}catch{return false;}};
const copyAddress=$('contact-copy-address');if(copyAddress&&ADDRESS)copyAddress.addEventListener('click',async()=>{const ok=await copyText(ADDRESS,copyAddress,'Address copied');const s=$('contact-status');if(s)s.textContent=ok?'Address copied: '+ADDRESS+'.':'Can’t copy. The address is '+ADDRESS+'.';});
/* ---------- formulaire ---------- */
const form=$('contact-draft');if(!form)return;
const F={topic:$('contact-topic'),page:$('contact-page'),details:$('contact-details'),source:$('contact-source'),email:$('contact-email')};
const output=$('contact-preview'),status=$('contact-status'),result=$('contact-result'),fallback=$('contact-fallback'),mailto=$('contact-mailto'),send=$('contact-send'),count=$('contact-count');
const DRAFT='lk_contact_draft_v1',startedAt=Date.now(),MAX_MAILTO=1800;let busy=false,saveTimer=0;
const isURL=v=>{try{const u=new URL(v);return u.protocol==='https:'||u.protocol==='http:';}catch{return false;}};
const isEmail=v=>/^[^\s<>@,;"]+@[^\s<>@,;"]+\.[^\s<>@,;"]{2,}$/.test(v)&&v.length<=254;
const values=()=>({topic:F.topic.value,page:F.page.value.trim(),details:F.details.value.trim(),source:F.source.value.trim(),email:F.email?F.email.value.trim():''});
/* v7.60 : le motif s’affiche avec le libellé de la page (sa valeur reste celle que le serveur attend) */
const topicLabel=t=>{for(const o of F.topic.options)if(o.value===t)return o.textContent;return t;};
const compose=v=>['Subject: '+topicLabel(v.topic),'Page: '+(v.page||'Not specified'),'','Description / suggested correction:',v.details,'','Source: '+(v.source||'Not specified')].concat(v.email?['','Reply-to address: '+v.email]:[]).join('\n');
/* lien de messagerie : objet + corps, coupé proprement si l’adresse devient trop longue pour les messageries */
function mailtoHref(v){if(!ADDRESS)return '#ecrire';const subject='[Leonidakit] '+topicLabel(v.topic);let body=compose(v),href='mailto:'+ADDRESS+'?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body);
 if(href.length>MAX_MAILTO){const note='\n\n[…] Text cut off: paste the rest using the “Copy text” button on the page.';let lo=0,hi=body.length;while(lo<hi){const mid=Math.ceil((lo+hi)/2),h='mailto:'+ADDRESS+'?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body.slice(0,mid)+note);if(h.length<=MAX_MAILTO)lo=mid;else hi=mid-1;}href='mailto:'+ADDRESS+'?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body.slice(0,lo)+note);}
 return href;}
function refresh(){const v=values();if(count)count.textContent=new Intl.NumberFormat('en-US').format(F.details.value.length)+' / 5,000 characters';if(mailto)mailto.href=mailtoHref(v);}
/* ---------- erreurs de saisie (annoncées) ---------- */
function setError(name,text){const input=F[name],err=$('err-'+name);if(!input)return;if(text){input.setAttribute('aria-invalid','true');if(err)err.textContent=text;}else{input.removeAttribute('aria-invalid');if(err)err.textContent='';}}
function check(){const v=values(),errors={};
 if(v.details.length<10)errors.details='Describe what you noticed in a few words (at least 10 characters).';else if(v.details.length>5000)errors.details='Your message is over 5,000 characters.';
 if(v.page&&!isURL(v.page))errors.page='The page address must start with https://.';
 if(v.source&&!isURL(v.source))errors.source='The source link must start with https://.';
 if(v.email&&!isEmail(v.email))errors.email='This email address doesn’t look valid (it’s optional).';
 for(const k of Object.keys(F))setError(k,errors[k]||'');const first=Object.keys(F).find(k=>errors[k]);return {ok:!first,first,errors};}
/* ---------- brouillon local ---------- */
function saveDraft(){try{const v=values();if(!v.details&&!v.page&&!v.source&&!v.email){localStorage.removeItem(DRAFT);return;}localStorage.setItem(DRAFT,JSON.stringify({v:1,at:Date.now(),...v}));}catch{}}
function clearDraft(){try{localStorage.removeItem(DRAFT);}catch{}}
function restoreDraft(){try{const raw=localStorage.getItem(DRAFT);if(!raw||raw.length>20000)return false;const d=JSON.parse(raw);if(d.v!==1)return false;for(const k of Object.keys(F)){if(!F[k]||typeof d[k]!=='string')continue;if(k==='topic'){if([...F.topic.options].some(o=>o.textContent===d.topic))F.topic.value=d.topic;}else F[k].value=d[k];}return !!(d.details||d.page);}catch{return false;}}
/* ---------- préremplissage par l’adresse ---------- */
let prefilled=false;
try{const h=location.hash.slice(1),p=new URLSearchParams(/(?:^|&)(?:motif|question|reponse|details|page|source)=/.test(h)?h:location.search);const pick=(k,max)=>{const v=p.get(k);return typeof v==='string'?v.replace(/[\u0000-\u0008\u000b-\u001f]/g,' ').slice(0,max):'';};
 const motif=pick('motif',60);if(motif){const wanted=motif==='leo'?'Correction to a Léo answer':motif;for(const o of F.topic.options)if(o.textContent===wanted||o.value===wanted)F.topic.value=o.value;/* v7.60 : une page traduite garde la valeur française (celle que l’envoi attend) */}
 const page=pick('page',1000);if(page){try{const u=new URL(page,location.origin);if(u.origin===location.origin)F.page.value=u.href;}catch{}}
 const source=pick('source',1000);if(source&&/^https?:\/\//.test(source))F.source.value=source;
 const question=pick('question',300),reponse=pick('reponse',300),details=pick('details',3000);
 if(question||reponse)F.details.value=['My question to Léo: '+question,'Léo’s answer: '+reponse,'','What’s wrong or missing: ','A source to check it: '].join('\n');else if(details)F.details.value=details;
 if(motif||page||question||details){prefilled=true;status.textContent='Fields filled in from the link. Nothing is sent until you click “Send message”.';F.details.focus({preventScroll:true});}}catch{}
if(!prefilled&&restoreDraft())status.textContent='We found your draft in this browser.';
refresh();
form.addEventListener('input',()=>{refresh();clearTimeout(saveTimer);saveTimer=setTimeout(saveDraft,300);});
form.addEventListener('change',()=>{refresh();saveDraft();});window.addEventListener('pagehide',()=>{if(!busy)saveDraft();});
/* ---------- préparer le texte (canal A) ---------- */
function prepare(){const c=check();if(!c.ok){F[c.first].focus();status.textContent='Fix the flagged field, then try again.';return false;}
 output.value=compose(values());$('contact-copy').disabled=false;$('contact-download').disabled=false;status.textContent='Text ready. No message sent: copy it, download it or open your email app.';return true;}
$('contact-prepare').addEventListener('click',()=>{if(prepare())output.focus();});
$('contact-copy').addEventListener('click',async()=>{const ok=await copyText(output.value);status.textContent=ok?'Text copied. No message sent.':'Select the text and copy it manually.';if(!ok){output.focus();output.select();}});
$('contact-download').addEventListener('click',()=>{const blob=new Blob([output.value],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='signalement-leonidakit.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status.textContent='Text downloaded. No message sent.';});
const clearBtn=$('contact-clear');if(clearBtn)clearBtn.addEventListener('click',()=>{clearDraft();for(const k of ['page','details','source','email'])if(F[k])F[k].value='';F.topic.selectedIndex=0;output.value='';$('contact-copy').disabled=true;$('contact-download').disabled=true;refresh();status.textContent='Draft cleared from this browser.';});
/* ---------- envoyer (canal B) ---------- */
function showResult(text,kind){result.textContent=text;result.className='info-result'+(kind?' is-'+kind:'');}
function showFallback(){output.value=compose(values());$('contact-copy').disabled=false;$('contact-download').disabled=false;fallback.hidden=false;refresh();}
/* mêmes messages que api/contact.js (codes et champs), traduits avec la page */
function localMessage(d){const end=' '+ADDRESS+': your text is ready to copy.';switch(d.field||d.code){case 'topic':return 'Choose a reason from the list.';case 'details':return F.details&&F.details.value.length>5000?'Your message is over 5,000 characters.':'Describe what you noticed in a few words (at least 10 characters).';case 'page':return 'The page address isn’t valid.';case 'source':return 'The source link isn’t valid.';case 'email':return 'Your email address doesn’t look valid (it’s optional).';case 'format':return 'The message couldn’t be read.';case 'refused':return 'The message couldn’t be sent.';case 'too-fast':return 'Sent too fast: read your message again, then try again in a few seconds.';case 'stale':return 'This page has been open too long: reload it, then try again.';case 'method':return 'Only form submissions are accepted here.';case 'origin':return 'Sending refused from this address.';case 'size':return 'The message is too long.';case 'rate':return 'Too many messages in a short time: try again in ten minutes, or write directly to '+ADDRESS+'.';case 'config':return 'Sending isn’t available right now. Write directly to'+end;case 'send':return 'The message didn’t go through. Write directly to'+end;}return null;}
form.addEventListener('submit',async event=>{event.preventDefault();if(busy)return;const c=check();if(!c.ok){showResult('Your message wasn’t sent: fix the flagged field.','error');F[c.first].focus();return;}
 busy=true;send.disabled=true;send.setAttribute('aria-busy','true');showResult('Sending…','');fallback.hidden=true;
 const website=$('contact-website')?$('contact-website').value:'';let data=null,ok=false;
 try{const r=await fetch('/api/contact',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({...values(),website,startedAt})});try{data=await r.json();}catch{data=null;}ok=r.ok&&data&&data.ok===true;}catch{data=null;}
 busy=false;send.disabled=false;send.removeAttribute('aria-busy');
 if(ok){clearTimeout(saveTimer);output.value=compose(values());clearDraft();for(const k of ['page','details','source','email'])if(F[k])F[k].value='';refresh();showResult('Message sent. Your reference: '+data.ref+'. Keep it if you write to us again about this.','ok');$('contact-copy').disabled=false;$('contact-download').disabled=false;status.textContent='The text you sent stays here; the form is cleared and the draft erased from this browser.';return;}
 /* v7.60 (langues) : sur une page traduite, le message du serveur (écrit en français) est remplacé par le même message dans la langue de la page */
 if(data&&data.message&&!/^fr\b/i.test(document.documentElement.lang||'fr'))data.message=localMessage(data)||data.message;
 if(data&&data.field&&F[data.field]){setError(data.field,data.message);showResult('Your message wasn’t sent: '+data.message,'error');F[data.field].focus();return;}
 showResult((data&&data.message)||('Your message couldn’t be sent (connection or service unavailable). Write directly to '+ADDRESS+' — your text is ready below.'),'error');
 if(!data||data.fallback!==false)showFallback();});
})();
