/* Généré depuis outils/sources/progression.js : modifie la source, pas ce fichier. */
var lkPluriel=function(n){return ((typeof document!=='undefined'&&document.documentElement&&document.documentElement.lang)||'fr').slice(0,2)==='fr'?n>1:n!==1;};
(function(){
  'use strict';
  var lkPl = function (n) { return /^fr/.test(document.documentElement.lang || "fr") ? n > 1 : n !== 1; };
  const M=window.LK_MODELE, K=window.LKCarnets, ids=Object.assign({},window.LK_PROGRESS_IDS||{}), nf=new Intl.NumberFormat('en-US');
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
    if(list.length){const n=list.length;set(box,'[data-tr-note]',n+(lkPluriel(n)?' trophies ticked':' trophy ticked')+' on the Trophies page; the total is waiting for the official list.');}
  }
  trophees();
  function notebooks(){try{const d=JSON.parse(storage.getItem('lk-calculator-notebooks-v3')||'null');return d&&d.version===3&&Array.isArray(d.entries)?d.entries.filter(e=>e&&typeof e.tool==='string'):[];}catch(e){return [];}}
  function render(){
    M.carnets.forEach(k=>{
      const card=document.getElementById('carnet-'+k.id);if(!card)return;
      if(k.nature==='document'){
        const all=storage?notebooks():[],plans=all.filter(e=>e.tool==='plan').length,calcs=all.length-plans;
        set(card,'#progress-calc-n',calcs?nf.format(calcs)+(lkPluriel(calcs)?' calculations':' calculation'):'No calculations');
        set(card,'[data-cn-plans-n]',plans?nf.format(plans)+(lkPluriel(plans)?' plans':' plan'):'No plans');
        return;
      }
      let done=0,total=0,wishes=0,toFill=0,orphans=0;
      k.familles.forEach(f=>{
        const known=new Set(ids[f]||[]),own=store?store.owned(f):[],d=own.filter(id=>known.has(id)).length;
        done+=d;total+=known.size;orphans+=own.length-d;
        if(store){wishes+=store.wishes(f).filter(w=>known.has(w.id)).length;if(K.STOCKABLE[f])toFill+=own.filter(id=>known.has(id)&&store.stock(f,id).state==='a-renseigner').length;}
        const line=card.querySelector('[data-family="'+f+'"] .suivi-n');
        if(line)line.textContent=f==='collectibles'&&!known.size?'To be documented':nf.format(d)+' of '+nf.format(known.size);
      });
      if(k.id==='garde-robe'&&store)wishes+=store.wishes('styles').length;
      set(card,'[data-cn-done]',nf.format(done));set(card,'[data-cn-total]',nf.format(total));
      const nline=card.querySelector('.cn-dcard-n'),bbar=card.querySelector('.cn-dcard-bar');if(nline&&!total){nline.textContent='To be documented';if(bbar)bbar.hidden=true;}
      const bar=card.querySelector('[data-cn-bar]');if(bar)bar.style.width=(total?done/total*100:0)+'%';
      const extra=[];
      if(wishes)extra.push(nf.format(wishes)+(k.id==='lieux'?' to visit':k.id==='consommables'?' to try':(lkPluriel(wishes)?' wishes':' wish')));
      if(toFill)extra.push(nf.format(toFill)+(lkPluriel(toFill)?' stock counts to fill in':' stock count to fill in'));
      if(orphans)extra.push(nf.format(orphans)+(lkPluriel(orphans)?' separate entries':' separate entry'));
      if(!total)extra.push('The list will fill in once the game is out');
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
  if(!storage){const memory={};storage={getItem:k=>Object.prototype.hasOwnProperty.call(memory,k)?memory[k]:null,setItem:(k,v)=>{memory[k]=String(v);},removeItem:k=>{delete memory[k];},key:i=>Object.keys(memory)[i]??null,get length(){return Object.keys(memory).length;}};notice('This browser’s storage is unavailable: your progress is shown but won’t be kept. Allow the site to use storage, or export your progress from another browser.');}
  const store=P.create({storage,acquisitions:window.LK_ACQUISITIONS,ids:window.LK_PROGRESS_IDS,collectibles:(window.LK_COLLECTIBLES&&window.LK_COLLECTIBLES.items)||[],notice});
  try{ store.migrate(); }catch(e){}
  const nf=new Intl.NumberFormat('en-US',{maximumFractionDigits:0});
  function esc(x){ return String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function render(){
    const s=store.summary();
    const v=document.getElementById('progress-global-value'), bar=document.getElementById('progress-global-bar'), t=document.getElementById('progress-global-text');
    if(v){ v.textContent=nf.format(Math.floor(s.percent))+'%'; bar.value=Math.max(0,Math.min(100,s.percent)); t.textContent=(lkPl(s.done)?'{n} checked out of {t} listed.':'{n} checked out of {t} listed.').replace('{n}',nf.format(s.done)).replace('{t}',nf.format(s.total))+' This tracking is personal: it’s not the game’s official progress.'; }
  }
  store.subscribe(render); window.addEventListener('storage',render); window.addEventListener('pageshow',render); render();
  const ex=document.getElementById('save-export'), im=document.getElementById('save-import'), pv=document.getElementById('save-preview');
  if(!ex||!im) return;
  ex.addEventListener('click',function(){
    const out=store.exportData(), n=Object.keys(out.data).length;
    const blob=new Blob([JSON.stringify(out,null,1)],{type:'application/json'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='leonidakit-suivi-'+new Date().toISOString().slice(0,10)+'.json'; document.body.appendChild(a); a.click(); a.remove();
    notice(n?n+(lkPluriel(n)?' sections exported':' section exported')+' (version 2).':'Nothing to export yet.');
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
        const names={lk_own_vehicules:'Checked vehicles',lk_own_armes:'Checked weapons',lk_map_found:'Spotted places',lk_own_equipements:'Gear obtained',lk_own_munitions:'Ammo types obtained',lk_own_consommables:'Consumables tasted',lk_own_coiffures:'Hairstyles tried',lk_own_tatouages:'Tattoos done',lk_own_tenues:'Outfits and accessories worn','lk_own_perso-vehicules':'Vehicle mods installed','lk_own_perso-armes':'Weapon mods installed',lk_progression_v2:'Checked documented content',lk_collectibles_v1:'Collectibles found, favorites and notes','lk-calculator-notebooks-v3':'Saved calculations and plans','lk-calculator-v1':'Calculation in progress','lk-calculator-favorites-v1':'Favorite pages',lk_stock_v1:'Stock (consumables, ammo)',lk_wish_v1:'Wishlist',lk_journal_v1:'Achievement log'};
        list.innerHTML=Object.keys(plan.rubrics).map(k=>'<li>'+esc(names[k]||k)+'</li>').join('')||'<li>No readable section.</li>';
        iss.hidden=!plan.issues.length; iss.textContent=plan.issues.length?'Good to know: '+plan.issues.join(', '):'';
        pv.hidden=false; notice('Tracking file read (version '+plan.version+(plan.exportedAt?', from '+String(plan.exportedAt).slice(0,10):'')+'). Choose: merge, replace or cancel.');
      }catch(e){ plan=null; pv.hidden=true; notice(e.message||'File not recognized: you need a Leonidakit export.'); im.value=''; }
    };
    r.readAsText(f);
  });
  document.getElementById('save-cancel').addEventListener('click',()=>{ closePreview(); notice('Import canceled: nothing was changed.'); });
  ['merge','replace'].forEach(mode=>{ document.getElementById('save-'+mode).addEventListener('click',()=>{
    if(!plan) return;
    try{ const r=store.applyImport(plan,mode); closePreview(); notice(r.written.length+(r.written.length>1?(mode==='merge'?' sections merged':' sections replaced'):(mode==='merge'?' section merged':' section replaced'))+'. Reloading…'); setTimeout(()=>location.reload(),700); }
    catch(e){ closePreview(); }
  }); });
})();
