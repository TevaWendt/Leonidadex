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
const copyAddress=$('contact-copy-address');if(copyAddress&&ADDRESS)copyAddress.addEventListener('click',async()=>{const ok=await copyText(ADDRESS,copyAddress,'Adresse kopiert');const s=$('contact-status');if(s)s.textContent=ok?'Adresse kopiert: '+ADDRESS+'.':'Kopieren nicht möglich: Die Adresse lautet '+ADDRESS+'.';});
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
const compose=v=>['Betreff: '+topicLabel(v.topic),'Seite: '+(v.page||'Nicht angegeben'),'','Beschreibung / vorgeschlagene Korrektur:',v.details,'','Quelle: '+(v.source||'Nicht angegeben')].concat(v.email?['','Antwortadresse: '+v.email]:[]).join('\n');
/* lien de messagerie : objet + corps, coupé proprement si l’adresse devient trop longue pour les messageries */
function mailtoHref(v){if(!ADDRESS)return '#ecrire';const subject='[Leonidakit] '+topicLabel(v.topic);let body=compose(v),href='mailto:'+ADDRESS+'?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body);
 if(href.length>MAX_MAILTO){const note='\n\n[…] Text gekürzt: Füge den Rest über den Button „Text kopieren“ auf der Seite ein.';let lo=0,hi=body.length;while(lo<hi){const mid=Math.ceil((lo+hi)/2),h='mailto:'+ADDRESS+'?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body.slice(0,mid)+note);if(h.length<=MAX_MAILTO)lo=mid;else hi=mid-1;}href='mailto:'+ADDRESS+'?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body.slice(0,lo)+note);}
 return href;}
function refresh(){const v=values();if(count)count.textContent=new Intl.NumberFormat('de-DE').format(F.details.value.length)+' / 5.000 Zeichen';if(mailto)mailto.href=mailtoHref(v);}
/* ---------- erreurs de saisie (annoncées) ---------- */
function setError(name,text){const input=F[name],err=$('err-'+name);if(!input)return;if(text){input.setAttribute('aria-invalid','true');if(err)err.textContent=text;}else{input.removeAttribute('aria-invalid');if(err)err.textContent='';}}
function check(){const v=values(),errors={};
 if(v.details.length<10)errors.details='Beschreibe in ein paar Worten, was dir aufgefallen ist (mindestens 10 Zeichen).';else if(v.details.length>5000)errors.details='Die Nachricht ist länger als 5.000 Zeichen.';
 if(v.page&&!isURL(v.page))errors.page='Die Adresse der Seite muss mit https:// beginnen.';
 if(v.source&&!isURL(v.source))errors.source='Der Link zur Quelle muss mit https:// beginnen.';
 if(v.email&&!isEmail(v.email))errors.email='Diese E-Mail-Adresse scheint nicht gültig zu sein (sie ist optional).';
 for(const k of Object.keys(F))setError(k,errors[k]||'');const first=Object.keys(F).find(k=>errors[k]);return {ok:!first,first,errors};}
