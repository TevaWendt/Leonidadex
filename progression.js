/* LEONIDAKIT — page Progression : tableau de bord des carnets (v7.51, lot 4).
   Chaque carnet (outils/modele-donnees.json) a sa page dédiée (carnets/<id>.html) ; ici, une carte par carnet compte ce
   qui est coché, famille par famille, avec les mêmes identifiants et les mêmes clés que les fiches, les carnets et le
   calculateur (progression-data.js, carnets-core.js, progression-core.js pour les contenus documentés, collectibles-core.js).
   Les envies (lk_wish_v1) et les stocks à renseigner sont signalés, jamais comptés comme possédés. Les anciennes ancres
   (#garage, #arsenal, #tenues…) mènent à la carte du carnet qui les contient. */
(function(){
  'use strict';
  const M=window.LK_MODELE, K=window.LKCarnets, ids=Object.assign({},window.LK_PROGRESS_IDS||{}), nf=new Intl.NumberFormat('fr-FR');
  if(!M||!K) return;
  /* Contenus documentés : éléments suivables sans renvoi vers un véhicule ou une arme (ceux-là comptent dans le garage ou l’arsenal). */
  ids.acquisitions=((window.LK_ACQUISITIONS&&window.LK_ACQUISITIONS.items)||[]).filter(x=>x&&x.trackable===true&&!(x.ref&&x.ref.type&&x.ref.id)).map(x=>x.id);
  ids.collectibles=((window.LK_COLLECTIBLES&&window.LK_COLLECTIBLES.items)||[]).filter(x=>x&&x.trackable===true&&x.published!==false&&['confirmed','established'].includes(x.status)).map(x=>x.id);
  let storage=null;try{storage=window.localStorage;}catch(e){storage=null;}
  const store=storage?K.create({storage,modele:M,ids}):null;
  const set=(root,sel,v)=>{const n=root.querySelector(sel);if(n)n.textContent=v;};
  function notebooks(){try{const d=JSON.parse(storage.getItem('lk-calculator-notebooks-v3')||'null');return d&&d.version===3&&Array.isArray(d.entries)?d.entries.filter(e=>e&&typeof e.tool==='string'):[];}catch(e){return [];}}
  function render(){
    M.carnets.forEach(k=>{
      const card=document.getElementById('carnet-'+k.id);if(!card)return;
      if(k.nature==='document'){
        const all=storage?notebooks():[],plans=all.filter(e=>e.tool==='plan').length,calcs=all.length-plans;
        set(card,'#progress-calc-n',calcs?nf.format(calcs)+' calcul'+(calcs>1?'s':''):'Aucun calcul');
        set(card,'[data-cn-plans-n]',plans?nf.format(plans)+' plan'+(plans>1?'s':''):'Aucun plan');
        return;
      }
      let done=0,total=0,wishes=0,toFill=0,orphans=0;
      k.familles.forEach(f=>{
        const known=new Set(ids[f]||[]),own=store?store.owned(f):[],d=own.filter(id=>known.has(id)).length;
        done+=d;total+=known.size;orphans+=own.length-d;
        if(store){wishes+=store.wishes(f).filter(w=>known.has(w.id)).length;if(K.STOCKABLE[f])toFill+=own.filter(id=>known.has(id)&&store.stock(f,id).state==='a-renseigner').length;}
        const line=card.querySelector('[data-family="'+f+'"] .suivi-n');
        if(line)line.textContent=f==='collectibles'&&!known.size?'À documenter':nf.format(d)+' / '+nf.format(known.size);
      });
      if(k.id==='garde-robe'&&store)wishes+=store.wishes('styles').length;
      set(card,'[data-cn-done]',nf.format(done));set(card,'[data-cn-total]',nf.format(total));
      const nline=card.querySelector('.cn-dcard-n'),bbar=card.querySelector('.cn-dcard-bar');if(nline&&!total){nline.textContent='À documenter';if(bbar)bbar.hidden=true;}
      const bar=card.querySelector('[data-cn-bar]');if(bar)bar.style.width=(total?done/total*100:0)+'%';
      const extra=[];
      if(wishes)extra.push(nf.format(wishes)+(k.id==='lieux'?' à visiter':k.id==='consommables'?' à essayer':' envie'+(wishes>1?'s':'')));
      if(toFill)extra.push(nf.format(toFill)+' stock'+(toFill>1?'s':'')+' à renseigner');
      if(orphans)extra.push(nf.format(orphans)+' saisie'+(orphans>1?'s':'')+' à part');
      if(!total)extra.push('La liste se remplira avec le jeu');
      set(card,'[data-cn-extra]',extra.join(' · '));
    });
  }
  /* Ancre d’une ancienne carte (#garage, #tenues…) : la carte du carnet est mise en évidence. */
  function target(){
    document.querySelectorAll('.cn-dcard.is-target').forEach(c=>c.classList.remove('is-target'));
    const h=decodeURIComponent(location.hash.slice(1));if(!h)return;
    const a=document.getElementById(h),card=a&&a.closest('.cn-dcard');if(card)card.classList.add('is-target');
  }
  render();target();
  window.addEventListener('storage',e=>{if(!e.key||/^(lk_|lk-)/.test(e.key))render();});
  window.addEventListener('pageshow',render);window.addEventListener('hashchange',target);
  /* Le carnet des collectibles prévient lui-même quand il change (même page). */
  if(window.LKCollectibles&&typeof window.LKCollectibles.subscribe==='function')window.LKCollectibles.subscribe(render);
})();

