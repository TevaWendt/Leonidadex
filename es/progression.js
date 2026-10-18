/* Généré depuis outils/sources/progression.js : modifie la source, pas ce fichier. */
var lkPluriel=function(n){return ((typeof document!=='undefined'&&document.documentElement&&document.documentElement.lang)||'fr').slice(0,2)==='fr'?n>1:n!==1;};
(function(){
  'use strict';
  var lkPl = function (n) { return /^fr/.test(document.documentElement.lang || "fr") ? n > 1 : n !== 1; };
  const M=window.LK_MODELE, K=window.LKCarnets, ids=Object.assign({},window.LK_PROGRESS_IDS||{}), nf=new Intl.NumberFormat('es-ES');
  if(!M||!K) return;
  ids.acquisitions=((window.LK_ACQUISITIONS&&window.LK_ACQUISITIONS.items)||[]).filter(x=>x&&x.trackable===true&&!(x.ref&&x.ref.type&&x.ref.id)).map(x=>x.id);
  ids.collectibles=((window.LK_COLLECTIBLES&&window.LK_COLLECTIBLES.items)||[]).filter(x=>x&&x.trackable===true&&x.published!==false&&['confirmed','established'].includes(x.status)).map(x=>x.id);
  let storage=null;try{storage=window.localStorage;}catch(e){storage=null;}
  const store=storage?K.create({storage,modele:M,ids}):null;
  const set=(root,sel,v)=>{const n=root.querySelector(sel);if(n)n.textContent=v;};
  function trophees(){
    const box=document.querySelector('[data-tr-prog]');if(!box||!storage)return;
    let list=[];try{const v=JSON.parse(storage.getItem('lk-trophees-obtenus-v1')||'[]');list=Array.isArray(v)?v.filter(x=>typeof x==='string'):[];}catch(e){list=[];}
    set(box,'[data-tr-n]',nf.format(list.length));
    if(list.length){const n=list.length;set(box,'[data-tr-note]',n+(lkPluriel(n)?' trofeos marcados':' trofeo marcado')+' en la página Trofeos; el total espera la lista oficial.');}
  }
  trophees();
  function notebooks(){try{const d=JSON.parse(storage.getItem('lk-calculator-notebooks-v3')||'null');return d&&d.version===3&&Array.isArray(d.entries)?d.entries.filter(e=>e&&typeof e.tool==='string'):[];}catch(e){return [];}}
  function render(){
    M.carnets.forEach(k=>{
      const card=document.getElementById('carnet-'+k.id);if(!card)return;
      if(k.nature==='document'){
        const all=storage?notebooks():[],plans=all.filter(e=>e.tool==='plan').length,calcs=all.length-plans;
        set(card,'#progress-calc-n',calcs?nf.format(calcs)+(lkPluriel(calcs)?' cálculos':' cálculo'):'Ningún cálculo');
        set(card,'[data-cn-plans-n]',plans?nf.format(plans)+(lkPluriel(plans)?' planes':' plan'):'Ningún plan');
        return;
      }
      let done=0,total=0,wishes=0,toFill=0,orphans=0;
      k.familles.forEach(f=>{
        const known=new Set(ids[f]||[]),own=store?store.owned(f):[],d=own.filter(id=>known.has(id)).length;
        done+=d;total+=known.size;orphans+=own.length-d;
        if(store){wishes+=store.wishes(f).filter(w=>known.has(w.id)).length;if(K.STOCKABLE[f])toFill+=own.filter(id=>known.has(id)&&store.stock(f,id).state==='a-renseigner').length;}
        const line=card.querySelector('[data-family="'+f+'"] .suivi-n');
        if(line)line.textContent=f==='collectibles'&&!known.size?'Por documentar':nf.format(d)+' de '+nf.format(known.size);
      });
      if(k.id==='garde-robe'&&store)wishes+=store.wishes('styles').length;
      set(card,'[data-cn-done]',nf.format(done));set(card,'[data-cn-total]',nf.format(total));
      const nline=card.querySelector('.cn-dcard-n'),bbar=card.querySelector('.cn-dcard-bar');if(nline&&!total){nline.textContent='Por documentar';if(bbar)bbar.hidden=true;}
      const bar=card.querySelector('[data-cn-bar]');if(bar)bar.style.width=(total?done/total*100:0)+'%';
      const extra=[];
      if(wishes)extra.push(nf.format(wishes)+(k.id==='lieux'?' por visitar':k.id==='consommables'?' por probar':(lkPluriel(wishes)?' deseos':' deseo')));
      if(toFill)extra.push(nf.format(toFill)+(lkPluriel(toFill)?' existencias por completar':' existencia por completar'));
      if(orphans)extra.push(nf.format(orphans)+(lkPluriel(orphans)?' entradas aparte':' entrada aparte'));
      if(!total)extra.push('La lista se llenará con el juego');
      set(card,'[data-cn-extra]',extra.join(', '));
    });
  }
  function target(){
    document.querySelectorAll('.cn-dcard.is-target').forEach(c=>c.classList.remove('is-target'));
    const h=decodeURIComponent(location.hash.slice(1));if(!h)return;
    const a=document.getElementById(h),card=a&&a.closest('.cn-dcard');if(card)card.classList.add('is-target');
  }
  render();target();
  window.addEventListener('storage',e=>{if(!e.key||/^(lk_|lk-)/.test(e.key))render();});
  window.addEventListener('pageshow',render);window.addEventListener('hashchange',target);
  if(window.LKCollectibles&&typeof window.LKCollectibles.subscribe==='function')window.LKCollectibles.subscribe(render);
})();
(function(){
  const P=window.LKProgression, msg=document.getElementById('save-msg');
  var lkPl = function (n) { return /^fr/.test(document.documentElement.lang || "fr") ? n > 1 : n !== 1; };
  if(!P) return;
  const notice=m=>{ if(msg) msg.textContent=m; };
  let storage=null;try{storage=window.localStorage;const probe='lk_probe';storage.setItem(probe,'1');storage.removeItem(probe);}catch(e){storage=null;}
  if(!storage){const memory={};storage={getItem:k=>Object.prototype.hasOwnProperty.call(memory,k)?memory[k]:null,setItem:(k,v)=>{memory[k]=String(v);},removeItem:k=>{delete memory[k];},key:i=>Object.keys(memory)[i]??null,get length(){return Object.keys(memory).length;}};notice('El almacenamiento de este navegador no está disponible: tu progreso se muestra, pero no se guardará. Permite el almacenamiento del sitio o expórtalo desde otro navegador.');}
  const store=P.create({storage,acquisitions:window.LK_ACQUISITIONS,ids:window.LK_PROGRESS_IDS,collectibles:(window.LK_COLLECTIBLES&&window.LK_COLLECTIBLES.items)||[],notice});
  try{ store.migrate(); }catch(e){}
  const nf=new Intl.NumberFormat('es-ES',{maximumFractionDigits:0});
  function esc(x){ return String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function render(){
    const s=store.summary();
    const v=document.getElementById('progress-global-value'), bar=document.getElementById('progress-global-bar'), t=document.getElementById('progress-global-text');
    if(v){ v.textContent=nf.format(Math.floor(s.percent))+' %'; bar.value=Math.max(0,Math.min(100,s.percent)); t.textContent=(lkPl(s.done)?'{n} marcados de {t} registrados.':'{n} marcado de {t} registrados.').replace('{n}',nf.format(s.done)).replace('{t}',nf.format(s.total))+' Este seguimiento es personal: no es el progreso oficial del juego.'; }
  }
  store.subscribe(render); window.addEventListener('storage',render); window.addEventListener('pageshow',render); render();
  const ex=document.getElementById('save-export'), im=document.getElementById('save-import'), pv=document.getElementById('save-preview');
  if(!ex||!im) return;
  ex.addEventListener('click',function(){
    const out=store.exportData(), n=Object.keys(out.data).length;
    const blob=new Blob([JSON.stringify(out,null,1)],{type:'application/json'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='leonidakit-suivi-'+new Date().toISOString().slice(0,10)+'.json'; document.body.appendChild(a); a.click(); a.remove();
    notice(n?n+(lkPluriel(n)?' categorías exportadas':' categoría exportada')+' (version 2).':'Nada que exportar por ahora.');
  });
  let plan=null;
  function closePreview(){ plan=null; pv.hidden=true; im.value=''; }
  im.addEventListener('change',function(){
    const f=im.files&&im.files[0]; if(!f) return;
    const r=new FileReader();
    r.onload=function(){
      try{
        plan=store.prepareImport(String(r.result||''));
        const list=document.getElementById('save-preview-list'), iss=document.getElementById('save-preview-issues');
        const names={lk_own_vehicules:'Vehículos marcados',lk_own_armes:'Armas marcadas',lk_map_found:'Lugares descubiertos',lk_own_equipements:'Equipo conseguido',lk_own_munitions:'Tipos de munición conseguidos',lk_own_consommables:'Consumibles probados',lk_own_coiffures:'Peinados probados',lk_own_tatouages:'Tatuajes hechos',lk_own_tenues:'Atuendos y accesorios llevados','lk_own_perso-vehicules':'Modificaciones de vehículo instaladas','lk_own_perso-armes':'Modificaciones de arma instaladas',lk_progression_v2:'Contenidos documentados marcados',lk_collectibles_v1:'Coleccionables encontrados, favoritos y notas','lk-calculator-notebooks-v3':'Cálculos y planes guardados','lk-calculator-v1':'Cálculo en curso','lk-calculator-favorites-v1':'Fichas favoritas',lk_stock_v1:'Stock (consumibles, munición)',lk_wish_v1:'Deseos',lk_journal_v1:'Diario de logros'};
        list.innerHTML=Object.keys(plan.rubrics).map(k=>'<li>'+esc(names[k]||k)+'</li>').join('')||'<li>Ninguna sección legible.</li>';
        iss.hidden=!plan.issues.length; iss.textContent=plan.issues.length?'A tener en cuenta: '+plan.issues.join(', '):'';
        pv.hidden=false; notice('Archivo de seguimiento leído (versión '+plan.version+(plan.exportedAt?', del '+String(plan.exportedAt).slice(0,10):'')+'). Elige: fusionar, reemplazar o cancelar.');
      }catch(e){ plan=null; pv.hidden=true; notice(e.message||'Archivo no reconocido: hace falta una exportación de Leonidakit.'); im.value=''; }
    };
    r.readAsText(f);
  });
  document.getElementById('save-cancel').addEventListener('click',()=>{ closePreview(); notice('Importación cancelada: no se ha modificado nada.'); });
  ['merge','replace'].forEach(mode=>{ document.getElementById('save-'+mode).addEventListener('click',()=>{
    if(!plan) return;
    try{ const r=store.applyImport(plan,mode); closePreview(); notice(r.written.length+(r.written.length>1?(mode==='merge'?' categorías fusionadas':' categorías reemplazadas'):(mode==='merge'?' categoría fusionada':' categoría reemplazada'))+'. Recargando…'); setTimeout(()=>location.reload(),700); }
    catch(e){ closePreview(); }
  }); });
})();
