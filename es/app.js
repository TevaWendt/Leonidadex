/* Généré depuis outils/sources/app.js : modifie la source, pas ce fichier. */
var lkPluriel=function(n){return ((typeof document!=='undefined'&&document.documentElement&&document.documentElement.lang)||'fr').slice(0,2)==='fr'?n>1:n!==1;};
window.LK_SORTIE = {"sortie":"2026-11-19T00:00:00","prechargement":"2026-11-12T00:00:00"};
(function(){
'use strict';
const esc = window.LK.esc;
const lkPl = n => /^fr/.test(document.documentElement.lang || 'fr') ? n > 1 : n !== 1;
const el = id => document.getElementById(id);
const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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
  const isHome = !!el('mq');
  if(isHome){
  const words = ["19 de noviembre de 2026","Vice City","Leonida Keys","Grassrivers","Port Gellhorn","Ambrosia","Mount Kalaga","PS5 y Xbox Series"];
  fillTrack(el('mq'), words.map(w => '<b>' + w + '</b><i>&#9670;</i>').join(''));
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
  const words2 = ["Mapa filtrable","Seguimiento del progreso","Fichas de vehículos","Ubicaciones","Calculadora","Actualización continua"];
  fillTrack(el('mq2'), words2.map(w => '<b>' + w + '</b><i>&#9679;</i>').join(''));
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
  const target = new Date(window.LK_SORTIE.sortie);
  const last = {rd:null, rh:null, rm:null, rs:null};
  function setRoll(id, val){
    if(last[id] === val) return;
    const box = el(id);
    if(!box) return;
    const s = document.createElement('span');
    s.textContent = val; s.className = 'up';
    box.innerHTML = ''; box.appendChild(s);
    last[id] = val;
  }
  const preload = new Date(window.LK_SORTIE.prechargement);
  let jalon = null, clockTimer = 0;
  function setJalon(now){
    const k = now >= target ? 'j-sorti' : now >= preload ? 'j-pre' : 'j-avant';
    if(k === jalon) return; jalon = k;
    document.querySelectorAll('#jalons [data-jalon]').forEach(function(s){ s.hidden = s.dataset.jalon !== k; });
    const done = k === 'j-sorti', c = el('clock'), tz = el('clock-tz'), out = el('clock-sorti');
    if(c) c.hidden = done;
    if(tz) tz.hidden = done;
    if(out) out.hidden = !done;
  }
  function tick(){
    const now = new Date(), diff = target - now;
    setJalon(now);
    if(diff <= 0){ if(clockTimer){ clearInterval(clockTimer); clockTimer = 0; } return; }
    setRoll('rd', String(Math.max(0, Math.floor(diff/86400000))));
    setRoll('rh', String(Math.max(0, Math.floor(diff/3600000)%24)).padStart(2,'0'));
    setRoll('rm', String(Math.max(0, Math.floor(diff/60000)%60)).padStart(2,'0'));
    setRoll('rs', String(Math.max(0, Math.floor(diff/1000)%60)).padStart(2,'0'));
  }
  (function(){
    const c = el('clock'), tpl = el('clock-cases');
    if(c && tpl && tpl.content && target - new Date() > 0 && !el('rd')){ c.replaceChildren(tpl.content.cloneNode(true)); c.classList.add('is-live'); }
  })();
  tick(); if(target - new Date() > 0) clockTimer = setInterval(tick, 1000);
  document.querySelectorAll('#h1 .w').forEach(function(w,i){
    w.style.animationDelay = (0.12 + i*0.075) + 's';
  });
  }
  const burger = el('burger'), nav = el('nav');
  let navTick = 0;
  function navRoom(){
    if(!nav || !nav.classList.contains('open')){ nav && nav.style.removeProperty('--lk-nav-max'); return; }
    const top = nav.getBoundingClientRect().top, room = Math.floor(window.innerHeight - top - 18);
    if(room > 120) nav.style.setProperty('--lk-nav-max', room + 'px'); else nav.style.removeProperty('--lk-nav-max');
  }
  function navRoomSoon(){ if(navTick) return; navTick = requestAnimationFrame(function(){ navTick = 0; navRoom(); }); }
  if(burger && nav){
    burger.addEventListener('click', function(){
      const open = nav.classList.toggle('open');
      burger.setAttribute('aria-expanded', open);
      burger.setAttribute('aria-label', open ? 'Cerrar el menú' : 'Abrir el menú');
      navRoom();
    });
    window.addEventListener('resize', navRoomSoon);
    window.addEventListener('scroll', navRoomSoon, { passive: true });
    nav.addEventListener('toggle', navRoomSoon, true);
  }
  const moreMenu=document.querySelector('.nav-more');
  document.addEventListener('click',e=>{if(moreMenu?.open&&!moreMenu.contains(e.target))moreMenu.open=false;});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&moreMenu?.open){moreMenu.open=false;moreMenu.querySelector('summary').focus();e.stopImmediatePropagation();}});
  document.querySelectorAll('.searchwrap').forEach(function(wrap){
    const q = wrap.querySelector('input[type="search"]'), box = wrap.querySelector('.suggest');
    if(!q || !box) return;
    const lazy = !!document.querySelector('script[type="lk/lazy"][src*="search-index.js"]');
    if(!window.LK_INDEX && !lazy) return;
    const norm = s => String(s || '').toLowerCase().replace(/ß/g,'ss').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
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
      box.innerHTML=hits.length?hits.map((e,i)=>'<a id="'+box.id+'-option-'+i+'" href="'+esc(e.u)+'" role="option" aria-selected="false"><span>'+esc(e.l)+'</span><span class="kind">'+esc(e.k)+'</span></a>').join(''):'<div class="none" role="status">Sin resultados para “'+esc(q.value.trim())+'”.</div>';
      box.classList.add('open'); q.setAttribute('aria-expanded','true');
    }
    q.addEventListener('input',render); q.addEventListener('focus',()=>{if(q.value.trim())render();});
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
    if(e.key==='Escape' && nav?.classList.contains('open')){nav.classList.remove('open');nav.style.removeProperty('--lk-nav-max');burger.setAttribute('aria-expanded','false');burger.setAttribute('aria-label','Abrir el menú');burger.focus();}
  });
  window.LK_reveal = { scan: function(root){
    if(window.LKMotion) window.LKMotion.scan(root || document);
    else (root || document).querySelectorAll('.reveal, .rise').forEach(function(n){ n.classList.add('in'); });
  } };
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
        say("Esta dirección no parece válida.", 'ko');
        mailField.focus();
        return;
      }
      const consent = el('consent');
      if(consent && !consent.checked){
        e.preventDefault();
        say("Marca la casilla para aceptar que tu dirección se envíe a Brevo.", 'ko');
        consent.focus();
        return;
      }
      say("Abriendo el formulario de confirmación…", '');
    });
  }
