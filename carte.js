/* ============================================================
   LEONIDAKIT — moteur de carte
   Déplacement, zoom, marqueurs, filtres, suivi, distance.
   ============================================================ */
(function(){
  const stage = document.getElementById('map-stage');
  if(!stage) return;

  const world   = document.getElementById('map-world');
  const layer   = document.getElementById('map-markers');
  const panel   = document.getElementById('map-panel');
  const panelIn = document.getElementById('map-panel-in');
  const closeBt = document.getElementById('map-close');
  const searchI = document.getElementById('map-search');
  const sugBox  = document.getElementById('map-sug');
  const progBar = document.getElementById('map-prog-bar');
  const progTxt = document.getElementById('map-prog-txt');
  const resetBt = document.getElementById('map-reset');
  const zoomIn  = document.getElementById('map-zin');
  const zoomOut = document.getElementById('map-zout');
  const zoomLbl = document.getElementById('map-zlvl');
  const rulerBt = document.getElementById('map-ruler');
  const rulerBx = document.getElementById('map-ruler-box');
  const rulerRs = document.getElementById('map-ruler-reset');
  const svgLine = document.getElementById('map-line');

  /* ---- dimensions du monde, en unités de carte ---- */
  const W = 4000, H = 4600;

  /* échelle provisoire : 1 unité de carte = 2,4 mètres dans le jeu.
     À recaler avec les vraies distances après le 19 novembre. */
  const METRES_PAR_UNITE = 2.4;

  /* vitesses provisoires, en mètres par seconde */
  const VITESSES = [
    { id:'pied',    nom:'À pied',     v: 2.0,  ico:'walk' },
    { id:'course',  nom:'En courant', v: 6.0,  ico:'run'  },
    { id:'velo',    nom:'À vélo',     v: 9.0,  ico:'bike' },
    { id:'voiture', nom:'En voiture', v: 33.0, ico:'car'  },
    { id:'bateau',  nom:'En bateau',  v: 22.0, ico:'boat' },
    { id:'avion',   nom:'En avion',   v: 78.0, ico:'plane'}
  ];

  /* ---- catégories ---- */
  const CATS = {
    region:      { nom:'Régions',        col:'#E8452C' },
    ville:       { nom:'Villes',         col:'#F5A524' },
    collectible: { nom:'Collectibles',   col:'#C2452C' },
    planque:     { nom:'Planques',       col:'#D96A2C' },
    magasin:     { nom:'Magasins',       col:'#B5762A' },
    garage:      { nom:'Garages',        col:'#A85B33' },
    mission:     { nom:'Missions',       col:'#CE4B33' },
    essence:     { nom:'Stations-service',col:'#D93F2A' }
  };

  /* ---- points confirmés par Rockstar ----
     Positions approximatives, à recaler sur le fond définitif. */
  const POINTS = [
    { id:'vice-city',   n:'Vice City',        c:'ville',  x:1520, y:3180,
      d:"La grande ville de Leonida, inspirée de Miami. Cœur de l'histoire de Jason et Lucia." },
    { id:'leonida-keys',n:'Leonida Keys',     c:'region', x:1180, y:4180,
      d:"Chapelet d'îles tropicales au sud de l'État : bars, plages, bateaux et vie marine." },
    { id:'grassrivers', n:'Grassrivers',      c:'region', x:2180, y:3520,
      d:"Vaste zone humide subtropicale, équivalent des Everglades. Chasse, pêche et communautés rurales." },
    { id:'port-gellhorn',n:'Port Gellhorn',   c:'ville',  x:820,  y:1980,
      d:"Ville balnéaire fanée de l'ouest de Leonida : motels, attractions désertes et économie en berne." },
    { id:'ambrosia',    n:'Ambrosia',         c:'region', x:2560, y:2280,
      d:"Le cœur agricole et sucrier de l'État." },
    { id:'mount-kalaga',n:'Mount Kalaga',     c:'region', x:2900, y:1180,
      d:"Parc national des hautes terres, au nord de Leonida." },
    { id:'vice-beach',  n:'Vice Beach',       c:'ville',  x:1720, y:3080,
      d:"Le front de mer de Vice City, ses hôtels art déco et sa promenade." },
    { id:'waning-sands',n:'Waning Sands',     c:'ville',  x:1980, y:2620,
      d:"Banlieue tentaculaire du comté de Leonard : autoroutes, centres commerciaux et parkings." }
  ];

  /* ============================================================
     ÉTAT
     ============================================================ */
  let scale = 0.28, minS = 0.14, maxS = 2.4;
  let tx = 0, ty = 0;
  let found = {};
  let visible = {};
  let rulerOn = false;
  let rulerPts = [];

  Object.keys(CATS).forEach(k => visible[k] = true);

  try{
    found = JSON.parse(localStorage.getItem('lk_map_found') || '{}');
  }catch(e){ found = {}; }

  function save(){
    try{ localStorage.setItem('lk_map_found', JSON.stringify(found)); }catch(e){}
  }

  /* ============================================================
     RENDU
     ============================================================ */
  function applyTransform(){
    world.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + scale + ')';
    if(zoomLbl) zoomLbl.textContent = Math.round(scale * 100) + ' %';
    layer.style.setProperty('--inv', (1 / scale));
    drawLine();
  }

  function clamp(){
    const r = stage.getBoundingClientRect();
    const w = W * scale, h = H * scale;
    const mx = Math.max(0, (w - r.width) / 2) + r.width * 0.35;
    const my = Math.max(0, (h - r.height) / 2) + r.height * 0.35;
    const cx = (r.width - w) / 2, cy = (r.height - h) / 2;
    tx = Math.min(cx + mx, Math.max(cx - mx, tx));
    ty = Math.min(cy + my, Math.max(cy - my, ty));
  }

  function center(){
    const r = stage.getBoundingClientRect();
    tx = (r.width - W * scale) / 2;
    ty = (r.height - H * scale) / 2;
    applyTransform();
  }

  function zoomAt(cx, cy, factor){
    const before = scale;
    scale = Math.min(maxS, Math.max(minS, scale * factor));
    if(scale === before) return;
    const k = scale / before;
    tx = cx - (cx - tx) * k;
    ty = cy - (cy - ty) * k;
    clamp(); applyTransform();
  }

  /* ============================================================
     MARQUEURS
     ============================================================ */
  function buildMarkers(){
    layer.innerHTML = '';
    POINTS.forEach(function(p){
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'mk mk--' + p.c + (found[p.id] ? ' is-found' : '');
      el.style.left = p.x + 'px';
      el.style.top  = p.y + 'px';
      el.dataset.id = p.id;
      el.dataset.cat = p.c;
      el.setAttribute('aria-label', p.n);
      el.innerHTML = '<span class="mk-dot"></span><span class="mk-lbl">' + p.n + '</span>';
      el.addEventListener('click', function(ev){
        ev.stopPropagation();
        if(rulerOn){ addRulerPoint(p); return; }
        openPanel(p);
      });
      layer.appendChild(el);
    });
    refreshVisibility();
    refreshProgress();
  }

  function refreshVisibility(){
    layer.querySelectorAll('.mk').forEach(function(el){
      el.hidden = !visible[el.dataset.cat];
    });
  }

  function refreshProgress(){
    const total = POINTS.length;
    const done = POINTS.filter(p => found[p.id]).length;
    const pct = total ? Math.round(done / total * 100) : 0;
    if(progBar) progBar.style.width = pct + '%';
    if(progTxt) progTxt.innerHTML = '<strong>' + done + '</strong> / ' + total + ' repérés';
  }

  /* ============================================================
     PANNEAU D'INFORMATION
     ============================================================ */
  function openPanel(p){
    const isFound = !!found[p.id];
    panelIn.innerHTML =
      '<p class="mp-cat" style="color:' + CATS[p.c].col + '">' + CATS[p.c].nom + '</p>' +
      '<h3>' + p.n + '</h3>' +
      '<p class="mp-d">' + p.d + '</p>' +
      '<div class="mp-coord">Position <span>' + p.x + ' · ' + p.y + '</span></div>' +
      '<button type="button" class="mp-btn' + (isFound ? ' on' : '') + '" id="mp-toggle">' +
        (isFound ? 'Repéré' : 'Marquer comme repéré') +
      '</button>';
    panel.classList.add('open');

    document.getElementById('mp-toggle').addEventListener('click', function(){
      found[p.id] = !found[p.id];
      if(!found[p.id]) delete found[p.id];
      save();
      const mk = layer.querySelector('[data-id="' + p.id + '"]');
      if(mk) mk.classList.toggle('is-found', !!found[p.id]);
      refreshProgress();
      openPanel(p);
    });
  }

  function closePanel(){ panel.classList.remove('open'); }
  if(closeBt) closeBt.addEventListener('click', closePanel);

  /* ============================================================
     DÉPLACEMENT ET ZOOM
     ============================================================ */
  let dragging = false, lastX = 0, lastY = 0, moved = 0;
  const pointers = new Map();
  let pinchDist = 0;

  stage.addEventListener('pointerdown', function(e){
    pointers.set(e.pointerId, {x:e.clientX, y:e.clientY});
    if(pointers.size === 1){
      dragging = true; moved = 0;
      lastX = e.clientX; lastY = e.clientY;
      stage.setPointerCapture(e.pointerId);
      stage.classList.add('grabbing');
    } else if(pointers.size === 2){
      dragging = false;
      const a = Array.from(pointers.values());
      pinchDist = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y);
    }
  });

  stage.addEventListener('pointermove', function(e){
    if(!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, {x:e.clientX, y:e.clientY});

    if(pointers.size === 2){
      const a = Array.from(pointers.values());
      const d = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y);
      if(pinchDist > 0){
        const r = stage.getBoundingClientRect();
        const mx = (a[0].x + a[1].x) / 2 - r.left;
        const my = (a[0].y + a[1].y) / 2 - r.top;
        zoomAt(mx, my, d / pinchDist);
      }
      pinchDist = d;
      return;
    }

    if(!dragging) return;
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    moved += Math.abs(dx) + Math.abs(dy);
    tx += dx; ty += dy;
    lastX = e.clientX; lastY = e.clientY;
    clamp(); applyTransform();
  });

  function endPointer(e){
    pointers.delete(e.pointerId);
    if(pointers.size < 2) pinchDist = 0;
    if(pointers.size === 0){
      dragging = false;
      stage.classList.remove('grabbing');
    }
  }
  stage.addEventListener('pointerup', endPointer);
  stage.addEventListener('pointercancel', endPointer);
  stage.addEventListener('pointerleave', endPointer);

  stage.addEventListener('wheel', function(e){
    e.preventDefault();
    const r = stage.getBoundingClientRect();
    zoomAt(e.clientX - r.left, e.clientY - r.top, e.deltaY < 0 ? 1.16 : 0.86);
  }, {passive:false});

  stage.addEventListener('dblclick', function(e){
    const r = stage.getBoundingClientRect();
    zoomAt(e.clientX - r.left, e.clientY - r.top, 1.6);
  });

  stage.addEventListener('click', function(){
    if(moved < 6 && !rulerOn) closePanel();
  });

  if(zoomIn)  zoomIn.addEventListener('click', function(){
    const r = stage.getBoundingClientRect(); zoomAt(r.width/2, r.height/2, 1.35);
  });
  if(zoomOut) zoomOut.addEventListener('click', function(){
    const r = stage.getBoundingClientRect(); zoomAt(r.width/2, r.height/2, 0.74);
  });
  if(resetBt) resetBt.addEventListener('click', function(){ scale = 0.28; center(); });

  /* ============================================================
     FILTRES
     ============================================================ */
  document.querySelectorAll('.map-filter').forEach(function(inp){
    inp.addEventListener('change', function(){
      visible[inp.dataset.cat] = inp.checked;
      refreshVisibility();
    });
  });

  /* ============================================================
     RECHERCHE
     ============================================================ */
  const norm = s => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");

  function goTo(p, z){
    scale = z || 0.7;
    const r = stage.getBoundingClientRect();
    tx = r.width / 2 - p.x * scale;
    ty = r.height / 2 - p.y * scale;
    clamp(); applyTransform();
    openPanel(p);
  }

  if(searchI){
    searchI.addEventListener('input', function(){
      const v = norm(searchI.value.trim());
      if(!v){ sugBox.classList.remove('open'); sugBox.innerHTML=''; return; }
      const hits = POINTS.filter(p => norm(p.n).includes(v)).slice(0,6);
      sugBox.innerHTML = hits.length
        ? hits.map(p => '<button type="button" data-go="'+p.id+'"><span>'+p.n+'</span>'+
            '<span class="kind" style="color:'+CATS[p.c].col+'">'+CATS[p.c].nom+'</span></button>').join('')
        : '<div class="none">Aucun lieu trouvé.</div>';
      sugBox.classList.add('open');
    });

    sugBox.addEventListener('click', function(e){
      const b = e.target.closest('[data-go]');
      if(!b) return;
      const p = POINTS.find(x => x.id === b.dataset.go);
      if(p){ goTo(p); sugBox.classList.remove('open'); searchI.value = p.n; }
    });

    document.addEventListener('click', function(e){
      if(!e.target.closest('.map-searchwrap')) sugBox.classList.remove('open');
    });
  }

  /* ============================================================
     CALCULATEUR DE DISTANCE
     ============================================================ */
  function fmtDuree(sec){
    if(sec < 60) return Math.round(sec) + ' s';
    const m = Math.floor(sec / 60), s = Math.round(sec % 60);
    if(m < 60) return m + ' min' + (s ? ' ' + s + ' s' : '');
    const h = Math.floor(m / 60), mm = m % 60;
    return h + ' h' + (mm ? ' ' + mm + ' min' : '');
  }

  function fmtDist(m){
    return m >= 1000
      ? (m/1000).toFixed(2).replace('.', ',') + ' km'
      : Math.round(m) + ' m';
  }

  const ICONS = {
    walk:'<path d="M13 4a2 2 0 1 1-4 0 2 2 0 0 1 4 0M9 21l1.5-6L8 13V9l4-2 3 2 2 3M10 21l-2 0"/>',
    run: '<path d="M15 4a2 2 0 1 1-4 0 2 2 0 0 1 4 0M8 21l3-5-2-3 1-4 4 2 2 4M6 12l3-1"/>',
    bike:'<circle cx="6" cy="17" r="3.5"/><circle cx="18" cy="17" r="3.5"/><path d="M6 17l4-8h4l4 8M10 9h5"/>',
    car: '<path d="M4 16v-3l2-5h12l2 5v3M4 16h16M4 16v2M20 16v2"/><circle cx="8" cy="16" r="1.6"/><circle cx="16" cy="16" r="1.6"/>',
    boat:'<path d="M4 18h16l-2 3H6zM12 4v11M12 6l7 8H12"/>',
    plane:'<path d="M12 3l2 8 8 3v2l-8-1-1 5 3 2v1l-4-1-4 1v-1l3-2-1-5-8 1v-2l8-3z"/>'
  };

  function renderRuler(){
    if(rulerPts.length < 2){
      rulerBx.innerHTML = '<p class="rl-hint">' +
        (rulerPts.length === 0
          ? "Clique sur un premier point de la carte."
          : "Clique sur un second point.") + '</p>';
      return;
    }
    const [a, b] = rulerPts;
    const du = Math.hypot(a.x - b.x, a.y - b.y);
    const m = du * METRES_PAR_UNITE;

    rulerBx.innerHTML =
      '<p class="rl-pair">' + a.n + ' <i>→</i> ' + b.n + '</p>' +
      '<p class="rl-dist">' + fmtDist(m) + '</p>' +
      '<ul class="rl-list">' +
      VITESSES.map(function(v){
        return '<li><span class="rl-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
               'stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + ICONS[v.ico] + '</svg></span>' +
               '<span class="rl-nom">' + v.nom + '</span>' +
               '<span class="rl-t">' + fmtDuree(m / v.v) + '</span></li>';
      }).join('') +
      '</ul>' +
      '<p class="rl-note">Distances et vitesses provisoires, calées sur GTA V. Recalibrées après le 19 novembre 2026.</p>';
  }

  function drawLine(){
    if(!svgLine) return;
    if(rulerPts.length < 2){ svgLine.setAttribute('d',''); return; }
    const [a,b] = rulerPts;
    svgLine.setAttribute('d', 'M' + a.x + ',' + a.y + ' L' + b.x + ',' + b.y);
  }

  function addRulerPoint(p){
    if(rulerPts.length >= 2) rulerPts = [];
    rulerPts.push(p);
    layer.querySelectorAll('.mk').forEach(function(el){
      el.classList.toggle('is-picked', rulerPts.some(r => r.id === el.dataset.id));
    });
    renderRuler(); drawLine();
  }

  if(rulerBt){
    rulerBt.addEventListener('click', function(){
      rulerOn = !rulerOn;
      rulerBt.classList.toggle('on', rulerOn);
      rulerBt.setAttribute('aria-pressed', rulerOn);
      document.getElementById('map-ruler-wrap').hidden = !rulerOn;
      stage.classList.toggle('picking', rulerOn);
      if(rulerOn){ closePanel(); renderRuler(); }
      else{
        rulerPts = []; drawLine();
        layer.querySelectorAll('.mk').forEach(el => el.classList.remove('is-picked'));
      }
    });
  }
  if(rulerRs){
    rulerRs.addEventListener('click', function(){
      rulerPts = []; drawLine(); renderRuler();
      layer.querySelectorAll('.mk').forEach(el => el.classList.remove('is-picked'));
    });
  }

  /* ============================================================
     DÉMARRAGE
     ============================================================ */
  buildMarkers();
  center();
  window.addEventListener('resize', function(){ clamp(); applyTransform(); });

  /* raccourcis clavier */
  document.addEventListener('keydown', function(e){
    if(document.activeElement === searchI) return;
    if(e.key === '+' || e.key === '=') { const r=stage.getBoundingClientRect(); zoomAt(r.width/2,r.height/2,1.3); }
    if(e.key === '-')                  { const r=stage.getBoundingClientRect(); zoomAt(r.width/2,r.height/2,0.77); }
    if(e.key === 'Escape')             { closePanel(); }
  });
})();
