(function(){
'use strict';
const esc = window.LK.esc;
const el = id => document.getElementById(id);

  /* Bandeaux défilants : une moitié de piste doit couvrir au moins la largeur de l'écran, sinon la boucle
     laisse un vide. On répète le contenu jusqu'à dépasser l'écran, puis on duplique pour l'animation -50 %. */
  function fillTrack(track, unit){
    if(!track || !unit) return;
    track.innerHTML = '<span class="mq-half">' + unit + '</span>';
    const half = track.firstChild;
    let n = 1, guard = 0;
    while(half.getBoundingClientRect().width < window.innerWidth + 80 && guard < 40){ half.insertAdjacentHTML('beforeend', unit); n++; guard++; }
    track.insertAdjacentHTML('beforeend', '<span class="mq-half" aria-hidden="true">' + half.innerHTML + '</span>');
    track.dataset.unit = unit;
  }
  let fillTimer = null;
  window.addEventListener('resize', function(){
    clearTimeout(fillTimer);
    fillTimer = setTimeout(function(){ document.querySelectorAll('[data-unit]').forEach(function(t){ fillTrack(t, t.dataset.unit); }); }, 200);
  });

  /* --- Éléments propres à la page d'accueil : on sort si absents --- */
  const isHome = !!el('mq');

  if(isHome){
  /* bandeau défilant, dupliqué pour une boucle sans coupure */
  const words = ["19 novembre 2026","Vice City","Leonida Keys","Grassrivers","Port Gellhorn","Ambrosia","Mount Kalaga","PS5 et Xbox Series"];
  fillTrack(el('mq'), words.map(w => '<b>' + w + '</b><i>&#9670;</i>').join(''));

  /* bandeau des régions : captures officielles Rockstar (les mêmes que les fiches des régions) */
  const scenes = [
    {cap:"Vice City",     img:"vice-city-01"},
    {cap:"Leonida Keys",  img:"leonida-keys-01"},
    {cap:"Grassrivers",   img:"grassrivers-01"},
    {cap:"Port Gellhorn", img:"port-gellhorn-01"},
    {cap:"Ambrosia",      img:"ambrosia-01"},
    {cap:"Mount Kalaga",  img:"mount-kalaga-national-park-01"}
  ];
  fillTrack(el('strip'), scenes.map(function(s){
    return '<div class="card"><img src="/img/officiel/'+s.img+'-480.webp" width="480" height="270" alt="" loading="lazy" decoding="async"><span class="cap">'+s.cap+'</span></div>';
  }).join(''));

  /* second bandeau, sens inverse */
  const words2 = ["Carte filtrable","Suivi de progression","Fiches véhicules","Emplacements","Calculateurs","Mis à jour en continu"];
  fillTrack(el('mq2'), words2.map(w => '<b>' + w + '</b><i>&#9679;</i>').join(''));

  /* chiffres clés qui montent à l'apparition */
  const factIO = new IntersectionObserver(function(entries){
    entries.forEach(function(en){
      if(!en.isIntersecting) return;
      const node = en.target, end = parseInt(node.dataset.count, 10);
      let n = 0;
      const step = Math.max(1, Math.round(end/18));
      const timer = setInterval(function(){
        n += step;
        if(n >= end){ n = end; clearInterval(timer); }
        node.textContent = n;
      }, 45);
      factIO.unobserve(node);
    });
  }, {threshold:.5});
  document.querySelectorAll('.fact .big[data-count]').forEach(function(n){ factIO.observe(n); });

  /* compteur à rouleaux */
  const target = new Date("2026-11-19T00:00:00");
  const last = {rd:null, rh:null, rm:null, rs:null};
  function setRoll(id, val){
    if(last[id] === val) return;
    const box = el(id);
    const s = document.createElement('span');
    s.textContent = val; s.className = 'up';
    box.innerHTML = ''; box.appendChild(s);
    last[id] = val;
  }
  function tick(){
    const diff = target - new Date();
    setRoll('rd', String(Math.max(0, Math.floor(diff/86400000))));
    setRoll('rh', String(Math.max(0, Math.floor(diff/3600000)%24)).padStart(2,'0'));
    setRoll('rm', String(Math.max(0, Math.floor(diff/60000)%60)).padStart(2,'0'));
    setRoll('rs', String(Math.max(0, Math.floor(diff/1000)%60)).padStart(2,'0'));
  }
  tick(); setInterval(tick, 1000);

  /* titre mot par mot */
  document.querySelectorAll('#h1 .w').forEach(function(w,i){
    w.style.animationDelay = (0.12 + i*0.075) + 's';
  });

  } /* fin des éléments d'accueil */

  /* menu mobile, présent sur toutes les pages */
  const burger = el('burger'), nav = el('nav');
  if(burger && nav) burger.addEventListener('click', function(){
    const open = nav.classList.toggle('open');
    burger.setAttribute('aria-expanded', open);
    burger.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
  });

  const moreMenu=document.querySelector('.nav-more');
  document.addEventListener('click',e=>{if(moreMenu?.open&&!moreMenu.contains(e.target))moreMenu.open=false;});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&moreMenu?.open){moreMenu.open=false;moreMenu.querySelector('summary').focus();e.stopImmediatePropagation();}});
  /* Recherche accessible, utilisable aussi dans les deux formulaires de la 404. */
  document.querySelectorAll('.searchwrap').forEach(function(wrap){
    const q = wrap.querySelector('input[type="search"]'), box = wrap.querySelector('.suggest');
    if(!q || !box || !window.LK_INDEX) return;
    const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
    let index = window.LK_INDEX.map(e => ({...e, text:norm(e.s+' '+e.l)}));
    let cur = -1, hits = [];
    const nearby=(a,b)=>{if(a.length<5||Math.abs(a.length-b.length)>1)return false;let i=0,j=0,errors=0;while(i<a.length&&j<b.length){if(a[i]===b[j]){i++;j++;continue;}if(++errors>1)return false;if(a.length>=b.length)i++;if(b.length>=a.length)j++;}return errors+(i<a.length||j<b.length?1:0)<=1;};
    /* les 2 500 lieux de la carte ne sont chargés qu'à la première recherche (fichier séparé) */
    function fondreLieux(){ if(!window.LK_INDEX_LIEUX || index.lieux) return; index = index.concat(window.LK_INDEX_LIEUX.map(e => ({...e, text:norm(e.s+' '+e.l)}))); index.lieux = true; if(q.value.trim()) render(); }
    function chargerLieux(){
      if(window.LK_INDEX_LIEUX){ fondreLieux(); return; }
      document.addEventListener('lk-lieux', fondreLieux);
      if(document.getElementById('lk-lieux-js')) return;
      const ref = Array.from(document.scripts).find(s=>s.src&&new URL(s.src,location.href).pathname.endsWith('/search-index.js')); if(!ref) return;
      const s = document.createElement('script'); s.id = 'lk-lieux-js'; s.async = true;
      s.src = ref.getAttribute('src').replace('search-index.js', 'search-lieux.js');
      s.onload = function(){ document.dispatchEvent(new Event('lk-lieux')); };
      document.head.appendChild(s);
    }
    q.addEventListener('focus', chargerLieux, {once:true}); q.addEventListener('input', chargerLieux, {once:true});
    q.setAttribute('role','combobox'); q.setAttribute('aria-autocomplete','list');
    q.setAttribute('aria-controls',box.id); q.setAttribute('aria-expanded','false');
    const close = () => { box.classList.remove('open'); q.setAttribute('aria-expanded','false'); q.removeAttribute('aria-activedescendant'); cur=-1; };
    function render(){
      const v=norm(q.value); cur=-1; q.removeAttribute('aria-activedescendant');
      if(!v){box.innerHTML=''; hits=[]; close(); return;}
      hits=index.map(e=>({e,rank:norm(e.l)===v?0:norm(e.l).startsWith(v)?1:e.text.includes(v)?2:v.split(' ').every(t=>e.text.includes(t))?3:v.split(' ').every(t=>e.text.includes(t)||e.text.split(' ').some(w=>nearby(t,w)))?4:99})).filter(x=>x.rank<99).sort((a,b)=>a.rank-b.rank||(a.e.w||0)-(b.e.w||0)||a.e.l.length-b.e.l.length).slice(0,8).map(x=>x.e);
      box.innerHTML=hits.length?hits.map((e,i)=>'<a id="'+box.id+'-option-'+i+'" href="'+esc(e.u)+'" role="option" aria-selected="false"><span>'+esc(e.l)+'</span><span class="kind">'+esc(e.k)+'</span></a>').join(''):'<div class="none" role="status">Aucun résultat pour « '+esc(q.value.trim())+' ».</div>';
      box.classList.add('open'); q.setAttribute('aria-expanded','true');
    }
    q.addEventListener('input',render); q.addEventListener('focus',()=>{if(q.value.trim())render();});
    q.addEventListener('keydown',function(e){
      const items=Array.from(box.querySelectorAll('a'));
      if(e.key==='Escape'){close();return;}
      if(!box.classList.contains('open'))return;
      if(e.key==='Enter' && hits.length){e.preventDefault(); location.href=hits[Math.max(0,cur)].u;return;}
      if(!items.length || !['ArrowDown','ArrowUp'].includes(e.key))return;
      e.preventDefault();cur=(cur+(e.key==='ArrowDown'?1:-1)+items.length)%items.length;
      items.forEach((n,i)=>{n.classList.toggle('on',i===cur);n.setAttribute('aria-selected',String(i===cur));});
      q.setAttribute('aria-activedescendant',items[cur].id);items[cur].scrollIntoView({block:'nearest'});
    });
    document.addEventListener('click',e=>{if(!wrap.contains(e.target))close();});
  });
  document.addEventListener('keydown',function(e){
    const editing = e.target.closest('input,textarea,select,[contenteditable="true"]');
    if(e.key==='/' && !editing && !document.getElementById('vq')){const q=document.getElementById('q');if(q){e.preventDefault();q.focus();}}
    if(e.key==='Escape' && nav?.classList.contains('open')){nav.classList.remove('open');burger.setAttribute('aria-expanded','false');burger.setAttribute('aria-label','Ouvrir le menu');burger.focus();}
  });

  /* apparitions au défilement, sur toutes les pages */
  const LK_reveal = (function(){
    const io = new IntersectionObserver(function(entries){
      /* décalage progressif à l'intérieur d'une même vague */
      let k = 0;
      entries.forEach(function(en){
        if(!en.isIntersecting) return;
        const own = parseInt(en.target.dataset.delay || '-1', 10);
        const d = own >= 0 ? own : k * 65;
        k++;
        setTimeout(function(){ en.target.classList.add('in'); }, d);
        io.unobserve(en.target);
      });
    }, {threshold:.08, rootMargin:'0px 0px -30px 0px'});

    function scan(){
      document.querySelectorAll('.reveal:not(.in), .rise:not(.in)').forEach(function(n){
        io.observe(n);
      });
    }
    scan();

    /* filet de sécurité : si un élément reste invisible après 2,5 s, on l'affiche */
    setTimeout(function(){
      document.querySelectorAll('.reveal:not(.in), .rise:not(.in)').forEach(function(n){
        const r = n.getBoundingClientRect();
        if(r.top < window.innerHeight && r.bottom > 0) n.classList.add('in');
      });
    }, 3200);

    return { scan: scan };
  })();
  window.LK_reveal = LK_reveal;

  /* inscription à la lettre d'information, envoi direct vers Brevo */
  const signupForm = el('signup');
  if(signupForm){
    const mailField = el('mail');
    const subBtn    = el('sub');
    const note      = el('signup-note');

    function say(text, cls){
      note.textContent = text;
      note.className = 'signup-note ' + (cls || '');
    }

    signupForm.addEventListener('submit', function(e){
      const v = mailField.value.trim();

      if(!v || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)){
        e.preventDefault();
        say("Cette adresse ne semble pas valide.", 'ko');
        mailField.focus();
        return;
      }

      /* Brevo affiche son résultat réel dans l'onglet courant. */
      say("Ouverture du formulaire de confirmation…", '');
    });
  }

