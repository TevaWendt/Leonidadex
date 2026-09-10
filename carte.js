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
  const fullBt  = document.getElementById('map-full');
  const scaleBar= document.getElementById('map-scale-bar');
  const scaleTxt= document.getElementById('map-scale-txt');
  const coordBx = document.getElementById('map-coord');
  const progRs  = document.getElementById('map-prog-reset');
  const shell   = document.querySelector('.map-shell');

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
    { id:'moto',    nom:'En moto',    v: 41.0, ico:'moto' },
    { id:'voiture', nom:'En voiture', v: 33.0, ico:'car'  },
    { id:'bateau',  nom:'En bateau',  v: 22.0, ico:'boat' },
    { id:'avion',   nom:'En avion',   v: 78.0, ico:'plane'}
  ];

  /* ---- statut de fiabilité ---- */
  const STATUTS = {
    officiel: { nom:'Nommé par Rockstar', court:'Officiel',
                d:"Lieu explicitement nommé par Rockstar, sur son site ou dans son matériel officiel." },
    vu:       { nom:'Aperçu dans un support officiel', court:'Aperçu',
                d:"Visible ou nommé dans un trailer, une capture ou une image officielle, sans description publiée par Rockstar." },
    spec:     { nom:'Reconstruction communautaire', court:'Supposé',
                d:"Position ou existence déduite par la communauté. À prendre avec prudence." }
  };

  const SOURCES = {
    SITE:  'Site officiel de Rockstar',
    T1:    'Premier trailer',
    T2:    'Second trailer',
    EL:    'An Extended Look, 27 août 2026',
    SHOT:  'Captures officielles',
    COMM:  'Analyse communautaire'
  };

  /* ---- catégories ---- */
  const CATS = {
    region:      { nom:'Régions',         col:'#E8452C' },
    ville:       { nom:'Villes',          col:'#F5A524' },
    quartier:    { nom:'Quartiers',       col:'#D96A2C' },
    comte:       { nom:'Comtés',          col:'#8A6A45' },
    lieu:        { nom:'Lieux notables',  col:'#B5762A' },
    collectible: { nom:'Collectibles',    col:'#C2452C' },
    planque:     { nom:'Planques',        col:'#A85B33' },
    mission:     { nom:'Missions',        col:'#CE4B33' }
  };

  /* ---- points confirmés par Rockstar ----
     Positions approximatives, à recaler sur le fond définitif. */
  const POINTS = [
    /* ---------- régions officielles ---------- */
    { id:'vice-city', n:'Vice City', c:'ville', x:2620, y:3160, s:'officiel', src:'SITE',
      d:"La métropole de Leonida et le cœur du jeu. Rockstar la présente comme la capitale ensoleillée et festive du pays. C'est la ville la plus dense jamais construite par le studio." },
    { id:'leonida-keys', n:'Leonida Keys', c:'region', x:1560, y:4230, s:'officiel', src:'SITE',
      d:"Archipel tropical au sud de l'État, relié par de longues routes construites au-dessus de l'eau. Plongée, pêche, navigation et contrebande." },
    { id:'grassrivers', n:'Grassrivers', c:'region', x:2020, y:3430, s:'officiel', src:'SITE',
      d:"La grande zone humide de Leonida. Végétation dense, visibilité réduite, hydroglisseurs et alligators. Un terrain idéal pour ce qui doit rester discret." },
    { id:'port-gellhorn', n:'Port Gellhorn', c:'ville', x:400, y:1290, s:'officiel', src:'SITE',
      d:"Ville côtière qui a connu des jours meilleurs. Motels bon marché, attractions fermées, commerces de bord de route et économie souterraine." },
    { id:'ambrosia', n:'Ambrosia', c:'region', x:2670, y:1960, s:'officiel', src:'SITE',
      d:"Comté rural et industriel. Rockstar y situe la raffinerie de sucre Allied Crystal, qui fournit les emplois, tandis que le gang de motards local fournit à peu près tout le reste." },
    { id:'mount-kalaga', n:'Mount Kalaga National Park', c:'region', x:2700, y:940, s:'officiel', src:'SITE',
      d:"Parc national à la frontière nord de l'État, construit autour de la chasse, de la pêche et des pistes tout-terrain. Rockstar décrit dans son arrière-pays une population qui vit volontairement loin du regard des autorités." },

    /* ---------- lieux nommés par Rockstar ---------- */
    { id:'vice-beach', n:'Vice Beach', c:'quartier', x:2860, y:3060, s:'officiel', src:'T1',
      d:"Le front de mer de Vice City, seule sous-région de la ville confirmée à ce jour." },
    { id:'ocean-beach', n:'Ocean Beach', c:'quartier', x:2800, y:3260, s:'officiel', src:'SITE',
      d:"Quartier de Vice City nommé par Rockstar, reconnaissable à ses hôtels art déco aux teintes pastel." },
    { id:'little-cuba', n:'Little Cuba', c:'quartier', x:2520, y:3300, s:'officiel', src:'SITE',
      d:"Quartier de Vice City nommé par Rockstar, connu pour ses boulangeries. L'un des deux seuls quartiers officiellement nommés." },
    { id:'key-lento', n:'Key Lento', c:'quartier', x:1700, y:4130, s:'officiel', src:'T2',
      d:"Île nommée dans l'archipel des Leonida Keys." },
    { id:'allied-crystal', n:'Raffinerie Allied Crystal', c:'lieu', x:2760, y:2020, s:'officiel', src:'SITE',
      d:"Raffinerie de sucre d'Ambrosia, citée par Rockstar comme le principal employeur de la région." },

    /* ---------- lieux aperçus dans les supports officiels ---------- */
    { id:'waning-sands', n:'Waning Sands', c:'ville', x:2000, y:2550, s:'vu', src:'T1',
      d:"Zone de banlieue étendue : voies rapides, centres commerciaux et vastes parkings. Nommée dans les supports officiels sans description publiée." },
    { id:'hamlet', n:'Hamlet', c:'ville', x:1880, y:3900, s:'vu', src:'T1',
      d:"Localité nommée dans le premier trailer, dans une scène de rue résidentielle." },
    { id:'vice-dale', n:'Comté de Vice-Dale', c:'comte', x:2480, y:2830, s:'vu', src:'T1',
      d:"Comté déduit du marquage Vice-Dale Police Department visible sur un véhicule de police." },
    { id:'leonard-county', n:'Comté de Leonard', c:'comte', x:1700, y:2250, s:'vu', src:'T1',
      d:"Comté identifié par le bureau du shérif du comté de Leonard. Contient notamment Waning Sands." },
    { id:'kelly-county', n:'Comté de Kelly', c:'comte', x:900, y:1800, s:'vu', src:'T1',
      d:"Comté nommé sur un panneau routier. L'une des zones les moins documentées de Leonida." },
    { id:'vcia', n:'Aéroport international de Vice City', c:'lieu', x:2400, y:3020, s:'vu', src:'T2',
      d:"Aéroport identifié par le train VCIA aperçu dans le second trailer. Position provisoire." },

    /* ---------- reconstructions communautaires ---------- */
    { id:'mariana-county', n:'Comté de Mariana', c:'comte', x:1900, y:3560, s:'spec', src:'COMM',
      d:"Comté avancé par la communauté pour la zone des Grassrivers et des Keys. Non confirmé par Rockstar." },
    { id:'gloriana', n:'Gloriana', c:'region', x:1500, y:1100, s:'spec', src:'COMM',
      d:"Nom aperçu sur des plaques d'immatriculation dans le second trailer. Rockstar n'a jamais annoncé qu'il s'agissait d'une région explorable. Position purement hypothétique." },
    { id:'grand-lac', n:'Grand lac intérieur', c:'lieu', x:2390, y:2310, s:'spec', src:'COMM',
      d:"Étendue d'eau centrale déduite des images. Ni son nom ni ses contours ne sont confirmés." }
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
  let visStatut = { officiel:true, vu:true, spec:true };

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
    updateScaleBar();
    syncHash();
    if(typeof cluster === 'function') clusterSoon();
  }

  let clTimer = null;
  function clusterSoon(){
    clearTimeout(clTimer);
    clTimer = setTimeout(cluster, 90);
  }

  /* ---- barre d'échelle ---- */
  function updateScaleBar(){
    if(!scaleBar) return;
    const cible = 130;                       /* largeur visée en pixels */
    const mParPx = METRES_PAR_UNITE / scale;
    const brut = cible * mParPx;
    const pas = [10,25,50,100,250,500,1000,2000,5000,10000];
    let choisi = pas[pas.length-1];
    for(let i=0;i<pas.length;i++){ if(pas[i] >= brut){ choisi = pas[i]; break; } }
    scaleBar.style.width = Math.round(choisi / mParPx) + 'px';
    scaleTxt.textContent = choisi >= 1000
      ? (choisi/1000).toString().replace('.', ',') + ' km'
      : choisi + ' m';
  }

  /* ---- position dans l'adresse, pour partager un lien ---- */
  let hashTimer = null;
  function syncHash(){
    clearTimeout(hashTimer);
    hashTimer = setTimeout(function(){
      const r = stage.getBoundingClientRect();
      const cx = Math.round((r.width/2 - tx) / scale);
      const cy = Math.round((r.height/2 - ty) / scale);
      const h = '#' + cx + ',' + cy + ',' + scale.toFixed(2);
      if(location.hash !== h) history.replaceState(null, '', h);
    }, 400);
  }

  function readHash(){
    const m = location.hash.match(/^#(-?\d+),(-?\d+),([\d.]+)$/);
    if(!m) return false;
    scale = Math.min(maxS, Math.max(minS, parseFloat(m[3])));
    const r = stage.getBoundingClientRect();
    tx = r.width/2 - parseInt(m[1],10) * scale;
    ty = r.height/2 - parseInt(m[2],10) * scale;
    clamp(); applyTransform();
    return true;
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
      el.className = 'mk mk--' + p.c + ' st-' + p.s + (found[p.id] ? ' is-found' : '');
      el.style.left = p.x + 'px';
      el.style.top  = p.y + 'px';
      el.dataset.id = p.id;
      el.dataset.cat = p.c;
      el.dataset.st = p.s;
      el.setAttribute('aria-label', p.n);
      el.innerHTML = '<span class="mk-dot"></span><span class="mk-lbl">' + p.n + '</span>';
      el.addEventListener('click', function(ev){
        ev.stopPropagation();
        if(rulerOn){
          addRulerPoint({ id:p.id, n:p.n, x:p.x, y:p.y, lieu:p.n });
          return;
        }
        openPanel(p);
      });
      layer.appendChild(el);
    });
    refreshVisibility();
    refreshProgress();
  }

  function refreshVisibility(){
    layer.querySelectorAll('.mk').forEach(function(el){
      el.hidden = !(visible[el.dataset.cat] && visStatut[el.dataset.st]);
    });
    cluster();
  }

  /* ============================================================
     REGROUPEMENT DES MARQUEURS
     Au-delà d'un certain nombre de points dans une même case,
     on affiche une pastille compteur au lieu des marqueurs.
     ============================================================ */
  const SEUIL_GROUPE = 2;          /* nb de points par case avant regroupement */

  function cluster(){
    layer.querySelectorAll('.cl').forEach(el => el.remove());

    const actifs = POINTS.filter(p => visible[p.c] && visStatut[p.s]);
    /* taille de case en unités de carte : ~64 px à l'écran */
    const taille = 64 / scale;

    /* au-delà d'un certain zoom, plus de regroupement */
    if(scale > 0.55 || actifs.length < 12){
      layer.querySelectorAll('.mk').forEach(function(el){
        if(visible[el.dataset.cat] && visStatut[el.dataset.st]) el.hidden = false;
      });
      return;
    }

    const cases = new Map();
    actifs.forEach(function(p){
      const k = Math.floor(p.x / taille) + ':' + Math.floor(p.y / taille);
      if(!cases.has(k)) cases.set(k, []);
      cases.get(k).push(p);
    });

    cases.forEach(function(grp){
      const el = layer.querySelector('[data-id="' + grp[0].id + '"]');
      if(grp.length < SEUIL_GROUPE){
        if(el) el.hidden = false;
        return;
      }
      /* masquer les marqueurs du groupe */
      grp.forEach(function(p){
        const m = layer.querySelector('[data-id="' + p.id + '"]');
        if(m) m.hidden = true;
      });
      /* pastille au barycentre */
      const cx = grp.reduce((s,p)=>s+p.x,0) / grp.length;
      const cy = grp.reduce((s,p)=>s+p.y,0) / grp.length;
      const done = grp.filter(p => found[p.id]).length;

      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'cl' + (done === grp.length ? ' is-done' : '');
      b.style.left = cx + 'px';
      b.style.top  = cy + 'px';
      b.setAttribute('aria-label', grp.length + ' lieux regroupés');
      b.innerHTML = '<span class="cl-n">' + grp.length + '</span>';
      b.addEventListener('click', function(ev){
        ev.stopPropagation();
        /* approcher pour éclater le groupe */
        const r = stage.getBoundingClientRect();
        scale = Math.min(maxS, 0.8);
        tx = r.width/2 - cx * scale;
        ty = r.height/2 - cy * scale;
        clamp(); applyTransform(); refreshVisibility();
      });
      layer.appendChild(b);
    });
  }

  function refreshProgress(){
    const total = POINTS.length;
    const done = POINTS.filter(p => found[p.id]).length;
    const pct = total ? Math.round(done / total * 100) : 0;
    if(progBar) progBar.style.width = pct + '%';
    if(progTxt) progTxt.innerHTML = '<strong>' + done + '</strong> / ' + total + ' repérés';
    if(progRs) progRs.hidden = done === 0;
  }

  /* ============================================================
     PANNEAU D'INFORMATION
     ============================================================ */
  function openPanel(p){
    const isFound = !!found[p.id];
    const st = STATUTS[p.s];
    panelIn.innerHTML =
      '<p class="mp-cat" style="color:' + CATS[p.c].col + '">' + CATS[p.c].nom + '</p>' +
      '<h3>' + p.n + '</h3>' +
      '<span class="mp-st mp-st--' + p.s + '" title="' + st.d + '">' + st.court + '</span>' +
      '<p class="mp-d">' + p.d + '</p>' +
      '<div class="mp-meta">' +
        '<div><span>Fiabilité</span><b>' + st.nom + '</b></div>' +
        '<div><span>Source</span><b>' + SOURCES[p.src] + '</b></div>' +
        '<div><span>Position</span><b>' + p.x + ' · ' + p.y + '</b></div>' +
      '</div>' +
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
  if(closeBt) closeBt.addEventListener('click', function(e){ e.stopPropagation(); closePanel(); });

  /* les interactions dans le panneau ne doivent pas atteindre la carte */
  ['click','pointerdown','pointerup','wheel','dblclick'].forEach(function(ev){
    panel.addEventListener(ev, function(e){ e.stopPropagation(); });
  });

  /* ============================================================
     DÉPLACEMENT ET ZOOM
     ============================================================ */
  let dragging = false, lastX = 0, lastY = 0, moved = 0, captured = false;
  const pointers = new Map();
  let pinchDist = 0;

  stage.addEventListener('pointerdown', function(e){
    pointers.set(e.pointerId, {x:e.clientX, y:e.clientY});
    if(pointers.size === 1){
      dragging = true; moved = 0; captured = false;
      lastX = e.clientX; lastY = e.clientY;
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
    if(moved > 8 && !captured){
      captured = true;
      stage.setPointerCapture(e.pointerId);
      stage.classList.add('grabbing');
    }
    if(!captured) return;
    tx += dx; ty += dy;
    lastX = e.clientX; lastY = e.clientY;
    clamp(); applyTransform();
  });

  function endPointer(e){
    pointers.delete(e.pointerId);
    if(pointers.size < 2) pinchDist = 0;
    if(pointers.size === 0){
      dragging = false; captured = false;
      stage.classList.remove('grabbing');
    }
  }
  stage.addEventListener('pointerup', endPointer);
  stage.addEventListener('pointercancel', endPointer);
  stage.addEventListener('pointerleave', endPointer);

  stage.addEventListener('pointermove', function(e){
    if(!coordBx) return;
    const r = stage.getBoundingClientRect();
    const x = Math.round((e.clientX - r.left - tx) / scale);
    const y = Math.round((e.clientY - r.top  - ty) / scale);
    coordBx.textContent = x + ' · ' + y;
  });

  stage.addEventListener('wheel', function(e){
    e.preventDefault();
    const r = stage.getBoundingClientRect();
    zoomAt(e.clientX - r.left, e.clientY - r.top, e.deltaY < 0 ? 1.16 : 0.86);
  }, {passive:false});

  stage.addEventListener('dblclick', function(e){
    const r = stage.getBoundingClientRect();
    zoomAt(e.clientX - r.left, e.clientY - r.top, 1.6);
  });

  /* conversion écran -> coordonnées de la carte */
  function toWorld(clientX, clientY){
    const r = stage.getBoundingClientRect();
    return {
      x: Math.round((clientX - r.left - tx) / scale),
      y: Math.round((clientY - r.top  - ty) / scale)
    };
  }

  stage.addEventListener('click', function(e){
    if(moved >= 6) return;                       /* c'était un glisser */
    if(e.target.closest('.map-panel, .map-zoom')) return;

    if(rulerOn){
      const mk = e.target.closest('.mk');
      if(mk){
        const p = POINTS.find(x => x.id === mk.dataset.id);
        if(p) addRulerPoint({ id:p.id, n:p.n, x:p.x, y:p.y, lieu:p.n });
      } else {
        const w = toWorld(e.clientX, e.clientY);
        addRulerPoint({ id:'free-' + w.x + '-' + w.y, n:'Point ' + (rulerPts.length >= 2 ? 'A' : (rulerPts.length ? 'B' : 'A')), x:w.x, y:w.y, free:true });
      }
      return;
    }

    if(!e.target.closest('.mk')) closePanel();
  });

  if(zoomIn)  zoomIn.addEventListener('click', function(){
    const r = stage.getBoundingClientRect(); zoomAt(r.width/2, r.height/2, 1.35);
  });
  if(zoomOut) zoomOut.addEventListener('click', function(){
    const r = stage.getBoundingClientRect(); zoomAt(r.width/2, r.height/2, 0.74);
  });
  if(resetBt) resetBt.addEventListener('click', function(){ scale = 0.28; center(); });

  if(fullBt && shell){
    fullBt.addEventListener('click', function(){
      const on = shell.classList.toggle('is-full');
      document.body.classList.toggle('map-full-on', on);
      fullBt.setAttribute('aria-label', on ? 'Quitter le plein écran' : 'Plein écran');
      setTimeout(function(){ clamp(); applyTransform(); }, 60);
    });
    document.addEventListener('keydown', function(e){
      if(e.key === 'Escape' && shell.classList.contains('is-full')) fullBt.click();
    });
  }

  /* ============================================================
     FILTRES
     ============================================================ */
  document.querySelectorAll('.map-filter').forEach(function(inp){
    inp.addEventListener('change', function(){
      visible[inp.dataset.cat] = inp.checked;
      refreshVisibility();
    });
  });

  document.querySelectorAll('.map-statut').forEach(function(inp){
    inp.addEventListener('change', function(){
      visStatut[inp.dataset.st] = inp.checked;
      refreshVisibility();
    });
  });

  /* raccourci : n'afficher que ce que Rockstar a officiellement nommé */
  const onlyBt = document.getElementById('map-only-officiel');
  if(onlyBt){
    onlyBt.addEventListener('click', function(){
      const on = onlyBt.classList.toggle('on');
      visStatut = { officiel:true, vu:!on, spec:!on };
      document.querySelectorAll('.map-statut').forEach(function(i){
        i.checked = visStatut[i.dataset.st];
      });
      onlyBt.textContent = on ? 'Afficher tout' : 'Uniquement l\'officiel';
      refreshVisibility();
    });
  }

  /* ============================================================
     CALQUES DU FOND
     ============================================================ */
  const LAYER_KEY = 'lk_map_layers';
  let layers = {};
  try{ layers = JSON.parse(localStorage.getItem(LAYER_KEY) || '{}'); }catch(e){ layers = {}; }

  function applyLayer(name, on){
    document.querySelectorAll('.map-bg .' + name).forEach(function(g){
      g.style.display = on ? '' : 'none';
    });
  }

  document.querySelectorAll('.map-layer').forEach(function(inp){
    const name = inp.dataset.layer;
    if(Object.prototype.hasOwnProperty.call(layers, name)) inp.checked = layers[name];
    applyLayer(name, inp.checked);
    inp.addEventListener('change', function(){
      layers[name] = inp.checked;
      try{ localStorage.setItem(LAYER_KEY, JSON.stringify(layers)); }catch(e){}
      applyLayer(name, inp.checked);
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
    moto:'<circle cx="5.5" cy="17" r="3.5"/><circle cx="18.5" cy="17" r="3.5"/><path d="M5.5 17l4-6h5l4 6M9 11l-2-3H5M14 8h3"/>',
    boat:'<path d="M4 18h16l-2 3H6zM12 4v11M12 6l7 8H12"/>',
    plane:'<path d="M12 3l2 8 8 3v2l-8-1-1 5 3 2v1l-4-1-4 1v-1l3-2-1-5-8 1v-2l8-3z"/>'
  };

  function renderRuler(){
    if(rulerPts.length < 2){
      rulerBx.innerHTML = '<p class="rl-hint">' +
        (rulerPts.length === 0
          ? "Clique un premier point <b>n'importe où</b> sur la carte, ou directement sur un marqueur."
          : "Clique maintenant le second point.") + '</p>';
      return;
    }
    const [a, b] = rulerPts;
    const du = Math.hypot(a.x - b.x, a.y - b.y);
    const m = du * METRES_PAR_UNITE;

    const na = a.lieu || (a.x + ' · ' + a.y);
    const nb = b.lieu || (b.x + ' · ' + b.y);

    rulerBx.innerHTML =
      '<p class="rl-pair"><b>A</b> ' + na + ' <i>→</i> <b>B</b> ' + nb + '</p>' +
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
    p.n = 'Point ' + (rulerPts.length === 0 ? 'A' : 'B');
    rulerPts.push(p);

    layer.querySelectorAll('.mk').forEach(function(el){
      el.classList.toggle('is-picked', rulerPts.some(r => r.id === el.dataset.id));
    });
    drawPins();
    renderRuler(); drawLine();
  }

  /* épingles posées librement sur la carte */
  function drawPins(){
    layer.querySelectorAll('.pin').forEach(el => el.remove());
    rulerPts.forEach(function(p, i){
      if(!p.free) return;
      const el = document.createElement('span');
      el.className = 'pin';
      el.style.left = p.x + 'px';
      el.style.top  = p.y + 'px';
      el.innerHTML = '<span class="pin-dot">' + (i === 0 ? 'A' : 'B') + '</span>';
      layer.appendChild(el);
    });
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
        rulerPts = []; drawLine(); drawPins();
        layer.querySelectorAll('.mk').forEach(el => el.classList.remove('is-picked'));
      }
    });
  }
  if(rulerRs){
    rulerRs.addEventListener('click', function(){
      rulerPts = []; drawLine(); drawPins(); renderRuler();
      layer.querySelectorAll('.mk').forEach(el => el.classList.remove('is-picked'));
    });
  }

  /* ============================================================
     DÉMARRAGE
     ============================================================ */
  if(progRs){
    progRs.addEventListener('click', function(){
      if(!confirm('Décocher tous les lieux repérés ?')) return;
      found = {}; save();
      layer.querySelectorAll('.mk').forEach(el => el.classList.remove('is-found'));
      refreshProgress(); closePanel();
    });
  }

  buildMarkers();
  if(!readHash()) center();
  window.addEventListener('resize', function(){ clamp(); applyTransform(); });

  /* raccourcis clavier */
  document.addEventListener('keydown', function(e){
    if(document.activeElement === searchI) return;
    if(e.key === '+' || e.key === '=') { const r=stage.getBoundingClientRect(); zoomAt(r.width/2,r.height/2,1.3); }
    if(e.key === '-')                  { const r=stage.getBoundingClientRect(); zoomAt(r.width/2,r.height/2,0.77); }
    if(e.key === 'Escape')             { closePanel(); }
  });

  /* ============================================================
     INTERFACE PUBLIQUE, pour les modules complémentaires
     ============================================================ */
  window.LK_MAP = {
    layer: layer,
    panel: panel,
    panelIn: panelIn,
    toWorld: toWorld,
    goTo: goTo,
    wasDrag: function(){ return moved >= 6; },
    getFound: function(){ return found; },
    setFound: function(f){
      found = f || {}; save();
      layer.querySelectorAll('.mk').forEach(function(el){
        el.classList.toggle('is-found', !!found[el.dataset.id]);
      });
      refreshProgress();
    },
    refresh: refreshVisibility
  };
})();