(function(){
  const grid = document.getElementById('vgrid');
  if(!grid) return;
  const cards   = Array.from(grid.querySelectorAll('.veh-card'));
  const initialHash = location.hash;
  const input   = document.getElementById('vq');
  const clearBt = document.getElementById('vclear');
  const chips   = Array.from(document.querySelectorAll('.chip-filter'));
  (function(){ const bar = chips[0] && chips[0].parentNode; const type = document.body.dataset.own; if(!bar || !type) return;
    const b = document.createElement('button'); b.type = 'button'; b.id = 'chip-own'; b.className = 'chip-filter chip-own'; b.dataset.own = '1'; b.setAttribute('aria-pressed', 'false');
    b.innerHTML = (type === 'armes' ? 'Mi arsenal' : 'Mi garaje') + ' <span class="chip-n" id="chip-own-n"></span>';
    b.addEventListener('click', function(){ activeOwn = !activeOwn; b.classList.toggle('is-on', activeOwn); b.setAttribute('aria-pressed', String(activeOwn)); apply(); });
    bar.appendChild(b);
    const maj = function(){ try{ const o = window.LK.read('lk_own_' + type, {}, window.LK.own); const n = Object.keys(o).filter(k => o[k]).length; const el = document.getElementById('chip-own-n'); if(el && el.textContent !== String(n)) el.textContent = n; }catch(e){} };
    maj();
    const changed = function(){ maj(); if(activeOwn) apply(); };
    window.addEventListener('storage', function(e){ if(e.key === 'lk_own_' + type || e.key === null) changed(); });
    document.addEventListener('lk-owned', function(e){ if(!e.detail || e.detail.type === type) changed(); });
  })();
  const countEl = document.getElementById('vcount');
  const emptyEl = document.getElementById('vempty');
  const bar     = document.getElementById('vbar');
  let activeCat = 'all', query = '', activeSt = null, activeSlot = null, activeEd = null, tri = ''; let activeOwn=false;
  const LOT = 48; let limite = LOT, derniereSig = null;
  let plusBt = document.getElementById('vplus');
  if(!plusBt && emptyEl){ plusBt = document.createElement('button'); plusBt.type = 'button'; plusBt.id = 'vplus'; plusBt.className = 'vplus'; plusBt.hidden = true; emptyEl.parentNode.insertBefore(plusBt, emptyEl); }
  const norm = s => s.toLowerCase().replace(/ß/g,'ss').normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[’‘]/g,"'").replace(/[  ]/g," ");
  const motCarte = grid.dataset.mot || 'vehículo', motsCarte = grid.dataset.mots || 'vehículos';
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
    if(plusBt){ const reste = shown - Math.min(shown, limite); plusBt.hidden = reste <= 0; plusBt.textContent = (lkPl(reste) ? 'Mostrar {n} más ({r} restantes)' : 'Mostrar {n} más ({r} restante)').replace('{n}', Math.min(reste, LOT)).replace('{r}', reste); }
    const countHTML = '<strong>' + shown + '</strong> ' + (lkPluriel(shown) ? motsCarte : motCarte);
    if(countEl.innerHTML !== countHTML) countEl.innerHTML = countHTML;
    emptyEl.hidden = shown > 0;
    if(clearBt) clearBt.hidden = !query.trim();
    chips.forEach(c=>c.setAttribute('aria-pressed',String(c.classList.contains('is-on'))));
    ecrireEtat();
    if(focusedCard && focusedCard.hidden){
      const target = activeOwn ? document.getElementById('chip-own') : input;
      if(target) target.focus({preventScroll:true});
    }
  }
  if(plusBt) plusBt.addEventListener('click', function(){ limite += LOT; apply(); });
  if(triSel) triSel.addEventListener('change', function(){ tri = triSel.value; apply(); });
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
  if(bar){
    const sentinel = document.createElement('div');
    bar.parentNode.insertBefore(sentinel, bar);
    new IntersectionObserver(function(e){
      bar.classList.toggle('stuck', !e[0].isIntersecting);
    }, {threshold:1}).observe(sentinel);
  }
  const strip = document.getElementById('vstrip');
  if(strip){
    const source = strip.dataset.marques ? strip.dataset.marques.split('|')
      : Array.isArray(window.LK_VEHICULES) ? window.LK_VEHICULES.map(v => v.marque)
      : (window.LK_INDEX || []).filter(e => e.u.indexOf('/vehicules/') === 0).map(e => e.l.split(' ')[0]);
    const marques = Array.from(new Set(source)).filter(m => m && m !== 'Marque' && m !== 'Marca desconocida')
      .sort((a, b) => a.localeCompare(b, 'fr'));
    if(marques.length) fillTrack(strip, marques.map(m => '<b>' + esc(m) + '</b><i>&#9679;</i>').join(''));
    else if(strip.parentNode) strip.parentNode.hidden = true;
  }
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
  function fromHash(ev){
    const h = location.hash.replace('#','');
    if(h.includes('=') || !h){
      lireEtat(); apply();
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
(function(){
  const box = document.getElementById('fcd');
  if(!box) return;
  const target = new Date(window.LK_SORTIE.sortie);
  const g = id => document.getElementById(id);
  let tz = null;
  if(target - new Date() > 0){ tz = document.createElement('span'); tz.className = 'fcount-tz'; tz.textContent = 'medianoche, hora local'; box.insertAdjacentElement('afterend', tz); }
  let timer = 0;
  function tick(){
    const diff = target - new Date();
    if(diff <= 0){
      box.innerHTML = '<span class="fcd-box"><b>Datos en actualización</b></span>';
      if(tz){ tz.remove(); tz = null; }
      if(timer){ clearInterval(timer); timer = 0; }
      return;
    }
    g('fd').textContent = Math.floor(diff/86400000);
    g('fh').textContent = String(Math.floor(diff/3600000)%24).padStart(2,'0');
    g('fm').textContent = String(Math.floor(diff/60000)%60).padStart(2,'0');
    g('fs').textContent = String(Math.floor(diff/1000)%60).padStart(2,'0');
  }
  tick(); if(target - new Date() > 0) timer = setInterval(tick, 1000);
})();
(function(){
  const box = document.getElementById('loadout');
  if(!box) return;
  const sel = { dos: document.getElementById('lo-dos'), main: document.getElementById('lo-main'), poing: document.getElementById('lo-poing') };
  const art = { dos: document.getElementById('lo-art-dos'), main: document.getElementById('lo-art-main'), poing: document.getElementById('lo-art-poing') };
  const verdict = document.getElementById('lo-verdict');
  const shareBt = document.getElementById('lo-share');
  const cards = {};
  document.querySelectorAll('.arm-card').forEach(function(c){
    const slug = (c.getAttribute('href') || c.querySelector('.veh-link').getAttribute('href')).split('/').pop().replace('.html','');
    const svg = c.querySelector('.veh-art');
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
      art[k].innerHTML = c ? (c.svg || '<span class="lo-nom">' + c.nom.replace(/[&<>"]/g, function(ch){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]; }) + '</span>') : '<span class="lo-empty">Vacío</span>';
      art[k].parentNode.classList.toggle('is-set', !!c);
      if(k !== 'poing' && v) longues++;
      if(k === 'main' && v) visible = true;
    });
    if(sel.dos.value && sel.dos.value === sel.main.value){
      ok = false; msg.push("Has puesto la misma arma en la espalda y en la mano.");
    }
    if(longues === 2) msg.push("Dos armas largas: es el máximo. Una tercera tendrá que quedarse en un vehículo.");
    if(visible) msg.push("Arma visible en la mano: los transeúntes se apartan y la policía puede reaccionar.");
    if(!sel.dos.value && !sel.main.value && !sel.poing.value) msg = ["Elige tus armas. El constructor comprueba que tu equipo cumple las reglas."];
    else if(ok && msg.length === 0) msg.push("Equipo válido y discreto.");
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
      window.LK.copy(location.href,shareBt,'Enlace copiado');
    });
  }
  readHash();
  render();
})();
})();
