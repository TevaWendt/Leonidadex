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

  /* vignettes des comtés, illustrations originales */
  const counties = [
    {n:"Vice-Dale",  d:"Vice City et sa côte",         b:"#E8452C", c:"#F5A524", k:"city"},
    {n:"Mariana",    d:"Grassrivers et les Keys",      b:"#D93F2A", c:"#F2B44A", k:"swamp"},
    {n:"Kelly",      d:"Port Gellhorn et son port",    b:"#C9502F", c:"#F5A524", k:"port"},
    {n:"Leonard",    d:"Waning Sands et ses banlieues",b:"#E8452C", c:"#F0C46A", k:"rural"},
    {n:"Ambrosia",   d:"Le cœur sucrier de l'État",    b:"#D96A2C", c:"#F5C978", k:"rural"},
    {n:"Lummox",     d:"Vers le parc du Mount Kalaga", b:"#C2452C", c:"#EFB964", k:"mount"}
  ];
  function shape(k, col){
    if(k==='city')  return '<rect x="24" y="44" width="16" height="52" fill="'+col+'"/><rect x="48" y="26" width="12" height="70" fill="'+col+'"/><rect x="68" y="54" width="20" height="42" fill="'+col+'"/><rect x="96" y="34" width="12" height="62" fill="'+col+'"/><rect x="116" y="60" width="22" height="36" fill="'+col+'"/>';
    if(k==='swamp') return '<path d="M0,84 L200,84 L200,96 L0,96Z" fill="'+col+'"/><path d="M28,84 L33,54 L38,84Z" fill="'+col+'"/><path d="M64,84 L70,44 L76,84Z" fill="'+col+'"/><path d="M108,84 L114,60 L120,84Z" fill="'+col+'"/><path d="M152,84 L158,50 L164,84Z" fill="'+col+'"/>';
    if(k==='port')  return '<rect x="0" y="80" width="200" height="16" fill="'+col+'"/><rect x="26" y="44" width="9" height="36" fill="'+col+'"/><rect x="26" y="40" width="42" height="6" fill="'+col+'"/><rect x="96" y="60" width="32" height="20" fill="'+col+'"/><rect x="134" y="66" width="26" height="14" fill="'+col+'"/>';
    if(k==='rural') return '<rect x="0" y="82" width="200" height="14" fill="'+col+'"/><path d="M50,82 L50,54 L76,38 L102,54 L102,82Z" fill="'+col+'"/><rect x="134" y="50" width="12" height="32" fill="'+col+'"/>';
    return '<path d="M0,96 L52,40 L86,74 L120,30 L200,96Z" fill="'+col+'"/>';
  }
  el('counties').innerHTML = counties.map(function(x,i){
    return '<div class="county reveal"><div class="thumb">'
      + '<svg viewBox="0 0 200 96" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">'
      + '<defs><linearGradient id="c'+i+'" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="'+x.b+'"/><stop offset="100%" stop-color="'+x.c+'"/></linearGradient></defs>'
      + '<rect width="200" height="96" fill="url(#c'+i+')"/>'
      + '<circle cx="164" cy="26" r="16" fill="'+x.c+'" opacity=".5"/>'
      + shape(x.k, '#1A1A1E') + '</svg></div>'
      + '<div class="body"><h3>Comté de '+x.n+'</h3><p>'+x.d+'</p></div></div>';
  }).join('');

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

  /* recherche, index provisoire à remplacer par la base de données */
  if(el('q')){
  const INDEX = [
    {label:"Carte de Leonida", kind:"Carte"},
    {label:"Vice City", kind:"Région"},
    {label:"Leonida Keys", kind:"Région"},
    {label:"Grassrivers", kind:"Région"},
    {label:"Port Gellhorn", kind:"Région"},
    {label:"Ambrosia", kind:"Région"},
    {label:"Mount Kalaga", kind:"Région"},
    {label:"Véhicules", kind:"Fiches"},
    {label:"Armes", kind:"Fiches"},
    {label:"Collectibles", kind:"Carte"},
    {label:"Suivi de progression", kind:"Outil"},
    {label:"Calculateurs", kind:"Outil"}
  ];
  const q = el('q'), box = el('suggest');
  let cur = -1;
  const norm = s => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
  q.addEventListener('input', function(e){
    const v = norm(e.target.value.trim()); cur = -1;
    if(!v){ box.classList.remove('open'); box.innerHTML=''; return; }
    const hits = INDEX.filter(i => norm(i.label).includes(v)).slice(0,6);
    box.innerHTML = hits.length
      ? hits.map(i => '<a href="#" role="option"><span>'+i.label+'</span><span class="kind">'+i.kind+'</span></a>').join('')
      : '<div class="none">Rien pour l\'instant. Les fiches arrivent avec le jeu.</div>';
    box.classList.add('open');
  });
  q.addEventListener('keydown', function(e){
    const items = box.querySelectorAll('a');
    if(e.key==='ArrowDown' && items.length){ e.preventDefault(); cur=(cur+1)%items.length; }
    else if(e.key==='ArrowUp' && items.length){ e.preventDefault(); cur=(cur-1+items.length)%items.length; }
    else if(e.key==='Enter' && cur>=0){ e.preventDefault(); items[cur].click(); return; }
    else if(e.key==='Escape'){ box.classList.remove('open'); q.blur(); return; }
    else return;
    items.forEach(function(n,i){ n.classList.toggle('on', i===cur); });
  });
  document.addEventListener('click', function(e){ if(!e.target.closest('.searchwrap')) box.classList.remove('open'); });
  document.addEventListener('keydown', function(e){ if(e.key==='/' && document.activeElement!==q){ e.preventDefault(); q.focus(); } });

  } /* fin recherche */

  /* apparitions au défilement */
  const io = new IntersectionObserver(function(entries){
    entries.forEach(function(en,i){
      if(en.isIntersecting){ setTimeout(function(){ en.target.classList.add('in'); }, i*70); io.unobserve(en.target); }
    });
  }, {threshold:.15});
  document.querySelectorAll('.reveal').forEach(function(n){ io.observe(n); });

  /* inscription à la lettre d'information via Brevo */
  const BREVO_FORM = "https://affd58b3.sibforms.com/serve/MUIFAGl8Xa98HjJAIW5cWUXzqoMy9tZMLQ1C1lyg7T2D0nPKLA1LarVopcF1d_g_ZvBDB8rxufQRDXnIWA3fGPuxEhSFzvfjMnVFsGoFyp3ly2S8W8GXh2Z6u03CV3GCl-8Xn8HhF1GxxpmCJBt7wY40N9A8G7DTFx4fQm_96FJpF6HuHEzwWQNHTLNJ99Y0iDaJFqgyNxoUvfW_LA==";

  const subBtn = el('sub'), mailField = el('mail');
  if(subBtn && mailField){
    function subscribe(){
      const v = mailField.value.trim();
      if(!v || !v.includes('@') || !v.includes('.')){
        subBtn.textContent = 'Adresse invalide';
        mailField.focus();
        setTimeout(function(){ subBtn.textContent = 'Me prévenir'; }, 2200);
        return;
      }
      const url = BREVO_FORM + (BREVO_FORM.includes('?') ? '&' : '?')
                + 'EMAIL=' + encodeURIComponent(v);
      window.open(url, '_blank', 'noopener');
      subBtn.textContent = 'Confirme dans l\'onglet';
      setTimeout(function(){ subBtn.textContent = 'Me prévenir'; }, 4000);
    }
    subBtn.addEventListener('click', subscribe);
    mailField.addEventListener('keydown', function(e){
      if(e.key === 'Enter'){ e.preventDefault(); subscribe(); }
    });
  }