/* ============================================================
   LEONIDAKIT — outils avancés de la carte
   Marqueurs personnels, mode édition, export, trajet multi-points
   ============================================================ */
(function(){
  const stage = document.getElementById('map-stage');
  if(!stage || !window.LK_MAP) return;

  const M = window.LK_MAP;

  /* ---------- 1. MARQUEURS PERSONNELS ---------- */
  const PERSO_KEY = 'lk_map_perso';
  let perso = [];
  try{ perso = JSON.parse(localStorage.getItem(PERSO_KEY) || '[]'); }catch(e){ perso = []; }
  function savePerso(){ try{ localStorage.setItem(PERSO_KEY, JSON.stringify(perso)); }catch(e){} }

  /* ---------- 2. MODE ÉDITION ---------- */
  let editOn = false;
  const editBt   = document.getElementById('map-edit');
  const editPane = document.getElementById('map-edit-pane');
  const editList = document.getElementById('map-edit-list');
  const editCnt  = document.getElementById('map-edit-count');

  function renderPerso(){
    M.layer.querySelectorAll('.pm').forEach(el => el.remove());
    perso.forEach(function(p, i){
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'mk pm';
      el.style.left = p.x + 'px';
      el.style.top  = p.y + 'px';
      el.dataset.i = i;
      el.setAttribute('aria-label', p.n);
      el.innerHTML = '<span class="mk-dot pm-dot"></span><span class="mk-lbl">' + esc(p.n) + '</span>';
      el.addEventListener('click', function(ev){
        ev.stopPropagation();
        openPerso(i);
      });
      M.layer.appendChild(el);
    });
    if(editCnt) editCnt.textContent = perso.length;
    renderList();
  }

  function esc(s){
    return String(s).replace(/[<>&"]/g, function(c){
      return {'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c];
    });
  }

  function openPerso(i){
    const p = perso[i];
    M.panelIn.innerHTML =
      '<p class="mp-cat" style="color:#0B8B84">Marqueur personnel</p>' +
      '<h3>' + esc(p.n) + '</h3>' +
      (p.note ? '<p class="mp-d">' + esc(p.note) + '</p>' : '') +
      '<div class="mp-meta"><div><span>Position</span><b>' + p.x + ' · ' + p.y + '</b></div>' +
      (p.cat ? '<div><span>Catégorie</span><b>' + esc(p.cat) + '</b></div>' : '') + '</div>' +
      '<div class="pm-acts">' +
        '<button type="button" class="mp-btn" id="pm-edit">Modifier</button>' +
        '<button type="button" class="mp-btn pm-del" id="pm-del">Supprimer</button>' +
      '</div>';
    M.panel.classList.add('open');

    document.getElementById('pm-edit').addEventListener('click', function(){
      const n = prompt('Nom du marqueur', p.n);
      if(n === null) return;
      const note = prompt('Note (facultatif)', p.note || '');
      p.n = n.trim() || p.n;
      p.note = (note || '').trim();
      savePerso(); renderPerso(); openPerso(i);
    });
    document.getElementById('pm-del').addEventListener('click', function(){
      if(!confirm('Supprimer ce marqueur ?')) return;
      perso.splice(i, 1);
      savePerso(); renderPerso(); M.panel.classList.remove('open');
    });
  }

  function renderList(){
    if(!editList) return;
    if(!perso.length){
      editList.innerHTML = '<p class="ed-empty">Aucun marqueur pour l\'instant. Active le mode édition et clique sur la carte.</p>';
      return;
    }
    editList.innerHTML = perso.map(function(p, i){
      return '<li><button type="button" data-go="' + i + '">' +
             '<span class="ed-n">' + esc(p.n) + '</span>' +
             '<span class="ed-c">' + p.x + ' · ' + p.y + '</span></button></li>';
    }).join('');
  }

  if(editList){
    editList.addEventListener('click', function(e){
      const b = e.target.closest('[data-go]');
      if(!b) return;
      const p = perso[parseInt(b.dataset.go, 10)];
      if(p) M.goTo(p, 0.8);
    });
  }

  if(editBt){
    editBt.addEventListener('click', function(){
      editOn = !editOn;
      editBt.classList.toggle('on', editOn);
      editBt.setAttribute('aria-pressed', editOn);
      if(editPane) editPane.hidden = !editOn;
      stage.classList.toggle('editing', editOn);
      editBt.textContent = editOn ? 'Quitter le mode édition' : 'Ajouter mes marqueurs';
    });
  }

  /* pose d'un marqueur au clic, en mode édition */
  stage.addEventListener('click', function(e){
    if(!editOn) return;
    if(e.target.closest('.map-panel, .map-zoom, .pm')) return;
    if(M.wasDrag()) return;
    const w = M.toWorld(e.clientX, e.clientY);
    const n = prompt('Nom du marqueur', 'Nouveau point');
    if(n === null) return;
    const note = prompt('Note (facultatif)', '');
    perso.push({ n: n.trim() || 'Sans nom', note: (note||'').trim(), x: w.x, y: w.y });
    savePerso(); renderPerso();
  }, true);

  /* ---------- 3. EXPORT ET IMPORT ---------- */
  const expBt = document.getElementById('map-export');
  const impBt = document.getElementById('map-import');
  const impIn = document.getElementById('map-import-file');

  if(expBt){
    expBt.addEventListener('click', function(){
      const data = {
        version: 1,
        genere: new Date().toISOString(),
        marqueurs: perso,
        repere: M.getFound()
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'leonidakit-carte-' + new Date().toISOString().slice(0,10) + '.json';
      a.click();
      URL.revokeObjectURL(a.href);
    });
  }

  if(impBt && impIn){
    impBt.addEventListener('click', function(){ impIn.click(); });
    impIn.addEventListener('change', function(){
      const f = impIn.files[0];
      if(!f) return;
      const fr = new FileReader();
      fr.onload = function(){
        try{
          const d = JSON.parse(fr.result);
          if(Array.isArray(d.marqueurs)){
            if(perso.length && !confirm('Remplacer tes ' + perso.length + ' marqueurs actuels ?')) return;
            perso = d.marqueurs; savePerso(); renderPerso();
          }
          if(d.repere) M.setFound(d.repere);
          alert('Import réussi.');
        }catch(err){ alert("Fichier illisible."); }
        impIn.value = '';
      };
      fr.readAsText(f);
    });
  }

  /* ---------- 4. COPIE DES COORDONNÉES ---------- */
  const copyBt = document.getElementById('map-copy');
  if(copyBt){
    copyBt.addEventListener('click', function(){
      const t = document.getElementById('map-coord').textContent;
      if(navigator.clipboard) navigator.clipboard.writeText(t);
      copyBt.textContent = 'Copié';
      setTimeout(function(){ copyBt.textContent = 'Copier la position'; }, 1600);
    });
  }

  renderPerso();
})();