/* ============================================================
   PAGE DE LISTE DES VÉHICULES
   ============================================================ */
(function(){
  const grid = document.getElementById('vgrid');
  if(!grid) return;

  const cards   = Array.from(grid.querySelectorAll('.veh-card'));
  if(window.LK_reveal) window.LK_reveal.scan();

  const input   = document.getElementById('vq');
  const clearBt = document.getElementById('vclear');
  const chips   = Array.from(document.querySelectorAll('.chip-filter'));
  /* puce « Mon garage / Mon arsenal » : n'affiche que ce qu'on a coché, lisible aussi via #own=1 depuis la page Progression */
  (function(){ const bar = chips[0] && chips[0].parentNode; const type = document.body.dataset.own; if(!bar || !type) return;
    const b = document.createElement('button'); b.type = 'button'; b.id = 'chip-own'; b.className = 'chip-filter chip-own'; b.dataset.own = '1';
    b.innerHTML = (type === 'armes' ? 'Mon arsenal' : 'Mon garage') + ' <span class="chip-n" id="chip-own-n"></span>';
    b.addEventListener('click', function(){ activeOwn = !activeOwn; b.classList.toggle('is-on', activeOwn); ecrireEtat(); apply(); });
    bar.appendChild(b);
    const maj = function(){ try{ const o = window.LK.read('lk_own_' + type, {}, window.LK.own); const n = Object.keys(o).filter(k => o[k]).length; const el = document.getElementById('chip-own-n'); if(el) el.textContent = n; }catch(e){} };
    maj(); window.addEventListener('storage', maj); document.addEventListener('click', function(){ setTimeout(maj, 0); }, true);
  })();
  const countEl = document.getElementById('vcount');
  const emptyEl = document.getElementById('vempty');
  const bar     = document.getElementById('vbar');

  let activeCat = 'all', query = '', activeSt = null, activeSlot = null, activeEd = null, tri = ''; let activeOwn=false;
  /* la grille s'affiche par lots : moins de travail pour le téléphone, toutes les cartes restent dans la page */
  const LOT = 48; let limite = LOT, derniereSig = null;
  let plusBt = document.getElementById('vplus');
  if(!plusBt && emptyEl){ plusBt = document.createElement('button'); plusBt.type = 'button'; plusBt.id = 'vplus'; plusBt.className = 'vplus'; plusBt.hidden = true; emptyEl.parentNode.insertBefore(plusBt, emptyEl); }
  const norm = s => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
  const motCarte = grid.dataset.mot || 'véhicule';
  const ordreInitial = cards.slice();
  const POIDS_ST = { officiel: 0, vu: 1, comm: 2 };
  const triSel = document.getElementById('vtri');

  /* ordre d'affichage : la grille est réordonnée physiquement, sans reconstruire les cartes */
  function trier(){
    let liste = ordreInitial.slice();
    const nom = c => (c.querySelector('h3') || {}).textContent || '';
    const marque = c => (c.querySelector('.veh-marque') || {}).textContent || '';
    if(tri === 'az')       liste.sort((a, b) => nom(a).localeCompare(nom(b), 'fr'));
    else if(tri === 'za')  liste.sort((a, b) => nom(b).localeCompare(nom(a), 'fr'));
    else if(tri === 'marque') liste.sort((a, b) => marque(a).localeCompare(marque(b), 'fr') || nom(a).localeCompare(nom(b), 'fr'));
    else if(tri === 'statut') liste.sort((a, b) => (POIDS_ST[a.dataset.st] ?? 9) - (POIDS_ST[b.dataset.st] ?? 9) || nom(a).localeCompare(nom(b), 'fr'));
    liste.forEach(c => grid.appendChild(c));
  }

  /* l'état des filtres vit dans l'adresse : une vue filtrée se partage par lien */
  function ecrireEtat(){
    const p = new URLSearchParams(location.hash.includes('=') ? location.hash.slice(1) : '');
    ['cat','st','slot','ed','q','tri','own'].forEach(k=>p.delete(k));
    if(activeOwn) p.set('own', '1');
    if(activeCat !== 'all') p.set('cat', activeCat);
    if(activeSt) p.set('st', activeSt);
    if(activeSlot) p.set('slot', activeSlot);
    if(activeEd) p.set('ed', activeEd);
    if(query.trim()) p.set('q', query.trim());
    if(tri) p.set('tri', tri);
    const h = p.toString() ? '#' + p.toString() : location.pathname + location.search;
    if(('#' + p.toString()) !== location.hash && !(p.toString() === '' && !location.hash)) history.replaceState(null, '', h);
  }
  function lireEtat(){
    activeCat='all'; activeSt=null; activeSlot=null; activeEd=null; query=''; tri=''; input.value=''; if(triSel)triSel.value=''; activeOwn=false;
    if(!location.hash) return;
    if(!location.hash.includes('=')){ const legacy=chips.find(c=>c.dataset.filter===location.hash.slice(1)); if(legacy)activeCat=legacy.dataset.filter; }
    const p = new URLSearchParams(location.hash.slice(1));
    const cat = p.get('cat'); if(cat && chips.some(c => c.dataset.filter === cat)) activeCat = cat;
    const st = p.get('st'); if(st && chips.some(c=>c.dataset.stf===st)) activeSt = st;
    const sl = p.get('slot'); if(sl && chips.some(c=>c.dataset.slotf===sl)) activeSlot = sl;
    const ed = p.get('ed'); if(ed && chips.some(c=>c.dataset.edf===ed)) activeEd = ed;
    const q = p.get('q'); if(q){ query = q; input.value = q; }
    const t = p.get('tri'); if(t && triSel && Array.from(triSel.options).some(o => o.value === t)){ tri = t; triSel.value = t; }
    activeOwn = p.get('own') === '1'; const ob = document.getElementById('chip-own'); if(ob) ob.classList.toggle('is-on', activeOwn);
    chips.forEach(c => { if(c.dataset.filter) c.classList.toggle('is-on', c.dataset.filter === activeCat); });
    document.querySelectorAll('.chip-st').forEach(c => c.classList.toggle('is-on', c.dataset.stf === activeSt));
    document.querySelectorAll('.chip-slot').forEach(c => c.classList.toggle('is-on', c.dataset.slotf === activeSlot));
    document.querySelectorAll('.chip-ed').forEach(c => c.classList.toggle('is-on', c.dataset.edf === activeEd));
  }

  function apply(){
    const q = norm(query.trim());
    let shown = 0;
    trier();
    const ownSet = activeOwn ? (function(){ try{ const t = document.body.dataset.own; const o = t ? window.LK.read('lk_own_' + t, {}, window.LK.own) : {}; return new Set(Object.keys(o).filter(k => o[k])); }catch(e){ return new Set(); } })() : null;
    const sig = [activeCat, activeSt, activeSlot, activeEd, q, tri, activeOwn ? 'own' : ''].join('|');
    if(sig !== derniereSig){ derniereSig = sig; limite = LOT; }
    let rang = 0;
    cards.forEach(function(card){
      const okCat  = (activeCat === 'all') || (card.dataset.cat === activeCat);
      const okSt   = !activeSt   || card.dataset.st   === activeSt;
      const okSlot = !activeSlot || card.dataset.slot === activeSlot;
      const okEd   = !activeEd   || card.dataset.ed   === activeEd;
      const okTxt = !q || norm(card.dataset.search || '').includes(q);
      const okOwn = !ownSet || ownSet.has(card.dataset.id);
      const show = okCat && okTxt && okSt && okSlot && okEd && okOwn;
      if(show) shown++;
      card.hidden = !show || (rang >= limite);
      if(show){ rang++; if(!card.hidden) card.classList.add('in'); }
    });
    if(plusBt){ const reste = shown - Math.min(shown, limite); plusBt.hidden = reste <= 0; plusBt.textContent = 'Afficher ' + Math.min(reste, LOT) + ' de plus (' + reste + ' restant' + (reste > 1 ? 's' : '') + ')'; }
    countEl.innerHTML = '<strong>' + shown + '</strong> ' + motCarte + (shown > 1 ? 's' : '');
    emptyEl.hidden = shown > 0;
    if(clearBt) clearBt.hidden = !query.trim();
    chips.forEach(c=>c.setAttribute('aria-pressed',String(c.classList.contains('is-on'))));
    ecrireEtat();
  }
  if(plusBt) plusBt.addEventListener('click', function(){ limite += LOT; apply(); });
  if(triSel) triSel.addEventListener('change', function(){ tri = triSel.value; apply(); });
  /* raccourci : la touche / place le curseur dans le filtre */
  document.addEventListener('keydown', function(e){
    if(e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) && !document.activeElement.isContentEditable){ e.preventDefault(); input.focus(); }
  });

  input.addEventListener('input', function(e){ query = e.target.value; apply(); });

  if(clearBt){
    clearBt.addEventListener('click', function(){
      input.value = ''; query = ''; apply(); input.focus();
    });
  }

  chips.filter(c => c.dataset.filter).forEach(function(chip){
    chip.addEventListener('click', function(){
      chips.forEach(c => { if(c.dataset.filter) c.classList.remove('is-on'); });
      chip.classList.add('is-on');
      activeCat = chip.dataset.filter;
      apply();
      chip.scrollIntoView({behavior:'smooth', block:'nearest', inline:'center'});
    });
  });

  /* filtres secondaires : fiabilité et emplacement, cumulables avec la catégorie */
  function basculeur(sel, lire, poser){
    document.querySelectorAll(sel).forEach(function(b){
      b.addEventListener('click', function(){
        const deja = b.classList.contains('is-on');
        document.querySelectorAll(sel).forEach(x => x.classList.remove('is-on'));
        poser(deja ? null : lire(b));
        if(!deja) b.classList.add('is-on');
        apply();
      });
    });
  }
  basculeur('.chip-st',   b => b.dataset.stf,   v => { activeSt = v; });
  basculeur('.chip-slot', b => b.dataset.slotf, v => { activeSlot = v; });
  basculeur('.chip-ed',   b => b.dataset.edf,   v => { activeEd = v; });
  lireEtat();
  apply();

  /* ombre de la barre quand elle colle en haut */
  if(bar){
    const sentinel = document.createElement('div');
    bar.parentNode.insertBefore(sentinel, bar);
    new IntersectionObserver(function(e){
      bar.classList.toggle('stuck', !e[0].isIntersecting);
    }, {threshold:1}).observe(sentinel);
  }

  /* bandeau défilant de l'en-tête */
  const strip = document.getElementById('vstrip');
  if(strip && window.LK_INDEX){
    const marques = Array.from(new Set(
      window.LK_INDEX.filter(e => e.u.indexOf('/vehicules/') === 0)
                     .map(e => e.l.split(' ')[0])
    )).filter(m => m && m !== 'Marque').sort();
    const line = marques.map(m => '<b>' + m + '</b><i>&#9679;</i>').join('');
    fillTrack(strip, line);
  }

  /* statistiques qui montent */
  const statIO = new IntersectionObserver(function(entries){
    entries.forEach(function(en){
      if(!en.isIntersecting) return;
      const node = en.target, end = parseInt(node.dataset.count, 10);
      let n = 0;
      const step = Math.max(1, Math.round(end / 26));
      const t = setInterval(function(){
        n += step;
        if(n >= end){ n = end; clearInterval(t); }
        node.textContent = n;
      }, 32);
      statIO.unobserve(node);
    });
  }, {threshold:.4});
  document.querySelectorAll('.vstat .n[data-count]').forEach(n => statIO.observe(n));

  /* filtre via l'ancre : vehicules.html#suv */
  function fromHash(){
    const h = location.hash.replace('#','');
    if(h.includes('=') || !h){lireEtat(); apply(); return;}
    if(!h) return;
    const target = chips.find(c => c.dataset.filter === h);
    if(target){
      target.click();
      const anchor = document.querySelector('.vbar');
      if(anchor) window.scrollTo({top: anchor.offsetTop - 70, behavior:'smooth'});
    }
  }
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', fromHash);
  } else { fromHash(); }
  window.addEventListener('hashchange', fromHash);
})();

