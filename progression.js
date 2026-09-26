(function(){
  'use strict';
  const ids=window.LK_PROGRESS_IDS, names=window.LK_PROGRESS_NAMES||{}, S=window.LKSuivi, esc=window.LK.esc;
  const FAM=['vehicules','armes','equipements','munitions','lieux'];
  const KEYS={vehicules:'lk_own_vehicules',armes:'lk_own_armes',equipements:'lk_own_equipements',munitions:'lk_own_munitions',lieux:'lk_map_found'};
  const nf=new Intl.NumberFormat('fr-FR');
  const saved=f=>window.LK.read(KEYS[f],{},window.LK.own);
  function render(){
    for(const type of FAM){
      const row=document.querySelector('.suivi-card[data-family="'+type+'"]'); if(!row) continue;
      const o=saved(type),list=ids[type]||[],total=list.length,done=list.filter(id=>o[id]).length;
      row.querySelector('.suivi-n').textContent=nf.format(done)+' / '+nf.format(total);
      const bar=row.querySelector('progress');bar.max=total||1;bar.value=done;
      const btn=row.querySelector('.suivi-toggle'); if(btn){btn.textContent=(btn.getAttribute('aria-expanded')==='true'?'Masquer':'Voir la liste')+(done?' ('+nf.format(done)+')':'');btn.disabled=!done&&btn.getAttribute('aria-expanded')!=='true';}
      if(row.querySelector('.suivi-list:not([hidden])')) renderList(type);
    }
  }
  /* v7.38 : la carte se déplie et liste ce qui est coché (nom, catégorie, lien vers la fiche, bouton Retirer). */
  function renderList(type){
    const box=document.getElementById('suivi-list-'+type); if(!box) return;
    const o=saved(type),list=(ids[type]||[]).filter(id=>o[id]),map=names[type]||{};
    if(!list.length){box.innerHTML='<p class="suivi-empty">Rien de coché pour l’instant. Coche depuis la page <a href="'+esc(S?S.FAMILIES[type].page:'#')+'">'+esc(S?S.FAMILIES[type].label.replace(/^M(on|es) /,''):type)+'</a>.</p>';return;}
    const groups=new Map();
    list.forEach(id=>{const it=map[id]||{n:id,c:''};const k=it.c||'';if(!groups.has(k))groups.set(k,[]);groups.get(k).push({id,...it});});
    const cats=[...groups.keys()].sort((a,b)=>a.localeCompare(b,'fr'));
    box.innerHTML=cats.map(c=>'<div class="suivi-group">'+(c?'<p class="suivi-cat">'+esc(c)+' <span>'+groups.get(c).length+'</span></p>':'')+'<ul class="suivi-ul">'+groups.get(c).sort((a,b)=>a.n.localeCompare(b.n,'fr')).map(it=>'<li>'+(it.u?'<a href="'+esc(it.u)+'">'+esc(it.n)+'</a>':'<span>'+esc(it.n)+'</span>')+'<button type="button" class="suivi-remove" data-suivi-remove="'+esc(it.id)+'" data-suivi-family="'+esc(type)+'" aria-label="Retirer '+esc(it.n)+'">Retirer</button></li>').join('')+'</ul></div>').join('');
  }
  function renderCollectibles(){
    const core=window.LKCollectibles, row=document.getElementById('progress-collectibles');
    if(!core||!row)return;
    const all=(window.LK_COLLECTIBLES?.items||[]), items=all.filter(item=>core.isTrackable(item));
    const state=core.getState(),found=items.filter(item=>state.found[item.id]);
    row.querySelector('.suivi-n').textContent=items.length?found.length+' / '+items.length:'À documenter';
    const bar=row.querySelector('progress');bar.hidden=!items.length;bar.max=items.length||1;bar.value=found.length;
    const sp=row.querySelector('.suivi-spacer'); if(sp) sp.hidden=!!items.length;
    const btn=row.querySelector('.suivi-toggle'); if(btn){btn.textContent=(btn.getAttribute('aria-expanded')==='true'?'Masquer':'Voir la liste')+(found.length?' ('+found.length+')':'');btn.disabled=!found.length&&btn.getAttribute('aria-expanded')!=='true';}
    const box=document.getElementById('suivi-list-collectibles');
    if(box&&!box.hidden){
      if(!found.length){box.innerHTML='<p class="suivi-empty">'+(items.length?'Rien de coché pour l’instant. Coche depuis ton <a href="collectibles.html#carnet">carnet de collection</a>.':'Aucun collectible n’est encore publié : la liste se remplira avec le jeu.')+'</p>';}
      else{
        const cat=id=>{const c=(window.LK_COLLECTIBLES?.categories||[]).find(x=>x.id===id);return c?c.label||c.name||id:(id||'');};
        box.innerHTML='<ul class="suivi-ul">'+found.map(it=>{const u=core.itemUrl(it)||core.mapUrl(it);return '<li>'+(u?'<a href="'+esc(u)+'">'+esc(it.name||it.id)+'</a>':'<span>'+esc(it.name||it.id)+'</span>')+(it.category?'<span class="suivi-cat-inline">'+esc(cat(it.category))+'</span>':'')+'<button type="button" class="suivi-remove" data-suivi-collectible="'+esc(it.id)+'" aria-label="Retirer '+esc(it.name||it.id)+'">Retirer</button></li>';}).join('')+'</ul>';
      }
    }
    const cat=document.getElementById('progress-catalogue-n');
    if(cat){const pub=all.filter(i=>i.published!==false).length;cat.textContent=pub?pub+' fiche'+(pub>1?'s':''):'Aucune fiche';}
  }
  document.addEventListener('click',ev=>{
    const t=ev.target.closest('.suivi-toggle, [data-suivi-remove], [data-suivi-collectible]'); if(!t) return;
    if(t.classList.contains('suivi-toggle')){
      const box=document.getElementById(t.getAttribute('aria-controls')); if(!box) return;
      const open=box.hidden; box.hidden=!open; t.setAttribute('aria-expanded',String(open));
      const fam=t.closest('[data-family]')?.dataset.family;
      if(open){ if(fam==='collectibles') renderCollectibles(); else renderList(fam); }
      render(); renderCollectibles(); return;
    }
    if(t.dataset.suiviRemove){ if(S) S.set(t.dataset.suiviFamily,t.dataset.suiviRemove,false); render(); renderList(t.dataset.suiviFamily); return; }
    if(t.dataset.suiviCollectible){ window.LKCollectibles?.setFound(t.dataset.suiviCollectible,false); renderCollectibles(); }
  });
  /* Ancres : progression.html#garage, #arsenal, #equipements, #munitions, #collectibles ouvrent la liste visée. */
  function openFromHash(){
    const h=location.hash.slice(1); const map={garage:'vehicules',arsenal:'armes',equipements:'equipements',munitions:'munitions',collectibles:'collectibles'};
    const fam=map[h]; if(!fam) return; const row=document.querySelector('.suivi-card[data-family="'+fam+'"]'); const btn=row?.querySelector('.suivi-toggle'); const box=row?.querySelector('.suivi-list');
    if(box&&box.hidden){box.hidden=false;btn?.setAttribute('aria-expanded','true');}
    if(fam==='collectibles') renderCollectibles(); else renderList(fam); render();
    row?.scrollIntoView({block:'start'});
  }
  renderCollectibles();window.LKCollectibles?.subscribe(renderCollectibles);
  window.addEventListener('pageshow',renderCollectibles);
  render();window.addEventListener('storage',render);window.addEventListener('pageshow',render);
  if(S) S.subscribe(()=>{render();});
  openFromHash();window.addEventListener('hashchange',openFromHash);
})();

