(function(){
  'use strict';
  const ids=window.LK_PROGRESS_IDS;
  function render(){
    for(const [type,key] of [['vehicules','lk_own_vehicules'],['armes','lk_own_armes'],['lieux','lk_map_found']]){
      const saved=window.LK.read(key,{},window.LK.own),total=ids[type].length,done=ids[type].filter(id=>Object.hasOwn(saved,id)&&saved[id]).length;
      const row=document.getElementById('progress-'+type);row.querySelector('strong').textContent=done+' / '+total;const bar=row.querySelector('progress');bar.max=total;bar.value=done;
    }
  }
  render();window.addEventListener('storage',render);window.addEventListener('pageshow',render);
})();

/* Export / import de tout le suivi local (clés lk_*) */
(function(){
  const ex=document.getElementById('save-export'), im=document.getElementById('save-import'), msg=document.getElementById('save-msg');
  if(!ex||!im) return;
  ex.addEventListener('click',function(){
    const data={};
    for(let i=0;i<localStorage.length;i++){ const k=localStorage.key(i); if(k&&k.indexOf('lk_')===0) data[k]=localStorage.getItem(k); }
    const n=Object.keys(data).length;
    const blob=new Blob([JSON.stringify({site:'leonidakit',version:1,date:new Date().toISOString(),data:data},null,1)],{type:'application/json'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='leonidakit-suivi-'+new Date().toISOString().slice(0,10)+'.json'; document.body.appendChild(a); a.click(); a.remove();
    msg.textContent=n?n+' élément'+(n>1?'s':'')+' exporté'+(n>1?'s':'')+'.':'Rien à exporter pour le moment.';
  });
  im.addEventListener('change',function(){
    const f=im.files&&im.files[0]; if(!f) return;
    const r=new FileReader();
    r.onload=function(){
      try{
        const j=JSON.parse(String(r.result||''));
        if(!j||j.site!=='leonidakit'||typeof j.data!=='object') throw new Error('format');
        const entries=Object.entries(j.data).filter(([k,v])=>k.indexOf('lk_')===0&&typeof v==='string');
        if(!entries.length) throw new Error('vide');
        const avant={}; entries.forEach(([k])=>{avant[k]=localStorage.getItem(k);});
        try{ entries.forEach(([k,v])=>localStorage.setItem(k,v)); }
        catch(e){ Object.entries(avant).forEach(([k,v])=>{ if(v===null) localStorage.removeItem(k); else localStorage.setItem(k,v); }); throw new Error('espace'); }
        msg.textContent=entries.length+' élément'+(entries.length>1?'s':'')+' importé'+(entries.length>1?'s':'')+'. Rechargement…';
        setTimeout(function(){ location.reload(); },600);
      }catch(e){ msg.textContent=e.message==='espace'?"Espace insuffisant dans ce navigateur : rien n'a été modifié.":'Fichier non reconnu : il faut un export Leonidakit.'; }
      im.value='';
    };
    r.readAsText(f);
  });
})();