/* ============================================================
   FICHE VÉHICULE : COMPTE À REBOURS
   ============================================================ */
(function(){
  const box = document.getElementById('fcd');
  if(!box) return;
  const target = new Date("2026-11-19T00:00:00");
  const g = id => document.getElementById(id);
  function tick(){
    const diff = target - new Date();
    if(diff <= 0){
      box.innerHTML = '<span class="fcd-box"><b>Données en cours de mise à jour</b></span>';
      return;
    }
    g('fd').textContent = Math.floor(diff/86400000);
    g('fh').textContent = String(Math.floor(diff/3600000)%24).padStart(2,'0');
    g('fm').textContent = String(Math.floor(diff/60000)%60).padStart(2,'0');
    g('fs').textContent = String(Math.floor(diff/1000)%60).padStart(2,'0');
  }
  tick(); setInterval(tick, 1000);
})();

/* ============================================================
   CONSTRUCTEUR D'ÉQUIPEMENT — règles d'inventaire confirmées
   ============================================================ */
(function(){
  const box = document.getElementById('loadout');
  if(!box) return;

  const sel = { dos: document.getElementById('lo-dos'), main: document.getElementById('lo-main'), poing: document.getElementById('lo-poing') };
  const art = { dos: document.getElementById('lo-art-dos'), main: document.getElementById('lo-art-main'), poing: document.getElementById('lo-art-poing') };
  const verdict = document.getElementById('lo-verdict');
  const shareBt = document.getElementById('lo-share');

  /* silhouettes récupérées depuis les cartes de la page */
  const cards = {};
  document.querySelectorAll('.arm-card').forEach(function(c){
    const slug = (c.getAttribute('href') || c.querySelector('.veh-link').getAttribute('href')).split('/').pop().replace('.html','');
    const svg = c.querySelector('.veh-art');
    /* les armes illustrées par une photo officielle n'ont pas de silhouette : on reprend la photo */
    const img = svg ? null : c.querySelector('.veh-thumb img');
    let html = '';
    if(svg) html = svg.outerHTML;
    else if(img){ const i = img.cloneNode(false); i.className = 'lo-photo'; i.removeAttribute('sizes'); i.setAttribute('sizes', '160px'); html = i.outerHTML; }
    cards[slug] = { svg: html, nom: c.querySelector('h3').textContent, cl: c.dataset.cat };
  });

  function render(){
    let longues = 0, visible = false, ok = true, msg = [];
    ['dos','main','poing'].forEach(function(k){
      const v = sel[k].value;
      const c = cards[v];
      art[k].innerHTML = c ? (c.svg || '<span class="lo-nom">' + c.nom.replace(/[&<>"]/g, function(ch){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]; }) + '</span>') : '<span class="lo-empty">Vide</span>';
      art[k].parentNode.classList.toggle('is-set', !!c);
      if(k !== 'poing' && v) longues++;
      if(k === 'main' && v) visible = true;
    });

    /* même arme aux deux emplacements longs */
    if(sel.dos.value && sel.dos.value === sel.main.value){
      ok = false; msg.push("Tu as mis la même arme dans le dos et en main.");
    }
    if(longues === 2) msg.push("Deux armes longues : c'est le maximum. Une troisième devra rester dans un véhicule.");
    if(visible) msg.push("Arme en main visible : les passants s'écartent et la police peut réagir.");
    if(!sel.dos.value && !sel.main.value && !sel.poing.value) msg = ["Choisis tes armes. Le constructeur vérifie que ton équipement respecte les règles."];
    else if(ok && msg.length === 0) msg.push("Équipement valide et discret.");

    verdict.className = 'lo-verdict ' + (ok ? (visible ? 'is-warn' : 'is-ok') : 'is-ko');
    verdict.innerHTML = '<span class="lo-v-ico"></span><p>' + msg.join('<br>') + '</p>';
    syncHash();
  }

  function syncHash(){
    const parts=['dos','main','poing'].map(k=>sel[k].value||'-');
    const p=new URLSearchParams(location.hash.slice(1));
    if(parts.some(v=>v!=='-'))p.set('lo',parts.join(','));else p.delete('lo');
    history.replaceState(null,'',location.pathname+location.search+(p.size?'#'+p.toString():''));
  }
  function readHash(){
    const values=(new URLSearchParams(location.hash.slice(1)).get('lo')||'').split(',');
    ['dos','main','poing'].forEach((k,i)=>{const v=values[i]; if(Array.from(sel[k].options).some(o=>o.value===v))sel[k].value=v;});
  }

  Object.keys(sel).forEach(function(k){ sel[k].addEventListener('change', render); });

  if(shareBt){
    shareBt.addEventListener('click', function(){
      window.LK.copy(location.href,shareBt,'Lien copié');
    });
  }

  readHash();
  render();

})();

})();
