/* Préparateur local : aucune transmission, aucun stockage automatique. */
(function(){'use strict';const $=id=>document.getElementById(id),form=$('contact-draft');if(!form)return;
const output=$('contact-preview'),status=$('contact-status');
form.addEventListener('submit',event=>{event.preventDefault();if(!form.reportValidity())return;
 output.value=['Objet : '+$('contact-topic').value,'Page : '+($('contact-page').value.trim()||'À préciser'),'','Description / correction proposée :',$('contact-details').value.trim(),'','Source : '+($('contact-source').value.trim()||'À préciser')].join('\n');
 $('contact-copy').disabled=false;$('contact-download').disabled=false;status.textContent='Texte préparé. Aucun message envoyé.';output.focus();});
$('contact-copy').addEventListener('click',async()=>{const ok=await window.LK.copy(output.value);status.textContent=ok?'Texte copié. Aucun message envoyé.':'Sélectionne le texte et copie-le manuellement.';if(!ok){output.focus();output.select();}});
$('contact-download').addEventListener('click',()=>{const blob=new Blob([output.value],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='signalement-leonidakit.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status.textContent='Texte téléchargé. Aucun message envoyé.';});
})();
