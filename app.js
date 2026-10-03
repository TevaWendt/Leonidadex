/* v7.61 : pluriel selon la langue de la page : français n > 1 (« 0 coché », « 1,5 million ») ; anglais, espagnol n ≠ 1 (« 0 marcados ») */
var lkPluriel=function(n){return ((typeof document!=='undefined'&&document.documentElement&&document.documentElement.lang)||'fr').slice(0,2)==='fr'?n>1:n!==1;};
(function(){
'use strict';
const esc = window.LK.esc;
const el = id => document.getElementById(id);
const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Bandeaux défilants : une moitié de piste doit couvrir au moins la largeur de l'écran, sinon la boucle
     laisse un vide. On répète le contenu jusqu'à dépasser l'écran, puis on duplique pour l'animation -50 %.
     v7.54 : une seule mesure (l'ancienne boucle insérait puis mesurait jusqu'à 41 fois, une mise en page à chaque tour). */
  function fillTrack(track, unit){
    if(!track || !unit) return;
    track.innerHTML = '<span class="mq-half">' + unit + '</span>';
    const half = track.firstChild;
    const unitWidth = half.getBoundingClientRect().width;
    const copies = unitWidth > 0 ? Math.min(41, Math.max(1, Math.ceil((window.innerWidth + 80) / unitWidth))) : 1;
    if(copies > 1) half.innerHTML = unit.repeat(copies);
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
  const words2 = ["Carte filtrable","Suivi de progression","Fiches véhicules","Emplacements","Calculateur","Mis à jour en continu"];
  fillTrack(el('mq2'), words2.map(w => '<b>' + w + '</b><i>&#9679;</i>').join(''));

  /* chiffres clés qui montent à l'apparition (valeur finale directe avec « réduire les animations ») */
  const factIO = new IntersectionObserver(function(entries){
    entries.forEach(function(en){
      if(!en.isIntersecting) return;
      const node = en.target, end = parseInt(node.dataset.count, 10);
      factIO.unobserve(node);
      if(reduceMotion()){ node.textContent = end; return; }
      let n = 0;
      const step = Math.max(1, Math.round(end/18));
      const timer = setInterval(function(){
        n += step;
        if(n >= end){ n = end; clearInterval(timer); }
        node.textContent = n;
      }, 45);
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
  /* Recherche accessible, utilisable aussi dans les deux formulaires de la 404.
     v7.54 (lot 1) : l'index (search-index.js, 175 Ko) n'est plus chargé avec chaque page ; il arrive à la première
     approche de la recherche (survol, focus, touche « / », adresse ?q=…), puis les 2 500 lieux comme avant. */
  document.querySelectorAll('.searchwrap').forEach(function(wrap){
    const q = wrap.querySelector('input[type="search"]'), box = wrap.querySelector('.suggest');
    if(!q || !box) return;
    const lazy = !!document.querySelector('script[type="lk/lazy"][src*="search-index.js"]');
    if(!window.LK_INDEX && !lazy) return;
    const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
    /* chaque entrée est normalisée une fois, à l'arrivée de l'index (plus rien n'est recalculé à la frappe) */
    const indexEntry = e => { const text = norm(e.s+' '+e.l); return {...e, text, label:norm(e.l), words:text.split(' ')}; };
    let index = null, loading = null, lieux = false;
    let cur = -1, hits = [];
    const nearby=(a,b)=>{if(a.length<5||Math.abs(a.length-b.length)>1)return false;let i=0,j=0,errors=0;while(i<a.length&&j<b.length){if(a[i]===b[j]){i++;j++;continue;}if(++errors>1)return false;if(a.length>=b.length)i++;if(b.length>=a.length)j++;}return errors+(i<a.length||j<b.length?1:0)<=1;};
    function ensureIndex(){
      if(index) return true;
      if(window.LK_INDEX){ index = window.LK_INDEX.map(indexEntry); return true; }
      if(!loading){
        loading = window.LK.lazyScript('search-index.js').then(function(){ index = (window.LK_INDEX || []).map(indexEntry); if(q.value.trim()) render(); waiting.splice(0).forEach(function(fn){ fn(); }); }).catch(function(){ loading = null; });
      }
      return false;
    }
    const waiting = [];
    const withIndex = fn => { if(ensureIndex()) fn(); else waiting.push(fn); };
    /* les 2 500 lieux de la carte ne sont chargés qu'à la première recherche (fichier séparé) */
    function fondreLieux(){ if(!window.LK_INDEX_LIEUX || !index || lieux) return; index = index.concat(window.LK_INDEX_LIEUX.map(indexEntry)); lieux = true; if(q.value.trim()) render(); }
    function chargerLieux(){
      withIndex(function(){
        if(window.LK_INDEX_LIEUX){ fondreLieux(); return; }
        document.addEventListener('lk-lieux', fondreLieux);
        if(document.getElementById('lk-lieux-js')) return;
        const lazyTag = document.querySelector('script[type="lk/lazy"][src*="search-lieux.js"]');
        const ref = lazyTag || Array.from(document.scripts).find(s=>s.src&&new URL(s.src,location.href).pathname.endsWith('/search-index.js')); if(!ref) return;
        const s = document.createElement('script'); s.id = 'lk-lieux-js'; s.async = true;
        s.src = lazyTag ? lazyTag.getAttribute('src') : ref.getAttribute('src').replace('search-index.js', 'search-lieux.js');
        s.onload = function(){ document.dispatchEvent(new Event('lk-lieux')); };
        document.head.appendChild(s);
      });
    }
    q.addEventListener('focus', chargerLieux, {once:true}); q.addEventListener('input', chargerLieux, {once:true});
    /* pré-chargement discret dès que la souris ou le doigt approche la recherche */
    wrap.addEventListener('pointerenter', ensureIndex, {once:true}); wrap.addEventListener('touchstart', ensureIndex, {once:true, passive:true});
    q.setAttribute('role','combobox'); q.setAttribute('aria-autocomplete','list');
    q.setAttribute('aria-controls',box.id); q.setAttribute('aria-expanded','false');
    const close = () => { box.classList.remove('open'); q.setAttribute('aria-expanded','false'); q.removeAttribute('aria-activedescendant'); cur=-1; };
    function render(){
      const v=norm(q.value); cur=-1; q.removeAttribute('aria-activedescendant');
      if(!v){box.innerHTML=''; hits=[]; close(); return;}
      if(!index){ ensureIndex(); return; }
      const words = v.split(' ');
      hits=index.map(e=>({e,rank:e.label===v?0:e.label.startsWith(v)?1:e.text.includes(v)?2:words.every(t=>e.text.includes(t))?3:words.every(t=>e.text.includes(t)||e.words.some(w=>nearby(t,w)))?4:99})).filter(x=>x.rank<99).sort((a,b)=>a.rank-b.rank||(a.e.w||0)-(b.e.w||0)||a.e.l.length-b.e.l.length).slice(0,8).map(x=>x.e);
      box.innerHTML=hits.length?hits.map((e,i)=>'<a id="'+box.id+'-option-'+i+'" href="'+esc(e.u)+'" role="option" aria-selected="false"><span>'+esc(e.l)+'</span><span class="kind">'+esc(e.k)+'</span></a>').join(''):'<div class="none" role="status">Aucun résultat pour « '+esc(q.value.trim())+' ».</div>';
      box.classList.add('open'); q.setAttribute('aria-expanded','true');
    }
    q.addEventListener('input',render); q.addEventListener('focus',()=>{if(q.value.trim())render();});
    /* v7.37 : ouverture avec ?q=… (lien de recherche, SearchAction des données structurées) : la page d’accueil et la 404 pré-remplissent la recherche */
    try{const initial=new URLSearchParams(location.search).get('q');if(initial&&initial.trim()&&!q.value){q.value=initial.trim().slice(0,100);chargerLieux();render();q.focus();}}catch(_){}
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

  /* apparitions au défilement, sur toutes les pages : v7.54, service commun LKMotion (common.js), un seul observateur.
     LK_reveal.scan(racine) reste disponible pour les pages qui ajoutent des blocs .reveal / .rise après coup. */
  window.LK_reveal = { scan: function(root){
    if(window.LKMotion) window.LKMotion.scan(root || document);
    else (root || document).querySelectorAll('.reveal, .rise').forEach(function(n){ n.classList.add('in'); });
  } };

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

      /* v7.46 : consentement explicite (case non transmise à Brevo, elle ne sert qu'à bloquer l'envoi sans accord) */
      const consent = el('consent');
      if(consent && !consent.checked){
        e.preventDefault();
        say("Coche la case pour accepter l’envoi de ton adresse à Brevo.", 'ko');
        consent.focus();
        return;
      }

      /* Brevo affiche son résultat réel dans l'onglet courant. */
      say("Ouverture du formulaire de confirmation…", '');
    });
  }

/* ============================================================
   PAGE DE LISTE DES VÉHICULES (et de l'Armurerie : même grille)
   v7.54 (lot 1) : les cartes sont indexées une fois (catégorie, statut, texte de recherche, nom, marque) ; un filtre ou une
   recherche ne déplace plus aucune carte dans la page (seul un changement de tri réordonne, et chaque tri est calculé une
   seule fois) ; la limite d'affichage suit l'ordre trié réel ; aucune écriture DOM quand rien ne change.
   ============================================================ */
(function(){
  const grid = document.getElementById('vgrid');
  if(!grid) return;

  const cards   = Array.from(grid.querySelectorAll('.veh-card'));
  const initialHash = location.hash;

  const input   = document.getElementById('vq');
  const clearBt = document.getElementById('vclear');
  const chips   = Array.from(document.querySelectorAll('.chip-filter'));
  /* puce « Mon garage / Mon arsenal » : n'affiche que ce qu'on a coché, lisible aussi via #own=1 depuis la page Progression */
  (function(){ const bar = chips[0] && chips[0].parentNode; const type = document.body.dataset.own; if(!bar || !type) return;
    const b = document.createElement('button'); b.type = 'button'; b.id = 'chip-own'; b.className = 'chip-filter chip-own'; b.dataset.own = '1'; b.setAttribute('aria-pressed', 'false');
    b.innerHTML = (type === 'armes' ? 'Mon arsenal' : 'Mon garage') + ' <span class="chip-n" id="chip-own-n"></span>';
    b.addEventListener('click', function(){ activeOwn = !activeOwn; b.classList.toggle('is-on', activeOwn); b.setAttribute('aria-pressed', String(activeOwn)); apply(); });
    bar.appendChild(b);
    const maj = function(){ try{ const o = window.LK.read('lk_own_' + type, {}, window.LK.own); const n = Object.keys(o).filter(k => o[k]).length; const el = document.getElementById('chip-own-n'); if(el && el.textContent !== String(n)) el.textContent = n; }catch(e){} };
    maj();
    /* v7.54 : le compte suit l'événement « lk-owned » de fiches.js et le stockage (autre onglet), plus aucun écouteur
       de clic global sur le document */
    const changed = function(){ maj(); if(activeOwn) apply(); };
    window.addEventListener('storage', function(e){ if(e.key === 'lk_own_' + type || e.key === null) changed(); });
    document.addEventListener('lk-owned', function(e){ if(!e.detail || e.detail.type === type) changed(); });
  })();
  const countEl = document.getElementById('vcount');
  const emptyEl = document.getElementById('vempty');
  const bar     = document.getElementById('vbar');

  let activeCat = 'all', query = '', activeSt = null, activeSlot = null, activeEd = null, tri = ''; let activeOwn=false;
  /* la grille s'affiche par lots : moins de travail pour le téléphone, toutes les cartes restent dans la page */
  const LOT = 48; let limite = LOT, derniereSig = null;
  let plusBt = document.getElementById('vplus');
  if(!plusBt && emptyEl){ plusBt = document.createElement('button'); plusBt.type = 'button'; plusBt.id = 'vplus'; plusBt.className = 'vplus'; plusBt.hidden = true; emptyEl.parentNode.insertBefore(plusBt, emptyEl); }
  const norm = s => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[’‘]/g,"'").replace(/[  ]/g," ");
  const motCarte = grid.dataset.mot || 'véhicule';
  /* index des cartes, construit une fois : plus aucune lecture du DOM à la frappe */
  const ordreInitial = cards.map(card => ({
    card, id: card.dataset.id, cat: card.dataset.cat, st: card.dataset.st, slot: card.dataset.slot, ed: card.dataset.ed,
    search: norm(card.dataset.search || ''),
    name: (card.querySelector('h3') || {}).textContent || '',
    brand: (card.querySelector('.veh-marque') || {}).textContent || ''
  }));
  let ordered = ordreInitial, lastSort = '';
  const sortCache = new Map([['', ordreInitial]]);
  const collator = new Intl.Collator('fr');
  const POIDS_ST = { officiel: 0, vu: 1, comm: 2 };
  const triSel = document.getElementById('vtri');

  /* ordre d'affichage : la grille est réordonnée physiquement, sans reconstruire les cartes — seulement quand le tri change */
  function trier(){
    if(tri === lastSort) return;
    if(!sortCache.has(tri)){
      const liste = ordreInitial.slice();
      const nom = (a, b) => collator.compare(a.name, b.name);
      if(tri === 'az') liste.sort(nom);
      else if(tri === 'za') liste.sort((a, b) => nom(b, a));
      else if(tri === 'marque') liste.sort((a, b) => collator.compare(a.brand, b.brand) || nom(a, b));
      else if(tri === 'statut') liste.sort((a, b) => (POIDS_ST[a.st] ?? 9) - (POIDS_ST[b.st] ?? 9) || nom(a, b));
      sortCache.set(tri, liste);
    }
    ordered = sortCache.get(tri);
    const fragment = document.createDocumentFragment();
    ordered.forEach(item => fragment.appendChild(item.card));
    grid.insertBefore(fragment, grid.querySelector('.veh-spacer'));
    lastSort = tri;
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
    if(location.hash && !location.hash.includes('=')){ const legacy=chips.find(c=>c.dataset.filter===location.hash.slice(1)); if(legacy)activeCat=legacy.dataset.filter; }
    const p = new URLSearchParams(location.hash.includes('=') ? location.hash.slice(1) : '');
    const cat = p.get('cat'); if(cat && chips.some(c => c.dataset.filter === cat)) activeCat = cat;
    const st = p.get('st'); if(st && chips.some(c=>c.dataset.stf===st)) activeSt = st;
    const sl = p.get('slot'); if(sl && chips.some(c=>c.dataset.slotf===sl)) activeSlot = sl;
    const ed = p.get('ed'); if(ed && chips.some(c=>c.dataset.edf===ed)) activeEd = ed;
    const q = p.get('q'); if(q){ query = q; input.value = q; }
    const t = p.get('tri'); if(t && triSel && Array.from(triSel.options).some(o => o.value === t)){ tri = t; triSel.value = t; }
    activeOwn = p.get('own') === '1'; const ob = document.getElementById('chip-own'); if(ob){ ob.classList.toggle('is-on', activeOwn); ob.setAttribute('aria-pressed', String(activeOwn)); }
    chips.forEach(c => { if(c.dataset.filter) c.classList.toggle('is-on', c.dataset.filter === activeCat); });
    document.querySelectorAll('.chip-st').forEach(c => c.classList.toggle('is-on', c.dataset.stf === activeSt));
    document.querySelectorAll('.chip-slot').forEach(c => c.classList.toggle('is-on', c.dataset.slotf === activeSlot));
    document.querySelectorAll('.chip-ed').forEach(c => c.classList.toggle('is-on', c.dataset.edf === activeEd));
  }

  function apply(){
    const focusedCard = document.activeElement && document.activeElement.closest ? document.activeElement.closest('.veh-card') : null;
    const q = norm(query.trim());
    let shown = 0;
    trier();
    const ownSet = activeOwn ? (function(){ try{ const t = document.body.dataset.own; const o = t ? window.LK.read('lk_own_' + t, {}, window.LK.own) : {}; return new Set(Object.keys(o).filter(k => o[k])); }catch(e){ return new Set(); } })() : null;
    const sig = [activeCat, activeSt, activeSlot, activeEd, q, tri, activeOwn ? 'own' : ''].join('|');
    if(sig !== derniereSig){ derniereSig = sig; limite = LOT; }
    let rang = 0;
    /* la limite s'applique à l'ordre réellement demandé (tri), pas à l'ordre d'origine */
    ordered.forEach(function(item){
      const card = item.card;
      const show = (activeCat === 'all' || item.cat === activeCat)
        && (!activeSt || item.st === activeSt) && (!activeSlot || item.slot === activeSlot)
        && (!activeEd || item.ed === activeEd) && (!q || item.search.includes(q))
        && (!ownSet || ownSet.has(item.id));
      if(show) shown++;
      const hidden = !show || rang >= limite;
      if(card.hidden !== hidden) card.hidden = hidden;
      if(show){ rang++; if(!hidden && !card.classList.contains('in')) card.classList.add('in'); }
    });
    if(plusBt){ const reste = shown - Math.min(shown, limite); plusBt.hidden = reste <= 0; plusBt.textContent = 'Afficher ' + Math.min(reste, LOT) + ' de plus (' + reste + (lkPluriel(reste)?' restants' : ' restant') + ')'; }
    const countHTML = '<strong>' + shown + '</strong> ' + motCarte + (lkPluriel(shown)?'s' : '');
    if(countEl.innerHTML !== countHTML) countEl.innerHTML = countHTML;
    emptyEl.hidden = shown > 0;
    if(clearBt) clearBt.hidden = !query.trim();
    chips.forEach(c=>c.setAttribute('aria-pressed',String(c.classList.contains('is-on'))));
    ecrireEtat();
    /* une possession décochée peut quitter le filtre actif : le clavier retrouve une commande visible */
    if(focusedCard && focusedCard.hidden){
      const target = activeOwn ? document.getElementById('chip-own') : input;
      if(target) target.focus({preventScroll:true});
    }
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

  const scrollToBar = function(){ const anchor = document.querySelector('.vbar'); if(anchor) window.scrollTo({top: anchor.offsetTop - 70, behavior: reduceMotion() ? 'auto' : 'smooth'}); };

  chips.filter(c => c.dataset.filter).forEach(function(chip){
    chip.addEventListener('click', function(){
      chips.forEach(c => { if(c.dataset.filter) c.classList.remove('is-on'); });
      chip.classList.add('is-on');
      activeCat = chip.dataset.filter;
      apply();
      chip.scrollIntoView({behavior: reduceMotion() ? 'auto' : 'smooth', block:'nearest', inline:'center'});
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
  /* v7.53 : les marques viennent des données véhicules. v7.54 : elles sont écrites dans la page à la génération
     (attribut data-marques, gen.js) : la page n'a plus à charger vehicules-data.js (215 Ko) pour ce bandeau.
     Sans données, le bandeau est masqué plutôt que laissé vide. */
  const strip = document.getElementById('vstrip');
  if(strip){
    const source = strip.dataset.marques ? strip.dataset.marques.split('|')
      : Array.isArray(window.LK_VEHICULES) ? window.LK_VEHICULES.map(v => v.marque)
      : (window.LK_INDEX || []).filter(e => e.u.indexOf('/vehicules/') === 0).map(e => e.l.split(' ')[0]);
    const marques = Array.from(new Set(source)).filter(m => m && m !== 'Marque' && m !== 'Marque inconnue')
      .sort((a, b) => a.localeCompare(b, 'fr'));
    if(marques.length) fillTrack(strip, marques.map(m => '<b>' + esc(m) + '</b><i>&#9679;</i>').join(''));
    else if(strip.parentNode) strip.parentNode.hidden = true;
  }

  /* statistiques qui montent (valeur finale directe avec « réduire les animations ») */
  const statIO = new IntersectionObserver(function(entries){
    entries.forEach(function(en){
      if(!en.isIntersecting) return;
      const node = en.target, end = parseInt(node.dataset.count, 10);
      statIO.unobserve(node);
      if(reduceMotion()){ node.textContent = end; return; }
      let n = 0;
      const step = Math.max(1, Math.round(end / 26));
      const t = setInterval(function(){
        n += step;
        if(n >= end){ n = end; clearInterval(t); }
        node.textContent = n;
      }, 32);
    });
  }, {threshold:.4});
  document.querySelectorAll('.vstat .n[data-count], .fig-n[data-count]').forEach(n => statIO.observe(n));

  /* filtre via l'ancre : vehicules.html#suv (ancien lien) ou #cat=suv&q=… (état partagé).
     v7.54 : l'état de l'adresse est lu une seule fois au chargement (plus de second filtrage) ; un ancien lien #suv
     amène sur le catalogue déjà filtré. */
  function fromHash(ev){
    const h = location.hash.replace('#','');
    if(h.includes('=') || !h){
      lireEtat(); apply();
      /* v7.40 : depuis le mur de marques (#q=Albany), on remonte sur la barre de recherche pour voir le résultat */
      if(ev && ev.type === 'hashchange' && /(^|&)q=/.test(h)) scrollToBar();
      return;
    }
    const target = chips.find(c => c.dataset.filter === h);
    if(target){ target.click(); scrollToBar(); }
  }
  if(initialHash && !initialHash.includes('=') && chips.some(c => c.dataset.filter === initialHash.slice(1))){
    if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scrollToBar, {once:true});
    else scrollToBar();
  }
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
    if(longues === 2) msg.push("Deux armes longues : c’est le maximum. Une troisième devra rester dans un véhicule.");
    if(visible) msg.push("Arme en main visible : les passants s’écartent et la police peut réagir.");
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
