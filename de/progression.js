/* v7.61 : pluriel selon la langue de la page : français n > 1 (« 0 coché », « 1,5 million ») ; anglais, espagnol n ≠ 1 (« 0 marcados ») */
var lkPluriel=function(n){return ((typeof document!=='undefined'&&document.documentElement&&document.documentElement.lang)||'fr').slice(0,2)==='fr'?n>1:n!==1;};
/* LEONIDAKIT — page Progression : tableau de bord des carnets (v7.51, lot 4).
   Chaque carnet (outils/modele-donnees.json) a sa page dédiée (carnets/<id>.html) ; ici, une carte par carnet compte ce
   qui est coché, famille par famille, avec les mêmes identifiants et les mêmes clés que les fiches, les carnets et le
   calculateur (progression-data.js, carnets-core.js, progression-core.js pour les contenus documentés, collectibles-core.js).
   Les envies (lk_wish_v1) et les stocks à renseigner sont signalés, jamais comptés comme possédés. Les anciennes ancres
   (#garage, #arsenal, #tenues…) mènent à la carte du carnet qui les contient. */
(function(){
  'use strict';
  var lkPl = function (n) { return /^fr/.test(document.documentElement.lang || "fr") ? n > 1 : n !== 1; }; /* pluriel selon la langue de la page (français : n > 1) */
  const M=window.LK_MODELE, K=window.LKCarnets, ids=Object.assign({},window.LK_PROGRESS_IDS||{}), nf=new Intl.NumberFormat('de-DE');
  if(!M||!K) return;
  /* Contenus documentés : éléments suivables sans renvoi vers un véhicule ou une arme (ceux-là comptent dans le garage ou l’arsenal). */
  ids.acquisitions=((window.LK_ACQUISITIONS&&window.LK_ACQUISITIONS.items)||[]).filter(x=>x&&x.trackable===true&&!(x.ref&&x.ref.type&&x.ref.id)).map(x=>x.id);
  ids.collectibles=((window.LK_COLLECTIBLES&&window.LK_COLLECTIBLES.items)||[]).filter(x=>x&&x.trackable===true&&x.published!==false&&['confirmed','established'].includes(x.status)).map(x=>x.id);
  let storage=null;try{storage=window.localStorage;}catch(e){storage=null;}
  const store=storage?K.create({storage,modele:M,ids}):null;
  const set=(root,sel,v)=>{const n=root.querySelector(sel);if(n)n.textContent=v;};
  /* v7.73 (lot 3) : bloc « Mes trophées et succès » : cases « Obtenu » de la page Trophées (clé lk-trophees-obtenus-v1, liste
     d'identifiants) ; la liste n'étant pas publiée, le total et les grades restent « ? » : seul le nombre coché est écrit. */
  function trophees(){
    const box=document.querySelector('[data-tr-prog]');if(!box||!storage)return;
    let list=[];try{const v=JSON.parse(storage.getItem('lk-trophees-obtenus-v1')||'[]');list=Array.isArray(v)?v.filter(x=>typeof x==='string'):[];}catch(e){list=[];}
    set(box,'[data-tr-n]',nf.format(list.length));
    if(list.length){const n=list.length;set(box,'[data-tr-note]',n+(lkPluriel(n)?' Trophäen abgehakt':' Trophäe abgehakt')+' auf der Trophäen-Seite; die Gesamtzahl wartet auf die offizielle Liste.');}
  }
  trophees();
  function notebooks(){try{const d=JSON.parse(storage.getItem('lk-calculator-notebooks-v3')||'null');return d&&d.version===3&&Array.isArray(d.entries)?d.entries.filter(e=>e&&typeof e.tool==='string'):[];}catch(e){return [];}}
  function render(){
    M.carnets.forEach(k=>{
      const card=document.getElementById('carnet-'+k.id);if(!card)return;
      if(k.nature==='document'){
        const all=storage?notebooks():[],plans=all.filter(e=>e.tool==='plan').length,calcs=all.length-plans;
        set(card,'#progress-calc-n',calcs?nf.format(calcs)+(lkPluriel(calcs)?' Berechnungen':' Berechnung'):'Keine Berechnung');
        set(card,'[data-cn-plans-n]',plans?nf.format(plans)+(lkPluriel(plans)?' Pläne':' Plan'):'Kein Plan');
        return;
      }
      let done=0,total=0,wishes=0,toFill=0,orphans=0;
      k.familles.forEach(f=>{
        const known=new Set(ids[f]||[]),own=store?store.owned(f):[],d=own.filter(id=>known.has(id)).length;
        done+=d;total+=known.size;orphans+=own.length-d;
        if(store){wishes+=store.wishes(f).filter(w=>known.has(w.id)).length;if(K.STOCKABLE[f])toFill+=own.filter(id=>known.has(id)&&store.stock(f,id).state==='a-renseigner').length;}
        const line=card.querySelector('[data-family="'+f+'"] .suivi-n');
        if(line)line.textContent=f==='collectibles'&&!known.size?'Noch zu dokumentieren':nf.format(d)+' / '+nf.format(known.size);
      });
      if(k.id==='garde-robe'&&store)wishes+=store.wishes('styles').length;
      set(card,'[data-cn-done]',nf.format(done));set(card,'[data-cn-total]',nf.format(total));
      const nline=card.querySelector('.cn-dcard-n'),bbar=card.querySelector('.cn-dcard-bar');if(nline&&!total){nline.textContent='Noch zu dokumentieren';if(bbar)bbar.hidden=true;}
      const bar=card.querySelector('[data-cn-bar]');if(bar)bar.style.width=(total?done/total*100:0)+'%';
      const extra=[];
      if(wishes)extra.push(nf.format(wishes)+(k.id==='lieux'?' zu besuchen':k.id==='consommables'?' zu probieren':(lkPluriel(wishes)?' Wünsche':' Wunsch')));
      if(toFill)extra.push(nf.format(toFill)+(lkPluriel(toFill)?' Bestände einzutragen':' Bestand einzutragen'));
      if(orphans)extra.push(nf.format(orphans)+(lkPluriel(orphans)?' übrige Einträge':' übriger Eintrag'));
      if(!total)extra.push('Die Liste füllt sich mit dem Spiel');
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
  var lkPl = function (n) { return /^fr/.test(document.documentElement.lang || "fr") ? n > 1 : n !== 1; }; /* pluriel selon la langue de la page (français : n > 1) */
  if(!P) return;
  const notice=m=>{ if(msg) msg.textContent=m; };
  /* v7.54 : stockage du navigateur refusé (navigation privée stricte, réglage) : la page reste lisible et le dit, au lieu de planter (revue v7.53). */
  let storage=null;try{storage=window.localStorage;const probe='lk_probe';storage.setItem(probe,'1');storage.removeItem(probe);}catch(e){storage=null;}
  if(!storage){const memory={};storage={getItem:k=>Object.prototype.hasOwnProperty.call(memory,k)?memory[k]:null,setItem:(k,v)=>{memory[k]=String(v);},removeItem:k=>{delete memory[k];},key:i=>Object.keys(memory)[i]??null,get length(){return Object.keys(memory).length;}};notice('Der Speicher dieses Browsers ist nicht verfügbar: Dein Fortschritt wird angezeigt, aber nicht behalten. Erlaube der Seite, Daten zu speichern, oder exportiere ihn aus einem anderen Browser.');}
  const store=P.create({storage,acquisitions:window.LK_ACQUISITIONS,ids:window.LK_PROGRESS_IDS,collectibles:(window.LK_COLLECTIBLES&&window.LK_COLLECTIBLES.items)||[],notice});
  try{ store.migrate(); }catch(e){}
  const nf=new Intl.NumberFormat('de-DE',{maximumFractionDigits:0});
  function esc(x){ return String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function render(){
    const s=store.summary();
    const v=document.getElementById('progress-global-value'), bar=document.getElementById('progress-global-bar'), t=document.getElementById('progress-global-text');
    if(v){ v.textContent=nf.format(Math.floor(s.percent))+' %'; bar.value=Math.max(0,Math.min(100,s.percent)); t.textContent=(lkPl(s.done)?'{n} von {t} erfassten Einträgen abgehakt.':'{n} von {t} erfassten Einträgen abgehakt.').replace('{n}',nf.format(s.done)).replace('{t}',nf.format(s.total))+' Dieses Tracking ist persönlich: Es ist nicht der offizielle Spielfortschritt.'; }
  }
  store.subscribe(render); window.addEventListener('storage',render); window.addEventListener('pageshow',render); render();

  const ex=document.getElementById('save-export'), im=document.getElementById('save-import'), pv=document.getElementById('save-preview');
  if(!ex||!im) return;
  ex.addEventListener('click',function(){
    const out=store.exportData(), n=Object.keys(out.data).length;
    const blob=new Blob([JSON.stringify(out,null,1)],{type:'application/json'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='leonidakit-suivi-'+new Date().toISOString().slice(0,10)+'.json'; document.body.appendChild(a); a.click(); a.remove();
    notice(n?n+(lkPluriel(n)?' Bereiche exportiert':' Bereich exportiert')+' (version 2).':'Noch nichts zu exportieren.');
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
        const names={lk_own_vehicules:'Abgehakte Fahrzeuge',lk_own_armes:'Abgehakte Waffen',lk_map_found:'Entdeckte Orte',lk_own_equipements:'Erhaltene Ausrüstung',lk_own_munitions:'Erhaltene Munitionsarten',lk_own_consommables:'Probierte Verbrauchsgüter',lk_own_coiffures:'Ausprobierte Frisuren',lk_own_tatouages:'Gestochene Tattoos',lk_own_tenues:'Getragene Outfits und Accessoires','lk_own_perso-vehicules':'Verbaute Fahrzeug-Mods','lk_own_perso-armes':'Verbaute Waffen-Mods',lk_progression_v2:'Abgehakte dokumentierte Inhalte',lk_collectibles_v1:'Gefundene Sammelobjekte, Favoriten und Notizen','lk-calculator-notebooks-v3':'Gespeicherte Berechnungen und Pläne','lk-calculator-v1':'Laufende Berechnung','lk-calculator-favorites-v1':'Favorisierte Seiten',lk_stock_v1:'Vorräte (Verbrauchsgüter, Munition)',lk_wish_v1:'Wünsche',lk_journal_v1:'Erfolgsprotokoll'};
        list.innerHTML=Object.keys(plan.rubrics).map(k=>'<li>'+esc(names[k]||k)+'</li>').join('')||'<li>Kein lesbarer Bereich.</li>';
        iss.hidden=!plan.issues.length; iss.textContent=plan.issues.length?'Gut zu wissen: '+plan.issues.join(' · '):'';
        pv.hidden=false; notice('Tracking-Datei gelesen (Version '+plan.version+(plan.exportedAt?', vom '+String(plan.exportedAt).slice(0,10):'')+'). Wähle: zusammenführen, ersetzen oder abbrechen.');
      }catch(e){ plan=null; pv.hidden=true; notice(e.message||'Datei nicht erkannt: Du brauchst einen Export von Leonidakit.'); im.value=''; }
    };
    r.readAsText(f);
  });
  document.getElementById('save-cancel').addEventListener('click',()=>{ closePreview(); notice('Import abgebrochen: Es wurde nichts verändert.'); });
  ['merge','replace'].forEach(mode=>{ document.getElementById('save-'+mode).addEventListener('click',()=>{
    if(!plan) return;
    try{ const r=store.applyImport(plan,mode); closePreview(); notice(r.written.length+(r.written.length>1?(mode==='merge'?' Bereiche zusammengeführt':' Bereiche ersetzt'):(mode==='merge'?' Bereich zusammengeführt':' Bereich ersetzt'))+'. Wird neu geladen…'); setTimeout(()=>location.reload(),700); }
    catch(e){ closePreview(); }
  }); });
})();

