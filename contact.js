/* Préparateur local : aucune transmission, aucun stockage automatique. */
(function(){'use strict';const $=id=>document.getElementById(id),form=$('contact-draft');if(!form)return;
const output=$('contact-preview'),status=$('contact-status');
/* v7.45 (lot 8) : préremplissage par l'adresse (« Signaler une mauvaise réponse » de Léo) : motif, page, details, source, question, reponse, écrits après # (jamais envoyés au serveur) ; l'ancienne forme après ? reste lue. Rien n'est envoyé. */
try{const h=location.hash.slice(1),p=new URLSearchParams(/(?:^|&)(?:motif|question|reponse|details|page|source)=/.test(h)?h:location.search);const pick=(k,max)=>{const v=p.get(k);return typeof v==='string'?v.replace(/[\u0000-\u001f]/g,' ').slice(0,max):'';};
 const motif=pick('motif',60),topic=$('contact-topic');if(motif){const wanted=motif==='leo'?'Réponse de Léo à corriger':motif;for(const o of topic.options)if(o.textContent===wanted)topic.value=o.textContent;}
 const page=pick('page',1000);if(page){try{const u=new URL(page,location.origin);if(u.origin===location.origin)$('contact-page').value=u.href;}catch{}}
 const source=pick('source',1000);if(source&&/^https?:\/\//.test(source))$('contact-source').value=source;
 const question=pick('question',300),reponse=pick('reponse',300),details=pick('details',3000);
 if(question||reponse)$('contact-details').value=['Question posée à Léo : '+question,'Réponse de Léo : '+reponse,'','Ce qui est faux ou ce qui manque : ','Source qui permet de vérifier : '].join('\n');else if(details)$('contact-details').value=details;
 if(motif||page||question||details){status.textContent='Champs préremplis depuis le lien. Rien n’est envoyé.';$('contact-details').focus({preventScroll:true});}}catch{}
form.addEventListener('submit',event=>{event.preventDefault();if(!form.reportValidity())return;
 output.value=['Objet : '+$('contact-topic').value,'Page : '+($('contact-page').value.trim()||'À préciser'),'','Description / correction proposée :',$('contact-details').value.trim(),'','Source : '+($('contact-source').value.trim()||'À préciser')].join('\n');
 $('contact-copy').disabled=false;$('contact-download').disabled=false;status.textContent='Texte préparé. Aucun message envoyé.';output.focus();});
$('contact-copy').addEventListener('click',async()=>{const ok=await window.LK.copy(output.value);status.textContent=ok?'Texte copié. Aucun message envoyé.':'Sélectionne le texte et copie-le manuellement.';if(!ok){output.focus();output.select();}});
$('contact-download').addEventListener('click',()=>{const blob=new Blob([output.value],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='signalement-leonidakit.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status.textContent='Texte téléchargé. Aucun message envoyé.';});
})();
