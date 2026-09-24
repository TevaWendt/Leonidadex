(function(){
  'use strict';
  const ids=window.LK_PROGRESS_IDS;
  function render(){
    for(const [type,key] of [['vehicules','lk_own_vehicules'],['armes','lk_own_armes'],['lieux','lk_map_found']]){
      const saved=window.LK.read(key,{},window.LK.own),total=ids[type].length,done=ids[type].filter(id=>Object.hasOwn(saved,id)&&saved[id]).length;
      const row=document.getElementById('progress-'+type);row.querySelector('strong').textContent=done+' / '+total;const bar=row.querySelector('progress');bar.max=total;bar.value=done;
    }
  }
  function renderCollectibles(){
    const core=window.LKCollectibles, row=document.getElementById('progress-collectibles');
    if(!core||!row)return;
    const items=(window.LK_COLLECTIBLES?.items||[]).filter(item=>core.isTrackable(item));
    const state=core.getState(),done=items.filter(item=>state.found[item.id]).length;
    row.querySelector('strong').textContent=items.length?done+' / '+items.length+' documentés':'Collection à documenter';
    const bar=row.querySelector('progress');bar.hidden=!items.length;bar.max=items.length||1;bar.value=done;
  }
  renderCollectibles();window.LKCollectibles?.subscribe(renderCollectibles);
  window.addEventListener('pageshow',renderCollectibles);
  render();window.addEventListener('storage',render);window.addEventListener('pageshow',render);
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
        return '<article class="note-box acq-box'+(g.total?'':' is-pending')+'" id="progress-'+esc(c.id)+'"><h3>'+esc(c.label)+'</h3><strong>'+(g.total?g.done+' / '+g.total:'En attente du jeu')+'</strong>'+(g.total?'<progress value="'+g.done+'" max="'+g.total+'" aria-label="'+esc(c.label)+'"></progress>':'<p class="acq-pending">Rien de publié par Rockstar pour l’instant : ne compte pas dans le total.</p>')+checks+'<a href="'+esc(routes[c.id]||'achats.html')+'">Ouvrir la section</a></article>';
      };
      box.innerHTML='<div class="progress-cards progress-cards--four">'+docs.map(card).join('')+'</div>'+(pend.length?'<h3 class="acq-sub">Sections à venir : en attente du jeu</h3><div class="progress-cards">'+pend.map(card).join('')+'</div>':'');
    }
    const v=document.getElementById('progress-global-value'), bar=document.getElementById('progress-global-bar'), t=document.getElementById('progress-global-text');
    if(v){ v.textContent=nf.format(Math.floor(s.percent))+' %'; bar.value=Math.max(0,Math.min(100,s.percent)); t.textContent=s.done+' coché'+(s.done>1?'s':'')+' sur '+s.total+' recensés. Ce suivi est personnel : ce n’est pas la progression officielle du jeu.'; }
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
        const names={lk_own_vehicules:'Véhicules cochés',lk_own_armes:'Armes cochées',lk_map_found:'Lieux repérés',lk_progression_v2:'Contenus documentés cochés',lk_collectibles_v1:'Carnet de collection','lk-calculator-notebooks-v3':'Carnets du calculateur','lk-calculator-v1':'Calcul en cours','lk-calculator-favorites-v1':'Fiches favorites'};
        list.innerHTML=Object.keys(plan.rubrics).map(k=>'<li>'+esc(names[k]||k)+'</li>').join('')||'<li>Aucune rubrique lisible.</li>';
        iss.hidden=!plan.issues.length; iss.textContent=plan.issues.length?'À savoir : '+plan.issues.join(' · '):'';
        pv.hidden=false; notice('Fichier de suivi lu (version '+plan.version+(plan.exportedAt?', du '+String(plan.exportedAt).slice(0,10):'')+'). Choisis : fusionner, remplacer ou annuler.');
      }catch(e){ plan=null; pv.hidden=true; notice(e.message||'Fichier non reconnu : il faut un export Leonidakit.'); im.value=''; }
    };
    r.readAsText(f);
  });
  document.getElementById('save-cancel').addEventListener('click',()=>{ closePreview(); notice('Import annulé : rien n’a été modifié.'); });
  ['merge','replace'].forEach(mode=>{ document.getElementById('save-'+mode).addEventListener('click',()=>{
    if(!plan) return;
    try{ const r=store.applyImport(plan,mode); closePreview(); notice(r.written.length+' rubrique'+(r.written.length>1?'s':'')+(mode==='merge'?' fusionnée':' remplacée')+(r.written.length>1?'s':'')+'. Rechargement…'); setTimeout(()=>location.reload(),700); }
    catch(e){ closePreview(); }
  }); });
})();

/* Carnet de collection et calculs enregistrés : compteurs lus dans le navigateur (mêmes clés que les pages Collectibles et Calculateurs). */
(function () {
  function count(keys, pick) {
    for (const k of keys) { try { const raw = localStorage.getItem(k); if (!raw) continue; const d = JSON.parse(raw); const n = pick(d); if (Number.isFinite(n)) return n; } catch (e) {} }
    return 0;
  }
  const carnet = count(['lk_collectibles_v1'], d => { const f = d.found || d.trouves || d.items || d; return Array.isArray(f) ? f.length : (f && typeof f === 'object' ? Object.keys(f).filter(k => f[k]).length : 0); });
  const calc = count(['lk-calculator-saved-v1'], d => { const s = Array.isArray(d) ? d : (d.saved || d.items || []); return Array.isArray(s) ? s.length : 0; });
  const a = document.getElementById('progress-carnet-n'), b = document.getElementById('progress-calc-n');
  if (a) a.textContent = String(carnet); if (b) b.textContent = String(calc);
})();