/* ---------- brouillon local ---------- */
function saveDraft(){try{const v=values();if(!v.details&&!v.page&&!v.source&&!v.email){localStorage.removeItem(DRAFT);return;}localStorage.setItem(DRAFT,JSON.stringify({v:1,at:Date.now(),...v}));}catch{}}
function clearDraft(){try{localStorage.removeItem(DRAFT);}catch{}}
function restoreDraft(){try{const raw=localStorage.getItem(DRAFT);if(!raw||raw.length>20000)return false;const d=JSON.parse(raw);if(d.v!==1)return false;for(const k of Object.keys(F)){if(!F[k]||typeof d[k]!=='string')continue;if(k==='topic'){if([...F.topic.options].some(o=>o.textContent===d.topic))F.topic.value=d.topic;}else F[k].value=d[k];}return !!(d.details||d.page);}catch{return false;}}
/* ---------- préremplissage par l’adresse ---------- */
let prefilled=false;
try{const h=location.hash.slice(1),p=new URLSearchParams(/(?:^|&)(?:motif|question|reponse|details|page|source)=/.test(h)?h:location.search);const pick=(k,max)=>{const v=p.get(k);return typeof v==='string'?v.replace(/[\u0000-\u0008\u000b-\u001f]/g,' ').slice(0,max):'';};
 const motif=pick('motif',60);if(motif){const wanted=motif==='leo'?'Antwort von Léo korrigieren':motif;for(const o of F.topic.options)if(o.textContent===wanted||o.value===wanted)F.topic.value=o.value;/* v7.60 : une page traduite garde la valeur française (celle que l’envoi attend) */}
 const page=pick('page',1000);if(page){try{const u=new URL(page,location.origin);if(u.origin===location.origin)F.page.value=u.href;}catch{}}
 const source=pick('source',1000);if(source&&/^https?:\/\//.test(source))F.source.value=source;
 const question=pick('question',300),reponse=pick('reponse',300),details=pick('details',3000);
 if(question||reponse)F.details.value=['Frage an Léo: '+question,'Antwort von Léo: '+reponse,'','Was falsch ist oder fehlt: ','Quelle zum Überprüfen: '].join('\n');else if(details)F.details.value=details;
 if(motif||page||question||details){prefilled=true;status.textContent='Felder aus dem Link vorausgefüllt. Es wird nichts gesendet, bis du auf „Nachricht senden“ klickst.';F.details.focus({preventScroll:true});}}catch{}
if(!prefilled&&restoreDraft())status.textContent='Dein Entwurf wurde in diesem Browser wiedergefunden.';
refresh();
form.addEventListener('input',()=>{refresh();clearTimeout(saveTimer);saveTimer=setTimeout(saveDraft,300);});
form.addEventListener('change',()=>{refresh();saveDraft();});window.addEventListener('pagehide',()=>{if(!busy)saveDraft();});
/* ---------- préparer le texte (canal A) ---------- */
function prepare(){const c=check();if(!c.ok){F[c.first].focus();status.textContent='Korrigiere das markierte Feld und versuch es noch einmal.';return false;}
 output.value=compose(values());$('contact-copy').disabled=false;$('contact-download').disabled=false;status.textContent='Text bereit. Keine Nachricht gesendet: Kopiere ihn, lade ihn herunter oder öffne dein E-Mail-Programm.';return true;}
$('contact-prepare').addEventListener('click',()=>{if(prepare())output.focus();});
$('contact-copy').addEventListener('click',async()=>{const ok=await copyText(output.value);status.textContent=ok?'Text kopiert. Keine Nachricht gesendet.':'Markiere den Text und kopiere ihn von Hand.';if(!ok){output.focus();output.select();}});
$('contact-download').addEventListener('click',()=>{const blob=new Blob([output.value],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='signalement-leonidakit.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status.textContent='Text heruntergeladen. Keine Nachricht gesendet.';});
const clearBtn=$('contact-clear');if(clearBtn)clearBtn.addEventListener('click',()=>{clearDraft();for(const k of ['page','details','source','email'])if(F[k])F[k].value='';F.topic.selectedIndex=0;output.value='';$('contact-copy').disabled=true;$('contact-download').disabled=true;refresh();status.textContent='Entwurf aus diesem Browser gelöscht.';});
/* ---------- envoyer (canal B) ---------- */
function showResult(text,kind){result.textContent=text;result.className='info-result'+(kind?' is-'+kind:'');}
function showFallback(){output.value=compose(values());$('contact-copy').disabled=false;$('contact-download').disabled=false;fallback.hidden=false;refresh();}
/* mêmes messages que api/contact.js (codes et champs), traduits avec la page */
function localMessage(d){const end=' '+ADDRESS+': Dein Text ist bereit zum Kopieren.';switch(d.field||d.code){case 'topic':return 'Wähle einen Grund aus der Liste.';case 'details':return F.details&&F.details.value.length>5000?'Die Nachricht ist länger als 5.000 Zeichen.':'Beschreibe in ein paar Worten, was dir aufgefallen ist (mindestens 10 Zeichen).';case 'page':return 'Die Adresse der Seite ist nicht gültig.';case 'source':return 'Der Link zur Quelle ist nicht gültig.';case 'email':return 'Deine E-Mail-Adresse scheint nicht gültig zu sein (sie ist freiwillig).';case 'format':return 'Die Nachricht konnte nicht gelesen werden.';case 'refused':return 'Die Nachricht konnte nicht gesendet werden.';case 'too-fast':return 'Zu schnell gesendet: Lies deine Nachricht noch mal und versuch es in ein paar Sekunden erneut.';case 'stale':return 'Die Seite ist schon zu lange geöffnet: Lade sie neu und versuch es dann erneut.';case 'method':return 'Hier wird nur das Absenden des Formulars akzeptiert.';case 'origin':return 'Senden von dieser Adresse abgelehnt.';case 'size':return 'Die Nachricht ist zu lang.';case 'rate':return 'Zu viele Nachrichten in kurzer Zeit: Versuch es in zehn Minuten erneut oder schreib direkt an '+ADDRESS+'.';case 'config':return 'Senden ist gerade nicht möglich. Schreib direkt an'+end;case 'send':return 'Die Nachricht wurde nicht gesendet. Schreib direkt an'+end;}return null;}
form.addEventListener('submit',async event=>{event.preventDefault();if(busy)return;const c=check();if(!c.ok){showResult('Die Nachricht wurde nicht gesendet: Korrigiere das markierte Feld.','error');F[c.first].focus();return;}
 busy=true;send.disabled=true;send.setAttribute('aria-busy','true');showResult('Wird gesendet …','');fallback.hidden=true;
 const website=$('contact-website')?$('contact-website').value:'';let data=null,ok=false;
 try{const r=await fetch('/api/contact',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({...values(),website,startedAt})});try{data=await r.json();}catch{data=null;}ok=r.ok&&data&&data.ok===true;}catch{data=null;}
 busy=false;send.disabled=false;send.removeAttribute('aria-busy');
 if(ok){clearTimeout(saveTimer);output.value=compose(values());clearDraft();for(const k of ['page','details','source','email'])if(F[k])F[k].value='';refresh();showResult('Nachricht gesendet. Deine Referenz: '+data.ref+'. Bewahre sie auf, falls du uns noch einmal dazu schreibst.','ok');$('contact-copy').disabled=false;$('contact-download').disabled=false;status.textContent='Der gesendete Text bleibt hier sichtbar; das Formular ist geleert und der Entwurf aus diesem Browser gelöscht.';return;}
 /* v7.60 (langues) : sur une page traduite, le message du serveur (écrit en français) est remplacé par le même message dans la langue de la page */
 if(data&&data.message&&!/^fr\b/i.test(document.documentElement.lang||'fr'))data.message=localMessage(data)||data.message;
 if(data&&data.field&&F[data.field]){setError(data.field,data.message);showResult('Die Nachricht wurde nicht gesendet: '+data.message,'error');F[data.field].focus();return;}
 showResult((data&&data.message)||('Die Nachricht konnte nicht gesendet werden (Verbindung oder Dienst nicht verfügbar). Schreib direkt an '+ADDRESS+' – dein Text steht unten bereit.'),'error');
 if(!data||data.fallback!==false)showFallback();});
})();
