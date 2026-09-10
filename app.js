const el = id => document.getElementById(id);

  /* --- Éléments propres à la page d'accueil : on sort si absents --- */
  const isHome = !!el('mq');

  if(isHome){
  /* bandeau défilant, dupliqué pour une boucle sans coupure */
  const words = ["19 novembre 2026","Vice City","Leonida Keys","Grassrivers","Port Gellhorn","Ambrosia","Mount Kalaga","PS5 et Xbox Series"];
  el('mq').innerHTML = [...words, ...words].map(w => '<b>' + w + '</b><i>&#9670;</i>').join('');

  /* illustrations originales des régions, aucun visuel du jeu */
  const scenes = [
    {cap:"Vice City",     a:"#2B1B4D", b:"#E8452C", c:"#F5A524", kind:"city"},
    {cap:"Leonida Keys",  a:"#0E3B4D", b:"#E8452C", c:"#F5A524", kind:"sea"},
    {cap:"Grassrivers",   a:"#1E3A21", b:"#3E7C4A", c:"#F0C46A", kind:"swamp"},
    {cap:"Port Gellhorn", a:"#332B22", b:"#8A6A45", c:"#F5A524", kind:"port"},
    {cap:"Ambrosia",      a:"#3A2A16", b:"#B5762A", c:"#F0C46A", kind:"rural"},
    {cap:"Mount Kalaga",  a:"#1B2B3A", b:"#3B5A73", c:"#E8E2D0", kind:"mount"}
  ];
  function art(s){
    if(s.kind==='city')  return '<rect x="20" y="70" width="26" height="100" fill="'+s.a+'"/><rect x="54" y="45" width="20" height="125" fill="'+s.a+'"/><rect x="82" y="85" width="30" height="85" fill="'+s.a+'"/><rect x="120" y="55" width="18" height="115" fill="'+s.a+'"/><rect x="146" y="95" width="34" height="75" fill="'+s.a+'"/><rect x="188" y="65" width="22" height="105" fill="'+s.a+'"/><rect x="218" y="100" width="30" height="70" fill="'+s.a+'"/>';
    if(s.kind==='sea')   return '<path d="M0,140 Q65,126 130,140 T260,140 L260,170 L0,170Z" fill="'+s.a+'" opacity=".75"/><path d="M0,152 Q65,141 130,152 T260,152 L260,170 L0,170Z" fill="'+s.a+'"/><rect x="90" y="96" width="6" height="44" fill="'+s.a+'"/><rect x="164" y="96" width="6" height="44" fill="'+s.a+'"/><rect x="70" y="92" width="120" height="7" fill="'+s.a+'"/>';
    if(s.kind==='swamp') return '<path d="M0,150 L260,150 L260,170 L0,170Z" fill="'+s.a+'"/><path d="M30,150 L36,110 L42,150Z" fill="'+s.a+'"/><path d="M70,150 L78,96 L86,150Z" fill="'+s.a+'"/><path d="M120,150 L128,118 L136,150Z" fill="'+s.a+'"/><path d="M180,150 L188,102 L196,150Z" fill="'+s.a+'"/><path d="M226,150 L232,124 L238,150Z" fill="'+s.a+'"/>';
    if(s.kind==='port')  return '<rect x="0" y="146" width="260" height="24" fill="'+s.a+'"/><rect x="30" y="96" width="14" height="50" fill="'+s.a+'"/><rect x="30" y="92" width="60" height="8" fill="'+s.a+'"/><rect x="120" y="118" width="44" height="28" fill="'+s.a+'"/><rect x="168" y="126" width="38" height="20" fill="'+s.a+'"/><rect x="120" y="106" width="30" height="12" fill="'+s.a+'"/>';
    if(s.kind==='rural') return '<rect x="0" y="150" width="260" height="20" fill="'+s.a+'"/><path d="M60,150 L60,110 L96,88 L132,110 L132,150Z" fill="'+s.a+'"/><rect x="176" y="104" width="18" height="46" fill="'+s.a+'"/><rect x="200" y="120" width="14" height="30" fill="'+s.a+'"/>';
    return '<path d="M0,170 L70,80 L120,132 L165,64 L260,170Z" fill="'+s.a+'"/><path d="M150,84 L165,64 L182,86 L166,94Z" fill="'+s.c+'" opacity=".85"/>';
  }
  el('strip').innerHTML = [...scenes, ...scenes].map(function(s,i){
    return '<div class="card"><svg viewBox="0 0 260 170" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">'
      + '<defs><linearGradient id="g'+i+'" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="'+s.b+'"/><stop offset="72%" stop-color="'+s.c+'"/></linearGradient></defs>'
      + '<rect width="260" height="170" fill="url(#g'+i+')"/>'
      + '<circle cx="200" cy="56" r="26" fill="'+s.c+'" opacity=".5"/>'
      + art(s) + '</svg><span class="cap">'+s.cap+'</span></div>';
  }).join('');

  /* second bandeau, sens inverse */
  const words2 = ["Carte filtrable","Suivi de progression","Fiches véhicules","Emplacements","Calculateurs","Mis à jour en continu"];
  el('mq2').innerHTML = [...words2, ...words2].map(w => '<b>' + w + '</b><i>&#9679;</i>').join('');

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
  burger.addEventListener('click', function(){
    const open = nav.classList.toggle('open');
    burger.setAttribute('aria-expanded', open);
    burger.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
  });

  /* ---- recherche du site, alimentée par search-index.js ---- */
  const q = el('q'), box = el('suggest');
  if(q && box && window.LK_INDEX){
    const INDEX = window.LK_INDEX;
    let cur = -1, hits = [];

    const norm = s => s.toLowerCase().normalize("NFD")
                       .replace(/[\u0300-\u036f]/g,"")
                       .replace(/[^a-z0-9]+/g," ").trim();

    function score(entry, v){
      const s = entry.s, label = norm(entry.l);
      if(label === v) return 0;
      if(label.startsWith(v)) return 1;
      if(s.startsWith(v)) return 2;
      const words = s.split(" ");
      for(let i = 0; i < words.length; i++){
        if(words[i].startsWith(v)) return 3;
      }
      if(s.includes(v)) return 4;
      return -1;
    }

    function render(raw){
      const v = norm(raw.trim());
      cur = -1;
      if(!v){ box.classList.remove('open'); box.innerHTML = ''; hits = []; return; }

      hits = INDEX
        .map(e => ({ e: e, r: score(e, v) }))
        .filter(x => x.r >= 0)
        .sort((a,b) => a.r - b.r || a.e.l.length - b.e.l.length)
        .slice(0, 8)
        .map(x => x.e);

      if(!hits.length){
        box.innerHTML = '<div class="none">Aucun résultat pour « ' + raw.trim() + ' ».</div>';
      } else {
        box.innerHTML = hits.map(function(e){
          return '<a href="' + e.u + '" role="option">'
               + '<span>' + e.l + '</span>'
               + '<span class="kind">' + e.k + '</span></a>';
        }).join('');
      }
      box.classList.add('open');
    }

    function go(i){
      if(hits[i]) window.location.href = hits[i].u;
    }

    q.addEventListener('input', function(e){ render(e.target.value); });

    q.addEventListener('keydown', function(e){
      const items = box.querySelectorAll('a');
      if(e.key === 'ArrowDown' && items.length){ e.preventDefault(); cur = (cur + 1) % items.length; }
      else if(e.key === 'ArrowUp' && items.length){ e.preventDefault(); cur = (cur - 1 + items.length) % items.length; }
      else if(e.key === 'Enter'){
        e.preventDefault();
        go(cur >= 0 ? cur : 0);
        return;
      }
      else if(e.key === 'Escape'){ box.classList.remove('open'); q.blur(); return; }
      else return;
      items.forEach(function(n,i){ n.classList.toggle('on', i === cur); });
      if(items[cur]) items[cur].scrollIntoView({block:'nearest'});
    });

    q.addEventListener('focus', function(){ if(q.value.trim()) render(q.value); });

    document.addEventListener('click', function(e){
      if(!e.target.closest('.searchwrap')) box.classList.remove('open');
    });
    document.addEventListener('keydown', function(e){
      if(e.key === '/' && document.activeElement !== q){ e.preventDefault(); q.focus(); }
    });
  }

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

      /* le formulaire part vraiment vers Brevo, dans le cadre invisible */
      subBtn.disabled = true;
      subBtn.textContent = 'Envoi…';
      say("", '');

      setTimeout(function(){
        say("C'est noté. Un mail de confirmation vient de partir, clique sur le lien pour valider.", 'ok');
        subBtn.disabled = false;
        subBtn.textContent = 'Me prévenir';
        signupForm.reset();
      }, 1200);
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
  const countEl = document.getElementById('vcount');
  const emptyEl = document.getElementById('vempty');
  const bar     = document.getElementById('vbar');

  let activeCat = 'all', query = '';
  const norm = s => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");

  function apply(){
    const q = norm(query.trim());
    let shown = 0;
    cards.forEach(function(card){
      const okCat = (activeCat === 'all') || (card.dataset.cat === activeCat);
      const okTxt = !q || norm(card.dataset.search).includes(q);
      const show = okCat && okTxt;
      card.hidden = !show;
      if(show){ card.classList.add('in'); shown++; }
    });
    countEl.innerHTML = '<strong>' + shown + '</strong> ' + (shown > 1 ? 'véhicules' : 'véhicule');
    emptyEl.hidden = shown > 0;
    if(clearBt) clearBt.hidden = !query.trim();
  }

  input.addEventListener('input', function(e){ query = e.target.value; apply(); });

  if(clearBt){
    clearBt.addEventListener('click', function(){
      input.value = ''; query = ''; apply(); input.focus();
    });
  }

  chips.forEach(function(chip){
    chip.addEventListener('click', function(){
      chips.forEach(c => c.classList.remove('is-on'));
      chip.classList.add('is-on');
      activeCat = chip.dataset.filter;
      apply();
      chip.scrollIntoView({behavior:'smooth', block:'nearest', inline:'center'});
    });
  });

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
    strip.innerHTML = line + line;
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
      box.innerHTML = '<span class="fcd-box"><b>Disponible</b></span>';
      return;
    }
    g('fd').textContent = Math.floor(diff/86400000);
    g('fh').textContent = String(Math.floor(diff/3600000)%24).padStart(2,'0');
    g('fm').textContent = String(Math.floor(diff/60000)%60).padStart(2,'0');
    g('fs').textContent = String(Math.floor(diff/1000)%60).padStart(2,'0');
  }
  tick(); setInterval(tick, 1000);
})();