/* Progression v2 : contenus documentés, total et export / import versionné (progression-core.js). */
(function(){
  const P=window.LKProgression, msg=document.getElementById('save-msg');
  if(!P) return;
  const notice=m=>{ if(msg) msg.textContent=m; };
  const store=P.create({storage:localStorage,acquisitions:window.LK_ACQUISITIONS,ids:window.LK_PROGRESS_IDS,collectibles:(window.LK_COLLECTIBLES&&window.LK_COLLECTIBLES.items)||[],notice});
  try{ store.migrate(); }catch(e){}
  const nf=new Intl.NumberFormat('fr-FR',{maximumFractionDigits:0});
  function esc(x){ return String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function render(){
    const s=store.summary();
    const v=document.getElementById('progress-global-value'), bar=document.getElementById('progress-global-bar'), t=document.getElementById('progress-global-text');
    if(v){ v.textContent=nf.format(Math.floor(s.percent))+' %'; bar.value=Math.max(0,Math.min(100,s.percent)); t.textContent=nf.format(s.done)+' coché'+(s.done>1?'s':'')+' sur '+nf.format(s.total)+' recensés. Ce suivi est personnel : ce n’est pas la progression officielle du jeu.'; }
  }
  store.subscribe(render); window.addEventListener('storage',render); window.addEventListener('pageshow',render); render();

  const ex=document.getElementById('save-export'), im=document.getElementById('save-import'), pv=document.getElementById('save-preview');
  if(!ex||!im) return;
  ex.addEventListener('click',function(){
    const out=store.exportData(), n=Object.keys(out.data).length;
    const blob=new Blob([JSON.stringify(out,null,1)],{type:'application/json'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='leonidakit-suivi-'+new Date().toISOString().slice(0,10)+'.json'; document.body.appendChild(a); a.click(); a.remove();
    notice(n?n+' rubrique'+(n>1?'s':'')+' exportée'+(n>1?'s':'')+' (version 2).':'Rien à exporter pour le moment.');
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
        const names={lk_own_vehicules:'Véhicules cochés',lk_own_armes:'Armes cochées',lk_map_found:'Lieux repérés',lk_own_equipements:'Équipements obtenus',lk_own_munitions:'Types de munitions obtenus',lk_own_consommables:'Consommables goûtés',lk_own_coiffures:'Coiffures essayées',lk_own_tatouages:'Tatouages faits',lk_own_tenues:'Tenues et accessoires portés','lk_own_perso-vehicules':'Modifs de véhicule posées','lk_own_perso-armes':'Modifs d’arme posées',lk_progression_v2:'Contenus documentés cochés',lk_collectibles_v1:'Collectibles trouvés, favoris et notes','lk-calculator-notebooks-v3':'Calculs et plans enregistrés','lk-calculator-v1':'Calcul en cours','lk-calculator-favorites-v1':'Fiches favorites',lk_stock_v1:'Stocks (consommables, munitions)',lk_wish_v1:'Envies',lk_journal_v1:'Journal des réalisations'};
        list.innerHTML=Object.keys(plan.rubrics).map(k=>'<li>'+esc(names[k]||k)+'</li>').join('')||'<li>Aucune rubrique lisible.</li>';
        iss.hidden=!plan.issues.length; iss.textContent=plan.issues.length?'À savoir : '+plan.issues.join(' · '):'';
        pv.hidden=false; notice('Fichier de suivi lu (version '+plan.version+(plan.exportedAt?', du '+String(plan.exportedAt).slice(0,10):'')+'). Choisis : fusionner, remplacer ou annuler.');
      }catch(e){ plan=null; pv.hidden=true; notice(e.message||'Fichier non reconnu : il faut un export Leonidakit.'); im.value=''; }
    };
    r.readAsText(f);
  });
  document.getElementById('save-cancel').addEventListener('click',()=>{ closePreview(); notice('Import annulé : rien n’a été modifié.'); });
  ['merge','replace'].forEach(mode=>{ document.getElementById('save-'+mode).addEventListener('click',()=>{
    if(!plan) return;
    try{ const r=store.applyImport(plan,mode); closePreview(); notice(r.written.length+' rubrique'+(r.written.length>1?'s':'')+(mode==='merge'?' fusionnée':' remplacée')+(r.written.length>1?'s':'')+'. Rechargement…'); setTimeout(()=>location.reload(),700); }
    catch(e){ closePreview(); }
  }); });
})();