/* Progression v2 : contenus documentés, total et export / import versionné (progression-core.js). */
(function(){
  const P=window.LKProgression, msg=document.getElementById('save-msg');
  if(!P) return;
  const notice=m=>{ if(msg) msg.textContent=m; };
  const store=P.create({storage:localStorage,acquisitions:window.LK_ACQUISITIONS,ids:window.LK_PROGRESS_IDS,collectibles:(window.LK_COLLECTIBLES&&window.LK_COLLECTIBLES.items)||[],notice});
  try{ store.migrate(); }catch(e){}
  const nf=new Intl.NumberFormat('fr-FR',{maximumFractionDigits:0});
  const routes={}; (window.LK_ACQUISITIONS?.categories||[]).forEach(c=>{ routes[c.id]=c.route.replace(/^\//,''); });
  function esc(x){ return String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function render(){
    const s=store.summary(), box=document.getElementById('acq-cards');
    if(box){
      const cats=(window.LK_ACQUISITIONS?.categories||[]);
      const docs=cats.filter(c=>!c.pending), pend=cats.filter(c=>c.pending);
      const card=c=>{
        const g=s.groups.find(x=>x.id===c.id)||{total:0,done:0}, items=store.items.filter(x=>x.category===c.id&&x.trackable);
        const checks=items.map(x=>'<label class="acq-check"><input type="checkbox" data-acq="'+esc(x.id)+'" '+(store.checked(x)?'checked':'')+'> '+esc(x.name)+'</label>').join('');
        return '<article class="note-box acq-box'+(g.total?'':' is-pending')+'" id="progress-'+esc(c.id)+'"><h3>'+esc(c.label)+'</h3><strong>'+(g.total?g.done+' / '+g.total:'En attente du jeu')+'</strong>'+(g.total?'<progress value="'+g.done+'" max="'+g.total+'" aria-label="'+esc(c.label)+'"></progress>':'<p class="acq-pending">Rien de publié par Rockstar pour l’instant : ne compte pas dans le total.</p>')+checks+'<a href="'+esc(routes[c.id]||'achats.html')+'">Ouvrir la section</a></article>';
      };
      box.innerHTML='<div class="progress-cards progress-cards--four">'+docs.map(card).join('')+'</div>'+(pend.length?'<h3 class="acq-sub">Sections à venir : en attente du jeu</h3><div class="progress-cards">'+pend.map(card).join('')+'</div>':'');
    }
    const v=document.getElementById('progress-global-value'), bar=document.getElementById('progress-global-bar'), t=document.getElementById('progress-global-text');
    if(v){ v.textContent=nf.format(Math.floor(s.percent))+' %'; bar.value=Math.max(0,Math.min(100,s.percent)); t.textContent=nf.format(s.done)+' coché'+(s.done>1?'s':'')+' sur '+nf.format(s.total)+' recensés. Ce suivi est personnel : ce n’est pas la progression officielle du jeu.'; }
  }
  document.addEventListener('change',ev=>{ const el=ev.target; if(el.matches&&el.matches('[data-acq]')){ if(!store.toggle(el.dataset.acq,el.checked)){ el.checked=!el.checked; } } });
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
        const names={lk_own_vehicules:'Véhicules cochés',lk_own_armes:'Armes cochées',lk_map_found:'Lieux repérés',lk_own_equipements:'Équipements obtenus',lk_own_munitions:'Types de munitions obtenus',lk_progression_v2:'Contenus documentés cochés',lk_collectibles_v1:'Carnet de collection','lk-calculator-notebooks-v3':'Carnets du calculateur','lk-calculator-v1':'Calcul en cours','lk-calculator-favorites-v1':'Fiches favorites'};
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

/* Calculs enregistrés : compteur lu dans le navigateur (même clé que la page Calculateur). */
(function () {
  function count(keys, pick) {
    for (const k of keys) { try { const raw = localStorage.getItem(k); if (!raw) continue; const d = JSON.parse(raw); const n = pick(d); if (Number.isFinite(n)) return n; } catch (e) {} }
    return 0;
  }
  const calc = count(['lk-calculator-saved-v1'], d => { const s = Array.isArray(d) ? d : (d.saved || d.items || []); return Array.isArray(s) ? s.length : 0; });
  const b = document.getElementById('progress-calc-n');
  if (b) b.textContent = calc ? String(calc) + ' calcul' + (calc > 1 ? 's' : '') : 'Aucun calcul';
})();
